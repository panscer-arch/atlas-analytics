import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const STORE_DIR = process.env.ATLAS_CONTENT_STORE_DIR || "/var/lib/atlas-analytics-content";
const BACKUP_DIR = path.join(STORE_DIR, "_backups");

export const CONTENT_KEYS = {
  launch: "atlas.analytics.launchChecklist.tasks.v3",
  marketing: "atlas.analytics.marketingChecklist.tasks.v1",
  ideas: "atlas.analytics.ideasChecklist.tasks.v1",
  knowledgeBase: "atlas.analytics.knowledgeBaseChecklist.tasks.v1",
  daily: "atlas.analytics.dailyTasks.2026-05-22.v1",
  custom: "atlas.analytics.customChecklists.v1",
  archive: "atlas.analytics.taskArchive.v1",
  history: "atlas.analytics.taskHistory.v1",
  telegramOps: "atlas.analytics.telegramOps.v1",
};

export const CATEGORY_ALIASES = {
  launch: "launch",
  запуск: "launch",
  start: "launch",
  marketing: "marketing",
  smm: "marketing",
  маркетинг: "marketing",
  landos: "landos",
  landing: "landos",
  лендинг: "landos",
  ландос: "landos",
  content: "content",
  контент: "content",
  design: "design",
  дизайн: "design",
  legal: "legal",
  юридика: "legal",
  tech: "tech",
  dev: "tech",
  разработка: "tech",
  daily: "daily",
  день: "daily",
  today: "daily",
  other: "other",
  другое: "other",
  прочее: "other",
};

const CUSTOM_CATEGORY_TITLES = {
  landos: "Ландос",
  content: "Контент",
  design: "Дизайн",
  legal: "Юридика",
  tech: "Техника",
  other: "Разное",
};

export function normalizeCategory(value = "") {
  const key = String(value || "").trim().toLowerCase();
  return CATEGORY_ALIASES[key] || key || "other";
}

export function boardTitleForCategory(category) {
  if (category === "launch") return "Задачи запуска";
  if (category === "marketing") return "Задачи маркетинга";
  if (category === "daily") return "Задачи на день";
  return CUSTOM_CATEGORY_TITLES[category] || category || "Разное";
}

