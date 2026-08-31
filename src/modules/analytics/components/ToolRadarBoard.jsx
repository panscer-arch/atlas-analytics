import {
  ArrowUpRight,
  BookmarkPlus,
  Check,
  CircleAlert,
  ExternalLink,
  Filter,
  FlaskConical,
  Lightbulb,
  Plus,
  Radar,
  Search,
  ShieldX,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  TOOL_RADAR_CATEGORIES,
  TOOL_RADAR_DECISIONS,
  TOOL_RADAR_LEGACY_STORAGE_KEY,
  TOOL_RADAR_STORAGE_KEY,
  defaultToolRadarItems,
  migrateLegacyToolRadarItems,
} from "../data/toolRadarData";
import { loadServerContentResult, saveServerContent } from "../services/contentStore";

const EMPTY_DRAFT = {
  title: "",
  category: TOOL_RADAR_CATEGORIES[0],
  decision: "research",
  type: "Сервис",
  sourceUrl: "",
  productUrl: "",
  summary: "",
  atlasUse: "",
  caution: "",
};

const DECISION_ICONS = {
  adopt: Check,
  test: FlaskConical,
  research: Lightbulb,
  reference: Sparkles,
  reject: ShieldX,
};

function normalizeItems(value) {
  if (!Array.isArray(value)) return defaultToolRadarItems;
  return value.filter(Boolean).map((item, index) => ({
    ...EMPTY_DRAFT,
    ...item,
    id: item.id || `tool-${Date.now()}-${index}`,
  }));
}

function readLocalItems() {
  if (typeof window === "undefined") return defaultToolRadarItems;
  try {
    const saved = window.localStorage.getItem(TOOL_RADAR_STORAGE_KEY);
    if (saved) return normalizeItems(JSON.parse(saved));
    const legacySaved = window.localStorage.getItem(TOOL_RADAR_LEGACY_STORAGE_KEY);
    return legacySaved
      ? normalizeItems(migrateLegacyToolRadarItems(JSON.parse(legacySaved)))
      : defaultToolRadarItems;
  } catch {
    return defaultToolRadarItems;
  }
}

