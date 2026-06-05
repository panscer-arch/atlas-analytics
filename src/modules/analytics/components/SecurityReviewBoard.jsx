const documentCards = [
  {
    title: "Security Review V1",
    type: "Документ",
    status: "Готов к вычитке",
    description: "Рабочий документ: взломоустойчивость, owner-полномочия, Transport, LP-риски и план проверки.",
    href: "/security/atlas-security-review-v1-ru.md",
    cta: "Открыть документ",
  },
  {
    title: "Code Safety Summary",
    type: "Короткая версия",
    status: "Для сайта / лидеров",
    description: "Читаемая выжимка: что защищено в коде, что можно сказать сейчас и что еще нельзя обещать.",
    href: "/security/code-safety-summary-ru.md",
    cta: "Открыть summary",
  },
  {
    title: "Security Gate Matrix",
    type: "Status matrix",
    status: "Рабочая карта",
    description: "Единая матрица: какие проверки закрыты, какие только подготовлены, какие gates требуют решения перед deployment.",
    href: "/security/security-gate-matrix-ru.md",
    cta: "Открыть matrix",
  },
  {
    title: "Evidence Manifest",
    type: "Machine-readable",
    status: "13 gates / 43 evidence",
    description: "JSON-manifest со статусами gates, evidence-ссылками и незакрытыми условиями: tariff decision, testnet deployment, battle и external audit.",
    href: "/security/security-evidence-manifest.json",
    cta: "Открыть manifest",
  },
  {
    title: "Owner Powers Disclosure",
    type: "Risk disclosure",
    status: "Готов к вычитке",
    description: "Отдельный документ по owner-полномочиям: treasury, fee, tokenId, Transport и меры контроля.",
    href: "/security/owner-powers-disclosure-ru.md",
    cta: "Открыть disclosure",
  },
  {
    title: "Foundry Access Control",
    type: "Тесты",
    status: "6/6 пройдено",
    description: "Чужой Lockup/Daily claim, повторный Lockup claim, owner-only Transport и fuzz-сценарии проверены Foundry.",
    href: "/security/foundry-access-control-report-ru.md",
    cta: "Открыть отчет",
  },
  {
    title: "Foundry Fuzz 1000",
    type: "Fuzzing",
    status: "Пройдено",
    description: "Отдельный прогон с 1000 fuzz-runs по чужому Lockup claim и owner-only Transport.",
    href: "/security/foundry-fuzz-1000-report.txt",
    cta: "Открыть отчет",
  },
  {
    title: "Stress 1000 Users",
    type: "Stress-test",
    status: "Пройдено mock",
    description: "Локальный Foundry stress-test: 1000 пользователей, 50000 Lockup-ордеров, 100000 claim-попыток.",
    href: "/security/foundry-stress-1000-users-report-ru.md",
    cta: "Открыть отчет",
  },
  {
    title: "Daily / Transport Stress",
    type: "Stress-test",
    status: "Пройдено mock",
    description: "Daily: 1000 пользователей, 5000 ордеров, 10000 claim-попыток. Transport: 1000 owner-claim и 1000 non-owner попыток.",
    href: "/security/foundry-daily-transport-stress-report-ru.md",
    cta: "Открыть отчет",
  },
  {
    title: "Accounting Invariants",
    type: "Invariant tests",
    status: "3/3 пройдено",
    description: "Lockup, Daily и Transport accounting: user net payout, treasury fee и изменение amountUnclaimed проверены Foundry.",
    href: "/security/foundry-accounting-invariants-report-ru.md",
    cta: "Открыть отчет",
  },
  {
    title: "Product / Contract Consistency",
    type: "Decision gate",
    status: "Требует решения",
    description: "Сравнение публичных тарифов с code-level формулами Lockup/Daily. Найдено x10 расхождение по Lockup и вопрос по Daily.",
    href: "/security/product-contract-consistency-review-ru.md",
    cta: "Открыть review",
  },
  {
    title: "Tariff Decision Packet",
    type: "Action packet",
    status: "Gate перед deployment",
    description: "Практический пакет решения: править контракт под публичные тарифы или править материалы под фактический код, плюс чеклист повторных проверок.",
    href: "/security/tariff-consistency-decision-packet-ru.md",
    cta: "Открыть packet",
  },
  {
    title: "Option A: Contract Patch",
    type: "Patch plan",
    status: "Draft",
    description: "План правки UnityLockup/UnityDaily под публичные тарифы, ожидаемые значения тестов и список повторных security-проверок.",
    href: "/security/tariff-option-a-contract-patch-plan-ru.md",
    cta: "Открыть option A",
  },
  {
    title: "Option B: Content Rewrite",
    type: "Content checklist",
    status: "Draft",
    description: "Чеклист обновления White Paper, FAQ, сайта, презентаций, PDF и tariff-check под текущую code-level экономику.",
    href: "/security/tariff-option-b-content-rewrite-checklist-ru.md",
    cta: "Открыть option B",
  },
  {
    title: "Tariff Machine Check",
    type: "Program output",
    status: "MISMATCH найден",
    description: "Скрипт читает Solidity-код, достает BP/PRECISION и tier-значения, затем выдает JSON-сравнение с публичными тарифами.",
    href: "/security/tariff-consistency-check-output.json",
    cta: "Открыть output",
  },
  {
    title: "Aderyn Core Report",
    type: "Static analysis",
    status: "Запущен",
    description: "Aderyn 0.6.8 по core-контрактам: 4 файла, 448 nSLOC, 2 High и 6 Low сигналов для ручной проверки.",
    href: "/security/aderyn-core-report.md",
    cta: "Открыть отчет",
  },
  {
    title: "Aderyn Human Summary",
    type: "Перевод",
    status: "Готов к вычитке",
    description: "Перевод сигналов Aderyn на обычный язык: что является риском, что требует review, что не является exploit-доказательством.",
    href: "/security/aderyn-human-summary-ru.md",
    cta: "Открыть summary",
  },
  {
    title: "Testnet Battle Plan",
    type: "План",
    status: "План готов",
    description: "План публичного BNB Testnet challenge: сценарии, bounty-уровни, правила приема воспроизводимых exploit-отчетов.",
    href: "/security/testnet-battle-plan-ru.md",
    cta: "Открыть план",
  },
  {
    title: "Testnet Battle Kit",
    type: "Комплект запуска",
    status: "Подготовлено",
    description: "Рабочий пакет для запуска challenge: условия, порядок запуска, допустимые формулировки и границы публичного статуса.",
    href: "/security/testnet-battle-kit-ru.md",
    cta: "Открыть kit",
  },
  {
    title: "Contract Registry",
    type: "Шаблон",
    status: "Ждет deployment",
    description: "JSON-шаблон для публичных адресов testnet-контрактов, explorer-ссылок, ABI, owner-значений и smoke-test транзакций.",
    href: "/security/testnet-contract-registry-template.json",
    cta: "Открыть JSON",
  },
  {
    title: "Deployment Runbook",
    type: "Runbook",
    status: "Подготовлено",
    description: "Технический порядок testnet deployment: env-переменные, Pancake V3 tokenId, forge create, registry и smoke-check.",
    href: "/security/testnet-deployment-runbook-ru.md",
    cta: "Открыть runbook",
  },
  {
    title: "Deploy Script",
    type: "Script",
    status: "Готов к запуску",
    description: "Bash-скрипт для deploy UnityLockup, UnityDaily и Transport на BNB Testnet через forge create.",
    href: "/security/deploy-testnet-battle.sh.txt",
    cta: "Открыть script",
  },
  {
    title: "Env Template",
    type: "Template",
    status: "Подготовлено",
    description: "Шаблон `.env.testnet`: RPC, deployer key, main token, Pancake V3 tokenId, treasury и platform fee.",
    href: "/security/testnet-env-example.txt",
    cta: "Открыть env",
  },
  {
    title: "Testnet Preflight",
    type: "Readiness check",
    status: "not-ready",
    description: "Проверка перед deployment: обязательные env-переменные, формат адресов, tokenId, platformFee и открытый tariff gate.",
    href: "/security/testnet-preflight-output.json",
    cta: "Открыть output",
  },
  {
    title: "Smoke Test Runbook",
    type: "Runbook",
    status: "Подготовлено",
    description: "Read-only и transaction smoke-test после deployment: bytecode, owner/treasury/tokenId, create/claim/revert сценарии.",
    href: "/security/testnet-smoke-test-runbook-ru.md",
    cta: "Открыть smoke",
  },
  {
    title: "Smoke Test Script",
    type: "Script",
    status: "Готов к запуску",
    description: "Read-only script для проверки registry: bytecode и публичные параметры контрактов на BNB Testnet.",
    href: "/security/smoke-test-registry-readonly.sh.txt",
    cta: "Открыть script",
  },
  {
    title: "Participant Guide",
    type: "Инструкция",
    status: "Подготовлено",
    description: "Что должен проверить внешний участник: чужой claim, double claim, owner-only, accounting, LP и DoS-сценарии.",
    href: "/security/testnet-participant-guide-ru.md",
    cta: "Открыть guide",
  },
  {
    title: "Bug Report Template",
    type: "Шаблон",
    status: "Подготовлено",
    description: "Форма для воспроизводимого exploit-report: tx hashes, шаги, ожидаемое и фактическое поведение, impact и severity.",
    href: "/security/testnet-bug-report-template-ru.md",
    cta: "Открыть шаблон",
  },
  {
    title: "Final Report Template",
    type: "Шаблон итогов",
    status: "Ждет challenge",
    description: "Структура финального отчета после testnet battle: участники, адреса, проверенные сценарии, подтвержденные findings и вывод.",
    href: "/security/testnet-final-report-template-ru.md",
    cta: "Открыть шаблон",
  },
  {
    title: "Public Security Text",
    type: "Публичный текст",
    status: "Для сайта / FAQ",
    description: "Безопасные формулировки без слов Audited, 100% secure, guaranteed и других опасных обещаний.",
    href: "/security/public-security-text-ru.md",
    cta: "Открыть текст",
  },
  {
    title: "Slither Report",
    type: "Auto-analysis",
    status: "Запущен",
    description: "Машинный отчет Solidity-анализатора. Нужен security-специалисту для ручной фильтрации сигналов.",
    href: "/security/slither-report.json",
    cta: "Скачать JSON",
  },
  {
    title: "Solhint Report",
    type: "Code quality",
    status: "Запущен",
    description: "Предупреждения по стилю, NatSpec, imports, compiler-version и технической гигиене Solidity-кода.",
    href: "/security/solhint-report.txt",
    cta: "Открыть отчет",
  },
  {
    title: "Mythril Transport",
    type: "Bytecode check",
    status: "Пройдено bounded",
    description: "Ограниченный bytecode-прогон: success=true, issues=0. Также подготовлены отчеты по UnityLockup, UnityDaily и PositionHandler.",
    href: "/security/mythril-transport.json",
    cta: "Открыть результат",
  },
  {
    title: "Mythril UnityLockup",
    type: "Bytecode check",
    status: "Пройдено bounded",
    description: "Ограниченный Mythril-прогон UnityLockup bytecode: success=true, issues=0. Не заменяет внешний аудит.",
    href: "/security/mythril-unitylockup.json",
    cta: "Открыть JSON",
  },
  {
    title: "Mythril UnityDaily",
    type: "Bytecode check",
    status: "Пройдено bounded",
    description: "Ограниченный Mythril-прогон UnityDaily bytecode: success=true, issues=0. Не заменяет invariant fuzzing.",
    href: "/security/mythril-unitydaily.json",
    cta: "Открыть JSON",
  },
  {
    title: "Review Index",
    type: "Навигация",
    status: "Для команды",
    description: "Короткий индекс: какой файл зачем нужен и что уже можно показывать внутри команды.",
    href: "/security/security-review-index-ru.md",
    cta: "Открыть индекс",
  },
];

