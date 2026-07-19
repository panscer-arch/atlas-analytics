import { useEffect, useMemo, useRef, useState } from "react";

import ArticlePlacementPanel from "./ArticlePlacementPanel";
import AtlasCreativesPanel from "./AtlasCreativesPanel";
import BitnestYoutubeParserPanel from "./BitnestYoutubeParserPanel";
import HyipParserPanel from "./HyipParserPanel";
import InfluencerProspectsPanel from "./InfluencerProspectsPanel";
import MarketingDirectionWorkspace from "./MarketingDirectionWorkspace";
import MarketSegmentsPanel from "./MarketSegmentsPanel";
import MlmLeaderOutreachPanel from "./MlmLeaderOutreachPanel";
import PoolMonitorPanel from "./PoolMonitorPanel";
import RegionalHiringPanel from "./RegionalHiringPanel";
import SegmentOutreachPanel from "./SegmentOutreachPanel";
import TelegramChannelsParserPanel from "./TelegramChannelsParserPanel";
import Web3SegmentsPanel from "./Web3SegmentsPanel";
import YouTubeApiSearchPanel from "./YouTubeApiSearchPanel";
import {
  OUTREACH_STORAGE_KEY as HYIP_OUTREACH_STORAGE_KEY,
  STORAGE_KEY as HYIP_STORAGE_KEY,
  defaultLeads as hyipDefaultLeads,
} from "../data/hyipParserData";
import {
  INFLUENCER_OUTREACH_STORAGE_KEY,
  INFLUENCER_STORAGE_KEY,
  defaultInfluencerProspects,
} from "../data/influencerProspectsData";
import {
  MLM_LEADER_OUTREACH_STORAGE_KEY,
  defaultMlmLeaderOutreachPlatforms,
} from "../data/mlmLeaderOutreachData";
import {
  ARTICLE_PLACEMENT_STORAGE_KEY,
  defaultArticlePlacementResources,
} from "../data/articlePlacementData";
import {
  TELEGRAM_OUTREACH_STORAGE_KEY,
  TELEGRAM_STORAGE_KEY,
  defaultTelegramLeads,
} from "../data/telegramParserData";
import {
  MARKETING_DASHBOARD_STORAGE_KEY,
  MARKETING_DIRECTIONS,
  createDefaultMarketingDashboardState,
  hydrateMarketingDashboardState,
} from "../data/marketingDashboardData";
import {
  getServerJson,
  loadServerContent,
  loadServerContentResult,
  saveServerContentResult,
} from "../services/contentStore";
import "../styles/marketing-dashboard.css";

const PARSER_TABS = [
  {
    id: "overview",
    label: "Маркетинг",
    hint: "центр",
  },
  {
    id: "creatives",
    label: "Креативы / SEO",
    hint: "тексты и баннеры",
  },
  {
    id: "monitors",
    label: "Мониторы",
    hint: `${hyipDefaultLeads.length} источника`,
  },
  {
    id: "telegram",
    label: "Telegram-каналы",
    hint: `${defaultTelegramLeads.length} лидов`,
  },
  {
    id: "influencers",
    label: "Инфлюенсеры",
    hint: `${defaultInfluencerProspects.length} лидов`,
  },
  {
    id: "youtubeApi",
    label: "YouTube API",
    hint: "поиск",
  },
  {
    id: "bitnestYoutube",
    label: "Битнест YouTube",
    hint: "593 канала",
  },
  {
    id: "articlePlacement",
    label: "SuperSource",
    hint: `${defaultArticlePlacementResources.length} площадок`,
  },
  {
    id: "marketSegments",
    label: "Сегменты рынка",
    hint: "7 направлений",
  },
  {
    id: "regionalHiring",
    label: "Regional Partners",
    hint: "вакансии",
  },
  {
    id: "mlmLeaders",
    label: "MLM лидеры",
    hint: `${defaultMlmLeaderOutreachPlatforms.length} источника`,
  },
  {
    id: "segmentOutreach",
    label: "Сегментный парсер",
    hint: "7 x соцсети",
  },
  {
    id: "web3Segments",
    label: "Web3 сегменты",
    hint: "12 аудиторий",
  },
  {
    id: "poolMonitor",
    label: "Pool Monitor",
    hint: "USDT/USDC",
  },
];

