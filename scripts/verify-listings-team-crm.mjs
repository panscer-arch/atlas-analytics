import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { createListingsCrmRequestHandler } from "../server/listings-crm/listings-crm.mjs";

const root = await mkdtemp(path.join(tmpdir(), "atlas-listings-crm-"));
const legacyFilePath = path.join(root, "legacy.json");
const storeDir = path.join(root, "store");
const legacyProofUrl = `data:image/png;base64,${"a".repeat(410_000)}`;

await writeFile(legacyFilePath, JSON.stringify({
  records: [
    { id: "hyip-overdue", source: "Листинги", name: "HYIP Monitor Example", type: "HYIP monitor", status: "Ожидаем ответ", priority: "P0", dueDate: "2026-08-10", link: "https://example.org/listing", action: "Сделать follow-up", proofs: [{ id: "legacy-proof", url: legacyProofUrl, fileName: "proof.png", createdAt: "2026-08-10T12:00:00Z", note: "Legacy proof" }] },
    { id: "dapp-overdue", source: "Листинги", name: "DApp Example", type: "DApp catalog", status: "Не обработано", priority: "P0", dueDate: "2026-08-11", link: "https://dapp.example/listing" },
    { id: "article-overdue", source: "PR", name: "Article Example", type: "Article catalog", status: "Не обработано", priority: "P1", dueDate: "2026-08-12", link: "https://article.example/listing", owner: "Atlas Partnerships", ownerId: "atlas-partnerships" },
    { id: "mlm-overdue", source: "Листинги", name: "MLM Example", type: "MLM platform", status: "Не обработано", priority: "P1", dueDate: "2026-08-13", link: "https://mlm.example/listing" },
  ],
}), "utf8");

function createRequest(method, pathname, body, headers = {}) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  const request = Readable.from(payload ? [Buffer.from(payload)] : []);
  request.method = method;
  request.url = pathname;
  request.headers = {
    host: "localhost:8787",
    ...(payload ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(payload)) } : {}),
    ...headers,
  };
  request.socket = { remoteAddress: "127.0.0.1" };
  return request;
}

function createResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    writeHead(status, headers) { this.statusCode = status; this.headers = headers || {}; },
    end(chunk = "") { this.body += String(chunk); },
  };
}

async function call(handler, method, pathname, body, headers = {}) {
  const request = createRequest(method, pathname, body, headers);
  const response = createResponse();
  const handled = await handler(request, response, new URL(pathname, "http://localhost:8787"));
  assert.equal(handled, true, `${method} ${pathname} should be handled`);
  return { status: response.statusCode, headers: response.headers, body: JSON.parse(response.body) };
}

