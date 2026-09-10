import fs from 'node:fs';
import { chromium } from 'playwright-core';

const candidates = [process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath = candidates.find((p) => fs.existsSync(p));
if (!executablePath) throw new Error(`No system Chromium/Chrome found. Tried: ${candidates.join(', ')}`);

const url = `https://bridgepointintelligence.online/smoke-v2713/?ci=${Date.now()}`;
const browser = await chromium.launch({
  executablePath,
  headless:true,
  args:[
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-webgl',
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader'
  ]
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const consoleMessages = [];
const pageErrors = [];
page.on('console', (m) => consoleMessages.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => pageErrors.push(String(e?.stack || e)));
page.on('requestfailed', (r) => consoleMessages.push(`requestfailed: ${r.url()} :: ${r.failure()?.errorText || 'unknown'}`));

async function diagnostics() {
  return await page.evaluate(() => ({
    href: location.href,
    title: document.title,
    status: document.getElementById('status')?.textContent || null,
    smoke: window.BP_V2713_SMOKE || null,
    cesium: typeof window.Cesium,
    scripts: Array.from(document.scripts).map(s => s.src || '[inline]'),
    bodyPrefix: document.body?.innerText?.slice(0, 700) || '',
    webgl2: Boolean(document.createElement('canvas').getContext('webgl2')),
    webgl: Boolean(document.createElement('canvas').getContext('webgl'))
  }));
}

try {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log(`HTTP ${response?.status()} ${response?.url()}`);
  try {
    await page.waitForFunction(() => Boolean(window.BP_V2713_SMOKE), null, { timeout: 25000 });
  } catch (e) {
    console.error('BROWSER_DIAGNOSTIC_TIMEOUT');
    console.error(JSON.stringify({ ...(await diagnostics()), consoleMessages, pageErrors }, null, 2));
    throw e;
  }
  const result = await diagnostics();
  console.log(JSON.stringify({ executablePath, url, ...result, consoleMessages, pageErrors }, null, 2));
  if (!result.webgl && !result.webgl2) throw new Error('Browser did not expose WebGL after SwiftShader opt-in');
  if (!result.smoke?.ok) throw new Error(`Browser smoke failed: ${result.smoke?.error || result.status}`);
  if (!(Number(result.smoke?.rendered) > 0)) throw new Error(`Cesium rendered count is not positive: ${result.smoke?.rendered}`);
  if (!String(result.status).startsWith('V2713_BROWSER_SMOKE_PASS')) throw new Error(`Unexpected status: ${result.status}`);
} finally {
  await browser.close();
}
