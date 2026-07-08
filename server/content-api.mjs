import http from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { addTelegramTask, appendTelegramOperation, collectTasks, CONTENT_KEYS, readContent, writeContent } from "./telegram-task-store.mjs";

const PORT = Number(process.env.ATLAS_CONTENT_API_PORT || 8787);
const STORE_DIR = process.env.ATLAS_CONTENT_STORE_DIR || "/var/lib/atlas-analytics-content";
const BACKUP_DIR = path.join(STORE_DIR, "_backups");
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const TELEGRAM_ENV_FILE = process.env.ATLAS_TELEGRAM_ENV_FILE || "/etc/atlas-telegram-bot.env";
const OUTREACH_LOG_KEY = "atlas.analytics.hyipOutreach.emailLog.v1";
const YOUTRACK_SNAPSHOT_KEY = "atlas.analytics.youtrackIssueSnapshot.v1";
const YOUTRACK_DIGEST_KEY = "atlas.analytics.youtrackDigestState.v1";
const YOUTRACK_STALE_MS = 24 * 60 * 60 * 1000;
const YOUTRACK_DAILY_DIGEST_HOUR_MSK = Number(process.env.ATLAS_YOUTRACK_DAILY_DIGEST_HOUR_MSK || 15);
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
const YOUTRACK_STATUSES = {
  TODO: "Нужно сделать",
  IN_PROGRESS: "В обработке",
  NEEDS_CLARIFICATION: "Нужно уточнение",
  TESTING: "Тестирование",
  RETURNED_TO_WORK: "Возвращено в работу",
  DONE: "Готово",
};
const YOUTRACK_STATUS_ORDER = [
  YOUTRACK_STATUSES.TODO,
  YOUTRACK_STATUSES.IN_PROGRESS,
  YOUTRACK_STATUSES.NEEDS_CLARIFICATION,
  YOUTRACK_STATUSES.TESTING,
  YOUTRACK_STATUSES.RETURNED_TO_WORK,
  YOUTRACK_STATUSES.DONE,
];
const YOUTRACK_STATUS_ALIASES = {
  "to do": YOUTRACK_STATUSES.TODO,
  todo: YOUTRACK_STATUSES.TODO,
  open: YOUTRACK_STATUSES.TODO,
  "in progress": YOUTRACK_STATUSES.IN_PROGRESS,
  done: YOUTRACK_STATUSES.DONE,
  fixed: YOUTRACK_STATUSES.DONE,
  resolved: YOUTRACK_STATUSES.DONE,
};
const YOUTRACK_SHOW_STOPPER_PATTERN = /show-stopper|critical|blocker|критичес|блокер/i;
const PROTECTED_CONTENT_KEYS = new Set([CONTENT_KEYS.telegramMemory]);
const PANCAKE_USDT_USDC_POOL = {
  network: "bsc",
  address: "0x92b7807bF19b7DDdf89b706143896d05228f3121",
  label: "PancakeSwap V3 USDT/USDC 0.01%",
};

let telegramEnvCache = null;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function getContentKey(url) {
  const match = url.pathname.match(/^\/api\/content\/([a-zA-Z0-9._-]+)$/);
  return match?.[1] || "";
}

async function readTelegramEnv() {
  if (telegramEnvCache) return telegramEnvCache;

  const env = {};
  try {
    const raw = await readFile(TELEGRAM_ENV_FILE, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) return;
      env[match[1]] = match[2].replace(/^['"]|['"]$/g, "").trim();
    });
  } catch {
    // Content API can still work without Telegram push configuration.
  }

  telegramEnvCache = env;
  return env;
}

async function getTelegramConfig() {
  const fileEnv = await readTelegramEnv();
  const token = process.env.TELEGRAM_BOT_TOKEN || fileEnv.TELEGRAM_BOT_TOKEN || "";
  const parseChatIds = (...values) => [...new Set(values
    .join(",")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean))];
  const preferredChatId = parseChatIds(
    process.env.ATLAS_YOUTRACK_TELEGRAM_CHAT_ID
    || fileEnv.ATLAS_YOUTRACK_TELEGRAM_CHAT_ID,
    process.env.TELEGRAM_PUSH_CHAT_ID || fileEnv.TELEGRAM_PUSH_CHAT_ID,
  )[0] || "";
  const targetChatIds = parseChatIds(
    process.env.ATLAS_YOUTRACK_TELEGRAM_CHAT_ID || fileEnv.ATLAS_YOUTRACK_TELEGRAM_CHAT_ID,
    process.env.TELEGRAM_PUSH_CHAT_ID || fileEnv.TELEGRAM_PUSH_CHAT_ID,
    process.env.TELEGRAM_PUSH_CHAT_IDS || fileEnv.TELEGRAM_PUSH_CHAT_IDS,
    process.env.TELEGRAM_ALLOWED_CHAT_IDS || fileEnv.TELEGRAM_ALLOWED_CHAT_IDS,
  );

  return { token, targetChatIds, preferredChatId };
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