const PARSER_TAB_BOARD_IDS = {
  overview: "parser",
  creatives: "atlasCreatives",
  monitors: "hyipParser",
  telegram: "telegramParser",
  influencers: "influencers",
  youtubeApi: "youtubeApiSearch",
  bitnestYoutube: "bitnestYoutube",
  articlePlacement: "articlePlacement",
  marketSegments: "marketSegments",
  regionalHiring: "regionalHiring",
  mlmLeaders: "mlmLeaders",
  segmentOutreach: "segmentOutreach",
  web3Segments: "web3Segments",
  poolMonitor: "poolMonitor",
};
const BOARD_PARSER_TABS = Object.fromEntries(
  Object.entries(PARSER_TAB_BOARD_IDS).map(([tabId, boardId]) => [boardId, tabId]),
);

const RESULT_OUTREACH_STATUSES = new Set(["Подключено", "Размещено", "Опубликовано", "Завершено", "Разместили"]);
const IN_PROGRESS_OUTREACH_STATUSES = new Set(["Черновик", "Отправлено", "Написали", "Связались", "Переговоры", "Ответили", "Цена получена", "Договорились", "Запланировано"]);

function outreachStats(leads, outreach, nextStep) {
  const records = Object.values(outreach && typeof outreach === "object" ? outreach : {});
  const results = records.filter((record) => RESULT_OUTREACH_STATUSES.has(record?.status)).length;
  const inProgress = records.filter((record) => IN_PROGRESS_OUTREACH_STATUSES.has(record?.status)).length;
  return {
    total: leads.length,
    connected: results,
    results,
    negotiations: inProgress,
    inProgress,
    candidates: Math.max(0, leads.length - results - inProgress),
    nextStep,
  };
}

function defaultSourceStats() {
  return {
    mlm: {
      total: defaultMlmLeaderOutreachPlatforms.length,
      connected: 0,
      results: 0,
      negotiations: 0,
      inProgress: 0,
      candidates: defaultMlmLeaderOutreachPlatforms.length,
      nextStep: "Назначить ответственного и выбрать первых знакомых лидеров",
    },
    influencers: {
      ...outreachStats(defaultInfluencerProspects, {}, "Косте выбрать первые каналы для персонального контакта"),
      platforms: { YouTube: 0, Instagram: 0, Telegram: 0, X: 0 },
    },
    monitors: outreachStats(hyipDefaultLeads, {}, "Продолжить переговоры с живыми мониторами высокого приоритета"),
    telegram: outreachStats(defaultTelegramLeads, {}, "Отобрать каналы и запросить цену размещения"),
    articles: {
      total: defaultArticlePlacementResources.length,
      connected: 0,
      results: 0,
      negotiations: 0,
      inProgress: 0,
      candidates: defaultArticlePlacementResources.length,
      nextStep: "Добавить ссылки на AMBCrypto и BSC.News, затем выбрать следующую площадку",
    },
    creatives: {
      total: 8,
      connected: 0,
      negotiations: 0,
      candidates: 8,
      nextStep: "Собрать актуальные креативы и привязать их к каналам продвижения",
    },
  };
}

