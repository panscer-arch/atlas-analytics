import { useEffect, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import StaticLaunchBoard, {
  CONTENT_BOARD_TABS,
  STATIC_CONTENT_BOARD_IDS,
  TASK_BOARD_TABS,
  TASK_CATEGORY_BOARDS,
} from "./LaunchBoardRegistry";
import LaunchProgressBar from "./LaunchProgressBar";
import LaunchEditableCell from "./LaunchEditableCell";
import LaunchBoardTabs from "./LaunchBoardTabs";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import Wrapper from "./Wrapper";
import { loadServerContent, saveServerContent } from "../services/contentStore";
import {
  createLaunchTask,
  formatHistoryDate,
  formatPercent,
  getLaunchBoardCopy,
  getLaunchPriorityTone,
  getLaunchStatusTone,
  getTaskTiming,
  normalizeArray,
  normalizeChecklistTasks,
  patchChecklistTask,
  persistChecklistTasks,
  readStoredCustomChecklists,
  readStoredTasks,
  shouldLogTaskPatch,
} from "../utils/launchChecklistUtils";

import {
  CUSTOM_CHECKLISTS_STORAGE_KEY,
  DAILY_TASKS_STORAGE_KEY,
  DEFAULT_BOARD_ID,
  IDEAS_CHECKLIST_STORAGE_KEY,
  KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY,
  LAUNCH_CHECKLIST_STORAGE_KEY,
  LAUNCH_PRIORITIES,
  LAUNCH_STATUSES,
  MARKETING_CHECKLIST_STORAGE_KEY,
  TASK_ARCHIVE_STORAGE_KEY,
  TASK_ASSIGNEES,
  TASK_HISTORY_STORAGE_KEY,
  defaultIdeasChecklistTasks,
  defaultKnowledgeBaseChecklistTasks,
  defaultLaunchChecklistTasks,
  defaultMarketingChecklistTasks,
} from "../data/launchChecklistData";

function LaunchChecklistSection({ mode = "tasks", analyticsBoardUrl }) {
  const [activeBoard, setActiveBoard] = useState(() => {
    const fallbackBoard = mode === "content" ? "materials" : DEFAULT_BOARD_ID;
    if (typeof window === "undefined") return fallbackBoard;

    const url = new URL(window.location.href);
    if (url.searchParams.get("b") === "d") return "dailyTasks";
    const board = url.searchParams.get("board");
    if (board === "transportRiskFaq") return "securityReview";
    return board || fallbackBoard;
  });
  const [launchTasks, setLaunchTasks] = useState(() => readStoredTasks(LAUNCH_CHECKLIST_STORAGE_KEY, defaultLaunchChecklistTasks));
  const [knowledgeBaseTasks, setKnowledgeBaseTasks] = useState(() => readStoredTasks(KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY, defaultKnowledgeBaseChecklistTasks));
  const [ideaTasks, setIdeaTasks] = useState(() => readStoredTasks(IDEAS_CHECKLIST_STORAGE_KEY, defaultIdeasChecklistTasks));
  const [marketingTasks, setMarketingTasks] = useState(() => readStoredTasks(MARKETING_CHECKLIST_STORAGE_KEY, defaultMarketingChecklistTasks));
  const [taskCategoryTasks, setTaskCategoryTasks] = useState(() => Object.fromEntries(
    TASK_CATEGORY_BOARDS.map((board) => [board.id, readStoredTasks(board.storageKey, [])]),
  ));
  const [dailyTasksCount, setDailyTasksCount] = useState(0);
  const [customChecklists, setCustomChecklists] = useState(() => readStoredCustomChecklists(CUSTOM_CHECKLISTS_STORAGE_KEY));
  const [newTask, setNewTask] = useState(() => createLaunchTask({ status: "В работе" }));
  const [newChecklistName, setNewChecklistName] = useState("");
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [taskArchive, setTaskArchive] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);

  useEffect(() => {
    let isMounted = true;

    loadServerContent(LAUNCH_CHECKLIST_STORAGE_KEY).then((tasks) => {
      if (isMounted && tasks) setLaunchTasks(normalizeChecklistTasks(tasks));
    });
    loadServerContent(KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY).then((tasks) => {
      if (isMounted && tasks) setKnowledgeBaseTasks(normalizeChecklistTasks(tasks));
    });
    loadServerContent(IDEAS_CHECKLIST_STORAGE_KEY).then((tasks) => {
      if (isMounted && tasks) setIdeaTasks(normalizeChecklistTasks(tasks));
    });
    loadServerContent(MARKETING_CHECKLIST_STORAGE_KEY).then((tasks) => {
      if (isMounted && tasks) setMarketingTasks(normalizeChecklistTasks(tasks));
    });
    loadServerContent(DAILY_TASKS_STORAGE_KEY).then((tasks) => {
      if (isMounted && Array.isArray(tasks)) setDailyTasksCount(tasks.length);
    });
    TASK_CATEGORY_BOARDS.forEach((board) => {
      loadServerContent(board.storageKey).then((tasks) => {
        if (!isMounted || !tasks) return;
        setTaskCategoryTasks((current) => ({
          ...current,
          [board.id]: normalizeChecklistTasks(tasks),
        }));
      });
    });
    loadServerContent(CUSTOM_CHECKLISTS_STORAGE_KEY).then((checklists) => {
      if (!isMounted || !Array.isArray(checklists)) return;
      setCustomChecklists(checklists.map((checklist) => ({ ...checklist, tasks: normalizeChecklistTasks(checklist.tasks || []) })));
    });
    loadServerContent(TASK_ARCHIVE_STORAGE_KEY).then((items) => {
      if (isMounted) setTaskArchive(normalizeArray(items));
    });
    loadServerContent(TASK_HISTORY_STORAGE_KEY).then((items) => {
      if (isMounted) setTaskHistory(normalizeArray(items));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const isKnowledgeBaseBoard = activeBoard === "knowledgeBase";
  const isIdeasBoard = activeBoard === "ideas";
  const isMarketingBoard = activeBoard === "marketing";
  const activeTaskCategoryBoard = TASK_CATEGORY_BOARDS.find((board) => board.id === activeBoard);
  const isTaskCategoryBoard = Boolean(activeTaskCategoryBoard);
  const isStaticContentBoard = STATIC_CONTENT_BOARD_IDS.includes(activeBoard);
  const activeCustomChecklist = customChecklists.find((checklist) => checklist.id === activeBoard);
  const isCustomBoard = Boolean(activeCustomChecklist);
  const visibleTasks = isStaticContentBoard ? [] : isTaskCategoryBoard ? taskCategoryTasks[activeBoard] || [] : isCustomBoard ? activeCustomChecklist.tasks : isMarketingBoard ? marketingTasks : isIdeasBoard ? ideaTasks : isKnowledgeBaseBoard ? knowledgeBaseTasks : launchTasks;
  const filteredVisibleTasks = assigneeFilter ? visibleTasks.filter((task) => (task.assignee || "Не назначен") === assigneeFilter) : visibleTasks;
  const completedCount = visibleTasks.filter((task) => task.done || task.status === "Готово").length;
  const progress = visibleTasks.length ? (completedCount / visibleTasks.length) * 100 : 0;
  const boardArchive = taskArchive.filter((item) => item.boardId === activeBoard).slice(0, 8);
  const boardHistory = taskHistory.filter((item) => item.boardId === activeBoard).slice(0, 6);
  const activeAssignees = Array.from(new Set([...TASK_ASSIGNEES.filter(Boolean), ...visibleTasks.map((task) => task.assignee).filter(Boolean)])).sort((first, second) => first.localeCompare(second, "ru"));
  const activeTimingStats = visibleTasks.reduce(
    (result, task) => {
      const timing = getTaskTiming(task);
      if (timing === "overdue") result.overdue += 1;
      if (timing === "today") result.today += 1;
      if (timing === "week") result.week += 1;
      if (task.focus && !(task.done || task.status === "Готово")) result.focus += 1;
      return result;
    },
    { overdue: 0, today: 0, week: 0, focus: 0 },
  );
  const { title: boardTitle, subtitle: boardSubtitle } = getLaunchBoardCopy({
    activeBoard,
    activeTaskCategoryBoard,
    activeCustomChecklist,
  });
  const visibleBoardTabs = mode === "content" ? CONTENT_BOARD_TABS : TASK_BOARD_TABS;

  function getBoardTaskCount(boardId) {
    if (boardId === "launch") return launchTasks.length;
    if (boardId === "marketing") return marketingTasks.length;
    if (boardId === "knowledgeBase") return knowledgeBaseTasks.length;
    if (boardId === "ideas") return ideaTasks.length;
    if (boardId === "dailyTasks") return dailyTasksCount;
    if (taskCategoryTasks[boardId]) return taskCategoryTasks[boardId].length;
    const customChecklist = customChecklists.find((checklist) => checklist.id === boardId);
    return customChecklist ? normalizeArray(customChecklist.tasks).length : null;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const visibleBoardIds = [...visibleBoardTabs.map((tab) => tab.id), ...STATIC_CONTENT_BOARD_IDS];
    const fallbackBoard = mode === "content" ? "materials" : DEFAULT_BOARD_ID;
    const isKnownBoard = visibleBoardIds.includes(activeBoard) || (mode === "tasks" && customChecklists.some((checklist) => checklist.id === activeBoard));
    const nextBoard = isKnownBoard ? activeBoard : fallbackBoard;

    if (nextBoard !== activeBoard) {
      setActiveBoard(nextBoard);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("board", nextBoard);
    window.history.replaceState({}, "", url.toString());
  }, [activeBoard, customChecklists, mode]);

  useEffect(() => {
    function handleHistoryChange() {
      const board = new URL(window.location.href).searchParams.get("board");
      const visibleBoardIds = [...visibleBoardTabs.map((tab) => tab.id), ...STATIC_CONTENT_BOARD_IDS];
      if (visibleBoardIds.includes(board) || (mode === "tasks" && customChecklists.some((checklist) => checklist.id === board))) {
        setActiveBoard(board);
      }
    }

    window.addEventListener("popstate", handleHistoryChange);
    return () => window.removeEventListener("popstate", handleHistoryChange);
  }, [customChecklists, mode, visibleBoardTabs]);

  function persistArchive(nextArchive) {
    try {
      window.localStorage.setItem(TASK_ARCHIVE_STORAGE_KEY, JSON.stringify(nextArchive));
      saveServerContent(TASK_ARCHIVE_STORAGE_KEY, nextArchive);
    } catch {
      // Архив остаётся в состоянии страницы, если storage временно недоступен.
    }
  }

  function persistHistory(nextHistory) {
    try {
      window.localStorage.setItem(TASK_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      saveServerContent(TASK_HISTORY_STORAGE_KEY, nextHistory);
    } catch {
      // История не должна блокировать работу с задачами.
    }
  }

  function pushTaskHistory(action, task, details = "") {
    const entry = {
      id: `history-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      boardId: activeBoard,
      boardTitle,
      taskId: task.id,
      taskTitle: task.title || "Без названия",
      action,
      details,
      createdAt: new Date().toISOString(),
    };

    setTaskHistory((current) => {
      const next = [entry, ...current].slice(0, 240);
      persistHistory(next);
      return next;
    });
  }

  function getBoardUpdater() {
    if (isTaskCategoryBoard) {
      return {
        storageKey: activeTaskCategoryBoard.storageKey,
        setTasks: (updater) => {
          setTaskCategoryTasks((current) => {
            const currentTasks = current[activeBoard] || [];
            const nextTasks = typeof updater === "function" ? updater(currentTasks) : updater;
            return {
              ...current,
              [activeBoard]: nextTasks,
            };
          });
        },
      };
    }
    if (isMarketingBoard) return { storageKey: MARKETING_CHECKLIST_STORAGE_KEY, setTasks: setMarketingTasks };
    if (isIdeasBoard) return { storageKey: IDEAS_CHECKLIST_STORAGE_KEY, setTasks: setIdeaTasks };
    if (isKnowledgeBaseBoard) return { storageKey: KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY, setTasks: setKnowledgeBaseTasks };
    return { storageKey: LAUNCH_CHECKLIST_STORAGE_KEY, setTasks: setLaunchTasks };
  }

  function updateTasks(storageKey, setTasks, updater) {
    setTasks((current) => {
      const next = updater(current);
      persistChecklistTasks(storageKey, next);
      return next;
    });
  }

  function updateTask(taskId, patch) {
    const taskBefore = visibleTasks.find((task) => task.id === taskId);

    if (isCustomBoard) {
      setCustomChecklists((current) => {
        const next = current.map((checklist) => {
          if (checklist.id !== activeBoard) return checklist;
          return {
            ...checklist,
            tasks: checklist.tasks.map((task) => (task.id === taskId ? patchChecklistTask(task, patch) : task)),
          };
        });
        persistChecklistTasks(CUSTOM_CHECKLISTS_STORAGE_KEY, next);
        return next;
      });
      if (taskBefore && shouldLogTaskPatch(patch)) pushTaskHistory("Обновление", taskBefore, Object.keys(patch).join(", "));
      return;
    }

    const { storageKey, setTasks } = getBoardUpdater();
    updateTasks(storageKey, setTasks, (current) => current.map((task) => (task.id === taskId ? patchChecklistTask(task, patch) : task)));
    if (taskBefore && shouldLogTaskPatch(patch)) pushTaskHistory("Обновление", taskBefore, Object.keys(patch).join(", "));
  }

  function addTask() {
    const title = newTask.title.trim();
    if (!title) return;

    const task = createLaunchTask({
      title,
      responsible: newTask.responsible.trim() || (isTaskCategoryBoard ? activeTaskCategoryBoard.defaultResponsible : isMarketingBoard ? "Маркетинг / рост" : isIdeasBoard ? "Идеи / приоритизация" : isKnowledgeBaseBoard ? "Контент / продукт" : "Не назначено"),
      assignee: newTask.assignee.trim(),
      comment: newTask.comment.trim(),
      dueDate: newTask.dueDate,
      status: newTask.status || "В работе",
      priority: newTask.priority || "Средний",
      done: newTask.status === "Готово",
    });

    if (isCustomBoard) {
      setCustomChecklists((current) => {
        const next = current.map((checklist) => (checklist.id === activeBoard ? { ...checklist, tasks: [task, ...checklist.tasks] } : checklist));
        persistChecklistTasks(CUSTOM_CHECKLISTS_STORAGE_KEY, next);
        return next;
      });
      pushTaskHistory("Создание", task, "Добавлена новая задача");
      setNewTask(createLaunchTask({ status: "В работе" }));
      return;
    }

    if (isIdeasBoard) {
      updateTasks(IDEAS_CHECKLIST_STORAGE_KEY, setIdeaTasks, (current) => [task, ...current]);
      pushTaskHistory("Создание", task, "Добавлена новая идея");
      setNewTask(createLaunchTask({ status: "В работе" }));
      return;
    }

    if (isMarketingBoard) {
      updateTasks(MARKETING_CHECKLIST_STORAGE_KEY, setMarketingTasks, (current) => [task, ...current]);
      pushTaskHistory("Создание", task, "Добавлена маркетинговая задача");
      setNewTask(createLaunchTask({ status: "В работе" }));
      return;
    }

    if (isTaskCategoryBoard) {
      const { storageKey, setTasks } = getBoardUpdater();
      updateTasks(storageKey, setTasks, (current) => [task, ...current]);
      pushTaskHistory("Создание", task, `Добавлена задача в раздел «${activeTaskCategoryBoard.label}»`);
      setNewTask(createLaunchTask({ status: "В работе" }));
      return;
    }

    if (isKnowledgeBaseBoard) {
      updateTasks(KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY, setKnowledgeBaseTasks, (current) => [task, ...current]);
      pushTaskHistory("Создание", task, "Добавлена задача базы знаний");
      setNewTask(createLaunchTask({ status: "В работе" }));
      return;
    }

    updateTasks(LAUNCH_CHECKLIST_STORAGE_KEY, setLaunchTasks, (current) => [task, ...current]);
    pushTaskHistory("Создание", task, "Добавлена задача запуска");
    setNewTask(createLaunchTask({ status: "В работе" }));
  }

  function removeTask(taskId) {
    const taskToArchive = visibleTasks.find((task) => task.id === taskId);
    if (!taskToArchive) return;

    const archiveItem = {
      ...taskToArchive,
      archiveId: `archive-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      boardId: activeBoard,
      boardTitle,
      archivedAt: new Date().toISOString(),
    };

    setTaskArchive((current) => {
      const next = [archiveItem, ...current].slice(0, 240);
      persistArchive(next);
      return next;
    });

    if (isCustomBoard) {
      setCustomChecklists((current) => {
        const next = current.map((checklist) => (checklist.id === activeBoard ? { ...checklist, tasks: checklist.tasks.filter((task) => task.id !== taskId) } : checklist));
        persistChecklistTasks(CUSTOM_CHECKLISTS_STORAGE_KEY, next);
        return next;
      });
      pushTaskHistory("Архив", taskToArchive, "Задача перенесена в архив");
      return;
    }

    const { storageKey, setTasks } = getBoardUpdater();
    updateTasks(storageKey, setTasks, (current) => current.filter((task) => task.id !== taskId));
    pushTaskHistory("Архив", taskToArchive, "Задача перенесена в архив");
  }

  function restoreArchivedTask(archiveId) {
    const archivedTask = taskArchive.find((task) => task.archiveId === archiveId);
    if (!archivedTask) return;

    const restoredTask = {
      ...archivedTask,
      id: archivedTask.id || `restored-${Date.now()}`,
      status: archivedTask.status || "В работе",
    };
    delete restoredTask.archiveId;
    delete restoredTask.boardId;
    delete restoredTask.boardTitle;
    delete restoredTask.archivedAt;

    setTaskArchive((current) => {
      const next = current.filter((task) => task.archiveId !== archiveId);
      persistArchive(next);
      return next;
    });

    if (isCustomBoard) {
      setCustomChecklists((current) => {
        const next = current.map((checklist) => (checklist.id === activeBoard ? { ...checklist, tasks: [restoredTask, ...checklist.tasks] } : checklist));
        persistChecklistTasks(CUSTOM_CHECKLISTS_STORAGE_KEY, next);
        return next;
      });
    } else {
      const { storageKey, setTasks } = getBoardUpdater();
      updateTasks(storageKey, setTasks, (current) => [restoredTask, ...current]);
    }

    pushTaskHistory("Восстановление", restoredTask, "Задача возвращена из архива");
  }

  function addChecklist() {
    const title = newChecklistName.trim();
    if (!title) return;

    const checklist = {
      id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      tasks: [],
    };

    setCustomChecklists((current) => {
      const next = [...current, checklist];
      persistChecklistTasks(CUSTOM_CHECKLISTS_STORAGE_KEY, next);
      return next;
    });
    setActiveBoard(checklist.id);
    setNewChecklistName("");
    setIsCreatingChecklist(false);
    setEditingCell(null);
  }

  function selectBoard(boardId) {
    setActiveBoard(boardId);
    setEditingCell(null);
    setAssigneeFilter("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("b");
      url.searchParams.delete("view");
      url.searchParams.set("board", boardId);
      window.history.pushState({}, "", url);
    }
  }

  return (
    <>
      <LaunchBoardTabs
        activeBoard={activeBoard}
        customChecklists={customChecklists}
        getBoardTaskCount={getBoardTaskCount}
        isCreatingChecklist={isCreatingChecklist}
        mode={mode}
        newChecklistName={newChecklistName}
        onAddChecklist={addChecklist}
        onChecklistNameChange={setNewChecklistName}
        onSelectBoard={selectBoard}
        onStartChecklistCreate={() => setIsCreatingChecklist(true)}
        visibleBoardTabs={visibleBoardTabs}
      />

      <StaticLaunchBoard boardId={activeBoard} analyticsBoardUrl={analyticsBoardUrl} />

      {!isStaticContentBoard ? (
        <>
      <Wrapper as="section" marginTop="lg">
        <div className="analytics-surface analytics-launch-progress">
        <LayoutGrid columns="three" gap="md">
          <LayoutCell>
            <div className="analytics-launch-stat">
              <span>Всего задач</span>
              <strong>{visibleTasks.length}</strong>
            </div>
          </LayoutCell>
          <LayoutCell>
            <div className="analytics-launch-stat">
              <span>Выполнено</span>
              <strong>{completedCount}</strong>
            </div>
          </LayoutCell>
          <LayoutCell>
            <div className="analytics-launch-stat">
              <span>Осталось</span>
              <strong>{visibleTasks.length - completedCount}</strong>
            </div>
          </LayoutCell>
        </LayoutGrid>
        <Wrapper marginTop="md">
          <LaunchProgressBar value={progress} />
        </Wrapper>
        </div>
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <div className="analytics-surface analytics-task-control-panel">
        <div className="analytics-task-control-grid">
          <div className="analytics-task-signal is-danger">
            <span>Просрочено</span>
            <strong>{activeTimingStats.overdue}</strong>
          </div>
          <div className="analytics-task-signal is-accent">
            <span>Сегодня</span>
            <strong>{activeTimingStats.today}</strong>
          </div>
          <div className="analytics-task-signal is-success">
            <span>7 дней</span>
            <strong>{activeTimingStats.week}</strong>
          </div>
          <div className="analytics-task-signal is-focus">
            <span>Фокус</span>
            <strong>{activeTimingStats.focus}</strong>
          </div>
          <label className="analytics-task-assignee-filter">
            <span>Исполнитель</span>
            <select
              className="analytics-launch-input"
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
            >
              <option value="">Все</option>
              <option value="Не назначен">Не назначен</option>
              {activeAssignees.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          </label>
        </div>
        </div>
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <div className="analytics-surface analytics-launch-form">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Добавить задачу</span>
            <h3 className="analytics-section-title">{isTaskCategoryBoard ? `Новая задача: ${activeTaskCategoryBoard.label}` : isMarketingBoard ? "Новая маркетинговая задача" : isIdeasBoard ? "Новая идея" : isKnowledgeBaseBoard ? "Новая задача базы знаний" : "Новая задача"}</h3>
            <p className="analytics-page-subtitle">
              Заполни минимум название. Остальные поля можно поправить прямо в таблице.
            </p>
          </div>
        </div>
        <div className="analytics-launch-form-grid">
          <label>
            <span>Название</span>
            <input
              className="analytics-launch-input"
              value={newTask.title}
              onChange={(event) => setNewTask((current) => ({ ...current, title: event.target.value }))}
              placeholder={isTaskCategoryBoard ? "Например: подготовить задачу и потом распределить" : isMarketingBoard ? "Например: парсер Telegram" : isIdeasBoard ? "Например: AMA-сессия" : isKnowledgeBaseBoard ? "Например: FAQ" : "Например: наполнить базу знаний"}
            />
          </label>
          <label>
            <span>Направление</span>
            <input
              className="analytics-launch-input"
              value={newTask.responsible}
              onChange={(event) => setNewTask((current) => ({ ...current, responsible: event.target.value }))}
              placeholder={isTaskCategoryBoard ? activeTaskCategoryBoard.defaultResponsible : isMarketingBoard ? "Маркетинг / парсеры" : isIdeasBoard ? "Маркетинг / продукт" : isKnowledgeBaseBoard ? "Контент / продукт" : "Backend / продукт / DevOps"}
            />
          </label>
          <label>
            <span>Исполнитель</span>
            <select
              className="analytics-launch-input"
              value={newTask.assignee}
              onChange={(event) => setNewTask((current) => ({ ...current, assignee: event.target.value }))}
            >
              {TASK_ASSIGNEES.map((assignee) => (
                <option key={assignee || "empty"} value={assignee}>
                  {assignee || "Не назначен"}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Дата</span>
            <input
              className="analytics-launch-input"
              value={newTask.dueDate}
              onChange={(event) => setNewTask((current) => ({ ...current, dueDate: event.target.value }))}
              placeholder="25.05.2026"
            />
          </label>
          <label>
            <span>Приоритет</span>
            <select
              className="analytics-launch-input"
              value={newTask.priority}
              onChange={(event) => setNewTask((current) => ({ ...current, priority: event.target.value }))}
            >
              {LAUNCH_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Статус</span>
            <select
              className="analytics-launch-input"
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
              className="analytics-launch-input"
              rows="2"
              value={newTask.comment}
              onChange={(event) => setNewTask((current) => ({ ...current, comment: event.target.value }))}
              placeholder="Что должно быть внутри задачи, какие вкладки, данные или проверки"
            />
          </label>
          <AnalyticsActionButton variant="primary" onClick={addTask} disabled={!newTask.title.trim()}>
            Добавить задачу
          </AnalyticsActionButton>
        </div>
        </div>
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <div className="analytics-surface analytics-launch-checklist">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Задачи</span>
            <h3 className="analytics-section-title">{boardTitle}</h3>
            <p className="analytics-page-subtitle">
              {boardSubtitle}. Меняй название, направление, исполнителя, комментарий, дату, приоритет и статус прямо здесь. Готовые задачи зачёркиваются.
            </p>
          </div>
        </div>

        <div className="analytics-table-responsive">
          <table className="analytics-table analytics-launch-table">
            <thead>
              <tr>
                <th>Готово</th>
                <th>Название</th>
                <th>Направление</th>
                <th>Исполнитель</th>
                <th>Комментарий</th>
                <th>Дата</th>
                <th>Приоритет</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisibleTasks.map((task) => {
                const completed = task.done || task.status === "Готово";
                const statusTone = getLaunchStatusTone(task.status);
                const priority = task.priority || "Средний";
                const priorityTone = getLaunchPriorityTone(priority);
                const timing = getTaskTiming(task);

                return (
                  <tr key={task.id} className={`${completed ? "analytics-launch-task-done" : ""} analytics-launch-task-${timing}${task.focus ? " analytics-launch-task-focus" : ""}`.trim()}>
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
                      <LaunchEditableCell activeBoard={activeBoard} task={task} field="title" editingCell={editingCell} setEditingCell={setEditingCell} updateTask={updateTask} variant="title" />
                    </td>
                    <td><LaunchEditableCell activeBoard={activeBoard} task={task} field="responsible" editingCell={editingCell} setEditingCell={setEditingCell} updateTask={updateTask} /></td>
                    <td><LaunchEditableCell activeBoard={activeBoard} task={task} field="assignee" editingCell={editingCell} setEditingCell={setEditingCell} updateTask={updateTask} variant="assignee" selectOptions={TASK_ASSIGNEES} /></td>
                    <td className="analytics-launch-comment"><LaunchEditableCell activeBoard={activeBoard} task={task} field="comment" editingCell={editingCell} setEditingCell={setEditingCell} updateTask={updateTask} multiline rows={5} /></td>
                    <td><LaunchEditableCell activeBoard={activeBoard} task={task} field="dueDate" editingCell={editingCell} setEditingCell={setEditingCell} updateTask={updateTask} variant="date" /></td>
                    <td>
                      <select
                        className={`analytics-launch-priority-select analytics-launch-priority-${priorityTone}`}
                        value={priority}
                        onChange={(event) => updateTask(task.id, { priority: event.target.value })}
                      >
                        {LAUNCH_PRIORITIES.map((priorityOption) => (
                          <option key={priorityOption} value={priorityOption}>
                            {priorityOption}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className={`analytics-launch-status-select analytics-launch-status-${statusTone}`}
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
                        <AnalyticsActionButton
                          variant={task.focus ? "primary" : "secondary"}
                          size="icon"
                          onClick={() => updateTask(task.id, { focus: !task.focus })}
                          title={task.focus ? "Убрать из фокуса" : "В фокус недели"}
                          aria-label={`${task.focus ? "Убрать из фокуса" : "Добавить в фокус"} задачу ${task.title}`}
                        >
                          ★
                        </AnalyticsActionButton>
                        <AnalyticsActionButton
                          variant="success"
                          size="icon"
                          onClick={() => updateTask(task.id, { status: "Готово", done: true })}
                          title="Готово"
                          aria-label={`Отметить задачу ${task.title} готовой`}
                        >
                          ✓
                        </AnalyticsActionButton>
                        <AnalyticsActionButton
                          variant="warning"
                          size="icon"
                          onClick={() => updateTask(task.id, { status: "Отложено", done: false })}
                          title="Отложить"
                          aria-label={`Отложить задачу ${task.title}`}
                        >
                          ⏸
                        </AnalyticsActionButton>
                        <AnalyticsActionButton
                          variant="danger"
                          size="icon"
                          onClick={() => removeTask(task.id)}
                          title="В архив"
                          aria-label={`Перенести задачу ${task.title} в архив`}
                        >
                          ×
                        </AnalyticsActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredVisibleTasks.length ? (
                <tr>
                  <td colSpan="9">
                    <div className="analytics-task-empty-row">По текущему фильтру задач нет.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </div>
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <div className="analytics-task-lower-grid">
        <article className="analytics-surface analytics-task-history-card">
          <div className="analytics-data-table-head">
            <div>
              <span className="analytics-kicker">История изменений</span>
              <h3 className="analytics-section-title">Последние действия</h3>
            </div>
          </div>
          <div className="analytics-task-history-list">
            {boardHistory.map((item) => (
              <div key={item.id} className="analytics-task-history-row">
                <span>{formatHistoryDate(item.createdAt)}</span>
                <strong>{item.action}</strong>
                <p>{item.taskTitle}</p>
                {item.details ? <small>{item.details}</small> : null}
              </div>
            ))}
            {!boardHistory.length ? <div className="analytics-crm-my-tasks-empty">История появится после изменений статусов, исполнителей и архива.</div> : null}
          </div>
        </article>

        <article className="analytics-surface analytics-task-history-card">
          <div className="analytics-data-table-head">
            <div>
              <span className="analytics-kicker">Архив</span>
              <h3 className="analytics-section-title">Можно восстановить</h3>
            </div>
          </div>
          <div className="analytics-task-history-list">
            {boardArchive.map((item) => (
              <div key={item.archiveId} className="analytics-task-history-row analytics-task-archive-row">
                <span>{formatHistoryDate(item.archivedAt)}</span>
                <strong>{item.title}</strong>
                <p>{item.assignee || "Не назначен"} · {item.status || "В работе"}</p>
                <button type="button" onClick={() => restoreArchivedTask(item.archiveId)}>
                  Вернуть
                </button>
              </div>
            ))}
            {!boardArchive.length ? <div className="analytics-crm-my-tasks-empty">Архив пуст. Удалённые задачи будут попадать сюда.</div> : null}
          </div>
        </article>
        </div>
      </Wrapper>
        </>
      ) : null}
    </>
  );
}

export default LaunchChecklistSection;
