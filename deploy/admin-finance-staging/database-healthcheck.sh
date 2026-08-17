#!/bin/sh
set -eu

ddl="/docker-entrypoint-initdb.d/010_admin_finance_schema.sql"
password_file="/run/secrets/source-owner-password"
[ -s "$ddl" ] && [ -s "$password_file" ] || exit 1

owner_password="$(cat "$password_file")"
[ -n "$owner_password" ] || exit 1
export PGPASSWORD="$owner_password"

expected_table_hash="$({
  sed -n 's/^CREATE TABLE \([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\) (.*/\1/p' "$ddl"
} | LC_ALL=C sort | sha256sum | awk '{print $1}')"

actual_table_hash="$({
  psql --no-psqlrc --host=127.0.0.1 --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
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

marker="$(psql --no-psqlrc --host=127.0.0.1 --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
  --tuples-only --no-align --set ON_ERROR_STOP=1 \
  --command "SELECT obj_description('admin_finance'::regnamespace, 'pg_namespace')")"
expected_marker="${ATLAS_ADMIN_FINANCE_SCHEMA_VERSION}:${ATLAS_ADMIN_FINANCE_SCHEMA_SHA256}:${expected_table_hash}"

unset owner_password PGPASSWORD
[ "$actual_table_hash" = "$expected_table_hash" ]
[ "$marker" = "$expected_marker" ]
