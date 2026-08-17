import { AlertCircle, BookOpenCheck, CalendarDays, Download, Info, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  activeCycleMix,
  cycleEventSeries,
  cycleTypeMetrics,
  formatMoney,
  maturityBuckets,
  overviewPeriods,
} from "./data/overviewData";
import { useAdminFinanceCycles } from "./api/useAdminFinanceApi";
import {
  adminFinanceApiEnabled,
  resolveAdminFinanceDefaultAsOfDate,
} from "./api/adminFinanceConfig";

const periodScale = { "7d": 0.28, "1m": 1, "3m": 3.1, "6m": 6.2, "1y": 12.3, all: 18.6 };
const periodDays = { "7d": 7, "1m": 30, "3m": 90, "6m": 180, "1y": 365, all: 366 };
const tabs = [
  ["overview", "Обзор"], ["active", "Активные · 573"], ["completed", "Завершенные · 424"],
  ["claim", "Ожидают claim · 19"], ["maturity", "Календарь maturity"], ["rules", "Версии правил · 7"],
];

function reportRange(period, asOfDate) {
  const to = new Date(`${asOfDate}T00:00:00.000Z`);
  to.setUTCDate(to.getUTCDate() + 1);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - periodDays[period]);
  return { from: from.toISOString(), to: to.toISOString() };
}

function atomicDecimal(money) {
  if (money?.displayAmount) return money.displayAmount;
  const raw = BigInt(money?.amountRaw || "0");
  const negative = raw < 0n;
  const decimals = Number(money?.decimals || 0);
  const digits = (negative ? -raw : raw).toString().padStart(decimals + 1, "0");
  const whole = decimals ? digits.slice(0, -decimals) || "0" : digits;
  const fraction = decimals ? digits.slice(-decimals).replace(/0+$/, "") : "";
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

function formatWireMoney(money) {
  if (money?.available === false) return "N/A";
  const decimal = atomicDecimal(money);
  const negative = decimal.startsWith("-");
  const unsigned = negative ? decimal.slice(1) : decimal;
  const [whole, fraction] = unsigned.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}${fraction ? `.${fraction}` : ""}`;
}

function sumWireMoney(rows, key, currency = "USDT") {
  const sample = rows.find((row) => row[key])?.[key] || { decimals: 6, symbol: currency };
  const available = rows.some((row) => row[key]) && rows.every((row) => row[key]?.available !== false);
  return {
    ...sample,
    amountRaw: rows.reduce((sum, row) => sum + BigInt(row[key]?.amountRaw || "0"), 0n).toString(),
    displayAmount: undefined,
    available,
  };
}

function formatAverageWireMoney(total, count) {
  if (total?.available === false) return "N/A";
  if (!count) return "$0.00";
  const value = Number(atomicDecimal(total)) / count;
  return `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
}

function Tag({ children, tone = "green" }) { return <span className={`af-tag af-tag-${tone}`}>{children}</span>; }

function Metric({ accent, label, tag, tagTone, value, unit, note, noteTone }) {
  return <article className="af-metric" style={{ "--metric-accent": accent }}><div className="af-metric-head"><span>{label}</span><Tag tone={tagTone}>{tag}</Tag></div><div className="af-metric-value">{value} {unit ? <small>{unit}</small> : null}</div><p className={noteTone ? `is-${noteTone}` : ""}>{note}</p></article>;
}

function PanelHeader({ title, subtitle, action }) { return <div className="af-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }

function CycleTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="af-chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.dataKey} style={{ color: item.color }}>{item.name}: {item.dataKey === "activePrincipal" ? formatMoney(item.value) : item.value}</span>)}</div>;
}

