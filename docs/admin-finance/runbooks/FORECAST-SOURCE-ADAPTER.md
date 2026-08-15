# Forecast Source Adapter Runbook

Статус: локальный защитный контур реализован, к Alpha API не подключён.

## Назначение

Адаптер получает `atlas.forecast-input.v1` от `data.atlas-system.io`, держит
ответ в карантине памяти, проверяет контракт и только затем строит Atlas-side
cash ladder. Frontend не обращается к внешнему источнику и не получает его
учётные данные.

## Разрешённый канал

- только `GET https://data.atlas-system.io/api/v1/admin-finance/forecast-input`;
- точное совпадение HTTPS host и path, стандартный порт `443`;
- query, fragment, credentials в URL и redirects запрещены;
- `Authorization` передаётся только server-to-server;
- timeout по умолчанию `10 s`, максимум ответа `1 MiB`, cache `30 s`;
- cookies и browser credentials не отправляются;
- исходящий доступ сервиса ограничивается этим host на инфраструктурном уровне.

Basic Auth допустим только как временный sandbox-механизм. Для staging и
production целевой вариант — отдельная read-only machine identity с mTLS или
короткоживущим OAuth token.

## Секреты

- credential хранится в secret manager и подставляется серверу при запуске;
- credential, полный `Authorization`, provider payload и полные URL с
  параметрами не пишутся в логи;
- в Git, frontend bundle, screenshots, CI artifacts и error responses секрет
  не попадает;
- ротация выполняется сначала у provider, затем в secret manager, после чего
  проверяется один sandbox request и старый credential отзывается.

## Карантин и публикация

1. Получить ответ с запретом redirect и лимитами времени/размера.
2. Проверить HTTP status, JSON content type и синтаксис JSON.
3. Проверить строгую схему и все денежные инварианты контракта.
4. Проверить freshness, `chainId=56`, allowlisted USDT, payout contract и policy
   versions.
5. Через отдельный allowlisted BSC RPC сверить block number/hash, реальную
   глубину подтверждений и исторический `USDT.balanceOf(payoutContract)` на том
   же block tag.
6. Проверить отсутствие rollback/equivocation в PostgreSQL guard.
7. Построить cash ladder внутри Atlas и присвоить детерминированный snapshot ID.
8. Только валидированный immutable projection разрешено передать в staging
   persistence и затем в read-only Forecast API.

Любая ошибка оставляет новый пакет в состоянии rejected. Последнее успешное
значение нельзя молча выдавать как текущее: API и UI обязаны вернуть status
`STALE`/`UNAVAILABLE` и показать `N/A` для зависящих показателей.

## Защита от replay и rollback

Локальный адаптер не принимает:

- block number ниже уже принятого;
- другой block hash для того же block number;
- более раннее `generatedAt` на той же контрольной точке;
- повтор `sourceSnapshotId` с другим рассчитанным содержимым.

По умолчанию локальный adapter хранит watermark в памяти процесса. Каноническая
DDL уже содержит `forecast_source_watermarks`, неизменяемый реестр
`forecast_source_snapshot_ids` и атомарную функцию
`accept_forecast_source_checkpoint(...)` с transaction advisory lock на
источник. Repository и выключенная runtime-композиция уже используют эту
функцию. До staging необходимо применить DDL в изолированной PostgreSQL и
проверить restart/two-replica race. Без реально применённого и проверенного
persisted watermark Forecast endpoint не открывается.

## Наблюдаемость

Разрешены только обезличенные поля: adapter error code, HTTP status, latency,
body size, contract version, source snapshot ID, block number/hash, age,
projection ID и время приёма. Raw payload и authorization запрещены.

Alerts:

- auth failure или contract rejection — немедленно;
- stale/timeout/rate limit — после двух последовательных ошибок;
- rollback/equivocation — немедленно, Forecast блокируется до расследования;
- расхождение независимой on-chain сверки — немедленно, публикация запрещена.

## Gate к staging

- получен sandbox credential через secret manager;
- утверждены payout contract и отдельный archive-capable BSC RPC host;
- минимум 10 реальных bucket items трассируются до event/receipt/transfer;
- независимая BSC RPC-сверка подтверждает checkpoint и opening liquidity;
- PostgreSQL guard подключён и проверен на restart и двух параллельных replicas;
- negative tests, stale behavior и credential rotation пройдены;
- Forecast route остаётся скрытым до Finance UAT.

Проверка локального адаптера:

```bash
npm run test:admin-finance-forecast-source
npm run test:admin-finance-forecast-evidence
npm run test:admin-finance-forecast-runtime
```
