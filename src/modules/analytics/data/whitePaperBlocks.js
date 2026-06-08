import atlasWhitePaperMarkdown from "../../../../docs/atlas-system-white-paper-public-ru-v1.md?raw";
import atlasWhitePaperArchiveMarkdown from "../../../../docs/atlas-system-white-paper-v6.4.md?raw";

const BLOCK_META = {
  "1": { id: "executive-summary", title: "Краткое резюме", role: "Публичное резюме" },
  "2": { id: "what-is-atlas", title: "Что такое Atlas", role: "Объяснение системы" },
  "2.1": { id: "mission-manifest", title: "Миссия и манифест Atlas", role: "Идеология системы" },
  "2.2": { id: "full-manifest", title: "Полный манифест Atlas", role: "Большая версия для вычитки", view: "manifest" },
  "3": { id: "participant-journey", title: "Как участник работает с Atlas", role: "Путь участника" },
  "4": { id: "smart-cycle", title: "Smart Cycle", role: "Основная механика" },
  "5": { id: "calculation-model", title: "Расчётная модель и примеры", role: "Экономика" },
  "6": { id: "daily-flow", title: "Daily Flow", role: "Длительная модель" },
  "7": { id: "platform-fee", title: "Platform Fee", role: "Комиссия платформы" },
  "8": { id: "technical-architecture", title: "Техническая архитектура", role: "Техническое описание" },
  "9": { id: "liquidity-claim", title: "Ликвидность и Claim", role: "Условия исполнения" },
  "10": { id: "partner-program", title: "Партнёрская программа", role: "Партнёрские правила" },
  "11": { id: "webinars-speakers", title: "Вебинары и спикеры", role: "Обучение" },
  "12": { id: "dao-inspired", title: "DAO-inspired механики", role: "Механики сообщества" },
  "13": { id: "risks", title: "Риски", role: "Раскрытие рисков" },
  "14": { id: "access-jurisdictions", title: "Доступ и юрисдикции", role: "Ограничения доступа" },
  "15": { id: "security-official-sources", title: "Безопасность и официальные источники", role: "Безопасность" },
  "16": { id: "versions-conclusion", title: "Версии и заключение", role: "Финальная рамка" },
};


const ARCHIVE_BLOCK_META = {
  "0": { id: "important-notice", title: "Важное уведомление", role: "Юридическое уведомление" },
  "0.05": { id: "international-abstract", title: "Международное резюме", role: "Публичное резюме" },
  "0.1": { id: "key-facts", title: "Ключевые факты", role: "Краткая сводка" },
  "0.15": { id: "plain-language-summary", title: "Простое объяснение", role: "Объяснение для участника" },
  "0.155": { id: "plain-english-summary", title: "Краткое резюме на английском", role: "Публичное резюме на английском" },
  "0.16": { id: "pre-wallet-checklist", title: "Проверка перед кошельком", role: "Проверка до подписи" },
  "0.17": { id: "source-of-truth", title: "Иерархия источников", role: "Иерархия источников" },
  "0.2": { id: "reader-guide", title: "Как читать документ", role: "Как читать документ" },
  "1": { id: "no-token-sale", title: "Нет токенсейла и ICO", role: "Юридическое позиционирование" },
  "2": { id: "access-jurisdiction", title: "Доступ и юрисдикции", role: "Доступ и ограничения" },
  "2.1": { id: "operating-model", title: "Операционная модель", role: "Без корпоративной гарантии" },
  "2.2": { id: "regulatory-posture", title: "Регуляторная матрица", role: "Регуляторная проверка" },
  "2.3": { id: "access-policy", title: "Правила доступа", role: "Политика доступа" },
  "2.4": { id: "participant-eligibility", title: "Кто может участвовать", role: "Самостоятельная оценка" },
  "3": { id: "executive-summary", title: "Краткое резюме", role: "Краткое резюме" },
  "4": { id: "smart-cycle", title: "Механика Smart Cycle", role: "Основная механика" },
  "5": { id: "calculation-model", title: "Расчётная модель", role: "Экономика" },
  "6": { id: "daily-flow", title: "Ежедневная модель Daily Flow", role: "Ежедневная модель" },
  "7": { id: "platform-fee", title: "Комиссия платформы", role: "Комиссия платформы" },
  "7.1": { id: "calculation-methodology", title: "Методика расчёта", role: "Методика расчёта" },
  "7.2": { id: "financial-display", title: "Как показывать цифры", role: "Подача цифр" },
  "8": { id: "technical-architecture", title: "Техническая архитектура", role: "Архитектура" },
  "9": { id: "participant-scenario", title: "Путь участника", role: "Путь участника" },
  "9.1": { id: "cycle-lifecycle", title: "Жизненный цикл Smart Cycle", role: "Жизненный цикл" },
  "10": { id: "liquidity-model", title: "Модель ликвидности", role: "Ликвидность" },
  "10.1": { id: "treasury-operations", title: "Операции с ликвидностью", role: "Работа с ликвидностью" },
  "11": { id: "unity-lockup-conflict", title: "Сверка Unity Lockup", role: "Сверка со smart-spec" },
  "12": { id: "unity-daily-conflict", title: "Сверка Unity Daily", role: "Сверка со smart-spec" },
  "13": { id: "partner-program", title: "Партнёрская программа", role: "Партнёрка" },
  "14": { id: "webinars-speakers", title: "Вебинары и спикеры", role: "Вебинары" },
  "15": { id: "governance", title: "Управление с DAO-механиками", role: "Управление" },
  "16": { id: "security-model", title: "Модель безопасности", role: "Безопасность" },
  "16.1": { id: "admin-controls", title: "Админские права и owner", role: "Раскрытие прав управления" },
  "17": { id: "official-communications", title: "Официальные коммуникации", role: "Границы поддержки" },
  "18": { id: "prohibited-use", title: "Запрещённое использование", role: "Запрещённое использование" },
  "18.1": { id: "aml-abuse-control", title: "AML и контроль злоупотреблений", role: "Контроль злоупотреблений" },
  "19": { id: "risks", title: "Риски", role: "Риски" },
  "19.1": { id: "risk-severity", title: "Матрица серьёзности рисков", role: "Матрица рисков" },
  "19.2": { id: "risk-opportunity", title: "Баланс рисков и возможностей", role: "Баланс риска" },
  "19.2.1": { id: "opportunity-narrative", title: "Как говорить о возможностях", role: "Формулировки возможностей" },
  "19.3": { id: "objection-handling", title: "FAQ и работа с возражениями", role: "Стандарт FAQ" },
  "19.4": { id: "ai-regression", title: "Проверка AI-агента", role: "Проверка AI" },
  "20": { id: "transparency-privacy-tax", title: "Прозрачность, данные и налоги", role: "Данные и налоги" },
  "21": { id: "disclosure-standard", title: "Международный стандарт раскрытия", role: "Раскрытие информации" },
  "22": { id: "external-review", title: "Ориентиры внешней проверки", role: "Ориентиры проверки" },
  "23": { id: "roadmap", title: "Дорожная карта", role: "Дорожная карта" },
  "24": { id: "pre-public-decisions", title: "Что решить до публикации", role: "Открытые решения" },
  "24.1": { id: "decision-register", title: "Реестр финальных решений", role: "Реестр решений" },
  "25": { id: "assumptions-register", title: "Реестр допущений", role: "Допущения" },
  "26": { id: "readiness-matrix", title: "Готовность к публикации", role: "Готовность" },
  "27": { id: "publication-mode", title: "Режим публикации", role: "Публичная или внутренняя версия" },
  "28": { id: "public-release-template", title: "Шаблон публичного релиза", role: "Шаблон релиза" },
  "28.1": { id: "editorial-cut", title: "Чеклист редакционной сборки", role: "Редакционный чеклист" },
  "28.2": { id: "cover-status", title: "Обложка и статус", role: "Блок статуса" },
  "29": { id: "economic-reconciliation", title: "Сверка экономики", role: "Решения по экономике" },
  "30": { id: "sign-off-checklist", title: "Финальный чеклист согласования", role: "Финальное согласование" },
  "30.1": { id: "sign-off-certificate", title: "Сертификат согласования", role: "Сертификат" },
  "31": { id: "communication-control", title: "Контроль маркетинга", role: "Контроль коммуникаций" },
  "32": { id: "localization-qa", title: "Проверка переводов", role: "Локализация" },
  "32.1": { id: "local-market-review", title: "Проверка локального запуска", role: "Локальный запуск" },
  "33": { id: "decision-screen", title: "Экран решения участника", role: "Раскрытие в интерфейсе" },
  "33.1": { id: "acknowledgement-wording", title: "Тексты подтверждений", role: "Тексты интерфейса" },
  "33.1.1": { id: "comprehension-checks", title: "Проверка понимания", role: "UX-проверка" },
  "33.2": { id: "journey-disclosure", title: "Карта раскрытия по пути участника", role: "Карта раскрытия" },
  "34": { id: "version-control", title: "Контроль версий", role: "Версионирование" },
  "34.1": { id: "active-cycle-impact", title: "Влияние изменений на активные циклы", role: "Влияние изменений" },
  "35": { id: "incident-response", title: "Реакция на инциденты", role: "Экстренные коммуникации" },
  "36": { id: "contract-registry", title: "Реестр адресов контрактов", role: "Шаблон реестра" },
  "37": { id: "audit-security-status", title: "Аудит и статус безопасности", role: "Статус безопасности" },
  "38": { id: "english-terminology", title: "Утверждённая английская терминология", role: "Терминология" },
  "39": { id: "public-wording", title: "Разрешённые публичные формулировки", role: "Публичные заявления" },
  "39.1": { id: "claims-review", title: "Матрица проверки публичных заявлений", role: "Проверка заявлений" },
  "40": { id: "traceability", title: "Связь контракта и документов", role: "Прослеживаемость" },
  "40.1": { id: "numeric-evidence", title: "Доказательная база по цифрам", role: "Подтверждение цифр" },
  "41": { id: "evidence-pack", title: "Пакет доказательств и data room", role: "Пакет доказательств" },
  "41.1": { id: "claim-acceptance", title: "Критерии принятия публичных заявлений", role: "Критерии принятия" },
  "41.2": { id: "counsel-review-packet", title: "Пакет для внешнего юриста", role: "Пакет юридической проверки" },
  "42": { id: "legal-review-memo", title: "Юридическое заключение по Web3", role: "Юридическая проверка" },
  "42.1": { id: "counsel-opinion", title: "Стандарт юридического заключения", role: "Заключение юриста" },
  "42.2": { id: "red-team-review", title: "Стресс-проверка публичной версии", role: "Стресс-проверка" },
  "43": { id: "assembly-rules", title: "Правила сборки публичной версии", role: "Правила сборки" },
  "44": { id: "release-readiness-gate", title: "Фильтр готовности к релизу", role: "Проверка релиза" },
  "45": { id: "publication-archive", title: "Архив публикаций", role: "Архив" },
  "45.1": { id: "monitoring-correction", title: "Мониторинг и исправления", role: "После публикации" },
  "46": { id: "addendum-process", title: "Процесс дополнений", role: "Существенные изменения" },
  "47": { id: "public-skeleton", title: "Скелет публичного White Paper", role: "Публичная структура" },
  "47.1": { id: "public-snapshot", title: "Короткий публичный обзор", role: "Краткий публичный обзор" },
  "48": { id: "publication-package", title: "Финальный пакет публикации", role: "Пакет публикации" },
  "49": { id: "glossary", title: "Глоссарий", role: "Терминология" },
  "50": { id: "conclusion", title: "Заключение", role: "Финальная рамка" },
};

