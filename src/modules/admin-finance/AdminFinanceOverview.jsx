import {
  AlertCircle,
  BookOpenCheck,
  CalendarDays,
  Download,
  ExternalLink,
  Info,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
  cashFlowData,
  cycleRows,
  forecastData,
  formatMoney,
  overviewPeriods,
  revenueData,
} from "./data/overviewData";
import { useAdminFinanceOverview } from "./api/useAdminFinanceApi";

const periodScale = { "7d": 1, "1m": 4.1, "3m": 12.7, "6m": 25.2, "1y": 51.8, all: 73.4 };
const periodDays = { "7d": 7, "1m": 30, "3m": 90, "6m": 180, "1y": 365, all: 366 };

function reportRange(period, asOfDate) {
  const to = new Date(`${asOfDate}T00:00:00.000Z`);
  to.setUTCDate(to.getUTCDate() + 1);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - periodDays[period]);
  return { from: from.toISOString(), to: to.toISOString(), perimeter: "atlas_consolidated" };
}

function atomicDecimal(money) {
  if (money?.displayAmount) return money.displayAmount;
  const raw = BigInt(money?.amountRaw || "0");
  const negative = raw < 0n;
  const digits = (negative ? -raw : raw).toString().padStart(Number(money?.decimals || 0) + 1, "0");
  const decimals = Number(money?.decimals || 0);
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
  const sign = negative ? "-" : signed && BigInt(money.amountRaw) > 0n ? "+" : "";
  return `${sign}$${grouped}${fraction ? `.${fraction}` : ""}`;
}

function moneyChartValue(money) {
  const value = Number(atomicDecimal(money));
  return Number.isFinite(value) ? value : 0;
}

function shortDate(value) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(value)).replace(".", "");
}

function DemoTag({ children, tone = "green" }) {
  return <span className={`af-tag af-tag-${tone}`}>{children}</span>;
}

function MetricCard({ accent, label, tag, tagTone, value, unit = "USDT", note, noteTone }) {
  return (
    <article className="af-metric" style={{ "--metric-accent": accent }}>
      <div className="af-metric-head">
        <span>{label}</span>
        <DemoTag tone={tagTone}>{tag}</DemoTag>
      </div>
      <div className="af-metric-value">{value} <small>{unit}</small></div>
      <p className={noteTone ? `is-${noteTone}` : ""}>{note}</p>
    </article>
  );
}

function PanelHeader({ title, subtitle, action, children }) {
  return (
    <div className="af-panel-head">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action || children}
    </div>
  );
}

function ChartTooltip({ active, payload, label, valueFormatter = formatMoney }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="af-chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => <span key={item.dataKey} style={{ color: item.color }}>{item.name}: {valueFormatter(item.payload?.[`${item.dataKey}Money`] || item.value)}</span>)}
    </div>
  );
}

function ForecastPanel({ items = forecastData, coverageRatio = "5.18", peakGap = "$0", valueFormatter = formatMoney, apiMode = false }) {
  const max = Math.max(1, ...items.map((item) => item.total));
  return (
    <section className="af-panel" id="forecast-exposure">
      <PanelHeader
        title="Maximum eligible exposure · 7 дней"
        subtitle="Stress: ранний claim всех доступных сумм; Base появится после калибровки claim-delay"
        action={<DemoTag tone="orange">{apiMode ? "COMMITTED" : "STRESS"}</DemoTag>}
      />
      <div className="af-forecast-body">
        <div className="af-forecast-stats">
          <div><span>Покрытие</span><strong>{coverageRatio}×</strong></div>
          <div><span>Пиковый разрыв</span><strong className="is-risk">{peakGap}</strong></div>
        </div>
        <div className="af-forecast-list">
          {items.map((item) => (
            <div className="af-forecast-row" key={item.date}>
              <span>{item.date}</span>
              <div className="af-stack" aria-label={`${item.date}: ${formatMoney(item.total)}`}>
                {[
                  [item.principal, "#503021"],
                  [item.delta, "#ff8716"],
                  [item.partner, "#4e76d0"],
                  [item.pending, "#bda99d"],
                ].map(([value, color], index) => value ? (
                  <i key={index} style={{ width: `${(value / max) * 100}%`, background: color }} />
                ) : null)}
              </div>
              <strong>{valueFormatter(item.totalMoney || item.total)}</strong>
            </div>
          ))}
        </div>
        <div className="af-forecast-legend">
          <span><i style={{ background: "#503021" }} />Principal</span>
          <span><i style={{ background: "#ff8716" }} />Gross Delta</span>
          <span><i style={{ background: "#4e76d0" }} />Partner streamed</span>
          <span><i style={{ background: "#bda99d" }} />Pending at creation</span>
        </div>
        <div className="af-method-note">Platform Fee уже находится внутри Gross Delta и Gross Partner Reward. Повторно к потребности не прибавляется.</div>
      </div>
    </section>
  );
}

