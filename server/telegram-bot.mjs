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
const CORNER_JOKE_REACTION = "😁";
const MEMORY_MAX_TIMELINE = Number(process.env.TELEGRAM_MEMORY_MAX_TIMELINE || 300);
const MEMORY_MAX_UNSYNCED = Number(process.env.TELEGRAM_MEMORY_MAX_UNSYNCED || 60);
const MEMORY_SYNC_MIN_EVENTS = Number(process.env.TELEGRAM_MEMORY_SYNC_MIN_EVENTS || 8);
const MEMORY_SYNC_MIN_INTERVAL_MS = Number(process.env.TELEGRAM_MEMORY_SYNC_MIN_INTERVAL_MS || 10 * 60 * 1000);
const CATEGORY_BUTTONS = [
  ["inbox", "launch"],
  ["marketing", "smm"],
  ["site", "content"],
  ["design", "legal"],
  ["tech", "knowledge"],
  ["ideas", "daily"],
  ["other"],
];
const SUPERSUS_PERSONA = {
  name: "Суперсус",
  role: "живой операционный участник Telegram-чата SuperSUS / Atlas",
  style: [
    "говорит по-русски",
    "пишет коротко, живо и по делу",
    "не начинает обычные ответы с «Суперсус:»",
    "не упоминает Codex, приоритеты и служебные статусы без явной причины",
    "может отвечать reply на конкретное сообщение",
    "может ставить лёгкую реакцию, если ответа текстом много",
  ],
  humor: [
    "вайб простодушного рабочего товарища с сухим абсурдом",
    "можно слегка чудить в стиле офисного персонажа, но без копирования известных цитат",
    "без национальных карикатур, токсичности, грубых оскорблений и унижения участников",
    "шутка должна помогать атмосфере, а не забивать рабочий чат",
  ],
};
const SUPERSUS_CAPABILITIES = [
  "следить за YouTrack/ATL и писать в Telegram только важный движ: новые комменты, статусы, тест, блокеры",
  "создавать задачи из Telegram только по явному триггеру: /task, 💋 или настроенный маркер",
  "не трогать обычную переписку, voice, reply и forward, а сохранять их как контекст",
  "показывать /atl, /today, /tasks, /my и помогать не терять хвосты",
  "фиксировать /decision, /question, /report и /remind в операционной памяти",
  "через /hermes спрашивать второй мозг и синхронизировать важную память чата",
  "помнить участников, внутренние шутки и стиль общения без выдумывания биографий",
  "отвечать живо, коротко, reply-кнопкой и без лишней служебки",
];
const SUPERSUS_MEMORY_RULES = [
  "обычные сообщения не становятся задачами",
  "шутки не сохраняются как факты о человеке, если могут навредить",
  "при спорном контексте лучше уточнить или промолчать, чем создать мусорную задачу",
  "если участник подкалывает бота, можно ответить короткой шуткой через reply",
  "важные решения, повторяющиеся шутки и рабочие договорённости уходят в Hermes memory",
];

let offset = Number(process.env.TELEGRAM_UPDATE_OFFSET || 0);
const pendingCategory = new Map();
const recentMessages = new Map();
const hermesMemorySyncInFlight = new Set();

function botSay(text) {
  return text;
}

function botLines(lines = []) {
  return lines.join("\n");
}

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
        text: botSay("голосовое не разобрал, мой друг. Проверь OPENAI_API_KEY или кинь текстом."),
      });
    }
    return;
  }
  if (!text) {
    if (hasAudioMessage(message)) {
      await telegram("sendMessage", {
        chat_id: message.chat.id,
        reply_to_message_id: message.message_id,
        text: botSay("голосовое пришло, но уши не поднялись. Нужен OPENAI_API_KEY или текстом."),
      });
    }
    return;
  }

  storeRecentMessage(message, text);
  await rememberTelegramChat(message, text);

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
  if (isSuperSusCommand(text)) return handleSuperSusCommand(message, text);
  if (text.startsWith("/help")) return sendHelp(message.chat.id);

  if (await handleCornerJoke(message, text)) return;

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
}

function isReplyToSuperSusPrompt(message) {
  const replied = message?.reply_to_message;
  if (!replied?.from?.is_bot) return false;
  const text = getPlainMessageText(replied);
  return /super\s*sus|supersus|суперсус|задача поймана|куда клад[её]м|куда поставить задачу/i.test(text);
}

