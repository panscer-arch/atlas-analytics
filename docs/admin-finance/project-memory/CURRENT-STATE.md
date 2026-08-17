# Current State

Обновлено: 17.08.2026. Статус: `MVP-1 STAGING DEPLOYED · INTERNAL ALPHA PARTIAL`.

## Git reconciliation 2026-08-16

- подтверждённая Admin Finance цепочка перенесена поверх свежего
  `origin/main` в чистую ветку `codex/admin-finance-r1-1-20260816`;
- основное грязное рабочее дерево с Hermes, Products и маркетингом не
  изменялось;
- конфликт Vite разрешён с сохранением новых Content API routes и
  выделенной Admin Finance entry point;
- `npm run test:admin-finance`, dedicated staging build и проверка её
  изоляции прошли; production dependency audit не нашёл
  известных vulnerabilities;
- пять MVP-вкладок получили понятную русскую операционную терминологию без
  изменения API-полей и расчётов; Forecast в интерфейсе называется календарём
  будущих обязательств, а Claims — заявками и выплатами;
- выделена отдельная API-only точка входа Internal Alpha: staging bundle
  содержит только пять MVP-вкладок и не включает full-product routes,
  демонстрационные финансовые наборы, CSV export или write actions;
- верхний уровень MVP фиксирует block number + block hash на время открытой
  страницы; переходы между пятью вкладками выполняются без reload, а каждый
  API-запрос передаёт тот же snapshot pin. При смене snapshot сервер отвечает
  `409 snapshot_changed`, поэтому смешанный финансовый экран не рендерится;
- Liquidity и Reconciliation больше не падают на частичном ответе источника:
  отсутствующие balances/dataCoverage отображаются как явный пробел данных;
  локальная browser QA API-режима прошла на пяти вкладках и mobile без console
  errors и горизонтального overflow;
- в ветку перенесены точный Hostinger migration snapshot и изолированный
  Nginx vhost для временного `:8443`.

## Staging update 2026-08-15

- закрытый read-only Internal Alpha доступен по
  `https://finance-staging.atlas-system.xyz` за временным server-side Basic
  Auth;
- релиз `20260815T142737` развёрнут как immutable release в
  `/opt/atlas-admin-finance-staging/releases/20260815T142737`;
- наружу опубликован только HTTPS reverse proxy, Admin API не имеет публичного
  host port, а write methods отклоняются;
- пять MVP-вкладок и Methodology проверены на desktop/mobile; `/admin/overview`
  после входа переводит на `/admin/flows`, длинные периоды и фильтры циклов
  работают без page overflow и application console errors;
- данные остаются `PARTIAL / UNRECONCILED`, Claims не подменяет отсутствующий
  off-chain lifecycle нулями или fixture;
- production Support/Chatwoot не менялись и не перезапускались;
- Basic Auth является временной границей Internal Alpha, а не production MFA,
  RBAC или per-user audit.
- R1.1 Forecast runtime подключён к authenticated Alpha API через отдельный
  opt-in Compose overlay. Базовый staging оставляет его выключенным; без
  PostgreSQL, trusted CA и verified provider payload endpoint отвечает fail
  closed и Forecast не входит в MVP-навигацию.
- Forecast UI теперь согласован с runtime-контрактом: API mode запрашивает
  `committed` и подписывает значения как подтверждённые обязательства, а
  static-only design demo остаётся `stress / maximum exposure`. Base/P50/P90
  по-прежнему не показываются до калибровки claim-delay и backtesting.

## Research update 2026-08-14

- `https://atlas-system.tech/` подтверждён как текущий официальный
  публичный домен; Hermes official catalog пересобран с него;
- Level-страница от 12.08.2026 подтвердила таблицу Start-Executive,
  compression difference, Matching Reward, snapshot ставки при создании
  цикла, Lockup 100% at creation и Daily 20%/80% за 200 дней;
- добавлены qualification weights: Daily × 0.5 и глубина 1–5 × 1.0,
  6–10 × 0.5, 11+ × 0.1;
- текущая `ATLAS_PARTNER_STATUS_TABLE` совпадает с публично индексируемой
  таблицей Atlas;
- конфликтующий редакционный черновик Hermes с повышенными порогами и статусом
  `Architect` не принят как LIVE source of truth;
- источник и формулы закреплены в
  `spec/09-PARTNER-RULESET-SOURCE-AUDIT.md`;
