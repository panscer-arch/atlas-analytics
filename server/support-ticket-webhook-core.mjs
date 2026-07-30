import { createHmac, timingSafeEqual } from "node:crypto";

const TICKET_REFERENCE = /^ATLAS-[A-F0-9]{8}$/;
const SOURCES = new Set(["public", "cabinet"]);
const CATEGORIES = new Set([
  "account",
  "business",
  "claim",
  "other",
  "partnership",
  "smart_cycle",
  "technical",
  "transaction",
]);

const CATEGORY_LABELS = {
  account: "Аккаунт",
  business: "Общий вопрос",
  claim: "Получение помощи (Claim)",
  other: "Другое",
  partnership: "Партнёрская программа",
  smart_cycle: "Smart Cycle",
  technical: "Техническая ошибка",
  transaction: "Транзакция",
};

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : undefined;
}

function boundedString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function positiveInteger(value) {
  const parsed =
    typeof value === "string" && /^\d+$/.test(value)
      ? Number.parseInt(value, 10)
      : value;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function safeEqualHex(actual, expected) {
  if (!/^[a-fA-F0-9]{64}$/.test(actual)) return false;
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function signChatwootWebhook(rawBody, timestamp, secret) {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex");
  return `sha256=${signature}`;
}

export function verifyChatwootWebhook(
  rawBody,
  { timestamp, signature },
  secret,
  { nowSeconds = Math.floor(Date.now() / 1_000), toleranceSeconds = 300 } = {},
) {
  if (typeof secret !== "string" || secret.length < 24) return false;
  if (typeof timestamp !== "string" || !/^\d{10}$/.test(timestamp)) {
    return false;
  }
  if (Math.abs(nowSeconds - Number.parseInt(timestamp, 10)) > toleranceSeconds) {
    return false;
  }
  const match =
    typeof signature === "string"
      ? /^sha256=([a-fA-F0-9]{64})$/.exec(signature)
      : null;
  if (!match?.[1]) return false;
  const expected = signChatwootWebhook(rawBody, timestamp, secret).slice(
    "sha256=".length,
  );
  return safeEqualHex(match[1], expected);
}

export function parseSupportTicketWebhook(rawBody) {
  let parsed;
  try {
    parsed = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody);
  } catch {
    return undefined;
  }

  const payload = object(parsed);
  if (!payload || payload.event !== "conversation_created") return undefined;

  const conversation = object(payload.conversation) ?? payload;
  const attributes =
    object(conversation.additional_attributes) ??
    object(payload.additional_attributes);
  const inbox = object(conversation.inbox) ?? object(payload.inbox);
  const conversationId = positiveInteger(conversation.id ?? payload.id);
  const inboxId = positiveInteger(inbox?.id ?? conversation.inbox_id);
  const reference = boundedString(attributes?.atlas_ticket_reference, 40);
  const source = boundedString(attributes?.atlas_ticket_source, 20);
  const category = boundedString(attributes?.atlas_ticket_category, 40);
  const subject = boundedString(attributes?.atlas_ticket_subject, 120);
  const locale = boundedString(attributes?.atlas_reply_locale, 16) || "en";

  if (
    !conversationId ||
    !inboxId ||
    !TICKET_REFERENCE.test(reference) ||
    !SOURCES.has(source) ||
    !CATEGORIES.has(category) ||
    !subject
  ) {
    return undefined;
  }

  return {
    reference,
    source,
    category,
    subject,
    locale,
    conversationId,
    inboxId,
  };
}

export function escapeTelegramHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatSupportTicketNotification(ticket) {
  const source =
    ticket.source === "cabinet" ? "Личный кабинет" : "Публичный сайт";
  const category = CATEGORY_LABELS[ticket.category] ?? ticket.category;
  return [
    "🎫 <b>НОВЫЙ ТИКЕТ ATLAS</b>",
    "━━━━━━━━━━━━━━━━",
    "",
    `Номер: <code>${escapeTelegramHtml(ticket.reference)}</code>`,
    `Источник: <b>${escapeTelegramHtml(source)}</b>`,
    `Категория: ${escapeTelegramHtml(category)}`,
    `Язык: ${escapeTelegramHtml(ticket.locale.toUpperCase())}`,
    "",
    `<b>${escapeTelegramHtml(ticket.subject)}</b>`,
    "",
    "Тикет ожидает ответа в Chatwoot.",
  ].join("\n");
}

