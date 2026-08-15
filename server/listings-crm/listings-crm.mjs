import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BODY_BYTES = 1024 * 1024;
const WRITE_WINDOW_MS = 60_000;
const WRITE_LIMIT = Number(process.env.ATLAS_LISTINGS_CRM_RATE_LIMIT || 120);
const requestBuckets = new Map();

export const LISTINGS_CRM_ENUMS = {
  taskStatuses: ["READY", "CLAIMED", "IN_PROGRESS", "WAITING_EXTERNAL", "BLOCKED", "REVIEW", "DONE", "CANCELLED"],
  taskKinds: ["LISTING_HYIP", "LISTING_DAPP", "LISTING_ARTICLE", "LISTING_MLM", "CONTACT_RESEARCH", "FOLLOW_UP", "QA"],
  memberRoles: ["LISTINGS_OPERATOR", "RELATIONSHIP_OPERATOR", "DUTY_COORDINATOR", "RESERVE"],
};

const RECORD_FIELDS = [
  "source", "name", "type", "priority", "status", "owner", "ownerMemberId", "dueDate", "firstContact",
  "action", "summary", "benefit", "price", "notes", "channel", "link", "paymentAmount", "paymentOptions",
  "paymentReference", "paymentInstructions", "proofs", "placementStart", "placementTerm", "renewalDate", "renewalNotes",
  "platformAccess", "correspondence",
];

const SEED_MEMBERS = [
  { id: "listings-operator-1", name: "Оператор листингов 1", role: "LISTINGS_OPERATOR", active: true, capacityPoints: 5 },
  { id: "listings-operator-2", name: "Оператор листингов 2", role: "LISTINGS_OPERATOR", active: true, capacityPoints: 5 },
  { id: "duty-coordinator", name: "Дежурный координатор", role: "DUTY_COORDINATOR", active: true, capacityPoints: 5 },
  { id: "reserve-operator-1", name: "Резерв 1", role: "RESERVE", active: false, capacityPoints: 5 },
  { id: "reserve-operator-2", name: "Резерв 2", role: "RESERVE", active: false, capacityPoints: 5 },
];

function clone(value) {
  return structuredClone(value);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value, max = 20_000) {
  return String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
}

