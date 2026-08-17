import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createInMemoryForecastCheckpointGuard,
  createForecastSourceAdapter,
  ForecastSourceError,
} from "../server/admin-finance/forecast-source-adapter.mjs";

const root = resolve(import.meta.dirname, "..");
const fixture = JSON.parse(await readFile(resolve(root, "docs/admin-finance/fixtures/forecast-input.v1.valid.json"), "utf8"));
const sourceUrl = "https://data.atlas-system.io/api/v1/admin-finance/forecast-input";
const payoutContractAddress = "0x1111111111111111111111111111111111111111";
const authorization = `Basic ${Buffer.from("fixture-user:fixture-password").toString("base64")}`;
const nowValue = Date.parse("2026-08-06T12:10:00.000Z");
const evidenceVerifier = { verify: async () => ({ verified: true }) };
const jsonResponse = (payload, init = {}) => new Response(
  typeof payload === "string" ? payload : JSON.stringify(payload),
  {
    status: init.status || 200,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  },
);

function adapter(fetchImpl, options = {}) {
  return createForecastSourceAdapter({
    url: sourceUrl,
    allowedHosts: ["data.atlas-system.io"],
    authorization,
    expectedPayoutContract: payoutContractAddress,
    evidenceVerifier,
    fetchImpl,
    now: () => nowValue,
    cacheMs: 30_000,
    ...options,
  });
}

async function expectCode(action, code) {
  await assert.rejects(
    action,
    (error) => error instanceof ForecastSourceError && error.code === code,
    `Expected ${code}`,
  );
}

let calls = 0;
const requestOptions = [];
const healthy = adapter(async (_url, options) => {
  calls += 1;
  requestOptions.push(options);
  return jsonResponse(fixture);
});
const projection = await healthy.getProjection();
assert.equal(projection.snapshot.scenario, "committed");
assert.equal(projection.source.status, "quarantine_validated");
assert.equal(projection.source.endpointHost, "data.atlas-system.io");
assert.equal(calls, 1);
assert.equal((await healthy.getProjection()).snapshot.id, projection.snapshot.id);
assert.equal(calls, 1, "Cached forecast projection must avoid a duplicate provider request");
assert.equal(requestOptions[0].redirect, "error");
assert.equal(requestOptions[0].credentials, "omit");
assert.equal(requestOptions[0].headers.Authorization, authorization);
assert.equal(requestOptions[0].headers["X-Atlas-Contract-Version"], "atlas.forecast-input.v1");

assert.throws(
  () => createForecastSourceAdapter({ url: sourceUrl.replace("https:", "http:"), allowedHosts: ["data.atlas-system.io"], authorization, expectedPayoutContract: payoutContractAddress, evidenceVerifier }),
  (error) => error.code === "insecure_source_url",
);
assert.throws(
  () => createForecastSourceAdapter({ url: "https://attacker.example/api/v1/admin-finance/forecast-input", allowedHosts: ["data.atlas-system.io"], authorization, expectedPayoutContract: payoutContractAddress, evidenceVerifier }),
  (error) => error.code === "source_host_not_allowed",
);
assert.throws(
  () => createForecastSourceAdapter({ url: "https://data.atlas-system.io/other", allowedHosts: ["data.atlas-system.io"], authorization, expectedPayoutContract: payoutContractAddress, evidenceVerifier }),
  (error) => error.code === "source_path_not_allowed",
);
assert.throws(
  () => createForecastSourceAdapter({ url: sourceUrl, allowedHosts: ["data.atlas-system.io"], authorization: "", expectedPayoutContract: payoutContractAddress, evidenceVerifier }),
  (error) => error.code === "source_authorization_missing",
);
assert.throws(
  () => createForecastSourceAdapter({ url: sourceUrl, allowedHosts: ["data.atlas-system.io"], authorization: "Basic valid\r\nInjected: yes", expectedPayoutContract: payoutContractAddress, evidenceVerifier }),
  (error) => error.code === "source_authorization_invalid",
);

await expectCode(
  () => adapter(async () => jsonResponse({}, { status: 401 })).getProjection(),
  "source_auth_failed",
);
await expectCode(
  () => adapter(async () => new Response("text", { status: 200, headers: { "Content-Type": "text/plain" } })).getProjection(),
  "source_content_type",
);
await expectCode(
  () => adapter(async () => jsonResponse("{bad json")).getProjection(),
  "source_invalid_json",
);
await expectCode(
  () => adapter(async () => jsonResponse(fixture, { headers: { "Content-Length": "9999999" } })).getProjection(),
  "source_response_too_large",
);

const invalidPayload = structuredClone(fixture);
invalidPayload.buckets[0].platformFeeDueRaw = "1";
await assert.rejects(
  () => adapter(async () => jsonResponse(invalidPayload)).getProjection(),
  (error) => error.code === "source_payload_rejected" && error.causeCode === "unknown_field" && error.causePath.endsWith("platformFeeDueRaw"),
);

