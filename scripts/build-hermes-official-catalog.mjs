import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { JSDOM } from "jsdom";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const policyPath = resolve(repoRoot, "content/hermes/official-memory-policy.json");
const outputPath = resolve(
  process.argv.find((value) => value.startsWith("--output="))?.slice(9)
    || resolve(repoRoot, "content/hermes/atlas-official-memory.v1.json"),
);
const policy = JSON.parse(await readFile(policyPath, "utf8"));
const generatedAt = new Date().toISOString();
const blockedSelectors = [
  "script", "style", "noscript", "svg", "nav", "header", "footer", "form", "dialog",
  "[role='navigation']", "[aria-hidden='true']", ".cky-consent-container", ".cookie", ".menu",
];

const discovered = [];
for (const sitemap of policy.sitemaps) {
  const xml = await fetchText(sitemap.url, "application/xml,text/xml");
  for (const url of extractLocations(xml)) {
    if (!isSupportedPage(url)) continue;
    discovered.push({ url, tier: sitemap.tier, kind: sitemap.kind });
  }
}
for (const pathname of policy.explicitPagePaths || []) {
  discovered.push({ url: new URL(pathname, "https://atlas-system.io").toString(), tier: "B", kind: "website" });
  discovered.push({
    url: new URL(pathname === "/" ? "/ru/" : `/ru${pathname}`, "https://atlas-system.io").toString(),
    tier: "B",
    kind: "website",
  });
}

const pageJobs = uniqueBy(discovered, (item) => item.url);
const pageResults = await mapLimit(pageJobs, 5, async (job) => {
  console.error(`[official-catalog] page ${job.url}`);
  try {
    return { source: await fetchPage(job), documents: [] };
  } catch (error) {
    return { error: reviewItem("page-fetch", job.url, error) };
  }
});

const sources = [];
const reviewQueue = [];
const linkedDocuments = [];
for (const result of pageResults) {
  if (result.error) {
    reviewQueue.push(result.error);
    continue;
  }
  sources.push(result.source);
  linkedDocuments.push(...result.source.linkedDocuments);
  delete result.source.linkedDocuments;
}

const explicitByUrl = new Map(policy.explicitDocuments.map((item) => [canonicalUrl(item.url), item]));
const documentJobs = uniqueBy([
  ...policy.explicitDocuments,
  ...linkedDocuments.map((url) => ({
    url,
    title: fileTitle(url),
    language: languageForUrl(url),
    tier: "B",
    topic: "linked-document",
  })),
], (item) => canonicalUrl(item.url)).map((item) => explicitByUrl.get(canonicalUrl(item.url)) || item);

const documentResults = await mapLimit(documentJobs, 3, async (job) => {
  console.error(`[official-catalog] document ${job.url}`);
  try {
    return await fetchPdf(job);
  } catch (error) {
    if (job.fallbackFile) {
      try {
        const bytes = new Uint8Array(await readFile(resolve(repoRoot, job.fallbackFile)));
        const source = await extractPdfSource(job, bytes, "reviewed-local-snapshot-2026-07-27");
        reviewQueue.push({
          type: "document-fetch",
          url: job.url,
          status: "retained-reviewed-snapshot",
          error: error instanceof Error ? error.message : String(error),
          fallbackFile: job.fallbackFile,
          checkedAt: generatedAt,
        });
        return source;
      } catch (fallbackError) {
        reviewQueue.push(reviewItem("document-fallback", job.url, fallbackError));
      }
    }
    reviewQueue.push(reviewItem("document-fetch", job.url, error));
    return null;
  }
});
sources.push(...documentResults.filter(Boolean));

sources.sort((left, right) => {
  const tier = String(left.tier).localeCompare(String(right.tier));
  return tier || left.url.localeCompare(right.url);
});

for (const conflict of policy.knownConflicts) {
  reviewQueue.push({
    type: "known-conflict",
    status: "guardrail-active",
    ...conflict,
  });
}

