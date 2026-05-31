import { useEffect, useMemo, useRef, useState } from "react";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const SOCIAL_SUBSCRIPTIONS_STORAGE_KEY = "atlas.analytics.socialSubscriptions.v1";

const PLATFORM_OPTIONS = ["X", "Instagram"];
const CATEGORY_OPTIONS = ["Web3 инфраструктура", "Блокчейны и экосистемы", "DAO и governance", "Крипто-медиа", "Аналитика", "Основатели и лидеры мнений", "MLM и community building", "Бизнес и маркетинг", "Азия: поиск лидеров"];
const STATUS_OPTIONS = ["Не подписались", "Подписались", "Проверить", "Не подходит"];
const PRIORITY_OPTIONS = ["Обязательно", "Высокий", "Средний", "Низкий"];

const defaultSubscriptions = [
  { id: "x-ethereum", platform: "X", category: "Web3 инфраструктура", name: "Ethereum Foundation", handle: "@ethereum", url: "https://x.com/ethereum", priority: "Обязательно", status: "Не подписались", notes: "Базовый сигнал: Atlas рядом с Ethereum/Web3, а не с хайп-проектами." },
  { id: "x-bnbchain", platform: "X", category: "Блокчейны и экосистемы", name: "BNB Chain", handle: "@BNBCHAIN", url: "https://x.com/BNBCHAIN", priority: "Обязательно", status: "Не подписались", notes: "Сильная экосистема для аудитории smart contract и массового Web3." },
  { id: "x-polygon", platform: "X", category: "Блокчейны и экосистемы", name: "Polygon", handle: "@0xPolygon", url: "https://x.com/0xPolygon", priority: "Высокий", status: "Не подписались", notes: "Инфраструктурный бренд, хорошо смотрится в подписках." },
  { id: "x-arbitrum", platform: "X", category: "Блокчейны и экосистемы", name: "Arbitrum", handle: "@arbitrum", url: "https://x.com/arbitrum", priority: "Высокий", status: "Не подписались", notes: "L2-экосистема, полезна для Web3-позиционирования." },
  { id: "x-optimism", platform: "X", category: "Блокчейны и экосистемы", name: "Optimism", handle: "@Optimism", url: "https://x.com/Optimism", priority: "Высокий", status: "Не подписались", notes: "Подписка усиливает образ проекта, который понимает L2 и governance." },
  { id: "x-chainlink", platform: "X", category: "Web3 инфраструктура", name: "Chainlink", handle: "@chainlink", url: "https://x.com/chainlink", priority: "Обязательно", status: "Не подписались", notes: "Оракулы и инфраструктура. Хорошая обязательная подписка." },
  { id: "x-thegraph", platform: "X", category: "Web3 инфраструктура", name: "The Graph", handle: "@graphprotocol", url: "https://x.com/graphprotocol", priority: "Высокий", status: "Не подписались", notes: "Индексирование данных, аналитический Web3-сигнал." },
  { id: "x-defillama", platform: "X", category: "Web3 инфраструктура", name: "DefiLlama", handle: "@DefiLlama", url: "https://x.com/DefiLlama", priority: "Обязательно", status: "Не подписались", notes: "DeFi-аналитика и прозрачность." },
  { id: "x-dune", platform: "X", category: "Web3 инфраструктура", name: "Dune", handle: "@Dune", url: "https://x.com/Dune", priority: "Высокий", status: "Не подписались", notes: "Данные, dashboard culture, аналитика on-chain." },
  { id: "x-messari", platform: "X", category: "Крипто-медиа", name: "Messari", handle: "@MessariCrypto", url: "https://x.com/MessariCrypto", priority: "Высокий", status: "Не подписались", notes: "Исследования и институциональный крипто-тон." },
  { id: "x-tokenterminal", platform: "X", category: "Web3 инфраструктура", name: "Token Terminal", handle: "@tokenterminal", url: "https://x.com/tokenterminal", priority: "Высокий", status: "Не подписались", notes: "Финансовая аналитика протоколов." },
  { id: "x-nansen", platform: "X", category: "Web3 инфраструктура", name: "Nansen", handle: "@nansen_ai", url: "https://x.com/nansen_ai", priority: "Высокий", status: "Не подписались", notes: "On-chain intelligence и умная аналитика." },
  { id: "x-alchemy", platform: "X", category: "Web3 инфраструктура", name: "Alchemy", handle: "@AlchemyPlatform", url: "https://x.com/AlchemyPlatform", priority: "Средний", status: "Не подписались", notes: "Developer-инфраструктура." },
  { id: "x-infura", platform: "X", category: "Web3 инфраструктура", name: "Infura", handle: "@infura_io", url: "https://x.com/infura_io", priority: "Средний", status: "Не подписались", notes: "RPC/инфраструктура, хорошо для технической рамки." },
  { id: "x-thirdweb", platform: "X", category: "Web3 инфраструктура", name: "thirdweb", handle: "@thirdweb", url: "https://x.com/thirdweb", priority: "Средний", status: "Не подписались", notes: "Web3 developer stack." },
  { id: "x-gitcoin", platform: "X", category: "DAO и governance", name: "Gitcoin", handle: "@gitcoin", url: "https://x.com/gitcoin", priority: "Средний", status: "Не подписались", notes: "Grants, public goods, community funding." },
  { id: "x-aragon", platform: "X", category: "DAO и governance", name: "Aragon", handle: "@AragonProject", url: "https://x.com/AragonProject", priority: "Обязательно", status: "Не подписались", notes: "DAO tooling. Важно для DAO-inspired mechanics." },
  { id: "x-snapshot", platform: "X", category: "DAO и governance", name: "Snapshot", handle: "@SnapshotLabs", url: "https://x.com/SnapshotLabs", priority: "Обязательно", status: "Не подписались", notes: "Голосования и governance без лишних обещаний полного DAO." },
  { id: "x-tally", platform: "X", category: "DAO и governance", name: "Tally", handle: "@tallyxyz", url: "https://x.com/tallyxyz", priority: "Высокий", status: "Не подписались", notes: "Governance-интерфейсы и делегирование." },
  { id: "x-makerdao", platform: "X", category: "DAO и governance", name: "MakerDAO / Sky", handle: "@SkyEcosystem", url: "https://x.com/SkyEcosystem", priority: "Средний", status: "Проверить", notes: "Проверить актуальный официальный аккаунт после ребрендинга." },
  { id: "x-aave", platform: "X", category: "DAO и governance", name: "Aave", handle: "@AaveAave", url: "https://x.com/AaveAave", priority: "Высокий", status: "Не подписались", notes: "DeFi + governance. Входит в первые 20-30 подписок." },
  { id: "x-uniswap", platform: "X", category: "DAO и governance", name: "Uniswap Labs", handle: "@Uniswap", url: "https://x.com/Uniswap", priority: "Высокий", status: "Не подписались", notes: "Один из главных governance/DeFi брендов." },
  { id: "x-ens", platform: "X", category: "DAO и governance", name: "ENS", handle: "@ensdomains", url: "https://x.com/ensdomains", priority: "Средний", status: "Не подписались", notes: "DAO и identity-слой." },
  { id: "x-banklessdao", platform: "X", category: "DAO и governance", name: "BanklessDAO", handle: "@BanklessDAO", url: "https://x.com/BanklessDAO", priority: "Высокий", status: "Не подписались", notes: "DAO/community пример. Входит в первые 20-30 подписок." },
  { id: "x-coindesk", platform: "X", category: "Крипто-медиа", name: "CoinDesk", handle: "@CoinDesk", url: "https://x.com/CoinDesk", priority: "Обязательно", status: "Не подписались", notes: "Крупное крипто-медиа." },
  { id: "x-cointelegraph", platform: "X", category: "Крипто-медиа", name: "Cointelegraph", handle: "@Cointelegraph", url: "https://x.com/Cointelegraph", priority: "Обязательно", status: "Не подписались", notes: "Массовое крипто-медиа." },
  { id: "x-decrypt", platform: "X", category: "Крипто-медиа", name: "Decrypt", handle: "@decryptmedia", url: "https://x.com/decryptmedia", priority: "Высокий", status: "Не подписались", notes: "Понятная подача Web3 для широкой аудитории." },
  { id: "x-theblock", platform: "X", category: "Крипто-медиа", name: "The Block", handle: "@TheBlock__", url: "https://x.com/TheBlock__", priority: "Высокий", status: "Не подписались", notes: "Новости и исследования." },
  { id: "x-bankless", platform: "X", category: "Крипто-медиа", name: "Bankless", handle: "@BanklessHQ", url: "https://x.com/BanklessHQ", priority: "Высокий", status: "Не подписались", notes: "Web3 education и медийный DAO-контекст." },
  { id: "x-blockworks", platform: "X", category: "Крипто-медиа", name: "Blockworks", handle: "@Blockworks_", url: "https://x.com/Blockworks_", priority: "Средний", status: "Не подписались", notes: "Бизнесовый тон крипто-медиа." },
  { id: "x-coinmarketcap", platform: "X", category: "Аналитика", name: "CoinMarketCap", handle: "@CoinMarketCap", url: "https://x.com/CoinMarketCap", priority: "Высокий", status: "Не подписались", notes: "Следующая волна 20-30: аналитика рынка и массовый crypto reference." },
  { id: "x-coingecko", platform: "X", category: "Аналитика", name: "CoinGecko", handle: "@coingecko", url: "https://x.com/coingecko", priority: "Высокий", status: "Не подписались", notes: "Следующая волна 20-30: рыночные данные и крипто-аналитика." },
  { id: "x-vitalik", platform: "X", category: "Основатели и лидеры мнений", name: "Vitalik Buterin", handle: "@VitalikButerin", url: "https://x.com/VitalikButerin", priority: "Обязательно", status: "Не подписались", notes: "Главный Web3-сигнал. Не комментировать агрессивно, просто следить." },
  { id: "x-cz", platform: "X", category: "Основатели и лидеры мнений", name: "Changpeng Zhao", handle: "@cz_binance", url: "https://x.com/cz_binance", priority: "Высокий", status: "Не подписались", notes: "Большая международная крипто-аудитория." },
  { id: "x-raoul", platform: "X", category: "Основатели и лидеры мнений", name: "Raoul Pal", handle: "@RaoulGMI", url: "https://x.com/RaoulGMI", priority: "Средний", status: "Не подписались", notes: "Макро + crypto adoption." },
  { id: "x-pomp", platform: "X", category: "Основатели и лидеры мнений", name: "Anthony Pompliano", handle: "@APompliano", url: "https://x.com/APompliano", priority: "Средний", status: "Не подписались", notes: "Медиа и бизнес-крипто аудитория." },
  { id: "x-arthur", platform: "X", category: "Основатели и лидеры мнений", name: "Arthur Hayes", handle: "@CryptoHayes", url: "https://x.com/CryptoHayes", priority: "Средний", status: "Не подписались", notes: "Сильный crypto opinion leader, но тон контента проверять." },
  { id: "x-cobie", platform: "X", category: "Основатели и лидеры мнений", name: "Cobie", handle: "@cobie", url: "https://x.com/cobie", priority: "Средний", status: "Не подписались", notes: "Следующая волна 20-30. Следить за тоном, не использовать как официальный ориентир." },
  { id: "x-ryan-adams", platform: "X", category: "Основатели и лидеры мнений", name: "Ryan Sean Adams", handle: "@RyanSAdams", url: "https://x.com/RyanSAdams", priority: "Средний", status: "Не подписались", notes: "Bankless / Ethereum аудитория." },
  { id: "x-david-hoffman", platform: "X", category: "Основатели и лидеры мнений", name: "David Hoffman", handle: "@TrustlessState", url: "https://x.com/TrustlessState", priority: "Средний", status: "Не подписались", notes: "Bankless / Ethereum контекст." },
  { id: "x-chris-burniske", platform: "X", category: "Основатели и лидеры мнений", name: "Chris Burniske", handle: "@cburniske", url: "https://x.com/cburniske", priority: "Средний", status: "Не подписались", notes: "Crypto investment thesis и market cycles." },
  { id: "x-santiago", platform: "X", category: "Основатели и лидеры мнений", name: "Santiago Santos", handle: "@Santiagoroel", url: "https://x.com/Santiagoroel", priority: "Средний", status: "Не подписались", notes: "Web3 investing / market commentary." },
  { id: "x-ericworre", platform: "X", category: "MLM и community building", name: "Eric Worre", handle: "@EricWorre", url: "https://x.com/EricWorre", priority: "Средний", status: "Не подписались", notes: "Community building. Держать долю MLM ниже Web3." },
  { id: "x-rayhigdon", platform: "X", category: "MLM и community building", name: "Ray Higdon", handle: "@rayhigdon", url: "https://x.com/rayhigdon", priority: "Средний", status: "Не подписались", notes: "Продажи и комьюнити, но не делать профиль слишком MLM." },
  { id: "x-frazer", platform: "X", category: "MLM и community building", name: "Frazer Brookes", handle: "@FrazerBrookes", url: "https://x.com/FrazerBrookes", priority: "Низкий", status: "Проверить", notes: "Проверить актуальность активности в X." },
  { id: "x-randy-gage", platform: "X", category: "MLM и community building", name: "Randy Gage", handle: "@Randy_Gage", url: "https://x.com/Randy_Gage", priority: "Низкий", status: "Проверить", notes: "Держать блок небольшим, чтобы Atlas не выглядел MLM-first." },
  { id: "x-todd-falcone", platform: "X", category: "MLM и community building", name: "Todd Falcone", handle: "@ToddFalcone", url: "https://x.com/ToddFalcone", priority: "Низкий", status: "Проверить", notes: "Только если тон аккаунта подходит международному бренду." },
  { id: "x-rob-sperry", platform: "X", category: "MLM и community building", name: "Rob Sperry", handle: "@RobJSperry", url: "https://x.com/RobJSperry", priority: "Низкий", status: "Проверить", notes: "Community building, но не больше 5% первых подписок." },
  { id: "x-coindcx", platform: "X", category: "Азия: поиск лидеров", name: "CoinDCX", handle: "@CoinDCX", url: "https://x.com/CoinDCX", priority: "Средний", status: "Проверить", notes: "Индия. Потенциальный ориентир для локальных лидеров и рынка." },
  { id: "x-coinswitch", platform: "X", category: "Азия: поиск лидеров", name: "CoinSwitch", handle: "@CoinSwitch", url: "https://x.com/CoinSwitch", priority: "Средний", status: "Проверить", notes: "Индия. Проверить активность и тон." },
  { id: "x-polygon-sandeep", platform: "X", category: "Азия: поиск лидеров", name: "Sandeep Nailwal", handle: "@sandeepnailwal", url: "https://x.com/sandeepnailwal", priority: "Средний", status: "Проверить", notes: "Polygon founder. Индия / Web3 leadership." },
  { id: "x-coin98", platform: "X", category: "Азия: поиск лидеров", name: "Coin98", handle: "@coin98_wallet", url: "https://x.com/coin98_wallet", priority: "Средний", status: "Проверить", notes: "Вьетнам / DeFi wallet ecosystem." },
  { id: "x-ninety-eight", platform: "X", category: "Азия: поиск лидеров", name: "Ninety Eight", handle: "@ninetyeight_hq", url: "https://x.com/ninetyeight_hq", priority: "Средний", status: "Проверить", notes: "Вьетнам. Проверить актуальный аккаунт и партнёрские связи." },
  { id: "x-kyros", platform: "X", category: "Азия: поиск лидеров", name: "Kyros Ventures", handle: "@KyrosVentures", url: "https://x.com/KyrosVentures", priority: "Низкий", status: "Проверить", notes: "Вьетнам. Watchlist для будущего outreach." },
  { id: "x-hashed", platform: "X", category: "Азия: поиск лидеров", name: "Hashed", handle: "@hashed_official", url: "https://x.com/hashed_official", priority: "Средний", status: "Проверить", notes: "Южная Корея. Фонд и Web3-экосистема." },
  { id: "x-kryptoseoul", platform: "X", category: "Азия: поиск лидеров", name: "KryptoSeoul", handle: "@KryptoSeoul", url: "https://x.com/KryptoSeoul", priority: "Низкий", status: "Проверить", notes: "Южная Корея. Community / event ecosystem." },
  { id: "x-astar", platform: "X", category: "Азия: поиск лидеров", name: "Astar Network", handle: "@AstarNetwork", url: "https://x.com/AstarNetwork", priority: "Средний", status: "Проверить", notes: "Япония. Экосистемный Web3 бренд." },
  { id: "x-startale", platform: "X", category: "Азия: поиск лидеров", name: "Startale", handle: "@StartaleGroup", url: "https://x.com/StartaleGroup", priority: "Средний", status: "Проверить", notes: "Япония. Проверить актуальный официальный аккаунт." },
  { id: "ig-ethereum", platform: "Instagram", category: "Web3 инфраструктура", name: "Ethereum Foundation", handle: "@ethereum", url: "https://www.instagram.com/ethereum/", priority: "Высокий", status: "Не подписались", notes: "Instagram использовать как внешний социальный сигнал, не основной источник Web3." },
  { id: "ig-bnbchain", platform: "Instagram", category: "Блокчейны и экосистемы", name: "BNB Chain", handle: "@bnbchain", url: "https://www.instagram.com/bnbchain/", priority: "Высокий", status: "Не подписались", notes: "Хорошо для массовой крипто-аудитории." },
  { id: "ig-polygon", platform: "Instagram", category: "Блокчейны и экосистемы", name: "Polygon", handle: "@0xpolygon", url: "https://www.instagram.com/0xpolygon/", priority: "Средний", status: "Не подписались", notes: "Проверить актуальное оформление аккаунта." },
  { id: "ig-chainlink", platform: "Instagram", category: "Web3 инфраструктура", name: "Chainlink", handle: "@chainlinkofficial", url: "https://www.instagram.com/chainlinkofficial/", priority: "Средний", status: "Не подписались", notes: "Инфраструктурный бренд." },
  { id: "ig-coindesk", platform: "Instagram", category: "Крипто-медиа", name: "CoinDesk", handle: "@coindesk", url: "https://www.instagram.com/coindesk/", priority: "Высокий", status: "Не подписались", notes: "Медиа-подписка для крипто-контекста." },
  { id: "ig-cointelegraph", platform: "Instagram", category: "Крипто-медиа", name: "Cointelegraph", handle: "@cointelegraph", url: "https://www.instagram.com/cointelegraph/", priority: "Высокий", status: "Не подписались", notes: "Массовая крипто-повестка." },
  { id: "ig-bankless", platform: "Instagram", category: "Крипто-медиа", name: "Bankless", handle: "@banklesshq", url: "https://www.instagram.com/banklesshq/", priority: "Средний", status: "Не подписались", notes: "Web3 education." },
  { id: "ig-ericworre", platform: "Instagram", category: "MLM и community building", name: "Eric Worre", handle: "@ericworre", url: "https://www.instagram.com/ericworre/", priority: "Средний", status: "Не подписались", notes: "Community building. Не перегружать MLM-подписками." },
  { id: "ig-rayhigdon", platform: "Instagram", category: "MLM и community building", name: "Ray Higdon", handle: "@rayhigdon", url: "https://www.instagram.com/rayhigdon/", priority: "Средний", status: "Не подписались", notes: "Маркетинг и продажи." },
  { id: "ig-frazer", platform: "Instagram", category: "MLM и community building", name: "Frazer Brookes", handle: "@frazerbrookes", url: "https://www.instagram.com/frazerbrookes/", priority: "Низкий", status: "Проверить", notes: "Проверить, подходит ли тон Atlas." },
];

