import { platformSourceOverrides } from "./platformSourceSeeds.js";
import { youtubeChannelOverrides } from "./youtubeChannelSeeds.js";

export const SEGMENT_OUTREACH_STORAGE_KEY = "atlas.analytics.segmentOutreach.v10";

export const SEGMENT_OUTREACH_SOCIALS = [
  { id: "youtube", label: "YouTube" },
  { id: "telegram", label: "Telegram" },
  { id: "instagram", label: "Instagram" },
  { id: "x", label: "X" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "articles", label: "Новостные агрегаторы" },
];

export const SEGMENT_OUTREACH_SEGMENTS = [
  { id: "hyip", label: "HYIP", hint: "high-risk доходные проекты" },
  { id: "cryptoMlm", label: "Crypto MLM", hint: "партнёрки и структуры" },
  { id: "tokenPresale", label: "Token presale", hint: "ICO / IDO / launchpads" },
  { id: "copyTrading", label: "Copy trading", hint: "боты и сигналы" },
  { id: "defiYield", label: "DeFi yield", hint: "staking / farming" },
  { id: "mutualAid", label: "Mutual aid", hint: "кассы взаимопомощи" },
  { id: "affiliates", label: "CPA / affiliates", hint: "crypto traffic" },
];

export const SEGMENT_OUTREACH_COLUMNS = [
  "",
  "Источник",
  "Тип",
  "Ссылка / handle",
  "Контакт",
  "Регион / язык",
  "Почему подходит",
  "Как заходить",
  "Цена / формат",
  "Приоритет",
  "Статус",
  "Комментарий",
];


function normalizeYoutubeChannel(row, index) {
  const rowNumber = String(index + 1).padStart(3, "0");
  return {
    id: `segment-outreach-${row.segment}-youtube-channel-${rowNumber}`,
    segment: row.segment,
    social: "youtube",
    name: row.name,
    type: row.type || "YouTube channel",
    url: row.url,
    contact: row.contact || "YouTube About / business email / links in channel description",
    region: row.region || "Global / mixed",
    fit: row.fit || "Канал найден по YouTube-поиску для соответствующего сегмента.",
    route: row.route || "Открыть канал, проверить свежие видео и найти публичный контакт в About/описании.",
    price: row.price || "review / integration: запросить",
    priority: row.priority || "2. Следом",
    status: row.status || "Найти контакты",
    notes: row.notes || "Проверить вручную перед outreach.",
  };
}

function normalizePlatformSource(row, index) {
  const rowNumber = String(index + 1).padStart(3, "0");
  return {
    id: `segment-outreach-${row.segment}-${row.social}-source-${rowNumber}`,
    segment: row.segment,
    social: row.social,
    name: row.name,
    type: row.type,
    url: row.url,
    contact: row.contact || "Публичный контакт в профиле / на сайте",
    region: row.region || "Global / mixed",
    fit: row.fit || "Источник подходит для соответствующего сегмента Atlas.",
    route: row.route || "Проверить источник, найти контакт и запросить условия размещения.",
    price: row.price || "Запросить",
    priority: row.priority || "2. Следом",
    status: row.status || "Найти контакты",
    notes: row.notes || "Проверить вручную перед outreach.",
  };
}

function buildSegmentOutreachLeads() {
  const youtubeRows = youtubeChannelOverrides.map(normalizeYoutubeChannel);
  const platformRows = platformSourceOverrides.map(normalizePlatformSource);

  return [...youtubeRows, ...platformRows];
}

export const defaultSegmentOutreachLeads = buildSegmentOutreachLeads();
