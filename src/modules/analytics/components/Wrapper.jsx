const GAP_VALUES = {
  none: "0",
  xs: "0.35rem",
  sm: "0.6rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
};

const PAD_VALUES = {
  none: "0",
  sm: "0.75rem",
  md: "1rem",
  lg: "1.5rem",
};

const MARGIN_TOP_VALUES = {
  none: "0",
  sm: "0.75rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
};

function Wrapper({
  as: Element = "div",
  dir = "column",
  gap = "none",
  padding = "none",
  marginTop = "none",
  align = "stretch",
  justify = "flex-start",
  wrap = false,
  children,
  id,
}) {
  const style = {
    display: "flex",
    flexDirection: dir === "row" ? "row" : "column",
    gap: GAP_VALUES[gap] || gap,
    padding: PAD_VALUES[padding] || padding,
    marginTop: MARGIN_TOP_VALUES[marginTop] || marginTop,
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? "wrap" : "nowrap",
  };

  return (
    <Element id={id} style={style}>
      {children}
    </Element>
  );
}

export default Wrapper;
