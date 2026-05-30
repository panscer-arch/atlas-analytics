import { useEffect, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const AGENT_TERMINOLOGY_STORAGE_KEY = "atlas.analytics.agentTerminologyTemplate.v2";

const terminologyReviewComments = {
  "core-0": "Вариант термина: Atlas System. Описание лучше: Web3-based mutual support system with smart-contract automation and DAO-inspired mechanics. По-русски: цифровая Web3-система взаимной помощи, а не инвестиционная платформа.",
  "core-1": "Вариант термина: Участник / Participant. Не использовать “клиент” и “инвестор”; это меняет юридическую рамку.",
  "core-2": "Вариант термина: Web3-регистрация. Хорошо подчеркнуть: аккаунт создается через подключение кошелька, без email/password.",
  "core-3": "Вариант термина: Личный кабинет / Participant Dashboard. Можно убрать “тикеты помощи” из короткого описания, если в интерфейсе пока показываются циклы.",
  "core-4": "Вариант термина: Сообщество Atlas / Atlas Community. Важно: сообщество помогает обучать и развивать систему, но не гарантирует выплаты.",
  "core-5": "Вариант термина: DAO-inspired mechanics. Английская формулировка: Atlas is not a full DAO, but uses DAO-inspired mechanics for selected governance and community decision-making features.",
  "web3-0": "Вариант термина: MetaMask wallet. Уточнить: non-custodial wallet, где Atlas не хранит приватные ключи.",
  "web3-1": "Вариант термина: WalletConnect. Оставить только если реально включено в кабинете; иначе пометить как planned/optional.",
  "web3-2": "Вариант термина: BNB Smart Chain (BSC). Лучше писать полное название при первом упоминании.",
  "web3-3": "Вариант термина: BEP20 USDT. Важно: не просто USDT, а USDT в сети BSC/BEP20.",
  "web3-4": "Вариант термина: Network gas / BNB gas. Пояснить, что это комиссия сети, а не комиссия Atlas.",
  "web3-5": "Вариант термина: BscScan explorer. Добавить после публикации: official contract address should be checked only from official registry.",
  "web3-6": "Вариант термина: Non-custodial wallet. Это нужно для FAQ и рисков: пользователь сам хранит ключи и сам подтверждает транзакции.",
  "web3-7": "Вариант термина: Contract Address Registry. Нужен как source-of-truth для адресов контрактов, сети и explorer links.",
  "cycles-0": "Вариант термина: Smart Cycle. Хорошо, но лучше убрать ощущение обещанного результата: цикл исполняется по правилам смарт-контракта и при наличии условий.",
  "cycles-1": "Вариант термина: Participation ticket / Тикет участия. “Тикет помощи” мягче юридически, но может звучать непривычно; выбрать один термин и держать везде.",
  "cycles-2": "Вариант термина: Создание Smart Cycle. Не использовать “депозит” в публичных материалах.",
  "cycles-3": "Вариант термина: Participation amount / Сумма участия. “Сумма оказанной помощи” юридически мягко, но длинно для интерфейса.",
  "cycles-4": "Вариант термина: Lockup Flow. Добавить: fixed-period Smart Cycle.",
  "cycles-5": "Вариант термина: Daily Flow. Нужна короткая точная формула: 200-day flow with daily claim mechanics, если это финально подтверждено.",
  "cycles-6": "Вариант термина: Запрос помощи / Claim request. Хорошая публичная замена Claim.",
  "cycles-7": "Вариант термина: Claim. Оставить как технический термин в Web3-интерфейсе, но для новичков объяснять как “запросить помощь”.",
  "cycles-8": "Вариант термина: Calculated delta / Расчетная дельта. Слово “добавочная помощь” безопаснее, но обязательно: не гарантированная прибыль.",
  "cycles-9": "Вариант термина: New money / Новый вход средств. Это важно для аналитики и устойчивости модели.",
  "cycles-10": "Вариант термина: System obligations / Расчетные обязательства. Указать, что это аналитическая метрика, не отдельная гарантия выплаты.",
  "partner-0": "Вариант термина: Partner Program. Описание должно говорить про правила, квалификации и компрессию, без обещания дохода.",
  "partner-1": "Вариант термина: Referral link. Важно: личная ссылка участника; для общих вебинаров не давать ведущему уводить чужую аудиторию.",
  "partner-2": "Вариант термина: Career status / Статус. Связать с Builder, Master, Strategist и т.д.",
  "partner-3": "Вариант термина: Compression. Нужно финальное описание на простом примере для партнерского документа.",
  "partner-4": "Вариант термина: Matching bonus. Оставить английский термин, но рядом дать русское объяснение.",
  "partner-5": "Вариант термина: Referral structure / Партнерская структура. “Неограниченная глубина” использовать осторожно: начисления ограничиваются правилами.",
  "finance-0": "Вариант термина: Platform fee. Проверить финальные проценты и писать: applies according to current rules.",
  "finance-1": "Вариант термина: Smart-contract reserve. Лучше, чем “пул”, но надо синхронизировать с интерфейсом.",
  "finance-2": "Вариант термина: Available liquidity. Подчеркнуть: влияет на исполнение запросов помощи.",
  "finance-3": "Вариант термина: Inflow / Входящий поток. Для аналитики ок.",
  "finance-4": "Вариант термина: Outflow / Исходящий поток. Для отчетов и health of system.",
  "finance-5": "Вариант термина: Net flow / Чистый поток. Хорошая метрика, не показывать как доход пользователя.",
  "dao-0": "Вариант термина: DAO-inspired mechanics. Не писать, что Atlas — полноценное DAO.",
  "dao-1": "Вариант термина: Voting power / Вес голоса. “10 USDT = 1 vote” оставить только после финального подтверждения.",
  "dao-2": "Вариант термина: Governance process. Нужна граница: какие вопросы можно выносить на голосование.",
  "dao-3": "Вариант термина: Cycle epoch / Эпоха циклов. Термин сложный; добавить пример или не использовать в публичном FAQ до готовности.",
  "legal-0": "Вариант термина: Not an investment product. Обязательная compliance-формулировка.",
  "legal-1": "Вариант термина: No guaranteed return. Жестко оставить: no guarantee, no fixed profit, no risk-free participation.",
  "legal-2": "Вариант термина: Risk Disclaimer. Хорошо, но добавить user responsibility, smart-contract risk, liquidity risk and network risk.",
  "legal-3": "Вариант термина: Participate / Provide mutual support. “Оказать помощь” безопасно, но в английском лучше avoid “donation”, если это не юридически подтверждено.",
  "legal-4": "Вариант термина: Request support / Claim. Оставить оба: публичный и технический.",
  "legal-5": "Вариант термина: Source of truth. Нужен для документов, contract registry, тарифов и партнерских процентов.",
  "legal-6": "Вариант термина: Web3 risk. Должен попадать в Risk Disclaimer, FAQ и onboarding.",
  "analytics-0": "Вариант термина: Registered wallet. Лучше, чем Registered, потому что регистрация привязана к адресу кошелька.",
  "analytics-1": "Вариант термина: First Smart Cycle. Если в интерфейсе уйдем от “ticket”, этот термин понятнее.",
  "analytics-2": "Вариант термина: Active participant. Нужен точный период/условие активности.",
  "analytics-3": "Вариант термина: Inactive participant. Уточнить, после какого события/периода считается inactive.",
  "analytics-4": "Вариант термина: Web3 funnel. Хороший термин для аналитики продукта.",
  "analytics-5": "Вариант термина: Repeat participation / Повторный Smart Cycle. Лучше, чем повторный депозит.",
  "analytics-6": "Вариант термина: Speaker rating. Нужен для вебинаров и бонусов ведущим.",
  "analytics-7": "Вариант термина: Webinar bonus. Обязательно: бонус определяется после вебинара по критериям, не автоматическая гарантия.",
};

const defaultTerminologySections = [
  {
    id: "core",
    title: "БАЗОВЫЕ ПОНЯТИЯ",
    rows: [
      ["Atlas System", "Цифровая касса взаимопомощи нового поколения на базе Web3, smart-contract и DAO-механик.", "Базовая публичная формулировка для презентаций, FAQ и AI-агента."],
      ["Участник", "Человек, который подключил кошелёк и добровольно участвует в системе взаимной помощи через личный кабинет.", "Не называть клиентом: в манифесте участник — соисследователь и со-создатель системы."],
      ["Регистрация", "Первое подключение MetaMask или другого поддерживаемого кошелька к личному кабинету.", "Важно: email-регистрации нет."],
      ["Личный кабинет", "Интерфейс участника для создания тикетов помощи, отслеживания смарт-циклов, запроса помощи, статусов, партнёрки и материалов.", ""],
      ["Сообщество", "Участники, лидеры и команды, которые помогают объяснять правила взаимопомощи, обучать новичков и развивать систему.", ""],
      ["DAO-inspired mechanics", "Механики, вдохновленные DAO: отдельные функции голосования, обсуждения и участия сообщества без заявления, что Atlas является полноценным DAO.", "Рекомендуемая английская формулировка для сайта и White Paper."],
    ],
  },
  {
    id: "web3",
    title: "WEB3 / КОШЕЛЁК",
    rows: [
      ["MetaMask", "Non-custodial кошелёк, через который участник авторизуется и подписывает действия в Atlas.", "Уточнить список поддерживаемых кошельков после релиза."],
      ["WalletConnect", "Способ подключить внешний криптокошелёк к интерфейсу без хранения ключей на стороне Atlas.", ""],
      ["BSC", "BNB Smart Chain, blockchain-сеть для основной логики транзакций Atlas.", ""],
      ["BEP20", "Стандарт токенов в сети BSC, в котором используется USDT для участия.", ""],
      ["BNB Gas", "BNB, который нужен на кошельке для оплаты комиссии сети при транзакциях.", ""],
      ["BscScan", "Обозреватель сети BSC, где можно проверить транзакции, адреса и события smart-contract.", "Добавить ссылку на контракт после публикации."],
      ["Non-custodial wallet", "Кошелек, где приватные ключи и seed-фраза хранятся у пользователя, а не у Atlas.", "Важный термин для рисков и FAQ."],
      ["Contract Address Registry", "Официальный реестр адресов smart-contract, сети, explorer-ссылок и статуса проверки кода.", "Нужен как source-of-truth перед публичным запуском."],
    ],
  },
  {
    id: "cycles",
    title: "SMART CYCLE",
    rows: [
      ["Smart Cycle", "Смарт-цикл взаимной помощи на выбранный срок, который создаётся и исполняется через smart-contract.", "Ядро Smart Cycle 1 и всей текущей логики Atlas."],
      ["Тикет помощи", "Запись о том, что участник оказал помощь системе на выбранную сумму и период через smart-contract.", "Можно использовать в интерфейсе как понятную единицу цикла."],
      ["Создание тикета", "Подтверждённая транзакция, при которой участник оказывает помощь системе: выбирает сумму, период и подписывает действие в кошельке.", "Не называть публично «депозитом» или «инвестицией»."],
      ["Сумма оказанной помощи", "Размер средств, которые участник добровольно направил в smart-contract в рамках тикета помощи.", "Это корректная замена словам «вклад», «депозит», «тело депозита»."],
      ["Lockup Flow", "Смарт-цикл с фиксированным сроком, после которого участник может одной транзакцией запросить возврат суммы помощи и добавочную помощь.", ""],
      ["Daily Flow", "Смарт-цикл на 200 дней, где участнику предоставляется право ежедневно запрашивать помощь по условиям smart-contract.", ""],
      ["Запрос помощи", "Действие, которым участник после выполнения условий тикета запрашивает доступную помощь у системы.", "Это публичная замена слову Claim."],
      ["Claim", "Техническое Web3-действие запроса помощи в smart-contract после выполнения условий смарт-цикла.", "В интерфейсе можно оставить как технический термин, но в объяснениях писать «запросить помощь»."],
      ["Дельта", "Добавочная помощь сверх суммы оказанной помощи, предусмотренная условиями смарт-цикла и доступная к запросу при наличии ликвидности.", "Не писать как гарантированную прибыль или доход."],
      ["Новые деньги", "Любой новый вход средств в smart-contract через новый тикет помощи, даже если участник недавно запросил помощь и снова участвует.", "Ключевое определение для аналитики."],
      ["Обязательства", "Сумма оказанной помощи по активным тикетам плюс предусмотренная добавочная помощь, которую система должна исполнить по текущим правилам при наличии ликвидности.", ""],
    ],
  },
  {
    id: "partner",
    title: "ПАРТНЁРКА",
    rows: [
      ["Партнёрская программа", "Система начислений от добавочной помощи структуры с учётом статусов, активности и правил компрессии.", ""],
      ["Реферальная ссылка", "Персональная ссылка участника, которая появляется после создания первого смарт-цикла от минимальной суммы.", "Сверить финальную сумму активации: сейчас в материалах от 10 $."],
      ["Статус", "Квалификация участника, влияющая на процент партнёрских начислений от добавочной помощи структуры.", ""],
      ["Компрессия", "Логика перераспределения уровней, когда промежуточные участники не соответствуют условиям квалификации.", "Нужно сверить с финальной таблицей партнерки."],
      ["Matching bonus", "Дополнительный бонус от партнёрских начислений лично приглашённого участника при выполнении статусных условий.", ""],
      ["Линейная структура", "Структура приглашений на неограниченную глубину, где учитываются личные и глубинные связи.", ""],
    ],
  },
  {
    id: "finance",
    title: "ДЕНЬГИ / КОМИССИИ",
    rows: [
      ["Platform Fee", "Комиссия платформы, которая по smart-spec удерживается с полученной добавочной помощи по продуктам и с партнёрских claim.", "В smart-spec указано 8%; не распространяется на возврат суммы оказанной помощи, если финальная архитектура это подтверждает."],
      ["Smart-contract резерв", "Средства в smart-contract, из которых алгоритм исполняет запросы помощи, комиссии и партнёрские начисления.", "Лучше, чем слово «пул», если хотим звучать юридически аккуратнее."],
      ["Ликвидность", "Доступный объём средств в smart-contract для исполнения запросов помощи и текущих обязательств.", ""],
      ["Входящий поток", "Средства, которые поступают в smart-contract через новые тикеты помощи участников.", ""],
      ["Исходящий поток", "Исполненные запросы помощи, комиссии платформы и партнёрские начисления.", ""],
      ["Чистый поток", "Разница между входящим и исходящим потоком за выбранный период.", "Полезно для аналитики устойчивости кассы взаимопомощи."],
    ],
  },
  {
    id: "dao",
    title: "DAO / УПРАВЛЕНИЕ",
    rows: [
      ["DAO", "Механизм участия сообщества в обсуждении и голосовании по важным вопросам развития Atlas.", ""],
      ["Голос", "Единица участия в DAO-голосовании. Базовая гипотеза: 10 USDT участия = 1 vote.", "Проверить финальное правило перед публикацией."],
      ["Governance", "Процесс управления параметрами и решениями системы через правила и голосования.", ""],
      ["Эпоха", "Серия циклов или этап развития системы с возможным управляемым перезапуском через DAO.", "Идея требует отдельного описания."],
    ],
  },
  {
    id: "legal",
    title: "ЮРИДИКА / РИСКИ",
    rows: [
      ["Не инвестиция", "Корректная рамка: Atlas — цифровая касса взаимопомощи, а не инвестиционный продукт с обещанием дохода.", "Обязательная формулировка для публичных материалов."],
      ["Не гарантия дохода", "Запрет обещать гарантированный результат, безрисковость, фиксированную прибыль или обязательное исполнение запроса без ликвидности.", ""],
      ["Risk disclaimer", "Предупреждение о рисках Web3, ликвидности, smart-contract и самостоятельной ответственности участника.", "Важно указывать, что запрос помощи исполняется при наличии достаточной ликвидности."],
      ["Оказать помощь", "Корректная формулировка для создания тикета/смарт-цикла вместо слова «инвестировать».", ""],
      ["Запросить помощь", "Корректная формулировка для claim после выполнения условий тикета или в ежедневной логике Daily Flow.", ""],
      ["Source of truth", "Основной утвержденный источник данных по параметрам, адресам контрактов, тарифам, комиссиям и партнерским правилам.", "Нужен для White Paper, FAQ, AI-агента и переводчиков."],
      ["Web3 risk", "Риск, связанный с кошельком, сетью, smart-contract, фишингом, ликвидностью, ошибкой пользователя или изменением внешней инфраструктуры.", "Добавить в onboarding и уведомление о рисках."],
    ],
  },
  {
    id: "analytics",
    title: "АНАЛИТИКА",
    rows: [
      ["Registered", "Участник, который впервые подключил кошелёк к кабинету.", ""],
      ["First ticket", "Участник, который впервые создал тикет помощи / первый смарт-цикл.", "Лучше, чем First deposit для новой терминологии."],
      ["Active", "Участник с активным тикетом помощи или актуальной активностью по правилам аналитики.", ""],
      ["Inactive", "Участник без новых действий после регистрации, тикета или запроса помощи.", ""],
      ["Web3-воронка", "Путь от открытия сайта до подключения кошелька, первого тикета помощи, запроса помощи и повторного участия.", ""],
      ["Повторное участие", "Создание нового тикета помощи после предыдущего участия или запроса помощи.", "В аналитике это новые деньги."],
      ["Speaker rating", "Оценка ведущего вебинара по качеству презентации, удержанию аудитории, соблюдению правил коммуникации и реакции участников.", "Нужно для расчета бонусов за вебинары."],
      ["Webinar bonus", "Денежный бонус ведущему вебинара, который может определяться после события по количеству участников, качеству, рейтингу и статусу спикера.", "Не обещать автоматическую фиксированную выплату без правил."],
    ],
  },
].map((section) => ({
  ...section,
  rows: section.rows.map(([term, description, comment], index) => ({
    id: `${section.id}-${index}`,
    term,
    description,
    comment: comment || "",
    review: terminologyReviewComments[`${section.id}-${index}`] || "",
    approved: false,
  })),
}));

export const defaultTerminologyTemplate = { sections: defaultTerminologySections };
const TERMINOLOGY_SECTION_DESCRIPTIONS = {
  core: "Главные слова, которыми описываем Atlas, участника, регистрацию и личный кабинет.",
  web3: "Кошелёк, сеть, токены, gas и проверка транзакций в blockchain.",
  cycles: "Тикеты помощи, Smart Cycle, запрос помощи, дельта, новые деньги и обязательства системы.",
  partner: "Партнёрская программа, статусы, компрессия, matching bonus и структура.",
  finance: "Smart-contract резерв, ликвидность, комиссии, входящие и исходящие потоки.",
  dao: "DAO, голоса, governance и возможные эпохи развития системы.",
  legal: "Юридически безопасные формулировки, риски и запрещённые обещания.",
  analytics: "CRM-состояния, Web3-воронка и ключевые определения для аналитики.",
};

function hydrateRows(defaultRows, savedRows = [], deletedRowIds = []) {
  const deletedRows = new Set(deletedRowIds);
  const savedRowsById = new Map(savedRows.map((row) => [row.id, row]));
  const hydratedDefaultRows = defaultRows.filter((defaultRow) => !deletedRows.has(defaultRow.id)).map((defaultRow) => {
    const savedRow = savedRowsById.get(defaultRow.id);
    if (!savedRow) return defaultRow;

    return {
      ...defaultRow,
      term: savedRow.term || defaultRow.term,
      description: savedRow.description || defaultRow.description,
      comment: savedRow.comment || savedRow.source || defaultRow.comment,
      review: savedRow.review || defaultRow.review || "",
      approved: Boolean(savedRow.approved),
    };
  });
  const customRows = savedRows
    .filter((row) => !defaultRows.some((defaultRow) => defaultRow.id === row.id) && !deletedRows.has(row.id))
    .map((row) => ({
      ...row,
      comment: row.comment || row.source || "",
      review: row.review || "",
      approved: Boolean(row.approved),
    }));

  return [...hydratedDefaultRows, ...customRows];
}

function hydrateTemplate(template) {
  if (!template || !Array.isArray(template.sections)) return defaultTerminologyTemplate;

  const savedSectionsById = new Map(template.sections.map((section) => [section.id, section]));
  const sections = defaultTerminologySections.map((defaultSection) => {
    const savedSection = savedSectionsById.get(defaultSection.id);
    if (!savedSection) return defaultSection;

    return {
      ...defaultSection,
      deletedRowIds: savedSection.deletedRowIds || [],
      rows: hydrateRows(defaultSection.rows, savedSection.rows, savedSection.deletedRowIds),
    };
  });

  return { sections };
}

function readStoredTerminology() {
  if (typeof window === "undefined") return defaultTerminologyTemplate;

  try {
    const saved = window.localStorage.getItem(AGENT_TERMINOLOGY_STORAGE_KEY);
    return saved ? hydrateTemplate(JSON.parse(saved)) : defaultTerminologyTemplate;
  } catch {
    return defaultTerminologyTemplate;
  }
}

function persistTerminology(template) {
  try {
    window.localStorage.setItem(AGENT_TERMINOLOGY_STORAGE_KEY, JSON.stringify(template));
    saveServerContent(AGENT_TERMINOLOGY_STORAGE_KEY, template);
  } catch {
    // Терминология останется доступна до перезагрузки даже без localStorage.
  }
}

function createRow(sectionId) {
  return {
    id: `${sectionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    term: "",
    description: "",
    comment: "",
    review: "Новый термин: добавь здесь мой/редакторский вариант термина, пометку для перевода или что нужно уточнить.",
    approved: false,
  };
}

function AgentTerminologyTemplate() {
  const [template, setTemplate] = useState(readStoredTerminology);
  const [activeSectionId, setActiveSectionId] = useState(() => {
    if (typeof window === "undefined") return defaultTerminologyTemplate.sections[0]?.id || "core";

    const url = new URL(window.location.href);
    return url.searchParams.get("term") || defaultTerminologyTemplate.sections[0]?.id || "core";
  });
  const [reviewFilter, setReviewFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    loadServerContent(AGENT_TERMINOLOGY_STORAGE_KEY).then((savedTemplate) => {
      if (!isMounted || !savedTemplate) return;
      setTemplate(hydrateTemplate(savedTemplate));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function updateTemplate(updater) {
    setTemplate((current) => {
      const next = updater(current);
      persistTerminology(next);
      return next;
    });
  }

  function updateRow(sectionId, rowId, field, value) {
    updateTemplate((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          rows: section.rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
        };
      }),
    }));
  }

  function addRow(sectionId) {
    updateTemplate((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? { ...section, rows: [...section.rows, createRow(sectionId)] } : section)),
    }));
  }

  function removeRow(sectionId, rowId) {
    updateTemplate((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;

        return {
          ...section,
          deletedRowIds: Array.from(new Set([...(section.deletedRowIds || []), rowId])),
          rows: section.rows.filter((row) => row.id !== rowId),
        };
      }),
    }));
  }

  const totalTerms = template.sections.reduce((sum, section) => sum + section.rows.length, 0);
  const activeSection = template.sections.find((section) => section.id === activeSectionId) || template.sections[0] || null;
  const activeSectionDescription = activeSection ? TERMINOLOGY_SECTION_DESCRIPTIONS[activeSection.id] : "";
  const activeRows = activeSection?.rows || [];
  const approvedRowsCount = activeRows.filter((row) => row.approved).length;
  const visibleRows = activeRows.filter((row) => {
    if (reviewFilter === "approved") return row.approved;
    if (reviewFilter === "pending") return !row.approved;
    return true;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isKnownSection = template.sections.some((section) => section.id === activeSectionId);
    const nextSectionId = isKnownSection ? activeSectionId : defaultTerminologyTemplate.sections[0]?.id || "core";

    if (nextSectionId !== activeSectionId) {
      setActiveSectionId(nextSectionId);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("board", "terminology");
    url.searchParams.set("term", nextSectionId);
    window.history.replaceState({}, "", url.toString());
  }, [activeSectionId, template.sections]);

  return (
    <section className="analytics-surface analytics-agent-template mt-4">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">Терминология</span>
          <h2 className="analytics-agent-template-title">Глоссарий Atlas System</h2>
          <p className="analytics-page-subtitle mb-0">
            Editable-база терминов для команды и AI-агента. Сейчас в шаблоне {totalTerms} терминов; описания, статусы вычитки и оранжевые редакторские комментарии можно редактировать прямо в таблице.
          </p>
        </div>
      </div>

      <div className="analytics-agent-template-tabs" role="tablist" aria-label="Категории терминологии">
        {template.sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeSection?.id === section.id}
            className={`analytics-agent-template-tab${activeSection?.id === section.id ? " analytics-agent-template-tab-active" : ""}`}
            onClick={() => setActiveSectionId(section.id)}
          >
            {section.title}
          </button>
        ))}
      </div>

      {activeSectionDescription ? <p className="analytics-page-subtitle mb-0">{activeSectionDescription}</p> : null}

      {activeSection ? (
        <div className="analytics-agent-template-grid">
          <div className="analytics-agent-template-card">
            <div className="analytics-agent-template-card-head">
              <div>
                <h3>{activeSection.title}</h3>
                <p className="analytics-agent-template-review-summary">
                  Одобрено {approvedRowsCount} из {activeRows.length}
                </p>
              </div>
              <div className="analytics-agent-template-review-actions">
                <div className="analytics-agent-template-review-filter" aria-label="Фильтр вычитки терминологии">
                  <button type="button" className={reviewFilter === "all" ? "is-active" : ""} onClick={() => setReviewFilter("all")}>
                    Все
                  </button>
                  <button type="button" className={reviewFilter === "pending" ? "is-active" : ""} onClick={() => setReviewFilter("pending")}>
                    Не вычитаны
                  </button>
                  <button type="button" className={reviewFilter === "approved" ? "is-active" : ""} onClick={() => setReviewFilter("approved")}>
                    Одобрены
                  </button>
                </div>
                <AnalyticsActionButton variant="primary" size="sm" onClick={() => addRow(activeSection.id)}>
                  + термин
                </AnalyticsActionButton>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table analytics-table analytics-agent-template-table mb-0">
                <thead>
                  <tr>
                    <th>Статус</th>
                    <th>Термин</th>
                    <th>Описание</th>
                    <th>Комментарий / вариант</th>
                    <th> </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id} className={row.approved ? "analytics-agent-template-row-approved" : ""}>
                      <td>
                        <label className="analytics-agent-template-approval">
                          <input
                            type="checkbox"
                            checked={Boolean(row.approved)}
                            onChange={(event) => updateRow(activeSection.id, row.id, "approved", event.target.checked)}
                          />
                          <span>{row.approved ? "Вычитан" : "Не вычитан"}</span>
                        </label>
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.term}
                          onChange={(event) => updateRow(activeSection.id, row.id, "term", event.target.value)}
                          rows="2"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.description}
                          onChange={(event) => updateRow(activeSection.id, row.id, "description", event.target.value)}
                          rows="3"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input analytics-agent-template-comment"
                          value={row.review || row.comment || ""}
                          onChange={(event) => updateRow(activeSection.id, row.id, "review", event.target.value)}
                          placeholder="Оранжевый комментарий: вариант термина, правка, перевод или что уточнить"
                          rows="4"
                        />
                      </td>
                      <td>
                        <AnalyticsActionButton variant="danger" size="icon" onClick={() => removeRow(activeSection.id, row.id)} title="Удалить термин">
                          x
                        </AnalyticsActionButton>
                      </td>
                    </tr>
                  ))}
                  {!visibleRows.length ? (
                    <tr>
                      <td colSpan="5">
                        <div className="analytics-agent-template-empty">В этом фильтре пока нет терминов.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default AgentTerminologyTemplate;
