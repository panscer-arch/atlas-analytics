import { readContent, writeContent } from "./telegram-task-store.mjs";

export const INSTAGRAM_PARSER_RUNS_KEY = "atlas.analytics.instagramParser.runs.v1";
export const INSTAGRAM_PARSER_LEADS_KEY = "atlas.analytics.instagramParser.leads.v1";

const DEFAULT_ACTOR_ID = "apify/instagram-scraper";
const MAX_LIMIT = 100;
const SENSITIVE_PATTERN = /children|minor|kid|teen|religion|politic|health|medical|ethnic|sexual|biometric|face\s*recognition/i;
const SEARCH_TIMEOUT_MS = 12000;
const ASIA_DISCOVERY_SEEDS = [
  {
    username: "indiandirectsellingassociation",
    displayName: "Indian Direct Selling Association",
    country: "India / Asia",
    language: "en",
    segment: "cryptoMlm",
    bio: "Direct selling association / network marketing industry signal in Asia.",
    relevance: "Direct selling / MLM industry source in Asia; useful for association mapping and partner landscape research.",
  },
  {
    username: "rifqi95",
    displayName: "Rifqi Ap",
    country: "Indonesia / Asia",
    language: "id/en",
    segment: "tokenPresale",
    bio: "Crypto trader / crypto investor / airdrop hunter public signal.",
    relevance: "Airdrop hunter and crypto-investor signal in Indonesia; good for Web3 quest / airdrop audience research.",
  },
  {
    username: "beincrypto.id",
    displayName: "BeInCrypto Indonesia",
    country: "Indonesia / Asia",
    language: "id",
    segment: "defiYield",
    bio: "Indonesian crypto media audience with airdrop / Web3 content signals.",
    relevance: "Crypto media account with Indonesian airdrop-hunter audience; useful for placement or creator mapping.",
  },
  {
    username: "silent_crypto666",
    displayName: "Silent_Crypto",
    country: "Indonesia / Asia",
    language: "id/en",
    segment: "tokenPresale",
    bio: "Web3 / airdrop project links / Indonesia public signal.",
    relevance: "Web3 + Indonesia public signal; candidate for manual validation before outreach.",
  },
  {
    username: "dimasikhsan254",
    displayName: "binbaz",
    country: "Indonesia / Asia",
    language: "id",
    segment: "tokenPresale",
    bio: "Airdrop hunter public profile signal in Indonesia.",
    relevance: "Airdrop hunter profile in Indonesia; candidate for Web3 community research.",
  },
  {
    username: "qnetofficial",
    displayName: "QNET official / regional direct selling signal",
    country: "Singapore / Malaysia / Philippines / Indonesia",
    language: "en",
    segment: "cryptoMlm",
    bio: "Regional direct-selling ecosystem signal across Singapore, Malaysia, Philippines and Indonesia.",
    relevance: "Regional direct-selling ecosystem signal; useful for mapping Asian MLM/direct-selling landscape.",
  },
];

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

function stripHtml(value = "") {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeMaybe(value = "") {
  let current = String(value || "");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }
  return current;
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
  return ["p", "reel", "reels", "explore", "stories", "tv"].includes(username) ? "" : username;
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

function buildSearchQueries(request) {
  const query = String(request.query || "").trim();
  const hashtags = toArray(request.hashtags).map(normalizeHashtag).filter(Boolean);
  const country = String(request.country || "Asia").trim();
  const seeds = [
    query,
    hashtags.slice(0, 3).map((tag) => `#${tag}`).join(" "),
    "MLM leader network marketing direct selling business coach",
    "airdrop hunter crypto web3 community",
  ].filter(Boolean);

  return unique(seeds.map((seed) => `site:instagram.com ${seed} ${country}`)).slice(0, 4);
}

function seedMatchesRequest(seed, request) {
  const haystack = [seed.username, seed.displayName, seed.country, seed.language, seed.segment, seed.bio, seed.relevance].join(" ").toLowerCase();
  const terms = [
    ...String(request.query || "").split(/\s+/),
    ...toArray(request.hashtags),
    request.country,
    request.language,
  ].map((item) => String(item || "").replace(/^#/, "").toLowerCase()).filter((item) => item.length >= 3);
  if (!terms.length) return true;
  return terms.some((term) => haystack.includes(term));
}

function buildSeedCandidates(request) {
  return ASIA_DISCOVERY_SEEDS
    .filter((seed) => seedMatchesRequest(seed, request))
    .map((seed) => ({
      url: `https://www.instagram.com/${seed.username}/`,
      profileUrl: `https://www.instagram.com/${seed.username}/`,
      username: seed.username,
      displayName: seed.displayName,
      bio: seed.bio,
      caption: seed.relevance,
      externalUrl: "",
      rawProvider: "seed-fallback",
      country: seed.country,
      language: seed.language,
      segment: seed.segment,
    }));
}

async function fetchTextWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 AppleWebKit/537.36 AtlasSocialParser/1.0",
      },
      signal: controller.signal,
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } finally {
    clearTimeout(timer);
  }
}

