import { useMemo, useState } from "react";
import EmptyState from "./components/EmptyState";
import LoadingState from "./components/LoadingState";
import AnalyticsDataTable from "./components/AnalyticsDataTable";
import AnalyticsDateTime from "./components/AnalyticsDateTime";
import useAnalyticsData from "./hooks/useAnalyticsData";
import formatCurrency from "./utils/formatCurrency";
import "./styles/analytics.css";

const ANALYTICS_BOARD_URL = "/analytics-board/";

const restoredTabs = [
  { id: "overview", label: "Обзор" },
  { id: "traffic", label: "Трафик" },
  { id: "products", label: "Продукты" },
  { id: "wallets", label: "Кошельки" },
  { id: "partner", label: "Структура" },
  { id: "geography", label: "География" },
];

function HeroCard({ title, value, hint }) {
  return (
    <div className="analytics-surface analytics-restored-hero-card">
      <div className="analytics-restored-hero-label">{title}</div>
      <div className="analytics-restored-hero-value">{value}</div>
      <div className="analytics-restored-hero-hint">{hint}</div>
    </div>
  );
}

function RestoredSection({ eyebrow, title, description, children }) {
  return (
    <section className="analytics-surface analytics-restored-section">
      <div className="analytics-restored-section-head">
        {eyebrow ? <div className="analytics-kicker">{eyebrow}</div> : null}
        <h2 className="analytics-restored-section-title">{title}</h2>
        {description ? <p className="analytics-restored-section-copy">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function AnalyticsRestoredPage() {
  const { data, isLoading } = useAnalyticsData();
  const [activeTab, setActiveTab] = useState("overview");
  const [isBoardOpen, setIsBoardOpen] = useState(false);

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  const walletRows = data.tabsData?.wallets?.rows || [];
  const partnerRows = data.tabsData?.partner?.rows || [];
  const geographyRows = data.tabsData?.geography?.rows || [];
  const trafficCountryRows = data.tabsData?.traffic?.countries || [];
  const productRows = data.tabsData?.products?.rows || [];

  const groupedProductRows = useMemo(() => {
    const lockup = productRows.filter((row) => row.source === "Lockup");
    const daily = productRows.filter((row) => row.source === "Daily Flow");
    return { lockup, daily };
  }, [productRows]);

  function renderOverviewTab() {
    return (
      <>
        <RestoredSection
          eyebrow="База"
          title="Главные параметры системы"
          description="Система должна ежедневно видеть входящие деньги, будущие обязательства и потребность в новом притоке."
        >
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <HeroCard title="Главный KPI" value="Incoming Money" hint="Входящий поток" />
            </div>
            <div className="col-12 col-md-4">
              <HeroCard title="Обязательства" value="Today / 7d / 30d" hint="Окна выплат" />
            </div>
            <div className="col-12 col-md-4">
              <HeroCard title="План добора" value={formatCurrency(data.kpis.requiredNewMoney)} hint="Требуемый новый приток" />
            </div>
          </div>
          <ul className="analytics-restored-list">
            <li>Система знает все user wallets, creator wallets, treasury wallets и движение денег по ним.</li>
            <li>Система знает все инвестиции, продукты, циклы, даты входов и ожидаемые выплаты.</li>
            <li>Система раскладывает приток на cycle payouts, referral, platform fee и operator net.</li>
          </ul>
        </RestoredSection>

        <RestoredSection
          eyebrow="Incoming vs Obligations"
          title="Сколько пришло и сколько нужно закрыть"
          description="Это главный управленческий слой старой версии."
        >
          <div className="row g-3">
            <div className="col-12 col-xl-6">
              <div className="analytics-surface analytics-restored-card">
                <h3 className="analytics-restored-card-title">Incoming block</h3>
                <div className="analytics-restored-metric-list">
                  <div><span>Incoming Today</span><strong>{formatCurrency(data.kpis.factToday)}</strong></div>
                  <div><span>Plan Today</span><strong>{formatCurrency(data.kpis.planToday)}</strong></div>
                  <div><span>Fact Today</span><strong>{formatCurrency(data.kpis.factToday)}</strong></div>
                  <div><span>Gap Today</span><strong>{formatCurrency(data.kpis.gapToday)}</strong></div>
                  <div><span>Required Tomorrow</span><strong>{formatCurrency(data.kpis.targetTomorrow)}</strong></div>
                </div>
              </div>
            </div>
            <div className="col-12 col-xl-6">
              <div className="analytics-surface analytics-restored-card">
                <h3 className="analytics-restored-card-title">Obligations block</h3>
                <div className="analytics-restored-metric-list">
                  <div><span>Выплаты сегодня</span><strong>{formatCurrency(data.kpis.paidToday || data.kpis.outgoingToday || data.kpis.cashPosition?.outgoingFact || 0)}</strong></div>
                  <div><span>Выплаты на 7 дней</span><strong>{formatCurrency(data.kpis.obligations7d)}</strong></div>
                  <div><span>Выплаты на 30 дней</span><strong>{formatCurrency(data.kpis.obligations30d)}</strong></div>
                  <div><span>Уже выплачено</span><strong>{formatCurrency(data.kpis.paidTotal || 0)}</strong></div>
                  <div><span>Ещё не выплачено</span><strong>{formatCurrency(data.kpis.unpaidTotal || data.kpis.obligations30d)}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </RestoredSection>

        <RestoredSection
          eyebrow="Breakdown & Forecast"
          title="Куда уйдут деньги и где первая дата риска"
          description="Прогноз должен объяснять не только сумму потребности, но и её структуру."
        >
          <div className="analytics-restored-pill-row">
            <span className="analytics-restored-pill">Cycle Payouts: {formatCurrency(data.kpis.obligations7d)}</span>
            <span className="analytics-restored-pill">Referral Burden: {formatCurrency(data.kpis.referralBurden)}</span>
            <span className="analytics-restored-pill">Platform Fee: {formatCurrency(data.kpis.platformFee)}</span>
            <span className="analytics-restored-pill">Operator Net: {formatCurrency(data.kpis.operatorNet)}</span>
            <span className="analytics-restored-pill">First Risk Date: {data.kpis.firstRiskDate}</span>
            <span className="analytics-restored-pill">Projected Gap: {formatCurrency(data.kpis.firstRiskGap || data.kpis.gapToday)}</span>
          </div>
        </RestoredSection>

        <RestoredSection
          eyebrow="Alerts & Recommendations"
          title="Жёсткие сигналы и действия для оператора"
          description="Система должна не просто показывать цифры, а подсказывать, где уже есть просадка."
        >
          <div className="row g-3">
            <div className="col-12 col-xl-6">
              <div className="analytics-surface analytics-restored-alert analytics-restored-card">
                <h3 className="analytics-restored-card-title">Жёсткие сигналы</h3>
                <ul className="analytics-restored-list">
                  {(data.insights?.alerts || []).map((item) => (
                    <li key={item.title}><strong>{item.title}</strong> — {item.description}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="col-12 col-xl-6">
              <div className="analytics-surface analytics-restored-warn analytics-restored-card">
                <h3 className="analytics-restored-card-title">Действия для оператора</h3>
                <ul className="analytics-restored-list">
                  {(data.priorityActions || []).slice(0, 5).map((item) => (
                    <li key={item.title}><strong>{item.title}</strong> — {item.description}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </RestoredSection>
      </>
    );
  }

  function renderTrafficTab() {
    return (
      <RestoredSection
        eyebrow="Трафик / Онлайн"
        title="Кто приходит в систему и доходит до цикла"
        description="Старая восстановленная версия трафика: короткий оперативный срез без перегруза."
      >
        <AnalyticsDataTable
          title="Онлайн по странам"
          subtitle="Кто сейчас на сайте и в кабинете."
          columns={[
            { key: "country", label: "Страна" },
            { key: "siteUsers", label: "На сайте", type: "number" },
            { key: "cabinetUsers", label: "В кабинете", type: "number" },
            { key: "sessions", label: "Сессии", type: "number" },
            { key: "wallets", label: "Кошельки", type: "number" },
          ]}
          rows={trafficCountryRows}
        />
      </RestoredSection>
    );
  }

  function renderProductsTab() {
    return (
      <RestoredSection
        eyebrow="Продукты / Циклы"
        title="Lockup и Daily Flow"
        description="Сначала Lockup, потом Daily. Только аналитика: деньги, нагрузка и риск."
      >
        <div className="row g-3">
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Lockup тарифы"
              subtitle="Тарифы с возвратом тела."
              columns={[
                { key: "tariff", label: "Тариф" },
                { key: "inflow", label: "Входящий поток", type: "currency" },
                { key: "orders", label: "Ордера", type: "number" },
                { key: "claimable", label: "Клейм сейчас", type: "currency" },
                { key: "obligations30d", label: "Обязательства 30д", type: "currency" },
                { key: "riskDate", label: "Дата риска" },
              ]}
              rows={groupedProductRows.lockup}
            />
          </div>
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Daily Flow тарифы"
              subtitle="Тарифы без возврата тела в конце."
              columns={[
                { key: "tariff", label: "Тариф" },
                { key: "inflow", label: "Входящий поток", type: "currency" },
                { key: "orders", label: "Ордера", type: "number" },
                { key: "claimable", label: "Клейм сейчас", type: "currency" },
                { key: "obligations30d", label: "Обязательства 30д", type: "currency" },
                { key: "riskDate", label: "Дата риска" },
              ]}
              rows={groupedProductRows.daily}
            />
          </div>
        </div>
      </RestoredSection>
    );
  }

  function renderWalletsTab() {
    return (
      <RestoredSection
        eyebrow="Wallets & Structure"
        title="Кошельки и структура системы"
        description="Главные кошельки, их приток, будущая нагрузка и вклад в устойчивость системы."
      >
        <div className="row g-3">
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Кошельки"
              subtitle="Top wallets по притоку и обязательствам."
              columns={[
                { key: "wallet", label: "Кошелёк" },
                { key: "role", label: "Роль" },
                { key: "inflow", label: "Inflow", type: "currency" },
                { key: "obligations", label: "Obligations", type: "currency" },
                { key: "riskScore", label: "Risk", type: "percent" },
              ]}
              rows={walletRows}
            />
          </div>
          <div className="col-12 col-xl-6">
            <AnalyticsDataTable
              title="Структура"
              subtitle="Партнёрские ветки и реферальная нагрузка."
              columns={[
                { key: "branch", label: "Ветка" },
                { key: "leader", label: "Лидер" },
                { key: "inflow", label: "Inflow", type: "currency" },
                { key: "referralAccrual", label: "Начислено", type: "currency" },
                { key: "obligations", label: "Obligations", type: "currency" },
              ]}
              rows={partnerRows}
            />
          </div>
        </div>
      </RestoredSection>
    );
  }

  function renderPartnerTab() {
    return (
      <RestoredSection
        eyebrow="Alerts & Recommendations"
        title="Партнёрские ветки и рекомендации"
        description="Какие ветки дают деньги, а какие создают лишнюю нагрузку."
      >
        <AnalyticsDataTable
          title="Партнёрская структура"
          subtitle="Короткий срез по inflow, начислениям и structural leak."
          columns={[
            { key: "branch", label: "Ветка" },
            { key: "leader", label: "Лидер" },
            { key: "inflow", label: "Inflow", type: "currency" },
            { key: "referralAccrual", label: "Начислено", type: "currency" },
            { key: "leaderDependency", label: "Зависимость", type: "percent" },
            { key: "structuralLeak", label: "Leak", type: "percent" },
          ]}
          rows={partnerRows}
        />
      </RestoredSection>
    );
  }

  function renderGeographyTab() {
    return (
      <RestoredSection
        eyebrow="География"
        title="Страны, пользователи и денежный поток"
        description="Какие страны дают объём, а какие накапливают риск."
      >
        <AnalyticsDataTable
          title="Страны"
          subtitle="Users, wallets, inflow и obligations по странам."
          columns={[
            { key: "country", label: "Страна" },
            { key: "users", label: "Users", type: "number" },
            { key: "wallets", label: "Wallets", type: "number" },
            { key: "inflow", label: "Inflow", type: "currency" },
            { key: "obligations", label: "Obligations", type: "currency" },
          ]}
          rows={geographyRows}
        />
      </RestoredSection>
    );
  }

  function renderActiveTab() {
    if (activeTab === "traffic") return renderTrafficTab();
    if (activeTab === "products") return renderProductsTab();
    if (activeTab === "wallets") return renderWalletsTab();
    if (activeTab === "partner") return renderPartnerTab();
    if (activeTab === "geography") return renderGeographyTab();
    return renderOverviewTab();
  }

  return (
    <main className="analytics-layout analytics-restored-layout container-fluid py-4 px-3 px-xl-4">
      <section className="analytics-surface analytics-restored-hero">
        <div className="analytics-restored-hero-top">
          <div>
            <p className="analytics-kicker">Analytics / Web3 Admin</p>
            <h1 className="analytics-restored-title">
              Модуль аналитики для управления входящими деньгами, обязательствами и структурой системы
            </h1>
            <p className="analytics-restored-lead">
              Главная задача модуля: каждый день показывать, сколько денег уже вошло в систему, сколько денег потребуется на ближайшие выплаты и какой новый приток нужно обеспечить, чтобы не допустить просадки по циклам, партнёрке и комиссии платформы.
            </p>
          </div>
          <div className="analytics-restored-hero-actions">
            <AnalyticsDateTime />
            <button type="button" className="btn analytics-board-btn" onClick={() => setIsBoardOpen((current) => !current)}>
              {isBoardOpen ? "Скрыть доску" : "Открыть доску"}
            </button>
          </div>
        </div>
      </section>

      {isBoardOpen ? (
        <section className="analytics-board-embed mt-4">
          <section className="analytics-surface analytics-board-embed-panel">
            <div className="analytics-board-embed-head">
              <div>
                <span className="analytics-kicker">Доска задач</span>
                <h2 className="analytics-idea-title">Наша доска внутри аналитики</h2>
                <p className="analytics-page-subtitle mb-0">
                  Здесь можно сразу смотреть backlog и текущие задачи по аналитике, не уходя с экрана.
                </p>
              </div>
              <a className="btn analytics-board-btn" href={ANALYTICS_BOARD_URL} target="_blank" rel="noreferrer">
                Открыть отдельно
              </a>
            </div>
            <div className="analytics-board-frame-wrap">
              <iframe className="analytics-board-frame" src={ANALYTICS_BOARD_URL} title="Доска аналитики" />
            </div>
          </section>
        </section>
      ) : null}

      <section className="analytics-surface analytics-restored-tabs mt-4">
        <div className="analytics-restored-tabs-row">
          {restoredTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`analytics-restored-tab${activeTab === tab.id ? " analytics-restored-tab-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {renderActiveTab()}
    </main>
  );
}

export default AnalyticsRestoredPage;
