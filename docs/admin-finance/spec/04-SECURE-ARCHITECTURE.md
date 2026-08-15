# Atlas Admin: безопасная архитектура аналитики

**Версия:** 1.0 draft
**Дата:** 05.08.2026
**Назначение:** план перехода от интерактивного прототипа к собственной production-админке

## 1. Решение

Atlas сохраняет собственный интерфейс и финансовую модель. Готовые open-source
проекты используются как инфраструктурные компоненты, а не как замена админки.

Frontend не обращается к `data.atlas-system.io` напрямую. Все внешние данные
попадают в Atlas через отдельный read-only ingest-сервис, сохраняются в исходном
виде, проходят проверку схемы и качества, после чего используются для расчётов.

~~~mermaid
flowchart LR
  DATA["data.atlas-system.io"] --> INGEST["Atlas ingest connector"]
  CHAIN["BNB Chain RPC/indexer"] --> RAW["Immutable raw store"]
  DUNE["Dune public checkpoint"] --> RECON["Independent reconciliation"]
  GA4["GA4 Data API"] --> INGEST
  INGEST --> RAW
  RAW --> VALIDATE["Schema, quality, deduplication"]
  VALIDATE --> QUARANTINE["Quarantine"]
  VALIDATE --> CORE["Canonical PostgreSQL models"]
  CORE --> DBT["dbt transformations and tests"]
  DBT --> MARTS["Financial and product marts"]
  MARTS --> SEMANTIC["MetricFlow governed metrics"]
  SEMANTIC --> BFF["Atlas Admin API / BFF"]
  BFF --> WEB["Atlas Admin React UI"]
  CHAIN --> RECON["Independent reconciliation"]
  MARTS --> RECON
  RECON --> BFF
~~~

Кабинет, контракты и пользовательский API не зависят от аналитического контура.
Сбой аналитики не должен влиять на создание циклов, claims или работу кабинета.

## 2. Рекомендуемый стек

| Слой | Решение для первого релиза | Почему |
| --- | --- | --- |
| Admin UI | существующий Atlas React/TypeScript UI | содержит 14 draft-маршрутов; shell и каждый экран требуют отдельного согласования |
| Admin API / BFF | TypeScript, Fastify или текущий backend-стек Atlas | серверная авторизация, маскирование и контролируемые агрегаты |
| Основная БД | PostgreSQL с партиционированием | транзакционность, зрелость, простая эксплуатация на старте |
| Raw storage | приватный S3/MinIO bucket с versioning | повторная обработка и доказуемость исходных данных |
| Трансформации | dbt Core | versioned SQL-модели, зависимости, тесты и документация |
| Метрики | MetricFlow в dbt-проекте | одна реализация формул, grain, dimensions и временных агрегаций |
| On-chain indexer | Ponder | TypeScript EVM-indexer с записью в PostgreSQL; сверка остаётся в Atlas |
| Фоновые задачи | Graphile Worker | ingest, backfill, forecast и exports без отдельного Redis-кластера |
| Аутентификация | существующий корпоративный OIDC или Keycloak | SSO, MFA и централизованное управление доступом |
| Наблюдаемость | OpenTelemetry Collector + Prometheus/Grafana | состояние pipeline, задержка, ошибки, SLA |
| Внутренний ad hoc BI | Apache Superset, только для аналитиков | исследование данных без замены основной админки |
| Резервное копирование | pgBackRest + off-host S3 | WAL/PITR, checksum, encryption и проверяемое восстановление |

Cube Core добавляется во второй фазе только при появлении нескольких потребителей,
которым нужен общий semantic REST/GraphQL/SQL API. Для фиксированных 14 экранов
MetricFlow и типизированный BFF проще в эксплуатации.

ClickHouse не нужен автоматически. Его добавляют после нагрузочного теста, если
PostgreSQL с партициями, индексами и materialized views не обеспечивает
согласованный SLA на фактическом объёме данных.

OPA также не обязателен в первом релизе. Он оправдан, когда правила доступа
используются несколькими сервисами и обычного RBAC/ABAC в Admin API уже мало.

## 3. Границы доверия

1. `data.atlas-system.io` является внешним источником, но не единственным
   источником финансовой истины.
2. On-chain события, receipts, token transfers и balance checkpoints собираются
   Atlas независимо через read-only RPC/indexer.
3. Финансовые итоги публикуются только после сверки внешнего набора с on-chain.
4. GA4 используется для маркетинга и воронки, но не для финансового ledger.
5. Dune используется только как независимый публичный контрольный срез. Он не
   является каноническим источником и не вызывается напрямую из frontend.
6. Ручные корректировки не изменяют raw-данные и проходят правило четырёх глаз.

## 4. Защита канала `data.atlas-system.io`

- server-to-server доступ; браузерный CORS не считается защитой;
- отдельная read-only machine identity;
- OAuth 2.0 Client Credentials или mTLS; предпочтительно mTLS плюс короткоживущий
  OAuth token;
- allowlist исходящих IP Atlas, если инфраструктура поставщика это поддерживает;
- TLS 1.3, проверка сертификата и запрет downgrade;
- подпись webhook-сообщений, timestamp и nonce, если используется push-модель;
- cursor/sequence, стабильные IDs и идемпотентное повторное получение;
- лимиты размера ответа, времени запроса, частоты и числа повторов;
- секреты только в secret manager, с ротацией и без попадания в Git/GitHub Actions logs.

