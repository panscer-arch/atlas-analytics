import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Workflow,
  Bot,
  ArrowUpRight,
  Pencil,
  Save,
  Download,
  RefreshCw,
  Search,
  Plus,
  X,
  UsersRound,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  loadServerContentResult,
  saveServerContent,
  unlockMarketingContent,
} from "../services/contentStore";
import {
  DEPARTMENTS_KEY,
  TEAM_KEY,
  PLAN_STATUSES,
  AUTO_STATUSES,
  buildDepartmentPlan,
  validatePlan,
  selectRows,
  savePlanSafely,
} from "../data/departmentsModel";
import "../styles/departments.css";

const DRAFT_KEY = DEPARTMENTS_KEY + ".draft";
const TABS = [
  ["departments", "Отделы", Building2],
  ["processes", "Процессы", Workflow],
  ["automations", "Автоматизация", Bot],
];
const FIELDS = {
  departments: [
    ["scope", "Зона ответственности"],
    ["gap", "Недостающие роли"],
    ["leaderHint", "Кого подключить и почему"],
    ["next", "Ближайшее улучшение"],
  ],
  processes: [
    ["flow", "Порядок работы"],
    ["outcome", "Результат"],
    ["metric", "Как измерять"],
    ["control", "Контроль человека"],
    ["next", "Следующий шаг"],
  ],
  automations: [
    ["manual", "Ручная работа сейчас"],
    ["flow", "Что автоматизировать"],
    ["requirements", "Что нужно подключить или проверить"],
    ["control", "Контроль человека"],
    ["fallback", "Ручной резерв и ограничения"],
    ["evidence", "Подтверждение проверки"],
    ["next", "Следующий шаг"],
  ],
};
const depIcons = {
  operations: "01",
  product: "02",
  marketing: "03",
  partners: "04",
  support: "05",
  finance: "06",
  quality: "07",
};
function Badge({ status, automation = false }) {
  return (
    <span className={`org-badge org-status-${status}`}>
      {(automation ? AUTO_STATUSES : PLAN_STATUSES)[status] || status}
    </span>
  );
}