const verificationSteps = [
  {
    title: "1. Сначала смотрим кодовые защиты",
    text: "Есть ли проверка владельца ордера, защита от повторного claim, reentrancy-защита и безопасные ERC20-операции.",
  },
  {
    title: "2. Потом сверяем автоотчеты",
    text: "Slither, Solhint и Mythril не дают рекламный статус, но показывают, что код уже прогоняется через security-инструменты.",
  },
  {
    title: "3. Затем доказываем сценариями",
    text: "Главные тесты: чужой claim, двойной claim, превышение суммы, owner-only Transport и корректность учета выплат.",
  },
  {
    title: "4. Только потом даем публичный статус",
    text: "Пока корректно писать: Security Review in progress. Audited можно писать только после полноценного внешнего аудита.",
  },
];

const reviewRoles = [
  {
    role: "Project Lead",
    verdict: "Показываем не обещания, а проверяемые факты.",
    note: "Пользователь должен сразу увидеть: какие защиты уже есть в коде, какие отчеты доступны и что еще не завершено.",
    action: "Главный статус: базовая кодовая защита проверяется, полный аудит еще не заявляется.",
  },
  {
    role: "Security Expert",
    verdict: "Нельзя смешивать защиту кода и полномочия владельца.",
    note: "Код может иметь защиту от чужого claim, но при этом система может иметь owner-функции. Это разные типы риска.",
    action: "Показывать отдельно: external attack protection и owner powers disclosure.",
  },
  {
    role: "Content",
    verdict: "Писать как для человека без Web3-опыта.",
    note: "Не начинать с названий инструментов. Начать с вопроса: может ли чужой человек забрать не свое?",
    action: "Все термины объяснять через бытовой смысл: чей ордер, чей доступ, кто может вызвать действие.",
  },
  {
    role: "Legal",
    verdict: "Нельзя писать абсолютные гарантии.",
    note: "Корректная позиция: в коде есть защитные механизмы, проверка запущена, часть этапов еще в работе.",
    action: "Отдельно закрепить дисклеймер для сайта и презентаций.",
  },
  {
    role: "Marketing",
    verdict: "Доверие строится через прозрачность.",
    note: "Формулировка должна звучать уверенно: мы не прячем риски, а показываем, как они проверяются.",
    action: "Для сайта: Код проверяется. Отчеты доступны. Следующий этап опубликован.",
  },
  {
    role: "Design",
    verdict: "Сначала ответ, потом доказательства.",
    note: "Верх страницы должен отвечать на вопрос, ниже идут доказательства, затем документы и технические детали.",
    action: "Сделать блоки: что защищено, чем доказано, что еще не доказано.",
  },
];

