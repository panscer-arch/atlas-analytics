function AnalyticsBoardEmbed({ boardUrl, onClose }) {
  return (
    <div className="analytics-board-overlay" role="dialog" aria-modal="true" aria-labelledby="analytics-board-title">
      <section id="analytics-board" className="analytics-surface analytics-board-embed-panel">
        <div className="analytics-board-embed-head">
          <div>
            <span className="analytics-kicker">CRM-доска</span>
            <h2 id="analytics-board-title" className="analytics-idea-title">Вторая система задач внутри аналитики</h2>
            <p className="analytics-page-subtitle mb-0">
              Backlog, статусы, входящие идеи и рабочие карточки в формате доски.
            </p>
          </div>
          <div className="analytics-board-embed-actions">
            <a className="btn analytics-board-btn" href={boardUrl} target="_blank" rel="noreferrer">
              Открыть отдельно
            </a>
            <button type="button" className="btn analytics-board-close-btn" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </div>
        <div className="analytics-board-frame-wrap">
          <iframe className="analytics-board-frame" src={boardUrl} title="Доска аналитики" />
        </div>
      </section>
    </div>
  );
}

export default AnalyticsBoardEmbed;
