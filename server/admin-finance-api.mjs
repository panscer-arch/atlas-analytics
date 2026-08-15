import http from "node:http";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import {
  cashMovementRowsByPerimeter,
  companyEconomics,
  companyReceiptRows,
  claimRows,
  cycleRows,
  demoCapabilities,
  demoSnapshot,
  financeOverview,
  forecastBucketsBySnapshot,
  forecastSnapshots,
  gateZeroDecisions,
  liquidityRollForward,
  managementGrowthPlan,
  participantFirstLineRows,
  participantProfile,
  participantSearchAliases,
  partnerEconomics,
  platformFeeRows,
  reconciliationExceptions,
  reconciliationRuns,
  reserveAlertDeliveries,
  reserveFundingAlert,
} from "./admin-finance/demo-data.mjs";
import { handleAlphaGet, isAlphaPath, AlphaApiProblem } from "./admin-finance/alpha-handler.mjs";
import { createOnchainAlphaProvider, OnchainProviderError } from "./admin-finance/onchain-provider.mjs";
import { createForecastRuntimeFromEnvironment } from "./admin-finance/forecast-runtime.mjs";

const BASE_PATH = "/api/admin/v1";
const SESSION_COOKIE = "__Host-atlas_admin_session";
const DEFAULT_FROM = "2026-08-01T00:00:00Z";
const DEFAULT_TO = "2026-08-05T00:00:00Z";
const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;
const MAX_URL_LENGTH = 4096;
const VALID_PERIMETERS = new Set([
  "payout_contract",
  "atlas_consolidated",
  "company_treasury",
  "participant_economics",
]);
const VALID_CLAIM_STATUSES = new Set([
  "eligible",
  "requested",
  "pending",
  "failed",
  "paid",
  "reversed",
  "expired",
]);
const VALID_EXCEPTION_STATUSES = new Set(["open", "acknowledged", "resolved", "accepted"]);
const VALID_FORECAST_SCENARIOS = new Set(["committed", "base", "stress"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ApiProblem extends Error {
  constructor(status, code, title, detail = title, extraHeaders = {}) {
    super(detail);
    this.status = status;
    this.code = code;
    this.title = title;
    this.extraHeaders = extraHeaders;
  }
}

function requireSecret(name, value) {
  const normalized = String(value || "");
  if (normalized.length < 32) throw new Error(`${name} must contain at least 32 characters`);
  return normalized;
}

function loadForecastDatabaseCa(env) {
  if (String(env.ATLAS_ADMIN_FINANCE_FORECAST_ENABLED || "") !== "true") return undefined;
  const inline = String(env.ATLAS_ADMIN_FINANCE_DATABASE_CA || "").trim();
  if (inline) return inline;
  const path = String(env.ATLAS_ADMIN_FINANCE_DATABASE_CA_FILE || "").trim();
  if (!isAbsolute(path)) throw new Error("ATLAS_ADMIN_FINANCE_DATABASE_CA_FILE must be an absolute path");
  return readFileSync(path, "utf8");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseCookies(request) {
  const result = {};
  for (const part of String(request.headers.cookie || "").split(";")) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    try {
      result[key] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      result[key] = "";
    }
  }
  return result;
}

function validateProxyGroup(value) {
  const group = String(value || "");
  if (!/^[A-Za-z0-9._:@/-]{2,128}$/.test(group)) throw new Error("proxyRequiredGroup is invalid");
  return group;
}

function authenticateRequest(request, auth) {
  if (auth.mode === "session") {
    const cookies = parseCookies(request);
    if (!safeEqual(cookies[SESSION_COOKIE] || "", auth.sessionToken)) {
      throw new ApiProblem(401, "admin_session_required", "Administrative session required");
    }
    return `session:${createHash("sha256").update(cookies[SESSION_COOKIE]).digest("hex")}`;
  }

  if (!safeEqual(request.headers["x-atlas-proxy-secret"] || "", auth.proxySharedSecret)) {
    throw new ApiProblem(401, "admin_proxy_required", "Trusted administrative gateway required");
  }
  const email = String(request.headers["x-auth-request-email"] || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\u0000-\u001f\u007f]/.test(email)) {
    throw new ApiProblem(401, "admin_identity_required", "Verified administrative identity required");
  }
  const groupsHeader = String(request.headers["x-auth-request-groups"] || "");
  if (groupsHeader.length > 4096 || /[\u0000-\u001f\u007f]/.test(groupsHeader)) {
    throw new ApiProblem(403, "admin_role_required", "Finance administrator role required");
  }
  const groups = new Set(groupsHeader.split(",").map((value) => value.trim()).filter(Boolean));
  if (!groups.has(auth.proxyRequiredGroup)) {
    throw new ApiProblem(403, "admin_role_required", "Finance administrator role required");
  }
  return `oidc:${email}`;
}

function securityHeaders(requestId) {
  return {
    "Cache-Control": "no-store, private",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Request-Id": requestId,
  };
}

function sendJson(response, status, body, requestId, headers = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    ...securityHeaders(requestId),
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    ...headers,
  });
  response.end(payload);
}

