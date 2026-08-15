import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import crmCss from "./ListingsCrmBoard.css?raw";
import {
  archiveListingsRecord,
  claimListingsTask,
  createListingsRecord,
  generateListingsPlan,
  loadListingsCrm,
  patchListingsRecord,
  patchListingsTask,
  releaseListingsTask,
} from "../services/listingsTeamCrmApi";

type Member = { id: string; name: string; role: string; active: boolean; capacity?: number };
type ProofItem = { id: string; url: string; fileName: string; createdAt: string; note: string };
type CrmRecord = {
  id: string; source: string; name: string; type: string; priority: string; status: string;
  owner: string; ownerId?: string; dueDate: string; firstContact: string; action: string;
  summary: string; benefit: string; price: string; notes: string; channel: string; link: string;
  updatedAt: string; version: number; paymentAmount?: string; paymentOptions?: string;
  paymentReference?: string; paymentInstructions?: string; proofs?: ProofItem[];
  placementStart?: string; placementTerm?: string; renewalDate?: string; renewalNotes?: string;
};
type WorkTask = {
  id: string; recordId?: string; title: string; category: string; status: string; priority: string;
  points: number; assigneeId?: string | null; dueDate: string; nextAction?: string; version: number;
};
type AuditEvent = { id: string; action: string; actorName?: string; memberName?: string; entityName?: string; createdAt: string };
type Bootstrap = { members: Member[]; records: CrmRecord[]; tasks: WorkTask[]; audit: AuditEvent[] };

const EMPTY: Bootstrap = { members: [], records: [], tasks: [], audit: [] };
const MEMBER_KEY = "atlas.listings.crm.member.v1";
const RECORD_STATUSES = [
  "Не обработано", "Требует проверки", "Готовим обращение", "Отправлено — ждём ответ",
  "Ожидаем ответ", "Ожидаем оплату", "Проверка публикации", "Запланировано позже",
  "В работе", "Опубликовано", "Блокер", "Закрыто",
];
const NAV = [
  { id: "overview", label: "Обзор", icon: "⌂" },
  { id: "today", label: "Мой день", icon: "✓" },
  { id: "team", label: "Команда", icon: "◉" },
  { id: "records", label: "Все записи", icon: "≡" },
  { id: "activity", label: "Журнал", icon: "↺" },
];
const TASK_LABELS: Record<string, string> = {
  READY: "Свободна", CLAIMED: "Взята", IN_PROGRESS: "В работе", WAITING_EXTERNAL: "Ждём ответ",
  REVIEW: "На проверке", BLOCKED: "Блокер", DONE: "Готово", CANCELLED: "Отменена",
};
const ROLE_LABELS: Record<string, string> = {
  LISTINGS_OPERATOR: "Листинги", RELATIONSHIP_OPERATOR: "Контакты",
  DUTY_COORDINATOR: "Координатор", RESERVE: "Резерв",
};
const RECORD_CATEGORIES = [
  { id: "hyip", label: "HYIP-мониторы", short: "Мониторы", description: "Мониторинги и профильные каталоги", icon: "H" },
  { id: "dapp", label: "DApp / Web3-листинги", short: "DApp / Web3", description: "Каталоги, кошельки и discovery-площадки", icon: "D" },
  { id: "articles", label: "Статьи и медиа", short: "Статьи / медиа", description: "PR, гостевые статьи и бесплатные публикации", icon: "A" },
  { id: "mlm", label: "MLM-площадки", short: "MLM", description: "Каталоги, ассоциации и отраслевые ресурсы", icon: "M" },
  { id: "contacts", label: "Коннекторы и лидеры", short: "Контакты", description: "Сетевики, коучи и business connectors", icon: "C" },
  { id: "promo", label: "Реклама и агентства", short: "Реклама", description: "Платные каналы, агентства и рекламные сети", icon: "P" },
  { id: "partnerships", label: "События и партнёрства", short: "Партнёрства", description: "Конференции, сообщества и коллаборации", icon: "E" },
  { id: "other", label: "Контроль и прочее", short: "Прочее", description: "Служебные карточки и ручная классификация", icon: "O" },
] as const;

