# Atlas Admin: каталог показателей

Все суммы отображаются в USDT, но хранятся как raw integer + token decimals.
N/A не заменяется нулём. Для каждой метрики обязательны perimeter, as-of block,
formula version, source status и drill-down.

## Participant economics

| Metric | Definition / formula | Source |
| --- | --- | --- |
| Principal Created | Confirmed Principal при cycle created | Event + transfer |
| Principal Returned | Фактически выплаченная основная сумма | Claim transfers |
| Gross Delta | Net Delta + Fee + other deductions | Payout graph |
| Net Delta Received | Фактический transfer участнику | Token transfers |
| Gross Partner at Creation | Отдельный gross-расход при создании | Payout graph |
| Gross Partner streamed | Отдельный gross-расход по графику начислений | Payout graph |
| Net Partner Rewards | Фактические transfers партнёрам | Token transfers |
| Participant Payouts | Principal Returned + Net Delta + Net Partner | Ledger |
| Historical Net Participant Flow | Principal Created − Participant Payouts | Projection |

## Payout Contract

| Metric | Formula | Notes |
| --- | --- | --- |
| Contract Token Inflow | Все внешние transfers в контракт | Включает top-ups |
| Contract Token Outflow | Все transfers из контракта | Treasury fee включается один раз |
| Contract Net Cash Movement | Token Inflow − Token Outflow | Не Company profit |
| Ledger Closing Balance | Opening + inflows − outflows ± adjustments | Сходится on-chain |
| Canonical On-chain Balance | Finalized balance checkpoint | Источник баланса |
| Restricted Amount | Сумма по approved policy | Не расходуется |
| Required Reserve | Минимальный резерв на дату | Versioned policy |
| Available Contract Balance | On-chain − Restricted | Начальный cash balance для forecast |
| Spendable Above Reserve | max(0, Available Contract Balance − Required Reserve) | Управленческий свободный остаток |
| Reserve Headroom | Projected Balance − Required Reserve | Ниже нуля = funding gap |
| Reconciliation Variance | Ledger Closing − On-chain | Token precision |
| BNB Gas Reserve | Native balance и operations coverage | Отдельно от USDT |

## Atlas Consolidated

| Metric | Formula |
| --- | --- |
| External Inflow | Uncontrolled → controlled transfers |
| External Outflow | Controlled → uncontrolled transfers |
| Internal Transfers Eliminated | Transfers внутри controlled registry |
| Consolidated Net Cash Movement | External Inflow − External Outflow |
| Consolidated Closing Balance | Opening + external net movement |

## Company Treasury

| Metric | Formula / recognition |
| --- | --- |
| Platform Fee Cash Received | Фактический treasury receipt |
| Fee Allocated | Fee внутри Gross, ещё не обязательно cash |
| Head Account Cash Received | Existing partner transfer company classification |
| Other Company Receipts | Только подтверждённые категории |
| Company Cash Receipts Total | Fee + Head Account + Other |
| Same-period Cash Timing Ratio | Receipts периода / Incoming периода |
| Cohort Company Take Rate H | Receipts когорты к H / Cohort Principal |
| Operating Costs | После подключения expense ledger |
| Net Profit | Receipts − полный expense contour |

## Forecast

| Metric | Definition |
| --- | --- |
| Pending Claims | Requested, но не settled |
| Maximum Eligible Exposure | Максимальная gross-сумма, доступная к claim |
| Expected Cash Outflow | Calibrated claim-delay cash timing |
| Scheduled Principal | Principal existing cycles в bucket |
| Projected Gross Delta | Delta по ruleset цикла |
| Projected Gross Partner streamed | Отдельный расход сверх Delta |
| Pending Partner Creation | Только retryable pending/failed |
| Total Gross Contract Outflow | Principal + Delta + Partner + pending creation |
| Projected Balance | Previous + confirmed inflow − outflow |
| Required Additional Liquidity | max(0, reserve − projected balance) |
| Peak Funding Gap | Максимальный required liquidity |
| Earliest Reserve Breach | Первый bucket ниже reserve |
| Minimum Coverage | Минимальный balance/outflow ratio |

## Cycles and claims

| Metric | Definition |
| --- | --- |
| Opened Cycles | Confirmed cycle created |
| Active Cycles | Не terminal |
| Eligible Cycles | Достигли eligibility |
| Paid Claims | Terminal paid/settled |
| Claim Success Rate | Paid / requested |
| Claim Delay | paid_at − eligible_at или requested_at |
| Cycle Inflow Share | Cycle Principal / Total Principal |
| Maturity Schedule | Eligibility calendar, не cash-out forecast |

