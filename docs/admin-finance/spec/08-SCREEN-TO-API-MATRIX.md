# Atlas Admin: экран → API → источник → доступ → acceptance

**Base path:** `/api/admin/v1`
**Режим первого релиза:** read-only
**Часовой пояс:** UTC
**Money:** строки в atomic units + decimals; float запрещён

## Общий response envelope

Каждый финансовый ответ содержит:

```json
{
  "data": {},
  "meta": {
    "perimeter": "payout_contract",
    "currency": "USDT",
    "from": "2026-08-01T00:00:00Z",
    "to": "2026-08-05T00:00:00Z",
    "asOfBlockNumber": 54721008,
    "asOfBlockHash": "0x...",
    "finality": "finalized",
    "freshnessSeconds": 120,
    "partial": false,
    "sourceStatus": "ready",
    "formulaVersion": "finance-v1",
    "rulesetVersion": "rules-v3",
    "reconciliationStatus": "reconciled",
    "requestId": "req_..."
  }
}
```

Если обязательная metadata отсутствует, клиент показывает `N/A / source unavailable`, но не `0` и не последнее значение как текущее.

## Матрица 14 экранов

| Route | Основные API | Канонический источник | Минимальное право | Ключевая проверка приёмки |
| --- | --- | --- | --- | --- |
| `/admin/overview` | `GET /finance/overview` | reconciled ledger + forecast snapshot | `finance.aggregate.read` | KPI равен сумме drill-down строк при одном block/formula cut |
| `/admin/flows` | `GET /finance/cash-movements` | token transfers + controlled address registry | `finance.flow.read` | internal transfers исключаются только в consolidated perimeter |
| `/admin/cycles` | `GET /finance/cycles` | canonical cycle lifecycle | `cycles.read` | unique cycle count и principal сходятся с source events |
| `/admin/forecast` | `GET /forecast/snapshots/*`, `/forecast/buckets`, `GET /alerts`, `GET /alerts/{alertId}/deliveries` | immutable forecast snapshots + server-owned reserve alert journal | `forecast.read`, `risks.read` | sequential balance и first breach воспроизводятся без future unconfirmed inflow; чтение журнала не запускает доставку |
| `/admin/claims` | `GET /claims`, `/claims/{id}` | claim lifecycle + payout graph | `claims.read` | obligation не исчезает до paid/reversed/expired terminal evidence |
| `/admin/participants` | `GET /participants/*` | pseudonymous participant/referral projections | `participants.read` | wallet/referral/Atlas ID/точный branch ordinal открывают один профиль; поиск не допускает IDOR |
| `/admin/company-revenue` | `GET /finance/company-economics` | reconciled incoming principal + payout allocations + Company Treasury transfers | `finance.company_economics.read` | строгие aggregate/bucket суммы сходятся; каждый непрерывный UTC bucket показывает Fee Delta, Fee Partner, Head creation/claim, Incoming, Revenue и gap к target; Platform Fee не прибавляется к Gross второй раз; один period/block/perimeter; partial attribution остаётся PARTIAL/N/A |
| `/admin/company-revenue` transaction register | `GET /finance/platform-fees`, `GET /finance/company-receipts` | Gross allocation events + Company Treasury token transfers | `finance.platform_fees.read`; `finance.company_receipts.read` | allocation и cash receipt разделены; fee = Gross × versioned rate; receipt связан с source event/tx/block/log; персональные wallet-адреса не возвращаются; unreconciled lineage остаётся PARTIAL |
| `/admin/head-account` | `GET /head-account/summary`, `/head-account/branches` | partner graph + controlled head-account receipts | `head_account.read` | branch ordinal неизменяем; status gap и income используют один as-of block/ruleset; gap не выдаётся за cash receipt |
| `/admin/liquidity` | `GET /finance/liquidity/roll-forward`, `/finance/balances` | ledger checkpoints + on-chain balances | `liquidity.read` | closing balance сходится с сетью; LP не закрывает cash gap автоматически |
| `/admin/traffic` | `GET /analytics/traffic` | GA4 + server-confirmed connect + on-chain cycle | `growth.read` | wallet/tx hash не передаются в GA4; UI event не равен registration |
| `/admin/company-revenue` growth plan | `GET /management/growth-plan` | versioned management proposal; production source pending | `management.growth_plan.read` | read-only; local draft не является approved plan или accounting fact |
| `/admin/company-revenue` partner capture | `GET /finance/partner-economics` | paid Partner Rewards + attributed Head Account receipts | `finance.partner_economics.read` | strict arithmetic; Platform Fee excluded; partial attribution remains PARTIAL/N/A |
| `/admin/head-account` partner capture control | `GET /finance/partner-economics`, `/head-account/branches`; future notification preferences | partner economics + branch compression/status | `finance.partner_economics.read`; `head_account.read`; future `risk_preferences.write` | один target/threshold ruleset; shortfall не является funding instruction; write требует MFA/audit |
| `/admin/campaigns` | `GET /analytics/campaigns` | pseudonymous attribution + cohort ledger | `campaigns.read` | unattributed bucket обязателен; same-period не смешивается с cohort ROI |
| `/admin/reconciliation` | `GET /reconciliation/*`, `POST /adjustments/*` | immutable raw/canonical/ledger layers | `reconciliation.read`; write отдельно | residual и unknown ruleset блокируют reconciled; adjustment four-eyes |
| `/admin/risks` | `GET /alerts`, `GET /alerts/{id}/history`, `POST /alerts/{id}/acknowledge` | source-owned risk signals, including Partner Capture thresholds | `risks.read`; ack отдельно | owner/SLA filters; acknowledge не закрывает source condition; alert/recovery require 2 finalized cuts; transition history append-only; local what-if не пишет в API |
| `/admin/methodology` | `GET /methodology/*`, `/audit`, `/exports` | versioned registries and security services | field-specific | reveal/export требуют server authorization, MFA, purpose и audit |