type RecordCategoryId = typeof RECORD_CATEGORIES[number]["id"];

function recordCategoryId(record: CrmRecord): RecordCategoryId {
  const source = String(record.source || "").toLowerCase();
  const type = String(record.type || "").toLowerCase();
  const name = String(record.name || "").toLowerCase();
  const haystack = `${source} ${type} ${name}`;
  if (/hyip|хайп|monitor/.test(haystack)) return "hyip";
  if (/new member|premium member|business connector|коннектор|коуч|coach|тренер|сетев(ой|ик)|network leader|community leader|подкаст/.test(haystack)) return "contacts";
  if (source.includes("mlm-каналы") || /mlm|direct selling|network marketing|referral marketplace|партнерск.*каталог/.test(haystack)) return "mlm";
  if (source.startsWith("листинги") || /dapp|web3 app|web3 project|wallet|кошельк|on-chain|ончейн|defi|project directory|product hunt|discovery platform/.test(haystack)) return "dapp";
  if (source === "pr" || source.includes("collaborator") || /article|стать|media|медиа|press|editorial|publication|публикац|guest|op-ed/.test(haystack)) return "articles";
  if (source === "промо" || source.includes("telegram-реклама") || /агентств|advert|реклам|sponsored|баннер/.test(haystack)) return "promo";
  if (source === "партнёрства" || /event|событ|conference|конференц|congress|community|партн[её]р/.test(haystack)) return "partnerships";
  return "other";
}

function recordCategory(record: CrmRecord) {
  const id = recordCategoryId(record);
  return RECORD_CATEGORIES.find((category) => category.id === id) || RECORD_CATEGORIES.at(-1)!;
}

function localDate(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" });
}