const WHITE_PAPER_20_SECTIONS = [
  {
    id: "wp20-cover-metadata",
    title: "Обложка и метаданные",
    role: "Версия, дата, статус, сеть, official links",
    text: `Atlas System White Paper

Web3-протокол взаимной поддержки с DAO-inspired механиками

Версия: 0.1
Статус: рабочая версия для вычитки
Дата: июнь 2026
Основная сеть: BNB Smart Chain

Официальный сайт: https://atlas-system.io
Официальный Telegram-канал: @atlas_system_official
Официальное Telegram-сообщество: @atlas_system_global_community
Официальный X: https://x.com/AtlasSystemWeb3

Реестр смарт-контрактов: будет подтвержден перед публичным релизом
Технический репозиторий: будет подтвержден перед публичным релизом
Центр документации: будет подтвержден перед публичным релизом

Этот документ описывает текущую рабочую структуру Atlas System: механику Smart Cycle, Web3/on-chain слой, off-chain партнерский слой, DAO-inspired механики сообщества, стандарты прозрачности, ограничения и раскрытие рисков.

Документ подготовлен для вычитки и согласования. Он не является документом токенсейла, ICO, финансовой рекомендацией или гарантией какого-либо результата.`,
    notes: "Вычитано: обложка должна быть короткой и презентационной. Фото/визуал нужны: логотип, светлая Web3-графика, сетка/орбита, без людей, денег и агрессивных обещаний. Перед публикацией согласовать версию, дату, сеть, official links, contract registry, GitHub/repository и docs-hub. На обложке не писать WhitePaper 2.0; это название рабочей вкладки, а не публичной версии документа.",
  },
  {
    id: "wp20-legal-disclaimer",
    title: "Legal Notice и Reader Guide",
    role: "Юридическая рамка и как читать документ",
    text: `Юридическое уведомление и как читать документ

Этот White Paper подготовлен для информационной, технической и редакционной вычитки. Он описывает текущую рабочую структуру Atlas System: механику Smart Cycle, Web3/on-chain слой, off-chain партнерский слой, отдельные DAO-inspired механики, стандарты прозрачности, ограничения и ключевые риски.

Этот документ не является предложением купить или продать токен, ценную бумагу, долю, долговой инструмент, инвестиционный продукт, депозитный продукт или право на будущую выручку. Atlas System не использует этот White Paper как документ ICO, токенсейла, проспект эмиссии или документ с гарантированной доходностью.

Ничто в этом документе не должно восприниматься как финансовая, инвестиционная, юридическая, налоговая, бухгалтерская или регуляторная рекомендация. Участники, партнеры, reviewer-ы и читатели должны самостоятельно оценивать информацию и при необходимости обращаться к квалифицированным специалистам до совершения каких-либо действий.

Участие в Atlas System может быть связано со smart-contract, blockchain, liquidity, operational, technical, legal и user-error рисками. Любое on-chain действие подтверждается самим участником через его собственный кошелек. Atlas никогда не должен запрашивать seed phrase, private key, пароль от кошелька или удаленный доступ к устройству участника.

В этом White Paper отдельно рассматриваются:

1. on-chain слой Smart Cycle, где действия, определенные смарт-контрактом, могут проверяться через соответствующий blockchain explorer;
2. off-chain сервисный слой, включая интерфейс, аналитику, документацию, referral attribution и операционные процессы;
3. live-документация, включая реестр контрактов, официальные ссылки, статус аудита, changelog и технические справки;
4. юридические, риск- и security-disclosures, которые могут обновляться по мере развития проекта, контрактов, юрисдикций и статуса проверки.

Читатель не должен считать источником истины скриншоты, личные сообщения, неофициальные переводы или устаревшие PDF-копии. Перед любым действием с кошельком необходимо проверить актуальный официальный сайт, реестр контрактов, сеть, адрес контракта, параметры транзакции и последнюю опубликованную версию документа.

Если документ прямо не отмечен как финальный публичный релиз, он считается рабочей версией. Параметры, терминология, раскрытие рисков, ссылки на контракты, официальные ссылки и операционные процессы могут быть обновлены до публикации.`,
    notes: "Вычитано: страница должна быть юридически жесткой, но не выглядеть как полный отказ от проекта. Проверить с Web3-юристом: no token sale, no investment advice, no guarantee, source-of-truth, wallet safety, разграничение on-chain/off-chain. Визуал нужен спокойный: юридическая/документальная страница без декоративных фото, достаточно логотипа, нумерованных карточек и аккуратной типографики.",
  },
  {
    id: "wp20-abstract",
    title: "Abstract",
    role: "150-250 слов: академичное резюме",
    notes: "Новый блок из материала. Согласовать один плотный абзац: что такое Atlas, что on-chain/off-chain, что именно описывает paper.",
  },
  {
    id: "wp20-executive-summary",
    title: "Executive Summary",
    role: "1-2 страницы для внешнего читателя",
    notes: "Согласовать: проблема, решение, Smart Cycle, referral backend, governance/admin model, top risks, current status.",
  },
  {
    id: "wp20-tldr",
    title: "TL;DR",
    role: "6-10 коротких тезисов",
    notes: "Новый блок из материала. Согласовать короткие тезисы: chain, user action, what is on-chain, token/no token, audit status, main risks.",
  },
  {
    id: "wp20-context-problem",
    title: "Problem Statement",
    role: "Problem statement без агрессивного маркетинга",
    notes: "Согласовать проблему без нападения на рынок: opaque admin systems, unverifiable dashboards, fragmented trust, poor user visibility into flows.",
  },
  {
    id: "wp20-market-context",
    title: "Market Context and Alternatives",
    role: "Сравнение с альтернативными моделями",
    notes: "Новый блок из материала. Сравнить аккуратно: token-led models, yield products, manual schemes, referral-heavy systems, DeFi alternatives.",
  },
  {
    id: "wp20-product-overview",
    title: "Atlas Overview",
    role: "Reader-friendly picture of the protocol",
    notes: "Согласовать: what Atlas is / what it is not, product boundary, user roles, BNB Smart Chain, app/docs/dashboard/API surfaces.",
  },
  {
    id: "wp20-design-principles",
    title: "Принципы проектирования",
    role: "Архитектурная конституция Atlas",
    notes: "Согласовать принципы: on-chain transparency, deterministic rules, off-chain disclosure, access control, source-of-truth, versioned updates.",
  },
  {
    id: "wp20-smart-cycle-mechanics",
    title: "Smart Cycle Mechanics",
    role: "Сердце документа: жизненный цикл цикла",
    notes: "Согласовать definitions: contribution, cycle, eligibility, payout request, pool balance, delta, ordering logic, active/inactive states, exceptions, examples.",
  },
  {
    id: "wp20-economics-liquidity",
    title: "Protocol Economics and Incentive Design",
    role: "Экономика без пустой Tokenomics",
    notes: "Переименовано по новому материалу. Если токена нет, не писать Tokenomics: описывать contract-defined inflows/outflows, pool balance, delta, fee, referral incentives, scenarios.",
  },
  {
    id: "wp20-system-architecture",
    title: "System Context Architecture",
    role: "Карта on-chain/off-chain компонентов",
    notes: "Согласовать diagram: frontend, wallet, Smart Cycle contracts, indexer, referral backend, analytics, docs, admin/multisig, explorer verification.",
  },
  {
    id: "wp20-smart-contract-layer",
    title: "Smart-Contract Design",
    role: "Контракты, функции, события, permissions",
    notes: "Согласовать: contract list, roles, ownership, upgradeability/non-upgradeability, events, modifiers, dependencies, verified source policy, access-control matrix.",
  },
  {
    id: "wp20-onchain-flows",
    title: "On-Chain Flows",
    role: "Transaction paths и события",
    notes: "Новый блок из материала. Описать deposit/contribution flow, payout flow, delta flow, failure paths, reverts, emitted events, gas notes, sample tx hashes.",
  },
  {
    id: "wp20-roles-actors",
    title: "Roles and Actors",
    role: "Кто что делает в системе",
    notes: "Согласовать: participant, smart contract, backend referral engine, operator/maintainer, auditor, interface provider, admin/multisig, external services.",
  },
  {
    id: "wp20-partner-backend",
    title: "Off-Chain Services and Partner Backend",
    role: "Referral backend, API, trust boundaries",
    notes: "Расширено по новому материалу. Описать what is off-chain, why, API boundaries, indexing/reconciliation, referral binding, anti-fraud, privacy, failure modes.",
  },
  {
    id: "wp20-governance",
    title: "Governance and Administrative Controls",
    role: "DAO-inspired mechanics, multisig, admin powers",
    notes: "Расширено по новому материалу. Разделить community decision rights, operational controls, emergency powers, multisig, timelock, proposal lifecycle. Не называть Atlas full DAO.",
  },
  {
    id: "wp20-security",
    title: "Security, Audit and Operations",
    role: "Security posture и операционные процедуры",
    notes: "Согласовать: audit status, remediation, tests, fuzzing/static analysis/formal verification if any, monitoring, incident response, pause, key management, known limitations.",
  },
  {
    id: "wp20-team-entity",
    title: "Team, Entity and Contributors",
    role: "Accountability и publishing body",
    notes: "Новый блок из материала. Согласовать: publishing body/legal entity if any, architect, smart-contract team, backend team, advisors, legal/audit providers, contributor disclosures.",
  },
  {
    id: "wp20-metrics-transparency",
    title: "Metrics and Transparency",
    role: "Публичные метрики и methodology",
    notes: "Новый блок из материала. Согласовать: verified contracts, total contributions/payouts/delta if disclosed, dashboard methodology, timestamps, on-chain/off-chain source mapping.",
  },
  {
    id: "wp20-risks",
    title: "Risk Factors and Important Disclosures",
    role: "Полноценный risk section",
    notes: "Расширено по новому материалу. Описать smart-contract, chain, governance/admin, liquidity, off-chain backend, integration, legal, user-error risks. Plain language.",
  },
  {
    id: "wp20-verification",
    title: "Transparency and Independent Verification",
    role: "Как проверить Atlas независимо",
    text: `Transparency Center

Verify. Study. Make your own conclusions.

Atlas is built around the principle of maximum practical transparency. Trust should not be based on marketing statements alone. Trust should be based on an open understanding of how the system works, which parts can be independently verified, which parts are operated by the project team, and which risks remain with the participant.

For smart-contract security, Atlas should use a machine-readable report plus human-readable explanation model. First, the project shows which program was used to check the contract. Second, it publishes what the program returned. Third, it explains how a participant or specialist can repeat the check independently. Fourth, it translates the technical output into plain language so a non-technical participant can understand what the finding means and what it does not mean.

This section summarizes the current transparency model of Atlas, including the protocol status, system architecture, automated processes, team-operated components, administrative functions, the Transport mechanism, key risks and the ways a participant can independently verify information.

System Status

Protocol version: Atlas Core V1
Network: BNB Smart Chain
Status: Active version
Smart contracts: intended to be open for independent review through official contract registry and blockchain explorer references

Atlas Architecture

Atlas is composed of several components that perform different roles within the system:

- Smart Cycle;
- referral / partner program;
- status system;
- community voting and DAO-inspired mechanics;
- infrastructure services.

Each component has its own function and interacts with other parts of the system according to defined rules. Atlas should not be described as a fully decentralized system in its current version. It is more accurate to describe Atlas Core V1 as a hybrid Web3 architecture with an on-chain Smart Cycle layer and off-chain service layers.

Automated Processes

The following processes are intended to be performed by software logic without manual intervention by the project team:

- creation of cycles;
- recording of cycle parameters;
- execution of cycle conditions according to the relevant logic;
- calculation of displayed indicators;
- recording of blockchain operations;
- formation of the participant's operation history.

After a cycle is created, its recorded conditions should not be changed retroactively. Participants should verify the actual transaction, contract interaction and recorded parameters through the official interface and blockchain explorer before relying on any displayed information.

Team-Operated Components

Atlas does not claim that all parts of the current system are fully decentralized or fully autonomous. To maintain, operate and improve the platform, some functions require participation by the project team or authorized infrastructure.

These functions may include:

- platform development;
- infrastructure maintenance;
- protocol or interface updates;
- partner program administration;
- organization of community voting processes;
- technical support;
- publication and maintenance of official documentation.

This distinction is important. The on-chain layer may provide independently inspectable contract interactions, while off-chain components may require operational controls, reconciliation, monitoring and support processes.

Administrative Functions and System Permissions

The current version of Atlas may contain administrative or permissioned functions that are required for infrastructure operation. Some actions may be performed only by authorized system addresses.

Such functions may be used for:

- operation and maintenance of the partner program;
- infrastructure support;
- system updates;
- implementation of decisions approved through community or governance-related processes;
- technical actions required to maintain system continuity.

All material administrative permissions, privileged addresses, upgrade rights, emergency powers, Transport-related controls and other system-level functions should be disclosed through the official contract registry, technical appendix, access-control matrix or live documentation before public release.

Transport Mechanism

Atlas Core V1 uses a dedicated mechanism referred to as Transport.

The Transport mechanism may be used for:

- servicing the partner program;
- distributing partner rewards;
- supporting selected infrastructure processes.

Transport is part of the first-version Atlas architecture and should be treated as a conscious engineering decision rather than hidden decentralization. The purpose, limits, authorized addresses, operational rules and risk implications of Transport should be described in the technical appendix and contract registry.

Why This Architecture Was Chosen

The Atlas team considered different ways to implement the partner program and related operational logic. A fully on-chain implementation of every referral and partner-program process may significantly increase contract complexity, transaction costs, attack surface and the risk of technical errors.

For Atlas Core V1, the selected architecture aims to balance automation, scalability, cost efficiency and operational maintainability. This design choice also creates trust boundaries that must be clearly disclosed: some parts may be verified directly on-chain, while some parts must be evaluated through published rules, backend records, reconciliation, official documentation and operational controls.

Key Risks

Each participant should understand the following points before taking any action:

- participation is voluntary;
- provided support is not a bank deposit;
- return of support is not guaranteed;
- additional support / delta is not guaranteed;
- Atlas is not an investment product;
- the participant independently decides whether to participate;
- smart-contract, blockchain, liquidity, backend, administrative, legal and user-error risks may exist;
- off-chain referral and infrastructure layers introduce additional operational trust assumptions.

Independent Verification

Each participant or external reviewer should be able to verify, where applicable:

- smart-contract addresses;
- transaction history;
- cycle parameters;
- movement of funds;
- community voting history;
- system changes and version history;
- official links and current document version;
- the boundary between on-chain evidence and off-chain operational records.

Atlas should not ask participants to rely only on the words of the team. Atlas should provide an open description of its architecture, rules, permissions, risks and key mechanisms so that each participant can study the project independently and make their own decision.`,
    notes: "Согласовать: contract registry, explorer links, verified source, events, public dashboards, sample tx hashes, what cannot be verified on-chain.",
  },
  {
    id: "wp20-roadmap-versioning",
    title: "Roadmap and Milestones",
    role: "Версии протокола и будущие изменения",
    notes: "Согласовать delivered / planned / gated milestones, dependencies, Smart Cycle 2, migration rules, no hype, forward-looking disclaimer.",
  },
  {
    id: "wp20-legal-compliance",
    title: "Legal and Compliance Considerations",
    role: "Юрисдикции, ограничения, terms/privacy",
    notes: "Согласовать: entity/jurisdiction, service-access assumptions, AML/KYC stance, sanctions stance, restricted jurisdictions, legal characterization caveats, terms/privacy.",
  },
  {
    id: "wp20-appendices",
    title: "Technical Appendix",
    role: "Формулы, ABI, state machine, схемы",
    notes: "Новый фокус из материала. Вынести сюда glossary, formulas, parameter tables, ABI excerpts, diagrams, sample txs, gas costs, version history.",
  },
  {
    id: "wp20-diagrams-evidence",
    title: "Diagrams and Evidence Pack",
    role: "Схемы и доказательные артефакты",
    notes: "Новый блок из материала. Подготовить: system context diagram, Smart Cycle flowchart, sequence diagram, state machine, contract map, ER diagram, access-control matrix, risk matrix.",
  },
  {
    id: "wp20-live-docs",
    title: "Live Docs, Contract Registry and API Reference",
    role: "Живая документация вне PDF",
    notes: "Новый блок из материала. White Paper не должен заменять live docs: contract addresses, API/OpenAPI, audit links, changelog, dashboards, glossary, official links.",
  },
  {
    id: "wp20-glossary",
    title: "Glossary",
    role: "Единая терминология",
    notes: "Согласовать RU/EN термины: Smart Cycle, contribution, payout request, delta, pool balance, referral backend, DAO-inspired mechanics, source of truth.",
  },
  {
    id: "wp20-version-history",
    title: "Version History and Changelog",
    role: "История версий документа",
    notes: "Новый блок. Согласовать table: version, date, status, changes, reviewer/sign-off, superseded versions, addendum policy.",
  },
  {
    id: "wp20-missing-inputs",
    title: "Missing inputs / backlog",
    role: "Что нужно закрыть перед наполнением",
    notes: "Согласовать открытые вопросы по smart-contract, Smart Cycle, off-chain партнёрке, audit/security, legal, token/no-token, source-of-truth and evidence pack.",
  },
  {
    id: "wp20-final-signoff",
    title: "Final Sign-Off Checklist",
    role: "Финальное согласование перед публикацией",
    notes: "Новый блок. Проверить: product, smart contract, backend, security, legal, marketing, localization, founder approval. Если gate красный, документ остаётся draft.",
  },
];

