function RestoredBoardEmbed({ boardUrl }) {
  return (
    <div className="analytics-board-embed">
      <section className="analytics-surface analytics-board-embed-panel">
        <div className="analytics-board-embed-head">
          <div>
            <span className="analytics-kicker">Доска задач</span>
            <h2 className="analytics-idea-title">Наша доска внутри аналитики</h2>
            <p className="analytics-page-subtitle">
              Здесь можно сразу смотреть backlog и текущие задачи по аналитике, не уходя с экрана.
            </p>
          </div>
          <a className="analytics-board-btn" href={boardUrl} target="_blank" rel="noreferrer">
            Открыть отдельно
          </a>
        </div>
        <div className="analytics-board-frame-wrap">
          <iframe className="analytics-board-frame" src={boardUrl} title="Доска аналитики" />
        </div>
      </section>
    </div>
  );
}

export default RestoredBoardEmbed;
