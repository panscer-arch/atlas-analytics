import { useState } from "react";

const MATERIALS_STORAGE_KEY = "atlas.analytics.materialLinks.v1";

const MATERIAL_CATEGORIES = [
  { id: "comments", title: "Комментарий" },
  { id: "site", title: "ТЗ САЙТ" },
  { id: "cabinet", title: "ТЗ Личный кабинет" },
  { id: "videos", title: "Ролики" },
  { id: "documents", title: "Документы" },
  { id: "research", title: "Идеи / Исследования" },
  { id: "marketing", title: "Маркетинг" },
];

const defaultMaterialItems = [
  { id: "comments-drafts", category: "comments", title: "Наброски", url: "" },
  { id: "comments-webinar", category: "comments", title: "Тезисы для вебинара", url: "" },
  { id: "comments-research", category: "comments", title: "Исследование", url: "" },
  { id: "comments-ideas", category: "comments", title: "ИДЕИ", url: "" },
  { id: "comments-benefits", category: "comments", title: "Преимущества", url: "" },
  { id: "comments-voting", category: "comments", title: "Описание Голосование", url: "" },
  { id: "comments-whitepaper", category: "comments", title: "whitepaper (вычитать)", url: "" },
  { id: "site-home", category: "site", title: "ТЗ Главная страница", url: "" },
  { id: "site-kb", category: "site", title: "База знаний", url: "" },
  { id: "site-slides", category: "site", title: "Слайды ТЗ - Презентация", url: "" },
  { id: "site-products", category: "site", title: "Описание продуктов", url: "" },
  { id: "site-landing-1", category: "site", title: "Лендинг 1", url: "" },
  { id: "site-landing-2", category: "site", title: "Лендинг 2 для криптанов", url: "" },
  { id: "site-arbitrage", category: "site", title: "правила для Арбитражника", url: "" },
  { id: "cabinet-contract", category: "cabinet", title: "Для прогера по smart-contract", url: "" },
  { id: "cabinet-step", category: "cabinet", title: "Ступенька", url: "" },
  { id: "cabinet-task", category: "cabinet", title: "ТЗ прогеру", url: "" },
  { id: "cabinet-task-v2", category: "cabinet", title: "ТЗ прогеру v.2", url: "" },
  { id: "cabinet-admin-stats", category: "cabinet", title: "Статистика админка", url: "" },
  { id: "videos-main", category: "videos", title: "Ролик", url: "" },
  { id: "videos-chris", category: "videos", title: "Обращение Криса", url: "" },
  { id: "docs-list", category: "documents", title: "Список документов", url: "" },
  { id: "docs-unity", category: "documents", title: "Описание Unity Pool", url: "" },
  { id: "docs-agreement", category: "documents", title: "Пользовательское соглашение", url: "" },
  { id: "docs-disclaimer", category: "documents", title: "Дисклеймер", url: "" },
  { id: "docs-offer-policy", category: "documents", title: "Оферта / Политика участия", url: "" },
  { id: "docs-community-rules", category: "documents", title: "Правила комьюнити", url: "" },
  { id: "docs-ai-training", category: "documents", title: "Для обучения ИИ", url: "" },
  { id: "research-mutual-aid", category: "research", title: "Кассы взаимопомощи", url: "" },
  { id: "research-web3-guide", category: "research", title: "Путеводитель по Web 3", url: "" },
  { id: "research-uat", category: "research", title: "Токен UAT", url: "" },
  { id: "research-article", category: "research", title: "Статья", url: "" },
  { id: "research-linkedin", category: "research", title: "Инфа для учетки LinkedIn", url: "" },
  { id: "research-new-articles", category: "research", title: "Темы новых статей", url: "" },
  { id: "research-project-ads", category: "research", title: "Реклама проекта", url: "" },
  { id: "research-elite", category: "research", title: "Elite club", url: "" },
  { id: "research-arbitrage", category: "research", title: "Арбитражники Условия", url: "" },
  { id: "research-landings", category: "research", title: "лендосы", url: "" },
  { id: "research-raffles", category: "research", title: "Розыгрыши", url: "" },
  { id: "marketing-banners", category: "marketing", title: "Рекламные баннеры", url: "" },
  { id: "marketing-launch", category: "marketing", title: "План запуска", url: "" },
];

function readStoredMaterials() {
  if (typeof window === "undefined") return defaultMaterialItems;

  try {
    const saved = window.localStorage.getItem(MATERIALS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultMaterialItems;
  } catch {
    return defaultMaterialItems;
  }
}

function persistMaterials(nextItems) {
  try {
    window.localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(nextItems));
  } catch {
    // Таблица продолжит работать до перезагрузки, даже если localStorage недоступен.
  }
}

