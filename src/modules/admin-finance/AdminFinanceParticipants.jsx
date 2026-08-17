import { AlertCircle, LockKeyhole, Plus, Search, Settings2, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { firstLineParticipants, formatMoney, participantGrowth } from "./data/overviewData";
import { useAdminFinanceParticipantProfile } from "./api/useAdminFinanceApi";

const NOTES_KEY = "atlas.admin.finance.participant.notes.v1";
const defaultNotes = [
  { id: "seed-1", author: "Алексей", date: "10.08.2026", time: "", text: "Проверить достижение $20,000 первой линии и обсудить следующий транш.", reminder: true },
  { id: "seed-2", author: "Мария", date: "02.08.2026", time: "14:20 UTC", text: "Передан депозит $1,000. KPI согласован на 30 дней, подтверждение операции прикреплено.", reminder: false },
  { id: "seed-3", author: "Алексей", date: "29.07.2026", time: "09:45 UTC", text: "Лидер сообщил план по подключению пяти новых активных кошельков.", reminder: false },
];

const profileTabs = [
  ["overview", "Обзор"],
  ["first", "Первая линия · 28"],
  ["structure", "Вся структура · 413"],
  ["cycles", "Циклы · 17"],
  ["payouts", "Выплаты · 96"],
  ["funds", "Средства компании"],
  ["notes", "Заметки"],
  ["journal", "Журнал"],
];

function Tag({ tone = "blue", children }) {
  return <span className={`af-tag af-tag-${tone}`}>{children}</span>;
}

function Metric({ accent, label, tag, tone, value, unit, note, noteTone }) {
  return <article className="af-metric af-participant-metric" style={{ "--metric-accent": accent }}>
    <div className="af-metric-head"><span>{label}</span>{tag ? <Tag tone={tone}>{tag}</Tag> : null}</div>
    <div className="af-metric-value">{value} {unit ? <small>{unit}</small> : null}</div>
    <p className={noteTone ? `is-${noteTone}` : ""}>{note}</p>
  </article>;
}

function PanelHeader({ title, subtitle, action }) {
  return <div className="af-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>;
}

function GrowthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="af-chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.dataKey}>{item.name}: {formatMoney(item.value)}</span>)}</div>;
}

function NoteDialog({ onClose, onSave }) {
  const [text, setText] = useState("");
  const [reminder, setReminder] = useState(false);
  function submit(event) {
    event.preventDefault();
    if (!text.trim()) return;
    onSave({
      id: `note-${Date.now()}`,
      author: "Администратор",
      date: new Date().toLocaleDateString("ru-RU"),
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) + " UTC",
      text: text.trim(),
      reminder,
    });
  }
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="af-modal af-note-dialog" role="dialog" aria-modal="true" aria-labelledby="af-note-title" onSubmit={submit}>
      <div className="af-modal-head"><div><span><Plus size={17} /> Leader Management</span><h2 id="af-note-title">Новая административная заметка</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div>
      <div className="af-note-form">
        <label><span>Заметка</span><textarea autoFocus value={text} onChange={(event) => setText(event.target.value)} placeholder="Решение, следующий шаг или договоренность с лидером" /></label>
        <label className="af-note-check"><input type="checkbox" checked={reminder} onChange={(event) => setReminder(event.target.checked)} /><span>Отметить как напоминание</span></label>
        <p>Заметка относится к профилю #A-2049. В production автор, время и изменения должны фиксироваться в audit log.</p>
      </div>
      <div className="af-note-actions"><button type="button" onClick={onClose}>Отмена</button><button className="primary" type="submit" disabled={!text.trim()}>Сохранить</button></div>
    </form>
  </div>;
}

function KpiDialog({ onClose }) {
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-kpi-title">
      <div className="af-modal-head"><div><span><Settings2 size={17} /> KPI</span><h2 id="af-kpi-title">План лидера #A-2049</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div>
      <dl><div><dt>Период</dt><dd>30 дней · до 10.08.2026</dd></div><div><dt>Первая линия</dt><dd>$20,000 привлеченного Principal</dd></div><div><dt>Активные кошельки</dt><dd>25 кошельков с первым циклом</dd></div><div><dt>Средства компании</dt><dd>$1,000 · подтверждено</dd></div><div><dt>Текущий прогноз</dt><dd>86% выполнения · дефицит $5,180</dd></div></dl>
      <p className="af-modal-warning">Настройка KPI является административной меткой и не меняет on-chain расчеты, статусы или выплаты участника.</p>
    </section>
  </div>;
}

