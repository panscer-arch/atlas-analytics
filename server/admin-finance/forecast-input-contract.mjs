import { createHash } from "node:crypto";

const SCHEMA_VERSION = "atlas.forecast-input.v1";
const MAX_HORIZON_MS = 90 * 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/i;
const HASH_PATTERN = /^0x[0-9a-f]{64}$/i;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const MAX_UINT256 = (1n << 256n) - 1n;
const MAX_BUCKET_OBJECT_COUNT = 1_000_000_000;

export class ForecastInputError extends Error {
  constructor(code, path, message) {
    super(message);
    this.name = "ForecastInputError";
    this.code = code;
    this.path = path;
  }
}

function fail(code, path, message) {
  throw new ForecastInputError(code, path, message);
}

function plainObject(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("invalid_object", path, `${path} must be an object.`);
  }
  return value;
}

function exactKeys(value, { required, optional = [] }, path) {
  plainObject(value, path);
  const allowed = new Set([...required, ...optional]);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  const missing = required.filter((key) => value[key] === undefined || value[key] === null);
  if (unknown.length) fail("unknown_field", `${path}.${unknown[0]}`, `Unknown field ${path}.${unknown[0]}.`);
  if (missing.length) fail("missing_field", `${path}.${missing[0]}`, `Missing field ${path}.${missing[0]}.`);
}

function nonEmptyString(value, path, maxLength = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    fail("invalid_string", path, `${path} must be a non-empty string.`);
  }
  return value;
}

function nonNegativeInteger(value, path, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) fail("invalid_integer", path, `${path} must be a non-negative bounded integer.`);
  return value;
}

function atomic(value, path) {
  if (typeof value !== "string" || value.length > 78 || !INTEGER_PATTERN.test(value)) {
    fail("invalid_atomic_money", path, `${path} must be a non-negative atomic-unit integer string.`);
  }
  const parsed = BigInt(value);
  if (parsed > MAX_UINT256) fail("invalid_atomic_money", path, `${path} exceeds uint256.`);
  return parsed;
}

function dateTime(value, path) {
  if (typeof value !== "string" || !/[tT]/.test(value) || !/(Z|[+-][0-9]{2}:[0-9]{2})$/.test(value)) {
    fail("invalid_datetime", path, `${path} must be an ISO-8601 date-time with an explicit offset.`);
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) fail("invalid_datetime", path, `${path} must be a valid date-time.`);
  return { timestamp, iso: new Date(timestamp).toISOString() };
}

function uniqueStrings(value, path, { minItems = 0, maxItems = 500 } = {}) {
  if (!Array.isArray(value) || value.length < minItems || value.length > maxItems) {
    fail("invalid_array", path, `${path} has an invalid item count.`);
  }
  const normalized = value.map((item, index) => nonEmptyString(item, `${path}[${index}]`, 500));
  if (new Set(normalized).size !== normalized.length) fail("duplicate_item", path, `${path} contains duplicate values.`);
  return normalized;
}

function component(value, path) {
  exactKeys(value, {
    required: ["grossRaw", "netRaw", "platformFeeRaw", "otherDeductionsRaw"],
  }, path);
  const gross = atomic(value.grossRaw, `${path}.grossRaw`);
  const net = atomic(value.netRaw, `${path}.netRaw`);
  const fee = atomic(value.platformFeeRaw, `${path}.platformFeeRaw`);
  const deductions = atomic(value.otherDeductionsRaw, `${path}.otherDeductionsRaw`);
  if (gross !== net + fee + deductions) {
    fail("gross_component_mismatch", path, `${path}.grossRaw must equal netRaw + platformFeeRaw + otherDeductionsRaw.`);
  }
  return { gross, net, fee, deductions };
}

