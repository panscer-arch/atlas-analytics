import AnalyticsSectionPanel from "./AnalyticsSectionPanel";
import CrmDashboardTab from "./CrmDashboardTab";
import LaunchChecklistSection from "./LaunchChecklistSection";
import LifeDiaryBoard from "./LifeDiaryBoard";
import Wrapper from "./Wrapper";
import formatCurrency from "../utils/formatCurrency";

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

  if (activeTab === "tasks") return <LaunchChecklistSection mode="tasks" analyticsBoardUrl={analyticsBoardUrl} />;
  if (activeTab === "content") return <LaunchChecklistSection mode="content" />;

  if (activeTab === "diary") {
    return (
      <Wrapper as="section" marginTop="lg">
        <LifeDiaryBoard />
      </Wrapper>
    );
  }

  return <AnalyticsSectionPanel {...analyticsSection} />;
}
