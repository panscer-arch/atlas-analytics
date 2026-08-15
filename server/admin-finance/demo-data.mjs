import { buildReserveNotificationCommands } from "./reserve-alert-outbox.mjs";

const TOKEN_ADDRESS = "0x0000000000000000000000000000000000000001";
const TOKEN_DECIMALS = 6;

function formatAtomic(amountRaw, decimals = TOKEN_DECIMALS) {
  const value = String(amountRaw);
  const negative = value.startsWith("-");
  const digits = negative ? value.slice(1) : value;
  const padded = digits.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals) || "0";
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function money(amountRaw) {
  return {
    amountRaw: String(amountRaw),
    decimals: TOKEN_DECIMALS,
    tokenAddress: TOKEN_ADDRESS,
    symbol: "USDT",
    displayAmount: formatAtomic(amountRaw),
  };
}

export const demoSnapshot = Object.freeze({
  asOfBlockNumber: 54721008,
  asOfBlockHash: "0x74ab19d274ab19d274ab19d274ab19d274ab19d274ab19d274ab19d274ab19d2",
  generatedAt: "2026-08-05T09:00:00Z",
  formulaVersion: "demo-finance-v1",
  rulesetVersion: "demo-rules-v1",
});

const consolidatedCashMovementRows = [
  {
    bucketStart: "2026-08-01T00:00:00Z",
    bucketEnd: "2026-08-02T00:00:00Z",
    externalIn: money("3590000000"),
    externalOut: money("1840000000"),
    netFlow: money("1750000000"),
    internalTransfersEliminated: money("320000000"),
  },
  {
    bucketStart: "2026-08-02T00:00:00Z",
    bucketEnd: "2026-08-03T00:00:00Z",
    externalIn: money("3720000000"),
    externalOut: money("2070000000"),
    netFlow: money("1650000000"),
    internalTransfersEliminated: money("410000000"),
  },
  {
    bucketStart: "2026-08-03T00:00:00Z",
    bucketEnd: "2026-08-04T00:00:00Z",
    externalIn: money("3340000000"),
    externalOut: money("1940000000"),
    netFlow: money("1400000000"),
    internalTransfersEliminated: money("280000000"),
  },
  {
    bucketStart: "2026-08-04T00:00:00Z",
    bucketEnd: "2026-08-05T00:00:00Z",
    externalIn: money("3410000000"),
    externalOut: money("1880000000"),
    netFlow: money("1530000000"),
    internalTransfersEliminated: money("360000000"),
  },
];

function addMoney(left, right) {
  return money(BigInt(left.amountRaw) + BigInt(right.amountRaw));
}

function subtractMoney(left, right) {
  return money(BigInt(left.amountRaw) - BigInt(right.amountRaw));
}

const payoutContractCashMovementRows = consolidatedCashMovementRows.map((row) => {
  const contractOut = addMoney(row.externalOut, row.internalTransfersEliminated);
  return {
    ...row,
    externalOut: contractOut,
    netFlow: subtractMoney(row.externalIn, contractOut),
  };
});

const treasuryDailyReceipts = ["205000000", "220000000", "196000000", "208000000"];
const companyTreasuryCashMovementRows = consolidatedCashMovementRows.map((row, index) => ({
  bucketStart: row.bucketStart,
  bucketEnd: row.bucketEnd,
  externalIn: money(treasuryDailyReceipts[index]),
  externalOut: money("0"),
  netFlow: money(treasuryDailyReceipts[index]),
  internalTransfersEliminated: money("0"),
}));

export const cashMovementRowsByPerimeter = Object.freeze({
  atlas_consolidated: Object.freeze(consolidatedCashMovementRows),
  payout_contract: Object.freeze(payoutContractCashMovementRows),
  company_treasury: Object.freeze(companyTreasuryCashMovementRows),
});

// Backwards-compatible fixture used by the existing pagination contract tests.
export const cashMovementRows = cashMovementRowsByPerimeter.atlas_consolidated;

export const cycleRows = Object.freeze([
  {
    id: "20000000-0000-4000-8000-000000000001",
    productKey: "daily_200_100",
    label: "Daily 200 · $100",
    status: "open",
    openedCount: 428,
    openCount: 108,
    closedCount: 320,
    claimableCount: 12,
    termEndedCount: 3,
    principal: money("10800000000"),
    grossDeltaPaid: money("8960000000"),
    projectedMaturityOutflow: money("12420000000"),
    claimableNow: money("1180000000"),
    next7DaysLoad: money("5860000000"),
    next30DaysLoad: money("10240000000"),
    rulesetVersion: "demo-cycle-v3.2",
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    productKey: "lockup_30_100",
    label: "Lockup 30 · $100",
    status: "open",
    openedCount: 125,
    openCount: 42,
    closedCount: 83,
    claimableCount: 4,
    termEndedCount: 1,
    principal: money("4200000000"),
    grossDeltaPaid: money("3118000000"),
    projectedMaturityOutflow: money("8760000000"),
    claimableNow: money("620000000"),
    next7DaysLoad: money("3480000000"),
    next30DaysLoad: money("7210000000"),
    rulesetVersion: "demo-cycle-v2.4",
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    productKey: "daily_200_10000",
    label: "Daily 200 · $10,000",
    status: "open",
    openedCount: 10,
    openCount: 3,
    closedCount: 7,
    claimableCount: 1,
    termEndedCount: 0,
    principal: money("31380000000"),
    grossDeltaPaid: money("6410000000"),
    projectedMaturityOutflow: money("9804000000"),
    claimableNow: money("1200000000"),
    next7DaysLoad: money("1630000000"),
    next30DaysLoad: money("6890000000"),
    rulesetVersion: "demo-cycle-v1.1",
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    productKey: "launch",
    label: "Launch",
    status: "open",
    openedCount: 434,
    openCount: 420,
    closedCount: 14,
    claimableCount: 2,
    termEndedCount: 0,
    principal: money("420000000"),
    grossDeltaPaid: money("84000000"),
    projectedMaturityOutflow: money("820000000"),
    claimableNow: money("220000000"),
    next7DaysLoad: money("420000000"),
    next30DaysLoad: money("760000000"),
    rulesetVersion: "demo-cycle-v1.0",
  },
]);

