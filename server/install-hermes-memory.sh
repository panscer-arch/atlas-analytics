#!/usr/bin/env bash

set -euo pipefail

SOURCE_DIR="${1:-/tmp/atlas-memory-deploy}"
CONTENT_DIR="/opt/atlas-content-api"
HERMES_DIR="/opt/hermes"
ARCHIVE_DIR="/var/lib/atlas-analytics-content/telegram-memory-archive"
BOT_ENV="/etc/atlas-telegram-bot.env"

require_file() {
  if [[ ! -f "$SOURCE_DIR/$1" ]]; then
    echo "Missing deployment file: $SOURCE_DIR/$1" >&2
    exit 1
  fi
}

for file in \
  content-api.mjs \
  marketing-dashboard-monitor.mjs \
  telegram-task-store.mjs \
  telegram-bot.mjs \
  telegram-memory-archive.mjs \
  telegram-memory-sync.mjs \
  hermes-telegram-bridge.py \
  prepare-hermes-hindsight-nous.py \
  configure-hermes-hindsight.sh \
  backup-content.sh; do
  require_file "$file"
done

if ! id hermes >/dev/null 2>&1 || [[ ! -d "$HERMES_DIR" ]]; then
  echo "Hermes installation was not found at $HERMES_DIR" >&2
  exit 1
fi

install -d -m 755 "$CONTENT_DIR"
install -d -m 700 -o www-data -g www-data "$ARCHIVE_DIR"

install -m 644 -o root -g root "$SOURCE_DIR/content-api.mjs" "$CONTENT_DIR/content-api.mjs"
install -m 644 -o root -g root "$SOURCE_DIR/marketing-dashboard-monitor.mjs" "$CONTENT_DIR/marketing-dashboard-monitor.mjs"
install -m 644 -o root -g root "$SOURCE_DIR/telegram-task-store.mjs" "$CONTENT_DIR/telegram-task-store.mjs"
install -m 644 -o root -g root "$SOURCE_DIR/telegram-bot.mjs" "$CONTENT_DIR/telegram-bot.mjs"
install -m 644 -o root -g root "$SOURCE_DIR/telegram-memory-archive.mjs" "$CONTENT_DIR/telegram-memory-archive.mjs"
install -m 644 -o root -g root "$SOURCE_DIR/telegram-memory-sync.mjs" "$CONTENT_DIR/telegram-memory-sync.mjs"
install -m 755 -o root -g root "$SOURCE_DIR/backup-content.sh" "$CONTENT_DIR/backup-content.sh"

install -m 755 -o root -g root "$SOURCE_DIR/hermes-telegram-bridge.py" "$HERMES_DIR/hermes-telegram-bridge.py"
install -m 750 -o hermes -g hermes "$SOURCE_DIR/prepare-hermes-hindsight-nous.py" "$HERMES_DIR/prepare-hermes-hindsight-nous.py"
install -m 750 -o hermes -g hermes "$SOURCE_DIR/configure-hermes-hindsight.sh" "$HERMES_DIR/configure-hermes-hindsight.sh"

if [[ ! -f "$BOT_ENV" ]]; then
  install -m 600 -o root -g root /dev/null "$BOT_ENV"
fi

set_env_default() {
  local key="$1"
  local value="$2"
  if ! grep -qE "^${key}=" "$BOT_ENV"; then
    printf '%s=%s\n' "$key" "$value" >>"$BOT_ENV"
  fi
}

set_env_default HERMES_LONG_TERM_MEMORY_READY 0
set_env_default HINDSIGHT_NOUS_MODEL '~openai/gpt-mini-latest'
chown root:root "$BOT_ENV"
chmod 600 "$BOT_ENV"

cat >/etc/systemd/system/atlas-hermes-hindsight-nous.service <<'SERVICE'
[Unit]
Description=Refresh Nous inference credentials for Atlas Hindsight memory
After=network.target

[Service]
Type=oneshot
EnvironmentFile=-/etc/atlas-telegram-bot.env
Environment=HOME=/opt/hermes
Environment=HERMES_HOME=/opt/hermes
Environment=HINDSIGHT_NOUS_MODEL=~openai/gpt-mini-latest
ExecCondition=/bin/sh -c 'case "$HERMES_LONG_TERM_MEMORY_READY" in 1|true|yes|on) exit 0;; *) exit 1;; esac'
ExecStart=/opt/hermes/.hermes/hermes-agent/venv/bin/python /opt/hermes/prepare-hermes-hindsight-nous.py
User=hermes
Group=hermes
SERVICE

cat >/etc/systemd/system/atlas-telegram-memory-sync.service <<'SERVICE'
[Unit]
Description=Sync the durable Atlas Telegram archive into Hermes long-term memory
Requires=atlas-hermes-hindsight-nous.service
After=network.target atlas-hermes-hindsight-nous.service hermes-telegram-bridge.service atlas-telegram-bot.service

[Service]
Type=oneshot
EnvironmentFile=-/etc/atlas-telegram-bot.env
Environment=TELEGRAM_MEMORY_ARCHIVE_DIR=/var/lib/atlas-analytics-content/telegram-memory-archive
ExecCondition=/bin/sh -c 'case "$HERMES_LONG_TERM_MEMORY_READY" in 1|true|yes|on) exit 0;; *) exit 1;; esac'
ExecStart=/usr/bin/node /opt/atlas-content-api/telegram-memory-sync.mjs
User=www-data
Group=www-data
SERVICE

cat >/etc/systemd/system/atlas-telegram-memory-sync.timer <<'TIMER'
[Unit]
Description=Sync Atlas Telegram memory twice daily

[Timer]
OnCalendar=*-*-* 05,17:00:00 UTC
Persistent=true
RandomizedDelaySec=5m
Unit=atlas-telegram-memory-sync.service

[Install]
WantedBy=timers.target
TIMER

chown hermes:hermes \
  "$HERMES_DIR/.env" \
  "$HERMES_DIR/auth.json" \
  "$HERMES_DIR/hindsight/config.json" \
  "$HERMES_DIR/.hindsight/profiles/hermes.env" 2>/dev/null || true
chmod 600 \
  "$HERMES_DIR/.env" \
  "$HERMES_DIR/auth.json" \
  "$HERMES_DIR/hindsight/config.json" \
  "$HERMES_DIR/.hindsight/profiles/hermes.env" 2>/dev/null || true

systemctl daemon-reload
systemctl enable atlas-telegram-memory-sync.timer
systemctl restart atlas-content-api.service
systemctl restart atlas-telegram-bot.service
systemctl restart hermes-telegram-bridge.service

echo "Hermes memory components installed. Long-term sync remains gated by HERMES_LONG_TERM_MEMORY_READY."
