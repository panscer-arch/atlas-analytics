import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  Check,
  CircleDollarSign,
  ExternalLink,
  FileDown,
  Gauge,
  Instagram,
  Link2,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { loadServerContent, saveServerContent } from "../services/contentStore";
import "../styles/instagram-influencers.css";
import UniversalSocialParserPanel from "./UniversalSocialParserPanel";

const STORAGE_KEY = "atlas.analytics.instagramInfluencerCampaign.v1";
const LOCAL_STORAGE_KEY = `${STORAGE_KEY}.local`;
const PLAYBOOK_URL = "/marketing/atlas-instagram-influencer-working-solution-ru.md";
const INSTAGRAM_PARSER_LEADS_STORAGE_KEY = "atlas.analytics.instagramParser.leads.v1";
const INSTAGRAM_PARSER_LEADS_LOCAL_STORAGE_KEY = `${INSTAGRAM_PARSER_LEADS_STORAGE_KEY}.local`;

const BLOGGER_STATUSES = [
  "Кандидат",
  "Проверка",
  "Запросили условия",
  "Согласование",
  "Запланировано",
  "Опубликовано",
  "Масштабировать",
  "Отказ",
];

const SEGMENTS = ["Web3 / crypto", "Бизнес / fintech", "MLM / команды"];

const DEFAULT_CHECKLIST = [
  { id: "owner", label: "Назначить ответственного и географию", done: false },
  { id: "facts", label: "Утвердить факты, ссылки и ограничения", done: false },
  { id: "shortlist", label: "Отобрать 20-30 кандидатов", done: false },
  { id: "insights", label: "Получить Insights и цены", done: false },
  { id: "approve", label: "Отдельно одобрить блогера, бюджет и материал", done: false },
  { id: "utm", label: "Создать и проверить UTM-ссылки", done: false },
  { id: "publish", label: "Выпустить 6-9 Reels и Stories", done: false },
  { id: "measure", label: "Собрать статистику 24ч, 72ч и 7 дней", done: false },
  { id: "scale", label: "Усилить только победившие связки", done: false },
];

const CREATIVE_CONCEPTS = [
  {
    id: "proof",
    code: "A",
    title: "Проверка через блокчейн",
    audience: "Web3 / crypto",
    keyword: "ПРОВЕРКА",
    hook: "Я проверил Atlas не по презентации, а по открытым данным.",
    proof: "Сайт, официальный контракт, транзакция или on-chain статистика.",
    tone: "cyan",
  },
  {
    id: "cycle",
    code: "B",
    title: "Smart Cycle за 45 секунд",
    audience: "Бизнес / fintech",
    keyword: "ЦИКЛ",
    hook: "Что такое Smart Cycle, если убрать сложные слова и обещания?",
    proof: "Создание цикла, логика движения ликвидности и существенное ограничение.",
    tone: "orange",
  },
  {
    id: "start",
    code: "C",
    title: "Правильный старт",
    audience: "MLM / команды",
    keyword: "СТАРТ",
    hook: "Три ошибки новичка при первом знакомстве с Web3-проектом.",
    proof: "Официальная ссылка, проверка контракта, механика и риски до действия.",
    tone: "green",
  },
];

const DEFAULT_STATE = {
  owner: "",
  geography: "",
  budget: "",
  objective: "Проверить 3 связки: аудитория + сценарий + следующий шаг",
  activeView: "plan",
  checklist: DEFAULT_CHECKLIST,
  bloggers: [],
  notes: "",
};

function hydrateState(value) {
  if (!value || typeof value !== "object") return DEFAULT_STATE;
  const savedChecklist = new Map((value.checklist || []).map((item) => [item.id, item]));
  return {
    ...DEFAULT_STATE,
    ...value,
    checklist: DEFAULT_CHECKLIST.map((item) => ({ ...item, ...(savedChecklist.get(item.id) || {}) })),
    bloggers: Array.isArray(value.bloggers) ? value.bloggers : [],
  };
}

function readLocalState() {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    return hydrateState(JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || "null"));
  } catch {
    return DEFAULT_STATE;
  }
}

