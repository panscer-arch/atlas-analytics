import formatCurrency from "../utils/formatCurrency";

function ProductTierCard({ row }) {
  const metaRows = [
    ["Входящий поток", formatCurrency(row.inflow)],
    ["Ордера", row.orders],
    ["Клейм сейчас", formatCurrency(row.claimable)],
    ["Начислено позже", formatCurrency(row.accrued)],
    ["Обязательства 30д", formatCurrency(row.obligations30d)],
    ["Дата риска", row.riskDate],
  ];

  return (
    <div className="analytics-surface analytics-product-tier-card">
      <div className="analytics-product-tier-head">
        <div className="analytics-products-badge analytics-products-badge-lockup">Lockup</div>
        <div className="analytics-product-tier-cycle">{row.cycle}</div>
      </div>
      <h3 className="analytics-product-tier-title">{row.tariff}</h3>
      <div className="analytics-product-tier-caption">{row.shortLabel}</div>
      <div className="analytics-product-tier-meta">
        {metaRows.map(([label, value]) => (
          <div key={label} className="analytics-product-tier-meta-row">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductTierCard;
