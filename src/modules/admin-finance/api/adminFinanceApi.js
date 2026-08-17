const BASE_PATH = "/api/admin/v1";

export class AdminFinanceApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AdminFinanceApiError";
    this.status = options.status || 0;
    this.code = options.code || "admin_finance_request_failed";
    this.requestId = options.requestId || null;
    this.retryable = Boolean(options.retryable);
  }
}

function validateRelativePath(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    throw new AdminFinanceApiError("Admin API path must be a same-origin relative path.", {
      code: "invalid_client_path",
    });
  }
}

function buildUrl(path, query = {}) {
  validateRelativePath(path);
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const suffix = params.toString();
  return `${BASE_PATH}${path}${suffix ? `?${suffix}` : ""}`;
}

function validateAtomicMoney(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateAtomicMoney(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.entries(value).forEach(([key, entry]) => {
    if (key === "amountRaw") {
      if (typeof entry !== "string" || !/^-?[0-9]+$/.test(entry)) {
        throw new AdminFinanceApiError(`Invalid atomic money at ${path}.${key}.`, {
          code: "invalid_money_wire_format",
        });
      }
    }
    validateAtomicMoney(entry, `${path}.${key}`);
  });
}

function validateDatasetMeta(meta) {
  const required = [
    "perimeter",
    "currency",
    "from",
    "to",
    "asOfBlockNumber",
    "asOfBlockHash",
    "finality",
    "freshnessSeconds",
    "partial",
    "sourceStatus",
    "formulaVersion",
    "rulesetVersion",
    "reconciliationStatus",
    "requestId",
  ];
  if (!meta || typeof meta !== "object") {
    throw new AdminFinanceApiError("Financial response metadata is missing.", {
      code: "invalid_response_metadata",
    });
  }
  const missing = required.filter((key) => meta[key] === undefined || meta[key] === null);
  if (missing.length) {
    throw new AdminFinanceApiError(`Financial response metadata is incomplete: ${missing.join(", ")}.`, {
      code: "invalid_response_metadata",
      requestId: meta.requestId,
    });
  }
}

function validateDataset(payload) {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new AdminFinanceApiError("Admin API returned an invalid dataset envelope.", {
      code: "invalid_response_envelope",
    });
  }
  validateDatasetMeta(payload.meta);
  validateAtomicMoney(payload);
  return payload;
}

function normalizeLegacyRewardVocabulary(payload) {
  const data = payload?.data;
  if (!data) return payload;

  const normalizeEconomics = (row) => {
    if (!row || typeof row !== "object") return;
    if (row.atlasReferralIncomeStreamed === undefined && row.atlasReferralIncomeAtClaim !== undefined) {
      row.atlasReferralIncomeStreamed = row.atlasReferralIncomeAtClaim;
    }
    if (row.headAccountIncomeStreamed === undefined && row.headAccountIncomeAtClaim !== undefined) {
      row.headAccountIncomeStreamed = row.headAccountIncomeAtClaim;
    }
  };
  const normalizeRecord = (row) => {
    if (!row || typeof row !== "object") return;
    if (row.sourceMoment === "partner_reward_claim") row.sourceMoment = "partner_reward_streamed";
    if (row.receiptType === "head_account_claim") row.receiptType = "head_account_streamed";
    row.components?.forEach((component) => {
      if (component.type === "partner_reward_claim") component.type = "partner_reward_streamed";
    });
  };

  if (Array.isArray(data)) data.forEach(normalizeRecord);
  else {
    normalizeEconomics(data);
    data.series?.forEach(normalizeEconomics);
    normalizeRecord(data);
  }
  return payload;
}

