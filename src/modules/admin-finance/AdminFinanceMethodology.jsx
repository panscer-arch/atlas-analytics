import {
  AlertTriangle,
  BookOpenCheck,
  Check,
  Download,
  Eye,
  FileClock,
  History,
  Info,
  KeyRound,
  LockKeyhole,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAdminFinanceGateZero } from "./api/useAdminFinanceApi";

const tabs = [
  ["perimeters", "Периметры"],
  ["sources", "Источники"],
  ["formulas", "Формулы и rulesets"],
  ["access", "Доступ и RBAC"],
  ["audit", "Audit и экспорты"],
  ["gate", "Gate 0 · 14"],
  ["states", "Состояния UI"],
];

const perimeters = [
  {
    id: "payout",
    title: "Payout Contract",
    description: "Канонический денежный контур смарт-контракта выплат.",
    status: "PRIMARY",
    tone: "blue",
    cashIn: "Все внешние transfers",
    cashOut: "Все исходящие transfers",
    control: "On-chain balance",
    metrics: "Cash In, Cash Out, Opening/Closing Balance, canonical on-chain balance.",
    rule: "Fee transfer в treasury является cash-out контракта, но не расходом сверх Gross.",
  },
  {
    id: "consolidated",
    title: "Atlas Consolidated",
    description: "Внешние потоки группы; внутренние transfers исключаются.",
    status: "REGISTRY REQUIRED",
    tone: "orange",
    cashIn: "Только внешний",
    cashOut: "Только внешний",
    control: "Eliminations",
    metrics: "External Inflow, External Outflow, Internal Transfers Eliminated.",
    rule: "Нужен effective-dated registry адресов и периодов владения.",
  },
  {
    id: "treasury",
    title: "Company Treasury",
    description: "Кассовые поступления компании, расходы, налоги и резервы.",
    status: "CUSTODY OPEN",
    tone: "red",
    cashIn: "Получено treasury",
    cashOut: "OPEX / tax / reserve",
    control: "Treasury balance",
    metrics: "Fee Cash Received, Head Account receipts, OPEX, tax, reserve, closing balance.",
    rule: "Fee allocation без treasury transfer ещё не является cash receipt компании.",
  },
];

const sources = [
  { name: "EVM archive RPC", detail: "DEMO · независимый сбор blocks, logs и receipts", age: "не подключён", state: "reconciling", checkpoint: "fixture 54,721,008" },
  { name: "Token Transfer indexer", detail: "DEMO · диапазон и checkpoint являются fixtures", age: "не подключён", state: "reconciling", checkpoint: "fixture 54,721,008" },
  { name: "Atlas backend events", detail: "DEMO · wallet ownership и server-confirmed connect", age: "не подключён", state: "stale", checkpoint: "fixture 2026-08-04T15:13Z" },
  { name: "Dune independent checkpoint", detail: "CONTROL ONLY · публичная on-chain сверка, не source of truth", age: "не подключён", state: "stale", checkpoint: "dataset mapping required" },
  { name: "GA4 Data API", detail: "MARKETING ONLY · последнее значение нельзя заменять нулём", age: "не подключён", state: "error", checkpoint: "sandbox required" },
  { name: "Contract ABI registry", detail: "DEMO · 2 implementations и 7 draft rulesets", age: "не утверждён", state: "reconciling", checkpoint: "fixture abi-reg-v0.7" },
];