function filePathForKey(key) {
  return path.join(STORE_DIR, `${key}.json`);
}

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function backupExistingContent(key, targetPath) {
  try {
    const raw = await readFile(targetPath, "utf8");
    const keyBackupDir = path.join(BACKUP_DIR, key);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await mkdir(keyBackupDir, { recursive: true });
    await writeFile(path.join(keyBackupDir, `${timestamp}.json`), raw, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

export async function readContent(key, fallback = null) {
  await mkdir(STORE_DIR, { recursive: true });
  return readJsonFile(filePathForKey(key), fallback);
}

export async function writeContent(key, value) {
  await mkdir(STORE_DIR, { recursive: true });
  const targetPath = filePathForKey(key);
  const tempPath = `${targetPath}.${Date.now()}.tmp`;
  await backupExistingContent(key, targetPath);
  await writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
  await rename(tempPath, targetPath);
}

export function createChecklistTask({ title, description = "", category = "launch", assignee = "", dueDate = "", source = {} }) {
  const createdAt = new Date().toISOString();
  const sourceLines = [
    source.chatTitle ? `Telegram chat: ${source.chatTitle}` : "",
    source.authorName ? `Автор: ${source.authorName}` : "",
    source.messageUrl ? `Сообщение: ${source.messageUrl}` : "",
    source.rawText ? `\nИсходный текст:\n${source.rawText}` : "",
  ].filter(Boolean);

  return {
    id: `telegram-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: title || "Задача из Telegram",
    responsible: assignee || "Не назначено",
    assignee,
    comment: [description, ...sourceLines].filter(Boolean).join("\n"),
    dueDate,
    status: "В работе",
    priority: "Средний",
    done: false,
    focus: false,
    source: "telegram",
    telegram: source,
    category,
    createdAt,
    updatedAt: createdAt,
  };
}

export function createDailyTask({ title, description = "", category = "daily", assignee = "", dueDate = "", source = {} }) {
  const createdAt = new Date().toISOString();
  return {
    id: `telegram-daily-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: title || "Задача из Telegram",
    priority: "Средний",
    duration: "Сегодня",
    deadline: dueDate,
    responsible: assignee || "Не назначено",
    description,
    materials: source.messageUrl || "",
    status: "В работе",
    completedAt: "",
    updatedAt: createdAt,
    subtasks: [],
    questions: [],
    messages: source.rawText ? [{
      id: `telegram-message-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      author: source.authorName || "Telegram",
      text: source.rawText,
      createdAt,
    }] : [],
    source: "telegram",
    telegram: source,
    category,
  };
}

async function appendToCustomChecklist(category, task) {
  const checklists = await readContent(CONTENT_KEYS.custom, []);
  const id = `telegram-${category}`;
  const title = boardTitleForCategory(category);
  const existing = Array.isArray(checklists) ? checklists : [];
  const index = existing.findIndex((item) => item.id === id);

  if (index === -1) {
    const next = [{ id, title, tasks: [task] }, ...existing];
    await writeContent(CONTENT_KEYS.custom, next);
    return { boardId: id, boardTitle: title };
  }

  const next = existing.map((item, itemIndex) => itemIndex === index ? {
    ...item,
    title: item.title || title,
    tasks: [task, ...(Array.isArray(item.tasks) ? item.tasks : [])],
  } : item);
  await writeContent(CONTENT_KEYS.custom, next);
  return { boardId: id, boardTitle: existing[index].title || title };
}

async function appendToList(key, item) {
  const current = await readContent(key, []);
  const next = [item, ...(Array.isArray(current) ? current : [])];
  await writeContent(key, next);
  return next;
}

export async function addTelegramTask({ category: rawCategory, title, description = "", assignee = "", dueDate = "", source = {} }) {
  const category = normalizeCategory(rawCategory);

  if (category === "daily") {
    const task = createDailyTask({ title, description, category, assignee, dueDate, source });
    await appendToList(CONTENT_KEYS.daily, task);
    await addTelegramHistory("Создание", task, "Добавлена дневная задача из Telegram", "dailyTasks", "Задачи на день");
    return { task, boardId: "dailyTasks", boardTitle: "Задачи на день" };
  }

  const task = createChecklistTask({ title, description, category, assignee, dueDate, source });

  if (category === "marketing") {
    await appendToList(CONTENT_KEYS.marketing, task);
    await addTelegramHistory("Создание", task, "Добавлена маркетинговая задача из Telegram", "marketing", "Задачи маркетинга");
    return { task, boardId: "marketing", boardTitle: "Задачи маркетинга" };
  }

  if (category === "launch") {
    await appendToList(CONTENT_KEYS.launch, task);
    await addTelegramHistory("Создание", task, "Добавлена задача запуска из Telegram", "launch", "Задачи запуска");
    return { task, boardId: "launch", boardTitle: "Задачи запуска" };
  }

  const customBoard = await appendToCustomChecklist(category, task);
  await addTelegramHistory("Создание", task, `Добавлена задача из Telegram в ${customBoard.boardTitle}`, customBoard.boardId, customBoard.boardTitle);
  return { task, ...customBoard };
}

export async function addTelegramHistory(action, task, details, boardId, boardTitle) {
  const entry = {
    id: `history-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    boardId,
    boardTitle,
    taskId: task.id,
    taskTitle: task.title || "Без названия",
    action,
    details,
    createdAt: new Date().toISOString(),
    source: "telegram",
  };
  const current = await readContent(CONTENT_KEYS.history, []);
  await writeContent(CONTENT_KEYS.history, [entry, ...(Array.isArray(current) ? current : [])].slice(0, 240));
}

export async function appendTelegramOperation(type, payload) {
  const current = await readContent(CONTENT_KEYS.telegramOps, { decisions: [], questions: [], reports: [], reminders: [] });
  const normalized = {
    decisions: Array.isArray(current?.decisions) ? current.decisions : [],
    questions: Array.isArray(current?.questions) ? current.questions : [],
    reports: Array.isArray(current?.reports) ? current.reports : [],
    reminders: Array.isArray(current?.reminders) ? current.reminders : [],
  };
  const entry = {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...payload,
    createdAt: new Date().toISOString(),
    source: "telegram",
  };
  normalized[type] = [entry, ...(normalized[type] || [])].slice(0, 500);
  await writeContent(CONTENT_KEYS.telegramOps, normalized);
  return entry;
}

export async function collectTasks({ category = "", assignee = "", onlyActive = true } = {}) {
  const tasks = [];
  const categoryKey = normalizeCategory(category);

  async function pushChecklist(key, boardId, boardTitle) {
    const items = await readContent(key, []);
    if (!Array.isArray(items)) return;
    for (const task of items) tasks.push({ ...task, boardId, boardTitle });
  }

  if (!category || categoryKey === "launch") await pushChecklist(CONTENT_KEYS.launch, "launch", "Задачи запуска");
  if (!category || categoryKey === "marketing") await pushChecklist(CONTENT_KEYS.marketing, "marketing", "Задачи маркетинга");
  if (!category || categoryKey === "daily") await pushChecklist(CONTENT_KEYS.daily, "dailyTasks", "Задачи на день");

  const custom = await readContent(CONTENT_KEYS.custom, []);
  if (Array.isArray(custom)) {
    for (const board of custom) {
      const boardCategory = String(board.id || "").replace(/^telegram-/, "");
      if (category && boardCategory !== categoryKey && board.id !== categoryKey) continue;
      for (const task of Array.isArray(board.tasks) ? board.tasks : []) {
        tasks.push({ ...task, boardId: board.id, boardTitle: board.title || board.id });
      }
    }
  }

  return tasks.filter((task) => {
    if (onlyActive && (task.done || task.status === "Готово")) return false;
    if (assignee && !String(task.assignee || task.responsible || "").toLowerCase().includes(String(assignee).toLowerCase())) return false;
    return true;
  });
}
