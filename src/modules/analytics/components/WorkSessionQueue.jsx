import { useEffect, useMemo, useRef, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import Wrapper from "./Wrapper";
import {
  WORK_SESSION_LANES,
  WORK_SESSION_QUEUE_STORAGE_KEY,
  WORK_SESSION_SOURCES,
  createEmptyWorkSessionState,
  createWorkSessionTask,
  finishWorkSession,
  normalizeWorkSessionState,
  startWorkSession,
} from "../data/workSessionQueueData";
import { loadServerContentResult, saveServerContent } from "../services/contentStore";
import "../styles/workSessionQueue.css";

function readStoredQueue() {
  if (typeof window === "undefined") return createEmptyWorkSessionState();

  try {
    const stored = window.localStorage.getItem(WORK_SESSION_QUEUE_STORAGE_KEY);
    return normalizeWorkSessionState(stored ? JSON.parse(stored) : null);
  } catch {
    return createEmptyWorkSessionState();
  }
}

function formatElapsed(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const restSeconds = seconds % 60;
  return [hours, minutes, restSeconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatClock(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function getTaskElapsed(task, now) {
  const activeDelta = task.status === "in_progress" && task.activeSince
    ? Math.max(0, now - new Date(task.activeSince).getTime())
    : 0;
  return Math.max(0, Number(task.timeSpentMs) || 0) + activeDelta;
}

function getLaneTasks(session, laneId) {
  if (!session) return [];
  if (laneId === "work") return session.tasks.filter((task) => task.status === "in_progress" || task.status === "waiting");
  return session.tasks.filter((task) => task.status === laneId);
}

function moveTaskToStatus(task, nextStatus, now) {
  const leavingActive = task.status === "in_progress" && task.activeSince;
  const timeSpentMs = leavingActive
    ? task.timeSpentMs + Math.max(0, now - new Date(task.activeSince).getTime())
    : task.timeSpentMs;

  return {
    ...task,
    status: nextStatus,
    timeSpentMs,
    activeSince: nextStatus === "in_progress" ? new Date(now).toISOString() : "",
    completedAt: nextStatus === "done" ? new Date(now).toISOString() : "",
  };
}

function sourceLabel(sourceId) {
  return WORK_SESSION_SOURCES.find((item) => item.id === sourceId)?.label || "Сессия";
}

function WorkSessionTaskCard({
  task,
  now,
  isExpanded,
  checklistDraft,
  onChecklistDraftChange,
  onToggleExpanded,
  onUpdate,
  onMove,
  onDelete,
}) {
  const completedChecks = task.checklist.filter((item) => item.done).length;
  const canOpenLink = /^https?:\/\//i.test(task.link.trim());

  function addChecklistItem() {
    const text = checklistDraft.trim();
    if (!text) return;
    onUpdate({
      checklist: [
        ...task.checklist,
        { id: `check-${Date.now()}-${Math.random().toString(16).slice(2)}`, text, done: false },
      ],
    });
    onChecklistDraftChange("");
  }

  return (
    <article className={`work-session-task work-session-task-${task.status}`}>
      <div className="work-session-task-topline">
        <button
          type="button"
          className="work-session-task-title"
          onClick={onToggleExpanded}
          aria-expanded={isExpanded}
        >
          <span>{task.title}</span>
          <small>{sourceLabel(task.source)}{task.owner ? ` · ${task.owner}` : ""}</small>
        </button>
        <span className="work-session-task-time" title="Время в работе">
          {formatElapsed(getTaskElapsed(task, now))}
        </span>
      </div>

      <div className="work-session-task-progress">
        <span>
          {task.checklist.length ? `${completedChecks}/${task.checklist.length} пунктов` : `Добавлена в ${formatClock(task.createdAt)}`}
        </span>
        {task.status === "waiting" ? <strong>Ждём</strong> : null}
        {task.carriedFromTaskId ? <strong>Перенесена</strong> : null}
      </div>

      <div className="work-session-task-actions">
        {task.status !== "queued" ? (
          <button type="button" className="work-session-icon-btn" onClick={() => onMove("queued")} title="Вернуть в очередь" aria-label="Вернуть в очередь">
            ←
          </button>
        ) : null}
        {task.status !== "in_progress" ? (
          <button type="button" className="work-session-icon-btn work-session-icon-btn-play" onClick={() => onMove("in_progress")} title="Взять в работу" aria-label="Взять в работу">
            ▶
          </button>
        ) : (
          <button type="button" className="work-session-icon-btn" onClick={() => onMove("waiting")} title="Поставить на ожидание" aria-label="Поставить на ожидание">
            ‖
          </button>
        )}
        {task.status !== "done" ? (
          <button type="button" className="work-session-icon-btn work-session-icon-btn-done" onClick={() => onMove("done")} title="Отметить готовой" aria-label="Отметить готовой">
            ✓
          </button>
        ) : null}
        <button type="button" className="work-session-icon-btn" onClick={onToggleExpanded} title="Открыть детали" aria-label="Открыть детали">
          {isExpanded ? "−" : "•••"}
        </button>
      </div>

      {isExpanded ? (
        <div className="work-session-task-details">
          <label>
            <span>Задача</span>
            <input value={task.title} onChange={(event) => onUpdate({ title: event.target.value })} />
          </label>
          <div className="work-session-task-detail-grid">
            <label>
              <span>Откуда</span>
              <select value={task.source} onChange={(event) => onUpdate({ source: event.target.value })}>
                {WORK_SESSION_SOURCES.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
              </select>
            </label>
            <label>
              <span>Кто делает / чат</span>
              <input
                value={task.owner}
                onChange={(event) => onUpdate({ owner: event.target.value })}
                placeholder="Codex 2, Виктор..."
              />
            </label>
          </div>
          <label>
            <span>Ссылка на чат или материал</span>
            <div className="work-session-link-field">
              <input
                value={task.link}
                onChange={(event) => onUpdate({ link: event.target.value })}
                placeholder="https://..."
              />
              {canOpenLink ? <a href={task.link.trim()} target="_blank" rel="noreferrer" title="Открыть ссылку">↗</a> : null}
            </div>
          </label>
          <label>
            <span>Короткая заметка</span>
            <textarea
              value={task.note}
              onChange={(event) => onUpdate({ note: event.target.value })}
              placeholder="Что проверить или какой результат нужен"
              rows="2"
            />
          </label>

          <div className="work-session-checklist">
            <div className="work-session-checklist-head">
              <strong>Чек-лист</strong>
              <span>{completedChecks}/{task.checklist.length}</span>
            </div>
            {task.checklist.map((item) => (
              <div className="work-session-check-row" key={item.id}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => onUpdate({
                    checklist: task.checklist.map((entry) => entry.id === item.id ? { ...entry, done: !entry.done } : entry),
                  })}
                  aria-label={`Отметить пункт: ${item.text}`}
                />
                <input
                  value={item.text}
                  onChange={(event) => onUpdate({
                    checklist: task.checklist.map((entry) => entry.id === item.id ? { ...entry, text: event.target.value } : entry),
                  })}
                />
                <button
                  type="button"
                  onClick={() => onUpdate({ checklist: task.checklist.filter((entry) => entry.id !== item.id) })}
                  title="Удалить пункт"
                  aria-label="Удалить пункт"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="work-session-check-add">
              <input
                value={checklistDraft}
                onChange={(event) => onChecklistDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="Добавить пункт"
              />
              <button type="button" onClick={addChecklistItem} title="Добавить пункт" aria-label="Добавить пункт">+</button>
            </div>
          </div>

          <div className="work-session-task-delete">
            <AnalyticsActionButton variant="danger" size="sm" onClick={onDelete}>Удалить задачу</AnalyticsActionButton>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function WorkSessionQueue() {
  const [queue, setQueue] = useState(readStoredQueue);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Загрузка...");
  const [now, setNow] = useState(Date.now());
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureSource, setCaptureSource] = useState("zoom");
  const [expandedTaskId, setExpandedTaskId] = useState("");
  const [checklistDrafts, setChecklistDrafts] = useState({});
  const [isFinishOpen, setIsFinishOpen] = useState(false);
  const [carryTaskIds, setCarryTaskIds] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const saveTimerRef = useRef(null);
  const saveRequestRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const savePendingRef = useRef(false);
  const latestQueueRef = useRef(queue);

  const activeSession = queue.sessions.find((session) => session.id === queue.activeSessionId) || null;
  const unfinishedTasks = activeSession?.tasks.filter((task) => task.status !== "done") || [];
  const laneTasks = useMemo(() => Object.fromEntries(
    WORK_SESSION_LANES.map((lane) => [lane.id, getLaneTasks(activeSession, lane.id)]),
  ), [activeSession]);
  const activeWorkCount = laneTasks.work.filter((task) => task.status === "in_progress").length;
  const sessionElapsed = activeSession ? now - new Date(activeSession.startedAt).getTime() : 0;
  const completedSessions = queue.sessions.filter((session) => session.status === "completed");

  useEffect(() => {
    let mounted = true;
    loadServerContentResult(WORK_SESSION_QUEUE_STORAGE_KEY).then((result) => {
      if (!mounted) return;
      if (result.ok && result.exists) {
        const normalized = normalizeWorkSessionState(result.value);
        setQueue(normalized);
        try {
          window.localStorage.setItem(WORK_SESSION_QUEUE_STORAGE_KEY, JSON.stringify(normalized));
        } catch {
          // Сервер остаётся основным хранилищем.
        }
      }
      setSaveState(result.ok ? "Сохранено" : "Локально");
      setIsLoaded(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeSession) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeSession?.id]);

  useEffect(() => {
    if (!isLoaded) return undefined;

    latestQueueRef.current = queue;
    try {
      window.localStorage.setItem(WORK_SESSION_QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch {
      // Сохранение на сервере продолжает работать.
    }

    setSaveState("Сохраняю...");
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(flushQueueSave, 550);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [queue, isLoaded]);

  async function flushQueueSave() {
    if (saveInFlightRef.current) {
      savePendingRef.current = true;
      return;
    }

    const payload = latestQueueRef.current;
    const requestId = saveRequestRef.current + 1;
    saveRequestRef.current = requestId;
    saveInFlightRef.current = true;
    savePendingRef.current = false;

    const saved = await saveServerContent(WORK_SESSION_QUEUE_STORAGE_KEY, payload);
    saveInFlightRef.current = false;

    if (savePendingRef.current || latestQueueRef.current !== payload) {
      flushQueueSave();
      return;
    }

    if (saveRequestRef.current === requestId) setSaveState(saved ? "Сохранено" : "Локально");
  }

  function updateActiveSession(updater) {
    setQueue((current) => ({
      ...current,
      sessions: current.sessions.map((session) => session.id === current.activeSessionId ? updater(session) : session),
    }));
  }

  function updateTask(taskId, patch) {
    updateActiveSession((session) => ({
      ...session,
      tasks: session.tasks.map((task) => task.id === taskId ? { ...task, ...patch } : task),
    }));
  }

  function moveTask(taskId, nextStatus) {
    const movedAt = Date.now();
    updateActiveSession((session) => ({
      ...session,
      tasks: session.tasks.map((task) => task.id === taskId ? moveTaskToStatus(task, nextStatus, movedAt) : task),
    }));
  }

  function addTask(event) {
    event.preventDefault();
    const title = captureTitle.trim();
    if (!title || !activeSession) return;
    updateActiveSession((session) => ({
      ...session,
      tasks: [...session.tasks, createWorkSessionTask({ title, source: captureSource })],
    }));
    setCaptureTitle("");
  }

  function openFinish() {
    setCarryTaskIds(unfinishedTasks.map((task) => task.id));
    setIsFinishOpen(true);
  }

  function confirmFinish() {
    setQueue((current) => finishWorkSession(current, carryTaskIds));
    setIsFinishOpen(false);
    setExpandedTaskId("");
  }

  if (!isLoaded) {
    return (
      <Wrapper as="section" marginTop="lg">
        <section className="analytics-surface work-session-loading">Загружаю очередь рабочей сессии...</section>
      </Wrapper>
    );
  }

  return (
    <Wrapper as="section" marginTop="lg" gap="lg">
      <section className="analytics-surface work-session-hero">
        <div>
          <p className="analytics-kicker">Atlas · рабочая сессия</p>
          <h2>Очередь задач</h2>
          <p>Фиксируем всё, что появляется во время Zoom, проверок сайта и параллельной работы в Codex.</p>
        </div>

        <div className="work-session-hero-actions">
          <span className={`work-session-save work-session-save-${saveState === "Сохранено" ? "ok" : "pending"}`}>{saveState}</span>
          {activeSession ? (
            <>
              <strong className="work-session-main-timer">{formatElapsed(sessionElapsed)}</strong>
              {completedSessions.length ? (
                <button type="button" className="work-session-history-btn" onClick={() => setIsHistoryOpen((current) => !current)}>
                  История · {completedSessions.length}
                </button>
              ) : null}
              <AnalyticsActionButton variant="warning" onClick={openFinish}>Завершить сессию</AnalyticsActionButton>
            </>
          ) : (
            <>
              {completedSessions.length ? (
                <button type="button" className="work-session-history-btn" onClick={() => setIsHistoryOpen((current) => !current)}>
                  История · {completedSessions.length}
                </button>
              ) : null}
              <AnalyticsActionButton
                variant="primary"
                onClick={() => {
                  setQueue((current) => startWorkSession(current));
                  setNow(Date.now());
                }}
              >
                Начать сессию{queue.pendingTasks.length ? ` · ${queue.pendingTasks.length} перенесено` : ""}
              </AnalyticsActionButton>
            </>
          )}
        </div>

        {activeSession ? (
          <div className="work-session-summary">
            <span><strong>{laneTasks.queued.length}</strong> в очереди</span>
            <span><strong>{laneTasks.work.length}</strong> в работе</span>
            <span><strong>{laneTasks.done.length}</strong> готово</span>
            <span><strong>{activeSession.tasks.length}</strong> всего</span>
          </div>
        ) : null}
      </section>

      {!activeSession && queue.pendingTasks.length ? (
        <section className="work-session-carry-banner">
          <strong>{queue.pendingTasks.length} незавершённых задач</strong>
          <span>Они автоматически появятся в очереди после старта следующей сессии.</span>
        </section>
      ) : null}

      {activeSession ? (
        <>
          <form className="analytics-surface work-session-capture" onSubmit={addTask}>
            <label htmlFor="work-session-capture">Быстро добавить</label>
            <input
              id="work-session-capture"
              value={captureTitle}
              onChange={(event) => setCaptureTitle(event.target.value)}
              placeholder="Что нашли или что нужно сделать?"
              autoComplete="off"
            />
            <select value={captureSource} onChange={(event) => setCaptureSource(event.target.value)} aria-label="Источник задачи">
              {WORK_SESSION_SOURCES.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
            </select>
            <button type="submit" disabled={!captureTitle.trim()} title="Добавить задачу" aria-label="Добавить задачу">+</button>
          </form>

          {activeWorkCount > 4 ? (
            <div className="work-session-focus-warning">
              Сейчас одновременно выполняется {activeWorkCount} задач. Лучше вернуть часть в очередь, чтобы сохранить фокус.
            </div>
          ) : null}

          <div className="work-session-board">
            {WORK_SESSION_LANES.map((lane) => (
              <section className={`work-session-lane work-session-lane-${lane.id}`} key={lane.id}>
                <header>
                  <div>
                    <h3>{lane.label}</h3>
                    <span>{lane.hint}</span>
                  </div>
                  <strong>{laneTasks[lane.id].length}</strong>
                </header>

                <div className="work-session-task-list">
                  {laneTasks[lane.id].map((task) => (
                    <WorkSessionTaskCard
                      key={task.id}
                      task={task}
                      now={now}
                      isExpanded={expandedTaskId === task.id}
                      checklistDraft={checklistDrafts[task.id] || ""}
                      onChecklistDraftChange={(value) => setChecklistDrafts((current) => ({ ...current, [task.id]: value }))}
                      onToggleExpanded={() => setExpandedTaskId((current) => current === task.id ? "" : task.id)}
                      onUpdate={(patch) => updateTask(task.id, patch)}
                      onMove={(status) => moveTask(task.id, status)}
                      onDelete={() => {
                        updateActiveSession((session) => ({
                          ...session,
                          tasks: session.tasks.filter((item) => item.id !== task.id),
                        }));
                        setExpandedTaskId("");
                      }}
                    />
                  ))}
                  {!laneTasks[lane.id].length ? <p className="work-session-lane-empty">Пока пусто</p> : null}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <section className="work-session-idle">
          <span>00:00:00</span>
          <h3>Сессия не запущена</h3>
          <p>Нажмите «Начать сессию», и таймер с очередью будут готовы к работе.</p>
        </section>
      )}

      {isHistoryOpen && completedSessions.length ? (
        <section className="analytics-surface work-session-history">
          <div className="work-session-section-title">
            <div>
              <p className="analytics-kicker">Архив</p>
              <h3>Предыдущие сессии</h3>
            </div>
            <button type="button" onClick={() => setIsHistoryOpen(false)} title="Закрыть историю" aria-label="Закрыть историю">×</button>
          </div>
          <div className="work-session-history-list">
            {completedSessions.slice(0, 10).map((session) => {
              const done = session.tasks.filter((task) => task.status === "done").length;
              const duration = new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime();
              return (
                <details key={session.id}>
                  <summary>
                    <span>{session.title}</span>
                    <strong>{done}/{session.tasks.length} · {formatElapsed(duration)}</strong>
                  </summary>
                  <ul>
                    {session.tasks.map((task) => (
                      <li key={task.id} className={task.status === "done" ? "is-done" : ""}>
                        <span>{task.status === "done" ? "✓" : "→"}</span>
                        <p>{task.title}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </section>
      ) : null}

      {isFinishOpen && activeSession ? (
        <div className="work-session-modal-backdrop" role="presentation">
          <section className="work-session-modal" role="dialog" aria-modal="true" aria-labelledby="work-session-finish-title">
            <div className="work-session-section-title">
              <div>
                <p className="analytics-kicker">Финальный просмотр</p>
                <h3 id="work-session-finish-title">Завершить рабочую сессию</h3>
              </div>
              <button type="button" onClick={() => setIsFinishOpen(false)} title="Закрыть" aria-label="Закрыть">×</button>
            </div>
            <div className="work-session-finish-stats">
              <span><strong>{laneTasks.done.length}</strong> готово</span>
              <span><strong>{unfinishedTasks.length}</strong> не завершено</span>
              <span><strong>{formatElapsed(sessionElapsed)}</strong> длилась сессия</span>
            </div>

            {unfinishedTasks.length ? (
              <div className="work-session-carry-list">
                <strong>Перенести в следующую сессию</strong>
                {unfinishedTasks.map((task) => (
                  <label key={task.id}>
                    <input
                      type="checkbox"
                      checked={carryTaskIds.includes(task.id)}
                      onChange={() => setCarryTaskIds((current) => current.includes(task.id)
                        ? current.filter((id) => id !== task.id)
                        : [...current, task.id])}
                    />
                    <span>{task.title}</span>
                  </label>
                ))}
              </div>
            ) : <p className="work-session-all-done">Все задачи этой сессии закрыты.</p>}

            <div className="work-session-modal-actions">
              <AnalyticsActionButton variant="secondary" onClick={() => setIsFinishOpen(false)}>Продолжить работу</AnalyticsActionButton>
              <AnalyticsActionButton variant="primary" onClick={confirmFinish}>
                Завершить{carryTaskIds.length ? ` и перенести ${carryTaskIds.length}` : ""}
              </AnalyticsActionButton>
            </div>
          </section>
        </div>
      ) : null}
    </Wrapper>
  );
}
