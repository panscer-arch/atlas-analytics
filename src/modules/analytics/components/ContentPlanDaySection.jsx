export default function ContentPlanDaySection({
  children,
  copiedDayKey,
  dateKey,
  formatPlanDate,
  getDayReadinessMeta,
  groupItems,
  onCopyDayPackage,
}) {
  const readyCount = groupItems.filter((item) => item.canPublish && item.status !== "Опубликовано").length;
  const revisionCount = groupItems.filter((item) => item.reviewStatus === "Нужны правки").length;
  const visualIssueCount = groupItems.filter((item) => item.visualStatus !== "Визуал ок" && item.visualStatus !== "Нет визуала").length;
  const dayReadiness = getDayReadinessMeta(groupItems);

  return (
    <section className="analytics-content-plan-day">
      <div className="analytics-content-plan-day-head">
        <div>
          <span>{formatPlanDate(dateKey === "Без даты" ? "" : dateKey)}</span>
          <strong>{groupItems.length} публикаций</strong>
          <strong className="analytics-content-plan-day-ready">{readyCount} к публикации</strong>
          <strong className="analytics-content-plan-day-warn">{revisionCount} правки</strong>
          <strong className="analytics-content-plan-day-visual">{visualIssueCount} визуал</strong>
        </div>
        <div className="analytics-content-plan-day-health">
          <span>
            <b>{dayReadiness.percent}%</b>
            готовность дня
          </span>
          <progress value={dayReadiness.percent} max="100" aria-label={`Готовность дня ${dayReadiness.percent}%`} />
          <small>
            {dayReadiness.signals.length ? dayReadiness.signals.slice(0, 3).map((signal) => `${signal.label}: ${signal.count}`).join(" / ") : "замечаний нет"}
          </small>
        </div>
        <button
          type="button"
          onClick={() => onCopyDayPackage(dateKey, groupItems)}
          disabled={!readyCount}
          title="Скопировать все готовые публикации за этот день"
        >
          {copiedDayKey === dateKey ? "День скопирован" : "Пакет дня"}
        </button>
      </div>
      <div className="analytics-content-plan-grid">
        {children}
      </div>
    </section>
  );
}
