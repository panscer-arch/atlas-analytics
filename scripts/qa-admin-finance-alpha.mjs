import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const baseUrl = process.env.ATLAS_ADMIN_FINANCE_QA_URL || "http://127.0.0.1:4187";
const outputDirectory = new URL("../artifacts/admin-finance-alpha/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  const results = [];
  for (const route of ["reconciliation", "flows", "liquidity", "cycles", "claims"]) {
    const responses = [];
    const listener = (response) => {
      if (response.url().includes("/api/admin/v1")) responses.push(response.status());
    };
    page.on("response", listener);
    await page.goto(`${baseUrl}/admin/${route}`, { waitUntil: "networkidle", timeout: 60000 });
    page.off("response", listener);
    const body = await page.locator("body").innerText();
    results.push({
      route,
      navigationItems: await page.locator(".af-nav a").count(),
      apiBoundary: await page.locator(".af-api-boundary").count(),
      sourceError: await page.locator(".af-source-card.is-error,.af-source-card.is-auth").count(),
      demoClaim: /DEMO SNAPSHOT|DEMO TARGET|Демонстрационный запуск|Демонстрационная модель/.test(body),
      responseStatuses: responses,
    });
    if (route === "reconciliation" || route === "liquidity") {
      await page.screenshot({ path: fileURLToPath(new URL(`${route}-desktop-final.png`, outputDirectory)), fullPage: true });
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/admin/liquidity`, { waitUntil: "networkidle", timeout: 60000 });
  const mobile = await page.evaluate(() => {
    const table = document.querySelector(".af-alpha-balances table");
    const scroller = document.querySelector(".af-alpha-balances .af-table-scroll");
    return {
      pageScrollWidth: document.documentElement.scrollWidth,
      pageClientWidth: document.documentElement.clientWidth,
      tableScrollWidth: table?.scrollWidth || 0,
      tableContainerWidth: scroller?.clientWidth || 0,
    };
  });
  await page.screenshot({ path: fileURLToPath(new URL("liquidity-mobile-final.png", outputDirectory)), fullPage: true });

  await page.goto(`${baseUrl}/admin/reconciliation`, { waitUntil: "networkidle", timeout: 60000 });
  const reconciliationMobile = await page.evaluate(() => {
    const table = document.querySelector(".af-data-coverage table");
    const scroller = document.querySelector(".af-data-coverage .af-table-scroll");
    return {
      pageScrollWidth: document.documentElement.scrollWidth,
      pageClientWidth: document.documentElement.clientWidth,
      tableWidth: table?.scrollWidth || 0,
      scrollerWidth: scroller?.clientWidth || 0,
      scrollerContentWidth: scroller?.scrollWidth || 0,
    };
  });
  await page.screenshot({ path: fileURLToPath(new URL("reconciliation-mobile-final.png", outputDirectory)), fullPage: true });

  for (const result of results) {
    assert.equal(result.navigationItems, 5, `${result.route}: MVP navigation must expose five routes`);
    assert.equal(result.apiBoundary, 0, `${result.route}: API fail-closed boundary is visible`);
    assert.equal(result.sourceError, 0, `${result.route}: source error is visible`);
    assert.equal(result.demoClaim, false, `${result.route}: visible demo claim leaked into Alpha mode`);
    assert(result.responseStatuses.length > 0 && result.responseStatuses.every((status) => status === 200), `${result.route}: an Admin API request failed`);
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  assert(mobile.pageScrollWidth <= mobile.pageClientWidth + 1, "Mobile page has horizontal overflow");
  assert(mobile.tableScrollWidth <= mobile.tableContainerWidth + 1, "Mobile balance register must not hide values behind horizontal scrolling");
  assert(reconciliationMobile.pageScrollWidth <= reconciliationMobile.pageClientWidth + 1, "Mobile reconciliation page has horizontal overflow");
  assert(reconciliationMobile.tableWidth > reconciliationMobile.scrollerWidth, "Mobile data coverage table must preserve readable columns");
  assert(reconciliationMobile.scrollerContentWidth >= reconciliationMobile.tableWidth, "Mobile data coverage table must scroll inside its panel");

  console.log(JSON.stringify({ routes: results, mobile, reconciliationMobile, errors }, null, 2));
} finally {
  await browser.close();
}
