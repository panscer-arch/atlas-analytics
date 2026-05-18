const ALLOWED_TONES = new Set(["in", "out", "net", "target", "risk"]);

function getTone(value) {
  return ALLOWED_TONES.has(value) ? value : "target";
}

function DashboardKpiCard({ kicker, value, note, sub, tone = "target" }) {
  const toneToken = getTone(tone);

  return (
    <div className={`analytics-dashboard-kpi analytics-dashboard-kpi-${toneToken}`}>
      <div className="analytics-dashboard-kpi-kicker">{kicker}</div>
      <div className="analytics-dashboard-kpi-value">{value}</div>
      <div className="analytics-dashboard-kpi-foot">
        <span>{note}</span>
        <small>{sub}</small>
      </div>
    </div>
  );
}

export default DashboardKpiCard;
