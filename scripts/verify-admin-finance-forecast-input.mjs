import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildForecastProjection,
  ForecastInputError,
  validateForecastInput,
} from "../server/admin-finance/forecast-input-contract.mjs";

const root = resolve(import.meta.dirname, "..");
const fixturePath = resolve(root, "docs/admin-finance/fixtures/forecast-input.v1.valid.json");
const schemaPath = resolve(root, "docs/admin-finance/contracts/forecast-input.v1.schema.json");
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const clone = (value) => structuredClone(value);

function expectCode(mutator, code) {
  const payload = clone(fixture);
  mutator(payload);
  assert.throws(
    () => validateForecastInput(payload),
    (error) => error instanceof ForecastInputError && error.code === code,
    `Expected ${code}`,
  );
}

assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(schema.properties.schemaVersion.const, "atlas.forecast-input.v1");
assert.equal(schema.additionalProperties, false);
assert.equal(schema.$defs.component.additionalProperties, false);
assert(!Object.hasOwn(schema.$defs.bucket.properties, "platformFeeDueRaw"));

const normalized = validateForecastInput(fixture);
assert.equal(normalized.buckets.length, 4);
assert.equal(normalized.checkpoint.blockNumber, 114353100);
assert.equal(normalized.checkpoint.chainId, 56);
assert.equal(normalized.payoutContractAddress, "0x1111111111111111111111111111111111111111");

const projection = buildForecastProjection(fixture);
assert.equal(projection.snapshot.scenario, "committed");
assert.equal(projection.snapshot.status, "valid");
assert.equal(projection.snapshot.payoutContractAddress, normalized.payoutContractAddress);
assert.equal(projection.snapshot.totalOutflow.amountRaw, "39200000000000000000000");
assert.equal(projection.snapshot.peakExposure.amountRaw, "26000000000000000000000");
assert.equal(projection.snapshot.peakFundingGap.amountRaw, "0");
assert.equal(projection.snapshot.firstBreachAt, null);
assert.equal(projection.buckets[0].totalOutflowDue.amountRaw, "13200000000000000000000");
assert.equal(projection.buckets[0].closingLiquidity.amountRaw, "86800000000000000000000");
assert.equal(projection.buckets[1].openingLiquidity.amountRaw, projection.buckets[0].closingLiquidity.amountRaw);
assert.equal(projection.buckets[1].closingLiquidity.amountRaw, "65800000000000000000000");
const reversedRoot = Object.fromEntries(Object.entries(fixture).reverse());
assert.equal(buildForecastProjection(reversedRoot).snapshot.id, projection.snapshot.id);

const first = projection.buckets[0];
const firstComponentTotal = BigInt(first.principalDue.amountRaw)
  + BigInt(first.grossDeltaDue.amountRaw)
  + BigInt(first.partnerRewardDue.amountRaw)
  + BigInt(first.pendingPartnerCreationDue.amountRaw);
assert.equal(firstComponentTotal, BigInt(first.totalOutflowDue.amountRaw));
assert.equal(
  BigInt(first.openingLiquidity.amountRaw) + BigInt(first.expectedInflow.amountRaw) - BigInt(first.totalOutflowDue.amountRaw),
  BigInt(first.closingLiquidity.amountRaw),
);

expectCode((payload) => {
  payload.buckets[0].platformFeeDueRaw = "200000000000000000000";
}, "unknown_field");

expectCode((payload) => {
  payload.buckets[0].grossDelta.grossRaw = "2100000000000000000000";
}, "gross_component_mismatch");

expectCode((payload) => {
  payload.openingLiquidityRaw = "9".repeat(79);
}, "invalid_atomic_money");

expectCode((payload) => {
  payload.buckets[0].cycleCount = 1000000001;
}, "invalid_integer");

expectCode((payload) => {
  payload.buckets[1].bucketStart = "2026-08-08T12:00:00.000Z";
}, "non_contiguous_buckets");

expectCode((payload) => {
  payload.buckets[0].confirmedInflowRaw = "1000000000000000000";
}, "missing_inflow_evidence");

expectCode((payload) => {
  payload.reservePolicy.status = "draft";
}, "reserve_policy_not_approved");

expectCode((payload) => {
  payload.reservePolicy.approvedAt = "2026-08-06T13:00:00.000Z";
}, "policy_approval_after_snapshot");

expectCode((payload) => {
  payload.forecastPolicy.unconfirmedFutureInflow = "include";
}, "unconfirmed_inflow_not_excluded");

expectCode((payload) => {
  payload.checkpoint.liquidityVerification = "source_reported";
}, "liquidity_not_verified");

expectCode((payload) => {
  payload.checkpoint.chainId = 1;
}, "invalid_chain_id");

expectCode((payload) => {
  payload.payoutContractAddress = "0x1234";
}, "invalid_payout_contract_address");

expectCode((payload) => {
  payload.buckets[1].id = payload.buckets[0].id;
}, "invalid_bucket_id");

expectCode((payload) => {
  payload.buckets[0].bucketStart = "2026-08-06T13:00:00.000Z";
}, "non_contiguous_buckets");

expectCode((payload) => {
  payload.buckets[3].bucketEnd = "2026-11-05T12:00:00.000Z";
}, "forecast_horizon_too_large");

expectCode((payload) => {
  payload.buckets[3].bucketEnd = "2026-11-03T12:00:00.000Z";
}, "forecast_horizon_incomplete");

expectCode((payload) => {
  payload.buckets[1].bucketEnd = "2026-08-14T12:00:00.000Z";
  payload.buckets[2].bucketStart = "2026-08-14T12:00:00.000Z";
}, "forecast_horizon_boundary_missing");

console.log("Admin Finance forecast input contract checks passed.");
