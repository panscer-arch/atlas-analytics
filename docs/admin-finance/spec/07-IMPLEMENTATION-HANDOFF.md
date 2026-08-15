# Atlas Admin: implementation handoff

**Версия:** 1.1
**Назначение:** build-ready дополнение к TZ_ATLAS_ADMIN_FINANCE_DASHBOARD.md
**Интерфейс:** внутренняя read-only административная аналитика
**Важно:** денежные значения HTML-прототипа являются демонстрационными.

## 1. Нормативный приоритет

При расхождении документов применять порядок:

1. BUSINESS_RULES_PAYOUT_WATERFALL.md.
2. Исправления EXPERT_REVIEW_ATLAS_ADMIN_DASHBOARD.md.
3. TZ_ATLAS_ADMIN_FINANCE_DASHBOARD.md.
4. Этот handoff.
5. HTML как визуальная спецификация, но не источник финансовых формул.

До production-расчётов владелец продукта закрывает Gate 0: controlled addresses,
денежные периметры, claim terminal states, fee custody, finality, opening balances,
cutover, reserve/restricted policy и versioned rulesets.

## 2. Денежные периметры

| Perimeter | Cash In | Cash Out | Closing Balance |
| --- | --- | --- | --- |
| Payout Contract | Все внешние token transfers в контракт | Все token transfers из контракта, включая treasury transfers | Canonical on-chain balance |
| Atlas Consolidated | Внешние поступления на controlled addresses | Внешние переводы из controlled addresses | Сумма controlled balances после eliminations |
| Company Treasury | Фактически полученные fee/head-account/other receipts | OPEX, налоги, резервы и treasury payments | Treasury canonical balance |
| Participant Economics | Principal Created | Principal Returned + Net Delta + Net Partner Rewards | Историческая аналитика, не cash balance |

Любой финансовый endpoint принимает обязательный perimeter. Один Net Flow нельзя
повторно использовать во всех периметрах.

## 3. Архитектура

~~~mermaid
flowchart LR
  RPC["Read-only EVM RPC"] --> IDX["Indexer workers"]
  APP["Atlas server events"] --> PRODUCT["Product-event ingest"]
  GA4["GA4 Data API"] --> PRODUCT
  IDX --> RAW["Immutable raw chain store"]
  RAW --> CANON["Canonical projection"]
  CANON --> GRAPH["Cycle, claim and payout graph"]
  GRAPH --> LEDGER["Financial ledger by perimeter"]
  LEDGER --> RECON["Reconciliation engine"]
  GRAPH --> FC["Forecast snapshots"]
  PRODUCT --> FUNNEL["Wallet and campaign projections"]
  RECON --> API["Admin API"]
  FC --> API
  FUNNEL --> API
  API --> WEB["Admin web"]
~~~

Аналитика работает в отдельной сети и БД и не является синхронной зависимостью
кабинета, контрактов или пользовательского API.

## 4. Упаковка

~~~text
apps/
  admin-web/src/
  admin-api/src/
workers/
  chain-indexer/
  projector/
  reconciliation/
  forecast/
  export/
packages/
  finance-domain/
  api-contracts/
  ui-kit/
  observability/
infra/
  migrations/
  compose/
docs/
  methodology/
  runbooks/
~~~

Frontend: React + TypeScript и существующий router/query stack проекта. Backend:
основной стек Atlas, PostgreSQL, очередь задач и object storage экспортов.
Финансовая математика не выполняется во frontend.

## 5. Маршруты

| Route | Экран |
| --- | --- |
| /admin/overview | Контрольный центр |
| /admin/flows | Денежные потоки |
| /admin/cycles | Циклы |
| /admin/forecast | Прогноз выплат |
| /admin/claims | Claims и выплаты |
| /admin/participants/:id? | Участники и лидеры |
| /admin/company-revenue | Доход Company Treasury |
| /admin/head-account | Головной аккаунт |
| /admin/liquidity | Ликвидность и резерв |
| /admin/traffic | Кошельки и GA4-воронка |
| /admin/campaigns | Кампании и когорты |
| /admin/reconciliation | Сверка |
| /admin/risks | Риски и уведомления |
| /admin/methodology | Методика, доступ, audit и exports |

