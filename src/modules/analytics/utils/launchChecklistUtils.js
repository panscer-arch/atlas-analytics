import { saveServerContent } from "../services/contentStore";

export function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function createLaunchTask(overrides = {}) {
  return {
    id: `launch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "",
    responsible: "",
    assignee: "",
    comment: "",
    dueDate: "",
    status: "В работе",
    priority: "Средний",
    done: false,
    ...overrides,
  };
}

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

export function normalizeChecklistTasks(tasks) {
  return tasks.map((task) => ({
    priority: "Средний",
    assignee: "",
    done: false,
    focus: false,
    ...task,
  }));
}

export function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function readStoredTasks(storageKey, fallbackTasks) {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(storageKey);
    return normalizeChecklistTasks(saved ? JSON.parse(saved) : fallbackTasks);
  } catch {
    return normalizeChecklistTasks(fallbackTasks);
  }
}

export function readStoredCustomChecklists(storageKey) {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(storageKey);
    const checklists = saved ? JSON.parse(saved) : [];
    return checklists.map((checklist) => ({
      ...checklist,
      tasks: normalizeChecklistTasks(checklist.tasks || []),
    }));
  } catch {
    return [];
  }
}

export function persistChecklistTasks(storageKey, nextTasks) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(nextTasks));
    saveServerContent(storageKey, nextTasks);
  } catch {
    // Если storage недоступен, чеклист все равно работает до перезагрузки страницы.
  }
}

export function patchChecklistTask(task, patch) {
  const next = { ...task, ...patch };
  if (patch.status === "Готово") next.done = true;
  if (patch.status && patch.status !== "Готово") next.done = false;
  if (patch.done === true) next.status = "Готово";
  if (patch.done === false && task.status === "Готово" && !patch.status) next.status = "В работе";
  return next;
}

export function parseTaskDueDate(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const ruMatch = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);

  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (ruMatch) {
    const date = new Date(Number(ruMatch[3]), Number(ruMatch[2]) - 1, Number(ruMatch[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function getStartOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getTaskTiming(task) {
  if (task.done || task.status === "Готово") return "done";
  const dueDate = parseTaskDueDate(task.dueDate);
  if (!dueDate) return "no-date";

  const today = getStartOfDay();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  if (dueDate < today) return "overdue";
  if (dueDate.getTime() === today.getTime()) return "today";
  if (dueDate <= weekEnd) return "week";
  return "later";
}

export function formatHistoryDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function shouldLogTaskPatch(patch) {
  return Object.keys(patch).some((key) => ["assignee", "status", "done", "priority", "focus"].includes(key));
}

const BOARD_TITLES = {
  dailyTasks: "Ближайшие задачи",
  marketing: "Задачи по маркетингу",
  ideas: "Идеи",
  knowledgeBase: "Задачи базы знаний",
};

const BOARD_SUBTITLES = {
  dailyTasks: "Оперативные карточки команды: исполнители, дедлайны, материалы и чат по каждой задаче.",
  ideas: "Сырые идеи разложены по направлениям, чтобы их можно было приоритизировать и превращать в задачи.",
  contentPlan: "Редактируемый SMM-план Atlas: соцсети, даты, форматы, статусы, тексты, сценарии и комментарии по правкам.",
  images: "Библиотека имиджевых картинок Atlas: русский смысл для согласования, английский prompt, превью и скачивание.",
  videoScripts: "Сценарии и ТЗ для роликов: можно читать, редактировать текущие тексты и добавлять новые ролики.",
  materials: "Карта Google Docs и Drive-ссылок по разделам: ТЗ, кабинет, ролики, документы, исследования и маркетинг.",
  presentation: "Рабочая сборка универсальной презентации: слева список слайдов, справа согласованный текст и финальная картинка.",
  productLibrary: "Библиотека продуктов, чтобы не путаться между CRM, аналитикой, Atlas AI и новыми направлениями.",
  socialSubscriptions: "Списки подписок для X и Instagram: Web3, DAO, крипто-медиа, лидеры мнений, маркетинг и community building.",
  developments: "Разработки Atlas: продуктовые идеи, технические направления, статусы, ответственные и ближайшие шаги.",
  crmBoard: "CRM-доска перенесена внутрь задач, чтобы все операционные рабочие разделы были собраны в одном месте.",
  parser: "Парсер лидов теперь лежит рядом с задачами, чтобы поиск, обработка и follow-up не жили отдельной верхней вкладкой.",
  agentTasks: "Editable-документ параметров для обучения AI-агента Atlas System.",
  agentDataset: "Editable-датасет для обучения агентов: блоки, prompt/response пары, источники и правила вычитки.",
  agentFaq: "Editable FAQ по вопросам участников и ответам AI-агента.",
  ceoPresentation: "Согласованные слайды CEO-презентации: визуальное ТЗ и текст Архитектора.",
  whitePaper: "White Paper разложен по разделам: можно постепенно добавлять текст, редактировать и вычитывать каждый блок отдельно.",
  terminology: "Editable-глоссарий терминов Atlas System по категориям: Web3, циклы, партнерка, DAO, юридика и коммуникации.",
  securityReview: "Security Review V1: отделяем внешний взлом от архитектурных полномочий и собираем доказательную базу проверок.",
  codexSystem: "Codex OS: рабочие промпты, скиллы и автоматизации для разработки продуктов в SuperSystem.",
  marketing: "Маркетинговые задачи с фото: парсеры, рассылки, короткие ролики, почта, адаптация, QA и роли команды.",
  knowledgeBase: "Материалы, которые нужно подготовить и вычитать для базы знаний.",
  launch: "Что нужно закрыть перед стартом",
};

export function getLaunchBoardCopy({ activeBoard, activeTaskCategoryBoard, activeCustomChecklist }) {
  if (activeCustomChecklist) {
    return {
      title: activeCustomChecklist.title,
      subtitle: "Пользовательский чек-лист с собственным набором задач.",
    };
  }

  if (activeTaskCategoryBoard) {
    return {
      title: activeTaskCategoryBoard.title,
      subtitle: activeTaskCategoryBoard.description,
    };
  }

  return {
    title: BOARD_TITLES[activeBoard] || "Задачи запуска",
    subtitle: BOARD_SUBTITLES[activeBoard] || BOARD_SUBTITLES.launch,
  };
}
