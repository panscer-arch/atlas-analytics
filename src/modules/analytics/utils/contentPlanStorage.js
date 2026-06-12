import {
  CONTENT_PLAN_STORAGE_KEY,
  SMM_APPROVAL_ROWS,
  SMM_APPROVAL_STORAGE_KEY,
  SMM_EDITS_STORAGE_KEY,
  SMM_ROWS_STORAGE_KEY,
  SMM_TABLE_FIELDS,
  SMM_THEME_STORAGE_KEY,
  defaultContentPlanItems,
} from "../data/contentPlanData";

export function normalizeItems(items) {
  return Array.isArray(items) ? items.map((item, index) => ({
    id: item.id || `content-plan-${Date.now()}-${index}`,
    date: item.date || "",
    stage: item.stage || "До запуска",
    channel: item.channel || "Telegram",
    format: item.format || "Пост",
    topicBlock: item.topicBlock || "",
    title: item.title || "",
    status: item.status || "Идея",
    reviewStatus: item.reviewStatus || (item.status === "На вычитке" ? "На согласовании" : item.status === "Готово" || item.status === "Опубликовано" ? "Проверено" : "Готовится"),
    visualStatus: item.visualStatus || "Нет визуала",
    priority: item.priority || "Средний",
    owner: item.owner || "",
    visualBrief: item.visualBrief || "",
    visualLink: item.visualLink || "",
    copy: item.copy || "",
    comment: item.comment || "",
    adminComment: item.adminComment || "",
    publishedAt: item.publishedAt || "",
    publishedUrl: item.publishedUrl || "",
  })) : normalizeItems(defaultContentPlanItems);
}

function getDefaultContentPlanItems() {
  return normalizeItems(defaultContentPlanItems);
}

export function readStoredItems() {
  if (typeof window === "undefined") return getDefaultContentPlanItems();

  try {
    const saved = window.localStorage.getItem(CONTENT_PLAN_STORAGE_KEY);
    return saved ? normalizeItems(JSON.parse(saved)) : getDefaultContentPlanItems();
  } catch {
    return getDefaultContentPlanItems();
  }
}

export function readSmmApprovals() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(SMM_APPROVAL_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function readSmmEdits() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(SMM_EDITS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function normalizeSmmRow(row = {}, index = 0) {
  const fallbackId = `smm-row-${Date.now()}-${index}`;
  return SMM_TABLE_FIELDS.reduce((nextRow, field) => ({
    ...nextRow,
    [field]: String(row[field] || ""),
  }), {
    id: String(row.id || fallbackId),
  });
}

export function readSmmRows() {
  if (typeof window === "undefined") return SMM_APPROVAL_ROWS;
  try {
    const storedRows = JSON.parse(window.localStorage.getItem(SMM_ROWS_STORAGE_KEY) || "null");
    if (Array.isArray(storedRows) && storedRows.length) {
      return storedRows.map(normalizeSmmRow);
    }
  } catch {
    // Если сохраненная таблица повреждена, показываем исходные строки из PDF.
  }

  const storedEdits = readSmmEdits();
  return SMM_APPROVAL_ROWS.map((row, index) => normalizeSmmRow({
    ...row,
    edits: storedEdits[row.id] ?? row.edits,
  }, index));
}

export function readSmmTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    return window.localStorage.getItem(SMM_THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function createEmptySmmRow() {
  return normalizeSmmRow({
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    post: "Новый пост",
  });
}