await expectCode(
  () => adapter(async () => jsonResponse(fixture), {
    now: () => Date.parse("2026-08-06T13:00:00.000Z"),
  }).getProjection(),
  "source_stale",
);
const futurePayload = structuredClone(fixture);
futurePayload.generatedAt = "2026-08-06T12:12:00.000Z";
await expectCode(
  () => adapter(async () => jsonResponse(futurePayload)).getProjection(),
  "source_clock_skew",
);
await expectCode(
  () => adapter(async () => jsonResponse(fixture), { expectedToken: "0x1111111111111111111111111111111111111111" }).getProjection(),
  "source_token_mismatch",
);
await expectCode(
  () => adapter(async () => jsonResponse(fixture), { expectedPayoutContract: "0x2222222222222222222222222222222222222222" }).getProjection(),
  "source_payout_contract_mismatch",
);
await expectCode(
  () => adapter(async () => jsonResponse(fixture), { minConfirmations: 21 }).getProjection(),
  "source_finality_insufficient",
);

const rollbackPayload = structuredClone(fixture);
rollbackPayload.sourceSnapshotId = "provider-snapshot-rollback";
rollbackPayload.checkpoint.blockNumber -= 1;
const rollbackQueue = [fixture, rollbackPayload];
const rollbackAdapter = adapter(async () => jsonResponse(rollbackQueue.shift()));
await rollbackAdapter.getProjection();
await expectCode(() => rollbackAdapter.getProjection({ force: true }), "source_checkpoint_rollback");

const equivocationPayload = structuredClone(fixture);
equivocationPayload.openingLiquidityRaw = "100000000000000000000001";
const equivocationQueue = [fixture, equivocationPayload];
const equivocationAdapter = adapter(async () => jsonResponse(equivocationQueue.shift()));
await equivocationAdapter.getProjection();
await expectCode(() => equivocationAdapter.getProjection({ force: true }), "source_snapshot_equivocation");

const hashPayload = structuredClone(fixture);
hashPayload.sourceSnapshotId = "provider-snapshot-hash-change";
hashPayload.checkpoint.blockHash = `0x${"ab".repeat(32)}`;
const hashQueue = [fixture, hashPayload];
const hashAdapter = adapter(async () => jsonResponse(hashQueue.shift()));
await hashAdapter.getProjection();
await expectCode(() => hashAdapter.getProjection({ force: true }), "source_checkpoint_equivocation");

await expectCode(
  () => adapter((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }), { timeoutMs: 10 }).getProjection(),
  "source_timeout",
);

await expectCode(
  () => adapter(async () => jsonResponse(fixture), {
    evidenceVerifier: { verify: async () => { throw new Error("RPC unavailable"); } },
  }).getProjection(),
  "source_evidence_verification_failed",
);

const sharedGuard = createInMemoryForecastCheckpointGuard();
await adapter(async () => jsonResponse(fixture), { checkpointGuard: sharedGuard }).getProjection();
await expectCode(
  () => adapter(async () => jsonResponse(rollbackPayload), { checkpointGuard: sharedGuard }).getProjection(),
  "source_checkpoint_rollback",
);

const historicalSnapshotReuse = structuredClone(fixture);
historicalSnapshotReuse.sourceSnapshotId = "provider-snapshot-historical";
historicalSnapshotReuse.checkpoint.blockNumber += 1;
historicalSnapshotReuse.checkpoint.blockHash = `0x${"cd".repeat(32)}`;
const historicalSnapshotReuseChanged = structuredClone(historicalSnapshotReuse);
historicalSnapshotReuseChanged.sourceSnapshotId = fixture.sourceSnapshotId;
historicalSnapshotReuseChanged.checkpoint.blockNumber += 1;
historicalSnapshotReuseChanged.checkpoint.blockHash = `0x${"ef".repeat(32)}`;
historicalSnapshotReuseChanged.generatedAt = "2026-08-06T12:10:30.000Z";
historicalSnapshotReuseChanged.openingLiquidityRaw = "100000000000000000000002";
const historyGuard = createInMemoryForecastCheckpointGuard();
await adapter(async () => jsonResponse(fixture), { checkpointGuard: historyGuard }).getProjection();
await adapter(async () => jsonResponse(historicalSnapshotReuse), { checkpointGuard: historyGuard }).getProjection();
await expectCode(
  () => adapter(async () => jsonResponse(historicalSnapshotReuseChanged), { checkpointGuard: historyGuard }).getProjection(),
  "source_snapshot_equivocation",
);

await expectCode(
  () => adapter(async () => jsonResponse(fixture), {
    checkpointGuard: { accept: async () => { throw new Error("database unavailable"); } },
  }).getProjection(),
  "source_checkpoint_store_failed",
);

console.log("Admin Finance forecast source adapter checks passed.");
