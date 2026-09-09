import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assertIncludes(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`Creator platforms verification failed: ${label}`);
  }
}

const registry = read("src/modules/analytics/components/LaunchBoardRegistry.jsx");
const mainPanel = read("src/modules/analytics/components/AnalyticsMainPanel.jsx");
const marketingOs = read("src/modules/analytics/components/MarketingOsBoard.jsx");
const board = read("src/modules/analytics/components/CreatorPlatformsBoard.jsx");
const data = read("src/modules/analytics/data/creatorPlatformsData.js");
const browserChecks = read("scripts/check-analytics-boards.mjs");

assertIncludes(registry, 'boardId === "creatorPlatforms"', "route does not select MarketingOS");
assertIncludes(mainPanel, "<CreatorPlatformsBoard />", "board is not mounted");
assertIncludes(marketingOs, 'board=creatorPlatforms', "MarketingOS link is missing");
assertIncludes(board, "UGC и инфлюенсеры", "page title is missing");
assertIncludes(board, "Проверка перед оплатой", "moderation checklist is missing");
assertIncludes(data, "JoinBrands", "global pilot platforms are missing");
assertIncludes(data, "Partipost", "Southeast Asia platform is missing");
assertIncludes(data, "Qoruz", "India platform is missing");
assertIncludes(data, "Tikora", "Africa platform is missing");
assertIncludes(data, "Squid", "Brazil platform is missing");
assertIncludes(browserChecks, 'id: "creator-platforms"', "browser smoke test is missing");

console.log("Creator platforms verification passed.");
