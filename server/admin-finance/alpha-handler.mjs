import { createHash } from "node:crypto";

const BASE_PATH = "/api/admin/v1";
const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;
const PERIMETERS = new Set(["payout_contract", "atlas_consolidated", "company_treasury"]);
const CLAIM_STATUSES = new Set(["eligible", "requested", "pending", "failed", "paid", "reversed", "expired"]);
const EXCEPTION_STATUSES = new Set(["open", "acknowledged", "resolved", "accepted"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class AlphaApiProblem extends Error {
  constructor(status, code, title, detail = title) {
    super(detail);
    this.status = status;
    this.code = code;
    this.title = title;
  }
}

function problem(status, code, title, detail) {
  throw new AlphaApiProblem(status, code, title, detail);
}

function uuid(value) {
  const bytes = createHash("sha256").update(String(value)).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function assertAllowedQuery(url, allowed) {
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key)) problem(400, "unknown_query_parameter", "Unknown query parameter", `Query parameter '${key}' is not supported.`);
  }
}

function requiredQuery(url, name) {
  const value = url.searchParams.get(name);
  if (!value) problem(400, "missing_query_parameter", "Missing query parameter", `Query parameter '${name}' is required.`);
  return value;
}

function parseRange(url) {
  const from = requiredQuery(url, "from");
  const to = requiredQuery(url, "to");
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) problem(400, "invalid_time_range", "Invalid time range");
  if (toMs - fromMs > MAX_RANGE_MS) problem(400, "time_range_too_large", "Time range is too large");
  return { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() };
}

function parsePerimeter(url, fallback = null) {
  const value = url.searchParams.get("perimeter") || fallback;
  if (!value) problem(400, "missing_query_parameter", "Missing query parameter", "Query parameter 'perimeter' is required.");
  if (!PERIMETERS.has(value)) problem(400, "invalid_perimeter", "Invalid financial perimeter");
  return value;
}

function parseLimit(url) {
  const raw = url.searchParams.get("limit") || "100";
  if (!/^[0-9]+$/.test(raw)) problem(400, "invalid_limit", "Invalid page limit");
  const limit = Number(raw);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) problem(400, "invalid_limit", "Invalid page limit");
  return limit;
}

function availableInRange(row, range) {
  return Date.parse(row.bucketEnd) > Date.parse(range.from) && Date.parse(row.bucketStart) < Date.parse(range.to);
}

function meta(snapshot, requestId, options = {}) {
  const range = options.range || snapshot.coverage;
  return {
    perimeter: options.perimeter || "payout_contract",
    currency: snapshot.token.symbol,
    from: range.from,
    to: range.to,
    asOfBlockNumber: snapshot.asOfBlockNumber,
    asOfBlockHash: snapshot.asOfBlockHash,
    finality: snapshot.finality,
    freshnessSeconds: snapshot.freshnessSeconds,
    partial: true,
    partialReasons: [...new Set([...snapshot.partialReasons, ...(options.partialReasons || [])])],
    sourceStatus: snapshot.sourceStatus,
    formulaVersion: snapshot.formulaVersion,
    rulesetVersion: snapshot.rulesetVersion,
    reconciliationStatus: snapshot.reconciliationStatus,
    requestId,
    generatedAt: snapshot.generatedAt,
  };
}

function dataset(data, snapshot, requestId, options = {}) {
  return { data, meta: meta(snapshot, requestId, options) };
}

function paginated(data, snapshot, requestId, options = {}) {
  const limit = options.limit || 100;
  return {
    data: data.slice(0, limit),
    page: { nextCursor: null, hasMore: data.length > limit },
    meta: meta(snapshot, requestId, options),
  };
}

function unavailableMoney(snapshot) {
  return {
    amountRaw: "0",
    decimals: snapshot.token.decimals,
    tokenAddress: snapshot.token.address,
    symbol: snapshot.token.symbol,
    available: false,
  };
}

