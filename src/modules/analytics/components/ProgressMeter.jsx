const PROGRESS_VARIANTS = new Set(["gauge", "summary"]);

function normalizeProgressValue(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.min(Math.max(numericValue, 0), 100);
}

function getVariant(value) {
  return PROGRESS_VARIANTS.has(value) ? value : "gauge";
}

function ProgressMeter({ value = 0, variant = "gauge", label = "Прогресс" }) {
  const progressValue = normalizeProgressValue(value);
  const variantToken = getVariant(variant);

  return (
    <div
      className={`analytics-progress-meter analytics-progress-meter-${variantToken}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(progressValue)}
    >
      <svg viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
        <rect className="analytics-progress-meter-track" x="0" y="0" width="100" height="4" rx="2" />
        <rect className="analytics-progress-meter-value" x="0" y="0" width={progressValue} height="4" rx="2" />
      </svg>
    </div>
  );
}

export default ProgressMeter;
