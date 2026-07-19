import AnalyticsHeader from "./components/AnalyticsHeader";
import AnalyticsTabs from "./components/AnalyticsTabs";
import AnalyticsBoardEmbed from "./components/AnalyticsBoardEmbed";
import AnalyticsMainPanel from "./components/AnalyticsMainPanel";
import { AGENT_FAQ_STORAGE_KEY, defaultFaqTemplate } from "./data/agentFaqData";
import { AGENT_KNOWLEDGE_STORAGE_KEY, defaultKnowledgeTemplate } from "./data/agentKnowledgeData";
import { AGENT_TERMINOLOGY_STORAGE_KEY, defaultTerminologyTemplate } from "./data/agentTerminologyData";
import { AGENT_TRAINING_DATASET_STORAGE_KEY, defaultTrainingDataset } from "./components/AgentTrainingDataset";
import { PRESENTATION_SLIDES } from "./data/presentationData";
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
} from "./data/launchChecklistData";
import { getAnalyticsTabForBoard } from "./components/LaunchBoardRegistry";
import { MATERIALS_STORAGE_KEY, defaultMaterialItems } from "./data/materialsData";
import { VIDEO_SCRIPTS_STORAGE_KEY, defaultVideoScripts } from "./data/videoScriptsData";
import EmptyState from "./components/EmptyState";
import LoadingState from "./components/LoadingState";
import Wrapper from "./components/Wrapper";
import QuickNotesModal, { QUICK_NOTES_STORAGE_KEY, countQuickNotes } from "./components/QuickNotesModal";
import useAnalyticsData from "./hooks/useAnalyticsData";
import { exportAnalyticsCsv } from "./services/analyticsApi";
import { loadServerContent, saveServerContent } from "./services/contentStore";
import formatCurrency from "./utils/formatCurrency";
import {
  ACTIVATION_PAGE_SIZE,
  ACTIVATION_PERIOD_OPTIONS,
  CRM_MY_TASKS_STORAGE_KEY,
  buildAiTaskSummary,
  buildCrmContentStats,
  buildCrmTaskOverview,
  buildCrmTaskStats,
  buildDashboardChatItems,
  buildDashboardLiveFeed,
  buildDashboardTaskItems,
  buildDashboardTicketItems,
  buildLifecycleSummary,
  downloadCsv,
  filterLifecycleRows,
  formatDays,
  formatPercent,
  getMetricValue,
  getRiskTone,
  getTodayInputDate,
  normalizeCrmMyTasks,
  readStoredCrmMyTasks,
} from "./utils/analyticsPageUtils";
import "./styles/analytics.css";
import { useEffect, useRef, useState } from "react";

const ANALYTICS_BOARD_URL = (import.meta.env.VITE_ANALYTICS_BOARD_URL || "/analytics-board/").trim() || "/analytics-board/";
const ATLAS_SITE_PREVIEW_URL = "/atlas-site-preview/index.html";
const MAIN_TAB_BOARD_IDS = {
  dashboard: "dashboard",
  parser: "parser",
  analytics: "analytics",
  tasks: "launch",
  content: "materials",
  diary: "diary",
};
const ANALYTICS_TAB_BOARD_IDS = {
  dashboard: "analytics",
  overview: "analytics-overview",
  traffic: "analytics-traffic",
  products: "analytics-products",
  reinvest: "analytics-reinvest",
  base: "analytics-base",
  leaders: "analytics-leaders",
  geography: "analytics-geography",
  partner: "analytics-partner",
  wallets: "analytics-wallets",
  contracts: "contracts",
  expenses: "expenses",
};
const BOARD_ANALYTICS_TABS = Object.fromEntries(
  Object.entries(ANALYTICS_TAB_BOARD_IDS).map(([tabId, boardId]) => [boardId, tabId]),
);

function pushBoardRoute(boardId, { replace = false } = {}) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("b");
  url.searchParams.delete("view");
  url.searchParams.set("board", boardId);
  window.history[replace ? "replaceState" : "pushState"]({}, "", url);
}

function readStoredQuickNotesCount() {
  if (typeof window === "undefined") return 0;

  try {
    const saved = window.localStorage.getItem(QUICK_NOTES_STORAGE_KEY);
    return countQuickNotes(saved ? JSON.parse(saved) : null);
  } catch {
    return 0;
  }
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
  return getAnalyticsTabForBoard(board);
}

function getInitialAnalyticsSectionTab() {
  if (typeof window === "undefined") return "dashboard";

  const url = new URL(window.location.href);
  const board = url.searchParams.get("board");
  if (board === "contractBalances") return "contracts";
  return BOARD_ANALYTICS_TABS[board] || "dashboard";
}

function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState(getInitialAnalyticsTab);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState(getInitialAnalyticsSectionTab);
  const [isBoardOpen, setIsBoardOpen] = useState(false);
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);
  const [, setQuickNotesCount] = useState(readStoredQuickNotesCount);
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
    function handleHistoryChange() {
      const board = new URL(window.location.href).searchParams.get("board");
      setActiveTab(getAnalyticsTabForBoard(board));
      setActiveAnalyticsTab(
        board === "contractBalances"
          ? "contracts"
          : BOARD_ANALYTICS_TABS[board] || "dashboard",
      );
    }

    window.addEventListener("popstate", handleHistoryChange);
    return () => window.removeEventListener("popstate", handleHistoryChange);
  }, []);

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
    pushBoardRoute(ANALYTICS_TAB_BOARD_IDS.overview);
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
    { id: "parser", label: "Маркетинг" },
    { id: "analytics", label: "Аналитика" },
    { id: "tasks", label: "Задачи" },
    { id: "content", label: "Контент" },
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
    { id: "contracts", label: "Контракты", hint: "BSC" },
    { id: "expenses", label: "Расходы", hint: "бюджет" },
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
    if (nextTab === "analytics") {
      setActiveAnalyticsTab("dashboard");
    }
    pushBoardRoute(MAIN_TAB_BOARD_IDS[nextTab] || nextTab);
  }

  function handleAnalyticsTabChange(nextTab) {
    setActiveAnalyticsTab(nextTab);
    pushBoardRoute(ANALYTICS_TAB_BOARD_IDS[nextTab] || "analytics");
  }

  return (
    <main className="analytics-layout">
      <AnalyticsHeader
        onAiReview={() => {
          handleMainTabChange("dashboard");
          setIsAiReviewOpen((current) => !current);
        }}
        onParserOpen={() => handleMainTabChange("parser")}
        onQuickNotes={() => setIsQuickNotesOpen(true)}
        hermesUrl="/hermes/"
        onLiveAnalyticsClick={() => handleMainTabChange("diary")}
      />

      <QuickNotesModal isOpen={isQuickNotesOpen} onClose={() => setIsQuickNotesOpen(false)} onCountChange={setQuickNotesCount} />

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
          setActiveAnalyticsTab: handleAnalyticsTabChange,
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
