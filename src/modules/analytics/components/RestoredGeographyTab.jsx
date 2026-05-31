import AnalyticsDataTable from "./AnalyticsDataTable";
import RestoredSection from "./RestoredSection";

export default function RestoredGeographyTab({ rows }) {
  return (
    <RestoredSection
      eyebrow="География"
      title="Страны, пользователи и денежный поток"
      description="Какие страны дают объём, а какие накапливают риск."
    >
      <AnalyticsDataTable
        title="Страны"
        subtitle="Users, wallets, inflow и obligations по странам."
        columns={[
          { key: "country", label: "Страна" },
          { key: "users", label: "Users", type: "number" },
          { key: "wallets", label: "Wallets", type: "number" },
          { key: "inflow", label: "Inflow", type: "currency" },
          { key: "obligations", label: "Obligations", type: "currency" },
        ]}
        rows={rows}
      />
    </RestoredSection>
  );
}
