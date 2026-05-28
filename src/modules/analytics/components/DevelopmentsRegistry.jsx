import { useEffect, useRef, useState } from "react";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const DEVELOPMENTS_REGISTRY_STORAGE_KEY = "atlas.analytics.developmentsRegistry.v1";

const STATUS_OPTIONS = ["Идея", "В работе", "Тест", "Прод", "Пауза"];
const TYPE_OPTIONS = ["Панель", "Парсер", "Дашборд", "Лендинг", "CRM", "Контент", "Интеграция", "Другое"];

const defaultDevelopments = [
  {
    id: "analytics-crm",
    title: "Atlas Analytics CRM",
    type: "Панель",
    status: "Прод",
    url: "https://supersussystem.com/",
    codeUrl: "GitHub: atlas-analytics-repo",
    owner: "Codex / команда",
    nextStep: "Держать как главный командный центр и не терять новые модули.",
    note: "Дашборд, задачи, контент, CRM-доска, заметки и серверное сохранение.",
  },
  {
    id: "crm-board",
    title: "CRM-доска задач",
    type: "CRM",
    status: "Прод",
    url: "https://supersussystem.com/analytics-board/",
    codeUrl: "public/analytics-board",
    owner: "Команда",
    nextStep: "Использовать для рабочих карточек и задач по аналитике.",
    note: "Встроенная Trello-подобная доска внутри аналитики.",
  },
  {
    id: "atlas-landing",
    title: "Предстартовый лендинг Atlas",
    type: "Лендинг",
    status: "В работе",
    url: "https://atlas-landing-production.up.railway.app/",
    codeUrl: "Railway / landing repo",
    owner: "Дизайн / верстка",
    nextStep: "Довести первый экран, текст и блоки Smart Cycle до утверждения.",
    note: "Мини-лендинг для ссылки из ролика Архитектора перед запуском.",
  },
  {
    id: "blogger-parser",
    title: "Парсеры и база блогеров",
    type: "Парсер",
    status: "Идея",
    url: "",
    codeUrl: "",
    owner: "Маркетинг / AI",
    nextStep: "Зафиксировать ТЗ: источники, поля, фильтры, выгрузка и ответственный.",
    note: "Инструмент для сбора блогеров, рассылки и контроля контактов.",
  },
];