function normalizeDate(value, field, { required = false } = {}) {
  const normalized = normalizeText(value, 10);
  if (!normalized && !required) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T12:00:00Z`))) {
    throw Object.assign(new Error(`invalid_${field}`), { status: 400 });
  }
  return normalized;
}

function validateUrl(value) {
  const normalized = normalizeText(value, 2_000);
  if (!normalized) return "";
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw Object.assign(new Error("invalid_url"), { status: 400 });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw Object.assign(new Error("unsafe_url_protocol"), { status: 400 });
  }
  return parsed.toString();
}

export function normalizeDomain(value) {
  const normalized = normalizeText(value, 2_000);
  if (!normalized) return "";
  try {
    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
    return new URL(candidate).hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  } catch {
    return "";
  }
}

function sanitizeProofs(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).map((proof) => {
    const url = String(proof?.url ?? "").replace(/\0/g, "").trim();
    if (url.length > 10 * 1024 * 1024) throw Object.assign(new Error("proof_too_large"), { status: 413 });
    if (url && !/^https?:\/\//i.test(url) && !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(url) && !url.startsWith("/")) {
      throw Object.assign(new Error("unsafe_proof_url"), { status: 400 });
    }
    return {
      id: normalizeText(proof?.id, 160) || randomUUID(), url,
      fileName: normalizeText(proof?.fileName, 240), createdAt: normalizeText(proof?.createdAt, 80),
      note: normalizeText(proof?.note, 2_000),
    };
  }).filter((proof) => proof.url);
}

function sanitizePlatformAccess(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const forbiddenKeys = ["password", "passphrase", "secret", "token", "otp", "recoveryCode", "backupCode"];
  if (forbiddenKeys.some((key) => Object.prototype.hasOwnProperty.call(source, key))) {
    throw Object.assign(new Error("raw_credentials_not_allowed"), { status: 400 });
  }
  return {
    loginUrl: validateUrl(source.loginUrl),
    workspaceUrl: validateUrl(source.workspaceUrl),
    submissionUrl: validateUrl(source.submissionUrl),
    publishedUrl: validateUrl(source.publishedUrl),
    accountLogin: normalizeText(source.accountLogin, 320),
    authMethod: normalizeText(source.authMethod, 160),
    accessOwner: normalizeText(source.accessOwner, 240),
    twoFactorOwner: normalizeText(source.twoFactorOwner, 240),
    recoveryContact: normalizeText(source.recoveryContact, 320),
    passwordManagerItem: normalizeText(source.passwordManagerItem, 500),
    passwordManagerUrl: validateUrl(source.passwordManagerUrl),
    lastVerifiedAt: normalizeDate(source.lastVerifiedAt, "access_last_verified_at"),
    notes: normalizeText(source.notes, 5_000),
  };
}

function normalizeCorrespondenceTimestamp(value) {
  const normalized = normalizeText(value, 32);
  if (!normalized) return "";
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?$/.test(normalized)) {
    throw Object.assign(new Error("invalid_correspondence_timestamp"), { status: 400 });
  }
  const candidate = normalized.length === 10 ? `${normalized}T12:00:00Z` : `${normalized}:00Z`;
  if (Number.isNaN(Date.parse(candidate))) {
    throw Object.assign(new Error("invalid_correspondence_timestamp"), { status: 400 });
  }
  return normalized;
}

function sanitizeCorrespondence(value) {
  if (!Array.isArray(value)) return [];
  const allowedKinds = new Set(["SUBMISSION", "INCOMING", "OUTGOING", "STATUS"]);
  return value.slice(0, 200).map((item) => {
    const kind = normalizeText(item?.kind, 40).toUpperCase() || "STATUS";
    if (!allowedKinds.has(kind)) throw Object.assign(new Error("invalid_correspondence_kind"), { status: 400 });
    return {
      id: normalizeText(item?.id, 160) || randomUUID(),
      occurredAt: normalizeCorrespondenceTimestamp(item?.occurredAt),
      kind,
      channel: normalizeText(item?.channel, 160),
      sender: normalizeText(item?.sender, 320),
      recipient: normalizeText(item?.recipient, 320),
      subject: normalizeText(item?.subject, 500),
      message: normalizeText(item?.message, 20_000),
      outcome: normalizeText(item?.outcome, 5_000),
      threadUrl: validateUrl(item?.threadUrl),
      attachmentUrl: validateUrl(item?.attachmentUrl),
      followUpDate: normalizeDate(item?.followUpDate, "correspondence_follow_up_date"),
      createdBy: normalizeText(item?.createdBy, 160),
      createdAt: normalizeText(item?.createdAt, 80) || nowIso(),
    };
  }).sort((a, b) => (a.occurredAt || "9999").localeCompare(b.occurredAt || "9999"));
}

function normalizeProfileUrl(value) {
  try {
    const parsed = new URL(value);
    parsed.search = "";
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    parsed.pathname = parsed.pathname.replace(/\/+$/, "").toLowerCase();
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "";
  }
}

function recordDedupeKey(record) {
  const kind = `${record.source || ""} ${record.type || ""} ${record.channel || ""}`.toLowerCase();
  const profile = normalizeProfileUrl(record.link);
  const profileHost = profile.split("/")[0];
  const socialHosts = new Set(["linkedin.com", "facebook.com", "instagram.com", "x.com", "twitter.com", "t.me", "telegram.me"]);
  const contact = socialHosts.has(profileHost) || /партн|контакт|contact|connector|coach|linkedin|facebook|instagram|twitter|social|соцсет/.test(kind);
  if (contact) {
    return profile ? `contact|${profile}` : "";
  }
  return record.canonicalDomain
    ? `listing|${record.canonicalDomain}|${normalizeText(record.type || record.source, 300).toLowerCase()}`
    : "";
}

function normalizeLegacyDate(value, year = "2026") {
  const normalized = normalizeText(value, 20);
  if (!normalized || /^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  const full = normalized.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (full) return `${full[3]}-${full[2]}-${full[1]}`;
  const short = normalized.match(/^(\d{2})\.(\d{2})$/);
  return short ? `${year}-${short[2]}-${short[1]}` : "";
}

function normalizeRecordInput(input, current = {}) {
  const next = { ...current };
  for (const field of RECORD_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) next[field] = input[field];
  }
  next.name = normalizeText(next.name, 240);
  if (!next.name) throw Object.assign(new Error("name_required"), { status: 400 });
  next.source = normalizeText(next.source, 120);
  next.type = normalizeText(next.type, 300);
  next.priority = normalizeText(next.priority, 20) || "P2";
  next.status = normalizeText(next.status, 160) || "Не обработано";
  next.owner = normalizeText(next.owner, 160);
  next.ownerMemberId = normalizeText(input.ownerId ?? next.ownerMemberId, 160) || null;
  next.ownerId = next.ownerMemberId;
  next.dueDate = normalizeDate(next.dueDate, "due_date");
  next.firstContact = normalizeDate(next.firstContact, "first_contact");
  next.action = normalizeText(next.action, 10_000);
  next.summary = normalizeText(next.summary, 10_000);
  next.benefit = normalizeText(next.benefit, 10_000);
  next.price = normalizeText(next.price, 5_000);
  next.notes = normalizeText(next.notes, 50_000);
  next.channel = normalizeText(next.channel, 500);
  next.link = validateUrl(next.link);
  next.paymentAmount = normalizeText(next.paymentAmount, 120);
  next.paymentOptions = normalizeText(next.paymentOptions, 3_000);
  next.paymentReference = normalizeText(next.paymentReference, 1_000);
  next.paymentInstructions = normalizeText(next.paymentInstructions, 5_000);
  next.proofs = Object.prototype.hasOwnProperty.call(input, "proofs")
    ? sanitizeProofs(input.proofs)
    : Array.isArray(current.proofs) ? current.proofs : [];
  next.placementStart = normalizeDate(next.placementStart, "placement_start");
  next.placementTerm = normalizeText(next.placementTerm, 2_000);
  next.renewalDate = normalizeDate(next.renewalDate, "renewal_date");
  next.renewalNotes = normalizeText(next.renewalNotes, 5_000);
  next.platformAccess = Object.prototype.hasOwnProperty.call(input, "platformAccess")
    ? sanitizePlatformAccess(input.platformAccess)
    : sanitizePlatformAccess(current.platformAccess);
  next.correspondence = Object.prototype.hasOwnProperty.call(input, "correspondence")
    ? sanitizeCorrespondence(input.correspondence)
    : sanitizeCorrespondence(current.correspondence);
  if (!next.firstContact && next.correspondence.length) {
    next.firstContact = next.correspondence.map((item) => item.occurredAt.slice(0, 10)).filter(Boolean).sort()[0] || "";
  }
  next.canonicalDomain = normalizeDomain(next.link);
  next.dedupeKey = recordDedupeKey(next);
  if (next.legacyDuplicate) next.dedupeKey = "";
  return next;
}

function seedMembers(timestamp = nowIso()) {
  return SEED_MEMBERS.map((member) => ({ ...member, capacity: member.capacityPoints, version: 1, createdAt: timestamp, updatedAt: timestamp }));
}

function auditSnapshot(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return value.slice(0, 50).map(auditSnapshot);
  if (typeof value !== "object") return typeof value === "string" ? value.slice(0, 2_000) : value;
  const hidden = new Set(["proofs", "paymentOptions", "paymentReference", "paymentInstructions", "notes", "platformAccess", "correspondence"]);
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !hidden.has(key))
    .map(([key, entry]) => [key, auditSnapshot(entry)]));
}

function createAudit(entityType, entityId, action, actorMemberId, before, after, metadata = {}) {
  return {
    id: randomUUID(), entityType, entityId, action, actorMemberId: actorMemberId || null,
    before: auditSnapshot(before), after: auditSnapshot(after),
    metadata: auditSnapshot(metadata), createdAt: nowIso(),
  };
}

function actorFromRequest(request, state) {
  const requested = normalizeText(request.headers["x-atlas-member-id"], 160);
  return state.members.some((member) => member.id === requested && member.active) ? requested : null;
}

function requireActor(request, state) {
  const memberId = actorFromRequest(request, state);
  if (!memberId) throw Object.assign(new Error("member_identity_required"), { status: 401 });
  return memberId;
}

function actorMember(request, state) {
  return assertMember(state, requireActor(request, state));
}

function isCoordinator(member) {
  return member?.role === "DUTY_COORDINATOR";
}

function normalizeLegacyState(legacy) {
  const timestamp = nowIso();
  const sourceRecords = Array.isArray(legacy?.records) ? legacy.records : Array.isArray(legacy?.value?.records) ? legacy.value.records : [];
  const generatedAt = normalizeText(legacy?.meta?.generatedAt || legacy?.value?.meta?.generatedAt, 80);
  const legacyYear = generatedAt.match(/^(\d{4})/)?.[1] || "2026";
  const importedKeys = new Set();
  const records = sourceRecords.map((source) => {
    const normalized = normalizeRecordInput({
      ...source,
      dueDate: normalizeLegacyDate(source.dueDate, legacyYear),
      firstContact: normalizeLegacyDate(source.firstContact, legacyYear),
      placementStart: normalizeLegacyDate(source.placementStart, legacyYear),
      renewalDate: normalizeLegacyDate(source.renewalDate, legacyYear),
    });
    // The legacy board legitimately contains several historical cards for the
    // same site. Keep them all, but reserve the canonical key for the first
    // card so that new duplicate submissions are rejected deterministically.
    if (normalized.dedupeKey && importedKeys.has(normalized.dedupeKey)) {
      normalized.dedupeKey = "";
      normalized.legacyDuplicate = true;
    } else if (normalized.dedupeKey) importedKeys.add(normalized.dedupeKey);
    return {
      ...source,
      ...normalized,
      id: normalizeText(source.id, 200) || randomUUID(),
      version: Number.isSafeInteger(source.version) && source.version > 0 ? source.version : 1,
      createdAt: normalizeText(source.createdAt, 80) || normalizeText(source.updatedAt, 80) || timestamp,
      updatedAt: normalizeText(source.updatedAt, 80) || timestamp,
    };
  });
  const state = { members: seedMembers(timestamp), records, tasks: [], audit: [] };
  state.audit.push(createAudit("workspace", "listings-crm", "LEGACY_IMPORT", null, null, null, { recordCount: records.length }));
  return state;
}

async function readLegacy(legacyFilePath) {
  if (!legacyFilePath) return null;
  try {
    return JSON.parse(await readFile(legacyFilePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function createFileRepository(storeDir, legacyFilePath) {
  const filePath = path.join(storeDir, "listings-team-crm-v1.json");
  let queue = Promise.resolve();

  async function persist(state) {
    await mkdir(storeDir, { recursive: true });
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, JSON.stringify(state, null, 2), "utf8");
    await rename(tempPath, filePath);
  }

  async function readState() {
    await mkdir(storeDir, { recursive: true });
    try {
      const state = JSON.parse(await readFile(filePath, "utf8"));
      if (!Array.isArray(state.members) || !Array.isArray(state.records) || !Array.isArray(state.tasks) || !Array.isArray(state.audit)) {
        throw new Error("invalid_listings_crm_store");
      }
      return state;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const state = normalizeLegacyState(await readLegacy(legacyFilePath));
      await persist(state);
      return state;
    }
  }

  function mutate(operation) {
    const task = queue.then(async () => {
      const state = await readState();
      const result = await operation(state);
      await persist(state);
      return result;
    });
    queue = task.then(() => undefined, () => undefined);
    return task;
  }

  return { mode: "file", readState, mutate };
}

async function createPostgresRepository(connectionString, legacyFilePath) {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString, max: Number(process.env.ATLAS_LISTINGS_CRM_PG_POOL || 6) });
  const migrationPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "001_listings_crm.sql");
  await pool.query(await readFile(migrationPath, "utf8"));

  async function readState(client = pool) {
    const [members, records, tasks, audit] = await Promise.all([
      client.query("SELECT data FROM atlas_crm_members ORDER BY id"),
      client.query("SELECT data FROM atlas_crm_records ORDER BY updated_at DESC, id"),
      client.query("SELECT data FROM atlas_crm_tasks ORDER BY plan_date DESC, updated_at DESC, id"),
      client.query("SELECT data FROM atlas_crm_audit ORDER BY created_at ASC, id"),
    ]);
    return {
      members: members.rows.map((row) => row.data), records: records.rows.map((row) => row.data),
      tasks: tasks.rows.map((row) => row.data), audit: audit.rows.map((row) => row.data),
    };
  }

  async function persist(client, state) {
    await client.query("DELETE FROM atlas_crm_audit");
    await client.query("DELETE FROM atlas_crm_tasks");
    await client.query("DELETE FROM atlas_crm_records");
    await client.query("DELETE FROM atlas_crm_members");
    for (const member of state.members) {
      await client.query("INSERT INTO atlas_crm_members (id, data, updated_at) VALUES ($1, $2::jsonb, $3)", [member.id, JSON.stringify(member), member.updatedAt]);
    }
    for (const record of state.records) {
      await client.query("INSERT INTO atlas_crm_records (id, dedupe_key, data, updated_at) VALUES ($1, $2, $3::jsonb, $4)", [record.id, record.dedupeKey || null, JSON.stringify(record), record.updatedAt]);
    }
    for (const task of state.tasks) {
      await client.query("INSERT INTO atlas_crm_tasks (id, plan_date, record_id, data, updated_at) VALUES ($1, $2, $3, $4::jsonb, $5)", [task.id, task.planDate, task.recordId || null, JSON.stringify(task), task.updatedAt]);
    }
    for (const event of state.audit) {
      await client.query("INSERT INTO atlas_crm_audit (id, entity_type, entity_id, data, created_at) VALUES ($1, $2, $3, $4::jsonb, $5)", [event.id, event.entityType, event.entityId, JSON.stringify(event), event.createdAt]);
    }
  }

  const seedClient = await pool.connect();
  try {
    await seedClient.query("BEGIN");
    await seedClient.query("SELECT pg_advisory_xact_lock(hashtext('atlas_listings_team_crm'))");
    const current = await readState(seedClient);
    if (!current.members.length && !current.records.length) {
      await persist(seedClient, normalizeLegacyState(await readLegacy(legacyFilePath)));
    }
    await seedClient.query("COMMIT");
  } catch (error) {
    await seedClient.query("ROLLBACK");
    throw error;
  } finally {
    seedClient.release();
  }

  async function mutate(operation) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('atlas_listings_team_crm'))");
      const state = await readState(client);
      const result = await operation(state);
      await persist(client, state);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return { mode: "postgres", readState, mutate, close: () => pool.end() };
}

export async function createListingsCrmRepository({ storeDir, legacyFilePath, connectionString = process.env.ATLAS_LISTINGS_CRM_DATABASE_URL } = {}) {
  if (connectionString) return createPostgresRepository(connectionString, legacyFilePath);
  return createFileRepository(storeDir, legacyFilePath);
}

function sendJson(response, status, value, extraHeaders = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders });
  response.end(JSON.stringify(value));
}

function publicErrorCode(error) {
  const value = normalizeText(error?.message, 120).toUpperCase();
  if (value === "TASK_ALREADY_CLAIMED") return "ALREADY_CLAIMED";
  return value || "SERVER_ERROR";
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers["content-length"] || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error("request_body_too_large"), { status: 413 });
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("request_body_too_large"), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("invalid_json"), { status: 400 });
  }
}

function assertWriteAllowed(request) {
  const type = normalizeText(request.headers["content-type"], 100).toLowerCase();
  if (request.method !== "GET" && !type.startsWith("application/json")) {
    throw Object.assign(new Error("json_content_type_required"), { status: 415 });
  }
  const origin = request.headers.origin;
  if (origin) {
    const protocol = normalizeText(request.headers["x-forwarded-proto"], 20) || "http";
    const hosts = [request.headers.host, request.headers["x-forwarded-host"]].filter(Boolean);
    const valid = new Set(hosts.map((host) => `${protocol}://${host}`));
    const allowed = new Set(normalizeText(process.env.ATLAS_LISTINGS_CRM_ALLOWED_ORIGINS, 5_000).split(",").map((item) => item.trim()).filter(Boolean));
    let parsed;
    try { parsed = new URL(origin); } catch { throw Object.assign(new Error("origin_not_allowed"), { status: 403 }); }
    const remote = String(request.socket?.remoteAddress || "");
    const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) && /127\.0\.0\.1|::1/.test(remote);
    if (!valid.has(origin) && !allowed.has(origin) && !local) throw Object.assign(new Error("origin_not_allowed"), { status: 403 });
  }
  const key = normalizeText(request.headers["x-real-ip"] || request.socket?.remoteAddress || "unknown", 200);
  const now = Date.now();
  const bucket = requestBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= WRITE_WINDOW_MS) requestBuckets.set(key, { startedAt: now, count: 1 });
  else if (++bucket.count > WRITE_LIMIT) throw Object.assign(new Error("rate_limit_exceeded"), { status: 429 });
}

