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
  deviceScaleFactor:1
});
const page=await context.newPage();
const messages=[],errors=[];
page.on('console',m=>messages.push(m.type()+': '+m.text()));
page.on('pageerror',e=>errors.push(String(e?.stack||e)));
page.on('requestfailed',r=>messages.push('requestfailed: '+r.url()+' :: '+(r.failure()?.errorText||'unknown')));

async function testLanding(){
  const url='https://bridgepointintelligence.online/app/horizon/?ci='+Date.now();
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  const href=await page.locator('a.cta').first().getAttribute('href');
  console.log(JSON.stringify({landing:true,status:response?.status(),url,href},null,2));
  if(response?.status()!==200)throw new Error('landing HTTP '+response?.status());
  if(href!=='/app/horizon-playable/?build=2996')throw new Error('landing CTA stale: '+href);
}

async function testCell(cell){
  const url='https://bridgepointintelligence.online/app/horizon-playable/?build=2996&cell='+cell+'&ci='+Date.now();
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>Boolean(window.BP_HORIZON_SMOKE),null,{timeout:90000});
  const d=await page.evaluate(()=>{
    const rect=id=>{
      const e=document.getElementById(id); if(!e) return null;
      const r=e.getBoundingClientRect();
      return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
    };
    return {
      smoke:window.BP_HORIZON_SMOKE,
      errorHidden:document.getElementById('error')?.hidden,
      text:document.getElementById('loadText')?.textContent,
      canvases:document.querySelectorAll('canvas').length,
      webgl:Boolean(document.createElement('canvas').getContext('webgl')),
      rects:{
        use:rect('interactBtn'),
        swing:rect('attackBtn'),
        run:rect('sprintBtn'),
        rail:rect('fullscreenBtn')
      }
    };
  });
  console.log(JSON.stringify({cell,status:response?.status(),url,...d},null,2));
  if(response?.status()!==200)throw new Error(cell+' HTTP '+response?.status());
  if(!d.webgl)throw new Error(cell+' WebGL unavailable');
  if(!d.errorHidden)throw new Error(cell+' error box visible');
  if(!d.smoke?.ok)throw new Error(cell+' smoke failed: '+d.smoke?.error);
  if(!d.smoke?.player)throw new Error(cell+' player missing');
  if(!(d.smoke?.buildings>0))throw new Error(cell+' buildings missing');
  if(!(d.smoke?.entries>0))throw new Error(cell+' enterable buildings missing');
  if(!(d.smoke?.interiorAssets>=6))throw new Error(cell+' interior asset set incomplete: '+d.smoke?.interiorAssets);
  if(!(d.smoke?.packCapacity>=24))throw new Error(cell+' starter pack missing');
  if(!d.smoke?.weapon)throw new Error(cell+' equipped weapon missing');
  if(d.smoke?.spawnBlocked)throw new Error(cell+' player spawned inside building collision');
  if(!(d.smoke?.roadLayers>=4))throw new Error(cell+' road/sidewalk layers missing: '+d.smoke?.roadLayers);
  if(cell==='manhattan'){
    if(!(d.smoke?.streetLife?.trees>=30))throw new Error('manhattan trees too sparse: '+JSON.stringify(d.smoke?.streetLife));
    if(!(d.smoke?.streetLife?.bikes>=12))throw new Error('manhattan bikes too sparse: '+JSON.stringify(d.smoke?.streetLife));
    if(!(d.smoke?.streetLife?.vehicles>=20))throw new Error('manhattan vehicles too sparse: '+JSON.stringify(d.smoke?.streetLife));
  }
  if(!(d.canvases>=2))throw new Error(cell+' expected world + minimap canvases');
  const overlap=(a,b)=>a&&b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  if(overlap(d.rects.use,d.rects.swing))throw new Error(cell+' USE overlaps SWING');
  if(overlap(d.rects.swing,d.rects.run))throw new Error(cell+' SWING overlaps RUN');
  if(overlap(d.rects.use,d.rects.rail)||overlap(d.rects.swing,d.rects.rail)||overlap(d.rects.run,d.rects.rail))
    throw new Error(cell+' gameplay buttons overlap right control rail');
  const play=await page.evaluate(()=>{
    const t=window.BP_HORIZON_TEST;
    const entered=t?.enterFirst?.();
    const searched=t?.searchFirst?.();
    const swing=t?.swing?.();
    const exited=t?.exit?.();
    return {entered,searched,swing,exited};
  });
  console.log(JSON.stringify({cell,play},null,2));
  if(!play.entered?.interiorMode||!(play.entered?.containers>0))throw new Error(cell+' interior generation failed');
  if(!(play.searched?.lootCount>2))throw new Error(cell+' interior search did not add loot');
  if(!(play.swing?.swingTime>0))throw new Error(cell+' melee swing did not start');
  if(play.exited?.interiorMode!==false)throw new Error(cell+' interior exit failed');
  const controls=await page.evaluate(()=>{
    const t=window.BP_HORIZON_TEST;
    return {
      forward:t?.directionProbe?.('forward'),
      backward:t?.directionProbe?.('backward'),
      left:t?.directionProbe?.('left'),
      right:t?.directionProbe?.('right'),
      weapon:t?.weaponSize?.(),
      mobility:t?.spawnMobility?.()
    };
  });
  console.log(JSON.stringify({cell,controls},null,2));
  if(!(controls.forward?.dy>0))throw new Error(cell+' forward does not move forward');
  if(!(controls.backward?.dy<0))throw new Error(cell+' backward does not move backward');
  if(!(controls.left?.dx<0))throw new Error(cell+' left does not move left');
  if(!(controls.right?.dx>0))throw new Error(cell+' right does not move right');
  if(!(controls.weapon?.longest>0.15&&controls.weapon?.longest<1.15))
    throw new Error(cell+' weapon scale unreasonable: '+JSON.stringify(controls.weapon));
  if(controls.mobility?.blockedHere)throw new Error(cell+' spawn mobility says player is blocked');
  const openCount=Object.values(controls.mobility?.open||{}).filter(Boolean).length;
  if(openCount<2)throw new Error(cell+' spawn has fewer than 2 open movement directions: '+JSON.stringify(controls.mobility));
}
try{
  await testLanding();
  await testCell('middletown');
  await testCell('manhattan');
  console.log('HORIZON_V2996_BROWSER_SMOKE_PASS');
  if(errors.length)console.log('pageErrors',errors);
  const serious=messages.filter(x=>/syntaxerror|referenceerror|typeerror/i.test(x));
  if(serious.length)throw new Error('Serious console errors: '+serious.join(' | '));
}finally{
  await context.close();
  await browser.close();
}
