import { readFile } from "node:fs/promises";

const files = {
  page: "src/modules/analytics/AnalyticsPage.jsx",
  panel: "src/modules/analytics/components/AnalyticsMainPanel.jsx",
  component: "src/modules/analytics/components/YouTrackTaskMonitor.jsx",
  css: "src/modules/analytics/styles/analytics.css",
  store: "src/modules/analytics/services/contentStore.js",
  server: "server/content-api.mjs",
};

async function read(path) {
  return readFile(path, "utf8");
}

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}

function extractCssBlock(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`CSS selector not found: ${selector}`);
  const bodyStart = css.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < css.length; index += 1) {
    const char = css[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return css.slice(start, index + 1);
  }
  throw new Error(`CSS selector block is not closed: ${selector}`);
}

const [page, panel, component, css, store, server] = await Promise.all([
  read(files.page),
  read(files.panel),
  read(files.component),
  read(files.css),
  read(files.store),
  read(files.server),
]);

assertIncludes(page, 'id: "taskMonitor"', "AnalyticsPage tab");
assertIncludes(page, 'label: "ATL-монитор"', "AnalyticsPage label");
assertIncludes(panel, 'import YouTrackTaskMonitor from "./YouTrackTaskMonitor"', "AnalyticsMainPanel import");
assertIncludes(panel, 'activeTab === "taskMonitor"', "AnalyticsMainPanel route");
assertIncludes(component, 'data-testid="youtrack-monitor"', "YouTrack component test id");
assertIncludes(component, 'data-testid="youtrack-issue-table"', "YouTrack table test id");
assertIncludes(component, 'getServerJson("/api/youtrack/issues?top=50")', "YouTrack issues request");
assertIncludes(component, 'postServerJson("/api/youtrack/check"', "YouTrack check request");
assertIncludes(store, "export async function getServerJson", "contentStore get helper");
assertIncludes(store, "export async function postServerJson", "contentStore post helper");
assertIncludes(server, 'url.pathname === "/api/youtrack/issues"', "server issues route");
assertIncludes(server, 'url.pathname === "/api/youtrack/check"', "server check route");

const kpiBlock = extractCssBlock(css, ".analytics-youtrack-kpi {");
const rowBlock = extractCssBlock(css, ".analytics-youtrack-table td {");
const searchBlock = extractCssBlock(css, ".analytics-youtrack-search {");

if (/background:\s*rgba\(255,\s*255,\s*255,\s*0\.[5-9]/.test(kpiBlock)) {
  throw new Error("YouTrack KPI block uses a light card background that breaks dark-theme contrast");
}

assertIncludes(kpiBlock, "linear-gradient(135deg, rgba(16, 36, 56", "dark KPI background");
assertIncludes(kpiBlock, "border: 1px solid rgba(104, 220, 255", "dark KPI border");
assertIncludes(rowBlock, "background: rgba(255, 255, 255, 0.055)", "dark table row background");
assertIncludes(rowBlock, "color: rgba(218, 231, 249", "readable table text");
assertIncludes(searchBlock, "background: rgba(4, 13, 25", "dark search input");
assertIncludes(css, ".analytics-youtrack-status-pill", "status pill style");
assertIncludes(css, ".analytics-youtrack-comment", "comment clamp style");
assertIncludes(css, "width: calc(100vw - 2rem)", "mobile monitor width guard");
assertIncludes(css, "overflow: hidden", "mobile monitor overflow guard");

console.log("YouTrack monitor verified: routes, tab wiring, API helpers and dark readable styles are present.");
