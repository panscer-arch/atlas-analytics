import http from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { addTelegramTask, appendTelegramOperation, collectTasks, CONTENT_KEYS, readContent, writeContent } from "./telegram-task-store.mjs";

const PORT = Number(process.env.ATLAS_CONTENT_API_PORT || 8787);
const STORE_DIR = process.env.ATLAS_CONTENT_STORE_DIR || "/var/lib/atlas-analytics-content";
const BACKUP_DIR = path.join(STORE_DIR, "_backups");
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const TELEGRAM_ENV_FILE = process.env.ATLAS_TELEGRAM_ENV_FILE || "/etc/atlas-telegram-bot.env";
const OUTREACH_LOG_KEY = "atlas.analytics.hyipOutreach.emailLog.v1";

let telegramEnvCache = null;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function getContentKey(url) {
  const match = url.pathname.match(/^\/api\/content\/([a-zA-Z0-9._-]+)$/);
  return match?.[1] || "";
}

async function readTelegramEnv() {
  if (telegramEnvCache) return telegramEnvCache;

  const env = {};
  try {
    const raw = await readFile(TELEGRAM_ENV_FILE, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) return;
      env[match[1]] = match[2].replace(/^['"]|['"]$/g, "").trim();
    });
  } catch {
    // Content API can still work without Telegram push configuration.
  }

  telegramEnvCache = env;
  return env;
}

