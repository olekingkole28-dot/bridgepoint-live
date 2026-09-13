import fs from 'node:fs';
import { chromium } from 'playwright-core';

const BASE_URL=String(process.env.HORIZON_TEST_BASE||'https://bridgepointintelligence.online').replace(/\/$/,'');
const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(p=>fs.existsSync(p));
if(!executablePath)throw new Error('No Chromium/Chrome found');

const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:915,height:700},isMobile:true,hasTouch:true});
const errors=[];
page.on('pageerror',e=>errors.push(String(e?.stack||e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});

const url=BASE_URL+'/app/horizon/lobby.html?mode=year_one_survival&ci='+Date.now();
const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
if(r?.status()!==200)throw new Error('Horizon lobby HTTP '+r?.status());
await page.waitForFunction(()=>document.querySelectorAll('.modeSwitch').length===3&&document.getElementById('authEmail')&&document.getElementById('authPassword'),null,{timeout:10000});
await page.waitForFunction(()=>document.getElementById('playBtn')?.disabled===true,null,{timeout:20000});

const base=await page.evaluate(()=>({
  modes:[...document.querySelectorAll('.modeSwitch')].map(x=>x.dataset.mode),
  characters:document.querySelectorAll('.char').length,
  auth:Boolean(document.getElementById('authEmail')&&document.getElementById('authPassword')&&document.getElementById('signInBtn')&&document.getElementById('signUpBtn')),
  deployDisabled:document.getElementById('playBtn')?.disabled,
  slots:document.querySelectorAll('#party .slot').length,
  title:document.getElementById('modeName')?.textContent
}));
if(JSON.stringify(base.modes)!==JSON.stringify(['year_one_survival','infinite_tdm','outbreak_raid']))throw new Error('Mode list wrong '+JSON.stringify(base));
if(base.characters!==5||!base.auth||!base.deployDisabled||base.slots!==1||!base.title?.includes('YEAR ONE'))throw new Error('Year One lobby contract failed '+JSON.stringify(base));

await page.click('[data-mode="infinite_tdm"]');
await page.waitForFunction(()=>document.getElementById('modeName')?.textContent?.includes('TEAM DEATHMATCH'));
const tdm=await page.evaluate(()=>({slots:document.querySelectorAll('#party .slot').length,title:document.getElementById('modeName')?.textContent,active:document.querySelector('.modeSwitch.active')?.dataset.mode}));
if(tdm.slots!==4||tdm.active!=='infinite_tdm')throw new Error('TDM mode switch failed '+JSON.stringify(tdm));

await page.click('[data-mode="outbreak_raid"]');
await page.waitForFunction(()=>document.getElementById('modeName')?.textContent?.includes('OUTBREAK RAID'));
const raid=await page.evaluate(()=>({slots:document.querySelectorAll('#party .slot').length,title:document.getElementById('modeName')?.textContent,active:document.querySelector('.modeSwitch.active')?.dataset.mode}));
if(raid.slots!==4||raid.active!=='outbreak_raid')throw new Error('Raid mode switch failed '+JSON.stringify(raid));

const meaningful=errors.filter(x=>!/favicon|Failed to load resource.*404|net::ERR_BLOCKED_BY_CLIENT/i.test(x));
if(meaningful.length)throw new Error('Horizon lobby browser errors '+meaningful.join('\n'));

console.log('HORIZON_ACCOUNT_MODE_LOBBY_PASS',JSON.stringify({base,tdm,raid}));
await browser.close();