function expectedVersion(request, body) {
  const raw = normalizeText(request.headers["if-match"] ?? body.version, 80);
  const match = raw.match(/^(?:W\/)??"?(\d+)"?$/);
  const version = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(version) && version > 0 ? version : null;
}

function assertVersion(item, version) {
  if (!version) throw Object.assign(new Error("version_required"), { status: 428, current: item });
  if (item.version !== version) throw Object.assign(new Error("version_conflict"), { status: 409, current: item });
}

function assertMember(state, memberId, { active = true, optional = false } = {}) {
  if (!memberId && optional) return null;
  const member = state.members.find((candidate) => candidate.id === memberId);
  if (!member || (active && !member.active)) throw Object.assign(new Error("member_not_found"), { status: 400 });
  return member;
}

function findRecord(state, id) {
  const record = state.records.find((candidate) => candidate.id === id);
  if (!record) throw Object.assign(new Error("record_not_found"), { status: 404 });
  return record;
}

function findTask(state, id) {
  const task = state.tasks.find((candidate) => candidate.id === id);
  if (!task) throw Object.assign(new Error("task_not_found"), { status: 404 });
  return task;
}

function assertRecordAccess(state, record, actor) {
  if (isCoordinator(actor)) return;
  if (record.ownerMemberId && record.ownerMemberId !== actor.id) {
    throw Object.assign(new Error("record_owner_forbidden"), { status: 403 });
  }
  const activeAssignees = new Set(state.tasks
    .filter((task) => task.recordId === record.id && task.assigneeId && !["DONE", "CANCELLED"].includes(task.status))
    .map((task) => task.assigneeId));
  if (activeAssignees.size > 1 || (activeAssignees.size === 1 && !activeAssignees.has(actor.id))) {
    throw Object.assign(new Error("record_task_owner_forbidden"), { status: 403 });
  }
}

