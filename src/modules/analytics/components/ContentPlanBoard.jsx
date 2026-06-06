import { useEffect, useMemo, useState } from "react";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const CONTENT_PLAN_STORAGE_KEY = "atlas.analytics.contentPlan.v1";

const SOCIAL_OPTIONS = ["Все каналы", "Telegram", "Instagram", "X", "TikTok", "YouTube", "Facebook"];
const FORMAT_OPTIONS = ["Пост", "Карусель", "Рилс", "Видео", "Сторис", "Еженедельная рубрика"];
const STAGE_OPTIONS = ["До запуска", "После запуска", "Еженедельно", "Идеи"];
const STATUS_OPTIONS = ["Идея", "Черновик", "На вычитке", "Готово", "Опубликовано", "На паузе"];

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
    owner: "SMM",
    copy: "Первые 2 секунды: «Нас долго учили справляться со всем самостоятельно». Сценарий: человек один перед экраном, пустой офис, технологии, затем связи между людьми, сеть, сообщество, логотип Atlas.",
    comment: "Из PDF: прогрев до запуска. Хорошо подходит для Reels/TikTok/Shorts.",
  },
  {
    id: "atlas-pre-ecosystem-1",
    date: "2026-05-31",
    stage: "До запуска",
    channel: "Все каналы",
    format: "Карусель",
    topicBlock: "Экосистема",
    title: "Atlas - это не один продукт",
    status: "На вычитке",
    owner: "Content",
    copy: "Atlas - это экосистема, где Smart Cycle является фундаментом, а вокруг него развиваются продукты, инструменты и DAO-inspired mechanics. Сообщество является частью развития Atlas.",
    comment: "В PDF есть RU/EN варианты. Нужно вычитать термин «экосистема» и убрать повторы.",
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
    owner: "Content",
    copy: "Смарт-контракт - это программный код, в котором заранее определены правила работы системы. После запуска он автоматически выполняет заложенную логику, без ручного управления и посредников. Все действия фиксируются в блокчейне и могут быть проверены.",
    comment: "Из PDF. Хороший обучающий пост для Telegram и Facebook.",
  },
  {
    id: "atlas-pre-transparency-1",
    date: "2026-06-05",
    stage: "До запуска",
    channel: "X",
    format: "Пост",
    topicBlock: "Кто такие Atlas",
    title: "Прозрачность - это не слоган",
    status: "Черновик",
    owner: "SMM",
    copy: "Trust becomes stronger when it is built on clear rules and transparent system architecture. For Atlas, transparency is not a marketing slogan. It is part of the architecture.",
    comment: "Можно сделать короткий X-thread и отдельный RU-пост.",
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
    owner: "Design + Content",
    copy: "Слайды: Web3, Smart Contracts, DAO-inspired mechanics, Transparency. Финал: эти элементы формируют фундамент Atlas.",
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
    owner: "Content",
    copy: "Why was Atlas created? Because the world has changed. New tools make it possible to build systems based on clear rules rather than promises. Atlas brings together technology, community and transparent architecture.",
    comment: "Из PDF: есть EN-текст. Сделать RU/EN версии.",
  },
  {
    id: "atlas-post-live-system-1",
    date: "2026-06-12",
    stage: "После запуска",
    channel: "Telegram",
    format: "Пост",
    topicBlock: "Живая система",
    title: "Atlas запущен: что происходит сейчас",
    status: "Идея",
    owner: "SMM",
    copy: "Показать первые дни запуска: что открыто, как люди подключаются, какие материалы вышли, где следить за официальными обновлениями.",
    comment: "После запуска не обещать результат. Фокус на фактах и официальных ссылках.",
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
    owner: "Video",
    copy: "Короткое объяснение: участник подключается через кошелек, видит правила, подтверждает действие, процессы фиксируются в блокчейне. Без обещаний доходности.",
    comment: "Подходит для Reels/TikTok/Shorts. Нужен hook в первые 2 секунды.",
  },
  {
    id: "atlas-post-community-1",
    date: "2026-06-14",
    stage: "После запуска",
    channel: "Instagram",
    format: "Карусель",
    topicBlock: "Сообщество",
    title: "Кто уже строит Atlas",
    status: "Идея",
    owner: "SMM",
    copy: "Показать международное ядро, early participants и community builders. Не уходить в обещания, держать тон про движение, обучение и прозрачность.",
    comment: "Из PDF: тема уже есть. Нужны страны/факты, если будем указывать.",
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
    owner: "Video",
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
    owner: "Support + Content",
    copy: "Собрать 5 частых вопросов из чатов: кошелек, Smart Cycle, безопасность, Transport/audit risk, официальные ссылки.",
    comment: "Важно: ответы брать из FAQ/Legal/Security Review, не импровизировать.",
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
    owner: "SMM",
    copy: "Объяснить Web3 без перегруза: больше контроля, прозрачности и возможностей взаимодействия. Связать с тем, почему Atlas использует smart-contract и blockchain.",
    comment: "Из PDF: блок тем для Facebook. Можно сделать серию образовательных постов.",
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
  owner: "",
  copy: "",
  comment: "",
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
    owner: item.owner || "",
    copy: item.copy || "",
    comment: item.comment || "",
  })) : defaultContentPlanItems;
}

