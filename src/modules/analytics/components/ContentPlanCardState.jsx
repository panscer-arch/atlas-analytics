import { STATUS_OPTIONS } from "../data/contentPlanData";

export default function ContentPlanCardState({
  canMarkPublished,
  getStatusClass,
  item,
  nextActionLabel,
  onStatusChange,
  publishBlockReason,
  readinessMeta,
}) {
  return (
    <div className="analytics-content-plan-card-state">
      <span
        className={readinessMeta.isReady ? "analytics-content-plan-readiness analytics-content-plan-readiness-ready" : "analytics-content-plan-readiness analytics-content-plan-readiness-wait"}
        title={`Готовность к публикации: ${readinessMeta.done} из ${readinessMeta.total}`}
        aria-label={`Готовность к публикации: ${readinessMeta.done} из ${readinessMeta.total}`}
      >
        <b>Готовность</b>
        {readinessMeta.done}/{readinessMeta.total}
      </span>
      <span className={readinessMeta.isReady ? "analytics-content-plan-blocker analytics-content-plan-blocker-ready" : "analytics-content-plan-blocker analytics-content-plan-blocker-wait"}>
        {readinessMeta.isReady ? "Можно публиковать" : publishBlockReason}
      </span>
      <span className={readinessMeta.isReady ? "analytics-content-plan-next-action analytics-content-plan-next-action-ready" : "analytics-content-plan-next-action analytics-content-plan-next-action-wait"}>
        <b>Шаг</b>{nextActionLabel}
      </span>
      <select className={getStatusClass(item.status)} value={item.status} onChange={(event) => onStatusChange(item.id, event.target.value)}>
        {STATUS_OPTIONS.map((option) => (
          <option key={option} value={option} disabled={option === "Опубликовано" && !canMarkPublished}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
