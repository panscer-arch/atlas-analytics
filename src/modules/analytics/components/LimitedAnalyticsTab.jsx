import MetricsGrid from "./MetricsGrid";
import SectionHeading from "./SectionHeading";
import TabSummary from "./TabSummary";
import Wrapper from "./Wrapper";

export default function LimitedAnalyticsTab({ kicker, data, metricsTitle = "Доступные показатели" }) {
  return (
    <>
      <Wrapper as="section" marginTop="lg">
        <TabSummary kicker={kicker} title={data.summary.title} description={data.summary.description} bullets={data.summary.bullets} />
      </Wrapper>
      {data.metrics?.length ? (
        <Wrapper as="section" marginTop="lg">
          <SectionHeading kicker="Подтверждённые данные" title={metricsTitle} />
          <MetricsGrid metrics={data.metrics} density="balanced" />
        </Wrapper>
      ) : null}
      <Wrapper as="section" marginTop="sm">
        <div className="analytics-data-notice analytics-surface">
          <strong>Детализация не подменяется расчётными строками</strong>
          <p>Таблицы и графики появятся после подключения соответствующего источника. До этого панель показывает только подтверждённые агрегаты.</p>
        </div>
      </Wrapper>
    </>
  );
}
