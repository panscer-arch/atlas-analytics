import assert from "node:assert/strict";
import {
  AdminFinanceApiError,
  createAdminFinanceClient,
} from "../src/modules/admin-finance/api/adminFinanceApi.js";
import {
  adminFinanceMvpSections,
  adminFinanceMvpUtilitySections,
  resolveAdminFinanceDefaultAsOfDate,
  resolveAdminFinanceMvpRedirect,
  resolveAdminFinanceDataSource,
  resolveAdminFinanceReleaseScope,
} from "../src/modules/admin-finance/api/adminFinanceConfig.js";
import {
  createGrowthPlanDraft,
  DEFAULT_GROWTH_PLAN_DRAFT,
  parseGrowthPlanDraft,
} from "../src/modules/admin-finance/data/growthPlanDraft.js";
import { calculatePartnerCaptureControl } from "../src/modules/admin-finance/data/partnerCaptureControl.js";
import { acknowledgePartnerCaptureAlert, createPartnerCaptureJournal, parsePartnerCaptureJournal, recordPartnerCaptureCut } from "../src/modules/admin-finance/data/partnerCaptureJournal.js";
import { addRiskAcknowledgements, parseRiskAcknowledgements } from "../src/modules/admin-finance/data/riskAcknowledgements.js";
import { calculateCompanyRevenueControl } from "../src/modules/admin-finance/data/companyRevenueControl.js";
import { calculatePartnerRewardTiming, calculateWeightedStructureVolume, OFFICIAL_PARTNER_RULESET } from "../src/modules/admin-finance/data/officialPartnerRuleset.js";
import { companyReceiptRows, platformFeeRows } from "../server/admin-finance/demo-data.mjs";

assert.equal(OFFICIAL_PARTNER_RULESET.sourceUrl, "https://atlas-system.tech/level/");
assert.equal(OFFICIAL_PARTNER_RULESET.statuses.at(-1).name, "Executive");
assert.equal(OFFICIAL_PARTNER_RULESET.statuses.at(-1).ratePercent, 60);
assert.deepEqual(calculatePartnerRewardTiming({ flow: "lockup", grossPartnerReward: 100 }), { atCreation: 100, streamed: 0, streamDays: 0 });
assert.deepEqual(calculatePartnerRewardTiming({ flow: "daily", grossPartnerReward: 100 }), { atCreation: 20, streamed: 80, streamDays: 200 });
assert.equal(calculateWeightedStructureVolume([{ depth: 1, volume: 100 }, { depth: 7, volume: 100 }, { depth: 12, volume: 100 }]), 160);

const validMeta = {
  perimeter: "payout_contract",
  currency: "USDT",
  from: "2026-08-01T00:00:00.000Z",
  to: "2026-08-05T00:00:00.000Z",
  asOfBlockNumber: 54721008,
  asOfBlockHash: `0x${"a".repeat(64)}`,
  finality: "finalized",
  freshnessSeconds: 120,
  partial: false,
  sourceStatus: "ready",
  formulaVersion: "test-v1",
  rulesetVersion: "rules-v1",
  reconciliationStatus: "reconciled",
  requestId: "request-test-001",
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": status >= 400 ? "application/problem+json" : "application/json" },
  });
}

