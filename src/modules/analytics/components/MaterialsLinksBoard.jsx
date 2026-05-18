import { useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";

const MATERIALS_STORAGE_KEY = "atlas.analytics.materialLinks.v1";

const MATERIAL_CATEGORIES = [
  { id: "comments", title: "Комментарий" },
  { id: "site", title: "ТЗ САЙТ" },
  { id: "cabinet", title: "ТЗ Личный кабинет" },
  { id: "videos", title: "Ролики" },
  { id: "documents", title: "Документы" },
  { id: "research", title: "Идеи / Исследования" },
  { id: "marketing", title: "Маркетинг" },
];

const CATEGORY_ALIASES = {
  comments: ["комментарий", "комментарии", "наброски"],
  site: ["тз сайт", "сайт", "лендинг"],
  cabinet: ["тз личный кабинет", "личный кабинет", "кабинет"],
  videos: ["ролики", "ролик", "видео", "вебинар"],
  documents: ["документы", "документ", "юридические"],
  research: ["идеи / исследования", "идеи", "исследования", "исследование"],
  marketing: ["маркетинг", "реклама", "баннеры"],
};

const defaultMaterialItems = [
  {
    id: "comments-drafts",
    category: "comments",
    title: "Наброски",
    url: "https://docs.google.com/document/d/18otFKnexUp9jkS-hDhLwXjhZ7Cad08GjUWwiJSQP3bo/edit?usp=sharing",
  },
  {
    id: "comments-webinar",
    category: "comments",
    title: "Тезисы для вебинара",
    url: "https://docs.google.com/document/d/1lGy6MBhhatuosTq6XQamtNV0VrYyF3FtaAwomuE1gp8/edit?usp=sharing",
  },
  {
    id: "comments-research",
    category: "comments",
    title: "Исследование",
    url: "https://docs.google.com/document/d/1dIFccD1LLjDkVgNZAXBFI-LaAE_kxDm1Ng6KQRAdMpU/edit?usp=sharing",
  },
  {
    id: "comments-ideas",
    category: "comments",
    title: "ИДЕИ",
    url: "https://docs.google.com/document/d/1NXaNwHmElmrFGhgxJHhxrQ-dNMNloiO7oTkresqSMAA/edit?usp=sharing",
  },
  {
    id: "comments-benefits",
    category: "comments",
    title: "Преимущества",
    url: "https://docs.google.com/document/d/1eWz_d5jvEbVy9__gPIl6RQx80P1Sc3JT94c98bM6qNU/edit?usp=sharing",
  },
  {
    id: "comments-voting",
    category: "comments",
    title: "Описание Голосование",
    url: "https://docs.google.com/document/d/1B28OT9v6djEzBwYjYWTYQMU6m9KhWuq8YrR4WPOnFnQ/edit?usp=sharing",
  },
  {
    id: "comments-whitepaper",
    category: "comments",
    title: "whitepaper (вычитать)",
    url: "https://docs.google.com/document/d/1gQG8hH3RWINa5UZ4LeNVx5a9IqZ-c3l2gnk-HkBbTR0/edit?usp=sharing",
  },
  {
    id: "site-home",
    category: "site",
    title: "ТЗ Главная страница",
    url: "https://docs.google.com/document/d/1AfLyiGbdosYalYmYoBQovQzp0Pefmm3ZkSk3waLwb_s/edit?usp=sharing",
  },
  {
    id: "site-kb",
    category: "site",
    title: "База знаний",
    url: "https://docs.google.com/document/d/10dnXsMilqoX3yjo27Hg8XzWcemFyebjSa84qvVKBdzM/edit?usp=sharing",
  },
  {
    id: "site-slides",
    category: "site",
    title: "Слайды ТЗ - Презентация",
    url: "https://docs.google.com/document/d/1yFEWrQMatI7pet9iYDCn3nAnhrb3fOLzhRqEZcKPcPI/edit?usp=sharing",
  },
  {
    id: "site-products",
    category: "site",
    title: "Описание продуктов",
    url: "https://docs.google.com/document/d/1qBBsYHyFvDQc1-mls7dmNnAbBRHHNmL9QoY4wdaU3JM/edit?usp=sharing",
  },
  {
    id: "site-landing-1",
    category: "site",
    title: "Лендинг 1",
    url: "https://docs.google.com/document/d/1dEwiM7QbqosdF7UxVIo0Rxvw1tyfFauEFAsJO25gPZU/edit?usp=sharing",
  },
  {
    id: "site-landing-2",
    category: "site",
    title: "Лендинг 2 для криптанов",
    url: "https://docs.google.com/document/d/1_xZEvXqbZVMge6zGcBEcpIxFR-m3Mm5np76A-nxBWCw/edit?usp=sharing",
  },
  {
    id: "site-arbitrage",
    category: "site",
    title: "правила для Арбитражника",
    url: "https://docs.google.com/document/d/1Gp1dWmbIgjkV12Lh_0QFjLfExnr7utW2K4A0UQbzmSU/edit?usp=sharing",
  },
  {
    id: "cabinet-contract",
    category: "cabinet",
    title: "Для прогера по смарт контракту",
    url: "https://docs.google.com/document/d/1BAumo3My0Gi_x6OFDsDxNiN3kn_D3M5MvZh73RPINgQ/edit?usp=sharing",
  },
  {
    id: "cabinet-step",
    category: "cabinet",
    title: "Ступенька",
    url: "https://docs.google.com/spreadsheets/d/1FggplU9Ms7EEctfquATbPiduclz_PIkoI29jXWlVFVk/edit?usp=sharing",
  },
  {
    id: "cabinet-task",
    category: "cabinet",
    title: "ТЗ прогеру",
    url: "https://docs.google.com/document/d/10XTpQAJFdLWI1TxAdjP46JUhnlKWPbwRU0zqwjrbffY/edit?usp=sharing",
  },
  {
    id: "cabinet-task-v2",
    category: "cabinet",
    title: "ТЗ прогеру v.2",
    url: "https://docs.google.com/document/d/1v9ImdX0vf4qizm48lh2SFiUdSY1yrhKX29uPg8FLFMo/edit?usp=sharing",
  },
  {
    id: "cabinet-admin-stats",
    category: "cabinet",
    title: "Статистика админка",
    url: "https://docs.google.com/document/d/1nhYRMu6qu0CS3rfde_ehQRzKDcvMA_w9DxXNF8pF34o/edit?usp=sharing",
  },
  {
    id: "videos-main",
    category: "videos",
    title: "Ролик",
    url: "https://docs.google.com/document/d/1sE4p_KkHmkaGI3DggMmBOBJE1caZgIIL3zcyKZYgpsY/edit?usp=sharing",
  },
  {
    id: "videos-chris",
    category: "videos",
    title: "Обращение Криса",
    url: "https://docs.google.com/document/d/1wLyQV8oenCKoLPnw-QHgfUaY3Kc47oDE0t9M9l_TE4Y/edit?usp=sharing",
  },
  {
    id: "docs-list",
    category: "documents",
    title: "Список документов",
    url: "https://docs.google.com/document/d/14MtHGkcu2y3tPOkULu2tNHx1alwSOkytV62vpYSynyo/edit?usp=sharing",
  },
  {
    id: "docs-unity",
    category: "documents",
    title: "Описание Unity Pool",
    url: "https://docs.google.com/document/d/1NxWf_lBT9SygWtNGMI92IpFKAW09B26IetPweGr0Wrw/edit?usp=sharing",
  },
  {
    id: "docs-agreement",
    category: "documents",
    title: "Пользовательское соглашение",
    url: "https://docs.google.com/document/d/1jLX9CTiOx-apsHx4Fb7s74ApZudRgEkdcC5SiaacaDM/edit?usp=sharing",
  },
  {
    id: "docs-disclaimer",
    category: "documents",
    title: "Дисклеймер",
    url: "https://docs.google.com/document/d/1j0SCM4Cj_SRS12p7IiHSgqG2DoBnZGR8BlXYySElvxI/edit?usp=sharing",
  },
  {
    id: "docs-offer-policy",
    category: "documents",
    title: "Оферта / Политика участия",
    url: "https://docs.google.com/document/d/1fCHok8TB8tMmeTkFnmO2V2su9mljk7lrcA9Hux8HYh8/edit?usp=sharing",
  },
  {
    id: "docs-community-rules",
    category: "documents",
    title: "Правила комьюнити",
    url: "https://docs.google.com/document/d/1Z4d8OwUQYI7RQmxrdeXQVkTTW7h-BltjhfB2OIAfIcM/edit?usp=sharing",
  },
  {
    id: "docs-ai-training",
    category: "documents",
    title: "Для обучения ИИ",
    url: "https://docs.google.com/document/d/1M4rBZIa3-4vkAvNvDCGwk_ckQdIYzanYqhYCKr9tJJg/edit?usp=sharing",
  },
  {
    id: "research-mutual-aid",
    category: "research",
    title: "Кассы взаимопомощи",
    url: "https://drive.google.com/file/d/11ymCx1Jd9JEIXAOfOuZx9TppNs7zXGaa/view?usp=sharing",
  },
  {
    id: "research-web3-guide",
    category: "research",
    title: "Путеводитель по Web 3",
    url: "https://drive.google.com/file/d/1z1blndqq9Wzt8ujzSZd4wgSkKNq7MKfK/view?usp=sharing",
  },
  {
    id: "research-uat",
    category: "research",
    title: "Токен UAT",
    url: "https://docs.google.com/document/d/108zTTiTDMZG5cchR_3CefEL_gHRJyMIhRqaOlQWjaWQ/edit?usp=sharing",
  },
  {
    id: "research-article",
    category: "research",
    title: "Статья",
    url: "https://docs.google.com/document/d/1xRTu5a2unPLvY7fMxy29JRS76TCO2LQjv0sUenFDsuU/edit?usp=sharing",
  },
  {
    id: "research-linkedin",
    category: "research",
    title: "Инфа для учетки Linked In",
    url: "https://docs.google.com/document/d/17OtjUswMWUJSmhM3KRDDejroxibRdjzqsBQrJL3zR8o/edit?usp=sharing",
  },
  {
    id: "research-new-articles",
    category: "research",
    title: "Темы новых статей",
    url: "https://docs.google.com/document/d/14Xd3LzWUSy6U0cpPA_JQdd3sUQWkCGdN1ZcJgJfDEyA/edit?usp=sharing",
  },
  {
    id: "research-project-ads",
    category: "research",
    title: "Реклама проекта",
    url: "https://docs.google.com/document/d/1OLrkTQHhp-isj3rZlW_bdFpXJrS04VLv3-rk8HxXkaQ/edit?usp=sharing",
  },
  {
    id: "research-elite",
    category: "research",
    title: "Elite club",
    url: "https://docs.google.com/document/d/1HyOUhceHEt18GUFrfUaw04fS1n0Jec_qa1SbEO9V4k4/edit?usp=sharing",
  },
  {
    id: "research-arbitrage",
    category: "research",
    title: "Арбитражники Условия",
    url: "https://docs.google.com/document/d/1Ub605c7OAa81neP6fo_T3atDJ3wtFDhr9DxiOjj_v94/edit?usp=sharing",
  },
  {
    id: "research-landings",
    category: "research",
    title: "лендосы",
    url: "https://docs.google.com/document/d/14lTznz3mFu7HW94XmS-FHvw2mCzwNRbimV4WtNjmG-M/edit?usp=sharing",
  },
  {
    id: "research-raffles",
    category: "research",
    title: "Розыгрыши",
    url: "https://docs.google.com/document/d/14SSuMzP70BNVUyrlaVxcNGJM3xLvqTGx2WyTbh3LqoI/edit?usp=sharing",
  },
  {
    id: "research-arbitrage-cabinet",
    category: "research",
    title: "ТЗ кабина арбитражника",
    url: "https://docs.google.com/document/d/18npiWMxAoZvwBNgwD38JGuOLeRRtGL0e4HGQZ2YeVmc/edit?usp=sharing",
  },
  {
    id: "research-admin-stats",
    category: "research",
    title: "статистика админка",
    url: "https://docs.google.com/document/d/1nhYRMu6qu0CS3rfde_ehQRzKDcvMA_w9DxXNF8pF34o/edit?usp=sharing",
  },
  {
    id: "research-smart-contract-mechanics",
    category: "research",
    title: "механика-смарт контракта",
    url: "https://docs.google.com/document/d/1wVyIMPWMFbKoq0tX-mkCU1P3AM2uqM8GL2mbI8JDe4k/edit?usp=sharing",
  },
  {
    id: "research-prompt",
    category: "research",
    title: "promt",
    url: "https://docs.google.com/spreadsheets/d/1MNawYvP4iMfVwyPzdon9eb_VlO9O5D_SgCkMX1QUIzA/edit?usp=sharing",
  },
  {
    id: "research-regional-strategy",
    category: "research",
    title: "Стратегия регионального развития",
    url: "https://docs.google.com/document/d/1OhtdvgVB_VtdYEeDlpmrdXt_qUJS9M7Nvrgfish37R8/edit?usp=sharing",
  },
  {
    id: "research-manifest",
    category: "research",
    title: "Манифест Atlas System",
    url: "https://docs.google.com/document/d/1czYaCsMljzbZj6PRAr_4AaZ7T9PmXtPvo6Lod_8y2jM/edit?usp=sharing",
  },
  {
    id: "research-mission",
    category: "research",
    title: "Миссия",
    url: "https://docs.google.com/document/d/1Y8t3xcXFu0VT1sfxdp7dCQRh6s6P0mRgv2OCR2yTgRE/edit?usp=sharing",
  },
  {
    id: "research-promo-strategies",
    category: "research",
    title: "Стратегии продвижения",
    url: "https://docs.google.com/document/d/1MuyuVCvWjhqta8TGy2P3RCHe6luEpKLc7LMelMqg7xY/edit?usp=sharing",
  },
  {
    id: "research-arbitrage-landing",
    category: "research",
    title: "Лендос Арбитражника",
    url: "https://docs.google.com/document/d/11ghnwJZuo2RzNXjfBziTPeyJ8N3qrg2cbR4H-MYZxrQ/edit?usp=sharing",
  },
  {
    id: "research-self-referral",
    category: "research",
    title: "самореферальные схемы",
    url: "https://docs.google.com/document/d/1Gp1dWmbIgjkV12Lh_0QFjLfExnr7utW2K4A0UQbzmSU/edit?usp=sharing",
  },
  {
    id: "research-prelaunch-check",
    category: "research",
    title: "проверить сайт перед запуском",
    url: "https://docs.google.com/document/d/1MJKeEhxipzeNTnr3vsSSBk_pOSyOq4uvEnNQ6ZQh6SE/edit?usp=sharing",
  },
  {
    id: "research-knowledge-base",
    category: "research",
    title: "Для базы знаний",
    url: "https://docs.google.com/document/d/1fyYvCNPKR9DFo4xHcT6qWQO_YoE7bjx13KnZd7ugRt8/edit?usp=sharing",
  },
  {
    id: "research-partner-code",
    category: "research",
    title: "Кодекс партнера",
    url: "https://docs.google.com/document/d/1fIPUjXu85vSyixBRlhsFTvDQpQI1JdO7MaQ3PHrQPk4/edit?usp=sharing",
  },
  {
    id: "research-consents",
    category: "research",
    title: "Согласия 3 варианта",
    url: "https://docs.google.com/document/d/1hEQo6svQXvGDa8lVJsqVFMmnblSOMeGeBJ-lBW3mP4s/edit?usp=sharing",
  },
  {
    id: "research-model-summary",
    category: "research",
    title: "Краткое описание модели федфs",
    url: "https://docs.google.com/document/d/1xDZr_H6x0AMgRASj-t4TF5uhOWUBZqHyE0RX7JhJh70/edit?usp=sharing",
  },
  {
    id: "marketing-banners",
    category: "marketing",
    title: "Рекламные баннеры",
    url: "https://docs.google.com/document/d/1a5291232dkmGl7QWa7US41eZTSmWS35fMrLmic-DkEk/edit?usp=sharing",
  },
  {
    id: "marketing-launch",
    category: "marketing",
    title: "План запуска",
    url: "https://docs.google.com/document/d/1IDmY9NGsZNAuXlw_YODkIr8PM1hSNWI07aAXnBCcK_s/edit?usp=sharing",
  },
];

function readStoredMaterials() {
  if (typeof window === "undefined") return defaultMaterialItems;

  try {
    const saved = window.localStorage.getItem(MATERIALS_STORAGE_KEY);
    return saved ? hydrateMaterialItems(JSON.parse(saved)) : defaultMaterialItems;
  } catch {
    return defaultMaterialItems;
  }
}

function persistMaterials(nextItems) {
  try {
    window.localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(nextItems));
  } catch {
    // Таблица продолжит работать до перезагрузки, даже если localStorage недоступен.
  }
}

