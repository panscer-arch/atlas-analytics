import { createHash } from "node:crypto";

const CHANNELS = new Set(["in_app", "telegram", "email"]);
const CHECKPOINTS = new Set(["d-7", "d-3", "d-1", "breach"]);
const ATOMIC_PATTERN = /^[0-9]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredString(value, field, maxLength = 200) {
  if (typeof value !== "string" || !value || value.length > maxLength) throw new TypeError(`${field} is invalid`);
  return value;
}

function isoInstant(value, field) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${field} must be an ISO instant`);
  return new Date(parsed).toISOString();
}

export function reserveNotificationIdempotencyKey({ forecastSnapshotId, alertId, checkpoint, channel }) {
  if (!UUID_PATTERN.test(forecastSnapshotId)) throw new TypeError("forecastSnapshotId must be a UUID");
  if (!UUID_PATTERN.test(alertId)) throw new TypeError("alertId must be a UUID");
  if (!CHECKPOINTS.has(checkpoint)) throw new TypeError("checkpoint is invalid");
  if (!CHANNELS.has(channel)) throw new TypeError("channel is invalid");
  return createHash("sha256")
    .update(`reserve-funding-alert:v1:${forecastSnapshotId}:${alertId}:${checkpoint}:${channel}`)
    .digest("hex");
}

export function buildReserveNotificationCommands(input) {
  const forecastSnapshotId = requiredString(input.forecastSnapshotId, "forecastSnapshotId", 36);
  const alertId = requiredString(input.alertId, "alertId", 36);
  const generatedAt = isoInstant(input.generatedAt, "generatedAt");
  if (!ATOMIC_PATTERN.test(String(input.minimumTopUpRaw))) throw new TypeError("minimumTopUpRaw must be unsigned atomic units");
  if (!Array.isArray(input.checkpoints) || input.checkpoints.length !== 4) throw new TypeError("exactly four checkpoints are required");
  if (!Array.isArray(input.channels) || input.channels.length === 0) throw new TypeError("at least one channel is required");

  const commands = [];
  for (const checkpoint of input.checkpoints) {
    if (!CHECKPOINTS.has(checkpoint.id)) throw new TypeError("checkpoint.id is invalid");
    const scheduledFor = isoInstant(checkpoint.scheduledFor, "checkpoint.scheduledFor");
    for (const channelConfig of input.channels) {
      if (!CHANNELS.has(channelConfig.channel)) throw new TypeError("channel is invalid");
      const channel = channelConfig.channel;
      commands.push(Object.freeze({
        alertId,
        forecastSnapshotId,
        checkpoint: checkpoint.id,
        channel,
        recipientRef: requiredString(channelConfig.recipientRef, "recipientRef"),
        templateKey: "reserve-funding-alert",
        templateVersion: "v1",
        minimumTopUpRaw: String(input.minimumTopUpRaw),
        scheduledFor,
        generatedAt,
        status: channelConfig.connected ? "scheduled" : "blocked_not_connected",
        idempotencyKey: reserveNotificationIdempotencyKey({ forecastSnapshotId, alertId, checkpoint: checkpoint.id, channel }),
      }));
    }
  }
  return Object.freeze(commands);
}

export function deduplicateReserveNotificationCommands(commands) {
  const unique = new Map();
  for (const command of commands) {
    if (!unique.has(command.idempotencyKey)) unique.set(command.idempotencyKey, command);
  }
  return [...unique.values()];
}
