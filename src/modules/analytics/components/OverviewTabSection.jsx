import ActivationSection from "./ActivationSection";
import AnalyticsCollapsibleSection from "./AnalyticsCollapsibleSection";
import AnalyticsDataTable from "./AnalyticsDataTable";
import AnalyticsInsights from "./AnalyticsInsights";
import AnalyticsPriorityActions from "./AnalyticsPriorityActions";
import AnalyticsScenarios from "./AnalyticsScenarios";
import AnalyticsTable from "./AnalyticsTable";
import ChartCard from "./ChartCard";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import MetricsGrid from "./MetricsGrid";
import SectionHeading from "./SectionHeading";
import Wrapper from "./Wrapper";
import CampaignPerformanceChart from "../charts/CampaignPerformanceChart";
import ConversionFunnelChart from "../charts/ConversionFunnelChart";
import RetentionChart from "../charts/RetentionChart";
import RevenueChart from "../charts/RevenueChart";
import TrafficSourcesChart from "../charts/TrafficSourcesChart";
import UsersGrowthChart from "../charts/UsersGrowthChart";

export default function OverviewTabSection({
  primaryKpis,
  contractPulseKpis,
  operationalSnapshotKpis,
  trafficToMoneyKpis,
  graphsOpenSignal,
  data,
  overviewOperations,
  next72h,
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
        <SectionHeading kicker="Ключевые сигналы дня" title="Что происходит сейчас" />
        <MetricsGrid metrics={primaryKpis} density="compact" />
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <SectionHeading kicker="Контур Smart Contract" title="Главная касса дня" />
        <MetricsGrid metrics={contractPulseKpis} density="balanced" />
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <SectionHeading kicker="День к дню" title="Сравнение со вчера" />
        <MetricsGrid metrics={operationalSnapshotKpis} density="compact" />
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <SectionHeading kicker="Traffic -> Money" title="Трафик превращается в деньги" />
        <MetricsGrid metrics={trafficToMoneyKpis} density="balanced" />
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <AnalyticsCollapsibleSection
          kicker="Графики"
          title="Посмотреть динамику, структуру и графики"
          subtitle="Тренды по входящему потоку, выплатам, покрытию и продуктам."
          defaultOpen={false}
          sectionId="overview-graphs"
          openSignal={graphsOpenSignal}
        >
          <LayoutGrid columns="two" gap="md">
            <LayoutCell>
              <ChartCard title="Входящий поток по дням" subtitle="Сколько новых денег заходило в систему в каждом дне выбранного окна.">
                <UsersGrowthChart data={data.charts.usersGrowth} />
              </ChartCard>
            </LayoutCell>
            <LayoutCell>
              <ChartCard title="Выплаты по дням" subtitle="Давление по выплатам циклов в ежедневном разрезе.">
                <RevenueChart data={data.charts.revenue} />
              </ChartCard>
            </LayoutCell>
            <LayoutCell>
              <ChartCard title="Разложение денег" subtitle="Как входящий поток распадается на выплаты, рефералку, комиссию и остаток.">
                <ConversionFunnelChart data={data.charts.funnel} />
              </ChartCard>
            </LayoutCell>
            <LayoutCell>
              <ChartCard title="Структура по продуктам" subtitle="Какой продукт формирует основной входящий поток в выбранном окне.">
                <TrafficSourcesChart data={data.charts.trafficSources} />
              </ChartCard>
            </LayoutCell>
            <LayoutCell>
              <ChartCard title="Покрытие обязательств" subtitle="Насколько ожидаемый входящий поток закрывает обязательства на ключевых горизонтах.">
                <RetentionChart data={data.charts.retention} />
              </ChartCard>
            </LayoutCell>
            <LayoutCell>
              <ChartCard title="Давление по продуктам" subtitle="Какой продукт создаёт больше обязательств и где выше прогнозируемый разрыв.">
                <CampaignPerformanceChart data={data.charts.campaigns} />
              </ChartCard>
            </LayoutCell>
          </LayoutGrid>
        </AnalyticsCollapsibleSection>
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <AnalyticsCollapsibleSection
          kicker="Оперативная сводка"
          title="Посмотреть деньги и циклы по периодам"
          subtitle="Вчера, сегодня, 7 дней и 30 дней: сколько зашло, сколько ушло и сколько циклов создали."
          defaultOpen={false}
        >
          <LayoutGrid columns="one" gap="md">
            <LayoutCell>
              <AnalyticsDataTable
                title="Деньги и циклы по периодам"
                subtitle="Входящий поток, новые и повторные деньги, количество созданных циклов и общий исходящий поток."
                columns={[
                  { key: "period", label: "Период" },
                  { key: "incoming", label: "Входящий поток", type: "currency" },
                  { key: "newMoney", label: "Новые деньги", type: "currency" },
                  { key: "existingMoney", label: "Повторные деньги", type: "currency" },
                  { key: "cycleActivations", label: "Создано циклов", type: "number" },
                  { key: "outgoing", label: "Выплачено", type: "currency" },
                ]}
                rows={overviewOperations.periods}
              />
            </LayoutCell>
            <LayoutCell>
              <AnalyticsDataTable
                title="Созданные smart-cycles по видам"
                subtitle="Сколько циклов создаётся по каждому виду и какой поток он сегодня даёт."
                columns={[
                  { key: "cycleType", label: "Вид цикла" },
                  { key: "source", label: "Контур" },
                  { key: "todayCreated", label: "Сегодня", type: "number" },
                  { key: "weekCreated", label: "7 дней", type: "number" },
                  { key: "monthCreated", label: "30 дней", type: "number" },
                  { key: "todayIncoming", label: "Входящий сегодня", type: "currency" },
                  { key: "todayOutgoing", label: "Выплачено сегодня", type: "currency" },
                ]}
                rows={overviewOperations.cycleTypes}
              />
            </LayoutCell>
          </LayoutGrid>
        </AnalyticsCollapsibleSection>
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <AnalyticsCollapsibleSection
          kicker="72 часа"
          title="Посмотреть ближайшее давление по контракту"
          subtitle="Ближайшие три дня: что должно выйти с адреса, что ожидается на вход и где уже виден разрыв."
          defaultOpen={false}
        >
          <AnalyticsDataTable
            title="Мини-календарь выплат на 72 часа"
            subtitle="Cycle payouts, рефералка, комиссия и суммарное давление по каждому из ближайших дней."
            columns={[
              { key: "date", label: "Дата" },
              { key: "cyclePayouts", label: "Циклы", type: "currency" },
              { key: "referralPayouts", label: "Рефералка", type: "currency" },
              { key: "platformFee", label: "Комиссия", type: "currency" },
              { key: "totalOutgoing", label: "Всего выйдет", type: "currency" },
              { key: "expectedIncoming", label: "Ожидаемый вход", type: "currency" },
              { key: "projectedGap", label: "Разрыв", type: "currency" },
            ]}
            rows={next72h}
          />
        </AnalyticsCollapsibleSection>
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <AnalyticsCollapsibleSection
          kicker="План действий"
          title="Посмотреть, что сделать сегодня"
          subtitle="Короткий список главных действий на день без лишней аналитической нагрузки."
          defaultOpen={false}
        >
          <AnalyticsPriorityActions actions={data.priorityActions} embedded />
        </AnalyticsCollapsibleSection>
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <AnalyticsInsights alerts={data.insights.alerts} recommendations={data.insights.recommendations} />
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <AnalyticsScenarios scenarios={data.scenarios} defaultOpen={false} />
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
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
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <AnalyticsCollapsibleSection
          kicker="Финансовая структура"
          title="Посмотреть, куда уйдут деньги"
          subtitle="Выплаты, рефералка, комиссия платформы и ваш остаток."
          defaultOpen={false}
        >
          <MetricsGrid metrics={structureKpis} density="compact" />
        </AnalyticsCollapsibleSection>
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <AnalyticsCollapsibleSection
          kicker="Таблица"
          title="Посмотреть детальную разбивку"
          subtitle="Полная таблица по продуктам, ордерам и денежной раскладке."
          defaultOpen={false}
        >
          <AnalyticsTable rows={data.table} />
        </AnalyticsCollapsibleSection>
      </Wrapper>
    </>
  );
}
