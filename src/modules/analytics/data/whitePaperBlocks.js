import atlasWhitePaperMarkdown from "../../../../docs/atlas-system-white-paper-v6.4.md?raw";

const BLOCK_META = {
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

function normalizeTitle(title) {
  return title.trim().replace(/\s+/g, " ");
}

function createFallbackId(index) {
  return `white-paper-section-${String(index).padStart(2, "0")}`;
}

function stripSectionNumber(title) {
  return normalizeTitle(title.replace(/^\d+(?:\.\d+)*\.?\s+/, ""));
}

function createWhitePaperBlocks(markdown) {
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
    const meta = BLOCK_META[number] || {};
    const displayTitle = meta.title || stripSectionNumber(title);
    const text = [title, "", section.lines.join("\n").trim()].filter(Boolean).join("\n");

    return {
      id: meta.id || createFallbackId(index),
      title: displayTitle,
      sourceTitle: title,
      sectionNumber: number,
      role: meta.role || "Раздел",
      status: "На вычитке",
      text,
      notes: "Рабочая версия v6.4 из документа White Paper. Вычитать на ясность, юридическую аккуратность, соответствие smart-spec и отсутствие обещаний результата.",
    };
  });

  return [
    {
      id: "cover",
      title: "Обложка White Paper",
      sourceTitle: titleLine,
      sectionNumber: "0",
      role: "Титульный блок",
      status: "На вычитке",
      text: [titleLine, "", introLines.join("\n").trim()].filter(Boolean).join("\n"),
      notes: "Титульный блок рабочей версии v6.4. Проверить статус Draft, дату версии и публичную пригодность перед публикацией.",
    },
    ...preparedSections,
  ];
}

export const defaultWhitePaperBlocks = createWhitePaperBlocks(atlasWhitePaperMarkdown);
