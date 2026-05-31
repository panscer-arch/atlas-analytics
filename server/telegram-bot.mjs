import {
  addTelegramTask,
  appendTelegramOperation,
  collectTasks,
  normalizeCategory,
  STORE_DIR,
} from "./telegram-task-store.mjs";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1";
const MAX_AUDIO_BYTES = Number(process.env.TELEGRAM_TRANSCRIBE_MAX_BYTES || 25 * 1024 * 1024);
const ALLOWED_CHAT_IDS = new Set(
  String(process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);
const POLL_TIMEOUT_SECONDS = 25;
const CATEGORY_BUTTONS = [
  ["marketing", "launch"],
  ["landos", "content"],
  ["design", "legal"],
  ["tech", "daily"],
  ["other"],
];

let offset = Number(process.env.TELEGRAM_UPDATE_OFFSET || 0);
const pendingCategory = new Map();

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
        allowed_updates: ["message", "callback_query"],
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

  if (text.startsWith("/task")) return handleTaskCommand(message, text);
  if (text.startsWith("/done")) return handleDoneCommand(message, text);
  if (text.startsWith("/today")) return handleTodayCommand(message);
  if (text.startsWith("/tasks")) return handleTasksCommand(message, text);
  if (text.startsWith("/overdue")) return handleTasksCommand(message, "/tasks");
  if (text.startsWith("/decision")) return handleOperationCommand(message, text, "decisions", "Решение сохранено");
  if (text.startsWith("/question")) return handleOperationCommand(message, text, "questions", "Вопрос сохранён");
  if (text.startsWith("/report")) return handleOperationCommand(message, text, "reports", "Отчёт сохранён");
  if (text.startsWith("/remind")) return handleOperationCommand(message, text, "reminders", "Напоминание сохранено");
  if (text.startsWith("/help")) return sendHelp(message.chat.id);

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

async function handleTodayCommand(message) {
  const tasks = await collectTasks({ category: "daily", onlyActive: true });
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: formatTaskList(tasks, "Активные задачи на день"),
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

async function sendHelp(chatId) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text: [
      "Команды Atlas Tasks:",
      "/task marketing текст — добавить задачу",
      "/task launch @user до 01.06 текст — задача с ответственным и сроком",
      "Reply на сообщение + /task marketing — взять текст из сообщения",
      "/today — задачи на день",
      "/tasks marketing — активные задачи категории",
      "/decision текст — зафиксировать решение",
      "/question текст — зафиксировать вопрос",
      "/report текст — зафиксировать отчёт",
      "/remind текст — сохранить напоминание",
    ].join("\n"),
  });
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
