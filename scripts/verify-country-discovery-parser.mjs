import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const dataPath = path.join(root, "src/modules/analytics/data/countryDiscoveryData.js");
const componentPath = path.join(root, "src/modules/analytics/components/UniversalSocialParserPanel.jsx");
const cssPath = path.join(root, "src/modules/analytics/styles/analytics.css");

const componentSource = fs.readFileSync(componentPath, "utf8");
const cssSource = fs.readFileSync(cssPath, "utf8");
const { countryDiscoveryRows, createCountryDiscoverySearchUrl } = await import(pathToFileURL(dataPath));

const requiredCountries = [
  "brazil",
  "india",
  "pakistan",
  "indonesia",
  "philippines",
  "thailand",
  "vietnam",
  "cambodia",
  "nigeria",
  "south-africa",
  "kazakhstan",
];
const requiredArrayFields = ["discovery", "conversation", "communities", "queries", "sources"];
const ids = new Set();
const errors = [];

if (countryDiscoveryRows.length < 25) {
  errors.push(`Expected at least 25 country rows, received ${countryDiscoveryRows.length}.`);
}

for (const country of countryDiscoveryRows) {
  if (!country.id || ids.has(country.id)) errors.push(`Duplicate or missing country id: ${country.id || "(empty)"}.`);
  ids.add(country.id);

  for (const field of ["country", "countryEn", "region", "tier", "languages", "marketSignal", "caution", "confidence"]) {
    if (!String(country[field] || "").trim()) errors.push(`${country.id}: missing ${field}.`);
  }
  if (!Number.isFinite(country.score) || country.score < 0 || country.score > 100) {
    errors.push(`${country.id}: score must be between 0 and 100.`);
  }
  if (!["A", "B", "C"].includes(country.tier)) errors.push(`${country.id}: invalid tier ${country.tier}.`);
  if (!["high", "medium", "low"].includes(country.confidence)) errors.push(`${country.id}: invalid confidence ${country.confidence}.`);

  for (const field of requiredArrayFields) {
    if (!Array.isArray(country[field]) || country[field].length === 0) errors.push(`${country.id}: ${field} must be non-empty.`);
  }
  if (country.queries.length < 2) errors.push(`${country.id}: add at least two local discovery queries.`);
  if (!country.sources.every((source) => /^https:\/\//.test(source))) errors.push(`${country.id}: every source must be an HTTPS URL.`);

  const searchUrl = createCountryDiscoverySearchUrl(country, country.queries[0], country.discovery[0]);
  if (!searchUrl.startsWith("https://www.google.com/search?q=")) errors.push(`${country.id}: invalid public discovery URL.`);
}

for (const id of requiredCountries) {
  if (!ids.has(id)) errors.push(`Missing priority country: ${id}.`);
}

for (const marker of ['id: "countries"', "function CountryDiscoveryPanel", 'activeSocialTab === "countries"', 'get("social")']) {
  if (!componentSource.includes(marker)) errors.push(`UniversalSocialParserPanel is missing marker: ${marker}.`);
}
for (const marker of [".analytics-country-discovery", ".analytics-country-row", ".analytics-country-row-details"]) {
  if (!cssSource.includes(marker)) errors.push(`Analytics CSS is missing marker: ${marker}.`);
}

if (errors.length) {
  console.error("Country discovery parser verification failed.");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const tierA = countryDiscoveryRows.filter((country) => country.tier === "A").length;
const regions = new Set(countryDiscoveryRows.map((country) => country.region)).size;
console.log(`Country discovery verified: ${countryDiscoveryRows.length} countries, ${tierA} Tier A, ${regions} regions.`);
