import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const chrome = process.env.CHROMIUM_PATH
  || "/Users/digitex/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const baseUrl = process.env.GA4_PAGE_URL || "http://127.0.0.1:4174/?board=analytics-ga4";
const outputDir = process.env.GA4_SCREENSHOT_DIR || "/Users/digitex/Desktop/Проект2/outputs";

const trend = Array.from({ length: 28 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 6, 5 + index));
  return {
    id: String(index),
    date: date.toISOString().slice(0, 10).replaceAll("-", ""),
    activeUsers: 18 + (index % 7) * 3 + Math.round(index * 0.7),
    sessions: 29 + (index % 6) * 5 + index,
    engagedSessions: 20 + (index % 5) * 4 + Math.round(index * 0.6),
    keyEvents: index % 4,
  };
});

const payload = {
  ok: true,
  configured: true,
  propertyId: "546276265",
  range: "28d",
  rangeLabel: "28 дней",
  generatedAt: "2026-08-02T15:15:00.000Z",
  current: {
    activeUsers: 808,
    totalUsers: 870,
    newUsers: 511,
    sessions: 1326,
    engagedSessions: 808,
    engagementRate: 0.6094,
    averageEngagementSeconds: 70,
    eventCount: 10214,
    keyEvents: 126,
    screenPageViews: 4210,
  },
  previous: { activeUsers: 715, sessions: 1198, engagementRate: 0.572, keyEvents: 101 },
  changes: { activeUsers: 13.0, sessions: 10.7, engagementRate: 6.5, keyEvents: 24.8 },
  realtime: { activeUsers: 14 },
  trend,
  sources: [
    ["banner / display", 428, 271, 0.633, 42],
    ["(direct) / (none)", 311, 186, 0.598, 31],
    ["telegram / referral", 244, 163, 0.668, 29],
    ["google / organic", 172, 104, 0.605, 15],
  ].map(([sessionSourceMedium, sessions, engagedSessions, engagementRate, keyEvents], index) => ({ id: String(index), sessionSourceMedium, sessions, engagedSessions, engagementRate, keyEvents })),
  landingPages: [
    ["/", 611, 402, 0.658, 60],
    ["/smart-cycle", 284, 178, 0.627, 32],
    ["/about-system", 163, 98, 0.601, 14],
    ["/partner-program", 112, 61, 0.545, 12],
  ].map(([landingPagePlusQueryString, sessions, activeUsers, engagementRate, keyEvents], index) => ({ id: String(index), landingPagePlusQueryString, sessions, activeUsers, engagementRate, keyEvents })),
  countries: [
    ["Germany", 188, 292, 0.64], ["Kazakhstan", 145, 229, 0.61], ["Türkiye", 121, 198, 0.58], ["Ukraine", 96, 151, 0.63],
  ].map(([country, activeUsers, sessions, engagementRate], index) => ({ id: String(index), country, activeUsers, sessions, engagementRate })),
  devices: [
    ["mobile", 552, 914], ["desktop", 239, 386], ["tablet", 17, 26],
  ].map(([deviceCategory, activeUsers, sessions], index) => ({ id: String(index), deviceCategory, activeUsers, sessions })),
  insights: [
    { tone: "positive", title: "Трафик растёт", text: "Сессии выросли на 10,7% к предыдущему сопоставимому периоду. Активные пользователи: +13,0%." },
    { tone: "positive", title: "Вовлечение сильное", text: "60,9% сессий вовлечённые, среднее активное время на пользователя 70 сек." },
    { tone: "neutral", title: "Главный источник трафика", text: "banner / display даёт 32,3% всех сессий за период." },
    { tone: "positive", title: "Ключевые события", text: "126 событий, изменение к прошлому периоду +24,8%." },
  ],
  caveat: "Автоматическая интерпретация показывает изменения и аномалии, но не доказывает их причину.",
};

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: chrome,
  chromiumSandbox: false,
  args: ["--no-first-run", "--disable-breakpad", "--disable-crash-reporter", "--disable-crashpad"],
});

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.route("**/api/content/google-analytics?range=*", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }));
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 20_000 });
    await page.locator('[data-testid="google-analytics-board"]').waitFor({ timeout: 10_000 });
    await page.getByText("Трафик растёт", { exact: true }).waitFor();
    const layout = await page.evaluate(() => {
      const board = document.querySelector('[data-testid="google-analytics-board"]');
      return {
      overflow: Math.max(0, Math.round(board.getBoundingClientRect().right - document.documentElement.clientWidth)),
      widest: [...board.querySelectorAll("*")]
        .map((element) => ({
          selector: `${element.tagName.toLowerCase()}.${String(element.className || "").split(" ").filter(Boolean).join(".")}`,
          right: Math.round(element.getBoundingClientRect().right),
          width: Math.round(element.getBoundingClientRect().width),
        }))
        .filter((item) => item.right > document.documentElement.clientWidth + 2)
        .sort((left, right) => right.right - left.right)
        .slice(0, 8),
    };
    });
    await page.screenshot({ path: `${outputDir}/ga4-${viewport.name}.png`, fullPage: true });
    if (layout.overflow > 2) throw new Error(`${viewport.name}: body overflow ${layout.overflow}px; ${JSON.stringify(layout.widest)}`);
    if (consoleErrors.length) throw new Error(`${viewport.name}: console errors: ${consoleErrors.join(" | ")}`);
    await page.close();
  }
  console.log("Google Analytics page verified at desktop and mobile widths.");
} finally {
  await browser.close();
}
