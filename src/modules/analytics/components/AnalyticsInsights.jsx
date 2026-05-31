import AnalyticsIcon from "./AnalyticsIcon";
import AnalyticsCollapsibleSection from "./AnalyticsCollapsibleSection";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";

function AnalyticsInsights({ alerts = [], recommendations = [] }) {
  return (
    <AnalyticsCollapsibleSection
      kicker="Сигналы и действия"
      title="Посмотреть сигналы и реакции"
      subtitle="Где уже есть давление на систему и какие шаги стоит сделать прямо сейчас."
    >
      <LayoutGrid columns="two" gap="md">
        <LayoutCell>
          <div className="analytics-surface analytics-insight analytics-insight-alert">
            <div className="analytics-section-heading analytics-section-heading-spaced">
              <span className="analytics-kicker">Сигналы</span>
              <h2>Где уже есть давление</h2>
            </div>
            <div className="analytics-insight-list">
              {alerts.map((item, index) => (
                <div key={item.title} className={`analytics-insight-item${index === 0 ? " analytics-insight-item-strong" : ""}`}>
                  <div className="analytics-insight-title">
                    <span className="analytics-insight-glyph"><AnalyticsIcon name="alert" /></span>
                    {item.title}
                  </div>
                  <div className="analytics-insight-copy">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </LayoutCell>

        <LayoutCell>
          <div className="analytics-surface analytics-insight analytics-insight-action">
            <div className="analytics-section-heading analytics-section-heading-spaced">
              <span className="analytics-kicker">Действия</span>
              <h2>Что делать оператору</h2>
            </div>
            <div className="analytics-insight-list">
              {recommendations.map((item, index) => (
                <div key={item.title} className={`analytics-insight-item${index === 0 ? " analytics-insight-item-strong" : ""}`}>
                  <div className="analytics-insight-title">
                    <span className="analytics-insight-glyph"><AnalyticsIcon name="action" /></span>
                    {item.title}
                  </div>
                  <div className="analytics-insight-copy">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </LayoutCell>
      </LayoutGrid>
    </AnalyticsCollapsibleSection>
  );
}

export default AnalyticsInsights;