function buildSourceStats({
  mlmRows,
  influencerLeads,
  influencerOutreach,
  monitorLeads,
  monitorOutreach,
  telegramLeads,
  telegramOutreach,
  articleRows,
}) {
  const activeMlmRows = mlmRows.filter((row) => !row.deleted);
  const mlmResults = activeMlmRows.filter((row) => RESULT_OUTREACH_STATUSES.has(row.status)).length;
  const mlmInProgress = activeMlmRows.filter((row) => IN_PROGRESS_OUTREACH_STATUSES.has(row.status)).length;
  const influencerStats = outreachStats(influencerLeads, influencerOutreach, "Косте выбрать первые каналы для персонального контакта");
  const connectedInfluencerIds = new Set(
    Object.entries(influencerOutreach || {})
      .filter(([, record]) => RESULT_OUTREACH_STATUSES.has(record?.status))
      .map(([id]) => id),
  );
  const platforms = { YouTube: 0, Instagram: 0, Telegram: 0, X: 0 };
  influencerLeads.forEach((lead) => {
    if (connectedInfluencerIds.has(lead.id) && Object.hasOwn(platforms, lead.platform)) {
      platforms[lead.platform] += 1;
    }
  });
  const activeArticles = articleRows.filter((row) => !row.deleted);
  const publishedArticles = activeArticles.filter((row) => (
    row.status === "Опубликовано"
    && Boolean(row.publicationUrl || row.publishedUrl || row.articleUrl)
  )).length;
  const articleInProgress = activeArticles.filter((row) => IN_PROGRESS_OUTREACH_STATUSES.has(row.status) || row.status === "Договориться").length;

  return {
    ...defaultSourceStats(),
    mlm: {
      total: activeMlmRows.length,
      connected: mlmResults,
      results: mlmResults,
      negotiations: mlmInProgress,
      inProgress: mlmInProgress,
      candidates: Math.max(0, activeMlmRows.length - mlmResults - mlmInProgress),
      nextStep: "Назначить ответственного и выбрать первых знакомых лидеров",
    },
    influencers: { ...influencerStats, platforms },
    monitors: outreachStats(monitorLeads, monitorOutreach, "Продолжить переговоры с живыми мониторами высокого приоритета"),
    telegram: outreachStats(telegramLeads, telegramOutreach, "Отобрать каналы и запросить цену размещения"),
    articles: {
      total: activeArticles.length,
      connected: publishedArticles,
      results: publishedArticles,
      negotiations: articleInProgress,
      inProgress: articleInProgress,
      candidates: Math.max(0, activeArticles.length - publishedArticles - articleInProgress),
      nextStep: "Добавить ссылки на AMBCrypto и BSC.News, затем выбрать следующую площадку",
    },
  };
}

function genericStats(directionValue) {
  const rows = (directionValue?.rows || []).filter((row) => !row.deleted);
  const results = rows.filter((row) => RESULT_OUTREACH_STATUSES.has(row.status)).length;
  const inProgress = rows.filter((row) => IN_PROGRESS_OUTREACH_STATUSES.has(row.status)).length;
  return {
    total: rows.length,
    connected: results,
    results,
    negotiations: inProgress,
    inProgress,
    candidates: Math.max(0, rows.length - results - inProgress),
  };
}

function operationalPhase(directionValue, stats) {
  if (directionValue?.phase === "На паузе") return "На паузе";
  if ((stats.results || stats.connected || 0) > 0) return "Запущено";
  if ((stats.inProgress || stats.negotiations || 0) > 0) return "Переговоры";
  if ((stats.total || 0) > 0) return "Сбор базы";
  return "Не начато";
}

function cardMetrics(direction, stats, directionValue) {
  if (direction.id === "influencers") {
    return [
      ["YouTube", stats.platforms?.YouTube || 0],
      ["Instagram", stats.platforms?.Instagram || 0],
      ["Telegram", stats.platforms?.Telegram || 0],
      ["X", stats.platforms?.X || 0],
    ];
  }
  if (direction.id === "articles") {
    return [
      ["Опубликовано", stats.connected || 0],
      ["В работе", stats.inProgress || stats.negotiations || 0],
      ["Площадок", stats.total || 0],
    ];
  }
  if (direction.id === "email") {
    return [
      ["Писем", 0],
      ["Ответы", stats.connected || 0],
      ["Агентства", stats.total || 0],
    ];
  }
  if (direction.id === "revshare") {
    return [
      ["Подключено", stats.connected || 0],
      ["В работе", stats.inProgress || stats.negotiations || 0],
      ["Кандидаты", stats.candidates || 0],
    ];
  }
  return [
    ["В базе", stats.total || 0],
    ["В работе", stats.inProgress || stats.negotiations || 0],
    ["Результат", stats.results || stats.connected || 0],
  ];
}

