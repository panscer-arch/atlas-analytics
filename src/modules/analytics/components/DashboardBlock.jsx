function DashboardBlock({ children, title }) {
  return (
    <div className="analytics-surface analytics-dashboard-block h-100">
      {title ? <div className="analytics-dashboard-block-title">{title}</div> : null}
      {children}
    </div>
  );
}

export default DashboardBlock;
