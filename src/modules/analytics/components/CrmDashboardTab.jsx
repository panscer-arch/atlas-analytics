import CrmCommandDashboard from "./CrmCommandDashboard";
import Wrapper from "./Wrapper";

export default function CrmDashboardTab({
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
  return (
    <Wrapper as="section" marginTop="lg">
      <CrmCommandDashboard
        isAiReviewOpen={isAiReviewOpen}
        aiTaskSummary={aiTaskSummary}
        analyticsTitle={analyticsTitle}
        analyticsFlowTone={analyticsFlowTone}
        analyticsCoverageLabel={analyticsCoverageLabel}
        analyticsCoverageValue={analyticsCoverageValue}
        analyticsSignals={analyticsSignals}
        analyticsPulseRows={analyticsPulseRows}
        taskTotals={taskTotals}
        taskWidgets={taskWidgets}
        crmTaskStats={crmTaskStats}
        taskDoneValue={taskDoneValue}
        crmContentStats={crmContentStats}
        crmMyTasks={crmMyTasks}
        crmMyTasksSaveState={crmMyTasksSaveState}
        expandedMyTaskId={expandedMyTaskId}
        setExpandedMyTaskId={setExpandedMyTaskId}
        updateMyTask={updateMyTask}
        deleteMyTask={deleteMyTask}
        newMyTask={newMyTask}
        setNewMyTask={setNewMyTask}
        handleAddMyTask={handleAddMyTask}
      />
    </Wrapper>
  );
}
