import AnalyticsDataTable from "./AnalyticsDataTable";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import RestoredSection from "./RestoredSection";

export default function RestoredProductsTab({ groupedRows }) {
  return (
    <RestoredSection
      eyebrow="Продукты / Циклы"
      title="Lockup и Daily Flow"
      description="Сначала Lockup, потом Daily. Только аналитика: деньги, нагрузка и риск."
    >
      <LayoutGrid columns="two" gap="md">
        <LayoutCell>
          <AnalyticsDataTable
            title="Lockup тарифы"
            subtitle="Тарифы с возвратом тела."
            columns={[
              { key: "tariff", label: "Тариф" },
              { key: "inflow", label: "Входящий поток", type: "currency" },
              { key: "orders", label: "Ордера", type: "number" },
              { key: "claimable", label: "Клейм сейчас", type: "currency" },
              { key: "obligations30d", label: "Обязательства 30д", type: "currency" },
              { key: "riskDate", label: "Дата риска" },
            ]}
            rows={groupedRows.lockup}
          />
        </LayoutCell>
        <LayoutCell>
          <AnalyticsDataTable
            title="Daily Flow тарифы"
            subtitle="Тарифы без возврата тела в конце."
            columns={[
              { key: "tariff", label: "Тариф" },
              { key: "inflow", label: "Входящий поток", type: "currency" },
              { key: "orders", label: "Ордера", type: "number" },
              { key: "claimable", label: "Клейм сейчас", type: "currency" },
              { key: "obligations30d", label: "Обязательства 30д", type: "currency" },
              { key: "riskDate", label: "Дата риска" },
            ]}
            rows={groupedRows.daily}
          />
        </LayoutCell>
      </LayoutGrid>
    </RestoredSection>
  );
}
