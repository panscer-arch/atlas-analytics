import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileCheck2,
  Gauge,
  HandCoins,
  Landmark,
  LayoutDashboard,
  Menu,
  Network,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import AdminFinanceOverview from "./AdminFinanceOverview";
import AdminFinanceFlows from "./AdminFinanceFlows";
import AdminFinanceCycles from "./AdminFinanceCycles";
import AdminFinanceForecast from "./AdminFinanceForecast";
import AdminFinanceClaims from "./AdminFinanceClaims";
import AdminFinanceParticipants from "./AdminFinanceParticipants";
import AdminFinanceRevenue from "./AdminFinanceRevenue";
import AdminFinanceHeadAccount from "./AdminFinanceHeadAccount";
import AdminFinanceLiquidity from "./AdminFinanceLiquidity";
import AdminFinanceTraffic from "./AdminFinanceTraffic";
import AdminFinanceCampaigns from "./AdminFinanceCampaigns";
import AdminFinanceReconciliation from "./AdminFinanceReconciliation";
import AdminFinanceRisks from "./AdminFinanceRisks";
import AdminFinanceMethodology from "./AdminFinanceMethodology";
import { navigationItems } from "./data/overviewData";
import { useAdminFinanceMeta } from "./api/useAdminFinanceApi";
import {
  adminFinanceMvpSections,
  adminFinanceMvpUtilitySections,
  adminFinanceReleaseScope,
  resolveAdminFinanceMvpRedirect,
} from "./api/adminFinanceConfig";
import "./styles/admin-finance.css";

const icons = {
  overview: LayoutDashboard,
  flows: Activity,
  cycles: RefreshCw,
  forecast: BarChart3,
  claims: HandCoins,
  participants: Users,
  revenue: CircleDollarSign,
  "head-account": Network,
  liquidity: Landmark,
  traffic: WalletCards,
  campaigns: Gauge,
  reconciliation: FileCheck2,
  risks: ShieldAlert,
  methodology: BookOpenCheck,
};

const sectionMeta = {
  overview: {
    title: "Финансовый контроль",
    subtitle: "Ликвидность, обязательства и доход Atlas System · UTC",
    contour: "multi",
  },
  flows: {
    title: "Денежные потоки",
    subtitle: "Входящие и исходящие переводы, Net Flow и распределение по циклам · UTC",
    contour: "consolidated",
  },
  cycles: {
    title: "Циклы",
    subtitle: "All-time циклы, claimable now и maximum exposure · UTC",
    contour: "contracts",
  },
  forecast: {
    title: "Прогноз выплат",
    subtitle: "Кассовая нагрузка и потребность в ликвидности на горизонте до 90 дней · UTC",
    contour: "payout",
  },
  claims: {
    title: "Claims и выплаты",
    subtitle: "Операционный реестр обязательств, запросов и расчетов · UTC",
    contour: "payout",
  },
  participants: {
    title: "Участники и лидеры",
    subtitle: "Поиск, структура, финансовый результат и контроль KPI · UTC",
    contour: "consolidated",
  },
  revenue: {
    title: "Доход компании",
    subtitle: "Platform Fee, доход головного аккаунта и фактический take rate · UTC",
    contour: "treasury",
  },
  "head-account": {
    title: "Головной аккаунт",
    subtitle: "Статус, условия удержания, первая линия и доход под риском · UTC",
    contour: "head",
  },
  liquidity: {
    title: "Ликвидность",
    subtitle: "Денежные остатки, резерв, cash ladder и LP-контроль · UTC",
    contour: "payout",
  },
  traffic: {
    title: "Кошельки и трафик",
    subtitle: "Путь от визита до подтверждённого on-chain цикла · UTC",
    contour: "consolidated",
  },
  campaigns: {
    title: "Кампании и когорты",
    subtitle: "От рекламного расхода до подтверждённого дохода компании · UTC",
    contour: "consolidated",
  },
  reconciliation: {
    title: "Сверка данных",
    subtitle: "Event → receipt → transfer → economic payout → ledger · UTC",
    contour: "consolidated",
  },
  risks: {
    title: "Контроль рисков",
    subtitle: "Ликвидность, концентрация, качество данных и операционные уведомления · UTC",
    contour: "payout",
  },
  methodology: {
    title: "Методика, источники и доступ",
    subtitle: "Единый реестр финансовых правил, данных, ролей и решений Gate 0",
    contour: "consolidated",
  },
};

function currentSection(pathname) {
  return navigationItems.find((item) => pathname.startsWith(item.path))?.id || "overview";
}

