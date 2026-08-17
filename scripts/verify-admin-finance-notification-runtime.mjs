import assert from "node:assert/strict";
import { createNotificationOutboxRepository } from "../server/admin-finance/notification-outbox-repository.mjs";
import { createNotificationWorker } from "../server/admin-finance/notification-worker.mjs";

const leaseToken = "93000000-0000-4000-8000-000000000001";
const auditEventId = "94000000-0000-4000-8000-000000000001";
const notificationId = "92000000-0000-4000-8000-000000000001";
let captured;
const repository = createNotificationOutboxRepository({
  query: async (text, values) => {
    captured = { text, values };
    if (text.includes("lease_due_notifications")) {
      return { rows: [{
        notification_id: notificationId,
        alert_id: "91000000-0000-4000-8000-000000000001",
        channel: "IN_APP",
        checkpoint: "D_7",
        recipient_ref: "role:finance",
        payload: { minimumTopUpRaw: "4641000000" },
        idempotency_key: "ab".repeat(32),
        attempt_count: 0,
        lease_token: leaseToken,
        lease_expires_at: new Date("2026-08-15T08:01:00Z"),
      }] };
    }
    return { rows: [{ status: "DELIVERED" }] };
  },
});

const leased = await repository.leaseDue({ leaseToken, now: "2026-08-15T08:00:00Z", limit: 10, leaseSeconds: 60 });
assert.equal(leased.length, 1);
assert.equal(leased[0].channel, "in_app");
assert(captured.text.includes("lease_due_notifications"));
assert(!captured.text.includes(leaseToken), "Lease SQL must remain parameterized");
assert.deepEqual(captured.values, [leaseToken, "2026-08-15T08:00:00.000Z", 10, 60]);

assert.equal(await repository.completeAttempt({
  notificationId,
  leaseToken,
  providerRequestKey: "provider-request-1",
  result: "delivered",
  providerStatus: 200,
  providerMessageId: "message-1",
  responseSha256: "cd".repeat(32),
  startedAt: "2026-08-15T08:00:01Z",
  completedAt: "2026-08-15T08:00:02Z",
  retryAt: null,
  auditEventId,
}), "delivered");
assert(captured.text.includes("complete_notification_attempt"));
assert(!captured.text.includes("provider-request-1"), "Completion SQL must remain parameterized");

await assert.rejects(
  createNotificationOutboxRepository({ query: async () => { throw new Error("notification_lease_lost"); } }).completeAttempt({
    notificationId, leaseToken, providerRequestKey: "provider-request-2", result: "delivered",
    startedAt: "2026-08-15T08:00:01Z", completedAt: "2026-08-15T08:00:02Z", auditEventId,
  }),
  (error) => error.code === "notification_lease_lost" && !error.retryable,
);

const baseItem = {
  alertId: "91000000-0000-4000-8000-000000000001",
  checkpoint: "d_7",
  recipientRef: "secret-ref:destination",
  payload: { title: "Reserve warning" },
  attemptCount: 0,
  idempotencyKey: "ef".repeat(32),
};
const workerItems = [
  { ...baseItem, id: "92000000-0000-4000-8000-000000000011", channel: "in_app" },
  { ...baseItem, id: "92000000-0000-4000-8000-000000000012", channel: "telegram", idempotencyKey: "12".repeat(32) },
  { ...baseItem, id: "92000000-0000-4000-8000-000000000013", channel: "email", idempotencyKey: "34".repeat(32) },
];
const completions = [];
const fakeRepository = {
  leaseDue: async () => workerItems,
  completeAttempt: async (input) => { completions.push(input); return input.result; },
};
let nowValue = Date.parse("2026-08-15T08:00:00Z");
let uuidCounter = 20;
const worker = createNotificationWorker({
  repository: fakeRepository,
  adapters: {
    in_app: { send: async () => ({ status: 200, messageId: "in-app-1" }) },
    telegram: { send: async () => { const error = new Error("temporary"); error.retryable = true; error.code = "telegram_timeout"; throw error; } },
    email: { send: async () => { const error = new Error("denied"); error.retryable = false; error.code = "email_recipient_denied"; throw error; } },
  },
  resolveRecipient: async (ref) => `resolved:${ref}`,
  now: () => { nowValue += 1_000; return nowValue; },
  randomUUID: () => `95000000-0000-4000-8000-${String(++uuidCounter).padStart(12, "0")}`,
  baseDelayMs: 30_000,
  maxDelayMs: 300_000,
  maxAttempts: 5,
});

const run = await worker.runOnce();
assert.equal(run.leased, 3);
assert.deepEqual(run.results.map((item) => item.status), ["delivered", "retry", "failed"]);
assert.equal(completions[0].result, "delivered");
assert.equal(completions[1].result, "transient_failure");
assert.equal(Date.parse(completions[1].retryAt) - Date.parse(completions[1].completedAt), 30_000);
assert.equal(completions[2].result, "permanent_failure");
assert(completions.every((item) => /^[0-9a-f]{64}$/.test(item.providerRequestKey)));
assert(!JSON.stringify(completions).includes("resolved:secret-ref"), "Resolved destinations must not enter the journal");

let completionCalls = 0;
const ambiguousWorker = createNotificationWorker({
  repository: {
    leaseDue: async () => [workerItems[0]],
    completeAttempt: async () => { completionCalls += 1; throw new Error("database unavailable"); },
  },
  adapters: { in_app: { send: async () => ({ status: 200, messageId: "accepted-before-db-error" }) } },
  resolveRecipient: async () => "resolved-destination",
  now: () => Date.parse("2026-08-15T09:00:00Z"),
  randomUUID: () => "96000000-0000-4000-8000-000000000001",
});
await assert.rejects(ambiguousWorker.runOnce(), /database unavailable/);
assert.equal(completionCalls, 1, "A journal failure after provider acceptance must not be reclassified as a second delivery result");

console.log("Admin Finance notification runtime: OK");
