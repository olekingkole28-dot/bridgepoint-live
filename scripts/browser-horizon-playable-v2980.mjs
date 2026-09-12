import fs from 'node:fs';
import { chromium } from 'playwright-core';

const candidates=[
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);
const executablePath=candidates.find(p=>fs.existsSync(p));
if(!executablePath)throw new Error('No Chromium/Chrome found');

const browser=await chromium.launch({
  executablePath,
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader']
});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const messages=[],errors=[];
page.on('console',m=>messages.push(m.type()+': '+m.text()));
page.on('pageerror',e=>errors.push(String(e?.stack||e)));
page.on('requestfailed',r=>messages.push('requestfailed: '+r.url()+' :: '+(r.failure()?.errorText||'unknown')));

async function testCell(cell){
  const url='https://bridgepointintelligence.online/app/horizon-playable/?cell='+cell+'&ci='+Date.now();
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>Boolean(window.BP_HORIZON_SMOKE),null,{timeout:90000});
  const d=await page.evaluate(()=>({
    smoke:window.BP_HORIZON_SMOKE,
    errorHidden:document.getElementById('error')?.hidden,
    text:document.getElementById('loadText')?.textContent,
    canvases:document.querySelectorAll('canvas').length,
    webgl:Boolean(document.createElement('canvas').getContext('webgl'))
  }));
  console.log(JSON.stringify({cell,status:response?.status(),url,...d},null,2));
  if(response?.status()!==200)throw new Error(cell+' HTTP '+response?.status());
  if(!d.webgl)throw new Error(cell+' WebGL unavailable');
  if(!d.errorHidden)throw new Error(cell+' error box visible');
  if(!d.smoke?.ok)throw new Error(cell+' smoke failed: '+d.smoke?.error);
  if(!d.smoke?.player)throw new Error(cell+' player missing');
  if(!(d.smoke?.buildings>0))throw new Error(cell+' buildings missing');
  if(!(d.smoke?.loot>0))throw new Error(cell+' loot missing');
  if(!(d.canvases>=2))throw new Error(cell+' expected world + minimap canvases');
}
try{
  await testCell('middletown');
  await testCell('manhattan');
  console.log('HORIZON_V2980_BROWSER_SMOKE_PASS');
  if(errors.length)console.log('pageErrors',errors);
  const serious=messages.filter(x=>/syntaxerror|referenceerror|typeerror/i.test(x));
  if(serious.length)throw new Error('Serious console errors: '+serious.join(' | '));
}finally{
  await browser.close();
}
