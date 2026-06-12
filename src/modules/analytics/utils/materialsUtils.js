import { saveServerContent } from "../services/contentStore";
import { CATEGORY_ALIASES, MATERIALS_STORAGE_KEY, MATERIAL_CATEGORIES, defaultMaterialItems } from "../data/materialsData";

export function readStoredMaterials() {
  if (typeof window === "undefined") return defaultMaterialItems;

  try {
    const saved = window.localStorage.getItem(MATERIALS_STORAGE_KEY);
    return saved ? hydrateMaterialItems(JSON.parse(saved)) : defaultMaterialItems;
  } catch {
    return defaultMaterialItems;
  }
}

export function persistMaterials(nextItems) {
  try {
    window.localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(nextItems));
    saveServerContent(MATERIALS_STORAGE_KEY, nextItems);
  } catch {
    // Таблица продолжит работать до перезагрузки, даже если localStorage недоступен.
  }
}

export function createMaterialItem(overrides = {}) {
  return {
    id: `material-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category: "comments",
    title: "",
    url: "",
    ...overrides,
  };
}

export function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function hydrateMaterialItems(items) {
  return mergeMaterialItems(Array.isArray(items) ? items : defaultMaterialItems, defaultMaterialItems);
}

export function getCategoryIdByHeader(header) {
  const normalizedHeader = normalizeText(header);
  const exactCategory = MATERIAL_CATEGORIES.find((category) => normalizeText(category.title) === normalizedHeader);
  if (exactCategory) return exactCategory.id;

  return Object.entries(CATEGORY_ALIASES).find(([, aliases]) => aliases.some((alias) => normalizedHeader.includes(alias)))?.[0] || null;
}

export function parseCsvRows(csvText) {
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

export function extractSpreadsheetId(url) {
  return String(url || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || "";
}

export function extractSheetGid(url) {
  return String(url || "").match(/[?#&]gid=(\d+)/)?.[1] || "";
}

export function buildGoogleSheetCsvUrl(sheetUrl) {
  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId) return "";

  const gid = extractSheetGid(sheetUrl);
  const gidQuery = gid ? `&gid=${encodeURIComponent(gid)}` : "";
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv${gidQuery}`;
}

export function extractUrlFromCell(cellValue) {
  return String(cellValue || "").match(/https?:\/\/[^\s)]+/)?.[0] || "";
}

export function getTitleFromCell(cellValue) {
  return String(cellValue || "")
    .replace(/https?:\/\/[^\s)]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCellText(cellValue) {
  if (typeof cellValue === "object" && cellValue !== null) return cellValue.text || "";
  return String(cellValue || "");
}

export function getCellUrl(cellValue) {
  if (typeof cellValue === "object" && cellValue !== null) return cellValue.url || extractUrlFromCell(cellValue.text);
  return extractUrlFromCell(cellValue);
}

export function buildMaterialItemsFromRows(rows) {
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

export function parsePlainRows(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((row) => row.split("\t").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

export function parseHtmlRows(html) {
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

export function mergeMaterialItems(currentItems, importedItems) {
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
