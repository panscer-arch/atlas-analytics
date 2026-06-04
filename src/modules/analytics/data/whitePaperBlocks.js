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

Web3 Mutual Support Protocol with DAO-Inspired Mechanics

Version: 0.1
Status: Working Draft for Review
Date: June 2026
Primary Network: BNB Smart Chain

Official Website: https://atlas-system.io
Official Telegram Channel: @atlas_system_official
Official Telegram Community: @atlas_system_global_community
Official X: https://x.com/AtlasSystemWeb3

Contract Registry: To be confirmed before public release
Technical Repository: To be confirmed before public release
Documentation Hub: To be confirmed before public release

This document describes the current working structure of Atlas System, including the Smart Cycle mechanism, the Web3/on-chain layer, the off-chain referral layer, DAO-inspired community mechanics, transparency standards, limitations and risk disclosures.

This document is provided for review and coordination. It is not a token sale document, not an ICO document, not financial advice and not a guarantee of any result.`,
    notes: "Согласовать: версию, статус, сеть, final official links, contract registry, GitHub/repository и docs-hub. На обложке не писать WhitePaper 2.0; это название рабочей вкладки, а не публичной версии документа.",
  },
  {
    id: "wp20-legal-disclaimer",
    title: "Legal Notice и Reader Guide",
    role: "Юридическая рамка и как читать документ",
    text: `Legal Notice and Reader Guide

This White Paper is provided for informational and technical review purposes only. It describes the current working structure of Atlas System, including the Smart Cycle mechanism, the Web3/on-chain layer, the off-chain referral layer, selected DAO-inspired mechanics, transparency standards, limitations and risk disclosures.

This document is not an offer to sell or purchase any token, security, share, debt instrument, investment product, deposit product or right to future revenue. Atlas System does not use this White Paper as an ICO document, token sale document, prospectus or guaranteed-return document.

Nothing in this document should be interpreted as financial, investment, legal, tax, accounting or regulatory advice. Participants, partners, reviewers and readers should make their own independent assessment and, where appropriate, consult qualified professional advisers before taking any action.

Atlas System may involve smart-contract, blockchain, liquidity, operational, technical, legal and user-error risks. Any on-chain action is confirmed by the participant through their own wallet. Atlas should never request a seed phrase, private key, wallet password or remote access to a participant's device.

This White Paper distinguishes between:

1. the on-chain Smart Cycle layer, where contract-defined actions may be independently inspected through the relevant blockchain explorer;
2. the off-chain service layer, including interface, analytics, documentation, referral attribution and operational workflows;
3. live documentation, including contract registry, official links, audit status, changelog and technical references;
4. legal, risk and security disclosures that may be updated as the project, contracts, jurisdictions and review status evolve.

Readers should not rely on screenshots, private messages, unofficial translations or outdated PDF copies as the source of truth. Before any wallet action, readers should verify the current official website, contract registry, network, contract address, transaction details and the latest published version of this document.

This document is a working draft unless expressly marked as a final public release. Parameters, terminology, risk disclosures, contract references, official links and operational processes may be updated before publication.`,
    notes: "Согласовать с Web3-юристом: тон должен быть жесткий, но не превращать документ в отказ от всего. Проверить no token sale, no investment advice, no guarantee, source-of-truth, wallet safety и разграничение on-chain/off-chain.",
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

export const defaultWhitePaperBlocks = [...publicWhitePaperBlocks, ...archiveWhitePaperBlocks, ...whitePaper20Blocks];
