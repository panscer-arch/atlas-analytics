import { createHash } from "node:crypto";
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";

import { readContent, writeContent } from "./telegram-task-store.mjs";

export const AGENT_REACH_RUNS_KEY = "atlas.analytics.agentReach.runs.v1";
export const AGENT_REACH_LEADS_KEY = "atlas.analytics.socialParser.leads.v2";

const AGENT_REACH_BIN = String(
  process.env.AGENT_REACH_BIN || "/opt/atlas-agent-reach/venv/bin/agent-reach",
).trim();
const MCPORTER_BIN = String(
  process.env.AGENT_REACH_MCPORTER_BIN || "/opt/atlas-agent-reach/node_modules/.bin/mcporter",
).trim();
const MCPORTER_CONFIG = String(
  process.env.AGENT_REACH_MCPORTER_CONFIG || "/opt/atlas-agent-reach/mcporter.json",
).trim();
const SEARCH_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.AGENT_REACH_SEARCH_TIMEOUT_MS || 35000), 5000),
  60000,
);
const MAX_RESULTS = 30;
const MAX_QUERY_LENGTH = 240;
const MAX_OUTPUT_BYTES = 3 * 1024 * 1024;

export const AGENT_REACH_PLATFORM_CONFIG = {
  linkedin: {
    label: "LinkedIn",
    scope: "(site:linkedin.com/in OR site:linkedin.com/company)",
    hosts: ["linkedin.com"],
  },
  facebook: {
    label: "Facebook",
    scope: "site:facebook.com",
    hosts: ["facebook.com"],
  },
  x: {
    label: "X",
    scope: "(site:x.com OR site:twitter.com)",
    hosts: ["x.com", "twitter.com"],
  },
  youtube: {
    label: "YouTube",
    scope: "(site:youtube.com/@ OR site:youtube.com/channel)",
    hosts: ["youtube.com"],
  },
  reddit: {
    label: "Reddit",
    scope: "site:reddit.com",
    hosts: ["reddit.com"],
  },
  github: {
    label: "GitHub",
    scope: "site:github.com",
    hosts: ["github.com"],
  },
  web: {
    label: "Web",
    scope: "",
    hosts: [],
  },
};

function clampLimit(value) {
  const parsed = Number(value || 10);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_RESULTS);
}

function normalizeText(value, maxLength = 4000) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

function isAllowedResultUrl(value, hosts) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (!hosts.length) return true;
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function stableLeadId(platform, url) {
  const digest = createHash("sha256").update(`${platform}:${url}`).digest("hex").slice(0, 16);
  return `agent-reach-${platform}-${digest}`;
}

function scoreResult({ title, highlights, country, language }) {
  let score = 52;
  if (title.length >= 12) score += 8;
  if (highlights.length >= 120) score += 10;
  if (country && country.toLowerCase() !== "global") {
    const countryPattern = new RegExp(country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (countryPattern.test(`${title} ${highlights}`)) score += 8;
  }
  if (language && language.toLowerCase() !== "en") score += 2;
  return Math.min(score, 92);
}

function fieldFromBlock(block, label) {
  const pattern = new RegExp(`^${label}:\\s*(.+)$`, "mi");
  return normalizeText(block.match(pattern)?.[1] || "", 1000);
}

export function parseAgentReachSearchText(text, request = {}) {
  const platform = String(request.platform || "web").toLowerCase();
  const config = AGENT_REACH_PLATFORM_CONFIG[platform];
  if (!config) return [];

  const capturedAt = new Date().toISOString();
  const blocks = normalizeText(text, MAX_OUTPUT_BYTES)
    .split(/\n\s*---\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
  const seen = new Set();

  return blocks.flatMap((block) => {
    const title = fieldFromBlock(block, "Title");
    const url = fieldFromBlock(block, "URL");
    if (!title || !url || !isAllowedResultUrl(url, config.hosts)) return [];

    const canonicalUrl = url.replace(/[?#].*$/, "").replace(/\/+$/, "");
    const dedupeKey = canonicalUrl.toLowerCase();
    if (seen.has(dedupeKey)) return [];
    seen.add(dedupeKey);

    const highlightsStart = block.search(/^Highlights:\s*/mi);
    const highlights = highlightsStart >= 0
      ? normalizeText(block.slice(highlightsStart).replace(/^Highlights:\s*/i, ""), 2800)
      : "";
    const publishedAt = fieldFromBlock(block, "Published");
    const author = fieldFromBlock(block, "Author");

    return [{
      id: stableLeadId(platform, canonicalUrl),
      platform,
      username: "",
      displayName: title,
      profileUrl: canonicalUrl,
      sourceUrl: canonicalUrl,
      bioExcerpt: highlights,
      publicContact: "Проверить публичные контакты на странице",
      segment: normalizeText(request.segment || "cryptoMlm", 80),
      country: normalizeText(request.country || "Global", 80),
      language: normalizeText(request.language || "en", 20),
      relevanceReason: `Найдено Agent Reach через публичный поиск ${config.label}. Нужна ручная проверка профиля и контактов.`,
      score: scoreResult({
        title,
        highlights,
        country: request.country,
        language: request.language,
      }),
      reviewStatus: "not_contacted",
      contactStatus: "not_contacted",
      consentStatus: "not_requested",
      lawfulBasis: "legitimate_interest",
      sourceType: `${platform}_public_search`,
      rawProvider: "agent-reach/exa",
      author,
      publishedAt,
      capturedAt,
    }];
  });
}

function parseMcporterPayload(stdout) {
  const payload = JSON.parse(stdout);
  const text = Array.isArray(payload?.content)
    ? payload.content.filter((item) => item?.type === "text").map((item) => item.text || "").join("\n\n")
    : "";
  if (!text) throw new Error("agent_reach_empty_search_response");
  return text;
}

function runProcess(binary, args, { timeoutMs = SEARCH_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        HOME: process.env.AGENT_REACH_HOME || "/var/lib/atlas-agent-reach",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let settled = false;
    let timer;

    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const capture = (chunk, target) => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_OUTPUT_BYTES) {
        child.kill("SIGKILL");
        finish(() => reject(new Error("agent_reach_output_too_large")));
        return;
      }
      if (target === "stdout") stdout += chunk.toString("utf8");
      else stderr += chunk.toString("utf8");
    };

    child.stdout.on("data", (chunk) => capture(chunk, "stdout"));
    child.stderr.on("data", (chunk) => capture(chunk, "stderr"));
    child.on("error", (error) => finish(() => reject(error)));
    child.on("close", (code) => finish(() => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(normalizeText(stderr || `agent_reach_exit_${code}`, 1000)));
    }));

    timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new Error("agent_reach_timeout")));
    }, timeoutMs);
  });
}

