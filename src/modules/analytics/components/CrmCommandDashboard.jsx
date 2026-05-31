import CrmMyTasksCard from "./CrmMyTasksCard";
import ProgressMeter from "./ProgressMeter";

const FLOW_TONES = new Set(["positive", "negative"]);

function getFlowTone(value) {
  return FLOW_TONES.has(value) ? value : "positive";
}

function CrmCommandDashboard({
  isAiReviewOpen,
  aiTaskSummary,
  analyticsTitle,
  analyticsFlowTone,
  analyticsCoverageLabel,
  analyticsCoverageValue,
  analyticsSignals,
  analyticsPulseRows,
  taskTotals,
  taskWidgets,
  crmTaskStats,
  taskDoneValue,
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
  const totalDone = crmTaskStats.reduce((sum, item) => sum + item.done, 0);
  const totalTasks = crmTaskStats.reduce((sum, item) => sum + item.total, 0);
  const analyticsFlowToneToken = getFlowTone(analyticsFlowTone);

  return (
    <section className="analytics-surface analytics-crm-command">
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
              <strong className={`analytics-crm-flow-value analytics-crm-flow-value-${analyticsFlowToneToken}`}>{analyticsTitle}</strong>
            </div>
          </div>
          <div className="analytics-crm-analytics-gauge">
            <div>
              <span>Покрытие выплат</span>
              <b>{analyticsCoverageLabel}</b>
            </div>
            <ProgressMeter value={analyticsCoverageValue} variant="gauge" label="Покрытие выплат" />
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
            <ProgressMeter value={taskDoneValue} variant="summary" label="Прогресс закрытия задач" />
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

        <CrmMyTasksCard
          tasks={crmMyTasks}
          saveState={crmMyTasksSaveState}
          expandedTaskId={expandedMyTaskId}
          setExpandedTaskId={setExpandedMyTaskId}
          updateTask={updateMyTask}
          deleteTask={deleteMyTask}
          newTask={newMyTask}
          setNewTask={setNewMyTask}
          addTask={handleAddMyTask}
        />
      </div>
    </section>
  );
}

export default CrmCommandDashboard;
