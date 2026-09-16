const { chromium } = require('playwright');
const fs = require('fs');

const SITE = 'https://bridgepointintelligence.online/app/?capture=perfect-v2';
const PROFILE = 'demo-output-v2/chrome-profile';
const OUT = 'demo-output-v2';

const CITIES = [
  ['NEW YORK CITY','New York, NY',-73.9857,40.7484,16.5,62,-18],
  ['LOS ANGELES','Los Angeles, CA',-118.2437,34.0522,16.0,60,18],
  ['CHICAGO','Chicago, IL',-87.6298,41.8781,16.2,62,-15],
  ['HOUSTON','Houston, TX',-95.3698,29.7604,16.0,58,16],
  ['PHOENIX','Phoenix, AZ',-112.0740,33.4484,15.9,58,-14],
  ['PHILADELPHIA','Philadelphia, PA',-75.1652,39.9526,16.2,60,16],
  ['SAN ANTONIO','San Antonio, TX',-98.4936,29.4241,16.0,58,-12],
  ['SAN DIEGO','San Diego, CA',-117.1611,32.7157,16.0,60,18],
  ['DALLAS','Dallas, TX',-96.7970,32.7767,16.2,60,-16],
  ['SAN FRANCISCO','San Francisco, CA',-122.4194,37.7749,16.2,62,18],
  ['MIAMI','Miami, FL',-80.1918,25.7617,16.2,60,-18],
  ['SEATTLE','Seattle, WA',-122.3321,47.6062,16.1,60,18],
  ['DENVER','Denver, CO',-104.9903,39.7392,16.0,58,-16],
  ['BOSTON','Boston, MA',-71.0589,42.3601,16.2,60,15],
  ['HARTFORD','Hartford, CT',-72.6734,41.7658,16.5,62,-18]
];

