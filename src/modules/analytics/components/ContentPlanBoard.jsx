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
const DATE_STATE_OPTIONS = ["Все", "Просрочено", "Сегодня", "По плану"];
const READINESS_OPTIONS = ["Все", "К публикации"];
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
  date: "",
  search: "",
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

function canPublishItem(item) {
  const isTextApproved = item.reviewStatus === "Проверено" || item.reviewStatus === "Можно публиковать";
  const isVisualApproved = item.visualStatus === "Визуал ок" || item.visualStatus === "Нет визуала";
  return isTextApproved && isVisualApproved;
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

function ContentPlanBoard() {
  const [items, setItems] = useState(readStoredItems);
  const [newItem, setNewItem] = useState(emptyItem);
  const [editingId, setEditingId] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [expandedIds, setExpandedIds] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [saveState, setSaveState] = useState("Сохранено");
  const localTouchedRef = useRef(false);
  const saveTimerRef = useRef(null);
  const saveVersionRef = useRef(0);
  const pendingServerSaveRef = useRef(null);

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
        if (updateBadge) setSaveState(ok ? "Сохранено" : "Локально");
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
      .filter((item) => {
        if (filters.dateState === "Все") return true;
        const state = getDateState(item.date, item.status);
        if (filters.dateState === "Просрочено") return state === "overdue";
        if (filters.dateState === "Сегодня") return state === "today";
        if (filters.dateState === "По плану") return state === "upcoming" || state === "neutral";
        return true;
      })
      .filter((item) => filters.readiness === "Все" || (canPublishItem(item) && item.status !== "Опубликовано"))
      .filter((item) => !filters.date || item.date === filters.date)
      .filter((item) => {
        if (!searchValue) return true;
        return [item.title, item.topicBlock, item.copy, item.comment, item.adminComment, item.visualBrief, item.visualLink].some((value) => String(value || "").toLowerCase().includes(searchValue));
      })
      .sort((a, b) => (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99"));
  }, [filters, items]);

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
    const overdue = activeItems.filter((item) => item.date && item.date < today).length;
    const todayItems = activeItems.filter((item) => item.date === today).length;
    const nextItems = activeItems
      .filter((item) => item.date && item.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);

    return {
      total: items.length,
      review: items.filter((item) => item.status === "На вычитке").length,
      approved: items.filter((item) => item.reviewStatus === "Проверено" || item.reviewStatus === "Можно публиковать").length,
      needsRevision: items.filter((item) => item.reviewStatus === "Нужны правки").length,
      visualReady: items.filter((item) => item.visualStatus === "Визуал ок").length,
      publishReady: items.filter((item) => canPublishItem(item) && item.status !== "Опубликовано").length,
      channels: new Set(items.map((item) => item.channel)).size,
      reviewProgress: getReviewProgress(items),
      overdue,
      todayItems,
      nextItems,
      highPriority: activeItems.filter((item) => item.priority === "Высокий").length,
      withoutOwner: activeItems.filter((item) => !item.owner).length,
    };
  }, [items]);

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

  function persist(nextItems) {
    localTouchedRef.current = true;
    setSaveState("Сохраняю...");
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
          setSaveState(ok ? "Сохранено" : "Локально");
        }
      });
    }, 450);
  }

  function updateItems(updater) {
    setItems((current) => {
      const next = updater(current);
      persist(next);
      return next;
    });
  }

  function updateItem(itemId, patch) {
    updateItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  }

  function updateItemStatus(itemId, nextStatus) {
    const item = items.find((currentItem) => currentItem.id === itemId);
    if (nextStatus === "Опубликовано" && !canPublishItem(item || {})) {
      return;
    }

    const patch = { status: nextStatus };
    if (nextStatus === "На вычитке") patch.reviewStatus = "На согласовании";
    if (nextStatus === "Готово") patch.reviewStatus = "Проверено";
    if (nextStatus === "Опубликовано") patch.reviewStatus = "Можно публиковать";
    if (nextStatus === "Черновик" && item?.reviewStatus === "Проверено") patch.reviewStatus = "Готовится";
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
    };
    updateItems((current) => [item, ...current]);
    setNewItem(emptyItem);
  }

  function removeItem(itemId) {
    updateItems((current) => current.filter((item) => item.id !== itemId));
    setPendingDeleteId("");
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
    updateItem(itemId, { status: "Готово", reviewStatus: "Проверено" });
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
    if (!canPublishItem(item || {})) return;
    updateItem(itemId, { status: "Опубликовано", reviewStatus: "Можно публиковать" });
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
        </div>
        <div className="analytics-content-plan-stats">
          <span><strong>{dashboard.total}</strong> карточек</span>
          <span><strong>{dashboard.review}</strong> на вычитке</span>
          <span><strong>{dashboard.approved}</strong> проверено</span>
          <span><strong>{dashboard.visualReady}</strong> визуал ok</span>
          <span><strong>{dashboard.publishReady}</strong> к публикации</span>
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
        <article className="analytics-surface analytics-content-plan-next">
          <span>Ближайшие публикации</span>
          {dashboard.nextItems.length ? dashboard.nextItems.map((item) => (
            <div key={item.id}>
              <strong>{formatPlanDate(item.date)}</strong>
              <small>{item.channel} / {item.title}</small>
            </div>
          )) : <small>Ближайшие даты не назначены.</small>}
        </article>
      </div>

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
        <span className="analytics-product-library-save">{saveState}</span>
      </div>

      <div className="analytics-surface analytics-content-plan-resultbar">
        <div>
          <span>Показано</span>
          <strong>{filteredItems.length} из {items.length}</strong>
          <small>{activeFilterChips.length ? "Работает выбранный срез контент-плана" : "Все карточки без дополнительных фильтров"}</small>
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
          <input className="analytics-launch-input analytics-content-plan-wide" value={newItem.visualLink} onChange={(event) => setNewItem((current) => ({ ...current, visualLink: event.target.value }))} placeholder="Ссылка на визуал / макет / файл" />
          <textarea className="analytics-launch-input analytics-content-plan-wide" rows="3" value={newItem.copy} onChange={(event) => setNewItem((current) => ({ ...current, copy: event.target.value }))} placeholder="Финальный текст / сценарий / тезисы" />
          <textarea className="analytics-launch-input analytics-content-plan-wide" rows="2" value={newItem.comment} onChange={(event) => setNewItem((current) => ({ ...current, comment: event.target.value }))} placeholder="Рабочий комментарий автора / SMM" />
          <textarea className="analytics-launch-input analytics-content-plan-wide" rows="2" value={newItem.adminComment} onChange={(event) => setNewItem((current) => ({ ...current, adminComment: event.target.value }))} placeholder="Админ-комментарий: что исправить перед публикацией" />
          <button type="button" className="analytics-content-plan-add-btn" onClick={addItem} disabled={!newItem.title.trim()}>
            Добавить
          </button>
        </div>
      </div>

      <div className="analytics-content-plan-timeline">
        {Object.entries(groupedItems).map(([dateKey, groupItems]) => (
          <section key={dateKey} className="analytics-content-plan-day">
            <div className="analytics-content-plan-day-head">
              <span>{formatPlanDate(dateKey === "Без даты" ? "" : dateKey)}</span>
              <strong>{groupItems.length} публикаций</strong>
            </div>
            <div className="analytics-content-plan-grid">
              {groupItems.map((item) => {
                const isEditing = editingId === item.id;
                const isExpanded = expandedIds.includes(item.id);
                const isPendingDelete = pendingDeleteId === item.id;
                return (
                  <article key={item.id} className="analytics-surface analytics-content-plan-card">
                    <div className="analytics-content-plan-card-top">
                      <div>
                        <span>{item.channel} / {item.format}</span>
                        {isEditing ? (
                          <input className="analytics-launch-input" value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} />
                        ) : (
                          <h3>{item.title}</h3>
                        )}
                      </div>
                      <select className={getStatusClass(item.status)} value={item.status} onChange={(event) => updateItemStatus(item.id, event.target.value)}>
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option} disabled={option === "Опубликовано" && !canPublishItem(item)}>
                            {option}
                          </option>
                        ))}
                      </select>
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
                        <input className="analytics-launch-input analytics-content-plan-wide" value={item.visualLink} onChange={(event) => updateItem(item.id, { visualLink: event.target.value })} placeholder="Ссылка на визуал / макет / файл" />
                        <textarea className="analytics-launch-input analytics-content-plan-wide" rows="5" value={item.copy} onChange={(event) => updateItem(item.id, { copy: event.target.value })} placeholder="Финальный текст / сценарий" />
                        <textarea className="analytics-launch-input analytics-content-plan-wide" rows="3" value={item.comment} onChange={(event) => updateItem(item.id, { comment: event.target.value })} placeholder="Рабочий комментарий автора / SMM" />
                        <textarea className="analytics-launch-input analytics-content-plan-wide" rows="3" value={item.adminComment} onChange={(event) => updateItem(item.id, { adminComment: event.target.value })} placeholder="Админ-комментарий: что исправить перед публикацией" />
                      </div>
                    ) : (
                      <>
                        <div className="analytics-content-plan-meta">
                          <span><b>Этап</b>{item.stage}</span>
                          <span><b>Блок</b>{item.topicBlock || "Без блока"}</span>
                          <span className="analytics-content-plan-review-badge"><b>Проверка</b>{item.reviewStatus}</span>
                          <span><b>Визуал</b>{item.visualStatus}</span>
                          <span><b>Приоритет</b>{item.priority || "Средний"}</span>
                          <span><b>Срок</b>{getDateStateLabel(getDateState(item.date, item.status))}</span>
                          <span><b>Owner</b>{item.owner || "Не назначен"}</span>
                        </div>
                        {item.visualBrief || item.visualLink ? (
                          <div className="analytics-content-plan-visual">
                            <strong>Визуал</strong>
                            {item.visualBrief ? <span>{item.visualBrief}</span> : null}
                            {item.visualLink ? <a href={item.visualLink} target="_blank" rel="noreferrer">Открыть макет / файл</a> : null}
                          </div>
                        ) : null}
                        {isExpanded ? <p>{item.copy || "Текст пока не добавлен."}</p> : null}
                        {item.comment ? <small>{item.comment}</small> : null}
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
                      <button type="button" onClick={() => publishItem(item.id)} disabled={!canPublishItem(item)}>Опубликовано</button>
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
        ))}
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