function decorateAudit(state, events) {
  const memberById = new Map(state.members.map((member) => [member.id, member]));
  const recordById = new Map(state.records.map((record) => [record.id, record]));
  const taskById = new Map(state.tasks.map((task) => [task.id, task]));
  return events.map((event) => {
    const memberName = memberById.get(event.actorMemberId)?.name || "Система";
    const entityName = recordById.get(event.entityId)?.name || taskById.get(event.entityId)?.title || event.entityId;
    return { ...event, actorName: memberName, memberName, entityName };
  });
}

function assertUniqueDomain(state, record, excludeId = "") {
  if (!record.dedupeKey || record.legacyDuplicate) return;
  const duplicate = state.records.find((candidate) => candidate.id !== excludeId && candidate.dedupeKey === record.dedupeKey);
  if (duplicate) throw Object.assign(new Error("duplicate_domain"), { status: 409, current: duplicate });
}

function moscowDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function closedRecord(record) {
  return new Set(["Закрыто", "Опубликовано", "Отказ", "Архив"]).has(normalizeText(record.status, 160));
}

function classifyRecord(record) {
  const haystack = [record.source, record.type, record.name, record.channel].join(" ").toLowerCase();
  if (/hyip|хайп|monitor/.test(haystack)) return "LISTING_HYIP";
  if (/dapp|dappradar|defillama|web3/.test(haystack)) return "LISTING_DAPP";
  if (/mlm|network marketing|сетев|direct selling/.test(haystack)) return "LISTING_MLM";
  if (/article|стать|press|media|pr|публикац|каталог/.test(haystack)) return "LISTING_ARTICLE";
  return "";
}

