import assert from "node:assert/strict";
import { defaultAtlasFunnel } from "../src/modules/analytics/data/atlasFunnelData.js";
import {
  buildAtlasFunnelMarkdown,
  calculateFunnelStats,
  calculateMetricRows,
  hydrateAtlasFunnel,
} from "../src/modules/analytics/utils/atlasFunnelUtils.js";

const funnel = hydrateAtlasFunnel(defaultAtlasFunnel);

assert.equal(funnel.stages.length, 6, "В карте должно быть 6 этапов");
assert.equal(funnel.sequence.length, 6, "В серии должно быть 6 сообщений");
assert.equal(funnel.segments.length, 4, "Должно быть 4 пользовательских маршрута");
assert.ok(funnel.stages.every((stage) => stage.event), "У каждого этапа должно быть событие аналитики");
assert.ok(funnel.sequence.every((item) => item.hook && item.body && item.cta), "Каждое сообщение должно иметь hook, содержание и CTA");
assert.ok(funnel.checklist.some((item) => item.gate === "Compliance"), "Launch gate должен содержать compliance-проверку");
assert.ok(funnel.checklist.some((item) => item.gate === "Analytics"), "Launch gate должен содержать проверку аналитики");

const stats = calculateFunnelStats({
  ...funnel,
  checklist: funnel.checklist.map((item, index) => ({ ...item, status: index === 0 ? "Готово" : item.status })),
});
assert.equal(stats.completedGates, 1);
assert.equal(stats.readiness, Math.round(100 / stats.requiredGates));

const metrics = calculateMetricRows([
  { id: "one", current: 100, target: 100 },
  { id: "two", current: 40, target: 35 },
  { id: "three", current: 20, target: 30 },
]);
assert.equal(metrics[1].conversion, 40);
assert.equal(metrics[2].conversion, 50);

const markdown = buildAtlasFunnelMarkdown(funnel);
assert.match(markdown, /# Atlas Web3 Start/);
assert.match(markdown, /## Карта воронки/);
assert.match(markdown, /## Launch gate/);
assert.doesNotMatch(markdown, /гарантированный доход/i);

console.log("Atlas funnel verification passed");
