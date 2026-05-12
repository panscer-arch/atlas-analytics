import AnalyticsIcon from "./AnalyticsIcon";
import AnalyticsCollapsibleSection from "./AnalyticsCollapsibleSection";

function AnalyticsInsights({ alerts = [], recommendations = [] }) {
  return (
    <AnalyticsCollapsibleSection
      kicker="Сигналы и действия"
      title="Посмотреть сигналы и реакции"
      subtitle="Где уже есть давление на систему и какие шаги стоит сделать прямо сейчас."
      className="mt-4"
    >
      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <div className="analytics-surface analytics-insight analytics-insight-alert">
            <div className="analytics-section-heading mb-3">
              <span className="analytics-kicker">Сигналы</span>
              <h2 className="mb-0">Где уже есть давление</h2>
            </div>
            <div className="analytics-insight-list">
              {alerts.map((item, index) => (
                <div key={item.title} className={`analytics-insight-item${index === 0 ? " analytics-insight-item-strong" : ""}`}>
                  <div className="analytics-insight-title">
                    <span className="analytics-insight-glyph"><AnalyticsIcon name="alert" className="analytics-inline-icon" /></span>
                    {item.title}
                  </div>
                  <div className="analytics-insight-copy">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div className="analytics-surface analytics-insight analytics-insight-action">
            <div className="analytics-section-heading mb-3">
              <span className="analytics-kicker">Действия</span>
              <h2 className="mb-0">Что делать оператору</h2>
            </div>
            <div className="analytics-insight-list">
              {recommendations.map((item, index) => (
                <div key={item.title} className={`analytics-insight-item${index === 0 ? " analytics-insight-item-strong" : ""}`}>
                  <div className="analytics-insight-title">
                    <span className="analytics-insight-glyph"><AnalyticsIcon name="action" className="analytics-inline-icon" /></span>
                    {item.title}
                  </div>
                  <div className="analytics-insight-copy">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AnalyticsCollapsibleSection>
  );
}

export default AnalyticsInsights;
