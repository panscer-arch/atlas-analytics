import { access } from "node:fs/promises";
import { delimiter, join, resolve } from "node:path";
import {
  buildStagingDatabaseDrillPlan,
  runStagingDatabaseRestoreDrill,
} from "../server/admin-finance/staging-database-drill.mjs";

const root = resolve(import.meta.dirname, "..");
const execute = process.argv.includes("--execute-restore-drill");

async function findExecutable(name) {
  for (const directory of String(process.env.PATH || "").split(delimiter).filter(Boolean)) {
    const candidate = join(directory, name);
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }
  throw new Error(`${name} is not installed or is not available on PATH.`);
}

try {
  const [psql, pgDump, pgRestore] = await Promise.all([
    findExecutable("psql"),
    findExecutable("pg_dump"),
    findExecutable("pg_restore"),
  ]);
  const plan = await buildStagingDatabaseDrillPlan({
    rootDirectory: root,
    sourceDatabaseUrl: process.env.ATLAS_ADMIN_FINANCE_DATABASE_URL,
    restoreDatabaseUrl: process.env.ATLAS_ADMIN_FINANCE_RESTORE_DATABASE_URL,
    caFile: process.env.ATLAS_ADMIN_FINANCE_DATABASE_CA_FILE,
    backupPath: process.env.ATLAS_ADMIN_FINANCE_BACKUP_PATH,
    toolPaths: { psql, pgDump, pgRestore },
  });
  const result = await runStagingDatabaseRestoreDrill(plan, { execute });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!execute) process.stdout.write("Dry preflight only. Use --execute-restore-drill for the isolated restore drill. Source migration is always blocked.\n");
} catch (error) {
  process.stderr.write(`Admin Finance database drill blocked: ${error.message}\n`);
  process.exitCode = 1;
}
