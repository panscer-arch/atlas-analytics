import ActivationSection from "./ActivationSection";
import AnalyticsDataTable from "./AnalyticsDataTable";
import ChartCard from "./ChartCard";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import MetricsGrid from "./MetricsGrid";
import SectionHeading from "./SectionHeading";
import TabSummary from "./TabSummary";
import Wrapper from "./Wrapper";
import ConversionFunnelChart from "../charts/ConversionFunnelChart";
import RetentionChart from "../charts/RetentionChart";
import TrafficLifecycleChart from "../charts/TrafficLifecycleChart";
import TrafficSourcesChart from "../charts/TrafficSourcesChart";
import UsersGrowthChart from "../charts/UsersGrowthChart";

export default function TrafficTabSection({
  trafficTabData,
  activationPeriod,
  periodOptions,
  filteredLifecycleTotals,
  pagedLifecycleRows,
  safeActivationPage,
  activationTotalPages,
  onActivationPeriodChange,
  onActivationPageChange,
}) {
  return (
    <>
      <Wrapper as="section" marginTop="lg">
        <TabSummary kicker="Онлайн" title={trafficTabData.summary.title} description={trafficTabData.summary.description} bullets={trafficTabData.summary.bullets} />
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <SectionHeading kicker="Трафик / Онлайн" title="Кто сейчас на сайте и в кабинете" />
        <MetricsGrid metrics={trafficTabData.metrics} />
      </Wrapper>
      <Wrapper as="section" marginTop="sm">
        <LayoutGrid columns="two" gap="md">
          <LayoutCell span="full">
            <ChartCard title="Регистрации -> Кошелёк -> Цикл по дням" subtitle="Как по дням движется базовая активация пользователей за выбранный период.">
              <TrafficLifecycleChart data={trafficTabData.lifecycleRows} />
            </ChartCard>
          </LayoutCell>
          <LayoutCell>
            <ChartCard title="Живой поток по дням" subtitle="Как менялась онлайн-активность за последние дни.">
              <UsersGrowthChart data={trafficTabData.timeline} />
            </ChartCard>
          </LayoutCell>
          <LayoutCell>
            <ChartCard title="Онлайн по странам" subtitle="Какие страны дают основной живой поток.">
              <TrafficSourcesChart data={trafficTabData.countryShare} />
            </ChartCard>
          </LayoutCell>
          <LayoutCell>
            <AnalyticsDataTable
              title="Онлайн по странам"
              subtitle="Где сейчас находится живой трафик."
              columns={[
                { key: "country", label: "Страна" },
                { key: "siteUsers", label: "На сайте", type: "number" },
                { key: "cabinetUsers", label: "В кабинете", type: "number" },
                { key: "sessions", label: "Сессии", type: "number" },
                { key: "wallets", label: "Кошельки", type: "number" },
              ]}
              rows={trafficTabData.countries}
            />
          </LayoutCell>
          <LayoutCell>
            <ChartCard title="Воронка пути" subtitle="Цепочка от сайта до старта депозита.">
              <ConversionFunnelChart data={trafficTabData.funnel} />
            </ChartCard>
          </LayoutCell>
        </LayoutGrid>
      </Wrapper>
      <Wrapper as="section" marginTop="sm">
        <LayoutGrid columns="two" gap="md">
          <LayoutCell>
            <ChartCard title="Конверсия по шагам" subtitle="Где теряется поток между шагами.">
              <RetentionChart data={trafficTabData.conversion} />
            </ChartCard>
          </LayoutCell>
          <LayoutCell>
            <AnalyticsDataTable
              title="Воронка пути"
              subtitle="Числа по шагам воронки."
              columns={[
                { key: "stage", label: "Шаг" },
                { key: "value", label: "Пользователи", type: "number" },
              ]}
              rows={trafficTabData.funnel}
            />
          </LayoutCell>
        </LayoutGrid>
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <LayoutGrid columns="two" gap="md">
          <LayoutCell span="full">
            <ActivationSection
              period={activationPeriod}
              periodOptions={periodOptions}
              totals={filteredLifecycleTotals}
              rows={pagedLifecycleRows}
              page={safeActivationPage}
              totalPages={activationTotalPages}
              onPeriodChange={onActivationPeriodChange}
              onPageChange={onActivationPageChange}
            />
          </LayoutCell>
          <LayoutCell>
            <AnalyticsDataTable
              title="Качество live-потока по странам"
              subtitle="Где трафик не просто есть, а реально доходит до действий."
              columns={[
                { key: "country", label: "Страна" },
                { key: "newVisitors", label: "Новые", type: "number" },
                { key: "repeatVisitors", label: "Повторные", type: "number" },
                { key: "engagementRate", label: "Вовлечение", type: "percent" },
                { key: "depositConversion", label: "Конв. в депозит", type: "percent" },
              ]}
              rows={trafficTabData.qualityRows}
            />
          </LayoutCell>
          <LayoutCell>
            <AnalyticsDataTable
              title="Качество источников"
              subtitle="Какие источники дают лучший поток до wallet connect и депозита."
              columns={[
                { key: "source", label: "Источник / продукт" },
                { key: "newVisitors", label: "Новые", type: "number" },
                { key: "repeatVisitors", label: "Повторные", type: "number" },
                { key: "bounceRate", label: "Отказы", type: "percent" },
                { key: "walletConnects", label: "Подкл. кошелёк", type: "number" },
                { key: "depositStarts", label: "Старт депозита", type: "number" },
                { key: "depositConversion", label: "Конв. в депозит", type: "percent" },
                { key: "qualityScore", label: "Качество", type: "percent" },
              ]}
              rows={trafficTabData.sourceQualityRows}
            />
          </LayoutCell>
        </LayoutGrid>
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <AnalyticsDataTable
          title="Источники и продукты в live-потоке"
          subtitle="Кто даёт онлайн-активность и депозитный старт."
          columns={[
            { key: "source", label: "Источник / продукт" },
            { key: "siteUsers", label: "На сайте", type: "number" },
            { key: "cabinetUsers", label: "В кабинете", type: "number" },
            { key: "walletConnects", label: "Подкл. кошелёк", type: "number" },
            { key: "deposits", label: "Депозиты", type: "currency" },
            { key: "conversion", label: "Конверсия", type: "percent" },
          ]}
          rows={trafficTabData.sources}
        />
      </Wrapper>
    </>
  );
}