function sendProblem(response, problem, requestId) {
  const payload = JSON.stringify({
    type: `urn:atlas:admin-finance:error:${problem.code}`,
    title: problem.title,
    status: problem.status,
    detail: problem.message,
    code: problem.code,
    requestId,
    retryable: problem.status === 429 || problem.status >= 500,
  });
  response.writeHead(problem.status, {
    ...securityHeaders(requestId),
    "Content-Type": "application/problem+json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    ...problem.extraHeaders,
  });
  response.end(payload);
}

function assertAllowedQuery(url, allowed) {
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key)) {
      throw new ApiProblem(400, "unknown_query_parameter", "Unknown query parameter", `Query parameter '${key}' is not supported.`);
    }
  }
}

function requiredQuery(url, name) {
  const value = url.searchParams.get(name);
  if (!value) throw new ApiProblem(400, "missing_query_parameter", "Missing query parameter", `Query parameter '${name}' is required.`);
  return value;
}

function parseDateRange(url, required = true) {
  const rawFrom = required ? requiredQuery(url, "from") : url.searchParams.get("from") || DEFAULT_FROM;
  const rawTo = required ? requiredQuery(url, "to") : url.searchParams.get("to") || DEFAULT_TO;
  const fromMs = Date.parse(rawFrom);
  const toMs = Date.parse(rawTo);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) {
    throw new ApiProblem(400, "invalid_time_range", "Invalid time range", "Use valid UTC timestamps where from is earlier than to.");
  }
  if (toMs - fromMs > MAX_RANGE_MS) {
    throw new ApiProblem(400, "time_range_too_large", "Time range is too large", "The maximum query range is 366 days.");
  }
  return { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() };
}

function parsePerimeter(url, required = true, fallback = "payout_contract") {
  const value = required ? requiredQuery(url, "perimeter") : url.searchParams.get("perimeter") || fallback;
  if (!VALID_PERIMETERS.has(value)) {
    throw new ApiProblem(400, "invalid_perimeter", "Invalid financial perimeter", "Use a perimeter declared by the canonical API contract.");
  }
  return value;
}

function parseLimit(url) {
  const value = url.searchParams.get("limit");
  if (!value) return 100;
  if (!/^[0-9]+$/.test(value)) throw new ApiProblem(400, "invalid_limit", "Invalid page limit");
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
    throw new ApiProblem(400, "invalid_limit", "Invalid page limit", "Limit must be an integer between 1 and 500.");
  }
  return limit;
}

function encodeCursor(scope, offset, secret) {
  const payload = Buffer.from(JSON.stringify({ scope, offset }), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function decodeCursor(value, scope, secret) {
  if (!value) return 0;
  if (value.length > 500) throw new ApiProblem(400, "invalid_cursor", "Invalid pagination cursor");
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) throw new ApiProblem(400, "invalid_cursor", "Invalid pagination cursor");
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) throw new ApiProblem(400, "invalid_cursor", "Invalid pagination cursor");
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed.scope !== scope || !Number.isSafeInteger(parsed.offset) || parsed.offset < 0) throw new Error("scope");
    return parsed.offset;
  } catch {
    throw new ApiProblem(400, "invalid_cursor", "Invalid pagination cursor");
  }
}

function paginate(rows, url, scope, cursorSecret) {
  const limit = parseLimit(url);
  const offset = decodeCursor(url.searchParams.get("cursor"), scope, cursorSecret);
  const data = rows.slice(offset, offset + limit);
  const nextOffset = offset + data.length;
  const hasMore = nextOffset < rows.length;
  return {
    data,
    page: {
      nextCursor: hasMore ? encodeCursor(scope, nextOffset, cursorSecret) : null,
      hasMore,
    },
  };
}

function createMeta({ requestId, perimeter, from, to, reconciliationStatus = "exception", partial = false, partialReasons = [] }) {
  return {
    perimeter,
    currency: "USDT",
    from,
    to,
    asOfBlockNumber: demoSnapshot.asOfBlockNumber,
    asOfBlockHash: demoSnapshot.asOfBlockHash,
    finality: "finalized",
    freshnessSeconds: 120,
    partial,
    partialReasons,
    sourceStatus: partial ? "partial" : "ready",
    formulaVersion: demoSnapshot.formulaVersion,
    rulesetVersion: demoSnapshot.rulesetVersion,
    reconciliationStatus,
    requestId,
    generatedAt: demoSnapshot.generatedAt,
  };
}

function dataset(data, requestId, options = {}) {
  const range = options.range || { from: DEFAULT_FROM, to: DEFAULT_TO };
  return {
    data,
    meta: createMeta({
      requestId,
      perimeter: options.perimeter || "payout_contract",
      from: range.from,
      to: range.to,
      reconciliationStatus: options.reconciliationStatus,
      partial: options.partial,
      partialReasons: options.partialReasons,
    }),
  };
}

