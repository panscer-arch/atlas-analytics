function EmptyState() {
  return (
    <div className="analytics-surface empty-state">
      <h3 className="chart-card-title">Для этого набора фильтров нет данных</h3>
      <p className="chart-card-subtitle mb-0">Попробуйте расширить период или изменить сегмент и источник трафика.</p>
    </div>
  );
}

export default EmptyState;
