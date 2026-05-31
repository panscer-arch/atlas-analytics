import AnalyticsDataTable from "./AnalyticsDataTable";
import ChartCard from "./ChartCard";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import MetricsGrid from "./MetricsGrid";
import SectionHeading from "./SectionHeading";
import TabSummary from "./TabSummary";
import Wrapper from "./Wrapper";
import TrafficSourcesChart from "../charts/TrafficSourcesChart";

export default function WalletsTabSection({ walletsData }) {
  return (
    <>
      <Wrapper as="section" marginTop="lg">
        <TabSummary kicker="Кошельки" title={walletsData.summary.title} description={walletsData.summary.description} bullets={walletsData.summary.bullets} />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <SectionHeading kicker="Кошельки" title="Где деньги, где нагрузка и где концентрация риска" />
        <MetricsGrid metrics={walletsData.metrics} density="balanced" />
      </Wrapper>
      <Wrapper as="section" marginTop="sm">
        <LayoutGrid columns="two" gap="md">
          <LayoutCell>
            <ChartCard title="Inflow по кошелькам" subtitle="Какие кошельки держат основной объём.">
              <TrafficSourcesChart data={walletsData.inflowShare} />
            </ChartCard>
          </LayoutCell>
          <LayoutCell>
            <ChartCard title="Obligations по кошелькам" subtitle="Какие кошельки создают большую будущую нагрузку.">
              <TrafficSourcesChart data={walletsData.obligationsShare} />
            </ChartCard>
          </LayoutCell>
        </LayoutGrid>
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <AnalyticsDataTable
          title="Top wallets"
          subtitle="Кошельки по объёму и будущей нагрузке."
          columns={[
            { key: "wallet", label: "Кошелёк" },
            { key: "role", label: "Роль" },
            { key: "ownerType", label: "Тип" },
            { key: "inflow", label: "Inflow", type: "currency" },
            { key: "obligations", label: "Obligations", type: "currency" },
            { key: "network", label: "Сеть" },
          ]}
          rows={walletsData.rows}
        />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <LayoutGrid columns="two" gap="md">
          <LayoutCell>
            <AnalyticsDataTable
              title="Качество кошельков"
              subtitle="Активность кошелька, claim-нагрузка и его полезность для системы."
              columns={[
                { key: "wallet", label: "Кошелёк" },
                { key: "ownerType", label: "Тип" },
                { key: "activityScore", label: "Активность", type: "percent" },
                { key: "claimable", label: "Claimable", type: "currency" },
                { key: "accrued", label: "Accrued", type: "currency" },
                { key: "claimPressure", label: "Claim pressure", type: "percent" },
                { key: "reinvestFlow", label: "Reinvest flow", type: "currency" },
              ]}
              rows={walletsData.qualityRows}
            />
          </LayoutCell>
          <LayoutCell>
            <AnalyticsDataTable
              title="Risk profile кошельков"
              subtitle="Где опасная концентрация, нагрузка и слабый net contribution."
              columns={[
                { key: "wallet", label: "Кошелёк" },
                { key: "role", label: "Роль" },
                { key: "concentrationShare", label: "Доля", type: "percent" },
                { key: "obligations", label: "Obligations", type: "currency" },
                { key: "obligationLoad", label: "Load", type: "percent" },
                { key: "riskScore", label: "Risk score", type: "percent" },
                { key: "netContribution", label: "Net contribution", type: "currency" },
              ]}
              rows={walletsData.riskRows}
            />
          </LayoutCell>
        </LayoutGrid>
      </Wrapper>
    </>
  );
}
