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
  if(href!=='/app/horizon-playable/?build=3001')throw new Error('landing CTA stale: '+href);
}

async function testCell(cell){
  const url='https://bridgepointintelligence.online/app/horizon-playable/?build=3001&cell='+cell+'&ci='+Date.now();
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
  if(d.smoke?.visiblePack)throw new Error(cell+' backpack mesh should be hidden');
  if(!(d.smoke?.pickupCount>=10))throw new Error(cell+' visible loot too sparse: '+d.smoke?.pickupCount);
  if(!(d.smoke?.interiorAssets>=6))throw new Error(cell+' interior asset set incomplete: '+d.smoke?.interiorAssets);
  if(!(d.smoke?.packCapacity>=24))throw new Error(cell+' starter pack missing');
  if(!d.smoke?.weapon)throw new Error(cell+' equipped weapon missing');
  if(d.smoke?.spawnBlocked)throw new Error(cell+' player spawned inside building collision');
  if(!(d.smoke?.roadLayers>=4))throw new Error(cell+' road/sidewalk layers missing: '+d.smoke?.roadLayers);
  if(cell==='manhattan'){
    if(!(d.smoke?.entries>=500))throw new Error('manhattan enterable-building coverage too low: '+d.smoke?.entries);
    if(!(d.smoke?.streetLife?.trees>=100))throw new Error('manhattan trees too sparse: '+JSON.stringify(d.smoke?.streetLife));
    if(!(d.smoke?.streetLife?.bikes>=45))throw new Error('manhattan bikes too sparse: '+JSON.stringify(d.smoke?.streetLife));
    if(!(d.smoke?.streetLife?.vehicles>=60))throw new Error('manhattan vehicles too sparse: '+JSON.stringify(d.smoke?.streetLife));
    if(!(d.smoke?.streetLife?.grass>=400))throw new Error('manhattan grass detail too sparse: '+JSON.stringify(d.smoke?.streetLife));
    if(!(d.smoke?.streetLife?.benches>=25))throw new Error('manhattan benches too sparse: '+JSON.stringify(d.smoke?.streetLife));
    if(!(d.smoke?.streetLife?.planters>=40))throw new Error('manhattan planters too sparse: '+JSON.stringify(d.smoke?.streetLife));
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
  const systems=await page.evaluate(()=>{
    const t=window.BP_HORIZON_TEST;
    const feet=t?.feetProbe?.();
    const wave=t?.zombieWave?.();
    const equipment=t?.equipmentProbe?.();
    const pickup=t?.loosePickup?.();
    const death=t?.deathProbe?.();
    return {feet,wave,equipment,pickup,death};
  });
  console.log(JSON.stringify({cell,systems},null,2));
  if(!(systems.feet?.clearance>=-0.03&&systems.feet?.clearance<=0.12))
    throw new Error(cell+' survivor feet not grounded: '+JSON.stringify(systems.feet));
  if(systems.equipment?.visiblePack)throw new Error(cell+' visible backpack reappeared');
  if(systems.equipment?.equipment?.sidearm!=='Pistol'||systems.equipment?.equipment?.primary!=='Rifle')
    throw new Error(cell+' sidearm/back loadout failed: '+JSON.stringify(systems.equipment));
  if(!(systems.equipment?.hipChildren>0&&systems.equipment?.backChildren>0))
    throw new Error(cell+' holstered weapon visuals missing: '+JSON.stringify(systems.equipment));
  if(!(systems.wave?.active>=2&&systems.wave?.active<=7))
    throw new Error(cell+' zombie wave size invalid: '+JSON.stringify(systems.wave));
  if((systems.wave?.speeds||[]).some(v=>v>.5||v<.2))
    throw new Error(cell+' zombie walking speed invalid: '+JSON.stringify(systems.wave));
  if(!systems.pickup||systems.pickup.active!==false)
    throw new Error(cell+' visible loot pickup failed: '+JSON.stringify(systems.pickup));
  if(!(systems.death?.deadBefore===true&&systems.death?.deadAfter===false&&systems.death?.health===100))
    throw new Error(cell+' kill/respawn loop failed: '+JSON.stringify(systems.death));
}
try{
  await testLanding();
  await testCell('middletown');
  await testCell('manhattan');
  console.log('HORIZON_V3001_BROWSER_SMOKE_PASS');
  if(errors.length)console.log('pageErrors',errors);
  const serious=messages.filter(x=>/syntaxerror|referenceerror|typeerror/i.test(x));
  if(serious.length)throw new Error('Serious console errors: '+serious.join(' | '));
}finally{
  await context.close();
  await browser.close();
}