function createMaterialItem(overrides = {}) {
  return {
    id: `material-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category: "comments",
    title: "",
    url: "",
    ...overrides,
  };
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function hydrateMaterialItems(items) {
  return mergeMaterialItems(Array.isArray(items) ? items : defaultMaterialItems, defaultMaterialItems);
}

function getCategoryIdByHeader(header) {
  const normalizedHeader = normalizeText(header);
  const exactCategory = MATERIAL_CATEGORIES.find((category) => normalizeText(category.title) === normalizedHeader);
  if (exactCategory) return exactCategory.id;

  return Object.entries(CATEGORY_ALIASES).find(([, aliases]) => aliases.some((alias) => normalizedHeader.includes(alias)))?.[0] || null;
}

function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function extractSpreadsheetId(url) {
  return String(url || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || "";
}

function extractSheetGid(url) {
  return String(url || "").match(/[?#&]gid=(\d+)/)?.[1] || "";
}

function buildGoogleSheetCsvUrl(sheetUrl) {
  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId) return "";

  const gid = extractSheetGid(sheetUrl);
  const gidQuery = gid ? `&gid=${encodeURIComponent(gid)}` : "";
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv${gidQuery}`;
}

function extractUrlFromCell(cellValue) {
  return String(cellValue || "").match(/https?:\/\/[^\s)]+/)?.[0] || "";
}