- для LIVE Head Account остаются нужны публичный wallet address и Atlas ID;
- API, forecast input, demo ledger, OpenAPI и UI переведены на
  `creation` + `streamed`; legacy `at_claim` принимается только в
  клиентском transition adapter и нормализуется до валидации.
- Forecast получил интерактивный календарь обязательств: DEMO даёт
  31 дневной bucket с разбивкой по циклам, Principal, Delta,
  Partner creation/streamed, reserve и funding gap. API-периоды длиннее
  24 часов отображаются как period и не размазываются по дням.
- Forecast получил локальный план пополнения резерва: последовательные
  funding-gap bucket объединяются в эпизоды, рассчитываются первая дата
  нарушения, пиковый gap, минимальная сумма пополнения и контрольные точки
  D−7 / D−3 / D−1. В demo показан breach 14.09.2026 на $4,641; policy buffer
  остаётся `N/A`, а Telegram/email явно помечены как неподключённые.
- Для резервного плана добавлен server contract доставки: canonical PostgreSQL
  хранит reserve alert, transactional notification outbox и append-only
  provider attempts. Idempotency key связывает forecast snapshot, alert,
  checkpoint и канал; повторное использование ключа с другим payload hash
  отклоняется как equivocation. Demo API read-only отдаёт `/alerts` и
  `/alerts/{alertId}/deliveries`; реального sender runtime пока нет.
- Добавлен тестируемый notification runtime: PostgreSQL repository вызывает
  атомарные lease/complete функции, worker поддерживает `SKIP LOCKED`, lease
  expiry, deterministic provider request key, retryable-only exponential
  backoff, max attempts и разделяет provider acceptance от journal commit.
  Channel adapters, scheduler и secret resolver в окружении не настроены.
- Добавлены shadow adapters и overlap-safe scheduler. Shadow-режим не делает
  сетевых запросов, журналирует только хэши recipient/payload и запускается
  лишь явным вызовом `start()`. Staging Compose принудительно держит notifications
  disabled и не содержит provider secrets; live mode кодом отклоняется.
- Подготовлен, но не применён staging migration manifest: он фиксирует SHA-256,
  размер и 47 таблиц канонического DDL, требует backup и отдельный restore drill.
  Manifest не включает notification runtime автоматически после миграции.

## Что существует

- 14 React-маршрутов и единый responsive shell;
- в static-only полном продукте Head Account дополнен demo-реестром стабильных
  номеров личных веток, compression gap и переходами near/matched; Participants
  принимает точный номер ветки. API-ТЗ закрепляет неизменяемость номера и
  доказуемые уведомления, но живой referral источник не подключён;
- работающий release scope `mvp`: пять продуктовых вкладок, служебная Methodology
  и блокировка остальных маршрутов;
- отдельный `alpha` Admin API без fallback на demo;
- пять MVP-вкладок Reconciliation, Flows, Liquidity, Cycles и Claims работают
  в API mode на одном pinned versioned on-chain snapshot в рамках открытой
  страницы; номер блока и hash проверяются сервером;
- Cycles разделяет all-time created/open/closed, claimable now и
  source-reported maximum exposure на 7/30 дней; эти load aggregates не
  выдаются за cash-out forecast;
- server-to-server adapter с HTTPS host/path allowlist, controlled-address
  registry, timeout, response-size limit, schema/chain/token validation и
  независимой BSC finality-проверкой;
- signed atomic money поддерживает отрицательный Net Flow без потери знака;
- Liquidity читает historical `balanceOf` на том же блоке, когда RPC хранит
  state; если archive state недоступен, показывает только `REPORTED ·
  UNVERIFIED`, а canonical balance/residual остаются `N/A`;
- Reconciliation показывает immutable checkpoint и реальные source gaps, а не
  demo exceptions;
- Reconciliation показывает API-backed матрицу покрытия семи финансовых
  доменов: потоки, ликвидность, циклы, claims, payout forecast, независимый
  ledger и доход компании. Для каждого пробела видны затронутые вкладки,
  Gate 0, владелец и следующее действие; недоступные данные остаются `N/A`;
- canonical OpenAPI draft, PostgreSQL DDL, golden fixtures и проверки;
- зафиксирован machine-readable R1.1 forecast input contract: finalized
  checkpoint, independently verified opening liquidity, approved reserve и
  forecast policies, непрерывные maturity buckets и разложение Gross. Серверный
  валидатор привязывает snapshot к BNB Smart Chain и сам строит cash ladder;
  он отклоняет неверную сеть, двойной Platform Fee,
  несходящиеся компоненты, разрывы времени и inflow без evidence;