assert.equal(resolveAdminFinanceDataSource(undefined), "disabled");
assert.equal(resolveAdminFinanceDataSource("static-demo"), "static-demo");
assert.equal(resolveAdminFinanceDataSource("api"), "api");
assert.throws(() => resolveAdminFinanceDataSource("fallback"), /Unsupported/);
assert.equal(resolveAdminFinanceReleaseScope(undefined), "mvp");
assert.equal(resolveAdminFinanceReleaseScope("full"), "full");
assert.throws(() => resolveAdminFinanceReleaseScope("everything"), /Unsupported/);
assert.deepEqual(adminFinanceMvpSections, ["reconciliation", "flows", "liquidity", "cycles", "claims"]);
assert.deepEqual(adminFinanceMvpUtilitySections, ["methodology"]);
assert.equal(resolveAdminFinanceDefaultAsOfDate({ apiEnabled: false, demoDate: "2026-08-04", now: new Date("2030-01-02T03:04:05Z") }), "2026-08-04");
assert.equal(resolveAdminFinanceDefaultAsOfDate({ apiEnabled: true, demoDate: "2026-08-04", now: new Date("2030-01-02T03:04:05Z") }), "2030-01-02");
assert.throws(() => resolveAdminFinanceDefaultAsOfDate({ apiEnabled: true, demoDate: "2026-08-04", now: new Date("invalid") }), /valid Date/);
assert.equal(resolveAdminFinanceMvpRedirect("overview", true), "/admin/flows");
assert.equal(resolveAdminFinanceMvpRedirect("flows", true), null);
assert.equal(resolveAdminFinanceMvpRedirect("overview", false), null);
assert.deepEqual(parseGrowthPlanDraft("not-json"), { ...DEFAULT_GROWTH_PLAN_DRAFT });
assert.equal(parseGrowthPlanDraft({ schemaVersion: 1, baseline: 140, actual: 20, elapsedDays: 10 }).baseline, 140);
assert.equal(parseGrowthPlanDraft({ schemaVersion: 1, baseline: -1, actual: 20, elapsedDays: 10 }).baseline, 100);
assert.equal(createGrowthPlanDraft({ baseline: 140, actual: 20, elapsedDays: 10 }, "2026-08-14T10:00:00Z").updatedAt, "2026-08-14T10:00:00Z");
assert.deepEqual(calculatePartnerCaptureControl({ grossPartnerRewardsPaid: 100, atlasReferralIncome: 35 }), {
  atlasIncome: 35,
  denominatorAvailable: true,
  gapPercentagePoints: 0,
  grossPaid: 100,
  ratePercent: 35,
  shortfall: 0,
  status: "healthy",
  targetIncome: 35,
  targetPercent: 35,
  warningFloorPercent: 33,
});
assert.equal(calculatePartnerCaptureControl({ grossPartnerRewardsPaid: 100, atlasReferralIncome: 34 }).status, "warning");
assert.equal(calculatePartnerCaptureControl({ grossPartnerRewardsPaid: 100, atlasReferralIncome: 32 }).status, "critical");
assert.equal(calculatePartnerCaptureControl({ grossPartnerRewardsPaid: 200, atlasReferralIncome: 60 }).shortfall, 10);
assert.equal(calculatePartnerCaptureControl({ grossPartnerRewardsPaid: 100, atlasReferralIncome: 33 }).status, "warning");
assert.equal(calculatePartnerCaptureControl({ grossPartnerRewardsPaid: 100, atlasReferralIncome: 35 }).status, "healthy");
assert.equal(calculatePartnerCaptureControl({ grossPartnerRewardsPaid: 0, atlasReferralIncome: 0 }).status, "unavailable");
assert.deepEqual(parseRiskAcknowledgements('["RC-1","RC-2","RC-1","UNKNOWN"]', ["RC-1", "RC-2"]), ["RC-1", "RC-2"]);
assert.deepEqual(parseRiskAcknowledgements("not-json", ["RC-1"]), []);
assert.deepEqual(addRiskAcknowledgements(["RC-1"], ["RC-2", "UNKNOWN"], ["RC-1", "RC-2"]), ["RC-1", "RC-2"]);
assert.deepEqual(calculateCompanyRevenueControl({ incomingFlow: 100, platformFee: 3, headAccountIncome: 1 }), {
  companyRevenue: 4,
  denominatorAvailable: true,
  fee: 3,
  feeSharePercent: 75,
  gapPercentagePoints: 0,
  headIncome: 1,
  headSharePercent: 25,
  inflow: 100,
  ratePercent: 4,
  shortfall: 0,
  status: "on_target",
  surplus: 0,
  targetPercent: 4,
  targetRevenue: 4,
});
assert.equal(calculateCompanyRevenueControl({ incomingFlow: 100, platformFee: 2, headAccountIncome: 1 }).status, "behind");
assert.equal(calculateCompanyRevenueControl({ incomingFlow: 100, platformFee: 4, headAccountIncome: 1 }).surplus, 1);
assert.equal(calculateCompanyRevenueControl({ incomingFlow: 0, platformFee: 4, headAccountIncome: 1 }).status, "unavailable");
let partnerJournal = createPartnerCaptureJournal();
partnerJournal = recordPartnerCaptureCut(partnerJournal, { ratePercent: 32, grossPartnerRewardsPaid: 100, at: "2026-08-14T10:00:00Z" });
assert.equal(partnerJournal.lifecycle, "pending");
partnerJournal = recordPartnerCaptureCut(partnerJournal, { ratePercent: 32, grossPartnerRewardsPaid: 100, at: "2026-08-14T11:00:00Z" });
assert.equal(partnerJournal.lifecycle, "critical");
assert.equal(partnerJournal.history[0].type, "opened");
partnerJournal = acknowledgePartnerCaptureAlert(partnerJournal, "2026-08-14T11:05:00Z");
assert.equal(partnerJournal.history[0].type, "acknowledged");
partnerJournal = recordPartnerCaptureCut(partnerJournal, { ratePercent: 35, grossPartnerRewardsPaid: 100, at: "2026-08-14T12:00:00Z" });
assert.equal(partnerJournal.lifecycle, "recovering");
partnerJournal = recordPartnerCaptureCut(partnerJournal, { ratePercent: 36, grossPartnerRewardsPaid: 100, at: "2026-08-14T13:00:00Z" });
assert.equal(partnerJournal.lifecycle, "healthy");
assert.equal(partnerJournal.history[0].type, "recovered");
assert.equal(parsePartnerCaptureJournal("invalid").lifecycle, "healthy");