async function handleCornerJoke(message, text = "") {
  if (!/\bв\s+угол\b/i.test(text) || !isReplyToSuperSusPrompt(message)) return false;

  await tryReactToMessage(message, CORNER_JOKE_REACTION);
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: botSay("ахах, угол не прокатил. Ставлю отметку и возвращаю в строй. Фронт сам себя не проверит."),
  });
  return true;
}

async function tryReactToMessage(message, emoji) {
  try {
    await telegram("setMessageReaction", {
      chat_id: message.chat.id,
      message_id: message.message_id,
      reaction: [{ type: "emoji", emoji }],
      is_big: false,
    });
  } catch (error) {
    log("reaction skipped:", error?.message || String(error));
  }
}

function compactMemoryText(value = "", maxLength = 520) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function uniqLimited(values = [], limit = 12) {
  return [...new Set(values.filter(Boolean))].slice(0, limit);
}

function memoryChatKey(message) {
  return String(message?.chat?.id || "unknown");
}

function detectMemoryTags(message, text = "") {
  const source = buildSource(message, text);
  const haystack = `${source.authorName || ""} ${source.chatTitle || ""} ${text || ""}`;
  const tags = [];
  if (message.reply_to_message) tags.push("reply");
  if (message.reply_to_message?.from?.is_bot) tags.push("reply_to_bot");
  if (/\bв\s+угол\b/i.test(text)) tags.push("inside_joke:corner");
  if (/ротенберг/i.test(haystack)) tags.push("participant:rotenberg");
  if (/каллисто|callisto/i.test(haystack)) tags.push("context:callisto");
  if (text.includes(TASK_TRIGGER_EMOJI) || stripBotMention(text).startsWith("/task")) tags.push("task_intent");
  if (isHermesCommand(text)) tags.push("hermes_command");
  return uniqLimited(tags, 10);
}

function upsertMemoryJoke(chat, key, patch = {}) {
  const jokes = Array.isArray(chat.jokes) ? chat.jokes : [];
  const now = new Date().toISOString();
  const index = jokes.findIndex((item) => item.key === key);
  const previous = index >= 0 ? jokes[index] : { key, firstSeenAt: now, count: 0 };
  const next = {
    ...previous,
    ...patch,
    count: Number(previous.count || 0) + 1,
    lastSeenAt: now,
  };
  if (index >= 0) jokes[index] = next;
  else jokes.unshift(next);
  chat.jokes = jokes.slice(0, 30);
}

function updateParticipantMemory(participant, text = "", tags = []) {
  const notes = Array.isArray(participant.notes) ? participant.notes : [];
  const phrases = Array.isArray(participant.phrases) ? participant.phrases : [];

  if (tags.includes("participant:rotenberg")) {
    notes.unshift("Ротенберг общается через короткий стёб, можно отвечать живо и без канцелярита.");
  }
  if (tags.includes("inside_joke:corner")) {
    notes.unshift("Шутка участника: на вопрос Суперсуса куда поставить задачу может отвечать «в угол».");
    phrases.unshift("в угол");
  }
  if (/ахах|хаха|😂|😁|😄/i.test(text)) {
    notes.unshift("Нормально воспринимает лёгкий чатовый юмор.");
  }

  return {
    ...participant,
    notes: uniqLimited(notes, 12),
    phrases: uniqLimited(phrases, 12),
  };
}

function mergeSuperSusPersona(previousPersona = {}) {
  return {
    ...SUPERSUS_PERSONA,
    ...previousPersona,
    style: uniqLimited([
      ...SUPERSUS_PERSONA.style,
      ...(Array.isArray(previousPersona.style) ? previousPersona.style : []),
    ], 18),
    humor: uniqLimited([
      ...SUPERSUS_PERSONA.humor,
      ...(Array.isArray(previousPersona.humor) ? previousPersona.humor : []),
    ], 18),
    capabilities: uniqLimited([
      ...SUPERSUS_CAPABILITIES,
      ...(Array.isArray(previousPersona.capabilities) ? previousPersona.capabilities : []),
    ], 24),
    memoryRules: uniqLimited([
      ...SUPERSUS_MEMORY_RULES,
      ...(Array.isArray(previousPersona.memoryRules) ? previousPersona.memoryRules : []),
    ], 18),
  };
}