async function appendRun(run) {
  const current = await readContent(AGENT_REACH_RUNS_KEY, []);
  const rows = Array.isArray(current) ? current : [];
  await writeContent(AGENT_REACH_RUNS_KEY, [run, ...rows].slice(0, 200));
}

export async function searchAgentReachApi(request = {}) {
  const platform = String(request.platform || "").trim().toLowerCase();
  const config = AGENT_REACH_PLATFORM_CONFIG[platform];
  if (!config) {
    return {
      ok: false,
      status: 400,
      error: "unsupported_agent_reach_platform",
      message: "Эта площадка пока не подключена к Agent Reach.",
    };
  }

  const query = normalizeText(request.query, MAX_QUERY_LENGTH);
  if (query.length < 2) {
    return {
      ok: false,
      status: 400,
      error: "empty_agent_reach_query",
      message: "Укажите ключевые слова для поиска.",
    };
  }

  const limit = clampLimit(request.limit);
  const searchQuery = [config.scope, query, request.country, request.language]
    .map((value) => normalizeText(value, MAX_QUERY_LENGTH))
    .filter(Boolean)
    .join(" ");
  const startedAt = new Date().toISOString();
  const run = {
    id: `agent-reach-run-${Date.now()}`,
    platform,
    provider: "agent-reach/exa",
    status: "running",
    startedAt,
    request: {
      query,
      country: normalizeText(request.country || "Global", 80),
      language: normalizeText(request.language || "en", 20),
      segment: normalizeText(request.segment || "cryptoMlm", 80),
      limit,
    },
  };

  try {
    const expression = `exa.web_search_exa(query: ${JSON.stringify(searchQuery)}, numResults: ${limit})`;
    const result = await runProcess(MCPORTER_BIN, [
      "--config",
      MCPORTER_CONFIG,
      "call",
      expression,
      "--output",
      "json",
    ]);
    const items = parseAgentReachSearchText(parseMcporterPayload(result.stdout), {
      ...request,
      platform,
    }).slice(0, limit);
    const finishedRun = {
      ...run,
      status: "finished",
      finishedAt: new Date().toISOString(),
      counts: { normalized: items.length },
      errors: [],
    };
    await appendRun(finishedRun);
    return {
      ok: true,
      status: 200,
      provider: "agent-reach/exa",
      run: finishedRun,
      items,
    };
  } catch (error) {
    const message = normalizeText(error?.message || "agent_reach_search_failed", 1000);
    const finishedRun = {
      ...run,
      status: "failed",
      finishedAt: new Date().toISOString(),
      counts: { normalized: 0 },
      errors: [message],
    };
    await appendRun(finishedRun);
    return {
      ok: false,
      status: message.includes("ENOENT") || message.includes("not found") ? 503 : 502,
      error: "agent_reach_search_failed",
      message,
      run: finishedRun,
    };
  }
}

let statusCache = null;
let statusCacheAt = 0;

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function getAgentReachStatus() {
  if (statusCache && Date.now() - statusCacheAt < 60000) return statusCache;

  const [agentReachInstalled, mcporterInstalled, configInstalled] = await Promise.all([
    pathExists(AGENT_REACH_BIN),
    pathExists(MCPORTER_BIN),
    pathExists(MCPORTER_CONFIG),
  ]);
  let version = "";

  if (agentReachInstalled) {
    try {
      version = normalizeText((await runProcess(AGENT_REACH_BIN, ["--version"], { timeoutMs: 8000 })).stdout, 120);
    } catch {}
  }

  statusCache = {
    ok: agentReachInstalled && mcporterInstalled && configInstalled,
    version,
    provider: "Agent Reach + Exa MCP",
    agentReachInstalled,
    mcporterInstalled,
    configInstalled,
    supportedPlatforms: Object.keys(AGENT_REACH_PLATFORM_CONFIG),
    cookieBackendsEnabled: false,
    checkedAt: new Date().toISOString(),
  };
  statusCacheAt = Date.now();
  return statusCache;
}
