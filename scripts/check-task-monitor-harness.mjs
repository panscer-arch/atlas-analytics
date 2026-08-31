import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=") || "true"];
  }),
);

function findChromiumPath() {
  if (args.chromiumPath) return args.chromiumPath;

  const cacheRoot = "/Users/digitex/Library/Caches/ms-playwright";
  const candidates = fs.existsSync(cacheRoot)
    ? fs.readdirSync(cacheRoot)
      .filter((entry) => entry.startsWith("chromium_headless_shell-"))
      .sort()
      .reverse()
      .map((entry) => path.join(cacheRoot, entry, "chrome-headless-shell-mac-arm64", "chrome-headless-shell"))
    : [];

  const executablePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executablePath) throw new Error("Playwright Chromium was not found.");
  return executablePath;
}

const now = Date.now();
const issues = [
  {
    id: "ATL-205",
    title: "Проверить сохранение ответственных в Marketing Dashboard",
    status: "In Progress",
    assignee: "Alex",
    priority: "Critical",
    statusAgeLabel: "3 ч",
    ageLabel: "1 д",
    inactiveLabel: "18 мин",
    inactiveMs: 18 * 60 * 1000,
    updatedAt: new Date(now - 18 * 60 * 1000).toISOString(),
    needsAttention: true,
    isResolved: false,
    url: "https://example.com/ATL-205",
    latestComment: { text: "Нужно подтвердить, что ответственный сохраняется после перезагрузки." },
  },
  {
    id: "ATL-204",
    title: "Финансы: проверить ввод поступления бюджета",
    status: "Open",
    assignee: "Marina",
    priority: "Show-stopper",
    statusAgeLabel: "1 ч",
    ageLabel: "4 ч",
    inactiveLabel: "42 мин",
    inactiveMs: 42 * 60 * 1000,
    updatedAt: new Date(now - 42 * 60 * 1000).toISOString(),
    needsAttention: true,
    isResolved: false,
    url: "https://example.com/ATL-204",
    latestComment: { text: "Ноль в поле суммы не удаляется. Нужна повторная проверка всех сценариев." },
  },
  {
    id: "ATL-203",
    title: "Обновить карточку Atlas Analytics",
    status: "Review",
    assignee: "Ivan",
    priority: "Normal",
    statusAgeLabel: "8 ч",
    ageLabel: "2 д",
    inactiveLabel: "2 ч",
    inactiveMs: 2 * 60 * 60 * 1000,
    updatedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    needsAttention: false,
    isResolved: false,
    url: "https://example.com/ATL-203",
    latestComment: { text: "Макет готов к проверке." },
  },
  {
    id: "ATL-202",
    title: "Подготовить тексты для социальных сетей",
    status: "Open",
    assignee: "Bona",
    priority: "Normal",
    statusAgeLabel: "2 д",
    ageLabel: "5 д",
    inactiveLabel: "26 ч",
    inactiveMs: 26 * 60 * 60 * 1000,
    updatedAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
    needsAttention: false,
    isResolved: false,
    url: "https://example.com/ATL-202",
    latestComment: { text: "Ожидаются финальные ссылки на официальные каналы." },
  },
  {
    id: "ATL-201",
    title: "Проверить публикацию страницы Atlas Flow",
    status: "Done",
    assignee: "Codex",
    priority: "Normal",
    statusAgeLabel: "1 д",
    ageLabel: "3 д",
    inactiveLabel: "1 д",
    inactiveMs: 24 * 60 * 60 * 1000,
    updatedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    needsAttention: false,
    isResolved: true,
    url: "https://example.com/ATL-201",
    latestComment: { text: "Проверено на desktop и mobile." },
  },
];

const summary = {
  total: 5,
  open: 4,
  done: 1,
  attention: 2,
  stale: 1,
  showStoppers: 1,
};

const issuePayload = {
  issues,
  summary,
  lastCheckedAt: new Date(now - 3 * 60 * 1000).toISOString(),
};

const checkPayload = {
  ...issuePayload,
  changes: [
    {
      type: "status",
      message: "ATL-203 переведена в Review",
      issue: issues[2],
    },
  ],
};

const baseUrl = String(args.baseUrl || "http://127.0.0.1:5190").replace(/\/$/, "");
const screenshotDir = args.screenshotDir || path.resolve("artifacts/ui-harness");
const accessHash = "734c3a7459ad629c114c70863427e1a5bb9161ae63407963685878e6e1af9c1e";
const browser = await chromium.launch({
  headless: true,
  executablePath: findChromiumPath(),
  chromiumSandbox: false,
  args: ["--no-default-browser-check", "--no-first-run"],
});

fs.mkdirSync(screenshotDir, { recursive: true });

async function runViewport(name, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), {
    key: "supersus.access.v1",
    value: accessHash,
  });
  await page.route("**/api/youtrack/issues?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(issuePayload) }));
  await page.route("**/api/youtrack/check", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(checkPayload) }));

  await page.goto(`${baseUrl}/?board=taskMonitor`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const monitor = page.getByTestId("youtrack-monitor");
  try {
    await monitor.waitFor({ timeout: 15000 });
  } catch (error) {
    const debugPath = path.join(screenshotDir, `task-monitor-debug-${name}.png`);
    await page.screenshot({ path: debugPath, fullPage: true }).catch(() => {});
    const bodyText = await page.locator("body").innerText().catch(() => "");
    throw new Error(`${error.message}\nScreen: ${bodyText.slice(0, 500)}\nScreenshot: ${debugPath}`);
  }
  await page.getByText("Проверено 5 из 5").waitFor({ state: "hidden", timeout: 50 }).catch(() => {});
  await page.waitForTimeout(600);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`${name}: page-level horizontal overflow is ${overflow}px`);
  if (pageErrors.length) throw new Error(`${name}: ${pageErrors.join("\n")}`);

  const openRows = page.locator(".analytics-youtrack-table tbody tr");
  if (await openRows.count() !== 4) throw new Error(`${name}: expected 4 open rows`);

  await page.getByRole("tab", { name: "Нужен ответ" }).click();
  if (await openRows.count() !== 2) throw new Error(`${name}: expected 2 attention rows`);

  await page.getByRole("tab", { name: "Все" }).click();
  await page.getByLabel("Поиск задач").fill("ATL-203");
  if (await openRows.count() !== 1) throw new Error(`${name}: search should return one row`);
  await page.getByLabel("Поиск задач").fill("");

  await page.getByRole("button", { name: "Проверить сейчас" }).click();
  await page.getByText("ATL-203 переведена в Review").waitFor({ timeout: 5000 });

  await monitor.screenshot({ path: path.join(screenshotDir, `task-monitor-after-${name}.png`) });
  await page.close();
}

try {
  await runViewport("desktop", { width: 1440, height: 1000 });
  await runViewport("mobile", { width: 390, height: 844 });
  console.log(`OK taskMonitor UI Harness: ${screenshotDir}`);
} finally {
  await browser.close();
}
