function getTodayInputDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTaskDate(dateValue) {
  if (!dateValue) return { day: "--", month: "без даты" };
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { day: "--", month: "без даты" };

  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: date.toLocaleDateString("ru-RU", { month: "short" }).replace(".", ""),
  };
}

function CrmCommandDashboard({
  isAiReviewOpen,
  aiTaskSummary,
  analyticsTitle,
  analyticsTone,
  analyticsCoverageLabel,
  analyticsCoverageWidth,
  analyticsSignals,
  analyticsPulseRows,
  taskTotals,
  taskWidgets,
  crmTaskStats,
  taskDoneWidth,
  crmContentStats,
  crmMyTasks,
  crmMyTasksSaveState,
  expandedMyTaskId,
  setExpandedMyTaskId,
  updateMyTask,
  deleteMyTask,
  newMyTask,
  setNewMyTask,
  handleAddMyTask,
}) {
  const sortedMyTasks = [...crmMyTasks].sort((first, second) => String(first.dueDate || "").localeCompare(String(second.dueDate || "")));
  const totalDone = crmTaskStats.reduce((sum, item) => sum + item.done, 0);
  const totalTasks = crmTaskStats.reduce((sum, item) => sum + item.total, 0);

  return (
    <section className="analytics-surface analytics-crm-command mt-4">
      <div className="analytics-crm-command-head">
        <div>
          <span className="analytics-kicker">Command center</span>
        </div>
      </div>

      {isAiReviewOpen ? (
        <div className="analytics-crm-ai-review">
          <div className="analytics-crm-ai-score">
            <span>AI-аудит задач</span>
            <strong>{aiTaskSummary.score}</strong>
            <small>операционный балл</small>
          </div>
          <div className="analytics-crm-ai-list">
            {aiTaskSummary.alerts.map((alert) => (
              <p key={alert}>{alert}</p>
            ))}
            <small>Архив: {aiTaskSummary.archiveCount} · История: {aiTaskSummary.historyCount} записей</small>
          </div>
        </div>
      ) : null}

      <div className="analytics-crm-command-grid">
        <article className="analytics-crm-command-card analytics-crm-command-card-featured">
          <div className="analytics-crm-command-card-top">
            <span>Аналитика</span>
            <small>BI-центр</small>
          </div>
          <div className="analytics-crm-orb analytics-crm-orb-analytics" aria-hidden="true">
            <span />
            <i />
            <b />
          </div>
          <div className="analytics-crm-analytics-main">
            <div>
              <span className="analytics-crm-analytics-label">Пул системы</span>
              <strong className={analyticsTone}>{analyticsTitle}</strong>
            </div>
          </div>
          <div className="analytics-crm-analytics-gauge">
            <div>
              <span>Покрытие выплат</span>
              <b>{analyticsCoverageLabel}</b>
            </div>
            <div className="analytics-crm-analytics-track" aria-hidden="true">
              <i style={{ width: analyticsCoverageWidth }} />
            </div>
          </div>
          <div className="analytics-crm-analytics-metrics">
            {analyticsSignals.map(([label, value, tone]) => (
              <div key={label} className={`analytics-crm-analytics-metric is-${tone}`}>
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>
          <div className="analytics-crm-analytics-pulse">
            {analyticsPulseRows.map(([label, value, tone]) => (
              <div key={label} className={`analytics-crm-analytics-pulse-row is-${tone}`}>
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="analytics-crm-command-card analytics-crm-command-card-tasks">
          <div className="analytics-crm-command-card-top">
            <span>Задачи</span>
            <small>Команда</small>
          </div>
          <div className="analytics-crm-tasks-main">
            <div>
              <strong>{taskTotals.inWork} в работе</strong>
            </div>
          </div>
          <div className="analytics-crm-tasks-radar" aria-hidden="true">
            <span />
            <i />
            <b />
          </div>
          <div className="analytics-crm-task-widgets">
            {taskWidgets.map(([label, value, tone]) => (
              <div key={label} className={`analytics-crm-task-widget is-${tone}`}>
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>
          <div className="analytics-crm-tasks-board">
            {crmTaskStats.map((item) => (
              <div key={item.label} className={`analytics-crm-tasks-chip ${item.done === item.total && item.total > 0 ? "is-success" : "is-accent"}`}>
                <span>{item.label}</span>
                <b>{item.done}/{item.total}</b>
                <small>{item.inWork} в работе · {item.left} осталось</small>
              </div>
            ))}
          </div>
          <div className="analytics-crm-tasks-summary">
            <span>Прогресс закрытия задач</span>
            <b>{totalDone}/{totalTasks}</b>
            <i style={{ width: taskDoneWidth }} aria-hidden="true" />
          </div>
        </article>

        <article className="analytics-crm-command-card analytics-crm-command-card-content">
          <div className="analytics-crm-command-card-top">
            <span>Контент</span>
            <small>Хранилище</small>
          </div>
          <div className="analytics-crm-content-main">
            <div>
              <strong>6 баз</strong>
            </div>
          </div>
          <div className="analytics-crm-orb analytics-crm-orb-content" aria-hidden="true">
            <span />
            <i />
            <b />
          </div>
          <div className="analytics-crm-content-grid">
            {crmContentStats.map(([label, value, unit, tone]) => (
              <div key={label} className={`analytics-crm-content-cell is-${tone}`}>
                <span>{label}</span>
                <b>{value}</b>
                <small>{unit}</small>
              </div>
            ))}
          </div>
          <div className="analytics-crm-content-footer">
            <span>Единое хранилище текстов, материалов и production-базы</span>
          </div>
        </article>

        <article className="analytics-crm-command-card analytics-crm-command-card-my-tasks">
          <div className="analytics-crm-command-card-top">
            <span>Мои задачи</span>
            <small className={crmMyTasksSaveState === "Ошибка сохранения" ? "is-error" : ""}>{crmMyTasksSaveState}</small>
          </div>
          <div className="analytics-crm-my-tasks-main">
            <div>
              <strong>Мои задачи</strong>
            </div>
          </div>
          <div className="analytics-crm-my-tasks-list">
            {sortedMyTasks.map((task) => {
              const taskDate = formatTaskDate(task.dueDate);
              const isTodayTask = task.dueDate === getTodayInputDate();

              return (
                <div key={task.id} className={`analytics-crm-my-task-row${task.done ? " is-done" : ""}${isTodayTask ? " is-today" : ""}`}>
                  <label className="analytics-crm-my-task-check">
                    <input type="checkbox" checked={Boolean(task.done)} onChange={(event) => updateMyTask(task.id, { done: event.target.checked })} />
                    <span />
                  </label>
                  <div className="analytics-crm-my-task-date">
                    <b>{taskDate.day}</b>
                    <span>{taskDate.month}</span>
                  </div>
                  <input
                    className="analytics-crm-my-task-title"
                    value={task.title}
                    onChange={(event) => updateMyTask(task.id, { title: event.target.value })}
                    aria-label="Название задачи"
                  />
                  <input
                    className="analytics-crm-my-task-date-input"
                    type="date"
                    value={task.dueDate || ""}
                    onChange={(event) => updateMyTask(task.id, { dueDate: event.target.value })}
                    aria-label="Дата задачи"
                  />
                  <button
                    type="button"
                    className="analytics-crm-my-task-open"
                    onClick={() => setExpandedMyTaskId((current) => (current === task.id ? "" : current))}
                    aria-expanded={expandedMyTaskId === task.id}
                  >
                    {expandedMyTaskId === task.id ? "Скрыть" : "Открыть"}
                  </button>
                  <button type="button" className="analytics-crm-my-task-delete" onClick={() => deleteMyTask(task.id)} aria-label="Удалить задачу">
                    ×
                  </button>
                  {expandedMyTaskId === task.id ? (
                    <div className="analytics-crm-my-task-expanded">
                      <label>
                        <span>Полный текст задачи</span>
                        <textarea
                          value={task.title}
                          onChange={(event) => updateMyTask(task.id, { title: event.target.value })}
                          rows="4"
                          placeholder="Полная формулировка задачи"
                        />
                      </label>
                      <label>
                        <span>Доп. описание / ссылки</span>
                        <textarea
                          value={task.details || ""}
                          onChange={(event) => updateMyTask(task.id, { details: event.target.value })}
                          rows="4"
                          placeholder="Ссылки, детали, комментарии, что важно не потерять"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {!sortedMyTasks.length ? <div className="analytics-crm-my-tasks-empty">Добавь ближайшие задачи на май-июнь.</div> : null}
          </div>
          <div className="analytics-crm-my-task-add">
            <input
              value={newMyTask.title}
              onChange={(event) => setNewMyTask((current) => ({ ...current, title: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleAddMyTask();
              }}
              placeholder="Новая задача"
              aria-label="Новая задача"
            />
            <input
              type="date"
              value={newMyTask.dueDate}
              onChange={(event) => setNewMyTask((current) => ({ ...current, dueDate: event.target.value }))}
              aria-label="Дата новой задачи"
            />
            <button type="button" onClick={handleAddMyTask}>
              Добавить
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

export default CrmCommandDashboard;
