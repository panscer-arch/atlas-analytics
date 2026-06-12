import { useEffect, useMemo, useRef, useState } from "react";
import {
  CONTENT_PLAN_STORAGE_KEY,
  DEFAULT_FILTERS,
  SAVE_STATE_META,
  emptyItem,
} from "../data/contentPlanData";
import useContentPlanCopyFlags from "../hooks/useContentPlanCopyFlags";
import useContentPlanItemsPersistence from "../hooks/useContentPlanItemsPersistence";
import useContentPlanSmmState from "../hooks/useContentPlanSmmState";
import {
  buildCurrentAuditText,
  buildCurrentRevisionPackageText,
  buildCurrentSliceText,
  buildCurrentTaskListText,
  buildDayPublishPackageText,
  buildPublishPackageText,
  buildPublishedReportText,
  buildRevisionRequestText,
  buildVisualBriefText,
} from "../utils/contentPlanCopyText";
import {
  addDaysToIso,
  canPublishItem,
  formatPlanDate,
  getContentPlanItemElementId,
  getCopyStats,
  getDateState,
  getDateStateLabel,
  getDayReadinessMeta,
  getDuplicateContentPlanIds,
  getNextActionLabel,
  getPublicationChecks,
  getPublicationReadinessMeta,
  getPublishBlockReason,
  getQualitySignals,
  getSignalClass,
  getStatusClass,
  getTodayIso,
  getUrlFieldWarning,
  hasFuturePublishedDate,
  hasInvalidContentPlanLink,
  hasTextValue,
  isValidHttpUrl,
  needsPublishedDate,
  needsRevisionComment,
} from "../utils/contentPlanUtils";
import { buildContentPlanDashboard, buildContentPlanSliceHealth } from "../utils/contentPlanMetrics";
import ContentPlanAddForm from "./ContentPlanAddForm";
import ContentPlanBiGrid from "./ContentPlanBiGrid";
import ContentPlanCommandPanel from "./ContentPlanCommandPanel";
import ContentPlanEditorialQueue from "./ContentPlanEditorialQueue";
import ContentPlanFiltersPanel from "./ContentPlanFiltersPanel";
import ContentPlanHero from "./ContentPlanHero";
import ContentPlanResultBar from "./ContentPlanResultBar";
import ContentPlanSmmBoard from "./ContentPlanSmmBoard";
import ContentPlanTimeline from "./ContentPlanTimeline";
import ContentPlanUndoNotice from "./ContentPlanUndoNotice";

export { CONTENT_PLAN_STORAGE_KEY };

