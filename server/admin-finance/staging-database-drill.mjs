import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const EMBEDDED_TLS_OPTIONS = ["sslmode", "sslcert", "sslkey", "sslrootcert"];
const SAFE_RESTORE_DATABASE = /(restore|drill|scratch)/i;
const USER_TABLE_LIST_SQL = `
SELECT n.nspname || '.' || c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
ORDER BY 1
`.trim();

export class StagingDatabaseDrillError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "StagingDatabaseDrillError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new StagingDatabaseDrillError(code, message);
}

function requiredText(value, code, message) {
  const normalized = String(value || "").trim();
  if (!normalized || /[\r\n\0]/.test(normalized)) fail(code, message);
  return normalized;
}

export function parsePostgresTarget(value, role) {
  let url;
  try {
    url = new URL(requiredText(value, "database_url_required", `${role} database URL is required.`));
  } catch (error) {
    if (error instanceof StagingDatabaseDrillError) throw error;
    fail("invalid_database_url", `${role} database URL is invalid.`);
  }
  if (!POSTGRES_PROTOCOLS.has(url.protocol)) fail("invalid_database_url", `${role} database URL must use PostgreSQL.`);
  if (!url.hostname || !url.pathname || url.pathname === "/") fail("invalid_database_url", `${role} database host and name are required.`);
  if (url.hash) fail("invalid_database_url", `${role} database URL must not contain a fragment.`);
  for (const key of EMBEDDED_TLS_OPTIONS) {
    if (url.searchParams.has(key)) fail("unsafe_database_url", "TLS options must be supplied by the drill runner, not embedded in a database URL.");
  }
  if ([...url.searchParams.keys()].length) fail("unsafe_database_url", `${role} database URL must not contain query parameters.`);

  let database;
  try {
    database = decodeURIComponent(url.pathname.slice(1));
  } catch {
    fail("invalid_database_url", `${role} database name is invalid.`);
  }
  if (!database || database.includes("/")) fail("invalid_database_url", `${role} database name is invalid.`);

  let user;
  let password;
  try {
    user = decodeURIComponent(url.username || "");
    password = decodeURIComponent(url.password || "");
  } catch {
    fail("invalid_database_url", `${role} database credentials are invalid.`);
  }
  if (!user || !password) fail("database_credentials_required", `${role} database URL must contain dedicated credentials.`);

  return Object.freeze({
    role,
    host: url.hostname,
    port: url.port || "5432",
    database,
    user,
    password,
    fingerprint: `${url.hostname.toLowerCase()}:${url.port || "5432"}/${database}`,
  });
}

