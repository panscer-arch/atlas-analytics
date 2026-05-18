function DashboardMiniTable({ columns = [], getRowKey, rows = [] }) {
  return (
    <table className="analytics-dashboard-mini-table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={getRowKey ? getRowKey(row, rowIndex) : rowIndex}>
            {columns.map((column) => (
              <td key={column.key}>
                {column.render ? column.render(row, rowIndex) : row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default DashboardMiniTable;
