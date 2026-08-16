import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createAdminFinanceServer } from "../server/admin-finance-api.mjs";
import { buildForecastProjection } from "../server/admin-finance/forecast-input-contract.mjs";
import { OnchainProviderError } from "../server/admin-finance/onchain-provider.mjs";

const sessionToken = "alpha-session-token-0123456789-abcdef";
const cursorSecret = "alpha-cursor-secret-0123456789-abcdef";
const token = {
  address: "0x55d398326f99059ff775485246999027b3197955",
  symbol: "USDT",
  decimals: 18,
};
const money = (amountRaw, available = true) => ({ amountRaw, decimals: 18, tokenAddress: token.address, symbol: token.symbol, available });
const bucket = {
  bucketStart: "2026-08-05T00:00:00.000Z",
  bucketEnd: "2026-08-06T00:00:00.000Z",
  externalIn: money("1000000000000000000"),
  externalOut: money("2000000000000000000"),
  netFlow: money("-1000000000000000000"),
  internalTransfersEliminated: money("100000000000000000"),
};
const snapshot = {
  id: "ab".repeat(32),
  generatedAt: "2026-08-06T12:00:00.000Z",
  asOfBlockNumber: 114353100,
  asOfBlockHash: `0x${"cd".repeat(32)}`,
  confirmations: 20,
  freshnessSeconds: 90,
  finality: "finalized",
  sourceStatus: "partial",
  reconciliationStatus: "unreconciled",
  formulaVersion: "atlas-onchain-alpha-v1",
  rulesetVersion: "provider-rules-unverified",
  partialReasons: ["claim_lifecycle_offchain_states_unavailable"],
  token,
  coverage: { from: bucket.bucketStart, to: bucket.bucketEnd },
  cashMovementsByPerimeter: {
    payout_contract: [bucket],
    atlas_consolidated: [bucket],
    company_treasury: [bucket],
  },
  cycles: [{
    id: "10000000-0000-5000-8000-000000000001",
    productKey: "flow:1",
    label: "Daily 200 · Flow",
    status: "open",
    openedCount: 1,
    openCount: 1,
    closedCount: 0,
    claimableCount: 0,
    termEndedCount: 0,
    principal: money("100000000000000000000"),
    grossDeltaPaid: money("0", false),
    projectedMaturityOutflow: money("120000000000000000000"),
    claimableNow: money("0"),
    next7DaysLoad: money("20000000000000000000"),
    next30DaysLoad: money("80000000000000000000"),
    rulesetVersion: "onchain-flow-tier-1-unverified",
  }],
  claims: [],
  liquidity: {
    summary: {
      openingBalance: money("0", false),
      externalIn: money("0", false),
      externalOut: money("0", false),
      internalTreasuryTransfers: money("0", false),
      calculatedClosing: money("0", false),
      canonicalClosing: money("3000000000000000000"),
      reportedClosing: money("3000000000000000000"),
      residual: money("0", false),
    },
    checkpoint: { canonical: true, observedAt: "2026-08-06T12:00:00.000Z", asOfBlockNumber: 114353100, verification: "independent_rpc" },
    buckets: [],
    balances: [{ contractId: "treasury", label: "Treasury", maskedAddress: "0x2222…2222", usdt: money("3000000000000000000") }],
  },
  reconciliation: { diagnostics: {}, failures: [] },
};

const forecastInput = JSON.parse(await readFile(new URL("../docs/admin-finance/fixtures/forecast-input.v1.valid.json", import.meta.url), "utf8"));
const forecastProjection = {
  ...buildForecastProjection(forecastInput),
  source: { status: "quarantine_validated", receivedAt: "2026-08-14T12:01:00.000Z", endpointHost: "data.atlas-system.io" },
};
const forecastRuntime = { getProjection: async () => forecastProjection };

