import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, process.env.ATLAS_ADMIN_FINANCE_BUILD_DIR || "dist-admin-finance-full-alpha");
const html = await readFile(resolve(output, "admin-finance.html"), "utf8");
const assetNames = await readdir(resolve(output, "assets"));
const jsNames = assetNames.filter((name) => name.endsWith(".js"));

assert(jsNames.length > 0, "Admin Finance full-alpha build has no JavaScript asset");
assert(html.includes('meta name="robots" content="noindex, nofollow, noarchive"'));

const javascript = (await Promise.all(
  jsNames.map((name) => readFile(resolve(output, "assets", name), "utf8")),
)).join("\n");

for (const section of [
  "Обзор",
  "Потоки",
  "Циклы",
  "Будущие обязательства",
  "Заявки и выплаты",
  "Участники",
  "Доход компании",
  "Головной аккаунт",
  "Ликвидность",
  "Кошельки и трафик",
  "Кампании",
  "Сверка данных",
  "Контроль рисков",
  "Методика и доступ",
]) {
  assert(javascript.includes(section), `Full-alpha section is missing: ${section}`);
}

assert(javascript.includes("ADMIN API · FAIL-CLOSED"), "Full-alpha build must keep the API fail-closed boundary");

console.log("Admin Finance full-alpha build checks passed.");