const programEvidence = [
  {
    program: "Slither",
    status: "Отчет получен",
    report: "/security/slither-report.json",
    command: "slither . --solc-remaps @openzeppelin=node_modules/@openzeppelin --via-ir --optimize --json slither-report.json",
    output: "Программа выдала 265 findings. Основные сигналы для ручной проверки: Transport-события, return values, compiler warnings, LP/PositionHandler и отдельные места claim-логики.",
    human:
      "Это не означает, что код взломан. Это означает: автоматическая программа нашла места, которые security-специалист обязан проверить руками. Самое важное для обычного человека: чужой claim проверяется отдельно от owner-полномочий.",
  },
  {
    program: "Foundry build",
    status: "Сборка пройдена",
    report: "/security/code-safety-summary-ru.md",
    command: "forge build",
    output: "Проект собран через solc 0.8.20, via_ir=true. Контракты компилируются, критической ошибки сборки нет.",
    human:
      "Это базовая техническая проверка: код можно собрать как смарт-контракт. Это еще не аудит, но без успешной сборки дальнейшая проверка безопасности невозможна.",
  },
  {
    program: "Mythril",
    status: "Bounded-прогон по 4 контрактам",
    report: "/security/mythril-transport.json",
    command: "myth analyze -f <contract-bytecode.hex> --execution-timeout 120 --max-depth 22 --no-onchain-data -o json",
    output: "Для Transport, UnityLockup, UnityDaily и PositionHandler bytecode программа вернула success=true, issues=[] в ограниченном прогоне.",
    human:
      "В этом конкретном ограниченном прогоне Mythril не нашел exploit-сигналы в четырех основных контрактах. Это хороший технический сигнал, но не финальное доказательство безопасности и не внешний аудит.",
  },
  {
    program: "Foundry tests",
    status: "12/12, fuzz до 1000 runs",
    report: "/security/foundry-access-control-report-ru.md",
    command: "forge test -vv",
    output: "Пройдены 12 тестов: access-control/fuzz, Lockup stress, Daily stress, Transport stress и accounting invariant checks в mock-окружении.",
    human:
      "Это подтверждает базовую защиту доступа, массовые mock-сценарии и базовый учет выплат: чужой claim блокируется, повторные claim блокируются, Transport закрыт owner-проверкой, user/treasury суммы сходятся.",
  },
  {
    program: "Aderyn",
    status: "Отчет получен",
    report: "/security/aderyn-human-summary-ru.md",
    command: "aderyn . --src contracts --path-includes contracts/Transport.sol,contracts/UnityDaily.sol,contracts/UnityLockup.sol,contracts/PositionHandler.sol --output aderyn-core-report.md",
    output: "Core-прогон: 4 Solidity files, 448 nSLOC, 2 High и 6 Low сигналов. Полный прогон: 20 файлов, 1233 nSLOC, 3 High и 8 Low сигналов.",
    human:
      "Aderyn не подтвердил 'все безопасно'. Он дал список мест для ручной проверки: owner-полномочия, deployment-внешние вызовы, quality-сигналы и интерпретацию lockup-функций.",
  },
  {
    program: "Solhint",
    status: "Отчет получен",
    report: "/security/solhint-report.txt",
    command: "solhint 'contracts/**/*.sol' > solhint-report.txt",
    output: "Программа выдала предупреждения по стилю, NatSpec, imports, compiler-version и технической гигиене Solidity-кода.",
    human:
      "Это проверка качества кода. Она не отвечает напрямую на вопрос 'украдут ли деньги', но помогает привести код к стандарту, чтобы security-review был чище и понятнее.",
  },
];

