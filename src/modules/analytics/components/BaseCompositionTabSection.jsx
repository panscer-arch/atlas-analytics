import AnalyticsDataTable from "./AnalyticsDataTable";
import ChartCard from "./ChartCard";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import MetricsGrid from "./MetricsGrid";
import SectionHeading from "./SectionHeading";
import TabSummary from "./TabSummary";
import Wrapper from "./Wrapper";
import TrafficSourcesChart from "../charts/TrafficSourcesChart";

export default function BaseCompositionTabSection({ baseCompositionData }) {
  return (
    <>
      <Wrapper as="section" marginTop="lg">
        <TabSummary kicker="Состав базы" title={baseCompositionData.summary.title} description={baseCompositionData.summary.description} bullets={baseCompositionData.summary.bullets} />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <SectionHeading kicker="Роли пользователей" title="Кто в системе просто инвестирует, кто строит сеть, а кто делает и то и другое" />
        <MetricsGrid metrics={baseCompositionData.metrics} density="wide" />
      </Wrapper>
      <Wrapper as="section" marginTop="sm">
        <LayoutGrid columns="two" gap="md">
          <LayoutCell>
            <ChartCard title="Доля базы по ролям" subtitle="Как распределяется база между инвесторами, партнёрами и смешанной ролью.">
              <TrafficSourcesChart data={baseCompositionData.shareChart} />
            </ChartCard>
          </LayoutCell>
          <LayoutCell>
            <ChartCard title="Inflow по ролям" subtitle="Какая роль даёт основной денежный поток.">
              <TrafficSourcesChart data={baseCompositionData.inflowChart} />
            </ChartCard>
          </LayoutCell>
        </LayoutGrid>
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <AnalyticsDataTable
          title="Состав базы и качество сегментов"
          subtitle="Размер базы, деньги, обязательства и устойчивость по каждой роли."
          columns={[
            { key: "segment", label: "Сегмент" },
            { key: "users", label: "Users", type: "number" },
            { key: "share", label: "Доля базы", type: "percent" },
            { key: "inflow", label: "Inflow", type: "currency" },
            { key: "avgDeposit", label: "Средний вклад", type: "currency" },
            { key: "obligations", label: "Obligations", type: "currency" },
            { key: "netContribution", label: "Net contribution", type: "currency" },
            { key: "repeatRate", label: "Repeat rate", type: "percent" },
            { key: "claimPressure", label: "Claim pressure", type: "percent" },
          ]}
          rows={baseCompositionData.rows}
        />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <AnalyticsDataTable
          title="Состояние ролей"
          subtitle="Активность, платёжность и claim/referral-статус внутри каждой роли."
          columns={[
            { key: "segment", label: "Сегмент" },
            { key: "activeUsers", label: "Активные", type: "number" },
            { key: "activeRate", label: "Активность", type: "percent" },
            { key: "sleepingUsers", label: "Спящие", type: "number" },
            { key: "newUsers", label: "Новые", type: "number" },
            { key: "repeatUsers", label: "Повторные", type: "number" },
            { key: "repeatRate", label: "Repeat rate", type: "percent" },
            { key: "payingUsers", label: "Платящие", type: "number" },
            { key: "payingRate", label: "Платят", type: "percent" },
            { key: "nonPayingUsers", label: "Неплатящие", type: "number" },
            { key: "claimUsers", label: "С claim", type: "number" },
            { key: "claimRate", label: "Claim rate", type: "percent" },
            { key: "noClaimUsers", label: "Без claim", type: "number" },
            { key: "referralIncomeUsers", label: "С рефдоходом", type: "number" },
            { key: "referralIncomeRate", label: "Рефдоход", type: "percent" },
            { key: "noReferralIncomeUsers", label: "Без рефдохода", type: "number" },
          ]}
          rows={baseCompositionData.qualityRows}
        />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <AnalyticsDataTable
          title="Размер базы по деньгам"
          subtitle="Крупные, средние и мелкие участники внутри каждой роли."
          columns={[
            { key: "segment", label: "Сегмент" },
            { key: "largeUsers", label: "Крупные", type: "number" },
            { key: "largeShare", label: "Доля крупных", type: "percent" },
            { key: "largeInflow", label: "Inflow крупных", type: "currency" },
            { key: "mediumUsers", label: "Средние", type: "number" },
            { key: "mediumShare", label: "Доля средних", type: "percent" },
            { key: "mediumInflow", label: "Inflow средних", type: "currency" },
            { key: "smallUsers", label: "Мелкие", type: "number" },
            { key: "smallShare", label: "Доля мелких", type: "percent" },
            { key: "smallInflow", label: "Inflow мелких", type: "currency" },
          ]}
          rows={baseCompositionData.valueTierRows}
        />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <AnalyticsDataTable
          title="Путь базы"
          subtitle="Как пользователи проходят путь от нового участия к повтору и реинвесту."
          columns={[
            { key: "segment", label: "Сегмент" },
            { key: "newUsers", label: "Новые", type: "number" },
            { key: "repeatUsers", label: "Повторные", type: "number" },
            { key: "repeatRate", label: "Repeat rate", type: "percent" },
            { key: "reinvestUsers", label: "Реинвест", type: "number" },
            { key: "reinvestRate", label: "Reinvest rate", type: "percent" },
            { key: "claimUsers", label: "С claim", type: "number" },
            { key: "mixedRoleConversion", label: "В смешанную роль", type: "percent" },
          ]}
          rows={baseCompositionData.lifecycleRows}
        />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <AnalyticsDataTable
          title="Удержание и риск потери"
          subtitle="Кто просто спит, кто возвращается, а кто уже выпадает из системы."
          columns={[
            { key: "segment", label: "Сегмент" },
            { key: "activeUsers", label: "Активные", type: "number" },
            { key: "sleepingUsers", label: "Спящие", type: "number" },
            { key: "dormantUsers", label: "Глубоко спят", type: "number" },
            { key: "dormantRate", label: "Dormant rate", type: "percent" },
            { key: "reactivatedUsers", label: "Вернулись", type: "number" },
            { key: "reactivatedRate", label: "Return rate", type: "percent" },
            { key: "churnedUsers", label: "Отвалились", type: "number" },
            { key: "churnRate", label: "Churn rate", type: "percent" },
          ]}
          rows={baseCompositionData.retentionRows}
        />
      </Wrapper>
    </>
  );
}