const PLAN_TEMPLATES = [
  { key: "listing-hyip", kind: "LISTING_HYIP", points: 2, title: "Хайп-монитор: обработать одну площадку" },
  { key: "listing-dapp", kind: "LISTING_DAPP", points: 2, title: "DApp-каталог: обработать одну площадку" },
  { key: "listing-article", kind: "LISTING_ARTICLE", points: 2, title: "Каталог или статья: обработать одну площадку" },
  { key: "listing-mlm", kind: "LISTING_MLM", points: 2, title: "MLM-площадка: обработать одну площадку" },
  ...["linkedin", "facebook", "instagram", "x"].map((channel) => ({ key: `contact-${channel}`, kind: "CONTACT_RESEARCH", points: 1, title: `Найти и проверить контакт: ${channel}` })),
  { key: "follow-up-1", kind: "FOLLOW_UP", points: 1, title: "Обработать ожидающий ответ или follow-up" },
  { key: "follow-up-2", kind: "FOLLOW_UP", points: 1, title: "Обработать второй ожидающий ответ" },
  { key: "qa", kind: "QA", points: 1, title: "Проверить статусы, ссылки и доказательства" },
];

function eligibleRecords(state, date) {
  return state.records.filter((record) => !closedRecord(record)).sort((a, b) => {
    const aOverdue = a.dueDate && a.dueDate <= date ? 0 : 1;
    const bOverdue = b.dueDate && b.dueDate <= date ? 0 : 1;
    return aOverdue - bOverdue || (a.dueDate || "9999-99-99").localeCompare(b.dueDate || "9999-99-99") || String(a.priority).localeCompare(String(b.priority));
  });
}

