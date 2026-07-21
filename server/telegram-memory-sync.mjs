import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { readTelegramArchive, TELEGRAM_MEMORY_ARCHIVE_DIR } from "./telegram-memory-archive.mjs";

const HERMES_BRIDGE_URL = process.env.HERMES_BRIDGE_URL || "";
const HERMES_BRIDGE_TOKEN = process.env.HERMES_BRIDGE_TOKEN || "";
const HERMES_TIMEOUT_MS = Number(process.env.HERMES_BRIDGE_TIMEOUT_MS || 180_000);
const HERMES_LONG_TERM_MEMORY_READY = /^(1|true|yes|on)$/i.test(process.env.HERMES_LONG_TERM_MEMORY_READY || "");
const MEMORY_SYNC_BATCH_SIZE = Math.max(1, Number(process.env.TELEGRAM_MEMORY_ARCHIVE_SYNC_BATCH_SIZE || 20));
const MEMORY_SYNC_MAX_BATCHES = Math.max(1, Number(process.env.TELEGRAM_MEMORY_ARCHIVE_SYNC_MAX_BATCHES || 100));
const CURSOR_FILE = process.env.TELEGRAM_MEMORY_ARCHIVE_CURSOR_FILE
  || path.join(TELEGRAM_MEMORY_ARCHIVE_DIR, "sync", "hermes-cursors.json");

function comparePosition(left = {}, right = {}) {
  const time = String(left.observedAt || left.sentAt || "").localeCompare(String(right.observedAt || right.sentAt || ""));
  if (time !== 0) return time;
  return String(left.eventId || "").localeCompare(String(right.eventId || ""));
}

function isAfterCursor(record, cursor = {}) {
  if (!cursor?.observedAt && !cursor?.eventId) return true;
  return comparePosition(record, cursor) > 0;
}

export function redactSensitiveText(value = "") {
  return String(value || "")
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[REDACTED_API_KEY]")
    .replace(/\b(?:ghp_|github_pat_)[A-Za-z0-9_]{16,}\b/g, "[REDACTED_GITHUB_TOKEN]")
    .replace(/\b\d{7,12}:[A-Za-z0-9_-]{25,}\b/g, "[REDACTED_TELEGRAM_TOKEN]")
    .replace(/(^|\n)(\s*(?:password|passwd|secret|api[_ -]?key|access[_ -]?token|private[_ -]?key|пароль|приватный ключ)\s*[:=]\s*)[^\n]+/gim, "$1$2[REDACTED]");
}