async function getTelegramConfig() {
  const fileEnv = await readTelegramEnv();
  const token = process.env.TELEGRAM_BOT_TOKEN || fileEnv.TELEGRAM_BOT_TOKEN || "";
  const targetChatIds = (process.env.TELEGRAM_PUSH_CHAT_ID
    || fileEnv.TELEGRAM_PUSH_CHAT_ID
    || process.env.TELEGRAM_PUSH_CHAT_IDS
    || fileEnv.TELEGRAM_PUSH_CHAT_IDS
    || process.env.TELEGRAM_ALLOWED_CHAT_IDS
    || fileEnv.TELEGRAM_ALLOWED_CHAT_IDS
    || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return { token, targetChatIds };
}

function normalizeTelegramValue(value = "") {
  return String(value || "").trim();
}

function escapeTelegramHtml(value = "") {
  return normalizeTelegramValue(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTelegramSubtaskPush({ task = {}, subtask = {} }) {
  const responsible = escapeTelegramHtml(subtask.responsible || subtask.assignee || "Не назначен");
  const taskTitle = escapeTelegramHtml(task.title || "Без названия");
  const subtaskTitle = escapeTelegramHtml(subtask.title || "Без названия");
  const status = escapeTelegramHtml(subtask.status || "В работе");
  const priority = escapeTelegramHtml(subtask.priority || "Средний");
  const deadline = escapeTelegramHtml(subtask.deadline || "");
  const lines = [
    "🟠 <b>ATLAS TASK PUSH</b>",
    "━━━━━━━━━━━━━━━━",
    "",
    `👤 <b>${responsible}</b>`,
    "",
    `📌 <b>Задача</b>\n${taskTitle}`,
    "",
    `🎯 <b>Подзадача</b>\n${subtaskTitle}`,
    "",
    `📍 <b>Статус:</b> ${status}`,
    `⚡ <b>Приоритет:</b> ${priority}`,
  ];

  if (deadline) lines.push(`⏰ <b>Дедлайн:</b> ${deadline}`);

  lines.push("", "💬 <i>Проверьте задачу и отпишитесь по статусу.</i>");
  return lines.join("\n");
}

function normalizeEmailValue(value = "") {
  return String(value || "").trim();
}

function isProbablyEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmailValue(value));
}

function sanitizeEmailText(value = "", maxLength = 6000) {
  return normalizeEmailValue(value).slice(0, maxLength);
}

async function appendOutreachEmailLog(entry) {
  const log = await readContent(OUTREACH_LOG_KEY, []);
  const nextLog = Array.isArray(log) ? log : [];
  await writeContent(OUTREACH_LOG_KEY, [{ ...entry, createdAt: new Date().toISOString() }, ...nextLog].slice(0, 500));
}

async function sendOutreachEmail({ lead = {}, to = "", subject = "", body = "" }) {
  const apiKey = normalizeEmailValue(process.env.RESEND_API_KEY || "");
  const from = normalizeEmailValue(process.env.OUTREACH_FROM_EMAIL || "");
  const replyTo = normalizeEmailValue(process.env.OUTREACH_REPLY_TO_EMAIL || from);
  const recipient = normalizeEmailValue(to);

  if (!apiKey || !from || !replyTo) {
    return { ok: false, status: 503, error: "outreach_email_not_configured" };
  }
  if (!isProbablyEmail(recipient)) {
    return { ok: false, status: 400, error: "invalid_recipient_email" };
  }

  const cleanSubject = sanitizeEmailText(subject || `Advertising options request - ${lead.name || "Superflow Systems"}`, 220);
  const cleanBody = sanitizeEmailText(body, 8000);
  if (!cleanBody) {
    return { ok: false, status: 400, error: "empty_email_body" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      reply_to: replyTo,
      subject: cleanSubject,
      text: cleanBody,
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    await appendOutreachEmailLog({
      ok: false,
      leadId: lead.id || "",
      leadName: lead.name || "",
      to: recipient,
      subject: cleanSubject,
      error: payload?.message || payload?.error || "resend_send_failed",
    });
    return { ok: false, status: response.status || 502, error: payload?.message || payload?.error || "resend_send_failed" };
  }

  await appendOutreachEmailLog({
    ok: true,
    leadId: lead.id || "",
    leadName: lead.name || "",
    to: recipient,
    subject: cleanSubject,
    resendId: payload?.id || "",
  });

  return { ok: true, status: 200, resendId: payload?.id || "" };
}

async function sendTelegramMessage(text, options = {}, requestedChatId = "") {
  const { token, targetChatIds } = await getTelegramConfig();
  if (!token) return { ok: false, status: 503, error: "telegram_token_not_configured" };
  if (!targetChatIds.length) return { ok: false, status: 503, error: "telegram_push_chat_not_configured" };
  if (requestedChatId && !targetChatIds.includes(requestedChatId)) {
    return { ok: false, status: 403, error: "telegram_push_chat_not_allowed", chatId: requestedChatId };
  }
  if (!requestedChatId && targetChatIds.length > 1) {
    return { ok: false, status: 400, error: "telegram_push_chat_required" };
  }

  const chatIdsToSend = requestedChatId ? [requestedChatId] : targetChatIds;
  const sent = [];
  for (const chatId of chatIdsToSend) {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...options,
        disable_web_page_preview: true,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      return { ok: false, status: response.status || 502, error: payload?.description || "telegram_send_failed", chatId };
    }
    sent.push({ chatId, messageId: payload?.result?.message_id });
  }

  return { ok: true, status: 200, sent };
}

async function readBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("request_body_too_large");
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function filePathForKey(key) {
  return path.join(STORE_DIR, `${key}.json`);
}

async function backupExistingContent(key, targetPath) {
  try {
    const raw = await readFile(targetPath, "utf8");
    const keyBackupDir = path.join(BACKUP_DIR, key);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    await mkdir(keyBackupDir, { recursive: true });
    await writeFile(path.join(keyBackupDir, `${timestamp}.json`), raw, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

await mkdir(STORE_DIR, { recursive: true });

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/api/content/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/telegram/tasks" && request.method === "GET") {
      const category = url.searchParams.get("category") || "";
      const assignee = url.searchParams.get("assignee") || "";
      const tasks = await collectTasks({ category, assignee, onlyActive: url.searchParams.get("all") !== "1" });
      sendJson(response, 200, { ok: true, tasks });
      return;
    }

    if (url.pathname === "/api/telegram/tasks" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const result = await addTelegramTask(parsed);
      sendJson(response, 201, { ok: true, ...result });
      return;
    }

    if (url.pathname === "/api/telegram/ops" && request.method === "GET") {
      const ops = await readContent(CONTENT_KEYS.telegramOps, { decisions: [], questions: [], reports: [], reminders: [] });
      sendJson(response, 200, { ok: true, value: ops });
      return;
    }

    if (url.pathname === "/api/telegram/ops" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const type = parsed.type || "";
      if (!["decisions", "questions", "reports", "reminders"].includes(type)) {
        sendJson(response, 400, { ok: false, error: "invalid_operation_type" });
        return;
      }
      const entry = await appendTelegramOperation(type, parsed.payload || parsed);
      sendJson(response, 201, { ok: true, entry });
      return;
    }

    if (url.pathname === "/api/telegram/push-subtask" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const text = formatTelegramSubtaskPush(parsed);
      const result = await sendTelegramMessage(text, { parse_mode: "HTML" }, String(parsed.chatId || "").trim());
      sendJson(response, result.ok ? 200 : result.status, result.ok ? { ok: true, ...result } : { ok: false, error: result.error });
      return;
    }

    if (url.pathname === "/api/outreach/send-email" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const result = await sendOutreachEmail(parsed);
      sendJson(response, result.ok ? 200 : result.status, result.ok ? { ok: true, ...result } : { ok: false, error: result.error });
      return;
    }

    const key = getContentKey(url);
    if (!key) {
      sendJson(response, 404, { ok: false, error: "not_found" });
      return;
    }

    if (request.method === "GET") {
      try {
        const raw = await readFile(filePathForKey(key), "utf8");
        sendJson(response, 200, { ok: true, exists: true, value: JSON.parse(raw) });
      } catch (error) {
        if (error?.code === "ENOENT") {
          sendJson(response, 200, { ok: true, exists: false, value: null });
          return;
        }
        throw error;
      }
      return;
    }

    if (request.method === "PUT") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const value = Object.prototype.hasOwnProperty.call(parsed, "value") ? parsed.value : parsed;
      const targetPath = filePathForKey(key);
      const tempPath = `${targetPath}.${Date.now()}.tmp`;

      await backupExistingContent(key, targetPath);
      await writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
      await rename(tempPath, targetPath);
      sendJson(response, 200, { ok: true, exists: true });
      return;
    }

    sendJson(response, 405, { ok: false, error: "method_not_allowed" });
  } catch (error) {
    const statusCode = error?.message === "request_body_too_large" ? 413 : 500;
    sendJson(response, statusCode, { ok: false, error: error?.message || "server_error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Atlas content API listening on 127.0.0.1:${PORT}`);
});
