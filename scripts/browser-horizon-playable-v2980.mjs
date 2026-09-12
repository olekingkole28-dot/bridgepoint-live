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
  if(href!=='/app/horizon-playable/?build=3030')throw new Error('landing CTA stale: '+href);
}

async function testCell(cell,extra={}){
  const u=new URL('https://bridgepointintelligence.online/app/horizon-playable/');
  u.searchParams.set('build','3030');u.searchParams.set('cell',cell);u.searchParams.set('ci',String(Date.now()));
  for(const [k,v] of Object.entries(extra))u.searchParams.set(k,String(v));
  const url=u.toString();
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  try{
    await page.waitForFunction(()=>Boolean(window.BP_HORIZON_SMOKE),null,{timeout:90000});
  }catch(e){
    const diag=await page.evaluate(()=>({
      readyState:document.readyState,
      loadText:document.getElementById('loadText')?.textContent,
      errorHidden:document.getElementById('error')?.hidden,
      errorText:document.getElementById('errorText')?.textContent,
      smoke:window.BP_HORIZON_SMOKE||null,
      scripts:[...document.scripts].map(x=>x.src||'inline')
    })).catch(()=>null);
    console.log(JSON.stringify({cell,startupTimeout:true,diag,messages:messages.slice(-80),errors:errors.slice(-40)},null,2));
    throw e;
  }
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
        rail:rect('fullscreenBtn'),
        aim:rect('aimBtn'),
        weapon:rect('weaponBtn')
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
  if(!d.smoke?.physicsReady||d.smoke?.physicsMode!=='rapier3d-kinematic')
    throw new Error(cell+' Rapier controller not active: '+JSON.stringify(d.smoke));
  if(!(d.smoke?.navNodes>5))throw new Error(cell+' navigation graph missing: '+d.smoke?.navNodes);
  if(!(d.smoke?.drivableVehicles>0))throw new Error(cell+' drivable vehicles missing');
  if(!String(d.smoke?.postFxMode||'').includes('gtao'))
    throw new Error(cell+' high-end post FX inactive: '+d.smoke?.postFxMode);
  if(cell==='manhattan'){
    if(!(d.smoke?.entries>=1590))throw new Error('manhattan enterable-building coverage too low: '+d.smoke?.entries);
    if(!(d.smoke?.streetLife?.trees>=100))throw new Error('manhattan trees too sparse: '+JSON.stringify(d.smoke?.streetLife));
    if(!(d.smoke?.streetLife?.bikes>=45))throw new Error('manhattan bikes too sparse: '+JSON.stringify(d.smoke?.streetLife));
    if(!(d.smoke?.streetLife?.vehicles>=60))throw new Error('manhattan vehicles too sparse: '+JSON.stringify(d.smoke?.streetLife));
    if(!(d.smoke?.streetLife?.grass>=400))throw new Error('manhattan grass detail too sparse: '+JSON.stringify(d.smoke?.streetLife));
    if(!(d.smoke?.streetLife?.benches>=25))throw new Error('manhattan benches too sparse: '+JSON.stringify(d.smoke?.streetLife));
    if(!(d.smoke?.streetLife?.planters>=40))throw new Error('manhattan planters too sparse: '+JSON.stringify(d.smoke?.streetLife));
    if(!(d.smoke?.streetLife?.windows>=1500))throw new Error('manhattan facade detail too sparse: '+JSON.stringify(d.smoke?.streetLife));
    if(!(d.smoke?.zombieVariants>=2))throw new Error('manhattan zombie variation missing: '+d.smoke?.zombieVariants);
  }
  if(!(d.canvases>=2))throw new Error(cell+' expected world + minimap canvases');
  const overlap=(a,b)=>a&&b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  if(overlap(d.rects.use,d.rects.swing))throw new Error(cell+' USE overlaps SWING');
  if(overlap(d.rects.swing,d.rects.run))throw new Error(cell+' SWING overlaps RUN');
  if(overlap(d.rects.use,d.rects.rail)||overlap(d.rects.swing,d.rects.rail)||overlap(d.rects.run,d.rects.rail)||overlap(d.rects.aim,d.rects.rail)||overlap(d.rects.weapon,d.rects.rail))
    throw new Error(cell+' gameplay buttons overlap right control rail');
  if(overlap(d.rects.aim,d.rects.weapon)||overlap(d.rects.aim,d.rects.swing)||overlap(d.rects.weapon,d.rects.use))
    throw new Error(cell+' aim/weapon controls overlap action controls');
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
      mobility:t?.spawnMobility?.(),
      sockets:t?.socketProbe?.(),
      gun:t?.gunProbe?.(),
      floors:t?.multiFloorProbe?.(),
      camera:t?.cameraProbe?.(),
      physics:t?.physicsProbe?.(),
      stance:t?.stanceProbe?.(),
      nav:t?.navProbe?.(),
      drive:t?.driveProbe?.(),
      postFx:t?.postFxProbe?.()
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
  if(!(controls.sockets?.rightHand&&controls.sockets?.leftHand&&controls.sockets?.handChildren>0))
    throw new Error(cell+' skeleton weapon sockets missing: '+JSON.stringify(controls.sockets));
  if(!(controls.gun?.side?.activeWeapon==='Pistol'&&controls.gun?.side?.after===controls.gun?.side?.before-1))
    throw new Error(cell+' pistol aim/fire failed: '+JSON.stringify(controls.gun));
  if(!(controls.gun?.primary?.activeWeapon==='Rifle'))
    throw new Error(cell+' rifle slot switching failed: '+JSON.stringify(controls.gun));
  if(controls.camera?.blocked)throw new Error(cell+' camera resolved inside collision: '+JSON.stringify(controls.camera));
  if(!controls.physics?.ready||!controls.physics?.hasBody||!controls.physics?.hasCollider||!controls.physics?.controller)
    throw new Error(cell+' Rapier runtime incomplete: '+JSON.stringify(controls.physics));
  if(!(controls.physics?.staticColliders>=3))throw new Error(cell+' static physics world too sparse: '+JSON.stringify(controls.physics));
  if(controls.stance?.crouch?.stance!=='crouch'||controls.stance?.after!=='stand'||!controls.stance?.jumpQueued)
    throw new Error(cell+' stance/jump controller failed: '+JSON.stringify(controls.stance));
  if(!(controls.nav?.nodes>5))throw new Error(cell+' nav graph unavailable: '+JSON.stringify(controls.nav));
  if(!controls.drive?.entered||!controls.drive?.exited||!(controls.drive?.moved>=0))
    throw new Error(cell+' drivable vehicle interaction failed: '+JSON.stringify(controls.drive));
  if(!(controls.postFx?.composer&&controls.postFx?.gtao&&controls.postFx?.bloom))
    throw new Error(cell+' composer passes missing: '+JSON.stringify(controls.postFx));
  if(cell==='manhattan'){
    if(!(controls.floors?.first?.floors>=5))throw new Error('manhattan tall-building floors missing: '+JSON.stringify(controls.floors));
    if(!(controls.floors?.second?.floor===2&&controls.floors?.second?.pickups>0))
      throw new Error('manhattan floor traversal/loot failed: '+JSON.stringify(controls.floors));
  }
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
  await testCell('national',{state:'NY',lat:40.7128,lon:-74.0060,span_km:2.2});
  const boundary=await page.evaluate(()=>window.BP_HORIZON_TEST?.boundaryProbe?.());
  console.log(JSON.stringify({boundary},null,2));
  if(!boundary?.inside||boundary?.insideState!=='NY'||boundary?.outside!==false)
    throw new Error('national jurisdiction containment failed: '+JSON.stringify(boundary));
  console.log('HORIZON_V3030_BROWSER_SMOKE_PASS');
  if(errors.length)console.log('pageErrors',errors);
  const serious=messages.filter(x=>/syntaxerror|referenceerror|typeerror/i.test(x));
  if(serious.length)throw new Error('Serious console errors: '+serious.join(' | '));
}finally{
  await context.close();
  await browser.close();
}
