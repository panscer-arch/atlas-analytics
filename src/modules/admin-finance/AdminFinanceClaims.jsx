import { AlertCircle, BookOpenCheck, CalendarDays, Download, Info, RefreshCw, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { claimRows, formatMoney } from "./data/overviewData";
import { useAdminFinanceClaimDetail, useAdminFinanceClaims } from "./api/useAdminFinanceApi";
import {
  adminFinanceApiEnabled,
  resolveAdminFinanceDefaultAsOfDate,
} from "./api/adminFinanceConfig";

const statusTabs = [
  ["all", "Все", 186], ["eligible", "Доступно к запросу", 42], ["requested", "Запрошено", 18], ["pending", "В обработке", 9],
  ["failed", "Ошибка", 3], ["paid", "Выплачено", 112], ["reversed", "Отменено", 2],
];
const statusTone = { eligible: "orange", requested: "blue", pending: "violet", failed: "red", paid: "green", reversed: "red", expired: "brown" };
const statusLabels = {
  eligible: "Доступно к запросу",
  requested: "Запрошено",
  pending: "В обработке",
  failed: "Ошибка",
  paid: "Выплачено",
  reversed: "Отменено",
  expired: "Истекло",
};
const componentLabels = {
  principal: "Возврат Principal",
  delta: "Gross Delta",
  partner_reward_creation: "Партнёрское вознаграждение при создании",
  partner_reward_streamed: "Партнёрское вознаграждение по графику",
};

function claimRange(asOfDate) {
  const to = new Date(`${asOfDate}T00:00:00.000Z`);
  to.setUTCDate(to.getUTCDate() + 1);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 7);
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
  const decimal = atomicDecimal(money);
  const negative = decimal.startsWith("-");
  const unsigned = negative ? decimal.slice(1) : decimal;
  const [whole, fraction] = unsigned.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}${fraction ? `.${fraction}` : ""}`;
}

function sumMoneyValues(values, currency = "USDT") {
  const sample = values.find(Boolean) || { decimals: 6, symbol: currency };
  return {
    ...sample,
    amountRaw: values.reduce((sum, value) => sum + BigInt(value?.amountRaw || "0"), 0n).toString(),
    displayAmount: undefined,
  };
}

function claimTotal(claim, key = "gross") {
  return sumMoneyValues(claim.components.map((component) => component[key]));
}

function claimTypeTotal(claim, types, key = "gross") {
  return sumMoneyValues(claim.components.filter((component) => types.includes(component.type)).map((component) => component[key]));
}

function shortId(value) {
  return value ? `${value.slice(0, 8)}…${value.slice(-4)}` : "N/A";
}

function formatUtc(value) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(value));
}

function Tag({ children, tone = "green" }) { return <span className={`af-tag af-tag-${tone}`}>{children}</span>; }
function Metric({ accent, label, tag, tagTone, value, unit, note, noteTone }) { return <article className="af-metric" style={{ "--metric-accent": accent }}><div className="af-metric-head"><span>{label}</span><Tag tone={tagTone}>{tag}</Tag></div><div className="af-metric-value">{value} {unit ? <small>{unit}</small> : null}</div><p className={noteTone ? `is-${noteTone}` : ""}>{note}</p></article>; }
function PanelHeader({ title, subtitle, action }) { return <div className="af-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }

function ClaimsMethodology({ onClose }) {
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-claims-method-title"><div className="af-modal-head"><div><span><BookOpenCheck size={17} /> Методика</span><h2 id="af-claims-method-title">Состояния заявки и признание выплаты</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div><dl><div><dt>Доступно к запросу</dt><dd>Обязательство уже возникло, но пользователь ещё не запросил выплату.</dd></div><div><dt>Запрошено</dt><dd>Пользователь отправил запрос; транзакция ещё не подтверждена.</dd></div><div><dt>В обработке</dt><dd>Транзакция создана или отправлена и ожидает финального результата.</dd></div><div><dt>Выплачено</dt><dd>Выплата признаётся только после подтверждённого завершения транзакции.</dd></div><div><dt>Ошибка</dt><dd>Сумма остаётся обязательством до повторной попытки, подтверждённой отмены или истечения срока.</dd></div></dl><p className="af-modal-warning"><Info size={16} /> Доступная к запросу сумма не равна ожидаемой фактической выплате: для прогноза нужна проверенная история сроков обработки заявок.</p></section></div>;
}

function ClaimDetail({ claim }) {
  if (!claim) return <aside className="af-panel af-claim-detail af-claim-empty"><div><strong>Выберите claim</strong><p>Откроются состав gross need, fee внутри gross, возраст, SLA и цепочка до транзакции.</p></div></aside>;
  const fee = (claim.delta + claim.partner) * 0.1;
  return <aside className="af-panel af-claim-detail"><PanelHeader title={claim.id} subtitle={claim.wallet} action={<Tag tone={statusTone[claim.status]}>{claim.status.toUpperCase()}</Tag>} /><div className="af-claim-detail-body"><dl><div><dt>Цикл</dt><dd>{claim.cycle}</dd></div><div><dt>Возраст / SLA</dt><dd className={claim.age > 24 && claim.sla !== "closed" ? "is-risk" : ""}>{claim.age} ч / {claim.sla}</dd></div><div><dt>Principal</dt><dd>{formatMoney(claim.principal)}</dd></div><div><dt>Gross Delta</dt><dd>{formatMoney(claim.delta)}</dd></div><div><dt>Gross Partner Reward</dt><dd>{formatMoney(claim.partner)}</dd></div><div><dt>Gross need</dt><dd><strong>{formatMoney(claim.gross)}</strong></dd></div><div><dt>Platform Fee внутри gross</dt><dd>{formatMoney(fee)}</dd></div><div><dt>Expected cash-out</dt><dd>{claim.expected === null ? "N/A" : formatMoney(claim.expected)}</dd></div><div><dt>Tx / block</dt><dd className="af-lineage">{claim.tx}</dd></div></dl><div className="af-method-note">Claim ID, cycle ID, wallet и tx hash должны приходить из канонического Admin API. Интерфейс не рассчитывает статус транзакции самостоятельно.</div></div></aside>;
}

function StaticClaims() {
  const [status, setStatus] = useState("all"); const [query, setQuery] = useState(""); const [cycle, setCycle] = useState("all"); const [age, setAge] = useState("all"); const [selectedId, setSelectedId] = useState(""); const [methodologyOpen, setMethodologyOpen] = useState(false); const [updatedAt, setUpdatedAt] = useState("14:40");
  const filtered = useMemo(() => claimRows.filter((row) => (status === "all" || row.status === status) && (cycle === "all" || row.cycle === cycle) && (age === "all" || age === "sla" && row.age > 24 || age === "fresh" && row.age <= 24) && (!query.trim() || `${row.id} ${row.wallet} ${row.cycle} ${row.tx}`.toLowerCase().includes(query.trim().toLowerCase()))), [status, cycle, age, query]);
  const selected = claimRows.find((row) => row.id === selectedId);
  function reset() { setQuery(""); setCycle("all"); setAge("all"); }
  function exportCsv() { const rows = [["claim_id","wallet","status","cycle","age_hours","sla","gross_need","expected","tx"], ...filtered.map((row) => [row.id,row.wallet,row.status,row.cycle,row.age,row.sla,row.gross,row.expected ?? "N/A",row.tx])]; const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "atlas-claims-register.csv"; anchor.click(); URL.revokeObjectURL(url); }
  function refresh() { setUpdatedAt(new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })); }

  return <div className="af-content af-claims-content">
    <div className="af-claims-toolbar"><div className="af-claim-tabs" role="tablist">{statusTabs.map(([id,label,count]) => <button role="tab" aria-selected={status === id} className={status === id ? "active" : ""} type="button" onClick={() => setStatus(id)} key={id}>{label} · {count}</button>)}</div><span>Срез <strong>04.08.2026 · {updatedAt}</strong></span><div className="af-page-actions"><button className="af-export-action" type="button" onClick={exportCsv}><Download size={15} />Экспорт</button><button className="primary" type="button" onClick={refresh}><RefreshCw size={15} />Обновить</button></div></div>
    <div className="af-claims-info"><Info size={20} /><p><strong>Maximum Eligible Exposure не равно ожидаемому cash-out.</strong> Eligible показывает максимально доступное к запросу обязательство, Expected учитывает прогноз фактического времени claim. Выплата считается только после paid/settled либо подтвержденного reversal/expiry.</p><button type="button" onClick={() => setMethodologyOpen(true)}>Методика</button></div>
    <section className="af-metrics af-metrics-five"><Metric accent="#ff8716" label="Maximum Eligible" tag="EXPOSURE" tagTone="green" value="$28,940" note="42 обязательства доступны к claim" /><Metric accent="#7a5bb8" label="Expected cash-out · Base" tag="N/A" tagTone="violet" value="N/A" note="Недостаточно истории и нет backtest" /><Metric accent="#4e76d0" label="Pending claims" tag="9" tagTone="blue" value="$7,860" note="Старше SLA: 2 на $1,240" /><Metric accent="#cf534c" label="Failed" tag="ACTION" tagTone="red" value="3" note="$940 · требуется классификация retry" noteTone="risk" /><Metric accent="#239a77" label="Claim delay · median" tag="DEMO" tagTone="green" value="9.4" unit="часа" note="P90 31.6 ч · выборка 112" /></section>

    <div className="af-claims-layout"><section className="af-panel"><PanelHeader title="Реестр claims" subtitle="Нажмите строку для состава суммы и on-chain lineage" action={<Tag tone="blue">7 демо-записей</Tag>} /><div className="af-claim-filters"><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Claim ID, wallet, cycle или tx hash" /></label><select value={cycle} onChange={(event) => setCycle(event.target.value)}><option value="all">Все циклы</option>{[...new Set(claimRows.map((row) => row.cycle))].map((name) => <option key={name}>{name}</option>)}</select><select value={age} onChange={(event) => setAge(event.target.value)}><option value="all">Любой возраст</option><option value="fresh">В SLA</option><option value="sla">Старше SLA</option></select><button type="button" onClick={reset}>Сбросить</button></div><div className="af-claim-totals"><div><span>Principal</span><strong>$12,400</strong></div><div><span>Gross Delta</span><strong>$5,820</strong></div><div><span>Gross Partner Reward</span><strong>$2,140</strong></div></div><div className="af-table-scroll"><table className="af-claims-table"><thead><tr><th>Claim / участник</th><th>Состояние</th><th>Цикл</th><th>Возраст / SLA</th><th className="number">Gross need</th><th className="number">Expected</th><th>Tx / block</th></tr></thead><tbody>{filtered.map((row) => <tr className={selectedId === row.id ? "selected" : ""} onClick={() => setSelectedId(row.id)} key={row.id}><td><strong>{row.id}</strong><small>{row.wallet}</small></td><td><Tag tone={statusTone[row.status]}>{row.status.toUpperCase()}</Tag></td><td>{row.cycle}</td><td className={row.age > 24 && row.sla !== "closed" ? "is-risk" : ""}>{row.age} ч / {row.sla}</td><td className="number">{formatMoney(row.gross)}</td><td className="number">{row.expected === null ? "N/A" : formatMoney(row.expected)}</td><td className="af-lineage">{row.tx}</td></tr>)}</tbody></table></div><div className="af-claims-foot">Eligible → Requested → Pending → Paid. Failed остается обязательством до успешного retry, подтвержденного reversal или expiry.</div></section><ClaimDetail claim={selected} /></div>
    {methodologyOpen ? <ClaimsMethodology onClose={() => setMethodologyOpen(false)} /> : null}
  </div>;
}

function ClaimsRequestState({ request }) {
  const title = request.status === "loading"
    ? "Загрузка заявок"
    : request.status === "auth-required"
      ? "Нужна админ-сессия"
      : "Реестр заявок недоступен";
  const copy = request.status === "loading"
    ? "Получаем обязательства и состав выплат из Admin API."
    : request.status === "auth-required"
      ? "API вернул 401. Макетные суммы не подставлены."
      : "Запрос не выполнен. Последние demo-значения намеренно скрыты.";
  return <section className="af-api-boundary" aria-live="polite"><AlertCircle size={24} /><span>ЖИЗНЕННЫЙ ЦИКЛ ЗАЯВКИ · ДАННЫЕ НЕ ПОДМЕНЯЮТСЯ</span><h2>{title}</h2><p>{copy}</p>{request.status !== "loading" ? <button type="button" onClick={request.reload}>Повторить запрос</button> : null}<a href="/admin/methodology#gate">Проверить источники и Gate 0</a></section>;
}

function ApiClaimDetail({ request }) {
  if (!request || request.status === "loading") return <aside className="af-panel af-claim-detail af-claim-empty"><div><strong>Загрузка заявки</strong><p>Получаем состав выплаты и время изменения статусов.</p></div></aside>;
  if (request.status === "ready" && !request.data) return <aside className="af-panel af-claim-detail af-claim-empty"><div><strong>В выбранном срезе нет заявок</strong><p>Карточка появится после получения первой записи из канонического источника.</p></div></aside>;
  if (request.status !== "ready") return <aside className="af-panel af-claim-detail af-claim-empty"><div><strong>Заявка недоступна</strong><p>Детали не подменяются данными из строки реестра.</p><button className="af-small-link" type="button" onClick={request.reload}>Повторить</button></div></aside>;
  const claim = request.data.data;
  const grossNeed = claimTotal(claim);
  const totalFee = sumMoneyValues(claim.components.map((component) => component.platformFee));
  const transferIds = claim.components.flatMap((component) => component.transferIds);
  return <aside className="af-panel af-claim-detail"><PanelHeader title={shortId(claim.id)} subtitle={`Участник ${shortId(claim.participantId)}`} action={<Tag tone={statusTone[claim.status]}>{statusLabels[claim.status] || claim.status}</Tag>} /><div className="af-claim-detail-body"><dl><div><dt>ID заявки</dt><dd className="af-lineage">{shortId(claim.id)}</dd></div><div><dt>ID цикла</dt><dd className="af-lineage">{shortId(claim.cycleId)}</dd></div><div><dt>Доступно с · UTC</dt><dd>{formatUtc(claim.eligibleAt)}</dd></div><div><dt>Запрошено · UTC</dt><dd>{formatUtc(claim.requestedAt)}</dd></div><div><dt>Завершено · UTC</dt><dd>{formatUtc(claim.settledAt)}</dd></div><div><dt>Общая сумма обязательства</dt><dd><strong>{formatWireMoney(grossNeed)}</strong></dd></div><div><dt>Platform Fee внутри Gross</dt><dd>{formatWireMoney(totalFee)}</dd></div><div><dt>Код ошибки или завершения</dt><dd className={claim.failureCode ? "is-risk" : ""}>{claim.failureCode || "Нет"}</dd></div></dl>{claim.components.map((component) => <div className="af-claim-component" key={component.type}><div><strong>{componentLabels[component.type]}</strong><span>{component.transferIds.length ? `${component.transferIds.length} подтверждений перевода` : "Подтверждение перевода отсутствует"}</span></div><dl><div><dt>Gross</dt><dd>{formatWireMoney(component.gross)}</dd></div><div><dt>Net</dt><dd>{formatWireMoney(component.net)}</dd></div><div><dt>Fee</dt><dd>{formatWireMoney(component.platformFee)}</dd></div></dl></div>)}<div className="af-method-note">{transferIds.length ? `Связаны ID переводов: ${transferIds.map(shortId).join(", ")}.` : "Полная цепочка переводов в тестовом источнике отсутствует. Интерфейс не дополняет статус предположениями."}</div></div></aside>;
}

export default function AdminFinanceClaims() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState("all");
  const [age, setAge] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [asOfDate, setAsOfDate] = useState(() => resolveAdminFinanceDefaultAsOfDate({
    apiEnabled: adminFinanceApiEnabled,
    demoDate: "2026-08-05",
  }));
  const range = useMemo(() => claimRange(asOfDate), [asOfDate]);
  const claimsRequest = useAdminFinanceClaims(range);
  const sourceRows = claimsRequest.status === "ready" ? claimsRequest.data.data : [];
  const firstVisibleId = sourceRows.find((row) => status === "all" || row.status === status)?.id || sourceRows[0]?.id || "";
  const effectiveSelectedId = selectedId && sourceRows.some((row) => row.id === selectedId) ? selectedId : firstVisibleId;
  const detailRequest = useAdminFinanceClaimDetail(effectiveSelectedId);

  if (!__ADMIN_FINANCE_API_ONLY__ && !claimsRequest.apiEnabled) return <StaticClaims />;
  if (claimsRequest.status !== "ready") return <ClaimsRequestState request={claimsRequest} />;

  const meta = claimsRequest.data.meta;
  const snapshotAt = Date.parse(`${asOfDate}T23:59:59.000Z`);
  const rows = [...sourceRows].sort((a, b) => Date.parse(b.eligibleAt) - Date.parse(a.eligibleAt)).map((row) => ({
    ...row,
    ageHours: Math.max(0, Math.floor((snapshotAt - Date.parse(row.eligibleAt)) / 3600000)),
    grossNeed: claimTotal(row),
    platformFee: sumMoneyValues(row.components.map((component) => component.platformFee)),
    transferCount: row.components.reduce((sum, component) => sum + component.transferIds.length, 0),
  }));
  const statuses = ["eligible", "requested", "pending", "failed", "paid", "reversed", "expired"];
  const dynamicTabs = [["all", "Все", rows.length], ...statuses.map((item) => [item, statusLabels[item], rows.filter((row) => row.status === item).length])];
  const filtered = rows.filter((row) => {
    const matchesStatus = status === "all" || row.status === status;
    const matchesCycle = cycle === "all" || row.cycleId === cycle;
    const matchesAge = age === "all" || age === "sla" && row.ageHours > 24 && !["paid", "reversed", "expired"].includes(row.status) || age === "fresh" && row.ageHours <= 24;
    const haystack = `${row.id} ${row.participantId} ${row.cycleId} ${row.status} ${row.failureCode || ""}`.toLowerCase();
    return matchesStatus && matchesCycle && matchesAge && (!search.trim() || haystack.includes(search.trim().toLowerCase()));
  });
  const openRows = rows.filter((row) => ["eligible", "requested", "pending", "failed"].includes(row.status));
  const eligibleRows = rows.filter((row) => row.status === "eligible");
  const processingRows = rows.filter((row) => ["requested", "pending"].includes(row.status));
  const failedRows = rows.filter((row) => row.status === "failed");
  const sumClaims = (items) => sumMoneyValues(items.map((row) => row.grossNeed), meta.currency);
  const principalTotal = sumMoneyValues(filtered.map((row) => claimTypeTotal(row, ["principal"])), meta.currency);
  const deltaTotal = sumMoneyValues(filtered.map((row) => claimTypeTotal(row, ["delta"])), meta.currency);
  const partnerTotal = sumMoneyValues(filtered.map((row) => claimTypeTotal(row, ["partner_reward_creation", "partner_reward_streamed"])), meta.currency);

  function reset() {
    setSearch("");
    setCycle("all");
    setAge("all");
  }

  return <div className="af-content af-claims-content">
    <div className="af-claims-toolbar"><div className="af-claim-tabs" role="tablist">{dynamicTabs.map(([id, label, count]) => <button role="tab" aria-selected={status === id} className={status === id ? "active" : ""} type="button" onClick={() => setStatus(id)} key={id}>{label} · {count}</button>)}</div><label className="af-date-control"><CalendarDays size={15} /><span>Срез</span><input type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} /></label><div className="af-page-actions"><button className="primary" type="button" onClick={claimsRequest.reload}><RefreshCw size={15} />Обновить</button></div></div>
    <div className={`af-quality-notice ${meta.partial ? "is-partial" : ""}`}><span><AlertCircle size={13} /></span><p><strong>{meta.partial ? "Частичное покрытие источника." : "Источник сверён."}</strong> Блок {meta.asOfBlockNumber.toLocaleString("en-US")} · {meta.finality} · цепочка переводов и история сроков обработки неполные.</p><b>{meta.reconciliationStatus}</b></div>
    <div className="af-claims-info"><Info size={20} /><p><strong>Заявка с ошибкой остаётся открытым обязательством.</strong> Сумма исключается из нагрузки только после подтверждённой выплаты, отмены или истечения срока. Platform Fee удерживается внутри Gross.</p><button type="button" onClick={() => setMethodologyOpen(true)}>Методика</button></div>
    <section className="af-metrics af-metrics-five"><Metric accent="#ff8716" label="Открытые обязательства" tag={`${openRows.length}`} tagTone="orange" value={formatWireMoney(sumClaims(openRows))} note="Доступно + запрошено + в обработке + ошибки" /><Metric accent="#7a5bb8" label="Доступно к запросу" tag={`${eligibleRows.length}`} tagTone="violet" value={formatWireMoney(sumClaims(eligibleRows))} note="Сумма на текущем срезе" /><Metric accent="#4e76d0" label="В обработке" tag={`${processingRows.length}`} tagTone="blue" value={formatWireMoney(sumClaims(processingRows))} note="Запрошено или транзакция обрабатывается" /><Metric accent="#cf534c" label="Ошибки" tag="ТРЕБУЕТ ДЕЙСТВИЯ" tagTone="red" value={formatWireMoney(sumClaims(failedRows))} note={`${failedRows.length} обязательство остаётся открытым`} noteTone="risk" /><Metric accent="#239a77" label="Медианное время до выплаты" tag="N/A" tagTone="green" value="N/A" note="Недостаточно истории выплат для проверки модели" /></section>

    <div className="af-claims-layout"><section className="af-panel"><PanelHeader title="Реестр заявок" subtitle="Статусы, сумма обязательства и подтверждения без раскрытия кошелька" action={<Tag tone={meta.partial ? "orange" : "green"}>{rows.length} записей</Tag>} /><div className="af-claim-filters"><label><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ID заявки, участника, цикла или код ошибки" /></label><select value={cycle} onChange={(event) => setCycle(event.target.value)}><option value="all">Все циклы</option>{[...new Set(rows.map((row) => row.cycleId))].map((id) => <option value={id} key={id}>{shortId(id)}</option>)}</select><select value={age} onChange={(event) => setAge(event.target.value)}><option value="all">Любой возраст</option><option value="fresh">До 24 часов</option><option value="sla">Старше 24 часов</option></select><button type="button" onClick={reset}>Сбросить</button></div><div className="af-claim-totals"><div><span>Principal</span><strong>{formatWireMoney(principalTotal)}</strong></div><div><span>Gross Delta</span><strong>{formatWireMoney(deltaTotal)}</strong></div><div><span>Партнёрские выплаты</span><strong>{formatWireMoney(partnerTotal)}</strong></div></div><div className="af-table-scroll"><table className="af-claims-table"><thead><tr><th>Заявка / участник</th><th>Состояние</th><th>Цикл</th><th>Возраст</th><th className="number">Сумма обязательства</th><th className="number">Fee внутри</th><th>Подтверждение</th></tr></thead><tbody>{filtered.map((row) => <tr className={effectiveSelectedId === row.id ? "selected" : ""} onClick={() => setSelectedId(row.id)} key={row.id}><td><strong>{shortId(row.id)}</strong><small>{shortId(row.participantId)}</small></td><td><Tag tone={statusTone[row.status]}>{statusLabels[row.status] || row.status}</Tag></td><td className="af-lineage">{shortId(row.cycleId)}</td><td className={row.ageHours > 24 && !["paid", "reversed", "expired"].includes(row.status) ? "is-risk" : ""}>{row.ageHours} ч</td><td className="number">{formatWireMoney(row.grossNeed)}</td><td className="number">{formatWireMoney(row.platformFee)}</td><td>{row.transferCount ? `${row.transferCount} переводов` : row.settledAt ? "Код завершения" : "N/A"}</td></tr>)}</tbody></table></div><div className="af-claims-foot">Доступно к запросу → Запрошено → В обработке → Выплачено. Ошибка не закрывает обязательство; отмена и истечение срока требуют подтверждения.</div></section><ApiClaimDetail request={detailRequest} /></div>
    {methodologyOpen ? <ClaimsMethodology onClose={() => setMethodologyOpen(false)} /> : null}
  </div>;
}
