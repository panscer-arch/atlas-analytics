// Local-only fixtures; no business data or API mutations leave this browser.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const { createTablesSeed } = await import(pathToFileURL(path.resolve('src/modules/analytics/data/tablesModel.js')));
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const writes = [], errors = [];
  await context.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (!['GET', 'HEAD'].includes(request.method())) writes.push(url.pathname);
    let payload = { ok: false, error: 'Local QA only' }, status = 503;
    if (request.method() === 'GET' && url.pathname.startsWith('/api/content/')) {
      status = 200; payload = { ok: true, exists: false };
      if (decodeURIComponent(url.pathname).endsWith('supersus.tables.v1')) payload = { ok: true, exists: true, value: createTablesSeed() };
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const out = '/tmp/supersus-light-theme-qa';
  fs.mkdirSync(out, { recursive: true });
  await page.goto('http://127.0.0.1:4192/?board=tables');
  const main = page.locator('main.sus-workspace');
  const toggle = page.getByRole('button', { name: 'Светлая тема', exact: true });
  await toggle.waitFor();
  assert.equal(await main.getAttribute('data-color-mode'), 'dark');
  const table = page.locator('.tables-grid');
  await table.waitFor();
  const before = await table.innerText();
  await toggle.click();
  await page.mouse.move(0, 0);
  assert.equal(await main.getAttribute('data-color-mode'), 'light');
  assert.equal(await table.innerText(), before, 'Theming must not change cell data');
  assert.equal(await main.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(237, 240, 245)');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.sus-theme-toggle')).backgroundColor === 'rgb(241, 244, 249)');
  await page.screenshot({ path: `${out}/tables-light-desktop.png` });
  await page.reload();
  await toggle.waitFor();
  assert.equal(await main.getAttribute('data-color-mode'), 'light', 'Preference survives reload');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${out}/tables-light-mobile.png` });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'No page overflow on mobile');
  for (const board of ['departments', 'parser']) {
    await page.goto(`http://127.0.0.1:4192/?board=${board}`);
    await toggle.waitFor();
    assert.equal(await main.getAttribute('data-color-mode'), 'light');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: `${out}/${board}-light.png` });
  }
  await toggle.click();
  assert.equal(await main.getAttribute('data-color-mode'), 'dark');
  await page.reload();
  await toggle.waitFor();
  assert.equal(await main.getAttribute('data-color-mode'), 'dark');
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, [], 'No API writes during theme changes or navigation');
  await browser.close();
  console.log('PASS: toggle, reload, navigation, unchanged table cells, mobile overflow, no API writes or JS errors. Screenshots:', out);
})().catch(error => { console.error(error); process.exit(1); });