function ToolRadarBoard() {
  const [items, setItems] = useState(readLocalItems);
  const [query, setQuery] = useState("");
  const [decision, setDecision] = useState("all");
  const [category, setCategory] = useState("all");
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saveState, setSaveState] = useState("Загружаю…");
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function hydrateItems() {
      const currentResult = await loadServerContentResult(TOOL_RADAR_STORAGE_KEY);
      if (!mounted) return;

      if (currentResult.ok && currentResult.exists && Array.isArray(currentResult.value)) {
        const normalized = normalizeItems(currentResult.value);
        setItems(normalized);
        window.localStorage.setItem(TOOL_RADAR_STORAGE_KEY, JSON.stringify(normalized));
        hydratedRef.current = true;
        setSaveState("Сохранено на сервере");
        return;
      }

      if (!currentResult.ok) {
        hydratedRef.current = true;
        setSaveState("Сохранено локально");
        return;
      }

      const legacyResult = await loadServerContentResult(TOOL_RADAR_LEGACY_STORAGE_KEY);
      if (!mounted) return;
      if (!legacyResult.ok) {
        hydratedRef.current = true;
        setSaveState("Сохранено локально");
        return;
      }
      const migrated = legacyResult.ok && legacyResult.exists && Array.isArray(legacyResult.value)
        ? migrateLegacyToolRadarItems(legacyResult.value)
        : defaultToolRadarItems;
      const normalized = normalizeItems(migrated);
      setItems(normalized);
      window.localStorage.setItem(TOOL_RADAR_STORAGE_KEY, JSON.stringify(normalized));
      hydratedRef.current = true;
      const saved = await saveServerContent(TOOL_RADAR_STORAGE_KEY, normalized);
      if (mounted) setSaveState(saved ? "Сохранено на сервере" : "Сохранено локально");
    }

    hydrateItems();
    return () => {
      mounted = false;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  function persist(nextItems) {
    setItems(nextItems);
    window.localStorage.setItem(TOOL_RADAR_STORAGE_KEY, JSON.stringify(nextItems));
    if (!hydratedRef.current) return;
    setSaveState("Сохраняю…");
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      const ok = await saveServerContent(TOOL_RADAR_STORAGE_KEY, nextItems);
      setSaveState(ok ? "Сохранено на сервере" : "Сохранено локально");
    }, 450);
  }

  const counts = useMemo(() => Object.fromEntries(
    TOOL_RADAR_DECISIONS.map((item) => [item.id, items.filter((tool) => tool.decision === item.id).length]),
  ), [items]);

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ru");
    return items.filter((item) => {
      if (decision !== "all" && item.decision !== decision) return false;
      if (category !== "all" && item.category !== category) return false;
      if (!needle) return true;
      return [item.title, item.type, item.category, item.summary, item.atlasUse]
        .some((value) => String(value || "").toLocaleLowerCase("ru").includes(needle));
    });
  }, [category, decision, items, query]);

  function updateDecision(itemId, nextDecision) {
    persist(items.map((item) => (item.id === itemId ? { ...item, decision: nextDecision } : item)));
  }

  function addItem(event) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.sourceUrl.trim()) return;
    const nextItem = {
      ...draft,
      id: `tool-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: draft.title.trim(),
      sourceUrl: draft.sourceUrl.trim(),
      createdAt: new Date().toISOString(),
    };
    persist([nextItem, ...items]);
    setDraft(EMPTY_DRAFT);
    setIsAdding(false);
  }

  return (
    <section className="analytics-tool-radar">
      <header className="analytics-tool-radar-hero">
        <div className="analytics-tool-radar-hero-copy">
          <span className="analytics-tool-radar-kicker"><Radar size={16} /> CONTENT INTELLIGENCE</span>
          <h2>Радар инструментов</h2>
          <p>Сюда складываем сервисы, методы и идеи из роликов. Каждая находка получает понятное решение и конкретное применение для Atlas.</p>
        </div>
        <div className="analytics-tool-radar-hero-actions">
          <span className={`analytics-tool-radar-save ${saveState === "Сохранено локально" ? "is-local" : ""}`}>{saveState}</span>
          <button type="button" className="analytics-tool-radar-add" onClick={() => setIsAdding(true)}>
            <Plus size={18} /> Добавить находку
          </button>
        </div>
      </header>

      <div className="analytics-tool-radar-summary" aria-label="Сводка по решениям">
        {TOOL_RADAR_DECISIONS.map((item) => {
          const Icon = DECISION_ICONS[item.id];
          return (
            <button
              type="button"
              key={item.id}
              className={`analytics-tool-radar-stat is-${item.tone}${decision === item.id ? " is-active" : ""}`}
              onClick={() => setDecision(decision === item.id ? "all" : item.id)}
            >
              <span><Icon size={18} />{item.label}</span>
              <strong>{counts[item.id] || 0}</strong>
            </button>
          );
        })}
      </div>

      <div className="analytics-tool-radar-filters">
        <label className="analytics-tool-radar-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти инструмент, метод или задачу" />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="Очистить поиск"><X size={16} /></button> : null}
        </label>
        <label className="analytics-tool-radar-select">
          <Filter size={17} />
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Все категории</option>
            {TOOL_RADAR_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <span className="analytics-tool-radar-found">Найдено: {visibleItems.length}</span>
      </div>

      {isAdding ? (
        <form className="analytics-tool-radar-form" onSubmit={addItem}>
          <div className="analytics-tool-radar-form-head">
            <div>
              <span><BookmarkPlus size={17} /> Новая находка</span>
              <h3>Добавить инструмент из ролика</h3>
            </div>
            <button type="button" onClick={() => setIsAdding(false)} aria-label="Закрыть форму"><X size={19} /></button>
          </div>
          <div className="analytics-tool-radar-form-grid">
            <label><span>Название *</span><input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Например, TrendSee" /></label>
            <label><span>Ссылка на ролик *</span><input required type="url" value={draft.sourceUrl} onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })} placeholder="https://…" /></label>
            <label><span>Категория</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{TOOL_RADAR_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Решение</span><select value={draft.decision} onChange={(event) => setDraft({ ...draft, decision: event.target.value })}>{TOOL_RADAR_DECISIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="is-wide"><span>Что это</span><textarea rows="3" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} placeholder="Кратко и простыми словами" /></label>
            <label className="is-wide"><span>Как применить в Atlas</span><textarea rows="3" value={draft.atlasUse} onChange={(event) => setDraft({ ...draft, atlasUse: event.target.value })} placeholder="Конкретный сценарий применения" /></label>
          </div>
          <div className="analytics-tool-radar-form-actions">
            <button type="button" onClick={() => setIsAdding(false)}>Отмена</button>
            <button type="submit"><Plus size={17} /> Добавить</button>
          </div>
        </form>
      ) : null}

      <div className="analytics-tool-radar-grid">
        {visibleItems.map((item) => {
          const decisionMeta = TOOL_RADAR_DECISIONS.find((entry) => entry.id === item.decision) || TOOL_RADAR_DECISIONS[2];
          const DecisionIcon = DECISION_ICONS[decisionMeta.id];
          return (
            <article className="analytics-tool-radar-card" key={item.id}>
              <div className="analytics-tool-radar-card-head">
                <div>
                  <span className="analytics-tool-radar-type">{item.type}</span>
                  <h3>{item.title}</h3>
                  <p>{item.category}</p>
                </div>
                <span className={`analytics-tool-radar-decision is-${decisionMeta.tone}`}><DecisionIcon size={15} />{decisionMeta.label}</span>
              </div>
              <p className="analytics-tool-radar-summary-copy">{item.summary}</p>
              <div className="analytics-tool-radar-use">
                <span>Для Atlas</span>
                <p>{item.atlasUse}</p>
              </div>
              {item.caution ? <div className="analytics-tool-radar-caution"><CircleAlert size={16} /><p>{item.caution}</p></div> : null}
              <div className="analytics-tool-radar-card-footer">
                <select aria-label={`Решение по ${item.title}`} value={item.decision} onChange={(event) => updateDecision(item.id, event.target.value)}>
                  {TOOL_RADAR_DECISIONS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
                </select>
                <nav aria-label={`Ссылки ${item.title}`}>
                  {item.productUrl ? <a href={item.productUrl} target="_blank" rel="noreferrer">Сервис <ExternalLink size={15} /></a> : null}
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer">Источник <ArrowUpRight size={15} /></a>
                </nav>
              </div>
            </article>
          );
        })}
      </div>

      {!visibleItems.length ? (
        <div className="analytics-tool-radar-empty">
          <Radar size={30} />
          <h3>В этой выборке пока пусто</h3>
          <p>Сбросьте фильтры или добавьте новую находку из ролика.</p>
        </div>
      ) : null}
    </section>
  );
}

export default ToolRadarBoard;
