import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const configPath = path.join(root, "src/modules/analytics/data/navigationShell.js");
const headerPath = path.join(root, "src/modules/analytics/components/AnalyticsHeader.jsx");
const crmCommandPath = path.join(root, "src/modules/analytics/components/CrmCommandDashboard.jsx");
const stylesPath = path.join(root, "src/modules/analytics/styles/analytics.css");
const teamGraphStylesPath = path.join(root, "src/modules/analytics/styles/teamGraph.css");

assert.ok(fs.existsSync(configPath), "Navigation shell configuration is missing.");

const {
  DEFAULT_MAIN_TAB,
  HEADER_TOOL_ORDER,
  LEGACY_PRIMARY_TAB_REDIRECTS,
  MAIN_NAV_TABS,
  MARKETING_CONTACTS_TAB,
} = await import(pathToFileURL(configPath));

assert.equal(DEFAULT_MAIN_TAB, "parser", "Marketing must be the default workspace.");
assert.deepEqual(
  MAIN_NAV_TABS.map((tab) => tab.id),
  ["parser", "analytics", "tasks", "content"],
  "The main navigation must contain only the four approved workspaces.",
);
assert.deepEqual(
  HEADER_TOOL_ORDER,
  [
    "marketingOs",
    "session",
    "hermes",
    "expenses",
    "contributions",
    "toolRadar",
    "tables",
    "notes",
    "team",
    "departments",
    "vault",
    "crmListings",
    "crmPartners",
  ],
  "The header tools must match the approved order without AI review, contacts, marketing center or Atlas Media.",
);
assert.deepEqual(
  MARKETING_CONTACTS_TAB,
  { id: "contacts", label: "Контакты", hint: "единая база", boardId: "influencers" },
  "Contacts must be a nested Marketing workspace.",
);
assert.deepEqual(
  LEGACY_PRIMARY_TAB_REDIRECTS,
  {
    dashboard: "parser",
    products: "team",
    productLibrary: "team",
    developments: "team",
  },
  "Legacy Dashboard and Products routes must resolve to their new homes.",
);

const headerSource = fs.readFileSync(headerPath, "utf8");
const crmCommandSource = fs.readFileSync(crmCommandPath, "utf8");
const stylesSource = fs.readFileSync(stylesPath, "utf8");
const teamGraphStylesSource = fs.readFileSync(teamGraphStylesPath, "utf8");
assert.doesNotMatch(headerSource, /onAiReview|Atlas Media|onContactsOpen|onParserOpen/);
assert.doesNotMatch(crmCommandSource, /isAiReviewOpen|AI-аудит задач/);
assert.match(headerSource, /function HeaderTool\(\{ toolId, label, displayLabel = label,/);
assert.match(headerSource, /className="analytics-header-tool-label"/);
assert.match(
  headerSource,
  /<div className="analytics-header-top">[\s\S]*?<div className="analytics-header-time">\s*<AnalyticsDateTime \/>/,
  "System Time must occupy a dedicated top-right area.",
);
assert.equal(
  [...headerSource.matchAll(/<HeaderTool\b[^>]*displayLabel=/g)].length,
  HEADER_TOOL_ORDER.length,
  "Every header tool must have a visible label.",
);
assert.match(stylesSource, /\.analytics-header-tool-label\s*\{/);
assert.doesNotMatch(
  teamGraphStylesSource,
  /\.analytics-header-team-button span\s*\{\s*display:\s*none;/,
  "Team and departments labels must remain visible on mobile.",
);
assert.match(stylesSource, /\.analytics-header-top\s*\{/);

console.log("SuperSus navigation shell configuration verified.");
