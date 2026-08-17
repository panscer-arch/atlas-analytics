import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(resolve(root, "deploy/admin-finance-staging/migrations/manifest.v1.json"), "utf8"));
const ddl = await readFile(resolve(root, manifest.source));
const source = ddl.toString("utf8");
const tableCount = [...source.matchAll(/^CREATE TABLE admin_finance\./gm)].length;

assert.equal(manifest.status, "prepared_not_applied");
assert.equal(manifest.artifactKind, "baseline");
assert.equal(manifest.sourceApplyAllowed, false);
assert.equal(manifest.sha256, createHash("sha256").update(ddl).digest("hex"), "Migration manifest checksum drifted");
assert.equal(manifest.bytes, ddl.byteLength, "Migration manifest byte count drifted");
assert.equal(manifest.expectedTableCount, tableCount, "Migration manifest table count drifted");
assert(source.includes("lease_due_notifications"));
assert(source.includes("complete_notification_attempt"));
assert.equal(manifest.notificationRuntime.enabledAfterMigration, false);
assert(manifest.requires.includes("pre-migration custom-format backup"));
assert(manifest.requires.includes("tested restore target"));
assert.equal(manifest.restoreDrill.requiresEmptyTarget, true);
assert.equal(manifest.restoreDrill.requiresDistinctTarget, true);
assert.equal(manifest.restoreDrill.requiresVerifiedTls, true);
assert.equal(manifest.restoreDrill.sourceMutationAllowed, false);

console.log(`Admin Finance migration manifest: OK (${tableCount} tables, ${manifest.sha256.slice(0, 12)}...)`);
