import {
  Activity,
  AlertTriangle,
  ChevronDown,
  FileCheck2,
  HandCoins,
  Landmark,
  Menu,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import AdminFinanceClaims from "./AdminFinanceClaims";
import AdminFinanceCycles from "./AdminFinanceCycles";
import AdminFinanceFlows from "./AdminFinanceFlows";
import AdminFinanceLiquidity from "./AdminFinanceLiquidity";
import AdminFinanceReconciliation from "./AdminFinanceReconciliation";
import { AdminFinanceSnapshotProvider, useAdminFinanceMeta } from "./api/useAdminFinanceApi";
import "./styles/admin-finance.css";

const sections = Object.freeze([
  { id: "reconciliation", label: "Сверка данных", path: "/admin/reconciliation", icon: FileCheck2, title: "Сверка данных", subtitle: "Срез источника, покрытие данных и открытые расхождения · UTC", contour: "consolidated" },
  { id: "flows", label: "Денежные потоки", path: "/admin/flows", icon: Activity, title: "Денежные потоки", subtitle: "Входящие и исходящие переводы, чистый поток и распределение по циклам · UTC", contour: "consolidated" },
  { id: "liquidity", label: "Ликвидность", path: "/admin/liquidity", icon: Landmark, title: "Ликвидность", subtitle: "Денежные остатки и качество покрытия источника · UTC", contour: "payout" },
  { id: "cycles", label: "Циклы", path: "/admin/cycles", icon: RefreshCw, title: "Циклы", subtitle: "Созданные, открытые и закрытые циклы и максимальная нагрузка · UTC", contour: "contracts" },
  { id: "claims", label: "Заявки и выплаты", path: "/admin/claims", icon: HandCoins, title: "Заявки и выплаты", subtitle: "Реестр обязательств, запросов и фактических расчётов · UTC", contour: "payout" },
]);

const screens = Object.freeze({
  reconciliation: AdminFinanceReconciliation,
  flows: AdminFinanceFlows,
  liquidity: AdminFinanceLiquidity,
  cycles: AdminFinanceCycles,
  claims: AdminFinanceClaims,
});

function currentSection(pathname) {
  if (pathname.startsWith("/admin/methodology")) return "methodology";
  return sections.find((item) => pathname.startsWith(item.path))?.id || "overview";
}

function SourceCard({ source }) {
  if (source.status === "loading") return <div className="af-source-card is-loading"><div className="af-source-title"><span className="af-live-dot" />Подключение Admin API</div><p>Проверяем сессию и источник<br />Макетные данные не подставляются</p></div>;
  if (source.status === "auth-required") return <div className="af-source-card is-auth"><div className="af-source-title"><span className="af-live-dot" />Требуется админ-сессия</div><p>API вернул 401<br />Финансовые данные скрыты</p><button type="button" onClick={source.reload}>Повторить</button></div>;
  if (source.status !== "ready") return <div className="af-source-card is-error"><div className="af-source-title"><span className="af-live-dot" />Admin API недоступен</div><p>Демо-значения не подставлены<br />Проверьте сервис и повторите</p><button type="button" onClick={source.reload}>Повторить</button></div>;
  const gate = source.data?.gateZero || { closed: 0, total: 14 };
  return <div className="af-source-card is-api"><div className="af-source-title"><span className="af-live-dot" />Admin API · Gate 0</div><p>Контракт: {source.data?.apiVersion || "не указан"}<br />Gate 0: {gate.closed} / {gate.total} закрыто<br />Production не подтверждён</p></div>;
}

function ApiBoundary({ source }) {
  const copy = source.status === "auth-required"
    ? "Нужна действующая админ-сессия. Финансовые показатели скрыты."
    : source.status === "loading"
      ? "Проверяем сессию и доступность Admin API."
      : "Проверяемый источник сейчас недоступен. Демонстрационные значения не подставлены.";
  return <section className="af-api-boundary" aria-live="polite"><AlertTriangle size={24} /><span>ADMIN API · FAIL-CLOSED</span><h2>Финансовые данные недоступны</h2><p>{copy}</p>{source.status !== "loading" ? <button type="button" onClick={source.reload}>Повторить проверку</button> : null}</section>;
}

function Methodology({ source }) {
  const coverage = Array.isArray(source.data?.dataCoverage) ? source.data.dataCoverage : [];
  return <div className="af-content"><section className="af-panel"><div className="af-panel-head"><div><h2>Покрытие данных Internal Alpha</h2><p>Read-only состояние источников, блокеров и следующих действий</p></div><span className="af-tag af-tag-orange">НЕ PRODUCTION</span></div>{coverage.length ? <div className="af-table-scroll"><table><thead><tr><th>Домен</th><th>Статус</th><th>Источник</th><th>Блокер</th><th>Следующий шаг</th></tr></thead><tbody>{coverage.map((item) => <tr key={item.id}><td><strong>{item.label}</strong></td><td><span className={`af-tag af-tag-${item.status === "available" ? "green" : item.status === "partial" ? "orange" : "red"}`}>{item.status.toUpperCase()}</span></td><td>{item.source}</td><td>{item.blocker}</td><td>{item.nextAction}</td></tr>)}</tbody></table></div> : <ApiBoundary source={source} />}</section></div>;
}

export default function AdminFinanceMvpApp() {
  const [pathname, setPathname] = useState(() => typeof window === "undefined" ? "/admin/flows" : window.location.pathname);
  const section = currentSection(pathname);
  const route = sections.find((item) => item.id === section) || sections[1];
  const Screen = screens[section];
  const source = useAdminFinanceMeta();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  useEffect(() => {
    if (section === "overview" && typeof window !== "undefined") {
      window.history.replaceState(null, "", "/admin/flows");
      setPathname("/admin/flows");
    }
  }, [section]);

  function navigate(event, path) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.history.pushState(null, "", path);
    setPathname(path);
  }

  return <div className="af-shell is-mvp">
    <aside className={`af-sidebar ${mobileOpen ? "is-open" : ""}`} aria-label="Финансовая навигация">
      <div className="af-brand"><img src="/generated/atlas-logo-new-transparent.png" alt="Atlas System" /></div>
      <button className="af-sidebar-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Закрыть меню"><X size={20} /></button>
      <nav className="af-nav">{sections.map((item) => { const Icon = item.icon; return <a className={section === item.id ? "active" : ""} href={item.path} onClick={(event) => navigate(event, item.path)} key={item.id}><Icon size={17} strokeWidth={1.8} /><span>{item.label}</span></a>; })}</nav>
      <SourceCard source={source} />
    </aside>
    {mobileOpen ? <button className="af-backdrop" type="button" onClick={() => setMobileOpen(false)} aria-label="Закрыть меню" /> : null}
    <main className="af-main">
      <header className="af-topbar">
        <div className="af-title-group"><button className="af-mobile-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Открыть меню"><Menu size={20} /></button><div><div className="af-title-line"><h1>{section === "methodology" ? "Методика и источники" : route.title}</h1><span className="af-release-badge">INTERNAL ALPHA</span></div><p>{section === "methodology" ? "Покрытие данных и границы первого read-only релиза" : route.subtitle}</p></div></div>
        <div className="af-top-actions"><label className="af-contour-select"><span className="sr-only">Контур данных</span><select value={route.contour} disabled><option value="payout">Контур: контракт выплат</option><option value="consolidated">Контур: внешние потоки Atlas</option><option value="contracts">Контракты: все версии</option></select><ChevronDown size={15} aria-hidden="true" /></label></div>
      </header>
      <AdminFinanceSnapshotProvider alphaMeta={source.status === "ready" ? source.data : null}>
        {source.status !== "ready" ? <ApiBoundary source={source} /> : section === "methodology" ? <Methodology source={source} /> : Screen ? <Screen /> : <ApiBoundary source={source} />}
      </AdminFinanceSnapshotProvider>
    </main>
  </div>;
}
