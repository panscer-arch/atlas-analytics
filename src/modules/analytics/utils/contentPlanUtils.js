export function formatPlanDate(value) {
  if (!value) return "Без даты";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

export function getTodayIso() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToIso(value, days) {
  const fallback = getTodayIso();
  const baseDate = new Date(`${value || fallback}T00:00:00`);
  const date = Number.isNaN(baseDate.getTime()) ? new Date(`${fallback}T00:00:00`) : baseDate;
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateState(dateValue, status) {
  if (!dateValue || status === "Опубликовано" || status === "Готово") return "neutral";
  const today = getTodayIso();
  if (dateValue < today) return "overdue";
  if (dateValue === today) return "today";
  return "upcoming";
}

export function getStatusClass(status) {
  const token = {
    Идея: "idea",
    Черновик: "draft",
    "На вычитке": "review",
    Готово: "ready",
    Опубликовано: "published",
    "На паузе": "paused",
  }[status] || "idea";
  return `analytics-content-plan-status analytics-content-plan-status-${token}`;
}

export function getReviewProgress(items) {
  if (!items.length) return 0;
  const approved = items.filter((item) => item.reviewStatus === "Проверено" || item.reviewStatus === "Можно публиковать" || item.status === "Опубликовано").length;
  return Math.round((approved / items.length) * 100);
}

export function getSharePercent(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

export function getQueueScore(item) {
  const dateState = getDateState(item.date, item.status);
  const nextAction = getNextActionLabel(item);
  let score = 0;
  if (dateState === "overdue") score += 70;
  if (dateState === "today") score += 55;
  if (!item.date) score += 40;
  if (item.priority === "Высокий") score += 32;
  if (nextAction === "Публиковать") score += 28;
  if (nextAction === "Доработать текст") score += 24;
  if (nextAction === "Согласовать визуал") score += 20;
  if (nextAction === "Отправить на вычитку") score += 18;
  if (!item.owner) score += 10;
  return score;
}

export function getQueueTone(item) {
  const dateState = getDateState(item.date, item.status);
  if (dateState === "overdue") return "danger";
  if (dateState === "today") return "accent";
  if (getNextActionLabel(item) === "Публиковать") return "ready";
  return "focus";
}

export function getPublicationChecks(item) {
  const isTextApproved = item.reviewStatus === "Проверено" || item.reviewStatus === "Можно публиковать";
  const isVisualApproved = item.visualStatus === "Визуал ок" || item.visualStatus === "Нет визуала";
  return [
    {
      key: "date",
      label: "Дата",
      done: Boolean(item.date),
      detail: item.date ? formatPlanDate(item.date) : "назначить дату публикации",
    },
    {
      key: "copy",
      label: "Текст",
      done: Boolean(String(item.copy || "").trim()),
      detail: String(item.copy || "").trim() ? "финальный текст заполнен" : "добавить финальный текст",
    },
    {
      key: "review",
      label: "Вычитка",
      done: isTextApproved,
      detail: isTextApproved ? item.reviewStatus : "нужно согласование текста",
    },
    {
      key: "visual",
      label: "Визуал",
      done: isVisualApproved,
      detail: isVisualApproved ? item.visualStatus : "визуал еще не согласован",
    },
  ];
}

export function canPublishItem(item = {}) {
  return getPublicationChecks(item).every((check) => check.done);
}

export function getPublishBlockReason(item) {
  const failed = getPublicationChecks(item).find((check) => !check.done);
  return failed ? failed.detail : "готово к публикации";
}

export function getNextActionLabel(item) {
  const failed = getPublicationChecks(item).find((check) => !check.done);
  if (!failed) return item.status === "Опубликовано" ? "Уже опубликовано" : "Публиковать";
  return {
    date: "Назначить дату",
    copy: "Дописать текст",
    review: item.reviewStatus === "Нужны правки" ? "Доработать текст" : "Отправить на вычитку",
    visual: "Согласовать визуал",
  }[failed.key] || failed.detail;
}

export function hasTextValue(value) {
  return Boolean(String(value || "").trim());
}

function getContentPlanDuplicateKey(item = {}) {
  const date = String(item.date || "").trim();
  const channel = String(item.channel || "").trim().toLowerCase();
  const title = String(item.title || "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!date || !channel || !title) return "";
  return `${date}::${channel}::${title}`;
}

export function getDuplicateContentPlanIds(items = []) {
  const groups = new Map();
  items.forEach((item) => {
    const key = getContentPlanDuplicateKey(item);
    if (!key) return;
    const group = groups.get(key) || [];
    group.push(item.id);
    groups.set(key, group);
  });

  const ids = new Set();
  groups.forEach((group) => {
    if (group.length < 2) return;
    group.forEach((id) => ids.add(id));
  });
  return ids;
}

export function isValidHttpUrl(value) {
  const text = String(value || "").trim();
  if (!text) return true;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getUrlFieldWarning(value) {
  if (!hasTextValue(value) || isValidHttpUrl(value)) return "";
  return "Укажите полную ссылку с http:// или https://";
}

export function getPublishedUrlStatus(value) {
  if (!hasTextValue(value)) return { label: "не заполнена", tone: "empty" };
  if (!isValidHttpUrl(value)) return { label: "некорректная ссылка", tone: "invalid" };
  return { label: String(value || "").trim(), tone: "valid" };
}

export function getPublishedDateStatus(value) {
  if (!hasTextValue(value)) return { label: "не заполнена", tone: "empty" };
  return { label: formatPlanDate(value), tone: "valid" };
}

export function hasInvalidContentPlanLink(item = {}) {
  return !isValidHttpUrl(item.visualLink) || !isValidHttpUrl(item.publishedUrl);
}

export function needsRevisionComment(item = {}) {
  return item.reviewStatus === "Нужны правки" && !hasTextValue(item.adminComment);
}

export function needsPublishedDate(item = {}) {
  return item.status === "Опубликовано" && !hasTextValue(item.publishedAt);
}

export function hasFuturePublishedDate(item = {}) {
  return item.status === "Опубликовано" && hasTextValue(item.publishedAt) && item.publishedAt > getTodayIso();
}

export function getQualitySignals(item, copyStats, isDuplicate = false) {
  const signals = [];
  const dateState = getDateState(item.date, item.status);
  const isTextApproved = item.reviewStatus === "Проверено" || item.reviewStatus === "Можно публиковать";
  const isVisualApproved = item.visualStatus === "Визуал ок" || item.visualStatus === "Нет визуала";

  if (isDuplicate) signals.push({ label: "Дубль", detail: "та же дата, канал и заголовок", tone: "warn" });
  if (dateState === "overdue") signals.push({ label: "Просрочено", detail: getDateStateLabel(dateState), tone: "danger" });
  if (!item.date) signals.push({ label: "Без даты", detail: "назначить слот", tone: "warn" });
  if (!item.owner) signals.push({ label: "Owner", detail: "не назначен", tone: "warn" });
  if (!String(item.copy || "").trim()) signals.push({ label: "Текст", detail: "пустой copy", tone: "danger" });
  if (copyStats.isXOverLimit) signals.push({ label: "X", detail: "больше 280", tone: "warn" });
  if (item.reviewStatus === "Нужны правки") signals.push({ label: "Правки", detail: "вернуть автору", tone: "danger" });
  if (needsRevisionComment(item)) signals.push({ label: "Комментарий", detail: "объяснить правку", tone: "danger" });
  if (!isTextApproved && item.reviewStatus !== "Нужны правки") signals.push({ label: "Вычитка", detail: item.reviewStatus, tone: "focus" });
  if (!isVisualApproved) signals.push({ label: "Визуал", detail: item.visualStatus, tone: "accent" });
  if (hasTextValue(item.visualLink) && !isValidHttpUrl(item.visualLink)) signals.push({ label: "Макет", detail: "некорректная ссылка", tone: "warn" });
  if (hasTextValue(item.publishedUrl) && !isValidHttpUrl(item.publishedUrl)) signals.push({ label: "Пост", detail: "некорректная ссылка", tone: "warn" });
  if (item.status === "Опубликовано" && !hasTextValue(item.publishedUrl)) signals.push({ label: "Пост", detail: "нет ссылки", tone: "warn" });
  if (needsPublishedDate(item)) signals.push({ label: "Дата публикации", detail: "не заполнена", tone: "warn" });
  if (hasFuturePublishedDate(item)) signals.push({ label: "Дата публикации", detail: "в будущем", tone: "warn" });

  if (!signals.length) return [{ label: "Контроль", detail: "замечаний нет", tone: "ready" }];
  return signals.slice(0, 6);
}

export function getDayReadinessMeta(items = []) {
  const total = items.length;
  const ready = items.filter((item) => canPublishItem(item) || item.status === "Опубликовано").length;
  const withoutCopy = items.filter((item) => !String(item.copy || "").trim()).length;
  const withoutDate = items.filter((item) => !item.date).length;
  const revisions = items.filter((item) => item.reviewStatus === "Нужны правки").length;
  const visualIssues = items.filter((item) => item.visualStatus !== "Визуал ок" && item.visualStatus !== "Нет визуала").length;
  const publishedWithoutLink = items.filter((item) => item.status === "Опубликовано" && !hasTextValue(item.publishedUrl)).length;
  const invalidLinks = items.filter(hasInvalidContentPlanLink).length;
  const signals = [
    { label: "Без даты", count: withoutDate, tone: "warn" },
    { label: "Без текста", count: withoutCopy, tone: "danger" },
    { label: "Правки", count: revisions, tone: "danger" },
    { label: "Визуал", count: visualIssues, tone: "accent" },
    { label: "URL", count: invalidLinks, tone: "warn" },
    { label: "Нет ссылки", count: publishedWithoutLink, tone: "warn" },
  ].filter((signal) => signal.count > 0);

  return {
    total,
    ready,
    percent: getSharePercent(ready, total),
    signals,
  };
}

export function getPublicationReadinessMeta(checks = []) {
  const done = checks.filter((check) => check.done).length;
  const total = checks.length;
  return {
    done,
    total,
    isReady: total > 0 && done === total,
  };
}

export function getSignalClass(isActive, tone = "") {
  return [
    "analytics-surface",
    "analytics-content-plan-signal",
    tone,
    isActive ? "analytics-content-plan-signal-active" : "",
  ].filter(Boolean).join(" ");
}

export function getDateStateLabel(value) {
  return {
    overdue: "Просрочено",
    today: "Сегодня",
    upcoming: "По плану",
    neutral: "Без активного срока",
  }[value] || "По плану";
}

export function getContentPlanItemElementId(itemId) {
  return `content-plan-item-${itemId}`;
}

export function getCopyStats(item = {}) {
  const text = String(item.copy || "").trim();
  const chars = text.length;
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const isXOverLimit = item.channel === "X" && chars > 280;
  return {
    chars,
    words,
    isXOverLimit,
    label: `${chars} симв. / ${words} слов`,
  };
}