function KpiRow({ label, value, detail, color }) {
  return <div className="af-kpi-row"><div><span>{label}</span><b>{detail}</b></div><div className="af-kpi-track"><i style={{ width: `${value}%`, background: color }} /></div><strong>{value}%</strong></div>;
}

function StaticParticipants() {
  const initialQuery = new URLSearchParams(window.location.search).get("q") || "0x71A4...9B2F";
  const [query, setQuery] = useState(initialQuery);
  const [searchState, setSearchState] = useState("found");
  const [activeTab, setActiveTab] = useState("overview");
  const [noteOpen, setNoteOpen] = useState(false);
  const [kpiOpen, setKpiOpen] = useState(false);
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || defaultNotes; } catch { return defaultNotes; }
  });

  useEffect(() => { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }, [notes]);
  const noteLabel = useMemo(() => `Заметки · ${notes.length}`, [notes.length]);

  function findParticipant(event) {
    event.preventDefault();
    const normalized = query.toLowerCase().replace(/\s/g, "");
    const branchOrdinal = normalized.match(/^(?:#|branch-|ветка-)?(333)$/)?.[1];
    setSearchState(normalized.includes("71a4") || normalized.includes("a-2049") || normalized.includes("atlas-a2049") || branchOrdinal ? "found" : "empty");
  }
  function addNote(note) {
    setNotes((current) => [note, ...current]);
    setNoteOpen(false);
    setActiveTab("notes");
  }

  return <div className="af-content af-participants-content">
    <div className="af-participant-toolbar"><div /><div className="af-page-actions"><button type="button" onClick={() => setKpiOpen(true)}><Settings2 size={15} />Настроить KPI</button><button className="primary" type="button" onClick={() => setNoteOpen(true)}><Plus size={15} />Добавить заметку</button></div></div>
    <form className="af-participant-search" onSubmit={findParticipant}>
      <label><Search size={20} /><input aria-label="Поиск участника" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Кошелек, Atlas ID, ссылка или № личной ветки" /></label>
      <span>Поиск по всей истории контрактов</span>
      <button type="submit">Найти участника</button>
    </form>

    {searchState === "empty" ? <section className="af-participant-empty"><Search size={25} /><h2>Участник не найден</h2><p>Проверьте полный адрес кошелька, referral ID или реферальную ссылку. Поиск не раскрывает данные похожих адресов.</p></section> : <>
      <div className="af-participant-tabs" role="tablist">{profileTabs.map(([id, label]) => <button role="tab" aria-selected={activeTab === id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)} type="button" key={id}>{id === "notes" ? noteLabel : label}</button>)}</div>

      <section className="af-participant-metrics">
        <article className="af-participant-card">
          <div className="af-participant-avatar">L24</div><div><h2>Leader #A-2049</h2><p>0x71A4c8F2...9B2F · ref/atlas-a2049</p><div><Tag tone="green">Активен</Tag><Tag tone="blue">Master 2</Tag><Tag tone="orange">Ветка HQ #333</Tag><Tag tone="blue">Средства компании</Tag></div></div><button type="button" aria-label="Дополнительные действия">•••</button>
        </article>
        <Metric accent="#ff8716" label="Первая линия" tag="28" tone="orange" value="$31,420" unit="USDT" note="21 кошелек с циклами" />
        <Metric accent="#4e76d0" label="Вся структура" tag="413" tone="blue" value="$84,600" unit="USDT" note="Объем созданных циклов" />
        <Metric accent="#239a77" label="Получено выплат" tag="DEMO" tone="green" value="$12,842" unit="USDT" note="Partner $8,930 · Delta $3,912" noteTone="good" />
        <Metric accent="#503021" label="Активные циклы" tag="DEMO" tone="brown" value="11" unit="из 17" note="Principal $6,800" />
        <Metric accent="#7a5bb8" label="KPI лидера" tag="30 ДНЕЙ" tone="violet" value="78%" note="Следующая проверка 10 августа" />
      </section>

      <div className="af-participant-main-grid">
        <section className="af-panel">
          <PanelHeader title="Динамика привлеченного объема" subtitle="Новые циклы по неделям · первая линия и остальная структура" action={<div className="af-chart-legend"><span><i style={{ background: "#ff8716" }} />Первая линия</span><span><i style={{ background: "#4e76d0" }} />Глубже первой линии</span><span><i style={{ background: "#239a77" }} />Накопительный объем</span></div>} />
          <div className="af-participant-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={participantGrowth} margin={{ top: 12, right: 20, bottom: 8, left: 2 }}><CartesianGrid stroke="#eadfd5" vertical={false} /><XAxis dataKey="period" tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => `$${value / 1000}k`} tick={{ fontSize: 8, fill: "#79675e" }} axisLine={false} tickLine={false} /><Tooltip content={<GrowthTooltip />} /><Bar isAnimationActive={false} dataKey="firstLine" name="Первая линия" stackId="volume" fill="#ff8716" radius={[3,3,0,0]} /><Bar isAnimationActive={false} dataKey="deeper" name="Глубже первой линии" stackId="volume" fill="#4e76d0" radius={[3,3,0,0]} /><Line isAnimationActive={false} type="monotone" dataKey="cumulative" name="Накопительный объем" stroke="#239a77" strokeWidth={3} dot={{ r: 4, fill: "#fff", strokeWidth: 3 }} /></ComposedChart></ResponsiveContainer></div>
        </section>

        <section className="af-panel af-kpi-panel">
          <PanelHeader title="Средства компании и KPI" subtitle="Контроль результата после предоставления $1,000" action={<Tag tone="blue">Активный план</Tag>} />
          <div className="af-kpi-body"><div className="af-kpi-summary"><div><span>Предоставлено</span><strong>$1,000</strong></div><div><span>Результат для структуры</span><strong>$14,820</strong></div></div><KpiRow label="Объем первой линии" detail="$14,820 / $20,000" value={74} color="#ff8716" /><KpiRow label="Кошельки с первым циклом" detail="21 / 25" value={84} color="#4e76d0" /><KpiRow label="Активность первой линии" detail="19 / 21" value={90} color="#239a77" /><KpiRow label="Срок выполнения плана" detail="22 / 30 дней" value={73} color="#7a5bb8" /><div className="af-kpi-forecast">Прогноз выполнения: <strong>86%</strong>. Для достижения плана до 10 августа не хватает $5,180 объема первой линии и 4 активированных кошельков.</div></div>
        </section>
      </div>

      <div className="af-participant-lower-grid">
        <section className="af-panel af-first-line">
          <PanelHeader title="Первая линия" subtitle="Ключевые участники, созданные циклы и полученные выплаты" action={<button className="af-small-link" type="button" onClick={() => setActiveTab("first")}>Открыть все 28</button>} />
          <div className="af-table-scroll"><table><thead><tr><th>Участник</th><th>Статус</th><th className="number">Principal</th><th className="number">Циклы</th><th className="number">Partner</th><th className="number">Delta</th><th>Активность</th></tr></thead><tbody>{firstLineParticipants.map((row) => <tr key={row.wallet}><td><strong>{row.wallet}</strong><small>В структуре {row.depth} дня</small></td><td><Tag tone={row.tone}>{row.status}</Tag></td><td className="number">{formatMoney(row.principal)}</td><td className="number">{row.cycles}</td><td className="number">{formatMoney(row.partner)}</td><td className="number">{formatMoney(row.delta)}</td><td>{row.activity}</td></tr>)}</tbody></table></div>
        </section>

        <section className="af-panel af-notes-panel">
          <PanelHeader title="Административные заметки" subtitle="Видны только сотрудникам с разрешением Leader Management" action={<button className="af-note-add" type="button" onClick={() => setNoteOpen(true)}><Plus size={14} />Добавить</button>} />
          <div className="af-notes-list">{notes.map((note) => <article className={note.reminder ? "reminder" : ""} key={note.id}><div><span>{note.reminder ? "Напоминание" : note.date} {note.time ? ` · ${note.time}` : ""}</span><b>{note.author}</b></div><p>{note.text}</p></article>)}</div>
          <p className="af-notes-audit">Все изменения заметок фиксируются в audit log. Удаление доступно только администратору безопасности.</p>
        </section>
      </div>
    </>}
    {noteOpen ? <NoteDialog onClose={() => setNoteOpen(false)} onSave={addNote} /> : null}
    {kpiOpen ? <KpiDialog onClose={() => setKpiOpen(false)} /> : null}
  </div>;
}

