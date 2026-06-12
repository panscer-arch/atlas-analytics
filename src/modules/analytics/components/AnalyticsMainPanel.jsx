import AnalyticsBoardEmbed from "./AnalyticsBoardEmbed";
import AnalyticsSectionPanel from "./AnalyticsSectionPanel";
import CodexSystemBoard from "./CodexSystemBoard";
import CrmDashboardTab from "./CrmDashboardTab";
import DevelopmentsRegistry from "./DevelopmentsRegistry";
import ExpensesBoard from "./ExpensesBoard";
import HyipParserPanel from "./HyipParserPanel";
import LaunchChecklistSection from "./LaunchChecklistSection";
import LifeDiaryBoard from "./LifeDiaryBoard";
import ProductLibraryBoard from "./ProductLibraryBoard";
import SocialSubscriptionsBoard from "./SocialSubscriptionsBoard";
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

  if (activeTab === "tasks") return <LaunchChecklistSection mode="tasks" />;
  if (activeTab === "expenses") {
    return (
      <Wrapper as="section" marginTop="lg">
        <ExpensesBoard />
      </Wrapper>
    );
  }
  if (activeTab === "content") return <LaunchChecklistSection mode="content" />;

  if (activeTab === "parser") {
    return (
      <Wrapper as="section" marginTop="lg">
        <HyipParserPanel />
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

  if (activeTab === "codexSystem") {
    return (
      <Wrapper as="section" marginTop="lg">
        <CodexSystemBoard />
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
