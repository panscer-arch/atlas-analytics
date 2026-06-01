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
  inbox: "atlas.analytics.taskCategoryChecklist.inbox.v1",
  smm: "atlas.analytics.taskCategoryChecklist.smm.v1",
  site: "atlas.analytics.taskCategoryChecklist.site.v1",
  content: "atlas.analytics.taskCategoryChecklist.content.v1",
  design: "atlas.analytics.taskCategoryChecklist.design.v1",
  legal: "atlas.analytics.taskCategoryChecklist.legal.v1",
  tech: "atlas.analytics.taskCategoryChecklist.tech.v1",
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
  маркетинг: "marketing",
  smm: "smm",
  смм: "smm",
  соцсети: "smm",
  social: "smm",
  site: "site",
  сайт: "site",
  landos: "site",
  landing: "site",
  лендинг: "site",
  ландос: "site",
  content: "content",
  контент: "content",
  design: "design",
  дизайн: "design",
  legal: "legal",
  юридика: "legal",
  tech: "tech",
  dev: "tech",
  разработка: "tech",
  техника: "tech",
  knowledge: "knowledgeBase",
  knowledgebase: "knowledgeBase",
  база: "knowledgeBase",
  база_знаний: "knowledgeBase",
  "база-знаний": "knowledgeBase",
  ideas: "ideas",
  идеи: "ideas",
  idea: "ideas",
  inbox: "inbox",
  входящие: "inbox",
  входящее: "inbox",
  daily: "daily",
  день: "daily",
  today: "daily",
  other: "other",
  другое: "other",
  прочее: "other",
};

const CUSTOM_CATEGORY_TITLES = {
  other: "Разное",
};

const TASK_CATEGORY_META = {
  inbox: { key: CONTENT_KEYS.inbox, boardId: "inboxTasks", boardTitle: "Входящие" },
  smm: { key: CONTENT_KEYS.smm, boardId: "smmTasks", boardTitle: "SMM" },
  site: { key: CONTENT_KEYS.site, boardId: "siteTasks", boardTitle: "Сайт" },
  content: { key: CONTENT_KEYS.content, boardId: "contentTasks", boardTitle: "Контент" },
  design: { key: CONTENT_KEYS.design, boardId: "designTasks", boardTitle: "Дизайн" },
  legal: { key: CONTENT_KEYS.legal, boardId: "legalTasks", boardTitle: "Legal" },
  tech: { key: CONTENT_KEYS.tech, boardId: "techTasks", boardTitle: "Tech" },
};

const DIRECT_BOARD_META = [
  { key: CONTENT_KEYS.launch, boardId: "launch", boardTitle: "Задачи запуска" },
  { key: CONTENT_KEYS.marketing, boardId: "marketing", boardTitle: "Задачи маркетинга" },
  { key: CONTENT_KEYS.knowledgeBase, boardId: "knowledgeBase", boardTitle: "Задачи по базе знаний" },
  { key: CONTENT_KEYS.ideas, boardId: "ideas", boardTitle: "Идеи" },
  { key: CONTENT_KEYS.daily, boardId: "dailyTasks", boardTitle: "Задачи на день" },
  ...Object.values(TASK_CATEGORY_META),
];

export function normalizeCategory(value = "") {
  const key = String(value || "").trim().toLowerCase();
  return CATEGORY_ALIASES[key] || key || "other";
}

