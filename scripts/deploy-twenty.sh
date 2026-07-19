#!/usr/bin/env bash
set -euo pipefail

TWENTY_DIR="${TWENTY_DIR:-/opt/supersus-twenty}"
TWENTY_ENV="${TWENTY_ENV:-/etc/supersus-twenty.env}"
TWENTY_DOMAIN="${TWENTY_DOMAIN:-crm.46.202.153.132.sslip.io}"
TWENTY_SERVER_URL="${TWENTY_SERVER_URL:-https://${TWENTY_DOMAIN}}"
TWENTY_TAG="${TWENTY_TAG:-v2.22.0}"
BACKUP_DIR="${TWENTY_BACKUP_DIR:-/var/backups/supersus-twenty}"
COMPOSE_SOURCE="${1:-deploy/twenty/docker-compose.yml}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root." >&2
  exit 1
fi

if [ ! -f "$COMPOSE_SOURCE" ]; then
  echo "Compose file not found: $COMPOSE_SOURCE" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2
  systemctl enable --now docker
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required." >&2
  exit 1
fi

# Twenty requires at least 2 GiB RAM. A small swap guard prevents OOM kills on
# this shared 4 GiB VPS without changing application memory limits.
if ! swapon --show --noheadings | grep -q . && [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

install -d -m 755 "$TWENTY_DIR" "$BACKUP_DIR"
if [ "$(realpath "$COMPOSE_SOURCE")" != "$(realpath -m "$TWENTY_DIR/docker-compose.yml")" ]; then
  install -m 644 "$COMPOSE_SOURCE" "$TWENTY_DIR/docker-compose.yml"
fi

if [ ! -f "$TWENTY_ENV" ]; then
  umask 077
  cat >"$TWENTY_ENV" <<EOF
TAG=${TWENTY_TAG}
SERVER_URL=${TWENTY_SERVER_URL}
PG_DATABASE_USER=postgres
PG_DATABASE_PASSWORD=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
EOF
fi

upsert_env_value() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$TWENTY_ENV"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$TWENTY_ENV"
  else
    printf '%s=%s\n' "$key" "$value" >>"$TWENTY_ENV"
  fi
}

upsert_env_value "TAG" "$TWENTY_TAG"
upsert_env_value "SERVER_URL" "$TWENTY_SERVER_URL"

chown root:root "$TWENTY_ENV"
chmod 600 "$TWENTY_ENV"

cd "$TWENTY_DIR"
docker compose --env-file "$TWENTY_ENV" pull
docker compose --env-file "$TWENTY_ENV" up -d --remove-orphans

for attempt in $(seq 1 60); do
  if curl --max-time 5 --fail --silent http://127.0.0.1:3000/healthz >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    docker compose --env-file "$TWENTY_ENV" ps
    docker compose --env-file "$TWENTY_ENV" logs --tail=120 server
    exit 1
  fi
  sleep 5
done

cat >/usr/local/sbin/backup-supersus-twenty <<'BACKUP'
#!/usr/bin/env bash
set -euo pipefail
TWENTY_DIR=/opt/supersus-twenty
TWENTY_ENV=/etc/supersus-twenty.env
BACKUP_DIR=/var/backups/supersus-twenty
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$BACKUP_DIR"
cd "$TWENTY_DIR"
docker compose --env-file "$TWENTY_ENV" exec -T db pg_dump -U postgres -d default | gzip -9 >"$BACKUP_DIR/twenty-$STAMP.sql.gz"
find "$BACKUP_DIR" -type f -name 'twenty-*.sql.gz' -mtime +30 -delete
gzip -t "$BACKUP_DIR/twenty-$STAMP.sql.gz"
BACKUP
chmod 750 /usr/local/sbin/backup-supersus-twenty

cat >/etc/systemd/system/supersus-twenty-backup.service <<'SERVICE'
[Unit]
Description=Backup SuperSUS Twenty CRM
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/backup-supersus-twenty
User=root
Group=root
SERVICE

cat >/etc/systemd/system/supersus-twenty-backup.timer <<'TIMER'
[Unit]
Description=Daily SuperSUS Twenty CRM backup

[Timer]
OnCalendar=*-*-* 03:40:00
Persistent=true
RandomizedDelaySec=10m
Unit=supersus-twenty-backup.service

[Install]
WantedBy=timers.target
TIMER

systemctl daemon-reload
systemctl enable --now supersus-twenty-backup.timer
/usr/local/sbin/backup-supersus-twenty

SERVER_IP="$(curl --max-time 10 --silent https://api.ipify.org || true)"
DNS_IPS="$(getent ahostsv4 "$TWENTY_DOMAIN" 2>/dev/null | awk '{print $1}' | sort -u || true)"
DNS_READY=false
if [ -n "$SERVER_IP" ] && printf '%s\n' "$DNS_IPS" | grep -Fxq "$SERVER_IP"; then
  DNS_READY=true
fi

install -d -m 755 /var/www/certbot
if [ "$DNS_READY" = true ]; then
  cat >/etc/nginx/sites-available/supersus-twenty <<EOF
server {
    listen 80;
    server_name ${TWENTY_DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
        client_max_body_size 25m;
    }
}
EOF
else
  cat >/etc/nginx/sites-available/supersus-twenty <<EOF
server {
    listen 80;
    server_name ${TWENTY_DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 503;
    }
}
EOF
fi
ln -sfn /etc/nginx/sites-available/supersus-twenty /etc/nginx/sites-enabled/supersus-twenty
nginx -t
systemctl reload nginx

if [ "$DNS_READY" = true ]; then
  certbot --nginx \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    --redirect \
    -d "$TWENTY_DOMAIN"
  nginx -t
  systemctl reload nginx
fi

printf 'TWENTY_HEALTH=ok\nTWENTY_DOMAIN=%s\nDNS_READY=%s\nSERVER_IP=%s\n' \
  "$TWENTY_DOMAIN" "$DNS_READY" "$SERVER_IP"
