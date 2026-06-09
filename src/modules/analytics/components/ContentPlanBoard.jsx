import { useEffect, useMemo, useRef, useState } from "react";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const CONTENT_PLAN_STORAGE_KEY = "atlas.analytics.contentPlan.v1";

const SOCIAL_OPTIONS = ["Все каналы", "Telegram", "Instagram", "X", "TikTok", "YouTube", "Facebook"];
const FORMAT_OPTIONS = ["Пост", "Карусель", "Рилс", "Видео", "Сторис", "Еженедельная рубрика"];
const STAGE_OPTIONS = ["До запуска", "После запуска", "Еженедельно", "Идеи"];
const STATUS_OPTIONS = ["Идея", "Черновик", "На вычитке", "Готово", "Опубликовано", "На паузе"];
const PRIORITY_OPTIONS = ["Высокий", "Средний", "Низкий"];
const REVIEW_OPTIONS = ["Готовится", "На согласовании", "Нужны правки", "Проверено", "Можно публиковать"];
const VISUAL_OPTIONS = ["Нет визуала", "Визуал готовится", "Визуал на проверке", "Визуал ок"];
const DATE_STATE_OPTIONS = ["Все", "Просрочено", "Сегодня", "По плану", "Без даты"];
const READINESS_OPTIONS = ["Все", "К публикации"];
const NEXT_ACTION_OPTIONS = ["Все", "Назначить дату", "Дописать текст", "Отправить на вычитку", "Доработать текст", "Согласовать визуал", "Публиковать", "Уже опубликовано"];
const LINK_ISSUE_OPTIONS = ["Все", "Некорректный URL", "Некорректная ссылка визуала", "Некорректная ссылка публикации", "Опубликовано без ссылки", "Опубликовано без даты", "Дата публикации в будущем"];
const DEFAULT_FILTERS = {
  channel: "Все",
  stage: "Все",
  format: "Все",
  status: "Все",
  reviewStatus: "Все",
  priority: "Все",
  owner: "Все",
  dateState: "Все",
  readiness: "Все",
  nextAction: "Все",
  copyIssue: "Все",
  visualIssue: "Все",
  linkIssue: "Все",
  duplicateIssue: "Все",
  revisionIssue: "Все",
  date: "",
  search: "",
};
const SAVE_STATE_META = {
  idle: {
    label: "Сохранено",
    detail: "Локальная копия готова",
    tone: "ok",
  },
  saving: {
    label: "Сохраняю...",
    detail: "Отправляю изменения на сервер",
    tone: "saving",
  },
  saved: {
    label: "Сохранено на сервере",
    detail: "Команда увидит последние правки",
    tone: "ok",
  },
  local: {
    label: "Сохранено локально",
    detail: "Сервер не ответил, можно повторить",
    tone: "warn",
  },
};

const defaultContentPlanItems = [
  {
    id: "atlas-pre-world-changes-1",
    date: "2026-05-29",
    stage: "До запуска",
    channel: "Instagram",
    format: "Рилс",
    topicBlock: "Мир меняется",
    title: "Эпоха одиночек заканчивается",
    status: "Черновик",
    reviewStatus: "Готовится",
    visualStatus: "Визуал готовится",
    priority: "Высокий",
    owner: "SMM",
    visualBrief: "Рилс: человек в информационном шуме, затем появляются линии связей, сообщество и аккуратный финальный кадр с Atlas.",
    visualLink: "",
    copy: "Хук: «Мир становится сложнее, и одиночных решений все чаще недостаточно». Сценарий: человек в информационном шуме, поток новостей и технологий. Затем появляются связи между людьми, сеть, сообщество и логотип Atlas.",
    comment: "Прогрев до запуска. Визуал: человек в информационном шуме → появляются связи → формируется сообщество Atlas. Без депрессии, паники и образов «краха мира».",
    adminComment: "Убрать чрезмерную драму, сделать сильный, но спокойный запусковый тон.",
  },
  {
    id: "atlas-pre-ecosystem-1",
    date: "2026-05-31",
    stage: "До запуска",
    channel: "Все каналы",
    format: "Карусель",
    topicBlock: "Экосистема",
    title: "Atlas — это не один продукт",
    status: "На вычитке",
    reviewStatus: "На согласовании",
    visualStatus: "Визуал на проверке",
    priority: "Высокий",
    owner: "Контент",
    visualBrief: "Карусель в фирменном стиле: Smart Cycle как фундамент, вокруг него документы, сообщество, голосования и инфраструктура.",
    visualLink: "",
    copy: "Atlas — это не один продукт, а экосистема. Smart Cycle является фундаментом, вокруг которого развиваются продукты, инструменты, механики, вдохновленные DAO, отдельные элементы голосования и инфраструктура для международного сообщества.",
    comment: "Базовый пост-знакомство. Не перечислять будущие продукты как уже запущенные. Не создавать впечатление, что Atlas уже является полноценной DAO.",
    adminComment: "",
  },
  {
    id: "atlas-pre-smart-contract-1",
    date: "2026-06-02",
    stage: "До запуска",
    channel: "Telegram",
    format: "Пост",
    topicBlock: "Что такое Smart Cycle",
    title: "Что делает смарт-контракт",
    status: "Черновик",
    reviewStatus: "Готовится",
    visualStatus: "Нет визуала",
    priority: "Высокий",
    owner: "Контент",
    visualBrief: "Схема: кошелек, смарт-контракт, запись операции в блокчейн. Без перегруженной технической графики.",
    visualLink: "",
    copy: "Смарт-контракт — это программный код, в котором заранее описаны правила работы системы. Он автоматически исполняет заданную on-chain логику. При этом отдельные элементы Atlas, включая часть партнерской инфраструктуры, могут обслуживаться вне смарт-контракта и раскрываются отдельно.",
    comment: "Хороший обучающий пост для Telegram и Facebook. Важно не писать, что все процессы Atlas полностью on-chain.",
    adminComment: "",
  },
  {
    id: "atlas-pre-transparency-1",
    date: "2026-06-05",
    stage: "До запуска",
    channel: "X",
    format: "Пост",
    topicBlock: "Кто такие Atlas",
    title: "Прозрачность — это не слоган",
    status: "Черновик",
    priority: "Средний",
    owner: "SMM",
    copy: "Доверие становится сильнее, когда строится не на обещаниях, а на понятных правилах и прозрачной архитектуре. Для Atlas прозрачность — это не маркетинговый слоган, а часть подхода к системе.",
    comment: "Сделать короткий тред в X и отдельный RU-пост. Добавить ссылку на Security Review / Transparency Center, если публикация выходит после готовности раздела.",
  },
  {
    id: "atlas-pre-foundation-1",
    date: "2026-06-07",
    stage: "До запуска",
    channel: "Instagram",
    format: "Карусель",
    topicBlock: "Устройство системы",
    title: "На чем построен Atlas",
    status: "Идея",
    priority: "Средний",
    owner: "Дизайн + контент",
    copy: "Карусель про четыре принципа: Web3, смарт-контракты, механики, вдохновленные DAO, и прозрачность. Финал: вместе эти элементы формируют фундамент Atlas.",
    comment: "В PDF есть готовая структура слайдов. Нужен визуал с 4 принципами.",
  },
  {
    id: "atlas-pre-why-created-1",
    date: "2026-06-09",
    stage: "До запуска",
    channel: "Все каналы",
    format: "Карусель",
    topicBlock: "Кто такие Atlas",
    title: "Почему появился Atlas",
    status: "Идея",
    priority: "Средний",
    owner: "Контент",
    copy: "Atlas появился потому, что мир изменился. Новые технологии позволяют строить системы не на обещаниях, а на понятных правилах, прозрачной архитектуре и участии сообщества.",
    comment: "Сделать RU/EN версии. Тон: спокойно, без драматичного «старый мир умер».",
  },
  {
    id: "atlas-post-live-system-1",
    date: "2026-06-12",
    stage: "После запуска",
    channel: "Telegram",
    format: "Пост",
    topicBlock: "Живая система",
    title: "Atlas после запуска: где следить за обновлениями",
    status: "Идея",
    priority: "Высокий",
    owner: "SMM",
    copy: "Показать официальные каналы, первые открытые материалы, статус системы, раздел Security Review и правила участия. Фокус на фактах, а не на обещаниях.",
    comment: "Использовать после реального запуска. Не обещать результат, доходность или гарантированный возврат.",
  },
  {
    id: "atlas-post-smart-cycle-60",
    date: "2026-06-13",
    stage: "После запуска",
    channel: "TikTok",
    format: "Видео",
    topicBlock: "Как это работает",
    title: "Что такое Smart Cycle за 60 секунд",
    status: "Идея",
    priority: "Высокий",
    owner: "Видео",
    copy: "Короткое объяснение: участник подключает кошелек, изучает правила цикла, подтверждает действие, а операции фиксируются в блокчейне. Без обещаний дохода, гарантий возврата или формулировок «заработок».",
    comment: "Подходит для Reels, TikTok и Shorts. Нужен сильный хук в первые 2 секунды.",
  },
  {
    id: "atlas-post-community-1",
    date: "2026-06-14",
    stage: "После запуска",
    channel: "Instagram",
    format: "Карусель",
    topicBlock: "Сообщество",
    title: "Кто формирует международное ядро Atlas",
    status: "Идея",
    priority: "Средний",
    owner: "SMM",
    copy: "Показать роли сообщества: участники, лидеры, контент-команда, техническая команда и поддержка. Если указываем страны или цифры — только подтвержденные данные.",
    comment: "Тема из PDF. Не использовать неподтвержденные страны, цифры и заявления «уже строят» без фактов.",
  },
  {
    id: "atlas-weekly-architect",
    date: "2026-06-15",
    stage: "Еженедельно",
    channel: "YouTube",
    format: "Видео",
    topicBlock: "Еженедельные рубрики",
    title: "Обращение Архитектора",
    status: "Идея",
    priority: "Высокий",
    owner: "Видео",
    copy: "Новости, развитие, ответы на вопросы, что изменилось за неделю, какие материалы вышли, какие следующие шаги.",
    comment: "Повторяющаяся рубрика. Можно дублировать короткими нарезками в X/Instagram/TikTok.",
  },
  {
    id: "atlas-weekly-faq",
    date: "2026-06-16",
    stage: "Еженедельно",
    channel: "Telegram",
    format: "Пост",
    topicBlock: "Еженедельные рубрики",
    title: "FAQ недели: топ-5 вопросов аудитории",
    status: "Идея",
    priority: "Средний",
    owner: "Support + контент",
    copy: "Собрать 5 частых вопросов из чатов: кошелек, Smart Cycle, безопасность, Transport, партнерская программа и официальные ссылки.",
    comment: "Ответы брать только из FAQ, Legal Docs, Security Review и Audit Risk FAQ. По юридическим и security-темам не импровизировать.",
  },
  {
    id: "atlas-facebook-web3-1",
    date: "2026-06-18",
    stage: "Идеи",
    channel: "Facebook",
    format: "Пост",
    topicBlock: "Web3 и технологии",
    title: "Что такое Web3 простыми словами?",
    status: "Идея",
    priority: "Низкий",
    owner: "SMM",
    copy: "Объяснить Web3 простыми словами: прозрачность операций, самостоятельная проверка данных, подключение через кошелек и участие в цифровой инфраструктуре без лишнего технического перегруза.",
    comment: "Из PDF: блок тем для Facebook. Можно сделать серию образовательных постов.",
  },
  {
    id: "atlas-dao-clarity-1",
    date: "2026-06-19",
    stage: "До запуска",
    channel: "Telegram",
    format: "Пост",
    topicBlock: "DAO и governance",
    title: "Почему Atlas не называет себя полноценным DAO",
    status: "Идея",
    priority: "Высокий",
    owner: "Контент + Legal",
    copy: "Atlas не является полноценной DAO-системой в текущей версии. Проект использует отдельные механики, вдохновленные DAO: обсуждения, голосования, участие сообщества и прозрачность решений.",
    comment: "Важный пост для корректной терминологии. Согласовать с White Paper и Legal Docs.",
  },
  {
    id: "atlas-transport-disclosure-1",
    date: "2026-06-20",
    stage: "До запуска",
    channel: "Telegram",
    format: "Пост",
    topicBlock: "Security Review",
    title: "Что такое Transport и почему он раскрывается заранее",
    status: "Идея",
    priority: "Высокий",
    owner: "Security + контент",
    copy: "Transport — это привилегированный механизм Atlas Core V1 для обслуживания части партнерской логики. Он раскрывается в документации и Security Review, потому что участник должен понимать границы доверия в текущей архитектуре.",
    comment: "Использовать после согласования Audit Risk FAQ. Не смягчать риск, но писать профессионально: privileged function / administrative trust risk.",
  },
  {
    id: "atlas-verify-yourself-1",
    date: "2026-06-21",
    stage: "До запуска",
    channel: "Все каналы",
    format: "Карусель",
    topicBlock: "Прозрачность",
    title: "Как проверить Atlas самостоятельно",
    status: "Идея",
    priority: "Высокий",
    owner: "Контент + Security",
    copy: "Показать, где смотреть смарт-контракт, транзакции, Security Review, White Paper, Audit Risk FAQ и официальные соцсети Atlas. Главная мысль: доверие начинается с возможности проверить.",
    comment: "Сделать как практическую инструкцию, не как рекламный пост.",
  },
];

