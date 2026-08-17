import { AlertCircle, BellRing, BookOpenCheck, CalendarDays, Download, Info, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminFinanceForecast } from "./api/useAdminFinanceApi";
import { adminFinanceApiEnabled } from "./api/adminFinanceConfig";
import {
  criticalForecastDates,
  forecastComposition,
  forecastTimeline,
  formatMoney,
} from "./data/overviewData";
import {
  buildApiObligations,
  demoDailyObligations,
  obligationArithmeticBalances,
} from "./data/dailyObligations";
import {
  buildDemoReserveFundingPlan,
  buildReserveDeliveryJournal,
  buildReserveFundingEpisodes,
} from "./data/reserveFundingPlan";
import {
  forecastHorizons,
  forecastScenarioForSource,
  getForecastPresentation,
} from "./data/forecastSemantics";

const horizonMetrics = {
  "24h": { value: 3860, cycles: 12 }, "7d": { value: 31804, cycles: 83 }, "30d": { value: 86920, cycles: 214 }, "90d": { value: 231480, cycles: null },
};

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

function Tag({ children, tone = "green" }) { return <span className={`af-tag af-tag-${tone}`}>{children}</span>; }
function Metric({ accent, label, tag, tagTone, value, note, noteTone }) { return <article className="af-metric" style={{ "--metric-accent": accent }}><div className="af-metric-head"><span>{label}</span><Tag tone={tagTone}>{tag}</Tag></div><div className="af-metric-value">{value} <small>USDT</small></div><p className={noteTone ? `is-${noteTone}` : ""}>{note}</p></article>; }
function PanelHeader({ title, subtitle, action }) { return <div className="af-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }

function ForecastTooltip({ active, payload, label, apiMode }) {
  if (!active || !payload?.length) return null;
  return <div className="af-chart-tooltip"><strong>{label}</strong>{payload.map((item) => {
    const wireValue = item.payload?.[`${item.dataKey}Money`];
    return <span key={item.dataKey} style={{ color: item.color }}>{item.name}: {apiMode && wireValue ? formatWireMoney(wireValue) : formatMoney(item.value)}</span>;
  })}</div>;
}

function ForecastMethodology({ onClose, snapshot, meta, presentation }) {
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-forecast-method-title"><div className="af-modal-head"><div><span><BookOpenCheck size={17} /> Методика</span><h2 id="af-forecast-method-title">Последовательный кассовый прогноз</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div><dl><div><dt>Начальный остаток</dt><dd>Spendable liquidity выбранного контура на дату среза.</dd></div><div><dt>Следующий bucket</dt><dd>Предыдущий прогнозный остаток плюс подтверждённый inflow минус gross-выплаты текущего bucket.</dd></div><div><dt>{presentation.scenario === "committed" ? "Committed" : "Stress"}</dt><dd>{presentation.methodology}</dd></div><div><dt>Funding Gap</dt><dd>Недостающая сумма до минимального резерва на первой дате нарушения порога.</dd></div></dl><p className="af-modal-warning"><Info size={16} /> {snapshot ? `Snapshot ${snapshot.id} · ${snapshot.modelVersion} · блок ${meta.asOfBlockNumber} · ${meta.sourceStatus}. Base/P50/P90 недоступны до калибровки claim-delay и backtesting.` : "Base/P50/P90 включаются только после накопления истории claim-delay и проверенного backtesting."}</p></section></div>;
}

function ForecastRequestState({ request }) {
  const title = request.status === "loading" ? "Загрузка прогноза выплат" : request.status === "auth-required" ? "Нужна админ-сессия" : "Прогноз выплат недоступен";
  const copy = request.status === "loading" ? "Получаем immutable snapshot и последовательные bucket из Admin API." : request.status === "auth-required" ? "API вернул 401. Макетный прогноз не подставлен." : "Запрос не выполнен. Последний demo-прогноз намеренно скрыт.";
  return <section className="af-api-boundary" aria-live="polite"><AlertCircle size={24}/><span>PAYOUT FORECAST · FAIL-CLOSED</span><h2>{title}</h2><p>{copy}</p>{request.status !== "loading" ? <button type="button" onClick={request.reload}>Повторить запрос</button> : null}<a href="/admin/methodology#gate">Проверить источники и Gate 0</a></section>;
}

function LoadCalendar({ apiMode, schedule, selectedId, onSelect }) {
  const byDate = useMemo(() => new Map(schedule.filter((item) => item.date.startsWith("2026-08")).map((item) => [item.date, item])), [schedule]);
  const peak = useMemo(() => schedule.reduce((current, row) => !current || row.total > current.total ? row : current, null), [schedule]);
  const blanks = Array.from({ length: 5 });
  function level(value) { if (value >= 15) return 4; if (value >= 10) return 3; if (value >= 5) return 2; if (value >= 2.5) return 1; return 0; }
  return <section className="af-panel"><PanelHeader title="Календарь обязательств · август" subtitle="Выберите день для раскрытия состава и резерва" action={<span className="af-calendar-month">Август 2026</span>} /><div className="af-calendar"><div className="af-weekdays">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((day) => <span key={day}>{day}</span>)}</div><div className="af-calendar-grid">{blanks.map((_, index) => <i key={`blank-${index}`} />)}{Array.from({ length: 31 }, (_, index) => {
    const date = `2026-08-${String(index + 1).padStart(2, "0")}`;
    const item = byDate.get(date);
    const value = item ? item.total / 1000 : 0;
    return <button type="button" disabled={!item} aria-pressed={item?.id === selectedId} title={item && !item.isDaily ? `Укрупнённый bucket: ${item.durationDays} дней` : undefined} className={`level-${level(value)}${item?.id === selectedId ? " selected" : ""}${item && !item.isDaily ? " period" : ""}`} onClick={() => item && onSelect(item.id)} key={date}><strong>{index + 1}</strong><span>{item ? `$${value.toFixed(1)}k` : "N/A"}</span>{item && !item.isDaily ? <small>{item.durationDays}д</small> : null}</button>;
  })}</div><div className="af-calendar-scale"><span>{apiMode ? "API bucket; укрупнённые периоды помечены" : "DEMO · ежедневные bucket-ы"}</span><div><small>Низкая</small>{[0,1,2,3,4].map((n) => <i className={`level-${n}`} key={n} />)}<small>Высокая</small></div></div>{peak ? <div className="af-calendar-alert"><strong>{shortDate(peak.date)}: {formatMoney(peak.total)}</strong><span>Principal {formatMoney(peak.components.principal)} · Delta {formatMoney(peak.components.delta)} · Creation {formatMoney(peak.components.partnerCreation)} · Streamed {formatMoney(peak.components.partnerStreamed)}</span></div> : null}</div></section>;
}

