import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildGoogleAnalyticsOverview, getGoogleAnalyticsOverview, googleAnalyticsConfig } from "../server/google-analytics.mjs";

function report(dimensions, metrics, rows) {
  return {
    dimensionHeaders: dimensions.map((name) => ({ name })),
    metricHeaders: metrics.map((name) => ({ name, type: "TYPE_FLOAT" })),
    rows: rows.map(({ dimensions: dimensionValues = [], metrics: metricValues = [] }) => ({
      dimensionValues: dimensionValues.map((value) => ({ value: String(value) })),
      metricValues: metricValues.map((value) => ({ value: String(value) })),
    })),
  };
}

const summaryMetrics = [
  "activeUsers", "totalUsers", "newUsers", "sessions", "engagedSessions",
  "engagementRate", "userEngagementDuration", "eventCount", "keyEvents", "screenPageViews",
];

const current = report([], summaryMetrics, [{ metrics: [100, 120, 42, 150, 96, 0.64, 8300, 950, 18, 410] }]);
const previous = report([], summaryMetrics, [{ metrics: [80, 99, 35, 120, 70, 0.58, 6100, 720, 12, 350] }]);
const trend = report(["date"], ["activeUsers", "sessions", "engagedSessions", "keyEvents"], [
  { dimensions: ["20260801"], metrics: [45, 70, 42, 8] },
  { dimensions: ["20260802"], metrics: [55, 80, 54, 10] },
]);
const sources = report(["sessionSourceMedium"], ["sessions", "engagedSessions", "engagementRate", "keyEvents"], [
  { dimensions: ["telegram / referral"], metrics: [80, 54, 0.675, 12] },
  { dimensions: ["google / organic"], metrics: [40, 25, 0.625, 4] },
]);
const landingPages = report(["landingPagePlusQueryString"], ["sessions", "activeUsers", "engagementRate", "keyEvents"], [
  { dimensions: ["/"], metrics: [100, 75, 0.68, 14] },
]);
const countries = report(["country"], ["activeUsers", "sessions", "engagementRate"], [
  { dimensions: ["Germany"], metrics: [40, 55, 0.66] },
]);
const devices = report(["deviceCategory"], ["activeUsers", "sessions"], [
  { dimensions: ["mobile"], metrics: [72, 108] },
]);
const realtime = report([], ["activeUsers"], [{ metrics: [7] }]);

const overview = buildGoogleAnalyticsOverview(
  { current, previous, trend, sources, landingPages, countries, devices, realtime },
  "28d",
  "546276265",
);

assert.equal(overview.ok, true);
assert.equal(overview.current.sessions, 150);
assert.equal(overview.current.averageEngagementSeconds, 83);
assert.equal(overview.changes.sessions, 25);
assert.equal(overview.realtime.activeUsers, 7);
assert.equal(overview.sources[0].sessionSourceMedium, "telegram / referral");
assert.equal(overview.insights[0].title, "Трафик растёт");
assert.deepEqual(googleAnalyticsConfig.ranges, ["1d", "7d", "28d", "90d"]);

const unconfigured = await getGoogleAnalyticsOverview({
  env: {
    ATLAS_GA4_PROPERTY_ID: "546276265",
    ATLAS_GA4_CREDENTIALS_FILE: "/tmp/atlas-ga4-file-that-does-not-exist.json",
  },
});
assert.equal(unconfigured.configured, false);
assert.equal(unconfigured.error, "ga4_credentials_not_configured");

const [page, section, component, css, server, deploy] = await Promise.all([
  readFile("src/modules/analytics/AnalyticsPage.jsx", "utf8"),
  readFile("src/modules/analytics/components/AnalyticsSectionPanel.jsx", "utf8"),
  readFile("src/modules/analytics/components/GoogleAnalyticsBoard.jsx", "utf8"),
  readFile("src/modules/analytics/styles/analytics.css", "utf8"),
  readFile("server/content-api.mjs", "utf8"),
  readFile(".github/workflows/deploy.yml", "utf8"),
]);

assert.match(page, /id: "ga4", label: "Google Analytics"/);
assert.match(section, /<GoogleAnalyticsBoard \/>/);
assert.match(component, /data-testid="google-analytics-board"/);
assert.match(component, /\/api\/content\/google-analytics\?range=/);
assert.match(css, /\.ga4-metrics/);
assert.match(server, /getGoogleAnalyticsOverview/);
assert.match(server, /\/api\/content\/google-analytics/);
assert.match(deploy, /ATLAS_GA4_SERVICE_ACCOUNT_JSON_BASE64/);
assert.match(deploy, /server\/google-analytics\.mjs/);

console.log("Google Analytics integration verified: API parsing, safe unconfigured state, UI route and deployment wiring are present.");
