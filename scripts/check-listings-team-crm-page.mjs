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
  { id: "r1", name: "DApp Directory", source: "Листинги", type: "DApp listing", status: "В работе", priority: "A", owner: "Анна", ownerId: "operator-1", dueDate: "2026-08-14", action: "Подготовить данные для формы", link: "https://example.com", notes: "", summary: "", price: "Бесплатно", channel: "Form", firstContact: "2026-08-12", benefit: "", updatedAt: "2026-08-15T10:00:00Z", version: 2, proofs: [], platformAccess: { loginUrl: "https://example.com/login", workspaceUrl: "https://example.com/dashboard", submissionUrl: "https://example.com/dashboard/new", publishedUrl: "", accountLogin: "editor@atlas-system.tech", authMethod: "Email + пароль", accessOwner: "Анна", twoFactorOwner: "Ирина", recoveryContact: "security@atlas-system.tech", passwordManagerItem: "DApp Directory · Atlas", passwordManagerUrl: "https://vault.example/items/dapp-directory", lastVerifiedAt: "2026-08-15", notes: "Редактор доступен после входа" }, correspondence: [{ id: "m1", occurredAt: "2026-08-12T09:30", kind: "SUBMISSION", channel: "Form", sender: "Анна · Atlas System", recipient: "DApp Directory editorial", subject: "Atlas listing submission", message: "Заявка отправлена через форму публикации.", outcome: "Получен номер заявки A-42", threadUrl: "https://example.com/dashboard/submissions/A-42", attachmentUrl: "https://docs.example/atlas", followUpDate: "2026-08-18", createdBy: "Анна", createdAt: "2026-08-12T09:30:00Z" }] },
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
    const servedTasks = viewport.name === "desktop" ? [] : tasks;
    const consoleErrors = [];
    page.on("console", (message) => {
      const sourceUrl = message.location().url || "";
      const unrelatedApiFailure = ["/api/content/", "/api/contracts/atlas-flows", "/api/marketing/browser-session"]
        .some((path) => sourceUrl.includes(path));
      if (message.type() === "error"
        && !message.text().startsWith("Failed to load resource: the server responded with a status of 404")
        && !unrelatedApiFailure) {
        consoleErrors.push(message.text());
      }
    });
    await page.route("**/api/marketing/listings-crm/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path.endsWith("/bootstrap")) return route.fulfill(response({ ok: true, members, records, tasks: servedTasks, audit }));
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
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.getByText("Одна очередь, отдельные ответственные, без двойной работы", { exact: true }).waitFor();
    const crm = page.locator(".analytics-listings-crm-host");
    const firstMetric = await crm.locator(".metrics article").first().innerText();
    if (!firstMetric.includes("Карточек в базе") || !firstMetric.includes(String(records.length))) {
      throw new Error(`${viewport.name}: overview hides the ${records.length} imported CRM records behind zero task metrics`);
    }
    await crm.locator(".nav-item").filter({ hasText: "Инструкции" }).click();
    await page.getByText("Поиск лидеров: от ключевика до первого сообщения", { exact: true }).waitFor();
    const instructions = await crm.locator(".instructions-page").innerText();
    if (!instructions.includes("Не исключать автоматически") || !instructions.includes("Atlas зависит от дальнейшей активности и притока средств")) {
      throw new Error(`${viewport.name}: simplified instructions or risk disclosure are missing`);
    }
    if (await crm.locator(".platform-list details").count() !== 7 || await crm.locator(".template-list details").count() !== 9) {
      throw new Error(`${viewport.name}: detailed platform guides or audience templates are incomplete`);
    }
    await crm.locator(".platform-list details").first().locator("summary").click();
    await page.getByText('"network marketing leader" [country]', { exact: true }).waitFor();
    await crm.locator(".template-list details").first().locator("summary").click();
    await page.getByText("Atlas System: обсуждение развития в [страна/регион]", { exact: true }).waitFor();
    await page.getByText("Официально и проверяемо", { exact: true }).waitFor();
    const firstTemplate = await crm.locator(".template-list details").first().innerText();
    if (!firstTemplate.includes("International Partnerships Executive") || !firstTemplate.includes("уполномочен вести первичные партнёрские переговоры")) {
      throw new Error(`${viewport.name}: the outreach template does not establish the employee's verified role and authority`);
    }
    await page.getByText("Одна понятная цепочка ответственности", { exact: true }).waitFor();
    const partnershipFlow = await crm.locator(".partnership-flow").innerText();
    for (const role of ["Partnership Research Specialist", "International Partnerships Executive", "Senior International Partnerships Executive", "Head of International Partnerships"]) {
      if (!partnershipFlow.includes(role)) throw new Error(`${viewport.name}: partnership workflow is missing ${role}`);
    }
    const handoff = await crm.locator(".handoff-card").innerText();
    if (!handoff.includes("Просит особые условия, регион или стратегический статус") || !handoff.includes("Технический, юридический или security-вопрос")) {
      throw new Error(`${viewport.name}: handoff rules are incomplete`);
    }
    if (viewport.name === "mobile") {
      await crm.locator(".platform-list details").first().locator("summary").click();
      await crm.locator(".template-list details").first().locator("summary").click();
    }
    await page.screenshot({ path: `${outputDir}/listings-team-crm-instructions-${viewport.name}.png`, fullPage: true });
    await crm.locator(".nav-item").filter({ hasText: "Обзор" }).click();
    if (viewport.name === "desktop") {
      await page.getByText(`В базе уже ${records.length} записей`, { exact: true }).waitFor();
      await page.getByText("Разбивка по категориям", { exact: true }).waitFor();
      const categoryBreakdown = await crm.locator(".category-breakdown").innerText();
      if (!categoryBreakdown.includes("DApp / Web3-листинги") || !categoryBreakdown.includes("MLM-площадки")) {
        throw new Error("desktop: category breakdown is missing the core listing directions");
      }
      await page.screenshot({ path: `${outputDir}/listings-team-crm-overview-desktop.png`, fullPage: true });
    }
    await crm.locator(".nav-item").filter({ hasText: "Команда" }).click();
    await page.getByText("Свободная очередь", { exact: true }).waitFor();
    await crm.locator(".nav-item").filter({ hasText: "Все записи" }).click();
    await crm.locator(".category-filter").selectOption("dapp");
    await page.getByText("DApp Directory", { exact: true }).waitFor();
    if (await page.getByText("MLM Community", { exact: true }).count()) throw new Error(`${viewport.name}: category filter did not narrow the records table`);
    await crm.locator(".category-filter").selectOption("all");
    await page.getByText("DApp Directory", { exact: true }).first().click();
    await page.getByText("Изменения сохраняются только в этой карточке", { exact: true }).waitFor();
    await page.getByText("Вход и место размещения", { exact: true }).waitFor();
    await page.getByText("Хронология переписки", { exact: true }).waitFor();
    await page.getByText("Пароль не вставлять в CRM", { exact: true }).waitFor();
    await page.getByText("Заявка отправлена через форму публикации.", { exact: true }).waitFor();
    if (await crm.locator('.drawer input[type="password"]').count()) throw new Error(`${viewport.name}: the listings card exposes a raw password field`);
    if (await crm.locator(".timeline-item").count() !== 1) throw new Error(`${viewport.name}: the saved correspondence chronology is missing`);
    await crm.getByRole("button", { name: "＋ Добавить событие" }).click();
    if (await crm.locator(".timeline-item").count() !== 2) throw new Error(`${viewport.name}: a new correspondence event cannot be added`);
    await page.screenshot({ path: `${outputDir}/listings-team-crm-access-history-${viewport.name}.png`, fullPage: true });
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
