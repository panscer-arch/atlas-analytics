import assert from "node:assert/strict";

import {
  formatSupportTicketNotification,
  parseSupportTicketWebhook,
  signChatwootWebhook,
  verifyChatwootWebhook,
} from "../server/support-ticket-webhook-core.mjs";

const nowSeconds = 1_754_000_000;
const secret = "test-chatwoot-secret-with-32-chars";
const payload = {
  event: "conversation_created",
  id: 42,
  inbox: { id: 4 },
  additional_attributes: {
    atlas_ticket_reference: "ATLAS-12AB34CD",
    atlas_ticket_source: "cabinet",
    atlas_ticket_category: "technical",
    atlas_ticket_subject: "Не открывается раздел Smart Cycle",
    atlas_reply_locale: "ru",
  },
};
const rawBody = Buffer.from(JSON.stringify(payload));
const timestamp = String(nowSeconds);
const signature = signChatwootWebhook(rawBody, timestamp, secret);

assert.equal(
  verifyChatwootWebhook(
    rawBody,
    { timestamp, signature },
    secret,
    { nowSeconds },
  ),
  true,
);
assert.equal(
  verifyChatwootWebhook(
    Buffer.from(`${rawBody.toString("utf8")} `),
    { timestamp, signature },
    secret,
    { nowSeconds },
  ),
  false,
);

const ticket = parseSupportTicketWebhook(rawBody);
assert.deepEqual(ticket, {
  reference: "ATLAS-12AB34CD",
  source: "cabinet",
  category: "technical",
  subject: "Не открывается раздел Smart Cycle",
  locale: "ru",
  conversationId: 42,
  inboxId: 4,
});
assert.match(formatSupportTicketNotification(ticket), /НОВЫЙ ТИКЕТ ATLAS/);
assert.match(formatSupportTicketNotification(ticket), /Личный кабинет/);
assert.equal(
  parseSupportTicketWebhook(
    JSON.stringify({ ...payload, event: "message_created" }),
  ),
  undefined,
);
assert.equal(
  parseSupportTicketWebhook(
    JSON.stringify({
      ...payload,
      additional_attributes: {
        atlas_locale: "ru",
      },
    }),
  ),
  undefined,
);

console.log("support ticket Telegram webhook: ok");
