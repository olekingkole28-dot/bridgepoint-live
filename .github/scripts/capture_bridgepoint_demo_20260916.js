const { chromium } = require('playwright');
const fs = require('fs');

const SITE = 'https://bridgepointintelligence.online/app/';
const addresses = [
  '140 Hollister Street, Santa Monica, CA',
  '1330 North Hillcrest Avenue, Fayetteville, AR',
  '1215 Roberts Avenue West, Immokalee, FL',
  '902 High Street, Montgomery, AL',
  '46 Hynes Ave, Groton, CT 06340',
  '471 Washington Ave, North Haven, CT 06473',
  '590-626 Asylum Ave, Hartford, CT 06105',
  '554 Wethersfield Ave, Hartford, CT 06114',
  '141 Woodland St, Hartford, CT 06105',
  '3 Elm St, Vernon, CT 06066'
];

const cities = [
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Miami, FL',
  'Seattle, WA',
  'Denver, CO',
  'Hartford, CT'
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function addOverlay(page) {
  await page.evaluate(() => {
    if (document.getElementById('bp-demo-overlay')) return;
    const root = document.createElement('div');
    root.id = 'bp-demo-overlay';
    root.innerHTML = [
      '<div id="bp-demo-top"><span class="bp-mark">B</span><span class="bp-brand">BRIDGEPOINT INTELLIGENCE</span><span class="bp-live">LIVE DEMO</span></div>',
      '<div id="bp-demo-lower"><div id="bp-kicker"></div><div id="bp-title"></div><div id="bp-sub"></div></div>',
      '<div id="bp-demo-progress"></div>'
    ].join('');
    const style = document.createElement('style');
    style.textContent = [
      '#bp-demo-overlay{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#fff}',
      '#bp-demo-top{position:absolute;top:24px;left:28px;right:28px;display:flex;align-items:center;gap:12px;filter:drop-shadow(0 4px 12px rgba(0,0,0,.55))}',
      '.bp-mark{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;font-weight:900;font-size:21px;background:linear-gradient(135deg,#2ca7ff,#0d4cff);box-shadow:0 0 28px rgba(33,124,255,.55)}',
      '.bp-brand{font-size:14px;font-weight:900;letter-spacing:.16em}',
      '.bp-live{margin-left:auto;padding:7px 11px;border-radius:999px;background:rgba(4,10,20,.72);border:1px solid rgba(255,255,255,.24);backdrop-filter:blur(12px);font-size:11px;font-weight:800;letter-spacing:.12em}',
      '#bp-demo-lower{position:absolute;left:34px;bottom:48px;max-width:940px;padding:18px 22px;border-radius:18px;background:linear-gradient(90deg,rgba(1,8,20,.88),rgba(1,8,20,.36));border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(10px);box-shadow:0 12px 44px rgba(0,0,0,.35);opacity:0;transform:translateY(12px);transition:opacity .28s ease,transform .28s ease}',
      '#bp-demo-lower.show{opacity:1;transform:translateY(0)}',
      '#bp-kicker{font-size:11px;font-weight:900;letter-spacing:.18em;color:#63c7ff;margin-bottom:7px}',
      '#bp-title{font-size:30px;font-weight:900;line-height:1.08;text-shadow:0 2px 14px rgba(0,0,0,.5)}',
      '#bp-sub{font-size:14px;line-height:1.4;color:rgba(255,255,255,.84);margin-top:8px}',
      '#bp-demo-progress{position:absolute;left:0;bottom:0;height:4px;width:0;background:linear-gradient(90deg,#2ba8ff,#7559ff,#00e6c8);box-shadow:0 0 18px rgba(43,168,255,.8);transition:width .7s ease}'
    ].join('');
    document.head.appendChild(style);
    document.body.appendChild(root);
  });
}

async function lower(page, kicker, title, sub, ms=2600, progress=null) {
  await page.evaluate(({kicker,title,sub,progress}) => {
    const box = document.getElementById('bp-demo-lower');
    if (!box) return;
    document.getElementById('bp-kicker').textContent = kicker || '';
    document.getElementById('bp-title').textContent = title || '';
    document.getElementById('bp-sub').textContent = sub || '';
    if (progress !== null) document.getElementById('bp-demo-progress').style.width = progress + '%';
    box.classList.add('show');
  }, {kicker,title,sub,progress});
  await sleep(ms);
  await page.evaluate(() => {
    const box = document.getElementById('bp-demo-lower');
    if (box) box.classList.remove('show');
  });
  await sleep(280);
}

async function dismissSoft(page) {
  const labels = [/skip/i,/not now/i,/maybe later/i,/got it/i,/continue/i,/close/i,/dismiss/i,/explore/i,/enter/i];
  for (const rx of labels) {
    try {
      const b = page.getByRole('button', {name: rx}).first();
      if (await b.isVisible({timeout:250})) {
        await b.click({timeout:800});
        await sleep(350);
      }
    } catch {}
  }
}

async function findSearch(page) {
  const candidates = [
    page.locator('input[placeholder*="Search" i]'),
    page.locator('input[placeholder*="address" i]'),
    page.locator('input[placeholder*="property" i]'),
    page.locator('input[type="search"]'),
    page.locator('[role="searchbox"]'),
    page.locator('input').filter({hasNot: page.locator('[type="hidden"]')})
  ];
  for (const loc of candidates) {
    try {
      const n = await loc.count();
      for (let i=0; i<Math.min(n,6); i++) {
        const el = loc.nth(i);
        if (await el.isVisible({timeout:300}) && await el.isEditable({timeout:300})) return el;
      }
    } catch {}
  }
  return null;
}

async function searchPlace(page, q) {
  await dismissSoft(page);
  let input = await findSearch(page);
  if (!input) {
    const searchButtons = [/search/i,/find property/i,/address/i];
    for (const rx of searchButtons) {
      try {
        const b = page.getByRole('button', {name:rx}).first();
        if (await b.isVisible({timeout:300})) {
          await b.click();
          await sleep(500);
          input = await findSearch(page);
          if (input) break;
        }
      } catch {}
    }
  }
  if (!input) return false;
  try {
    await input.click({timeout:1200});
    await input.fill('');
    await input.type(q, {delay:18});
    await sleep(900);
    // Prefer a matching suggestion if one appeared.
    const streetNo = q.match(/^\d+/)?.[0] || q.split(',')[0];
    const possible = page.locator('button,li,[role="option"],[role="listitem"],a').filter({hasText:streetNo}).first();
    if (await possible.isVisible({timeout:700})) {
      await possible.click({timeout:1200});
    } else {
      await input.press('Enter');
    }
    await sleep(3600);
    return true;
  } catch {
    return false;
  }
}

async function clickFeature(page, patterns, pause=1500) {
  for (const rx of patterns) {
    for (const role of ['button','link','tab']) {
      try {
        const loc = page.getByRole(role, {name:rx}).first();
        if (await loc.isVisible({timeout:220})) {
          await loc.click({timeout:1000});
          await sleep(pause);
          return true;
        }
      } catch {}
    }
    try {
      const loc = page.locator('button,a,[role="tab"]').filter({hasText:rx}).first();
      if (await loc.isVisible({timeout:220})) {
        await loc.click({timeout:1000});
        await sleep(pause);
        return true;
      }
    } catch {}
  }
  return false;
}

async function mapMotion(page, duration=1600) {
  const size = page.viewportSize();
  const x = Math.floor(size.width * .54);
  const y = Math.floor(size.height * .48);
  try {
    await page.mouse.move(x,y);
    await page.mouse.wheel(0,-630);
    await sleep(650);
    await page.mouse.move(x-120,y+15);
    await page.mouse.down();
    await page.mouse.move(x+130,y-25,{steps:28});
    await page.mouse.up();
    await sleep(duration);
  } catch {
    await sleep(duration);
  }
}

async function scanCards(page) {
  // Scroll the visible page and any likely right-side/detail pane.
  try {
    await page.mouse.wheel(0,620);
    await sleep(900);
    await page.mouse.wheel(0,620);
    await sleep(900);
    await page.mouse.wheel(0,-850);
    await sleep(650);
  } catch {}
  const panes = page.locator('[class*="panel" i],[class*="drawer" i],[class*="sidebar" i],[class*="detail" i]');
  try {
    const n = await panes.count();
    for (let i=0;i<Math.min(n,8);i++) {
      const p = panes.nth(i);
      if (await p.isVisible({timeout:150})) {
        await p.evaluate(el => el.scrollTo({top:el.scrollHeight*.62,behavior:'smooth'}));
        await sleep(800);
        await p.evaluate(el => el.scrollTo({top:0,behavior:'smooth'}));
        await sleep(500);
        break;
      }
    }
  } catch {}
}

(async () => {
  fs.mkdirSync('demo-output/raw', {recursive:true});
  const browser = await chromium.launch({headless:true, args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage']});
  const context = await browser.newContext({
    viewport:{width:1920,height:1080},
    deviceScaleFactor:1,
    recordVideo:{dir:'demo-output/raw',size:{width:1920,height:1080}},
    ignoreHTTPSErrors:true
  });
  const page = await context.newPage();
  page.setDefaultTimeout(2200);
  let video = page.video();

  try {
    await page.goto(SITE,{waitUntil:'domcontentloaded',timeout:45000});
    await sleep(6500);
    await dismissSoft(page);
    await addOverlay(page);

    await lower(page,'ONE PLATFORM. NATIONAL SCALE.','BridgePoint Intelligence','A live property-intelligence walkthrough — 3D buildings, parcel geometry, property history, layouts and opportunity context.',4200,2);

    // Turn on visually useful layers when those controls exist.
    await clickFeature(page,[/^3D$/i,/3D.*building/i,/buildings/i],1000);
    await clickFeature(page,[/parcel/i],900);
    await clickFeature(page,[/terrain/i],750);

    await lower(page,'NATIONAL 3D WORLD','Major cities — rendered in seconds','Quick cross-country flyover before we drop into individual properties.',2600,6);
    for (let i=0;i<cities.length;i++) {
      const city = cities[i];
      await searchPlace(page,city);
      await lower(page,'CITY ' + String(i+1).padStart(2,'0'),city,'Live map view • 3D context • rapid navigation',1250,8 + i*3);
      await mapMotion(page,800);
    }

    await lower(page,'PROPERTY DEEP DIVE','10 real-world demo addresses','Now moving from national context to individual property intelligence.',2500,31);

    for (let i=0;i<addresses.length;i++) {
      const q = addresses[i];
      const ok = await searchPlace(page,q);
      await lower(page,'PROPERTY ' + String(i+1).padStart(2,'0') + ' / ' + addresses.length,q,ok ? 'Searching the live BridgePoint property graph.' : 'Live search view — preserving the actual app response.',1500,34 + i*6);
      await mapMotion(page,650);

      // Open the most useful property/detail views that exist in this build.
      await clickFeature(page,[/property.*twin/i,/3D.*model/i,/3D.*view/i,/building.*model/i,/x.?ray/i],1300);
      await scanCards(page);

      await clickFeature(page,[/timeline/i,/history/i,/events/i],1100);
      await scanCards(page);

      await clickFeature(page,[/layout/i,/floor/i,/interior/i],1100);
      await scanCards(page);

      await clickFeature(page,[/parcel/i,/boundary/i,/lot/i],900);
      await clickFeature(page,[/details/i,/property/i,/overview/i],900);

      // A slightly longer hold on flagship addresses.
      if (i === 0 || i === 6 || i === 8) {
        await lower(page,'MULTI-LAYER VIEW','Geometry + building + property context','One address, multiple intelligence layers in a single workflow.',1700,38 + i*6);
      }
    }

    await lower(page,'BUILT FOR DECISIONS','From a national map to one property','Search. Render. Inspect. Compare. Move to the next opportunity — without leaving the platform.',3400,96);

    // Finish on national context.
    await searchPlace(page,'United States');
    await sleep(1600);
    await lower(page,'BRIDGEPOINT INTELLIGENCE','The property layer becomes the interface.','End of screen capture • ready for voice-over.',4200,100);

  } catch (e) {
    console.error('CAPTURE_ERROR', e && e.stack ? e.stack : e);
    try {
      await addOverlay(page);
      await lower(page,'LIVE CAPTURE','BridgePoint Intelligence','The capture encountered a live-site interruption; the recording preserves the actual browser state.',2500,100);
    } catch {}
  } finally {
    await context.close();
    await browser.close();
  }

  const path = await video.path();
  console.log('VIDEO_PATH=' + path);
  fs.writeFileSync('demo-output/video-path.txt', path);
})();