export function boardTitleForCategory(category) {
  if (category === "launch") return "Задачи запуска";
  if (category === "marketing") return "Задачи маркетинга";
  if (category === "daily") return "Задачи на день";
  if (category === "knowledgeBase") return "Задачи по базе знаний";
  if (category === "ideas") return "Идеи";
  if (TASK_CATEGORY_META[category]) return TASK_CATEGORY_META[category].boardTitle;
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

  if (category === "knowledgeBase") {
    await appendToList(CONTENT_KEYS.knowledgeBase, task);
    await addTelegramHistory("Создание", task, "Добавлена задача базы знаний из Telegram", "knowledgeBase", "Задачи по базе знаний");
    return { task, boardId: "knowledgeBase", boardTitle: "Задачи по базе знаний" };
  }

  if (category === "ideas") {
    await appendToList(CONTENT_KEYS.ideas, task);
    await addTelegramHistory("Создание", task, "Добавлена идея из Telegram", "ideas", "Идеи");
    return { task, boardId: "ideas", boardTitle: "Идеи" };
  }

  if (TASK_CATEGORY_META[category]) {
    const meta = TASK_CATEGORY_META[category];
    await appendToList(meta.key, task);
    await addTelegramHistory("Создание", task, `Добавлена задача из Telegram в ${meta.boardTitle}`, meta.boardId, meta.boardTitle);
    return { task, boardId: meta.boardId, boardTitle: meta.boardTitle };
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
  if (!category || categoryKey === "knowledgeBase") await pushChecklist(CONTENT_KEYS.knowledgeBase, "knowledgeBase", "Задачи по базе знаний");
  if (!category || categoryKey === "ideas") await pushChecklist(CONTENT_KEYS.ideas, "ideas", "Идеи");
  for (const [taskCategory, meta] of Object.entries(TASK_CATEGORY_META)) {
    if (!category || categoryKey === taskCategory) await pushChecklist(meta.key, meta.boardId, meta.boardTitle);
  }

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

function sourceMatches(task, source = {}) {
  if (!task?.telegram || !source?.chatId || !source?.messageId) return false;
  return String(task.telegram.chatId) === String(source.chatId) && String(task.telegram.messageId) === String(source.messageId);
}

function patchTaskForBoard(task, patch, boardId) {
  const now = new Date().toISOString();
  const next = { ...task, ...patch, updatedAt: now };

  if (Object.prototype.hasOwnProperty.call(patch, "assignee")) {
    next.responsible = patch.assignee || "Не назначено";
  }
  if (Object.prototype.hasOwnProperty.call(patch, "dueDate")) {
    if (boardId === "dailyTasks") next.deadline = patch.dueDate || "";
    else next.dueDate = patch.dueDate || "";
  }
  if (patch.status === "Готово") {
    next.done = true;
    if (boardId === "dailyTasks") next.completedAt = now;
  }
  if (patch.status && patch.status !== "Готово") {
    next.done = false;
    if (boardId === "dailyTasks") next.completedAt = "";
  }

  return next;
}

async function updateDirectBoardTaskBySource(meta, source, patch, historyDetails) {
  const tasks = await readContent(meta.key, []);
  if (!Array.isArray(tasks)) return null;

  let updatedTask = null;
  const nextTasks = tasks.map((task) => {
    if (!sourceMatches(task, source)) return task;
    updatedTask = patchTaskForBoard(task, patch, meta.boardId);
    return updatedTask;
  });

  if (!updatedTask) return null;

  await writeContent(meta.key, nextTasks);
  await addTelegramHistory("Обновление", updatedTask, historyDetails, meta.boardId, meta.boardTitle);
  return { task: updatedTask, boardId: meta.boardId, boardTitle: meta.boardTitle };
}

async function updateCustomTaskBySource(source, patch, historyDetails) {
  const checklists = await readContent(CONTENT_KEYS.custom, []);
  if (!Array.isArray(checklists)) return null;

  let result = null;
  const nextChecklists = checklists.map((checklist) => {
    const tasks = Array.isArray(checklist.tasks) ? checklist.tasks : [];
    const nextTasks = tasks.map((task) => {
      if (!sourceMatches(task, source)) return task;
      const updatedTask = patchTaskForBoard(task, patch, checklist.id);
      result = {
        task: updatedTask,
        boardId: checklist.id,
        boardTitle: checklist.title || checklist.id,
      };
      return updatedTask;
    });
    return { ...checklist, tasks: nextTasks };
  });

  if (!result) return null;

  await writeContent(CONTENT_KEYS.custom, nextChecklists);
  await addTelegramHistory("Обновление", result.task, historyDetails, result.boardId, result.boardTitle);
  return result;
}

export async function updateTelegramTaskBySource(source, patch, historyDetails = "Обновлено из Telegram") {
  for (const meta of DIRECT_BOARD_META) {
    const result = await updateDirectBoardTaskBySource(meta, source, patch, historyDetails);
    if (result) return result;
  }

  return updateCustomTaskBySource(source, patch, historyDetails);
}
