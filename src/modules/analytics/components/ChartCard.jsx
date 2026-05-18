const CHART_SIZES = new Set(["sm", "md", "lg"]);

function getSize(value) {
  return CHART_SIZES.has(value) ? value : "md";
}

function ChartCard({ title, subtitle, children, size = "md" }) {
  const sizeToken = getSize(size);

  return (
    <div className="analytics-surface chart-card">
      <div className="chart-card-header">
        <h3 className="chart-card-title">{title}</h3>
        {subtitle ? <p className="chart-card-subtitle mb-0">{subtitle}</p> : null}
      </div>
      <div className={`chart-card-plot chart-card-plot-${sizeToken}`}>{children}</div>
    </div>
  );
}

export default ChartCard;