const externalTrustGaps = [
  {
    title: "Публичный репозиторий",
    status: "Нужно опубликовать",
    why: "Без исходного кода внешний человек не сможет самостоятельно прогнать Slither, Foundry или Mythril и сверить наши выводы.",
    next: "Добавить ссылку на GitHub / verified source до публичного статуса.",
  },
  {
    title: "Адрес deployed-контракта",
    status: "Runbook готов / ждет deployment",
    why: "Пользователь должен иметь возможность открыть контракт в BscScan и убедиться, что проверяемый код соответствует работающей версии. Для этого подготовлены deployment runbook, env template, deploy script, registry template и smoke-test kit.",
    next: "Заполнить `.env.testnet`, подготовить Pancake V3 testnet tokenId, развернуть контракты, выполнить smoke-test и заменить template на публичный registry с адресами и tx hash.",
  },
  {
    title: "Product / contract consistency",
    status: "Требует решения",
    why: "Accounting invariant test подсветил расхождение: публичные Lockup тарифы в white paper в 10 раз выше текущей code-level формулы. Daily Flow также требует сверки публичных 0.6/0.8% с текущими 1.1/1.3% в коде.",
    next: "Открыть Tariff Decision Packet, выбрать источник истины, повторить проверки после правки и только потом переходить к deployment.",
  },
  {
    title: "Полные прогоны Mythril / Aderyn",
    status: "Выполнено для текущего среза",
    why: "Mythril bounded-прогон опубликован по Transport, UnityLockup, UnityDaily и PositionHandler. Aderyn 0.6.8 выполнен по всем контрактам и отдельно по core-файлам.",
    next: "Повторить прогоны после финальных правок кода и deployment-адресов.",
  },
  {
    title: "Invariant tests и fuzzing",
    status: "Mock invariants пройдены",
    why: "Foundry проверил чужой claim, повторный claim, owner-only Transport, 2 fuzz-сценария с 1000 runs, Lockup/Daily/Transport stress и accounting invariants. Общий suite: 12/12.",
    next: "Расширить проверку на реальную Pancake V3 testnet-ликвидность и публичный BNB Testnet battle.",
  },
  {
    title: "Owner control policy",
    status: "Draft подготовлен",
    why: "Owner-полномочия — это не внешний взлом, но это важный архитектурный риск. Нужны multisig/timelock или честное раскрытие текущей модели.",
    next: "Вычитать owner-powers disclosure и принять финальную policy: EOA, multisig, timelock или governance.",
  },
  {
    title: "Testnet battle test",
    status: "Kit готов / не проведен",
    why: "Публичное testnet-испытание показывает, что сценарии проверяются не только командой, но и внешними участниками.",
    next: "Запустить deployment runbook, заполнить registry, выдать test tokens, открыть challenge window и после triage выпустить final report.",
  },
];

