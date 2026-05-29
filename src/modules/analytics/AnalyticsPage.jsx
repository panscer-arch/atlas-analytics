import AnalyticsHeader from "./components/AnalyticsHeader";
import MetricsGrid from "./components/MetricsGrid";
import ChartCard from "./components/ChartCard";
import AnalyticsTabs from "./components/AnalyticsTabs";
import AnalyticsDataTable from "./components/AnalyticsDataTable";
import AnalyticsTable from "./components/AnalyticsTable";
import AnalyticsInsights from "./components/AnalyticsInsights";
import AnalyticsScenarios from "./components/AnalyticsScenarios";
import AnalyticsPriorityActions from "./components/AnalyticsPriorityActions";
import AnalyticsCollapsibleSection from "./components/AnalyticsCollapsibleSection";
import AnalyticsBoardEmbed from "./components/AnalyticsBoardEmbed";
import { AGENT_FAQ_STORAGE_KEY, defaultFaqTemplate } from "./components/AgentFaqTemplate";
import { AGENT_KNOWLEDGE_STORAGE_KEY, defaultKnowledgeTemplate } from "./components/AgentKnowledgeTemplate";
import { AGENT_TERMINOLOGY_STORAGE_KEY, defaultTerminologyTemplate } from "./components/AgentTerminologyTemplate";
import { AGENT_TRAINING_DATASET_STORAGE_KEY, defaultTrainingDataset } from "./components/AgentTrainingDataset";
import { PRESENTATION_SLIDES } from "./components/AtlasPresentationBoard";
import LaunchChecklistSection, {
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
import ActivationSection from "./components/ActivationSection";
import TabSummary from "./components/TabSummary";
import SectionHeading from "./components/SectionHeading";
import EmptyState from "./components/EmptyState";
import LoadingState from "./components/LoadingState";
import ProductsTabSection from "./components/ProductsTabSection";
import ProductLibraryBoard from "./components/ProductLibraryBoard";
import DashboardBalance from "./components/DashboardBalance";
import DashboardBlock from "./components/DashboardBlock";
import DashboardKpiCard from "./components/DashboardKpiCard";
import DashboardList from "./components/DashboardList";
import DashboardListRow from "./components/DashboardListRow";
import DashboardMiniTable from "./components/DashboardMiniTable";
import DashboardValue from "./components/DashboardValue";
import Wrapper from "./components/Wrapper";
import QuickNotesModal from "./components/QuickNotesModal";
import CrmCommandDashboard from "./components/CrmCommandDashboard";
import DevelopmentsRegistry from "./components/DevelopmentsRegistry";
import UsersGrowthChart from "./charts/UsersGrowthChart";
import RevenueChart from "./charts/RevenueChart";
import ConversionFunnelChart from "./charts/ConversionFunnelChart";
import TrafficSourcesChart from "./charts/TrafficSourcesChart";
import TrafficLifecycleChart from "./charts/TrafficLifecycleChart";
import RetentionChart from "./charts/RetentionChart";
import CampaignPerformanceChart from "./charts/CampaignPerformanceChart";
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
    ["Презентация", 1, "слайд", "accent"],
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
  const board = url.searchParams.get("board");
  const contentBoards = new Set(["materials", "presentation", "productLibrary", "agentTasks", "agentDataset", "agentFaq", "ceoPresentation", "whitePaper", "videoScripts", "terminology"]);
  const taskBoards = new Set(["launch", "ideas", "marketing", "knowledgeBase"]);

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

  function renderDashboard() {
    const walletRows = (data.tabsData?.wallets?.rows || []).slice(0, 5);
    const geographyRows = (data.tabsData?.geography?.rows || []).slice(0, 5);
    const leaderRows = (data.tabsData?.leaders?.participation || []).slice(0, 5).map((row) => ({
      leader: row.name,
      inflow: row.investment,
      orders: row.cycles,
    }));
    const partnerRows = (data.tabsData?.partner?.rows || []).slice(0, 4);
    const dashboardCycleMix = Object.values(
      overviewOperations.cycleTypes.reduce((accumulator, row) => {
        const sourceKey = String(row.source || "").toLowerCase().includes("daily") ? "Daily Flow" : "Lockup";

        if (!accumulator[sourceKey]) {
          accumulator[sourceKey] = {
            source: sourceKey,
            incomingAmount: 0,
          };
        }

        accumulator[sourceKey].incomingAmount += Number(row.todayIncoming || 0);
        return accumulator;
      }, {}),
    );
    const dashboardKpis = [
      {
        kicker: "Пришло сегодня",
        value: formatCurrency(cashPosition.incomingFact ?? data.kpis.factToday),
        note: `↑ ${formatPercent(18.4)}`,
        sub: "vs вчера",
        tone: "in",
      },
      {
        kicker: "Выплачено сегодня",
        value: formatCurrency(cashPosition.outgoingFact ?? 0),
        note: `↑ ${formatPercent(12.7)}`,
        sub: "vs вчера",
        tone: "out",
      },
      {
        kicker: "Чистый поток",
        value: formatCurrency(contractNetFlowToday),
        note: `↑ ${formatPercent(32.1)}`,
        sub: "vs вчера",
        tone: "net",
      },
      {
        kicker: "Цель на сегодня",
        value: formatCurrency(data.kpis.targetToday),
        note: `${Math.max(0, Math.round((data.kpis.factToday / Math.max(data.kpis.targetToday, 1)) * 100))}%`,
        sub: "выполнено",
        tone: "target",
      },
      {
        kicker: "Первая дата риска",
        value: data.kpis.firstRiskDate === "без риска" ? "Без риска" : String(data.kpis.firstRiskDate).replace(/-/g, " "),
        note: data.kpis.firstRiskGap || "окно 72 часа",
        sub: "окно 72 часа",
        tone: "risk",
      },
    ];
    const cashRows = [
      ["Доступно в пуле", formatCurrency(cashPosition.closingBalance ?? cashPosition.availableCash ?? 0), "success"],
      ["Можно забрать сейчас", formatCurrency(data.kpis.claimableNow), "accent"],
      ["Начислено, но не выведено", formatCurrency(data.kpis.accruedLater), "accent"],
      ["Нужно добрать на 30 дней", formatCurrency(data.kpis.requiredNewMoney), "danger"],
      ["Покрытие ближайшего окна", `${((next72h[0]?.expectedIncoming || 0) / Math.max(next72h[0]?.totalOutgoing || 1, 1)).toFixed(2)}x`, "success"],
    ];
    const conversionRows = [
      ["Регистрации", trafficTabData.metrics.find((item) => item.title === "Регистрации сегодня")?.value || 0, "день"],
      ["Подключили кошелёк", trafficTabData.metrics.find((item) => item.title === "Подключили кошелёк")?.value || 0, trafficTabData.metrics.find((item) => item.title === "Подключили кошелёк")?.statusLabel || "0%"],
      ["Активировали цикл", trafficTabData.metrics.find((item) => item.title === "Активировали цикл")?.value || 0, trafficTabData.metrics.find((item) => item.title === "Активировали цикл")?.statusLabel || "0%"],
      ["Средний чек активации", formatCurrency((todaySnapshot?.incoming || 0) / Math.max(todaySnapshot?.cycleActivations || 1, 1)), "среднее"],
      ["Качество потока", formatPercent(53.8), "в активацию"],
    ];
    const next72hColumns = [
      { key: "period", label: "Период", render: (_row, index) => (index === 0 ? "Сегодня" : index === 1 ? "Завтра" : "День 3") },
      { key: "incoming", label: "Приток", render: (row) => formatCurrency(row.expectedIncoming) },
      { key: "outgoing", label: "Обязательства", render: (row) => formatCurrency(row.totalOutgoing) },
      {
        key: "coverage",
        label: "Покрытие",
        render: (row) => {
          const ratio = (row.expectedIncoming || 0) / Math.max(row.totalOutgoing || 1, 1);
          return <DashboardValue tone={ratio >= 1 ? "success" : "danger"}>{ratio.toFixed(2)}x</DashboardValue>;
        },
      },
    ];
    const cycleColumns = [
      { key: "cycleType", label: "Тариф" },
      { key: "share", label: "Доля", render: (row) => formatPercent((row.todayIncoming / Math.max(todaySnapshot?.incoming || 1, 1)) * 100) },
      { key: "monthCreated", label: "Активные" },
      { key: "averageAmount", label: "Ср. сумма", render: (row) => formatCurrency(row.todayIncoming / Math.max(row.todayCreated || 1, 1)) },
    ];

    return (
      <>
        <section className="mt-4">
          <div className="row g-3">
            {dashboardKpis.map((item) => (
              <div key={item.kicker} className="col-12 col-md-6 col-xl-4 col-xxl">
                <DashboardKpiCard {...item} />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4">
          <div className="row g-3">
            <div className="col-12 col-xl-4">
              <DashboardBlock title="Главная касса дня">
                <DashboardList>
                  {cashRows.map(([label, value, tone]) => (
                    <DashboardListRow key={label} label={label} value={value} tone={tone} />
                  ))}
                </DashboardList>
              </DashboardBlock>
            </div>

            <div className="col-12 col-xl-4">
              <DashboardBlock title="Конверсия дня">
                <DashboardList>
                  {conversionRows.map(([label, value, delta]) => (
                    <DashboardListRow key={label} label={label} value={value} sub={delta} />
                  ))}
                </DashboardList>
              </DashboardBlock>
            </div>

            <div className="col-12 col-xl-4">
              <DashboardBlock title="72 часа">
                <DashboardMiniTable
                  columns={next72hColumns}
                  getRowKey={(row) => row.date}
                  rows={next72h}
                />
              </DashboardBlock>
            </div>
          </div>
        </section>

        <section className="mt-4">
          <div className="row g-3">
            <div className="col-12 col-xxl-7">
              <ChartCard title="Входящий vs исходящий поток" subtitle="Входящий поток, исходящий поток и чистый поток по дню.">
                <UsersGrowthChart data={data.charts.usersGrowth} />
              </ChartCard>
            </div>
            <div className="col-12 col-xxl-5">
              <DashboardBlock title="Продукты / циклы">
                <div className="row g-3 mt-1">
                  <div className="col-12 col-md-5">
                    <ChartCard title="Доли активных циклов" subtitle="Lockup vs Daily Flow.">
                      <TrafficSourcesChart data={dashboardCycleMix} />
                    </ChartCard>
                  </div>
                  <div className="col-12 col-md-7">
                    <DashboardMiniTable
                      columns={cycleColumns}
                      getRowKey={(row) => row.cycleType}
                      rows={overviewOperations.cycleTypes.slice(0, 6)}
                    />
                  </div>
                </div>
              </DashboardBlock>
            </div>
          </div>
        </section>

        <section className="mt-4">
          <div className="row g-3">
            <div className="col-12 col-xl-4">
              <DashboardBlock title="Новые vs повторные деньги">
                <DashboardBalance label="Всего за день" value={formatCurrency(todaySnapshot?.incoming || 0)} />
                <Wrapper marginTop="md">
                  <DashboardList>
                    <DashboardListRow label="Новые деньги" value={formatPercent(((todaySnapshot?.newMoney || 0) / Math.max(todaySnapshot?.incoming || 1, 1)) * 100)} tone="success" />
                    <DashboardListRow label="Повторные деньги" value={formatPercent(((todaySnapshot?.existingMoney || 0) / Math.max(todaySnapshot?.incoming || 1, 1)) * 100)} tone="accent" />
                  </DashboardList>
                </Wrapper>
              </DashboardBlock>
            </div>

            <div className="col-12 col-xl-4">
              <DashboardBlock title="Риск и обязательства">
                <DashboardList>
                  <DashboardListRow label="Обязательства 7 дней" value={formatCurrency(data.kpis.obligations7d)} />
                  <DashboardListRow label="Обязательства 30 дней" value={formatCurrency(data.kpis.obligations30d)} />
                  <DashboardListRow label="Давление выплат" value="76%" tone="danger" />
                  <DashboardListRow label="Ближайший риск" value={data.kpis.firstRiskGap || "3 дня"} tone="danger" />
                </DashboardList>
              </DashboardBlock>
            </div>

            <div className="col-12 col-xl-4">
              <DashboardBlock title="Реинвест">
                <DashboardList>
                  <DashboardListRow label="Reinvest rate" value={formatPercent(reinvestCapitalRate)} tone="success" />
                  <DashboardListRow label="Доля повторных циклов" value={formatPercent(repeatDepositRate)} />
                  <DashboardListRow label="Возврат в систему" value="68.3/100" tone="success" />
                </DashboardList>
              </DashboardBlock>
            </div>
          </div>
        </section>

        <section className="mt-4">
          <div className="row g-3">
            <div className="col-12 col-md-6 col-xxl-3">
              <DashboardBlock title="Кошельки">
                <DashboardList>
                  {walletRows.slice(0, 3).map((row) => (
                    <DashboardListRow key={row.wallet} label={row.wallet} value={formatCurrency(row.inflow)} sub={formatPercent(row.share)} />
                  ))}
                </DashboardList>
              </DashboardBlock>
            </div>

            <div className="col-12 col-md-6 col-xxl-3">
              <DashboardBlock title="География">
                <DashboardList>
                  {geographyRows.slice(0, 3).map((row) => (
                    <DashboardListRow key={row.country} label={row.country} value={formatCurrency(row.inflow)} sub={formatPercent(row.share)} />
                  ))}
                </DashboardList>
              </DashboardBlock>
            </div>

            <div className="col-12 col-md-6 col-xxl-3">
              <DashboardBlock title="Лидеры">
                <DashboardList>
                  {leaderRows.slice(0, 3).map((row) => (
                    <DashboardListRow key={row.leader} label={row.leader} value={formatCurrency(row.inflow)} sub={`${row.orders} циклов`} />
                  ))}
                </DashboardList>
              </DashboardBlock>
            </div>

            <div className="col-12 col-md-6 col-xxl-3">
              <DashboardBlock title="Партнёрская структура">
                <DashboardList>
                  {partnerRows.slice(0, 3).map((row) => (
                    <DashboardListRow key={row.branch} label={row.branch} value={formatCurrency(row.inflow)} sub={`${row.invited} приглаш.`} />
                  ))}
                  <DashboardListRow label="Риск перегруза" value="Высокий" tone="danger" />
                </DashboardList>
              </DashboardBlock>
            </div>
          </div>
        </section>
      </>
    );
  }

  function renderCrmDashboard() {
    const analyticsCoverageWidth = `${Math.min(Math.max(outgoingCoverage, 0), 100)}%`;
    const registrationsToday = trafficTabData.metrics.find((item) => item.title === "Регистрации сегодня")?.value || 0;
    const walletConnections = trafficTabData.metrics.find((item) => item.title === "Подключили кошелёк")?.value || 0;
    const cycleActivations = trafficTabData.metrics.find((item) => item.title === "Активировали цикл")?.value || todaySnapshot?.cycleActivations || 0;
    const analyticsSignals = [
      ["Входящие", formatCurrency(incomingToday), "success"],
      ["Выплаты", formatCurrency(outgoingToday), "default"],
      ["Покрытие", formatPercent(outgoingCoverage), outgoingCoverage >= 100 ? "success" : "danger"],
      ["Запас", formatDays(runwayDays), runwayDays >= 7 ? "success" : runwayDays >= 3 ? "accent" : "danger"],
    ];
    const analyticsPulseRows = [
      ["Риск", data.kpis.firstRiskDate, riskTone],
      ["Регистрации", registrationsToday, "accent"],
      ["Кошельки", walletConnections, "success"],
      ["Активации", cycleActivations, "success"],
    ];
    const taskTotals = crmTaskStats.reduce(
      (accumulator, item) => ({
        total: accumulator.total + item.total,
        done: accumulator.done + item.done,
        inWork: accumulator.inWork + item.inWork,
        left: accumulator.left + item.left,
      }),
      { total: 0, done: 0, inWork: 0, left: 0 },
    );
    const taskOverview = buildCrmTaskOverview(crmTaskSource);
    const aiTaskSummary = buildAiTaskSummary(taskOverview, taskTotals, crmTaskArchive, crmTaskHistory);
    const taskWidgets = [
      ["В работе", taskTotals.inWork, "accent"],
      ["Осталось", taskTotals.left, taskTotals.left > 0 ? "danger" : "success"],
      ["Сделано", taskTotals.done, "success"],
      ["Просрочено", taskOverview.overdue, taskOverview.overdue ? "danger" : "success"],
      ["Сегодня", taskOverview.today, "accent"],
      ["Фокус", taskOverview.focus, taskOverview.focus ? "success" : "danger"],
    ];
    const taskDoneWidth = `${taskTotals.total ? Math.min((taskTotals.done / taskTotals.total) * 100, 100) : 0}%`;

    return (
      <>
        <CrmCommandDashboard
          isAiReviewOpen={isAiReviewOpen}
          aiTaskSummary={aiTaskSummary}
          analyticsTitle={formatCurrency(dashboardPoolValue)}
          analyticsTone={contractNetFlowToday >= 0 ? "is-positive" : "is-negative"}
          analyticsCoverageLabel={formatPercent(outgoingCoverage)}
          analyticsCoverageWidth={analyticsCoverageWidth}
          analyticsSignals={analyticsSignals}
          analyticsPulseRows={analyticsPulseRows}
          taskTotals={taskTotals}
          taskWidgets={taskWidgets}
          crmTaskStats={crmTaskStats}
          taskDoneWidth={taskDoneWidth}
          crmContentStats={crmContentStats}
          crmMyTasks={crmMyTasks}
          crmMyTasksSaveState={crmMyTasksSaveState}
          expandedMyTaskId={expandedMyTaskId}
          setExpandedMyTaskId={setExpandedMyTaskId}
          updateMyTask={updateMyTask}
          deleteMyTask={deleteMyTask}
          newMyTask={newMyTask}
          setNewMyTask={setNewMyTask}
          handleAddMyTask={handleAddMyTask}
        />

      </>
    );
  }

  function renderPageHeader() {
    return <AnalyticsHeader onAiReview={() => {
      setActiveTab("dashboard");
      setIsAiReviewOpen((current) => !current);
    }} />;
  }

  function handleMainTabChange(nextTab) {
    if (nextTab === "quickNotes") {
      setIsQuickNotesOpen(true);
      return;
    }

    setActiveTab(nextTab);
  }

  function renderOverview() {
    return (
      <>
        <section className="mt-4">
          <SectionHeading kicker="Ключевые сигналы дня" title="Что происходит сейчас" />
          <MetricsGrid metrics={primaryKpis} density="compact" />
        </section>

        <section className="mt-4">
          <SectionHeading kicker="Контур Smart Contract" title="Главная касса дня" />
          <MetricsGrid metrics={contractPulseKpis} density="balanced" />
        </section>

        <section className="mt-4">
          <SectionHeading kicker="День к дню" title="Сравнение со вчера" />
          <MetricsGrid metrics={operationalSnapshotKpis} density="compact" />
        </section>

        <section className="mt-4">
          <SectionHeading kicker="Traffic → Money" title="Трафик превращается в деньги" />
          <MetricsGrid metrics={trafficToMoneyKpis} density="balanced" />
        </section>

        <AnalyticsCollapsibleSection
          kicker="Графики"
          title="Посмотреть динамику, структуру и графики"
          subtitle="Тренды по входящему потоку, выплатам, покрытию и продуктам."
          defaultOpen={false}
          sectionId="overview-graphs"
          openSignal={graphsOpenSignal}
        >
          <section className="row g-3">
            <div className="col-12 col-xxl-6">
              <ChartCard title="Входящий поток по дням" subtitle="Сколько новых денег заходило в систему в каждом дне выбранного окна.">
                <UsersGrowthChart data={data.charts.usersGrowth} />
              </ChartCard>
            </div>
            <div className="col-12 col-xxl-6">
              <ChartCard title="Выплаты по дням" subtitle="Давление по выплатам циклов в ежедневном разрезе.">
                <RevenueChart data={data.charts.revenue} />
              </ChartCard>
            </div>
            <div className="col-12 col-xl-6">
              <ChartCard title="Разложение денег" subtitle="Как входящий поток распадается на выплаты, рефералку, комиссию и остаток.">
                <ConversionFunnelChart data={data.charts.funnel} />
              </ChartCard>
            </div>
            <div className="col-12 col-xl-6">
              <ChartCard title="Структура по продуктам" subtitle="Какой продукт формирует основной входящий поток в выбранном окне.">
                <TrafficSourcesChart data={data.charts.trafficSources} />
              </ChartCard>
            </div>
            <div className="col-12 col-xl-6">
              <ChartCard title="Покрытие обязательств" subtitle="Насколько ожидаемый входящий поток закрывает обязательства на ключевых горизонтах.">
                <RetentionChart data={data.charts.retention} />
              </ChartCard>
            </div>
            <div className="col-12 col-xl-6">
              <ChartCard title="Давление по продуктам" subtitle="Какой продукт создаёт больше обязательств и где выше прогнозируемый разрыв.">
                <CampaignPerformanceChart data={data.charts.campaigns} />
              </ChartCard>
            </div>
          </section>
        </AnalyticsCollapsibleSection>

        <AnalyticsCollapsibleSection
          kicker="Оперативная сводка"
          title="Посмотреть деньги и циклы по периодам"
          subtitle="Вчера, сегодня, 7 дней и 30 дней: сколько зашло, сколько ушло и сколько циклов создали."
          defaultOpen={false}
        >
          <div className="row g-3">
            <div className="col-12">
              <AnalyticsDataTable
                title="Деньги и циклы по периодам"
                subtitle="Входящий поток, новые и повторные деньги, количество созданных циклов и общий исходящий поток."
                columns={[
                  { key: "period", label: "Период" },
                  { key: "incoming", label: "Входящий поток", type: "currency" },
                  { key: "newMoney", label: "Новые деньги", type: "currency" },
                  { key: "existingMoney", label: "Повторные деньги", type: "currency" },
                  { key: "cycleActivations", label: "Создано циклов", type: "number" },
                  { key: "outgoing", label: "Выплачено", type: "currency" },
                ]}
                rows={overviewOperations.periods}
              />
            </div>
            <div className="col-12">
              <AnalyticsDataTable
                title="Созданные smart-cycles по видам"
                subtitle="Сколько циклов создаётся по каждому виду и какой поток он сегодня даёт."
                columns={[
                  { key: "cycleType", label: "Вид цикла" },
                  { key: "source", label: "Контур" },
                  { key: "todayCreated", label: "Сегодня", type: "number" },
                  { key: "weekCreated", label: "7 дней", type: "number" },
                  { key: "monthCreated", label: "30 дней", type: "number" },
                  { key: "todayIncoming", label: "Входящий сегодня", type: "currency" },
                  { key: "todayOutgoing", label: "Выплачено сегодня", type: "currency" },
                ]}
                rows={overviewOperations.cycleTypes}
              />
            </div>
          </div>
        </AnalyticsCollapsibleSection>

        <AnalyticsCollapsibleSection
          kicker="72 часа"
          title="Посмотреть ближайшее давление по контракту"
          subtitle="Ближайшие три дня: что должно выйти с адреса, что ожидается на вход и где уже виден разрыв."
          defaultOpen={false}
        >
          <AnalyticsDataTable
            title="Мини-календарь выплат на 72 часа"
            subtitle="Cycle payouts, рефералка, комиссия и суммарное давление по каждому из ближайших дней."
            columns={[
              { key: "date", label: "Дата" },
              { key: "cyclePayouts", label: "Циклы", type: "currency" },
              { key: "referralPayouts", label: "Рефералка", type: "currency" },
              { key: "platformFee", label: "Комиссия", type: "currency" },
              { key: "totalOutgoing", label: "Всего выйдет", type: "currency" },
              { key: "expectedIncoming", label: "Ожидаемый вход", type: "currency" },
              { key: "projectedGap", label: "Разрыв", type: "currency" },
            ]}
            rows={next72h}
          />
        </AnalyticsCollapsibleSection>

        <AnalyticsCollapsibleSection
          kicker="План действий"
          title="Посмотреть, что сделать сегодня"
          subtitle="Короткий список главных действий на день без лишней аналитической нагрузки."
          defaultOpen={false}
        >
          <AnalyticsPriorityActions actions={data.priorityActions} embedded />
        </AnalyticsCollapsibleSection>

        <AnalyticsInsights alerts={data.insights.alerts} recommendations={data.insights.recommendations} />

        <AnalyticsScenarios scenarios={data.scenarios} defaultOpen={false} />

        <ActivationSection
          period={activationPeriod}
          periodOptions={ACTIVATION_PERIOD_OPTIONS}
          totals={filteredLifecycleTotals}
          rows={pagedLifecycleRows}
          page={safeActivationPage}
          totalPages={activationTotalPages}
          onPeriodChange={(nextPeriod) => {
            setActivationPeriod(nextPeriod);
            setActivationPage(1);
          }}
          onPageChange={setActivationPage}
        />

        <AnalyticsCollapsibleSection
          kicker="Финансовая структура"
          title="Посмотреть, куда уйдут деньги"
          subtitle="Выплаты, рефералка, комиссия платформы и ваш остаток."
          defaultOpen={false}
        >
          <MetricsGrid metrics={structureKpis} density="compact" />
        </AnalyticsCollapsibleSection>

        <AnalyticsCollapsibleSection
          kicker="Таблица"
          title="Посмотреть детальную разбивку"
          subtitle="Полная таблица по продуктам, ордерам и денежной раскладке."
          defaultOpen={false}
        >
          <AnalyticsTable rows={data.table} />
        </AnalyticsCollapsibleSection>
      </>
    );
  }

  function renderTrafficTab() {
    return (
      <>
        <TabSummary kicker="Онлайн" title={trafficTabData.summary.title} description={trafficTabData.summary.description} bullets={trafficTabData.summary.bullets} />

        <section className="mt-4">
          <SectionHeading kicker="Трафик / Онлайн" title="Кто сейчас на сайте и в кабинете" />
          <MetricsGrid metrics={trafficTabData.metrics} />
        </section>
        <section className="row g-3 mt-1">
          <div className="col-12">
            <ChartCard title="Регистрации -> Кошелёк -> Цикл по дням" subtitle="Как по дням движется базовая активация пользователей за выбранный период.">
              <TrafficLifecycleChart data={trafficTabData.lifecycleRows} />
            </ChartCard>
          </div>
          <div className="col-12 col-xl-6">
            <ChartCard title="Живой поток по дням" subtitle="Как менялась онлайн-активность за последние дни.">
              <UsersGrowthChart data={trafficTabData.timeline} />
            </ChartCard>
          </div>
          <div className="col-12 col-xl-6">
            <ChartCard title="Онлайн по странам" subtitle="Какие страны дают основной живой поток.">
              <TrafficSourcesChart data={trafficTabData.countryShare} />
            </ChartCard>
          </div>
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Онлайн по странам"
              subtitle="Где сейчас находится живой трафик."
              columns={[
                { key: "country", label: "Страна" },
                { key: "siteUsers", label: "На сайте", type: "number" },
                { key: "cabinetUsers", label: "В кабинете", type: "number" },
                { key: "sessions", label: "Сессии", type: "number" },
                { key: "wallets", label: "Кошельки", type: "number" },
              ]}
              rows={trafficTabData.countries}
            />
          </div>
          <div className="col-12 col-xl-6">
            <ChartCard title="Воронка пути" subtitle="Цепочка от сайта до старта депозита.">
              <ConversionFunnelChart data={trafficTabData.funnel} />
            </ChartCard>
          </div>
        </section>
        <section className="row g-3 mt-1">
          <div className="col-12 col-xl-6">
            <ChartCard title="Конверсия по шагам" subtitle="Где теряется поток между шагами.">
              <RetentionChart data={trafficTabData.conversion} />
            </ChartCard>
          </div>
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Воронка пути"
              subtitle="Числа по шагам воронки."
              columns={[
                { key: "stage", label: "Шаг" },
                { key: "value", label: "Пользователи", type: "number" },
              ]}
              rows={trafficTabData.funnel}
            />
          </div>
        </section>
        <section className="row g-3 mt-4">
          <div className="col-12">
            <ActivationSection
              marginTop="none"
              period={activationPeriod}
              periodOptions={ACTIVATION_PERIOD_OPTIONS}
              totals={filteredLifecycleTotals}
              rows={pagedLifecycleRows}
              page={safeActivationPage}
              totalPages={activationTotalPages}
              onPeriodChange={(nextPeriod) => {
                setActivationPeriod(nextPeriod);
                setActivationPage(1);
              }}
              onPageChange={setActivationPage}
            />
          </div>
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Качество live-потока по странам"
              subtitle="Где трафик не просто есть, а реально доходит до действий."
              columns={[
                { key: "country", label: "Страна" },
                { key: "newVisitors", label: "Новые", type: "number" },
                { key: "repeatVisitors", label: "Повторные", type: "number" },
                { key: "engagementRate", label: "Вовлечение", type: "percent" },
                { key: "depositConversion", label: "Конв. в депозит", type: "percent" },
              ]}
              rows={trafficTabData.qualityRows}
            />
          </div>
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Качество источников"
              subtitle="Какие источники дают лучший поток до wallet connect и депозита."
              columns={[
                { key: "source", label: "Источник / продукт" },
                { key: "newVisitors", label: "Новые", type: "number" },
                { key: "repeatVisitors", label: "Повторные", type: "number" },
                { key: "bounceRate", label: "Отказы", type: "percent" },
                { key: "walletConnects", label: "Подкл. кошелёк", type: "number" },
                { key: "depositStarts", label: "Старт депозита", type: "number" },
                { key: "depositConversion", label: "Конв. в депозит", type: "percent" },
                { key: "qualityScore", label: "Качество", type: "percent" },
              ]}
              rows={trafficTabData.sourceQualityRows}
            />
          </div>
        </section>
        <section className="mt-4">
          <AnalyticsDataTable
            title="Источники и продукты в live-потоке"
            subtitle="Кто даёт онлайн-активность и депозитный старт."
            columns={[
              { key: "source", label: "Источник / продукт" },
              { key: "siteUsers", label: "На сайте", type: "number" },
              { key: "cabinetUsers", label: "В кабинете", type: "number" },
              { key: "walletConnects", label: "Подкл. кошелёк", type: "number" },
              { key: "deposits", label: "Депозиты", type: "currency" },
              { key: "conversion", label: "Конверсия", type: "percent" },
            ]}
            rows={trafficTabData.sources}
          />
        </section>
      </>
    );
  }

  function renderProductsTab() {
    return <ProductsTabSection productsTabData={productsTabData} />;
  }

  function renderLeadersTab() {
    return (
      <>
        <TabSummary kicker="Лидеры" title={data.tabsData.leaders.summary.title} description={data.tabsData.leaders.summary.description} bullets={data.tabsData.leaders.summary.bullets} />
        <section className="mt-4">
          <SectionHeading kicker="Лидеры" title="Кто двигает систему деньгами и структурно" />
          <MetricsGrid metrics={data.tabsData.leaders.metrics} density="balanced" />
        </section>
        <section className="row g-3 mt-1">
          <div className="col-12 col-xl-6">
            <ChartCard title="Доли по участию" subtitle="Кто держит основной объём инвестиций.">
              <TrafficSourcesChart data={data.tabsData.leaders.participationShare} />
            </ChartCard>
          </div>
          <div className="col-12 col-xl-6">
            <ChartCard title="Доли по привлечению" subtitle="Кто приводит основной inflow.">
              <TrafficSourcesChart data={data.tabsData.leaders.attractionShare} />
            </ChartCard>
          </div>
        </section>
        <section className="row g-3 mt-4">
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Лидеры по участию"
              subtitle="Кто больше всего инвестирует и активно участвует."
              columns={[
                { key: "name", label: "Пользователь" },
                { key: "country", label: "Страна" },
                { key: "investment", label: "Объём", type: "currency" },
                { key: "cycles", label: "Циклы", type: "number" },
                { key: "activeDays", label: "Активные дни", type: "number" },
              ]}
              rows={data.tabsData.leaders.participation}
            />
          </div>
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Лидеры по привлечению"
              subtitle="Кто приводит участников и деньги."
              columns={[
                { key: "name", label: "Лидер" },
                { key: "country", label: "Страна" },
                { key: "invited", label: "Приглашено", type: "number" },
                { key: "activeInvited", label: "Активных", type: "number" },
                { key: "inflow", label: "Привлечённый inflow", type: "currency" },
                { key: "referralLoad", label: "Referral load", type: "currency" },
              ]}
              rows={data.tabsData.leaders.attraction}
            />
          </div>
        </section>
        <section className="row g-3 mt-4">
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Качество лидеров по участию"
              subtitle="Насколько лидер полезен системе, а не только большой по объёму."
              columns={[
                { key: "name", label: "Лидер" },
                { key: "country", label: "Страна" },
                { key: "obligations", label: "Obligations", type: "currency" },
                { key: "referralIncome", label: "Рефдоход", type: "currency" },
                { key: "netContribution", label: "Net contribution", type: "currency" },
                { key: "reinvestRate", label: "Reinvest rate", type: "percent" },
                { key: "retentionRate", label: "Retention", type: "percent" },
                { key: "claimRate", label: "Claim rate", type: "percent" },
              ]}
              rows={data.tabsData.leaders.participationQuality}
            />
          </div>
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Качество лидеров по привлечению"
              subtitle="Насколько сильна и устойчива база каждого лидера."
              columns={[
                { key: "name", label: "Лидер" },
                { key: "country", label: "Страна" },
                { key: "activeInvited", label: "Активные", type: "number" },
                { key: "depositingInvited", label: "С депозитом", type: "number" },
                { key: "leaderDependency", label: "Зависимость", type: "percent" },
                { key: "baseRetention", label: "Retention", type: "percent" },
                { key: "reinvestRate", label: "Reinvest", type: "percent" },
                { key: "claimPressure", label: "Claim pressure", type: "percent" },
                { key: "netContribution", label: "Net contribution", type: "currency" },
              ]}
              rows={data.tabsData.leaders.attractionQuality}
            />
          </div>
        </section>
      </>
    );
  }

  function renderReinvestTab() {
    return (
      <>
        <TabSummary kicker="Реинвест" title={reinvestTabData.summary.title} description={reinvestTabData.summary.description} bullets={reinvestTabData.summary.bullets} />
        <section className="mt-4">
          <SectionHeading kicker="Реинвест" title="Насколько пользователи возвращают деньги в систему" />
          <MetricsGrid metrics={reinvestTabData.metrics} density="balanced" />
        </section>
        <section className="row g-3 mt-1">
          <div className="col-12 col-xl-6">
            <ChartCard title="Реинвест по продуктам" subtitle="Где пользователи чаще возвращают капитал в систему.">
              <TrafficSourcesChart data={reinvestTabData.productShare} />
            </ChartCard>
          </div>
          <div className="col-12 col-xl-6">
            <ChartCard title="Скорость реинвеста" subtitle="Как быстро пользователи возвращаются после claim.">
              <RetentionChart data={reinvestTabData.timeline} />
            </ChartCard>
          </div>
        </section>
        <section className="row g-3 mt-4">
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Реинвест по продуктам"
              subtitle="Claims, reinvest и возврат капитала по продуктам."
              columns={[
                { key: "source", label: "Продукт" },
                { key: "claimUsers", label: "Claim users", type: "number" },
                { key: "reinvestUsers", label: "Reinvest users", type: "number" },
                { key: "userRate", label: "Users rate", type: "percent" },
                { key: "claimedCapital", label: "Claimed capital", type: "currency" },
                { key: "reinvestedCapital", label: "Reinvested capital", type: "currency" },
                { key: "capitalRate", label: "Capital rate", type: "percent" },
              ]}
              rows={reinvestTabData.byProduct}
            />
          </div>
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Реинвест по странам"
              subtitle="Где реинвест выше по людям и по капиталу."
              columns={[
                { key: "country", label: "Страна" },
                { key: "claimUsers", label: "Claim users", type: "number" },
                { key: "reinvestUsers", label: "Reinvest users", type: "number" },
                { key: "userRate", label: "Users rate", type: "percent" },
                { key: "claimedCapital", label: "Claimed capital", type: "currency" },
                { key: "reinvestedCapital", label: "Reinvested capital", type: "currency" },
                { key: "capitalRate", label: "Capital rate", type: "percent" },
              ]}
              rows={reinvestTabData.byCountry}
            />
          </div>
        </section>
      </>
    );
  }

  function renderBaseCompositionTab() {
    return (
      <>
        <TabSummary kicker="Состав базы" title={data.tabsData.baseComposition.summary.title} description={data.tabsData.baseComposition.summary.description} bullets={data.tabsData.baseComposition.summary.bullets} />
        <section className="mt-4">
          <SectionHeading kicker="Роли пользователей" title="Кто в системе просто инвестирует, кто строит сеть, а кто делает и то и другое" />
          <MetricsGrid metrics={data.tabsData.baseComposition.metrics} density="wide" />
        </section>
        <section className="row g-3 mt-1">
          <div className="col-12 col-xl-6">
            <ChartCard title="Доля базы по ролям" subtitle="Как распределяется база между инвесторами, партнёрами и смешанной ролью.">
              <TrafficSourcesChart data={data.tabsData.baseComposition.shareChart} />
            </ChartCard>
          </div>
          <div className="col-12 col-xl-6">
            <ChartCard title="Inflow по ролям" subtitle="Какая роль даёт основной денежный поток.">
              <TrafficSourcesChart data={data.tabsData.baseComposition.inflowChart} />
            </ChartCard>
          </div>
        </section>
        <section className="mt-4">
          <AnalyticsDataTable
            title="Состав базы и качество сегментов"
            subtitle="Размер базы, деньги, обязательства и устойчивость по каждой роли."
            columns={[
              { key: "segment", label: "Сегмент" },
              { key: "users", label: "Users", type: "number" },
              { key: "share", label: "Доля базы", type: "percent" },
              { key: "inflow", label: "Inflow", type: "currency" },
              { key: "avgDeposit", label: "Средний вклад", type: "currency" },
              { key: "obligations", label: "Obligations", type: "currency" },
              { key: "netContribution", label: "Net contribution", type: "currency" },
              { key: "repeatRate", label: "Repeat rate", type: "percent" },
              { key: "claimPressure", label: "Claim pressure", type: "percent" },
            ]}
            rows={data.tabsData.baseComposition.rows}
          />
        </section>
        <section className="mt-4">
          <AnalyticsDataTable
            title="Состояние ролей"
            subtitle="Активность, платёжность и claim/referral-статус внутри каждой роли."
            columns={[
              { key: "segment", label: "Сегмент" },
              { key: "activeUsers", label: "Активные", type: "number" },
              { key: "activeRate", label: "Активность", type: "percent" },
              { key: "sleepingUsers", label: "Спящие", type: "number" },
              { key: "newUsers", label: "Новые", type: "number" },
              { key: "repeatUsers", label: "Повторные", type: "number" },
              { key: "repeatRate", label: "Repeat rate", type: "percent" },
              { key: "payingUsers", label: "Платящие", type: "number" },
              { key: "payingRate", label: "Платят", type: "percent" },
              { key: "nonPayingUsers", label: "Неплатящие", type: "number" },
              { key: "claimUsers", label: "С claim", type: "number" },
              { key: "claimRate", label: "Claim rate", type: "percent" },
              { key: "noClaimUsers", label: "Без claim", type: "number" },
              { key: "referralIncomeUsers", label: "С рефдоходом", type: "number" },
              { key: "referralIncomeRate", label: "Рефдоход", type: "percent" },
              { key: "noReferralIncomeUsers", label: "Без рефдохода", type: "number" },
            ]}
            rows={data.tabsData.baseComposition.qualityRows}
          />
        </section>
        <section className="mt-4">
          <AnalyticsDataTable
            title="Размер базы по деньгам"
            subtitle="Крупные, средние и мелкие участники внутри каждой роли."
            columns={[
              { key: "segment", label: "Сегмент" },
              { key: "largeUsers", label: "Крупные", type: "number" },
              { key: "largeShare", label: "Доля крупных", type: "percent" },
              { key: "largeInflow", label: "Inflow крупных", type: "currency" },
              { key: "mediumUsers", label: "Средние", type: "number" },
              { key: "mediumShare", label: "Доля средних", type: "percent" },
              { key: "mediumInflow", label: "Inflow средних", type: "currency" },
              { key: "smallUsers", label: "Мелкие", type: "number" },
              { key: "smallShare", label: "Доля мелких", type: "percent" },
              { key: "smallInflow", label: "Inflow мелких", type: "currency" },
            ]}
            rows={data.tabsData.baseComposition.valueTierRows}
          />
        </section>
        <section className="mt-4">
          <AnalyticsDataTable
            title="Путь базы"
            subtitle="Как пользователи проходят путь от нового участия к повтору и реинвесту."
            columns={[
              { key: "segment", label: "Сегмент" },
              { key: "newUsers", label: "Новые", type: "number" },
              { key: "repeatUsers", label: "Повторные", type: "number" },
              { key: "repeatRate", label: "Repeat rate", type: "percent" },
              { key: "reinvestUsers", label: "Реинвест", type: "number" },
              { key: "reinvestRate", label: "Reinvest rate", type: "percent" },
              { key: "claimUsers", label: "С claim", type: "number" },
              { key: "mixedRoleConversion", label: "В смешанную роль", type: "percent" },
            ]}
            rows={data.tabsData.baseComposition.lifecycleRows}
          />
        </section>
        <section className="mt-4">
          <AnalyticsDataTable
            title="Удержание и риск потери"
            subtitle="Кто просто спит, кто возвращается, а кто уже выпадает из системы."
            columns={[
              { key: "segment", label: "Сегмент" },
              { key: "activeUsers", label: "Активные", type: "number" },
              { key: "sleepingUsers", label: "Спящие", type: "number" },
              { key: "dormantUsers", label: "Глубоко спят", type: "number" },
              { key: "dormantRate", label: "Dormant rate", type: "percent" },
              { key: "reactivatedUsers", label: "Вернулись", type: "number" },
              { key: "reactivatedRate", label: "Return rate", type: "percent" },
              { key: "churnedUsers", label: "Отвалились", type: "number" },
              { key: "churnRate", label: "Churn rate", type: "percent" },
            ]}
            rows={data.tabsData.baseComposition.retentionRows}
          />
        </section>
      </>
    );
  }

  function renderGeographyTab() {
    return (
      <>
        <TabSummary kicker="География" title={data.tabsData.geography.summary.title} description={data.tabsData.geography.summary.description} bullets={data.tabsData.geography.summary.bullets} />
        <section className="mt-4">
          <SectionHeading kicker="География" title="Какие страны дают пользователей, деньги и обязательства" />
          <MetricsGrid metrics={data.tabsData.geography.metrics} density="balanced" />
        </section>
        <section className="row g-3 mt-1">
          <div className="col-12 col-xl-6">
            <ChartCard title="Inflow по странам" subtitle="Какие страны дают основной денежный поток.">
              <TrafficSourcesChart data={data.tabsData.geography.inflowShare} />
            </ChartCard>
          </div>
          <div className="col-12 col-xl-6">
            <ChartCard title="Obligations по странам" subtitle="Какие страны дают большую будущую нагрузку.">
              <TrafficSourcesChart data={data.tabsData.geography.obligationsShare} />
            </ChartCard>
          </div>
        </section>
        <section className="mt-4">
          <AnalyticsDataTable
            title="Страны"
            subtitle="Ключевая география системы."
            columns={[
              { key: "country", label: "Страна" },
              { key: "city", label: "Город" },
              { key: "users", label: "Users", type: "number" },
              { key: "wallets", label: "Wallets", type: "number" },
              { key: "inflow", label: "Inflow", type: "currency" },
              { key: "obligations", label: "Obligations", type: "currency" },
              { key: "deposits", label: "Deposits", type: "currency" },
            ]}
            rows={data.tabsData.geography.rows}
          />
        </section>
        <section className="row g-3 mt-4">
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Качество стран"
              subtitle="Какие страны дают не просто объём, а более живую и зрелую базу."
              columns={[
                { key: "country", label: "Страна" },
                { key: "activeUsers", label: "Активные", type: "number" },
                { key: "activeRate", label: "Активность", type: "percent" },
                { key: "newUsers", label: "Новые", type: "number" },
                { key: "repeatUsers", label: "Повторные", type: "number" },
                { key: "repeatRate", label: "Repeat rate", type: "percent" },
                { key: "reinvestUsers", label: "Реинвест", type: "number" },
                { key: "reinvestRate", label: "Reinvest rate", type: "percent" },
                { key: "payingRate", label: "Платят", type: "percent" },
              ]}
              rows={data.tabsData.geography.qualityRows}
            />
          </div>
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Risk profile стран"
              subtitle="Где нагрузка и claim-профиль уже опаснее качества роста."
              columns={[
                { key: "country", label: "Страна" },
                { key: "obligations", label: "Obligations", type: "currency" },
                { key: "obligationLoad", label: "Load", type: "percent" },
                { key: "claimRate", label: "Claim rate", type: "percent" },
                { key: "riskScore", label: "Risk score", type: "percent" },
                { key: "growthScore", label: "Growth score", type: "percent" },
              ]}
              rows={data.tabsData.geography.riskRows}
            />
          </div>
        </section>
      </>
    );
  }

  function renderPartnerTab() {
    const partnerDiagnostics = data.tabsData.partner.diagnostics || {};

    return (
      <>
        <TabSummary kicker="Партнёрская структура" title={data.tabsData.partner.summary.title} description={data.tabsData.partner.summary.description} bullets={data.tabsData.partner.summary.bullets} />
        <section className="mt-4">
          <SectionHeading kicker="Партнёрская структура" title="Какие ветки дают рост, а какие раздувают нагрузку" />
          <MetricsGrid metrics={data.tabsData.partner.metrics} density="balanced" />
        </section>
        <TabSummary
          kicker="Почему ветка дорогая"
          title={`${partnerDiagnostics.costlyBranch?.branch || "Ветка"} сейчас даёт главный structural pressure`}
          description={`${partnerDiagnostics.dominantPressure?.type || "Партнёрская нагрузка"} сейчас выглядит самым сильным слоем давления на treasury, а ближайший tier jump уже нужно отслеживать отдельно.`}
          bullets={[
            <>Дорогая ветка: {partnerDiagnostics.costlyBranch?.branch || "—"} · leak {partnerDiagnostics.costlyBranch?.structuralLeak ?? 0}% · dependency {partnerDiagnostics.costlyBranch?.leaderDependency ?? 0}%</>,
            <>Доминирующее давление: {partnerDiagnostics.dominantPressure?.type || "—"} · {formatCurrency(partnerDiagnostics.dominantPressure?.value || 0)} · {formatPercent(partnerDiagnostics.dominantPressure?.share || 0)}</>,
            <>Tier jump risk 7d: {formatPercent(partnerDiagnostics.jumpRisk?.score || 0)} · зона {partnerDiagnostics.jumpRisk?.branch || "—"}</>,
            <>Самая здоровая ветка: {partnerDiagnostics.healthiestBranch?.branch || "—"} · net {formatCurrency(partnerDiagnostics.healthiestBranch?.netBranch || 0)}</>,
          ]}
        />
        <section className="row g-3 mt-1">
          <div className="col-12 col-xl-6">
            <ChartCard title="Inflow по веткам" subtitle="Какие ветки приносят основной денежный поток.">
              <TrafficSourcesChart data={data.tabsData.partner.inflowShare} />
            </ChartCard>
          </div>
          <div className="col-12 col-xl-6">
            <ChartCard title="Referral burden по веткам" subtitle="Какие ветки сильнее всего нагружают реферальный контур.">
              <TrafficSourcesChart data={data.tabsData.partner.referralShare} />
            </ChartCard>
          </div>
        </section>
        <section className="mt-4">
          <AnalyticsDataTable
            title="Ветки и лидеры"
            subtitle="Структурная эффективность и нагрузка по веткам."
            columns={[
              { key: "leader", label: "Лидер" },
              { key: "branch", label: "Ветка" },
              { key: "inflow", label: "Inflow", type: "currency" },
              { key: "invited", label: "Invited", type: "number" },
              { key: "referralAccrual", label: "Начислено", type: "currency" },
              { key: "payout", label: "Выплачено", type: "currency" },
            ]}
            rows={data.tabsData.partner.rows}
          />
        </section>
        <section className="mt-4">
          <AnalyticsDataTable
            title="Качество веток"
            subtitle="Насколько ветка живая, глубокая и зависимая от одного лидера."
            columns={[
              { key: "branch", label: "Ветка" },
              { key: "activeInvited", label: "Активные", type: "number" },
              { key: "depositingInvited", label: "С депозитом", type: "number" },
              { key: "conversionToDeposit", label: "Deposit conv.", type: "percent" },
              { key: "leaderDependency", label: "Зависимость от лидера", type: "percent" },
              { key: "depthScore", label: "Глубина", type: "percent" },
              { key: "structuralLeak", label: "Structural leak", type: "percent" },
            ]}
            rows={data.tabsData.partner.qualityRows}
          />
        </section>
        <section className="mt-4">
          <AnalyticsDataTable
            title="Финансы веток"
            subtitle="Сколько ветка приносит, сколько нагружает и сколько остаётся системе."
            columns={[
              { key: "branch", label: "Ветка" },
              { key: "inflow", label: "Inflow", type: "currency" },
              { key: "obligations", label: "Obligations", type: "currency" },
              { key: "referralAccrual", label: "Начислено", type: "currency" },
              { key: "referralRate", label: "Referral rate", type: "percent" },
              { key: "payout", label: "Выплачено", type: "currency" },
              { key: "payoutRate", label: "Payout rate", type: "percent" },
              { key: "netBranch", label: "Net ветки", type: "currency" },
            ]}
            rows={data.tabsData.partner.financeRows}
          />
        </section>
      </>
    );
  }

  function renderWalletsTab() {
    return (
      <>
        <TabSummary kicker="Кошельки" title={data.tabsData.wallets.summary.title} description={data.tabsData.wallets.summary.description} bullets={data.tabsData.wallets.summary.bullets} />
        <section className="mt-4">
          <SectionHeading kicker="Кошельки" title="Где деньги, где нагрузка и где концентрация риска" />
          <MetricsGrid metrics={data.tabsData.wallets.metrics} density="balanced" />
        </section>
        <section className="row g-3 mt-1">
          <div className="col-12 col-xl-6">
            <ChartCard title="Inflow по кошелькам" subtitle="Какие кошельки держат основной объём.">
              <TrafficSourcesChart data={data.tabsData.wallets.inflowShare} />
            </ChartCard>
          </div>
          <div className="col-12 col-xl-6">
            <ChartCard title="Obligations по кошелькам" subtitle="Какие кошельки создают большую будущую нагрузку.">
              <TrafficSourcesChart data={data.tabsData.wallets.obligationsShare} />
            </ChartCard>
          </div>
        </section>
        <section className="mt-4">
          <AnalyticsDataTable
            title="Top wallets"
            subtitle="Кошельки по объёму и будущей нагрузке."
            columns={[
              { key: "wallet", label: "Кошелёк" },
              { key: "role", label: "Роль" },
              { key: "ownerType", label: "Тип" },
              { key: "inflow", label: "Inflow", type: "currency" },
              { key: "obligations", label: "Obligations", type: "currency" },
              { key: "network", label: "Сеть" },
            ]}
            rows={data.tabsData.wallets.rows}
          />
        </section>
        <section className="row g-3 mt-4">
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Качество кошельков"
              subtitle="Активность кошелька, claim-нагрузка и его полезность для системы."
              columns={[
                { key: "wallet", label: "Кошелёк" },
                { key: "ownerType", label: "Тип" },
                { key: "activityScore", label: "Активность", type: "percent" },
                { key: "claimable", label: "Claimable", type: "currency" },
                { key: "accrued", label: "Accrued", type: "currency" },
                { key: "claimPressure", label: "Claim pressure", type: "percent" },
                { key: "reinvestFlow", label: "Reinvest flow", type: "currency" },
              ]}
              rows={data.tabsData.wallets.qualityRows}
            />
          </div>
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Risk profile кошельков"
              subtitle="Где опасная концентрация, нагрузка и слабый net contribution."
              columns={[
                { key: "wallet", label: "Кошелёк" },
                { key: "role", label: "Роль" },
                { key: "concentrationShare", label: "Доля", type: "percent" },
                { key: "obligations", label: "Obligations", type: "currency" },
                { key: "obligationLoad", label: "Load", type: "percent" },
                { key: "riskScore", label: "Risk score", type: "percent" },
                { key: "netContribution", label: "Net contribution", type: "currency" },
              ]}
              rows={data.tabsData.wallets.riskRows}
            />
          </div>
        </section>
      </>
    );
  }

  function renderTasksTab() {
    return <LaunchChecklistSection mode="tasks" />;
  }

  function renderContentTab() {
    return <LaunchChecklistSection mode="content" />;
  }

  function renderCrmBoardTab() {
    return <AnalyticsBoardEmbed boardUrl={ANALYTICS_BOARD_URL} variant="inline" />;
  }

  function renderDevelopmentsTab() {
    return <DevelopmentsRegistry />;
  }

  function renderActiveAnalyticsTab() {
    if (activeAnalyticsTab === "dashboard") return renderDashboard();
    if (activeAnalyticsTab === "traffic") return renderTrafficTab();
    if (activeAnalyticsTab === "products") return renderProductsTab();
    if (activeAnalyticsTab === "reinvest") return renderReinvestTab();
    if (activeAnalyticsTab === "base") return renderBaseCompositionTab();
    if (activeAnalyticsTab === "leaders") return renderLeadersTab();
    if (activeAnalyticsTab === "geography") return renderGeographyTab();
    if (activeAnalyticsTab === "partner") return renderPartnerTab();
    if (activeAnalyticsTab === "wallets") return renderWalletsTab();
    return renderOverview();
  }

  function renderAnalyticsTab() {
    return (
      <>
        <AnalyticsTabs tabs={analyticsSectionTabs} activeTab={activeAnalyticsTab} onChange={setActiveAnalyticsTab} />
        {renderActiveAnalyticsTab()}
      </>
    );
  }

  function renderActiveTab() {
    if (activeTab === "dashboard") return renderCrmDashboard();
    if (activeTab === "tasks") return renderTasksTab();
    if (activeTab === "content") return renderContentTab();
    if (activeTab === "developments") return renderDevelopmentsTab();
    if (activeTab === "productLibrary") return <ProductLibraryBoard />;
    if (activeTab === "crmBoard") return renderCrmBoardTab();
    return renderAnalyticsTab();
  }

  return (
    <main className="analytics-layout container-fluid py-4 px-3 px-xl-4">
      {renderPageHeader()}

      <QuickNotesModal isOpen={isQuickNotesOpen} onClose={() => setIsQuickNotesOpen(false)} />

      {isBoardOpen ? <AnalyticsBoardEmbed boardUrl={ANALYTICS_BOARD_URL} onClose={() => setIsBoardOpen(false)} /> : null}

      <AnalyticsTabs tabs={mainTabs} activeTab={activeTab} onChange={handleMainTabChange} />

      {renderActiveTab()}

      {activeTab === "analytics" ? (
        <section className="analytics-footer-actions mt-4">
          <button type="button" className="btn analytics-export-btn analytics-export-btn-bottom" onClick={() => downloadCsv(exportAnalyticsCsv(data.table))}>
            Экспорт CSV
          </button>
        </section>
      ) : null}
    </main>
  );
}

export default AnalyticsPage;