function createMaterialItem(overrides = {}) {
  return {
    id: `material-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category: "comments",
    title: "",
    url: "",
    ...overrides,
  };
}

function MaterialsLinksBoard() {
  const [items, setItems] = useState(readStoredMaterials);
  const [draft, setDraft] = useState(() => createMaterialItem({ category: "comments" }));
  const [editingItemId, setEditingItemId] = useState(null);

  const groupedItems = MATERIAL_CATEGORIES.map((category) => ({
    ...category,
    items: items.filter((item) => item.category === category.id),
  }));

  function updateItems(updater) {
    setItems((current) => {
      const next = updater(current);
      persistMaterials(next);
      return next;
    });
  }

  function updateItem(itemId, patch) {
    updateItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  }

  function addItem() {
    const title = draft.title.trim();
    if (!title) return;

    updateItems((current) => [createMaterialItem({ category: draft.category, title, url: draft.url.trim() }), ...current]);
    setDraft(createMaterialItem({ category: draft.category }));
  }

  function removeItem(itemId) {
    updateItems((current) => current.filter((item) => item.id !== itemId));
    if (editingItemId === itemId) setEditingItemId(null);
  }

  function resetItems() {
    updateItems(() => defaultMaterialItems);
    setEditingItemId(null);
  }

  return (
    <>
      <section className="analytics-surface analytics-materials-form mt-4">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Google Docs / Drive</span>
            <h3 className="analytics-section-title">Реестр материалов</h3>
            <p className="analytics-page-subtitle mb-0">
              Сохраняем привычный формат: документ остается в Google Docs, а здесь лежит карта ссылок по разделам.
            </p>
          </div>
          <button type="button" className="btn analytics-launch-reset-btn" onClick={resetItems}>
            Сбросить к шаблону
          </button>
        </div>
        <div className="analytics-materials-add-grid">
          <label>
            <span>Раздел</span>
            <select
              className="form-select analytics-launch-input"
              value={draft.category}
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
            >
              {MATERIAL_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Название</span>
            <input
              className="form-control analytics-launch-input"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Например: FAQ или Лендинг 1"
            />
          </label>
          <label>
            <span>Ссылка</span>
            <input
              className="form-control analytics-launch-input"
              value={draft.url}
              onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
              placeholder="https://docs.google.com/..."
            />
          </label>
          <button type="button" className="btn analytics-launch-add-btn" onClick={addItem} disabled={!draft.title.trim()}>
            Добавить ссылку
          </button>
        </div>
      </section>

      <section className="analytics-surface analytics-materials-board mt-4">
        <div className="table-responsive">
          <table className="table analytics-table analytics-materials-table mb-0">
            <thead>
              <tr>
                {MATERIAL_CATEGORIES.map((category) => (
                  <th key={category.id}>{category.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {groupedItems.map((category) => (
                  <td key={category.id}>
                    <div className="analytics-materials-column">
                      {category.items.map((item) => {
                        const isEditing = editingItemId === item.id;

                        if (isEditing) {
                          return (
                            <div key={item.id} className="analytics-materials-editor">
                              <input
                                className="form-control analytics-launch-table-input"
                                value={item.title}
                                onChange={(event) => updateItem(item.id, { title: event.target.value })}
                                placeholder="Название"
                              />
                              <input
                                className="form-control analytics-launch-table-input"
                                value={item.url}
                                onChange={(event) => updateItem(item.id, { url: event.target.value })}
                                placeholder="Ссылка Google Docs / Drive"
                              />
                              <div className="analytics-materials-editor-actions">
                                <button type="button" className="btn analytics-launch-icon-btn analytics-launch-done-btn" onClick={() => setEditingItemId(null)} title="Готово">
                                  ✓
                                </button>
                                <button type="button" className="btn analytics-launch-icon-btn analytics-launch-delete-btn" onClick={() => removeItem(item.id)} title="Удалить">
                                  ×
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={item.id} className="analytics-materials-link-row">
                            {item.url ? (
                              <a className="analytics-materials-link" href={item.url} target="_blank" rel="noreferrer">
                                {item.title}
                              </a>
                            ) : (
                              <button type="button" className="analytics-materials-link analytics-materials-link-empty" onClick={() => setEditingItemId(item.id)}>
                                {item.title}
                              </button>
                            )}
                            <button type="button" className="analytics-materials-edit-btn" onClick={() => setEditingItemId(item.id)} aria-label={`Изменить ссылку ${item.title}`}>
                              Изм.
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default MaterialsLinksBoard;
