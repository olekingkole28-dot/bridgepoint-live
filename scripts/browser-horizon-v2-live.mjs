import fs from 'node:fs';
import { chromium } from 'playwright-core';

const BASE=String(process.env.HORIZON_TEST_BASE||'https://bridgepointintelligence.online').replace(/\/$/,'');
const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(p=>fs.existsSync(p));
if(!executablePath)throw new Error('No Chromium/Chrome found');

const source=fs.readFileSync('app/horizon-playable/horizon-v2.js','utf8');
for(const marker of [
  'build:4313','actualCharacterModel:true','solidCollision:true','dwellPickup:true','killFeed:true','killcam:true',
  'state:stateCode',"Math.min(5","bridgepoint_horizon_record_kill_v4310","bridgepoint_horizon_year_one_death_v4310"
]) if(!source.includes(marker))throw new Error('Missing source contract '+marker);

const browser=await chromium.launch({executablePath,headless:true,args:[
  '--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader'
]});
const page=await browser.newPage({
  viewport:{width:915,height:412},isMobile:true,hasTouch:true,deviceScaleFactor:1,
  userAgent:'Mozilla/5.0 (Linux; Android 16; moto g - 2026) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36'
});
const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});

await page.addInitScript(()=>{
  localStorage.setItem('horizon-player-id','00000000-0000-4000-8000-000000004313');
  localStorage.setItem('horizon-player-secret','test-client-secret-v4313-abcdefghijklmnop');
  localStorage.setItem('horizon-player-profile',JSON.stringify({display_name:'CI Survivor',avatar_key:'free_07',selected_loadout:1}));
});

const url=BASE+'/app/horizon-playable/v2-entry.html?state=NY&lat=40.7580&lon=-73.9855&span_km=3.1&mode=TDM&seed=4313&ci='+Date.now();
const res=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
if(res?.status()!==200)throw new Error('Horizon V4313 HTTP '+res?.status());
await page.waitForFunction(()=>window.BP_HORIZON_V2?.ok===true,null,{timeout:90000});

const probe=await page.evaluate(()=>({
  runtime:window.BP_HORIZON_V2,
  canvas:!!document.querySelector('#world canvas'),
  errorHidden:document.getElementById('error')?.hidden,
  buttons:['aimBtn','shootBtn','runBtn','buildBtn'].map(id=>({id,exists:!!document.getElementById(id),text:document.getElementById(id)?.textContent?.trim()})),
  removed:['useBtn','lightBtn','weatherBtn'].every(id=>!document.getElementById(id)),
  killFeed:!!document.getElementById('killFeed'),
  killCam:!!document.getElementById('killCam'),
  pickup:!!document.getElementById('pickupPrompt'),
  mode:document.getElementById('modeName')?.textContent,
  zone:document.getElementById('zone')?.textContent
}));
if(!probe.canvas||!probe.errorHidden)throw new Error('Canvas/runtime failed '+JSON.stringify(probe));
if(probe.runtime?.build!==4313||probe.runtime?.state!=='NY'||probe.runtime?.mode!=='TDM')throw new Error('Wrong runtime contract '+JSON.stringify(probe.runtime));
if(!probe.runtime?.actualCharacterModel||!probe.runtime?.solidCollision||!probe.runtime?.dwellPickup||!probe.runtime?.killFeed||!probe.runtime?.killcam)throw new Error('Required V4313 systems missing '+JSON.stringify(probe.runtime));
if(probe.buttons.some(x=>!x.exists)||!probe.removed||!probe.killFeed||!probe.killCam||!probe.pickup)throw new Error('Four-button HUD contract failed '+JSON.stringify(probe));

await page.tap('#aimBtn');
await page.waitForTimeout(450);
const aim=await page.evaluate(()=>({
  active:document.getElementById('aimBtn')?.classList.contains('active'),
  reticle:document.getElementById('reticle')?.classList.contains('aiming')
}));
if(!aim.active||!aim.reticle)throw new Error('Toggle ADS failed '+JSON.stringify(aim));

await page.tap('#buildBtn');
await page.tap('#shootBtn');
await page.waitForTimeout(250);

const meaningful=errors.filter(x=>!/favicon|WebGL performance caveat|Failed to load resource.*404|ResizeObserver loop/i.test(x));
if(meaningful.length)throw new Error('Horizon V4313 browser errors '+meaningful.join('\n'));

console.log('HORIZON_V4313_MATCH_CLIENT_PASS',JSON.stringify(probe));
await browser.close();