const emptyItem = {
  date: "",
  stage: "До запуска",
  channel: "Telegram",
  format: "Пост",
  topicBlock: "",
  title: "",
  status: "Идея",
  reviewStatus: "Готовится",
  visualStatus: "Нет визуала",
  priority: "Средний",
  owner: "",
  visualBrief: "",
  visualLink: "",
  copy: "",
  comment: "",
  adminComment: "",
  publishedAt: "",
  publishedUrl: "",
};

function normalizeItems(items) {
  return Array.isArray(items) ? items.map((item, index) => ({
    id: item.id || `content-plan-${Date.now()}-${index}`,
    date: item.date || "",
    stage: item.stage || "До запуска",
    channel: item.channel || "Telegram",
    format: item.format || "Пост",
    topicBlock: item.topicBlock || "",
    title: item.title || "",
    status: item.status || "Идея",
    reviewStatus: item.reviewStatus || (item.status === "На вычитке" ? "На согласовании" : item.status === "Готово" || item.status === "Опубликовано" ? "Проверено" : "Готовится"),
    visualStatus: item.visualStatus || "Нет визуала",
    priority: item.priority || "Средний",
    owner: item.owner || "",
    visualBrief: item.visualBrief || "",
    visualLink: item.visualLink || "",
    copy: item.copy || "",
    comment: item.comment || "",
    adminComment: item.adminComment || "",
    publishedAt: item.publishedAt || "",
    publishedUrl: item.publishedUrl || "",
  })) : normalizeItems(defaultContentPlanItems);
}

function getDefaultContentPlanItems() {
  return normalizeItems(defaultContentPlanItems);
}

function readStoredItems() {
  if (typeof window === "undefined") return getDefaultContentPlanItems();

  try {
    const saved = window.localStorage.getItem(CONTENT_PLAN_STORAGE_KEY);
    return saved ? normalizeItems(JSON.parse(saved)) : getDefaultContentPlanItems();
  } catch {
    return getDefaultContentPlanItems();
  }
}