function shortDate(value: string) {
  if (!value) return "Без даты";
  const normalized = value.includes(".") ? value.split(".").reverse().join("-") : value;
  const date = new Date(normalized + (normalized.length === 10 ? "T12:00:00" : ""));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function toneFor(status: string) {
  const value = status.toLowerCase();
  if (value.includes("done") || value.includes("готов") || value.includes("опублик") || value.includes("in_progress") || value.includes("в работе")) return "green";
  if (value.includes("cancel") || value.includes("закры") || value.includes("блок")) return "red";
  if (value.includes("оплат") || value.includes("review")) return "violet";
  if (value.includes("wait") || value.includes("ожида") || value.includes("провер") || value.includes("claim")) return "amber";
  return "gray";
}

function normalizeBootstrap(payload: any): Bootstrap {
  const value = payload?.data || payload || {};
  return {
    members: Array.isArray(value.members) ? value.members : [],
    records: Array.isArray(value.records) ? value.records.filter((record: any) => !record.archivedAt && record.status !== "Архив").map((record: any) => ({ ...record, version: Number(record.version || 1) })) : [],
    tasks: Array.isArray(value.tasks) ? value.tasks.map((task: any) => ({ ...task, version: Number(task.version || 1), points: Number(task.points || 1) })) : [],
    audit: Array.isArray(value.audit) ? value.audit : Array.isArray(value.events) ? value.events : [],
  };
}

function ListingsCrmWorkspace() {
  const [data, setData] = useState<Bootstrap>(EMPTY);
  const [view, setView] = useState("overview");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<RecordCategoryId | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CrmRecord | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState(() => localStorage.getItem(MEMBER_KEY) || "");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Подключение к общей CRM…");
  const [error, setError] = useState("");
  const [conflictRecord, setConflictRecord] = useState<CrmRecord | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const payload = normalizeBootstrap(await loadListingsCrm(currentMemberId));
      setData(payload);
      setError("");
      setNotice("Данные синхронизированы");
      if (!currentMemberId && payload.members.length) {
        const member = payload.members.find((item) => item.active) || payload.members[0];
        setCurrentMemberId(member.id);
        localStorage.setItem(MEMBER_KEY, member.id);
      }
    } catch (requestError: any) {
      setError(requestError?.status === 401 ? "Нужен доступ к закрытому разделу маркетинга" : "CRM временно недоступна");
      setNotice("Нет соединения");
    } finally {
      setLoading(false);
    }
  }, [currentMemberId]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (!draft && !busy) refresh(true); }, 15_000);
    return () => window.clearInterval(timer);
  }, [refresh, draft, busy]);

  const today = localDate();
  const currentMember = data.members.find((item) => item.id === currentMemberId) || null;
  const canCoordinate = currentMember?.role === "DUTY_COORDINATOR";
  const selected = data.records.find((item) => item.id === selectedId) || null;
  const memberById = useMemo(() => new Map(data.members.map((member) => [member.id, member])), [data.members]);
  const recordById = useMemo(() => new Map(data.records.map((record) => [record.id, record])), [data.records]);

  useEffect(() => { setDraft(selected ? structuredClone(selected) : null); }, [selectedId, selected?.version]);

  const activeTasks = useMemo(() => data.tasks.filter((task) => !["DONE", "CANCELLED"].includes(task.status) && (!task.recordId || recordById.has(task.recordId))), [data.tasks, recordById]);
  const myTasks = useMemo(() => activeTasks.filter((task) => task.assigneeId === currentMemberId), [activeTasks, currentMemberId]);
  const freeTasks = useMemo(() => activeTasks.filter((task) => !task.assigneeId && (task.dueDate || today) <= today), [activeTasks, today]);
  const overdue = activeTasks.filter((task) => task.dueDate && task.dueDate < today).length;
  const teamPoints = data.tasks.filter((task) => task.dueDate === today && task.status === "DONE").reduce((sum, task) => sum + task.points, 0);
  const teamCapacity = data.members.filter((member) => member.active).reduce((sum, member) => sum + Number(member.capacity || 5), 0) || 15;

  const records = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...data.records]
      .filter((record) => categoryFilter === "all" || recordCategoryId(record) === categoryFilter)
      .filter((record) => !needle || [record.name, record.source, record.type, record.status, record.action].join(" ").toLowerCase().includes(needle))
      .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  }, [categoryFilter, data.records, query]);
  const categorySummary = useMemo(() => RECORD_CATEGORIES.map((category) => ({
    ...category,
    count: data.records.filter((record) => recordCategoryId(record) === category.id).length,
    active: data.records.filter((record) => recordCategoryId(record) === category.id && !["Закрыто", "Опубликовано", "Архив"].includes(record.status)).length,
  })), [data.records]);
  const draftTaskOwnerIds = draft
    ? [...new Set(activeTasks.filter((task) => task.recordId === draft.id && task.assigneeId).map((task) => task.assigneeId as string))]
    : [];
  const canEditDraft = Boolean(draft && (canCoordinate || (
    (!draft.ownerId || draft.ownerId === currentMemberId)
    && (draftTaskOwnerIds.length === 0 || (draftTaskOwnerIds.length === 1 && draftTaskOwnerIds[0] === currentMemberId))
  )));

  const chooseMember = (id: string) => {
    setCurrentMemberId(id);
    localStorage.setItem(MEMBER_KEY, id);
    setNotice("Рабочий профиль выбран");
  };

  const openCategory = (id: RecordCategoryId) => {
    setCategoryFilter(id);
    setQuery("");
    setView("records");
  };

  const run = async (operation: () => Promise<any>, success: string) => {
    setBusy(true); setError("");
    try { await operation(); setNotice(success); await refresh(true); }
    catch (requestError: any) {
      const code = String(requestError?.payload?.code || requestError?.message || "");
      if (code.includes("VERSION")) {
        setConflictRecord(requestError?.payload?.current || null);
        setError("Карточку уже изменил коллега. Ваш черновик сохранён на экране — сравните его с новой версией.");
      } else {
        const forbidden = code.includes("FORBIDDEN") || code.includes("COORDINATOR_REQUIRED");
        setError(code.includes("ALREADY_CLAIMED")
          ? "Коллега уже взял эту задачу. Список обновлён."
          : forbidden ? "Действие доступно владельцу карточки или дежурному координатору." : "Не удалось выполнить действие");
        await refresh(true);
      }
    } finally { setBusy(false); }
  };

  const claim = (task: WorkTask) => {
    if (!currentMemberId) { setError("Сначала выберите себя в правом верхнем углу"); return; }
    run(() => claimListingsTask(currentMemberId, task.id), "Задача закреплена за вами");
  };

  const updateTaskStatus = (task: WorkTask, status: string) => run(
    () => patchListingsTask(currentMemberId, task.id, task.version, { status }),
    status === "DONE" ? "Задача завершена" : "Статус обновлён",
  );

  const release = (task: WorkTask) => run(() => releaseListingsTask(currentMemberId, task.id, task.version), "Задача возвращена в общую очередь");
  const generatePlan = () => run(() => generateListingsPlan(currentMemberId, today), "План дня сформирован без дублей");

  const addRecord = () => run(async () => {
    const payload = await createListingsRecord(currentMemberId, {
      source: "Листинги", name: "Новая площадка", type: "DApp listing", priority: "B",
      status: "Не обработано", owner: currentMember?.name || "Команда", ownerId: currentMemberId,
      dueDate: today, action: "Проверить площадку и условия размещения", summary: "", benefit: "",
      price: "", notes: "", channel: "", link: "", firstContact: "",
    });
    const record = payload.record || payload.data?.record;
    if (record?.id) setSelectedId(record.id);
  }, "Новая карточка создана");

  const saveRecord = () => {
    if (!draft) return;
    const { id, version, updatedAt: _updatedAt, proofs: _proofs, ...changes } = draft;
    run(async () => {
      await patchListingsRecord(currentMemberId, id, version, changes);
      setDraft(null); setSelectedId(null);
    }, "Карточка сохранена");
  };

  const archiveRecord = () => {
    if (!draft || !window.confirm("Переместить карточку в архив? История сохранится.")) return;
    run(async () => { await archiveListingsRecord(currentMemberId, draft.id, draft.version); setDraft(null); setSelectedId(null); }, "Карточка перемещена в архив");
  };

  const renderTask = (task: WorkTask) => {
    const record = task.recordId ? recordById.get(task.recordId) : null;
    const owner = task.assigneeId ? memberById.get(task.assigneeId) : null;
    const canManageTask = task.assigneeId === currentMemberId || canCoordinate;
    return <article className="task-card" key={task.id}>
      <div className="task-card-head"><span className="task-category">{task.category || record?.type || "Задача"}</span><b>{task.points} б.</b></div>
      <h4>{task.title || record?.name || "Рабочая задача"}</h4>
      <p>{task.nextAction || record?.action || "Следующий шаг не указан"}</p>
      <div className="task-meta"><span className={`status tone-${toneFor(task.status)}`}><i />{TASK_LABELS[task.status] || task.status}</span><time className={task.dueDate < today ? "overdue" : ""}>{shortDate(task.dueDate)}</time></div>
      <div className="task-owner">{owner ? <><span className="member-avatar">{owner.name.slice(0, 1)}</span><strong>{owner.name}</strong></> : <span>Свободная задача</span>}</div>
      <div className="task-actions">
        {record && <button onClick={() => setSelectedId(record.id)}>Карточка</button>}
        {!task.assigneeId && <button className="primary-mini" disabled={busy} onClick={() => claim(task)}>Взять</button>}
        {task.assigneeId && canManageTask && task.status !== "IN_PROGRESS" && <button className="primary-mini" onClick={() => updateTaskStatus(task, "IN_PROGRESS")}>Начать</button>}
        {task.assigneeId && canManageTask && task.status === "IN_PROGRESS" && <button className="primary-mini" onClick={() => updateTaskStatus(task, "DONE")}>Готово</button>}
        {task.assigneeId && canManageTask && !["DONE", "WAITING_EXTERNAL"].includes(task.status) && <button onClick={() => release(task)}>Вернуть</button>}
      </div>
    </article>;
  };

  const title = NAV.find((item) => item.id === view)?.label || "Обзор";
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">A</div><div><strong>ATLAS</strong><span>TEAM CRM</span></div></div>
      <nav><p className="nav-caption">СОВМЕСТНАЯ РАБОТА</p>{NAV.map((item) => <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}><span>{item.icon}</span>{item.label}{item.id === "today" && (myTasks.length + freeTasks.length) > 0 && <b>{myTasks.length + freeTasks.length}</b>}</button>)}</nav>
      <div className="sidebar-foot"><div className="sync-dot" /><div><strong>Общая база</strong><span>Обновление каждые 15 сек.</span></div></div>
    </aside>
    <section className="workspace">
      <header className="topbar">
        <div><h1>{title}</h1><p className="topbar-subtitle">Одна очередь, отдельные ответственные, без двойной работы</p></div>
        <div className="top-actions"><div className="save-state"><i />{notice}</div><label className="member-select"><span>Я работаю как</span><select value={currentMemberId} onChange={(event) => chooseMember(event.target.value)}><option value="">Выбрать сотрудника</option>{data.members.filter((member) => member.active).map((member) => <option key={member.id} value={member.id}>{member.name} · {ROLE_LABELS[member.role] || member.role}</option>)}</select></label><button className="button secondary" onClick={addRecord}>＋ Карточка</button></div>
      </header>
      {error && <div className="alert"><strong>Внимание:</strong> {error}{conflictRecord && <button className="conflict-action" onClick={() => { setData((current) => ({ ...current, records: current.records.map((record) => record.id === conflictRecord.id ? conflictRecord : record) })); setDraft(structuredClone(conflictRecord)); setConflictRecord(null); setError(""); }}>Загрузить версию коллеги</button>}<button onClick={() => { setError(""); setConflictRecord(null); }}>×</button></div>}
      {loading ? <div className="loading"><div className="loader" /><p>Открываю общую CRM…</p></div> : <>
        <section className="metrics">
          <article><span>Карточек в базе</span><strong>{data.records.length}</strong><small>площадки и контакты уже загружены</small></article>
          <article><span>Свободные сегодня</span><strong>{freeTasks.length}</strong><small>можно взять без пересечений</small></article>
          <article><span>Просрочено</span><strong>{overdue}</strong><small>включено в план дня</small></article>
          <article><span>Прогресс команды</span><strong>{teamPoints}/{teamCapacity}</strong><small>баллов сегодня</small></article>
        </section>

        {view === "overview" && <><section className="dashboard-grid">
          <section className="board focus-panel"><div className="board-head"><div><h3>Что требует внимания</h3><p>Сначала ответы и просроченные обязательства</p></div>{canCoordinate ? <button className="button primary" onClick={generatePlan}>Сформировать план</button> : <span className="coordinator-note">План формирует координатор</span>}</div><div className="task-grid">{[...myTasks, ...freeTasks].slice(0, 6).map(renderTask)}{myTasks.length + freeTasks.length === 0 && <div className="empty database-ready"><div><strong>В базе уже {data.records.length} записей</strong><p>Карточки на месте. Дневной план задач ещё не сформирован.</p></div><button className="button secondary" onClick={() => setView("records")}>Открыть все записи</button></div>}</div></section>
          <section className="board team-summary"><div className="board-head"><div><h3>Команда</h3><p>Загрузка активных сотрудников</p></div></div>{data.members.filter((member) => member.active).map((member) => { const tasks = activeTasks.filter((task) => task.assigneeId === member.id); const points = tasks.reduce((sum, task) => sum + task.points, 0); return <div className="member-row" key={member.id}><span className="member-avatar">{member.name.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{ROLE_LABELS[member.role] || member.role}</small></div><b>{points}/{member.capacity || 5}</b></div>; })}</section>
        </section><section className="board category-breakdown"><div className="board-head"><div><h3>Разбивка по категориям</h3><p>Каждое направление считается отдельно — нажмите, чтобы открыть его карточки</p></div></div><div className="category-grid">{categorySummary.map((category) => <button key={category.id} className="category-card" onClick={() => openCategory(category.id)}><span className={`category-icon category-${category.id}`}>{category.icon}</span><span className="category-copy"><strong>{category.label}</strong><small>{category.description}</small></span><span className="category-total"><b>{category.count}</b><small>{category.active} активных</small></span><span className="category-arrow">→</span></button>)}</div></section></>}

        {view === "today" && <section className="board"><div className="board-head"><div><h3>Мой день · {currentMember?.name || "выберите себя"}</h3><p>Просроченные задачи не скрываются</p></div>{canCoordinate && <button className="button primary" onClick={generatePlan}>Обновить план</button>}</div><div className="task-sections"><div><h3>Мои задачи</h3><div className="task-grid">{myTasks.map(renderTask)}{myTasks.length === 0 && <div className="empty">У вас пока нет задач</div>}</div></div><div><h3>Общая очередь</h3><div className="task-grid">{freeTasks.map(renderTask)}{freeTasks.length === 0 && <div className="empty">Свободных задач нет</div>}</div></div></div></section>}

        {view === "team" && <section className="team-board">{data.members.filter((member) => member.active).map((member) => <section className="team-column" key={member.id}><header><span className="member-avatar">{member.name.slice(0, 1)}</span><div><h3>{member.name}</h3><p>{ROLE_LABELS[member.role] || member.role}</p></div><b>{activeTasks.filter((task) => task.assigneeId === member.id).reduce((sum, task) => sum + task.points, 0)}/{member.capacity || 5}</b></header><div>{activeTasks.filter((task) => task.assigneeId === member.id).map(renderTask)}{activeTasks.every((task) => task.assigneeId !== member.id) && <div className="empty compact">Нет активных задач</div>}</div></section>)}<section className="team-column unassigned"><header><div><h3>Свободная очередь</h3><p>Берёт только один сотрудник</p></div><b>{freeTasks.length}</b></header><div>{freeTasks.map(renderTask)}</div></section></section>}

        {view === "records" && <section className="board"><div className="board-head"><div><h3>Площадки и контакты</h3><p>{records.length} из {data.records.length} карточек</p></div><div className="filters"><select className="category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as RecordCategoryId | "all")}><option value="all">Все категории</option>{categorySummary.map((category) => <option key={category.id} value={category.id}>{category.label} · {category.count}</option>)}</select><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по CRM" /></label></div></div><div className="table-wrap"><table><thead><tr><th>Площадка / контакт</th><th>Категория</th><th>Статус</th><th>Ответственный</th><th>Следующий шаг</th><th>Контроль</th><th /></tr></thead><tbody>{records.map((record) => { const category = recordCategory(record); return <tr key={record.id} onClick={() => setSelectedId(record.id)}><td><div className="record-name"><span>{record.name.slice(0, 1)}</span><div><strong>{record.name}</strong><small>{record.link || "Ссылка не указана"}</small></div></div></td><td><span className="source-label">{category.short}</span><small className="priority">{record.type}</small></td><td><span className={`status tone-${toneFor(record.status)}`}><i />{record.status}</span></td><td>{record.ownerId && memberById.get(record.ownerId)?.name || record.owner || "Команда"}</td><td><p className="action-text">{record.action || "Не задан"}</p></td><td><span className={record.dueDate < today ? "due urgent" : "due"}>{shortDate(record.dueDate)}</span></td><td><button className="row-arrow">→</button></td></tr>; })}</tbody></table>{records.length === 0 && <div className="empty">В этой категории карточек пока нет</div>}</div></section>}

        {view === "activity" && <section className="board"><div className="board-head"><div><h3>Журнал изменений</h3><p>Кто, когда и что изменил</p></div></div><div className="activity-list">{data.audit.map((event) => <article key={event.id}><span className="member-avatar">{(event.actorName || event.memberName || "A").slice(0, 1)}</span><div><strong>{event.actorName || event.memberName || "Команда Atlas"}</strong><p>{event.action}{event.entityName ? ` · ${event.entityName}` : ""}</p></div><time>{new Date(event.createdAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</time></article>)}{data.audit.length === 0 && <div className="empty">Изменения появятся после первой операции</div>}</div></section>}
      </>}
    </section>

    {draft && <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedId(null)}><aside className="drawer"><div className="drawer-head"><div><span className="source-label">{draft.source}</span><small>Версия {draft.version}</small></div><button onClick={() => setSelectedId(null)}>×</button></div><h2>{draft.name}</h2><p className="drawer-type">{canEditDraft ? "Изменения сохраняются только в этой карточке" : "Карточка закреплена за коллегой и открыта только для просмотра"}</p>
      <fieldset className="drawer-fieldset" disabled={!canEditDraft}><div className="section-title"><span>Основная информация</span></div><div className="form-grid">
        <label className="wide">Название<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label>Статус<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{RECORD_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Дата контроля<input type="date" value={draft.dueDate || ""} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label>
        <label>Категория<input value={draft.type || ""} onChange={(event) => setDraft({ ...draft, type: event.target.value })} /></label>
        <label>Ответственный<select value={draft.ownerId || ""} onChange={(event) => { const member = memberById.get(event.target.value); setDraft({ ...draft, ownerId: event.target.value, owner: member?.name || "Команда" }); }}><option value="">Команда</option>{data.members.filter((member) => member.active && (canCoordinate || member.id === currentMemberId)).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
        <label className="wide">Следующее действие<textarea rows={3} value={draft.action || ""} onChange={(event) => setDraft({ ...draft, action: event.target.value })} /></label>
        <label>Цена / формат<input value={draft.price || ""} onChange={(event) => setDraft({ ...draft, price: event.target.value })} /></label>
        <label>Канал связи<input value={draft.channel || ""} onChange={(event) => setDraft({ ...draft, channel: event.target.value })} /></label>
        <label className="wide">Ссылка<input value={draft.link || ""} onChange={(event) => setDraft({ ...draft, link: event.target.value })} /></label>
        <label className="wide">Описание<textarea rows={3} value={draft.summary || ""} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
        <label className="wide notes-field">Заметки и переписка<textarea rows={7} value={draft.notes || ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
      </div></fieldset>
      <section className="proof-section"><div className="proof-head"><div><span>Подтверждение</span><h3>Пруфы</h3><p>Старые подтверждения доступны для просмотра.</p></div><span className="proof-storage-note">Новое файловое хранилище готовится</span></div>{(draft.proofs || []).length ? <div className="proof-grid">{(draft.proofs || []).map((proof) => <article className="proof-card" key={proof.id}><a className="proof-image" href={proof.url} target="_blank" rel="noreferrer"><img src={proof.url} alt="Пруф" /></a><div className="proof-body"><strong>{proof.fileName}</strong></div></article>)}</div> : <div className="proof-empty"><span>□</span><div><strong>Пруфов пока нет</strong><p>Добавление файлов будет включено после защищённого upload-модуля.</p></div></div>}</section>
      <div className="drawer-actions">{canEditDraft && <button className="danger-link" onClick={archiveRecord}>В архив</button>}{draft.link && <a className="button secondary" href={draft.link} target="_blank" rel="noreferrer">Открыть сайт ↗</a>}{canEditDraft && <button className="button primary" disabled={busy} onClick={saveRecord}>{busy ? "Сохраняю…" : "Сохранить карточку"}</button>}</div>
    </aside></div>}
  </main>;
}

export default function ListingsCrmBoard() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  useEffect(() => { if (hostRef.current) setShadowRoot(hostRef.current.shadowRoot || hostRef.current.attachShadow({ mode: "open" })); }, []);
  return <div ref={hostRef} className="analytics-listings-crm-host">{shadowRoot && createPortal(<><style>{crmCss}</style><ListingsCrmWorkspace /></>, shadowRoot)}</div>;
}