function validateManagementGrowthPlan(payload) {
  validateDataset(payload);
  const plan = payload.data;
  const statuses = new Set(["proposed", "approved", "retired"]);
  const required = [
    "id", "version", "status", "owner", "effectiveFrom", "monthlyGrowthBasisPoints",
    "plannedCompanyRevenueBasisPoints", "dayBasis", "source", "months",
  ];
  if (!plan || typeof plan !== "object" || required.some((key) => plan[key] === undefined)
    || payload.meta.perimeter !== "company_treasury" || !statuses.has(plan.status)
    || !Number.isInteger(plan.monthlyGrowthBasisPoints) || plan.monthlyGrowthBasisPoints < 0
    || !Number.isInteger(plan.plannedCompanyRevenueBasisPoints)
    || plan.plannedCompanyRevenueBasisPoints < 0 || plan.plannedCompanyRevenueBasisPoints > 10000
    || !Array.isArray(plan.months) || plan.months.length !== 12) {
    throw new AdminFinanceApiError("Management growth plan is incomplete.", {
      code: "invalid_management_growth_plan",
      requestId: payload.meta?.requestId,
    });
  }
  let previousMonth = "";
  const seen = new Set();
  plan.months.forEach((month) => {
    const keys = [
      "monthStart", "flowTarget", "dailyReference", "newWalletsTarget",
      "dailyWalletReference", "cyclesTarget", "dailyCycleReference",
      "plannedCompanyRevenue",
    ];
    const expectedRevenue = BigInt(month?.flowTarget?.amountRaw || "0")
      * BigInt(plan.plannedCompanyRevenueBasisPoints) / 10000n;
    if (!month || keys.some((key) => month[key] === undefined)
      || !/^\d{4}-\d{2}-01$/.test(month.monthStart) || seen.has(month.monthStart)
      || (previousMonth && month.monthStart <= previousMonth)
      || ![month.newWalletsTarget, month.dailyWalletReference, month.cyclesTarget, month.dailyCycleReference]
        .every((value) => Number.isInteger(value) && value >= 0)
      || BigInt(month.plannedCompanyRevenue.amountRaw) !== expectedRevenue) {
      throw new AdminFinanceApiError("Management growth plan month is inconsistent.", {
        code: "invalid_management_growth_plan_month",
        requestId: payload.meta?.requestId,
      });
    }
    seen.add(month.monthStart);
    previousMonth = month.monthStart;
  });
  return payload;
}

function validatePartnerEconomics(payload) {
  normalizeLegacyRewardVocabulary(payload);
  validateDataset(payload);
  const data = payload.data;
  const required = [
    "grossPartnerRewardsPaid", "atlasReferralIncome", "atlasReferralIncomeAtCreation",
    "atlasReferralIncomeStreamed", "captureRateBasisPoints", "targetBasisPoints",
    "gapBasisPoints", "attributionStatus", "series",
  ];
  if (!data || required.some((key) => data[key] === undefined)
    || payload.meta.perimeter !== "company_treasury"
    || !["complete", "partial"].includes(data.attributionStatus)
    || !Number.isInteger(data.captureRateBasisPoints) || data.captureRateBasisPoints < 0
    || !Number.isInteger(data.targetBasisPoints) || data.targetBasisPoints < 0
    || !Number.isInteger(data.gapBasisPoints) || !Array.isArray(data.series) || !data.series.length) {
    throw new AdminFinanceApiError("Partner economics response is incomplete.", {
      code: "invalid_partner_economics",
      requestId: payload.meta?.requestId,
    });
  }
  const gross = BigInt(data.grossPartnerRewardsPaid.amountRaw);
  const atlas = BigInt(data.atlasReferralIncome.amountRaw);
  const creation = BigInt(data.atlasReferralIncomeAtCreation.amountRaw);
  const streamed = BigInt(data.atlasReferralIncomeStreamed.amountRaw);
  const calculatedRate = gross > 0n ? Number(atlas * 10000n / gross) : 0;
  let grossSeries = 0n;
  let atlasSeries = 0n;
  let previousEnd = null;
  data.series.forEach((row) => {
    const rowGross = BigInt(row?.grossPartnerRewardsPaid?.amountRaw || "0");
    const rowAtlas = BigInt(row?.atlasReferralIncome?.amountRaw || "0");
    const rowRate = rowGross > 0n ? Number(rowAtlas * 10000n / rowGross) : 0;
    if (!row?.bucketStart || !row?.bucketEnd || Date.parse(row.bucketStart) >= Date.parse(row.bucketEnd)
      || (previousEnd && row.bucketStart !== previousEnd)
      || !Number.isInteger(row.captureRateBasisPoints) || row.captureRateBasisPoints !== rowRate) {
      throw new AdminFinanceApiError("Partner economics series is inconsistent.", {
        code: "invalid_partner_economics_series",
        requestId: payload.meta?.requestId,
      });
    }
    grossSeries += rowGross;
    atlasSeries += rowAtlas;
    previousEnd = row.bucketEnd;
  });
  if (creation + streamed !== atlas || grossSeries !== gross || atlasSeries !== atlas
    || data.captureRateBasisPoints !== calculatedRate
    || data.gapBasisPoints !== data.captureRateBasisPoints - data.targetBasisPoints) {
    throw new AdminFinanceApiError("Partner economics arithmetic does not balance.", {
      code: "invalid_partner_economics_arithmetic",
      requestId: payload.meta?.requestId,
    });
  }
  return payload;
}