function RulesDialog({ onClose }) {
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-rules-title"><div className="af-modal-head"><div><span><BookOpenCheck size={17} /> Правила циклов</span><h2 id="af-rules-title">Версионирование расчетов</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div><dl><div><dt>Версия цикла</dt><dd>Фиксируется при создании и определяет срок, Delta, партнерские начисления и eligibility.</dd></div><div><dt>Исторические циклы</dt><dd>Новые ставки не пересчитывают уже созданные циклы и обязательства.</dd></div><div><dt>Eligibility</dt><dd>Дата возникновения права на claim. Она не равна дате фактической выплаты.</dd></div><div><dt>Gross</dt><dd>Principal, Gross Delta и Gross Partner Reward учитываются отдельно; Platform Fee повторно не прибавляется.</dd></div></dl><p className="af-modal-warning"><Info size={16} /> Любое изменение правил требует новой версии, effective block и записи в журнале аудита.</p></section></div>;
}

function StaticCycles() {
  const [period, setPeriod] = useState("1m");
  const [type, setType] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [asOfDate, setAsOfDate] = useState(() => resolveAdminFinanceDefaultAsOfDate({
    apiEnabled: adminFinanceApiEnabled,
    demoDate: "2026-08-04",
  }));
  const [rulesOpen, setRulesOpen] = useState(false);
  const scale = periodScale[period];
  const totals = useMemo(() => ({ created: Math.round(573 * scale), completed: Math.round(424 * scale) }), [scale]);

  function exportCsv() {
    const rows = [["cycle_type", "active", "principal", "closed", "gross_delta", "maturity_7d", "rule_version"], ...cycleTypeMetrics.map((row) => [row.name, row.active, row.principal, row.closed, row.delta, row.maturity, row.version])];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `atlas-cycles-${asOfDate}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="af-content">
    <div className="af-cycle-toolbar">
      <div className="af-periods">{overviewPeriods.map((item) => <button type="button" className={period === item.id ? "active" : ""} onClick={() => setPeriod(item.id)} key={item.id}>{item.label}</button>)}</div>
      <label className="af-filter-select"><span>Тип:</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">Все циклы</option><option value="daily-100">Daily 200 · $100</option><option value="lockup">Lockup 30 · $100</option><option value="daily-large">Daily 200 · $10,000</option><option value="launch">Launch</option></select></label>
      <label className="af-date-control"><CalendarDays size={15} /><span>Срез на дату</span><input type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} /></label>
      <div className="af-page-actions"><button type="button" onClick={() => setRulesOpen(true)}><BookOpenCheck size={15} />Правила циклов</button><button className="primary af-export-action" type="button" onClick={exportCsv}><Download size={15} />Экспорт</button></div>
    </div>

    <div className="af-cycle-tabs" role="tablist">{tabs.map(([id, label]) => <button role="tab" aria-selected={activeTab === id} type="button" className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)} key={id}>{label}</button>)}</div>

    <section className="af-metrics af-metrics-five af-cycle-metrics">
      <Metric accent="#ff8716" label="Создано за период" tag="+12.8%" tagTone="orange" value={totals.created.toLocaleString("ru-RU")} unit="цикла" note="153 Smart Cycle + 420 Launch · Principal $18,420" />
      <Metric accent="#4e76d0" label="Активные циклы" tag="DEMO" tagTone="blue" value="573" note="Активный Principal $46,800" />
      <Metric accent="#239a77" label="Завершено" tag="DEMO" tagTone="green" value={totals.completed.toLocaleString("ru-RU")} note="Claim paid: 405 · ожидают: 19" noteTone="good" />
      <Metric accent="#f6b92f" label="Средний Principal" tag="MIX" tagTone="yellow" value="$120" unit="USDT" note="Медиана $100" />
      <Metric accent="#cf534c" label="Maturity · 7 дней" tag="83 цикла" tagTone="red" value="$31,804" unit="gross" note="Пик $12,269 · 11 августа" noteTone="risk" />
    </section>

    <div className="af-cycles-grid">
      <section className="af-panel"><PanelHeader title="Открытие и завершение циклов" subtitle="Количество событий по дням и активный Principal" /><div className="af-cycle-chart-wrap"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={cycleEventSeries} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}><CartesianGrid vertical={false} stroke="#f0e4d8" /><XAxis dataKey="date" axisLine={false} tickLine={false} interval={1} tick={{ fill: "#8e7b70", fontSize: 9 }} /><YAxis yAxisId="events" axisLine={false} tickLine={false} width={34} tick={{ fill: "#8e7b70", fontSize: 9 }} /><YAxis yAxisId="principal" orientation="right" hide domain={[0, 45000]} /><Tooltip content={<CycleTooltip />} /><Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 9 }} /><Bar yAxisId="events" dataKey="created" name="Создано" fill="#ff8716" radius={[3, 3, 0, 0]} barSize={22} isAnimationActive={false} /><Bar yAxisId="events" dataKey="completed" name="Завершено" fill="#503021" radius={[3, 3, 0, 0]} barSize={22} isAnimationActive={false} /><Line yAxisId="principal" dataKey="activePrincipal" name="Активный Principal" stroke="#239a77" strokeWidth={2.5} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div></section>
      <section className="af-panel"><PanelHeader title="Структура активных циклов" subtitle="573 активных цикла · Principal $46,800" action={<Tag tone="blue">Все версии</Tag>} /><div className="af-cycle-mix"><div className="af-cycle-mix-top"><div className="af-cycle-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={activeCycleMix} dataKey="value" innerRadius={38} outerRadius={61} stroke="none" isAnimationActive={false}>{activeCycleMix.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie></PieChart></ResponsiveContainer><strong>573</strong></div><div className="af-cycle-mix-list">{activeCycleMix.map((item) => <div key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><strong>{item.value} · {item.share}</strong></div>)}</div></div><div className="af-rule-note"><strong>Правила рассчитываются по версии цикла.</strong><br />Изменение текущих ставок не пересчитывает исторические циклы и уже созданные обязательства.</div></div></section>
    </div>

    <div className="af-cycles-lower">
      <section className="af-panel af-cycle-register"><PanelHeader title={activeTab === "overview" ? "Показатели по типам циклов" : tabs.find(([id]) => id === activeTab)?.[1]} subtitle="Principal, закрытия, Delta и ближайшие обязательства" action={<button className="af-small-link" type="button">Открыть реестр</button>} /><div className="af-table-scroll"><table><thead><tr><th>Цикл</th><th className="number">Активные</th><th className="number">Principal</th><th className="number">Закрыто</th><th className="number">Gross Delta</th><th className="number">Maturity 7д</th><th>Версия</th></tr></thead><tbody>{cycleTypeMetrics.filter((row) => type === "all" || ({ "daily-100": "Daily 200 · $100", lockup: "Lockup 30 · $100", "daily-large": "Daily 200 · $10,000", launch: "Launch" }[type] === row.name)).map((row) => <tr key={row.name}><td><strong>{row.name}</strong><small>{row.term}</small></td><td className="number">{row.active}</td><td className="number">{formatMoney(row.principal)}</td><td className="number">{row.closed}</td><td className="number">{formatMoney(row.delta)}</td><td className="number">{formatMoney(row.maturity)}</td><td><Tag tone={row.tone}>{row.version}</Tag></td></tr>)}</tbody></table></div></section>
      <section className="af-panel"><PanelHeader title="Ближайший eligibility schedule" subtitle="Maximum eligible exposure; eligibility не равна дате фактического cash-out" action={<a className="af-small-link" href="/admin/forecast">Календарь</a>} /><div className="af-maturity"><div className="af-next-maturity"><span>Ближайший крупный день<br /><strong>11 августа · 31 цикл</strong></span><b>$12,269</b></div>{maturityBuckets.map((item) => <div className="af-maturity-row" key={item.label}><span>{item.label}</span><div><i style={{ width: `${item.principal / item.total * item.load}%`, background: "#503021" }} /><i style={{ width: `${item.delta / item.total * item.load}%`, background: "#ff8716" }} /><i style={{ width: `${item.partner / item.total * item.load}%`, background: "#4e76d0" }} /></div><strong>{formatMoney(item.total)}</strong></div>)}<div className="af-method-note">Principal, Gross Delta и Gross Partner Reward streamed учитываются отдельно. Platform Fee уже находится внутри Gross и повторно не прибавляется.</div></div></section>
    </div>
    {rulesOpen ? <RulesDialog onClose={() => setRulesOpen(false)} /> : null}
  </div>;
}

function CyclesRequestState({ request }) {
  const title = request.status === "loading"
    ? "Загрузка циклов"
    : request.status === "auth-required"
      ? "Нужна админ-сессия"
      : "Данные циклов недоступны";
  const copy = request.status === "loading"
    ? "Получаем агрегаты по состояниям циклов из Admin API."
    : request.status === "auth-required"
      ? "API вернул 401. Макетные показатели не подставлены."
      : "Запрос не выполнен. Последние demo-значения намеренно скрыты.";
  return <section className="af-api-boundary" aria-live="polite"><AlertCircle size={24} /><span>СОСТОЯНИЯ ЦИКЛОВ · ДАННЫЕ НЕ ПОДМЕНЯЮТСЯ</span><h2>{title}</h2><p>{copy}</p>{request.status !== "loading" ? <button type="button" onClick={request.reload}>Повторить запрос</button> : null}<a href="/admin/methodology#gate">Проверить источники и Gate 0</a></section>;
}

function SourceUnavailable({ title, copy }) {
  return <div className="af-data-unavailable"><AlertCircle size={22} /><strong>{title}</strong><p>{copy}</p><a href="/admin/methodology#gate">Требования к источнику</a></div>;
}

const apiCycleColors = ["#ff8716", "#503021", "#4e76d0", "#239a77", "#f6b92f", "#cf534c"];

export default function AdminFinanceCycles() {
  const [period, setPeriod] = useState("1m");
  const [type, setType] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [exposureHorizon, setExposureHorizon] = useState("7d");
  const [asOfDate, setAsOfDate] = useState(() => resolveAdminFinanceDefaultAsOfDate({
    apiEnabled: adminFinanceApiEnabled,
    demoDate: "2026-08-04",
  }));
  const [rulesOpen, setRulesOpen] = useState(false);
  const query = useMemo(() => reportRange(period, asOfDate), [asOfDate, period]);
  const cyclesRequest = useAdminFinanceCycles(query);

  if (!__ADMIN_FINANCE_API_ONLY__ && !cyclesRequest.apiEnabled) return <StaticCycles />;
  if (cyclesRequest.status !== "ready") return <CyclesRequestState request={cyclesRequest} />;

  const source = cyclesRequest.data;
  const rows = source.data;
  const meta = source.meta;
  const totalCreated = rows.reduce((sum, row) => sum + row.openedCount, 0);
  const totalOpen = rows.reduce((sum, row) => sum + (Number.isInteger(row.openCount) ? row.openCount : Math.max(0, row.openedCount - row.closedCount)), 0);
  const totalClosed = rows.reduce((sum, row) => sum + row.closedCount, 0);
  const claimableCount = rows.every((row) => Number.isInteger(row.claimableCount))
    ? rows.reduce((sum, row) => sum + row.claimableCount, 0)
    : null;
  const totalVolume = sumWireMoney(rows, "principal", meta.currency);
  const claimableNow = sumWireMoney(rows, "claimableNow", meta.currency);
  const next7DaysLoad = sumWireMoney(rows, "next7DaysLoad", meta.currency);
  const next30DaysLoad = sumWireMoney(rows, "next30DaysLoad", meta.currency);
  const remainingLoad = sumWireMoney(rows, "projectedMaturityOutflow", meta.currency);
  const averagePrincipal = formatAverageWireMoney(totalVolume, totalCreated);
  const ruleVersions = new Set(rows.map((row) => row.rulesetVersion)).size;
  const exposureKey = { "7d": "next7DaysLoad", "30d": "next30DaysLoad", remaining: "projectedMaturityOutflow" }[exposureHorizon];
  const maxMaturity = Math.max(1, ...rows.map((row) => Number(atomicDecimal(row[exposureKey]))));
  const visibleRows = rows.filter((row) => type === "all" || row.productKey === type);
  const apiTabs = [
    ["overview", "Обзор"],
    ["active", `Открытые · ${totalOpen.toLocaleString("ru-RU")}`],
    ["completed", `Закрытые · ${totalClosed.toLocaleString("ru-RU")}`],
    ["maturity", "Максимальная нагрузка"],
    ["rules", `Версии правил · ${ruleVersions}`],
  ];
  const mix = rows.map((row, index) => ({
    name: row.label,
    value: Number.isInteger(row.openCount) ? row.openCount : Math.max(0, row.openedCount - row.closedCount),
    color: apiCycleColors[index % apiCycleColors.length],
    share: totalOpen ? `${(((Number.isInteger(row.openCount) ? row.openCount : Math.max(0, row.openedCount - row.closedCount)) / totalOpen) * 100).toFixed(1)}%` : "0.0%",
  }));

  return <div className="af-content">
    <div className="af-cycle-toolbar">
      <div className="af-periods">{overviewPeriods.map((item) => <button type="button" className={period === item.id ? "active" : ""} onClick={() => setPeriod(item.id)} key={item.id}>{item.label}</button>)}</div>
      <label className="af-filter-select"><span>Тип:</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">Все циклы</option>{rows.map((row) => <option value={row.productKey} key={row.productKey}>{row.label}</option>)}</select></label>
      <label className="af-date-control"><CalendarDays size={15} /><span>Срез на дату</span><input type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} /></label>
      <div className="af-page-actions"><button type="button" onClick={() => setRulesOpen(true)}><BookOpenCheck size={15} />Правила циклов</button></div>
    </div>

    <div className={`af-quality-notice ${meta.partial ? "is-partial" : ""}`}><span><AlertCircle size={13} /></span><p><strong>{meta.partial ? "Частичное покрытие источника." : "Источник сверён."}</strong> Блок {meta.asOfBlockNumber.toLocaleString("en-US")} · {meta.finality} · {meta.sourceStatus}. Количества и объёмы ниже показаны за всё время; точные даты возникновения обязательств пока не переданы.</p><b>{meta.reconciliationStatus}</b></div>

    <div className="af-cycle-tabs" role="tablist">{apiTabs.map(([id, label]) => <button role="tab" aria-selected={activeTab === id} type="button" className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)} key={id}>{label}</button>)}</div>

    <section className="af-metrics af-metrics-five">
      <Metric accent="#ff8716" label="Всего создано" tag="ALL TIME" tagTone="orange" value={totalCreated.toLocaleString("ru-RU")} unit="циклов" note={`Открыто ${totalOpen.toLocaleString("ru-RU")} · закрыто ${totalClosed.toLocaleString("ru-RU")}`} />
      <Metric accent="#4e76d0" label="Общий объём Principal" tag="ALL TIME" tagTone="blue" value={formatWireMoney(totalVolume)} note={`Средний Principal ${averagePrincipal}`} />
      <Metric accent="#239a77" label="Доступно к запросу" tag={claimableCount === null ? "N/A" : `${claimableCount} циклов`} tagTone="green" value={formatWireMoney(claimableNow)} note="Право уже возникло; дата фактического запроса неизвестна" noteTone="good" />
      <Metric accent="#f6b92f" label="Нагрузка · 7 дней" tag="МАКСИМУМ" tagTone="yellow" value={formatWireMoney(next7DaysLoad)} note="Агрегат источника; это не прогноз фактических выплат" />
      <Metric accent="#cf534c" label="Нагрузка · 30 дней" tag="МАКСИМУМ" tagTone="red" value={formatWireMoney(next30DaysLoad)} note={`Остающаяся нагрузка ${formatWireMoney(remainingLoad)}`} noteTone="risk" />
    </section>

    <div className="af-cycles-grid">
      <section className="af-panel"><PanelHeader title="Открытие и завершение циклов" subtitle="Количество событий по дням и активный Principal" /><SourceUnavailable title="История состояний по дням недоступна" copy="Для графика нужны начало временного интервала, количество открытых и закрытых циклов и активный Principal в одном подтверждённом срезе блока. Агрегат по продуктам нельзя искусственно раскладывать по дням." /></section>
      <section className="af-panel"><PanelHeader title="Структура открытых циклов" subtitle={`${totalOpen.toLocaleString("ru-RU")} открытых · объём за всё время ${formatWireMoney(totalVolume)}`} action={<Tag tone="blue">{ruleVersions} версии</Tag>} /><div className="af-cycle-mix"><div className="af-cycle-mix-top"><div className="af-cycle-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={mix} dataKey="value" innerRadius={38} outerRadius={61} stroke="none" isAnimationActive={false}>{mix.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie></PieChart></ResponsiveContainer><strong>{totalOpen}</strong></div><div className="af-cycle-mix-list">{mix.map((item) => <div key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><strong>{item.value} · {item.share}</strong></div>)}</div></div><div className="af-rule-note"><strong>Версия правил фиксируется на уровне цикла.</strong><br />Экран не пересчитывает исторические обязательства по текущей ставке.</div></div></section>
    </div>

    <div className="af-cycles-lower">
      <section className="af-panel af-cycle-register">
        <PanelHeader title={apiTabs.find(([id]) => id === activeTab)?.[1] || "Показатели по типам"} subtitle="Итоги за всё время по продуктам и версиям правил" action={<Tag tone={meta.partial ? "orange" : "green"}>{meta.partial ? "PARTIAL" : "RECONCILED"}</Tag>} />
        <div className="af-table-scroll"><table><thead><tr><th>Цикл</th><th className="number">Всего</th><th className="number">Открыто</th><th className="number">Закрыто</th><th className="number">Объём</th><th className="number">Доступно к запросу</th><th className="number">7 дней</th><th className="number">30 дней</th><th>Версия</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.productKey}><td><strong>{row.label}</strong><small>{row.productKey}</small></td><td className="number">{row.openedCount.toLocaleString("ru-RU")}</td><td className="number">{(Number.isInteger(row.openCount) ? row.openCount : Math.max(0, row.openedCount - row.closedCount)).toLocaleString("ru-RU")}</td><td className="number">{row.closedCount.toLocaleString("ru-RU")}</td><td className="number">{formatWireMoney(row.principal)}</td><td className="number">{formatWireMoney(row.claimableNow)}</td><td className="number">{formatWireMoney(row.next7DaysLoad)}</td><td className="number">{formatWireMoney(row.next30DaysLoad)}</td><td><Tag tone="blue">{row.rulesetVersion}</Tag></td></tr>)}</tbody></table></div>
      </section>
      <section className="af-panel">
        <PanelHeader title="Максимальная нагрузка по продуктам" subtitle="Агрегат источника; это не прогноз даты фактического запроса" action={<div className="af-exposure-switch">{[["7d", "7д"], ["30d", "30д"], ["remaining", "Всё"]].map(([id, label]) => <button type="button" className={exposureHorizon === id ? "active" : ""} onClick={() => setExposureHorizon(id)} key={id}>{label}</button>)}</div>} />
        <div className="af-maturity">{visibleRows.map((row) => { const value = Number(atomicDecimal(row[exposureKey])); return <div className="af-maturity-row" key={row.productKey}><span>{row.label}</span><div><i style={{ width: `${Math.max(2, value / maxMaturity * 100)}%`, background: exposureHorizon === "7d" ? "#f6b92f" : exposureHorizon === "30d" ? "#ff8716" : "#503021" }} /></div><strong>{formatWireMoney(row[exposureKey])}</strong></div>; })}<div className="af-method-note">Доступная к запросу сумма показана отдельно. Для календаря остатков нужны дата интервала, Principal, Gross Delta, партнёрское вознаграждение по графику и утверждённый резерв.</div></div>
      </section>
    </div>
    {rulesOpen ? <RulesDialog onClose={() => setRulesOpen(false)} /> : null}
  </div>;
}