const formulas = [
  { title: "Payout waterfall", version: "formula-payout-v1.2", rule: "Platform Fee удерживается внутри Gross; Partner Reward является отдельным расходом поверх Delta.", formula: "gross = net_recipient + platform_fee + other_deductions\ntotal_cash_out = gross + partner_reward" },
  { title: "Available Contract Balance", version: "formula-liquidity-v1.0-draft", rule: "Reserve является порогом cash ladder и вычитается только при расчёте headroom.", formula: "available = canonical_balance - restricted_amount\nspendable_above_reserve = max(0, available - required_reserve)" },
  { title: "Sequential funding gap", version: "forecast-stress-v1.4", rule: "Каждый bucket открывается остатком предыдущего. Неподтверждённый inflow не закрывает дефицит.", formula: "closing[t] = opening[t] + confirmed_inflow[t] - gross_outflow[t]\ngap[t] = max(0, required_reserve - closing[t])" },
  { title: "External Net Flow", version: "formula-flow-v1.1", rule: "В Atlas Consolidated внутренние переводы между controlled addresses элиминируются.", formula: "net_flow = external_inflow - external_outflow" },
  { title: "Company cash take rate", version: "formula-revenue-v0.8", rule: "Сравниваются фактически полученные treasury средства и внешний inflow того же периода; когортный показатель выводится отдельно.", formula: "cash_take_rate = company_cash_received / external_inflow" },
  { title: "Partner Reward timing", version: "official-level-2026-08-12", rule: "Lockup начисляется при создании; Daily: 20% при создании и 80% равными долями за 200 дней. Ставка фиксируется статусом пригласителя на момент создания цикла.", formula: "installment = gross_partner_reward × streamed_share / 200" },
];

const roles = [
  { role: "Viewer", scope: "Агрегаты и masked values", reveal: "Нет", export: "Нет", write: "Нет", mfa: "Нет" },
  { role: "Analyst", scope: "Агрегаты, когорты, drill-down", reveal: "По запросу", export: "Обычный", write: "Нет", mfa: "Для reveal" },
  { role: "Finance Ops", scope: "Claims, reconciliation, proposals", reveal: "Да", export: "Финансовый", write: "Proposal", mfa: "Обязательно" },
  { role: "Treasury", scope: "Liquidity, reserve, forecast", reveal: "Да", export: "Финансовый", write: "Policy proposal", mfa: "Обязательно" },
  { role: "Security Admin", scope: "RBAC, audit, incident access", reveal: "Break-glass", export: "Audit", write: "Access policy", mfa: "Обязательно" },
  { role: "Owner / Approver", scope: "Независимое подтверждение", reveal: "Да", export: "Все", write: "Approval", mfa: "Обязательно" },
];

const gateItems = [
  ["01", "Contract and implementation registry", "Адреса contracts, proxy/implementation, ABI и effective block ranges.", "Smart Contract", "Signed registry + deployment tx"],
  ["02", "Controlled addresses and perimeters", "Назначение, период владения, internal transfers и три денежных периметра.", "Finance / Data", "Versioned address registry"],
  ["03", "Financial rulesets", "Delta, Partner Reward, Platform Fee, compression и rounding order.", "Product / Contract", "Golden fixtures + signed rules"],
  ["04", "Cycle and claim lifecycle", "Terminal states, retry, correction, reversal и expiry semantics.", "Product / Data", "State diagram + event mapping"],
  ["05", "Finality and reorg policy", "Finality depth, независимые RPC и пересчёт affected projections.", "Data / Security", "Runbook + reorg tests"],
  ["06", "data.atlas-system.io contract", "Sandbox, OpenAPI/AsyncAPI, schemas, cursors, SLA и backfill.", "Provider / Data", "Signed data contract + fixtures"],
  ["07", "Source-of-truth matrix", "Канонический источник, owner, freshness и lineage каждой метрики.", "Data / Finance", "Metric source catalog"],
  ["08", "Reserve and forecast policy", "Restricted amount, required reserve, scenarios, limits и authority изменения.", "Treasury", "Approved versioned policy"],
  ["09", "Data-state semantics", "SLA freshness и единое поведение partial, stale, error и reconciling.", "Data / Product", "Acceptance criteria"],
  ["10", "Admin access model", "RBAC, field masking, MFA step-up, four-eyes и negative authorization tests.", "Security / Product", "Permission matrix + tests"],
  ["11", "Retention, audit and exports", "Privacy, WORM audit, export TTL, download log и deletion policy.", "Security / Legal", "Approved policies"],
  ["12", "Canonical Admin API", "Runtime validation и generated OpenAPI для `/api/admin/v1`.", "Backend / Data", "OpenAPI + contract tests"],
  ["13", "Money wire format", "Atomic units, decimals, token address, display amount и запрет float.", "Backend / Finance", "Approved schema + invariants"],
  ["14", "Backup and restore", "RPO/RTO, encrypted backup и доказанное восстановление в отдельном окружении.", "Infrastructure", "Successful restore evidence"],
];

