import { createRequire } from "node:module";
import fs from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH
  || "/Users/digitex/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const baseUrl = process.env.SUPERSUS_LOCAL_URL || "http://127.0.0.1:3036";
const outputDir = process.env.SUPERSUS_QA_OUTPUT || "/tmp/supersus-dashboard-qa";

function dayKey(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

const today = dayKey(new Date());
const yesterday = dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

const cycleStats = {
  productionTotals: { total: 1969, open: 1652, closed: 317, claimable: 263, totalVolume: "677789.787", openVolume: "570147.915", claimableNow: "10377.263699", remainingLoad: "914394.090265", next7DaysLoad: "82642.5941", next30DaysLoad: "469642.565288" },
  byTerm: [
    { contractId: "lockup-flow", contractName: "Lockup Flow", tierName: "Launch", termLabel: "1 день", total: 421, open: 310, closed: 111, claimable: 34, totalVolume: "90500", claimableNow: "1200", remainingLoad: "114000", next30DaysLoad: "48000" },
    { contractId: "daily-flow-v2", contractName: "Daily Flow V2", tierName: "Core", termLabel: "200 дней", total: 1548, open: 1342, closed: 206, claimable: 229, totalVolume: "587289.787", claimableNow: "9177.263699", remainingLoad: "800394.090265", next30DaysLoad: "421642.565288" },
  ],
};

const fixture = {
  ok: true,
  network: { name: "BNB Smart Chain", chainId: 56 },
  source: "BscScan tx list + BNB Chain receipts; cycle totals verified with nextOrderId/getOrder",
  updatedAt: "2026-08-14T08:30:00.000Z",
  totals: { provided: "678819.787", claimed: "131239.670682", fee: "2514.199853", partnerDelta: "433597.179386", remaining: "545065.916464", receipts: 3040, lockedEvents: 2072, claimedEvents: 1305 },
  participants: { uniqueTotal: 894, uniqueOpen: 731, uniqueClosed: 244, uniqueClaimable: 176, repeatParticipants: 412, newParticipantsToday: 19, byDay: [
    { date: yesterday, cycleActivations: 42, activeParticipants: 35, newParticipants: 21 },
    { date: today, cycleActivations: 31, activeParticipants: 27, newParticipants: 19 },
  ] },
  cycleStats,
  contracts: [
    { id: "lockup-flow", name: "Lockup Flow", provided: "245000", claimed: "62100", fee: "810", partnerDelta: "146000", remaining: "182090" },
    { id: "daily-flow-v2", name: "Daily Flow V2", provided: "433819.787", claimed: "69139.670682", fee: "1704.199853", partnerDelta: "287597.179386", remaining: "362975.916464" },
  ],
  daily: [
    { date: yesterday, provided: "10500", claimed: "1880", fee: "145", partnerDelta: "3400", lockedEvents: 42, claimedEvents: 29, contracts: {} },
    { date: today, provided: "11281.49", claimed: "1395.903323", fee: "131.395702", partnerDelta: "3622.57647", lockedEvents: 31, claimedEvents: 28, contracts: { "lockup-flow": { provided: "3200", claimed: "500", fee: "42", lockedEvents: 9 }, "daily-flow-v2": { provided: "8081.49", claimed: "895.903323", fee: "89.395702", lockedEvents: 22 } } },
  ],
  failures: [],
};

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: chromiumPath, chromiumSandbox: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
await page.route("**/api/contracts/atlas-flows", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) }));

try {
  await page.goto(`${baseUrl}/?board=dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.getByText("BNB Chain подключён", { exact: true }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(700);
  const tabLabels = await page.locator(".analytics-tabs-panel").first().locator("button").allTextContents();
  const expectedTabs = ["Дашборд", "Маркетинг", "Аналитика", "Продукты", "Задачи", "Контент"];
  if (JSON.stringify(tabLabels) !== JSON.stringify(expectedTabs)) throw new Error(`Unexpected main tabs: ${JSON.stringify(tabLabels)}`);

  for (const label of ["Сессия", "Гермес", "Расходы"]) {
    const button = page.getByRole("button", { name: label });
    await button.waitFor();
    const box = await button.boundingBox();
    if (!box || box.width < 48 || box.height < 48) throw new Error(`${label} icon is too small.`);
  }

  await page.getByRole("button", { name: "Сессия" }).click();
  await page.getByText("Очередь задач", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Гермес" }).click();
  await page.getByText("Личный помощник Atlas", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Расходы" }).click();
  await page.getByText("Центр расходов", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Дашборд", exact: true }).click();

  await page.locator(".analytics-tabs-panel").first().getByRole("button", { name: "Маркетинг", exact: true }).click();
  await page.getByRole("button", { name: /Листинги/ }).click();
  await page.getByText("PARTNERS CRM", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Дашборд", exact: true }).click();

  await page.locator(".analytics-tabs-panel").first().getByRole("button", { name: "Продукты", exact: true }).click();
  for (const label of ["Реестр", "Библиотека", "Разработки"]) {
    await page.getByText(label, { exact: true }).waitFor();
  }
  await page.getByRole("button", { name: "Дашборд", exact: true }).click();

  await page.screenshot({ path: `${outputDir}/dashboard.png`, fullPage: true });
  await page.getByRole("button", { name: "Аналитика", exact: true }).click();
  await page.getByRole("button", { name: /Трафик \/ Онлайн/ }).click();
  await page.getByText("Участники и циклы, подтверждённые контрактами", { exact: true }).waitFor();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${outputDir}/analytics-traffic.png`, fullPage: true });
  const analyticsTabs = page.locator(".analytics-tabs-panel").nth(1);
  for (const label of ["Продукты / Циклы", "Реинвест", "Состав базы", "Лидеры", "География", "Партнёрская структура", "Кошельки", "Контракты", "Обзор", "Дашборд"]) {
    await analyticsTabs.getByText(label, { exact: true }).click();
    await page.waitForTimeout(80);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/?board=dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.getByText("BNB Chain подключён", { exact: true }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${outputDir}/dashboard-mobile.png`, fullPage: true });
  if (pageErrors.length) throw new Error(`Browser errors: ${pageErrors.join(" | ")}`);
  console.log(`Dashboard shell verified. Screenshots: ${outputDir}`);
} finally {
  await browser.close();
}
