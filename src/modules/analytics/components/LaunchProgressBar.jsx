function LaunchProgressBar({ value = 0 }) {
  const normalizedValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className="analytics-launch-progress-bar mt-3" aria-label={`Прогресс ${normalizedValue.toFixed(0)}%`}>
      <div className="analytics-launch-progress-fill" style={{ "--launch-progress": `${normalizedValue}%` }} />
    </div>
  );
}

export default LaunchProgressBar;
