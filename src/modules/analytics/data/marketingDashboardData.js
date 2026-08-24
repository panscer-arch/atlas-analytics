export const MARKETING_DASHBOARD_STORAGE_KEY = "atlas.analytics.marketingDashboard.v1";

export const MARKETING_PIPELINE_STATUSES = [
  "Кандидат",
  "Квалифицирован",
  "Связались",
  "Переговоры",
  "Договорились",
  "Запланировано",
  "Подключено",
  "Размещено",
  "Опубликовано",
  "Завершено",
  "Отказ",
  "Пауза",
];

export const MARKETING_DIRECTION_PHASES = [
  "Не начато",
  "Сбор базы",
  "Квалификация",
  "Переговоры",
  "Запущено",
  "На паузе",
];

const LEGACY_PIPELINE_STATUSES = {
  "Проверить": "Кандидат",
  "Написали": "Связались",
  "Ответили": "Связались",
  "Договориться": "Переговоры",
};
const RETIRED_MARKETING_DIRECTION_IDS = ["creatives", "telega"];

function hydrateRows(rows) {
  return rows.map((row) => ({
    ...row,
    status: LEGACY_PIPELINE_STATUSES[row.status] || row.status || "Кандидат",
    lastContactAt: row.lastContactAt || "",
    nextActionDueAt: row.nextActionDueAt || "",
  }));
}

const EMAIL_AGENCIES_SHEET =
  "https://docs.google.com/spreadsheets/d/1hc0rC4njpSAC2B-PeLdeQSLnxgGvtYxJ2JvJTU9gEhw/edit";
const LISTINGS_SHEET =
  "https://docs.google.com/spreadsheets/d/1hc0rC4njpSAC2B-PeLdeQSLnxgGvtYxJ2JvJTU9gEhw/edit?gid=256464925#gid=256464925";

