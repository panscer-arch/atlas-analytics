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

export default ProductSummaryStack;
