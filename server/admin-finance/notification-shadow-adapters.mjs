import { createHash } from "node:crypto";

const CHANNELS = new Set(["in_app", "telegram", "email"]);

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function createShadowNotificationAdapter({ channel, record = () => {} } = {}) {
  if (!CHANNELS.has(channel)) throw new TypeError("shadow channel is invalid");
  if (typeof record !== "function") throw new TypeError("shadow recorder is invalid");
  return Object.freeze({
    async send({ recipient, payload, idempotencyKey, providerRequestKey }) {
      if (typeof recipient !== "string" || !recipient) throw new TypeError("shadow recipient is invalid");
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("shadow payload is invalid");
      if (!/^[0-9a-f]{64}$/.test(String(idempotencyKey || ""))) throw new TypeError("shadow idempotency key is invalid");
      if (!/^[0-9a-f]{64}$/.test(String(providerRequestKey || ""))) throw new TypeError("shadow provider request key is invalid");
      const payloadHash = hash(JSON.stringify(payload));
      const recipientHash = hash(recipient);
      const messageId = `shadow-${channel}-${providerRequestKey.slice(0, 16)}`;
      await record(Object.freeze({ channel, recipientHash, payloadHash, providerRequestKey, messageId }));
      return Object.freeze({ status: 202, messageId, responseSha256: hash(`${messageId}:${payloadHash}`) });
    },
  });
}

export function createShadowNotificationAdapters(options = {}) {
  return Object.freeze(Object.fromEntries(
    [...CHANNELS].map((channel) => [channel, createShadowNotificationAdapter({ channel, record: options.record })]),
  ));
}
