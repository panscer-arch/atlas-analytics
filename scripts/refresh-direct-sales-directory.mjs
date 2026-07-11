import { writeFile } from "node:fs/promises";

const SITEMAP_URL = "https://www.directsalesdirectory.com/listing-sitemap.xml";
const OUTPUT_PATH = new URL("../src/modules/analytics/data/directSalesDirectoryLeadsData.js", import.meta.url);
const CONCURRENCY = 6;

function decode(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#8217;", "'")
    .replaceAll("&#8220;", '"')
    .replaceAll("&#8221;", '"')
    .replaceAll("&#8211;", "-")
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function valueAfter(html, className) {
  const match = html.match(new RegExp(`<div class="${className}">([\\s\\S]*?)</div>`));
  return decode(match?.[1] || "");
}

function hrefAfter(html, className, prefix = "") {
  const match = html.match(new RegExp(`<div class="${className}">[\\s\\S]*?<a[^>]+href=["']([^"']+)["']`));
  const href = decode(match?.[1] || "");
  return href.startsWith(prefix) ? href.slice(prefix.length) : href;
}

function inferCountry(url) {
  const slug = url.split("/").filter(Boolean).at(-1) || "";
  if (slug.includes("canada") || slug.includes("ontario") || slug.includes("alberta") || slug.includes("quebec")) return "Канада";
  return "США";
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "Atlas-SuperSUS directory refresh/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

const sitemap = await fetchText(SITEMAP_URL);
const urls = [...sitemap.matchAll(/<loc>(https:\/\/www\.directsalesdirectory\.com\/listing\/[^<]+)<\/loc>/g)].map((match) => match[1]);
const rows = [];
let cursor = 0;

async function worker() {
  while (cursor < urls.length) {
    const index = cursor++;
    const profileUrl = urls[index];
    try {
      const html = await fetchText(profileUrl);
      const name = valueAfter(html, "listing-name");
      const company = valueAfter(html, "listing-company");
      if (!name) continue;
      rows.push({
        id: `dsd-${profileUrl.split("/").filter(Boolean).at(-1)}`,
        name,
        country: inferCountry(profileUrl),
        company,
        website: hrefAfter(html, "listing-personal-website"),
        email: hrefAfter(html, "listing-email", "mailto:"),
        profileUrl,
        source: "Direct Sales Directory",
        status: "Новый",
        notes: "",
      });
    } catch (error) {
      console.warn(`Skip ${profileUrl}: ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
rows.sort((a, b) => a.name.localeCompare(b.name));
const output = `// Generated from public Direct Sales Directory profile pages. Refresh with npm run refresh:direct-sales-directory.\n\nexport const DIRECT_SALES_DIRECTORY_LEADS_STORAGE_KEY = "atlas.analytics.mlmLeaders.directSalesDirectory.v1";\n\nexport const DIRECT_SALES_DIRECTORY_LEAD_STATUS_OPTIONS = [\n  "Новый",\n  "Проверить активность",\n  "Готовить оффер",\n  "Написали",\n  "Ответили",\n  "Пауза",\n  "Не подходит",\n];\n\nexport const defaultDirectSalesDirectoryLeads = ${JSON.stringify(rows, null, 2)};\n`;
await writeFile(OUTPUT_PATH, output);
console.log(`Saved ${rows.length} public Direct Sales Directory profiles to ${OUTPUT_PATH.pathname}`);
