import AnalyticsDataTable from "./AnalyticsDataTable";
import ChartCard from "./ChartCard";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import MetricsGrid from "./MetricsGrid";
import SectionHeading from "./SectionHeading";
import TabSummary from "./TabSummary";
import Wrapper from "./Wrapper";
import RetentionChart from "../charts/RetentionChart";
import TrafficSourcesChart from "../charts/TrafficSourcesChart";

export default function ReinvestTabSection({ reinvestTabData }) {
  return (
    <>
      <Wrapper as="section" marginTop="lg">
        <TabSummary kicker="Реинвест" title={reinvestTabData.summary.title} description={reinvestTabData.summary.description} bullets={reinvestTabData.summary.bullets} />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <SectionHeading kicker="Реинвест" title="Насколько пользователи возвращают деньги в систему" />
        <MetricsGrid metrics={reinvestTabData.metrics} density="balanced" />
      </Wrapper>
      <Wrapper as="section" marginTop="sm">
        <LayoutGrid columns="two" gap="md">
          <LayoutCell>
            <ChartCard title="Реинвест по продуктам" subtitle="Где пользователи чаще возвращают капитал в систему.">
              <TrafficSourcesChart data={reinvestTabData.productShare} />
            </ChartCard>
          </LayoutCell>
          <LayoutCell>
            <ChartCard title="Скорость реинвеста" subtitle="Как быстро пользователи возвращаются после claim.">
              <RetentionChart data={reinvestTabData.timeline} />
            </ChartCard>
          </LayoutCell>
        </LayoutGrid>
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <LayoutGrid columns="two" gap="md">
          <LayoutCell>
            <AnalyticsDataTable
              title="Реинвест по продуктам"
              subtitle="Claims, reinvest и возврат капитала по продуктам."
              columns={[
                { key: "source", label: "Продукт" },
                { key: "claimUsers", label: "Claim users", type: "number" },
                { key: "reinvestUsers", label: "Reinvest users", type: "number" },
                { key: "userRate", label: "Users rate", type: "percent" },
                { key: "claimedCapital", label: "Claimed capital", type: "currency" },
                { key: "reinvestedCapital", label: "Reinvested capital", type: "currency" },
                { key: "capitalRate", label: "Capital rate", type: "percent" },
              ]}
              rows={reinvestTabData.byProduct}
            />
          </LayoutCell>
          <LayoutCell>
            <AnalyticsDataTable
              title="Реинвест по странам"
              subtitle="Где реинвест выше по людям и по капиталу."
              columns={[
                { key: "country", label: "Страна" },
                { key: "claimUsers", label: "Claim users", type: "number" },
                { key: "reinvestUsers", label: "Reinvest users", type: "number" },
                { key: "userRate", label: "Users rate", type: "percent" },
                { key: "claimedCapital", label: "Claimed capital", type: "currency" },
                { key: "reinvestedCapital", label: "Reinvested capital", type: "currency" },
                { key: "capitalRate", label: "Capital rate", type: "percent" },
              ]}
              rows={reinvestTabData.byCountry}
            />
          </LayoutCell>
        </LayoutGrid>
      </Wrapper>
    </>
  );
}
