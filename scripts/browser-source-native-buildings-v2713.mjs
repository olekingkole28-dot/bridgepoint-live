import fs from 'node:fs';
import { chromium } from 'playwright-core';

const candidates = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);
const executablePath = candidates.find((p) => fs.existsSync(p));
if (!executablePath) throw new Error(`No system Chromium/Chrome found. Tried: ${candidates.join(', ')}`);

const url = `https://bridgepointintelligence.online/smoke-v2713/?ci=${Date.now()}`;
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-webgl']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e?.stack || e)));

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.BP_V2713_SMOKE), null, { timeout: 45000 });
  const result = await page.evaluate(() => ({
    smoke: window.BP_V2713_SMOKE,
    status: document.getElementById('status')?.textContent || '',
    webgl2: Boolean(document.createElement('canvas').getContext('webgl2')),
    webgl: Boolean(document.createElement('canvas').getContext('webgl'))
  }));
  console.log(JSON.stringify({ executablePath, url, ...result, consoleErrors }, null, 2));
  if (!result.smoke?.ok) throw new Error(`Browser smoke failed: ${result.smoke?.error || result.status}`);
  if (!(Number(result.smoke?.rendered) > 0)) throw new Error(`Cesium rendered count is not positive: ${result.smoke?.rendered}`);
  if (!String(result.status).startsWith('V2713_BROWSER_SMOKE_PASS')) throw new Error(`Unexpected status: ${result.status}`);
} finally {
  await browser.close();
}
