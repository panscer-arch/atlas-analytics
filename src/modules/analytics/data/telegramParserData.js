import { COUNTRY_OPTIONS, OUTREACH_STATUS_OPTIONS, STATUS_OPTIONS } from "./hyipParserData";

export { COUNTRY_OPTIONS, OUTREACH_STATUS_OPTIONS, STATUS_OPTIONS };

export const TELEGRAM_STORAGE_KEY = "atlas.analytics.telegramParserLeads.v2";
export const TELEGRAM_OUTREACH_STORAGE_KEY = "atlas.analytics.telegramOutreach.queue.v2";

const countryMarketNotes = {
  "Индия": "India is #1 in Chainalysis 2025 crypto adoption; strong retail, DeFi and Web3 audience.",
  "США": "United States is one of the largest institutional and media crypto markets; useful for global Web3 visibility.",
  "Пакистан": "Pakistan is among the top crypto adoption markets; validate channel quality and admin before any payment.",
  "Вьетнам": "Vietnam is a top crypto adoption market with strong retail, gaming, DeFi and community activity.",
  "Бразилия": "Brazil is a key LATAM crypto market; good for Portuguese crypto, DeFi and stablecoin audiences.",
  "Нигерия": "Nigeria has strong stablecoin and crypto adoption; good for community, webinar and Telegram outreach.",
  "Индонезия": "Indonesia is a large APAC crypto market; validate paid post rules and local language fit.",
  "Филиппины": "Philippines is active in crypto, P2E and Web3 communities; check views and admin identity.",
  "Турция": "Turkey has very active crypto/Telegram communities; check CPM, views and investment wording rules.",
  "Россия": "RU crypto Telegram market is large, but requires careful reputation, views and ad-label checks.",
};

