import { AlertTriangle, BookOpenCheck, Check, Download, FilePenLine, Info, Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useAdminFinanceReconciliation } from "./api/useAdminFinanceApi";

const exceptions = [
  { id: "amount", title: "Amount mismatch", subtitle: "Gross ≠ linked transfers", object: "pay_7f21_demo", shortObject: "pay_7f21…", amount: 5, age: "2ч 14м", ageTone: "orange", finality: "FINAL", state: "OPEN", severity: "CRITICAL", tone: "red", owner: "Finance Ops", deadline: "Сегодня · 20:00", reason: "Не найден transfer Platform Fee на $5.00", event: "claim_paid", tx: "0x92a7…b10e", transfer: "2 из 3 transfers", payout: "Gross Delta", queue: ["open", "critical"], type: "amount" },
  { id: "orphan", title: "Orphan transfer", subtitle: "Нет economic payout", object: "transfer_18bc_demo", shortObject: "0x18bc…77a1", amount: 84.6, age: "6ч 18м", ageTone: "red", finality: "FINAL", state: "OPEN", severity: "CRITICAL", tone: "red", owner: "Chain Ops", deadline: "Просрочено · 2ч 18м", reason: "Transfer не связан с contract event или payout component", event: "not found", tx: "0x18bc…77a1", transfer: "USDT log 4", payout: "not linked", queue: ["open", "critical"], type: "orphan" },
  { id: "ruleset", title: "Unknown ruleset", subtitle: "Contract version gap", object: "cycle_32041", shortObject: "cycle_32041", amount: 0, age: "48м", ageTone: "", finality: "FINAL", state: "OPEN", severity: "BLOCKER", tone: "orange", owner: "Protocol", deadline: "Сегодня · 18:00", reason: "Implementation hash не сопоставлен с effective block range", event: "cycle_created", tx: "0x4dc1…0e28", transfer: "Principal $100", payout: "pending classification", queue: ["open"], type: "ruleset" },
  { id: "reorg", title: "Reorg candidate", subtitle: "Canonical flag pending", object: "block_54721012", shortObject: "block 54,721,012", amount: 95, age: "7м", ageTone: "", finality: "PENDING", state: "REVIEW", severity: "REVIEW", tone: "blue", owner: "Indexer", deadline: "Автопроверка · 20м", reason: "Parent hash changed; canonical projection ожидает пересборки", event: "partner_reward_paid", tx: "0x742a…11ce", transfer: "USDT log 11", payout: "Partner Reward streamed", queue: ["review"], type: "finality" },
];

const money = (value, signed = false) => `${signed && value > 0 ? "+" : value < 0 ? "−" : ""}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function Tag({ tone = "green", children }) { return <span className={`af-tag af-tag-${tone}`}>{children}</span>; }
function Metric({ accent, label, tag, tone, value, note, noteTone }) { return <article className="af-metric af-recon-metric" style={{ "--metric-accent": accent }}><div className="af-metric-head"><span>{label}</span><Tag tone={tone}>{tag}</Tag></div><div className="af-metric-value">{value}</div><p className={noteTone ? `is-${noteTone}` : ""}>{note}</p></article>; }
function PanelHeader({ title, subtitle, action }) { return <div className="af-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }

function MethodDialog({ onClose }) {
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-recon-method-title"><div className="af-modal-head"><div><span><BookOpenCheck size={17} /> Правила</span><h2 id="af-recon-method-title">Методика финансовой сверки</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div><dl><div><dt>Immutable cut</dt><dd>Каждый прогон закрепляет as-of block, block hash, UTC cut, ABI и ruleset registry version.</dd></div><div><dt>Lineage</dt><dd>Каждый economic component раскрывается до canonical event, successful receipt и одного или нескольких token transfers.</dd></div><div><dt>Idempotency</dt><dd>Повторный прогон с тем же checkpoint не создаёт новые ledger entries и не закрывает исключения автоматически.</dd></div><div><dt>Residual</dt><dd>Balance variance выше token precision блокирует статус reconciled и остаётся отдельным исключением.</dd></div><div><dt>Adjustment</dt><dd>Исходные события неизменяемы. Корректировка создаёт отдельную запись с evidence и независимым подтверждением.</dd></div></dl><div className="af-modal-warning"><AlertTriangle size={16} /><span>Unknown ruleset, orphan transfer или reorg candidate не могут быть скрыты ручной корректировкой.</span></div></section></div>;
}

function exportExceptions(items) {
  const rows = [["exception", "object", "amount_usdt", "age", "finality", "status", "severity", "owner", "deadline", "reason"], ...items.map((item) => [item.title, item.object, item.amount, item.age, item.finality, item.state, item.severity, item.owner, item.deadline, item.reason])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `atlas-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
}

