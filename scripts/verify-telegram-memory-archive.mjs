import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { archiveTelegramMessage, readTelegramArchive } from "../server/telegram-memory-archive.mjs";
import { buildArchiveMemoryPrompt, redactSensitiveText, syncTelegramArchive } from "../server/telegram-memory-sync.mjs";
import { importTelegramHistory } from "./import-telegram-history.mjs";

const rootDir = await mkdtemp(path.join(os.tmpdir(), "atlas-telegram-memory-"));
const cursorFile = path.join(rootDir, "sync", "cursor.json");

try {
  const longText = `Полный текст без обрезания: ${"память ".repeat(200)}`.trim();
  const message = {
    message_id: 41,
    date: 1_784_600_000,
    chat: { id: -1001234567890, type: "supergroup", title: "Atlas Team" },
    from: { id: 777, first_name: "Digitex", username: "digitex" },
    text: longText,
    reply_to_message: { message_id: 40, from: { first_name: "Bona" }, text: "Предыдущее решение" },
  };

  const first = await archiveTelegramMessage({
    message,
    text: longText,
    tags: ["decision"],
    source: { chatTitle: "Atlas Team", authorName: "Digitex", messageUrl: "https://t.me/c/1234567890/41" },
  }, { rootDir });
  assert.equal(first.created, true);

  const duplicate = await archiveTelegramMessage({ message, text: longText }, { rootDir });
  assert.equal(duplicate.duplicate, true, "same Telegram event must not be duplicated");

  const edited = await archiveTelegramMessage({
    message: { ...message, edit_date: 1_784_600_100, text: `${longText} исправлено` },
    text: `${longText} исправлено`,
  }, { rootDir });
  assert.equal(edited.created, true, "edited message must be stored as a separate revision");

  const media = await archiveTelegramMessage({
    message: {
      message_id: 42,
      date: 1_784_600_200,
      chat: message.chat,
      from: message.from,
      photo: [{ file_id: "small", file_unique_id: "s", file_size: 10 }, { file_id: "large", file_unique_id: "l", file_size: 20 }],
    },
    text: "",
  }, { rootDir });
  assert.equal(media.record.message.attachments[0].fileId, "large");

  const positiveChat = await archiveTelegramMessage({
    message: { ...message, chat: { ...message.chat, id: 1001234567890, title: "Positive ID test" } },
    text: longText,
  }, { rootDir });
  assert.notEqual(first.filePath, positiveChat.filePath, "positive and negative chat ids must use different directories");

  const records = await readTelegramArchive({ rootDir });
  assert.equal(records.length, 4);
  const original = records.find((record) => record.revision === "original" && record.message.id === 41);
  assert.equal(original.message.text, longText, "archive must preserve full text");
  assert.ok(original.message.text.length > 520, "archive must not use the old 520-character preview limit");

  const prompt = buildArchiveMemoryPrompt(records.filter((record) => record.chat.id === String(message.chat.id)).slice(0, 2));
  assert.match(prompt, /Atlas Team/);
  assert.match(prompt, /Предыдущее решение/);
  assert.match(prompt, /https:\/\/t\.me\/c\/1234567890\/41/);
  assert.equal(redactSensitiveText("password=super-secret-value"), "password=[REDACTED]");
  assert.doesNotMatch(
    redactSensitiveText("OPENAI key sk-1234567890abcdefghijklmnop"),
    /sk-1234567890abcdefghijklmnop/,
  );

  const dryRun = await syncTelegramArchive({ rootDir, cursorFile, dryRun: true, batchSize: 2 });
  assert.equal(dryRun.synced, 4);
  await assert.rejects(() => readFile(cursorFile, "utf8"), { code: "ENOENT" });
  await assert.rejects(
    () => syncTelegramArchive({ rootDir, cursorFile, bridgeUrl: "http://127.0.0.1:1", bridgeToken: "test" }),
    /HERMES_LONG_TERM_MEMORY_READY/,
  );

  const exportFile = path.join(rootDir, "telegram-export.json");
  await writeFile(exportFile, JSON.stringify({
    name: "Old Atlas Chat",
    type: "private_group",
    id: 555,
    messages: [{
      id: 7,
      type: "message",
      date: "2025-01-02T10:00:00",
      date_unixtime: "1735812000",
      from: "Bona",
      from_id: "user42",
      text: ["Старое ", { type: "bold", text: "решение" }],
    }],
  }), "utf8");
  const imported = await importTelegramHistory(exportFile, { rootDir });
  assert.equal(imported.imported, 1);
  const afterImport = await readTelegramArchive({ rootDir });
  assert.ok(afterImport.some((record) => record.message.text === "Старое решение"));

  console.log(JSON.stringify({ ok: true, archived: records.length, imported: imported.imported, fullTextChars: longText.length, dryRunBatches: dryRun.batches }, null, 2));
} finally {
  await rm(rootDir, { recursive: true, force: true });
}
