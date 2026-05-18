const ALLOWED_TONES = new Set(["default", "success", "danger", "accent"]);

function getTone(value) {
  return ALLOWED_TONES.has(value) ? value : "default";
}

function DashboardValue({ children, tone = "default" }) {
  const toneToken = getTone(tone);

  return <strong className={`analytics-dashboard-value analytics-dashboard-value-${toneToken}`}>{children}</strong>;
}

export default DashboardValue;
