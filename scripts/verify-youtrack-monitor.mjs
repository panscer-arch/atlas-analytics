import { readFile } from "node:fs/promises";

const files = {
  page: "src/modules/analytics/AnalyticsPage.jsx",
  panel: "src/modules/analytics/components/AnalyticsMainPanel.jsx",
  component: "src/modules/analytics/components/YouTrackTaskMonitor.jsx",
  css: "src/modules/analytics/styles/analytics.css",
  harnessCss: "src/modules/analytics/styles/supersus-harness.css",
  harnessDoc: "SUPERSUS_UI_HARNESS.md",
  store: "src/modules/analytics/services/contentStore.js",
  server: "server/content-api.mjs",
  deploy: ".github/workflows/deploy.yml",
};

async function read(path) {
  return readFile(path, "utf8");
}

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}

const [page, panel, component, css, harnessCss, harnessDoc, store, server, deploy] = await Promise.all([
  read(files.page),
  read(files.panel),
  read(files.component),
  read(files.css),
  read(files.harnessCss),
  read(files.harnessDoc),
  read(files.store),
  read(files.server),
  read(files.deploy),
]);

assertIncludes(page, '{ id: "tasks", label: "Задачи" }', "AnalyticsPage tasks tab");
assertIncludes(panel, 'import YouTrackTaskMonitor from "./YouTrackTaskMonitor"', "AnalyticsMainPanel import");
assertIncludes(panel, 'activeTab === "taskMonitor"', "AnalyticsMainPanel route");
assertIncludes(panel, 'id: "monitor", label: "ATL-монитор", hint: "live"', "AnalyticsMainPanel monitor subtab");
assertIncludes(panel, 'setActiveView(board === "taskMonitor" ? "monitor" : "tasks")', "AnalyticsMainPanel direct route");
assertIncludes(component, 'data-testid="youtrack-monitor"', "YouTrack component test id");
assertIncludes(component, 'data-testid="youtrack-issue-table"', "YouTrack table test id");
assertIncludes(component, 'getServerJson("/api/youtrack/issues?top=50")', "YouTrack issues request");
assertIncludes(component, 'postServerJson("/api/youtrack/check"', "YouTrack check request");
assertIncludes(store, "export async function getServerJson", "contentStore get helper");
assertIncludes(store, "export async function postServerJson", "contentStore post helper");
assertIncludes(server, 'url.pathname === "/api/youtrack/issues"', "server issues route");
assertIncludes(server, 'url.pathname === "/api/youtrack/check"', "server check route");
assertIncludes(server, 'url.pathname === "/api/youtrack/digest"', "server digest route");
assertIncludes(server, "formatYouTrackDigestPush", "server digest formatter");
assertIncludes(server, "sendYouTrackDigest", "server digest sender");
assertIncludes(deploy, "atlas-youtrack-monitor.timer", "deploy minute monitor timer");
assertIncludes(deploy, "atlas-youtrack-digest.timer", "deploy digest timer");
assertIncludes(deploy, "OnCalendar=*-*-* 12:00:00 UTC", "deploy digest daily Moscow schedule");
assertIncludes(deploy, "/api/youtrack/digest", "deploy digest endpoint");

assertIncludes(component, "SusMetric", "Harness metric primitive");
assertIncludes(component, "SusButton", "Harness button primitive");
assertIncludes(css, '@import "./supersus-harness.css"', "Harness token import");
assertIncludes(harnessCss, "--sus-ui-radius: 8px", "Harness radius token");
assertIncludes(harnessCss, ".sus-ui-button-primary", "Harness primary button");
assertIncludes(harnessCss, ".sus-ui-metric-danger", "Harness danger metric");
assertIncludes(harnessDoc, "## Required States", "Harness state contract");
assertIncludes(harnessDoc, "## Pilot Acceptance Criteria: taskMonitor", "Harness pilot contract");
assertIncludes(css, ".analytics-youtrack-status-pill", "status pill style");
assertIncludes(css, ".analytics-youtrack-comment", "comment clamp style");
assertIncludes(css, "width: calc(100vw - 2rem)", "mobile monitor width guard");
assertIncludes(css, "overflow: hidden", "mobile monitor overflow guard");

console.log("YouTrack monitor verified: routes, API helpers, UI Harness tokens, primitives and responsive styles are present.");
