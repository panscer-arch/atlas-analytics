import AnalyticsIcon from "../AnalyticsIcon";

export function SusButton({ children, className = "", icon, iconOnly = false, variant = "secondary", ...props }) {
  const classes = [
    "sus-ui-button",
    `sus-ui-button-${variant}`,
    iconOnly ? "sus-ui-button-icon" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button className={classes} {...props}>
      {icon ? <AnalyticsIcon name={icon} /> : null}
      {children}
    </button>
  );
}

export function SusMetric({ label, tone = "default", value }) {
  return (
    <article className={`sus-ui-metric sus-ui-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function SusStatus({ children, className = "", tone = "default", ...props }) {
  return (
    <span className={`sus-ui-status sus-ui-status-${tone} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}

export function SusEmptyState({ children, title = "Здесь пока ничего нет" }) {
  return (
    <div className="sus-ui-empty">
      <AnalyticsIcon name="empty" />
      <strong>{title}</strong>
      {children ? <span>{children}</span> : null}
    </div>
  );
}
