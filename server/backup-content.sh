#!/usr/bin/env bash
set -euo pipefail

STORE_DIR="${ATLAS_CONTENT_STORE_DIR:-/var/lib/atlas-analytics-content}"
BACKUP_DIR="${ATLAS_CONTENT_BACKUP_DIR:-/var/backups/atlas-analytics-content}"
RETENTION_DAYS="${ATLAS_CONTENT_BACKUP_RETENTION_DAYS:-30}"
INCLUDE_INTERNAL_BACKUPS="${ATLAS_CONTENT_BACKUP_INCLUDE_INTERNAL:-0}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive_name="atlas-analytics-content-${timestamp}.tar.gz"
archive_path="${BACKUP_DIR}/${archive_name}"
latest_path="${BACKUP_DIR}/latest.tar.gz"

if [ ! -d "${STORE_DIR}" ]; then
  echo "Content store does not exist: ${STORE_DIR}" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

tar_args=(
  -czf "${archive_path}"
  -C "${STORE_DIR}"
)

if [ "${INCLUDE_INTERNAL_BACKUPS}" != "1" ]; then
  tar_args+=(--exclude="./_backups")
fi

tar "${tar_args[@]}" .
ln -sfn "${archive_name}" "${latest_path}"

find "${BACKUP_DIR}" \
  -maxdepth 1 \
  -type f \
  -name "atlas-analytics-content-*.tar.gz" \
  -mtime +"${RETENTION_DAYS}" \
  -delete

echo "Created backup: ${archive_path}"
