import assert from "node:assert/strict";
import { createShadowNotificationAdapter } from "../server/admin-finance/notification-shadow-adapters.mjs";
import { createNotificationRuntimeFromEnvironment } from "../server/admin-finance/notification-runtime.mjs";
import { createNotificationScheduler } from "../server/admin-finance/notification-scheduler.mjs";

const events = [];
const adapter = createShadowNotificationAdapter({ channel: "telegram", record: async (event) => events.push(event) });
const response = await adapter.send({
  recipient: "private-recipient-value",
  payload: { title: "Reserve warning", minimumTopUpRaw: "4641000000" },
  idempotencyKey: "ab".repeat(32),
  providerRequestKey: "cd".repeat(32),
});
assert.equal(response.status, 202);
assert.equal(events.length, 1);
assert.equal(events[0].channel, "telegram");
assert.match(events[0].recipientHash, /^[0-9a-f]{64}$/);
assert.match(events[0].payloadHash, /^[0-9a-f]{64}$/);
assert(!JSON.stringify(events).includes("private-recipient-value"));
assert(!JSON.stringify(events).includes("Reserve warning"));

let intervalCallback;
let cleared = false;
let resolveRun;
const pendingRun = new Promise((resolve) => { resolveRun = resolve; });
let runCount = 0;
const scheduler = createNotificationScheduler({
  worker: { runOnce: async () => { runCount += 1; await pendingRun; return { leased: 0 }; } },
  intervalMs: 1_000,
  setIntervalImpl: (callback) => { intervalCallback = callback; return 77; },
  clearIntervalImpl: (timer) => { assert.equal(timer, 77); cleared = true; },
});
assert.equal(scheduler.start(), true);
assert.equal(scheduler.start(), false);
const firstTick = intervalCallback();
assert.deepEqual(await intervalCallback(), { skipped: "overlap" });
assert.equal(runCount, 1);
resolveRun();
assert.deepEqual(await firstTick, { leased: 0 });
assert.equal(scheduler.stop(), true);
assert.equal(cleared, true);
assert.equal(scheduler.stop(), false);

assert.equal(createNotificationRuntimeFromEnvironment({}), null);
assert.throws(
  () => createNotificationRuntimeFromEnvironment({
    ATLAS_ADMIN_FINANCE_NOTIFICATIONS_ENABLED: "true",
    ATLAS_ADMIN_FINANCE_NOTIFICATIONS_MODE: "live",
  }),
  /Only shadow notification mode is implemented/,
);

let poolClosed = false;
const pool = {
  query: async () => ({ rows: [] }),
  end: async () => { poolClosed = true; },
};
const runtime = createNotificationRuntimeFromEnvironment({
  ATLAS_ADMIN_FINANCE_NOTIFICATIONS_ENABLED: "true",
  ATLAS_ADMIN_FINANCE_NOTIFICATIONS_MODE: "shadow",
  ATLAS_ADMIN_FINANCE_NOTIFICATIONS_INTERVAL_MS: "15000",
}, {
  pool,
  now: () => Date.parse("2026-08-15T10:00:00Z"),
  randomUUID: () => "97000000-0000-4000-8000-000000000001",
  setIntervalImpl: () => 1,
  clearIntervalImpl: () => {},
});
assert.equal(runtime.mode, "shadow");
assert.deepEqual(await runtime.runOnce(), {
  leaseToken: "97000000-0000-4000-8000-000000000001",
  leased: 0,
  results: [],
});
await runtime.close();
assert.equal(poolClosed, true);

console.log("Admin Finance notification shadow runtime: OK");
