import { useEffect, useState } from "react";
import AnalyticsIcon from "./AnalyticsIcon";

function AnalyticsCollapsibleSection({
  kicker,
  title,
  subtitle = "",
  defaultOpen = false,
  children,
  className = "mt-4",
  sectionId,
  openSignal,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (openSignal) {
      setIsOpen(true);
    }
  }, [openSignal]);

  return (
    <section className={className} id={sectionId}>
      <button
        type="button"
        className={`analytics-collapse-toggle${isOpen ? " analytics-collapse-toggle-open" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <div className="analytics-collapse-copy">
          <span className="analytics-kicker">{kicker}</span>
          <h2 className="mb-0">{title}</h2>
          {subtitle ? <div className="analytics-collapse-subtitle">{subtitle}</div> : null}
        </div>
        <div className="analytics-collapse-meta">
          <span className="analytics-collapse-cta">{isOpen ? "Свернуть" : "Развернуть"}</span>
          <span className={`analytics-collapse-chevron${isOpen ? " analytics-collapse-chevron-open" : ""}`}>
            <AnalyticsIcon name="tomorrow" className="analytics-inline-icon" />
          </span>
        </div>
      </button>

      {isOpen ? <div className="analytics-collapse-body">{children}</div> : null}
    </section>
  );
}

export default AnalyticsCollapsibleSection;