function DailyObligationsPanel({ item, apiMode }) {
  if (!item) return null;
  const components = [
    ["Principal", item.components.principal, "#503021"],
    ["Gross Delta", item.components.delta, "#ff8716"],
    ["Partner creation", item.components.partnerCreation, "#bda99d"],
    ["Partner streamed", item.components.partnerStreamed, "#4e76d0"],
  ];
  const title = item.isDaily ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${item.date}T00:00:00Z`)) : `${shortDate(item.date)} – ${shortDate(item.periodEnd)}`;
  return <section className="af-panel af-daily-obligations"><PanelHeader title={`Обязательства · ${title}`} subtitle={item.isDaily ? "Точный 24-часовой bucket" : `Укрупнённый bucket ${item.durationDays} дней; дневная аллокация не выдумывается`} action={<div className="af-daily-tags"><Tag tone={apiMode ? "orange" : "blue"}>{apiMode ? "API" : "DEMO"}</Tag><Tag tone={item.isDaily ? "green" : "orange"}>{item.isDaily ? "24H" : `${item.durationDays} DAYS`}</Tag></div>} /><div className="af-daily-summary"><article><span>Gross need</span><strong>{formatMoney(item.total)}</strong><small>{item.cycles} циклов</small></article><article><span>Остаток до</span><strong>{formatMoney(item.openingLiquidity)}</strong><small>+приток {formatMoney(item.confirmedInflow)}</small></article><article><span>Остаток после</span><strong>{formatMoney(item.closingLiquidity)}</strong><small>reserve {formatMoney(item.reserveTarget)}</small></article><article className={item.fundingGap > 0 ? "is-risk" : "is-good"}><span>Funding gap</span><strong>{formatMoney(item.fundingGap)}</strong><small>{item.fundingGap > 0 ? "Пополнить до начала bucket" : "Резерв не нарушен"}</small></article></div><div className="af-daily-components">{components.map(([label, value, color]) => <div key={label}><span>{label}</span><div><i style={{ width: `${item.total ? value / item.total * 100 : 0}%`, background: color }} /></div><strong>{formatMoney(value)}</strong><b>{item.total ? (value / item.total * 100).toFixed(1) : "0.0"}%</b></div>)}</div>{item.rows ? <div className="af-table-scroll"><table className="af-daily-table"><thead><tr><th>Цикл</th><th className="number">Кол-во</th><th className="number">Principal</th><th className="number">Delta</th><th className="number">Creation</th><th className="number">Streamed</th><th className="number">Gross need</th></tr></thead><tbody>{item.rows.map((row) => <tr key={row.id}><td data-label="Цикл"><strong>{row.label}</strong><small>{row.flow === "daily" ? "20% / 80% · 200 дней" : "100% partner at creation"}</small></td><td data-label="Кол-во" className="number">{row.cycles}</td><td data-label="Principal" className="number">{formatMoney(row.principal)}</td><td data-label="Delta" className="number">{formatMoney(row.delta)}</td><td data-label="Creation" className="number">{formatMoney(row.partnerCreation)}</td><td data-label="Streamed" className="number">{formatMoney(row.partnerStreamed)}</td><td data-label="Gross need" className="number"><strong>{formatMoney(row.total)}</strong></td></tr>)}</tbody></table></div> : <div className="af-daily-unavailable"><Info size={17} /><p><strong>Разбивка по названиям циклов пока N/A.</strong> Forecast API отдаёт итог bucket-а, но не cycle-level dimension. До расширения контракта интерфейс не распределяет сумму самостоятельно.</p></div>}<div className={`af-daily-balance${obligationArithmeticBalances(item) ? " is-ok" : " is-error"}`}><span>Проверка</span><strong>{obligationArithmeticBalances(item) ? "Gross и cash ladder сходятся" : "Нарушена арифметика bucket"}</strong></div></section>;
}

const alertStatusLabel = {
  planned: "Запланировано",
  due: "Сегодня",
  missed: "Просрочено",
  breach: "Breach",
};

function ReserveFundingPlan({ episodes, apiMode }) {
  const episode = episodes[0];
  if (!episode) {
    return <section className="af-panel af-reserve-plan is-clear"><PanelHeader title="План пополнения резерва" subtitle="Контрольные точки D−7 / D−3 / D−1 до прогнозного breach" action={<Tag tone="green">РЕЗЕРВ СОБЛЮДЁН</Tag>} /><div className="af-reserve-clear"><BellRing size={22} /><div><strong>Пополнение в выбранном горизонте не требуется</strong><p>Расчёт выполнен по последовательному cash ladder. Новые обязательства пересчитают план автоматически.</p></div></div></section>;
  }
  const dateLabel = (value) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)).replace(".", "");
  const statusTone = episode.status === "planned" ? "blue" : episode.status === "due" ? "orange" : "red";
  return <section className="af-panel af-reserve-plan"><PanelHeader title="План пополнения резерва" subtitle="Минимальная сумма и контрольные точки до первого прогнозного нарушения" action={<div className="af-daily-tags"><Tag tone={apiMode ? "orange" : "blue"}>{apiMode ? "API" : "DEMO"}</Tag><Tag tone={statusTone}>{episode.status === "planned" ? "PLANNED" : episode.status.toUpperCase()}</Tag></div>} /><div className="af-reserve-summary"><article><span>Первый breach</span><strong>{dateLabel(episode.firstBreachDate)}</strong><small>{episode.daysRemaining > 0 ? `через ${episode.daysRemaining} дн.` : "порог уже нарушен"}</small></article><article className="is-risk"><span>Минимально пополнить</span><strong>{formatMoney(episode.minimumTopUp)}</strong><small>до начала первого breach bucket</small></article><article><span>Пиковый gap</span><strong>{formatMoney(episode.peakGap)}</strong><small>{dateLabel(episode.peakDate)} · {episode.bucketCount} bucket</small></article><article><span>Policy buffer</span><strong>N/A</strong><small>не утверждён, в сумму не добавлен</small></article></div><div className="af-reserve-timeline">{episode.checkpoints.map((checkpoint) => <article className={`is-${checkpoint.status}`} key={checkpoint.id}><div><span>{checkpoint.label}</span><Tag tone={checkpoint.status === "planned" ? "blue" : checkpoint.status === "due" ? "orange" : "red"}>{alertStatusLabel[checkpoint.status]}</Tag></div><strong>{dateLabel(checkpoint.date)}</strong><p>{checkpoint.days === 7 ? "Подтвердить источник и лимит пополнения" : checkpoint.days === 3 ? "Проверить доступность средств и маршрут" : "Финальное подтверждение исполнения"}</p></article>)}<article className="is-breach"><div><span>BREACH</span><Tag tone="red">КРАЙНИЙ СРОК</Tag></div><strong>{dateLabel(episode.firstBreachDate)}</strong><p>Средства должны быть доступны до начала bucket</p></article></div><div className="af-reserve-channels"><span><BellRing size={15} /> Каналы контроля</span><b>В интерфейсе: READ-ONLY</b><b>Telegram: НЕ ПОДКЛЮЧЁН</b><b>Email: НЕ ПОДКЛЮЧЁН</b></div></section>;
}

const deliveryState = {
  scheduled: ["Запланировано", "blue"],
  due: ["Готово", "orange"],
  missed: ["Просрочено", "red"],
  breach: ["Breach", "red"],
  not_connected: ["Не подключён", "brown"],
};

function ReserveDeliveryJournal({ episode, apiMode }) {
  if (!episode) return null;
  const rows = buildReserveDeliveryJournal(episode);
  const ChannelState = ({ value }) => {
    const [label, tone] = deliveryState[value] || [value, "brown"];
    return <Tag tone={tone}>{label}</Tag>;
  };
  return <section className="af-panel af-reserve-journal"><PanelHeader title="Журнал резервных уведомлений" subtitle="Read-only · одна запись на snapshot + checkpoint + канал" action={<Tag tone={apiMode ? "orange" : "blue"}>{apiMode ? "API CONTRACT" : "DEMO JOURNAL"}</Tag>} /><div className="af-reserve-journal-head"><span>Checkpoint</span><span>Дата</span><span>In-app</span><span>Telegram</span><span>Email</span><span>Попытки</span></div><div className="af-reserve-journal-rows">{rows.map((row) => <article key={row.id}><div><span>Checkpoint</span><strong>{row.checkpoint}</strong></div><div><span>Дата</span><strong>{shortDate(row.scheduledFor)}</strong></div><div><span>In-app</span><ChannelState value={row.inApp} /></div><div><span>Telegram</span><ChannelState value={row.telegram} /></div><div><span>Email</span><ChannelState value={row.email} /></div><div><span>Попытки</span><strong>{row.attemptCount}</strong></div><code title={row.idempotencyRef}>{row.idempotencyRef}</code></article>)}</div><div className="af-reserve-journal-note"><Info size={15} /><p><strong>Доставка не запускалась.</strong> Локальный журнал показывает будущий server contract. В LIVE idempotency key будет SHA-256, а каждая provider-попытка попадёт в append-only audit trail.</p></div></section>;
}

export default function AdminFinanceForecast() {
  const [horizon, setHorizon] = useState("90d");
  const scenario = forecastScenarioForSource(adminFinanceApiEnabled);
  const presentation = getForecastPresentation(scenario);
  const [asOfDate, setAsOfDate] = useState("2026-08-04");
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [selectedObligationId, setSelectedObligationId] = useState("2026-08-18");
  const forecastRequest = useAdminFinanceForecast({ scenario, horizon });
  const scenarioFactor = 1;
  const demoTimeline = forecastTimeline;

  const apiView = useMemo(() => {
    if (forecastRequest.status !== "ready") return null;
    const snapshot = forecastRequest.data.snapshot.data;
    const meta = forecastRequest.data.snapshot.meta;
    const buckets = forecastRequest.data.buckets.data;
    const timeline = buckets.map((row) => ({
      date: shortDate(row.bucketStart),
      principal: moneyChartValue(row.principalDue),
      delta: moneyChartValue(row.grossDeltaDue),
      partner: moneyChartValue(row.partnerRewardDue),
      pending: moneyChartValue(row.pendingPartnerCreationDue),
      balance: moneyChartValue(row.closingLiquidity),
      principalMoney: row.principalDue,
      deltaMoney: row.grossDeltaDue,
      partnerMoney: row.partnerRewardDue,
      pendingMoney: row.pendingPartnerCreationDue,
      balanceMoney: row.closingLiquidity,
    }));
    const componentRows = [
      { name: "Principal", key: "principalDue", color: "#503021" },
      { name: "Gross Delta", key: "grossDeltaDue", color: "#ff8716" },
      { name: "Gross Partner Reward", key: "partnerRewardDue", color: "#4e76d0" },
      { name: "Pending Partner Reward at Creation", key: "pendingPartnerCreationDue", color: "#bda99d" },
    ].map((item) => ({ ...item, amount: sumMoney(buckets, item.key) }));
    const componentTotal = componentRows.reduce((sum, item) => sum + BigInt(item.amount.amountRaw), 0n);
    componentRows.forEach((item) => { item.share = componentTotal ? Number(BigInt(item.amount.amountRaw) * 10000n / componentTotal) / 100 : 0; });
    const critical = [...buckets].sort((left, right) => Number(BigInt(right.totalOutflowDue.amountRaw) - BigInt(left.totalOutflowDue.amountRaw))).slice(0, 4).sort((left, right) => Date.parse(left.bucketStart) - Date.parse(right.bucketStart));
    return { snapshot, meta, buckets, timeline, componentRows, critical };
  }, [forecastRequest.data, forecastRequest.status]);

  const obligationSchedule = useMemo(
    () => apiView ? buildApiObligations(apiView.buckets, moneyChartValue) : demoDailyObligations,
    [apiView],
  );
  const selectedObligation = obligationSchedule.find((item) => item.id === selectedObligationId)
    || obligationSchedule.reduce((current, item) => !current || item.total > current.total ? item : current, null);

  if (forecastRequest.apiEnabled && forecastRequest.status !== "ready") return <ForecastRequestState request={forecastRequest} />;

  const apiMode = Boolean(apiView);
  const snapshot = apiView?.snapshot;
  const sourceMeta = apiView?.meta;
  const timeline = apiMode ? apiView.timeline : demoTimeline;
  const displayMoney = (value) => apiMode ? formatWireMoney(value) : formatMoney(value);
  const reserveValue = apiMode ? moneyChartValue(snapshot.reserveTarget) : 25000;
  const peakGap = apiMode ? snapshot.peakFundingGap : null;
  const hasGap = apiMode ? BigInt(peakGap.amountRaw) > 0n : true;
  const currentAsOfDate = apiMode ? snapshot.asOf.slice(0, 10) : asOfDate;
  const reserveFundingEpisodes = apiMode
    ? buildReserveFundingEpisodes(obligationSchedule, { asOf: currentAsOfDate, sourceStatus: "api" })
    : buildDemoReserveFundingPlan(currentAsOfDate);

  const visibleHorizonMetrics = apiMode ? Object.fromEntries(snapshot.horizons.map((item) => [item.id, { value: item.totalOutflow, cycles: item.cycleCount }])) : horizonMetrics;

  function exportCsv() {
    if (apiMode) return;
    const rows = [["date", "principal", "gross_delta", "partner_streamed", "projected_balance", "scenario"], ...timeline.map((row) => [row.date, row.principal, row.delta, row.partner, row.balance, scenario])];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `atlas-payout-forecast-${currentAsOfDate}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="af-content">
    <div className="af-forecast-toolbar"><div className="af-periods">{forecastHorizons.map(([id, label]) => <button type="button" className={horizon === id ? "active" : ""} onClick={() => setHorizon(id)} key={id}>{label}</button>)}</div><label className="af-filter-select"><span>Сценарий:</span><select value={scenario} disabled><option value={scenario}>{presentation.selectorLabel}</option></select></label><label className="af-date-control"><CalendarDays size={15} /><span>Срез на дату</span><input type="date" value={currentAsOfDate} disabled={apiMode} onChange={(event) => setAsOfDate(event.target.value)} /></label><div className="af-page-actions"><button type="button" onClick={() => setMethodologyOpen(true)}><BookOpenCheck size={15} />Методика</button><button className="primary" type="button" onClick={exportCsv} disabled={apiMode} title={apiMode ? "Audited export API ещё не подключён" : undefined}><Download size={15} />Экспорт прогноза</button></div></div>

    <div className={`af-forecast-warning${!hasGap ? " is-ok" : ""}`}><Info size={20} /><p>{apiMode ? <><strong>Immutable {snapshot.scenario} snapshot · {snapshot.status}.</strong> Неподтверждённый inflow равен нулю; остаток каждого bucket продолжает предыдущий.</> : <><strong>Base и Committed пока недоступны: не утверждены правила включения и недостаточно истории claim-delay.</strong> Показан Stress: последовательное списание по bucket.</>}</p><b>{apiMode ? `Peak gap ${formatWireMoney(peakGap)}${snapshot.firstBreachAt ? ` · ${shortDate(snapshot.firstBreachAt)}` : " · breach нет"}` : "Peak gap $4,641 · 14 сен"}</b></div>

    <section className="af-metrics af-metrics-five">{forecastHorizons.map(([id, label], index) => { const item = visibleHorizonMetrics[id]; return <Metric key={id} accent={["#503021","#ff8716","#f6b92f","#4e76d0"][index]} label={`${presentation.metricLabel} · ${label}`} tag={item.cycles ? `${item.cycles} циклов` : scenario.toUpperCase()} tagTone={index === 3 ? "blue" : index === 0 ? "brown" : "orange"} value={apiMode ? formatWireMoney(item.value) : formatMoney(Math.round(item.value * scenarioFactor))} note={apiMode ? "Committed · immutable snapshot" : id === "24h" ? "Principal + Gross Delta + Gross Partner" : id === "7d" ? "Stress · eligibility exposure" : id === "30d" ? "Пик eligibility: $17,830 · 18 августа" : "Без гипотетических новых циклов"} />; })}<Metric accent="#cf534c" label="Peak Funding Gap" tag={apiMode ? snapshot?.firstBreachAt ? shortDate(snapshot.firstBreachAt).toUpperCase() : "NO BREACH" : "14 СЕН"} tagTone={hasGap ? "red" : "green"} value={apiMode ? formatWireMoney(peakGap) : "$4,641"} note={hasGap ? "Требуется пополнение до первой даты breach" : "Минимальный резерв не нарушен"} noteTone={hasGap ? "risk" : "good"} /></section>

    <div className="af-forecast-grid"><section className="af-panel"><PanelHeader title="Остаток ликвидности и будущие выплаты" subtitle="Последовательно: предыдущий остаток + подтверждённый приток − gross-выплаты" action={apiMode ? <Tag tone="orange">{sourceMeta.sourceStatus.toUpperCase()}</Tag> : null} /><div className="af-forecast-chart-wrap"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={timeline} margin={{ top: 12, right: 10, left: 4, bottom: 0 }}><CartesianGrid vertical={false} stroke="#f0e4d8" /><XAxis dataKey="date" axisLine={false} tickLine={false} interval={timeline.length > 8 ? 1 : 0} tick={{ fill: "#8e7b70", fontSize: 8 }} /><YAxis axisLine={false} tickLine={false} width={52} tick={{ fill: "#8e7b70", fontSize: 9 }} tickFormatter={(value) => `$${value / 1000}k`} /><Tooltip content={<ForecastTooltip apiMode={apiMode} />} /><Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 8 }} /><ReferenceLine y={reserveValue} stroke="#cf534c" strokeDasharray="5 4" label={{ value: "Мин. резерв", fill: "#cf534c", fontSize: 8, position: "insideTopRight" }} /><Bar dataKey="principal" stackId="gross" name="Principal" fill="#503021" barSize={25} isAnimationActive={false} /><Bar dataKey="delta" stackId="gross" name="Gross Delta" fill="#ff8716" isAnimationActive={false} /><Bar dataKey="partner" stackId="gross" name="Partner streamed" fill="#4e76d0" isAnimationActive={false} /><Bar dataKey="pending" stackId="gross" name="Pending at Creation" fill="#bda99d" radius={[3,3,0,0]} isAnimationActive={false} /><Line dataKey="balance" name="Прогнозный остаток" stroke="#239a77" strokeWidth={2.5} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div></section><LoadCalendar apiMode={apiMode} schedule={obligationSchedule} selectedId={selectedObligation?.id} onSelect={setSelectedObligationId} /></div>

    <DailyObligationsPanel item={selectedObligation} apiMode={apiMode} />

    <ReserveFundingPlan episodes={reserveFundingEpisodes} apiMode={apiMode} />
    <ReserveDeliveryJournal episode={reserveFundingEpisodes[0]} apiMode={apiMode} />

    <div className="af-forecast-lower"><section className="af-panel"><PanelHeader title={`Состав обязательств · ${forecastHorizons.find(([id]) => id === horizon)?.[1]}`} subtitle="Platform Fee находится внутри Gross и не складывается второй раз" action={<Tag tone={hasGap ? "red" : "green"}>{apiMode ? formatWireMoney(sumMoney(apiView.buckets, "totalOutflowDue")) : `${formatMoney(Math.round(horizonMetrics[horizon].value * scenarioFactor))} total`}</Tag>} /><div className="af-composition">{(apiMode ? apiView.componentRows : forecastComposition).map((item) => <div key={item.name}><span>{item.name}</span><div><i style={{ width: `${item.share}%`, background: item.color }} /></div><strong>{apiMode ? formatWireMoney(item.amount) : formatMoney(item.value)}</strong><b>{item.share.toFixed(1)}%</b></div>)}<div className="af-method-note">{apiMode ? "Точный Platform Fee внутри Gross появится отдельной строкой только после канонической payout allocation dimension. В total он уже не прибавляется повторно." : "Внутри Gross Delta и Gross Partner Reward прогнозируется Platform Fee $6,842. Это распределение gross-суммы, а не дополнительная потребность в ликвидности."}</div></div></section><section className="af-panel af-critical-table"><PanelHeader title="Критические даты" subtitle="Bucket с высокой нагрузкой и требуемым действием" action={<a className="af-small-link" href="/admin/risks">Все даты</a>} /><div className="af-table-scroll"><table><thead><tr><th>Дата</th><th className="number">Gross-выплаты</th><th className="number">Остаток после</th><th>Действие</th></tr></thead><tbody>{(apiMode ? apiView.critical : criticalForecastDates).map((row) => { const apiGap = apiMode && BigInt(row.fundingGap.amountRaw) > 0n; return <tr key={apiMode ? row.id : row.date}><td>{apiMode ? shortDate(row.bucketStart) : row.date}</td><td className="number">{apiMode ? formatWireMoney(row.totalOutflowDue) : formatMoney(row.gross)}</td><td className="number">{apiMode ? formatWireMoney(row.closingLiquidity) : formatMoney(row.balance)}</td><td><Tag tone={apiMode ? apiGap ? "red" : "orange" : row.tone}>{apiMode ? apiGap ? "Пополнить" : "Контроль" : row.action}</Tag></td></tr>; })}</tbody></table></div></section></div>
    {methodologyOpen ? <ForecastMethodology onClose={() => setMethodologyOpen(false)} snapshot={snapshot} meta={sourceMeta} presentation={presentation} /> : null}
  </div>;
}
