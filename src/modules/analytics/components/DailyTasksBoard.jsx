import { useEffect, useRef, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import DailyTaskCard from "./DailyTaskCard";
import Wrapper from "./Wrapper";
import { loadServerContent, postServerJson, saveServerContent } from "../services/contentStore";

const DAILY_TASKS_STORAGE_KEY = "atlas.analytics.dailyTasks.2026-05-22.v1";
const DAILY_CHAT_AUTHOR_STORAGE_KEY = "atlas.analytics.dailyTasks.chatAuthor.v1";
const DAILY_PEOPLE_STORAGE_KEY = "atlas.analytics.dailyTasks.people.v1";
const ALL_PEOPLE_TAB_ID = "__all__";
const LAUNCH_STATUSES = ["В работе", "Не в работе", "Готово", "Отложено"];
const LAUNCH_PRIORITIES = ["Срочно", "Высокий", "Средний", "Низкий"];
const DEFAULT_DAILY_PEOPLE = ["Бруно", "Гем", "Ротенберг", "Диджитекс", "Руби"];
const DAILY_PERSON_ALIASES = {
  Бруно: ["Бруно", "Bruno"],
  Гем: ["Гем", "Gem"],
  Ротенберг: ["Ротенберг", "Roten Berg", "Rotenberg", "Roten", "roten_berg"],
  Диджитекс: ["Диджитекс", "Дигитекс", "Digitex"],
  Руби: ["Руби", "Rubi", "Ruby"],
};

const defaultDailyTasks = [
  {
    id: "daily-2026-05-22-prototype",
    title: "Утвердить прототип заглушки atlas-system.io",
    priority: "Срочно",
    duration: "22 мая, до 12:00",
    deadline: "22.05.2026 12:00",
    responsible: "Digitex / UI-designer / Product-manager",
    description: "Посмотреть 3-screen prototype: 1 экран Architect video + coming soon, 2 экран краткое описание Atlas + CTA, 3 экран соцсети и контакты команды. Зафиксировать, что берём в дизайн.",
    materials: "https://analytics.pupanel.cc/atlas-site-concept/prototype-v2.html",
    status: "В работе",
    messages: [
      {
        id: "msg-daily-prototype-1",
        author: "Codex",
        text: "Фокус: не распыляться на весь сайт. Сначала утверждаем композицию первых 3 экранов.",
        createdAt: "2026-05-21T20:30:00.000Z",
      },
    ],
  },
  {
    id: "daily-2026-05-22-copy",
    title: "Собрать короткий английский текст для первых 3 экранов",
    priority: "Высокий",
    duration: "22 мая, до 15:00",
    deadline: "22.05.2026 15:00",
    responsible: "Copywriter / Content architect",
    description: "Нужны короткие блоки: Architect intro, Community idea, Ecosystem summary. Без обещаний гарантированного дохода и без агрессивного MLM.",
    materials: "ТЗ в карточке “Заглушка на сайт → Дизайн hero и визуальная система”.",
    status: "В работе",
    messages: [],
  },
  {
    id: "daily-2026-05-22-assets",
    title: "Подготовить финальные контакты и медиа для заглушки",
    priority: "Высокий",
    duration: "22 мая, до 17:00",
    deadline: "22.05.2026 17:00",
    responsible: "Content ops / Assets",
    description: "Дать Telegram-ссылки помощников, финальный логотип, ссылку на YouTube-ролик Архитектора или финальный placeholder до публикации.",
    materials: "Telegram, WhatsApp, Email. Домен: atlas-system.io. English only.",
    status: "Не в работе",
    messages: [],
  },
  {
    id: "daily-2026-05-22-front",
    title: "Собрать рабочий HTML-прототип после утверждения дизайна",
    priority: "Средний",
    duration: "22 мая, после утверждения первых экранов",
    deadline: "22.05.2026 20:00",
    responsible: "Frontend-developer / QA",
    description: "После утверждения направления собрать первый рабочий вариант страницы, проверить desktop/mobile, CTA, ссылки, читаемость и отсутствие визуального мусора.",
    materials: "/atlas-site-concept/prototype-v2.html и /atlas-site-preview/index.html",
    status: "Не в работе",
    messages: [],
  },
];

function getLaunchStatusTone(status) {
  if (status === "Готово") return "done";
  if (status === "Отложено") return "paused";
  if (status === "Не в работе") return "idle";
  return "active";
}

function getLaunchPriorityTone(priority) {
  if (priority === "Срочно") return "urgent";
  if (priority === "Высокий") return "high";
  if (priority === "Низкий") return "low";
  return "medium";
}

function normalizeDailyTasks(tasks) {
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

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizePersonName(value = "") {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeDailyPeople(value) {
  const seen = new Set();
  return [...DEFAULT_DAILY_PEOPLE, ...normalizeArray(value)]
    .map(normalizePersonName)
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLocaleLowerCase("ru-RU");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function readStoredDailyTasks() {
  if (typeof window === "undefined") return normalizeDailyTasks(defaultDailyTasks);

  try {
    const saved = window.localStorage.getItem(DAILY_TASKS_STORAGE_KEY);
    return normalizeDailyTasks(saved ? JSON.parse(saved) : defaultDailyTasks);
  } catch {
    return normalizeDailyTasks(defaultDailyTasks);
  }
}

function readStoredDailyPeople() {
  if (typeof window === "undefined") return normalizeDailyPeople(DEFAULT_DAILY_PEOPLE);

  try {
    const saved = window.localStorage.getItem(DAILY_PEOPLE_STORAGE_KEY);
    return normalizeDailyPeople(saved ? JSON.parse(saved) : DEFAULT_DAILY_PEOPLE);
  } catch {
    return normalizeDailyPeople(DEFAULT_DAILY_PEOPLE);
  }
}

function readStoredDailyChatAuthor() {
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

function createDailyTask(overrides = {}) {
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

function createDailySubtask(title = "") {
  return {
    id: `daily-subtask-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    responsible: "",
    priority: "Средний",
    status: "В работе",
    deadline: "",
    done: false,
    messages: [],
  };
}

function createDailySubtaskMessage(text = "", author = "Команда") {
  return {
    id: `subtask-msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    author: author || "Команда",
    text,
    createdAt: new Date().toISOString(),
  };
}

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";

  return [
    "audio/mp4",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/webm;codecs=opus",
    "audio/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function getAudioPlaybackMimeType(mimeType = "") {
  if (mimeType.includes("mp4")) return "audio/mp4";
  if (mimeType.includes("webm")) return "audio/webm";
  return mimeType || "audio/webm";
}

function normalizeAudioDataUrl(dataUrl = "", mimeType = "") {
  if (!dataUrl.startsWith("data:")) return dataUrl;

  const marker = ";base64,";
  const markerIndex = dataUrl.indexOf(marker);
  if (markerIndex === -1) return dataUrl;

  return `data:${getAudioPlaybackMimeType(mimeType)}${dataUrl.slice(markerIndex)}`;
}

function formatDailyMessageTime(value) {
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

function getDailyDeadlineMeta(deadline) {
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

function getShortSubtaskId(subtaskId = "") {
  return String(subtaskId || "").replace(/^daily-subtask-/, "");
}

function getFullSubtaskId(shortSubtaskId = "") {
  const normalized = String(shortSubtaskId || "");
  if (!normalized || normalized.startsWith("daily-subtask-")) return normalized;
  return `daily-subtask-${normalized}`;
}

function getPersonSearchTokens(personName = "") {
  const name = normalizePersonName(personName);
  return normalizeArray(DAILY_PERSON_ALIASES[name]).length ? DAILY_PERSON_ALIASES[name] : [name];
}

function getTaskPeopleSearchText(task) {
  const subtaskText = normalizeArray(task.subtasks)
    .map((subtask) => `${subtask.responsible || ""} ${subtask.title || ""}`)
    .join(" ");
  return `${task.responsible || ""} ${task.title || ""} ${subtaskText}`.toLocaleLowerCase("ru-RU");
}

function isTaskAssignedToPerson(task, personName) {
  if (!personName || personName === ALL_PEOPLE_TAB_ID) return true;

  const searchText = getTaskPeopleSearchText(task);
  return getPersonSearchTokens(personName).some((token) => {
    const normalizedToken = normalizePersonName(token).toLocaleLowerCase("ru-RU");
    return normalizedToken && searchText.includes(normalizedToken);
  });
}

export default function DailyTasksBoard() {
  const [tasks, setTasks] = useState(readStoredDailyTasks);
  const [draft, setDraft] = useState(() => createDailyTask({ status: "В работе" }));
  const [chatDrafts, setChatDrafts] = useState({});
  const [subtaskChatDrafts, setSubtaskChatDrafts] = useState({});
  const [messageEditDrafts, setMessageEditDrafts] = useState({});
  const [subtaskDrafts, setSubtaskDrafts] = useState({});
  const [responsibleDrafts, setResponsibleDrafts] = useState({});
  const [responsibleSavedTaskId, setResponsibleSavedTaskId] = useState("");
  const [dailyPeople, setDailyPeople] = useState(readStoredDailyPeople);
  const [activePerson, setActivePerson] = useState(ALL_PEOPLE_TAB_ID);
  const [newPersonName, setNewPersonName] = useState("");
  const [chatAuthor, setChatAuthor] = useState(readStoredDailyChatAuthor);
  const [recordingTaskId, setRecordingTaskId] = useState("");
  const [recordingError, setRecordingError] = useState("");
  const [telegramPushState, setTelegramPushState] = useState({});
  const [subtaskLinkState, setSubtaskLinkState] = useState({});
  const [saveState, setSaveState] = useState("Сохранено");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isDailyArchiveOpen, setIsDailyArchiveOpen] = useState(false);
  const saveRequestRef = useRef(0);
  const saveTimerRef = useRef(null);
  const saveInFlightRef = useRef(false);
  const savePendingRef = useRef(false);
  const latestTasksRef = useRef(tasks);
  const peopleLoadedRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const recordingTargetRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    loadServerContent(DAILY_TASKS_STORAGE_KEY).then((savedTasks) => {
      if (!isMounted || !Array.isArray(savedTasks)) return;

      const normalizedTasks = normalizeDailyTasks(savedTasks);
      setTasks(normalizedTasks);
      try {
        window.localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(normalizedTasks));
      } catch {
        // Серверная версия всё равно уже загружена в состояние страницы.
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    loadServerContent(DAILY_PEOPLE_STORAGE_KEY).then((savedPeople) => {
      if (!isMounted) return;

      if (Array.isArray(savedPeople)) {
        const normalizedPeople = normalizeDailyPeople(savedPeople);
        setDailyPeople(normalizedPeople);
        try {
          window.localStorage.setItem(DAILY_PEOPLE_STORAGE_KEY, JSON.stringify(normalizedPeople));
        } catch {
          // Список вкладок всё равно доступен в состоянии страницы.
        }
      }
      peopleLoadedRef.current = true;
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!dailyPeople.includes(activePerson) && activePerson !== ALL_PEOPLE_TAB_ID) {
      setActivePerson(ALL_PEOPLE_TAB_ID);
    }
  }, [dailyPeople, activePerson]);

  useEffect(() => {
    if (!peopleLoadedRef.current) return;

    try {
      window.localStorage.setItem(DAILY_PEOPLE_STORAGE_KEY, JSON.stringify(dailyPeople));
    } catch {
      // Список исполнителей некритичен для работы самой доски.
    }
    saveServerContent(DAILY_PEOPLE_STORAGE_KEY, dailyPeople);
  }, [dailyPeople]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DAILY_CHAT_AUTHOR_STORAGE_KEY, chatAuthor);
    } catch {
      // Имя автора не критично для работы доски.
    }
  }, [chatAuthor]);

  useEffect(() => () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!tasks.length || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const subtaskId = params.get("subtask") || getFullSubtaskId(params.get("s"));
    if (!subtaskId) return;

    const timer = window.setTimeout(() => {
      const target = document.getElementById(`daily-subtask-${window.CSS?.escape ? CSS.escape(subtaskId) : subtaskId}`);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("is-linked");
      window.setTimeout(() => target.classList.remove("is-linked"), 2600);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [tasks]);

  async function flushDailyTasksSave() {
    if (saveInFlightRef.current) {
      savePendingRef.current = true;
      return;
    }

    const payload = latestTasksRef.current;
    const requestId = saveRequestRef.current + 1;
    saveRequestRef.current = requestId;
    saveInFlightRef.current = true;
    savePendingRef.current = false;
    setSaveState("Сохраняю...");

    const ok = await saveServerContent(DAILY_TASKS_STORAGE_KEY, payload);

    saveInFlightRef.current = false;

    if (savePendingRef.current || latestTasksRef.current !== payload) {
      flushDailyTasksSave();
      return;
    }

    if (saveRequestRef.current === requestId) {
      setSaveState(ok ? "Сохранено на сервере" : "Ошибка сохранения");
    }
  }

  function persistDailyTasks(nextTasks) {
    const normalizedTasks = normalizeDailyTasks(nextTasks);
    latestTasksRef.current = normalizedTasks;
    setSaveState("Сохраняю...");

    try {
      window.localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(normalizedTasks));
    } catch {
      // Дневная доска продолжит работать в состоянии страницы.
    }

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(flushDailyTasksSave, 350);
  }

  function persist(updater) {
    setTasks((currentTasks) => {
      const nextTasks = typeof updater === "function" ? updater(currentTasks) : updater;
      persistDailyTasks(nextTasks);
      return normalizeDailyTasks(nextTasks);
    });
  }

  function patchTask(taskId, patch) {
    persist((currentTasks) => currentTasks.map((task) => {
      if (task.id !== taskId) return task;
      const nextStatus = patch.status ?? task.status;

      return {
        ...task,
        ...patch,
        completedAt: nextStatus === "Готово" ? (task.completedAt || new Date().toISOString()) : "",
        updatedAt: new Date().toISOString(),
      };
    }));
  }

  function addTask() {
    if (!draft.title.trim()) return;
    const selectedPerson = activePerson === ALL_PEOPLE_TAB_ID ? "" : activePerson;
    const nextResponsible = normalizePersonName(draft.responsible) || selectedPerson;
    persist((currentTasks) => [createDailyTask({ ...draft, title: draft.title.trim(), responsible: nextResponsible, updatedAt: new Date().toISOString() }), ...currentTasks]);
    setDraft(createDailyTask({ status: "В работе", responsible: selectedPerson }));
    setIsAddTaskOpen(false);
  }

  function openAddTaskForm() {
    const selectedPerson = activePerson === ALL_PEOPLE_TAB_ID ? "" : activePerson;
    setDraft((current) => ({ ...current, responsible: normalizePersonName(current.responsible) || selectedPerson }));
    setIsAddTaskOpen(true);
  }

  function addDailyPerson() {
    const name = normalizePersonName(newPersonName);
    if (!name) return;

    setDailyPeople((currentPeople) => normalizeDailyPeople([...currentPeople, name]));
    setActivePerson(name);
    setDraft((current) => ({ ...current, responsible: normalizePersonName(current.responsible) || name }));
    setNewPersonName("");
  }

  function archiveTask(taskId) {
    patchTask(taskId, { status: "Готово", completedAt: new Date().toISOString() });
  }

  function restoreTask(taskId) {
    patchTask(taskId, { status: "В работе", completedAt: "" });
  }

  function deleteArchivedTask(taskId) {
    persist((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    setChatDrafts((current) => {
      const next = { ...current };
      delete next[taskId];
      return next;
    });
    setSubtaskDrafts((current) => {
      const next = { ...current };
      delete next[taskId];
      return next;
    });
    setSubtaskChatDrafts((current) => {
      const next = {};
      Object.entries(current).forEach(([key, value]) => {
        if (!key.startsWith(`${taskId}:`)) next[key] = value;
      });
      return next;
    });
    setResponsibleDrafts((current) => {
      const next = { ...current };
      delete next[taskId];
      return next;
    });
    setMessageEditDrafts((current) => {
      const next = {};
      Object.entries(current).forEach(([key, value]) => {
        if (!key.startsWith(`${taskId}:`)) next[key] = value;
      });
      return next;
    });
  }

  function addMessage(taskId) {
    const value = (chatDrafts[taskId] || "").trim();
    if (!value) return;

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      author: chatAuthor.trim() || "Команда",
      text: value,
      createdAt: new Date().toISOString(),
    };

    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId ? { ...task, messages: [...normalizeArray(task.messages), message], updatedAt: new Date().toISOString() } : task
    )));
    setChatDrafts((current) => ({ ...current, [taskId]: "" }));
  }

  function addAudioMessage(taskId, audioDataUrl, audioMimeType) {
    const playbackMimeType = getAudioPlaybackMimeType(audioMimeType);
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      author: chatAuthor.trim() || "Команда",
      text: "Голосовое сообщение",
      type: "audio",
      audioDataUrl: normalizeAudioDataUrl(audioDataUrl, playbackMimeType),
      audioMimeType: playbackMimeType,
      createdAt: new Date().toISOString(),
    };

    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId ? { ...task, messages: [...normalizeArray(task.messages), message], updatedAt: new Date().toISOString() } : task
    )));
  }

  function addSubtaskAudioMessage(taskId, subtaskId, audioDataUrl, audioMimeType) {
    const playbackMimeType = getAudioPlaybackMimeType(audioMimeType);
    const message = {
      id: `subtask-msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      author: chatAuthor.trim() || "Команда",
      text: "Голосовое сообщение",
      type: "audio",
      audioDataUrl: normalizeAudioDataUrl(audioDataUrl, playbackMimeType),
      audioMimeType: playbackMimeType,
      createdAt: new Date().toISOString(),
    };

    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId
        ? {
          ...task,
          subtasks: normalizeArray(task.subtasks).map((subtask) => (
            subtask.id === subtaskId
              ? { ...subtask, messages: [...normalizeArray(subtask.messages), message] }
              : subtask
          )),
          updatedAt: new Date().toISOString(),
        }
        : task
    )));
  }

  function readBlobAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function startVoiceRecording(taskId, subtaskId = "") {
    setRecordingError("");
    const recordingId = subtaskId ? `${taskId}:${subtaskId}` : taskId;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("Браузер не поддерживает запись голоса.");
      return;
    }

    if (recordingTaskId && recordingTaskId !== recordingId) {
      setRecordingError("Сначала останови текущую запись.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      audioChunksRef.current = [];
      audioStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingTargetRef.current = { taskId, subtaskId };

      recorder.ondataavailable = (event) => {
        if (event.data?.size) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const chunks = audioChunksRef.current;
        const type = recorder.mimeType || "audio/webm";
        const target = recordingTargetRef.current || { taskId, subtaskId };

        audioStreamRef.current?.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        recordingTargetRef.current = null;
        setRecordingTaskId("");

        if (!chunks.length) return;

        try {
          const blob = new Blob(chunks, { type });
          const audioDataUrl = await readBlobAsDataUrl(blob);
          if (target.subtaskId) {
            addSubtaskAudioMessage(target.taskId, target.subtaskId, audioDataUrl, type);
          } else {
            addAudioMessage(target.taskId, audioDataUrl, type);
          }
        } catch {
          setRecordingError("Не получилось сохранить голосовое сообщение.");
        }
      };

      recorder.start(1000);
      setRecordingTaskId(recordingId);
    } catch {
      recordingTargetRef.current = null;
      setRecordingError("Не удалось получить доступ к микрофону.");
    }
  }

  function stopVoiceRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.requestData?.();
      mediaRecorderRef.current.stop();
    }
  }

  function startEditMessage(taskId, message) {
    setMessageEditDrafts((current) => ({ ...current, [`${taskId}:${message.id}`]: message.text || "" }));
  }

  function cancelEditMessage(taskId, messageId) {
    setMessageEditDrafts((current) => {
      const next = { ...current };
      delete next[`${taskId}:${messageId}`];
      return next;
    });
  }

  function saveEditedMessage(taskId, messageId) {
    const draftKey = `${taskId}:${messageId}`;
    const value = (messageEditDrafts[draftKey] || "").trim();
    if (!value) return;

    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId
        ? {
          ...task,
          messages: normalizeArray(task.messages).map((message) => (
            message.id === messageId ? { ...message, text: value, editedAt: new Date().toISOString() } : message
          )),
          updatedAt: new Date().toISOString(),
        }
        : task
    )));
    cancelEditMessage(taskId, messageId);
  }

  function removeMessage(taskId, messageId) {
    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId
        ? {
          ...task,
          messages: normalizeArray(task.messages).filter((message) => message.id !== messageId),
          updatedAt: new Date().toISOString(),
        }
        : task
    )));
    cancelEditMessage(taskId, messageId);
  }

  function addSubtask(taskId) {
    const title = (subtaskDrafts[taskId] || "").trim();
    if (!title) return;

    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId
        ? { ...task, subtasks: [...normalizeArray(task.subtasks), createDailySubtask(title)], updatedAt: new Date().toISOString() }
        : task
    )));
    setSubtaskDrafts((current) => ({ ...current, [taskId]: "" }));
  }

  function commitResponsible(taskId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const nextResponsible = Object.prototype.hasOwnProperty.call(responsibleDrafts, taskId)
      ? responsibleDrafts[taskId]
      : task.responsible;

    patchTask(taskId, { responsible: nextResponsible.trim() });
    setResponsibleSavedTaskId(taskId);
    window.setTimeout(() => {
      setResponsibleSavedTaskId((current) => (current === taskId ? "" : current));
    }, 1600);
    setResponsibleDrafts((current) => {
      const next = { ...current };
      delete next[taskId];
      return next;
    });
  }

  function updateSubtask(taskId, subtaskId, patch) {
    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId
        ? {
          ...task,
          subtasks: normalizeArray(task.subtasks).map((subtask) => {
            if (subtask.id !== subtaskId) return subtask;
            const next = { ...subtask, ...patch };
            if (patch.status === "Готово") next.done = true;
            if (patch.status && patch.status !== "Готово") next.done = false;
            if (patch.done === true) next.status = "Готово";
            if (patch.done === false && subtask.status === "Готово" && !patch.status) next.status = "В работе";
            return next;
          }),
          updatedAt: new Date().toISOString(),
        }
        : task
    )));
  }

  function addSubtaskMessage(taskId, subtaskId) {
    const draftKey = `${taskId}:${subtaskId}`;
    const text = (subtaskChatDrafts[draftKey] || "").trim();
    if (!text) return;

    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId
        ? {
          ...task,
          subtasks: normalizeArray(task.subtasks).map((subtask) => (
            subtask.id === subtaskId
              ? {
                ...subtask,
                messages: [...normalizeArray(subtask.messages), createDailySubtaskMessage(text, chatAuthor.trim() || "Команда")],
              }
              : subtask
          )),
          updatedAt: new Date().toISOString(),
        }
        : task
    )));
    setSubtaskChatDrafts((current) => ({ ...current, [draftKey]: "" }));
  }

  function removeSubtaskMessage(taskId, subtaskId, messageId) {
    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId
        ? {
          ...task,
          subtasks: normalizeArray(task.subtasks).map((subtask) => (
            subtask.id === subtaskId
              ? {
                ...subtask,
                messages: normalizeArray(subtask.messages).filter((message) => message.id !== messageId),
              }
              : subtask
          )),
          updatedAt: new Date().toISOString(),
        }
        : task
    )));
  }

  function removeSubtask(taskId, subtaskId) {
    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId
        ? {
          ...task,
          subtasks: normalizeArray(task.subtasks).filter((subtask) => subtask.id !== subtaskId),
          updatedAt: new Date().toISOString(),
        }
        : task
    )));
    setSubtaskChatDrafts((current) => {
      const next = { ...current };
      delete next[`${taskId}:${subtaskId}`];
      return next;
    });
  }

  async function pushSubtaskToTelegram(task, subtask, chatId) {
    const pushKey = `${task.id}:${subtask.id}`;
    setTelegramPushState((current) => ({ ...current, [pushKey]: "sending" }));

    const result = await postServerJson("/api/telegram/push-subtask", {
      task: {
        id: task.id,
        title: task.title,
        deadline: task.deadline,
      },
      subtask: {
        id: subtask.id,
        title: subtask.title,
        responsible: subtask.responsible,
        status: subtask.status || (subtask.done ? "Готово" : "В работе"),
        priority: subtask.priority || "Средний",
        deadline: subtask.deadline,
      },
      chatId,
    });

    setTelegramPushState((current) => ({ ...current, [pushKey]: result.ok ? "sent" : "error" }));
    if (!result.ok) {
      const errorText = result.payload?.error === "telegram_push_chat_not_configured"
        ? "Не задан Telegram-чат для Push. Нужно настроить TELEGRAM_PUSH_CHAT_ID."
        : result.payload?.error === "telegram_push_chat_required"
          ? "Выберите чат для Push."
          : result.payload?.error === "telegram_push_chat_not_allowed"
            ? "Этот чат не разрешён для Push на сервере."
        : result.payload?.error === "telegram_token_not_configured"
          ? "Не задан Telegram-токен для отправки."
          : "Не получилось отправить подзадачу в Telegram.";
      window.alert(errorText);
    }
    window.setTimeout(() => {
      setTelegramPushState((current) => {
        if (current[pushKey] !== "sent" && current[pushKey] !== "error") return current;
        const next = { ...current };
        delete next[pushKey];
        return next;
      });
    }, 2200);
  }

  async function copySubtaskLink(task, subtask) {
    const linkKey = `${task.id}:${subtask.id}`;
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("b", "d");
    url.searchParams.set("s", getShortSubtaskId(subtask.id));
    const link = url.toString();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = link;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setSubtaskLinkState((current) => ({ ...current, [linkKey]: "copied" }));
    } catch {
      window.prompt("Скопируй ссылку на подзадачу:", link);
      setSubtaskLinkState((current) => ({ ...current, [linkKey]: "copied" }));
    }

    window.setTimeout(() => {
      setSubtaskLinkState((current) => {
        if (current[linkKey] !== "copied") return current;
        const next = { ...current };
        delete next[linkKey];
        return next;
      });
    }, 1800);
  }

  const selectedPerson = activePerson === ALL_PEOPLE_TAB_ID ? "" : activePerson;
  const allActiveTasks = tasks.filter((task) => task.status !== "Готово");
  const allCompletedTasks = tasks.filter((task) => task.status === "Готово");
  const completedTasks = allCompletedTasks.filter((task) => isTaskAssignedToPerson(task, selectedPerson));
  const activeTasks = allActiveTasks.filter((task) => isTaskAssignedToPerson(task, selectedPerson));
  const personTaskCounts = dailyPeople.reduce((result, person) => {
    result[person] = allActiveTasks.filter((task) => isTaskAssignedToPerson(task, person)).length;
    return result;
  }, {});

  return (
    <>
      {isAddTaskOpen ? (
        <Wrapper as="section" marginTop="lg">
          <div className="analytics-surface analytics-daily-add">
          <div className="analytics-data-table-head">
            <div>
              <span className="analytics-kicker">Глобальная задача</span>
              <h3 className="analytics-section-title">Новая задача</h3>
            </div>
            <AnalyticsActionButton variant="secondary" onClick={() => setIsAddTaskOpen(false)}>Свернуть</AnalyticsActionButton>
          </div>
          <div className="analytics-daily-form">
            <label>
              <span>Название задачи</span>
              <input className="analytics-launch-input" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Например: согласовать первый экран сайта" />
            </label>
            <label>
              <span>Ответственный</span>
              <select className="analytics-launch-input" value={draft.responsible} onChange={(event) => setDraft((current) => ({ ...current, responsible: event.target.value }))}>
                <option value="">Не назначен</option>
                {dailyPeople.map((person) => <option key={person} value={person}>{person}</option>)}
              </select>
            </label>
            <label className="analytics-daily-form-wide">
              <span>Доп. описание</span>
              <textarea className="analytics-launch-input" rows="2" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Что конкретно нужно сделать" />
            </label>
            <label className="analytics-daily-form-wide">
              <span>Доп. материалы / ссылки</span>
              <textarea className="analytics-launch-input" rows="2" value={draft.materials} onChange={(event) => setDraft((current) => ({ ...current, materials: event.target.value }))} placeholder="Ссылки, документы, прототипы" />
            </label>
            <AnalyticsActionButton variant="primary" onClick={addTask} disabled={!draft.title.trim()}>Добавить</AnalyticsActionButton>
          </div>
          </div>
        </Wrapper>
      ) : null}

      <Wrapper marginTop="lg">
        <div className="analytics-daily-person-panel">
          <div className="analytics-daily-person-head">
            <div>
              <span className="analytics-kicker">Исполнители</span>
              <h3 className="analytics-section-title">Ближайшие задачи</h3>
            </div>
            <p>Кликни на человека, чтобы видеть только его активные карточки. Новую задачу можно сразу закрепить за выбранным человеком.</p>
          </div>
          <div className="analytics-daily-person-tabs" role="tablist" aria-label="Фильтр задач по исполнителю">
            <button
              type="button"
              className={`analytics-daily-person-tab ${activePerson === ALL_PEOPLE_TAB_ID ? "is-active" : ""}`}
              onClick={() => setActivePerson(ALL_PEOPLE_TAB_ID)}
            >
              <span>Все</span>
              <strong>{allActiveTasks.length}</strong>
            </button>
            {dailyPeople.map((person) => (
              <button
                type="button"
                key={person}
                className={`analytics-daily-person-tab ${activePerson === person ? "is-active" : ""}`}
                onClick={() => {
                  setActivePerson(person);
                  setDraft((current) => ({ ...current, responsible: normalizePersonName(current.responsible) || person }));
                }}
              >
                <span>{person}</span>
                <strong>{personTaskCounts[person] || 0}</strong>
              </button>
            ))}
          </div>
          <div className="analytics-daily-person-add">
            <input
              className="analytics-launch-input"
              value={newPersonName}
              onChange={(event) => setNewPersonName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addDailyPerson();
              }}
              placeholder="Добавить человека"
            />
            <AnalyticsActionButton variant="secondary" onClick={addDailyPerson} disabled={!newPersonName.trim()}>
              Добавить
            </AnalyticsActionButton>
          </div>
        </div>
      </Wrapper>

      <Wrapper marginTop="md">
        <div className="analytics-daily-section-head">
          <span className="analytics-kicker">{selectedPerson ? `Задачи: ${selectedPerson}` : "Все активные задачи"}</span>
          <strong>{activeTasks.length}</strong>
          <div className="analytics-daily-section-actions">
            <AnalyticsActionButton variant="primary" onClick={() => (isAddTaskOpen ? setIsAddTaskOpen(false) : openAddTaskForm())}>
              {isAddTaskOpen ? "Скрыть форму" : "Добавить задачу"}
            </AnalyticsActionButton>
            <AnalyticsActionButton variant="secondary" onClick={() => setIsDailyArchiveOpen((current) => !current)} disabled={!completedTasks.length}>
              {isDailyArchiveOpen ? "Скрыть архив" : `Архив (${completedTasks.length})`}
            </AnalyticsActionButton>
          </div>
          <div className={`analytics-daily-save analytics-daily-save-${saveState === "Ошибка сохранения" ? "error" : "ok"}`}>{saveState}</div>
        </div>
      </Wrapper>
      <Wrapper as="section" marginTop="md">
        <div className="analytics-daily-grid">
          {activeTasks.map((task, index) => (
            <DailyTaskCard
              key={task.id}
              task={task}
              index={index}
              assigneeOptions={dailyPeople}
              responsibleDrafts={responsibleDrafts}
              responsibleSavedTaskId={responsibleSavedTaskId}
              subtaskDrafts={subtaskDrafts}
              subtaskChatDrafts={subtaskChatDrafts}
              chatDrafts={chatDrafts}
              messageEditDrafts={messageEditDrafts}
              chatAuthor={chatAuthor}
              recordingTaskId={recordingTaskId}
              recordingError={recordingError}
              telegramPushState={telegramPushState}
              subtaskLinkState={subtaskLinkState}
              patchTask={patchTask}
              archiveTask={archiveTask}
              restoreTask={restoreTask}
              deleteArchivedTask={deleteArchivedTask}
              commitResponsible={commitResponsible}
              setResponsibleSavedTaskId={setResponsibleSavedTaskId}
              setResponsibleDrafts={setResponsibleDrafts}
              updateSubtask={updateSubtask}
              removeSubtask={removeSubtask}
              setSubtaskDrafts={setSubtaskDrafts}
              setSubtaskChatDrafts={setSubtaskChatDrafts}
              addSubtask={addSubtask}
              addSubtaskMessage={addSubtaskMessage}
              removeSubtaskMessage={removeSubtaskMessage}
              setChatAuthor={setChatAuthor}
              setMessageEditDrafts={setMessageEditDrafts}
              saveEditedMessage={saveEditedMessage}
              cancelEditMessage={cancelEditMessage}
              startEditMessage={startEditMessage}
              removeMessage={removeMessage}
              setChatDrafts={setChatDrafts}
              addMessage={addMessage}
              stopVoiceRecording={stopVoiceRecording}
              startVoiceRecording={startVoiceRecording}
              pushSubtaskToTelegram={pushSubtaskToTelegram}
              copySubtaskLink={copySubtaskLink}
            />
          ))}
        </div>
      </Wrapper>
      {!activeTasks.length ? (
        <Wrapper marginTop="md">
          <div className="analytics-daily-empty">
            {selectedPerson ? `У ${selectedPerson} пока нет активных задач. Добавь новую карточку или укажи этого человека в поле ответственного.` : "Активных задач нет. Готовые задачи лежат в архиве и не мешают рабочему экрану."}
          </div>
        </Wrapper>
      ) : null}

      {isDailyArchiveOpen && completedTasks.length ? (
        <>
          <Wrapper marginTop="lg">
            <div className="analytics-daily-section-head analytics-daily-archive-head">
              <span className="analytics-kicker">Архив дня / выполнено</span>
              <strong>{completedTasks.length}</strong>
            </div>
          </Wrapper>
          <Wrapper as="section" marginTop="md">
            <div className="analytics-daily-grid analytics-daily-archive-grid">
              {completedTasks.map((task, index) => (
                <DailyTaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  isCompleted
                  assigneeOptions={dailyPeople}
                  responsibleDrafts={responsibleDrafts}
                  responsibleSavedTaskId={responsibleSavedTaskId}
                  subtaskDrafts={subtaskDrafts}
                  subtaskChatDrafts={subtaskChatDrafts}
                  chatDrafts={chatDrafts}
                  messageEditDrafts={messageEditDrafts}
                  chatAuthor={chatAuthor}
                  recordingTaskId={recordingTaskId}
                  recordingError={recordingError}
                  telegramPushState={telegramPushState}
                  subtaskLinkState={subtaskLinkState}
                  patchTask={patchTask}
                  archiveTask={archiveTask}
                  restoreTask={restoreTask}
                  deleteArchivedTask={deleteArchivedTask}
                  commitResponsible={commitResponsible}
                  setResponsibleSavedTaskId={setResponsibleSavedTaskId}
                  setResponsibleDrafts={setResponsibleDrafts}
                  updateSubtask={updateSubtask}
                  removeSubtask={removeSubtask}
                  setSubtaskDrafts={setSubtaskDrafts}
                  setSubtaskChatDrafts={setSubtaskChatDrafts}
                  addSubtask={addSubtask}
                  addSubtaskMessage={addSubtaskMessage}
                  removeSubtaskMessage={removeSubtaskMessage}
                  setChatAuthor={setChatAuthor}
                  setMessageEditDrafts={setMessageEditDrafts}
                  saveEditedMessage={saveEditedMessage}
                  cancelEditMessage={cancelEditMessage}
                  startEditMessage={startEditMessage}
                  removeMessage={removeMessage}
                  setChatDrafts={setChatDrafts}
                  addMessage={addMessage}
                  stopVoiceRecording={stopVoiceRecording}
                  startVoiceRecording={startVoiceRecording}
                  pushSubtaskToTelegram={pushSubtaskToTelegram}
                  copySubtaskLink={copySubtaskLink}
                />
              ))}
            </div>
          </Wrapper>
        </>
      ) : null}
    </>
  );
}