function selectRecordForTemplate(records, template, used, activeRecordIds) {
  const available = (record) => !used.has(record.id) && !activeRecordIds.has(record.id);
  if (template.kind.startsWith("LISTING_")) return records.find((record) => available(record) && classifyRecord(record) === template.kind) || null;
  if (template.kind === "FOLLOW_UP") return records.find((record) => available(record) && /ожида|жд[её]м|follow/i.test(`${record.status} ${record.action}`)) || null;
  if (template.kind === "QA") return records.find((record) => available(record) && record.dueDate) || null;
  return null;
}

function generateDailyPlan(state, date, actorMemberId) {
  const activeMembers = state.members.filter((member) => member.active);
  if (!activeMembers.length) throw Object.assign(new Error("no_active_members"), { status: 409 });
  const records = eligibleRecords(state, date);
  const used = new Set();
  const activeRecordIds = new Set(state.tasks
    .filter((task) => task.recordId && !["DONE", "CANCELLED"].includes(task.status))
    .map((task) => task.recordId));
  const load = new Map(activeMembers.map((member) => [member.id, state.tasks.filter((task) => task.planDate === date && task.assigneeId === member.id && !["DONE", "CANCELLED"].includes(task.status)).reduce((sum, task) => sum + task.points, 0)]));
  const created = [];
  const timestamp = nowIso();

  for (const template of PLAN_TEMPLATES) {
    const key = `${date}:${template.key}`;
    const existing = state.tasks.find((task) => task.planKey === key);
    if (existing) continue;
    const record = selectRecordForTemplate(records, template, used, activeRecordIds);
    if (record) used.add(record.id);
    const assignee = [...activeMembers]
      .filter((member) => (load.get(member.id) || 0) + template.points <= member.capacityPoints)
      .sort((a, b) => (load.get(a.id) || 0) - (load.get(b.id) || 0) || a.id.localeCompare(b.id))[0] || null;
    const task = {
      id: randomUUID(), planKey: key, planDate: date, recordId: record?.id || null,
      title: record ? `${template.title}: ${record.name}` : template.title,
      kind: template.kind, category: template.kind, points: template.points, status: assignee ? "CLAIMED" : "READY",
      assigneeId: assignee?.id || null, dueAt: `${date}T18:00:00+03:00`, blockedReason: "",
      dueDate: date, notes: record?.action || "", nextAction: record?.action || "", priority: record?.priority || "P2",
      version: 1, createdAt: timestamp, updatedAt: timestamp, completedAt: "",
    };
    if (assignee) load.set(assignee.id, (load.get(assignee.id) || 0) + template.points);
    state.tasks.push(task);
    if (record) activeRecordIds.add(record.id);
    state.audit.push(createAudit("task", task.id, "PLAN_CREATE", actorMemberId, null, task));
    created.push(task);
  }
  state.audit.push(createAudit("plan", date, "PLAN_GENERATE", actorMemberId, null, null, { createdCount: created.length }));
  return { created, tasks: state.tasks.filter((task) => task.planDate === date) };
}

