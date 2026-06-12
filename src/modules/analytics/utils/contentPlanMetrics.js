import { SOCIAL_OPTIONS } from "../data/contentPlanData";
import {
  canPublishItem,
  getCopyStats,
  getNextActionLabel,
  getQueueScore,
  getQueueTone,
  getReviewProgress,
  getSharePercent,
  getTodayIso,
  hasFuturePublishedDate,
  hasInvalidContentPlanLink,
  hasTextValue,
  isValidHttpUrl,
  needsPublishedDate,
  needsRevisionComment,
} from "./contentPlanUtils";

export function buildContentPlanDashboard(items, duplicateItemIds) {
  const today = getTodayIso();
  const activeItems = items.filter((item) => item.status !== "Опубликовано" && item.status !== "Готово");
  const total = items.length;
  const overdue = activeItems.filter((item) => item.date && item.date < today).length;
  const todayItems = activeItems.filter((item) => item.date === today).length;
  const nextItems = activeItems
    .filter((item) => item.date && item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const queueItems = activeItems
    .map((item) => ({
      ...item,
      queueScore: getQueueScore(item),
      queueTone: getQueueTone(item),
      queueAction: getNextActionLabel(item),
    }))
    .sort((a, b) => {
      if (b.queueScore !== a.queueScore) return b.queueScore - a.queueScore;
      return (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99");
    })
    .slice(0, 5);
  const withoutDate = activeItems.filter((item) => !item.date).length;
  const withoutCopy = activeItems.filter((item) => !String(item.copy || "").trim()).length;
  const visualIssue = activeItems.filter((item) => item.visualStatus !== "Визуал ок" && item.visualStatus !== "Нет визуала").length;
  const duplicateItems = activeItems.filter((item) => duplicateItemIds.has(item.id)).length;
  const needsRevision = items.filter((item) => item.reviewStatus === "Нужны правки").length;
  const revisionWithoutComment = items.filter(needsRevisionComment).length;
  const publishReady = items.filter((item) => canPublishItem(item) && item.status !== "Опубликовано").length;
  const published = items.filter((item) => item.status === "Опубликовано").length;
  const publishedWithLink = items.filter((item) => item.status === "Опубликовано" && hasTextValue(item.publishedUrl) && isValidHttpUrl(item.publishedUrl)).length;
  const publishedWithoutLink = items.filter((item) => item.status === "Опубликовано" && !hasTextValue(item.publishedUrl)).length;
  const publishedWithoutDate = items.filter(needsPublishedDate).length;
  const publishedFutureDate = items.filter(hasFuturePublishedDate).length;
  const publishedInvalidLink = items.filter((item) => item.status === "Опубликовано" && hasTextValue(item.publishedUrl) && !isValidHttpUrl(item.publishedUrl)).length;
  const invalidVisualLinks = items.filter((item) => hasTextValue(item.visualLink) && !isValidHttpUrl(item.visualLink)).length;
  const invalidLinks = items.filter(hasInvalidContentPlanLink).length;
  const channelMix = SOCIAL_OPTIONS.map((channel) => {
    const count = items.filter((item) => item.channel === channel).length;
    return {
      label: channel,
      count,
      percent: getSharePercent(count, total),
    };
  }).filter((entry) => entry.count > 0);
  const bottleneckMix = [
    { label: "Без даты", count: withoutDate, tone: "warn" },
    { label: "Без текста", count: withoutCopy, tone: "danger" },
    { label: "Правки", count: needsRevision, tone: "focus" },
    { label: "Без комментария", count: revisionWithoutComment, tone: "danger" },
    { label: "Визуал", count: visualIssue, tone: "accent" },
    { label: "Дубли", count: duplicateItems, tone: "warn" },
    { label: "Готово", count: publishReady, tone: "ready" },
    { label: "URL", count: invalidLinks, tone: "warn" },
    { label: "Нет ссылки", count: publishedWithoutLink, tone: "warn" },
    { label: "Нет даты публикации", count: publishedWithoutDate, tone: "warn" },
    { label: "Дата публикации будущая", count: publishedFutureDate, tone: "warn" },
  ].map((entry) => ({
    ...entry,
    percent: getSharePercent(entry.count, activeItems.length || total),
  }));

  return {
    total,
    review: items.filter((item) => item.status === "На вычитке").length,
    approved: items.filter((item) => item.reviewStatus === "Проверено" || item.reviewStatus === "Можно публиковать").length,
    needsRevision,
    revisionWithoutComment,
    visualReady: items.filter((item) => item.visualStatus === "Визуал ок").length,
    publishReady,
    published,
    publishedWithLink,
    publishedLinkProgress: getSharePercent(publishedWithLink, published),
    xOverLimit: activeItems.filter((item) => getCopyStats(item).isXOverLimit).length,
    visualIssue,
    duplicateItems,
    publishedWithoutLink,
    publishedWithoutDate,
    publishedFutureDate,
    publishedInvalidLink,
    invalidVisualLinks,
    invalidLinks,
    channels: new Set(items.map((item) => item.channel)).size,
    reviewProgress: getReviewProgress(items),
    overdue,
    withoutDate,
    todayItems,
    nextItems,
    queueItems,
    highPriority: activeItems.filter((item) => item.priority === "Высокий").length,
    withoutOwner: activeItems.filter((item) => !item.owner).length,
    withoutCopy,
    sendToReview: activeItems.filter((item) => getNextActionLabel(item) === "Отправить на вычитку").length,
    approveVisual: activeItems.filter((item) => getNextActionLabel(item) === "Согласовать визуал").length,
    channelMix,
    bottleneckMix,
  };
}

export function buildContentPlanSliceHealth(filteredItems, duplicateItemIds) {
  const total = filteredItems.length;
  const ready = filteredItems.filter((item) => canPublishItem(item) && item.status !== "Опубликовано").length;
  const revisions = filteredItems.filter((item) => item.reviewStatus === "Нужны правки").length;
  const revisionWithoutComment = filteredItems.filter(needsRevisionComment).length;
  const visualIssues = filteredItems.filter((item) => item.visualStatus !== "Визуал ок" && item.visualStatus !== "Нет визуала").length;
  const withoutCopy = filteredItems.filter((item) => !String(item.copy || "").trim()).length;
  const withoutOwner = filteredItems.filter((item) => !item.owner).length;
  const publishedWithoutLink = filteredItems.filter((item) => item.status === "Опубликовано" && !hasTextValue(item.publishedUrl)).length;
  const publishedWithoutDate = filteredItems.filter(needsPublishedDate).length;
  const publishedFutureDate = filteredItems.filter(hasFuturePublishedDate).length;
  const invalidLinks = filteredItems.filter(hasInvalidContentPlanLink).length;
  const duplicates = filteredItems.filter((item) => duplicateItemIds.has(item.id)).length;

  return {
    total,
    ready,
    percent: getSharePercent(ready, total),
    signals: [
      { label: "Готово", count: ready, tone: "ready" },
      { label: "Правки", count: revisions, tone: "danger" },
      { label: "Без комментария", count: revisionWithoutComment, tone: "danger" },
      { label: "Визуал", count: visualIssues, tone: "accent" },
      { label: "Текст", count: withoutCopy, tone: "danger" },
      { label: "Owner", count: withoutOwner, tone: "warn" },
      { label: "Дубли", count: duplicates, tone: "warn" },
      { label: "URL", count: invalidLinks, tone: "warn" },
      { label: "Ссылки", count: publishedWithoutLink, tone: "warn" },
      { label: "Даты публикации", count: publishedWithoutDate, tone: "warn" },
      { label: "Будущие даты", count: publishedFutureDate, tone: "warn" },
    ],
  };
}