const safetyClaims = [
  {
    title: "Чужой claim закрыт проверкой владельца",
    status: "Проверено вручную",
    level: "strong",
    plain: "Посторонний адрес не должен иметь возможность запросить выплату по чужому ордеру.",
    proof: "В UnityLockup.claim и UnityDaily.claim есть проверка владельца ордера: действие доступно только адресу owner.",
  },
  {
    title: "Повторный claim ограничен логикой ордера",
    status: "Проверено вручную",
    level: "strong",
    plain: "Один и тот же lockup-ордер не должен быть выведен повторно.",
    proof: "В UnityLockup используется notClaimed, а в Daily логика опирается на started, lastClaimed и лимит периодов.",
  },
  {
    title: "Пользовательские операции защищены от reentrancy",
    status: "Базовая защита есть",
    level: "strong",
    plain: "Контракт снижает риск повторного входа во время lockup/claim.",
    proof: "Ключевые пользовательские lockup и claim используют nonReentrant. Transport нужно привести к такому же стандарту.",
  },
  {
    title: "ERC20-переводы идут через SafeERC20",
    status: "Проверено вручную",
    level: "strong",
    plain: "Работа с токеном выполняется через безопасные helper-функции, а не через голые transfer-вызовы.",
    proof: "В контрактах используются SafeERC20-операции, что снижает риск ошибок при нестандартном поведении токена.",
  },
  {
    title: "Owner-функции вынесены как отдельный риск",
    status: "Раскрыть публично",
    level: "caution",
    plain: "Это не внешний взлом, а управленческие полномочия системы.",
    proof: "Treasury, fee, tokenId и Transport относятся к owner-полномочиям. Их нужно описывать отдельно от взломоустойчивости.",
  },
  {
    title: "LP-логика требует дополнительных тестов",
    status: "Следующий этап",
    level: "pending",
    plain: "Исполнение выплат зависит не только от кода claim, но и от состояния Pancake V3 LP-позиции.",
    proof: "Нужны slippage/min-output правила, stress-test LP-позиции и мониторинг доступности claim.",
  },
];

const trustLadder = [
  ["Можно сказать сейчас", "В коде есть базовые защитные механизмы: проверка владельца ордера, защита пользовательских claim от reentrancy, SafeERC20 и owner-only ограничения. Foundry suite 12/12, fuzz 1000 runs, mock stress и accounting invariants пройдены."],
  ["Нужно говорить честно", "Это Security Review in progress, а не внешний аудит. Автоотчеты, Aderyn, Mythril, Foundry fuzz и локальный stress-test собраны, Testnet Battle Kit подготовлен, но публичный battle еще не проведен."],
  ["Нельзя говорить сейчас", "Нельзя писать Audited, 100% secure, невозможно взломать, выплаты гарантированы или участие без риска."],
  ["Что даст сильный статус", "Invariant tests, fuzzing, testnet battle test и отдельный документ по owner-полномочиям."],
];

