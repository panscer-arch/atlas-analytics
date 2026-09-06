import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const configPath = path.join(root, "src/modules/analytics/data/navigationShell.js");
const headerPath = path.join(root, "src/modules/analytics/components/AnalyticsHeader.jsx");
const crmCommandPath = path.join(root, "src/modules/analytics/components/CrmCommandDashboard.jsx");

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
assert.doesNotMatch(headerSource, /onAiReview|Atlas Media|onContactsOpen|onParserOpen/);
assert.doesNotMatch(crmCommandSource, /isAiReviewOpen|AI-аудит задач/);

console.log("SuperSus navigation shell configuration verified.");
