const GRID_TOKENS = {
  gap: new Set(["none", "sm", "md", "lg"]),
  columns: new Set(["one", "two", "three", "four", "auto"]),
  align: new Set(["stretch", "start", "center", "end"]),
};

const CELL_TOKENS = {
  span: new Set(["auto", "full", "half", "third", "quarter", "wide", "narrow"]),
  align: new Set(["stretch", "start", "center", "end"]),
};

function getToken(tokens, group, value, fallback) {
  return tokens[group].has(value) ? value : fallback;
}

function LayoutGrid({
  as: Element = "div",
  gap = "md",
  columns = "auto",
  align = "stretch",
  children,
}) {
  const gridClassName = [
    "analytics-layout-grid",
    `analytics-layout-grid-gap-${getToken(GRID_TOKENS, "gap", gap, "md")}`,
    `analytics-layout-grid-columns-${getToken(GRID_TOKENS, "columns", columns, "auto")}`,
    `analytics-layout-grid-align-${getToken(GRID_TOKENS, "align", align, "stretch")}`,
  ].join(" ");

  return <Element className={gridClassName}>{children}</Element>;
}

function LayoutCell({
  as: Element = "div",
  span = "auto",
  align = "stretch",
  children,
}) {
  const cellClassName = [
    "analytics-layout-cell",
    `analytics-layout-cell-span-${getToken(CELL_TOKENS, "span", span, "auto")}`,
    `analytics-layout-cell-align-${getToken(CELL_TOKENS, "align", align, "stretch")}`,
  ].join(" ");

  return <Element className={cellClassName}>{children}</Element>;
}

export { LayoutCell };
export default LayoutGrid;
