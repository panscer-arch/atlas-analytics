import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (name) => readFile(resolve(root, "deploy/admin-finance-staging", name), "utf8");
const [compose, dockerfile, initScript, baselineScript, sourceInitScript, restoreInitScript, healthcheckScript, drillEntrypoint, example] = await Promise.all([
  read("compose.database.yaml"),
  read("Dockerfile"),
  read("database-init.sh"),
  read("database-verify-baseline.sh"),
  read("database-source-init.sh"),
  read("database-restore-init.sh"),
  read("database-healthcheck.sh"),
  read("database-drill-entrypoint.sh"),
  read(".env.example"),
]);
const migrationManifest = JSON.parse(await readFile(resolve(root, "deploy/admin-finance-staging/migrations/manifest.v1.json"), "utf8"));

for (const scriptName of [
  "database-init.sh",
  "database-verify-baseline.sh",
  "database-source-init.sh",
  "database-restore-init.sh",
  "database-healthcheck.sh",
  "database-drill-entrypoint.sh",
]) {
  const metadata = await stat(resolve(root, "deploy/admin-finance-staging", scriptName));
  assert.equal(metadata.mode & 0o111, 0o111, `${scriptName} must be executable`);
}

assert(compose.includes("name: atlas-admin-finance-staging-database"));
const postgresImage = "postgres:16.10-bookworm@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74";
assert(compose.includes(postgresImage));
assert(!compose.includes("infra-postgres"));
assert(!compose.includes("infra_"));
assert(!compose.includes("\n    ports:"), "Finance PostgreSQL must not publish host ports");
assert(compose.includes("internal: true"), "The database network must be internal-only");
assert(compose.includes("POSTGRES_INITDB_ARGS: --auth-host=scram-sha-256 --auth-local=scram-sha-256"));
assert(!compose.includes("--auth-local=peer"));
assert(compose.includes("ssl_min_protocol_version=TLSv1.2"));
assert(compose.includes("ssl_cert_file=/run/atlas-finance-tls/source.crt"));
assert(compose.includes("ssl_cert_file=/run/atlas-finance-tls/restore.crt"));
assert(compose.includes("docs/admin-finance/data-model/001_admin_finance_schema.sql:/docker-entrypoint-initdb.d/010_admin_finance_schema.sql:ro"));
assert(compose.includes("database-source-init.sh:/docker-entrypoint-initdb.d/020_backup_role.sh:ro"));
assert(compose.includes("database-verify-baseline.sh:/docker-entrypoint-initdb.d/005_verify_baseline.sh:ro"));
assert(compose.includes("database-healthcheck.sh:/opt/atlas-finance/database-healthcheck.sh:ro"));
assert(compose.includes(`ATLAS_ADMIN_FINANCE_SCHEMA_VERSION: ${migrationManifest.schemaVersion}`));
assert(compose.includes(`ATLAS_ADMIN_FINANCE_SCHEMA_SHA256: ${migrationManifest.sha256}`));
assert(compose.includes(`ATLAS_ADMIN_FINANCE_SCHEMA_BYTES: "${migrationManifest.bytes}"`));
assert(compose.includes("/var/lib/postgresql/data:size=512m,uid=999,gid=999,mode=0700"));
assert(compose.includes('profiles: ["database-drill"]'));
assert(compose.includes("target: database-drill"));
assert(compose.includes('ATLAS_ADMIN_FINANCE_NOTIFICATIONS_ENABLED: "false"'));
assert(compose.includes('ATLAS_ADMIN_FINANCE_MAX_BACKUP_BYTES: "536870912"'));
assert(compose.includes('ATLAS_ADMIN_FINANCE_MAX_BACKUP_TOTAL_BYTES: "2147483648"'));
assert(compose.includes("read_only: true"));
assert(compose.includes("no-new-privileges:true"));
assert(compose.includes("cap_drop: [ALL]"));
assert(compose.includes("source_data:"));
assert(compose.includes("database_tls:"));
assert(compose.includes("database_backups:"));

