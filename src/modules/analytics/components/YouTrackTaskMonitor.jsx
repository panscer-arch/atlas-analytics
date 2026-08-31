import { useEffect, useMemo, useState } from "react";
import { getServerJson, postServerJson } from "../services/contentStore";
import AnalyticsIcon from "./AnalyticsIcon";
import { SusButton, SusEmptyState, SusMetric, SusStatus } from "./ui/SuperSusUi";

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
  const isLoading = /загружаю|обновляю|проверяю/i.test(loadState);
  const syncTone = /не удалось|не прошла|не настроен/i.test(loadState)
    ? "danger"
    : isLoading
      ? "default"
      : "success";

  return (
    <section className="analytics-youtrack" data-testid="youtrack-monitor">
      <header className="analytics-youtrack-header">
        <div className="analytics-youtrack-heading">
          <div className="analytics-youtrack-title-row">
            <span className="analytics-kicker">ATL / live monitor</span>
            <SusStatus tone={autoCheck ? "success" : "default"}>{autoCheck ? "Автопроверка включена" : "Автопроверка выключена"}</SusStatus>
          </div>
          <h2>Задачи Atlas</h2>
          <p>Статусы, исполнители, комментарии и задачи, которым нужен ответ.</p>
          <div className="analytics-youtrack-sync-row" aria-live="polite">
            <SusStatus tone={syncTone}>{loadState}</SusStatus>
            <span>Последняя проверка: {formatDateTime(lastCheckedAt)}</span>
          </div>
        </div>
        <div className="analytics-youtrack-actions">
          <SusButton type="button" variant="primary" icon="notify" onClick={() => checkChanges({ notify: true })} disabled={isLoading}>
            Проверить сейчас
          </SusButton>
          <SusButton type="button" icon="refresh" iconOnly onClick={loadIssues} disabled={isLoading} title="Обновить данные" aria-label="Обновить данные">
            <span className="sus-sr-only">Обновить данные</span>
          </SusButton>
          <label className="analytics-youtrack-toggle" title="Проверять изменения каждую минуту">
            <input type="checkbox" checked={autoCheck} onChange={(event) => setAutoCheck(event.target.checked)} />
            <span className="analytics-youtrack-switch" aria-hidden="true" />
            <span>Каждые 60 сек</span>
          </label>
        </div>
      </header>

      <section className="analytics-youtrack-kpis">
        {[
          ["Всего", summary.total, "default"],
          ["Открыто", summary.open, "accent"],
          ["Нужен ответ", summary.attention, summary.attention ? "danger" : "success"],
          ["Зависло 24ч+", summary.stale, summary.stale ? "danger" : "success"],
          ["Блокеры", summary.showStoppers, summary.showStoppers ? "danger" : "success"],
          ["Готово", summary.done, "success"],
        ].map(([label, value, tone]) => (
          <SusMetric key={label} label={label} value={value} tone={tone} />
        ))}
      </section>

      {attentionIssues.length ? (
        <section className="analytics-youtrack-panel analytics-youtrack-attention">
          <div className="analytics-youtrack-panel-head">
            <div>
              <span className="analytics-kicker">Требуют реакции</span>
              <h3>Задачи, где ждут ответа</h3>
            </div>
            <SusStatus tone="attention">{attentionIssues.length} в очереди</SusStatus>
          </div>
          <div className="analytics-youtrack-attention-list">
            {attentionIssues.map((issue) => (
              <a key={issue.id} className="analytics-youtrack-attention-row" href={issue.url} target="_blank" rel="noreferrer">
                <span className="analytics-youtrack-issue-id">{issue.id}</span>
                <span className="analytics-youtrack-attention-copy">
                  <strong>{issue.title}</strong>
                  <small>{issue.status} · {issue.assignee} · в статусе {issue.statusAgeLabel}</small>
                </span>
                <span className="analytics-youtrack-attention-comment">{issue.latestComment?.text || "Открыть задачу"}</span>
                <AnalyticsIcon name="action" />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="analytics-youtrack-panel analytics-youtrack-board">
        <div className="analytics-youtrack-board-head">
          <div>
            <span className="analytics-kicker">Рабочая очередь</span>
            <h3>Все задачи</h3>
            <small>Показано {visibleIssues.length} из {issues.length}</small>
          </div>
          <div className="analytics-youtrack-search-wrap">
            <AnalyticsIcon name="search" />
            <input
              className="analytics-youtrack-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ATL, задача, статус или исполнитель"
              aria-label="Поиск задач"
            />
          </div>
        </div>

        <div className="analytics-youtrack-filter-bar" role="tablist" aria-label="Фильтр задач">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`analytics-youtrack-filter${filter === item.id ? " analytics-youtrack-filter-active" : ""}`}
              onClick={() => setFilter(item.id)}
              role="tab"
              aria-selected={filter === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="analytics-youtrack-table-wrap" data-testid="youtrack-issue-table">
          <table className="analytics-youtrack-table">
            <thead>
              <tr>
                <th>Задача</th>
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
                  <td><b className="analytics-youtrack-status-pill">{issue.status}</b></td>
                  <td>{issue.assignee}</td>
                  <td>{issue.statusAgeLabel}</td>
                  <td>{issue.ageLabel}</td>
                  <td>{formatDateTime(issue.updatedAt)} · {issue.inactiveLabel} назад</td>
                  <td><span className="analytics-youtrack-comment">{issue.latestComment?.text || "—"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleIssues.length ? <SusEmptyState title="Нет задач под этот фильтр">Измените фильтр или очистите строку поиска.</SusEmptyState> : null}
        </div>
      </section>

      {changes.length ? (
        <section className="analytics-youtrack-panel analytics-youtrack-changes">
          <div className="analytics-youtrack-panel-head">
            <div>
              <span className="analytics-kicker">Журнал проверки</span>
              <h3>Последние изменения</h3>
            </div>
            <SusStatus>{changes.length} событий</SusStatus>
          </div>
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
