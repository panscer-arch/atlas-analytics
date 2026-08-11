import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Figma,
  GitBranch,
  Link2,
  Monitor,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addProductEntry,
  addProductLink,
  archiveProduct,
  createProduct,
  getProduct,
  listProducts,
  productExportUrl,
  restoreProduct,
  restoreProductVersion,
  updateProduct,
} from "../services/productsRegistryApi";
import "./ProductsRegistry.css";

const LABELS = {
  PRODUCT: "Продукт", PROGRAM: "Программа", MODULE: "Модуль / функция", CONTENT_PLATFORM: "Контентная платформа",
  INTERNAL_TOOL: "Внутренний инструмент", RESEARCH_CONCEPT: "Исследование / концепция",
  IDEA: "Идея", DISCOVERY: "Исследование", CONCEPT: "Концепция", PLANNED: "Запланировано", DESIGN: "Дизайн",
  DEVELOPMENT: "Разработка", TESTING: "Тестирование", PILOT_BETA: "Пилот / Beta", LIVE: "Live", ARCHIVED: "Архив",
  NOT_STARTED: "Не начато", ACTIVE: "Активно", AT_RISK: "Под риском", WAITING: "Ожидание", BLOCKED: "Заблокировано",
  PAUSED: "Приостановлено", COMPLETED: "Завершено", NONE: "Нет результата", DESIGN_PREVIEW: "Макет",
  LOCAL_DEMO: "Локальное демо", TEST: "Test", STAGING: "Staging", LOW: "Низкий", MEDIUM: "Средний", HIGH: "Высокий",
  CRITICAL: "Критический", UPDATE: "Обновление", DECISION: "Решение", BLOCKER: "Блокер", MILESTONE: "Этап",
  RELEASE: "Релиз", COMMENT: "Комментарий", STATUS_CHANGE: "Изменение статуса", OWNER_CHANGE: "Смена владельца",
  LINK_CHANGE: "Изменение ссылки", CONCEPT_LINK: "Концепция", LOCAL_DEMO_LINK: "Локальное демо", PRODUCTION: "Live",
  REPOSITORY: "Repo", FIGMA: "Figma", SPECIFICATION: "ТЗ", DOCUMENTATION: "Docs", ANALYTICS: "Аналитика", OTHER: "Другое",
  VERIFIED: "Проверено", UNCHECKED: "Не проверено", BROKEN: "Недоступно", LOCAL: "Local",
};

const VIEWS = [
  ["all", "Все"], ["active", "В работе"], ["attention", "Требуют внимания"], ["ideas", "Идеи"], ["live", "Запущены"], ["archive", "Архив"],
];
const STAGES = ["IDEA", "DISCOVERY", "CONCEPT", "PLANNED", "DESIGN", "DEVELOPMENT", "TESTING", "PILOT_BETA", "LIVE", "ARCHIVED"];
const STATES = ["NOT_STARTED", "ACTIVE", "AT_RISK", "WAITING", "BLOCKED", "PAUSED", "COMPLETED"];
const AVAILABILITY = ["NONE", "DESIGN_PREVIEW", "LOCAL_DEMO", "TEST", "STAGING", "LIVE"];
const TYPES = ["PRODUCT", "PROGRAM", "MODULE", "CONTENT_PLATFORM", "INTERNAL_TOOL", "RESEARCH_CONCEPT"];
const LINK_TYPES = ["CONCEPT", "LOCAL_DEMO", "TEST", "STAGING", "PRODUCTION", "REPOSITORY", "FIGMA", "SPECIFICATION", "DOCUMENTATION", "ANALYTICS", "OTHER"];
const ENTRY_TYPES = ["UPDATE", "DECISION", "BLOCKER", "MILESTONE", "RELEASE", "COMMENT"];
const FILTER_KEYS = ["view", "q", "stage", "state", "type", "owner", "executor", "hasLink", "updated", "sort"];

function label(value) {
  if (value === "CONCEPT") return "Концепция";
  if (value === "LOCAL_DEMO") return "Локальное демо";
  return LABELS[value] || value || "—";
}

