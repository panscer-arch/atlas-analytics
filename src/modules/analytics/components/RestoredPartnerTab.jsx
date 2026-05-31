import AnalyticsDataTable from "./AnalyticsDataTable";
import RestoredSection from "./RestoredSection";

export default function RestoredPartnerTab({ rows }) {
  return (
    <RestoredSection
      eyebrow="Alerts & Recommendations"
      title="Партнёрские ветки и рекомендации"
      description="Какие ветки дают деньги, а какие создают лишнюю нагрузку."
    >
      <AnalyticsDataTable
        title="Партнёрская структура"
        subtitle="Короткий срез по inflow, начислениям и structural leak."
        columns={[
          { key: "branch", label: "Ветка" },
          { key: "leader", label: "Лидер" },
          { key: "inflow", label: "Inflow", type: "currency" },
          { key: "referralAccrual", label: "Начислено", type: "currency" },
          { key: "leaderDependency", label: "Зависимость", type: "percent" },
          { key: "structuralLeak", label: "Leak", type: "percent" },
        ]}
        rows={rows}
      />
    </RestoredSection>
  );
}
