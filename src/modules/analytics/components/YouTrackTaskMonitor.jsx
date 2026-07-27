import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  CircleDot,
  Clock3,
  ExternalLink,
  ListChecks,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Separator } from "../../../components/ui/separator";
import { Switch } from "../../../components/ui/switch";
import { getServerJson, postServerJson } from "../services/contentStore";
import "../styles/youtrack-task-monitor.css";

const STATUS_FILTERS = [
  { id: "open", label: "Открытые" },
  { id: "attention", label: "Нужен ответ" },
  { id: "stale", label: "Зависшие" },
  { id: "all", label: "Все" },
];

const STATUS_SUMMARY_ORDER = [
  "Нужно сделать",
  "В обработке",
  "Нужно уточнение",
  "Тестирование",
  "Возвращено в работу",
  "Готово",
];
const SHOW_STOPPER_PRIORITY_PATTERN = /show-stopper|critical|blocker|критичес|блокер/i;

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
  if (SHOW_STOPPER_PRIORITY_PATTERN.test(issue.priority || "")) return "danger";
  if (issue.inactiveMs >= 24 * 60 * 60 * 1000) return "stale";
  if (issue.isResolved) return "done";
  return "active";
}

function getStatusTone(status = "") {
  if (/готово|done|resolved/i.test(status)) return "done";
  if (/уточ|возвращ|blocked/i.test(status)) return "attention";
  if (/тест|обработ|progress/i.test(status)) return "active";
  return "neutral";
}