export const financeOverview = Object.freeze({
  coverage: {
    from: "2026-07-29T00:00:00Z",
    to: "2026-08-05T00:00:00Z",
  },
  liquidity: {
    perimeter: "payout_contract",
    availableBalance: money("164739000000"),
    reserveSurplus: money("139739000000"),
  },
  obligations: {
    perimeter: "payout_contract",
    horizon: "P7D",
    eligibleExposure: money("31804000000"),
    peakExposure: money("12269000000"),
    peakExposureAt: "2026-08-11T00:00:00Z",
    peakFundingGap: money("0"),
    coverageRatio: "5.18",
    scenario: "committed",
    series: [
      ["2026-08-05T00:00:00Z", "2400000000", "930000000", "530000000", "0", "3860000000"],
      ["2026-08-06T00:00:00Z", "1710000000", "810000000", "430000000", "0", "2950000000"],
      ["2026-08-07T00:00:00Z", "2750000000", "1040000000", "570000000", "360000000", "4720000000"],
      ["2026-08-08T00:00:00Z", "1320000000", "510000000", "300000000", "0", "2130000000"],
      ["2026-08-09T00:00:00Z", "2020000000", "740000000", "525000000", "0", "3285000000"],
      ["2026-08-10T00:00:00Z", "1600000000", "620000000", "370000000", "0", "2590000000"],
      ["2026-08-11T00:00:00Z", "7100000000", "3150000000", "1600000000", "419000000", "12269000000"],
    ].map(([bucketStart, principal, grossDelta, partnerReward, pendingAtCreation, total]) => ({
      bucketStart,
      principal: money(principal),
      grossDelta: money(grossDelta),
      partnerReward: money(partnerReward),
      pendingAtCreation: money(pendingAtCreation),
      total: money(total),
    })),
  },
  cashFlow: {
    perimeter: "atlas_consolidated",
    inflow: money("18420000000"),
    outflow: money("5612000000"),
    netFlow: money("12808000000"),
    series: [
      ["2026-07-29T00:00:00Z", "2026-07-30T00:00:00Z", "2260000000", "640000000", "1620000000"],
      ["2026-07-30T00:00:00Z", "2026-07-31T00:00:00Z", "2410000000", "720000000", "1690000000"],
      ["2026-07-31T00:00:00Z", "2026-08-01T00:00:00Z", "2510000000", "742000000", "1768000000"],
      ["2026-08-01T00:00:00Z", "2026-08-02T00:00:00Z", "2590000000", "780000000", "1810000000"],
      ["2026-08-02T00:00:00Z", "2026-08-03T00:00:00Z", "2720000000", "830000000", "1890000000"],
      ["2026-08-03T00:00:00Z", "2026-08-04T00:00:00Z", "2840000000", "900000000", "1940000000"],
      ["2026-08-04T00:00:00Z", "2026-08-05T00:00:00Z", "3090000000", "1000000000", "2090000000"],
    ].map(([bucketStart, bucketEnd, inflow, outflow, netFlow]) => ({
      bucketStart,
      bucketEnd,
      inflow: money(inflow),
      outflow: money(outflow),
      netFlow: money(netFlow),
    })),
  },
  cycles: {
    perimeter: "participant_economics",
    rows: [
      ["daily_200_100", "Daily 200 · $100", 108, "10800000000", 5860, "12420000000", "medium"],
      ["lockup_30_100", "Lockup 30 · $100", 42, "4200000000", 2280, "8760000000", "normal"],
      ["daily_200_10000", "Daily 200 · $10,000", 3, "3000000000", 1630, "9804000000", "concentration"],
      ["launch", "Launch", 420, "420000000", 230, "820000000", "normal"],
    ].map(([productKey, label, openedCount, inflow, shareBps, payoutDue, risk]) => ({
      productKey,
      label,
      openedCount,
      inflow: money(inflow),
      shareBps,
      payoutDue: money(payoutDue),
      risk,
    })),
  },
  companyRevenue: {
    perimeter: "company_treasury",
    total: money("829000000"),
    platformFee: money("625000000"),
    headAccount: money("204000000"),
    cashTakeRatePercent: "4.50",
    components: [
      { type: "platform_fee_delta", label: "Fee с Delta", amount: money("486000000"), color: "#ff8716" },
      { type: "platform_fee_partner", label: "Fee с партнерки", amount: money("139000000"), color: "#f6b92f" },
      { type: "head_account", label: "Head Account", amount: money("204000000"), color: "#4e76d0" },
    ],
  },
});

