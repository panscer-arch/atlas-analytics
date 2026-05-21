import AnalyticsDateTime from "./AnalyticsDateTime";

function AnalyticsHeader({ showAdmins = false, showMotion = true }) {
  return (
    <div className="analytics-surface analytics-header">
      <div className="analytics-header-main">
        <div className="analytics-header-title-row">
          <img className="analytics-header-logo" src="/generated/analytics-character-logo.png" alt="" aria-hidden="true" />
          <h1 className="analytics-page-title analytics-page-title-animated mb-0">Аналитика</h1>
          {showMotion ? (
            <div className="analytics-header-motion analytics-header-motion-inline" aria-hidden="true">
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
            </div>
          ) : null}
        </div>
      </div>

      <div className="analytics-header-center">
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
