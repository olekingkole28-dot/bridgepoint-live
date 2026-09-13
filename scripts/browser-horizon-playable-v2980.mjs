import fs from 'node:fs';
import { chromium } from 'playwright-core';

const horizonSource=fs.readFileSync('app/horizon-playable/horizon-world.js','utf8');
const buildMatch=horizonSource.match(/const BUILD_VERSION=(\d+)/);
if(!buildMatch)throw new Error('Could not resolve Horizon BUILD_VERSION from source');
const EXPECTED_BUILD=Number(buildMatch[1]);
const BASE_URL=String(process.env.HORIZON_TEST_BASE||'https://bridgepointintelligence.online').replace(/\/$/,'');

const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(p=>fs.existsSync(p));
if(!executablePath)throw new Error('No Chromium/Chrome found');

const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader']});
const context=await browser.newContext({
  viewport:{width:915,height:412},isMobile:true,hasTouch:true,deviceScaleFactor:1,
  userAgent:'Mozilla/5.0 (Linux; Android 16; moto g - 2026) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36'
});
const page=await context.newPage();
const errors=[];
const badResponses=[];
page.on('pageerror',e=>errors.push(String(e?.stack||e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
page.on('response',response=>{
  if(response.status()>=500)badResponses.push({status:response.status(),url:response.url()});
});

// Legacy direct renderer must remain healthy.
const directUrl=BASE_URL+'/app/horizon-playable/?lat=41.5623&lon=-72.6506&span_km=1.0&build=4101&ci='+Date.now();
const direct=await page.goto(directUrl,{waitUntil:'domcontentloaded',timeout:30000});
if(direct?.status()!==200)throw new Error('default Horizon HTTP '+direct?.status());
await page.waitForFunction(()=>window.BP_HORIZON_V2?.ok===true,null,{timeout:90000});
const legacy=await page.evaluate(()=>({probe:window.BP_HORIZON_V2,errorHidden:document.getElementById('error')?.hidden,canvas:!!document.querySelector('#world canvas')}));
if(!legacy.errorHidden||!legacy.canvas||legacy.probe?.build!==4100||!(legacy.probe?.buildings>0)||!(legacy.probe?.roads>0))throw new Error('Horizon V2 default failed '+JSON.stringify(legacy));
console.log('HORIZON_V2_DEFAULT_LIVE_PASS');

// Main Horizon: first playable frame is the primary gate.
const previewUrl=BASE_URL+'/app/horizon/preview.html?map=times_square&preview=city&cell=national&state=NY&lat=40.7580&lon=-73.9855&span_km=1.0&character=survivor&build='+EXPECTED_BUILD+'&ci='+Date.now();
const pr=await page.goto(previewUrl,{waitUntil:'domcontentloaded',timeout:30000});
if(pr?.status()!==200)throw new Error('Horizon showcase HTTP '+pr?.status());
await page.waitForFunction(()=>window.BP_HORIZON_PLAYABLE?.ok===true,null,{timeout:30000});
const quick=await page.evaluate(()=>window.BP_HORIZON_PLAYABLE);
if(quick?.build!==EXPECTED_BUILD)throw new Error('Wrong live Horizon build; expected '+EXPECTED_BUILD+' '+JSON.stringify(quick));
if(quick?.stance!=='stand'||!quick?.weaponSocket||quick.weaponSocket==='playerRoot')throw new Error('Fast-start stance/socket failed '+JSON.stringify(quick));
if(!(quick?.instantBuildings>0)||!(quick?.readyMs>=0)||quick.readyMs>15000)throw new Error('Fast playable gate failed '+JSON.stringify(quick));

await page.waitForFunction(()=>window.BP_HORIZON_QUICK_TEST?.switchAllWeapons,null,{timeout:10000});
const quickFacing=await page.evaluate(()=>window.BP_HORIZON_QUICK_TEST.facing());
const quickWeapons=await page.evaluate(()=>window.BP_HORIZON_QUICK_TEST.switchAllWeapons());
const worldUi=await page.evaluate(()=>({
  worldMode:window.BP_HORIZON_WORLD_MODE||null,
  jurisdictionOptions:document.querySelectorAll('#jurisdictionSelect option').length,
  mapPreset:window.BP_HORIZON_PLAYABLE?.map||null
}));
if(!(quickFacing?.dot>.92)||quickFacing?.locomotionRootMatchesTravel!==true)throw new Error('Visual facing still reversed '+JSON.stringify(quickFacing));
if(!quickWeapons.length||quickWeapons.some(x=>!x.visible||x.children<1))throw new Error('Weapon switch visibility failed '+JSON.stringify(quickWeapons));
if(worldUi.worldMode!=='continuous_us'||worldUi.mapPreset!=='unified_us'||worldUi.jurisdictionOptions<50)throw new Error('Continuous U.S. world contract missing '+JSON.stringify(worldUi));

// Essential mobile hydration must complete quickly; optional desktop assets are not part of this gate.
await page.waitForFunction(()=>window.BP_HORIZON_HYDRATION?.complete===true||window.BP_HORIZON_SMOKE?.ok===false,null,{timeout:20000});
const hydrationGate=await page.evaluate(()=>({hydration:window.BP_HORIZON_HYDRATION,smoke:window.BP_HORIZON_SMOKE}));
if(hydrationGate?.smoke?.ok===false)throw new Error('Horizon boot failed '+JSON.stringify(hydrationGate.smoke));
const hydration=await page.evaluate(()=>window.BP_HORIZON_HYDRATION);
if(!(hydration?.readyMs>=0)||hydration.readyMs>12000)throw new Error('Mobile hydration too slow '+JSON.stringify(hydration));
await page.waitForFunction(()=>window.BP_HORIZON_SMOKE?.ok===true&&window.BP_HORIZON_TEST?.terrainGuardProbe,null,{timeout:15000});

const smoke=await page.evaluate(()=>window.BP_HORIZON_SMOKE);
const playerAsset=await page.evaluate(()=>window.BP_HORIZON_TEST.playerAssetProbe());
const aim=await page.evaluate(()=>window.BP_HORIZON_TEST.aimProbe());
const held=await page.evaluate(()=>window.BP_HORIZON_TEST.heldWeaponProbe());
const terrainGuard=await page.evaluate(()=>window.BP_HORIZON_TEST.terrainGuardProbe());
const controls=await page.evaluate(()=>window.BP_HORIZON_TEST.cardinalControlsProbe());
const movementFacing=await page.evaluate(()=>window.BP_HORIZON_TEST.movementFacingProbe?.());
const cameraModes=await page.evaluate(()=>window.BP_HORIZON_TEST.cameraModesProbe?.());
const inputIsolation=await page.evaluate(()=>window.BP_HORIZON_TEST.inputIsolationProbe?.());
await page.waitForFunction(()=>window.BP_HORIZON_TEST?.loadingLodProbe?.()?.detailHydrationComplete===true,null,{timeout:30000}).catch(()=>{});
const loadingLod=await page.evaluate(()=>window.BP_HORIZON_TEST.loadingLodProbe?.());

if(!terrainGuard?.ok)throw new Error('Terrain guard failed '+JSON.stringify(terrainGuard));
if(playerAsset.stance!=='stand'||!playerAsset.weaponSocket||playerAsset.weaponSocket==='playerRoot')throw new Error('Standing/hand-socket contract failed '+JSON.stringify(playerAsset));
if(!(aim.aimed<aim.before-5)||!aim.crosshairVisible||!aim.buttonActive)throw new Error('Aim/FOV interaction failed '+JSON.stringify(aim));
if(!held?.visible||held.children<1||held.distance>3.2)throw new Error('Equipped weapon not visibly held '+JSON.stringify(held));
if(smoke?.mapCount!==1||smoke?.mapPreset!=='unified_us'||smoke?.endlessHorde!==true||!(smoke?.endlessCap>=18)||smoke?.hydrationComplete!==true||smoke?.proceduralFastHydration!==true||smoke?.cloneRecovery4238!==true||smoke?.denseApocalypse!==true)throw new Error('Continuous Horizon world contract failed '+JSON.stringify(smoke));
for(const id of ['graveborn','mauler','wretch','abomination','hound','spider','crow'])if(!smoke?.enemyArchetypes?.includes(id))throw new Error('Missing essential hostile '+id+' '+JSON.stringify(smoke.enemyArchetypes));
if(!(smoke?.groundDetails>100)||!(smoke?.entries>0)||!(smoke?.instantMassing>0))throw new Error('World density/door/building gate failed '+JSON.stringify(smoke));
if(controls.locomotionAlwaysFacesTravel!==true||controls.nonAimingFirearmFacesTravel!==true||controls.shooterAimFacesCamera!==true||controls.aimingBackpedalAllowed!==true)throw new Error('Shooter movement contract broken '+JSON.stringify(controls));
if(!Array.isArray(controls.cameraModes)||controls.cameraModes.join('|')!=='firstPerson|thirdPersonClose|thirdPersonFar')throw new Error('Camera mode contract missing '+JSON.stringify(controls));
if(!Array.isArray(cameraModes)||cameraModes.length!==3)throw new Error('Camera mode probe missing '+JSON.stringify(cameraModes));
const fp=cameraModes.find(x=>x.mode==='firstPerson'),tp=cameraModes.find(x=>x.mode==='thirdPersonClose');
if(!fp||fp.bodyVisible!==false||fp.rigVisible!==true||fp.weaponVisible!==true)throw new Error('First-person presentation failed '+JSON.stringify(cameraModes));
if(!tp||tp.bodyVisible!==true||tp.rigVisible!==false)throw new Error('Third-person presentation failed '+JSON.stringify(cameraModes));
if(inputIsolation?.pointerOwnership!==true||inputIsolation?.canvasTouchAction!=='none'||inputIsolation?.settingsPanel!==true)throw new Error('Touch pointer isolation/settings missing '+JSON.stringify(inputIsolation));
if(loadingLod?.mobile===true){
  if((loadingLod.facadeCandidatesRendered||0)>160||(loadingLod.facadeWindows||0)>2800)throw new Error('Mobile facade LOD budget regressed '+JSON.stringify(loadingLod));
  if((loadingLod.buildingPartRingsRendered||0)>180)throw new Error('Mobile building-part LOD budget regressed '+JSON.stringify(loadingLod));
  if(loadingLod.parcelLayerBuilt===true||loadingLod.parcelBuildPending===true)throw new Error('Hidden parcel layer built during boot '+JSON.stringify(loadingLod));
}
if(!movementFacing?.all||movementFacing.samples?.some(x=>!x.ok))throw new Error('Rendered movement-facing regression '+JSON.stringify(movementFacing));
if(!(controls.forward.dy>.99)||!(controls.backward.dy<-.99)||!(controls.left.dx<-.99)||!(controls.right.dx>.99))throw new Error('Cardinal controls broken '+JSON.stringify(controls));

const gestureIsolation=await page.evaluate(async()=>{
  const weaponBefore=window.BP_HORIZON_TEST?.heldWeaponProbe?.()?.weapon||null;
  const pad=document.getElementById('movePad');
  const canvas=document.querySelector('#world canvas');
  if(!pad||!canvas)return{ok:false,reason:'missing pad/canvas',weaponBefore};

  const emit=(el,type,id,x,y)=>el.dispatchEvent(new PointerEvent(type,{
    bubbles:true,cancelable:true,composed:true,pointerId:id,pointerType:'touch',
    isPrimary:id===701,clientX:x,clientY:y,buttons:type==='pointerup'?0:1
  }));
  const pr=pad.getBoundingClientRect();
  emit(pad,'pointerdown',701,pr.left+pr.width*.5,pr.top+pr.height*.5);
  emit(pad,'pointermove',701,pr.left+pr.width*.5,pr.top+pr.height*.18);
  emit(pad,'pointerup',701,pr.left+pr.width*.5,pr.top+pr.height*.18);

  const cr=canvas.getBoundingClientRect();
  emit(canvas,'pointerdown',702,cr.left+cr.width*.68,cr.top+cr.height*.50);
  emit(canvas,'pointermove',702,cr.left+cr.width*.56,cr.top+cr.height*.43);
  emit(canvas,'pointerup',702,cr.left+cr.width*.56,cr.top+cr.height*.43);

  await new Promise(r=>setTimeout(r,80));
  const weaponAfter=window.BP_HORIZON_TEST?.heldWeaponProbe?.()?.weapon||null;
  const isolation=window.BP_HORIZON_TEST?.inputIsolationProbe?.();
  return{ok:weaponBefore===weaponAfter,weaponBefore,weaponAfter,isolation};
});
if(!gestureIsolation?.ok)throw new Error('Movement/look gesture changed weapon '+JSON.stringify(gestureIsolation));

const meaningful=errors.filter(x=>!/favicon|WebGL performance caveat|Failed to load resource: the server responded with a status of (404|500)/i.test(x));
if(badResponses.length)throw new Error('Horizon HTTP 5xx '+JSON.stringify(badResponses));
if(meaningful.length)throw new Error('Horizon console errors '+meaningful.join('\n'));
console.log('HORIZON_FAST_MOBILE_PASS',JSON.stringify({quick,hydration,quickFacing,movementFacing,weaponCount:quickWeapons.length,cameraModes,inputIsolation,loadingLod,gestureIsolation,worldUi}));
await browser.close();
