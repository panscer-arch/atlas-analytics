import AnalyticsCollapsibleSection from "./AnalyticsCollapsibleSection";
import PriorityActionsContent from "./PriorityActionsContent";

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
