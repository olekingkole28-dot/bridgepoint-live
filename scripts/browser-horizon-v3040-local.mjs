import fs from 'node:fs';
import { chromium } from 'playwright-core';

const base=(process.env.BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
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
  executablePath,headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader']
});
const context=await browser.newContext({viewport:{width:915,height:412},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const page=await context.newPage();
const pageErrors=[],messages=[];
page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)));
page.on('console',m=>messages.push(m.type()+': '+m.text()));
page.on('requestfailed',r=>messages.push('requestfailed: '+r.url()+' :: '+(r.failure()?.errorText||'unknown')));

function overlap(a,b){
  return Boolean(a&&b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);
}

async function openWorld(extra={}){
  const u=new URL(base+'/app/horizon-playable/');
  u.searchParams.set('build','3040');
  u.searchParams.set('cell','national');
  u.searchParams.set('state',extra.state||'NY');
  u.searchParams.set('lat',String(extra.lat??40.7128));
  u.searchParams.set('lon',String(extra.lon??-74.0060));
  u.searchParams.set('span_km',String(extra.span_km??2.2));
  u.searchParams.set('ci',String(Date.now()));
  const response=await page.goto(u.toString(),{waitUntil:'domcontentloaded',timeout:30000});
  if(response?.status()!==200)throw new Error('HTTP '+response?.status());
  try{
    await page.waitForFunction(()=>Boolean(window.BP_HORIZON_SMOKE),null,{timeout:120000});
  }catch(e){
    const diag=await page.evaluate(()=>({
      ready:document.readyState,
      load:document.getElementById('loadText')?.textContent,
      errorHidden:document.getElementById('error')?.hidden,
      errorText:document.getElementById('errorText')?.textContent,
      scripts:[...document.scripts].map(x=>x.src||'inline')
    })).catch(()=>null);
    console.log(JSON.stringify({startupTimeout:true,diag,pageErrors,messages:messages.slice(-80)},null,2));
    throw e;
  }
  return u.toString();
}

