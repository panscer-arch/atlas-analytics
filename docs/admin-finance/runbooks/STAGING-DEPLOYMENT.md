# Internal Alpha Staging Deployment

Статус: `PARTIAL_AUTHENTICATED`. Read-only Internal Alpha доступен через
HTTPS и временный server-side Basic Auth. Это не production login: MFA, RBAC и
индивидуальные аккаунты остаются обязательными перед production.

## Migration snapshot 2026-08-16

- temporary hostname: `https://finance-staging.atlas-system.xyz:8443`;
- host: `200.141.9.121`, application bind remains loopback-only on
  `127.0.0.1:8088`;
- release:
  `20260815T155500-8a62b495c3fc305f659c9d92aafff12aaba27ea6`;
- server path:
  `/opt/atlas-admin-finance-staging/releases/20260815T155500-8a62b495c3fc305f659c9d92aafff12aaba27ea6`;
- API image:
  `sha256:12a8648600e893edc6c4d817189431e9211152515a8884618ae6dd179d6c1ba0`;
- web image:
  `sha256:924b105a6a20e5ce5d9b92ecefe13fbea9654644fa050a5378be6e5495d55ab8`;
- API container is healthy; internal readiness returns `200`, source status
  `partial`, BSC block `116225941`;
- authoritative Dynadot DNS, Google Public DNS and Cloudflare DNS return
  `200.141.9.121` for `finance-staging.atlas-system.xyz`;
- public TLS on `8443` validates successfully and an unauthenticated request to
  `/admin/overview` returns `401` with the expected security headers;
- authenticated external smoke tests return `200` for all five MVP routes
  (`reconciliation`, `flows`, `liquidity`, `cycles`, `claims`) and
  `methodology`; API readiness returns `200`, and a POST to the readiness
  endpoint returns `403`;
- the existing server-side Basic Auth file was copied without changing its
  credentials and its checksum was verified during migration. The temporary
  smoke-test account was removed and the original file was restored byte for
  byte. A fresh owner/browser acceptance on the new host is still required;
- the host's existing Cloudflare-only policy for ports `80/443` was preserved
  because other projects share this VPS. Standard `:443` remains blocked for
  direct non-Cloudflare traffic, so `8443` is a temporary isolated staging
  endpoint, not the final public URL;
- no existing Nginx virtual host, Cloudflare-origin rule or neighboring Docker
  project was removed or restarted.

This migration snapshot is `PARTIAL_AUTHENTICATED`, not `LIVE`. Standard HTTPS
on `443`, owner UAT, controlled address approval, reconciliation and
production-grade MFA/RBAC remain release gates.

## Deployment snapshot 2026-08-15

- hostname: `https://finance-staging.atlas-system.xyz`;
- release: `20260815T142737`;
- server path: `/opt/atlas-admin-finance-staging/releases/20260815T142737`;
- API image: `sha256:8ca414c483158eb2caf48a4bc3bfdaa06db0192901db07d56357c3598e08dfab`;
- web image: `sha256:d6752bbcf544858b8c8d0a5b49911060c79f8a6d9f02d90f0a69c11d2af7cc8a`;
- authenticated readiness `200`, source status `partial`, BSC block
  `116095873`;
- unauthenticated requests to both `/admin/overview` and `/admin/flows` return
  `401`; after authentication `/admin/overview` redirects client-side to the
  first available MVP screen `/admin/flows`; API POST returns `403`;
- automated browser QA passed all six available routes (five MVP screens plus
  Methodology), all Flows periods, cycle filters and claims controls on desktop
  and `390x844` mobile viewport without horizontal page overflow or application
  console errors;
- authoritative Dynadot DNS and public resolvers return `145.223.90.93`;
- production Support/Chatwoot Compose was not changed or restarted.

This snapshot is not `LIVE` and is not independent owner acceptance. Финансовые данные остаются
`alpha / partial`; публикация production требует explicit owner approval
`controlled-address-registry.v1.json`, reconciliation и production-grade MFA/RBAC.

## Состав

- `web`: unprivileged Nginx со сборкой `api + mvp`;
- `api`: read-only Alpha API и on-chain provider;
- внешний HTTPS reverse proxy хоста: TLS termination, server-side Basic Auth и
  передача только на `127.0.0.1:8088`.

API не публикует host port. Внешний proxy удаляет входящие `Authorization` и
`Cookie`; внутренний web proxy добавляет отдельный случайный session secret,
который не передаётся браузеру и хранится только в root-readable runtime env.

Web image собирается из выделенной entry point `admin-finance.html`. Общий
`index.html`, старый SuperSUS password gateway и Content API в staging bundle не
входят. Container build завершается ошибкой, если проверка этого разделения не
проходит.

## До запуска

1. Утвердить staging hostname и оператора временного общего входа.
2. Сгенерировать отдельные Basic Auth password, API session token и cursor
   secret. В Git и shell output значения не попадают; password-файл после
   передачи оператору удаляется.
3. Утвердить controlled contract addresses и archive-capable BSC RPC host.
4. Настроить внешний HTTPS reverse proxy, который перезаписывает клиентские
   `X-Forwarded-*` заголовки и обращается только к loopback-порту staging.

Переменные перечислены в
`deploy/admin-finance-staging/.env.example`. Заполненный файл в репозиторий не
добавляется.

## Preflight

```bash
npm run test:admin-finance
npm run build:admin-finance-staging
npm run test:admin-finance-staging-build
docker compose \
  --env-file /run/secrets/atlas-admin-finance-staging.env \
  -f deploy/admin-finance-staging/compose.yaml \
  config
```