const calls = [];
const client = createAdminFinanceClient({
  fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return jsonResponse({
      data: [{ externalIn: { amountRaw: "1000000" } }],
      page: { nextCursor: null, hasMore: false },
      meta: validMeta,
    });
  },
});

const result = await client.getCashMovements({
  from: "2026-08-01T00:00:00Z",
  to: "2026-08-05T00:00:00Z",
  perimeter: "payout_contract",
  limit: 10,
  asOfBlock: validMeta.asOfBlockNumber,
  asOfBlockHash: validMeta.asOfBlockHash,
});
assert.equal(result.data[0].externalIn.amountRaw, "1000000");
assert.equal(calls.length, 1);
assert.match(calls[0].url, /^\/api\/admin\/v1\/finance\/cash-movements\?/);
assert.match(calls[0].url, /perimeter=payout_contract/);
assert.match(calls[0].url, /asOfBlock=54721008/);
assert.match(calls[0].url, /asOfBlockHash=0x[a-f0-9]{64}/);
assert.equal(calls[0].options.credentials, "include");
assert.equal(calls[0].options.method, "GET");

const demoMetaClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    apiVersion: "1.0.0-draft",
    status: "blocked_gate0",
    gateZero: { closed: 0, total: 14 },
    capabilities: ["management.growth_plan.read"],
  }),
});
assert.equal((await demoMetaClient.getMeta()).status, "blocked_gate0");
const invalidDemoMetaClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({ apiVersion: "1.0.0-draft", status: "blocked_gate0", gateZero: { closed: 0, total: 13 }, capabilities: [] }),
});
await assert.rejects(invalidDemoMetaClient.getMeta(), (error) => error.code === "invalid_demo_meta_response");