try{
  const landing=await page.goto(base+'/app/horizon/?ci='+Date.now(),{waitUntil:'domcontentloaded',timeout:30000});
  if(landing?.status()!==200)throw new Error('landing HTTP '+landing?.status());
  const href=await page.locator('a.cta').first().getAttribute('href');
  if(href!=='/app/horizon-playable/?build=3040')throw new Error('staged landing CTA stale: '+href);

  const url=await openWorld();
  const state=await page.evaluate(()=>{
    const rect=id=>{
      const e=document.getElementById(id);if(!e)return null;
      const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
    };
    return{
      smoke:window.BP_HORIZON_SMOKE,
      errorHidden:document.getElementById('error')?.hidden,
      options:document.getElementById('jurisdictionSelect')?.options?.length||0,
      codes:[...document.getElementById('jurisdictionSelect')?.options||[]].map(o=>o.value),
      rects:{
        use:rect('interactBtn'),attack:rect('attackBtn'),aim:rect('aimBtn'),weapon:rect('weaponBtn'),
        reload:rect('reloadBtn'),jump:rect('jumpBtn'),stance:rect('stanceBtn'),run:rect('sprintBtn'),rail:rect('fullscreenBtn')
      }
    };
  });
  console.log(JSON.stringify({url,state},null,2));
  if(!state.errorHidden)throw new Error('error box visible');
  if(!state.smoke?.ok||state.smoke?.build!==3040)throw new Error('3040 smoke missing');
  if(!state.smoke?.player)throw new Error('player missing');
  if(!state.smoke?.physicsReady||state.smoke?.physicsMode!=='rapier3d-kinematic')throw new Error('Rapier kinematic controller inactive: '+JSON.stringify(state.smoke));
  if(!String(state.smoke?.postFxMode||'').includes('gtao'))throw new Error('GTAO/post processing inactive: '+state.smoke?.postFxMode);
  if(!(state.smoke?.navNodes>5))throw new Error('navigation graph missing');
  if(!(state.smoke?.entries>0))throw new Error('enterable building doors missing');
  if(!(state.smoke?.drivableVehicles>0))throw new Error('drivable vehicles missing');
  if(state.smoke?.visiblePack)throw new Error('hidden backpack became visible');
  if(state.smoke?.weaponRegistryMode!=='supabase'||state.smoke?.weaponRegistrySize<6)throw new Error('Supabase weapon registry not active: '+JSON.stringify(state.smoke));
  if(state.options<57)throw new Error('U.S. jurisdiction selector incomplete: '+state.options);
  for(const code of ['NY','CA','TX','FL','AK','HI','DC','PR','GU','VI','AS','MP','UM']){
    if(!state.codes.includes(code))throw new Error('jurisdiction missing: '+code);
  }

  const actionRects=Object.entries(state.rects).filter(([k])=>k!=='rail');
  for(let i=0;i<actionRects.length;i++)for(let j=i+1;j<actionRects.length;j++){
    if(overlap(actionRects[i][1],actionRects[j][1]))throw new Error('mobile controls overlap: '+actionRects[i][0]+' / '+actionRects[j][0]);
  }
  for(const [name,r] of actionRects)if(overlap(r,state.rects.rail))throw new Error(name+' overlaps utility rail');

  const probes=await page.evaluate(()=>{
    const t=window.BP_HORIZON_TEST;
    return{
      registry:t?.registryProbe?.(),
      sockets:t?.socketProbe?.(),
      reload:t?.reloadProbe?.(),
      recoil:t?.recoilProbe?.(),
      physics:t?.physicsProbe?.(),
      camera:t?.cameraProbe?.(),
      nav:t?.navProbe?.(),
      drive:t?.driveProbe?.(),
      floors:t?.multiFloorProbe?.(),
      stance:t?.stanceProbe?.()
    };
  });
  console.log(JSON.stringify({probes},null,2));
  if(probes.registry?.mode!=='supabase'||probes.registry?.unique<6)throw new Error('weapon registry probe failed: '+JSON.stringify(probes.registry));
  if(!probes.registry?.pistol?.reload_time_seconds||!probes.registry?.rifle?.recoil_pitch_deg)throw new Error('weapon mechanical config missing');
  if(!(probes.sockets?.rightHand&&probes.sockets?.leftHand&&probes.sockets?.hip&&probes.sockets?.back))throw new Error('weapon sockets missing: '+JSON.stringify(probes.sockets));
  if(!/hips/i.test(String(probes.sockets?.hipParent||'')))throw new Error('sidearm not attached to hip skeleton: '+JSON.stringify(probes.sockets));
  if(!/(torso|abdomen|spine)/i.test(String(probes.sockets?.backParent||'')))throw new Error('primary not attached to torso/back skeleton: '+JSON.stringify(probes.sockets));
  if(!probes.reload?.started||probes.reload?.active||probes.reload?.mag!==probes.reload?.expected)throw new Error('timed reload failed: '+JSON.stringify(probes.reload));
  if(!(probes.recoil?.after?.pitch>probes.recoil?.before?.pitch))throw new Error('recoil failed: '+JSON.stringify(probes.recoil));
  if(!probes.physics?.ready||!probes.physics?.controller)throw new Error('Rapier probe failed');
  if(probes.camera?.blocked)throw new Error('camera collision protection failed');
  if(!(probes.nav?.nodes>5))throw new Error('pathfinding graph probe failed');
  if(!probes.drive?.entered||!probes.drive?.exited)throw new Error('vehicle interaction failed');
  if(probes.stance?.crouch?.stance!=='crouch'||probes.stance?.after!=='stand')throw new Error('stance controller failed');
  if(!(probes.floors?.first?.floors>=2&&probes.floors?.second?.floor===2))throw new Error('multi-floor interior traversal failed: '+JSON.stringify(probes.floors));

  const errors=pageErrors.filter(x=>/SyntaxError|ReferenceError|TypeError/i.test(x));
  const serious=messages.filter(x=>/syntaxerror|referenceerror|typeerror/i.test(x));
  if(errors.length||serious.length)throw new Error('serious browser errors: '+[...errors,...serious].join(' | '));

  console.log('HORIZON_V3040_BRANCH_GATE_PASS');
}finally{
  await context.close();
  await browser.close();
}
