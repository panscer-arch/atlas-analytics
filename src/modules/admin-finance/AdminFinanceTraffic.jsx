import { BookOpenCheck, Check, Download, Info, RefreshCw, X } from "lucide-react";
import { useMemo, useState } from "react";

const periods = [["7d", "7 дней"], ["30d", "30 дней"], ["90d", "90 дней"], ["all", "Всё время"]];

const snapshots = {
  "7d": { users: 8420, sessions: 11684, engaged: 7196, wallets: 1284, cycles: 418, conversion: 32.6, note: "+9,4% к прошлому периоду" },
  "30d": { users: 31860, sessions: 45204, engaged: 28408, wallets: 4912, cycles: 1706, conversion: 34.7, note: "+6,1% к прошлому периоду" },
  "90d": { users: 82415, sessions: 119620, engaged: 73941, wallets: 12804, cycles: 4606, conversion: 36, note: "+14,8% к прошлому периоду" },
  all: { users: 146902, sessions: 214517, engaged: 131860, wallets: 22408, cycles: 7632, conversion: 34.1, note: "С начала наблюдений" },
};

const baseFunnel = [
  ["Sessions", 11684, "GA4 journey"],
  ["Engaged sessions", 7196, "GA4 journey"],
  ["Wallet connect started", 2386, "Atlas event"],
  ["Wallet connect success", 1574, "Atlas event"],
  ["Server-confirmed wallet", 1284, "Atlas backend"],
  ["Cycle create started", 768, "Atlas event"],
  ["Wallet confirmed", 492, "On-chain intent"],
  ["On-chain cycle created", 418, "On-chain final"],
];

const walletSegments = [
  ["Новые за период", 742, "Первое server-confirmed подключение внутри периода"],
  ["Returning wallets", 542, "Подтверждались до начала выбранного периода"],
  ["Без цикла", 866, "Нет подтверждённого cycle_created ни в одной версии контракта"],
  ["Zero-balance", 304, "USDT balance = 0 по безопасной on-chain проверке"],
  ["С активными циклами", 337, "Есть минимум один активный цикл на дату среза"],
  ["Только завершённые", 81, "Нет активных, но есть завершённые циклы"],
  ["Создали цикл ≤7 дней", 371, "Когортная конверсия без смешивания периодов"],
  ["Создали цикл ≤30 дней", 401, "30-дневное окно для той же wallet cohort"],
];

const sources = [
  { id: "ga4", name: "GA4 Data API", type: "journey / session", data: "Users, sessions, UTM, browser events", updated: "35 минут назад", sla: "4 часа", status: "DEMO", tone: "orange", checkpoint: "05.08.2026 08:45 UTC", limit: "Отложенная обработка; не использовать как on-chain факт" },
  { id: "atlas", name: "Atlas backend", detailName: "Atlas product events", type: "server events", data: "Wallet registered, cycle intent", updated: "3 минуты назад", sla: "5 минут", status: "DEMO", tone: "orange", checkpoint: "05.08.2026 09:17 UTC", limit: "Server-confirmed wallet является источником wallet cohort" },
  { id: "chain", name: "On-chain indexer", detailName: "BNB Chain indexer", type: "canonical ledger", data: "Cycle created, receipt, transfer", updated: "2 минуты назад", sla: "5 минут", status: "DEMO", tone: "orange", checkpoint: "Block 54 728 410", limit: "Только finalized events входят в cycle_created" },
  { id: "linkage", name: "Pseudonymous linkage", detailName: "GA4 linkage DB", type: "retention 30 days", data: "Journey → confirmed wallet", updated: "5 минут назад", sla: "15 минут", status: "PARTIAL", tone: "orange", checkpoint: "05.08.2026 09:15 UTC", limit: "159 unmatched wallets; 47 unattributed cycles" },
];

