export default function ContentPlanUndoNotice({ recentlyDeletedItem, onRestore }) {
  if (!recentlyDeletedItem) return null;

  return (
    <div className="analytics-surface analytics-content-plan-undo">
      <div>
        <span>Карточка удалена</span>
        <strong>{recentlyDeletedItem.item.title}</strong>
      </div>
      <button type="button" onClick={onRestore}>Восстановить</button>
    </div>
  );
}
