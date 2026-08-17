#!/bin/sh
set -eu

ddl="/docker-entrypoint-initdb.d/010_admin_finance_schema.sql"
[ -f "$ddl" ] || { printf '%s\n' "Baseline DDL is missing." >&2; exit 1; }

actual_sha256="$(sha256sum "$ddl" | awk '{print $1}')"
actual_bytes="$(wc -c <"$ddl" | tr -d '[:space:]')"

if [ "$actual_sha256" != "${ATLAS_ADMIN_FINANCE_SCHEMA_SHA256:-}" ]; then
  printf '%s\n' "Baseline checksum mismatch." >&2
  exit 1
fi
if [ "$actual_bytes" != "${ATLAS_ADMIN_FINANCE_SCHEMA_BYTES:-}" ]; then
  printf '%s\n' "Baseline byte length mismatch." >&2
  exit 1
fi
