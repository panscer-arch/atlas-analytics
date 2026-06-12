import ContentPlanCardActions from "./ContentPlanCardActions";
import ContentPlanCardEditForm from "./ContentPlanCardEditForm";
import ContentPlanCardReviewActions from "./ContentPlanCardReviewActions";
import ContentPlanCardState from "./ContentPlanCardState";
import ContentPlanCardView from "./ContentPlanCardView";

export default function ContentPlanCard({
  cardState,
  copyState,
  handlers,
  helpers,
  item,
}) {
  const {
    editingId,
    expandedIds,
    pendingDeleteId,
    pendingPublishWithoutLinkId,
    shiftedDateItemId,
    targetItemId,
  } = cardState;
  const {
    copiedBriefItemId,
    copiedItemId,
    copiedLinkItemId,
    copiedPackageItemId,
    copiedRevisionItemId,
  } = copyState;
  const {
    approveItem,
    approveVisual,
    copyItemLink,
    copyItemText,
    copyPublishPackage,
    copyRevisionRequest,
    copyVisualBrief,
    duplicateItem,
    publishItem,
    removeItem,
    requestDelete,
    requestRevision,
    sendToReview,
    setEditingId,
    setPendingDeleteId,
    shiftItemDate,
    toggleExpanded,
    updateItem,
    updateItemStatus,
  } = handlers;
  const {
    addDaysToIso,
    canMarkItemPublished,
    canPublishItem,
    duplicateItemIds,
    formatPlanDate,
    getContentPlanItemElementId,
    getCopyStats,
    getDateState,
    getDateStateLabel,
    getPublicationChecks,
    getPublicationReadinessMeta,
    getPublishBlockReason,
    getQualitySignals,
    getStatusClass,
    getUrlFieldWarning,
    hasTextValue,
    isValidHttpUrl,
    needsPublishWithoutLinkConfirmation,
  } = helpers;
  const isEditing = editingId === item.id;
  const isExpanded = expandedIds.includes(item.id);
  const isPendingDelete = pendingDeleteId === item.id;
  const publicationChecks = getPublicationChecks(item);
  const readinessMeta = getPublicationReadinessMeta(publicationChecks);
  const publishBlockReason = getPublishBlockReason(item);
  const nextActionLabel = item.nextActionLabel;
  const itemCopyStats = copyStats || getCopyStats(item);
  const qualitySignals = getQualitySignals(item, itemCopyStats, duplicateItemIds.has(item.id));
  const canMarkPublished = canMarkItemPublished(item);
  const isPublishWithoutLinkPending = pendingPublishWithoutLinkId === item.id && needsPublishWithoutLinkConfirmation(item);
  const publishButtonTitle = !canPublishItem(item)
    ? getPublishBlockReason(item)
    : !isValidHttpUrl(item.publishedUrl)
      ? "Сначала исправьте ссылку на опубликованный пост"
      : needsPublishWithoutLinkConfirmation(item)
        ? "Нажмите еще раз, если публикация действительно без ссылки"
        : "Отметить как опубликовано";

  return (
    <article
      id={getContentPlanItemElementId(item.id)}
      className={targetItemId === item.id ? "analytics-surface analytics-content-plan-card analytics-content-plan-card-target" : "analytics-surface analytics-content-plan-card"}
    >
      <div className="analytics-content-plan-card-top">
        <div>
          <span>{item.channel} / {item.format}</span>
          {isEditing ? (
            <input className="analytics-launch-input" value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} />
          ) : (
            <h3>{item.title}</h3>
          )}
        </div>
        <ContentPlanCardState
          canMarkPublished={canMarkPublished}
          getStatusClass={getStatusClass}
          item={item}
          nextActionLabel={nextActionLabel}
          onStatusChange={updateItemStatus}
          publishBlockReason={publishBlockReason}
          readinessMeta={readinessMeta}
        />
      </div>

      {isEditing ? (
        <ContentPlanCardEditForm
          getUrlFieldWarning={getUrlFieldWarning}
          item={item}
          onUpdateItem={updateItem}
        />
      ) : (
        <ContentPlanCardView
          copyStats={itemCopyStats}
          formatPlanDate={formatPlanDate}
          getDateState={getDateState}
          getDateStateLabel={getDateStateLabel}
          hasTextValue={hasTextValue}
          isExpanded={isExpanded}
          isValidHttpUrl={isValidHttpUrl}
          item={item}
          onUpdateItem={updateItem}
          publicationChecks={publicationChecks}
          qualitySignals={qualitySignals}
        />
      )}

      <ContentPlanCardReviewActions
        canMarkPublished={canMarkPublished}
        isPublishWithoutLinkPending={isPublishWithoutLinkPending}
        item={item}
        onApproveItem={approveItem}
        onApproveVisual={approveVisual}
        onPublishItem={publishItem}
        onRequestRevision={requestRevision}
        onSendToReview={sendToReview}
        publishButtonTitle={publishButtonTitle}
      />

      <ContentPlanCardActions
        addDaysToIso={addDaysToIso}
        canPublishItem={canPublishItem}
        copiedBriefItemId={copiedBriefItemId}
        copiedItemId={copiedItemId}
        copiedLinkItemId={copiedLinkItemId}
        copiedPackageItemId={copiedPackageItemId}
        copiedRevisionItemId={copiedRevisionItemId}
        formatPlanDate={formatPlanDate}
        getPublishBlockReason={getPublishBlockReason}
        isEditing={isEditing}
        isExpanded={isExpanded}
        isPendingDelete={isPendingDelete}
        item={item}
        onCancelDelete={() => setPendingDeleteId("")}
        onCopyItemLink={copyItemLink}
        onCopyItemText={copyItemText}
        onCopyPublishPackage={copyPublishPackage}
        onCopyRevisionRequest={copyRevisionRequest}
        onCopyVisualBrief={copyVisualBrief}
        onDuplicateItem={duplicateItem}
        onRemoveItem={removeItem}
        onRequestDelete={requestDelete}
        onShiftItemDate={shiftItemDate}
        onToggleEditing={setEditingId}
        onToggleExpanded={toggleExpanded}
        shiftedDateItemId={shiftedDateItemId}
      />
    </article>
  );
}
