# Atlas Admin Finance: правила продолжения

## Исходная задача

Собрать полноценную внутреннюю финансово-аналитическую админку Atlas, а не
изолированный экран и не универсальный SaaS-шаблон. Продукт охватывает все 14
разделов из реестра маршрутов и отдельное ТЗ для реализации.

## Порядок работы с экранами

Каждый экран проходит этапы строго по очереди:

1. `DRAFT` — продуктовая структура и финансовый смысл.
2. `PRODUCT APPROVED` — пользователь явно согласовал desktop и mobile.
3. `FIGMA APPROVED` — утверждены frame/node, состояния и адаптив.
4. `IMPLEMENTED` — React соответствует утверждённому Figma и API-контракту.
5. `QA PASSED` — проверены desktop/mobile, клавиатура, ошибки, unavailable и
   demo/API boundaries.

Без явного согласования нельзя использовать слово `approved`. HTML-to-Figma
capture — только черновик и не превращает React-прототип в дизайн-источник.

## Финансовые границы

- `atlas_consolidated`: внешние входящие/исходящие потоки после исключения
  внутренних переводов.
- `payout_contract`: cash balance, gross выплаты, reserve и funding gap.
- `company_treasury`: фактически полученный доход компании и расходы treasury.
- `participant_economics`: продуктовая аналитика Principal, Delta и Partner
  Reward; это не cash balance.
- Platform Fee находится внутри Gross Delta/Gross Partner Reward и не
  прибавляется к потребности в ликвидности второй раз.
- Forecast: 24h/7d/30d/90d, Principal, Gross Delta, Partner Reward streamed,
  Pending Partner Reward at Creation, reserve, peak и первая дата дефицита.

## Источники и доверие

- internal ledger и independently indexed on-chain evidence — основа расчёта;
- `data.atlas-system.io` принимается только через versioned contract, quarantine
  и reconciliation;
- Dune — независимый контрольный источник, не source of truth;
- GA4 — только маркетинговая воронка, не финансовый ledger;
- DEMO/fixtures не маркируются как `LIVE`, `FACT`, `FINAL`, `AUDITED` или
  `RECONCILED`.

## Stop conditions

Figma и production integration останавливаются при незакрытом Gate 0,
противоречии формул/периметров, незащищённом экспорте/reveal, отсутствии
reconciliation или неподтверждённом mobile shell. Сборка и HTTP 200 сами по себе
не являются допуском.
