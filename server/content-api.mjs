import http from "node:http";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { prepareHermesSpeechText, resolveHermesVoiceProfile, synthesizeHermesSpeech } from "./hermes-speech.mjs";
import { transcribeHermesAudio } from "./hermes-transcription.mjs";
import { addTelegramTask, appendTelegramOperation, collectTasks, CONTENT_KEYS, readContent, writeContent } from "./telegram-task-store.mjs";
import {
  collectMarketingDashboardEvents,
  collectMarketingDueEvents,
  collectMarketingSourceEvents,
  formatMarketingDashboardDigest,
  mergeMarketingEvents,
} from "./marketing-dashboard-monitor.mjs";

const PORT = Number(process.env.ATLAS_CONTENT_API_PORT || 8787);
const STORE_DIR = process.env.ATLAS_CONTENT_STORE_DIR || "/var/lib/atlas-analytics-content";
const BACKUP_DIR = path.join(STORE_DIR, "_backups");
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const TELEGRAM_ENV_FILE = process.env.ATLAS_TELEGRAM_ENV_FILE || "/etc/atlas-telegram-bot.env";
const OUTREACH_ENV_FILE = process.env.ATLAS_OUTREACH_ENV_FILE || "/etc/atlas-outreach.env";
const OUTREACH_LOG_KEY = "atlas.analytics.hyipOutreach.emailLog.v1";
const YOUTUBE_API_LEADS_KEY = "atlas.analytics.youtubeApiSearch.leads.v1";
const SEGMENT_OUTREACH_KEY = "atlas.analytics.segmentOutreach.v10";
const BITNEST_YOUTUBE_KEY = "atlas.analytics.bitnestYoutube.channels.v1";
const MARKETING_YOUTUBE_MONITOR_STATE_KEY = "atlas.analytics.marketingYoutubeMonitor.state.v1";
const MARKETING_DASHBOARD_KEY = "atlas.analytics.marketingDashboard.v1";
const EXPENSE_CENTER_KEY = "atlas.analytics.expenseCenter.v2";
const FINANCE_CONTENT_KEYS = new Set([
  EXPENSE_CENTER_KEY,
  "atlas.analytics.expenses.v1",
  "atlas.analytics.expenseFunds.v1",
]);
const MARKETING_DASHBOARD_MONITOR_STATE_KEY = "atlas.analytics.marketingDashboardMonitor.state.v1";
const MARKETING_TELEGRAM_BINDING_KEY = "atlas.analytics.marketingTelegramBinding.v1";
const MARKETING_TELEGRAM_LINK_REQUEST_KEY = "atlas.analytics.marketingTelegramLinkRequest.v1";
const MARKETING_BROWSER_LINK_REQUEST_KEY = "atlas.analytics.marketingBrowserLinkRequest.v1";
const MARKETING_BROWSER_SESSIONS_KEY = "atlas.analytics.marketingBrowserSessions.v1";
const MARKETING_SESSION_COOKIE = "atlas_marketing_session";
const MARKETING_SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const MARKETING_LOGIN_WINDOW_MS = 10 * 60 * 1000;
const MARKETING_LOGIN_MAX_ATTEMPTS = 8;
const MARKETING_LOGIN_MAX_BUCKETS = 1000;
const HERMES_ASSISTANT_WINDOW_MS = 10 * 60 * 1000;
const HERMES_ASSISTANT_MAX_REQUESTS = 30;
const HERMES_ASSISTANT_MAX_PROMPT_LENGTH = 12000;
const HERMES_ASSISTANT_TIMEOUT_MS = 180000;
const HERMES_SPEECH_MAX_REQUESTS = 60;
const HERMES_SPEECH_MAX_TEXT_LENGTH = 3500;
const HERMES_SPEECH_TIMEOUT_MS = 60000;
const HERMES_SPEECH_MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const PIPER_TTS_URL = String(process.env.PIPER_TTS_URL || "http://127.0.0.1:7466/synthesize").trim();
const EDGE_TTS_BIN = String(process.env.EDGE_TTS_BIN || "/opt/atlas-hermes-tts/venv/bin/edge-tts").trim();
const HERMES_TRANSCRIPTION_MAX_REQUESTS = 30;
const HERMES_TRANSCRIPTION_MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const HERMES_TRANSCRIPTION_TIMEOUT_MS = 90000;
const WHISPER_ASR_URL = String(process.env.WHISPER_ASR_URL || "http://127.0.0.1:7467/asr").trim();
const SUPERSUS_ACCESS_PASSWORD_HASH = String(
  process.env.SUPERSUS_ACCESS_PASSWORD_HASH
  || "734c3a7459ad629c114c70863427e1a5bb9161ae63407963685878e6e1af9c1e",
).trim().toLowerCase();
const FINANCE_BROWSER_SESSIONS_KEY = "atlas.analytics.financeBrowserSessions.v1";
const FINANCE_SESSION_COOKIE = "atlas_finance_session";
const FINANCE_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const FINANCE_LOGIN_WINDOW_MS = 10 * 60 * 1000;
const FINANCE_LOGIN_MAX_ATTEMPTS = 8;
const FINANCE_LOGIN_MAX_BUCKETS = 1000;
const FINANCE_PASSWORD = String(process.env.ATLAS_FINANCE_PASSWORD || "").trim();
const FINANCE_PASSWORD_FINGERPRINT = FINANCE_PASSWORD
  ? scryptSync(FINANCE_PASSWORD, "atlas-finance-session-v1", 32).toString("hex")
  : "";
const INTERNAL_CONTENT_KEYS = new Set([
  MARKETING_YOUTUBE_MONITOR_STATE_KEY,
  MARKETING_DASHBOARD_MONITOR_STATE_KEY,
  MARKETING_TELEGRAM_BINDING_KEY,
  MARKETING_TELEGRAM_LINK_REQUEST_KEY,
  MARKETING_BROWSER_LINK_REQUEST_KEY,
  MARKETING_BROWSER_SESSIONS_KEY,
  FINANCE_BROWSER_SESSIONS_KEY,
]);
const MARKETING_YOUTUBE_BOARD_URL = process.env.ATLAS_MARKETING_YOUTUBE_BOARD_URL
  || "https://pupanel.cc/workspaces/cmp5aou0h0005l5b26ldwn59c/marketing/youtube";
const MARKETING_DASHBOARD_URL = process.env.ATLAS_MARKETING_DASHBOARD_URL
  || "https://supersussystem.com/?board=parser";
const MARKETING_SOURCE_CONFIGS = [
  { id: "mlm-sources", directionId: "mlm", label: "MLM-лидеры / источники", key: "atlas.analytics.mlmLeaderOutreach.platforms.v1", nameFields: ["platform", "name"] },
  { id: "mlm-markets", directionId: "mlm", label: "MLM-компании и рынки", key: "atlas.analytics.mlmLeaders.markets.v1", nameFields: ["company", "association", "name"] },
  { id: "mlm-bfh", directionId: "mlm", label: "MLM-лидеры BFH", key: "atlas.analytics.mlmLeaders.businessForHome.v1", nameFields: ["name", "company"] },
  { id: "mlm-direct-sales", directionId: "mlm", label: "MLM-лидеры США / Канада", key: "atlas.analytics.mlmLeaders.directSalesDirectory.v1", nameFields: ["name", "company"] },
  { id: "influencers", directionId: "influencers", label: "Инфлюенсеры", key: "atlas.analytics.influencerProspects.v1", outreachKey: "atlas.analytics.influencerOutreach.queue.v1", nameFields: ["name"] },
  { id: "monitors", directionId: "monitors", label: "HYIP-мониторы", key: "atlas.analytics.hyipParserLeads.v3", outreachKey: "atlas.analytics.hyipOutreach.queue.v1", nameFields: ["name"] },
  { id: "telega", directionId: "telega", label: "Telegram-каналы", key: "atlas.analytics.telegramParserLeads.v2", outreachKey: "atlas.analytics.telegramOutreach.queue.v2", nameFields: ["name"] },
  { id: "articles", directionId: "articles", label: "Статьи и PR", key: "atlas.analytics.articlePlacement.resources.v1", nameFields: ["name"] },
  { id: "market-segments", directionId: "segments", label: "Сегменты рынка", key: "atlas.analytics.marketSegments.v1", nameFields: ["direction", "name"] },
  { id: "regional-hiring", directionId: "vacancies", label: "База вакансий", key: "atlas.analytics.regionalHiring.platforms.v1", nameFields: ["platform", "name"] },
  { id: "web3-segments", directionId: "web3", label: "Web3-сегменты", key: "atlas.analytics.web3Segments.v1", nameFields: ["segment", "name"] },
  { id: "segment-outreach", directionId: "segments", label: "Сегментный парсер", key: "atlas.analytics.segmentOutreach.v10", nameFields: ["name", "source"] },
];
const MARKETING_MONITORED_CONTENT_KEYS = new Set([
  MARKETING_DASHBOARD_KEY,
  ...FINANCE_CONTENT_KEYS,
  YOUTUBE_API_LEADS_KEY,
  SEGMENT_OUTREACH_KEY,
  BITNEST_YOUTUBE_KEY,
  ...MARKETING_SOURCE_CONFIGS.flatMap((config) => [config.key, config.outreachKey].filter(Boolean)),
]);
const MARKETING_WRITE_CONTENT_KEYS = new Set([
  ...MARKETING_MONITORED_CONTENT_KEYS,
  "atlas.analytics.atlasCreatives.v1",
]);
const YOUTRACK_SNAPSHOT_KEY = "atlas.analytics.youtrackIssueSnapshot.v1";
const YOUTRACK_DIGEST_SNAPSHOT_KEY = "atlas.analytics.youtrackDigestSnapshot.v1";
const YOUTRACK_DEFAULT_TELEGRAM_CHAT_ID = "-5158247269";
const YOUTRACK_DEFAULT_FIELDS = [
  "idReadable",
  "summary",
  "created",
  "updated",
  "resolved",
  "project(shortName,name)",
  "tags(name)",
  "customFields(name,value(name,presentation,fullName,login,text))",
  "comments(id,text,created,updated,author(login,fullName))",
].join(",");
const PANCAKE_USDT_USDC_POOL = {
  network: "bsc",
  address: "0x92b7807bF19b7DDdf89b706143896d05228f3121",
  label: "PancakeSwap V3 USDT/USDC 0.01%",
};
const BSC_RPC_URLS = (process.env.BSC_RPC_URLS || process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org,https://bsc-dataseed1.defibit.io")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const BSC_LOG_RPC_URLS = (process.env.BSC_LOG_RPC_URLS || process.env.BSC_ARCHIVE_RPC_URLS || process.env.BSC_RPC_URLS || process.env.BSC_RPC_URL || "https://bsc-rpc.publicnode.com,https://bsc-dataseed.binance.org,https://bsc-dataseed1.defibit.io")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const ATLAS_CONTRACTS_FROM_BLOCK = Number(process.env.ATLAS_CONTRACTS_FROM_BLOCK || 108000000);
const ATLAS_CONTRACTS_LOG_CHUNK = Math.max(50, Number(process.env.ATLAS_CONTRACTS_LOG_CHUNK || 2000));
const ATLAS_USDT_TOKEN = {
  address: "0x55d398326f99059fF775485246999027B3197955",
  symbol: "USDT",
  decimals: 18,
};
const ATLAS_CONTRACT_ADDRESSES = [
  {
    id: "lockup-flow",
    name: "Lockup Flow",
    type: "Smart Cycle contract",
    description: "Smart Cycle contract with a fixed participation term",
    address: "0x8F6daC6F25A5038112E1A01f1cBBD682e4D64889",
  },
  {
    id: "daily-flow",
    name: "Daily Flow",
    type: "Smart Cycle contract",
    description: "Smart Cycle contract with a daily payout cycle",
    address: "0x8F418e29a32AAB69Abf3DA742c43E7aDfBFbA3c3",
  },
  {
    id: "transport",
    name: "Transport",
    type: "Routing contract",
    description: "Contract for routing and liquidity transfer",
    address: "0x5a71807861dBFc41aB016271C3191bF96322D42e",
  },
  {
    id: "distribute",
    name: "Distribute",
    type: "Distribution contract",
    description: "Contract for distributing and paying out partner accruals",
    address: "0xEF156690b98AEc4F805Ec820268B9092bd83B76f",
  },
  {
    id: "usdt-token",
    name: "USDT Token",
    type: "BEP-20 token",
    description: "BEP-20 settlement asset",
    address: ATLAS_USDT_TOKEN.address,
    isToken: true,
  },
];
const ATLAS_FLOW_EVENT_CONFIG = {
  "lockup-flow": {
    lockedTopic: "0xfc19754b7c43ed8f5cf6ce6617a1fff336b6cc4bb8e5ea4bfa6a031d019c49ff",
    claimedTopic: "0x46f6410c5ade89c93d7353c04c3b9b15e6419e35ad8a0d0a806476b30f2d1344",
    lockedParts: [0],
    claimedParts: [1, 2],
    feeParts: [3],
  },
  "daily-flow": {
    lockedTopic: "0xb487eb29fe0f7991a6856ef7823cffab7461b3d1b9436c6df2f82a56491dd41f",
    claimedTopic: "0xf0f69f9e2ee7cb1d092c923008e795077ffd8228496080084f26fb6802e20829",
    lockedParts: [0],
    claimedParts: [1],
    feeParts: [2],
  },
};
const ATLAS_PARTNER_STATUS_TABLE = [
  { status: "Start", personal: 10, firstLine: 0, structure: 0, rewardPermille: 150, matchingPermille: 0 },
  { status: "Builder 1", personal: 50, firstLine: 100, structure: 0, rewardPermille: 180, matchingPermille: 0 },
  { status: "Builder 2", personal: 100, firstLine: 300, structure: 1000, rewardPermille: 210, matchingPermille: 0 },
  { status: "Builder 3", personal: 200, firstLine: 700, structure: 2000, rewardPermille: 240, matchingPermille: 0 },
  { status: "Builder 4", personal: 300, firstLine: 1200, structure: 4000, rewardPermille: 270, matchingPermille: 0 },
  { status: "Builder 5", personal: 500, firstLine: 2000, structure: 7000, rewardPermille: 300, matchingPermille: 0 },
  { status: "Builder 6", personal: 700, firstLine: 3000, structure: 12000, rewardPermille: 330, matchingPermille: 0 },
  { status: "Builder 7", personal: 1000, firstLine: 4500, structure: 18000, rewardPermille: 360, matchingPermille: 0 },
  { status: "Master 1", personal: 1500, firstLine: 7000, structure: 28000, rewardPermille: 380, matchingPermille: 50 },
  { status: "Master 2", personal: 2000, firstLine: 10000, structure: 40000, rewardPermille: 400, matchingPermille: 70 },
  { status: "Master 3", personal: 3000, firstLine: 17000, structure: 70000, rewardPermille: 420, matchingPermille: 90 },
  { status: "Master 4", personal: 4000, firstLine: 25000, structure: 120000, rewardPermille: 440, matchingPermille: 110 },
  { status: "Master 5", personal: 5000, firstLine: 35000, structure: 200000, rewardPermille: 460, matchingPermille: 130 },
  { status: "Master 6", personal: 6000, firstLine: 45000, structure: 300000, rewardPermille: 480, matchingPermille: 150 },
  { status: "Master 7", personal: 7000, firstLine: 60000, structure: 450000, rewardPermille: 500, matchingPermille: 170 },
  { status: "Strategist", personal: 8000, firstLine: 80000, structure: 600000, rewardPermille: 525, matchingPermille: 190 },
  { status: "Ambassador", personal: 10000, firstLine: 100000, structure: 800000, rewardPermille: 550, matchingPermille: 210 },
  { status: "Director", personal: 12000, firstLine: 120000, structure: 1100000, rewardPermille: 575, matchingPermille: 230 },
  { status: "Executive", personal: 15000, firstLine: 150000, structure: 1500000, rewardPermille: 600, matchingPermille: 250 },
];
const ATLAS_DAILY_REWARD_RATE_BPS_BY_TIER = {
  0: 110,
  1: 130,
};
const ATLAS_LOCKUP_TIER_NAMES = ["Contract Test", "Launch", "Momentum", "Premiere", "President", "Imperium"];
const ATLAS_DAILY_TIER_NAMES = ["Core", "Elite"];
const ATLAS_DAY_SECONDS = 24 * 60 * 60;
const ATLAS_DAILY_REWARD_DAYS = 200n;
const ATLAS_DAILY_PARTNER_IMMEDIATE_PERMILLE = 300n;
const ATLAS_PLATFORM_COMMISSION_PERMILLE = 100n;
const ATLAS_FLOW_CACHE_MS = Math.max(15000, Number(process.env.ATLAS_FLOW_CACHE_MS || 120000));
const ATLAS_FLOW_RECEIPT_CONCURRENCY = Math.max(1, Math.min(10, Number(process.env.ATLAS_FLOW_RECEIPT_CONCURRENCY || 4)));
const ATLAS_FLOW_DAY_OFFSET_HOURS = Number(process.env.ATLAS_FLOW_DAY_OFFSET_HOURS || 3);
let atlasFlowCache = null;

let telegramEnvCache = null;
let marketingSessionMutationQueue = Promise.resolve();
let financeSessionMutationQueue = Promise.resolve();
let expenseCenterMutationQueue = Promise.resolve();
const financeLoginAttempts = new Map();
const marketingLoginAttempts = new Map();
const hermesAssistantRequests = new Map();
const hermesSpeechRequests = new Map();
const hermesTranscriptionRequests = new Map();

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

function sendAudio(response, audio, contentType = "audio/wav") {
  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": audio.length,
    "Cache-Control": "private, max-age=300",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(audio);
}

function parseCookies(request) {
  return String(request.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separator = part.indexOf("=");
      if (separator <= 0) return cookies;
      const rawValue = part.slice(separator + 1);
      try {
        cookies[part.slice(0, separator)] = decodeURIComponent(rawValue);
      } catch {
        cookies[part.slice(0, separator)] = rawValue;
      }
      return cookies;
    }, {});
}

function hashMarketingSession(token = "") {
  return createHash("sha256").update(String(token)).digest("hex");
}

function secureTextEqual(supplied = "", expected = "") {
  const suppliedHash = createHash("sha256").update(String(supplied)).digest();
  const expectedHash = createHash("sha256").update(String(expected)).digest();
  return timingSafeEqual(suppliedHash, expectedHash);
}

function getFinanceLoginKey(request) {
  const realIp = String(request.headers["x-real-ip"] || "").trim();
  const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return realIp || forwarded || request.socket?.remoteAddress || "unknown";
}

function getFinanceLoginAttempt(request) {
  let key = getFinanceLoginKey(request);
  const now = Date.now();
  if (financeLoginAttempts.size >= FINANCE_LOGIN_MAX_BUCKETS) {
    for (const [storedKey, storedAttempt] of financeLoginAttempts) {
      if (storedAttempt.resetAt <= now) financeLoginAttempts.delete(storedKey);
    }
  }
  if (!financeLoginAttempts.has(key) && financeLoginAttempts.size >= FINANCE_LOGIN_MAX_BUCKETS) {
    key = "overflow";
  }
  const current = financeLoginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 0, resetAt: now + FINANCE_LOGIN_WINDOW_MS };
    financeLoginAttempts.set(key, next);
    return { key, attempt: next };
  }
  return { key, attempt: current };
}