export const MARKETING_DIRECTIONS = [
  {
    id: "mlm",
    order: 1,
    title: "Знакомые сетевики",
    shortTitle: "Знакомые сетевики",
    owner: "Rotenberg / David",
    phase: "Сбор базы",
    description: "Личные контакты сетевиков, с которыми уже знакомы Rotenberg и David: договорённости, следующие шаги и результаты.",
    sourceKey: "generic",
    accent: "mint",
  },
  {
    id: "mlmIntroductions",
    order: 2,
    title: "Знакомство с сетевиками",
    shortTitle: "Знакомство с сетевиками",
    owner: "Назначить",
    phase: "Сбор базы",
    description: "Новый поиск и первые знакомства с MLM-лидерами и сетевиками: интро, встреча и следующий шаг.",
    baseTab: "mlmLeaders",
    sourceKey: "mlm",
    accent: "green",
  },
  {
    id: "influencers",
    order: 3,
    title: "Инфлюенсеры",
    shortTitle: "Инфлюенсеры",
    owner: "Костя",
    phase: "Квалификация",
    description: "YouTube, Instagram, Telegram и X: найденные авторы, контакты, переговоры и размещения.",
    baseTab: "influencers",
    sourceKey: "influencers",
    accent: "blue",
  },
  {
    id: "monitors",
    order: 4,
    title: "Иностранные HYIP-мониторы",
    shortTitle: "HYIP-мониторы",
    owner: "Назначить",
    phase: "Квалификация",
    description: "Проверенные живые мониторы, контакты редакций, условия листинга и история переговоров.",
    baseTab: "monitors",
    sourceKey: "monitors",
    accent: "amber",
  },
  {
    id: "complex",
    order: 5,
    title: "Комплексное продвижение",
    shortTitle: "Комплексное продвижение",
    owner: "Генри",
    phase: "Не начато",
    description: "Комплексные кампании Генри, включая часть Telegram-рекламы и размещений через Telega.io.",
    sourceKey: "generic",
    accent: "violet",
  },
  {
    id: "articles",
    order: 6,
    title: "Статьи на крипторесурсах",
    shortTitle: "Статьи и PR",
    owner: "Назначить",
    phase: "Квалификация",
    description: "Пресс-релизы, sponsored articles, Collaborator.pro, публикации и хранение готовых статей.",
    baseTab: "articlePlacement",
    sourceKey: "articles",
    accent: "green",
  },
  {
    id: "guerrilla",
    order: 7,
    title: "Партизанский маркетинг",
    shortTitle: "Партизанский маркетинг",
    owner: "Назначить",
    phase: "Не начато",
    description: "Ручные активности в сообществах, экспертные комментарии, микроинфлюенсеры и тесты гипотез.",
    sourceKey: "generic",
    accent: "rose",
  },
  {
    id: "email",
    order: 8,
    title: "Email-маркетинг (спам-маркетинг)",
    shortTitle: "Email / спам-маркетинг",
    owner: "Назначить",
    phase: "Сбор базы",
    description: "Почтовые базы, шаблоны, история отправок и подрядчики по массовым рассылкам и спам-маркетингу.",
    sourceKey: "generic",
    sourceUrl: EMAIL_AGENCIES_SHEET,
    sourceLabel: "Таблица email-агентств",
    accent: "blue",
  },
  {
    id: "web3Ads",
    order: 9,
    title: "Реклама в Web3-инфраструктуре",
    shortTitle: "Web3-реклама",
    owner: "Назначить",
    phase: "Не начато",
    description: "Кошельки, BscScan и другие блокчейн-обозреватели, каталоги и криптоплатформы.",
    sourceKey: "generic",
    accent: "mint",
  },
  {
    id: "revshare",
    order: 10,
    title: "RevShare Program",
    shortTitle: "RevShare",
    owner: "Назначить",
    phase: "Не начато",
    description: "Отдельная программа для арбитражников: кандидаты, переговоры, подключения и результаты трафика.",
    sourceKey: "generic",
    accent: "amber",
  },
  {
    id: "listings",
    order: 11,
    title: "dApp-листинги",
    shortTitle: "Листинги",
    owner: "Назначить",
    phase: "Сбор базы",
    description: "Каталоги dApp и агентства: требования, контакты, стоимость, подача заявки и результат.",
    sourceKey: "generic",
    sourceUrl: LISTINGS_SHEET,
    sourceLabel: "Таблица dApp-листингов",
    accent: "cyan",
  },
  {
    id: "events",
    order: 12,
    title: "Блокчейн-фесты и MLM-мероприятия",
    shortTitle: "Фесты и мероприятия",
    owner: "Назначить",
    phase: "Сбор базы",
    description: "Конференции, блокчейн-фесты и мероприятия для сетевиков: календарь, контакты, участие и результаты.",
    sourceKey: "generic",
    accent: "violet",
  },
  {
    id: "vacancies",
    order: 13,
    title: "Работа с базой вакансий",
    shortTitle: "База вакансий",
    owner: "Назначить",
    phase: "Сбор базы",
    description: "Web3 и региональные job boards: публикации, кандидаты, отклики и поиск партнёров по странам.",
    baseTab: "regionalHiring",
    sourceKey: "vacancies",
    accent: "rose",
  },
  {
    id: "vk",
    order: 14,
    title: "VK-продвижение",
    shortTitle: "VK-аудитории",
    owner: "Назначить",
    phase: "Сбор базы",
    description: "VK Ads, тематические сообщества, вебинары и партнёрские размещения для привлечения русскоязычной аудитории.",
    sourceKey: "generic",
    accent: "blue",
  },
];

