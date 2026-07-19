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
    title: "Знакомые сетевики и MLM-лидеры",
    shortTitle: "MLM-лидеры",
    owner: "Назначить",
    phase: "Сбор базы",
    description: "Знакомые лидеры, публичные профили, компании и рынки direct selling в одной рабочей базе.",
    baseTab: "mlmLeaders",
    sourceKey: "mlm",
    accent: "mint",
  },
  {
    id: "influencers",
    order: 2,
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
    order: 3,
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
    order: 4,
    title: "Комплексное продвижение",
    shortTitle: "Комплексное продвижение",
    owner: "Генри",
    phase: "Не начато",
    description: "Медиареклама и комплексные кампании. Наполнение добавим после получения плана от Генри.",
    sourceKey: "generic",
    accent: "violet",
  },
  {
    id: "telega",
    order: 5,
    title: "Telegram-реклама / Telega.io",
    shortTitle: "Telega.io",
    owner: "Назначить",
    phase: "Сбор базы",
    description: "Закупка рекламы в Telegram-каналах, проверка охватов, цен, администраторов и результатов.",
    baseTab: "telegram",
    sourceKey: "telegram",
    accent: "cyan",
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
    title: "Email-маркетинг",
    shortTitle: "Email-маркетинг",
    owner: "Назначить",
    phase: "Сбор базы",
    description: "Почтовые базы, шаблоны, история отправок и компании, которые могут вести рассылку.",
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
    id: "creatives",
    order: 12,
    title: "Креативы и SEO",
    shortTitle: "Креативы / SEO",
    owner: "Назначить",
    phase: "Квалификация",
    description: "Баннеры, link preview, SEO-тексты, рекламные форматы и готовые материалы Atlas.",
    baseTab: "creatives",
    sourceKey: "creatives",
    accent: "violet",
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
    notes: "Ожидаем структуру комплексного продвижения и медиарекламы от Генри.",
    rows: [],
    materials: [],
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
  creatives: {
    notes: "",
    rows: [],
    materials: [],
  },
};

export function createDefaultMarketingDashboardState() {
  return {
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

export function hydrateMarketingDashboardState(savedState) {
  const defaults = createDefaultMarketingDashboardState();
  if (!savedState || typeof savedState !== "object") return defaults;

  return {
    ...defaults,
    ...savedState,
    directions: Object.fromEntries(
      MARKETING_DIRECTIONS.map((direction) => {
        const defaultDirection = defaults.directions[direction.id];
        const savedDirection = savedState.directions?.[direction.id];
        return [
          direction.id,
          {
            ...defaultDirection,
            ...(savedDirection && typeof savedDirection === "object" ? savedDirection : {}),
            rows: hydrateRows(Array.isArray(savedDirection?.rows) ? savedDirection.rows : defaultDirection.rows),
            materials: Array.isArray(savedDirection?.materials) ? savedDirection.materials : defaultDirection.materials,
          },
        ];
      }),
    ),
  };
}