function getMarketingLoginAttempt(request) {
  let key = getFinanceLoginKey(request);
  const now = Date.now();
  if (marketingLoginAttempts.size >= MARKETING_LOGIN_MAX_BUCKETS) {
    for (const [storedKey, storedAttempt] of marketingLoginAttempts) {
      if (storedAttempt.resetAt <= now) marketingLoginAttempts.delete(storedKey);
    }
  }
  if (!marketingLoginAttempts.has(key) && marketingLoginAttempts.size >= MARKETING_LOGIN_MAX_BUCKETS) {
    key = "overflow";
  }
  const current = marketingLoginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 0, resetAt: now + MARKETING_LOGIN_WINDOW_MS };
    marketingLoginAttempts.set(key, next);
    return { key, attempt: next };
  }
  return { key, attempt: current };
}

function hasInternalMonitorAccess(request) {
  const expected = String(process.env.ATLAS_INTERNAL_MONITOR_TOKEN || "").trim();
  const supplied = String(request.headers["x-atlas-internal-token"] || "").trim();
  return Boolean(expected && supplied && supplied === expected);
}

function getContentKey(url) {
  const match = url.pathname.match(/^\/api\/content\/([a-zA-Z0-9._-]+)$/);
  return match?.[1] || "";
}

async function readEnvFile(filePath) {
  const env = {};
  try {
    const raw = await readFile(filePath, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) return;
      env[match[1]] = match[2].replace(/^['"]|['"]$/g, "").trim();
    });
  } catch {
    // Optional env files are allowed to be absent.
  }

  return env;
}

async function readTelegramEnv() {
  if (telegramEnvCache) return telegramEnvCache;

  const [telegramEnv, outreachEnv] = await Promise.all([
    readEnvFile(TELEGRAM_ENV_FILE),
    readEnvFile(OUTREACH_ENV_FILE),
  ]);
  const env = { ...telegramEnv, ...outreachEnv };

  telegramEnvCache = env;
  return env;
}

async function getTelegramConfig() {
  const fileEnv = await readTelegramEnv();
  const token = process.env.TELEGRAM_BOT_TOKEN || fileEnv.TELEGRAM_BOT_TOKEN || "";
  const targetChatIds = [...new Set((process.env.TELEGRAM_PUSH_CHAT_ID
    || fileEnv.TELEGRAM_PUSH_CHAT_ID
    || process.env.TELEGRAM_PUSH_CHAT_IDS
    || fileEnv.TELEGRAM_PUSH_CHAT_IDS
    || process.env.TELEGRAM_ALLOWED_CHAT_IDS
    || fileEnv.TELEGRAM_ALLOWED_CHAT_IDS
    || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean))];

  return { token, targetChatIds };
}

