# Atlas Admin Finance: START HERE

Это канонический вход в проект. Его нужно читать перед каждой новой задачей по
финансовой админке вместе с `CURRENT-STATE.md`, `MVP-PLAN.md` и
`../spec/09-PARTNER-RULESET-SOURCE-AUDIT.md` для задач Partner Program,
Head Account, Participants и Company Revenue.

## Цель

Собрать рабочую внутреннюю финансово-аналитическую админку Atlas, которая
показывает подтверждённые потоки, циклы, ликвидность и будущие обязательства.
Это не публичный кабинет, не бухгалтерская отчётность и не набор красивых demo
экранов.

## Репозиторий и маршруты

- код: `/Users/digitex/Desktop/Проект2/atlas-admin-analytics-app`;
- frontend: `src/modules/admin-finance`;
- Admin API: `server/admin-finance-api.mjs`;
- спецификация: `docs/admin-finance/spec`;
- полный продукт: 14 маршрутов, перечисленных в `manifest.json`;
- первый внутренний Alpha/MVP: 5 маршрутов — Reconciliation, Flows,
  Liquidity, Cycles и Claims;
- Forecast сначала появляется как доказуемый календарь максимальных
  обязательств внутри Cycles/Claims, затем становится отдельным экраном;
- Overview собирается только после сверки нижележащих показателей.

## Зафиксированные бизнес-правила

1. По публичному ruleset `atlas-level-2026-08-12`: Lockup Partner Reward
   выплачивается на 100% при создании; Daily — 20% при создании и 80%
   равными долями за 200 дней. Ставка фиксируется при создании цикла.
2. Partner Reward — отдельный расход сверх Delta.
3. Platform Fee удерживается внутри соответствующей Gross-суммы и не
   прибавляется к cash outflow второй раз.
4. Forecast включает Principal, Gross Delta, все scheduled Partner Reward
   по ruleset и только неисполненную часть at Creation.
5. Forecast последовательно уменьшает доступный balance по bucket, учитывает
   reserve, peak exposure и первую дату funding gap.
6. Cycle end/eligibility и фактический Claim — разные даты и показатели.
7. Compression gap считается только между ставками одной версии ruleset;
   денежный Head Account Income признаётся только по finalized transfer.

## Иерархия доверия к данным

Актуальные публичные правила, FAQ и Partner Program сверяются с
`https://atlas-system.tech/`, подтвержденным владельцем продукта 2026-08-14.
Фактическое финансовое исполнение по-прежнему подтверждается on-chain и ledger.

1. Независимо индексированные finalized on-chain events и проверяемое состояние
   контрактов.
2. Внутренний versioned ledger с reconciliation до event/receipt/transfer.
3. `data.atlas-system.io` как внешний provider только через серверный адаптер,
   schema validation, quarantine и reconciliation.
4. Dune — независимый контроль, но не source of truth.
5. GA4 — только маркетинговая воронка, не финансовый ledger.

Каждый live-ответ обязан иметь cut time, as-of block/hash, freshness,
formula/ruleset version и reconciliation status. При отсутствии этих полей UI
показывает `Недоступно`, а не ноль и не fixture.

## Правило выпуска

- `DEMO` разрешён только локально и явно подписан.
- В production источник по умолчанию отключён и работает fail closed.
- Первый релиз read-only, доступен только администрации и явно помечен
  `INTERNAL ALPHA · PARTIAL`, пока Gate 0 не закрыт.
- Нельзя подключать exports, reveal wallet, корректировки и правила до RBAC,
  MFA step-up и audit backend.
- Сначала внутренний MVP, затем расширение блоками по `MVP-PLAN.md`.

## Обязательный порядок каждой следующей работы

1. Прочитать три файла project memory и `git status --short`.
2. Назвать текущий этап и конкретный acceptance criterion.
3. Работать только в границах этапа; новые идеи записывать в backlog.
4. Обновить `CURRENT-STATE.md` и `CHANGELOG.md`.
5. Запустить `npm run test:admin-finance`, build и UI QA затронутых маршрутов.
6. Не заявлять deploy без проверки фактического URL и реальных данных.
