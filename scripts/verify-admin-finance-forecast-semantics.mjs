import assert from "node:assert/strict";
import {
  forecastHorizons,
  forecastScenarioForSource,
  getForecastPresentation,
} from "../src/modules/admin-finance/data/forecastSemantics.js";

assert.deepEqual(forecastHorizons.map(([id]) => id), ["24h", "7d", "30d", "90d"]);
assert.equal(forecastScenarioForSource(false), "stress");
assert.equal(forecastScenarioForSource(true), "committed");

const committed = getForecastPresentation("committed");
assert.match(committed.selectorLabel, /Committed/);
assert.match(committed.metricLabel, /Подтверждённые/);
assert.match(committed.methodology, /Неподтверждённый будущий приток не учитывается/);

const stress = getForecastPresentation("stress");
assert.match(stress.selectorLabel, /Stress/);
assert.match(stress.metricLabel, /Максимальная нагрузка/);
assert.throws(() => getForecastPresentation("p50"), /Unsupported forecast scenario/);

console.log("Admin Finance forecast semantics: OK");