## 5. Проверка и хранение данных

- каждое получение получает `source_batch_id`, время, cursor, schema version,
  record count и SHA-256 содержимого;
- исходный payload сохраняется неизменяемым до нормализации;
- dataset публикуется атомарно только после получения всех страниц и сверки
  количества записей, sequence и hash;
- неизвестная версия схемы или нарушение обязательной проверки отправляет batch
  в quarantine и не обновляет финансовые витрины;
- денежные суммы принимаются как integer minimal units плюс token decimals;
  float запрещён;
- уникальность on-chain события: `chain_id + tx_hash + log_index`;
- отдельно хранятся `event_at`, `created_at`, `updated_at` и ingestion time в UTC;
- correction/reversal не перезаписывает историю, а создаёт новую запись-событие;
- dbt tests проверяют unique, not null, relationships, accepted values,
  арифметические инварианты и баланс ledger с on-chain checkpoint;
- каждый KPI возвращает freshness, partial, source status, upstream cursor,
  source schema version, ingestion watermark, formula/model commit, ruleset
  version, as-of block и reconciliation status.

При задержке, несовместимой схеме или ошибке сверки интерфейс показывает `N/A`,
`данные задерживаются` или `требуется проверка`. Последнее успешное значение нельзя
молча выдавать как текущее, а отсутствие записи нельзя заменять нулём.

## 6. Доступ к админке

Минимальные роли: Owner, Finance Admin, Analyst, Marketing, Support, Auditor и
Read-only. Backend проверяет разрешение для каждого endpoint и каждого поля.

- WebAuthn/passkey или TOTP MFA для всех административных пользователей;
- OAuth Authorization Code + PKCE через BFF; access/refresh tokens не хранятся
  в browser localStorage, сессия использует Secure, HttpOnly, SameSite cookies;
- короткая сессия и step-up authentication для полного wallet, экспорта,
  корректировки, смены формул и ролей;
- кошельки и email маскируются по умолчанию;
- полные адреса не попадают в URL, telemetry или обычные application logs;
- login, поиск участника, раскрытие адреса, экспорт, note, adjustment и approval
  записываются в append-only audit log;
- экспорты создаются асинхронно, шифруются, имеют TTL и журнал скачивания;
- CSV-значения защищаются от spreadsheet formula injection;
- API имеет rate limit, query timeout, максимальный диапазон и cost budget;
- финансовые и персональные БД не публикуются в интернет;
- audit события hash-linked, периодически подписываются и копируются в отдельное
  WORM-хранилище вне административного домена приложения.

## 7. Порядок реализации

### Gate 0. Договор данных и методология

Получить sandbox, обезличенные примеры, ODCS/OpenAPI-схемы, адресный реестр,
ABI/rulesets, правила finality, correction/reversal и контрольные суммы. Утвердить
владельца каждой метрики и допустимую задержку.

**Результат:** воспроизводимый контракт данных и набор acceptance fixtures.

### Gate 1. Data foundation

Развернуть приватные PostgreSQL и object storage, ingest connector, raw store,
schema validation, quarantine, backfill и независимый on-chain indexer.

**Результат:** данные загружаются повторяемо, без UI и финансовых обещаний.

### Gate 2. Сверка и расчётное ядро

Реализовать canonical cycles/claims/transfers, payout graph, три денежных
периметра, dbt-тесты, ledger roll-forward и reconciliation exception queue.

**Результат:** любой итог раскрывается до source event и tx hash.

### Gate 3. Первый read-only релиз

Первым подключить Reconciliation и balance roll-forward, затем Flows, Liquidity,
Cycles и Claims. Forecast и executive Overview включаются после доказанной сверки
и достаточной истории claim delay. Все остальные экраны остаются явно помеченными
как demo или недоступными.

**Результат:** управленческая панель без изменений исходных данных.

### Gate 4. Участники, компания и маркетинг

Добавить поиск участника, первую линию, KPI/notes, Head Account, Company Revenue,
GA4 и campaign cohorts с отдельными правами доступа.

### Gate 5. Управляющие действия

После security review добавить alerts, exports и manual adjustments с maker/checker,
полным audit trail и rollback через компенсирующую запись.

## 8. Критерии допуска к production

- 30 последовательных дней или согласованное окно сверки без необъяснённого
  финансового расхождения выше минимальной единицы токена;
- backfill повторяется с тем же результатом;
- reorg, duplicate, delayed event, correction и provider outage протестированы;
- IDOR/RBAC, export leakage, injection, SSRF, rate-limit и session tests пройдены;
- восстановление encrypted backup проверено на отдельном окружении;
- stale/partial/error состояния проверены на всех финансовых карточках;
- формулы подписаны владельцем продукта и Finance;
- перед запуском выполнен независимый security review.

## 9. Что не делать

- не подключать production frontend напрямую к внешнему API;
- не считать `data.atlas-system.io` единственным источником финансовой истины;
- не смешивать payout contract, Atlas consolidated и company treasury;
- не выполнять финансовую математику во frontend;
- не использовать mock/localStorage fallback на production-маршруте;
- не давать Superset прямой доступ к raw production tables;
- не открывать ClickHouse/PostgreSQL/MinIO наружу;
- не называть систему готовой по факту успешной сборки или красивого графика.
