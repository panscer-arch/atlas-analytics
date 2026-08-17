#!/bin/sh
set -eu

password_file="/run/secrets/source-backup-password"
[ -s "$password_file" ] || { printf '%s\n' "Source backup password file is missing." >&2; exit 1; }
[ -s /run/secrets/source-owner-password ] || { printf '%s\n' "Source owner password file is missing." >&2; exit 1; }

backup_password="$(cat "$password_file")"
owner_password="$(cat /run/secrets/source-owner-password)"
[ -n "$backup_password" ] || { printf '%s\n' "Source backup password is empty." >&2; exit 1; }
[ -n "$owner_password" ] || { printf '%s\n' "Source owner password is empty." >&2; exit 1; }
if [ "$backup_password" = "$owner_password" ]; then
  printf '%s\n' "Source owner and backup passwords must be different." >&2
  exit 1
fi
export PGPASSWORD="$owner_password"
export PSQL_BACKUP_PASSWORD="$backup_password"

psql --no-psqlrc --set ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<'SQL'
\getenv backup_password PSQL_BACKUP_PASSWORD
CREATE ROLE atlas_finance_backup
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS
  PASSWORD :'backup_password';
ALTER ROLE atlas_finance_backup SET default_transaction_read_only = on;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE TEMPORARY ON DATABASE atlas_finance FROM PUBLIC;
GRANT CONNECT ON DATABASE atlas_finance TO atlas_finance_backup;
GRANT USAGE ON SCHEMA admin_finance TO atlas_finance_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA admin_finance TO atlas_finance_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA admin_finance TO atlas_finance_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA admin_finance
  GRANT SELECT ON TABLES TO atlas_finance_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA admin_finance
  GRANT SELECT ON SEQUENCES TO atlas_finance_backup;
SQL

ddl="/docker-entrypoint-initdb.d/010_admin_finance_schema.sql"
expected_table_hash="$({
  sed -n 's/^CREATE TABLE \([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\) (.*/\1/p' "$ddl"
} | LC_ALL=C sort | sha256sum | awk '{print $1}')"
actual_table_hash="$({
  psql --no-psqlrc --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --tuples-only --no-align --set ON_ERROR_STOP=1 --command "
      SELECT n.nspname || '.' || c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p')
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND n.nspname NOT LIKE 'pg_toast%'
      ORDER BY 1
    "
} | LC_ALL=C sort | sha256sum | awk '{print $1}')"

if [ "$actual_table_hash" != "$expected_table_hash" ]; then
  printf '%s\n' "Initialized table list does not match the verified baseline." >&2
  exit 1
fi

schema_marker="${ATLAS_ADMIN_FINANCE_SCHEMA_VERSION}:${ATLAS_ADMIN_FINANCE_SCHEMA_SHA256}:${expected_table_hash}"
psql --no-psqlrc --set ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=schema_marker="$schema_marker" <<'MARKER_SQL'
COMMENT ON SCHEMA admin_finance IS :'schema_marker';
MARKER_SQL

unset backup_password owner_password PGPASSWORD PSQL_BACKUP_PASSWORD schema_marker
