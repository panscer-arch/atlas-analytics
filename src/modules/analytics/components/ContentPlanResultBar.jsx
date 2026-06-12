export default function ContentPlanResultBar({
  activeFilterChips,
  copiedAudit,
  copiedPublishedReport,
  copiedRevisionSlice,
  copiedSlice,
  copiedTaskList,
  filters,
  filteredItemsCount,
  itemsCount,
  publishedSliceItemsCount,
  revisionSliceItemsCount,
  sliceHealth,
  onClearFilter,
  onCopyAudit,
  onCopyPublishedReport,
  onCopyRevisionPackage,
  onCopySlice,
  onCopyTaskList,
}) {
  return (
    <div className="analytics-surface analytics-content-plan-resultbar">
      <div>
        <span>Показано</span>
        <strong>{filteredItemsCount} из {itemsCount}</strong>
        <small>{activeFilterChips.length ? "Работает выбранный срез контент-плана" : "Все карточки без дополнительных фильтров"}</small>
      </div>
      <div className="analytics-content-plan-slice-health" aria-label="Сводка качества выбранного среза">
        <span>
          <b>{sliceHealth.percent}%</b>
          готово
        </span>
        <progress value={sliceHealth.percent} max="100" aria-label={`Готовность среза ${sliceHealth.percent}%`} />
        <div>
          {sliceHealth.signals.map((signal) => (
            <small key={signal.label} className={`analytics-content-plan-slice-health-${signal.tone}`}>
              {signal.label}: {signal.count}
            </small>
          ))}
        </div>
      </div>
      {activeFilterChips.length ? (
        <div className="analytics-content-plan-filterchips" aria-label="Активные фильтры">
          {activeFilterChips.map((chip) => (
            <button key={chip.key} type="button" onClick={() => onClearFilter(chip.key)}>
              <span>{chip.label}</span>
              <strong>{chip.value}</strong>
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="analytics-content-plan-slice-copy"
        onClick={onCopySlice}
        disabled={!filteredItemsCount}
      >
        {copiedSlice ? "Срез скопирован" : "Скопировать срез"}
      </button>
      <button
        type="button"
        className="analytics-content-plan-audit-copy"
        onClick={onCopyAudit}
        disabled={!filteredItemsCount}
      >
        {copiedAudit ? "Аудит скопирован" : "Аудит среза"}
      </button>
      <button
        type="button"
        className="analytics-content-plan-revision-slice-copy"
        onClick={onCopyRevisionPackage}
        disabled={!revisionSliceItemsCount}
      >
        {copiedRevisionSlice ? "Правки скопированы" : "Пакет правок"}
      </button>
      <button
        type="button"
        className="analytics-content-plan-published-copy"
        onClick={onCopyPublishedReport}
        disabled={!publishedSliceItemsCount}
      >
        {copiedPublishedReport ? "Отчет скопирован" : "Отчет публикаций"}
      </button>
      <button
        type="button"
        className="analytics-content-plan-task-copy"
        onClick={onCopyTaskList}
        disabled={filters.nextAction === "Все" || !filteredItemsCount}
      >
        {copiedTaskList ? "Задачи скопированы" : "Скопировать задачи"}
      </button>
    </div>
  );
}
