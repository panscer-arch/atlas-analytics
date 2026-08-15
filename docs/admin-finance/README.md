# Atlas Admin Finance

Единая точка входа для реализации собственной финансово-аналитической админки
Atlas. Пакет не подключён к production-данным и не разрешает обход Gate 0.

## Состав

- [Полное ТЗ и handoff](./spec/README.md)
- [Канонический Admin API](./openapi/atlas-admin-finance-api.v1.yaml)
- [PostgreSQL DDL](./data-model/001_admin_finance_schema.sql)
- [Golden fixtures](./fixtures/golden-fixtures.v1.json)
- [Правила выполнения fixtures](./fixtures/README.md)
- [Локальный read-only API](./runbooks/LOCAL-DEMO-API.md)
- [Правила продолжения и согласования экранов](./WORKING-RULES.md)
- [Ревизия 05.08.2026](./REVISION-AUDIT-2026-08-05.md)
- [Канонический контекст и план MVP](./project-memory/START-HERE.md)
- [Кандидат реестра контролируемых адресов](./contracts/controlled-address-registry.v1.json)

## Проверка

```bash
npm run test:admin-finance-contracts
npm run test:admin-finance-address-registry
npm run test:admin-finance-api
npm run build
```

Дополнительный строгий OpenAPI lint:

```bash
npx --yes @redocly/cli lint docs/admin-finance/openapi/atlas-admin-finance-api.v1.yaml
```

## Порядок реализации

1. Закрыть и подписать 14 решений Gate 0.
2. Применить DDL только в изолированной staging PostgreSQL и прогнать rollback/
   restore drill.
3. Поднять shadow ingest и immutable evidence store без подключения UI.
4. Прогнать golden fixtures, backfill и независимую on-chain reconciliation.
5. Подключать read-only экраны по порядку: Reconciliation, Flows, Liquidity,
   Cycles, Claims, затем Forecast и Overview.
6. Reveal, exports и adjustments включать только после RBAC/MFA/security review.

## Текущая реализация

В `server/admin-finance-api.mjs` реализован закрытый demo-only вертикальный срез:

- `/meta` и `/methodology/gate0`;
- cash movements и liquidity roll-forward;
- cycles и claims;
- reconciliation runs и exceptions;
- finance overview, forecast, participant search/profile/first-line.

API не подключён к production-источникам, не выдаёт сессию самостоятельно и
отказывается запускаться в режиме `production`. В React существуют 14 visual
prototype routes, но только шесть финансовых экранов имеют demo API slices;
скрытого fallback с API на mock нет.

Успешные lint, build или healthcheck не являются production acceptance. Допуск
подтверждается сверкой, negative security tests и восстановлением backup в
отдельном окружении.
