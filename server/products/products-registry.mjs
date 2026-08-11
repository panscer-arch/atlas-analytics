import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInitialProductsState } from "./products-registry-seed.mjs";

export const PRODUCT_ENUMS = {
  itemTypes: ["PRODUCT", "PROGRAM", "MODULE", "CONTENT_PLATFORM", "INTERNAL_TOOL", "RESEARCH_CONCEPT"],
  lifecycleStages: ["IDEA", "DISCOVERY", "CONCEPT", "PLANNED", "DESIGN", "DEVELOPMENT", "TESTING", "PILOT_BETA", "LIVE", "ARCHIVED"],
  deliveryStates: ["NOT_STARTED", "ACTIVE", "AT_RISK", "WAITING", "BLOCKED", "PAUSED", "COMPLETED"],
  availabilityLevels: ["NONE", "DESIGN_PREVIEW", "LOCAL_DEMO", "TEST", "STAGING", "LIVE"],
  priorities: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  linkTypes: ["CONCEPT", "LOCAL_DEMO", "TEST", "STAGING", "PRODUCTION", "REPOSITORY", "FIGMA", "SPECIFICATION", "DOCUMENTATION", "ANALYTICS", "OTHER"],
  entryTypes: ["UPDATE", "DECISION", "BLOCKER", "MILESTONE", "RELEASE", "COMMENT", "STATUS_CHANGE", "OWNER_CHANGE", "LINK_CHANGE"],
};

const PRODUCT_FIELDS = [
  "name", "slug", "itemType", "parentId", "shortDescription", "fullDescription", "logoUrl", "owner", "executor",
  "responsible", "lifecycleStage", "deliveryState", "availability", "priority", "currentFocus", "nextStep",
  "reviewDate", "targetDate", "blockReason", "tags", "needsConfirmation",
];
const MAX_BODY_BYTES = 256 * 1024;
const WRITE_WINDOW_MS = 60_000;
const WRITE_LIMIT = Number(process.env.ATLAS_PRODUCTS_RATE_LIMIT || 90);
const requestBuckets = new Map();

function clone(value) {
  return structuredClone(value);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value, max = 10_000) {
  return String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
}

function sanitizeMarkdown(value, max = 40_000) {
  return normalizeText(value, max)
    .replace(/<\s*\/?\s*(script|iframe|object|embed|style|form)[^>]*>/gi, "")
    .replace(/on\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/javascript\s*:/gi, "blocked:");
}

function safeSlug(value) {
  return normalizeText(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "") || `product-${Date.now()}`;
}

function validateEnum(value, values, field) {
  if (!values.includes(value)) throw Object.assign(new Error(`invalid_${field}`), { status: 400 });
  return value;
}

function validateUrl(value) {
  let parsed;
  try {
    parsed = new URL(normalizeText(value, 2_000));
  } catch {
    throw Object.assign(new Error("invalid_url"), { status: 400 });
  }
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) {
    throw Object.assign(new Error("unsafe_url_protocol"), { status: 400 });
  }
  return parsed.toString();
}

