# Atlas System — Option A Contract Patch Plan

Дата: 2026-06-05  
Статус: draft для команды  
Назначение: привести контракт к публичным тарифам

## Когда выбирать Option A

Option A выбирается, если команда подтверждает:

```text
Публичные тарифы в White Paper, презентациях и на сайте являются источником истины.
Контракт нужно привести к этим значениям.
```

## Что меняется

### UnityLockup.sol

Текущая формула:

```text
rewards = (amount * (N * BP)) / PRECISION
BP = 10 ** 21
PRECISION = 10 ** 25
```

Чтобы получить публичные тарифы, нужно изменить `N`:

| Tier | Current N | New N | Target public rate |
| --- | ---: | ---: | ---: |
| Launch | 3 | 30 | +0.3% |
| Momentum | 20 | 200 | +2% |
| Premiere | 50 | 500 | +5% |
| President | 120 | 1200 | +12% |
| Imperium | 225 | 2250 | +22.5% |

Ожидаемый patch:

```diff
- rewards = (amount * (3 * BP)) / PRECISION;
+ rewards = (amount * (30 * BP)) / PRECISION;

- rewards = (amount * (20 * BP)) / PRECISION;
+ rewards = (amount * (200 * BP)) / PRECISION;

- rewards = (amount * (50 * BP)) / PRECISION;
+ rewards = (amount * (500 * BP)) / PRECISION;

- rewards = (amount * (120 * BP)) / PRECISION;
+ rewards = (amount * (1200 * BP)) / PRECISION;

- rewards = (amount * (225 * BP)) / PRECISION;
+ rewards = (amount * (2250 * BP)) / PRECISION;
```

### UnityDaily.sol

Если публичные Daily-тарифы являются источником истины:

| Tier | Current value | New value | Target public rate |
| --- | ---: | ---: | ---: |
| Core | `110 * BP` | `60 * BP` | 0.6% / day |
| Elite | `130 * BP` | `80 * BP` | 0.8% / day |

Ожидаемый patch:

```diff
- return 110 * BP;
+ return 60 * BP;

- return 130 * BP;
+ return 80 * BP;
```

## Какие тесты нужно обновить

После patch code-level expected values меняются.

### AtlasAccessControl.t.sol

`testLockupRejectsDoubleClaim` должен использовать:

```text
100.3 ether
```

потому что `100 principal + 0.3 reward`.

### AtlasAccountingInvariants.t.sol

Ожидаемые значения:

```text
LOCKUP_REWARD = 0.3 ether
DAILY_REWARD = 0.6 ether
```

Важно: если тест создает Daily Core order на `100 ether`, ожидаемый daily reward должен быть `0.6 ether`.

### Tariff machine check

После patch:

```text
Lockup statuses: OK, OK, OK, OK, OK
Daily statuses: OK, OK
```

## Какие проверки повторить

Обязательные команды:

```text
forge build
forge test -vv
forge test -vv --fuzz-runs 1000
node scripts/check-tariff-consistency.js
```

Также повторить:

1. Lockup stress-test.
2. Daily / Transport stress-test.
3. Accounting invariant checks.
4. Slither.
5. Aderyn.
6. Mythril bounded bytecode runs.
7. Public Security Review update.
8. Gate Matrix update.

## Что можно писать после успешного patch и повторных проверок

Только после зеленых проверок:

```text
Contract tariff formulas match the approved public tariff model for the current reviewed code snapshot.
```

Нельзя писать:

```text
Audited
100% secure
Battle-tested
```

пока не проведены внешний аудит и BNB Testnet Battle Test.

## Что остается после Option A

Даже после patch остаются незакрытыми:

- BNB Testnet deployment;
- testnet smoke-test;
- публичный BNB Testnet Battle Test;
- внешний аудит;
- owner-policy final approval.