const FORECAST_OPENING_LIQUIDITY_RAW = 164739000000n;
const FORECAST_RESERVE_TARGET_RAW = 25000000000n;
const FORECAST_SNAPSHOT_IDS = {
  stress: "80000000-0000-4000-8000-000000000001",
  committed: "80000000-0000-4000-8000-000000000002",
};

const forecastBucketInputs = [
  ["2026-08-05T00:00:00Z", "2026-08-06T00:00:00Z", 12, 3860000000n],
  ["2026-08-06T00:00:00Z", "2026-08-07T00:00:00Z", 9, 2950000000n],
  ["2026-08-07T00:00:00Z", "2026-08-08T00:00:00Z", 14, 4720000000n],
  ["2026-08-08T00:00:00Z", "2026-08-09T00:00:00Z", 7, 2130000000n],
  ["2026-08-09T00:00:00Z", "2026-08-10T00:00:00Z", 11, 3285000000n],
  ["2026-08-10T00:00:00Z", "2026-08-11T00:00:00Z", 8, 2590000000n],
  ["2026-08-11T00:00:00Z", "2026-08-12T00:00:00Z", 22, 12269000000n],
  ["2026-08-12T00:00:00Z", "2026-08-19T00:00:00Z", 34, 17830000000n],
  ["2026-08-19T00:00:00Z", "2026-08-26T00:00:00Z", 31, 14920000000n],
  ["2026-08-26T00:00:00Z", "2026-09-02T00:00:00Z", 28, 13110000000n],
  ["2026-09-02T00:00:00Z", "2026-09-09T00:00:00Z", 27, 12600000000n],
  ["2026-09-09T00:00:00Z", "2026-09-16T00:00:00Z", 29, 13475000000n],
  ["2026-09-16T00:00:00Z", "2026-09-30T00:00:00Z", 25, 11800000000n],
  ["2026-09-30T00:00:00Z", "2026-10-14T00:00:00Z", 21, 10000000000n],
  ["2026-10-14T00:00:00Z", "2026-10-28T00:00:00Z", 19, 9800000000n],
  ["2026-10-28T00:00:00Z", "2026-11-03T00:00:00Z", 17, 9041000000n],
];

function buildStressForecast() {
  const scenario = "stress";
  let opening = FORECAST_OPENING_LIQUIDITY_RAW;
  const buckets = forecastBucketInputs.map(([bucketStart, bucketEnd, cycleCount, stressTotal], index) => {
    const total = stressTotal;
    const principal = total * 65n / 100n;
    const grossDelta = total * 22n / 100n;
    const partnerReward = total - principal - grossDelta;
    const closing = opening - total;
    const fundingGap = closing < FORECAST_RESERVE_TARGET_RAW ? FORECAST_RESERVE_TARGET_RAW - closing : 0n;
    const row = {
      id: `81000000-0000-4000-8000-${String(index + (scenario === "stress" ? 1 : 101)).padStart(12, "0")}`,
      snapshotId: FORECAST_SNAPSHOT_IDS[scenario],
      bucketStart,
      bucketEnd,
      cycleCount,
      principalDue: money(principal),
      grossDeltaDue: money(grossDelta),
      partnerRewardDue: money(partnerReward),
      pendingPartnerCreationDue: money("0"),
      totalOutflowDue: money(total),
      expectedInflow: money("0"),
      openingLiquidity: money(opening),
      closingLiquidity: money(closing),
      reserveTarget: money(FORECAST_RESERVE_TARGET_RAW),
      fundingGap: money(fundingGap),
      confidenceLow: money(total * 92n / 100n),
      confidenceHigh: money(total * 108n / 100n),
    };
    opening = closing;
    return row;
  });

  const sumUntil = (to) => buckets
    .filter((row) => Date.parse(row.bucketStart) < Date.parse(to))
    .reduce((sum, row) => sum + BigInt(row.totalOutflowDue.amountRaw), 0n);
  const cycleCountUntil = (to) => buckets
    .filter((row) => Date.parse(row.bucketStart) < Date.parse(to))
    .reduce((sum, row) => sum + row.cycleCount, 0);
  const peakBucket = buckets.reduce((peak, row) => BigInt(row.totalOutflowDue.amountRaw) > BigInt(peak.totalOutflowDue.amountRaw) ? row : peak, buckets[0]);
  const gapBuckets = buckets.filter((row) => BigInt(row.fundingGap.amountRaw) > 0n);
  const peakGapBucket = gapBuckets.reduce((peak, row) => !peak || BigInt(row.fundingGap.amountRaw) > BigInt(peak.fundingGap.amountRaw) ? row : peak, null);
  const total = buckets.reduce((sum, row) => sum + BigInt(row.totalOutflowDue.amountRaw), 0n);
  const minimumCoverage = total === 0n ? null : (Number(FORECAST_OPENING_LIQUIDITY_RAW) / Number(total)).toFixed(2);

  const snapshot = {
    id: FORECAST_SNAPSHOT_IDS[scenario],
    scenario,
    perimeter: "payout_contract",
    status: "partial",
    asOf: "2026-08-05T00:00:00Z",
    horizonEnd: "2026-11-03T00:00:00Z",
    generatedAt: demoSnapshot.generatedAt,
    sourceWatermark: "2026-08-05T08:58:00Z",
    modelVersion: "demo-cash-forecast-v1",
    modelCommit: "demo-forecast-20260805",
    openingLiquidity: money(FORECAST_OPENING_LIQUIDITY_RAW),
    reserveTarget: money(FORECAST_RESERVE_TARGET_RAW),
    totalOutflow: money(total),
    peakExposure: peakBucket.totalOutflowDue,
    peakExposureAt: peakBucket.bucketStart,
    peakFundingGap: peakGapBucket?.fundingGap || money("0"),
    firstBreachAt: gapBuckets[0]?.bucketStart || null,
    minimumCoverageRatio: minimumCoverage,
    horizons: [
      ["24h", "2026-08-06T00:00:00Z"],
      ["7d", "2026-08-12T00:00:00Z"],
      ["30d", "2026-09-04T00:00:00Z"],
      ["90d", "2026-11-03T00:00:00Z"],
    ].map(([id, to]) => ({ id, to, cycleCount: cycleCountUntil(to), totalOutflow: money(sumUntil(to)) })),
    unavailableScenarios: scenario === "stress" ? [{ scenario: "base", reason: "claim_delay_not_calibrated" }] : [],
  };
  return { snapshot: Object.freeze(snapshot), buckets: Object.freeze(buckets) };
}

