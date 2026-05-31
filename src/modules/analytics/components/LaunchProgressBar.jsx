function LaunchProgressBar({ value = 0 }) {
  const normalizedValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <progress className="analytics-launch-progress-bar" value={normalizedValue} max="100" aria-label={`Прогресс ${normalizedValue.toFixed(0)}%`}>
      {normalizedValue.toFixed(0)}%
    </progress>
  );
}

export default LaunchProgressBar;