const number = (value) => value.toLocaleString("ru-RU");
const percent = (value) => `${value.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

function Tag({ tone = "green", children }) { return <span className={`af-tag af-tag-${tone}`}>{children}</span>; }
function Metric({ accent, label, tag, tone, value, note }) { return <article className="af-metric af-traffic-metric" style={{ "--metric-accent": accent }}><div className="af-metric-head"><span>{label}</span><Tag tone={tone}>{tag}</Tag></div><div className="af-metric-value">{value}</div><p>{note}</p></article>; }
function PanelHeader({ title, subtitle, action }) { return <div className="af-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }

function MethodDialog({ onClose }) {
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-traffic-method-title"><div className="af-modal-head"><div><span><BookOpenCheck size={17} /> Методика</span><h2 id="af-traffic-method-title">Как считается сквозная воронка</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div><dl><div><dt>Sessions</dt><dd>Сессии GA4 являются grain веб-воронки и не равны количеству людей или кошельков.</dd></div><div><dt>Browser success</dt><dd>Клиентское событие успешного подключения. Оно не подтверждает регистрацию кошелька сервером Atlas.</dd></div><div><dt>Confirmed wallet</dt><dd>Уникальный кошелёк, впервые подтверждённый server-side событием Atlas.</dd></div><div><dt>First cycle</dt><dd>Первый finalized cycle_created из канонического on-chain indexer.</dd></div><div><dt>Attribution</dt><dd>Псевдонимный linkage ID хранится 30 дней. Адрес кошелька и tx hash в GA4 не передаются.</dd></div></dl><div className="af-modal-warning"><Info size={16} /><span>Источники имеют разную задержку. До сверки checkpoint показатели GA4 нельзя трактовать как on-chain факт.</span></div></section></div>;
}

function exportCsv(tab, snapshot, stages) {
  const rows = tab === "funnel" ? [["metric", "value"], ["users", snapshot.users], ["sessions", snapshot.sessions], ["engaged_sessions", snapshot.engaged], ["server_confirmed_wallets", snapshot.wallets], ["first_onchain_cycle", snapshot.cycles], ...stages.map((stage) => [stage.label, stage.value])] : tab === "segments" ? [["segment", "wallets", "definition"], ...walletSegments] : [["source", "data", "updated", "sla", "status", "checkpoint", "limitation"], ...sources.map((source) => [source.name, source.data, source.updated, source.sla, source.status, source.checkpoint, source.limit])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `atlas-traffic-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminFinanceTraffic() {
  const [period, setPeriod] = useState("7d");
  const [tab, setTab] = useState("funnel");
  const [methodOpen, setMethodOpen] = useState(false);
  const [sourceDetail, setSourceDetail] = useState(null);
  const [segmentSaved, setSegmentSaved] = useState(false);
  const [refreshLabel, setRefreshLabel] = useState("Обновить");
  const snapshot = snapshots[period];
  const stages = useMemo(() => {
    const ratio = snapshot.sessions / snapshots["7d"].sessions;
    return baseFunnel.map(([label, baseValue, source], index) => ({ label, source, value: period === "7d" ? baseValue : index === 0 ? snapshot.sessions : index === 1 ? snapshot.engaged : index === 4 ? snapshot.wallets : index === 7 ? snapshot.cycles : Math.round(baseValue * ratio) }));
  }, [period, snapshot]);
  const refreshSources = () => { setRefreshLabel("Обновлено"); window.setTimeout(() => setRefreshLabel("Обновить"), 1600); };

  return <div className="af-content af-traffic-page">
    <div className="af-traffic-toolbar"><div className="af-periods" aria-label="Период отчёта">{periods.map(([id, label]) => <button type="button" className={period === id ? "active" : ""} onClick={() => setPeriod(id)} key={id}>{label}</button>)}</div><div className="af-date-control"><span>Срез данных</span><strong>05.08.2026 · 09:20 UTC</strong></div><div className="af-page-actions"><button type="button" onClick={() => setMethodOpen(true)}><BookOpenCheck size={15} />Методика</button><button className="primary" type="button" onClick={() => exportCsv(tab, snapshot, stages)}><Download size={15} />Экспорт</button></div></div>

    <div className="af-traffic-notice"><Info size={17} /><p><strong>Демонстрационный snapshot.</strong> Значения показывают структуру будущего отчёта и не являются подтверждённой статистикой Atlas. GA4 и on-chain данные имеют разную задержку.</p><button type="button" onClick={() => setTab("sources")}>Проверить источники</button></div>

    <div className="af-traffic-tabs" role="tablist" aria-label="Разделы трафика">{[["funnel", "Воронка"], ["segments", "Сегменты кошельков"], ["sources", "Источники и связка"]].map(([id, label]) => <button type="button" role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)} key={id}>{label}</button>)}</div>

    {tab === "funnel" ? <><section className="af-metrics af-metrics-five"><Metric accent="#4e76d0" label="Users" tag="GA4" tone="blue" value={number(snapshot.users)} note={snapshot.note} /><Metric accent="#7a5bb8" label="Sessions" tag="JOURNEY" tone="violet" value={number(snapshot.sessions)} note="Основной grain веб-воронки" /><Metric accent="#239a77" label="Engaged sessions" tag={percent(snapshot.engaged / snapshot.sessions * 100)} value={number(snapshot.engaged)} note="Engagement rate по GA4" /><Metric accent="#ff8716" label="Server-confirmed wallets" tag="ATLAS" tone="orange" value={number(snapshot.wallets)} note="Когорта первого подтверждения" /><Metric accent="#503021" label="First on-chain cycle" tag="CHAIN" tone="brown" value={number(snapshot.cycles)} note={`${percent(snapshot.conversion)} от confirmed wallets`} /></section>
      <div className="af-traffic-main-grid"><section className="af-panel"><PanelHeader title="Сквозная воронка" subtitle="Web journey → серверное подтверждение → on-chain факт" action={<div className="af-traffic-legend"><span><i className="ga4" />GA4</span><span><i className="atlas" />Atlas backend</span><span><i className="chain" />On-chain</span></div>} /><div className="af-funnel">{stages.map((stage, index) => { const previous = index ? stages[index - 1].value : stage.value; const conversion = stage.value / previous * 100; const drop = previous - stage.value; const sourceClass = index < 2 ? "ga4" : index < 6 ? "atlas" : "chain"; return <div className="af-funnel-row" key={stage.label}><div><strong>{stage.label}</strong><small>{stage.source}</small></div><span className="af-funnel-track"><i className={sourceClass} style={{ width: `${Math.max(4, stage.value / stages[0].value * 100)}%` }} /></span><b>{number(stage.value)}</b><Tag tone={index && conversion < 60 ? "orange" : "blue"}>{index ? `−${number(drop)} · ${percent(conversion)}` : "100%"}</Tag></div>; })}</div><div className="af-traffic-footnote">Конверсия и отвал считаются относительно предыдущего этапа. Browser success и server-confirmed wallet намеренно разделены: событие интерфейса не доказывает регистрацию кошелька в Atlas.</div></section>
        <section className="af-panel"><PanelHeader title="Качество связки GA4 → Wallet" subtitle="Псевдонимный ID, без адреса кошелька в GA4" action={<Tag tone="orange">PARTIAL</Tag>} /><div className="af-linkage-body"><div className="af-quality-ring"><div><strong>87,6%</strong><span>coverage</span></div></div><div className="af-linkage-stats"><div><span>Связано с GA4 journey</span><strong>1 125</strong></div><div><span>Unmatched wallets</span><strong className="is-warn">159</strong></div><div><span>Циклы unattributed</span><strong>47</strong></div><div><span>Retention linkage ID</span><strong>30 дн.</strong></div></div><p><Info size={15} />Полный wallet address, tx hash и другие прямые идентификаторы в GA4 не передаются. Повторные циклы сохраняют атрибуцию первого server-confirmed connection.</p></div></section></div></> : null}

    {tab === "segments" ? <><section className="af-metrics"><Metric accent="#ff8716" label="Connected wallets" tag="UNIQUE" tone="orange" value="1 284" note="Подтверждены сервером Atlas" /><Metric accent="#239a77" label="Wallet with cycle" tag="32,6%" value="418" note="Есть хотя бы один on-chain цикл" /><Metric accent="#cf534c" label="Wallet without cycle" tag="67,4%" tone="red" value="866" note="Главный резерв конверсии" /><Metric accent="#4e76d0" label="7-day wallet conversion" tag="COHORT" tone="blue" value="28,9%" note="Одна когорта confirmed wallets" /></section><section className="af-panel"><PanelHeader title="Сегменты кошельков" subtitle="Сегменты могут пересекаться; определения фиксируются в методике" action={<button className={`af-small-link ${segmentSaved ? "is-saved" : ""}`} type="button" onClick={() => setSegmentSaved(true)}>{segmentSaved ? <Check size={14} /> : null}{segmentSaved ? "Сегмент сохранён" : "Сохранить сегмент"}</button>} /><div className="af-wallet-segment-grid">{walletSegments.map(([label, value, definition]) => <article key={label}><span>{label}</span><strong>{number(value)}</strong><small>{definition}</small></article>)}</div></section></> : null}

    {tab === "sources" ? <><section className="af-metrics"><Metric accent="#239a77" label="GA4 Data API" tag="DEMO" tone="orange" value={<><span>35</span> <small>мин</small></>} note="Задержка источника" /><Metric accent="#239a77" label="Atlas product events" tag="DEMO" tone="orange" value={<><span>3</span> <small>мин</small></>} note="Server-side события" /><Metric accent="#239a77" label="On-chain indexer" tag="DEMO" tone="orange" value={<><span>2</span> <small>мин</small></>} note="Блок 54 728 410" /><Metric accent="#f0a83c" label="Linkage coverage" tag="PARTIAL" tone="orange" value="87,6%" note="159 wallets без journey" /></section><section className="af-panel"><PanelHeader title="Статус источников и контрольных связок" subtitle="Нажмите строку, чтобы увидеть SLA, checkpoint и ограничение данных" action={<button className="af-small-link" type="button" onClick={refreshSources}><RefreshCw size={14} />{refreshLabel}</button>} /><div className="af-table-scroll af-source-table"><table><thead><tr><th>Источник</th><th>Данные</th><th>Последнее обновление</th><th>SLA</th><th>Статус</th></tr></thead><tbody>{sources.map((source) => <tr className={sourceDetail?.id === source.id ? "active" : ""} tabIndex="0" role="button" onClick={() => setSourceDetail(source)} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && setSourceDetail(source)} key={source.id}><td><strong>{source.name}</strong><small>{source.type}</small></td><td>{source.data}</td><td>{source.updated}</td><td>{source.sla}</td><td><Tag tone={source.tone}>{source.status}</Tag></td></tr>)}</tbody></table></div></section>{sourceDetail ? <section className="af-panel af-source-detail"><PanelHeader title={sourceDetail.detailName || sourceDetail.name} subtitle="Техническая детализация выбранной строки" action={<button className="af-small-link" type="button" onClick={() => setSourceDetail(null)}>Закрыть</button>} /><div className="af-source-detail-grid"><div><span>Checkpoint</span><strong>{sourceDetail.checkpoint}</strong></div><div><span>Допустимая задержка</span><strong>до {sourceDetail.sla}</strong></div><div><span>Formula version</span><strong>traffic-v1.0-demo</strong></div><div><span>Ограничение</span><strong>{sourceDetail.limit}</strong></div></div></section> : null}</> : null}

    {methodOpen ? <MethodDialog onClose={() => setMethodOpen(false)} /> : null}
  </div>;
}