function formatSuperSusPersonaBlock() {
  return [
    `Имя: ${SUPERSUS_PERSONA.name}`,
    `Роль: ${SUPERSUS_PERSONA.role}`,
    "",
    "Стиль:",
    ...SUPERSUS_PERSONA.style.map((item) => `- ${item}`),
    "",
    "Юмор:",
    ...SUPERSUS_PERSONA.humor.map((item) => `- ${item}`),
    "",
    "Что умеет:",
    ...SUPERSUS_CAPABILITIES.map((item) => `- ${item}`),
    "",
    "Правила памяти:",
    ...SUPERSUS_MEMORY_RULES.map((item) => `- ${item}`),
  ].join("\n");
}

function shouldSyncMemoryToHermes(chat, event) {
  if (!HERMES_BRIDGE_URL || !HERMES_BRIDGE_TOKEN) return false;
  const unsynced = Array.isArray(chat.unsyncedEvents) ? chat.unsyncedEvents.length : 0;
  if (event.tags?.some((tag) => tag.startsWith("inside_joke:"))) return true;
  const lastSyncMs = chat.lastHermesSyncAt ? new Date(chat.lastHermesSyncAt).getTime() : 0;
  return unsynced >= MEMORY_SYNC_MIN_EVENTS && Date.now() - lastSyncMs >= MEMORY_SYNC_MIN_INTERVAL_MS;
}

async function rememberTelegramChat(message, text = "") {
  if (!message?.chat?.id || message.from?.is_bot || !String(text || "").trim()) return;

  const now = new Date().toISOString();
  const source = buildSource(message, text);
  const chatId = memoryChatKey(message);
  const participantId = String(message.from?.id || source.authorName || "unknown");
  const memory = await readContent(CONTENT_KEYS.telegramMemory, { version: 1, chats: {} });
  const chats = memory?.chats && typeof memory.chats === "object" ? memory.chats : {};
  const previousChat = chats[chatId] || {};
  const participants = previousChat.participants && typeof previousChat.participants === "object" ? previousChat.participants : {};
  const previousParticipant = participants[participantId] || {};
  const tags = detectMemoryTags(message, text);
  const event = {
    id: `${chatId}:${message.message_id}`,
    at: now,
    chatId,
    chatTitle: source.chatTitle || "",
    authorId: participantId,
    authorName: source.authorName || "unknown",
    text: compactMemoryText(text),
    messageId: message.message_id,
    replyToMessageId: message.reply_to_message?.message_id || null,
    messageUrl: source.messageUrl || "",
    tags,
  };

  let participant = updateParticipantMemory({
    ...previousParticipant,
    id: participantId,
    name: source.authorName || previousParticipant.name || "unknown",
    username: message.from?.username || previousParticipant.username || "",
    firstSeenAt: previousParticipant.firstSeenAt || now,
    lastSeenAt: now,
    messages: Number(previousParticipant.messages || 0) + 1,
    lastTexts: [event.text, ...(Array.isArray(previousParticipant.lastTexts) ? previousParticipant.lastTexts : [])].slice(0, 5),
  }, text, tags);

  const chat = {
    version: 1,
    chatId,
    title: source.chatTitle || previousChat.title || "",
    platform: "telegram",
    updatedAt: now,
    firstSeenAt: previousChat.firstSeenAt || now,
    persona: mergeSuperSusPersona(previousChat.persona || {}),
    participants: {
      ...participants,
      [participantId]: participant,
    },
    jokes: Array.isArray(previousChat.jokes) ? previousChat.jokes : [],
    timeline: [event, ...(Array.isArray(previousChat.timeline) ? previousChat.timeline.filter((item) => item.id !== event.id) : [])].slice(0, MEMORY_MAX_TIMELINE),
    unsyncedEvents: [event, ...(Array.isArray(previousChat.unsyncedEvents) ? previousChat.unsyncedEvents.filter((item) => item.id !== event.id) : [])].slice(0, MEMORY_MAX_UNSYNCED),
    lastHermesSyncAt: previousChat.lastHermesSyncAt || "",
    hermesSyncCount: Number(previousChat.hermesSyncCount || 0),
    lastHermesAnswer: previousChat.lastHermesAnswer || "",
  };

  if (tags.includes("inside_joke:corner")) {
    upsertMemoryJoke(chat, "corner", {
      title: "В угол",
      meaning: "Ротенберг/участники могут отвечать «в угол» на вопрос Суперсуса о категории задачи. Отвечать короткой шуткой и не создавать задачу.",
      lastAuthor: event.authorName,
      lastMessage: event.text,
    });
  }

  const nextMemory = {
    version: 1,
    updatedAt: now,
    chats: {
      ...chats,
      [chatId]: chat,
    },
  };
  await writeContent(CONTENT_KEYS.telegramMemory, nextMemory);

  if (shouldSyncMemoryToHermes(chat, event)) {
    void syncTelegramMemoryToHermes(chatId, tags.includes("inside_joke:corner") ? "inside_joke" : "batch").catch((error) => {
      log("hermes memory sync error:", error?.message || String(error));
    });
  }
}

