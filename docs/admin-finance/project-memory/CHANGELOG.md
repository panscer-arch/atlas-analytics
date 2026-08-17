# Project Memory Changelog

## 2026-08-17

- Создан отдельный free-tier dRPC ключ для read-only BNB history и настроен
  GitHub Actions secret `BSC_LOG_RPC_URLS` без сохранения значения в Git.
  Проверка показала, что endpoint читает старые canonical blocks, но
  нестабильно обслуживает `eth_getLogs` на коротких диапазонах и потому не
  пригоден для полного historical backfill. Изолированный backfill завершился
  fail closed: snapshot и checkpoint не были созданы, deployment не запускался.
- Secret gate усилен функциональным preflight до SSH: для каждого endpoint
  проверяются public DNS без redirects, BNB chain id, independently pinned
  canonical block hashes и точные historical logs всех трёх deployment-блоков.
  Пустой `eth_getLogs` отклоняется. Добавлены общий deadline, потоковое
  ограничение ответа, retry и негативные тесты; ошибки не содержат URL или
  token.
- SuperSUS Vault во время операции был недоступен, поэтому сохранение endpoint
  в Vault не подтверждено. Сервер, active release, Nginx, DNS и соседние
  проекты не изменялись; production остаётся `NO-GO`.
- Выполнен live read-only аудит Admin Finance VPS: подтверждены custom SSH
  `48222`, активный immutable release, loopback web `8088`, host Nginx `8443`
  и HTTP 200 на пяти внутренних `/admin/*` маршрутах. Соседние сервисы не
  изменялись.
- Зафиксирован fail-closed инцидент источника: Alpha readiness возвращает
  `503 source_unavailable`, потому что flow snapshot был старше 15 минут;
  balance registry оставался свежим. Лимит свежести не ослаблялся.
- Сверены hashes staging release с текущей веткой: source adapter, Compose и
  Nginx совпадают, но текущий `admin-finance-api.mjs` со строгим pin по block
  number/hash ещё не развёрнут.
- Повторно пройдены полный Admin Finance test suite, staging build, release
  boundary, staging package и удалённый Compose preflight. Обновление runtime
  не выполнялось; соседние проекты не перезапускались.
- Root cause stale snapshot воспроизведён локально: contract-state RPC работает,
  но legacy BscScan HTML transaction discovery получает `403`. Публичные BNB
  RPC из прежнего набора отключают или жёстко ограничивают `eth_getLogs`;
  freshness не ослаблялась. Официальный public NodeReal endpoint подтвердил
  доступ к старому deployment block и совместимость `eth_getLogs`, но при
  последовательном сканировании ушёл в timeout, поэтому production secret им
  не подменяется.
- На VPS загружен и собран отдельными image tags candidate release
  `20260817T111008Z-6576338934dc`. Symlink, runtime-контейнеры, Nginx, DNS и
  соседние Compose-проекты не менялись.
- Реализован новый server-only BNB history reader на `eth_getLogs`:
  bounded ranges, finalized head offset, Locked/Claimed topic filter, strict
  address/hash/index/topic validation, точные ABI topic/data word counts,
  deduplication и chain ordering. Каждый range закреплён за одним endpoint:
  boundary hash проверяется до и после запроса, а block hash каждого event
  сверяется с canonical header того же провайдера. Размер RPC response,
  количество logs/event blocks и общий checkpoint ограничены.
  Backfill идёт последовательно и сохраняет checkpoint после каждого
  подтверждённого диапазона; `null` RPC result не трактуется как пустая
  история. HTML BscScan больше не является источником flow history.
- GitHub workflow дополнен доставкой reader modules и fail-closed
  проверкой каждого URL в secret `BSC_LOG_RPC_URLS` общим runtime parser;
  токен не попадает в frontend
  или Git. Публичный RPC больше не используется как fallback для истории,
  а persisted checkpoint v2 валидирует address, deployment block, topics и
  canonical boundary block hash. Временный `checkpoint_ahead` сохраняет
  корректный checkpoint и завершает refresh без rebuild. Reorg или другой
  несовместимый checkpoint приводит
  к полному безопасному rebuild этого контракта. Secret-gate выполняется до
  SSH и любых deployment-действий.
  До создания/проверки этого secret source deployment не
  запускался.
- Прошли новый history-reader test, полный `test:admin-finance`,
  dedicated staging build, build boundary, JavaScript syntax, YAML parse и
  `git diff --check`.