export async function verifyMigrationBaseline({ manifestPath, rootDirectory }) {
  const absoluteManifest = resolve(rootDirectory, manifestPath);
  const manifest = JSON.parse(await readFile(absoluteManifest, "utf8"));
  const ddlPath = resolve(rootDirectory, manifest.source);
  const ddl = await readFile(ddlPath);
  const ddlText = ddl.toString("utf8");
  const checksum = createHash("sha256").update(ddl).digest("hex");
  const tableNames = [...ddlText.matchAll(/^CREATE TABLE\s+([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)\s*\(/gm)]
    .map((match) => match[1])
    .sort();
  const tableCount = tableNames.length;
  if (new Set(tableNames).size !== tableCount) fail("manifest_drift", "Migration baseline contains duplicate table names.");

  if (manifest.status !== "prepared_not_applied") fail("unsafe_manifest_status", "Migration manifest must remain prepared_not_applied before the drill.");
  if (manifest.artifactKind !== "baseline" || manifest.sourceApplyAllowed !== false) {
    fail("unsafe_migration_artifact", "Only a baseline explicitly blocked from source apply is accepted.");
  }
  if (manifest.sha256 !== checksum || manifest.bytes !== ddl.byteLength || manifest.expectedTableCount !== tableCount) {
    fail("manifest_drift", "Migration baseline does not match its manifest.");
  }
  return Object.freeze({ manifest, ddlPath, checksum, tableCount, tableNames: Object.freeze(tableNames) });
}

function postgresEnvironment(target, caFile, baseEnvironment) {
  return {
    ...baseEnvironment,
    PGHOST: target.host,
    PGPORT: target.port,
    PGDATABASE: target.database,
    PGUSER: target.user,
    PGPASSWORD: target.password,
    PGSSLMODE: "verify-full",
    PGSSLROOTCERT: caFile,
    PGCONNECT_TIMEOUT: "10",
    PGAPPNAME: "atlas-admin-finance-restore-drill",
  };
}

function command(id, executable, args, target, capture = false) {
  return Object.freeze({ id, executable, args: Object.freeze(args), target, capture });
}

export async function buildStagingDatabaseDrillPlan(options = {}) {
  const source = parsePostgresTarget(options.sourceDatabaseUrl, "Source");
  const restore = parsePostgresTarget(options.restoreDatabaseUrl, "Restore");
  if (source.fingerprint === restore.fingerprint) fail("restore_target_matches_source", "Restore database must be different from the source database.");
  if (!SAFE_RESTORE_DATABASE.test(restore.database)) {
    fail("unsafe_restore_database_name", "Restore database name must contain restore, drill, or scratch.");
  }

  const caFile = requiredText(options.caFile, "database_ca_required", "PostgreSQL CA file is required.");
  if (!isAbsolute(caFile)) fail("database_ca_required", "PostgreSQL CA file must use an absolute path.");
  const backupPath = requiredText(options.backupPath, "backup_path_required", "Backup path is required.");
  if (!isAbsolute(backupPath) || !backupPath.endsWith(".dump")) fail("invalid_backup_path", "Backup path must be an absolute .dump file path.");

  const toolPaths = Object.freeze({
    psql: requiredText(options.toolPaths?.psql, "postgres_tool_missing", "psql executable is required."),
    pgDump: requiredText(options.toolPaths?.pgDump, "postgres_tool_missing", "pg_dump executable is required."),
    pgRestore: requiredText(options.toolPaths?.pgRestore, "postgres_tool_missing", "pg_restore executable is required."),
  });
  const baseline = await verifyMigrationBaseline({
    manifestPath: options.manifestPath || "deploy/admin-finance-staging/migrations/manifest.v1.json",
    rootDirectory: options.rootDirectory,
  });

  if (options.verifyFilesystem !== false) {
    await Promise.all([access(caFile), access(dirname(backupPath)), ...Object.values(toolPaths).map((path) => access(path))]);
    try {
      await stat(backupPath);
      fail("backup_path_exists", "Backup path already exists; a restore drill must not overwrite an earlier backup.");
    } catch (error) {
      if (error instanceof StagingDatabaseDrillError) throw error;
      if (error?.code !== "ENOENT") throw error;
    }
  }

  return Object.freeze({
    source,
    restore,
    caFile,
    backupPath,
    toolPaths,
    baseline,
    sourceApplyAllowed: false,
    commands: Object.freeze([
      command("source_table_list", toolPaths.psql, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", USER_TABLE_LIST_SQL], "source", true),
      command("backup", toolPaths.pgDump, ["--format=custom", "--no-owner", "--no-privileges", "--file", backupPath], "source"),
      command("inspect_archive", toolPaths.pgRestore, ["--list", backupPath], null, true),
      command("restore_target_table_list", toolPaths.psql, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", USER_TABLE_LIST_SQL], "restore", true),
      command("restore", toolPaths.pgRestore, ["--exit-on-error", "--no-owner", "--no-privileges", "--dbname", restore.database, backupPath], "restore"),
      command("restored_table_list", toolPaths.psql, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", USER_TABLE_LIST_SQL], "restore", true),
    ]),
  });
}

function defaultRunProcess({ executable, args, env, capture }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, {
      env,
      shell: false,
      stdio: capture ? ["ignore", "pipe", "pipe"] : ["ignore", "ignore", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => { stdout += chunk; });
    child.stderr?.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolvePromise({ code, stdout, stderr }));
  });
}

function parseTableList(result, id) {
  const tableNames = String(result.stdout || "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .sort();
  if (tableNames.some((value) => !/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(value))) {
    fail("invalid_drill_probe", `${id} returned an invalid table name.`);
  }
  if (new Set(tableNames).size !== tableNames.length) {
    fail("invalid_drill_probe", `${id} returned duplicate table names.`);
  }
  return Object.freeze(tableNames);
}

function sameTableList(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

export function sanitizeStagingDatabaseDrillPlan(plan) {
  return Object.freeze({
    mode: "restore_drill_only",
    sourceDatabase: plan.source.database,
    restoreDatabase: plan.restore.database,
    backupPath: plan.backupPath,
    baseline: {
      schemaVersion: plan.baseline.manifest.schemaVersion,
      artifactKind: plan.baseline.manifest.artifactKind,
      checksum: plan.baseline.checksum,
      expectedTableCount: plan.baseline.tableCount,
      sourceApplyAllowed: false,
    },
    steps: plan.commands.map(({ id }) => id),
  });
}

export async function runStagingDatabaseRestoreDrill(plan, options = {}) {
  if (options.execute !== true) return { executed: false, plan: sanitizeStagingDatabaseDrillPlan(plan) };
  const runProcess = options.runProcess || defaultRunProcess;
  const baseEnvironment = options.baseEnvironment || process.env;
  const tableLists = {};

  for (const item of plan.commands) {
    const target = item.target === "source" ? plan.source : item.target === "restore" ? plan.restore : null;
    const env = target ? postgresEnvironment(target, plan.caFile, baseEnvironment) : baseEnvironment;
    const result = await runProcess({ executable: item.executable, args: [...item.args], env, capture: item.capture, id: item.id });
    if (result?.code !== 0) fail("drill_command_failed", `Restore drill step ${item.id} failed.`);
    if (item.id === "inspect_archive" && !String(result.stdout || "").trim()) fail("invalid_backup_archive", "Backup archive list is empty.");
    if (item.id.endsWith("table_list")) tableLists[item.id] = parseTableList(result, item.id);
    if (item.id === "source_table_list" && !sameTableList(tableLists[item.id], plan.baseline.tableNames)) {
      fail("source_schema_incomplete", "Source user-table list does not match the migration baseline.");
    }
    if (item.id === "restore_target_table_list" && tableLists[item.id].length !== 0) {
      fail("restore_target_not_empty", "Restore database contains user tables; restore was not attempted.");
    }
  }

  if (!sameTableList(tableLists.source_table_list, tableLists.restored_table_list)) {
    fail("restore_table_list_mismatch", "Restored user-table list does not match the source database.");
  }
  const backup = await stat(plan.backupPath);
  if (!backup.isFile() || backup.size < 1) fail("backup_file_invalid", "Backup file is missing or empty after the drill.");

  return Object.freeze({
    executed: true,
    sourceTableCount: tableLists.source_table_list.length,
    restoredTableCount: tableLists.restored_table_list.length,
    backupBytes: backup.size,
    sourceApplyAllowed: false,
  });
}
