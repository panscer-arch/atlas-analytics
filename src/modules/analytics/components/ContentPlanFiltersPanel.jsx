import {
  DATE_STATE_OPTIONS,
  DEFAULT_FILTERS,
  FORMAT_OPTIONS,
  LINK_ISSUE_OPTIONS,
  NEXT_ACTION_OPTIONS,
  PRIORITY_OPTIONS,
  READINESS_OPTIONS,
  REVIEW_OPTIONS,
  SOCIAL_OPTIONS,
  STAGE_OPTIONS,
  STATUS_OPTIONS,
} from "../data/contentPlanData";

export default function ContentPlanFiltersPanel({
  filters,
  ownerOptions,
  saveMeta,
  saveState,
  setFilters,
  onRetryServerSave,
}) {
  return (
    <div className="analytics-surface analytics-content-plan-controls">
      <div className="analytics-content-plan-filters">
        <label className="analytics-content-plan-search">
          <span>Поиск</span>
          <input className="analytics-launch-input" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Тема, блок, текст, комментарий" />
        </label>
        <label>
          <span>Соцсеть</span>
          <select className="analytics-launch-input" value={filters.channel} onChange={(event) => setFilters((current) => ({ ...current, channel: event.target.value }))}>
            <option value="Все">Все</option>
            {SOCIAL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Этап</span>
          <select className="analytics-launch-input" value={filters.stage} onChange={(event) => setFilters((current) => ({ ...current, stage: event.target.value }))}>
            <option value="Все">Все</option>
            {STAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Статус</span>
          <select className="analytics-launch-input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="Все">Все</option>
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Согласование</span>
          <select className="analytics-launch-input" value={filters.reviewStatus} onChange={(event) => setFilters((current) => ({ ...current, reviewStatus: event.target.value }))}>
            <option value="Все">Все</option>
            {REVIEW_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Приоритет</span>
          <select className="analytics-launch-input" value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
            <option value="Все">Все</option>
            {PRIORITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Срок</span>
          <select className="analytics-launch-input" value={filters.dateState} onChange={(event) => setFilters((current) => ({ ...current, dateState: event.target.value }))}>
            {DATE_STATE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Готовность</span>
          <select className="analytics-launch-input" value={filters.readiness} onChange={(event) => setFilters((current) => ({ ...current, readiness: event.target.value }))}>
            {READINESS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Следующий шаг</span>
          <select className="analytics-launch-input" value={filters.nextAction} onChange={(event) => setFilters((current) => ({ ...current, nextAction: event.target.value }))}>
            {NEXT_ACTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Ссылки</span>
          <select className="analytics-launch-input" value={filters.linkIssue} onChange={(event) => setFilters((current) => ({ ...current, linkIssue: event.target.value }))}>
            {LINK_ISSUE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Формат</span>
          <select className="analytics-launch-input" value={filters.format} onChange={(event) => setFilters((current) => ({ ...current, format: event.target.value }))}>
            <option value="Все">Все</option>
            {FORMAT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Дата</span>
          <input className="analytics-launch-input" type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} />
        </label>
        <label>
          <span>Ответственный</span>
          <select className="analytics-launch-input" value={filters.owner} onChange={(event) => setFilters((current) => ({ ...current, owner: event.target.value }))}>
            {ownerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <button type="button" className="analytics-content-plan-reset" onClick={() => setFilters(DEFAULT_FILTERS)}>
          Сбросить
        </button>
      </div>
      <div className={`analytics-content-plan-save analytics-content-plan-save-${saveMeta.tone}`}>
        <span>{saveMeta.label}</span>
        <small>{saveMeta.detail}</small>
        {saveState === "local" ? <button type="button" onClick={onRetryServerSave}>Повторить</button> : null}
      </div>
    </div>
  );
}
