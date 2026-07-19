export const WORK_SESSION_QUEUE_STORAGE_KEY = "atlas.analytics.workSessionQueue.v1";

export const WORK_SESSION_SOURCES = [
  { id: "zoom", label: "Zoom" },
  { id: "site", label: "Сайт" },
  { id: "cabinet", label: "Кабинет" },
  { id: "codex", label: "Codex" },
  { id: "telegram", label: "Telegram" },
  { id: "idea", label: "Идея" },
];

export const WORK_SESSION_LANES = [
  { id: "queued", label: "В очереди", hint: "следом" },
  { id: "work", label: "В работе", hint: "сейчас" },
  { id: "done", label: "Готово", hint: "за сессию" },
];

function createId(prefix) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toIso(value, fallback = "") {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function normalizeChecklist(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      id: String(item?.id || createId("check")),
      text: String(item?.text || "").trim(),
      done: Boolean(item?.done),
    }))
    .filter((item) => item.text);
}

export function createWorkSessionTask({
  title,
  source = "zoom",
  status = "queued",
  note = "",
  link = "",
  owner = "",
  checklist = [],
  timeSpentMs = 0,
  carriedFromTaskId = "",
  now = Date.now(),
} = {}) {
  const createdAt = new Date(now).toISOString();
  const safeStatus = ["queued", "in_progress", "waiting", "done"].includes(status) ? status : "queued";

  return {
    id: createId("session-task"),
    title: String(title || "").trim(),
    source: WORK_SESSION_SOURCES.some((item) => item.id === source) ? source : "zoom",
    status: safeStatus,
    note: String(note || ""),
    link: String(link || ""),
    owner: String(owner || ""),
    checklist: normalizeChecklist(checklist),
    createdAt,
    activeSince: safeStatus === "in_progress" ? createdAt : "",
    completedAt: safeStatus === "done" ? createdAt : "",
    timeSpentMs: Math.max(0, Number(timeSpentMs) || 0),
    carriedFromTaskId: String(carriedFromTaskId || ""),
  };
}

function normalizeTask(task) {
  const safeStatus = ["queued", "in_progress", "waiting", "done"].includes(task?.status)
    ? task.status
    : "queued";

  return {
    id: String(task?.id || createId("session-task")),
    title: String(task?.title || "").trim() || "Без названия",
    source: WORK_SESSION_SOURCES.some((item) => item.id === task?.source) ? task.source : "zoom",
    status: safeStatus,
    note: String(task?.note || ""),
    link: String(task?.link || ""),
    owner: String(task?.owner || ""),
    checklist: normalizeChecklist(task?.checklist),
    createdAt: toIso(task?.createdAt, new Date().toISOString()),
    activeSince: safeStatus === "in_progress" ? toIso(task?.activeSince, new Date().toISOString()) : "",
    completedAt: safeStatus === "done" ? toIso(task?.completedAt, "") : "",
    timeSpentMs: Math.max(0, Number(task?.timeSpentMs) || 0),
    carriedFromTaskId: String(task?.carriedFromTaskId || ""),
  };
}

function normalizeSession(session) {
  const startedAt = toIso(session?.startedAt, new Date().toISOString());
  const status = session?.status === "completed" ? "completed" : "active";

  return {
    id: String(session?.id || createId("work-session")),
    title: String(session?.title || "").trim() || "Рабочая сессия",
    status,
    startedAt,
    endedAt: status === "completed" ? toIso(session?.endedAt, startedAt) : "",
    tasks: Array.isArray(session?.tasks) ? session.tasks.map(normalizeTask) : [],
  };
}

export function createEmptyWorkSessionState() {
  return {
    version: 1,
    activeSessionId: "",
    sessions: [],
    pendingTasks: [],
  };
}

export function normalizeWorkSessionState(value) {
  if (!value || typeof value !== "object") return createEmptyWorkSessionState();

  const sessions = Array.isArray(value.sessions)
    ? value.sessions.map(normalizeSession).slice(0, 40)
    : [];
  const requestedActiveId = String(value.activeSessionId || "");
  const activeSession = sessions.find((session) => session.id === requestedActiveId && session.status === "active")
    || sessions.find((session) => session.status === "active")
    || null;

  return {
    version: 1,
    activeSessionId: activeSession?.id || "",
    sessions: sessions.map((session) => ({
      ...session,
      status: session.id === activeSession?.id ? "active" : "completed",
      endedAt: session.id === activeSession?.id ? "" : session.endedAt || session.startedAt,
    })),
    pendingTasks: Array.isArray(value.pendingTasks)
      ? value.pendingTasks.map((task) => normalizeTask({ ...task, status: "queued", activeSince: "", completedAt: "" }))
      : [],
  };
}

export function startWorkSession(state, { now = Date.now() } = {}) {
  const normalized = normalizeWorkSessionState(state);
  if (normalized.activeSessionId) return normalized;

  const startedAt = new Date(now).toISOString();
  const session = {
    id: createId("work-session"),
    title: `Сессия · ${new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(now))}`,
    status: "active",
    startedAt,
    endedAt: "",
    tasks: normalized.pendingTasks.map((task) => createWorkSessionTask({
      ...task,
      status: "queued",
      carriedFromTaskId: task.carriedFromTaskId || task.id,
      now,
    })),
  };

  return {
    ...normalized,
    activeSessionId: session.id,
    pendingTasks: [],
    sessions: [session, ...normalized.sessions].slice(0, 40),
  };
}

export function finishWorkSession(state, carryTaskIds = [], { now = Date.now() } = {}) {
  const normalized = normalizeWorkSessionState(state);
  const carrySet = new Set(carryTaskIds);
  const activeSession = normalized.sessions.find((session) => session.id === normalized.activeSessionId);
  if (!activeSession) return normalized;

  const endedAt = new Date(now).toISOString();
  const pendingTasks = activeSession.tasks
    .filter((task) => task.status !== "done" && carrySet.has(task.id))
    .map((task) => normalizeTask({
      ...task,
      status: "queued",
      activeSince: "",
      completedAt: "",
      timeSpentMs: task.timeSpentMs + (
        task.status === "in_progress" && task.activeSince
          ? Math.max(0, now - new Date(task.activeSince).getTime())
          : 0
      ),
      carriedFromTaskId: task.id,
    }));

  return {
    ...normalized,
    activeSessionId: "",
    pendingTasks,
    sessions: normalized.sessions.map((session) => {
      if (session.id !== activeSession.id) return session;

      return {
        ...session,
        status: "completed",
        endedAt,
        tasks: session.tasks.map((task) => {
          if (task.status !== "in_progress" || !task.activeSince) return task;
          return {
            ...task,
            activeSince: "",
            timeSpentMs: task.timeSpentMs + Math.max(0, now - new Date(task.activeSince).getTime()),
          };
        }),
      };
    }),
  };
}