function buildOverview(snapshot) {
  const empty = unavailableMoney(snapshot);
  const principalTotal = snapshot.cycles.reduce((sum, row) => sum + BigInt(row.principal.amountRaw), 0n);
  const cycleRows = snapshot.cycles.map((row) => ({
    label: row.label,
    productKey: row.productKey,
    openedCount: row.openedCount,
    inflow: row.principal,
    shareBps: principalTotal ? Number(BigInt(row.principal.amountRaw) * 10000n / principalTotal) : 0,
  }));
  return {
    coverage: snapshot.coverage,
    liquidity: { perimeter: "payout_contract", canonicalClosing: snapshot.liquidity.summary.canonicalClosing },
    obligations: { perimeter: "payout_contract", total: empty },
    cashFlow: { perimeter: "atlas_consolidated" },
    cycles: { perimeter: "participant_economics", rows: cycleRows },
    companyRevenue: { perimeter: "company_treasury", total: empty },
  };
}

function buildRun(snapshot) {
  const unavailable = unavailableMoney(snapshot);
  return {
    id: uuid(`run:${snapshot.id}`),
    status: "exception",
    perimeter: "payout_contract",
    fromBlock: null,
    toBlock: snapshot.asOfBlockNumber,
    expectedClosing: unavailable,
    observedClosing: snapshot.liquidity.summary.canonicalClosing,
    residual: unavailable,
    startedAt: snapshot.generatedAt,
    completedAt: snapshot.generatedAt,
    modelCommit: snapshot.formulaVersion,
    confirmations: snapshot.confirmations,
    blockHash: snapshot.asOfBlockHash,
  };
}

function buildExceptions(snapshot) {
  return snapshot.partialReasons.map((reason) => ({
    id: uuid(`exception:${snapshot.id}:${reason}`),
    type: "source_gap",
    severity: reason.includes("failures") || reason.includes("diagnostics") ? "critical" : "review",
    status: "open",
    sourceRef: reason,
    amount: unavailableMoney(snapshot),
    reason,
    owner: "Data owner",
    openedAt: snapshot.generatedAt,
  }));
}

function gateOwner(gateZeroDecisions, gateId) {
  const gate = gateZeroDecisions.find((item) => item.id === gateId);
  return gate?.owner && gate.owner !== "unassigned" ? gate.owner : "Не назначен";
}

function buildDataCoverage(snapshot, gateZeroDecisions, forecastConfigured = false) {
  const hasCanonicalLiquidity = snapshot.liquidity?.summary?.canonicalClosing?.available !== false;
  const shared = (gateId) => ({ gateId, owner: gateOwner(gateZeroDecisions, gateId) });
  return [
    {
      id: "cash_flows",
      label: "Входящий / исходящий / Net Flow",
      status: "partial",
      source: "On-chain daily aggregates",
      affectsRoutes: ["flows", "overview"],
      blocker: "Нужна независимая сверка provider buckets с ledger и transfers.",
      nextAction: "Сверить контрольный период и зафиксировать immutable block cut.",
      ...shared("G0-07"),
    },
    {
      id: "liquidity",
      label: "Ликвидность payout contract",
      status: "partial",
      source: hasCanonicalLiquidity ? "Block-tagged balanceOf" : "Provider-reported checkpoint",
      affectsRoutes: ["liquidity", "forecast"],
      blocker: hasCanonicalLiquidity
        ? "Доступен checkpoint, но нет подтверждённого исторического roll-forward."
        : "Archive-capable RPC не подтвердил balanceOf на том же блоке.",
      nextAction: "Подключить archive-capable RPC и сверить opening + movements = closing.",
      ...shared("G0-02"),
    },
    {
      id: "cycles",
      label: "Циклы и нагрузка 7 / 30 дней",
      status: "partial",
      source: "On-chain cycle/load aggregates",
      affectsRoutes: ["cycles", "forecast"],
      blocker: "Нет точных maturity dates и состава Principal / Gross Delta / Partner Reward.",
      nextAction: "Передать versioned cycle lifecycle и payout components по каждому maturity bucket.",
      ...shared("G0-04"),
    },
    {
      id: "claims",
      label: "Claim lifecycle",
      status: "unavailable",
      source: "N/A",
      affectsRoutes: ["claims", "forecast"],
      blocker: "Off-chain статусы eligible / requested / pending / paid не переданы.",
      nextAction: "Подключить claims ledger с event, receipt и transfer lineage.",
      ...shared("G0-04"),
    },
    {
      id: "payout_forecast",
      label: "Cash forecast и funding gap",
      status: forecastConfigured ? "partial" : "unavailable",
      source: forecastConfigured ? "Quarantined provider + independent RPC + PostgreSQL guard" : "N/A",
      affectsRoutes: ["forecast", "risks"],
      blocker: forecastConfigured
        ? "Forecast runtime не считается reconciled до контрольной сверки bucket items с event/receipt/transfer."
        : "Нет maturity buckets, payout components, reserve policy и claim-delay model.",
      nextAction: forecastConfigured
        ? "Сверить минимум 10 bucket items и выполнить PostgreSQL restore drill."
        : "Закрыть входные данные и утвердить reserve/scenario policy до расчёта cash ladder.",
      ...shared("G0-08"),
    },
    {
      id: "reconciliation",
      label: "Независимый financial ledger",
      status: "unavailable",
      source: "N/A",
      affectsRoutes: ["reconciliation", "all_finance"],
      blocker: "Expected closing, residual и economic lineage пока не вычисляются.",
      nextAction: "Нормализовать events, receipts, USDT transfers и payout components в одном cut.",
      ...shared("G0-07"),
    },
    {
      id: "company_revenue",
      label: "Platform Fee и доход компании",
      status: "unavailable",
      source: "N/A",
      affectsRoutes: ["company_revenue", "head_account", "overview"],
      blocker: "Нет отдельного company treasury ledger и referral attribution history.",
      nextAction: "Передать versioned revenue ledger без смешения пользовательских средств и дохода компании.",
      ...shared("G0-03"),
    },
  ];
}

