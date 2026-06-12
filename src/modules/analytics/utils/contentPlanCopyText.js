import {
  canPublishItem,
  formatPlanDate,
  getCopyStats,
  getNextActionLabel,
  getPublicationChecks,
  getPublicationReadinessMeta,
  getPublishedDateStatus,
  getPublishedUrlStatus,
  getQualitySignals,
  hasFuturePublishedDate,
  hasTextValue,
  isValidHttpUrl,
} from "./contentPlanUtils";

function getFilterLine(activeFilterChips = []) {
  return activeFilterChips.length
    ? activeFilterChips.map((chip) => `${chip.label}: ${chip.value}`).join("; ")
    : "без фильтров";
}

export function buildVisualBriefText(item) {
  const brief = String(item.visualBrief || "").trim();
  if (!brief) return "";
  const parts = [
    `ТЗ на визуал: ${item.title || "Без названия"}`,
    "",
    brief,
  ];
  const visualLink = String(item.visualLink || "").trim();
  if (visualLink) parts.push("", `Макет / файл: ${visualLink}`);
  return parts.join("\n");
}

export function buildPublishPackageText(item) {
  const visualBrief = String(item.visualBrief || "").trim();
  const visualLink = String(item.visualLink || "").trim();
  const adminComment = String(item.adminComment || "").trim();
  const publishedUrl = String(item.publishedUrl || "").trim();
  return [
    `Пакет к публикации: ${item.title || "Без названия"}`,
    "",
    `Канал: ${item.channel || "Не указан"}`,
    `Формат: ${item.format || "Не указан"}`,
    `Дата: ${formatPlanDate(item.date)}`,
    `Ответственный: ${item.owner || "Не назначен"}`,
    "Статус: можно публиковать",
    publishedUrl ? `Опубликовано: ${publishedUrl}` : "",
    "",
    "Текст публикации:",
    String(item.copy || "").trim() || "Текст не добавлен.",
    "",
    "Визуал:",
    visualBrief || item.visualStatus || "Без отдельного визуала",
    visualLink ? `Макет / файл: ${visualLink}` : "",
    adminComment ? `Комментарий администратора: ${adminComment}` : "",
  ].filter(Boolean).join("\n");
}

export function buildDayPublishPackageText(dayKey, groupItems) {
  const readyItems = groupItems.filter((item) => canPublishItem(item) && item.status !== "Опубликовано");
  if (!readyItems.length) return "";
  return [
    `Пакет публикаций на день: ${formatPlanDate(dayKey === "Без даты" ? "" : dayKey)}`,
    `Готово к публикации: ${readyItems.length}`,
    "",
    readyItems.map((item, index) => [`#${index + 1}`, buildPublishPackageText(item)].join("\n")).join("\n\n---\n\n"),
  ].join("\n");
}

export function buildCurrentSliceText({ activeFilterChips, filteredItems, itemsCount }) {
  if (!filteredItems.length) return "";
  const rows = filteredItems.map((item, index) => {
    const readiness = getPublicationReadinessMeta(getPublicationChecks(item));
    return [
      `${index + 1}. ${formatPlanDate(item.date)} / ${item.channel} / ${item.format}`,
      `Тема: ${item.title || "Без названия"}`,
      `Статус: ${item.status}; согласование: ${item.reviewStatus}; визуал: ${item.visualStatus}; готовность: ${readiness.done}/${readiness.total}`,
      `Следующий шаг: ${getNextActionLabel(item)}`,
      `Ответственный: ${item.owner || "Не назначен"}; приоритет: ${item.priority || "Средний"}`,
      hasTextValue(item.publishedUrl) ? `Пост: ${item.publishedUrl}` : "",
    ].filter(Boolean).join("\n");
  });

  return [
    "Срез контент-плана Atlas",
    `Фильтры: ${getFilterLine(activeFilterChips)}`,
    `Карточек: ${filteredItems.length} из ${itemsCount}`,
    "",
    rows.join("\n\n"),
  ].join("\n");
}

export function buildCurrentTaskListText({ filteredItems, nextAction }) {
  if (nextAction === "Все" || !filteredItems.length) return "";
  const rows = filteredItems.map((item, index) => [
    `${index + 1}. ${item.title || "Без названия"}`,
    `Дата: ${formatPlanDate(item.date)}; канал: ${item.channel}; формат: ${item.format}`,
    `Ответственный: ${item.owner || "Не назначен"}; приоритет: ${item.priority || "Средний"}`,
  ].join("\n"));

  return [
    `Задачи контент-плана Atlas: ${nextAction}`,
    `Количество: ${filteredItems.length}`,
    "",
    rows.join("\n\n"),
  ].join("\n");
}

