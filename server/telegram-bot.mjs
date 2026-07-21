import { randomBytes, randomInt } from "node:crypto";
import {
  addTelegramTask,
  appendTelegramOperation,
  collectTasks,
  CONTENT_KEYS,
  normalizeCategory,
  readContent,
  STORE_DIR,
  updateTelegramTaskBySource,
  writeContent,
} from "./telegram-task-store.mjs";
import {
  archiveTelegramMessage,
  readTelegramArchive,
  TELEGRAM_MEMORY_ARCHIVE_DIR,
} from "./telegram-memory-archive.mjs";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1";
const MAX_AUDIO_BYTES = Number(process.env.TELEGRAM_TRANSCRIBE_MAX_BYTES || 25 * 1024 * 1024);
const HERMES_BRIDGE_URL = process.env.HERMES_BRIDGE_URL || "";
const HERMES_BRIDGE_TOKEN = process.env.HERMES_BRIDGE_TOKEN || "";
const HERMES_TIMEOUT_MS = Number(process.env.HERMES_BRIDGE_TIMEOUT_MS || 180_000);
const CONTENT_API_URL = process.env.ATLAS_CONTENT_API_URL || `http://127.0.0.1:${process.env.ATLAS_CONTENT_API_PORT || 8787}`;
const ALLOWED_CHAT_IDS = new Set(
  String(process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);
const HERMES_OWNER_TELEGRAM_IDS = new Set(
  String(process.env.HERMES_OWNER_TELEGRAM_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);
const HERMES_LONG_TERM_MEMORY_READY = /^(1|true|yes|on)$/i.test(
  process.env.HERMES_LONG_TERM_MEMORY_READY || "",
);
const POLL_TIMEOUT_SECONDS = 25;
const TASK_TRIGGER_EMOJI = "💋";
const TASK_DONE_EMOJI = "✅";
const RECENT_MESSAGES_LIMIT = 800;
const MARKETING_TELEGRAM_BINDING_KEY = "atlas.analytics.marketingTelegramBinding.v1";
const MARKETING_TELEGRAM_LINK_REQUEST_KEY = "atlas.analytics.marketingTelegramLinkRequest.v1";
const MARKETING_BROWSER_LINK_REQUEST_KEY = "atlas.analytics.marketingBrowserLinkRequest.v1";
const MARKETING_BROWSER_SESSIONS_KEY = "atlas.analytics.marketingBrowserSessions.v1";
const TELEGRAM_MEMORY_BINDINGS_KEY = "atlas.analytics.telegramMemoryBindings.v1";
const MARKETING_DASHBOARD_URL = process.env.ATLAS_MARKETING_DASHBOARD_URL
  || "https://supersussystem.com/?board=parser";
const CATEGORY_BUTTONS = [
  ["inbox", "launch"],
  ["marketing", "smm"],
  ["site", "content"],
  ["design", "legal"],
  ["tech", "knowledge"],
  ["ideas", "daily"],
  ["other"],
];

let offset = Number(process.env.TELEGRAM_UPDATE_OFFSET || 0);
const pendingCategory = new Map();
const recentMessages = new Map();

function log(message, payload = "") {
  const suffix = payload ? ` ${typeof payload === "string" ? payload : JSON.stringify(payload)}` : "";
  console.log(`[telegram-bot] ${message}${suffix}`);
}

if (!BOT_TOKEN) {
  log(`disabled: TELEGRAM_BOT_TOKEN is not set. STORE_DIR=${STORE_DIR}`);
  setInterval(() => {}, 60_000);
} else {
  log(`started. STORE_DIR=${STORE_DIR}; MEMORY_ARCHIVE_DIR=${TELEGRAM_MEMORY_ARCHIVE_DIR}`);
  pollLoop();
}

async function telegram(method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!json.ok) throw new Error(`${method}: ${json.description || "telegram_error"}`);
  return json.result;
}

function isAllowedChat(chatId) {
  if (!ALLOWED_CHAT_IDS.size) return true;
  return ALLOWED_CHAT_IDS.has(String(chatId));
}

function isHermesOwner(message) {
  return HERMES_OWNER_TELEGRAM_IDS.has(String(message?.from?.id || ""));
}

async function pollLoop() {
  while (true) {
    try {
      const updates = await telegram("getUpdates", {
        offset,
        timeout: POLL_TIMEOUT_SECONDS,
        allowed_updates: ["message", "edited_message", "message_reaction", "callback_query"],
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    } catch (error) {
      log("poll error:", error?.message || String(error));
      await sleep(3000);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleUpdate(update) {
  if (update.callback_query) {
    await handleCallback(update.callback_query);
    return;
  }

  if (update.message_reaction) {
    await handleMessageReaction(update.message_reaction);
    return;
  }

  const message = update.message || update.edited_message;
  if (!message?.chat?.id) return;
  const rawText = String(message.text || message.caption || "").trim();
  if (rawText.startsWith("/userid")) {
    await handleUserIdCommand(message);
    return;
  }
  if (rawText.startsWith("/memory_here")) {
    await handleMemoryHereCommand(message, rawText);
    return;
  }
  if (rawText.startsWith("/memory_off")) {
    await handleMemoryOffCommand(message);
    return;
  }
  if (rawText.startsWith("/memory_status")) {
    await handleMemoryStatusCommand(message);
    return;
  }
  if (rawText.startsWith("/marketing_here")) {
    await handleMarketingHereCommand(message);
    return;
  }
  if (rawText.startsWith("/marketing_off")) {
    await handleMarketingOffCommand(message);
    return;
  }
  const memoryBound = await isMemoryChatBound(message.chat.id);
  const operationalChat = isAllowedChat(message.chat.id);
  if (!operationalChat && !memoryBound) return;

  let text = "";
  try {
    text = (await getMessageText(message)).trim();
  } catch (error) {
    log("transcription error:", error?.message || String(error));
    if (memoryBound) {
      await archiveTelegramMessage({
        message,
        text: message.text || message.caption || "",
        source: buildSource(message, message.text || message.caption || ""),
        transcriptionError: error?.message || String(error),
      }).catch((archiveError) => log("telegram archive error:", archiveError?.message || String(archiveError)));
    }
    if (hasAudioMessage(message)) {
      await telegram("sendMessage", {
        chat_id: message.chat.id,
        reply_to_message_id: message.message_id,
        text: "Не смог распознать голосовое. Проверь OPENAI_API_KEY или отправь текстом.",
      });
    }
    return;
  }
  if (memoryBound) {
    await archiveTelegramMessage({
      message,
      text,
      source: buildSource(message, text),
    }).catch((error) => log("telegram archive error:", error?.message || String(error)));
  }

  if (!text) {
    if (hasAudioMessage(message)) {
      await telegram("sendMessage", {
        chat_id: message.chat.id,
        reply_to_message_id: message.message_id,
        text: "Не смог распознать голосовое. Проверь, что на сервере задан OPENAI_API_KEY.",
      });
    }
    return;
  }

  storeRecentMessage(message, text);

  if (isHermesCommand(text)) return handleHermesCommand(message, text);
  if (!operationalChat) return;

  if (text.startsWith("/task")) return handleTaskCommand(message, text);
  if (text.startsWith("/done")) return handleDoneCommand(message, text);
  if (text.startsWith("/my")) return handleMyCommand(message, text);
  if (text.startsWith("/assign")) return handleTaskPatchCommand(message, text, "assign");
  if (text.startsWith("/status")) return handleTaskPatchCommand(message, text, "status");
  if (text.startsWith("/deadline")) return handleTaskPatchCommand(message, text, "deadline");
  if (text.startsWith("/today") || text.startsWith("/dayplan")) return handleTodayCommand(message);
  if (text.startsWith("/atl")) return handleAtlCommand(message, text);
  if (text.startsWith("/tasks")) return handleTasksCommand(message, text);
  if (text.startsWith("/overdue")) return handleTasksCommand(message, "/tasks");
  if (text.startsWith("/chatid")) return handleChatIdCommand(message);
  if (text.startsWith("/marketing_link")) return handleMarketingLinkCommand(message);
  if (text.startsWith("/marketing_access")) return handleMarketingAccessCommand(message);
  if (text.startsWith("/decision")) return handleOperationCommand(message, text, "decisions", "Решение сохранено");
  if (text.startsWith("/question")) return handleOperationCommand(message, text, "questions", "Вопрос сохранён");
  if (text.startsWith("/report")) return handleOperationCommand(message, text, "reports", "Отчёт сохранён");
  if (text.startsWith("/remind")) return handleOperationCommand(message, text, "reminders", "Напоминание сохранено");
  if (text.startsWith("/help")) return sendHelp(message.chat.id);

  if (text.includes(TASK_TRIGGER_EMOJI)) {
    const cleanText = text.replaceAll(TASK_TRIGGER_EMOJI, "").trim() || text;
    await askCategoryForMessage(message, {
      title: firstLine(cleanText) || "Задача из Telegram",
      description: cleanText,
      assignee: "",
      dueDate: "",
    });
    return;
  }

  // Ordinary voice messages, forwards and replies are just chat context.
  // A task is created only by /task, 💋 in text, or a 💋 reaction.
}

function messageKey(chatId, messageId) {
  return `${chatId}:${messageId}`;
}

function storeRecentMessage(message, text = "") {
  if (!message?.chat?.id || !message?.message_id || message.from?.is_bot || !text.trim()) return;

  const storedMessage = {
    ...message,
    __atlasTranscript: text,
  };
  const key = messageKey(message.chat.id, message.message_id);
  recentMessages.set(key, {
    message: storedMessage,
    parsed: {
      title: firstLine(text) || "Задача из Telegram",
      description: text,
      assignee: "",
      dueDate: "",
    },
  });

  while (recentMessages.size > RECENT_MESSAGES_LIMIT) {
    const oldestKey = recentMessages.keys().next().value;
    recentMessages.delete(oldestKey);
  }
}

function hasEmojiReaction(reactions = [], emoji = TASK_TRIGGER_EMOJI) {
  return Array.isArray(reactions) && reactions.some((reaction) => reaction?.type === "emoji" && reaction.emoji === emoji);
}

async function handleMessageReaction(reaction) {
  const chatId = reaction.chat?.id;
  const messageId = reaction.message_id;
  if (!chatId || !messageId || !isAllowedChat(chatId)) return;
  const isTaskTrigger = hasEmojiReaction(reaction.new_reaction, TASK_TRIGGER_EMOJI) && !hasEmojiReaction(reaction.old_reaction, TASK_TRIGGER_EMOJI);
  const isDoneTrigger = hasEmojiReaction(reaction.new_reaction, TASK_DONE_EMOJI) && !hasEmojiReaction(reaction.old_reaction, TASK_DONE_EMOJI);
  if (!isTaskTrigger && !isDoneTrigger) return;

  if (isDoneTrigger) {
    await closeTaskFromTelegramSource({ chatId, messageId }, chatId, messageId);
    return;
  }

  const key = messageKey(chatId, messageId);
  if (pendingCategory.has(key)) return;

  const stored = recentMessages.get(key);
  if (!stored) {
    await telegram("sendMessage", {
      chat_id: chatId,
      reply_to_message_id: messageId,
      text: "Вижу 💋, но не вижу текст этого сообщения в памяти бота. Перешли сообщение заново или ответь на него командой /task.",
    });
    return;
  }

  await askCategoryForMessage(stored.message, stored.parsed);
}

async function getMessageText(message) {
  if (!message) return "";
  if (message.__atlasTranscript) return message.__atlasTranscript;
  if (hasAudioMessage(message)) {
    message.__atlasTranscript = await transcribeTelegramAudio(message);
    return message.__atlasTranscript;
  }
  return message.text || message.caption || "";
}

function getPlainMessageText(message) {
  return message?.text || message?.caption || message?.__atlasTranscript || "";
}

function hasAudioMessage(message) {
  return Boolean(message?.voice?.file_id || message?.audio?.file_id || message?.video_note?.file_id);
}

function getAudioFile(message) {
  return message.voice || message.audio || message.video_note || null;
}

function stripBotMention(command = "") {
  return command.replace(/^\/([a-zA-Z_]+)@[^\s]+/, "/$1");
}

function parseArgs(text, command) {
  return stripBotMention(text).replace(command, "").trim();
}

async function parseTaskText(raw = "", message) {
  const parts = raw.split(/\s+/).filter(Boolean);
  let category = "";
  let assignee = "";
  let dueDate = "";

  if (parts[0]) {
    category = normalizeCategory(parts.shift());
  }

  const rest = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part.startsWith("@") && !assignee) {
      assignee = part;
      continue;
    }
    if ((part === "до" || part === "deadline") && parts[index + 1] && !dueDate) {
      dueDate = parts[index + 1];
      index += 1;
      continue;
    }
    rest.push(part);
  }

  const replied = message.reply_to_message ? await getMessageText(message.reply_to_message) : "";
  const text = rest.join(" ").trim() || replied || await getForwardedText(message);
  return {
    category,
    title: firstLine(text) || "Задача из Telegram",
    description: text,
    assignee,
    dueDate,
  };
}

async function handleTaskCommand(message, text) {
  const args = parseArgs(text, "/task");
  let parsed;
  try {
    parsed = await parseTaskText(args, message);
  } catch (error) {
    log("task transcription error:", error?.message || String(error));
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: "Не смог распознать голосовое в reply. Проверь OPENAI_API_KEY или отправь текстом.",
    });
    return;
  }

  if (!parsed.category) {
    await askCategoryForMessage(message, parsed);
    return;
  }

  const result = await addTelegramTask({
    ...parsed,
    source: buildSource(message, parsed.description),
  });
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: `Задача добавлена: ${result.boardTitle}\n${result.task.title}`,
  });
}

