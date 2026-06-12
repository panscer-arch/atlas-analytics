import ContentPlanCard from "./ContentPlanCard";
import ContentPlanDaySection from "./ContentPlanDaySection";

export default function ContentPlanTimeline({
  cardState,
  copyState,
  filteredItemsCount,
  groupedItems,
  handlers,
  helpers,
  timelineState,
}) {
  return (
    <div className="analytics-content-plan-timeline">
      {Object.entries(groupedItems).map(([dateKey, groupItems]) => {
        const groupItemsWithPublishState = groupItems.map((item) => ({
          ...item,
          canPublish: helpers.canPublishItem(item),
        }));

        return (
          <ContentPlanDaySection
            key={dateKey}
            copiedDayKey={timelineState.copiedDayKey}
            dateKey={dateKey}
            formatPlanDate={helpers.formatPlanDate}
            getDayReadinessMeta={helpers.getDayReadinessMeta}
            groupItems={groupItemsWithPublishState}
            onCopyDayPackage={handlers.copyDayPublishPackage}
          >
            {groupItemsWithPublishState.map((item) => (
              <ContentPlanCard
                key={item.id}
                cardState={cardState}
                copyState={copyState}
                handlers={handlers}
                helpers={helpers}
                item={{
                  ...item,
                  nextActionLabel: helpers.getNextActionLabel(item),
                }}
              />
            ))}
          </ContentPlanDaySection>
        );
      })}
      {!filteredItemsCount ? (
        <div className="analytics-surface analytics-content-plan-empty">
          Нет публикаций под выбранные фильтры.
        </div>
      ) : null}
    </div>
  );
}
