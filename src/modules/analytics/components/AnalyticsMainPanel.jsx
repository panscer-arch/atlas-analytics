import AnalyticsBoardEmbed from "./AnalyticsBoardEmbed";
import AnalyticsSectionPanel from "./AnalyticsSectionPanel";
import CrmDashboardTab from "./CrmDashboardTab";
import DevelopmentsRegistry from "./DevelopmentsRegistry";
import ExpensesBoard from "./ExpensesBoard";
import LaunchChecklistSection from "./LaunchChecklistSection";
import LifeDiaryBoard from "./LifeDiaryBoard";
import ParserWorkspacePanel from "./ParserWorkspacePanel";
import ProductLibraryBoard from "./ProductLibraryBoard";
import SocialSubscriptionsBoard from "./SocialSubscriptionsBoard";
import Wrapper from "./Wrapper";
import YouTrackTaskMonitor from "./YouTrackTaskMonitor";
import formatCurrency from "../utils/formatCurrency";
import { useState } from "react";

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
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

  if (activeTab === "tasks") return <TasksWorkspacePanel analyticsBoardUrl={analyticsBoardUrl} />;
  if (activeTab === "taskMonitor") return <TasksWorkspacePanel analyticsBoardUrl={analyticsBoardUrl} initialTab="monitor" />;
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

function TasksWorkspacePanel({ analyticsBoardUrl, initialTab = "checklists" }) {
  const [activeTaskTab, setActiveTaskTab] = useState(initialTab);
  const tabs = [
    { id: "checklists", label: "Задачи чек-листы", hint: "запуск / контент" },
    { id: "monitor", label: "ATL-монитор live", hint: "YouTrack" },
  ];

  return (
    <Wrapper as="section" marginTop="lg">
      <div className="analytics-parser-subtabs analytics-surface" role="tablist" aria-label="Раздел задач">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`analytics-parser-subtab${activeTaskTab === tab.id ? " analytics-parser-subtab-active" : ""}`}
            onClick={() => setActiveTaskTab(tab.id)}
            role="tab"
            aria-selected={activeTaskTab === tab.id}
          >
            <span>{tab.label}</span>
            <small>{tab.hint}</small>
          </button>
        ))}
      </div>
      {activeTaskTab === "monitor" ? (
        <YouTrackTaskMonitor />
      ) : (
        <LaunchChecklistSection mode="tasks" analyticsBoardUrl={analyticsBoardUrl} />
      )}
    </Wrapper>
  );
}
