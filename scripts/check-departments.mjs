import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    "/Users/digitex/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let saved = null;
let failRead = false;
let authorized = false;
const writes = [];
// Network boundary only: the real UI and save/read-back path run unchanged.
await page.route("**/api/content/supersus.departments.v1", async (route) => {
  if(!authorized)return route.fulfill({status:401,json:{ok:false}});
  if (route.request().method() === "PUT") {
    saved = route.request().postDataJSON().value;
    writes.push(saved);
    return route.fulfill({ json: { ok: true } });
  }
  if (failRead) return route.fulfill({ status: 503, json: { ok: false } });
  return route.fulfill({
    json: { ok: true, exists: saved !== null, value: saved },
  });
});
await page.route('**/api/marketing/browser-session',route=>{authorized=true;return route.fulfill({json:{ok:true}});});
await page.route("**/api/content/supersus.teamGraph.v3", (route) =>
  route.fulfill({
    json: {
      ok: true,
      exists: true,
      value: {
        nodes: [
          {
            id: "ruby",
            type: "member",
            data: { label: "Ruby", role: "SMM Atlas" },
          },
          {
            id: "social",
            type: "project",
            data: { label: "Соц сети", category: "content" },
          },
        ],
        edges: [{ source: "ruby", target: "social" }],
      },
    },
  }),
);
try {
  await page.goto("http://127.0.0.1:4197/?board=departments", {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel('Пароль SuperSUS',{exact:true}).fill('test-only');
  await page.getByRole('button',{name:'Открыть отделы',exact:true}).click();
  await page
    .getByRole("heading", { name: "Отделы и процессы", exact: true })
    .waitFor({ timeout: 15000 });
  assert.equal(await page.locator(".org-department").count(), 7);
  await page.getByRole("tab", {name:/Процессы/}).click();
  await page.goBack();
  assert.equal(await page.getByRole("tab", {name:/Отделы/}).getAttribute("aria-selected"),"true","Back to base route restores department view");
  assert.equal(
    writes.length,
    0,
    "Opening a tab must not seed production automatically",
  );
  await page
    .getByRole("button", { name: "Изменить Маркетинг и контент", exact: true })
    .click();
  await page.getByLabel("Ответственный", { exact: true }).selectOption("ruby");
  await page.getByLabel("Статус", { exact: true }).selectOption("confirmed");
  await page.getByRole("button", { name: "Применить", exact: true }).click();
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page.getByText("Сохранено на сервере", { exact: true }).waitFor();
  assert.equal(
    saved.departments.find((d) => d.id === "marketing").ownerId,
    "ruby",
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: "Отделы и процессы", exact: true })
    .waitFor();
  await page.getByRole("tab", { name: /Процессы/ }).click();
  await page
    .getByPlaceholder("Найти процесс или улучшение")
    .fill("несуществующее");
  await page.getByText("Ничего не найдено", { exact: true }).waitFor();
  await page.getByPlaceholder("Найти процесс или улучшение").fill("");
  await page.getByRole('button',{name:'Добавить',exact:true}).click();
  await page.getByRole('textbox',{name:'Название',exact:true}).fill('Проверка нового процесса');
  await page.getByRole('button',{name:'Применить',exact:true}).click();
  await page.getByRole('heading',{name:'Проверка нового процесса',exact:true}).waitFor();
  assert.equal(await page.locator('.org-process').count(),14);
  await page.getByRole("tab", { name: /Автоматизация/ }).click();
  await page
    .getByRole("button", {
      name: "Изменить Сводка задач и блокировок",
      exact: true,
    })
    .click();
  await page.getByLabel("Статус", { exact: true }).selectOption("running");
  await page.getByRole("button", { name: "Применить", exact: true }).click();
  await page
    .getByText(
      "Для статуса «Работает» нужны ответственный и подтверждение проверки.",
      { exact: true },
    )
    .waitFor();
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  await page.getByRole("tab", { name: /Отделы/ }).click();
  await mkdir("outputs/departments-qa", { recursive: true });
  await page.screenshot({
    path: "outputs/departments-qa/desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "outputs/departments-qa/mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page
      .locator(".org-board")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    "Board should not overflow mobile",
  );
  await page
    .getByRole("button", { name: "Изменить Маркетинг и контент", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Заметки", exact: true })
    .fill("Проверка потери связи");
  await page.getByRole("button", { name: "Применить", exact: true }).click();
  failRead = true;
  const n = writes.length;
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page
    .locator(".org-save-status")
    .filter({
      hasText: "Сервер недоступен. Изменения остаются в этой вкладке.",
    })
    .waitFor();
  assert.equal(writes.length, n, "Read error must stop write");
  failRead=false;
  page.on('dialog',dialog=>dialog.accept());
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Восстановить черновик',exact:true}).click();
  await page.getByText('Проверка потери связи',{exact:true}).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "UI: route, 7 departments, owner/status edits, persistence/reload, search, automation proof gate, offline safety, mobile and console passed",
  );
} finally {
  await browser.close();
}
