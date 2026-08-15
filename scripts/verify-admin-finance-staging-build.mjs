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
]) {
  assert(!javascript.includes(forbidden), `Legacy access gateway leaked into staging bundle: ${forbidden}`);
}

assert(javascript.includes("Финансовый контроль"), "Admin Finance application is missing from staging bundle");
assert(javascript.includes("INTERNAL ALPHA"), "MVP release marker is missing from staging bundle");

console.log("Admin Finance dedicated staging build checks passed.");