const channelGroups = {
  "Индия": [
    ["CoinGape", "@coingape", "Telegram / crypto media / Web3", 90, "Готов к контакту", "Known India/global crypto media route; use advertise/contact page if channel admin is unclear."],
    ["CoinCodeCap", "@coincodecap", "Telegram / crypto education / trading", 86, "Готов к контакту", "India crypto education and trading audience; verify admin and paid post format."],
    ["MAHEE CRYPTO", "@MaheeCrypto", "Telegram / crypto trading / India", 82, "Проверить", "TGStat India crypto result; verify recent post views and advertising contact."],
    ["Crypto with Vishal Official", "@CryptowithVishal_Official", "Telegram / crypto creator / India", 82, "Проверить", "Indian crypto creator channel; good for webinar/review angle if admin is reachable."],
    ["INDIAN CRYPTOCURRENCY", "@USDTINR", "Telegram / crypto / India", 80, "Проверить", "TGStat India crypto result; check activity and ad policy before outreach."],
    ["Indian Crypto Airdrop", "@indiancryptoairdrop", "Telegram / airdrops / DeFi / India", 76, "Проверить", "Airdrop/BSC/ETH/DeFi/NFT audience; use only if posts are current and not spam-heavy."],
    ["Indian Crypto Arena", "@INDCryptoArena", "Telegram / crypto education / Hindi", 74, "Проверить", "Hindi/India audience candidate; validate channel quality and admin."],
    ["The Trade Room - Crypto Group", "@ttrcryptogroup", "Telegram / crypto trading / India", 72, "Проверить", "Trading audience; check whether paid promotion is accepted."],
    ["Crypto & Metaverse News", "@Crypto_Masterz", "Telegram / metaverse / crypto news", 72, "Проверить", "Crypto/metaverse news candidate from TGStat India search."],
    ["ADNAN PREDICTION", "@AdnanPrediction11", "Telegram / trading signals / India", 68, "Проверить", "Signals-style channel; use cautiously and verify audience authenticity."],
  ],
  "США": [
    ["Crypto", "@crypto", "Telegram / global crypto news", 90, "Проверить", "Large generic crypto channel candidate; verify ad route and country mix."],
    ["Crypto Arena", "@cryptoarenatg", "Telegram / crypto news / global", 84, "Готов к контакту", "TGStat lists contact @elenafml; good for media-style placement check."],
    ["Crypto Compare", "@CompareCrypto", "Telegram / trading / crypto", 80, "Проверить", "Global English crypto audience; verify views and contact."],
    ["Crypto News", "@cryptonewschannelw", "Telegram / crypto news", 78, "Проверить", "News-style channel; validate freshness and advertising route."],
    ["BSC Newspaper", "@BSC_Newspaper", "Telegram / BSC / smart-contract", 78, "Проверить", "BSC/smart-contract ecosystem fit; check current posting frequency."],
    ["Sandwich Network Announcements", "@SandwichNetwork", "Telegram / DeFi / announcements", 74, "Проверить", "DeFi/project announcement fit; verify whether third-party ads are accepted."],
    ["AdEasly Ad Network", "@AdEaslyOfficial", "Telegram / crypto ad network", 74, "Проверить", "Ad network lead; useful if direct channels are hard to contact."],
    ["Crypto Whales Club", "@CryptoWhalesClubz", "Telegram / trading / crypto", 72, "Проверить", "Trading community candidate; check audience quality."],
    ["Crypto's Fox", "@cryptosfox", "Telegram / crypto tips / investing", 70, "Проверить", "Crypto tips channel; verify recent views and admin."],
    ["PUMP 1000X Gems", "@PUMP_GEMS", "Telegram / gems / launches", 68, "Проверить", "High-risk gems audience; only use with compliant wording and clear review request."],
  ],
  "Пакистан": [
    ["KuCoin News Pakistan", "@KuCoinNews_Pakistan", "Telegram / exchange news / Urdu", 82, "Проверить", "Pakistan/Urdu exchange-news route; verify whether it accepts external paid placements."],
    ["Waqar Zaka", "@waqarzaka", "Telegram / crypto influencer / Pakistan", 82, "Проверить", "Pakistan crypto influencer-style audience; verify channel/admin route."],
    ["Crypto Buzz", "@cryptoscoop6", "Telegram / crypto buzz / Pakistan", 76, "Проверить", "TGStat Pakistan search result; validate activity and views."],
    ["Dr. Crypto Free Signals", "@drcrypto_trading", "Telegram / signals / crypto", 74, "Проверить", "Signals audience; check whether it has Pakistan traffic and accepts ads."],
    ["Crypto Notes Family", "@CryptoNotesbaba", "Telegram / crypto notes / trading", 72, "Проверить", "Trading/news candidate; validate geo and admin."],
    ["Airdrop Live Alert", "@CryptoTech12", "Telegram / airdrops / crypto", 70, "Проверить", "Airdrop audience; validate bot quality and views."],
    ["TTcoin Cryptocurrency", "@ttcoinofficial", "Telegram / TRC20 / crypto", 70, "Проверить", "TGStat snippet shows Pakistan/India/Indonesia audience; check if ads are possible."],
    ["Crypto Fight", "@crypto_fight", "Telegram / crypto news / ads", 68, "Проверить", "TGStat says advertising enquiries via @iqcash_admin; verify before contact."],
    ["92pkr Official Channel", "@www92pkrcom", "Telegram / crypto / Pakistan-adjacent", 64, "Проверить", "Pakistan-style lead; quality check required before outreach."],
    ["CryptoTech Pakistan Search", "https://tgstat.com/channels/search?query=Pakistan%20crypto", "Telegram / search route / Pakistan", 60, "Новый", "Use this row to collect additional Pakistan crypto/Web3 channels from TGStat search."],
  ],
  "Вьетнам": [
    ["TradeCoinVN News", "@vietnamtradecoinchannel", "Telegram / Vietnam crypto news", 84, "Проверить", "TGStat Vietnam crypto result; strong local news candidate."],
    ["MegaLodon Futures", "@MegaLodonFutures", "Telegram / Vietnam trading / futures", 78, "Проверить", "Vietnam crypto/futures candidate; validate views and ad contact."],
    ["Coin98 Community", "@coin98_wallet", "Telegram / Vietnam DeFi wallet / Web3", 78, "Проверить", "Vietnam/Web3 ecosystem route; verify actual Telegram channel and ad policy."],
    ["Ninety Eight Community", "@ninetyeight_hq", "Telegram / Vietnam Web3 ecosystem", 74, "Проверить", "Vietnam Web3 ecosystem lead; verify official Telegram route."],
    ["Kyros Ventures", "@KyrosVentures", "Telegram / Vietnam crypto VC / Web3", 72, "Проверить", "Vietnam crypto ecosystem lead; better for partnership than paid post."],
    ["Tich Tac", "@tichtactichtac", "Telegram / Vietnam high-reach candidate", 66, "Проверить", "TGStat shows Vietnam and high views, but content may not be crypto-focused; validate fit hard."],
    ["Tich Tac News", "@tichtactichtac2", "Telegram / Vietnam news / crypto-adjacent", 62, "Проверить", "Secondary Tich Tac route; only use if crypto/Web3 audience exists."],
    ["Vietnam Crypto Search", "https://tgstat.com/channels/search?query=Vietnam%20crypto", "Telegram / search route / Vietnam", 60, "Новый", "Use to find more Vietnam crypto/Web3 channels."],
    ["DeFi Vietnam Search", "https://tgstat.com/channels/search?query=DeFi%20Vietnam", "Telegram / search route / Vietnam DeFi", 60, "Новый", "Use to collect DeFi-specific Vietnam channels."],
    ["Web3 Vietnam Search", "https://tgstat.com/channels/search?query=Web3%20Vietnam", "Telegram / search route / Vietnam Web3", 60, "Новый", "Use to collect Web3/community Vietnam channels."],
  ],
  "Бразилия": [
    ["Brazil Bitcoin", "@Brazil_Bitcoins", "Telegram / Brazil Bitcoin / crypto", 82, "Проверить", "TGStat Brazil crypto result; verify active views and ad contact."],
    ["Gems of Brazil", "@GemsofBrazil", "Telegram / Brazil gems / crypto", 76, "Проверить", "Brazil crypto/gems candidate; validate quality and admin."],
    ["Patex Announcements EN", "@cpatexeng", "Telegram / Brazil RWA / crypto", 74, "Проверить", "Brazil/RWA ecosystem route; likely partnership/listing angle."],
    ["Criptomoedas Search", "https://tgstat.com/channels/search?query=criptomoedas", "Telegram / Brazil crypto search", 68, "Новый", "Use to collect Portuguese crypto channels."],
    ["DeFi Brasil Search", "https://tgstat.com/channels/search?query=DeFi%20Brasil", "Telegram / Brazil DeFi search", 66, "Новый", "Use to collect DeFi Brasil channels."],
    ["Web3 Brasil Search", "https://tgstat.com/channels/search?query=Web3%20Brasil", "Telegram / Brazil Web3 search", 66, "Новый", "Use to collect Web3 Brasil channels."],
    ["Bitcoin Brasil Search", "https://tgstat.com/channels/search?query=Bitcoin%20Brasil", "Telegram / Brazil Bitcoin search", 64, "Новый", "Use to collect Bitcoin/crypto media channels in Brazil."],
    ["NFT Brasil Search", "https://tgstat.com/channels/search?query=NFT%20Brasil", "Telegram / Brazil NFT search", 62, "Новый", "NFT/Web3 subsegment for Brazil."],
    ["Blockchain Brasil Search", "https://tgstat.com/channels/search?query=Blockchain%20Brasil", "Telegram / Brazil blockchain search", 62, "Новый", "Smart-contract/blockchain search route."],
    ["Crypto Brazil Search", "https://tgstat.com/channels/search?query=Brazil%20crypto", "Telegram / Brazil crypto search", 60, "Новый", "General Brazil crypto discovery row."],
  ],
  "Нигерия": [
    ["Crypto Pulse Nigeria", "@Crypto_Pulse_Nigeria", "Telegram / Nigeria crypto news", 84, "Готов к контакту", "TGStat result; Nigeria-focused crypto channel. Verify recent views before outreach."],
    ["Earnathon Channel", "@EarnathonHQ", "Telegram / Nigeria blockchain education", 78, "Проверить", "Nigeria blockchain education route; better for educational webinar angle."],
    ["Legit.ng News", "@legitng", "Telegram / Nigeria news / crypto-adjacent", 72, "Проверить", "Large Nigerian media route; not pure crypto, but useful for broad awareness if ads available."],
    ["Crypto Pulse Nigeria Search", "https://tgstat.com/channels/search?query=Nigeria%20crypto", "Telegram / Nigeria crypto search", 68, "Новый", "Use to collect additional Nigeria crypto channels."],
    ["Web3 Nigeria Search", "https://tgstat.com/channels/search?query=Web3%20Nigeria", "Telegram / Nigeria Web3 search", 66, "Новый", "Use to find Web3/community builders in Nigeria."],
    ["DeFi Nigeria Search", "https://tgstat.com/channels/search?query=DeFi%20Nigeria", "Telegram / Nigeria DeFi search", 64, "Новый", "Use to collect DeFi-specific Nigerian leads."],
    ["Blockchain Nigeria Search", "https://tgstat.com/channels/search?query=Blockchain%20Nigeria", "Telegram / Nigeria blockchain search", 64, "Новый", "Good for education/webinar and smart-contract angle."],
    ["Airdrop Nigeria Search", "https://tgstat.com/channels/search?query=Nigeria%20airdrop", "Telegram / Nigeria airdrops", 60, "Новый", "High-risk segment; validate carefully."],
    ["Crypto Africa Nigeria Search", "https://tgstat.com/channels/search?query=Crypto%20Africa%20Nigeria", "Telegram / Africa crypto search", 60, "Новый", "Use for Nigeria/Africa crossover communities."],
    ["Manny Media Audience Route", "https://www.youtube.com/@mannymediatv/videos", "YouTube / Nigeria crypto creator route", 60, "Проверить", "Not Telegram, but useful source for finding his Telegram/community contact."],
  ],
  "Индонезия": [
    ["TONLICIOUS", "@tonlicious", "Telegram / Indonesia TON / Web3", 82, "Готов к контакту", "TGStat Indonesia crypto result; partnership contact listed as @Durov420."],
    ["TTcoin Indonesia Audience", "@ttcoinofficial", "Telegram / Indonesia crypto audience", 78, "Проверить", "TGStat snippet shows Indonesia as top audience; verify paid placement route."],
    ["Indonesia Leaks", "@indo_Leaks", "Telegram / Indonesia crypto-adjacent", 66, "Проверить", "TGStat crypto category result; validate content and fit before use."],
    ["Crypto Indonesia Search", "https://tgstat.com/channels/search?query=crypto%20Indonesia", "Telegram / Indonesia crypto search", 66, "Новый", "Use to collect active Indonesian crypto channels."],
    ["DeFi Indonesia Search", "https://tgstat.com/channels/search?query=DeFi%20Indonesia", "Telegram / Indonesia DeFi search", 64, "Новый", "DeFi-specific discovery route."],
    ["Web3 Indonesia Search", "https://tgstat.com/channels/search?query=Web3%20Indonesia", "Telegram / Indonesia Web3 search", 64, "Новый", "Web3/community discovery route."],
    ["Blockchain Indonesia Search", "https://tgstat.com/channels/search?query=Blockchain%20Indonesia", "Telegram / Indonesia blockchain search", 62, "Новый", "Smart-contract/blockchain audience discovery."],
    ["NFT Indonesia Search", "https://tgstat.com/channels/search?query=NFT%20Indonesia", "Telegram / Indonesia NFT search", 60, "Новый", "NFT/community discovery route."],
    ["Airdrop Indonesia Search", "https://tgstat.com/channels/search?query=Airdrop%20Indonesia", "Telegram / Indonesia airdrops", 60, "Новый", "Airdrop audience; validate spam risk."],
    ["TON Indonesia Search", "https://tgstat.com/channels/search?query=TON%20Indonesia", "Telegram / Indonesia TON search", 60, "Новый", "TON/Web3 segment discovery route."],
  ],
  "Филиппины": [
    ["Crypto Philippines Search", "https://tgstat.com/channels/search?query=crypto%20Philippines", "Telegram / Philippines crypto search", 70, "Новый", "Use to collect active Philippines crypto channels."],
    ["Web3 Philippines Search", "https://tgstat.com/channels/search?query=Web3%20Philippines", "Telegram / Philippines Web3 search", 68, "Новый", "Web3/community discovery route."],
    ["DeFi Philippines Search", "https://tgstat.com/channels/search?query=DeFi%20Philippines", "Telegram / Philippines DeFi search", 66, "Новый", "DeFi-focused discovery route."],
    ["Blockchain Philippines Search", "https://tgstat.com/channels/search?query=Blockchain%20Philippines", "Telegram / Philippines blockchain search", 66, "Новый", "Blockchain/smart-contract audience discovery."],
    ["NFT Philippines Search", "https://tgstat.com/channels/search?query=NFT%20Philippines", "Telegram / Philippines NFT search", 64, "Новый", "NFT/Web3 audience discovery."],
    ["P2E Philippines Search", "https://tgstat.com/channels/search?query=play%20to%20earn%20Philippines", "Telegram / Philippines P2E search", 64, "Новый", "Philippines has P2E history; validate current activity."],
    ["Airdrop Philippines Search", "https://tgstat.com/channels/search?query=airdrop%20Philippines", "Telegram / Philippines airdrops", 62, "Новый", "Airdrop segment; validate carefully."],
    ["Crypto PH Search", "https://tgstat.com/channels/search?query=Crypto%20PH", "Telegram / Philippines crypto search", 62, "Новый", "Use for local abbreviated PH crypto queries."],
    ["Bitcoin Philippines Search", "https://tgstat.com/channels/search?query=Bitcoin%20Philippines", "Telegram / Philippines Bitcoin search", 60, "Новый", "Bitcoin/crypto media discovery route."],
    ["Smart Contract Philippines Search", "https://tgstat.com/channels/search?query=smart%20contract%20Philippines", "Telegram / Philippines smart-contract search", 60, "Новый", "Smart-contract specific discovery route."],
  ],
  "Турция": [
    ["Turkey Crypto Coach", "@turkeycoach", "Telegram / Turkey crypto education", 84, "Готов к контакту", "TGStat Turkey crypto result; check current views and paid post options."],
    ["Crypto Turkiye Community", "@CryptoTurkiyeCom", "Telegram / Turkey crypto community", 82, "Проверить", "TGStat Turkey crypto community result; validate admin route."],
    ["Christopher's Alpha Chads", "@christophersalpha", "Telegram / Turkey crypto / trading", 76, "Проверить", "Turkey crypto result; check fit and current activity."],
    ["TGB Crypto Marketing Agency", "@marketing_telegrambooster", "Telegram / Turkey crypto marketing", 74, "Проверить", "Agency route for buying placements; verify terms."],
    ["Airdrop UN", "@Airdrop_UNIVERS", "Telegram / Turkey airdrops", 66, "Проверить", "Airdrop audience; check current activity hard."],
    ["Kripto Search", "https://tgstat.com/channels/search?query=kripto", "Telegram / Turkey crypto search", 66, "Новый", "Use to collect Turkish crypto channels."],
    ["DeFi Turkey Search", "https://tgstat.com/channels/search?query=DeFi%20Turkey", "Telegram / Turkey DeFi search", 64, "Новый", "DeFi-specific discovery route."],
    ["Web3 Turkey Search", "https://tgstat.com/channels/search?query=Web3%20Turkey", "Telegram / Turkey Web3 search", 64, "Новый", "Web3 community discovery route."],
    ["Blockchain Turkey Search", "https://tgstat.com/channels/search?query=Blockchain%20Turkey", "Telegram / Turkey blockchain search", 62, "Новый", "Smart-contract/blockchain discovery route."],
    ["NFT Turkey Search", "https://tgstat.com/channels/search?query=NFT%20Turkey", "Telegram / Turkey NFT search", 60, "Новый", "NFT/community discovery route."],
  ],
  "Россия": [
    ["DeFi RU Search", "https://tgstat.ru/en/channels/search?query=DeFi", "Telegram / RU DeFi search", 78, "Новый", "Use TGStat RU crypto catalog/search to collect active DeFi channels."],
    ["Crypto RU Search", "https://tgstat.ru/en/channels/search?query=crypto", "Telegram / RU crypto search", 76, "Новый", "RU crypto discovery route; verify ad labeling and reputation."],
    ["Web3 RU Search", "https://tgstat.ru/en/channels/search?query=Web3", "Telegram / RU Web3 search", 74, "Новый", "Web3 community discovery route."],
    ["Blockchain RU Search", "https://tgstat.ru/en/channels/search?query=blockchain", "Telegram / RU blockchain search", 72, "Новый", "Smart-contract/blockchain discovery route."],
    ["NFT RU Search", "https://tgstat.ru/en/channels/search?query=NFT", "Telegram / RU NFT search", 70, "Новый", "NFT/Web3 discovery route."],
    ["TON RU Search", "https://tgstat.ru/en/channels/search?query=TON", "Telegram / RU TON search", 70, "Новый", "TON/Web3 audience discovery route."],
    ["Airdrop RU Search", "https://tgstat.ru/en/channels/search?query=airdrop", "Telegram / RU airdrops", 64, "Новый", "High-risk airdrop segment; validate spam and reputation."],
    ["Smart Contract RU Search", "https://tgstat.ru/en/channels/search?query=smart%20contract", "Telegram / RU smart-contract search", 64, "Новый", "Smart-contract specific discovery route."],
    ["Crypto News RU Search", "https://tgstat.ru/en/channels/search?query=crypto%20news", "Telegram / RU crypto news search", 62, "Новый", "Crypto media discovery route."],
    ["HYIP/Monitor RU Search", "https://tgstat.ru/en/channels/search?query=HYIP", "Telegram / RU HYIP-adjacent search", 60, "Новый", "Use carefully; check reputation and compliance wording."],
  ],
};

function slug(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function toUrl(handleOrUrl = "") {
  if (handleOrUrl.startsWith("http")) return handleOrUrl;
  return `https://t.me/${handleOrUrl.replace(/^@/, "")}`;
}

export const defaultTelegramLeads = Object.entries(channelGroups).flatMap(([country, channels]) => (
  channels.map(([name, handleOrUrl, category, fitScore, status, note], index) => ({
    id: `tg-${slug(country)}-${String(index + 1).padStart(2, "0")}-${slug(name)}`,
    name,
    country,
    url: toUrl(handleOrUrl),
    category,
    trafficScore: Math.min(95, Math.max(50, fitScore + (status === "Готов к контакту" ? 4 : 0))),
    aliveScore: Math.min(92, Math.max(50, fitScore + (status === "Готов к контакту" ? 2 : -2))),
    fitScore,
    contacts: handleOrUrl.startsWith("@")
      ? `Channel: ${handleOrUrl}\nContact: проверить pinned/admin/описание канала перед outreach`
      : `Discovery route: ${handleOrUrl}\nContact: добавить конкретный канал после проверки выдачи`,
    status,
    lastSeen: "seed 100 · проверить перед оплатой",
    notes: `${countryMarketNotes[country]} ${note}`,
  }))
));