function getHeader(request, name) {
  const value = request.headers?.[String(name).toLowerCase()];
  return Array.isArray(value) ? value[0] : value || "";
}

function isTelegramMemoryReadAllowed(request, url) {
  const token = normalizeTelegramValue(process.env.TELEGRAM_MEMORY_READ_TOKEN || "");
  if (!token) return false;
  const provided = normalizeTelegramValue(
    getHeader(request, "x-telegram-memory-token")
    || getHeader(request, "x-memory-token")
    || url.searchParams.get("token")
    || "",
  );
  return Boolean(provided) && provided === token;
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
  if (Number.isFinite(number) && number > 0) {
    return number < 100000000000 ? number * 1000 : number;
  }
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
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

function normalizeIssueStatus(status = "") {
  const normalizedStatus = String(status || "").trim();
  return YOUTRACK_STATUS_ALIASES[normalizedStatus.toLowerCase()] || normalizedStatus;
}

function issueNeedsAnswer(status = "") {
  return normalizeIssueStatus(status) === YOUTRACK_STATUSES.NEEDS_CLARIFICATION;
}

function issueWaitsForDeveloper(status = "") {
  const normalizedStatus = normalizeIssueStatus(status);
  return normalizedStatus === YOUTRACK_STATUSES.NEEDS_CLARIFICATION || normalizedStatus === YOUTRACK_STATUSES.TESTING;
}

function buildYouTrackStatusCounts(issues = []) {
  const counts = Object.fromEntries(YOUTRACK_STATUS_ORDER.map((status) => [status, 0]));
  for (const issue of issues) {
    const status = normalizeIssueStatus(issue.status);
    if (!status) continue;
    counts[status] = (counts[status] || 0) + 1;
  }
  return counts;
}

function normalizeYouTrackIssue(issue = {}, statusSinceMs = 0) {
  const config = getYouTrackConfig();
  const createdAtMs = toMillis(issue.created);
  const updatedAtMs = toMillis(issue.updated);
  const resolvedAtMs = toMillis(issue.resolved);
  const comments = (issue.comments || []).map(normalizeYouTrackComment).sort((a, b) => b.createdAtMs - a.createdAtMs);
  const latestComment = comments[0] || null;
  const status = normalizeIssueStatus(getYouTrackField(issue, ["State", "Состояние"]) || (resolvedAtMs ? "Done" : "Unknown"));
  const priority = getYouTrackField(issue, ["Priority", "Приоритет"]) || "Normal";
  const assignee = getYouTrackField(issue, ["Assignee", "Исполнитель"]) || "Unassigned";
  const dueDate = getYouTrackField(issue, ["Due Date", "Дата выполнения", "Срок"]) || "";
  const now = Date.now();
  const activeSinceMs = statusSinceMs || updatedAtMs || createdAtMs || now;
  const needsAttention = issueNeedsAnswer(status);
  const waitsForDeveloper = issueWaitsForDeveloper(status);
  const commentLooksLikeQuestion = commentLooksActionable(latestComment, { status });

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
    waitsForDeveloper,
    commentLooksLikeQuestion,
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
  const developerWaitingIssues = openIssues.filter((issue) => issue.waitsForDeveloper);
  const staleIssues = openIssues.filter((issue) => issue.inactiveMs >= YOUTRACK_STALE_MS);
  const showStoppers = openIssues.filter((issue) => YOUTRACK_SHOW_STOPPER_PATTERN.test(issue.priority));
  const statusCounts = buildYouTrackStatusCounts(issues);

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
      needsAnswer: attentionIssues.length,
      waitsForDeveloper: developerWaitingIssues.length,
      stale: staleIssues.length,
      showStoppers: showStoppers.length,
      statuses: statusCounts,
    },
  };
}