async function askCategoryForMessage(message, parsed = null) {
  const rawText = parsed?.description || await getMessageText(message.reply_to_message || message) || await getForwardedText(message);
  const payload = {
    message,
    parsed: {
      title: parsed?.title || firstLine(rawText) || "Задача из Telegram",
      description: rawText,
      assignee: parsed?.assignee || "",
      dueDate: parsed?.dueDate || "",
    },
  };
  const key = `${message.chat.id}:${message.message_id}`;
  pendingCategory.set(key, payload);

  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: "Куда поставить задачу?",
    reply_markup: {
      inline_keyboard: CATEGORY_BUTTONS.map((row) => row.map((category) => ({
        text: category,
        callback_data: `taskcat:${key}:${category}`,
      }))),
    },
  });
}

async function handleCallback(callback) {
  const data = callback.data || "";
  if (!data.startsWith("taskcat:")) return;

  const [, chatId, messageId, category] = data.split(":");
  const key = `${chatId}:${messageId}`;
  const pending = pendingCategory.get(key);
  if (!pending) {
    await telegram("answerCallbackQuery", { callback_query_id: callback.id, text: "Задача не найдена, отправь заново." });
    return;
  }

  const result = await addTelegramTask({
    category,
    ...pending.parsed,
    source: buildSource(pending.message, pending.parsed.description),
  });
  pendingCategory.delete(key);

  await telegram("answerCallbackQuery", { callback_query_id: callback.id, text: `Добавлено: ${result.boardTitle}` });
  await telegram("sendMessage", {
    chat_id: pending.message.chat.id,
    reply_to_message_id: pending.message.message_id,
    text: `Задача добавлена: ${result.boardTitle}\n${result.task.title}`,
  });
}

