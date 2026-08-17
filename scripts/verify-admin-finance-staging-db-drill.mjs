import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  buildStagingDatabaseDrillPlan,
  runBoundedProcess,
  runStagingDatabaseRestoreDrill,
  sanitizeStagingDatabaseDrillPlan,
} from "../server/admin-finance/staging-database-drill.mjs";

const overflowProbe = await runBoundedProcess({
  executable: process.execPath,
  args: ["-e", "process.stdout.write('x'.repeat(4096))"],
  env: process.env,
  capture: true,
}, { timeoutMs: 2000, maxCapturedBytes: 128, killGraceMs: 20 });
assert.equal(overflowProbe.overflowed, true);
assert(overflowProbe.stdout.length <= 128);

const timeoutStartedAt = Date.now();
const timeoutProbe = await runBoundedProcess({
  executable: process.execPath,
  args: ["-e", "setTimeout(() => {}, 10000)"],
  env: process.env,
  capture: true,
}, { timeoutMs: 80, maxCapturedBytes: 128, killGraceMs: 20 });
assert.equal(timeoutProbe.timedOut, true);
assert(Date.now() - timeoutStartedAt < 2000, "A timed-out child must be terminated promptly");

const root = resolve(import.meta.dirname, "..");
const temporary = await mkdtemp(join(tmpdir(), "atlas-finance-drill-"));
const caFile = join(temporary, "postgres-ca.pem");
const backupPath = join(temporary, "admin-finance.dump");
await writeFile(caFile, "fixture-ca");

const baseOptions = {
  rootDirectory: root,
  sourceDatabaseUrl: "postgresql://source_user:source_secret@db.internal:5432/atlas_finance",
  restoreDatabaseUrl: "postgresql://restore_user:restore_secret@db.internal:5432/atlas_finance_restore_drill",
  caFile,
  backupPath,
  toolPaths: { psql: "/fixture/psql", pgDump: "/fixture/pg_dump", pgRestore: "/fixture/pg_restore" },
  verifyFilesystem: false,
};

const plan = await buildStagingDatabaseDrillPlan(baseOptions);
const sanitized = sanitizeStagingDatabaseDrillPlan(plan);
const baselineTableList = `${plan.baseline.tableNames.join("\n")}\n`;
assert.equal(sanitized.mode, "restore_drill_only");
assert.equal(sanitized.baseline.artifactKind, "baseline");
assert.equal(sanitized.baseline.sourceApplyAllowed, false);
assert.equal(plan.commands.length, 16);
assert(plan.commands.find(({ id }) => id === "source_role_guard").args.some((value) => value.includes("pg_has_role")));
assert(plan.commands.find(({ id }) => id === "source_write_privileges").args.some((value) => value.includes("transaction_read_only")));
assert(plan.commands.find(({ id }) => id === "source_write_privileges").args.some((value) => value.includes("has_sequence_privilege")));
assert(plan.commands.some(({ id }) => id === "source_acl_guard"));
assert(plan.commands.some(({ id }) => id === "restore_acl_hardening"));
assert(plan.commands.some(({ id }) => id === "restored_acl_guard"));
assert(!JSON.stringify(sanitized).includes("source_secret"));
assert(!JSON.stringify(sanitized).includes("restore_secret"));
assert(!JSON.stringify(plan.commands).includes("source_secret"));

assert.rejects(
  () => buildStagingDatabaseDrillPlan({ ...baseOptions, restoreDatabaseUrl: baseOptions.sourceDatabaseUrl }),
  /Restore database must be different/,
);
assert.rejects(
  () => buildStagingDatabaseDrillPlan({ ...baseOptions, restoreDatabaseUrl: "postgresql://user:pass@db.internal/production" }),
  /must contain restore, drill, or scratch/,
);
assert.rejects(
  () => buildStagingDatabaseDrillPlan({ ...baseOptions, sourceDatabaseUrl: `${baseOptions.sourceDatabaseUrl}?sslmode=disable` }),
  /TLS options must be supplied/,
);

let dryRunCalls = 0;
const dryRun = await runStagingDatabaseRestoreDrill(plan, {
  execute: false,
  runProcess: async () => { dryRunCalls += 1; },
});
assert.equal(dryRun.executed, false);
assert.equal(dryRunCalls, 0);

const calls = [];
const fixtureSchemaDefinition = "CREATE SCHEMA admin_finance;\nCREATE FUNCTION admin_finance.reject_mutation();\n";
const fixtureOutputs = {
  source_role_guard: "restricted\n",
  source_write_privileges: "read_only\n",
  source_acl_guard: "restricted\n",
  source_system_identifier: "1111111111111111111\n",
  source_table_list: baselineTableList,
  source_schema_definition: fixtureSchemaDefinition,
  inspect_archive: "; archive contents\n",
  restore_target_table_list: "",
  restore_role_guard: "restricted\n",
  restore_system_identifier: "2222222222222222222\n",
  restored_table_list: baselineTableList,
  restored_schema_definition: fixtureSchemaDefinition,
  restored_acl_guard: "restricted\n",
};