const securityChecks = [
  ["Access Control", "Проверяем, что посторонний адрес не может вызвать claim по чужому ордеру или выполнить owner-действия.", "12/12 Foundry"],
  ["Reentrancy", "Проверяем повторные вызовы и сценарии, где внешний контракт пытается вмешаться в выполнение операции.", "В работе"],
  ["Claim Logic", "Проверяем, что пользователь не может запросить больше суммы, разрешенной правилами выбранного цикла.", "Нужны инварианты"],
  ["Transport Logic", "Отдельно описываем административный модуль исполнения и границы его полномочий.", "Раскрыть публично"],
  ["LP / Pancake V3", "Проверяем зависимость выплат от LP-position, ликвидности, tick-диапазона и правил вывода.", "Нужен stress-test"],
  ["Owner Powers", "Фиксируем, какие параметры может менять владелец, и какие меры контроля нужны: multisig, timelock, события.", "Risk disclosure"],
];

const publicTexts = [
  {
    title: "Для главной страницы",
    text: "Atlas System проходит многоэтапную проверку безопасности: автоматический анализ, ручной review, инвариантные тесты, fuzzing и тестирование в testnet. Мы отдельно показываем безопасность кода и отдельно раскрываем архитектурные полномочия системы.",
  },
  {
    title: "Для FAQ",
    text: "Мы не называем систему абсолютно безрисковой. Вместо этого показываем, какие проверки уже запущены, какие зоны риска изучаются и какие дополнительные этапы должны быть завершены перед публичным статусом Security Review.",
  },
  {
    title: "Для лидеров и партнеров",
    text: "Безопасность Atlas объясняется честно: внешний взлом, логика claim, ликвидность и административные полномочия рассматриваются отдельно. Это помогает не смешивать техническую защиту контракта и управленческие риски.",
  },
];

const forbiddenTexts = [
  "Audited",
  "100% secure",
  "Impossible to hack",
  "Funds are guaranteed",
  "Guaranteed profit",
  "Risk-free participation",
];

const completionItems = [
  {
    status: "Выполнено",
    title: "Aderyn / Mythril по всем контрактам",
    text: "Mythril bounded-прогон выполнен по Transport, UnityLockup, UnityDaily и PositionHandler: success=true, issues=[]. Aderyn 0.6.8 выполнен по 20 файлам и отдельно по 4 core-контрактам.",
  },
  {
    status: "Частично",
    title: "Foundry tests / invariant-тесты",
    text: "Foundry suite пройден: 12/12, включая 2 fuzz-сценария, Lockup/Daily/Transport stress и accounting invariant checks. Отдельный прогон с 1000 fuzz-runs пройден. Accounting test выявил product/contract consistency issue по тарифам, его нужно решить до deployment.",
  },
  {
    status: "Пройдено mock",
    title: "Большой fuzzing / stress-сценарии",
    text: "Lockup stress: 1000 пользователей, 50000 lockup и 100000 claim-попыток. Daily stress: 1000 пользователей, 5000 ордеров и 10000 claim-попыток. Transport stress: 1000 owner-claim и 1000 non-owner попыток. Это mock-окружение без реальной Pancake V3 ликвидности и не gas benchmark.",
  },
  {
    status: "Требует решения",
    title: "Product / Contract consistency",
    text: "Найдено расхождение: публичные Lockup ставки в 10 раз выше текущей формулы UnityLockup; Daily публичные 0.6/0.8% отличаются от кода 1.1/1.3%. Подготовлен Tariff Decision Packet: команда должна выбрать, править контракт или публичные материалы, затем повторить проверки.",
  },
  {
    status: "Подготовлено / не проведено",
    title: "BNB Testnet battle test",
    text: "Battle Kit, deployment runbook, env template, deploy script, registry template, smoke-test runbook/script, participant guide, bug report template и final report template подготовлены. Сам публичный challenge на 100-200 человек с bounty за воспроизводимый exploit еще не запускался.",
  },
  {
    status: "Подготовлено",
    title: "Публичный Security Review и owner-документ",
    text: "Публичный Security Review draft и owner-powers disclosure подготовлены. До статуса внешнего аудита нужны testnet battle, invariant/fuzzing и внешний review.",
  },
];

