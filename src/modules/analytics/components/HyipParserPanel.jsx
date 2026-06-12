import { useEffect, useMemo, useState } from "react";
import { loadServerContent, postServerJson, saveServerContent } from "../services/contentStore";

const COUNTRY_OPTIONS = [
  "Все страны",
  "Россия",
  "США",
  "Евросоюз",
  "Великобритания",
  "Индия",
  "Индонезия",
  "Вьетнам",
  "Бразилия",
  "Турция",
  "Филиппины",
  "Нигерия",
  "Пакистан",
  "Бангладеш",
  "Малайзия",
  "Таиланд",
  "Мексика",
  "Германия",
  "Канада",
  "Австралия",
  "Глобально",
];
const STATUS_OPTIONS = ["Все статусы", "Новый", "Проверить", "Готов к контакту", "В работе", "Не подходит"];
const STORAGE_KEY = "atlas.analytics.hyipParserLeads.v3";
const OUTREACH_STORAGE_KEY = "atlas.analytics.hyipOutreach.queue.v1";
const OUTREACH_STATUS_OPTIONS = ["Найден", "Черновик", "Отправлено", "Ответили", "Цена получена", "Договорились", "Отказ"];

const defaultLeads = [
  {
    id: "lead-hyipexplorer",
    name: "HYIPexplorer",
    country: "Глобально",
    url: "https://www.hyipexplorer.com/",
    category: "HYIP monitor",
    trafficScore: 88,
    aliveScore: 90,
    fitScore: 86,
    contacts: "Telegram Support: @he_aid\nTelegram Group: @hyipexplorer_com\nFeedback form: /contact/send_feedback/",
    status: "Готов к контакту",
    lastSeen: "проверено сегодня",
    notes: "Есть advertising page, заявлено 35k+ unique visitors/month. Хороший первый кандидат.",
  },
  {
    id: "lead-hyip-com",
    name: "HYIP.com",
    country: "США",
    url: "https://www.hyip.com/buy_ads/",
    category: "HYIP monitor / ads",
    trafficScore: 82,
    aliveScore: 68,
    fitScore: 77,
    contacts: "Buy Ads form: https://www.hyip.com/buy_ads/\nContact page: https://www.hyip.com/support/\nOrder field: Contact E-mail",
    status: "Готов к контакту",
    lastSeen: "проверено сегодня",
    notes: "Есть buy_ads с ценами: sticky, rotating/static banners, premium/normal listings.",
  },
  {
    id: "lead-upayhyip",
    name: "UpayHYIP",
    country: "Индия",
    url: "https://upayhyip.com/buy_ads/tid/6/",
    category: "trusted HYIP monitor",
    trafficScore: 74,
    aliveScore: 89,
    fitScore: 81,
    contacts: "Buy Ads form: https://upayhyip.com/buy_ads/tid/6/\nAdvertise page: https://upayhyip.com/advertise/\nOrder field: Contact E-mail",
    status: "Готов к контакту",
    lastSeen: "проверено сегодня",
    notes: "Свежие listings/payouts за июнь 2026, много доступных banner slots.",
  },
  {
    id: "lead-invest-monitoring",
    name: "Invest-Monitoring",
    country: "Евросоюз",
    url: "https://invest-monitoring.eu/buy_ads/",
    category: "HYIP investment monitor",
    trafficScore: 70,
    aliveScore: 82,
    fitScore: 76,
    contacts: "Buy Ads form: https://invest-monitoring.eu/buy_ads/\nOrder field: Contact E-mail",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Есть рекламные форматы и цены, но часть дат старая: нужен ручной review живости.",
  },
  {
    id: "lead-luckymonitor",
    name: "LuckyMonitor",
    country: "Великобритания",
    url: "https://luckymonitor.com/banners/",
    category: "trusted HYIP monitor / community",
    trafficScore: 76,
    aliveScore: 84,
    fitScore: 80,
    contacts: "Email: luckymonitorcom@gmail.com\nSupport: @LuckyMonitorSupport\nChannel: @LuckyMonitorChannel\nGroup: @LuckyMonitorGroup",
    status: "Готов к контакту",
    lastSeen: "проверено сегодня",
    notes: "Заявляют 3k+ Telegram subscribers и 500+ visitors/day. Хороший community-fit.",
  },
  {
    id: "lead-invest-tracing",
    name: "Invest-Tracing",
    country: "Индонезия",
    url: "https://invest-tracing.com/hoho/support.html",
    category: "HYIP monitor / support",
    trafficScore: 73,
    aliveScore: 80,
    fitScore: 78,
    contacts: "Telegram admins: @AMNAALE, @FNAALE\nSupport page protected by Cloudflare, do not bypass; verify in browser before payment.",
    status: "Готов к контакту",
    lastSeen: "проверено сегодня",
    notes: "На support page указаны Telegram admins и платежи для listing/advertise. Обязательно проверять impersonators.",
  },
  {
    id: "lead-hyip-monitor-net",
    name: "HYIP Monitor",
    country: "США",
    url: "https://hyip-monitor.net/advertise",
    category: "HYIP monitor / advertise",
    trafficScore: 68,
    aliveScore: 78,
    fitScore: 73,
    contacts: "Advertise page: https://hyip-monitor.net/advertise\nSupport links: Contact Us, Telegram, Reddit",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Есть advertise page: leaderboard placement $75/week. Проверить фактический трафик.",
  },
  {
    id: "lead-mmhyip",
    name: "MMHYIP",
    country: "Филиппины",
    url: "https://mmhyip.com/buy_ads/tid/2/",
    category: "HYIP monitor / RCB",
    trafficScore: 69,
    aliveScore: 76,
    fitScore: 72,
    contacts: "Buy Ads flow: https://mmhyip.com/buy_ads/tid/2/\nOrder form on site",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Есть pricing по banner sizes и sticky listings. Нужна проверка актуальности аудитории.",
  },
  {
    id: "lead-stronghyip",
    name: "StrongHYIP",
    country: "Германия",
    url: "https://stronghyip.com/",
    category: "HYIP monitor / guarantees",
    trafficScore: 66,
    aliveScore: 74,
    fitScore: 70,
    contacts: "Site nav: Add Project, Advertise, Telegram, Contact\nVerify handles manually before outreach.",
    status: "Новый",
    lastSeen: "проверено сегодня",
    notes: "Есть Add Project, Advertise, Guarantees, Telegram. Проверить форматы размещения.",
  },
  {
    id: "lead-hyiphunter",
    name: "HyipHunter",
    country: "Канада",
    url: "https://hyiphunter.biz/buy_ads/",
    category: "HYIP monitor / ads",
    trafficScore: 64,
    aliveScore: 72,
    fitScore: 68,
    contacts: "Buy Ads form: https://hyiphunter.biz/buy_ads/\nOrder form on site",
    status: "Новый",
    lastSeen: "проверено сегодня",
    notes: "Найден buy_ads с доступными banner slots. Проверить индексацию и последние payout updates.",
  },
  {
    id: "lead-hyips-bz",
    name: "HYIPs.bz",
    country: "Малайзия",
    url: "https://hyips.bz/?lang=en",
    category: "HYIP monitor / RCB",
    trafficScore: 63,
    aliveScore: 61,
    fitScore: 58,
    contacts: "Site nav: Support, Banners & Ads\nVerify current contact page manually.",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Есть Banners & Ads и Support, но часть activity выглядит старой. Нужен ручной review.",
  },
  {
    id: "lead-hothyips",
    name: "Hot HYIPs",
    country: "Австралия",
    url: "https://www.hothyips.com/home.html",
    category: "HYIP monitor",
    trafficScore: 61,
    aliveScore: 56,
    fitScore: 55,
    contacts: "Site text mentions online support via email or Telegram\nVerify exact handle/email manually.",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "На странице указаны email/Telegram для вопросов. Проверить свежесть monitor listings.",
  },
  {
    id: "lead-hyip-biz",
    name: "HYIP.BIZ",
    country: "Глобально",
    url: "https://www.hyip.biz/",
    category: "HYIP monitor / aggregator",
    trafficScore: 80,
    aliveScore: 70,
    fitScore: 75,
    contacts: "Sign up options: Telegram, Twitter, E-mail\nUse account route, then contact support/ads inside.",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Крупный aggregator/database, есть sign-up каналы. Нужен отдельный route для outreach.",
  },
  {
    id: "lead-scamscavenger",
    name: "ScamScavenger",
    country: "Россия",
    url: "https://scamscavenger.tech/faq",
    category: "AI HYIP monitor / anti-scam",
    trafficScore: 62,
    aliveScore: 77,
    fitScore: 52,
    contacts: "Telegram Group + Telegram Channel linked on site\nAnti-scam positioning: contact carefully, analytics-first angle.",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Антискам-позиционирование: скорее для аналитики рынка, не для рекламы high-yield claims.",
  },
  {
    id: "lead-indomonitor",
    name: "IndoMonitor",
    country: "Индонезия",
    url: "https://indomonitor.com/",
    category: "regional HYIP monitor",
    trafficScore: 60,
    aliveScore: 62,
    fitScore: 64,
    contacts: "LinkedIn admin profile найден, сайт проверить вручную",
    status: "Новый",
    lastSeen: "проверено сегодня",
    notes: "Региональный Indonesia lead. Требуется ручная проверка доступности и рекламных условий.",
  },
  {
    id: "lead-hyip-zanoza",
    name: "HYIP-Zanoza",
    country: "Россия",
    url: "https://hyip-zanoza.me/",
    category: "HYIP monitor",
    trafficScore: 58,
    aliveScore: 60,
    fitScore: 60,
    contacts: "Trustpilot mentions contact; проверить на сайте",
    status: "Новый",
    lastSeen: "проверено сегодня",
    notes: "Русскоязычный lead из выдачи/Trustpilot. Нужна проверка живости и контактов.",
  },
  {
    id: "lead-allhyipmonitors",
    name: "All HYIP Monitors",
    country: "Глобально",
    url: "https://www.allhyipmonitors.com/",
    category: "HYIP monitor aggregator",
    trafficScore: 72,
    aliveScore: 66,
    fitScore: 71,
    contacts: "Advertising options mentioned by company profile",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Aggregator для проверки статусов на разных monitors. Полезно как источник дальнейшего crawl.",
  },
  {
    id: "lead-mega-hyip",
    name: "Mega-HYIP",
    country: "Россия",
    url: "https://pro.mega-hyip.ru/?a=rcb&lid=3",
    category: "HYIP monitor / listing",
    trafficScore: 55,
    aliveScore: 54,
    fitScore: 57,
    contacts: "Listing/contact e-mail fields",
    status: "Новый",
    lastSeen: "проверено сегодня",
    notes: "Есть listing/advertising flow, но нужно проверить актуальность и основной домен.",
  },
  {
    id: "lead-hyipblock",
    name: "HYIPBlock",
    country: "Россия",
    url: "https://hyipblock.ru",
    category: "HYIP monitor",
    trafficScore: 54,
    aliveScore: 58,
    fitScore: 61,
    contacts: "Проверить публичные контакты на сайте",
    status: "Новый",
    lastSeen: "из исходного ТЗ",
    notes: "Добавлено как целевой аналог из задачи. Нужна валидация доступности и условий рекламы.",
  },
  {
    id: "lead-profit-hunters",
    name: "Profit Hunters",
    country: "Россия",
    url: "https://profit-hunters.example",
    category: "monitor / community",
    trafficScore: 50,
    aliveScore: 50,
    fitScore: 58,
    contacts: "Проверить Telegram/контакты вручную",
    status: "Новый",
    lastSeen: "из исходного ТЗ",
    notes: "Название из задачи как пример похожего monitor/community. URL-заглушка до ручной валидации.",
  },
  {
    id: "lead-india-coingape",
    name: "CoinGape",
    country: "Индия",
    url: "https://coingape.com/advertise/",
    category: "India crypto media / ads",
    trafficScore: 86,
    aliveScore: 92,
    fitScore: 78,
    contacts: "Advertise: https://coingape.com/advertise/\nContact: https://coingape.com/contact-us/\nSubmit PR: site nav",
    status: "Готов к контакту",
    lastSeen: "проверено сегодня",
    notes: "Не HYIP-monitor, но сильная India crypto-аудитория: 2M+ monthly readers, social/newsletter inventory.",
  },
  {
    id: "lead-india-coincodecap",
    name: "CoinCodeCap",
    country: "Индия",
    url: "https://coincodecap.com/",
    category: "India crypto signals / media",
    trafficScore: 76,
    aliveScore: 88,
    fitScore: 73,
    contacts: "Telegram: https://t.me/coincodecap\nAdmin: @gaurav_zen\nContact: https://signals.coincodecap.com/contact",
    status: "Готов к контакту",
    lastSeen: "проверено сегодня",
    notes: "Крипто-сигналы и новости, 25k+ Telegram subscribers в публичном канале. Писать только через official/admin route.",
  },
  {
    id: "lead-india-the-media-ant",
    name: "The Media Ant",
    country: "Индия",
    url: "https://www.themediaant.com/digital/telegram-advertising",
    category: "India Telegram ads marketplace",
    trafficScore: 80,
    aliveScore: 90,
    fitScore: 70,
    contacts: "Telegram ads page: https://www.themediaant.com/digital/telegram-advertising\nContact: https://www.themediaant.com/contact-us",
    status: "Готов к контакту",
    lastSeen: "проверено сегодня",
    notes: "Маркетплейс рекламы в Индии. Полезен для Telegram/crypto community placements, не как HYIP-monitor.",
  },
  {
    id: "lead-india-coinsutra",
    name: "CoinSutra",
    country: "Индия",
    url: "https://coinsutra.com/advertise/",
    category: "India crypto education / ads",
    trafficScore: 74,
    aliveScore: 82,
    fitScore: 68,
    contacts: "Advertise: https://coinsutra.com/advertise/\nContact form on site",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Индийская crypto education/media площадка. Перед outreach проверить policy по investment/high-yield формулировкам.",
  },
  {
    id: "lead-india-coingabbar",
    name: "CoinGabbar",
    country: "Индия",
    url: "https://www.coingabbar.com/",
    category: "India crypto news / listings",
    trafficScore: 72,
    aliveScore: 84,
    fitScore: 69,
    contacts: "Site nav: News, Press Release, Presale/ICO, Events, Listing\nContact route проверить вручную",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Crypto news/listing портал с India fit. Нужен ручной review рекламных правил и контактов.",
  },
  {
    id: "lead-india-telegram-ads-official",
    name: "Telegram Ads India targeting",
    country: "Индия",
    url: "https://ads.telegram.org/",
    category: "official Telegram ad platform",
    trafficScore: 92,
    aliveScore: 96,
    fitScore: 74,
    contacts: "Official platform: https://ads.telegram.org/\nGetting started: https://ads.telegram.org/getting-started",
    status: "Готов к контакту",
    lastSeen: "проверено сегодня",
    notes: "Не площадка, а официальный канал закупки рекламы по Telegram channels. Использовать как clean route для India audience.",
  },
  {
    id: "lead-india-evido",
    name: "Evido India Telegram Ads",
    country: "Индия",
    url: "https://evido.me/in-en",
    category: "India Telegram ads agency",
    trafficScore: 70,
    aliveScore: 86,
    fitScore: 67,
    contacts: "Lead form: https://evido.me/in-en",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Агентский доступ к Telegram Ads для Индии. Проверить комиссии, moderation и finance/crypto restrictions.",
  },
  {
    id: "lead-india-trilokana",
    name: "Trilokana Telegram Ads",
    country: "Индия",
    url: "https://trilokana.com/blog/top-6-telegram-ads-agencies-in-india-2026-updated-list/",
    category: "India Telegram ads agency list",
    trafficScore: 62,
    aliveScore: 76,
    fitScore: 60,
    contacts: "Use article/company contact routes; verify each agency manually",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Источник для добора Telegram ad agencies в Индии. Это lead-source, не финальная площадка.",
  },
  {
    id: "lead-india-digitalbrain",
    name: "Digital Brain HYIP Software",
    country: "Индия",
    url: "https://www.digitalbrain.co.in/advanced-hyip-investment-software/",
    category: "India HYIP software vendor",
    trafficScore: 58,
    aliveScore: 72,
    fitScore: 54,
    contacts: "Website contact routes; verify sales/contact page manually",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Не monitor, но индийский HYIP/software lead. Может подсказать локальные placements/partners.",
  },
  {
    id: "lead-india-web-hyip",
    name: "Web HYIP",
    country: "Индия",
    url: "https://clutch.co/profile/web-hyip",
    category: "India HYIP software / vendor",
    trafficScore: 56,
    aliveScore: 68,
    fitScore: 52,
    contacts: "Clutch profile/contact route; verify official site before outreach",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "B2B vendor lead из India-поиска. Использовать как источник контактов/партнеров, не как рекламный monitor.",
  },
  {
    id: "lead-india-hyip-monitor-script-madurai",
    name: "HYIP Monitor Script Madurai",
    country: "Индия",
    url: "https://www.exportersindia.com/hyip-monitor-script/",
    category: "India HYIP monitor software",
    trafficScore: 48,
    aliveScore: 64,
    fitScore: 49,
    contacts: "Marketplace contact route on ExportersIndia; verify vendor identity",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Скорее supplier/software, но релевантен для поиска индийских monitor operators.",
  },
  {
    id: "lead-india-capterra-hyip-manager",
    name: "HYIP Manager Script",
    country: "Индия",
    url: "https://www.capterra.in/software/153400/hyip-manager-script",
    category: "India HYIP software listing",
    trafficScore: 52,
    aliveScore: 66,
    fitScore: 48,
    contacts: "Capterra listing/contact route; identify vendor before outreach",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Software listing, полезен как vendor intelligence. Не считать рекламной площадкой без ручной проверки.",
  },
  {
    id: "lead-india-propeller-telegram",
    name: "PropellerAds Telegram Mini Apps",
    country: "Индия",
    url: "https://propellerads.com/formats/telegram-mini-apps-ads/",
    category: "Telegram ad network",
    trafficScore: 78,
    aliveScore: 90,
    fitScore: 65,
    contacts: "Contact/demo form on page",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Не India-only, но можно тестировать Telegram inventory и GEO India через ad network.",
  },
  {
    id: "lead-india-richads-telegram",
    name: "RichAds Telegram Networks",
    country: "Индия",
    url: "https://richads.com/blog/10-best-telegram-advertising-platforms/",
    category: "Telegram ad network source",
    trafficScore: 68,
    aliveScore: 82,
    fitScore: 60,
    contacts: "Use listed networks and RichAds contact routes",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Источник сеток для Telegram ads. Взять как lead-source для India GEO, не как HYIP-monitor.",
  },
  {
    id: "lead-india-telega",
    name: "Telega.io India crypto channels",
    country: "Индия",
    url: "https://telega.io/",
    category: "Telegram channel marketplace",
    trafficScore: 76,
    aliveScore: 88,
    fitScore: 66,
    contacts: "Marketplace account/contact route: https://telega.io/",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Маркетплейс Telegram channels. Искать India/crypto/finance channels внутри каталога.",
  },
  {
    id: "lead-india-bitmedia-telegram",
    name: "Bitmedia Telegram Ads Guide",
    country: "Индия",
    url: "https://bitmedia.io/blog/telegram-adverising",
    category: "crypto ad network / Telegram route",
    trafficScore: 70,
    aliveScore: 82,
    fitScore: 62,
    contacts: "Bitmedia site contact/advertiser route",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Crypto ad network route. Проверить, есть ли India targeting и policy по инвестиционным офферам.",
  },
  {
    id: "lead-india-cryptoninjas",
    name: "CryptoNinjas",
    country: "Индия",
    url: "https://www.cryptoninjas.net/",
    category: "crypto media / global India reach",
    trafficScore: 66,
    aliveScore: 74,
    fitScore: 55,
    contacts: "Advertising/contact routes on site; verify current availability",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Глобальная crypto-media площадка, полезна как дополнительный outreach lead для India traffic tests.",
  },
  {
    id: "lead-india-upayhyip-market",
    name: "UpayHYIP India market",
    country: "Индия",
    url: "https://upayhyip.com/advertise/",
    category: "HYIP monitor / India-targetable",
    trafficScore: 74,
    aliveScore: 89,
    fitScore: 82,
    contacts: "Advertise: https://upayhyip.com/advertise/\nBuy Ads: https://upayhyip.com/buy_ads/tid/6/",
    status: "Готов к контакту",
    lastSeen: "проверено сегодня",
    notes: "Отдельный India-market дубль для фильтра Индия: живой HYIP-monitor с buy_ads flow.",
  },
  {
    id: "lead-india-allhyipmonitors-source",
    name: "All HYIP Monitors India sourcing",
    country: "Индия",
    url: "https://www.allhyipmonitors.com/contact.html",
    category: "HYIP monitor aggregator / source",
    trafficScore: 70,
    aliveScore: 66,
    fitScore: 64,
    contacts: "Contact: https://www.allhyipmonitors.com/contact.html",
    status: "Проверить",
    lastSeen: "проверено сегодня",
    notes: "Использовать как источник дополнительных monitor domains и сверки статусов; India contacts искать вручную.",
  },
  {
    id: "lead-india-hyipexplorer-market",
    name: "HYIPexplorer India market",
    country: "Индия",
    url: "https://www.hyipexplorer.com/advertising/",
    category: "HYIP monitor / India-targetable",
    trafficScore: 88,
    aliveScore: 90,
    fitScore: 76,
    contacts: "Advertising: https://www.hyipexplorer.com/advertising/\nTelegram Support: @he_aid\nTelegram Group: @hyipexplorer_com",
    status: "Готов к контакту",
    lastSeen: "проверено сегодня",
    notes: "Глобальный monitor, но подходит для India test campaign как высокоприоритетная HYIP-аудитория.",
  },
];

