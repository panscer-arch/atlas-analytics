import AnalyticsHeader from "./components/AnalyticsHeader";
import AnalyticsTabs from "./components/AnalyticsTabs";
import AnalyticsBoardEmbed from "./components/AnalyticsBoardEmbed";
import AnalyticsMainPanel from "./components/AnalyticsMainPanel";
import { AGENT_FAQ_STORAGE_KEY, defaultFaqTemplate } from "./components/AgentFaqTemplate";
import { AGENT_KNOWLEDGE_STORAGE_KEY, defaultKnowledgeTemplate } from "./components/AgentKnowledgeTemplate";
import { AGENT_TERMINOLOGY_STORAGE_KEY, defaultTerminologyTemplate } from "./components/AgentTerminologyTemplate";
import { AGENT_TRAINING_DATASET_STORAGE_KEY, defaultTrainingDataset } from "./components/AgentTrainingDataset";
import { PRESENTATION_SLIDES } from "./components/AtlasPresentationBoard";
import {
  IDEAS_CHECKLIST_STORAGE_KEY,
  KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY,
  LAUNCH_CHECKLIST_STORAGE_KEY,
  MARKETING_CHECKLIST_STORAGE_KEY,
  TASK_ARCHIVE_STORAGE_KEY,
  TASK_HISTORY_STORAGE_KEY,
  defaultIdeasChecklistTasks,
  defaultKnowledgeBaseChecklistTasks,
  defaultLaunchChecklistTasks,
  defaultMarketingChecklistTasks,
} from "./components/LaunchChecklistSection";
import { MATERIALS_STORAGE_KEY, defaultMaterialItems } from "./components/MaterialsLinksBoard";
import { VIDEO_SCRIPTS_STORAGE_KEY, defaultVideoScripts } from "./components/VideoScriptsBoard";
import EmptyState from "./components/EmptyState";
import LoadingState from "./components/LoadingState";
import Wrapper from "./components/Wrapper";
import QuickNotesModal from "./components/QuickNotesModal";
import useAnalyticsData from "./hooks/useAnalyticsData";
import { exportAnalyticsCsv } from "./services/analyticsApi";
import { loadServerContent, saveServerContent } from "./services/contentStore";
import formatCurrency from "./utils/formatCurrency";
import "./styles/analytics.css";
import { useEffect, useRef, useState } from "react";

const ANALYTICS_BOARD_URL = (import.meta.env.VITE_ANALYTICS_BOARD_URL || "/analytics-board/").trim() || "/analytics-board/";
const ATLAS_SITE_PREVIEW_URL = "/atlas-site-preview/index.html";
const CRM_MY_TASKS_STORAGE_KEY = "atlas.analytics.crmMyTasks.v1";