function dateLabel(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function initials(name) {
  return String(name || "P").split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function readFilters() {
  const url = new URL(window.location.href);
  return Object.fromEntries(FILTER_KEYS.map((key) => [key, url.searchParams.get(key) || (key === "view" ? "all" : key === "sort" ? "updated" : "")]));
}

function writeFilters(filters, { push = false } = {}) {
  const url = new URL(window.location.href);
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value && !(key === "view" && value === "all") && !(key === "sort" && value === "updated")) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  window.history[push ? "pushState" : "replaceState"]({}, "", url);
}

function setProductRoute(slug, { push = true } = {}) {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set("product", slug);
  else url.searchParams.delete("product");
  window.history[push ? "pushState" : "replaceState"]({}, "", url);
}

function emptyDraft() {
  return {
    name: "", slug: "", itemType: "PRODUCT", parentId: "", shortDescription: "", fullDescription: "", logoUrl: "",
    owner: "Atlas System", executor: "", responsible: "", lifecycleStage: "IDEA", deliveryState: "NOT_STARTED",
    availability: "NONE", priority: "MEDIUM", currentFocus: "", nextStep: "", reviewDate: "", targetDate: "",
    blockReason: "", tags: [], needsConfirmation: false,
  };
}

function apiErrorMessage(error) {
  const messages = {
    version_conflict: "Карточка уже изменилась в другом окне. Обновите данные и повторите правку.",
    possible_duplicate: "Похожая карточка уже существует.", possible_duplicate_link: "Такая ссылка уже есть в реестре.",
    parent_cycle: "Нельзя создать циклическую связь между родительскими продуктами.", unsafe_url_protocol: "Разрешены только ссылки http/https.",
    origin_not_allowed: "Источник запроса не разрешён сервером.", rate_limit_exceeded: "Слишком много изменений. Подождите минуту.",
    writes_disabled: "Редактирование временно отключено на сервере.", block_reason_required: "Для ожидания или блокировки укажите причину.",
    version_required: "Версия карточки не указана. Обновите данные и повторите действие.",
  };
  return messages[error?.message] || `Не удалось выполнить действие: ${error?.message || "неизвестная ошибка"}`;
}

function QuickLink({ item }) {
  const Icon = item.type === "REPOSITORY" ? GitBranch : item.type === "FIGMA" ? Figma : item.type === "DOCUMENTATION" || item.type === "SPECIFICATION" ? FileText : ExternalLink;
  return (
    <a className="products-quick-link" href={item.url} target="_blank" rel="noreferrer" title={`${item.label} · ${label(item.checkStatus)}`} onClick={(event) => event.stopPropagation()}>
      <Icon size={15} aria-hidden="true" /> <span>{label(item.type)}</span>
    </a>
  );
}

function ProductCard({ item, onOpen }) {
  const problematic = ["AT_RISK", "WAITING", "BLOCKED", "PAUSED"].includes(item.deliveryState);
  return (
    <article className={`products-card${item.archivedAt ? " is-archived" : ""}${problematic ? " has-problem" : ""}`}>
      {problematic ? <div className={`products-problem-strip tone-${item.deliveryState.toLowerCase()}`}>{label(item.deliveryState)}</div> : null}
      <div className="products-card-head">
        <div className="products-mark" aria-hidden="true">
          {item.logoUrl ? <img src={item.logoUrl} alt="" /> : initials(item.name)}
        </div>
        <div className="products-card-title">
          <button type="button" onClick={() => onOpen(item)}><span>{item.name}</span></button>
          <small>{label(item.itemType)}{item.parentId ? " · модуль" : ""}</small>
        </div>
        {item.needsConfirmation ? <span className="products-confirmation" title="Часть данных не подтверждена"><AlertTriangle size={14} /> Уточнить</span> : null}
      </div>
      <p className="products-card-summary">{item.shortDescription || "Описание пока не добавлено."}</p>
      <div className="products-status-row">
        <span className={`products-stage stage-${item.lifecycleStage.toLowerCase()}`}>{label(item.lifecycleStage)}</span>
        <span className={`products-state state-${item.deliveryState.toLowerCase()}`}>{label(item.deliveryState)}</span>
      </div>
      <dl className="products-card-meta">
        <div><dt>Владелец</dt><dd>{item.owner || "—"}</dd></div>
        <div><dt>Исполнитель</dt><dd>{item.executor || "Не назначен"}</dd></div>
      </dl>
      <div className="products-next-step"><small>Следующий шаг</small><p>{item.nextStep || "Не указан"}</p></div>
      {problematic && item.blockReason ? <div className="products-blocker"><AlertTriangle size={15} /> <span>{item.blockReason}</span></div> : null}
      <footer className="products-card-footer">
        <div><span>{item.targetDate ? `Цель ${item.targetDate}` : "Без целевой даты"}</span><time dateTime={item.lastActivityAt}>Обновлено {dateLabel(item.lastActivityAt)}</time></div>
        <nav aria-label={`Ссылки ${item.name}`}>{item.links.slice(0, 5).map((link) => <QuickLink key={link.id} item={link} />)}</nav>
      </footer>
    </article>
  );
}

function Field({ label: fieldLabel, wide = false, children }) {
  return <label className={wide ? "products-field products-field-wide" : "products-field"}><span>{fieldLabel}</span>{children}</label>;
}

function ProductForm({ product, products, actorName, onActorChange, onSave, onCancel, saving }) {
  const [draft, setDraft] = useState(() => product ? { ...emptyDraft(), ...product, tags: product.tags || [] } : emptyDraft());
  function change(field, value) { setDraft((current) => ({ ...current, [field]: value })); }
  return (
    <form className="products-form" onSubmit={(event) => { event.preventDefault(); onSave({ ...draft, actorName }); }}>
      <div className="products-form-grid">
        <Field label="Название"><input required value={draft.name} onChange={(event) => change("name", event.target.value)} placeholder="Название продукта" /></Field>
        <Field label="Тип"><select value={draft.itemType} onChange={(event) => change("itemType", event.target.value)}>{TYPES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
        <Field label="Короткое описание" wide><textarea required rows="3" value={draft.shortDescription} onChange={(event) => change("shortDescription", event.target.value)} placeholder="Что это и для кого — 2–3 строки" /></Field>
        <Field label="Полное описание" wide><textarea rows="6" value={draft.fullDescription} onChange={(event) => change("fullDescription", event.target.value)} placeholder="Назначение, аудитория, границы и важные детали" /></Field>
        <Field label="Ссылка на логотип" wide><input type="url" value={draft.logoUrl} onChange={(event) => change("logoUrl", event.target.value)} placeholder="https://…" /></Field>
        <Field label="Родитель"><select value={draft.parentId || ""} onChange={(event) => change("parentId", event.target.value)}><option value="">Без родителя</option>{products.filter((item) => item.id !== product?.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Приоритет"><select value={draft.priority} onChange={(event) => change("priority", event.target.value)}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
        <Field label="Стадия"><select value={draft.lifecycleStage} onChange={(event) => change("lifecycleStage", event.target.value)}>{STAGES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
        <Field label="Состояние"><select value={draft.deliveryState} onChange={(event) => change("deliveryState", event.target.value)}>{STATES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
        <Field label="Доступность"><select value={draft.availability} onChange={(event) => change("availability", event.target.value)}>{AVAILABILITY.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
        <Field label="Владелец / заказчик"><input value={draft.owner} onChange={(event) => change("owner", event.target.value)} /></Field>
        <Field label="Исполнитель"><input value={draft.executor} onChange={(event) => change("executor", event.target.value)} placeholder="Digitex, Bruno…" /></Field>
        <Field label="Ответственный"><input value={draft.responsible} onChange={(event) => change("responsible", event.target.value)} /></Field>
        <Field label="Текущий фокус" wide><textarea rows="2" value={draft.currentFocus} onChange={(event) => change("currentFocus", event.target.value)} /></Field>
        <Field label="Следующий шаг" wide><textarea rows="2" value={draft.nextStep} onChange={(event) => change("nextStep", event.target.value)} /></Field>
        <Field label="Контрольная дата"><input value={draft.reviewDate} onChange={(event) => change("reviewDate", event.target.value)} placeholder="2026-08-20 или Q3" /></Field>
        <Field label="Целевая дата"><input value={draft.targetDate} onChange={(event) => change("targetDate", event.target.value)} placeholder="2026-Q4" /></Field>
        <Field label="Причина ожидания / блокировки" wide><textarea rows="2" value={draft.blockReason} onChange={(event) => change("blockReason", event.target.value)} /></Field>
        <Field label="Теги"><input value={draft.tags.join(", ")} onChange={(event) => change("tags", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="Web3, Internal, Education" /></Field>
        <Field label="Имя автора"><input required value={actorName} onChange={(event) => onActorChange(event.target.value)} /><small>Не подтверждается системой</small></Field>
        <label className="products-check products-field-wide"><input type="checkbox" checked={draft.needsConfirmation} onChange={(event) => change("needsConfirmation", event.target.checked)} /> Требует уточнения</label>
      </div>
      <div className="products-sensitive-warning"><AlertTriangle size={16} /> Не размещайте пароли, ключи, seed-фразы и персональные данные.</div>
      <div className="products-form-actions"><button type="button" className="products-button secondary" onClick={onCancel}>Отмена</button><button type="submit" className="products-button primary" disabled={saving}>{saving ? "Сохраняю…" : product ? "Сохранить изменения" : "Создать продукт"}</button></div>
    </form>
  );
}

function StageRail({ stage }) {
  const current = STAGES.indexOf(stage);
  return <ol className="products-stage-rail" aria-label="Прогресс по стадиям">{STAGES.slice(0, -1).map((item, index) => <li key={item} className={index < current ? "done" : index === current ? "current" : ""}><span>{index < current ? <CheckCircle2 size={14} /> : index + 1}</span><small>{label(item)}</small></li>)}</ol>;
}

function ProductDetails({ product, products, actorName, onActorChange, mode, setMode, saving, onSave, onClose, onRefresh, onMutate }) {
  const [entry, setEntry] = useState({ type: "UPDATE", bodyMd: "" });
  const [linkDraft, setLinkDraft] = useState({ type: "OTHER", label: "", url: "", environment: "TEST" });
  const [showLinkForm, setShowLinkForm] = useState(false);
  if (mode === "create") return <ProductForm products={products} actorName={actorName} onActorChange={onActorChange} onSave={onSave} onCancel={onClose} saving={saving} />;
  if (!product) return <div className="products-drawer-loading"><RefreshCw className="is-spinning" /> Загружаю карточку…</div>;
  if (mode === "edit") return <ProductForm product={product} products={products} actorName={actorName} onActorChange={onActorChange} onSave={onSave} onCancel={() => setMode("view")} saving={saving} />;
  const problematic = ["AT_RISK", "WAITING", "BLOCKED", "PAUSED"].includes(product.deliveryState);
  return (
    <div className="products-detail">
      <div className="products-detail-identity">
        <div className="products-mark large">{product.logoUrl ? <img src={product.logoUrl} alt="" /> : initials(product.name)}</div>
        <div><span className="products-kicker">{label(product.itemType)}</span><h2>{product.name}</h2><p>{product.shortDescription}</p></div>
      </div>
      <div className="products-detail-actions">
        <button className="products-button secondary" type="button" onClick={() => setMode("edit")}><Pencil size={15} /> Редактировать</button>
        <a className="products-button secondary" href={productExportUrl(product.slug)}><Download size={15} /> Скачать MD</a>
        <button className="products-icon-button" type="button" onClick={onRefresh} title="Обновить" aria-label="Обновить карточку"><RefreshCw size={17} /></button>
      </div>
      {product.fullDescription ? <section className="products-detail-section products-description"><h3>Описание</h3><p>{product.fullDescription}</p></section> : null}
      <section className="products-detail-section">
        <h3>Текущее состояние</h3>
        <div className="products-status-cards">
          <div><small>Стадия</small><strong>{label(product.lifecycleStage)}</strong></div>
          <div><small>Работа</small><strong>{label(product.deliveryState)}</strong></div>
          <div><small>Доступность</small><strong>{label(product.availability)}</strong></div>
        </div>
        {product.needsConfirmation ? <div className="products-confirmation-callout"><AlertTriangle size={16} /> Часть назначения или статуса требует уточнения.</div> : null}
      </section>
      <section className="products-detail-section">
        <h3>Ответственные</h3>
        <dl className="products-detail-grid"><div><dt>Владелец</dt><dd>{product.owner || "—"}</dd></div><div><dt>Исполнитель</dt><dd>{product.executor || "—"}</dd></div><div><dt>Ответственный</dt><dd>{product.responsible || "—"}</dd></div><div><dt>Целевая дата</dt><dd>{product.targetDate || "—"}</dd></div></dl>
      </section>
      <section className="products-detail-section products-focus">
        <div><small>Текущий фокус</small><p>{product.currentFocus || "Не указан"}</p></div>
        <div><small>Следующий шаг · {product.reviewDate || "без контрольной даты"}</small><p>{product.nextStep || "Не указан"}</p></div>
        {problematic ? <div className="products-blocker prominent"><AlertTriangle size={17} /><span><strong>{label(product.deliveryState)}</strong>{product.blockReason || "Причина пока не указана"}</span></div> : null}
      </section>
      <section className="products-detail-section">
        <div className="products-section-head"><h3>Ссылки и доказательства</h3><button type="button" onClick={() => setShowLinkForm((value) => !value)}><Plus size={15} /> Добавить</button></div>
        <div className="products-links-list">{product.links.length ? product.links.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer"><Link2 size={16} /><span><strong>{item.label}</strong><small>{label(item.type)} · {label(item.environment)} · {label(item.checkStatus)}</small></span><ExternalLink size={14} /></a>) : <p className="products-muted">Ссылок пока нет.</p>}</div>
        {showLinkForm ? <form className="products-inline-form" onSubmit={(event) => { event.preventDefault(); onMutate(() => addProductLink(product.id, { ...linkDraft, actorName }, product.version)).then(() => { setShowLinkForm(false); setLinkDraft({ type: "OTHER", label: "", url: "", environment: "TEST" }); }).catch(() => {}); }}><select value={linkDraft.type} onChange={(event) => setLinkDraft({ ...linkDraft, type: event.target.value })}>{LINK_TYPES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><input required value={linkDraft.label} onChange={(event) => setLinkDraft({ ...linkDraft, label: event.target.value })} placeholder="Название" /><input required type="url" value={linkDraft.url} onChange={(event) => setLinkDraft({ ...linkDraft, url: event.target.value })} placeholder="https://…" /><select value={linkDraft.environment} onChange={(event) => setLinkDraft({ ...linkDraft, environment: event.target.value })}>{["LOCAL","TEST","STAGING","LIVE"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><button className="products-button primary" disabled={saving}>Сохранить</button></form> : null}
      </section>
      <section className="products-detail-section"><h3>Прогресс</h3><StageRail stage={product.lifecycleStage} /></section>
      {product.children?.length ? <section className="products-detail-section"><h3>Дочерние элементы</h3><div className="products-child-list">{product.children.map((item) => <button type="button" key={item.id} onClick={() => { setProductRoute(item.slug); window.dispatchEvent(new PopStateEvent("popstate")); }}>{item.name}<small>{label(item.itemType)}</small></button>)}</div></section> : null}
      <section className="products-detail-section">
        <h3>Добавить обновление</h3>
        <form className="products-entry-form" onSubmit={(event) => { event.preventDefault(); onMutate(() => addProductEntry(product.id, { ...entry, actorName }, product.version)).then(() => setEntry({ type: "UPDATE", bodyMd: "" })).catch(() => {}); }}>
          <div><select value={entry.type} onChange={(event) => setEntry({ ...entry, type: event.target.value })}>{ENTRY_TYPES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><input value={actorName} onChange={(event) => onActorChange(event.target.value)} aria-label="Имя автора" placeholder="Имя автора" /></div>
          <textarea required rows="4" value={entry.bodyMd} onChange={(event) => setEntry({ ...entry, bodyMd: event.target.value })} placeholder="Что изменилось, что решили, чего ждём… Поддерживается Markdown." />
          <button className="products-button primary" disabled={saving}>Добавить в историю</button>
        </form>
      </section>
      <section className="products-detail-section">
        <h3>Хронология</h3>
        {product.entries?.length ? <ol className="products-timeline">{product.entries.map((item) => <li key={item.id}><span className="products-timeline-dot" /><div><div><strong>{label(item.type)}</strong><time dateTime={item.occurredAt}>{dateLabel(item.occurredAt)}</time></div><small>{item.authorName} · имя не подтверждено</small><p>{item.bodyMd}</p>{item.supersedesEntryId ? <em>Исправляет запись {item.supersedesEntryId}</em> : null}</div></li>)}</ol> : <p className="products-muted">Событий пока нет.</p>}
      </section>
      <section className="products-detail-section products-audit-section">
        <h3>Версии и аудит</h3><p className="products-muted">Все изменения сохраняются. Можно восстановить состояние карточки до выбранного события.</p>
        <div className="products-audit-list">{product.auditEvents?.slice(0, 8).map((item) => <div key={item.id}><span><strong>{item.action}</strong><small>{item.actorName} · {dateLabel(item.createdAt)}</small></span>{item.beforeJson ? <button type="button" disabled={saving} onClick={() => { if (window.confirm("Восстановить состояние карточки до этого изменения?")) onMutate(() => restoreProductVersion(product.id, item.id, actorName, product.version)).catch(() => {}); }}><RotateCcw size={14} /> Восстановить</button> : null}</div>)}</div>
      </section>
      <section className="products-detail-section products-danger-zone">
        <h3>{product.archivedAt ? "Восстановление" : "Архив"}</h3><p>Окончательное удаление запрещено. История и предыдущие версии сохраняются.</p>
        <button type="button" className="products-button secondary" disabled={saving} onClick={() => { const action = product.archivedAt ? restoreProduct : archiveProduct; if (window.confirm(product.archivedAt ? "Восстановить карточку из архива?" : "Архивировать карточку?")) onMutate(() => action(product.id, actorName, product.version)).catch(() => {}); }}>{product.archivedAt ? <RotateCcw size={15} /> : <Archive size={15} />}{product.archivedAt ? "Восстановить" : "Архивировать"}</button>
      </section>
    </div>
  );
}

export default function ProductsRegistry() {
  const [filters, setFilters] = useState(readFilters);
  const [data, setData] = useState({ items: [], counts: {}, facets: { owners: [], executors: [] }, storageMode: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerMode, setDrawerMode] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("atlas-products-theme") || "system");
  const [actorName, setActorName] = useState(() => localStorage.getItem("atlas-products-actor") || "");
  const closeButtonRef = useRef(null);
  const lastFocusedRef = useRef(null);

  const loadList = useCallback(async (nextFilters = filters) => {
    setLoading(true); setError("");
    try { setData(await listProducts(nextFilters)); }
    catch (requestError) { setError(apiErrorMessage(requestError)); }
    finally { setLoading(false); }
  }, [filters]);

  const openProduct = useCallback(async (idOrSlug, { updateRoute = true } = {}) => {
    lastFocusedRef.current = document.activeElement;
    setDrawerMode("view"); setSelected(null); setError("");
    try {
      const result = await getProduct(idOrSlug);
      setSelected(result.item);
      if (updateRoute) setProductRoute(result.item.slug);
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    } catch (requestError) { setError(apiErrorMessage(requestError)); setDrawerMode(""); }
  }, []);

  const closeDrawer = useCallback(({ updateRoute = true } = {}) => {
    setDrawerMode(""); setSelected(null);
    if (updateRoute) setProductRoute("");
    requestAnimationFrame(() => lastFocusedRef.current?.focus?.());
  }, []);

  useEffect(() => { writeFilters(filters); const timer = window.setTimeout(() => loadList(filters), filters.q ? 250 : 0); return () => window.clearTimeout(timer); }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const productSlug = new URL(window.location.href).searchParams.get("product");
    if (productSlug) void openProduct(productSlug, { updateRoute: false });
    function onPopState() {
      const nextFilters = readFilters(); setFilters(nextFilters);
      const slug = new URL(window.location.href).searchParams.get("product");
      if (slug) void openProduct(slug, { updateRoute: false }); else closeDrawer({ updateRoute: false });
    }
    window.addEventListener("popstate", onPopState); return () => window.removeEventListener("popstate", onPopState);
  }, [closeDrawer, openProduct]);
  useEffect(() => { localStorage.setItem("atlas-products-theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("atlas-products-actor", actorName); }, [actorName]);
  useEffect(() => {
    if (!drawerMode) return undefined;
    function onKey(event) {
      if (event.key === "Escape") closeDrawer();
      if (event.key === "Tab") {
        const drawer = document.querySelector(".products-drawer");
        const focusable = [...(drawer?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])') || [])];
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey);
  }, [drawerMode, closeDrawer]);

  const allProducts = data.items;
  const counts = data.counts || {};
  const themeClass = theme === "system" ? "theme-system" : `theme-${theme}`;
  const updateFilter = (key, value, push = false) => setFilters((current) => { const next = { ...current, [key]: value }; writeFilters(next, { push }); return next; });
  const clearFilters = () => setFilters({ view: "all", q: "", stage: "", state: "", type: "", owner: "", executor: "", hasLink: "", updated: "", sort: "updated" });
  const hasAdvanced = ["stage","state","type","owner","executor","hasLink","updated"].some((key) => filters[key]);

  const openCreate = () => {
    lastFocusedRef.current = document.activeElement;
    setSelected(null);
    setDrawerMode("create");
    requestAnimationFrame(() => closeButtonRef.current?.focus());
  };

  async function mutate(operation) {
    setSaving(true); setError("");
    try {
      const result = await operation(); setSelected(result.item); await loadList(filters); return result;
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
      if (requestError.status === 409 && selected) {
        try { setSelected((await getProduct(selected.id)).item); } catch { /* keep conflict message */ }
      }
      throw requestError;
    } finally { setSaving(false); }
  }

  async function saveProduct(value) {
    try {
      if (drawerMode === "create") {
        const result = await createProduct(value); setSelected(result.item); setDrawerMode("view"); setProductRoute(result.item.slug); await loadList(filters);
      } else {
        await mutate(() => updateProduct(selected.id, value, selected.version)); setDrawerMode("view");
      }
    } catch (requestError) { setError(apiErrorMessage(requestError)); }
  }

  return (
    <div className={`products-registry ${themeClass}`}>
      <header className="products-header">
        <div><span className="products-eyebrow">ATLAS · PRODUCT PORTFOLIO</span><h1>Продукты</h1><p>Единый каталог продуктов, модулей, концепций и внутренних инструментов.</p></div>
        <div className="products-header-actions">
          <div className="products-theme-switch" role="group" aria-label="Тема">{[["light","Светлая",Sun],["dark","Тёмная",Moon],["system","Системная",Monitor]].map(([value, name, Icon]) => <button key={value} type="button" aria-label={`${name} тема`} aria-pressed={theme === value} className={theme === value ? "active" : ""} onClick={() => setTheme(value)} title={name}><Icon size={15} /></button>)}</div>
          <button className="products-button primary" type="button" onClick={openCreate}><Plus size={17} /> Добавить продукт</button>
        </div>
      </header>
      <section className="products-counters" aria-label="Сводка">
        {[ ["Всего",counts.total], ["Активные",counts.active], ["Тестирование",counts.testing], ["Live",counts.live,"live"], ["Заблокированы",counts.blocked,"blocked"], ["Давно без обновлений",counts.stale,"stale"] ].map(([name,value,tone]) => <div key={name} className={tone ? `tone-${tone}` : ""}><span>{name}</span><strong>{value ?? "—"}</strong></div>)}
      </section>
      <div className="products-toolbar">
        <div className="products-search"><Search size={17} /><input type="search" value={filters.q} onChange={(event) => updateFilter("q", event.target.value)} placeholder="Найти продукт, команду, тег…" aria-label="Поиск продуктов" />{filters.q ? <button type="button" onClick={() => updateFilter("q", "")}><X size={15} /></button> : null}</div>
        <div className="products-views" role="group" aria-label="Быстрые представления">{VIEWS.map(([value,name]) => <button key={value} type="button" aria-pressed={filters.view === value} className={filters.view === value ? "active" : ""} onClick={() => updateFilter("view", value, true)}>{name}</button>)}</div>
        <div className="products-filters">
          <select aria-label="Стадия" value={filters.stage} onChange={(event) => updateFilter("stage", event.target.value)}><option value="">Все стадии</option>{STAGES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          <select aria-label="Состояние" value={filters.state} onChange={(event) => updateFilter("state", event.target.value)}><option value="">Все состояния</option>{STATES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          <select aria-label="Тип" value={filters.type} onChange={(event) => updateFilter("type", event.target.value)}><option value="">Все типы</option>{TYPES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          <select aria-label="Владелец" value={filters.owner} onChange={(event) => updateFilter("owner", event.target.value)}><option value="">Все владельцы</option>{data.facets.owners.map((item) => <option key={item}>{item}</option>)}</select>
          <select aria-label="Исполнитель" value={filters.executor} onChange={(event) => updateFilter("executor", event.target.value)}><option value="">Все исполнители</option>{data.facets.executors.map((item) => <option key={item}>{item}</option>)}</select>
          <select aria-label="Наличие ссылки" value={filters.hasLink} onChange={(event) => updateFilter("hasLink", event.target.value)}><option value="">Любые ссылки</option><option value="demo">Есть демо</option><option value="repo">Есть репозиторий</option></select>
          <select aria-label="Дата обновления" value={filters.updated} onChange={(event) => updateFilter("updated", event.target.value)}><option value="">Любая дата</option><option value="7">За 7 дней</option><option value="30">За 30 дней</option><option value="90">За 90 дней</option></select>
          <select aria-label="Сортировка" value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}><option value="updated">Недавно обновлены</option><option value="name">По названию</option><option value="stage">По стадии</option><option value="target">По целевой дате</option></select>
          {hasAdvanced || filters.q ? <button type="button" className="products-clear" onClick={clearFilters}><X size={14} /> Сбросить</button> : null}
        </div>
      </div>
      {error ? <div className="products-error" role="alert"><AlertTriangle size={17} /><span>{error}</span><button type="button" onClick={() => { setError(""); void loadList(filters); }}>Повторить</button></div> : null}
      <div className="products-result-bar"><span aria-live="polite">{loading ? "Загружаю…" : `Найдено: ${allProducts.length}`}</span><small>Хранилище: {data.storageMode === "postgres" ? "PostgreSQL" : "локальный fallback"}</small></div>
      {loading && !allProducts.length ? <div className="products-grid" aria-label="Загрузка">{Array.from({ length: 6 }, (_, index) => <div key={index} className="products-card products-skeleton" />)}</div> : allProducts.length ? <div className="products-grid">{allProducts.map((item) => <ProductCard key={item.id} item={item} onOpen={() => openProduct(item.slug)} />)}</div> : <div className="products-empty"><div className="products-mark large">0</div><h2>{filters.q || hasAdvanced ? "Ничего не найдено" : "Каталог пока пуст"}</h2><p>{filters.q || hasAdvanced ? "Измените запрос или сбросьте фильтры." : "Добавьте первую карточку продукта или концепции."}</p>{filters.q || hasAdvanced ? <button className="products-button secondary" onClick={clearFilters}>Сбросить фильтры</button> : <button className="products-button primary" onClick={openCreate}><Plus size={16} /> Добавить продукт</button>}</div>}
      {drawerMode ? <div className="products-drawer-layer"><button type="button" className="products-drawer-backdrop" aria-label="Закрыть панель" onClick={() => closeDrawer()} /><aside className="products-drawer" role="dialog" aria-modal="true" aria-labelledby="products-drawer-title"><header className="products-drawer-head"><div><span>{drawerMode === "create" ? "Новая карточка" : drawerMode === "edit" ? "Редактирование" : "Карточка продукта"}</span><strong id="products-drawer-title">{drawerMode === "create" ? "Добавить продукт" : selected?.name || "Загрузка"}</strong></div><button ref={closeButtonRef} type="button" onClick={() => closeDrawer()} aria-label="Закрыть"><X size={20} /></button></header><div className="products-drawer-body"><ProductDetails product={selected} products={data.items} actorName={actorName} onActorChange={setActorName} mode={drawerMode} setMode={setDrawerMode} saving={saving} onSave={saveProduct} onClose={() => closeDrawer()} onRefresh={() => selected && openProduct(selected.id, { updateRoute: false })} onMutate={mutate} /></div></aside></div> : null}
    </div>
  );
}
