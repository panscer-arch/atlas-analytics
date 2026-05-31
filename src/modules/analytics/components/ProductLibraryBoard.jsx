import { useEffect, useMemo, useState } from "react";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const PRODUCT_LIBRARY_STORAGE_KEY = "atlas.analytics.productLibrary.v1";

const defaultProducts = [
  {
    id: "pup-crm",
    name: "PUP CRM",
    type: "Основная панель",
    status: "В работе",
    owner: "Команда PUP",
    link: "/",
    description: "Главная CRM-панель: пользователи, заявки, операционные действия и ежедневная работа команды.",
    notes: "Базовая точка входа для управления проектом.",
  },
  {
    id: "crm-analytics",
    name: "CRM Analytics",
    type: "Аналитика",
    status: "В работе",
    owner: "Analytics",
    link: "/analytics-modern",
    description: "Панель аналитики CRM: финансы, обязательства, трафик, кошельки, партнёрская структура и география.",
    notes: "Используется командой и будущими Atlas Agents как read-only источник данных.",
  },
  {
    id: "atlas-ai",
    name: "Atlas AI",
    type: "AI-инструмент",
    status: "Проектируется",
    owner: "AI Agents",
    link: "",
    description: "Внутренние AI-агенты Atlas: CEO, CFO, CMO, Chief Analytics, Partner Growth, Web3 Lead и другие роли.",
    notes: "Будет отвечать на вопросы команды, делать дайджесты и отчёты по данным проекта.",
  },
];

const emptyProduct = {
  name: "",
  type: "",
  status: "Идея",
  owner: "",
  link: "",
  description: "",
  notes: "",
};

const statusOptions = ["Идея", "Проектируется", "В работе", "На паузе", "Готово"];

