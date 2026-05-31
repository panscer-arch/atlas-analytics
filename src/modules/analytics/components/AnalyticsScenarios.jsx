import AnalyticsIcon from "./AnalyticsIcon";
import AnalyticsCollapsibleSection from "./AnalyticsCollapsibleSection";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";

const SCENARIO_TONES = new Set(["default", "accent", "success", "danger"]);

function getTone(value) {
  return SCENARIO_TONES.has(value) ? value : "default";
}

function scenarioGlyph(tone) {
  if (tone === "danger") return "alert";
  if (tone === "success") return "fact";
  return "network";
}

function AnalyticsScenarios({ scenarios = [], defaultOpen = false }) {
  if (!scenarios.length) {
    return null;
  }

  return (
    <AnalyticsCollapsibleSection
      kicker="Сценарии"
      title="Посмотреть сценарии и действия"
      subtitle="Что происходит сейчас, почему это важно и как лучше реагировать."
      defaultOpen={defaultOpen}
    >
      <LayoutGrid columns="three" gap="md">
        {scenarios.map((scenario, index) => (
          <LayoutCell key={scenario.title}>
            <div className="analytics-surface analytics-scenario-card">
              <div className="analytics-scenario-topline">
                <span className="analytics-scenario-index">
                  <span className="analytics-scenario-glyph"><AnalyticsIcon name={scenarioGlyph(getTone(scenario.tone))} /></span>
                  {scenario.kicker || `Сценарий ${index + 1}`}
                </span>
                <span className={`analytics-scenario-status analytics-scenario-status-${getTone(scenario.tone)}`}>
                  {scenario.status}
                </span>
              </div>
              <h3 className="analytics-scenario-title">{scenario.title}</h3>
              <p className="analytics-scenario-copy">{scenario.description}</p>

              <div className="analytics-scenario-block">
                <div className="analytics-scenario-label">Что видно</div>
                <div className="analytics-scenario-text">{scenario.signal}</div>
              </div>

              <div className="analytics-scenario-block analytics-scenario-block-action">
                <div className="analytics-scenario-label">Что делать</div>
                <div className="analytics-scenario-text">{scenario.action}</div>
              </div>

              <div className="analytics-scenario-block">
                <div className="analytics-scenario-label">Что будет дальше</div>
                <div className="analytics-scenario-text">{scenario.outcome}</div>
              </div>
            </div>
          </LayoutCell>
        ))}
      </LayoutGrid>
    </AnalyticsCollapsibleSection>
  );
}

export default AnalyticsScenarios;
