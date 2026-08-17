import { AlertCircle, BookOpenCheck, Calculator, Download, Info, RotateCcw, Target, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  companyRevenueCohorts,
  companyRevenueComposition,
  companyRevenueEvents,
  companyGrowthPlan,
  companyGrowthPlanAssumptions,
  companyRevenueSeries,
  formatMoney,
  overviewPeriods,
  partnerCaptureSeries,
} from "./data/overviewData";
import {
  createGrowthPlanDraft,
  DEFAULT_GROWTH_PLAN_DRAFT,
  GROWTH_PLAN_DRAFT_KEY,
  parseGrowthPlanDraft,
} from "./data/growthPlanDraft";
import { PARTNER_CAPTURE_DEMO, calculatePartnerCaptureControl } from "./data/partnerCaptureControl";
import { calculateCompanyRevenueControl } from "./data/companyRevenueControl";
import { OFFICIAL_PARTNER_RULESET } from "./data/officialPartnerRuleset";
import { useAdminFinanceCompanyEconomics, useAdminFinanceCompanyRevenueEvents, useAdminFinanceGrowthPlan, useAdminFinancePartnerEconomics } from "./api/useAdminFinanceApi";

const periodFactors = { "7d": 1, "1m": 4, "3m": 13, "6m": 26, "1y": 52, all: 80 };
const periodLabels = {
  "7d": ["29 июл", "30 июл", "31 июл", "1 авг", "2 авг", "3 авг", "4 авг"],
  "1m": ["1–4 июл", "5–9 июл", "10–14 июл", "15–19 июл", "20–24 июл", "25–29 июл", "30 июл–4 авг"],
  "3m": ["Май I", "Май II", "Июн I", "Июн II", "Июл I", "Июл II", "Авг"],
  "6m": ["Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг"],
  "1y": ["Авг 25", "Окт", "Дек", "Фев 26", "Апр", "Июн", "Авг"],
  all: ["2020", "2021", "2022", "2023", "2024", "2025", "2026"],
};

function Tag({ tone = "green", children }) {
  return <span className={`af-tag af-tag-${tone}`}>{children}</span>;
}

function Metric({ accent, label, tag, tone, value, unit, note, noteTone }) {
  return <article className="af-metric" style={{ "--metric-accent": accent }}>
    <div className="af-metric-head"><span>{label}</span><Tag tone={tone}>{tag}</Tag></div>
    <div className="af-metric-value">{value} {unit ? <small>{unit}</small> : null}</div>
    <p className={noteTone ? `is-${noteTone}` : ""}>{note}</p>
  </article>;
}

function PanelHeader({ title, subtitle, action }) {
  return <div className="af-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>;
}

function OfficialRulesetPanel() {
  const rules = OFFICIAL_PARTNER_RULESET;
  return <section className="af-panel af-official-ruleset">
    <PanelHeader title="Действующий публичный ruleset Partner Program" subtitle="Операционная интерпретация для Revenue и Head Account; денежные факты подтверждаются transfer-level данными" action={<a href={rules.sourceUrl} target="_blank" rel="noreferrer">{rules.label}</a>} />
    <div className="af-official-ruleset-grid">
      <article><span>Lockup Flow</span><strong>100% при создании</strong><small>Partner Reward начисляется один раз</small></article>
      <article><span>Daily Flow</span><strong>20% / 80%</strong><small>создание / равными долями за 200 дней</small></article>
      <article><span>Ставка партнёра</span><strong>Snapshot at creation</strong><small>фиксируется по статусу на момент создания цикла</small></article>
      <article><span>Qualification volume</span><strong>Daily × 0.5</strong><small>Lockup × 1.0</small></article>
      <article><span>Глубина структуры</span><strong>100% / 50% / 10%</strong><small>линии 1–5 / 6–10 / 11+</small></article>
    </div>
  </section>;
}

function RevenueControlPanel({ control, sourceLabel = "DEMO", sourceTone = "orange", sourceMeta = "Static illustrative dataset" }) {
  const meta = {
    above_target: { label: "ВЫШЕ ЦЕЛИ", tone: "green" },
    on_target: { label: "НА ЦЕЛИ", tone: "green" },
    behind: { label: "НИЖЕ ЦЕЛИ", tone: "red" },
    unavailable: { label: "N/A", tone: "blue" },
  }[control.status];
  const progress = control.targetPercent ? Math.min(100, control.ratePercent / control.targetPercent * 100) : 0;
  return <section className="af-panel af-company-revenue-control">
    <PanelHeader title="Экономика Atlas · цель и факт" subtitle="Как фактические Platform Fee и доход головного аккаунта складываются в Company Revenue" action={<div className="af-chart-legend"><Tag tone={meta.tone}>{meta.label}</Tag><Tag tone={sourceTone}>{sourceLabel}</Tag></div>} />
    <div className="af-company-revenue-control-grid">
      <div className="af-company-revenue-rate">
        <span>Company Revenue Rate</span>
        <strong>{control.denominatorAvailable ? `${control.ratePercent.toFixed(2)}%` : "N/A"}</strong>
        <small className={control.gapPercentagePoints >= 0 ? "is-good" : "is-bad"}>{control.denominatorAvailable ? `${control.gapPercentagePoints >= 0 ? "+" : ""}${control.gapPercentagePoints.toFixed(2)} п.п. к цели ${control.targetPercent}%` : "Нет входящего потока для расчёта"}</small>
        <div><i style={{ width: `${progress}%` }} /><b /></div>
        <p>{control.status === "behind" ? `До целевого дохода не хватает ${formatPlanMoney(control.shortfall)}` : `Буфер над целевым доходом ${formatPlanMoney(control.surplus)}`}</p>
      </div>
      <div className="af-company-revenue-bridge">
        <article><span>Входящий Principal</span><strong>{formatPlanMoney(control.inflow)}</strong><small>знаменатель периода</small></article>
        <article><span>Platform Fee</span><strong>{formatPlanMoney(control.fee)}</strong><small>{control.feeSharePercent.toFixed(1)}% Company Revenue</small></article>
        <article><span>Head Account</span><strong>{formatPlanMoney(control.headIncome)}</strong><small>{control.headSharePercent.toFixed(1)}% Company Revenue</small></article>
        <article className="total"><span>Доход Atlas</span><strong>{formatPlanMoney(control.companyRevenue)}</strong><small>цель {formatPlanMoney(control.targetRevenue)}</small></article>
      </div>
    </div>
    <footer><span>Company Revenue = Platform Fee Total + Head Account Income.</span><span>{sourceMeta} · Same-period cash indicator; не cohort profitability и не чистая прибыль.</span></footer>
  </section>;
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="af-chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.dataKey}>{item.name}: {item.dataKey === "timingRatio" || item.dataKey === "captureRate" || item.dataKey === "companyRevenueRate" || item.dataKey === "targetRate" ? `${item.value.toFixed(1)}%` : formatMoney(item.value)}</span>)}</div>;
}

function GrowthOperationsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="af-chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.dataKey}>{item.name}: {formatCount(item.value)}</span>)}</div>;
}