function atomicDecimal(value) {
  if (!value) return "0";
  const decimals = Number(value.decimals || 0);
  const negative = String(value.amountRaw).startsWith("-");
  const digits = negative ? String(value.amountRaw).slice(1) : String(value.amountRaw);
  const padded = digits.padStart(decimals + 1, "0");
  const whole = decimals ? padded.slice(0, -decimals) : padded;
  const fraction = decimals ? padded.slice(-decimals).replace(/0+$/, "") : "";
  return `${negative ? "-" : ""}${whole || "0"}${fraction ? `.${fraction}` : ""}`;
}

function formatWireMoney(value) {
  const amount = Number(atomicDecimal(value));
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 3 }).format(amount)
    : "N/A";
}

function formatUtc(value) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function ParticipantRequestState({ request }) {
  const title = request.status === "loading"
    ? "Загрузка профиля"
    : request.status === "auth-required"
      ? "Нужна админ-сессия"
      : "Профиль участника недоступен";
  const copy = request.status === "loading"
    ? "Проверяем точное совпадение и получаем маскированную participant projection."
    : request.status === "auth-required"
      ? "API вернул 401. Псевдонимные данные и старый mock-профиль не подставлены."
      : "Запрос не выполнен. Финансовые показатели намеренно скрыты до восстановления источника.";
  return <section className="af-api-boundary" aria-live="polite">
    <AlertCircle size={24} />
    <span>PARTICIPANT ECONOMICS · FAIL-CLOSED</span>
    <h2>{title}</h2>
    <p>{copy}</p>
    {request.status !== "loading" ? <button type="button" onClick={request.reload}>Повторить запрос</button> : null}
    <a href="/admin/methodology#access">Проверить доступ и источники</a>
  </section>;
}

