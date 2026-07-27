import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));

const url = args.url || "http://127.0.0.1:5173/?board=launchCalendar";
const chromiumPath = args.chromiumPath || "/Users/digitex/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const screenshotPath = args.screenshot || "";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: chromiumPath,
  chromiumSandbox: false,
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(url, { waitUntil: "networkidle" });

  assert((await page.getByText("Календарь запуска", { exact: true }).count()) > 0, "Calendar route did not render.");
  const eventEditor = page.locator(".launch-calendar-editor");
  const statusSelect = eventEditor.locator("select").nth(2);
  const titleInput = eventEditor.locator("input").first();
  const feed = page.locator(".launch-changes-feed");

  await statusSelect.selectOption("В работе");
  await page.waitForTimeout(80);
  assert((await feed.innerText()).includes("Статус: В работе"), "Status transition did not enter the change monitor.");
  assert((await feed.innerText()).includes("Черновик"), "Non-final status transition should not be queued for chat.");

  const feedCountBeforeTitleEdit = await page.locator(".launch-change-item").count();
  await titleInput.fill("Публичный старт: контроль открытия - тест");
  await page.waitForTimeout(80);
  assert(await page.locator(".launch-change-item").count() === feedCountBeforeTitleEdit, "Title edit created an unnecessary monitor entry.");

  await statusSelect.selectOption("Готово");
  await page.waitForTimeout(80);
  const completedText = await feed.innerText();
  assert(completedText.includes("Завершено: Публичный старт: контроль открытия - тест"), "Completed event did not create the correct monitor entry.");
  assert(completedText.includes("Готово для чата"), "Completed event was not queued for the future Telegram bot.");

  const statusFilter = page.locator(".launch-calendar-filters select").nth(2);
  await statusFilter.selectOption("Готово");
  assert(await page.getByText("Публичный старт: контроль открытия - тест", { exact: true }).isVisible(), "Status filter did not keep the completed event visible.");
  await statusFilter.selectOption("Все");

  await page.getByText("Новое изменение", { exact: true }).click();
  const changeEditor = page.locator(".launch-change-editor");
  await changeEditor.getByLabel("Что изменилось", { exact: true }).fill("Тестовая публикация для проверки монитора");
  await changeEditor.getByLabel("Короткая суть", { exact: true }).fill("Проверяем ручную запись в мониторе изменений.");
  await page.waitForTimeout(600);
  assert((await feed.innerText()).includes("Тестовая публикация для проверки монитора"), "Manual monitor entry was not shown.");

  await page.reload({ waitUntil: "networkidle" });
  assert((await page.locator(".launch-changes-feed").innerText()).includes("Тестовая публикация для проверки монитора"), "Monitor changes did not survive reload through local fallback.");
  assert(await page.locator(".launch-calendar-editor").locator("select").nth(2).inputValue() === "Готово", "Calendar event status did not survive reload through local fallback.");

  await page.getByText("Добавить событие", { exact: true }).click();
  const newEventEditor = page.locator(".launch-calendar-editor");
  await newEventEditor.locator("input").first().fill("Временное QA-событие");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByText("Удалить событие", { exact: true }).click();
  await page.waitForTimeout(80);
  assert(!(await page.locator("body").innerText()).includes("Временное QA-событие"), "Calendar event was not deleted.");
  await page.reload({ waitUntil: "networkidle" });
  assert(!(await page.locator("body").innerText()).includes("Временное QA-событие"), "Deleted calendar event returned after reload.");

  if (screenshotPath) {
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
  }

  console.log("OK launch calendar: status automation, manual monitor entry, persistence, create/delete");
} finally {
  await browser.close();
}