- Уточнён Gate 0 по контрактам: адреса уже предоставлены пользователем,
  независимо проверены и зафиксированы в machine-readable registry. Повторная
  передача адресов не требуется; открыты только утверждение точного
  staging-периметра и activation cutover Daily V1/V2.
- Во вкладку Company Revenue добавлен предоставленный сценарий «Рост системы»:
  помесячный и дневной поток, новые кошельки, количество циклов и плановый
  доход платформы за август 2026 — июль 2027. Сценарий хранится как
  `growth-plan-2026.08-v2` со статусом `proposed`, показан отдельным
  операционным графиком и годовыми итогами; PLAN не подменяет фактические
  wallet/cycle/treasury данные.

## 2026-08-16

- Собрана чистая Admin Finance ветка поверх актуального `origin/main`
  без захвата посторонних dirty changes.
- Объединена Vite-конфигурация свежего `main` и выделенной
  Admin Finance staging entry point.
- Зафиксированы фактический Hostinger migration snapshot и host Nginx vhost
  для временного HTTPS `:8443`.
- Повторно пройдены Admin Finance tests, dedicated staging build, build
  isolation check и production dependency audit.
- Переведена пользовательская терминология пяти MVP-вкладок: внутренние
  `claimable`, `exposure`, `provider aggregate`, `roll-forward` и похожие
  термины заменены понятными операционными формулировками без изменения
  контрактов API, CSV и финансовой арифметики.
- Исправлен рендер частичных API-ответов Liquidity/Reconciliation: отсутствие
  разбивки по контрактам или матрицы покрытия теперь даёт явное состояние
  `данные не переданы`, а не падение React. API desktop/mobile QA прошла без
  console errors и page overflow.
- Добавлена отдельная API-only MVP entry point. Dedicated staging bundle
  содержит только Reconciliation, Flows, Liquidity, Cycles и Claims; full
  routes, demo financial datasets, CSV export и write actions исключаются и
  блокируются regression-тестом сборки.
- MVP shell сохраняет pinned block number/hash при переходах между пятью
  вкладками без полной перезагрузки. Flows и Reconciliation закрепляют все
  составные запросы тем же snapshot; Alpha API fail closed отвечает
  `409 snapshot_changed` при несовпадении блока или hash.

## 2026-08-15

- Развёрнут закрытый read-only Internal Alpha staging на
  `finance-staging.atlas-system.xyz`; immutable release
  `20260815T142737` использует отдельную Admin Finance entry point и не меняет
  production Support/Chatwoot.
- Временный server-side Basic Auth защищает весь `/admin/*`; без авторизации
  `/admin/overview` и `/admin/flows` возвращают `401`, write methods API
  отклоняются.
- После входа `/admin/overview` переводит на первый доступный MVP-маршрут
  `/admin/flows`. Проверены пять MVP-вкладок и Methodology на desktop/mobile,
  периоды Flows, cycle filters, Claims empty state, отсутствие horizontal
  overflow и application console errors.
- Исправлены API date defaults, long-range granularity, динамические ключи
  циклов, пустой Claims detail и плотность мобильной оси графика.
- Статус остаётся `INTERNAL ALPHA · PARTIAL / UNRECONCILED`; Basic Auth не
  считается production MFA/RBAC, а PostgreSQL migration/restore относится к
  следующему этапу R1.1.
- R1.1 Forecast runtime подключён к Alpha API: latest immutable snapshot,
  snapshot by ID и последовательные buckets. Runtime выключен в base Compose,
  включается отдельным fail-closed overlay и требует PostgreSQL TLS CA,
  allowlisted provider, independent RPC evidence и checkpoint guard.

## 2026-08-14

- Каноническая payout-лексика переведена с `at_claim` на
  `partner_reward_streamed` / `head_account_streamed`; forecast input теперь
  принимает `partnerRewardStreamed`.
- Добавлен transition adapter для legacy-ответов провайдера; старые
  типы нормализуются до арифметики и UI. Совместимость
  покрыта client contract tests.
- Добавлен выбор дня в Forecast и детальный daily obligations
  drill-down с циклами, четырьмя payout components, opening/closing
  liquidity, reserve и funding gap.
- Укрупнённые API bucket-ы явно маркируются как period; UI не
  создаёт фальшивую подневную аллокацию. Новый arithmetic test
  проверяет product totals, Gross composition и cash ladder.
