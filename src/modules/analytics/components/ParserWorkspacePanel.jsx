import { useState } from "react";

import ArticlePlacementPanel from "./ArticlePlacementPanel";
import BitnestYoutubeParserPanel from "./BitnestYoutubeParserPanel";
import HyipParserPanel from "./HyipParserPanel";
import InfluencerProspectsPanel from "./InfluencerProspectsPanel";
import MarketSegmentsPanel from "./MarketSegmentsPanel";
import MlmLeaderOutreachPanel from "./MlmLeaderOutreachPanel";
import PoolMonitorPanel from "./PoolMonitorPanel";
import RegionalHiringPanel from "./RegionalHiringPanel";
import SegmentOutreachPanel from "./SegmentOutreachPanel";
import TelegramChannelsParserPanel from "./TelegramChannelsParserPanel";
import Web3SegmentsPanel from "./Web3SegmentsPanel";
import YouTubeApiSearchPanel from "./YouTubeApiSearchPanel";

const PARSER_TABS = [
  {
    id: "overview",
    label: "Маркетинг",
    hint: "дашборд",
  },
  {
    id: "monitors",
    label: "Мониторы",
    hint: "HYIP / crypto",
  },
  {
    id: "telegram",
    label: "Telegram-каналы",
    hint: "100 лидов",
  },
  {
    id: "influencers",
    label: "Инфлюенсеры",
    hint: "500 лидов",
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
    hint: "100 площадок",
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
    hint: "43 источника",
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

const MARKETING_TOOL_GROUPS = [
  {
    id: "youtube",
    title: "YouTube-блогеры",
    subtitle: "обзорщики Bitnest, YouTube API и каналы",
    metric: "593+ каналов",
    action: "Открыть YouTube",
    target: "bitnestYoutube",
    items: ["Битнест YouTube", "YouTube API"],
  },
  {
    id: "hyip",
    title: "Иностранные HYIP-мониторы",
    subtitle: "HYIP / crypto площадки для первичного outreach",
    metric: "мониторы",
    action: "Открыть мониторы",
    target: "monitors",
    items: ["HYIP crypto", "проверка контактов", "статусы переговоров"],
  },
  {
    id: "telegram",
    title: "Telega.io и Telegram-каналы",
    subtitle: "каналы, закупы, лиды и рекламные размещения",
    metric: "100 лидов",
    action: "Открыть Telegram",
    target: "telegram",
    items: ["Telegram-каналы", "Telega.io", "админы каналов"],
  },
  {
    id: "articles",
    title: "Статьи и SuperSource",
    subtitle: "площадки под обзоры, публикации и внешние материалы",
    metric: "100 площадок",
    action: "Открыть площадки",
    target: "articlePlacement",
    items: ["Colaborator.pro", "SuperSource", "статейные площадки"],
  },
  {
    id: "mlm",
    title: "MLM-лидеры и знакомые сетевики",
    subtitle: "сетевики, региональные лидеры и партнёрские контакты",
    metric: "43 источника",
    action: "Открыть MLM",
    target: "mlmLeaders",
    items: ["MLM лидеры", "Regional Partners", "личные знакомства"],
  },
  {
    id: "segmentation",
    title: "Сегментация и аналитика рынков",
    subtitle: "сегменты, аудитории Web3 и сегментный парсер",
    metric: "7 направлений",
    action: "Открыть сегменты",
    target: "marketSegments",
    items: ["Сегменты рынка", "Web3 сегменты", "Сегментный парсер"],
  },
  {
    id: "influencers",
    title: "Инфлюенсеры",
    subtitle: "лиды по соцсетям, охватам, статусам и следующим шагам",
    metric: "500 лидов",
    action: "Открыть инфлюенсеров",
    target: "influencers",
    items: ["соцсети", "контакты", "оценка релевантности"],
  },
  {
    id: "special",
    title: "Генри, Бона и спец-истории",
    subtitle: "отдельные каналы реализации, договорённости и история работ",
    metric: "ручной трек",
    action: "Открыть бриф",
    target: "regionalHiring",
    items: ["Генри", "Бона", "история реализации"],
  },
];

const MARKETING_HISTORY_ROWS = [
  ["Формирование базы", "Собираем источники, лиды и площадки в единый маркетинговый контур."],
  ["Outreach", "Фиксируем контакт, статус, следующий шаг, бюджет и результат."],
  ["Отчётность", "По каждому направлению можно вести проделанную работу, расходы и выводы."],
];

export default function ParserWorkspacePanel({ initialTab = "overview" } = {}) {
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab === "overview") return "overview";
    if (initialTab === "telegram") return "telegram";
    if (initialTab === "influencers") return "influencers";
    if (initialTab === "youtubeApi") return "youtubeApi";
    if (initialTab === "bitnestYoutube") return "bitnestYoutube";
    if (initialTab === "articlePlacement") return "articlePlacement";
    if (initialTab === "marketSegments") return "marketSegments";
    if (initialTab === "regionalHiring") return "regionalHiring";
    if (initialTab === "mlmLeaders") return "mlmLeaders";
    if (initialTab === "segmentOutreach") return "segmentOutreach";
    if (initialTab === "web3Segments") return "web3Segments";
    if (initialTab === "poolMonitor") return "poolMonitor";
    if (typeof window !== "undefined") {
      const board = new URL(window.location.href).searchParams.get("board");
      if (board === "telegramParser") return "telegram";
      if (board === "influencers") return "influencers";
      if (board === "youtubeApiSearch") return "youtubeApi";
      if (board === "bitnestYoutube") return "bitnestYoutube";
      if (board === "articlePlacement") return "articlePlacement";
      if (board === "marketSegments") return "marketSegments";
      if (board === "regionalHiring") return "regionalHiring";
      if (board === "mlmLeaders") return "mlmLeaders";
      if (board === "segmentOutreach") return "segmentOutreach";
      if (board === "web3Segments") return "web3Segments";
      if (board === "poolMonitor") return "poolMonitor";
    }
    return "overview";
  });

  function selectTab(nextTab) {
    setActiveTab(nextTab);
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set(
      "board",
      nextTab === "telegram"
        ? "telegramParser"
        : nextTab === "influencers"
          ? "influencers"
          : nextTab === "youtubeApi"
            ? "youtubeApiSearch"
            : nextTab === "bitnestYoutube"
              ? "bitnestYoutube"
              : nextTab === "articlePlacement"
                ? "articlePlacement"
              : nextTab === "marketSegments"
                ? "marketSegments"
                : nextTab === "regionalHiring"
                  ? "regionalHiring"
                  : nextTab === "mlmLeaders"
                    ? "mlmLeaders"
                    : nextTab === "segmentOutreach"
                      ? "segmentOutreach"
                      : nextTab === "web3Segments"
                        ? "web3Segments"
                        : nextTab === "poolMonitor"
                          ? "poolMonitor"
                          : "parser",
    );
    window.history.replaceState({}, "", url);
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
        <MarketingOverview onOpen={selectTab} />
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

function MarketingOverview({ onOpen }) {
  const totalTools = MARKETING_TOOL_GROUPS.length;
  const totalSources = "1300+";
  const activeTracks = MARKETING_TOOL_GROUPS.filter((group) => group.metric).length;

  return (
    <section className="analytics-marketing-hub">
      <div className="analytics-marketing-hero analytics-surface">
        <div>
          <p className="analytics-kicker">Marketing command center</p>
          <h1>Маркетинг Atlas / SuperSUS</h1>
          <p>
            Единая страница для инструментов продвижения, истории реализации, бюджетов,
            статусов переговоров и мини-отчётности по каждому каналу.
          </p>
        </div>
        <div className="analytics-marketing-hero-stats">
          <article>
            <span>Направления</span>
            <strong>{totalTools}</strong>
          </article>
          <article>
            <span>Источники</span>
            <strong>{totalSources}</strong>
          </article>
          <article>
            <span>Треки</span>
            <strong>{activeTracks}</strong>
          </article>
        </div>
      </div>

      <div className="analytics-marketing-grid">
        {MARKETING_TOOL_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            className="analytics-marketing-card analytics-surface"
            onClick={() => onOpen(group.target)}
          >
            <span className="analytics-marketing-card-metric">{group.metric}</span>
            <strong>{group.title}</strong>
            <p>{group.subtitle}</p>
            <small>{group.items.join(" · ")}</small>
            <em>{group.action}</em>
          </button>
        ))}
      </div>

      <div className="analytics-marketing-history analytics-surface">
        <div>
          <p className="analytics-kicker">История реализации</p>
          <h2>Как вести работу внутри разделов</h2>
        </div>
        {MARKETING_HISTORY_ROWS.map(([title, description]) => (
          <article key={title}>
            <strong>{title}</strong>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
