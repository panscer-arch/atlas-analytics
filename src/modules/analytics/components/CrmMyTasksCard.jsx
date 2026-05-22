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

function CrmMyTasksCard({
  tasks,
  saveState,
  expandedTaskId,
  setExpandedTaskId,
  updateTask,
  deleteTask,
  newTask,
  setNewTask,
  addTask,
}) {
  const sortedTasks = [...tasks].sort((first, second) => String(first.dueDate || "").localeCompare(String(second.dueDate || "")));

  return (
    <article className="analytics-crm-command-card analytics-crm-command-card-my-tasks">
      <div className="analytics-crm-command-card-top">
        <span>Мои задачи</span>
        <small className={saveState === "Ошибка сохранения" ? "is-error" : ""}>{saveState}</small>
      </div>
      <div className="analytics-crm-my-tasks-main">
        <div>
          <strong>Мои задачи</strong>
        </div>
      </div>
      <div className="analytics-crm-my-tasks-list">
        {sortedTasks.map((task) => {
          const taskDate = formatTaskDate(task.dueDate);
          const isTodayTask = task.dueDate === getTodayInputDate();

          return (
            <div key={task.id} className={`analytics-crm-my-task-row${task.done ? " is-done" : ""}${isTodayTask ? " is-today" : ""}`}>
              <label className="analytics-crm-my-task-check">
                <input type="checkbox" checked={Boolean(task.done)} onChange={(event) => updateTask(task.id, { done: event.target.checked })} />
                <span />
              </label>
              <div className="analytics-crm-my-task-date">
                <b>{taskDate.day}</b>
                <span>{taskDate.month}</span>
              </div>
              <input
                className="analytics-crm-my-task-title"
                value={task.title}
                onChange={(event) => updateTask(task.id, { title: event.target.value })}
                aria-label="Название задачи"
              />
              <input
                className="analytics-crm-my-task-date-input"
                type="date"
                value={task.dueDate || ""}
                onChange={(event) => updateTask(task.id, { dueDate: event.target.value })}
                aria-label="Дата задачи"
              />
              <button
                type="button"
                className="analytics-crm-my-task-open"
                onClick={() => setExpandedTaskId((current) => (current === task.id ? "" : task.id))}
                aria-expanded={expandedTaskId === task.id}
              >
                {expandedTaskId === task.id ? "Скрыть" : "Открыть"}
              </button>
              <button type="button" className="analytics-crm-my-task-delete" onClick={() => deleteTask(task.id)} aria-label="Удалить задачу">
                ×
              </button>
              {expandedTaskId === task.id ? (
                <div className="analytics-crm-my-task-expanded">
                  <label>
                    <span>Полный текст задачи</span>
                    <textarea
                      value={task.title}
                      onChange={(event) => updateTask(task.id, { title: event.target.value })}
                      rows="4"
                      placeholder="Полная формулировка задачи"
                    />
                  </label>
                  <label>
                    <span>Доп. описание / ссылки</span>
                    <textarea
                      value={task.details || ""}
                      onChange={(event) => updateTask(task.id, { details: event.target.value })}
                      rows="4"
                      placeholder="Ссылки, детали, комментарии, что важно не потерять"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}
        {!sortedTasks.length ? <div className="analytics-crm-my-tasks-empty">Добавь ближайшие задачи на май-июнь.</div> : null}
      </div>
      <div className="analytics-crm-my-task-add">
        <input
          value={newTask.title}
          onChange={(event) => setNewTask((current) => ({ ...current, title: event.target.value }))}
          onKeyDown={(event) => {
            if (event.key === "Enter") addTask();
          }}
          placeholder="Новая задача"
          aria-label="Новая задача"
        />
        <input
          type="date"
          value={newTask.dueDate}
          onChange={(event) => setNewTask((current) => ({ ...current, dueDate: event.target.value }))}
          aria-label="Дата новой задачи"
        />
        <button type="button" onClick={addTask}>
          Добавить
        </button>
      </div>
    </article>
  );
}

export default CrmMyTasksCard;