export function isAlphaPath(pathname) {
  return pathname === `${BASE_PATH}/meta`
    || pathname === `${BASE_PATH}/finance/overview`
    || pathname === `${BASE_PATH}/finance/cash-movements`
    || pathname === `${BASE_PATH}/finance/liquidity/roll-forward`
    || pathname === `${BASE_PATH}/finance/cycles`
    || pathname === `${BASE_PATH}/claims`
    || pathname === `${BASE_PATH}/reconciliation/runs`
    || pathname === `${BASE_PATH}/reconciliation/exceptions`
    || pathname === `${BASE_PATH}/methodology/gate0`
    || pathname === `${BASE_PATH}/forecast/snapshots/latest`
    || pathname === `${BASE_PATH}/forecast/buckets`
    || pathname.startsWith(`${BASE_PATH}/claims/`)
    || pathname.startsWith(`${BASE_PATH}/forecast/snapshots/`)
    || pathname.startsWith(`${BASE_PATH}/reconciliation/exceptions/`);
}

function forecastMeta(projection, requestId, range = null) {
  const snapshot = projection.snapshot;
  return {
    perimeter: snapshot.perimeter,
    currency: snapshot.openingLiquidity.symbol,
    from: range?.from || snapshot.asOf,
    to: range?.to || snapshot.horizonEnd,
    asOfBlockNumber: snapshot.asOfBlockNumber,
    asOfBlockHash: snapshot.asOfBlockHash,
    finality: "finalized",
    freshnessSeconds: Math.max(0, Math.floor((Date.now() - Date.parse(snapshot.generatedAt)) / 1000)),
    partial: true,
    partialReasons: ["forecast_quarantine_validated_not_ledger_reconciled"],
    sourceStatus: projection.source?.status || "partial",
    formulaVersion: snapshot.modelVersion,
    rulesetVersion: snapshot.reservePolicyVersion,
    reconciliationStatus: "unreconciled",
    requestId,
    generatedAt: snapshot.generatedAt,
  };
}

async function loadForecastProjection(forecastRuntime) {
  if (!forecastRuntime) {
    problem(503, "forecast_runtime_disabled", "Forecast runtime is disabled", "R1.1 forecast remains fail closed until its PostgreSQL and provider inputs are configured.");
  }
  try {
    return await forecastRuntime.getProjection();
  } catch {
    problem(503, "forecast_source_unavailable", "Forecast source unavailable", "The forecast payload could not be independently verified and committed.");
  }
}