let privilegedSourceCalls = 0;
await assert.rejects(
  () => runStagingDatabaseRestoreDrill(plan, {
    execute: true,
    runProcess: async (call) => {
      privilegedSourceCalls += 1;
      if (call.id === "source_role_guard") return { code: 0, stdout: "privileged\n", stderr: "" };
      return { code: 0, stdout: fixtureOutputs[call.id] || "", stderr: "" };
    },
  }),
  /Source database role is privileged/,
);
assert.equal(privilegedSourceCalls, 1, "A privileged source role must stop the drill immediately");

let exposedSourceAclCalls = 0;
await assert.rejects(
  () => runStagingDatabaseRestoreDrill(plan, {
    execute: true,
    runProcess: async (call) => {
      exposedSourceAclCalls += 1;
      if (call.id === "source_acl_guard") return { code: 0, stdout: "public_access\n", stderr: "" };
      return { code: 0, stdout: fixtureOutputs[call.id] || "", stderr: "" };
    },
  }),
  /Source database exposes admin_finance objects to PUBLIC/,
);
assert.equal(exposedSourceAclCalls, plan.commands.findIndex(({ id }) => id === "source_acl_guard") + 1);

let writableSourceCalls = 0;
await assert.rejects(
  () => runStagingDatabaseRestoreDrill(plan, {
    execute: true,
    runProcess: async (call) => {
      writableSourceCalls += 1;
      if (call.id === "source_write_privileges") return { code: 0, stdout: "write_capable\n", stderr: "" };
      return { code: 0, stdout: fixtureOutputs[call.id] || "", stderr: "" };
    },
  }),
  /Source database role has write privileges/,
);
assert.equal(writableSourceCalls, 2, "A write-capable source role must stop before schema or backup probes");

let incompleteSourceCalls = 0;
await assert.rejects(
  () => runStagingDatabaseRestoreDrill(plan, {
    execute: true,
    runProcess: async (call) => {
      incompleteSourceCalls += 1;
      if (call.id === "source_table_list") {
        return { code: 0, stdout: `${plan.baseline.tableNames.slice(0, 19).join("\n")}\n`, stderr: "" };
      }
      return { code: 0, stdout: fixtureOutputs[call.id] || "", stderr: "" };
    },
  }),
  /does not match the migration baseline/,
);
assert.equal(
  incompleteSourceCalls,
  plan.commands.findIndex(({ id }) => id === "source_table_list") + 1,
  "Backup must not run when the source schema is incomplete",
);

let wrongSourceCalls = 0;
await assert.rejects(
  () => runStagingDatabaseRestoreDrill(plan, {
    execute: true,
    runProcess: async (call) => {
      wrongSourceCalls += 1;
      if (call.id === "source_table_list") {
        const sameCountWrongSchema = [...plan.baseline.tableNames];
        sameCountWrongSchema[sameCountWrongSchema.length - 1] = "admin_finance.unexpected_table";
        return { code: 0, stdout: `${sameCountWrongSchema.join("\n")}\n`, stderr: "" };
      }
      return { code: 0, stdout: fixtureOutputs[call.id] || "", stderr: "" };
    },
  }),
  /does not match the migration baseline/,
);
assert.equal(
  wrongSourceCalls,
  plan.commands.findIndex(({ id }) => id === "source_table_list") + 1,
  "Backup must not run when source table names differ from the baseline",
);

for (const invalidSourceList of [
  "admin_finance.valid_table\ninvalid table name\n",
  "admin_finance.duplicate_table\nadmin_finance.duplicate_table\n",
  "Admin_Finance.tokens\n",
]) {
  let invalidProbeCalls = 0;
  await assert.rejects(
    () => runStagingDatabaseRestoreDrill(plan, {
      execute: true,
      runProcess: async (call) => {
        invalidProbeCalls += 1;
        if (call.id === "source_table_list") return { code: 0, stdout: invalidSourceList, stderr: "" };
        return { code: 0, stdout: fixtureOutputs[call.id] || "", stderr: "" };
      },
    }),
    /returned (an invalid table name|duplicate table names)/,
  );
  assert.equal(
    invalidProbeCalls,
    plan.commands.findIndex(({ id }) => id === "source_table_list") + 1,
    "An invalid schema probe must stop before backup",
  );
}

