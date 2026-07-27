import { readContent, writeContent } from "./telegram-task-store.mjs";

export const INSTAGRAM_PARSER_RUNS_KEY = "atlas.analytics.instagramParser.runs.v1";
export const INSTAGRAM_PARSER_LEADS_KEY = "atlas.analytics.instagramParser.leads.v1";

const DEFAULT_ACTOR_ID = "apify/instagram-scraper";
const MAX_LIMIT = 100;
const SENSITIVE_PATTERN = /children|minor|kid|teen|religion|politic|health|medical|ethnic|sexual|biometric|face\s*recognition/i;

function toArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLimit(value) {
  const number = Number(value || 25);
  if (!Number.isFinite(number)) return 25;
  return Math.max(1, Math.min(MAX_LIMIT, Math.round(number)));
}

function normalizeProfileUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, "/");
  const handle = raw.replace(/^@/, "").replace(/^instagram\.com\//i, "").split(/[/?#]/)[0];
  return handle ? `https://www.instagram.com/${handle}/` : "";
}

function normalizeHashtag(value) {
  return String(value || "").trim().replace(/^#/, "").replace(/\s+/g, "");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildApifyInput(request) {
  const limit = normalizeLimit(request.limit);
  const profileUrls = unique(toArray(request.profileUrls).map(normalizeProfileUrl));
  const hashtags = unique(toArray(request.hashtags).map(normalizeHashtag));
  const directUrls = [
    ...profileUrls,
    ...hashtags.map((tag) => `https://www.instagram.com/explore/tags/${tag}/`),
  ];

  const input = {
    resultsLimit: limit,
    addParentData: false,
  };

  if (directUrls.length) input.directUrls = directUrls;

  const query = String(request.query || "").trim();
  if (query && !directUrls.length) {
    input.search = query;
    input.searchType = request.mode === "hashtags" ? "hashtag" : "user";
  }

  if (request.mode === "posts") input.resultsType = "posts";
  if (request.mode === "profiles" || profileUrls.length) input.resultsType = "details";

  return input;
}

function extractText(...values) {
  return values.map((value) => String(value || "").trim()).find(Boolean) || "";
}

function extractEmail(...values) {
  const joined = values.map((value) => String(value || "")).join(" ");
  const match = joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] || "";
}