const defaultDirectionContent = {
  mlm: {
    notes: "",
    rows: [],
    materials: [
      { id: "mlm-material-1", title: "Презентация для MLM-лидера", url: "", status: "Подготовить", note: "Короткий лидерский пакет Atlas." },
    ],
  },
  mlmIntroductions: {
    notes: "Новые контакты не смешиваем с личной базой Rotenberg и David: фиксируем источник знакомства, интро, первую встречу и следующий шаг.",
    rows: [],
    materials: [
      { id: "mlm-introduction-material-1", title: "Сценарий первого знакомства", url: "", status: "Подготовить", note: "Короткое интро, квалификация контакта и приглашение на встречу." },
    ],
  },
  influencers: {
    notes: "",
    rows: [],
    materials: [
      { id: "influencer-material-1", title: "Бриф для инфлюенсеров", url: "", status: "Подготовить", note: "Форматы: обзор, вебинар, интервью, интеграция." },
    ],
  },
  monitors: {
    notes: "",
    rows: [],
    materials: [
      { id: "monitor-material-1", title: "Письмо для HYIP-мониторов", url: "", status: "Черновик", note: "Запрос условий review, listing и рекламы." },
    ],
  },
  complex: {
    notes: "Telegram-реклама теперь ведётся внутри комплексного продвижения Генри вместе с другими медиаканалами.",
    rows: [],
    materials: [
      { id: "telega-material-1", title: "Telega.io", url: "https://telega.io/", status: "Проверить", note: "Проверить требования, гео, цены и форматы размещения." },
    ],
  },
  telega: {
    notes: "",
    rows: [],
    materials: [
      { id: "telega-material-1", title: "Telega.io", url: "https://telega.io/", status: "Проверить", note: "Проверить требования, гео, цены и форматы размещения." },
    ],
  },
  articles: {
    notes: "Для каждой площадки готовим отдельный материал, а не один универсальный текст.",
    rows: [],
    materials: [
      { id: "article-ambcrypto", title: "Публикация AMBCrypto", url: "", status: "Нужно добавить URL", note: "После добавления финальной ссылки указать дату публикации." },
      { id: "article-bscnews", title: "Публикация BSC.News", url: "", status: "Нужно добавить URL", note: "После добавления финальной ссылки указать дату публикации." },
    ],
  },
  guerrilla: {
    notes: "Направление создано. План и первые активности добавим отдельно.",
    rows: [],
    materials: [],
  },
  email: {
    notes: "До запуска проверить легальность базы, opt-in, SPF, DKIM, DMARC и репутацию домена отправителя.",
    rows: [
      { id: "email-ninjapromo", name: "NinjaPromo", type: "Web3 marketing / email", status: "Кандидат", contact: "Запросить предложение", lastContactAt: "", nextStep: "Проверить кейсы и владение CRM", nextActionDueAt: "", note: "" },
      { id: "email-distractive", name: "Distractive", type: "Web3 marketing", status: "Кандидат", contact: "Запросить предложение", lastContactAt: "", nextStep: "Проверить email и lifecycle-автоматизацию", nextActionDueAt: "", note: "" },
      { id: "email-coldchain", name: "ColdChain", type: "Crypto outreach", status: "Кандидат", contact: "Найти официальный контакт", lastContactAt: "", nextStep: "Проверить deliverability и источники базы", nextActionDueAt: "", note: "" },
      { id: "email-holder", name: "Holder", type: "Web3 CRM / marketing", status: "Кандидат", contact: "Запросить демо", lastContactAt: "", nextStep: "Проверить интеграцию событий dApp", nextActionDueAt: "", note: "" },
    ],
    materials: [
      { id: "email-sheet", title: "База email-агентств", url: EMAIL_AGENCIES_SHEET, status: "Источник", note: "Общая таблица потенциальных подрядчиков." },
      { id: "email-template", title: "Первое outreach-письмо", url: "", status: "Подготовить", note: "Нужна отдельная версия по каждому сегменту." },
    ],
  },
  web3Ads: {
    notes: "BscScan и другие обозреватели объединены с рекламой в кошельках и Web3-инфраструктуре.",
    rows: [
      { id: "web3-bscscan", name: "BscScan", type: "Blockchain explorer", status: "Кандидат", contact: "Advertise / media inquiry", lastContactAt: "", nextStep: "Запросить политику допуска Atlas и медиакит", nextActionDueAt: "", note: "" },
      { id: "web3-cmc", name: "CoinMarketCap", type: "Crypto data platform", status: "Кандидат", contact: "Advertising / partnerships", lastContactAt: "", nextStep: "Проверить баннеры и требования", nextActionDueAt: "", note: "" },
      { id: "web3-tokenpocket", name: "TokenPocket", type: "Web3 wallet", status: "Кандидат", contact: "Business / ecosystem contact", lastContactAt: "", nextStep: "Запросить рекламные форматы и GEO", nextActionDueAt: "", note: "" },
      { id: "web3-safepal", name: "SafePal", type: "Web3 wallet", status: "Кандидат", contact: "Partnerships", lastContactAt: "", nextStep: "Проверить dApp discovery и рекламу", nextActionDueAt: "", note: "" },
      { id: "web3-trustwallet", name: "Trust Wallet", type: "Web3 wallet", status: "Кандидат", contact: "Business / ecosystem route", lastContactAt: "", nextStep: "Проверить доступные paid placements", nextActionDueAt: "", note: "" },
    ],
    materials: [],
  },
  revshare: {
    notes: "Программа для арбитражников будет описана отдельно. До этого не публикуем неподтвержденные условия.",
    rows: [],
    materials: [],
  },
  listings: {
    notes: "Перед оплатой проверять официальный submission flow и не принимать гарантированный листинг за подтвержденный результат.",
    rows: [
      { id: "listing-dappradar", name: "DappRadar", type: "dApp directory", status: "Кандидат", contact: "Official submission", lastContactAt: "", nextStep: "Проверить требования и подать заявку", nextActionDueAt: "", note: "" },
      { id: "listing-dappbay", name: "DappBay", type: "BNB Chain dApp directory", status: "Кандидат", contact: "Official submission", lastContactAt: "", nextStep: "Проверить форму BNB Chain", nextActionDueAt: "", note: "" },
      { id: "listing-defillama", name: "DefiLlama", type: "On-chain analytics", status: "Кандидат", contact: "Official listing route", lastContactAt: "", nextStep: "Проверить соответствие категории", nextActionDueAt: "", note: "" },
      { id: "listing-rootdata", name: "RootData", type: "Web3 project database", status: "Кандидат", contact: "Submit project", lastContactAt: "", nextStep: "Подготовить профиль и источники", nextActionDueAt: "", note: "" },
    ],
    materials: [
      { id: "listings-sheet", title: "Таблица dApp-листингов", url: LISTINGS_SHEET, status: "Источник", note: "Список агентств и площадок для проверки." },
    ],
  },
  events: {
    notes: "Собирать отдельно блокчейн-конференции, Web3-фесты, direct-selling форумы и MLM-мероприятия. Для каждого события фиксировать сроки подачи, стоимость, формат участия и ответственного.",
    rows: [],
    materials: [
      { id: "events-calendar", title: "Календарь мероприятий", url: "", status: "Подготовить", note: "Даты, страны, дедлайны заявок, билеты, стенды и выступления." },
      { id: "events-participation-brief", title: "Пакет участника Atlas", url: "", status: "Подготовить", note: "Презентация, спикерский профиль, материалы для стенда и follow-up." },
    ],
  },
  vacancies: {
    notes: "Использовать только прозрачные объявления: чётко разделять штатную вакансию, подряд и партнёрскую роль; не обещать фиксированную зарплату или гарантированный доход без основания.",
    rows: [],
    materials: [
      { id: "vacancies-role-brief", title: "Шаблоны ролей и вакансий", url: "", status: "Подготовить", note: "Отдельные версии для Web3 community, региональных партнёров и локальных лидеров." },
      { id: "vacancies-screening", title: "Сценарий проверки кандидатов", url: "", status: "Подготовить", note: "Опыт, GEO, языки, аудитория, каналы и условия сотрудничества." },
    ],
  },
  vk: {
    notes: [
      "Цель: проверить VK как самостоятельный канал привлечения на обучение, вебинар и консультацию по Atlas.",
      "Основной маршрут: объявление или нативное размещение → понятная страница без обещаний дохода → регистрация на вебинар → добровольный диалог → передача заинтересованного контакта в CRM №2 с источником VK.",
      "Приоритет запуска: 1) фрилансеры и самозанятые; 2) люди, ищущие удалённую занятость после карьерного перерыва; 3) организаторы совместных закупок и микропредприниматели; 4) действующие специалисты direct selling.",
      "Не использовать: покупные базы, сбор закрытых персональных данных, массовые личные сообщения, давление на финансово уязвимых людей, обещания лёгкого или гарантированного заработка.",
      "Первый тест: четыре аудитории × два креатива × одна регистрационная страница. Сравнивать стоимость регистрации, доходимость до вебинара, квалифицированные диалоги и жалобы, а не только клики.",
    ].join("\n\n"),
    rows: [
      {
        id: "vk-freelance",
        name: "Фрилансеры и самозанятые",
        type: "Удалённая работа / профессиональные сообщества",
        status: "Кандидат",
        contact: "VK Ads + согласованные размещения в сообществах",
        lastContactAt: "",
        nextStep: "Собрать 20 живых сообществ и протестировать приглашение на вводный вебинар",
        nextActionDueAt: "",
        note: "Угол коммуникации: цифровые навыки, работа с сообществом и прозрачные правила. Не обещать заработок.",
      },
      {
        id: "vk-career-return",
        name: "Возвращение к работе после карьерного перерыва",
        type: "Удалённая занятость / обучение / родители",
        status: "Кандидат",
        contact: "VK Ads по интересам + тематические сообщества",
        lastContactAt: "",
        nextStep: "Подготовить спокойный обучающий креатив без эксплуатации семейного или финансового положения",
        nextActionDueAt: "",
        note: "Предлагать обучение и гибкий формат участия. Не таргетировать по признаку уязвимости и не использовать давление.",
      },
      {
        id: "vk-joint-purchases",
        name: "Организаторы совместных закупок",
        type: "Микропредприниматели / организаторы сообществ",
        status: "Кандидат",
        contact: "Партнёрские размещения у администраторов групп",
        lastContactAt: "",
        nextStep: "Найти сообщества с активными обсуждениями и запросить официальный рекламный формат",
        nextActionDueAt: "",
        note: "Сильная сторона сегмента: опыт координации людей, коммуникации и повторных продаж.",
      },
      {
        id: "vk-small-business",
        name: "Малый бизнес и начинающие предприниматели",
        type: "Предпринимательские сообщества",
        status: "Кандидат",
        contact: "VK Ads + деловые сообщества + вебинары",
        lastContactAt: "",
        nextStep: "Разделить владельцев бизнеса, продавцов услуг и начинающих предпринимателей на отдельные объявления",
        nextActionDueAt: "",
        note: "Угол коммуникации: международное сообщество, Web3-инструменты и партнёрская модель с раскрытием рисков.",
      },
      {
        id: "vk-direct-selling",
        name: "Действующие сетевики и direct selling",
        type: "MLM / продажи / командообразование",
        status: "Кандидат",
        contact: "Тематические сообщества + лид-форма + персональный follow-up после согласия",
        lastContactAt: "",
        nextStep: "Собрать сообщества по компаниям и навыкам продаж, исключив закрытые и неактивные группы",
        nextActionDueAt: "",
        note: "Сегментировать новичков, действующих дистрибьюторов и лидеров команд: им нужны разные материалы.",
      },
      {
        id: "vk-online-education",
        name: "Аудитория онлайн-образования и карьерных сообществ",
        type: "Обучение / продажи / личный бренд",
        status: "Кандидат",
        contact: "VK Ads + размещения в образовательных сообществах",
        lastContactAt: "",
        nextStep: "Тестировать только аудитории, связанные с реальными навыками, карьерой и предпринимательством",
        nextActionDueAt: "",
        note: "Не использовать риторику быстрых денег, успеха без усилий или гарантированного результата.",
      },
      {
        id: "vk-web3-beginners",
        name: "Крипто-новички и пользователи Web3-продуктов",
        type: "Крипта / Web3 / цифровые кошельки",
        status: "Кандидат",
        contact: "Криптосообщества + обучающий вебинар",
        lastContactAt: "",
        nextStep: "Подготовить отдельный маршрут про кошелёк, смарт-контракт, проверку транзакций и риски",
        nextActionDueAt: "",
        note: "Не смешивать развлекательные игры и финансовое участие; сначала обучение и проверка понимания.",
      },
      {
        id: "vk-community-admins",
        name: "Администраторы тематических VK-сообществ",
        type: "Партнёры по размещениям / владельцы аудитории",
        status: "Кандидат",
        contact: "Официальные контакты сообщества",
        lastContactAt: "",
        nextStep: "Подготовить медиапредложение: формат, маркировка рекламы, UTM, цена и отчётность",
        nextActionDueAt: "",
        note: "Покупать только согласованные размещения и фиксировать статистику до и после публикации.",
      },
    ],
    materials: [
      { id: "vk-campaign-brief", title: "Бриф первой VK-кампании", url: "", status: "Подготовить", note: "Цель, четыре стартовые аудитории, бюджет теста, метрики и стоп-условия." },
      { id: "vk-webinar", title: "Вводный вебинар для VK", url: "", status: "Подготовить", note: "Короткое знакомство с Atlas, механикой, рисками и вариантами участия без обещаний дохода." },
      { id: "vk-landing", title: "Страница регистрации VK", url: "", status: "Подготовить", note: "Один понятный оффер, форма согласия, политика данных и источник кампании." },
      { id: "vk-creatives", title: "Пакет VK-креативов", url: "", status: "Подготовить", note: "Отдельные тексты и изображения для каждого сегмента, без кликбейта и давления." },
      { id: "vk-report", title: "UTM и отчёт VK", url: "", status: "Подготовить", note: "Кампания, объявление, сообщество, регистрации, доходимость, диалоги и жалобы." },
      { id: "vk-compliance", title: "Проверка рекламы и персональных данных", url: "", status: "Проверить", note: "Маркировка рекламы, правила VK, согласие на коммуникацию и хранение данных." },
    ],
  },
};

