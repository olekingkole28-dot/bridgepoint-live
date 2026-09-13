import fs from 'node:fs';
import { chromium } from 'playwright-core';

const BASE_URL=String(process.env.HORIZON_TEST_BASE||'https://bridgepointintelligence.online').replace(/\/$/,'');
const horizonSource=fs.readFileSync('app/horizon-playable/horizon-world.js','utf8');
const buildMatch=horizonSource.match(/const BUILD_VERSION=(\d+)/);
if(!buildMatch)throw new Error('Could not resolve Horizon build');
const EXPECTED_BUILD=Number(buildMatch[1]);

const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(p=>fs.existsSync(p));
if(!executablePath)throw new Error('No Chromium/Chrome found');

const browser=await chromium.launch({
  executablePath,headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader']
});
const page=await browser.newPage({
  viewport:{width:915,height:412},isMobile:true,hasTouch:true,deviceScaleFactor:1,
  userAgent:'Mozilla/5.0 (Linux; Android 16; moto g - 2026) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36'
});
let errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});

// Keep the light fallback renderer healthy.
const url=BASE_URL+'/app/horizon-playable/?lat=41.5623&lon=-72.6506&span_km=1.0&build=4102&android=1&ci='+Date.now();
const r1=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
if(r1?.status()!==200)throw new Error('Android Horizon HTTP '+r1?.status());
await page.waitForFunction(()=>window.BP_HORIZON_V2?.ok===true,null,{timeout:90000});
const result=await page.evaluate(()=>{
  const rect=id=>{const e=document.getElementById(id);if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};
  return{probe:window.BP_HORIZON_V2,errorHidden:document.getElementById('error')?.hidden,canvas:!!document.querySelector('#world canvas'),move:rect('movePad'),run:rect('runBtn'),use:rect('useBtn'),light:rect('lightBtn'),weather:rect('weatherBtn')};
});
if(!result.errorHidden||!result.canvas||!result.probe?.mobileSafe||!(result.probe?.buildings>0)||!(result.probe?.roads>0))throw new Error('Android V2 render failed '+JSON.stringify(result));
for(const id of['runBtn','useBtn','lightBtn','weatherBtn']){
  if(!result[id.replace('Btn','')])throw new Error('Missing Android control '+id);
  await page.tap('#'+id);
}
let meaningful=errors.filter(x=>!/favicon|WebGL performance caveat|Failed to load resource: the server responded with a status of 404/i.test(x));
if(meaningful.length)throw new Error('Android V2 errors '+meaningful.join('\n'));
console.log('HORIZON_V2_ANDROID_TOUCH_PASS',JSON.stringify(result));

// Rich runtime: the joystick must actually translate the survivor, not merely render.
errors=[];
const richUrl=BASE_URL+'/app/horizon/preview.html?map=times_square&preview=city&cell=national&state=NY&lat=40.7580&lon=-73.9855&span_km=1.0&character=survivor&build='+EXPECTED_BUILD+'&android=1&ci='+Date.now();
const r2=await page.goto(richUrl,{waitUntil:'domcontentloaded',timeout:30000});
if(r2?.status()!==200)throw new Error('Rich Android Horizon HTTP '+r2?.status());
await page.waitForFunction(()=>window.BP_HORIZON_PLAYABLE?.ok===true&&window.BP_HORIZON_TEST?.playerPositionProbe,null,{timeout:45000});
const before=await page.evaluate(()=>window.BP_HORIZON_TEST.playerPositionProbe());
const joystick=await page.evaluate(async()=>{
  const pad=document.getElementById('movePad');
  if(!pad)return{ok:false,reason:'missing-pad'};
  const r=pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,pointerId=71;
  const send=(type,x,y,buttons)=>pad.dispatchEvent(new PointerEvent(type,{pointerId,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,buttons,bubbles:true,cancelable:true}));
  send('pointerdown',cx,cy,1);
  send('pointermove',cx,cy-Math.max(34,r.height*.30),1);
  await new Promise(resolve=>setTimeout(resolve,900));
  const during=window.BP_HORIZON_TEST.playerPositionProbe();
  send('pointerup',cx,cy-Math.max(34,r.height*.30),0);
  await new Promise(resolve=>setTimeout(resolve,120));
  const after=window.BP_HORIZON_TEST.playerPositionProbe();
  return{ok:true,rect:{width:r.width,height:r.height},during,after};
});
if(!joystick.ok)throw new Error('Rich joystick unavailable '+JSON.stringify(joystick));
const moved=Math.hypot((joystick.during?.x??before.x)-before.x,(joystick.during?.y??before.y)-before.y);
if(!(moved>.35))throw new Error('Rich Android joystick did not move player '+JSON.stringify({before,joystick,moved}));
if(joystick.during?.inputMode!=='native-pointer')throw new Error('Rich Android joystick not using native pointer mode '+JSON.stringify(joystick));
if(Math.abs(joystick.after?.mobileX||0)>.01||Math.abs(joystick.after?.mobileY||0)>.01)throw new Error('Rich Android joystick stuck after release '+JSON.stringify(joystick));
meaningful=errors.filter(x=>!/favicon|WebGL performance caveat|Failed to load resource: the server responded with a status of 404/i.test(x));
if(meaningful.length)throw new Error('Rich Android errors '+meaningful.join('\n'));
console.log('HORIZON_RICH_ANDROID_JOYSTICK_PASS',JSON.stringify({build:EXPECTED_BUILD,moved,before,after:joystick.after}));
await browser.close();
