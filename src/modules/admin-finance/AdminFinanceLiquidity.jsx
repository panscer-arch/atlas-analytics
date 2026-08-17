import { BookOpenCheck, Download, Info, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "./data/overviewData";
import { useAdminFinanceLiquidity } from "./api/useAdminFinanceApi";

const periods = [["7d","7 дней"],["30d","30 дней"],["90d","90 дней"],["date","Срез на дату"]];
const scopes = [
  { id: "payout", name: "Payout Contract", note: "Все token inflow/outflow контракта, включая внутренние treasury-переводы" },
  { id: "consolidated", name: "Atlas consolidated", note: "Внешние потоки группы; внутренние переводы исключены" },
  { id: "treasury", name: "Company treasury", note: "Поступления компании, расходы, резервы и treasury balance" },
];
const history = [
  { date: "29 июл", onChain: 189450, available: 188200, reserve: 25000, inflow: 8420, outflow: 9140 },
  { date: "30 июл", onChain: 188520, available: 187270, reserve: 25000, inflow: 9360, outflow: 8710 },
  { date: "31 июл", onChain: 184840, available: 183590, reserve: 25000, inflow: 8910, outflow: 9820 },
  { date: "1 авг", onChain: 179110, available: 177860, reserve: 25000, inflow: 10420, outflow: 9180 },
  { date: "2 авг", onChain: 174580, available: 173330, reserve: 25000, inflow: 9240, outflow: 10080 },
  { date: "3 авг", onChain: 169180, available: 167930, reserve: 25000, inflow: 8310, outflow: 9250 },
  { date: "4 авг", onChain: 165989, available: 164739, reserve: 25000, inflow: 9030, outflow: 8710 },
];
const stress = [
  { date: "05 авг", opening: 164739, inflow: 0, outflow: 3860, closing: 160879, reserve: 25000, status: "ПОКРЫТО", tone: "green" },
  { date: "06 авг", opening: 160879, inflow: 0, outflow: 2950, closing: 157929, reserve: 25000, status: "ПОКРЫТО", tone: "green" },
  { date: "07 авг", opening: 157929, inflow: 0, outflow: 4720, closing: 153209, reserve: 25000, status: "ПОКРЫТО", tone: "green" },
  { date: "08 авг", opening: 153209, inflow: 0, outflow: 2130, closing: 151079, reserve: 25000, status: "ПОКРЫТО", tone: "green" },
  { date: "09 авг", opening: 151079, inflow: 0, outflow: 3285, closing: 147794, reserve: 25000, status: "ПОКРЫТО", tone: "green" },
  { date: "10 авг", opening: 147794, inflow: 0, outflow: 2590, closing: 145204, reserve: 25000, status: "ПОКРЫТО", tone: "green" },
  { date: "11 авг", opening: 145204, inflow: 0, outflow: 12269, closing: 132935, reserve: 25000, status: "ПОКРЫТО", tone: "green" },
];

function Tag({ tone = "green", children }) { return <span className={`af-tag af-tag-${tone}`}>{children}</span>; }
function Metric({ accent, label, tag, tone, value, note, noteTone }) { return <article className="af-metric af-liquidity-metric" style={{ "--metric-accent": accent }}><div className="af-metric-head"><span>{label}</span><Tag tone={tone}>{tag}</Tag></div><div className="af-metric-value">{value}</div><p className={noteTone ? `is-${noteTone}` : ""}>{note}</p></article>; }
function PanelHeader({ title, subtitle, action }) { return <div className="af-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }
function LiquidityTooltip({ active, payload, label }) { if (!active || !payload?.length) return null; return <div className="af-chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.dataKey}>{item.name}: {formatMoney(item.value)}</span>)}</div>; }

function LiquidityDialog({ mode, onClose }) {
  const decisions = mode === "decisions";
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-liquidity-dialog-title"><div className="af-modal-head"><div><span>{decisions ? <Info size={17} /> : <BookOpenCheck size={17} />} {decisions ? "Gate 0" : "Методика"}</span><h2 id="af-liquidity-dialog-title">{decisions ? "Открытые решения владельца" : "Определение ликвидности"}</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div>{decisions ? <dl><div><dt>Controlled addresses</dt><dd>Утвердить полный реестр адресов Payout Contract и treasury.</dd></div><div><dt>Opening balance</dt><dd>Зафиксировать cutover block и сверить начальный остаток с ledger.</dd></div><div><dt>Restricted policy</dt><dd>Определить суммы, которые нельзя использовать для выплат.</dd></div><div><dt>Reserve policy</dt><dd>Утвердить минимальный обязательный резерв и полномочия изменения.</dd></div><div><dt>LP pricing</dt><dd>Выбрать oracle, haircut и правила признания LP отдельно от cash.</dd></div></dl> : <dl><div><dt>Closing ledger</dt><dd>Opening balance + внешние поступления − внешние выплаты − внутренние переводы ± корректировки.</dd></div><div><dt>Available Contract Balance</dt><dd>Канонический on-chain balance минус Restricted amount.</dd></div><div><dt>Spendable Above Reserve</dt><dd>Available Contract Balance минус Required Reserve, не ниже нуля.</dd></div><div><dt>Cash ladder</dt><dd>Каждый следующий день открывается остатком предыдущего; reserve используется как порог и не вычитается повторно.</dd></div><div><dt>LP position</dt><dd>Показывается отдельно и не закрывает cash deficit автоматически.</dd></div></dl>}<p className="af-modal-warning"><Info size={16} /> Все значения на экране являются DEMO SNAPSHOT до утверждения источников, finality depth и reconciliation gate.</p></section></div>;
}

function formatApiMoney(value) {
  if (!value || value.available === false) return "N/A";
  const raw = BigInt(value.amountRaw || "0");
  const negative = raw < 0n;
  const decimals = Number(value.decimals || 0);
  const digits = (negative ? -raw : raw).toString().padStart(decimals + 1, "0");
  const whole = decimals ? digits.slice(0, -decimals) || "0" : digits;
  const fraction = decimals ? digits.slice(-decimals).replace(/0+$/, "").slice(0, 6) : "";
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}${fraction ? `.${fraction}` : ""}`;
}

function ApiLiquidityState({ request }) {
  const title = request.status === "loading" ? "Получаем подтверждённый срез" : request.status === "auth-required" ? "Нужна админ-сессия" : "Источник ликвидности недоступен";
  return <div className="af-content"><div className="af-data-unavailable"><Info size={22}/><strong>{title}</strong><p>Демонстрационные остатки не подставляются. Повторите запрос после восстановления проверяемого источника.</p>{request.status !== "loading" ? <button className="af-small-link" type="button" onClick={request.reload}>Повторить</button> : null}</div></div>;
}

function ApiLiquidity({ request }) {
  if (request.status !== "ready") return <ApiLiquidityState request={request}/>;
  const { data, meta } = request.data;
  const summary = data.summary;
  const checkpoint = data.checkpoint || {
    canonical: Boolean(summary.canonicalClosing),
    asOfBlockNumber: meta.asOfBlockNumber,
    observedAt: meta.generatedAt,
    verification: meta.sourceStatus,
  };
  const reportedClosing = summary.reportedClosing || summary.calculatedClosing;
  const balances = Array.isArray(data.balances) ? data.balances : [];
  const partialReasons = Array.isArray(meta.partialReasons) ? meta.partialReasons : [];
  return <div className="af-content">
    <div className="af-quality-notice is-partial"><span><Info size={14}/></span><p><strong>Внутренняя альфа · частичный срез ликвидности.</strong> Текущий остаток имеет собственное время наблюдения; без архивного RPC его нельзя связать с подтверждённым блоком потоков.</p><b>{checkpoint.canonical ? `BLOCK ${checkpoint.asOfBlockNumber.toLocaleString("en-US")}` : "BLOCK N/A"} · {checkpoint.verification?.toUpperCase().replaceAll("_", " ")}</b></div>
    <section className="af-liquidity-metrics"><Metric accent="#503021" label="Текущий остаток источника" tag={checkpoint.canonical?"ПОДТВЕРЖДЁН":"НЕ ПРОВЕРЕН"} tone={checkpoint.canonical?"green":"orange"} value={formatApiMoney(reportedClosing)} note={`Наблюдение ${checkpoint.observedAt || "N/A"}`}/><Metric accent="#4e76d0" label="Подтверждённый остаток" tag={checkpoint.canonical?"API":"НЕТ ДАННЫХ"} tone={checkpoint.canonical?"green":"orange"} value={formatApiMoney(summary.canonicalClosing)} note="Требует исторический balanceOf на том же блоке"/><Metric accent="#239a77" label="Остаток на начало" tag={summary.openingBalance ? "API" : "НЕТ ДАННЫХ"} tone={summary.openingBalance ? "green" : "orange"} value={formatApiMoney(summary.openingBalance)} note={summary.openingBalance ? "Получен из источника" : "Начальный остаток не утверждён"}/><Metric accent="#7a5bb8" label="Зарезервировано" tag="НЕ ЗАДАНО" tone="orange" value="N/A" note="Политика владельца не утверждена"/><Metric accent="#cf534c" label="Обязательный резерв" tag="НЕ ЗАДАНО" tone="orange" value="N/A" note="Порог ликвидности не утверждён"/><Metric accent="#ff8716" label="Расхождение" tag={summary.residual ? "API" : "НЕ СВЕРЕНО"} tone={summary.residual ? "orange" : "red"} value={formatApiMoney(summary.residual)} note={summary.residual ? "Получено из результата сверки" : "Нельзя вычислить без независимого финансового реестра"}/></section>
    <section className="af-panel af-alpha-balances"><PanelHeader title="Остатки по контролируемым контрактам" subtitle={`Наблюдение ${new Date(checkpoint.observedAt || meta.generatedAt).toLocaleString("ru-RU", { timeZone: "UTC" })} UTC · ${checkpoint.verification?.replaceAll("_", " ")}`} action={<Tag tone="orange">ЧАСТИЧНО</Tag>}/>{balances.length ? <div className="af-table-scroll"><table><thead><tr><th>Контракт</th><th>Адрес</th><th className="number">Остаток USDT</th></tr></thead><tbody>{balances.map((row)=><tr key={row.contractId}><td><strong>{row.label}</strong><small>{row.contractId}</small></td><td><code>{row.maskedAddress}</code></td><td className="number">{formatApiMoney(row.usdt)}</td></tr>)}</tbody></table></div> : <div className="af-data-unavailable"><Info size={22}/><strong>Разбивка по контрактам не передана</strong><p>Сводный остаток доступен, но источник не вернул отдельные контролируемые адреса.</p></div>}</section>
    <section className="af-panel"><PanelHeader title="Что блокирует полную сверку остатков" subtitle="Пробелы источника остаются видимыми до закрытия Gate 0"/><div className="af-method-policy">{partialReasons.length ? partialReasons.map((reason)=><div key={reason}><span>Пробел источника</span><strong>{reason.replaceAll("_", " ")}</strong></div>) : <div><span>Пробел источника</span><strong>Не утверждены обязательный резерв и разбивка по контролируемым адресам</strong></div>}</div></section>
  </div>;
}

export default function AdminFinanceLiquidity() {
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 30);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);
  const request = useAdminFinanceLiquidity({ ...range, perimeter: "payout_contract", granularity: "day" });
  return __ADMIN_FINANCE_API_ONLY__ || request.apiEnabled ? <ApiLiquidity request={request}/> : <StaticAdminFinanceLiquidity/>;
}

function StaticAdminFinanceLiquidity() {
  const [period, setPeriod] = useState("7d");
  const [scope, setScope] = useState("payout");
  const scenario = "stress";
  const [dialog, setDialog] = useState("");
  const ladder = stress;
  const firstGap = useMemo(() => ladder.find((row) => row.closing < row.reserve), [ladder]);
  function exportCsv() { const rows = [["date_utc","opening","confirmed_in","gross_out","closing","reserve","status"],...ladder.map((row)=>[row.date,row.opening,row.inflow,row.outflow,row.closing,row.reserve,row.status])]; const blob=new Blob([rows.map((row)=>row.join(",")).join("\n")],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`atlas-liquidity-${scenario}.csv`; a.click(); URL.revokeObjectURL(url); }
  return <div className="af-content">
    <div className="af-liquidity-toolbar"><div className="af-periods" role="tablist">{periods.map(([id,label])=><button role="tab" aria-selected={period===id} className={period===id?"active":""} type="button" onClick={()=>setPeriod(id)} key={id}>{label}</button>)}</div><div className="af-date-control"><span>Демонстрационный срез</span><strong>04.08.2026 · 16:00 UTC</strong></div><div className="af-page-actions"><button type="button" onClick={()=>setDialog("method")}><BookOpenCheck size={15}/>Методика</button><button className="primary af-export-action" type="button" onClick={exportCsv}><Download size={15}/>Экспорт</button></div></div>
    <div className="af-liquidity-scopes">{scopes.map((item)=><button className={scope===item.id?"active":""} type="button" onClick={()=>setScope(item.id)} key={item.id}><strong>{item.name}</strong><span>{item.note}</span></button>)}</div>
    <div className="af-head-notice"><Info size={19}/><p><strong>Демонстрационная модель.</strong> Числа иллюстрируют структуру экрана и не подтверждают фактическое состояние контрактов. Opening balance, controlled addresses, restricted policy и reserve policy требуют утверждения владельцем.</p><button className="af-small-link" type="button" onClick={()=>setDialog("decisions")}>Открытые решения</button></div>
    <section className="af-liquidity-metrics"><Metric accent="#503021" label="Opening balance" tag="DEMO" tone="orange" value="$196,400" note="На начало выбранного периода"/><Metric accent="#4e76d0" label="Closing ledger" tag="DEMO" tone="orange" value="$165,989" note="После cash movements"/><Metric accent="#239a77" label="Available Contract Balance" tag="DEMO" tone="orange" value="$164,739" note="On-chain минус restricted" noteTone="good"/><Metric accent="#7a5bb8" label="Restricted amount" tag="POLICY DRAFT" tone="orange" value="$1,250" note="Нельзя использовать для выплат"/><Metric accent="#cf534c" label="Required reserve" tag="POLICY DRAFT" tone="orange" value="$25,000" note="Порог пока не утверждён"/><Metric accent="#ff8716" label="Spendable Above Reserve" tag="DEMO" tone="orange" value="$139,739" note="Available balance минус reserve"/></section>
    <section className="af-panel af-roll-forward"><PanelHeader title="Balance roll-forward" subtitle={`${scopes.find((item)=>item.id===scope)?.name} · каждый элемент раскрывается до движений и транзакций`} action={<Tag tone="orange">DEMO · NOT RECONCILED</Tag>}/><div className="af-roll-forward-track">{[["Opening",196400,""],["External inflow",18420,"positive"],["External outflow",-16890,""],["Internal",-31941,""],["Adjustments",0,""],["Closing ledger",165989,"blue"],["On-chain",165989,"positive"]].map(([label,value,tone])=><div className={tone} key={label}><span>{label}</span><strong>{value<0?"−":value>0&&label==="External inflow"?"+":""}{formatMoney(value)}</strong></div>)}</div></section>
    <div className="af-liquidity-main-grid"><section className="af-panel"><PanelHeader title="Cash balance и обязательный резерв" subtitle="Демонстрационная история; LP Market Value в линию не включается" action={<div className="af-chart-legend"><span><i style={{background:"#239a77"}}/>Available</span><span><i style={{background:"#4e76d0"}}/>On-chain</span><span><i style={{background:"#cf534c"}}/>Reserve</span></div>}/><div className="af-liquidity-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={history} margin={{top:12,right:12,bottom:6,left:2}}><CartesianGrid stroke="#eadfd5" vertical={false}/><XAxis dataKey="date" tick={{fontSize:8,fill:"#79675e"}} axisLine={false} tickLine={false}/><YAxis tickFormatter={(value)=>`$${value/1000}k`} tick={{fontSize:8,fill:"#79675e"}} axisLine={false} tickLine={false}/><Tooltip content={<LiquidityTooltip/>}/><Bar isAnimationActive={false} dataKey="inflow" name="Inflow" fill="#86d5bb" radius={[2,2,0,0]}/><Bar isAnimationActive={false} dataKey="outflow" name="Outflow" fill="#ffb28d" radius={[2,2,0,0]}/><Line isAnimationActive={false} type="monotone" dataKey="onChain" name="On-chain" stroke="#4e76d0" strokeWidth={2} dot={false}/><Line isAnimationActive={false} type="monotone" dataKey="available" name="Available" stroke="#239a77" strokeWidth={2.5} dot={false}/><ReferenceLine y={25000} stroke="#cf534c" strokeDasharray="5 4"/></ComposedChart></ResponsiveContainer></div></section>
      <section className="af-panel"><PanelHeader title="Использование on-chain balance" subtitle="Reserve применяется один раз как обязательный порог" action={<Tag tone="orange">POLICY DRAFT</Tag>}/><div className="af-liquidity-usage">{[["Restricted",1250,1,"#7a5bb8"],["Required Reserve",25000,15,"#cf534c"],["Spendable Above Reserve",139739,84,"#239a77"]].map(([label,value,width,color])=><div key={label}><span>{label}</span><div><i style={{width:`${width}%`,background:color}}/></div><strong>{formatMoney(value)}</strong></div>)}<p><strong>Формулы:</strong><br/>Available Contract Balance = on-chain − restricted.<br/>Spendable Above Reserve = max(0, available − required reserve).</p><section><div><span>BNB gas reserve</span><strong>0.84 BNB</strong></div><div><span>Оценка до exhaustion</span><strong>18 дней</strong></div></section></div></section></div>
    <div className="af-liquidity-lower-grid"><section className="af-panel af-cash-ladder"><PanelHeader title="Cash ladder · следующие 7 дней" subtitle="Последовательное списание: один баланс не используется повторно для каждого bucket" action={<Tag tone="orange">STRESS · DEMO</Tag>}/><div className="af-table-scroll"><table><thead><tr><th>Дата UTC</th><th className="number">Opening</th><th className="number">Confirmed in</th><th className="number">Gross out</th><th className="number">Closing</th><th className="number">Reserve</th><th>Статус</th></tr></thead><tbody>{ladder.map((row)=><tr key={row.date}><td><strong>{row.date}</strong></td><td className="number">{formatMoney(row.opening)}</td><td className="number">{formatMoney(row.inflow)}</td><td className="number is-risk">−{formatMoney(row.outflow)}</td><td className={`number ${row.closing<row.reserve?"is-risk":""}`}>{formatMoney(row.closing)}</td><td className="number">{formatMoney(row.reserve)}</td><td><Tag tone={row.tone}>{row.status}</Tag></td></tr>)}</tbody></table></div><div className="af-ladder-foot"><span>Demo · неподтвержденный future inflow не включён</span><strong>Первый reserve breach: {firstGap?.date || "нет"}</strong></div></section>
      <section className="af-panel"><PanelHeader title="LP position · отдельно от cash" subtitle="Источник цены, haircut и время выхода обязательны" action={<Tag tone="blue">PRICE DEMO</Tag>}/><div className="af-lp-grid">{[["Market value","$42,600","Oracle demo · 16:00 UTC"],["Liquidation value","$36,210","После haircut 15%"],["Uncollected fees","$384","Не включены в contract cash"],["Позиция","In range","USDT / BNB"],["Estimated exit","2.4 дня","При текущей глубине"],["Price impact","1.8%","Сценарная оценка"]].map(([label,value,note])=><div key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div><div className="af-lp-warning"><Info size={18}/><p>LP Market Value и Liquidation Value не суммируются со spendable liquidity и не закрывают reserve breach автоматически.</p></div></section></div>
    <p className="af-liquidity-footnote">Demo snapshot · 04.08.2026. Для production необходимы утверждённые controlled addresses, opening balances/cutover, finality depth, restricted policy, reserve policy и источник LP price/haircut.</p>
    {dialog?<LiquidityDialog mode={dialog} onClose={()=>setDialog("")}/>:null}
  </div>;
}
