import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { buildForecastProjection } from "../server/admin-finance/forecast-input-contract.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = resolve(import.meta.dirname, "..");
const baseUrl = process.env.ATLAS_ADMIN_FINANCE_QA_URL || "http://127.0.0.1:4192";
const chromiumPath = process.env.ATLAS_ADMIN_FINANCE_CHROMIUM_PATH
  || "/Users/digitex/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const outputDirectory = process.env.ATLAS_ADMIN_FINANCE_QA_OUTPUT
  || resolve(tmpdir(), "atlas-admin-finance-forecast-qa");
await mkdir(outputDirectory, { recursive: true });

const input = JSON.parse(await readFile(resolve(root, "docs/admin-finance/fixtures/forecast-input.v1.valid.json"), "utf8"));
const projection = buildForecastProjection(input);
const requestId = "forecast-browser-qa";
const blockHash = projection.snapshot.asOfBlockHash;
const blockNumber = projection.snapshot.asOfBlockNumber;

const dataCoverageIds = ["cash_flows", "liquidity", "cycles", "claims", "payout_forecast", "reconciliation", "company_revenue"];
const alphaMeta = {
  apiVersion: "1.0.0-alpha",
  status: "internal_alpha_partial",
  gateZero: { closed: 0, total: 14 },
  capabilities: ["forecast"],
  dataCoverage: dataCoverageIds.map((id, index) => ({
    id,
    label: id,
    status: id === "payout_forecast" ? "partial" : "unavailable",
    source: id === "payout_forecast" ? "browser QA fixture" : "N/A",
    affectsRoutes: [id === "payout_forecast" ? "forecast" : "reconciliation"],
    blocker: "Browser QA fixture",
    nextAction: "Use a verified provider payload.",
    gateId: `G0-${String(index + 1).padStart(2, "0")}`,
    owner: "Finance",
  })),
  snapshot: {
    id: projection.snapshot.id,
    asOfBlockNumber: blockNumber,
    asOfBlockHash: blockHash,
    confirmations: 24,
    generatedAt: projection.snapshot.generatedAt,
    sourceStatus: "partial",
  },
};

function datasetMeta(from, to) {
  return {
    perimeter: "payout_contract",
    currency: projection.snapshot.openingLiquidity.symbol,
    from,
    to,
    asOfBlockNumber: blockNumber,
    asOfBlockHash: blockHash,
    finality: "finalized",
    freshnessSeconds: 0,
    partial: true,
    partialReasons: ["browser_qa_fixture"],
    sourceStatus: "partial",
    formulaVersion: projection.snapshot.modelVersion,
    rulesetVersion: projection.snapshot.reservePolicyVersion,
    reconciliationStatus: "unreconciled",
    requestId,
    generatedAt: projection.snapshot.generatedAt,
  };
}

const requestedScenarios = [];
const errors = [];
const browser = await chromium.launch({
  headless: true,
  executablePath: chromiumPath,
  chromiumSandbox: false,
  args: ["--no-first-run", "--disable-breakpad", "--disable-crash-reporter", "--disable-crashpad"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  await page.route("**/api/admin/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/meta")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(alphaMeta) });
      return;
    }
    if (url.pathname.endsWith("/forecast/snapshots/latest")) {
      requestedScenarios.push(url.searchParams.get("scenario"));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: projection.snapshot, meta: datasetMeta(projection.snapshot.asOf, projection.snapshot.horizonEnd) }),
      });
      return;
    }
    if (url.pathname.endsWith("/forecast/buckets")) {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const rows = projection.buckets.filter((row) => Date.parse(row.bucketEnd) > Date.parse(from) && Date.parse(row.bucketStart) < Date.parse(to));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: rows, meta: datasetMeta(from, to) }),
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "not_mocked" }) });
  });

  await page.goto(`${baseUrl}/admin/forecast`, { waitUntil: "networkidle", timeout: 60000 });
  const body = await page.locator("body").innerText();
  assert(body.includes("Committed · известные обязательства"));
  assert(body.includes("Подтверждённые обязательства · 24 часа"));
  assert(!body.includes("Максимальная нагрузка · 24 часа"));
  assert(requestedScenarios.length > 0);
  assert(requestedScenarios.every((scenario) => scenario === "committed"));
  assert.equal(await page.locator(".af-api-boundary").count(), 0);
  await page.screenshot({ path: resolve(outputDirectory, "forecast-api-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/admin/forecast`, { waitUntil: "networkidle", timeout: 60000 });
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert(overflow.scrollWidth <= overflow.clientWidth + 1, "Forecast API screen has mobile horizontal overflow");
  assert.equal(errors.length, 0, errors.join("\n"));
  await page.screenshot({ path: resolve(outputDirectory, "forecast-api-mobile.png"), fullPage: true });

  console.log(JSON.stringify({ requestedScenarios, overflow, errors }, null, 2));
} finally {
  await browser.close();
}
