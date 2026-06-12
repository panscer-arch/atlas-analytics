import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const defaultChromiumPath =
  "/Users/digitex/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=") || "true"];
  }),
);

const baseUrl = String(args.baseUrl || args.url || "http://127.0.0.1:3036/").replace(/\/$/, "");
const waitUntil = args.waitUntil || "domcontentloaded";
const timeout = Number(args.timeout || 30000);
const filter = args.filter ? new Set(String(args.filter).split(",").map((item) => item.trim()).filter(Boolean)) : null;
const screenshotDir = args.screenshotDir || "/tmp/supersus-board-checks";

const checks = [
  { id: "home", path: "/", text: "Аналитика" },
  { id: "expenses", path: "/?board=expenses", text: "Расходы" },
  { id: "parser", path: "/?board=parser", text: "PARSER / OUTREACH" },
  { id: "diary", path: "/?board=diary", text: "Код доступа" },

  { id: "tasks-launch", path: "/?board=launch", text: "Задачи запуска" },
  { id: "tasks-inbox", path: "/?board=inboxTasks", text: "Входящие задачи" },
  { id: "tasks-marketing", path: "/?board=marketing", text: "Задачи по маркетингу" },
  { id: "tasks-knowledge", path: "/?board=knowledgeBase", text: "Задачи базы знаний" },
  { id: "tasks-ideas", path: "/?board=ideas", text: "Идеи" },
  { id: "tasks-daily", path: "/?board=dailyTasks", text: "Ближайшие задачи" },
  { id: "tasks-social", path: "/?board=socialSubscriptions", text: "Подписки" },
  { id: "tasks-library", path: "/?board=productLibrary", text: "Библиотека" },
  { id: "tasks-developments", path: "/?board=developments", text: "Разработки" },
  { id: "tasks-crm", path: "/?board=crmBoard", text: "CRM-доска" },

  { id: "content-plan", path: "/?board=contentPlan", text: "Контент-план" },
  { id: "content-images", path: "/?board=images", text: "Имиджевые картинки Atlas" },
  { id: "content-materials", path: "/?board=materials", text: "Материалы" },
  { id: "content-presentation", path: "/?board=presentation", text: "Презентация" },
  { id: "content-params", path: "/?board=agentTasks", text: "Параметры" },
  { id: "content-dataset", path: "/?board=agentDataset", text: "Датасет" },
  { id: "content-faq", path: "/?board=agentFaq", text: "FAQ" },
  { id: "content-ceo", path: "/?board=ceoPresentation", text: "CEO-презентация" },
  { id: "content-whitepaper", path: "/?board=whitePaper", text: "White Paper" },
  { id: "content-legal", path: "/?board=legalDocs", text: "Документы" },
  { id: "content-videos", path: "/?board=videoScripts", text: "Ролики" },
  { id: "content-terms", path: "/?board=terminology", text: "Терминология" },
  { id: "content-security", path: "/?board=securityReview", text: "Security Review" },
  { id: "content-transport-risk", path: "/?board=transportRiskFaq", text: "Transport" },
  { id: "content-codex", path: "/?board=codexSystem", text: "Префакты" },
];

const interactionChecks = [
  { id: "button-parser", path: "/", clickSelector: ".analytics-header-parser-button", text: "PARSER / OUTREACH" },
  { id: "button-notes", path: "/", clickSelector: ".analytics-header-notes-button", text: "Заметки" },
  { id: "button-diary", path: "/", clickSelector: ".analytics-header-motion-button", text: "Код доступа" },
];

function makeUrl(checkPath) {
  if (/^https?:\/\//.test(checkPath)) return checkPath;
  return `${baseUrl}${checkPath.startsWith("/") ? checkPath : `/${checkPath}`}`;
}

function shouldRun(check) {
  return !filter || filter.has(check.id);
}

async function runCheck(page, check) {
  const pageErrors = [];
  const consoleErrors = [];
  const onPageError = (error) => pageErrors.push(error.message);
  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };

  page.on("pageerror", onPageError);
  page.on("console", onConsole);

  const url = makeUrl(check.path);
  try {
    await page.goto(url, { waitUntil, timeout });
    await page.waitForTimeout(Number(args.settleMs || 550));

    if (check.clickSelector) {
      await page.locator(check.clickSelector).first().click({ timeout });
      await page.waitForTimeout(Number(args.afterClickSettleMs || 550));
    }

    const bodyText = await page.locator("body").innerText({ timeout });
    if (!bodyText.includes(check.text)) {
      throw new Error(`Missing text "${check.text}"`);
    }
    if (pageErrors.length || consoleErrors.length) {
      throw new Error([...pageErrors, ...consoleErrors].join("\n"));
    }

    console.log(`OK ${check.id} ${url}`);
    return { ok: true, id: check.id };
  } catch (error) {
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, `${check.id}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    console.error(`FAIL ${check.id} ${url}`);
    console.error(`  ${error.message}`);
    console.error(`  screenshot: ${screenshotPath}`);
    return { ok: false, id: check.id, error: error.message };
  } finally {
    page.off("pageerror", onPageError);
    page.off("console", onConsole);
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath: args.chromiumPath || defaultChromiumPath,
  chromiumSandbox: false,
  args: [
    "--disable-breakpad",
    "--disable-crash-reporter",
    "--disable-crashpad",
    "--disable-features=Crashpad",
    "--no-default-browser-check",
    "--no-first-run",
  ],
});

try {
  const allChecks = [...checks, ...interactionChecks].filter(shouldRun);
  const results = [];

  for (const check of allChecks) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    results.push(await runCheck(page, check));
    await page.close().catch(() => {});
  }

  const failed = results.filter((result) => !result.ok);
  console.log(`\nBoard checks: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
