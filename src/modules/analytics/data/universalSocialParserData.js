export const UNIVERSAL_SOCIAL_PARSER_STORAGE_KEY = "atlas.analytics.universalSocialParser.connectors.v1";

export const UNIVERSAL_SOCIAL_STATUS_OPTIONS = [
  "MVP",
  "Исследовать",
  "Только API",
  "Ручная проверка",
  "Позже",
];

export const UNIVERSAL_SOCIAL_RISK_OPTIONS = [
  "Низкий",
  "Средний",
  "Высокий",
  "Критичный",
];

export const UNIVERSAL_SOCIAL_COLUMNS = [
  { key: "platform", label: "Соцсеть" },
  { key: "status", label: "Статус" },
  { key: "risk", label: "Риск" },
  { key: "accessRoute", label: "Как подключать" },
  { key: "targets", label: "Кого ищем" },
  { key: "queries", label: "Стартовые запросы" },
  { key: "tooling", label: "Готовые решения" },
  { key: "notes", label: "Комментарий" },
];

export const defaultUniversalSocialConnectors = [
  {
    id: "instagram",
    platform: "Instagram",
    status: "MVP",
    risk: "Средний",
    accessRoute: "Публичные профили, хэштеги, Reels, ручная валидация, затем DM/media kit. Автоматизацию делать через лимиты и без обхода приватности.",
    targets: "MLM-лидеры, lifestyle/business creators, crypto/Web3 creators, airdrop hunters, локальные предприниматели.",
    queries: "network marketing, MLM coach, direct selling, web3 community, crypto education, airdrop hunter, business mentor + country/language.",
    tooling: "Crawlee/Playwright для публичных страниц; Instaloader как research reference; Apify actors как быстрый paid-MVP.",
    notes: "Начать с Instagram как первого коннектора: он ближе всего к инфлюенсерам и визуальному SMM.",
  },
  {
    id: "facebook",
    platform: "Facebook",
    status: "MVP",
    risk: "Высокий",
    accessRoute: "Публичные группы/страницы, Graph API где возможно, ручное подтверждение админов и правил группы.",
    targets: "Facebook groups по MLM, direct selling, home business, crypto communities, локальные бизнес-группы.",
    queries: "network marketing group, MLM leaders, work from home business, direct sales, crypto community, passive income discussion.",
    tooling: "facebook-scraper как research reference; Apify/Crawlee для публичных страниц; официальные Meta API для стабильного контура.",
    notes: "Не начинать с массового сбора участников групп. Безопаснее искать группы/страницы и контакты админов.",
  },
  {
    id: "linkedin",
    platform: "LinkedIn",
    status: "Только API",
    risk: "Критичный",
    accessRoute: "Sales Navigator/ручной список/официальные интеграции. Скрейпинг профилей не закладывать в production.",
    targets: "Direct selling executives, regional partners, business development, country managers, Web3 community leads.",
    queries: "direct selling leader, network marketing professional, regional partner, community growth, Web3 business development.",
    tooling: "JobSpy для вакансий как допустимый источник; профильные scrapers только как reference, не как production route.",
    notes: "LinkedIn быстро банит автоматизацию. Использовать как высококачественный ручной/полуавтоматический канал.",
  },
  {
    id: "vk",
    platform: "VK",
    status: "Исследовать",
    risk: "Средний",
    accessRoute: "VK API для публичных групп, постов и поиска сообществ; отдельный токен и лимиты.",
    targets: "RU/CIS MLM-сообщества, крипто-группы, предприниматели, локальные лидеры.",
    queries: "сетевой маркетинг, млм, прямые продажи, криптовалюта, web3, инвестиционные сообщества, бизнес клуб.",
    tooling: "vk_api/vkbottle, VK official API, ручная проверка групп перед outreach.",
    notes: "Хороший второй коннектор после Instagram/Facebook, если нужен СНГ-сегмент.",
  },
  {
    id: "discord",
    platform: "Discord",
    status: "Ручная проверка",
    risk: "Высокий",
    accessRoute: "Только открытые серверы, официальные боты, разрешение админов, без скрытого сбора пользователей.",
    targets: "Web3, DeFi, airdrop, NFT, GameFi, DAO community managers.",
    queries: "web3 discord, defi community, airdrop discord, DAO community, BNB Chain community.",
    tooling: "Discord API для собственных серверов/ботов; публичные каталоги серверов как discovery source.",
    notes: "Использовать не как массовый сбор людей, а как поиск серверов и контакта админа.",
  },
  {
    id: "wechat",
    platform: "WeChat",
    status: "Позже",
    risk: "Высокий",
    accessRoute: "WeChat Official Accounts/articles, локальные партнёры, ручной импорт контактов.",
    targets: "Chinese crypto media, business communities, локальные партнёры и паблики.",
    queries: "区块链, Web3, 加密货币, 社群, 直销, 创业.",
    tooling: "WeChat article scrapers как research reference; лучше через партнёров и ручной отбор.",
    notes: "Технически и юридически сложный источник. Не ставить в первую очередь.",
  },
  {
    id: "line",
    platform: "Line",
    status: "Позже",
    risk: "Средний",
    accessRoute: "LINE Official Account, открытые сообщества, локальные админы, ручная база.",
    targets: "Япония, Таиланд, Тайвань: crypto, business, community groups.",
    queries: "crypto Japan, web3 Thailand, business community, LINE openchat.",
    tooling: "LINE Messaging API для собственных аккаунтов; discovery через поисковые источники и каталоги.",
    notes: "Нужен локальный оператор/язык. Добавлять после первых успешных коннекторов.",
  },
  {
    id: "kakaotalk",
    platform: "KakaoTalk",
    status: "Позже",
    risk: "Средний",
    accessRoute: "Kakao channels/open chats, локальный поиск, ручной импорт.",
    targets: "Корея: crypto communities, business clubs, MLM/direct sales audience.",
    queries: "코인, 블록체인, Web3, 네트워크 마케팅, 재택사업.",
    tooling: "Kakao Developers для собственных каналов; внешние скрейперы не брать как production основу.",
    notes: "Перспективно для Кореи, но требует локализации и ручного контроля.",
  },
  {
    id: "snapchat",
    platform: "Snapchat",
    status: "Позже",
    risk: "Высокий",
    accessRoute: "Creator marketplace/ads/manual influencer research. Скрейпинг не считать базовым маршрутом.",
    targets: "Young creators, lifestyle, money-making, crypto-adjacent short-video audience.",
    queries: "crypto creator, business creator, money tips, web3 creator.",
    tooling: "Ручной research, рекламный кабинет, creator marketplace.",
    notes: "Не подходит для первого MVP: низкая прозрачность публичных данных.",
  },
  {
    id: "viber",
    platform: "Viber",
    status: "Позже",
    risk: "Средний",
    accessRoute: "Публичные сообщества/каналы, официальный bot/API, ручное подтверждение админа.",
    targets: "Eastern Europe communities, crypto/business channels, локальные предприниматели.",
    queries: "crypto channel, business community, MLM, web3, local entrepreneurs.",
    tooling: "Viber Bot API для собственных каналов; публичные каталоги и ручной импорт.",
    notes: "Можно добавить как нишевый региональный источник, когда появится оператор под GEO.",
  },
];

