import formatCurrency from "../utils/formatCurrency";
import formatNumber from "../utils/formatNumber";
import AnalyticsIcon from "./AnalyticsIcon";

function formatMetricValue(value, variant) {
  if (variant === "text" || typeof value === "string") {
    return value || "—";
  }

  if (variant === "currency") {
    return formatCurrency(value);
  }

  if (variant === "percent") {
    return `${Number(value || 0).toFixed(2)}%`;
  }

  return formatNumber(value);
}

function MetricCard({
  title,
  value,
  variant = "number",
  tone = "default",
  description,
  icon,
  statusLabel,
  pulse = false,
  emphasis = false,
}) {
  return (
    <div className={`analytics-surface metric-card metric-card-${tone}${pulse ? " metric-card-pulse" : ""}${emphasis ? " metric-card-emphasis" : ""}`}>
      <div className="metric-card-topline">
        <div className="metric-card-label-group">
          {icon ? <div className="metric-card-icon"><AnalyticsIcon name={icon} size="metric" /></div> : null}
          <div className="metric-card-label">{title}</div>
        </div>
        {statusLabel ? <div className={`metric-card-status metric-card-status-${tone}`}>{statusLabel}</div> : null}
      </div>
      <div className="metric-card-value">{formatMetricValue(value, variant)}</div>
      {description ? <div className="metric-card-description">{description}</div> : null}
    </div>
  );
}

export default MetricCard;
