import { mkdir, writeFile } from "node:fs/promises";

const API_BASE = "https://ru.businessforhome.org/wp-json/wp/v2/distributor";
const OUTPUT_DIR = new URL("../outputs/marketing-research/", import.meta.url);
const DATA_FILE = new URL("../src/modules/analytics/data/businessForHomeLeadsData.js", import.meta.url);
const PUBLIC_PROFILE_TOTAL = 1019;
const PAGE_SIZE = 100;
const PAGE_COUNT = Math.ceil(PUBLIC_PROFILE_TOTAL / PAGE_SIZE);

function clean(value = "") {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function csvCell(value = "") {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "Atlas research contact parser/1.0" } });
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return response.text();
}

async function mapWithConcurrency(items, limit, mapper) {
  const output = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      output[current] = await mapper(items[current]);
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return output;
}

function profileRegion(country) {
  return {
    "США": "northAmerica",
    "Канада": "northAmerica",
    "Сальвадор": "latam",
    "Австралия": "oceania",
  }[country] || "global";
}

function parseProfile(html, post, index) {
  const country = clean((html.match(/hero__country[\s\S]{0,250}?<span>([^<]+)/) || [])[1]).replace(/^Страна:\s*/, "");
  const company = clean((html.match(/hero__company[\s\S]{0,350}?<a[^>]*>([^<]+)/) || [])[1]);
  const contacts = [...html.matchAll(/<a class="button button--distributor" href="([^"]+)"[^>]*>[\s\S]{0,600}?<p>([^<]+)/g)]
    .map((match) => ({ type: clean(match[2]).toLowerCase(), url: match[1].trim() }));
  const find = (type) => contacts.find((contact) => contact.type === type)?.url || "";

  return {
    id: `bfh-${String(index + 1).padStart(3, "0")}`,
    name: clean(post.title.rendered),
    country,
    company,
    website: find("вебсайт"),
    facebook: find("facebook"),
    profileUrl: post.link,
    region: profileRegion(country),
    status: "Новый",
    notes: "",
  };
}

async function loadPublicProfiles() {
  const pages = await Promise.all(
    Array.from({ length: PAGE_COUNT }, (_, index) => fetch(`${API_BASE}?per_page=${PAGE_SIZE}&orderby=modified&order=desc&page=${index + 1}`).then((response) => response.json())),
  );
  return pages.flat();
}

const profiles = await loadPublicProfiles();
const leads = await mapWithConcurrency(profiles, 8, async (profile, index) => {
  try {
    const url = profile.link.replace("www.businessforhome.org", "ru.businessforhome.org");
    return parseProfile(await fetchText(url), profile, index);
  } catch {
    return {
      id: `bfh-${String(index + 1).padStart(3, "0")}`,
      name: clean(profile.title.rendered),
      country: "",
      company: "",
      website: "",
      facebook: "",
      profileUrl: profile.link,
      region: "global",
      status: "Проверить активность",
      notes: "Не удалось загрузить открытую карточку источника.",
    };
  }
});

const dataSource = `export const BUSINESS_FOR_HOME_LEADS_STORAGE_KEY = "atlas.analytics.mlmLeaders.businessForHome.v1";\n\nexport const BUSINESS_FOR_HOME_LEAD_STATUS_OPTIONS = [\n  "Новый",\n  "Проверить активность",\n  "Готовить оффер",\n  "Написали",\n  "Ответили",\n  "Пауза",\n  "Не подходит",\n];\n\nexport const defaultBusinessForHomeLeads = ${JSON.stringify(leads, null, 2)};\n`;

const csvRows = [
  ["Name", "Country", "Company", "Website", "Facebook", "BFH profile"],
  ...leads.map((lead) => [lead.name, lead.country, lead.company, lead.website, lead.facebook, lead.profileUrl]),
].map((row) => row.map(csvCell).join(","));

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all([
  writeFile(DATA_FILE, dataSource, "utf8"),
  writeFile(new URL("businessforhome-public-leads-full.csv", OUTPUT_DIR), `${csvRows.join("\n")}\n`, "utf8"),
]);

console.log(JSON.stringify({
  total: leads.length,
  withWebsite: leads.filter((lead) => lead.website).length,
  withFacebook: leads.filter((lead) => lead.facebook).length,
  unavailableProfiles: leads.filter((lead) => lead.status === "Проверить активность").length,
}, null, 2));
