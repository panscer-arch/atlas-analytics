import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const chromiumPath =
  "/Users/digitex/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const pageUrl = process.argv[2] || "http://127.0.0.1:3036/?board=utmBuilder";
const expectedPresetUrl =
  "https://atlas-system.io/smartcycle-1/?utm_source=bscscan&utm_medium=display&utm_campaign=smartcycle1_launch_aug2026&utm_content=header_text_v1";

const browser = await chromium.launch({
  headless: true,
  executablePath: chromiumPath,
  chromiumSandbox: false,
  args: ["--no-first-run", "--no-default-browser-check"],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  await page.goto(pageUrl, { waitUntil: "domcontentloaded" });
  await page.locator(".analytics-utm-builder").waitFor();

  assert.equal(new URL(page.url()).searchParams.get("board"), "utmBuilder");
  await page.getByText("Ссылка готова", { exact: true }).waitFor();
  await page.waitForFunction(() => {
    const state = document.querySelector(".analytics-utm-save-state");
    return state && !state.textContent.includes("Загрузка");
  });
  while (await page.locator(".analytics-utm-history-actions button").filter({ hasText: "Удалить" }).count()) {
    await page.locator(".analytics-utm-history-actions button").filter({ hasText: "Удалить" }).first().click();
    await page.getByText("Сохранено на сервере", { exact: true }).waitFor();
  }
  assert.equal(await page.locator(".analytics-utm-result output").innerText(), expectedPresetUrl);

  await page.locator(".analytics-utm-result-actions button").filter({ hasText: "Копировать" }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expectedPresetUrl);

  const campaignInput = page.locator(".analytics-utm-fields label").nth(3).locator("input");
  await campaignInput.fill("BscScan August Test");
  await page.getByText("Ссылка готова", { exact: true }).waitFor();
  assert.match(await page.locator(".analytics-utm-result output").innerText(), /utm_campaign=bscscan_august_test/);

  await page.getByText("BscScan · Smart Cycle 1", { exact: true }).click();
  await page.getByText("Сохранить в журнал", { exact: true }).click();
  await page.getByText("Сохранено на сервере", { exact: true }).waitFor();
  await page.locator(".analytics-utm-history-list article").waitFor();

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".analytics-utm-history-list article").waitFor();
  assert.equal(
    await page.locator(".analytics-utm-history-list article a").first().getAttribute("href"),
    expectedPresetUrl,
  );

  const importUrl =
    "https://atlas-system.io/smartcycle-1/?ref=partner-42&utm_source=bscscan&utm_medium=display&utm_campaign=august_test&utm_content=header_text_v2";
  await page.locator(".analytics-utm-import-row input").fill(importUrl);
  await page.getByText("Разобрать", { exact: true }).click();
  assert.equal(await page.locator(".analytics-utm-fields label").first().locator("input").inputValue(), "https://atlas-system.io/smartcycle-1/?ref=partner-42");
  assert.equal(await campaignInput.inputValue(), "august_test");

  const horizontalOverflow = await page.evaluate(() => {
    const panel = document.querySelector(".analytics-utm-builder");
    return panel.scrollWidth > panel.clientWidth + 1;
  });
  assert.equal(horizontalOverflow, false);

  console.log("UTM builder UI verification passed.");
} finally {
  await browser.close();
}
