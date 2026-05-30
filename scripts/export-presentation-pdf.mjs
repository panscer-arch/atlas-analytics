import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = "/Users/digitex/Desktop/Проект2/atlas-analytics-repo";
const prefix = process.argv[2] || "atlas-presentation-slide";
const output = process.argv[3] || path.join(root, "public/generated/atlas-presentation.pdf");

const files = fs
  .readdirSync(path.join(root, "public/generated"))
  .filter((file) => file.startsWith(prefix) && file.endsWith(".png"))
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
  .map((file) => path.join(root, "public/generated", file));

if (!files.length) {
  throw new Error(`No slide images found for prefix: ${prefix}`);
}

function dataUrl(filePath) {
  return `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`;
}

const pages = files
  .map(
    (file) => `
      <section class="page">
        <img src="${dataUrl(file)}" alt="" />
      </section>
    `,
  )
  .join("");

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: 12.8in 7.2in; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: white; }
    .page {
      width: 12.8in;
      height: 7.2in;
      page-break-after: always;
      overflow: hidden;
    }
    .page:last-child { page-break-after: auto; }
    img {
      display: block;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>${pages}</body>
</html>`;

fs.mkdirSync(path.dirname(output), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Users/digitex/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell",
});

const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({
  path: output,
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();

console.log(output);
