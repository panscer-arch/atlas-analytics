export default function ContentPlanCardActions({
  addDaysToIso,
  canPublishItem,
  copiedBriefItemId,
  copiedItemId,
  copiedLinkItemId,
  copiedPackageItemId,
  copiedRevisionItemId,
  formatPlanDate,
  getPublishBlockReason,
  isEditing,
  isExpanded,
  isPendingDelete,
  item,
  onCancelDelete,
  onCopyItemLink,
  onCopyItemText,
  onCopyPublishPackage,
  onCopyRevisionRequest,
  onCopyVisualBrief,
  onDuplicateItem,
  onRemoveItem,
  onRequestDelete,
  onShiftItemDate,
  onToggleEditing,
  onToggleExpanded,
  shiftedDateItemId,
}) {
  return (
    <div className="analytics-content-plan-actions">
      {!isEditing ? (
        <button type="button" onClick={() => onToggleExpanded(item.id)}>
          {isExpanded ? "Скрыть текст" : "Показать текст"}
        </button>
      ) : null}
      <button type="button" onClick={() => onToggleEditing(isEditing ? "" : item.id)}>
        {isEditing ? "Готово" : "Редактировать"}
      </button>
      <button
        type="button"
        className="analytics-content-plan-link"
        onClick={() => onCopyItemLink(item.id)}
      >
        {copiedLinkItemId === item.id ? "Ссылка скопирована" : "Ссылка"}
      </button>
      <button
        type="button"
        className="analytics-content-plan-copy"
        onClick={() => onCopyItemText(item)}
        disabled={!String(item.copy || "").trim()}
      >
        {copiedItemId === item.id ? "Скопировано" : "Копировать текст"}
      </button>
      <button
        type="button"
        className="analytics-content-plan-brief-copy"
        onClick={() => onCopyVisualBrief(item)}
        disabled={!String(item.visualBrief || "").trim()}
      >
        {copiedBriefItemId === item.id ? "ТЗ скопировано" : "Копировать ТЗ"}
      </button>
      <button
        type="button"
        className="analytics-content-plan-revision-copy"
        onClick={() => onCopyRevisionRequest(item)}
        disabled={!String(item.adminComment || "").trim()}
      >
        {copiedRevisionItemId === item.id ? "Правки скопированы" : "Копировать правки"}
      </button>
      <button
        type="button"
        className="analytics-content-plan-package-copy"
        onClick={() => onCopyPublishPackage(item)}
        disabled={!canPublishItem(item)}
        title={canPublishItem(item) ? "Скопировать все данные для публикации" : getPublishBlockReason(item)}
      >
        {copiedPackageItemId === item.id ? "Пакет скопирован" : "Пакет к публикации"}
      </button>
      <button type="button" className="analytics-content-plan-duplicate" onClick={() => onDuplicateItem(item.id)}>
        Дублировать
      </button>
      <button
        type="button"
        className="analytics-content-plan-shift-date"
        onClick={() => onShiftItemDate(item.id, -1)}
        disabled={item.status === "Опубликовано"}
        title={item.date ? `Перенести на ${formatPlanDate(addDaysToIso(item.date, -1))}` : `Назначить ${formatPlanDate(addDaysToIso("", -1))}`}
      >
        {shiftedDateItemId === item.id ? "Дата сдвинута" : "Дата -1"}
      </button>
      <button
        type="button"
        className="analytics-content-plan-shift-date"
        onClick={() => onShiftItemDate(item.id, 1)}
        disabled={item.status === "Опубликовано"}
        title={item.date ? `Перенести на ${formatPlanDate(addDaysToIso(item.date, 1))}` : `Назначить ${formatPlanDate(addDaysToIso("", 1))}`}
      >
        {shiftedDateItemId === item.id ? "Дата сдвинута" : "Дата +1"}
      </button>
      {isPendingDelete ? (
        <>
          <button type="button" className="analytics-content-plan-delete-confirm" onClick={() => onRemoveItem(item.id)}>Точно удалить</button>
          <button type="button" onClick={onCancelDelete}>Отмена</button>
        </>
      ) : (
        <button type="button" onClick={() => onRequestDelete(item.id)}>
          Удалить
        </button>
      )}
    </div>
  );
}
