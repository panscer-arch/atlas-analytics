import formatCurrency from "../utils/formatCurrency";
import formatNumber from "../utils/formatNumber";
import AnalyticsIcon from "./AnalyticsIcon";

const METRIC_TONES = new Set(["default", "accent", "success", "danger"]);
const METRIC_VARIANTS = new Set(["number", "currency", "percent", "text"]);

function getToken(tokens, value, fallback) {
  return tokens.has(value) ? value : fallback;
}

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
  const toneToken = getToken(METRIC_TONES, tone, "default");
  const variantToken = getToken(METRIC_VARIANTS, variant, "number");

  return (
    <div className={`analytics-surface metric-card metric-card-${toneToken}${pulse ? " metric-card-pulse" : ""}${emphasis ? " metric-card-emphasis" : ""}`}>
      <div className="metric-card-topline">
        <div className="metric-card-label-group">
          {icon ? <div className="metric-card-icon"><AnalyticsIcon name={icon} size="metric" /></div> : null}
          <div className="metric-card-label">{title}</div>
        </div>
        {statusLabel ? <div className={`metric-card-status metric-card-status-${toneToken}`}>{statusLabel}</div> : null}
      </div>
      <div className="metric-card-value">{formatMetricValue(value, variantToken)}</div>
      {description ? <div className="metric-card-description">{description}</div> : null}
    </div>
  );
}

export default MetricCard;
