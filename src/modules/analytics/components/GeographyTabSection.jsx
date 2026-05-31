import AnalyticsDataTable from "./AnalyticsDataTable";
import ChartCard from "./ChartCard";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import MetricsGrid from "./MetricsGrid";
import SectionHeading from "./SectionHeading";
import TabSummary from "./TabSummary";
import Wrapper from "./Wrapper";
import TrafficSourcesChart from "../charts/TrafficSourcesChart";

export default function GeographyTabSection({ geographyData }) {
  return (
    <>
      <Wrapper as="section" marginTop="lg">
        <TabSummary kicker="География" title={geographyData.summary.title} description={geographyData.summary.description} bullets={geographyData.summary.bullets} />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <SectionHeading kicker="География" title="Какие страны дают пользователей, деньги и обязательства" />
        <MetricsGrid metrics={geographyData.metrics} density="balanced" />
      </Wrapper>
      <Wrapper as="section" marginTop="sm">
        <LayoutGrid columns="two" gap="md">
          <LayoutCell>
            <ChartCard title="Inflow по странам" subtitle="Какие страны дают основной денежный поток.">
              <TrafficSourcesChart data={geographyData.inflowShare} />
            </ChartCard>
          </LayoutCell>
          <LayoutCell>
            <ChartCard title="Obligations по странам" subtitle="Какие страны дают большую будущую нагрузку.">
              <TrafficSourcesChart data={geographyData.obligationsShare} />
            </ChartCard>
          </LayoutCell>
        </LayoutGrid>
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <AnalyticsDataTable
          title="Страны"
          subtitle="Ключевая география системы."
          columns={[
            { key: "country", label: "Страна" },
            { key: "city", label: "Город" },
            { key: "users", label: "Users", type: "number" },
            { key: "wallets", label: "Wallets", type: "number" },
            { key: "inflow", label: "Inflow", type: "currency" },
            { key: "obligations", label: "Obligations", type: "currency" },
            { key: "deposits", label: "Deposits", type: "currency" },
          ]}
          rows={geographyData.rows}
        />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <LayoutGrid columns="two" gap="md">
          <LayoutCell>
            <AnalyticsDataTable
              title="Качество стран"
              subtitle="Какие страны дают не просто объём, а более живую и зрелую базу."
              columns={[
                { key: "country", label: "Страна" },
                { key: "activeUsers", label: "Активные", type: "number" },
                { key: "activeRate", label: "Активность", type: "percent" },
                { key: "newUsers", label: "Новые", type: "number" },
                { key: "repeatUsers", label: "Повторные", type: "number" },
                { key: "repeatRate", label: "Repeat rate", type: "percent" },
                { key: "reinvestUsers", label: "Реинвест", type: "number" },
                { key: "reinvestRate", label: "Reinvest rate", type: "percent" },
                { key: "payingRate", label: "Платят", type: "percent" },
              ]}
              rows={geographyData.qualityRows}
            />
          </LayoutCell>
          <LayoutCell>
            <AnalyticsDataTable
              title="Risk profile стран"
              subtitle="Где нагрузка и claim-профиль уже опаснее качества роста."
              columns={[
                { key: "country", label: "Страна" },
                { key: "obligations", label: "Obligations", type: "currency" },
                { key: "obligationLoad", label: "Load", type: "percent" },
                { key: "claimRate", label: "Claim rate", type: "percent" },
                { key: "riskScore", label: "Risk score", type: "percent" },
                { key: "growthScore", label: "Growth score", type: "percent" },
              ]}
              rows={geographyData.riskRows}
            />
          </LayoutCell>
        </LayoutGrid>
      </Wrapper>
    </>
  );
}
