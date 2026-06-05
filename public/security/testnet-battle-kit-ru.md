# Atlas System — BNB Testnet Battle Kit

Версия: V1  
Дата: 2026-06-05  
Статус: комплект подготовлен, публичное испытание еще не проведено

## Зачем нужен этот комплект

BNB Testnet Battle Test — это следующий внешний этап проверки Atlas System. Его задача — дать независимым участникам testnet-среду, адреса контрактов, тестовые токены и понятные правила, чтобы они могли попытаться воспроизвести реальный exploit.

До фактического запуска нельзя писать `battle-tested` или `testnet battle passed`. Корректная формулировка сейчас:

```text
Testnet Battle Kit готов. Само публичное испытание будет проведено после deployment, публикации адресов и набора участников.
```

## Что входит в комплект

1. Deployment checklist — что нужно сделать перед запуском.
2. Contract registry template — какие адреса и параметры публикуются.
3. Deployment runbook — как развернуть testnet-контракты через Foundry.
4. Env template — какие переменные нужны для BNB Testnet.
5. Deploy script — технический скрипт `forge create`.
6. Smoke-test runbook — как проверить deployment перед challenge.
7. Smoke-test script — read-only проверка registry.
8. Participant guide — инструкция для внешних участников.
9. Bug report template — как подать воспроизводимый exploit-report.
10. Final report template — как оформить итоги после завершения.

## Минимальные условия запуска

1. BNB Testnet RPC URL.
2. Deployer wallet с test BNB.
3. Mock USDT / test token для участников.
4. Testnet-версии `UnityLockup`, `UnityDaily`, `Transport`.
5. Pancake V3 testnet position или явно описанный mock-LP режим.
6. Публичный registry с адресами контрактов и explorer-ссылками.
7. Правила bounty и окно приема отчетов.
8. Контакт или форма для submission.

## Порядок запуска

1. Развернуть testnet-контракты.
2. Verify source code в explorer, если это технически возможно.
3. Заполнить contract registry.
4. Выполнить read-only smoke-test.
5. Выполнить transaction smoke-test.
6. Опубликовать ABI, адреса и правила challenge.
7. Выдать участникам test tokens.
8. Открыть прием отчетов.
9. Принимать только воспроизводимые баги с tx hash и шагами.
10. Провести triage: подтвердить, отклонить или запросить уточнение.
11. После завершения опубликовать final report.

## Что проверяют участники

- Чужой claim.
- Повторный claim.
- Вывод больше разрешенной суммы.
- Обход owner-only ограничений.
- Ошибки reward/fee учета.
- DoS-сценарии для claim.
- Зависимость выплат от LP / testnet-ликвидности.

## Что можно говорить до запуска

- `BNB Testnet Battle Test prepared`
- `Testnet Battle Kit prepared`
- `Публичное испытание подготовлено к запуску`

## Что нельзя говорить до запуска и финального отчета

- `Battle-tested`
- `Testnet battle passed`
- `External users confirmed security`
- `Bounty completed`
- `Exploit impossible`