`config` обязан завершиться ошибкой при отсутствии любого обязательного
секрета. В итоговом выводе нельзя сохранять раскрытые значения.

## Запуск

```bash
docker compose \
  --env-file /run/secrets/atlas-admin-finance-staging.env \
  -f deploy/admin-finance-staging/compose.yaml \
  up -d --build
```

До внешнего HTTPS контейнер доступен только на `127.0.0.1:8088` и не считается
пользовательским staging URL.

## Acceptance

1. Без Basic Auth `/admin/reconciliation` получает `401` и password prompt.
2. Неверный логин или пароль получает `401`.
3. Прямой cookie старого локального gateway не открывает API.
4. Пять MVP-вкладок получают HTTP 200 после входа.
5. Claims остаётся пустым `PARTIAL`, а отсутствующие показатели показываются
   как `N/A`, не как ноль.
6. Все вкладки используют один block number/hash и показывают freshness.
7. При stale/invalid RPC readiness становится unhealthy, но demo не появляется.
8. Write actions недоступны; claims/exports сохраняют заявленный release scope.
9. Desktop/mobile UAT не показывает overflow или console errors.
10. Зафиксирован результат GO/NO-GO с URL, block cut и временем проверки.
11. В JavaScript staging отсутствуют пароль и старый SuperSUS `AccessGate`;
    `/admin/*` использует fallback `admin-finance.html`.

## Откат

Остановить новый staging stack и вернуть внешний reverse proxy на предыдущий
upstream. Production `.space`, кабинет и Support/Chatwoot этим stack не
изменяются. Данные пользователя и финансовые записи этот read-only Alpha не
редактирует.

## Не закрыто

- независимая owner acceptance ещё не проведена; самостоятельный automated
  desktop/mobile QA выполнен 2026-08-15;
- controlled address registry ожидает explicit owner approval;
- Basic Auth является временным Internal Alpha входом без MFA, индивидуального
  RBAC и per-user audit trail; перед production он подлежит замене;
- PostgreSQL Forecast migration/restore относятся к R1.1 и не блокируют запуск
  текущего read-only MVP из пяти вкладок Internal Alpha; notification worker
  также не входит в текущий stack;
- `ATLAS_ADMIN_FINANCE_NOTIFICATIONS_ENABLED` зафиксирован в Compose как
  `false`. Shadow runtime, scheduler и outbox должны запускаться отдельным
  сервисом только после PostgreSQL migration + restore drill. Provider tokens
  Telegram/email в текущий staging `.env` не добавляются.

## Migration package

`deploy/admin-finance-staging/migrations/manifest.v1.json` фиксирует SHA-256,
размер и ожидаемое число таблиц канонического DDL. Manifest имеет статус
`prepared_not_applied`; это не доказательство миграции.
Файл является baseline-схемой, а не delta-миграцией. Прямое применение к
существующей source-БД явно запрещено manifest и runner. Для этого нужна
отдельная versioned delta после schema diff.

### Restore drill preflight

На закрытом staging-host должны быть установлены PostgreSQL 16 client tools:
`psql`, `pg_dump`, `pg_restore`. В secret manager передаются:

- `ATLAS_ADMIN_FINANCE_DATABASE_URL` с dedicated read/backup role;
- `ATLAS_ADMIN_FINANCE_RESTORE_DATABASE_URL` с dedicated restore role;
- `ATLAS_ADMIN_FINANCE_DATABASE_CA_FILE` с абсолютным путём к trusted CA;
- `ATLAS_ADMIN_FINANCE_BACKUP_PATH` с новым абсолютным `.dump` path.

Сначала выполняется dry preflight:

```bash
npm run admin-finance:db-restore-preflight
```

Он проверяет checksum baseline, инструменты, CA, новый backup path,
различие source/restore и защитное имя restore-БД. Пароли и host в отчёт
не выводятся. После ручной сверки плана запускается только restore drill:

```bash
npm run admin-finance:db-restore-preflight -- --execute-restore-drill
```

Runner не выполняет SQL на source. Он снимает custom-format backup,
проверяет archive list, требует нуль user tables в restore-БД, восстанавливает
архив и сверяет число user tables. Любая ошибка останавливает цепочку.

Перед применением обязательны custom-format `pg_dump`, проверка архива через
`pg_restore --list`, отдельная restore-база и сверка схемы/47 таблиц после
восстановления. Notification runtime остаётся disabled даже после успешной
миграции до отдельного channel security review.

## R1.1 Forecast runtime

Forecast API подключён к Alpha server, но в базовом Compose остаётся выключен
и работает fail closed. Он включается только явным overlay после PostgreSQL
restore drill и проверки provider contract:

```bash
docker compose \
  --env-file /run/secrets/atlas-admin-finance-staging.env \
  -f deploy/admin-finance-staging/compose.yaml \
  -f deploy/admin-finance-staging/compose.forecast.yaml \
  config
```

Overlay требует dedicated PostgreSQL URL, абсолютный host path к trusted CA,
allowlisted provider endpoint и server-only Authorization. Он не включает
Telegram/email и не публикует PostgreSQL или Admin API host ports. При
отсутствии любого значения Compose завершается до запуска.

После включения доступны authenticated read-only endpoints:

- `GET /api/admin/v1/forecast/snapshots/latest`;
- `GET /api/admin/v1/forecast/snapshots/{snapshotId}`;
- `GET /api/admin/v1/forecast/buckets`.

Ответы остаются `PARTIAL / UNRECONCILED`, пока минимум 10 bucket items не
прослежены до event, receipt и transfer evidence. Ошибка provider, RPC,
checkpoint guard или PostgreSQL возвращает `503`; fixture не подставляется.
