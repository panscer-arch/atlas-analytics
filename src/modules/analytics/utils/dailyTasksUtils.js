import {
  ALL_PEOPLE_TAB_ID,
  DAILY_CHAT_AUTHOR_STORAGE_KEY,
  DAILY_PEOPLE_STORAGE_KEY,
  DAILY_PERSON_ALIASES,
  DAILY_TASKS_STORAGE_KEY,
  DEFAULT_DAILY_PEOPLE,
  defaultDailyTasks,
} from "../data/dailyTasksData";

const DAILY_PERSON_ALIAS_MAP = Object.fromEntries(
  Object.entries(DAILY_PERSON_ALIASES).flatMap(([person, aliases]) => (
    aliases.map((alias) => [alias.toLocaleLowerCase("ru-RU"), person])
  )),
);

export function getLaunchStatusTone(status) {
  if (status === "Готово") return "done";
  if (status === "Отложено") return "paused";
  if (status === "Не в работе") return "idle";
  return "active";
}

export function getLaunchPriorityTone(priority) {
  if (priority === "Срочно") return "urgent";
  if (priority === "Высокий") return "high";
  if (priority === "Низкий") return "low";
  return "medium";
}

export function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeDailyTasks(tasks) {
  return normalizeArray(tasks).map((task) => ({
    id: task.id || `daily-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: task.title || "",
    priority: task.priority || "Средний",
    duration: task.duration || "",
    deadline: task.deadline || "",
    responsible: task.responsible || "",
    description: task.description || "",
    materials: task.materials || "",
    status: task.status || "Не в работе",
    completedAt: task.completedAt || "",
    updatedAt: task.updatedAt || "",
    subtasks: normalizeArray(task.subtasks).map((subtask) => ({
      id: subtask.id || `daily-subtask-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: subtask.title || "",
      responsible: subtask.responsible || "",
      priority: subtask.priority || "Средний",
      status: subtask.status || (subtask.done ? "Готово" : "В работе"),
      deadline: subtask.deadline || "",
      done: Boolean(subtask.done),
      messages: normalizeArray(subtask.messages).map((message) => ({
        id: message.id || `subtask-msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        author: message.author || "Команда",
        text: message.text || "",
        createdAt: message.createdAt || "",
      })),
    })),
    questions: normalizeArray(task.questions).map((question) => ({
      id: question.id || `daily-question-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      author: question.author || "Команда",
      text: question.text || "",
      answered: Boolean(question.answered),
      createdAt: question.createdAt || "",
      closedAt: question.closedAt || "",
    })),
    messages: normalizeArray(task.messages),
  }));
}

