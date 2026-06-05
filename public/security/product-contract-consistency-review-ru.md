# Atlas System — Product / Contract Consistency Review

Дата: 2026-06-05  
Статус: требует решения команды перед публичным deployment  
Источник проверки: `UnityLockup.sol`, `UnityDaily.sol`, публичные White Paper материалы

## Зачем нужен этот review

Security Review проверяет не только вопрос “может ли посторонний украсть средства”. Для публичного запуска важно еще одно: совпадают ли условия, описанные в материалах проекта, с фактической логикой смарт-контракта.

Если контракт считает одно, а презентация или White Paper обещает другое, это не обязательно exploit. Но это критичный product/legal риск: пользователь будет ожидать одну экономику, а контракт выполнит другую.

## Итог коротко

Найдено расхождение между публичными Lockup Flow тарифами и текущей code-level формулой `UnityLockup`.

Машинная проверка опубликована отдельно:

- script: `/security/tariff-consistency-check.js.txt`
- output: `/security/tariff-consistency-check-output.json`

Публичные материалы описывают:

- Launch: `+0.3%`
- Momentum: `+2%`
- Premiere: `+5%`
- President: `+12%`
- Imperium: `+22.5%`

Текущая формула контракта дает:

- Launch: `+0.03%`
- Momentum: `+0.2%`
- Premiere: `+0.5%`
- President: `+1.2%`
- Imperium: `+2.25%`

То есть текущий `UnityLockup.sol` считает reward в 10 раз меньше, чем указано в публичных материалах.

## Lockup Flow: сравнение

Формула в контракте:

```text
rewards = (amount * (N * BP)) / PRECISION
BP = 10 ** 21
PRECISION = 10 ** 25
```

Это означает:

```text
N * BP / PRECISION = N / 10000
```

| Tier | Public materials | Contract N | Code-level result | Status |
| --- | ---: | ---: | ---: | --- |
| Test | 0% | 0 | 0% | OK |
| Launch | 0.3% | 3 | 0.03% | mismatch x10 |
| Momentum | 2% | 20 | 0.2% | mismatch x10 |
| Premiere | 5% | 50 | 0.5% | mismatch x10 |
| President | 12% | 120 | 1.2% | mismatch x10 |
| Imperium | 22.5% | 225 | 2.25% | mismatch x10 |

## Пример на 100 USDT

| Tier | Public expected reward | Contract reward |
| --- | ---: | ---: |
| Launch | 0.30 USDT | 0.03 USDT |
| Momentum | 2.00 USDT | 0.20 USDT |
| Premiere | 5.00 USDT | 0.50 USDT |
| President | 12.00 USDT | 1.20 USDT |
| Imperium | 22.50 USDT | 2.25 USDT |

## Daily Flow: что требует отдельного решения

Публичные материалы описывают Daily Flow как:

- Core: около `0.6%` в сутки / `+120%` за 200 дней;
- Elite: около `0.8%` в сутки / `+160%` за 200 дней.

Текущий `UnityDaily.sol` использует:

```text
Core: 110 * BP => 1.1% в день
Elite: 130 * BP => 1.3% в день
DAILY_REWARDS_COUNT = 200
```

Это дает gross reward:

- Core: около `220%` за 200 дней;
- Elite: около `260%` за 200 дней.

Нужно отдельно подтвердить, является ли это намеренной новой экономикой или ошибкой относительно публичных материалов.

## Что нужно решить

Команде нужно выбрать один из двух путей:

Практический checklist решения вынесен отдельно: `/security/tariff-consistency-decision-packet-ru.md`.

### Вариант A — править контракт

Если публичные тарифы верные, нужно изменить формулы контракта.

Для Lockup при текущих `BP` и `PRECISION` значения должны быть примерно:

| Tier | Current N | Needed N for public rate |
| --- | ---: | ---: |
| Launch | 3 | 30 |
| Momentum | 20 | 200 |
| Premiere | 50 | 500 |
| President | 120 | 1200 |
| Imperium | 225 | 2250 |

Для Daily нужно согласовать code-level daily rates с `0.6%` и `0.8%`.

### Вариант B — править публичные материалы

Если текущая формула контракта верная, нужно изменить White Paper, презентации, FAQ, сайт и все публичные таблицы, чтобы пользователь видел фактическую экономику контракта.

## Рекомендация Security Review

До публичного deployment нельзя считать этот пункт закрытым.

Корректный статус:

```text
Product/contract consistency issue found. Team decision required before deployment.
```

Нельзя запускать публичный battle или публикацию тарифов, пока команда не выбрала и не зафиксировала один источник истины: контракт или публичную экономическую модель.