function formatPlanDate(value) {
  if (!value) return "Без даты";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

function getTodayIso() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToIso(value, days) {
  const fallback = getTodayIso();
  const baseDate = new Date(`${value || fallback}T00:00:00`);
  const date = Number.isNaN(baseDate.getTime()) ? new Date(`${fallback}T00:00:00`) : baseDate;
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateState(dateValue, status) {
  if (!dateValue || status === "Опубликовано" || status === "Готово") return "neutral";
  const today = getTodayIso();
  if (dateValue < today) return "overdue";
  if (dateValue === today) return "today";
  return "upcoming";
}

function getStatusClass(status) {
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

function getReviewProgress(items) {
  if (!items.length) return 0;
  const approved = items.filter((item) => item.reviewStatus === "Проверено" || item.reviewStatus === "Можно публиковать" || item.status === "Опубликовано").length;
  return Math.round((approved / items.length) * 100);
}

function getSharePercent(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

function getQueueScore(item) {
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

function getQueueTone(item) {
  const dateState = getDateState(item.date, item.status);
  if (dateState === "overdue") return "danger";
  if (dateState === "today") return "accent";
  if (getNextActionLabel(item) === "Публиковать") return "ready";
  return "focus";
}

function getPublicationChecks(item) {
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

function canPublishItem(item = {}) {
  return getPublicationChecks(item).every((check) => check.done);
}

function getPublishBlockReason(item) {
  const failed = getPublicationChecks(item).find((check) => !check.done);
  return failed ? failed.detail : "готово к публикации";
}

function getNextActionLabel(item) {
  const failed = getPublicationChecks(item).find((check) => !check.done);
  if (!failed) return item.status === "Опубликовано" ? "Уже опубликовано" : "Публиковать";
  return {
    date: "Назначить дату",
    copy: "Дописать текст",
    review: item.reviewStatus === "Нужны правки" ? "Доработать текст" : "Отправить на вычитку",
    visual: "Согласовать визуал",
  }[failed.key] || failed.detail;
}

function hasTextValue(value) {
  return Boolean(String(value || "").trim());
}

function getContentPlanDuplicateKey(item = {}) {
  const date = String(item.date || "").trim();
  const channel = String(item.channel || "").trim().toLowerCase();
  const title = String(item.title || "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!date || !channel || !title) return "";
  return `${date}::${channel}::${title}`;
}

function getDuplicateContentPlanIds(items = []) {
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

function isValidHttpUrl(value) {
  const text = String(value || "").trim();
  if (!text) return true;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getUrlFieldWarning(value) {
  if (!hasTextValue(value) || isValidHttpUrl(value)) return "";
  return "Укажите полную ссылку с http:// или https://";
}

function getPublishedUrlStatus(value) {
  if (!hasTextValue(value)) return { label: "не заполнена", tone: "empty" };
  if (!isValidHttpUrl(value)) return { label: "некорректная ссылка", tone: "invalid" };
  return { label: String(value || "").trim(), tone: "valid" };
}

function getPublishedDateStatus(value) {
  if (!hasTextValue(value)) return { label: "не заполнена", tone: "empty" };
  return { label: formatPlanDate(value), tone: "valid" };
}

function hasInvalidContentPlanLink(item = {}) {
  return !isValidHttpUrl(item.visualLink) || !isValidHttpUrl(item.publishedUrl);
}

function needsRevisionComment(item = {}) {
  return item.reviewStatus === "Нужны правки" && !hasTextValue(item.adminComment);
}

function needsPublishedDate(item = {}) {
  return item.status === "Опубликовано" && !hasTextValue(item.publishedAt);
}

function hasFuturePublishedDate(item = {}) {
  return item.status === "Опубликовано" && hasTextValue(item.publishedAt) && item.publishedAt > getTodayIso();
}

function getQualitySignals(item, copyStats, isDuplicate = false) {
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

function getDayReadinessMeta(items = []) {
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

function getPublicationReadinessMeta(checks = []) {
  const done = checks.filter((check) => check.done).length;
  const total = checks.length;
  return {
    done,
    total,
    isReady: total > 0 && done === total,
  };
}

function getSignalClass(isActive, tone = "") {
  return [
    "analytics-surface",
    "analytics-content-plan-signal",
    tone,
    isActive ? "analytics-content-plan-signal-active" : "",
  ].filter(Boolean).join(" ");
}

function getDateStateLabel(value) {
  return {
    overdue: "Просрочено",
    today: "Сегодня",
    upcoming: "По плану",
    neutral: "Без активного срока",
  }[value] || "По плану";
}

function getContentPlanItemElementId(itemId) {
  return `content-plan-item-${itemId}`;
}

function getCopyStats(item = {}) {
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

function ContentPlanBoard() {
  const [items, setItems] = useState(readStoredItems);
  const [newItem, setNewItem] = useState(emptyItem);
  const [editingId, setEditingId] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [recentlyDeletedItem, setRecentlyDeletedItem] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [saveState, setSaveState] = useState("idle");
  const [copiedItemId, setCopiedItemId] = useState("");
  const [copiedBriefItemId, setCopiedBriefItemId] = useState("");
  const [copiedPackageItemId, setCopiedPackageItemId] = useState("");
  const [copiedDayKey, setCopiedDayKey] = useState("");
  const [copiedSlice, setCopiedSlice] = useState(false);
  const [copiedAudit, setCopiedAudit] = useState(false);
  const [copiedPublishedReport, setCopiedPublishedReport] = useState(false);
  const [copiedTaskList, setCopiedTaskList] = useState(false);
  const [copiedRevisionSlice, setCopiedRevisionSlice] = useState(false);
  const [copiedRevisionItemId, setCopiedRevisionItemId] = useState("");
  const [copiedLinkItemId, setCopiedLinkItemId] = useState("");
  const [shiftedDateItemId, setShiftedDateItemId] = useState("");
  const [pendingPublishWithoutLinkId, setPendingPublishWithoutLinkId] = useState("");
  const [targetItemId, setTargetItemId] = useState("");
  const duplicateItemIds = useMemo(() => getDuplicateContentPlanIds(items), [items]);
  const localTouchedRef = useRef(false);
  const deepLinkHandledRef = useRef(false);
  const saveTimerRef = useRef(null);
  const saveVersionRef = useRef(0);
  const pendingServerSaveRef = useRef(null);
  const copyTimerRef = useRef(null);
  const briefCopyTimerRef = useRef(null);
  const packageCopyTimerRef = useRef(null);
  const dayCopyTimerRef = useRef(null);
  const sliceCopyTimerRef = useRef(null);
  const auditCopyTimerRef = useRef(null);
  const publishedReportCopyTimerRef = useRef(null);
  const taskListCopyTimerRef = useRef(null);
  const revisionSliceCopyTimerRef = useRef(null);
  const revisionCopyTimerRef = useRef(null);
  const linkCopyTimerRef = useRef(null);
  const shiftDateTimerRef = useRef(null);
  const publishConfirmTimerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    loadServerContent(CONTENT_PLAN_STORAGE_KEY).then((savedItems) => {
      if (isMounted && Array.isArray(savedItems) && !localTouchedRef.current) setItems(normalizeItems(savedItems));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function flushPendingSave({ updateBadge = true } = {}) {
      const pendingItems = pendingServerSaveRef.current;
      if (!pendingItems) return;
      pendingServerSaveRef.current = null;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveServerContent(CONTENT_PLAN_STORAGE_KEY, pendingItems).then((ok) => {
        pendingServerSaveRef.current = ok ? null : pendingItems;
        if (updateBadge) setSaveState(ok ? "saved" : "local");
      });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flushPendingSave();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flushPendingSave);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      flushPendingSave({ updateBadge: false });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flushPendingSave);
    };
  }, []);

  useEffect(() => () => {
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    if (briefCopyTimerRef.current) window.clearTimeout(briefCopyTimerRef.current);
    if (packageCopyTimerRef.current) window.clearTimeout(packageCopyTimerRef.current);
    if (dayCopyTimerRef.current) window.clearTimeout(dayCopyTimerRef.current);
    if (sliceCopyTimerRef.current) window.clearTimeout(sliceCopyTimerRef.current);
    if (auditCopyTimerRef.current) window.clearTimeout(auditCopyTimerRef.current);
    if (publishedReportCopyTimerRef.current) window.clearTimeout(publishedReportCopyTimerRef.current);
    if (taskListCopyTimerRef.current) window.clearTimeout(taskListCopyTimerRef.current);
    if (revisionSliceCopyTimerRef.current) window.clearTimeout(revisionSliceCopyTimerRef.current);
    if (revisionCopyTimerRef.current) window.clearTimeout(revisionCopyTimerRef.current);
    if (linkCopyTimerRef.current) window.clearTimeout(linkCopyTimerRef.current);
    if (shiftDateTimerRef.current) window.clearTimeout(shiftDateTimerRef.current);
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

  const dashboard = useMemo(() => {
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
  }, [duplicateItemIds, items]);

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

  const sliceHealth = useMemo(() => {
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
  }, [duplicateItemIds, filteredItems]);

  const publishedSliceItems = useMemo(() => {
    return filteredItems.filter((item) => item.status === "Опубликовано");
  }, [filteredItems]);

  const revisionSliceItems = useMemo(() => {
    return filteredItems.filter((item) => item.reviewStatus === "Нужны правки" || hasTextValue(item.adminComment));
  }, [filteredItems]);

  function persist(nextItems) {
    localTouchedRef.current = true;
    setSaveState("saving");
    try {
      window.localStorage.setItem(CONTENT_PLAN_STORAGE_KEY, JSON.stringify(nextItems));
    } catch {
      // Локальное сохранение не должно блокировать редактирование.
    }

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    const saveVersion = saveVersionRef.current + 1;
    saveVersionRef.current = saveVersion;
    pendingServerSaveRef.current = nextItems;

    saveTimerRef.current = window.setTimeout(() => {
      saveServerContent(CONTENT_PLAN_STORAGE_KEY, nextItems).then((ok) => {
        if (saveVersionRef.current === saveVersion) {
          pendingServerSaveRef.current = ok ? null : nextItems;
          setSaveState(ok ? "saved" : "local");
        }
      });
    }, 450);
  }

  function retryServerSave() {
    const pendingItems = pendingServerSaveRef.current || items;
    if (!pendingItems) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    pendingServerSaveRef.current = pendingItems;
    const saveVersion = saveVersionRef.current + 1;
    saveVersionRef.current = saveVersion;
    setSaveState("saving");
    saveServerContent(CONTENT_PLAN_STORAGE_KEY, pendingItems).then((ok) => {
      if (saveVersionRef.current !== saveVersion) return;
      pendingServerSaveRef.current = ok ? null : pendingItems;
      setSaveState(ok ? "saved" : "local");
    });
  }

  function updateItems(updater) {
    setItems((current) => {
      const next = updater(current);
      persist(next);
      return next;
    });
  }

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

  function markItemCopied(itemId) {
    setCopiedItemId(itemId);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopiedItemId(""), 1800);
  }

  function markBriefCopied(itemId) {
    setCopiedBriefItemId(itemId);
    if (briefCopyTimerRef.current) window.clearTimeout(briefCopyTimerRef.current);
    briefCopyTimerRef.current = window.setTimeout(() => setCopiedBriefItemId(""), 1800);
  }

  function markPackageCopied(itemId) {
    setCopiedPackageItemId(itemId);
    if (packageCopyTimerRef.current) window.clearTimeout(packageCopyTimerRef.current);
    packageCopyTimerRef.current = window.setTimeout(() => setCopiedPackageItemId(""), 1800);
  }

  function markDayCopied(dayKey) {
    setCopiedDayKey(dayKey);
    if (dayCopyTimerRef.current) window.clearTimeout(dayCopyTimerRef.current);
    dayCopyTimerRef.current = window.setTimeout(() => setCopiedDayKey(""), 1800);
  }

  function markSliceCopied() {
    setCopiedSlice(true);
    if (sliceCopyTimerRef.current) window.clearTimeout(sliceCopyTimerRef.current);
    sliceCopyTimerRef.current = window.setTimeout(() => setCopiedSlice(false), 1800);
  }

  function markAuditCopied() {
    setCopiedAudit(true);
    if (auditCopyTimerRef.current) window.clearTimeout(auditCopyTimerRef.current);
    auditCopyTimerRef.current = window.setTimeout(() => setCopiedAudit(false), 3000);
  }

  function markPublishedReportCopied() {
    setCopiedPublishedReport(true);
    if (publishedReportCopyTimerRef.current) window.clearTimeout(publishedReportCopyTimerRef.current);
    publishedReportCopyTimerRef.current = window.setTimeout(() => setCopiedPublishedReport(false), 2200);
  }

  function markTaskListCopied() {
    setCopiedTaskList(true);
    if (taskListCopyTimerRef.current) window.clearTimeout(taskListCopyTimerRef.current);
    taskListCopyTimerRef.current = window.setTimeout(() => setCopiedTaskList(false), 1800);
  }

  function markRevisionSliceCopied() {
    setCopiedRevisionSlice(true);
    if (revisionSliceCopyTimerRef.current) window.clearTimeout(revisionSliceCopyTimerRef.current);
    revisionSliceCopyTimerRef.current = window.setTimeout(() => setCopiedRevisionSlice(false), 2200);
  }

  function markRevisionCopied(itemId) {
    setCopiedRevisionItemId(itemId);
    if (revisionCopyTimerRef.current) window.clearTimeout(revisionCopyTimerRef.current);
    revisionCopyTimerRef.current = window.setTimeout(() => setCopiedRevisionItemId(""), 1800);
  }

  function markItemLinkCopied(itemId) {
    setCopiedLinkItemId(itemId);
    if (linkCopyTimerRef.current) window.clearTimeout(linkCopyTimerRef.current);
    linkCopyTimerRef.current = window.setTimeout(() => setCopiedLinkItemId(""), 1800);
  }

  function markDateShifted(itemId) {
    setShiftedDateItemId(itemId);
    if (shiftDateTimerRef.current) window.clearTimeout(shiftDateTimerRef.current);
    shiftDateTimerRef.current = window.setTimeout(() => setShiftedDateItemId(""), 1800);
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
        .then(() => markItemCopied(item.id))
        .catch(() => fallbackCopyValue(text, () => markItemCopied(item.id)));
      return;
    }
    fallbackCopyValue(text, () => markItemCopied(item.id));
  }

  function copyVisualBrief(item) {
    const brief = String(item.visualBrief || "").trim();
    if (!brief) return;
    const parts = [
      `ТЗ на визуал: ${item.title || "Без названия"}`,
      "",
      brief,
    ];
    const visualLink = String(item.visualLink || "").trim();
    if (visualLink) parts.push("", `Макет / файл: ${visualLink}`);
    const text = parts.join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => markBriefCopied(item.id))
        .catch(() => fallbackCopyValue(text, () => markBriefCopied(item.id)));
      return;
    }
    fallbackCopyValue(text, () => markBriefCopied(item.id));
  }

  function buildPublishPackageText(item) {
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
      `Статус: можно публиковать`,
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

  function copyPublishPackage(item) {
    if (!canPublishItem(item)) return;
    const text = buildPublishPackageText(item);
    markPackageCopied(item.id);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, () => markPackageCopied(item.id)));
      return;
    }
    fallbackCopyValue(text, () => markPackageCopied(item.id));
  }

  function copyDayPublishPackage(dayKey, groupItems) {
    const readyItems = groupItems.filter((item) => canPublishItem(item) && item.status !== "Опубликовано");
    if (!readyItems.length) return;
    const text = [
      `Пакет публикаций на день: ${formatPlanDate(dayKey === "Без даты" ? "" : dayKey)}`,
      `Готово к публикации: ${readyItems.length}`,
      "",
      readyItems.map((item, index) => [`#${index + 1}`, buildPublishPackageText(item)].join("\n")).join("\n\n---\n\n"),
    ].join("\n");
    markDayCopied(dayKey);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, () => markDayCopied(dayKey)));
      return;
    }
    fallbackCopyValue(text, () => markDayCopied(dayKey));
  }

  function copyCurrentSlice() {
    if (!filteredItems.length) return;
    const filterLine = activeFilterChips.length
      ? activeFilterChips.map((chip) => `${chip.label}: ${chip.value}`).join("; ")
      : "без фильтров";
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
    const text = [
      "Срез контент-плана Atlas",
      `Фильтры: ${filterLine}`,
      `Карточек: ${filteredItems.length} из ${items.length}`,
      "",
      rows.join("\n\n"),
    ].join("\n");
    markSliceCopied();
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, markSliceCopied));
      return;
    }
    fallbackCopyValue(text, markSliceCopied);
  }

  function copyCurrentTaskList() {
    if (filters.nextAction === "Все" || !filteredItems.length) return;
    const rows = filteredItems.map((item, index) => [
      `${index + 1}. ${item.title || "Без названия"}`,
      `Дата: ${formatPlanDate(item.date)}; канал: ${item.channel}; формат: ${item.format}`,
      `Ответственный: ${item.owner || "Не назначен"}; приоритет: ${item.priority || "Средний"}`,
    ].join("\n"));
    const text = [
      `Задачи контент-плана Atlas: ${filters.nextAction}`,
      `Количество: ${filteredItems.length}`,
      "",
      rows.join("\n\n"),
    ].join("\n");
    markTaskListCopied();
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, markTaskListCopied));
      return;
    }
    fallbackCopyValue(text, markTaskListCopied);
  }

  function copyCurrentAudit() {
    if (!filteredItems.length) return;
    const filterLine = activeFilterChips.length
      ? activeFilterChips.map((chip) => `${chip.label}: ${chip.value}`).join("; ")
      : "без фильтров";
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
    const text = [
      "Аудит среза контент-плана Atlas",
      `Фильтры: ${filterLine}`,
      `Карточек: ${sliceHealth.total}`,
      `Готово к публикации: ${sliceHealth.ready} (${sliceHealth.percent}%)`,
      `Проблемы: ${sliceHealth.signals.filter((signal) => signal.label !== "Готово").map((signal) => `${signal.label}: ${signal.count}`).join("; ")}`,
      "",
      issueRows.length ? "Карточки, требующие внимания:" : "Карточек с проблемами в срезе нет.",
      issueRows.join("\n\n"),
    ].filter(Boolean).join("\n");
    markAuditCopied();
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, markAuditCopied));
      return;
    }
    fallbackCopyValue(text, markAuditCopied);
  }

  function copyPublishedReport() {
    if (!publishedSliceItems.length) return;
    const filterLine = activeFilterChips.length
      ? activeFilterChips.map((chip) => `${chip.label}: ${chip.value}`).join("; ")
      : "без фильтров";
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
    const text = [
      "Отчет по опубликованному контенту Atlas",
      `Фильтры: ${filterLine}`,
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
    markPublishedReportCopied();
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, markPublishedReportCopied));
      return;
    }
    fallbackCopyValue(text, markPublishedReportCopied);
  }

  function copyRevisionRequest(item) {
    const text = buildRevisionRequestText(item);
    if (!text) return;
    markRevisionCopied(item.id);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, () => markRevisionCopied(item.id)));
      return;
    }
    fallbackCopyValue(text, () => markRevisionCopied(item.id));
  }

  function buildRevisionRequestText(item) {
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

  function copyCurrentRevisionPackage() {
    if (!revisionSliceItems.length) return;
    const filterLine = activeFilterChips.length
      ? activeFilterChips.map((chip) => `${chip.label}: ${chip.value}`).join("; ")
      : "без фильтров";
    const text = [
      "Пакет правок по контент-плану Atlas",
      `Фильтры: ${filterLine}`,
      `Карточек с правками: ${revisionSliceItems.length}`,
      "",
      revisionSliceItems.map((item, index) => [`#${index + 1}`, buildRevisionRequestText(item)].filter(Boolean).join("\n")).join("\n\n---\n\n"),
    ].join("\n");
    markRevisionSliceCopied();
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyValue(text, markRevisionSliceCopied));
      return;
    }
    fallbackCopyValue(text, markRevisionSliceCopied);
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
        .then(() => markItemLinkCopied(itemId))
        .catch(() => fallbackCopyValue(link, () => markItemLinkCopied(itemId)));
      return;
    }
    fallbackCopyValue(link, () => markItemLinkCopied(itemId));
  }

  function shiftItemDate(itemId, days) {
    const item = items.find((currentItem) => currentItem.id === itemId);
    if (!item || item.status === "Опубликовано") return;
    updateItem(itemId, { date: addDaysToIso(item.date, days) });
    markDateShifted(itemId);
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

  function isFocusActive(patch) {
    return Object.entries(patch).every(([key, value]) => filters[key] === value);
  }

  function clearFilter(filterKey) {
    setFilters((current) => ({ ...current, [filterKey]: DEFAULT_FILTERS[filterKey] }));
  }

  const saveMeta = SAVE_STATE_META[saveState] || SAVE_STATE_META.idle;

  return (
    <section className="analytics-content-plan">
      <div className="analytics-surface analytics-content-plan-hero">
        <div>
          <span className="analytics-kicker">Контент-план / BI-центр</span>
          <h2 className="analytics-agent-template-title">Редакционный центр Atlas</h2>
          <p className="analytics-page-subtitle">
            Автор готовит текст и визуал, администратор согласует карточку, после проверки публикация уходит в работу.
          </p>
          <div className="analytics-content-plan-coverage">
            <span>Покрытие проверки</span>
            <strong>{dashboard.reviewProgress}%</strong>
            <progress value={dashboard.reviewProgress} max="100" aria-label="Покрытие проверки контент-плана" />
          </div>
          <div className="analytics-content-plan-coverage analytics-content-plan-coverage-links">
            <span>Покрытие ссылок</span>
            <strong>{dashboard.publishedLinkProgress}%</strong>
            <progress value={dashboard.publishedLinkProgress} max="100" aria-label="Покрытие ссылок опубликованных постов" />
            <small>{dashboard.publishedWithLink} из {dashboard.published} опубликованных постов с валидной ссылкой</small>
            <div className="analytics-content-plan-coverage-actions" aria-label="Быстрые фильтры по ссылкам опубликованных постов">
              <button type="button" onClick={() => applyFocusFilter({ status: "Опубликовано", linkIssue: "Опубликовано без ссылки" })} disabled={!dashboard.publishedWithoutLink}>
                Без ссылки {dashboard.publishedWithoutLink}
              </button>
              <button type="button" onClick={() => applyFocusFilter({ status: "Опубликовано", linkIssue: "Некорректная ссылка публикации" })} disabled={!dashboard.publishedInvalidLink}>
                URL {dashboard.publishedInvalidLink}
              </button>
              <button type="button" onClick={() => applyFocusFilter({ status: "Опубликовано", linkIssue: "Опубликовано без даты" })} disabled={!dashboard.publishedWithoutDate}>
                Без даты {dashboard.publishedWithoutDate}
              </button>
              <button type="button" onClick={() => applyFocusFilter({ status: "Опубликовано", linkIssue: "Дата публикации в будущем" })} disabled={!dashboard.publishedFutureDate}>
                Будущая дата {dashboard.publishedFutureDate}
              </button>
              <button type="button" onClick={() => applyFocusFilter({ linkIssue: "Некорректная ссылка визуала" })} disabled={!dashboard.invalidVisualLinks}>
                Макет URL {dashboard.invalidVisualLinks}
              </button>
            </div>
          </div>
        </div>
        <div className="analytics-content-plan-stats">
          <span><strong>{dashboard.total}</strong> карточек</span>
          <span><strong>{dashboard.review}</strong> на вычитке</span>
          <span><strong>{dashboard.approved}</strong> проверено</span>
          <span><strong>{dashboard.visualReady}</strong> визуал ok</span>
          <span><strong>{dashboard.publishReady}</strong> к публикации</span>
          <span><strong>{dashboard.published}</strong> опубликовано</span>
        </div>
      </div>

      <div className="analytics-content-plan-command">
        <button
          type="button"
          className={getSignalClass(isFocusActive({ dateState: "Просрочено" }), "analytics-content-plan-signal-danger")}
          onClick={() => applyFocusFilter({ dateState: "Просрочено" })}
          aria-pressed={isFocusActive({ dateState: "Просрочено" })}
        >
          <span>Просрочено</span>
          <strong>{dashboard.overdue}</strong>
          <small>Нужна новая дата или статус</small>
        </button>
        <button
          type="button"
          className={getSignalClass(isFocusActive({ dateState: "Сегодня" }), "analytics-content-plan-signal-accent")}
          onClick={() => applyFocusFilter({ dateState: "Сегодня" })}
          aria-pressed={isFocusActive({ dateState: "Сегодня" })}
        >
          <span>Сегодня</span>
          <strong>{dashboard.todayItems}</strong>
          <small>Публикации на текущий день</small>
        </button>
        <button
          type="button"
          className={getSignalClass(isFocusActive({ dateState: "Без даты" }), "analytics-content-plan-signal-focus")}
          onClick={() => applyFocusFilter({ dateState: "Без даты" })}
          aria-pressed={isFocusActive({ dateState: "Без даты" })}
        >
          <span>Без даты</span>
          <strong>{dashboard.withoutDate}</strong>
          <small>Нужно назначить слот</small>
        </button>
        <button
          type="button"
          className={getSignalClass(isFocusActive({ copyIssue: "Без текста" }), "analytics-content-plan-signal-danger")}
          onClick={() => applyFocusFilter({ copyIssue: "Без текста" })}
          aria-pressed={isFocusActive({ copyIssue: "Без текста" })}
        >
          <span>Без текста</span>
          <strong>{dashboard.withoutCopy}</strong>
          <small>Нет финального copy</small>
        </button>
        <button
          type="button"
          className={getSignalClass(isFocusActive({ reviewStatus: "Нужны правки" }), "analytics-content-plan-signal-focus")}
          onClick={() => applyFocusFilter({ reviewStatus: "Нужны правки" })}
          aria-pressed={isFocusActive({ reviewStatus: "Нужны правки" })}
        >
          <span>Нужны правки</span>
          <strong>{dashboard.needsRevision}</strong>
          <small>Вернуть автору после комментария</small>
        </button>
        <button
          type="button"
          className={getSignalClass(isFocusActive({ revisionIssue: "Без комментария" }), "analytics-content-plan-signal-danger")}
          onClick={() => applyFocusFilter({ revisionIssue: "Без комментария" })}
          aria-pressed={isFocusActive({ revisionIssue: "Без комментария" })}
        >
          <span>Без комментария</span>
          <strong>{dashboard.revisionWithoutComment}</strong>
          <small>Автору нужно пояснение</small>
        </button>
        <button
          type="button"
          className={getSignalClass(isFocusActive({ nextAction: "Отправить на вычитку" }), "analytics-content-plan-signal-focus")}
          onClick={() => applyFocusFilter({ nextAction: "Отправить на вычитку" })}
          aria-pressed={isFocusActive({ nextAction: "Отправить на вычитку" })}
        >
          <span>На вычитку</span>
          <strong>{dashboard.sendToReview}</strong>
          <small>Текст есть, нужен редактор</small>
        </button>
        <button
          type="button"
          className={getSignalClass(isFocusActive({ priority: "Высокий" }))}
          onClick={() => applyFocusFilter({ priority: "Высокий" })}
          aria-pressed={isFocusActive({ priority: "Высокий" })}
        >
          <span>Высокий приоритет</span>
          <strong>{dashboard.highPriority}</strong>
          <small>То, что держит запуск</small>
        </button>
        <button
          type="button"
          className={getSignalClass(isFocusActive({ readiness: "К публикации" }), "analytics-content-plan-signal-ready")}
          onClick={() => applyFocusFilter({ readiness: "К публикации" })}
          aria-pressed={isFocusActive({ readiness: "К публикации" })}
        >
          <span>К публикации</span>
          <strong>{dashboard.publishReady}</strong>
          <small>Текст и визуал согласованы</small>
        </button>
        <button
          type="button"
          className={getSignalClass(isFocusActive({ copyIssue: "X > 280" }), "analytics-content-plan-signal-focus")}
          onClick={() => applyFocusFilter({ copyIssue: "X > 280" })}
          aria-pressed={isFocusActive({ copyIssue: "X > 280" })}
        >
          <span>X &gt; 280</span>
          <strong>{dashboard.xOverLimit}</strong>
          <small>Посты X нужно сократить</small>
        </button>
        <button
          type="button"
          className={getSignalClass(isFocusActive({ visualIssue: "Визуал не готов" }), "analytics-content-plan-signal-accent")}
          onClick={() => applyFocusFilter({ visualIssue: "Визуал не готов" })}
          aria-pressed={isFocusActive({ visualIssue: "Визуал не готов" })}
        >
          <span>Визуал не готов</span>
          <strong>{dashboard.visualIssue}</strong>
          <small>Готовится или ждёт проверки</small>
        </button>
        <button
          type="button"
          className={getSignalClass(isFocusActive({ duplicateIssue: "Найдены" }), "analytics-content-plan-signal-focus")}
          onClick={() => applyFocusFilter({ duplicateIssue: "Найдены" })}
          aria-pressed={isFocusActive({ duplicateIssue: "Найдены" })}
        >
          <span>Дубли</span>
          <strong>{dashboard.duplicateItems}</strong>
          <small>Та же дата, канал и заголовок</small>
        </button>
        <button
          type="button"
          className={getSignalClass(isFocusActive({ nextAction: "Согласовать визуал" }), "analytics-content-plan-signal-accent")}
          onClick={() => applyFocusFilter({ nextAction: "Согласовать визуал" })}
          aria-pressed={isFocusActive({ nextAction: "Согласовать визуал" })}
        >
          <span>Согласовать визуал</span>
          <strong>{dashboard.approveVisual}</strong>
          <small>Текст готов, визуал ждёт OK</small>
        </button>
        <button
          type="button"
          className={getSignalClass(isFocusActive({ owner: "Не назначен" }), "analytics-content-plan-signal-focus")}
          onClick={() => applyFocusFilter({ owner: "Не назначен" })}
          aria-pressed={isFocusActive({ owner: "Не назначен" })}
        >
          <span>Без ответственного</span>
          <strong>{dashboard.withoutOwner}</strong>
          <small>Нужно назначить владельца</small>
        </button>
        <article className="analytics-surface analytics-content-plan-next">
          <span>Ближайшие публикации</span>
          {dashboard.nextItems.length ? dashboard.nextItems.map((item) => (
            <button key={item.id} type="button" onClick={() => applyFocusFilter({ date: item.date })}>
              <strong>{formatPlanDate(item.date)}</strong>
              <small>{item.channel} / {item.title}</small>
            </button>
          )) : <small>Ближайшие даты не назначены.</small>}
        </article>
      </div>

      <div className="analytics-content-plan-bi-grid">
        <article className="analytics-surface analytics-content-plan-bi-panel">
          <div className="analytics-content-plan-bi-head">
            <span>Соцсети</span>
            <strong>{dashboard.channels} каналов</strong>
          </div>
          <div className="analytics-content-plan-bi-bars">
            {dashboard.channelMix.length ? dashboard.channelMix.map((entry) => (
              <button key={entry.label} type="button" onClick={() => applyFocusFilter({ channel: entry.label })}>
                <span>{entry.label}</span>
                <b>{entry.count}</b>
                <progress value={entry.percent} max="100" aria-label={`${entry.label}: ${entry.percent}%`} />
                <small>{entry.percent}%</small>
              </button>
            )) : <small>Карточки пока не добавлены.</small>}
          </div>
        </article>
        <article className="analytics-surface analytics-content-plan-bi-panel">
          <div className="analytics-content-plan-bi-head">
            <span>Производство</span>
            <strong>узкие места</strong>
          </div>
          <div className="analytics-content-plan-bi-bars analytics-content-plan-bi-bars-compact">
            {dashboard.bottleneckMix.map((entry) => (
              <button key={entry.label} type="button" className={`analytics-content-plan-bi-${entry.tone}`} onClick={() => {
                if (entry.label === "Без даты") applyFocusFilter({ dateState: "Без даты" });
                if (entry.label === "Без текста") applyFocusFilter({ copyIssue: "Без текста" });
                if (entry.label === "Правки") applyFocusFilter({ reviewStatus: "Нужны правки" });
                if (entry.label === "Без комментария") applyFocusFilter({ revisionIssue: "Без комментария" });
                if (entry.label === "Визуал") applyFocusFilter({ visualIssue: "Визуал не готов" });
                if (entry.label === "Дубли") applyFocusFilter({ duplicateIssue: "Найдены" });
                if (entry.label === "Готово") applyFocusFilter({ readiness: "К публикации" });
                if (entry.label === "URL") applyFocusFilter({ linkIssue: "Некорректный URL" });
                if (entry.label === "Нет ссылки") applyFocusFilter({ linkIssue: "Опубликовано без ссылки" });
                if (entry.label === "Нет даты публикации") applyFocusFilter({ linkIssue: "Опубликовано без даты" });
                if (entry.label === "Дата публикации будущая") applyFocusFilter({ linkIssue: "Дата публикации в будущем" });
              }}>
                <span>{entry.label}</span>
                <b>{entry.count}</b>
                <progress value={entry.percent} max="100" aria-label={`${entry.label}: ${entry.percent}%`} />
                <small>{entry.percent}%</small>
              </button>
            ))}
          </div>
        </article>
      </div>

      <article className="analytics-surface analytics-content-plan-queue">
        <div className="analytics-content-plan-bi-head">
          <span>Очередь редакции</span>
          <strong>{dashboard.queueItems.length ? "что делать первым" : "нет активных карточек"}</strong>
        </div>
        <div className="analytics-content-plan-queue-list">
          {dashboard.queueItems.length ? dashboard.queueItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`analytics-content-plan-queue-item analytics-content-plan-queue-${item.queueTone}`}
              onClick={() => {
                setTargetItemId(item.id);
                setExpandedIds((current) => (current.includes(item.id) ? current : [...current, item.id]));
                document.getElementById(getContentPlanItemElementId(item.id))?.scrollIntoView({ block: "center", behavior: "smooth" });
              }}
            >
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span>
                <strong>{item.title}</strong>
                <small>{item.channel} / {item.format} / {item.owner || "без ответственного"}</small>
              </span>
              <i>{item.queueAction}</i>
              <em>{item.date ? formatPlanDate(item.date) : "Без даты"}</em>
            </button>
          )) : <p>Все активные карточки закрыты или опубликованы.</p>}
        </div>
      </article>

      <div className="analytics-surface analytics-content-plan-controls">
        <div className="analytics-content-plan-filters">
          <label className="analytics-content-plan-search">
            <span>Поиск</span>
            <input className="analytics-launch-input" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Тема, блок, текст, комментарий" />
          </label>
          <label>
            <span>Соцсеть</span>
            <select className="analytics-launch-input" value={filters.channel} onChange={(event) => setFilters((current) => ({ ...current, channel: event.target.value }))}>
              <option value="Все">Все</option>
              {SOCIAL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Этап</span>
            <select className="analytics-launch-input" value={filters.stage} onChange={(event) => setFilters((current) => ({ ...current, stage: event.target.value }))}>
              <option value="Все">Все</option>
              {STAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Статус</span>
            <select className="analytics-launch-input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="Все">Все</option>
              {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Согласование</span>
            <select className="analytics-launch-input" value={filters.reviewStatus} onChange={(event) => setFilters((current) => ({ ...current, reviewStatus: event.target.value }))}>
              <option value="Все">Все</option>
              {REVIEW_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Приоритет</span>
            <select className="analytics-launch-input" value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
              <option value="Все">Все</option>
              {PRIORITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Срок</span>
            <select className="analytics-launch-input" value={filters.dateState} onChange={(event) => setFilters((current) => ({ ...current, dateState: event.target.value }))}>
              {DATE_STATE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Готовность</span>
            <select className="analytics-launch-input" value={filters.readiness} onChange={(event) => setFilters((current) => ({ ...current, readiness: event.target.value }))}>
              {READINESS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Следующий шаг</span>
            <select className="analytics-launch-input" value={filters.nextAction} onChange={(event) => setFilters((current) => ({ ...current, nextAction: event.target.value }))}>
              {NEXT_ACTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Ссылки</span>
            <select className="analytics-launch-input" value={filters.linkIssue} onChange={(event) => setFilters((current) => ({ ...current, linkIssue: event.target.value }))}>
              {LINK_ISSUE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Формат</span>
            <select className="analytics-launch-input" value={filters.format} onChange={(event) => setFilters((current) => ({ ...current, format: event.target.value }))}>
              <option value="Все">Все</option>
              {FORMAT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Дата</span>
            <input className="analytics-launch-input" type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} />
          </label>
          <label>
            <span>Ответственный</span>
            <select className="analytics-launch-input" value={filters.owner} onChange={(event) => setFilters((current) => ({ ...current, owner: event.target.value }))}>
              {ownerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <button type="button" className="analytics-content-plan-reset" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Сбросить
          </button>
        </div>
        <div className={`analytics-content-plan-save analytics-content-plan-save-${saveMeta.tone}`}>
          <span>{saveMeta.label}</span>
          <small>{saveMeta.detail}</small>
          {saveState === "local" ? <button type="button" onClick={retryServerSave}>Повторить</button> : null}
        </div>
      </div>

      <div className="analytics-surface analytics-content-plan-resultbar">
        <div>
          <span>Показано</span>
          <strong>{filteredItems.length} из {items.length}</strong>
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
              <button key={chip.key} type="button" onClick={() => clearFilter(chip.key)}>
                <span>{chip.label}</span>
                <strong>{chip.value}</strong>
              </button>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="analytics-content-plan-slice-copy"
          onClick={copyCurrentSlice}
          disabled={!filteredItems.length}
        >
          {copiedSlice ? "Срез скопирован" : "Скопировать срез"}
        </button>
        <button
          type="button"
          className="analytics-content-plan-audit-copy"
          onClick={copyCurrentAudit}
          disabled={!filteredItems.length}
        >
          {copiedAudit ? "Аудит скопирован" : "Аудит среза"}
        </button>
        <button
          type="button"
          className="analytics-content-plan-revision-slice-copy"
          onClick={copyCurrentRevisionPackage}
          disabled={!revisionSliceItems.length}
        >
          {copiedRevisionSlice ? "Правки скопированы" : "Пакет правок"}
        </button>
        <button
          type="button"
          className="analytics-content-plan-published-copy"
          onClick={copyPublishedReport}
          disabled={!publishedSliceItems.length}
        >
          {copiedPublishedReport ? "Отчет скопирован" : "Отчет публикаций"}
        </button>
        <button
          type="button"
          className="analytics-content-plan-task-copy"
          onClick={copyCurrentTaskList}
          disabled={filters.nextAction === "Все" || !filteredItems.length}
        >
          {copiedTaskList ? "Задачи скопированы" : "Скопировать задачи"}
        </button>
      </div>

      <div className="analytics-surface analytics-content-plan-form">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Добавить публикацию</span>
            <h3 className="analytics-section-title">Новая карточка контента</h3>
          </div>
        </div>
        <div className="analytics-content-plan-add-grid">
          <input className="analytics-launch-input" type="date" value={newItem.date} onChange={(event) => setNewItem((current) => ({ ...current, date: event.target.value }))} />
          <select className="analytics-launch-input" value={newItem.channel} onChange={(event) => setNewItem((current) => ({ ...current, channel: event.target.value }))}>
            {SOCIAL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className="analytics-launch-input" value={newItem.format} onChange={(event) => setNewItem((current) => ({ ...current, format: event.target.value }))}>
            {FORMAT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className="analytics-launch-input" value={newItem.stage} onChange={(event) => setNewItem((current) => ({ ...current, stage: event.target.value }))}>
            {STAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <input className="analytics-launch-input" value={newItem.topicBlock} onChange={(event) => setNewItem((current) => ({ ...current, topicBlock: event.target.value }))} placeholder="Блок: Smart Cycle, Web3..." />
          <input className="analytics-launch-input" value={newItem.title} onChange={(event) => setNewItem((current) => ({ ...current, title: event.target.value }))} placeholder="Тема публикации" />
          <select className="analytics-launch-input" value={newItem.status} onChange={(event) => setNewItem((current) => ({ ...current, status: event.target.value }))}>
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className="analytics-launch-input" value={newItem.reviewStatus} onChange={(event) => setNewItem((current) => ({ ...current, reviewStatus: event.target.value }))}>
            {REVIEW_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className="analytics-launch-input" value={newItem.visualStatus} onChange={(event) => setNewItem((current) => ({ ...current, visualStatus: event.target.value }))}>
            {VISUAL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className="analytics-launch-input" value={newItem.priority} onChange={(event) => setNewItem((current) => ({ ...current, priority: event.target.value }))}>
            {PRIORITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <input className="analytics-launch-input" value={newItem.owner} onChange={(event) => setNewItem((current) => ({ ...current, owner: event.target.value }))} placeholder="Ответственный" />
          <textarea className="analytics-launch-input analytics-content-plan-wide" rows="2" value={newItem.visualBrief} onChange={(event) => setNewItem((current) => ({ ...current, visualBrief: event.target.value }))} placeholder="Что должно быть на картинке / видео / обложке" />
          <label className="analytics-content-plan-url-field analytics-content-plan-wide">
            <input className="analytics-launch-input" value={newItem.visualLink} onChange={(event) => setNewItem((current) => ({ ...current, visualLink: event.target.value }))} placeholder="Ссылка на визуал / макет / файл" aria-invalid={Boolean(getUrlFieldWarning(newItem.visualLink))} />
            {getUrlFieldWarning(newItem.visualLink) ? <small>{getUrlFieldWarning(newItem.visualLink)}</small> : null}
          </label>
          <textarea className="analytics-launch-input analytics-content-plan-wide" rows="3" value={newItem.copy} onChange={(event) => setNewItem((current) => ({ ...current, copy: event.target.value }))} placeholder="Финальный текст / сценарий / тезисы" />
          <textarea className="analytics-launch-input analytics-content-plan-wide" rows="2" value={newItem.comment} onChange={(event) => setNewItem((current) => ({ ...current, comment: event.target.value }))} placeholder="Рабочий комментарий автора / SMM" />
          <textarea className="analytics-launch-input analytics-content-plan-wide" rows="2" value={newItem.adminComment} onChange={(event) => setNewItem((current) => ({ ...current, adminComment: event.target.value }))} placeholder="Админ-комментарий: что исправить перед публикацией" />
          <label className="analytics-content-plan-url-field analytics-content-plan-wide">
            <input className="analytics-launch-input" value={newItem.publishedUrl} onChange={(event) => setNewItem((current) => ({ ...current, publishedUrl: event.target.value }))} placeholder="Ссылка на опубликованный пост" aria-invalid={Boolean(getUrlFieldWarning(newItem.publishedUrl))} />
            {getUrlFieldWarning(newItem.publishedUrl) ? <small>{getUrlFieldWarning(newItem.publishedUrl)}</small> : null}
          </label>
          <button type="button" className="analytics-content-plan-add-btn" onClick={addItem} disabled={!newItem.title.trim()}>
            Добавить
          </button>
        </div>
      </div>

      {recentlyDeletedItem ? (
        <div className="analytics-surface analytics-content-plan-undo">
          <div>
            <span>Карточка удалена</span>
            <strong>{recentlyDeletedItem.item.title}</strong>
          </div>
          <button type="button" onClick={restoreRecentlyDeletedItem}>Восстановить</button>
        </div>
      ) : null}

      <div className="analytics-content-plan-timeline">
        {Object.entries(groupedItems).map(([dateKey, groupItems]) => {
          const readyCount = groupItems.filter((item) => canPublishItem(item) && item.status !== "Опубликовано").length;
          const revisionCount = groupItems.filter((item) => item.reviewStatus === "Нужны правки").length;
          const visualIssueCount = groupItems.filter((item) => item.visualStatus !== "Визуал ок" && item.visualStatus !== "Нет визуала").length;
          const dayReadiness = getDayReadinessMeta(groupItems);
          return (
            <section key={dateKey} className="analytics-content-plan-day">
              <div className="analytics-content-plan-day-head">
                <div>
                  <span>{formatPlanDate(dateKey === "Без даты" ? "" : dateKey)}</span>
                  <strong>{groupItems.length} публикаций</strong>
                  <strong className="analytics-content-plan-day-ready">{readyCount} к публикации</strong>
                  <strong className="analytics-content-plan-day-warn">{revisionCount} правки</strong>
                  <strong className="analytics-content-plan-day-visual">{visualIssueCount} визуал</strong>
                </div>
                <div className="analytics-content-plan-day-health">
                  <span>
                    <b>{dayReadiness.percent}%</b>
                    готовность дня
                  </span>
                  <progress value={dayReadiness.percent} max="100" aria-label={`Готовность дня ${dayReadiness.percent}%`} />
                  <small>
                    {dayReadiness.signals.length ? dayReadiness.signals.slice(0, 3).map((signal) => `${signal.label}: ${signal.count}`).join(" / ") : "замечаний нет"}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => copyDayPublishPackage(dateKey, groupItems)}
                  disabled={!readyCount}
                  title="Скопировать все готовые публикации за этот день"
                >
                  {copiedDayKey === dateKey ? "День скопирован" : "Пакет дня"}
                </button>
              </div>
              <div className="analytics-content-plan-grid">
              {groupItems.map((item) => {
                const isEditing = editingId === item.id;
                const isExpanded = expandedIds.includes(item.id);
                const isPendingDelete = pendingDeleteId === item.id;
                const publicationChecks = getPublicationChecks(item);
                const readinessMeta = getPublicationReadinessMeta(publicationChecks);
                const publishBlockReason = getPublishBlockReason(item);
                const nextActionLabel = getNextActionLabel(item);
                const copyStats = getCopyStats(item);
                const qualitySignals = getQualitySignals(item, copyStats, duplicateItemIds.has(item.id));
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
                    key={item.id}
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
                      <div className="analytics-content-plan-card-state">
                        <span
                          className={readinessMeta.isReady ? "analytics-content-plan-readiness analytics-content-plan-readiness-ready" : "analytics-content-plan-readiness analytics-content-plan-readiness-wait"}
                          title={`Готовность к публикации: ${readinessMeta.done} из ${readinessMeta.total}`}
                          aria-label={`Готовность к публикации: ${readinessMeta.done} из ${readinessMeta.total}`}
                        >
                          <b>Готовность</b>
                          {readinessMeta.done}/{readinessMeta.total}
                        </span>
                        <span className={readinessMeta.isReady ? "analytics-content-plan-blocker analytics-content-plan-blocker-ready" : "analytics-content-plan-blocker analytics-content-plan-blocker-wait"}>
                          {readinessMeta.isReady ? "Можно публиковать" : publishBlockReason}
                        </span>
                        <span className={readinessMeta.isReady ? "analytics-content-plan-next-action analytics-content-plan-next-action-ready" : "analytics-content-plan-next-action analytics-content-plan-next-action-wait"}>
                          <b>Шаг</b>{nextActionLabel}
                        </span>
                        <select className={getStatusClass(item.status)} value={item.status} onChange={(event) => updateItemStatus(item.id, event.target.value)}>
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option} disabled={option === "Опубликовано" && !canMarkPublished}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="analytics-content-plan-edit">
                        <input className="analytics-launch-input" type="date" value={item.date} onChange={(event) => updateItem(item.id, { date: event.target.value })} />
                        <select className="analytics-launch-input" value={item.channel} onChange={(event) => updateItem(item.id, { channel: event.target.value })}>
                          {SOCIAL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                        <select className="analytics-launch-input" value={item.format} onChange={(event) => updateItem(item.id, { format: event.target.value })}>
                          {FORMAT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                        <select className="analytics-launch-input" value={item.stage} onChange={(event) => updateItem(item.id, { stage: event.target.value })}>
                          {STAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                        <input className="analytics-launch-input" value={item.topicBlock} onChange={(event) => updateItem(item.id, { topicBlock: event.target.value })} placeholder="Блок" />
                        <select className="analytics-launch-input" value={item.reviewStatus} onChange={(event) => updateItem(item.id, { reviewStatus: event.target.value })}>
                          {REVIEW_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                        <select className="analytics-launch-input" value={item.visualStatus} onChange={(event) => updateItem(item.id, { visualStatus: event.target.value })}>
                          {VISUAL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                        <select className="analytics-launch-input" value={item.priority} onChange={(event) => updateItem(item.id, { priority: event.target.value })}>
                          {PRIORITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                        <input className="analytics-launch-input" value={item.owner} onChange={(event) => updateItem(item.id, { owner: event.target.value })} placeholder="Ответственный" />
                        <textarea className="analytics-launch-input analytics-content-plan-wide" rows="3" value={item.visualBrief} onChange={(event) => updateItem(item.id, { visualBrief: event.target.value })} placeholder="Визуал / картинка / видео" />
                        <label className="analytics-content-plan-url-field analytics-content-plan-wide">
                          <input className="analytics-launch-input" value={item.visualLink} onChange={(event) => updateItem(item.id, { visualLink: event.target.value })} placeholder="Ссылка на визуал / макет / файл" aria-invalid={Boolean(getUrlFieldWarning(item.visualLink))} />
                          {getUrlFieldWarning(item.visualLink) ? <small>{getUrlFieldWarning(item.visualLink)}</small> : null}
                        </label>
                        <textarea className="analytics-launch-input analytics-content-plan-wide" rows="5" value={item.copy} onChange={(event) => updateItem(item.id, { copy: event.target.value })} placeholder="Финальный текст / сценарий" />
                        <textarea className="analytics-launch-input analytics-content-plan-wide" rows="3" value={item.comment} onChange={(event) => updateItem(item.id, { comment: event.target.value })} placeholder="Рабочий комментарий автора / SMM" />
                        <textarea className="analytics-launch-input analytics-content-plan-wide" rows="3" value={item.adminComment} onChange={(event) => updateItem(item.id, { adminComment: event.target.value })} placeholder="Админ-комментарий: что исправить перед публикацией" />
                        <label className="analytics-content-plan-url-field analytics-content-plan-wide">
                          <input className="analytics-launch-input" value={item.publishedUrl || ""} onChange={(event) => updateItem(item.id, { publishedUrl: event.target.value })} placeholder="Ссылка на опубликованный пост" aria-invalid={Boolean(getUrlFieldWarning(item.publishedUrl))} />
                          {getUrlFieldWarning(item.publishedUrl) ? <small>{getUrlFieldWarning(item.publishedUrl)}</small> : null}
                        </label>
                        {item.status === "Опубликовано" ? (
                          <label className="analytics-content-plan-url-field analytics-content-plan-wide">
                            <input className="analytics-launch-input" type="date" value={item.publishedAt || ""} onChange={(event) => updateItem(item.id, { publishedAt: event.target.value })} aria-label="Дата фактической публикации" />
                            <small>Дата фактической публикации для отчётов</small>
                          </label>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        <div className="analytics-content-plan-quality" aria-label="Контроль качества карточки">
                          {qualitySignals.map((signal) => (
                            <span key={`${signal.label}-${signal.detail}`} className={`analytics-content-plan-quality-${signal.tone}`}>
                              <b>{signal.label}</b>
                              {signal.detail}
                            </span>
                          ))}
                        </div>
                        <div className="analytics-content-plan-meta">
                          <span><b>Этап</b>{item.stage}</span>
                          <span><b>Блок</b>{item.topicBlock || "Без блока"}</span>
                          <span className="analytics-content-plan-review-badge"><b>Проверка</b>{item.reviewStatus}</span>
                          <span><b>Визуал</b>{item.visualStatus}</span>
                          <span><b>Приоритет</b>{item.priority || "Средний"}</span>
                          <span><b>Срок</b>{getDateStateLabel(getDateState(item.date, item.status))}</span>
                          <span><b>Owner</b>{item.owner || "Не назначен"}</span>
                          {item.status === "Опубликовано" ? <span className="analytics-content-plan-published-meta"><b>Опубликовано</b>{formatPlanDate(item.publishedAt)}</span> : null}
                          {item.status === "Опубликовано" && hasTextValue(item.publishedUrl) && isValidHttpUrl(item.publishedUrl) ? (
                            <span className="analytics-content-plan-published-link-meta">
                              <b>Пост</b>
                              <a href={item.publishedUrl} target="_blank" rel="noreferrer">Открыть публикацию</a>
                            </span>
                          ) : null}
                          <span className={copyStats.isXOverLimit ? "analytics-content-plan-copy-stat analytics-content-plan-copy-stat-warn" : "analytics-content-plan-copy-stat"}>
                            <b>Объем</b>{copyStats.isXOverLimit ? `${copyStats.label} / X > 280` : copyStats.label}
                          </span>
                        </div>
                        {item.visualBrief || item.visualLink ? (
                          <div className="analytics-content-plan-visual">
                            <strong>Визуал</strong>
                            {item.visualBrief ? <span>{item.visualBrief}</span> : null}
                            {hasTextValue(item.visualLink) && isValidHttpUrl(item.visualLink) ? <a href={item.visualLink} target="_blank" rel="noreferrer">Открыть макет / файл</a> : null}
                          </div>
                        ) : null}
                        {isExpanded ? <p>{item.copy || "Текст пока не добавлен."}</p> : null}
                        {item.comment ? <small>{item.comment}</small> : null}
                        <div className="analytics-content-plan-publish-gate">
                          <strong>Гейт публикации</strong>
                          <div>
                            {publicationChecks.map((check) => (
                              <span key={check.key} className={check.done ? "analytics-content-plan-gate-ok" : "analytics-content-plan-gate-wait"}>
                                <b>{check.label}</b>
                                {check.detail}
                              </span>
                            ))}
                          </div>
                        </div>
                        <label className="analytics-content-plan-admin-note">
                          <strong>Комментарий администратора</strong>
                          <textarea className="analytics-launch-input analytics-content-plan-admin-input" rows="2" value={item.adminComment || ""} onChange={(event) => updateItem(item.id, { adminComment: event.target.value })} placeholder="Что исправить перед публикацией" />
                        </label>
                      </>
                    )}

                    <div className="analytics-content-plan-review-actions">
                      <button type="button" onClick={() => sendToReview(item.id)}>На вычитку</button>
                      <button type="button" onClick={() => requestRevision(item.id)} disabled={!String(item.adminComment || "").trim()}>Правки</button>
                      <button type="button" onClick={() => approveItem(item.id)}>Проверено</button>
                      <button type="button" onClick={() => approveVisual(item.id)}>Визуал OK</button>
                      <button
                        type="button"
                        className={isPublishWithoutLinkPending ? "analytics-content-plan-publish-confirm" : ""}
                        onClick={() => publishItem(item.id)}
                        disabled={!canMarkPublished}
                        title={publishButtonTitle}
                      >
                        {isPublishWithoutLinkPending ? "Подтвердить без ссылки" : "Опубликовано"}
                      </button>
                    </div>

                    <div className="analytics-content-plan-actions">
                      {!isEditing ? (
                        <button type="button" onClick={() => toggleExpanded(item.id)}>
                          {isExpanded ? "Скрыть текст" : "Показать текст"}
                        </button>
                      ) : null}
                      <button type="button" onClick={() => setEditingId(isEditing ? "" : item.id)}>
                        {isEditing ? "Готово" : "Редактировать"}
                      </button>
                      <button
                        type="button"
                        className="analytics-content-plan-link"
                        onClick={() => copyItemLink(item.id)}
                      >
                        {copiedLinkItemId === item.id ? "Ссылка скопирована" : "Ссылка"}
                      </button>
                      <button
                        type="button"
                        className="analytics-content-plan-copy"
                        onClick={() => copyItemText(item)}
                        disabled={!String(item.copy || "").trim()}
                      >
                        {copiedItemId === item.id ? "Скопировано" : "Копировать текст"}
                      </button>
                      <button
                        type="button"
                        className="analytics-content-plan-brief-copy"
                        onClick={() => copyVisualBrief(item)}
                        disabled={!String(item.visualBrief || "").trim()}
                      >
                        {copiedBriefItemId === item.id ? "ТЗ скопировано" : "Копировать ТЗ"}
                      </button>
                      <button
                        type="button"
                        className="analytics-content-plan-revision-copy"
                        onClick={() => copyRevisionRequest(item)}
                        disabled={!String(item.adminComment || "").trim()}
                      >
                        {copiedRevisionItemId === item.id ? "Правки скопированы" : "Копировать правки"}
                      </button>
                      <button
                        type="button"
                        className="analytics-content-plan-package-copy"
                        onClick={() => copyPublishPackage(item)}
                        disabled={!canPublishItem(item)}
                        title={canPublishItem(item) ? "Скопировать все данные для публикации" : getPublishBlockReason(item)}
                      >
                        {copiedPackageItemId === item.id ? "Пакет скопирован" : "Пакет к публикации"}
                      </button>
                      <button type="button" className="analytics-content-plan-duplicate" onClick={() => duplicateItem(item.id)}>
                        Дублировать
                      </button>
                      <button
                        type="button"
                        className="analytics-content-plan-shift-date"
                        onClick={() => shiftItemDate(item.id, -1)}
                        disabled={item.status === "Опубликовано"}
                        title={item.date ? `Перенести на ${formatPlanDate(addDaysToIso(item.date, -1))}` : `Назначить ${formatPlanDate(addDaysToIso("", -1))}`}
                      >
                        {shiftedDateItemId === item.id ? "Дата сдвинута" : "Дата -1"}
                      </button>
                      <button
                        type="button"
                        className="analytics-content-plan-shift-date"
                        onClick={() => shiftItemDate(item.id, 1)}
                        disabled={item.status === "Опубликовано"}
                        title={item.date ? `Перенести на ${formatPlanDate(addDaysToIso(item.date, 1))}` : `Назначить ${formatPlanDate(addDaysToIso("", 1))}`}
                      >
                        {shiftedDateItemId === item.id ? "Дата сдвинута" : "Дата +1"}
                      </button>
                      {isPendingDelete ? (
                        <>
                          <button type="button" className="analytics-content-plan-delete-confirm" onClick={() => removeItem(item.id)}>Точно удалить</button>
                          <button type="button" onClick={() => setPendingDeleteId("")}>Отмена</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => requestDelete(item.id)}>
                          Удалить
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              </div>
            </section>
          );
        })}
        {!filteredItems.length ? (
          <div className="analytics-surface analytics-content-plan-empty">
            Нет публикаций под выбранные фильтры.
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default ContentPlanBoard;
