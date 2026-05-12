import AnalyticsDateTime from "./AnalyticsDateTime";

function AnalyticsHeader({ onOpenCharts, onToggleBoard, isBoardOpen }) {
  return (
    <div className="analytics-surface analytics-header d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
      <div>
        <span className="analytics-kicker">Админ-панель Web3</span>
        <h1 className="analytics-page-title mb-2">Аналитика</h1>
        <p className="analytics-page-subtitle mb-0">
          Входящий поток, выплаты, риск по обязательствам и структура кошельков в одном модуле.
        </p>
      </div>

      <div className="d-flex flex-column align-items-lg-end gap-2">
        <AnalyticsDateTime compact />
        <div className="d-flex flex-wrap justify-content-lg-end gap-2">
          <button type="button" className="btn analytics-board-btn" onClick={onToggleBoard}>
            {isBoardOpen ? "Скрыть доску" : "Открыть доску"}
          </button>
          <button type="button" className="btn analytics-export-btn" onClick={onOpenCharts}>
            Графики
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsHeader;
