import { useEffect, useRef, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import DailyTaskCard from "./DailyTaskCard";
import Wrapper from "./Wrapper";
import { loadServerContent, saveServerContent } from "../services/contentStore";

const DAILY_TASKS_STORAGE_KEY = "atlas.analytics.dailyTasks.2026-05-22.v1";
const DAILY_CHAT_AUTHOR_STORAGE_KEY = "atlas.analytics.dailyTasks.chatAuthor.v1";
const LAUNCH_STATUSES = ["В работе", "Не в работе", "Готово", "Отложено"];
const LAUNCH_PRIORITIES = ["Срочно", "Высокий", "Средний", "Низкий"];

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

function readStoredDailyTasks() {
  if (typeof window === "undefined") return normalizeDailyTasks(defaultDailyTasks);

  try {
    const saved = window.localStorage.getItem(DAILY_TASKS_STORAGE_KEY);
    return normalizeDailyTasks(saved ? JSON.parse(saved) : defaultDailyTasks);
  } catch {
    return normalizeDailyTasks(defaultDailyTasks);
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

function createDailyQuestion(text = "", author = "Команда") {
  return {
    id: `daily-question-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    author: author || "Команда",
    text,
    answered: false,
    createdAt: new Date().toISOString(),
    closedAt: "",
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

export default function DailyTasksBoard() {
  const [tasks, setTasks] = useState(readStoredDailyTasks);
  const [draft, setDraft] = useState(() => createDailyTask({ status: "В работе" }));
  const [chatDrafts, setChatDrafts] = useState({});
  const [subtaskChatDrafts, setSubtaskChatDrafts] = useState({});
  const [messageEditDrafts, setMessageEditDrafts] = useState({});
  const [subtaskDrafts, setSubtaskDrafts] = useState({});
  const [questionDrafts, setQuestionDrafts] = useState({});
  const [responsibleDrafts, setResponsibleDrafts] = useState({});
  const [responsibleSavedTaskId, setResponsibleSavedTaskId] = useState("");
  const [chatAuthor, setChatAuthor] = useState(readStoredDailyChatAuthor);
  const [recordingTaskId, setRecordingTaskId] = useState("");
  const [recordingError, setRecordingError] = useState("");
  const [saveState, setSaveState] = useState("Сохранено");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isDailyArchiveOpen, setIsDailyArchiveOpen] = useState(false);
  const saveRequestRef = useRef(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);

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
    try {
      window.localStorage.setItem(DAILY_CHAT_AUTHOR_STORAGE_KEY, chatAuthor);
    } catch {
      // Имя автора не критично для работы доски.
    }
  }, [chatAuthor]);

  useEffect(() => () => {
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function persistDailyTasks(nextTasks) {
    const normalizedTasks = normalizeDailyTasks(nextTasks);
    const requestId = saveRequestRef.current + 1;
    saveRequestRef.current = requestId;
    setSaveState("Сохраняю...");

    try {
      window.localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(normalizedTasks));
    } catch {
      // Дневная доска продолжит работать в состоянии страницы.
    }

    saveServerContent(DAILY_TASKS_STORAGE_KEY, normalizedTasks).then((ok) => {
      if (saveRequestRef.current !== requestId) return;
      setSaveState(ok ? "Сохранено на сервере" : "Ошибка сохранения");
    });
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
    persist((currentTasks) => [createDailyTask({ ...draft, title: draft.title.trim(), updatedAt: new Date().toISOString() }), ...currentTasks]);
    setDraft(createDailyTask({ status: "В работе" }));
    setIsAddTaskOpen(false);
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
    setQuestionDrafts((current) => {
      const next = { ...current };
      delete next[taskId];
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

  function readBlobAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function startVoiceRecording(taskId) {
    setRecordingError("");

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("Браузер не поддерживает запись голоса.");
      return;
    }

    if (recordingTaskId && recordingTaskId !== taskId) {
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

      recorder.ondataavailable = (event) => {
        if (event.data?.size) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const chunks = audioChunksRef.current;
        const type = recorder.mimeType || "audio/webm";

        audioStreamRef.current?.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setRecordingTaskId("");

        if (!chunks.length) return;

        try {
          const blob = new Blob(chunks, { type });
          const audioDataUrl = await readBlobAsDataUrl(blob);
          addAudioMessage(taskId, audioDataUrl, type);
        } catch {
          setRecordingError("Не получилось сохранить голосовое сообщение.");
        }
      };

      recorder.start(1000);
      setRecordingTaskId(taskId);
    } catch {
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

  function addQuestion(taskId) {
    const text = (questionDrafts[taskId] || "").trim();
    if (!text) return;

    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId
        ? { ...task, questions: [createDailyQuestion(text, chatAuthor.trim() || "Команда"), ...normalizeArray(task.questions)], updatedAt: new Date().toISOString() }
        : task
    )));
    setQuestionDrafts((current) => ({ ...current, [taskId]: "" }));
  }

  function toggleQuestion(taskId, questionId) {
    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId
        ? {
          ...task,
          questions: normalizeArray(task.questions).map((question) => (
            question.id === questionId
              ? {
                ...question,
                answered: !question.answered,
                closedAt: question.answered ? "" : new Date().toISOString(),
              }
              : question
          )),
          updatedAt: new Date().toISOString(),
        }
        : task
    )));
  }

  function removeQuestion(taskId, questionId) {
    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId
        ? {
          ...task,
          questions: normalizeArray(task.questions).filter((question) => question.id !== questionId),
          updatedAt: new Date().toISOString(),
        }
        : task
    )));
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

  const completedTasks = tasks.filter((task) => task.status === "Готово");
  const activeTasks = tasks.filter((task) => task.status !== "Готово");
  const doneCount = completedTasks.length;

  return (
    <>
      <Wrapper as="section" marginTop="lg">
        <div className="analytics-surface analytics-daily-hero">
        <div>
          <span className="analytics-kicker">Фокус на день</span>
          <h3 className="analytics-section-title">Задачи на 22 мая</h3>
        </div>
        <div className="analytics-daily-summary">
          <div><span>Всего</span><strong>{tasks.length}</strong></div>
          <div><span>Готово</span><strong>{doneCount}</strong></div>
          <div><span>В работе</span><strong>{activeTasks.length}</strong></div>
          <AnalyticsActionButton variant="primary" onClick={() => setIsAddTaskOpen((current) => !current)}>
            {isAddTaskOpen ? "Скрыть форму" : "Добавить задачу"}
          </AnalyticsActionButton>
          <AnalyticsActionButton variant="secondary" onClick={() => setIsDailyArchiveOpen((current) => !current)} disabled={!completedTasks.length}>
            {isDailyArchiveOpen ? "Скрыть архив" : `Архив задач (${completedTasks.length})`}
          </AnalyticsActionButton>
        </div>
        <div className={`analytics-daily-save analytics-daily-save-${saveState === "Ошибка сохранения" ? "error" : "ok"}`}>{saveState}</div>
        </div>
      </Wrapper>

      {isAddTaskOpen ? (
        <Wrapper as="section" marginTop="lg">
          <div className="analytics-surface analytics-daily-add">
          <div className="analytics-data-table-head">
            <div>
              <span className="analytics-kicker">Добавить на 22 мая</span>
              <h3 className="analytics-section-title">Новая дневная задача</h3>
            </div>
            <AnalyticsActionButton variant="secondary" onClick={() => setIsAddTaskOpen(false)}>Свернуть</AnalyticsActionButton>
          </div>
          <div className="analytics-daily-form">
            <label>
              <span>Название задачи</span>
              <input className="analytics-launch-input" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Например: согласовать первый экран сайта" />
            </label>
            <label>
              <span>Приоритет</span>
              <select className="analytics-launch-input" value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>
                {LAUNCH_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </label>
            <label>
              <span>Срок выполнения</span>
              <input className="analytics-launch-input" value={draft.duration} onChange={(event) => setDraft((current) => ({ ...current, duration: event.target.value }))} placeholder="22 мая, до 15:00" />
            </label>
            <label>
              <span>Дата дедлайна</span>
              <input className="analytics-launch-input" value={draft.deadline} onChange={(event) => setDraft((current) => ({ ...current, deadline: event.target.value }))} placeholder="22.05.2026 15:00" />
            </label>
            <label>
              <span>Ответственный</span>
              <input className="analytics-launch-input" value={draft.responsible} onChange={(event) => setDraft((current) => ({ ...current, responsible: event.target.value }))} placeholder="Имя или роль" />
            </label>
            <label>
              <span>Статус</span>
              <select className="analytics-launch-input" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
                {LAUNCH_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
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
        <div className="analytics-daily-section-head">
          <span className="analytics-kicker">Активные задачи</span>
          <strong>{activeTasks.length}</strong>
        </div>
      </Wrapper>
      <Wrapper as="section" marginTop="md">
        <div className="analytics-daily-grid">
          {activeTasks.map((task, index) => (
            <DailyTaskCard
              key={task.id}
              task={task}
              index={index}
              responsibleDrafts={responsibleDrafts}
              responsibleSavedTaskId={responsibleSavedTaskId}
              subtaskDrafts={subtaskDrafts}
              subtaskChatDrafts={subtaskChatDrafts}
              questionDrafts={questionDrafts}
              chatDrafts={chatDrafts}
              messageEditDrafts={messageEditDrafts}
              chatAuthor={chatAuthor}
              recordingTaskId={recordingTaskId}
              recordingError={recordingError}
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
              setQuestionDrafts={setQuestionDrafts}
              addQuestion={addQuestion}
              toggleQuestion={toggleQuestion}
              removeQuestion={removeQuestion}
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
            />
          ))}
        </div>
      </Wrapper>
      {!activeTasks.length ? (
        <Wrapper marginTop="md">
          <div className="analytics-daily-empty">
            Активных задач нет. Готовые задачи лежат в архиве и не мешают рабочему экрану.
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
                  responsibleDrafts={responsibleDrafts}
                  responsibleSavedTaskId={responsibleSavedTaskId}
                  subtaskDrafts={subtaskDrafts}
                  subtaskChatDrafts={subtaskChatDrafts}
                  questionDrafts={questionDrafts}
                  chatDrafts={chatDrafts}
                  messageEditDrafts={messageEditDrafts}
                  chatAuthor={chatAuthor}
                  recordingTaskId={recordingTaskId}
                  recordingError={recordingError}
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
                  setQuestionDrafts={setQuestionDrafts}
                  addQuestion={addQuestion}
                  toggleQuestion={toggleQuestion}
                  removeQuestion={removeQuestion}
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
                />
              ))}
            </div>
          </Wrapper>
        </>
      ) : null}
    </>
  );
}
