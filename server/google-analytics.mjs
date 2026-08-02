import { sign } from "node:crypto";
import { readFile } from "node:fs/promises";

const ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const ANALYTICS_DATA_API = "https://analyticsdata.googleapis.com/v1beta";
const DEFAULT_CREDENTIALS_FILE = "/etc/atlas-ga4-service-account.json";
const DEFAULT_PROPERTY_ID = "546276265";
const REQUEST_TIMEOUT_MS = 20_000;
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

const RANGE_CONFIG = {
  "1d": {
    label: "24 часа",
    current: { startDate: "today", endDate: "today" },
    previous: { startDate: "yesterday", endDate: "yesterday" },
  },
  "7d": {
    label: "7 дней",
    current: { startDate: "6daysAgo", endDate: "today" },
    previous: { startDate: "13daysAgo", endDate: "7daysAgo" },
  },
  "28d": {
    label: "28 дней",
    current: { startDate: "27daysAgo", endDate: "today" },
    previous: { startDate: "55daysAgo", endDate: "28daysAgo" },
  },
  "90d": {
    label: "90 дней",
    current: { startDate: "89daysAgo", endDate: "today" },
    previous: { startDate: "179daysAgo", endDate: "90daysAgo" },
  },
};

const SUMMARY_METRICS = [
  "activeUsers",
  "totalUsers",
  "newUsers",
  "sessions",
  "engagedSessions",
  "engagementRate",
  "userEngagementDuration",
  "eventCount",
  "keyEvents",
  "screenPageViews",
];