function ContentPlanBoard() {
  const {
    items,
    retryServerSave,
    saveState,
    updateItems,
  } = useContentPlanItemsPersistence();
  const [newItem, setNewItem] = useState(emptyItem);
  const [editingId, setEditingId] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [recentlyDeletedItem, setRecentlyDeletedItem] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [pendingPublishWithoutLinkId, setPendingPublishWithoutLinkId] = useState("");
  const [targetItemId, setTargetItemId] = useState("");
  const duplicateItemIds = useMemo(() => getDuplicateContentPlanIds(items), [items]);
  const copyFlags = useContentPlanCopyFlags();
  const smmState = useContentPlanSmmState();
  const copyFlagState = copyFlags.flags;
  const copyMark = copyFlags.mark;
  const deepLinkHandledRef = useRef(false);
  const publishConfirmTimerRef = useRef(null);

  useEffect(() => () => {
    if (publishConfirmTimerRef.current) window.clearTimeout(publishConfirmTimerRef.current);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || deepLinkHandledRef.current) return;
    const url = new URL(window.location.href);
    const hashId = url.hash.startsWith("#content-plan-item-") ? url.hash.replace("#content-plan-item-", "") : "";
    const targetId = url.searchParams.get("content") || hashId;
    if (!targetId || !items.some((item) => item.id === targetId)) return;

    deepLinkHandledRef.current = true;
    setTargetItemId(targetId);
    setExpandedIds((current) => (current.includes(targetId) ? current : [...current, targetId]));
    window.setTimeout(() => {
      document.getElementById(getContentPlanItemElementId(targetId))?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 120);
  }, [items]);

  const filteredItems = useMemo(() => {
    const searchValue = filters.search.trim().toLowerCase();
    return items
      .filter((item) => filters.channel === "Все" || item.channel === filters.channel || item.channel === "Все каналы")
      .filter((item) => filters.stage === "Все" || item.stage === filters.stage)
      .filter((item) => filters.format === "Все" || item.format === filters.format)
      .filter((item) => filters.status === "Все" || item.status === filters.status)
      .filter((item) => filters.reviewStatus === "Все" || item.reviewStatus === filters.reviewStatus)
      .filter((item) => filters.priority === "Все" || item.priority === filters.priority)
      .filter((item) => filters.owner === "Все" || (filters.owner === "Не назначен" ? !item.owner : item.owner === filters.owner))
      .filter((item) => filters.nextAction === "Все" || getNextActionLabel(item) === filters.nextAction)
      .filter((item) => {
        if (filters.dateState === "Все") return true;
        const state = getDateState(item.date, item.status);
        if (filters.dateState === "Просрочено") return state === "overdue";
        if (filters.dateState === "Сегодня") return state === "today";
        if (filters.dateState === "По плану") return state === "upcoming";
        if (filters.dateState === "Без даты") return !item.date;
        return true;
      })
      .filter((item) => filters.readiness === "Все" || (canPublishItem(item) && item.status !== "Опубликовано"))
      .filter((item) => {
        if (filters.copyIssue === "Все") return true;
        if (filters.copyIssue === "X > 280") return getCopyStats(item).isXOverLimit;
        if (filters.copyIssue === "Без текста") return !String(item.copy || "").trim();
        return true;
      })
      .filter((item) => filters.visualIssue === "Все" || (item.visualStatus !== "Визуал ок" && item.visualStatus !== "Нет визуала"))
      .filter((item) => {
        if (filters.linkIssue === "Все") return true;
        if (filters.linkIssue === "Некорректный URL") return hasInvalidContentPlanLink(item);
        if (filters.linkIssue === "Некорректная ссылка визуала") return hasTextValue(item.visualLink) && !isValidHttpUrl(item.visualLink);
        if (filters.linkIssue === "Некорректная ссылка публикации") return item.status === "Опубликовано" && hasTextValue(item.publishedUrl) && !isValidHttpUrl(item.publishedUrl);
        if (filters.linkIssue === "Опубликовано без ссылки") return item.status === "Опубликовано" && !hasTextValue(item.publishedUrl);
        if (filters.linkIssue === "Опубликовано без даты") return needsPublishedDate(item);
        if (filters.linkIssue === "Дата публикации в будущем") return hasFuturePublishedDate(item);
        return true;
      })
      .filter((item) => filters.duplicateIssue === "Все" || duplicateItemIds.has(item.id))
      .filter((item) => filters.revisionIssue === "Все" || needsRevisionComment(item))
      .filter((item) => !filters.date || item.date === filters.date)
      .filter((item) => {
        if (!searchValue) return true;
        return [item.title, item.topicBlock, item.copy, item.comment, item.adminComment, item.visualBrief, item.visualLink].some((value) => String(value || "").toLowerCase().includes(searchValue));
      })
      .sort((a, b) => (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99"));
  }, [duplicateItemIds, filters, items]);

  const ownerOptions = useMemo(() => {
    const owners = Array.from(new Set(items.map((item) => item.owner).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
    return ["Все", "Не назначен", ...owners];
  }, [items]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce((groups, item) => {
      const key = item.date || "Без даты";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }, [filteredItems]);

  const dashboard = useMemo(() => buildContentPlanDashboard(items, duplicateItemIds), [duplicateItemIds, items]);

  const activeFilterChips = useMemo(() => {
    const labels = {
      channel: "Соцсеть",
      stage: "Этап",
      format: "Формат",
      status: "Статус",
      reviewStatus: "Согласование",
      priority: "Приоритет",
      owner: "Ответственный",
      dateState: "Срок",
      readiness: "Готовность",
      nextAction: "Следующий шаг",
      copyIssue: "Текст",
      visualIssue: "Визуал",
      linkIssue: "Ссылки",
      duplicateIssue: "Дубли",
      revisionIssue: "Правки",
      date: "Дата",
      search: "Поиск",
    };

    return Object.entries(filters)
      .filter(([key, value]) => {
        if (!value) return false;
        if (key === "search") return Boolean(value.trim());
        return value !== DEFAULT_FILTERS[key];
      })
      .map(([key, value]) => ({
        key,
        label: labels[key] || key,
        value: key === "date" ? formatPlanDate(value) : value,
      }));
  }, [filters]);

  const sliceHealth = useMemo(() => buildContentPlanSliceHealth(filteredItems, duplicateItemIds), [duplicateItemIds, filteredItems]);

  const publishedSliceItems = useMemo(() => {
    return filteredItems.filter((item) => item.status === "Опубликовано");
  }, [filteredItems]);

  const revisionSliceItems = useMemo(() => {
    return filteredItems.filter((item) => item.reviewStatus === "Нужны правки" || hasTextValue(item.adminComment));
  }, [filteredItems]);

  function updateItem(itemId, patch) {
    if (Object.prototype.hasOwnProperty.call(patch, "publishedUrl")) {
      setPendingPublishWithoutLinkId("");
    }
    updateItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  }

  function canMarkItemPublished(item = {}) {
    return canPublishItem(item) && isValidHttpUrl(item.publishedUrl);
  }

  function needsPublishWithoutLinkConfirmation(item = {}) {
    return canPublishItem(item) && !hasTextValue(item.publishedUrl);
  }

  function requestPublishWithoutLinkConfirmation(itemId) {
    setPendingPublishWithoutLinkId(itemId);
    if (publishConfirmTimerRef.current) window.clearTimeout(publishConfirmTimerRef.current);
    publishConfirmTimerRef.current = window.setTimeout(() => setPendingPublishWithoutLinkId(""), 4500);
  }

  function updateItemStatus(itemId, nextStatus) {
    const item = items.find((currentItem) => currentItem.id === itemId);
    if (nextStatus === "Опубликовано" && !canPublishItem(item || {})) {
      return;
    }
    if (nextStatus === "Опубликовано" && !canMarkItemPublished(item || {})) {
      return;
    }
    if (nextStatus === "Опубликовано" && needsPublishWithoutLinkConfirmation(item || {}) && pendingPublishWithoutLinkId !== itemId) {
      requestPublishWithoutLinkConfirmation(itemId);
      return;
    }

    const patch = { status: nextStatus };
    if (nextStatus === "На вычитке") patch.reviewStatus = "На согласовании";
    if (nextStatus === "Готово") patch.reviewStatus = "Проверено";
    if (nextStatus === "Опубликовано") {
      patch.reviewStatus = "Можно публиковать";
      patch.publishedAt = item?.publishedAt || getTodayIso();
    }
    if (nextStatus !== "Опубликовано") patch.publishedAt = "";
    if (nextStatus === "Черновик" && item?.reviewStatus === "Проверено") patch.reviewStatus = "Готовится";
    setPendingPublishWithoutLinkId("");
    updateItem(itemId, patch);
  }

  function addItem() {
    const title = newItem.title.trim();
    if (!title) return;
    const item = {
      ...newItem,
      id: `content-plan-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      topicBlock: newItem.topicBlock.trim(),
      owner: newItem.owner.trim(),
      visualBrief: newItem.visualBrief.trim(),
      visualLink: newItem.visualLink.trim(),
      copy: newItem.copy.trim(),
      comment: newItem.comment.trim(),
      adminComment: newItem.adminComment.trim(),
      publishedUrl: newItem.publishedUrl.trim(),
    };
    updateItems((current) => [item, ...current]);
    setNewItem(emptyItem);
    setRecentlyDeletedItem(null);
  }

  function removeItem(itemId) {
    updateItems((current) => {
      const index = current.findIndex((item) => item.id === itemId);
      if (index === -1) return current;
      setRecentlyDeletedItem({ item: current[index], index });
      return current.filter((item) => item.id !== itemId);
    });
    setPendingDeleteId("");
    setEditingId((current) => (current === itemId ? "" : current));
    setExpandedIds((current) => current.filter((id) => id !== itemId));
  }

  function restoreRecentlyDeletedItem() {
    if (!recentlyDeletedItem?.item) return;
    updateItems((current) => {
      if (current.some((item) => item.id === recentlyDeletedItem.item.id)) return current;
      const insertIndex = Math.min(Math.max(recentlyDeletedItem.index, 0), current.length);
      return [
        ...current.slice(0, insertIndex),
        recentlyDeletedItem.item,
        ...current.slice(insertIndex),
      ];
    });
    setRecentlyDeletedItem(null);
    setTargetItemId(recentlyDeletedItem.item.id);
    setExpandedIds((current) => (current.includes(recentlyDeletedItem.item.id) ? current : [...current, recentlyDeletedItem.item.id]));
  }

  function duplicateItem(itemId) {
    const sourceItem = items.find((item) => item.id === itemId);
    if (!sourceItem) return;

    const duplicateId = `content-plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const duplicate = {
      ...sourceItem,
      id: duplicateId,
      title: `Копия: ${sourceItem.title || "публикация"}`,
      status: "Черновик",
      reviewStatus: "Готовится",
      visualStatus: sourceItem.visualStatus === "Нет визуала" ? "Нет визуала" : "Визуал готовится",
      adminComment: "",
    };

    updateItems((current) => {
      const sourceIndex = current.findIndex((item) => item.id === itemId);
      if (sourceIndex === -1) return [duplicate, ...current];
      return [
        ...current.slice(0, sourceIndex + 1),
        duplicate,
        ...current.slice(sourceIndex + 1),
      ];
    });
    setEditingId(duplicateId);
    setExpandedIds((current) => (current.includes(duplicateId) ? current : [...current, duplicateId]));
    setPendingDeleteId("");
    setRecentlyDeletedItem(null);
  }

  function fallbackCopyValue(text, onCopied) {
    if (typeof document === "undefined") return;
    const buffer = document.createElement("textarea");
    buffer.className = "analytics-content-plan-copy-buffer";
    buffer.value = text;
    buffer.setAttribute("readonly", "");
    document.body.appendChild(buffer);
    buffer.select();
    try {
      if (document.execCommand("copy")) onCopied();
    } catch {
      // Копирование не должно ломать работу карточки.
    } finally {
      document.body.removeChild(buffer);
    }
  }

  function copyItemText(item) {
    const text = String(item.copy || "").trim();
    if (!text) return;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => copyMark.markItemCopied(item.id))
        .catch(() => fallbackCopyValue(text, () => copyMark.markItemCopied(item.id)));
      return;
    }
    fallbackCopyValue(text, () => copyMark.markItemCopied(item.id));
  }

  function copyVisualBrief(item) {
    const text = buildVisualBriefText(item);
    if (!text) return;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => copyMark.markBriefCopied(item.id))
        .catch(() => fallbackCopyValue(text, () => copyMark.markBriefCopied(item.id)));
      return;
    }
    fallbackCopyValue(text, () => copyMark.markBriefCopied(item.id));
  }

  function copyPublishPackage(item) {
    if (!canPublishItem(item)) return;
    const text = buildPublishPackageText(item);
    copyMark.markPackageCopied(item.id);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, () => copyMark.markPackageCopied(item.id)));
      return;
    }
    fallbackCopyValue(text, () => copyMark.markPackageCopied(item.id));
  }

  function copyDayPublishPackage(dayKey, groupItems) {
    const text = buildDayPublishPackageText(dayKey, groupItems);
    if (!text) return;
    copyMark.markDayCopied(dayKey);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, () => copyMark.markDayCopied(dayKey)));
      return;
    }
    fallbackCopyValue(text, () => copyMark.markDayCopied(dayKey));
  }

  function copyCurrentSlice() {
    const text = buildCurrentSliceText({ activeFilterChips, filteredItems, itemsCount: items.length });
    if (!text) return;
    copyMark.markSliceCopied();
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, copyMark.markSliceCopied));
      return;
    }
    fallbackCopyValue(text, copyMark.markSliceCopied);
  }

  function copyCurrentTaskList() {
    const text = buildCurrentTaskListText({ filteredItems, nextAction: filters.nextAction });
    if (!text) return;
    copyMark.markTaskListCopied();
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, copyMark.markTaskListCopied));
      return;
    }
    fallbackCopyValue(text, copyMark.markTaskListCopied);
  }

  function copyCurrentAudit() {
    const text = buildCurrentAuditText({
      activeFilterChips,
      duplicateItemIds,
      filteredItems,
      sliceHealth,
    });
    if (!text) return;
    copyMark.markAuditCopied();
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, copyMark.markAuditCopied));
      return;
    }
    fallbackCopyValue(text, copyMark.markAuditCopied);
  }

  function copyPublishedReport() {
    const text = buildPublishedReportText({ activeFilterChips, publishedSliceItems });
    if (!text) return;
    copyMark.markPublishedReportCopied();
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, copyMark.markPublishedReportCopied));
      return;
    }
    fallbackCopyValue(text, copyMark.markPublishedReportCopied);
  }

  function copyRevisionRequest(item) {
    const text = buildRevisionRequestText(item);
    if (!text) return;
    copyMark.markRevisionCopied(item.id);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, () => copyMark.markRevisionCopied(item.id)));
      return;
    }
    fallbackCopyValue(text, () => copyMark.markRevisionCopied(item.id));
  }

  function copyCurrentRevisionPackage() {
    const text = buildCurrentRevisionPackageText({ activeFilterChips, revisionSliceItems });
    if (!text) return;
    copyMark.markRevisionSliceCopied();
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, copyMark.markRevisionSliceCopied));
      return;
    }
    fallbackCopyValue(text, copyMark.markRevisionSliceCopied);
  }

  function getItemShareLink(itemId) {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("board", "contentPlan");
    url.searchParams.set("content", itemId);
    url.hash = getContentPlanItemElementId(itemId);
    return url.toString();
  }

  function copyItemLink(itemId) {
    const link = getItemShareLink(itemId);
    if (!link) return;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link)
        .then(() => copyMark.markItemLinkCopied(itemId))
        .catch(() => fallbackCopyValue(link, () => copyMark.markItemLinkCopied(itemId)));
      return;
    }
    fallbackCopyValue(link, () => copyMark.markItemLinkCopied(itemId));
  }

  function shiftItemDate(itemId, days) {
    const item = items.find((currentItem) => currentItem.id === itemId);
    if (!item || item.status === "Опубликовано") return;
    updateItem(itemId, { date: addDaysToIso(item.date, days) });
    copyMark.markDateShifted(itemId);
  }

  function toggleExpanded(itemId) {
    setExpandedIds((current) => (current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]));
  }

  function requestDelete(itemId) {
    setPendingDeleteId((current) => (current === itemId ? "" : itemId));
  }

  function sendToReview(itemId) {
    updateItem(itemId, { status: "На вычитке", reviewStatus: "На согласовании" });
  }

  function approveItem(itemId) {
    const item = items.find((currentItem) => currentItem.id === itemId);
    const nextItem = { ...(item || {}), reviewStatus: "Проверено" };
    updateItem(itemId, { status: canPublishItem(nextItem) ? "Готово" : "На вычитке", reviewStatus: "Проверено" });
  }

  function approveVisual(itemId) {
    updateItem(itemId, { visualStatus: "Визуал ок" });
  }

  function requestRevision(itemId) {
    const item = items.find((currentItem) => currentItem.id === itemId);
    const revisionComment = item?.adminComment?.trim();
    if (!revisionComment) return;
    updateItem(itemId, {
      status: "Черновик",
      reviewStatus: "Нужны правки",
      adminComment: revisionComment,
    });
  }

  function publishItem(itemId) {
    const item = items.find((currentItem) => currentItem.id === itemId);
    if (!canMarkItemPublished(item || {})) return;
    if (needsPublishWithoutLinkConfirmation(item || {}) && pendingPublishWithoutLinkId !== itemId) {
      requestPublishWithoutLinkConfirmation(itemId);
      return;
    }
    setPendingPublishWithoutLinkId("");
    updateItem(itemId, { status: "Опубликовано", reviewStatus: "Можно публиковать", publishedAt: item?.publishedAt || getTodayIso() });
  }

  function applyFocusFilter(patch) {
    setFilters((current) => ({
      ...DEFAULT_FILTERS,
      search: current.search,
      ...patch,
    }));
  }

  function selectQueueItem(itemId) {
    setTargetItemId(itemId);
    setExpandedIds((current) => (current.includes(itemId) ? current : [...current, itemId]));
    document.getElementById(getContentPlanItemElementId(itemId))?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function isFocusActive(patch) {
    return Object.entries(patch).every(([key, value]) => filters[key] === value);
  }

  function clearFilter(filterKey) {
    setFilters((current) => ({ ...current, [filterKey]: DEFAULT_FILTERS[filterKey] }));
  }

  return (
    <ContentPlanSmmBoard
      approvals={smmState.approvals}
      isEditing={smmState.isEditing}
      rows={smmState.rows}
      saveMeta={SAVE_STATE_META[saveState] || { label: "Сохранено", detail: "SMM-доска готова" }}
      stats={smmState.stats}
      theme={smmState.theme}
      onAddRow={smmState.addRow}
      onToggleEditing={smmState.toggleEditing}
      onUpdateApproval={smmState.updateApproval}
      onUpdateRow={smmState.updateRow}
      onUpdateTheme={smmState.updateTheme}
    />
  );

  const saveMeta = SAVE_STATE_META[saveState] || SAVE_STATE_META.idle;
  const cardState = {
    editingId,
    expandedIds,
    pendingDeleteId,
    pendingPublishWithoutLinkId,
    shiftedDateItemId: copyFlagState.shiftedDateItemId,
    targetItemId,
  };
  const copyState = {
    copiedBriefItemId: copyFlagState.copiedBriefItemId,
    copiedItemId: copyFlagState.copiedItemId,
    copiedLinkItemId: copyFlagState.copiedLinkItemId,
    copiedPackageItemId: copyFlagState.copiedPackageItemId,
    copiedRevisionItemId: copyFlagState.copiedRevisionItemId,
  };
  const timelineHandlers = {
    approveItem,
    approveVisual,
    copyDayPublishPackage,
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
  };
  const timelineHelpers = {
    addDaysToIso,
    canMarkItemPublished,
    canPublishItem,
    duplicateItemIds,
    formatPlanDate,
    getContentPlanItemElementId,
    getCopyStats,
    getDateState,
    getDateStateLabel,
    getDayReadinessMeta,
    getNextActionLabel,
    getPublicationChecks,
    getPublicationReadinessMeta,
    getPublishBlockReason,
    getQualitySignals,
    getStatusClass,
    getUrlFieldWarning,
    hasTextValue,
    isValidHttpUrl,
    needsPublishWithoutLinkConfirmation,
  };

  return (
    <section className="analytics-content-plan">
      <ContentPlanHero dashboard={dashboard} onFocusFilter={applyFocusFilter} />

      <ContentPlanCommandPanel
        dashboard={dashboard}
        formatPlanDate={formatPlanDate}
        getSignalClass={getSignalClass}
        isFocusActive={isFocusActive}
        onFocusFilter={applyFocusFilter}
      />

      <ContentPlanBiGrid dashboard={dashboard} onFocusFilter={applyFocusFilter} />

      <ContentPlanEditorialQueue
        queueItems={dashboard.queueItems}
        formatPlanDate={formatPlanDate}
        onSelectItem={selectQueueItem}
      />

      <ContentPlanFiltersPanel
        filters={filters}
        ownerOptions={ownerOptions}
        saveMeta={saveMeta}
        saveState={saveState}
        setFilters={setFilters}
        onRetryServerSave={retryServerSave}
      />

      <ContentPlanResultBar
        activeFilterChips={activeFilterChips}
        copiedAudit={copyFlagState.copiedAudit}
        copiedPublishedReport={copyFlagState.copiedPublishedReport}
        copiedRevisionSlice={copyFlagState.copiedRevisionSlice}
        copiedSlice={copyFlagState.copiedSlice}
        copiedTaskList={copyFlagState.copiedTaskList}
        filters={filters}
        filteredItemsCount={filteredItems.length}
        itemsCount={items.length}
        publishedSliceItemsCount={publishedSliceItems.length}
        revisionSliceItemsCount={revisionSliceItems.length}
        sliceHealth={sliceHealth}
        onClearFilter={clearFilter}
        onCopyAudit={copyCurrentAudit}
        onCopyPublishedReport={copyPublishedReport}
        onCopyRevisionPackage={copyCurrentRevisionPackage}
        onCopySlice={copyCurrentSlice}
        onCopyTaskList={copyCurrentTaskList}
      />

      <ContentPlanAddForm
        newItem={newItem}
        setNewItem={setNewItem}
        getUrlFieldWarning={getUrlFieldWarning}
        onAddItem={addItem}
      />

      <ContentPlanUndoNotice
        recentlyDeletedItem={recentlyDeletedItem}
        onRestore={restoreRecentlyDeletedItem}
      />

      <ContentPlanTimeline
        cardState={cardState}
        copyState={copyState}
        filteredItemsCount={filteredItems.length}
        groupedItems={groupedItems}
        handlers={timelineHandlers}
        helpers={timelineHelpers}
        timelineState={{ copiedDayKey: copyFlagState.copiedDayKey }}
      />
    </section>
  );
}

export default ContentPlanBoard;
