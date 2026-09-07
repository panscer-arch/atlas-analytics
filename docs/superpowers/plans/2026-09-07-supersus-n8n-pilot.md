# SuperSUS n8n Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a private, isolated n8n instance on the upgraded SuperSUS server and verify a synthetic draft-approval-persistence workflow without external integrations.

**Architecture:** A dedicated Docker Compose project runs n8n 2.37.11 and PostgreSQL 16 in `/opt/supersus-n8n`, binds the editor to server loopback only, and stores data in separate named volumes. Repository checks validate the deployment bundle and exported workflow; a server preflight blocks image pulls and startup until resource and port gates pass.

**Tech Stack:** Docker Compose 2.40+, n8n 2.37.11, PostgreSQL 16, Node.js ESM verification scripts, Bash server operations.

**Spec:** `docs/superpowers/specs/2026-09-07-supersus-n8n-pilot-design.md`

## Global Constraints

- Do not pull images or start n8n until a fresh server check shows at least 10 GiB free disk and 2 GiB available RAM.
- Do not delete Docker data, backups, logs, or existing services to satisfy the gate.
- Keep n8n bound to `127.0.0.1`; initially access it only through an SSH tunnel.
- Do not change SuperSUS code, nginx, DNS, TLS, Telegram, Hermes, CRM, or timers.
- Do not mount the Docker socket or directories belonging to other services.
- Do not use `latest`, automatic image updates, `down -v`, Docker prune, global Docker restarts, or destructive Git commands.
- Do not add production credentials, AI keys, schedules, external messages, or publication nodes.
- Do not print generated secrets in chat, terminal output, Git, or logs.

---

## File Map

- `ops/n8n/compose.yaml`: isolated n8n and PostgreSQL services, health checks, resource caps, log rotation, loopback binding.
- `ops/n8n/.env.example`: non-secret variable names and pinned image tags.
- `ops/n8n/README.md`: preflight, secret creation, installation, tunnel, backup, restore, upgrade, and rollback runbook.
- `ops/n8n/workflows/supersus-draft-approval-pilot.json`: sanitized export of the accepted pilot workflow.
- `scripts/n8n-preflight.mjs`: read-only local/server resource and collision gate with JSON output.
- `scripts/verify-n8n-bundle.mjs`: static safety checks for Compose, environment template, and workflow export.
- `package.json`: `check:n8n-preflight` and `test:n8n-bundle` commands.

### Task 1: Version-Controlled Deployment Bundle

**Files:**
- Create: `ops/n8n/compose.yaml`
- Create: `ops/n8n/.env.example`
- Create: `scripts/verify-n8n-bundle.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run test:n8n-bundle`, which exits `0` only when the bundle meets the isolation rules.
- Produces: Compose variables `N8N_IMAGE`, `POSTGRES_IMAGE`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `N8N_ENCRYPTION_KEY`, and `TZ`.

- [x] **Step 1: Write the failing bundle verifier**

Create `scripts/verify-n8n-bundle.mjs`. It must read `ops/n8n/compose.yaml` and `.env.example`, fail if either is absent, and assert all of the following literal properties:

```js
const requiredCompose = [
  '127.0.0.1:5678:5678',
  'N8N_ENCRYPTION_KEY',
  'DB_TYPE=postgresdb',
  'internal: true',
  'no-new-privileges:true',
  'max-size: "10m"',
  'max-file: "3"',
];
const forbiddenCompose = [
  'latest', '/var/run/docker.sock', 'network_mode: host',
  '0.0.0.0:5678', '/opt/atlas-analytics', 'supersus-twenty',
];
```

It must also parse `ops/n8n/workflows/supersus-draft-approval-pilot.json` only when that file exists and reject credential objects, schedule nodes, email nodes, Telegram nodes, social-media nodes, HTTP Request nodes, and Execute Command nodes.

- [x] **Step 2: Register and run the failing test**

Add this exact script to `package.json`:

```json
"test:n8n-bundle": "node scripts/verify-n8n-bundle.mjs"
```

Run: `npm run test:n8n-bundle`

Expected: FAIL because `ops/n8n/compose.yaml` and `.env.example` do not exist.

- [x] **Step 3: Create the minimal isolated Compose bundle**