function validateCompanyEconomics(payload) {
  normalizeLegacyRewardVocabulary(payload);
  validateDataset(payload);
  const data = payload.data;
  const required = [
    "incomingFlow", "platformFeeFromDelta", "platformFeeFromPartnerReward", "platformFeeTotal",
    "headAccountIncomeAtCreation", "headAccountIncomeStreamed", "headAccountIncome", "companyRevenue",
    "companyRevenueRateBasisPoints", "targetBasisPoints", "gapBasisPoints", "targetRevenue",
    "surplus", "shortfall", "attributionStatus", "series",
  ];
  if (!data || required.some((key) => data[key] === undefined)
    || payload.meta.perimeter !== "company_treasury"
    || !["complete", "partial"].includes(data.attributionStatus)
    || !Number.isInteger(data.companyRevenueRateBasisPoints) || data.companyRevenueRateBasisPoints < 0 || data.companyRevenueRateBasisPoints > 10000
    || !Number.isInteger(data.targetBasisPoints) || data.targetBasisPoints < 0 || data.targetBasisPoints > 10000
    || !Number.isInteger(data.gapBasisPoints) || !Array.isArray(data.series) || !data.series.length) {
    throw new AdminFinanceApiError("Company economics response is incomplete.", {
      code: "invalid_company_economics",
      requestId: payload.meta?.requestId,
    });
  }
  const raw = (value) => BigInt(value?.amountRaw || "0");
  const incoming = raw(data.incomingFlow);
  const feeDelta = raw(data.platformFeeFromDelta);
  const feePartner = raw(data.platformFeeFromPartnerReward);
  const feeTotal = raw(data.platformFeeTotal);
  const headCreation = raw(data.headAccountIncomeAtCreation);
  const headStreamed = raw(data.headAccountIncomeStreamed);
  const headTotal = raw(data.headAccountIncome);
  const companyRevenue = raw(data.companyRevenue);
  const targetRevenue = incoming * BigInt(data.targetBasisPoints) / 10000n;
  const calculatedRate = incoming > 0n ? Number(companyRevenue * 10000n / incoming) : 0;
  const variance = companyRevenue - targetRevenue;
  let seriesIncoming = 0n;
  let seriesFee = 0n;
  let seriesHead = 0n;
  let seriesRevenue = 0n;
  let previousEnd = null;
  data.series.forEach((row) => {
    const rowIncoming = raw(row?.incomingFlow);
    const rowFee = raw(row?.platformFeeTotal);
    const rowHead = raw(row?.headAccountIncome);
    const rowRevenue = raw(row?.companyRevenue);
    const rowRate = rowIncoming > 0n ? Number(rowRevenue * 10000n / rowIncoming) : 0;
    if (!row?.bucketStart || !row?.bucketEnd || Date.parse(row.bucketStart) >= Date.parse(row.bucketEnd)
      || (previousEnd && row.bucketStart !== previousEnd)
      || rowFee !== raw(row.platformFeeFromDelta) + raw(row.platformFeeFromPartnerReward)
      || rowHead !== raw(row.headAccountIncomeAtCreation) + raw(row.headAccountIncomeStreamed)
      || rowRevenue !== rowFee + rowHead
      || !Number.isInteger(row.companyRevenueRateBasisPoints) || row.companyRevenueRateBasisPoints < 0 || row.companyRevenueRateBasisPoints > 10000
      || row.companyRevenueRateBasisPoints !== rowRate) {
      throw new AdminFinanceApiError("Company economics series is inconsistent.", {
        code: "invalid_company_economics_series",
        requestId: payload.meta?.requestId,
      });
    }
    seriesIncoming += rowIncoming;
    seriesFee += rowFee;
    seriesHead += rowHead;
    seriesRevenue += rowRevenue;
    previousEnd = row.bucketEnd;
  });
  if ([incoming, feeDelta, feePartner, feeTotal, headCreation, headStreamed, headTotal, companyRevenue, raw(data.targetRevenue), raw(data.surplus), raw(data.shortfall)].some((value) => value < 0n)
    || feeDelta + feePartner !== feeTotal || headCreation + headStreamed !== headTotal
    || feeTotal + headTotal !== companyRevenue || raw(data.targetRevenue) !== targetRevenue
    || data.companyRevenueRateBasisPoints !== calculatedRate
    || data.gapBasisPoints !== calculatedRate - data.targetBasisPoints
    || raw(data.surplus) !== (variance > 0n ? variance : 0n)
    || raw(data.shortfall) !== (variance < 0n ? -variance : 0n)
    || seriesIncoming !== incoming || seriesFee !== feeTotal || seriesHead !== headTotal || seriesRevenue !== companyRevenue) {
    throw new AdminFinanceApiError("Company economics arithmetic does not balance.", {
      code: "invalid_company_economics_arithmetic",
      requestId: payload.meta?.requestId,
    });
  }
  return payload;
}

function validatePage(payload) {
  if (!payload.page || typeof payload.page.hasMore !== "boolean"
    || (payload.page.nextCursor !== null && payload.page.nextCursor !== undefined && typeof payload.page.nextCursor !== "string")) {
    throw new AdminFinanceApiError("Financial pagination metadata is invalid.", {
      code: "invalid_pagination",
      requestId: payload.meta?.requestId,
    });
  }
}