async function readCursors(cursorFile = CURSOR_FILE) {
  try {
    return JSON.parse(await readFile(cursorFile, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return { version: 1, chats: {} };
    throw error;
  }
}

async function writeCursors(cursors, cursorFile = CURSOR_FILE) {
  await mkdir(path.dirname(cursorFile), { recursive: true });
  const temporary = `${cursorFile}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(cursors, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, cursorFile);
}

function formatArchiveRecord(record) {
  const reply = record.message?.replyToMessageId
    ? `; reply_to=${record.message.replyToMessageId}${record.message.replyToAuthor ? ` (${record.message.replyToAuthor})` : ""}`
    : "";
  const replyText = record.message?.replyToText ? `\nreply_text:\n${redactSensitiveText(record.message.replyToText)}` : "";
  const files = Array.isArray(record.message?.attachments) && record.message.attachments.length
    ? `; attachments=${record.message.attachments.map((item) => item.kind).join(",")}`
    : "";
  const link = record.message?.url ? `; url=${record.message.url}` : "";
  return [
    `EVENT ${record.eventId}`,
    `time=${record.sentAt}; chat=${record.chat?.title || record.chat?.id}; chat_id=${record.chat?.id}`,
    `author=${record.author?.name || record.author?.username || record.author?.id}; author_id=${record.author?.id}${reply}${files}${link}`,
    `tags=${Array.isArray(record.message?.tags) ? record.message.tags.join(",") : ""}${replyText}`,
    "text:",
    redactSensitiveText(record.message?.text) || `[${record.message?.type || "message without text"}]`,
  ].join("\n");
}

export function buildArchiveMemoryPrompt(chatRecords = []) {
  const first = chatRecords[0] || {};
  return [
    "Это пакет исходных сообщений из постоянного архива Telegram проекта Atlas.",
    "Сохрани факты, решения, задачи, идеи, договорённости, участников, даты и связи между ними в долговременной памяти.",
    "Не выдумывай отсутствующие детали. Шутки не превращай в решения. Для каждого факта сохраняй источник EVENT и ссылку, если она есть.",
    "Это внутренняя синхронизация: ничего не отправляй в Telegram.",
    `Чат: ${first.chat?.title || first.chat?.id || "unknown"} (${first.chat?.id || "unknown"})`,
    "",
    ...chatRecords.flatMap((record) => [formatArchiveRecord(record), ""]),
    "Ответь для технического лога одной строкой: сколько событий принято и диапазон EVENT.",
  ].join("\n");
}

async function sendToHermes(records, options = {}) {
  const bridgeUrl = options.bridgeUrl || HERMES_BRIDGE_URL;
  const bridgeToken = options.bridgeToken || HERMES_BRIDGE_TOKEN;
  if (!bridgeUrl || !bridgeToken) throw new Error("HERMES_BRIDGE_URL/HERMES_BRIDGE_TOKEN are required");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || HERMES_TIMEOUT_MS);
  try {
    const first = records[0];
    const response = await fetch(bridgeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bridgeToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: buildArchiveMemoryPrompt(records),
        memoryOnly: true,
        memoryScope: "global",
        source: {
          chatId: first.chat?.id || "unknown",
          chatTitle: first.chat?.title || "",
          authorName: "Atlas Telegram archive sync",
          rawText: "",
          receivedAt: new Date().toISOString(),
        },
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `Hermes bridge HTTP ${response.status}`);
    return String(payload?.answer || "").trim();
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncTelegramArchive(options = {}) {
  if (!options.dryRun && !options.force && !HERMES_LONG_TERM_MEMORY_READY) {
    throw new Error("HERMES_LONG_TERM_MEMORY_READY=1 is required after Hindsight health verification");
  }
  const archiveRoot = options.rootDir || TELEGRAM_MEMORY_ARCHIVE_DIR;
  const cursorFile = options.cursorFile || CURSOR_FILE;
  const records = await readTelegramArchive({ rootDir: archiveRoot });
  records.sort(comparePosition);
  const cursors = await readCursors(cursorFile);
  const chats = new Map();

  for (const record of records) {
    const chatId = String(record.chat?.id || "unknown");
    if (!isAfterCursor(record, cursors.chats?.[chatId])) continue;
    if (!chats.has(chatId)) chats.set(chatId, []);
    chats.get(chatId).push(record);
  }

  let batches = 0;
  let synced = 0;
  const results = [];
  for (const [chatId, chatRecords] of chats) {
    for (let index = 0; index < chatRecords.length && batches < (options.maxBatches || MEMORY_SYNC_MAX_BATCHES); index += (options.batchSize || MEMORY_SYNC_BATCH_SIZE)) {
      const batch = chatRecords.slice(index, index + (options.batchSize || MEMORY_SYNC_BATCH_SIZE));
      const answer = options.dryRun ? "dry-run" : await sendToHermes(batch, options);
      const last = batch.at(-1);
      cursors.version = 1;
      cursors.updatedAt = new Date().toISOString();
      cursors.chats = {
        ...(cursors.chats || {}),
        [chatId]: {
          observedAt: last.observedAt || last.sentAt,
          eventId: last.eventId,
          syncedAt: cursors.updatedAt,
        },
      };
      if (!options.dryRun) await writeCursors(cursors, cursorFile);
      batches += 1;
      synced += batch.length;
      results.push({ chatId, count: batch.length, firstEventId: batch[0].eventId, lastEventId: last.eventId, answer });
    }
    if (batches >= (options.maxBatches || MEMORY_SYNC_MAX_BATCHES)) break;
  }

  return { archived: records.length, pending: [...chats.values()].reduce((sum, items) => sum + items.length, 0), synced, batches, results };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncTelegramArchive({ dryRun: process.argv.includes("--dry-run") })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(`[telegram-memory-sync] ${error?.stack || error}`);
      process.exitCode = 1;
    });
}
