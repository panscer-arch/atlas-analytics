import AnalyticsDataTable from "./AnalyticsDataTable";
import ChartCard from "./ChartCard";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import MetricsGrid from "./MetricsGrid";
import SectionHeading from "./SectionHeading";
import TabSummary from "./TabSummary";
import Wrapper from "./Wrapper";
import TrafficSourcesChart from "../charts/TrafficSourcesChart";

export default function LeadersTabSection({ leadersData }) {
  return (
    <>
      <Wrapper as="section" marginTop="lg">
        <TabSummary kicker="Лидеры" title={leadersData.summary.title} description={leadersData.summary.description} bullets={leadersData.summary.bullets} />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <SectionHeading kicker="Лидеры" title="Кто двигает систему деньгами и структурно" />
        <MetricsGrid metrics={leadersData.metrics} density="balanced" />
      </Wrapper>
      <Wrapper as="section" marginTop="sm">
        <LayoutGrid columns="two" gap="md">
          <LayoutCell>
            <ChartCard title="Доли по участию" subtitle="Кто держит основной объём инвестиций.">
              <TrafficSourcesChart data={leadersData.participationShare} />
            </ChartCard>
          </LayoutCell>
          <LayoutCell>
            <ChartCard title="Доли по привлечению" subtitle="Кто приводит основной inflow.">
              <TrafficSourcesChart data={leadersData.attractionShare} />
            </ChartCard>
          </LayoutCell>
        </LayoutGrid>
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <LayoutGrid columns="two" gap="md">
          <LayoutCell>
            <AnalyticsDataTable
              title="Лидеры по участию"
              subtitle="Кто больше всего инвестирует и активно участвует."
              columns={[
                { key: "name", label: "Пользователь" },
                { key: "country", label: "Страна" },
                { key: "investment", label: "Объём", type: "currency" },
                { key: "cycles", label: "Циклы", type: "number" },
                { key: "activeDays", label: "Активные дни", type: "number" },
              ]}
              rows={leadersData.participation}
            />
          </LayoutCell>
          <LayoutCell>
            <AnalyticsDataTable
              title="Лидеры по привлечению"
              subtitle="Кто приводит участников и деньги."
              columns={[
                { key: "name", label: "Лидер" },
                { key: "country", label: "Страна" },
                { key: "invited", label: "Приглашено", type: "number" },
                { key: "activeInvited", label: "Активных", type: "number" },
                { key: "inflow", label: "Привлечённый inflow", type: "currency" },
                { key: "referralLoad", label: "Referral load", type: "currency" },
              ]}
              rows={leadersData.attraction}
            />
          </LayoutCell>
        </LayoutGrid>
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <LayoutGrid columns="two" gap="md">
          <LayoutCell>
            <AnalyticsDataTable
              title="Качество лидеров по участию"
              subtitle="Насколько лидер полезен системе, а не только большой по объёму."
              columns={[
                { key: "name", label: "Лидер" },
                { key: "country", label: "Страна" },
                { key: "obligations", label: "Obligations", type: "currency" },
                { key: "referralIncome", label: "Рефдоход", type: "currency" },
                { key: "netContribution", label: "Net contribution", type: "currency" },
                { key: "reinvestRate", label: "Reinvest rate", type: "percent" },
                { key: "retentionRate", label: "Retention", type: "percent" },
                { key: "claimRate", label: "Claim rate", type: "percent" },
              ]}
              rows={leadersData.participationQuality}
            />
          </LayoutCell>
          <LayoutCell>
            <AnalyticsDataTable
              title="Качество лидеров по привлечению"
              subtitle="Насколько сильна и устойчива база каждого лидера."
              columns={[
                { key: "name", label: "Лидер" },
                { key: "country", label: "Страна" },
                { key: "activeInvited", label: "Активные", type: "number" },
                { key: "depositingInvited", label: "С депозитом", type: "number" },
                { key: "leaderDependency", label: "Зависимость", type: "percent" },
                { key: "baseRetention", label: "Retention", type: "percent" },
                { key: "reinvestRate", label: "Reinvest", type: "percent" },
                { key: "claimPressure", label: "Claim pressure", type: "percent" },
                { key: "netContribution", label: "Net contribution", type: "currency" },
              ]}
              rows={leadersData.attractionQuality}
            />
          </LayoutCell>
        </LayoutGrid>
      </Wrapper>
    </>
  );
}
