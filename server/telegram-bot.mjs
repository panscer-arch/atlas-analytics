import {
  addTelegramTask,
  appendTelegramOperation,
  collectTasks,
  CONTENT_KEYS,
  normalizeCategory,
  readContent,
  STORE_DIR,
  updateTelegramTaskBySource,
} from "./telegram-task-store.mjs";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1";
const MAX_AUDIO_BYTES = Number(process.env.TELEGRAM_TRANSCRIBE_MAX_BYTES || 25 * 1024 * 1024);
const HERMES_BRIDGE_URL = process.env.HERMES_BRIDGE_URL || "";
const HERMES_BRIDGE_TOKEN = process.env.HERMES_BRIDGE_TOKEN || "";
const HERMES_TIMEOUT_MS = Number(process.env.HERMES_BRIDGE_TIMEOUT_MS || 180_000);
const CONTENT_API_URL = (process.env.ATLAS_CONTENT_API_URL || process.env.CONTENT_API_URL || `http://127.0.0.1:${process.env.ATLAS_CONTENT_API_PORT || 8787}`).replace(/\/+$/, "");
const ATL_MONITOR_TIMEOUT_MS = Number(process.env.ATL_MONITOR_TIMEOUT_MS || 30_000);
const ALLOWED_CHAT_IDS = new Set(
  String(process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);
const POLL_TIMEOUT_SECONDS = 25;
const TASK_TRIGGER_EMOJI = "💋";
const TASK_DONE_EMOJI = "✅";
const RECENT_MESSAGES_LIMIT = 800;
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
  log(`started. STORE_DIR=${STORE_DIR}`);
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

async function pollLoop() {
  while (true) {
    try {
      const updates = await telegram("getUpdates", {
        offset,
        timeout: POLL_TIMEOUT_SECONDS,
        allowed_updates: ["message", "message_reaction", "callback_query"],
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

  const message = update.message;
  if (!message?.chat?.id || !isAllowedChat(message.chat.id)) return;

  let text = "";
  try {
    text = (await getMessageText(message)).trim();
  } catch (error) {
    log("transcription error:", error?.message || String(error));
    if (hasAudioMessage(message)) {
      await telegram("sendMessage", {
        chat_id: message.chat.id,
        reply_to_message_id: message.message_id,
        text: "Не смог распознать голосовое. Проверь OPENAI_API_KEY или отправь текстом.",
      });
    }
    return;
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

  if (text.startsWith("/task")) return handleTaskCommand(message, text);
  if (text.startsWith("/done")) return handleDoneCommand(message, text);
  if (text.startsWith("/my")) return handleMyCommand(message, text);
  if (text.startsWith("/assign")) return handleTaskPatchCommand(message, text, "assign");
  if (text.startsWith("/status")) return handleTaskPatchCommand(message, text, "status");
  if (text.startsWith("/deadline")) return handleTaskPatchCommand(message, text, "deadline");
  if (text.startsWith("/today") || text.startsWith("/dayplan")) return handleTodayCommand(message);
  if (text.startsWith("/tasks")) return handleTasksCommand(message, text);
  if (text.startsWith("/overdue")) return handleTasksCommand(message, "/tasks");
  if (text.startsWith("/chatid")) return handleChatIdCommand(message);
  if (text.startsWith("/decision")) return handleOperationCommand(message, text, "decisions", "Решение сохранено");
  if (text.startsWith("/question")) return handleOperationCommand(message, text, "questions", "Вопрос сохранён");
  if (text.startsWith("/report")) return handleOperationCommand(message, text, "reports", "Отчёт сохранён");
  if (text.startsWith("/remind")) return handleOperationCommand(message, text, "reminders", "Напоминание сохранено");
  if (isAtlCommand(text)) return handleAtlCommand(message);
  if (isHermesCommand(text)) return handleHermesCommand(message, text);
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

  if (hasAudioMessage(message)) {
    await askCategoryForMessage(message, {
      title: firstLine(text) || "Задача из голосового",
      description: text,
      assignee: "",
      dueDate: "",
    });
    return;
  }

  if (message.forward_origin || message.forward_from || message.forward_sender_name || message.reply_to_message) {
    await askCategoryForMessage(message);
  }
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

function isAtlCommand(text = "") {
  const value = stripBotMention(String(text || "").trim());
  return /^\/atl(?:\s|$)/i.test(value);
}

async function handleAtlCommand(message) {
  try {
    const result = await fetchAtlasMonitorSummary();
    await sendLongMessage({
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: formatAtlasMonitorSummary(result),
    });
  } catch (error) {
    log("atl monitor error:", error?.message || String(error));
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: `Не смог получить сводку Atlas: ${error?.message || "ошибка монитора"}`,
    });
  }
}

async function fetchAtlasMonitorSummary() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ATL_MONITOR_TIMEOUT_MS);
  try {
    const response = await fetch(`${CONTENT_API_URL}/api/youtrack/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notify: false }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function formatAtlasMonitorSummary(payload = {}) {
  const summary = payload.summary || {};
  const issues = Array.isArray(payload.issues) ? payload.issues : [];
  const changes = Array.isArray(payload.changes) ? payload.changes : [];
  const statuses = summary.statuses || {};
  const needsAnswerIssues = issues.filter((issue) => issue.needsAttention && !issue.isResolved);
  const waitsForDeveloperIssues = issues.filter((issue) => issue.waitsForDeveloper && !issue.isResolved);
  const staleIssues = issues.filter((issue) => !issue.isResolved && Number(issue.inactiveMs || 0) >= 24 * 60 * 60 * 1000);
  const showStoppers = issues.filter((issue) => !issue.isResolved && /show-stopper|critical|blocker|критичес|блокер/i.test(issue.priority || ""));

  const lines = [
    "ATLAS TASK MONITOR",
    `Проверено: ${formatDateTimeRu(payload.lastCheckedAt)}`,
    "",
    `Открыто: ${summary.open ?? 0} / Готово: ${summary.done ?? 0}`,
    `Нужен ответ: ${summary.needsAnswer ?? summary.attention ?? 0}`,
    `Ждёт прогера: ${summary.waitsForDeveloper ?? 0}`,
    `Зависло 24ч+: ${summary.stale ?? staleIssues.length}`,
    `Show-stopper: ${summary.showStoppers ?? showStoppers.length}`,
    "",
    "Статусы:",
    ...Object.entries(statuses).map(([status, count]) => `${status}: ${count}`),
  ];

  appendIssueBlock(lines, "Нужен ответ = Нужно уточнение:", needsAnswerIssues, 5);
  appendIssueBlock(lines, "Ждёт прогера = Нужно уточнение + Тестирование:", waitsForDeveloperIssues, 6);
  appendIssueBlock(lines, "Зависшие 24ч+:", staleIssues, 5);
  appendIssueBlock(lines, "Show-stopper:", showStoppers, 5);

  if (changes.length) {
    lines.push("", "Новые изменения:");
    for (const change of changes.slice(0, 5)) {
      lines.push(`- ${change.message || `${change.issue?.id || "Issue"}: изменение`}`);
    }
    if (changes.length > 5) lines.push(`...ещё ${changes.length - 5}`);
  }

  return lines.join("\n").trim();
}

function appendIssueBlock(lines, title, issues, limit) {
  if (!issues.length) return;
  lines.push("", title);
  for (const issue of issues.slice(0, limit)) {
    lines.push(`- ${issue.id}: ${issue.title || "Без названия"} (${issue.status || "—"}, ${issue.assignee || "—"}, ${issue.statusAgeLabel || issue.inactiveLabel || "—"})`);
  }
  if (issues.length > limit) lines.push(`...ещё ${issues.length - limit}`);
}

function formatDateTimeRu(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "сейчас";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
      "/atl — живая сводка по задачам Atlas/YouTrack",
      "/hermes текст — спросить Гермеса / второй мозг",
      "/task marketing текст — добавить задачу",
      "/task launch @user до 01.06 текст — задача с ответственным и сроком",
      "Reply на сообщение + /task marketing — взять текст из сообщения",
      "/today — план на день по подзадачам и ответственным",
      "/dayplan — то же самое, удобно отправлять в общий чат",
      "/tasks marketing — активные задачи категории",
      "/my — мои активные задачи",
      "Reply + /assign @user — назначить ответственного",
      "Reply + /status В работе — поменять статус",
      "Reply + /deadline 05.06 — поменять дедлайн",
      "✅ на исходном сообщении задачи — закрыть задачу",
      "/chatid — показать ID текущего Telegram-чата для Push",
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