async function handleDoneCommand(message, text) {
  const args = parseArgs(text, "/done");
  if (message.reply_to_message) {
    await closeTaskFromTelegramSource(buildReplySource(message), message.chat.id, message.message_id);
    return;
  }

  await appendTelegramOperation("reports", {
    kind: "done",
    text: args || "Задача отмечена как выполненная в Telegram. Связать с ID можно вручную в аналитике.",
    source: buildSource(message, args),
  });
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: "Зафиксировал выполнение. Для точного закрытия в аналитике нужен ID задачи или ручная отметка.",
  });
}

async function handleMyCommand(message, text) {
  const args = parseArgs(text, "/my").trim();
  const assignee = args || (message.from?.username ? `@${message.from.username}` : getAuthorName(message));
  const tasks = await collectTasks({ assignee, onlyActive: true });
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: formatTaskList(tasks, `Мои активные задачи: ${assignee}`),
  });
}

function buildReplySource(message) {
  return {
    chatId: message.reply_to_message?.chat?.id || message.chat?.id,
    messageId: message.reply_to_message?.message_id,
  };
}

async function closeTaskFromTelegramSource(source, chatId, replyToMessageId) {
  if (!source?.chatId || !source?.messageId) {
    await telegram("sendMessage", {
      chat_id: chatId,
      reply_to_message_id: replyToMessageId,
      text: "Ответь командой на исходное сообщение задачи или поставь ✅ на сообщение, из которого задача была создана.",
    });
    return;
  }

  const result = await updateTelegramTaskBySource(source, { status: "Готово" }, "Закрыта из Telegram");
  await telegram("sendMessage", {
    chat_id: chatId,
    reply_to_message_id: replyToMessageId,
    text: result
      ? `Готово: закрыта задача в ${result.boardTitle}\n${result.task.title || "Без названия"}`
      : "Не нашёл задачу по этому сообщению. Закрыть можно задачу, которая была создана из этого Telegram-сообщения.",
  });
}

