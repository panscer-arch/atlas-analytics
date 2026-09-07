# n8n Pilot Operations Runbook

This runbook operates only the private `supersus-n8n` Compose project. It must
not change or restart SuperSUS, Twenty CRM, Hermes, Bitwarden, nginx, DNS,
Telegram, or system timers.

## 1. Preflight

From the repository worktree on the Mac:

```bash
node scripts/n8n-preflight.mjs \
  --remote root@46.202.153.132 \
  --identity /Users/digitex/.ssh/atlas_analytics_vps
```

Exit code `0` means all gates passed. Exit code `2` means stop without changing
the server. Required gates are at least 10 GiB free on `/`, at least 2048 MiB
available RAM, TCP 5678 free, no active systemd jobs, and all existing
containers running with every declared health check healthy.

## 2. Resolve Immutable Images

The server has `docker manifest` and `jq`, but not Docker Buildx. Resolve the
Linux AMD64 manifest digest without pulling the image:

```bash
docker manifest inspect --verbose n8nio/n8n:2.37.11 \
  | jq -r '.[] | select(.Descriptor.platform.os == "linux" and .Descriptor.platform.architecture == "amd64") | .Descriptor.digest' \
  | head -n 1

docker manifest inspect --verbose postgres:16 \
  | jq -r '.[] | select(.Descriptor.platform.os == "linux" and .Descriptor.platform.architecture == "amd64") | .Descriptor.digest' \
  | head -n 1
```

Each command must return exactly one `sha256:` value. The operator places the
complete `name:tag@sha256:digest` references into the protected server `.env`.
Never use `latest` or an automatic updater.

## 3. Stage Configuration

After preflight passes, copy only `ops/n8n/compose.yaml` to
`/opt/supersus-n8n/compose.yaml`. Create the directory with mode `750` and the
server-only `.env` with mode `600`.

Resolve the digests again and generate secrets without displaying secret values:

```bash
set +x
umask 077
n8n_digest="$(docker manifest inspect --verbose n8nio/n8n:2.37.11 \
  | jq -r '.[] | select(.Descriptor.platform.os == "linux" and .Descriptor.platform.architecture == "amd64") | .Descriptor.digest' \
  | head -n 1)"
postgres_digest="$(docker manifest inspect --verbose postgres:16 \
  | jq -r '.[] | select(.Descriptor.platform.os == "linux" and .Descriptor.platform.architecture == "amd64") | .Descriptor.digest' \
  | head -n 1)"
printf '%s\n' "$n8n_digest" | grep -Eq '^sha256:[0-9a-f]{64}$'
printf '%s\n' "$postgres_digest" | grep -Eq '^sha256:[0-9a-f]{64}$'
postgres_secret="$(openssl rand -hex 32)"
n8n_secret="$(openssl rand -hex 32)"
install -m 600 /dev/null /opt/supersus-n8n/.env
{
  printf 'N8N_IMAGE=n8nio/n8n:2.37.11@%s\n' "$n8n_digest"
  printf 'POSTGRES_IMAGE=postgres:16@%s\n' "$postgres_digest"
  printf '%s\n' 'POSTGRES_DB=n8n'
  printf '%s\n' 'POSTGRES_USER=n8n'
  printf 'POSTGRES_PASSWORD=%s\n' "$postgres_secret"
  printf 'N8N_ENCRYPTION_KEY=%s\n' "$n8n_secret"
  printf '%s\n' 'TZ=Europe/Moscow'
} > /opt/supersus-n8n/.env
unset n8n_digest postgres_digest postgres_secret n8n_secret
chmod 600 /opt/supersus-n8n/.env
```

Do not paste secret values into shell history, chat, Git, tickets, or logs. Do
not enable shell tracing.

Validate without starting anything:

```bash
cd /opt/supersus-n8n
docker compose -p supersus-n8n --env-file .env config --quiet
```

## 4. Pull and Start

Pull only the reviewed project images:

```bash
cd /opt/supersus-n8n
docker compose -p supersus-n8n --env-file .env pull
```

Run the preflight again after the pull. If disk or memory no longer passes,
stop. Do not remove existing images or run any prune command.

Start only this project:

```bash
docker compose -p supersus-n8n --env-file .env up -d
docker compose -p supersus-n8n --env-file .env ps
```

Confirm `127.0.0.1:5678` listens on the server and that all containers that
were running before installation remain running and healthy.

## 5. Private Access

On the Mac:

```bash
ssh -i /Users/digitex/.ssh/atlas_analytics_vps \
  -N -L 5678:127.0.0.1:5678 root@46.202.153.132
```

Open `http://127.0.0.1:5678`. The owner completes initial setup in this private
session, then verifies sign-out and sign-in. Do not expose port 5678 through a
firewall, proxy, DNS record, nginx route, or public tunnel.

## 6. Backup

Use a root-readable directory outside `/opt/supersus-n8n`. A backup consists of
a PostgreSQL custom-format dump and an archive of the n8n application-data
volume. Record only file names, sizes, timestamps, and SHA-256 hashes in
sanitized evidence.

```bash
install -d -m 700 /var/backups/supersus-n8n
cd /opt/supersus-n8n
docker compose -p supersus-n8n --env-file .env exec -T postgres \
  pg_dump -U n8n -d n8n -Fc > /var/backups/supersus-n8n/n8n-db.dump
docker run --rm \
  -v supersus-n8n_n8n_app_data:/source:ro \
  -v /var/backups/supersus-n8n:/backup \
  postgres:16-alpine \
  tar -C /source -czf /backup/n8n-app-data.tar.gz .
chmod 600 /var/backups/supersus-n8n/n8n-db.dump \
  /var/backups/supersus-n8n/n8n-app-data.tar.gz
sha256sum /var/backups/supersus-n8n/n8n-db.dump \
  /var/backups/supersus-n8n/n8n-app-data.tar.gz
```

Do not upload backup contents to Git or expose them through the website.

## 7. Restore Drill

Use exact names prefixed with `supersus-n8n-restore-test`. Do not bind any host
port and do not attach restore containers to the live pilot networks. Inspect
the resolved target names before creating or removing restore resources.

Restore PostgreSQL into a temporary `postgres:16` container and restore the app
archive into a temporary named volume. Verify the database tables and one pilot
row, then stop the temporary containers.

Before cleanup, list exact targets:

```bash
docker ps -a --filter name=supersus-n8n-restore-test --format '{{.Names}}'
docker volume ls --filter name=supersus-n8n-restore-test --format '{{.Name}}'
docker network ls --filter name=supersus-n8n-restore-test --format '{{.Name}}'
```

Remove only names from those three lists after confirming every name begins
with `supersus-n8n-restore-test`. Never use a broad wildcard or prune.

## 8. Stop and Roll Back

Stop only the pilot and preserve its volumes:

```bash
cd /opt/supersus-n8n
docker compose -p supersus-n8n --env-file .env stop
```

Do not run `down -v`, `docker system prune`, `docker volume prune`, a global
Docker restart, or delete `/opt/supersus-n8n`. Reverting an image is not a valid
database rollback after migrations; restore the matching database backup.

## 9. Acceptance Boundary

The pilot remains private and workflows remain inactive. Installation does not
authorize AI keys, mail, Telegram, social publication, schedules, SuperSUS UI
changes, production data, or financial and wallet actions.
