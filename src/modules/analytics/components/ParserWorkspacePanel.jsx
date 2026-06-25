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

export default function ParserWorkspacePanel({ initialTab = "monitors" } = {}) {
  const [activeTab, setActiveTab] = useState(() => {
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
    return "monitors";
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

      {activeTab === "telegram" ? (
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