Глобальный URL-state: from, to, timezone=UTC, granularity, perimeter, asOfBlock,
cycleType, campaignId и status.

## 6. Общий API-envelope

~~~json
{
  "data": {},
  "meta": {
    "perimeter": "payout_contract",
    "currency": "USDT",
    "from": "2026-07-28T00:00:00Z",
    "to": "2026-08-04T00:00:00Z",
    "asOfBlockNumber": 54721008,
    "asOfBlockHash": "0x...",
    "finality": "finalized",
    "freshnessSeconds": 120,
    "partial": false,
    "sourceStatus": "ready",
    "formulaVersion": "finance-v1",
    "rulesetVersion": "rules-v3",
    "reconciliationStatus": "reconciled",
    "requestId": "..."
  }
}
~~~

Суммы передаются строками в minimal units и decimal representation. Float запрещён.
Ошибка источника не заменяет последнее успешное значение нулём.

## 7. Backend modules

1. Contract Registry: chain, proxy, implementation, bytecode, ABI, ruleset block range.
2. Controlled Address Registry: owner, perimeter, effective range, internal policy.
3. Raw Chain: blocks, receipts, logs, transfers, canonical/finality.
4. Cycle Lifecycle: created, active, eligible, closed, expired.
5. Claim Lifecycle: eligible, requested, pending, failed, paid, reversed, expired.
6. Economic Payout Graph: payout, components, allocations, transfer links.
7. Financial Ledger: entries, eliminations, adjustments, balance checkpoints.
8. Reconciliation: runs, checks, residual, exception queue.
9. Forecast: immutable snapshots, buckets, items, model and actual comparison.
10. Product Analytics: pseudonymous journey, referral graph, attribution.
11. Admin Security: users, roles, permissions, step-up sessions and audit.
12. Exports: async jobs, immutable filter metadata, expiry and download audit.

## 8. Ключевые таблицы

- chain_blocks, raw_logs, transaction_receipts, token_transfers;
- contracts, implementations, abi_versions, rulesets;
- controlled_addresses, internal_transfer_rules;
- cycles, cycle_state_transitions;
- claims, claim_state_transitions;
- economic_payouts, payout_components, payout_allocations, payout_transfer_links;
- financial_entries, balance_checkpoints, manual_adjustments;
- forecast_snapshots, forecast_buckets, forecast_items, forecast_actuals;
- reconciliation_runs, reconciliation_exceptions;
- wallet_journeys, campaign_attributions, ga4_imports;
- admin_users, roles, permissions, audit_events, export_jobs.

On-chain uniqueness: chain_id + transaction_hash + log_index. Каждая projection
хранит source IDs, block hash, decoder, ruleset и calculation version.

## 9. API resources

Base path: /api/admin/v1.

### Finance

- GET /finance/overview
- GET /finance/cash-movements
- GET /finance/cycles
- GET /finance/platform-fees
- GET /finance/company-receipts
- GET /finance/liquidity/roll-forward
- GET /finance/balances

### Claims and forecast

- GET /claims
- GET /claims/{claimId}
- GET /forecast/snapshots/latest
- GET /forecast/snapshots/{snapshotId}
- GET /forecast/buckets
- GET /forecast/items
- GET /forecast/backtesting

### Participants and growth

- GET /participants/search
- GET /participants/{id}
- GET /participants/{id}/first-line
- GET /participants/{id}/structure
- GET /participants/{id}/cycles
- GET /participants/{id}/payouts
- GET /head-account/summary
- GET /head-account/branches
- GET|POST /participants/{id}/funding
- GET|POST /participants/{id}/kpi-plans
- GET|POST /participants/{id}/notes
- GET /analytics/traffic
- GET /analytics/campaigns

### Control

- GET /reconciliation/runs
- GET /reconciliation/exceptions
- GET /reconciliation/exceptions/{id}
- POST /adjustments/proposals
- POST /adjustments/{id}/approve
- GET /alerts
- POST /alerts/{id}/acknowledge
- GET /methodology/rulesets
- GET /methodology/sources
- GET /audit
- POST /exports
- GET /exports/{jobId}

