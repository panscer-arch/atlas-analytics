import { useMemo, useState } from "react";
import AnalyticsDateTime from "./components/AnalyticsDateTime";
import EmptyState from "./components/EmptyState";
import LoadingState from "./components/LoadingState";
import RestoredActiveTab from "./components/RestoredAnalyticsTabs";
import RestoredBoardEmbed from "./components/RestoredBoardEmbed";
import RestoredTabsNav from "./components/RestoredTabsNav";
import Wrapper from "./components/Wrapper";
import useAnalyticsData from "./hooks/useAnalyticsData";
import "./styles/analytics.css";

const ANALYTICS_BOARD_URL = (import.meta.env.VITE_ANALYTICS_BOARD_URL || "/analytics-board/").trim() || "/analytics-board/";

const restoredTabs = [
  { id: "overview", label: "Обзор" },
  { id: "traffic", label: "Трафик" },
  { id: "products", label: "Продукты" },
  { id: "presentation", label: "Презентация" },
  { id: "wallets", label: "Кошельки" },
  { id: "partner", label: "Структура" },
  { id: "geography", label: "География" },
];

function AnalyticsRestoredPage() {
  const { data, isLoading } = useAnalyticsData();
  const [activeTab, setActiveTab] = useState("overview");
  const [isBoardOpen, setIsBoardOpen] = useState(false);
  const walletRows = data?.tabsData?.wallets?.rows || [];
  const partnerRows = data?.tabsData?.partner?.rows || [];
  const geographyRows = data?.tabsData?.geography?.rows || [];
  const trafficCountryRows = data?.tabsData?.traffic?.countries || [];
  const productRows = data?.tabsData?.products?.rows || [];

  const groupedProductRows = useMemo(() => {
    const lockup = productRows.filter((row) => row.source === "Lockup");
    const daily = productRows.filter((row) => row.source === "Daily Flow");
    return { lockup, daily };
  }, [productRows]);

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  return (
    <main className="analytics-layout analytics-restored-layout">
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
            <button type="button" className="analytics-board-btn" onClick={() => setIsBoardOpen((current) => !current)}>
              {isBoardOpen ? "Скрыть доску" : "Открыть доску"}
            </button>
          </div>
        </div>
      </section>

      {isBoardOpen ? (
        <Wrapper as="section" marginTop="lg">
          <RestoredBoardEmbed boardUrl={ANALYTICS_BOARD_URL} />
        </Wrapper>
      ) : null}

      <Wrapper as="section" marginTop="lg">
        <RestoredTabsNav activeTab={activeTab} tabs={restoredTabs} onChange={setActiveTab} />
      </Wrapper>

      <RestoredActiveTab
        activeTab={activeTab}
        data={data}
        geographyRows={geographyRows}
        groupedProductRows={groupedProductRows}
        partnerRows={partnerRows}
        trafficCountryRows={trafficCountryRows}
        walletRows={walletRows}
      />
    </main>
  );
}

export default AnalyticsRestoredPage;