function formatMemoryParticipants(participants = {}) {
  return Object.values(participants)
    .sort((a, b) => Number(b.messages || 0) - Number(a.messages || 0))
    .slice(0, 12)
    .map((participant) => {
      const notes = Array.isArray(participant.notes) && participant.notes.length ? `; заметки: ${participant.notes.slice(0, 3).join("; ")}` : "";
      return `- ${participant.name || participant.username || participant.id}: ${participant.messages || 0} сообщений${notes}`;
    })
    .join("\n");
}

function formatMemoryJokes(jokes = []) {
  if (!Array.isArray(jokes) || !jokes.length) return "- Пока нет закреплённых внутренних шуток.";
  return jokes.slice(0, 12).map((joke) => `- ${joke.title || joke.key}: ${joke.meaning || ""} Последний раз: ${joke.lastMessage || ""}`).join("\n");
}

function buildHermesMemoryPrompt(chat, events = [], reason = "batch") {
  const eventLines = events.slice(-20).map((event) => (
    `- ${event.at} · ${event.authorName}: ${event.text}${event.tags?.length ? ` [${event.tags.join(", ")}]` : ""}`
  )).join("\n");

  return [
    "Это внутренняя запись памяти Telegram-чата для Суперсуса.",
    "Не отправляй ответ в Telegram. Просто запомни контекст в своей сессии/памяти и используй его в будущих ответах.",
    "",
    `Причина синхронизации: ${reason}`,
    `Чат: ${chat.title || chat.chatId}`,
    "",
    "Паспорт Суперсуса:",
    formatSuperSusPersonaBlock(),
    "",
    "Участники и стиль общения:",
    formatMemoryParticipants(chat.participants || {}),
    "",
    "Внутренние шутки и контекст:",
    formatMemoryJokes(chat.jokes || []),
    "",
    "Новые события для запоминания:",
    eventLines || "- Новых событий нет.",
    "",
    "Что помнить на будущее:",
    "- Если Ротенберг или другой участник подкалывает Суперсуса, отвечать reply-кнопкой, коротко и по-человечески.",
    "- Если всплывает старая шутка, можно аккуратно её продолжить, не превращая в задачу.",
    "- Юмор держать в рабочей норме: без копирования чужих персонажей, без национальных карикатур и без токсичности.",
    "- Не выдумывать факты о людях; опираться на эту память и свежий контекст.",
  ].join("\n");
}