- Official-memory pipeline переведён на `https://atlas-system.tech/`, а отказ
  дополнительного sitemap теперь попадает в review queue и не срывает
  всю сборку. Каталог пересобран: 42 страницы, 22 документа.
- Добавлен `atlas-level-2026-08-12`: Lockup 100% at creation, Daily
  20% at creation + 80% streamed за 200 дней, snapshot ставки при создании,
  Daily qualification × 0.5 и depth weights 100%/50%/10%.
- `Company Revenue` получил видимую versioned ruleset-панель; `Head Account`
  отделяет текущий compression gap для новых циклов от исторического
  rate snapshot. Desktop/mobile QA прошла без overflow и console errors.
- Проведена сверка Partner Program между публичными материалами, Hermes FAQ и
  локальным API; зафиксированы status ladder, compression formula, Matching
  Reward boundary и source precedence.
- Конфликтующий редакционный ruleset Hermes помечен как неавторитетный для
  финансовых расчетов до отдельного утверждения.

- Добавлен единый read-only `GET /finance/company-economics`: Incoming Flow,
  Platform Fee delta/partner split, Head Account creation/claim split,
  Company Revenue, target/gap/surplus/shortfall и непрерывная временная серия.
- OpenAPI, demo API, frontend client и append-only PostgreSQL projection
  проверяют денежную арифметику, суммы bucket-ов и basis-points rate. Любой
  write method отклоняется как `405 Allow: GET`.
- Full API UI читает Company Economics независимо от growth plan и Partner
  Economics, показывает block/finality/reconciliation и fail closed как
  `PARTIAL/N/A`; статические 4% в API-режиме не подставляются.
- API-экран дополнен дневной динамикой Company Revenue: stacked-компоненты Fee
  Delta, Fee Partner, Head creation и Head claim, линия фактической ставки,
  target reference и таблица Incoming / Revenue / rate gap по семи UTC bucket.
- Desktop и mobile QA подтвердили 7 строк, 28 bar-сегментов, одну rate line,
  отсутствие console errors и page overflow; проверка выполнена на demo API,
  не на production provider.
- `/finance/platform-fees` и `/finance/company-receipts` заменили generic
  envelopes на строгие cursor-paginated schemas и получили demo API/client
  validators. Platform Fee проверяет `Gross × rate`, receipts проверяют
  UUID/tx/block/log/finality/reconciliation; write methods запрещены.
- API-экран получил фильтруемый реестр Company Treasury receipts и раскрытие
  lineage до Platform Fee allocation. Персональные wallet-адреса в payload/UI
  не включены. Desktop/mobile QA проверили 10 receipts, 6 fee allocations,
  фильтр, detail view, contained table scroll и отсутствие console errors.

- Company Revenue получил сводный управленческий bridge от Incoming Flow к
  Platform Fee, Head Account Income и итоговому доходу Atlas.
- Добавлены target 4%, gap в п.п., денежный surplus/shortfall и отдельная
  маркировка same-period cash indicator.
- Расчёт вынесен в чистый модуль с boundary-тестами, включая нулевой
  denominator.

- Risk Center объединяет активный Partner Capture lifecycle alert с общей
  очередью, фильтрует сигналы по ответственному и SLA-категории.
- Подтверждения UI-only сигналов сохраняются в текущем браузере, проходят
  allowlist-проверку ID, а Partner Capture acknowledgement остаётся единым с
  его профильным lifecycle journal.
- Добавлены клиентские проверки парсинга и дедупликации acknowledgement ID.

- Partner Capture получил общий расчёт для Company Revenue, Head Account и
  Risks: target 35%, warning 33–34.99%, critical ниже 33%, gap и
  денежный shortfall. Alert/recovery policy требует два finalized-среза.
- На Head Account добавлен операционный блок с numerator/denominator,
  порогами и переходом в Company Revenue; Risks получил отдельную
  control card и описание threshold policy.
- Risks дополнен Partner Capture what-if с пресетами 32/34/35%,
  расчётом severity/shortfall и порядком диагностики. Нулевой
  denominator теперь даёт `unavailable`, а не ложный critical.
- В локальные настройки Head Account добавлены Partner Capture
  warning, critical и recovered; production write/delivery остаются PLANNED.