const executed = await runStagingDatabaseRestoreDrill(plan, {
  execute: true,
  baseEnvironment: { PATH: "/fixture" },
  runProcess: async (call) => {
    calls.push(call);
    if (call.id === "backup") await writeFile(backupPath, "fixture-backup");
    return { code: 0, stdout: fixtureOutputs[call.id] || "", stderr: "" };
  },
});
assert.equal(executed.executed, true);
assert.equal(executed.sourceTableCount, 47);
assert.equal(executed.restoredTableCount, 47);
assert.match(executed.schemaFingerprint, /^[a-f0-9]{64}$/);
assert.equal(executed.sourceApplyAllowed, false);
assert.equal(executed.clustersDistinct, true);
assert.deepEqual(calls.map(({ id }) => id), plan.commands.map(({ id }) => id));
assert(calls.filter(({ id }) => id !== "inspect_archive").every(({ env }) => env.PGSSLMODE === "verify-full"));
assert(calls.filter(({ id }) => id !== "inspect_archive").every(({ env }) => env.PGSSLROOTCERT === caFile));
assert(calls.some(({ env }) => env.PGPASSWORD === "source_secret"));
assert(calls.some(({ env }) => env.PGPASSWORD === "restore_secret"));
assert(calls.every(({ args }) => !JSON.stringify(args).includes("secret")));

let wrongRestoreCalls = 0;
await assert.rejects(
  () => runStagingDatabaseRestoreDrill(plan, {
    execute: true,
    runProcess: async (call) => {
      wrongRestoreCalls += 1;
      if (call.id === "restored_table_list") {
        const sameCountWrongSchema = [...plan.baseline.tableNames];
        sameCountWrongSchema[0] = "admin_finance.unexpected_restored_table";
        return { code: 0, stdout: `${sameCountWrongSchema.join("\n")}\n`, stderr: "" };
      }
      return { code: 0, stdout: fixtureOutputs[call.id] || "", stderr: "" };
    },
  }),
  /does not match the source database/,
);
assert.equal(wrongRestoreCalls, plan.commands.length, "The complete restored schema must be verified");

let wrongSchemaDefinitionCalls = 0;
await assert.rejects(
  () => runStagingDatabaseRestoreDrill(plan, {
    execute: true,
    runProcess: async (call) => {
      wrongSchemaDefinitionCalls += 1;
      if (call.id === "restored_schema_definition") {
        return { code: 0, stdout: `${fixtureSchemaDefinition}DROP FUNCTION admin_finance.reject_mutation();\n`, stderr: "" };
      }
      return { code: 0, stdout: fixtureOutputs[call.id] || "", stderr: "" };
    },
  }),
  /schema fingerprint does not match/,
);
assert.equal(wrongSchemaDefinitionCalls, plan.commands.length, "The restored catalog definition must be verified");

let exposedRestoreAclCalls = 0;
await assert.rejects(
  () => runStagingDatabaseRestoreDrill(plan, {
    execute: true,
    runProcess: async (call) => {
      exposedRestoreAclCalls += 1;
      if (call.id === "restored_acl_guard") return { code: 0, stdout: "public_access\n", stderr: "" };
      return { code: 0, stdout: fixtureOutputs[call.id] || "", stderr: "" };
    },
  }),
  /Restored database exposes admin_finance objects to PUBLIC/,
);
assert.equal(exposedRestoreAclCalls, plan.commands.length);

let sameClusterCalls = 0;
await assert.rejects(
  () => runStagingDatabaseRestoreDrill(plan, {
    execute: true,
    runProcess: async (call) => {
      sameClusterCalls += 1;
      if (call.id === "restore_system_identifier") {
        return { code: 0, stdout: fixtureOutputs.source_system_identifier, stderr: "" };
      }
      return { code: 0, stdout: fixtureOutputs[call.id] || "", stderr: "" };
    },
  }),
  /must use different PostgreSQL clusters/,
);
assert.equal(
  sameClusterCalls,
  plan.commands.findIndex(({ id }) => id === "restore_system_identifier") + 1,
  "A same-cluster restore target must stop before pg_restore",
);

await rm(backupPath);
let stoppedAfter = 0;
await assert.rejects(
  () => runStagingDatabaseRestoreDrill(plan, {
    execute: true,
    runProcess: async (call) => {
      stoppedAfter += 1;
      if (call.id === "restore_target_table_list") {
        return { code: 0, stdout: "admin_finance.existing_one\nadmin_finance.existing_two\n", stderr: "" };
      }
      return { code: 0, stdout: fixtureOutputs[call.id] || "", stderr: "" };
    },
  }),
  /contains user tables/,
);
assert.equal(
  stoppedAfter,
  plan.commands.findIndex(({ id }) => id === "restore_target_table_list") + 1,
  "Restore command must not run against a non-empty target",
);

console.log("Admin Finance staging database restore drill: OK");
