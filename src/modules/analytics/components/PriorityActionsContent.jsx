import LayoutGrid, { LayoutCell } from "./LayoutGrid";

const PRIORITY_TONES = new Set(["default", "accent", "success", "danger"]);

function getTone(value) {
  return PRIORITY_TONES.has(value) ? value : "default";
}

function PriorityActionsContent({ actions = [] }) {
  if (!actions.length) {
    return null;
  }

  return (
    <LayoutGrid columns="three" gap="md">
      {actions.map((action, index) => (
        <LayoutCell key={action.title}>
          <div className={`analytics-surface analytics-priority-card analytics-priority-card-${getTone(action.tone)}`}>
            <div className="analytics-priority-step">Шаг {index + 1}</div>
            <div className="analytics-priority-title">{action.title}</div>
            <div className="analytics-priority-copy">{action.description}</div>
          </div>
        </LayoutCell>
      ))}
    </LayoutGrid>
  );
}

export default PriorityActionsContent;