Create two services named `postgres` and `n8n`. Use `${POSTGRES_IMAGE}` and `${N8N_IMAGE}`, dedicated `n8n_db_data` and `n8n_app_data` volumes, an internal backend network, and a separate frontend network used only by n8n. Set PostgreSQL health checking with `pg_isready`; make n8n depend on the healthy database. Bind only `127.0.0.1:5678:5678`.

Set for both services:

```yaml
security_opt:
  - no-new-privileges:true
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

Set conservative pilot limits: PostgreSQL `512M` memory and `0.75` CPUs; n8n `1024M` memory and `1.0` CPU. Set `N8N_DIAGNOSTICS_ENABLED=false`, `N8N_PERSONALIZATION_ENABLED=false`, `N8N_SECURE_COOKIE=false` for loopback HTTP through the SSH tunnel, `EXECUTIONS_DATA_PRUNE=true`, and `EXECUTIONS_DATA_MAX_AGE=168`.

Create `.env.example` containing no values for secrets and these pinned tags:

```dotenv
N8N_IMAGE=n8nio/n8n:2.37.11
POSTGRES_IMAGE=postgres:16
POSTGRES_DB=n8n
POSTGRES_USER=n8n
POSTGRES_PASSWORD=
N8N_ENCRYPTION_KEY=
TZ=Europe/Moscow
```

- [x] **Step 4: Run static verification**

Run: `npm run test:n8n-bundle`

Expected: PASS and a concise JSON summary containing `composeSafe: true` and `workflowChecked: false`.

- [x] **Step 5: Commit the bundle**

```bash
git add package.json ops/n8n/compose.yaml ops/n8n/.env.example scripts/verify-n8n-bundle.mjs
git commit -m "ops: add isolated n8n deployment bundle"
```

### Task 2: Resource and Collision Preflight

**Files:**
- Create: `scripts/n8n-preflight.mjs`
- Create: `ops/n8n/README.md`
- Modify: `package.json`

**Interfaces:**
- Produces: `node scripts/n8n-preflight.mjs --remote root@46.202.153.132 --identity /Users/digitex/.ssh/atlas_analytics_vps`, returning JSON with `passed`, `diskFreeGiB`, `memoryAvailableMiB`, `port5678Free`, `upgradeJobsIdle`, and `existingContainersHealthy`.
- Consumes: SSH host supplied by the operator and the user's configured SSH identity; the script contains no IP address, username, key path, or credential.

- [x] **Step 1: Write fixture-driven failing tests inside the preflight script**

Implement `--self-test` with three fixed fixtures:

```js
const cases = [
  { diskFreeGiB: 4.4, memoryAvailableMiB: 1700, port5678Free: true, expected: false },
  { diskFreeGiB: 12, memoryAvailableMiB: 1900, port5678Free: true, expected: false },
  { diskFreeGiB: 12, memoryAvailableMiB: 2500, port5678Free: true, expected: true },
];
```

The gate is `diskFreeGiB >= 10`, `memoryAvailableMiB >= 2048`, port 5678 free, no active systemd jobs, and all pre-existing running containers still running with any declared health status equal to `healthy`.

- [x] **Step 2: Run self-test before remote collection exists**

Run: `node scripts/n8n-preflight.mjs --self-test`

Expected: FAIL because remote collection and output validation are not implemented.

- [x] **Step 3: Implement read-only remote collection**

Use `execFileSync('ssh', args)` rather than a shell string. The remote command may read `free -m`, `df -Pk /`, `ss -ltn`, `systemctl list-jobs --no-pager`, and `docker ps --format`; it must not run Docker pull/start/stop, package installation, cleanup, resize, reboot, or filesystem writes. Parse the output into the documented JSON interface and exit `2` when the gate fails.

- [x] **Step 4: Document exact safe operations**

In `ops/n8n/README.md`, document:

1. Run preflight and stop on exit `2`.
2. Resolve immutable image digests using `docker manifest inspect --verbose` and place digest-pinned references only in the server `.env`.
3. Create `/opt/supersus-n8n` with mode `750`.
4. Generate both secrets without displaying them and write `.env` with mode `600`.
5. Validate with `docker compose --env-file .env config --quiet`.
6. Pull images, then recheck free disk before startup.
7. Start only this project with `docker compose -p supersus-n8n up -d`.
8. Tunnel with `ssh -i /Users/digitex/.ssh/atlas_analytics_vps -N -L 5678:127.0.0.1:5678 root@46.202.153.132`.
9. Back up with PostgreSQL `pg_dump` plus an archive of n8n app data.
10. Restore into isolated temporary volumes before accepting the pilot.
11. Roll back with `docker compose -p supersus-n8n stop`, preserving volumes.

The runbook must explicitly prohibit copying secrets from terminal history and prohibit `down -v`, prune, global Docker restart, or edits to existing services.

- [x] **Step 5: Register and run checks**

Add:

```json
"check:n8n-preflight": "node scripts/n8n-preflight.mjs --self-test"
```

Run: `npm run check:n8n-preflight && npm run test:n8n-bundle`

Expected: both PASS.

- [x] **Step 6: Commit preflight and runbook**

```bash
git add package.json scripts/n8n-preflight.mjs ops/n8n/README.md
git commit -m "ops: add n8n preflight and recovery runbook"
```

### Task 3: Closed Server Installation

**Files:**
- Deploy from: `ops/n8n/compose.yaml`
- Deploy from: `ops/n8n/.env.example`
- Record sanitized evidence in: `outputs/n8n-pilot/server-install-verification.json`

**Interfaces:**
- Consumes: a preflight result with `passed: true` after the infrastructure team finishes the server upgrade.
- Produces: a private n8n editor reachable only at local Mac URL `http://127.0.0.1:5678` while the SSH tunnel is active.