let cachedToken = { value: "", expiresAt: 0, identity: "" };

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function normalizePropertyId(value) {
  const normalized = String(value || "").trim().replace(/^properties\//, "");
  return /^\d{6,20}$/.test(normalized) ? normalized : "";
}

function normalizeRange(value) {
  return Object.prototype.hasOwnProperty.call(RANGE_CONFIG, value) ? value : "28d";
}

function metricNumber(row, headers, name) {
  const index = headers.findIndex((header) => header?.name === name);
  if (index < 0) return 0;
  const parsed = Number(row?.metricValues?.[index]?.value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dimensionValue(row, headers, name) {
  const index = headers.findIndex((header) => header?.name === name);
  return index < 0 ? "" : String(row?.dimensionValues?.[index]?.value || "");
}

function parseSummary(report) {
  const row = report?.rows?.[0] || {};
  const headers = report?.metricHeaders || [];
  const summary = Object.fromEntries(SUMMARY_METRICS.map((name) => [name, metricNumber(row, headers, name)]));
  summary.averageEngagementSeconds = summary.activeUsers > 0
    ? summary.userEngagementDuration / summary.activeUsers
    : 0;
  return summary;
}

function parseRows(report, dimensionNames, metricNames) {
  const dimensionHeaders = report?.dimensionHeaders || [];
  const metricHeaders = report?.metricHeaders || [];
  return (report?.rows || []).map((row, index) => ({
    id: `${index}-${dimensionNames.map((name) => dimensionValue(row, dimensionHeaders, name)).join("-")}`,
    ...Object.fromEntries(dimensionNames.map((name) => [name, dimensionValue(row, dimensionHeaders, name)])),
    ...Object.fromEntries(metricNames.map((name) => [name, metricNumber(row, metricHeaders, name)])),
  }));
}

function percentChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function buildInsights(current, previous, sources, landingPages) {
  if (!current.sessions) {
    return [{
      tone: "neutral",
      title: "Данных за период пока нет",
      text: "GA4 подключён, но за выбранный период не вернул сессии. Проверьте поток данных и диапазон дат.",
    }];
  }

  const sessionChange = percentChange(current.sessions, previous.sessions);
  const userChange = percentChange(current.activeUsers, previous.activeUsers);
  const keyEventChange = percentChange(current.keyEvents, previous.keyEvents);
  const topSource = sources[0];
  const sourceShare = topSource && current.sessions ? (topSource.sessions / current.sessions) * 100 : 0;
  const topLanding = landingPages[0];
  const insights = [];

  insights.push({
    tone: sessionChange >= 5 ? "positive" : sessionChange <= -5 ? "negative" : "neutral",
    title: sessionChange >= 5 ? "Трафик растёт" : sessionChange <= -5 ? "Трафик снизился" : "Трафик стабилен",
    text: `Сессии ${sessionChange >= 0 ? "выросли" : "снизились"} на ${Math.abs(sessionChange).toFixed(1)}% к предыдущему сопоставимому периоду. Активные пользователи: ${userChange >= 0 ? "+" : ""}${userChange.toFixed(1)}%.`,
  });

  insights.push({
    tone: current.engagementRate >= 0.6 ? "positive" : current.engagementRate < 0.4 ? "negative" : "neutral",
    title: current.engagementRate >= 0.6 ? "Вовлечение сильное" : current.engagementRate < 0.4 ? "Вовлечение требует внимания" : "Вовлечение в рабочем диапазоне",
    text: `${(current.engagementRate * 100).toFixed(1)}% сессий вовлечённые, среднее активное время на пользователя ${Math.round(current.averageEngagementSeconds)} сек.`,
  });

  if (topSource) {
    insights.push({
      tone: sourceShare > 60 ? "warning" : "neutral",
      title: sourceShare > 60 ? "Высокая зависимость от одного источника" : "Главный источник трафика",
      text: `${topSource.sessionSourceMedium || "Не определён"} даёт ${sourceShare.toFixed(1)}% всех сессий за период.`,
    });
  }

  if (current.keyEvents || previous.keyEvents) {
    insights.push({
      tone: keyEventChange >= 0 ? "positive" : "negative",
      title: "Ключевые события",
      text: `${Math.round(current.keyEvents)} событий, изменение к прошлому периоду ${keyEventChange >= 0 ? "+" : ""}${keyEventChange.toFixed(1)}%.`,
    });
  }

  if (topLanding) {
    insights.push({
      tone: "neutral",
      title: "Главная точка входа",
      text: `${topLanding.landingPagePlusQueryString || "/"} привела ${Math.round(topLanding.sessions)} сессий. Это первая страница для проверки оффера и конверсии.`,
    });
  }

  return insights;
}

async function loadCredentials(env = process.env) {
  const inline = String(env.ATLAS_GA4_SERVICE_ACCOUNT_JSON || "").trim();
  const encoded = String(env.ATLAS_GA4_SERVICE_ACCOUNT_JSON_BASE64 || "").trim();
  let raw = inline;

  if (!raw && encoded) {
    try {
      raw = Buffer.from(encoded, "base64").toString("utf8");
    } catch {
      throw new Error("ga4_credentials_base64_invalid");
    }
  }

  if (!raw) {
    const credentialsFile = String(env.ATLAS_GA4_CREDENTIALS_FILE || DEFAULT_CREDENTIALS_FILE).trim();
    try {
      raw = await readFile(credentialsFile, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw new Error("ga4_credentials_file_unreadable");
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ga4_credentials_json_invalid");
  }

  if (!parsed?.client_email || !parsed?.private_key) {
    throw new Error("ga4_credentials_fields_missing");
  }
  return parsed;
}

async function getAccessToken(credentials) {
  const now = Date.now();
  if (
    cachedToken.value
    && cachedToken.identity === credentials.client_email
    && cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS > now
  ) {
    return cachedToken.value;
  }

  const issuedAt = Math.floor(now / 1000);
  const tokenUri = credentials.token_uri || "https://oauth2.googleapis.com/token";
  const header = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = encodeBase64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: ANALYTICS_SCOPE,
    aud: tokenUri,
    iat: issuedAt,
    exp: issuedAt + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signature = sign("RSA-SHA256", Buffer.from(unsigned), credentials.private_key).toString("base64url");
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(`ga4_token_exchange_failed:${payload.error || response.status}`);
  }

  cachedToken = {
    value: payload.access_token,
    expiresAt: now + Number(payload.expires_in || 3600) * 1000,
    identity: credentials.client_email,
  };
  return cachedToken.value;
}

async function runReport(propertyId, token, body, realtime = false) {
  const method = realtime ? "runRealtimeReport" : "runReport";
  const response = await fetch(`${ANALYTICS_DATA_API}/properties/${propertyId}:${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = payload?.error?.status || payload?.error?.message || response.status;
    throw new Error(`ga4_report_failed:${String(reason).slice(0, 160)}`);
  }
  return payload;
}

export function buildGoogleAnalyticsOverview(reports, range = "28d", propertyId = DEFAULT_PROPERTY_ID) {
  const current = parseSummary(reports.current);
  const previous = parseSummary(reports.previous);
  const trend = parseRows(reports.trend, ["date"], ["activeUsers", "sessions", "engagedSessions", "keyEvents"]);
  const sources = parseRows(reports.sources, ["sessionSourceMedium"], ["sessions", "engagedSessions", "engagementRate", "keyEvents"]);
  const landingPages = parseRows(reports.landingPages, ["landingPagePlusQueryString"], ["sessions", "activeUsers", "engagementRate", "keyEvents"]);
  const countries = parseRows(reports.countries, ["country"], ["activeUsers", "sessions", "engagementRate"]);
  const devices = parseRows(reports.devices, ["deviceCategory"], ["activeUsers", "sessions"]);
  const realtime = parseSummary(reports.realtime);

  return {
    ok: true,
    configured: true,
    propertyId,
    range,
    rangeLabel: RANGE_CONFIG[normalizeRange(range)].label,
    generatedAt: new Date().toISOString(),
    current,
    previous,
    changes: {
      activeUsers: percentChange(current.activeUsers, previous.activeUsers),
      sessions: percentChange(current.sessions, previous.sessions),
      engagementRate: percentChange(current.engagementRate, previous.engagementRate),
      keyEvents: percentChange(current.keyEvents, previous.keyEvents),
    },
    realtime: { activeUsers: realtime.activeUsers },
    trend,
    sources,
    landingPages,
    countries,
    devices,
    insights: buildInsights(current, previous, sources, landingPages),
    caveat: "Автоматическая интерпретация показывает изменения и аномалии, но не доказывает их причину.",
  };
}

export async function getGoogleAnalyticsOverview({ range = "28d", env = process.env } = {}) {
  const propertyId = normalizePropertyId(env.ATLAS_GA4_PROPERTY_ID || DEFAULT_PROPERTY_ID);
  if (!propertyId) {
    return { ok: false, configured: false, status: 503, error: "ga4_property_not_configured" };
  }

  let credentials;
  try {
    credentials = await loadCredentials(env);
  } catch (error) {
    return { ok: false, configured: false, status: 503, error: error.message };
  }

  if (!credentials) {
    return {
      ok: false,
      configured: false,
      status: 503,
      error: "ga4_credentials_not_configured",
      propertyId,
    };
  }

  const safeRange = normalizeRange(range);
  const dates = RANGE_CONFIG[safeRange];

  try {
    const token = await getAccessToken(credentials);
    const metricObjects = SUMMARY_METRICS.map((name) => ({ name }));
    const [current, previous, trend, sources, landingPages, countries, devices, realtime] = await Promise.all([
      runReport(propertyId, token, { dateRanges: [dates.current], metrics: metricObjects }),
      runReport(propertyId, token, { dateRanges: [dates.previous], metrics: metricObjects }),
      runReport(propertyId, token, {
        dateRanges: [dates.current],
        dimensions: [{ name: "date" }],
        metrics: ["activeUsers", "sessions", "engagedSessions", "keyEvents"].map((name) => ({ name })),
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: "100",
      }),
      runReport(propertyId, token, {
        dateRanges: [dates.current],
        dimensions: [{ name: "sessionSourceMedium" }],
        metrics: ["sessions", "engagedSessions", "engagementRate", "keyEvents"].map((name) => ({ name })),
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: "12",
      }),
      runReport(propertyId, token, {
        dateRanges: [dates.current],
        dimensions: [{ name: "landingPagePlusQueryString" }],
        metrics: ["sessions", "activeUsers", "engagementRate", "keyEvents"].map((name) => ({ name })),
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: "12",
      }),
      runReport(propertyId, token, {
        dateRanges: [dates.current],
        dimensions: [{ name: "country" }],
        metrics: ["activeUsers", "sessions", "engagementRate"].map((name) => ({ name })),
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: "10",
      }),
      runReport(propertyId, token, {
        dateRanges: [dates.current],
        dimensions: [{ name: "deviceCategory" }],
        metrics: ["activeUsers", "sessions"].map((name) => ({ name })),
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: "5",
      }),
      runReport(propertyId, token, {
        metrics: [{ name: "activeUsers" }],
      }, true),
    ]);

    return buildGoogleAnalyticsOverview({ current, previous, trend, sources, landingPages, countries, devices, realtime }, safeRange, propertyId);
  } catch (error) {
    const message = String(error?.message || "ga4_request_failed");
    return {
      ok: false,
      configured: true,
      status: message.includes("PERMISSION_DENIED") ? 403 : 502,
      error: message,
      propertyId,
    };
  }
}

export const googleAnalyticsConfig = {
  defaultPropertyId: DEFAULT_PROPERTY_ID,
  ranges: Object.keys(RANGE_CONFIG),
};
