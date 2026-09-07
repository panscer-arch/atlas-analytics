# SuperSUS n8n Pilot Design

Date: 2026-09-07

## Goal

Deploy an isolated n8n pilot on the existing SuperSUS server after its resource
upgrade. The first workflow turns approved source material into a draft, waits
for explicit approval, and stores the approved result. It does not publish,
send messages, create schedules, or connect production accounts.

## Current Server Gate

The latest read-only check showed 4 GiB RAM, 2 GiB swap almost fully allocated,
and a 48 GiB root disk with 4.4 GiB free. Existing CRM, Redis, PostgreSQL,
Bitwarden, and Hermes speech-recognition containers are running.

Do not pull images or start n8n until the server upgrade has completed and a
fresh check shows at least 10 GiB free disk and 2 GiB available RAM. These are
conservative pilot gates, not vendor minimums. Do not delete Docker data,
backups, logs, or existing services to satisfy the gate.

## Deployment Boundary

- Use a separate Compose project in `/opt/supersus-n8n`.
- Run one n8n instance with its own PostgreSQL database.
- Do not reuse the CRM database or Redis instance.
- Keep persistent n8n and database data in dedicated volumes.
- Pin reviewed image versions and digests; do not use `latest`.
- Do not mount the Docker socket or directories belonging to other services.
- Apply container resource limits and bounded Docker log rotation.
- Keep n8n bound to `127.0.0.1`; initially access it only through an SSH tunnel.
- Do not change SuperSUS code, nginx, DNS, TLS, Telegram, Hermes, CRM, or timers.
- Do not enable automatic image updates.

The user creates the first n8n owner in the private interface. Generated
encryption and database secrets must be stored outside Git with restrictive
permissions and must not be printed in chat, command output, or logs.

## Pilot Workflow

Input is an explicitly approved source text and metadata. The initial smoke
test uses synthetic data and a deterministic template transformation, so it
does not require an AI key and cannot be mistaken for an AI-generated result.

States:

1. `received`
2. `draft_prepared`
3. `awaiting_approval`
4. `rejected` or `approved`
5. `saved`
6. `error`

Approval belongs to an exact draft version. Editing the draft invalidates the
approval. Each request has an idempotency key; rerunning the same request must
not create a second approved result. If persistence has an unknown outcome,
the workflow reconciles the stored record before retrying.

The saved result must survive a restart of only the new n8n containers. The
workflow must have no outbound publication, email, messenger, or social-media
nodes. AI access and production accounts are separate later approvals.

## SuperSUS Integration

The n8n editor is an administrative implementation surface, not the normal
employee interface. A later phase may add a SuperSUS approval queue showing
status, exact content version, reviewer, timestamps, errors, and retry state.
That UI and its API are outside this pilot and are not implied by installing
n8n.

## Verification

- Confirm existing containers are healthy before and after deployment.
- Confirm n8n is reachable through the SSH tunnel.
- Confirm port 5678 is not reachable from the public internet.
- Confirm first-owner setup is completed and no public bootstrap screen remains.
- Run one synthetic request through approval and persistence.
- Reject another request and confirm it cannot reach `saved` as approved.
- Edit an approved draft and confirm approval is invalidated.
- Replay an idempotency key and confirm no duplicate result appears.
- Restart only the n8n project and confirm data remains.
- Perform an isolated backup-and-restore drill before production credentials.
- Confirm no schedules, messages, publications, or production-account access.

## Operations and Rollback

Initially run one manual workflow at a time. Keep execution history bounded.
Autostart after reboot is enabled only after acceptance and an owner is assigned
for updates, backups, monitoring, and incident response.

Rollback stops only the dedicated n8n Compose project and preserves its volumes.
Do not use `down -v`, Docker prune, global Docker restarts, or destructive Git
commands. Before future upgrades, back up the n8n database and related data;
reverting an image alone is not a valid rollback after database migrations.

## Out of Scope

Public n8n access, website deployment, CRM changes, email, Telegram, social
publishing, AI credentials, financial actions, wallet operations, DNS changes,
OS upgrades, disk resizing, payment, and unattended external actions.
