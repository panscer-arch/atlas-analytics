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

export default ProductSummaryPrimary;
