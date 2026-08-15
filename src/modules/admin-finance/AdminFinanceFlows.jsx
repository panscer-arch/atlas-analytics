import {
  AlertCircle,
  BookOpenCheck,
  CalendarDays,
  Check,
  Download,
  Info,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminFinanceFlows } from "./api/useAdminFinanceApi";
import {
  adminFinanceApiEnabled,
  resolveAdminFinanceDefaultAsOfDate,
} from "./api/adminFinanceConfig";
import {
  cycleRows,
  flowSeries,
  formatMoney,
  moneyPerimeters,
  outgoingWaterfall,
  overviewPeriods,
} from "./data/overviewData";

const scales = { "7d": 0.42, "1m": 1, "3m": 3.15, "6m": 6.25, "1y": 12.4, all: 17.8 };
const periodDays = { "7d": 7, "1m": 30, "3m": 90, "6m": 180, "1y": 365, all: 366 };

function reportRange(period, asOfDate) {
  const to = new Date(`${asOfDate}T00:00:00.000Z`);
  to.setUTCDate(to.getUTCDate() + 1);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - periodDays[period]);
  return { from: from.toISOString(), to: to.toISOString(), granularity: "day" };
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

function formatWireMoney(money, { signed = false } = {}) {
  const decimal = atomicDecimal(money);
  const negative = decimal.startsWith("-");
  const unsigned = negative ? decimal.slice(1) : decimal;
  const [whole, fraction] = unsigned.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = negative ? "-" : signed && BigInt(money?.amountRaw || "0") > 0n ? "+" : "";
  return `${sign}$${grouped}${fraction ? `.${fraction}` : ""}`;
}

function moneyChartValue(money) {
  const value = Number(atomicDecimal(money));
  return Number.isFinite(value) ? value : 0;
}

function sumMoney(rows, key) {
  const sample = rows.find((row) => row[key])?.[key];
  const amountRaw = rows.reduce((sum, row) => sum + BigInt(row[key]?.amountRaw || "0"), 0n).toString();
  return { ...sample, amountRaw, displayAmount: undefined };
}

function shortDate(value) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(value)).replace(".", "");
}

function Tag({ children, tone = "green" }) {
  return <span className={`af-tag af-tag-${tone}`}>{children}</span>;
}

function Metric({ accent, label, tag, tagTone, value, unit = "USDT", note, good = false }) {
  return (
    <article className="af-metric" style={{ "--metric-accent": accent }}>
      <div className="af-metric-head"><span>{label}</span><Tag tone={tagTone}>{tag}</Tag></div>
      <div className="af-metric-value">{value} {unit ? <small>{unit}</small> : null}</div>
      <p className={good ? "is-good" : ""}>{note}</p>
    </article>
  );
}

function PanelHeader({ title, subtitle, action }) {
  return (
    <div className="af-panel-head">
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      {action}
    </div>
  );
}

function FlowTooltip({ active, payload, label, apiMode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="af-chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => {
        const wireValue = item.payload?.[`${item.dataKey}Money`];
        return <span key={item.dataKey} style={{ color: item.color }}>{item.name}: {apiMode && wireValue ? formatWireMoney(wireValue) : formatMoney(item.value)}</span>;
      })}
    </div>
  );
}

function FlowMethodology({ onClose, apiMeta }) {
  return (
    <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-flow-method-title">
        <div className="af-modal-head">
          <div><span><BookOpenCheck size={17} /> Методика</span><h2 id="af-flow-method-title">Границы денежных потоков</h2></div>
          <button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button>
        </div>
        <dl>
          <div><dt>Payout Contract</dt><dd>Все token transfers выбранного контракта, включая движение на контролируемый treasury.</dd></div>
          <div><dt>Atlas Consolidated</dt><dd>Только внешнее движение группы Atlas. Переводы между контролируемыми адресами исключаются.</dd></div>
          <div><dt>Company Treasury</dt><dd>Фактически поступившие Platform Fee и вознаграждения Head Account до OPEX и налогов.</dd></div>
          <div><dt>Net Flow</dt><dd>External Incoming минус External Outgoing в одном контуре, токене, периоде и временной зоне.</dd></div>
        </dl>
        <p className="af-modal-warning"><Info size={16} /> {apiMeta ? `Admin API · блок ${apiMeta.asOfBlockNumber} · ${apiMeta.finality} · reconciliation ${apiMeta.reconciliationStatus}.` : "Production-показатель считается сверенным только после сопоставления ledger и token transfer до утвержденного блока finality."}</p>
      </section>
    </div>
  );
}