- реализован отдельный server-to-server forecast source adapter: точный HTTPS
  host/path allowlist, server-only Authorization, запрет redirect/cookies,
  timeout и body limit, quarantine validation, freshness/chain/token/finality
  policy, local cache и защита от rollback/equivocation в рамках процесса;
- R1.1 теперь обязательно содержит payout contract address; независимый
  evidence verifier сам сверяет через allowlisted BSC RPC block hash,
  confirmations и исторический `USDT.balanceOf` на том же block tag;
- в canonical DDL добавлены общий Forecast watermark, append-only identity
  registry и атомарная PostgreSQL guard-функция с per-source transaction lock;
- добавлена выключенная по умолчанию runtime-композиция provider quarantine +
  independent RPC + PostgreSQL guard; секреты и TLS CA остаются server-only;
- Alpha API поддерживает два явных auth mode: локальный `session` и staging
  `proxy`. Proxy mode требует внутренний shared secret, валидную OIDC email
  identity и точное членство в Finance-группе; старый cookie его не обходит;
- подготовлен staging stack из unprivileged web, read-only API и
  `oauth2-proxy v7.15.2`; наружу публикуется только loopback web port, demo и
  Forecast в сборку MVP не включаются;
- staging frontend вынесен в отдельную entry point и production-сборку
  `admin-finance.html`: старый SuperSUS `AccessGate`, Content API и общий
  analytics bundle в путь Admin Finance не входят; Nginx fallback и container
  build проверяют именно эту сборку;
- fail-closed production mode: fixtures не включаются автоматически;
- рабочий публичный read-only on-chain snapshot
  `https://supersussystem.com/api/contracts/atlas-flows`;
- публичные источники возвращают актуальный block cut, события, cycle/load
  aggregates и текущие balances; Admin API нормализует их как `PARTIAL`, но
  полный ledger reconciliation ещё не выполнен;
- `data.atlas-system.io` доступен, но документация закрыта Basic Auth, а
  versioned provider contract и credentials проекту пока не переданы.
- экран резервного плана пока не отправляет Telegram/email и не подтверждает
  фактическое пополнение; durable schema и idempotency contract готовы, но для
  LIVE нужны provider-backed forecast snapshot, PostgreSQL runtime migration,
  RBAC, реальные channel adapters/scheduler, секреты получателей и проверенный
  audit trail исполнения.

## Что не является готовым

- `demo` режим сохранён только для локального дизайн-прототипа и тестов;
- production data pipeline и PostgreSQL projections не подключены;
- production OIDC/BFF, RBAC, audit и backup/restore для новой админки не
  развёрнуты; proxy-auth код и package готовы, но реальный issuer/client ещё не
  подключён;
- адреса Atlas-контрактов уже предоставлены пользователем и зафиксированы в
  machine-readable controlled-address registry; повторно запрашивать их не
  требуется;
- кандидат controlled-address registry собран из официального PDF, публичного
  provider, AuditV5 и независимого чтения BNB Chain на block `114407352`; все
  пять контрактов содержат runtime code, параметры owner/treasury/fee/tokenId
  сверены, права четырёх контрактов на общий LP-NFT подтверждены. Техническое
  подтверждение адресов завершено; открыто только формальное утверждение
  точного staging-периметра и lifecycle cutover Daily V1/V2;
- официальный PDF от 22.07.2026 содержит прежнего owner Daily Flow, тогда как
  on-chain owner уже Atlas SAFE 2-of-3; дрейф конфигурации зафиксирован как
  наблюдаемый и должен контролироваться по block-tagged snapshot;
- PDF называет Daily V2 текущим пользовательским контрактом, но provider
  помечает его `pending-activation`, on-chain `nextOrderId=0`, а Daily V1
  содержит 216 исторических orders на evidence block. До утверждения activation
  block V1/V2 остаются раздельными временными периметрами;
- AuditV5 содержит исходники, ABI и спецификацию, но не deployment registry;
  Pancake Factory/Position Manager/Pool отделены от Atlas controlled perimeter;
- публичный Dune dashboard/query IDs по названию и адресам не обнаружены в
  репозитории или открытом поиске; до передачи ссылки/API policy Dune остаётся
  неподключённым независимым контролем;
- нет archive-capable RPC с подтверждённым SLA; публичный RPC может не вернуть
  historical state, поэтому liquidity автоматически понижается до
  `REPORTED · UNVERIFIED`;
- Claims не содержит off-chain lifecycle и честно возвращает пустой partial
  dataset;