function MarketingOverview({ dashboardState, sourceStats, onSelectDirection }) {
  return (
    <div className="analytics-marketing-hub">
      <section className="analytics-marketing-hub-hero analytics-surface">
        <div>
          <p className="analytics-kicker">Marketing command center</p>
          <h2>Marketing Dashboard</h2>
          <p>
            Все каналы продвижения Atlas, ответственные, переговоры и результаты в одном рабочем пространстве.
          </p>
        </div>
        <div className="analytics-marketing-hub-summary" aria-label="Сводка маркетинговых инструментов">
          <span>Направления</span>
          <strong>{MARKETING_DIRECTIONS.length}</strong>
          <small>{MARKETING_DIRECTIONS.filter((direction) => dashboardState.directions[direction.id]?.owner !== "Назначить").length} с назначенным ответственным</small>
        </div>
      </section>

      <section className="analytics-marketing-tool-grid" aria-label="Маркетинговые направления">
        {MARKETING_DIRECTIONS.map((direction) => {
          const value = dashboardState.directions[direction.id];
          const stats = sourceStats[direction.sourceKey] || genericStats(value);
          const phase = operationalPhase(value, stats);
          return (
            <article key={direction.id} className={`analytics-marketing-tool-card analytics-surface is-${direction.accent}`}>
              <button type="button" onClick={() => onSelectDirection(direction.id)}>
                <div className="analytics-marketing-card-meta">
                  <span>{String(direction.order).padStart(2, "0")}</span>
                  <em>{phase}</em>
                </div>
                <strong>{direction.title}</strong>
                <p>{direction.description}</p>
                <div className="analytics-marketing-card-metrics">
                  {cardMetrics(direction, stats, value).map(([label, metricValue]) => (
                    <div key={label}>
                      <b>{metricValue}</b>
                      <small>{label}</small>
                    </div>
                  ))}
                </div>
                <div className="analytics-marketing-card-owner">
                  <span>Ответственный</span>
                  <b className={value.owner === "Назначить" ? "is-empty" : ""}>{value.owner || "Назначить"}</b>
                  <i aria-hidden="true">→</i>
                </div>
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}

export default function ParserWorkspacePanel({ initialTab = "overview" } = {}) {
  const [dashboardState, setDashboardState] = useState(() => {
    if (typeof window === "undefined") return createDefaultMarketingDashboardState();
    try {
      const saved = window.localStorage.getItem(MARKETING_DASHBOARD_STORAGE_KEY);
      return hydrateMarketingDashboardState(saved ? JSON.parse(saved) : null);
    } catch {
      return createDefaultMarketingDashboardState();
    }
  });
  const [sourceStats, setSourceStats] = useState(defaultSourceStats);
  const [isDashboardLoaded, setIsDashboardLoaded] = useState(false);
  const [dashboardSync, setDashboardSync] = useState({
    status: "loading",
    label: "Проверяем синхронизацию…",
  });
  const dashboardSaveRef = useRef(0);
  const initialBoard = typeof window !== "undefined" ? new URL(window.location.href).searchParams.get("board") : "";
  const initialDirectionId = initialBoard?.startsWith("marketing-") ? initialBoard.replace("marketing-", "") : "";
  const [selectedDirectionId, setSelectedDirectionId] = useState(
    MARKETING_DIRECTIONS.some((direction) => direction.id === initialDirectionId) ? initialDirectionId : "",
  );
  const [activeTab, setActiveTab] = useState(() => {
    if (MARKETING_DIRECTIONS.some((direction) => direction.id === initialDirectionId)) return "direction";
    if (typeof window !== "undefined") {
      const board = new URL(window.location.href).searchParams.get("board");
      if (BOARD_PARSER_TABS[board]) return BOARD_PARSER_TABS[board];
    }
    return PARSER_TAB_BOARD_IDS[initialTab] ? initialTab : "overview";
  });

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      loadServerContentResult(MARKETING_DASHBOARD_STORAGE_KEY),
      loadServerContent(MLM_LEADER_OUTREACH_STORAGE_KEY),
      loadServerContent(INFLUENCER_STORAGE_KEY),
      loadServerContent(INFLUENCER_OUTREACH_STORAGE_KEY),
      loadServerContent(HYIP_STORAGE_KEY),
      loadServerContent(HYIP_OUTREACH_STORAGE_KEY),
      loadServerContent(TELEGRAM_STORAGE_KEY),
      loadServerContent(TELEGRAM_OUTREACH_STORAGE_KEY),
      loadServerContent(ARTICLE_PLACEMENT_STORAGE_KEY),
      getServerJson("/api/marketing/browser-session"),
    ]).then(([
      dashboardResult,
      savedMlmRows,
      savedInfluencerLeads,
      savedInfluencerOutreach,
      savedMonitorLeads,
      savedMonitorOutreach,
      savedTelegramLeads,
      savedTelegramOutreach,
      savedArticleRows,
      marketingSession,
    ]) => {
      if (!isMounted) return;
      const savedDashboard = dashboardResult?.ok && dashboardResult.exists ? dashboardResult.value : null;
      const hydratedDashboard = savedDashboard && typeof savedDashboard === "object"
        ? hydrateMarketingDashboardState(savedDashboard)
        : null;
      if (hydratedDashboard) {
        setDashboardState(hydratedDashboard);
      }
      setSourceStats(buildSourceStats({
        mlmRows: Array.isArray(savedMlmRows) ? savedMlmRows : defaultMlmLeaderOutreachPlatforms,
        influencerLeads: Array.isArray(savedInfluencerLeads) ? savedInfluencerLeads : defaultInfluencerProspects,
        influencerOutreach: savedInfluencerOutreach && typeof savedInfluencerOutreach === "object" ? savedInfluencerOutreach : {},
        monitorLeads: Array.isArray(savedMonitorLeads) ? savedMonitorLeads : hyipDefaultLeads,
        monitorOutreach: savedMonitorOutreach && typeof savedMonitorOutreach === "object" ? savedMonitorOutreach : {},
        telegramLeads: Array.isArray(savedTelegramLeads) ? savedTelegramLeads : defaultTelegramLeads,
        telegramOutreach: savedTelegramOutreach && typeof savedTelegramOutreach === "object" ? savedTelegramOutreach : {},
        articleRows: Array.isArray(savedArticleRows) ? savedArticleRows : defaultArticlePlacementResources,
      }));
      if (hydratedDashboard) {
        try {
          window.localStorage.setItem(MARKETING_DASHBOARD_STORAGE_KEY, JSON.stringify(hydratedDashboard));
        } catch {
          // Серверное состояние уже загружено.
        }
      }
      setDashboardSync(
        marketingSession?.payload?.authorized
          ? { status: "server", label: "Синхронизация с сервером" }
          : dashboardResult?.ok
            ? { status: "local", label: "Только чтение · запросите /marketing_access" }
            : { status: "local", label: "Локальные данные · сервер недоступен" },
      );
      setIsDashboardLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isDashboardLoaded) return undefined;
    setDashboardSync((current) => (
      current.status === "local"
        ? current
        : { status: "saving", label: "Сохраняем…" }
    ));
    const timer = window.setTimeout(() => {
      const requestId = dashboardSaveRef.current + 1;
      dashboardSaveRef.current = requestId;
      try {
        window.localStorage.setItem(MARKETING_DASHBOARD_STORAGE_KEY, JSON.stringify(dashboardState));
      } catch {
        // Content API ниже остаётся основным серверным хранилищем.
      }
      saveServerContentResult(MARKETING_DASHBOARD_STORAGE_KEY, dashboardState).then((result) => {
        if (dashboardSaveRef.current !== requestId) return;
        setDashboardSync(
          result.ok
            ? { status: "saved", label: "Сохранено на сервере" }
            : result.status === 401
              ? { status: "local", label: "Сохранено локально · запросите /marketing_access" }
              : { status: "local", label: "Сохранено локально · сервер недоступен" },
        );
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [dashboardState, isDashboardLoaded]);

  useEffect(() => {
    function handleHistoryChange() {
      const board = new URL(window.location.href).searchParams.get("board") || "";
      const directionId = board.startsWith("marketing-") ? board.replace("marketing-", "") : "";
      if (MARKETING_DIRECTIONS.some((direction) => direction.id === directionId)) {
        setSelectedDirectionId(directionId);
        setActiveTab("direction");
        return;
      }
      setSelectedDirectionId("");
      setActiveTab(BOARD_PARSER_TABS[board] || "overview");
    }

    window.addEventListener("popstate", handleHistoryChange);
    return () => window.removeEventListener("popstate", handleHistoryChange);
  }, []);

  function selectTab(nextTab) {
    setActiveTab(nextTab);
    setSelectedDirectionId("");
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    url.searchParams.set("board", PARSER_TAB_BOARD_IDS[nextTab] || "parser");
    window.history.pushState({}, "", url);
  }

  function selectDirection(directionId) {
    setSelectedDirectionId(directionId);
    setActiveTab("direction");
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    url.searchParams.set("board", `marketing-${directionId}`);
    window.history.pushState({}, "", url);
  }

  function updateDirection(directionId, patch) {
    setDashboardState((current) => ({
      ...current,
      directions: {
        ...current.directions,
        [directionId]: {
          ...current.directions[directionId],
          ...patch,
        },
      },
    }));
  }

  const selectedDirection = useMemo(
    () => MARKETING_DIRECTIONS.find((direction) => direction.id === selectedDirectionId),
    [selectedDirectionId],
  );

  function linkedPanelFor(direction) {
    if (!direction?.baseTab) return null;
    if (direction.baseTab === "mlmLeaders") return <MlmLeaderOutreachPanel />;
    if (direction.baseTab === "influencers") return <InfluencerProspectsPanel />;
    if (direction.baseTab === "monitors") return <HyipParserPanel />;
    if (direction.baseTab === "telegram") return <TelegramChannelsParserPanel />;
    if (direction.baseTab === "articlePlacement") return <ArticlePlacementPanel />;
    if (direction.baseTab === "creatives") return <AtlasCreativesPanel />;
    return null;
  }

  return (
    <section className="analytics-parser-workspace">
      <div className="analytics-parser-subtabs analytics-surface" role="tablist" aria-label="Тип парсера">
        {PARSER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`analytics-parser-subtab${activeTab === tab.id ? " analytics-parser-subtab-active" : ""}`}
            onClick={() => selectTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            <span>{tab.label}</span>
            <small>{tab.hint}</small>
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <MarketingOverview
          dashboardState={dashboardState}
          sourceStats={sourceStats}
          onSelectDirection={selectDirection}
        />
      ) : activeTab === "direction" && selectedDirection ? (
        <MarketingDirectionWorkspace
          direction={selectedDirection}
          value={dashboardState.directions[selectedDirection.id]}
          syncStatus={dashboardSync.status}
          syncLabel={dashboardSync.label}
          operationalPhase={operationalPhase(
            dashboardState.directions[selectedDirection.id],
            sourceStats[selectedDirection.sourceKey] || genericStats(dashboardState.directions[selectedDirection.id]),
          )}
          sourceStats={sourceStats[selectedDirection.sourceKey] || genericStats(dashboardState.directions[selectedDirection.id])}
          onChange={(patch) => updateDirection(selectedDirection.id, patch)}
          onBack={() => selectTab("overview")}
          linkedPanel={linkedPanelFor(selectedDirection)}
        />
      ) : activeTab === "creatives" ? (
        <AtlasCreativesPanel />
      ) : activeTab === "telegram" ? (
        <TelegramChannelsParserPanel />
      ) : activeTab === "influencers" ? (
        <InfluencerProspectsPanel />
      ) : activeTab === "youtubeApi" ? (
        <YouTubeApiSearchPanel />
      ) : activeTab === "bitnestYoutube" ? (
        <BitnestYoutubeParserPanel />
      ) : activeTab === "articlePlacement" ? (
        <ArticlePlacementPanel />
      ) : activeTab === "marketSegments" ? (
        <MarketSegmentsPanel />
      ) : activeTab === "regionalHiring" ? (
        <RegionalHiringPanel />
      ) : activeTab === "mlmLeaders" ? (
        <MlmLeaderOutreachPanel />
      ) : activeTab === "segmentOutreach" ? (
        <SegmentOutreachPanel />
      ) : activeTab === "web3Segments" ? (
        <Web3SegmentsPanel />
      ) : activeTab === "poolMonitor" ? (
        <PoolMonitorPanel />
      ) : (
        <HyipParserPanel />
      )}
    </section>
  );
}