function MethodologyDialog({ onClose, apiMeta }) {
  return (
    <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-methodology-title">
        <div className="af-modal-head">
          <div><span><BookOpenCheck size={17} /> Методика</span><h2 id="af-methodology-title">Как считается финансовый обзор</h2></div>
          <button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button>
        </div>
        <dl>
          <div><dt>Inflow / Outflow</dt><dd>Внешние token transfers Atlas Consolidated после исключения внутренних переводов.</dd></div>
          <div><dt>Available Contract Balance</dt><dd>On-chain cash Payout Contract минус restricted amount, но до применения reserve threshold.</dd></div>
          <div><dt>Maximum eligible exposure</dt><dd>Stress-сценарий раннего claim всех сумм, доступных к выплате на соответствующую дату.</dd></div>
        </dl>
        <p className="af-modal-warning"><Info size={16} /> {apiMeta ? `Admin API · блок ${apiMeta.asOfBlockNumber} · ${apiMeta.finality} · source ${apiMeta.sourceStatus}. Production всё равно заблокирован до завершения Gate 0 и reconciliation UAT.` : "Сейчас экран работает на демонстрационном наборе. Production-значения разрешены только после сверки источников, finality и правил расчета."}</p>
      </section>
    </div>
  );
}

function OverviewRequestState({ request }) {
  const title = request.status === "loading" ? "Загрузка финансового обзора" : request.status === "auth-required" ? "Нужна админ-сессия" : "Финансовый обзор недоступен";
  const copy = request.status === "loading" ? "Получаем multi-perimeter snapshot из Admin API." : request.status === "auth-required" ? "API вернул 401. Макетные показатели не подставлены." : "Запрос не выполнен. Последние demo-значения намеренно скрыты.";
  return <section className="af-api-boundary" aria-live="polite"><AlertCircle size={24}/><span>FINANCE OVERVIEW · FAIL-CLOSED</span><h2>{title}</h2><p>{copy}</p>{request.status !== "loading" ? <button type="button" onClick={request.reload}>Повторить запрос</button> : null}<a href="/admin/methodology#gate">Проверить источники и Gate 0</a></section>;
}

