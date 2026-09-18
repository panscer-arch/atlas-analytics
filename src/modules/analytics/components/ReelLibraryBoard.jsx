import { ArrowUpRight, CircleAlert, Pencil, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { TOOL_RADAR_CATEGORIES, TOOL_RADAR_DECISIONS } from "../data/toolRadarData";
import { REEL_LIBRARY_STORAGE_KEY, mergeReelLibraryItems } from "../data/reelLibraryData";
import { loadServerContentResult, saveServerContent } from "../services/contentStore";
import "../styles/reel-library.css";

const EMPTY_DRAFT = {
  title: "",
  type: "Ролик",
  sourceUrl: "",
  productUrl: "",
  category: "Контент",
  decision: "research",
  summary: "",
  atlasUse: "",
  caution: "",
};

function readLocalItems() {
  try {
    const raw = window.localStorage.getItem(REEL_LIBRARY_STORAGE_KEY);
    return mergeReelLibraryItems(raw ? JSON.parse(raw) : null);
  } catch {
    return mergeReelLibraryItems(null);
  }
}

function isWebUrl(value) {
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function sourceLabel(item) {
  return item.sourceUrl.includes("/reel/") ? "Ролик" : "Источник";
}

export default function ReelLibraryBoard() {
  const [items, setItems] = useState(readLocalItems);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState("Загрузка...");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [decision, setDecision] = useState("all");
  const [draft, setDraft] = useState(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let mounted = true;
    loadServerContentResult(REEL_LIBRARY_STORAGE_KEY).then((result) => {
      if (!mounted) return;
      if (result.ok && result.exists && Array.isArray(result.value)) {
        const merged = mergeReelLibraryItems(result.value);
        setItems(merged);
        try { window.localStorage.setItem(REEL_LIBRARY_STORAGE_KEY, JSON.stringify(merged)); } catch { /* In-memory copy remains usable. */ }
        setSaveState("Загружено с сервера");
      } else {
        setSaveState("Доступно локально");
      }
      setReady(true);
    });
    return () => { mounted = false; };
  }, []);

  async function persist(nextItems) {
    setItems(nextItems);
    try { window.localStorage.setItem(REEL_LIBRARY_STORAGE_KEY, JSON.stringify(nextItems)); } catch { /* Server save still proceeds. */ }
    setSaveState("Сохраняю...");
    const saved = await saveServerContent(REEL_LIBRARY_STORAGE_KEY, nextItems);
    setSaveState(saved ? "Сохранено на сервере" : "Сохранено локально");
  }

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ru");
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (decision !== "all" && item.decision !== decision) return false;
      return !needle || [item.title, item.type, item.summary, item.atlasUse, item.caution]
        .some((value) => String(value || "").toLocaleLowerCase("ru").includes(needle));
    });
  }, [items, query, category, decision]);

  function openEditor(item = null) {
    setDraft(item ? { ...EMPTY_DRAFT, ...item } : { ...EMPTY_DRAFT });
    setFormError("");
    window.requestAnimationFrame(() => document.querySelector(".reel-library-editor")?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }

  function submitItem(event) {
    event.preventDefault();
    if (!draft || !ready) return;
    if (!isWebUrl(draft.sourceUrl) || (draft.productUrl && !isWebUrl(draft.productUrl))) {
      setFormError("Укажите ссылку с http:// или https://.");
      return;
    }
    const item = {
      ...draft,
      id: draft.id || `reel-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: draft.title.trim(),
      type: draft.type.trim() || "Ролик",
      sourceUrl: draft.sourceUrl.trim(),
      productUrl: draft.productUrl.trim(),
      summary: draft.summary.trim(),
      atlasUse: draft.atlasUse.trim(),
      caution: draft.caution.trim(),
    };
    const next = draft.id
      ? items.map((entry) => entry.id === draft.id ? item : entry)
      : [item, ...items];
    void persist(next);
    setDraft(null);
  }

  function changeDecision(itemId, nextDecision) {
    void persist(items.map((item) => item.id === itemId ? { ...item, decision: nextDecision } : item));
  }

  return (
    <section className="reel-library" aria-label="Библиотека роликов">
      <header className="reel-library-heading">
        <div>
          <h2>Ролики</h2>
          <p>{items.length} материалов · {saveState}</p>
        </div>
        <Button type="button" className="reel-library-primary" disabled={!ready} onClick={() => openEditor()}>
          <Plus size={16} /> Добавить ролик
        </Button>
      </header>

      <div className="reel-library-toolbar">
        <label className="reel-library-search">
          <Search size={17} aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти ролик или тему" aria-label="Поиск роликов" />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="Очистить поиск"><X size={15} /></button> : null}
        </label>
        <label className="reel-library-filter"><span>Категория</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Все категории</option>
            {TOOL_RADAR_CATEGORIES.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="reel-library-filter"><span>Решение</span>
          <select value={decision} onChange={(event) => setDecision(event.target.value)}>
            <option value="all">Все решения</option>
            {TOOL_RADAR_DECISIONS.map((value) => <option key={value.id} value={value.id}>{value.label}</option>)}
          </select>
        </label>
        <span className="reel-library-found">Найдено: {visibleItems.length}</span>
      </div>

      {draft ? (
        <form className="reel-library-editor" onSubmit={submitItem}>
          <div className="reel-library-editor-heading">
            <h3>{draft.id ? "Изменить материал" : "Новый материал"}</h3>
            <Button type="button" variant="ghost" size="icon" onClick={() => setDraft(null)} aria-label="Закрыть форму" title="Закрыть"><X size={18} /></Button>
          </div>
          <div className="reel-library-fields">
            <label>Название *<Input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
            <label>Ссылка на ролик или пост *<Input required type="url" value={draft.sourceUrl} onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })} /></label>
            <label>Тип материала<Input value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} /></label>
            <label>Категория<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{TOOL_RADAR_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Решение<select value={draft.decision} onChange={(event) => setDraft({ ...draft, decision: event.target.value })}>{TOOL_RADAR_DECISIONS.map((value) => <option key={value.id} value={value.id}>{value.label}</option>)}</select></label>
            <label>Ссылка на сервис<Input type="url" value={draft.productUrl} onChange={(event) => setDraft({ ...draft, productUrl: event.target.value })} /></label>
            <label className="is-wide">Что показано *<textarea required rows="2" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
            <label className="is-wide">Где применить *<textarea required rows="2" value={draft.atlasUse} onChange={(event) => setDraft({ ...draft, atlasUse: event.target.value })} /></label>
            <label className="is-wide">Что проверить<textarea rows="2" value={draft.caution} onChange={(event) => setDraft({ ...draft, caution: event.target.value })} /></label>
          </div>
          {formError ? <p className="reel-library-error" role="alert">{formError}</p> : null}
          <div className="reel-library-editor-actions">
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>Отмена</Button>
            <Button type="submit" className="reel-library-primary">Сохранить</Button>
          </div>
        </form>
      ) : null}

      <div className="reel-library-list">
        {visibleItems.map((item) => (
            <article className="reel-library-row" key={item.id}>
              <div className="reel-library-main">
                <div className="reel-library-meta"><span>{item.category}</span><span>{item.type}</span></div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                {item.caution ? <p className="reel-library-caution"><CircleAlert size={15} aria-hidden="true" />{item.caution}</p> : null}
              </div>
              <div className="reel-library-use"><span>Применение</span><p>{item.atlasUse}</p></div>
              <div className="reel-library-actions">
                <select value={item.decision} disabled={!ready} onChange={(event) => changeDecision(item.id, event.target.value)} aria-label={`Решение по ${item.title}`} data-decision={item.decision}>
                  {TOOL_RADAR_DECISIONS.map((value) => <option key={value.id} value={value.id}>{value.label}</option>)}
                </select>
                <div>
                  <Button type="button" variant="ghost" size="icon" disabled={!ready} onClick={() => openEditor(item)} aria-label={`Изменить ${item.title}`} title="Изменить"><Pencil size={16} /></Button>
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{sourceLabel(item)} <ArrowUpRight size={15} /></a>
                </div>
                {item.productUrl ? <a href={item.productUrl} target="_blank" rel="noopener noreferrer">Сервис <ArrowUpRight size={15} /></a> : null}
              </div>
            </article>
        ))}
        {!visibleItems.length ? <p className="reel-library-empty">Ничего не найдено. Измените поиск или фильтры.</p> : null}
      </div>
    </section>
  );
}