function readStoredItems() {
  if (typeof window === "undefined") return defaultContentPlanItems;

  try {
    const saved = window.localStorage.getItem(CONTENT_PLAN_STORAGE_KEY);
    return saved ? normalizeItems(JSON.parse(saved)) : defaultContentPlanItems;
  } catch {
    return defaultContentPlanItems;
  }
}

function formatPlanDate(value) {
  if (!value) return "Без даты";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

function ContentPlanBoard() {
  const [items, setItems] = useState(readStoredItems);
  const [newItem, setNewItem] = useState(emptyItem);
  const [editingId, setEditingId] = useState("");
  const [filters, setFilters] = useState({ channel: "Все", stage: "Все", status: "Все", date: "" });
  const [saveState, setSaveState] = useState("Сохранено");

  useEffect(() => {
    let isMounted = true;

    loadServerContent(CONTENT_PLAN_STORAGE_KEY).then((savedItems) => {
      if (isMounted && Array.isArray(savedItems)) setItems(normalizeItems(savedItems));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => filters.channel === "Все" || item.channel === filters.channel || item.channel === "Все каналы")
      .filter((item) => filters.stage === "Все" || item.stage === filters.stage)
      .filter((item) => filters.status === "Все" || item.status === filters.status)
      .filter((item) => !filters.date || item.date === filters.date)
      .sort((a, b) => (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99"));
  }, [filters, items]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce((groups, item) => {
      const key = item.date || "Без даты";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }, [filteredItems]);

  const stats = useMemo(() => ({
    total: items.length,
    ready: items.filter((item) => item.status === "Готово" || item.status === "Опубликовано").length,
    review: items.filter((item) => item.status === "На вычитке").length,
    channels: new Set(items.map((item) => item.channel)).size,
  }), [items]);

  function persist(nextItems) {
    setSaveState("Сохраняю...");
    try {
      window.localStorage.setItem(CONTENT_PLAN_STORAGE_KEY, JSON.stringify(nextItems));
    } catch {
      // Локальное сохранение не должно блокировать редактирование.
    }
    saveServerContent(CONTENT_PLAN_STORAGE_KEY, nextItems).then((ok) => setSaveState(ok ? "Сохранено" : "Локально"));
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

  function addItem() {
    const title = newItem.title.trim();
    if (!title) return;
    const item = {
      ...newItem,
      id: `content-plan-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      topicBlock: newItem.topicBlock.trim(),
      owner: newItem.owner.trim(),
      copy: newItem.copy.trim(),
      comment: newItem.comment.trim(),
    };
    updateItems((current) => [item, ...current]);
    setNewItem(emptyItem);
  }

  function removeItem(itemId) {
    updateItems((current) => current.filter((item) => item.id !== itemId));
  }

  return (
    <section className="analytics-content-plan">
      <div className="analytics-surface analytics-content-plan-hero">
        <div>
          <span className="analytics-kicker">Контент-план</span>
          <h2 className="analytics-agent-template-title">SMM-план Atlas по соцсетям и датам</h2>
          <p className="analytics-page-subtitle">
            Удобная рабочая версия по материалам из SMM.pdf: каналы, даты, форматы, тексты, статусы и комментарии по правкам.
          </p>
        </div>
        <div className="analytics-content-plan-stats">
          <span><strong>{stats.total}</strong> карточек</span>
          <span><strong>{stats.ready}</strong> готово</span>
          <span><strong>{stats.review}</strong> на вычитке</span>
          <span><strong>{stats.channels}</strong> каналов</span>
        </div>
      </div>

      <div className="analytics-surface analytics-content-plan-controls">
        <div className="analytics-content-plan-filters">
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
            <span>Дата</span>
            <input className="analytics-launch-input" type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} />
          </label>
          <button type="button" className="analytics-content-plan-reset" onClick={() => setFilters({ channel: "Все", stage: "Все", status: "Все", date: "" })}>
            Сбросить
          </button>
        </div>
        <span className="analytics-product-library-save">{saveState}</span>
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
          <input className="analytics-launch-input" value={newItem.topicBlock} onChange={(event) => setNewItem((current) => ({ ...current, topicBlock: event.target.value }))} placeholder="Блок: Мир меняется, Smart Cycle..." />
          <input className="analytics-launch-input" value={newItem.title} onChange={(event) => setNewItem((current) => ({ ...current, title: event.target.value }))} placeholder="Тема публикации" />
          <select className="analytics-launch-input" value={newItem.status} onChange={(event) => setNewItem((current) => ({ ...current, status: event.target.value }))}>
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <input className="analytics-launch-input" value={newItem.owner} onChange={(event) => setNewItem((current) => ({ ...current, owner: event.target.value }))} placeholder="Ответственный" />
          <textarea className="analytics-launch-input analytics-content-plan-wide" rows="3" value={newItem.copy} onChange={(event) => setNewItem((current) => ({ ...current, copy: event.target.value }))} placeholder="Текст / сценарий / тезисы" />
          <textarea className="analytics-launch-input analytics-content-plan-wide" rows="2" value={newItem.comment} onChange={(event) => setNewItem((current) => ({ ...current, comment: event.target.value }))} placeholder="Комментарии, правки, что нужно проверить" />
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
              <strong>{groupItems.length} публикац.</strong>
            </div>
            <div className="analytics-content-plan-grid">
              {groupItems.map((item) => {
                const isEditing = editingId === item.id;
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
                      <select className="analytics-content-plan-status" value={item.status} onChange={(event) => updateItem(item.id, { status: event.target.value })}>
                        {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
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
                        <input className="analytics-launch-input" value={item.owner} onChange={(event) => updateItem(item.id, { owner: event.target.value })} placeholder="Ответственный" />
                        <textarea className="analytics-launch-input analytics-content-plan-wide" rows="5" value={item.copy} onChange={(event) => updateItem(item.id, { copy: event.target.value })} placeholder="Текст / сценарий" />
                        <textarea className="analytics-launch-input analytics-content-plan-wide" rows="3" value={item.comment} onChange={(event) => updateItem(item.id, { comment: event.target.value })} placeholder="Комментарий / правки" />
                      </div>
                    ) : (
                      <>
                        <div className="analytics-content-plan-meta">
                          <span>{item.stage}</span>
                          <span>{item.topicBlock || "Без блока"}</span>
                          <span>{item.owner || "Не назначен"}</span>
                        </div>
                        <p>{item.copy || "Текст пока не добавлен."}</p>
                        {item.comment ? <small>{item.comment}</small> : null}
                      </>
                    )}

                    <div className="analytics-content-plan-actions">
                      <button type="button" onClick={() => setEditingId(isEditing ? "" : item.id)}>
                        {isEditing ? "Готово" : "Редактировать"}
                      </button>
                      <button type="button" onClick={() => removeItem(item.id)}>
                        Удалить
                      </button>
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