function readLocalParserLeads() {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(INSTAGRAM_PARSER_LEADS_LOCAL_STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function createBlogger() {
  return {
    id: `instagram-blogger-${Date.now()}`,
    name: "",
    handle: "",
    url: "",
    segment: SEGMENTS[0],
    status: BLOGGER_STATUSES[0],
    score: "",
    price: "",
    medianViews: "",
    keyword: "ПРОВЕРКА",
    owner: "",
    nextStep: "Проверить профиль и запросить Insights",
  };
}

function metricValue(value) {
  const number = Number(String(value || "").replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function mapParserLeadToBlogger(lead) {
  return {
    id: `instagram-blogger-${lead.id || Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    sourceLeadId: lead.id || lead.profileUrl || lead.sourceUrl || lead.username,
    name: lead.displayName || lead.username || "Instagram creator",
    handle: lead.username ? `@${String(lead.username).replace(/^@/, "")}` : "",
    url: lead.profileUrl || lead.sourceUrl || "",
    segment: lead.segment === "cryptoMlm" ? "MLM / команды" : "Web3 / crypto",
    status: lead.reviewStatus === "human_review_approved" ? "Проверка" : "Кандидат",
    score: String(lead.score || ""),
    price: "",
    medianViews: "",
    keyword: "ПРОВЕРКА",
    owner: "",
    nextStep: "Проверить Insights, медианные просмотры, географию и условия интеграции",
  };
}

export default function InstagramInfluencerCampaignBoard() {
  const [campaign, setCampaign] = useState(readLocalState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Загрузка...");
  const [activeView, setActiveView] = useState("plan");
  const [importNotice, setImportNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    loadServerContent(STORAGE_KEY).then((saved) => {
      if (!mounted) return;
      const next = saved ? hydrateState(saved) : readLocalState();
      setCampaign(next);
      setActiveView(next.activeView || "plan");
      setSaveState(saved ? "Загружено с сервера" : "Локальный рабочий план");
      setIsLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    const next = { ...campaign, activeView };
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The in-memory plan remains available until the page is closed.
    }
    setSaveState("Сохраняю...");
    const timer = window.setTimeout(() => {
      saveServerContent(STORAGE_KEY, next).then((ok) => {
        setSaveState(ok ? "Сохранено на сервере" : "Сохранено в этом браузере");
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [activeView, campaign, isLoaded]);

  const metrics = useMemo(() => {
    const active = campaign.bloggers.filter((item) => !item.deleted);
    const approved = active.filter((item) => ["Согласование", "Запланировано", "Опубликовано", "Масштабировать"].includes(item.status));
    const published = active.filter((item) => ["Опубликовано", "Масштабировать"].includes(item.status));
    const spent = active.reduce((sum, item) => sum + metricValue(item.price), 0);
    const completed = campaign.checklist.filter((item) => item.done).length;
    return {
      candidates: active.length,
      approved: approved.length,
      published: published.length,
      spent,
      progress: Math.round((completed / campaign.checklist.length) * 100),
    };
  }, [campaign]);

  function patchCampaign(patch) {
    setCampaign((current) => ({ ...current, ...patch }));
  }

  function updateBlogger(id, patch) {
    patchCampaign({
      bloggers: campaign.bloggers.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  function addBlogger() {
    patchCampaign({ bloggers: [createBlogger(), ...campaign.bloggers] });
    setActiveView("bloggers");
  }

  async function importParserLeads() {
    const serverLeads = await loadServerContent(INSTAGRAM_PARSER_LEADS_STORAGE_KEY);
    const parserLeads = Array.isArray(serverLeads) && serverLeads.length ? serverLeads : readLocalParserLeads();
    if (!parserLeads.length) {
      setImportNotice("В очереди универсального парсера пока нет сохранённых Instagram-профилей.");
      setActiveView("search");
      return;
    }
    const existing = new Set(campaign.bloggers.map((item) => String(item.sourceLeadId || item.url || "").toLowerCase()));
    const imported = parserLeads
      .filter((lead) => !["opted_out", "do_not_contact", "not_relevant"].includes(lead.reviewStatus || lead.contactStatus))
      .filter((lead) => !existing.has(String(lead.id || lead.profileUrl || lead.sourceUrl || lead.username || "").toLowerCase()))
      .map(mapParserLeadToBlogger);
    if (!imported.length) {
      setImportNotice("Новых профилей для импорта нет: очередь пуста или кандидаты уже добавлены.");
      return;
    }
    patchCampaign({ bloggers: [...imported, ...campaign.bloggers] });
    setImportNotice(`Импортировано из универсального парсера: ${imported.length}.`);
    setActiveView("bloggers");
  }

  function selectView(nextView) {
    setActiveView(nextView);
  }

  return (
    <section className="analytics-instagram-campaign">
      <header className="analytics-instagram-campaign-hero analytics-surface">
        <div className="analytics-instagram-campaign-heading">
          <div className="analytics-instagram-campaign-mark" aria-hidden="true"><Instagram /></div>
          <div>
            <p className="analytics-kicker">Instagram creator operations</p>
            <h2>Instagram / блогеры</h2>
            <p>Рабочий пилот Atlas на 14 дней: кандидаты, сценарии, публикации и решение о масштабировании по единой воронке.</p>
          </div>
        </div>
        <div className="analytics-instagram-campaign-actions">
          <span className="analytics-instagram-campaign-save"><i />{saveState}</span>
          <a className="analytics-instagram-campaign-button is-secondary" href={PLAYBOOK_URL} target="_blank" rel="noreferrer">
            <FileDown />
            <span>Открыть MD</span>
          </a>
          <button className="analytics-instagram-campaign-button is-primary" type="button" onClick={() => setActiveView("search")}>
            <Search />
            <span>Найти блогеров</span>
          </button>
        </div>
      </header>

      <div className="analytics-instagram-campaign-metrics" aria-label="Сводка Instagram-кампании">
        <article><Users /><span>Кандидаты</span><strong>{metrics.candidates}</strong><small>цель 20-30</small></article>
        <article><ShieldCheck /><span>Одобрено</span><strong>{metrics.approved}</strong><small>цель 6-9</small></article>
        <article><Instagram /><span>Опубликовано</span><strong>{metrics.published}</strong><small>Reels</small></article>
        <article><CircleDollarSign /><span>Стоимость</span><strong>${metrics.spent.toLocaleString("en-US")}</strong><small>по базе</small></article>
        <article><Gauge /><span>Готовность</span><strong>{metrics.progress}%</strong><small>чек-лист</small></article>
      </div>

      <nav className="analytics-instagram-campaign-tabs analytics-surface" role="tablist" aria-label="Разделы Instagram-кампании">
        {[
          ["plan", "План", BookOpenText],
          ["search", "Поиск", Search],
          ["bloggers", "Блогеры", Users],
          ["creatives", "Креативы", Sparkles],
          ["control", "Контроль", BarChart3],
        ].map(([id, label, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={activeView === id} className={activeView === id ? "is-active" : ""} onClick={() => selectView(id)}>
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {activeView === "plan" ? (
        <div className="analytics-instagram-plan-layout">
          <section className="analytics-instagram-setup analytics-surface">
            <div className="analytics-instagram-section-head">
              <div><p className="analytics-kicker">Параметры пилота</p><h3>Одна кампания, один ответственный</h3></div>
              <span>14 дней</span>
            </div>
            <div className="analytics-instagram-setup-grid">
              <label>Ответственный<input value={campaign.owner} onChange={(event) => patchCampaign({ owner: event.target.value })} placeholder="Назначить" /></label>
              <label>География и язык<input value={campaign.geography} onChange={(event) => patchCampaign({ geography: event.target.value })} placeholder="Например: LATAM / ES" /></label>
              <label>Бюджет, USD<input inputMode="decimal" value={campaign.budget} onChange={(event) => patchCampaign({ budget: event.target.value })} placeholder="0" /></label>
              <label className="is-wide">Цель<input value={campaign.objective} onChange={(event) => patchCampaign({ objective: event.target.value })} /></label>
            </div>
          </section>

          <section className="analytics-instagram-checklist analytics-surface">
            <div className="analytics-instagram-section-head">
              <div><p className="analytics-kicker">Execution checklist</p><h3>Путь до масштабирования</h3></div>
              <strong>{metrics.progress}%</strong>
            </div>
            <div className="analytics-instagram-progress"><span style={{ width: `${metrics.progress}%` }} /></div>
            <div className="analytics-instagram-checklist-list">
              {campaign.checklist.map((item, index) => (
                <label key={item.id} className={item.done ? "is-done" : ""}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(event) => patchCampaign({ checklist: campaign.checklist.map((entry) => entry.id === item.id ? { ...entry, done: event.target.checked } : entry) })}
                  />
                  <span className="analytics-instagram-check-index">{item.done ? <Check /> : String(index + 1).padStart(2, "0")}</span>
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="analytics-instagram-funnel analytics-surface">
            <div className="analytics-instagram-section-head">
              <div><p className="analytics-kicker">Measurement funnel</p><h3>Что считаем результатом</h3></div>
            </div>
            <div className="analytics-instagram-funnel-flow" aria-label="Воронка Instagram-блогеров">
              {["Reel", "Кодовое слово", "Direct", "UTM-переход", "Изучение Atlas", "Wallet connect", "Первое действие"].map((label, index, items) => (
                <div key={label}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{label}</strong>
                  {index < items.length - 1 ? <ArrowRight aria-hidden="true" /> : null}
                </div>
              ))}
            </div>
            <p className="analytics-instagram-funnel-note"><MessageCircle /> Комментарий считается сигналом интереса. Решение принимается по стоимости квалифицированного изучения Atlas.</p>
          </section>
        </div>
      ) : null}

      {activeView === "search" ? (
        <section className="analytics-instagram-search">
          <div className="analytics-instagram-search-head analytics-surface">
            <div>
              <p className="analytics-kicker">Universal Social Parser</p>
              <h3>Поиск Instagram-блогеров</h3>
              <p>Задайте ключевые слова, хэштеги, GEO и язык. Сохраните подходящие профили, затем импортируйте их в кампанию.</p>
            </div>
            <button type="button" className="analytics-instagram-campaign-button is-primary" onClick={importParserLeads}><FileDown /><span>Импортировать в кампанию</span></button>
          </div>
          <UniversalSocialParserPanel />
        </section>
      ) : null}

      {activeView === "bloggers" ? (
        <section className="analytics-instagram-bloggers analytics-surface">
          <div className="analytics-instagram-section-head">
            <div><p className="analytics-kicker">Creator shortlist</p><h3>Кандидаты и размещения</h3><p>Одобрение блогера, бюджета и материала фиксируется отдельно.</p></div>
            <div className="analytics-instagram-section-actions">
              <button type="button" className="analytics-instagram-campaign-button is-secondary" onClick={importParserLeads}><FileDown /><span>Импорт из парсера</span></button>
              <button type="button" className="analytics-instagram-campaign-button is-primary" onClick={addBlogger}><Plus /><span>Добавить вручную</span></button>
            </div>
          </div>
          {importNotice ? <p className="analytics-instagram-import-notice">{importNotice}</p> : null}
          {campaign.bloggers.filter((item) => !item.deleted).length ? (
            <div className="analytics-instagram-blogger-table-wrap">
              <table className="analytics-instagram-blogger-table">
                <thead><tr><th>Блогер</th><th>Сегмент</th><th>Статус</th><th>Оценка</th><th>Медиана Reels</th><th>Цена, USD</th><th>Код</th><th>Ответственный</th><th>Следующий шаг</th><th /></tr></thead>
                <tbody>
                  {campaign.bloggers.filter((item) => !item.deleted).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input value={item.name} onChange={(event) => updateBlogger(item.id, { name: event.target.value })} placeholder="Имя" />
                        <div className="analytics-instagram-handle-row">
                          <input value={item.handle} onChange={(event) => updateBlogger(item.id, { handle: event.target.value })} placeholder="@handle" />
                          <input value={item.url} onChange={(event) => updateBlogger(item.id, { url: event.target.value })} placeholder="URL" />
                          {item.url ? <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Открыть профиль ${item.name || item.handle}`}><ExternalLink /></a> : null}
                        </div>
                      </td>
                      <td><select value={item.segment} onChange={(event) => updateBlogger(item.id, { segment: event.target.value })}>{SEGMENTS.map((segment) => <option key={segment}>{segment}</option>)}</select></td>
                      <td><select value={item.status} onChange={(event) => updateBlogger(item.id, { status: event.target.value })}>{BLOGGER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></td>
                      <td><input className="is-number" inputMode="numeric" value={item.score} onChange={(event) => updateBlogger(item.id, { score: event.target.value })} placeholder="0/100" /></td>
                      <td><input className="is-number" inputMode="numeric" value={item.medianViews} onChange={(event) => updateBlogger(item.id, { medianViews: event.target.value })} placeholder="0" /></td>
                      <td><input className="is-number" inputMode="decimal" value={item.price} onChange={(event) => updateBlogger(item.id, { price: event.target.value })} placeholder="0" /></td>
                      <td><input value={item.keyword} onChange={(event) => updateBlogger(item.id, { keyword: event.target.value })} /></td>
                      <td><input value={item.owner} onChange={(event) => updateBlogger(item.id, { owner: event.target.value })} placeholder="Назначить" /></td>
                      <td><textarea rows="2" value={item.nextStep} onChange={(event) => updateBlogger(item.id, { nextStep: event.target.value })} /></td>
                      <td><button type="button" className="analytics-instagram-delete" onClick={() => updateBlogger(item.id, { deleted: true })} aria-label={`Удалить ${item.name || "блогера"}`}><Trash2 /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="analytics-instagram-empty">
              <Users />
              <strong>Кандидаты ещё не добавлены</strong>
              <p>Начните с 20-30 авторов из трёх сегментов, затем оставьте 6-9 для пилота.</p>
              <button type="button" className="analytics-instagram-campaign-button is-primary" onClick={addBlogger}><Plus /><span>Добавить первого</span></button>
            </div>
          )}
        </section>
      ) : null}

      {activeView === "creatives" ? (
        <section className="analytics-instagram-creatives">
          <div className="analytics-instagram-section-head analytics-surface">
            <div><p className="analytics-kicker">Creative system</p><h3>Три сценария для пилота</h3><p>Блогер сохраняет свой стиль, Atlas передаёт факты, доказательства и границы формулировок.</p></div>
            <a className="analytics-instagram-campaign-button is-secondary" href={PLAYBOOK_URL} target="_blank" rel="noreferrer"><BookOpenText /><span>Полный бриф</span></a>
          </div>
          <div className="analytics-instagram-creative-grid">
            {CREATIVE_CONCEPTS.map((concept) => (
              <article key={concept.id} className={`analytics-instagram-creative is-${concept.tone}`}>
                <div className="analytics-instagram-creative-meta"><span>{concept.code}</span><em>{concept.audience}</em></div>
                <h3>{concept.title}</h3>
                <blockquote>{concept.hook}</blockquote>
                <div><ShieldCheck /><span>{concept.proof}</span></div>
                <footer><span>Кодовое слово</span><strong>{concept.keyword}</strong></footer>
              </article>
            ))}
          </div>
          <section className="analytics-instagram-reel-structure analytics-surface">
            <div className="analytics-instagram-section-head"><div><p className="analytics-kicker">35-55 seconds</p><h3>Структура одного Reel</h3></div></div>
            <div className="analytics-instagram-timeline">
              {[
                ["0-2", "Хук", "Вопрос или проверяемый вывод"],
                ["3-10", "Контекст", "Почему автор решил разобраться"],
                ["10-30", "Доказательство", "Экран, интерфейс или on-chain факт"],
                ["30-42", "Граница", "Вывод и существенное ограничение"],
                ["42-55", "CTA", "Кодовое слово и обещанный материал"],
              ].map(([time, title, description]) => (
                <div key={time}><strong>{time}<small>сек</small></strong><span>{title}</span><p>{description}</p></div>
              ))}
            </div>
          </section>
        </section>
      ) : null}

      {activeView === "control" ? (
        <div className="analytics-instagram-control-layout">
          <section className="analytics-instagram-control analytics-surface">
            <div className="analytics-instagram-section-head"><div><p className="analytics-kicker">Decision gate</p><h3>Проверка перед публикацией</h3></div><ShieldCheck /></div>
            {[
              ["Блогер", "Аудитория, география, репутация, Insights и качество комментариев"],
              ["Бюджет", "Цена, состав размещения, отчётность и права на Partnership Ad"],
              ["Материал", "Факты, визуал, CTA, маркировка, риски и отсутствие обещаний"],
            ].map(([title, description], index) => (
              <div key={title} className="analytics-instagram-gate-row"><span>{index + 1}</span><div><strong>{title}</strong><p>{description}</p></div></div>
            ))}
          </section>
          <section className="analytics-instagram-control analytics-surface">
            <div className="analytics-instagram-section-head"><div><p className="analytics-kicker">Scale / stop</p><h3>Решение через 72 часа</h3></div><BarChart3 /></div>
            <div className="analytics-instagram-decision is-scale"><strong>Масштабировать</strong><p>Есть качественные UTM-переходы, нормальное удержание и приемлемый репутационный фон.</p></div>
            <div className="analytics-instagram-decision is-rework"><strong>Доработать</strong><p>Хук работает, но материал, CTA или посадочная страница теряют аудиторию.</p></div>
            <div className="analytics-instagram-decision is-stop"><strong>Остановить</strong><p>Есть только кодовые комментарии, нерелевантный трафик или проблемные обещания.</p></div>
          </section>
          <section className="analytics-instagram-notes analytics-surface">
            <div className="analytics-instagram-section-head"><div><p className="analytics-kicker">Campaign notes</p><h3>Выводы и решения</h3></div><Link2 /></div>
            <textarea rows="10" value={campaign.notes} onChange={(event) => patchCampaign({ notes: event.target.value })} placeholder="Фиксируйте здесь договорённости, результаты тестов и причины решений..." />
          </section>
        </div>
      ) : null}
    </section>
  );
}
