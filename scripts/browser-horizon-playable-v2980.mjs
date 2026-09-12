import fs from 'node:fs';
import { chromium } from 'playwright-core';

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
page.on('pageerror',e=>errors.push(String(e?.stack||e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});

// Legacy direct renderer must remain healthy.
const directUrl='https://bridgepointintelligence.online/app/horizon-playable/?lat=41.5623&lon=-72.6506&span_km=1.0&build=4101&ci='+Date.now();
const direct=await page.goto(directUrl,{waitUntil:'domcontentloaded',timeout:30000});
if(direct?.status()!==200)throw new Error('default Horizon HTTP '+direct?.status());
await page.waitForFunction(()=>window.BP_HORIZON_V2?.ok===true,null,{timeout:90000});
const legacy=await page.evaluate(()=>({probe:window.BP_HORIZON_V2,errorHidden:document.getElementById('error')?.hidden,canvas:!!document.querySelector('#world canvas')}));
if(!legacy.errorHidden||!legacy.canvas||legacy.probe?.build!==4100||!(legacy.probe?.buildings>0)||!(legacy.probe?.roads>0))throw new Error('Horizon V2 default failed '+JSON.stringify(legacy));
console.log('HORIZON_V2_DEFAULT_LIVE_PASS');

// Main Horizon 4235: first playable frame is the primary gate.
const previewUrl='https://bridgepointintelligence.online/app/horizon/preview.html?map=times_square&preview=city&cell=national&state=NY&lat=40.7580&lon=-73.9855&span_km=1.0&character=survivor&build=4235&ci='+Date.now();
const pr=await page.goto(previewUrl,{waitUntil:'domcontentloaded',timeout:30000});
if(pr?.status()!==200)throw new Error('Horizon showcase HTTP '+pr?.status());
await page.waitForFunction(()=>window.BP_HORIZON_PLAYABLE?.ok===true,null,{timeout:30000});
const quick=await page.evaluate(()=>window.BP_HORIZON_PLAYABLE);
if(quick?.build!==4235)throw new Error('Wrong live Horizon build '+JSON.stringify(quick));
if(quick?.stance!=='stand'||!quick?.weaponSocket||quick.weaponSocket==='playerRoot')throw new Error('Fast-start stance/socket failed '+JSON.stringify(quick));
if(!(quick?.instantBuildings>0)||!(quick?.readyMs>=0)||quick.readyMs>15000)throw new Error('Fast playable gate failed '+JSON.stringify(quick));

await page.waitForFunction(()=>window.BP_HORIZON_QUICK_TEST?.switchAllWeapons,null,{timeout:10000});
const quickFacing=await page.evaluate(()=>window.BP_HORIZON_QUICK_TEST.facing());
const quickWeapons=await page.evaluate(()=>window.BP_HORIZON_QUICK_TEST.switchAllWeapons());
const mapUi=await page.evaluate(()=>({maps:document.querySelectorAll('#mapSelect option').length,map:document.querySelector('#mapSelect')?.value}));
if(!(quickFacing?.dot>.92)||quickFacing?.locomotionRootMatchesTravel!==true)throw new Error('Visual facing still reversed '+JSON.stringify(quickFacing));
if(!quickWeapons.length||quickWeapons.some(x=>!x.visible||x.children<1))throw new Error('Weapon switch visibility failed '+JSON.stringify(quickWeapons));
if(mapUi.maps!==50||mapUi.map!=='times_square')throw new Error('50-map selector missing '+JSON.stringify(mapUi));

// Essential mobile hydration must complete quickly; optional desktop assets are not part of this gate.
await page.waitForFunction(()=>window.BP_HORIZON_HYDRATION?.complete===true,null,{timeout:20000});
const hydration=await page.evaluate(()=>window.BP_HORIZON_HYDRATION);
if(!(hydration?.readyMs>=0)||hydration.readyMs>12000)throw new Error('Mobile hydration too slow '+JSON.stringify(hydration));
await page.waitForFunction(()=>window.BP_HORIZON_SMOKE?.ok===true&&window.BP_HORIZON_TEST?.terrainGuardProbe,null,{timeout:15000});

const smoke=await page.evaluate(()=>window.BP_HORIZON_SMOKE);
const playerAsset=await page.evaluate(()=>window.BP_HORIZON_TEST.playerAssetProbe());
const aim=await page.evaluate(()=>window.BP_HORIZON_TEST.aimProbe());
const held=await page.evaluate(()=>window.BP_HORIZON_TEST.heldWeaponProbe());
const terrainGuard=await page.evaluate(()=>window.BP_HORIZON_TEST.terrainGuardProbe());
const controls=await page.evaluate(()=>window.BP_HORIZON_TEST.cardinalControlsProbe());

if(!terrainGuard?.ok)throw new Error('Terrain guard failed '+JSON.stringify(terrainGuard));
if(playerAsset.stance!=='stand'||!playerAsset.weaponSocket||playerAsset.weaponSocket==='playerRoot')throw new Error('Standing/hand-socket contract failed '+JSON.stringify(playerAsset));
if(!(aim.aimed<aim.before-5)||!aim.crosshairVisible||!aim.buttonActive)throw new Error('Aim/FOV interaction failed '+JSON.stringify(aim));
if(!held?.visible||held.children<1||held.distance>3.2)throw new Error('Equipped weapon not visibly held '+JSON.stringify(held));
if(smoke?.mapCount!==50||smoke?.endlessHorde!==true||!(smoke?.endlessCap>=18)||smoke?.hydrationComplete!==true||smoke?.proceduralFastHydration!==true||smoke?.denseApocalypse!==true)throw new Error('4235 world contract failed '+JSON.stringify(smoke));
for(const id of ['graveborn','mauler','wretch','abomination','hound','spider','crow'])if(!smoke?.enemyArchetypes?.includes(id))throw new Error('Missing essential hostile '+id+' '+JSON.stringify(smoke.enemyArchetypes));
if(!(smoke?.groundDetails>100)||!(smoke?.entries>0)||!(smoke?.instantMassing>0))throw new Error('World density/door/building gate failed '+JSON.stringify(smoke));
if(Math.abs(controls.modelYawOffset)>1e-6||controls.shooterAimFacesCamera!==true||controls.aimingBackpedalAllowed!==true)throw new Error('Shooter movement contract broken '+JSON.stringify(controls));
if(!(controls.forward.dy>.99)||!(controls.backward.dy<-.99)||!(controls.left.dx<-.99)||!(controls.right.dx>.99))throw new Error('Cardinal controls broken '+JSON.stringify(controls));

const meaningful=errors.filter(x=>!/favicon|WebGL performance caveat|Failed to load resource: the server responded with a status of 404/i.test(x));
if(meaningful.length)throw new Error('Horizon console errors '+meaningful.join('\n'));
console.log('HORIZON_4235_FAST_MOBILE_PASS',JSON.stringify({quick,hydration,quickFacing,weaponCount:quickWeapons.length}));
await browser.close();
