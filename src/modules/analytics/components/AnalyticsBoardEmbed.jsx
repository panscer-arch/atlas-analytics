function AnalyticsBoardEmbed({
  boardUrl,
  onClose,
  variant = "overlay",
  kicker = "CRM-доска",
  title = "Вторая система задач внутри аналитики",
  subtitle = "Backlog, статусы, входящие идеи и рабочие карточки в формате доски.",
  frameTitle = "Доска аналитики",
  panelId = "analytics-crm-board",
}) {
  const isOverlay = variant === "overlay";
  const titleId = isOverlay ? "analytics-board-title" : "analytics-board-tab-title";
  const Root = isOverlay ? "div" : "section";

  return (
    <Root
      className={isOverlay ? "analytics-board-overlay" : "analytics-board-inline"}
      role={isOverlay ? "dialog" : undefined}
      aria-modal={isOverlay ? "true" : undefined}
      aria-labelledby={titleId}
    >
      <section id={isOverlay ? "analytics-board" : panelId} className="analytics-surface analytics-board-embed-panel">
        <div className="analytics-board-embed-head">
          <div>
            <span className="analytics-kicker">{kicker}</span>
            <h2 id={titleId} className="analytics-idea-title">{title}</h2>
            <p className="analytics-page-subtitle">
              {subtitle}
            </p>
          </div>
          <div className="analytics-board-embed-actions">
            <a className="analytics-board-btn" href={boardUrl} target="_blank" rel="noreferrer">
              Открыть отдельно
            </a>
            {isOverlay ? (
              <button type="button" className="analytics-board-close-btn" onClick={onClose}>
                Закрыть
              </button>
            ) : null}
          </div>
        </div>
        <div className="analytics-board-frame-wrap">
          <iframe className="analytics-board-frame" src={boardUrl} title={frameTitle} />
        </div>
      </section>
    </Root>
  );
}

export default AnalyticsBoardEmbed;
