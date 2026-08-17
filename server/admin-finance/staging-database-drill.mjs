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
const ROLE_GUARD_SQL = `
SELECT CASE
  WHEN rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls
    OR EXISTS (
      SELECT 1
      FROM pg_roles reachable_role
      WHERE reachable_role.rolname <> current_user
        AND pg_has_role(current_user, reachable_role.oid, 'MEMBER')
    )
  THEN 'privileged'
  ELSE 'restricted'
END
FROM pg_roles
WHERE rolname = current_user
`.trim();
const SOURCE_WRITE_PRIVILEGES_SQL = `
SELECT CASE
  WHEN current_setting('transaction_read_only') <> 'on'
    OR has_database_privilege(current_user, current_database(), 'CREATE')
    OR has_database_privilege(current_user, current_database(), 'TEMPORARY')
    OR has_schema_privilege(current_user, 'admin_finance', 'CREATE')
    OR has_schema_privilege(current_user, 'public', 'CREATE')
    OR EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p')
        AND n.nspname = 'admin_finance'
        AND (
          has_table_privilege(current_user, c.oid, 'INSERT')
          OR has_table_privilege(current_user, c.oid, 'UPDATE')
          OR has_table_privilege(current_user, c.oid, 'DELETE')
          OR has_table_privilege(current_user, c.oid, 'TRUNCATE')
        )
    )
    OR EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'S'
        AND n.nspname = 'admin_finance'
        AND (
          has_sequence_privilege(current_user, c.oid, 'USAGE')
          OR has_sequence_privilege(current_user, c.oid, 'UPDATE')
        )
    )
  THEN 'write_capable'
  ELSE 'read_only'
END
`.trim();
const PUBLIC_ACL_GUARD_SQL = `
WITH public_access AS (
  SELECT 1
  FROM pg_namespace n
  CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl, acldefault('n', n.nspowner))) acl
  WHERE n.nspname = 'admin_finance' AND acl.grantee = 0
  UNION ALL
  SELECT 1
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(
    c.relacl,
    acldefault(CASE WHEN c.relkind = 'S' THEN 'S'::"char" ELSE 'r'::"char" END, c.relowner)
  )) acl
  WHERE n.nspname = 'admin_finance'
    AND c.relkind IN ('r', 'p', 'S')
    AND acl.grantee = 0
  UNION ALL
  SELECT 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
  WHERE n.nspname = 'admin_finance' AND acl.grantee = 0
)
SELECT CASE WHEN EXISTS (SELECT 1 FROM public_access) THEN 'public_access' ELSE 'restricted' END
`.trim();
const RESTORE_ACL_HARDENING_SQL = `
REVOKE ALL ON SCHEMA admin_finance FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA admin_finance FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA admin_finance FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA admin_finance FROM PUBLIC;
`.trim();
const SYSTEM_IDENTIFIER_SQL = "SELECT system_identifier::text FROM pg_control_system()";

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
      command("source_role_guard", toolPaths.psql, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", ROLE_GUARD_SQL], "source", true),
      command("source_write_privileges", toolPaths.psql, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", SOURCE_WRITE_PRIVILEGES_SQL], "source", true),
      command("source_acl_guard", toolPaths.psql, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", PUBLIC_ACL_GUARD_SQL], "source", true),
      command("source_system_identifier", toolPaths.psql, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", SYSTEM_IDENTIFIER_SQL], "source", true),
      command("source_table_list", toolPaths.psql, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", USER_TABLE_LIST_SQL], "source", true),
      command("source_schema_definition", toolPaths.pgDump, ["--schema-only", "--no-owner", "--no-privileges", "--format=plain"], "source", true),
      command("backup", toolPaths.pgDump, ["--format=custom", "--no-owner", "--no-privileges", "--file", backupPath], "source"),
      command("inspect_archive", toolPaths.pgRestore, ["--list", backupPath], null, true),
      command("restore_target_table_list", toolPaths.psql, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", USER_TABLE_LIST_SQL], "restore", true),
      command("restore_role_guard", toolPaths.psql, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", ROLE_GUARD_SQL], "restore", true),
      command("restore_system_identifier", toolPaths.psql, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", SYSTEM_IDENTIFIER_SQL], "restore", true),
      command("restore", toolPaths.pgRestore, ["--exit-on-error", "--no-owner", "--no-privileges", "--dbname", restore.database, backupPath], "restore"),
      command("restore_acl_hardening", toolPaths.psql, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--command", RESTORE_ACL_HARDENING_SQL], "restore"),
      command("restored_table_list", toolPaths.psql, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", USER_TABLE_LIST_SQL], "restore", true),
      command("restored_schema_definition", toolPaths.pgDump, ["--schema-only", "--no-owner", "--no-privileges", "--format=plain"], "restore", true),
      command("restored_acl_guard", toolPaths.psql, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", PUBLIC_ACL_GUARD_SQL], "restore", true),
    ]),
  });
}

export function runBoundedProcess({ executable, args, env, capture }, limits = {}) {
  const timeoutMs = Number.isSafeInteger(limits.timeoutMs) && limits.timeoutMs > 0 ? limits.timeoutMs : 600_000;
  const maxCapturedBytes = Number.isSafeInteger(limits.maxCapturedBytes) && limits.maxCapturedBytes > 0
    ? limits.maxCapturedBytes
    : 4 * 1024 * 1024;
  const killGraceMs = Number.isSafeInteger(limits.killGraceMs) && limits.killGraceMs > 0 ? limits.killGraceMs : 2_000;

  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, {
      env,
      shell: false,
      stdio: capture ? ["ignore", "pipe", "pipe"] : ["ignore", "ignore", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let capturedBytes = 0;
    let timedOut = false;
    let overflowed = false;
    let settled = false;
    let killTimer;

    const terminate = (reason) => {
      if (reason === "timeout") timedOut = true;
      if (reason === "overflow") overflowed = true;
      child.kill("SIGTERM");
      if (!killTimer) {
        killTimer = setTimeout(() => child.kill("SIGKILL"), killGraceMs);
      }
    };
    const append = (target, chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const remaining = Math.max(0, maxCapturedBytes - capturedBytes);
      if (remaining > 0) {
        const text = buffer.subarray(0, remaining).toString("utf8");
        if (target === "stdout") stdout += text;
        else stderr += text;
        capturedBytes += Math.min(buffer.length, remaining);
      }
      if (buffer.length > remaining && !overflowed) terminate("overflow");
    };
    const timeout = setTimeout(() => terminate("timeout"), timeoutMs);
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (killTimer) clearTimeout(killTimer);
      callback();
    };

    child.stdout?.on("data", (chunk) => append("stdout", chunk));
    child.stderr?.on("data", (chunk) => append("stderr", chunk));
    child.on("error", (error) => finish(() => reject(error)));
    child.on("close", (code) => finish(() => resolvePromise({
      code: code ?? 1,
      stdout,
      stderr,
      timedOut,
      overflowed,
      capturedBytes,
    })));
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

function schemaFingerprint(result, id) {
  const definition = String(result.stdout || "");
  if (!definition.trim()) fail("invalid_drill_probe", `${id} returned an empty schema definition.`);
  return createHash("sha256").update(definition).digest("hex");
}

function singleProbeValue(result, id) {
  const values = String(result.stdout || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  if (values.length !== 1) fail("invalid_drill_probe", `${id} returned an invalid value.`);
  return values[0];
}

function systemIdentifier(result, id) {
  const value = singleProbeValue(result, id);
  if (!/^[0-9]{10,20}$/.test(value)) fail("invalid_drill_probe", `${id} returned an invalid system identifier.`);
  return value;
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
  const externalRunProcess = options.runProcess;
  const baseEnvironment = options.baseEnvironment || process.env;
  const commandTimeoutMs = options.commandTimeoutMs || 600_000;
  const totalTimeoutMs = options.totalTimeoutMs || 1_800_000;
  const maxCapturedBytes = options.maxCapturedBytes || 4 * 1024 * 1024;
  const deadline = Date.now() + totalTimeoutMs;
  const tableLists = {};
  const schemaFingerprints = {};
  const systemIdentifiers = {};

  for (const item of plan.commands) {
    const target = item.target === "source" ? plan.source : item.target === "restore" ? plan.restore : null;
    const env = target ? postgresEnvironment(target, plan.caFile, baseEnvironment) : baseEnvironment;
    const remainingMs = deadline - Date.now();
    if (!externalRunProcess && remainingMs <= 0) fail("drill_total_timeout", "Restore drill exceeded its total timeout.");
    const result = externalRunProcess
      ? await externalRunProcess({ executable: item.executable, args: [...item.args], env, capture: item.capture, id: item.id })
      : await runBoundedProcess(
        { executable: item.executable, args: [...item.args], env, capture: item.capture, id: item.id },
        { timeoutMs: Math.min(commandTimeoutMs, remainingMs), maxCapturedBytes },
      );
    if (result?.overflowed) fail("drill_output_limit", `Restore drill step ${item.id} exceeded its output limit.`);
    if (result?.timedOut) fail("drill_command_timeout", `Restore drill step ${item.id} timed out.`);
    if (result?.code !== 0) fail("drill_command_failed", `Restore drill step ${item.id} failed.`);
    if (item.id === "inspect_archive" && !String(result.stdout || "").trim()) fail("invalid_backup_archive", "Backup archive list is empty.");
    if (item.id === "source_role_guard" && singleProbeValue(result, item.id) !== "restricted") {
      fail("source_role_privileged", "Source database role is privileged.");
    }
    if (item.id === "source_write_privileges" && singleProbeValue(result, item.id) !== "read_only") {
      fail("source_role_write_capable", "Source database role has write privileges.");
    }
    if (item.id === "source_acl_guard" && singleProbeValue(result, item.id) !== "restricted") {
      fail("source_acl_exposed", "Source database exposes admin_finance objects to PUBLIC.");
    }
    if (item.id === "restore_role_guard" && singleProbeValue(result, item.id) !== "restricted") {
      fail("restore_role_privileged", "Restore database role is privileged.");
    }
    if (item.id === "restored_acl_guard" && singleProbeValue(result, item.id) !== "restricted") {
      fail("restore_acl_exposed", "Restored database exposes admin_finance objects to PUBLIC.");
    }
    if (item.id.endsWith("system_identifier")) systemIdentifiers[item.id] = systemIdentifier(result, item.id);
    if (item.id === "restore_system_identifier" && systemIdentifiers[item.id] === systemIdentifiers.source_system_identifier) {
      fail("restore_cluster_matches_source", "Source and restore must use different PostgreSQL clusters.");
    }
    if (item.id.endsWith("table_list")) tableLists[item.id] = parseTableList(result, item.id);
    if (item.id.endsWith("schema_definition")) schemaFingerprints[item.id] = schemaFingerprint(result, item.id);
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
  if (schemaFingerprints.source_schema_definition !== schemaFingerprints.restored_schema_definition) {
    fail("restore_schema_fingerprint_mismatch", "Restored schema fingerprint does not match the source database.");
  }
  const backup = await stat(plan.backupPath);
  if (!backup.isFile() || backup.size < 1) fail("backup_file_invalid", "Backup file is missing or empty after the drill.");

  return Object.freeze({
    executed: true,
    sourceTableCount: tableLists.source_table_list.length,
    restoredTableCount: tableLists.restored_table_list.length,
    schemaFingerprint: schemaFingerprints.source_schema_definition,
    clustersDistinct: systemIdentifiers.source_system_identifier !== systemIdentifiers.restore_system_identifier,
    backupBytes: backup.size,
    sourceApplyAllowed: false,
  });
}