- Добавлен версионный browser-local Partner Capture journal: finalized DEMO-
  cuts, двухсрезовая активация/recovery, warning/critical lifecycle,
  acknowledgement, owner/SLA и история переходов. Reload persistence и
  мобильная вёрстка проверены.

- В Company Revenue добавлен `Partner Capture Rate`: доля всех фактически
  выплаченных партнёрских вознаграждений сети, которая поступила головному
  аккаунту Atlas. Управленческая цель установлена на 35%.
- Показаны numerator/denominator, gap к цели, разложение creation/claim и
  временной график. Platform Fee явно исключён; локальные значения помечены
  `DEMO`, production источник ещё не подключён.
- Добавлен read-only `GET /finance/partner-economics`, strict OpenAPI response и
  append-only PostgreSQL snapshot/bucket projection. Сервер и клиент проверяют
  `creation + claim = Atlas receipts`, суммы series и basis-points rate/gap.
- API-режим Company Revenue читает Partner Economics независимо от growth plan,
  показывает block/finality/reconciliation и остаётся `PARTIAL/N/A`, если
  transfer attribution неполный или endpoint недоступен.

- План роста получил read-only контракт `GET /management/growth-plan` с
  версией, статусом proposal, owner, basis points и 12 месяцами в atomic USDT.
- Любая запись в endpoint по-прежнему запрещена; approval flow откладывается до
  RBAC, MFA, four-eyes и audit trail.
- В canonical PostgreSQL DDL добавлены append-only таблицы версий плана и
  месячных значений.
- Поля динамического калькулятора теперь сохраняются в versioned localStorage,
  восстанавливаются после reload, валидируются и могут быть сброшены кнопкой.
- Интерфейс явно показывает `LOCAL DRAFT` и `proposed, не утверждён`, отделяя
  локальный сценарий от actual/reconciled бухгалтерских данных.
- Full UI подключён к `GET /management/growth-plan`: API-режим рендерит только
  серверный план, provenance и статус версии. Макетные показатели фактического
  дохода в этом режиме не подставляются.
- Клиентский `/meta` различает строгие контракты явного demo API и Internal
  Alpha API; автоматический production fallback не добавлялся.
- Полный Admin Finance test suite, production build и desktop/mobile Playwright
  QA пройдены; production и staging deployment не выполнялись.

## 2026-08-13

- В static-only Company Revenue добавлен отдельный управленческий блок
  `PLAN · DEMO` для минимального роста входящего потока на 40% месяц к месяцу.
- Добавлен интерактивный пример `$100 → $140` с ручным фактом `$3.30`, target
  pace на текущую дату, отклонением, остатком, требуемым средним потоком на
  оставшиеся дни и projected month end.
- Перенесён предоставленный сценарий август 2026 — июль 2027: monthly flow,
  30-дневный daily reference и planned company revenue по допущению 4%.
- Округлённые суммы сценария не выдаются за точный arithmetic step: production
  target рассчитывается от точного факта прошлого месяца × 1.40.
- Зафиксировано разделение `PLAN` и финансового `ACTUAL`: план не участвует в
  ledger/reconciliation и не называется заработком или чистой прибылью.

## 2026-08-07

- В полном static-only продукте Head Account получил реестр лично приглашённых
  веток со стабильным `Branch #N`, ставками head/branch, compression gap,
  фактическим 30D income и сигналами `получаем / близко / догнала`.
- Participants принимает точный номер личной ветки и связывает его с тем же
  каноническим профилем; demo API поддерживает exact lookup `333/#333/branch-333`.
- API и продуктовая спецификация запрещают использовать номер строки базы,
  повторно выдавать retired ordinal и считать gap денежным доходом без
  versioned ruleset и подтверждённого transfer.
- Уведомления дополнены transition-событиями near-zero, matched/surpassed и
  recovered. Реальная отправка остаётся вне Internal Alpha до referral source,
  server-side alerts, RBAC и audit.

## 2026-08-06

- Канонический контекст проекта связан с Hermes и обязателен через
  `AGENTS.md` и автоматическую проверку.
- Полный 14-screen продукт разделён на Internal Alpha, Finance MVP и следующие
  релизы.
- Первый контур сокращён до Reconciliation, Flows, Liquidity, Cycles и Claims.
- Добавлен release scope `mvp`, скрывающий и блокирующий остальные продуктовые
  разделы.
- Methodology/Gate 0 оставлен доступным как служебная страница, но не считается
  шестой вкладкой MVP.
