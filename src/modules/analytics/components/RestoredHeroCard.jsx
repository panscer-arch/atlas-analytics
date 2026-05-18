function RestoredHeroCard({ title, value, hint }) {
  return (
    <div className="analytics-surface analytics-restored-hero-card">
      <div className="analytics-restored-hero-label">{title}</div>
      <div className="analytics-restored-hero-value">{value}</div>
      <div className="analytics-restored-hero-hint">{hint}</div>
    </div>
  );
}

export default RestoredHeroCard;