export function normalizePersonName(value = "") {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function getCanonicalPersonName(value = "") {
  const normalized = normalizePersonName(value);
  return DAILY_PERSON_ALIAS_MAP[normalized.toLocaleLowerCase("ru-RU")] || normalized;
}

export function normalizeDailyPeople(value) {
  const seen = new Set();
  return [...DEFAULT_DAILY_PEOPLE, ...normalizeArray(value)]
    .map(normalizePersonName)
    .map(getCanonicalPersonName)
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLocaleLowerCase("ru-RU");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function readStoredDailyTasks() {
  if (typeof window === "undefined") return normalizeDailyTasks(defaultDailyTasks);

  try {
    const saved = window.localStorage.getItem(DAILY_TASKS_STORAGE_KEY);
    return normalizeDailyTasks(saved ? JSON.parse(saved) : defaultDailyTasks);
  } catch {
    return normalizeDailyTasks(defaultDailyTasks);
  }
}

export function readStoredDailyPeople() {
  if (typeof window === "undefined") return normalizeDailyPeople(DEFAULT_DAILY_PEOPLE);

  try {
    const saved = window.localStorage.getItem(DAILY_PEOPLE_STORAGE_KEY);
    return normalizeDailyPeople(saved ? JSON.parse(saved) : DEFAULT_DAILY_PEOPLE);
  } catch {
    return normalizeDailyPeople(DEFAULT_DAILY_PEOPLE);
  }
}

export function readStoredDailyChatAuthor() {
  if (typeof window === "undefined") return "Digitex";

  try {
    return window.localStorage.getItem(DAILY_CHAT_AUTHOR_STORAGE_KEY) || "Digitex";
  } catch {
    return "Digitex";
  }
}

function getStartOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function createDailyTask(overrides = {}) {
  return {
    id: `daily-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "",
    priority: "Средний",
    duration: "22 мая",
    deadline: "22.05.2026",
    responsible: "",
    description: "",
    materials: "",
    status: "Не в работе",
    subtasks: [],
    messages: [],
    ...overrides,
  };
}

export function createDailySubtask(title = "", responsible = "") {
  return {
    id: `daily-subtask-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    responsible,
    priority: "Средний",
    status: "В работе",
    deadline: "",
    done: false,
    messages: [],
  };
}

export function createDailySubtaskMessage(text = "", author = "Команда") {
  return {
    id: `subtask-msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    author: author || "Команда",
    text,
    createdAt: new Date().toISOString(),
  };
}

export function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";

  return [
    "audio/mp4",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/webm;codecs=opus",
    "audio/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export function getAudioPlaybackMimeType(mimeType = "") {
  if (mimeType.includes("mp4")) return "audio/mp4";
  if (mimeType.includes("webm")) return "audio/webm";
  return mimeType || "audio/webm";
}

export function normalizeAudioDataUrl(dataUrl = "", mimeType = "") {
  if (!dataUrl.startsWith("data:")) return dataUrl;

  const marker = ";base64,";
  const markerIndex = dataUrl.indexOf(marker);
  if (markerIndex === -1) return dataUrl;

  return `data:${getAudioPlaybackMimeType(mimeType)}${dataUrl.slice(markerIndex)}`;
}

export function formatDailyMessageTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function parseDailyDeadline(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  const ruMatch = normalized.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  const isoMatch = normalized.match(/(\d{4})-(\d{2})-(\d{2})/);

  if (ruMatch) {
    const date = new Date(Number(ruMatch[3]), Number(ruMatch[2]) - 1, Number(ruMatch[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function getDailyDeadlineMeta(deadline) {
  const date = parseDailyDeadline(deadline);
  if (!date) return { label: "Без даты", tone: "idle" };

  const today = getStartOfDay();
  const deadlineDay = getStartOfDay(date);
  const diffDays = Math.ceil((deadlineDay.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { label: `Просрочено ${Math.abs(diffDays)} дн.`, tone: "danger" };
  if (diffDays === 0) return { label: "Сегодня дедлайн", tone: "urgent" };
  if (diffDays === 1) return { label: "Остался 1 день", tone: "accent" };
  return { label: `Осталось ${diffDays} дн.`, tone: diffDays <= 3 ? "accent" : "safe" };
}

export function getShortSubtaskId(subtaskId = "") {
  return String(subtaskId || "").replace(/^daily-subtask-/, "");
}

export function getFullSubtaskId(shortSubtaskId = "") {
  const normalized = String(shortSubtaskId || "");
  if (!normalized || normalized.startsWith("daily-subtask-")) return normalized;
  return `daily-subtask-${normalized}`;
}

function getResponsibleParts(value = "") {
  return String(value || "")
    .split(/\s+(?:и|and)\s+|[\/,;|]+/i)
    .map(getCanonicalPersonName)
    .filter(Boolean);
}

function isResponsibleValueForPerson(value, personName) {
  const canonicalPerson = getCanonicalPersonName(personName);
  return getResponsibleParts(value).some((part) => part === canonicalPerson);
}

function isSubtaskDone(subtask) {
  return Boolean(subtask.done) || subtask.status === "Готово";
}

export function isTaskAssignedToPerson(task, personName) {
  if (!personName || personName === ALL_PEOPLE_TAB_ID) return true;

  return isResponsibleValueForPerson(task.responsible, personName)
    || normalizeArray(task.subtasks).some((subtask) => isResponsibleValueForPerson(subtask.responsible, personName));
}

export function hasActiveItemForPerson(task, personName) {
  if (!personName || personName === ALL_PEOPLE_TAB_ID) return task.status !== "Готово";

  const matchingSubtasks = normalizeArray(task.subtasks)
    .filter((subtask) => isResponsibleValueForPerson(subtask.responsible, personName));

  if (matchingSubtasks.length) {
    return matchingSubtasks.some((subtask) => !isSubtaskDone(subtask));
  }

  return task.status !== "Готово" && isResponsibleValueForPerson(task.responsible, personName);
}

export function hasCompletedItemForPerson(task, personName) {
  if (!personName || personName === ALL_PEOPLE_TAB_ID) return task.status === "Готово";

  const matchingSubtasks = normalizeArray(task.subtasks)
    .filter((subtask) => isResponsibleValueForPerson(subtask.responsible, personName));

  if (matchingSubtasks.length) {
    return matchingSubtasks.every(isSubtaskDone);
  }

  return task.status === "Готово" && isResponsibleValueForPerson(task.responsible, personName);
}

export function countActiveItemsForPerson(tasks, personName) {
  return tasks.reduce((count, task) => {
    const matchingSubtasks = normalizeArray(task.subtasks)
      .filter((subtask) => isResponsibleValueForPerson(subtask.responsible, personName));

    if (matchingSubtasks.length) {
      return count + matchingSubtasks.filter((subtask) => !isSubtaskDone(subtask)).length;
    }

    return count + (task.status !== "Готово" && isResponsibleValueForPerson(task.responsible, personName) ? 1 : 0);
  }, 0);
}
