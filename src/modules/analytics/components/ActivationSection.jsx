import AnalyticsCollapsibleSection from "./AnalyticsCollapsibleSection";
import AnalyticsDataTable from "./AnalyticsDataTable";

const ACTIVATION_TOTAL_COLUMNS = [
  { key: "period", label: "Период" },
  { key: "registrations", label: "Регистрации", type: "number" },
  { key: "walletConnects", label: "Подключили кошелёк", type: "number" },
  { key: "walletConnectRate", label: "Connect rate", type: "percent" },
  { key: "cycleActivations", label: "Активировали цикл", type: "number" },
  { key: "cycleActivationRate", label: "Cycle rate", type: "percent" },
];

const ACTIVATION_DAILY_COLUMNS = [
  { key: "date", label: "Дата" },
  { key: "registrations", label: "Регистрации", type: "number" },
  { key: "walletConnects", label: "Подключили кошелёк", type: "number" },
  { key: "walletConnectRate", label: "Connect rate", type: "percent" },
  { key: "cycleActivations", label: "Активировали цикл", type: "number" },
  { key: "cycleActivationRate", label: "Cycle rate", type: "percent" },
];

function ActivationSection({
  period,
  periodOptions,
  totals,
  rows,
  page,
  totalPages,
  marginTop = "lg",
  onPeriodChange,
  onPageChange,
}) {
  return (
    <AnalyticsCollapsibleSection
      kicker="Активация"
      title="Посмотреть активацию пользователей"
      subtitle="Регистрации, подключение кошелька и запуск цикла по выбранному периоду."
      defaultOpen={false}
      marginTop={marginTop}
    >
      <div className="row g-3">
        <div className="col-12">
          <AnalyticsDataTable
            title="Итог по выбранному периоду"
            subtitle="Сводно по регистрации, подключению кошелька и активации цикла."
            columns={ACTIVATION_TOTAL_COLUMNS}
            rows={totals}
            headerActions={
              <label className="analytics-inline-filter">
                <span>Период</span>
                <select className="form-select analytics-inline-select" value={period} onChange={(event) => onPeriodChange(event.target.value)}>
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            }
          />
        </div>
        <div className="col-12">
          <AnalyticsDataTable
            title="Активация по дням"
            subtitle="Главы и названия столбцов остаются видны, а детали можно листать по страницам."
            columns={ACTIVATION_DAILY_COLUMNS}
            rows={rows}
            footer={
              <div className="analytics-pagination">
                <span className="analytics-pagination-copy">
                  Страница {page} из {totalPages}
                </span>
                <div className="analytics-pagination-controls">
                  <button type="button" className="btn analytics-pagination-btn" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
                    Назад
                  </button>
                  <button type="button" className="btn analytics-pagination-btn" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
                    Вперёд
                  </button>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </AnalyticsCollapsibleSection>
  );
}

export default ActivationSection;
