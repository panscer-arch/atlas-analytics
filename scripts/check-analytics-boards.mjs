import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const defaultChromiumPath = chromium.executablePath();

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=") || "true"];
  }),
);

const baseUrl = String(args.baseUrl || args.url || "http://127.0.0.1:3036/").replace(/\/$/, "");
const waitUntil = args.waitUntil || "domcontentloaded";
const timeout = Number(args.timeout || 30000);
const viewportWidth = Number(args.viewportWidth || 1440);
const viewportHeight = Number(args.viewportHeight || 1000);
const allowExpectedApiFailures = String(args.allowExpectedApiFailures || "false") === "true";
const filter = args.filter ? new Set(String(args.filter).split(",").map((item) => item.trim()).filter(Boolean)) : null;
const screenshotDir = args.screenshotDir || "/tmp/supersus-board-checks";

const checks = [
  { id: "home", path: "/", text: "Аналитика" },
  { id: "expenses", path: "/?board=expenses", text: "Расходы" },
  { id: "contacts", path: "/?board=influencers", text: "Контакты", expectedBoard: "influencers" },
  { id: "parser", path: "/?board=parser", text: "Marketing Dashboard" },
  { id: "marketing-os", path: "/?board=marketingOS", text: "MarketingOS" },
  { id: "diary", path: "/?board=diary", text: "Код доступа" },

  { id: "tasks-launch", path: "/?board=launch", text: "Задачи запуска" },
  { id: "tasks-launch-calendar", path: "/?board=launchCalendar", text: "Календарь запуска" },
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
  { id: "button-contacts", path: "/", clickSelector: '[aria-label="Контакты"]', text: "Контакты", expectedBoard: "influencers" },
  { id: "button-parser", path: "/", clickSelector: '[aria-label="Маркетинг"]', text: "Marketing Dashboard", expectedBoard: "parser" },
  { id: "button-notes", path: "/", clickSelector: '[aria-label="Заметки"]', text: "Заметки" },
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
  const responseErrors = [];
  const onPageError = (error) => pageErrors.push(error.message);
  const onConsole = (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) {
      consoleErrors.push(message.text());
    }
  };
  const onResponse = (response) => {
    if (response.status() < 400) return;
    const request = response.request();
    const pathname = new URL(response.url()).pathname;
    const isExpectedLocalFailure = allowExpectedApiFailures && (
      (request.method() === "GET" && pathname === "/api/contracts/atlas-flows")
      || (request.method() === "PUT" && pathname.startsWith("/api/content/"))
      || (request.method() === "GET" && pathname === "/api/marketing/browser-session")
    );
    if (!isExpectedLocalFailure) {
      responseErrors.push(`${request.method()} ${response.status()} ${pathname}`);
    }
  };

  page.on("pageerror", onPageError);
  page.on("console", onConsole);
  page.on("response", onResponse);

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
    if (check.expectedBoard) {
      const currentBoard = new URL(page.url()).searchParams.get("board");
      if (currentBoard !== check.expectedBoard) {
        throw new Error(`Expected board "${check.expectedBoard}", received "${currentBoard || ""}"`);
      }
    }
    const layoutWidth = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth));
    if (layoutWidth > viewportWidth + 1) {
      throw new Error(`Horizontal page overflow: ${layoutWidth}px at ${viewportWidth}px viewport`);
    }
    if (pageErrors.length || consoleErrors.length || responseErrors.length) {
      throw new Error([...pageErrors, ...consoleErrors, ...responseErrors].join("\n"));
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
    page.off("response", onResponse);
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
    const page = await browser.newPage({ viewport: { width: viewportWidth, height: viewportHeight }, deviceScaleFactor: 1 });
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
