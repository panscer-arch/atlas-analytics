import { Fragment, useState } from "react";
import formatCurrency from "../utils/formatCurrency";
import AnalyticsIcon from "./AnalyticsIcon";
import AnalyticsPanelHeader from "./AnalyticsPanelHeader";

function AnalyticsTable({ rows }) {
  const [openGroups, setOpenGroups] = useState({ Lockup: false, "Daily Flow": false });

  function toggleGroup(source) {
    setOpenGroups((current) => ({
      ...current,
      [source]: !current[source],
    }));
  }

  return (
    <div className="analytics-surface analytics-breakdown-table">
      <AnalyticsPanelHeader
        subtitle="Сначала идёт общий поток по продукту, ниже открываются тарифы внутри него."
        title="Разложение по продуктам"
      />

      <div className="analytics-breakdown-note">Нажмите на строку продукта, чтобы открыть тарифы.</div>

      <div className="analytics-table-responsive analytics-breakdown-responsive">
        <table className="analytics-table analytics-breakdown-table-grid">
          <thead>
            <tr>
              <th>Продукт / тариф</th>
              <th>Входящий поток</th>
              <th>План</th>
              <th>Выплаты циклов</th>
              <th>Рефералка</th>
              <th>Комиссия</th>
              <th>Ваш остаток</th>
              <th>Разрыв</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={row.id}>
                <tr key={row.id} className="analytics-breakdown-parent-row">
                  <td className="analytics-breakdown-first-col">
                    <button type="button" className="analytics-breakdown-toggle" onClick={() => toggleGroup(row.source)}>
                      <span className={`analytics-products-badge analytics-products-badge-${row.source === "Lockup" ? "lockup" : "daily"}`}>{row.source}</span>
                      <strong>{row.source}</strong>
                      <span className="analytics-breakdown-toggle-copy">{openGroups[row.source] ? "Скрыть тарифы" : "Показать тарифы"}</span>
                      <span className={`analytics-breakdown-toggle-chevron${openGroups[row.source] ? " analytics-breakdown-toggle-chevron-open" : ""}`}>
                        <AnalyticsIcon name="tomorrow" />
                      </span>
                    </button>
                  </td>
                  <td>{formatCurrency(row.incomingAmount)}</td>
                  <td>{formatCurrency(row.planAmount)}</td>
                  <td>{formatCurrency(row.cyclePayouts)}</td>
                  <td>{formatCurrency(row.referralPayouts)}</td>
                  <td>{formatCurrency(row.platformFee)}</td>
                  <td>{formatCurrency(row.operatorNet)}</td>
                  <td>{formatCurrency(row.gap)}</td>
                </tr>
                {openGroups[row.source]
                  ? row.children.map((child) => (
                      <tr key={child.id} className="analytics-breakdown-child-row">
                        <td className="analytics-breakdown-first-col">
                          <div className="analytics-breakdown-child-name">
                            <span className="analytics-breakdown-child-dot" />
                            <span>{child.source}</span>
                          </div>
                        </td>
                        <td>{formatCurrency(child.incomingAmount)}</td>
                        <td>{formatCurrency(child.planAmount)}</td>
                        <td>{formatCurrency(child.cyclePayouts)}</td>
                        <td>{formatCurrency(child.referralPayouts)}</td>
                        <td>{formatCurrency(child.platformFee)}</td>
                        <td>{formatCurrency(child.operatorNet)}</td>
                        <td>{formatCurrency(child.gap)}</td>
                      </tr>
                    ))
                  : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AnalyticsTable;
