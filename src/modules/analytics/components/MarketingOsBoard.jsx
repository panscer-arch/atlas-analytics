import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  CirclePlus,
  FlaskConical,
  LayoutDashboard,
  Megaphone,
  Radar,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  MARKETING_OS_STATUSES,
  MARKETING_OS_STORAGE_KEY,
  MARKETING_OS_TABS,
  createDefaultMarketingOsState,
  hydrateMarketingOsState,
} from "../data/marketingOsData";
import { loadServerContent, saveServerContent } from "../services/contentStore";
import "./MarketingOsBoard.css";

const TAB_ICONS = {
  overview: LayoutDashboard,
  opportunities: Radar,
  hypotheses: FlaskConical,
  campaigns: Megaphone,
  approvals: ShieldCheck,
  agents: Bot,
  analytics: BarChart3,
  activity: Activity,
};

function readTab() {
  if (typeof window === "undefined") return "overview";
  const tab = new URL(window.location.href).searchParams.get("marketingOsTab");
  return MARKETING_OS_TABS.some((item) => item.id === tab) ? tab : "overview";
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function statusTone(status = "") {
  if (["Одобрено", "Одобрена", "Подтверждена", "Завершена", "Квалифицирована"].includes(status)) return "success";
  if (["Отклонено", "Отклонена", "Закрыта"].includes(status)) return "danger";
  if (["На согласовании", "Ожидает", "Нужны правки", "Проверяется", "Тестируется", "В работе"].includes(status)) return "accent";
  return "neutral";
}

function readLocalState() {
  try {
    const saved = window.localStorage.getItem(MARKETING_OS_STORAGE_KEY);
    return saved ? hydrateMarketingOsState(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}

function saveLocalState(value) {
  try {
    window.localStorage.setItem(MARKETING_OS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Серверное сохранение остается основным источником истины.
  }
}

function addActivity(state, entry) {
  return {
    ...state,
    updatedAt: nowIso(),
    activity: [
      {
        id: makeId("activity"),
        actor: "Оператор",
        createdAt: nowIso(),
        ...entry,
      },
      ...(state.activity || []),
    ].slice(0, 250),
  };
}

function MetricCard({ label, value, note, tone = "default" }) {
  return (
    <article className={`marketing-os-metric is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function StatusSelect({ value, options, onChange, disabledOptions = [] }) {
  return (
    <select className={`marketing-os-status is-${statusTone(value)}`} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option} disabled={disabledOptions.includes(option)}>{option}</option>)}
    </select>
  );
}

function EmptyState({ title, text, action }) {
  return (
    <div className="marketing-os-empty">
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

export default function MarketingOsBoard() {
  const [activeTab, setActiveTab] = useState(readTab);
  const [state, setState] = useState(createDefaultMarketingOsState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Загрузка...");
  const [composer, setComposer] = useState("");
  const saveRef = useRef(0);
  const firstSaveRef = useRef(true);

  useEffect(() => {
    let active = true;
    loadServerContent(MARKETING_OS_STORAGE_KEY).then((saved) => {
      if (!active) return;
      setState(hydrateMarketingOsState(saved || readLocalState()));
      setIsLoaded(true);
      setSaveState(saved ? "Сохранено на сервере" : "Новый рабочий стол");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    if (firstSaveRef.current) {
      firstSaveRef.current = false;
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const requestId = saveRef.current + 1;
      saveRef.current = requestId;
      const next = { ...state, updatedAt: nowIso() };
      saveLocalState(next);
      setSaveState("Сохраняю...");
      saveServerContent(MARKETING_OS_STORAGE_KEY, next).then((ok) => {
        if (saveRef.current !== requestId) return;
        setSaveState(ok ? "Сохранено на сервере" : "Сохранено локально");
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [state, isLoaded]);

  useEffect(() => {
    function onPopState() { setActiveTab(readTab()); }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const summary = useMemo(() => ({
    opportunities: state.opportunities.filter((item) => !["Закрыта", "Отложена"].includes(item.status)).length,
    hypotheses: state.hypotheses.filter((item) => ["Одобрена", "Тестируется"].includes(item.status)).length,
    campaigns: state.campaigns.filter((item) => item.status === "В работе").length,
    approvals: state.approvals.filter((item) => item.status === "Ожидает").length,
  }), [state]);

  function selectTab(tabId) {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    if (tabId === "overview") url.searchParams.delete("marketingOsTab");
    else url.searchParams.set("marketingOsTab", tabId);
    window.history.pushState({}, "", url);
  }

  function updateCollection(collection, id, patch) {
    setState((current) => addActivity({
      ...current,
      [collection]: current[collection].map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }, {
      type: "update",
      title: `Обновлено: ${current[collection].find((item) => item.id === id)?.title || id}`,
      details: Object.entries(patch).map(([key, value]) => `${key}: ${value}`).join(" · "),
    }));
  }

  function removeItem(collection, id) {
    setState((current) => addActivity({
      ...current,
      [collection]: current[collection].filter((item) => item.id !== id),
    }, {
      type: "delete",
      title: "Запись удалена",
      details: current[collection].find((item) => item.id === id)?.title || id,
    }));
  }

  function addOpportunity() {
    const title = composer.trim() || "Новая рыночная возможность";
    setState((current) => addActivity({
      ...current,
      opportunities: [{
        id: makeId("opportunity"), title, source: "Указать источник", audience: "Указать аудиторию",
        evidence: "Добавить подтверждающий сигнал", owner: "Не назначен", priority: "Средний", status: "Новая", createdAt: nowIso(),
      }, ...current.opportunities],
    }, { type: "create", title: `Создана возможность: ${title}`, details: "Требуется проверка источника и аудитории." }));
    setComposer("");
  }

  function addHypothesis() {
    const title = composer.trim() || "Новая проверяемая гипотеза";
    setState((current) => addActivity({
      ...current,
      hypotheses: [{
        id: makeId("hypothesis"), title, audience: "Указать аудиторию", channel: "Указать канал", metric: "Указать метрику",
        target: "Указать целевое значение", budget: "$0 до согласования", owner: "Не назначен", status: "Черновик", sourceOpportunityId: "", createdAt: nowIso(),
      }, ...current.hypotheses],
    }, { type: "create", title: `Создана гипотеза: ${title}`, details: "Статус: Черновик." }));
    setComposer("");
  }

  function addCampaign() {
    const title = composer.trim() || "Новая кампания";
    setState((current) => addActivity({
      ...current,
      campaigns: [{
        id: makeId("campaign"), title, hypothesisId: "", channel: "Указать канал", audience: "Указать аудиторию", budget: "$0",
        owner: "Не назначен", status: "Черновик", approvalsRequired: true, results: { sent: 0, replies: 0, qualified: 0, meetings: 0 }, createdAt: nowIso(),
      }, ...current.campaigns],
    }, { type: "create", title: `Создана кампания: ${title}`, details: "Внешний запуск заблокирован до согласования." }));
    setComposer("");
  }

  function requestApproval(hypothesis) {
    const existing = state.approvals.some((item) => item.objectId === hypothesis.id && item.status === "Ожидает");
    if (existing) return;
    setState((current) => addActivity({
      ...current,
      hypotheses: current.hypotheses.map((item) => item.id === hypothesis.id ? { ...item, status: "На согласовании" } : item),
      approvals: [{
        id: makeId("approval"), objectType: "Гипотеза", objectId: hypothesis.id, title: hypothesis.title,
        requestedBy: "Оператор", reviewer: "Не назначен", note: "Проверить аудиторию, формулировки, бюджет, канал и метрику.",
        status: "Ожидает", createdAt: nowIso(), decidedAt: "",
      }, ...current.approvals],
    }, { type: "approval", title: `Запрошено согласование: ${hypothesis.title}`, details: "Внешние действия остаются заблокированы." }));
    selectTab("approvals");
  }

  function requestCampaignApproval(campaign) {
    const existing = state.approvals.some((item) => item.objectId === campaign.id && item.status === "Ожидает");
    if (existing) return;
    setState((current) => addActivity({
      ...current,
      approvals: [{
        id: makeId("approval"), objectType: "Кампания", objectId: campaign.id, title: campaign.title,
        requestedBy: "Оператор", reviewer: "Не назначен", note: "Проверить аудиторию, оффер, материалы, бюджет, канал и лимиты.",
        status: "Ожидает", createdAt: nowIso(), decidedAt: "",
      }, ...current.approvals],
    }, { type: "approval", title: `Запрошено согласование кампании: ${campaign.title}`, details: "Внешний запуск остается заблокированным." }));
    selectTab("approvals");
  }

  function decideApproval(item, status) {
    setState((current) => {
      const next = {
        ...current,
        approvals: current.approvals.map((approval) => approval.id === item.id ? { ...approval, status, decidedAt: nowIso() } : approval),
        hypotheses: item.objectType === "Гипотеза"
          ? current.hypotheses.map((hypothesis) => hypothesis.id === item.objectId ? { ...hypothesis, status: status === "Одобрено" ? "Одобрена" : "Черновик" } : hypothesis)
          : current.hypotheses,
      };
      return addActivity(next, { type: "approval", title: `${status}: ${item.title}`, details: "Решение оператора записано в журнал." });
    });
  }

  function queueAgent(agent) {
    const task = `Подготовить внутренний черновик по текущим данным MarketingOS (${new Date().toLocaleDateString("ru-RU")})`;
    setState((current) => addActivity({
      ...current,
      agents: current.agents.map((item) => item.id === agent.id ? { ...item, status: "Задача в очереди", lastTask: task, updatedAt: nowIso() } : item),
    }, { type: "agent", title: `Задача поставлена: ${agent.name}`, details: "Создана внутренняя задача. Никакие внешние действия не выполнялись." }));
  }

  function renderOverview() {
    const pending = state.approvals.filter((item) => item.status === "Ожидает").slice(0, 4);
    const active = state.hypotheses.filter((item) => !["Отклонена", "Подтверждена"].includes(item.status)).slice(0, 4);
    return (
      <>
        <section className="marketing-os-kpis">
          <MetricCard label="Возможности" value={summary.opportunities} note="активные сигналы" tone="blue" />
          <MetricCard label="Гипотезы" value={summary.hypotheses} note="одобрено / тестируется" tone="violet" />
          <MetricCard label="Кампании" value={summary.campaigns} note="сейчас в работе" tone="green" />
          <MetricCard label="Ожидают решения" value={summary.approvals} note="human approval gate" tone={summary.approvals ? "amber" : "green"} />
        </section>
        <section className="marketing-os-overview-grid">
          <article className="analytics-surface marketing-os-focus">
            <div className="marketing-os-section-head">
              <div><span>Рабочий фокус</span><h3>Гипотезы, которые требуют следующего шага</h3></div>
              <button type="button" onClick={() => selectTab("hypotheses")}>Все гипотезы <ChevronRight size={16} /></button>
            </div>
            <div className="marketing-os-compact-list">
              {active.map((item) => (
                <button key={item.id} type="button" onClick={() => selectTab("hypotheses")}>
                  <span className={`marketing-os-dot is-${statusTone(item.status)}`} />
                  <strong>{item.title}</strong><small>{item.status} · {item.owner}</small><ChevronRight size={16} />
                </button>
              ))}
            </div>
          </article>
          <article className="analytics-surface marketing-os-gate">
            <div className="marketing-os-section-head">
              <div><span>Контроль</span><h3>Решения перед внешним действием</h3></div>
              <button type="button" onClick={() => selectTab("approvals")}>Открыть очередь <ChevronRight size={16} /></button>
            </div>
            {pending.length ? pending.map((item) => (
              <div className="marketing-os-gate-row" key={item.id}>
                <ShieldCheck size={18} /><div><strong>{item.title}</strong><small>{item.objectType} · {formatDate(item.createdAt)}</small></div>
              </div>
            )) : <EmptyState title="Очередь пуста" text="Внешних действий без решения нет." />}
          </article>
        </section>
        <section className="analytics-surface marketing-os-flow">
          <div><span>1</span><strong>Сигнал</strong><small>публичный источник</small></div>
          <ChevronRight />
          <div><span>2</span><strong>Гипотеза</strong><small>метрика и лимит</small></div>
          <ChevronRight />
          <div><span>3</span><strong>Проверка</strong><small>brand + compliance</small></div>
          <ChevronRight />
          <div><span>4</span><strong>Решение человека</strong><small>approve / reject</small></div>
          <ChevronRight />
          <div><span>5</span><strong>Кампания</strong><small>результат в CRM</small></div>
        </section>
      </>
    );
  }

  function renderOpportunities() {
    return (
      <section className="analytics-surface marketing-os-table-card">
        <div className="marketing-os-section-head">
          <div><span>Opportunity discovery</span><h3>Рыночные возможности</h3><p>Каждая запись должна иметь публичный источник и проверяемый сигнал.</p></div>
          <div className="marketing-os-add"><input value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Название возможности" /><button type="button" onClick={addOpportunity}><CirclePlus size={17} /> Добавить</button></div>
        </div>
        <div className="marketing-os-table-wrap"><table><thead><tr><th>Возможность</th><th>Источник / аудитория</th><th>Доказательство</th><th>Ответственный</th><th>Приоритет</th><th>Статус</th><th /></tr></thead><tbody>
          {state.opportunities.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small>{formatDate(item.createdAt)}</small></td><td><input value={item.source} onChange={(event) => updateCollection("opportunities", item.id, { source: event.target.value })} /><input value={item.audience} onChange={(event) => updateCollection("opportunities", item.id, { audience: event.target.value })} /></td><td><textarea rows="2" value={item.evidence} onChange={(event) => updateCollection("opportunities", item.id, { evidence: event.target.value })} /></td><td><input value={item.owner} onChange={(event) => updateCollection("opportunities", item.id, { owner: event.target.value })} /></td><td><select value={item.priority} onChange={(event) => updateCollection("opportunities", item.id, { priority: event.target.value })}><option>Высокий</option><option>Средний</option><option>Низкий</option></select></td><td><StatusSelect value={item.status} options={MARKETING_OS_STATUSES.opportunities} onChange={(status) => updateCollection("opportunities", item.id, { status })} /></td><td><button className="marketing-os-icon-button" type="button" title="Удалить" onClick={() => removeItem("opportunities", item.id)} aria-label={`Удалить ${item.title}`}><X size={16} /></button></td></tr>)}
        </tbody></table></div>
      </section>
    );
  }

  function renderHypotheses() {
    return (
      <section className="analytics-surface marketing-os-table-card">
        <div className="marketing-os-section-head">
          <div><span>Experiment backlog</span><h3>Проверяемые гипотезы</h3><p>Не идеи «вообще», а конкретный тест: аудитория, канал, метрика, цель и лимит.</p></div>
          <div className="marketing-os-add"><input value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Если мы..., то..." /><button type="button" onClick={addHypothesis}><CirclePlus size={17} /> Добавить</button></div>
        </div>
        <div className="marketing-os-hypothesis-grid">{state.hypotheses.map((item) => (
          <article key={item.id} className="marketing-os-hypothesis">
            <div><StatusSelect value={item.status} options={MARKETING_OS_STATUSES.hypotheses} onChange={(status) => updateCollection("hypotheses", item.id, { status })} /><button className="marketing-os-icon-button" type="button" title="Удалить" onClick={() => removeItem("hypotheses", item.id)} aria-label={`Удалить ${item.title}`}><X size={16} /></button></div>
            <h4>{item.title}</h4>
            <dl><div><dt>Аудитория</dt><dd><input value={item.audience} onChange={(event) => updateCollection("hypotheses", item.id, { audience: event.target.value })} /></dd></div><div><dt>Канал</dt><dd><input value={item.channel} onChange={(event) => updateCollection("hypotheses", item.id, { channel: event.target.value })} /></dd></div><div><dt>Метрика</dt><dd><input value={item.metric} onChange={(event) => updateCollection("hypotheses", item.id, { metric: event.target.value })} /></dd></div><div><dt>Цель</dt><dd><input value={item.target} onChange={(event) => updateCollection("hypotheses", item.id, { target: event.target.value })} /></dd></div><div><dt>Лимит</dt><dd><input value={item.budget} onChange={(event) => updateCollection("hypotheses", item.id, { budget: event.target.value })} /></dd></div><div><dt>Владелец</dt><dd><input value={item.owner} onChange={(event) => updateCollection("hypotheses", item.id, { owner: event.target.value })} /></dd></div></dl>
            <button type="button" className="marketing-os-primary" disabled={item.status !== "Черновик"} onClick={() => requestApproval(item)}><ShieldCheck size={17} /> На согласование</button>
          </article>
        ))}</div>
      </section>
    );
  }

  function renderCampaigns() {
    return (
      <section className="analytics-surface marketing-os-table-card">
        <div className="marketing-os-section-head"><div><span>Campaign workspace</span><h3>Кампании</h3><p>Запуск возможен только после проверки аудитории, материалов, бюджета и канала.</p></div><div className="marketing-os-add"><input value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Название кампании" /><button type="button" onClick={addCampaign}><CirclePlus size={17} /> Добавить</button></div></div>
        <div className="marketing-os-campaign-grid">{state.campaigns.map((item) => {
          const approval = state.approvals.find((entry) => entry.objectId === item.id && entry.status === "Одобрено");
          const pendingApproval = state.approvals.find((entry) => entry.objectId === item.id && entry.status === "Ожидает");
          return <article key={item.id} className="marketing-os-campaign"><div className="marketing-os-campaign-head"><div><span>{item.channel}</span><h4>{item.title}</h4></div><StatusSelect value={item.status} options={MARKETING_OS_STATUSES.campaigns} disabledOptions={approval ? [] : ["В работе"]} onChange={(status) => updateCollection("campaigns", item.id, { status })} /></div><div className="marketing-os-campaign-fields"><label>Аудитория<input value={item.audience} onChange={(event) => updateCollection("campaigns", item.id, { audience: event.target.value })} /></label><label>Бюджет<input value={item.budget} onChange={(event) => updateCollection("campaigns", item.id, { budget: event.target.value })} /></label><label>Ответственный<input value={item.owner} onChange={(event) => updateCollection("campaigns", item.id, { owner: event.target.value })} /></label></div><div className="marketing-os-result-row"><span><b>{item.results?.sent || 0}</b> действий</span><span><b>{item.results?.replies || 0}</b> ответов</span><span><b>{item.results?.qualified || 0}</b> квалифицировано</span><span><b>{item.results?.meetings || 0}</b> встреч</span></div><div className={`marketing-os-launch-gate ${approval ? "is-approved" : ""}`}>{approval ? <BadgeCheck size={18} /> : <ShieldCheck size={18} />}<span>{approval ? "Согласование получено" : pendingApproval ? "Ожидает решения человека" : "Внешний запуск заблокирован"}</span>{!approval && !pendingApproval ? <button type="button" onClick={() => requestCampaignApproval(item)}>На согласование</button> : null}</div></article>;
        })}</div>
      </section>
    );
  }

  function renderApprovals() {
    return (
      <section className="analytics-surface marketing-os-table-card">
        <div className="marketing-os-section-head"><div><span>Human approval queue</span><h3>Очередь согласований</h3><p>Ни один агент не может сам отправить сообщение, опубликовать материал или потратить бюджет.</p></div></div>
        <div className="marketing-os-approval-list">{state.approvals.map((item) => <article key={item.id} className="marketing-os-approval"><div><span>{item.objectType}</span><h4>{item.title}</h4><p>{item.note}</p><small>Запросил: {item.requestedBy} · Проверяет: {item.reviewer} · {formatDate(item.createdAt)}</small></div><div><StatusSelect value={item.status} options={MARKETING_OS_STATUSES.approvals} onChange={(status) => updateCollection("approvals", item.id, { status })} />{item.status === "Ожидает" ? <><button type="button" className="marketing-os-approve" onClick={() => decideApproval(item, "Одобрено")}><Check size={16} /> Одобрить</button><button type="button" className="marketing-os-reject" onClick={() => decideApproval(item, "Нужны правки")}><X size={16} /> На доработку</button></> : null}</div></article>)}</div>
      </section>
    );
  }

  function renderAgents() {
    return <section className="marketing-os-agent-grid">{state.agents.map((agent) => <article key={agent.id} className="analytics-surface marketing-os-agent"><div><Bot size={22} /><span className={`marketing-os-status is-${agent.status === "Задача в очереди" ? "accent" : "success"}`}>{agent.status}</span></div><h3>{agent.name}</h3><p>{agent.role}</p><small>{agent.guardrail}</small>{agent.lastTask ? <div className="marketing-os-agent-task"><strong>Последняя задача</strong><span>{agent.lastTask}</span></div> : null}<button type="button" onClick={() => queueAgent(agent)}>Создать внутреннюю задачу</button></article>)}</section>;
  }

  function renderAnalytics() {
    const funnel = [
      ["Ответы", state.metrics.replies], ["Квалифицированные лиды", state.metrics.qualifiedLeads], ["Встречи", state.metrics.meetings],
      ["Регистрации", state.metrics.registrations], ["Активации", state.metrics.activations],
    ];
    return <><section className="marketing-os-kpis"><MetricCard label="Квалифицировано возможностей" value={state.metrics.opportunitiesQualified} note="есть проверяемый сигнал" tone="blue" /><MetricCard label="Протестировано гипотез" value={state.metrics.hypothesesTested} note="есть результат" tone="violet" /><MetricCard label="Одобрено действий" value={state.metrics.approvedActions} note="решение человека" tone="green" /><MetricCard label="Attributed volume" value={`$${Number(state.metrics.attributedVolume || 0).toLocaleString("en-US")}`} note="только подтвержденная атрибуция" tone="amber" /></section><section className="analytics-surface marketing-os-analytics"><div><span>Marketing funnel</span><h3>От ответа до активации</h3><p>Нулевые значения означают, что подтвержденные события пока не записаны. MarketingOS не дорисовывает результат.</p></div><div className="marketing-os-funnel-bars">{funnel.map(([label, value], index) => <div key={label}><span>{label}</span><div><i style={{ width: `${Math.min(100, Number(value || 0) * 10)}%` }} /></div><strong>{value}</strong>{index < funnel.length - 1 ? <ChevronRight size={16} /> : null}</div>)}</div></section></>;
  }

  function renderActivity() {
    return <section className="analytics-surface marketing-os-table-card"><div className="marketing-os-section-head"><div><span>Audit trail</span><h3>Журнал действий</h3><p>Фиксирует изменения, решения и постановку внутренних задач.</p></div></div><div className="marketing-os-activity-list">{state.activity.map((item) => <article key={item.id}><span className={`marketing-os-dot is-${item.type === "approval" ? "accent" : item.type === "delete" ? "danger" : "success"}`} /><div><strong>{item.title}</strong><p>{item.details}</p><small>{item.actor} · {formatDate(item.createdAt)}</small></div></article>)}</div></section>;
  }

  const renderers = { overview: renderOverview, opportunities: renderOpportunities, hypotheses: renderHypotheses, campaigns: renderCampaigns, approvals: renderApprovals, agents: renderAgents, analytics: renderAnalytics, activity: renderActivity };

  return (
    <div className="marketing-os-shell">
      <section className="analytics-surface marketing-os-hero">
        <div><span className="marketing-os-eyebrow">Atlas AI Growth Lab</span><h1>MarketingOS</h1><p>Единый рабочий контур: от рыночного сигнала и гипотезы до согласованной кампании и измеримого результата.</p></div>
        <div className="marketing-os-hero-state"><span><ShieldCheck size={18} /> Approval-first</span><strong>Внешние действия только после решения человека</strong><small><Save size={14} /> {saveState}</small></div>
      </section>
      <nav className="analytics-surface marketing-os-tabs" role="tablist" aria-label="Разделы MarketingOS">{MARKETING_OS_TABS.map((tab) => { const Icon = TAB_ICONS[tab.id]; return <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? "is-active" : ""} onClick={() => selectTab(tab.id)}><Icon size={17} /><span>{tab.label}</span><small>{tab.id === "approvals" && summary.approvals ? summary.approvals : tab.hint}</small></button>; })}</nav>
      {renderers[activeTab]?.()}
    </div>
  );
}