function PlaceholderScreen({ section }) {
  const item = navigationItems.find((entry) => entry.id === section);
  return (
    <section className="af-placeholder" aria-labelledby="af-placeholder-title">
      <div className="af-placeholder-icon"><BarChart3 size={24} /></div>
      <h2 id="af-placeholder-title">{item?.label}</h2>
      <p>Экран подключен к общей навигации. Данные появятся после реализации соответствующего Admin API.</p>
      <a href="/admin/overview">Вернуться в обзор</a>
    </section>
  );
}

function SourceCard({ source }) {
  if (source.status === "disabled") {
    return <div className="af-source-card is-disabled"><div className="af-source-title"><span className="af-live-dot" />Финансовая админка отключена</div><p>Production build не показывает fixtures<br />Нужно явно выбрать API<br />Gate 0 и доступ проверяются сервером</p></div>;
  }

  if (source.status === "static-demo") {
    return <div className="af-source-card is-demo"><div className="af-source-title"><span className="af-live-dot" />Демо-источник</div><p>Production API не подключен<br />Статические данные интерфейса<br />Не являются финансовым фактом</p></div>;
  }

  if (source.status === "loading") {
    return <div className="af-source-card is-loading"><div className="af-source-title"><span className="af-live-dot" />Подключение Admin API</div><p>Проверяем сессию и контракт<br />Статические данные не подставляются</p></div>;
  }

  if (source.status === "auth-required") {
    return <div className="af-source-card is-auth"><div className="af-source-title"><span className="af-live-dot" />Требуется админ-сессия</div><p>API вернул 401<br />Финансовые данные скрыты</p><button type="button" onClick={source.reload}>Повторить проверку</button></div>;
  }

  if (source.status === "error") {
    return <div className="af-source-card is-error"><div className="af-source-title"><span className="af-live-dot" />Admin API недоступен</div><p>Демо-значения не подставлены<br />Проверьте сервис и повторите</p><button type="button" onClick={source.reload}>Повторить</button></div>;
  }

  const gate = source.data?.gateZero || { closed: 0, total: 14 };
  return <div className="af-source-card is-api"><div className="af-source-title"><span className="af-live-dot" />Admin API · Gate 0</div><p>Контракт: {source.data?.apiVersion || "не указан"}<br />Gate 0: {gate.closed} / {gate.total} закрыто<br />Production не подтвержден</p></div>;
}

function AdminApiPendingScreen({ section, source }) {
  const label = navigationItems.find((item) => item.id === section)?.label || "Финансовый экран";
  const copy = source.status === "disabled"
    ? "Источник данных не выбран. Production build намеренно не показывает демонстрационные финансовые значения."
    : source.status === "auth-required"
    ? "Admin API требует действующую админ-сессию. Макетные показатели скрыты."
    : source.status === "error"
      ? "Admin API недоступен. Последние demo-значения намеренно не показаны."
      : source.status === "loading"
        ? "Проверяем сессию и доступность Admin API."
        : "Для этого экрана ещё не подключён полный канонический dataset. Макетные значения в API-режиме скрыты.";
  return <section className="af-api-boundary" aria-live="polite"><AlertTriangle size={24}/><span>ADMIN API · FAIL-CLOSED</span><h2>{label}</h2><p>{copy}</p>{source.status === "auth-required" || source.status === "error" ? <button type="button" onClick={source.reload}>Повторить проверку</button> : null}<a href="/admin/methodology#gate">Открыть методику и Gate 0</a></section>;
}

function ReleaseScopeScreen() {
  return <section className="af-api-boundary" aria-live="polite"><AlertTriangle size={24}/><span>НЕ ВХОДИТ В INTERNAL ALPHA</span><h2>Раздел отложен до следующего релиза</h2><p>Первый запуск ограничен сверкой, потоками, ликвидностью, циклами и выплатами. Остальные экраны сохранены в полном продукте, но не могут задерживать MVP.</p><a href="/admin/reconciliation">Перейти к сверке данных</a></section>;
}