const stressForecast = buildStressForecast();

export const forecastSnapshots = Object.freeze({
  stress: stressForecast.snapshot,
});

export const forecastBucketsBySnapshot = Object.freeze({
  [stressForecast.snapshot.id]: stressForecast.buckets,
});

const RESERVE_ALERT_ID = "91000000-0000-4000-8000-000000000001";
const firstBreachAt = stressForecast.snapshot.firstBreachAt;
const checkpointAt = (days) => new Date(Date.parse(firstBreachAt) - days * 24 * 60 * 60 * 1000).toISOString();
const reserveDeliveryCommands = buildReserveNotificationCommands({
  forecastSnapshotId: stressForecast.snapshot.id,
  alertId: RESERVE_ALERT_ID,
  minimumTopUpRaw: stressForecast.snapshot.peakFundingGap.amountRaw,
  generatedAt: demoSnapshot.generatedAt,
  checkpoints: [
    { id: "d-7", scheduledFor: checkpointAt(7) },
    { id: "d-3", scheduledFor: checkpointAt(3) },
    { id: "d-1", scheduledFor: checkpointAt(1) },
    { id: "breach", scheduledFor: firstBreachAt },
  ],
  channels: [
    { channel: "in_app", recipientRef: "role:finance", connected: true },
    { channel: "telegram", recipientRef: "secret-ref:finance-telegram", connected: false },
    { channel: "email", recipientRef: "group:finance", connected: false },
  ],
});

export const reserveFundingAlert = Object.freeze({
  id: RESERVE_ALERT_ID,
  sourceType: "reserve_funding_forecast",
  sourceId: stressForecast.snapshot.id,
  severity: "high",
  status: "open",
  title: "Требуется пополнение минимального резерва",
  observedValue: stressForecast.snapshot.peakFundingGap.displayAmount,
  threshold: stressForecast.snapshot.reserveTarget.displayAmount,
  owner: "Finance",
  deadline: firstBreachAt,
  createdAt: demoSnapshot.generatedAt,
  formulaVersion: stressForecast.snapshot.modelVersion,
  evidenceUrl: `/admin/forecast?snapshotId=${stressForecast.snapshot.id}`,
});

