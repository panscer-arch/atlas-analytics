# Atlas System — Tariff Consistency Decision Packet

Дата: 2026-06-05  
Статус: обязательное решение перед testnet deployment  
Связанный review: `/security/product-contract-consistency-review-ru.md`

## Зачем нужен этот документ

Этот packet нужен не для рекламы и не для инвесторов. Это внутренний и публично-проверяемый decision gate перед deployment.

Security tools проверяют, может ли код сломаться, пропустить чужой claim или неверно учесть выплату. Но есть отдельный вопрос:

```text
Совпадает ли экономика, которую пользователь видит в материалах,
с экономикой, которую реально исполнит смарт-контракт?
```

Сейчас найдено расхождение. Его нужно закрыть до testnet deployment и до публичного battle.

## Что именно не совпадает

### Lockup Flow

Публичные материалы показывают:

| Tier | Public rate |
| --- | ---: |
| Launch | +0.3% |
| Momentum | +2% |
| Premiere | +5% |
| President | +12% |
| Imperium | +22.5% |

Текущая формула `UnityLockup.sol`:

```text
rewards = (amount * (N * BP)) / PRECISION
BP = 10 ** 21
PRECISION = 10 ** 25
```

Это означает:

```text
N * BP / PRECISION = N / 10000
```

Фактический code-level результат:

| Tier | Current N | Contract rate | Difference |
| --- | ---: | ---: | --- |
| Launch | 3 | +0.03% | public is x10 higher |
| Momentum | 20 | +0.2% | public is x10 higher |
| Premiere | 50 | +0.5% | public is x10 higher |
| President | 120 | +1.2% | public is x10 higher |
| Imperium | 225 | +2.25% | public is x10 higher |

### Daily Flow

Публичные материалы показывают:

| Tier | Public daily rate | Public 200-day result |
| --- | ---: | ---: |
| Core | 0.6% / day | +120% |
| Elite | 0.8% / day | +160% |

Текущий `UnityDaily.sol`:

```text
Core: 110 * BP = 1.1% / day
Elite: 130 * BP = 1.3% / day
DAILY_REWARDS_COUNT = 200
```

Фактический code-level gross result:

| Tier | Contract daily rate | Contract 200-day gross result |
| --- | ---: | ---: |
| Core | 1.1% / day | около +220% |
| Elite | 1.3% / day | около +260% |

## Вариант A — править контракт под публичные материалы

Выбирается, если публичная экономика уже утверждена командой и должна быть источником истины.

### Что нужно изменить в Lockup

При текущих `BP` и `PRECISION` значения `N` должны быть:

| Tier | Current N | Needed N |
| --- | ---: | ---: |
| Launch | 3 | 30 |
| Momentum | 20 | 200 |
| Premiere | 50 | 500 |
| President | 120 | 1200 |
| Imperium | 225 | 2250 |

### Что нужно изменить в Daily

Если публичные ставки `0.6%` и `0.8%` верны, при текущих `BP` и `PRECISION` нужно согласовать значения:

| Tier | Current value | Needed value |
| --- | ---: | ---: |
| Core | `110 * BP` | `60 * BP` |
| Elite | `130 * BP` | `80 * BP` |

### Что проверить после правки контракта

1. `forge build`
2. `forge test -vv`
3. `forge test -vv --fuzz-runs 1000`
4. Повторить Lockup stress-test.
5. Повторить Daily/Transport stress-test.
6. Повторить accounting invariant checks.
7. Повторить Slither / Aderyn / Mythril по финальному коду.
8. Обновить public security reports и кодовые ссылки.
9. Только потом переходить к BNB Testnet deployment.

## Вариант B — править публичные материалы под контракт

Выбирается, если текущая code-level экономика уже утверждена командой и является источником истины.

### Что нужно обновить

1. White Paper.
2. FAQ.
3. SEO / общую презентацию.
4. Сайт.
5. Таблицы тарифов.
6. Все картинки/слайды с доходностью.
7. Тексты для лидеров и партнеров.
8. Любые публичные инструкции по Lockup Flow и Daily Flow.

### Новые публичные значения в этом варианте

Lockup:

| Tier | Public text must say |
| --- | ---: |
| Launch | +0.03% |
| Momentum | +0.2% |
| Premiere | +0.5% |
| President | +1.2% |
| Imperium | +2.25% |

Daily:

| Tier | Public text must say |
| --- | ---: |
| Core | 1.1% / day, около +220% за 200 дней |
| Elite | 1.3% / day, около +260% за 200 дней |

### Что проверить после правки материалов

1. Удалить старые тарифы из всех страниц, презентаций и PDF.
2. Проверить, что нет смешения старых и новых цифр.
3. Обновить Security Review, чтобы он ссылался на утвержденную публичную экономику.
4. Зафиксировать дату решения и ответственного.
5. Только потом переходить к BNB Testnet deployment.

## Что нельзя делать

Нельзя:

- деплоить testnet как “финальную экономику”, пока расхождение не закрыто;
- публиковать старые тарифы и новый контракт одновременно;
- писать, что Security Review закрыт, пока публичная экономика и код не совпадают;
- называть это внешним аудитом;
- обещать пользователю доходность, которую контракт фактически не исполнит.

## Рекомендуемая формулировка статуса

Пока решение не принято:

```text
Product/contract consistency issue found. Team decision required before deployment.
```

После выбора варианта A:

```text
Contract updated to match approved public tariff model. Full security checks must be rerun.
```

После выбора варианта B:

```text
Public materials updated to match current contract tariff model. Full content consistency check must be completed.
```

## Decision checklist

Перед testnet deployment команда должна заполнить:

| Вопрос | Ответ |
| --- | --- |
| Источник истины выбран? | A: контракт под публичные материалы / B: материалы под контракт |
| Кто утвердил решение? | TBD |
| Дата решения | TBD |
| Контракт изменен? | Да / Нет / Не требуется |
| Публичные материалы изменены? | Да / Нет / Не требуется |
| Foundry suite повторен? | Да / Нет |
| Fuzz 1000 повторен? | Да / Нет |
| Stress-tests повторены? | Да / Нет |
| Slither/Aderyn/Mythril повторены? | Да / Нет |
| Security Review обновлен? | Да / Нет |
| Можно переходить к testnet deployment? | Да / Нет |

## Вывод

Это не доказательство взлома и не обвинение контракта. Это найденное несоответствие между публичной экономикой и текущей формулой исполнения.

Чтобы показать прозрачность правильно, Atlas должен не скрывать такой пункт, а зафиксировать его как decision gate и закрыть до deployment.