const whitePaper20Blocks = WHITE_PAPER_20_SECTIONS.map((section, index) => ({
  id: section.id,
  title: section.title,
  sourceTitle: section.title,
  sectionNumber: String(index + 1).padStart(2, "0"),
  view: "whitepaper20",
  role: section.role,
  status: "Согласовать",
  text: section.text || "",
  notes: section.notes,
}));
function normalizeTitle(title) {
  return title.trim().replace(/\s+/g, " ");
}

function createFallbackId(index, view = "document") {
  return `${view}-white-paper-section-${String(index).padStart(2, "0")}`;
}

function stripSectionNumber(title) {
  return normalizeTitle(title.replace(/^\d+(?:\.\d+)*\.?\s+/, ""));
}

function createWhitePaperBlocks(markdown, options = {}) {
  const { metaMap = BLOCK_META, view = "document", idPrefix = "", notes, coverTitle = "Обложка White Paper", coverNotes } = options;
  const lines = markdown.trim().split("\n");
  const titleLine = lines[0]?.startsWith("# ") ? lines.shift().replace(/^#\s+/, "") : "Atlas System White Paper";
  const introLines = [];
  const sections = [];
  let currentSection = null;

  lines.forEach((line, index) => {
    const nextLine = lines[index + 1] || "";
    const previousNonEmptyLine = lines.slice(0, index).reverse().find((candidate) => candidate.trim()) || "";
    const currentNumber = Number(line.match(/^(\d+)\.\s/)?.[1] || 0);
    const previousListNumber = Number(previousNonEmptyLine.match(/^(\d+)\.\s/)?.[1] || 0);
    const isSequentialListItem = currentNumber > 1 && previousListNumber === currentNumber - 1;
    const isNumberedHeading = /^\d+(?:\.\d+)*\.?\s+\S/.test(line) && nextLine.trim() === "" && !isSequentialListItem;
    const isMarkdownHeading = /^##\s+\S/.test(line);

    if (isNumberedHeading || isMarkdownHeading) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        title: normalizeTitle(line.replace(/^##\s+/, "")),
        lines: [],
      };
      return;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    } else {
      introLines.push(line);
    }
  });

  if (currentSection) sections.push(currentSection);

  const preparedSections = sections.map((section, index) => {
    const title = section.title;
    const number = title.match(/^(\d+(?:\.\d+)*)/)?.[1] || String(index).padStart(2, "0");
    const meta = metaMap[number] || {};
    const displayTitle = meta.title || stripSectionNumber(title);
    const text = [title, "", section.lines.join("\n").trim()].filter(Boolean).join("\n");

    return {
      id: `${idPrefix}${meta.id || createFallbackId(index, view)}`,
      title: displayTitle,
      sourceTitle: title,
      sectionNumber: number,
      view: meta.view || view,
      role: meta.role || "Раздел",
      status: "На вычитке",
      text,
      notes: notes || "Публичная версия v1. Проверка ролями: обычный читатель — понятно ли; Web3-юрист — нет ли обещаний/ICO/custody; technical writer — совпадают ли термины, таблицы и логика.",
    };
  });

  return [
    {
      id: `${idPrefix}cover`,
      title: coverTitle,
      sourceTitle: titleLine,
      sectionNumber: "0",
      view,
      role: "Титульный блок",
      status: "На вычитке",
      text: [titleLine, "", introLines.join("\n").trim()].filter(Boolean).join("\n"),
      notes: coverNotes || "Обложка публичной версии для финальной вычитки. Проверить дату, версию, official URL и статус перед публикацией.",
    },
    ...preparedSections,
  ];
}

const publicWhitePaperBlocks = createWhitePaperBlocks(atlasWhitePaperMarkdown);
const archiveWhitePaperBlocks = createWhitePaperBlocks(atlasWhitePaperArchiveMarkdown, {
  metaMap: ARCHIVE_BLOCK_META,
  view: "archive",
  idPrefix: "archive-",
  coverTitle: "Обложка архива v6.4",
  notes: "Архивная рабочая версия v6.4 на 90+ блоков. Использовать для сверки, вычитки и переноса сильных разделов в публичную версию.",
  coverNotes: "Обложка архивной рабочей версии v6.4. Это не чистовая публичная версия, а большая редакция для сверки.",
});

const WHITE_PAPER_30_SECTIONS = [
  {
    id: "intro",
    title: "Введение",
    role: "Короткое объяснение",
    status: "Черновик",
    text: [
      "Введение",
      "",
      "Atlas System - это цифровая система взаимопомощи, где человек заранее видит правила участия, понимает ограничения и сам принимает решение.",
      "",
      "Этот документ написан не как техническая инструкция для криптофонда, а как понятное объяснение для человека, который впервые открыл Atlas с телефона и хочет быстро разобраться в главном.",
      "",
      "Главные вопросы документа:",
      "",
      "- Что такое Atlas?",
      "- Почему он появился?",
      "- Как работает Smart Cycle?",
      "- Откуда появляется добавочная помощь?",
      "- Где риски?",
      "- Что можно проверить?",
      "- Можно ли здесь строить команду и сообщество?",
    ].join("\n"),
    notes: "Сделать 1-2 страницы без технической перегрузки. Цель - подготовить читателя.",
  },
  {
    id: "why-atlas-appeared",
    title: "Глава 1. Почему появился Atlas",
    role: "Проблема рынка",
    status: "Черновик",
    text: [
      "Глава 1. Почему появился Atlas",
      "",
      "Atlas появился как ответ на две проблемы, которые часто повторяются в онлайн-проектах и сообществах.",
      "",
      "### Проблема доверия",
      "",
      "- модели часто закрыты и непонятны;",
      "- участник не может проверить, что происходит внутри;",
      "- решения зависят от администраторов и ручного управления;",
      "- обещания звучат громче, чем реальные правила.",
      "",
      "### Проблема лидерского капитала",
      "",
      "- команды строятся годами;",
      "- лидеры вкладывают время, знания и репутацию;",
      "- проекты могут исчезать, а сообщества распадаться;",
      "- накопленный опыт и связи часто не сохраняются.",
      "",
      "Atlas должен объяснить, как можно строить систему, где правила понятнее, проверка доступнее, а сообщество не зависит только от одного проекта или одного центра решений.",
    ].join("\n"),
    notes: "Развернуть через две боли: доверие и лидерский капитал. Без обвинительного тона.",
  },
  {
    id: "atlas-solution",
    title: "Глава 2. Решение Atlas",
    role: "Основная идея",
    status: "Черновик",
    text: [
      "Глава 2. Решение Atlas",
      "",
      "Atlas предлагает не обещание результата, а систему участия с заранее описанными правилами.",
      "",
      "Основная идея: участник взаимодействует не с обещаниями людей, а с понятной логикой, которая фиксируется в интерфейсе, транзакциях и правилах Smart Cycle.",
      "",
      "### Принципы Atlas",
      "",
      "- правила видны до участия;",
      "- человек сам управляет кошельком;",
      "- ключевые действия можно проверить;",
      "- результат не гарантируется и зависит от условий системы;",
      "- развитие строится вокруг сообщества, а не только вокруг администрации.",
      "",
      "Web3 используется не ради моды. Он нужен для проверяемости действий, прозрачного следа операций и снижения зависимости от ручного управления.",
    ].join("\n"),
    notes: "Пояснить, почему Web3 и смарт-контракты нужны обычному человеку, простым языком.",
  },
  {
    id: "how-atlas-works",
    title: "Глава 3. Как работает Atlas",
    role: "Общая схема",
    status: "Черновик",
    text: [
      "Глава 3. Как работает Atlas",
      "",
      "Atlas можно понять через простой путь участника.",
      "",
      "1. Человек подключает кошелек.",
      "2. Выбирает формат участия.",
      "3. Создает Smart Cycle.",
      "4. Следит за условиями цикла.",
      "5. После выполнения условий отправляет запрос помощи.",
      "6. Система обрабатывает запрос по правилам и доступной ликвидности.",
      "",
      "Важно: Atlas не является банком, депозитом или инвестиционным фондом. Участник не покупает гарантированный доход. Он участвует в системе взаимопомощи, где результат зависит от правил, активности, ликвидности и технического состояния инфраструктуры.",
    ].join("\n"),
    notes: "Здесь нужна простая схема сверху: без тарифов, DAO и сложных деталей.",
  },
  {
    id: "smart-cycle",
    title: "Глава 4. Smart Cycle",
    role: "Главный пользовательский сценарий",
    status: "Черновик",
    text: [
      "Глава 4. Smart Cycle",
      "",
      "Smart Cycle - основной формат участия в Atlas.",
      "",
      "Он описывает, какую помощь участник оказывает системе, какие условия действуют внутри цикла и когда появляется возможность отправить запрос помощи.",
      "",
      "### Как войти",
      "",
      "- подключить кошелек;",
      "- выбрать цикл;",
      "- проверить срок, сумму и условия;",
      "- подтвердить действие в кошельке.",
      "",
      "### Как участвовать",
      "",
      "- следить за статусом цикла;",
      "- понимать ограничения;",
      "- не воспринимать расчетную дельту как гарантию.",
      "",
      "### Как завершить цикл",
      "",
      "После выполнения условий участник может отправить запрос помощи. Исполнение запроса зависит от правил цикла и доступной ликвидности.",
    ].join("\n"),
    notes: "Этот раздел должен быть максимально понятным: вход, участие, завершение, ограничения.",
  },
  {
    id: "economic-model",
    title: "Глава 5. Экономическая модель",
    role: "Движение средств",
    status: "Черновик",
    text: [
      "Глава 5. Экономическая модель",
      "",
      "Это главный раздел White Paper. Его задача - честно объяснить, как движется помощь внутри системы.",
      "",
      "### Что происходит внутри",
      "",
      "- новые Smart Cycle создают входящий поток ликвидности;",
      "- эта ликвидность используется для исполнения запросов участников;",
      "- добавочная помощь возможна только в рамках правил цикла;",
      "- если входящий поток замедляется, риск задержек и неисполненных запросов растет;",
      "- один цикл может завершиться, после чего сообщество может перейти к новым циклам и продуктам.",
      "",
      "Atlas должен объяснять экономику сухо и прямо. Без маркетинговых обещаний, без слова “гарантия” и без иллюзии, что система устраняет все риски.",
    ].join("\n"),
    notes: "Ключевая глава. Позже добавить простую диаграмму движения средств и сценарии замедления.",
  },
  {
    id: "atlas-community",
    title: "Глава 6. Сообщество Atlas",
    role: "Команды и лидерский капитал",
    status: "Черновик",
    text: [
      "Глава 6. Сообщество Atlas",
      "",
      "Atlas - это не только Smart Cycle, но и сообщество людей, которые объясняют систему, строят команды и развивают долгосрочную экосистему.",
      "",
      "### Почему это важно",
      "",
      "- лидеры создают доверие через объяснение, а не через обещания;",
      "- команды помогают новым участникам разобраться в механике;",
      "- сообщество сохраняет знания и опыт;",
      "- развитие Atlas может идти от цикла к циклу, а не зависеть от одного продукта.",
      "",
      "В этой главе нужно раскрыть роли Builder и Leader, объяснить ценность команд и показать, почему Atlas может быть инфраструктурой для долгосрочного сообщества.",
    ].join("\n"),
    notes: "Вторая сильная глава после экономики. Добавить Builder / Leader и сохранение сообществ.",
  },
  {
    id: "partner-program",
    title: "Глава 7. Партнерская программа",
    role: "Партнерка",
    status: "Черновик",
    text: [
      "Глава 7. Партнерская программа",
      "",
      "Партнерская программа должна быть отделена от экономической модели Smart Cycle.",
      "",
      "Ее задача - не обещать заработок, а описать, как участники могут помогать распространению знаний, обучению и развитию команды.",
      "",
      "### Правильная рамка",
      "",
      "- партнер объясняет систему;",
      "- партнер не обещает результат;",
      "- партнерская активность не является обязательным условием участия;",
      "- бонусы и статусы должны быть описаны отдельно от базовой механики Smart Cycle;",
      "- рост зависит от правил программы и реальной активности команды.",
    ].join("\n"),
    notes: "Сделал id partner-program, чтобы ссылка /?block=partner-program работала логично.",
  },
  {
    id: "technology-transparency",
    title: "Глава 8. Технологии и прозрачность",
    role: "Проверяемость",
    status: "Черновик",
    text: [
      "Глава 8. Технологии и прозрачность",
      "",
      "Технологии нужно объяснять после того, как читатель уже понял механику Atlas.",
      "",
      "В этом разделе раскрываются:",
      "",
      "- блокчейн;",
      "- смарт-контракты;",
      "- проверка транзакций;",
      "- роль кошелька;",
      "- BscScan и публичная проверяемость;",
      "- аудит и безопасность контрактов.",
      "",
      "Главная мысль: технология нужна не для сложности, а для того, чтобы участник мог проверять действия и меньше зависел от слов.",
    ].join("\n"),
    notes: "Не перегружать. Технические детали перенести в приложение.",
  },
  {
    id: "risks",
    title: "Глава 9. Риски",
    role: "Что может пойти не так",
    status: "Черновик",
    text: [
      "Глава 9. Риски",
      "",
      "Этот раздел должен быть максимально честным.",
      "",
      "### Что может пойти не так",
      "",
      "- может не хватить ликвидности для исполнения запросов;",
      "- входящий поток участников может замедлиться;",
      "- смарт-контракт или сеть могут столкнуться с техническими ошибками;",
      "- пользователь может ошибиться с кошельком, сетью или seed-фразой;",
      "- могут появиться фишинговые сайты и поддельная поддержка;",
      "- регуляторные требования могут отличаться в разных странах.",
      "",
      "Честный риск-блок не ослабляет Atlas. Наоборот, он показывает, что система не прячет ограничения и не строит доверие на обещаниях.",
    ].join("\n"),
    notes: "Сделать в формате простого списка: риск, что означает, как снизить.",
  },
  {
    id: "future",
    title: "Глава 10. Будущее Atlas",
    role: "Roadmap",
    status: "Черновик",
    text: [
      "Глава 10. Будущее Atlas",
      "",
      "Atlas должен развиваться не как один продукт, а как экосистема.",
      "",
      "Возможные направления развития:",
      "",
      "- новые Smart Cycle;",
      "- DAO и голосования;",
      "- P2P Exchange;",
      "- обучающая база и Academy;",
      "- инструменты для лидеров и команд;",
      "- дополнительные Web3-продукты внутри экосистемы.",
      "",
      "Важно отделять то, что уже работает, от того, что находится в дорожной карте. Это защищает читателя от завышенных ожиданий.",
    ].join("\n"),
    notes: "Сделать roadmap отдельным, но без обещания сроков, если они не утверждены.",
  },
  {
    id: "appendix",
    title: "Приложения",
    role: "FAQ, термины, юридическая информация",
    status: "Черновик",
    text: [
      "Приложения",
      "",
      "В приложения лучше вынести все, что нужно для справки, но мешает основной истории.",
      "",
      "### FAQ",
      "",
      "Короткие ответы на вопросы новых участников.",
      "",
      "### Термины",
      "",
      "Единый словарь: Smart Cycle, оказать помощь, запрос помощи, расчетная дельта, ликвидность, DAO, Builder, Leader.",
      "",
      "### Юридическая информация",
      "",
      "Дисклеймеры, ограничения, отсутствие финансовой рекомендации, самостоятельная ответственность участника.",
    ].join("\n"),
    notes: "Держать приложения отдельными, чтобы основной документ читался легко.",
  },
];

const whitePaper30Blocks = WHITE_PAPER_30_SECTIONS.map((section, index) => ({
  id: `wp30-${section.id}`,
  title: section.title,
  sourceTitle: section.title,
  sectionNumber: String(index + 1).padStart(2, "0"),
  view: "whitepaper30",
  role: section.role,
  status: section.status || "Черновик",
  text: section.text || "",
  notes: section.notes,
}));

const WHITE_PAPER_40_SECTIONS = [
  {
    id: "executive-summary",
    title: "1. Executive Summary",
    role: "Краткое резюме",
    text: [
      "1. Executive Summary",
      "",
      "1.1 Что такое Atlas System",
      "1.2 Какие проблемы решает Atlas",
      "1.3 Краткое описание решения",
      "1.4 Основные преимущества",
      "1.5 Для кого создан Atlas",
    ].join("\n"),
    notes: "Первый раздел должен быстро объяснять Atlas без технической перегрузки.",
  },
  {
    id: "trust-crisis",
    title: "2. Заработок в интернете. Проблема №1. Кризис доверия",
    role: "Проблема доверия",
    text: [
      "2. Заработок в интернете. Проблема №1. Кризис доверия",
      "",
      "2.1 Непрозрачность современных онлайн-проектов",
      "2.2 Невозможность проверки движения средств",
      "2.3 Зависимость участников от администрации",
      "2.4 Закрытые финансовые модели",
      "2.5 Рост запроса на прозрачность",
    ].join("\n"),
    notes: "Раскрыть проблему доверия простым языком, без агрессивных обвинений рынку.",
  },
  {
    id: "leader-capital-loss",
    title: "3. Проблема №2. Потеря лидерского капитала",
    role: "Лидерский капитал",
    text: [
      "3. Проблема №2. Потеря лидерского капитала",
      "",
      "3.1 Построение сообществ требует лет работы",
      "3.2 Разрушение команд после завершения проектов",
      "3.3 Потеря репутации лидеров",
      "3.4 Постоянный поиск новых проектов",
      "3.5 Отсутствие долгосрочной экосистемы",
    ].join("\n"),
    notes: "Показать, почему для лидеров и команд важна преемственность экосистемы.",
  },
  {
    id: "existing-solutions-limits",
    title: "4. Почему существующие решения не решают эти проблемы",
    role: "Ограничения рынка",
    text: [
      "4. Почему существующие решения не решают эти проблемы",
      "",
      "4.1 Централизованные платформы",
      "4.2 Традиционные инвестиционные модели",
      "4.3 Закрытые кассы взаимопомощи",
      "4.4 Одноразовые проекты",
      "4.5 Ограничения существующих подходов",
    ].join("\n"),
    notes: "Сравнить подходы аккуратно: не обещать, что Atlas устраняет все риски.",
  },
  {
    id: "atlas-solution",
    title: "5. Решение Atlas",
    role: "Решение",
    text: [
      "5. Решение Atlas",
      "",
      "5.1 Концепция Atlas",
      "5.2 Основные принципы системы",
      "",
      "- прозрачность",
      "- добровольность",
      "- проверяемость",
      "- автоматизация",
      "- открытые правила",
      "",
      "5.3 Как Atlas решает проблему доверия",
      "5.4 Как Atlas решает проблему сохранения сообществ",
    ].join("\n"),
    notes: "Сделать мост от проблем к решению, без маркетинговой воды.",
  },
  {
    id: "what-is-atlas-system",
    title: "6. Что такое Atlas System",
    role: "Описание системы",
    text: [
      "6. Что такое Atlas System",
      "",
      "6.1 Общая концепция",
      "6.2 Экосистема Atlas",
      "6.3 Роль сообщества",
      "6.4 Роль технологий Web3",
      "6.5 Долгосрочное развитие платформы",
    ].join("\n"),
    notes: "Объяснить Atlas как систему, а не как один цикл или один продукт.",
  },
  {
    id: "atlas-architecture",
    title: "7. Архитектура Atlas",
    role: "Архитектура продукта",
    text: [
      "7. Архитектура Atlas",
      "",
      "7.1 Участники системы",
      "7.2 Smart Cycle",
      "7.3 Партнерская программа",
      "7.4 Смарт-контракты",
      "7.5 Голосования сообщества",
      "7.6 Будущие продукты экосистемы",
    ].join("\n"),
    notes: "Дать верхнеуровневую карту системы до углубления в Smart Cycle.",
  },
  {
    id: "smart-cycle",
    title: "8. Smart Cycle",
    role: "Главная механика",
    text: [
      "8. Smart Cycle",
      "",
      "8.1 Что такое Smart Cycle",
      "8.2 Принцип работы цикла",
      "8.3 Жизненный цикл участия",
      "8.4 Вход в цикл",
      "8.5 Добавочная помощь",
      "8.6 Завершение цикла",
      "8.7 Повторное участие",
      "8.8 Ограничения механики",
      "8.9 Примеры работы",
    ].join("\n"),
    notes: "Один из ключевых разделов. Нужны простые примеры и честные ограничения.",
  },
  {
    id: "economic-model",
    title: "9. Экономическая модель",
    role: "Экономика",
    text: [
      "9. Экономическая модель",
      "",
      "9.1 Основные экономические принципы",
      "9.2 Формирование кассы взаимопомощи",
      "9.3 Движение средств",
      "9.4 Формирование добавочной помощи",
      "9.5 Балансировка системы",
      "9.6 Ограничения модели",
      "9.7 Условия завершения циклов",
      "9.8 Запуск новых циклов",
      "9.9 Устойчивость экосистемы",
    ].join("\n"),
    notes: "Главный раздел для доверия. Писать сухо, понятно и без гарантий.",
  },
  {
    id: "cycle-ecosystem",
    title: "10. Экосистема циклов",
    role: "Преемственность циклов",
    text: [
      "10. Экосистема циклов",
      "",
      "10.1 Цикл как продукт",
      "10.2 Почему Atlas не зависит от одного цикла",
      "10.3 Преемственность циклов",
      "10.4 Сохранение сообщества",
      "10.5 Долгосрочное развитие участников",
    ].join("\n"),
    notes: "Показать, почему Atlas шире одного Smart Cycle.",
  },
  {
    id: "partner-program",
    title: "11. Партнерская программа",
    role: "Партнерка",
    text: [
      "11. Партнерская программа",
      "",
      "11.1 Назначение партнерской программы",
      "11.2 Рекомендательная модель",
      "11.3 Прямой бонус",
      "11.4 Командный бонус",
      "11.5 Match Bonus",
      "11.6 Статусы и ранги",
      "11.7 Карьерная модель",
    ].join("\n"),
    notes: "Отделить партнерскую программу от базовой экономики Smart Cycle.",
  },
  {
    id: "participant-roles",
    title: "12. Роли участников",
    role: "Роли",
    text: [
      "12. Роли участников",
      "",
      "12.1 Участник",
      "12.2 Builder",
      "12.3 Leader",
      "12.4 Архитектор",
      "12.5 Команда поддержки",
    ].join("\n"),
    notes: "Описать роли без иерархического давления и без обещаний дохода.",
  },
  {
    id: "technology-architecture",
    title: "13. Технологическая архитектура",
    role: "Технологии",
    text: [
      "13. Технологическая архитектура",
      "",
      "13.1 Используемый блокчейн",
      "13.2 Смарт-контракты",
      "13.3 Работа с кошельками",
      "13.4 Проверяемость операций",
      "13.5 Масштабирование системы",
    ].join("\n"),
    notes: "Технологии объяснять после механики, простым языком.",
  },
  {
    id: "security",
    title: "14. Безопасность",
    role: "Безопасность",
    text: [
      "14. Безопасность",
      "",
      "14.1 Безопасность смарт-контрактов",
      "14.2 Аудитируемость",
      "14.3 Открытость данных",
      "14.4 Защита инфраструктуры",
      "14.5 Пользовательская безопасность",
    ].join("\n"),
    notes: "Разделить безопасность системы и ответственность пользователя за кошелек.",
  },
  {
    id: "governance",
    title: "15. Governance",
    role: "Управление",
    text: [
      "15. Governance",
      "",
      "15.1 Роль сообщества",
      "15.2 Голосование за новые циклы",
      "15.3 Развитие платформы",
      "15.4 Будущая децентрализация управления",
    ].join("\n"),
    notes: "Не называть систему полностью децентрализованной, если это ещё не так.",
  },
  {
    id: "roadmap",
    title: "16. Roadmap",
    role: "Дорожная карта",
    text: [
      "16. Roadmap",
      "",
      "16.1 Подготовительный этап",
      "16.2 Запуск Atlas",
      "16.3 Масштабирование",
      "16.4 Развитие экосистемы",
      "16.5 Новые продукты",
    ].join("\n"),
    notes: "Отделить подтвержденные планы от гипотез и будущих направлений.",
  },
  {
    id: "risks",
    title: "17. Риски",
    role: "Риски",
    text: [
      "17. Риски",
      "",
      "17.1 Отсутствие гарантий",
      "17.2 Рыночные риски",
      "17.3 Риски завершения циклов",
      "17.4 Технологические риски",
      "17.5 Регуляторные риски",
      "17.6 Риски пользовательских решений",
    ].join("\n"),
    notes: "Сделать максимально честный раздел: что может пойти не так.",
  },
  {
    id: "legal-information",
    title: "18. Юридическая информация",
    role: "Юридическая рамка",
    text: [
      "18. Юридическая информация",
      "",
      "18.1 Добровольное участие",
      "18.2 Отсутствие инвестиционных гарантий",
      "18.3 Ограничение ответственности",
      "18.4 Соответствие законодательству",
      "18.5 Заключительный Disclaimer",
    ].join("\n"),
    notes: "Сверить с юридической вычиткой и публичными формулировками.",
  },
  {
    id: "conclusion",
    title: "19. Заключение",
    role: "Финальная рамка",
    text: [
      "19. Заключение",
      "",
      "19.1 Будущее Atlas",
      "19.2 Развитие глобального сообщества",
      "19.3 Следующий этап развития платформы",
    ].join("\n"),
    notes: "Завершить документ спокойно: без обещаний, с фокусом на развитие и сообщество.",
  },
  {
    id: "disclaimer",
    title: "Disclaimer",
    role: "Юридическое приложение",
    text: [
      "Disclaimer",
      "",
      "Юридическая информация",
      "",
      "Отказ от гарантий",
      "",
      "Ограничение ответственности",
      "",
      "Предупреждение о рисках",
      "",
      "Условия использования",
    ].join("\n"),
    notes: "Финальный юридический блок. Позже раскрыть каждый пункт отдельным текстом.",
  },
];

const whitePaper40Blocks = WHITE_PAPER_40_SECTIONS.map((section, index) => ({
  id: `wp40-${section.id}`,
  title: section.title,
  sourceTitle: section.title,
  sectionNumber: String(index + 1).padStart(2, "0"),
  view: "whitepaper40",
  role: section.role,
  status: "Черновик",
  text: section.text || "",
  notes: section.notes,
}));

export const defaultWhitePaperBlocks = [...publicWhitePaperBlocks, ...archiveWhitePaperBlocks, ...whitePaper20Blocks, ...whitePaper30Blocks, ...whitePaper40Blocks];