export const socialParserArchitecture = [
  {
    title: "1. Discovery",
    text: "Коннектор ищет публичные профили, группы, страницы, каналы или каталоги по ключевым словам, стране, языку и сегменту.",
  },
  {
    title: "2. Normalize",
    text: "Все источники приводятся к единой карточке: имя, платформа, страна, ссылка, аудитория, контакт, причина релевантности, риск.",
  },
  {
    title: "3. Score",
    text: "Скоринг считает fit для Atlas: network/community опыт, Web3-ready аудитория, активность, доступность контакта, риск спама.",
  },
  {
    title: "4. Review",
    text: "Перед outreach человек проверяет профиль, последние публикации, токсичность аудитории, рекламную историю и правила площадки.",
  },
  {
    title: "5. Outreach",
    text: "Система готовит безопасный текст обращения: партнёрство, комьюнити, Web3, без обещаний гарантированного дохода.",
  },
];

export const socialParserMarketFindings = [
  {
    title: "Готовое ядро лучше брать из Crawlee/Apify",
    text: "Crawlee закрывает очереди, browser automation, retries, прокси и хранение результатов. Apify можно использовать как быстрый MVP для отдельных источников.",
  },
  {
    title: "LinkedIn и Meta нельзя считать обычными сайтами",
    text: "Для LinkedIn/Instagram/Facebook высокий риск блокировок и нарушений правил. Production-логика должна опираться на API, ручную валидацию или разрешённые партнёрские маршруты.",
  },
  {
    title: "Самая ценная сущность — не пост, а контактный маршрут",
    text: "Нам важнее найти админа, владельца группы, лидера структуры или creator manager, чем скачать много постов без возможности связаться.",
  },
  {
    title: "Универсальность делается схемой данных",
    text: "Если карточка лида одна и та же для Instagram, VK, Facebook и Discord, новые соцсети добавляются коннектором, а CRM/outreach не переписываются.",
  },
];

export const socialParserTargetSegments = [
  "MLM / network marketing leaders",
  "Direct selling trainers and recruiters",
  "Airdrop hunters and Web3 quest communities",
  "Crypto educators and DeFi creators",
  "Local business communities and entrepreneurs",
  "Regional community managers",
  "HYIP/online-project audience with careful risk filter",
];

export const socialParserMvpPlan = [
  {
    phase: "MVP-1",
    title: "Instagram + Facebook discovery",
    result: "Собрать первые 200-500 кандидатов: профили, группы, страницы, contact route, score, ручной review.",
  },
  {
    phase: "MVP-2",
    title: "Единая CRM и экспорт",
    result: "Добавить статусы outreach, комментарии, ответственного, CSV export и перенос лучших лидов в основную работу.",
  },
  {
    phase: "MVP-3",
    title: "VK или Discord connector",
    result: "Проверить второй источник по той же схеме без переписывания интерфейса.",
  },
  {
    phase: "MVP-4",
    title: "AI scoring и дедупликация",
    result: "Автоматически объединять одинаковых людей из разных соцсетей и подсвечивать лучшие контакты.",
  },
];