function getHermesAssistantRateLimit(request) {
  const now = Date.now();
  const key = String(request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
  const current = hermesAssistantRequests.get(key);
  if (!current || current.resetAt <= now) {
    if (hermesAssistantRequests.size > 1000) {
      for (const [storedKey, value] of hermesAssistantRequests) {
        if (value.resetAt <= now) hermesAssistantRequests.delete(storedKey);
      }
    }
    const next = { count: 1, resetAt: now + HERMES_ASSISTANT_WINDOW_MS };
    hermesAssistantRequests.set(key, next);
    return { allowed: true, retryAfter: 0 };
  }

  current.count += 1;
  if (current.count > HERMES_ASSISTANT_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfter: 0 };
}

function getHermesSpeechRateLimit(request) {
  const now = Date.now();
  const key = String(request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
  const current = hermesSpeechRequests.get(key);
  if (!current || current.resetAt <= now) {
    if (hermesSpeechRequests.size > 1000) {
      for (const [storedKey, value] of hermesSpeechRequests) {
        if (value.resetAt <= now) hermesSpeechRequests.delete(storedKey);
      }
    }
    hermesSpeechRequests.set(key, { count: 1, resetAt: now + HERMES_ASSISTANT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  current.count += 1;
  if (current.count > HERMES_SPEECH_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfter: 0 };
}

function getHermesTranscriptionRateLimit(request) {
  const now = Date.now();
  const key = String(request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
  const current = hermesTranscriptionRequests.get(key);
  if (!current || current.resetAt <= now) {
    if (hermesTranscriptionRequests.size > 1000) {
      for (const [storedKey, value] of hermesTranscriptionRequests) {
        if (value.resetAt <= now) hermesTranscriptionRequests.delete(storedKey);
      }
    }
    hermesTranscriptionRequests.set(key, { count: 1, resetAt: now + HERMES_ASSISTANT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  current.count += 1;
  if (current.count > HERMES_TRANSCRIPTION_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfter: 0 };
}

async function getHermesAssistantConfig() {
  const fileEnv = await readTelegramEnv();
  const bridgeUrl = String(process.env.HERMES_BRIDGE_URL || fileEnv.HERMES_BRIDGE_URL || "").trim();
  const bridgeToken = String(process.env.HERMES_BRIDGE_TOKEN || fileEnv.HERMES_BRIDGE_TOKEN || "").trim();
  return { bridgeUrl, bridgeToken };
}

function getHermesHealthUrl(bridgeUrl) {
  try {
    const value = new URL(bridgeUrl);
    value.pathname = value.pathname.replace(/\/message\/?$/, "/health");
    return value.toString();
  } catch {
    return "";
  }
}

async function checkHermesAssistantHealth() {
  const { bridgeUrl, bridgeToken } = await getHermesAssistantConfig();
  const healthUrl = getHermesHealthUrl(bridgeUrl);
  if (!healthUrl || !bridgeToken) return { online: false };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const startedAt = Date.now();
  try {
    const response = await fetch(healthUrl, {
      headers: { Authorization: `Bearer ${bridgeToken}`, Accept: "application/json" },
      signal: controller.signal,
    });
    return { online: response.ok, latencyMs: Date.now() - startedAt };
  } catch {
    return { online: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function askHermesAssistant(prompt) {
  const { bridgeUrl, bridgeToken } = await getHermesAssistantConfig();
  if (!bridgeUrl || !bridgeToken) {
    return { ok: false, status: 503, error: "hermes_not_configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HERMES_ASSISTANT_TIMEOUT_MS);
  try {
    const response = await fetch(bridgeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bridgeToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        memoryScope: "global",
        source: {
          chatId: "supersus-hermes-assistant",
          chatTitle: "SuperSUS — Личный помощник",
          authorName: "Digitex",
          rawText: prompt,
          receivedAt: new Date().toISOString(),
        },
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Hermes assistant bridge error:", response.status, String(payload?.error || "hermes_failed").slice(-500));
      return { ok: false, status: response.status || 502, error: response.status === 504 ? "hermes_timeout" : "hermes_failed" };
    }
    return { ok: true, answer: String(payload?.answer || "").trim() };
  } catch (error) {
    if (error?.name === "AbortError") return { ok: false, status: 504, error: "hermes_timeout" };
    return { ok: false, status: 502, error: "hermes_unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}

async function getYouTrackTelegramChatId() {
  const fileEnv = await readTelegramEnv();
  const value = process.env.ATLAS_YOUTRACK_TELEGRAM_CHAT_ID
    || fileEnv.ATLAS_YOUTRACK_TELEGRAM_CHAT_ID
    || process.env.TELEGRAM_PUSH_CHAT_ID
    || fileEnv.TELEGRAM_PUSH_CHAT_ID
    || YOUTRACK_DEFAULT_TELEGRAM_CHAT_ID;
  return value.split(",").map((item) => item.trim()).filter(Boolean)[0] || YOUTRACK_DEFAULT_TELEGRAM_CHAT_ID;
}

async function getMarketingTelegramChatId() {
  const marketingBinding = await readContent(MARKETING_TELEGRAM_BINDING_KEY, {});
  const value = marketingBinding?.chatId || "";
  return value.split(",").map((item) => item.trim()).filter(Boolean)[0] || "";
}

function normalizeTelegramValue(value = "") {
  return String(value || "").trim();
}

function escapeTelegramHtml(value = "") {
  return normalizeTelegramValue(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTelegramSubtaskPush({ task = {}, subtask = {} }) {
  const responsible = escapeTelegramHtml(subtask.responsible || subtask.assignee || "Не назначен");
  const taskTitle = escapeTelegramHtml(task.title || "Без названия");
  const subtaskTitle = escapeTelegramHtml(subtask.title || "Без названия");
  const status = escapeTelegramHtml(subtask.status || "В работе");
  const priority = escapeTelegramHtml(subtask.priority || "Средний");
  const deadline = escapeTelegramHtml(subtask.deadline || "");
  const lines = [
    "🟠 <b>ATLAS TASK PUSH</b>",
    "━━━━━━━━━━━━━━━━",
    "",
    `👤 <b>${responsible}</b>`,
    "",
    `📌 <b>Задача</b>\n${taskTitle}`,
    "",
    `🎯 <b>Подзадача</b>\n${subtaskTitle}`,
    "",
    `📍 <b>Статус:</b> ${status}`,
    `⚡ <b>Приоритет:</b> ${priority}`,
  ];

  if (deadline) lines.push(`⏰ <b>Дедлайн:</b> ${deadline}`);

  lines.push("", "💬 <i>Проверьте задачу и отпишитесь по статусу.</i>");
  return lines.join("\n");
}

function normalizeEmailValue(value = "") {
  return String(value || "").trim();
}

function isProbablyEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmailValue(value));
}

function sanitizeEmailText(value = "", maxLength = 6000) {
  return normalizeEmailValue(value).slice(0, maxLength);
}

function normalizeHandle(value = "") {
  const raw = String(value || "").trim();
  const fromUrl = raw.match(/t\.me\/(?:s\/)?([a-zA-Z0-9_]{5,})/)?.[1] || "";
  const fromAt = raw.match(/@([a-zA-Z0-9_]{5,})/)?.[1] || "";
  return (fromUrl || fromAt || raw.replace(/^@/, "").trim()).replace(/[^a-zA-Z0-9_]/g, "");
}

function numberValue(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function stringValue(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function extractPublicContacts(...values) {
  const text = values.map((value) => String(value || "")).join("\n");
  const handles = [...new Set((text.match(/@[a-zA-Z0-9_]{5,}/g) || [])
    .filter((handle) => !["@durov", "@telegram"].includes(handle.toLowerCase())))];
  const emails = [...new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])];
  return [...handles, ...emails].slice(0, 4).join(", ");
}

function toIsoDate(value) {
  if (!value) return "";
  if (typeof value === "number") return new Date(value * (value > 100000000000 ? 1 : 1000)).toISOString().slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function buildChannelQuality({ members = 0, avgViews = 0, er = 0, lastPostDate = "", hasContact = false, found = false }) {
  if (!found) return { status: "Не найден", aliveScore: 35, fitScore: 45 };

  const viewsRatio = members ? (avgViews / members) * 100 : er;
  const daysSincePost = lastPostDate ? Math.max(0, Math.round((Date.now() - new Date(lastPostDate).getTime()) / 86400000)) : 999;
  let aliveScore = 52;
  if (members >= 1000) aliveScore += 8;
  if (members >= 10000) aliveScore += 8;
  if (avgViews >= 500) aliveScore += 10;
  if (avgViews >= 2000) aliveScore += 8;
  if (viewsRatio >= 5) aliveScore += 8;
  if (viewsRatio >= 15) aliveScore += 6;
  if (daysSincePost <= 3) aliveScore += 10;
  if (daysSincePost > 30) aliveScore -= 18;
  if (hasContact) aliveScore += 4;

  aliveScore = Math.max(30, Math.min(96, Math.round(aliveScore)));
  return {
    status: aliveScore >= 78 ? "Подтверждён" : aliveScore >= 58 ? "Частично проверен" : "Сомнительный",
    aliveScore,
    fitScore: Math.max(50, Math.min(94, Math.round(aliveScore + (hasContact ? 2 : -4)))),
  };
}

function summarizeVerification(source, details = {}) {
  const parts = [source];
  if (details.members) parts.push(`подписчики: ${details.members}`);
  if (details.avgViews) parts.push(`ср. просмотры: ${details.avgViews}`);
  if (details.er) parts.push(`ER/ERR: ${details.er}%`);
  if (details.lastPostDate) parts.push(`последний пост: ${details.lastPostDate}`);
  if (details.adsIndex) parts.push(`ads index: ${details.adsIndex}`);
  if (details.contact) parts.push(`контакт: ${details.contact}`);
  return parts.join(" · ");
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, payload };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTextWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const payload = await response.text();
    return { ok: response.ok, status: response.status, payload };
  } finally {
    clearTimeout(timeout);
  }
}

function getYouTrackConfig() {
  const baseUrl = (process.env.ATLAS_YOUTRACK_URL || process.env.YOUTRACK_URL || "").trim().replace(/\/+$/, "");
  const login = (process.env.ATLAS_YOUTRACK_LOGIN || process.env.YOUTRACK_LOGIN || "").trim();
  const password = (process.env.ATLAS_YOUTRACK_PASSWORD || process.env.YOUTRACK_PASSWORD || "").trim();
  const token = (process.env.ATLAS_YOUTRACK_TOKEN || process.env.YOUTRACK_TOKEN || "").trim();
  const project = (process.env.ATLAS_YOUTRACK_PROJECT || "ATL").trim();
  return { baseUrl, login, password, token, project };
}

function getYouTrackAuthHeaders(config) {
  if (config.token) return { Authorization: `Bearer ${config.token}` };
  if (config.login && config.password) {
    return { Authorization: `Basic ${Buffer.from(`${config.login}:${config.password}`).toString("base64")}` };
  }
  return {};
}

function toMillis(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return number < 100000000000 ? number * 1000 : number;
}

function formatDurationRu(ms = 0) {
  const safeMs = Math.max(0, Number(ms) || 0);
  const minutes = Math.floor(safeMs / 60000);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} ч`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${days} д`;
  return `${Math.floor(days / 30)} мес`;
}

function stringifyYouTrackValue(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.map(stringifyYouTrackValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return value.name || value.presentation || value.fullName || value.login || value.text || "";
  }
  return String(value);
}

function getYouTrackField(issue = {}, names = []) {
  const wanted = names.map((name) => name.toLowerCase());
  const field = (issue.customFields || []).find((item) => wanted.includes(String(item?.name || "").toLowerCase()));
  return stringifyYouTrackValue(field?.value);
}

function normalizeYouTrackComment(comment = {}) {
  const safeComment = comment || {};
  const createdAtMs = toMillis(safeComment.created);
  const updatedAtMs = toMillis(safeComment.updated || safeComment.created);
  return {
    id: safeComment.id || `${createdAtMs}-${safeComment.author?.login || "user"}`,
    text: String(safeComment.text || "").trim(),
    createdAt: createdAtMs ? new Date(createdAtMs).toISOString() : "",
    updatedAt: updatedAtMs ? new Date(updatedAtMs).toISOString() : "",
    createdAtMs,
    updatedAtMs,
    author: safeComment.author?.fullName || safeComment.author?.login || "Unknown",
    authorLogin: safeComment.author?.login || "",
  };
}

function commentLooksActionable(comment = {}, issue = {}) {
  const safeComment = comment || {};
  const status = String(issue.status || "").toLowerCase();
  const text = String(safeComment.text || "").toLowerCase();
  if (status.includes("уточ") || status.includes("question") || status.includes("clarification")) return true;
  return /(\?|нужно|проверь|уточн|ответ|коммент|comment|question|clarify|please|надо)/i.test(text);
}

function normalizeYouTrackIssue(issue = {}, statusSinceMs = 0) {
  const config = getYouTrackConfig();
  const createdAtMs = toMillis(issue.created);
  const updatedAtMs = toMillis(issue.updated);
  const resolvedAtMs = toMillis(issue.resolved);
  const comments = (issue.comments || []).map(normalizeYouTrackComment).sort((a, b) => b.createdAtMs - a.createdAtMs);
  const latestComment = comments[0] || null;
  const status = getYouTrackField(issue, ["State", "Состояние"]) || (resolvedAtMs ? "Done" : "Unknown");
  const priority = getYouTrackField(issue, ["Priority", "Приоритет"]) || "Normal";
  const assignee = getYouTrackField(issue, ["Assignee", "Исполнитель"]) || "Unassigned";
  const dueDate = getYouTrackField(issue, ["Due Date", "Дата выполнения", "Срок"]) || "";
  const now = Date.now();
  const activeSinceMs = statusSinceMs || updatedAtMs || createdAtMs || now;
  const needsAttention = commentLooksActionable(latestComment, { status }) || /show-stopper|critical|blocker/i.test(priority);

  return {
    id: issue.idReadable || issue.id || "",
    title: String(issue.summary || "Без названия").trim(),
    url: config.baseUrl ? `${config.baseUrl}/issue/${issue.idReadable || issue.id || ""}` : "",
    project: issue.project?.shortName || config.project || "ATL",
    status,
    priority,
    assignee,
    dueDate,
    tags: (issue.tags || []).map((tag) => tag.name).filter(Boolean),
    createdAt: createdAtMs ? new Date(createdAtMs).toISOString() : "",
    updatedAt: updatedAtMs ? new Date(updatedAtMs).toISOString() : "",
    resolvedAt: resolvedAtMs ? new Date(resolvedAtMs).toISOString() : "",
    createdAtMs,
    updatedAtMs,
    resolvedAtMs,
    ageMs: now - (createdAtMs || now),
    inactiveMs: now - (updatedAtMs || now),
    statusSinceMs: activeSinceMs,
    statusAgeMs: now - activeSinceMs,
    ageLabel: formatDurationRu(now - (createdAtMs || now)),
    inactiveLabel: formatDurationRu(now - (updatedAtMs || now)),
    statusAgeLabel: formatDurationRu(now - activeSinceMs),
    commentsCount: comments.length,
    latestComment,
    needsAttention,
    isResolved: Boolean(resolvedAtMs) || /done|fixed|closed|resolved|готов|закрыт/i.test(status),
  };
}

function getIssueSignature(issue = {}) {
  return {
    status: issue.status || "",
    priority: issue.priority || "",
    assignee: issue.assignee || "",
    updatedAtMs: issue.updatedAtMs || 0,
    commentsCount: issue.commentsCount || 0,
    latestCommentId: issue.latestComment?.id || "",
    latestCommentText: issue.latestComment?.text || "",
  };
}

async function fetchYouTrackJson(pathname, params = {}) {
  const config = getYouTrackConfig();
  if (!config.baseUrl || (!config.token && (!config.login || !config.password))) {
    return { ok: false, status: 503, error: "youtrack_not_configured" };
  }

  const url = new URL(`${config.baseUrl}${pathname}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...getYouTrackAuthHeaders(config),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: response.status, error: payload?.error_description || payload?.error || "youtrack_request_failed" };
  }
  return { ok: true, status: response.status, payload };
}

async function getIssueStatusSinceMs(issueId) {
  if (!issueId) return 0;
  const result = await fetchYouTrackJson(`/api/issues/${encodeURIComponent(issueId)}/activities`, {
    categories: "CustomFieldCategory",
    fields: "id,timestamp,field(name),added(name,presentation),removed(name,presentation)",
  });
  if (!result.ok || !Array.isArray(result.payload)) return 0;
  const stateChanges = result.payload
    .filter((item) => /state|состояние/i.test(item?.field?.name || ""))
    .sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp));
  return toMillis(stateChanges[0]?.timestamp);
}

async function getYouTrackIssues({ query = "", top = 50 } = {}) {
  const config = getYouTrackConfig();
  const searchQuery = query || `project: ${config.project}`;
  const result = await fetchYouTrackJson("/api/issues", {
    query: searchQuery,
    fields: YOUTRACK_DEFAULT_FIELDS,
    $top: String(Math.max(1, Math.min(Number(top) || 50, 100))),
  });
  if (!result.ok) return result;

  const rawIssues = Array.isArray(result.payload) ? result.payload : [];
  const statusTimes = await Promise.all(rawIssues.slice(0, 50).map((issue) => getIssueStatusSinceMs(issue.idReadable || issue.id || "")));
  const issues = rawIssues.map((issue, index) => normalizeYouTrackIssue(issue, statusTimes[index] || 0));
  const openIssues = issues.filter((issue) => !issue.isResolved);
  const attentionIssues = issues.filter((issue) => issue.needsAttention && !issue.isResolved);
  const staleIssues = openIssues.filter((issue) => issue.inactiveMs >= 24 * 60 * 60 * 1000);
  const showStoppers = openIssues.filter((issue) => /show-stopper|critical|blocker/i.test(issue.priority));

  return {
    ok: true,
    status: 200,
    lastCheckedAt: new Date().toISOString(),
    query: searchQuery,
    issues,
    summary: {
      total: issues.length,
      open: openIssues.length,
      done: issues.length - openIssues.length,
      attention: attentionIssues.length,
      stale: staleIssues.length,
      showStoppers: showStoppers.length,
    },
  };
}

function buildYouTrackChanges(previous = {}, issues = []) {
  const previousIssues = previous?.issues || {};
  const changes = [];
  for (const issue of issues) {
    const before = previousIssues[issue.id];
    const current = getIssueSignature(issue);
    if (!before) {
      changes.push({ type: "new", issue, message: `Новая задача ${issue.id}: ${issue.title}` });
      continue;
    }
    if (before.status !== current.status) {
      changes.push({ type: "status", issue, before: before.status, after: current.status, message: `${issue.id}: статус ${before.status || "—"} → ${current.status || "—"}` });
    }
    if (before.assignee !== current.assignee) {
      changes.push({ type: "assignee", issue, before: before.assignee, after: current.assignee, message: `${issue.id}: исполнитель ${before.assignee || "—"} → ${current.assignee || "—"}` });
    }
    if ((before.commentsCount || 0) < current.commentsCount || before.latestCommentId !== current.latestCommentId) {
      changes.push({ type: "comment", issue, message: `${issue.id}: новый комментарий от ${issue.latestComment?.author || "участника"}` });
    }
  }
  return changes;
}

function formatYouTrackChangePush(changes = []) {
  const lines = ["🧭 <b>ATLAS TASK MONITOR</b>", "━━━━━━━━━━━━━━━━", ""];
  changes.slice(0, 8).forEach((change) => {
    const issue = change.issue || {};
    lines.push(`📌 <b>${escapeTelegramHtml(issue.id || "Issue")}</b> — ${escapeTelegramHtml(issue.title || "")}`);
    lines.push(`🔁 ${escapeTelegramHtml(change.message || "Изменение")}`);
    lines.push(`📍 ${escapeTelegramHtml(issue.status || "—")} · 👤 ${escapeTelegramHtml(issue.assignee || "—")} · ⏱ ${escapeTelegramHtml(issue.statusAgeLabel || "—")}`);
    if (issue.latestComment?.text) lines.push(`💬 ${escapeTelegramHtml(issue.latestComment.text).slice(0, 260)}`);
    if (issue.url) lines.push(`🔗 ${escapeTelegramHtml(issue.url)}`);
    lines.push("");
  });
  if (changes.length > 8) lines.push(`Ещё изменений: ${changes.length - 8}`);
  return lines.join("\n").trim();
}

function getYouTrackDigestSignature(summary = {}, issues = []) {
  const attentionIds = issues.filter((issue) => issue.needsAttention && !issue.isResolved).map((issue) => issue.id).sort();
  const showStopperIds = issues.filter((issue) => /show-stopper|critical|blocker/i.test(issue.priority) && !issue.isResolved).map((issue) => issue.id).sort();
  const staleIds = issues.filter((issue) => issue.inactiveMs >= 24 * 60 * 60 * 1000 && !issue.isResolved).map((issue) => issue.id).sort();
  return JSON.stringify({
    total: summary.total || 0,
    open: summary.open || 0,
    done: summary.done || 0,
    attention: attentionIds,
    showStoppers: showStopperIds,
    stale: staleIds,
  });
}

function formatIssueDigestLine(issue = {}) {
  const parts = [
    `• <b>${escapeTelegramHtml(issue.id || "Issue")}</b>`,
    escapeTelegramHtml(issue.title || "Без названия"),
  ];
  const meta = [
    issue.status ? `статус: ${escapeTelegramHtml(issue.status)}` : "",
    issue.assignee ? `исп.: ${escapeTelegramHtml(issue.assignee)}` : "",
    issue.statusAgeLabel ? `в статусе ${escapeTelegramHtml(issue.statusAgeLabel)}` : "",
  ].filter(Boolean).join(" · ");
  return `${parts.join(" — ")}\n  ${meta}${issue.url ? `\n  ${escapeTelegramHtml(issue.url)}` : ""}`;
}

function formatYouTrackDigestPush({ summary = {}, issues = [], changes = [], unchanged = false } = {}) {
  const attentionIssues = issues
    .filter((issue) => issue.needsAttention && !issue.isResolved)
    .sort((a, b) => Number(/show-stopper|critical|blocker/i.test(b.priority)) - Number(/show-stopper|critical|blocker/i.test(a.priority)) || b.statusAgeMs - a.statusAgeMs);
  const showStoppers = issues.filter((issue) => /show-stopper|critical|blocker/i.test(issue.priority) && !issue.isResolved);
  const staleIssues = issues
    .filter((issue) => issue.inactiveMs >= 24 * 60 * 60 * 1000 && !issue.isResolved)
    .sort((a, b) => b.inactiveMs - a.inactiveMs);

  const lines = [
    "🧭 <b>ATL TASK DIGEST / 30 мин</b>",
    "━━━━━━━━━━━━━━━━",
    `📊 Всего: <b>${summary.total || 0}</b> · открыто: <b>${summary.open || 0}</b> · готово: <b>${summary.done || 0}</b>`,
    `🔥 Нужен ответ: <b>${summary.attention || 0}</b> · Show-stopper: <b>${summary.showStoppers || 0}</b> · зависли 24ч+: <b>${summary.stale || 0}</b>`,
  ];

  if (changes.length) {
    lines.push("", "🔁 <b>Изменения с прошлого среза</b>");
    changes.slice(0, 5).forEach((change) => lines.push(`• ${escapeTelegramHtml(change.message || "Изменение")}`));
    if (changes.length > 5) lines.push(`• ещё изменений: ${changes.length - 5}`);
  } else if (unchanged) {
    lines.push("", "✅ Новых изменений с прошлого дайджеста нет.");
  }

  if (attentionIssues.length) {
    lines.push("", "💬 <b>Ответить/проверить в первую очередь</b>");
    attentionIssues.slice(0, 5).forEach((issue) => lines.push(formatIssueDigestLine(issue)));
  }

  const attentionIds = new Set(attentionIssues.map((issue) => issue.id));
  const extraShowStoppers = showStoppers.filter((issue) => !attentionIds.has(issue.id));
  if (extraShowStoppers.length) {
    lines.push("", "🚨 <b>Show-stopper без отдельного блока ответа</b>");
    extraShowStoppers.slice(0, 4).forEach((issue) => lines.push(formatIssueDigestLine(issue)));
  }

  const staleOutsideAttention = staleIssues.filter((issue) => !attentionIds.has(issue.id)).slice(0, 4);
  if (staleOutsideAttention.length) {
    lines.push("", "⏳ <b>Зависшие 24ч+</b>");
    staleOutsideAttention.forEach((issue) => lines.push(formatIssueDigestLine(issue)));
  }

  lines.push("", "🔎 SuperSUS → ATL-монитор");
  return lines.join("\n").trim();
}

async function checkYouTrackChanges({ notify = true } = {}) {
  const result = await getYouTrackIssues();
  if (!result.ok) return result;
  const previous = await readContent(YOUTRACK_SNAPSHOT_KEY, { issues: {} });
  const isFirstSnapshot = !previous?.issues || !Object.keys(previous.issues).length;
  const changes = isFirstSnapshot ? [] : buildYouTrackChanges(previous, result.issues);
  const nextSnapshot = {
    checkedAt: result.lastCheckedAt,
    issues: Object.fromEntries(result.issues.map((issue) => [issue.id, getIssueSignature(issue)])),
  };
  await writeContent(YOUTRACK_SNAPSHOT_KEY, nextSnapshot);

  let notification = { ok: true, skipped: true };
  if (notify && changes.length) {
    notification = await sendTelegramMessage(
      formatYouTrackChangePush(changes),
      { parse_mode: "HTML" },
      await getYouTrackTelegramChatId(),
    );
  }

  return { ...result, changes, notification, bootstrapped: isFirstSnapshot };
}

async function sendYouTrackDigest({ notify = true, force = false } = {}) {
  const result = await getYouTrackIssues();
  if (!result.ok) return result;

  const previous = await readContent(YOUTRACK_DIGEST_SNAPSHOT_KEY, { issues: {}, signature: "" });
  const isFirstSnapshot = !previous?.issues || !Object.keys(previous.issues).length;
  const changes = isFirstSnapshot ? [] : buildYouTrackChanges(previous, result.issues);
  const signature = getYouTrackDigestSignature(result.summary, result.issues);
  const unchanged = previous?.signature === signature && changes.length === 0;
  const nextSnapshot = {
    checkedAt: result.lastCheckedAt,
    signature,
    issues: Object.fromEntries(result.issues.map((issue) => [issue.id, getIssueSignature(issue)])),
  };
  await writeContent(YOUTRACK_DIGEST_SNAPSHOT_KEY, nextSnapshot);

  let notification = { ok: true, skipped: true };
  if (notify && (force || !isFirstSnapshot || result.summary?.attention || result.summary?.showStoppers || changes.length)) {
    notification = await sendTelegramMessage(
      formatYouTrackDigestPush({ ...result, changes, unchanged }),
      { parse_mode: "HTML" },
      await getYouTrackTelegramChatId(),
    );
  }

  return { ...result, changes, notification, bootstrapped: isFirstSnapshot, digestUnchanged: unchanged };
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function findIncluded(included = [], type = "", id = "") {
  return included.find((item) => item?.type === type && (!id || item.id === id)) || null;
}

function normalizeGeckoPoolPayload(poolPayload = {}, infoPayload = {}) {
  const pool = poolPayload.data || {};
  const attrs = pool.attributes || {};
  const included = Array.isArray(poolPayload.included) ? poolPayload.included : [];
  const baseTokenRef = pool.relationships?.base_token?.data?.id || "";
  const quoteTokenRef = pool.relationships?.quote_token?.data?.id || "";
  const dexRef = pool.relationships?.dex?.data?.id || "";
  const baseToken = findIncluded(included, "token", baseTokenRef)?.attributes || {};
  const quoteToken = findIncluded(included, "token", quoteTokenRef)?.attributes || {};
  const dex = findIncluded(included, "dex", dexRef)?.attributes || {};
  const infoTokens = Array.isArray(infoPayload.data) ? infoPayload.data : [];
  const gtScores = infoTokens.map((item) => toNumber(item.attributes?.gt_score)).filter(Boolean);
  const holderCounts = infoTokens.map((item) => ({
    symbol: item.attributes?.symbol || "",
    holders: toNumber(item.attributes?.holders?.count),
    verified: Boolean(item.attributes?.gt_verified),
    honeypot: Boolean(item.attributes?.is_honeypot),
  }));
  const h24Transactions = attrs.transactions?.h24 || {};
  const h24Buys = toNumber(h24Transactions.buys);
  const h24Sells = toNumber(h24Transactions.sells);
  const h24Txns = h24Buys + h24Sells;
  const baseToQuote = toNumber(attrs.base_token_price_quote_token);
  const quoteToBase = toNumber(attrs.quote_token_price_base_token);
  const parityDeviationPct = baseToQuote ? Math.abs(1 - baseToQuote) * 100 : 0;

  return {
    id: pool.id || "",
    label: PANCAKE_USDT_USDC_POOL.label,
    network: PANCAKE_USDT_USDC_POOL.network,
    address: attrs.address || PANCAKE_USDT_USDC_POOL.address,
    name: attrs.name || "USDT / USDC 0.01%",
    poolName: attrs.pool_name || "USDT / USDC",
    dex: dex.name || "PancakeSwap V3 (BSC)",
    feePercentage: toNumber(attrs.pool_fee_percentage),
    createdAt: attrs.pool_created_at || "",
    reserveUsd: toNumber(attrs.reserve_in_usd),
    volumeUsd: {
      m5: toNumber(attrs.volume_usd?.m5),
      h1: toNumber(attrs.volume_usd?.h1),
      h6: toNumber(attrs.volume_usd?.h6),
      h24: toNumber(attrs.volume_usd?.h24),
    },
    transactions: {
      h24: h24Txns,
      h24Buys,
      h24Sells,
      h1: toNumber(attrs.transactions?.h1?.buys) + toNumber(attrs.transactions?.h1?.sells),
    },
    prices: {
      baseUsd: toNumber(attrs.base_token_price_usd),
      quoteUsd: toNumber(attrs.quote_token_price_usd),
      baseToQuote,
      quoteToBase,
      parityDeviationPct: Number(parityDeviationPct.toFixed(4)),
    },
    priceChangePercentage: attrs.price_change_percentage || {},
    tokens: {
      base: {
        symbol: baseToken.symbol || "USDT",
        name: baseToken.name || "Tether USD",
        address: baseToken.address || "",
        imageUrl: baseToken.image_url || "",
      },
      quote: {
        symbol: quoteToken.symbol || "USDC",
        name: quoteToken.name || "USD Coin",
        address: quoteToken.address || "",
        imageUrl: quoteToken.image_url || "",
      },
    },
    security: {
      gtScore: gtScores.length ? Math.round(gtScores.reduce((sum, score) => sum + score, 0) / gtScores.length) : 0,
      tokens: holderCounts,
    },
    links: {
      geckoTerminal: `https://www.geckoterminal.com/bsc/pools/${PANCAKE_USDT_USDC_POOL.address}`,
      pancakeSwap: `https://pancakeswap.finance/info/v3/pairs/${PANCAKE_USDT_USDC_POOL.address}`,
      bscScan: `https://bscscan.com/address/${PANCAKE_USDT_USDC_POOL.address}`,
      arkham: `https://arkm.com/explorer/address/${PANCAKE_USDT_USDC_POOL.address}`,
    },
    source: "GeckoTerminal public API",
    updatedAt: new Date().toISOString(),
  };
}

async function getPancakePoolSnapshot() {
  const baseUrl = "https://api.geckoterminal.com/api/v2";
  const poolPath = `/networks/${PANCAKE_USDT_USDC_POOL.network}/pools/${PANCAKE_USDT_USDC_POOL.address}`;
  const headers = { Accept: "application/json" };
  const [poolResult, infoResult] = await Promise.all([
    fetchJsonWithTimeout(`${baseUrl}${poolPath}?include=base_token,quote_token,dex`, { headers }),
    fetchJsonWithTimeout(`${baseUrl}${poolPath}/info`, { headers }),
  ]);

  if (!poolResult.ok) {
    return {
      ok: false,
      status: poolResult.status || 502,
      error: poolResult.payload?.errors?.[0]?.title || poolResult.payload?.message || "geckoterminal_pool_fetch_failed",
    };
  }

  return {
    ok: true,
    pool: normalizeGeckoPoolPayload(poolResult.payload, infoResult.ok ? infoResult.payload : {}),
    infoStatus: infoResult.ok ? "ok" : "unavailable",
  };
}

function isHexAddress(value = "") {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || ""));
}

function encodeBalanceOfCall(address = "") {
  if (!isHexAddress(address)) return "";
  return `0x70a08231${address.slice(2).toLowerCase().padStart(64, "0")}`;
}

function addressToTopic(address = "") {
  if (!isHexAddress(address)) return "";
  return `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
}

function topicToAddress(topic = "") {
  const clean = String(topic || "").toLowerCase();
  if (!/^0x[a-f0-9]{64}$/.test(clean)) return "";
  return `0x${clean.slice(-40)}`;
}

function hexToBigInt(value = "0x0") {
  try {
    return BigInt(value || "0x0");
  } catch {
    return 0n;
  }
}

function decimalFromUnits(value, decimals = 18, precision = 6) {
  const rawBigintValue = typeof value === "bigint" ? value : BigInt(value || 0);
  const isNegative = rawBigintValue < 0n;
  const bigintValue = isNegative ? -rawBigintValue : rawBigintValue;
  const divisor = 10n ** BigInt(decimals);
  const whole = bigintValue / divisor;
  const fraction = bigintValue % divisor;
  const fractionText = fraction.toString().padStart(decimals, "0").slice(0, precision);
  return Number(`${isNegative ? "-" : ""}${whole.toString()}.${fractionText || "0"}`);
}

async function callBscRpc(method, params = []) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  });
  let lastError = null;

  for (const rpcUrl of BSC_RPC_URLS) {
    try {
      const result = await fetchJsonWithTimeout(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body,
      }, 10000);

      if (result.ok && !result.payload?.error) {
        return result.payload?.result || "0x0";
      }

      lastError = result.payload?.error?.message || result.payload?.message || `rpc_${result.status || "failed"}`;
    } catch (error) {
      lastError = error?.message || "rpc_request_failed";
    }
  }

  throw new Error(lastError || "bsc_rpc_unavailable");
}

async function callBscLogRpc(method, params = []) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  });
  let lastError = null;

  for (const rpcUrl of BSC_LOG_RPC_URLS) {
    try {
      const result = await fetchJsonWithTimeout(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body,
      }, 30000);

      if (result.ok && !result.payload?.error) {
        return result.payload?.result || [];
      }

      lastError = result.payload?.error?.message || result.payload?.message || `rpc_${result.status || "failed"}`;
    } catch (error) {
      lastError = error?.message || "rpc_request_failed";
    }
  }

  throw new Error(lastError || "bsc_log_rpc_unavailable");
}

async function getAtlasContractBalancesSnapshot() {
  const rows = await Promise.all(ATLAS_CONTRACT_ADDRESSES.map(async (contract) => {
    const [bnbHex, usdtHex] = await Promise.all([
      callBscRpc("eth_getBalance", [contract.address, "latest"]),
      contract.isToken
        ? Promise.resolve("0x0")
        : callBscRpc("eth_call", [{ to: ATLAS_USDT_TOKEN.address, data: encodeBalanceOfCall(contract.address) }, "latest"]),
    ]);
    const bnbRaw = hexToBigInt(bnbHex);
    const usdtRaw = hexToBigInt(usdtHex);

    return {
      ...contract,
      shortAddress: `${contract.address.slice(0, 6)}...${contract.address.slice(-4)}`,
      balances: {
        bnb: decimalFromUnits(bnbRaw, 18, 8),
        bnbRaw: bnbRaw.toString(),
        usdt: decimalFromUnits(usdtRaw, ATLAS_USDT_TOKEN.decimals, 6),
        usdtRaw: usdtRaw.toString(),
      },
      links: {
        bscScan: `https://bscscan.com/address/${contract.address}`,
        arkham: `https://arkm.com/explorer/address/${contract.address}`,
      },
    };
  }));

  const totals = rows.reduce(
    (accumulator, row) => ({
      usdt: accumulator.usdt + (row.balances?.usdt || 0),
      bnb: accumulator.bnb + (row.balances?.bnb || 0),
    }),
    { usdt: 0, bnb: 0 },
  );

  return {
    ok: true,
    network: {
      name: "BNB Smart Chain",
      chainId: 56,
      explorer: "BscScan",
    },
    token: ATLAS_USDT_TOKEN,
    contracts: rows,
    totals,
    source: "BNB Chain RPC",
    rpcCount: BSC_RPC_URLS.length,
    updatedAt: new Date().toISOString(),
  };
}

function buildEmptyAtlasFlowStats(contract) {
  return {
    ...contract,
    shortAddress: `${contract.address.slice(0, 6)}...${contract.address.slice(-4)}`,
    providedRaw: "0",
    claimedRaw: "0",
    feeRaw: "0",
    partnerDeltaRaw: "0",
    lockupDeltaRaw: "0",
    dailyDeltaRaw: "0",
    remainingRaw: "0",
    provided: 0,
    claimed: 0,
    fee: 0,
    partnerDelta: 0,
    lockupDelta: 0,
    dailyDelta: 0,
    remaining: 0,
    lockedEvents: 0,
    claimedEvents: 0,
    receipts: 0,
    failedReceipts: 0,
    links: {
      bscScan: `https://bscscan.com/address/${contract.address}`,
      arkham: `https://arkm.com/explorer/address/${contract.address}`,
    },
  };
}

function getDataWord(data = "0x", index = 0) {
  const clean = String(data || "0x");
  const start = 2 + index * 64;
  const value = clean.slice(start, start + 64);
  return value.length === 64 ? `0x${value}` : "0x0";
}

function sumEventDataWords(data = "0x", indexes = []) {
  return indexes.reduce((sum, index) => sum + hexToBigInt(getDataWord(data, index)), 0n);
}

function getEventOrderId(log = {}) {
  return hexToBigInt(log?.topics?.[1] || "0x0").toString();
}

function getAtlasLockedCycleDetails(contractId = "", data = "0x") {
  if (contractId === "lockup-flow") {
    const lockTime = Number(hexToBigInt(getDataWord(data, 4)));
    const unlockTime = Number(hexToBigInt(getDataWord(data, 5)));
    const tier = Number(hexToBigInt(getDataWord(data, 3)));
    return {
      tier,
      tierName: ATLAS_LOCKUP_TIER_NAMES[tier] || `Tier ${tier}`,
      lockTime,
      unlockTime,
      termSeconds: Math.max(0, unlockTime - lockTime),
      expectedLoadRaw: hexToBigInt(getDataWord(data, 1)),
    };
  }

  if (contractId === "daily-flow") {
    const lockTime = Number(hexToBigInt(getDataWord(data, 2)));
    const tier = Number(hexToBigInt(getDataWord(data, 1)));
    return {
      tier,
      tierName: ATLAS_DAILY_TIER_NAMES[tier] || `Tier ${tier}`,
      lockTime,
      unlockTime: lockTime + Number(ATLAS_DAILY_REWARD_DAYS) * ATLAS_DAY_SECONDS,
      termSeconds: Number(ATLAS_DAILY_REWARD_DAYS) * ATLAS_DAY_SECONDS,
      expectedLoadRaw: getAtlasPartnerDeltaRaw(contractId, data),
    };
  }

  return { tier: 0, tierName: "Unknown", lockTime: 0, unlockTime: 0, termSeconds: 0, expectedLoadRaw: 0n };
}

function formatAtlasTerm(termSeconds = 0) {
  if (termSeconds > 0 && termSeconds < ATLAS_DAY_SECONDS) {
    return `${Math.round(termSeconds / 60)} мин`;
  }
  const days = Math.round(termSeconds / ATLAS_DAY_SECONDS);
  return `${days} дн.`;
}

function createAtlasCycleStatsBucket({ contractId = "", contractName = "", tier = 0, tierName = "", termSeconds = 0 } = {}) {
  return {
    contractId,
    contractName,
    tier,
    tierName,
    termSeconds,
    termLabel: formatAtlasTerm(termSeconds),
    total: 0,
    open: 0,
    claimable: 0,
    closed: 0,
    termEnded: 0,
    totalVolumeRaw: 0n,
    openVolumeRaw: 0n,
    closedVolumeRaw: 0n,
    claimableNowRaw: 0n,
    remainingLoadRaw: 0n,
    next7DaysLoadRaw: 0n,
    next30DaysLoadRaw: 0n,
  };
}

function buildAtlasCycleStats({ eventRows = [], snapshotTimestamp = 0 } = {}) {
  const claimsByCycle = new Map();
  for (const event of eventRows) {
    if (event.type !== "claimed") continue;
    const key = `${event.contractId}:${event.orderId}`;
    const claim = claimsByCycle.get(key) || { events: 0, claimedDays: 0 };
    claim.events += 1;
    claim.claimedDays += event.claimedDays || 0;
    claimsByCycle.set(key, claim);
  }

  const now = Number(snapshotTimestamp || Math.floor(Date.now() / 1000));
  const byTermMap = new Map();
  const totals = createAtlasCycleStatsBucket({ contractId: "all", contractName: "Все потоки", tierName: "Все сроки" });
  const productionTotals = createAtlasCycleStatsBucket({
    contractId: "production",
    contractName: "Рабочие потоки",
    tierName: "Без Contract Test",
  });

  for (const event of eventRows) {
    if (event.type !== "locked") continue;
    const key = `${event.contractId}:${event.orderId}`;
    const claim = claimsByCycle.get(key) || { events: 0, claimedDays: 0 };
    const termKey = `${event.contractId}:${event.tier}:${event.termSeconds}`;
    if (!byTermMap.has(termKey)) {
      byTermMap.set(termKey, createAtlasCycleStatsBucket(event));
    }

    const amountLockedRaw = event.providedRaw || 0n;
    let closed = false;
    let claimable = false;
    let termEnded = now >= event.unlockTime;
    let claimableNowRaw = 0n;
    let remainingLoadRaw = 0n;
    let next7DaysLoadRaw = 0n;
    let next30DaysLoadRaw = 0n;

    if (event.contractId === "lockup-flow") {
      closed = claim.events > 0;
      claimable = !closed && termEnded;
      claimableNowRaw = claimable ? event.expectedLoadRaw : 0n;
      remainingLoadRaw = closed ? 0n : event.expectedLoadRaw;
      if (!closed && !termEnded && event.unlockTime <= now + 7 * ATLAS_DAY_SECONDS) next7DaysLoadRaw = event.expectedLoadRaw;
      if (!closed && !termEnded && event.unlockTime <= now + 30 * ATLAS_DAY_SECONDS) next30DaysLoadRaw = event.expectedLoadRaw;
    } else if (event.contractId === "daily-flow") {
      const claimedDays = Math.min(Number(ATLAS_DAILY_REWARD_DAYS), claim.claimedDays || 0);
      const elapsedDays = Math.max(0, Math.min(Number(ATLAS_DAILY_REWARD_DAYS), Math.floor((now - event.lockTime) / ATLAS_DAY_SECONDS)));
      const dailyRewardRaw = event.expectedLoadRaw / ATLAS_DAILY_REWARD_DAYS;
      const claimableDays = Math.max(0, elapsedDays - claimedDays);
      closed = claimedDays >= Number(ATLAS_DAILY_REWARD_DAYS);
      claimable = !closed && claimableDays > 0;
      claimableNowRaw = dailyRewardRaw * BigInt(claimableDays);
      remainingLoadRaw = closed ? 0n : dailyRewardRaw * BigInt(Number(ATLAS_DAILY_REWARD_DAYS) - claimedDays);

      const accruedDaysIn = (daysAhead) => Math.max(0, Math.min(
        Number(ATLAS_DAILY_REWARD_DAYS),
        Math.floor(((now + daysAhead * ATLAS_DAY_SECONDS) - event.lockTime) / ATLAS_DAY_SECONDS),
      ) - elapsedDays);
      next7DaysLoadRaw = closed ? 0n : dailyRewardRaw * BigInt(accruedDaysIn(7));
      next30DaysLoadRaw = closed ? 0n : dailyRewardRaw * BigInt(accruedDaysIn(30));
    }

    const isContractTest = event.contractId === "lockup-flow" && event.tier === 0;
    const buckets = [byTermMap.get(termKey), totals];
    if (!isContractTest) buckets.push(productionTotals);

    for (const bucket of buckets) {
      bucket.total += 1;
      bucket.totalVolumeRaw += amountLockedRaw;
      if (closed) {
        bucket.closed += 1;
        bucket.closedVolumeRaw += amountLockedRaw;
      } else {
        bucket.open += 1;
        bucket.openVolumeRaw += amountLockedRaw;
      }
      if (claimable) bucket.claimable += 1;
      if (!closed && termEnded) bucket.termEnded += 1;
      bucket.claimableNowRaw += claimableNowRaw;
      bucket.remainingLoadRaw += remainingLoadRaw;
      bucket.next7DaysLoadRaw += next7DaysLoadRaw;
      bucket.next30DaysLoadRaw += next30DaysLoadRaw;
    }
  }

  const serializeBucket = (bucket) => ({
    contractId: bucket.contractId,
    contractName: bucket.contractName,
    tier: bucket.tier,
    tierName: bucket.tierName,
    termSeconds: bucket.termSeconds,
    termLabel: bucket.termLabel,
    total: bucket.total,
    open: bucket.open,
    claimable: bucket.claimable,
    closed: bucket.closed,
    termEnded: bucket.termEnded,
    totalVolume: decimalFromUnits(bucket.totalVolumeRaw, ATLAS_USDT_TOKEN.decimals, 6),
    openVolume: decimalFromUnits(bucket.openVolumeRaw, ATLAS_USDT_TOKEN.decimals, 6),
    closedVolume: decimalFromUnits(bucket.closedVolumeRaw, ATLAS_USDT_TOKEN.decimals, 6),
    claimableNow: decimalFromUnits(bucket.claimableNowRaw, ATLAS_USDT_TOKEN.decimals, 6),
    remainingLoad: decimalFromUnits(bucket.remainingLoadRaw, ATLAS_USDT_TOKEN.decimals, 6),
    next7DaysLoad: decimalFromUnits(bucket.next7DaysLoadRaw, ATLAS_USDT_TOKEN.decimals, 6),
    next30DaysLoad: decimalFromUnits(bucket.next30DaysLoadRaw, ATLAS_USDT_TOKEN.decimals, 6),
  });

  return {
    definitions: {
      open: "Цикл создан и ещё не закрыт полностью.",
      closed: "Lockup: выполнен Claim. Daily: выплачены все 200 расчётных дней.",
      claimable: "Открытый цикл, по которому прямо сейчас доступна сумма к Claim.",
      load: "Расчётная оставшаяся сумма выплат по условиям открытых циклов.",
      production: "Рабочая сводка не включает Contract Test; тестовые события показаны отдельной строкой.",
    },
    totals: serializeBucket(totals),
    productionTotals: serializeBucket(productionTotals),
    byTerm: [...byTermMap.values()]
      .sort((left, right) => left.termSeconds - right.termSeconds || left.tier - right.tier)
      .map(serializeBucket),
    asOf: new Date(now * 1000).toISOString(),
  };
}

function multiplyPermilleRaw(rawValue = 0n, permille = 0) {
  return (BigInt(rawValue || 0) * BigInt(permille || 0)) / 1000n;
}

function getAtlasPartnerDeltaRaw(contractId = "", data = "0x") {
  if (contractId === "lockup-flow") {
    const amountLockedRaw = hexToBigInt(getDataWord(data, 0));
    const amountEarnedRaw = hexToBigInt(getDataWord(data, 1));
    return amountEarnedRaw > amountLockedRaw ? amountEarnedRaw - amountLockedRaw : 0n;
  }

  if (contractId === "daily-flow") {
    const amountLockedRaw = hexToBigInt(getDataWord(data, 0));
    const tier = Number(hexToBigInt(getDataWord(data, 1)));
    const rewardRateBps = BigInt(ATLAS_DAILY_REWARD_RATE_BPS_BY_TIER[tier] || 0);
    return (amountLockedRaw * rewardRateBps * ATLAS_DAILY_REWARD_DAYS) / 10000n;
  }

  return 0n;
}

function buildAtlasPartnerProgramSnapshot({ lockupDeltaRaw = 0n, dailyDeltaRaw = 0n, collectedFeeRaw = 0n, daily = [] } = {}) {
  const totalDeltaRaw = lockupDeltaRaw + dailyDeltaRaw;
  const dailyImmediateDeltaRaw = multiplyPermilleRaw(dailyDeltaRaw, ATLAS_DAILY_PARTNER_IMMEDIATE_PERMILLE);
  const dailyDeferredDeltaRaw = dailyDeltaRaw - dailyImmediateDeltaRaw;
  const executivePermille = ATLAS_PARTNER_STATUS_TABLE.at(-1)?.rewardPermille || 0;
  const maxRewardRaw = multiplyPermilleRaw(totalDeltaRaw, executivePermille);
  const maxImmediateRewardRaw = multiplyPermilleRaw(lockupDeltaRaw + dailyImmediateDeltaRaw, executivePermille);
  const maxDeferredRewardRaw = multiplyPermilleRaw(dailyDeferredDeltaRaw, executivePermille);
  const platformDeltaCommissionRaw = multiplyPermilleRaw(totalDeltaRaw, ATLAS_PLATFORM_COMMISSION_PERMILLE);
  const platformLockupDeltaCommissionRaw = multiplyPermilleRaw(lockupDeltaRaw, ATLAS_PLATFORM_COMMISSION_PERMILLE);
  const platformDailyDeltaCommissionRaw = multiplyPermilleRaw(dailyDeltaRaw, ATLAS_PLATFORM_COMMISSION_PERMILLE);
  const platformMaxPartnerBonusCommissionRaw = multiplyPermilleRaw(maxRewardRaw, ATLAS_PLATFORM_COMMISSION_PERMILLE);
  const platformMaxTotalCommissionRaw = platformDeltaCommissionRaw + platformMaxPartnerBonusCommissionRaw;
  const platformUnclaimedDeltaCommissionRaw = platformDeltaCommissionRaw > collectedFeeRaw
    ? platformDeltaCommissionRaw - collectedFeeRaw
    : 0n;

  return {
    basis: "Расчетная Delta из событий Locked. Фактические начисления по кошелькам требуют referral tree, статусов участников и истории Distribute.",
    limitations: [
      "Не распределяет начисления по конкретным партнерам.",
      "Не учитывает разницу статусов между пригласителем и приглашенным.",
      "Matching Bonus можно показать только как правило статуса, а не как факт начисления.",
      "Daily Flow разделен по правилу 30% сразу и 70% равными частями за 200 дней.",
    ],
    dailyRules: {
      coreDailyPercent: 1.1,
      eliteDailyPercent: 1.3,
      rewardDays: Number(ATLAS_DAILY_REWARD_DAYS),
      immediatePercent: 30,
      deferredPercent: 70,
    },
    totals: {
      lockupDelta: decimalFromUnits(lockupDeltaRaw, ATLAS_USDT_TOKEN.decimals, 6),
      dailyDelta: decimalFromUnits(dailyDeltaRaw, ATLAS_USDT_TOKEN.decimals, 6),
      dailyImmediateDelta: decimalFromUnits(dailyImmediateDeltaRaw, ATLAS_USDT_TOKEN.decimals, 6),
      dailyDeferredDelta: decimalFromUnits(dailyDeferredDeltaRaw, ATLAS_USDT_TOKEN.decimals, 6),
      totalDelta: decimalFromUnits(totalDeltaRaw, ATLAS_USDT_TOKEN.decimals, 6),
      maxReward: decimalFromUnits(maxRewardRaw, ATLAS_USDT_TOKEN.decimals, 6),
      maxImmediateReward: decimalFromUnits(maxImmediateRewardRaw, ATLAS_USDT_TOKEN.decimals, 6),
      maxDeferredReward: decimalFromUnits(maxDeferredRewardRaw, ATLAS_USDT_TOKEN.decimals, 6),
      lockupDeltaRaw: lockupDeltaRaw.toString(),
      dailyDeltaRaw: dailyDeltaRaw.toString(),
      totalDeltaRaw: totalDeltaRaw.toString(),
    },
    platformCommission: {
      rule: "10% от Delta и партнёрских бонусов. Комиссия не применяется к первоначальной сумме участия.",
      percent: Number(ATLAS_PLATFORM_COMMISSION_PERMILLE) / 10,
      deltaCommission: decimalFromUnits(platformDeltaCommissionRaw, ATLAS_USDT_TOKEN.decimals, 6),
      lockupDeltaCommission: decimalFromUnits(platformLockupDeltaCommissionRaw, ATLAS_USDT_TOKEN.decimals, 6),
      dailyDeltaCommission: decimalFromUnits(platformDailyDeltaCommissionRaw, ATLAS_USDT_TOKEN.decimals, 6),
      collectedFee: decimalFromUnits(collectedFeeRaw, ATLAS_USDT_TOKEN.decimals, 6),
      unclaimedDeltaCommission: decimalFromUnits(platformUnclaimedDeltaCommissionRaw, ATLAS_USDT_TOKEN.decimals, 6),
      maxPartnerBonusCommission: decimalFromUnits(platformMaxPartnerBonusCommissionRaw, ATLAS_USDT_TOKEN.decimals, 6),
      maxTotalCommission: decimalFromUnits(platformMaxTotalCommissionRaw, ATLAS_USDT_TOKEN.decimals, 6),
      deltaCommissionRaw: platformDeltaCommissionRaw.toString(),
      collectedFeeRaw: collectedFeeRaw.toString(),
    },
    byStatus: ATLAS_PARTNER_STATUS_TABLE.map((row) => {
      const lockupRewardRaw = multiplyPermilleRaw(lockupDeltaRaw, row.rewardPermille);
      const dailyRewardRaw = multiplyPermilleRaw(dailyDeltaRaw, row.rewardPermille);
      const dailyImmediateRewardRaw = multiplyPermilleRaw(dailyImmediateDeltaRaw, row.rewardPermille);
      const dailyDeferredRewardRaw = dailyRewardRaw - dailyImmediateRewardRaw;
      const totalRewardRaw = lockupRewardRaw + dailyRewardRaw;

      return {
        status: row.status,
        personal: row.personal,
        firstLine: row.firstLine,
        structure: row.structure,
        rewardPercent: row.rewardPermille / 10,
        matchingPercent: row.matchingPermille / 10,
        totalReward: decimalFromUnits(totalRewardRaw, ATLAS_USDT_TOKEN.decimals, 6),
        lockupReward: decimalFromUnits(lockupRewardRaw, ATLAS_USDT_TOKEN.decimals, 6),
        dailyReward: decimalFromUnits(dailyRewardRaw, ATLAS_USDT_TOKEN.decimals, 6),
        dailyImmediateReward: decimalFromUnits(dailyImmediateRewardRaw, ATLAS_USDT_TOKEN.decimals, 6),
        dailyDeferredReward: decimalFromUnits(dailyDeferredRewardRaw, ATLAS_USDT_TOKEN.decimals, 6),
        platformCommissionOnReward: decimalFromUnits(multiplyPermilleRaw(totalRewardRaw, ATLAS_PLATFORM_COMMISSION_PERMILLE), ATLAS_USDT_TOKEN.decimals, 6),
      };
    }),
    byDay: daily.map((day) => ({
      date: day.date,
      partnerDelta: day.partnerDelta,
      lockupDelta: day.lockupDelta,
      dailyDelta: day.dailyDelta,
      maxReward: decimalFromUnits(multiplyPermilleRaw(BigInt(day.partnerDeltaRaw || 0), executivePermille), ATLAS_USDT_TOKEN.decimals, 6),
    })),
  };
}

async function mapWithConcurrency(items = [], limit = 4, mapper = async () => null) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchBscScanText(url) {
  const result = await fetchTextWithTimeout(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (compatible; AtlasAnalytics/1.0)",
    },
  }, 15000);
  if (!result.ok) throw new Error(`bscscan_${result.status || "failed"}`);
  return result.payload || "";
}

function parseBscScanTxTotal(html = "") {
  const totalText = html.match(/A total of\s+([\d,]+)\s+(?:transactions|txns) found/i)?.[1] || "0";
  return Number(totalText.replace(/,/g, "")) || 0;
}

function parseBscScanTxHashes(html = "") {
  return [...new Set([...html.matchAll(/\/tx\/(0x[a-fA-F0-9]{64})/g)].map((match) => match[1]))];
}

async function getBscScanContractTxHashes(address = "") {
  const firstHtml = await fetchBscScanText(`https://bscscan.com/txs?a=${encodeURIComponent(address)}&p=1`);
  const total = parseBscScanTxTotal(firstHtml);
  const pages = Math.max(1, Math.ceil(total / 50));
  let hashes = parseBscScanTxHashes(firstHtml);

  for (let page = 2; page <= pages; page += 1) {
    const html = await fetchBscScanText(`https://bscscan.com/txs?a=${encodeURIComponent(address)}&p=${page}`);
    hashes = [...new Set([...hashes, ...parseBscScanTxHashes(html)])];
  }

  return { total, pages, hashes };
}

async function getTransactionReceiptWithRetry(hash = "") {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const receipt = await callBscRpc("eth_getTransactionReceipt", [hash]);
      if (!receipt || typeof receipt !== "object" || !Array.isArray(receipt.logs)) {
        throw new Error("receipt_empty");
      }
      return receipt;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 350 + attempt * 250));
    }
  }
  throw lastError || new Error("receipt_fetch_failed");
}

async function getBlockTimestampWithRetry(blockNumber = 0) {
  const blockHex = `0x${Number(blockNumber || 0).toString(16)}`;
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const block = await callBscRpc("eth_getBlockByNumber", [blockHex, false]);
      const timestamp = Number.parseInt(block?.timestamp || "0x0", 16);
      if (!timestamp) throw new Error("block_timestamp_empty");
      return timestamp;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 350 + attempt * 250));
    }
  }
  throw lastError || new Error("block_fetch_failed");
}

