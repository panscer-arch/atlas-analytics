import AnalyticsBoardEmbed from "./AnalyticsBoardEmbed";
import AnalyticsSectionPanel from "./AnalyticsSectionPanel";
import CrmDashboardTab from "./CrmDashboardTab";
import DevelopmentsRegistry from "./DevelopmentsRegistry";
import ExpensesBoard from "./ExpensesBoard";
import HermesAssistantBoard from "./HermesAssistantBoard";
import LaunchChecklistSection from "./LaunchChecklistSection";
import LifeDiaryBoard from "./LifeDiaryBoard";
import ParserWorkspacePanel from "./ParserWorkspacePanel";
import ProductLibraryBoard from "./ProductLibraryBoard";
import SocialSubscriptionsBoard from "./SocialSubscriptionsBoard";
import WorkSessionQueue from "./WorkSessionQueue";
import Wrapper from "./Wrapper";
import YouTrackTaskMonitor from "./YouTrackTaskMonitor";
import formatCurrency from "../utils/formatCurrency";
import { useEffect, useState } from "react";

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function TasksWorkspacePanel({ analyticsBoardUrl, initialView = "tasks" }) {
  const [activeView, setActiveView] = useState(initialView);
  const tabs = [
    { id: "tasks", label: "Задачи", hint: "чек-листы" },
    { id: "monitor", label: "ATL-монитор", hint: "live" },
  ];

  useEffect(() => {
    function handleHistoryChange() {
      const board = new URL(window.location.href).searchParams.get("board");
      setActiveView(board === "taskMonitor" ? "monitor" : "tasks");
    }

    window.addEventListener("popstate", handleHistoryChange);
    return () => window.removeEventListener("popstate", handleHistoryChange);
  }, []);

  function selectView(nextView) {
    setActiveView(nextView);
    const url = new URL(window.location.href);
    url.searchParams.delete("b");
    url.searchParams.delete("view");
    url.searchParams.set("board", nextView === "monitor" ? "taskMonitor" : "launch");
    window.history.pushState({}, "", url);
  }

  return (
    <Wrapper as="section" marginTop="lg" gap="lg">
      <div className="analytics-parser-subtabs analytics-surface" role="tablist" aria-label="Задачи и ATL-монитор">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`analytics-parser-subtab${activeView === tab.id ? " analytics-parser-subtab-active" : ""}`}
            onClick={() => selectView(tab.id)}
            role="tab"
            aria-selected={activeView === tab.id}
          >
            <span>{tab.label}</span>
            <small>{tab.hint}</small>
          </button>
        ))}
      </div>

      {activeView === "monitor" ? (
        <YouTrackTaskMonitor />
      ) : (
        <LaunchChecklistSection mode="tasks" analyticsBoardUrl={analyticsBoardUrl} />
      )}
    </Wrapper>
  );
}

export default function AnalyticsMainPanel({
  activeTab,
  analyticsBoardUrl,
  crmDashboard,
  analyticsSection,
}) {
  if (activeTab === "dashboard") {
    return (
      <CrmDashboardTab
        {...crmDashboard}
        analyticsTitle={formatCurrency(crmDashboard.analyticsTitleValue)}
        analyticsCoverageLabel={formatPercent(crmDashboard.analyticsCoveragePercent)}
      />
    );
  }

  if (activeTab === "session") return <WorkSessionQueue />;
  if (activeTab === "hermes") return <HermesAssistantBoard />;
  if (activeTab === "tasks") return <TasksWorkspacePanel analyticsBoardUrl={analyticsBoardUrl} />;
  if (activeTab === "taskMonitor") {
    return <TasksWorkspacePanel analyticsBoardUrl={analyticsBoardUrl} initialView="monitor" />;
  }
  if (activeTab === "expenses") {
    return (
      <Wrapper as="section" marginTop="lg">
        <ExpensesBoard />
      </Wrapper>
    );
  }
  if (activeTab === "content") return <LaunchChecklistSection mode="content" analyticsBoardUrl={analyticsBoardUrl} />;

  if (activeTab === "parser") {
    return (
      <Wrapper as="section" marginTop="lg">
        <ParserWorkspacePanel />
      </Wrapper>
    );
  }

  if (activeTab === "socialSubscriptions") {
    return (
      <Wrapper as="section" marginTop="lg">
        <SocialSubscriptionsBoard />
      </Wrapper>
    );
  }

  if (activeTab === "developments") {
    return (
      <Wrapper as="section" marginTop="lg">
        <DevelopmentsRegistry />
      </Wrapper>
    );
  }

  if (activeTab === "productLibrary") {
    return (
      <Wrapper as="section" marginTop="lg">
        <ProductLibraryBoard />
      </Wrapper>
    );
  }

  if (activeTab === "crmBoard") {
    return (
      <Wrapper as="section" marginTop="lg">
        <AnalyticsBoardEmbed boardUrl={analyticsBoardUrl} variant="inline" />
      </Wrapper>
    );
  }

  if (activeTab === "diary") {
    return (
      <Wrapper as="section" marginTop="lg">
        <LifeDiaryBoard />
      </Wrapper>
    );
  }

  return <AnalyticsSectionPanel {...analyticsSection} />;
}