function validatePlatformFees(payload) {
  normalizeLegacyRewardVocabulary(payload);
  validateDataset(payload);
  validatePage(payload);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const txHash = /^0x[0-9a-f]{64}$/i;
  const moments = new Set(["delta_claim", "partner_reward_creation", "partner_reward_streamed"]);
  const statuses = new Set(["allocated", "received", "exception"]);
  if (payload.meta.perimeter !== "company_treasury" || !Array.isArray(payload.data)) {
    throw new AdminFinanceApiError("Platform Fee response is incomplete.", { code: "invalid_platform_fees", requestId: payload.meta?.requestId });
  }
  payload.data.forEach((row) => {
    const gross = BigInt(row?.grossAmount?.amountRaw || "-1");
    const fee = BigInt(row?.platformFee?.amountRaw || "-1");
    const expectedFee = gross * BigInt(row?.feeRateBasisPoints || 0) / 10000n;
    if (!uuid.test(row?.id || "") || !moments.has(row?.sourceMoment) || !row?.cycleLabel
      || !Number.isInteger(row?.feeRateBasisPoints) || row.feeRateBasisPoints < 0 || row.feeRateBasisPoints > 10000
      || gross < 0n || fee < 0n || fee !== expectedFee
      || !txHash.test(row?.allocationTxHash || "") || !txHash.test(row?.treasuryReceiptTxHash || "")
      || !Number.isSafeInteger(row?.blockNumber) || row.blockNumber < 1
      || !statuses.has(row?.status) || !["not_run", "reconciling", "reconciled", "exception", "blocked"].includes(row?.reconciliationStatus)
      || Number.isNaN(Date.parse(row?.occurredAt))) {
      throw new AdminFinanceApiError("Platform Fee row is inconsistent.", { code: "invalid_platform_fee_row", requestId: payload.meta?.requestId });
    }
  });
  return payload;
}

function validateCompanyReceipts(payload) {
  normalizeLegacyRewardVocabulary(payload);
  validateDataset(payload);
  validatePage(payload);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const txHash = /^0x[0-9a-f]{64}$/i;
  const types = new Set(["platform_fee_delta", "platform_fee_partner", "head_account_creation", "head_account_streamed"]);
  if (payload.meta.perimeter !== "company_treasury" || !Array.isArray(payload.data)) {
    throw new AdminFinanceApiError("Company receipt response is incomplete.", { code: "invalid_company_receipts", requestId: payload.meta?.requestId });
  }
  payload.data.forEach((row) => {
    const amount = BigInt(row?.amount?.amountRaw || "-1");
    if (!uuid.test(row?.id || "") || !types.has(row?.receiptType) || !row?.cycleLabel || amount < 0n
      || (row?.sourceEventId !== null && !uuid.test(row?.sourceEventId || ""))
      || !txHash.test(row?.txHash || "") || !Number.isSafeInteger(row?.logIndex) || row.logIndex < 0
      || !Number.isSafeInteger(row?.blockNumber) || row.blockNumber < 1
      || !["provisional", "safe", "finalized"].includes(row?.finality)
      || !["not_run", "reconciling", "reconciled", "exception", "blocked"].includes(row?.reconciliationStatus)
      || Number.isNaN(Date.parse(row?.occurredAt))) {
      throw new AdminFinanceApiError("Company receipt row is inconsistent.", { code: "invalid_company_receipt_row", requestId: payload.meta?.requestId });
    }
  });
  return payload;
}

function validateAlphaMeta(payload) {
  const statuses = new Set(["available", "partial", "unavailable"]);
  const requiredDomains = new Set([
    "cash_flows",
    "liquidity",
    "cycles",
    "claims",
    "payout_forecast",
    "reconciliation",
    "company_revenue",
  ]);
  if (!payload || payload.status !== "internal_alpha_partial" || !Array.isArray(payload.capabilities)
    || !Array.isArray(payload.dataCoverage) || !payload.snapshot || !payload.gateZero) {
    throw new AdminFinanceApiError("Admin Alpha metadata is incomplete.", {
      code: "invalid_alpha_meta_response",
    });
  }
  if (!Number.isSafeInteger(payload.snapshot.asOfBlockNumber) || payload.snapshot.asOfBlockNumber < 1
    || !/^0x[0-9a-f]{64}$/i.test(payload.snapshot.asOfBlockHash || "")) {
    throw new AdminFinanceApiError("Admin Alpha snapshot identity is invalid.", {
      code: "invalid_alpha_meta_response",
    });
  }
  const seen = new Set();
  payload.dataCoverage.forEach((item) => {
    const required = ["id", "label", "status", "source", "affectsRoutes", "blocker", "nextAction", "gateId", "owner"];
    if (!item || required.some((key) => item[key] === undefined || item[key] === null)
      || seen.has(item.id) || !requiredDomains.has(item.id) || !statuses.has(item.status)
      || !Array.isArray(item.affectsRoutes) || !item.affectsRoutes.length
      || !/^G0-(0[1-9]|1[0-4])$/.test(item.gateId)) {
      throw new AdminFinanceApiError("Admin Alpha data coverage is invalid.", {
        code: "invalid_alpha_meta_response",
      });
    }
    seen.add(item.id);
  });
  if (seen.size !== requiredDomains.size) {
    throw new AdminFinanceApiError("Admin Alpha data coverage is incomplete.", {
      code: "invalid_alpha_meta_response",
    });
  }
  return payload;
}

