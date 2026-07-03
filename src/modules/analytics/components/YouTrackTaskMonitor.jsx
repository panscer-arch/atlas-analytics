import { useEffect, useMemo, useState } from "react";
import { getServerJson, postServerJson } from "../services/contentStore";

const STATUS_FILTERS = [
  { id: "open", label: "Открытые" },
  { id: "attention", label: "Нужен ответ" },
  { id: "stale", label: "Зависшие" },
  { id: "all", label: "Все" },
];

function formatDateTime(value = "") {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function getIssueTone(issue = {}) {
  if (issue.needsAttention) return "attention";
  if (/show-stopper|critical|blocker/i.test(issue.priority || "")) return "danger";
  if (issue.inactiveMs >= 24 * 60 * 60 * 1000) return "stale";
  if (issue.isResolved) return "done";
  return "active";
}

function filterIssues(issues = [], filter = "open", search = "") {
  const normalizedSearch = search.trim().toLowerCase();
  return issues
    .filter((issue) => {
      if (filter === "open") return !issue.isResolved;
      if (filter === "attention") return issue.needsAttention && !issue.isResolved;
      if (filter === "stale") return issue.inactiveMs >= 24 * 60 * 60 * 1000 && !issue.isResolved;
      return true;
    })
    .filter((issue) => {
      if (!normalizedSearch) return true;
      return [issue.id, issue.title, issue.status, issue.assignee, issue.priority]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
}

function YouTrackTaskMonitor() {
  const [issues, setIssues] = useState([]);
  const [summary, setSummary] = useState({ total: 0, open: 0, done: 0, attention: 0, stale: 0, showStoppers: 0 });
  const [changes, setChanges] = useState([]);
  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [lastCheckedAt, setLastCheckedAt] = useState("");
  const [loadState, setLoadState] = useState("Загружаю задачи...");
  const [autoCheck, setAutoCheck] = useState(true);

  async function loadIssues() {
    setLoadState("Обновляю...");
    const result = await getServerJson("/api/youtrack/issues?top=50");
    if (!result.ok) {
      setLoadState(result.payload?.error === "youtrack_not_configured" ? "YouTrack не настроен на сервере" : "Не удалось загрузить задачи");
      return;
    }
    setIssues(result.payload.issues || []);
    setSummary(result.payload.summary || summary);
    setLastCheckedAt(result.payload.lastCheckedAt || "");
    setLoadState("Синхронизировано");
  }

  async function checkChanges({ notify = true } = {}) {
    setLoadState(notify ? "Проверяю и отправляю уведомления..." : "Проверяю изменения...");
    const result = await postServerJson("/api/youtrack/check", { notify });
    if (!result.ok) {
      setLoadState(result.payload?.error === "youtrack_not_configured" ? "YouTrack не настроен на сервере" : "Проверка не прошла");
      return;
    }
    setIssues(result.payload.issues || []);
    setSummary(result.payload.summary || summary);
    setChanges(result.payload.changes || []);
    setLastCheckedAt(result.payload.lastCheckedAt || "");
    setLoadState((result.payload.changes || []).length ? `Найдено изменений: ${result.payload.changes.length}` : "Изменений нет");
  }

  useEffect(() => {
    loadIssues();
  }, []);

  useEffect(() => {
    if (!autoCheck) return undefined;
    const timer = window.setInterval(() => {
      checkChanges({ notify: true });
    }, 60000);
    return () => window.clearInterval(timer);
  }, [autoCheck]);

  const visibleIssues = useMemo(() => filterIssues(issues, filter, search), [issues, filter, search]);
  const attentionIssues = useMemo(() => issues.filter((issue) => issue.needsAttention && !issue.isResolved).slice(0, 4), [issues]);

  return (
    <section className="analytics-youtrack">
      <section className="analytics-surface analytics-youtrack-hero">
        <div>
          <span className="analytics-kicker">ATL / task tracker</span>
          <h2>Монитор задач Atlas</h2>
          <p>
            Следит за статусами, комментариями, исполнителями и временем в текущем статусе. Если задача меняется или кто-то просит уточнение,
            SuperSUS может отправить уведомление в Telegram.
          </p>
        </div>
        <div className="analytics-youtrack-actions">
          <button type="button" className="analytics-export-btn" onClick={() => checkChanges({ notify: true })}>
            Проверить и уведомить
          </button>
          <button type="button" className="analytics-parser-mini-button" onClick={loadIssues}>
            Обновить экран
          </button>
          <label className="analytics-youtrack-toggle">
            <input type="checkbox" checked={autoCheck} onChange={(event) => setAutoCheck(event.target.checked)} />
            Автопроверка 60 сек
          </label>
        </div>
      </section>

      <section className="analytics-youtrack-kpis">
        {[
          ["Всего", summary.total, "default"],
          ["Открыто", summary.open, "accent"],
          ["Нужен ответ", summary.attention, summary.attention ? "danger" : "success"],
          ["Зависло 24ч+", summary.stale, summary.stale ? "danger" : "success"],
          ["Show-stopper", summary.showStoppers, summary.showStoppers ? "danger" : "success"],
          ["Готово", summary.done, "success"],
        ].map(([label, value, tone]) => (
          <article key={label} className={`analytics-youtrack-kpi analytics-youtrack-kpi-${tone}`}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      {attentionIssues.length ? (
        <section className="analytics-surface analytics-youtrack-attention">
          <div className="analytics-parser-table-head">
            <div>
              <span className="analytics-kicker">Оперативно ответить</span>
              <h3>Задачи, где может быть нужен комментарий</h3>
            </div>
          </div>
          <div className="analytics-youtrack-attention-grid">
            {attentionIssues.map((issue) => (
              <a key={issue.id} className="analytics-youtrack-alert-card" href={issue.url} target="_blank" rel="noreferrer">
                <span>{issue.id}</span>
                <strong>{issue.title}</strong>
                <small>{issue.status} · {issue.assignee} · в статусе {issue.statusAgeLabel}</small>
                {issue.latestComment?.text ? <p>{issue.latestComment.text}</p> : null}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="analytics-surface analytics-youtrack-board">
        <div className="analytics-parser-table-head">
          <div>
            <span className="analytics-kicker">Последняя проверка: {formatDateTime(lastCheckedAt)}</span>
            <h3>{loadState}</h3>
          </div>
          <input
            className="analytics-youtrack-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по ATL, статусу, исполнителю..."
          />
        </div>

        <div className="analytics-parser-quick-filters">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`analytics-parser-filter-chip${filter === item.id ? " analytics-parser-filter-chip-active" : ""}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="analytics-youtrack-table-wrap">
          <table className="analytics-youtrack-table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>Статус</th>
                <th>Исполнитель</th>
                <th>В статусе</th>
                <th>Возраст</th>
                <th>Обновлено</th>
                <th>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {visibleIssues.map((issue) => (
                <tr key={issue.id} className={`analytics-youtrack-row analytics-youtrack-row-${getIssueTone(issue)}`}>
                  <td>
                    <a href={issue.url} target="_blank" rel="noreferrer">{issue.id}</a>
                    <strong>{issue.title}</strong>
                    <span>{issue.priority}</span>
                  </td>
                  <td><b>{issue.status}</b></td>
                  <td>{issue.assignee}</td>
                  <td>{issue.statusAgeLabel}</td>
                  <td>{issue.ageLabel}</td>
                  <td>{formatDateTime(issue.updatedAt)} · {issue.inactiveLabel} назад</td>
                  <td>{issue.latestComment?.text || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleIssues.length ? <div className="analytics-youtrack-empty">Нет задач под этот фильтр</div> : null}
        </div>
      </section>

      {changes.length ? (
        <section className="analytics-surface analytics-youtrack-changes">
          <span className="analytics-kicker">Последние изменения</span>
          {changes.slice(0, 8).map((change, index) => (
            <div key={`${change.issue?.id}-${change.type}-${index}`} className="analytics-youtrack-change">
              <b>{change.message}</b>
              <span>{change.issue?.status} · {change.issue?.assignee}</span>
            </div>
          ))}
        </section>
      ) : null}
    </section>
  );
}

export default YouTrackTaskMonitor;