function normalizeProductInput(input, current = {}) {
  const next = { ...current };
  for (const field of PRODUCT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) next[field] = input[field];
  }
  next.name = normalizeText(next.name, 160);
  if (!next.name) throw Object.assign(new Error("name_required"), { status: 400 });
  next.slug = safeSlug(next.slug || next.name);
  next.itemType = validateEnum(next.itemType || "PRODUCT", PRODUCT_ENUMS.itemTypes, "item_type");
  next.lifecycleStage = validateEnum(next.lifecycleStage || "IDEA", PRODUCT_ENUMS.lifecycleStages, "lifecycle_stage");
  next.deliveryState = validateEnum(next.deliveryState || "NOT_STARTED", PRODUCT_ENUMS.deliveryStates, "delivery_state");
  next.availability = validateEnum(next.availability || "NONE", PRODUCT_ENUMS.availabilityLevels, "availability");
  next.priority = validateEnum(next.priority || "MEDIUM", PRODUCT_ENUMS.priorities, "priority");
  next.parentId = normalizeText(next.parentId, 160) || null;
  next.shortDescription = sanitizeMarkdown(next.shortDescription, 800);
  next.fullDescription = sanitizeMarkdown(next.fullDescription, 40_000);
  next.logoUrl = next.logoUrl ? validateUrl(next.logoUrl) : "";
  next.owner = normalizeText(next.owner, 160);
  next.executor = normalizeText(next.executor, 160);
  next.responsible = normalizeText(next.responsible, 160);
  next.currentFocus = sanitizeMarkdown(next.currentFocus, 2_000);
  next.nextStep = sanitizeMarkdown(next.nextStep, 2_000);
  next.reviewDate = normalizeText(next.reviewDate, 40);
  next.targetDate = normalizeText(next.targetDate, 40);
  next.blockReason = sanitizeMarkdown(next.blockReason, 2_000);
  next.tags = Array.isArray(next.tags) ? next.tags.map((tag) => normalizeText(tag, 60)).filter(Boolean).slice(0, 30) : [];
  next.needsConfirmation = Boolean(next.needsConfirmation);
  return next;
}

function assertNoParentCycle(products, productId, parentId) {
  if (!parentId) return;
  if (productId === parentId) throw Object.assign(new Error("parent_cycle"), { status: 400 });
  const byId = new Map(products.map((product) => [product.id, product]));
  if (!byId.has(parentId)) throw Object.assign(new Error("parent_not_found"), { status: 400 });
  let cursor = byId.get(parentId);
  const seen = new Set();
  while (cursor) {
    if (cursor.id === productId || seen.has(cursor.id)) {
      throw Object.assign(new Error("parent_cycle"), { status: 400 });
    }
    seen.add(cursor.id);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : null;
  }
}

function productSnapshot(product) {
  return Object.fromEntries([...PRODUCT_FIELDS, "id", "version", "createdAt", "updatedAt", "lastActivityAt", "archivedAt"]
    .map((key) => [key, clone(product[key])]));
}

function createAudit(productId, action, actorName, before, after) {
  return { id: randomUUID(), productId, action, actorName, beforeJson: before, afterJson: after, createdAt: nowIso() };
}

function actor(input) {
  return normalizeText(input?.actorName, 100) || "Гость";
}

function createFileRepository(storeDir) {
  const filePath = path.join(storeDir, "products-registry-v1.json");
  let queue = Promise.resolve();

  async function readState() {
    await mkdir(storeDir, { recursive: true });
    try {
      const parsed = JSON.parse(await readFile(filePath, "utf8"));
      if (!Array.isArray(parsed.products)) throw new Error("invalid_products_store");
      return parsed;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const state = createInitialProductsState();
      await persist(state);
      return state;
    }
  }

  async function persist(state) {
    await mkdir(storeDir, { recursive: true });
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, JSON.stringify(state, null, 2), "utf8");
    await rename(tempPath, filePath);
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

  return {
    mode: "file",
    readState,
    mutate,
  };
}

function pgRowToProduct(row) {
  return {
    id: row.id, slug: row.slug, name: row.name, itemType: row.item_type, parentId: row.parent_id,
    shortDescription: row.short_description, fullDescription: row.full_description, logoUrl: row.logo_url,
    owner: row.owner_name, executor: row.executor_name, responsible: row.responsible_name,
    lifecycleStage: row.lifecycle_stage, deliveryState: row.delivery_state, availability: row.availability,
    priority: row.priority, currentFocus: row.current_focus, nextStep: row.next_step, reviewDate: row.review_date,
    targetDate: row.target_date, blockReason: row.block_reason, tags: row.tags || [], needsConfirmation: row.needs_confirmation,
    version: row.version, lastActivityAt: row.last_activity_at?.toISOString?.() || row.last_activity_at,
    archivedAt: row.archived_at?.toISOString?.() || row.archived_at,
    createdAt: row.created_at?.toISOString?.() || row.created_at, updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  };
}

