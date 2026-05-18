import { useState } from "react";
import LaunchProgressBar from "./LaunchProgressBar";

const LAUNCH_CHECKLIST_STORAGE_KEY = "atlas.analytics.launchChecklist.tasks.v3";
const KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY = "atlas.analytics.knowledgeBaseChecklist.tasks.v1";
const LAUNCH_STATUSES = ["В работе", "Готово", "Отложено"];

const defaultLaunchChecklistTasks = [
  {
    id: "github-audit",
    title: "Самостоятельный аудит с помощью GitHub",
    responsible: "Разработка",
    comment: "Проверить репозитории, актуальные ветки, коммиты, PR, деплой и список технических хвостов перед Beta.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "admin-panel",
    title: "Разработать админ-панель",
    responsible: "Backend / frontend",
    comment: "Взять у Иванова API, уточнить язык профиля и собрать базовые действия для управления проектом.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "partner-video-translations",
    title: "Перевести ролик по партнерке на языки",
    responsible: "Контент / перевод",
    comment: "Уточнить нужные языки, подготовить переводы, проверить смысл партнерской механики и терминологию.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "cycle-video",
    title: "Ролик «Как работает цикл»",
    responsible: "Контент / продукт",
    comment: "Объяснить путь участника: подключение MetaMask, выбор тарифа, создание цикла, ожидание завершения и claim.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "ideology-video",
    title: "Идеологический ролик",
    responsible: "Контент / маркетинг",
    comment: "Собрать короткое позиционирование проекта: зачем он нужен, какую проблему решает и почему участнику понятно начинать.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "knowledge-base",
    title: "База знаний",
    responsible: "Контент / продукт",
    comment: "Наполнить разделы: презентация (вычитать), FAQ, ролики, White Paper, материалы по MLM, вебинары и инструкции.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "registration-cycle-video",
    title: "Ролик 30 сек про регистрацию и создание цикла",
    responsible: "Контент / обучение",
    comment: "Пошаговая инструкция: подключить MetaMask, зайти в циклы, выбрать тариф, подтвердить транзакцию и увидеть активный цикл.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "brandbook-upload",
    title: "Брендбук",
    responsible: "Дизайн / продукт",
    comment: "Подготовить брендбук и залить его в личный кабинет или базу знаний, чтобы команда брала материалы из одного места.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
];

const defaultKnowledgeBaseChecklistTasks = [
  {
    id: "kb-presentation",
    title: "Презентация",
    responsible: "Контент / продукт",
    assignee: "",
    comment: "Вычитать презентацию, проверить структуру, формулировки, цифры, механику циклов и партнерской программы.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "kb-faq",
    title: "FAQ",
    responsible: "Поддержка / продукт",
    assignee: "",
    comment: "Собрать частые вопросы по MetaMask, регистрации, циклам, claim, reinvest, тарифам и партнерке.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "kb-videos",
    title: "Ролики",
    responsible: "Контент / маркетинг",
    assignee: "",
    comment: "Собрать и разложить обучающие ролики: партнерка, как работает цикл, идеология, регистрация и создание цикла.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "kb-white-paper",
    title: "White Paper",
    responsible: "Продукт / юридический",
    assignee: "",
    comment: "Подготовить или актуализировать White Paper: экономика, smart-contract механика, тарифы, комиссии и риски.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "kb-mlm-materials",
    title: "Материалы по MLM",
    responsible: "Продукт / партнерка",
    assignee: "",
    comment: "Продумать материалы по MLM: статусы, уровни, компрессия, matching bonus и понятная схема начислений.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "kb-webinars",
    title: "Вебинары",
    responsible: "Обучение / маркетинг",
    assignee: "",
    comment: "Подготовить раздел для вебинаров: расписание, записи, темы, ссылки и ответственных за проведение.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "kb-instructions",
    title: "Инструкции",
    responsible: "Поддержка / продукт",
    assignee: "",
    comment: "Собрать пошаговые инструкции по регистрации, подключению кошелька, покупке цикла, claim и повторному депозиту.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
];

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function createLaunchTask(overrides = {}) {
  return {
    id: `launch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "",
    responsible: "",
    assignee: "",
    comment: "",
    dueDate: "",
    status: "В работе",
    done: false,
    ...overrides,
  };
}

function getLaunchStatusTone(status) {
  if (status === "Готово") return "done";
  if (status === "Отложено") return "paused";
  return "active";
}

function readStoredTasks(storageKey, fallbackTasks) {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : fallbackTasks;
  } catch {
    return fallbackTasks;
  }
}

function persistChecklistTasks(storageKey, nextTasks) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(nextTasks));
  } catch {
    // Если storage недоступен, чеклист всё равно работает до перезагрузки страницы.
  }
}

function patchChecklistTask(task, patch) {
  const next = { ...task, ...patch };
  if (patch.status === "Готово") next.done = true;
  if (patch.done === true) next.status = "Готово";
  if (patch.done === false && task.status === "Готово" && !patch.status) next.status = "В работе";
  return next;
}

function LaunchChecklistSection() {
  const [activeBoard, setActiveBoard] = useState("launch");
  const [launchTasks, setLaunchTasks] = useState(() => readStoredTasks(LAUNCH_CHECKLIST_STORAGE_KEY, defaultLaunchChecklistTasks));
  const [knowledgeBaseTasks, setKnowledgeBaseTasks] = useState(() => readStoredTasks(KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY, defaultKnowledgeBaseChecklistTasks));
  const [newLaunchTask, setNewLaunchTask] = useState(() => createLaunchTask({ status: "В работе" }));
  const [newKnowledgeBaseTask, setNewKnowledgeBaseTask] = useState(() => createLaunchTask({ status: "В работе" }));
  const [editingCell, setEditingCell] = useState(null);

  const isKnowledgeBaseBoard = activeBoard === "knowledgeBase";
  const visibleTasks = isKnowledgeBaseBoard ? knowledgeBaseTasks : launchTasks;
  const completedCount = visibleTasks.filter((task) => task.done || task.status === "Готово").length;
  const progress = visibleTasks.length ? (completedCount / visibleTasks.length) * 100 : 0;
  const newTask = isKnowledgeBaseBoard ? newKnowledgeBaseTask : newLaunchTask;
  const setNewTask = isKnowledgeBaseBoard ? setNewKnowledgeBaseTask : setNewLaunchTask;
  const boardTitle = isKnowledgeBaseBoard ? "Задачи базы знаний" : "Задачи запуска";
  const boardSubtitle = isKnowledgeBaseBoard
    ? "Материалы, которые нужно подготовить и вычитать для базы знаний."
    : "Что нужно закрыть перед стартом";
  const boardDescription = isKnowledgeBaseBoard
    ? "Здесь собраны презентация, FAQ, ролики, White Paper, MLM-материалы, вебинары и инструкции из фото."
    : "Здесь собраны задачи, ответственные, сроки и комментарии по тому, что нужно закрыть перед запуском проекта.";

  function updateTasks(storageKey, setTasks, updater) {
    setTasks((current) => {
      const next = updater(current);
      persistChecklistTasks(storageKey, next);
      return next;
    });
  }

  function updateTask(taskId, patch) {
    const storageKey = isKnowledgeBaseBoard ? KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY : LAUNCH_CHECKLIST_STORAGE_KEY;
    const setTasks = isKnowledgeBaseBoard ? setKnowledgeBaseTasks : setLaunchTasks;
    updateTasks(storageKey, setTasks, (current) => current.map((task) => (task.id === taskId ? patchChecklistTask(task, patch) : task)));
  }

  function addTask() {
    const title = newTask.title.trim();
    if (!title) return;

    const task = createLaunchTask({
      title,
      responsible: newTask.responsible.trim() || (isKnowledgeBaseBoard ? "Контент / продукт" : "Не назначен"),
      assignee: newTask.assignee.trim(),
      comment: newTask.comment.trim(),
      dueDate: newTask.dueDate,
      status: newTask.status || "В работе",
      done: newTask.status === "Готово",
    });

    if (isKnowledgeBaseBoard) {
      updateTasks(KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY, setKnowledgeBaseTasks, (current) => [task, ...current]);
      setNewKnowledgeBaseTask(createLaunchTask({ status: "В работе" }));
      return;
    }

    updateTasks(LAUNCH_CHECKLIST_STORAGE_KEY, setLaunchTasks, (current) => [task, ...current]);
    setNewLaunchTask(createLaunchTask({ status: "В работе" }));
  }

  function removeTask(taskId) {
    const storageKey = isKnowledgeBaseBoard ? KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY : LAUNCH_CHECKLIST_STORAGE_KEY;
    const setTasks = isKnowledgeBaseBoard ? setKnowledgeBaseTasks : setLaunchTasks;
    updateTasks(storageKey, setTasks, (current) => current.filter((task) => task.id !== taskId));
  }

  function resetTasks() {
    if (isKnowledgeBaseBoard) {
      updateTasks(KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY, setKnowledgeBaseTasks, () => defaultKnowledgeBaseChecklistTasks);
    } else {
      updateTasks(LAUNCH_CHECKLIST_STORAGE_KEY, setLaunchTasks, () => defaultLaunchChecklistTasks);
    }
    setEditingCell(null);
  }

  function renderEditableCell(task, field, options = {}) {
    const cellKey = `${activeBoard}:${task.id}:${field}`;
    const isEditing = editingCell === cellKey;
    const value = task[field] || "";
    const label = value || "Нажми, чтобы заполнить";
    const inputClassName = `form-control analytics-launch-table-input${options.inputClassName ? ` ${options.inputClassName}` : ""}`;

    if (isEditing) {
      const commonProps = {
        className: inputClassName,
        value,
        autoFocus: true,
        onChange: (event) => updateTask(task.id, { [field]: event.target.value }),
        onBlur: () => setEditingCell(null),
      };

      if (options.multiline) {
        return <textarea {...commonProps} rows={options.rows || 4} />;
      }

      return (
        <input
          {...commonProps}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.currentTarget.blur();
            }
          }}
        />
      );
    }

    return (
      <button
        type="button"
        className={`analytics-launch-read-cell${value ? "" : " analytics-launch-read-cell-empty"}${options.readClassName ? ` ${options.readClassName}` : ""}`}
        onClick={() => setEditingCell(cellKey)}
      >
        {label}
      </button>
    );
  }

  return (
    <>
      <section className="analytics-surface analytics-tab-summary mt-4">
        <span className="analytics-kicker">Запуск</span>
        <h2 className="analytics-tab-summary-title">Чеклист подготовки проекта к запуску</h2>
        <p className="analytics-tab-summary-copy">{boardDescription}</p>
        <div className="analytics-launch-browser-tabs" role="tablist" aria-label="Разделы чеклиста запуска">
          <button
            type="button"
            className={`analytics-launch-browser-tab${activeBoard === "launch" ? " analytics-launch-browser-tab-active" : ""}`}
            onClick={() => {
              setActiveBoard("launch");
              setEditingCell(null);
            }}
          >
            Задачи запуска
          </button>
          <button
            type="button"
            className={`analytics-launch-browser-tab${activeBoard === "knowledgeBase" ? " analytics-launch-browser-tab-active" : ""}`}
            onClick={() => {
              setActiveBoard("knowledgeBase");
              setEditingCell(null);
            }}
          >
            База знаний
          </button>
        </div>
        <div className="analytics-tab-summary-points">
          <div className="analytics-tab-summary-point">
            <span>Всего задач: {visibleTasks.length}</span>
          </div>
          <div className="analytics-tab-summary-point">
            <span>Готово: {completedCount}</span>
          </div>
          <div className="analytics-tab-summary-point">
            <span>Прогресс запуска: {formatPercent(progress)}</span>
          </div>
        </div>
      </section>

      <section className="analytics-surface analytics-launch-progress mt-4">
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <div className="analytics-launch-stat">
              <span>Всего задач</span>
              <strong>{visibleTasks.length}</strong>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="analytics-launch-stat">
              <span>Выполнено</span>
              <strong>{completedCount}</strong>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="analytics-launch-stat">
              <span>Осталось</span>
              <strong>{visibleTasks.length - completedCount}</strong>
            </div>
          </div>
        </div>
        <LaunchProgressBar value={progress} />
      </section>

      <section className="analytics-surface analytics-launch-form mt-4">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Добавить задачу</span>
            <h3 className="analytics-section-title">{isKnowledgeBaseBoard ? "Новая задача базы знаний" : "Новая задача запуска"}</h3>
            <p className="analytics-page-subtitle mb-0">
              Заполни минимум название. Остальные поля можно поправить прямо в таблице.
            </p>
          </div>
          <button type="button" className="btn analytics-launch-reset-btn" onClick={resetTasks}>
            Сбросить к шаблону
          </button>
        </div>
        <div className="analytics-launch-form-grid">
          <label>
            <span>Название</span>
            <input
              className="form-control analytics-launch-input"
              value={newTask.title}
              onChange={(event) => setNewTask((current) => ({ ...current, title: event.target.value }))}
              placeholder={isKnowledgeBaseBoard ? "Например: FAQ" : "Например: наполнить базу знаний"}
            />
          </label>
          <label>
            <span>Ответственный</span>
            <input
              className="form-control analytics-launch-input"
              value={newTask.responsible}
              onChange={(event) => setNewTask((current) => ({ ...current, responsible: event.target.value }))}
              placeholder={isKnowledgeBaseBoard ? "Контент / продукт" : "Backend / продукт / DevOps"}
            />
          </label>
          <label>
            <span>Исполнитель</span>
            <input
              className="form-control analytics-launch-input"
              value={newTask.assignee}
              onChange={(event) => setNewTask((current) => ({ ...current, assignee: event.target.value }))}
              placeholder="Имя или ник"
            />
          </label>
          <label>
            <span>Дата</span>
            <input
              className="form-control analytics-launch-input"
              value={newTask.dueDate}
              onChange={(event) => setNewTask((current) => ({ ...current, dueDate: event.target.value }))}
              placeholder="25.05.2026"
            />
          </label>
          <label>
            <span>Статус</span>
            <select
              className="form-select analytics-launch-input"
              value={newTask.status}
              onChange={(event) => setNewTask((current) => ({ ...current, status: event.target.value }))}
            >
              {LAUNCH_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="analytics-launch-form-comment">
            <span>Комментарий</span>
            <textarea
              className="form-control analytics-launch-input"
              rows="2"
              value={newTask.comment}
              onChange={(event) => setNewTask((current) => ({ ...current, comment: event.target.value }))}
              placeholder="Что должно быть внутри задачи, какие вкладки, данные или проверки"
            />
          </label>
          <button type="button" className="btn analytics-launch-add-btn" onClick={addTask} disabled={!newTask.title.trim()}>
            Добавить задачу
          </button>
        </div>
      </section>

      <section className="analytics-surface analytics-launch-checklist mt-4">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Задачи запуска</span>
            <h3 className="analytics-section-title">{boardTitle}</h3>
            <p className="analytics-page-subtitle mb-0">
              {boardSubtitle}. Меняй название, ответственного, исполнителя, комментарий, дату и статус прямо здесь. Готовые задачи зачёркиваются.
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table analytics-table analytics-launch-table mb-0">
            <thead>
              <tr>
                <th>Готово</th>
                <th>Название</th>
                <th>Ответственный</th>
                <th>Исполнитель</th>
                <th>Комментарий</th>
                <th>Дата</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => {
                const completed = task.done || task.status === "Готово";
                const statusTone = getLaunchStatusTone(task.status);

                return (
                  <tr key={task.id} className={completed ? "analytics-launch-task-done" : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        checked={completed}
                        onChange={(event) => updateTask(task.id, { done: event.target.checked })}
                        aria-label={`Отметить задачу ${task.title}`}
                        className="analytics-launch-checkbox"
                      />
                    </td>
                    <td>
                      {renderEditableCell(task, "title", {
                        inputClassName: "analytics-launch-title-input",
                        readClassName: "analytics-launch-title-read",
                      })}
                    </td>
                    <td>{renderEditableCell(task, "responsible")}</td>
                    <td>{renderEditableCell(task, "assignee", { readClassName: "analytics-launch-assignee-read" })}</td>
                    <td className="analytics-launch-comment">{renderEditableCell(task, "comment", { multiline: true, rows: 5 })}</td>
                    <td>{renderEditableCell(task, "dueDate", { inputClassName: "analytics-launch-date-input" })}</td>
                    <td>
                      <select
                        className={`form-select analytics-launch-status-select analytics-launch-status-${statusTone}`}
                        value={task.status}
                        onChange={(event) => updateTask(task.id, { status: event.target.value, done: event.target.value === "Готово" })}
                      >
                        {LAUNCH_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="analytics-launch-actions">
                        <button
                          type="button"
                          className="btn analytics-launch-icon-btn analytics-launch-done-btn"
                          onClick={() => updateTask(task.id, { status: "Готово", done: true })}
                          title="Готово"
                          aria-label={`Отметить задачу ${task.title} готовой`}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          className="btn analytics-launch-icon-btn analytics-launch-pause-btn"
                          onClick={() => updateTask(task.id, { status: "Отложено", done: false })}
                          title="Отложить"
                          aria-label={`Отложить задачу ${task.title}`}
                        >
                          ⏸
                        </button>
                        <button
                          type="button"
                          className="btn analytics-launch-icon-btn analytics-launch-delete-btn"
                          onClick={() => removeTask(task.id)}
                          title="Удалить"
                          aria-label={`Удалить задачу ${task.title}`}
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default LaunchChecklistSection;
