# Ревизия Atlas Admin Finance — 05.08.2026

## Вердикт

`HOLD`: продолжать Figma handoff и называть проект готовым нельзя. Это рабочий
React/data-прототип с сильной предметной основой, но не согласованный дизайн и не
production-аналитика.

## Фактический статус

| Область | Статус |
| --- | --- |
| React routes | 14/14 существуют как интерактивные визуальные прототипы |
| API-backed demo slices | 6: Overview, Flows, Cycles, Forecast, Claims, Participants |
| Methodology | частично читает Gate 0 API; основной registry пока статический |
| Static-only screens | 8: Revenue, Head Account, Liquidity, Traffic, Campaigns, Reconciliation, Risks и большая часть Methodology |
| Production sources | не подключены |
| Gate 0 | 0/14 закрыто |
| Figma | capture drafts для части экранов; product/Figma approval отсутствует |
| Deploy/commit | не выполнялись в рамках ревизии |

## Критические находки

1. Overview смешивал `atlas_consolidated` суммы с подписью Payout Contract.
2. Liquidity называла баланс `spendable`, одновременно вычитая reserve в одном
   месте и сравнивая с ним ещё раз в forecast.
3. Committed forecast получался умножением Stress на 0.82, а не отдельными
   правилами включения обязательств.
4. Forecast не имел отдельного обязательного компонента Pending Partner Reward
   at Creation во всех контрактах данных.
5. Claim lifecycle в DDL и API использовал разные статусы.
6. Поиск по короткому префиксу wallet раскрывал существование и атрибуты
   участника.
7. Demo-экраны использовали доверительные метки `LIVE/FACT/FINAL/AUDITED`.
8. Production build по умолчанию мог показывать static demo.
9. Mobile sidebar перекрывал нижние разделы на коротком viewport; часть controls
   и текста не соответствует размеру регулярного операционного интерфейса.
10. Документы называли 14 маршрутов утверждёнными без журнала согласования.

## Восстановленный объём продукта

- incoming/outgoing/net flow и разбивка по циклам;
- Platform Fee и Head Account revenue;
- ликвидность, reserve, LP отдельно от cash;
- payout forecast 24h/7d/30d/90d;
- claims lifecycle и payout lineage;
- участник/лидер, первая линия, KPI, company funding и notes;
- traffic/GA4 и wallet funnel;
- campaigns/cohorts;
- reconciliation, risk center и methodology;
- отдельный programmer handoff с формулами, API/events, data sources,
  permissions, security и acceptance.

## Исправлено в этой ревизии

- Overview и Liquidity разведены по финансовым контурам и одинаково трактуют
  available balance, reserve и spendable above reserve.
- Выдуманный Committed forecast удалён; до утверждения правил доступен только
  рассчитанный Stress, остальные сценарии fail closed.
- В прогноз, DDL, OpenAPI, CSV и тесты добавлен отдельный компонент Pending
  Partner Reward at Creation.
- Claim lifecycle синхронизирован между DDL и API.
- Частичный wallet prefix больше не раскрывает участника.
- Production build без явной конфигурации источника закрывает финансовые
  экраны, а не включает demo автоматически.
- Доверительные метки на fixtures заменены на `DEMO`/`DRAFT`.
- Mobile sidebar получил прокрутку; исправлена невидимая кнопка закрытия.
- Пройдены contract/API/client checks и production build; desktop/mobile
  screenshots повторно сняты для Overview, Forecast и Liquidity.

## Остаточный риск

- восемь экранов по-прежнему static-only и не готовы к production данным;
- Gate 0 и product approval не закрыты ни для одного экрана;
- дизайн ещё требует сверки с реальным кабинетом Atlas и проверки читаемости
  всех 14 маршрутов;
- production bundle остаётся слишком большим и требует code splitting;
- write-like операции Reconciliation/Risks существуют только как локальная
  демонстрация и не должны подключаться до RBAC, MFA step-up и audit backend.

## Следующая последовательность

1. Устранить P0 financial/data/security противоречия.
2. Согласовать shell + Overview desktop/mobile в реальном языке Atlas.
3. Затем по одному: Forecast, Liquidity, Flows, Cycles, Claims, Participants.
4. После согласования ядра: Revenue, Head Account, Traffic, Campaigns.
5. Последними: Reconciliation, Risks, Methodology и write-like операции.
6. Только после каждого product approval обновлять Figma и фиксировать frame ID.