async function handleAlphaForecastGet(url, requestId, forecastRuntime) {
  const path = url.pathname;
  const projection = await loadForecastProjection(forecastRuntime);
  if (path === `${BASE_PATH}/forecast/snapshots/latest`) {
    assertAllowedQuery(url, new Set(["scenario", "perimeter"]));
    const scenario = requiredQuery(url, "scenario");
    const perimeter = requiredQuery(url, "perimeter");
    if (scenario !== "committed") problem(422, "forecast_scenario_not_calibrated", "Forecast scenario is not calibrated");
    if (perimeter !== "payout_contract") problem(400, "forecast_requires_payout_perimeter", "Invalid forecast perimeter");
    return { data: projection.snapshot, meta: forecastMeta(projection, requestId) };
  }

  if (path.startsWith(`${BASE_PATH}/forecast/snapshots/`)) {
    assertAllowedQuery(url, new Set());
    const snapshotId = path.slice(`${BASE_PATH}/forecast/snapshots/`.length);
    if (!UUID_PATTERN.test(snapshotId) || snapshotId !== projection.snapshot.id) problem(404, "resource_not_found", "Resource not found");
    return { data: projection.snapshot, meta: forecastMeta(projection, requestId) };
  }

  if (path === `${BASE_PATH}/forecast/buckets`) {
    assertAllowedQuery(url, new Set(["snapshotId", "from", "to"]));
    const snapshotId = requiredQuery(url, "snapshotId");
    if (!UUID_PATTERN.test(snapshotId)) problem(400, "invalid_snapshot_id", "Invalid forecast snapshot ID");
    if (snapshotId !== projection.snapshot.id) problem(404, "resource_not_found", "Resource not found");
    const range = parseRange(url);
    if (Date.parse(range.from) < Date.parse(projection.snapshot.asOf) || Date.parse(range.to) > Date.parse(projection.snapshot.horizonEnd)) {
      problem(422, "forecast_range_outside_snapshot", "Forecast range is outside the immutable snapshot");
    }
    const rows = projection.buckets.filter((row) => availableInRange(row, range));
    return { data: rows, meta: forecastMeta(projection, requestId, range) };
  }

  problem(404, "resource_not_found", "Resource not found");
}

