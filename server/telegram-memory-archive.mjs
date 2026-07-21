import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_ARCHIVE_DIR = path.join(
  process.env.ATLAS_CONTENT_STORE_DIR || process.env.TELEGRAM_TASK_STORE_DIR || "/tmp/atlas-analytics-content",
  "telegram-memory-archive",
);

export const TELEGRAM_MEMORY_ARCHIVE_DIR = process.env.TELEGRAM_MEMORY_ARCHIVE_DIR || DEFAULT_ARCHIVE_DIR;

function safeSegment(value, fallback = "unknown") {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function safeChatSegment(value) {
  const raw = String(value ?? "").trim();
  const sign = raw.startsWith("-") ? "n" : /^\d/.test(raw) ? "p" : "x";
  return `${sign}-${safeSegment(raw.replace(/^-/, ""))}`;
}

function isoFromUnix(value, fallback = new Date()) {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return new Date(seconds * 1000).toISOString();
  return fallback.toISOString();
}

function messageContentType(message = {}) {
  const candidates = [
    "voice",
    "audio",
    "video",
    "video_note",
    "animation",
    "document",
    "photo",
    "sticker",
    "contact",
    "location",
    "venue",
    "poll",
  ];
  return candidates.find((key) => message[key]) || (message.text ? "text" : "unknown");
}

function normalizeFile(file, kind = "file") {
  if (!file || typeof file !== "object") return null;
  return {
    kind,
    fileId: file.file_id || "",
    fileUniqueId: file.file_unique_id || "",
    fileName: file.file_name || "",
    mimeType: file.mime_type || "",
    fileSize: Number(file.file_size || 0),
    duration: Number(file.duration || 0),
    width: Number(file.width || 0),
    height: Number(file.height || 0),
  };
}

function collectAttachments(message = {}) {
  const attachments = [];
  const directKinds = ["voice", "audio", "video", "video_note", "animation", "document", "sticker"];
  for (const kind of directKinds) {
    const item = normalizeFile(message[kind], kind);
    if (item) attachments.push(item);
  }
  if (Array.isArray(message.photo) && message.photo.length) {
    const largest = [...message.photo].sort((a, b) => Number(b.file_size || 0) - Number(a.file_size || 0))[0];
    const item = normalizeFile(largest, "photo");
    if (item) attachments.push(item);
  }
  return attachments;
}

function normalizeForwardOrigin(message = {}) {
  const origin = message.forward_origin;
  if (!origin) {
    if (!message.forward_from && !message.forward_sender_name && !message.forward_from_chat) return null;
    return {
      type: "legacy",
      senderName: message.forward_sender_name || "",
      authorId: String(message.forward_from?.id || ""),
      authorName: [message.forward_from?.first_name, message.forward_from?.last_name].filter(Boolean).join(" "),
      chatId: String(message.forward_from_chat?.id || ""),
      chatTitle: message.forward_from_chat?.title || "",
    };
  }
  return {
    type: origin.type || "unknown",
    sentAt: isoFromUnix(origin.date),
    senderName: origin.sender_user_name || origin.sender_name || "",
    authorId: String(origin.sender_user?.id || ""),
    authorName: [origin.sender_user?.first_name, origin.sender_user?.last_name].filter(Boolean).join(" "),
    chatId: String(origin.chat?.id || ""),
    chatTitle: origin.chat?.title || origin.chat?.username || "",
    messageId: origin.message_id || null,
  };
}

function buildArchiveRecord({ message, text = "", tags = [], source = {}, transcriptionError = "" }) {
  const observedAt = new Date();
  const chatId = String(message?.chat?.id || source.chatId || "unknown");
  const messageId = Number(message?.message_id || source.messageId || 0);
  const editDate = Number(message?.edit_date || 0);
  const body = String(text || message?.text || message?.caption || "").trim();
  const contentDigest = createHash("sha256").update(body).digest("hex").slice(0, 12);
  const revision = editDate > 0 ? `edit-${editDate}-${contentDigest}` : "original";
  const authorName = source.authorName
    || [message?.from?.first_name, message?.from?.last_name].filter(Boolean).join(" ")
    || message?.from?.username
    || message?.sender_chat?.title
    || message?.sender_chat?.username
    || "unknown";

  return {
    schemaVersion: 1,
    eventId: `${chatId}:${messageId}:${revision}`,
    revision,
    observedAt: observedAt.toISOString(),
    sentAt: isoFromUnix(message?.date, observedAt),
    editedAt: editDate > 0 ? isoFromUnix(editDate, observedAt) : "",
    platform: "telegram",
    chat: {
      id: chatId,
      type: message?.chat?.type || "",
      title: source.chatTitle || message?.chat?.title || message?.chat?.username || "",
      username: message?.chat?.username || "",
    },
    author: {
      id: String(message?.from?.id || message?.sender_chat?.id || source.authorId || ""),
      name: authorName,
      username: message?.from?.username || message?.sender_chat?.username || "",
      isBot: Boolean(message?.from?.is_bot),
    },
    message: {
      id: messageId,
      url: source.messageUrl || "",
      type: messageContentType(message),
      text: body,
      replyToMessageId: message?.reply_to_message?.message_id || null,
      replyToAuthor: message?.reply_to_message
        ? [message.reply_to_message.from?.first_name, message.reply_to_message.from?.last_name].filter(Boolean).join(" ")
          || message.reply_to_message.from?.username
          || ""
        : "",
      replyToText: String(message?.reply_to_message?.text || message?.reply_to_message?.caption || "").trim(),
      forwardOrigin: normalizeForwardOrigin(message),
      attachments: collectAttachments(message),
      tags: [...new Set((Array.isArray(tags) ? tags : []).filter(Boolean))],
      transcriptionError: String(transcriptionError || ""),
    },
  };
}

function archivePathForRecord(record, rootDir = TELEGRAM_MEMORY_ARCHIVE_DIR) {
  const date = new Date(record.sentAt);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const chat = safeChatSegment(record.chat.id);
  const filename = `${safeSegment(record.message.id, "0")}.${safeSegment(record.revision)}.json`;
  return path.join(rootDir, "chats", chat, year, month, day, filename);
}

export async function archiveTelegramMessage(input, options = {}) {
  const record = buildArchiveRecord(input || {});
  const filePath = archivePathForRecord(record, options.rootDir || TELEGRAM_MEMORY_ARCHIVE_DIR);
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    return { created: true, duplicate: false, filePath, record };
  } catch (error) {
    if (error?.code === "EEXIST") return { created: false, duplicate: true, filePath, record };
    throw error;
  }
}

async function walkJsonFiles(directory, output) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walkJsonFiles(fullPath, output);
    else if (entry.isFile() && entry.name.endsWith(".json")) output.push(fullPath);
  }
}

export async function readTelegramArchive(options = {}) {
  const rootDir = options.rootDir || TELEGRAM_MEMORY_ARCHIVE_DIR;
  const files = [];
  await walkJsonFiles(path.join(rootDir, "chats"), files);
  const records = [];
  for (const filePath of files.sort()) {
    const record = JSON.parse(await readFile(filePath, "utf8"));
    if (options.chatId && String(record?.chat?.id) !== String(options.chatId)) continue;
    if (options.after && String(record?.sentAt || "") <= String(options.after)) continue;
    records.push(record);
  }
  records.sort((a, b) => String(a.sentAt).localeCompare(String(b.sentAt)) || String(a.eventId).localeCompare(String(b.eventId)));
  return records;
}
