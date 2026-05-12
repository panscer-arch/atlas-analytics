function ChartCard({ title, subtitle, children, height = 320 }) {
  return (
    <div className="analytics-surface chart-card">
      <div className="chart-card-header">
        <h3 className="chart-card-title">{title}</h3>
        {subtitle ? <p className="chart-card-subtitle mb-0">{subtitle}</p> : null}
      </div>
      <div style={{ width: "100%", height }}>{children}</div>
    </div>
  );
}

export default ChartCard;
