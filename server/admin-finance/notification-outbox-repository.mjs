const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESULT_MAP = Object.freeze({
  delivered: "DELIVERED",
  transient_failure: "TRANSIENT_FAILURE",
  permanent_failure: "PERMANENT_FAILURE",
  skipped: "SKIPPED",
});

const LEASE_SQL = `
SELECT * FROM admin_finance.lease_due_notifications(
  $1::uuid, $2::timestamptz, $3::integer, $4::integer
)
`;

const COMPLETE_SQL = `
SELECT admin_finance.complete_notification_attempt(
  $1::uuid, $2::uuid, $3::text, $4::text,
  $5::integer, $6::text, $7::text,
  CASE WHEN $8::text IS NULL THEN NULL ELSE decode($8::text, 'hex')::admin_finance.hash32 END,
  $9::timestamptz, $10::timestamptz, $11::timestamptz, $12::uuid
) AS status
`;

export class NotificationOutboxError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.code = code;
    this.retryable = Boolean(options.retryable);
  }
}

function fail(code, message) {
  throw new NotificationOutboxError(code, message);
}

function uuid(value, field) {
  if (!UUID_PATTERN.test(String(value || ""))) fail("invalid_notification_argument", `${field} must be a UUID`);
  return String(value).toLowerCase();
}

function iso(value, field, nullable = false) {
  if (nullable && value == null) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail("invalid_notification_argument", `${field} must be an ISO instant`);
  return new Date(parsed).toISOString();
}

function boundedInteger(value, min, max, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) fail("invalid_notification_argument", `${field} is invalid`);
  return number;
}

function normalizeRow(row) {
  return Object.freeze({
    id: row.notification_id,
    alertId: row.alert_id,
    channel: String(row.channel).toLowerCase(),
    checkpoint: String(row.checkpoint).toLowerCase(),
    recipientRef: row.recipient_ref,
    payload: row.payload,
    idempotencyKey: row.idempotency_key,
    attemptCount: Number(row.attempt_count),
    leaseToken: row.lease_token,
    leaseExpiresAt: row.lease_expires_at instanceof Date ? row.lease_expires_at.toISOString() : String(row.lease_expires_at),
  });
}

export function createNotificationOutboxRepository({ query } = {}) {
  if (typeof query !== "function") fail("invalid_notification_store", "PostgreSQL query function is required");
  return Object.freeze({
    async leaseDue({ leaseToken, now, limit = 20, leaseSeconds = 60 }) {
      const values = [
        uuid(leaseToken, "leaseToken"),
        iso(now, "now"),
        boundedInteger(limit, 1, 100, "limit"),
        boundedInteger(leaseSeconds, 15, 300, "leaseSeconds"),
      ];
      try {
        const response = await query(LEASE_SQL, values);
        return Object.freeze((response?.rows || []).map(normalizeRow));
      } catch {
        throw new NotificationOutboxError("notification_lease_failed", "Notification lease failed", { retryable: true });
      }
    },

    async completeAttempt(input) {
      const result = RESULT_MAP[input.result];
      if (!result) fail("invalid_notification_argument", "result is invalid");
      const responseHash = input.responseSha256 == null ? null : String(input.responseSha256).toLowerCase();
      if (responseHash !== null && !/^[0-9a-f]{64}$/.test(responseHash)) fail("invalid_notification_argument", "responseSha256 is invalid");
      const values = [
        uuid(input.notificationId, "notificationId"),
        uuid(input.leaseToken, "leaseToken"),
        String(input.providerRequestKey || ""),
        result,
        input.providerStatus == null ? null : boundedInteger(input.providerStatus, 100, 599, "providerStatus"),
        input.providerMessageId == null ? null : String(input.providerMessageId),
        input.errorCode == null ? null : String(input.errorCode),
        responseHash,
        iso(input.startedAt, "startedAt"),
        iso(input.completedAt, "completedAt"),
        iso(input.retryAt, "retryAt", true),
        uuid(input.auditEventId, "auditEventId"),
      ];
      if (!values[2] || values[2].length > 200) fail("invalid_notification_argument", "providerRequestKey is invalid");
      try {
        const response = await query(COMPLETE_SQL, values);
        const status = response?.rows?.[0]?.status;
        if (!new Set(["DELIVERED", "RETRY", "FAILED", "BLOCKED"]).has(status)) throw new Error("unexpected status");
        return String(status).toLowerCase();
      } catch (error) {
        if (String(error?.message || "").includes("notification_lease_lost")) {
          throw new NotificationOutboxError("notification_lease_lost", "Notification lease was lost");
        }
        throw new NotificationOutboxError("notification_completion_failed", "Notification completion failed", { retryable: true });
      }
    },
  });
}