export const reserveAlertDeliveries = Object.freeze(reserveDeliveryCommands.map((command, index) => Object.freeze({
  id: `92000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  alertId: command.alertId,
  channel: command.channel,
  checkpoint: command.checkpoint.replace("-", "_"),
  recipientRef: command.recipientRef,
  status: command.status === "scheduled" ? "scheduled" : "blocked",
  scheduledFor: command.scheduledFor,
  deliveredAt: null,
  attemptCount: 0,
  lastErrorCode: command.status === "blocked_not_connected" ? "channel_not_connected" : null,
  idempotencyKey: command.idempotencyKey,
  attempts: [],
})));

const paidClaim = Object.freeze({
  id: "30000000-0000-4000-8000-000000000001",
  cycleId: "20000000-0000-4000-8000-000000000001",
  participantId: "40000000-0000-4000-8000-000000000001",
  status: "paid",
  eligibleAt: "2026-08-03T08:00:00Z",
  requestedAt: "2026-08-03T08:14:00Z",
  settledAt: "2026-08-03T08:16:00Z",
  failureCode: null,
  components: [
    {
      type: "principal",
      gross: money("100000000"),
      net: money("100000000"),
      platformFee: money("0"),
      otherDeductions: money("0"),
      transferIds: ["50000000-0000-4000-8000-000000000001"],
    },
    {
      type: "delta",
      gross: money("20000000"),
      net: money("18000000"),
      platformFee: money("2000000"),
      otherDeductions: money("0"),
      transferIds: ["50000000-0000-4000-8000-000000000002"],
    },
    {
      type: "partner_reward_streamed",
      gross: money("5000000"),
      net: money("4500000"),
      platformFee: money("500000"),
      otherDeductions: money("0"),
      transferIds: ["50000000-0000-4000-8000-000000000003"],
    },
  ],
});

export const claimRows = Object.freeze([
  paidClaim,
  {
    id: "30000000-0000-4000-8000-000000000002",
    cycleId: "20000000-0000-4000-8000-000000000002",
    participantId: "40000000-0000-4000-8000-000000000002",
    status: "pending",
    eligibleAt: "2026-08-05T07:00:00Z",
    requestedAt: "2026-08-05T07:20:00Z",
    settledAt: null,
    failureCode: null,
    components: [
      {
        type: "principal",
        gross: money("100000000"),
        net: money("100000000"),
        platformFee: money("0"),
        otherDeductions: money("0"),
        transferIds: [],
      },
      {
        type: "delta",
        gross: money("18000000"),
        net: money("16200000"),
        platformFee: money("1800000"),
        otherDeductions: money("0"),
        transferIds: [],
      },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    cycleId: "20000000-0000-4000-8000-000000000001",
    participantId: "40000000-0000-4000-8000-000000000003",
    status: "failed",
    eligibleAt: "2026-08-04T14:00:00Z",
    requestedAt: "2026-08-04T14:05:00Z",
    settledAt: null,
    failureCode: "RPC_TIMEOUT",
    components: [
      {
        type: "partner_reward_creation",
        gross: money("15000000"),
        net: money("13500000"),
        platformFee: money("1500000"),
        otherDeductions: money("0"),
        transferIds: [],
      },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    cycleId: "20000000-0000-4000-8000-000000000004",
    participantId: "40000000-0000-4000-8000-000000000004",
    status: "eligible",
    eligibleAt: "2026-08-05T10:00:00Z",
    requestedAt: null,
    settledAt: null,
    failureCode: null,
    components: [
      {
        type: "principal",
        gross: money("1000000"),
        net: money("1000000"),
        platformFee: money("0"),
        otherDeductions: money("0"),
        transferIds: [],
      },
      {
        type: "delta",
        gross: money("180000"),
        net: money("162000"),
        platformFee: money("18000"),
        otherDeductions: money("0"),
        transferIds: [],
      },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    cycleId: "20000000-0000-4000-8000-000000000002",
    participantId: "40000000-0000-4000-8000-000000000005",
    status: "requested",
    eligibleAt: "2026-08-05T06:00:00Z",
    requestedAt: "2026-08-05T08:12:00Z",
    settledAt: null,
    failureCode: null,
    components: [
      {
        type: "principal",
        gross: money("100000000"),
        net: money("100000000"),
        platformFee: money("0"),
        otherDeductions: money("0"),
        transferIds: [],
      },
      {
        type: "delta",
        gross: money("40000000"),
        net: money("36000000"),
        platformFee: money("4000000"),
        otherDeductions: money("0"),
        transferIds: [],
      },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000006",
    cycleId: "20000000-0000-4000-8000-000000000003",
    participantId: "40000000-0000-4000-8000-000000000006",
    status: "reversed",
    eligibleAt: "2026-08-02T09:00:00Z",
    requestedAt: "2026-08-02T09:30:00Z",
    settledAt: "2026-08-02T10:05:00Z",
    failureCode: "SOURCE_EVENT_REVERSED",
    components: [
      {
        type: "delta",
        gross: money("96000000"),
        net: money("86400000"),
        platformFee: money("9600000"),
        otherDeductions: money("0"),
        transferIds: [],
      },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000007",
    cycleId: "20000000-0000-4000-8000-000000000001",
    participantId: "40000000-0000-4000-8000-000000000007",
    status: "expired",
    eligibleAt: "2026-08-01T11:00:00Z",
    requestedAt: null,
    settledAt: "2026-08-04T11:00:00Z",
    failureCode: "CLAIM_WINDOW_EXPIRED",
    components: [
      {
        type: "partner_reward_streamed",
        gross: money("5000000"),
        net: money("4500000"),
        platformFee: money("500000"),
        otherDeductions: money("0"),
        transferIds: [],
      },
    ],
  },
]);

export const participantSearchAliases = Object.freeze([
  "40000000-0000-4000-8000-000000000001",
  "a-2049",
  "atlas-a2049",
  "https://atlas-system.space/ref/atlas-a2049",
  "0x71a4c8f200000000000000000000000000009b2f",
  "#333",
]);

export const participantProfile = Object.freeze({
  id: "40000000-0000-4000-8000-000000000001",
  atlasId: "A-2049",
  referralCode: "atlas-a2049",
  headAccountBranchOrdinal: 333,
  maskedWallet: "0x71A4…9B2F",
  walletRevealAvailable: false,
  status: "active",
  currentRank: "master_2",
  currentRankLabel: "Master 2",
  registeredAt: "2026-06-18T09:20:00Z",
  sponsor: {
    participantId: "40000000-0000-4000-8000-000000000008",
    atlasId: "A-1001",
    maskedWallet: "0x90C1…4AA0",
  },
  firstLine: {
    participantCount: 28,
    walletsWithCycles: 21,
    principal: money("31420000000"),
    activeCycles: 11,
    closedCycles: 38,
    payouts: money("6110000000"),
  },
  structure: {
    participantCount: 413,
    maxDepth: 7,
    principal: money("84600000000"),
    activeCycles: 71,
    closedCycles: 296,
    payouts: money("12842000000"),
  },
  received: {
    total: money("12842000000"),
    deltaNet: money("3912000000"),
    partnerRewardCreationNet: money("6820000000"),
    partnerRewardClaimNet: money("2110000000"),
  },
  futureObligations: money("7340000000"),
  activity: {
    lastOnchainAt: "2026-08-05T08:42:00Z",
    lastCabinetAt: "2026-08-05T08:55:00Z",
  },
  protectedResources: {
    notes: "unavailable",
    companyFunding: "unavailable",
    kpiPlans: "unavailable",
    walletReveal: "unavailable",
  },
});

export const participantFirstLineRows = Object.freeze([
  {
    participantId: "40000000-0000-4000-8000-000000000002",
    atlasId: "A-2914",
    maskedWallet: "0x8F21…A104",
    status: "active",
    rankLabel: "Master 1",
    principal: money("6400000000"),
    cycleCount: 8,
    activeCycleCount: 4,
    partnerReceived: money("1280000000"),
    deltaReceived: money("640000000"),
    lastActivityAt: "2026-08-05T08:18:00Z",
    riskState: "none",
  },
  {
    participantId: "40000000-0000-4000-8000-000000000003",
    atlasId: "A-3018",
    maskedWallet: "0x2C09…71D8",
    status: "active",
    rankLabel: "Start",
    principal: money("4200000000"),
    cycleCount: 6,
    activeCycleCount: 3,
    partnerReceived: money("690000000"),
    deltaReceived: money("420000000"),
    lastActivityAt: "2026-08-04T17:20:00Z",
    riskState: "none",
  },
  {
    participantId: "40000000-0000-4000-8000-000000000004",
    atlasId: "A-3361",
    maskedWallet: "0xA730…4B29",
    status: "inactive",
    rankLabel: "Start",
    principal: money("3800000000"),
    cycleCount: 4,
    activeCycleCount: 0,
    partnerReceived: money("320000000"),
    deltaReceived: money("190000000"),
    lastActivityAt: "2026-07-27T12:00:00Z",
    riskState: "inactive_9d",
  },
  {
    participantId: "40000000-0000-4000-8000-000000000005",
    atlasId: "A-3480",
    maskedWallet: "0x44E1…0F62",
    status: "active",
    rankLabel: "Start",
    principal: money("2900000000"),
    cycleCount: 3,
    activeCycleCount: 2,
    partnerReceived: money("180000000"),
    deltaReceived: money("145000000"),
    lastActivityAt: "2026-08-03T15:31:00Z",
    riskState: "none",
  },
]);

export const liquidityRollForward = Object.freeze({
  summary: {
    openingBalance: money("19640000000"),
    externalIn: money("18420000000"),
    externalOut: money("16890000000"),
    internalTreasuryTransfers: money("3390000000"),
    calculatedClosing: money("17780000000"),
    canonicalClosing: money("17775000000"),
    residual: money("-5000000"),
  },
  buckets: [
    {
      bucketStart: "2026-08-01T00:00:00Z",
      bucketEnd: "2026-08-02T00:00:00Z",
      openingBalance: money("19640000000"),
      externalIn: money("3590000000"),
      externalOut: money("1840000000"),
      closingBalance: money("21390000000"),
    },
    {
      bucketStart: "2026-08-02T00:00:00Z",
      bucketEnd: "2026-08-03T00:00:00Z",
      openingBalance: money("21390000000"),
      externalIn: money("3720000000"),
      externalOut: money("2070000000"),
      closingBalance: money("23040000000"),
    },
  ],
});

export const reconciliationRuns = Object.freeze([
  {
    id: "60000000-0000-4000-8000-000000000001",
    status: "exception",
    perimeter: "payout_contract",
    fromBlock: 54720000,
    toBlock: demoSnapshot.asOfBlockNumber,
    expectedClosing: money("17780000000"),
    observedClosing: money("17775000000"),
    residual: money("-5000000"),
    startedAt: "2026-08-05T08:58:18Z",
    completedAt: "2026-08-05T09:00:00Z",
    modelCommit: "demo-reconciliation-1",
  },
]);

export const reconciliationExceptions = Object.freeze([
  {
    id: "70000000-0000-4000-8000-000000000001",
    type: "amount_mismatch",
    severity: "critical",
    status: "open",
    sourceRef: "pay_7f21_demo",
    amount: money("5000000"),
    reason: "Gross does not equal linked transfers.",
    owner: "Finance Ops",
    openedAt: "2026-08-05T06:46:00Z",
  },
  {
    id: "70000000-0000-4000-8000-000000000002",
    type: "orphan_transfer",
    severity: "critical",
    status: "open",
    sourceRef: "transfer_18bc_demo",
    amount: money("84600000"),
    reason: "Transfer is not linked to an economic payout.",
    owner: "Chain Ops",
    openedAt: "2026-08-05T02:42:00Z",
  },
  {
    id: "70000000-0000-4000-8000-000000000003",
    type: "unknown_ruleset",
    severity: "high",
    status: "open",
    sourceRef: "cycle_32041_demo",
    amount: money("0"),
    reason: "Implementation hash is missing an effective block range.",
    owner: "Protocol",
    openedAt: "2026-08-05T08:12:00Z",
  },
  {
    id: "70000000-0000-4000-8000-000000000004",
    type: "reorg",
    severity: "medium",
    status: "acknowledged",
    sourceRef: "block_54721012_demo",
    amount: money("95000000"),
    reason: "Parent hash changed; canonical projection rebuild is pending.",
    owner: "Indexer",
    openedAt: "2026-08-05T08:53:00Z",
  },
]);

export const gateZeroDecisions = Object.freeze([
  ["G0-01", "Contract and implementation registry"],
  ["G0-02", "Controlled addresses and perimeters"],
  ["G0-03", "Financial rulesets"],
  ["G0-04", "Cycle and claim lifecycle"],
  ["G0-05", "Finality and reorg policy"],
  ["G0-06", "data.atlas-system.io contract"],
  ["G0-07", "Source-of-truth matrix"],
  ["G0-08", "Reserve and forecast policy"],
  ["G0-09", "Data-state semantics"],
  ["G0-10", "Admin access model"],
  ["G0-11", "Retention, audit and exports"],
  ["G0-12", "Canonical Admin API"],
  ["G0-13", "Money wire format"],
  ["G0-14", "Backup and restore"],
].map(([id, title]) => ({
  id,
  title,
  owner: "unassigned",
  approver: "unassigned",
  evidenceRequirement: "Versioned evidence and independent approval required.",
  status: "open",
  evidenceUrl: null,
  decidedAt: null,
})));

export const demoCapabilities = Object.freeze([
  "finance.flow.read",
  "finance.liquidity.read",
  "forecast.read",
  "cycles.read",
  "claims.read",
  "participants.read",
  "reconciliation.read",
  "methodology.read",
  "management.growth_plan.read",
  "finance.partner_economics.read",
  "finance.company_economics.read",
  "finance.platform_fees.read",
  "finance.company_receipts.read",
  "risks.read",
]);

const companyEconomicsSeries = Object.freeze([
  ["2026-07-29T00:00:00Z", "2026-07-30T00:00:00Z", 3073, 76, 21, 18, 11],
  ["2026-07-30T00:00:00Z", "2026-07-31T00:00:00Z", 2744, 69, 19, 19, 11],
  ["2026-07-31T00:00:00Z", "2026-08-01T00:00:00Z", 2650, 61, 17, 18, 10],
  ["2026-08-01T00:00:00Z", "2026-08-02T00:00:00Z", 2765, 86, 24, 20, 11],
  ["2026-08-02T00:00:00Z", "2026-08-03T00:00:00Z", 2625, 75, 22, 18, 11],
  ["2026-08-03T00:00:00Z", "2026-08-04T00:00:00Z", 2310, 55, 16, 16, 10],
  ["2026-08-04T00:00:00Z", "2026-08-05T00:00:00Z", 2253, 64, 20, 19, 12],
].map(([bucketStart, bucketEnd, incoming, feeDelta, feePartner, headCreation, headStreamed]) => {
  const scale = (value) => BigInt(value) * 1000000n;
  const platformFeeTotal = scale(feeDelta + feePartner);
  const headAccountIncome = scale(headCreation + headStreamed);
  const companyRevenue = platformFeeTotal + headAccountIncome;
  const incomingFlow = scale(incoming);
  return Object.freeze({
    bucketStart,
    bucketEnd,
    incomingFlow: money(incomingFlow),
    platformFeeFromDelta: money(scale(feeDelta)),
    platformFeeFromPartnerReward: money(scale(feePartner)),
    platformFeeTotal: money(platformFeeTotal),
    headAccountIncomeAtCreation: money(scale(headCreation)),
    headAccountIncomeStreamed: money(scale(headStreamed)),
    headAccountIncome: money(headAccountIncome),
    companyRevenue: money(companyRevenue),
    companyRevenueRateBasisPoints: Number(companyRevenue * 10000n / incomingFlow),
  });
}));

export const companyEconomics = Object.freeze({
  incomingFlow: money("18420000000"),
  platformFeeFromDelta: money("486000000"),
  platformFeeFromPartnerReward: money("139000000"),
  platformFeeTotal: money("625000000"),
  headAccountIncomeAtCreation: money("128000000"),
  headAccountIncomeStreamed: money("76000000"),
  headAccountIncome: money("204000000"),
  companyRevenue: money("829000000"),
  companyRevenueRateBasisPoints: 450,
  targetBasisPoints: 400,
  gapBasisPoints: 50,
  targetRevenue: money("736800000"),
  surplus: money("92200000"),
  shortfall: money("0"),
  attributionStatus: "partial",
  series: companyEconomicsSeries,
});

const demoTxHash = (seed) => `0x${String(seed).padStart(64, "0")}`;

export const platformFeeRows = Object.freeze([
  ["51000000-0000-4000-8000-000000000101", "2026-07-29T10:12:00Z", "delta_claim", "Daily 200 · $100", "1800000000", 1000, "180000000", 54718011, 101],
  ["51000000-0000-4000-8000-000000000102", "2026-07-30T11:05:00Z", "delta_claim", "Lockup 30 · $100", "1600000000", 1000, "160000000", 54718842, 102],
  ["51000000-0000-4000-8000-000000000103", "2026-07-31T13:44:00Z", "delta_claim", "Daily 200 · $10,000", "1460000000", 1000, "146000000", 54719670, 103],
  ["51000000-0000-4000-8000-000000000104", "2026-08-01T09:18:00Z", "partner_reward_creation", "Daily 200 · $100", "500000000", 1000, "50000000", 54720401, 104],
  ["51000000-0000-4000-8000-000000000105", "2026-08-02T15:22:00Z", "partner_reward_streamed", "Daily 200 · $100", "450000000", 1000, "45000000", 54721222, 105],
  ["51000000-0000-4000-8000-000000000106", "2026-08-03T17:08:00Z", "partner_reward_streamed", "Daily 200 · $10,000", "440000000", 1000, "44000000", 54722084, 106],
].map(([id, occurredAt, sourceMoment, cycleLabel, grossAmount, feeRateBasisPoints, platformFee, blockNumber, seed]) => Object.freeze({
  id,
  occurredAt,
  sourceMoment,
  cycleLabel,
  grossAmount: money(grossAmount),
  feeRateBasisPoints,
  platformFee: money(platformFee),
  allocationTxHash: demoTxHash(seed),
  treasuryReceiptTxHash: demoTxHash(seed + 1000),
  blockNumber,
  status: "received",
  reconciliationStatus: "exception",
})));

export const companyReceiptRows = Object.freeze([
  ...platformFeeRows.map((row, index) => Object.freeze({
    id: `52000000-0000-4000-8000-${String(index + 101).padStart(12, "0")}`,
    occurredAt: row.occurredAt,
    receiptType: row.sourceMoment === "delta_claim" ? "platform_fee_delta" : "platform_fee_partner",
    sourceEventId: row.id,
    cycleLabel: row.cycleLabel,
    amount: row.platformFee,
    txHash: row.treasuryReceiptTxHash,
    logIndex: index,
    blockNumber: row.blockNumber,
    finality: "finalized",
    reconciliationStatus: "exception",
  })),
  ...[
    ["52000000-0000-4000-8000-000000000201", "2026-07-29T12:30:00Z", "head_account_creation", "Daily 200 · $100", "70000000", 54718110, 201],
    ["52000000-0000-4000-8000-000000000202", "2026-08-01T14:08:00Z", "head_account_creation", "Lockup 30 · $100", "58000000", 54720518, 202],
    ["52000000-0000-4000-8000-000000000203", "2026-08-02T18:26:00Z", "head_account_streamed", "Daily 200 · $10,000", "40000000", 54721340, 203],
    ["52000000-0000-4000-8000-000000000204", "2026-08-04T08:44:00Z", "head_account_streamed", "Daily 200 · $100", "36000000", 54722896, 204],
  ].map(([id, occurredAt, receiptType, cycleLabel, amount, blockNumber, seed], index) => Object.freeze({
    id,
    occurredAt,
    receiptType,
    sourceEventId: null,
    cycleLabel,
    amount: money(amount),
    txHash: demoTxHash(seed + 2000),
    logIndex: index + 20,
    blockNumber,
    finality: "finalized",
    reconciliationStatus: "exception",
  })),
].sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt)));

const partnerEconomicsSeries = Object.freeze([
  ["2026-07-29T00:00:00Z", "2026-07-30T00:00:00Z", "70000000", "24500000"],
  ["2026-07-30T00:00:00Z", "2026-07-31T00:00:00Z", "80000000", "28000000"],
  ["2026-07-31T00:00:00Z", "2026-08-01T00:00:00Z", "75000000", "26250000"],
  ["2026-08-01T00:00:00Z", "2026-08-02T00:00:00Z", "90000000", "31500000"],
  ["2026-08-02T00:00:00Z", "2026-08-03T00:00:00Z", "85000000", "29750000"],
  ["2026-08-03T00:00:00Z", "2026-08-04T00:00:00Z", "80000000", "28000000"],
  ["2026-08-04T00:00:00Z", "2026-08-05T00:00:00Z", "102857142", "36000000"],
].map(([bucketStart, bucketEnd, grossPartnerRewardsPaid, atlasReferralIncome]) => Object.freeze({
  bucketStart,
  bucketEnd,
  grossPartnerRewardsPaid: money(grossPartnerRewardsPaid),
  atlasReferralIncome: money(atlasReferralIncome),
  captureRateBasisPoints: Number(BigInt(atlasReferralIncome) * 10000n / BigInt(grossPartnerRewardsPaid)),
})));

export const partnerEconomics = Object.freeze({
  grossPartnerRewardsPaid: money("582857142"),
  atlasReferralIncome: money("204000000"),
  atlasReferralIncomeAtCreation: money("128000000"),
  atlasReferralIncomeStreamed: money("76000000"),
  captureRateBasisPoints: 3500,
  targetBasisPoints: 3500,
  gapBasisPoints: 0,
  attributionStatus: "partial",
  series: partnerEconomicsSeries,
});

export const managementGrowthPlan = Object.freeze({
  id: "90000000-0000-4000-8000-000000000001",
  version: "growth-plan-2026.08-v1",
  status: "proposed",
  owner: "Finance",
  approvedBy: null,
  approvedAt: null,
  effectiveFrom: "2026-08-01",
  previousVersionId: null,
  monthlyGrowthBasisPoints: 4000,
  plannedCompanyRevenueBasisPoints: 400,
  dayBasis: "source_30_day_reference",
  source: "manual_management_scenario",
  months: Object.freeze([
    ["2026-08-01", "1500000000000", "50000000000", "60000000000"],
    ["2026-09-01", "2100000000000", "70000000000", "84000000000"],
    ["2026-10-01", "3000000000000", "100000000000", "120000000000"],
    ["2026-11-01", "4200000000000", "140000000000", "168000000000"],
    ["2026-12-01", "5800000000000", "190000000000", "232000000000"],
    ["2027-01-01", "8200000000000", "270000000000", "328000000000"],
    ["2027-02-01", "11300000000000", "380000000000", "452000000000"],
    ["2027-03-01", "16000000000000", "530000000000", "640000000000"],
    ["2027-04-01", "22200000000000", "740000000000", "888000000000"],
    ["2027-05-01", "31000000000000", "1030000000000", "1240000000000"],
    ["2027-06-01", "44000000000000", "1470000000000", "1760000000000"],
    ["2027-07-01", "61000000000000", "2030000000000", "2440000000000"],
  ].map(([monthStart, flowTarget, dailyReference, plannedCompanyRevenue]) => Object.freeze({
    monthStart,
    flowTarget: money(flowTarget),
    dailyReference: money(dailyReference),
    plannedCompanyRevenue: money(plannedCompanyRevenue),
  }))),
});
