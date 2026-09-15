import fs from 'node:fs';
import { chromium } from 'playwright-core';

const BASE=String(process.env.HORIZON_TEST_BASE||'https://bridgepointintelligence.online').replace(/\/$/,'');
const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(p=>fs.existsSync(p));
if(!executablePath)throw new Error('No Chromium/Chrome found');

const source=fs.readFileSync('app/horizon-playable/horizon-v2.js','utf8');
for(const marker of [
  'build:4331','actualCharacterModel:true','sourceBackedTwin:true','exactFootprintCollision:true','solidCollision:true','dwellPickup:true','killFeed:true','killcam:true',
  'firstPerson:true','crouch:true','prone:true','slide:true','jumpVault:true','gamepad:true','weaponInventory:true','minimap:true','proceduralInteriors:true','interiorLoot:true','roofTraversal:true','drivableVehicles:true','vehicleFuelRepair:true','infectedPatrols:true','ambientDisasterFx:true','spatialAudio:true','adaptivePerformanceGovernor:true',
  'buildInterior(entry)','buildZiplines()','spawnVehicles()','buildInfectedPatrol','state:stateCode',"bridgepoint_horizon_record_kill_v4310","bridgepoint_horizon_year_one_death_v4310"
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
  localStorage.setItem('horizon-player-id','00000000-0000-4000-8000-000000004331');
  localStorage.setItem('horizon-player-secret','test-client-secret-v4331-abcdefghijklmnop');
  localStorage.setItem('horizon-player-profile',JSON.stringify({display_name:'CI Survivor',avatar_key:'free_07',selected_loadout:1}));
});

const url=BASE+'/app/horizon-playable/v2-entry.html?state=NY&lat=40.7580&lon=-73.9855&span_km=3.1&mode=TDM&seed=4331&ci='+Date.now();
const res=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
if(res?.status()!==200)throw new Error('Horizon V4331 HTTP '+res?.status());
await page.waitForFunction(()=>window.BP_HORIZON_V2?.ok===true||document.getElementById('error')?.hidden===false,null,{timeout:90000});
const startup=await page.evaluate(()=>({ok:window.BP_HORIZON_V2?.ok===true,errorHidden:document.getElementById('error')?.hidden,errorText:document.getElementById('errorText')?.textContent||''}));
if(!startup.ok)throw new Error('Horizon startup error '+JSON.stringify(startup));

const probe=await page.evaluate(()=>({
  runtime:window.BP_HORIZON_V2,
  canvas:!!document.querySelector('#world canvas'),
  errorHidden:document.getElementById('error')?.hidden,
  buttons:['aimBtn','shootBtn','runBtn','buildBtn','viewBtn','crouchBtn','jumpBtn','weaponBtn','dropBtn'].map(id=>({id,exists:!!document.getElementById(id),text:document.getElementById(id)?.textContent?.trim()})),
  miniMap:!!document.getElementById('miniMap'),
  weaponBar:!!document.getElementById('weaponBar'),
  contextBtn:!!document.getElementById('contextBtn'),
  removed:['useBtn','lightBtn','weatherBtn'].every(id=>!document.getElementById(id)),
  killFeed:!!document.getElementById('killFeed'),
  killCam:!!document.getElementById('killCam'),
  pickup:!!document.getElementById('pickupPrompt'),
  mode:document.getElementById('modeName')?.textContent,
  zone:document.getElementById('zone')?.textContent
}));
if(!probe.canvas||!probe.errorHidden)throw new Error('Canvas/runtime failed '+JSON.stringify(probe));
if(probe.runtime?.build!==4331||probe.runtime?.state!=='NY'||probe.runtime?.mode!=='TDM')throw new Error('Wrong runtime contract '+JSON.stringify(probe.runtime));
if(!probe.runtime?.actualCharacterModel||!probe.runtime?.sourceBackedTwin||!probe.runtime?.exactFootprintCollision||!probe.runtime?.terrainSource||Number(probe.runtime?.buildings||0)<1||Number(probe.runtime?.roads||0)<1||!probe.runtime?.solidCollision||!probe.runtime?.dwellPickup||!probe.runtime?.killFeed||!probe.runtime?.killcam||!probe.runtime?.firstPerson||!probe.runtime?.crouch||!probe.runtime?.jumpVault||!probe.runtime?.gamepad||!probe.runtime?.weaponInventory||!probe.runtime?.minimap||!probe.runtime?.proceduralInteriors||!probe.runtime?.roofTraversal||!probe.runtime?.drivableVehicles||!probe.runtime?.infectedPatrols||!probe.runtime?.ambientDisasterFx||!probe.runtime?.spatialAudio||!probe.runtime?.adaptivePerformanceGovernor)throw new Error('Required V4331 systems missing '+JSON.stringify(probe.runtime));
if(probe.buttons.some(x=>!x.exists)||!probe.miniMap||!probe.weaponBar||!probe.contextBtn||!probe.removed||!probe.killFeed||!probe.killCam||!probe.pickup)throw new Error('Restored HUD contract failed '+JSON.stringify(probe));

await page.tap('#aimBtn');
await page.waitForTimeout(450);
const aim=await page.evaluate(()=>({
  active:document.getElementById('aimBtn')?.classList.contains('active'),
  reticle:document.getElementById('reticle')?.classList.contains('aiming')
}));
if(!aim.active||!aim.reticle)throw new Error('Toggle ADS failed '+JSON.stringify(aim));

await page.tap('#utilityToggle');await page.tap('#viewBtn');
await page.tap('#utilityToggle');await page.tap('#crouchBtn');
await page.tap('#utilityToggle');await page.tap('#jumpBtn');
await page.tap('#utilityToggle');await page.tap('#weaponBtn');
await page.tap('#buildBtn');
await page.tap('#shootBtn');
await page.waitForTimeout(500);
const restored=await page.evaluate(()=>({
  viewActive:document.getElementById('viewBtn')?.classList.contains('active'),
  crouchActive:document.getElementById('crouchBtn')?.classList.contains('active'),
  weaponSlots:document.querySelectorAll('#weaponBar .weaponSlot').length,
  minimapPixels:document.getElementById('miniMap')?.getContext('2d')?.getImageData(0,0,4,4)?.data?.some?.(x=>x>0)===true
}));
if(!restored.viewActive||!restored.crouchActive||restored.weaponSlots<5||!restored.minimapPixels)throw new Error('Restored interaction contract failed '+JSON.stringify(restored));

await page.waitForTimeout(6500);
const perfA=await page.evaluate(()=>({...window.BP_HORIZON_PERF}));
await page.waitForTimeout(1400);
const perfB=await page.evaluate(()=>({...window.BP_HORIZON_PERF}));
if(!Number.isFinite(perfB?.ema_ms)||!Number.isFinite(perfB?.fps)||perfB.fps<12||perfB.ema_ms>70||perfB.tier<0||perfB.tier>3||perfB.pixel_ratio<0.5)throw new Error('Adaptive performance gate failed '+JSON.stringify({perfA,perfB}));

const meaningful=errors.filter(x=>!/favicon|WebGL performance caveat|Failed to load resource.*404|ResizeObserver loop/i.test(x));
if(meaningful.length)throw new Error('Horizon V4331 browser errors '+meaningful.join('\n'));

console.log('HORIZON_V4331_MATCH_CLIENT_PASS',JSON.stringify({probe,perf:perfB}));
await browser.close();