function validateAdminMeta(payload) {
  if (payload?.status === "blocked_gate0") {
    if (typeof payload.apiVersion !== "string" || !Array.isArray(payload.capabilities)
      || !payload.gateZero || !Number.isInteger(payload.gateZero.closed)
      || !Number.isInteger(payload.gateZero.total) || payload.gateZero.total !== 14
      || payload.gateZero.closed < 0 || payload.gateZero.closed > payload.gateZero.total) {
      throw new AdminFinanceApiError("Admin demo metadata is incomplete.", {
        code: "invalid_demo_meta_response",
      });
    }
    return payload;
  }
  return validateAlphaMeta(payload);
}

function validateFinanceOverview(payload) {
  validateDataset(payload);
  const data = payload.data;
  const required = ["coverage", "liquidity", "obligations", "cashFlow", "cycles", "companyRevenue"];
  if (!data || required.some((key) => !data[key])) {
    throw new AdminFinanceApiError("Finance overview response is incomplete.", {
      code: "invalid_finance_overview_response",
      requestId: payload.meta?.requestId,
    });
  }
  if (data.liquidity.perimeter !== "payout_contract"
    || data.obligations.perimeter !== "payout_contract"
    || data.cashFlow.perimeter !== "atlas_consolidated"
    || data.cycles.perimeter !== "participant_economics"
    || data.companyRevenue.perimeter !== "company_treasury") {
    throw new AdminFinanceApiError("Finance overview section perimeter is invalid.", {
      code: "invalid_finance_overview_perimeter",
      requestId: payload.meta?.requestId,
    });
  }
  return payload;
}

function validateGateZero(payload) {
  if (!payload || !Array.isArray(payload.data) || payload.data.length !== 14 || payload.total !== 14) {
    throw new AdminFinanceApiError("Gate 0 response must contain exactly 14 decisions.", {
      code: "invalid_gate_zero_response",
    });
  }
  const ids = new Set(payload.data.map((item) => item.id));
  if (ids.size !== 14 || payload.data.some((item) => !/^G0-(0[1-9]|1[0-4])$/.test(item.id))) {
    throw new AdminFinanceApiError("Gate 0 decision identifiers are invalid.", {
      code: "invalid_gate_zero_response",
    });
  }
  return payload;
}

function validateForecastSnapshot(payload) {
  validateDataset(payload);
  const data = payload.data;
  const required = ["id", "scenario", "perimeter", "asOf", "horizonEnd", "openingLiquidity", "reserveTarget", "totalOutflow", "peakFundingGap", "horizons"];
  if (!data || required.some((key) => data[key] === undefined || data[key] === null) || data.perimeter !== "payout_contract" || !Array.isArray(data.horizons)) {
    throw new AdminFinanceApiError("Forecast snapshot response is incomplete.", {
      code: "invalid_forecast_snapshot_response",
      requestId: payload.meta?.requestId,
    });
  }
  return payload;
}

function validateForecastBuckets(payload) {
  validateDataset(payload);
  if (!Array.isArray(payload.data)) {
    throw new AdminFinanceApiError("Forecast buckets response must be an array.", {
      code: "invalid_forecast_buckets_response",
      requestId: payload.meta?.requestId,
    });
  }
  let previousClosing = null;
  payload.data.forEach((row) => {
    const componentTotal = BigInt(row.principalDue?.amountRaw || "0")
      + BigInt(row.grossDeltaDue?.amountRaw || "0")
      + BigInt(row.partnerRewardDue?.amountRaw || "0")
      + BigInt(row.pendingPartnerCreationDue?.amountRaw || "0");
    const total = BigInt(row.totalOutflowDue?.amountRaw || "0");
    const closing = BigInt(row.openingLiquidity?.amountRaw || "0")
      + BigInt(row.expectedInflow?.amountRaw || "0")
      - total;
    if (componentTotal !== total || closing !== BigInt(row.closingLiquidity?.amountRaw || "0") || (previousClosing !== null && previousClosing !== BigInt(row.openingLiquidity?.amountRaw || "0"))) {
      throw new AdminFinanceApiError("Forecast bucket sequence is inconsistent.", {
        code: "invalid_forecast_bucket_sequence",
        requestId: payload.meta?.requestId,
      });
    }
    previousClosing = closing;
  });
  return payload;
}