function buildYouTrackChanges(previous = {}, issues = []) {
  const previousIssues = previous?.issues || {};
  const previousCheckedAtMs = toMillis(previous?.checkedAt);
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
    if (
      before.priority !== current.priority
      && !YOUTRACK_SHOW_STOPPER_PATTERN.test(before.priority || "")
      && YOUTRACK_SHOW_STOPPER_PATTERN.test(current.priority || "")
    ) {
      changes.push({ type: "blocker", issue, before: before.priority, after: current.priority, message: `${issue.id}: стало критичным` });
    }
    if ((before.commentsCount || 0) < current.commentsCount || before.latestCommentId !== current.latestCommentId) {
      changes.push({ type: "comment", issue, message: `${issue.id}: новый комментарий от ${issue.latestComment?.author || "участника"}` });
    }
    const wasStale = previousCheckedAtMs > 0 && before.updatedAtMs > 0 && previousCheckedAtMs - before.updatedAtMs >= YOUTRACK_STALE_MS;
    const isStaleNow = !issue.isResolved && issue.inactiveMs >= YOUTRACK_STALE_MS;
    if (!wasStale && isStaleNow) {
      changes.push({ type: "stale", issue, message: `${issue.id}: без движения больше суток` });
    }
  }
  return changes;
}

function compactTelegramText(value = "", maxLength = 220) {
  const text = normalizeTelegramValue(value).replace(/\s+/g, " ");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function pluralRu(count, one, few, many) {
  const value = Math.abs(Number(count) || 0);
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function getAssigneeRoleLabel(assignee = "") {
  const value = normalizeTelegramValue(assignee);
  if (!value || /unassigned|не назнач/i.test(value)) return "пока без исполнителя";
  if (/front|фронт/i.test(value)) return `фронт (${value})`;
  if (/admin|админ|back|backend|бек/i.test(value)) return `админ-прогер (${value})`;
  return value;
}

function isIssueStale(issue = {}) {
  return Number(issue.inactiveMs || 0) >= YOUTRACK_STALE_MS;
}

function getHumanChangeBucket(change = {}) {
  const issue = change.issue || {};
  const after = normalizeIssueStatus(change.after || issue.status || "");
  if (change.type === "new") return "new";
  if (change.type === "blocker") return "blocker";
  if (change.type === "stale") return "stale";
  if (change.type === "comment") return issue.commentLooksLikeQuestion ? "question" : "comment";
  if (change.type === "assignee") return "assignee";
  if (change.type === "status") {
    if (after === YOUTRACK_STATUSES.TESTING) return "testing";
    if (after === YOUTRACK_STATUSES.DONE) return "done";
    if (after === YOUTRACK_STATUSES.NEEDS_CLARIFICATION) return "question";
    if (after === YOUTRACK_STATUSES.IN_PROGRESS || after === YOUTRACK_STATUSES.RETURNED_TO_WORK) return "moving";
    if (after === YOUTRACK_STATUSES.TODO) return "todo";
  }
  if (YOUTRACK_SHOW_STOPPER_PATTERN.test(issue.priority || "") || isIssueStale(issue)) return "attention";
  return "other";
}

function describeHumanChange(change = {}) {
  const issue = change.issue || {};
  const title = escapeTelegramHtml(compactTelegramText(issue.title || "Без названия", 110));
  const id = escapeTelegramHtml(issue.id || "Issue");
  const assignee = escapeTelegramHtml(getAssigneeRoleLabel(issue.assignee || ""));
  const url = issue.url ? `\n  🔗 ${escapeTelegramHtml(issue.url)}` : "";
  const bucket = getHumanChangeBucket(change);

  if (change.type === "new") {
    return `• <b>${id}</b> — ${title}\n  Новая задача влетела в очередь, держу на радаре.${url}`;
  }

  if (change.type === "assignee") {
    const before = escapeTelegramHtml(getAssigneeRoleLabel(change.before || ""));
    const after = escapeTelegramHtml(getAssigneeRoleLabel(change.after || issue.assignee || ""));
    return `• <b>${id}</b> — ${title}\n  Передали из рук в руки: ${before} → ${after}.${url}`;
  }

  if (change.type === "blocker") {
    return `• <b>${id}</b> — ${title}\n  Стало критичным. Это лучше смотреть первым, чтобы не разъехался релиз.${url}`;
  }

  if (change.type === "stale") {
    return `• <b>${id}</b> — ${title}\n  Без движения больше суток. Пора вернуть в поток или честно снять с очереди.${url}`;
  }

  if (change.type === "comment") {
    const author = escapeTelegramHtml(issue.latestComment?.author || "кто-то из команды");
    const comment = escapeTelegramHtml(compactTelegramText(issue.latestComment?.text || "", 180));
    const prefix = bucket === "question"
      ? `Новый коммент от ${author}, похоже там нужен ответ`
      : `Новый коммент от ${author}`;
    return `• <b>${id}</b> — ${title}\n  ${prefix}${comment ? `: “${comment}”` : "."}${url}`;
  }

  if (change.type === "status") {
    const before = escapeTelegramHtml(change.before || "—");
    const after = escapeTelegramHtml(change.after || "—");
    const statusText = {
      testing: `Улетело на тестик. Проверяем глазами, чтобы не вернулось обратно. Держит: ${assignee}.`,
      done: `Закрыли. Хороший знак, но если задача важная — можно быстро контрольнуть.`,
      question: `Поставили на уточнение. Тут лучше ответить, иначе будет висеть.`,
      moving: `Пошло в работу, движ есть. Сейчас держит: ${assignee}.`,
      todo: `Вернулось в очередь. Надо понять, кто подхватывает дальше.`,
      attention: `Есть движение, но задача всё ещё выглядит чувствительной. Лучше глянуть.`,
      other: `Статус поменялся: ${before} → ${after}. Держит: ${assignee}.`,
    }[bucket] || `Статус поменялся: ${before} → ${after}.`;
    return `• <b>${id}</b> — ${title}\n  ${statusText}${url}`;
  }

  return `• <b>${id}</b> — ${title}\n  Есть изменение. Держит: ${assignee}.${url}`;
}

function summarizeHumanBuckets(changes = []) {
  const counts = changes.reduce((acc, change) => {
    const bucket = getHumanChangeBucket(change);
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
  const parts = [];
  if (counts.testing) parts.push(`${counts.testing} ${pluralRu(counts.testing, "задача улетела", "задачи улетели", "задач улетели")} на тест`);
  if (counts.blocker) parts.push(`${counts.blocker} ${pluralRu(counts.blocker, "задача стала", "задачи стали", "задач стали")} критичной`);
  if (counts.stale) parts.push(`${counts.stale} ${pluralRu(counts.stale, "хвост завис", "хвоста зависли", "хвостов зависло")} 24ч+`);
  if (counts.moving) parts.push(`${counts.moving} ${pluralRu(counts.moving, "задача пошла", "задачи пошли", "задач пошли")} в работу`);
  if (counts.done) parts.push(`${counts.done} ${pluralRu(counts.done, "закрылась", "закрылись", "закрылось")}`);
  if (counts.question) parts.push(`${counts.question} ${pluralRu(counts.question, "место требует", "места требуют", "мест требуют")} ответа`);
  if (counts.comment) parts.push(`${counts.comment} ${pluralRu(counts.comment, "новый коммент", "новых коммента", "новых комментов")}`);
  if (counts.new) parts.push(`${counts.new} ${pluralRu(counts.new, "новая задача", "новые задачи", "новых задач")}`);
  if (counts.assignee) parts.push(`${counts.assignee} ${pluralRu(counts.assignee, "переназначение", "переназначения", "переназначений")}`);
  if (!parts.length) parts.push(`${changes.length} ${pluralRu(changes.length, "изменение", "изменения", "изменений")}`);
  return parts.join(", ");
}

function buildHumanOpsTakeaway(changes = []) {
  const changedIssues = changes.map((change) => change.issue || {}).filter(Boolean);
  const needsAnswer = changedIssues.filter((issue) => issue.needsAttention || issue.commentLooksLikeQuestion);
  const stale = changedIssues.filter(isIssueStale);
  const blockers = changedIssues.filter((issue) => YOUTRACK_SHOW_STOPPER_PATTERN.test(issue.priority || ""));
  const testing = changes.filter((change) => getHumanChangeBucket(change) === "testing");

  if (blockers.length) return `Главное: есть ${blockers.length} show-stopper, это лучше смотреть первым.`;
  if (needsAnswer.length) return `Главное: есть вопрос/уточнение, без ответа оно может встать колом.`;
  if (stale.length) return `Главное: ${stale.length} ${pluralRu(stale.length, "задача зависла", "задачи зависли", "задач зависло")} больше суток, надо подпнуть.`;
  if (testing.length) return `Главное: тестик пошёл, можно прогнать и закрывать хвосты.`;
  return "Главное: движ есть, команда не стоит. Я смотрю дальше.";
}

function isUrgentYouTrackChange(change = {}) {
  const bucket = getHumanChangeBucket(change);
  if (["blocker", "stale", "question", "comment", "testing"].includes(bucket)) return true;
  if (change.type === "new") {
    const issue = change.issue || {};
    return YOUTRACK_SHOW_STOPPER_PATTERN.test(issue.priority || "") || issue.needsAttention || issue.commentLooksLikeQuestion;
  }
  return false;
}

function getMoscowDigestParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour || 0),
  };
}

function getYouTrackChangeKey(change = {}) {
  const issue = change.issue || {};
  return [
    change.type || "change",
    issue.id || "",
    change.before || "",
    change.after || "",
    issue.latestComment?.id || "",
    issue.updatedAtMs || "",
    compactTelegramText(change.message || "", 80),
  ].join("|");
}

function compactYouTrackChange(change = {}) {
  const issue = change.issue || {};
  const latestComment = issue.latestComment
    ? {
        id: issue.latestComment.id || "",
        text: compactTelegramText(issue.latestComment.text || "", 260),
        author: issue.latestComment.author || "",
        authorLogin: issue.latestComment.authorLogin || "",
        createdAt: issue.latestComment.createdAt || "",
        updatedAt: issue.latestComment.updatedAt || "",
      }
    : null;
  return {
    key: getYouTrackChangeKey(change),
    type: change.type || "change",
    before: change.before || "",
    after: change.after || "",
    message: change.message || "",
    seenAt: new Date().toISOString(),
    issue: {
      id: issue.id || "",
      title: issue.title || "",
      url: issue.url || "",
      status: issue.status || "",
      priority: issue.priority || "",
      assignee: issue.assignee || "",
      dueDate: issue.dueDate || "",
      updatedAt: issue.updatedAt || "",
      updatedAtMs: issue.updatedAtMs || 0,
      inactiveMs: issue.inactiveMs || 0,
      inactiveLabel: issue.inactiveLabel || "",
      statusAgeLabel: issue.statusAgeLabel || "",
      latestComment,
      needsAttention: Boolean(issue.needsAttention),
      commentLooksLikeQuestion: Boolean(issue.commentLooksLikeQuestion),
      isResolved: Boolean(issue.isResolved),
    },
  };
}

async function appendYouTrackDigestChanges(changes = []) {
  const safeChanges = changes.filter(Boolean);
  const state = await readContent(YOUTRACK_DIGEST_KEY, { version: 1, pendingChanges: [] });
  if (!safeChanges.length) return state;

  const pending = Array.isArray(state.pendingChanges) ? state.pendingChanges : [];
  const byKey = new Map(pending.map((change) => [change.key || getYouTrackChangeKey(change), change]));
  safeChanges.forEach((change) => {
    const compact = compactYouTrackChange(change);
    byKey.set(compact.key, compact);
  });

  const nextPending = [...byKey.values()]
    .sort((a, b) => toMillis(b.seenAt) - toMillis(a.seenAt))
    .slice(0, 200);
  const nextState = {
    ...state,
    version: 1,
    updatedAt: new Date().toISOString(),
    pendingChanges: nextPending,
  };
  await writeContent(YOUTRACK_DIGEST_KEY, nextState);
  return nextState;
}

function buildCurrentIssueActionLines(result = {}) {
  const issues = Array.isArray(result.issues) ? result.issues : [];
  const blockers = issues.filter((issue) => !issue.isResolved && YOUTRACK_SHOW_STOPPER_PATTERN.test(issue.priority || ""));
  const needsAnswer = issues.filter((issue) => !issue.isResolved && (issue.needsAttention || issue.commentLooksLikeQuestion));
  const stale = issues.filter((issue) => !issue.isResolved && isIssueStale(issue));
  const testing = issues.filter((issue) => !issue.isResolved && normalizeIssueStatus(issue.status) === YOUTRACK_STATUSES.TESTING);
  const lines = [];
  if (blockers.length) lines.push(`сначала глянуть ${blockers.length} ${pluralRu(blockers.length, "критичную задачу", "критичные задачи", "критичных задач")}`);
  if (needsAnswer.length) lines.push(`ответить там, где ждут уточнение: ${needsAnswer.length}`);
  if (stale.length) lines.push(`подпнуть хвосты 24ч+: ${stale.length}`);
  if (testing.length) lines.push(`прогнать тестик: ${testing.length}`);
  if (!lines.length) lines.push("без паники: добивать текущие задачи и закрывать проверенное");
  return lines;
}

function formatYouTrackDailyDigest(result = {}, pendingChanges = []) {
  const summary = result.summary || {};
  const testing = summary.statuses?.[YOUTRACK_STATUSES.TESTING] || 0;
  const visibleChanges = pendingChanges
    .slice()
    .sort((a, b) => toMillis(a.seenAt) - toMillis(b.seenAt))
    .slice(-10);
  const lines = [
    "🟠 <b>Дневной дайджест по задачам</b>",
    "15:00 МСК",
    "━━━━━━━━━━━━━━━━",
    "",
    `Сейчас: открыто ${escapeTelegramHtml(summary.open ?? 0)}, на тесте ${escapeTelegramHtml(testing)}, зависло 24ч+ ${escapeTelegramHtml(summary.stale ?? 0)}, ждут ответа ${escapeTelegramHtml(summary.needsAnswer ?? 0)}, критичных ${escapeTelegramHtml(summary.showStoppers ?? 0)}.`,
    "",
    pendingChanges.length
      ? `За период: ${escapeTelegramHtml(summarizeHumanBuckets(pendingChanges))}.`
      : "За период без громких изменений. Всё равно держу радар включённым.",
    "",
    "Что сделать сейчас:",
    ...buildCurrentIssueActionLines(result).map((line) => `• ${escapeTelegramHtml(line)}`),
  ];

  if (visibleChanges.length) {
    lines.push("", "Движ за период:");
    visibleChanges.forEach((change) => {
      lines.push(describeHumanChange(change), "");
    });
    if (pendingChanges.length > visibleChanges.length) {
      lines.push(`Ещё ${pendingChanges.length - visibleChanges.length} ${pluralRu(pendingChanges.length - visibleChanges.length, "изменение", "изменения", "изменений")} оставил за кадром, чтобы чат не раздувать.`);
    }
  }

  return lines.join("\n").trim();
}

async function maybeSendDailyYouTrackDigest(result = {}, { force = false, enabled = true } = {}) {
  if (!enabled) return { ok: true, skipped: true, reason: "daily_digest_disabled" };
  const nowParts = getMoscowDigestParts();
  if (!force && nowParts.hour !== YOUTRACK_DAILY_DIGEST_HOUR_MSK) {
    return { ok: true, skipped: true, reason: "outside_digest_hour", digestDate: nowParts.date };
  }

  const state = await readContent(YOUTRACK_DIGEST_KEY, { version: 1, pendingChanges: [] });
  if (!force && state.lastDailyDigestDate === nowParts.date) {
    return { ok: true, skipped: true, reason: "already_sent", digestDate: nowParts.date };
  }

  const pendingChanges = Array.isArray(state.pendingChanges) ? state.pendingChanges : [];
  const notification = await sendTelegramMessage(formatYouTrackDailyDigest(result, pendingChanges), { parse_mode: "HTML" });
  if (!notification.ok) return notification;

  await writeContent(YOUTRACK_DIGEST_KEY, {
    ...state,
    version: 1,
    updatedAt: new Date().toISOString(),
    lastDailyDigestDate: nowParts.date,
    lastDailyDigestAt: new Date().toISOString(),
    lastDailyDigestMessage: notification.sent?.[0] || null,
    pendingChanges: [],
  });
  return { ...notification, digestDate: nowParts.date, pendingCount: pendingChanges.length };
}

function formatYouTrackChangePush(changes = []) {
  const visibleChanges = changes.slice(0, 8);
  const lines = [
    "🟠 <b>Нужно глянуть по задачам</b>",
    "━━━━━━━━━━━━━━━━",
    "",
    `Чуваки, тут важное: ${escapeTelegramHtml(summarizeHumanBuckets(changes))}.`,
    escapeTelegramHtml(buildHumanOpsTakeaway(changes)),
    "",
  ];

  visibleChanges.forEach((change) => {
    lines.push(describeHumanChange(change), "");
  });
  if (changes.length > visibleChanges.length) {
    lines.push(`Ещё ${changes.length - visibleChanges.length} ${pluralRu(changes.length - visibleChanges.length, "изменение", "изменения", "изменений")} оставил в панели, чтобы чат не раздувать.`);
  }
  return lines.join("\n").trim();
}

async function checkYouTrackChanges({ notify = true, persist = true, dailyDigest = true, forceDigest = false } = {}) {
  const result = await getYouTrackIssues();
  if (!result.ok) return result;
  const previous = await readContent(YOUTRACK_SNAPSHOT_KEY, { issues: {} });
  const isFirstSnapshot = !previous?.issues || !Object.keys(previous.issues).length;
  const changes = isFirstSnapshot ? [] : buildYouTrackChanges(previous, result.issues);
  const urgentChanges = changes.filter(isUrgentYouTrackChange);
  const deferredChanges = changes.filter((change) => !isUrgentYouTrackChange(change));
  const nextSnapshot = {
    checkedAt: result.lastCheckedAt,
    issues: Object.fromEntries(result.issues.map((issue) => [issue.id, getIssueSignature(issue)])),
  };

  let notification = { ok: true, skipped: true };
  if (notify && urgentChanges.length) {
    notification = await sendTelegramMessage(formatYouTrackChangePush(urgentChanges), { parse_mode: "HTML" });
  } else if (notify && changes.length) {
    notification = { ok: true, skipped: true, reason: "no_urgent_changes" };
  }
  const shouldPersist = persist && (!notify || !urgentChanges.length || notification.ok);
  let digestState = null;
  let digestNotification = { ok: true, skipped: true };
  if (shouldPersist && deferredChanges.length) {
    digestState = await appendYouTrackDigestChanges(deferredChanges);
  }
  if (notify && shouldPersist) {
    digestNotification = await maybeSendDailyYouTrackDigest(result, { enabled: dailyDigest, force: forceDigest });
  }
  if (shouldPersist) {
    await writeContent(YOUTRACK_SNAPSHOT_KEY, nextSnapshot);
  }

  return {
    ...result,
    changes,
    urgentChanges,
    deferredChanges,
    notification,
    digestNotification,
    digestPendingCount: digestState?.pendingChanges?.length,
    bootstrapped: isFirstSnapshot,
    persisted: shouldPersist,
  };
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

async function sendTelegramMessage(text, options = {}, requestedChatId = "") {
  const { token, targetChatIds, preferredChatId } = await getTelegramConfig();
  if (!token) return { ok: false, status: 503, error: "telegram_token_not_configured" };
  if (!targetChatIds.length) return { ok: false, status: 503, error: "telegram_push_chat_not_configured" };
  const chatId = requestedChatId || preferredChatId || targetChatIds[0] || "";
  if (!chatId) return { ok: false, status: 400, error: "telegram_push_chat_required" };
  if (!targetChatIds.includes(chatId)) {
    return { ok: false, status: 403, error: "telegram_push_chat_not_allowed", chatId };
  }
  const sent = [];
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

  return { ok: true, status: 200, sent };
}

async function sendTelegramReaction(messageId, emoji = "😁", requestedChatId = "") {
  const { token, targetChatIds, preferredChatId } = await getTelegramConfig();
  if (!token) return { ok: false, status: 503, error: "telegram_token_not_configured" };
  if (!targetChatIds.length) return { ok: false, status: 503, error: "telegram_push_chat_not_configured" };
  const chatId = requestedChatId || preferredChatId || targetChatIds[0] || "";
  if (!chatId) return { ok: false, status: 400, error: "telegram_push_chat_required" };
  if (!targetChatIds.includes(chatId)) {
    return { ok: false, status: 403, error: "telegram_push_chat_not_allowed", chatId };
  }

  const safeMessageId = Number(messageId || 0);
  if (!Number.isFinite(safeMessageId) || safeMessageId <= 0) {
    return { ok: false, status: 400, error: "telegram_message_id_required", chatId };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/setMessageReaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: safeMessageId,
      reaction: [{ type: "emoji", emoji: normalizeTelegramValue(emoji || "😁") }],
      is_big: false,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    return { ok: false, status: response.status || 502, error: payload?.description || "telegram_reaction_failed", chatId };
  }

  return { ok: true, status: 200, chatId, messageId: safeMessageId };
}

async function sendTelegramPhoto({ photo = "", caption = "", options = {}, requestedChatId = "" } = {}) {
  const { token, targetChatIds, preferredChatId } = await getTelegramConfig();
  if (!token) return { ok: false, status: 503, error: "telegram_token_not_configured" };
  if (!targetChatIds.length) return { ok: false, status: 503, error: "telegram_push_chat_not_configured" };
  const chatId = requestedChatId || preferredChatId || targetChatIds[0] || "";
  if (!chatId) return { ok: false, status: 400, error: "telegram_push_chat_required" };
  if (!targetChatIds.includes(chatId)) {
    return { ok: false, status: 403, error: "telegram_push_chat_not_allowed", chatId };
  }
  const safePhoto = normalizeTelegramValue(photo);
  if (!safePhoto) return { ok: false, status: 400, error: "telegram_photo_required", chatId };

  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: safePhoto,
      caption: normalizeTelegramValue(caption).slice(0, 1024),
      ...options,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    return { ok: false, status: response.status || 502, error: payload?.description || "telegram_photo_send_failed", chatId };
  }

  return { ok: true, status: 200, sent: [{ chatId, messageId: payload?.result?.message_id }] };
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

function filePathForKey(key) {
  return path.join(STORE_DIR, `${key}.json`);
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
      const notify = parsed.notify !== false;
      const persist = parsed.persist ?? notify;
      const dailyDigest = parsed.dailyDigest !== false;
      const forceDigest = parsed.forceDigest === true;
      const result = await checkYouTrackChanges({ notify, persist, dailyDigest, forceDigest });
      sendJson(response, result.ok ? 200 : result.status || 502, result);
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

    if (url.pathname === "/api/telegram/memory" && request.method === "GET") {
      if (!isTelegramMemoryReadAllowed(request, url)) {
        sendJson(response, 403, { ok: false, error: "telegram_memory_token_required" });
        return;
      }
      const memory = await readContent(CONTENT_KEYS.telegramMemory, { version: 1, chats: {} });
      const chatId = url.searchParams.get("chatId") || "";
      if (chatId) {
        sendJson(response, 200, { ok: true, chat: memory?.chats?.[chatId] || null });
        return;
      }
      sendJson(response, 200, { ok: true, memory });
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

    if (url.pathname === "/api/telegram/send-message" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const text = normalizeTelegramValue(parsed.text || parsed.message || "");
      if (!text) {
        sendJson(response, 400, { ok: false, error: "empty_telegram_message" });
        return;
      }
      const chatId = String(parsed.chatId || "").trim();
      const replyToMessageId = Number(parsed.replyToMessageId || parsed.reply_to_message_id || 0);
      const reactionToMessageId = Number(parsed.reactionToMessageId || parsed.reactToMessageId || parsed.reaction_to_message_id || 0);
      const options = {};
      if (Number.isFinite(replyToMessageId) && replyToMessageId > 0) options.reply_to_message_id = replyToMessageId;
      if (parsed.parseMode === "HTML" || parsed.parse_mode === "HTML") options.parse_mode = "HTML";

      const reaction = Number.isFinite(reactionToMessageId) && reactionToMessageId > 0
        ? await sendTelegramReaction(reactionToMessageId, parsed.reactionEmoji || parsed.emoji || "😁", chatId)
        : { ok: true, skipped: true };
      const result = await sendTelegramMessage(text, options, chatId);
      sendJson(response, result.ok ? 200 : result.status, result.ok ? { ok: true, ...result, reaction } : { ok: false, error: result.error, reaction });
      return;
    }

    if (url.pathname === "/api/telegram/react-message" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const result = await sendTelegramReaction(parsed.messageId || parsed.message_id, parsed.emoji || "😁", String(parsed.chatId || "").trim());
      sendJson(response, result.ok ? 200 : result.status, result.ok ? { ok: true, reaction: result } : { ok: false, error: result.error });
      return;
    }

    if (url.pathname === "/api/telegram/send-photo" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const replyToMessageId = Number(parsed.replyToMessageId || parsed.reply_to_message_id || 0);
      const reactionToMessageId = Number(parsed.reactionToMessageId || parsed.reactToMessageId || parsed.reaction_to_message_id || 0);
      const options = {};
      if (Number.isFinite(replyToMessageId) && replyToMessageId > 0) options.reply_to_message_id = replyToMessageId;
      if (parsed.parseMode === "HTML" || parsed.parse_mode === "HTML") options.parse_mode = "HTML";
      const chatId = String(parsed.chatId || "").trim();
      const reaction = Number.isFinite(reactionToMessageId) && reactionToMessageId > 0
        ? await sendTelegramReaction(reactionToMessageId, parsed.reactionEmoji || parsed.emoji || "😁", chatId)
        : { ok: true, skipped: true };
      const result = await sendTelegramPhoto({
        photo: parsed.photo || parsed.photoUrl || parsed.url || "",
        caption: parsed.caption || "",
        options,
        requestedChatId: chatId,
      });
      sendJson(response, result.ok ? 200 : result.status, result.ok ? { ok: true, ...result, reaction } : { ok: false, error: result.error, reaction });
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
    if (PROTECTED_CONTENT_KEYS.has(key)) {
      sendJson(response, 403, { ok: false, error: "protected_content_key" });
      return;
    }

    if (request.method === "GET") {
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
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const value = Object.prototype.hasOwnProperty.call(parsed, "value") ? parsed.value : parsed;
      const targetPath = filePathForKey(key);
      const tempPath = `${targetPath}.${Date.now()}.tmp`;

      await backupExistingContent(key, targetPath);
      await writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
      await rename(tempPath, targetPath);
      sendJson(response, 200, { ok: true, exists: true });
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
