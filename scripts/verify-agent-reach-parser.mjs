import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  AGENT_REACH_PLATFORM_CONFIG,
  parseAgentReachSearchText,
} from "../server/agent-reach-parser.mjs";

const fixture = `Title: Example Web3 Marketer
URL: https://www.linkedin.com/in/example-web3
Published: 2026-07-20T12:00:00.000Z
Author: N/A
Highlights:
Web3 growth, community and partnerships.

---

Title: Wrong domain
URL: https://example.com/profile
Highlights:
Must not pass the LinkedIn allowlist.`;

const items = parseAgentReachSearchText(fixture, {
  platform: "linkedin",
  query: "web3 marketing",
  segment: "cryptoMlm",
  country: "Global",
  language: "en",
});

assert.equal(items.length, 1);
assert.equal(items[0].platform, "linkedin");
assert.equal(items[0].rawProvider, "agent-reach/exa");
assert.equal(items[0].profileUrl, "https://www.linkedin.com/in/example-web3");
assert.equal(items[0].lawfulBasis, "legitimate_interest");
assert.ok(items[0].id.startsWith("agent-reach-linkedin-"));
assert.deepEqual(
  Object.keys(AGENT_REACH_PLATFORM_CONFIG),
  ["linkedin", "facebook", "x", "youtube", "reddit", "github", "web"],
);

const contentApi = fs.readFileSync(path.join(process.cwd(), "server/content-api.mjs"), "utf8");
const panel = fs.readFileSync(
  path.join(process.cwd(), "src/modules/analytics/components/UniversalSocialParserPanel.jsx"),
  "utf8",
);
const workflow = fs.readFileSync(path.join(process.cwd(), ".github/workflows/deploy.yml"), "utf8");

assert.match(contentApi, /\/api\/content\/agent-reach-search/);
assert.match(contentApi, /\/api\/content\/agent-reach-status/);
assert.match(contentApi, /hasMarketingWriteSession\(request\)/);
assert.match(contentApi, /INTERNAL_CONTENT_KEYS[\s\S]*AGENT_REACH_RUNS_KEY/);
assert.match(panel, /Agent Reach/);
assert.match(panel, /agent-reach-search/);
assert.match(panel, /analytics-agent-reach-table/);
assert.match(workflow, /agent-reach-parser\.mjs/);
assert.match(workflow, /mcporter@0\.9\.0/);

console.log("Agent Reach parser integration verified.");
