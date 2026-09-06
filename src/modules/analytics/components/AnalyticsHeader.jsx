import { Building2, HandCoins, LockKeyhole, Radar, TableProperties, UsersRound, Workflow } from "lucide-react";
import AnalyticsDateTime from "./AnalyticsDateTime";
import { HEADER_TOOL_ORDER } from "../data/navigationShell";

const VAULT_URL = String(import.meta.env.VITE_VAULT_URL || "").trim();

function HeaderTool({ toolId, label, onClick, href, children, className = "" }) {
  const Component = href ? "a" : "button";
  const externalProps = href ? { href, target: "_blank", rel: "noopener noreferrer" } : { type: "button", onClick };
  return (
    <Component
      {...externalProps}
      className={`analytics-header-tool ${className}`.trim()}
      aria-label={label}
      data-tooltip={label}
      data-header-tool={toolId}
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
  return null;
}

function AnalyticsHeader({
  onMarketingOsOpen,
  onQuickNotes,
  onHermesOpen,
  onSessionOpen,
  onExpensesOpen,
  onContributionsOpen,
  onToolRadarOpen,
  onTablesOpen,
  onTeamOpen,
  onDepartmentsOpen,
  listingsCrmUrl,
  partnersCrmUrl,
  onLiveAnalyticsClick,
  showAdmins = false,
  showMotion = true,
}) {
  const headerTools = {
    marketingOs: onMarketingOsOpen ? (
      <HeaderTool key="marketingOs" toolId="marketingOs" label="MarketingOS" onClick={onMarketingOsOpen} className="analytics-header-marketing-os-button">
        <Workflow size={22} strokeWidth={1.8} aria-hidden="true" />
      </HeaderTool>
    ) : null,
    session: onSessionOpen ? <HeaderTool key="session" toolId="session" label="Сессия" onClick={onSessionOpen}><ToolIcon type="session" /></HeaderTool> : null,
    hermes: onHermesOpen ? <HeaderTool key="hermes" toolId="hermes" label="Гермес" onClick={onHermesOpen}><ToolIcon type="hermes" /></HeaderTool> : null,
    expenses: onExpensesOpen ? <HeaderTool key="expenses" toolId="expenses" label="Расходы" onClick={onExpensesOpen} className="analytics-header-expenses-button"><ToolIcon type="expenses" /></HeaderTool> : null,
    contributions: onContributionsOpen ? (
      <HeaderTool key="contributions" toolId="contributions" label="Вклады команды" onClick={onContributionsOpen} className="analytics-header-contributions-button">
        <HandCoins size={22} strokeWidth={1.8} aria-hidden="true" />
      </HeaderTool>
    ) : null,
    toolRadar: onToolRadarOpen ? (
      <HeaderTool key="toolRadar" toolId="toolRadar" label="Радар инструментов" onClick={onToolRadarOpen} className="analytics-header-radar-button">
        <Radar size={22} strokeWidth={1.8} aria-hidden="true" />
      </HeaderTool>
    ) : null,
    tables: onTablesOpen ? (
      <HeaderTool key="tables" toolId="tables" label="Таблицы" onClick={onTablesOpen} className="analytics-header-tables-button">
        <TableProperties size={22} strokeWidth={1.8} aria-hidden="true" />
      </HeaderTool>
    ) : null,
    notes: onQuickNotes ? <HeaderTool key="notes" toolId="notes" label="Заметки" onClick={onQuickNotes}><ToolIcon type="notes" /></HeaderTool> : null,
    team: onTeamOpen ? (
      <HeaderTool key="team" toolId="team" label="Создай команду" onClick={onTeamOpen} className="analytics-header-team-button">
        <UsersRound size={20} strokeWidth={1.9} aria-hidden="true" />
        <span>Создай команду</span>
      </HeaderTool>
    ) : null,
    departments: onDepartmentsOpen ? (
      <HeaderTool key="departments" toolId="departments" label="Отделы и процессы" onClick={onDepartmentsOpen} className="analytics-header-team-button">
        <Building2 size={20} />
        <span>Отделы</span>
      </HeaderTool>
    ) : null,
    vault: VAULT_URL ? (
      <HeaderTool key="vault" toolId="vault" label="Пароли" href={VAULT_URL}>
        <LockKeyhole size={22} strokeWidth={1.8} aria-hidden="true" />
      </HeaderTool>
    ) : null,
    crmListings: listingsCrmUrl ? (
      <HeaderTool key="crmListings" toolId="crmListings" label="CRM №1 — Площадки и маркетинг" href={listingsCrmUrl} className="analytics-header-tool-text analytics-header-tool-crm analytics-header-tool-crm-listings">
        <span>CRM</span><b>1</b>
      </HeaderTool>
    ) : null,
    crmPartners: partnersCrmUrl ? (
      <HeaderTool key="crmPartners" toolId="crmPartners" label="CRM №2 — Люди и партнёры" href={partnersCrmUrl} className="analytics-header-tool-text analytics-header-tool-crm analytics-header-tool-crm-partners">
        <span>CRM</span><b>2</b>
      </HeaderTool>
    ) : null,
  };

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
        {HEADER_TOOL_ORDER.map((toolId) => headerTools[toolId])}
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