function validateCycles(payload) {
  validateDataset(payload);
  if (!Array.isArray(payload.data) || payload.meta.perimeter !== "participant_economics") {
    throw new AdminFinanceApiError("Cycle response must be a participant-economics array.", {
      code: "invalid_cycles_response",
      requestId: payload.meta?.requestId,
    });
  }
  const productKeys = new Set();
  const required = [
    "id",
    "productKey",
    "label",
    "status",
    "openedCount",
    "openCount",
    "closedCount",
    "claimableCount",
    "termEndedCount",
    "principal",
    "grossDeltaPaid",
    "projectedMaturityOutflow",
    "claimableNow",
    "next7DaysLoad",
    "next30DaysLoad",
    "rulesetVersion",
  ];
  payload.data.forEach((row) => {
    if (!row || required.some((key) => row[key] === undefined || row[key] === null)
      || !Number.isInteger(row.openedCount) || row.openedCount < 0
      || !Number.isInteger(row.openCount) || row.openCount < 0
      || !Number.isInteger(row.closedCount) || row.closedCount < 0
      || !Number.isInteger(row.claimableCount) || row.claimableCount < 0
      || !Number.isInteger(row.termEndedCount) || row.termEndedCount < 0
      || row.openCount + row.closedCount !== row.openedCount
      || productKeys.has(row.productKey)) {
      throw new AdminFinanceApiError("Cycle aggregate row is invalid or duplicated.", {
        code: "invalid_cycles_response",
        requestId: payload.meta?.requestId,
      });
    }
    productKeys.add(row.productKey);
  });
  return payload;
}

const claimStatuses = new Set(["eligible", "requested", "pending", "failed", "paid", "reversed", "expired"]);
const payoutComponentTypes = new Set(["principal", "delta", "partner_reward_creation", "partner_reward_streamed"]);

function validateClaimRecord(row, requestId) {
  const required = ["id", "cycleId", "participantId", "status", "eligibleAt", "components"];
  if (!row || required.some((key) => row[key] === undefined || row[key] === null)
    || !claimStatuses.has(row.status) || !Array.isArray(row.components) || !row.components.length
    || (["paid", "reversed", "expired"].includes(row.status) && !row.settledAt)) {
    throw new AdminFinanceApiError("Claim lifecycle record is incomplete.", {
      code: "invalid_claims_response",
      requestId,
    });
  }
  const componentTypes = new Set();
  row.components.forEach((component) => {
    if (!component || !payoutComponentTypes.has(component.type) || componentTypes.has(component.type)
      || !Array.isArray(component.transferIds)) {
      throw new AdminFinanceApiError("Claim payout component is invalid or duplicated.", {
        code: "invalid_claims_response",
        requestId,
      });
    }
    const gross = BigInt(component.gross?.amountRaw || "0");
    const net = BigInt(component.net?.amountRaw || "0");
    const fee = BigInt(component.platformFee?.amountRaw || "0");
    const deductions = BigInt(component.otherDeductions?.amountRaw || "0");
    if (gross !== net + fee + deductions) {
      throw new AdminFinanceApiError("Claim payout component does not reconcile gross to net and deductions.", {
        code: "invalid_claim_component_balance",
        requestId,
      });
    }
    componentTypes.add(component.type);
  });
}

function validateClaims(payload, { single = false } = {}) {
  normalizeLegacyRewardVocabulary(payload);
  validateDataset(payload);
  if (payload.meta.perimeter !== "participant_economics") {
    throw new AdminFinanceApiError("Claim response perimeter is invalid.", {
      code: "invalid_claims_response",
      requestId: payload.meta?.requestId,
    });
  }
  const rows = single ? [payload.data] : payload.data;
  if (!Array.isArray(rows)) {
    throw new AdminFinanceApiError("Claim response data shape is invalid.", {
      code: "invalid_claims_response",
      requestId: payload.meta?.requestId,
    });
  }
  const ids = new Set();
  rows.forEach((row) => {
    validateClaimRecord(row, payload.meta?.requestId);
    if (ids.has(row.id)) {
      throw new AdminFinanceApiError("Claim record is duplicated.", {
        code: "invalid_claims_response",
        requestId: payload.meta?.requestId,
      });
    }
    ids.add(row.id);
  });
  return payload;
}

