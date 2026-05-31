import AnalyticsDataTable from "./AnalyticsDataTable";
import ProductSummaryPrimary from "./ProductSummaryPrimary";
import ProductSummaryStack from "./ProductSummaryStack";
import formatCurrency from "../utils/formatCurrency";

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