function normalizeCrmMyTasks(tasks) {
  return Array.isArray(tasks) ? tasks.map((task) => ({
    id: task.id || `my-task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: task.title || "",
    details: task.details || "",
    dueDate: task.dueDate || getTodayInputDate(),
    done: Boolean(task.done),
    updatedAt: task.updatedAt || "",
  })) : [];
}

function readStoredCrmMyTasks() {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(CRM_MY_TASKS_STORAGE_KEY);
    return normalizeCrmMyTasks(saved ? JSON.parse(saved) : []);
  } catch {
    return [];
  }
}

function downloadCsv(csvContent) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "analytics-export-ru.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function getRiskTone(value) {
  return value > 0 ? "danger" : "success";
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDays(value) {
  if (!Number.isFinite(value) || value <= 0) return "0 дн";
  return value >= 10 ? `${Math.round(value)} дн` : `${value.toFixed(1)} дн`;
}

function getMetricValue(metrics = [], title) {
  return metrics.find((item) => item.title === title)?.value ?? 0;
}

function getDoneTaskCount(tasks = []) {
  return tasks.filter((task) => task?.status === "Готово" || task?.done === true).length;
}

function buildCrmTaskStats(source) {
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

function parseCrmTaskDate(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const ruMatch = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);

  if (isoMatch) return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  if (ruMatch) return new Date(Number(ruMatch[3]), Number(ruMatch[2]) - 1, Number(ruMatch[1]));
  return null;
}

function getCrmTaskTiming(task) {
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

function buildCrmTaskOverview(source) {
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

function buildAiTaskSummary(overview, taskTotals, archive = [], history = []) {
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

function countTemplateRows(template, fallbackTemplate) {
  const source = template?.sections ? template : fallbackTemplate;
  return (source.sections || []).reduce((sum, section) => sum + (Array.isArray(section.rows) ? section.rows.length : 0), 0);
}

function countDatasetBlocks(dataset, fallbackDataset) {
  const source = Array.isArray(dataset?.blocks) ? dataset : fallbackDataset;
  return Array.isArray(source?.blocks) ? source.blocks.length : 0;
}

function buildCrmContentStats(source = {}) {
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

function getTodayInputDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDashboardLiveFeed(cycleTypes = [], direction = "incoming") {
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

function buildDashboardTicketItems(alerts = [], recommendations = []) {
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

function buildDashboardTaskItems(actions = []) {
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

function buildDashboardChatItems() {
  return [
    { id: "chat-1", author: "ВП", text: "Слежу за входящими, пока пул держится ровно.", time: "12:09" },
    { id: "chat-2", author: "КС", text: "Поддержка просит быстрее разобрать тикеты по циклам.", time: "12:12" },
    { id: "chat-3", author: "АМ", text: "Маркетинг дал всплеск, смотрю конверсию в активации.", time: "12:16" },
  ];
}

const ACTIVATION_PERIOD_OPTIONS = [
  { value: "1d", label: "За день" },
  { value: "30d", label: "За месяц" },
  { value: "365d", label: "За год" },
  { value: "all", label: "За весь период" },
];

const ACTIVATION_PAGE_SIZE = 10;

function getLatestLifecycleDate(rows = []) {
  const timestamps = rows
    .map((row) => new Date(row.date).getTime())
    .filter((value) => Number.isFinite(value));

  return timestamps.length ? new Date(Math.max(...timestamps)) : null;
}

function filterLifecycleRows(rows = [], period) {
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

function buildLifecycleSummary(rows = [], periodLabel) {
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

function scrollToSection(sectionId) {
  if (typeof document === "undefined") return;

  window.requestAnimationFrame(() => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

function getInitialAnalyticsTab() {
  if (typeof window === "undefined") return "dashboard";

  const url = new URL(window.location.href);
  if (url.searchParams.get("b") === "d") return "tasks";
  const board = url.searchParams.get("board");
  const contentBoards = new Set(["materials", "presentation", "productLibrary", "agentTasks", "agentDataset", "agentFaq", "ceoPresentation", "whitePaper", "legalDocs", "videoScripts", "terminology", "securityReview", "transportRiskFaq"]);
  const taskBoards = new Set(["launch", "ideas", "marketing", "knowledgeBase"]);

  if (board === "socialSubscriptions") return "socialSubscriptions";
  if (contentBoards.has(board)) return "content";
  if (taskBoards.has(board)) return "tasks";
  if (board) return "tasks";
  return "dashboard";
}

function getInitialAnalyticsSectionTab() {
  return "dashboard";
}

function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState(getInitialAnalyticsTab);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState(getInitialAnalyticsSectionTab);
  const [isBoardOpen, setIsBoardOpen] = useState(false);
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);
  const [activationPeriod, setActivationPeriod] = useState("30d");
  const [activationPage, setActivationPage] = useState(1);
  const [graphsOpenSignal, setGraphsOpenSignal] = useState(0);
  const [crmMyTasks, setCrmMyTasks] = useState(readStoredCrmMyTasks);
  const [isCrmMyTasksLoaded, setIsCrmMyTasksLoaded] = useState(false);
  const [crmMyTasksSaveState, setCrmMyTasksSaveState] = useState("Сохранено");
  const [expandedMyTaskId, setExpandedMyTaskId] = useState("");
  const [newMyTask, setNewMyTask] = useState({ title: "", dueDate: getTodayInputDate() });
  const [isAiReviewOpen, setIsAiReviewOpen] = useState(false);
  const crmMyTasksSaveRef = useRef(0);
  const [crmTaskSource, setCrmTaskSource] = useState({
    launch: defaultLaunchChecklistTasks,
    marketing: defaultMarketingChecklistTasks,
    knowledgeBase: defaultKnowledgeBaseChecklistTasks,
    ideas: defaultIdeasChecklistTasks,
  });
  const [crmTaskArchive, setCrmTaskArchive] = useState([]);
  const [crmTaskHistory, setCrmTaskHistory] = useState([]);
  const [crmTaskStats, setCrmTaskStats] = useState(() => buildCrmTaskStats({
    launch: defaultLaunchChecklistTasks,
    marketing: defaultMarketingChecklistTasks,
    knowledgeBase: defaultKnowledgeBaseChecklistTasks,
    ideas: defaultIdeasChecklistTasks,
  }));
  const [crmContentStats, setCrmContentStats] = useState(() => buildCrmContentStats());
  const { data, isLoading } = useAnalyticsData();

  useEffect(() => {
    let isMounted = true;

    loadServerContent(CRM_MY_TASKS_STORAGE_KEY).then((savedTasks) => {
      if (!isMounted) return;
      if (Array.isArray(savedTasks)) {
        const normalizedTasks = normalizeCrmMyTasks(savedTasks);
        setCrmMyTasks(normalizedTasks);
        try {
          window.localStorage.setItem(CRM_MY_TASKS_STORAGE_KEY, JSON.stringify(normalizedTasks));
        } catch {
          // Серверная версия уже загружена в состояние страницы.
        }
      }
      setIsCrmMyTasksLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isCrmMyTasksLoaded) return undefined;

    const saveTimer = window.setTimeout(() => {
      const requestId = crmMyTasksSaveRef.current + 1;
      crmMyTasksSaveRef.current = requestId;
      const normalizedTasks = normalizeCrmMyTasks(crmMyTasks);
      setCrmMyTasksSaveState("Сохраняю...");

      try {
        window.localStorage.setItem(CRM_MY_TASKS_STORAGE_KEY, JSON.stringify(normalizedTasks));
      } catch {
        // Личный блок задач продолжит работать в состоянии страницы.
      }

      saveServerContent(CRM_MY_TASKS_STORAGE_KEY, normalizedTasks).then((ok) => {
        if (crmMyTasksSaveRef.current !== requestId) return;
        setCrmMyTasksSaveState(ok ? "Сохранено на сервере" : "Ошибка сохранения");
      });
    }, 450);

    return () => window.clearTimeout(saveTimer);
  }, [crmMyTasks, isCrmMyTasksLoaded]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      loadServerContent(LAUNCH_CHECKLIST_STORAGE_KEY),
      loadServerContent(MARKETING_CHECKLIST_STORAGE_KEY),
      loadServerContent(IDEAS_CHECKLIST_STORAGE_KEY),
      loadServerContent(KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY),
      loadServerContent(TASK_ARCHIVE_STORAGE_KEY),
      loadServerContent(TASK_HISTORY_STORAGE_KEY),
    ]).then(([launch, marketing, ideas, knowledgeBase, archive, history]) => {
      if (!isMounted) return;

      const taskSource = {
        launch: Array.isArray(launch) ? launch : defaultLaunchChecklistTasks,
        marketing: Array.isArray(marketing) ? marketing : defaultMarketingChecklistTasks,
        knowledgeBase: Array.isArray(knowledgeBase) ? knowledgeBase : defaultKnowledgeBaseChecklistTasks,
        ideas: Array.isArray(ideas) ? ideas : defaultIdeasChecklistTasks,
      };

      setCrmTaskSource(taskSource);
      setCrmTaskStats(buildCrmTaskStats(taskSource));
      setCrmTaskArchive(Array.isArray(archive) ? archive : []);
      setCrmTaskHistory(Array.isArray(history) ? history : []);
    });

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      loadServerContent(MATERIALS_STORAGE_KEY),
      loadServerContent(AGENT_KNOWLEDGE_STORAGE_KEY),
      loadServerContent(AGENT_TRAINING_DATASET_STORAGE_KEY),
      loadServerContent(AGENT_FAQ_STORAGE_KEY),
      loadServerContent(VIDEO_SCRIPTS_STORAGE_KEY),
      loadServerContent(AGENT_TERMINOLOGY_STORAGE_KEY),
    ]).then(([materials, knowledge, dataset, faq, videos, terminology]) => {
      if (!isMounted) return;

      setCrmContentStats(buildCrmContentStats({ materials, knowledge, dataset, faq, videos, terminology }));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isBoardOpen || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsBoardOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBoardOpen]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!data || !data.table.length) {
    return (
      <main className="analytics-layout">
        <EmptyState />
      </main>
    );
  }

  const gapTone = getRiskTone(data.kpis.gapToday);
  const riskTone = data.kpis.firstRiskDate === "без риска" ? "success" : "danger";
  const cashPosition = data.kpis.cashPosition || {};
  const trafficTabData = data.tabsData?.traffic || {
    summary: { title: "Нет данных по трафику", description: "Пока нет live-данных для этого среза.", bullets: [] },
    metrics: [],
    countries: [],
    sources: [],
    funnel: [],
    conversion: [],
    qualityRows: [],
    lifecycleRows: [],
    lifecycleTotals: [],
    sourceQualityRows: [],
    timeline: [],
    countryShare: [],
  };
  const productsTabData = data.tabsData?.products || { metrics: [], rows: [] };
  const reinvestTabData = data.tabsData?.reinvest || {
    summary: { title: "Нет данных по реинвесту", description: "Пока нет данных по возврату капитала.", bullets: [] },
    metrics: [],
    byProduct: [],
    byCountry: [],
    timeline: [],
    productShare: [],
  };
  const filteredLifecycleRows = filterLifecycleRows(trafficTabData.lifecycleRows, activationPeriod);
  const activationTotalPages = Math.max(1, Math.ceil(filteredLifecycleRows.length / ACTIVATION_PAGE_SIZE));
  const safeActivationPage = Math.min(activationPage, activationTotalPages);
  const pagedLifecycleRows = filteredLifecycleRows.slice(
    (safeActivationPage - 1) * ACTIVATION_PAGE_SIZE,
    safeActivationPage * ACTIVATION_PAGE_SIZE,
  );
  const activationPeriodLabel = ACTIVATION_PERIOD_OPTIONS.find((option) => option.value === activationPeriod)?.label ?? "За период";
  const filteredLifecycleTotals = buildLifecycleSummary(filteredLifecycleRows, activationPeriodLabel);
  const outgoingToday = cashPosition.outgoingFact ?? data.kpis.outgoingToday ?? 0;
  const incomingToday = cashPosition.incomingFact ?? data.kpis.incomingToday ?? data.kpis.factToday ?? 0;
  const contractNetFlowToday = data.kpis.contractNetFlowToday ?? incomingToday - outgoingToday;
  const averageDailyContractLoad = (data.kpis.obligations7d + data.kpis.referralBurden + data.kpis.platformFee) / 7;
  const runwayDays = averageDailyContractLoad > 0 ? (cashPosition.availableCash ?? 0) / averageDailyContractLoad : 0;
  const outgoingCoverage = outgoingToday > 0 ? (incomingToday / outgoingToday) * 100 : 100;
  const reinvestCapitalRate = getMetricValue(reinvestTabData.metrics, "Reinvest capital rate");
  const repeatDepositRate = getMetricValue(reinvestTabData.metrics, "Repeat deposit rate");
  const overviewOperations = data.overviewOperations || { periods: [], cycleTypes: [] };
  const next72h = data.next72h || [];
  const yesterdaySnapshot = overviewOperations.periods.find((item) => item.period === "Вчера") || null;
  const todaySnapshot = overviewOperations.periods.find((item) => item.period === "Сегодня") || null;
  const weekSnapshot = overviewOperations.periods.find((item) => item.period === "7 дней") || null;
  const yesterdayNetFlow = (yesterdaySnapshot?.incoming || 0) - (yesterdaySnapshot?.outgoing || 0);
  const dashboardIncomingFeed = buildDashboardLiveFeed(overviewOperations.cycleTypes, "incoming");
  const dashboardOutgoingFeed = buildDashboardLiveFeed(overviewOperations.cycleTypes, "outgoing");
  const dashboardTickets = buildDashboardTicketItems(data.insights?.alerts || [], data.insights?.recommendations || []);
  const dashboardTasks = buildDashboardTaskItems(data.priorityActions || []);
  const dashboardChat = buildDashboardChatItems();
  const dashboardPoolValue = cashPosition.closingBalance ?? cashPosition.availableCash ?? 0;

  function handleOpenCharts() {
    setActiveTab("analytics");
    setActiveAnalyticsTab("overview");
    setGraphsOpenSignal((current) => current + 1);
    window.setTimeout(() => scrollToSection("overview-graphs"), 60);
  }

  function handleToggleBoard() {
    setIsBoardOpen((current) => !current);
  }

  function handleAddMyTask() {
    const title = newMyTask.title.trim();
    if (!title) return;

    setCrmMyTasks((current) => [
      ...current,
      {
        id: `my-task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        details: "",
        dueDate: newMyTask.dueDate || getTodayInputDate(),
        done: false,
        updatedAt: new Date().toISOString(),
      },
    ]);
    setNewMyTask({ title: "", dueDate: newMyTask.dueDate || getTodayInputDate() });
  }

  function updateMyTask(taskId, patch) {
    setCrmMyTasks((current) => current.map((task) => (task.id === taskId ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task)));
  }

  function deleteMyTask(taskId) {
    setCrmMyTasks((current) => current.filter((task) => task.id !== taskId));
  }

  const primaryKpis = [
    {
      title: "Пришло сегодня",
      value: cashPosition.incomingFact ?? data.kpis.factToday,
      variant: "currency",
      tone: "success",
      icon: "inflow",
      statusLabel: "вход",
      description: "Новый приток за день.",
      emphasis: true,
    },
    {
      title: "Выплаты сегодня",
      value: cashPosition.outgoingFact ?? 0,
      variant: "currency",
      tone: (cashPosition.outgoingFact || 0) > 0 ? "accent" : "default",
      icon: "claim",
      statusLabel: "выход",
      description: "Всё, что ушло за день.",
      emphasis: true,
    },
    {
      title: "Цель на сегодня",
      value: data.kpis.targetToday,
      variant: "currency",
      tone: gapTone,
      icon: "target",
      statusLabel: `${Math.max(0, Math.round((data.kpis.factToday / Math.max(data.kpis.targetToday, 1)) * 100))}%`,
      description: `План дня с учётом хвоста. Уже закрыто ${data.kpis.factToday}.`,
      emphasis: true,
      pulse: gapTone === "danger",
    },
    {
      title: "Доступный остаток",
      value: cashPosition.availableCash ?? 0,
      variant: "currency",
      tone: "accent",
      icon: "wallet",
      statusLabel: cashPosition.closingBalance ? `баланс ${cashPosition.closingBalance}` : "cash",
      description: "Свободные деньги после резервов.",
      emphasis: true,
    },
    {
      title: "Первая дата риска",
      value: data.kpis.firstRiskDate,
      variant: "text",
      tone: riskTone,
      icon: "accrued",
      statusLabel: data.kpis.firstRiskGap ? `${data.kpis.firstRiskGap}` : "нет",
      description: "Ближайшая дата кассового риска.",
      pulse: riskTone === "danger",
      emphasis: true,
    },
  ];

  const structureKpis = [
    { title: "Требуемый новый приток", value: data.kpis.requiredNewMoney, variant: "currency", tone: "accent", icon: "inflow", statusLabel: "30д", description: "Нужно на 30 дней." },
    { title: "Реферальная нагрузка", value: data.kpis.referralBurden, variant: "currency", icon: "network", statusLabel: "7д", description: "Ближайшая рефералка." },
    { title: "Комиссия платформы", value: data.kpis.platformFee, variant: "currency", icon: "fee", statusLabel: "7д", description: "Ближайшая комиссия." },
    { title: "Ваш остаток", value: data.kpis.operatorNet, variant: "currency", tone: "accent", icon: "wallet", statusLabel: "net", description: "После обязательств." },
    { title: "Можно забрать сейчас", value: data.kpis.claimableNow, variant: "currency", tone: "success", icon: "claim", statusLabel: "claim", description: "Уже доступно." },
    { title: "Начислено, но не выведено", value: data.kpis.accruedLater, variant: "currency", tone: "accent", icon: "accrued", statusLabel: "accrued", description: "Ещё не забрано." },
  ];

  const contractPulseKpis = [
    {
      title: "Чистый поток дня",
      value: contractNetFlowToday,
      variant: "currency",
      tone: contractNetFlowToday >= 0 ? "success" : "danger",
      icon: "fact",
      statusLabel: contractNetFlowToday >= 0 ? "plus" : "минус",
      description: "Что осталось после всех выходов дня.",
      pulse: contractNetFlowToday < 0,
    },
    {
      title: "Покрытие исходящего потока",
      value: outgoingCoverage,
      variant: "percent",
      tone: outgoingCoverage >= 100 ? "success" : "danger",
      icon: "target",
      statusLabel: `${formatCurrency(outgoingToday)}`,
      description: "Перекрыл ли входящий поток все выплаты дня.",
      pulse: outgoingCoverage < 100,
    },
    {
      title: "Запас контракта",
      value: formatDays(runwayDays),
      variant: "text",
      tone: runwayDays >= 7 ? "success" : runwayDays >= 3 ? "accent" : "danger",
      icon: "calendar",
      statusLabel: formatCurrency(cashPosition.availableCash ?? 0),
      description: "На сколько дней хватит текущего остатка.",
      pulse: runwayDays < 3,
    },
    {
      title: "Возврат в контракт",
      value: reinvestCapitalRate,
      variant: "percent",
      tone: reinvestCapitalRate >= 35 ? "success" : reinvestCapitalRate >= 20 ? "accent" : "danger",
      icon: "claim",
      statusLabel: formatPercent(repeatDepositRate),
      description: "Сколько капитала вернулось обратно.",
    },
  ];

  const operationalSnapshotKpis = [
    {
      title: "Входящий вчера",
      value: yesterdaySnapshot?.incoming || 0,
      variant: "currency",
      icon: "inflow",
      statusLabel: "вчера",
      description: "Быстрое сравнение со сегодня.",
    },
    {
      title: "Выплачено за 7 дней",
      value: weekSnapshot?.outgoing || 0,
      variant: "currency",
      icon: "claim",
      statusLabel: "7д",
      description: "Полный исходящий поток недели.",
    },
    {
      title: "Новые деньги сегодня",
      value: todaySnapshot?.newMoney || 0,
      variant: "currency",
      icon: "users",
      statusLabel: todaySnapshot?.incoming ? `${Math.round(((todaySnapshot?.newMoney || 0) / todaySnapshot.incoming) * 100)}%` : "0%",
      description: "Деньги от новых пользователей.",
    },
    {
      title: "Повторные деньги сегодня",
      value: todaySnapshot?.existingMoney || 0,
      variant: "currency",
      icon: "wallet",
      statusLabel: todaySnapshot?.incoming ? `${Math.round(((todaySnapshot?.existingMoney || 0) / todaySnapshot.incoming) * 100)}%` : "0%",
      description: "Деньги от возврата базы.",
    },
    {
      title: "Выплачено вчера",
      value: yesterdaySnapshot?.outgoing || 0,
      variant: "currency",
      icon: "claim",
      statusLabel: "вчера",
      description: "Полный исходящий поток вчера.",
    },
    {
      title: "Чистый поток вчера",
      value: yesterdayNetFlow,
      variant: "currency",
      tone: yesterdayNetFlow >= 0 ? "success" : "danger",
      icon: "fact",
      statusLabel: yesterdayNetFlow >= 0 ? "plus" : "минус",
      description: "Что осталось после вчерашнего дня.",
      pulse: yesterdayNetFlow < 0,
    },
  ];

  const trafficToMoneyKpis = [
    {
      title: "Регистрации сегодня",
      value: trafficTabData.metrics.find((item) => item.title === "Регистрации сегодня")?.value || 0,
      icon: "users",
      statusLabel: "today",
      description: "Новые регистрации за день.",
    },
    {
      title: "Подключили кошелёк",
      value: trafficTabData.metrics.find((item) => item.title === "Подключили кошелёк")?.value || 0,
      icon: "connected",
      statusLabel:
        trafficTabData.metrics.find((item) => item.title === "Подключили кошелёк")?.statusLabel || "0%",
      description: "Дошли до wallet connect.",
    },
    {
      title: "Активировали цикл",
      value: trafficTabData.metrics.find((item) => item.title === "Активировали цикл")?.value || 0,
      icon: "calendar",
      statusLabel:
        trafficTabData.metrics.find((item) => item.title === "Активировали цикл")?.statusLabel || "0%",
      description: "Запустили smart-cycle.",
    },
    {
      title: "Деньги на 1 активацию",
      value:
        (todaySnapshot?.cycleActivations || 0) > 0
          ? (todaySnapshot?.incoming || 0) / Math.max(todaySnapshot?.cycleActivations || 1, 1)
          : 0,
      variant: "currency",
      icon: "inflow",
      statusLabel: formatCurrency(todaySnapshot?.incoming || 0),
      description: "Средний вклад одной активации.",
    },
  ];

  const web3Cards = [
    { title: "Активные кошельки", value: data.kpis.activeWallets, icon: "active-wallet", statusLabel: "актив", description: "Кошельки с движением денег." },
    { title: "Подключённые кошельки", value: data.kpis.connectedWallets, icon: "connected", statusLabel: "связь", description: "Участвуют в продуктах." },
    { title: "Уникальные кошельки", value: data.kpis.uniqueWallets, icon: "unique", statusLabel: "чисто", description: "Без дублей в текущем срезе." },
    { title: "Количество транзакций", value: data.kpis.transactions, icon: "transactions", statusLabel: "движение", description: "Все успешные действия." },
    { title: "Объём транзакций", value: data.kpis.transactionVolume, variant: "currency", icon: "volume", statusLabel: "объём", description: "Денежный объём операций." },
    { title: "Неуспешные транзакции", value: data.kpis.failedTransactions, tone: data.kpis.failedTransactions > 0 ? "danger" : "success", icon: "failed", statusLabel: data.kpis.failedTransactions > 0 ? "ошибки" : "чисто", pulse: data.kpis.failedTransactions > 0, description: "Ошибки исполнения." },
    { title: "Средний чек транзакции", value: data.kpis.averageTransactionValue, variant: "currency", icon: "average", statusLabel: "среднее", description: "Средний объём одной операции." },
    { title: "Топ-сеть", value: data.kpis.topNetwork, icon: "top-network", statusLabel: "лидер", description: "Самая активная сеть." },
  ];

  const mainTabs = [
    { id: "dashboard", label: "Дашборд" },
    { id: "analytics", label: "Аналитика" },
    { id: "productLibrary", label: "Библиотека" },
    { id: "tasks", label: "Задачи" },
    { id: "content", label: "Контент" },
    { id: "socialSubscriptions", label: "Подписки" },
    { id: "developments", label: "Разработки" },
    { id: "crmBoard", label: "CRM-доска" },
    { id: "quickNotes", label: "Заметки" },
  ];

  const analyticsSectionTabs = [
    { id: "dashboard", label: "Дашборд", hint: "центр" },
    { id: "overview", label: "Обзор", hint: "день" },
    { id: "traffic", label: "Трафик / Онлайн", hint: "онлайн" },
    { id: "products", label: "Продукты / Циклы", hint: "тарифы" },
    { id: "reinvest", label: "Реинвест", hint: "повтор" },
    { id: "base", label: "Состав базы", hint: "роли" },
    { id: "leaders", label: "Лидеры", hint: "топы" },
    { id: "geography", label: "География", hint: "страны" },
    { id: "partner", label: "Партнёрская структура", hint: "ветки" },
    { id: "wallets", label: "Кошельки", hint: "адреса" },
  ];

  const crmAnalyticsCoverageValue = Math.min(Math.max(outgoingCoverage, 0), 100);
  const crmRegistrationsToday = trafficTabData.metrics.find((item) => item.title === "Регистрации сегодня")?.value || 0;
  const crmWalletConnections = trafficTabData.metrics.find((item) => item.title === "Подключили кошелёк")?.value || 0;
  const crmCycleActivations = trafficTabData.metrics.find((item) => item.title === "Активировали цикл")?.value || todaySnapshot?.cycleActivations || 0;
  const crmAnalyticsSignals = [
    ["Входящие", formatCurrency(incomingToday), "success"],
    ["Выплаты", formatCurrency(outgoingToday), "default"],
    ["Покрытие", formatPercent(outgoingCoverage), outgoingCoverage >= 100 ? "success" : "danger"],
    ["Запас", formatDays(runwayDays), runwayDays >= 7 ? "success" : runwayDays >= 3 ? "accent" : "danger"],
  ];
  const crmAnalyticsPulseRows = [
    ["Риск", data.kpis.firstRiskDate, riskTone],
    ["Регистрации", crmRegistrationsToday, "accent"],
    ["Кошельки", crmWalletConnections, "success"],
    ["Активации", crmCycleActivations, "success"],
  ];
  const crmTaskTotals = crmTaskStats.reduce(
    (accumulator, item) => ({
      total: accumulator.total + item.total,
      done: accumulator.done + item.done,
      inWork: accumulator.inWork + item.inWork,
      left: accumulator.left + item.left,
    }),
    { total: 0, done: 0, inWork: 0, left: 0 },
  );
  const crmTaskOverview = buildCrmTaskOverview(crmTaskSource);
  const crmAiTaskSummary = buildAiTaskSummary(crmTaskOverview, crmTaskTotals, crmTaskArchive, crmTaskHistory);
  const crmTaskWidgets = [
    ["В работе", crmTaskTotals.inWork, "accent"],
    ["Осталось", crmTaskTotals.left, crmTaskTotals.left > 0 ? "danger" : "success"],
    ["Сделано", crmTaskTotals.done, "success"],
    ["Просрочено", crmTaskOverview.overdue, crmTaskOverview.overdue ? "danger" : "success"],
    ["Сегодня", crmTaskOverview.today, "accent"],
    ["Фокус", crmTaskOverview.focus, crmTaskOverview.focus ? "success" : "danger"],
  ];
  const crmTaskDoneValue = crmTaskTotals.total ? Math.min((crmTaskTotals.done / crmTaskTotals.total) * 100, 100) : 0;

  function handleMainTabChange(nextTab) {
    if (nextTab === "quickNotes") {
      setIsQuickNotesOpen(true);
      return;
    }

    setActiveTab(nextTab);
  }

  return (
    <main className="analytics-layout">
      <AnalyticsHeader onAiReview={() => {
        setActiveTab("dashboard");
        setIsAiReviewOpen((current) => !current);
      }} />

      <QuickNotesModal isOpen={isQuickNotesOpen} onClose={() => setIsQuickNotesOpen(false)} />

      {isBoardOpen ? <AnalyticsBoardEmbed boardUrl={ANALYTICS_BOARD_URL} onClose={() => setIsBoardOpen(false)} /> : null}

      <Wrapper as="section" marginTop="lg">
        <AnalyticsTabs tabs={mainTabs} activeTab={activeTab} onChange={handleMainTabChange} />
      </Wrapper>

      <AnalyticsMainPanel
        activeTab={activeTab}
        analyticsBoardUrl={ANALYTICS_BOARD_URL}
        crmDashboard={{
          isAiReviewOpen,
          aiTaskSummary: crmAiTaskSummary,
          analyticsTitleValue: dashboardPoolValue,
          analyticsFlowTone: contractNetFlowToday >= 0 ? "positive" : "negative",
          analyticsCoveragePercent: outgoingCoverage,
          analyticsCoverageValue: crmAnalyticsCoverageValue,
          analyticsSignals: crmAnalyticsSignals,
          analyticsPulseRows: crmAnalyticsPulseRows,
          taskTotals: crmTaskTotals,
          taskWidgets: crmTaskWidgets,
          crmTaskStats,
          taskDoneValue: crmTaskDoneValue,
          crmContentStats,
          crmMyTasks,
          crmMyTasksSaveState,
          expandedMyTaskId,
          setExpandedMyTaskId,
          updateMyTask,
          deleteMyTask,
          newMyTask,
          setNewMyTask,
          handleAddMyTask,
        }}
        analyticsSection={{
          activeAnalyticsTab,
          analyticsSectionTabs,
          setActiveAnalyticsTab,
          data,
          overviewOperations,
          cashPosition,
          todaySnapshot,
          contractNetFlowToday,
          next72h,
          trafficTabData,
          reinvestCapitalRate,
          repeatDepositRate,
          productsTabData,
          reinvestTabData,
          primaryKpis,
          contractPulseKpis,
          operationalSnapshotKpis,
          trafficToMoneyKpis,
          graphsOpenSignal,
          activationPeriod,
          periodOptions: ACTIVATION_PERIOD_OPTIONS,
          filteredLifecycleTotals,
          pagedLifecycleRows,
          safeActivationPage,
          activationTotalPages,
          onActivationPeriodChange: (nextPeriod) => {
            setActivationPeriod(nextPeriod);
            setActivationPage(1);
          },
          onActivationPageChange: setActivationPage,
          structureKpis,
        }}
      />

      {activeTab === "analytics" ? (
        <Wrapper as="section" marginTop="lg">
          <div className="analytics-footer-actions">
            <button type="button" className="analytics-export-btn analytics-export-btn-bottom" onClick={() => downloadCsv(exportAnalyticsCsv(data.table))}>
              Экспорт CSV
            </button>
          </div>
        </Wrapper>
      ) : null}
    </main>
  );
}

export default AnalyticsPage;