## Wallets and growth

| Metric | Definition |
| --- | --- |
| Connected Wallet | Server-confirmed normalized wallet |
| Wallet Without Cycle | Connected, no confirmed cycle |
| Zero-balance Wallet | Отдельная token-balance проверка |
| Wallet With Cycle | Имеет confirmed cycle |
| Wallet-to-Cycle Conversion | First-cycle wallets / connected |
| GA4 Link Coverage | Linked pseudonymous journeys / eligible journeys |
| Campaign Incoming | Principal by versioned attribution |
| Cost per Connected Wallet | Spend / connected wallets |
| Cost per First Cycle | Spend / first-cycle wallets |

## Management growth plan

| Metric | Definition |
| --- | --- |
| Monthly Flow Target | Approved previous-month actual × 1.40 |
| Target Pace To Date | Target × elapsed calendar days / days in month |
| Pace Variance | Current-month actual − target pace to date |
| Remaining Flow | max(0, target − current-month actual) |
| Required Daily Pace | Remaining flow / remaining calendar days |
| Projected Month End | Actual to date / elapsed days × days in month |
| Planned Company Revenue | Flow target × approved planning take rate; plan only |
| Company Revenue Target | Incoming Flow × approved Company Revenue target rate; текущий управленческий ориентир 4% |
| Company Revenue Gap | Actual Company Revenue Rate − target, в процентных пунктах |
| Company Revenue Surplus / Shortfall | Actual Company Revenue − Company Revenue Target; показывается раздельно, не является funding instruction |

Все показатели этого раздела имеют state `PLAN`. Они не заменяют фактические
поступления, Company Revenue Rate или бухгалтерскую прибыль.

## Partner program capture

| Metric | Definition |
| --- | --- |
| Gross Partner Rewards Paid | Все фактически выплаченные Partner Rewards сети за период: creation + claim |
| Atlas Referral Income | Фактически поступивший Head Account income Atlas, относимый к Partner Rewards; Platform Fee исключён |
| Partner Capture Rate | Atlas Referral Income / Gross Partner Rewards Paid × 100% |
| Partner Capture Target | Утверждённая управленческая цель; текущая цель 35% |
| Partner Capture Gap | Actual Partner Capture Rate − target, в процентных пунктах |
| Partner Capture Shortfall | max(0, Gross Partner Rewards Paid × target − Atlas Referral Income) |
| Partner Capture Status | healthy от 35%; warning 33–34.99%; critical ниже 33% |
| Partner Capture Alert State | healthy / pending / warning / critical / recovering; переход требует 2 finalized-среза |
| Partner Capture Acknowledgement | Owner принял сигнал в работу; source condition остаётся открытым |

Числитель и знаменатель используют один UTC-период и только подтверждённые
переводы. Accrual, claimable, внутренние перемещения и Platform Fee не входят в
числитель. Метрика не является гарантией дохода и не заменяет Company Revenue
Rate.

Для MVP переход в warning/critical и recovery требуют двух
последовательных finalized-срезов. Shortfall не является платёжным
обязательством или автоматическим funding instruction.

## Risks and quality

| Metric | Definition |
| --- | --- |
| Income at Risk | Head income lost under status-loss scenario |
| Payout Concentration | Top-N expected payouts / horizon outflow |
| Branch Concentration | Largest branch flow / total flow |
| Effective Fee Rate | Fee allocation / linked Gross |
| Exception Amount | Unreconciled financial components |
| Exception Age | Now − first_detected_at |
| Source Freshness | Now − source checkpoint |
| Alert Owner | Команда или роль, отвечающая за первичный разбор сигнала |
| Alert SLA State | overdue / due soon / due today / due tomorrow / observing; вычисляется сервером из policy deadline |
| Alert Acknowledgement | Owner принял сигнал в работу; не изменяет источник и не закрывает risk condition |
| Forecast WAPE | Sum abs error / Sum actual |
| Forecast Bias | Mean actual − forecast |

## Display contract

Tooltip показывает numerator, denominator, exact decimal, period, UTC, perimeter,
as-of block/hash, formula/ruleset и source state. True zero выводится 0; отсутствие
источника — Нет данных; деление на ноль — N/A; ошибка — последнее значение со stale.