function ParticipantUnavailable({ title, copy }) {
  return <section className="af-panel af-participant-unavailable">
    <LockKeyhole size={24} />
    <h2>{title}</h2>
    <p>{copy}</p>
    <span>N/A · источник не подключён</span>
  </section>;
}

function ApiFirstLine({ rows, total, partial }) {
  return <section className="af-panel af-first-line af-api-first-line">
    <PanelHeader
      title="Первая линия"
      subtitle="Маскированные участники, Principal, циклы и фактические выплаты"
      action={<Tag tone={partial ? "orange" : "green"}>{rows.length} из {total}</Tag>}
    />
    <div className="af-table-scroll"><table><thead><tr>
      <th>Участник</th><th>Статус</th><th className="number">Principal</th><th className="number">Циклы</th><th className="number">Partner</th><th className="number">Delta</th><th>Активность</th>
    </tr></thead><tbody>{rows.map((row) => <tr key={row.participantId}>
      <td><strong>{row.maskedWallet}</strong><small>{row.atlasId} · адрес защищён</small></td>
      <td><Tag tone={row.riskState === "none" ? "green" : "orange"}>{row.riskState === "none" ? row.rankLabel : "Риск"}</Tag></td>
      <td className="number">{formatWireMoney(row.principal)}</td>
      <td className="number">{row.activeCycleCount} / {row.cycleCount}</td>
      <td className="number">{formatWireMoney(row.partnerReceived)}</td>
      <td className="number">{formatWireMoney(row.deltaReceived)}</td>
      <td>{formatUtc(row.lastActivityAt)}</td>
    </tr>)}</tbody></table></div>
    {partial ? <div className="af-claims-foot">Показана demo-выборка. Остальные строки не восстанавливаются из агрегата первой линии.</div> : null}
  </section>;
}

