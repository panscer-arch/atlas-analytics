# Atlas Admin Finance: пакет для разработки

**Версия пакета:** 1.1 draft
**Дата:** 05.08.2026
**Статус:** design/development draft; не build-ready до закрытия противоречий и Gate 0
**Интерфейс:** внутренняя read-only административная аналитика
**Production data:** не подключены

## Что входит в пакет

| Документ | Назначение |
| --- | --- |
| [01-PRODUCT-AND-METRICS-SPEC.md](./01-PRODUCT-AND-METRICS-SPEC.md) | Полное продуктовое ТЗ: показатели, формулы, периоды, экраны, события и acceptance |
| [02-PAYOUT-WATERFALL.md](./02-PAYOUT-WATERFALL.md) | Утверждённые правила Delta, Partner Reward и Platform Fee |
| [03-METRIC-CATALOG.md](./03-METRIC-CATALOG.md) | Краткий канонический каталог показателей по периметрам |
| [04-SECURE-ARCHITECTURE.md](./04-SECURE-ARCHITECTURE.md) | Trust boundaries, ingest, хранение, RBAC/MFA, audit, этапы и security gates |
| [05-DATA-PROVIDER-CONTRACT.md](./05-DATA-PROVIDER-CONTRACT.md) | Формальный запрос к `data.atlas-system.io`, sandbox и acceptance fixtures |
| [06-GATE-0-REGISTER.md](./06-GATE-0-REGISTER.md) | 14 обязательных решений до production-расчётов |
| [07-IMPLEMENTATION-HANDOFF.md](./07-IMPLEMENTATION-HANDOFF.md) | Модули, таблицы, API resources, frontend-компоненты и порядок реализации |
| [08-SCREEN-TO-API-MATRIX.md](./08-SCREEN-TO-API-MATRIX.md) | Связь 14 React-экранов с API, источниками, правами и проверками |

## Исполняемые контракты

| Артефакт | Назначение |
| --- | --- |
| [atlas-admin-finance-api.v1.yaml](../openapi/atlas-admin-finance-api.v1.yaml) | Канонический OpenAPI 3.1 для same-origin BFF `/api/admin/v1` |
| [001_admin_finance_schema.sql](../data-model/001_admin_finance_schema.sql) | PostgreSQL DDL: evidence, projections, ledger, forecast, reconciliation и audit |
| [golden-fixtures.v1.json](../fixtures/golden-fixtures.v1.json) | 16 acceptance-сценариев для waterfall, lifecycle, reorg, security и restore |
| [fixtures/README.md](../fixtures/README.md) | Правила выполнения fixtures на unit, integration, API и restore уровнях |

Структурная проверка пакета:

```bash
npm run test:admin-finance-contracts
```

Визуальный контракт реализован в `src/modules/admin-finance/`. Все суммы и статусы в текущем UI являются демонстрационными.

## Нормативный приоритет

При расхождении документов использовать следующий порядок:

1. Подписанные решения [06-GATE-0-REGISTER.md](./06-GATE-0-REGISTER.md).
2. Утверждённый [02-PAYOUT-WATERFALL.md](./02-PAYOUT-WATERFALL.md).
3. [01-PRODUCT-AND-METRICS-SPEC.md](./01-PRODUCT-AND-METRICS-SPEC.md).
4. [04-SECURE-ARCHITECTURE.md](./04-SECURE-ARCHITECTURE.md).
5. [07-IMPLEMENTATION-HANDOFF.md](./07-IMPLEMENTATION-HANDOFF.md) и [08-SCREEN-TO-API-MATRIX.md](./08-SCREEN-TO-API-MATRIX.md).
6. React UI как визуальный и interaction-контракт, но не источник финансовой истины.

Устное объяснение, dashboard card, mock payload или frontend-константа не заменяют подписанный ruleset.

## Зафиксированные бизнес-правила

1. Partner Reward выплачивается по effective-dated ruleset: Lockup — 100% при
   создании; Daily — 20% при создании и 80% равными долями за 200 дней
   для ruleset `atlas-level-2026-08-12`.
2. Partner Reward является отдельным расходом поверх Delta.
3. Platform Fee удерживается внутри соответствующей Gross-суммы и не прибавляется к gross outflow второй раз.
4. Ставка, rank snapshot, upgrade/downgrade и timing длинных циклов остаются effective-dated ruleset и входят в Gate 0.

## Денежные периметры

- `payout_contract`: все внешние token transfers payout-контракта; closing balance сверяется с сетью.
- `atlas_consolidated`: внешние потоки controlled addresses после eliminations внутренних переводов.
- `company_treasury`: фактически полученные компанией средства и реальные treasury expenses.
- `participant_economics`: Principal, Delta и Partner Reward как продуктовая аналитика, не cash balance.

Один показатель нельзя переносить между периметрами без пересчёта и явного `perimeter` в API metadata.

## Gate 0

В интерфейсе и документации используется один реестр из 14 технических решений. Production finance остаётся заблокированным, пока каждая строка не имеет:

- владельца и независимого утверждающего;
- versioned evidence;
- даты и effective interval;
- golden fixtures или negative tests;
- записи о решении в audit trail.

Статус `DONE` нельзя получить только по сборке UI, доступности endpoint или устному подтверждению.

## Статус OpenAPI

Файл `docs/openapi/atlas-analytics-api.v0.2.yaml` относится к более раннему analytics-контракту и **не является** каноническим Admin Finance API. Новый draft-контракт находится в [atlas-admin-finance-api.v1.yaml](../openapi/atlas-admin-finance-api.v1.yaml) и использует отдельный `/api/admin/v1`.

Контракт и DDL являются реализационной основой, но не закрывают G0-12/G0-13 автоматически: backend-команда должна подтвердить runtime validation, generated clients, negative contract tests и утверждённый money wire format. До этого запрещено подключать React-модули к production payload или подгонять backend под demo-объекты из компонентов.

## Рекомендуемый порядок начала работ

1. Закрыть G0-01...G0-07 и параллельно G0-10, G0-11, G0-14.
2. Создать runtime schemas, money type и API envelope.
3. Развернуть shadow ingest и immutable raw chain store.
4. Реализовать canonical projections, ledger и reconciliation.
5. Подключить read-only экраны: Reconciliation → Flows → Liquidity → Cycles → Claims.
6. После сверки включить Forecast и Overview.
7. Затем подключить Participants, Revenue, Head Account, Traffic и Campaigns.
8. Alerts, reveal, exports и adjustments включать после security review и audit/WORM.

## Definition of Ready для sprint 1

- назначены owner и approver всех Gate 0 строк;
- получен sandbox `data.atlas-system.io` без production credentials во frontend;
- утверждены controlled address и contract registries;
- доступны ABI, effective block ranges и минимум 10 трассируемых fixtures;
- согласованы money wire format, finality и claim terminal states;
- создан threat model и negative authorization test plan;
- определены RPO/RTO и отдельное restore-окружение.

## Definition of Done системы

- любой KPI раскрывается до canonical event/transfer и воспроизводится по block hash и ruleset;
- ledger сходится с on-chain balance до минимальной единицы токена;
- unknown ruleset, residual, reorg и provider outage не скрываются;
- IDOR/RBAC/MFA/export/audit negative tests проходят;
- повторный backfill детерминирован;
- backup восстановлен в отдельном окружении;
- desktop/mobile и все stale/partial/error состояния проверены;
- production acceptance подтверждён evidence, а не только healthcheck или build.
