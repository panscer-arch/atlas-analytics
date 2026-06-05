# Atlas System — Option B Content Rewrite Checklist

Дата: 2026-06-05  
Статус: draft для команды  
Назначение: привести публичные материалы к текущему контракту

## Когда выбирать Option B

Option B выбирается, если команда подтверждает:

```text
Текущая code-level экономика контракта является источником истины.
Публичные материалы нужно привести к фактическим формулам контракта.
```

## Какие значения должны быть в материалах

### Lockup Flow

| Tier | Public materials must say |
| --- | ---: |
| Launch | +0.03% |
| Momentum | +0.2% |
| Premiere | +0.5% |
| President | +1.2% |
| Imperium | +2.25% |

### Daily Flow

| Tier | Public materials must say |
| --- | ---: |
| Core | 1.1% / day, около +220% за 200 дней |
| Elite | 1.3% / day, около +260% за 200 дней |

## Где нужно заменить старые значения

Проверить и обновить:

1. White Paper.
2. FAQ.
3. Manifest / manifesto references, если там есть экономические обещания.
4. Главную страницу сайта.
5. Раздел Ecosystem / Smart Cycle.
6. Презентацию Atlas System.
7. SEO-презентацию.
8. Все картинки с тарифами.
9. Таблицы доходности.
10. Telegram / pinned materials.
11. Partner scripts для лидеров.
12. Knowledge Hub.
13. Любые PDF на сервере.
14. Любые локальные `.png`, `.pdf`, `.pptx`, где указаны старые тарифы.

## Что искать

Старые значения, которые нельзя оставлять при Option B:

```text
0.3%
2%
5%
12%
22.5%
0.6% в сутки
0.8% в сутки
120% за 200 дней
160% за 200 дней
```

Заменить на code-level значения:

```text
0.03%
0.2%
0.5%
1.2%
2.25%
1.1% в сутки
1.3% в сутки
220% за 200 дней
260% за 200 дней
```

## Какие проверки повторить

После обновления материалов:

```text
node scripts/check-tariff-consistency.js
```

Ожидаемый результат будет показывать mismatch, если script все еще сравнивает код с прежней public model. Поэтому нужно:

1. Обновить public model внутри `check-tariff-consistency.js`.
2. Повторить script.
3. Получить `OK` по Lockup и Daily.
4. Опубликовать новый JSON-output.
5. Обновить Product / Contract Consistency Review.
6. Обновить Gate Matrix.

## Что можно писать после Option B

Только после полной чистки материалов:

```text
Public materials match the current reviewed contract tariff model.
```

Нельзя писать:

```text
Tariffs fully match the contract
```

пока не проверены все публичные страницы, PDF, презентации, FAQ и графические материалы.

## Контрольный чеклист

| Item | Status |
| --- | --- |
| White Paper обновлен | TBD |
| FAQ обновлен | TBD |
| Website обновлен | TBD |
| Presentations обновлены | TBD |
| PDF обновлены | TBD |
| Images / tariff tables обновлены | TBD |
| Telegram pinned materials обновлены | TBD |
| Knowledge Hub обновлен | TBD |
| Public model в tariff-check обновлен | TBD |
| Tariff-check output стал OK | TBD |
| Security Review обновлен | TBD |
| Gate Matrix обновлена | TBD |

## Что остается после Option B

Даже после обновления материалов остаются незакрытыми:

- BNB Testnet deployment;
- testnet smoke-test;
- публичный BNB Testnet Battle Test;
- внешний аудит;
- owner-policy final approval.