const toolResults = [
  ["Slither", "Запущен", "Автоматический анализ выявил зоны для ручной проверки: Transport-события, return values, compiler warnings и места, где нужен явный контроль логики."],
  ["Solhint", "Запущен", "Проверка качества Solidity-кода: стиль, NatSpec, версии компилятора, imports и gas-предупреждения. Отдельно фильтруются внешние библиотеки."],
  ["Foundry build", "Пройден", "Проект собирается через solc 0.8.20 с via_ir=true. Предупреждения вынесены в технический review."],
  ["Mythril", "Bounded-прогон", "Transport, UnityLockup, UnityDaily и PositionHandler проверены по bytecode в ограниченном режиме: success=true, issues=[]."],
  ["Aderyn", "Запущен", "Core-прогон дал 2 High и 6 Low сигналов для ручной проверки; подготовлен перевод на человеческий язык."],
  ["Foundry access-control", "12/12 пройдено", "Проверены чужой Lockup/Daily claim, повторный Lockup claim, owner-only Transport, 2 fuzz-сценария, stress-тесты Lockup/Daily/Transport и accounting invariant checks."],
  ["Foundry stress", "Пройдено mock", "Lockup: 1000 users / 50000 orders / 100000 claims. Daily: 1000 users / 5000 orders / 10000 claims. Transport: 1000 owner claims / 1000 non-owner attempts."],
  ["Accounting invariants", "3/3 пройдено", "Проверены user net payout, treasury fee и amountUnclaimed delta для Lockup, Daily и Transport в mock-окружении."],
  ["Product / contract consistency", "Требует решения", "Машинный tariff-check сравнил публичные тарифы с формулами в коде: Lockup сейчас считает reward в 10 раз ниже публичных материалов, Daily также не совпадает с опубликованными 0.6/0.8%."],
];

