import AnalyticsDataTable from "./AnalyticsDataTable";
import RestoredSection from "./RestoredSection";

export default function RestoredTrafficTab({ rows }) {
  return (
    <RestoredSection
      eyebrow="Трафик / Онлайн"
      title="Кто приходит в систему и доходит до цикла"
      description="Старая восстановленная версия трафика: короткий оперативный срез без перегруза."
    >
      <AnalyticsDataTable
        title="Онлайн по странам"
        subtitle="Кто сейчас на сайте и в кабинете."
        columns={[
          { key: "country", label: "Страна" },
          { key: "siteUsers", label: "На сайте", type: "number" },
          { key: "cabinetUsers", label: "В кабинете", type: "number" },
          { key: "sessions", label: "Сессии", type: "number" },
          { key: "wallets", label: "Кошельки", type: "number" },
        ]}
        rows={rows}
      />
    </RestoredSection>
  );
}