function getTitleFromCell(cellValue) {
  return String(cellValue || "")
    .replace(/https?:\/\/[^\s)]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getCellText(cellValue) {
  if (typeof cellValue === "object" && cellValue !== null) return cellValue.text || "";
  return String(cellValue || "");
}

function getCellUrl(cellValue) {
  if (typeof cellValue === "object" && cellValue !== null) return cellValue.url || extractUrlFromCell(cellValue.text);
  return extractUrlFromCell(cellValue);
}

function buildMaterialItemsFromRows(rows) {
  const headerRowIndex = rows.findIndex((row) => row.map((cellValue) => getCategoryIdByHeader(getCellText(cellValue))).filter(Boolean).length >= 2);
  if (headerRowIndex < 0) return [];

  const headerRow = rows[headerRowIndex];
  const columnCategories = headerRow.map((cellValue) => getCategoryIdByHeader(getCellText(cellValue)));
  const importedItems = [];

  rows.slice(headerRowIndex + 1).forEach((row, rowIndex) => {
    row.forEach((cellValue, columnIndex) => {
      const category = columnCategories[columnIndex];
      const cellText = getCellText(cellValue);
      const title = getTitleFromCell(cellText) || cellText.trim();
      if (!category || !title) return;

      importedItems.push(
        createMaterialItem({
          id: `imported-${category}-${headerRowIndex + rowIndex}-${columnIndex}-${title.slice(0, 24).replace(/\W+/g, "-")}`,
          category,
          title,
          url: getCellUrl(cellValue),
        }),
      );
    });
  });

  return importedItems;
}

function parsePlainRows(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((row) => row.split("\t").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

function parseHtmlRows(html) {
  if (typeof window === "undefined" || !html) return [];

  const documentNode = new DOMParser().parseFromString(html, "text/html");
  const tableRows = Array.from(documentNode.querySelectorAll("tr"));
  if (!tableRows.length) return [];

  return tableRows
    .map((row) =>
      Array.from(row.querySelectorAll("th,td")).map((cell) => {
        const link = cell.querySelector("a[href]");
        return {
          text: cell.textContent.replace(/\s+/g, " ").trim(),
          url: link?.href || "",
        };
      }),
    )
    .filter((row) => row.some((cell) => cell.text));
}

function mergeMaterialItems(currentItems, importedItems) {
  const nextItems = [...currentItems];

  importedItems.forEach((importedItem) => {
    const existingIndex = nextItems.findIndex(
      (item) =>
        item.id === importedItem.id ||
        (item.category === importedItem.category && normalizeText(item.title) === normalizeText(importedItem.title)),
    );

    if (existingIndex >= 0) {
      nextItems[existingIndex] = {
        ...nextItems[existingIndex],
        title: importedItem.title || nextItems[existingIndex].title,
        url: importedItem.url || nextItems[existingIndex].url,
      };
      return;
    }

    nextItems.push(importedItem);
  });

  return nextItems;
}

function MaterialsLinksBoard() {
  const [items, setItems] = useState(readStoredMaterials);
  const [draft, setDraft] = useState(() => createMaterialItem({ category: "comments" }));
  const [editingItemId, setEditingItemId] = useState(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [importState, setImportState] = useState({ status: "idle", message: "" });

  const groupedItems = MATERIAL_CATEGORIES.map((category) => ({
    ...category,
    items: items.filter((item) => item.category === category.id),
  }));

  function updateItems(updater) {
    setItems((current) => {
      const next = updater(current);
      persistMaterials(next);
      return next;
    });
  }

  function updateItem(itemId, patch) {
    updateItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  }

  function addItem() {
    const title = draft.title.trim();
    if (!title) return;

    updateItems((current) => [createMaterialItem({ category: draft.category, title, url: draft.url.trim() }), ...current]);
    setDraft(createMaterialItem({ category: draft.category }));
  }

  function removeItem(itemId) {
    updateItems((current) => current.filter((item) => item.id !== itemId));
    if (editingItemId === itemId) setEditingItemId(null);
  }

  function resetItems() {
    updateItems(() => defaultMaterialItems);
    setEditingItemId(null);
  }

  async function importFromGoogleSheet() {
    const csvUrl = buildGoogleSheetCsvUrl(sheetUrl);
    if (!csvUrl) {
      setImportState({ status: "error", message: "Не вижу ID таблицы. Вставь ссылку вида docs.google.com/spreadsheets/d/..." });
      return;
    }

    setImportState({ status: "loading", message: "Считываю таблицу..." });

    try {
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error(`Google Sheets ответил ${response.status}`);

      const csvText = await response.text();
      const importedItems = buildMaterialItemsFromRows(parseCsvRows(csvText));
      if (!importedItems.length) {
        setImportState({
          status: "error",
          message: "Не нашел строки с колонками. Проверь, что в таблице есть шапка: Комментарий, ТЗ САЙТ, Документы и т.д.",
        });
        return;
      }

      updateItems((current) => mergeMaterialItems(current, importedItems));
      const linkCount = importedItems.filter((item) => item.url).length;
      setImportState({
        status: "success",
        message: `Импортировано: ${importedItems.length}. Ссылок с URL найдено: ${linkCount}.`,
      });
    } catch (error) {
      setImportState({
        status: "error",
        message: `Не удалось считать таблицу. Открой доступ по ссылке или опубликуй лист для просмотра. Деталь: ${error.message}`,
      });
    }
  }

  function importRows(rows, sourceLabel) {
    const importedItems = buildMaterialItemsFromRows(rows);
    if (!importedItems.length) {
      setImportState({
        status: "error",
        message: `Не нашел колонки в ${sourceLabel}. Скопируй таблицу вместе с шапкой: Комментарий, ТЗ САЙТ, Документы и т.д.`,
      });
      return;
    }

    updateItems((current) => mergeMaterialItems(current, importedItems));
    const linkCount = importedItems.filter((item) => item.url).length;
    setImportState({
      status: "success",
      message: `Импортировано из ${sourceLabel}: ${importedItems.length}. Ссылок с URL найдено: ${linkCount}.`,
    });
  }

  function handleTablePaste(event) {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const htmlRows = parseHtmlRows(html);

    if (htmlRows.length) {
      importRows(htmlRows, "буфера Google Sheets");
      return;
    }

    importRows(parsePlainRows(text), "текста");
  }

  async function copyMaterialsJson() {
    const exportItems = items
      .filter((item) => item.title?.trim())
      .map((item) => ({
        category: item.category,
        title: item.title,
        url: item.url || "",
      }));
    const linkedItemsCount = exportItems.filter((item) => item.url).length;

    if (!linkedItemsCount) {
      setImportState({
        status: "error",
        message: "В JSON сейчас 0 ссылок. Сначала вставь таблицу в поле «Вставить таблицу с живыми ссылками» или добавь URL вручную через «Изм.» у карточек.",
      });
      return;
    }

    const json = JSON.stringify(exportItems, null, 2);

    try {
      await navigator.clipboard.writeText(json);
      setImportState({
        status: "success",
        message: `JSON скопирован: ${exportItems.length} материалов, из них со ссылками ${linkedItemsCount}. Пришли его сюда одним сообщением.`,
      });
    } catch {
      setImportState({
        status: "error",
        message: "Браузер не дал скопировать автоматически. Выдели текст в поле экспорта и скопируй вручную.",
      });
    }
  }

  return (
    <>
      <section className="analytics-surface analytics-materials-form mt-4">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Google Docs / Drive</span>
            <h3 className="analytics-section-title">Реестр материалов</h3>
            <p className="analytics-page-subtitle mb-0">
              Сохраняем привычный формат: документ остается в Google Docs, а здесь лежит карта ссылок по разделам.
            </p>
          </div>
          <AnalyticsActionButton variant="secondary" size="sm" onClick={resetItems}>
            Сбросить к шаблону
          </AnalyticsActionButton>
        </div>
        <div className="analytics-materials-add-grid">
          <label>
            <span>Раздел</span>
            <select
              className="form-select analytics-launch-input"
              value={draft.category}
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
            >
              {MATERIAL_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Название</span>
            <input
              className="form-control analytics-launch-input"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Например: FAQ или Лендинг 1"
            />
          </label>
          <label>
            <span>Ссылка</span>
            <input
              className="form-control analytics-launch-input"
              value={draft.url}
              onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
              placeholder="https://docs.google.com/..."
            />
          </label>
          <AnalyticsActionButton variant="primary" onClick={addItem} disabled={!draft.title.trim()}>
            Добавить ссылку
          </AnalyticsActionButton>
        </div>
        <div className="analytics-materials-import">
          <label>
            <span>Импорт из Google Sheets</span>
            <input
              className="form-control analytics-launch-input"
              value={sheetUrl}
              onChange={(event) => setSheetUrl(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </label>
          <AnalyticsActionButton variant="primary" onClick={importFromGoogleSheet} disabled={!sheetUrl.trim() || importState.status === "loading"}>
            {importState.status === "loading" ? "Считываю..." : "Считать ссылки"}
          </AnalyticsActionButton>
          {importState.message ? (
            <div className={`analytics-materials-import-note analytics-materials-import-note-${importState.status}`}>
              {importState.message}
            </div>
          ) : null}
        </div>
        <div className="analytics-materials-paste-import">
          <label>
            <span>Вставить таблицу с живыми ссылками</span>
            <textarea
              className="form-control analytics-launch-input"
              rows="3"
              onPaste={handleTablePaste}
              placeholder="Выдели таблицу в Google Sheets вместе с шапкой, нажми Cmd+C и вставь сюда. Скрытые ссылки из ячеек подтянутся автоматически."
            />
          </label>
          <div className="analytics-materials-helper">
            Если после экспорта в JSON у всех строк `url: ""`, значит в таблицу попали только названия. Нужно скопировать диапазон из Google Sheets именно через `Cmd+C`, не через CSV.
          </div>
        </div>
        <div className="analytics-materials-export">
          <button type="button" className="btn analytics-board-btn" onClick={copyMaterialsJson}>
            Скопировать все материалы JSON
          </button>
          <textarea
            className="form-control analytics-launch-input"
            readOnly
            value={JSON.stringify(
              items
                .filter((item) => item.title?.trim())
                .map((item) => ({ category: item.category, title: item.title, url: item.url || "" })),
              null,
              2,
            )}
            rows="4"
            aria-label="JSON всех материалов"
          />
        </div>
      </section>

      <section className="analytics-surface analytics-materials-board mt-4">
        <div className="table-responsive">
          <table className="table analytics-table analytics-materials-table mb-0">
            <thead>
              <tr>
                {MATERIAL_CATEGORIES.map((category) => (
                  <th key={category.id}>{category.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {groupedItems.map((category) => (
                  <td key={category.id}>
                    <div className="analytics-materials-column">
                      {category.items.map((item) => {
                        const isEditing = editingItemId === item.id;

                        if (isEditing) {
                          return (
                            <div key={item.id} className="analytics-materials-editor">
                              <input
                                className="form-control analytics-launch-table-input"
                                value={item.title}
                                onChange={(event) => updateItem(item.id, { title: event.target.value })}
                                placeholder="Название"
                              />
                              <input
                                className="form-control analytics-launch-table-input"
                                value={item.url}
                                onChange={(event) => updateItem(item.id, { url: event.target.value })}
                                placeholder="Ссылка Google Docs / Drive"
                              />
                              <div className="analytics-materials-editor-actions">
                                <AnalyticsActionButton variant="success" size="icon" onClick={() => setEditingItemId(null)} title="Готово">
                                  ✓
                                </AnalyticsActionButton>
                                <AnalyticsActionButton variant="danger" size="icon" onClick={() => removeItem(item.id)} title="Удалить">
                                  ×
                                </AnalyticsActionButton>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={item.id} className="analytics-materials-link-row">
                            {item.url ? (
                              <a className="analytics-materials-link" href={item.url} target="_blank" rel="noreferrer">
                                {item.title}
                              </a>
                            ) : (
                              <button type="button" className="analytics-materials-link analytics-materials-link-empty" onClick={() => setEditingItemId(item.id)}>
                                {item.title}
                              </button>
                            )}
                            <button type="button" className="analytics-materials-edit-btn" onClick={() => setEditingItemId(item.id)} aria-label={`Изменить ссылку ${item.title}`}>
                              Изм.
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default MaterialsLinksBoard;
