import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createForecastPostgresPool,
  createPostgresForecastCheckpointGuard,
} from "../server/admin-finance/forecast-checkpoint-repository.mjs";
import { createForecastRuntimeFromEnvironment } from "../server/admin-finance/forecast-runtime.mjs";

const root = resolve(import.meta.dirname, "..");
const fixture = JSON.parse(await readFile(resolve(root, "docs/admin-finance/fixtures/forecast-input.v1.valid.json"), "utf8"));
const candidate = {
  sourceKey: "atlas.forecast-input.v1:data.atlas-system.io/api/v1/admin-finance/forecast-input",
  chainId: 56,
  blockNumber: 114353100,
  blockHash: `0x${"cd".repeat(32)}`,
  generatedAt: Date.parse("2026-08-06T12:05:00.000Z"),
  sourceSnapshotId: "provider-snapshot-2026-08-06-001",
  projectionId: "1a66371d-b6c0-5b3f-9daf-d1198dfa34e5",
};

let captured;
const guard = createPostgresForecastCheckpointGuard({
  query: async (text, values) => {
    captured = { text, values };
    return { rows: [{ result: "accepted_initial" }] };
  },
});
assert.equal(await guard.accept(candidate), "accepted_initial");
assert(captured.text.includes("accept_forecast_source_checkpoint"));
assert(!captured.text.includes(candidate.sourceSnapshotId), "Checkpoint SQL must remain parameterized");
assert.deepEqual(captured.values, [
  candidate.sourceKey,
  56,
  114353100,
  candidate.blockHash,
  "2026-08-06T12:05:00.000Z",
  candidate.sourceSnapshotId,
  candidate.projectionId,
]);

await assert.rejects(
  createPostgresForecastCheckpointGuard({ query: async () => { throw new Error("source_checkpoint_rollback"); } }).accept(candidate),
  (error) => error.code === "source_checkpoint_rollback" && error.retryable === false,
);
await assert.rejects(
  createPostgresForecastCheckpointGuard({ query: async () => { throw new Error("password=must-not-leak"); } }).accept(candidate),
  (error) => error.code === "source_checkpoint_store_failed" && !error.message.includes("password"),
);
await assert.rejects(
  createPostgresForecastCheckpointGuard({ query: async () => ({ rows: [] }) }).accept(candidate),
  (error) => error.code === "source_checkpoint_store_failed",
);
await assert.rejects(
  guard.accept({ ...candidate, blockHash: "invalid" }),
  (error) => error.code === "invalid_checkpoint_candidate",
);

assert.throws(
  () => createForecastPostgresPool({ connectionString: "https://db.example/atlas", sslCa: "certificate" }),
  (error) => error.code === "invalid_database_url",
);
assert.throws(
  () => createForecastPostgresPool({ connectionString: "postgresql://user:pass@db.example/atlas?sslmode=disable", sslCa: "certificate" }),
  (error) => error.code === "unsafe_database_url",
);
assert.throws(
  () => createForecastPostgresPool({ connectionString: "postgresql://user:pass@db.example/atlas", sslCa: "certificate" }),
  (error) => error.code === "database_ca_required",
);

let queryCalls = 0;
let closed = false;
const pool = {
  query: async () => {
    queryCalls += 1;
    return { rows: [{ result: "accepted_initial" }] };
  },
  end: async () => { closed = true; },
};
const runtime = createForecastRuntimeFromEnvironment({
  ATLAS_ADMIN_FINANCE_FORECAST_ENABLED: "true",
  ATLAS_ADMIN_FINANCE_DATABASE_URL: "postgresql://fixture:fixture@db.example/atlas",
  ATLAS_ADMIN_FINANCE_DATABASE_CA: "-----BEGIN CERTIFICATE-----\nfixture\n-----END CERTIFICATE-----",
  ATLAS_ADMIN_FINANCE_FORECAST_URL: "https://data.atlas-system.io/api/v1/admin-finance/forecast-input",
  ATLAS_ADMIN_FINANCE_FORECAST_AUTHORIZATION: `Basic ${Buffer.from("fixture:fixture").toString("base64")}`,
  ATLAS_ADMIN_FINANCE_PAYOUT_CONTRACT: "0x1111111111111111111111111111111111111111",
}, {
  pool,
  evidenceVerifier: { verify: async () => ({ verified: true }) },
  now: () => Date.parse("2026-08-06T12:10:00.000Z"),
  fetchImpl: async () => new Response(JSON.stringify(fixture), { headers: { "Content-Type": "application/json" } }),
});
assert(runtime);
assert.equal((await runtime.getProjection()).source.status, "quarantine_validated");
assert.equal(queryCalls, 1);
await runtime.close();
assert.equal(closed, true);
assert.equal(createForecastRuntimeFromEnvironment({}), null);

assert.throws(
  () => createForecastRuntimeFromEnvironment({ ATLAS_ADMIN_FINANCE_FORECAST_ENABLED: "true" }),
  /ATLAS_ADMIN_FINANCE_DATABASE_URL is required/,
);

console.log("Admin Finance forecast PostgreSQL runtime checks passed.");
