import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readOrEmpty(file) {
  return readFile(file, "utf8").catch(() => "");
}

const [header, page, panel, registry, board, styles, analyticsStyles, packageJson] = await Promise.all([
  readOrEmpty("src/modules/analytics/components/AnalyticsHeader.jsx"),
  readOrEmpty("src/modules/analytics/AnalyticsPage.jsx"),
  readOrEmpty("src/modules/analytics/components/AnalyticsMainPanel.jsx"),
  readOrEmpty("src/modules/analytics/components/LaunchBoardRegistry.jsx"),
  readOrEmpty("src/modules/analytics/components/TablesBoard.jsx"),
  readOrEmpty("src/modules/analytics/styles/tables.css"),
  readOrEmpty("src/modules/analytics/styles/analytics.css"),
  readOrEmpty("package.json"),
]);

const checks = [
  [header.includes("onTablesOpen") && header.includes('label="Таблицы"'), "header tool missing"],
  [header.includes("TableProperties") && header.includes("analytics-header-tables-button"), "header icon/accent hook missing"],
  [page.includes('tables: "tables"') && page.includes('handleMainTabChange("tables")'), "route mapping missing"],
  [panel.includes('activeTab === "tables"') && panel.includes("<TablesBoard />"), "standalone board missing"],
  [registry.includes('boardId === "tables"') && registry.includes('return "tables"'), "direct route missing"],
  [board.includes("Рост системы") && board.includes("План ликвидности") && board.includes("Прогноз GPT"), "table tabs missing"],
  [board.includes("SOURCE_SHEET_URL") && board.includes("Исходная Google-таблица"), "source link missing"],
  [board.includes("Режим просмотра") && board.includes("Режим редактирования"), "read/edit control missing"],
  [board.includes("Добавить строку") && board.includes("Добавить колонку"), "row/column controls missing"],
  [board.includes("Сохранено на сервере") && board.includes("Есть несохранённые изменения"), "save-state feedback missing"],
  [board.includes("Восстановить черновик") && board.includes("Оставить версию сервера"), "draft recovery missing"],
  [board.includes("Экспорт CSV") && board.includes("Резервная копия JSON"), "exports missing"],
  [board.includes('<table className="tables-grid"') && board.includes("<thead>") && board.includes("<tbody>"), "semantic grid missing"],
  [styles.includes(".tables-board") && styles.includes("overflow-x: auto") && styles.includes("position: sticky"), "responsive grid styles missing"],
  [analyticsStyles.includes(".analytics-header-tables-button"), "header table accent missing"],
  [page.includes('activeTab === "tables" ? " analytics-layout-tables"') && analyticsStyles.includes(".analytics-layout-tables") && analyticsStyles.includes("overflow-x: hidden"), "tables page overflow guard missing"],
  [JSON.parse(packageJson).scripts?.["test:tables"], "test:tables script missing"],
];

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);
assert.deepEqual(failures, [], `Tables integration incomplete: ${failures.join(", ")}`);

console.log("SuperSus tables navigation and UI contracts verified.");