- [ ] **Step 1: Run fresh preflight**

Run the remote preflight using the known SSH host and identity supplied at execution time.

Expected: exit `0`, disk at least 10 GiB free, available memory at least 2048 MiB, port 5678 free, existing containers healthy, and no systemd jobs running. If any gate fails, stop Task 3 without changing the server.

- [ ] **Step 2: Stage the reviewed bundle**

Create `/opt/supersus-n8n`, copy only `compose.yaml`, create the protected `.env` according to the runbook, and run `docker compose config --quiet`. Do not copy repository history or unrelated files.

- [ ] **Step 3: Resolve and freeze image digests**

Resolve the registry digest for `n8nio/n8n:2.37.11` and `postgres:16`, replace each server-only image value with its complete tag-and-SHA-256 reference returned by the registry, and run Compose validation again. The sanitized evidence records tags and digests but no secrets.

- [ ] **Step 4: Pull and recheck before startup**

Pull only the two new images. Re-run disk and memory checks. If the post-pull gate fails, do not start containers; retain the staged project for review and do not remove existing images.

- [ ] **Step 5: Start only the isolated project**

Run `docker compose -p supersus-n8n up -d`. Verify both new containers, their health, resource usage, and loopback listener. Verify all previously running containers retain their earlier running/healthy state.

- [ ] **Step 6: Verify network isolation**

From the server, verify `127.0.0.1:5678` responds. From an external client, verify `46.202.153.132:5678` is not reachable. Open the editor through the SSH tunnel, create the initial owner, sign out, and sign back in.

- [ ] **Step 7: Save sanitized installation evidence**

Write JSON containing timestamp, versions, image digests, resource readings, container health, loopback result, public-port result, and existing-service health. Do not include usernames, passwords, cookies, tokens, environment values, or personal data.

### Task 4: Synthetic Draft Approval Workflow

**Files:**
- Create: `ops/n8n/workflows/supersus-draft-approval-pilot.json`
- Modify: `scripts/verify-n8n-bundle.mjs`
- Record sanitized evidence in: `outputs/n8n-pilot/workflow-verification.json`

**Interfaces:**
- Consumes: a private authenticated n8n editor and a built-in n8n Data Table named `supersus_draft_pilot`.
- Produces: one sanitized workflow export with no credentials and a verification record proving state transitions and idempotency.

- [ ] **Step 1: Extend the failing workflow verifier**

Require the export to contain exactly one manual trigger, deterministic draft creation, an approval form, one explicit reject path, one explicit approve path, and Data Table lookup/update operations. Reject active workflows, credentials, schedule/webhook triggers, external communication nodes, HTTP Request, Execute Command, filesystem access, and code containing `fetch`, `axios`, `http`, `https`, `child_process`, `process.env`, or secret-like field names.

Run: `npm run test:n8n-bundle`

Expected: FAIL because the workflow export does not exist.

- [ ] **Step 2: Create the pilot Data Table**