function deterministicUuid(value) {
  const bytes = createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function wireMoney(amount, token) {
  return {
    amountRaw: amount.toString(),
    decimals: token.decimals,
    tokenAddress: token.address,
    symbol: token.symbol,
  };
}

function fixedRatio(numerator, denominator) {
  if (denominator === 0n) return null;
  const scaled = numerator * 100n / denominator;
  return `${scaled / 100n}.${(scaled % 100n).toString().padStart(2, "0")}`;
}

export function validateForecastInput(payload) {
  exactKeys(payload, {
    required: [
      "schemaVersion",
      "sourceSnapshotId",
      "generatedAt",
      "perimeter",
      "payoutContractAddress",
      "token",
      "checkpoint",
      "reservePolicy",
      "forecastPolicy",
      "openingLiquidityRaw",
      "buckets",
    ],
  }, "$input");
  if (payload.schemaVersion !== SCHEMA_VERSION) fail("unsupported_schema_version", "$input.schemaVersion", `Expected ${SCHEMA_VERSION}.`);
  nonEmptyString(payload.sourceSnapshotId, "$input.sourceSnapshotId", 200);
  const generatedAt = dateTime(payload.generatedAt, "$input.generatedAt");
  if (payload.perimeter !== "payout_contract") fail("invalid_perimeter", "$input.perimeter", "Forecast input must use payout_contract.");
  if (!ADDRESS_PATTERN.test(payload.payoutContractAddress)) fail("invalid_payout_contract_address", "$input.payoutContractAddress", "Payout contract address is invalid.");
  const payoutContractAddress = payload.payoutContractAddress.toLowerCase();

  exactKeys(payload.token, { required: ["address", "symbol", "decimals"] }, "$input.token");
  if (!ADDRESS_PATTERN.test(payload.token.address)) fail("invalid_token_address", "$input.token.address", "Token address is invalid.");
  nonEmptyString(payload.token.symbol, "$input.token.symbol", 24);
  if (!Number.isInteger(payload.token.decimals) || payload.token.decimals < 0 || payload.token.decimals > 36) {
    fail("invalid_token_decimals", "$input.token.decimals", "Token decimals are invalid.");
  }
  const token = { address: payload.token.address.toLowerCase(), symbol: payload.token.symbol, decimals: payload.token.decimals };

  exactKeys(payload.checkpoint, {
    required: ["chainId", "asOf", "blockNumber", "blockHash", "confirmations", "finality", "liquidityVerification"],
  }, "$input.checkpoint");
  const asOf = dateTime(payload.checkpoint.asOf, "$input.checkpoint.asOf");
  if (generatedAt.timestamp < asOf.timestamp) fail("invalid_snapshot_time", "$input.generatedAt", "generatedAt cannot precede checkpoint.asOf.");
  if (payload.checkpoint.chainId !== 56) fail("invalid_chain_id", "$input.checkpoint.chainId", "Forecast input must use BNB Smart Chain chainId 56.");
  if (!Number.isSafeInteger(payload.checkpoint.blockNumber) || payload.checkpoint.blockNumber < 1) fail("invalid_block_number", "$input.checkpoint.blockNumber", "Block number is invalid.");
  if (!HASH_PATTERN.test(payload.checkpoint.blockHash)) fail("invalid_block_hash", "$input.checkpoint.blockHash", "Block hash is invalid.");
  nonNegativeInteger(payload.checkpoint.confirmations, "$input.checkpoint.confirmations");
  if (payload.checkpoint.finality !== "finalized") fail("checkpoint_not_finalized", "$input.checkpoint.finality", "Forecast input requires a finalized checkpoint.");
  if (payload.checkpoint.liquidityVerification !== "independent_rpc") fail("liquidity_not_verified", "$input.checkpoint.liquidityVerification", "Opening liquidity must be independently verified at the checkpoint block.");

  exactKeys(payload.reservePolicy, { required: ["version", "status", "approvedAt", "reserveTargetRaw"] }, "$input.reservePolicy");
  nonEmptyString(payload.reservePolicy.version, "$input.reservePolicy.version", 100);
  if (payload.reservePolicy.status !== "approved") fail("reserve_policy_not_approved", "$input.reservePolicy.status", "Reserve policy must be approved.");
  const reserveApprovedAt = dateTime(payload.reservePolicy.approvedAt, "$input.reservePolicy.approvedAt");
  if (reserveApprovedAt.timestamp > generatedAt.timestamp) fail("policy_approval_after_snapshot", "$input.reservePolicy.approvedAt", "Reserve policy approval cannot follow snapshot generation.");
  const reserveTarget = atomic(payload.reservePolicy.reserveTargetRaw, "$input.reservePolicy.reserveTargetRaw");

  exactKeys(payload.forecastPolicy, {
    required: ["version", "status", "approvedAt", "scenario", "unconfirmedFutureInflow"],
  }, "$input.forecastPolicy");
  nonEmptyString(payload.forecastPolicy.version, "$input.forecastPolicy.version", 100);
  if (payload.forecastPolicy.status !== "approved") fail("forecast_policy_not_approved", "$input.forecastPolicy.status", "Forecast policy must be approved.");
  const forecastApprovedAt = dateTime(payload.forecastPolicy.approvedAt, "$input.forecastPolicy.approvedAt");
  if (forecastApprovedAt.timestamp > generatedAt.timestamp) fail("policy_approval_after_snapshot", "$input.forecastPolicy.approvedAt", "Forecast policy approval cannot follow snapshot generation.");
  if (payload.forecastPolicy.scenario !== "committed") fail("invalid_forecast_scenario", "$input.forecastPolicy.scenario", "Provider input must use committed obligations.");
  if (payload.forecastPolicy.unconfirmedFutureInflow !== "exclude") fail("unconfirmed_inflow_not_excluded", "$input.forecastPolicy.unconfirmedFutureInflow", "Unconfirmed future inflow must be excluded.");

  const openingLiquidity = atomic(payload.openingLiquidityRaw, "$input.openingLiquidityRaw");
  if (!Array.isArray(payload.buckets) || payload.buckets.length < 1 || payload.buckets.length > 366) {
    fail("invalid_buckets", "$input.buckets", "Forecast input must contain 1 to 366 buckets.");
  }

  const bucketIds = new Set();
  let previousEnd = null;
  const buckets = payload.buckets.map((bucket, index) => {
    const path = `$input.buckets[${index}]`;
    exactKeys(bucket, {
      required: [
        "id",
        "bucketStart",
        "bucketEnd",
        "cycleCount",
        "pendingPartnerCreationCount",
        "principalDueRaw",
        "grossDelta",
        "partnerRewardStreamed",
        "pendingPartnerRewardAtCreation",
        "confirmedInflowRaw",
        "inflowEvidence",
        "sourceRefs",
      ],
    }, path);
    if (!UUID_PATTERN.test(bucket.id) || bucketIds.has(bucket.id)) fail("invalid_bucket_id", `${path}.id`, "Bucket ID must be a unique UUID.");
    bucketIds.add(bucket.id);
    const start = dateTime(bucket.bucketStart, `${path}.bucketStart`);
    const end = dateTime(bucket.bucketEnd, `${path}.bucketEnd`);
    if (start.timestamp < asOf.timestamp || start.timestamp >= end.timestamp) fail("invalid_bucket_range", path, "Bucket range is invalid or precedes the checkpoint.");
    if (index === 0 && start.timestamp !== asOf.timestamp) fail("non_contiguous_buckets", path, "The first forecast bucket must start at checkpoint.asOf.");
    if (previousEnd !== null && start.timestamp !== previousEnd) fail("non_contiguous_buckets", path, "Forecast buckets must be ordered and contiguous.");
    previousEnd = end.timestamp;
    const cycleCount = nonNegativeInteger(bucket.cycleCount, `${path}.cycleCount`, MAX_BUCKET_OBJECT_COUNT);
    const pendingPartnerCreationCount = nonNegativeInteger(bucket.pendingPartnerCreationCount, `${path}.pendingPartnerCreationCount`, MAX_BUCKET_OBJECT_COUNT);
    const principal = atomic(bucket.principalDueRaw, `${path}.principalDueRaw`);
    const delta = component(bucket.grossDelta, `${path}.grossDelta`);
    const partnerStreamed = component(bucket.partnerRewardStreamed, `${path}.partnerRewardStreamed`);
    const partnerCreation = component(bucket.pendingPartnerRewardAtCreation, `${path}.pendingPartnerRewardAtCreation`);
    const confirmedInflow = atomic(bucket.confirmedInflowRaw, `${path}.confirmedInflowRaw`);
    const inflowEvidence = uniqueStrings(bucket.inflowEvidence, `${path}.inflowEvidence`, { maxItems: 100 });
    const sourceRefs = uniqueStrings(bucket.sourceRefs, `${path}.sourceRefs`, { minItems: 1 });
    const cycleOutflow = principal + delta.gross + partnerStreamed.gross;
    if (cycleOutflow > 0n && cycleCount === 0) fail("missing_cycle_count", `${path}.cycleCount`, "Non-zero cycle obligations require cycleCount.");
    if (partnerCreation.gross > 0n && pendingPartnerCreationCount === 0) fail("missing_pending_partner_count", `${path}.pendingPartnerCreationCount`, "Pending partner creation obligations require a count.");
    if (confirmedInflow > 0n && inflowEvidence.length === 0) fail("missing_inflow_evidence", `${path}.inflowEvidence`, "Confirmed inflow requires evidence.");
    return {
      id: bucket.id,
      bucketStart: start.iso,
      bucketEnd: end.iso,
      cycleCount,
      pendingPartnerCreationCount,
      principal,
      delta,
      partnerStreamed,
      partnerCreation,
      confirmedInflow,
      inflowEvidence,
      sourceRefs,
    };
  });
  if (previousEnd - asOf.timestamp > MAX_HORIZON_MS) fail("forecast_horizon_too_large", "$input.buckets", "Forecast horizon cannot exceed 90 days.");
  if (previousEnd - asOf.timestamp < MAX_HORIZON_MS) fail("forecast_horizon_incomplete", "$input.buckets", "Forecast input must cover the full 90-day horizon.");
  const bucketEnds = new Set(buckets.map((bucket) => Date.parse(bucket.bucketEnd)));
  const requiredCuts = [1, 7, 30, 90].map((days) => asOf.timestamp + days * 24 * 60 * 60 * 1000);
  if (requiredCuts.some((cut) => !bucketEnds.has(cut))) {
    fail("forecast_horizon_boundary_missing", "$input.buckets", "Buckets must end exactly at 24h, 7d, 30d and 90d horizon boundaries.");
  }

  return {
    sourceSnapshotId: payload.sourceSnapshotId,
    generatedAt: generatedAt.iso,
    payoutContractAddress,
    token,
    checkpoint: {
      chainId: payload.checkpoint.chainId,
      asOf: asOf.iso,
      blockNumber: payload.checkpoint.blockNumber,
      blockHash: payload.checkpoint.blockHash.toLowerCase(),
      confirmations: payload.checkpoint.confirmations,
    },
    reservePolicy: { version: payload.reservePolicy.version, reserveTarget },
    forecastPolicy: { version: payload.forecastPolicy.version },
    openingLiquidity,
    buckets,
  };
}

export function buildForecastProjection(payload) {
  const input = validateForecastInput(payload);
  const snapshotId = deterministicUuid(canonicalJson(payload));
  let opening = input.openingLiquidity;
  let totalOutflow = 0n;
  let peakExposure = 0n;
  let peakExposureAt = null;
  let peakFundingGap = 0n;
  let firstBreachAt = null;

  const buckets = input.buckets.map((bucket) => {
    const total = bucket.principal + bucket.delta.gross + bucket.partnerStreamed.gross + bucket.partnerCreation.gross;
    const closing = opening + bucket.confirmedInflow - total;
    const gap = closing < input.reservePolicy.reserveTarget ? input.reservePolicy.reserveTarget - closing : 0n;
    if (total > peakExposure) {
      peakExposure = total;
      peakExposureAt = bucket.bucketStart;
    }
    if (gap > peakFundingGap) peakFundingGap = gap;
    if (gap > 0n && firstBreachAt === null) firstBreachAt = bucket.bucketStart;
    totalOutflow += total;
    const row = {
      id: bucket.id,
      snapshotId,
      bucketStart: bucket.bucketStart,
      bucketEnd: bucket.bucketEnd,
      cycleCount: bucket.cycleCount,
      principalDue: wireMoney(bucket.principal, input.token),
      grossDeltaDue: wireMoney(bucket.delta.gross, input.token),
      partnerRewardDue: wireMoney(bucket.partnerStreamed.gross, input.token),
      pendingPartnerCreationDue: wireMoney(bucket.partnerCreation.gross, input.token),
      totalOutflowDue: wireMoney(total, input.token),
      expectedInflow: wireMoney(bucket.confirmedInflow, input.token),
      openingLiquidity: wireMoney(opening, input.token),
      closingLiquidity: wireMoney(closing, input.token),
      reserveTarget: wireMoney(input.reservePolicy.reserveTarget, input.token),
      fundingGap: wireMoney(gap, input.token),
    };
    opening = closing;
    return row;
  });

  const horizonAmount = (milliseconds) => buckets
    .filter((bucket) => Date.parse(bucket.bucketStart) < Date.parse(input.checkpoint.asOf) + milliseconds)
    .reduce((sum, bucket) => sum + BigInt(bucket.totalOutflowDue.amountRaw), 0n);
  const horizonCycles = (milliseconds) => buckets
    .filter((bucket) => Date.parse(bucket.bucketStart) < Date.parse(input.checkpoint.asOf) + milliseconds)
    .reduce((sum, bucket) => sum + bucket.cycleCount, 0);
  const horizonEnd = buckets.at(-1).bucketEnd;
  const horizonDefinitions = [
    ["24h", 24 * 60 * 60 * 1000],
    ["7d", 7 * 24 * 60 * 60 * 1000],
    ["30d", 30 * 24 * 60 * 60 * 1000],
    ["90d", 90 * 24 * 60 * 60 * 1000],
  ];
  return {
    snapshot: {
      id: snapshotId,
      scenario: "committed",
      perimeter: "payout_contract",
      payoutContractAddress: input.payoutContractAddress,
      status: "valid",
      asOf: input.checkpoint.asOf,
      horizonEnd,
      generatedAt: input.generatedAt,
      sourceWatermark: input.generatedAt,
      sourceSnapshotId: input.sourceSnapshotId,
      asOfBlockNumber: input.checkpoint.blockNumber,
      asOfBlockHash: input.checkpoint.blockHash,
      chainId: input.checkpoint.chainId,
      modelVersion: input.forecastPolicy.version,
      reservePolicyVersion: input.reservePolicy.version,
      openingLiquidity: wireMoney(input.openingLiquidity, input.token),
      reserveTarget: wireMoney(input.reservePolicy.reserveTarget, input.token),
      totalOutflow: wireMoney(totalOutflow, input.token),
      peakExposure: wireMoney(peakExposure, input.token),
      peakExposureAt,
      peakFundingGap: wireMoney(peakFundingGap, input.token),
      firstBreachAt,
      minimumCoverageRatio: fixedRatio(input.openingLiquidity, totalOutflow),
      horizons: horizonDefinitions.map(([id, milliseconds]) => ({
        id,
        to: new Date(Math.min(Date.parse(horizonEnd), Date.parse(input.checkpoint.asOf) + milliseconds)).toISOString(),
        cycleCount: horizonCycles(milliseconds),
        totalOutflow: wireMoney(horizonAmount(milliseconds), input.token),
      })),
    },
    buckets,
  };
}
