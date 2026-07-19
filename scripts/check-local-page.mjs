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

const url = args.url || "http://127.0.0.1:3036/";
const waitUntil = args.waitUntil || "networkidle";
const screenshotPath = args.screenshot || "";
const titleIncludes = args.titleIncludes || "";
const textIncludes = args.textIncludes || "";
const waitForText = args.waitForText || "";
const clickSelector = args.clickSelector || "";
const clickText = args.clickText || "";
const clickSequence = args.clickSequence || "";
const afterClickSelector = args.afterClickSelector || "";
const afterClickTextIncludes = args.afterClickTextIncludes || "";
const selector = args.selector || "";
const timeout = Number(args.timeout || 15000);
const viewportMatch = String(args.viewport || "").match(/^(\d+)x(\d+)$/);
const viewport = viewportMatch
  ? { width: Number(viewportMatch[1]), height: Number(viewportMatch[2]) }
  : { width: 1440, height: 1000 };

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
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil, timeout });

  if (titleIncludes) {
    const title = await page.title();
    if (!title.includes(titleIncludes)) {
      throw new Error(`Title check failed. Expected "${titleIncludes}", got "${title}".`);
    }
  }

  if (selector) {
    await page.locator(selector).first().waitFor({ timeout });
  }

  if (textIncludes) {
    const bodyText = await page.locator("body").innerText({ timeout });
    if (!bodyText.includes(textIncludes)) {
      throw new Error(`Text check failed. Could not find "${textIncludes}".`);
    }
  }

  if (waitForText) {
    await page.getByText(waitForText, { exact: true }).first().waitFor({ timeout });
  }

  if (clickSelector) {
    await page.locator(clickSelector).first().click({ timeout });
  } else if (clickText) {
    await page.getByText(clickText, { exact: true }).first().click({ timeout });
  }

  if (clickSequence) {
    const steps = clickSequence.split("||").map((step) => step.trim()).filter(Boolean);
    for (const step of steps) {
      if (step.startsWith("text:")) {
        await page.getByText(step.slice(5), { exact: true }).first().click({ timeout });
      } else {
        await page.locator(step).first().click({ timeout });
      }
    }
  }

  if (afterClickSelector) {
    await page.locator(afterClickSelector).first().waitFor({ timeout });
  }

  if (afterClickTextIncludes) {
    await page.getByText(afterClickTextIncludes, { exact: false }).first().waitFor({ timeout });
    const afterClickText = await page.locator(afterClickSelector || "body").innerText({ timeout });
    if (!afterClickText.includes(afterClickTextIncludes)) {
      throw new Error(`After-click text check failed. Could not find "${afterClickTextIncludes}".`);
    }
  }

  if (screenshotPath) {
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
  }

  console.log(`OK ${url}`);
} finally {
  await browser.close();
}