const participantStatuses = new Set(["active", "inactive", "blocked", "unknown"]);
const participantMatchTypes = new Set(["wallet", "atlas_id", "referral", "direct_referral_ordinal"]);
const participantRiskStates = new Set(["none", "inactive_9d", "review"]);
const maskedWalletPattern = /^0x[0-9a-f]{4}…[0-9a-f]{4}$/i;
const fullWalletPattern = /^0x[0-9a-f]{40}$/i;

function assertMaskedWallet(value, requestId) {
  if (typeof value !== "string" || !maskedWalletPattern.test(value) || fullWalletPattern.test(value)) {
    throw new AdminFinanceApiError("Participant response exposed an invalid wallet representation.", {
      code: "invalid_participant_wallet_mask",
      requestId,
    });
  }
}

function validateParticipantSearch(payload) {
  validateDataset(payload);
  if (payload.meta.perimeter !== "participant_economics" || !Array.isArray(payload.data)) {
    throw new AdminFinanceApiError("Participant search response is invalid.", {
      code: "invalid_participant_search_response",
      requestId: payload.meta?.requestId,
    });
  }
  const ids = new Set();
  payload.data.forEach((row) => {
    const required = ["participantId", "atlasId", "referralCode", "maskedWallet", "status", "currentRankLabel", "matchType", "exact"];
    if (!row || required.some((key) => row[key] === undefined || row[key] === null)
      || ids.has(row.participantId) || !participantStatuses.has(row.status)
      || !participantMatchTypes.has(row.matchType) || typeof row.exact !== "boolean"
      || (row.headAccountBranchOrdinal !== undefined && row.headAccountBranchOrdinal !== null
        && (!Number.isInteger(row.headAccountBranchOrdinal) || row.headAccountBranchOrdinal < 1))) {
      throw new AdminFinanceApiError("Participant search row is incomplete or duplicated.", {
        code: "invalid_participant_search_response",
        requestId: payload.meta?.requestId,
      });
    }
    assertMaskedWallet(row.maskedWallet, payload.meta?.requestId);
    ids.add(row.participantId);
  });
  return payload;
}

function validateParticipantProfile(payload) {
  validateDataset(payload);
  const profile = payload.data;
  const required = ["id", "atlasId", "referralCode", "maskedWallet", "walletRevealAvailable", "status", "currentRank", "currentRankLabel", "registeredAt", "sponsor", "firstLine", "structure", "received", "futureObligations", "activity", "protectedResources"];
  if (payload.meta.perimeter !== "participant_economics" || !profile
    || required.some((key) => profile[key] === undefined || profile[key] === null)
    || !participantStatuses.has(profile.status) || typeof profile.walletRevealAvailable !== "boolean") {
    throw new AdminFinanceApiError("Participant profile response is incomplete.", {
      code: "invalid_participant_profile_response",
      requestId: payload.meta?.requestId,
    });
  }
  assertMaskedWallet(profile.maskedWallet, payload.meta?.requestId);
  assertMaskedWallet(profile.sponsor.maskedWallet, payload.meta?.requestId);
  if (profile.headAccountBranchOrdinal !== undefined && profile.headAccountBranchOrdinal !== null
    && (!Number.isInteger(profile.headAccountBranchOrdinal) || profile.headAccountBranchOrdinal < 1)) {
    throw new AdminFinanceApiError("Participant head-account branch ordinal is invalid.", {
      code: "invalid_participant_profile_response",
      requestId: payload.meta?.requestId,
    });
  }
  if (!Number.isInteger(profile.firstLine.participantCount) || profile.firstLine.participantCount < 0
    || !Number.isInteger(profile.firstLine.walletsWithCycles) || profile.firstLine.walletsWithCycles < 0
    || profile.firstLine.walletsWithCycles > profile.firstLine.participantCount
    || !Number.isInteger(profile.structure.participantCount) || profile.structure.participantCount < profile.firstLine.participantCount
    || !Number.isInteger(profile.structure.maxDepth) || profile.structure.maxDepth < 1) {
    throw new AdminFinanceApiError("Participant structure aggregates are inconsistent.", {
      code: "invalid_participant_profile_response",
      requestId: payload.meta?.requestId,
    });
  }
  const receivedParts = BigInt(profile.received.deltaNet?.amountRaw || "0")
    + BigInt(profile.received.partnerRewardCreationNet?.amountRaw || "0")
    + BigInt(profile.received.partnerRewardClaimNet?.amountRaw || "0");
  if (receivedParts !== BigInt(profile.received.total?.amountRaw || "0")) {
    throw new AdminFinanceApiError("Participant received payout components do not reconcile.", {
      code: "invalid_participant_payout_balance",
      requestId: payload.meta?.requestId,
    });
  }
  return payload;
}

