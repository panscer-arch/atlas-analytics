# Запрос контракта данных у data.atlas-system.io

Этот документ передаётся команде источника до начала production-интеграции.
Ответ должен включать документацию, sandbox и обезличенные примеры payload.

## 1. Доступ и окружения

- production и sandbox base URLs;
- модель взаимодействия: pull API, webhooks, snapshots или комбинация;
- OAuth2/mTLS параметры, scopes и процедура ротации;
- IP allowlist и контакт для аварийной блокировки credential;
- rate limits, максимальный размер ответа и timeout;
- SLA доступности и допустимая задержка данных;
- история, доступная для backfill, и правила повторной выгрузки.

## 2. Формальный контракт

- OpenAPI 3.1 для HTTP API и/или AsyncAPI для событий;
- Open Data Contract Standard 3.1 для наборов данных;
- JSON Schema каждого payload;
- текущая версия, changelog, дата deprecation и окно миграции;
- политика backward compatibility;
- стабильные IDs, pagination/cursor и monotonic sequence;
- `event_at`, `created_at`, `updated_at`, timezone UTC;
- semantics для delete, correction, reversal, retry и duplicate;
- nullable/optional поля и отличие `0`, `null`, отсутствующего значения и N/A.

## 3. On-chain доказательства

Для каждой финансовой записи, где применимо:

- `chain_id`;
- contract/proxy и implementation address;
- ABI/ruleset version и effective block range;
- transaction hash, log index, block number и block hash;
- receipt status;
- token address, symbol и decimals;
- amount в minimal units строкой;
- sender, recipient и классификация controlled/uncontrolled;
- число подтверждений и finality status;
- reorg replacement/cancellation semantics.

## 4. Циклы и claims

### Cycle

- стабильный `cycle_id`, тип и публичное название;
- wallet/participant ID и referral relationships;
- principal, token и decimals;
- created, start, maturity/eligibility, closed и settlement timestamps;
- lifecycle state и полная история переходов;
- tariff/ruleset ID;
- gross delta, deductions и net delta components;
- source event/transfer links.

### Claim

- стабильный `claim_id` и связанный `cycle_id`;
- eligible, requested, submitted, paid, failed, reversed, expired states;
- timestamps каждого перехода;
- principal returned, gross delta, fee, net delta;
- failure/retry code;
- transaction and transfer links.

## 5. Partner Reward и Platform Fee

Нужен payout graph, а не одно итоговое поле:

- reward at cycle creation;
- reward streamed;
- получатель, линия/уровень, статус и версия ставки;
- gross partner reward;
- platform fee удержанная из partner gross;
- прочие deductions;
- net partner transfer;
- status snapshot: фиксируется при создании или определяется при выплате;
- правила upgrade/downgrade для длинных циклов;
- rounding order и minimal unit residual;
- связь каждого component с фактическим transfer.

## 6. Controlled address registry

- все payout, treasury, fee, head account, LP и operational addresses;
- назначение и денежный perimeter каждого адреса;
- effective from/to block;
- owner и основание изменения;
- правила исключения внутренних переводов;
- список разрешённых contracts/tokens/chains.

## 7. Контрольные итоги

Для согласованной контрольной даты предоставить:

- число циклов по lifecycle state;
- сумма principal created;
- principal returned;
- gross/net delta и platform fee;
- gross/net partner rewards отдельно creation/streamed;
- число и сумма pending/failed claims;
- closing balances контролируемых адресов;
- as-of block number/hash;
- список известных исключений;
- 10-20 полностью трассируемых примеров от API record до tx/log/transfer.

Atlas независимо пересчитает эти итоги по сети. Расхождения оформляются как
reconciliation exceptions, а не исправляются вручную в исходном payload.

Дополнительно Atlas сопоставит контрольные итоги с публичным Dune checkpoint.
Dune используется только для независимого наблюдения: его query result не
заменяет raw events, receipts, token transfers, internal ledger или собственный
on-chain indexer и не является прямой зависимостью Admin UI.

## 8. Качество и безопасность

- схема изменений и уведомление минимум за согласованный срок;
- подпись webhooks, timestamp, nonce и replay window;
- идемпотентность и гарантии доставки;
- checksum/hash для snapshot и batches;
- максимальная задержка и heartbeat источника;
- классификация персональных данных;
- retention и deletion policy;
- incident notification SLA;
- журнал доступа поставщика к данным Atlas;
- security contact и процедура disclosure.

## 9. Acceptance tests

Поставщик должен дать fixtures для:

1. обычного cycle create;
2. reward at creation;
3. claim с principal, delta, fee и reward streamed;
4. failed и retried claim;
5. correction/reversal;
6. duplicate delivery;
7. out-of-order delivery;
8. chain reorg;
9. schema version upgrade;
10. пустого периода и реального нулевого значения.

Интеграция не считается готовой, пока fixtures не проходят schema validation,
deduplication, replay, ledger invariants и on-chain reconciliation.

## 10. R1.1 committed forecast input

Машиночитаемый контракт: `../contracts/forecast-input.v1.schema.json`.
Положительный пример: `../fixtures/forecast-input.v1.valid.json`.

Источник не передаёт готовые `totalOutflow`, `closingLiquidity`, `fundingGap`
или отдельный `platformFeeDue`. Он передаёт только доказуемые входы каждого
последовательного bucket:

- Principal due;
- Gross Delta с разложением `gross = net + platform fee + other deductions`;
- Gross Partner Reward streamed с тем же разложением;
- только pending/failed Gross Partner Reward at Creation;
- подтверждённый inflow и список evidence;
- cycle count, source references и непрерывный UTC interval.

Корневой payload обязательно передаёт `payoutContractAddress`. Это адрес
периметра, для которого заявлена `openingLiquidityRaw`; Atlas принимает только
адрес из утверждённого controlled-address registry.

Atlas повторно рассчитывает Total Gross Contract Outflow, opening/closing
liquidity, reserve breach, peak exposure и funding gap. Platform Fee находится
внутри Gross и не принимается отдельным полем, поэтому не может быть прибавлен
к потребности в ликвидности второй раз.

До допуска payload обязательны finalized checkpoint, независимо проверенный
BNB Smart Chain `chainId=56`, block-tagged opening balance, утверждённые
versioned reserve/forecast policies,
непрерывные buckets от `checkpoint.asOf`, полный горизонт 90 дней и точные
границы bucket на 24h / 7d / 30d / 90d.
JSON Schema проверяет форму, а серверный валидатор дополнительно проверяет
денежные равенства, порядок времени, evidence и последовательный cash ladder.

Для подневного операционного календаря provider должен отдавать
24-часовые UTC bucket-ы. Период длиннее 24 часов не может быть
автоматически распределён UI по дням. Для drill-down по названиям
циклов нужна отдельная cycle-level dimension с `product_key`, `cycle_count`
и теми же четырьмя payout components; до её появления разбивка в
API-режиме отображается как `N/A`.

Защитный transport/quarantine adapter описан в
`../runbooks/FORECAST-SOURCE-ADAPTER.md`. Его наличие не считается доказательством
истинности provider-полей `confirmations` или `independent_rpc`: перед
публикацией Atlas отдельно сверяет checkpoint block hash, фактические
confirmations и `USDT.balanceOf(payoutContractAddress)` на том же block tag, а
затем выборку bucket items по независимому BSC RPC/indexer. Межпроцессный watermark должен
храниться атомарно в PostgreSQL; process-local защита предназначена только для
локальных тестов.
