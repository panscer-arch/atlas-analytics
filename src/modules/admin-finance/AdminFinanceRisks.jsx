import { AlertTriangle, BookOpenCheck, Check, Info, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "./data/overviewData";
import { PARTNER_CAPTURE_DEMO, calculatePartnerCaptureControl, partnerCaptureDemoControl } from "./data/partnerCaptureControl";
import { PARTNER_CAPTURE_JOURNAL_KEY, acknowledgePartnerCaptureAlert, createPartnerCaptureJournal, parsePartnerCaptureJournal, recordPartnerCaptureCut } from "./data/partnerCaptureJournal";
import { RISK_ACKNOWLEDGEMENTS_KEY, addRiskAcknowledgements, parseRiskAcknowledgements } from "./data/riskAcknowledgements";

const PARTNER_CAPTURE_ALERT_ID = "PC-DEMO-001";

const initialAlerts = [
  { id: "RC-1042", severity: "critical", sla: "due_today", title: "Coverage ниже порога", subtitle: "Payout Contract · Stress · forecast-v1.4", current: "1.08× / 1.10×", created: "6 мин назад", source: "Forecast", href: "/admin/forecast", owner: "Treasury", deadline: "Сегодня · 18:00", detail: "Stress coverage 1.08× при UI-пороге 1.10×. Требуется проверить reserve policy и прогнозные buckets." },
  { id: "RC-1041", severity: "critical", sla: "overdue", title: "Расхождение event ↔ transfer", subtitle: "4 exceptions · старейшее 6ч 18м", current: "$184.60", created: "11 мин назад", source: "Reconciliation", href: "/admin/reconciliation", owner: "Finance Ops", deadline: "Просрочено · 2ч 18м", detail: "Четыре reconciliation exceptions на сумму $184.60 не позволяют считать связанный агрегат reconciled." },
  { id: "RC-1040", severity: "high", sla: "due_soon", title: "Head Account expiry · 66 ч", subtitle: "72h отправлено · 48h через 18 часов", current: "$5,840 at risk", created: "18 мин назад", source: "Partner status", href: "/admin/head-account", owner: "Growth Ops", deadline: "До expiry · 48ч", detail: "До завершения личного цикла головного аккаунта 66 часов. 72-часовое уведомление отправлено; 48-часовое запланировано." },
  { id: "RC-1039", severity: "high", sla: "due_today", title: "Концентрация Branch A", subtitle: "Доля ветки во входящем потоке", current: "31.8% / 30%", created: "24 мин назад", source: "Ledger", href: "/admin/flows", owner: "Risk Owner", deadline: "Сегодня · 22:00", detail: "Branch A формирует 31.8% incoming flow за выбранный период. Порог UI demo — 30%." },
  { id: "RC-1038", severity: "medium", sla: "due_tomorrow", title: "Effective Fee отклонён", subtitle: "Partner Reward · ruleset fee-v1.4", current: "9.82% / 10.00%", created: "29 мин назад", source: "Fee ledger", href: "/admin/company-revenue", owner: "Finance Ops", deadline: "Завтра · 12:00", detail: "Effective Partner Fee Rate отличается от параметра ruleset на 0.18 п.п. Нужно проверить rounding и версию правил." },
  { id: "RC-1037", severity: "medium", sla: "due_soon", title: "GA4 data stale · 27 мин", subtitle: "Traffic attribution помечен partial", current: "SLA 20 мин", created: "7 мин назад", source: "GA4", href: "/admin/traffic", owner: "Data Ops", deadline: "Через 23 мин", detail: "Последнее успешное обновление GA4 произошло 27 минут назад. Финансовые on-chain показатели не затронуты." },
  { id: "RC-1036", severity: "info", sla: "observing", title: "Indexer внутри SLA", subtitle: "Checkpoint block 54,721,008", current: "2 мин / 5 мин", created: "2 мин назад", source: "Indexer", href: "/admin/reconciliation", owner: "Indexer", deadline: "Наблюдение", detail: "On-chain indexer отстаёт на 2 минуты, что находится внутри целевого SLA 5 минут." },
];

const initialAlertIds = initialAlerts.map((item) => item.id);
const slaLabels = { overdue: "Просрочено", due_soon: "Скоро", due_today: "Сегодня", due_tomorrow: "Завтра", observing: "Наблюдение" };

const severityMeta = {
  critical: { label: "Critical", color: "#cf534c", tone: "red" },
  high: { label: "High", color: "#d97a2b", tone: "orange" },
  medium: { label: "Medium", color: "#f6b92f", tone: "yellow" },
  info: { label: "Info", color: "#4e76d0", tone: "blue" },
};

const riskCards = [
  { title: "Partner Capture", subtitle: "Доля Atlas в Partner Rewards", tag: "ON TARGET", tone: "green", value: `${partnerCaptureDemoControl.ratePercent.toFixed(2)}%`, valueNote: "цель 35%\nUI demo", rows: [["Коридор наблюдения", "33–34.99%"], ["Критично", "< 33%"], ["Недобор до цели", formatMoney(partnerCaptureDemoControl.shortfall)]] },
  { title: "Концентрация выплат", subtitle: "Кошельки, циклы и ветки", tag: "HIGH", tone: "orange", value: "31.8%", valueNote: "Branch A\nв Incoming Flow", rows: [["Top-10 expected payouts · 7D", "46.2%"], ["Крупнейший кошелёк", "8.4%"], ["Крупнейший cycle type", "38.7%"]] },
  { title: "Ставки Platform Fee", subtitle: "Факт против ruleset", tag: "CHECK", tone: "orange", value: "−0.18 п.п.", valueNote: "Partner Fee\ndeviation", rows: [["Delta Fee", "10.00%"], ["Partner Fee", "9.82%"], ["Unknown rulesets", "0"]] },
  { title: "Свежесть источников", subtitle: "Фактическая задержка", tag: "PARTIAL", tone: "blue", value: "1 stale", valueNote: "из 5\nисточников", rows: [["On-chain indexer", "2 мин"], ["GA4", "27 мин"], ["Partner graph", "3 мин"]] },
  { title: "Reconciliation", subtitle: "Events, receipts и transfers", tag: "4 EXC", tone: "red", value: "$184.60", valueNote: "unclassified\nvariance", rows: [["Orphan transfer", "1"], ["Amount mismatch", "1"], ["Unknown ruleset / reorg", "2"]] },
  { title: "Head Account", subtitle: "Статус и expiry", tag: "66 Ч", tone: "orange", value: "$5,840", valueNote: "Income at Risk\n30 дней", rows: [["72h уведомление", "Отправлено"], ["48h уведомление", "Через 18 ч"], ["Cost-to-preserve", "$100"]] },
  { title: "Контракт и gas", subtitle: "Операционное состояние", tag: "OK", tone: "green", value: "4.82 BNB", valueNote: "gas reserve\nUI demo", rows: [["Pause state", "Active"], ["Blacklist state", "No alert"], ["Gas exhaustion estimate", "19 дней"]] },
];

function loadPartnerCaptureJournal() {
  if (typeof window === "undefined") return createPartnerCaptureJournal();
  return parsePartnerCaptureJournal(window.localStorage.getItem(PARTNER_CAPTURE_JOURNAL_KEY));
}

function loadRiskAcknowledgements() {
  if (typeof window === "undefined") return [];
  return parseRiskAcknowledgements(window.localStorage.getItem(RISK_ACKNOWLEDGEMENTS_KEY), initialAlertIds);
}

function Tag({ tone = "green", children }) { return <span className={`af-tag af-tag-${tone}`}>{children}</span>; }
function Metric({ accent, label, tag, tone, value, note, onClick }) { return <article className={`af-metric af-risk-metric ${onClick ? "interactive" : ""}`} style={{ "--metric-accent": accent }} onClick={onClick}><div className="af-metric-head"><span>{label}</span><Tag tone={tone}>{tag}</Tag></div><div className="af-metric-value">{value}</div><p>{note}</p></article>; }
function PanelHeader({ title, subtitle, action }) { return <div className="af-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }

function RulesDialog({ create, onClose }) {
  const [saved, setSaved] = useState(false);
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-risk-rule-title"><div className="af-modal-head"><div><span>{create ? <Plus size={17} /> : <BookOpenCheck size={17} />} Risk policy</span><h2 id="af-risk-rule-title">{create ? "Новое пороговое правило" : "Правила агрегирования рисков"}</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div>{create ? <form className="af-risk-rule-form" onSubmit={(event) => { event.preventDefault(); setSaved(true); }}><label>Источник<select><option>Прогноз выплат</option><option>Partner Capture</option><option>Сверка данных</option><option>Головной аккаунт</option><option>Свежесть источников</option></select></label><label>Показатель<input defaultValue="partner_capture_rate" /></label><label>Условие<select><option>Меньше</option><option>Больше</option><option>Равно</option></select></label><label>Порог<input defaultValue="33.00" inputMode="decimal" /></label><label>Severity<select><option>Critical</option><option>High</option><option>Medium</option><option>Info</option></select></label><button className="af-small-link" type="submit">Сохранить demo rule</button>{saved ? <p><Check size={14} /> Правило сохранено локально. Production требует `risk_rule.write`, MFA и audit log.</p> : null}</form> : <dl><div><dt>Источник истины</dt><dd>Risk Center получает рассчитанный показатель, as-of block, formula version и evidence link от профильного сервиса.</dd></div><div><dt>Partner Capture</dt><dd>Норма — от 35%; observation — 33–34.99%; critical — ниже 33%. Сигнал и восстановление требуют двух последовательных finalized-срезов.</dd></div><div><dt>Severity</dt><dd>Определяется версионным правилом. Изменение порога не переписывает историю уже созданных сигналов.</dd></div><div><dt>Acknowledgement</dt><dd>Подтверждение означает «увидел и взял в работу», но не закрывает риск и не меняет финансовые данные.</dd></div><div><dt>Closure</dt><dd>Сигнал закрывается только после нормализации источника или документированного risk acceptance независимым владельцем.</dd></div><div><dt>Escalation</dt><dd>У каждого сигнала есть owner, deadline и канал доставки; просрочка повышает операционный приоритет.</dd></div></dl>}<div className="af-modal-warning"><AlertTriangle size={16} /><span>Пороги на этом экране являются UI demo до утверждения владельцем риска.</span></div></section></div>;
}

export default function AdminFinanceRisks() {
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("open");
  const [owner, setOwner] = useState("all");
  const [sla, setSla] = useState("all");
  const [period, setPeriod] = useState("24h");
  const [acknowledged, setAcknowledged] = useState(loadRiskAcknowledgements);
  const [drawer, setDrawer] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [channels, setChannels] = useState({ center: true, email: true, telegram: false, digest: true });
  const [partnerScenarioRate, setPartnerScenarioRate] = useState(32);
  const [partnerJournal, setPartnerJournal] = useState(loadPartnerCaptureJournal);
  const [audit, setAudit] = useState([
    ["04.08 · 14:42", "Открыт источник alert RC-1042", "Finance Admin", "req_82D1"],
    ["04.08 · 14:35", "Подтверждён alert RC-1038", "Owner", "req_81B4"],
    ["04.08 · 13:58", "GA4 отмечен stale", "System", "job_1902"],
    ["04.08 · 12:30", "Обновлён indexer checkpoint", "System", "job_18F1"],
  ]);
  const alerts = useMemo(() => {
    const rows = initialAlerts.map((item) => ({ ...item, status: acknowledged.includes(item.id) ? "acknowledged" : "open" }));
    if (!partnerJournal.activeSeverity) return rows;
    const latestCut = partnerJournal.cuts[0];
    return [{
      id: PARTNER_CAPTURE_ALERT_ID,
      severity: partnerJournal.activeSeverity === "critical" ? "critical" : "high",
      sla: "due_soon",
      title: "Partner Capture ниже порога",
      subtitle: "Head Account referral receipts / Gross Partner Rewards",
      current: `${latestCut?.ratePercent?.toFixed(1) || "N/A"}% / 35%`,
      created: "Browser-local DEMO",
      source: "Partner Economics",
      href: "/admin/company-revenue",
      owner: "Growth Ops + Finance",
      deadline: partnerJournal.activeSeverity === "critical" ? "SLA · 2 часа" : "SLA · 1 рабочий день",
      detail: "Локальный сигнал создан после двух последовательных finalized DEMO-срезов. Он иллюстрирует операционный workflow и не является production alert.",
      status: partnerJournal.acknowledgedAt ? "acknowledged" : "open",
    }, ...rows];
  }, [acknowledged, partnerJournal]);
  const partnerScenario = useMemo(() => calculatePartnerCaptureControl({
    grossPartnerRewardsPaid: PARTNER_CAPTURE_DEMO.grossPartnerRewardsPaid,
    atlasReferralIncome: PARTNER_CAPTURE_DEMO.grossPartnerRewardsPaid * partnerScenarioRate / 100,
  }), [partnerScenarioRate]);
  useEffect(() => {
    window.localStorage.setItem(PARTNER_CAPTURE_JOURNAL_KEY, JSON.stringify(partnerJournal));
  }, [partnerJournal]);
  useEffect(() => {
    window.localStorage.setItem(RISK_ACKNOWLEDGEMENTS_KEY, JSON.stringify(acknowledged));
  }, [acknowledged]);
  const owners = useMemo(() => [...new Set(alerts.map((item) => item.owner))].sort((a, b) => a.localeCompare(b, "ru")), [alerts]);
  const visible = alerts.filter((item) => (severity === "all" || item.severity === severity) && (status === "all" || item.status === status) && (owner === "all" || item.owner === owner) && (sla === "all" || item.sla === sla));
  const counts = Object.fromEntries(["critical", "high", "medium", "info"].map((level) => [level, alerts.filter((item) => item.status === "open" && item.severity === level).length]));
  const log = (message) => setAudit((current) => [["сейчас", message, "UI demo user", "local_demo"], ...current]);
  const acknowledge = (id) => {
    if (id === PARTNER_CAPTURE_ALERT_ID) setPartnerJournal((current) => acknowledgePartnerCaptureAlert(current));
    else setAcknowledged((current) => addRiskAcknowledgements(current, [id], initialAlertIds));
    log(`Подтверждён сигнал ${id}`);
  };
  const acknowledgeVisible = () => {
    const ids = visible.map((item) => item.id);
    setAcknowledged((current) => addRiskAcknowledgements(current, ids, initialAlertIds));
    if (ids.includes(PARTNER_CAPTURE_ALERT_ID)) setPartnerJournal((current) => acknowledgePartnerCaptureAlert(current));
    log("Подтверждены все видимые сигналы");
  };
  const openDrawer = (item) => { setDrawer(item); log(`Открыт источник ${item.id}`); };
  const toggleChannel = (id) => { setChannels((current) => ({ ...current, [id]: !current[id] })); log(`Канал ${id} переключён в UI demo`); };

  return <div className="af-content af-risks-page">
    <div className="af-risk-toolbar"><div className="af-risk-filters">{[["all", "Все", alerts.filter((item) => item.status === "open").length], ["critical", "Critical", counts.critical], ["high", "High", counts.high], ["medium", "Medium", counts.medium], ["info", "Info", counts.info]].map(([id, label, value]) => <button type="button" className={`${severity === id ? "active" : ""} ${id}`} onClick={() => setSeverity(id)} key={id}>{label}<span>{value}</span></button>)}</div><div className="af-periods">{[["24h", "24 часа"], ["7d", "7 дней"], ["30d", "30 дней"]].map(([id, label]) => <button type="button" className={period === id ? "active" : ""} onClick={() => setPeriod(id)} key={id}>{label}</button>)}</div><div className="af-page-actions"><button type="button" onClick={() => setDialog("rules")}><BookOpenCheck size={15} />Пороги</button><button className="primary" type="button" onClick={() => setDialog("create")}><Plus size={15} />Правило</button></div></div>
    <div className="af-traffic-notice"><Info size={17} /><p><strong>UI-only демонстрация.</strong> Значения, severity и пороги не являются подтверждённым состоянием Atlas. Production-сигналы должны ссылаться на первичные events/transfers, as-of block, правила и фактическую свежесть источника.</p><button type="button" onClick={() => setDrawer({ title: "Audit policy", detail: "Подтверждение alert не изменяет финансовые данные. Изменения порогов, каналов, раскрытие адресов и экспорт должны фиксироваться сервером в tamper-evident audit log.", source: "Policy", href: "/admin/methodology", owner: "Security", deadline: "Versioned" })}>Audit policy</button></div>

    <section className="af-risk-health"><Metric accent="#cf534c" label="Критические сигналы" tag="OPEN" tone="red" value={counts.critical} note="Reserve и reconciliation" onClick={() => setSeverity("critical")} /><Metric accent="#ff8716" label="Minimum Coverage" tag="STRESS" tone="orange" value={<>1.08<small>×</small></>} note="Порог UI demo: 1.10×" /><Metric accent="#cf534c" label="Reserve Headroom" tag="LOW" tone="red" value="$2,140" note="Первый breach: 14 сентября" /><Metric accent="#7a5bb8" label="Reconciliation Gap" tag="4 EXC" tone="violet" value="$184.60" note="Старейшее исключение: 6ч 18м" /><Metric accent="#4e76d0" label="Источник с задержкой" tag="GA4" tone="blue" value={<>27<small> мин</small></>} note="On-chain indexer: 2 мин" /></section>

    <div className="af-risk-primary-grid"><AlertCenter alerts={visible} status={status} setStatus={setStatus} owner={owner} setOwner={setOwner} owners={owners} sla={sla} setSla={setSla} acknowledge={acknowledge} acknowledgeVisible={acknowledgeVisible} openDrawer={openDrawer} /><Coverage /></div>
    <PartnerCaptureScenario rate={partnerScenarioRate} scenario={partnerScenario} onRateChange={setPartnerScenarioRate} onRecord={() => setPartnerJournal((current) => recordPartnerCaptureCut(current, { ratePercent: partnerScenarioRate, grossPartnerRewardsPaid: PARTNER_CAPTURE_DEMO.grossPartnerRewardsPaid }))} />
    <PartnerCaptureJournal journal={partnerJournal} onAcknowledge={() => setPartnerJournal((current) => acknowledgePartnerCaptureAlert(current))} onReset={() => { window.localStorage.removeItem(PARTNER_CAPTURE_JOURNAL_KEY); setPartnerJournal(createPartnerCaptureJournal()); }} />
    <section className="af-risk-card-grid">{riskCards.map((card) => <article className="af-risk-card" key={card.title}><header><div><h3>{card.title}</h3><p>{card.subtitle}</p></div><Tag tone={card.tone}>{card.tag}</Tag></header><div><section><strong>{card.value}</strong><span>{card.valueNote.split("\n").map((line) => <span key={line}>{line}</span>)}</span></section>{card.rows.map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</div></article>)}</section>
    <div className="af-risk-ops-grid"><Channels channels={channels} toggle={toggleChannel} /><AuditLog audit={audit} /></div>
    {drawer ? <RiskDrawer item={drawer} onClose={() => setDrawer(null)} /> : null}
    {dialog ? <RulesDialog create={dialog === "create"} onClose={() => setDialog(null)} /> : null}
  </div>;
}

function PartnerCaptureScenario({ rate, scenario, onRateChange, onRecord }) {
  const meta = {
    healthy: { label: "На цели", tone: "green", action: "Сигнал не создаётся. Продолжаем наблюдение." },
    warning: { label: "Наблюдение", tone: "orange", action: "После второго finalized-среза создаётся warning для Growth Ops." },
    critical: { label: "Критично", tone: "red", action: "После второго finalized-среза создаётся critical alert для Finance и Growth Ops." },
    unavailable: { label: "N/A", tone: "blue", action: "Нет denominator: сигнал по проценту не создаётся." },
  }[scenario.status];
  return <section className="af-panel af-partner-scenario">
    <PanelHeader title="What-if · Partner Capture" subtitle="Проверка порогов без изменения факта, ruleset и финансовых данных" action={<Tag tone={meta.tone}>{meta.label.toUpperCase()} · DEMO</Tag>} />
    <div className="af-partner-scenario-grid">
      <div className="af-partner-scenario-control"><label htmlFor="partner-capture-scenario"><span>Сценарная доля Atlas</span><strong>{rate.toFixed(1)}%</strong></label><input id="partner-capture-scenario" type="range" min="25" max="40" step="0.5" value={rate} onChange={(event) => onRateChange(Number(event.target.value))} /><div><span>25%</span><span>цель 35%</span><span>40%</span></div><nav aria-label="Пресеты Partner Capture">{[[32, "Критично"], [34, "Наблюдение"], [35, "Цель"]].map(([value, label]) => <button type="button" className={rate === value ? "active" : ""} onClick={() => onRateChange(value)} key={value}>{value}%<small>{label}</small></button>)}</nav></div>
      <article><span>Текущий DEMO-факт</span><strong>{partnerCaptureDemoControl.ratePercent.toFixed(2)}%</strong><small>Не изменяется слайдером</small></article>
      <article><span>Недобор до 35%</span><strong>{formatMoney(scenario.shortfall)}</strong><small>При gross payout {formatMoney(scenario.grossPaid)}</small></article>
      <article><span>Отклонение</span><strong>{scenario.gapPercentagePoints > 0 ? "+" : ""}{scenario.gapPercentagePoints.toFixed(1)} п.п.</strong><small>От управленческой цели</small></article>
    </div>
    <div className={`af-partner-scenario-result is-${scenario.status}`}><AlertTriangle size={17} /><div><strong>{meta.action}</strong><span>Порядок проверки: reconciliation → completeness attribution → ruleset → compression и статусы прямых веток. Сценарий не создаёт платёж или funding instruction.</span></div><nav><button type="button" onClick={onRecord}>Добавить finalized DEMO-срез</button><a href="/admin/head-account#head-direct-branches">Проверить ветки</a></nav></div>
  </section>;
}

function PartnerCaptureJournal({ journal, onAcknowledge, onReset }) {
  const tone = journal.lifecycle === "critical" ? "red" : journal.lifecycle === "warning" || journal.lifecycle === "pending" || journal.lifecycle === "recovering" ? "orange" : journal.lifecycle === "unavailable" ? "blue" : "green";
  const labels = { healthy: "HEALTHY", pending: "1/2 BELOW", warning: "WARNING", critical: "CRITICAL", recovering: "1/2 RECOVERY", unavailable: "N/A" };
  const eventLabels = { opened: "Сигнал открыт", escalated: "Повышен до Critical", downgraded: "Понижен до Warning", acknowledged: "Принят в работу", recovered: "Восстановлен" };
  const time = (value) => new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  return <section className="af-panel af-partner-journal">
    <PanelHeader title="Журнал Partner Capture" subtitle="Browser-local DEMO · последние finalized-срезы и переходы alert lifecycle" action={<div className="af-partner-journal-actions"><Tag tone={tone}>{labels[journal.lifecycle]}</Tag><button type="button" onClick={onReset} title="Сбросить DEMO-журнал"><RotateCcw size={13} />Сбросить</button></div>} />
    <div className="af-partner-journal-summary"><div><span>Owner</span><strong>Growth Ops + Finance</strong></div><div><span>Условие сигнала</span><strong>2 finalized-среза</strong></div><div><span>Текущая серия</span><strong>{journal.lifecycle === "recovering" ? `${journal.consecutiveHealthy}/2 healthy` : `${journal.consecutiveBelow}/2 below`}</strong></div><div><span>Acknowledgement</span><strong>{journal.acknowledgedAt ? time(journal.acknowledgedAt) : journal.activeSeverity ? "Ожидает" : "Не требуется"}</strong></div></div>
    {journal.activeSeverity ? <div className={`af-partner-active-alert is-${journal.activeSeverity}`}><AlertTriangle size={17} /><div><strong>{journal.activeSeverity === "critical" ? "Critical" : "Warning"}: Partner Capture ниже целевого коридора</strong><span>SLA первичного разбора: {journal.activeSeverity === "critical" ? "2 часа" : "1 рабочий день"}. Acknowledgement не закрывает исходное условие.</span></div><button type="button" disabled={Boolean(journal.acknowledgedAt)} onClick={onAcknowledge}>{journal.acknowledgedAt ? "Принято" : "Принять"}</button></div> : null}
    <div className="af-partner-journal-grid"><div><h3>Последние срезы</h3>{journal.cuts.length ? journal.cuts.slice(0, 6).map((cut) => <p key={cut.id}><span>{time(cut.at)}<small>{cut.finality}</small></span><strong>{cut.ratePercent.toFixed(1)}%</strong><Tag tone={cut.status === "critical" ? "red" : cut.status === "warning" ? "orange" : cut.status === "unavailable" ? "blue" : "green"}>{cut.status.toUpperCase()}</Tag></p>) : <div className="af-partner-journal-empty">Ещё нет DEMO-срезов</div>}</div><div><h3>История переходов</h3>{journal.history.length ? journal.history.slice(0, 6).map((event) => <p key={event.id}><span>{time(event.at)}<small>{event.severity || "healthy"}</small></span><strong>{eventLabels[event.type]}</strong></p>) : <div className="af-partner-journal-empty">Переходов пока не было</div>}</div></div>
    <footer>Журнал хранится только в этом браузере. Production-версия потребует server timestamp, immutable event log, RBAC, MFA и каналы доставки.</footer>
  </section>;
}

function AlertCenter({ alerts, status, setStatus, owner, setOwner, owners, sla, setSla, acknowledge, acknowledgeVisible, openDrawer }) {
  return <section className="af-panel af-alert-center"><PanelHeader title="Центр уведомлений" subtitle="Severity, статус, владелец, SLA и ссылка на первичные данные" action={<div className="af-alert-head-actions"><Tag tone="red">{alerts.length} показано</Tag><button className="af-small-link" type="button" onClick={acknowledgeVisible} disabled={!alerts.length}>Подтвердить видимые</button></div>} /><div className="af-risk-tabs" role="tablist">{[["open", "Открытые"], ["acknowledged", "Подтверждённые"], ["all", "Вся история"]].map(([id, label]) => <button type="button" role="tab" aria-selected={status === id} className={status === id ? "active" : ""} onClick={() => setStatus(id)} key={id}>{label}</button>)}</div><div className="af-alert-queue-filters"><label><span>Ответственный</span><select value={owner} onChange={(event) => setOwner(event.target.value)}><option value="all">Все владельцы</option>{owners.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label><span>SLA</span><select value={sla} onChange={(event) => setSla(event.target.value)}><option value="all">Все сроки</option>{Object.entries(slaLabels).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label></div>{alerts.length ? <div className="af-alert-list">{alerts.map((item) => <article className="af-alert-row" style={{ "--severity": severityMeta[item.severity].color }} key={item.id}><i /><div className="af-alert-title"><strong>{item.title}</strong><small>{item.subtitle}</small></div><div className="af-alert-cell"><span>Текущее / порог</span><strong>{item.current}</strong></div><div className="af-alert-cell"><span>Owner / deadline</span><strong>{item.owner}</strong><small>{item.deadline} · {slaLabels[item.sla]}</small></div><div className="af-alert-cell source"><span>Источник</span><strong>{item.source}</strong></div><div className="af-alert-actions"><button type="button" onClick={() => openDrawer(item)}>Источник</button><button className={item.status === "acknowledged" ? "done" : ""} type="button" onClick={() => acknowledge(item.id)} disabled={item.status === "acknowledged"}>{item.status === "acknowledged" ? "Принято" : "Принять"}</button></div></article>)}</div> : <div className="af-alert-empty"><strong>Нет сигналов в выбранном фильтре</strong><span>Измените severity, статус, владельца или SLA.</span></div>}</section>;
}

function Coverage() {
  return <section className="af-panel"><PanelHeader title="Reserve & Coverage" subtitle="Stress scenario · последовательное снижение баланса" action={<Tag tone="red">Ниже UI-порога</Tag>} /><div className="af-coverage"><div className="af-coverage-ring"><strong>1.08×</strong></div><div className="af-coverage-meta"><div><span>Available Spendable</span><strong>$164,738</strong></div><div><span>Required Reserve</span><strong>$25,000</strong></div><div><span>Peak Funding Gap</span><strong className="bad">$4,641</strong></div><div><span>Первый breach</span><strong>14.09</strong></div></div><div className="af-coverage-thresholds">{[["24 часа", "2.84×", 88, "#239a77"], ["7 дней", "1.72×", 64, "#ff8716"], ["30 дней", "1.08×", 39, "#cf534c"]].map(([label, value, width, color]) => <div key={label}><span>{label}</span><b><i style={{ width: `${width}%`, background: color }} /></b><strong>{value}</strong></div>)}</div><p>Reserve policy и coverage threshold остаются Gate 0. До утверждения интерфейс показывает их как конфигурацию, а не установленный норматив.</p></div></section>;
}

function Channels({ channels, toggle }) {
  const rows = [["center", "Центр уведомлений", "Critical, High, Medium, Info"], ["email", "Email Finance", "Critical и High · finance@atlas"], ["telegram", "Telegram admin chat", "Critical · отдельная настройка"], ["digest", "Ежедневный digest", "09:00 UTC · открытые и stale"]];
  return <section className="af-panel"><PanelHeader title="Каналы уведомлений" subtitle="Настройка доставки по severity" action={<Tag tone="blue">MFA для изменения</Tag>} /><div className="af-channel-list">{rows.map(([id, title, note]) => <div key={id}><div><strong>{title}</strong><small>{note}</small></div><button className={channels[id] ? "on" : ""} type="button" onClick={() => toggle(id)} aria-label={title} aria-pressed={channels[id]}><i /></button></div>)}</div></section>;
}

function AuditLog({ audit }) {
  return <section className="af-panel"><PanelHeader title="Журнал действий" subtitle="Подтверждения, каналы и раскрытия первичных данных" action={<a className="af-small-link" href="/admin/methodology">Полный audit log</a>} /><div className="af-risk-audit">{audit.map(([time, action, actor, request], index) => <div key={`${request}-${index}`}><span>{time}</span><strong>{action}</strong><span>{actor}</span><code>{request}</code></div>)}</div></section>;
}

function RiskDrawer({ item, onClose }) {
  return <div className="af-risk-drawer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside role="dialog" aria-modal="true" aria-labelledby="af-risk-drawer-title"><header><div><h2 id="af-risk-drawer-title">Источник сигнала</h2><p>UI-only demo · первичная детализация</p></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={18} /></button></header><section><span>Описание</span><strong>{item.title}</strong><p>{item.detail}</p></section><section><span>Владелец и срок</span><strong>{item.owner} · {item.deadline}</strong><p>Подтверждение сигнала не меняет его источник и не закрывает риск автоматически.</p></section><section><span>Метаданные расчёта</span><strong>block 54,721,008 · final · formula risk-v1.2</strong><p>Production API возвращает perimeter, block hash, freshness, partial, reconciliation status и request ID.</p></section><section><span>Доступ к первичным данным</span><strong>Economic payout → component → event → transfer</strong><p>Полный wallet address и экспорт требуют серверного разрешения, MFA step-up и записи в audit log.</p></section><footer><a className="af-small-link" href={item.href}>Перейти к источнику</a></footer></aside></div>;
}