async function handleTaskPatchCommand(message, text, kind) {
  if (!message.reply_to_message) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: "Эту команду нужно отправить reply на исходное сообщение задачи.",
    });
    return;
  }

  const command = kind === "assign" ? "/assign" : kind === "status" ? "/status" : "/deadline";
  const value = parseArgs(text, command).trim();
  if (!value) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: kind === "assign"
        ? "Напиши ответственного: /assign @username"
        : kind === "status"
          ? "Напиши статус: /status В работе"
          : "Напиши дедлайн: /deadline 05.06",
    });
    return;
  }

  const patch = kind === "assign"
    ? { assignee: value }
    : kind === "status"
      ? { status: value }
      : { dueDate: value };

  const result = await updateTelegramTaskBySource(
    buildReplySource(message),
    patch,
    kind === "assign" ? `Назначен ответственный: ${value}` : kind === "status" ? `Изменён статус: ${value}` : `Изменён дедлайн: ${value}`,
  );

  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: result
      ? `Обновлено: ${result.boardTitle}\n${result.task.title || "Без названия"}`
      : "Не нашёл задачу по этому сообщению. Попробуй reply на исходное сообщение, из которого создавали задачу.",
  });
}

async function handleTodayCommand(message) {
  const tasks = await readContent(CONTENT_KEYS.daily, []);
  await sendLongMessage({
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: formatDailyAssignmentPlan(tasks),
  });
}

async function handleTasksCommand(message, text) {
  const args = parseArgs(text, "/tasks").split(/\s+/).filter(Boolean);
  const category = args[0] || "";
  const tasks = await collectTasks({ category, onlyActive: true });
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: formatTaskList(tasks, category ? `Активные задачи: ${category}` : "Активные задачи"),
  });
}

async function handleAtlCommand(message, text) {
  const mode = parseArgs(text, "/atl").trim().toLowerCase();
  try {
    const result = await fetchAtlasIssues();
    await sendLongMessage({
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: formatAtlSummary(result, mode),
    });
  } catch (error) {
    log("atl command error:", error?.message || String(error));
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: "Не смог получить ATL-задачи. Проверь content-api и YouTrack-доступ.",
    });
  }
}

async function fetchAtlasIssues() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(new URL("/api/youtrack/issues?top=50", CONTENT_API_URL), {
      method: "GET",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function handleChatIdCommand(message) {
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: [
      `Chat ID: ${message.chat.id}`,
      message.chat.title ? `Chat title: ${message.chat.title}` : "",
      "Этот ID можно поставить в TELEGRAM_PUSH_CHAT_ID для кнопки Push.",
    ].filter(Boolean).join("\n"),
  });
}

async function handleUserIdCommand(message) {
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: `Ваш Telegram User ID: ${message.from?.id || "не определён"}`,
  });
}

async function readMemoryBindings() {
  const bindings = await readContent(TELEGRAM_MEMORY_BINDINGS_KEY, { version: 1, chats: {} });
  return {
    version: 1,
    chats: bindings?.chats && typeof bindings.chats === "object" ? bindings.chats : {},
  };
}

async function isMemoryChatBound(chatId) {
  const bindings = await readMemoryBindings();
  return Boolean(bindings.chats[String(chatId)]?.active);
}