async function syncTelegramMemoryToHermes(chatId, reason = "batch") {
  if (!HERMES_BRIDGE_URL || !HERMES_BRIDGE_TOKEN || hermesMemorySyncInFlight.has(chatId)) return;
  hermesMemorySyncInFlight.add(chatId);
  try {
    const memory = await readContent(CONTENT_KEYS.telegramMemory, { version: 1, chats: {} });
    const chat = memory?.chats?.[chatId];
    const events = Array.isArray(chat?.unsyncedEvents) ? [...chat.unsyncedEvents].reverse() : [];
    if (!chat || !events.length) return;

    const prompt = buildHermesMemoryPrompt(chat, events, reason);
    const answer = await askHermesBridge({
      prompt,
      memoryOnly: true,
      source: {
        chatId,
        chatTitle: chat.title || "",
        authorName: "Суперсус memory sync",
        rawText: prompt,
        receivedAt: new Date().toISOString(),
      },
    });

    const freshMemory = await readContent(CONTENT_KEYS.telegramMemory, { version: 1, chats: {} });
    const freshChat = freshMemory?.chats?.[chatId];
    if (!freshChat) return;
    const syncedIds = new Set(events.map((event) => event.id));
    const nextChat = {
      ...freshChat,
      lastHermesSyncAt: new Date().toISOString(),
      hermesSyncCount: Number(freshChat.hermesSyncCount || 0) + 1,
      lastHermesAnswer: compactMemoryText(answer || "Hermes memory sync ok", 500),
      unsyncedEvents: (Array.isArray(freshChat.unsyncedEvents) ? freshChat.unsyncedEvents : []).filter((event) => !syncedIds.has(event.id)),
    };
    await writeContent(CONTENT_KEYS.telegramMemory, {
      ...freshMemory,
      updatedAt: nextChat.lastHermesSyncAt,
      chats: {
        ...(freshMemory.chats || {}),
        [chatId]: nextChat,
      },
    });
  } finally {
    hermesMemorySyncInFlight.delete(chatId);
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
      text: botSay("вижу 💋, но текста этого сообщения в памяти нет. Перешли заново или ответь на него командой /task."),
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
      text: botSay("reply-голосовое не разобрал. Проверь OPENAI_API_KEY или кинь текстом."),
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
    text: botSay(`очень хорошо, задача поймана.\nДоска: ${result.boardTitle}\n${result.task.title}`),
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
    text: botSay("задача поймана. Куда кладём, мой друг?"),
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
    await telegram("answerCallbackQuery", { callback_query_id: callback.id, text: "задача потерялась" });
    return;
  }

  const result = await addTelegramTask({
    category,
    ...pending.parsed,
    source: buildSource(pending.message, pending.parsed.description),
  });
  pendingCategory.delete(key);

  await telegram("answerCallbackQuery", { callback_query_id: callback.id, text: "готово" });
  await telegram("sendMessage", {
    chat_id: pending.message.chat.id,
    reply_to_message_id: pending.message.message_id,
    text: botSay(`очень хорошо, задача добавлена.\nДоска: ${result.boardTitle}\n${result.task.title}`),
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
    text: botSay("выполнение зафиксировал. Для точного закрытия в аналитике нужен ID задачи или ручная отметка."),
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
      text: botSay("закрывать надо по исходному сообщению задачи: reply командой или ✅ на сообщение, из которого задача создана."),
    });
    return;
  }

  const result = await updateTelegramTaskBySource(source, { status: "Готово" }, "Закрыта из Telegram");
  await telegram("sendMessage", {
    chat_id: chatId,
    reply_to_message_id: replyToMessageId,
    text: result
      ? botSay(`готово, закрыта задача.\nДоска: ${result.boardTitle}\n${result.task.title || "Без названия"}`)
      : botSay("задачу по этому сообщению не нашёл. Закрыть можно только задачу, созданную из этого Telegram-сообщения."),
  });
}

async function handleTaskPatchCommand(message, text, kind) {
  if (!message.reply_to_message) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: botSay("эту команду надо отправить reply на исходное сообщение задачи."),
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
        ? botSay("напиши ответственного: /assign @username")
        : kind === "status"
          ? botSay("напиши статус: /status В работе")
          : botSay("напиши дедлайн: /deadline 05.06"),
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
      ? botSay(`готово, обновил.\nДоска: ${result.boardTitle}\n${result.task.title || "Без названия"}`)
      : botSay("задачу по этому сообщению не нашёл. Попробуй reply на исходное сообщение, из которого создавали задачу."),
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
      text: botSay(`сводку Atlas не достал: ${error?.message || "ошибка монитора"}`),
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
      body: JSON.stringify({ notify: false, persist: false }),
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
    text: botLines([
      `Chat ID: ${message.chat.id}`,
      message.chat.title ? `Chat title: ${message.chat.title}` : "",
      "Этот ID можно поставить в TELEGRAM_PUSH_CHAT_ID для кнопки Push.",
    ].filter(Boolean)),
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
        text: botSay("reply-голосовое не разобрал. Проверь OPENAI_API_KEY или кинь текстом."),
      });
      return;
    }
  }
  if (!body.trim()) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: botSay("нужен текст после команды или reply на сообщение."),
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
    text: botSay(`${successText}. Очень хорошо.`),
  });
}