Create `supersus_draft_pilot` with these exact columns:

```text
request_key:string, source_text:string, draft_text:string, draft_version:string,
state:string, reviewer:string, approved_at:dateTime, saved_at:dateTime,
error_text:string
```

Use synthetic source text only. Do not enter Atlas financial claims, participant data, email addresses, credentials, or production content.

- [ ] **Step 3: Build the deterministic workflow**

Use a Manual Trigger. Set `request_key` to `pilot-2026-09-07-001` and source text to `Atlas publishes an educational update.` Build the draft exactly as `Draft: Atlas publishes an educational update.` and compute the version from that exact string using SHA-256 in a Code node. Lookup `request_key` before insert; if a row already has state `saved` with the same version, terminate as a no-op.

Present an n8n Form step with required radio field `decision` containing `Approve` and `Reject`, plus required text field `reviewer`. Route `Reject` to state `rejected`. Route `Approve` to an update that writes state `saved`, the exact approved version, reviewer, approval timestamp, and saved timestamp. No path may update `saved` before the form decision.

- [ ] **Step 4: Export and sanitize**

Export the workflow to `ops/n8n/workflows/supersus-draft-approval-pilot.json`, set `active` to `false`, remove instance IDs and any credential metadata, and normalize formatting. Bindings to the Data Table must remain usable on the pilot instance; document the local table name in workflow notes.

- [ ] **Step 5: Run repository verification**

Run: `npm run test:n8n-bundle`

Expected: PASS with `composeSafe: true` and `workflowChecked: true`.

- [ ] **Step 6: Exercise state and duplicate protections**

Run four controlled executions:

1. Reject the original draft: final state `rejected`, no saved timestamp.
2. Approve the original draft: final state `saved`, version and reviewer recorded.
3. Replay the same request key and version: no second saved row.
4. Change the draft text while keeping the request key: the old approval cannot authorize the new version.

Restart only `supersus-n8n` containers and verify the table and executions remain. Record row counts, states, version equality, restart persistence, and absence of outbound nodes in sanitized evidence.

- [ ] **Step 7: Commit the sanitized workflow and verifier**

```bash
git add ops/n8n/workflows/supersus-draft-approval-pilot.json scripts/verify-n8n-bundle.mjs
git commit -m "feat: add synthetic n8n approval pilot"
```

### Task 5: Backup, Restore, and Acceptance Gate

**Files:**
- Update: `ops/n8n/README.md`
- Update: `outputs/n8n-pilot/server-install-verification.json`
- Update: `outputs/n8n-pilot/workflow-verification.json`

**Interfaces:**
- Consumes: healthy closed installation and completed synthetic workflow tests.
- Produces: acceptance decision `PILOT_ACCEPTED` or `PILOT_BLOCKED`; it does not authorize production integrations.

- [ ] **Step 1: Create a protected pilot backup**

Follow the runbook to produce a PostgreSQL dump and n8n app-data archive in a root-readable backup directory outside the Compose project. Record file sizes and SHA-256 hashes in sanitized evidence, not backup contents.

- [ ] **Step 2: Restore into isolated temporary names**

Restore into temporary containers, network, and volumes named with prefix `supersus-n8n-restore-test`. Do not attach them to the live pilot network or bind port 5678. Verify the restored database contains the single saved pilot row and matching draft version.

- [ ] **Step 3: Remove only restore-test resources**

After verification, stop and remove only containers, network, and volumes whose exact names begin `supersus-n8n-restore-test`. Resolve and list exact targets before removal. Preserve the live pilot and its volumes.

- [ ] **Step 4: Run final acceptance checks**

Verify repository checks, private access, owner login, existing-service health, persistence, duplicate protection, backup restore, no active workflows, and no external nodes or credentials. Set `PILOT_ACCEPTED` only when all checks pass; otherwise record `PILOT_BLOCKED` and the precise failed gates.

- [ ] **Step 5: Commit runbook refinements and sanitized evidence**

```bash
git add ops/n8n/README.md outputs/n8n-pilot/server-install-verification.json outputs/n8n-pilot/workflow-verification.json
git commit -m "docs: record n8n pilot acceptance evidence"
```

The accepted pilot remains private and inactive. Adding AI, SuperSUS UI, schedules, mail, Telegram, publishing, or production credentials requires a new approved design and implementation plan.