async function handleMemoryHereCommand(message, rawText = "") {
  if (!HERMES_OWNER_TELEGRAM_IDS.size) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: "Владелец памяти ещё не настроен. Отправьте /userid и добавьте этот ID в HERMES_OWNER_TELEGRAM_IDS на сервере.",
    });
    return;
  }
  if (!isHermesOwner(message)) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: "Подключать чат к общей памяти может только владелец Hermes.",
    });
    return;
  }

  const purpose = stripBotMention(rawText).replace(/^\/memory_here(?:\s+|$)/i, "").trim();
  const bindings = await readMemoryBindings();
  const chatId = String(message.chat.id);
  const now = new Date().toISOString();
  await writeContent(TELEGRAM_MEMORY_BINDINGS_KEY, {
    ...bindings,
    updatedAt: now,
    chats: {
      ...bindings.chats,
      [chatId]: {
        active: true,
        chatId,
        title: message.chat.title || message.chat.username || "",
        purpose,
        boundAt: bindings.chats[chatId]?.boundAt || now,
        updatedAt: now,
        boundBy: {
          id: String(message.from?.id || ""),
          username: message.from?.username || "",
          name: [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" "),
        },
      },
    },
  });
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: [
      "Чат подключён к постоянной памяти Hermes.",
      purpose ? `Назначение: ${purpose}` : "Назначение можно добавить после команды: /memory_here работа по ...",
      "Новые сообщения будут храниться на сервере SuperSUS и дважды в день попадать в смысловую память.",
    ].join("\n"),
  });
}

async function handleMemoryOffCommand(message) {
  if (!isHermesOwner(message)) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: "Отключать память чата может только владелец Hermes.",
    });
    return;
  }
  const bindings = await readMemoryBindings();
  const chatId = String(message.chat.id);
  const current = bindings.chats[chatId] || {};
  await writeContent(TELEGRAM_MEMORY_BINDINGS_KEY, {
    ...bindings,
    updatedAt: new Date().toISOString(),
    chats: {
      ...bindings.chats,
      [chatId]: {
        ...current,
        chatId,
        title: current.title || message.chat.title || "",
        active: false,
        disabledAt: new Date().toISOString(),
      },
    },
  });
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: "Сохранение новых сообщений из этого чата отключено. Уже сохранённый архив не удалён.",
  });
}

async function handleMemoryStatusCommand(message) {
  const bindings = await readMemoryBindings();
  const chatId = String(message.chat.id);
  const binding = bindings.chats[chatId] || {};
  const archived = await readTelegramArchive({ chatId }).catch((error) => {
    log("telegram archive status error:", error?.message || String(error));
    return [];
  });
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: [
      `Постоянная память: ${binding.active ? "включена" : "выключена"}`,
      binding.purpose ? `Назначение чата: ${binding.purpose}` : "",
      `Сообщений в локальном архиве: ${archived.length}`,
      `Hindsight: ${HERMES_LONG_TERM_MEMORY_READY ? "подключён" : "ожидает проверки"}`,
      isHermesOwner(message) ? "Вам доступен общий поиск по всем подключённым чатам." : "Поиск по другим чатам недоступен.",
    ].filter(Boolean).join("\n"),
  });
}

async function isControlChatAdmin(message) {
  if (!message.from?.id || !ALLOWED_CHAT_IDS.size || !isAllowedChat(message.chat.id)) return false;
  const membership = await telegram("getChatMember", {
    chat_id: message.chat.id,
    user_id: message.from.id,
  }).catch(() => null);
  return ["creator", "administrator"].includes(membership?.status);
}

async function handleMarketingLinkCommand(message) {
  if (!await isControlChatAdmin(message)) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: "Одноразовую привязку может создать только администратор основной командной группы.",
    });
    return;
  }

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await writeContent(MARKETING_TELEGRAM_LINK_REQUEST_KEY, {
    code,
    userId: message.from.id,
    createdAt: new Date().toISOString(),
    expiresAt,
  });
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: [
      `Код для маркетингового чата: ${code}`,
      `Добавь бота в новую группу и отправь там: /marketing_here ${code}`,
      "Код действует 10 минут и привязан к твоему Telegram-аккаунту.",
    ].join("\n"),
  });
}

async function createMarketingBrowserAccess(message) {
  const code = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await writeContent(MARKETING_BROWSER_LINK_REQUEST_KEY, {
    code,
    createdAt: new Date().toISOString(),
    expiresAt,
    createdBy: {
      id: message.from?.id || null,
      username: message.from?.username || "",
      name: [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" "),
    },
  });
  const accessUrl = new URL(MARKETING_DASHBOARD_URL);
  accessUrl.searchParams.set("board", "parser");
  accessUrl.searchParams.set("marketing_access", code);
  return accessUrl.toString();
}

async function handleMarketingAccessCommand(message) {
  if (!await isControlChatAdmin(message)) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: "Доступ к редактированию Marketing Dashboard может выдать только администратор основной командной группы.",
    });
    return;
  }

  const accessUrl = await createMarketingBrowserAccess(message);
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: [
      "Открой ссылку в браузере, где работаешь с Marketing Dashboard:",
      accessUrl,
      "Ссылка одноразовая и действует 10 минут. Доступ в этом браузере сохранится на 90 дней.",
    ].join("\n"),
  });
}

