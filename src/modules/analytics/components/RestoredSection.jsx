function RestoredSection({ eyebrow, title, description, children }) {
  return (
    <section className="analytics-surface analytics-restored-section">
      <div className="analytics-restored-section-head">
        {eyebrow ? <div className="analytics-kicker">{eyebrow}</div> : null}
        <h2 className="analytics-restored-section-title">{title}</h2>
        {description ? <p className="analytics-restored-section-copy">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default RestoredSection;
