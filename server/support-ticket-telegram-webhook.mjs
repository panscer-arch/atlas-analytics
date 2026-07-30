import http from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  formatSupportTicketNotification,
  parseSupportTicketWebhook,
  verifyChatwootWebhook,
} from "./support-ticket-webhook-core.mjs";

const PORT = Number(process.env.ATLAS_SUPPORT_TICKET_WEBHOOK_PORT || 8798);
const CHATWOOT_SECRET = process.env.ATLAS_SUPPORT_CHATWOOT_WEBHOOK_SECRET || "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID =
  process.env.ATLAS_SUPPORT_TELEGRAM_CHAT_ID ||
  process.env.TELEGRAM_PUSH_CHAT_ID ||
  String(process.env.TELEGRAM_ALLOWED_CHAT_IDS || "").split(",")[0]?.trim() ||
  "";
const CHATWOOT_ADMIN_URL = (
  process.env.ATLAS_SUPPORT_CHATWOOT_ADMIN_URL ||
  "https://admin.atlas-system.space"
).replace(/\/+$/, "");
const CHATWOOT_ACCOUNT_ID = Number(
  process.env.ATLAS_SUPPORT_CHATWOOT_ACCOUNT_ID || 2,
);
const STATE_FILE =
  process.env.ATLAS_SUPPORT_TICKET_NOTIFICATION_STATE ||
  "/var/lib/atlas-analytics-content/support-ticket-notifications.json";
const MAX_BODY_BYTES = 256 * 1024;
const MAX_SENT_REFERENCES = 10_000;
const pendingReferences = new Set();

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

async function readRawBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("request_body_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readState() {
  try {
    const parsed = JSON.parse(await readFile(STATE_FILE, "utf8"));
    return Array.isArray(parsed.sentReferences)
      ? parsed.sentReferences.filter((value) => typeof value === "string")
      : [];
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function markSent(reference) {
  const sentReferences = await readState();
  if (!sentReferences.includes(reference)) sentReferences.push(reference);
  const retained = sentReferences.slice(-MAX_SENT_REFERENCES);
  await mkdir(path.dirname(STATE_FILE), { recursive: true });
  const temporary = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(
    temporary,
    JSON.stringify(
      { sentReferences: retained, updatedAt: new Date().toISOString() },
      null,
      2,
    ),
    { encoding: "utf8", mode: 0o600 },
  );
  await rename(temporary, STATE_FILE);
}

function conversationUrl(ticket) {
  return `${CHATWOOT_ADMIN_URL}/app/accounts/${CHATWOOT_ACCOUNT_ID}/inbox/${ticket.inboxId}/conversations/${ticket.conversationId}`;
}

async function sendTelegramNotification(ticket) {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: formatSupportTicketNotification(ticket),
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [{ text: "Открыть тикет в Chatwoot", url: conversationUrl(ticket) }],
          ],
        },
      }),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.description || `telegram_http_${response.status}`);
  }
}

function configurationReady() {
  return (
    CHATWOOT_SECRET.length >= 24 &&
    TELEGRAM_BOT_TOKEN.length >= 20 &&
    TELEGRAM_CHAT_ID.length > 0 &&
    Number.isSafeInteger(CHATWOOT_ACCOUNT_ID) &&
    CHATWOOT_ACCOUNT_ID > 0
  );
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(
      request.url || "/",
      `http://${request.headers.host || "localhost"}`,
    );

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, configurationReady() ? 200 : 503, {
        ok: configurationReady(),
      });
      return;
    }

    if (
      request.method !== "POST" ||
      url.pathname !== "/webhooks/chatwoot"
    ) {
      sendJson(response, 404, { ok: false, error: "not_found" });
      return;
    }
    if (!configurationReady()) {
      sendJson(response, 503, { ok: false, error: "not_configured" });
      return;
    }

    const rawBody = await readRawBody(request);
    const valid = verifyChatwootWebhook(
      rawBody,
      {
        timestamp: request.headers["x-chatwoot-timestamp"],
        signature: request.headers["x-chatwoot-signature"],
      },
      CHATWOOT_SECRET,
    );
    if (!valid) {
      sendJson(response, 401, { ok: false, error: "invalid_signature" });
      return;
    }

    const ticket = parseSupportTicketWebhook(rawBody);
    if (!ticket) {
      sendJson(response, 202, { ok: true, ignored: true });
      return;
    }

    const sentReferences = await readState();
    if (
      sentReferences.includes(ticket.reference) ||
      pendingReferences.has(ticket.reference)
    ) {
      sendJson(response, 200, { ok: true, duplicate: true });
      return;
    }

    pendingReferences.add(ticket.reference);
    try {
      await sendTelegramNotification(ticket);
      await markSent(ticket.reference);
    } finally {
      pendingReferences.delete(ticket.reference);
    }

    console.log(
      `[support-ticket-notifier] sent ${ticket.reference} source=${ticket.source} conversation=${ticket.conversationId}`,
    );
    sendJson(response, 200, { ok: true, notified: true });
  } catch (error) {
    const status = error?.message === "request_body_too_large" ? 413 : 502;
    console.error(
      `[support-ticket-notifier] delivery failed: ${error?.message || "unknown_error"}`,
    );
    sendJson(response, status, { ok: false, error: "delivery_failed" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[support-ticket-notifier] listening on 127.0.0.1:${PORT}`,
  );
});

