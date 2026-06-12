export default function ContentPlanCardReviewActions({
  canMarkPublished,
  isPublishWithoutLinkPending,
  item,
  onApproveItem,
  onApproveVisual,
  onPublishItem,
  onRequestRevision,
  onSendToReview,
  publishButtonTitle,
}) {
  return (
    <div className="analytics-content-plan-review-actions">
      <button type="button" onClick={() => onSendToReview(item.id)}>На вычитку</button>
      <button type="button" onClick={() => onRequestRevision(item.id)} disabled={!String(item.adminComment || "").trim()}>Правки</button>
      <button type="button" onClick={() => onApproveItem(item.id)}>Проверено</button>
      <button type="button" onClick={() => onApproveVisual(item.id)}>Визуал OK</button>
      <button
        type="button"
        className={isPublishWithoutLinkPending ? "analytics-content-plan-publish-confirm" : ""}
        onClick={() => onPublishItem(item.id)}
        disabled={!canMarkPublished}
        title={publishButtonTitle}
      >
        {isPublishWithoutLinkPending ? "Подтвердить без ссылки" : "Опубликовано"}
      </button>
    </div>
  );
}
