import { useEffect, useMemo, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import {
  ATLAS_CREATIVE_CATEGORIES,
  ATLAS_CREATIVE_STATUSES,
  ATLAS_CREATIVE_STORAGE_KEY,
  defaultAtlasCreatives,
} from "../data/atlasCreativeData";
import { loadServerContent, saveServerContent } from "../services/contentStore";

function hydrateCreatives(value) {
  if (!Array.isArray(value)) return defaultAtlasCreatives;
  const defaultsById = new Map(defaultAtlasCreatives.map((item) => [item.id, item]));
  const savedById = new Map(value.map((item) => [item.id, item]));
  return [...defaultAtlasCreatives, ...value.filter((item) => !defaultsById.has(item.id))].map((item) => ({
    ...(defaultsById.get(item.id) || {}),
    ...(savedById.get(item.id) || {}),
  }));
}

function AtlasCreativesPanel() {
  const [items, setItems] = useState(defaultAtlasCreatives);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [status, setStatus] = useState("Все");
  const [saveState, setSaveState] = useState("Загрузка...");
  const [copiedId, setCopiedId] = useState("");
  const [draft, setDraft] = useState({ title: "", category: "SEO", channel: "", copy: "" });

  useEffect(() => {
    let mounted = true;
    loadServerContent(ATLAS_CREATIVE_STORAGE_KEY).then((saved) => {
      if (!mounted) return;
      setItems(hydrateCreatives(saved));
      setSaveState(saved ? "Загружено с сервера" : "Базовая библиотека");
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (saveState === "Загрузка...") return undefined;
    const timer = window.setTimeout(() => {
      setSaveState("Сохраняю...");
      saveServerContent(ATLAS_CREATIVE_STORAGE_KEY, items).then((ok) => setSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен"));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [items]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "Все" && item.category !== category) return false;
      if (status !== "Все" && item.status !== status) return false;
      if (!needle) return true;
      return [item.title, item.category, item.channel, item.copy, item.notes].some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [category, items, query, status]);

  const metrics = useMemo(() => ({
    total: items.length,
    ready: items.filter((item) => item.status === "Готово").length,
    review: items.filter((item) => item.status === "На вычитке").length,
    published: items.filter((item) => item.status === "Опубликовано").length,
  }), [items]);

  function updateItem(id, patch) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function copyItem(item) {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(item.copy);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId((current) => (current === item.id ? "" : current)), 1400);
  }

  function addCreative() {
    if (!draft.title.trim() || !draft.copy.trim()) return;
    setItems((current) => [{
      id: `atlas-creative-${Date.now()}`,
      title: draft.title.trim(),
      category: draft.category,
      channel: draft.channel.trim() || "Новый формат",
      status: "Черновик",
      language: "EN",
      copy: draft.copy.trim(),
      notes: "Добавлено вручную.",
    }, ...current]);
    setDraft({ title: "", category: "SEO", channel: "", copy: "" });
  }

  return (
    <section className="analytics-atlas-creatives">
      <header className="analytics-atlas-creatives-hero analytics-surface">
        <div>
          <p className="analytics-kicker">Atlas creative library</p>
          <h2>Креативы Atlas для SEO и продвижения</h2>
          <p>Одна библиотека для SEO, link preview, Telegram, YouTube, X, лендинга и рекламных баннеров. Тексты можно вычитать, скопировать и передать в публикацию.</p>
        </div>
        <div className="analytics-atlas-creatives-save">
          <span>{saveState}</span>
          <small>Изменения сохраняются на сервере</small>
        </div>
      </header>

      <div className="analytics-atlas-creatives-metrics" aria-label="Сводка креативов">
        <article><span>Всего материалов</span><strong>{metrics.total}</strong></article>
        <article><span>Готовы</span><strong className="is-success">{metrics.ready}</strong></article>
        <article><span>На вычитке</span><strong className="is-warning">{metrics.review}</strong></article>
        <article><span>Опубликовано</span><strong>{metrics.published}</strong></article>
      </div>

      <section className="analytics-atlas-creatives-add analytics-surface">
        <div className="analytics-atlas-creatives-section-head">
          <div><p className="analytics-kicker">Новый материал</p><h3>Добавить креатив</h3></div>
          <AnalyticsActionButton variant="primary" onClick={addCreative} disabled={!draft.title.trim() || !draft.copy.trim()}>Добавить</AnalyticsActionButton>
        </div>
        <div className="analytics-atlas-creatives-add-grid">
          <input className="analytics-launch-input" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Название материала" />
          <select className="analytics-launch-input" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>{ATLAS_CREATIVE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
          <input className="analytics-launch-input" value={draft.channel} onChange={(event) => setDraft((current) => ({ ...current, channel: event.target.value }))} placeholder="Канал / формат" />
          <textarea className="analytics-launch-input" value={draft.copy} onChange={(event) => setDraft((current) => ({ ...current, copy: event.target.value }))} placeholder="Текст креатива" />
        </div>
      </section>

      <section className="analytics-atlas-creatives-library analytics-surface">
        <div className="analytics-atlas-creatives-section-head">
          <div><p className="analytics-kicker">Рабочая библиотека</p><h3>Материалы и тексты</h3></div>
          <div className="analytics-atlas-creatives-filters">
            <input className="analytics-launch-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по тексту" />
            <select className="analytics-launch-input" value={category} onChange={(event) => setCategory(event.target.value)}><option>Все</option>{ATLAS_CREATIVE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
            <select className="analytics-launch-input" value={status} onChange={(event) => setStatus(event.target.value)}><option>Все</option>{ATLAS_CREATIVE_STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
        </div>
        <div className="analytics-atlas-creatives-list">
          {filteredItems.map((item) => (
            <article key={item.id} className="analytics-atlas-creative-card">
              <div className="analytics-atlas-creative-card-head">
                <div><span>{item.category} · {item.channel} · {item.language}</span><h4>{item.title}</h4></div>
                <select value={item.status} onChange={(event) => updateItem(item.id, { status: event.target.value })} aria-label={`Статус: ${item.title}`}>{ATLAS_CREATIVE_STATUSES.map((value) => <option key={value}>{value}</option>)}</select>
              </div>
              <textarea className="analytics-launch-input analytics-atlas-creative-copy" value={item.copy} onChange={(event) => updateItem(item.id, { copy: event.target.value })} aria-label={`Текст: ${item.title}`} />
              <div className="analytics-atlas-creative-card-foot"><small>{item.notes}</small><AnalyticsActionButton size="sm" variant={copiedId === item.id ? "success" : "secondary"} onClick={() => copyItem(item)}>{copiedId === item.id ? "Скопировано" : "Копировать"}</AnalyticsActionButton></div>
            </article>
          ))}
          {!filteredItems.length ? <p className="analytics-atlas-creatives-empty">По выбранным фильтрам материалов нет.</p> : null}
        </div>
      </section>
    </section>
  );
}

export default AtlasCreativesPanel;
