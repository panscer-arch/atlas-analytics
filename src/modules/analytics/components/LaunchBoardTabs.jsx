import Wrapper from "./Wrapper";

function LaunchBoardTabs({
  activeBoard,
  customChecklists,
  getBoardTaskCount,
  isCreatingChecklist,
  mode,
  newChecklistName,
  onAddChecklist,
  onChecklistNameChange,
  onSelectBoard,
  onStartChecklistCreate,
  visibleBoardTabs,
}) {
  return (
    <Wrapper as="section" marginTop="lg">
      <div className="analytics-surface analytics-tab-summary analytics-launch-nav">
        <div className="analytics-launch-browser-tabs" role="tablist" aria-label="Разделы чеклиста запуска">
          {visibleBoardTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`analytics-launch-browser-tab${activeBoard === tab.id ? " analytics-launch-browser-tab-active" : ""}`}
              onClick={() => onSelectBoard(tab.id)}
            >
              <span>{tab.label}</span>
              {mode === "tasks" ? <span className="analytics-launch-tab-count">{getBoardTaskCount(tab.id) ?? 0}</span> : null}
            </button>
          ))}

          {mode === "tasks"
            ? customChecklists.map((checklist) => (
                <button
                  key={checklist.id}
                  type="button"
                  className={`analytics-launch-browser-tab${activeBoard === checklist.id ? " analytics-launch-browser-tab-active" : ""}`}
                  onClick={() => onSelectBoard(checklist.id)}
                >
                  <span>{checklist.title}</span>
                  <span className="analytics-launch-tab-count">{Array.isArray(checklist.tasks) ? checklist.tasks.length : 0}</span>
                </button>
              ))
            : null}

          {mode === "tasks" && isCreatingChecklist ? (
            <form
              className="analytics-launch-new-checklist"
              onSubmit={(event) => {
                event.preventDefault();
                onAddChecklist();
              }}
            >
              <input
                className="analytics-launch-new-checklist-input"
                value={newChecklistName}
                onChange={(event) => onChecklistNameChange(event.target.value)}
                placeholder="Название чек-листа"
                autoFocus
              />
              <button type="submit" className="analytics-launch-new-checklist-save" aria-label="Создать чек-лист">
                +
              </button>
            </form>
          ) : mode === "tasks" ? (
            <button type="button" className="analytics-launch-browser-tab analytics-launch-browser-tab-add" onClick={onStartChecklistCreate}>
              +
            </button>
          ) : null}
        </div>
      </div>
    </Wrapper>
  );
}

export default LaunchBoardTabs;
