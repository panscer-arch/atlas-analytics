# Atlas System Security Review Index

Status: Security Review in progress
Date: 2026-06-05

Этот индекс объясняет, какие материалы уже собраны по проверке безопасности Atlas System.

## Что уже доступно

1. Atlas Security Review V1 RU
   Рабочий документ с разделением взломоустойчивости, архитектурных рисков, owner-полномочий и следующих этапов проверки.

2. Public Security Text RU
   Безопасные публичные формулировки для сайта, FAQ и коммуникации с партнерами.

3. Code Safety Summary RU
   Короткая читаемая версия для сайта, лидеров и внутренней вычитки: что именно делает код безопаснее, что можно сказать сейчас и что нельзя обещать.

4. Slither Report
   Машинный отчет автоматического анализа Solidity-кода.

5. Solhint Report
   Отчет по качеству Solidity-кода, стилю, предупреждениям компилятора и технической гигиене.

6. Owner Powers Disclosure RU
   Отдельное раскрытие owner-полномочий: treasury, fee, tokenId, Transport, риски и рекомендуемые меры контроля.

7. Foundry Access Control Report RU
   Читаемый отчет по Foundry-тестам: чужой Lockup/Daily claim, повторный Lockup claim, owner-only Transport и fuzz-сценарии.

8. Foundry Fuzz 1000 Report
   Машинный отчет отдельного прогона `forge test -vv --fuzz-runs 1000`.

9. Foundry Stress 1000 Users Report
   Human-readable и машинный отчет: 1000 пользователей, 50000 Lockup-ордеров, 100000 claim-попыток в mock-окружении.

10. Foundry Daily/Transport Stress Report
   Human-readable отчет: Daily Flow на 1000 пользователей / 5000 ордеров / 10000 claim-попыток и Transport на 1000 owner-claim / 1000 non-owner попыток.

11. Aderyn Reports
   Полный Aderyn report, core Aderyn report и human-readable summary по найденным сигналам.

12. Testnet Battle Test Plan RU
   План публичного BNB Testnet challenge. Сам challenge еще не проведен.

13. Testnet Battle Kit RU
   Рабочий комплект для запуска BNB Testnet Battle Test: условия, порядок запуска, публичные формулировки и границы статуса.

14. Testnet Contract Registry Template
   JSON-шаблон для deployment-адресов, explorer-ссылок, ABI, owner-значений, LP-параметров и smoke-test транзакций.

15. Testnet Deployment Runbook RU
   Технический порядок testnet deployment: env-переменные, Pancake V3 tokenId, `forge create`, generated registry и smoke-check.

16. Testnet Deploy Script
   Bash-скрипт для deploy `UnityLockup`, `UnityDaily` и `Transport` на BNB Testnet.

17. Testnet Env Template
   Шаблон `.env.testnet` без секретов: RPC, deployer key, main token, Pancake V3 tokenId, treasury и platform fee.

18. Testnet Participant Guide RU
   Инструкция для внешних участников: что проверять, что считается валидным report и какие severity-уровни использовать.

19. Testnet Bug Report Template RU
   Шаблон воспроизводимого exploit-report: tx hashes, шаги, expected/actual behavior, impact и severity.

20. Testnet Final Report Template RU
   Шаблон итогового отчета после challenge: участники, адреса, сценарии, findings, remediation и финальная формулировка.

21. Mythril Results
   Ограниченные bytecode-прогоны Transport, UnityLockup, UnityDaily и PositionHandler: success=true, issues=[]. Это не заменяет полный аудит.

## Важно

Эти материалы не являются полноценным внешним аудитом и не дают гарантии отсутствия рисков. Они фиксируют запущенный процесс проверки и помогают отделить безопасность кода от архитектурных полномочий системы.

## Текущий статус по этапам

1. Aderyn / Mythril по всем контрактам — выполнено для текущего среза.
   Mythril bounded-прогон выполнен по Transport, UnityLockup, UnityDaily и PositionHandler: success=true, issues=[]. Aderyn 0.6.8 выполнен по всем файлам и отдельно по core-контрактам.

2. Foundry access-control tests — частично сделано.
   Foundry suite пройден: 9/9. Отдельный прогон `--fuzz-runs 1000` пройден. Lockup stress-test, Daily stress-test и Transport stress-test пройдены в mock-окружении. LP-testnet и финальные invariant-тесты по экономической модели еще нужно расширить.

3. Большой fuzzing / stress-сценарии — частично сделано.
   Lockup stress, Daily stress и Transport stress пройдены локально в mock-окружении. Это не заменяет testnet battle и реальную Pancake V3 ликвидность.

4. BNB Testnet battle test — подготовлено / не проведено.
   Battle Kit, deployment runbook, env template, deploy script, registry template, participant guide, bug report template и final report template подготовлены. Публичный challenge на 100-200 человек с bounty за воспроизводимый exploit еще не запускался.

5. Публичный Security Review и owner-документ — подготовлено.
   Публичный Security Review draft собран. Owner Powers Disclosure оформлен как отдельный документ для вычитки.

6. Внешний аудит — не сделано.
   Статус `Audited` можно использовать только после внешнего аудита.
