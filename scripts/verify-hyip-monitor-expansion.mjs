import { COUNTRY_OPTIONS, defaultLeads } from "../src/modules/analytics/data/hyipParserData.js";
import { expandedHyipMonitorLeads } from "../src/modules/analytics/data/hyipMonitorExpansionData.js";

function hostOf(url) {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(expandedHyipMonitorLeads.length === 50, `Expected 50 expansion leads, got ${expandedHyipMonitorLeads.length}`);
assert(defaultLeads.length === 90, `Expected 90 combined leads, got ${defaultLeads.length}`);
assert(COUNTRY_OPTIONS.every((country) => typeof country === "string"), "Country filter contains non-string records");

const ids = expandedHyipMonitorLeads.map((lead) => lead.id);
const hosts = expandedHyipMonitorLeads.map((lead) => hostOf(lead.url));
assert(new Set(ids).size === ids.length, "Expansion contains duplicate ids");
assert(new Set(hosts).size === hosts.length, "Expansion contains duplicate hosts");

for (const lead of expandedHyipMonitorLeads) {
  assert(lead.aliveScore >= 70, `${lead.name}: expansion source is not active enough`);
  assert(lead.researchBatch === "2026-07-10", `${lead.name}: missing research batch`);
  assert(lead.lastSeen.includes("2026-07-10"), `${lead.name}: missing checked date`);
  for (const key of ["trafficScore", "aliveScore", "fitScore"]) {
    assert(Number.isFinite(lead[key]) && lead[key] >= 0 && lead[key] <= 100, `${lead.name}: invalid ${key}`);
  }
}

const allIds = defaultLeads.map((lead) => lead.id);
assert(new Set(allIds).size === allIds.length, "Combined monitor data contains duplicate ids");

for (const host of hosts) {
  assert(defaultLeads.filter((lead) => hostOf(lead.url) === host).length === 1, `Combined monitor data duplicates ${host}`);
}

console.log(JSON.stringify({
  ok: true,
  expansion: expandedHyipMonitorLeads.length,
  total: defaultLeads.length,
  activeExpansion: expandedHyipMonitorLeads.filter((lead) => lead.aliveScore >= 70).length,
}, null, 2));