const uiStates = [
  ["Loading", "Skeleton без скачков layout. При refetch старые данные остаются с пометкой «Обновляется».", "#4e76d0"],
  ["Empty", "Различать нет операций, настоящий 0, N/A, нет совпадений и недостаточно истории.", "#79675e"],
  ["Error", "Показывать конкретный источник и retry. Последнее успешное значение не обнулять.", "#cf534c"],
  ["Stale / Partial", "Возраст, checkpoint, причина и охват. Экспорт получает предупреждение partial data.", "#f6b92f"],
  ["Reconciling / Reorg", "Затронутый block range и статус пересчёта. Предыдущая версия временно недостоверна.", "#7a5bb8"],
  ["Restricted", "Lock-state, причина и запрос доступа. Reveal только через step-up и audit trail.", "#78574a"],
  ["Export", "Формат и объём → подтверждение → progress → ready, expired или failed.", "#ff8716"],
  ["Drill-down", "KPI → bucket → component → payout → event/transfer → tx hash. Back сохраняет фильтры.", "#239a77"],
  ["Forecast", "Committed, Base, Stress; insufficient history; snapshot vs actual; reserve-not-set.", "#4e76d0"],
];

const stateTone = { live: "green", reconciling: "blue", stale: "orange", error: "red" };
const gateTone = { open: "red", in_review: "blue", done: "green", rejected: "red" };
const gateLabel = { open: "OPEN", in_review: "IN REVIEW", done: "DONE", rejected: "REJECTED" };

