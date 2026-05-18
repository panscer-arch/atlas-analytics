import MetricCard from "./MetricCard";

const GRID_DENSITY_CLASSES = {
  default: "col-12 col-sm-6 col-xl-4 col-xxl-3",
  compact: "col-12 col-md-6 col-xl-4 col-xxl-2",
  balanced: "col-12 col-md-6 col-xl-3",
  half: "col-12 col-md-6 col-xl-6",
  wide: "col-12 col-md-6 col-xl-3 col-xxl-3",
};

function MetricsGrid({ metrics, density = "default" }) {
  const columnClassName = GRID_DENSITY_CLASSES[density] || GRID_DENSITY_CLASSES.default;

  return (
    <div className="row g-3">
      {metrics.map((metric) => (
        <div key={metric.title} className={columnClassName}>
          <MetricCard {...metric} />
        </div>
      ))}
    </div>
  );
}

export default MetricsGrid;