- provider передаёт агрегаты нагрузки на 7/30 дней, но не передаёт
  точные maturity bucket dates и состав Principal / Gross Delta / Partner
  Reward, поэтому полный cash ladder и funding gap остаются `N/A`;
- forecast input contract, source adapter, independent RPC verifier и runtime
  подключены к Alpha API через выключенный по умолчанию overlay и пока
  проверены только на golden fixture/fake transport и negative tests: реальный
  provider payload, credential, RPC и утверждённые policies не получены;
- PostgreSQL checkpoint guard и repository подключены в выключенной Forecast
  runtime-композиции, но DDL не применена и multi-replica race не проверен в
  staging; активный Alpha API этот runtime пока не использует;
- referral tree/status history, Company Revenue и Head Account live API
  отсутствуют; новый branch/compression контур остаётся только DEMO + contract;
- Company Revenue static-only экран содержит отдельный `PLAN · DEMO`
  динамический контроль минимального роста входящего потока на 40% MoM:
  target/pace/gap/required daily pace. Редактируемый черновик сохраняется
  только в browser localStorage и восстанавливается после reload;
- Company Revenue также содержит предоставленный операционный сценарий
  `growth-plan-2026.08-v2`: около 50% MoM, 5% планового дохода платформы,
  целевые новые кошельки и циклы за месяц/день, график масштаба и годовые
  итоги. Минимальная политика +40% сохранена в динамическом контроле; обе
  модели явно помечены как PLAN, а не фактические данные;
- Company Revenue static-only экран показывает отдельный `Partner Capture Rate`
  с целевым ориентиром 35%: Head Account referral receipts делятся на Gross
  Partner Rewards, фактически выплаченные сети. Platform Fee исключён. Сейчас
  это явно помеченный DEMO; transfer-level referral source не подключён;
- Company Revenue получил общий control bridge: Incoming Flow, Platform Fee,
  Head Account Income, Company Revenue, target 4%, gap и денежный
  surplus/shortfall. Расчёт вынесен в тестируемый модуль; UI явно маркирует
  показатель как same-period cash indicator, а не cohort take rate или чистую
  прибыль. Canonical API/OpenAPI теперь содержат единый read-only
  `GET /finance/company-economics` с atomic aggregate и непрерывными bucket-ами,
  append-only DDL projection и строгой арифметической проверкой. Full API UI
  показывает provenance и `PARTIAL/N/A` без demo fallback, а также дневной
  stacked-график Fee Delta / Fee Partner / Head creation / Head claim, линию
  Company Revenue Rate и таблицу Incoming / Revenue / gap к target для каждого
  UTC bucket. Добавлен транзакционный реестр на строгих read-only
  `/finance/platform-fees` и `/finance/company-receipts`: allocation отделён от
  фактического receipt, видны source/receipt tx, Gross, rate, block/log,
  finality и reconciliation без персональных wallet-адресов. Это пока demo API:
  production provider, применённая миграция и reconciled cut отсутствуют;
- canonical API/OpenAPI получили read-only `GET /finance/partner-economics`:
  atomic numerator/denominator, creation/claim split, daily series, target и gap.
  Клиент проверяет суммы, непрерывность bucket-ов и basis-points arithmetic;
  Full API UI показывает provenance и `PARTIAL/N/A` без demo fallback. Demo
  fixture проходит этот путь, но production provider ещё не передан;
- Partner Capture синхронизирован между Company Revenue, Head Account и
  Risks через общий client-side расчёт. MVP policy: target 35%, warning
  33–34.99%, critical ниже 33%, два finalized-среза для alert/recovery.
  Пока это DEMO policy без external data provider и без production alert engine;
- Risks получил локальный Partner Capture what-if с пресетами 32/34/35%,
  severity, gap и shortfall. Он не меняет факт и не пишет в API. Head
  Account получил три browser-local notification preference: warning,
  critical и recovered. Production delivery/preferences ещё не реализованы;
- Risks дополнен browser-local Partner Capture journal. Он хранит до 12
  finalized DEMO-срезов, до 20 lifecycle events, owner/SLA и acknowledgement;
  alert открывается и закрывается после двух срезов. Reload persistence
  проверено, но это не server audit log и не production alert engine;
- активный Partner Capture alert включён в общую локальную очередь Risk Center;
  очередь фильтруется по owner и SLA, а подтверждения прочих UI-only сигналов
  сохраняются после reload с allowlist-проверкой ID. Partner Capture
  acknowledgement остаётся единым с профильным lifecycle journal. Всё это
  browser-local DEMO, не серверная диспетчеризация рисков;