function Tag({ tone = "green", children }) { return <span className={`af-tag af-tag-${tone}`}>{children}</span>; }
function PanelHeader({ title, subtitle, action }) { return <div className="af-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }

function StepUpDialog({ kind, onClose, onConfirm }) {
  const [code, setCode] = useState("");
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="af-modal af-step-up" role="dialog" aria-modal="true" aria-labelledby="af-step-title"><div className="af-modal-head"><div><span><KeyRound size={17} /> Step-up access</span><h2 id="af-step-title">{kind === "reveal" ? "Раскрытие controlled addresses" : "Создание финансового экспорта"}</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div><div className="af-step-body"><div className="af-method-lock"><LockKeyhole size={21} /><p><strong>Production-проверка выполняется сервером.</strong><span>Требуются активная сессия, разрешение, MFA, причина и append-only audit event.</span></p></div><label>Причина доступа<textarea defaultValue={kind === "reveal" ? "Проверка реестра controlled addresses" : "Финансовая сверка за выбранный период"} /></label><label>Demo MFA-код<input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000" /></label><button className="af-small-link" type="button" disabled={code.length !== 6} onClick={onConfirm}><ShieldCheck size={15} />Подтвердить demo step-up</button></div><div className="af-modal-warning"><AlertTriangle size={16} /><span>Демо-код не проверяет реальную личность и не должен использоваться как production-аутентификация.</span></div></section></div>;
}

function VersionDialog({ onClose }) {
  const versions = [["draft-v0.8", "04.08.2026", "Gate 0 registry, RBAC и export policy", "CURRENT"], ["draft-v0.7", "03.08.2026", "Reconciliation lineage и claim states", "ARCHIVED"], ["draft-v0.6", "02.08.2026", "Initial finance perimeters", "ARCHIVED"]];
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-version-title"><div className="af-modal-head"><div><span><History size={17} /> Version registry</span><h2 id="af-version-title">История методики</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div><div className="af-version-list">{versions.map(([version,date,change,status])=><div key={version}><code>{version}</code><span>{date}</span><strong>{change}</strong><Tag tone={status === "CURRENT" ? "green" : "brown"}>{status}</Tag></div>)}</div><div className="af-modal-warning"><Info size={16}/><span>Опубликованные версии immutable. Исправление создаёт новую версию с автором, approver и effective interval.</span></div></section></div>;
}

export default function AdminFinanceMethodology() {
  const hashTab = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
  const [tab, setTab] = useState(tabs.some(([id]) => id === hashTab) ? hashTab : "perimeters");
  const [perimeterId, setPerimeterId] = useState("payout");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [auditType, setAuditType] = useState("all");
  const [auditQuery, setAuditQuery] = useState("");
  const [dialog, setDialog] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [exportJobs, setExportJobs] = useState([
    ["Claims · 04.08", "CSV · 186 rows · partial data warning", "READY · 5д", "orange"],
    ["Payout Contract ledger", "CSV · queued by finance@atlas", "72%", "blue"],
    ["Audit log · July", "Expired · recreate required", "EXPIRED", "brown"],
  ]);
  const [audit, setAudit] = useState([
    ["14:31", "owner@atlas", "wallet.reveal", "Investigation #AT-291", "req_18A2", "reveal"],
    ["13:48", "finance@atlas", "finance.export", "Daily reconciliation", "req_179C", "export"],
    ["12:16", "owner@atlas", "adjustment.approve", "Orphan transfer mapping", "req_163B", "approval"],
  ]);
  const selected = perimeters.find((item) => item.id === perimeterId) || perimeters[0];
  const visibleSources = sources.filter((item) => sourceFilter === "all" || item.state === sourceFilter);
  const visibleAudit = useMemo(() => audit.filter((row) => (auditType === "all" || row[5] === auditType) && row.join(" ").toLowerCase().includes(auditQuery.toLowerCase())), [audit, auditQuery, auditType]);
  const gateRequest = useAdminFinanceGateZero();
  const activeGateItems = useMemo(() => {
    if (gateRequest.status === "static-demo") {
      return gateItems.map(([id, title, evidenceRequirement, owner, evidence]) => ({ id: `G0-${id}`, title, evidenceRequirement, owner, approver: "unassigned", evidenceUrl: evidence, decidedAt: null, status: "open" }));
    }
    return gateRequest.status === "ready" ? gateRequest.data.data : [];
  }, [gateRequest.data, gateRequest.status]);
  const gateClosed = gateRequest.status === "ready" ? gateRequest.data.closed : 0;
  const gateTotal = gateRequest.status === "ready" ? gateRequest.data.total : 14;
  const gateNotice = gateRequest.status === "ready"
    ? `Admin API сообщил: закрыто ${gateClosed} из ${gateTotal} решений. Даже после закрытия Gate 0 потребуются backfill, сверка и release UAT.`
    : gateRequest.status === "static-demo"
      ? "Показан проектный реестр из 14 решений. Это структура продукта, а не подтверждение состояния Atlas."
      : gateRequest.status === "loading"
        ? "Получаем реестр решений из Admin API. Макетные статусы в этот момент не подставляются."
        : gateRequest.status === "auth-required"
          ? "Admin API требует действующую админ-сессию. До авторизации состояние Gate 0 неизвестно."
          : "Admin API недоступен. Состояние Gate 0 неизвестно, статический реестр не подставлен.";

  useEffect(() => {
    const syncHash = () => {
      const next = window.location.hash.replace("#", "");
      if (tabs.some(([id]) => id === next)) setTab(next);
    };
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const selectTab = (id) => { setTab(id); if (typeof window !== "undefined") window.history.replaceState(null, "", `${window.location.pathname}#${id}`); };
  const recordAudit = (action, reason, type) => setAudit((current) => [["сейчас", "demo.user@atlas", action, reason, "local_demo", type], ...current]);
  const confirmStepUp = () => {
    if (dialog === "reveal") { setRevealed(true); recordAudit("wallet.reveal", "Controlled address registry", "reveal"); }
    if (dialog === "export") { setExportJobs((current) => [["Methodology · draft-v0.8", "JSON · UI demo · no secrets", "QUEUED", "blue"], ...current]); recordAudit("finance.export", "Methodology registry", "export"); }
    setDialog(null);
  };
  const exportMethodology = () => {
    const payload = { status: "UI_DEMO_DRAFT", version: "draft-v0.8", generatedAt: new Date().toISOString(), perimeters: perimeters.map(({ id,title,status }) => ({ id,title,status })), formulas: formulas.map(({ title,version }) => ({ title,version })), gate0SourceStatus: gateRequest.status, gate0: activeGateItems.map(({ id,title,status }) => ({ id,title,status })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "atlas-methodology-draft-v0.8.json"; link.click(); URL.revokeObjectURL(url); recordAudit("methodology.export", "Draft registry", "export");
  };

  return <div className="af-content af-method-page">
    <div className="af-method-toolbar"><Tag tone="violet">DEMO / DRAFT</Tag><button type="button" onClick={() => setDialog("versions")}><History size={15}/>История версий</button><button className="primary" type="button" onClick={exportMethodology}><Download size={15}/>Экспорт методики</button></div>
    <div className="af-risk-notice"><AlertTriangle size={18}/><p><strong>Production-расчёты пока заблокированы.</strong> {gateNotice}</p><button type="button" onClick={() => selectTab("gate")}>Gate 0 · {gateTotal}</button></div>
    <div className="af-method-tabs" role="tablist">{tabs.map(([id,label])=><button type="button" role="tab" aria-selected={tab===id} className={tab===id?"active":""} onClick={()=>selectTab(id)} key={id}>{label}</button>)}</div>

    {tab === "perimeters" ? <Perimeters selected={selected} setSelected={setPerimeterId} revealed={revealed} requestReveal={()=>setDialog("reveal")} hideReveal={()=>{ setRevealed(false); recordAudit("wallet.hide", "Controlled address registry", "reveal"); }}/> : null}
    {tab === "sources" ? <Sources items={visibleSources} filter={sourceFilter} setFilter={setSourceFilter}/> : null}
    {tab === "formulas" ? <Formulas/> : null}
    {tab === "access" ? <Access roles={roles}/> : null}
    {tab === "audit" ? <AuditExports rows={visibleAudit} query={auditQuery} setQuery={setAuditQuery} type={auditType} setType={setAuditType} jobs={exportJobs} requestExport={()=>setDialog("export")}/> : null}
    {tab === "gate" ? <Gate items={activeGateItems} sourceStatus={gateRequest.status} closed={gateClosed} total={gateTotal} reload={gateRequest.reload}/> : null}
    {tab === "states" ? <States/> : null}

    {dialog === "versions" ? <VersionDialog onClose={()=>setDialog(null)}/> : null}
    {dialog === "reveal" || dialog === "export" ? <StepUpDialog kind={dialog} onClose={()=>setDialog(null)} onConfirm={confirmStepUp}/> : null}
  </div>;
}

function Perimeters({ selected, setSelected, revealed, requestReveal, hideReveal }) {
  const addresses = [["Payout contract", "0x8F6A...D842", "0x8F6A7019D17B1A67A3E0C9D4B6241F20C115D842"], ["Company treasury", "0x41C0...7A12", "0x41C0B871D0A2AB9604471F3C28E981AF16717A12"], ["Head account", "0xA120...91F4", "0xA120C01219A991750BB243B8D50EE8F4AD1291F4"]];
  return <><div className="af-method-layout"><section className="af-panel"><PanelHeader title="Три денежных периметра" subtitle="Показатели разных контуров никогда не суммируются автоматически" action={<Tag tone="orange">DRAFT REGISTRY</Tag>}/><div className="af-method-registry">{perimeters.map((item)=><button type="button" className={selected.id===item.id?"selected":""} onClick={()=>setSelected(item.id)} key={item.id}><header><div><strong>{item.title}</strong><span>{item.description}</span></div><Tag tone={item.tone}>{item.status}</Tag></header><div>{[["Cash In",item.cashIn],["Cash Out",item.cashOut],["Контроль",item.control]].map(([label,value])=><p key={label}><span>{label}</span><strong>{value}</strong></p>)}</div></button>)}</div></section><aside className="af-panel af-method-detail"><PanelHeader title="Определение" subtitle="Выбранный элемент реестра"/><div><h3>{selected.title}</h3><p>{selected.description}</p><dl><div><dt>Основные показатели</dt><dd>{selected.metrics}</dd></div><div><dt>Правило исключения</dt><dd>{selected.rule}</dd></div><div><dt>Версия определения</dt><dd>draft-perimeter-v0.4</dd></div></dl></div></aside></div><div className="af-method-split"><section className="af-panel"><PanelHeader title="Controlled addresses" subtitle="Полные адреса доступны только после серверного step-up" action={<button className="af-small-link" type="button" onClick={revealed?hideReveal:requestReveal}><Eye size={14}/>{revealed?"Скрыть адреса":"Показать адреса"}</button>}/><div className="af-table-scroll"><table className="af-method-table"><thead><tr><th>Назначение</th><th>Адрес</th><th>Действует с</th><th>Статус</th></tr></thead><tbody>{addresses.map(([label,mask,full])=><tr key={label}><td><strong>{label}</strong></td><td><code>{revealed?full:mask}</code></td><td>Gate 0</td><td><Tag tone="red">НЕ УТВЕРЖДЁН</Tag></td></tr>)}</tbody></table></div></section><section className="af-panel"><PanelHeader title="Reserve policy" subtitle="Отдельно от restricted amount; двойное вычитание запрещено" action={<Tag tone="red">NOT SET</Tag>}/><div className="af-method-policy">{[["Restricted amount","Не определено"],["Required reserve","Не утверждён"],["Coverage threshold","Не утверждён"]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p className="af-method-callout">gross_available_balance = canonical_onchain_balance − restricted_amount. Затем funding gap сравнивает получившийся баланс с required reserve только один раз.</p></section></div></>;
}

function Sources({ items, filter, setFilter }) {
  return <div className="af-method-split"><section className="af-panel"><PanelHeader title="Source health" subtitle="Ошибка источника не превращается в нулевое значение" action={<select className="af-method-select" value={filter} onChange={(event)=>setFilter(event.target.value)} aria-label="Фильтр источников"><option value="all">Все статусы</option><option value="live">Live</option><option value="reconciling">Reconciling</option><option value="stale">Stale</option><option value="error">Error</option></select>}/><div className="af-source-health">{items.map((item)=><article key={item.name}><div><strong>{item.name}</strong><small>{item.detail}</small><code>{item.checkpoint}</code></div><span>{item.age}</span><Tag tone={stateTone[item.state]}>{item.state.toUpperCase()}</Tag></article>)}</div></section><section className="af-panel"><PanelHeader title="Обязательный Data Contract" subtitle="Metadata сопровождает каждый финансовый ответ" action={<Tag tone="orange">DRAFT CONTRACT</Tag>}/><div className="af-data-contract">{[["Snapshot identity","asOfBlockNumber + asOfBlockHash + finality"],["Calculation identity","rulesetVersion + formulaVersion + modelVersion"],["Data state","freshness + partial + reconciliationStatus"],["Traceability","requestId + economicPayoutId + txHash + logIndex"],["Money","integer atomic units + tokenDecimals + currency"]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p className="af-method-callout red">Ответ без snapshot identity, source status или formula version не допускается в production finance UI.</p></section></div>;
}

function Formulas() {
  return <><div className="af-method-split"><section className="af-panel"><PanelHeader title="Канонические формулы" subtitle="Расчёты выполняются на backend; Decimal/BigInt, никаких float" action={<Tag tone="violet">draft-v0.8</Tag>}/><div className="af-formula-list">{formulas.slice(0,3).map((item)=><Formula item={item} key={item.title}/>)}</div></section><section className="af-panel"><PanelHeader title="Потоки, доход и партнёрка" subtitle="Effective-dated rulesets с block ranges" action={<Tag tone="orange">RULESET OPEN</Tag>}/><div className="af-formula-list">{formulas.slice(3).map((item)=><Formula item={item} key={item.title}/>)}</div></section></div><section className="af-panel af-ruleset-table"><PanelHeader title="Ruleset registry" subtitle="Исторический расчёт использует версию, действовавшую на event block" action={<Tag tone="red">BLOCK RANGES OPEN</Tag>}/><div className="af-table-scroll"><table className="af-method-table"><thead><tr><th>Ruleset</th><th>Показатели</th><th>Effective from</th><th>Effective to</th><th>Статус</th></tr></thead><tbody><tr><td><code>fee-v1.4</code></td><td>Platform Fee · Delta / Partner Reward</td><td>Не утверждено</td><td>Open-ended</td><td><Tag tone="orange">DRAFT</Tag></td></tr><tr><td><code>cycles-v2.1</code></td><td>Principal, term, Gross Delta</td><td>Не утверждено</td><td>Open-ended</td><td><Tag tone="orange">DRAFT</Tag></td></tr><tr><td><code>partner-draft</code></td><td>Rate, rank snapshot, timing</td><td>Gate 0</td><td>Gate 0</td><td><Tag tone="red">DECISION</Tag></td></tr></tbody></table></div></section></>;
}
function Formula({ item }) { return <article><header><strong>{item.title}</strong><code>{item.version}</code></header><p>{item.rule}</p><pre>{item.formula}</pre></article>; }

function Access({ roles: accessRoles }) {
  return <><div className="af-method-split"><section className="af-panel"><PanelHeader title="Access model" subtitle="Default deny · least privilege · разделение обязанностей" action={<Tag tone="green">SERVER-SIDE</Tag>}/><div className="af-access-principles">{[["Authentication","SSO / OIDC, короткая сессия, device and risk context"],["Authorization","RBAC + resource scope + server-side row/field policy"],["Step-up","MFA для reveal, export, policy write и approval"],["Four-eyes","Автор proposal не подтверждает собственное изменение"]].map(([title,body])=><div key={title}><ShieldCheck size={17}/><p><strong>{title}</strong><span>{body}</span></p></div>)}</div></section><section className="af-panel"><PanelHeader title="Чувствительные данные" subtitle="Wallet, identity, export и incident evidence" action={<Tag tone="red">RESTRICTED</Tag>}/><div className="af-data-contract"><div><span>Masked by default</span><strong>Wallet addresses, email, referral links, tx correlation</strong></div><div><span>Purpose binding</span><strong>Reveal требует reason, ticket/case и короткого TTL</strong></div><div><span>Export controls</span><strong>Async job, watermark, row limit, expiry и audit reference</strong></div><div><span>Break-glass</span><strong>Отдельная роль, incident ID, уведомление и post-review</strong></div></div></section></div><section className="af-panel af-access-matrix"><PanelHeader title="Матрица ролей" subtitle="Права ниже — целевой контракт, не текущая production-конфигурация" action={<Tag tone="violet">UI CONTRACT</Tag>}/><div className="af-table-scroll"><table className="af-method-table"><thead><tr><th>Роль</th><th>Область</th><th>Reveal</th><th>Export</th><th>Write / approve</th><th>MFA</th></tr></thead><tbody>{accessRoles.map((row)=><tr key={row.role}><td><strong>{row.role}</strong></td><td>{row.scope}</td><td>{row.reveal}</td><td>{row.export}</td><td>{row.write}</td><td><Tag tone={row.mfa==="Нет"?"brown":"blue"}>{row.mfa}</Tag></td></tr>)}</tbody></table></div><footer><LockKeyhole size={14}/> Клиентские feature flags не заменяют API authorization. Каждый endpoint повторно проверяет actor, scope, purpose и resource.</footer></section></>;
}

function AuditExports({ rows, query, setQuery, type, setType, jobs, requestExport }) {
  return <div className="af-method-split"><section className="af-panel"><PanelHeader title="Audit log" subtitle="Append-only журнал действий с чувствительными данными" action={<Tag tone="green">TAMPER-EVIDENT</Tag>}/><div className="af-audit-filter"><label><Search size={14}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Actor, action или request ID"/></label><select value={type} onChange={(event)=>setType(event.target.value)}><option value="all">Все действия</option><option value="reveal">Reveal</option><option value="export">Export</option><option value="approval">Approval</option></select><button type="button" onClick={()=>{setQuery("");setType("all");}}>Сбросить</button></div><div className="af-table-scroll"><table className="af-method-table"><thead><tr><th>Время / actor</th><th>Действие</th><th>Причина</th><th>Request ID</th></tr></thead><tbody>{rows.map((row,index)=><tr key={`${row[4]}-${index}`}><td>{row[0]} · {row[1]}</td><td><strong>{row[2]}</strong></td><td>{row[3]}</td><td><code>{row[4]}</code></td></tr>)}</tbody></table></div>{!rows.length?<div className="af-method-empty">Нет audit-событий по фильтру</div>:null}</section><section className="af-panel"><PanelHeader title="Export jobs" subtitle="Асинхронная очередь с retention и audit reference" action={<button className="af-small-link" type="button" onClick={requestExport}><Download size={14}/>Новый экспорт</button>}/><div className="af-export-jobs">{jobs.map(([title,detail,status,tone],index)=><article key={`${title}-${index}`}><FileClock size={17}/><div><strong>{title}</strong><small>{detail}</small></div><Tag tone={tone}>{status}</Tag></article>)}</div><p className="af-method-callout">Production download URL одноразовый, короткоживущий и привязан к actor. Готовый файл не хранится в браузере или публичном bucket.</p></section></div>;
}

function Gate({ items, sourceStatus, closed, total, reload }) {
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (selected >= items.length) setSelected(0);
  }, [items.length, selected]);

  if (sourceStatus !== "static-demo" && sourceStatus !== "ready") {
    const title = sourceStatus === "loading" ? "Загрузка Gate 0" : sourceStatus === "auth-required" ? "Нужна админ-сессия" : "Gate 0 недоступен";
    const body = sourceStatus === "loading" ? "Получаем канонический реестр решений из Admin API." : sourceStatus === "auth-required" ? "API вернул 401. После входа повторите проверку." : "Не удалось получить реестр. Статические статусы намеренно не показаны.";
    return <section className="af-panel af-gate-state"><AlertTriangle size={22}/><h2>{title}</h2><p>{body}</p>{sourceStatus !== "loading" ? <button className="af-small-link" type="button" onClick={reload}>Повторить запрос</button> : null}</section>;
  }

  const item = items[selected] || items[0];
  const percent = total ? Math.round((closed / total) * 100) : 0;
  return <div className="af-method-layout"><section className="af-panel"><PanelHeader title="Gate 0 · решения до production" subtitle={sourceStatus === "ready" ? "Канонический read-only реестр Admin API" : "Проектный demo-реестр без production evidence"} action={<Tag tone={closed === total ? "green" : "red"}>{closed} / {total} CLOSED</Tag>}/><div className="af-gate-list">{items.map((gate,index)=><button type="button" className={selected===index?"selected":""} onClick={()=>setSelected(index)} key={gate.id}><span>{gate.id.replace("G0-", "")}</span><div><strong>{gate.title}</strong><small>{gate.evidenceRequirement}</small></div><Tag tone={gateTone[gate.status] || "red"}>{gateLabel[gate.status] || gate.status}</Tag></button>)}</div></section><aside className="af-panel af-gate-detail"><PanelHeader title="Release readiness" subtitle={closed === total ? "Gate 0 закрыт; release-проверки ещё обязательны" : "Production finance remains blocked"} action={<Tag tone={closed === total ? "green" : "red"}>{percent}%</Tag>}/><div><div className={`af-gate-ring ${closed === total ? "is-complete" : ""}`}><strong>{closed} / {total}</strong></div><dl><div><dt>Выбрано</dt><dd>{item.title}</dd></div><div><dt>Owner / Approver</dt><dd>{item.owner} / {item.approver}</dd></div><div><dt>Evidence</dt><dd>{item.evidenceUrl || "Evidence not attached"}</dd></div><div><dt>Решение</dt><dd>{item.status === "done" ? `Закрыто ${item.decidedAt || "без даты"}` : "Назначить review date и приложить evidence"}</dd></div><div><dt>После Gate 0</dt><dd>Backfill → reconciliation UAT → restore test → controlled release</dd></div></dl></div></aside></div>;
}

function States() {
  return <section className="af-panel"><PanelHeader title="Каталог обязательных состояний" subtitle="Единое поведение всех финансовых экранов" action={<Tag tone="blue">UI CONTRACT</Tag>}/><div className="af-state-catalog">{uiStates.map(([title,body,color])=><article style={{"--state-accent":color}} key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></section>;
}
