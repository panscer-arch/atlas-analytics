# MVP Plan

## Решение

Не ждём завершения всех 14 экранов. Запускаем два последовательных уровня:

1. **Internal Alpha** — рабочий read-only мониторинг подтверждаемых фактов с
   явным статусом `PARTIAL`; не является финальной финансовой отчётностью.
2. **Finance MVP** — те же экраны после закрытия Gate 0, полного ledger
   reconciliation, restore test и UAT Finance-владельца.

## Пять вкладок Internal Alpha

### 1. Сверка данных

- checkpoint, finalized block/hash и freshness;
- balance residual и список исключений;
- event → receipt → transfer lineage;
- при неизвестном ruleset, reorg или residual итоговый статус не бывает
  `reconciled`.

### 2. Денежные потоки

- входящий, исходящий и Net Flow;
- отдельные периметры payout contract, consolidated и treasury;
- внутренние переводы исключаются из consolidated;
- drill-down до подтверждающего события/транзакции без раскрытия полного
  адреса кошелька.

### 3. Ликвидность

- opening/closing balance и on-chain checkpoint;
- balance roll-forward;
- reserve/spendable скрыты, пока не утверждена reserve policy;
- LP показывается отдельно и не считается автоматическим покрытием cash gap.

### 4. Циклы

- created/open/matured/closed;
- Principal, contract version, ruleset и maturity schedule;
- Contract Test и legacy-контуры отделены от production;
- maturity schedule подписан как maximum exposure, а не прогноз фактических
  claims.

До получения bucket-level maturity dates Alpha показывает только
source-reported claimable now и maximum exposure на 7/30 дней. Они не
заменяют календарь и не включают funding-gap calculation.

### 5. Claims и выплаты

- eligible/requested/pending/failed/paid/reversed/expired;
- Principal, Gross Delta, Partner Reward streamed и неисполненный Partner
  Reward at Creation;
- Platform Fee находится внутри Gross и не добавляется к outflow повторно;
- недоступные off-chain состояния показываются как `N/A`.

На каждом экране обязательны UTC, период, perimeter, cut time, as-of block,
freshness, source status и reconciliation status.

## Что следует сразу после Alpha

### R1.1 — Прогноз выплат

- отдельная вкладка 24h / 7d / 30d / 90d;
- сначала committed/maximum exposure без неподтверждённого future inflow;
- последовательный cash ladder, peak exposure и первая дата funding gap;
- Base/P50/P90 только после истории claim-delay и backtesting.

### R1.2 — Управленческий обзор

- Overview агрегирует только уже сверенные Flows, Liquidity, Cycles и Claims;
- Company Revenue и Head Account подключаются после referral tree и
  внутреннего ledger.

Participants/KPI, GA4/Traffic, Campaigns, Risks, exports, wallet reveal,
корректировки, уведомления и изменение правил остаются вне первого релиза.

## Этапы

### MVP-0 — Data Foundation, 06–09 августа

- [x] закрепить память и границы;
- [x] подключить server-to-server on-chain adapter;
- [x] подключить Reconciliation и Liquidity к Alpha API;
- [x] реализовать explicit source mode, local read-only session boundary и
  fail-closed состояния;
- [x] проверить five-route desktop/mobile API mode без demo fallback;
- [ ] утвердить controlled addresses и contract registry владельцем;
- [ ] подключить production identity и archive-capable RPC.

### MVP-1 — Internal Alpha, 10–12 августа

- [x] пять вкладок используют один versioned snapshot без demo fallback;
- [x] закрытый HTTPS staging развёрнут с временным server-side Basic Auth;
- [x] desktop/mobile QA, partial/auth/read-only tests и проверка фактического
  staging URL;
- [ ] контрольная сверка до независимого ledger/Dune snapshot;
- [ ] staging PostgreSQL backup/restore drill и UAT Finance-владельца;
- [ ] production OIDC/MFA/RBAC вместо общего Basic Auth.

Internal Alpha staging развёрнут 15.08.2026 и остаётся `PARTIAL`. Его наличие
не заменяет ledger reconciliation, restore drill, индивидуальную авторизацию и
Finance-owner UAT.

### Целевой внутренний запуск — 12 августа 2026

Если `data.atlas-system.io` не передан, Alpha запускается на собственном
on-chain adapter со статусом `PARTIAL`: без referral facts, revenue, head
account и неподтверждённых off-chain claim states.

### Finance MVP — после Gate 0

Статус `SOURCE OF TRUTH` разрешён только после закрытия 14 решений Gate 0,
детерминированного backfill, reconciliation до atomic unit, negative security
tests и успешного полного restore.

## Go criteria для Internal Alpha

- пять MVP-маршрутов используют API mode и не содержат demo fallback;
- server-side admin authentication и default deny;
- source age и as-of block видны на каждом экране;
- один snapshot используется во всех пяти вкладках;
- ledger closing сходится с on-chain checkpoint либо показывает residual;
- stale/partial/error не превращаются в нули;
- полные wallet addresses, exports и write actions отключены;
- пройдены desktop/mobile UAT и проверен фактический staging URL;
- интерфейс везде помечен `INTERNAL ALPHA · PARTIAL` до Gate 0.
