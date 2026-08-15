import assert from "node:assert/strict";
import {
  buildReserveNotificationCommands,
  deduplicateReserveNotificationCommands,
  reserveNotificationIdempotencyKey,
} from "../server/admin-finance/reserve-alert-outbox.mjs";

const input = {
  forecastSnapshotId: "90000000-0000-4000-8000-000000000001",
  alertId: "91000000-0000-4000-8000-000000000001",
  minimumTopUpRaw: "4641000000",
  generatedAt: "2026-08-15T08:00:00Z",
  checkpoints: [
    { id: "d-7", scheduledFor: "2026-09-07T00:00:00Z" },
    { id: "d-3", scheduledFor: "2026-09-11T00:00:00Z" },
    { id: "d-1", scheduledFor: "2026-09-13T00:00:00Z" },
    { id: "breach", scheduledFor: "2026-09-14T00:00:00Z" },
  ],
  channels: [
    { channel: "in_app", recipientRef: "role:finance", connected: true },
    { channel: "telegram", recipientRef: "secret:finance-telegram", connected: false },
    { channel: "email", recipientRef: "group:finance", connected: false },
  ],
};

const commands = buildReserveNotificationCommands(input);
assert.equal(commands.length, 12);
assert.equal(commands.filter((item) => item.status === "scheduled").length, 4);
assert.equal(commands.filter((item) => item.status === "blocked_not_connected").length, 8);
assert(commands.every((item) => /^[0-9a-f]{64}$/.test(item.idempotencyKey)));
assert.equal(new Set(commands.map((item) => item.idempotencyKey)).size, commands.length);

const repeated = buildReserveNotificationCommands(input);
assert.deepEqual(repeated, commands, "same snapshot/checkpoint/channel must produce the same commands");
assert.equal(deduplicateReserveNotificationCommands([...commands, ...repeated]).length, commands.length);

const originalKey = reserveNotificationIdempotencyKey({
  forecastSnapshotId: input.forecastSnapshotId,
  alertId: input.alertId,
  checkpoint: "d-7",
  channel: "in_app",
});
const channelKey = reserveNotificationIdempotencyKey({
  forecastSnapshotId: input.forecastSnapshotId,
  alertId: input.alertId,
  checkpoint: "d-7",
  channel: "email",
});
assert.notEqual(originalKey, channelKey);
assert.throws(() => buildReserveNotificationCommands({ ...input, minimumTopUpRaw: "4.641" }), /unsigned atomic/);
assert.throws(() => buildReserveNotificationCommands({ ...input, channels: [] }), /at least one channel/);

console.log("Admin Finance reserve notification outbox: OK");