const catalog = {
  version: 1,
  generatedAt,
  policyVersion: policy.version,
  sourcePriority: policy.sourcePriority,
  knownConflicts: policy.knownConflicts,
  stats: {
    pages: sources.filter((source) => source.type === "web_page").length,
    documents: sources.filter((source) => source.type === "document").length,
    tierA: sources.filter((source) => source.tier === "A").length,
    tierB: sources.filter((source) => source.tier === "B").length,
    tierC: sources.filter((source) => source.tier === "C").length,
    characters: sources.reduce((sum, source) => sum + source.content.length, 0),
    reviewItems: reviewQueue.length,
  },
  sources,
  reviewQueue,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, generatedAt, ...catalog.stats }, null, 2));

async function fetchPage(job) {
  const { response, body: html } = await fetchBody(job.url, {
    headers: { accept: "text/html,application/xhtml+xml", "user-agent": "AtlasHermesOfficialMemory/1.0" },
  }, "text");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const document = new JSDOM(html, { url: job.url }).window.document;
  const linkedDocuments = [...document.querySelectorAll("a[href]")]
    .map((anchor) => canonicalUrl(new URL(anchor.getAttribute("href"), job.url).toString()))
    .filter(isApprovedPdfUrl);
  for (const selector of blockedSelectors) {
    for (const element of document.querySelectorAll(selector)) element.remove();
  }
  const root = document.querySelector("main, #main, .site-main, article") || document.body;
  const blocks = [...root.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote")]
    .filter((element) => !element.querySelector("h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote"))
    .map((element) => normalizeText(element.textContent))
    .filter((text) => text.length > 1);
  const url = canonicalUrl(job.url);
  const productStatus = Object.entries(policy.productStatus)
    .find(([pathname]) => new URL(url).pathname.endsWith(pathname))?.[1] || null;
  const title = normalizeText(root.querySelector("h1")?.textContent)
    || normalizeText(document.title)
    || fileTitle(url);
  const description = normalizeText(document.querySelector('meta[name="description"]')?.content || "");
  const readableContent = dedupeConsecutive(blocks).join("\n\n") || normalizeText(root.textContent);
  const content = readableContent.length >= 100
    ? readableContent
    : [title, description, readableContent, "Official index or media page; no additional readable body text was published in this snapshot."].filter(Boolean).join("\n\n");
  const language = languageForUrl(url, document.documentElement.lang);
  return makeSource({
    id: sourceId("page", url),
    title,
    url,
    type: "web_page",
    kind: job.kind,
    tier: promotePageTier(url, job.tier),
    language,
    productStatus,
    version: document.querySelector('meta[property="article:modified_time"]')?.content
      || response.headers.get("last-modified")
      || generatedAt,
    content,
    linkedDocuments,
  });
}

async function fetchPdf(job) {
  const { response, body } = await fetchBody(job.url, {
    headers: { accept: "application/pdf", "user-agent": "AtlasHermesOfficialMemory/1.0" },
  }, "bytes", job.url.includes("beosin.com") ? 12_000 : 45_000);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = new Uint8Array(body);
  return extractPdfSource(job, bytes, response.headers.get("last-modified") || generatedAt);
}

async function extractPdfSource(job, bytes, version) {
  if (String.fromCharCode(...bytes.slice(0, 4)) !== "%PDF") throw new Error("response is not a PDF");
  const pdf = await getDocument({ data: bytes, useSystemFonts: true }).promise;
  const pages = [];
  try {
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const text = await page.getTextContent();
      pages.push(`Page ${index}\n${normalizeText(text.items.map((item) => item.str || "").join(" "))}`);
    }
  } finally {
    await pdf.destroy();
  }
  const content = pages.join("\n\n");
  if (content.length < 100) throw new Error("image-only PDF requires reviewed OCR");
  const url = canonicalUrl(job.url);
  return makeSource({
    id: sourceId("document", url),
    title: job.title || fileTitle(url),
    url,
    type: "document",
    kind: "official-document",
    tier: job.tier || "B",
    topic: job.topic || "document",
    language: job.language || languageForUrl(url),
    productStatus: null,
    version,
    content,
    byteSize: bytes.byteLength,
  });
}