function patchTask(state, task, body, actorMemberId) {
  const before = clone(task);
  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    const status = normalizeText(body.status, 40);
    if (!LISTINGS_CRM_ENUMS.taskStatuses.includes(status)) throw Object.assign(new Error("invalid_task_status"), { status: 400 });
    task.status = status;
    task.completedAt = status === "DONE" ? nowIso() : "";
  }
  if (Object.prototype.hasOwnProperty.call(body, "assigneeId")) {
    const memberId = normalizeText(body.assigneeId, 160) || null;
    assertMember(state, memberId, { optional: true });
    task.assigneeId = memberId;
    if (!memberId && ["CLAIMED", "IN_PROGRESS"].includes(task.status)) task.status = "READY";
    if (memberId && task.status === "READY") task.status = "CLAIMED";
  }
  if (Object.prototype.hasOwnProperty.call(body, "blockedReason")) task.blockedReason = normalizeText(body.blockedReason, 2_000);
  if (Object.prototype.hasOwnProperty.call(body, "notes")) task.notes = normalizeText(body.notes, 5_000);
  if (Object.prototype.hasOwnProperty.call(body, "title")) task.title = normalizeText(body.title, 500) || task.title;
  if (task.status === "BLOCKED" && !task.blockedReason) throw Object.assign(new Error("blocked_reason_required"), { status: 400 });
  task.version += 1;
  task.updatedAt = nowIso();
  state.audit.push(createAudit("task", task.id, "TASK_UPDATE", actorMemberId, before, task));
  return task;
}