function usernameFromUrl(url) {
  const match = String(url || "").match(/instagram\.com\/([^/?#]+)/i);
  const username = match?.[1] || "";
  return ["p", "reel", "explore", "stories"].includes(username) ? "" : username;
}

function scoreLead({ bioExcerpt, publicContact, followersApprox, username, displayName }, request) {
  const haystack = [bioExcerpt, username, displayName, request.query, ...(toArray(request.hashtags))].join(" ").toLowerCase();
  let score = 30;
  if (/network|mlm|direct selling|business|coach|mentor|affiliate|partner/i.test(haystack)) score += 20;
  if (/crypto|web3|defi|dao|airdrop|blockchain/i.test(haystack)) score += 18;
  if (publicContact) score += 12;
  if (Number(followersApprox) >= 10000) score += 10;
  if (Number(followersApprox) >= 100000) score += 10;
  return Math.max(1, Math.min(100, score));
}

function normalizeApifyItem(item, request, index) {
  const url = extractText(item.url, item.inputUrl, item.profileUrl, item.ownerProfileUrl, item.postUrl);
  const username = extractText(item.username, item.ownerUsername, item.userName, usernameFromUrl(url));
  const displayName = extractText(item.fullName, item.displayName, item.name, item.ownerFullName, username);
  const bioExcerpt = extractText(item.biography, item.bio, item.caption, item.description).slice(0, 360);
  const publicContact = extractText(item.email, item.businessEmail, item.externalUrl, extractEmail(item.biography, item.bio, item.caption));
  const profileUrl = normalizeProfileUrl(username || url) || url;
  const sourceUrl = url || profileUrl;

  if (!sourceUrl || SENSITIVE_PATTERN.test([bioExcerpt, displayName, username].join(" "))) return null;

  const lead = {
    id: `instagram-lead-${Date.now()}-${index}-${Math.random().toString(16).slice(2, 8)}`,
    username,
    displayName,
    profileUrl,
    sourceUrl,
    postUrl: extractText(item.postUrl, item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : ""),
    bioExcerpt,
    publicContact: publicContact || "Проверить public bio / link in bio",
    followersApprox: Number(item.followersCount || item.followers || item.ownerFollowersCount || 0) || 0,
    segment: request.segment || "cryptoMlm",
    country: request.country || "Global",
    language: request.language || "en",
    relevanceReason: "Публичный Instagram-сигнал подходит под business / creator / Web3 / MLM research. Требуется ручная проверка перед outreach.",
    score: 0,
    reviewStatus: "not_contacted",
    contactStatus: "not_contacted",
    consentStatus: "not_requested",
    lawfulBasis: "legitimate_interest",
    sourceType: "instagram_public_profile",
    rawProvider: "apify",
    capturedAt: new Date().toISOString(),
  };
  lead.score = scoreLead(lead, request);
  return lead;
}

function uniqueLeads(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = String(row.profileUrl || row.sourceUrl || row.username || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function appendRun(run) {
  const current = await readContent(INSTAGRAM_PARSER_RUNS_KEY, []);
  const rows = Array.isArray(current) ? current : [];
  await writeContent(INSTAGRAM_PARSER_RUNS_KEY, [run, ...rows].slice(0, 100));
}

async function appendLeads(leads) {
  if (!leads.length) return [];
  const current = await readContent(INSTAGRAM_PARSER_LEADS_KEY, []);
  const rows = Array.isArray(current) ? current : [];
  const next = uniqueLeads([...leads, ...rows]).slice(0, 2000);
  await writeContent(INSTAGRAM_PARSER_LEADS_KEY, next);
  return next;
}

export async function searchInstagramApi(request = {}) {
  const token = String(process.env.APIFY_TOKEN || "").trim();
  if (!token) {
    return {
      ok: false,
      status: 400,
      needsApiKey: true,
      error: "missing_apify_token",
      message: "Нужен APIFY_TOKEN на сервере. Интерфейс готов, но реальный Instagram-поиск пока не запустится.",
    };
  }

  const startedAt = new Date().toISOString();
  const runId = `instagram-run-${Date.now()}`;
  const actorId = String(process.env.APIFY_INSTAGRAM_ACTOR_ID || DEFAULT_ACTOR_ID).replace("/", "~");
  const limit = normalizeLimit(request.limit);
  const input = buildApifyInput({ ...request, limit });

  if (!input.directUrls?.length && !input.search) {
    return {
      ok: false,
      status: 400,
      error: "empty_instagram_search",
      message: "Укажите ключевые слова, хэштеги или Instagram profile URLs.",
    };
  }

  const endpoint = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&clean=true&format=json`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const run = {
        id: runId,
        provider: "apify",
        status: "failed",
        startedAt,
        finishedAt: new Date().toISOString(),
        request: { ...request, limit },
        counts: { raw: 0, normalized: 0 },
        errors: [payload?.error?.message || payload?.message || `Apify HTTP ${response.status}`],
      };
      await appendRun(run);
      return { ok: false, status: response.status, provider: "apify", run, error: "apify_request_failed", message: run.errors[0] };
    }

    const rawItems = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
    const items = uniqueLeads(rawItems.map((item, index) => normalizeApifyItem(item, request, index)).filter(Boolean)).slice(0, limit);
    await appendLeads(items);

    const run = {
      id: runId,
      provider: "apify",
      status: "finished",
      startedAt,
      finishedAt: new Date().toISOString(),
      request: { ...request, limit },
      counts: { raw: rawItems.length, normalized: items.length },
      errors: [],
    };
    await appendRun(run);

    return { ok: true, status: 200, provider: "apify", run: { ...run, count: items.length }, items };
  } catch (error) {
    const run = {
      id: runId,
      provider: "apify",
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      request: { ...request, limit },
      counts: { raw: 0, normalized: 0 },
      errors: [error?.message || "network_error"],
    };
    await appendRun(run);
    return { ok: false, status: 502, provider: "apify", run, error: "instagram_search_failed", message: run.errors[0] };
  }
}
