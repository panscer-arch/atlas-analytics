import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assertIncludes(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`MarketingOS verification failed: ${label}`);
  }
}

const page = read("src/modules/analytics/AnalyticsPage.jsx");
const header = read("src/modules/analytics/components/AnalyticsHeader.jsx");
const navigationPath = path.join(root, "src/modules/analytics/data/navigationShell.js");
const { MAIN_TAB_BOARD_IDS } = await import(pathToFileURL(navigationPath));
const registry = read("src/modules/analytics/components/LaunchBoardRegistry.jsx");
const panel = read("src/modules/analytics/components/AnalyticsMainPanel.jsx");
const board = read("src/modules/analytics/components/MarketingOsBoard.jsx");
const data = read("src/modules/analytics/data/marketingOsData.js");
const server = read("server/content-api.mjs");
const browserChecks = read("scripts/check-analytics-boards.mjs");

if (MAIN_TAB_BOARD_IDS.marketingOs !== "marketingOS") {
  throw new Error("MarketingOS verification failed: board route is not registered");
}
assertIncludes(page, 'onMarketingOsOpen={() => handleMainTabChange("marketingOs")}', "header action is not connected");
assertIncludes(header, 'label="MarketingOS"', "MarketingOS header icon is missing");
assertIncludes(registry, 'if (boardId === "marketingOS") return "marketingOs"', "query route does not select MarketingOS");
assertIncludes(panel, 'activeTab === "marketingOs"', "main panel does not render MarketingOS");
assertIncludes(panel, "<MarketingOsBoard />", "MarketingOS component is not mounted");
assertIncludes(data, 'atlas.analytics.marketingOS.v1', "persistent storage key is missing");
assertIncludes(server, "MARKETING_OS_KEY", "server write guard is missing");
assertIncludes(board, "Approval-first", "human approval rule is missing");
assertIncludes(board, "Никакие внешние действия не выполнялись", "agent guardrail is missing");
assertIncludes(browserChecks, 'id: "marketing-os"', "browser smoke test is missing");

console.log("MarketingOS verification passed.");
