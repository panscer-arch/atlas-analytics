import { createForecastPostgresPool } from "./forecast-checkpoint-repository.mjs";
import { createNotificationOutboxRepository } from "./notification-outbox-repository.mjs";
import { createShadowNotificationAdapters } from "./notification-shadow-adapters.mjs";
import { createNotificationScheduler } from "./notification-scheduler.mjs";
import { createNotificationWorker } from "./notification-worker.mjs";

function required(value, name) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

export function createShadowNotificationRuntime(options = {}) {
  const pool = options.pool || createForecastPostgresPool({
    connectionString: options.databaseUrl,
    sslCa: options.databaseCa,
    applicationName: options.databaseApplicationName || "atlas-admin-finance-notifications",
    maxConnections: options.databaseMaxConnections || 2,
  });
  if (!pool || typeof pool.query !== "function" || typeof pool.end !== "function") throw new TypeError("notification runtime requires a PostgreSQL pool");
  const repository = createNotificationOutboxRepository({ query: pool.query.bind(pool) });
  const adapters = createShadowNotificationAdapters({ record: options.recordShadowEvent });
  const worker = createNotificationWorker({
    repository,
    adapters,
    resolveRecipient: async (recipientRef) => `shadow-ref:${recipientRef}`,
    now: options.now,
    randomUUID: options.randomUUID,
    maxAttempts: options.maxAttempts,
    baseDelayMs: options.baseDelayMs,
    maxDelayMs: options.maxDelayMs,
  });
  const scheduler = createNotificationScheduler({
    worker,
    intervalMs: options.intervalMs,
    setIntervalImpl: options.setIntervalImpl,
    clearIntervalImpl: options.clearIntervalImpl,
    onError: options.onError,
  });
  return Object.freeze({
    mode: "shadow",
    runOnce: (runOptions) => worker.runOnce(runOptions),
    start: () => scheduler.start(),
    stop: () => scheduler.stop(),
    close: async () => { scheduler.stop(); await pool.end(); },
  });
}

export function createNotificationRuntimeFromEnvironment(env = process.env, dependencies = {}) {
  if (String(env.ATLAS_ADMIN_FINANCE_NOTIFICATIONS_ENABLED || "") !== "true") return null;
  const mode = required(env.ATLAS_ADMIN_FINANCE_NOTIFICATIONS_MODE, "ATLAS_ADMIN_FINANCE_NOTIFICATIONS_MODE");
  if (mode !== "shadow") throw new Error("Only shadow notification mode is implemented");
  return createShadowNotificationRuntime({
    pool: dependencies.pool,
    databaseUrl: dependencies.pool ? undefined : required(env.ATLAS_ADMIN_FINANCE_DATABASE_URL, "ATLAS_ADMIN_FINANCE_DATABASE_URL"),
    databaseCa: dependencies.pool ? undefined : required(env.ATLAS_ADMIN_FINANCE_DATABASE_CA, "ATLAS_ADMIN_FINANCE_DATABASE_CA"),
    intervalMs: Number(env.ATLAS_ADMIN_FINANCE_NOTIFICATIONS_INTERVAL_MS || 15_000),
    now: dependencies.now,
    randomUUID: dependencies.randomUUID,
    setIntervalImpl: dependencies.setIntervalImpl,
    clearIntervalImpl: dependencies.clearIntervalImpl,
    recordShadowEvent: dependencies.recordShadowEvent,
    onError: dependencies.onError,
  });
}
