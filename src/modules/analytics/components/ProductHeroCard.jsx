import formatCurrency from "../utils/formatCurrency";

function ProductHeroCard({ row }) {
  const metricCells = [
    ["Входящий поток", formatCurrency(row.inflow)],
    ["Ордера", row.orders],
    ["Клейм сейчас", formatCurrency(row.claimable)],
    ["Начислено позже", formatCurrency(row.accrued)],
    ["Обязательства 30д", formatCurrency(row.obligations30d)],
    ["Дата риска", row.riskDate],
  ];

  return (
    <div className="analytics-surface analytics-product-hero">
      <div className="analytics-product-hero-top">
        <div>
          <div className="analytics-products-badge analytics-products-badge-daily">Daily Flow</div>
          <h3 className="analytics-product-hero-title">{row.tariff}</h3>
          <div className="analytics-product-hero-caption">{row.shortLabel}</div>
        </div>
      </div>
      <div className="analytics-product-hero-grid">
        {metricCells.map(([label, value]) => (
          <div key={label} className="analytics-product-hero-cell">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductHeroCard;