function formatPlanMoney(value) {
  return `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: value < 10 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

function formatCount(value) {
  return Number(value || 0).toLocaleString("ru-RU");
}

function GrowthOperations({ rows }) {
  const totals = rows.reduce((result, row) => ({
    flow: result.flow + row.flow,
    newWallets: result.newWallets + row.newWallets,
    cycles: result.cycles + row.cycles,
    companyRevenue: result.companyRevenue + row.companyRevenue,
  }), { flow: 0, newWallets: 0, cycles: 0, companyRevenue: 0 });
  return <div className="af-growth-operations">
    <div className="af-growth-operations-summary">
      <article><span>План потока за 12 месяцев</span><strong>{formatPlanMoney(totals.flow)}</strong><small>сумма месячных целей</small></article>
      <article><span>Новые кошельки</span><strong>{formatCount(totals.newWallets)}</strong><small>целевые подключения</small></article>
      <article><span>Созданные циклы</span><strong>{formatCount(totals.cycles)}</strong><small>целевое количество</small></article>
      <article className="revenue"><span>Доход платформы</span><strong>{formatPlanMoney(totals.companyRevenue)}</strong><small>плановый сценарий</small></article>
    </div>
    <div className="af-growth-operations-chart">
      <div><strong>Операционный масштаб</strong><small>План новых кошельков и циклов по месяцам</small></div>
      <ResponsiveContainer width="100%" height={225}><ComposedChart data={rows} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}><CartesianGrid stroke="#eadfd5" vertical={false} /><XAxis dataKey="shortMonth" tick={{ fontSize: 7, fill: "#79675e" }} axisLine={false} tickLine={false} interval={1} /><YAxis yAxisId="wallets" tickFormatter={(value) => formatCount(value)} tick={{ fontSize: 7, fill: "#79675e" }} axisLine={false} tickLine={false} /><YAxis yAxisId="cycles" orientation="right" tickFormatter={(value) => formatCount(value)} tick={{ fontSize: 7, fill: "#79675e" }} axisLine={false} tickLine={false} /><Tooltip content={<GrowthOperationsTooltip />} /><Bar isAnimationActive={false} yAxisId="wallets" dataKey="newWallets" name="Новые кошельки" fill="#ff8716" radius={[3,3,0,0]} /><Line isAnimationActive={false} yAxisId="cycles" type="monotone" dataKey="cycles" name="Новые циклы" stroke="#239a77" strokeWidth={3} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} /></ComposedChart></ResponsiveContainer>
    </div>
  </div>;
}

function loadGrowthDraft() {
  if (typeof window === "undefined") return { ...DEFAULT_GROWTH_PLAN_DRAFT };
  return parseGrowthPlanDraft(window.localStorage.getItem(GROWTH_PLAN_DRAFT_KEY));
}

function formatSavedAt(value) {
  if (!value) return "Новый локальный черновик";
  return `Сохранено ${new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))}`;
}

function growthPlanRowsFromApi(plan) {
  const monthFormatter = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" });
  const shortFormatter = new Intl.DateTimeFormat("ru-RU", { month: "short", year: "2-digit", timeZone: "UTC" });
  return plan.months.map((row) => {
    const date = new Date(`${row.monthStart}T00:00:00Z`);
    return {
      month: monthFormatter.format(date).replace(/^./, (letter) => letter.toUpperCase()),
      shortMonth: shortFormatter.format(date).replace(" г.", ""),
      flow: Number(row.flowTarget.displayAmount),
      dailyReference: Number(row.dailyReference.displayAmount),
      newWallets: row.newWalletsTarget,
      dailyWallets: row.dailyWalletReference,
      cycles: row.cyclesTarget,
      dailyCycles: row.dailyCycleReference,
      companyRevenue: Number(row.plannedCompanyRevenue.displayAmount),
    };
  });
}

function GrowthPlanRequestState({ request }) {
  const title = request.status === "loading" ? "Загрузка плана роста" : request.status === "auth-required" ? "Нужна админ-сессия" : "План роста недоступен";
  const copy = request.status === "loading"
    ? "Получаем неизменяемую версию управленческого сценария из Admin API."
    : request.status === "auth-required"
      ? "API вернул 401. Локальный demo-план намеренно не подставлен."
      : "Контракт плана не получен или не прошёл проверку. Макетные значения скрыты.";
  return <section className="af-api-boundary" aria-live="polite"><AlertCircle size={24}/><span>GROWTH PLAN · FAIL-CLOSED</span><h2>{title}</h2><p>{copy}</p>{request.status !== "loading" ? <button type="button" onClick={request.reload}>Повторить запрос</button> : null}<a href="/admin/methodology#gate">Проверить источник и Gate 0</a></section>;
}

function wireMoneyValue(value) {
  return Number(value?.displayAmount || 0);
}

function ApiPartnerCapturePanel({ request }) {
  if (request.status !== "ready") {
    const copy = request.status === "loading" ? "Получаем payout и receipt attribution." : request.status === "auth-required" ? "Нужна действующая админ-сессия." : "Источник Partner Economics не предоставил проверяемый dataset.";
    return <section className="af-panel af-partner-capture af-partner-capture-unavailable"><PanelHeader title="Доля Atlas в партнёрских выплатах" subtitle="Partner Capture Rate" action={<Tag tone="orange">N/A</Tag>} /><div><AlertCircle size={20}/><p>{copy} Макетные 35% в API-режиме не подставляются.</p>{request.status !== "loading" ? <button type="button" onClick={request.reload}>Повторить</button> : null}</div></section>;
  }
  const response = request.data;
  const data = response.data;
  const rows = data.series.map((row) => ({
    date: new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(row.bucketStart)),
    networkPaid: wireMoneyValue(row.grossPartnerRewardsPaid),
    atlasReceived: wireMoneyValue(row.atlasReferralIncome),
    captureRate: row.captureRateBasisPoints / 100,
  }));
  const rate = data.captureRateBasisPoints / 100;
  const target = data.targetBasisPoints / 100;
  const gap = data.gapBasisPoints / 100;
  return <section className="af-panel af-partner-capture">
    <PanelHeader title="Доля Atlas в партнёрских выплатах" subtitle="Подтверждённые Partner Rewards сети и атрибутированные поступления головного аккаунта" action={<Tag tone={data.attributionStatus === "complete" && response.meta.reconciliationStatus === "reconciled" ? "green" : "orange"}>{data.attributionStatus === "complete" ? "RECONCILED" : "PARTIAL"}</Tag>} />
    <div className="af-partner-capture-grid">
      <div className="af-partner-capture-summary">
        <div className="af-partner-capture-rate"><span>Partner Capture Rate</span><strong>{rate.toFixed(2)}%</strong><small className={gap >= 0 ? "is-good" : "is-bad"}>{gap >= 0 ? "+" : ""}{gap.toFixed(2)} п.п. к цели {target}%</small></div>
        <div className="af-partner-capture-track"><i style={{ width: `${Math.min(100, target ? rate / target * 100 : 0)}%` }} /><b style={{ left: "100%" }} /></div>
        <div className="af-partner-capture-money"><article><span>Выплачено в партнёрскую сеть</span><strong>{formatPlanMoney(wireMoneyValue(data.grossPartnerRewardsPaid))}</strong><small>Gross Partner Reward</small></article><article><span>Поступило Atlas по рефералке</span><strong>{formatPlanMoney(wireMoneyValue(data.atlasReferralIncome))}</strong><small>Head Account receipts; без Platform Fee</small></article></div>
        <div className="af-partner-capture-split"><div><span>При создании цикла</span><strong>{formatPlanMoney(wireMoneyValue(data.atlasReferralIncomeAtCreation))}</strong><i style={{ width: `${wireMoneyValue(data.atlasReferralIncome) ? wireMoneyValue(data.atlasReferralIncomeAtCreation) / wireMoneyValue(data.atlasReferralIncome) * 100 : 0}%` }} /></div><div><span>После создания / streamed</span><strong>{formatPlanMoney(wireMoneyValue(data.atlasReferralIncomeStreamed))}</strong><i style={{ width: `${wireMoneyValue(data.atlasReferralIncome) ? wireMoneyValue(data.atlasReferralIncomeStreamed) / wireMoneyValue(data.atlasReferralIncome) * 100 : 0}%` }} /></div></div>
      </div>
      <div className="af-partner-capture-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={rows} margin={{ top: 14, right: 12, bottom: 6, left: 0 }}><CartesianGrid stroke="#eadfd5" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><YAxis yAxisId="money" tickFormatter={(value) => `$${Math.round(value)}`} tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><YAxis yAxisId="rate" orientation="right" domain={[0, 50]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><Tooltip content={<RevenueTooltip />} /><Bar isAnimationActive={false} yAxisId="money" dataKey="networkPaid" name="Выплачено сети" fill="#c9b8ae" radius={[3,3,0,0]} /><Bar isAnimationActive={false} yAxisId="money" dataKey="atlasReceived" name="Получено Atlas" fill="#ff8716" radius={[3,3,0,0]} /><ReferenceLine yAxisId="rate" y={target} stroke="#239a77" strokeDasharray="4 4" /><Line isAnimationActive={false} yAxisId="rate" type="monotone" dataKey="captureRate" name="Доля Atlas" stroke="#239a77" strokeWidth={3} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} /></ComposedChart></ResponsiveContainer></div>
    </div>
    <footer className="af-partner-capture-foot"><span>Block {response.meta.asOfBlockNumber} · {response.meta.finality} · reconciliation {response.meta.reconciliationStatus}</span><span>{response.meta.partial ? (response.meta.partialReasons || []).join(", ") : "Transfer attribution complete"}</span></footer>
  </section>;
}

function ApiCompanyEconomicsTrend({ response }) {
  const data = response.data;
  const targetRate = data.targetBasisPoints / 100;
  const rows = data.series.map((row) => {
    const incomingFlow = wireMoneyValue(row.incomingFlow);
    const companyRevenue = wireMoneyValue(row.companyRevenue);
    const companyRevenueRate = row.companyRevenueRateBasisPoints / 100;
    return {
      date: new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(row.bucketStart)),
      bucketStart: row.bucketStart,
      incomingFlow,
      feeDelta: wireMoneyValue(row.platformFeeFromDelta),
      feePartner: wireMoneyValue(row.platformFeeFromPartnerReward),
      headCreation: wireMoneyValue(row.headAccountIncomeAtCreation),
      headStreamed: wireMoneyValue(row.headAccountIncomeStreamed),
      companyRevenue,
      companyRevenueRate,
      targetRate,
      rateGap: companyRevenueRate - targetRate,
      targetRevenue: incomingFlow * targetRate / 100,
    };
  });
  return <section className="af-panel af-company-revenue-trend">
    <PanelHeader title="Динамика Company Revenue" subtitle="Дневные bucket-ы одного UTC period и block cut" action={<div className="af-chart-legend"><span><i style={{ background: "#ff8716" }} />Fee Delta</span><span><i style={{ background: "#f6b92f" }} />Fee Partner</span><span><i style={{ background: "#4e76d0" }} />Head creation</span><span><i style={{ background: "#7a5bb8" }} />Head streamed</span></div>} />
    <div className="af-company-revenue-trend-grid">
      <div className="af-company-revenue-trend-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={rows} margin={{ top: 14, right: 12, bottom: 6, left: 0 }}><CartesianGrid stroke="#eadfd5" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><YAxis yAxisId="money" tickFormatter={(value) => `$${Math.round(value)}`} tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><YAxis yAxisId="rate" orientation="right" domain={[0, "auto"]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><Tooltip content={<RevenueTooltip />} /><Bar isAnimationActive={false} yAxisId="money" dataKey="feeDelta" name="Fee с Delta" stackId="revenue" fill="#ff8716" /><Bar isAnimationActive={false} yAxisId="money" dataKey="feePartner" name="Fee с Partner" stackId="revenue" fill="#f6b92f" /><Bar isAnimationActive={false} yAxisId="money" dataKey="headCreation" name="Head at creation" stackId="revenue" fill="#4e76d0" /><Bar isAnimationActive={false} yAxisId="money" dataKey="headStreamed" name="Head streamed" stackId="revenue" fill="#7a5bb8" radius={[3,3,0,0]} /><ReferenceLine yAxisId="rate" y={targetRate} stroke="#285c22" strokeDasharray="4 4" /><Line isAnimationActive={false} yAxisId="rate" type="monotone" dataKey="companyRevenueRate" name="Company Revenue Rate" stroke="#239a77" strokeWidth={3} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} /></ComposedChart></ResponsiveContainer></div>
      <div className="af-table-scroll af-company-revenue-trend-table"><table><thead><tr><th>UTC bucket</th><th className="number">Incoming</th><th className="number">Revenue</th><th className="number">Rate</th><th>К цели</th></tr></thead><tbody>{rows.map((row) => <tr key={row.bucketStart}><td><strong>{row.date}</strong><small>{row.bucketStart.slice(11, 16)} UTC</small></td><td className="number">{formatPlanMoney(row.incomingFlow)}</td><td className="number">{formatPlanMoney(row.companyRevenue)}<small>цель {formatPlanMoney(row.targetRevenue)}</small></td><td className="number"><strong>{row.companyRevenueRate.toFixed(2)}%</strong></td><td><Tag tone={row.rateGap >= 0 ? "green" : "red"}>{row.rateGap >= 0 ? "+" : ""}{row.rateGap.toFixed(2)} п.п.</Tag></td></tr>)}</tbody></table></div>
    </div>
    <footer className="af-company-revenue-trend-foot"><span>Rate = Company Treasury receipts / reconciled incoming principal соответствующего bucket.</span><span>Target {targetRate.toFixed(2)}% · partial buckets не являются чистой прибылью или cohort take rate.</span></footer>
  </section>;
}

const receiptTypeMeta = {
  platform_fee_delta: { label: "Fee с Delta", group: "fee", tone: "orange" },
  platform_fee_partner: { label: "Fee с Partner", group: "fee", tone: "orange" },
  head_account_creation: { label: "Head creation", group: "head", tone: "blue" },
  head_account_streamed: { label: "Head streamed", group: "head", tone: "blue" },
};

function shortHash(value) {
  return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : "N/A";
}

function ApiCompanyRevenueRegister({ request }) {
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  if (request.status !== "ready") {
    const copy = request.status === "loading" ? "Получаем treasury receipts и Platform Fee lineage." : request.status === "auth-required" ? "Нужна действующая админ-сессия." : "Транзакционный источник не предоставил проверяемые записи.";
    return <section className="af-panel af-company-events af-company-events-unavailable"><PanelHeader title="Реестр начислений" subtitle="От источника Gross до Company Treasury receipt" action={<Tag tone="orange">N/A</Tag>} /><div><AlertCircle size={20}/><p>{copy} Статические события в API-режиме не подставляются.</p>{request.status !== "loading" ? <button type="button" onClick={request.reload}>Повторить</button> : null}</div></section>;
  }
  const { platformFees, companyReceipts } = request.data;
  const feeById = new Map(platformFees.data.map((row) => [row.id, row]));
  const filtered = companyReceipts.data.filter((row) => filter === "all" || receiptTypeMeta[row.receiptType].group === filter);
  const selected = companyReceipts.data.find((row) => row.id === selectedId);
  const selectedFee = selected?.sourceEventId ? feeById.get(selected.sourceEventId) : null;
  return <section className="af-panel af-company-events">
    <PanelHeader title="Реестр начислений" subtitle="Фактические Company Treasury receipts с привязкой к allocation, tx и block" action={<div className="af-company-events-filters" role="tablist">{[["all", "Все"], ["fee", "Platform Fee"], ["head", "Head Account"]].map(([id, label]) => <button type="button" role="tab" aria-selected={filter === id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)} key={id}>{label}</button>)}</div>} />
    <div className="af-table-scroll af-company-events-table"><table><thead><tr><th>Тип / время</th><th>Цикл</th><th>Receipt tx</th><th className="number">Сумма</th><th>Block</th><th>Сверка</th></tr></thead><tbody>{filtered.map((row) => { const meta = receiptTypeMeta[row.receiptType]; return <tr className={selectedId === row.id ? "selected" : ""} onClick={() => setSelectedId(row.id)} key={row.id}><td><Tag tone={meta.tone}>{meta.label}</Tag><small>{new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(row.occurredAt))} UTC</small></td><td><strong>{row.cycleLabel}</strong><small>{row.sourceEventId ? "linked allocation" : "direct Head receipt"}</small></td><td className="af-lineage">{shortHash(row.txHash)}<small>log {row.logIndex}</small></td><td className="number"><strong>{formatPlanMoney(wireMoneyValue(row.amount))}</strong></td><td>{row.blockNumber.toLocaleString("en-US")}<small>{row.finality}</small></td><td><Tag tone={row.reconciliationStatus === "reconciled" ? "green" : "orange"}>{row.reconciliationStatus.toUpperCase()}</Tag></td></tr>; })}</tbody></table></div>
    <footer className="af-company-events-foot"><span>{filtered.length} из {companyReceipts.data.length} receipts · {platformFees.data.length} Platform Fee allocations</span><span>Block {companyReceipts.meta.asOfBlockNumber} · {companyReceipts.meta.finality} · PARTIAL до ledger reconciliation</span></footer>
    {selected ? <div className="af-company-event-detail"><div className="af-revenue-detail-head"><strong>Lineage · {receiptTypeMeta[selected.receiptType].label}</strong><button type="button" onClick={() => setSelectedId("")} aria-label="Закрыть"><X size={16}/></button></div><dl><div><dt>Receipt tx</dt><dd>{selected.txHash}</dd></div><div><dt>Source allocation</dt><dd>{selectedFee ? `${selectedFee.allocationTxHash} · Gross ${formatPlanMoney(wireMoneyValue(selectedFee.grossAmount))} · fee ${selectedFee.feeRateBasisPoints / 100}%` : "Прямое Head Account поступление; allocation отсутствует"}</dd></div><div><dt>Cycle</dt><dd>{selected.cycleLabel}</dd></div><div><dt>Block / log</dt><dd>{selected.blockNumber.toLocaleString("en-US")} / {selected.logIndex}</dd></div><div><dt>Finality / reconciliation</dt><dd>{selected.finality} / {selected.reconciliationStatus}</dd></div></dl></div> : null}
  </section>;
}

function ApiCompanyEconomicsPanel({ request }) {
  if (request.status !== "ready") {
    const copy = request.status === "loading"
      ? "Получаем входящий поток и поступления Company Treasury."
      : request.status === "auth-required"
        ? "Нужна действующая админ-сессия."
        : "Источник Company Economics не предоставил проверяемый dataset.";
    return <section className="af-panel af-company-revenue-control af-company-revenue-unavailable"><PanelHeader title="Экономика Atlas · цель и факт" subtitle="Company Revenue Rate" action={<Tag tone="orange">N/A</Tag>} /><div><AlertCircle size={20}/><p>{copy} Макетные 4% в API-режиме не подставляются.</p>{request.status !== "loading" ? <button type="button" onClick={request.reload}>Повторить</button> : null}</div></section>;
  }
  const response = request.data;
  const data = response.data;
  const reconciled = data.attributionStatus === "complete" && response.meta.reconciliationStatus === "reconciled";
  const control = calculateCompanyRevenueControl({
    incomingFlow: wireMoneyValue(data.incomingFlow),
    platformFee: wireMoneyValue(data.platformFeeTotal),
    headAccountIncome: wireMoneyValue(data.headAccountIncome),
    targetPercent: data.targetBasisPoints / 100,
  });
  return <>
    <RevenueControlPanel
      control={control}
      sourceLabel={reconciled ? "RECONCILED" : "PARTIAL"}
      sourceTone={reconciled ? "green" : "orange"}
      sourceMeta={`Block ${response.meta.asOfBlockNumber} · ${response.meta.finality} · reconciliation ${response.meta.reconciliationStatus}`}
    />
    <ApiCompanyEconomicsTrend response={response} />
  </>;
}

function ApiGrowthPlanScreen({ response, partnerRequest, companyRequest, eventsRequest }) {
  const plan = response.data;
  const rows = growthPlanRowsFromApi(plan);
  const revenuePercent = plan.plannedCompanyRevenueBasisPoints / 100;
  return <div className="af-content">
    <div className="af-revenue-notice"><span><Info size={14} /></span><p><strong>Company Economics и Partner Capture проверяются независимо.</strong> Значения остаются PARTIAL, пока transfer attribution и reconciliation не подтверждены полностью; недоступные источники не заменяются DEMO.</p><a href="/admin/reconciliation">Проверить покрытие данных</a></div>
    <OfficialRulesetPanel />
    <ApiCompanyEconomicsPanel request={companyRequest} />
    <ApiCompanyRevenueRegister request={eventsRequest} />
    <ApiPartnerCapturePanel request={partnerRequest} />
    <section className="af-panel af-growth-plan af-growth-plan-api">
      <PanelHeader title="План роста входящего потока" subtitle={`Версия ${plan.version} · действует с ${plan.effectiveFrom} · owner ${plan.owner}`} action={<Tag tone={plan.status === "approved" ? "green" : "orange"}>{plan.status === "approved" ? "APPROVED" : "PROPOSED"}</Tag>} />
      <div className="af-growth-chart-wrap">
        <div className="af-growth-chart-head"><div><strong>Серверный сценарий · {plan.monthlyGrowthBasisPoints / 100}% MoM</strong><small>Источник: {plan.source} · reconciliation: {response.meta.reconciliationStatus}</small></div><span>Плановый доход: {revenuePercent}%</span></div>
        <div className="af-growth-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={rows} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}><CartesianGrid stroke="#eadfd5" vertical={false} /><XAxis dataKey="shortMonth" tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} interval={0} /><YAxis yAxisId="flow" tickFormatter={(value) => `$${Math.round(value / 1000000)}m`} tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><YAxis yAxisId="revenue" orientation="right" tickFormatter={(value) => `$${Math.round(value / 1000)}k`} tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><Tooltip content={<RevenueTooltip />} /><Bar isAnimationActive={false} yAxisId="flow" dataKey="flow" name="План потока" fill="#ff8716" radius={[3,3,0,0]} /><Line isAnimationActive={false} yAxisId="revenue" type="monotone" dataKey="companyRevenue" name="План дохода" stroke="#285c22" strokeWidth={3} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} /></ComposedChart></ResponsiveContainer></div>
      </div>
      <GrowthOperations rows={rows} />
      <div className="af-table-scroll af-growth-table"><table><thead><tr><th>Месяц</th><th className="number">План потока</th><th className="number">Поток / день</th><th className="number">Новые кошельки</th><th className="number">Кошельки / день</th><th className="number">Новые циклы</th><th className="number">Циклы / день</th><th className="number">Доход платформы</th><th>Статус</th></tr></thead><tbody>{rows.map((row) => <tr key={row.month}><td><strong>{row.month}</strong></td><td className="number">{formatMoney(row.flow)}</td><td className="number">{formatMoney(row.dailyReference)}</td><td className="number">{formatCount(row.newWallets)}</td><td className="number">{formatCount(row.dailyWallets)}</td><td className="number">{formatCount(row.cycles)}</td><td className="number">{formatCount(row.dailyCycles)}</td><td className="number revenue">{formatMoney(row.companyRevenue)}</td><td><Tag tone={plan.status === "approved" ? "green" : "orange"}>{plan.status.toUpperCase()}</Tag></td></tr>)}</tbody></table></div>
      <footer className="af-growth-foot"><span>Block {response.meta.asOfBlockNumber} · {response.meta.finality} · source {response.meta.sourceStatus}</span><span>{response.meta.partial ? `PARTIAL: ${(response.meta.partialReasons || []).join(", ")}` : "Полный утверждённый план"}</span></footer>
    </section>
  </div>;
}

function MethodDialog({ mode, onClose }) {
  const cohort = mode === "cohort";
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-revenue-method-title">
      <div className="af-modal-head"><div><span><BookOpenCheck size={17} /> Методика</span><h2 id="af-revenue-method-title">{cohort ? "Когортный take rate" : "Признание дохода компании"}</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div>
      {cohort ? <dl><div><dt>Когорта</dt><dd>Циклы, созданные в одном периоде, отслеживаются до фактического получения компанией дохода.</dd></div><div><dt>Знаменатель</dt><dd>Входящий Principal только этой когорты, без внутренних переводов.</dd></div><div><dt>Числитель</dt><dd>Фактически поступившие Platform Fee и Head Account rewards, связанные с этой когортой.</dd></div><div><dt>Зачем</dt><dd>Убирает искажение, когда сегодняшние поступления относятся к циклам прошлых периодов.</dd></div></dl> : <dl><div><dt>Денежный доход</dt><dd>Фактические поступления Platform Fee и вознаграждений Head Account в Company Treasury.</dd></div><div><dt>Platform Fee</dt><dd>Удерживается внутри Gross Delta или Gross Partner Reward и не прибавляется к выплате сверху.</dd></div><div><dt>Same-period timing</dt><dd>Поступления текущего периода, делённые на входящий поток этого же периода. Это кассовый индикатор, а не unit economics.</dd></div><div><dt>Чистая прибыль</dt><dd>Не рассчитывается, пока не подключены OPEX, налоги, резервы и прочие расходы.</dd></div></dl>}
      <p className="af-modal-warning"><Info size={16} /> Производственный API должен возвращать источник, tx hash, block/finality, период признания и reconciliation status. Браузер не рассчитывает канонический доход.</p>
    </section>
  </div>;
}

function EventDetail({ event, onClose }) {
  if (!event) return null;
  return <section className="af-revenue-detail" aria-live="polite"><div className="af-revenue-detail-head"><strong>Детали начисления · {event.hash}</strong><button type="button" onClick={onClose} aria-label="Закрыть"><X size={16} /></button></div><dl><div><dt>Транзакция</dt><dd>{event.hash}</dd></div><div><dt>Источник</dt><dd>{event.type}</dd></div><div><dt>Кошелек</dt><dd>{event.wallet}</dd></div><div><dt>Цикл</dt><dd>{event.cycle}</dd></div><div><dt>Блок</dt><dd>{event.block}</dd></div></dl></section>;
}

export default function AdminFinanceRevenue() {
  const growthPlanRequest = useAdminFinanceGrowthPlan();
  const companyEconomicsRequest = useAdminFinanceCompanyEconomics({
    from: "2026-07-29T00:00:00Z",
    to: "2026-08-05T00:00:00Z",
  });
  const companyRevenueEventsRequest = useAdminFinanceCompanyRevenueEvents({
    from: "2026-07-29T00:00:00Z",
    to: "2026-08-05T00:00:00Z",
  });
  const partnerEconomicsRequest = useAdminFinancePartnerEconomics({
    from: "2026-07-29T00:00:00Z",
    to: "2026-08-05T00:00:00Z",
  });
  const [period, setPeriod] = useState("7d");
  const [method, setMethod] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [growthDraft, setGrowthDraft] = useState(loadGrowthDraft);
  const [growthSavedAt, setGrowthSavedAt] = useState(growthDraft.updatedAt);
  const { baseline: growthBaseline, actual: growthActual, elapsedDays: growthElapsedDays } = growthDraft;
  const factor = periodFactors[period];
  const values = useMemo(() => ({ cash: 829 * factor, fee: 625 * factor, head: 204 * factor, inflow: 18420 * factor }), [factor]);
  const companyRevenueControl = useMemo(() => calculateCompanyRevenueControl({ incomingFlow: values.inflow, platformFee: values.fee, headAccountIncome: values.head }), [values]);
  const chartData = useMemo(() => companyRevenueSeries.map((row, index) => ({ ...row, date: periodLabels[period][index], feeDelta: row.feeDelta * factor, feePartner: row.feePartner * factor, headAccount: row.headAccount * factor })), [factor, period]);
  const partnerCaptureData = useMemo(() => partnerCaptureSeries.map((row, index) => ({ ...row, date: periodLabels[period][index], networkPaid: row.networkPaid * factor, atlasReceived: row.atlasReceived * factor })), [factor, period]);
  const selected = companyRevenueEvents.find((event) => event.id === selectedId);
  const visibleEvents = showAll ? companyRevenueEvents : companyRevenueEvents.slice(0, 3);
  const partnerNetworkPaid = PARTNER_CAPTURE_DEMO.grossPartnerRewardsPaid * factor;
  const atlasReferralIncome = PARTNER_CAPTURE_DEMO.atlasReferralIncome * factor;
  const partnerCaptureControl = calculatePartnerCaptureControl({
    grossPartnerRewardsPaid: partnerNetworkPaid,
    atlasReferralIncome,
    targetPercent: companyGrowthPlanAssumptions.partnerCaptureTargetPercent,
  });
  const partnerCaptureRate = partnerCaptureControl.ratePercent;
  const partnerCaptureTarget = partnerCaptureControl.targetPercent;
  const partnerCaptureGap = partnerCaptureControl.gapPercentagePoints;
  const growthCalculation = useMemo(() => {
    const baseline = Math.max(0, Number(growthBaseline) || 0);
    const actual = Math.max(0, Number(growthActual) || 0);
    const daysInMonth = 31;
    const elapsedDays = Math.min(daysInMonth, Math.max(1, Number(growthElapsedDays) || 1));
    const remainingDays = Math.max(0, daysInMonth - elapsedDays);
    const target = baseline * (1 + companyGrowthPlanAssumptions.monthlyGrowthPercent / 100);
    const paceToDate = target * (elapsedDays / daysInMonth);
    const remaining = Math.max(0, target - actual);
    const requiredDaily = remainingDays ? remaining / remainingDays : remaining;
    const projected = actual / elapsedDays * daysInMonth;
    return { actual, paceToDate, projected, remaining, remainingDays, requiredDaily, target };
  }, [growthActual, growthBaseline, growthElapsedDays]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = createGrowthPlanDraft(growthDraft);
        window.localStorage.setItem(GROWTH_PLAN_DRAFT_KEY, JSON.stringify(saved));
        setGrowthSavedAt(saved.updatedAt);
      } catch {
        setGrowthSavedAt(null);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [growthDraft.actual, growthDraft.baseline, growthDraft.elapsedDays]);

  function updateGrowthDraft(field, value) {
    setGrowthDraft((current) => ({ ...current, [field]: value }));
  }

  function resetGrowthDraft() {
    window.localStorage.removeItem(GROWTH_PLAN_DRAFT_KEY);
    setGrowthDraft({ ...DEFAULT_GROWTH_PLAN_DRAFT });
    setGrowthSavedAt(null);
  }

  function exportCsv() {
    const rows = [["type", "moment", "tx_hash", "wallet", "cycle", "block", "amount_usdt"], ...companyRevenueEvents.map((event) => [event.type, event.moment, event.hash, event.wallet, event.cycle, event.block, event.amount])];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `atlas-company-revenue-${period}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (growthPlanRequest.apiEnabled && growthPlanRequest.status !== "ready") {
    return <GrowthPlanRequestState request={growthPlanRequest} />;
  }
  if (growthPlanRequest.apiEnabled) {
    return <ApiGrowthPlanScreen response={growthPlanRequest.data} partnerRequest={partnerEconomicsRequest} companyRequest={companyEconomicsRequest} eventsRequest={companyRevenueEventsRequest} />;
  }

  return <div className="af-content">
    <div className="af-revenue-toolbar"><div className="af-periods" role="tablist">{overviewPeriods.map((item) => <button role="tab" aria-selected={period === item.id} className={period === item.id ? "active" : ""} type="button" onClick={() => setPeriod(item.id)} key={item.id}>{item.label}</button>)}</div><div className="af-date-control"><span>Срез на дату</span><input type="date" defaultValue="2026-08-04" aria-label="Срез на дату" /></div><div className="af-page-actions"><button type="button" onClick={() => setMethod("revenue")}><BookOpenCheck size={15} />Методика</button><button className="primary" type="button" onClick={exportCsv}><Download size={15} />Экспорт</button></div></div>

    <div className="af-revenue-notice"><span><Info size={14} /></span><p><strong>Доход компании не равен чистой прибыли.</strong> Здесь показаны фактически полученные Platform Fee и вознаграждения головного аккаунта. Операционные расходы, налоги и резервы пока не подключены к источнику данных.</p><button type="button" onClick={() => setMethod("revenue")}>Открыть определение</button></div>

    <OfficialRulesetPanel />

    <section className="af-metrics">
      <Metric accent="#239a77" label="Денежный доход" tag="DEMO" tone="green" value={formatMoney(values.cash)} unit="USDT" note="Иллюстративное изменение периода" noteTone="good" />
      <Metric accent="#ff8716" label="Platform Fee" tag="75.4%" tone="orange" value={formatMoney(values.fee)} unit="USDT" note={`Delta ${formatMoney(486 * factor)} · Partner Reward ${formatMoney(139 * factor)}`} />
      <Metric accent="#4e76d0" label="Head Account" tag="24.6%" tone="blue" value={formatMoney(values.head)} unit="USDT" note={`At creation ${formatMoney(128 * factor)} · streamed ${formatMoney(76 * factor)}`} />
      <Metric accent="#7a5bb8" label="Same-period cash timing" tag={period.toUpperCase()} tone="violet" value={`${companyRevenueControl.ratePercent.toFixed(2)}%`} note={`${formatMoney(values.cash)} receipts / ${formatMoney(values.inflow)} inflow; не cohort take rate`} />
    </section>

    <RevenueControlPanel control={companyRevenueControl} />

    <section className="af-panel af-partner-capture">
      <PanelHeader title="Доля Atlas в партнёрских выплатах" subtitle="Какая часть всех подтверждённых Partner Rewards сети фактически поступила головному аккаунту Atlas" action={<div className="af-chart-legend"><span><i style={{ background: "#b9a79c" }} />Выплачено сети</span><span><i style={{ background: "#ff8716" }} />Получено Atlas</span><span><i style={{ background: "#239a77" }} />Доля Atlas</span></div>} />
      <div className="af-partner-capture-grid">
        <div className="af-partner-capture-summary">
          <div className="af-partner-capture-rate"><span>Partner Capture Rate <Tag tone="orange">DEMO</Tag></span><strong>{partnerCaptureRate.toFixed(2)}%</strong><small className={partnerCaptureGap >= 0 ? "is-good" : "is-bad"}>{partnerCaptureGap >= 0 ? "+" : ""}{partnerCaptureGap.toFixed(2)} п.п. к цели {partnerCaptureTarget}%</small></div>
          <div className="af-partner-capture-track"><i style={{ width: `${Math.min(100, partnerCaptureTarget ? partnerCaptureRate / partnerCaptureTarget * 100 : 0)}%` }} /><b style={{ left: "100%" }} /></div>
          <div className="af-partner-capture-money"><article><span>Всего выплачено в партнёрскую сеть</span><strong>{formatMoney(partnerNetworkPaid)}</strong><small>Gross Partner Reward · creation + streamed</small></article><article><span>Поступило Atlas по рефералке</span><strong>{formatMoney(atlasReferralIncome)}</strong><small>Только Head Account income; без Platform Fee</small></article></div>
          <div className="af-partner-capture-split"><div><span>При создании цикла</span><strong>{formatMoney(PARTNER_CAPTURE_DEMO.atlasReferralIncomeAtCreation * factor)}</strong><i style={{ width: `${PARTNER_CAPTURE_DEMO.atlasReferralIncomeAtCreation / PARTNER_CAPTURE_DEMO.atlasReferralIncome * 100}%` }} /></div><div><span>После создания / streamed</span><strong>{formatMoney(PARTNER_CAPTURE_DEMO.atlasReferralIncomeStreamed * factor)}</strong><i style={{ width: `${PARTNER_CAPTURE_DEMO.atlasReferralIncomeStreamed / PARTNER_CAPTURE_DEMO.atlasReferralIncome * 100}%` }} /></div></div>
          <p><Info size={14} /> На каждые $100 партнёрских выплат сети Atlas должен получать целевые $35. Реальный процент считается по transfer-level данным за один и тот же период; начисления без выплаты и Platform Fee исключаются.</p>
        </div>
        <div className="af-partner-capture-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={partnerCaptureData} margin={{ top: 14, right: 12, bottom: 6, left: 0 }}><CartesianGrid stroke="#eadfd5" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><YAxis yAxisId="money" tickFormatter={(value) => `$${Math.round(value)}`} tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><YAxis yAxisId="rate" orientation="right" domain={[0, 50]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><Tooltip content={<RevenueTooltip />} /><Bar isAnimationActive={false} yAxisId="money" dataKey="networkPaid" name="Выплачено сети" fill="#c9b8ae" radius={[3,3,0,0]} /><Bar isAnimationActive={false} yAxisId="money" dataKey="atlasReceived" name="Получено Atlas" fill="#ff8716" radius={[3,3,0,0]} /><ReferenceLine yAxisId="rate" y={partnerCaptureTarget} stroke="#239a77" strokeDasharray="4 4" /><Line isAnimationActive={false} yAxisId="rate" type="monotone" dataKey="captureRate" name="Доля Atlas" stroke="#239a77" strokeWidth={3} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} /></ComposedChart></ResponsiveContainer></div>
      </div>
      <footer className="af-partner-capture-foot"><span>Цель 35% — управленческий ориентир, а не гарантия.</span><span>Production: paid Partner Rewards denominator · attributed Head Account receipts numerator · same UTC period · reconciled transfers</span></footer>
    </section>

    <section className="af-panel af-growth-plan">
      <PanelHeader title="План роста входящего потока · минимум +40% MoM" subtitle="Управленческий сценарий: цель следующего месяца, факт, отклонение от темпа и пересчёт нагрузки на оставшиеся дни" action={<Tag tone="orange">PLAN · DEMO</Tag>} />
      <div className="af-growth-plan-grid">
        <div className="af-growth-calculator">
          <div className="af-growth-title"><span><Calculator size={16} /></span><div><strong>Динамический контроль месяца</strong><small>Пример на 13.08.2026 · факт вводится вручную</small></div><div className="af-growth-draft-state"><Tag tone="blue">LOCAL DRAFT</Tag><small>{formatSavedAt(growthSavedAt)}</small><button type="button" onClick={resetGrowthDraft} title="Сбросить локальный черновик" aria-label="Сбросить локальный черновик"><RotateCcw size={13} /></button></div></div>
          <div className="af-growth-inputs">
            <label><span>Факт прошлого месяца, USDT</span><input type="number" min="0" step="0.01" value={growthBaseline} onChange={(event) => updateGrowthDraft("baseline", event.target.value)} /></label>
            <label><span>Факт текущего месяца, USDT</span><input type="number" min="0" step="0.01" value={growthActual} onChange={(event) => updateGrowthDraft("actual", event.target.value)} /></label>
            <label><span>Прошло дней</span><input type="number" min="1" max="31" step="1" value={growthElapsedDays} onChange={(event) => updateGrowthDraft("elapsedDays", event.target.value)} /></label>
          </div>
          <div className="af-growth-kpis">
            <article><span><Target size={14} /> Цель месяца</span><strong>{formatPlanMoney(growthCalculation.target)}</strong><small>Предыдущий факт × 1.40</small></article>
            <article><span><TrendingUp size={14} /> План на текущую дату</span><strong>{formatPlanMoney(growthCalculation.paceToDate)}</strong><small className={growthCalculation.actual >= growthCalculation.paceToDate ? "is-good" : "is-bad"}>{growthCalculation.actual >= growthCalculation.paceToDate ? "План опережается" : `Отставание ${formatPlanMoney(growthCalculation.paceToDate - growthCalculation.actual)}`}</small></article>
            <article><span>Нужно добрать</span><strong>{formatPlanMoney(growthCalculation.remaining)}</strong><small>{growthCalculation.remainingDays} дней после текущего</small></article>
            <article><span>Средний поток / день</span><strong>{formatPlanMoney(growthCalculation.requiredDaily)}</strong><small>Пересчитывается после каждого факта</small></article>
          </div>
          <div className="af-growth-projection"><span>Прогноз конца месяца при текущем темпе</span><strong>{formatPlanMoney(growthCalculation.projected)}</strong><i style={{ width: `${Math.min(100, growthCalculation.target ? growthCalculation.projected / growthCalculation.target * 100 : 0)}%` }} /></div>
          <p className="af-growth-explainer"><Info size={14} /> Контроль ведётся по суммарному дневному и месячному потоку. Отдельный перевод не обязан быть больше предыдущего: после каждого подтверждённого поступления система пересчитывает остаток и необходимый средний темп.</p>
        </div>

        <div className="af-growth-chart-wrap">
          <div className="af-growth-chart-head"><div><strong>Сценарий август 2026 — июль 2027</strong><small>Версия growth-plan-2026.08-v2 · статус: предложен, не утверждён</small></div><span>Сценарий: ≈{companyGrowthPlanAssumptions.scenarioGrowthPercent}% MoM · доход {companyGrowthPlanAssumptions.plannedCompanyRevenuePercent}%</span></div>
          <div className="af-growth-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={companyGrowthPlan} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}><CartesianGrid stroke="#eadfd5" vertical={false} /><XAxis dataKey="shortMonth" tick={{ fontSize: 7, fill: "#79675e" }} axisLine={false} tickLine={false} interval={1} /><YAxis yAxisId="flow" tickFormatter={(value) => `$${Math.round(value / 1000000)}m`} tick={{ fontSize: 7, fill: "#79675e" }} axisLine={false} tickLine={false} /><YAxis yAxisId="revenue" orientation="right" tickFormatter={(value) => `$${Math.round(value / 1000)}k`} tick={{ fontSize: 7, fill: "#79675e" }} axisLine={false} tickLine={false} /><Tooltip content={<RevenueTooltip />} /><Bar isAnimationActive={false} yAxisId="flow" dataKey="flow" name="План потока" fill="#ff8716" radius={[3,3,0,0]} /><Line isAnimationActive={false} yAxisId="revenue" type="monotone" dataKey="companyRevenue" name="План дохода" stroke="#285c22" strokeWidth={3} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} /></ComposedChart></ResponsiveContainer></div>
        </div>
      </div>
      <GrowthOperations rows={companyGrowthPlan} />
      <div className="af-table-scroll af-growth-table"><table><thead><tr><th>Месяц</th><th className="number">План потока</th><th className="number">Поток / день</th><th className="number">Новые кошельки</th><th className="number">Кошельки / день</th><th className="number">Новые циклы</th><th className="number">Циклы / день</th><th className="number">Доход платформы</th><th className="number">Сценарий</th></tr></thead><tbody>{companyGrowthPlan.map((row, index) => <tr key={row.month}><td><strong>{row.month}</strong>{index === 0 ? <small>Базовый месяц сценария</small> : null}</td><td className="number">{formatMoney(row.flow)}</td><td className="number">{formatMoney(row.dailyReference)}</td><td className="number">{formatCount(row.newWallets)}</td><td className="number">{formatCount(row.dailyWallets)}</td><td className="number">{formatCount(row.cycles)}</td><td className="number">{formatCount(row.dailyCycles)}</td><td className="number revenue">{formatMoney(row.companyRevenue)}</td><td className="number"><Tag tone={index === 0 ? "blue" : "green"}>{index === 0 ? "BASE" : `≈+${companyGrowthPlanAssumptions.scenarioGrowthPercent}%`}</Tag></td></tr>)}</tbody></table></div>
      <footer className="af-growth-foot"><span>Это предоставленный управленческий сценарий. Кошельки, циклы и доход — плановые цели, не фактические показатели.</span><span>Минимальная политика +{companyGrowthPlanAssumptions.monthlyGrowthPercent}% сохранена в динамическом контроле · табличный сценарий ≈{companyGrowthPlanAssumptions.scenarioGrowthPercent}% MoM · 30-дневные ориентиры · owner approval pending</span></footer>
    </section>

    <div className="af-revenue-main-grid">
      <section className="af-panel"><PanelHeader title="Динамика cash receipts и timing ratio" subtitle="Фактические поступления Company Treasury · 7 точек выбранного периода" action={<div className="af-chart-legend"><span><i style={{ background: "#ff8716" }} />Fee с Delta</span><span><i style={{ background: "#f6b92f" }} />Fee с Partner</span><span><i style={{ background: "#4e76d0" }} />Head Account</span><span><i style={{ background: "#239a77" }} />Cash timing ratio</span></div>} /><div className="af-revenue-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 12, right: 14, bottom: 6, left: 2 }}><CartesianGrid stroke="#eadfd5" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><YAxis yAxisId="money" domain={period === "7d" ? [0, 180] : [0, "auto"]} tickFormatter={(value) => `$${value.toLocaleString("en-US")}`} tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><YAxis yAxisId="ratio" orientation="right" domain={[0, 6]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><Tooltip content={<RevenueTooltip />} /><Bar isAnimationActive={false} yAxisId="money" dataKey="feeDelta" name="Fee с Delta" stackId="revenue" fill="#ff8716" /><Bar isAnimationActive={false} yAxisId="money" dataKey="feePartner" name="Fee с Partner" stackId="revenue" fill="#f6b92f" /><Bar isAnimationActive={false} yAxisId="money" dataKey="headAccount" name="Head Account" stackId="revenue" fill="#4e76d0" radius={[3,3,0,0]} /><Line isAnimationActive={false} yAxisId="ratio" type="monotone" dataKey="timingRatio" name="Cash timing ratio" stroke="#239a77" strokeWidth={3} dot={{ r: 4, fill: "#fff", strokeWidth: 3 }} /></ComposedChart></ResponsiveContainer></div></section>

      <section className="af-panel"><PanelHeader title="Состав денежного дохода" subtitle={`Распределение ${formatMoney(values.cash)} фактически полученных средств`} action={<Tag>СВЕРЕНО</Tag>} /><div className="af-revenue-composition"><div className="af-revenue-donut-row"><div className="af-revenue-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={companyRevenueComposition} dataKey="value" innerRadius={41} outerRadius={64} stroke="none" isAnimationActive={false}>{companyRevenueComposition.map((item) => <Cell fill={item.color} key={item.name} />)}</Pie></PieChart></ResponsiveContainer><strong>{formatMoney(values.cash)}</strong></div><div className="af-revenue-breakdown">{companyRevenueComposition.map((item) => <div key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><strong>{formatMoney(item.value * factor)}</strong></div>)}</div></div><div className="af-revenue-rate"><div><span>Fee rate</span><strong>10.00%</strong></div><div><span>Cash timing / $100 Inflow</span><strong>$4.50</strong></div></div><div className="af-revenue-method-note">Platform Fee находится внутри Gross и не прибавляется сверх него. Fee признается доходом только после фактического поступления в Company Treasury; retained allocation без treasury transfer показывается отдельно.</div></div></section>
    </div>

    <div className="af-revenue-lower-grid">
      <section className="af-panel"><PanelHeader title="Устойчивость take rate по когортам" subtitle="Доход компании относительно входящего Principal соответствующей когорты" action={<button className="af-small-link" type="button" onClick={() => setMethod("cohort")}>Метод когорт</button>} /><div className="af-revenue-cohorts"><div className="af-cohort-cards">{companyRevenueCohorts.map((row) => <article key={row.label}><span>Когорта {row.label}</span><strong>{row.rate}</strong><small>{row.note}</small></article>)}</div><div className="af-cohort-bars">{companyRevenueCohorts.map((row) => <div key={row.label}><span>{row.label}</span><div><i style={{ width: `${row.fee}%`, background: "#ff8716" }} /><i style={{ width: `${row.head}%`, background: "#4e76d0" }} /><i style={{ width: `${row.claim}%`, background: "#7a5bb8" }} /></div><strong>{formatMoney(row.total)}</strong></div>)}</div></div></section>

      <section className="af-panel af-revenue-events"><PanelHeader title="Последние начисления" subtitle="Демонстрационная lineage до транзакции" action={<button className="af-small-link" type="button" onClick={() => setShowAll((value) => !value)}>{showAll ? "Свернуть" : "Все операции"}</button>} /><div className="af-table-scroll"><table><thead><tr><th>Тип</th><th>Транзакция</th><th className="number">Сумма</th><th>Статус</th></tr></thead><tbody>{visibleEvents.map((event) => <tr className={selectedId === event.id ? "selected" : ""} onClick={() => setSelectedId(event.id)} key={event.id}><td><strong>{event.type}</strong><small>{event.moment}</small></td><td className="af-lineage">{event.hash}</td><td className="number">{formatMoney(event.amount)}</td><td><Tag tone="orange">DEMO</Tag></td></tr>)}</tbody></table></div><div className="af-revenue-events-foot"><span>Fixtures · production reconciliation не выполнен</span><strong>1–{visibleEvents.length} из 248</strong></div></section>
    </div>
    <EventDetail event={selected} onClose={() => setSelectedId("")} />
    {method ? <MethodDialog mode={method} onClose={() => setMethod("")} /> : null}
  </div>;
}