function dayKeyFromTimestamp(timestamp = 0) {
  const offsetMs = ATLAS_FLOW_DAY_OFFSET_HOURS * 60 * 60 * 1000;
  return new Date((Number(timestamp) * 1000) + offsetMs).toISOString().slice(0, 10);
}

function createDailyBucket(date = "") {
  return {
    date,
    providedRaw: 0n,
    claimedRaw: 0n,
    feeRaw: 0n,
    partnerDeltaRaw: 0n,
    lockupDeltaRaw: 0n,
    dailyDeltaRaw: 0n,
    lockedEvents: 0,
    claimedEvents: 0,
    contracts: {},
  };
}

function createDailyContractBucket(name = "") {
  return {
    name,
    providedRaw: 0n,
    claimedRaw: 0n,
    feeRaw: 0n,
    partnerDeltaRaw: 0n,
    lockupDeltaRaw: 0n,
    dailyDeltaRaw: 0n,
    lockedEvents: 0,
    claimedEvents: 0,
  };
}

async function getAtlasContractFlowSnapshot() {
  if (atlasFlowCache && Date.now() - atlasFlowCache.createdAt < ATLAS_FLOW_CACHE_MS) {
    return { ...atlasFlowCache.payload, cache: { hit: true, ttlMs: ATLAS_FLOW_CACHE_MS } };
  }

  const latestHex = await callBscRpc("eth_blockNumber", []);
  const latestBlock = Number.parseInt(latestHex, 16);
  const flowContracts = ATLAS_CONTRACT_ADDRESSES.filter((contract) => ATLAS_FLOW_EVENT_CONFIG[contract.id]);
  const contracts = [];
  const failures = [];
  const eventRows = [];

  for (const contract of flowContracts) {
    const config = ATLAS_FLOW_EVENT_CONFIG[contract.id];
    const baseStats = buildEmptyAtlasFlowStats(contract);
    const { total, pages, hashes } = await getBscScanContractTxHashes(contract.address);
    let providedRaw = 0n;
    let claimedRaw = 0n;
    let feeRaw = 0n;
    let partnerDeltaRaw = 0n;
    let lockupDeltaRaw = 0n;
    let dailyDeltaRaw = 0n;
    let lockedEvents = 0;
    let claimedEvents = 0;
    let failedReceipts = 0;

    await mapWithConcurrency(hashes, ATLAS_FLOW_RECEIPT_CONCURRENCY, async (hash) => {
      try {
        const receipt = await getTransactionReceiptWithRetry(hash);
        for (const log of receipt?.logs || []) {
          if ((log.address || "").toLowerCase() !== contract.address.toLowerCase()) continue;
          const topic = (log.topics?.[0] || "").toLowerCase();
          const blockNumber = Number.parseInt(log.blockNumber || receipt.blockNumber || "0x0", 16);
          if (topic === config.lockedTopic.toLowerCase()) {
            const amountRaw = sumEventDataWords(log.data, config.lockedParts);
            const eventPartnerDeltaRaw = getAtlasPartnerDeltaRaw(contract.id, log.data);
            const cycleDetails = getAtlasLockedCycleDetails(contract.id, log.data);
            providedRaw += amountRaw;
            partnerDeltaRaw += eventPartnerDeltaRaw;
            if (contract.id === "lockup-flow") lockupDeltaRaw += eventPartnerDeltaRaw;
            if (contract.id === "daily-flow") dailyDeltaRaw += eventPartnerDeltaRaw;
            lockedEvents += 1;
            eventRows.push({
              contractId: contract.id,
              contractName: contract.name,
              type: "locked",
              orderId: getEventOrderId(log),
              blockNumber,
              hash,
              providedRaw: amountRaw,
              claimedRaw: 0n,
              feeRaw: 0n,
              partnerDeltaRaw: eventPartnerDeltaRaw,
              lockupDeltaRaw: contract.id === "lockup-flow" ? eventPartnerDeltaRaw : 0n,
              dailyDeltaRaw: contract.id === "daily-flow" ? eventPartnerDeltaRaw : 0n,
              ...cycleDetails,
            });
          }
          if (topic === config.claimedTopic.toLowerCase()) {
            const eventClaimedAmountRaw = sumEventDataWords(log.data, config.claimedParts);
            const feeAmountRaw = sumEventDataWords(log.data, config.feeParts);
            const claimedAmountRaw = contract.id === "lockup-flow" && eventClaimedAmountRaw > feeAmountRaw
              ? eventClaimedAmountRaw - feeAmountRaw
              : eventClaimedAmountRaw;
            claimedRaw += claimedAmountRaw;
            feeRaw += feeAmountRaw;
            claimedEvents += 1;
            eventRows.push({
              contractId: contract.id,
              contractName: contract.name,
              type: "claimed",
              orderId: getEventOrderId(log),
              claimedDays: contract.id === "daily-flow" ? Number(hexToBigInt(getDataWord(log.data, 0))) : 0,
              blockNumber,
              hash,
              providedRaw: 0n,
              claimedRaw: claimedAmountRaw,
              feeRaw: feeAmountRaw,
              partnerDeltaRaw: 0n,
              lockupDeltaRaw: 0n,
              dailyDeltaRaw: 0n,
            });
          }
        }
      } catch {
        failedReceipts += 1;
      }
    });

    const remainingRaw = providedRaw - claimedRaw - feeRaw;
    contracts.push({
      ...baseStats,
      txListTotal: total,
      txListPages: pages,
      receipts: hashes.length,
      failedReceipts,
      lockedEvents,
      claimedEvents,
      providedRaw: providedRaw.toString(),
      claimedRaw: claimedRaw.toString(),
      feeRaw: feeRaw.toString(),
      partnerDeltaRaw: partnerDeltaRaw.toString(),
      lockupDeltaRaw: lockupDeltaRaw.toString(),
      dailyDeltaRaw: dailyDeltaRaw.toString(),
      remainingRaw: remainingRaw.toString(),
      provided: decimalFromUnits(providedRaw, ATLAS_USDT_TOKEN.decimals, 6),
      claimed: decimalFromUnits(claimedRaw, ATLAS_USDT_TOKEN.decimals, 6),
      fee: decimalFromUnits(feeRaw, ATLAS_USDT_TOKEN.decimals, 6),
      partnerDelta: decimalFromUnits(partnerDeltaRaw, ATLAS_USDT_TOKEN.decimals, 6),
      lockupDelta: decimalFromUnits(lockupDeltaRaw, ATLAS_USDT_TOKEN.decimals, 6),
      dailyDelta: decimalFromUnits(dailyDeltaRaw, ATLAS_USDT_TOKEN.decimals, 6),
      remaining: decimalFromUnits(remainingRaw, ATLAS_USDT_TOKEN.decimals, 6),
    });

    if (failedReceipts) {
      failures.push({ contract: contract.name, failedReceipts });
    }
  }

  const blockTimestampMap = new Map();
  const uniqueBlocks = [...new Set(eventRows.map((event) => event.blockNumber).filter(Boolean))];
  await mapWithConcurrency(uniqueBlocks, ATLAS_FLOW_RECEIPT_CONCURRENCY, async (blockNumber) => {
    try {
      blockTimestampMap.set(blockNumber, await getBlockTimestampWithRetry(blockNumber));
    } catch {
      blockTimestampMap.set(blockNumber, 0);
    }
  });
  let snapshotTimestamp = Math.floor(Date.now() / 1000);
  try {
    snapshotTimestamp = await getBlockTimestampWithRetry(latestBlock);
  } catch {
    // Wall-clock fallback keeps the status summary available if the latest block lookup briefly fails.
  }

  const dailyMap = new Map();
  for (const event of eventRows) {
    const timestamp = blockTimestampMap.get(event.blockNumber) || 0;
    if (!timestamp) continue;
    const date = dayKeyFromTimestamp(timestamp);
    if (!dailyMap.has(date)) dailyMap.set(date, createDailyBucket(date));
    const day = dailyMap.get(date);
    day.providedRaw += event.providedRaw;
    day.claimedRaw += event.claimedRaw;
    day.feeRaw += event.feeRaw;
    day.partnerDeltaRaw += event.partnerDeltaRaw;
    day.lockupDeltaRaw += event.lockupDeltaRaw;
    day.dailyDeltaRaw += event.dailyDeltaRaw;
    if (event.type === "locked") day.lockedEvents += 1;
    if (event.type === "claimed") day.claimedEvents += 1;

    if (!day.contracts[event.contractId]) {
      day.contracts[event.contractId] = createDailyContractBucket(event.contractName);
    }
    const contractDay = day.contracts[event.contractId];
    contractDay.providedRaw += event.providedRaw;
    contractDay.claimedRaw += event.claimedRaw;
    contractDay.feeRaw += event.feeRaw;
    contractDay.partnerDeltaRaw += event.partnerDeltaRaw;
    contractDay.lockupDeltaRaw += event.lockupDeltaRaw;
    contractDay.dailyDeltaRaw += event.dailyDeltaRaw;
    if (event.type === "locked") contractDay.lockedEvents += 1;
    if (event.type === "claimed") contractDay.claimedEvents += 1;
  }

  const daily = [...dailyMap.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((day) => {
      const remainingRaw = day.providedRaw - day.claimedRaw - day.feeRaw;
      const contractsById = Object.fromEntries(Object.entries(day.contracts).map(([id, item]) => {
        const itemRemainingRaw = item.providedRaw - item.claimedRaw - item.feeRaw;
        return [id, {
          name: item.name,
          provided: decimalFromUnits(item.providedRaw, ATLAS_USDT_TOKEN.decimals, 6),
          claimed: decimalFromUnits(item.claimedRaw, ATLAS_USDT_TOKEN.decimals, 6),
          fee: decimalFromUnits(item.feeRaw, ATLAS_USDT_TOKEN.decimals, 6),
          partnerDelta: decimalFromUnits(item.partnerDeltaRaw, ATLAS_USDT_TOKEN.decimals, 6),
          lockupDelta: decimalFromUnits(item.lockupDeltaRaw, ATLAS_USDT_TOKEN.decimals, 6),
          dailyDelta: decimalFromUnits(item.dailyDeltaRaw, ATLAS_USDT_TOKEN.decimals, 6),
          remaining: decimalFromUnits(itemRemainingRaw, ATLAS_USDT_TOKEN.decimals, 6),
          lockedEvents: item.lockedEvents,
          claimedEvents: item.claimedEvents,
        }];
      }));

      return {
        date: day.date,
        provided: decimalFromUnits(day.providedRaw, ATLAS_USDT_TOKEN.decimals, 6),
        claimed: decimalFromUnits(day.claimedRaw, ATLAS_USDT_TOKEN.decimals, 6),
        fee: decimalFromUnits(day.feeRaw, ATLAS_USDT_TOKEN.decimals, 6),
        partnerDelta: decimalFromUnits(day.partnerDeltaRaw, ATLAS_USDT_TOKEN.decimals, 6),
        lockupDelta: decimalFromUnits(day.lockupDeltaRaw, ATLAS_USDT_TOKEN.decimals, 6),
        dailyDelta: decimalFromUnits(day.dailyDeltaRaw, ATLAS_USDT_TOKEN.decimals, 6),
        partnerDeltaRaw: day.partnerDeltaRaw.toString(),
        remaining: decimalFromUnits(remainingRaw, ATLAS_USDT_TOKEN.decimals, 6),
        lockedEvents: day.lockedEvents,
        claimedEvents: day.claimedEvents,
        contracts: contractsById,
      };
    });

  const totalsRaw = contracts.reduce(
    (accumulator, row) => ({
      provided: accumulator.provided + BigInt(row.providedRaw || 0),
      claimed: accumulator.claimed + BigInt(row.claimedRaw || 0),
      fee: accumulator.fee + BigInt(row.feeRaw || 0),
      remaining: accumulator.remaining + BigInt(row.remainingRaw || 0),
      partnerDelta: accumulator.partnerDelta + BigInt(row.partnerDeltaRaw || 0),
      lockupDelta: accumulator.lockupDelta + BigInt(row.lockupDeltaRaw || 0),
      dailyDelta: accumulator.dailyDelta + BigInt(row.dailyDeltaRaw || 0),
      receipts: accumulator.receipts + (row.receipts || 0),
      lockedEvents: accumulator.lockedEvents + (row.lockedEvents || 0),
      claimedEvents: accumulator.claimedEvents + (row.claimedEvents || 0),
    }),
    { provided: 0n, claimed: 0n, fee: 0n, remaining: 0n, partnerDelta: 0n, lockupDelta: 0n, dailyDelta: 0n, receipts: 0, lockedEvents: 0, claimedEvents: 0 },
  );
  const partnerProgram = buildAtlasPartnerProgramSnapshot({
    lockupDeltaRaw: totalsRaw.lockupDelta,
    dailyDeltaRaw: totalsRaw.dailyDelta,
    collectedFeeRaw: totalsRaw.fee,
    daily,
  });
  const cycleStats = buildAtlasCycleStats({ eventRows, snapshotTimestamp });

  const payload = {
    ok: true,
    network: {
      name: "BNB Smart Chain",
      chainId: 56,
      explorer: "BscScan",
    },
    token: ATLAS_USDT_TOKEN,
    contracts,
    daily,
    cycleStats,
    totals: {
      provided: decimalFromUnits(totalsRaw.provided, ATLAS_USDT_TOKEN.decimals, 6),
      claimed: decimalFromUnits(totalsRaw.claimed, ATLAS_USDT_TOKEN.decimals, 6),
      fee: decimalFromUnits(totalsRaw.fee, ATLAS_USDT_TOKEN.decimals, 6),
      remaining: decimalFromUnits(totalsRaw.remaining, ATLAS_USDT_TOKEN.decimals, 6),
      partnerDelta: decimalFromUnits(totalsRaw.partnerDelta, ATLAS_USDT_TOKEN.decimals, 6),
      lockupDelta: decimalFromUnits(totalsRaw.lockupDelta, ATLAS_USDT_TOKEN.decimals, 6),
      dailyDelta: decimalFromUnits(totalsRaw.dailyDelta, ATLAS_USDT_TOKEN.decimals, 6),
      providedRaw: totalsRaw.provided.toString(),
      claimedRaw: totalsRaw.claimed.toString(),
      feeRaw: totalsRaw.fee.toString(),
      remainingRaw: totalsRaw.remaining.toString(),
      partnerDeltaRaw: totalsRaw.partnerDelta.toString(),
      lockupDeltaRaw: totalsRaw.lockupDelta.toString(),
      dailyDeltaRaw: totalsRaw.dailyDelta.toString(),
      receipts: totalsRaw.receipts,
      lockedEvents: totalsRaw.lockedEvents,
      claimedEvents: totalsRaw.claimedEvents,
      activeDays: daily.length,
    },
    partnerProgram,
    range: {
      toBlock: latestBlock,
      receipts: totalsRaw.receipts,
      lockedEvents: totalsRaw.lockedEvents,
      claimedEvents: totalsRaw.claimedEvents,
      activeDays: daily.length,
      dayOffsetHours: ATLAS_FLOW_DAY_OFFSET_HOURS,
    },
    failures,
    source: "BscScan tx list + BNB Chain transaction receipts",
    rpcCount: BSC_RPC_URLS.length,
    updatedAt: new Date().toISOString(),
  };
  atlasFlowCache = { createdAt: Date.now(), payload };
  return { ...payload, cache: { hit: false, ttlMs: ATLAS_FLOW_CACHE_MS } };
}

function normalizeYoutubeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeYoutubeText(value = "", maxLength = 900) {
  return String(value || "").trim().slice(0, maxLength);
}

function getYoutubeApiKey() {
  return normalizeYoutubeText(process.env.YOUTUBE_API_KEY || process.env.GOOGLE_YOUTUBE_API_KEY || "", 300);
}

function buildYoutubeApiUrl(pathname, params = {}) {
  const apiUrl = new URL(pathname, "https://www.googleapis.com/youtube/v3/");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      apiUrl.searchParams.set(key, String(value));
    }
  });
  return apiUrl;
}

