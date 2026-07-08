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
import YouTubeApiSearchPanel from "./YouTubeApiSearchPanel";

const PARSER_TABS = [
  {
    id: "overview",
    label: "Маркетинг",
    hint: "центр",
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
    id: "poolMonitor",
    label: "Pool Monitor",
    hint: "USDT/USDC",
  },
];

const MARKETING_TOOL_GROUPS = [
  {
    id: "youtube",
    title: "YouTube-блогеры",
    summary: "Обзорщики BitNest, YouTube API и база найденных каналов для outreach.",
    stat: "593 канала",
    status: "В работе",
    primaryTab: "bitnestYoutube",
    tools: [
      { label: "Битнест YouTube", tab: "bitnestYoutube" },
      { label: "YouTube API поиск", tab: "youtubeApi" },
    ],
  },
  {
    id: "monitors",
    title: "Иностранные HYIP / crypto мониторы",
    summary: "Мониторы, листинги и площадки, где можно проверять размещения по Atlas.",
    stat: "HYIP / crypto",
    status: "Сбор базы",
    primaryTab: "monitors",
    tools: [{ label: "Открыть мониторы", tab: "monitors" }],
  },
  {
    id: "telegram",
    title: "Telegram / Telega.io",
    summary: "Telegram-каналы, Telega.io и лиды для закупки размещений и проверки охвата.",
    stat: "100 лидов",
    status: "Отбор",
    primaryTab: "telegram",
    tools: [{ label: "Telegram-каналы", tab: "telegram" }],
  },
  {
    id: "influencers",
    title: "Инфлюенсеры",
    summary: "Отдельная база блогеров, каналов и авторов, с которыми можно заходить через рекламу или обзор.",
    stat: "500 лидов",
    status: "Квалификация",
    primaryTab: "influencers",
    tools: [{ label: "Открыть инфлюенсеров", tab: "influencers" }],
  },
  {
    id: "networkers",
    title: "Сетевики / MLM-лидеры",
    summary: "Знакомые сетевики, Генри, Бона и внешние MLM-источники для поиска лидеров структур.",
    stat: "43 источника",
    status: "Приоритизация",
    primaryTab: "mlmLeaders",
    tools: [{ label: "MLM лидеры", tab: "mlmLeaders" }],
  },
  {
    id: "articles",
    title: "Статьи / Collaborator.pro",
    summary: "SuperSource, площадки для статей, PR-публикации, guest posts и SEO-размещения.",
    stat: "100 площадок",
    status: "Медиаплан",
    primaryTab: "articlePlacement",
    tools: [{ label: "SuperSource", tab: "articlePlacement" }],
  },
  {
    id: "segmentation",
    title: "Сегментация",
    summary: "Сегменты рынка, Web3-аудитории и сегментный парсер по социальным сетям.",
    stat: "7 направлений",
    status: "Аналитика",
    primaryTab: "marketSegments",
    tools: [
      { label: "Сегменты рынка", tab: "marketSegments" },
      { label: "Сегментный парсер", tab: "segmentOutreach" },
    ],
  },
  {
    id: "regional",
    title: "Regional Partners",
    summary: "Площадки и вакансии для поиска региональных партнёров и community-лидеров.",
    stat: "Вакансии",
    status: "Тест гипотезы",
    primaryTab: "regionalHiring",
    tools: [{ label: "Regional Partners", tab: "regionalHiring" }],
  },
  {
    id: "pool",
    title: "Pool Monitor",
    summary: "Отдельный мониторинг ликвидности USDT/USDC, чтобы видеть состояние пула рядом с маркетингом.",
    stat: "USDT/USDC",
    status: "Read-only",
    primaryTab: "poolMonitor",
    tools: [{ label: "Pool Monitor", tab: "poolMonitor" }],
  },
];

const MARKETING_HISTORY_ROWS = [
  {
    title: "Собрать источники",
    details: "Мониторы, YouTube, Telegram, SuperSource, MLM-лидеры и сегменты рынка сведены в единый центр.",
    state: "Готово",
  },
  {
    title: "Квалифицировать площадки",
    details: "Для каждого канала дальше фиксируем статус, контакт, цену, формат размещения и следующий шаг.",
    state: "В работе",
  },
  {
    title: "Вести историю реализации",
    details: "Внутри разделов можно накапливать проделанную работу, расходы, договоренности и результаты.",
    state: "Следующий слой",
  },
];

function MarketingOverview({ onSelectTab }) {
  return (
    <div className="analytics-marketing-hub">
      <section className="analytics-marketing-hub-hero analytics-surface">
        <div>
          <p className="analytics-kicker">Marketing command center</p>
          <h2>Маркетинговые инструменты и история реализации</h2>
          <p>
            Единая страница для всех каналов продвижения Atlas: быстро открываем рабочий инструмент, видим
            мини-статистику и постепенно собираем историю действий, бюджетов и результатов.
          </p>
        </div>
        <div className="analytics-marketing-hub-summary" aria-label="Сводка маркетинговых инструментов">
          <span>Инструменты</span>
          <strong>{MARKETING_TOOL_GROUPS.length}</strong>
          <small>YouTube, Telegram, HYIP, статьи, MLM, сегментация и мониторинг</small>
        </div>
      </section>

      <section className="analytics-marketing-tool-grid" aria-label="Маркетинговые направления">
        {MARKETING_TOOL_GROUPS.map((group) => (
          <article key={group.id} className="analytics-marketing-tool-card analytics-surface">
            <button type="button" onClick={() => onSelectTab(group.primaryTab)}>
              <span>{group.status}</span>
              <strong>{group.title}</strong>
              <p>{group.summary}</p>
              <b>{group.stat}</b>
            </button>
            <div>
              {group.tools.map((tool) => (
                <button key={`${group.id}-${tool.tab}`} type="button" onClick={() => onSelectTab(tool.tab)}>
                  {tool.label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="analytics-marketing-history analytics-surface">
        <div className="analytics-parser-panel-head">
          <div>
            <p className="analytics-kicker">Implementation history</p>
            <h2>История реализации и отчетность</h2>
            <p>Здесь удобно держать общую картину: что уже собрано, что проверяется, куда потрачены деньги и что делать дальше.</p>
          </div>
        </div>
        <div className="analytics-marketing-history-grid">
          {MARKETING_HISTORY_ROWS.map((row, index) => (
            <article key={row.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{row.title}</strong>
                <p>{row.details}</p>
              </div>
              <em>{row.state}</em>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function ParserWorkspacePanel({ initialTab = "overview" } = {}) {
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab === "overview") return "overview";
    if (initialTab === "monitors") return "monitors";
    if (initialTab === "telegram") return "telegram";
    if (initialTab === "influencers") return "influencers";
    if (initialTab === "youtubeApi") return "youtubeApi";
    if (initialTab === "bitnestYoutube") return "bitnestYoutube";
    if (initialTab === "articlePlacement") return "articlePlacement";
    if (initialTab === "marketSegments") return "marketSegments";
    if (initialTab === "regionalHiring") return "regionalHiring";
    if (initialTab === "mlmLeaders") return "mlmLeaders";
    if (initialTab === "segmentOutreach") return "segmentOutreach";
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
                      : nextTab === "poolMonitor"
                        ? "poolMonitor"
                        : nextTab === "overview"
                          ? "parser"
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
        <MarketingOverview onSelectTab={selectTab} />
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
      ) : activeTab === "poolMonitor" ? (
        <PoolMonitorPanel />
      ) : (
        <HyipParserPanel />
      )}
    </section>
  );
}
