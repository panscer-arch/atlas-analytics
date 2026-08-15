import { AlertTriangle, Bell, History, Info, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatMoney, headAccountCompanyWallets, headAccountDirectBranches, headAccountStatusHistory } from "./data/overviewData";
import { partnerCaptureDemoControl } from "./data/partnerCaptureControl";
import { OFFICIAL_PARTNER_RULESET } from "./data/officialPartnerRuleset";

const NOTIFICATIONS_KEY = "atlas.admin.finance.head.notifications.v1";
const defaultNotificationSettings = { h72: true, h48: true, h24: true, status: true, branch: true, compressionNear: true, compressionZero: true, compressionRecovered: true, partnerCaptureWarning: true, partnerCaptureCritical: true, partnerCaptureRecovered: true };
const periods = [["7d", "7 дней"], ["30d", "30 дней"], ["90d", "90 дней"], ["all", "Все время"]];
const riskValues = { "7d": [1420, 920, 310, 190, 41], "30d": [5840, 3180, 1740, 920, 214], "90d": [14820, 7260, 4910, 2650, 538] };

function Tag({ tone = "blue", children }) { return <span className={`af-tag af-tag-${tone}`}>{children}</span>; }
function PanelHeader({ title, subtitle, action }) { return <div className="af-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }
function Metric({ accent, label, tag, tone, value, unit, note, noteTone }) { return <article className="af-metric af-head-metric" style={{ "--metric-accent": accent }}><div className="af-metric-head"><span>{label}</span><Tag tone={tone}>{tag}</Tag></div><div className="af-metric-value">{value} {unit ? <small>{unit}</small> : null}</div><p className={noteTone ? `is-${noteTone}` : ""}>{note}</p></article>; }

function HistoryDialog({ onClose }) {
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-status-history-title"><div className="af-modal-head"><div><span><History size={17} /> Ruleset history</span><h2 id="af-status-history-title">История расчётных статусов</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div><div className="af-status-history"><table><thead><tr><th>Дата</th><th>Статус</th><th>Ставка</th><th>Источник</th><th>Событие</th></tr></thead><tbody>{headAccountStatusHistory.map((row) => <tr key={row.date}><td>{row.date}</td><td><strong>{row.status}</strong></td><td>{row.rate}</td><td>{row.source}</td><td><Tag tone={row.result === "Активен" ? "green" : "blue"}>{row.result}</Tag></td></tr>)}</tbody></table></div><p className="af-modal-warning"><Info size={16} /> История показывает независимый расчёт UI. Production-статус должен подтверждаться Partner contract/API и версией ruleset на каждом as-of block.</p></section></div>;
}

function NotificationDialog({ settings, onClose, onSave }) {
  const [draft, setDraft] = useState(settings);
  const options = [["h72", "За 72 часа до завершения личного цикла"], ["h48", "За 48 часов"], ["h24", "За 24 часа"], ["status", "При угрозе потери статуса"], ["branch", "При просадке квалифицированной ветки"], ["compressionNear", "Когда разрыв ставки ветки становится 5 п.п. или меньше"], ["compressionZero", "Когда ветка догнала или обогнала головной аккаунт"], ["compressionRecovered", "Когда положительный разрыв ставки восстановился"], ["partnerCaptureWarning", "Partner Capture вошёл в коридор 33–34.99%"], ["partnerCaptureCritical", "Partner Capture опустился ниже 33%"], ["partnerCaptureRecovered", "Partner Capture восстановился до 35% или выше"]];
  return <div className="af-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="af-modal af-head-notification-dialog" role="dialog" aria-modal="true" aria-labelledby="af-head-notifications-title"><div className="af-modal-head"><div><span><Bell size={17} /> Контроль</span><h2 id="af-head-notifications-title">Уведомления головного аккаунта</h2></div><button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button></div><div className="af-head-notification-options">{options.map(([id, label]) => <label key={id}><input type="checkbox" checked={draft[id]} onChange={(event) => setDraft((current) => ({ ...current, [id]: event.target.checked }))} /><span>{label}</span></label>)}</div><div className="af-note-actions"><button type="button" onClick={onClose}>Отмена</button><button className="primary" type="button" onClick={() => onSave(draft)}>Сохранить</button></div></section></div>;
}

function ConditionRow({ label, subtitle, color, progress, fact, target, result, resultNote }) {
  return <div className="af-head-condition-row"><div><strong>{label}</strong><span>{subtitle}</span></div><div className="af-head-condition-track"><i style={{ width: `${progress}%`, background: color }} /></div><b>{fact}</b><div><strong>{result}</strong><span>{resultNote}</span></div></div>;
}

export default function AdminFinanceHeadAccount() {
  const [period, setPeriod] = useState("30d");
  const [conditionTab, setConditionTab] = useState("current");
  const [riskPeriod, setRiskPeriod] = useState("7d");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [registryOpen, setRegistryOpen] = useState(false);
  const [branchQuery, setBranchQuery] = useState("");
  const [settings, setSettings] = useState(() => { try { return { ...defaultNotificationSettings, ...(JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY)) || {}) }; } catch { return defaultNotificationSettings; } });
  useEffect(() => { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(settings)); }, [settings]);
  const risk = riskValues[riskPeriod];
  const visibleWallets = registryOpen ? headAccountCompanyWallets : headAccountCompanyWallets.slice(0, 3);
  const notificationCount = useMemo(() => Object.values(settings).filter(Boolean).length, [settings]);
  const visibleBranches = useMemo(() => {
    const normalized = branchQuery.trim().toLowerCase().replace(/^#/, "");
    if (!normalized) return headAccountDirectBranches;
    return headAccountDirectBranches.filter((branch) => `${branch.ordinal} ${branch.atlasId} ${branch.wallet} ${branch.rank}`.toLowerCase().includes(normalized));
  }, [branchQuery]);

  return <div className="af-content">
    <div className="af-head-toolbar"><div className="af-periods" role="tablist">{periods.map(([id, label]) => <button role="tab" aria-selected={period === id} className={period === id ? "active" : ""} type="button" onClick={() => setPeriod(id)} key={id}>{label}</button>)}</div><div className="af-date-control"><span>Срез на дату</span><input type="date" defaultValue="2026-08-04" aria-label="Срез на дату" /></div><div className="af-page-actions"><button type="button" onClick={() => setHistoryOpen(true)}><History size={15} />История статусов</button><button className="primary" type="button" onClick={() => setNotificationsOpen(true)}><Bell size={15} />Уведомления · {notificationCount}</button></div></div>
    <div className="af-head-notice"><Info size={19} /><p><strong>UI-only демонстрация.</strong> Публичные правила сверены с официальной Level-страницей. Production-статусы и доход должны приходить из Partner contract/API; ставка для каждого цикла фиксируется на момент его создания.</p><Tag tone="blue">{OFFICIAL_PARTNER_RULESET.label}</Tag></div>
    <div className="af-head-compression-alert"><AlertTriangle size={19} /><p><strong>Ветка #333 догнала головной аккаунт: 60% = 60%.</strong> Разрыв стал 0 п.п.; новые дифференциальные начисления по этой ветке должны считаться остановленными только после подтверждения Partner API.</p><a href="/admin/participants?q=branch-333">Открыть участника</a></div>

    <section className="af-head-metrics">
      <article className="af-head-profile"><div className="af-head-avatar">HQ</div><div><h2>Atlas Head Account</h2><p>0xA17C4E82...92D4 · protected registry</p><div><Tag tone="green">Активен</Tag><Tag tone="blue">Executive</Tag><Tag tone="brown">Chain 56</Tag></div></div><span>Последнее изменение<br /><strong>блок 54,701,224</strong></span></article>
      <Metric accent="#ff8716" label="Расчётный уровень" tag="DEMO" tone="orange" value="60%" note="Фактическая ставка — no ruleset" />
      <Metric accent="#4e76d0" label="Объем первой линии" tag="28 ВЕТОК" tone="blue" value="$168,420" note="Подтверждённый Principal" />
      <Metric accent="#239a77" label="Фактический доход" tag="30D" tone="green" value="$3,482" note="214 подтверждённых выплат" noteTone="good" />
      <Metric accent="#cf534c" label="Income at Risk" tag="30D" tone="red" value="$5,840" note="При потере текущего статуса" noteTone="risk" />
    </section>

    <div className="af-head-primary-grid">
      <section className="af-panel"><PanelHeader title="Условия удержания и следующий статус" subtitle="Каждое условие рассчитывается по ruleset, действующему на as-of block" action={<Tag tone="blue">Executive · active</Tag>} /><div className="af-head-condition-tabs" role="tablist">{[["current","Условия сейчас"],["gap","Разрыв до статуса"],["history","История"]].map(([id,label]) => <button role="tab" aria-selected={conditionTab === id} className={conditionTab === id ? "active" : ""} type="button" onClick={() => setConditionTab(id)} key={id}>{label}</button>)}</div><div className="af-head-conditions"><ConditionRow label="Личный активный цикл" subtitle="Условие сохранения статуса" color="#239a77" progress={100} fact="Выполнено" result="66 ч" resultNote="до expiry" /><ConditionRow label="Первая линия" subtitle="Подтвержденный Principal" color="#ff8716" progress={84} fact="$168,420" result="$31,580" resultNote="до порога" /><ConditionRow label="Квалифицированные ветки" subtitle="Независимые активные линии" color="#4e76d0" progress={75} fact="3 из 4" result="1 ветка" resultNote="не хватает" /><ConditionRow label="Структурный объем" subtitle="Все подтвержденные уровни" color="#7a5bb8" progress={94} fact="$842,610" result="$57,390" resultNote="до цели" /></div></section>

      <section className="af-panel"><PanelHeader title="Срок личного цикла" subtitle="Контрольные уведомления за 72, 48 и 24 часа" action={<Tag tone="orange">72 ч отправлено</Tag>} /><div className="af-head-cycle"><div className="af-head-cycle-main"><div><span>Осталось до завершения</span><strong>2 д 18 ч</strong></div><div><span>Expiry UTC</span><b>07.08 · 08:00</b></div></div><div className="af-head-alerts"><div className="sent"><span>72 часа</span><strong>Отправлено</strong></div><div className="soon"><span>48 часов</span><strong>Через 18 ч</strong></div><div><span>24 часа</span><strong>Через 42 ч</strong></div></div><div className="af-head-cycle-stats"><div><span>Cost-to-preserve</span><strong>$100</strong></div><div><span>Income at Risk · 30D</span><strong className="risk">$5,840</strong></div></div><div className="af-head-cycle-note">Cost-to-preserve — модельная стоимость выполнения выбранного условия, а не рекомендация пополнить счёт. Перед действием требуется подтверждение актуального ruleset и on-chain состояния.</div></div></section>
    </div>

    <div className="af-head-secondary-grid">
      <section className="af-panel af-head-direct-branches" id="head-direct-branches"><PanelHeader title="Лично приглашённые ветки и компрессия" subtitle="Текущий gap для новых циклов; исторический доход считается по snapshot ставки при создании цикла" action={<Tag tone="orange">5 DEMO из 28</Tag>} /><label className="af-head-branch-search"><Search size={14} /><input value={branchQuery} onChange={(event) => setBranchQuery(event.target.value)} placeholder="№ ветки, Atlas ID, кошелёк или статус" /></label><div className="af-table-scroll"><table><thead><tr><th>Ветка</th><th>Лидер</th><th className="number">Ставка ветки</th><th className="number">Наша ставка</th><th className="number">Разрыв</th><th className="number">Доход · 30D</th><th>Сигнал</th></tr></thead><tbody>{visibleBranches.map((branch) => <tr key={branch.ordinal}><td><a href={`/admin/participants?q=branch-${branch.ordinal}`}><strong>#{branch.ordinal}</strong></a><small>неизменяемый номер</small></td><td><strong>{branch.atlasId}</strong><small>{branch.wallet} · {branch.rank}</small></td><td className="number">{branch.branchRate}%</td><td className="number">{branch.headRate}%</td><td className={`number ${branch.gap === 0 ? "is-risk" : branch.gap <= 5 ? "is-warning" : ""}`}><strong>{branch.gap} п.п.</strong></td><td className="number">{formatMoney(branch.income30d)}</td><td><Tag tone={branch.tone}>{branch.stateLabel}</Tag><small>{branch.changed}</small></td></tr>)}</tbody></table></div><div className="af-head-panel-note">Разрыв = max(ставка головного аккаунта − ставка ветки, 0). Для нового цикла берётся ставка, действующая в момет его создания. Последующее изменение статуса не должно переписывать snapshot этого цикла. Доход признаётся только по подтверждённому transfer.</div></section>

      <section className="af-panel"><PanelHeader title="Доход под риском" subtitle="Модельная разница при потере текущего статуса" action={<div className="af-head-risk-tabs">{["7d","30d","90d"].map((id) => <button className={riskPeriod === id ? "active" : ""} type="button" onClick={() => setRiskPeriod(id)} key={id}>{id.toUpperCase()}</button>)}</div>} /><div className="af-head-risk"><div><span>Income at Risk</span><strong>{formatMoney(risk[0])}</strong><b>{risk[4]} выплаты затронуты</b></div><article><span>Истекающий личный цикл<small>Потеря условия статуса</small></span><strong>{formatMoney(risk[1])}</strong></article><article><span>Падение объема Branch C<small>До порога $3,400</small></span><strong>{formatMoney(risk[2])}</strong></article><article><span>Claim timing<small>Сценарная неопределённость</small></span><strong>{formatMoney(risk[3])}</strong></article></div></section>
    </div>

    <section className="af-panel af-head-capture-control">
      <PanelHeader title="Доля Atlas в партнёрских выплатах" subtitle="Операционный контроль дохода Head Account относительно всех выплаченных Partner Rewards" action={<Tag tone="orange">TARGET 35% · DEMO</Tag>} />
      <div className="af-head-capture-grid">
        <div className="af-head-capture-rate"><span>Фактическая доля</span><strong>{partnerCaptureDemoControl.ratePercent.toFixed(2)}%</strong><small className="is-good">На цели · {partnerCaptureDemoControl.gapPercentagePoints.toFixed(2)} п.п.</small></div>
        <div className="af-head-capture-stat"><span>Выплачено сети</span><strong>{formatMoney(partnerCaptureDemoControl.grossPaid)}</strong><small>Gross Partner Rewards</small></div>
        <div className="af-head-capture-stat"><span>Поступило Atlas</span><strong>{formatMoney(partnerCaptureDemoControl.atlasIncome)}</strong><small>Без Platform Fee</small></div>
        <div className="af-head-capture-stat"><span>Недобор до цели</span><strong>{formatMoney(partnerCaptureDemoControl.shortfall)}</strong><small>При текущем gross payout</small></div>
      </div>
      <div className="af-head-capture-policy"><div><strong>Зелёный коридор</strong><span>от 35%</span></div><div><strong>Наблюдение</strong><span>33–34.99%</span></div><div><strong>Критично</strong><span>ниже 33%</span></div><p>При отклонении сначала проверяются attribution, компрессия и статусы веток. Это диагностика, а не рекомендация вносить средства.</p></div>
      <footer className="af-head-capture-foot"><span>Сигнал: 2 последовательных finalized-среза ниже порога</span><a href="/admin/company-revenue">Открыть экономику партнёрки</a></footer>
    </section>

    <div className="af-head-lower-grid">
      <section className="af-panel af-head-wallets"><PanelHeader title="Средства компании в первой линии" subtitle="Только адреса из защищенного реестра company-owned wallets" action={<button className="af-small-link" type="button" onClick={() => setRegistryOpen((value) => !value)}>{registryOpen ? "Свернуть" : "Открыть реестр"}</button>} /><div className="af-table-scroll"><table><thead><tr><th>Кошелек</th><th>Назначение</th><th className="number">Principal</th><th className="number">Циклы</th><th>Ближайшее завершение</th><th className="number">Delta факт</th></tr></thead><tbody>{visibleWallets.map((row) => <tr key={row.wallet}><td><strong>{row.wallet}</strong><small>{row.line}</small></td><td>{row.purpose}</td><td className="number">{formatMoney(row.principal)}</td><td className="number">{row.cycles}</td><td>{row.maturity}</td><td className="number">{formatMoney(row.delta)}</td></tr>)}</tbody></table></div><div className="af-head-wallets-foot"><span>Средства компании отделены от пользовательских средств и ликвидности платформы</span><strong>{formatMoney(headAccountCompanyWallets.reduce((sum, row) => sum + row.principal, 0))} Principal</strong></div></section>

      <section className="af-panel"><PanelHeader title="Структура и контроль" subtitle="Сводка первой линии на одном as-of block" action={<Tag tone="green">28 веток</Tag>} /><div className="af-head-structure"><div><span>Вся структура</span><strong>1,842</strong></div><div><span>Структурный Principal</span><strong>$842,610</strong></div><div><span>Активные ветки</span><strong>24 / 28</strong></div><div><span>Доля Top-3</span><strong>58.7%</strong></div></div><div className="af-head-structure-note">Ветка C находится в $3,400 от порога, влияющего на сохранение статуса. Риск и расчёт раскрываются в «Контроле рисков».</div><div className="af-head-source"><span>Источник статуса</span><strong>Partner contract + independent calculation</strong></div></section>
    </div>
    {historyOpen ? <HistoryDialog onClose={() => setHistoryOpen(false)} /> : null}
    {notificationsOpen ? <NotificationDialog settings={settings} onClose={() => setNotificationsOpen(false)} onSave={(next) => { setSettings(next); setNotificationsOpen(false); }} /> : null}
  </div>;
}