function toYoutubePeriodDate(period = "") {
  const days = Number(period);
  if (!Number.isFinite(days) || days <= 0) return "";
  return new Date(Date.now() - days * 86400000).toISOString();
}

function getYoutubeChannelUrl(channelId = "", fallbackUrl = "") {
  if (channelId) return `https://www.youtube.com/channel/${channelId}`;
  return fallbackUrl || "";
}

function mapYoutubeLead({ channel = {}, video = {}, query = "", region = "", language = "" }) {
  const channelId = normalizeYoutubeText(channel.id || video.snippet?.channelId || "", 120);
  const statistics = channel.statistics || {};
  const videoStats = video.statistics || {};
  const subscriberCount = normalizeYoutubeNumber(statistics.subscriberCount);
  const viewCount = normalizeYoutubeNumber(videoStats.viewCount);
  const publishedAt = normalizeYoutubeText(video.snippet?.publishedAt || channel.snippet?.publishedAt || "", 80);
  const channelTitle = normalizeYoutubeText(channel.snippet?.title || video.snippet?.channelTitle || "YouTube channel", 180);
  const videoTitle = normalizeYoutubeText(video.snippet?.title || channel.snippet?.title || "", 260);
  const description = normalizeYoutubeText(video.snippet?.description || channel.snippet?.description || "", 700);
  const tags = Array.isArray(video.snippet?.tags) ? video.snippet.tags.slice(0, 12) : [];

  return {
    id: `yt-api-${channelId || Date.now()}-${Buffer.from(`${query}-${video.id || ""}`).toString("base64url").slice(0, 10)}`,
    source: "youtube-api",
    query,
    channelId,
    channelTitle,
    channelUrl: getYoutubeChannelUrl(channelId),
    videoId: normalizeYoutubeText(video.id || "", 120),
    videoTitle,
    videoUrl: video.id ? `https://www.youtube.com/watch?v=${video.id}` : "",
    publishedAt,
    subscriberCount,
    viewCount,
    totalChannelViews: normalizeYoutubeNumber(statistics.viewCount),
    channelVideoCount: normalizeYoutubeNumber(statistics.videoCount),
    hiddenSubscriberCount: Boolean(statistics.hiddenSubscriberCount),
    thumbnail: normalizeYoutubeText(
      video.snippet?.thumbnails?.medium?.url
        || video.snippet?.thumbnails?.default?.url
        || channel.snippet?.thumbnails?.medium?.url
        || channel.snippet?.thumbnails?.default?.url
        || "",
      400,
    ),
    region: normalizeYoutubeText(region || language || "Global", 120),
    language: normalizeYoutubeText(language || "", 80),
    tags,
    description,
    contactRoute: "YouTube About / business email / links in channel description",
    fit: query
      ? `Найден по запросу "${query}". Проверить аудиторию, последние ролики, рекламные интеграции и тональность.`
      : "Проверить аудиторию, последние ролики, рекламные интеграции и тональность.",
    outreachRoute: "Открыть канал → About → business email / соцсети / форма сотрудничества.",
    priceFormat: "Запросить / review / sponsored video / integration",
    status: "Найти контакты",
    notes: "Импортировано через YouTube Data API. Email не выдумывать: брать только публичный business email или контакты из описания.",
  };
}

