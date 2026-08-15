import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const chrome = process.env.CHROMIUM_PATH
  || "/Users/digitex/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const baseUrl = process.env.LISTINGS_CRM_PAGE_URL || "http://127.0.0.1:4174/?board=listings";
const outputDir = process.env.LISTINGS_CRM_SCREENSHOT_DIR || "/Users/digitex/Desktop/Проект2/outputs";

const members = [
  { id: "operator-1", name: "Анна", role: "Листинги", active: true, capacity: 5 },
  { id: "operator-2", name: "Борис", role: "Контакты", active: true, capacity: 5 },
  { id: "coordinator", name: "Ирина", role: "Координатор", active: true, capacity: 5 },
];
const records = [
  { id: "r1", name: "DApp Directory", source: "Листинги", type: "DApp listing", status: "В работе", priority: "A", owner: "Анна", ownerId: "operator-1", dueDate: "2026-08-14", action: "Подготовить данные для формы", link: "https://example.com", notes: "", summary: "", price: "Бесплатно", channel: "Form", firstContact: "", benefit: "", updatedAt: "2026-08-15T10:00:00Z", version: 2, proofs: [] },
  { id: "r2", name: "MLM Community", source: "Партнёрства", type: "MLM platform", status: "Ожидаем ответ", priority: "B", owner: "Борис", ownerId: "operator-2", dueDate: "2026-08-15", action: "Проверить входящий ответ", link: "https://mlm.example", notes: "", summary: "", price: "", channel: "Email", firstContact: "", benefit: "", updatedAt: "2026-08-15T10:10:00Z", version: 1, proofs: [] },
];
const tasks = [
  { id: "t1", recordId: "r1", title: "DApp-каталог: DApp Directory", category: "LISTING_DAPP", status: "CLAIMED", priority: "A", points: 2, assigneeId: "operator-1", dueDate: "2026-08-14", nextAction: "Подготовить данные для формы", version: 1 },
  { id: "t2", recordId: "r2", title: "Проверить входящий ответ", category: "FOLLOW_UP", status: "READY", priority: "A", points: 1, assigneeId: null, dueDate: "2026-08-15", nextAction: "Открыть переписку", version: 1 },
  { id: "t3", title: "Найти контакт в LinkedIn", category: "CONTACT_RESEARCH", status: "CLAIMED", priority: "B", points: 1, assigneeId: "operator-2", dueDate: "2026-08-15", nextAction: "Проверить профиль", version: 1 },
];
const audit = [{ id: "a1", action: "TASK_CLAIM", actorName: "Анна", entityName: "DApp Directory", createdAt: "2026-08-15T10:05:00Z" }];

function response(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: chrome, chromiumSandbox: false, args: ["--no-first-run", "--disable-breakpad", "--disable-crash-reporter", "--disable-crashpad"] });

try {
  for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const consoleErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.route("**/api/marketing/listings-crm/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path.endsWith("/bootstrap")) return route.fulfill(response({ ok: true, members, records, tasks, audit }));
      if (path.endsWith("/claim")) {
        const id = path.split("/").at(-2);
        const task = tasks.find((item) => item.id === id);
        if (task) { task.assigneeId = "operator-1"; task.status = "CLAIMED"; task.version += 1; }
        return route.fulfill(response({ ok: true, task }));
      }
      if (path.endsWith("/generate")) return route.fulfill(response({ ok: true, tasks, created: [] }));
      if (request.method() === "PATCH") return route.fulfill(response({ ok: true }));
      return route.fulfill(response({ ok: true }));
    });
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 20_000 });
    await page.getByText("Одна очередь, отдельные ответственные, без двойной работы", { exact: true }).waitFor();
    const crm = page.locator(".analytics-listings-crm-host");
    await crm.locator(".nav-item").filter({ hasText: "Команда" }).click();
    await page.getByText("Свободная очередь", { exact: true }).waitFor();
    await crm.locator(".nav-item").filter({ hasText: "Все записи" }).click();
    await page.getByText("DApp Directory", { exact: true }).first().click();
    await page.getByText("Изменения сохраняются только в этой карточке", { exact: true }).waitFor();
    await page.locator(".drawer-head button").click();
    await page.screenshot({ path: `${outputDir}/listings-team-crm-${viewport.name}.png`, fullPage: true });
    const overflow = await page.evaluate(() => {
      const host = document.querySelector(".analytics-listings-crm-host");
      const shell = host?.shadowRoot?.querySelector(".app-shell");
      return shell ? Math.max(0, shell.scrollWidth - shell.clientWidth) : 9999;
    });
    if (overflow > 2) throw new Error(`${viewport.name}: CRM horizontal overflow ${overflow}px`);
    if (consoleErrors.length) throw new Error(`${viewport.name}: console errors: ${consoleErrors.join(" | ")}`);
    await page.close();
  }
  console.log("Listings Team CRM page verified at desktop and mobile widths.");
} finally {
  await browser.close();
}
