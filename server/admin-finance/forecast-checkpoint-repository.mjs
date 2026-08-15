import pg from "pg";
import { ForecastSourceError } from "./forecast-source-adapter.mjs";

const { Pool } = pg;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_PATTERN = /^0x[0-9a-f]{64}$/;
const SOURCE_KEY_PATTERN = /^[a-z0-9._:/-]{1,255}$/;
const SOURCE_SNAPSHOT_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;
const EXPECTED_RESULTS = new Set(["accepted_initial", "accepted_advance"]);
const GUARDED_CODES = new Set([
  "source_chain_mismatch",
  "source_checkpoint_rollback",
  "source_time_rollback",
  "source_checkpoint_equivocation",
  "source_snapshot_equivocation",
]);

const ACCEPT_CHECKPOINT_SQL = `
SELECT admin_finance.accept_forecast_source_checkpoint(
  $1::text,
  $2::bigint,
  $3::bigint,
  decode(substring($4::text from 3), 'hex')::admin_finance.hash32,
  $5::timestamptz,
  $6::text,
  $7::uuid
) AS result
`;

function fail(code, message) {
  throw new ForecastSourceError(code, message, { retryable: false });
}

function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") fail("invalid_checkpoint_candidate", "Forecast checkpoint candidate is required.");
  if (!SOURCE_KEY_PATTERN.test(String(candidate.sourceKey || ""))) fail("invalid_checkpoint_candidate", "Forecast source key is invalid.");
  if (candidate.chainId !== 56) fail("invalid_checkpoint_candidate", "Forecast checkpoint chain is invalid.");
  if (!Number.isSafeInteger(candidate.blockNumber) || candidate.blockNumber < 1) fail("invalid_checkpoint_candidate", "Forecast checkpoint block is invalid.");
  if (!HASH_PATTERN.test(String(candidate.blockHash || "").toLowerCase())) fail("invalid_checkpoint_candidate", "Forecast checkpoint hash is invalid.");
  if (!Number.isSafeInteger(candidate.generatedAt) || candidate.generatedAt < 0) fail("invalid_checkpoint_candidate", "Forecast checkpoint generation time is invalid.");
  if (!SOURCE_SNAPSHOT_PATTERN.test(String(candidate.sourceSnapshotId || ""))) fail("invalid_checkpoint_candidate", "Forecast source snapshot ID is invalid.");
  if (!UUID_PATTERN.test(String(candidate.projectionId || ""))) fail("invalid_checkpoint_candidate", "Forecast projection ID is invalid.");

  return [
    candidate.sourceKey,
    candidate.chainId,
    candidate.blockNumber,
    candidate.blockHash.toLowerCase(),
    new Date(candidate.generatedAt).toISOString(),
    candidate.sourceSnapshotId,
    candidate.projectionId.toLowerCase(),
  ];
}

function guardedCode(error) {
  const message = String(error?.message || "");
  return [...GUARDED_CODES].find((code) => message.includes(code)) || null;
}

export function createPostgresForecastCheckpointGuard(options = {}) {
  const query = options.query;
  if (typeof query !== "function") fail("invalid_checkpoint_store", "PostgreSQL checkpoint query function is required.");

  return Object.freeze({
    async accept(candidate) {
      const values = validateCandidate(candidate);
      try {
        const response = await query(ACCEPT_CHECKPOINT_SQL, values);
        const result = response?.rows?.[0]?.result;
        if (!EXPECTED_RESULTS.has(result)) throw new Error("unexpected_checkpoint_result");
        return result;
      } catch (error) {
        if (error instanceof ForecastSourceError) throw error;
        const code = guardedCode(error);
        if (code) throw new ForecastSourceError(code, "Forecast source checkpoint was rejected.", { retryable: false });
        throw new ForecastSourceError("source_checkpoint_store_failed", "Forecast source checkpoint store failed.");
      }
    },
  });
}

function boundedInteger(value, fallback, min, max, name) {
  const normalized = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < min || normalized > max) {
    fail("invalid_database_option", `${name} is invalid.`);
  }
  return normalized;
}

function validateConnectionString(value) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    fail("invalid_database_url", "Forecast database URL is invalid.");
  }
  if (!new Set(["postgres:", "postgresql:"]).has(url.protocol)) fail("invalid_database_url", "Forecast database URL must use PostgreSQL.");
  if (!url.hostname || !url.pathname || url.pathname === "/") fail("invalid_database_url", "Forecast database host and name are required.");
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
    if (url.searchParams.has(key)) fail("unsafe_database_url", "TLS options must not be embedded in the forecast database URL.");
  }
  return url.toString();
}

export function createForecastPostgresPool(options = {}) {
  const connectionString = validateConnectionString(options.connectionString);
  const sslCa = String(options.sslCa || "").trim();
  if (!sslCa.includes("BEGIN CERTIFICATE") || !sslCa.includes("END CERTIFICATE")) {
    fail("database_ca_required", "A trusted PostgreSQL CA certificate is required.");
  }
  const applicationName = String(options.applicationName || "atlas-admin-finance-forecast");
  if (!/^[a-z0-9._-]{3,63}$/.test(applicationName)) fail("invalid_database_option", "PostgreSQL application name is invalid.");

  const pool = new Pool({
    connectionString,
    application_name: applicationName,
    ssl: { rejectUnauthorized: true, ca: sslCa },
    max: boundedInteger(options.maxConnections, 2, 1, 5, "maxConnections"),
    connectionTimeoutMillis: boundedInteger(options.connectionTimeoutMs, 5_000, 100, 30_000, "connectionTimeoutMs"),
    idleTimeoutMillis: boundedInteger(options.idleTimeoutMs, 10_000, 1_000, 60_000, "idleTimeoutMs"),
    query_timeout: boundedInteger(options.queryTimeoutMs, 5_000, 100, 30_000, "queryTimeoutMs"),
    statement_timeout: boundedInteger(options.statementTimeoutMs, 5_000, 100, 30_000, "statementTimeoutMs"),
    allowExitOnIdle: true,
  });
  pool.on("error", () => {});
  return pool;
}
