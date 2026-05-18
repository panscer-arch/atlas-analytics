function DashboardBalance({ label, value }) {
  return (
    <div className="analytics-dashboard-balance">
      <div className="analytics-dashboard-balance-total">{value}</div>
      <div className="analytics-dashboard-balance-sub">{label}</div>
    </div>
  );
}

export default DashboardBalance;
