import { createHash, randomUUID } from "node:crypto";

const CHANNELS = new Set(["in_app", "telegram", "email"]);

function bounded(value, fallback, min, max, field) {
  const number = value == null ? fallback : Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new TypeError(`${field} is invalid`);
  return number;
}

function retryDelayMs(attemptCount, baseDelayMs, maxDelayMs) {
  return Math.min(maxDelayMs, baseDelayMs * 2 ** Math.min(attemptCount, 10));
}

function providerRequestKey(item) {
  return createHash("sha256").update(`${item.idempotencyKey}:attempt:${item.attemptCount + 1}`).digest("hex");
}

export function createNotificationWorker(options = {}) {
  const repository = options.repository;
  if (!repository || typeof repository.leaseDue !== "function" || typeof repository.completeAttempt !== "function") throw new TypeError("notification repository is required");
  const adapters = options.adapters || {};
  for (const [channel, adapter] of Object.entries(adapters)) {
    if (!CHANNELS.has(channel) || typeof adapter?.send !== "function") throw new TypeError("notification adapter is invalid");
  }
  const resolveRecipient = options.resolveRecipient;
  if (typeof resolveRecipient !== "function") throw new TypeError("recipient resolver is required");
  const now = options.now || (() => Date.now());
  const uuid = options.randomUUID || randomUUID;
  const maxAttempts = bounded(options.maxAttempts, 5, 1, 10, "maxAttempts");
  const baseDelayMs = bounded(options.baseDelayMs, 30_000, 1_000, 60 * 60 * 1000, "baseDelayMs");
  const maxDelayMs = bounded(options.maxDelayMs, 30 * 60 * 1000, baseDelayMs, 24 * 60 * 60 * 1000, "maxDelayMs");

  return Object.freeze({
    async runOnce({ limit = 20 } = {}) {
      const leaseToken = uuid();
      const started = now();
      const items = await repository.leaseDue({ leaseToken, now: new Date(started).toISOString(), limit, leaseSeconds: 60 });
      const results = [];
      for (const item of items) {
        const attemptStarted = now();
        const requestKey = providerRequestKey(item);
        const auditEventId = uuid();
        const adapter = adapters[item.channel];
        if (!adapter) {
          await repository.completeAttempt({ notificationId: item.id, leaseToken, providerRequestKey: requestKey, result: "skipped", errorCode: "channel_adapter_missing", startedAt: new Date(attemptStarted).toISOString(), completedAt: new Date(now()).toISOString(), auditEventId });
          results.push({ id: item.id, status: "blocked" });
          continue;
        }
        let response;
        try {
          const recipient = await resolveRecipient(item.recipientRef, item.channel);
          response = await adapter.send({ recipient, payload: item.payload, idempotencyKey: item.idempotencyKey, providerRequestKey: requestKey });
        } catch (error) {
          const attemptsExhausted = item.attemptCount + 1 >= maxAttempts;
          const retryable = error?.retryable === true && !attemptsExhausted;
          const completedAt = now();
          const retryAt = retryable ? new Date(completedAt + retryDelayMs(item.attemptCount, baseDelayMs, maxDelayMs)).toISOString() : null;
          await repository.completeAttempt({ notificationId: item.id, leaseToken, providerRequestKey: requestKey, result: retryable ? "transient_failure" : "permanent_failure", providerStatus: error?.status ?? null, errorCode: String(error?.code || (attemptsExhausted ? "attempts_exhausted" : "delivery_failed")).slice(0, 120), startedAt: new Date(attemptStarted).toISOString(), completedAt: new Date(completedAt).toISOString(), retryAt, auditEventId });
          results.push({ id: item.id, status: retryable ? "retry" : "failed" });
          continue;
        }
        await repository.completeAttempt({ notificationId: item.id, leaseToken, providerRequestKey: requestKey, result: "delivered", providerStatus: response?.status ?? null, providerMessageId: response?.messageId ?? null, responseSha256: response?.responseSha256 ?? null, startedAt: new Date(attemptStarted).toISOString(), completedAt: new Date(now()).toISOString(), auditEventId });
        results.push({ id: item.id, status: "delivered" });
      }
      return Object.freeze({ leaseToken, leased: items.length, results: Object.freeze(results) });
    },
  });
}
