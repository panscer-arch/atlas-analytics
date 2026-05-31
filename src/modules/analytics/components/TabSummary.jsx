function TabSummary({ kicker, title, description, bullets = [] }) {
  return (
    <section className="analytics-surface analytics-tab-summary">
      <div className="analytics-kicker">{kicker}</div>
      <div className="analytics-tab-summary-title">{title}</div>
      <div className="analytics-tab-summary-copy">{description}</div>
      {bullets.length ? (
        <div className="analytics-tab-summary-points">
          {bullets.map((item, index) => (
            <div key={typeof item === "string" ? item : index} className="analytics-tab-summary-point">
              <span className="analytics-executive-point-glyph">•</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default TabSummary;
