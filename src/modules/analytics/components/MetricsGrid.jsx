import MetricCard from "./MetricCard";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";

const GRID_DENSITY_COLUMNS = {
  default: "auto",
  compact: "auto",
  balanced: "four",
  half: "two",
  wide: "four",
};

function MetricsGrid({ metrics, density = "default" }) {
  const columns = GRID_DENSITY_COLUMNS[density] || GRID_DENSITY_COLUMNS.default;

  return (
    <LayoutGrid columns={columns} gap="md">
      {metrics.map((metric) => (
        <LayoutCell key={metric.title}>
          <MetricCard {...metric} />
        </LayoutCell>
      ))}
    </LayoutGrid>
  );
}

export default MetricsGrid;
