import {
  Archive,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  ClipboardCopy,
  Eye,
  FileText,
  Film,
  Globe2,
  Instagram,
  Languages,
  MessageCircle,
  MousePointerClick,
  Plus,
  Save,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_REELS_CAMPAIGN_STATE,
  REELS_CAMPAIGN_LOCAL_STORAGE_KEY,
  REELS_CAMPAIGN_STORAGE_KEY,
  REELS_PIPELINE_COLUMNS,
  REELS_PRIORITY_OPTIONS,
  REELS_STATUS_OPTIONS,
  createEmptyReelsIdea,
  hydrateReelsCampaignState,
} from "../data/reelsCampaignData";
import { loadServerContent, saveServerContent } from "../services/contentStore";
import "../styles/reels-campaign.css";

const VIEW_TABS = [
  { id: "pipeline", label: "Производство", icon: Clapperboard },
  { id: "calendar", label: "Календарь", icon: CalendarDays },
  { id: "analytics", label: "Аналитика", icon: BarChart3 },
  { id: "rules", label: "Правила", icon: ShieldCheck },
];

const METRIC_FIELDS = [
  ["views", "Просмотры", Eye],
  ["reach", "Охват", Users],
  ["shares", "Отправки", Send],
  ["saves", "Сохранения", Save],
  ["profileVisits", "Профиль", MousePointerClick],
  ["dmStarts", "DM", MessageCircle],
  ["registrations", "Регистрации", UserPlus],
];

function readLocalState() {
  if (typeof window === "undefined") return DEFAULT_REELS_CAMPAIGN_STATE;
  try {
    const saved = JSON.parse(window.localStorage.getItem(REELS_CAMPAIGN_LOCAL_STORAGE_KEY) || "null");
    return hydrateReelsCampaignState(saved);
  } catch {
    return DEFAULT_REELS_CAMPAIGN_STATE;
  }
}

function normalizeNumber(value) {
  const parsed = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatCompact(value) {
  return new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 }).format(normalizeNumber(value));
}

