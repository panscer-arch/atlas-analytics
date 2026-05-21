function AnalyticsBoardEmbed({ boardUrl, onClose, variant = "overlay" }) {
  const isOverlay = variant === "overlay";
  const titleId = isOverlay ? "analytics-board-title" : "analytics-board-tab-title";
  const Root = isOverlay ? "div" : "section";

  return (
    <Root
      className={isOverlay ? "analytics-board-overlay" : "analytics-board-inline mt-4"}
      role={isOverlay ? "dialog" : undefined}
      aria-modal={isOverlay ? "true" : undefined}
      aria-labelledby={titleId}
    >
      <section id={isOverlay ? "analytics-board" : "analytics-crm-board"} className="analytics-surface analytics-board-embed-panel">
        <div className="analytics-board-embed-head">
          <div>
            <span className="analytics-kicker">CRM-доска</span>
            <h2 id={titleId} className="analytics-idea-title">Вторая система задач внутри аналитики</h2>
            <p className="analytics-page-subtitle mb-0">
              Backlog, статусы, входящие идеи и рабочие карточки в формате доски.
            </p>
          </div>
          <div className="analytics-board-embed-actions">
            <a className="btn analytics-board-btn" href={boardUrl} target="_blank" rel="noreferrer">
              Открыть отдельно
            </a>
            {isOverlay ? (
              <button type="button" className="btn analytics-board-close-btn" onClick={onClose}>
                Закрыть
              </button>
            ) : null}
          </div>
        </div>
        <div className="analytics-board-frame-wrap">
          <iframe className="analytics-board-frame" src={boardUrl} title="Доска аналитики" />
        </div>
      </section>
    </Root>
  );
}

export default AnalyticsBoardEmbed;