export async function createListingsCrmRequestHandler({ storeDir, legacyFilePath, authorize = async () => false, connectionString } = {}) {
  const repository = await createListingsCrmRepository({ storeDir, legacyFilePath, connectionString });
  return async function handleListingsCrmRequest(request, response, url) {
    const routePrefix = ["/api/marketing/listings-crm", "/api/listings-crm"]
      .find((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
    if (!routePrefix) return false;
    try {
      if (!await authorize(request)) {
        sendJson(response, 401, { ok: false, error: "marketing_write_auth_required" });
        return true;
      }
      if (request.method !== "GET") assertWriteAllowed(request);
      const parts = url.pathname.slice(routePrefix.length).split("/").filter(Boolean);
      const resource = parts[0] || "";
      const id = decodeURIComponent(parts[1] || "");
      const action = parts[2] || "";

      if (request.method === "GET" && resource === "bootstrap") {
        const state = await repository.readState();
        sendJson(response, 200, { ok: true, members: state.members, records: state.records, tasks: state.tasks, audit: decorateAudit(state, state.audit.slice(-100).reverse()), enums: LISTINGS_CRM_ENUMS, storageMode: repository.mode, serverTime: nowIso() });
        return true;
      }

      if (request.method === "GET" && resource === "audit") {
        const state = await repository.readState();
        const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100));
        const events = decorateAudit(state, state.audit.filter((event) => !url.searchParams.get("entityId") || event.entityId === url.searchParams.get("entityId")).slice(-limit).reverse());
        sendJson(response, 200, { ok: true, events, serverTime: nowIso() });
        return true;
      }

      if (request.method === "POST" && resource === "records" && !id) {
        const body = await readJsonBody(request);
        const result = await repository.mutate((state) => {
          const actor = actorMember(request, state);
          const actorMemberId = actor.id;
          const normalized = normalizeRecordInput(body);
          if (normalized.ownerMemberId) assertMember(state, normalized.ownerMemberId);
          if (normalized.ownerMemberId && normalized.ownerMemberId !== actorMemberId && !isCoordinator(actor)) {
            throw Object.assign(new Error("record_owner_forbidden"), { status: 403 });
          }
          assertUniqueDomain(state, normalized);
          const timestamp = nowIso();
          const record = { ...normalized, id: randomUUID(), version: 1, createdAt: timestamp, updatedAt: timestamp };
          state.records.push(record);
          state.audit.push(createAudit("record", record.id, "RECORD_CREATE", actorMemberId, null, record));
          return record;
        });
        sendJson(response, 201, { ok: true, record: result }, { ETag: `"${result.version}"` });
        return true;
      }

      if (request.method === "PATCH" && resource === "records" && id) {
        const body = await readJsonBody(request);
        const version = expectedVersion(request, body);
        const result = await repository.mutate((state) => {
          const actor = actorMember(request, state);
          const actorMemberId = actor.id;
          const record = findRecord(state, id);
          assertRecordAccess(state, record, actor);
          assertVersion(record, version);
          const before = clone(record);
          const normalized = normalizeRecordInput(body, record);
          if (normalized.ownerMemberId) assertMember(state, normalized.ownerMemberId);
          if (normalized.ownerMemberId && normalized.ownerMemberId !== actorMemberId && !isCoordinator(actor)) {
            throw Object.assign(new Error("record_owner_forbidden"), { status: 403 });
          }
          assertUniqueDomain(state, normalized, record.id);
          Object.assign(record, normalized, { version: record.version + 1, updatedAt: nowIso() });
          state.audit.push(createAudit("record", record.id, "RECORD_UPDATE", actorMemberId, before, record));
          return record;
        });
        sendJson(response, 200, { ok: true, record: result }, { ETag: `"${result.version}"` });
        return true;
      }

      if (request.method === "POST" && resource === "records" && id && action === "archive") {
        const body = await readJsonBody(request);
        const version = expectedVersion(request, body);
        const result = await repository.mutate((state) => {
          const actor = actorMember(request, state);
          const actorMemberId = actor.id;
          const record = findRecord(state, id);
          assertRecordAccess(state, record, actor);
          assertVersion(record, version);
          const before = clone(record);
          record.archivedAt = nowIso();
          record.status = "Архив";
          record.version += 1;
          record.updatedAt = record.archivedAt;
          for (const task of state.tasks.filter((candidate) => candidate.recordId === record.id && !["DONE", "CANCELLED"].includes(candidate.status))) {
            const taskBefore = clone(task);
            task.status = "CANCELLED";
            task.completedAt = record.archivedAt;
            task.version += 1;
            task.updatedAt = record.archivedAt;
            state.audit.push(createAudit("task", task.id, "TASK_CANCEL_ON_ARCHIVE", actorMemberId, taskBefore, task));
          }
          state.audit.push(createAudit("record", record.id, "RECORD_ARCHIVE", actorMemberId, before, record));
          return record;
        });
        sendJson(response, 200, { ok: true, record: result }, { ETag: `"${result.version}"` });
        return true;
      }

      if (request.method === "POST" && resource === "tasks" && id && action === "claim") {
        const body = await readJsonBody(request);
        const result = await repository.mutate((state) => {
          const actorMemberId = requireActor(request, state);
          const memberId = normalizeText(body.memberId || actorMemberId, 160);
          assertMember(state, memberId);
          if (memberId !== actorMemberId) throw Object.assign(new Error("member_identity_mismatch"), { status: 403 });
          const task = findTask(state, id);
          const version = expectedVersion(request, body);
          if (version && task.version !== version) throw Object.assign(new Error("version_conflict"), { status: 409, current: task });
          if (task.assigneeId && task.assigneeId !== memberId) throw Object.assign(new Error("task_already_claimed"), { status: 409, current: task });
          if (["DONE", "CANCELLED"].includes(task.status)) throw Object.assign(new Error("task_not_claimable"), { status: 409, current: task });
          if (task.assigneeId === memberId) return task;
          const before = clone(task);
          task.assigneeId = memberId;
          task.status = "CLAIMED";
          task.version += 1;
          task.updatedAt = nowIso();
          state.audit.push(createAudit("task", task.id, "TASK_CLAIM", actorMemberId || memberId, before, task));
          return task;
        });
        sendJson(response, 200, { ok: true, task: result }, { ETag: `"${result.version}"` });
        return true;
      }

      if (request.method === "POST" && resource === "tasks" && id && action === "release") {
        const body = await readJsonBody(request);
        const version = expectedVersion(request, body);
        const result = await repository.mutate((state) => {
          const actor = actorMember(request, state);
          const actorMemberId = actor.id;
          const task = findTask(state, id);
          if ((!task.assigneeId || task.assigneeId !== actorMemberId) && !isCoordinator(actor)) {
            throw Object.assign(new Error("task_owner_forbidden"), { status: 403 });
          }
          assertVersion(task, version);
          const before = clone(task);
          task.assigneeId = null;
          task.status = "READY";
          task.version += 1;
          task.updatedAt = nowIso();
          task.completedAt = "";
          state.audit.push(createAudit("task", task.id, "TASK_RELEASE", actorMemberId, before, task));
          return task;
        });
        sendJson(response, 200, { ok: true, task: result }, { ETag: `"${result.version}"` });
        return true;
      }

      if (request.method === "PATCH" && resource === "tasks" && id) {
        const body = await readJsonBody(request);
        const version = expectedVersion(request, body);
        const result = await repository.mutate((state) => {
          const actor = actorMember(request, state);
          const actorMemberId = actor.id;
          const task = findTask(state, id);
          if ((!task.assigneeId || task.assigneeId !== actorMemberId) && !isCoordinator(actor)) {
            throw Object.assign(new Error("task_owner_forbidden"), { status: 403 });
          }
          assertVersion(task, version);
          return patchTask(state, task, body, actorMemberId);
        });
        sendJson(response, 200, { ok: true, task: result }, { ETag: `"${result.version}"` });
        return true;
      }

      if (request.method === "POST" && resource === "plan" && id === "generate") {
        const body = await readJsonBody(request);
        const date = normalizeDate(body.date || moscowDate(), "plan_date", { required: true });
        const result = await repository.mutate((state) => {
          const actor = actorMember(request, state);
          if (!isCoordinator(actor)) throw Object.assign(new Error("coordinator_required"), { status: 403 });
          return generateDailyPlan(state, date, actor.id);
        });
        sendJson(response, 200, { ok: true, date, ...result, serverTime: nowIso() });
        return true;
      }

      throw Object.assign(new Error("method_not_allowed"), { status: 405 });
    } catch (error) {
      sendJson(response, error.status || 500, {
        ok: false,
        error: error.message || "server_error",
        code: publicErrorCode(error),
        current: error.current || undefined,
      });
      return true;
    }
  };
}