function formatDate(value) {
  if (!value) return "Дата не назначена";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function statusTone(status) {
  if (["Опубликовано", "Анализ", "Масштабировать"].includes(status)) return "success";
  if (["Съёмка", "Монтаж"].includes(status)) return "production";
  if (["Сценарий", "На согласовании"].includes(status)) return "review";
  if (status === "Архив") return "muted";
  return "idea";
}

function buildBrief(idea) {
  return [
    `${idea.code} — ${idea.title}`,
    idea.subtitle,
    `Market: ${idea.market}`,
    `Language: ${idea.language}`,
    `Format: ${idea.format} · ${idea.duration}`,
    `Hook: ${idea.hook}`,
    `Concept: ${idea.concept}`,
    `Shot plan:\n${idea.shotPlan}`,
    `CTA: ${idea.cta}`,
    `Target: ${idea.target}`,
    `Compliance: ${idea.compliance}`,
  ].filter(Boolean).join("\n\n");
}

function MetricCard({ icon: Icon, label, value, note }) {
  return (
    <article className="reels-metric">
      <span className="reels-metric-icon" aria-hidden="true"><Icon size={17} /></span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function ReelsCard({ idea, onOpen, onStatusChange }) {
  return (
    <article className="reels-card">
      <button type="button" className="reels-card-main" onClick={() => onOpen(idea.id)}>
        <span className="reels-card-code">{idea.code}</span>
        <strong>{idea.title}</strong>
        <p>{idea.hook || idea.subtitle}</p>
        <span className="reels-card-meta"><Globe2 size={13} />{idea.market}</span>
        <span className="reels-card-meta"><Languages size={13} />{idea.language}</span>
      </button>
      <div className="reels-card-footer">
        <select
          className={`reels-status is-${statusTone(idea.status)}`}
          value={idea.status}
          onChange={(event) => onStatusChange(idea.id, event.target.value)}
          aria-label={`Статус ${idea.title}`}
        >
          {REELS_STATUS_OPTIONS.filter((status) => status !== "Архив").map((status) => <option key={status}>{status}</option>)}
        </select>
        <button type="button" onClick={() => onOpen(idea.id)} aria-label={`Открыть ${idea.title}`}><ChevronRight size={16} /></button>
      </div>
    </article>
  );
}

function IdeaEditor({ idea, onArchive, onChange, onClose }) {
  const [copyState, setCopyState] = useState("Скопировать ТЗ");

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(buildBrief(idea));
      setCopyState("ТЗ скопировано");
      window.setTimeout(() => setCopyState("Скопировать ТЗ"), 1800);
    } catch {
      setCopyState("Не удалось скопировать");
    }
  }

  function updateMetric(metric, value) {
    onChange({ metrics: { ...idea.metrics, [metric]: normalizeNumber(value) } });
  }

  return (
    <div className="reels-editor-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <aside className="reels-editor" role="dialog" aria-modal="true" aria-label={`Карточка ${idea.title}`}>
        <header className="reels-editor-head">
          <div>
            <span>{idea.code}</span>
            <strong>Карточка Reel</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть карточку"><X size={19} /></button>
        </header>

        <div className="reels-editor-scroll">
          <div className="reels-editor-title-row">
            <label>
              Название
              <input value={idea.title} onChange={(event) => onChange({ title: event.target.value })} />
            </label>
            <label>
              Подзаголовок
              <input value={idea.subtitle} onChange={(event) => onChange({ subtitle: event.target.value })} />
            </label>
          </div>

          <div className="reels-editor-grid is-four">
            <label>Статус<select value={idea.status} onChange={(event) => onChange({ status: event.target.value })}>{REELS_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label>Приоритет<select value={idea.priority} onChange={(event) => onChange({ priority: event.target.value })}>{REELS_PRIORITY_OPTIONS.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
            <label>Ответственный<input value={idea.owner} onChange={(event) => onChange({ owner: event.target.value })} placeholder="Назначить" /></label>
            <label>Дата публикации<input type="date" value={idea.publishDate} onChange={(event) => onChange({ publishDate: event.target.value })} /></label>
          </div>

          <section className="reels-editor-section">
            <div className="reels-editor-section-head"><Globe2 size={16} /><strong>Международная версия</strong></div>
            <div className="reels-editor-grid is-three">
              <label>Рынок<input value={idea.market} onChange={(event) => onChange({ market: event.target.value })} /></label>
              <label>Master-язык<input value={idea.language} onChange={(event) => onChange({ language: event.target.value })} /></label>
              <label>Локализации<input value={idea.localizations} onChange={(event) => onChange({ localizations: event.target.value })} /></label>
              <label>Формат<input value={idea.format} onChange={(event) => onChange({ format: event.target.value })} /></label>
              <label>Длительность<input value={idea.duration} onChange={(event) => onChange({ duration: event.target.value })} /></label>
              <label>Каналы<input value={(idea.channels || []).join(" · ")} onChange={(event) => onChange({ channels: event.target.value.split("·").map((item) => item.trim()).filter(Boolean) })} /></label>
            </div>
          </section>

          <section className="reels-editor-section">
            <div className="reels-editor-section-head"><Sparkles size={16} /><strong>Сценарий</strong></div>
            <label>Hook<input value={idea.hook} onChange={(event) => onChange({ hook: event.target.value })} /></label>
            <label>Идея<textarea rows="4" value={idea.concept} onChange={(event) => onChange({ concept: event.target.value })} /></label>
            <label>Покадровый план<textarea rows="7" value={idea.shotPlan} onChange={(event) => onChange({ shotPlan: event.target.value })} /></label>
            <div className="reels-editor-grid is-two">
              <label>CTA<textarea rows="3" value={idea.cta} onChange={(event) => onChange({ cta: event.target.value })} /></label>
              <label>Целевой результат<textarea rows="3" value={idea.target} onChange={(event) => onChange({ target: event.target.value })} /></label>
            </div>
          </section>

          <section className="reels-editor-section is-risk">
            <div className="reels-editor-section-head"><ShieldCheck size={16} /><strong>Проверка до публикации</strong></div>
            <label>Ограничения и compliance<textarea rows="4" value={idea.compliance} onChange={(event) => onChange({ compliance: event.target.value })} /></label>
            <label>Рабочие заметки<textarea rows="3" value={idea.notes} onChange={(event) => onChange({ notes: event.target.value })} /></label>
          </section>

          <section className="reels-editor-section">
            <div className="reels-editor-section-head"><BarChart3 size={16} /><strong>Результат</strong></div>
            <label>Ссылка на публикацию<input type="url" value={idea.publicationUrl} onChange={(event) => onChange({ publicationUrl: event.target.value })} placeholder="https://instagram.com/reel/..." /></label>
            <div className="reels-editor-metrics">
              {METRIC_FIELDS.map(([field, label, Icon]) => (
                <label key={field}><Icon size={14} />{label}<input type="number" min="0" value={idea.metrics?.[field] || 0} onChange={(event) => updateMetric(field, event.target.value)} /></label>
              ))}
            </div>
          </section>
        </div>

        <footer className="reels-editor-actions">
          <button type="button" className="is-archive" onClick={onArchive}><Archive size={16} />В архив</button>
          <button type="button" className="is-copy" onClick={copyBrief}><ClipboardCopy size={16} />{copyState}</button>
          <button type="button" className="is-done" onClick={onClose}><CheckCircle2 size={16} />Готово</button>
        </footer>
      </aside>
    </div>
  );
}

export default function ReelsCampaignBoard() {
  const [campaign, setCampaign] = useState(readLocalState);
  const [activeView, setActiveView] = useState("pipeline");
  const [selectedIdeaId, setSelectedIdeaId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Все статусы");
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Загрузка…");

  useEffect(() => {
    let mounted = true;
    loadServerContent(REELS_CAMPAIGN_STORAGE_KEY).then((saved) => {
      if (!mounted) return;
      const next = saved ? hydrateReelsCampaignState(saved) : readLocalState();
      setCampaign(next);
      setSaveState(saved ? "Загружено с сервера" : "Локальный рабочий план");
      setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    const next = { ...campaign, updatedAt: new Date().toISOString() };
    try {
      window.localStorage.setItem(REELS_CAMPAIGN_LOCAL_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The board remains usable in memory when browser storage is unavailable.
    }
    setSaveState("Сохраняем…");
    const timer = window.setTimeout(() => {
      saveServerContent(REELS_CAMPAIGN_STORAGE_KEY, next).then((ok) => {
        setSaveState(ok ? "Сохранено для команды" : "Сохранено в этом браузере");
      });
    }, 550);
    return () => window.clearTimeout(timer);
  }, [campaign, isLoaded]);

  const activeIdeas = useMemo(() => campaign.ideas.filter((idea) => idea.status !== "Архив"), [campaign.ideas]);
  const filteredIdeas = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activeIdeas.filter((idea) => {
      if (statusFilter !== "Все статусы" && idea.status !== statusFilter) return false;
      if (!query) return true;
      return [idea.code, idea.title, idea.subtitle, idea.market, idea.language, idea.hook]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [activeIdeas, search, statusFilter]);

  const selectedIdea = campaign.ideas.find((idea) => idea.id === selectedIdeaId) || null;
  const totals = useMemo(() => activeIdeas.reduce((result, idea) => ({
    views: result.views + normalizeNumber(idea.metrics?.views),
    shares: result.shares + normalizeNumber(idea.metrics?.shares),
    dmStarts: result.dmStarts + normalizeNumber(idea.metrics?.dmStarts),
    registrations: result.registrations + normalizeNumber(idea.metrics?.registrations),
  }), { views: 0, shares: 0, dmStarts: 0, registrations: 0 }), [activeIdeas]);

  const planned = activeIdeas.filter((idea) => idea.publishDate).length;
  const inProduction = activeIdeas.filter((idea) => ["Съёмка", "Монтаж"].includes(idea.status)).length;
  const published = activeIdeas.filter((idea) => ["Опубликовано", "Анализ", "Масштабировать"].includes(idea.status)).length;

  function patchCampaign(patch) {
    setCampaign((current) => ({ ...current, ...patch }));
  }

  function updateIdea(id, patch) {
    setCampaign((current) => ({
      ...current,
      ideas: current.ideas.map((idea) => idea.id === id ? { ...idea, ...patch } : idea),
    }));
  }

  function addIdea() {
    const next = createEmptyReelsIdea();
    setCampaign((current) => ({ ...current, ideas: [next, ...current.ideas] }));
    setSelectedIdeaId(next.id);
  }

  function archiveSelectedIdea() {
    if (!selectedIdea) return;
    updateIdea(selectedIdea.id, { status: "Архив" });
    setSelectedIdeaId("");
  }

  return (
    <section className="analytics-reels-studio">
      <header className="reels-studio-header analytics-surface">
        <div className="reels-studio-heading">
          <span className="reels-studio-mark" aria-hidden="true"><Clapperboard size={22} /></span>
          <div>
            <p className="analytics-kicker">International short-form growth</p>
            <h2>Atlas Reels Studio</h2>
            <p>Идеи, сценарии, производство и результаты международных коротких видео в одной рабочей вкладке.</p>
          </div>
        </div>
        <div className="reels-studio-actions">
          <span className="reels-save-state"><i />{saveState}</span>
          <button type="button" onClick={addIdea}><Plus size={17} />Новая идея</button>
        </div>
      </header>

      <section className="reels-campaign-strip analytics-surface" aria-label="Параметры кампании">
        <label>Кампания<input value={campaign.campaignName} onChange={(event) => patchCampaign({ campaignName: event.target.value })} /></label>
        <label>Цель<input value={campaign.objective} onChange={(event) => patchCampaign({ objective: event.target.value })} /></label>
        <label>Master-язык<input value={campaign.masterLanguage} onChange={(event) => patchCampaign({ masterLanguage: event.target.value })} /></label>
        <label>Ответственный<input value={campaign.owner} onChange={(event) => patchCampaign({ owner: event.target.value })} placeholder="Назначить" /></label>
      </section>

      <div className="reels-studio-metrics">
        <MetricCard icon={Sparkles} label="Идей" value={activeIdeas.length} note="международный пилот" />
        <MetricCard icon={CalendarDays} label="В календаре" value={planned} note="рекомендуемые даты" />
        <MetricCard icon={Film} label="В производстве" value={inProduction} note="съёмка или монтаж" />
        <MetricCard icon={Instagram} label="Опубликовано" value={published} note="только факт" />
        <MetricCard icon={Eye} label="Просмотры" value={formatCompact(totals.views)} note="внесённые данные" />
        <MetricCard icon={UserPlus} label="Регистрации" value={formatCompact(totals.registrations)} note="атрибутировано" />
      </div>

      <nav className="reels-studio-tabs analytics-surface" role="tablist" aria-label="Разделы Reels Studio">
        {VIEW_TABS.map((tab) => {
          const Icon = tab.icon;
          return <button key={tab.id} type="button" role="tab" aria-selected={activeView === tab.id} className={activeView === tab.id ? "is-active" : ""} onClick={() => setActiveView(tab.id)}><Icon size={16} />{tab.label}</button>;
        })}
      </nav>

      {activeView === "pipeline" ? (
        <>
          <div className="reels-toolbar analytics-surface">
            <label className="reels-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти идею, рынок или hook" /></label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Фильтр статусов"><option>Все статусы</option>{REELS_STATUS_OPTIONS.filter((status) => status !== "Архив").map((status) => <option key={status}>{status}</option>)}</select>
            <span><Globe2 size={15} />English master · локализация победителей</span>
          </div>
          <div className="reels-pipeline" aria-label="Производственный pipeline">
            {REELS_PIPELINE_COLUMNS.map((column) => {
              const ideas = filteredIdeas.filter((idea) => column.statuses.includes(idea.status));
              return (
                <section key={column.id} className="reels-pipeline-column">
                  <header><strong>{column.label}</strong><span>{ideas.length}</span></header>
                  <div>
                    {ideas.map((idea) => <ReelsCard key={idea.id} idea={idea} onOpen={setSelectedIdeaId} onStatusChange={(id, status) => updateIdea(id, { status })} />)}
                    {!ideas.length ? <p className="reels-empty">Здесь пока нет карточек</p> : null}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      ) : null}

      {activeView === "calendar" ? (
        <section className="reels-calendar analytics-surface">
          <header><div><p className="analytics-kicker">Suggested publishing rhythm</p><h3>Первые пять международных выпусков</h3></div><span>Даты можно менять в карточках</span></header>
          <div className="reels-calendar-list">
            {[...activeIdeas].sort((first, second) => String(first.publishDate).localeCompare(String(second.publishDate))).map((idea) => (
              <button key={idea.id} type="button" onClick={() => setSelectedIdeaId(idea.id)}>
                <time dateTime={idea.publishDate}>{formatDate(idea.publishDate)}</time>
                <span><strong>{idea.code} · {idea.title}</strong><small>{idea.market} · {idea.language}</small></span>
                <em className={`is-${statusTone(idea.status)}`}>{idea.status}</em>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {activeView === "analytics" ? (
        <section className="reels-results analytics-surface">
          <header><div><p className="analytics-kicker">No invented performance</p><h3>Фактические результаты роликов</h3><p>Нули остаются нулями, пока команда не внесёт данные публикации.</p></div><span>{totals.shares} отправок · {totals.dmStarts} DM</span></header>
          <div className="reels-results-table-wrap">
            <table>
              <thead><tr><th>Reel</th><th>Статус</th>{METRIC_FIELDS.map(([field, label]) => <th key={field}>{label}</th>)}</tr></thead>
              <tbody>{activeIdeas.map((idea) => <tr key={idea.id} onClick={() => setSelectedIdeaId(idea.id)}><td><strong>{idea.code} · {idea.title}</strong><small>{idea.market}</small></td><td><span className={`reels-table-status is-${statusTone(idea.status)}`}>{idea.status}</span></td>{METRIC_FIELDS.map(([field]) => <td key={field}>{normalizeNumber(idea.metrics?.[field]).toLocaleString("ru-RU")}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeView === "rules" ? (
        <div className="reels-rules">
          <section className="analytics-surface">
            <div className="reels-rule-icon is-green"><Share2 size={18} /></div>
            <h3>Что делаем вирусным</h3>
            <ul><li>Понятность сложного Web3</li><li>Самостоятельную проверку</li><li>Честный спор со скептиком</li><li>Людей и международное сообщество</li><li>Процесс разработки Atlas</li></ul>
          </section>
          <section className="analytics-surface">
            <div className="reels-rule-icon is-red"><ShieldCheck size={18} /></div>
            <h3>Что не публикуем</h3>
            <ul><li>Гарантии и прогнозы прибыли</li><li>«Вложил 100 — получил 105»</li><li>Ложную полную децентрализацию</li><li>Аудит как отсутствие риска</li><li>Постановочные отзывы и скрытую рекламу</li></ul>
          </section>
          <section className="analytics-surface reels-funnel-rule">
            <div className="reels-rule-icon is-orange"><FileText size={18} /></div>
            <h3>Куда ведёт Reel</h3>
            <div className="reels-funnel-line"><span>Reel</span><ChevronRight /><span>Профиль</span><ChevronRight /><span>Объяснение</span><ChevronRight /><span>Демо</span><ChevronRight /><span>Риски</span><ChevronRight /><span>Регистрация</span></div>
            <p>Холодного зрителя не отправляем прямо на создание цикла или подключение кошелька.</p>
          </section>
        </div>
      ) : null}

      {selectedIdea ? <IdeaEditor idea={selectedIdea} onChange={(patch) => updateIdea(selectedIdea.id, patch)} onArchive={archiveSelectedIdea} onClose={() => setSelectedIdeaId("")} /> : null}
    </section>
  );
}

