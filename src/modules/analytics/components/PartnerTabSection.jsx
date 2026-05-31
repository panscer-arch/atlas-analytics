import AnalyticsDataTable from "./AnalyticsDataTable";
import ChartCard from "./ChartCard";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import MetricsGrid from "./MetricsGrid";
import SectionHeading from "./SectionHeading";
import TabSummary from "./TabSummary";
import Wrapper from "./Wrapper";
import TrafficSourcesChart from "../charts/TrafficSourcesChart";
import formatCurrency from "../utils/formatCurrency";

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export default function PartnerTabSection({ partnerData }) {
  const partnerDiagnostics = partnerData.diagnostics || {};

  return (
    <>
      <Wrapper as="section" marginTop="lg">
        <TabSummary kicker="Партнёрская структура" title={partnerData.summary.title} description={partnerData.summary.description} bullets={partnerData.summary.bullets} />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <SectionHeading kicker="Партнёрская структура" title="Какие ветки дают рост, а какие раздувают нагрузку" />
        <MetricsGrid metrics={partnerData.metrics} density="balanced" />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <TabSummary
          kicker="Почему ветка дорогая"
          title={`${partnerDiagnostics.costlyBranch?.branch || "Ветка"} сейчас даёт главный structural pressure`}
          description={`${partnerDiagnostics.dominantPressure?.type || "Партнёрская нагрузка"} сейчас выглядит самым сильным слоем давления на treasury, а ближайший tier jump уже нужно отслеживать отдельно.`}
          bullets={[
            <>Дорогая ветка: {partnerDiagnostics.costlyBranch?.branch || "—"} · leak {partnerDiagnostics.costlyBranch?.structuralLeak ?? 0}% · dependency {partnerDiagnostics.costlyBranch?.leaderDependency ?? 0}%</>,
            <>Доминирующее давление: {partnerDiagnostics.dominantPressure?.type || "—"} · {formatCurrency(partnerDiagnostics.dominantPressure?.value || 0)} · {formatPercent(partnerDiagnostics.dominantPressure?.share || 0)}</>,
            <>Tier jump risk 7d: {formatPercent(partnerDiagnostics.jumpRisk?.score || 0)} · зона {partnerDiagnostics.jumpRisk?.branch || "—"}</>,
            <>Самая здоровая ветка: {partnerDiagnostics.healthiestBranch?.branch || "—"} · net {formatCurrency(partnerDiagnostics.healthiestBranch?.netBranch || 0)}</>,
          ]}
        />
      </Wrapper>
      <Wrapper as="section" marginTop="sm">
        <LayoutGrid columns="two" gap="md">
          <LayoutCell>
            <ChartCard title="Inflow по веткам" subtitle="Какие ветки приносят основной денежный поток.">
              <TrafficSourcesChart data={partnerData.inflowShare} />
            </ChartCard>
          </LayoutCell>
          <LayoutCell>
            <ChartCard title="Referral burden по веткам" subtitle="Какие ветки сильнее всего нагружают реферальный контур.">
              <TrafficSourcesChart data={partnerData.referralShare} />
            </ChartCard>
          </LayoutCell>
        </LayoutGrid>
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <AnalyticsDataTable
          title="Ветки и лидеры"
          subtitle="Структурная эффективность и нагрузка по веткам."
          columns={[
            { key: "leader", label: "Лидер" },
            { key: "branch", label: "Ветка" },
            { key: "inflow", label: "Inflow", type: "currency" },
            { key: "invited", label: "Invited", type: "number" },
            { key: "referralAccrual", label: "Начислено", type: "currency" },
            { key: "payout", label: "Выплачено", type: "currency" },
          ]}
          rows={partnerData.rows}
        />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <AnalyticsDataTable
          title="Качество веток"
          subtitle="Насколько ветка живая, глубокая и зависимая от одного лидера."
          columns={[
            { key: "branch", label: "Ветка" },
            { key: "activeInvited", label: "Активные", type: "number" },
            { key: "depositingInvited", label: "С депозитом", type: "number" },
            { key: "conversionToDeposit", label: "Deposit conv.", type: "percent" },
            { key: "leaderDependency", label: "Зависимость от лидера", type: "percent" },
            { key: "depthScore", label: "Глубина", type: "percent" },
            { key: "structuralLeak", label: "Structural leak", type: "percent" },
          ]}
          rows={partnerData.qualityRows}
        />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <AnalyticsDataTable
          title="Финансы веток"
          subtitle="Сколько ветка приносит, сколько нагружает и сколько остаётся системе."
          columns={[
            { key: "branch", label: "Ветка" },
            { key: "inflow", label: "Inflow", type: "currency" },
            { key: "obligations", label: "Obligations", type: "currency" },
            { key: "referralAccrual", label: "Начислено", type: "currency" },
            { key: "referralRate", label: "Referral rate", type: "percent" },
            { key: "payout", label: "Выплачено", type: "currency" },
            { key: "payoutRate", label: "Payout rate", type: "percent" },
            { key: "netBranch", label: "Net ветки", type: "currency" },
          ]}
          rows={partnerData.financeRows}
        />
      </Wrapper>
    </>
  );
}
