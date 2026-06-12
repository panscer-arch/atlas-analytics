function AnalyticsTabs({ tabs = [], activeTab, onChange }) {
  return (
    <section className="analytics-surface analytics-tabs-panel">
      <div className="analytics-tabs-scroll">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`analytics-tab-btn${activeTab === tab.id ? " analytics-tab-btn-active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            <span className="analytics-tab-label">{tab.label}</span>
            {tab.badge ? <span className={`analytics-tab-badge analytics-tab-badge-${tab.badgeTone || "default"}`}>{tab.badge}</span> : null}
            {tab.hint ? <span className="analytics-tab-hint">{tab.hint}</span> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

export default AnalyticsTabs;
