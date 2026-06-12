const BOTTLENECK_FILTERS = {
  "Без даты": { dateState: "Без даты" },
  "Без текста": { copyIssue: "Без текста" },
  "Правки": { reviewStatus: "Нужны правки" },
  "Без комментария": { revisionIssue: "Без комментария" },
  "Визуал": { visualIssue: "Визуал не готов" },
  "Дубли": { duplicateIssue: "Найдены" },
  "Готово": { readiness: "К публикации" },
  "URL": { linkIssue: "Некорректный URL" },
  "Нет ссылки": { linkIssue: "Опубликовано без ссылки" },
  "Нет даты публикации": { linkIssue: "Опубликовано без даты" },
  "Дата публикации будущая": { linkIssue: "Дата публикации в будущем" },
};

function getBottleneckFilter(label) {
  return BOTTLENECK_FILTERS[label] || {};
}

export default function ContentPlanBiGrid({ dashboard, onFocusFilter }) {
  return (
    <div className="analytics-content-plan-bi-grid">
      <article className="analytics-surface analytics-content-plan-bi-panel">
        <div className="analytics-content-plan-bi-head">
          <span>Соцсети</span>
          <strong>{dashboard.channels} каналов</strong>
        </div>
        <div className="analytics-content-plan-bi-bars">
          {dashboard.channelMix.length ? dashboard.channelMix.map((entry) => (
            <button key={entry.label} type="button" onClick={() => onFocusFilter({ channel: entry.label })}>
              <span>{entry.label}</span>
              <b>{entry.count}</b>
              <progress value={entry.percent} max="100" aria-label={`${entry.label}: ${entry.percent}%`} />
              <small>{entry.percent}%</small>
            </button>
          )) : <small>Карточки пока не добавлены.</small>}
        </div>
      </article>
      <article className="analytics-surface analytics-content-plan-bi-panel">
        <div className="analytics-content-plan-bi-head">
          <span>Производство</span>
          <strong>узкие места</strong>
        </div>
        <div className="analytics-content-plan-bi-bars analytics-content-plan-bi-bars-compact">
          {dashboard.bottleneckMix.map((entry) => (
            <button
              key={entry.label}
              type="button"
              className={`analytics-content-plan-bi-${entry.tone}`}
              onClick={() => onFocusFilter(getBottleneckFilter(entry.label))}
            >
              <span>{entry.label}</span>
              <b>{entry.count}</b>
              <progress value={entry.percent} max="100" aria-label={`${entry.label}: ${entry.percent}%`} />
              <small>{entry.percent}%</small>
            </button>
          ))}
        </div>
      </article>
    </div>
  );
}