async function handleMarketingHereCommand(message) {
  if (!["group", "supergroup"].includes(message.chat.type)) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: "Эту команду нужно отправить в отдельной группе для маркетинговых отчётов.",
    });
    return;
  }

  const member = await telegram("getChatMember", {
    chat_id: message.chat.id,
    user_id: message.from?.id,
  }).catch(() => null);
  if (!["creator", "administrator"].includes(member?.status)) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: "Привязать маркетинговый чат может только администратор группы.",
    });
    return;
  }

  const suppliedCode = String(message.text || "").trim().split(/\s+/)[1] || "";
  const request = await readContent(MARKETING_TELEGRAM_LINK_REQUEST_KEY, {});
  const isValidRequest = suppliedCode
    && suppliedCode === String(request.code || "")
    && Number(message.from?.id) === Number(request.userId)
    && Date.parse(request.expiresAt || "") > Date.now();
  if (!isValidRequest) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: "Код привязки неверный или уже истёк. Получи новый командой /marketing_link в основной группе.",
    });
    return;
  }

  await writeContent(MARKETING_TELEGRAM_BINDING_KEY, {
    chatId: String(message.chat.id),
    title: message.chat.title || "",
    boundAt: new Date().toISOString(),
    boundBy: {
      id: message.from?.id || null,
      username: message.from?.username || "",
      name: [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" "),
    },
  });
  await writeContent(MARKETING_TELEGRAM_LINK_REQUEST_KEY, {});
  const accessUrl = await createMarketingBrowserAccess(message);
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: [
      "Маркетинговые отчёты подключены к этому чату.",
      "Сюда будут приходить только важные изменения и одна сводка по событиям, без сообщений на каждое сохранение.",
      "",
      "Чтобы изменения из панели принимались монитором, один раз открой эту ссылку в рабочем браузере:",
      accessUrl,
      "Ссылка действует 10 минут.",
    ].join("\n"),
  });
}

async function handleMarketingOffCommand(message) {
  if (!await isControlChatAdmin(message)) {
    if (isAllowedChat(message.chat.id)) {
      await telegram("sendMessage", {
        chat_id: message.chat.id,
        reply_to_message_id: message.message_id,
        text: "Отключить маркетинговый чат может только администратор основной командной группы.",
      });
    }
    return;
  }

  await Promise.all([
    writeContent(MARKETING_TELEGRAM_BINDING_KEY, {}),
    writeContent(MARKETING_BROWSER_LINK_REQUEST_KEY, {}),
    writeContent(MARKETING_BROWSER_SESSIONS_KEY, { sessions: [] }),
  ]);
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: "Маркетинговые отчёты отключены. Накопившиеся события останутся в очереди до новой привязки.",
  });
}

async function handleOperationCommand(message, text, type, successText) {
  const command = `/${type === "decisions" ? "decision" : type === "questions" ? "question" : type === "reports" ? "report" : "remind"}`;
  let body = parseArgs(text, command);
  if (!body && message.reply_to_message) {
    try {
      body = await getMessageText(message.reply_to_message);
    } catch (error) {
      log("operation transcription error:", error?.message || String(error));
      await telegram("sendMessage", {
        chat_id: message.chat.id,
        reply_to_message_id: message.message_id,
        text: "Не смог распознать голосовое в reply. Проверь OPENAI_API_KEY или отправь текстом.",
      });
      return;
    }
  }
  if (!body.trim()) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: "Нужен текст после команды или reply на сообщение.",
    });
    return;
  }

  await appendTelegramOperation(type, {
    text: body,
    source: buildSource(message, body),
  });

  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: successText,
  });
}

function isHermesCommand(text = "") {
  const value = stripBotMention(String(text || "").trim());
  return /^\/hermes(?:\s|$)/i.test(value) || /^гермес(?:\s|,|:|-|—|$)/i.test(value);
}

function parseHermesPrompt(text = "") {
  return stripBotMention(String(text || "").trim())
    .replace(/^\/hermes(?:\s+|$)/i, "")
    .replace(/^гермес(?:\s|,|:|-|—)+/i, "")
    .trim();
}

async function handleHermesCommand(message, text) {
  if (!HERMES_BRIDGE_URL || !HERMES_BRIDGE_TOKEN) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: "Гермес ещё не подключён к этому боту на сервере. Нужны HERMES_BRIDGE_URL и HERMES_BRIDGE_TOKEN.",
    });
    return;
  }

  let prompt = parseHermesPrompt(text);
  if (!prompt && message.reply_to_message) {
    try {
      prompt = await getMessageText(message.reply_to_message);
    } catch (error) {
      log("hermes reply transcription error:", error?.message || String(error));
    }
  }

  if (!prompt.trim()) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: "Напиши так: /hermes что нужно разобрать, запомнить или сделать",
    });
    return;
  }

  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: "Передал Гермесу, думаю...",
  });

  try {
    const result = await askHermesBridge({
      prompt,
      memoryScope: isHermesOwner(message) ? "global" : "chat",
      source: buildSource(message, prompt),
    });
    await sendLongMessage({
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: result || "Гермес ответил пусто. Проверь логи hermes-telegram-bridge.service.",
    });
  } catch (error) {
    log("hermes bridge error:", error?.message || String(error));
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: `Гермес не ответил: ${error?.message || "ошибка моста"}`,
    });
  }
}