function normalizeProducts(products) {
  return Array.isArray(products) ? products.map((product) => ({
    id: product.id || `product-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: product.name || "",
    type: product.type || "",
    status: product.status || "Идея",
    owner: product.owner || "",
    link: product.link || "",
    description: product.description || "",
    notes: product.notes || "",
  })) : defaultProducts;
}

function readStoredProducts() {
  if (typeof window === "undefined") return defaultProducts;

  try {
    const saved = window.localStorage.getItem(PRODUCT_LIBRARY_STORAGE_KEY);
    return saved ? normalizeProducts(JSON.parse(saved)) : defaultProducts;
  } catch {
    return defaultProducts;
  }
}

function ProductLibraryBoard() {
  const [products, setProducts] = useState(readStoredProducts);
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [editingId, setEditingId] = useState("");
  const [saveState, setSaveState] = useState("Сохранено");

  const stats = useMemo(() => {
    const active = products.filter((product) => product.status === "В работе").length;
    const planned = products.filter((product) => product.status === "Идея" || product.status === "Проектируется").length;
    return { total: products.length, active, planned };
  }, [products]);

  useEffect(() => {
    let isMounted = true;

    loadServerContent(PRODUCT_LIBRARY_STORAGE_KEY).then((savedProducts) => {
      if (!isMounted || !savedProducts) return;
      setProducts(normalizeProducts(savedProducts));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function persist(nextProducts) {
    setSaveState("Сохраняю...");
    try {
      window.localStorage.setItem(PRODUCT_LIBRARY_STORAGE_KEY, JSON.stringify(nextProducts));
    } catch {
      // Локальное сохранение не должно ломать работу страницы.
    }

    saveServerContent(PRODUCT_LIBRARY_STORAGE_KEY, nextProducts).then((ok) => {
      setSaveState(ok ? "Сохранено" : "Локально");
    });
  }

  function updateProducts(updater) {
    setProducts((current) => {
      const next = updater(current);
      persist(next);
      return next;
    });
  }

  function updateProduct(productId, patch) {
    updateProducts((current) => current.map((product) => (product.id === productId ? { ...product, ...patch } : product)));
  }

  function addProduct() {
    const name = newProduct.name.trim();
    if (!name) return;

    const product = {
      ...newProduct,
      id: `product-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      type: newProduct.type.trim() || "Новый продукт",
      owner: newProduct.owner.trim(),
      link: newProduct.link.trim(),
      description: newProduct.description.trim(),
      notes: newProduct.notes.trim(),
    };

    updateProducts((current) => [product, ...current]);
    setNewProduct(emptyProduct);
  }

  function removeProduct(productId) {
    updateProducts((current) => current.filter((product) => product.id !== productId));
  }

  return (
    <section className="analytics-product-library">
      <div className="analytics-surface analytics-product-library-hero">
        <div>
          <span className="analytics-kicker">Мини-библиотека</span>
          <h2 className="analytics-agent-template-title">Продукты Atlas / PUP</h2>
          <p className="analytics-page-subtitle">
            Короткая карта продуктов, чтобы команда не путалась между CRM, аналитикой, AI-агентами и новыми направлениями.
          </p>
        </div>
        <div className="analytics-product-library-stats">
          <span><strong>{stats.total}</strong> всего</span>
          <span><strong>{stats.active}</strong> в работе</span>
          <span><strong>{stats.planned}</strong> в плане</span>
        </div>
      </div>

      <div className="analytics-surface analytics-product-library-form">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Добавить продукт</span>
            <h3 className="analytics-section-title">Новая карточка</h3>
          </div>
          <span className="analytics-product-library-save">{saveState}</span>
        </div>
        <div className="analytics-product-library-add-grid">
          <input className="analytics-launch-input" value={newProduct.name} onChange={(event) => setNewProduct((current) => ({ ...current, name: event.target.value }))} placeholder="Название: Atlas Site, Billing, Support..." />
          <input className="analytics-launch-input" value={newProduct.type} onChange={(event) => setNewProduct((current) => ({ ...current, type: event.target.value }))} placeholder="Тип: CRM, AI, сайт, сервис" />
          <select className="analytics-launch-input" value={newProduct.status} onChange={(event) => setNewProduct((current) => ({ ...current, status: event.target.value }))}>
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <input className="analytics-launch-input" value={newProduct.owner} onChange={(event) => setNewProduct((current) => ({ ...current, owner: event.target.value }))} placeholder="Ответственный" />
          <input className="analytics-launch-input" value={newProduct.link} onChange={(event) => setNewProduct((current) => ({ ...current, link: event.target.value }))} placeholder="Ссылка, если есть" />
          <button type="button" className="analytics-product-library-add-btn" onClick={addProduct} disabled={!newProduct.name.trim()}>
            +
          </button>
          <textarea className="analytics-launch-input analytics-product-library-wide" rows="2" value={newProduct.description} onChange={(event) => setNewProduct((current) => ({ ...current, description: event.target.value }))} placeholder="Коротко: зачем продукт нужен и кто им пользуется" />
        </div>
      </div>

      <div className="analytics-product-library-grid">
        {products.map((product) => {
          const isEditing = editingId === product.id;

          return (
            <article key={product.id} className="analytics-surface analytics-product-card">
              <div className="analytics-product-card-head">
                <div>
                  {isEditing ? (
                    <input className="analytics-launch-input" value={product.name} onChange={(event) => updateProduct(product.id, { name: event.target.value })} />
                  ) : (
                    <h3>{product.name}</h3>
                  )}
                  <span>{product.type || "Без типа"}</span>
                </div>
                <select className="analytics-product-status" value={product.status} onChange={(event) => updateProduct(product.id, { status: event.target.value })}>
                  {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>

              {isEditing ? (
                <div className="analytics-product-card-edit">
                  <input className="analytics-launch-input" value={product.type} onChange={(event) => updateProduct(product.id, { type: event.target.value })} placeholder="Тип" />
                  <input className="analytics-launch-input" value={product.owner} onChange={(event) => updateProduct(product.id, { owner: event.target.value })} placeholder="Ответственный" />
                  <input className="analytics-launch-input" value={product.link} onChange={(event) => updateProduct(product.id, { link: event.target.value })} placeholder="Ссылка" />
                  <textarea className="analytics-launch-input" rows="3" value={product.description} onChange={(event) => updateProduct(product.id, { description: event.target.value })} placeholder="Описание" />
                  <textarea className="analytics-launch-input" rows="2" value={product.notes} onChange={(event) => updateProduct(product.id, { notes: event.target.value })} placeholder="Заметки" />
                </div>
              ) : (
                <>
                  <p>{product.description || "Описание пока не добавлено."}</p>
                  <dl className="analytics-product-meta">
                    <div><dt>Ответственный</dt><dd>{product.owner || "Не назначен"}</dd></div>
                    <div><dt>Ссылка</dt><dd>{product.link ? <a href={product.link} target="_blank" rel="noreferrer">Открыть</a> : "Нет"}</dd></div>
                  </dl>
                  {product.notes ? <small>{product.notes}</small> : null}
                </>
              )}

              <div className="analytics-product-card-actions">
                <button type="button" onClick={() => setEditingId(isEditing ? "" : product.id)}>
                  {isEditing ? "Готово" : "Редактировать"}
                </button>
                <button type="button" onClick={() => removeProduct(product.id)}>
                  Удалить
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ProductLibraryBoard;