async function searchYoutubeApi(url) {
  const apiKey = getYoutubeApiKey();
  if (!apiKey) {
    return {
      ok: false,
      needsApiKey: true,
      items: [],
      message: "На сервере не задан YOUTUBE_API_KEY или GOOGLE_YOUTUBE_API_KEY.",
    };
  }

  const query = normalizeYoutubeText(url.searchParams.get("q") || "", 240);
  if (!query) return { ok: false, items: [], error: "empty_query" };

  const maxResults = Math.max(1, Math.min(50, Number(url.searchParams.get("maxResults") || 25)));
  const searchType = ["video", "channel"].includes(url.searchParams.get("type")) ? url.searchParams.get("type") : "video";
  const regionCode = normalizeYoutubeText(url.searchParams.get("regionCode") || "", 8).toUpperCase();
  const relevanceLanguage = normalizeYoutubeText(url.searchParams.get("relevanceLanguage") || "", 12).toLowerCase();
  const publishedAfter = toYoutubePeriodDate(url.searchParams.get("period") || "");
  const minSubscribers = Math.max(0, Number(url.searchParams.get("minSubscribers") || 0));

  const searchUrl = buildYoutubeApiUrl("search", {
    part: "snippet",
    q: query,
    type: searchType,
    maxResults,
    order: url.searchParams.get("order") || "relevance",
    regionCode,
    relevanceLanguage,
    publishedAfter: searchType === "video" ? publishedAfter : "",
    key: apiKey,
  });
  const search = await fetchJsonWithTimeout(searchUrl);
  if (!search.ok) {
    return {
      ok: false,
      status: search.status,
      items: [],
      error: search.payload?.error?.message || "youtube_search_failed",
      details: search.payload?.error || null,
    };
  }

  const searchItems = Array.isArray(search.payload?.items) ? search.payload.items : [];
  const videoIds = [...new Set(searchItems.map((item) => item.id?.videoId).filter(Boolean))];
  const channelIds = [...new Set(searchItems
    .map((item) => item.id?.channelId || item.snippet?.channelId)
    .filter(Boolean))];

  let videos = [];
  if (videoIds.length) {
    const videosUrl = buildYoutubeApiUrl("videos", {
      part: "snippet,statistics,contentDetails",
      id: videoIds.join(","),
      key: apiKey,
    });
    const videosResult = await fetchJsonWithTimeout(videosUrl);
    videos = videosResult.ok && Array.isArray(videosResult.payload?.items) ? videosResult.payload.items : [];
  }

  let channels = [];
  if (channelIds.length) {
    const channelsUrl = buildYoutubeApiUrl("channels", {
      part: "snippet,statistics",
      id: channelIds.join(","),
      key: apiKey,
    });
    const channelsResult = await fetchJsonWithTimeout(channelsUrl);
    channels = channelsResult.ok && Array.isArray(channelsResult.payload?.items) ? channelsResult.payload.items : [];
  }

  const channelById = new Map(channels.map((channel) => [channel.id, channel]));
  const videoById = new Map(videos.map((video) => [video.id, video]));
  const leadsByChannel = new Map();

  searchItems.forEach((item) => {
    const video = item.id?.videoId ? videoById.get(item.id.videoId) || { id: item.id.videoId, snippet: item.snippet } : {};
    const channelId = item.id?.channelId || item.snippet?.channelId || video.snippet?.channelId || "";
    const channel = channelById.get(channelId) || (item.id?.channelId ? { id: channelId, snippet: item.snippet } : {});
    const lead = mapYoutubeLead({ channel, video, query, region: regionCode, language: relevanceLanguage });
    const existing = leadsByChannel.get(lead.channelId);
    if (!existing || lead.viewCount > existing.viewCount) leadsByChannel.set(lead.channelId || lead.id, lead);
  });

  const items = [...leadsByChannel.values()]
    .filter((item) => !minSubscribers || item.subscriberCount >= minSubscribers || item.hiddenSubscriberCount)
    .sort((a, b) => (b.subscriberCount || 0) - (a.subscriberCount || 0));

  return {
    ok: true,
    items,
    meta: {
      query,
      searchType,
      maxResults,
      returned: items.length,
      fetchedVideos: videos.length,
      fetchedChannels: channels.length,
      quotaNote: "search.list расходует заметную квоту YouTube Data API; точный расход проверяйте в Google Cloud quota dashboard.",
    },
  };
}

async function verifyWithTelemetr({ handle = "", name = "", url = "" }) {
  const apiKey = normalizeEmailValue(process.env.TELEMETR_API_KEY || process.env.TELEMETRIO_API_KEY || "");
  if (!apiKey) return { ok: false, error: "telemetr_api_key_not_configured" };

  const term = handle ? `@${handle}` : url || name;
  const headers = { "x-api-key": apiKey, Authorization: `Bearer ${apiKey}`, Accept: "application/json" };
  const searchUrl = new URL("https://api.telemetr.io/v1/channels/search");
  searchUrl.searchParams.set("term", term);
  searchUrl.searchParams.set("limit", "5");
  const search = await fetchJsonWithTimeout(searchUrl, { headers });
  if (!search.ok) return { ok: false, status: search.status, error: search.payload?.message || "telemetr_search_failed" };

  const items = Array.isArray(search.payload) ? search.payload : search.payload?.items || [];
  const lowerHandle = handle.toLowerCase();
  const selected = items.find((item) => {
    const username = stringValue(item.username, item.link, item.telegram_link, item.tg_link).toLowerCase();
    return lowerHandle && username.includes(lowerHandle);
  }) || items[0];
  const internalId = stringValue(selected?.internal_id, selected?.id, selected?.channel_id);
  if (!selected || !internalId) return { ok: false, error: "telemetr_channel_not_found" };

  const [info, stats] = await Promise.all([
    fetchJsonWithTimeout(new URL(`/v1/channel/info?internal_id=${encodeURIComponent(internalId)}`, "https://api.telemetr.io"), { headers }),
    fetchJsonWithTimeout(new URL(`/v1/channel/stats?internal_id=${encodeURIComponent(internalId)}`, "https://api.telemetr.io"), { headers }),
  ]);

  const infoItem = Array.isArray(info.payload) ? info.payload[0] : info.payload;
  const statsItem = Array.isArray(stats.payload) ? stats.payload[0] : stats.payload;
  const about = stringValue(infoItem?.about, infoItem?.description, selected?.about, selected?.description);
  const members = numberValue(statsItem?.members_count, statsItem?.participants_count, statsItem?.subscribers_count, infoItem?.members_count, selected?.members_count);
  const avgViews = numberValue(statsItem?.views_avg, statsItem?.avg_views, statsItem?.views_per_post, selected?.views_avg);
  const er = numberValue(statsItem?.er_percent, statsItem?.err_percent, statsItem?.err24_percent, selected?.er_percent);
  const lastPostDate = toIsoDate(statsItem?.last_message_at || statsItem?.last_post_at || selected?.last_message_at || selected?.last_post_at);
  const contact = extractPublicContacts(about, infoItem?.contacts, selected?.contacts);
  const quality = buildChannelQuality({ members, avgViews, er, lastPostDate, hasContact: Boolean(contact), found: true });

  return {
    ok: true,
    source: "Telemetr",
    patch: {
      adminContact: contact,
      verificationStatus: contact ? "Контакт найден" : quality.status,
      verificationNotes: summarizeVerification("Telemetr API", {
        members,
        avgViews,
        er,
        lastPostDate,
        adsIndex: stringValue(statsItem?.ads_index_grade, statsItem?.ads_index),
        contact,
      }),
      aliveScore: quality.aliveScore,
      fitScore: quality.fitScore,
      contacts: `Channel: @${handle || normalizeHandle(infoItem?.link || selected?.link || term)}\n${contact ? `Admin/ads: ${contact}` : "Contact: проверить описание/закреп после API-проверки"}\nSource: Telemetr`,
      lastSeen: `Telemetr API · ${new Date().toISOString().slice(0, 10)}`,
    },
    raw: { selected, info: infoItem, stats: statsItem },
  };
}

async function verifyWithTgstat({ handle = "", name = "", url = "" }) {
  const token = normalizeEmailValue(process.env.TGSTAT_TOKEN || process.env.TGSTAT_API_TOKEN || "");
  if (!token) return { ok: false, error: "tgstat_token_not_configured" };

  const channelId = handle ? `@${handle}` : url || name;
  const headers = { Accept: "application/json" };
  const getUrl = new URL("https://api.tgstat.ru/channels/get");
  getUrl.searchParams.set("token", token);
  getUrl.searchParams.set("channelId", channelId);
  const info = await fetchJsonWithTimeout(getUrl, { headers });
  if (!info.ok || info.payload?.status === "error") return { ok: false, status: info.status, error: info.payload?.error || "tgstat_channel_not_found" };

  const postsUrl = new URL("https://api.tgstat.ru/channels/posts");
  postsUrl.searchParams.set("token", token);
  postsUrl.searchParams.set("channelId", channelId);
  postsUrl.searchParams.set("limit", "10");
  postsUrl.searchParams.set("hideForwards", "1");
  postsUrl.searchParams.set("extended", "1");
  const posts = await fetchJsonWithTimeout(postsUrl, { headers });

  const channel = info.payload?.response || posts.payload?.response?.channel || {};
  const items = posts.payload?.response?.items || [];
  const avgViews = items.length ? Math.round(items.reduce((sum, item) => sum + numberValue(item.views), 0) / items.length) : 0;
  const lastPostDate = toIsoDate(items[0]?.date);
  const members = numberValue(channel.participants_count);
  const er = members && avgViews ? Number(((avgViews / members) * 100).toFixed(2)) : 0;
  const contact = extractPublicContacts(channel.about);
  const quality = buildChannelQuality({ members, avgViews, er, lastPostDate, hasContact: Boolean(contact), found: true });

  return {
    ok: true,
    source: "TGStat",
    patch: {
      adminContact: contact,
      verificationStatus: contact ? "Контакт найден" : quality.status,
      verificationNotes: summarizeVerification("TGStat API", { members, avgViews, er, lastPostDate, contact }),
      aliveScore: quality.aliveScore,
      fitScore: quality.fitScore,
      contacts: `Channel: @${handle || normalizeHandle(channel.username || channel.link || channelId)}\n${contact ? `Admin/ads: ${contact}` : "Contact: проверить описание/закреп после API-проверки"}\nSource: TGStat`,
      lastSeen: `TGStat API · ${new Date().toISOString().slice(0, 10)}`,
    },
    raw: { channel, posts: items.slice(0, 3) },
  };
}

async function verifyTelegramChannel(lead = {}) {
  const handle = normalizeHandle(`${lead.contacts || ""}\n${lead.url || ""}\n${lead.name || ""}`);
  if (!handle && !lead.url && !lead.name) return { ok: false, status: 400, error: "telegram_channel_missing" };

  const attempts = [];
  const telemetr = await verifyWithTelemetr({ handle, name: lead.name, url: lead.url }).catch((error) => ({ ok: false, error: error?.message || "telemetr_failed" }));
  attempts.push({ provider: "Telemetr", ok: telemetr.ok, error: telemetr.error || "", status: telemetr.status || 0 });
  if (telemetr.ok) return { ok: true, provider: "Telemetr", patch: telemetr.patch, attempts };

  const tgstat = await verifyWithTgstat({ handle, name: lead.name, url: lead.url }).catch((error) => ({ ok: false, error: error?.message || "tgstat_failed" }));
  attempts.push({ provider: "TGStat", ok: tgstat.ok, error: tgstat.error || "", status: tgstat.status || 0 });
  if (tgstat.ok) return { ok: true, provider: "TGStat", patch: tgstat.patch, attempts };

  const missingAllKeys = attempts.every((attempt) => ["telemetr_api_key_not_configured", "tgstat_token_not_configured"].includes(attempt.error));
  return {
    ok: false,
    status: missingAllKeys ? 503 : 502,
    error: missingAllKeys ? "telegram_analytics_not_configured" : "telegram_channel_verification_failed",
    attempts,
  };
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatEmailLine(line = "") {
  const safeLine = escapeHtml(line);
  return safeLine.replace(/https:\/\/atlas-system\.io\b/g, '<a href="https://atlas-system.io" style="color:#ff5500;text-decoration:none;font-weight:700;">atlas-system.io</a>');
}

function buildOutreachEmailHtml({ subject = "", body = "" }) {
  const lines = sanitizeEmailText(body, 8000).split(/\r?\n/);
  const content = [];
  let listItems = [];

  function flushList() {
    if (!listItems.length) return;
    content.push(`<ol style="margin:14px 0 18px 22px;padding:0;color:#21374a;">${listItems.map((item) => `<li style="margin:0 0 8px 0;padding-left:4px;">${item}</li>`).join("")}</ol>`);
    listItems = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      listItems.push(formatEmailLine(numbered[1]));
      continue;
    }

    flushList();
    content.push(`<p style="margin:0 0 14px 0;color:#21374a;line-height:1.58;">${formatEmailLine(line)}</p>`);
  }
  flushList();

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(subject || "Atlas System")}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#21374a;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;">Atlas System partnerships request for media placements and listing options.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e5edf4;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:26px 30px 22px;background:#143852;">
                <div style="font-size:13px;line-height:1.2;color:#ffc227;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Atlas System</div>
                <div style="margin-top:8px;font-size:24px;line-height:1.25;color:#ffffff;font-weight:800;">Partnerships & media placements</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 30px 12px;">
                ${content.join("")}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 30px 28px;">
                <div style="height:1px;background:#e5edf4;margin-bottom:16px;"></div>
                <p style="margin:0;color:#6a7c8e;font-size:13px;line-height:1.5;">
                  Official Atlas System partnerships account.<br>
                  Website: <a href="https://atlas-system.io" style="color:#ff5500;text-decoration:none;font-weight:700;">atlas-system.io</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function appendOutreachEmailLog(entry) {
  const log = await readContent(OUTREACH_LOG_KEY, []);
  const nextLog = Array.isArray(log) ? log : [];
  await writeContent(OUTREACH_LOG_KEY, [{ ...entry, createdAt: new Date().toISOString() }, ...nextLog].slice(0, 500));
}

async function sendOutreachEmail({ lead = {}, to = "", subject = "", body = "" }) {
  const apiKey = normalizeEmailValue(process.env.RESEND_API_KEY || "");
  const from = normalizeEmailValue(process.env.OUTREACH_FROM_EMAIL || "");
  const replyTo = normalizeEmailValue(process.env.OUTREACH_REPLY_TO_EMAIL || from);
  const recipient = normalizeEmailValue(to);

  if (!apiKey || !from || !replyTo) {
    return { ok: false, status: 503, error: "outreach_email_not_configured" };
  }
  if (!isProbablyEmail(recipient)) {
    return { ok: false, status: 400, error: "invalid_recipient_email" };
  }

  const cleanSubject = sanitizeEmailText(subject || `Advertising options request - ${lead.name || "Superflow Systems"}`, 220);
  const cleanBody = sanitizeEmailText(body, 8000);
  if (!cleanBody) {
    return { ok: false, status: 400, error: "empty_email_body" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      reply_to: replyTo,
      subject: cleanSubject,
      text: cleanBody,
      html: buildOutreachEmailHtml({ subject: cleanSubject, body: cleanBody }),
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    await appendOutreachEmailLog({
      ok: false,
      leadId: lead.id || "",
      leadName: lead.name || "",
      to: recipient,
      subject: cleanSubject,
      error: payload?.message || payload?.error || "resend_send_failed",
    });
    return { ok: false, status: response.status || 502, error: payload?.message || payload?.error || "resend_send_failed" };
  }

  await appendOutreachEmailLog({
    ok: true,
    leadId: lead.id || "",
    leadName: lead.name || "",
    to: recipient,
    subject: cleanSubject,
    resendId: payload?.id || "",
  });

  return { ok: true, status: 200, resendId: payload?.id || "" };
}

async function deliverTelegramMessages(token, chatIds, text, options = {}) {
  const sent = [];
  for (const chatId of chatIds) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          ...options,
          disable_web_page_preview: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        return { ok: false, status: response.status || 502, error: payload?.description || "telegram_send_failed", chatId };
      }
      sent.push({ chatId, messageId: payload?.result?.message_id });
    } catch (error) {
      return {
        ok: false,
        status: 502,
        error: error?.message || "telegram_transport_failed",
        chatId,
      };
    }
  }

  return { ok: true, status: 200, sent };
}

