import MetricCard from "./MetricCard";

function MetricsGrid({ metrics, colClass = "col-12 col-sm-6 col-xl-4 col-xxl-3" }) {
  return (
    <div className="row g-3">
      {metrics.map((metric) => (
        <div key={metric.title} className={colClass}>
          <MetricCard {...metric} />
        </div>
      ))}
    </div>
  );
}

export default MetricsGrid;