function paginatedDataset(page, requestId, options = {}) {
  return { ...page, meta: dataset(null, requestId, options).meta };
}

function createRateLimiter(maxRequests, windowMs) {
  const buckets = new Map();
  return (key) => {
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    current.count += 1;
    if (current.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      throw new ApiProblem(429, "rate_limit_exceeded", "Too many requests", "Try again after the rate-limit window.", { "Retry-After": String(retryAfter) });
    }
    if (buckets.size > 10000) {
      for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  };
}

function knownPath(pathname) {
  return pathname === `${BASE_PATH}/meta`
    || pathname === `${BASE_PATH}/finance/overview`
    || pathname === `${BASE_PATH}/finance/cash-movements`
    || pathname === `${BASE_PATH}/finance/liquidity/roll-forward`
    || pathname === `${BASE_PATH}/finance/cycles`
    || pathname === `${BASE_PATH}/claims`
    || pathname === `${BASE_PATH}/participants/search`
    || pathname === `${BASE_PATH}/forecast/snapshots/latest`
    || pathname === `${BASE_PATH}/forecast/buckets`
    || pathname === `${BASE_PATH}/reconciliation/runs`
    || pathname === `${BASE_PATH}/reconciliation/exceptions`
    || pathname === `${BASE_PATH}/methodology/gate0`
    || pathname === `${BASE_PATH}/management/growth-plan`
    || pathname === `${BASE_PATH}/finance/partner-economics`
    || pathname === `${BASE_PATH}/finance/company-economics`
    || pathname === `${BASE_PATH}/finance/platform-fees`
    || pathname === `${BASE_PATH}/finance/company-receipts`
    || pathname === `${BASE_PATH}/alerts`
    || pathname.startsWith(`${BASE_PATH}/claims/`)
    || pathname.startsWith(`${BASE_PATH}/participants/`)
    || pathname.startsWith(`${BASE_PATH}/forecast/snapshots/`)
    || pathname.startsWith(`${BASE_PATH}/alerts/`)
    || pathname.startsWith(`${BASE_PATH}/reconciliation/exceptions/`);
}

function handleGet(url, requestId, cursorSecret) {
  const path = url.pathname;
  if (path === `${BASE_PATH}/meta`) {
    assertAllowedQuery(url, new Set());
    return {
      apiVersion: "1.0.0-draft",
      status: "blocked_gate0",
      gateZero: { closed: 0, total: 14 },
      capabilities: [...demoCapabilities],
    };
  }

  if (path === `${BASE_PATH}/management/growth-plan`) {
    assertAllowedQuery(url, new Set());
    return dataset(managementGrowthPlan, requestId, {
      perimeter: "company_treasury",
      reconciliationStatus: "not_run",
      partial: true,
      partialReasons: ["management_plan_proposal_not_approved"],
    });
  }

  if (path === `${BASE_PATH}/finance/partner-economics`) {
    assertAllowedQuery(url, new Set(["from", "to", "asOfBlock"]));
    const range = parseDateRange(url);
    const asOfBlock = url.searchParams.get("asOfBlock");
    if (asOfBlock && (!/^[0-9]+$/.test(asOfBlock) || Number(asOfBlock) !== demoSnapshot.asOfBlockNumber)) {
      throw new ApiProblem(422, "snapshot_not_available", "Requested snapshot is not available", "The demo API exposes one finalized snapshot only.");
    }
    const coverageFrom = partnerEconomics.series[0].bucketStart;
    const coverageTo = partnerEconomics.series.at(-1).bucketEnd;
    const partial = Date.parse(range.from) < Date.parse(coverageFrom) || Date.parse(range.to) > Date.parse(coverageTo) || partnerEconomics.attributionStatus !== "complete";
    return dataset(partnerEconomics, requestId, {
      range,
      perimeter: "company_treasury",
      reconciliationStatus: "exception",
      partial,
      partialReasons: partial ? ["demo_partner_economics_without_complete_transfer_attribution"] : [],
    });
  }

  if (path === `${BASE_PATH}/finance/company-economics`) {
    assertAllowedQuery(url, new Set(["from", "to", "asOfBlock"]));
    const range = parseDateRange(url);
    const asOfBlock = url.searchParams.get("asOfBlock");
    if (asOfBlock && (!/^[0-9]+$/.test(asOfBlock) || Number(asOfBlock) !== demoSnapshot.asOfBlockNumber)) {
      throw new ApiProblem(422, "snapshot_not_available", "Requested snapshot is not available", "The demo API exposes one finalized snapshot only.");
    }
    const coverageFrom = companyEconomics.series[0].bucketStart;
    const coverageTo = companyEconomics.series.at(-1).bucketEnd;
    const partial = Date.parse(range.from) < Date.parse(coverageFrom) || Date.parse(range.to) > Date.parse(coverageTo) || companyEconomics.attributionStatus !== "complete";
    return dataset(companyEconomics, requestId, {
      range,
      perimeter: "company_treasury",
      reconciliationStatus: "exception",
      partial,
      partialReasons: partial ? ["demo_company_economics_without_complete_transfer_attribution"] : [],
    });
  }

  if (path === `${BASE_PATH}/finance/platform-fees`) {
    assertAllowedQuery(url, new Set(["from", "to", "asOfBlock", "cursor", "limit"]));
    const range = parseDateRange(url);
    const asOfBlock = url.searchParams.get("asOfBlock");
    if (asOfBlock && (!/^[0-9]+$/.test(asOfBlock) || Number(asOfBlock) !== demoSnapshot.asOfBlockNumber)) throw new ApiProblem(422, "snapshot_not_available", "Requested snapshot is not available");
    const rows = platformFeeRows.filter((row) => Date.parse(row.occurredAt) >= Date.parse(range.from) && Date.parse(row.occurredAt) < Date.parse(range.to));
    return paginatedDataset(
      paginate(rows, url, `platform-fees:${range.from}:${range.to}`, cursorSecret),
      requestId,
      { range, perimeter: "company_treasury", reconciliationStatus: "exception", partial: true, partialReasons: ["demo_platform_fee_transfer_lineage_not_reconciled"] },
    );
  }

  if (path === `${BASE_PATH}/finance/company-receipts`) {
    assertAllowedQuery(url, new Set(["from", "to", "asOfBlock", "cursor", "limit"]));
    const range = parseDateRange(url);
    const asOfBlock = url.searchParams.get("asOfBlock");
    if (asOfBlock && (!/^[0-9]+$/.test(asOfBlock) || Number(asOfBlock) !== demoSnapshot.asOfBlockNumber)) throw new ApiProblem(422, "snapshot_not_available", "Requested snapshot is not available");
    const rows = companyReceiptRows.filter((row) => Date.parse(row.occurredAt) >= Date.parse(range.from) && Date.parse(row.occurredAt) < Date.parse(range.to));
    return paginatedDataset(
      paginate(rows, url, `company-receipts:${range.from}:${range.to}`, cursorSecret),
      requestId,
      { range, perimeter: "company_treasury", reconciliationStatus: "exception", partial: true, partialReasons: ["demo_company_receipts_without_ledger_reconciliation"] },
    );
  }

  if (path === `${BASE_PATH}/finance/overview`) {
    assertAllowedQuery(url, new Set(["from", "to", "perimeter", "asOfBlock"]));
    const range = parseDateRange(url);
    const perimeter = parsePerimeter(url);
    if (perimeter !== "atlas_consolidated") {
      throw new ApiProblem(400, "overview_requires_consolidated_perimeter", "Invalid overview perimeter", "Use atlas_consolidated; every overview section declares its own financial perimeter.");
    }
    const asOfBlock = url.searchParams.get("asOfBlock");
    if (asOfBlock && (!/^[0-9]+$/.test(asOfBlock) || Number(asOfBlock) !== demoSnapshot.asOfBlockNumber)) {
      throw new ApiProblem(422, "snapshot_not_available", "Requested snapshot is not available", "The demo API exposes one finalized snapshot only.");
    }
    const coverageFrom = Date.parse(financeOverview.coverage.from);
    const coverageTo = Date.parse(financeOverview.coverage.to);
    const partial = Date.parse(range.from) < coverageFrom || Date.parse(range.to) > coverageTo;
    return dataset(financeOverview, requestId, {
      range,
      perimeter,
      reconciliationStatus: "exception",
      partial,
      partialReasons: partial ? ["demo_overview_coverage_2026-07-29_to_2026-08-05"] : [],
    });
  }

  if (path === `${BASE_PATH}/finance/cash-movements`) {
    assertAllowedQuery(url, new Set(["from", "to", "perimeter", "granularity", "cursor", "limit"]));
    const range = parseDateRange(url);
    const perimeter = parsePerimeter(url);
    const granularity = url.searchParams.get("granularity") || "day";
    if (!new Set(["day", "week", "month"]).has(granularity)) throw new ApiProblem(400, "invalid_granularity", "Invalid granularity");
    const availableRows = cashMovementRowsByPerimeter[perimeter] || [];
    const availableFrom = availableRows[0]?.bucketStart;
    const availableTo = availableRows.at(-1)?.bucketEnd;
    const partial = Boolean(availableFrom && availableTo)
      && (Date.parse(range.from) < Date.parse(availableFrom) || Date.parse(range.to) > Date.parse(availableTo));
    const rows = availableRows.filter((row) => Date.parse(row.bucketEnd) > Date.parse(range.from) && Date.parse(row.bucketStart) < Date.parse(range.to));
    return paginatedDataset(
      paginate(rows, url, `cash:${perimeter}:${range.from}:${range.to}:${granularity}`, cursorSecret),
      requestId,
      {
        range,
        perimeter,
        partial,
        partialReasons: partial ? [`demo_cash_movement_coverage_${availableFrom}_to_${availableTo}`] : [],
      },
    );
  }

  if (path === `${BASE_PATH}/finance/liquidity/roll-forward`) {
    assertAllowedQuery(url, new Set(["from", "to", "perimeter", "granularity"]));
    const range = parseDateRange(url);
    const perimeter = parsePerimeter(url);
    const granularity = url.searchParams.get("granularity") || "day";
    if (!new Set(["day", "week", "month"]).has(granularity)) throw new ApiProblem(400, "invalid_granularity", "Invalid granularity");
    return dataset(liquidityRollForward, requestId, { range, perimeter, reconciliationStatus: "exception" });
  }

  if (path === `${BASE_PATH}/forecast/snapshots/latest`) {
    assertAllowedQuery(url, new Set(["scenario", "perimeter"]));
    const scenario = requiredQuery(url, "scenario");
    if (!VALID_FORECAST_SCENARIOS.has(scenario)) throw new ApiProblem(400, "invalid_forecast_scenario", "Invalid forecast scenario");
    const perimeter = parsePerimeter(url);
    if (perimeter !== "payout_contract") throw new ApiProblem(400, "forecast_requires_payout_perimeter", "Invalid forecast perimeter", "Use payout_contract for liquidity forecasts.");
    if (scenario !== "stress") throw new ApiProblem(422, "forecast_scenario_not_calibrated", "Forecast scenario is not calibrated", `${scenario} requires approved inclusion rules, validated claim-delay history and backtesting.`);
    const snapshot = forecastSnapshots[scenario];
    return dataset(snapshot, requestId, {
      perimeter,
      partial: snapshot.status !== "valid",
      partialReasons: snapshot.status !== "valid" ? ["demo_forecast_snapshot_partial"] : [],
    });
  }

  if (path.startsWith(`${BASE_PATH}/forecast/snapshots/`)) {
    assertAllowedQuery(url, new Set());
    const id = path.slice(`${BASE_PATH}/forecast/snapshots/`.length);
    if (!UUID_PATTERN.test(id)) throw new ApiProblem(404, "resource_not_found", "Resource not found");
    const snapshot = Object.values(forecastSnapshots).find((item) => item.id === id);
    if (!snapshot) throw new ApiProblem(404, "resource_not_found", "Resource not found");
    return dataset(snapshot, requestId, {
      perimeter: snapshot.perimeter,
      partial: snapshot.status !== "valid",
      partialReasons: snapshot.status !== "valid" ? ["demo_forecast_snapshot_partial"] : [],
    });
  }

  if (path === `${BASE_PATH}/forecast/buckets`) {
    assertAllowedQuery(url, new Set(["snapshotId", "from", "to"]));
    const snapshotId = requiredQuery(url, "snapshotId");
    if (!UUID_PATTERN.test(snapshotId)) throw new ApiProblem(400, "invalid_snapshot_id", "Invalid forecast snapshot ID");
    const snapshot = Object.values(forecastSnapshots).find((item) => item.id === snapshotId);
    if (!snapshot) throw new ApiProblem(404, "resource_not_found", "Resource not found");
    const range = parseDateRange(url);
    const rows = (forecastBucketsBySnapshot[snapshotId] || []).filter((row) => Date.parse(row.bucketEnd) > Date.parse(range.from) && Date.parse(row.bucketStart) < Date.parse(range.to));
    const partial = snapshot.status !== "valid" || Date.parse(range.from) < Date.parse(snapshot.asOf) || Date.parse(range.to) > Date.parse(snapshot.horizonEnd);
    return dataset(rows, requestId, {
      range,
      perimeter: snapshot.perimeter,
      partial,
      partialReasons: partial ? ["demo_forecast_snapshot_partial"] : [],
    });
  }

  if (path === `${BASE_PATH}/alerts`) {
    assertAllowedQuery(url, new Set(["severity", "status", "cursor", "limit"]));
    const severity = url.searchParams.get("severity");
    const status = url.searchParams.get("status");
    if (severity && !new Set(["critical", "high", "medium", "info"]).has(severity)) throw new ApiProblem(400, "invalid_alert_severity", "Invalid alert severity");
    if (status && !new Set(["open", "acknowledged", "closed", "accepted"]).has(status)) throw new ApiProblem(400, "invalid_alert_status", "Invalid alert status");
    const rows = [reserveFundingAlert].filter((item) => (!severity || item.severity === severity) && (!status || item.status === status));
    return paginatedDataset(paginate(rows, url, `alerts:${severity || "all"}:${status || "all"}`, cursorSecret), requestId, {
      perimeter: "payout_contract",
      partial: true,
      partialReasons: ["demo_reserve_alert_delivery_channels_not_connected"],
    });
  }

  if (path.startsWith(`${BASE_PATH}/alerts/`) && path.endsWith("/deliveries")) {
    assertAllowedQuery(url, new Set());
    const alertId = path.slice(`${BASE_PATH}/alerts/`.length, -"/deliveries".length);
    if (!UUID_PATTERN.test(alertId) || alertId !== reserveFundingAlert.id) throw new ApiProblem(404, "resource_not_found", "Resource not found");
    return { data: reserveAlertDeliveries, requestId };
  }

  if (path === `${BASE_PATH}/finance/cycles`) {
    assertAllowedQuery(url, new Set(["from", "to", "asOfBlock", "cursor", "limit"]));
    const range = parseDateRange(url);
    return paginatedDataset(paginate(cycleRows, url, `cycles:${range.from}:${range.to}`, cursorSecret), requestId, {
      range,
      perimeter: "participant_economics",
      partial: true,
      partialReasons: ["demo_cycle_aggregates_without_transition_series_or_maturity_dates"],
    });
  }

  if (path === `${BASE_PATH}/claims`) {
    assertAllowedQuery(url, new Set(["from", "to", "status", "cursor", "limit"]));
    const range = parseDateRange(url);
    const status = url.searchParams.get("status");
    if (status && !VALID_CLAIM_STATUSES.has(status)) throw new ApiProblem(400, "invalid_claim_status", "Invalid claim status");
    const inRange = claimRows.filter((claim) => Date.parse(claim.eligibleAt) >= Date.parse(range.from) && Date.parse(claim.eligibleAt) < Date.parse(range.to));
    const rows = status ? inRange.filter((claim) => claim.status === status) : inRange;
    return paginatedDataset(paginate(rows, url, `claims:${range.from}:${range.to}:${status || "all"}`, cursorSecret), requestId, {
      range,
      perimeter: "participant_economics",
      partial: true,
      partialReasons: ["demo_claim_sample_without_complete_transfer_lineage_or_delay_history"],
    });
  }

  if (path.startsWith(`${BASE_PATH}/claims/`)) {
    assertAllowedQuery(url, new Set());
    const id = path.slice(`${BASE_PATH}/claims/`.length);
    if (!UUID_PATTERN.test(id)) throw new ApiProblem(404, "resource_not_found", "Resource not found");
    const claim = claimRows.find((item) => item.id === id);
    if (!claim) throw new ApiProblem(404, "resource_not_found", "Resource not found");
    return dataset(claim, requestId, {
      perimeter: "participant_economics",
      partial: true,
      partialReasons: ["demo_claim_sample_without_complete_transfer_lineage_or_delay_history"],
    });
  }

  if (path === `${BASE_PATH}/participants/search`) {
    assertAllowedQuery(url, new Set(["q", "cursor", "limit"]));
    const rawQuery = requiredQuery(url, "q").trim();
    const ordinalMatch = rawQuery.toLowerCase().match(/^(?:#|branch-|ветка-)?(\d{1,12})$/);
    if ((!ordinalMatch && rawQuery.length < 3) || rawQuery.length > 180) {
      throw new ApiProblem(400, "invalid_participant_query", "Invalid participant query", "Use a full wallet, Atlas ID, referral URL or an exact head-account branch ordinal.");
    }
    const normalized = ordinalMatch ? `#${Number(ordinalMatch[1])}` : rawQuery.toLowerCase().replace(/\/$/, "");
    const exact = participantSearchAliases.some((alias) => alias.replace(/\/$/, "") === normalized);
    const rows = exact ? [{
      participantId: participantProfile.id,
      atlasId: participantProfile.atlasId,
      referralCode: participantProfile.referralCode,
      maskedWallet: participantProfile.maskedWallet,
      status: participantProfile.status,
      currentRankLabel: participantProfile.currentRankLabel,
      headAccountBranchOrdinal: participantProfile.headAccountBranchOrdinal,
      matchType: ordinalMatch ? "direct_referral_ordinal" : normalized.startsWith("0x") ? "wallet" : normalized.includes("atlas-system.space/") || normalized === participantProfile.referralCode ? "referral" : "atlas_id",
      exact: true,
    }] : [];
    return paginatedDataset(paginate(rows, url, `participants:search:${createHash("sha256").update(normalized).digest("hex")}`, cursorSecret), requestId, {
      perimeter: "participant_economics",
    });
  }

  if (path === `${BASE_PATH}/participants/${participantProfile.id}`) {
    assertAllowedQuery(url, new Set());
    return dataset(participantProfile, requestId, {
      perimeter: "participant_economics",
      partial: true,
      partialReasons: ["demo_participant_profile_without_rank_history_growth_series_or_protected_resources"],
    });
  }

  if (path === `${BASE_PATH}/participants/${participantProfile.id}/first-line`) {
    assertAllowedQuery(url, new Set(["cursor", "limit"]));
    return paginatedDataset(paginate(participantFirstLineRows, url, `participants:${participantProfile.id}:first-line`, cursorSecret), requestId, {
      perimeter: "participant_economics",
      partial: true,
      partialReasons: ["demo_first_line_sample_4_of_28"],
    });
  }

  if (path.startsWith(`${BASE_PATH}/participants/`)) {
    assertAllowedQuery(url, new Set(["cursor", "limit"]));
    const relative = path.slice(`${BASE_PATH}/participants/`.length);
    const [participantId, resource, extra] = relative.split("/");
    if (!UUID_PATTERN.test(participantId) || extra) throw new ApiProblem(404, "resource_not_found", "Resource not found");
    if (participantId !== participantProfile.id) throw new ApiProblem(404, "participant_not_found", "Participant not found");
    if (!resource) throw new ApiProblem(404, "resource_not_found", "Resource not found");
    throw new ApiProblem(422, "participant_resource_unavailable", "Participant resource is unavailable", "This demo slice exposes the masked profile and a partial first-line sample only.");
  }

  if (path === `${BASE_PATH}/reconciliation/runs`) {
    assertAllowedQuery(url, new Set(["cursor", "limit"]));
    return paginatedDataset(paginate(reconciliationRuns, url, "reconciliation:runs", cursorSecret), requestId, { reconciliationStatus: "exception" });
  }

  if (path === `${BASE_PATH}/reconciliation/exceptions`) {
    assertAllowedQuery(url, new Set(["status", "cursor", "limit"]));
    const status = url.searchParams.get("status");
    if (status && !VALID_EXCEPTION_STATUSES.has(status)) {
      throw new ApiProblem(400, "invalid_exception_status", "Invalid reconciliation exception status");
    }
    const rows = status ? reconciliationExceptions.filter((item) => item.status === status) : reconciliationExceptions;
    return paginatedDataset(paginate(rows, url, `reconciliation:exceptions:${status || "all"}`, cursorSecret), requestId, { reconciliationStatus: "exception" });
  }

  if (path.startsWith(`${BASE_PATH}/reconciliation/exceptions/`)) {
    assertAllowedQuery(url, new Set());
    const id = path.slice(`${BASE_PATH}/reconciliation/exceptions/`.length);
    if (!UUID_PATTERN.test(id)) throw new ApiProblem(404, "resource_not_found", "Resource not found");
    const exception = reconciliationExceptions.find((item) => item.id === id);
    if (!exception) throw new ApiProblem(404, "resource_not_found", "Resource not found");
    return dataset(exception, requestId, { reconciliationStatus: "exception" });
  }

  if (path === `${BASE_PATH}/methodology/gate0`) {
    assertAllowedQuery(url, new Set());
    return { data: gateZeroDecisions, closed: 0, total: 14 };
  }

  throw new ApiProblem(404, "resource_not_found", "Resource not found");
}

export function createAdminFinanceServer(options = {}) {
  const mode = String(options.mode || "");
  if (!new Set(["demo", "alpha"]).has(mode)) throw new Error("Atlas Admin Finance API requires explicit demo or alpha mode");
  if (mode === "alpha" && !options.sourceProvider?.getSnapshot) throw new Error("Alpha mode requires a source provider");
  const authMode = String(options.authMode || "session");
  if (!new Set(["session", "proxy"]).has(authMode)) throw new Error("authMode must be session or proxy");
  const auth = authMode === "session"
    ? { mode: authMode, sessionToken: requireSecret("sessionToken", options.sessionToken) }
    : {
        mode: authMode,
        proxySharedSecret: requireSecret("proxySharedSecret", options.proxySharedSecret),
        proxyRequiredGroup: validateProxyGroup(options.proxyRequiredGroup),
      };
  const cursorSecret = requireSecret("cursorSecret", options.cursorSecret);
  const allowedOrigins = new Set((options.allowedOrigins || []).map(String));
  if (allowedOrigins.size === 0) throw new Error("At least one allowed origin is required");
  const rateLimit = createRateLimiter(Number(options.rateLimitMax || 300), Number(options.rateLimitWindowMs || 60000));

  const server = http.createServer(async (request, response) => {
    const requestId = randomUUID();
    try {
      if (String(request.url || "").length > MAX_URL_LENGTH) throw new ApiProblem(414, "request_uri_too_long", "Request URI is too long");
      const url = new URL(request.url || "/", "http://127.0.0.1");
      if (url.pathname === `${BASE_PATH}/health/live`) {
        if (request.method !== "GET") throw new ApiProblem(405, "method_not_allowed", "Method not allowed", "Health checks are read-only.", { Allow: "GET" });
        assertAllowedQuery(url, new Set());
        sendJson(response, 200, { status: "live", mode }, requestId);
        return;
      }
      if (url.pathname === `${BASE_PATH}/health/ready`) {
        if (request.method !== "GET") throw new ApiProblem(405, "method_not_allowed", "Method not allowed", "Health checks are read-only.", { Allow: "GET" });
        assertAllowedQuery(url, new Set());
        if (mode === "alpha") {
          try {
            const snapshot = await options.sourceProvider.getSnapshot();
            sendJson(response, 200, {
              status: "ready",
              mode,
              sourceStatus: snapshot.sourceStatus,
              asOfBlockNumber: snapshot.asOfBlockNumber,
            }, requestId);
            return;
          } catch (error) {
            if (error instanceof OnchainProviderError) {
              throw new ApiProblem(503, "source_unavailable", "Financial source unavailable", "The finalized on-chain snapshot could not be verified.");
            }
            throw error;
          }
        }
        sendJson(response, 200, { status: "ready", mode }, requestId);
        return;
      }
      const origin = request.headers.origin;
      if (origin && !allowedOrigins.has(origin)) throw new ApiProblem(403, "origin_not_allowed", "Origin is not allowed");

      const principal = authenticateRequest(request, auth);

      const rateKey = createHash("sha256")
        .update(`${principal}:${request.socket.remoteAddress || "unknown"}`)
        .digest("hex");
      rateLimit(rateKey);

      if (request.method !== "GET") {
        if (knownPath(url.pathname) || isAlphaPath(url.pathname)) throw new ApiProblem(405, "method_not_allowed", "Method not allowed", "This Admin Finance slice is read-only.", { Allow: "GET" });
        throw new ApiProblem(404, "resource_not_found", "Resource not found");
      }

      let result;
      if (mode === "alpha") {
        if (!isAlphaPath(url.pathname)) throw new ApiProblem(404, "resource_not_found", "Resource not found");
        let snapshot;
        try {
          snapshot = await options.sourceProvider.getSnapshot();
        } catch (error) {
          if (error instanceof OnchainProviderError) {
            throw new ApiProblem(503, "source_unavailable", "Financial source unavailable", "The finalized on-chain snapshot could not be verified.");
          }
          throw error;
        }
        result = await handleAlphaGet(url, requestId, snapshot, gateZeroDecisions, {
          forecastRuntime: options.forecastRuntime,
        });
      } else {
        result = handleGet(url, requestId, cursorSecret);
      }
      sendJson(response, 200, result, requestId);
    } catch (error) {
      const problem = error instanceof ApiProblem || error instanceof AlphaApiProblem
        ? error
        : new ApiProblem(500, "internal_error", "Internal server error", "The request could not be completed.");
      sendProblem(response, problem, requestId);
    }
  });
  server.requestTimeout = mode === "alpha" ? 30000 : 10000;
  server.headersTimeout = 5000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 64;
  return server;
}

function startFromEnvironment() {
  const port = Number(process.env.ATLAS_ADMIN_FINANCE_PORT || 8791);
  const host = String(process.env.ATLAS_ADMIN_FINANCE_HOST || "127.0.0.1");
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("ATLAS_ADMIN_FINANCE_PORT is invalid");
  const allowedOrigins = String(process.env.ATLAS_ADMIN_FINANCE_ALLOWED_ORIGINS || "http://127.0.0.1:4186")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const mode = String(process.env.ATLAS_ADMIN_FINANCE_MODE || "");
  const authMode = String(process.env.ATLAS_ADMIN_FINANCE_AUTH_MODE || "session");
  const sourceProvider = mode === "alpha" ? createOnchainAlphaProvider({
    flowUrl: process.env.ATLAS_ADMIN_FINANCE_FLOW_URL || "https://supersussystem.com/api/contracts/atlas-flows",
    balanceUrl: process.env.ATLAS_ADMIN_FINANCE_BALANCE_URL || "https://supersussystem.com/api/contracts/atlas-balances",
    rpcUrl: process.env.ATLAS_ADMIN_FINANCE_RPC_URL,
    allowedHosts: String(process.env.ATLAS_ADMIN_FINANCE_PROVIDER_HOSTS || "supersussystem.com").split(",").map((value) => value.trim()).filter(Boolean),
    allowedRpcHosts: String(process.env.ATLAS_ADMIN_FINANCE_RPC_HOSTS || "").split(",").map((value) => value.trim()).filter(Boolean),
    allowedAddresses: String(process.env.ATLAS_ADMIN_FINANCE_CONTRACT_ADDRESSES || "").split(",").map((value) => value.trim()).filter(Boolean),
    minConfirmations: Number(process.env.ATLAS_ADMIN_FINANCE_MIN_CONFIRMATIONS || 12),
  }) : null;
  const forecastRuntime = mode === "alpha"
    ? createForecastRuntimeFromEnvironment(process.env, {
        databaseCa: loadForecastDatabaseCa(process.env),
      })
    : null;
  const server = createAdminFinanceServer({
    mode,
    authMode,
    sessionToken: process.env.ATLAS_ADMIN_FINANCE_SESSION_TOKEN,
    proxySharedSecret: process.env.ATLAS_ADMIN_FINANCE_PROXY_SHARED_SECRET,
    proxyRequiredGroup: process.env.ATLAS_ADMIN_FINANCE_PROXY_REQUIRED_GROUP,
    cursorSecret: process.env.ATLAS_ADMIN_FINANCE_CURSOR_SECRET,
    allowedOrigins,
    sourceProvider,
    forecastRuntime,
  });
  if (forecastRuntime) server.on("close", () => { void forecastRuntime.close(); });
  server.listen(port, host, () => {
    console.log(`Atlas Admin Finance ${mode} API listening on http://${host}:${port}${BASE_PATH}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    startFromEnvironment();
  } catch (error) {
    console.error(`Atlas Admin Finance API refused to start: ${error.message}`);
    process.exitCode = 1;
  }
}