function getPriorityTone(priority = "") {
  if (SHOW_STOPPER_PRIORITY_PATTERN.test(priority)) return "danger";
  if (/major|high|высок/i.test(priority)) return "major";
  return "normal";
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
  const [summary, setSummary] = useState({ total: 0, open: 0, done: 0, attention: 0, waitsForDeveloper: 0, stale: 0, showStoppers: 0, statuses: {} });
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
  const metrics = [
    { label: "Открыто", value: summary.open, tone: "active", Icon: ListChecks },
    { label: "Нужен ответ", value: summary.attention, tone: summary.attention ? "danger" : "muted", Icon: AlertTriangle },
    { label: "Зависло 24ч+", value: summary.stale, tone: summary.stale ? "warning" : "muted", Icon: Clock3 },
    { label: "Show-stopper", value: summary.showStoppers, tone: summary.showStoppers ? "danger" : "muted", Icon: ShieldAlert },
    { label: "Готово", value: summary.done, tone: "success", Icon: CheckCircle2 },
  ];

  return (
    <section className="analytics-youtrack analytics-task-v2">
      <header className="analytics-surface analytics-task-v2-header">
        <div className="analytics-task-v2-title">
          <span className="analytics-task-v2-live">
            <i aria-hidden="true" />
            YouTrack live
          </span>
          <div>
            <h2>Задачи Atlas</h2>
            <Badge variant="outline" className="analytics-task-v2-count">
              {summary.total} всего
            </Badge>
          </div>
          <p>Последняя синхронизация: {formatDateTime(lastCheckedAt)}</p>
        </div>

        <div className="analytics-task-v2-actions">
          <div className="analytics-task-v2-state" aria-live="polite">
            <CircleDot aria-hidden="true" />
            <span>{loadState}</span>
          </div>
          <label className="analytics-task-v2-auto">
            <Switch checked={autoCheck} onCheckedChange={setAutoCheck} aria-label="Автопроверка каждую минуту" />
            <span>Автопроверка</span>
            <small>60 сек</small>
          </label>
          <Button
            type="button"
            variant="outline"
            className="analytics-task-v2-button analytics-task-v2-button-secondary"
            onClick={loadIssues}
            disabled={isLoading}
          >
            <RefreshCw className={isLoading ? "analytics-task-v2-spin" : ""} aria-hidden="true" />
            Обновить
          </Button>
          <Button
            type="button"
            className="analytics-task-v2-button analytics-task-v2-button-primary"
            onClick={() => checkChanges({ notify: true })}
            disabled={isLoading}
          >
            <BellRing aria-hidden="true" />
            Проверить
          </Button>
        </div>
      </header>

      <section className="analytics-task-v2-metrics" aria-label="Сводка по задачам">
        {metrics.map(({ label, value, tone, Icon }) => (
          <article key={label} className={`analytics-task-v2-metric analytics-task-v2-metric-${tone}`}>
            <Icon aria-hidden="true" />
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </article>
        ))}
      </section>

      <div className="analytics-task-v2-layout">
        <aside className="analytics-surface analytics-task-v2-sidebar">
          <section>
            <div className="analytics-task-v2-section-head">
              <div>
                <span>Фокус</span>
                <h3>Нужен ответ</h3>
              </div>
              <Badge variant="destructive" className="analytics-task-v2-attention-count">
                {summary.attention}
              </Badge>
            </div>

            <div className="analytics-task-v2-attention-list">
              {attentionIssues.map((issue) => (
                <a key={issue.id} className="analytics-task-v2-attention-card" href={issue.url} target="_blank" rel="noreferrer">
                  <span>
                    <b>{issue.id}</b>
                    <small>{issue.statusAgeLabel}</small>
                  </span>
                  <strong>{issue.title}</strong>
                  <small>{issue.status} · {issue.assignee}</small>
                  {issue.latestComment?.text ? <p>{issue.latestComment.text}</p> : null}
                </a>
              ))}
              {!attentionIssues.length ? (
                <div className="analytics-task-v2-clear">
                  <CheckCircle2 aria-hidden="true" />
                  <span>Нет задач, требующих ответа</span>
                </div>
              ) : null}
            </div>
          </section>

          <Separator className="analytics-task-v2-separator" />

          <section>
            <div className="analytics-task-v2-section-head">
              <div>
                <span>Распределение</span>
                <h3>По статусам</h3>
              </div>
            </div>
            <div className="analytics-task-v2-status-list">
              {STATUS_SUMMARY_ORDER.map((status) => (
                <div key={status}>
                  <span>{status}</span>
                  <strong>{summary.statuses?.[status] || 0}</strong>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="analytics-surface analytics-task-v2-queue">
          <div className="analytics-task-v2-toolbar">
            <div>
              <span>Рабочая очередь</span>
              <h3>{visibleIssues.length} задач</h3>
            </div>

            <label className="analytics-task-v2-search">
              <Search aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ATL, название, статус или исполнитель"
                aria-label="Поиск задач"
              />
            </label>
          </div>

          <div className="analytics-task-v2-filters" role="group" aria-label="Фильтр задач">
            {STATUS_FILTERS.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                className={`analytics-task-v2-filter${filter === item.id ? " analytics-task-v2-filter-active" : ""}`}
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="analytics-task-v2-list">
            {visibleIssues.map((issue) => (
              <article key={issue.id} className={`analytics-task-v2-item analytics-task-v2-item-${getIssueTone(issue)}`}>
                <div className="analytics-task-v2-item-main">
                  <div className="analytics-task-v2-item-meta">
                    <a href={issue.url} target="_blank" rel="noreferrer">
                      {issue.id}
                    </a>
                    <Badge
                      variant="outline"
                      className={`analytics-task-v2-priority analytics-task-v2-priority-${getPriorityTone(issue.priority)}`}
                    >
                      {issue.priority}
                    </Badge>
                  </div>
                  <h4>{issue.title}</h4>
                  {issue.latestComment?.text ? <p>{issue.latestComment.text}</p> : <p className="analytics-task-v2-no-comment">Комментариев пока нет</p>}
                </div>

                <div className="analytics-task-v2-item-facts">
                  <div>
                    <span>Статус</span>
                    <Badge
                      variant="outline"
                      className={`analytics-task-v2-status analytics-task-v2-status-${getStatusTone(issue.status)}`}
                    >
                      {issue.status}
                    </Badge>
                  </div>
                  <div>
                    <span>Исполнитель</span>
                    <strong><UserRound aria-hidden="true" />{issue.assignee || "—"}</strong>
                  </div>
                  <div>
                    <span>В статусе</span>
                    <strong><Clock3 aria-hidden="true" />{issue.statusAgeLabel}</strong>
                  </div>
                  <div>
                    <span>Обновлено</span>
                    <strong>{issue.inactiveLabel} назад</strong>
                  </div>
                </div>

                <a
                  className="analytics-task-v2-open"
                  href={issue.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Открыть ${issue.id} в YouTrack`}
                  title="Открыть в YouTrack"
                >
                  <ExternalLink aria-hidden="true" />
                </a>
              </article>
            ))}
            {!visibleIssues.length ? (
              <div className="analytics-task-v2-empty">
                <Search aria-hidden="true" />
                <strong>Задачи не найдены</strong>
                <span>Измените поиск или фильтр</span>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {changes.length ? (
        <section className="analytics-surface analytics-task-v2-changes">
          <div className="analytics-task-v2-section-head">
            <div>
              <span>С этой проверки</span>
              <h3>Последние изменения</h3>
            </div>
          </div>
          {changes.slice(0, 8).map((change, index) => (
            <div key={`${change.issue?.id}-${change.type}-${index}`} className="analytics-task-v2-change">
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
