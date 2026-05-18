function AnalyticsPanelHeader({ actions = null, subtitle, title }) {
  return (
    <div className="analytics-panel-header">
      <div>
        <h3 className="chart-card-title">{title}</h3>
        {subtitle ? <p className="chart-card-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="analytics-table-actions">{actions}</div> : null}
    </div>
  );
}

export default AnalyticsPanelHeader;