function FlowRequestState({ request }) {
  const title = request.status === "loading" ? "Загрузка денежных потоков" : request.status === "auth-required" ? "Нужна админ-сессия" : "Денежные потоки недоступны";
  const copy = request.status === "loading" ? "Получаем три финансовых периметра и разбивку циклов из Admin API." : request.status === "auth-required" ? "API вернул 401. Макетные показатели не подставлены." : "Запрос не выполнен. Последние demo-значения намеренно скрыты.";
  return <section className="af-api-boundary" aria-live="polite"><AlertCircle size={24}/><span>MONEY FLOWS · FAIL-CLOSED</span><h2>{title}</h2><p>{copy}</p>{request.status !== "loading" ? <button type="button" onClick={request.reload}>Повторить запрос</button> : null}<a href="/admin/methodology#gate">Проверить источники и Gate 0</a></section>;
}

function aggregatePerimeter(dataset, name, description) {
  const rows = dataset.data;
  return {
    id: dataset.meta.perimeter,
    name,
    description,
    incoming: sumMoney(rows, "externalIn"),
    outgoing: sumMoney(rows, "externalOut"),
    net: sumMoney(rows, "netFlow"),
  };
}

function cycleMatches(row, selected) {
  if (selected === "all") return true;
  if (row.productKey) return row.productKey === selected;
  const normalized = row.name.toLowerCase();
  if (selected === "daily_200_100") return normalized.includes("daily 200") && normalized.includes("$100") && !normalized.includes("$10,000");
  if (selected === "daily_200_10000") return normalized.includes("$10,000");
  if (selected === "lockup_30_100") return normalized.includes("lockup 30");
  return normalized.includes(selected);
}

