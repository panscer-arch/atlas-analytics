export default function ContentPlanEditorialQueue({ queueItems, formatPlanDate, onSelectItem }) {
  return (
    <article className="analytics-surface analytics-content-plan-queue">
      <div className="analytics-content-plan-bi-head">
        <span>Очередь редакции</span>
        <strong>{queueItems.length ? "что делать первым" : "нет активных карточек"}</strong>
      </div>
      <div className="analytics-content-plan-queue-list">
        {queueItems.length ? queueItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`analytics-content-plan-queue-item analytics-content-plan-queue-${item.queueTone}`}
            onClick={() => onSelectItem(item.id)}
          >
            <b>{String(index + 1).padStart(2, "0")}</b>
            <span>
              <strong>{item.title}</strong>
              <small>{item.channel} / {item.format} / {item.owner || "без ответственного"}</small>
            </span>
            <i>{item.queueAction}</i>
            <em>{item.date ? formatPlanDate(item.date) : "Без даты"}</em>
          </button>
        )) : <p>Все активные карточки закрыты или опубликованы.</p>}
      </div>
    </article>
  );
}
