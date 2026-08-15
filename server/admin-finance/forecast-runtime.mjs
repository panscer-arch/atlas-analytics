import { createForecastSourceAdapter } from "./forecast-source-adapter.mjs";
import {
  createForecastPostgresPool,
  createPostgresForecastCheckpointGuard,
} from "./forecast-checkpoint-repository.mjs";
import { createForecastEvidenceVerifier } from "./forecast-evidence-verifier.mjs";

function required(value, name) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

export function createForecastRuntime(options = {}) {
  const pool = options.pool || createForecastPostgresPool({
    connectionString: options.databaseUrl,
    sslCa: options.databaseCa,
    applicationName: options.databaseApplicationName,
    maxConnections: options.databaseMaxConnections,
    connectionTimeoutMs: options.databaseConnectionTimeoutMs,
    idleTimeoutMs: options.databaseIdleTimeoutMs,
    queryTimeoutMs: options.databaseQueryTimeoutMs,
    statementTimeoutMs: options.databaseStatementTimeoutMs,
  });
  if (!pool || typeof pool.query !== "function" || typeof pool.end !== "function") {
    throw new Error("Forecast runtime requires a PostgreSQL pool");
  }

  const checkpointGuard = createPostgresForecastCheckpointGuard({
    query: pool.query.bind(pool),
  });
  const evidenceVerifier = options.evidenceVerifier || createForecastEvidenceVerifier({
    rpcUrl: options.rpcUrl,
    allowedHosts: options.allowedRpcHosts,
    minConfirmations: options.minConfirmations,
    timeoutMs: options.rpcTimeoutMs,
    maxBytes: options.rpcMaxBytes,
    fetchImpl: options.rpcFetchImpl || options.fetchImpl,
  });
  const source = createForecastSourceAdapter({
    url: required(options.sourceUrl, "Forecast source URL"),
    allowedHosts: options.allowedHosts || ["data.atlas-system.io"],
    expectedPath: options.expectedPath,
    authorization: required(options.authorization, "Forecast source authorization"),
    expectedToken: options.expectedToken,
    expectedPayoutContract: required(options.expectedPayoutContract, "Expected payout contract"),
    minConfirmations: options.minConfirmations,
    timeoutMs: options.timeoutMs,
    maxBytes: options.maxBytes,
    maxAgeMs: options.maxAgeMs,
    cacheMs: options.cacheMs,
    fetchImpl: options.fetchImpl,
    now: options.now,
    checkpointGuard,
    evidenceVerifier,
  });

  return Object.freeze({
    getProjection: (requestOptions) => source.getProjection(requestOptions),
    close: () => pool.end(),
  });
}

export function createForecastRuntimeFromEnvironment(env = process.env, dependencies = {}) {
  if (String(env.ATLAS_ADMIN_FINANCE_FORECAST_ENABLED || "") !== "true") return null;
  return createForecastRuntime({
    databaseUrl: required(env.ATLAS_ADMIN_FINANCE_DATABASE_URL, "ATLAS_ADMIN_FINANCE_DATABASE_URL"),
    databaseCa: required(env.ATLAS_ADMIN_FINANCE_DATABASE_CA, "ATLAS_ADMIN_FINANCE_DATABASE_CA"),
    sourceUrl: required(env.ATLAS_ADMIN_FINANCE_FORECAST_URL, "ATLAS_ADMIN_FINANCE_FORECAST_URL"),
    authorization: required(env.ATLAS_ADMIN_FINANCE_FORECAST_AUTHORIZATION, "ATLAS_ADMIN_FINANCE_FORECAST_AUTHORIZATION"),
    expectedPayoutContract: required(env.ATLAS_ADMIN_FINANCE_PAYOUT_CONTRACT, "ATLAS_ADMIN_FINANCE_PAYOUT_CONTRACT"),
    allowedHosts: ["data.atlas-system.io"],
    minConfirmations: Number(env.ATLAS_ADMIN_FINANCE_FORECAST_MIN_CONFIRMATIONS || 12),
    rpcUrl: dependencies.evidenceVerifier ? undefined : required(env.ATLAS_ADMIN_FINANCE_RPC_URL, "ATLAS_ADMIN_FINANCE_RPC_URL"),
    allowedRpcHosts: String(env.ATLAS_ADMIN_FINANCE_RPC_HOSTS || "").split(",").map((value) => value.trim()).filter(Boolean),
    pool: dependencies.pool,
    fetchImpl: dependencies.fetchImpl,
    now: dependencies.now,
    evidenceVerifier: dependencies.evidenceVerifier,
  });
}