## Общие query параметры

- `from`, `to`, `timezone=UTC`;
- `granularity=day|week|month`;
- `perimeter=payout_contract|atlas_consolidated|company_treasury|participant_economics`;
- `asOfBlock` или immutable `snapshotId`;
- `cycleType`, `claimStatus`, `campaignId`, `participantId`;
- cursor pagination; offset pagination для raw ledger запрещена на больших диапазонах.

Backend устанавливает максимальный диапазон, timeout и query cost budget по endpoint и роли.

## Drill-down contract

```text
metric
→ period/dimension bucket
→ ledger_entry_id or economic_payout_id
→ payout components and allocations
→ canonical contract events and token transfers
→ tx_hash + log_index + block_hash + ruleset
```

Каждый уровень проверяет field- и row-level authorization. Получение агрегата не даёт автоматического права на полный wallet или raw export.

## Обязательные состояния frontend

Для каждого data block:

- loading и background refresh;
- true zero, no data, no matches и N/A;
- stale, partial, source error и reconciling;
- reorg/recalculation;
- insufficient history;
- restricted field;
- export queued/processing/ready/expired/failed.

Последнее успешное значение при stale/error показывается только с возрастом, checkpoint и явной пометкой. Ошибка не превращается в ноль.

## Security contract

### Authentication

- OIDC Authorization Code + PKCE через BFF;
- Secure, HttpOnly, SameSite session cookie;
- access/refresh token не хранится в `localStorage`;
- короткая idle/absolute session и CSRF protection.

### Authorization

- default deny;
- role + permission + resource scope + purpose;
- server-side enforcement на каждом endpoint и поле;
- negative tests для IDOR, horizontal/vertical privilege escalation и direct API calls.

### Step-up

`wallet.reveal`, `finance.export`, `adjustment.approve`, `rules.approve`, `roles.manage` требуют:

- MFA/passkey или TOTP;
- свежий step-up grant с коротким TTL;
- reason/case ID;
- immutable audit event;
- повторную проверку permission в момент действия.

### Export

- асинхронный job;
- immutable filters, perimeter, block hash, formula/ruleset version;
- row/size limits;
- CSV formula-injection neutralization;
- encrypted object storage;
- one-time short-lived download URL;
- expiry, deletion и download audit.

## Data acceptance fixtures

Минимальный набор:

1. cycle create + Partner Reward at Creation;
2. claim с Principal, Gross/Net Delta, Platform Fee и Partner Reward streamed;
3. failed → retry → paid;
4. reversal/correction;
5. duplicate и out-of-order delivery;
6. chain reorg;
7. ruleset upgrade на block boundary;
8. internal transfer между controlled addresses;
9. empty period, true zero, null и unavailable;
10. provider outage/stale snapshot;
11. unauthorized participant/reveal/export requests;
12. backup restore с повторной reconciliation.

## Release acceptance

1. Детерминированный backfill создаёт те же canonical IDs и суммы.
2. Ledger roll-forward сходится с on-chain balance до token precision.
3. `Gross = Net + Fee + Other deductions`; fee не задваивается.
4. Каждый KPI равен сумме доступных lineage rows.
5. Reorg пересобирает только affected range и не теряет audit history.
6. Unknown ruleset, orphan transfer и residual остаются exception.
7. Analyst/Marketing не получают full wallet ни через UI, ни прямым API.
8. Restore проверен на отдельном окружении с согласованными RPO/RTO.
9. Все 14 маршрутов проходят desktop/mobile, loading/stale/partial/error QA.
10. Production acceptance содержит evidence links; healthcheck и успешная сборка недостаточны.
