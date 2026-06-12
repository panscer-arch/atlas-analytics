import AnalyticsDateTime from "./AnalyticsDateTime";

function AnalyticsHeader({ onAiReview, onParserOpen, onQuickNotes, onHermesOpen, onLiveAnalyticsClick, showAdmins = false, showMotion = true }) {
  return (
    <div className="analytics-surface analytics-header">
      <div className="analytics-header-main">
        <div className="analytics-header-title-row">
          <span className="analytics-header-logo-wrap" aria-hidden="true">
            <img className="analytics-header-logo" src="/generated/analytics-character-logo.png" alt="" />
            <span className="analytics-header-logo-eye analytics-header-logo-eye-left" />
            <span className="analytics-header-logo-eye analytics-header-logo-eye-right" />
            <span className="analytics-header-logo-mouth" />
          </span>
          <h1 className="analytics-page-title analytics-page-title-animated">Аналитика</h1>
          {showMotion ? (
            <button
              type="button"
              className="analytics-header-motion analytics-header-motion-inline analytics-header-motion-button"
              onClick={onLiveAnalyticsClick}
              aria-label="Открыть дневник"
            >
              <div className="analytics-header-motion-label">
                <span className="analytics-header-motion-dot" />
                <span>Live analytics</span>
              </div>
              <div className="analytics-header-wave">
                <span className="analytics-header-wave-bar analytics-header-wave-bar-1" />
                <span className="analytics-header-wave-bar analytics-header-wave-bar-2" />
                <span className="analytics-header-wave-bar analytics-header-wave-bar-3" />
                <span className="analytics-header-wave-bar analytics-header-wave-bar-4" />
                <span className="analytics-header-wave-bar analytics-header-wave-bar-5" />
                <span className="analytics-header-wave-bar analytics-header-wave-bar-6" />
                <span className="analytics-header-wave-bar analytics-header-wave-bar-7" />
              </div>
            </button>
          ) : null}
        </div>
      </div>

      <div className="analytics-header-center">
        {onAiReview ? (
          <button type="button" className="analytics-header-ai-button" onClick={onAiReview} aria-label="AI-разбор задач">
            <span>AI</span>
            <b>Разбор</b>
          </button>
        ) : null}
        {onParserOpen ? (
          <button type="button" className="analytics-header-parser-button" onClick={onParserOpen} aria-label="Открыть парсер" title="Парсер">
            <span className="analytics-header-parser-radar" aria-hidden="true">
              <span className="analytics-header-parser-ring analytics-header-parser-ring-1" />
              <span className="analytics-header-parser-ring analytics-header-parser-ring-2" />
              <span className="analytics-header-parser-sweep" />
              <span className="analytics-header-parser-dot analytics-header-parser-dot-1" />
              <span className="analytics-header-parser-dot analytics-header-parser-dot-2" />
            </span>
          </button>
        ) : null}
        {onQuickNotes ? (
          <button type="button" className="analytics-header-notes-button" onClick={onQuickNotes} aria-label="Открыть заметки" title="Заметки">
            <span className="analytics-header-notes-paper" aria-hidden="true">
              <span className="analytics-header-notes-line analytics-header-notes-line-1" />
              <span className="analytics-header-notes-line analytics-header-notes-line-2" />
              <span className="analytics-header-notes-pen" />
            </span>
          </button>
        ) : null}
        {onHermesOpen ? (
          <button type="button" className="analytics-header-hermes-button" onClick={onHermesOpen} aria-label="Открыть Гермес" title="Гермес">
            <span className="analytics-header-hermes-mark" aria-hidden="true">
              <span className="analytics-header-hermes-core" />
              <span className="analytics-header-hermes-orbit analytics-header-hermes-orbit-1" />
              <span className="analytics-header-hermes-orbit analytics-header-hermes-orbit-2" />
              <span className="analytics-header-hermes-spark analytics-header-hermes-spark-1" />
              <span className="analytics-header-hermes-spark analytics-header-hermes-spark-2" />
            </span>
          </button>
        ) : null}
        <AnalyticsDateTime />
      </div>

      {showAdmins ? (
        <div className="analytics-header-side">
          <div className="analytics-header-admins">
            <span className="analytics-header-admins-title">Админы онлайн</span>
            <div className="analytics-dashboard-admins">
              {["ВП", "КС", "БР", "АМ"].map((person) => (
                <span key={person} className="analytics-dashboard-admin-pill">
                  <span className="analytics-dashboard-admin-dot" />
                  {person}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AnalyticsHeader;
