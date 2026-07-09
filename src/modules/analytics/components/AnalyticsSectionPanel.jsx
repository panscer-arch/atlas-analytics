import AnalyticsTabs from "./AnalyticsTabs";
import BaseCompositionTabSection from "./BaseCompositionTabSection";
import ContractBalancesPanel from "./ContractBalancesPanel";
import DashboardTabSection from "./DashboardTabSection";
import ExpensesBoard from "./ExpensesBoard";
import GeographyTabSection from "./GeographyTabSection";
import LeadersTabSection from "./LeadersTabSection";
import OverviewTabSection from "./OverviewTabSection";
import PartnerTabSection from "./PartnerTabSection";
import ProductsTabSection from "./ProductsTabSection";
import ReinvestTabSection from "./ReinvestTabSection";
import TrafficTabSection from "./TrafficTabSection";
import WalletsTabSection from "./WalletsTabSection";
import Wrapper from "./Wrapper";

export default function AnalyticsSectionPanel({
  activeAnalyticsTab,
  analyticsSectionTabs,
  setActiveAnalyticsTab,
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
  periodOptions,
  filteredLifecycleTotals,
  pagedLifecycleRows,
  safeActivationPage,
  activationTotalPages,
  onActivationPeriodChange,
  onActivationPageChange,
  structureKpis,
}) {
  return (
    <>
      <Wrapper as="section" marginTop="lg">
        <AnalyticsTabs tabs={analyticsSectionTabs} activeTab={activeAnalyticsTab} onChange={setActiveAnalyticsTab} />
      </Wrapper>

      {activeAnalyticsTab === "dashboard" ? (
        <DashboardTabSection
          data={data}
          overviewOperations={overviewOperations}
          cashPosition={cashPosition}
          todaySnapshot={todaySnapshot}
          contractNetFlowToday={contractNetFlowToday}
          next72h={next72h}
          trafficTabData={trafficTabData}
          reinvestCapitalRate={reinvestCapitalRate}
          repeatDepositRate={repeatDepositRate}
        />
      ) : null}
      {activeAnalyticsTab === "traffic" ? (
        <TrafficTabSection
          trafficTabData={trafficTabData}
          activationPeriod={activationPeriod}
          periodOptions={periodOptions}
          filteredLifecycleTotals={filteredLifecycleTotals}
          pagedLifecycleRows={pagedLifecycleRows}
          safeActivationPage={safeActivationPage}
          activationTotalPages={activationTotalPages}
          onActivationPeriodChange={onActivationPeriodChange}
          onActivationPageChange={onActivationPageChange}
        />
      ) : null}
      {activeAnalyticsTab === "products" ? <ProductsTabSection productsTabData={productsTabData} /> : null}
      {activeAnalyticsTab === "reinvest" ? <ReinvestTabSection reinvestTabData={reinvestTabData} /> : null}
      {activeAnalyticsTab === "base" ? <BaseCompositionTabSection baseCompositionData={data.tabsData.baseComposition} /> : null}
      {activeAnalyticsTab === "leaders" ? <LeadersTabSection leadersData={data.tabsData.leaders} /> : null}
      {activeAnalyticsTab === "geography" ? <GeographyTabSection geographyData={data.tabsData.geography} /> : null}
      {activeAnalyticsTab === "partner" ? <PartnerTabSection partnerData={data.tabsData.partner} /> : null}
      {activeAnalyticsTab === "wallets" ? <WalletsTabSection walletsData={data.tabsData.wallets} /> : null}
      {activeAnalyticsTab === "expenses" ? (
        <Wrapper as="section" marginTop="lg">
          <ExpensesBoard />
        </Wrapper>
      ) : null}
      {activeAnalyticsTab === "contracts" ? (
        <Wrapper as="section" marginTop="lg">
          <ContractBalancesPanel />
        </Wrapper>
      ) : null}
      {activeAnalyticsTab === "overview" ? (
        <OverviewTabSection
          primaryKpis={primaryKpis}
          contractPulseKpis={contractPulseKpis}
          operationalSnapshotKpis={operationalSnapshotKpis}
          trafficToMoneyKpis={trafficToMoneyKpis}
          graphsOpenSignal={graphsOpenSignal}
          data={data}
          overviewOperations={overviewOperations}
          next72h={next72h}
          activationPeriod={activationPeriod}
          periodOptions={periodOptions}
          filteredLifecycleTotals={filteredLifecycleTotals}
          pagedLifecycleRows={pagedLifecycleRows}
          safeActivationPage={safeActivationPage}
          activationTotalPages={activationTotalPages}
          onActivationPeriodChange={onActivationPeriodChange}
          onActivationPageChange={onActivationPageChange}
          structureKpis={structureKpis}
        />
      ) : null}
    </>
  );
}
