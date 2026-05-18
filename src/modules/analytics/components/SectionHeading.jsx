function SectionHeading({ kicker, title }) {
  return (
    <div className="analytics-section-heading">
      <span className="analytics-kicker">{kicker}</span>
      <h2 className="mb-0">{title}</h2>
    </div>
  );
}

export default SectionHeading;
