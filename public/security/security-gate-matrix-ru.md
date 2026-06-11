# Atlas System — Security Gate Matrix

Дата: 2026-06-11  
Статус: рабочая матрица закрытия шагов  
Формулировка статуса проекта: `Security Review in progress`

## Зачем нужна эта матрица

Эта матрица отделяет три состояния:

```text
1. Проверка реально выполнена и есть доказательство.
2. Документ / kit подготовлен, но реальное действие еще не проведено.
3. Есть gate, который требует решения команды или внешнего действия.
```

Так пользователю и команде понятно, что уже проверено программами, что переведено на человеческий язык, а что еще нельзя считать закрытым.

## Короткий итог

Локальные security-проверки и mock stress-тесты собраны:

- Foundry suite: `12 tests passed, 0 failed, 0 skipped`;
- Lockup stress: `1000 users / 50000 lockups / 100000 claim attempts`;
- Daily stress: `1000 users / 5000 orders / 10000 claim attempts`;
- Transport stress: `1000 owner claims / 1000 non-owner attempts`;
- Accounting invariants: Lockup, Daily, Transport;
- Mythril bounded bytecode runs: `success=true`, `issues=[]` по 4 core-контрактам;
- Aderyn / Slither / Solhint отчеты опубликованы;
- Testnet Battle Kit, deployment runbook, smoke-test kit и templates подготовлены.

Дополнительно опубликован machine-readable manifest:

```text
/security/security-evidence-manifest.json
```

Локальная команда проверки manifest:

```text
node scripts/verify-security-evidence.mjs
```

Но все шаги еще нельзя считать закрытыми, потому что:

- найден product/contract tariff mismatch;
- BNB Testnet deployment еще не выполнен;
- публичный BNB Testnet Battle Test еще не проведен;
- внешний аудит еще не выполнен.

## Executive gate status

| Направление | Текущий вывод |
| --- | --- |
| Code-level защита от чужого claim | Проверяется и подтверждена текущим набором Foundry access-control/fuzz/stress тестов для текущего среза |
| Авто-анализ | Slither, Solhint, Aderyn и Mythril bounded reports опубликованы |
| Accounting | Lockup, Daily и Transport accounting invariants пройдены в mock-окружении |
| Product/legal consistency | Не закрыто: найден tariff mismatch между публичными материалами и code-level расчетом |
| Owner / Transport powers | Draft раскрытия подготовлен; нужна финальная policy по multisig/timelock/governance |
| Testnet deployment | Подготовлен, но не выполнен |
| Testnet battle | Kit подготовлен, но публичный challenge не проведен |
| External audit | Не начат |

Итог:

```text
Security Review section is ready as a working disclosure and evidence center.
Launch/audit status is not final until tariff decision, testnet deployment, testnet battle and external audit are completed.
```

## Gate Matrix