function normalizeSubscription(item = {}) {
  return {
    id: item.id || `social-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    platform: PLATFORM_OPTIONS.includes(item.platform) ? item.platform : "X",
    category: CATEGORY_OPTIONS.includes(item.category) ? item.category : "Web3 инфраструктура",
    name: item.name || "",
    handle: item.handle || "",
    url: item.url || "",
    priority: PRIORITY_OPTIONS.includes(item.priority) ? item.priority : "Средний",
    status: STATUS_OPTIONS.includes(item.status) ? item.status : "Не подписались",
    notes: item.notes || "",
    updatedAt: item.updatedAt || "",
  };
}

function normalizeSubscriptions(items) {
  return Array.isArray(items) ? items.map(normalizeSubscription) : defaultSubscriptions;
}

function getTone(status) {
  if (status === "Подписались") return "success";
  if (status === "Проверить") return "work";
  if (status === "Не подходит") return "muted";
  return "idea";
}

function getHostLabel(url) {
  if (!url) return "ссылка не добавлена";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SocialSubscriptionsBoard() {
  const [items, setItems] = useState(defaultSubscriptions);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Сохранено");
  const [platformFilter, setPlatformFilter] = useState("Все");
  const [categoryFilter, setCategoryFilter] = useState("Все");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [query, setQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    platform: "X",
    category: "Web3 инфраструктура",
    name: "",
    handle: "",
    url: "",
    priority: "Средний",
    status: "Не подписались",
    notes: "",
  });
  const saveRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    loadServerContent(SOCIAL_SUBSCRIPTIONS_STORAGE_KEY).then((savedItems) => {
      if (!isMounted) return;
      const normalizedItems = normalizeSubscriptions(savedItems);
      setItems(normalizedItems.length ? normalizedItems : defaultSubscriptions);
      setIsLoaded(true);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    const timer = window.setTimeout(() => {
      const requestId = saveRef.current + 1;
      saveRef.current = requestId;
      const normalizedItems = normalizeSubscriptions(items);
      setSaveState("Сохраняю...");
      saveServerContent(SOCIAL_SUBSCRIPTIONS_STORAGE_KEY, normalizedItems).then((ok) => {
        if (saveRef.current !== requestId) return;
        setSaveState(ok ? "Сохранено на сервере" : "Ошибка сохранения");
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [items, isLoaded]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      if (platformFilter !== "Все" && item.platform !== platformFilter) return false;
      if (categoryFilter !== "Все" && item.category !== categoryFilter) return false;
      if (statusFilter !== "Все" && item.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      return [item.name, item.handle, item.url, item.notes].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
    });
  }, [categoryFilter, items, platformFilter, query, statusFilter]);

  const stats = useMemo(() => {
    const subscribed = items.filter((item) => item.status === "Подписались").length;
    const xCount = items.filter((item) => item.platform === "X").length;
    const instagramCount = items.filter((item) => item.platform === "Instagram").length;
    const requiredLeft = items.filter((item) => item.priority === "Обязательно" && item.status !== "Подписались").length;
    return [
      ["Всего", items.length],
      ["X", xCount],
      ["Instagram", instagramCount],
      ["Подписались", subscribed],
      ["Обязательных осталось", requiredLeft],
    ];
  }, [items]);

  function updateItem(itemId, patch) {
    setItems((current) => current.map((item) => (item.id === itemId ? normalizeSubscription({ ...item, ...patch, updatedAt: new Date().toISOString() }) : item)));
  }

  function addItem() {
    const name = newItem.name.trim();
    if (!name) return;
    setItems((current) => [
      normalizeSubscription({
        ...newItem,
        id: `social-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        updatedAt: new Date().toISOString(),
      }),
      ...current,
    ]);
    setNewItem({ platform: "X", category: "Web3 инфраструктура", name: "", handle: "", url: "", priority: "Средний", status: "Не подписались", notes: "" });
    setIsAddOpen(false);
  }

  function deleteItem(itemId) {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  return (
    <section className="analytics-social">
      <div className="analytics-developments-hero analytics-surface">
        <div>
          <span className="analytics-kicker">Social brand map</span>
          <h2>Первые подписки Atlas в X и Instagram</h2>
          <p>
            Список нужен для пустых официальных каналов Atlas: сначала формируем образ международного Web3-проекта,
            потом аккуратно добавляем community building и маркетинг. YouTube лучше вести отдельным списком для контент-аналитики.
          </p>
        </div>
        <div className="analytics-developments-save">{saveState}</div>
      </div>

      <div className="analytics-developments-stats analytics-social-stats">
        {stats.map(([label, value]) => (
          <div key={label} className="analytics-developments-stat">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="analytics-social-strategy analytics-surface">
        <div>
          <strong>Рекомендуемая пропорция первых подписок</strong>
          <span>60% Web3 / 20% DAO / 10% медиа / 10% MLM и маркетинг</span>
        </div>
        <div>
          <strong>Правило бренда</strong>
          <span>Сначала инфраструктура, блокчейны и governance. MLM-лидеров добавлять дозировано, чтобы Atlas не выглядел как сетевой проект.</span>
        </div>
      </div>

      <div className="analytics-developments-toolbar analytics-surface analytics-social-toolbar">
        <button type="button" className="analytics-action-button analytics-action-button-primary" onClick={() => setIsAddOpen((current) => !current)}>
          {isAddOpen ? "Свернуть" : "+ Добавить аккаунт"}
        </button>
        <select className="analytics-launch-status-select" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}>
          {["Все", ...PLATFORM_OPTIONS].map((option) => <option key={option}>{option}</option>)}
        </select>
        <select className="analytics-launch-status-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          {["Все", ...CATEGORY_OPTIONS].map((option) => <option key={option}>{option}</option>)}
        </select>
        <select className="analytics-launch-status-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          {["Все", ...STATUS_OPTIONS].map((option) => <option key={option}>{option}</option>)}
        </select>
        <input className="analytics-launch-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по имени, нику, заметке" />
      </div>

      {isAddOpen ? (
        <div className="analytics-developments-form analytics-surface">
          <input className="analytics-launch-input" value={newItem.name} onChange={(event) => setNewItem((current) => ({ ...current, name: event.target.value }))} placeholder="Название аккаунта" />
          <input className="analytics-launch-input" value={newItem.handle} onChange={(event) => setNewItem((current) => ({ ...current, handle: event.target.value }))} placeholder="@handle" />
          <input className="analytics-launch-input" value={newItem.url} onChange={(event) => setNewItem((current) => ({ ...current, url: event.target.value }))} placeholder="https://..." />
          <select className="analytics-launch-status-select" value={newItem.platform} onChange={(event) => setNewItem((current) => ({ ...current, platform: event.target.value }))}>
            {PLATFORM_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select className="analytics-launch-status-select" value={newItem.category} onChange={(event) => setNewItem((current) => ({ ...current, category: event.target.value }))}>
            {CATEGORY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select className="analytics-launch-status-select" value={newItem.priority} onChange={(event) => setNewItem((current) => ({ ...current, priority: event.target.value }))}>
            {PRIORITY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
          <textarea className="analytics-launch-input" value={newItem.notes} onChange={(event) => setNewItem((current) => ({ ...current, notes: event.target.value }))} placeholder="Зачем подписываться / что проверить" />
          <button type="button" className="analytics-action-button analytics-action-button-success" onClick={addItem}>Сохранить аккаунт</button>
        </div>
      ) : null}

      <div className="analytics-social-list">
        {filteredItems.map((item) => (
          <article key={item.id} className="analytics-social-card analytics-surface">
            <div className="analytics-social-card-head">
              <div>
                <div className="analytics-social-badges">
                  <span>{item.platform}</span>
                  <span>{item.category}</span>
                  <span>{item.priority}</span>
                </div>
                <input className="analytics-developments-title" value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} placeholder="Название" />
              </div>
              <select className={`analytics-developments-status analytics-developments-status-${getTone(item.status)}`} value={item.status} onChange={(event) => updateItem(item.id, { status: event.target.value })}>
                {STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>

            <div className="analytics-developments-links">
              <label>
                <span>Ник</span>
                <input className="analytics-launch-input" value={item.handle} onChange={(event) => updateItem(item.id, { handle: event.target.value })} placeholder="@handle" />
              </label>
              <label>
                <span>Ссылка</span>
                <input className="analytics-launch-input" value={item.url} onChange={(event) => updateItem(item.id, { url: event.target.value })} placeholder="https://..." />
              </label>
            </div>

            <div className="analytics-developments-meta">
              <label>
                <span>Платформа</span>
                <select className="analytics-launch-status-select" value={item.platform} onChange={(event) => updateItem(item.id, { platform: event.target.value })}>
                  {PLATFORM_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label>
                <span>Категория</span>
                <select className="analytics-launch-status-select" value={item.category} onChange={(event) => updateItem(item.id, { category: event.target.value })}>
                  {CATEGORY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            </div>

            <label className="analytics-developments-wide">
              <span>Комментарий</span>
              <textarea className="analytics-launch-input" value={item.notes} onChange={(event) => updateItem(item.id, { notes: event.target.value })} placeholder="Почему важно / что проверить" />
            </label>

            <div className="analytics-developments-card-foot">
              <span>{getHostLabel(item.url)}</span>
              <div>
                <button type="button" className="analytics-action-button analytics-action-button-sm analytics-action-button-success" onClick={() => updateItem(item.id, { status: "Подписались" })}>Подписались</button>
                {item.url ? <a className="analytics-action-button analytics-action-button-sm analytics-action-button-primary" href={item.url} target="_blank" rel="noreferrer">Открыть</a> : null}
                <button type="button" className="analytics-action-button analytics-action-button-sm analytics-action-button-danger" onClick={() => deleteItem(item.id)}>Удалить</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default SocialSubscriptionsBoard;
