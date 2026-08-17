import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  buildStagingDatabaseDrillPlan,
  runStagingDatabaseRestoreDrill,
  sanitizeStagingDatabaseDrillPlan,
} from "../server/admin-finance/staging-database-drill.mjs";

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
assert.equal(plan.commands.length, 6);
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
const fixtureOutputs = {
  source_table_list: baselineTableList,
  inspect_archive: "; archive contents\n",
  restore_target_table_list: "",
  restored_table_list: baselineTableList,
};

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
assert.equal(incompleteSourceCalls, 1, "Backup must not run when the source schema is incomplete");

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
assert.equal(wrongSourceCalls, 1, "Backup must not run when source table names differ from the baseline");

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
  assert.equal(invalidProbeCalls, 1, "An invalid schema probe must stop before backup");
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
assert.equal(executed.sourceApplyAllowed, false);
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
assert.equal(stoppedAfter, 4, "Restore command must not run against a non-empty target");

console.log("Admin Finance staging database restore drill: OK");