async function createPostgresRepository(connectionString) {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString, max: Number(process.env.ATLAS_PRODUCTS_PG_POOL || 8) });
  const migrationPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "001_products_registry.sql");
  await pool.query(await readFile(migrationPath, "utf8"));
  const seeded = await pool.query("SELECT count(*)::int AS count FROM atlas_products");
  if (!seeded.rows[0].count) {
    const seed = createInitialProductsState();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const item of seed.products) await upsertProductRow(client, item);
      for (const item of seed.links) await insertLinkRow(client, item);
      for (const item of seed.entries) await insertEntryRow(client, item);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function readState(client = pool) {
    const [products, links, entries, audit] = await Promise.all([
      client.query("SELECT * FROM atlas_products ORDER BY updated_at DESC"),
      client.query("SELECT * FROM atlas_product_links ORDER BY created_at"),
      client.query("SELECT * FROM atlas_product_entries ORDER BY occurred_at DESC"),
      client.query("SELECT * FROM atlas_product_audit_events ORDER BY created_at DESC"),
    ]);
    return {
      schemaVersion: 1,
      products: products.rows.map(pgRowToProduct),
      links: links.rows.map((row) => ({ id: row.id, productId: row.product_id, type: row.type, label: row.label, url: row.url, environment: row.environment, verifiedAt: row.verified_at?.toISOString?.() || row.verified_at || "", checkStatus: row.check_status, createdAt: row.created_at?.toISOString?.() || row.created_at })),
      entries: entries.rows.map((row) => ({ id: row.id, productId: row.product_id, type: row.type, authorName: row.author_name, bodyMd: row.body_md, occurredAt: row.occurred_at?.toISOString?.() || row.occurred_at, supersedesEntryId: row.supersedes_entry_id })),
      auditEvents: audit.rows.map((row) => ({ id: row.id, productId: row.product_id, action: row.action, actorName: row.actor_name, beforeJson: row.before_json, afterJson: row.after_json, createdAt: row.created_at?.toISOString?.() || row.created_at })),
    };
  }

  return {
    mode: "postgres",
    readState,
    async mutate(operation) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("LOCK TABLE atlas_products IN SHARE ROW EXCLUSIVE MODE");
        const before = await readState(client);
        const state = clone(before);
        const result = await operation(state);
        await replacePostgresState(client, before, state);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

async function upsertProductRow(client, item) {
  await client.query(`INSERT INTO atlas_products (id,slug,name,item_type,parent_id,short_description,full_description,logo_url,owner_name,executor_name,responsible_name,lifecycle_stage,delivery_state,availability,priority,current_focus,next_step,review_date,target_date,block_reason,tags,needs_confirmation,version,last_activity_at,archived_at,created_at,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
    ON CONFLICT (id) DO UPDATE SET slug=excluded.slug,name=excluded.name,item_type=excluded.item_type,parent_id=excluded.parent_id,short_description=excluded.short_description,full_description=excluded.full_description,logo_url=excluded.logo_url,owner_name=excluded.owner_name,executor_name=excluded.executor_name,responsible_name=excluded.responsible_name,lifecycle_stage=excluded.lifecycle_stage,delivery_state=excluded.delivery_state,availability=excluded.availability,priority=excluded.priority,current_focus=excluded.current_focus,next_step=excluded.next_step,review_date=excluded.review_date,target_date=excluded.target_date,block_reason=excluded.block_reason,tags=excluded.tags,needs_confirmation=excluded.needs_confirmation,version=excluded.version,last_activity_at=excluded.last_activity_at,archived_at=excluded.archived_at,updated_at=excluded.updated_at`,
  [item.id,item.slug,item.name,item.itemType,item.parentId,item.shortDescription,item.fullDescription,item.logoUrl,item.owner,item.executor,item.responsible,item.lifecycleStage,item.deliveryState,item.availability,item.priority,item.currentFocus,item.nextStep,item.reviewDate,item.targetDate,item.blockReason,JSON.stringify(item.tags),item.needsConfirmation,item.version,item.lastActivityAt,item.archivedAt,item.createdAt,item.updatedAt]);
}

async function insertLinkRow(client, item) {
  await client.query("INSERT INTO atlas_product_links (id,product_id,type,label,url,environment,verified_at,check_status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING", [item.id,item.productId,item.type,item.label,item.url,item.environment,item.verifiedAt || null,item.checkStatus,item.createdAt]);
}

async function insertEntryRow(client, item) {
  await client.query("INSERT INTO atlas_product_entries (id,product_id,type,author_name,body_md,occurred_at,supersedes_entry_id) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING", [item.id,item.productId,item.type,item.authorName,item.bodyMd,item.occurredAt,item.supersedesEntryId]);
}

async function replacePostgresState(client, before, state) {
  for (const item of state.products) await upsertProductRow(client, item);
  const beforeLinks = new Set(before.links.map((item) => item.id));
  for (const item of state.links) if (!beforeLinks.has(item.id)) await insertLinkRow(client, item);
  const beforeEntries = new Set(before.entries.map((item) => item.id));
  for (const item of state.entries) if (!beforeEntries.has(item.id)) await insertEntryRow(client, item);
  const beforeAudit = new Set(before.auditEvents.map((item) => item.id));
  for (const item of state.auditEvents) if (!beforeAudit.has(item.id)) {
    await client.query("INSERT INTO atlas_product_audit_events (id,product_id,action,actor_name,before_json,after_json,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [item.id,item.productId,item.action,item.actorName,JSON.stringify(item.beforeJson),JSON.stringify(item.afterJson),item.createdAt]);
  }
}

function getProduct(state, idOrSlug) {
  return state.products.find((item) => item.id === idOrSlug || item.slug === idOrSlug);
}

function getDetails(state, product) {
  return {
    ...clone(product),
    links: state.links.filter((item) => item.productId === product.id),
    entries: state.entries.filter((item) => item.productId === product.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    auditEvents: state.auditEvents.filter((item) => item.productId === product.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    children: state.products.filter((item) => item.parentId === product.id).map((item) => ({ id: item.id, slug: item.slug, name: item.name, itemType: item.itemType })),
  };
}

function stale(product) {
  if (product.archivedAt) return false;
  const days = ["ACTIVE", "AT_RISK", "WAITING", "BLOCKED"].includes(product.deliveryState) ? 14 : 30;
  return Date.now() - new Date(product.lastActivityAt).getTime() > days * 86_400_000;
}

function filterProducts(state, params) {
  const linksByProduct = new Map();
  for (const item of state.links) {
    if (!linksByProduct.has(item.productId)) linksByProduct.set(item.productId, []);
    linksByProduct.get(item.productId).push(item);
  }
  let items = state.products.map((item) => ({ ...item, links: linksByProduct.get(item.id) || [], isStale: stale(item) }));
  const view = params.get("view") || "all";
  if (view !== "archive") items = items.filter((item) => !item.archivedAt);
  if (view === "active") items = items.filter((item) => ["ACTIVE", "AT_RISK", "WAITING", "BLOCKED"].includes(item.deliveryState));
  if (view === "attention") items = items.filter((item) => item.needsConfirmation || item.isStale || ["AT_RISK", "WAITING", "BLOCKED", "PAUSED"].includes(item.deliveryState));
  if (view === "ideas") items = items.filter((item) => ["IDEA", "DISCOVERY", "CONCEPT"].includes(item.lifecycleStage));
  if (view === "live") items = items.filter((item) => item.lifecycleStage === "LIVE" || item.availability === "LIVE");
  if (view === "archive") items = items.filter((item) => item.archivedAt);
  const q = normalizeText(params.get("q"), 160).toLocaleLowerCase("ru");
  if (q) items = items.filter((item) => [item.name,item.shortDescription,item.fullDescription,item.owner,item.executor,item.responsible,item.tags.join(" ")].join(" ").toLocaleLowerCase("ru").includes(q));
  for (const [param, field] of [["stage","lifecycleStage"],["state","deliveryState"],["type","itemType"],["owner","owner"],["executor","executor"]]) {
    const value = params.get(param);
    if (value) items = items.filter((item) => item[field] === value);
  }
  const hasLink = params.get("hasLink");
  if (hasLink === "demo") items = items.filter((item) => item.links.some((link) => ["LOCAL_DEMO","TEST","STAGING","PRODUCTION"].includes(link.type)));
  if (hasLink === "repo") items = items.filter((item) => item.links.some((link) => link.type === "REPOSITORY"));
  const updated = params.get("updated");
  if (updated) items = items.filter((item) => Date.now() - new Date(item.lastActivityAt).getTime() <= Number(updated) * 86_400_000);
  const sort = params.get("sort") || "updated";
  items.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "ru") : sort === "stage" ? PRODUCT_ENUMS.lifecycleStages.indexOf(a.lifecycleStage) - PRODUCT_ENUMS.lifecycleStages.indexOf(b.lifecycleStage) : sort === "target" ? (a.targetDate || "9999").localeCompare(b.targetDate || "9999") : b.lastActivityAt.localeCompare(a.lastActivityAt));
  return items;
}

function counts(state) {
  const current = state.products.filter((item) => !item.archivedAt);
  return {
    total: current.length,
    active: current.filter((item) => ["ACTIVE", "AT_RISK", "WAITING", "BLOCKED"].includes(item.deliveryState)).length,
    testing: current.filter((item) => ["TESTING", "PILOT_BETA"].includes(item.lifecycleStage)).length,
    live: current.filter((item) => item.lifecycleStage === "LIVE" || item.availability === "LIVE").length,
    blocked: current.filter((item) => item.deliveryState === "BLOCKED").length,
    stale: current.filter(stale).length,
  };
}

function buildExport(product) {
  const lines = [`# ${product.name}`, "", `- ID: \`${product.id}\``, `- Снимок: ${nowIso()}`, `- Тип: ${product.itemType}`, `- Стадия: ${product.lifecycleStage}`, `- Состояние: ${product.deliveryState}`, `- Доступность: ${product.availability}`, `- Владелец: ${product.owner || "—"}`, `- Исполнитель: ${product.executor || "—"}`, `- Ответственный: ${product.responsible || "—"}`, `- Последнее обновление: ${product.lastActivityAt}`, "", "## Кратко", "", product.shortDescription || "—", "", "## Текущий фокус", "", product.currentFocus || "—", "", "## Следующий шаг", "", product.nextStep || "—", "", "## Блокер / ожидание", "", product.blockReason || "—", "", "## Ссылки", ""];
  if (!product.links.length) lines.push("- Нет ссылок");
  for (const item of product.links) lines.push(`- [${item.label}](${item.url}) — ${item.type}, ${item.environment}, ${item.checkStatus}${item.verifiedAt ? `, проверено ${item.verifiedAt}` : ""}`);
  lines.push("", "## Хронология", "");
  if (!product.entries.length) lines.push("- Нет событий");
  for (const item of [...product.entries].reverse()) lines.push(`### ${item.occurredAt} · ${item.type}`, "", `Автор: ${item.authorName}`, "", item.bodyMd, "");
  return `${lines.join("\n")}\n`;
}

async function readJsonBody(request) {
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

function sendJson(response, status, value, extraHeaders = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders });
  response.end(JSON.stringify(value));
}

function assertWriteAllowed(request) {
  if (process.env.ATLAS_PRODUCTS_WRITE_ENABLED === "0") throw Object.assign(new Error("writes_disabled"), { status: 503 });
  const origin = request.headers.origin;
  if (origin) {
    const allowed = new Set((process.env.ATLAS_PRODUCTS_ALLOWED_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean));
    const protocol = request.headers["x-forwarded-proto"] || "http";
    const validOrigins = new Set([
      `${protocol}://${request.headers.host}`,
      request.headers["x-forwarded-host"] ? `${protocol}://${request.headers["x-forwarded-host"]}` : "",
    ].filter(Boolean));
    let originUrl;
    try {
      originUrl = new URL(origin);
    } catch {
      throw Object.assign(new Error("origin_not_allowed"), { status: 403 });
    }
    const remoteAddress = String(request.socket?.remoteAddress || "");
    const localDevelopmentRequest = ["127.0.0.1", "localhost", "::1"].includes(originUrl.hostname)
      && (remoteAddress.includes("127.0.0.1") || remoteAddress.includes("::1"));
    if (!validOrigins.has(origin) && !allowed.has(origin) && !localDevelopmentRequest) {
      throw Object.assign(new Error("origin_not_allowed"), { status: 403 });
    }
  }
  const key = String(request.headers["x-real-ip"] || request.socket?.remoteAddress || "unknown").trim();
  const current = Date.now();
  const bucket = requestBuckets.get(key);
  if (!bucket || current - bucket.startedAt >= WRITE_WINDOW_MS) requestBuckets.set(key, { startedAt: current, count: 1 });
  else {
    bucket.count += 1;
    if (bucket.count > WRITE_LIMIT) throw Object.assign(new Error("rate_limit_exceeded"), { status: 429 });
  }
}

function expectedVersion(request, body) {
  const raw = String(request.headers["if-match"] ?? body.version ?? "").trim();
  const match = raw.match(/^(?:W\/)?"?(\d+)"?$/);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function assertVersion(product, version) {
  if (version && product.version !== version) throw Object.assign(new Error("version_conflict"), { status: 409, current: product });
}

export async function createProductsRequestHandler({ storeDir }) {
  const repository = process.env.ATLAS_PRODUCTS_DATABASE_URL
    ? await createPostgresRepository(process.env.ATLAS_PRODUCTS_DATABASE_URL)
    : createFileRepository(storeDir);

  return async function handleProductsRequest(request, response, url) {
    if (url.pathname !== "/api/products" && !url.pathname.startsWith("/api/products/")) return false;
    try {
      const parts = url.pathname.split("/").filter(Boolean);
      const idOrSlug = decodeURIComponent(parts[2] || "");
      const action = parts[3] || "";
      if (request.method !== "GET") assertWriteAllowed(request);

      if (request.method === "GET" && !idOrSlug) {
        const state = await repository.readState();
        const owners = [...new Set(state.products.map((item) => item.owner).filter(Boolean))].sort();
        const executors = [...new Set(state.products.map((item) => item.executor).filter(Boolean))].sort();
        sendJson(response, 200, { ok: true, items: filterProducts(state, url.searchParams), counts: counts(state), facets: { owners, executors }, enums: PRODUCT_ENUMS, storageMode: repository.mode });
        return true;
      }

      if (request.method === "POST" && !idOrSlug) {
        const body = await readJsonBody(request);
        const result = await repository.mutate((state) => {
          const normalized = normalizeProductInput(body);
          if (["BLOCKED", "WAITING"].includes(normalized.deliveryState) && !normalized.blockReason) {
            throw Object.assign(new Error("block_reason_required"), { status: 400 });
          }
          const duplicate = state.products.find((item) => item.name.toLocaleLowerCase("ru") === normalized.name.toLocaleLowerCase("ru") || item.slug === normalized.slug);
          if (duplicate) throw Object.assign(new Error("possible_duplicate"), { status: 409, current: duplicate });
          const timestamp = nowIso();
          const item = { ...normalized, id: randomUUID(), version: 1, lastActivityAt: timestamp, archivedAt: null, createdAt: timestamp, updatedAt: timestamp };
          assertNoParentCycle(state.products, item.id, item.parentId);
          state.products.push(item);
          state.auditEvents.push(createAudit(item.id, "CREATE", actor(body), null, productSnapshot(item)));
          return getDetails(state, item);
        });
        sendJson(response, 201, { ok: true, item: result }, { ETag: `"${result.version}"` });
        return true;
      }

      const stateForLookup = await repository.readState();
      const found = getProduct(stateForLookup, idOrSlug);
      if (!found) throw Object.assign(new Error("product_not_found"), { status: 404 });

      if (request.method === "GET" && action === "export.md") {
        const details = getDetails(stateForLookup, found);
        response.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${found.slug}.md"`, "Cache-Control": "no-store" });
        response.end(buildExport(details));
        return true;
      }

      if (request.method === "GET" && !action) {
        const item = getDetails(stateForLookup, found);
        sendJson(response, 200, { ok: true, item, enums: PRODUCT_ENUMS, storageMode: repository.mode }, { ETag: `"${item.version}"` });
        return true;
      }

      const body = await readJsonBody(request);
      const version = expectedVersion(request, body);
      if (!version) throw Object.assign(new Error("version_required"), { status: 428 });
      const result = await repository.mutate((state) => {
        const item = getProduct(state, found.id);
        if (!item) throw Object.assign(new Error("product_not_found"), { status: 404 });
        assertVersion(item, version);
        const before = productSnapshot(item);
        const timestamp = nowIso();
        const authorName = actor(body);

        if (request.method === "PATCH" && !action) {
          const normalized = normalizeProductInput(body, item);
          const duplicate = state.products.find((candidate) => candidate.id !== item.id && (candidate.name.toLocaleLowerCase("ru") === normalized.name.toLocaleLowerCase("ru") || candidate.slug === normalized.slug));
          if (duplicate) throw Object.assign(new Error("possible_duplicate"), { status: 409, current: duplicate });
          assertNoParentCycle(state.products, item.id, normalized.parentId);
          if (["BLOCKED", "WAITING"].includes(normalized.deliveryState) && !normalized.blockReason) {
            throw Object.assign(new Error("block_reason_required"), { status: 400 });
          }
          const statusChanges = ["lifecycleStage", "deliveryState", "availability"]
            .filter((field) => normalized[field] !== item[field]);
          Object.assign(item, normalized, { version: item.version + 1, updatedAt: timestamp, lastActivityAt: timestamp });
          if (statusChanges.length) {
            state.entries.push({
              id: randomUUID(),
              productId: item.id,
              type: "STATUS_CHANGE",
              authorName,
              bodyMd: sanitizeMarkdown(body.statusNote, 4_000)
                || statusChanges.map((field) => `${field}: ${before[field]} → ${item[field]}`).join("\n"),
              occurredAt: timestamp,
              supersedesEntryId: null,
            });
          }
          state.auditEvents.push(createAudit(item.id, "UPDATE", authorName, before, productSnapshot(item)));
          return getDetails(state, item);
        }

        if (request.method === "POST" && action === "entries") {
          const entryType = validateEnum(body.type || "UPDATE", PRODUCT_ENUMS.entryTypes, "entry_type");
          const bodyMd = sanitizeMarkdown(body.bodyMd, 20_000);
          if (!bodyMd) throw Object.assign(new Error("entry_body_required"), { status: 400 });
          const supersedesEntryId = normalizeText(body.supersedesEntryId, 160) || null;
          if (supersedesEntryId && !state.entries.some((entry) => entry.id === supersedesEntryId && entry.productId === item.id)) throw Object.assign(new Error("superseded_entry_not_found"), { status: 400 });
          state.entries.push({ id: randomUUID(), productId: item.id, type: entryType, authorName, bodyMd, occurredAt: timestamp, supersedesEntryId });
          item.version += 1; item.updatedAt = timestamp; item.lastActivityAt = timestamp;
          state.auditEvents.push(createAudit(item.id, "ADD_ENTRY", authorName, before, productSnapshot(item)));
          return getDetails(state, item);
        }

        if (request.method === "POST" && action === "links") {
          const type = validateEnum(body.type || "OTHER", PRODUCT_ENUMS.linkTypes, "link_type");
          const normalizedUrl = validateUrl(body.url);
          const duplicate = state.links.find((link) => link.url === normalizedUrl);
          if (duplicate) throw Object.assign(new Error("possible_duplicate_link"), { status: 409, current: duplicate });
          const environment = validateEnum(body.environment || "TEST", ["LOCAL", "TEST", "STAGING", "LIVE"], "link_environment");
          state.links.push({ id: randomUUID(), productId: item.id, type, label: normalizeText(body.label, 160) || type, url: normalizedUrl, environment, verifiedAt: "", checkStatus: "UNCHECKED", createdAt: timestamp });
          item.version += 1; item.updatedAt = timestamp; item.lastActivityAt = timestamp;
          state.auditEvents.push(createAudit(item.id, "ADD_LINK", authorName, before, productSnapshot(item)));
          return getDetails(state, item);
        }

        if (request.method === "POST" && action === "transition") {
          const next = normalizeProductInput({ ...item, ...body }, item);
          const changed = ["lifecycleStage", "deliveryState", "availability"].filter((field) => next[field] !== item[field]);
          if (!changed.length) throw Object.assign(new Error("transition_required"), { status: 400 });
          for (const field of changed) item[field] = next[field];
          if (["BLOCKED", "WAITING"].includes(item.deliveryState) && !normalizeText(body.blockReason || item.blockReason)) throw Object.assign(new Error("block_reason_required"), { status: 400 });
          item.blockReason = sanitizeMarkdown(body.blockReason ?? item.blockReason, 2_000);
          item.version += 1; item.updatedAt = timestamp; item.lastActivityAt = timestamp;
          state.entries.push({ id: randomUUID(), productId: item.id, type: "STATUS_CHANGE", authorName, bodyMd: sanitizeMarkdown(body.note, 4_000) || changed.map((field) => `${field}: ${before[field]} → ${item[field]}`).join("\n"), occurredAt: timestamp, supersedesEntryId: null });
          state.auditEvents.push(createAudit(item.id, "TRANSITION", authorName, before, productSnapshot(item)));
          return getDetails(state, item);
        }

        if (request.method === "POST" && ["archive", "restore"].includes(action)) {
          item.archivedAt = action === "archive" ? timestamp : null;
          if (action === "archive") item.lifecycleStage = "ARCHIVED";
          else if (item.lifecycleStage === "ARCHIVED") {
            const archiveEvent = [...state.auditEvents].reverse().find((event) => event.productId === item.id && event.action === "ARCHIVE" && event.beforeJson);
            item.lifecycleStage = archiveEvent?.beforeJson?.lifecycleStage || "IDEA";
          }
          item.version += 1; item.updatedAt = timestamp; item.lastActivityAt = timestamp;
          state.entries.push({ id: randomUUID(), productId: item.id, type: "STATUS_CHANGE", authorName, bodyMd: action === "archive" ? "Карточка архивирована." : "Карточка восстановлена из архива.", occurredAt: timestamp, supersedesEntryId: null });
          state.auditEvents.push(createAudit(item.id, action.toUpperCase(), authorName, before, productSnapshot(item)));
          return getDetails(state, item);
        }

        if (request.method === "POST" && action === "restore-version") {
          const event = state.auditEvents.find((candidate) => candidate.id === body.auditEventId && candidate.productId === item.id && candidate.beforeJson);
          if (!event) throw Object.assign(new Error("version_snapshot_not_found"), { status: 404 });
          const restored = normalizeProductInput(event.beforeJson, item);
          assertNoParentCycle(state.products, item.id, restored.parentId);
          Object.assign(item, restored, { id: item.id, version: item.version + 1, updatedAt: timestamp, lastActivityAt: timestamp });
          state.entries.push({ id: randomUUID(), productId: item.id, type: "STATUS_CHANGE", authorName, bodyMd: `Восстановлена предыдущая версия из события ${event.id}.`, occurredAt: timestamp, supersedesEntryId: null });
          state.auditEvents.push(createAudit(item.id, "RESTORE_VERSION", authorName, before, productSnapshot(item)));
          return getDetails(state, item);
        }

        throw Object.assign(new Error("method_not_allowed"), { status: 405 });
      });
      sendJson(response, 200, { ok: true, item: result }, { ETag: `"${result.version}"` });
      return true;
    } catch (error) {
      sendJson(response, error.status || 500, { ok: false, error: error.message || "server_error", current: error.current || undefined });
      return true;
    }
  };
}
