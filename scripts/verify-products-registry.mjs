import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const port = 18_800 + Math.floor(Math.random() * 700);
const storeDir = await mkdtemp(path.join(os.tmpdir(), "atlas-products-verify-"));
const backupDir = path.join(storeDir, "verified-backups");
const baseUrl = `http://127.0.0.1:${port}/api/products`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(pathname = "", options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, body };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const result = await request();
      if (result.status === 200) return;
    } catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("products_server_start_timeout");
}

function startServer() {
  return spawn(process.execPath, ["server/content-api.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, ATLAS_CONTENT_API_PORT: String(port), ATLAS_CONTENT_STORE_DIR: storeDir },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runScript(script, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("exit", (code) => code === 0 ? resolve(stdout) : reject(new Error(`${script}_failed_${code}: ${stderr}`)));
  });
}

let server = startServer();

try {
  await waitForServer();
  const initial = await request();
  assert(initial.body.items.length >= 20, "initial_seed_missing");

  const topLevel = await request("?scope=top");
  assert(topLevel.status === 200, "top_level_scope_failed");
  assert(topLevel.body.items.every((item) => !item.parentId), "child_product_leaked_into_top_level_scope");
  assert(topLevel.body.items.length < initial.body.items.length, "top_level_scope_did_not_hide_children");
  assert(topLevel.body.counts.total === topLevel.body.items.length, "top_level_count_mismatch");

  const created = await request("", {
    method: "POST",
    body: JSON.stringify({
      name: "Products Registry Verification",
      shortDescription: "Автоматическая проверочная карточка.<script>alert(1)</script>",
      itemType: "PRODUCT",
      parentId: "supersus",
      lifecycleStage: "IDEA",
      deliveryState: "NOT_STARTED",
      availability: "NONE",
      priority: "MEDIUM",
      actorName: "Verification",
    }),
  });
  assert(created.status === 201, "create_failed");
  const product = created.body.item;
  assert(!product.shortDescription.includes("<script"), "unsafe_markdown_persisted");

  const updated = await request(`/${product.id}`, {
    method: "PATCH",
    headers: { "if-match": '"1"' },
    body: JSON.stringify({
      ...product,
      lifecycleStage: "DISCOVERY",
      actorName: "Verification",
      version: 1,
    }),
  });
  assert(updated.status === 200 && updated.body.item.version === 2, "version_increment_failed");
  assert(updated.body.item.entries.some((entry) => entry.type === "STATUS_CHANGE"), "status_history_missing");

  const conflict = await request(`/${product.id}`, {
    method: "PATCH",
    headers: { "if-match": '"1"' },
    body: JSON.stringify({ name: product.name, actorName: "Verification", version: 1 }),
  });
  assert(conflict.status === 409 && conflict.body.error === "version_conflict", "optimistic_lock_failed");

  const missingVersion = await request(`/${product.id}/entries`, {
    method: "POST",
    body: JSON.stringify({ type: "UPDATE", bodyMd: "No version", actorName: "Verification" }),
  });
  assert(missingVersion.status === 428 && missingVersion.body.error === "version_required", "version_requirement_missing");

  const missingBlockReason = await request(`/${product.id}`, {
    method: "PATCH",
    headers: { "if-match": '"2"' },
    body: JSON.stringify({ deliveryState: "BLOCKED", actorName: "Verification", version: 2 }),
  });
  assert(missingBlockReason.status === 400 && missingBlockReason.body.error === "block_reason_required", "block_reason_requirement_missing");

  const unsafeLink = await request(`/${product.id}/links`, {
    method: "POST",
    headers: { "if-match": '"2"' },
    body: JSON.stringify({ type: "OTHER", label: "Unsafe", url: "javascript:alert(1)", environment: "TEST", actorName: "Verification", version: 2 }),
  });
  assert(unsafeLink.status === 400 && unsafeLink.body.error === "unsafe_url_protocol", "unsafe_url_accepted");

  const repositoryLink = await request(`/${product.id}/links`, {
    method: "POST",
    headers: { "if-match": '"2"' },
    body: JSON.stringify({ type: "REPOSITORY", label: "Repo", url: "https://github.com/example/products-registry", environment: "TEST", actorName: "Verification", version: 2 }),
  });
  assert(repositoryLink.status === 200 && repositoryLink.body.item.version === 3, "link_create_failed");

  const duplicateLink = await request(`/${product.id}/links`, {
    method: "POST",
    headers: { "if-match": '"3"' },
    body: JSON.stringify({ type: "REPOSITORY", label: "Repo duplicate", url: "https://github.com/example/products-registry", environment: "TEST", actorName: "Verification", version: 3 }),
  });
  assert(duplicateLink.status === 409 && duplicateLink.body.error === "possible_duplicate_link", "duplicate_link_accepted");

  const entry = await request(`/${product.id}/entries`, {
    method: "POST",
    headers: { "if-match": '"3"' },
    body: JSON.stringify({ type: "DECISION", bodyMd: "Keep the registry separate from tasks.", actorName: "Verification", version: 3 }),
  });
  assert(entry.status === 200 && entry.body.item.version === 4, "entry_create_failed");

  const filtered = await request("?q=Products&hasLink=repo&sort=name");
  assert(filtered.status === 200 && filtered.body.items.some((item) => item.id === product.id), "search_filter_failed");

  const archived = await request(`/${product.id}/archive`, {
    method: "POST",
    headers: { "if-match": '"4"' },
    body: JSON.stringify({ actorName: "Verification", version: 4 }),
  });
  assert(archived.status === 200 && archived.body.item.lifecycleStage === "ARCHIVED", "archive_failed");
  const parentAfterArchive = await request("/supersus");
  assert(!parentAfterArchive.body.item.children.some((item) => item.id === product.id), "archived_child_visible_in_parent");

  const restored = await request(`/${product.id}/restore`, {
    method: "POST",
    headers: { "if-match": '"5"' },
    body: JSON.stringify({ actorName: "Verification", version: 5 }),
  });
  assert(restored.status === 200 && restored.body.item.lifecycleStage === "DISCOVERY" && restored.body.item.version === 6, "restore_failed");

  const repositoryLinkId = repositoryLink.body.item.links.find((link) => link.type === "REPOSITORY")?.id;
  const updatedLink = await request(`/${product.id}/links/${repositoryLinkId}`, {
    method: "PATCH",
    headers: { "if-match": '"6"' },
    body: JSON.stringify({
      type: "REPOSITORY",
      label: "Current repo",
      url: "https://github.com/example/products-registry-current",
      environment: "LIVE",
      checkStatus: "VERIFIED",
      actorName: "Verification",
      version: 6,
    }),
  });
  assert(updatedLink.status === 200 && updatedLink.body.item.version === 7, "link_update_failed");
  assert(updatedLink.body.item.links.some((link) => link.id === repositoryLinkId && link.url.endsWith("products-registry-current") && link.checkStatus === "VERIFIED"), "link_update_not_persisted");

  const invalidVerificationDate = await request(`/${product.id}/links/${repositoryLinkId}`, {
    method: "PATCH",
    headers: { "if-match": '"7"' },
    body: JSON.stringify({ verifiedAt: "not-a-date", actorName: "Verification", version: 7 }),
  });
  assert(invalidVerificationDate.status === 400 && invalidVerificationDate.body.error === "invalid_verified_at", "invalid_verification_date_accepted");

  const foreignOrigin = await request(`/${product.id}`, {
    method: "PATCH",
    headers: { "if-match": '"7"', origin: "https://evil.example" },
    body: JSON.stringify({ name: product.name, actorName: "Verification", version: 7 }),
  });
  assert(foreignOrigin.status === 403 && foreignOrigin.body.error === "origin_not_allowed", "foreign_origin_accepted");

  const supersus = (await request("/supersus")).body.item;
  const cycle = await request("/supersus", {
    method: "PATCH",
    headers: { "if-match": `"${supersus.version}"` },
    body: JSON.stringify({ ...supersus, parentId: "supersus-crm-board", actorName: "Verification", version: supersus.version }),
  });
  assert(cycle.status === 400 && cycle.body.error === "parent_cycle", "parent_cycle_accepted");

  server.kill("SIGTERM");
  await new Promise((resolve) => server.once("exit", resolve));
  server = startServer();
  await waitForServer();
  const persisted = await request(`/${product.id}`);
  assert(persisted.status === 200 && persisted.body.item.version === 7, "restart_persistence_failed");

  const exported = await fetch(`${baseUrl}/${product.id}/export.md`);
  const markdown = await exported.text();
  assert(exported.status === 200 && markdown.includes("# Products Registry Verification") && markdown.includes("DISCOVERY") && markdown.includes("Keep the registry separate") && markdown.includes("github.com/example/products-registry-current"), "markdown_export_failed");

  const backupOutput = await runScript("scripts/backup-products-registry.mjs", {
    ATLAS_CONTENT_STORE_DIR: storeDir,
    ATLAS_PRODUCTS_BACKUP_DIR: backupDir,
  });
  assert(backupOutput.includes('"mode":"file"') && backupOutput.includes('"products":25'), "backup_validation_failed");

  console.log(JSON.stringify({
    ok: true,
    seedProducts: initial.body.items.length,
    topLevelProducts: topLevel.body.items.length,
    childProductsHiddenFromPortfolio: true,
    optimisticLock: true,
    requiredVersion: true,
    parentCycleGuard: true,
    duplicateLinkGuard: true,
    linkUpdate: true,
    xssSanitization: true,
    originGuard: true,
    archiveRestore: true,
    archivedChildrenHidden: true,
    searchAndFilters: true,
    restartPersistence: true,
    markdownExport: true,
    backupValidation: true,
  }, null, 2));
} finally {
  if (server.exitCode === null) server.kill("SIGTERM");
  await rm(storeDir, { recursive: true, force: true });
}