try {
  const deniedHandler = await createListingsCrmRequestHandler({ storeDir: path.join(root, "denied"), legacyFilePath, contactSeedFilePath: "", authorize: async () => false, connectionString: "" });
  const denied = await call(deniedHandler, "GET", "/api/listings-crm/bootstrap");
  assert.equal(denied.status, 401, "every CRM route must require the marketing session callback");

  const handler = await createListingsCrmRequestHandler({ storeDir, legacyFilePath, contactSeedFilePath: "", authorize: async () => true, connectionString: "" });
  const bootstrap = await call(handler, "GET", "/api/listings-crm/bootstrap");
  assert.equal(bootstrap.status, 200);
  assert.equal(bootstrap.body.members.length, 5, "three active and two reserve members are seeded");
  assert.equal(bootstrap.body.members.filter((member) => member.active).length, 3);
  assert.equal(bootstrap.body.records.length, 4, "legacy records are imported on an empty store");
  assert.equal(bootstrap.body.storageMode, "file");
  assert.equal(bootstrap.body.records.find((record) => record.id === "hyip-overdue").proofs[0].url.length, legacyProofUrl.length, "legacy proof data is never truncated during migration");
  const repairedLegacyOwner = bootstrap.body.records.find((record) => record.id === "article-overdue");
  assert.equal(repairedLegacyOwner.owner, "Atlas Partnerships", "the legacy owner label is preserved");
  assert.equal(repairedLegacyOwner.ownerId, null, "a legacy free-form owner id is not treated as a team member relation");
  assert.equal(repairedLegacyOwner.ownerMemberId, null);

  const legacyOwnerUpdate = await call(handler, "PATCH", "/api/listings-crm/records/article-overdue", {
    status: "Опубликовано",
    owner: repairedLegacyOwner.owner,
    ownerId: repairedLegacyOwner.ownerId,
    ownerMemberId: repairedLegacyOwner.ownerMemberId,
  }, { "if-match": `"${repairedLegacyOwner.version}"`, "x-atlas-member-id": "duty-coordinator" });
  assert.equal(legacyOwnerUpdate.status, 200, "legacy records remain editable after owner migration");
  assert.equal(legacyOwnerUpdate.body.record.status, "Опубликовано");

  const missingMemberIdentity = await call(handler, "POST", "/api/listings-crm/records", {
    name: "Anonymous write", source: "Листинги", link: "https://anonymous.example",
  });
  assert.equal(missingMemberIdentity.status, 401, "writes require an active team member identity");
  const proxiedBootstrap = await call(handler, "GET", "/api/marketing/listings-crm/bootstrap");
  assert.equal(proxiedBootstrap.status, 200, "the production marketing proxy prefix is supported");
  assert.equal(proxiedBootstrap.body.records.length, 4);

  const sameHostHttpsWrite = await call(handler, "POST", "/api/marketing/listings-crm/records", {
    name: "Production-origin write", source: "Листинги", type: "MLM platform", link: "https://production-origin.example",
  }, {
    host: "supersussystem.com",
    origin: "https://supersussystem.com",
    "x-atlas-member-id": "duty-coordinator",
  });
  assert.equal(sameHostHttpsWrite.status, 201, "same-host HTTPS writes survive a proxy that omits x-forwarded-proto");

  const duplicate = await call(handler, "POST", "/api/listings-crm/records", {
    name: "Same site again", source: "Листинги", type: "HYIP monitor", link: "https://www.example.org/another-path",
  }, { "x-atlas-member-id": "listings-operator-1" });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error, "duplicate_domain", "normalized host must prevent duplicate work");

  const otherCategory = await call(handler, "POST", "/api/listings-crm/records", {
    name: "Same platform, different product", source: "Листинги", type: "DApp listing", link: "https://example.org/dapp",
  }, { "x-atlas-member-id": "listings-operator-1" });
  assert.equal(otherCategory.status, 201, "one domain may expose different legitimate listing products");

  const contactOne = await call(handler, "POST", "/api/listings-crm/records", {
    name: "Connector One", source: "Партнёрства", type: "Business Connector", link: "https://linkedin.com/in/connector-one",
  }, { "x-atlas-member-id": "listings-operator-1" });
  const contactTwo = await call(handler, "POST", "/api/listings-crm/records", {
    name: "Connector Two", source: "Партнёрства", type: "Business Connector", link: "https://www.linkedin.com/in/connector-two/?trk=public",
  }, { "x-atlas-member-id": "listings-operator-1" });
  assert.equal(contactOne.status, 201);
  assert.equal(contactTwo.status, 201, "different profiles on one social domain are allowed");
  const duplicateContact = await call(handler, "POST", "/api/listings-crm/records", {
    name: "Connector One duplicate", source: "Партнёрства", type: "Business Connector", link: "https://www.linkedin.com/in/connector-one/?utm_source=test",
  }, { "x-atlas-member-id": "listings-operator-1" });
  assert.equal(duplicateContact.status, 409, "the same normalized social profile is blocked");

  const created = await call(handler, "POST", "/api/listings-crm/records", {
    name: "Unique directory", source: "Листинги", link: "https://unique.example/catalog", dueDate: "2026-08-15",
  }, { "x-atlas-member-id": "listings-operator-1" });
  assert.equal(created.status, 201);
  assert.equal(created.body.record.version, 1);

  const recordId = created.body.record.id;
  const rawCredential = await call(handler, "PATCH", `/api/listings-crm/records/${recordId}`, {
    platformAccess: { accountLogin: "editor@atlas-system.tech", password: "must-not-be-stored" },
  }, { "if-match": '"1"', "x-atlas-member-id": "listings-operator-1" });
  assert.equal(rawCredential.status, 400, "raw passwords are rejected instead of being stored in the CRM");
  assert.equal(rawCredential.body.error, "raw_credentials_not_allowed");

  const updated = await call(handler, "PATCH", `/api/listings-crm/records/${recordId}`, {
    status: "В работе",
    platformAccess: {
      loginUrl: "https://unique.example/login",
      workspaceUrl: "https://unique.example/dashboard",
      submissionUrl: "https://unique.example/dashboard/new-article",
      publishedUrl: "https://unique.example/articles/atlas",
      accountLogin: "editor@atlas-system.tech",
      authMethod: "Email + пароль",
      accessOwner: "Оператор листингов 1",
      twoFactorOwner: "Дежурный координатор",
      recoveryContact: "security@atlas-system.tech",
      passwordManagerItem: "Unique directory · Atlas editorial",
      passwordManagerUrl: "https://vault.example/items/unique-directory",
      lastVerifiedAt: "2026-08-15",
      notes: "Редактор статей доступен после входа",
    },
    correspondence: [
      {
        id: "submission-1", occurredAt: "2026-08-14T09:30", kind: "SUBMISSION", channel: "Form",
        sender: "Atlas System", recipient: "Editorial team", subject: "Atlas article submission",
        message: "Заявка и статья отправлены через форму.", outcome: "Получен номер заявки A-42",
        threadUrl: "https://unique.example/dashboard/submissions/A-42", attachmentUrl: "https://docs.example/atlas-article",
        followUpDate: "2026-08-18", createdBy: "Оператор листингов 1",
      },
      {
        id: "incoming-1", occurredAt: "2026-08-15T10:15", kind: "INCOMING", channel: "Email",
        sender: "Editor", recipient: "Atlas System", subject: "Re: Atlas article submission",
        message: "Редактор запросил уточнения.", outcome: "Подготовить ответ",
      },
    ],
  }, { "if-match": '"1"', "x-atlas-member-id": "listings-operator-1" });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.record.version, 2);
  assert.equal(updated.body.record.platformAccess.accountLogin, "editor@atlas-system.tech");
  assert.equal(updated.body.record.platformAccess.passwordManagerItem, "Unique directory · Atlas editorial");
  assert.equal(updated.body.record.correspondence.length, 2, "the complete dated correspondence timeline is stored");
  assert.equal(updated.body.record.correspondence[0].kind, "SUBMISSION", "the chronology is sorted oldest first");
  assert.equal(updated.body.record.firstContact, "2026-08-14", "the first application date is derived from the earliest timeline event");

  const stale = await call(handler, "PATCH", `/api/listings-crm/records/${recordId}`, {
    status: "Закрыто",
  }, { "if-match": '"1"', "x-atlas-member-id": "listings-operator-1" });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error, "version_conflict", "stale editors must not overwrite current work");

  const owned = await call(handler, "POST", "/api/listings-crm/records", {
    name: "Owned listing", source: "Листинги", type: "DApp listing", link: "https://owned.example/catalog",
    ownerId: "listings-operator-1",
  }, { "x-atlas-member-id": "listings-operator-1" });
  assert.equal(owned.status, 201);
  const foreignRecordEdit = await call(handler, "PATCH", `/api/listings-crm/records/${owned.body.record.id}`, {
    status: "В работе",
  }, { "if-match": '"1"', "x-atlas-member-id": "listings-operator-2" });
  assert.equal(foreignRecordEdit.status, 403, "an operator cannot edit a colleague's owned record");
  const foreignRecordAssign = await call(handler, "PATCH", `/api/listings-crm/records/${recordId}`, {
    ownerId: "listings-operator-2",
  }, { "if-match": '"2"', "x-atlas-member-id": "listings-operator-1" });
  assert.equal(foreignRecordAssign.status, 403, "an operator cannot assign a record to another employee");

  const operatorPlan = await call(handler, "POST", "/api/listings-crm/plan/generate", { date: "2026-08-15" }, { "x-atlas-member-id": "listings-operator-1" });
  assert.equal(operatorPlan.status, 403, "only the duty coordinator can generate the shared plan");

  const plan = await call(handler, "POST", "/api/listings-crm/plan/generate", { date: "2026-08-15" }, { "x-atlas-member-id": "duty-coordinator" });
  assert.equal(plan.status, 200);
  assert.equal(plan.body.tasks.reduce((sum, task) => sum + task.points, 0), 15, "daily plan has the agreed team workload");
  assert.ok(plan.body.tasks.some((task) => task.recordId === "hyip-overdue"), "the plan includes overdue work");
  for (const member of bootstrap.body.members.filter((item) => item.active)) {
    const load = plan.body.tasks.filter((task) => task.assigneeId === member.id).reduce((sum, task) => sum + task.points, 0);
    assert.ok(load <= member.capacityPoints, `member ${member.id} is not overloaded`);
  }
  const linkedTask = plan.body.tasks.find((task) => task.recordId && task.assigneeId);
  const linkedState = await call(handler, "GET", "/api/listings-crm/bootstrap");
  const linkedRecord = linkedState.body.records.find((record) => record.id === linkedTask.recordId);
  const otherOperatorId = ["listings-operator-1", "listings-operator-2"].find((id) => id !== linkedTask.assigneeId);
  const linkedRecordCollision = await call(handler, "PATCH", `/api/listings-crm/records/${linkedRecord.id}`, {
    status: "В работе",
  }, { "if-match": `"${linkedRecord.version}"`, "x-atlas-member-id": otherOperatorId });
  assert.equal(linkedRecordCollision.status, 403, "an active task assignment locks even an unowned legacy record to its assignee");

  const repeatedPlan = await call(handler, "POST", "/api/listings-crm/plan/generate", { date: "2026-08-15" }, { "x-atlas-member-id": "duty-coordinator" });
  assert.equal(repeatedPlan.status, 200);
  assert.equal(repeatedPlan.body.created.length, 0, "daily plan generation is idempotent");
  assert.equal(repeatedPlan.body.tasks.length, plan.body.tasks.length);

  const nextDayPlan = await call(handler, "POST", "/api/listings-crm/plan/generate", { date: "2026-08-16" }, { "x-atlas-member-id": "duty-coordinator" });
  const firstDayActive = new Set(plan.body.tasks.filter((task) => task.recordId).map((task) => `${task.recordId}:${task.kind}`));
  assert.ok(nextDayPlan.body.tasks.filter((task) => task.recordId).every((task) => !firstDayActive.has(`${task.recordId}:${task.kind}`)), "an unfinished record action is not duplicated on the next day");

  const contested = plan.body.tasks[0];
  const released = await call(handler, "POST", `/api/listings-crm/tasks/${contested.id}/release`, {}, {
    "if-match": `"${contested.version}"`, "x-atlas-member-id": contested.assigneeId,
  });
  assert.equal(released.status, 200);
  assert.equal(released.body.task.assigneeId, null, "a task can be released");
  const unclaimedBypass = await call(handler, "PATCH", `/api/listings-crm/tasks/${contested.id}`, {
    status: "IN_PROGRESS",
  }, { "if-match": `"${released.body.task.version}"`, "x-atlas-member-id": "listings-operator-1" });
  assert.equal(unclaimedBypass.status, 403, "an operator must atomically claim a free task before changing it");

  const claims = await Promise.all([
    call(handler, "POST", `/api/listings-crm/tasks/${contested.id}/claim`, { memberId: "listings-operator-1", version: released.body.task.version }, { "x-atlas-member-id": "listings-operator-1" }),
    call(handler, "POST", `/api/listings-crm/tasks/${contested.id}/claim`, { memberId: "listings-operator-2", version: released.body.task.version }, { "x-atlas-member-id": "listings-operator-2" }),
  ]);
  assert.deepEqual(claims.map((result) => result.status).sort(), [200, 409], "only one concurrent claimant wins");

  const winner = claims.find((result) => result.status === 200).body.task;
  const foreignTaskEdit = await call(handler, "PATCH", `/api/listings-crm/tasks/${winner.id}`, {
    status: "IN_PROGRESS",
  }, { "if-match": `"${winner.version}"`, "x-atlas-member-id": winner.assigneeId === "listings-operator-1" ? "listings-operator-2" : "listings-operator-1" });
  assert.equal(foreignTaskEdit.status, 403, "an operator cannot update another employee's task");
  const handedOff = await call(handler, "PATCH", `/api/listings-crm/tasks/${winner.id}`, {
    assigneeId: "duty-coordinator", status: "IN_PROGRESS", notes: "Передано координатору",
  }, { "if-match": `"${winner.version}"`, "x-atlas-member-id": winner.assigneeId });
  assert.equal(handedOff.status, 200);
  assert.equal(handedOff.body.task.assigneeId, "duty-coordinator", "task handoff is explicit and versioned");

  const archived = await call(handler, "POST", `/api/listings-crm/records/${recordId}/archive`, {}, {
    "if-match": '"2"', "x-atlas-member-id": "duty-coordinator",
  });
  assert.equal(archived.status, 200);
  assert.equal(archived.body.record.status, "Архив");

  const audit = await call(handler, "GET", "/api/listings-crm/audit?limit=500");
  assert.equal(audit.status, 200);
  const actions = new Set(audit.body.events.map((event) => event.action));
  for (const required of ["LEGACY_IMPORT", "RECORD_CREATE", "RECORD_UPDATE", "RECORD_ARCHIVE", "PLAN_GENERATE", "TASK_CLAIM", "TASK_RELEASE", "TASK_UPDATE"]) {
    assert.ok(actions.has(required), `audit contains ${required}`);
  }
  const serializedAudit = JSON.stringify(audit.body.events);
  assert.doesNotMatch(serializedAudit, /editor@atlas-system\.tech/, "access identifiers are not duplicated into the audit log");
  assert.doesNotMatch(serializedAudit, /Редактор запросил уточнения/, "message bodies are not duplicated into the audit log");

  const persisted = JSON.parse(await readFile(path.join(storeDir, "listings-team-crm-v1.json"), "utf8"));
  assert.equal(persisted.records.find((record) => record.id === recordId).status, "Архив");

  const bundledLegacyPath = path.resolve("src/modules/analytics/data/listingsCrmInitialData.json");
  const bundledLegacy = JSON.parse(await readFile(bundledLegacyPath, "utf8"));
  const bundledHandler = await createListingsCrmRequestHandler({
    storeDir: path.join(root, "bundled-store"), legacyFilePath: bundledLegacyPath,
    contactSeedFilePath: "", authorize: async () => true, connectionString: "",
  });
  const bundledBootstrap = await call(bundledHandler, "GET", "/api/marketing/listings-crm/bootstrap");
  assert.equal(bundledBootstrap.status, 200);
  assert.equal(bundledBootstrap.body.records.length, bundledLegacy.records.length, "the complete bundled legacy CRM imports without dropping records");
  const contactSeedPath = path.resolve("server/listings-crm/listings-contact-seeds.json");
  const contactSeeds = JSON.parse(await readFile(contactSeedPath, "utf8"));
  const contactSeedHandler = await createListingsCrmRequestHandler({
    storeDir: path.join(root, "contact-seed-store"), legacyFilePath,
    contactSeedFilePath: contactSeedPath, authorize: async () => true, connectionString: "",
  });
  const contactSeedBootstrap = await call(contactSeedHandler, "GET", "/api/marketing/listings-crm/bootstrap");
  assert.equal(contactSeedBootstrap.body.records.length, 4 + contactSeeds.records.length, "the curated contact registry is merged into an existing listings base");
  assert.ok(contactSeedBootstrap.body.records.some((record) => record.id === "contact-br-caio-carneiro"), "the Brazil contact seed is available in Listings CRM");
  const repeatedContactSeedBootstrap = await call(contactSeedHandler, "GET", "/api/marketing/listings-crm/bootstrap");
  assert.equal(repeatedContactSeedBootstrap.body.records.length, contactSeedBootstrap.body.records.length, "contact seed import is idempotent");
  const sql = await readFile(path.resolve("server/listings-crm/001_listings_crm.sql"), "utf8");
  assert.match(sql, /dedupe_key/, "PostgreSQL uniqueness follows the same record-level dedupe key as the API");
  assert.doesNotMatch(sql, /ON atlas_crm_records \(canonical_domain\)/, "PostgreSQL never collapses distinct social profiles to one hostname");
  console.log("Listings Team CRM verification passed.");
} finally {
  await rm(root, { recursive: true, force: true });
}
