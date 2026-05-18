const WRAPPER_TOKENS = {
  dir: new Set(["row", "column"]),
  gap: new Set(["none", "xs", "sm", "md", "lg", "xl"]),
  padding: new Set(["none", "sm", "md", "lg"]),
  marginTop: new Set(["none", "sm", "md", "lg", "xl"]),
  align: new Set(["stretch", "start", "center", "end"]),
  justify: new Set(["start", "center", "end", "between"]),
};

function getToken(group, value, fallback) {
  return WRAPPER_TOKENS[group].has(value) ? value : fallback;
}

function Wrapper({
  as: Element = "div",
  dir = "column",
  gap = "none",
  padding = "none",
  marginTop = "none",
  align = "stretch",
  justify = "start",
  wrap = false,
  children,
  id,
}) {
  const wrapperClassName = [
    "analytics-wrapper",
    `analytics-wrapper-dir-${getToken("dir", dir, "column")}`,
    `analytics-wrapper-gap-${getToken("gap", gap, "none")}`,
    `analytics-wrapper-padding-${getToken("padding", padding, "none")}`,
    `analytics-wrapper-mt-${getToken("marginTop", marginTop, "none")}`,
    `analytics-wrapper-align-${getToken("align", align, "stretch")}`,
    `analytics-wrapper-justify-${getToken("justify", justify, "start")}`,
    wrap ? "analytics-wrapper-wrap" : "analytics-wrapper-nowrap",
  ].join(" ");

  return (
    <Element id={id} className={wrapperClassName}>
      {children}
    </Element>
  );
}

export default Wrapper;
