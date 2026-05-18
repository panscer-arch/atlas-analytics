import AnalyticsDataTable from "./AnalyticsDataTable";
import formatCurrency from "../utils/formatCurrency";

function ProductSummaryPrimary({ row }) {
  const badgeTone = row.source === "Lockup" ? "lockup" : "daily";

  return (
    <div className="analytics-products-summary-primary">
      <div className="analytics-products-summary-primary-top">
        <strong>{row.tariff}</strong>
        <span className={`analytics-products-badge analytics-products-badge-${badgeTone}`}>{row.source}</span>
      </div>
      <span>{row.shortLabel}</span>
    </div>
  );
}

function ProductSummaryStack({ lines }) {
  return (
    <div className="analytics-products-summary-stack">
      {lines.map((line) => (
        <div key={line.label} className="analytics-products-summary-line">
          <span>{line.label}</span>
          <strong className={line.isRisk ? "analytics-products-summary-risk" : undefined}>{line.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ProductsSummaryTable({ rows }) {
  const sortedRows = [...rows].sort((left, right) => {
    if (left.source === right.source) return 0;
    return left.source === "Lockup" ? -1 : 1;
  });

  return (
    <AnalyticsDataTable
      title="Сводная таблица всех тарифов"
      subtitle="Сухое сравнение тарифов по деньгам, нагрузке и риску."
      variant="productsDaily"
      density="productsSummary"
      columns={[
        {
          key: "tariff",
          label: "Тариф",
          render: (row) => <ProductSummaryPrimary row={row} />,
        },
        {
          key: "money",
          label: "Деньги",
          render: (row) => (
            <ProductSummaryStack
              lines={[
                { label: "Входящий поток", value: formatCurrency(row.inflow) },
                { label: "Ордера", value: row.orders },
                { label: "Клейм сейчас", value: formatCurrency(row.claimable) },
              ]}
            />
          ),
        },
        {
          key: "load",
          label: "Нагрузка",
          render: (row) => (
            <ProductSummaryStack
              lines={[
                { label: "Начислено позже", value: formatCurrency(row.accrued) },
                { label: "Обязательства 30д", value: formatCurrency(row.obligations30d) },
              ]}
            />
          ),
        },
        {
          key: "risk",
          label: "Риск",
          render: (row) => (
            <ProductSummaryStack
              lines={[
                { label: "Разрыв", value: formatCurrency(row.pressure), isRisk: row.pressure > 0 },
                { label: "Дата риска", value: row.riskDate },
              ]}
            />
          ),
        },
      ]}
      rows={sortedRows}
    />
  );
}

export default ProductsSummaryTable;