async function askHermesBridge(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HERMES_TIMEOUT_MS);
  try {
    const response = await fetch(HERMES_BRIDGE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HERMES_BRIDGE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json?.error || `HTTP ${response.status}`);
    }
    return String(json?.answer || "").trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function sendHelp(chatId) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text: [
      "Команды Atlas Tasks:",
      "/hermes текст — спросить Гермеса / второй мозг",
      "/task marketing текст — добавить задачу",
      "/task launch @user до 01.06 текст — задача с ответственным и сроком",
      "Reply на сообщение + /task marketing — взять текст из сообщения",
      "💋 в тексте или реакция 💋 на сообщение — предложить добавить задачу",
      "Обычные фразы, голосовые, forwards и replies не создают задачи сами",
      "/today — план на день по подзадачам и ответственным",
      "/dayplan — то же самое, удобно отправлять в общий чат",
      "/atl — сводка по ATL/YouTrack",
      "/atl testing — задачи на тестировании",
      "/atl showstoppers — show-stopper задачи",
      "/atl attention — где нужен ответ",
      "/atl stale — зависшие 24ч+",
      "/tasks marketing — активные задачи категории",
      "/my — мои активные задачи",
      "Reply + /assign @user — назначить ответственного",
      "Reply + /status В работе — поменять статус",
      "Reply + /deadline 05.06 — поменять дедлайн",
      "✅ на исходном сообщении задачи — закрыть задачу",
      "/chatid — показать ID текущего Telegram-чата для Push",
      "/userid — показать ваш Telegram User ID",
      "/memory_here описание — включить постоянную память в этом чате",
      "/memory_status — показать состояние и размер архива чата",
      "/memory_off — остановить сохранение новых сообщений",
      "/marketing_link — привязать отдельный чат маркетинговых отчётов",
      "/marketing_access — выдать одноразовый доступ к редактированию Marketing Dashboard",
      "/decision текст — зафиксировать решение",
      "/question текст — зафиксировать вопрос",
      "/report текст — зафиксировать отчёт",
      "/remind текст — сохранить напоминание",
    ].join("\n"),
  });
}

async function sendLongMessage({ text, ...payload }) {
  const chunks = splitTelegramMessage(text);
  for (const chunk of chunks) {
    await telegram("sendMessage", {
      ...payload,
      text: chunk,
      disable_web_page_preview: true,
    });
  }
}

function splitTelegramMessage(text = "", limit = 3900) {
  const value = String(text || "");
  if (value.length <= limit) return [value];

  const chunks = [];
  let rest = value;
  while (rest.length > limit) {
    const cut = Math.max(rest.lastIndexOf("\n\n", limit), rest.lastIndexOf("\n", limit), limit);
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function firstLine(value = "") {
  return String(value).split(/\n/).map((line) => line.trim()).find(Boolean) || "";
}

async function getForwardedText(message) {
  const text = await getMessageText(message);
  if (text) return text;
  if (message.reply_to_message) return getMessageText(message.reply_to_message);
  return "";
}

function buildMessageUrl(message) {
  const username = message.chat?.username;
  if (username) return `https://t.me/${username}/${message.message_id}`;
  const chatId = String(message.chat?.id || "");
  if (chatId.startsWith("-100")) return `https://t.me/c/${chatId.slice(4)}/${message.message_id}`;
  return "";
}

function getAuthorName(message) {
  const user = message.from;
  if (!user) return message.forward_sender_name || "";
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || String(user.id);
}

function buildSource(message, rawText = "") {
  return {
    chatId: message.chat?.id,
    chatTitle: message.chat?.title || message.chat?.username || "",
    messageId: message.message_id,
    messageUrl: buildMessageUrl(message),
    authorId: message.from?.id,
    authorName: getAuthorName(message),
    rawText,
    receivedAt: new Date().toISOString(),
  };
}

async function transcribeTelegramAudio(message) {
  const audio = getAudioFile(message);
  if (!audio?.file_id || !OPENAI_API_KEY) return "";

  const size = Number(audio.file_size || 0);
  if (size > MAX_AUDIO_BYTES) {
    throw new Error(`audio_too_large:${size}`);
  }

  const file = await telegram("getFile", { file_id: audio.file_id });
  if (!file?.file_path) throw new Error("telegram_file_path_missing");

  const extension = file.file_path.split(".").pop() || "ogg";
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
  const fileResponse = await fetch(fileUrl);
  if (!fileResponse.ok) throw new Error(`telegram_file_download_failed:${fileResponse.status}`);

  const audioBuffer = await fileResponse.arrayBuffer();
  const form = new FormData();
  form.append("model", TRANSCRIPTION_MODEL);
  form.append("file", new Blob([audioBuffer], { type: audio.mime_type || "audio/ogg" }), `telegram-audio.${extension}`);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: form,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`transcription_failed:${payload?.error?.message || response.status}`);
  }

  return String(payload.text || "").trim();
}

function formatTaskList(tasks, title) {
  if (!tasks.length) return `${title}\n\nНет активных задач.`;
  return [
    title,
    "",
    ...tasks.slice(0, 20).map((task, index) => `${index + 1}. [${task.boardTitle}] ${task.title || "Без названия"}${task.assignee || task.responsible ? ` — ${task.assignee || task.responsible}` : ""}`),
    tasks.length > 20 ? `\n...и ещё ${tasks.length - 20}` : "",
  ].filter(Boolean).join("\n");
}