function validateParticipantFirstLine(payload) {
  validateDataset(payload);
  if (payload.meta.perimeter !== "participant_economics" || !Array.isArray(payload.data)) {
    throw new AdminFinanceApiError("Participant first-line response is invalid.", {
      code: "invalid_participant_first_line_response",
      requestId: payload.meta?.requestId,
    });
  }
  const ids = new Set();
  payload.data.forEach((row) => {
    const required = ["participantId", "atlasId", "maskedWallet", "status", "rankLabel", "principal", "cycleCount", "activeCycleCount", "partnerReceived", "deltaReceived", "lastActivityAt", "riskState"];
    if (!row || required.some((key) => row[key] === undefined || row[key] === null)
      || ids.has(row.participantId) || !participantStatuses.has(row.status)
      || !participantRiskStates.has(row.riskState)
      || !Number.isInteger(row.cycleCount) || row.cycleCount < 0
      || !Number.isInteger(row.activeCycleCount) || row.activeCycleCount < 0 || row.activeCycleCount > row.cycleCount) {
      throw new AdminFinanceApiError("Participant first-line row is incomplete or duplicated.", {
        code: "invalid_participant_first_line_response",
        requestId: payload.meta?.requestId,
      });
    }
    assertMaskedWallet(row.maskedWallet, payload.meta?.requestId);
    ids.add(row.participantId);
  });
  return payload;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("json")) {
    throw new AdminFinanceApiError("Admin API returned a non-JSON response.", {
      status: response.status,
      code: "invalid_response_content_type",
    });
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new AdminFinanceApiError("Admin API returned malformed JSON.", {
      status: response.status,
      code: "invalid_response_json",
    });
  }
  if (!response.ok) {
    throw new AdminFinanceApiError(payload.detail || payload.title || "Admin API request failed.", {
      status: response.status,
      code: payload.code,
      requestId: payload.requestId || response.headers.get("x-request-id"),
      retryable: payload.retryable,
    });
  }
  return payload;
}

export function createAdminFinanceClient(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required");

  async function get(path, query, requestOptions = {}) {
    const response = await fetchImpl(buildUrl(path, query), {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: requestOptions.signal,
    });
    return parseResponse(response);
  }

  return Object.freeze({
    getMeta: async (options) => validateAdminMeta(await get("/meta", undefined, options)),
    getGateZero: async (options) => validateGateZero(await get("/methodology/gate0", undefined, options)),
    getFinanceOverview: async (query, options) => validateFinanceOverview(await get("/finance/overview", query, options)),
    getReconciliationRuns: async (query, options) => validateDataset(await get("/reconciliation/runs", query, options)),
    getReconciliationExceptions: async (query, options) => validateDataset(await get("/reconciliation/exceptions", query, options)),
    getCashMovements: async (query, options) => validateDataset(await get("/finance/cash-movements", query, options)),
    getLiquidityRollForward: async (query, options) => validateDataset(await get("/finance/liquidity/roll-forward", query, options)),
    getManagementGrowthPlan: async (options) => validateManagementGrowthPlan(await get("/management/growth-plan", undefined, options)),
    getPartnerEconomics: async (query, options) => validatePartnerEconomics(await get("/finance/partner-economics", query, options)),
    getCompanyEconomics: async (query, options) => validateCompanyEconomics(await get("/finance/company-economics", query, options)),
    getPlatformFees: async (query, options) => validatePlatformFees(await get("/finance/platform-fees", query, options)),
    getCompanyReceipts: async (query, options) => validateCompanyReceipts(await get("/finance/company-receipts", query, options)),
    getCycles: async (query, options) => validateCycles(await get("/finance/cycles", query, options)),
    getClaims: async (query, options) => validateClaims(await get("/claims", query, options)),
    getClaim: async (claimId, query = {}, options) => validateClaims(await get(`/claims/${encodeURIComponent(claimId)}`, query, options), { single: true }),
    searchParticipants: async (query, options) => validateParticipantSearch(await get("/participants/search", query, options)),
    getParticipant: async (participantId, options) => validateParticipantProfile(await get(`/participants/${encodeURIComponent(participantId)}`, undefined, options)),
    getParticipantFirstLine: async (participantId, query, options) => validateParticipantFirstLine(await get(`/participants/${encodeURIComponent(participantId)}/first-line`, query, options)),
    getLatestForecastSnapshot: async (query, options) => validateForecastSnapshot(await get("/forecast/snapshots/latest", query, options)),
    getForecastSnapshot: async (snapshotId, options) => validateForecastSnapshot(await get(`/forecast/snapshots/${encodeURIComponent(snapshotId)}`, undefined, options)),
    getForecastBuckets: async (query, options) => validateForecastBuckets(await get("/forecast/buckets", query, options)),
  });
}

export const adminFinanceApi = createAdminFinanceClient();