function makeSource(source) {
  return {
    ...source,
    fetchedAt: generatedAt,
    contentHash: createHash("sha256").update(source.content).digest("hex"),
  };
}

function extractLocations(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].replaceAll("&amp;", "&"));
}

function isSupportedPage(value) {
  const url = new URL(value);
  if (!["atlas-system.io", "knowledge.atlas-system.io"].includes(url.hostname)) return false;
  if (/\.(?:xml|pdf|jpe?g|png|webp|gif|mp4|zip)$/i.test(url.pathname)) return false;
  if (/\/(?:wp-admin|wp-json|feed)(?:\/|$)/i.test(url.pathname)) return false;
  if (url.hostname === "atlas-system.io") {
    const locale = url.pathname.match(/^\/([a-z]{2})(?:\/|$)/i)?.[1]?.toLowerCase();
    if (locale && !policy.languages.includes(locale)) return false;
  }
  if (url.hostname === "knowledge.atlas-system.io" && url.pathname.startsWith("/presentations/")) {
    const section = decodeURIComponent(url.pathname).split("/").filter(Boolean)[1]?.toLowerCase();
    if (section && !["english", "russkij"].includes(section)) return false;
  }
  return true;
}

function isApprovedPdfUrl(value) {
  const url = new URL(value);
  if (!/\.pdf$/i.test(url.pathname)) return false;
  if (policy.explicitDocuments.some((document) => canonicalUrl(document.url) === canonicalUrl(value))) return true;
  if (!["atlas-system.io", "knowledge.atlas-system.io"].includes(url.hostname)) return false;
  const filename = decodeURIComponent(url.pathname.split("/").at(-1) || "").toLowerCase();
  return !/(?:^|[-_])(es|fr|de|pt|zh|hi|hindi|id|ms|tr|vi|th)(?:[-_.]|$)/i.test(filename);
}

function promotePageTier(value, fallback) {
  const path = new URL(value).pathname;
  return /(?:risk-disclosure|system-rules|interface-terms|partner-program-rules|privacy|cookie|contract-registry|direct-interaction|dao-inspired)/i.test(path)
    ? "A"
    : fallback;
}

function languageForUrl(value, hint = "") {
  const path = new URL(value).pathname.toLowerCase();
  if (path.startsWith("/ru/") || /(?:^|[-_/])ru(?:[-_.\/]|$)/i.test(path)) return "ru";
  const normalizedHint = String(hint || "").slice(0, 2).toLowerCase();
  return policy.languages.includes(normalizedHint) ? normalizedHint : "en";
}

function canonicalUrl(value) {
  const url = new URL(value);
  url.hash = "";
  return url.toString();
}

function sourceId(prefix, value) {
  const url = new URL(value);
  const slug = `${url.hostname}${url.pathname}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${prefix}-${slug}`.slice(0, 180);
}

function fileTitle(value) {
  const name = decodeURIComponent(new URL(value).pathname.split("/").filter(Boolean).at(-1) || "Atlas System");
  return name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim();
}

function normalizeText(value = "") {
  return String(value).replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

function dedupeConsecutive(items) {
  return items.filter((item, index) => item !== items[index - 1]);
}

function uniqueBy(items, key) {
  return [...new Map(items.map((item) => [key(item), item])).values()];
}

function reviewItem(type, url, error) {
  return { type, url, status: "needs-review", error: error instanceof Error ? error.message : String(error), checkedAt: generatedAt };
}

async function fetchText(url, accept) {
  const { response, body } = await fetchBody(url, { headers: { accept, "user-agent": "AtlasHermesOfficialMemory/1.0" } }, "text");
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return body;
}

async function fetchBody(url, options = {}, bodyType = "text", timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, redirect: "follow", signal: controller.signal });
    const body = bodyType === "bytes" ? await response.arrayBuffer() : await response.text();
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit(items, concurrency, mapper) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, worker));
  return output;
}
