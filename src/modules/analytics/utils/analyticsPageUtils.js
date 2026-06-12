import { defaultFaqTemplate } from "../data/agentFaqData";
import { defaultKnowledgeTemplate } from "../data/agentKnowledgeData";
import { defaultTerminologyTemplate } from "../data/agentTerminologyData";
import { defaultTrainingDataset } from "../components/AgentTrainingDataset";
import { PRESENTATION_SLIDES } from "../data/presentationData";
import { defaultMaterialItems } from "../data/materialsData";
import { defaultVideoScripts } from "../data/videoScriptsData";

export const CRM_MY_TASKS_STORAGE_KEY = "atlas.analytics.crmMyTasks.v1";

export function normalizeCrmMyTasks(tasks) {
  return Array.isArray(tasks) ? tasks.map((task) => ({
    id: task.id || `my-task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: task.title || "",
    details: task.details || "",
    dueDate: task.dueDate || getTodayInputDate(),
    done: Boolean(task.done),
    updatedAt: task.updatedAt || "",
  })) : [];
}

export function readStoredCrmMyTasks() {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(CRM_MY_TASKS_STORAGE_KEY);
    return normalizeCrmMyTasks(saved ? JSON.parse(saved) : []);
  } catch {
    return [];
  }
}

export function downloadCsv(csvContent) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "analytics-export-ru.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function getRiskTone(value) {
  return value > 0 ? "danger" : "success";
}

export function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function formatDays(value) {
  if (!Number.isFinite(value) || value <= 0) return "0 дн";
  return value >= 10 ? `${Math.round(value)} дн` : `${value.toFixed(1)} дн`;
}

export function getMetricValue(metrics = [], title) {
  return metrics.find((item) => item.title === title)?.value ?? 0;
}

export function getDoneTaskCount(tasks = []) {
  return tasks.filter((task) => task?.status === "Готово" || task?.done === true).length;
}

export function buildCrmTaskStats(source) {
  const boards = [
    ["Запуск", source.launch],
    ["Маркетинг", source.marketing],
    ["База знаний", source.knowledgeBase],
    ["Идеи", source.ideas],
  ];

  return boards.map(([label, tasks]) => ({
    label,
    total: tasks.length,
    done: getDoneTaskCount(tasks),
    inWork: tasks.filter((task) => task?.status === "В работе").length,
    left: Math.max(tasks.length - getDoneTaskCount(tasks), 0),
    focus: tasks.filter((task) => task?.focus && task?.status !== "Готово" && task?.done !== true).length,
  }));
}

export function parseCrmTaskDate(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const ruMatch = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);

  if (isoMatch) return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  if (ruMatch) return new Date(Number(ruMatch[3]), Number(ruMatch[2]) - 1, Number(ruMatch[1]));
  return null;
}

export function getCrmTaskTiming(task) {
  if (task?.done || task?.status === "Готово") return "done";
  const dueDate = parseCrmTaskDate(task?.dueDate);
  if (!dueDate || Number.isNaN(dueDate.getTime())) return "no-date";
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekEnd = new Date(startToday);
  weekEnd.setDate(startToday.getDate() + 7);

  if (dueDate < startToday) return "overdue";
  if (dueDate.getTime() === startToday.getTime()) return "today";
  if (dueDate <= weekEnd) return "week";
  return "later";
}

export function buildCrmTaskOverview(source) {
  const allTasks = [
    ...(source.launch || []),
    ...(source.marketing || []),
    ...(source.knowledgeBase || []),
    ...(source.ideas || []),
  ];

  return allTasks.reduce(
    (result, task) => {
      const timing = getCrmTaskTiming(task);
      if (timing === "overdue") result.overdue += 1;
      if (timing === "today") result.today += 1;
      if (timing === "week") result.week += 1;
      if (task?.focus && timing !== "done") result.focus += 1;
      if (!task?.assignee && timing !== "done") result.unassigned += 1;
      return result;
    },
    { overdue: 0, today: 0, week: 0, focus: 0, unassigned: 0, total: allTasks.length, done: getDoneTaskCount(allTasks) },
  );
}

export function buildAiTaskSummary(overview, taskTotals, archive = [], history = []) {
  const alerts = [];

  if (overview.overdue) alerts.push(`${overview.overdue} задач просрочено. Их лучше разобрать первыми: либо закрыть, либо перенести дату.`);
  if (overview.unassigned) alerts.push(`${overview.unassigned} активных задач без исполнителя. Это главная зона расплывания ответственности.`);
  if (overview.focus > 5) alerts.push(`В фокусе ${overview.focus} задач. Для недели лучше оставить 3-5, иначе фокус превращается в обычный список.`);
  if (!overview.focus) alerts.push("Фокус недели пуст. Стоит закрепить несколько задач звёздочкой в разделе задач.");
  if (taskTotals.left > 0 && taskTotals.inWork === 0) alerts.push("Есть незакрытые задачи, но нет задач в статусе «В работе». Нужно оживить статусы.");
  if (!alerts.length) alerts.push("Критичных провалов не видно: задачи распределены, фокус есть, просрочки нет.");

  return {
    score: Math.max(0, 100 - overview.overdue * 12 - overview.unassigned * 6 - Math.max(overview.focus - 5, 0) * 4),
    alerts,
    archiveCount: archive.length,
    historyCount: history.length,
  };
}

export function countTemplateRows(template, fallbackTemplate) {
  const source = template?.sections ? template : fallbackTemplate;
  return (source.sections || []).reduce((sum, section) => sum + (Array.isArray(section.rows) ? section.rows.length : 0), 0);
}

export function countDatasetBlocks(dataset, fallbackDataset) {
  const source = Array.isArray(dataset?.blocks) ? dataset : fallbackDataset;
  return Array.isArray(source?.blocks) ? source.blocks.length : 0;
}

export function buildCrmContentStats(source = {}) {
  const materials = Array.isArray(source.materials) ? source.materials : defaultMaterialItems;
  const videos = Array.isArray(source.videos) ? source.videos : defaultVideoScripts;

  return [
    ["Материалы", materials.length, "файлов", "success"],
    ["Параметры", countTemplateRows(source.knowledge, defaultKnowledgeTemplate), "параметров", "accent"],
    ["Датасет", countDatasetBlocks(source.dataset, defaultTrainingDataset), "блоков", "success"],
    ["FAQ", countTemplateRows(source.faq, defaultFaqTemplate), "вопросов", "success"],
    ["Презентация", 16, "слайдов", "accent"],
    ["CEO", PRESENTATION_SLIDES.length, "слайдов", "accent"],
    ["Ролики", videos.length, "роликов", "success"],
    ["Термины", countTemplateRows(source.terminology, defaultTerminologyTemplate), "терминов", "accent"],
  ];
}

export function getTodayInputDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildDashboardLiveFeed(cycleTypes = [], direction = "incoming") {
  const fallbackRows = [
    { cycleType: "Launch", todayCreated: 12, todayIncoming: 5400, todayOutgoing: 3180 },
    { cycleType: "Momentum", todayCreated: 9, todayIncoming: 7200, todayOutgoing: 4100 },
    { cycleType: "Core", todayCreated: 7, todayIncoming: 11800, todayOutgoing: 6900 },
    { cycleType: "Elite", todayCreated: 3, todayIncoming: 15400, todayOutgoing: 8200 },
  ];
  const sourceRows = cycleTypes.length ? cycleTypes : fallbackRows;
  const timeSlots = ["12:04:18", "12:06:42", "12:08:11", "12:11:35", "12:14:22", "12:18:07"];

  return sourceRows.slice(0, 6).map((row, index) => {
    const amount = direction === "incoming" ? Number(row.todayIncoming || 0) : Number(row.todayOutgoing || 0);
    const walletTail = String(4312 + index * 217).slice(-4);

    return {
      id: `${direction}-${row.cycleType}-${index}`,
      label: row.cycleType,
      wallet: `0xA7F...${walletTail}`,
      txCount: Number(row.todayCreated || 0),
      amount,
      time: timeSlots[index] || "12:20:00",
    };
  });
}

export function buildDashboardTicketItems(alerts = [], recommendations = []) {
  const fallback = [
    "Пользователь не понимает, почему цикл не закрылся вовремя.",
    "Нужно проверить повторный вход после выплаты.",
    "Поддержка просит пояснение по начислению партнёрки.",
  ];
  const source = [...alerts, ...recommendations].map((item) => item?.text || item).filter(Boolean);

  return (source.length ? source : fallback).slice(0, 3).map((text, index) => ({
    id: `ticket-${index}`,
    title: text,
    meta: index === 0 ? "Высокий приоритет" : index === 1 ? "Новый тикет" : "Ожидает ответ",
  }));
}

export function buildDashboardTaskItems(actions = []) {
  const fallback = [
    "Проверить окно 72h по завтрашним выплатам.",
    "Сверить рост входящих с повторами базы.",
    "Посмотреть продукт с максимальным payout pressure.",
  ];
  const source = actions.map((item) => item?.title || item?.label || item).filter(Boolean);

  return (source.length ? source : fallback).slice(0, 3).map((title, index) => ({
    id: `task-${index}`,
    title,
    meta: index === 0 ? "Сегодня" : index === 1 ? "В работе" : "Нужно проверить",
  }));
}

export function buildDashboardChatItems() {
  return [
    { id: "chat-1", author: "ВП", text: "Слежу за входящими, пока пул держится ровно.", time: "12:09" },
    { id: "chat-2", author: "КС", text: "Поддержка просит быстрее разобрать тикеты по циклам.", time: "12:12" },
    { id: "chat-3", author: "АМ", text: "Маркетинг дал всплеск, смотрю конверсию в активации.", time: "12:16" },
  ];
}

export const ACTIVATION_PERIOD_OPTIONS = [
  { value: "1d", label: "За день" },
  { value: "30d", label: "За месяц" },
  { value: "365d", label: "За год" },
  { value: "all", label: "За весь период" },
];

export const ACTIVATION_PAGE_SIZE = 10;

export function getLatestLifecycleDate(rows = []) {
  const timestamps = rows
    .map((row) => new Date(row.date).getTime())
    .filter((value) => Number.isFinite(value));

  return timestamps.length ? new Date(Math.max(...timestamps)) : null;
}

export function filterLifecycleRows(rows = [], period) {
  if (period === "all") return rows;

  const latestDate = getLatestLifecycleDate(rows);
  if (!latestDate) return rows;

  const daysMap = {
    "1d": 1,
    "30d": 30,
    "365d": 365,
  };

  const selectedDays = daysMap[period] ?? 30;
  const fromTime = latestDate.getTime() - (selectedDays - 1) * 24 * 60 * 60 * 1000;

  return rows.filter((row) => {
    const rowTime = new Date(row.date).getTime();
    return Number.isFinite(rowTime) && rowTime >= fromTime;
  });
}

export function buildLifecycleSummary(rows = [], periodLabel) {
  const summary = rows.reduce(
    (accumulator, row) => {
      accumulator.registrations += Number(row.registrations || 0);
      accumulator.walletConnects += Number(row.walletConnects || 0);
      accumulator.cycleActivations += Number(row.cycleActivations || 0);
      return accumulator;
    },
    { registrations: 0, walletConnects: 0, cycleActivations: 0 },
  );

  const walletConnectRate = summary.registrations ? (summary.walletConnects / summary.registrations) * 100 : 0;
  const cycleActivationRate = summary.walletConnects ? (summary.cycleActivations / summary.walletConnects) * 100 : 0;

  return [
    {
      period: periodLabel,
      registrations: summary.registrations,
      walletConnects: summary.walletConnects,
      walletConnectRate,
      cycleActivations: summary.cycleActivations,
      cycleActivationRate,
    },
  ];
}
