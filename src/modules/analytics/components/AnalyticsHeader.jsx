import { LockKeyhole, UsersRound } from "lucide-react";
import AnalyticsDateTime from "./AnalyticsDateTime";

const VAULT_URL = String(import.meta.env.VITE_VAULT_URL || "").trim();

function HeaderTool({ label, onClick, href, children, className = "" }) {
  const Component = href ? "a" : "button";
  const externalProps = href ? { href, target: "_blank", rel: "noopener noreferrer" } : { type: "button", onClick };
  return (
    <Component
      {...externalProps}
      className={`analytics-header-tool ${className}`.trim()}
      aria-label={label}
      data-tooltip={label}
    >
      {children}
    </Component>
  );
}

function ToolIcon({ type }) {
  if (type === "session") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /><path d="M8 3h8" /></svg>;
  if (type === "hermes") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 14c3-1 4-5 7-8 3 3 4 7 7 8-2 4-5 6-7 6s-5-2-7-6Z" /><path d="M8 14h8M12 6v14" /></svg>;
  if (type === "expenses") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v18l-2-1.5L12 21l-3-1.5L7 21V3Z" /><path d="M10 8h4M10 12h4M10 16h2" /></svg>;
  if (type === "notes") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6V3Z" /><path d="M9 10h6M9 14h6M9 18h4" /></svg>;
  if (type === "marketing") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 13 11-5v8L4 13Z" /><path d="M7 14v5h4v-3M18 10v4" /></svg>;
  if (type === "media") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m5 17 5-4 3 2 3-3 3 5" /></svg>;
  return null;
}

function AnalyticsHeader({
  onAiReview,
  onParserOpen,
  onQuickNotes,
  onHermesOpen,
  onSessionOpen,
  onExpensesOpen,
  onTeamOpen,
  listingsCrmUrl,
  partnersCrmUrl,
  mediaPreviewUrl,
  onLiveAnalyticsClick,
  showAdmins = false,
  showMotion = true,
}) {
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
          <button type="button" className="analytics-header-ai-button" onClick={onAiReview} aria-label="AI-разбор задач" data-tooltip="AI-разбор задач" title="AI-разбор задач">
            <span>AI</span>
            <b>Разбор</b>
          </button>
        ) : null}
        {onSessionOpen ? <HeaderTool label="Сессия" onClick={onSessionOpen}><ToolIcon type="session" /></HeaderTool> : null}
        {onHermesOpen ? <HeaderTool label="Гермес" onClick={onHermesOpen}><ToolIcon type="hermes" /></HeaderTool> : null}
        {onExpensesOpen ? <HeaderTool label="Расходы" onClick={onExpensesOpen}><ToolIcon type="expenses" /></HeaderTool> : null}
        {onParserOpen ? <HeaderTool label="Маркетинг" onClick={onParserOpen}><ToolIcon type="marketing" /></HeaderTool> : null}
        {onQuickNotes ? (
          <HeaderTool label="Заметки" onClick={onQuickNotes}><ToolIcon type="notes" /></HeaderTool>
        ) : null}
        {onTeamOpen ? (
          <HeaderTool label="Создай команду" onClick={onTeamOpen} className="analytics-header-team-button">
            <UsersRound size={20} strokeWidth={1.9} aria-hidden="true" />
            <span>Создай команду</span>
          </HeaderTool>
        ) : null}
        {VAULT_URL ? (
          <HeaderTool label="Пароли" href={VAULT_URL}>
            <LockKeyhole size={22} strokeWidth={1.8} aria-hidden="true" />
          </HeaderTool>
        ) : null}
        {listingsCrmUrl ? (
          <HeaderTool
            label="CRM №1 — Площадки и маркетинг"
            href={listingsCrmUrl}
            className="analytics-header-tool-text analytics-header-tool-crm analytics-header-tool-crm-listings"
          >
            <span>CRM</span><b>1</b>
          </HeaderTool>
        ) : null}
        {partnersCrmUrl ? (
          <HeaderTool
            label="CRM №2 — Люди и партнёры"
            href={partnersCrmUrl}
            className="analytics-header-tool-text analytics-header-tool-crm analytics-header-tool-crm-partners"
          >
            <span>CRM</span><b>2</b>
          </HeaderTool>
        ) : null}
        {mediaPreviewUrl ? (
          <HeaderTool label="Atlas Media" href={mediaPreviewUrl}><ToolIcon type="media" /></HeaderTool>
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
