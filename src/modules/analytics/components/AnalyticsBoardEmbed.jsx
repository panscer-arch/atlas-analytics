import AnalyticsIdeaCapture from "./AnalyticsIdeaCapture";

function AnalyticsBoardEmbed({ activeTab, boardUrl }) {
  return (
    <section className="analytics-board-embed mt-4">
      <AnalyticsIdeaCapture activeTab={activeTab} />
      <section id="analytics-board" className="analytics-surface analytics-board-embed-panel mt-3">
        <div className="analytics-board-embed-head">
          <div>
            <span className="analytics-kicker">Доска задач</span>
            <h2 className="analytics-idea-title">Наша доска внутри аналитики</h2>
            <p className="analytics-page-subtitle mb-0">
              Здесь можно сразу смотреть backlog и входящие идеи, не уходя с аналитической страницы.
            </p>
          </div>
          <a className="btn analytics-board-btn" href={boardUrl} target="_blank" rel="noreferrer">
            Открыть отдельно
          </a>
        </div>
        <div className="analytics-board-frame-wrap">
          <iframe className="analytics-board-frame" src={boardUrl} title="Доска аналитики" />
        </div>
      </section>
    </section>
  );
}

export default AnalyticsBoardEmbed;
