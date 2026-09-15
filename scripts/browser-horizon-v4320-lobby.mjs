import fs from 'node:fs';
import { chromium } from 'playwright-core';

const BASE=String(process.env.HORIZON_TEST_BASE||'http://127.0.0.1:4173').replace(/\/$/,'');
const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(p=>fs.existsSync(p));
if(!executablePath)throw new Error('No Chromium/Chrome found');

const browser=await chromium.launch({executablePath,headless:true,args:[
  '--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader'
]});
const page=await browser.newPage({
  viewport:{width:412,height:915},isMobile:true,hasTouch:true,deviceScaleFactor:1,
  userAgent:'Mozilla/5.0 (Linux; Android 16; moto g - 2026) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36'
});
const errors=[];
page.on('pageerror',e=>errors.push(String(e?.stack||e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.addInitScript(()=>{
  localStorage.setItem('horizon-player-id','00000000-0000-4000-8000-000000004320');
  localStorage.setItem('horizon-player-secret','test-client-secret-v4320-abcdefghijklmnop');
  localStorage.setItem('horizon-display-name','CI Horizon V4330');
});
const res=await page.goto(BASE+'/app/horizon/?ci='+Date.now(),{waitUntil:'domcontentloaded',timeout:30000});
if(res?.status()!==200)throw new Error('Horizon lobby HTTP '+res?.status());
await page.waitForFunction(()=>window.BP_HORIZON_LOBBY_V4330?.ok===true,null,{timeout:45000});
await page.waitForFunction(()=>window.BP_HORIZON_LOBBY_V4330?.lobbyScene?.()?.models>=1,null,{timeout:30000});

const lobby=await page.evaluate(()=>({
  runtime:window.BP_HORIZON_LOBBY_V4330,
  scene:window.BP_HORIZON_LOBBY_V4330?.lobbyScene?.(),
  canvas:!!document.querySelector('#lobby3d'),
  slots:document.querySelectorAll('#partyRow .player-slot').length,
  occupied:document.querySelectorAll('#partyRow .player-slot.occupied').length,
  empty:document.querySelectorAll('#partyRow .player-slot.empty').length,
  modes:document.querySelectorAll('.mode').length,
  status:document.getElementById('statusMessage')?.textContent
}));
if(!lobby.canvas||lobby.slots!==4||lobby.occupied<1||lobby.empty<1||lobby.modes<4||lobby.scene?.models<1||lobby.runtime?.build!==4330||lobby.runtime?.map_count!==50)throw new Error('Lobby stage contract failed '+JSON.stringify(lobby));

const tdm=page.locator('.mode[data-mode="TDM"]');
if(await tdm.count())await tdm.click();
await page.waitForTimeout(350);
await page.click('#tabs [data-tab="ARENA"]');
await page.waitForFunction(()=>document.querySelectorAll('.map-card').length===50&&document.querySelectorAll('canvas.map-mini').length===50,null,{timeout:12000});
const beforeMap=await page.evaluate(()=>window.BP_HORIZON_LOBBY_V4330?.selected_map_key||null);
const firstMapButton=page.locator('.map-card button[data-map-key]:not([disabled])').first();
if(await firstMapButton.count())await firstMapButton.click();
await page.waitForFunction(prev=>window.BP_HORIZON_LOBBY_V4330?.selected_map_key&&window.BP_HORIZON_LOBBY_V4330.selected_map_key!==prev,beforeMap,{timeout:12000}).catch(()=>{});
const maps=await page.evaluate(()=>({
  cards:document.querySelectorAll('.map-card').length,
  minis:document.querySelectorAll('canvas.map-mini').length,
  selected:document.querySelectorAll('.map-card.selected').length,
  selectedKey:window.BP_HORIZON_LOBBY_V4330?.selected_map_key,
  enabledButtons:[...document.querySelectorAll('.map-card button[data-map-key]')].filter(b=>!b.disabled).length
}));
if(maps.cards!==50||maps.minis!==50||maps.selected<1||!maps.selectedKey||maps.enabledButtons<1)throw new Error('50-map selector contract failed '+JSON.stringify(maps));
await page.click('#closeModal');

await page.click('#tabs [data-tab="STORE"]');
await page.waitForFunction(()=>document.querySelectorAll('.store-card').length>=8&&document.querySelectorAll('.store-card canvas.preview3d').length>=8,null,{timeout:10000});
await page.waitForFunction(()=>[...document.querySelectorAll('.store-card canvas.preview3d')].some(c=>c.dataset.rendered==='1'),null,{timeout:15000});
const store=await page.evaluate(()=>({
  cards:document.querySelectorAll('.store-card').length,
  previews:document.querySelectorAll('.store-card canvas.preview3d').length,
  locked:[...document.querySelectorAll('.store-card button')].filter(b=>b.disabled&&/OWNER-LOCKED/i.test(b.textContent)).length,
  checkout:window.BP_HORIZON_LOBBY_V4330?.checkout_enabled
}));
if(store.cards<8||store.previews<8||store.locked<1||store.checkout!==false)throw new Error('Store contract failed '+JSON.stringify(store));

await page.click('#closeModal');
await page.click('#tabs [data-tab="BATTLE_PASS"]');
await page.waitForFunction(()=>document.querySelectorAll('.reward-card').length>=100,null,{timeout:10000});
const pass=await page.evaluate(()=>({cards:document.querySelectorAll('.reward-card').length,previews:document.querySelectorAll('.reward-card canvas.preview3d').length}));
if(pass.cards<100||pass.previews<pass.cards)throw new Error('Battle pass 3D preview contract failed '+JSON.stringify(pass));

await page.click('#closeModal');
await page.click('#tabs [data-tab="LOCKER"]');
await page.waitForFunction(()=>document.querySelectorAll('.catalog-card canvas.preview3d').length>=10,null,{timeout:10000});
const locker=await page.evaluate(()=>({cards:document.querySelectorAll('.catalog-card').length,previews:document.querySelectorAll('.catalog-card canvas.preview3d').length}));
if(locker.cards<10||locker.previews<10)throw new Error('Locker GLB contract failed '+JSON.stringify(locker));

const meaningful=errors.filter(x=>!/favicon|WebGL performance caveat|ResizeObserver loop|Failed to load resource.*404/i.test(x));
if(meaningful.length)throw new Error('Horizon V4330 lobby browser errors '+meaningful.join('\n'));
console.log('HORIZON_V4330_LOBBY_PASS',JSON.stringify({lobby,maps,store,pass,locker}));
await browser.close();