export async function handleAlphaGet(url, requestId, snapshot, gateZeroDecisions = [], options = {}) {
  const path = url.pathname;
  if (path.startsWith(`${BASE_PATH}/forecast/`)) {
    return handleAlphaForecastGet(url, requestId, options.forecastRuntime);
  }
  if (path === `${BASE_PATH}/meta`) {
    assertAllowedQuery(url, new Set());
    const forecastConfigured = Boolean(options.forecastRuntime);
    return {
      apiVersion: "1.0.0-alpha",
      status: "internal_alpha_partial",
      gateZero: { closed: gateZeroDecisions.filter((item) => item.status === "closed").length, total: gateZeroDecisions.length },
      capabilities: ["reconciliation", "flows", "liquidity", "cycles", "claims", "methodology", ...(forecastConfigured ? ["forecast"] : [])],
      dataCoverage: buildDataCoverage(snapshot, gateZeroDecisions, forecastConfigured),
      snapshot: {
        id: snapshot.id,
        asOfBlockNumber: snapshot.asOfBlockNumber,
        asOfBlockHash: snapshot.asOfBlockHash,
        confirmations: snapshot.confirmations,
        generatedAt: snapshot.generatedAt,
        sourceStatus: snapshot.sourceStatus,
      },
    };
  }

  if (path === `${BASE_PATH}/finance/overview`) {
    assertAllowedQuery(url, new Set(["from", "to", "perimeter", "asOfBlock"]));
    const range = parseRange(url);
    const perimeter = parsePerimeter(url);
    if (perimeter !== "atlas_consolidated") problem(400, "overview_requires_consolidated_perimeter", "Invalid overview perimeter");
    const requestedBlock = url.searchParams.get("asOfBlock");
    if (requestedBlock && Number(requestedBlock) !== snapshot.asOfBlockNumber) problem(422, "snapshot_not_available", "Requested snapshot is not available");
    return dataset(buildOverview(snapshot), snapshot, requestId, { range, perimeter });
  }

  if (path === `${BASE_PATH}/finance/cash-movements`) {
    assertAllowedQuery(url, new Set(["from", "to", "perimeter", "granularity", "cursor", "limit"]));
    const range = parseRange(url);
    const perimeter = parsePerimeter(url);
    const granularity = url.searchParams.get("granularity") || "day";
    if (granularity !== "day") problem(422, "granularity_not_available", "Only daily source buckets are available in Internal Alpha");
    const rows = (snapshot.cashMovementsByPerimeter[perimeter] || []).filter((row) => availableInRange(row, range));
    return paginated(rows, snapshot, requestId, { range, perimeter, limit: parseLimit(url) });
  }

  if (path === `${BASE_PATH}/finance/liquidity/roll-forward`) {
    assertAllowedQuery(url, new Set(["from", "to", "perimeter", "granularity"]));
    const range = parseRange(url);
    const perimeter = parsePerimeter(url);
    if ((url.searchParams.get("granularity") || "day") !== "day") problem(422, "granularity_not_available", "Only the current checkpoint is available in Internal Alpha");
    return dataset(snapshot.liquidity, snapshot, requestId, {
      range,
      perimeter,
      partialReasons: ["liquidity_history_unavailable_current_checkpoint_only"],
    });
  }

  if (path === `${BASE_PATH}/finance/cycles`) {
    assertAllowedQuery(url, new Set(["from", "to", "asOfBlock", "cursor", "limit"]));
    const range = parseRange(url);
    const requestedBlock = url.searchParams.get("asOfBlock");
    if (requestedBlock && Number(requestedBlock) !== snapshot.asOfBlockNumber) problem(422, "snapshot_not_available", "Requested snapshot is not available");
    return paginated(snapshot.cycles, snapshot, requestId, {
      range,
      perimeter: "participant_economics",
      limit: parseLimit(url),
      partialReasons: ["cycle_aggregates_are_all_time_not_period_openings"],
    });
  }

  if (path === `${BASE_PATH}/claims`) {
    assertAllowedQuery(url, new Set(["from", "to", "status", "cursor", "limit"]));
    const range = parseRange(url);
    const status = url.searchParams.get("status");
    if (status && !CLAIM_STATUSES.has(status)) problem(400, "invalid_claim_status", "Invalid claim status");
    return paginated([], snapshot, requestId, {
      range,
      perimeter: "participant_economics",
      limit: parseLimit(url),
      partialReasons: ["claim_lifecycle_offchain_states_unavailable"],
    });
  }

  if (path.startsWith(`${BASE_PATH}/claims/`)) problem(404, "resource_not_found", "Resource not found");

  if (path === `${BASE_PATH}/reconciliation/runs`) {
    assertAllowedQuery(url, new Set(["cursor", "limit"]));
    return paginated([buildRun(snapshot)], snapshot, requestId, {
      perimeter: "payout_contract",
      limit: parseLimit(url),
    });
  }

  if (path === `${BASE_PATH}/reconciliation/exceptions`) {
    assertAllowedQuery(url, new Set(["status", "cursor", "limit"]));
    const status = url.searchParams.get("status");
    if (status && !EXCEPTION_STATUSES.has(status)) problem(400, "invalid_exception_status", "Invalid reconciliation exception status");
    const exceptions = buildExceptions(snapshot).filter((item) => !status || item.status === status);
    return paginated(exceptions, snapshot, requestId, {
      perimeter: "payout_contract",
      limit: parseLimit(url),
    });
  }

  if (path.startsWith(`${BASE_PATH}/reconciliation/exceptions/`)) {
    assertAllowedQuery(url, new Set());
    const id = path.slice(`${BASE_PATH}/reconciliation/exceptions/`.length);
    const item = buildExceptions(snapshot).find((entry) => entry.id === id);
    if (!item) problem(404, "resource_not_found", "Resource not found");
    return dataset(item, snapshot, requestId, { perimeter: "payout_contract" });
  }

  if (path === `${BASE_PATH}/methodology/gate0`) {
    assertAllowedQuery(url, new Set());
    return {
      data: gateZeroDecisions,
      closed: gateZeroDecisions.filter((item) => item.status === "closed").length,
      total: gateZeroDecisions.length,
    };
  }

  problem(404, "resource_not_found", "Resource not found");
}