function normalizeDevelopment(item) {
  return {
    id: item?.id || `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: item?.title || "",
    type: TYPE_OPTIONS.includes(item?.type) ? item.type : "Другое",
    status: STATUS_OPTIONS.includes(item?.status) ? item.status : "Идея",
    url: item?.url || "",
    codeUrl: item?.codeUrl || "",
    owner: item?.owner || "",
    nextStep: item?.nextStep || "",
    note: item?.note || "",
    updatedAt: item?.updatedAt || "",
  };
}

function normalizeDevelopments(items) {
  return Array.isArray(items) ? items.map(normalizeDevelopment) : defaultDevelopments;
}

function getStatusTone(status) {
  if (status === "Прод") return "success";
  if (status === "Тест") return "accent";
  if (status === "В работе") return "work";
  if (status === "Пауза") return "muted";
  return "idea";
}

function getHostLabel(url) {
  if (!url) return "ссылка не добавлена";

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function DevelopmentsRegistry() {
  const [items, setItems] = useState(defaultDevelopments);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Сохранено");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    type: "Панель",
    status: "Идея",
    url: "",
    codeUrl: "",
    owner: "",
    nextStep: "",
    note: "",
  });
  const saveRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    loadServerContent(DEVELOPMENTS_REGISTRY_STORAGE_KEY).then((savedItems) => {
      if (!isMounted) return;
      const normalizedItems = normalizeDevelopments(savedItems);
      setItems(normalizedItems.length ? normalizedItems : defaultDevelopments);
      setIsLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;

    const timer = window.setTimeout(() => {
      const requestId = saveRef.current + 1;
      saveRef.current = requestId;
      const normalizedItems = normalizeDevelopments(items);
      setSaveState("Сохраняю...");

      saveServerContent(DEVELOPMENTS_REGISTRY_STORAGE_KEY, normalizedItems).then((ok) => {
        if (saveRef.current !== requestId) return;
        setSaveState(ok ? "Сохранено на сервере" : "Ошибка сохранения");
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [items, isLoaded]);

  function updateItem(itemId, patch) {
    setItems((current) => current.map((item) => (item.id === itemId ? normalizeDevelopment({ ...item, ...patch, updatedAt: new Date().toISOString() }) : item)));
  }

  function addItem() {
    const title = newItem.title.trim();
    if (!title) return;

    setItems((current) => [
      normalizeDevelopment({
        ...newItem,
        id: `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        updatedAt: new Date().toISOString(),
      }),
      ...current,
    ]);
    setNewItem({ title: "", type: "Панель", status: "Идея", url: "", codeUrl: "", owner: "", nextStep: "", note: "" });
    setIsAddOpen(false);
  }

  function deleteItem(itemId) {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  const total = items.length;
  const prodCount = items.filter((item) => item.status === "Прод").length;
  const workCount = items.filter((item) => item.status === "В работе" || item.status === "Тест").length;
  const parserCount = items.filter((item) => item.type === "Парсер").length;

  return (
    <section className="analytics-developments mt-4">
      <div className="analytics-developments-hero analytics-surface">
        <div>
          <span className="analytics-kicker">Внутренние разработки</span>
          <h2>Каталог инструментов команды</h2>
          <p>
            Здесь собираем панели, парсеры, лендинги, дашборды и полезные приложухи Atlas, чтобы не терять их после разработки и всегда понимать,
            что уже есть, где открыть и что доработать дальше.
          </p>
        </div>
        <div className="analytics-developments-save">{saveState}</div>
      </div>

      <div className="analytics-developments-stats">
        <div className="analytics-developments-stat">
          <span>Всего</span>
          <strong>{total}</strong>
        </div>
        <div className="analytics-developments-stat">
          <span>В проде</span>
          <strong>{prodCount}</strong>
        </div>
        <div className="analytics-developments-stat">
          <span>В работе</span>
          <strong>{workCount}</strong>
        </div>
        <div className="analytics-developments-stat">
          <span>Парсеры</span>
          <strong>{parserCount}</strong>
        </div>
      </div>

      <div className="analytics-developments-toolbar analytics-surface">
        <button type="button" className="analytics-action-button analytics-action-button-primary" onClick={() => setIsAddOpen((current) => !current)}>
          {isAddOpen ? "Свернуть" : "+ Добавить разработку"}
        </button>
        <span>Добавляй сюда всё, что сделали или начали делать: ссылку, код, ответственного и следующий шаг.</span>
      </div>

      {isAddOpen ? (
        <div className="analytics-developments-form analytics-surface">
          <input className="analytics-launch-input" value={newItem.title} onChange={(event) => setNewItem((current) => ({ ...current, title: event.target.value }))} placeholder="Название разработки" />
          <select className="analytics-launch-status-select" value={newItem.type} onChange={(event) => setNewItem((current) => ({ ...current, type: event.target.value }))}>
            {TYPE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select className="analytics-launch-status-select" value={newItem.status} onChange={(event) => setNewItem((current) => ({ ...current, status: event.target.value }))}>
            {STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
          <input className="analytics-launch-input" value={newItem.owner} onChange={(event) => setNewItem((current) => ({ ...current, owner: event.target.value }))} placeholder="Ответственный" />
          <input className="analytics-launch-input" value={newItem.url} onChange={(event) => setNewItem((current) => ({ ...current, url: event.target.value }))} placeholder="Ссылка на прод / локалку / макет" />
          <input className="analytics-launch-input" value={newItem.codeUrl} onChange={(event) => setNewItem((current) => ({ ...current, codeUrl: event.target.value }))} placeholder="Где код / материалы" />
          <textarea className="analytics-launch-input" value={newItem.nextStep} onChange={(event) => setNewItem((current) => ({ ...current, nextStep: event.target.value }))} placeholder="Следующий шаг" />
          <textarea className="analytics-launch-input" value={newItem.note} onChange={(event) => setNewItem((current) => ({ ...current, note: event.target.value }))} placeholder="Короткое описание" />
          <button type="button" className="analytics-action-button analytics-action-button-success" onClick={addItem}>Сохранить разработку</button>
        </div>
      ) : null}

      <div className="analytics-developments-grid">
        {items.map((item) => (
          <article key={item.id} className="analytics-developments-card analytics-surface">
            <div className="analytics-developments-card-head">
              <div>
                <span className="analytics-developments-type">{item.type}</span>
                <input
                  className="analytics-developments-title"
                  value={item.title}
                  onChange={(event) => updateItem(item.id, { title: event.target.value })}
                  placeholder="Название"
                />
              </div>
              <select
                className={`analytics-developments-status analytics-developments-status-${getStatusTone(item.status)}`}
                value={item.status}
                onChange={(event) => updateItem(item.id, { status: event.target.value })}
              >
                {STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>

            <div className="analytics-developments-links">
              <label>
                <span>Открыть</span>
                <input className="analytics-launch-input" value={item.url} onChange={(event) => updateItem(item.id, { url: event.target.value })} placeholder="https://..." />
              </label>
              <label>
                <span>Код / материалы</span>
                <input className="analytics-launch-input" value={item.codeUrl} onChange={(event) => updateItem(item.id, { codeUrl: event.target.value })} placeholder="GitHub / папка / документ" />
              </label>
            </div>

            <div className="analytics-developments-meta">
              <label>
                <span>Кто ведёт</span>
                <input className="analytics-launch-input" value={item.owner} onChange={(event) => updateItem(item.id, { owner: event.target.value })} placeholder="Ответственный" />
              </label>
              <label>
                <span>Тип</span>
                <select className="analytics-launch-status-select" value={item.type} onChange={(event) => updateItem(item.id, { type: event.target.value })}>
                  {TYPE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            </div>

            <label className="analytics-developments-wide">
              <span>Следующий шаг</span>
              <textarea className="analytics-launch-input" value={item.nextStep} onChange={(event) => updateItem(item.id, { nextStep: event.target.value })} placeholder="Что нужно сделать дальше" />
            </label>

            <label className="analytics-developments-wide">
              <span>Описание / заметки</span>
              <textarea className="analytics-launch-input" value={item.note} onChange={(event) => updateItem(item.id, { note: event.target.value })} placeholder="Для чего инструмент и что важно помнить" />
            </label>

            <div className="analytics-developments-card-foot">
              <span>{getHostLabel(item.url)}</span>
              <div>
                {item.url ? (
                  <a className="analytics-action-button analytics-action-button-sm analytics-action-button-success" href={item.url} target="_blank" rel="noreferrer">Открыть</a>
                ) : null}
                <button type="button" className="analytics-action-button analytics-action-button-sm analytics-action-button-danger" onClick={() => deleteItem(item.id)}>Удалить</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default DevelopmentsRegistry;
