# Локальный Atlas Admin Finance demo API

Этот runbook запускает только read-only demo projections. Он не подключается к
`data.atlas-system.io`, RPC, production PostgreSQL или пользовательским данным.

## 1. Проверка

```bash
npm run test:admin-finance
```

Проверяются fail-closed запуск, сессия, same-origin policy, rate-limit contract,
query validation, подписанные курсоры, atomic money и первые read-only resources.

## 2. Локальные секреты процесса

Создайте новые временные значения для каждого запуска:

```bash
export ATLAS_ADMIN_FINANCE_MODE=demo
export ATLAS_ADMIN_FINANCE_SESSION_TOKEN="$(openssl rand -hex 32)"
export ATLAS_ADMIN_FINANCE_CURSOR_SECRET="$(openssl rand -hex 32)"
export ATLAS_ADMIN_FINANCE_ALLOWED_ORIGINS="http://127.0.0.1:4186"
```

Не сохраняйте эти значения в Git, `.env`, screenshot или браузерный localStorage.
Production identity должна приходить из отдельного OIDC/BFF слоя, которого в
этом demo-срезе ещё нет.

## 3. Запуск

В одном терминале:

```bash
npm run api:admin-finance
```

В другом терминале:

```bash
VITE_ADMIN_FINANCE_DATA_SOURCE=api npm run dev -- --host 127.0.0.1 --port 4186
```

Для проверки ровно первого релизного контура:

```bash
VITE_ADMIN_FINANCE_DATA_SOURCE=api VITE_ADMIN_FINANCE_RELEASE_SCOPE=mvp npm run dev -- --host 127.0.0.1 --port 4186
```

В `mvp` доступны только Reconciliation, Flows, Liquidity, Cycles и Claims.
Остальные маршруты показывают release boundary и не подставляют demo-экраны.

Vite проксирует `/api/admin/v1` на loopback-порт `8791`. Сервер не публикует CORS
и проверяет Origin, если браузер его передал. Без явного
`VITE_ADMIN_FINANCE_DATA_SOURCE=api` интерфейс остаётся в режиме
`static-demo`. В API-режиме ошибки и `401` отображаются явно: подстановка
статических финансовых значений запрещена.

Подключены экраны `/admin/overview`, `/admin/flows`, `/admin/cycles`,
`/admin/forecast`, `/admin/claims` и `/admin/participants`. Обзор читает
`GET /api/admin/v1/finance/overview` и не суммирует разные денежные контуры на
клиенте: liquidity/obligations/cash flow принадлежат `payout_contract`, циклы —
`participant_economics`, доход компании — `company_treasury`. Demo API содержит
только срез `2026-07-29T00:00:00Z`–`2026-08-05T00:00:00Z`; более широкий запрос
возвращается с `partial=true`, `sourceStatus=partial` и причиной ограничения.

`/admin/flows` читает cash movements отдельно для `payout_contract`,
`atlas_consolidated` и `company_treasury`, а разбивку циклов берёт из overview.
Компоненты фактического outflow остаются `N/A`, пока канонический источник не
передаст сверенную payout component dimension. Статический waterfall в API-режим
не подмешивается.

`/admin/cycles` читает canonical aggregates из `GET /finance/cycles`. Demo API
намеренно возвращает `partial=true`: суммы и версии правил доступны, но lifecycle
time series, eligibility dates и payout components ещё не переданы. Экран не
восстанавливает эти данные из агрегатов и показывает явное `source unavailable`.

`/admin/forecast` сначала получает immutable snapshot для `committed` или
`stress`, затем загружает последовательные bucket выбранного горизонта. Клиент
проверяет component total, формулу closing balance и непрерывность остатков.
`base` возвращает `422`, пока claim-delay не откалиброван и не прошёл backtesting.

`/admin/claims` читает список из `GET /claims` и выбранную запись отдельно из
`GET /claims/{claimId}`. Клиент проверяет lifecycle, уникальность payout
components и баланс `gross = net + Platform Fee + other deductions`. `failed`
остаётся открытым обязательством; исключение из exposure допускается только для
подтверждённых `paid`, `reversed` и `expired`. Demo API возвращает
`partial=true`, потому что полные transfer lineage и claim-delay history ещё не
переданы. Экран не подставляет wallet, transaction hash или расчёт задержки.

`/admin/participants` сначала выполняет точный поиск через
`GET /participants/search`, затем загружает маскированный профиль и отдельный
ресурс `first-line`. Частичный wallet hint не открывает профиль автоматически.
Клиент отклоняет полный EVM-адрес в ответе, несогласованную сумму payout
components и некорректные structure counts. Demo profile не содержит rank
history, growth series, KPI, company funding, notes или wallet reveal. Эти блоки
показываются как `N/A`; локальный mock и `localStorage` в API-режиме не
подмешиваются.

Остальные финансовые экраны в API-режиме остаются fail-closed до подключения
собственных канонических datasets. Их статические KPI не показываются.

## 4. Проверка запроса

Demo API не имеет login endpoint. Для локальной ручной проверки cookie задаётся
явно из уже созданной переменной:

```bash
curl --fail-with-body \
  -H "Origin: http://127.0.0.1:4186" \
  -H "Cookie: __Host-atlas_admin_session=${ATLAS_ADMIN_FINANCE_SESSION_TOKEN}" \
  "http://127.0.0.1:8791/api/admin/v1/meta"
```

Отсутствующий cookie должен вернуть `401`, а посторонний Origin — `403`.

## Ограничения

- только mode `demo`;
- только GET для реализованного среза;
- данные фиксированы и помечены demo;
- нет OIDC, PostgreSQL, ingest, background jobs или exports;
- успешный ответ не является подтверждением production ledger.
