#!/bin/sh
set -eu

password_file="/run/secrets/restore-owner-password"
[ -s "$password_file" ] || { printf '%s\n' "Restore owner password file is missing." >&2; exit 1; }
[ -s "$POSTGRES_PASSWORD_FILE" ] || { printf '%s\n' "Restore admin password file is missing." >&2; exit 1; }

restore_password="$(cat "$password_file")"
restore_admin_password="$(cat "$POSTGRES_PASSWORD_FILE")"
[ -n "$restore_password" ] || { printf '%s\n' "Restore owner password is empty." >&2; exit 1; }
[ -n "$restore_admin_password" ] || { printf '%s\n' "Restore admin password is empty." >&2; exit 1; }
if [ "$restore_password" = "$restore_admin_password" ]; then
  printf '%s\n' "Restore admin and owner passwords must be different." >&2
  exit 1
fi
export PSQL_RESTORE_PASSWORD="$restore_password"

psql --no-psqlrc --set ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<'SQL'
\getenv restore_password PSQL_RESTORE_PASSWORD
CREATE ROLE atlas_finance_restore
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS
  PASSWORD :'restore_password';

REVOKE ALL ON DATABASE atlas_finance_restore_drill FROM PUBLIC;
GRANT CONNECT, CREATE, TEMPORARY ON DATABASE atlas_finance_restore_drill TO atlas_finance_restore;
SQL

unset restore_password restore_admin_password PSQL_RESTORE_PASSWORD