async function sendTelegramMessage(text, options = {}, requestedChatId = "") {
  const { token, targetChatIds } = await getTelegramConfig();
  if (!token) return { ok: false, status: 503, error: "telegram_token_not_configured" };
  if (!targetChatIds.length) return { ok: false, status: 503, error: "telegram_push_chat_not_configured" };
  if (requestedChatId && !targetChatIds.includes(requestedChatId)) {
    return { ok: false, status: 403, error: "telegram_push_chat_not_allowed", chatId: requestedChatId };
  }
  if (!requestedChatId && targetChatIds.length > 1) {
    return { ok: false, status: 400, error: "telegram_push_chat_required" };
  }

  return deliverTelegramMessages(token, requestedChatId ? [requestedChatId] : targetChatIds, text, options);
}

async function sendMarketingTelegramMessage(text, options = {}) {
  const { token } = await getTelegramConfig();
  const chatId = await getMarketingTelegramChatId();
  if (!token) return { ok: false, status: 503, error: "telegram_token_not_configured" };
  if (!chatId) return { ok: false, status: 503, error: "marketing_telegram_chat_not_configured" };
  return deliverTelegramMessages(token, [chatId], text, options);
}

function getMoscowDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce((accumulator, part) => {
    accumulator[part.type] = part.value;
    return accumulator;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function normalizeMarketingStatus(value = "") {
  const text = String(value || "").trim();
  const lower = text.toLowerCase();
  if (/подключ|размещ|опублик|published|live|готово/.test(lower)) return "connected";
  if (/куп|оплат|paid|buy|bought|deal|договор/.test(lower)) return "bought";
  if (/ответ|reply|respond|цена получ|price received/.test(lower)) return "replied";
  if (/напис|sent|contacted|отправ/.test(lower)) return "contacted";
  if (/выбран|selected|приоритет|сначала/.test(lower)) return "selected";
  if (/пауз|отказ|не подходит|reject|declin/.test(lower)) return "rejected";
  if (/контакт|найти|изуч|собра/.test(lower)) return "research";
  return text ? "other" : "research";
}

function marketingStatusLabel(status = "research") {
  return {
    research: "в поиске/проверке",
    selected: "выбрали",
    contacted: "написали",
    replied: "ответили",
    bought: "купили",
    connected: "подключили",
    rejected: "не подходит/пауза",
    other: "другое",
  }[status] || "другое";
}

function hasUsefulContact(value = "") {
  const text = String(value || "").toLowerCase();
  if (!text.trim()) return false;
  if (/найти|проверить|about|description|contact route|уточнить/.test(text)) return false;
  return /@|t\.me|telegram|mailto:|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|whatsapp|wa\.me|http/i.test(text);
}

function hasUsefulPrice(value = "") {
  const text = String(value || "").toLowerCase().trim();
  if (!text) return false;
  if (/запрос|уточн|request|check|провер/.test(text)) return false;
  return /\$|usdt|usd|eur|€|₽|\d/.test(text);
}

function normalizeMarketingLead(row = {}, source = "youtubeApi", index = 0) {
  const url = String(row.channelUrl || row.url || row.cu || row.videoUrl || row.vu || row.id || "").trim();
  const id = String(row.id || row.channelId || `${source}-${index}-${url}`).trim();
  const name = String(row.channelTitle || row.name || row.n || "YouTube lead").trim();
  const statusText = String(row.status || row.stage || row.outreachStatus || "").trim();
  const contact = String(row.contact || row.contactRoute || row.adminContact || row.contacts || "").trim();
  const price = String(row.price || row.priceFormat || row.budget || "").trim();
  const notes = String(row.notes || row.comment || row.ti || row.videoTitle || row.t || "").trim();
  const normalizedStatus = normalizeMarketingStatus(statusText || price);

  return {
    id,
    key: (url || id || name).toLowerCase(),
    name,
    url,
    source,
    status: statusText || marketingStatusLabel(normalizedStatus),
    normalizedStatus,
    contact,
    price,
    notes,
    region: String(row.region || row.language || row.l || "").trim(),
    subscribers: Number(row.subscriberCount || row.reach || 0) || 0,
    views: Number(row.viewCount || row.vw || 0) || 0,
    hasContact: hasUsefulContact(contact),
    hasPrice: hasUsefulPrice(price),
  };
}

async function collectMarketingYoutubeLeads() {
  const [youtubeApiRows, segmentRows, bitnestRows] = await Promise.all([
    readContent(YOUTUBE_API_LEADS_KEY, []),
    readContent(SEGMENT_OUTREACH_KEY, []),
    readContent(BITNEST_YOUTUBE_KEY, []),
  ]);
  const rows = [];
  if (Array.isArray(youtubeApiRows)) {
    rows.push(...youtubeApiRows.filter((row) => !row?.deleted).map((row, index) => normalizeMarketingLead(row, "YouTube API", index)));
  }
  if (Array.isArray(segmentRows)) {
    rows.push(...segmentRows
      .filter((row) => !row?.deleted && String(row?.social || "").toLowerCase() === "youtube")
      .map((row, index) => normalizeMarketingLead(row, "Сегментный парсер", index)));
  }
  if (Array.isArray(bitnestRows)) {
    rows.push(...bitnestRows.filter((row) => !row?.deleted).map((row, index) => normalizeMarketingLead(row, "Битнест YouTube", index)));
  }

  const byKey = new Map();
  for (const row of rows) {
    if (!row.key) continue;
    const existing = byKey.get(row.key);
    if (!existing) {
      byKey.set(row.key, row);
      continue;
    }
    const score = Number(row.hasContact) + Number(row.hasPrice) + (row.normalizedStatus !== "research" ? 1 : 0);
    const existingScore = Number(existing.hasContact) + Number(existing.hasPrice) + (existing.normalizedStatus !== "research" ? 1 : 0);
    if (score >= existingScore) byKey.set(row.key, { ...existing, ...row, source: `${existing.source}, ${row.source}` });
  }
  return [...byKey.values()];
}

function summarizeMarketingYoutubeLeads(leads = [], previous = {}) {
  const counters = {
    total: leads.length,
    withContact: leads.filter((lead) => lead.hasContact).length,
    withPrice: leads.filter((lead) => lead.hasPrice).length,
    totalSubscribers: leads.reduce((sum, lead) => sum + Number(lead.subscribers || 0), 0),
    totalViews: leads.reduce((sum, lead) => sum + Number(lead.views || 0), 0),
    byStatus: {},
    bySource: {},
  };
  for (const lead of leads) {
    counters.byStatus[lead.normalizedStatus] = (counters.byStatus[lead.normalizedStatus] || 0) + 1;
    counters.bySource[lead.source] = (counters.bySource[lead.source] || 0) + 1;
  }

  const previousLeads = previous?.leads || {};
  const currentLeads = Object.fromEntries(leads.map((lead) => [lead.key, {
    name: lead.name,
    status: lead.normalizedStatus,
    statusText: lead.status,
    hasContact: lead.hasContact,
    hasPrice: lead.hasPrice,
    updatedAt: new Date().toISOString(),
  }]));
  const newLeads = leads.filter((lead) => !previousLeads[lead.key]);
  const statusChanges = leads
    .map((lead) => {
      const before = previousLeads[lead.key];
      if (!before || before.status === lead.normalizedStatus) return null;
      return {
        name: lead.name,
        from: before.status,
        to: lead.normalizedStatus,
        statusText: lead.status,
      };
    })
    .filter(Boolean);
  const attention = leads
    .filter((lead) => ["replied", "bought", "connected"].includes(lead.normalizedStatus) || lead.hasPrice)
    .slice(0, 8);

  return { counters, newLeads, statusChanges, attention, currentLeads };
}

function formatMarketingYoutubeReport(summary, { forced = false } = {}) {
  const { counters, newLeads, statusChanges, attention } = summary;
  const statusLine = ["research", "selected", "contacted", "replied", "bought", "connected", "rejected"]
    .map((status) => `${marketingStatusLabel(status)}: <b>${counters.byStatus[status] || 0}</b>`)
    .join("\n");
  const changes = statusChanges.length
    ? statusChanges.slice(0, 8).map((item) => `• ${escapeTelegramHtml(item.name)}: ${marketingStatusLabel(item.from)} → <b>${marketingStatusLabel(item.to)}</b>`).join("\n")
    : "• переходов по статусам с прошлого отчёта нет";
  const newBlock = newLeads.length
    ? newLeads.slice(0, 8).map((lead) => `• ${escapeTelegramHtml(lead.name)}${lead.region ? ` · ${escapeTelegramHtml(lead.region)}` : ""}`).join("\n")
    : "• новых блогеров с прошлого отчёта нет";
  const attentionBlock = attention.length
    ? attention.map((lead) => `• ${escapeTelegramHtml(lead.name)} — ${escapeTelegramHtml(lead.status)}${lead.price ? ` · ${escapeTelegramHtml(lead.price)}` : ""}`).join("\n")
    : "• пока нет ответов/цен/подключений для реакции";

  return [
    `<b>Маркетинг / YouTube — ${forced ? "ручной отчёт" : "ежедневный отчёт"}</b>`,
    "",
    `Всего блогеров в базе: <b>${counters.total}</b>`,
    `Есть контакт: <b>${counters.withContact}</b>`,
    `Есть цена/бюджет: <b>${counters.withPrice}</b>`,
    `Суммарно подписчиков: <b>${counters.totalSubscribers.toLocaleString("ru-RU")}</b>`,
    "",
    "<b>Статусы</b>",
    statusLine,
    "",
    "<b>Что изменилось</b>",
    changes,
    "",
    "<b>Новые лиды</b>",
    newBlock,
    "",
    "<b>Куда смотреть сейчас</b>",
    attentionBlock,
    "",
    `<a href="${MARKETING_YOUTUBE_BOARD_URL}">Открыть YouTube-парсер</a>`,
  ].join("\n");
}

async function runMarketingYoutubeMonitor({ notify = true, force = false } = {}) {
  const now = new Date();
  const reportDate = getMoscowDateKey(now);
  const previous = await readContent(MARKETING_YOUTUBE_MONITOR_STATE_KEY, { reportDate: "", sentReportDate: "", leads: {} });
  if (!force && notify && previous.sentReportDate === reportDate) {
    return { ok: true, skipped: true, reason: "already_sent_today", reportDate };
  }

  const leads = await collectMarketingYoutubeLeads();
  const summary = summarizeMarketingYoutubeLeads(leads, previous);
  const text = formatMarketingYoutubeReport(summary, { forced: force });
  let notification = { ok: true, skipped: true, reason: "notify_disabled" };
  if (notify) {
    notification = await sendMarketingTelegramMessage(text, { parse_mode: "HTML" });
  }

  await writeInternalState(MARKETING_YOUTUBE_MONITOR_STATE_KEY, {
    reportDate,
    sentReportDate: notification.ok && notify ? reportDate : previous.sentReportDate || "",
    checkedAt: now.toISOString(),
    leads: notification.ok || !notify ? summary.currentLeads : previous.leads || {},
    counters: summary.counters,
    lastNotification: notification,
  });

  return {
    ok: notification.ok !== false,
    reportDate,
    counters: summary.counters,
    newLeads: summary.newLeads.length,
    statusChanges: summary.statusChanges.length,
    notification,
    text,
  };
}

function firstMarketingSourceValue(row, fields = []) {
  for (const field of fields) {
    const value = String(row?.[field] || "").trim();
    if (value) return value;
  }
  return "";
}

async function collectMarketingSourceSnapshot() {
  const entries = await Promise.all(MARKETING_SOURCE_CONFIGS.map(async (config) => {
    const [rows, outreach] = await Promise.all([
      readContent(config.key, []),
      config.outreachKey ? readContent(config.outreachKey, {}) : Promise.resolve({}),
    ]);
    const records = {};
    const activeRows = (Array.isArray(rows) ? rows : []).filter((row) => row && !row.deleted);
    const idCounts = activeRows.reduce((counts, row) => {
      const id = String(row.id || "").trim();
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
      return counts;
    }, new Map());
    for (const [index, row] of activeRows.entries()) {
      if (!row || row.deleted) continue;
      const name = firstMarketingSourceValue(row, config.nameFields) || `Запись ${index + 1}`;
      const rawId = String(row.id || "").trim();
      const rowId = rawId && idCounts.get(rawId) === 1
        ? rawId
        : String(row.profileUrl || row.url || `${rawId || config.id}:${index}`);
      const outreachRecord = outreach && typeof outreach === "object" ? outreach[row.id] : null;
      records[rowId] = {
        name,
        status: String(outreachRecord?.status || row.status || "").trim(),
      };
    }
    return [config.id, {
      directionId: config.directionId,
      label: config.label,
      records,
    }];
  }));

  return Object.fromEntries(entries);
}

async function runMarketingDashboardMonitor({ notify = true } = {}) {
  const now = new Date();
  const checkedAt = now.toISOString();
  const dateKey = getMoscowDateKey(now);
  const dashboard = await readContent(MARKETING_DASHBOARD_KEY, null);
  if (!dashboard?.directions) {
    return {
      ok: true,
      changed: false,
      notified: false,
      reason: "dashboard_not_initialized",
    };
  }

  const [previous, sourceSnapshot] = await Promise.all([
    readContent(MARKETING_DASHBOARD_MONITOR_STATE_KEY, {
      snapshot: null,
      sourceSnapshot: null,
      pendingEvents: [],
      reminded: {},
    }),
    collectMarketingSourceSnapshot(),
  ]);
  const hasBaseline = Boolean(previous?.snapshot?.directions);
  const changedEvents = hasBaseline
    ? collectMarketingDashboardEvents(previous.snapshot, dashboard, checkedAt)
    : [];
  const sourceEvents = hasBaseline && previous.sourceSnapshot
    ? collectMarketingSourceEvents(previous.sourceSnapshot, sourceSnapshot, checkedAt)
    : [];
  const dueResult = hasBaseline
    ? collectMarketingDueEvents(dashboard, dateKey, previous.reminded || {})
    : { events: [], reminded: previous.reminded || {} };
  const pendingEvents = mergeMarketingEvents(
    previous.pendingEvents || [],
    [...changedEvents, ...sourceEvents, ...dueResult.events],
  );

  let notification = { ok: true, skipped: true, reason: hasBaseline ? "no_changes" : "baseline_created" };
  let remainingEvents = pendingEvents;
  if (notify && pendingEvents.length) {
    const text = formatMarketingDashboardDigest(pendingEvents, MARKETING_DASHBOARD_URL);
    notification = await sendMarketingTelegramMessage(text, { parse_mode: "HTML" });
    if (notification.ok) remainingEvents = [];
  }

  await writeInternalState(MARKETING_DASHBOARD_MONITOR_STATE_KEY, {
    snapshot: dashboard,
    sourceSnapshot,
    pendingEvents: remainingEvents,
    reminded: dueResult.reminded,
    checkedAt,
    lastDeliveredAt: notification.ok && !notification.skipped
      ? checkedAt
      : previous.lastDeliveredAt || "",
    lastNotification: notification,
  });

  return {
    ok: !(notify && pendingEvents.length && notification.ok === false),
    changed: changedEvents.length > 0 || sourceEvents.length > 0 || dueResult.events.length > 0,
    baselineCreated: !hasBaseline,
    detected: changedEvents.length + sourceEvents.length + dueResult.events.length,
    pending: remainingEvents.length,
    notified: Boolean(notification.ok && !notification.skipped),
    notification,
  };
}

async function getMarketingDashboardMonitorStatus() {
  const [state, chatId] = await Promise.all([
    readContent(MARKETING_DASHBOARD_MONITOR_STATE_KEY, {}),
    getMarketingTelegramChatId(),
  ]);
  return {
    ok: true,
    configured: Boolean(chatId),
    pending: Array.isArray(state.pendingEvents) ? state.pendingEvents.length : 0,
    checkedAt: state.checkedAt || "",
    lastDeliveredAt: state.lastDeliveredAt || "",
    lastNotification: state.lastNotification
      ? {
        ok: state.lastNotification.ok !== false,
      }
      : null,
  };
}

async function readBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("request_body_too_large");
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function readBinaryBody(request, maxBytes = MAX_BODY_BYTES) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("request_body_too_large");
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function filePathForKey(key) {
  return path.join(STORE_DIR, `${key}.json`);
}

async function writeInternalState(key, value) {
  await mkdir(STORE_DIR, { recursive: true });
  const targetPath = filePathForKey(key);
  const tempPath = `${targetPath}.${Date.now()}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
  await rename(tempPath, targetPath);
}

async function hasMarketingWriteSession(request) {
  const token = parseCookies(request)[MARKETING_SESSION_COOKIE] || "";
  if (!token) return false;

  const now = Date.now();
  const tokenHash = hashMarketingSession(token);
  const state = await readContent(MARKETING_BROWSER_SESSIONS_KEY, { sessions: [] });
  return (Array.isArray(state.sessions) ? state.sessions : []).some((session) => (
    session?.tokenHash === tokenHash && Date.parse(session.expiresAt || "") > now
  ));
}

async function hasFinancePasswordSession(request) {
  const token = parseCookies(request)[FINANCE_SESSION_COOKIE] || "";
  if (!FINANCE_PASSWORD || !token) return false;

  const now = Date.now();
  const tokenHash = hashMarketingSession(token);
  const state = await readContent(FINANCE_BROWSER_SESSIONS_KEY, { sessions: [] });
  return (Array.isArray(state.sessions) ? state.sessions : []).some((session) => (
    session?.tokenHash === tokenHash
    && session?.passwordFingerprint === FINANCE_PASSWORD_FINGERPRINT
    && Date.parse(session.expiresAt || "") > now
  ));
}

async function hasFinanceContentAccess(request) {
  return hasFinancePasswordSession(request);
}

async function exchangeFinanceBrowserSession(request) {
  if (!FINANCE_PASSWORD) {
    return { ok: false, status: 503, error: "finance_password_not_configured" };
  }

  const body = await readBody(request);
  const parsed = JSON.parse(body || "{}");
  const suppliedPassword = String(parsed.password || "").trim();
  const { key: loginKey, attempt } = getFinanceLoginAttempt(request);
  if (attempt.count >= FINANCE_LOGIN_MAX_ATTEMPTS) {
    return { ok: false, status: 429, error: "finance_login_rate_limited" };
  }
  if (!suppliedPassword || !secureTextEqual(suppliedPassword, FINANCE_PASSWORD)) {
    financeLoginAttempts.set(loginKey, { ...attempt, count: attempt.count + 1 });
    return { ok: false, status: 401, error: "invalid_finance_password" };
  }
  financeLoginAttempts.delete(loginKey);

  const execute = async () => {
    const token = randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + FINANCE_SESSION_TTL_MS).toISOString();
    const state = await readContent(FINANCE_BROWSER_SESSIONS_KEY, { sessions: [] });
    const sessions = (Array.isArray(state.sessions) ? state.sessions : [])
      .filter((session) => Date.parse(session?.expiresAt || "") > now.getTime())
      .slice(-99);
    sessions.push({
      tokenHash: hashMarketingSession(token),
      passwordFingerprint: FINANCE_PASSWORD_FINGERPRINT,
      createdAt: now.toISOString(),
      expiresAt,
    });
    await writeInternalState(FINANCE_BROWSER_SESSIONS_KEY, { sessions });

    const host = String(request.headers.host || "").split(":")[0];
    const secureAttribute = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) ? "" : "; Secure";
    return {
      ok: true,
      status: 200,
      expiresAt,
      cookie: `${FINANCE_SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly${secureAttribute}; SameSite=Strict; Path=/; Max-Age=${FINANCE_SESSION_TTL_MS / 1000}`,
    };
  };

  const result = financeSessionMutationQueue.then(execute, execute);
  financeSessionMutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function revokeFinanceBrowserSession(request) {
  const token = parseCookies(request)[FINANCE_SESSION_COOKIE] || "";
  const host = String(request.headers.host || "").split(":")[0];
  const secureAttribute = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) ? "" : "; Secure";
  const clearCookie = `${FINANCE_SESSION_COOKIE}=; HttpOnly${secureAttribute}; SameSite=Strict; Path=/; Max-Age=0`;
  if (!token) return clearCookie;

  const tokenHash = hashMarketingSession(token);
  const execute = async () => {
    const state = await readContent(FINANCE_BROWSER_SESSIONS_KEY, { sessions: [] });
    const currentSessions = Array.isArray(state.sessions) ? state.sessions : [];
    const sessions = currentSessions.filter((session) => session?.tokenHash !== tokenHash);
    if (sessions.length === currentSessions.length) return clearCookie;
    await writeInternalState(FINANCE_BROWSER_SESSIONS_KEY, { sessions });
    return clearCookie;
  };

  const result = financeSessionMutationQueue.then(execute, execute);
  financeSessionMutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function exchangeMarketingBrowserSession(request) {
  const body = await readBody(request);
  const parsed = JSON.parse(body || "{}");
  const suppliedCode = String(parsed.code || "").trim();
  const suppliedPassword = String(parsed.password || "").trim();
  const login = getMarketingLoginAttempt(request);
  if (login.attempt.count >= MARKETING_LOGIN_MAX_ATTEMPTS) {
    return { ok: false, status: 429, error: "too_many_marketing_login_attempts" };
  }
  const execute = async () => {
    const linkRequest = await readContent(MARKETING_BROWSER_LINK_REQUEST_KEY, {});
    const validLinkCode = suppliedCode
      && suppliedCode === String(linkRequest.code || "")
      && Date.parse(linkRequest.expiresAt || "") > Date.now();
    const suppliedPasswordHash = suppliedPassword
      ? createHash("sha256").update(suppliedPassword).digest("hex")
      : "";
    const validMainPassword = Boolean(
      suppliedPasswordHash
      && SUPERSUS_ACCESS_PASSWORD_HASH
      && secureTextEqual(suppliedPasswordHash, SUPERSUS_ACCESS_PASSWORD_HASH),
    );
    if (!validLinkCode && !validMainPassword) {
      marketingLoginAttempts.set(login.key, { ...login.attempt, count: login.attempt.count + 1 });
      return { ok: false, status: 401, error: "invalid_or_expired_marketing_access" };
    }
    marketingLoginAttempts.delete(login.key);

    const token = randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + MARKETING_SESSION_TTL_MS).toISOString();
    const state = await readContent(MARKETING_BROWSER_SESSIONS_KEY, { sessions: [] });
    const sessions = (Array.isArray(state.sessions) ? state.sessions : [])
      .filter((session) => Date.parse(session?.expiresAt || "") > now.getTime())
      .slice(-19);
    sessions.push({
      tokenHash: hashMarketingSession(token),
      createdAt: now.toISOString(),
      expiresAt,
      createdBy: validLinkCode ? linkRequest.createdBy || null : "supersus_access_gate",
    });
    if (validLinkCode) {
      await writeInternalState(MARKETING_BROWSER_LINK_REQUEST_KEY, {});
    }
    await writeInternalState(MARKETING_BROWSER_SESSIONS_KEY, { sessions });

    const host = String(request.headers.host || "").split(":")[0];
    const secureAttribute = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) ? "" : "; Secure";
    return {
      ok: true,
      status: 200,
      expiresAt,
      cookie: `${MARKETING_SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly${secureAttribute}; SameSite=Strict; Path=/; Max-Age=${Math.floor(MARKETING_SESSION_TTL_MS / 1000)}`,
    };
  };

  const result = marketingSessionMutationQueue.then(execute, execute);
  marketingSessionMutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function backupExistingContent(key, targetPath) {
  try {
    const raw = await readFile(targetPath, "utf8");
    const keyBackupDir = path.join(BACKUP_DIR, key);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    await mkdir(keyBackupDir, { recursive: true });
    await writeFile(path.join(keyBackupDir, `${timestamp}.json`), raw, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

await mkdir(STORE_DIR, { recursive: true });

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/api/content/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/marketing/browser-session" && request.method === "POST") {
      const result = await exchangeMarketingBrowserSession(request);
      sendJson(
        response,
        result.status,
        result.ok ? { ok: true, expiresAt: result.expiresAt } : { ok: false, error: result.error },
        result.cookie ? { "Set-Cookie": result.cookie } : {},
      );
      return;
    }

    if (url.pathname === "/api/marketing/browser-session" && request.method === "GET") {
      sendJson(response, 200, { ok: true, authorized: await hasMarketingWriteSession(request) });
      return;
    }

    if (url.pathname === "/api/marketing/hermes-message" && request.method === "POST") {
      if (!await hasMarketingWriteSession(request)) {
        sendJson(response, 401, { ok: false, error: "assistant_auth_required" });
        return;
      }
      const rateLimit = getHermesAssistantRateLimit(request);
      if (!rateLimit.allowed) {
        sendJson(response, 429, { ok: false, error: "assistant_rate_limit" }, { "Retry-After": String(rateLimit.retryAfter) });
        return;
      }
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const prompt = String(parsed?.prompt || "").trim();
      if (!prompt || prompt.length > HERMES_ASSISTANT_MAX_PROMPT_LENGTH) {
        sendJson(response, 400, { ok: false, error: prompt ? "prompt_too_long" : "empty_prompt" });
        return;
      }
      const result = await askHermesAssistant(prompt);
      sendJson(
        response,
        result.ok ? 200 : result.status || 502,
        result.ok ? { ok: true, answer: result.answer } : { ok: false, error: result.error },
      );
      return;
    }

    if (url.pathname === "/api/marketing/hermes-health" && request.method === "GET") {
      if (!await hasMarketingWriteSession(request)) {
        sendJson(response, 401, { ok: false, error: "assistant_auth_required" });
        return;
      }
      const health = await checkHermesAssistantHealth();
      sendJson(response, health.online ? 200 : 503, { ok: health.online, ...health });
      return;
    }

    if (url.pathname === "/api/marketing/hermes-speech" && request.method === "POST") {
      if (!await hasMarketingWriteSession(request)) {
        sendJson(response, 401, { ok: false, error: "assistant_auth_required" });
        return;
      }
      const rateLimit = getHermesSpeechRateLimit(request);
      if (!rateLimit.allowed) {
        sendJson(response, 429, { ok: false, error: "speech_rate_limit" }, { "Retry-After": String(rateLimit.retryAfter) });
        return;
      }
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const text = prepareHermesSpeechText(parsed?.text);
      if (!text || text.length > HERMES_SPEECH_MAX_TEXT_LENGTH) {
        sendJson(response, 400, { ok: false, error: text ? "speech_text_too_long" : "empty_speech_text" });
        return;
      }
      const voiceProfile = resolveHermesVoiceProfile(parsed?.voiceId);
      if (!voiceProfile) {
        sendJson(response, 400, { ok: false, error: "unknown_voice_profile" });
        return;
      }
      const speech = await synthesizeHermesSpeech(text, {
        url: PIPER_TTS_URL,
        edgeTtsBin: voiceProfile.provider === "edge-tts" ? EDGE_TTS_BIN : "",
        edgeVoice: voiceProfile.voice,
        edgeRate: voiceProfile.rate,
        edgePitch: voiceProfile.pitch,
        edgeVolume: voiceProfile.volume,
        timeoutMs: HERMES_SPEECH_TIMEOUT_MS,
        maxAudioBytes: HERMES_SPEECH_MAX_AUDIO_BYTES,
      });
      if (!speech.ok) {
        sendJson(response, speech.status || 503, { ok: false, error: speech.error });
        return;
      }
      sendAudio(response, speech.audio, speech.contentType);
      return;
    }

    if (url.pathname === "/api/marketing/hermes-transcription" && request.method === "POST") {
      if (!await hasMarketingWriteSession(request)) {
        sendJson(response, 401, { ok: false, error: "assistant_auth_required" });
        return;
      }
      const rateLimit = getHermesTranscriptionRateLimit(request);
      if (!rateLimit.allowed) {
        sendJson(response, 429, { ok: false, error: "transcription_rate_limit" }, { "Retry-After": String(rateLimit.retryAfter) });
        return;
      }
      const contentType = String(request.headers["content-type"] || "audio/webm").split(";")[0].trim();
      if (!contentType.startsWith("audio/")) {
        sendJson(response, 415, { ok: false, error: "unsupported_audio_type" });
        return;
      }
      const audio = await readBinaryBody(request, HERMES_TRANSCRIPTION_MAX_AUDIO_BYTES);
      const extension = contentType.includes("ogg") ? "ogg" : contentType.includes("mp4") ? "m4a" : "webm";
      const transcription = await transcribeHermesAudio(audio, {
        url: WHISPER_ASR_URL,
        contentType,
        filename: `hermes-voice.${extension}`,
        timeoutMs: HERMES_TRANSCRIPTION_TIMEOUT_MS,
      });
      sendJson(
        response,
        transcription.ok ? 200 : transcription.status || 503,
        transcription.ok ? { ok: true, text: transcription.text } : { ok: false, error: transcription.error },
      );
      return;
    }

    const isFinanceBrowserSessionRoute = url.pathname === "/api/content/finance-browser-session"
      || url.pathname === "/api/finance/browser-session";

    if (isFinanceBrowserSessionRoute && request.method === "POST") {
      const result = await exchangeFinanceBrowserSession(request);
      sendJson(
        response,
        result.status,
        result.ok ? { ok: true, expiresAt: result.expiresAt } : { ok: false, error: result.error },
        result.cookie ? { "Set-Cookie": result.cookie } : {},
      );
      return;
    }

    if (isFinanceBrowserSessionRoute && request.method === "GET") {
      sendJson(response, 200, { ok: true, authorized: await hasFinanceContentAccess(request) });
      return;
    }

    if (isFinanceBrowserSessionRoute && request.method === "DELETE") {
      const cookie = await revokeFinanceBrowserSession(request);
      sendJson(response, 200, { ok: true }, { "Set-Cookie": cookie });
      return;
    }

    if (url.pathname === "/api/content/youtube-search" && request.method === "GET") {
      const result = await searchYoutubeApi(url);
      sendJson(response, result.ok ? 200 : result.status || 400, result);
      return;
    }

    if (url.pathname === "/api/pools/pancake-usdt-usdc" && request.method === "GET") {
      const result = await getPancakePoolSnapshot();
      sendJson(response, result.ok ? 200 : result.status || 502, result);
      return;
    }

    if (url.pathname === "/api/contracts/atlas-balances" && request.method === "GET") {
      const result = await getAtlasContractBalancesSnapshot();
      sendJson(response, 200, result);
      return;
    }

    if (url.pathname === "/api/contracts/atlas-flows" && request.method === "GET") {
      const result = await getAtlasContractFlowSnapshot();
      sendJson(response, 200, result);
      return;
    }

    if (url.pathname === "/api/youtrack/issues" && request.method === "GET") {
      const result = await getYouTrackIssues({
        query: url.searchParams.get("query") || "",
        top: url.searchParams.get("top") || 50,
      });
      sendJson(response, result.ok ? 200 : result.status || 502, result);
      return;
    }

    if (url.pathname === "/api/youtrack/check" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = body ? JSON.parse(body) : {};
      const result = await checkYouTrackChanges({ notify: parsed.notify !== false });
      sendJson(response, result.ok ? 200 : result.status || 502, result);
      return;
    }

    if (url.pathname === "/api/youtrack/digest" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = body ? JSON.parse(body) : {};
      const result = await sendYouTrackDigest({
        notify: parsed.notify !== false,
        force: parsed.force === true,
      });
      sendJson(response, result.ok ? 200 : result.status || 502, result);
      return;
    }

    if (url.pathname === "/internal/marketing/youtube-monitor" && request.method === "POST") {
      if (!hasInternalMonitorAccess(request)) {
        sendJson(response, 403, { ok: false, error: "forbidden" });
        return;
      }
      const body = await readBody(request);
      const parsed = body ? JSON.parse(body) : {};
      const result = await runMarketingYoutubeMonitor({
        notify: parsed.notify !== false,
        force: parsed.force === true,
      });
      sendJson(response, result.ok ? 200 : result.notification?.status || 502, result);
      return;
    }

    if (url.pathname === "/api/marketing/dashboard-monitor" && request.method === "GET") {
      const result = await getMarketingDashboardMonitorStatus();
      sendJson(response, 200, result);
      return;
    }

    if (url.pathname === "/internal/marketing/dashboard-monitor" && request.method === "POST") {
      if (!hasInternalMonitorAccess(request)) {
        sendJson(response, 403, { ok: false, error: "forbidden" });
        return;
      }
      const body = await readBody(request);
      const parsed = body ? JSON.parse(body) : {};
      const result = await runMarketingDashboardMonitor({
        notify: parsed.notify !== false,
      });
      sendJson(response, result.ok ? 200 : result.notification?.status || 502, result);
      return;
    }

    if (url.pathname === "/api/telegram/tasks" && request.method === "GET") {
      const category = url.searchParams.get("category") || "";
      const assignee = url.searchParams.get("assignee") || "";
      const tasks = await collectTasks({ category, assignee, onlyActive: url.searchParams.get("all") !== "1" });
      sendJson(response, 200, { ok: true, tasks });
      return;
    }

    if (url.pathname === "/api/telegram/tasks" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const result = await addTelegramTask(parsed);
      sendJson(response, 201, { ok: true, ...result });
      return;
    }

    if (url.pathname === "/api/telegram/ops" && request.method === "GET") {
      const ops = await readContent(CONTENT_KEYS.telegramOps, { decisions: [], questions: [], reports: [], reminders: [] });
      sendJson(response, 200, { ok: true, value: ops });
      return;
    }

    if (url.pathname === "/api/telegram/ops" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const type = parsed.type || "";
      if (!["decisions", "questions", "reports", "reminders"].includes(type)) {
        sendJson(response, 400, { ok: false, error: "invalid_operation_type" });
        return;
      }
      const entry = await appendTelegramOperation(type, parsed.payload || parsed);
      sendJson(response, 201, { ok: true, entry });
      return;
    }

    if (url.pathname === "/api/telegram/push-subtask" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const text = formatTelegramSubtaskPush(parsed);
      const result = await sendTelegramMessage(text, { parse_mode: "HTML" }, String(parsed.chatId || "").trim());
      sendJson(response, result.ok ? 200 : result.status, result.ok ? { ok: true, ...result } : { ok: false, error: result.error });
      return;
    }

    if (url.pathname === "/api/telegram/verify-channel" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const result = await verifyTelegramChannel(parsed.lead || parsed);
      sendJson(
        response,
        result.ok ? 200 : result.status || 502,
        result.ok
          ? { ok: true, provider: result.provider, patch: result.patch, attempts: result.attempts || [] }
          : { ok: false, error: result.error, attempts: result.attempts || [] },
      );
      return;
    }

    if (url.pathname === "/api/outreach/send-email" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const result = await sendOutreachEmail(parsed);
      sendJson(response, result.ok ? 200 : result.status, result.ok ? { ok: true, ...result } : { ok: false, error: result.error });
      return;
    }

    const key = getContentKey(url);
    if (!key) {
      sendJson(response, 404, { ok: false, error: "not_found" });
      return;
    }
    if (INTERNAL_CONTENT_KEYS.has(key)) {
      sendJson(response, 404, { ok: false, error: "not_found" });
      return;
    }

    if (request.method === "GET") {
      if (FINANCE_CONTENT_KEYS.has(key) && !await hasFinanceContentAccess(request)) {
        sendJson(response, 401, { ok: false, error: "finance_read_auth_required" });
        return;
      }
      try {
        const raw = await readFile(filePathForKey(key), "utf8");
        sendJson(response, 200, { ok: true, exists: true, value: JSON.parse(raw) });
      } catch (error) {
        if (error?.code === "ENOENT") {
          sendJson(response, 200, { ok: true, exists: false, value: null });
          return;
        }
        throw error;
      }
      return;
    }

    if (request.method === "PUT") {
      if (FINANCE_CONTENT_KEYS.has(key) && !await hasFinanceContentAccess(request)) {
        sendJson(response, 401, { ok: false, error: "finance_write_auth_required" });
        return;
      }
      if (!FINANCE_CONTENT_KEYS.has(key) && MARKETING_WRITE_CONTENT_KEYS.has(key) && !await hasMarketingWriteSession(request)) {
        sendJson(response, 401, { ok: false, error: "marketing_write_auth_required" });
        return;
      }
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const value = Object.prototype.hasOwnProperty.call(parsed, "value") ? parsed.value : parsed;
      const persistValue = async () => {
        const targetPath = filePathForKey(key);
        const tempPath = `${targetPath}.${Date.now()}.${randomBytes(6).toString("hex")}.tmp`;
        if (key === EXPENSE_CENTER_KEY) {
          const current = await readContent(key, { revision: 0 });
          const currentRevision = Number(current?.revision || 0);
          const incomingRevision = Number(value?.revision || 0);
          if (incomingRevision !== currentRevision + 1) {
            return {
              ok: false,
              status: 409,
              error: "expense_revision_conflict",
              revision: currentRevision,
            };
          }
        }
        await backupExistingContent(key, targetPath);
        await writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
        await rename(tempPath, targetPath);
        return {
          ok: true,
          status: 200,
          revision: key === EXPENSE_CENTER_KEY ? Number(value?.revision || 0) : undefined,
        };
      };

      let result;
      if (key === EXPENSE_CENTER_KEY) {
        const operation = expenseCenterMutationQueue.then(persistValue, persistValue);
        expenseCenterMutationQueue = operation.then(() => undefined, () => undefined);
        result = await operation;
      } else {
        result = await persistValue();
      }
      sendJson(
        response,
        result.status,
        result.ok
          ? { ok: true, exists: true, revision: result.revision }
          : { ok: false, error: result.error, revision: result.revision },
      );
      return;
    }

    sendJson(response, 405, { ok: false, error: "method_not_allowed" });
  } catch (error) {
    const statusCode = error?.message === "request_body_too_large" ? 413 : 500;
    sendJson(response, statusCode, { ok: false, error: error?.message || "server_error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Atlas content API listening on 127.0.0.1:${PORT}`);
});