export function createDefaultMarketingDashboardState() {
  return {
    archivedDirections: {},
    directions: Object.fromEntries(
      MARKETING_DIRECTIONS.map((direction) => [
        direction.id,
        {
          owner: direction.owner,
          phase: direction.phase,
          notes: defaultDirectionContent[direction.id]?.notes || "",
          rows: defaultDirectionContent[direction.id]?.rows || [],
          materials: defaultDirectionContent[direction.id]?.materials || [],
        },
      ]),
    ),
  };
}

function mergeDirectionItems(...lists) {
  const itemsById = new Map();
  lists.flat().forEach((item) => {
    if (!item || typeof item !== "object") return;
    const key = item.id || JSON.stringify(item);
    itemsById.set(key, item);
  });
  return [...itemsById.values()];
}

function mergeDirectionNotes(primary = "", secondary = "") {
  const first = String(primary || "").trim();
  const second = String(secondary || "").trim();
  if (!second || first.includes(second)) return first;
  if (!first || second.includes(first)) return second;
  return [first, second].filter(Boolean).join("\n\n");
}

export function hydrateMarketingDashboardState(savedState) {
  const defaults = createDefaultMarketingDashboardState();
  if (!savedState || typeof savedState !== "object") return defaults;
  const archivedDirections = {
    ...(savedState.archivedDirections && typeof savedState.archivedDirections === "object"
      ? savedState.archivedDirections
      : {}),
  };
  RETIRED_MARKETING_DIRECTION_IDS.forEach((directionId) => {
    const retiredDirection = savedState.directions?.[directionId];
    if (retiredDirection && typeof retiredDirection === "object") {
      archivedDirections[directionId] = retiredDirection;
    }
  });

  return {
    ...defaults,
    ...savedState,
    archivedDirections,
    directions: Object.fromEntries(
      MARKETING_DIRECTIONS.map((direction) => {
        const defaultDirection = defaults.directions[direction.id];
        const savedDirection = savedState.directions?.[direction.id];
        const legacyTelegaDirection = direction.id === "complex"
          ? savedState.directions?.telega || archivedDirections.telega
          : null;
        const rows = direction.id === "complex"
          ? mergeDirectionItems(
            defaultDirection.rows,
            Array.isArray(legacyTelegaDirection?.rows) ? legacyTelegaDirection.rows : [],
            Array.isArray(savedDirection?.rows) ? savedDirection.rows : [],
          )
          : (Array.isArray(savedDirection?.rows) ? savedDirection.rows : defaultDirection.rows);
        const materials = direction.id === "complex"
          ? mergeDirectionItems(
            defaultDirection.materials,
            Array.isArray(legacyTelegaDirection?.materials) ? legacyTelegaDirection.materials : [],
            Array.isArray(savedDirection?.materials) ? savedDirection.materials : [],
          )
          : (Array.isArray(savedDirection?.materials) ? savedDirection.materials : defaultDirection.materials);
        return [
          direction.id,
          {
            ...defaultDirection,
            ...(savedDirection && typeof savedDirection === "object" ? savedDirection : {}),
            notes: direction.id === "complex"
              ? mergeDirectionNotes(
                mergeDirectionNotes(defaultDirection.notes, savedDirection?.notes),
                legacyTelegaDirection?.notes,
              )
              : (savedDirection?.notes ?? defaultDirection.notes),
            rows: hydrateRows(rows),
            materials,
          },
        ];
      }),
    ),
  };
}