function formatApiMoney(value) {
  if (!value || value.available === false) return "N/A";
  const raw = BigInt(value.amountRaw || "0");
  const negative = raw < 0n;
  const decimals = Number(value.decimals || 0);
  const digits = (negative ? -raw : raw).toString().padStart(decimals + 1, "0");
  const whole = decimals ? digits.slice(0, -decimals) || "0" : digits;
  const fraction = decimals ? digits.slice(-decimals).replace(/0+$/, "").slice(0, 6) : "";
  return `${negative ? "-" : ""}$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction ? `.${fraction}` : ""}`;
}

function ApiReconciliationState({ request }) {
  const title = request.status === "loading" ? "Проверяем срез данных блокчейна" : request.status === "auth-required" ? "Нужна админ-сессия" : "Сверка недоступна";
  return <div className="af-content"><div className="af-data-unavailable"><AlertTriangle size={22}/><strong>{title}</strong><p>Тестовый прогон и тестовые исключения не подставляются. Финансовый экран остаётся закрытым до ответа проверяемого источника.</p>{request.status !== "loading" ? <button className="af-small-link" type="button" onClick={request.reload}>Повторить</button> : null}</div></div>;
}

function ApiReconciliation({ request }) {
  if (request.status !== "ready") return <ApiReconciliationState request={request}/>;
  const runEnvelope = request.data.runs;
  const exceptionEnvelope = request.data.exceptions;
  const run = runEnvelope.data[0];
  const exceptions = exceptionEnvelope.data;
  const meta = runEnvelope.meta;
  const coverage = Array.isArray(request.data.alphaMeta.dataCoverage) ? request.data.alphaMeta.dataCoverage : [];
  const availableCoverage = coverage.filter((item) => item.status === "available").length;
  const partialCoverage = coverage.filter((item) => item.status === "partial").length;
  const unavailableCoverage = coverage.filter((item) => item.status === "unavailable").length;
  return <div className="af-content af-reconciliation-page">
    <div className="af-quality-notice is-partial"><span><AlertTriangle size={14}/></span><p><strong>Внутренняя альфа · данные не сведены.</strong> Блок подтверждён независимым RPC, но цепочка финансового учёта и состав выплат ещё не сверены.</p><b>BLOCK {meta.asOfBlockNumber.toLocaleString("en-US")} · {meta.sourceStatus.toUpperCase()}</b></div>
    <section className="af-recon-metrics"><Metric accent="#239a77" label="Фактический остаток" tag="API" tone="green" value={formatApiMoney(run?.observedClosing)} note="Подтверждённый balanceOf на срезе"/><Metric accent="#cf534c" label="Расчётный остаток" tag="НЕТ ДАННЫХ" tone="red" value={formatApiMoney(run?.expectedClosing)} note="Независимый финансовый реестр не подключён"/><Metric accent="#f0a83c" label="Расхождение" tag="НЕТ ДАННЫХ" tone="orange" value={formatApiMoney(run?.residual)} note="Не вычисляется до полной сверки остатков"/><Metric accent="#4e76d0" label="Подтверждения блока" tag="FINALITY" tone="blue" value={run?.confirmations ?? "N/A"} note="Проверено независимым BSC RPC"/><Metric accent="#7a5bb8" label="Пробелы источника" tag="ОТКРЫТО" tone="orange" value={exceptions.length} note="Не скрываются нулевыми значениями"/><Metric accent="#ff8716" label="Статус сверки" tag="ЧАСТИЧНО" tone="orange" value="ОТКРЫТО" note="Нельзя использовать для production-решений"/></section>
    <section className="af-panel af-run-summary"><PanelHeader title="Зафиксированный срез источника" subtitle="Первый MVP фиксирует источник; это ещё не бухгалтерская сверка" action={<Tag tone="orange">ЧАСТИЧНО · API</Tag>}/><div>{[["ID прогона", run?.id || "N/A"], ["Начальный блок", run?.fromBlock ?? "N/A"], ["Блок среза", run?.toBlock?.toLocaleString("en-US") || "N/A"], ["Хеш блока", run?.blockHash || meta.asOfBlockHash], ["Подтверждения", run?.confirmations ?? "N/A"], ["Версия формулы", run?.modelCommit || meta.formulaVersion], ["Сформировано UTC", meta.generatedAt]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
    <section className="af-panel af-data-coverage"><PanelHeader title="Покрытие данных для Finance MVP" subtitle="Что уже можно использовать, а что блокирует календарь будущих обязательств и финансовые решения" action={<div className="af-coverage-summary"><Tag tone="green">{availableCoverage} ГОТОВО</Tag><Tag tone="orange">{partialCoverage} ЧАСТИЧНО</Tag><Tag tone="red">{unavailableCoverage} N/A</Tag></div>}/>{coverage.length ? <div className="af-table-scroll"><table><thead><tr><th>Домен</th><th>Статус</th><th>Проверяемый источник</th><th>Что блокирует</th><th>Gate / ответственный</th><th>Следующее действие</th></tr></thead><tbody>{coverage.map((item)=><tr key={item.id}><td><strong>{item.label}</strong><small>{item.affectsRoutes.map((route)=>`/${route}`).join(" · ")}</small></td><td><Tag tone={item.status === "available" ? "green" : item.status === "partial" ? "orange" : "red"}>{item.status.toUpperCase()}</Tag></td><td>{item.source}</td><td>{item.blocker}</td><td><strong>{item.gateId}</strong><small>{item.owner}</small></td><td>{item.nextAction}</td></tr>)}</tbody></table></div> : <div className="af-data-unavailable"><Info size={22}/><strong>Матрица покрытия не передана</strong><p>Источник поддерживает отдельные финансовые ресурсы, но не вернул сводную оценку их готовности.</p></div>}</section>
    <section className="af-panel"><PanelHeader title="Открытые пробелы источника" subtitle="Каждый пункт должен получить ответственного, подтверждение и критерий закрытия" action={<Tag tone={exceptions.some((item)=>item.severity==="critical")?"red":"orange"}>{exceptions.length} ОТКРЫТО</Tag>}/><div className="af-table-scroll af-exception-table"><table><thead><tr><th>Тип</th><th>Ссылка на источник</th><th>Критичность</th><th>Ответственный</th><th>Открыто UTC</th><th className="number">Сумма</th></tr></thead><tbody>{exceptions.map((item)=><tr key={item.id}><td><strong>{item.type}</strong><small>{item.reason.replaceAll("_", " ")}</small></td><td><code>{item.sourceRef}</code></td><td><Tag tone={item.severity==="critical"?"red":"orange"}>{item.severity.toUpperCase()}</Tag></td><td>{item.owner}</td><td>{new Date(item.openedAt).toLocaleString("ru-RU", {timeZone:"UTC"})}</td><td className="number">{formatApiMoney(item.amount)}</td></tr>)}</tbody></table></div></section>
    <section className="af-panel"><PanelHeader title="Следующий обязательный шаг" subtitle="MVP-1 после стабилизации основы данных"/><div className="af-head-notice"><Info size={19}/><p><strong>Подключить независимый финансовый реестр.</strong> Нужны нормализованные события, результаты транзакций, переводы USDT и состав каждой выплаты в одном неизменяемом срезе блока. Только после этого появятся расчётный остаток, расхождение и статус полной сверки.</p><a className="af-small-link" href="/admin/methodology#gate">Открыть Gate 0</a></div></section>
  </div>;
}

export default function AdminFinanceReconciliation() {
  const request = useAdminFinanceReconciliation();
  return __ADMIN_FINANCE_API_ONLY__ || request.apiEnabled ? <ApiReconciliation request={request}/> : <StaticAdminFinanceReconciliation/>;
}

function StaticAdminFinanceReconciliation() {
  const [queue, setQueue] = useState("all");
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [methodOpen, setMethodOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalSent, setProposalSent] = useState(false);
  const [assignment, setAssignment] = useState({});
  const proposalRef = useRef(null);
  const visible = useMemo(() => exceptions.filter((item) => (queue === "all" || item.queue.includes(queue)) && (type === "all" || item.type === type) && (!query.trim() || `${item.title} ${item.object} ${item.tx}`.toLowerCase().includes(query.trim().toLowerCase()))), [queue, type, query]);
  const selected = exceptions.find((item) => item.id === selectedId) || null;
  const openProposal = () => { setProposalOpen(true); window.setTimeout(() => proposalRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0); };
  const assignOwner = () => {
    const target = selected || visible[0];
    if (!target) return;
    setSelectedId(target.id);
    setAssignment((current) => ({ ...current, [target.id]: "Finance Ops" }));
  };

  return <div className="af-content af-reconciliation-page">
    <div className="af-recon-toolbar">
      <div className="af-periods">{[["all", "Все"], ["open", "Открытые"], ["critical", "Критичные"], ["review", "На проверке"]].map(([id, label]) => <button type="button" className={queue === id ? "active" : ""} onClick={() => setQueue(id)} key={id}>{label}</button>)}</div>
      <label className="af-recon-select"><span>Тип</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">Все типы</option><option value="amount">Amount mismatch</option><option value="orphan">Orphan transfer</option><option value="ruleset">Unknown ruleset</option><option value="finality">Finality / reorg</option></select></label>
      <label className="af-recon-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tx hash, payout ID, wallet" /></label>
      <div className="af-page-actions">
        <button type="button" onClick={() => setMethodOpen(true)}><BookOpenCheck size={15} />Правила</button>
        <button className="primary af-write-action" type="button" onClick={openProposal}><FilePenLine size={15} />Корректировка</button>
        <button className="af-export-action" type="button" onClick={() => exportExceptions(visible)} aria-label="Экспорт CSV" title="Экспорт CSV"><Download size={15} /></button>
      </div>
    </div>
    <div className="af-traffic-notice"><Info size={17} /><p><strong>Демонстрационный запуск сверки.</strong> Статусы, суммы и блоки показывают целевую структуру интерфейса. Они не подтверждают состояние production ledger и не должны использоваться для финансовых решений.</p><button type="button" onClick={() => setMethodOpen(true)}>Методика сверки</button></div>

    <section className="af-recon-metrics"><Metric accent="#239a77" label="Lineage coverage" tag="DEMO TARGET" tone="orange" value={<>99.82<small>%</small></>} note="12,482 из 12,504 компонентов" /><Metric accent="#cf534c" label="Open exceptions" tag="DEMO" tone="red" value="$184.60" note="3 критичных · demo" noteTone="risk" /><Metric accent="#f0a83c" label="Oldest exception" tag="DEMO SLA" tone="orange" value="6ч 18м" note="Orphan transfer · требует review" /><Metric accent="#4e76d0" label="Balance variance" tag="DEMO" tone="orange" value="−$5.00" note="Ledger $17,780 · chain $17,775" /><Metric accent="#7a5bb8" label="Finalized events" tag="DEMO" tone="orange" value="12,468" note="36 pending finality" /><Metric accent="#ff8716" label="Unknown rulesets" tag="DEMO" tone="orange" value="4" note="Блокируют статус reconciled" noteTone="risk" /></section>

    <section className="af-panel af-run-summary"><PanelHeader title="Run summary" subtitle="Идемпотентный демонстрационный прогон с immutable checkpoint" action={<Tag tone="blue">PARTIAL · DEMO</Tag>} /><div>{[["Run ID", "REC-2026-08-04-1640"], ["As-of block", "54,721,008"], ["Block hash", "0x74ab…19d2"], ["Finality", "24 blocks"], ["Ruleset registry", "4 exceptions"], ["Reorg status", "No active reorg"], ["Duration", "01:42"]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>

    <div className="af-recon-primary-grid"><Lineage selected={selected} /><Foundation /></div>
    <div className="af-recon-exception-grid"><ExceptionQueue items={visible} selectedId={selectedId} setSelectedId={setSelectedId} assignment={assignment} assignOwner={assignOwner} /><ExceptionDetail selected={selected} assignedOwner={selected ? assignment[selected.id] : null} openProposal={openProposal} /></div>
    <div className="af-recon-lower-grid"><BalanceCheck /><div className="af-write-workflow"><Adjustment open={proposalOpen} sent={proposalSent} setSent={setProposalSent} setOpen={setProposalOpen} proposalRef={proposalRef} /></div></div>
    {methodOpen ? <MethodDialog onClose={() => setMethodOpen(false)} /> : null}
  </div>;
}

function Lineage({ selected }) {
  const item = selected || { title: "Выберите исключение", severity: "SELECT ROW", event: "cycle_claimed", object: "evt_54_721_001_07", finality: "status = 1", tx: "0x92a7…b10e", transfer: "3 linked transfers", amount: 100, payout: "Gross Delta" };
  const nodes = [["1 · Contract event", item.event, item.object, "Canonical event, log index и ABI version", "#ff8716"], ["2 · Successful receipt", item.type === "finality" ? "canonical pending" : "status = 1", item.tx, "Block hash, confirmations и gas receipt", "#239a77"], ["3 · Token transfer(s)", item.transfer, selected ? money(item.amount) : "USDT · logs 8–10", "Many-to-many linkage без повторного учёта", "#4e76d0"], ["4 · Economic payout", item.payout, item.object, "Gross = Net + Fee + Other deductions", "#7a5bb8"]];
  return <section className="af-panel"><PanelHeader title="Проверяемая lineage-цепочка" subtitle={selected ? `${selected.title} · ${selected.object}` : "Выберите исключение: каждый финансовый компонент раскрывается до source event и transfer"} action={<Tag tone={selected?.tone || "orange"}>{item.severity}</Tag>} /><div className="af-recon-lineage">{nodes.map(([step, title, code, note, color]) => <article style={{ "--lineage-accent": color }} key={step}><span>{step}</span><strong>{title}</strong><code>{code}</code><small>{note}</small></article>)}</div></section>;
}

function Foundation() {
  const cards = [["Finality", "24 blocks · 36 событий pending", "green"], ["Reorg", "Нет активного пересчёта", "green"], ["Rulesets", "4 неизвестных block ranges", "red"], ["Source SLA", "Indexer age 3м 42с", "orange"]];
  return <section className="af-panel"><PanelHeader title="Data foundation status" subtitle="Gate для допуска агрегатов в интерфейс" /><div className="af-foundation"><div>{cards.map(([title, note, tone]) => <article key={title}><header><strong>{title}</strong><i className={tone} /></header><p>{note}</p></article>)}</div><p>Unknown ruleset, orphan fee/reward или residual выше token precision блокируют итоговый статус <strong>reconciled</strong>.</p></div></section>;
}

function ExceptionQueue({ items, selectedId, setSelectedId, assignment, assignOwner }) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return <section className="af-panel"><PanelHeader title="Очередь reconciliation exceptions" subtitle="Расхождения не удаляются; выберите строку для расследования" action={<button className="af-small-link" type="button" onClick={assignOwner}>Назначить ответственного</button>} /><div className="af-table-scroll af-exception-table"><table><thead><tr><th>Exception</th><th>Объект</th><th className="number">Amount</th><th>Age</th><th>Finality</th><th>Status</th><th>Owner / deadline</th></tr></thead><tbody>{items.map((item) => <tr className={selectedId === item.id ? "selected" : ""} tabIndex="0" onClick={() => setSelectedId(item.id)} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && setSelectedId(item.id)} key={item.id}><td><strong>{item.title}</strong><small>{item.subtitle}</small></td><td><code>{item.shortObject}</code></td><td className="number">{money(item.amount)}</td><td className={`age-${item.ageTone}`}>{item.age}</td><td><Tag tone="orange">DEMO · {item.finality}</Tag></td><td><Tag tone={item.tone}>{item.state}</Tag></td><td><strong>{assignment[item.id] || item.owner}</strong><small>{item.deadline}</small></td></tr>)}</tbody></table></div><div className="af-recon-table-foot"><span>Показано {items.length} исключения · demo</span><strong>Общая сумма {money(total)}</strong></div></section>;
}

function ExceptionDetail({ selected, assignedOwner, openProposal }) {
  if (!selected) return <aside className="af-panel af-exception-detail"><PanelHeader title="Детали исключения" subtitle="Доказательства, причина и audit trail" action={<Tag tone="brown">НЕ ВЫБРАНО</Tag>} /><div className="af-exception-empty"><div><strong>Выберите строку</strong><span>Здесь появится полная цепочка до tx hash и действия по устранению.</span></div></div></aside>;
  return <aside className="af-panel af-exception-detail"><PanelHeader title="Детали исключения" subtitle="Доказательства, причина и audit trail" action={<Tag tone={selected.tone}>{selected.severity}</Tag>} /><section><h3>{selected.title}</h3><dl><div><dt>Объект</dt><dd>{selected.object}</dd></div><div><dt>Сумма</dt><dd>{money(selected.amount)}</dd></div><div><dt>Возраст</dt><dd>{selected.age}</dd></div><div><dt>Ответственный</dt><dd>{assignedOwner || selected.owner}</dd></div><div><dt>Контрольный срок</dt><dd>{selected.deadline}</dd></div><div><dt>Причина</dt><dd>{selected.reason}</dd></div></dl></section><section><h3>Lineage evidence</h3><dl><div><dt>Event</dt><dd>{selected.event}</dd></div><div><dt>Transaction</dt><dd>{selected.tx}</dd></div><div><dt>Transfer</dt><dd>{selected.transfer}</dd></div><div><dt>Payout</dt><dd>{selected.payout}</dd></div></dl></section><section><h3>Audit trail</h3><div className="af-audit-trail"><div><i /><p><strong>Indexer detected</strong><span>Автоматическая проверка lineage</span></p><small>16:40</small></div><div><i className="warn" /><p><strong>Assigned to {assignedOwner || selected.owner}</strong><span>Ожидает подтверждения причины</span></p><small>16:43</small></div></div></section><footer><button className="af-small-link" type="button" onClick={openProposal}>Создать предложение корректировки</button><button className="af-small-link" type="button">Открыть transaction</button></footer></aside>;
}

function BalanceCheck() {
  const rows = [["Opening balance", 19640, ""], ["External token inflow", 18420, "good"], ["External token outflow", -16890, "bad"], ["Internal treasury transfers", -3390, "bad"], ["Calculated closing ledger", 17780, "total"], ["Canonical balanceOf checkpoint", 17775, ""], ["Residual", -5, "variance"]];
  return <section className="af-panel"><PanelHeader title="Balance roll-forward check" subtitle="Payout Contract · ledger против canonical on-chain checkpoint" action={<Tag tone="red">VARIANCE · DEMO</Tag>} /><div className="af-balance-check">{rows.map(([label, value, tone], index) => <div className={tone} key={label}><span>{label}</span><strong>{money(value, index > 0 && index < 4)}</strong></div>)}</div></section>;
}

function Adjustment({ open, sent, setSent, setOpen, proposalRef }) {
  return <section className="af-panel"><PanelHeader title="Manual adjustments · four-eyes" subtitle="Исходные события неизменяемы; корректировка создаёт отдельную ledger entry" action={<Tag tone="orange">DEMO WORKFLOW</Tag>} /><div className="af-adjustment-summary"><div><strong>Двухэтапное подтверждение</strong><p>Автор не может утвердить собственную корректировку. Требуются основание, evidence, before/after и второй сотрудник.</p></div><div><span className="done">1 · Proposal</span><b>→</b><span className="pending">2 · Independent approval</span><b>→</b><span>3 · Applied</span></div></div>{open ? <form className="af-adjustment-form" ref={proposalRef} onSubmit={(event) => { event.preventDefault(); setSent(true); }}><select aria-label="Тип корректировки"><option>Liquidity adjustment</option><option>Classification correction</option><option>Opening balance correction</option></select><input aria-label="Сумма USDT" placeholder="Сумма, USDT" inputMode="decimal" /><input aria-label="Обоснование" placeholder="Обоснование и ссылка на evidence" required /><button className="af-small-link" type="submit">Отправить proposal</button><button className="af-small-link" type="button" onClick={() => setOpen(false)} aria-label="Закрыть предложение"><X size={14} /></button>{sent ? <p><Check size={14} /> Demo proposal создан локально. В production потребуется второй пользователь с `adjustment.approve` и MFA step-up.</p> : null}</form> : null}<footer><button className="af-small-link" type="button" onClick={() => setOpen(true)}>Новое предложение</button><span>Все действия записываются в tamper-evident audit log</span></footer></section>;
}
