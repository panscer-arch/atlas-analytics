import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist-admin-finance-staging");
const html = await readFile(resolve(output, "admin-finance.html"), "utf8");
const assetNames = await readdir(resolve(output, "assets"));
const jsNames = assetNames.filter((name) => name.endsWith(".js"));

assert(jsNames.length > 0, "Admin Finance staging build has no JavaScript asset");
assert(!html.includes("/src/main.jsx"), "Generic application entry leaked into staging HTML");
assert(!html.includes("figmacapture"), "Figma capture script must not ship in staging HTML");
assert(html.includes('meta name="robots" content="noindex, nofollow, noarchive"'));

const javascript = (await Promise.all(
  jsNames.map((name) => readFile(resolve(output, "assets", name), "utf8")),
)).join("\n");

for (const forbidden of [
  "simulation layer",
  "access node",
  "Неверный пароль",
  "Сервер сохранения недоступен",
  "supersus-access",
  "Доход компании",
  "Участники и лидеры",
  "Кампании и когорты",
  "Контроль рисков",
  "atlas-money-flows",
  "atlas-cycles-",
  "atlas-claims-",
  "atlas-liquidity-",
  "DEMO TARGET",
  "Демонстрационный запуск",
  "af-write-action",
  "Экспорт",
]) {
  assert(!javascript.includes(forbidden), `Forbidden full/demo/write capability leaked into staging bundle: ${forbidden}`);
}

for (const section of ["Сверка данных", "Денежные потоки", "Ликвидность", "Циклы", "Заявки и выплаты"]) {
  assert(javascript.includes(section), `MVP section is missing from staging bundle: ${section}`);
}
assert(javascript.includes("INTERNAL ALPHA"), "MVP release marker is missing from staging bundle");
assert(javascript.includes("pushState"), "MVP navigation must preserve the pinned snapshot without full-page reloads");
assert(javascript.includes("asOfBlockHash"), "Block hash snapshot pin is missing from the MVP client");

console.log("Admin Finance dedicated staging build checks passed.");