- Export и write actions скрыты в Internal Alpha.
- Forecast переведён в R1.1 после доказуемого maturity/claim input; Overview —
  после сверки нижележащих показателей.
- Целевой внутренний запуск: 12.08.2026; при задержке provider contract допустим
  только явно помеченный `PARTIAL` on-chain контур без revenue/referral фактов.
- Добавлен отдельный Admin API mode `alpha`; `demo` остаётся явным локальным
  режимом, автоматический fallback запрещён.
- Реализован защищённый on-chain provider: allowlists, limits, schema/chain/token
  validation, controlled addresses, independent block/hash/finality и local
  snapshot cache.
- Исправлено сохранение знака отрицательного Net Flow и отображение
  недоступных денежных значений как `N/A`.
- Reconciliation и Liquidity переведены на Alpha API; static demo в API mode не
  рендерится.
- Historical `balanceOf` читается на том же блоке. При отсутствии archive state
  UI показывает только `REPORTED · UNVERIFIED`, не приписывая latest balance к
  старому block cut.
- Добавлены provider/Alpha API security tests и Playwright QA пяти MVP-маршрутов
  на desktop/mobile. Локальный MVP-0 завершён; staging/OIDC/restore/UAT остаются
  незавершёнными.
- На экране Cycles исправлена семантика all-time aggregates: общее
  количество больше не называется «открытым в периоде», а total volume —
  «активным Principal».
- Cycles в Alpha API mode показывает open/closed, claimable now и maximum
  exposure на 7/30 дней из живого provider snapshot; точный Forecast не
  активирован без maturity dates, payout components и reserve policy.
- В `/meta` добавлена валидируемая матрица покрытия данных для семи финансовых
  доменов. Reconciliation теперь связывает каждый `PARTIAL`/`UNAVAILABLE`
  показатель с затронутыми вкладками, Gate 0, владельцем и следующим действием;
  Forecast по-прежнему не симулируется без точных входных данных.
- Добавлен R1.1 `atlas.forecast-input.v1`: JSON Schema, положительный provider
  fixture, строгий серверный валидатор и детерминированный построитель cash
  ladder. Он проверяет Gross waterfall, не принимает отдельный Platform Fee,
  требует approved policies, finalized/independent checkpoint, evidence для
  inflow, непрерывный полный 90-дневный горизонт и точные cut points 24h / 7d /
  30d / 90d, а также жёстко фиксирует BNB Smart Chain `chainId=56`. Контур не
  подключён к Alpha до получения реального sandbox
  payload и независимой сверки.
- Добавлен изолированный R1.1 source adapter для
  `data.atlas-system.io`: exact HTTPS host/path allowlist, server-only auth,
  запрет redirect/cookies, timeout/body limits, quarantine validation,
  freshness/BSC/USDT/finality policy, cache и process-local защита от
  rollback/equivocation. Добавлены negative tests и эксплуатационный runbook;
  подключение к Alpha API отложено до sandbox payload, persisted PostgreSQL
  watermark и независимой on-chain сверки.
- В canonical PostgreSQL DDL добавлены Forecast source watermark, append-only
  snapshot identity registry и атомарная accept-функция с per-source advisory
  lock. Adapter получил injectable checkpoint guard и тест общей защиты между
  несколькими экземплярами; runtime repository и staging migration ещё не
  подключены.
- В R1.1 добавлен обязательный payout contract address. Реализован независимый
  BSC RPC verifier для block hash, confirmations и исторического
  `USDT.balanceOf` на том же block tag, а также выключенная по умолчанию
  PostgreSQL runtime-композиция с TLS CA, parameterized SQL и server-only
  secrets. Реальные staging DB/provider/RPC ещё не подключены, API Forecast не
  открыт.
- Добавлен staging proxy-auth режим: API требует shared secret доверенного
  gateway, проверенную OIDC email identity и Finance-группу; локальный cookie не
  является обходом. Добавлены internal live/ready healthchecks и negative auth
  tests.
- Подготовлена fail-closed staging-упаковка `web + api + oauth2-proxy v7.15.2`:
  frontend собирается только в `api/mvp`, API port не публикуется, web слушает
  loopback до внешнего HTTPS, контейнеры read-only/cap-drop. Фактический Docker
  запуск, OIDC и UAT пока не выполнены.