function isSuperSusCommand(text = "") {
  const value = stripBotMention(String(text || "").trim());
  return /^\/(?:sus|supersus)(?:\s|$)/i.test(value) || /^суперсус(?:\s|,|:|-|—|$)/i.test(value);
}

function parseSuperSusPrompt(text = "") {
  return stripBotMention(String(text || "").trim())
    .replace(/^\/(?:sus|supersus)(?:\s+|$)/i, "")
    .replace(/^суперсус(?:\s|,|:|-|—)+/i, "")
    .trim();
}

async function handleSuperSusCommand(message, text) {
  const prompt = parseSuperSusPrompt(text).toLowerCase();

  if (/памят|memory|помнишь/.test(prompt)) {
    const memory = await readContent(CONTENT_KEYS.telegramMemory, { version: 1, chats: {} });
    const chat = memory?.chats?.[memoryChatKey(message)] || {};
    const participantsCount = Object.keys(chat.participants || {}).length;
    const jokesCount = Array.isArray(chat.jokes) ? chat.jokes.length : 0;
    const lastSync = chat.lastHermesSyncAt ? formatDateTimeRu(chat.lastHermesSyncAt) : "ещё не синкался";
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: botLines([
        "память на месте, мой друг.",
        `Участников помню: ${participantsCount}`,
        `Внутренних шуток: ${jokesCount}`,
        `Последний sync в Hermes: ${lastSync}`,
        "Сырой чат наружу не показываю, приватность держу крепко.",
      ]),
    });
    return;
  }

  if (/стил|тон|характер|юмор|voice|персона/.test(prompt)) {
    await sendLongMessage({
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: botLines([
        "мой режим такой: рабочий товарищ, коротко, живо, без канцелярской каши.",
        "",
        "Юмор можно, но аккуратно:",
        ...SUPERSUS_PERSONA.humor.map((item) => `- ${item}`),
        "",
        "Главное: смешно там, где помогает, и молча там, где надо не шуметь.",
      ]),
    });
    return;
  }

  await sendLongMessage({
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: botLines([
      "я могу быть маленьким операционным диспетчером, не просто пищалкой.",
      "",
      ...SUPERSUS_CAPABILITIES.map((item) => `- ${item}`),
      "",
      "Полезные быстрые команды:",
      "/atl — что двигается по задачам",
      "/today — план на день",
      "/task marketing текст — создать задачу",
      "/hermes текст — спросить второй мозг",
      "/sus память — проверить, что память живая",
      "",
      "Меньше шума, больше дела. Очень культурный контроль хаоса.",
    ]),
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
      text: botSay("Гермес ещё не подключён к этому боту на сервере. Нужны HERMES_BRIDGE_URL и HERMES_BRIDGE_TOKEN."),
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
      text: botSay("напиши так: /hermes что нужно разобрать, запомнить или сделать"),
    });
    return;
  }

  await telegram("sendMessage", {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: botSay("передал Гермесу. Думаем красиво..."),
  });

  try {
    const result = await askHermesBridge({
      prompt,
      source: buildSource(message, prompt),
    });
    await sendLongMessage({
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: result || botSay("Гермес ответил пусто. Проверь логи hermes-telegram-bridge.service."),
    });
  } catch (error) {
    log("hermes bridge error:", error?.message || String(error));
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      text: botSay(`Гермес не ответил: ${error?.message || "ошибка моста"}`),
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
    text: botLines([
      "большое здравствуйте. Я держу задачи в порядке, без лишней суеты.",
      "",
      "Команды Atlas Tasks:",
      "/atl — живая сводка по задачам Atlas/YouTrack",
      "/sus — что умеет Суперсус и какой у него режим",
      "/sus память — проверить память Telegram-чата",
      "/hermes текст — спросить Гермеса / второй мозг",
      "/task marketing текст — добавить задачу",
      "/task launch @user до 01.06 текст — задача с ответственным и сроком",
      "Reply на сообщение + /task marketing — взять текст из сообщения",
      "Обычный текст, voice, reply или forward без /task не создаёт задачу",
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
    ]),
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