const overviewPayload = {
  data: {
    coverage: { from: validMeta.from, to: validMeta.to },
    liquidity: { perimeter: "payout_contract", availableBalance: { amountRaw: "1000000" } },
    obligations: { perimeter: "payout_contract" },
    cashFlow: { perimeter: "atlas_consolidated" },
    cycles: { perimeter: "participant_economics" },
    companyRevenue: { perimeter: "company_treasury" },
  },
  meta: { ...validMeta, perimeter: "atlas_consolidated" },
};
const overviewCalls = [];
const overviewClient = createAdminFinanceClient({
  fetchImpl: async (url, options) => {
    overviewCalls.push({ url, options });
    return jsonResponse(overviewPayload);
  },
});
const overview = await overviewClient.getFinanceOverview({ from: validMeta.from, to: validMeta.to, perimeter: "atlas_consolidated" });
const growthMoney = (amountRaw) => ({ amountRaw, decimals: 6, tokenAddress: `0x${"1".repeat(40)}`, symbol: "USDT", displayAmount: String(Number(amountRaw) / 1e6) });
const growthPlanPayload = {
  data: {
    id: "90000000-0000-4000-8000-000000000001",
    version: "growth-plan-2026.08-v2",
    status: "proposed",
    owner: "Finance",
    approvedBy: null,
    approvedAt: null,
    effectiveFrom: "2026-08-01",
    previousVersionId: null,
    monthlyGrowthBasisPoints: 5000,
    plannedCompanyRevenueBasisPoints: 500,
    dayBasis: "source_30_day_reference",
    source: "manual_management_scenario",
    months: Array.from({ length: 12 }, (_, index) => {
      const monthStart = new Date(Date.UTC(2026, 7 + index, 1)).toISOString().slice(0, 10);
      const flow = BigInt(1500000000000 + index * 100000000000);
      return {
        monthStart,
        flowTarget: growthMoney(String(flow)),
        dailyReference: growthMoney("50000000000"),
        newWalletsTarget: 900 + index * 100,
        dailyWalletReference: 30 + index,
        cyclesTarget: 4500 + index * 500,
        dailyCycleReference: 150 + index * 10,
        plannedCompanyRevenue: growthMoney(String(flow * 500n / 10000n)),
      };
    }),
  },
  meta: { ...validMeta, perimeter: "company_treasury", partial: true, sourceStatus: "partial" },
};
const growthPlanClient = createAdminFinanceClient({ fetchImpl: async () => jsonResponse(growthPlanPayload) });
assert.equal((await growthPlanClient.getManagementGrowthPlan()).data.months.length, 12);
assert.equal((await growthPlanClient.getManagementGrowthPlan()).data.months[0].newWalletsTarget, 900);
const invalidGrowthPlanClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({ ...growthPlanPayload, data: { ...growthPlanPayload.data, months: growthPlanPayload.data.months.slice(0, 11) } }),
});
await assert.rejects(invalidGrowthPlanClient.getManagementGrowthPlan(), (error) => error.code === "invalid_management_growth_plan");
const partnerSeriesRaw = [
  ["2026-07-29T00:00:00Z", "2026-07-30T00:00:00Z", "70000000", "24500000"],
  ["2026-07-30T00:00:00Z", "2026-07-31T00:00:00Z", "80000000", "28000000"],
  ["2026-07-31T00:00:00Z", "2026-08-01T00:00:00Z", "75000000", "26250000"],
  ["2026-08-01T00:00:00Z", "2026-08-02T00:00:00Z", "90000000", "31500000"],
  ["2026-08-02T00:00:00Z", "2026-08-03T00:00:00Z", "85000000", "29750000"],
  ["2026-08-03T00:00:00Z", "2026-08-04T00:00:00Z", "80000000", "28000000"],
  ["2026-08-04T00:00:00Z", "2026-08-05T00:00:00Z", "102857142", "36000000"],
];
const partnerEconomicsPayload = {
  data: {
    grossPartnerRewardsPaid: growthMoney("582857142"),
    atlasReferralIncome: growthMoney("204000000"),
    atlasReferralIncomeAtCreation: growthMoney("128000000"),
    atlasReferralIncomeStreamed: growthMoney("76000000"),
    captureRateBasisPoints: 3500,
    targetBasisPoints: 3500,
    gapBasisPoints: 0,
    attributionStatus: "partial",
    series: partnerSeriesRaw.map(([bucketStart, bucketEnd, gross, atlas]) => ({
      bucketStart,
      bucketEnd,
      grossPartnerRewardsPaid: growthMoney(gross),
      atlasReferralIncome: growthMoney(atlas),
      captureRateBasisPoints: Number(BigInt(atlas) * 10000n / BigInt(gross)),
    })),
  },
  meta: { ...validMeta, perimeter: "company_treasury", partial: true, sourceStatus: "partial", reconciliationStatus: "exception" },
};
const partnerEconomicsClient = createAdminFinanceClient({ fetchImpl: async () => jsonResponse(partnerEconomicsPayload) });
assert.equal((await partnerEconomicsClient.getPartnerEconomics({ from: validMeta.from, to: validMeta.to })).data.captureRateBasisPoints, 3500);
const legacyPartnerEconomicsPayload = structuredClone(partnerEconomicsPayload);
legacyPartnerEconomicsPayload.data.atlasReferralIncomeAtClaim = legacyPartnerEconomicsPayload.data.atlasReferralIncomeStreamed;
delete legacyPartnerEconomicsPayload.data.atlasReferralIncomeStreamed;
const legacyPartnerEconomicsClient = createAdminFinanceClient({ fetchImpl: async () => jsonResponse(legacyPartnerEconomicsPayload) });
assert.equal(
  (await legacyPartnerEconomicsClient.getPartnerEconomics({ from: validMeta.from, to: validMeta.to })).data.atlasReferralIncomeStreamed.amountRaw,
  "76000000",
);
const invalidPartnerEconomicsClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({ ...partnerEconomicsPayload, data: { ...partnerEconomicsPayload.data, atlasReferralIncomeStreamed: growthMoney("75000000") } }),
});
await assert.rejects(invalidPartnerEconomicsClient.getPartnerEconomics({ from: validMeta.from, to: validMeta.to }), (error) => error.code === "invalid_partner_economics_arithmetic");
const companySeriesRaw = [
  ["2026-07-29T00:00:00Z", "2026-07-30T00:00:00Z", 3073, 76, 21, 18, 11],
  ["2026-07-30T00:00:00Z", "2026-07-31T00:00:00Z", 2744, 69, 19, 19, 11],
  ["2026-07-31T00:00:00Z", "2026-08-01T00:00:00Z", 2650, 61, 17, 18, 10],
  ["2026-08-01T00:00:00Z", "2026-08-02T00:00:00Z", 2765, 86, 24, 20, 11],
  ["2026-08-02T00:00:00Z", "2026-08-03T00:00:00Z", 2625, 75, 22, 18, 11],
  ["2026-08-03T00:00:00Z", "2026-08-04T00:00:00Z", 2310, 55, 16, 16, 10],
  ["2026-08-04T00:00:00Z", "2026-08-05T00:00:00Z", 2253, 64, 20, 19, 12],
];
const companyEconomicsPayload = {
  data: {
    incomingFlow: growthMoney("18420000000"),
    platformFeeFromDelta: growthMoney("486000000"),
    platformFeeFromPartnerReward: growthMoney("139000000"),
    platformFeeTotal: growthMoney("625000000"),
    headAccountIncomeAtCreation: growthMoney("128000000"),
    headAccountIncomeStreamed: growthMoney("76000000"),
    headAccountIncome: growthMoney("204000000"),
    companyRevenue: growthMoney("829000000"),
    companyRevenueRateBasisPoints: 450,
    targetBasisPoints: 400,
    gapBasisPoints: 50,
    targetRevenue: growthMoney("736800000"),
    surplus: growthMoney("92200000"),
    shortfall: growthMoney("0"),
    attributionStatus: "partial",
    series: companySeriesRaw.map(([bucketStart, bucketEnd, incoming, feeDelta, feePartner, headCreation, headStreamed]) => {
      const platformFeeTotal = feeDelta + feePartner;
      const headAccountIncome = headCreation + headStreamed;
      const companyRevenue = platformFeeTotal + headAccountIncome;
      return {
        bucketStart,
        bucketEnd,
        incomingFlow: growthMoney(`${incoming}000000`),
        platformFeeFromDelta: growthMoney(`${feeDelta}000000`),
        platformFeeFromPartnerReward: growthMoney(`${feePartner}000000`),
        platformFeeTotal: growthMoney(`${platformFeeTotal}000000`),
        headAccountIncomeAtCreation: growthMoney(`${headCreation}000000`),
        headAccountIncomeStreamed: growthMoney(`${headStreamed}000000`),
        headAccountIncome: growthMoney(`${headAccountIncome}000000`),
        companyRevenue: growthMoney(`${companyRevenue}000000`),
        companyRevenueRateBasisPoints: Math.floor(companyRevenue * 10000 / incoming),
      };
    }),
  },
  meta: { ...validMeta, perimeter: "company_treasury", partial: true, sourceStatus: "partial", reconciliationStatus: "exception" },
};
const companyEconomicsClient = createAdminFinanceClient({ fetchImpl: async () => jsonResponse(companyEconomicsPayload) });
assert.equal((await companyEconomicsClient.getCompanyEconomics({ from: validMeta.from, to: validMeta.to })).data.companyRevenueRateBasisPoints, 450);
const legacyCompanyEconomicsPayload = structuredClone(companyEconomicsPayload);
legacyCompanyEconomicsPayload.data.headAccountIncomeAtClaim = legacyCompanyEconomicsPayload.data.headAccountIncomeStreamed;
delete legacyCompanyEconomicsPayload.data.headAccountIncomeStreamed;
legacyCompanyEconomicsPayload.data.series.forEach((row) => {
  row.headAccountIncomeAtClaim = row.headAccountIncomeStreamed;
  delete row.headAccountIncomeStreamed;
});
const legacyCompanyEconomicsClient = createAdminFinanceClient({ fetchImpl: async () => jsonResponse(legacyCompanyEconomicsPayload) });
assert.equal(
  (await legacyCompanyEconomicsClient.getCompanyEconomics({ from: validMeta.from, to: validMeta.to })).data.headAccountIncomeStreamed.amountRaw,
  "76000000",
);
const invalidCompanyEconomicsClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({ ...companyEconomicsPayload, data: { ...companyEconomicsPayload.data, companyRevenue: growthMoney("828000000") } }),
});
await assert.rejects(invalidCompanyEconomicsClient.getCompanyEconomics({ from: validMeta.from, to: validMeta.to }), (error) => error.code === "invalid_company_economics_arithmetic");
const transactionMeta = { ...validMeta, perimeter: "company_treasury", partial: true, sourceStatus: "partial", reconciliationStatus: "exception" };
const platformFeesPayload = { data: platformFeeRows, page: { nextCursor: null, hasMore: false }, meta: transactionMeta };
const platformFeesClient = createAdminFinanceClient({ fetchImpl: async () => jsonResponse(platformFeesPayload) });
assert.equal((await platformFeesClient.getPlatformFees({ from: validMeta.from, to: validMeta.to, limit: 100 })).data.length, 6);
const invalidPlatformFeesClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({ ...platformFeesPayload, data: [{ ...platformFeeRows[0], platformFee: growthMoney("179000000") }] }),
});
await assert.rejects(invalidPlatformFeesClient.getPlatformFees({ from: validMeta.from, to: validMeta.to }), (error) => error.code === "invalid_platform_fee_row");
const companyReceiptsPayload = { data: companyReceiptRows, page: { nextCursor: null, hasMore: false }, meta: transactionMeta };
const companyReceiptsClient = createAdminFinanceClient({ fetchImpl: async () => jsonResponse(companyReceiptsPayload) });
assert.equal((await companyReceiptsClient.getCompanyReceipts({ from: validMeta.from, to: validMeta.to, limit: 100 })).data.length, 10);
const legacyPlatformFeeRow = { ...platformFeeRows.find((row) => row.sourceMoment === "partner_reward_streamed"), sourceMoment: "partner_reward_claim" };
const legacyPlatformFeeClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({ ...platformFeesPayload, data: [legacyPlatformFeeRow] }),
});
assert.equal(
  (await legacyPlatformFeeClient.getPlatformFees({ from: validMeta.from, to: validMeta.to })).data[0].sourceMoment,
  "partner_reward_streamed",
);
const legacyCompanyReceiptRow = { ...companyReceiptRows.find((row) => row.receiptType === "head_account_streamed"), receiptType: "head_account_claim" };
const legacyCompanyReceiptClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({ ...companyReceiptsPayload, data: [legacyCompanyReceiptRow] }),
});
assert.equal(
  (await legacyCompanyReceiptClient.getCompanyReceipts({ from: validMeta.from, to: validMeta.to })).data[0].receiptType,
  "head_account_streamed",
);
const invalidCompanyReceiptsClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({ ...companyReceiptsPayload, data: [{ ...companyReceiptRows[0], txHash: "0x1234" }] }),
});
await assert.rejects(invalidCompanyReceiptsClient.getCompanyReceipts({ from: validMeta.from, to: validMeta.to }), (error) => error.code === "invalid_company_receipt_row");
assert.equal(overview.data.companyRevenue.perimeter, "company_treasury");
assert.match(overviewCalls[0].url, /^\/api\/admin\/v1\/finance\/overview\?/);

const invalidOverviewClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    ...overviewPayload,
    data: { ...overviewPayload.data, companyRevenue: { perimeter: "payout_contract" } },
  }),
});
await assert.rejects(
  invalidOverviewClient.getFinanceOverview({ from: validMeta.from, to: validMeta.to, perimeter: "atlas_consolidated" }),
  (error) => error.code === "invalid_finance_overview_perimeter",
);

const unauthorizedClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    title: "Administrative session required",
    detail: "Administrative session required",
    code: "admin_session_required",
    requestId: "request-auth-001",
    retryable: false,
  }, 401),
});
await assert.rejects(
  unauthorizedClient.getMeta(),
  (error) => error instanceof AdminFinanceApiError
    && error.status === 401
    && error.code === "admin_session_required"
    && error.requestId === "request-auth-001",
);

const coverageIds = ["cash_flows", "liquidity", "cycles", "claims", "payout_forecast", "reconciliation", "company_revenue"];
const metaClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    apiVersion: "1.0.0-alpha",
    status: "internal_alpha_partial",
    gateZero: { closed: 0, total: 14 },
    capabilities: ["reconciliation", "flows"],
    dataCoverage: coverageIds.map((id) => ({
      id,
      label: id,
      status: id === "cash_flows" ? "partial" : "unavailable",
      source: id === "cash_flows" ? "On-chain daily aggregates" : "N/A",
      affectsRoutes: [id],
      blocker: "Test blocker",
      nextAction: "Test action",
      gateId: "G0-07",
      owner: "Не назначен",
    })),
    snapshot: { id: "snapshot-test", asOfBlockNumber: validMeta.asOfBlockNumber, asOfBlockHash: validMeta.asOfBlockHash },
  }),
});
assert.equal((await metaClient.getMeta()).dataCoverage.length, 7);

const invalidCoverageClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    apiVersion: "1.0.0-alpha",
    status: "internal_alpha_partial",
    gateZero: { closed: 0, total: 14 },
    capabilities: [],
    dataCoverage: [],
    snapshot: { id: "snapshot-test" },
  }),
});
await assert.rejects(
  invalidCoverageClient.getMeta(),
  (error) => error.code === "invalid_alpha_meta_response",
);

const invalidMoneyClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    data: [{ amount: { amountRaw: 1000000 } }],
    page: { nextCursor: null, hasMore: false },
    meta: validMeta,
  }),
});
await assert.rejects(
  invalidMoneyClient.getClaims({ from: validMeta.from, to: validMeta.to }),
  (error) => error.code === "invalid_money_wire_format",
);

const missingMetaClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({ data: [] }),
});
await assert.rejects(
  missingMetaClient.getReconciliationRuns(),
  (error) => error.code === "invalid_response_metadata",
);

const gateClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    data: Array.from({ length: 14 }, (_, index) => ({
      id: `G0-${String(index + 1).padStart(2, "0")}`,
      title: `Decision ${index + 1}`,
    })),
    closed: 0,
    total: 14,
  }),
});
assert.equal((await gateClient.getGateZero()).data.length, 14);

const forecastMoney = (amountRaw) => ({ amountRaw: String(amountRaw), decimals: 6, tokenAddress: `0x${"1".repeat(40)}`, symbol: "USDT" });
const cycleRow = {
  id: "20000000-0000-4000-8000-000000000001",
  productKey: "daily_200_100",
  label: "Daily 200 · $100",
  status: "open",
  openedCount: 108,
  openCount: 83,
  closedCount: 25,
  claimableCount: 7,
  termEndedCount: 2,
  principal: forecastMoney("10800000000"),
  grossDeltaPaid: forecastMoney("8960000000"),
  projectedMaturityOutflow: forecastMoney("12420000000"),
  claimableNow: forecastMoney("1240000000"),
  next7DaysLoad: forecastMoney("3180400000"),
  next30DaysLoad: forecastMoney("8692000000"),
  rulesetVersion: "test-cycle-v1",
};
const cyclesClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    data: [cycleRow],
    page: { nextCursor: null, hasMore: false },
    meta: { ...validMeta, perimeter: "participant_economics" },
  }),
});
assert.equal((await cyclesClient.getCycles({ from: validMeta.from, to: validMeta.to })).data[0].openedCount, 108);

const duplicateCyclesClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    data: [cycleRow, { ...cycleRow, id: "20000000-0000-4000-8000-000000000002" }],
    page: { nextCursor: null, hasMore: false },
    meta: { ...validMeta, perimeter: "participant_economics" },
  }),
});
await assert.rejects(
  duplicateCyclesClient.getCycles({ from: validMeta.from, to: validMeta.to }),
  (error) => error.code === "invalid_cycles_response",
);

const inconsistentCycleCountsClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    data: [{ ...cycleRow, openCount: 84 }],
    page: { nextCursor: null, hasMore: false },
    meta: { ...validMeta, perimeter: "participant_economics" },
  }),
});
await assert.rejects(
  inconsistentCycleCountsClient.getCycles({ from: validMeta.from, to: validMeta.to }),
  (error) => error.code === "invalid_cycles_response",
);

const claimRecord = {
  id: "30000000-0000-4000-8000-000000000001",
  cycleId: cycleRow.id,
  participantId: "40000000-0000-4000-8000-000000000001",
  status: "paid",
  eligibleAt: validMeta.from,
  requestedAt: validMeta.from,
  settledAt: validMeta.to,
  failureCode: null,
  components: [{
    type: "delta",
    gross: forecastMoney("1000000"),
    net: forecastMoney("900000"),
    platformFee: forecastMoney("100000"),
    otherDeductions: forecastMoney("0"),
    transferIds: ["50000000-0000-4000-8000-000000000001"],
  }],
};
const claimsClient = createAdminFinanceClient({
  fetchImpl: async (url) => jsonResponse({
    data: url.includes(`/claims/${claimRecord.id}`) ? claimRecord : [claimRecord],
    ...(url.includes(`/claims/${claimRecord.id}`) ? {} : { page: { nextCursor: null, hasMore: false } }),
    meta: { ...validMeta, perimeter: "participant_economics" },
  }),
});
assert.equal((await claimsClient.getClaims({ from: validMeta.from, to: validMeta.to })).data[0].status, "paid");
assert.equal((await claimsClient.getClaim(claimRecord.id)).data.id, claimRecord.id);
const legacyClaimRecord = structuredClone(claimRecord);
legacyClaimRecord.components[0].type = "partner_reward_claim";
const legacyClaimsClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    data: [legacyClaimRecord],
    page: { nextCursor: null, hasMore: false },
    meta: { ...validMeta, perimeter: "participant_economics" },
  }),
});
assert.equal(
  (await legacyClaimsClient.getClaims({ from: validMeta.from, to: validMeta.to })).data[0].components[0].type,
  "partner_reward_streamed",
);

const unbalancedClaimsClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    data: [{ ...claimRecord, components: [{ ...claimRecord.components[0], net: forecastMoney("800000") }] }],
    page: { nextCursor: null, hasMore: false },
    meta: { ...validMeta, perimeter: "participant_economics" },
  }),
});
await assert.rejects(
  unbalancedClaimsClient.getClaims({ from: validMeta.from, to: validMeta.to }),
  (error) => error.code === "invalid_claim_component_balance",
);

const participantId = "40000000-0000-4000-8000-000000000001";
const participantSearchRow = {
  participantId,
  atlasId: "A-2049",
  referralCode: "atlas-a2049",
  maskedWallet: "0x71A4…9B2F",
  status: "active",
  currentRankLabel: "Master 2",
  matchType: "referral",
  exact: true,
};
const participantProfile = {
  id: participantId,
  atlasId: "A-2049",
  referralCode: "atlas-a2049",
  maskedWallet: "0x71A4…9B2F",
  walletRevealAvailable: false,
  status: "active",
  currentRank: "master_2",
  currentRankLabel: "Master 2",
  registeredAt: validMeta.from,
  sponsor: { participantId: "40000000-0000-4000-8000-000000000008", atlasId: "A-1001", maskedWallet: "0x90C1…4AA0" },
  firstLine: { participantCount: 28, walletsWithCycles: 21, principal: forecastMoney("31420000000"), activeCycles: 11, closedCycles: 38, payouts: forecastMoney("6110000000") },
  structure: { participantCount: 413, maxDepth: 7, principal: forecastMoney("84600000000"), activeCycles: 71, closedCycles: 296, payouts: forecastMoney("12842000000") },
  received: { total: forecastMoney("12842000000"), deltaNet: forecastMoney("3912000000"), partnerRewardCreationNet: forecastMoney("6820000000"), partnerRewardClaimNet: forecastMoney("2110000000") },
  futureObligations: forecastMoney("7340000000"),
  activity: { lastOnchainAt: validMeta.to, lastCabinetAt: validMeta.to },
  protectedResources: { notes: "unavailable", companyFunding: "unavailable", kpiPlans: "unavailable", walletReveal: "unavailable" },
};
const firstLineRow = {
  participantId: "40000000-0000-4000-8000-000000000002",
  atlasId: "A-2914",
  maskedWallet: "0x8F21…A104",
  status: "active",
  rankLabel: "Master 1",
  principal: forecastMoney("6400000000"),
  cycleCount: 8,
  activeCycleCount: 4,
  partnerReceived: forecastMoney("1280000000"),
  deltaReceived: forecastMoney("640000000"),
  lastActivityAt: validMeta.to,
  riskState: "none",
};
const participantClient = createAdminFinanceClient({
  fetchImpl: async (url) => {
    if (url.includes("/first-line")) return jsonResponse({ data: [firstLineRow], page: { nextCursor: null, hasMore: false }, meta: { ...validMeta, perimeter: "participant_economics" } });
    if (url.includes(`/participants/${participantId}`)) return jsonResponse({ data: participantProfile, meta: { ...validMeta, perimeter: "participant_economics" } });
    return jsonResponse({ data: [participantSearchRow], page: { nextCursor: null, hasMore: false }, meta: { ...validMeta, perimeter: "participant_economics" } });
  },
});
assert.equal((await participantClient.searchParticipants({ q: "atlas-a2049" })).data[0].exact, true);
assert.equal((await participantClient.getParticipant(participantId)).data.received.total.amountRaw, "12842000000");
assert.equal((await participantClient.getParticipantFirstLine(participantId, { limit: 10 })).data[0].activeCycleCount, 4);

const exposedWalletClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    data: [{ ...participantSearchRow, maskedWallet: `0x${"1".repeat(40)}` }],
    page: { nextCursor: null, hasMore: false },
    meta: { ...validMeta, perimeter: "participant_economics" },
  }),
});
await assert.rejects(
  exposedWalletClient.searchParticipants({ q: "atlas-a2049" }),
  (error) => error.code === "invalid_participant_wallet_mask",
);

const unbalancedParticipantClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    data: { ...participantProfile, received: { ...participantProfile.received, total: forecastMoney("12000000000") } },
    meta: { ...validMeta, perimeter: "participant_economics" },
  }),
});
await assert.rejects(
  unbalancedParticipantClient.getParticipant(participantId),
  (error) => error.code === "invalid_participant_payout_balance",
);

const forecastSnapshot = {
  id: "80000000-0000-4000-8000-000000000001",
  scenario: "stress",
  perimeter: "payout_contract",
  asOf: validMeta.from,
  horizonEnd: validMeta.to,
  openingLiquidity: forecastMoney("10000000"),
  reserveTarget: forecastMoney("1000000"),
  totalOutflow: forecastMoney("3000000"),
  peakFundingGap: forecastMoney("0"),
  horizons: [{ id: "24h", to: validMeta.to, totalOutflow: forecastMoney("3000000") }],
};
const forecastClient = createAdminFinanceClient({
  fetchImpl: async (url) => url.includes("/forecast/buckets")
    ? jsonResponse({
      data: [{
        principalDue: forecastMoney("2000000"),
        grossDeltaDue: forecastMoney("500000"),
        partnerRewardDue: forecastMoney("500000"),
        pendingPartnerCreationDue: forecastMoney("0"),
        totalOutflowDue: forecastMoney("3000000"),
        expectedInflow: forecastMoney("0"),
        openingLiquidity: forecastMoney("10000000"),
        closingLiquidity: forecastMoney("7000000"),
      }],
      meta: validMeta,
    })
    : jsonResponse({ data: forecastSnapshot, meta: validMeta }),
});
assert.equal((await forecastClient.getLatestForecastSnapshot({ scenario: "stress", perimeter: "payout_contract" })).data.scenario, "stress");
assert.equal((await forecastClient.getForecastBuckets({ snapshotId: forecastSnapshot.id, from: validMeta.from, to: validMeta.to })).data.length, 1);

const invalidForecastClient = createAdminFinanceClient({
  fetchImpl: async () => jsonResponse({
    data: [{
      principalDue: forecastMoney("2000000"),
      grossDeltaDue: forecastMoney("500000"),
      partnerRewardDue: forecastMoney("500000"),
      pendingPartnerCreationDue: forecastMoney("0"),
      totalOutflowDue: forecastMoney("4000000"),
      expectedInflow: forecastMoney("0"),
      openingLiquidity: forecastMoney("10000000"),
      closingLiquidity: forecastMoney("7000000"),
    }],
    meta: validMeta,
  }),
});
await assert.rejects(
  invalidForecastClient.getForecastBuckets({ snapshotId: forecastSnapshot.id, from: validMeta.from, to: validMeta.to }),
  (error) => error.code === "invalid_forecast_bucket_sequence",
);

console.log("Atlas Admin Finance frontend client: OK");
console.log("  explicit source mode: OK");
console.log("  credentials and query serialization: OK");
console.log("  auth/problem propagation: OK");
console.log("  metadata and atomic money validation: OK");
console.log("  MVP release boundary: OK");