function ApiParticipantOverview({ profileResponse, firstLineResponse, onShowFirstLine }) {
  const profile = profileResponse.data;
  const firstLineRows = firstLineResponse.data;
  return <>
    <section className="af-participant-metrics">
      <article className="af-participant-card">
        <div className="af-participant-avatar">{profile.atlasId.replace(/\D/g, "").slice(-2)}</div>
        <div><h2>Leader #{profile.atlasId}</h2><p>{profile.maskedWallet} · ref/{profile.referralCode}</p><div>
          <Tag tone={profile.status === "active" ? "green" : "orange"}>{profile.status === "active" ? "Активен" : profile.status}</Tag>
          <Tag tone="blue">{profile.currentRankLabel}</Tag>
          {profile.headAccountBranchOrdinal ? <Tag tone="orange">Ветка HQ #{profile.headAccountBranchOrdinal}</Tag> : null}
          <Tag tone="blue">Адрес защищён</Tag>
        </div></div>
        <ShieldCheck size={18} aria-label="Псевдонимный профиль" />
      </article>
      <Metric accent="#ff8716" label="Первая линия" tag={`${profile.firstLine.participantCount}`} tone="orange" value={formatWireMoney(profile.firstLine.principal)} note={`${profile.firstLine.walletsWithCycles} кошелек с циклами`} />
      <Metric accent="#4e76d0" label="Вся структура" tag={`${profile.structure.participantCount}`} tone="blue" value={formatWireMoney(profile.structure.principal)} note={`Глубина ${profile.structure.maxDepth} · ${profile.structure.activeCycles} активных циклов`} />
      <Metric accent="#239a77" label="Получено выплат" tag="API DATA" tone="green" value={formatWireMoney(profile.received.total)} note={`Partner ${formatWireMoney({ ...profile.received.partnerRewardCreationNet, amountRaw: String(BigInt(profile.received.partnerRewardCreationNet.amountRaw) + BigInt(profile.received.partnerRewardClaimNet.amountRaw)) })} · Delta ${formatWireMoney(profile.received.deltaNet)}`} noteTone="good" />
      <Metric accent="#503021" label="Активные циклы" tag="API DATA" tone="brown" value={profile.firstLine.activeCycles} unit={`из ${profile.firstLine.activeCycles + profile.firstLine.closedCycles}`} note="Первая линия · aggregate" />
      <Metric accent="#7a5bb8" label="Будущие обязательства" tag="EXPOSURE" tone="violet" value={formatWireMoney(profile.futureObligations)} note="Отнесено к структуре участника" />
    </section>

    <div className="af-participant-main-grid">
      <ParticipantUnavailable title="Динамика привлечённого объёма" copy="Недельная series и rank history отсутствуют в demo participant projection. График не строится из итоговых агрегатов." />
      <section className="af-panel af-participant-facts">
        <PanelHeader title="Статус и активность" subtitle="UTC · один finalized as-of block" action={<Tag tone="green">MASKED</Tag>} />
        <div className="af-claim-detail-body"><dl>
          <div><dt>Atlas ID</dt><dd>{profile.atlasId}</dd></div>
          <div><dt>Sponsor</dt><dd>{profile.sponsor.atlasId} · {profile.sponsor.maskedWallet}</dd></div>
          <div><dt>Дата входа · UTC</dt><dd>{formatUtc(profile.registeredAt)}</dd></div>
          <div><dt>Последняя on-chain активность</dt><dd>{formatUtc(profile.activity.lastOnchainAt)}</dd></div>
          <div><dt>Последняя кабинетная активность</dt><dd>{formatUtc(profile.activity.lastCabinetAt)}</dd></div>
          <div><dt>Wallet reveal</dt><dd className="is-risk">Недоступен в demo</dd></div>
        </dl></div>
      </section>
    </div>

    <div className="af-participant-lower-grid">
      <ApiFirstLine rows={firstLineRows} total={profile.firstLine.participantCount} partial={firstLineResponse.meta.partial} />
      <ParticipantUnavailable title="KPI, средства компании и заметки" copy="Эти данные требуют leader_management, MFA step-up, серверного хранения и audit log. Локальные заметки в API-режиме отключены." />
    </div>
    <button className="af-participant-first-line-jump" type="button" onClick={onShowFirstLine}>Открыть первую линию отдельно</button>
  </>;
}

export default function AdminFinanceParticipants() {
  const initialQuery = new URLSearchParams(window.location.search).get("q") || "atlas-a2049";
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState("overview");
  const request = useAdminFinanceParticipantProfile(submittedQuery);

  if (!request.apiEnabled) return <StaticParticipants />;

  function submit(event) {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 3 && !/^(?:#|branch-|ветка-)?\d{1,12}$/i.test(value)) return;
    setSubmittedQuery(value);
    setActiveTab("overview");
  }

  const ready = request.status === "ready" ? request.data : null;
  const profileResponse = ready?.profile;
  const firstLineResponse = ready?.firstLine;
  const searchRows = ready?.search?.data || [];
  const profile = profileResponse?.data;
  const tabs = profile ? [
    ["overview", "Обзор"],
    ["first", `Первая линия · ${profile.firstLine.participantCount}`],
    ["structure", `Вся структура · ${profile.structure.participantCount}`],
    ["cycles", "Циклы · N/A"],
    ["payouts", "Выплаты · N/A"],
    ["funds", "Средства компании"],
    ["notes", "Заметки"],
    ["journal", "Журнал"],
  ] : [];

  return <div className="af-content af-participants-content af-participants-api">
    <div className="af-participant-toolbar"><div /><div className="af-page-actions">
      <button type="button" disabled title="KPI API и step-up ещё не подключены"><Settings2 size={15} />Настроить KPI</button>
      <button className="primary" type="button" disabled title="Notes API и audit log ещё не подключены"><Plus size={15} />Добавить заметку</button>
    </div></div>
    <form className="af-participant-search" onSubmit={submit}>
      <label><Search size={20} /><input required minLength={1} maxLength={180} aria-label="Поиск участника" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Полный кошелек, Atlas ID, referral URL или № личной ветки" /></label>
      <span>Точное совпадение · № ветки стабилен внутри головного аккаунта</span>
      <button type="submit">Найти участника</button>
    </form>

    {request.status !== "ready" ? <ParticipantRequestState request={request} /> : !profileResponse ? <section className="af-participant-empty">
      <Search size={25} />
      <h2>{searchRows.length ? "Нужен точный идентификатор" : "Участник не найден"}</h2>
      <p>{searchRows.length ? `Найдено только частичное совпадение ${searchRows[0].maskedWallet}. Введите полный адрес, Atlas ID или referral URL: неоднозначный профиль не открывается автоматически.` : "Проверьте полный адрес кошелька, Atlas ID или реферальную ссылку. Похожие адреса и чужие профили не раскрываются."}</p>
    </section> : <>
      <div className={`af-quality-notice ${profileResponse.meta.partial || firstLineResponse.meta.partial ? "is-partial" : ""}`}>
        <span><AlertCircle size={13} /></span>
        <p><strong>Псевдонимный профиль · частичное покрытие.</strong> Блок {profileResponse.meta.asOfBlockNumber.toLocaleString("en-US")} · {profileResponse.meta.finality} · rank history, growth series и защищённые ресурсы не подключены.</p>
        <b>{profileResponse.meta.reconciliationStatus}</b>
      </div>
      <div className="af-participant-tabs" role="tablist">{tabs.map(([id, label]) => <button role="tab" aria-selected={activeTab === id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)} type="button" key={id}>{label}</button>)}</div>
      {activeTab === "overview" ? <ApiParticipantOverview profileResponse={profileResponse} firstLineResponse={firstLineResponse} onShowFirstLine={() => setActiveTab("first")} />
        : activeTab === "first" ? <ApiFirstLine rows={firstLineResponse.data} total={profile.firstLine.participantCount} partial={firstLineResponse.meta.partial} />
          : <ParticipantUnavailable title={tabs.find(([id]) => id === activeTab)?.[1] || "Раздел недоступен"} copy="Канонический resource endpoint для этого раздела ещё не подключён. Интерфейс не подставляет данные из старого статического профиля." />}
    </>}
  </div>;
}
