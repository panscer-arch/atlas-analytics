export const forecastHorizons = Object.freeze([
  ["24h", "24 часа"],
  ["7d", "7 дней"],
  ["30d", "30 дней"],
  ["90d", "90 дней"],
]);

const presentations = Object.freeze({
  committed: Object.freeze({
    scenario: "committed",
    selectorLabel: "Committed · известные обязательства",
    metricLabel: "Подтверждённые обязательства",
    methodology: "Только существующие циклы и детерминированные выплаты из проверенного snapshot. Неподтверждённый будущий приток не учитывается.",
  }),
  stress: Object.freeze({
    scenario: "stress",
    selectorLabel: "Stress · maximum exposure",
    metricLabel: "Максимальная нагрузка",
    methodology: "Ранний claim всех eligible-сумм, без гипотетического неподтверждённого притока.",
  }),
});

export function forecastScenarioForSource(apiEnabled) {
  return apiEnabled ? "committed" : "stress";
}

export function getForecastPresentation(scenario) {
  const presentation = presentations[scenario];
  if (!presentation) throw new Error(`Unsupported forecast scenario: ${scenario}`);
  return presentation;
}
