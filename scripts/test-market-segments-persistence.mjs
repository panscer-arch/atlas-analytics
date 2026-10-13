import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Exercise the loader used by both local storage and the server response.
const source = await readFile(new URL("../src/modules/analytics/components/MarketSegmentsPanel.jsx", import.meta.url), "utf8");
const loaderSource = source.slice(source.indexOf("const STATUS_OPTIONS"), source.indexOf("function readStoredSegments"));
const hydrate = vm.runInNewContext(`${loaderSource}\nhydrateSegments`);
const seed = [{ id: "seed", direction: "Исходное направление", atlasFit: "Высокая", status: "Запас" }];
const saved = [
  { id: "seed", direction: "Изменённое направление", atlasFit: "Средняя", deleted: true },
  { id: "research", direction: "Контактёрство и энергопрактики", atlasFit: "Не оценивается: исследование контента", status: "Запас" },
];

const loaded = hydrate(JSON.parse(JSON.stringify(saved)), seed);
assert.equal(loaded.length, 2, "Loading must preserve every saved row");
assert.equal(loaded.find(row => row.id === "research")?.atlasFit, "Не оценивается: исследование контента", "Custom fit must survive loading");
assert.equal(loaded.find(row => row.id === "seed")?.direction, "Изменённое направление", "Edited seed row must not revert");
assert.equal(loaded.find(row => row.id === "seed")?.deleted, true, "Deleted seed row must not reappear");
assert.equal(loaded.find(row => row.id === "seed")?.status, "Запас", "Missing saved fields inherit seed defaults");
const reloaded = hydrate(JSON.parse(JSON.stringify(loaded)), seed);
assert.deepEqual(JSON.parse(JSON.stringify(reloaded)), JSON.parse(JSON.stringify(loaded)), "Save/reload must preserve rows");
assert.equal(hydrate([{ id: "custom", atlasFit: "Низкая" }], seed).length, 2, "Missing seed rows remain available");
assert.equal(hydrate(null, seed), seed);
console.log("Market segments persistence regression passed.");
