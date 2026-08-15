# Atlas Admin Dashboard: утверждённый payout waterfall

Дата фиксации: 2026-08-04.

## Утверждённые правила

1. Партнёрское вознаграждение выплачивается в два момента:
   - при создании цикла;
   - при claim.
2. Обе партнёрские выплаты являются отдельными расходами и выплачиваются сверху к Delta.
3. Platform Fee удерживается из соответствующей Gross-суммы. Она не является дополнительным расходом сверх Gross.

## Формулы

```text
Gross Delta = Net Delta to User
            + Platform Fee from Delta
            + Other Delta Deductions

Gross Partner Reward at Creation =
  Net Partner Reward at Creation
  + Platform Fee from Partner Reward at Creation
  + Other Partner Deductions at Creation

Gross Partner Reward streamed =
  Net Partner Reward streamed
  + Platform Fee from Partner Reward streamed
  + Other Partner Deductions at Claim
```

## Правило прогноза ликвидности

```text
Total Gross Contract Outflow(t) =
  Scheduled Principal(t)
  + Projected Gross Delta(t)
  + Projected Gross Partner Reward streamed(t)
  + Pending/Failed Gross Partner Reward at Creation(t)
```

Partner Reward at Creation обычно относится к фактическому Outgoing в момент создания цикла. В будущие обязательства он попадает только при неисполненном статусе `pending` или `failed`.

Platform Fee уже находится внутри Gross Delta или Gross Partner Reward и второй раз к Total Gross Contract Outflow не прибавляется.

## Что ещё параметризовать

- ставки по версиям контрактов;
- получателей и уровни партнёрской структуры;
- правила compression;
- правила округления;
- прочие удержания;
- события окончательного признания и погашения обязательств.