function SecurityReviewBoard() {
  return (
    <section className="analytics-surface analytics-security-review">
      <div className="analytics-security-hero">
        <div className="analytics-security-hero-copy">
          <span className="analytics-kicker">Code Safety Review</span>
          <h2>Как мы показываем, что код Atlas проверяется на безопасность</h2>
          <p>
            Простая версия: мы не просим верить словам. Мы показываем, какие защитные механизмы есть в коде,
            какие отчеты уже собраны, какие риски раскрываются отдельно и какие проверки еще нужно завершить.
          </p>
          <div className="analytics-security-status-row">
            <span>Чужой claim проверяется</span>
            <span>Owner-полномочия отдельно</span>
            <span>Не внешний аудит</span>
          </div>
          <div className="analytics-security-hero-actions">
            <a href="/security/atlas-security-review-v1-ru.md" target="_blank" rel="noreferrer">Открыть Security Review</a>
            <a href="/security/security-review-index-ru.md" target="_blank" rel="noreferrer">Индекс документов</a>
          </div>
        </div>
        <div className="analytics-security-score-card" aria-label="Статус проверки">
          <div className="analytics-security-score-top">
            <span>Current Status</span>
            <small>V1</small>
          </div>
          <strong>Code review in progress</strong>
          <p>Базовые защитные механизмы найдены, описаны и частично подтверждены Foundry-тестами. Testnet Battle Kit подготовлен; полный публичный статус появится после реального challenge и итогового отчета.</p>
          <div className="analytics-security-progress-list" aria-label="Этапы проверки">
            <em>Manual code review</em>
            <em>Auto-analysis reports</em>
            <em>Invariant tests</em>
            <em>External audit</em>
          </div>
        </div>
      </div>

      <div className="analytics-security-section analytics-security-answer">
        <div className="analytics-security-answer-main">
          <span className="analytics-kicker">Главный ответ</span>
          <h3>Пока корректно говорить так: код имеет базовые защитные механизмы и проходит Security Review.</h3>
          <p>
            Это сильнее, чем просто “мы безопасные”, потому что показывает конкретику: проверка владельца ордера,
            защита от повторного входа, безопасные ERC20-операции, owner-only ограничения, Foundry-тесты и опубликованные отчеты.
            Но это еще не статус Audited.
          </p>
        </div>
        <div className="analytics-security-answer-side">
          <strong>Формула для сайта</strong>
          <p>Код Atlas проходит поэтапную проверку безопасности. Уже проверяются права доступа, claim-логика, reentrancy-защита и owner-полномочия. Отчеты доступны, следующие тесты опубликованы.</p>
        </div>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>01</span>
          <h3>Что выдала программа и как это читать</h3>
        </div>
        <div className="analytics-security-program-grid">
          {programEvidence.map((item) => (
            <article key={item.program} className="analytics-security-program-card">
              <div className="analytics-security-program-head">
                <div>
                  <span>Программа</span>
                  <h4>{item.program}</h4>
                </div>
                <small>{item.status}</small>
              </div>
              <div className="analytics-security-program-command">
                <strong>Как повторить проверку</strong>
                <code>{item.command}</code>
              </div>
              <div className="analytics-security-program-output">
                <strong>Что выдала программа</strong>
                <p>{item.output}</p>
              </div>
              <div className="analytics-security-program-human">
                <strong>Перевод на человеческий язык</strong>
                <p>{item.human}</p>
              </div>
              <a href={item.report} target="_blank" rel="noreferrer">Открыть отчет</a>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>02</span>
          <h3>Перевод кода на обычный язык</h3>
        </div>
        <div className="analytics-security-claim-grid">
          {safetyClaims.map((item) => (
            <article key={item.title} className={`analytics-security-claim-card analytics-security-claim-${item.level}`}>
              <div className="analytics-security-doc-top">
                <span>{item.status}</span>
                <small>{item.level === "strong" ? "есть основание" : item.level === "caution" ? "раскрыть риск" : "доказать тестами"}</small>
              </div>
              <h4>{item.title}</h4>
              <p>{item.plain}</p>
              <div>{item.proof}</div>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-trust-ladder">
        {trustLadder.map(([title, text]) => (
          <article key={title}>
            <h4>{title}</h4>
            <p>{text}</p>
          </article>
        ))}
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>03</span>
          <h3>Что нужно добавить для полного внешнего доверия</h3>
        </div>
        <div className="analytics-security-gap-grid">
          {externalTrustGaps.map((item) => (
            <article key={item.title} className="analytics-security-gap-card">
              <div className="analytics-security-doc-top">
                <span>{item.status}</span>
                <small>external check</small>
              </div>
              <h4>{item.title}</h4>
              <p>{item.why}</p>
              <div>
                <strong>Следующий шаг</strong>
                <span>{item.next}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>04</span>
          <h3>Документы и отчеты для проверки</h3>
        </div>
        <div className="analytics-security-doc-grid">
          {documentCards.map((item) => (
            <article key={item.title} className="analytics-security-doc-card">
              <div className="analytics-security-doc-top">
                <span>{item.type}</span>
                <small>{item.status}</small>
              </div>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
              <a href={item.href} target="_blank" rel="noreferrer">{item.cta}</a>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-verify-panel">
        <div>
          <span className="analytics-kicker">How to verify</span>
          <h3>Как человек может проверить это сам</h3>
          <p>
            Не просим верить на слово: открываются документы, отчеты авто-инструментов и список следующих тестов.
            Финальный публичный статус появится только после дополнительных проверок.
          </p>
        </div>
        <div className="analytics-security-verify-steps">
          {verificationSteps.map((item) => (
            <article key={item.title}>
              <h4>{item.title}</h4>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-role-grid">
        {reviewRoles.map((item) => (
          <article key={item.role} className="analytics-security-role-card">
            <span>{item.role}</span>
            <h3>{item.verdict}</h3>
            <p>{item.note}</p>
            <small>{item.action}</small>
          </article>
        ))}
      </div>

      <div className="analytics-security-hero-grid">
        <article className="analytics-security-hero-card">
          <span>Вопрос 1</span>
          <h3>Может ли посторонний украсть деньги?</h3>
          <p>Это проверка кода: права доступа, claim-логика, reentrancy, арифметика, DoS, внешние вызовы и fuzzing.</p>
        </article>
        <article className="analytics-security-hero-card">
          <span>Вопрос 2</span>
          <h3>Какие полномочия есть у владельца?</h3>
          <p>Это архитектурный риск: Transport, treasury, fee, tokenId, LP-position, multisig/timelock и публичное раскрытие.</p>
        </article>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>05</span>
          <h3>Техническая карта проверки</h3>
        </div>
        <div className="analytics-security-check-grid">
          {securityChecks.map(([title, description, status]) => (
            <article key={title} className="analytics-security-check-card">
              <h4>{title}</h4>
              <p>{description}</p>
              <span>{status}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>06</span>
          <h3>Авто-инструменты</h3>
        </div>
        <div className="analytics-security-check-grid">
          {toolResults.map(([title, status, description]) => (
            <article key={title} className="analytics-security-check-card">
              <h4>{title}</h4>
              <p>{description}</p>
              <span>{status}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>07</span>
          <h3>Как говорить публично</h3>
        </div>
        <div className="analytics-security-public-grid">
          {publicTexts.map((item) => (
            <article key={item.title} className="analytics-security-public-card">
              <h4>{item.title}</h4>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-section analytics-security-two-columns">
        <div>
          <div className="analytics-security-section-head">
            <span>08</span>
            <h3>Нельзя писать</h3>
          </div>
          <div className="analytics-security-tags">
            {forbiddenTexts.map((text) => <span key={text}>{text}</span>)}
          </div>
        </div>
        <div>
          <div className="analytics-security-section-head">
            <span>09</span>
            <h3>Что еще не завершено</h3>
          </div>
          <div className="analytics-security-completion-list">
            {completionItems.map((item) => (
              <article key={item.title}>
                <span>{item.status}</span>
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SecurityReviewBoard;
