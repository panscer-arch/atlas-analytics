import formatCurrency from "../utils/formatCurrency";
import formatNumber from "../utils/formatNumber";

const TABLE_VARIANTS = new Set(["default", "productsDaily"]);
const TABLE_DENSITIES = new Set(["default", "productsSummary"]);

function getToken(tokens, value, fallback) {
  return tokens.has(value) ? value : fallback;
}

function formatCell(value, type) {
  if (type === "currency") return formatCurrency(value);
  if (type === "number") return formatNumber(value);
  if (type === "percent") return `${Number(value || 0).toFixed(1)}%`;
  return value ?? "—";
}

function AnalyticsDataTable({
  title,
  subtitle,
  columns = [],
  rows = [],
  headerActions = null,
  footer = null,
  variant = "default",
  density = "default",
}) {
  const variantToken = getToken(TABLE_VARIANTS, variant, "default");
  const densityToken = getToken(TABLE_DENSITIES, density, "default");

  return (
    <div className={`analytics-surface analytics-data-table analytics-data-table-${variantToken}`}>
      <div className="analytics-data-table-head d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="chart-card-title mb-1">{title}</h3>
          {subtitle ? <p className="chart-card-subtitle mb-0">{subtitle}</p> : null}
        </div>
        {headerActions ? <div className="analytics-table-actions">{headerActions}</div> : null}
      </div>

      <div className="table-responsive">
        <table className={`table analytics-table align-middle mb-0 analytics-data-table-grid analytics-data-table-grid-${densityToken}`}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id || row.name || row.country || row.source || index}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : formatCell(row[column.key], column.type)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {footer ? <div className="analytics-table-footer">{footer}</div> : null}
    </div>
  );
}

export default AnalyticsDataTable;
