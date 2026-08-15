import { AlertTriangle, BookOpenCheck, Download, Info, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

const periods = [["7d", "7 дней"], ["30d", "30 дней"], ["90d", "90 дней"], ["all", "Всё время"]];
const periodData = {
  "7d": [6420, 184, 24860, 1092, 34.89],
  "30d": [21840, 694, 92440, 4206, 31.47],
  "90d": [58610, 1984, 271620, 12848, 29.54],
  all: [94280, 3206, 438900, 21164, 29.41],
};

const campaigns = [
  {
    id: "aug", title: "Atlas · 1–7 августа", dates: "01.08–07.08.2026", source: "telegram / paid", campaign: "atlas_aug_1_7", spend: 1740, wallets: 246, cycles: 61, incoming: 8920, receipts: null, cost: 28.52, status: "REQUIRES_REVIEW", tone: "red", users: "1 824 / 2 610", engaged: "1 592", cpw: "$7.07", time: "19 ч 40 мин",
    funnel: [["Sessions", 2610], ["Engaged", 1592], ["Wallet success", 301], ["Server-confirmed", 246], ["First cycle", 61]],
    mix: [["Lockup 30 · $100", 27, 2700, 44], ["Daily 200 · $100", 23, 2300, 38], ["Daily 200 · $10 000", 11, 3920, 18]],
    review: true,
  },
  {
    id: "brand", title: "Brand Search RU", dates: "always-on", source: "google / cpc", campaign: "atlas_brand_ru", spend: 3140, wallets: 318, cycles: 73, incoming: 9740, receipts: 514, cost: 43.01, status: "ACTIVE", tone: "green", users: "2 106 / 3 024", engaged: "2 010", cpw: "$9.87", time: "11 ч 12 мин",
    funnel: [["Sessions", 3024], ["Engaged", 2010], ["Wallet success", 392], ["Server-confirmed", 318], ["First cycle", 73]],
    mix: [["Lockup 30 · $100", 31, 3100, 42], ["Daily 200 · $100", 30, 2900, 41], ["Daily 200 · $10 000", 12, 3740, 17]],
  },
  {
    id: "wallet", title: "Wallet placements", dates: "25.07–05.08.2026", source: "partner_wallet / display", campaign: "wallet_q3", spend: 1540, wallets: 129, cycles: 38, incoming: 4860, receipts: 398, cost: 40.53, status: "ACTIVE", tone: "green", users: "1 084 / 1 460", engaged: "902", cpw: "$11.94", time: "8 ч 54 мин",
    funnel: [["Sessions", 1460], ["Engaged", 902], ["Wallet success", 164], ["Server-confirmed", 129], ["First cycle", 38]],
    mix: [["Lockup 30 · $100", 13, 1300, 34], ["Daily 200 · $100", 18, 1800, 47], ["Daily 200 · $10 000", 7, 1760, 19]],
  },
  {
    id: "unattributed", title: "Unattributed", dates: "обязательный bucket", source: "— / —", campaign: "no_reliable_journey", spend: null, wallets: 34, cycles: 12, incoming: 1340, receipts: 180, cost: null, status: "PARTIAL", tone: "orange", users: "Нет данных", engaged: "Нет данных", cpw: "N/A", time: "Нет данных",
    funnel: [["Sessions", 0], ["Engaged", 0], ["Wallet success", 0], ["Server-confirmed", 34], ["First cycle", 12]],
    mix: [["Lockup 30 · $100", 5, 500, 42], ["Daily 200 · $100", 4, 400, 33], ["Daily 200 · $10 000", 3, 440, 25]],
  },
];

const cohorts = [
  { window: "30 дней", dates: "Wallet cohort 01.05–31.05 · полное окно", incoming: 74200, outgoing: 38640, fee: 2106, head: 744, receipts: 2850, rate: "3,84%" },
  { window: "60 дней", dates: "Wallet cohort 01.04–30.04 · полное окно", incoming: 58900, outgoing: 43180, fee: 2218, head: 786, receipts: 3004, rate: "5,10%" },
  { window: "90 дней", dates: "Wallet cohort 01.03–31.03 · полное окно", incoming: 51500, outgoing: 55600, fee: 2500, head: 886, receipts: 3386, rate: "6,57%" },
];

const money = (value) => value == null ? "Нет данных" : `$${value.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`;
const count = (value) => value.toLocaleString("ru-RU");
function Tag({ tone = "green", children }) { return <span className={`af-tag af-tag-${tone}`}>{children}</span>; }
function Metric({ accent, label, tag, tone, value, note }) { return <article className="af-metric af-campaign-metric" style={{ "--metric-accent": accent }}><div className="af-metric-head"><span>{label}</span><Tag tone={tone}>{tag}</Tag></div><div className="af-metric-value">{value}</div><p>{note}</p></article>; }
function PanelHeader({ title, subtitle, action }) { return <div className="af-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }

function MethodDialog({ onClose }) {
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-campaign-method-title"><div className="af-modal-head"><div><span><BookOpenCheck size={17} /> Методика</span><h2 id="af-campaign-method-title">Экономика рекламных когорт</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div><dl><div><dt>Cost / first cycle</dt><dd>Фактический расход кампании / количество атрибутированных первых finalized циклов.</dd></div><div><dt>Company receipts</dt><dd>Фактически полученные Platform Fee + Head Account rewards внутри одного observation window.</dd></div><div><dt>Same-period</dt><dd>Расходы и поступления в одном календарном периоде. Этот разрез не показывает полную окупаемость молодой когорты.</dd></div><div><dt>Cohort return</dt><dd>Расход и результат одной wallet cohort за одинаковое окно 30, 60 или 90 дней.</dd></div><div><dt>Incrementality</dt><dd>Наблюдаемый attribution ROI не доказывает, что результат был вызван рекламой; для этого нужен отдельный эксперимент.</dd></div></dl><div className="af-modal-warning"><Info size={16} /><span>Кампании со статусом REQUIRES_REVIEW исключаются из финансовых итогов до утверждения формул и версии правил.</span></div></section></div>;
}

function downloadCsv(tab, visibleCampaigns) {
  const rows = tab === "campaigns" ? [["campaign", "source_medium", "spend", "wallets", "first_cycle", "incoming", "company_receipts", "cost_cycle", "status"], ...visibleCampaigns.map((item) => [item.title, item.source, item.spend ?? "", item.wallets, item.cycles, item.incoming, item.receipts ?? "excluded", item.cost ?? "", item.status])] : tab === "cohorts" ? [["window", "wallet_cohort", "incoming", "outgoing", "platform_fee", "head_income", "company_receipts", "receipts_principal"], ...cohorts.map((item) => [item.window, item.dates, item.incoming, item.outgoing, item.fee, item.head, item.receipts, item.rate])] : [["setting", "value"], ["model", "last non-direct"], ["window_days", 30], ["link_coverage", "87.6%"], ["unattributed_cycles", 47], ["version", "attribution-v1"]];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `atlas-campaigns-${tab}-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
}

export default function AdminFinanceCampaigns() {
  const [period, setPeriod] = useState("7d");
  const [tab, setTab] = useState("campaigns");
  const [selectedId, setSelectedId] = useState("aug");
  const [filter, setFilter] = useState("all");
  const [methodOpen, setMethodOpen] = useState(false);
  const reviewRef = useRef(null);
  const selected = campaigns.find((item) => item.id === selectedId) || campaigns[0];
  const visibleCampaigns = useMemo(() => filter === "all" ? campaigns : campaigns.filter((item) => item.status === filter), [filter]);
  const [spend, cycles, incoming, receipts, cpa] = periodData[period];
  const openReview = () => { setTab("campaigns"); setSelectedId("aug"); window.setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0); };

  return <div className="af-content af-campaign-page">
    <div className="af-campaign-toolbar"><div className="af-periods">{periods.map(([id, label]) => <button type="button" className={period === id ? "active" : ""} onClick={() => setPeriod(id)} key={id}>{label}</button>)}</div><div className="af-date-control"><span>Дата среза</span><strong>05.08.2026 · 09:20 UTC</strong></div><div className="af-page-actions"><button type="button" onClick={() => setMethodOpen(true)}><BookOpenCheck size={15} />Методика</button><button className="primary" type="button" onClick={() => downloadCsv(tab, visibleCampaigns)}><Download size={15} />Экспорт</button></div></div>

    <div className="af-campaign-review-notice"><AlertTriangle size={18} /><p><strong>Кампания 1–7 августа: requires_review.</strong> Три исходных расчёта противоречат арифметике или не имеют утверждённой версии правил. Кампания видна в аналитике, но исключена из финансового итога.</p><button type="button" onClick={openReview}>Открыть замечания</button></div>
    <div className="af-traffic-notice"><Info size={17} /><p><strong>Демонстрационный snapshot.</strong> ROI здесь описывает наблюдаемую атрибутированную экономику когорты и не доказывает инкрементальность рекламы.</p><button type="button" onClick={() => setTab("model")}>Модель атрибуции</button></div>
    <div className="af-traffic-tabs" role="tablist">{[["campaigns", "Кампании"], ["cohorts", "Когорты 30/60/90"], ["model", "Модель атрибуции"]].map(([id, label]) => <button type="button" role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)} key={id}>{label}</button>)}</div>

    {tab === "campaigns" ? <>
      <section className="af-metrics af-metrics-five"><Metric accent="#7a5bb8" label="Расход" tag="DEMO" tone="violet" value={money(spend)} note="Campaign registry fixture" /><Metric accent="#ff8716" label="Первый цикл" tag="DEMO" tone="orange" value={count(cycles)} note="Атрибутировано 172 · 12 unattributed" /><Metric accent="#4e76d0" label="Incoming Flow" tag="DEMO" tone="blue" value={money(incoming)} note="Illustrative principal" /><Metric accent="#239a77" label="Company receipts" tag="DEMO" value={money(receipts)} note="Fee $821 · Head $271" /><Metric accent="#cf534c" label="Blended cost / first cycle" tag="DEMO CPA" tone="red" value={money(cpa)} note="Расход / все первые циклы периода" /></section>
      <section className="af-panel"><PanelHeader title="Реестр кампаний" subtitle="Source / medium / campaign · строка открывает воронку и экономику когорты" action={<label className="af-campaign-filter"><span>Статус</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Все</option><option value="ACTIVE">Active</option><option value="REQUIRES_REVIEW">Requires review</option><option value="PARTIAL">Partial</option></select></label>} /><div className="af-table-scroll af-campaign-table"><table><thead><tr><th>Кампания</th><th>Source / medium</th><th className="number">Расход</th><th className="number">Wallets</th><th className="number">Первый цикл</th><th className="number">Incoming</th><th className="number">Company receipts</th><th className="number">Cost / cycle</th><th>Статус</th></tr></thead><tbody>{visibleCampaigns.map((item) => <tr className={selectedId === item.id ? "selected" : ""} tabIndex="0" onClick={() => setSelectedId(item.id)} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && setSelectedId(item.id)} key={item.id}><td><strong>{item.title}</strong><small>{item.dates}</small></td><td>{item.source}</td><td className="number">{money(item.spend)}</td><td className="number">{count(item.wallets)}</td><td className="number">{count(item.cycles)}</td><td className="number">{money(item.incoming)}</td><td className="number">{item.receipts == null ? "Не включено" : money(item.receipts)}</td><td className="number">{item.cost == null ? "N/A" : money(item.cost)}</td><td><Tag tone={item.tone}>{item.status}</Tag></td></tr>)}</tbody></table></div><div className="af-campaign-table-foot"><span>Атрибуция зафиксирована на уровне цикла · version attribution-v1</span><strong>{visibleCampaigns.length} из {campaigns.length}</strong></div></section>
      <CampaignDetail campaign={selected} reviewRef={reviewRef} />
    </> : null}

    {tab === "cohorts" ? <CohortView /> : null}
    {tab === "model" ? <AttributionView /> : null}
    {methodOpen ? <MethodDialog onClose={() => setMethodOpen(false)} /> : null}
  </div>;
}

function CampaignDetail({ campaign, reviewRef }) {
  const max = Math.max(...campaign.funnel.map((item) => item[1]), 1);
  return <section className="af-panel af-campaign-detail"><PanelHeader title={campaign.title} subtitle={`${campaign.source} / ${campaign.campaign} · observation window 30 дней`} action={<div className="af-campaign-detail-actions"><Tag tone={campaign.tone}>{campaign.status}</Tag><a className="af-small-link" href={`/admin/cycles?campaign=${campaign.id}`}>Открыть все циклы</a></div>} /><div className="af-campaign-mini-grid"><div><span>Users / sessions</span><strong>{campaign.users}</strong></div><div><span>Engaged sessions</span><strong>{campaign.engaged}</strong></div><div><span>Cost / wallet</span><strong>{campaign.cpw}</strong></div><div><span>Median time to cycle</span><strong>{campaign.time}</strong></div></div><div className="af-campaign-detail-grid"><div><PanelHeader title="Воронка кампании" subtitle="Одна когорта от journey до первого on-chain цикла" /><div className="af-campaign-funnel">{campaign.funnel.map(([label, value], index) => <div key={label}><span>{label}</span><b><i className={index < 2 ? "ga4" : index < 4 ? "atlas" : "chain"} style={{ width: `${Math.max(3, value / max * 100)}%` }} /></b><strong>{count(value)}</strong></div>)}</div></div><div><PanelHeader title="Cycle mix" subtitle="Количество и Principal по типам" /><div className="af-campaign-mix">{campaign.mix.map(([label, cycles, principal, share], index) => <div key={label}><span>{label}</span><b><i style={{ width: `${share}%`, background: ["#ff8716", "#f6b92f", "#4e76d0"][index] }} /></b><strong>{cycles} циклов</strong><em>{money(principal)}</em></div>)}</div></div></div>{campaign.review ? <div className="af-campaign-review-box" ref={reviewRef}><strong>Почему финансовый итог заблокирован</strong><ul><li>3.4 × 7 = 23.8, требуется правило округления;</li><li>Daily 200 / $100 / Executive: итог $72 не сходится с разбивкой $3.6 + $14.4 = $18;</li><li>для тарифа $10,000 не утверждено отличие расчёта на каждые $100;</li><li>не зафиксировано, являются ли значения планом, начислением или фактической выплатой;</li><li>нужна версия партнёрских правил периода.</li></ul></div> : null}</section>;
}

function CohortView() {
  return <><section className="af-metrics"><Metric accent="#239a77" label="Attributed Incoming" tag="DEMO 90D" tone="orange" value="$184 600" note="Когорты с полным 90d окном" /><Metric accent="#ff8716" label="Cohort Outgoing" tag="DEMO" tone="orange" value="$137 420" note="Только фактические выплаты" /><Metric accent="#4e76d0" label="Platform Fee" tag="DEMO" tone="orange" value="$6 824" note="Delta + Partner Reward" /><Metric accent="#7a5bb8" label="Head income" tag="DEMO" tone="orange" value="$2 416" note="Creation + claim" /></section><div className="af-cohort-notice"><Info size={17} /><p><strong>Сравнение только при одинаковом observation window.</strong> Молодую 30-дневную когорту нельзя сравнивать по 90-дневному доходу со зрелой когортой.</p></div><section className="af-panel"><PanelHeader title="Когортная экономика кампаний" subtitle="Company receipts = Platform Fee cash received + Head Account cash received" action={<Tag tone="blue">CAMPAIGN COHORT</Tag>} /><div className="af-campaign-cohort-grid">{cohorts.map((item) => <article key={item.window}><header><strong>{item.window}</strong><small>{item.dates}</small></header><dl><div><dt>Incoming Flow</dt><dd>{money(item.incoming)}</dd></div><div><dt>Cohort Outgoing</dt><dd>{money(item.outgoing)}</dd></div><div><dt>Platform Fee</dt><dd>{money(item.fee)}</dd></div><div><dt>Head income</dt><dd>{money(item.head)}</dd></div><div><dt>Company receipts</dt><dd>{money(item.receipts)}</dd></div><div><dt>Receipts / Principal</dt><dd className="good">{item.rate}</dd></div></dl></article>)}</div></section></>;
}

function AttributionView() {
  const nodes = [["1 · Web journey", "GA4 session + UTM", "Последний non-direct источник до первого подключения.", "#4e76d0"], ["2 · Linkage", "Pseudonymous journey ID", "Без wallet address и tx hash внутри GA4.", "#ff8716"], ["3 · Wallet cohort", "First server-confirmed", "Окно 30 дней, фиксируется один раз.", "#239a77"], ["4 · Cycle attribution", "On-chain cycle created", "Источник, модель и версия записываются в связь цикла.", "#503021"]];
  const definitions = [["Повторные циклы", "Наследуют источник первого server-confirmed wallet в пределах утверждённой версии модели; reattribution возможна только отдельным правилом и не переписывает историю."], ["Unattributed", "Обязательный bucket для циклов без достоверной journey-связки. Такие суммы не распределяются между известными кампаниями искусственно."], ["Campaign ROI", "Наблюдаемое соотношение подтверждённых company receipts и расходов выбранной когорты. Не является доказательством причинного рекламного эффекта."], ["Privacy и retention", "Псевдонимная linkage БД имеет отдельную retention policy. Полные адреса, tx hashes и другие прямые идентификаторы в GA4 запрещены."]];
  return <><section className="af-metrics"><Metric accent="#ff8716" label="Attribution model" tag="V1" tone="orange" value="Last non-direct" note="До первого confirmed wallet" /><Metric accent="#4e76d0" label="Attribution window" tag="FIXED" tone="blue" value={<>30 <small>дней</small></>} note="Версионная настройка" /><Metric accent="#239a77" label="Link coverage" tag="CURRENT" value="87,6%" note="Journey → wallet cohort" /><Metric accent="#cf534c" label="Unattributed cycles" tag="VISIBLE" tone="red" value="47" note="Не распределяются пропорционально" /></section><section className="af-panel"><PanelHeader title="Как фиксируется атрибуция" subtitle="Модель versioned и сохраняется на уровне каждого on-chain цикла" action={<Tag tone="blue">attribution-v1</Tag>} /><div className="af-attribution-flow">{nodes.map(([step, title, note, color]) => <article style={{ "--node-accent": color }} key={step}><span>{step}</span><strong>{title}</strong><small>{note}</small></article>)}</div><div className="af-attribution-definitions">{definitions.map(([term, definition]) => <div key={term}><strong>{term}</strong><span>{definition}</span></div>)}</div></section></>;
}
