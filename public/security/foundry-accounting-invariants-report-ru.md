# Atlas System — Foundry Accounting Invariants Report

Дата: 2026-06-05  
Статус: пройдено в локальном mock-окружении  
Команда:

```text
forge test --match-contract AtlasAccountingInvariantsTest -vv --gas-limit 10000000000
```

## Что проверялось

1. Lockup accounting:
   - пользователь создает Lockup order;
   - после unlock выполняется claim;
   - пользователь получает net payout;
   - treasury получает platform fee;
   - сумма user payout + treasury fee совпадает с gross amount, возвращенным из mock LP.

2. Daily accounting:
   - пользователь создает Daily order;
   - после 1 дня выполняется claim;
   - пользователь получает дневную net reward;
   - treasury получает platform fee;
   - `amountUnclaimed` уменьшается ровно на gross daily reward.

3. Transport accounting:
   - owner выполняет `claimReferral`;
   - пользователь получает net referral payout;
   - treasury получает platform fee;
   - сумма user payout + treasury fee совпадает с gross referral amount.

## Результат Foundry

```text
Ran 3 tests for test/AtlasAccountingInvariants.t.sol:AtlasAccountingInvariantsTest
[PASS] testDailyAccountingInvariantOneDayClaimPaysNetRewardAndFee()
[PASS] testLockupAccountingInvariantUserReceivesNetAndTreasuryReceivesFee()
[PASS] testTransportAccountingInvariantOwnerClaimPaysNetAndFee()
Suite result: ok. 3 passed; 0 failed; 0 skipped.
```

Общий suite после добавления accounting tests:

```text
Ran 4 test suites: 12 tests passed, 0 failed, 0 skipped.
```

## Перевод на обычный язык

Программа проверила не только права доступа, но и базовую арифметику выплат.

- В Lockup пользователь получает сумму по логике контракта за вычетом комиссии, а treasury получает комиссию.
- В Daily дневная выплата делится на пользовательскую часть и комиссию, а остаток `amountUnclaimed` уменьшается на gross reward.
- В Transport referral-выплата делится на пользовательскую часть и комиссию, и посторонняя сумма не появляется.

## Важное замечание

В тесте используется code-level формула контракта. Для `UnityLockupTier.Launch` при `100 ether` amount кодовая reward-часть равна `0.03 ether`. Если публичные материалы обещают другое значение, это нужно сверять отдельно как product/content mismatch, а не как результат этого теста.

Отдельная сверка опубликована в `Product / Contract Consistency Review`: `/security/product-contract-consistency-review-ru.md`.

## Ограничения

Это локальный mock accounting test. Он не заменяет:

- BNB Testnet deployment;
- реальные Pancake V3 testnet транзакции;
- внешний аудит;
- публичный BNB Testnet Battle Test.