- demo API и OpenAPI получили read-only `GET /management/growth-plan` со
  строгой 12-месячной схемой, атомарными суммами, версией и состоянием
  `proposed`. `POST` запрещён, а DDL содержит append-only version/month tables.
  Full UI умеет читать этот контракт в API mode: показывает provenance и
  статус версии, а фактические Platform Fee, Head Account и cash receipts
  скрывает как `N/A` до отдельного API. Контракт пока не подключён к Alpha API,
  ledger или production approval и не является фактом бухгалтерии;
- 8 экранов остаются static-only;
- Gate 0 не закрыт;
- Internal Alpha staging развёрнут и проверен, но production release не
  выполнялся и не разрешён;
- staging работает на текущем публичном read-only provider и RPC с явным
  статусом `PARTIAL`; OIDC/MFA, approved address registry и archive-capable RPC
  с SLA ещё не подключены.
- подготовлен fail-closed PostgreSQL restore-drill runner: TLS `verify-full`,
  отдельная пустая restore-БД, custom backup, archive inspection и сверка
  user-table count. Source SQL apply запрещён: `001` зафиксирован как
  baseline, а не delta. Runner протестирован на fake process adapter, но фактический
  drill не запускался: на Mac отсутствуют `psql`, `pg_dump`, `pg_restore` и
  нет staging DB credentials/CA.

Локально MVP scope проверен Playwright на desktop/mobile: пять вкладок получают
HTTP 200 от Alpha API, demo claims отсутствуют, console errors и page overflow
не найдены, экспорт и write actions скрыты. Скриншоты находятся в
`artifacts/admin-finance-alpha`. Это проверка локального Internal Alpha, а не
production deployment.

После добавления candidate address registry выполнен отдельный live read-only
smoke: Alpha readiness и `/meta` вернули HTTP 200, provider snapshot был
независимо подтверждён на BSC block `114408542` с 36 confirmations. Проверка
подтверждает работоспособность allowlist и fail-closed provider path, но не
закрывает G0-02 и не является staging/production deploy.

Отдельная staging entry point дополнительно проверена на desktop/mobile при
недоступном API: `/admin/reconciliation` открывает пять MVP-пунктов, не содержит
старый password gateway, не имеет page overflow и fail closed без demo. Smoke
screenshots находятся в `artifacts/admin-finance-staging`.

Локальная сборка от 16.08.2026 дополнительно имеет bundle regression gate:
отложенные full-product routes, demo-маркеры, CSV filenames, export labels и
write-action selectors считаются ошибкой сборки. Эти изменения пока находятся
в draft PR и не развёрнуты на Hostinger/staging.

## Текущий рабочий этап

Зафиксировать воспроизводимый `MVP-1 Internal Alpha` и перейти к `R1.1 Data
Foundation`:

1. связать immutable staging release с проверенным Git commit/tag;
2. применить baseline DDL только в новой изолированной staging PostgreSQL;
3. выполнить custom-format backup и полный restore drill в отдельную пустую БД;
4. подключить forecast runtime в shadow/read-only режиме без Telegram/email;
5. получить sandbox payload точных maturity buckets и независимо сверить не
   менее 10 позиций до event/receipt/transfer;
6. заменить временный общий Basic Auth на индивидуальный OIDC/MFA/RBAC до
   расширения доступа.

## Следующий конкретный результат

В изолированной staging PostgreSQL baseline schema проходит реальный
backup/restore drill, а Forecast runtime получает проверенный provider payload,
сохраняет checkpoint с rollback/equivocation guard и остаётся read-only. До
этого Forecast не входит в release scope, уведомления выключены, а production
остаётся `NO-GO`.

Параллельный data-contract результат для R1.1: владелец источника передаёт
точные maturity buckets, состав Principal / Gross Delta / Partner Reward,
claims lifecycle и reserve policy. После контрактной проверки эти четыре входа
включают последовательный cash ladder, а не приблизительный график из
7/30-дневных агрегатов.

Форма контракта, Atlas-side arithmetic, изолированный source adapter,
independent RPC verifier, SQL guard и отключённая runtime-композиция уже
реализованы. Следующий шаг — применить DDL в изолированной staging PostgreSQL,
получить sandbox payload/credential от владельца данных и независимо сверить
минимум 10 полностью трассируемых bucket items до event/receipt/transfer. До
этого `/forecast` остаётся закрытым в release scope `mvp`.
