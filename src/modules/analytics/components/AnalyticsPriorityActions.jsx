import AnalyticsCollapsibleSection from "./AnalyticsCollapsibleSection";

const PRIORITY_TONES = new Set(["default", "accent", "success", "danger"]);

function getTone(value) {
  return PRIORITY_TONES.has(value) ? value : "default";
}

function PriorityActionsContent({ actions = [] }) {
  if (!actions.length) {
    return null;
  }

  return (
    <div className="row g-3">
      {actions.map((action, index) => (
        <div key={action.title} className="col-12 col-xl-4">
          <div className={`analytics-surface analytics-priority-card analytics-priority-card-${getTone(action.tone)}`}>
            <div className="analytics-priority-step">Шаг {index + 1}</div>
            <div className="analytics-priority-title">{action.title}</div>
            <div className="analytics-priority-copy">{action.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsPriorityActions({ actions = [], embedded = false }) {
  if (embedded) {
    return <PriorityActionsContent actions={actions} />;
  }

  return (
    <AnalyticsCollapsibleSection
      kicker="План действий"
      title="Посмотреть, что сделать сегодня"
      subtitle="Короткий список главных действий на день без лишней аналитической нагрузки."
    >
      <PriorityActionsContent actions={actions} />
    </AnalyticsCollapsibleSection>
  );
}

export default AnalyticsPriorityActions;
