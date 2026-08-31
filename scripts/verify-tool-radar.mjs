import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  TOOL_RADAR_CATEGORIES,
  TOOL_RADAR_LEGACY_STORAGE_KEY,
  TOOL_RADAR_STORAGE_KEY,
  defaultToolRadarItems,
  migrateLegacyToolRadarItems,
  securityOsintToolRadarItems,
} from "../src/modules/analytics/data/toolRadarData.js";

const EXPECTED_SECURITY_TOOLS = [
  "strix-ai-pentester",
  "shannon-ai-pentester",
  "pentagi",
  "projectdiscovery-nuclei",
  "owasp-zap",
  "aquasecurity-trivy",
  "gitleaks",
  "semgrep",
  "spiderfoot",
  "owasp-amass",
  "lynis",
  "wazuh",
];

assert.equal(TOOL_RADAR_STORAGE_KEY, "atlas.analytics.toolRadar.v2");
assert.equal(TOOL_RADAR_LEGACY_STORAGE_KEY, "atlas.analytics.toolRadar.v1");
assert.ok(TOOL_RADAR_CATEGORIES.includes("Пентест и OSINT"));
assert.deepEqual(securityOsintToolRadarItems.map((item) => item.id), EXPECTED_SECURITY_TOOLS);
assert.equal(new Set(EXPECTED_SECURITY_TOOLS).size, EXPECTED_SECURITY_TOOLS.length);

for (const item of securityOsintToolRadarItems) {
  assert.equal(item.category, "Пентест и OSINT");
  assert.match(item.sourceUrl, /^https:\/\/github\.com\//);
  assert.ok(item.summary.length > 40);
  assert.ok(item.atlasUse.length > 40);
  assert.ok(item.caution.length > 40);
}

for (const activeToolId of ["strix-ai-pentester", "shannon-ai-pentester", "pentagi", "owasp-zap"]) {
  const tool = securityOsintToolRadarItems.find((item) => item.id === activeToolId);
  assert.match(tool.caution.toLocaleLowerCase("ru"), /staging|production/);
}

const legacyItems = [
  { id: "trendsee", title: "Изменённый TrendSee", decision: "adopt" },
  { id: "custom-tool", title: "Пользовательская находка", decision: "research" },
  { ...securityOsintToolRadarItems[0], decision: "research" },
];
const migrated = migrateLegacyToolRadarItems(legacyItems);
assert.equal(migrated.find((item) => item.id === "trendsee").title, "Изменённый TrendSee");
assert.equal(migrated.find((item) => item.id === "custom-tool").title, "Пользовательская находка");
assert.equal(migrated.find((item) => item.id === "strix-ai-pentester").decision, "research");
assert.equal(migrated.filter((item) => item.id === "strix-ai-pentester").length, 1);
assert.ok(EXPECTED_SECURITY_TOOLS.every((id) => migrated.some((item) => item.id === id)));
assert.ok(EXPECTED_SECURITY_TOOLS.every((id) => defaultToolRadarItems.some((item) => item.id === id)));

const radarBoard = await readFile(
  new URL("../src/modules/analytics/components/ToolRadarBoard.jsx", import.meta.url),
  "utf8",
);
assert.match(radarBoard, /loadServerContentResult\(TOOL_RADAR_STORAGE_KEY\)/);
assert.match(radarBoard, /loadServerContentResult\(TOOL_RADAR_LEGACY_STORAGE_KEY\)/);
assert.match(radarBoard, /migrateLegacyToolRadarItems\(legacyResult\.value\)/);
assert.match(radarBoard, /saveServerContent\(TOOL_RADAR_STORAGE_KEY, normalized\)/);

console.log("Tool radar verified: one security/OSINT list, 12 curated tools, safe migration, and staging warnings.");