export default function AdminFinanceOverview() {
  const [period, setPeriod] = useState("7d");
  const [asOfDate, setAsOfDate] = useState("2026-08-04");
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const forecastRef = useRef(null);
  const scale = periodScale[period];
  const periodLabel = overviewPeriods.find((item) => item.id === period)?.label || "7 дней";
  const query = useMemo(() => reportRange(period, asOfDate), [asOfDate, period]);
  const overviewRequest = useAdminFinanceOverview(query);

  const demoTotals = useMemo(() => ({
    inflow: Math.round(18420 * scale),
    outflow: Math.round(5612 * scale),
    net: Math.round(12808 * scale),
    revenue: Math.round(829 * scale),
    obligations: period === "7d" ? 31804 : Math.round(31804 * Math.min(scale, 13.1)),
  }), [period, scale]);

  const apiView = useMemo(() => {
    if (overviewRequest.status !== "ready") return null;
    const data = overviewRequest.data.data;
    const riskMap = {
      normal: ["Норма", "good"],
      medium: ["Средний", "warn"],
      concentration: ["Концентрация", "warn"],
    };
    return {
      data,
      meta: overviewRequest.data.meta,
      cashFlow: data.cashFlow.series.map((row) => ({
        date: shortDate(row.bucketStart),
        inflow: moneyChartValue(row.inflow),
        outflow: moneyChartValue(row.outflow),
        net: moneyChartValue(row.netFlow),
        inflowMoney: row.inflow,
        outflowMoney: row.outflow,
        netMoney: row.netFlow,
      })),
      forecast: data.obligations.series.map((row) => ({
        date: shortDate(row.bucketStart),
        principal: moneyChartValue(row.principal),
        delta: moneyChartValue(row.grossDelta),
        partner: moneyChartValue(row.partnerReward),
        pending: moneyChartValue(row.pendingAtCreation),
        total: moneyChartValue(row.total),
        totalMoney: row.total,
      })),
      cycles: data.cycles.rows.map((row) => {
        const [risk, tone] = riskMap[row.risk] || [row.risk, "warn"];
        return { name: row.label, opened: row.openedCount, inflow: row.inflow, share: `${(row.shareBps / 100).toFixed(1)}%`, payouts: row.payoutDue, risk, tone };
      }),
      revenue: data.companyRevenue.components.map((row) => ({ name: row.label, value: moneyChartValue(row.amount), amount: row.amount, color: row.color })),
    };
  }, [overviewRequest.data, overviewRequest.status]);

  if (overviewRequest.apiEnabled && overviewRequest.status !== "ready") {
    return <OverviewRequestState request={overviewRequest} />;
  }

  const apiMode = Boolean(apiView);
  const source = apiView?.data;
  const sourceMeta = apiView?.meta;
  const totals = apiMode ? {
    inflow: source.cashFlow.inflow,
    outflow: source.cashFlow.outflow,
    net: source.cashFlow.netFlow,
    revenue: source.companyRevenue.total,
    obligations: source.obligations.eligibleExposure,
  } : demoTotals;
  const displayMoney = (value, options) => apiMode ? formatWireMoney(value, options) : formatMoney(value, options);
  const visibleCashFlow = apiMode ? apiView.cashFlow : cashFlowData;
  const visibleForecast = apiMode ? apiView.forecast : forecastData;
  const visibleCycles = apiMode ? apiView.cycles : cycleRows;
  const visibleRevenue = apiMode ? apiView.revenue : revenueData;
  const visiblePeriodLabel = sourceMeta?.partial ? "доступный срез" : periodLabel;

  function exportCsv() {
    if (apiMode) return;
    const rows = [
      ["metric", "period", "value", "currency", "source_status"],
      ["inflow", periodLabel, totals.inflow, "USDT", "DEMO"],
      ["outflow", periodLabel, totals.outflow, "USDT", "DEMO"],
      ["net_flow", periodLabel, totals.net, "USDT", "DEMO"],
      ["company_revenue", periodLabel, totals.revenue, "USDT", "DEMO"],
      ["eligible_exposure", periodLabel, totals.obligations, "USDT", "DEMO"],
    ];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `atlas-finance-overview-${asOfDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openForecast() {
    document.getElementById("forecast-exposure")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="af-content">
      <div className="af-control-row">
        <div className="af-periods" aria-label="Период отчета">
          {overviewPeriods.map((item) => (
            <button className={period === item.id ? "active" : ""} type="button" onClick={() => setPeriod(item.id)} key={item.id}>{item.label}</button>
          ))}
        </div>
        <label className="af-date-control">
          <CalendarDays size={15} />
          <span>Срез на дату</span>
          <input type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} />
        </label>
        <div className="af-page-actions">
          <button type="button" onClick={() => setMethodologyOpen(true)}><BookOpenCheck size={15} />Методика</button>
          <button className="primary" type="button" onClick={exportCsv} disabled={apiMode} title={apiMode ? "Audited export API ещё не подключён" : undefined}><Download size={15} />Экспорт</button>
        </div>
      </div>

      <div className="af-risk-notice">
        <AlertCircle size={21} />
        <p>{apiMode ? <><strong>{sourceMeta.partial ? "Неполный API-срез." : `Пиковая нагрузка ${formatWireMoney(source.obligations.peakExposure)} · ${shortDate(source.obligations.peakExposureAt)}.`}</strong> {sourceMeta.partial ? `Доступное покрытие: ${shortDate(source.coverage.from)}–${shortDate(new Date(Date.parse(source.coverage.to) - 1).toISOString())}.` : `Покрытие ${source.obligations.coverageRatio}× · reconciliation: ${sourceMeta.reconciliationStatus}.`}</> : <><strong>На 11 августа прогнозируется пиковая нагрузка $12,269.</strong> Текущий резерв покрывает все обязательства ближайших 7 дней с запасом 5.18×.</>}</p>
        <button type="button" onClick={openForecast}>Открыть прогноз <ExternalLink size={13} /></button>
      </div>

      <section className="af-metrics af-metrics-six" aria-label="Ключевые показатели">
        <MetricCard accent="#503021" label={`Входящий поток · ${visiblePeriodLabel}`} tag={apiMode ? "CONSOLIDATED" : "DEMO"} tagTone="brown" value={displayMoney(totals.inflow)} note="Внешний приток после eliminations" />
        <MetricCard accent="#ff8716" label={`Исходящий поток · ${visiblePeriodLabel}`} tag={apiMode ? "CONSOLIDATED" : "DEMO"} tagTone="orange" value={displayMoney(totals.outflow)} note="Внешний отток после eliminations" />
        <MetricCard accent="#239a77" label={`Net Flow · ${visiblePeriodLabel}`} tag={apiMode ? "CONSOLIDATED" : "+69.5%"} tagTone="green" value={displayMoney(totals.net, { signed: true })} note="Входящий минус исходящий" />
        <MetricCard accent="#4e76d0" label="Available Contract Balance" tag={apiMode ? "PAYOUT" : "DEMO"} tagTone="blue" value={apiMode ? formatWireMoney(source.liquidity.availableBalance) : "$164,739"} note={apiMode ? `Сверх reserve: ${formatWireMoney(source.liquidity.reserveSurplus)}` : "Сверх reserve: $139,739"} noteTone="good" />
        <MetricCard accent="#cf534c" label={`Обязательства · ${apiMode ? "7 дней" : periodLabel}`} tag={apiMode ? source.obligations.scenario.toUpperCase() : "DEMO FORECAST"} tagTone="red" value={displayMoney(totals.obligations)} note={apiMode ? `Пик: ${formatWireMoney(source.obligations.peakExposure)} · ${shortDate(source.obligations.peakExposureAt)}` : "Пик: $12,269 · 11 августа"} noteTone="risk" />
        <MetricCard accent="#4e76d0" label="Доход компании" tag={apiMode ? `${source.companyRevenue.cashTakeRatePercent}% · TREASURY` : "4.50%"} tagTone="blue" value={displayMoney(totals.revenue)} note={apiMode ? `Platform Fee ${formatWireMoney(source.companyRevenue.platformFee)} · Head Account ${formatWireMoney(source.companyRevenue.headAccount)}` : `Platform Fee ${formatMoney(Math.round(totals.revenue * 0.754))} · Head Account ${formatMoney(Math.round(totals.revenue * 0.246))}`} />
      </section>

      <div className="af-primary-grid">
        <section className="af-panel af-flow-panel">
          <PanelHeader title="Денежные потоки Atlas Consolidated" subtitle="Внешний inflow/outflow после исключения внутренних переводов · Platform Fee внутри gross учитывается один раз" action={apiMode ? <DemoTag tone={sourceMeta.partial ? "orange" : "green"}>{sourceMeta.sourceStatus.toUpperCase()}</DemoTag> : null} />
          <div className="af-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={visibleCashFlow} margin={{ top: 12, right: 14, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f0e4d8" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#8e7b70", fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} width={52} tick={{ fill: "#8e7b70", fontSize: 10 }} tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip content={(props) => <ChartTooltip {...props} valueFormatter={displayMoney} />} />
                <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 10, color: "#79675e" }} />
                <Bar dataKey="inflow" name="Входящий" fill="#503021" radius={[3, 3, 0, 0]} barSize={27} isAnimationActive={false} />
                <Bar dataKey="outflow" name="Исходящий" fill="#ff8716" radius={[3, 3, 0, 0]} barSize={27} isAnimationActive={false} />
                <Line dataKey="net" name="Consolidated Net Flow" stroke="#239a77" strokeWidth={2.5} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
        <div ref={forecastRef}><ForecastPanel items={visibleForecast} coverageRatio={apiMode ? source.obligations.coverageRatio : "5.18"} peakGap={apiMode ? formatWireMoney(source.obligations.peakFundingGap) : "$0"} valueFormatter={displayMoney} apiMode={apiMode} /></div>
      </div>

      <div className="af-secondary-grid">
        <section className="af-panel af-cycles-panel">
          <PanelHeader title="Циклы: поток и ближайшие обязательства" subtitle="Сравнение спроса и нагрузки по продуктам" action={<a className="af-small-link" href="/admin/cycles">Все циклы</a>} />
          <div className="af-table-scroll">
            <table>
              <thead><tr><th>Цикл</th><th className="number">Открыто</th><th className="number">Входящий</th><th className="number">Доля</th><th className="number">Выплаты 7д</th><th>Риск</th></tr></thead>
              <tbody>
                {visibleCycles.map((row) => (
                  <tr key={row.name}>
                    <td><strong>{row.name}</strong></td><td className="number">{row.opened}</td><td className="number">{displayMoney(row.inflow)}</td><td className="number">{row.share}</td><td className="number">{displayMoney(row.payouts)}</td><td><DemoTag tone={row.tone}>{row.risk}</DemoTag></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="af-panel af-revenue-panel">
          <PanelHeader title={`Доход компании · ${visiblePeriodLabel}`} subtitle="Фактически получено, до OPEX и налогов · Company Treasury" action={<DemoTag tone="green">{apiMode ? source.companyRevenue.cashTakeRatePercent : "4.50"}% / inflow</DemoTag>} />
          <div className="af-revenue-body">
            <div className="af-donut-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={visibleRevenue} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={0} stroke="none" isAnimationActive={false}>{visibleRevenue.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie></PieChart>
              </ResponsiveContainer>
              <strong>{displayMoney(totals.revenue)}</strong>
            </div>
            <div className="af-revenue-list">
              {visibleRevenue.map((item) => (
                <div key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><strong>{apiMode ? formatWireMoney(item.amount) : formatMoney(Math.round(item.value * scale))}</strong></div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {methodologyOpen ? <MethodologyDialog onClose={() => setMethodologyOpen(false)} apiMeta={sourceMeta} /> : null}
    </div>
  );
}
