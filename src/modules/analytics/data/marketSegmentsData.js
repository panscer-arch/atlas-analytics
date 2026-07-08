export const MARKET_SEGMENTS_STORAGE_KEY = "atlas.analytics.marketSegments.v1";

export const MARKET_SEGMENTS_COLUMNS = [
  "",
  "Направление",
  "Примеры",
  "Как зарабатывают",
  "Близость к Atlas",
  "Где искать",
  "Качество лида",
  "Риск",
  "Приоритет",
  "Комментарий",
  "Статус",
];

const marketSegmentRows = [
  ["hyip", "HYIP / high-risk доходные проекты", "HYIP, инвестиционные кабинеты, daily profit platforms, матричные доходные платформы", "Участник вносит средства, выбирает тариф/срок и ждёт начисления или выплаты.", "Очень высокая", "HYIP-мониторы, Telegram-чаты, форумы, YouTube-обзоры, рейтинги выплат", "Горячий", "Очень высокий", "1. Сначала", "Самая близкая аудитория по поведению: люди понимают тарифы, сроки, риск и психологию раннего входа. Коммуникация должна быть честной: Atlas не инвестиция и не гарантия.", "Активно искать"],
  ["crypto-mlm", "Crypto MLM / referral communities", "Крипто-MLM, бинарные структуры, matching bonus, карьерные статусы, лидерские команды", "Заработок строится на личной активности, структуре, статусах и партнёрских бонусах.", "Очень высокая", "MLM-лидеры, Telegram-группы, YouTube MLM-каналы, Facebook/Instagram сообщества", "Горячий", "Высокий", "1. Сначала", "Ключевой сегмент для Atlas: им важны команда, структура, лидерский капитал и понятная партнёрская программа.", "Активно искать"],
  ["token-presales", "Token presale / ICO / IDO / launchpads", "Presale-токены, launchpad, IDO, ICO, мемкоины, low-cap tokens", "Покупают токен до роста и ждут листинг, иксы или рост комьюнити.", "Высокая", "Launchpad-чаты, X, Telegram alpha groups, CoinMarketCap upcoming, ICO calendars", "Горячий", "Высокий", "1. Сначала", "Аудитория уже умеет MetaMask/USDT/BNB Chain и принимает риск. Нужно объяснять Atlas не как токен, а как smart-contract mechanics.", "Активно искать"],
  ["copy-trading", "Copy trading / crypto bots / сигналы", "Копитрейдинг, AI trading bots, Telegram signals, автоторговля, торговые роботы", "Подключаются к стратегии, боту или трейдеру и ожидают результат без самостоятельной торговли.", "Высокая", "Telegram-сигналы, YouTube трейдинг-каналы, Discord, сайты ботов, брокерские комьюнити", "Тёплый", "Высокий", "1. Сначала", "Люди привыкли к обещаниям автоматизации. Atlas нужно отделять от трейдинга: нет внешней торговли, есть правила Smart Cycle.", "Активно искать"],
  ["defi-yield", "DeFi staking / farming / liquidity mining", "Staking, yield farming, liquidity pools, vaults, restaking, LP positions", "Размещают активы в DeFi-протоколах ради APY, fees, rewards или token incentives.", "Высокая", "DeFi Telegram/Discord, X, Dune/DefiLlama аудитория, DAO-чаты, фарминг-гайды", "Тёплый", "Средний", "2. Следом", "Более грамотная Web3-аудитория, понимает smart-contract risk, liquidity risk и on-chain проверку.", "Готовить angle"],
  ["mutual-aid", "Mutual aid / donation communities", "Кассы взаимопомощи, donation-based systems, community funding, rotating savings groups", "Участники помогают друг другу по правилам сообщества, иногда с очередностью или циклами.", "Очень высокая", "Facebook groups, Telegram, локальные сообщества, форума взаимопомощи, diaspora communities", "Тёплый", "Средний", "2. Следом", "Самый близкий философски сегмент. Здесь Atlas можно объяснять как цифровую Web3-модель добровольной взаимной помощи.", "Готовить angle"],
  ["web3-affiliates", "Affiliate / CPA crypto offers", "Crypto CPA, referral offers, exchanges affiliates, broker affiliates, wallet campaigns", "Зарабатывают на трафике, лидах, регистрациях и комиссиях.", "Высокая", "Affiliate networks, CPA-чаты, Telegram media buying, crypto traffic communities", "Тёплый", "Средний", "2. Следом", "Хорошо для поиска промоутеров и performance-маркетологов, но нужно быстро дать понятные правила и запреты по коммуникации.", "Готовить angle"],
];

export const defaultMarketSegments = marketSegmentRows.map((row, index) => ({
  id: `market-segment-${row[0]}`,
  direction: row[1],
  examples: row[2],
  earningLogic: row[3],
  atlasFit: row[4],
  whereToFind: row[5],
  leadQuality: row[6],
  risk: row[7],
  priority: row[8] || (index < 4 ? "1. Сначала" : index < 10 ? "2. Следом" : "3. Запас"),
  notes: row[9],
  status: row[10] || "Готовить angle",
}));
