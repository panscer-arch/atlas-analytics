import DashboardValue from "./DashboardValue";

function DashboardListRow({ label, value, sub, tone = "default", children }) {
  return (
    <div className="analytics-dashboard-list-row">
      <span>{label}</span>
      {children || (
        sub ? (
          <div className="analytics-dashboard-list-mixed">
            <strong>{value}</strong>
            <small>{sub}</small>
          </div>
        ) : (
          <DashboardValue tone={tone}>{value}</DashboardValue>
        )
      )}
    </div>
  );
}

export default DashboardListRow;