- Admin Finance отделён от общей Vite entry point. Staging собирает только
  `admin-finance.html`, не содержит старый SuperSUS password gateway и проверяет
  это автоматически; Nginx fallback исправлен на выделенную страницу.
- OAuth2 Proxy environment приведён к официальному 7.15.x contract: list
  options используют `OAUTH2_PROXY_ALLOWED_GROUPS` и
  `OAUTH2_PROXY_TRUSTED_PROXY_IPS`; singular-варианты запрещены package test.
- AuditV5 проверен как source/ABI/spec archive, а не deployment registry.
  Добавлен machine-readable кандидат controlled-address registry: пять Atlas
  контрактов, USDT, административные адреса, LP-NFT, lifecycle V2/V1,
  runtime code hashes и provenance официального PDF/provider/RPC. On-chain
  параметры независимо прочитаны на BSC block `114407352`; зафиксирован дрейф
  owner Daily Flow после PDF и неразрешённый activation cutover Daily V1/V2.
  Staging `.env.example` получил проверенный
  кандидат allowlist, но Gate G0-02 остаётся OPEN до owner/Finance approval.
- Добавлена автоматическая проверка реестра: format/duplicates, chain/token,
  fee arithmetic, lifecycle, external infrastructure isolation, evidence,
  known drift, unresolved Dune и точное совпадение staging allowlist.
- Полный `test:admin-finance` и dedicated staging build прошли. Дополнительный
  live read-only Alpha smoke с candidate allowlist вернул readiness/meta 200 и
  независимо подтвердил provider snapshot на BSC block `114408542` с 36
  confirmations; Claims/Forecast/Reconciliation/Company Revenue остались
  честно недоступны, а не заполнены приблизительными значениями.
- 2026-08-14: Подтвержден текущий официальный публичный домен
  `https://atlas-system.tech/`. Он зафиксирован как канон для текущих
  публичных правил, FAQ и Partner Program; on-chain/ledger остаются
  каноном фактического финансового исполнения.
- 2026-08-14: На Forecast добавлен резервный план D−7 / D−3 / D−1. Чистая
  модель группирует непрерывные funding-gap bucket, рассчитывает первый breach,
  peak gap и минимальное пополнение; demo показывает $4,641 к 14.09.2026.
  Policy buffer не выдумывается, Telegram/email не заявлены подключёнными.
  Добавлен отдельный regression test и responsive UI.
- 2026-08-15: Добавлен серверный контракт резервных уведомлений: три новые
  canonical таблицы для reserve alert, outbox и append-only delivery attempts,
  SQL enqueue с payload equivocation guard, SHA-256 idempotency key и OpenAPI
  `GET /alerts/{alertId}/deliveries`. Demo API возвращает один reserve alert и
  12 read-only delivery records; in-app запланирован, Telegram/email отмечены
  `blocked`, попыток доставки нет. Forecast получил responsive журнал.
- 2026-08-15: Реализован тестируемый notification runtime без внешней отправки:
  parameterized PostgreSQL repository, атомарный `FOR UPDATE SKIP LOCKED` lease,
  lease token/expiry, append-only completion, retryable-only exponential
  backoff и deterministic provider request key. Отдельно проверено, что сбой
  journal commit после provider acceptance не создаёт вторую классификацию.
  Добавлен `runbooks/NOTIFICATION-OUTBOX.md`; адаптеры и scheduler выключены.
- 2026-08-15: Добавлен строго локальный `shadow` runtime: три channel adapter
  без network client, SHA-256 recipient/payload journal, overlap-safe scheduler
  с explicit start/stop и environment factory, отклоняющий `live`. Staging
  Compose принудительно устанавливает notifications `false` и проверяется на
  отсутствие Telegram/email secrets.
- 2026-08-15: Подготовлен staging migration manifest со статусом
  `prepared_not_applied`, SHA-256 канонического DDL, размером и ожидаемыми 47
  таблицами. Автотест запрещает незаметный drift и сохраняет notification
  runtime disabled после миграции до backup/restore и security review.
- 2026-08-15: Migration artifact явно классифицирован как baseline с
  `sourceApplyAllowed=false`. Добавлен dry-by-default PostgreSQL restore-drill runner:
  не передаёт credentials в argv/отчёт, требует TLS `verify-full`, distinct
  empty restore target, новый backup path и сверяет user-table count после
  restore. Negative tests подтверждают остановку до `pg_restore` на непустой
  базе. Реальный drill не выполнялся.
