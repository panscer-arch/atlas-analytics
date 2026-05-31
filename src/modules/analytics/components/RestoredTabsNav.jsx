function RestoredTabsNav({ activeTab, tabs = [], onChange }) {
  return (
    <div className="analytics-surface analytics-restored-tabs">
      <div className="analytics-restored-tabs-row">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`analytics-restored-tab${activeTab === tab.id ? " analytics-restored-tab-active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default RestoredTabsNav;