function normalizeAtlMode(value = "") {
  const mode = String(value || "").trim().toLowerCase();
  if (["test", "testing", "тест", "тестирование"].includes(mode)) return "testing";
  if (["show", "showstopper", "showstoppers", "blockers", "стоп", "шоу", "критичные"].includes(mode)) return "showstoppers";
  if (["attention", "answer", "answers", "ответ", "ответить", "внимание"].includes(mode)) return "attention";
  if (["stale", "old", "зависшие", "зависло", "старые"].includes(mode)) return "stale";
  return "summary";
}

function isTestingStatus(value = "") {
  return /тест|test/i.test(String(value || ""));
}

function isShowStopper(issue = {}) {
  return /show/i.test(String(issue.priority || ""));
}

function formatIssueLine(issue = {}, index = 0) {
  const meta = [
    issue.status || "—",
    issue.assignee ? `исп: ${issue.assignee}` : "",
    issue.inactiveLabel ? `обновл: ${issue.inactiveLabel} назад` : "",
  ].filter(Boolean).join(" · ");
  return `${index + 1}. ${issue.id} — ${issue.title || "Без названия"}\n   ${meta}\n   ${issue.url || ""}`.trim();
}

function formatIssueSection(title, issues, emptyText = "Нет задач.") {
  return [
    title,
    issues.length ? issues.slice(0, 10).map(formatIssueLine).join("\n\n") : emptyText,
    issues.length > 10 ? `\n...и ещё ${issues.length - 10}` : "",
  ].filter(Boolean).join("\n");
}

function formatAtlSummary(result = {}, rawMode = "") {
  const mode = normalizeAtlMode(rawMode);
  const issues = Array.isArray(result.issues) ? result.issues : [];
  const openIssues = issues.filter((issue) => !issue.isResolved);
  const testing = openIssues.filter((issue) => isTestingStatus(issue.status));
  const attention = openIssues.filter((issue) => issue.needsAttention);
  const showStoppers = openIssues.filter(isShowStopper);
  const stale = openIssues.filter((issue) => Number(issue.inactiveMs || 0) >= 24 * 60 * 60 * 1000);
  const summary = result.summary || {};

  if (mode === "testing") return formatIssueSection(`ATL: на тестировании — ${testing.length}`, testing, "На тестировании сейчас пусто.");
  if (mode === "showstoppers") return formatIssueSection(`ATL: show-stopper — ${showStoppers.length}`, showStoppers, "Открытых show-stopper нет.");
  if (mode === "attention") return formatIssueSection(`ATL: нужен ответ — ${attention.length}`, attention, "Нет задач, где явно нужен ответ.");
  if (mode === "stale") return formatIssueSection(`ATL: зависшие 24ч+ — ${stale.length}`, stale, "Зависших 24ч+ нет.");

  return [
    "ATL / YouTrack сейчас",
    "",
    `Всего: ${summary.total ?? issues.length}`,
    `Открыто: ${summary.open ?? openIssues.length}`,
    `Done: ${summary.done ?? issues.filter((issue) => issue.isResolved).length}`,
    `На тестировании: ${testing.length}`,
    `Нужен ответ: ${summary.attention ?? attention.length}`,
    `Show-stopper: ${summary.showStoppers ?? showStoppers.length}`,
    `Зависшие 24ч+: ${summary.stale ?? stale.length}`,
    "",
    "Команды:",
    "/atl testing",
    "/atl showstoppers",
    "/atl attention",
    "/atl stale",
  ].join("\n");
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function isDone(value) {
  return Boolean(value?.done || value?.status === "Готово");
}

function cleanAssignee(value = "") {
  const normalized = String(value || "").trim();
  if (!normalized || /^не назнач/i.test(normalized)) return "Не назначен";
  return normalized;
}

function formatDailyAssignmentPlan(tasks) {
  const activeTasks = normalizeArray(tasks).filter((task) => !isDone(task));
  if (!activeTasks.length) return "План на день\n\nАктивных задач нет.";

  const lines = [
    "План на день",
    `Активные задачи: ${activeTasks.length}`,
    "",
  ];

  activeTasks.forEach((task, taskIndex) => {
    const subtasks = normalizeArray(task.subtasks).filter((subtask) => !isDone(subtask));
    const taskDeadline = task.deadline ? ` | срок: ${task.deadline}` : "";
    lines.push(`${taskIndex + 1}. ${task.title || "Без названия"}${taskDeadline}`);

    if (!subtasks.length) {
      lines.push(`   - ${cleanAssignee(task.responsible || task.assignee)}: ${task.title || "Без названия"} | ${task.status || "В работе"} | ${task.priority || "Средний"}`);
      lines.push("");
      return;
    }

    subtasks.forEach((subtask, subtaskIndex) => {
      const assignee = cleanAssignee(subtask.responsible || subtask.assignee);
      const status = subtask.status || "В работе";
      const priority = subtask.priority || "Средний";
      const deadline = subtask.deadline ? ` | до ${subtask.deadline}` : "";
      lines.push(`   ${subtaskIndex + 1}) ${assignee}: ${subtask.title || "Без названия"} | ${status} | ${priority}${deadline}`);
    });
    lines.push("");
  });

  lines.push("Чтобы изменить ответственного, статус или дедлайн, откройте вкладку Ближайшие задачи в аналитике.");
  return lines.join("\n").trim();
}
