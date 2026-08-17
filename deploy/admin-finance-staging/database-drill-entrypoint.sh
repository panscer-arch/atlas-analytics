#!/bin/sh
set -eu

read_encoded_secret() {
  node -e '
    const fs = require("node:fs");
    const value = fs.readFileSync(process.argv[1], "utf8").replace(/\r?\n$/, "");
    if (!value || /[\r\n\0]/.test(value)) process.exit(2);
    process.stdout.write(encodeURIComponent(value));
  ' "$1"
}

require_positive_integer() {
  case "$2" in
    ""|*[!0-9]*)
      printf '%s\n' "$1 must be a positive integer." >&2
      exit 1
      ;;
  esac
  if [ "$2" -le 0 ]; then
    printf '%s\n' "$1 must be a positive integer." >&2
    exit 1
  fi
}

backup_name="${ATLAS_ADMIN_FINANCE_BACKUP_NAME:-}"
case "$backup_name" in
  ""|*/*|*..*|*[!A-Za-z0-9._-]*|*.dump.dump)
    printf '%s\n' "ATLAS_ADMIN_FINANCE_BACKUP_NAME is invalid." >&2
    exit 1
    ;;
esac

max_backup_bytes="${ATLAS_ADMIN_FINANCE_MAX_BACKUP_BYTES:-}"
max_backup_total_bytes="${ATLAS_ADMIN_FINANCE_MAX_BACKUP_TOTAL_BYTES:-}"
require_positive_integer ATLAS_ADMIN_FINANCE_MAX_BACKUP_BYTES "$max_backup_bytes"
require_positive_integer ATLAS_ADMIN_FINANCE_MAX_BACKUP_TOTAL_BYTES "$max_backup_total_bytes"
if [ "$max_backup_bytes" -gt "$max_backup_total_bytes" ]; then
  printf '%s\n' "Single-backup limit exceeds the total backup budget." >&2
  exit 1
fi

lock_directory=/backups/.drill.lock
if ! mkdir "$lock_directory" 2>/dev/null; then
  printf '%s\n' "Another restore drill is active or requires lock cleanup." >&2
  exit 1
fi
release_lock() {
  rmdir "$lock_directory" 2>/dev/null || true
}
trap release_lock EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

existing_backup_kib="$(du -sk /backups | awk '{print $1}')"
existing_backup_bytes="$((existing_backup_kib * 1024))"
available_backup_bytes="$((max_backup_total_bytes - existing_backup_bytes))"
if [ "$available_backup_bytes" -lt "$max_backup_bytes" ]; then
  printf '%s\n' "Backup volume budget is exhausted; review retention before another drill." >&2
  exit 1
fi
max_backup_blocks="$(((max_backup_bytes + 511) / 512))"
ulimit -f "$max_backup_blocks"
case "$backup_name" in
  *.dump) ;;
  *)
    printf '%s\n' "ATLAS_ADMIN_FINANCE_BACKUP_NAME must end with .dump." >&2
    exit 1
    ;;
esac

source_password="$(read_encoded_secret /run/secrets/source-backup-password)"
restore_password="$(read_encoded_secret /run/secrets/restore-owner-password)"

export ATLAS_ADMIN_FINANCE_DATABASE_URL="postgresql://${ATLAS_ADMIN_FINANCE_SOURCE_USER}:${source_password}@${ATLAS_ADMIN_FINANCE_SOURCE_HOST}:5432/${ATLAS_ADMIN_FINANCE_SOURCE_DATABASE}"
export ATLAS_ADMIN_FINANCE_RESTORE_DATABASE_URL="postgresql://${ATLAS_ADMIN_FINANCE_RESTORE_USER}:${restore_password}@${ATLAS_ADMIN_FINANCE_RESTORE_HOST}:5432/${ATLAS_ADMIN_FINANCE_RESTORE_DATABASE}"
export ATLAS_ADMIN_FINANCE_DATABASE_CA_FILE="/run/atlas-finance-tls/ca.crt"
export ATLAS_ADMIN_FINANCE_BACKUP_PATH="/backups/$backup_name"

unset source_password restore_password
node scripts/admin-finance-staging-db-drill.mjs --execute-restore-drill
