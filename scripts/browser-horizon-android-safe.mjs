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

const context=await browser.newContext({
  viewport:{width:915,height:412},
  isMobile:true,
  hasTouch:true,
  deviceScaleFactor:1,
  userAgent:'Mozilla/5.0 (Linux; Android 16; moto g - 2026 Build/2623032) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
});
const page=await context.newPage();
const errors=[],messages=[];
page.on('pageerror',e=>errors.push(String(e?.stack||e)));
page.on('console',m=>messages.push(m.type()+': '+m.text()));
page.on('requestfailed',r=>messages.push('requestfailed: '+r.url()+' :: '+(r.failure()?.errorText||'unknown')));

try{
  const url='https://bridgepointintelligence.online/app/horizon-playable/?build=3052&cell=national&state=NY&lat=40.7128&lon=-74.0060&span_km=3.4&android_gate='+Date.now();
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  if(response?.status()!==200)throw new Error('HTTP '+response?.status());
  await page.waitForFunction(()=>Boolean(window.BP_MOBILE_SAFE?.enabled),null,{timeout:30000});
  await page.waitForFunction(()=>Boolean(window.BP_HORIZON_SMOKE),null,{timeout:120000});
  await page.waitForTimeout(1200);

  const state=await page.evaluate(async()=>{
    const safe=window.BP_MOBILE_SAFE||null,smoke=window.BP_HORIZON_SMOKE||null;
    const error=document.getElementById('error');
    const canvas=document.querySelector('#world canvas');
    let pixel=null,glInfo=null;
    if(canvas){
      const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
      if(gl){
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        const px=new Uint8Array(4),x=Math.max(0,Math.floor(gl.drawingBufferWidth*.5)),y=Math.max(0,Math.floor(gl.drawingBufferHeight*.5));
        gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
        pixel=[...px];
        glInfo={width:gl.drawingBufferWidth,height:gl.drawingBufferHeight};
      }
    }
    const stance=document.getElementById('stanceBtn');
    let hit=null,rect=null;
    if(stance){
      const r=stance.getBoundingClientRect();rect={left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
      const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);hit=el?.id||el?.closest?.('button')?.id||el?.tagName||null;
      window.__bpAndroidTap=0;stance.addEventListener('pointerdown',()=>window.__bpAndroidTap++,{once:true});
    }
    return{safe,smoke,errorHidden:error?.hidden,errorText:document.getElementById('errorText')?.textContent||'',pixel,glInfo,hit,rect,bodyClass:document.body.className};
  });

  await page.tap('#stanceBtn');
  const tapCount=await page.evaluate(()=>window.__bpAndroidTap||0);
  console.log(JSON.stringify({url,state,tapCount,messages:messages.slice(-30),errors},null,2));

  if(!state.safe?.enabled||!state.safe?.android)throw new Error('Android safe mode did not activate: '+JSON.stringify(state.safe));
  if(!state.safe?.sceneTrimmed)throw new Error('Android phone LOD did not activate');
  if(!state.errorHidden)throw new Error('error overlay visible: '+state.errorText);
  if(!state.smoke?.ok||state.smoke?.build!==3051)throw new Error('Horizon world failed under Android safe mode: '+JSON.stringify(state.smoke));
  if(!(state.smoke?.buildings>0&&state.smoke?.buildings<=520))throw new Error('Android building LOD invalid: '+state.smoke?.buildings);
  if(!(state.smoke?.navNodes>5))throw new Error('Android navigation graph missing: '+state.smoke?.navNodes);
  if(!state.glInfo||!state.pixel)throw new Error('Android WebGL canvas unavailable');
  if(state.pixel[0]>=248&&state.pixel[1]>=248&&state.pixel[2]>=248&&state.pixel[3]>0)throw new Error('Android canvas rendered white: '+JSON.stringify(state.pixel));
  if(state.hit!=='stanceBtn')throw new Error('stance control is covered by another layer: '+state.hit);
  if(tapCount!==1)throw new Error('touch/pointer did not reach stance control: '+tapCount);
  const serious=[...errors,...messages.filter(x=>/syntaxerror|referenceerror|typeerror/i.test(x))];
  if(serious.length)throw new Error('serious Android browser errors: '+serious.join(' | '));

  console.log('HORIZON_ANDROID_SAFE_PASS');
}finally{
  await context.close();
  await browser.close();
}