for (const secretName of ["source_owner_password", "source_backup_password", "restore_admin_password", "restore_owner_password"]) {
  assert(compose.includes(`${secretName}:`), `Missing ${secretName} file secret`);
}
for (const secretTarget of ["source-owner-password", "source-backup-password", "restore-admin-password", "restore-owner-password"]) {
  assert(compose.includes(`target: ${secretTarget}`), `Missing explicit ${secretTarget} mount target`);
}
assert(!/POSTGRES_PASSWORD:\s*\$\{/m.test(compose), "Database passwords must use *_FILE secrets");

assert(dockerfile.includes("AS database-drill"));
assert(dockerfile.includes(`FROM ${postgresImage} AS database-drill`));
assert(dockerfile.includes("FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94 AS node-runtime"));
assert(dockerfile.includes("COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node"));
assert(dockerfile.includes("USER postgres"));

assert(initScript.includes("openssl verify"));
assert(initScript.includes("subjectAltName=DNS:$name"));
assert(initScript.includes("openssl x509 -checkhost"));
assert(initScript.includes("certificate_key_matches"));
assert(initScript.includes("issue_server_certificate source"));
assert(initScript.includes("issue_server_certificate restore"));
assert(initScript.includes("rm -f \"$work/ca.key\""), "The CA private key must not persist");
assert(!initScript.includes("echo $"), "The init script must not print secrets");

assert(baselineScript.includes("sha256sum"));
assert(baselineScript.includes("ATLAS_ADMIN_FINANCE_SCHEMA_SHA256"));
assert(baselineScript.includes("ATLAS_ADMIN_FINANCE_SCHEMA_BYTES"));
assert(baselineScript.includes("Baseline checksum mismatch"));

assert(sourceInitScript.includes("atlas_finance_backup"));
assert(sourceInitScript.includes("ALTER ROLE atlas_finance_backup SET default_transaction_read_only = on"));
assert(sourceInitScript.includes("\\getenv backup_password PSQL_BACKUP_PASSWORD"));
assert(!sourceInitScript.includes("--set=backup_password="), "The backup password must not be exposed in psql argv");
assert(sourceInitScript.includes('if [ "$backup_password" = "$owner_password" ]'));
assert(sourceInitScript.includes("GRANT SELECT ON ALL TABLES IN SCHEMA admin_finance"));
assert(sourceInitScript.includes("GRANT SELECT ON ALL SEQUENCES IN SCHEMA admin_finance"));
assert(!sourceInitScript.includes("GRANT USAGE, SELECT ON ALL SEQUENCES"));
assert(sourceInitScript.includes("ALTER DEFAULT PRIVILEGES IN SCHEMA admin_finance"));
assert(sourceInitScript.includes("REVOKE CREATE ON SCHEMA public FROM PUBLIC"));
assert(sourceInitScript.includes("REVOKE TEMPORARY ON DATABASE atlas_finance FROM PUBLIC"));
assert(!/\sSUPERUSER\b/.test(sourceInitScript), "The backup role must not be a superuser");
assert(sourceInitScript.includes("COMMENT ON SCHEMA admin_finance"));
assert(sourceInitScript.includes("<<'MARKER_SQL'"));
assert(!sourceInitScript.includes('--command "COMMENT ON SCHEMA'));
assert(sourceInitScript.includes("expected_table_hash"));
assert(sourceInitScript.includes("actual_table_hash"));

assert(restoreInitScript.includes("CREATE ROLE atlas_finance_restore"));
assert(restoreInitScript.includes("\\getenv restore_password PSQL_RESTORE_PASSWORD"));
assert(!restoreInitScript.includes("--set=restore_password="), "The restore password must not be exposed in psql argv");
assert(restoreInitScript.includes('if [ "$restore_password" = "$restore_admin_password" ]'));
assert(restoreInitScript.includes("NOSUPERUSER"));
assert(restoreInitScript.includes("GRANT CONNECT, CREATE, TEMPORARY ON DATABASE atlas_finance_restore_drill TO atlas_finance_restore"));
assert(!restoreInitScript.includes("ALTER DATABASE atlas_finance_restore_drill OWNER"));
assert(!/\sSUPERUSER\b/.test(restoreInitScript), "The restore owner must not be a superuser");

assert(healthcheckScript.includes("obj_description"));
assert(healthcheckScript.includes("expected_table_hash"));
assert(healthcheckScript.includes("actual_table_hash"));
assert(healthcheckScript.includes("PGPASSWORD"));

assert(drillEntrypoint.includes("scripts/admin-finance-staging-db-drill.mjs"));
assert(drillEntrypoint.includes("--execute-restore-drill"));
assert(drillEntrypoint.includes("encodeURIComponent"));
assert(drillEntrypoint.includes("ulimit -f"));
assert(drillEntrypoint.includes("/backups/.drill.lock"));
assert(drillEntrypoint.includes("ATLAS_ADMIN_FINANCE_MAX_BACKUP_TOTAL_BYTES"));
assert(!drillEntrypoint.includes("set -x"));

assert(example.includes("ATLAS_ADMIN_FINANCE_SOURCE_OWNER_PASSWORD_FILE="));
assert(example.includes("ATLAS_ADMIN_FINANCE_SOURCE_BACKUP_PASSWORD_FILE="));
assert(example.includes("ATLAS_ADMIN_FINANCE_RESTORE_ADMIN_PASSWORD_FILE="));
assert(example.includes("ATLAS_ADMIN_FINANCE_RESTORE_OWNER_PASSWORD_FILE="));
assert(example.includes("ATLAS_ADMIN_FINANCE_BACKUP_NAME="));
assert(!/ATLAS_ADMIN_FINANCE_(?:SOURCE|RESTORE).*PASSWORD=(?!_FILE)/.test(example));

console.log("Admin Finance isolated staging database stack: OK");