export function buildCurrentAuditText({
  activeFilterChips,
  duplicateItemIds,
  filteredItems,
  sliceHealth,
}) {
  if (!filteredItems.length) return "";
  const issueItems = filteredItems
    .map((item) => {
      const copyStats = getCopyStats(item);
      const signals = getQualitySignals(item, copyStats, duplicateItemIds.has(item.id)).filter((signal) => signal.tone !== "ready");
      return { item, signals };
    })
    .filter((entry) => entry.signals.length);
  const issueRows = issueItems.map(({ item, signals }, index) => [
    `${index + 1}. ${item.title || "Без названия"}`,
    `Дата: ${formatPlanDate(item.date)}; канал: ${item.channel}; формат: ${item.format}`,
    `Ответственный: ${item.owner || "Не назначен"}; следующий шаг: ${getNextActionLabel(item)}`,
    hasTextValue(item.publishedUrl) ? `Пост: ${item.publishedUrl}` : "",
    `Проблемы: ${signals.map((signal) => `${signal.label} - ${signal.detail}`).join("; ")}`,
  ].filter(Boolean).join("\n"));

  return [
    "Аудит среза контент-плана Atlas",
    `Фильтры: ${getFilterLine(activeFilterChips)}`,
    `Карточек: ${sliceHealth.total}`,
    `Готово к публикации: ${sliceHealth.ready} (${sliceHealth.percent}%)`,
    `Проблемы: ${sliceHealth.signals.filter((signal) => signal.label !== "Готово").map((signal) => `${signal.label}: ${signal.count}`).join("; ")}`,
    "",
    issueRows.length ? "Карточки, требующие внимания:" : "Карточек с проблемами в срезе нет.",
    issueRows.join("\n\n"),
  ].filter(Boolean).join("\n");
}

export function buildPublishedReportText({ activeFilterChips, publishedSliceItems }) {
  if (!publishedSliceItems.length) return "";
  const withLinks = publishedSliceItems.filter((item) => hasTextValue(item.publishedUrl) && isValidHttpUrl(item.publishedUrl)).length;
  const withoutLinks = publishedSliceItems.filter((item) => !hasTextValue(item.publishedUrl)).length;
  const invalidLinks = publishedSliceItems.filter((item) => hasTextValue(item.publishedUrl) && !isValidHttpUrl(item.publishedUrl)).length;
  const withDates = publishedSliceItems.filter((item) => hasTextValue(item.publishedAt)).length;
  const withoutDates = publishedSliceItems.filter((item) => !hasTextValue(item.publishedAt)).length;
  const futureDates = publishedSliceItems.filter(hasFuturePublishedDate).length;
  const rows = publishedSliceItems.map((item, index) => {
    const linkStatus = getPublishedUrlStatus(item.publishedUrl);
    const dateStatus = getPublishedDateStatus(item.publishedAt);
    return [
      `${index + 1}. ${item.title || "Без названия"}`,
      `Дата публикации: ${dateStatus.label}`,
      hasFuturePublishedDate(item) ? "Проблема даты: дата публикации в будущем" : "",
      dateStatus.tone === "empty" && item.date ? `Плановая дата: ${formatPlanDate(item.date)}` : "",
      `Канал: ${item.channel}; формат: ${item.format}`,
      `Ответственный: ${item.owner || "Не назначен"}`,
      `Ссылка: ${linkStatus.label}`,
      linkStatus.tone === "invalid" ? `Исходное значение: ${String(item.publishedUrl || "").trim()}` : "",
    ].filter(Boolean).join("\n");
  });

  return [
    "Отчет по опубликованному контенту Atlas",
    `Фильтры: ${getFilterLine(activeFilterChips)}`,
    `Опубликовано в срезе: ${publishedSliceItems.length}`,
    `С датой публикации: ${withDates}`,
    `Без даты публикации: ${withoutDates}`,
    `С будущей датой публикации: ${futureDates}`,
    `Валидная ссылка: ${withLinks}`,
    `Без ссылки: ${withoutLinks}`,
    `Некорректная ссылка: ${invalidLinks}`,
    "",
    rows.join("\n\n"),
  ].join("\n");
}

export function buildRevisionRequestText(item) {
  const adminComment = String(item.adminComment || "").trim();
  if (!adminComment && item.reviewStatus !== "Нужны правки") return "";
  return [
    `Правки по публикации: ${item.title || "Без названия"}`,
    "",
    `Канал: ${item.channel || "Не указан"}`,
    `Формат: ${item.format || "Не указан"}`,
    `Дата: ${formatPlanDate(item.date)}`,
    `Ответственный: ${item.owner || "Не назначен"}`,
    `Статус: ${item.status}; согласование: ${item.reviewStatus}`,
    "",
    "Что нужно исправить:",
    adminComment || "Комментарий администратора не заполнен. Нужно уточнить правку перед возвратом автору.",
  ].join("\n");
}

export function buildCurrentRevisionPackageText({ activeFilterChips, revisionSliceItems }) {
  if (!revisionSliceItems.length) return "";
  return [
    "Пакет правок по контент-плану Atlas",
    `Фильтры: ${getFilterLine(activeFilterChips)}`,
    `Карточек с правками: ${revisionSliceItems.length}`,
    "",
    revisionSliceItems.map((item, index) => [`#${index + 1}`, buildRevisionRequestText(item)].filter(Boolean).join("\n")).join("\n\n---\n\n"),
  ].join("\n");
}
