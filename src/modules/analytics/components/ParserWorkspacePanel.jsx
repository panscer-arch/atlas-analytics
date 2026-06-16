import { useState } from "react";

import HyipParserPanel from "./HyipParserPanel";
import TelegramChannelsParserPanel from "./TelegramChannelsParserPanel";

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
];

export default function ParserWorkspacePanel({ initialTab = "monitors" } = {}) {
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab === "telegram") return "telegram";
    if (typeof window !== "undefined") {
      const board = new URL(window.location.href).searchParams.get("board");
      if (board === "telegramParser") return "telegram";
    }
    return "monitors";
  });

  function selectTab(nextTab) {
    setActiveTab(nextTab);
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("board", nextTab === "telegram" ? "telegramParser" : "parser");
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

      {activeTab === "telegram" ? <TelegramChannelsParserPanel /> : <HyipParserPanel />}
    </section>
  );
}