const PROPERTIES = [
  '140 Hollister Street, Santa Monica, CA',
  '1330 North Hillcrest Avenue, Fayetteville, AR',
  '1215 Roberts Avenue West, Immokalee, FL',
  '902 High Street, Montgomery, AL',
  '46 Hynes Avenue, Groton, CT',
  '471 Washington Avenue, North Haven, CT',
  '590-626 Asylum Avenue, Hartford, CT',
  '554 Wethersfield Avenue, Hartford, CT',
  '141 Woodland Street, Hartford, CT',
  '3 Elm Street, Vernon, CT'
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function safeEval(page, fn, arg) {
  try { return await page.evaluate(fn, arg); } catch { return null; }
}

async function boot(page) {
  await page.goto(SITE, {waitUntil:'domcontentloaded', timeout:60000});
  await page.waitForFunction(() => !!window.__BP_V5000_WORLD?.map, {timeout:60000});
  await sleep(2200);
  await safeEval(page, () => {
    const p=document.getElementById('systemPanel');
    if(p)p.style.setProperty('display','none','important');
    const live=document.getElementById('toggleLiveContext');
    if(live && live.classList.contains('active'))live.click();
    const three=document.querySelector('button[data-layer="buildings"]');
    if(three && !three.classList.contains('active'))three.click();
    const parcels=document.querySelector('button[data-layer="parcels"]');
    if(parcels && !parcels.classList.contains('active'))parcels.click();
  });
}

async function waitSettled(page, minMs=1200, timeout=16000) {
  try {
    await page.waitForFunction(() => {
      const m=window.__BP_V5000_WORLD?.map;
      if(!m)return false;
      const c=m.getCanvas?.();
      if(!c || c.width<500 || c.height<300)return false;
      const tiles = typeof m.areTilesLoaded==='function' ? m.areTilesLoaded() : true;
      return tiles;
    }, {timeout});
  } catch {}
  await sleep(minMs);
}

async function waitBuildings(page, timeout=12000) {
  try {
    await page.waitForFunction(() => {
      const m=window.__BP_V5000_WORLD?.map;
      if(!m)return false;
      const ids=['gta-context-buildings','gta-opportunity-buildings','gta-exact-building','gta-bp-buildings'];
      for(const id of ids){
        try{
          if(m.getLayer(id) && m.queryRenderedFeatures({layers:[id]}).length>1)return true;
        }catch{}
      }
      return false;
    }, {timeout});
  } catch {}
  await sleep(900);
}

async function moveMap(page,lng,lat,zoom,pitch,bearing,duration=800) {
  await safeEval(page, ({lng,lat,zoom,pitch,bearing,duration}) => {
    const m=window.__BP_V5000_WORLD?.map;
    if(!m)return;
    m.easeTo({center:[lng,lat],zoom,pitch,bearing,duration,essential:true});
  }, {lng,lat,zoom,pitch,bearing,duration});
  await sleep(duration+180);
}

async function openSearch(page) {
  await safeEval(page, () => {
    const surface=document.querySelector('.map-surface');
    const form=document.getElementById('publicSearchForm');
    surface?.classList.add('map-engaged');
    form?.classList.add('search-open');
    document.getElementById('toggleSearch')?.classList.add('active');
  });
  try{await page.locator('#publicSearchInput').waitFor({state:'visible',timeout:2500});}catch{}
  await sleep(180);
}

async function searchAddress(page,q,clickResult=true) {
  await safeEval(page, () => {
    document.getElementById('closeBuilding')?.click();
    const box=document.getElementById('publicSearchResults');
    if(box)box.hidden=true;
  });
  await openSearch(page);
  const input=page.locator('#publicSearchInput');
  await input.fill(q);
  await page.locator('#publicSearchForm').evaluate(el=>el.requestSubmit());
  const result=page.locator('#publicSearchResults button:not([disabled])').first();
  try{
    await result.waitFor({state:'visible',timeout:16000});
    const text=await result.innerText().catch(()=>q);
    if(clickResult){
      await result.click();
      try{await page.locator('#buildingPanel').waitFor({state:'visible',timeout:12000});}catch{}
    }
    return {ok:true,text};
  }catch{
    const t=await page.locator('#publicSearchResults').innerText().catch(()=> 'No live match');
    return {ok:false,text:t};
  }
}

async function prewarm() {
  const context=await chromium.launchPersistentContext(PROFILE,{
    headless:false,
    viewport:{width:1365,height:768},
    ignoreHTTPSErrors:true,
    args:['--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage']
  });
  const page=context.pages()[0] || await context.newPage();
  await boot(page);

  for(const c of CITIES){
    await moveMap(page,c[2],c[3],c[4],c[5],c[6],350);
    await waitSettled(page,450,3200);
    await waitBuildings(page,2800);
  }

  for(const q of PROPERTIES){
    const r=await searchAddress(page,q,true);
    if(r.ok){
      await waitSettled(page,450,3200);
      await waitBuildings(page,2800);
      await safeEval(page,()=>document.querySelector('#bpInspectorTabs button[data-tab="xray"]')?.click());
      await sleep(450);
    }
  }
  await context.close();
}

async function installOverlay(page) {
  await page.evaluate(() => {
    const s=document.createElement('style');
    s.textContent=[
      '#bpV2Overlay{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#fff}',
      '#bpV2Top{position:absolute;top:22px;left:24px;right:24px;display:flex;align-items:center;gap:11px;text-shadow:0 2px 12px #000}',
      '#bpV2Mark{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-weight:950;font-size:21px;background:linear-gradient(135deg,#3bc4ff,#1559ff);box-shadow:0 0 28px rgba(51,165,255,.58)}',
      '#bpV2Brand{font-size:12px;font-weight:950;letter-spacing:.17em}',
      '#bpV2Status{margin-left:auto;padding:7px 10px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(2,8,18,.72);backdrop-filter:blur(12px);font-size:9px;font-weight:900;letter-spacing:.13em}',
      '#bpV2Card{position:absolute;left:26px;bottom:34px;width:min(690px,calc(100vw - 500px));padding:15px 18px;border-radius:17px;background:linear-gradient(90deg,rgba(2,9,21,.91),rgba(2,9,21,.52));border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(13px);box-shadow:0 14px 44px rgba(0,0,0,.33);opacity:0;transform:translateY(10px);transition:opacity .18s ease,transform .18s ease}',
      '#bpV2Card.show{opacity:1;transform:translateY(0)}',
      '#bpV2K{font-size:9px;font-weight:950;letter-spacing:.2em;color:#6fdcff;margin-bottom:6px}',
      '#bpV2T{font-size:27px;font-weight:950;line-height:1.07}',
      '#bpV2S{font-size:12px;line-height:1.4;color:rgba(255,255,255,.84);margin-top:7px}',
      '#bpV2Progress{position:absolute;left:0;bottom:0;height:4px;width:0;background:linear-gradient(90deg,#3bbdff,#765fff,#00e2bd);box-shadow:0 0 14px rgba(59,189,255,.65);transition:width .4s ease}',
      '#bpV2Cursor{position:fixed;width:18px;height:18px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 5px rgba(47,178,255,.22),0 0 20px rgba(47,178,255,.78);transform:translate(-50%,-50%);left:50%;top:50%;transition:left .22s cubic-bezier(.2,.8,.2,1),top .22s cubic-bezier(.2,.8,.2,1),transform .12s ease;opacity:.92}',
      '#bpV2Cursor.down{transform:translate(-50%,-50%) scale(.72)}'
    ].join('');
    document.head.appendChild(s);
    const o=document.createElement('div');
    o.id='bpV2Overlay';
    o.innerHTML='<div id="bpV2Top"><div id="bpV2Mark">B</div><div id="bpV2Brand">BRIDGEPOINT INTELLIGENCE</div><div id="bpV2Status">LIVE PRODUCTION CAPTURE</div></div><div id="bpV2Card"><div id="bpV2K"></div><div id="bpV2T"></div><div id="bpV2S"></div></div><div id="bpV2Progress"></div><div id="bpV2Cursor"></div>';
    document.body.appendChild(o);
  });
}

async function card(page,k,t,s,hold=1150,p=null){
  await safeEval(page,({k,t,s,p})=>{
    const c=document.getElementById('bpV2Card');if(!c)return;
    document.getElementById('bpV2K').textContent=k||'';
    document.getElementById('bpV2T').textContent=t||'';
    document.getElementById('bpV2S').textContent=s||'';
    if(p!=null)document.getElementById('bpV2Progress').style.width=Math.max(0,Math.min(100,p))+'%';
    c.classList.add('show');
  },{k,t,s,p});
  await sleep(hold);
  await safeEval(page,()=>document.getElementById('bpV2Card')?.classList.remove('show'));
  await sleep(130);
}

async function moveCursorTo(page,locator){
  try{
    const b=await locator.boundingBox();
    if(!b)return;
    const x=b.x+b.width/2,y=b.y+b.height/2;
    await safeEval(page,({x,y})=>{
      const c=document.getElementById('bpV2Cursor');
      if(c){c.style.left=x+'px';c.style.top=y+'px';}
    },{x,y});
    await sleep(240);
  }catch{}
}

async function clickVisible(page,locator){
  await moveCursorTo(page,locator);
  await safeEval(page,()=>document.getElementById('bpV2Cursor')?.classList.add('down'));
  await sleep(90);
  try{await locator.click();}catch{}
  await safeEval(page,()=>document.getElementById('bpV2Cursor')?.classList.remove('down'));
  await sleep(150);
}

async function tab(page,name,title,sub,progress,scroll=0){
  const loc=page.locator('#bpInspectorTabs button[data-tab="'+name+'"]');
  try{
    await loc.waitFor({state:'visible',timeout:4000});
    await clickVisible(page,loc);
    await safeEval(page,({scroll})=>{
      const p=document.getElementById('buildingPanel');
      if(p)p.scrollTo({top:scroll,behavior:'smooth'});
    },{scroll});
    await sleep(650);
    await card(page,'PROPERTY INTELLIGENCE',title,sub,950,progress);
    return true;
  }catch{return false;}
}

async function record() {
  fs.mkdirSync(OUT+'/raw',{recursive:true});
  const context=await chromium.launchPersistentContext(PROFILE,{
    headless:false,
    viewport:{width:1365,height:768},
    recordVideo:{dir:OUT+'/raw',size:{width:1365,height:768}},
    ignoreHTTPSErrors:true,
    args:['--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage']
  });
  const page=context.pages()[0] || await context.newPage();
  const video=page.video();
  await boot(page);
  await installOverlay(page);

  const status=await safeEval(page,()=>window.__BP_FRONTEND_STATUS__||null);
  const canonical=status?.canonical_properties ? Number(status.canonical_properties).toLocaleString() : null;
  const archived=status?.archived_buildings ? Number(status.archived_buildings).toLocaleString() : null;
  await card(page,'THE HOOK',canonical ? canonical+' CANONICAL U.S. PROPERTIES' : 'NATIONAL PROPERTY INTELLIGENCE', archived ? archived+' archived buildings • live 3D map • parcel and structural intelligence' : 'Live 3D map • parcel geometry • structural intelligence',2500,2);

  await card(page,'NATIONAL 3D MONTAGE','15 major U.S. cities','Each shot waits for map tiles and 3D building geometry to finish rendering before the camera moves.',1600,5);
  for(let i=0;i<CITIES.length;i++){
    const c=CITIES[i];
    await moveMap(page,c[2],c[3],c[4],c[5],c[6],600);
    await waitSettled(page,850,4500);
    await waitBuildings(page,4200);
    await card(page,'CITY '+String(i+1).padStart(2,'0')+' / '+CITIES.length,c[0],c[1]+' • rendered 3D context',1150,6+(i/CITIES.length)*17);
    await sleep(650);
  }

  await card(page,'PROPERTY DEEP DIVE','10 live demo addresses','Real production searches, real property panels and the exact response BridgePoint returns for each address.',1900,24);

  for(let i=0;i<PROPERTIES.length;i++){
    const q=PROPERTIES[i];
    const base=26+(i/PROPERTIES.length)*69;

    await safeEval(page,()=>document.getElementById('closeBuilding')?.click());
    await openSearch(page);
    const input=page.locator('#publicSearchInput');
    await moveCursorTo(page,input);
    await input.fill('');
    await input.type(q,{delay:18});
    const go=page.locator('#publicSearchForm button[type="submit"]');
    await clickVisible(page,go);

    const result=page.locator('#publicSearchResults button:not([disabled])').first();
    let found=false,resultText='';
    try{
      await result.waitFor({state:'visible',timeout:16000});
      resultText=await result.innerText().catch(()=>q);
      await clickVisible(page,result);
      found=true;
    }catch{
      resultText=await page.locator('#publicSearchResults').innerText().catch(()=> 'No live match');
    }

    await card(page,'PROPERTY '+String(i+1).padStart(2,'0')+' / '+PROPERTIES.length,q,found ? 'Live result selected • waiting for building, parcel and inspector data to fully resolve' : ('Live production response: '+String(resultText).slice(0,150)),1350,base);

    if(!found){
      await sleep(900);
      continue;
    }

    try{await page.locator('#buildingPanel').waitFor({state:'visible',timeout:12000});}catch{}
    await waitSettled(page,850,4500);
    await waitBuildings(page,4200);
    try{
      await page.waitForFunction(()=>{
        const badge=document.getElementById('buildingTruthBadge')?.textContent||'';
        return badge && !/LOADING|RETRY/i.test(badge);
      },{timeout:10000});
    }catch{}
    await sleep(750);

    const point=await safeEval(page,()=>window.__BP_V5000_WORLD?.map?.getCenter()?.toArray?.());
    if(Array.isArray(point)){
      await moveMap(page,point[0],point[1],18.1,64,-24,520);
      await waitSettled(page,650,3500);
      await moveMap(page,point[0],point[1],18.25,60,20,520);
      await waitSettled(page,650,3500);
    }

    await tab(page,'overview','OVERVIEW','Canonical property identity • source-backed building metrics • geometry • height • floors • source confidence',base+1,0);
    await tab(page,'xray','3D PICK-UP + PARCEL CUTOUT','Orbitable building model • exact stored parcel boundary • terrain/surface • measurable top-down geometry',base+2,0);
    await sleep(650);
    await safeEval(page,()=>{const p=document.getElementById('buildingPanel');if(p)p.scrollTo({top:520,behavior:'smooth'});});
    await sleep(900);
    await card(page,'STRUCTURAL X-RAY','FLOOR STACK + ROOF EVIDENCE','BridgePoint separates source-backed structure from derived floors and never invents interior geometry.',950,base+3);
    await safeEval(page,()=>{const p=document.getElementById('buildingPanel');if(p)p.scrollTo({top:930,behavior:'smooth'});});
    await sleep(900);

    await tab(page,'provenance','SOURCE / PROVENANCE','Dataset/provider • source record • timestamps • license/release • parcel-boundary source',base+4.1,0);
    await tab(page,'context','LIVE PROPERTY CONTEXT','Terrain • land/surface material • source freshness • nearby active hazard context',base+5.2,0);
    await tab(page,'intel','PROPERTY TIMELINE + SCORE','Heartbeat • opportunity strength • evidence families • property timeline • explainability when authorized',base+6.3,150);
    await tab(page,'media','PROPERTY VIEWS','Top/aerial • 3D • street-level context • verified imagery-history surface',base+7.3,0);
    await tab(page,'xray','ONE ADDRESS. MULTIPLE LAYERS.','3D building, parcel truth, structural stack, source lineage and live context stay attached to one selection.',base+8.1,0);
    await sleep(700);
  }

  await moveMap(page,-72.6734,41.7658,16.3,62,-18,650);
  await waitSettled(page,900,4200);
  await waitBuildings(page,4200);
  await card(page,'BUILT FOR DECISIONS','SEARCH → RENDER → INSPECT → VERIFY','A national spatial interface that moves from city scale to one property without leaving the workflow.',2200,97);
  await moveMap(page,-98.5,39.5,3.35,0,0,800);
  await waitSettled(page,800,4000);
  await card(page,'BRIDGEPOINT INTELLIGENCE','ONE MAP. THE BACKEND UNDERNEATH IT.','Production walkthrough complete • silent master prepared for your voice-over.',3000,100);

  await context.close();
  const p=await video.path();
  fs.writeFileSync(OUT+'/video-path.txt',p);
  console.log('VIDEO_PATH='+p);
}

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  console.log('PREWARM_START');
  await prewarm();
  console.log('PREWARM_DONE');
  await record();
  console.log('RECORD_DONE');
})().catch(e=>{console.error(e && e.stack ? e.stack : e);process.exit(1)});