function Editor({ kind, row, plan, members, projects, onApply, onClose }) {
  const [value, setValue] = useState(structuredClone(row));
  const [error, setError] = useState("");
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  function change(key, next) {
    setValue((v) => ({ ...v, [key]: next }));
    setError("");
  }
  function submit(e) {
    e.preventDefault();
    const rows = plan[kind].some((r) => r.id === value.id)
      ? plan[kind].map((r) => (r.id === value.id ? value : r))
      : [...plan[kind], value];
    const next = { ...plan, [kind]: rows };
    const message = validatePlan(next);
    if (message) {
      setError(message);
      return;
    }
    onApply(next);
  }
  const choices = kind === "automations" ? AUTO_STATUSES : PLAN_STATUSES;
  return (
    <dialog
      ref={dialog}
      className="org-editor"
      aria-labelledby="org-editor-title"
      onCancel={onClose}
    >
      <form onSubmit={submit}>
        <header>
          <div>
            <span className="org-eyebrow">Рабочая структура</span>
            <h3 id="org-editor-title">{row.title || "Новая карточка"}</h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            aria-label="Закрыть редактор"
          >
            <X size={20} />
          </Button>
        </header>
        <label>
          Название
          <input
            required
            maxLength={160}
            value={value.title}
            onChange={(e) => change("title", e.target.value)}
          />
        </label>
        <div className="org-form-grid">
          {kind !== "departments" && (
            <label>
              Отдел
              <select
                value={value.departmentId}
                onChange={(e) => change("departmentId", e.target.value)}
              >
                {plan.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Ответственный
            <select
              aria-label="Ответственный"
              value={value.ownerId}
              onChange={(e) => change("ownerId", e.target.value)}
            >
              <option value="">Нужно назначить</option>
              {value.ownerId &&
                !members.some((m) => m.id === value.ownerId) && (
                  <option value={value.ownerId}>
                    Участник недоступен: {value.ownerId}
                  </option>
                )}
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.data.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Статус
            <select
              aria-label="Статус"
              value={value.status}
              onChange={(e) => change("status", e.target.value)}
            >
              {Object.entries(choices).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {kind === "automations" && (
            <label>
              Приоритет
              <select
                value={value.priority}
                onChange={(e) => change("priority", e.target.value)}
              >
                <option>P1</option>
                <option>P2</option>
                <option>P3</option>
              </select>
            </label>
          )}
        </div>
        {kind === "departments" && (
          <>
            <fieldset>
              <legend>Предлагаемый состав отдела</legend>
              <div className="org-checkboxes">
                {members.map((m) => (
                  <label key={m.id}>
                    <input
                      type="checkbox"
                      checked={value.memberIds.includes(m.id)}
                      onChange={(e) =>
                        change(
                          "memberIds",
                          e.target.checked
                            ? [...value.memberIds, m.id]
                            : value.memberIds.filter((id) => id !== m.id),
                        )
                      }
                    />
                    <span>
                      {m.data.label}
                      <small>{m.data.role}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Связанные проекты</legend>
              <div className="org-checkboxes">
                {projects.map((p) => (
                  <label key={p.id}>
                    <input
                      type="checkbox"
                      checked={value.projectIds.includes(p.id)}
                      onChange={(e) =>
                        change(
                          "projectIds",
                          e.target.checked
                            ? [...value.projectIds, p.id]
                            : value.projectIds.filter((id) => id !== p.id),
                        )
                      }
                    />
                    {p.data.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}
        {FIELDS[kind].map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea
              rows={3}
              maxLength={4000}
              value={value[key] || ""}
              onChange={(e) => change(key, e.target.value)}
            />
          </label>
        ))}
        <label>
          Заметки
          <textarea
            rows={2}
            maxLength={4000}
            value={value.notes || ""}
            onChange={(e) => change("notes", e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="org-error">
            {error}
          </p>
        )}
        <footer>
          <Button type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button className="org-primary" type="submit">
            Применить
          </Button>
        </footer>
      </form>
    </dialog>
  );
}

export default function DepartmentsBoard() {
  const [plan, setPlan] = useState(null),
    [graph, setGraph] = useState(null),
    [baseline, setBaseline] = useState(null);
  const [tab, setTab] = useState(() => {
    const v = new URL(window.location.href).searchParams.get("orgView");
    return TABS.some((t) => t[0] === v) ? v : "departments";
  });
  const [query, setQuery] = useState(""),
    [department, setDepartment] = useState(""),
    [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [message, setMessage] = useState(""),
    [editor, setEditor] = useState(null),
    [draft, setDraft] = useState(null);
  const mounted = useRef(true);
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const members = (graph?.nodes || []).filter((n) => n.type === "member");
  const projects = (graph?.nodes || []).filter((n) => n.type === "project");
  const memberName = (id) =>
    members.find((m) => m.id === id)?.data.label ||
    (id ? "Участник недоступен" : "Нужно назначить");
  const projectName = (id) =>
    projects.find((p) => p.id === id)?.data.label || "Проект недоступен";
  const depName = (id) =>
    plan.departments.find((d) => d.id === id)?.title || "Отдел";
  async function load() {
    setLoading(true);
    setReady(false);
    setMessage("");
    const [team, result] = await Promise.all([
      loadServerContentResult(TEAM_KEY),
      loadServerContentResult(DEPARTMENTS_KEY),
    ]);
    if (!mounted.current) return;
    if (result.status === 401) {
      setLocked(true);
      setLoading(false);
      return;
    }
    setLocked(false);
    const validTeam =
      team.ok &&
      team.exists &&
      Array.isArray(team.value?.nodes) &&
      Array.isArray(team.value?.edges);
    if (validTeam) setGraph(team.value);
    if (!result.ok || !validTeam) {
      setMessage(
        "Не удалось загрузить структуру или команду. Сохранение заблокировано; попробуйте ещё раз.",
      );
      setLoading(false);
      return;
    }
    if (result.exists && validatePlan(result.value)) {
      setMessage(
        "Серверная структура имеет неподдерживаемый формат. Данные не изменены.",
      );
      setLoading(false);
      return;
    }
    setBaseline(result.exists ? result.value : null);
    setPlan(result.exists ? result.value : buildDepartmentPlan(team.value));
    setDirty(false);
    setReady(true);
    setMessage(
      result.exists
        ? "Загружено с сервера"
        : "Начальная структура · ещё не сохранена",
    );
    try {
      const cached = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
      if (
        cached &&
        !validatePlan(cached) &&
        JSON.stringify(cached) !== JSON.stringify(result.value)
      )
        setDraft(cached);
      else setDraft(null);
    } catch {
      setDraft(null);
    }
    setLoading(false);
  }
  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    function warn(e) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    function history() {
      const v = new URL(window.location.href).searchParams.get("orgView");
      setTab(TABS.some((t) => t[0] === v) ? v : "departments");
    }
    window.addEventListener("popstate", history);
    return () => window.removeEventListener("popstate", history);
  }, []);
  function apply(next) {
    setPlan(next);
    setDirty(true);
    setEditor(null);
    setMessage("Есть несохранённые изменения");
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      setMessage(
        "Есть несохранённые изменения. Резерв браузера недоступен — используйте экспорт.",
      );
    }
  }
  function switchTab(next) {
    setTab(next);
    setQuery("");
    setStatusFilter("");
    const url = new URL(window.location.href);
    url.searchParams.set("orgView", next);
    window.history.pushState({}, "", url);
  }
  async function save() {
    setBusy(true);
    setMessage("Сохраняю…");
    const snapshot = structuredClone(plan);
    const result = await savePlanSafely(snapshot, baseline, {
      load: () => loadServerContentResult(DEPARTMENTS_KEY),
      save: (value) => saveServerContent(DEPARTMENTS_KEY, value),
    });
    if (mounted.current) {
      setBusy(false);
      setMessage(result.ok ? "Сохранено на сервере" : result.error);
      if (result.ok) {
        setBaseline(snapshot);
        setDirty(false);
        setDraft(null);
        sessionStorage.removeItem(DRAFT_KEY);
      }
    }
  }
  function exportPlan() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "atlas-departments-plan.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function add() {
    const base = {
      id: crypto.randomUUID(),
      title: "",
      ownerId: "",
      notes: "",
      next: "",
      status: tab === "automations" ? "idea" : "proposed",
    };
    if (tab === "departments")
      Object.assign(base, {
        scope: "",
        gap: "",
        leaderHint: "",
        memberIds: [],
        projectIds: [],
      });
    else
      Object.assign(base, {
        departmentId: department || plan.departments[0]?.id,
        priority: "P2",
        evidence: "",
      });
    setEditor({ kind: tab, row: base });
  }
  const rows = plan
    ? selectRows(plan[tab], query, department).filter(
        (r) => !statusFilter || r.status === statusFilter,
      )
    : [];
  if (locked)
    return (
      <section className="org-board">
        <header className="org-hero">
          <div>
            <span className="org-eyebrow">SuperSUS / организация Atlas</span>
            <h1>Отделы и процессы</h1>
            <p>
              Внутренняя рабочая структура. Введите действующий пароль SuperSUS.
            </p>
          </div>
        </header>
        <form
          className="org-editor"
          style={{ position: "static", maxWidth: 520 }}
          onSubmit={async (event) => {
            event.preventDefault();
            setAuthBusy(true);
            setAuthError("");
            const result = await unlockMarketingContent(password);
            setAuthBusy(false);
            if (result.ok) {
              setPassword("");
              await load();
            } else
              setAuthError(
                result.status === 401
                  ? "Неверный пароль. Попробуйте ещё раз."
                  : "Не удалось войти. Проверьте соединение и повторите попытку.",
              );
          }}
        >
          <label>
            Пароль SuperSUS
            <input
              type="password"
              aria-label="Пароль SuperSUS"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {authError && <p role="alert">{authError}</p>}
          <Button type="submit" disabled={authBusy}>
            {authBusy ? "Проверяю…" : "Открыть отделы"}
          </Button>
        </form>
      </section>
    );
  return (
    <section className="org-board">
      <header className="org-hero">
        <div>
          <span className="org-eyebrow">SuperSUS / организация Atlas</span>
          <h2>Отделы и процессы</h2>
          <p>
            Команда, ответственность и следующий шаг для каждого направления.
          </p>
        </div>
        <a className="org-team-link" href="?board=team">
          <UsersRound size={17} /> Команда <ArrowUpRight size={15} />
        </a>
      </header>
      <div className="org-notice">
        <ShieldCheck size={18} />
        <span>
          Рабочее предложение. Состав отделов основан на связях команды;
          руководители и автоматизации требуют подтверждения. Назначения в
          «Команде» не меняются.
        </span>
      </div>
      {loading && <p role="status">Загружаю команду и структуру…</p>}
      {!ready && !loading && (
        <div className="org-error" role="alert">
          {message}
          <Button variant="outline" onClick={load}>
            Повторить загрузку
          </Button>
        </div>
      )}
      {plan && (
        <>
          <div className="org-stats">
            <div>
              <strong>{plan.departments.length}</strong>
              <span>направлений</span>
            </div>
            <div>
              <strong>{plan.processes.length}</strong>
              <span>процессов</span>
            </div>
            <div>
              <strong>
                {plan.automations.filter((a) => a.status !== "running").length}
              </strong>
              <span>идей автоматизации</span>
            </div>
            <div className="org-stat-warning">
              <strong>
                {
                  plan.departments.filter(
                    (d) => !d.ownerId || d.status !== "confirmed",
                  ).length
                }
              </strong>
              <span>руководителей согласовать</span>
            </div>
          </div>
          <div className="org-controls">
            <div
              className="org-tabs"
              role="tablist"
              aria-label="Структура компании"
            >
              {TABS.map(([id, label, Icon]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => switchTab(id)}
                >
                  <Icon size={17} />
                  {label}
                  <span>{plan[id].length}</span>
                </button>
              ))}
            </div>
            <div className="org-actions">
              <Button variant="outline" onClick={exportPlan}>
                <Download size={16} />
                Экспорт
              </Button>
              <Button
                variant="outline"
                disabled={busy || loading}
                onClick={() => {
                  if (
                    !dirty ||
                    window.confirm(
                      "Перечитать серверную версию? Несохранённый черновик останется в резерве браузера.",
                    )
                  )
                    load();
                }}
                aria-label="Перечитать серверную версию"
              >
                <RefreshCw size={16} />
              </Button>
              <Button
                className="org-primary"
                disabled={!ready || busy}
                onClick={save}
              >
                <Save size={16} />
                {busy ? "Сохраняю…" : "Сохранить"}
              </Button>
            </div>
          </div>
          <div className="org-save-status" role="status">
            {message}
            {dirty && <span> · черновик</span>}
          </div>
          {draft && (
            <div className="org-draft">
              Есть резерв несохранённого черновика этой сессии.
              <Button
                variant="outline"
                disabled={!ready || busy}
                onClick={() => {
                  apply(draft);
                  setDraft(null);
                }}
              >
                Восстановить черновик
              </Button>
            </div>
          )}
          <div className="org-filters">
            <label className="org-search">
              <Search size={17} />
              <input
                aria-label="Поиск"
                placeholder="Найти процесс или улучшение"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Фильтр по отделу"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">Все отделы</option>
              {plan.departments.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
            <select
              aria-label="Фильтр по статусу"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Все статусы</option>
              {Object.entries(
                tab === "automations" ? AUTO_STATUSES : PLAN_STATUSES,
              ).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <Button variant="outline" disabled={!ready || busy} onClick={add}>
              <Plus size={16} />
              Добавить
            </Button>
          </div>
          {tab === "departments" && (
            <div className="org-departments">
              {rows.map((d) => (
                <article key={d.id} className="org-department">
                  <header>
                    <span className="org-number">{depIcons[d.id] || "+"}</span>
                    <Badge status={d.status} />
                    <Button
                      variant="ghost"
                      disabled={!ready || busy}
                      aria-label={`Изменить ${d.title}`}
                      onClick={() => setEditor({ kind: tab, row: d })}
                    >
                      <Pencil size={16} />
                    </Button>
                  </header>
                  <h3>{d.title}</h3>
                  <p className="org-scope">{d.scope}</p>
                  <div className="org-owner">
                    <span>
                      {d.status === "confirmed"
                        ? "Ответственный"
                        : "Предлагаемый ответственный"}
                    </span>
                    <strong>{memberName(d.ownerId)}</strong>
                  </div>
                  <div className="org-members">
                    {d.memberIds.length ? (
                      d.memberIds.map((id) => (
                        <span
                          key={id}
                          title={members.find((m) => m.id === id)?.data.role}
                        >
                          {memberName(id)}
                        </span>
                      ))
                    ) : (
                      <span className="org-empty-member">
                        Состав нужно определить
                      </span>
                    )}
                  </div>
                  <details>
                    <summary>Связанные проекты · {d.projectIds.length}</summary>
                    <p>
                      {d.projectIds.map(projectName).join(" · ") ||
                        "Нет привязанных проектов"}
                    </p>
                  </details>
                  <dl>
                    <dt>Кого подключить</dt>
                    <dd>{d.leaderHint}</dd>
                    <dt>Недостающие роли</dt>
                    <dd>{d.gap}</dd>
                    <dt>Первое улучшение</dt>
                    <dd>{d.next}</dd>
                  </dl>
                  {d.notes && <p className="org-row-note">{d.notes}</p>}
                  <footer>
                    <button
                      onClick={() => {
                        setDepartment(d.id);
                        switchTab("processes");
                      }}
                    >
                      Процессы <ArrowUpRight size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setDepartment(d.id);
                        switchTab("automations");
                      }}
                    >
                      Автоматизация <ArrowUpRight size={14} />
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          )}
          {tab !== "departments" && (
            <div className="org-rows">
              {rows.map((r) => (
                <article className="org-process" key={r.id}>
                  <header>
                    <div>
                      <span className="org-eyebrow">
                        {depName(r.departmentId)}
                        {r.priority ? ` / ${r.priority}` : ""}
                      </span>
                      <h3>{r.title}</h3>
                    </div>
                    <Badge
                      status={r.status}
                      automation={tab === "automations"}
                    />
                    <Button
                      variant="outline"
                      disabled={!ready || busy}
                      aria-label={`Изменить ${r.title}`}
                      onClick={() => setEditor({ kind: tab, row: r })}
                    >
                      <Pencil size={15} />
                      Изменить
                    </Button>
                  </header>
                  <div className="org-process-grid">
                    {FIELDS[tab]
                      .filter(([key]) => r[key])
                      .map(([key, label]) => (
                        <div key={key}>
                          <h4>{label}</h4>
                          <p>{r[key]}</p>
                        </div>
                      ))}
                  </div>
                  <footer>
                    <span>
                      Ответственный: <strong>{memberName(r.ownerId)}</strong>
                    </span>
                    {r.notes && <p>{r.notes}</p>}
                  </footer>
                </article>
              ))}
            </div>
          )}
          {!rows.length && (
            <div className="org-empty">
              <Search size={24} />
              <h3>Ничего не найдено</h3>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setDepartment("");
                  setStatusFilter("");
                }}
              >
                Сбросить фильтры
              </Button>
            </div>
          )}
          <p className="org-footnote">
            Автоматизации здесь — план, не запущенные интеграции. Экономию
            времени ещё нужно измерить. Для общего редактирования используйте
            одного редактора за раз.
          </p>
        </>
      )}
      {editor && (
        <Editor
          key={editor.row.id}
          {...editor}
          plan={plan}
          members={members}
          projects={projects}
          onApply={apply}
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}