## 10. Drill-down

~~~text
metric
→ period/dimension row
→ economic_payout_id or ledger_entry_id
→ payout components
→ contract events and token transfers
→ tx hash + log index + block + ruleset
~~~

Backend выполняет field-level authorization. Маскированный пользователь не может
получить полный wallet прямым API-вызовом.

## 11. Forecast

Разные слои не складываются:

1. already requested/pending;
2. maximum eligible exposure;
3. expected cash outflow.

Cycle closed не погашает обязательство без доказанного settlement. Погашение:
claim paid, settlement, reversal или expiry права.

~~~text
balance_s(t) =
  balance_s(t-1)
  + confirmed_external_inflow_s(t)
  - contract_cash_outflow_s(t)

funding_gap_s(t) =
  max(0, required_reserve_s(t) - balance_s(t))
~~~

Committed и Stress доступны после data-quality gate. Base активируется только после
истории claim-delay и backtesting. Snapshot immutable и воспроизводится по block hash,
ruleset и model version.

## 12. Frontend components

- AdminShell, GlobalContextBar, DataStatus, PeriodPicker;
- MetricCard, MetricTooltip, MoneyValue, RatioValue;
- CashFlowChart, ForecastLadder, ExposureStack, BalanceRollForward;
- DataTable, FilterBar, Pagination, LineageDrawer;
- StatusBadge, RiskBanner, EmptyState, PartialDataState;
- MaskedWallet, RevealWalletDialog, ExportDialog;
- AuditReference, FormulaVersionBadge, SourceFreshness.

На mobile таблицы переходят в scrollable data region или compact rows; навигация
заменяется drawer, а не исчезает.

## 13. UI states

Каждый data block поддерживает:

- loading и background refresh;
- true zero, no data, no matches и N/A;
- stale, partial, source error и reconciling;
- reorg/recalculation;
- insufficient history;
- restricted field;
- export queued/processing/ready/expired/failed;
- edit conflict и audited success.

## 14. RBAC

Роли: Owner, Finance Admin, Analyst, Marketing, Auditor.

Permissions: wallet.reveal, finance.export, leader_management, funding.read/write,
adjustment.propose/approve, rules.propose/approve, audit.read, roles.manage.

Reveal/export требуют MFA step-up. Adjustment и ruleset используют four-eyes
approval. Audit append-only: actor, role, session, reason, before/after, request ID,
affected IDs and timestamp.

## 15. Quality gates

1. Повторный backfill даёт одинаковые canonical IDs и суммы.
2. Simulated reorg пересобирает affected projections.
3. Contract roll-forward сходится с on-chain balance до token precision.
4. Gross = net + fee + other deductions; fee не задваивается.
5. Head Account классифицирует существующий partner transfer.
6. Claim не появляется до eligibility и не исчезает до terminal settlement.
7. Каждый KPI сходится с суммой доступных lineage rows.
8. Unknown ruleset, orphan fee/reward или residual блокируют reconciled.
9. Analyst/Marketing не получают full wallet; reveal/export создают audit.
10. P95 overview ≤2 s, drill-down ≤4 s; finalized cycle в forecast ≤5 min.
11. Desktop/tablet/mobile не имеют overlap, clipped text и скрытой навигации.
12. Экспорт воспроизводит filters, perimeter, block hash и formula version.

## 16. Порядок реализации

1. Gate 0 and address/rules registries.
2. Shadow indexers, raw/canonical data, reorg and reconciliation.
3. Read-only cash movements, balance roll-forward and lineage.
4. Platform Fee and Company Treasury receipts.
5. Claims registry and Forecast v1 Committed/Stress.
6. Head Account, risks and notification center.
7. Claim-delay model, Base/P50/P90 and backtesting.
8. Wallet/GA4 linkage, campaigns and cohort economics.
9. Controlled exports, audit operations and full UAT.

## 17. Definition of Done

Экран готов, когда утверждены metric и perimeter, API возвращает meta/lineage,
реализованы все states, role/audit tests проходят, сумма сверена с transfers,
desktop/mobile QA пройден, export сохраняет filters и acceptance имеет evidence.
