function DashboardBlock({ children, title }) {
  return (
    <div className="analytics-surface analytics-dashboard-block">
      {title ? <div className="analytics-dashboard-block-title">{title}</div> : null}
      {children}
    </div>
  );
}

export default DashboardBlock;