function readStoredLeads() {
  if (typeof window === "undefined") return defaultLeads;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    if (!Array.isArray(parsed) || !parsed.length) return defaultLeads;

    const savedIds = new Set(parsed.map((lead) => lead.id));
    const missingSeedLeads = defaultLeads.filter((lead) => !savedIds.has(lead.id));
    return [...parsed, ...missingSeedLeads];
  } catch {
    return defaultLeads;
  }
}

function readStoredOutreach() {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(OUTREACH_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function extractEmail(value = "") {
  return String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function extractTelegramHandle(value = "") {
  return String(value || "").match(/@[a-zA-Z0-9_]{5,}/)?.[0] || "";
}

function makeFollowUpDate(days = 2) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeOutreachRecord(lead, record = {}) {
  const email = record.email || extractEmail(lead.contacts);
  const telegram = record.telegram || extractTelegramHandle(lead.contacts);
  return {
    leadId: lead.id,
    status: record.status || (lead.status === "Готов к контакту" ? "Найден" : "Найден"),
    channel: record.channel || (email ? "email" : telegram ? "telegram" : "form"),
    email,
    telegram,
    subject: record.subject || "",
    draft: record.draft || "",
    price: record.price || "",
    conditions: record.conditions || "",
    nextStep: record.nextStep || "Создать черновик и запросить media kit",
    followUpAt: record.followUpAt || "",
    lastContactAt: record.lastContactAt || "",
    responseNotes: record.responseNotes || "",
    history: Array.isArray(record.history) ? record.history : [],
    sendState: "",
  };
}

function getOutreachRecord(lead, outreach) {
  return normalizeOutreachRecord(lead, outreach[lead.id]);
}

function buildOutreachDraft(lead, record = {}) {
  const subject = `Advertising placement request - Atlas System x ${lead.name}`;
  const intro = lead.country === "Индия"
    ? "We are preparing an India-focused Web3 advertising test and are reviewing relevant crypto, Telegram and monitor placements."
    : "We are preparing an international Web3 advertising campaign and are reviewing relevant crypto, Telegram and monitor placements.";
  const body = [
    "Hello,",
    "",
    "My name is [Your Name], I represent Atlas System.",
    intro,
    "",
    "Could you please send your current media kit and placement options?",
    "",
    "We would like to understand:",
    "1. Available ad formats: banners, listings, reviews, Telegram/channel placements, newsletter or social posts",
    "2. Prices per week/month and available start dates",
    "3. Traffic by country, especially India and global crypto/Web3 audience",
    "4. Telegram/social audience size and engagement",
    "5. Moderation requirements and materials you need from our side",
    "6. Payment methods and invoice/confirmation process",
    "",
    "We can provide the website, creatives and project details for your review before any placement. We are looking for compliant paid advertising options and want to confirm all requirements first.",
    "",
    "Official website: https://atlas-system.io",
    "",
    "Thank you.",
    "Atlas System Partnerships",
  ].join("\n");

  return {
    ...record,
    status: "Черновик",
    subject,
    draft: body,
    nextStep: "Проверить текст и отправить email / написать в Telegram",
    followUpAt: record.followUpAt || makeFollowUpDate(2),
  };
}

function makeTelegramUrl(handle = "", text = "") {
  const cleanHandle = String(handle || "").replace(/^@/, "").trim();
  if (!cleanHandle) return "";
  return `https://t.me/${cleanHandle}?text=${encodeURIComponent(text)}`;
}

function getScoreTone(score) {
  if (score >= 80) return "success";
  if (score >= 60) return "accent";
  return "danger";
}

function getStatusTone(status) {
  if (status === "Готов к контакту") return "success";
  if (status === "В работе") return "accent";
  if (status === "Не подходит") return "danger";
  return "default";
}

function makeCsv(leads) {
  const header = ["name", "country", "url", "category", "trafficScore", "aliveScore", "fitScore", "contacts", "status", "notes"];
  const rows = leads.map((lead) => header.map((key) => `"${String(lead[key] ?? "").replaceAll('"', '""')}"`).join(","));
  return [header.join(","), ...rows].join("\n");
}

function downloadLeadsCsv(leads) {
  const blob = new Blob([makeCsv(leads)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hyip-monitor-leads.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function HyipParserPanel() {
  const [leads, setLeads] = useState(readStoredLeads);
  const [outreach, setOutreach] = useState(readStoredOutreach);
  const [isOutreachLoaded, setIsOutreachLoaded] = useState(false);
  const [outreachSaveState, setOutreachSaveState] = useState("Локально");
  const [selectedLeadId, setSelectedLeadId] = useState(() => readStoredLeads()[0]?.id || "");
  const [pipelineStatus, setPipelineStatus] = useState("Все этапы");
  const [country, setCountry] = useState("Все страны");
  const [status, setStatus] = useState("Все статусы");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    loadServerContent(OUTREACH_STORAGE_KEY).then((savedOutreach) => {
      if (!isMounted) return;
      if (savedOutreach && typeof savedOutreach === "object" && !Array.isArray(savedOutreach)) {
        setOutreach(savedOutreach);
        try {
          window.localStorage.setItem(OUTREACH_STORAGE_KEY, JSON.stringify(savedOutreach));
        } catch {
          // Серверная очередь уже загружена в состояние страницы.
        }
        setOutreachSaveState("Сохранено на сервере");
      }
      setIsOutreachLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isOutreachLoaded) return undefined;

    const timer = window.setTimeout(() => {
      setOutreachSaveState("Сохраняю...");
      try {
        window.localStorage.setItem(OUTREACH_STORAGE_KEY, JSON.stringify(outreach));
      } catch {
        // Очередь останется доступна в состоянии страницы.
      }

      saveServerContent(OUTREACH_STORAGE_KEY, outreach).then((ok) => {
        setOutreachSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен");
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [isOutreachLoaded, outreach]);

  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const record = getOutreachRecord(lead, outreach);
    const countryMatch = country === "Все страны" || lead.country === country;
    const statusMatch = status === "Все статусы" || lead.status === status;
    const pipelineMatch = pipelineStatus === "Все этапы" || record.status === pipelineStatus;
    const search = query.trim().toLowerCase();
    const queryMatch = !search || [lead.name, lead.country, lead.url, lead.category, lead.contacts, lead.notes, record.draft, record.price, record.conditions, record.responseNotes]
      .some((value) => String(value).toLowerCase().includes(search));
    return countryMatch && statusMatch && pipelineMatch && queryMatch;
  }), [country, leads, outreach, pipelineStatus, query, status]);

  const summary = useMemo(() => ({
    total: leads.length,
    ready: leads.filter((lead) => lead.status === "Готов к контакту").length,
    avgFit: Math.round(leads.reduce((sum, lead) => sum + lead.fitScore, 0) / Math.max(leads.length, 1)),
    contacts: leads.filter((lead) => lead.contacts && lead.contacts !== "form only").length,
  }), [leads]);

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) || filteredLeads[0] || leads[0];
  const selectedOutreach = selectedLead ? getOutreachRecord(selectedLead, outreach) : null;

  function persist(nextLeads) {
    setLeads(nextLeads);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLeads));
    }
  }

  function updateLead(id, patch) {
    persist(leads.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
  }

  function updateOutreach(leadId, patch) {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) return;
    const currentRecord = getOutreachRecord(lead, outreach);
    const nextRecord = {
      ...currentRecord,
      ...patch,
      history: patch.history || currentRecord.history,
    };
    setOutreach((current) => ({ ...current, [leadId]: nextRecord }));
  }

  function appendOutreachHistory(leadId, text, patch = {}) {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) return;
    const currentRecord = getOutreachRecord(lead, outreach);
    updateOutreach(leadId, {
      ...patch,
      history: [
        { id: `outreach-${Date.now()}`, text, createdAt: new Date().toISOString() },
        ...currentRecord.history,
      ],
    });
  }

  function createDraft(lead) {
    const currentRecord = getOutreachRecord(lead, outreach);
    const nextRecord = buildOutreachDraft(lead, currentRecord);
    appendOutreachHistory(lead.id, "Агент создал черновик письма", nextRecord);
  }

  async function copyTelegramDraft(lead, record) {
    const draft = record.draft || buildOutreachDraft(lead, record).draft;
    try {
      await navigator.clipboard.writeText(draft);
      appendOutreachHistory(lead.id, "Telegram-текст скопирован", {
        ...record,
        draft,
        status: record.status === "Найден" ? "Черновик" : record.status,
        nextStep: "Открыть Telegram и отправить вручную",
      });
    } catch {
      window.alert("Не получилось скопировать текст. Выдели черновик вручную.");
    }
  }

  async function sendEmail(lead, record) {
    const draft = record.draft || buildOutreachDraft(lead, record).draft;
    const subject = record.subject || buildOutreachDraft(lead, record).subject;
    const email = record.email || extractEmail(lead.contacts);
    if (!email) {
      window.alert("У этого лида нет email. Добавь email в карточку outreach или используй Telegram/contact form.");
      return;
    }

    updateOutreach(lead.id, { ...record, draft, subject, email, sendState: "sending" });
    const result = await postServerJson("/api/outreach/send-email", {
      lead: { id: lead.id, name: lead.name, url: lead.url, country: lead.country, category: lead.category },
      to: email,
      subject,
      body: draft,
    });

    if (!result.ok) {
      const errorText = result.payload?.error === "outreach_email_not_configured"
        ? "Нужно подключить RESEND_API_KEY, OUTREACH_FROM_EMAIL и OUTREACH_REPLY_TO_EMAIL на сервере."
        : result.payload?.error === "invalid_recipient_email"
          ? "Email получателя выглядит некорректно."
          : "Email не отправился. Проверь настройки отправки.";
      updateOutreach(lead.id, { ...record, draft, subject, email, sendState: "error" });
      window.alert(errorText);
      return;
    }

    appendOutreachHistory(lead.id, `Email отправлен на ${email}`, {
      ...record,
      draft,
      subject,
      email,
      status: "Отправлено",
      lastContactAt: new Date().toISOString(),
      followUpAt: makeFollowUpDate(2),
      nextStep: "Ждать ответ или сделать follow-up через 2 дня",
      sendState: "sent",
    });
  }

  function addManualLead() {
    const nextLead = {
      id: `lead-${Date.now()}`,
      name: "Новая площадка",
      country: country === "Все страны" ? "Россия" : country,
      url: "https://",
      category: "HYIP monitor",
      trafficScore: 50,
      aliveScore: 50,
      fitScore: 50,
      contacts: "",
      status: "Новый",
      lastSeen: "только что",
      notes: "Добавлено вручную, нужно проверить контакты и активность.",
    };
    persist([nextLead, ...leads]);
  }

  return (
    <WrapperShell>
      <section className="analytics-parser-hero analytics-surface">
        <div>
          <p className="analytics-kicker">Parser / outreach</p>
          <h1>Площадки и переговоры</h1>
          <p>
            База рекламных площадок, черновик письма, email-отправка и быстрый текст для Telegram. Задача простая:
            выбрать контакт, запросить цену и довести до договорённости.
          </p>
        </div>
        <div className="analytics-parser-run-card">
          <span>Очередь outreach</span>
          <strong>{summary.total}</strong>
          <p>{outreachSaveState}</p>
        </div>
      </section>

      <section className="analytics-parser-stats">
        <Metric label="Найдено площадок" value={summary.total} tone="success" />
        <Metric label="Готовы к контакту" value={summary.ready} tone="accent" />
        <Metric label="Средний fit score" value={`${summary.avgFit}%`} tone={getScoreTone(summary.avgFit)} />
        <Metric label="Есть контакты" value={summary.contacts} tone="success" />
      </section>

      {selectedLead && selectedOutreach && (
        <section className="analytics-outreach-cockpit analytics-surface">
          <div className="analytics-outreach-lead">
            <p className="analytics-kicker">Площадка</p>
            <h2>{selectedLead.name}</h2>
            <a href={selectedLead.url} target="_blank" rel="noreferrer">{selectedLead.url}</a>
            <div className="analytics-outreach-meta">
              <span>{selectedLead.country}</span>
              <span>{selectedLead.category}</span>
              <span>Fit {selectedLead.fitScore}%</span>
            </div>
            <textarea
              value={selectedLead.contacts}
              onChange={(event) => updateLead(selectedLead.id, { contacts: event.target.value })}
              rows="4"
            />
          </div>

          <div className="analytics-outreach-agent">
            <div className="analytics-outreach-agent-head">
              <div>
                <p className="analytics-kicker">Superflow Systems</p>
                <h2>Написать и договориться</h2>
              </div>
              <select value={selectedOutreach.status} onChange={(event) => appendOutreachHistory(selectedLead.id, `Статус изменён: ${event.target.value}`, { status: event.target.value })}>
                {OUTREACH_STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>

            <div className="analytics-outreach-fields">
              <label>
                Email
                <input value={selectedOutreach.email} onChange={(event) => updateOutreach(selectedLead.id, { email: event.target.value })} placeholder="ads@example.com" />
              </label>
              <label>
                Telegram
                <input value={selectedOutreach.telegram} onChange={(event) => updateOutreach(selectedLead.id, { telegram: event.target.value })} placeholder="@manager" />
              </label>
              <label>
                Цена
                <input value={selectedOutreach.price} onChange={(event) => updateOutreach(selectedLead.id, { price: event.target.value, status: event.target.value ? "Цена получена" : selectedOutreach.status })} placeholder="$ / week, $ / month" />
              </label>
              <label>
                Follow-up
                <input type="date" value={selectedOutreach.followUpAt} onChange={(event) => updateOutreach(selectedLead.id, { followUpAt: event.target.value })} />
              </label>
            </div>

            <label className="analytics-outreach-subject">
              Тема email
              <input value={selectedOutreach.subject} onChange={(event) => updateOutreach(selectedLead.id, { subject: event.target.value })} placeholder="Advertising placement request..." />
            </label>

            <label className="analytics-outreach-draft">
              Черновик агента
              <textarea value={selectedOutreach.draft} onChange={(event) => updateOutreach(selectedLead.id, { draft: event.target.value, status: selectedOutreach.status === "Найден" ? "Черновик" : selectedOutreach.status })} rows="12" />
            </label>

            <div className="analytics-outreach-actions">
              <button type="button" onClick={() => createDraft(selectedLead)}>Создать черновик</button>
              <button type="button" onClick={() => sendEmail(selectedLead, selectedOutreach)}>
                {selectedOutreach.sendState === "sending" ? "Отправляю..." : "Отправить email"}
              </button>
              <button type="button" onClick={() => copyTelegramDraft(selectedLead, selectedOutreach)}>Скопировать Telegram</button>
              <a className={!selectedOutreach.telegram ? "is-disabled" : ""} href={makeTelegramUrl(selectedOutreach.telegram, selectedOutreach.draft)} target="_blank" rel="noreferrer">Открыть Telegram</a>
            </div>

            <div className="analytics-outreach-notes">
              <label>
                Условия размещения
                <textarea value={selectedOutreach.conditions} onChange={(event) => updateOutreach(selectedLead.id, { conditions: event.target.value })} rows="3" />
              </label>
              <label>
                Ответ / заметки
                <textarea value={selectedOutreach.responseNotes} onChange={(event) => updateOutreach(selectedLead.id, { responseNotes: event.target.value, status: event.target.value ? "Ответили" : selectedOutreach.status })} rows="3" />
              </label>
              <label>
                Следующий шаг
                <input value={selectedOutreach.nextStep} onChange={(event) => updateOutreach(selectedLead.id, { nextStep: event.target.value })} />
              </label>
            </div>

            <div className="analytics-outreach-history">
              <strong>История</strong>
              {(selectedOutreach.history.length ? selectedOutreach.history : [{ id: "empty", text: "Пока действий нет", createdAt: "" }]).slice(0, 5).map((item) => (
                <p key={item.id}>{item.createdAt ? new Date(item.createdAt).toLocaleString("ru-RU") : ""} {item.text}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <h2>Найденные площадки</h2>
            <p>{filteredLeads.length} строк в текущем фильтре</p>
          </div>
          <div>
            <button type="button" onClick={addManualLead}>Добавить вручную</button>
            <button type="button" onClick={() => downloadLeadsCsv(filteredLeads)}>Экспорт CSV</button>
          </div>
        </div>
        <div className="analytics-parser-controls analytics-parser-controls-compact">
          <label>
            Страна
            <select value={country} onChange={(event) => setCountry(event.target.value)}>
              {COUNTRY_OPTIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Лид
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Переговоры
            <select value={pipelineStatus} onChange={(event) => setPipelineStatus(event.target.value)}>
              {["Все этапы", ...OUTREACH_STATUS_OPTIONS].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Поиск
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="название, страна, контакт..." />
          </label>
        </div>
        <div className="analytics-parser-table-scroll">
          <table className="analytics-table analytics-parser-table">
            <thead>
              <tr>
                <th>Площадка</th>
                <th>Страна</th>
                <th>Контакты</th>
                <th>Скоринг</th>
                <th>Outreach</th>
                <th>Лид</th>
                <th>Заметки</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const record = getOutreachRecord(lead, outreach);
                return (
                <tr key={lead.id} className={selectedLead?.id === lead.id ? "analytics-parser-row-active" : ""}>
                  <td>
                    <input value={lead.name} onChange={(event) => updateLead(lead.id, { name: event.target.value })} />
                    <input value={lead.url} onChange={(event) => updateLead(lead.id, { url: event.target.value })} />
                    <small>{lead.category} · {lead.lastSeen}</small>
                  </td>
                  <td>
                    <select value={lead.country} onChange={(event) => updateLead(lead.id, { country: event.target.value })}>
                      {COUNTRY_OPTIONS.filter((item) => item !== "Все страны").map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </td>
                  <td>
                    <textarea value={lead.contacts} onChange={(event) => updateLead(lead.id, { contacts: event.target.value })} rows="3" />
                  </td>
                  <td>
                    <Score label="Traffic" value={lead.trafficScore} />
                    <Score label="Alive" value={lead.aliveScore} />
                    <Score label="Fit" value={lead.fitScore} />
                  </td>
                  <td>
                    <select className={`analytics-parser-status analytics-parser-status-${getStatusTone(record.status)}`} value={record.status} onChange={(event) => appendOutreachHistory(lead.id, `Статус изменён: ${event.target.value}`, { status: event.target.value })}>
                      {OUTREACH_STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                    <button type="button" className="analytics-parser-mini-button" onClick={() => { setSelectedLeadId(lead.id); createDraft(lead); }}>Черновик</button>
                    <button type="button" className="analytics-parser-mini-button" onClick={() => setSelectedLeadId(lead.id)}>Открыть</button>
                  </td>
                  <td>
                    <select className={`analytics-parser-status analytics-parser-status-${getStatusTone(lead.status)}`} value={lead.status} onChange={(event) => updateLead(lead.id, { status: event.target.value })}>
                      {STATUS_OPTIONS.filter((item) => item !== "Все статусы").map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </td>
                  <td>
                    <textarea value={lead.notes} onChange={(event) => updateLead(lead.id, { notes: event.target.value })} rows="4" />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </WrapperShell>
  );
}

function WrapperShell({ children }) {
  return <section className="analytics-parser">{children}</section>;
}

function Metric({ label, value, tone }) {
  return (
    <article className={`analytics-parser-stat analytics-parser-stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Score({ label, value }) {
  return (
    <div className="analytics-parser-score">
      <span>{label}</span>
      <progress value={value} max="100" />
      <b>{value}</b>
    </div>
  );
}