export default function AdminFinanceApp() {
  const pathname = typeof window === "undefined" ? "/admin/overview" : window.location.pathname;
  const section = currentSection(pathname);
  const meta = sectionMeta[section] || {
    title: navigationItems.find((item) => item.id === section)?.label || "Финансовый контроль",
    subtitle: "Административная аналитика Atlas System · UTC",
    contour: "payout",
  };
  const [mobileOpen, setMobileOpen] = useState(false);
  const adminFinanceSource = useAdminFinanceMeta();
  const mvpMode = adminFinanceReleaseScope === "mvp";
  const mvpRedirect = resolveAdminFinanceMvpRedirect(section, mvpMode);
  const allowedNavigationItems = mvpMode
    ? navigationItems.filter((item) => adminFinanceMvpSections.includes(item.id))
    : navigationItems;
  const sectionAllowed = !mvpMode
    || adminFinanceMvpSections.includes(section)
    || adminFinanceMvpUtilitySections.includes(section);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mvpRedirect && typeof window !== "undefined") window.location.replace(mvpRedirect);
  }, [mvpRedirect]);

  if (mvpRedirect) {
    return <div className="af-api-boundary" aria-live="polite"><span>INTERNAL ALPHA</span><h1>Открываем денежные потоки</h1><p>Стартовый экран ограниченного релиза загружается.</p></div>;
  }

  return (
    <div className={`af-shell ${mvpMode ? "is-mvp" : ""}`}>
      <aside className={`af-sidebar ${mobileOpen ? "is-open" : ""}`} aria-label="Финансовая навигация">
        <div className="af-brand">
          <img src="/generated/atlas-logo-new-transparent.png" alt="Atlas System" />
        </div>
        <button className="af-sidebar-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Закрыть меню">
          <X size={20} />
        </button>
        <nav className="af-nav">
          {allowedNavigationItems.map((item) => {
            const Icon = icons[item.id] || LayoutDashboard;
            return (
              <a className={section === item.id ? "active" : ""} href={item.path} key={item.id}>
                <Icon size={17} strokeWidth={1.8} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
        <SourceCard source={adminFinanceSource} />
      </aside>

      {mobileOpen ? <button className="af-backdrop" type="button" onClick={() => setMobileOpen(false)} aria-label="Закрыть меню" /> : null}

      <main className="af-main">
        <header className="af-topbar">
          <div className="af-title-group">
            <button className="af-mobile-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Открыть меню">
              <Menu size={20} />
            </button>
            <div>
              <div className="af-title-line"><h1>{meta.title}</h1>{mvpMode ? <span className="af-release-badge">INTERNAL ALPHA</span> : null}</div>
              <p>{meta.subtitle}</p>
            </div>
          </div>
          <div className="af-top-actions">
            <label className="af-contour-select">
              <span className="sr-only">Контур данных</span>
              <select defaultValue={meta.contour} key={meta.contour} disabled={adminFinanceSource.apiEnabled} title={adminFinanceSource.apiEnabled ? "Контуры заданы секциями API snapshot" : undefined}>
                <option value="multi">Обзор: несколько контуров</option>
                <option value="payout">Контур: Payout Contract</option>
                <option value="consolidated">Контур: Atlas Consolidated</option>
                <option value="contracts">Контракты: Все версии</option>
                <option value="treasury">Контур: Company Treasury</option>
                <option value="head">Контур: Head Account</option>
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </label>
            {!mvpMode ? <a className="af-icon-action" href="/admin/participants" aria-label="Найти участника" title="Найти участника"><Search size={17} /></a> : null}
            {!mvpMode ? <a className="af-alert-action" href="/admin/risks" aria-label="Открыть риски" title="Открыть риски"><AlertTriangle size={17} /><span>1</span></a> : null}
          </div>
        </header>

        {!sectionAllowed
          ? <ReleaseScopeScreen />
          : adminFinanceSource.status === "disabled"
          ? <AdminApiPendingScreen section={section} source={adminFinanceSource} />
          : adminFinanceSource.apiEnabled && !["methodology", "overview", "flows", "cycles", "forecast", "claims", "participants", "revenue", "liquidity", "reconciliation"].includes(section)
          ? <AdminApiPendingScreen section={section} source={adminFinanceSource} />
          : section === "overview" ? <AdminFinanceOverview /> : section === "flows" ? <AdminFinanceFlows /> : section === "cycles" ? <AdminFinanceCycles /> : section === "forecast" ? <AdminFinanceForecast /> : section === "claims" ? <AdminFinanceClaims /> : section === "participants" ? <AdminFinanceParticipants /> : section === "revenue" ? <AdminFinanceRevenue /> : section === "head-account" ? <AdminFinanceHeadAccount /> : section === "liquidity" ? <AdminFinanceLiquidity /> : section === "traffic" ? <AdminFinanceTraffic /> : section === "campaigns" ? <AdminFinanceCampaigns /> : section === "reconciliation" ? <AdminFinanceReconciliation /> : section === "risks" ? <AdminFinanceRisks /> : section === "methodology" ? <AdminFinanceMethodology /> : <PlaceholderScreen section={section} />}
      </main>
    </div>
  );
}