async function start(sourceProvider, options = {}) {
  const server = createAdminFinanceServer({
    mode: "alpha",
    sessionToken,
    cursorSecret,
    allowedOrigins: ["http://127.0.0.1:4186"],
    sourceProvider,
    forecastRuntime: options.forecastRuntime,
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { server, base: `http://127.0.0.1:${address.port}/api/admin/v1` };
}

async function request(base, path) {
  return fetch(`${base}${path}`, {
    headers: { Cookie: `__Host-atlas_admin_session=${sessionToken}`, Origin: "http://127.0.0.1:4186" },
  });
}

const healthy = await start({ getSnapshot: async () => snapshot }, { forecastRuntime });
try {
  const live = await fetch(`${healthy.base}/health/live`);
  assert.equal(live.status, 200);
  assert.equal((await live.json()).status, "live");
  const ready = await fetch(`${healthy.base}/health/ready`);
  assert.equal(ready.status, 200);
  assert.equal((await ready.json()).asOfBlockNumber, snapshot.asOfBlockNumber);

  const metaResponse = await request(healthy.base, "/meta");
  assert.equal(metaResponse.status, 200);
  const meta = await metaResponse.json();
  assert.equal(meta.status, "internal_alpha_partial");
  assert.equal(meta.snapshot.asOfBlockNumber, snapshot.asOfBlockNumber);
  assert.equal(meta.dataCoverage.length, 7);
  assert.equal(meta.dataCoverage.find((item) => item.id === "cycles").status, "partial");
  assert.equal(meta.dataCoverage.find((item) => item.id === "payout_forecast").status, "partial");
  assert(meta.capabilities.includes("forecast"));
  assert.equal(meta.dataCoverage.find((item) => item.id === "claims").source, "N/A");

  const range = "from=2026-08-05T00%3A00%3A00.000Z&to=2026-08-06T00%3A00%3A00.000Z";
  const cash = await (await request(healthy.base, `/finance/cash-movements?${range}&perimeter=atlas_consolidated&granularity=day&limit=100`)).json();
  assert.equal(cash.data[0].netFlow.amountRaw, "-1000000000000000000");
  assert.equal(cash.meta.partial, true);

  const snapshotPin = `asOfBlock=${snapshot.asOfBlockNumber}&asOfBlockHash=${encodeURIComponent(snapshot.asOfBlockHash)}`;
  const pinnedCashResponse = await request(healthy.base, `/finance/cash-movements?${range}&perimeter=atlas_consolidated&granularity=day&limit=100&${snapshotPin}`);
  assert.equal(pinnedCashResponse.status, 200);
  const incompletePinResponse = await request(healthy.base, `/finance/cash-movements?${range}&perimeter=atlas_consolidated&asOfBlock=${snapshot.asOfBlockNumber}`);
  assert.equal(incompletePinResponse.status, 400);
  assert.equal((await incompletePinResponse.json()).code, "invalid_snapshot_pin");
  const changedSnapshotResponse = await request(healthy.base, `/finance/cash-movements?${range}&perimeter=atlas_consolidated&asOfBlock=${snapshot.asOfBlockNumber}&asOfBlockHash=${encodeURIComponent(`0x${"ef".repeat(32)}`)}`);
  assert.equal(changedSnapshotResponse.status, 409);
  assert.equal((await changedSnapshotResponse.json()).code, "snapshot_changed");

  const liquidity = await (await request(healthy.base, `/finance/liquidity/roll-forward?${range}&perimeter=payout_contract&granularity=day`)).json();
  assert.equal(liquidity.data.summary.canonicalClosing.amountRaw, "3000000000000000000");
  assert.equal(liquidity.data.summary.openingBalance.available, false);

  const cycles = await (await request(healthy.base, `/finance/cycles?${range}&limit=100`)).json();
  assert.equal(cycles.data.length, 1);
  assert.equal(cycles.data[0].grossDeltaPaid.available, false);
  assert.equal(cycles.data[0].openCount, 1);
  assert.equal(cycles.data[0].next7DaysLoad.amountRaw, "20000000000000000000");
  assert.equal(cycles.data[0].next30DaysLoad.amountRaw, "80000000000000000000");

  const claims = await (await request(healthy.base, `/claims?${range}&limit=100`)).json();
  assert.deepEqual(claims.data, []);
  assert(claims.meta.partialReasons.includes("claim_lifecycle_offchain_states_unavailable"));

  const runs = await (await request(healthy.base, "/reconciliation/runs?limit=100")).json();
  assert.equal(runs.data[0].observedClosing.amountRaw, "3000000000000000000");
  assert.equal(runs.data[0].expectedClosing.available, false);

  const overview = await (await request(healthy.base, `/finance/overview?${range}&perimeter=atlas_consolidated`)).json();
  assert.equal(overview.data.cycles.rows[0].openedCount, 1);
  assert(!JSON.stringify(overview).includes("demo-reconciliation"));

  const latestForecast = await (await request(healthy.base, "/forecast/snapshots/latest?scenario=committed&perimeter=payout_contract")).json();
  assert.equal(latestForecast.data.id, forecastProjection.snapshot.id);
  assert.equal(latestForecast.meta.partial, true);
  assert(latestForecast.meta.partialReasons.includes("forecast_quarantine_validated_not_ledger_reconciled"));
  const forecastRange = `from=${encodeURIComponent(forecastProjection.snapshot.asOf)}&to=${encodeURIComponent(forecastProjection.buckets[0].bucketEnd)}`;
  const forecastBuckets = await (await request(healthy.base, `/forecast/buckets?snapshotId=${forecastProjection.snapshot.id}&${forecastRange}`)).json();
  assert.equal(forecastBuckets.data.length, 1);
  assert.equal(forecastBuckets.data[0].snapshotId, forecastProjection.snapshot.id);

  const uncalibrated = await request(healthy.base, "/forecast/snapshots/latest?scenario=base&perimeter=payout_contract");
  assert.equal(uncalibrated.status, 422);

  const forbidden = await request(healthy.base, "/participants/search?q=atlas");
  assert.equal(forbidden.status, 404);
} finally {
  await new Promise((resolve) => healthy.server.close(resolve));
}

const forecastDisabled = await start({ getSnapshot: async () => snapshot });
try {
  const response = await request(forecastDisabled.base, "/forecast/snapshots/latest?scenario=committed&perimeter=payout_contract");
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "forecast_runtime_disabled");
} finally {
  await new Promise((resolve) => forecastDisabled.server.close(resolve));
}

const failed = await start({
  getSnapshot: async () => {
    throw new OnchainProviderError("provider_timeout", "timeout");
  },
});
try {
  const readiness = await fetch(`${failed.base}/health/ready`);
  assert.equal(readiness.status, 503);
  assert.equal((await readiness.json()).code, "source_unavailable");

  const response = await request(failed.base, "/meta");
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, "source_unavailable");
  assert(!JSON.stringify(body).toLowerCase().includes("demo"));
} finally {
  await new Promise((resolve) => failed.server.close(resolve));
}

console.log("Admin Finance Alpha API checks passed.");
