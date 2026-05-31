import AnalyticsDataTable from "./AnalyticsDataTable";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import RestoredSection from "./RestoredSection";

export default function RestoredWalletsTab({ walletRows, partnerRows }) {
  return (
    <RestoredSection
      eyebrow="Wallets & Structure"
      title="Кошельки и структура системы"
      description="Главные кошельки, их приток, будущая нагрузка и вклад в устойчивость системы."
    >
      <LayoutGrid columns="two" gap="md">
        <LayoutCell>
          <AnalyticsDataTable
            title="Кошельки"
            subtitle="Top wallets по притоку и обязательствам."
            columns={[
              { key: "wallet", label: "Кошелёк" },
              { key: "role", label: "Роль" },
              { key: "inflow", label: "Inflow", type: "currency" },
              { key: "obligations", label: "Obligations", type: "currency" },
              { key: "riskScore", label: "Risk", type: "percent" },
            ]}
            rows={walletRows}
          />
        </LayoutCell>
        <LayoutCell>
          <AnalyticsDataTable
            title="Структура"
            subtitle="Партнёрские ветки и реферальная нагрузка."
            columns={[
              { key: "branch", label: "Ветка" },
              { key: "leader", label: "Лидер" },
              { key: "inflow", label: "Inflow", type: "currency" },
              { key: "referralAccrual", label: "Начислено", type: "currency" },
              { key: "obligations", label: "Obligations", type: "currency" },
            ]}
            rows={partnerRows}
          />
        </LayoutCell>
      </LayoutGrid>
    </RestoredSection>
  );
}