export default function AdminFinanceFlows() {
  const [period, setPeriod] = useState("1m");
  const [cycle, setCycle] = useState("all");
  const [token, setToken] = useState("USDT");
  const [asOfDate, setAsOfDate] = useState(() => resolveAdminFinanceDefaultAsOfDate({
    apiEnabled: adminFinanceApiEnabled,
    demoDate: "2026-08-04",
  }));
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const scale = scales[period];
  const periodLabel = overviewPeriods.find((item) => item.id === period)?.label || "Месяц";
  const query = useMemo(() => reportRange(period, asOfDate), [asOfDate, period]);
  const flowRequest = useAdminFinanceFlows(query);

  const demoTotals = useMemo(() => ({
    incoming: Math.round(18420 * scale),
    outgoing: Math.round(5612 * scale),
    net: Math.round(12808 * scale),
    partner: Math.round(1284 * scale),
    internal: Math.round(2460 * scale),
  }), [scale]);

  const apiView = useMemo(() => {
    if (flowRequest.status !== "ready") return null;
    const { consolidated, payoutContract, companyTreasury, overview } = flowRequest.data;
    const rows = consolidated.data;
    const consolidatedPerimeter = aggregatePerimeter(consolidated, "Atlas Consolidated", "Только внешние потоки группы Atlas. Внутренние переводы исключены.");
    const payoutPerimeter = aggregatePerimeter(payoutContract, "Payout Contract", "Все движения контракта, включая переводы на контролируемый treasury.");
    const treasuryPerimeter = aggregatePerimeter(companyTreasury, "Company Treasury", "Фактически полученный доход компании до OPEX и налогов.");
    const internalRaw = BigInt(payoutPerimeter.outgoing.amountRaw) - BigInt(consolidatedPerimeter.outgoing.amountRaw);
    const internal = { ...consolidatedPerimeter.outgoing, amountRaw: internalRaw.toString(), displayAmount: undefined };
    return {
      meta: consolidated.meta,
      overviewMeta: overview.meta,
      series: rows.map((row) => ({
        date: shortDate(row.bucketStart),
        incoming: moneyChartValue(row.externalIn),
        outgoing: moneyChartValue(row.externalOut),
        net: moneyChartValue(row.netFlow),
        incomingMoney: row.externalIn,
        outgoingMoney: row.externalOut,
        netMoney: row.netFlow,
      })),
      totals: {
        incoming: consolidatedPerimeter.incoming,
        outgoing: consolidatedPerimeter.outgoing,
        net: consolidatedPerimeter.net,
        internal,
      },
      perimeters: [payoutPerimeter, consolidatedPerimeter, treasuryPerimeter],
      cycles: overview.data.cycles.rows.map((row) => ({ name: row.label, productKey: row.productKey, opened: row.openedCount, inflow: row.inflow, share: `${(row.shareBps / 100).toFixed(1)}%` })),
    };
  }, [flowRequest.data, flowRequest.status]);

  if (flowRequest.apiEnabled && flowRequest.status !== "ready") return <FlowRequestState request={flowRequest} />;

  const apiMode = Boolean(apiView);
  const sourceMeta = apiView?.meta;
  const totals = apiMode ? apiView.totals : demoTotals;
  const visibleSeries = apiMode ? apiView.series : flowSeries;
  const visiblePerimeters = apiMode ? apiView.perimeters : moneyPerimeters;
  const allCycleRows = apiMode ? apiView.cycles : cycleRows;
  const visibleCycles = allCycleRows.filter((row) => cycleMatches(row, cycle));
  const displayMoney = (value, options) => apiMode ? formatWireMoney(value, options) : formatMoney(value, options);
  const visiblePeriodLabel = sourceMeta?.partial ? "доступный срез" : periodLabel;

  function exportCsv() {
    const rows = apiMode ? [
      ["bucket_start", "bucket_end", "perimeter", "external_in", "external_out", "net_flow", "block", "source_status"],
      ...flowRequest.data.consolidated.data.map((row) => [row.bucketStart, row.bucketEnd, "atlas_consolidated", atomicDecimal(row.externalIn), atomicDecimal(row.externalOut), atomicDecimal(row.netFlow), sourceMeta.asOfBlockNumber, sourceMeta.sourceStatus]),
    ] : [
      ["metric", "period", "cycle", "token", "value", "status"],
      ["external_incoming", periodLabel, cycle, token, totals.incoming, "DEMO"],
      ["external_outgoing", periodLabel, cycle, token, totals.outgoing, "DEMO"],
      ["net_flow", periodLabel, cycle, token, totals.net, "DEMO"],
      ["partner_payout", periodLabel, cycle, token, totals.partner, "DEMO"],
      ["internal_transfers_excluded", periodLabel, cycle, token, totals.internal, "DEMO"],
    ];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `atlas-money-flows-${asOfDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="af-content">
      <div className="af-flow-toolbar">
        <div className="af-periods" aria-label="Период отчета">
          {overviewPeriods.map((item) => <button className={period === item.id ? "active" : ""} type="button" onClick={() => setPeriod(item.id)} key={item.id}>{item.label}</button>)}
        </div>
        <label className="af-filter-select" title="Фильтр применяется к таблице разбивки циклов"><span>Таблица:</span><select value={cycle} onChange={(event) => setCycle(event.target.value)}><option value="all">Все циклы</option>{apiMode ? allCycleRows.map((row) => <option value={row.productKey} key={row.productKey}>{row.name}</option>) : <><option value="daily_200_100">Daily 200 · $100</option><option value="lockup_30_100">Lockup 30 · $100</option><option value="daily_200_10000">Daily 200 · $10,000</option><option value="launch">Launch</option></>}</select></label>
        <label className="af-filter-select"><span>Токен:</span><select value={token} onChange={(event) => setToken(event.target.value)}><option>USDT</option><option disabled>USDC</option></select></label>
        <label className="af-date-control"><CalendarDays size={15} /><span>Срез на дату</span><input type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} /></label>
        <div className="af-page-actions">
          <button type="button" onClick={() => setMethodologyOpen(true)}><BookOpenCheck size={15} />Методика</button>
          <button className="primary af-export-action" type="button" onClick={exportCsv}><Download size={15} />Экспорт</button>
        </div>
      </div>

      <div className={`af-quality-notice${sourceMeta?.partial ? " is-partial" : ""}`}>
        <span>{sourceMeta?.partial ? <AlertCircle size={14} /> : <Check size={14} />}</span>
        <p>{apiMode ? <><strong>{sourceMeta.partial ? "Неполный API-срез." : "Admin API snapshot."}</strong> Внутренние переводы исключены только из Atlas Consolidated; макетные значения не подмешиваются.</> : <><strong>Демонстрационная сверка с token transfers.</strong> Внутренние переводы между контролируемыми адресами исключены из Atlas Consolidated.</>}</p>
        <b>{apiMode ? `BLOCK ${sourceMeta.asOfBlockNumber} · ${sourceMeta.sourceStatus.toUpperCase()} · ${sourceMeta.reconciliationStatus.toUpperCase()}` : "AS OF BLOCK 54,721,008 · DEMO"}</b>
      </div>

      <section className="af-metrics af-metrics-five" aria-label="Показатели денежных потоков">
        <Metric accent="#503021" label="Внешний входящий поток" tag={apiMode ? "API" : "+12.8%"} tagTone="brown" value={displayMoney(totals.incoming)} note={apiMode ? `${visibleSeries.length} доступных временных bucket` : "573 цикла: 153 Smart Cycle + 420 Launch"} />
        <Metric accent="#ff8716" label="Исходящий поток" tag={apiMode ? "API DATA" : "DEMO"} tagTone="orange" value={displayMoney(totals.outgoing)} note={apiMode ? "Внешние выплаты Atlas Consolidated" : "Principal + Net Delta + Partner"} />
        <Metric accent="#239a77" label="Net Flow" tag={apiMode ? "API" : "69.5%"} tagTone="green" value={displayMoney(totals.net, { signed: true })} note={`Период: ${visiblePeriodLabel.toLowerCase()}`} good />
        {apiMode ? <Metric accent="#4e76d0" label="Partner / Incoming" tag="UNAVAILABLE" tagTone="blue" value="N/A" unit="" note="Нужна сверенная payout component dimension" /> : <Metric accent="#4e76d0" label="Partner / Incoming" tag="RATE" tagTone="blue" value={(totals.partner / totals.incoming * 100).toFixed(2)} unit="%" note={`${formatMoney(totals.partner)} выплачено партнерам`} />}
        <Metric accent="#7a5bb8" label="Внутренние переводы" tag="EXCLUDED" tagTone="violet" value={displayMoney(totals.internal)} note="Исключены только из consolidated flow" />
      </section>

      <div className="af-flows-grid">
        <section className="af-panel">
          <PanelHeader title="Incoming, Outgoing и Net Flow" subtitle={`Фактические внешние потоки · ${visiblePeriodLabel.toLowerCase()}${apiMode ? " · Admin API" : " · DEMO"}`} />
          <div className="af-flow-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={visibleSeries} margin={{ top: 12, right: 14, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f0e4d8" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} tick={{ fill: "#8e7b70", fontSize: 9 }} />
                <YAxis axisLine={false} tickLine={false} width={50} tick={{ fill: "#8e7b70", fontSize: 9 }} tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip content={<FlowTooltip apiMode={apiMode} />} />
                <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 9, color: "#79675e" }} />
                <Bar dataKey="incoming" name="Incoming" fill="#503021" radius={[3, 3, 0, 0]} barSize={22} isAnimationActive={false} />
                <Bar dataKey="outgoing" name="Outgoing" fill="#ff8716" radius={[3, 3, 0, 0]} barSize={22} isAnimationActive={false} />
                <Line dataKey="net" name="Net Flow" stroke="#239a77" strokeWidth={2.5} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="af-panel">
          <PanelHeader title="Денежные периметры" subtitle="Один перевод имеет разный смысл в разных контурах" action={<Tag tone={apiMode ? "blue" : "green"}>{apiMode ? "API" : "3 контура"}</Tag>} />
          <div className="af-perimeters">
            {visiblePerimeters.map((item) => {
              const values = apiMode ? [["In", item.incoming], ["Out", item.outgoing], ["Net", item.net]] : item.values;
              return (
                <article className={item.id === "atlas_consolidated" || item.id === "consolidated" ? "active" : ""} key={item.id}>
                  <div className="af-perimeter-head"><strong>{item.name}</strong><b>{displayMoney(apiMode ? item.net : item.net, { signed: true })}</b></div>
                  <p>{item.description}</p>
                  <div className="af-perimeter-values">
                    {values.map(([label, value]) => <span key={label}>{label}<strong>{displayMoney(value, { signed: label === "Net" })}</strong></span>)}
                  </div>
                </article>
              );
            })}
            <div className="af-exclusion-note">{apiMode ? `${formatWireMoney(totals.internal)} исключено при переходе от Payout Contract к Atlas Consolidated.` : "$2,460 переведено между payout contract и treasury. Движение видно в первом контуре, но исключено из Atlas Consolidated."}</div>
          </div>
        </section>
      </div>

      <div className="af-flows-lower">
        <section className="af-panel af-flow-cycles">
          <PanelHeader title="Входящий поток по циклам" subtitle="Количество открытий, объем и доля общего входящего потока" action={<a className="af-small-link" href="/admin/cycles">Все циклы</a>} />
          <div className="af-table-scroll">
            <table>
              <thead><tr><th>Цикл</th><th className="number">Открыто</th><th className="number">Principal</th><th className="number">Доля</th><th>Распределение</th></tr></thead>
              <tbody>
                {visibleCycles.map((row, index) => (
                  <tr key={row.name}><td><strong>{row.name}</strong></td><td className="number">{row.opened}</td><td className="number">{displayMoney(row.inflow)}</td><td className="number">{row.share}</td><td><div className="af-share-track"><i style={{ width: row.share, background: ["#ff8716", "#f6b92f", "#4e76d0", "#7a5bb8"][index % 4] }} /></div></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="af-panel">
          <PanelHeader title="Waterfall исходящего потока" subtitle="Фактические внешние выплаты · Atlas Consolidated" action={<Tag tone={apiMode ? "orange" : "green"}>{apiMode ? "WAITING DIMENSION" : "DEMO"}</Tag>} />
          {apiMode ? <div className="af-data-unavailable"><AlertCircle size={22}/><strong>Компоненты выплат пока недоступны</strong><p>Общий Outgoing получен из API, но Principal, Delta и Partner нельзя раскладывать до появления сверенной payout component dimension.</p><a href="/admin/methodology#gate">Открыть Gate 0</a></div> : <div className="af-waterfall">
            <div className="af-waterfall-total"><span>Всего выплачено</span><strong>{formatMoney(totals.outgoing)}</strong></div>
            <div className="af-waterfall-track">{outgoingWaterfall.map((item) => <i key={item.name} style={{ width: `${item.value / 5612 * 100}%`, background: item.color }} />)}</div>
            <div className="af-waterfall-list">
              {outgoingWaterfall.map((item) => <div key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><strong>{formatMoney(Math.round(item.value * scale))}</strong></div>)}
            </div>
            <div className="af-method-note">Platform Fee показывается отдельно в аналитике дохода компании, но не прибавляется второй раз к соответствующей Gross Delta или Gross Partner Reward.</div>
          </div>}
        </section>
      </div>

      {methodologyOpen ? <FlowMethodology onClose={() => setMethodologyOpen(false)} apiMeta={sourceMeta} /> : null}
    </div>
  );
}
