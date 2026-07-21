import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { archiveTelegramMessage } from "../server/telegram-memory-archive.mjs";

export function telegramExportText(value) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map((part) => (typeof part === "string" ? part : String(part?.text || ""))).join("");
}

function numericPart(value) {
  const match = String(value ?? "").match(/-?\d+/);
  return match ? Number(match[0]) : 0;
}

function stableChatId(chat = {}) {
  const numeric = numericPart(chat.id);
  if (numeric) return numeric;
  const seed = `${chat.type || "chat"}:${chat.name || chat.title || "unknown"}`;
  const digest = createHash("sha256").update(seed).digest("hex").slice(0, 12);
  return `telegram-export-${digest}`;
}

function exportChats(payload = {}) {
  if (Array.isArray(payload.messages)) return [payload];
  if (Array.isArray(payload.chats?.list)) return payload.chats.list;
  if (Array.isArray(payload.chats)) return payload.chats;
  return [];
}

function fileFromExport(item = {}) {
  const filePath = item.file || item.photo || "";
  if (!filePath) return {};
  return {
    document: {
      file_id: `telegram-export:${filePath}`,
      file_unique_id: createHash("sha256").update(String(filePath)).digest("hex"),
      file_name: path.basename(String(filePath)),
      mime_type: item.mime_type || "",
      file_size: Number(item.file_size || 0),
    },
  };
}

function messageFromExport(chat, item = {}) {
  const chatId = stableChatId(chat);
  const text = telegramExportText(item.text || item.caption);
  const authorId = numericPart(item.from_id) || String(item.from_id || item.actor_id || item.from || "unknown");
  const messageId = Number(item.id || 0);
  return {
    text,
    message: {
      message_id: messageId,
      date: Number(item.date_unixtime || 0) || Math.floor(Date.parse(item.date || new Date().toISOString()) / 1000),
      edit_date: Number(item.edited_unixtime || item.edit_date_unixtime || 0),
      chat: {
        id: chatId,
        type: chat.type || "exported_chat",
        title: chat.name || chat.title || "Telegram export",
      },
      from: {
        id: authorId,
        first_name: item.from || item.actor || "unknown",
        username: item.from_username || "",
        is_bot: false,
      },
      text,
      reply_to_message: item.reply_to_message_id ? { message_id: Number(item.reply_to_message_id) } : undefined,
      forward_sender_name: item.forwarded_from || "",
      ...fileFromExport(item),
    },
    source: {
      chatId,
      chatTitle: chat.name || chat.title || "Telegram export",
      messageId,
      messageUrl: "",
      authorId,
      authorName: item.from || item.actor || "unknown",
      rawText: text,
      receivedAt: new Date().toISOString(),
    },
  };
}

export async function importTelegramHistory(filePath, options = {}) {
  const payload = JSON.parse(await readFile(filePath, "utf8"));
  const chats = exportChats(payload);
  let imported = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const chat of chats) {
    for (const item of Array.isArray(chat.messages) ? chat.messages : []) {
      if (item.type && item.type !== "message") {
        skipped += 1;
        continue;
      }
      if (!item.id) {
        skipped += 1;
        continue;
      }
      const normalized = messageFromExport(chat, item);
      const result = await archiveTelegramMessage({
        ...normalized,
        tags: ["import:telegram-desktop"],
      }, { rootDir: options.rootDir });
      if (result.created) imported += 1;
      else duplicates += 1;
    }
  }

  return { chats: chats.length, imported, duplicates, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node scripts/import-telegram-history.mjs /path/to/TelegramDesktopExport/result.json");
    process.exitCode = 1;
  } else {
    importTelegramHistory(filePath)
      .then((result) => console.log(JSON.stringify(result, null, 2)))
      .catch((error) => {
        console.error(error?.stack || error);
        process.exitCode = 1;
      });
  }
}