function extractInstagramCandidates(html, request) {
  const candidates = [];
  const blocks = String(html || "").split(/result__body|web-result|result results_links/i);
  const instagramUrlPattern = /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._/%-]+\/?/gi;
  const encodedUrlPattern = /https?%3A%2F%2F(?:www%5C?%2E|www\.)?instagram%5C?%2Ecom%2F[A-Za-z0-9._%/-]+/gi;

  for (const block of blocks) {
    const decodedBlock = decodeMaybe(block);
    const urls = [
      ...(decodedBlock.match(instagramUrlPattern) || []),
      ...(block.match(encodedUrlPattern) || []).map(decodeMaybe),
    ].map((url) => url.replace(/\\+/g, "").replace(/[)"'<>\]]+$/g, ""));

    for (const rawUrl of urls) {
      const url = rawUrl.split(/&|%26/)[0];
      if (/\/(accounts|developer|about|privacy|terms)\b/i.test(url)) continue;
      const username = usernameFromUrl(url);
      const profileUrl = username ? normalizeProfileUrl(username) : "";
      const sourceUrl = url.replace(/\/+$/, "/");
      const text = stripHtml(decodedBlock).slice(0, 420);
      const displayName = username || "Instagram lead";
      const candidate = {
        url: sourceUrl,
        profileUrl: profileUrl || sourceUrl,
        username,
        displayName,
        bio: text,
        caption: text,
        externalUrl: extractEmail(text),
        rawProvider: "public-web-discovery",
        sourceQuery: request.query,
      };
      candidates.push(candidate);
    }
  }
  return candidates;
}

function normalizeWebDiscoveryItem(item, request, index) {
  const lead = normalizeApifyItem(item, request, index);
  if (!lead) return null;
  return {
    ...lead,
    country: item.country || lead.country,
    language: item.language || lead.language,
    segment: item.segment || lead.segment,
    rawProvider: item.rawProvider || "public-web-discovery",
    relevanceReason: item.caption || "Найдено через публичную web-discovery выдачу по Instagram. Требуется ручная проверка профиля перед outreach.",
  };
}

async function searchInstagramViaPublicWeb(request = {}) {
  const startedAt = new Date().toISOString();
  const runId = `instagram-run-${Date.now()}`;
  const limit = normalizeLimit(request.limit);
  const directProfileUrls = unique(toArray(request.profileUrls).map(normalizeProfileUrl));
  const directCandidates = directProfileUrls.map((url) => ({
    url,
    profileUrl: url,
    username: usernameFromUrl(url),
    displayName: usernameFromUrl(url) || "Instagram lead",
    bio: "Ручной Instagram URL из формы. Требуется проверка публичного business context.",
    rawProvider: "manual-url",
  }));

  const queries = buildSearchQueries(request);
  const attempts = [];
  const candidates = [...directCandidates];

  for (const query of queries) {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    try {
      const result = await fetchTextWithTimeout(searchUrl);
      attempts.push({ query, status: result.status, ok: result.ok });
      if (result.ok) {
        candidates.push(...extractInstagramCandidates(result.text, { ...request, query }));
      }
    } catch (error) {
      attempts.push({ query, ok: false, error: error?.message || "search_failed" });
    }
    if (uniqueLeads(candidates.map((item, index) => normalizeWebDiscoveryItem(item, request, index)).filter(Boolean)).length >= limit) break;
  }

  const items = uniqueLeads(candidates.map((item, index) => normalizeWebDiscoveryItem(item, request, index)).filter(Boolean)).slice(0, limit);
  const seedItems = items.length ? [] : buildSeedCandidates(request).map((item, index) => normalizeWebDiscoveryItem(item, request, index)).filter(Boolean);
  const finalItems = items.length ? items : uniqueLeads(seedItems).slice(0, limit);
  await appendLeads(finalItems);

  const run = {
    id: runId,
    provider: items.length ? "public-web-discovery" : "seed-fallback",
    status: finalItems.length ? "finished" : "empty",
    startedAt,
    finishedAt: new Date().toISOString(),
    request: { ...request, limit },
    counts: { raw: candidates.length, normalized: finalItems.length },
    errors: attempts.filter((attempt) => !attempt.ok).map((attempt) => attempt.error || `search_http_${attempt.status}`),
    attempts,
  };
  await appendRun(run);

  return {
    ok: true,
    status: 200,
    provider: run.provider,
    fallback: true,
    message: finalItems.length
      ? `Apify token отсутствует, использован ${run.provider}. Найдено ${finalItems.length}.`
      : "Apify token отсутствует, fallback не нашёл Instagram-лидов по этому запросу.",
    run: { ...run, count: finalItems.length },
    items: finalItems,
  };
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
    return searchInstagramViaPublicWeb(request);
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
