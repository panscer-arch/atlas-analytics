import { Building2, HandCoins, Handshake, LockKeyhole, Megaphone, Moon, Radar, Sun, TableProperties, UsersRound, Workflow } from "lucide-react";
import AnalyticsDateTime from "./AnalyticsDateTime";
import { HEADER_TOOL_ORDER } from "../data/navigationShell";
import "../styles/workspace-shell.css";

const VAULT_URL = String(import.meta.env.VITE_VAULT_URL || "").trim();

function HeaderTool({ toolId, label, displayLabel = label, onClick, href, children, className = "" }) {
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
      <span className="analytics-header-tool-icon" aria-hidden="true">{children}</span>
      <span className="analytics-header-tool-label">{displayLabel}</span>
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
  colorMode = "dark",
  onToggleColorMode,
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
  showAdmins = false,
}) {
  const headerTools = {
    marketingOs: onMarketingOsOpen ? (
      <HeaderTool key="marketingOs" toolId="marketingOs" label="MarketingOS" displayLabel="MarketingOS" onClick={onMarketingOsOpen} className="analytics-header-marketing-os-button">
        <Workflow size={22} strokeWidth={1.8} aria-hidden="true" />
      </HeaderTool>
    ) : null,
    session: onSessionOpen ? <HeaderTool key="session" toolId="session" label="Сессия" displayLabel="Сессия" onClick={onSessionOpen}><ToolIcon type="session" /></HeaderTool> : null,
    hermes: onHermesOpen ? <HeaderTool key="hermes" toolId="hermes" label="Гермес" displayLabel="Гермес" onClick={onHermesOpen}><ToolIcon type="hermes" /></HeaderTool> : null,
    expenses: onExpensesOpen ? <HeaderTool key="expenses" toolId="expenses" label="Расходы" displayLabel="Расходы" onClick={onExpensesOpen} className="analytics-header-expenses-button"><ToolIcon type="expenses" /></HeaderTool> : null,
    contributions: onContributionsOpen ? (
      <HeaderTool key="contributions" toolId="contributions" label="Вклады команды" displayLabel="Вклады команды" onClick={onContributionsOpen} className="analytics-header-contributions-button">
        <HandCoins size={22} strokeWidth={1.8} aria-hidden="true" />
      </HeaderTool>
    ) : null,
    toolRadar: onToolRadarOpen ? (
      <HeaderTool key="toolRadar" toolId="toolRadar" label="Радар инструментов" displayLabel="Радар инструментов" onClick={onToolRadarOpen} className="analytics-header-radar-button">
        <Radar size={22} strokeWidth={1.8} aria-hidden="true" />
      </HeaderTool>
    ) : null,
    tables: onTablesOpen ? (
      <HeaderTool key="tables" toolId="tables" label="Таблицы" displayLabel="Таблицы" onClick={onTablesOpen} className="analytics-header-tables-button">
        <TableProperties size={22} strokeWidth={1.8} aria-hidden="true" />
      </HeaderTool>
    ) : null,
    notes: onQuickNotes ? <HeaderTool key="notes" toolId="notes" label="Заметки" displayLabel="Заметки" onClick={onQuickNotes}><ToolIcon type="notes" /></HeaderTool> : null,
    team: onTeamOpen ? (
      <HeaderTool key="team" toolId="team" label="Создай команду" displayLabel="Создай команду" onClick={onTeamOpen} className="analytics-header-team-button">
        <UsersRound size={20} strokeWidth={1.9} aria-hidden="true" />
      </HeaderTool>
    ) : null,
    departments: onDepartmentsOpen ? (
      <HeaderTool key="departments" toolId="departments" label="Отделы и процессы" displayLabel="Отделы" onClick={onDepartmentsOpen} className="analytics-header-team-button">
        <Building2 size={20} />
      </HeaderTool>
    ) : null,
    vault: VAULT_URL ? (
      <HeaderTool key="vault" toolId="vault" label="Пароли" displayLabel="Пароли" href={VAULT_URL}>
        <LockKeyhole size={22} strokeWidth={1.8} aria-hidden="true" />
      </HeaderTool>
    ) : null,
    crmListings: listingsCrmUrl ? (
      <HeaderTool key="crmListings" toolId="crmListings" label="CRM №1 — Площадки и маркетинг" displayLabel="CRM 1" href={listingsCrmUrl} className="analytics-header-tool-crm analytics-header-tool-crm-listings">
        <Megaphone size={20} strokeWidth={1.8} aria-hidden="true" />
      </HeaderTool>
    ) : null,
    crmPartners: partnersCrmUrl ? (
      <HeaderTool key="crmPartners" toolId="crmPartners" label="CRM №2 — Люди и партнёры" displayLabel="CRM 2" href={partnersCrmUrl} className="analytics-header-tool-crm analytics-header-tool-crm-partners">
        <Handshake size={20} strokeWidth={1.8} aria-hidden="true" />
      </HeaderTool>
    ) : null,
  };

  return (
    <div className="analytics-surface analytics-header sus-header">
      <div className="analytics-header-top">
        <div className="analytics-header-main">
          <div className="sus-brand-row">
            <img className="sus-brand-original" src="/generated/analytics-character-logo.png" alt="" width="64" height="76" />
            <div className="sus-brand-copy"><h1>SuperSUS<span> / </span></h1><p>Рабочее пространство команды</p></div>
          </div>
        </div>
        <div className="analytics-header-time">
          <AnalyticsDateTime />
        </div>
      </div>

      <div className="analytics-header-center" aria-label="Инструменты SuperSUS">
        {onToggleColorMode ? (
          <button type="button" className="analytics-header-tool sus-theme-toggle" onClick={onToggleColorMode}
            aria-label="Светлая тема" aria-pressed={colorMode === "light"}
            title={colorMode === "light" ? "Включить тёмную тему" : "Включить светлую тему"}>
            <span className="analytics-header-tool-icon" aria-hidden="true">{colorMode === "light" ? <Moon size={17} /> : <Sun size={17} />}</span>
            <span className="analytics-header-tool-label">{colorMode === "light" ? "Тёмная тема" : "Светлая тема"}</span>
          </button>
        ) : null}
        {HEADER_TOOL_ORDER.map((toolId) => headerTools[toolId])}
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