| Gate | Status | Evidence | Что нужно для закрытия |
| --- | --- | --- | --- |
| Solidity build | Закрыто для текущего среза | `forge build`, Foundry suite прошел | Повторить после финальных правок |
| Access control tests | Закрыто для текущего среза | `/security/foundry-access-control-report-ru.md` | Повторить после финальных правок |
| Fuzz 1000 | Закрыто для текущего среза | `/security/foundry-fuzz-1000-report.txt` | Повторить после финальных правок |
| Lockup stress | Закрыто в mock | `/security/foundry-stress-1000-users-report-ru.md` | Повторить после финальных правок и не путать с real liquidity test |
| Daily / Transport stress | Закрыто в mock | `/security/foundry-daily-transport-stress-report-ru.md` | Повторить после финальных правок |
| Accounting invariants | Закрыто для текущего среза | `/security/foundry-accounting-invariants-report-ru.md` | Повторить после решения tariff gate |
| Tariff machine check | Выполнено, найден mismatch | `/security/tariff-consistency-check-output.json` | Выбрать: править контракт или публичные материалы |
| Product / contract consistency | Не закрыто | `/security/product-contract-consistency-review-ru.md` | Закрыть Tariff Decision Packet |
| Tariff decision packet | Подготовлено, ждет решения | `/security/tariff-consistency-decision-packet-ru.md` | Выбрать Option A или Option B |
| Option A contract patch plan | Подготовлено | `/security/tariff-option-a-contract-patch-plan-ru.md` | Если выбран A: внести patch, повторить проверки, обновить reports |
| Option B content rewrite checklist | Подготовлено | `/security/tariff-option-b-content-rewrite-checklist-ru.md` | Если выбран B: обновить все материалы, tariff-check model и reports |
| Slither | Выполнено для текущего среза | `/security/slither-report.json` | Повторить после финальной версии кода |
| Solhint | Выполнено для текущего среза | `/security/solhint-report.txt` | Повторить после финальной версии кода |
| Aderyn | Выполнено для текущего среза | `/security/aderyn-report.md`, `/security/aderyn-core-report.md` | Повторить после финальной версии кода |
| Mythril bounded | Выполнено для текущего среза | `/security/mythril-transport.json`, `/security/mythril-unitylockup.json`, `/security/mythril-unitydaily.json`, `/security/mythril-positionhandler.json` | Повторить после финальной версии кода |
| Owner powers disclosure | Draft подготовлен | `/security/owner-powers-disclosure-ru.md` | Утвердить policy: EOA / multisig / timelock / governance |
| Public Security Review | Draft подготовлен | `/security/atlas-security-review-v1-ru.md` | Обновить после tariff decision, testnet deployment и battle |
| Testnet Battle Plan | Подготовлено | `/security/testnet-battle-plan-ru.md` | Закрыть tariff gate и выполнить deployment |
| Testnet Deployment Preflight | Выполнено на template, not-ready | `/security/testnet-preflight-output.json`, `/security/preflight-testnet-deployment.mjs.txt` | Заполнить реальные env-значения и закрыть tariff gate |
| Testnet Deployment Runbook | Подготовлено | `/security/testnet-deployment-runbook-ru.md` | Заполнить `.env.testnet`, пройти preflight, подготовить Pancake V3 tokenId и deployer wallet |
| Testnet Smoke Kit | Подготовлено | `/security/testnet-smoke-test-runbook-ru.md`, `/security/smoke-test-registry-readonly.sh.txt` | Выполнить после реального deployment |
| Testnet Registry | Template подготовлен | `/security/testnet-contract-registry-template.json` | Заменить template на реальные адреса, tx hashes и explorer links |
| BNB Testnet Battle Test | Не проведено | Есть kit и templates, но нет участников / tx / final report | Провести challenge 3-7 дней, собрать reports, triage, final report |
| External audit | Не проведено | Нет внешнего audit report | Заказать внешний аудит и опубликовать отчет |

## Что можно говорить сейчас

Корректная формулировка:

```text
Atlas System проходит Security Review. Автоматические отчеты, Foundry-тесты, fuzz/stress-проверки, accounting invariants и human-readable summaries опубликованы. Часть проверок закрыта для текущего среза кода, но перед deployment нужно закрыть тарифное расхождение, testnet deployment, testnet battle и внешний аудит.
```

## Что нельзя говорить сейчас

Нельзя писать:

```text
Audited
100% secure
Impossible to hack
Battle-tested
External audit completed
Tariffs fully match the contract
```

## Следующий реальный шаг

Главный gate сейчас:

```text
Product / contract tariff mismatch.
```

Команда должна выбрать один из двух вариантов:

1. Править контракт под публичные тарифы.
2. Править публичные материалы под текущий контракт.

После решения нужно повторить:

1. `forge build`
2. `forge test -vv`
3. `forge test -vv --fuzz-runs 1000`
4. Lockup stress
5. Daily / Transport stress
6. Accounting invariants
7. Slither / Aderyn / Mythril
8. Public Security Review update

Только после этого переходить к BNB Testnet deployment.
