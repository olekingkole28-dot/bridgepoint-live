const { chromium } = require('playwright');
const fs = require('fs');

const SITE = 'https://bridgepointintelligence.online/app/?demo_capture=20260916';

const cities = [
  ['NEW YORK CITY','New York, NY',[-73.9857,40.7484],16.2,60,-18],
  ['LOS ANGELES','Los Angeles, CA',[-118.2437,34.0522],15.8,58,18],
  ['CHICAGO','Chicago, IL',[-87.6298,41.8781],16.0,60,-12],
  ['HOUSTON','Houston, TX',[-95.3698,29.7604],15.8,58,16],
  ['PHOENIX','Phoenix, AZ',[-112.0740,33.4484],15.7,58,-14],
  ['PHILADELPHIA','Philadelphia, PA',[-75.1652,39.9526],16.0,60,15],
  ['SAN ANTONIO','San Antonio, TX',[-98.4936,29.4241],15.8,58,-10],
  ['SAN DIEGO','San Diego, CA',[-117.1611,32.7157],15.8,60,18],
  ['DALLAS','Dallas, TX',[-96.7970,32.7767],16.0,60,-16],
  ['SAN FRANCISCO','San Francisco, CA',[-122.4194,37.7749],16.0,62,18],
  ['MIAMI','Miami, FL',[-80.1918,25.7617],16.0,60,-18],
  ['SEATTLE','Seattle, WA',[-122.3321,47.6062],16.0,60,18],
  ['DENVER','Denver, CO',[-104.9903,39.7392],15.9,58,-16],
  ['BOSTON','Boston, MA',[-71.0589,42.3601],16.0,60,15],
  ['HARTFORD','Hartford, CT',[-72.6734,41.7658],16.2,62,-18]
];

const properties = [
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

async function addCinematicOverlay(page) {
  await page.evaluate(() => {
    if (document.getElementById('bpCaptureOverlay')) return;
    const style = document.createElement('style');
    style.id = 'bpCaptureStyle';
    style.textContent = [
      '#bpCaptureOverlay{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#fff}',
      '#bpCaptureTop{position:absolute;left:28px;top:24px;right:28px;display:flex;align-items:center;gap:12px;text-shadow:0 2px 12px rgba(0,0,0,.65)}',
      '#bpCaptureMark{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,#34b5ff,#1559ff);font-weight:950;font-size:22px;box-shadow:0 0 28px rgba(49,152,255,.52)}',
      '#bpCaptureBrand{font-size:13px;font-weight:950;letter-spacing:.18em}',
      '#bpCaptureLive{margin-left:auto;font-size:10px;font-weight:900;letter-spacing:.15em;padding:8px 11px;border-radius:999px;background:rgba(3,10,20,.72);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(14px)}',
      '#bpCaptureCard{position:absolute;left:30px;bottom:38px;width:min(820px,calc(100vw - 540px));min-width:530px;padding:17px 20px;border-radius:18px;background:linear-gradient(90deg,rgba(2,9,21,.91),rgba(2,9,21,.56));border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(14px);box-shadow:0 18px 50px rgba(0,0,0,.34);opacity:0;transform:translateY(12px) scale(.99);transition:.22s ease}',
      '#bpCaptureCard.show{opacity:1;transform:translateY(0) scale(1)}',
      '#bpCaptureKicker{font-size:10px;font-weight:950;letter-spacing:.2em;color:#67d4ff;margin-bottom:7px}',
      '#bpCaptureTitle{font-size:29px;line-height:1.05;font-weight:950}',
      '#bpCaptureSub{font-size:13px;line-height:1.42;color:rgba(255,255,255,.82);margin-top:8px}',
      '#bpCaptureProgress{position:absolute;left:0;bottom:0;height:4px;width:0;background:linear-gradient(90deg,#33b7ff,#725cff,#00e2be);box-shadow:0 0 14px rgba(51,183,255,.65);transition:width .45s ease}',
      '.bpCaptureClean .map-brand-card,.bpCaptureClean #liveLegend{opacity:.22!important}'
    ].join('');
    document.head.appendChild(style);
    const o = document.createElement('div');
    o.id = 'bpCaptureOverlay';
    o.innerHTML = '<div id="bpCaptureTop"><div id="bpCaptureMark">B</div><div id="bpCaptureBrand">BRIDGEPOINT INTELLIGENCE</div><div id="bpCaptureLive">LIVE PRODUCT CAPTURE</div></div><div id="bpCaptureCard"><div id="bpCaptureKicker"></div><div id="bpCaptureTitle"></div><div id="bpCaptureSub"></div></div><div id="bpCaptureProgress"></div>';
    document.body.appendChild(o);
    document.body.classList.add('bpCaptureClean');
  });
}

async function card(page, kicker, title, sub, hold=1300, progress=null) {
  await page.evaluate(({kicker,title,sub,progress}) => {
    const c=document.getElementById('bpCaptureCard'); if(!c)return;
    document.getElementById('bpCaptureKicker').textContent=kicker||'';
    document.getElementById('bpCaptureTitle').textContent=title||'';
    document.getElementById('bpCaptureSub').textContent=sub||'';
    if(progress!==null)document.getElementById('bpCaptureProgress').style.width=Math.max(0,Math.min(100,progress))+'%';
    c.classList.add('show');
  },{kicker,title,sub,progress});
  await sleep(hold);
  await page.evaluate(()=>document.getElementById('bpCaptureCard')?.classList.remove('show'));
  await sleep(150);
}

async function waitForMap(page) {
  await page.waitForFunction(() => !!window.__BP_V5000_WORLD?.map, {timeout:45000});
  await page.waitForTimeout(1400);
}

async function cinematicMove(page, lng, lat, zoom, pitch, bearing, duration=850) {
  await page.evaluate(({lng,lat,zoom,pitch,bearing,duration}) => {
    const m=window.__BP_V5000_WORLD?.map;
    if(!m)return;
    m.easeTo({center:[lng,lat],zoom,pitch,bearing,duration,essential:true});
  },{lng,lat,zoom,pitch,bearing,duration});
  await sleep(duration+240);
}

async function cityMontage(page) {
  await card(page,'NATIONAL 3D WORLD','15 major U.S. cities — one live spatial interface','Fast cross-country flyover. 3D building context stays active while the camera moves.',2200,5);
  for(let i=0;i<cities.length;i++){
    const [name,label,center,zoom,pitch,bearing]=cities[i];
    await cinematicMove(page,center[0],center[1],zoom,pitch,bearing,650);
    await card(page,'CITY '+String(i+1).padStart(2,'0')+' / '+cities.length,name,label+' • live 3D context',720,6+(i/cities.length)*18);
  }
}

async function resetSearch(page) {
  await safeEval(page, () => {
    try { document.getElementById('publicSearchResults').hidden=true; } catch{}
    const p=document.getElementById('buildingPanel');
    if(p && !p.hidden) document.getElementById('closeBuilding')?.click();
  });
  await sleep(220);
}

async function searchAddress(page, q) {
  await resetSearch(page);
  await page.evaluate(() => { document.getElementById('toggleSearch')?.click(); });
  await sleep(250);
  const input = page.locator('#publicSearchInput');
  await input.fill(q);
  await page.locator('#publicSearchForm').evaluate(el => el.requestSubmit());
  const results = page.locator('#publicSearchResults button:not([disabled])');
  try {
    await results.first().waitFor({state:'visible',timeout:12000});
    const resultText = await results.first().innerText().catch(()=>q);
    await results.first().click();
    try { await page.locator('#buildingPanel').waitFor({state:'visible',timeout:10000}); } catch{}
    try {
      await page.waitForFunction(() => {
        const b=document.getElementById('buildingTruthBadge')?.textContent||'';
        return b && !/LOADING|RETRY/i.test(b);
      }, {timeout:10000});
    } catch {}
    return {found:true,resultText};
  } catch {
    const state = await page.locator('#publicSearchResults').innerText().catch(()=> '');
    return {found:false,resultText:state||'No live match returned'};
  }
}

async function setPanelTop(page) {
  await safeEval(page, () => {
    const p=document.getElementById('buildingPanel');
    if(p){p.scrollTo({top:0,behavior:'auto'});}
  });
}

async function tab(page, name, label, sub, progress) {
  const selector = '#bpInspectorTabs button[data-tab="'+name+'"]';
  try {
    await page.locator(selector).waitFor({state:'visible',timeout:3000});
    await page.locator(selector).click();
    await setPanelTop(page);
    await sleep(600);
    await card(page,'PROPERTY INTELLIGENCE',label,sub,820,progress);
    return true;
  } catch {
    return false;
  }
}

async function propertySequence(page,q,index,total){
  const base=27+(index/total)*67;
  const r=await searchAddress(page,q);
  await card(page,'PROPERTY '+String(index+1).padStart(2,'0')+' / '+total,q,r.found?'Live BridgePoint address result selected • resolving exact building + parcel context':'Live lookup response: '+r.resultText.slice(0,150),1350,base);

  if(!r.found){
    await sleep(650);
    return;
  }

  try {
    await page.waitForFunction(() => {
      const a=document.getElementById('bPickedParcelArea')?.textContent;
      const t=document.getElementById('bPickedTruth')?.textContent;
      return (a && a!=='—') || (t && t!=='LIVE');
    },{timeout:7000});
  } catch {}

  await tab(page,'overview','OVERVIEW','Canonical property identity • source-backed building metrics • geometry and structural truth',base+1.2);

  const point = await safeEval(page,()=>window.__BP_V5000_WORLD?.map?.getCenter()?.toArray?.());
  if(Array.isArray(point)){
    await cinematicMove(page,point[0],point[1],18.2,66,-28,450);
    await cinematicMove(page,point[0],point[1],18.35,62,20,450);
  }

  await tab(page,'xray','3D PICK-UP + X-RAY','Selected building wrapped by its parcel cutout • measurable top-down layout • floor stack • roof evidence',base+2.3);
  await safeEval(page,()=>{const p=document.getElementById('buildingPanel');if(p)p.scrollTo({top:420,behavior:'smooth'});});
  await sleep(550);
  await safeEval(page,()=>{const p=document.getElementById('buildingPanel');if(p)p.scrollTo({top:900,behavior:'smooth'});});
  await sleep(550);

  await tab(page,'provenance','SOURCE / PROVENANCE','Geometry source • dataset/provider • release/license • source timestamps • parcel-boundary source',base+3.8);
  await tab(page,'context','LIVE CONTEXT','Terrain • land/surface material • source freshness • nearby active hazards',base+5.0);
  await tab(page,'intel','PROPERTY TIMELINE + SCORE','Authorized intelligence surface: heartbeat, score, evidence families, timeline and explainability',base+6.2);
  await tab(page,'media','PROPERTY VIEWS','Top/aerial • 3D • street-level context • imagery-history surface',base+7.2);
  await tab(page,'xray','ONE PROPERTY. MULTIPLE LAYERS.','3D geometry, parcel truth, structural stack and live context stay attached to the same selection.',base+8.0);
}

(async()=>{
  fs.mkdirSync('demo-output-fast/raw',{recursive:true});
  const browser = await chromium.launch({
    headless:true,
    args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']
  });
  const context = await browser.newContext({
    viewport:{width:1920,height:1080},
    deviceScaleFactor:1,
    recordVideo:{dir:'demo-output-fast/raw',size:{width:1920,height:1080}},
    ignoreHTTPSErrors:true
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.on('dialog',d=>d.dismiss().catch(()=>{}));
  const video = page.video();

  try{
    await page.goto(SITE,{waitUntil:'domcontentloaded',timeout:50000});
    await waitForMap(page);
    await addCinematicOverlay(page);

    await safeEval(page,()=>{
      document.getElementById('systemPanel')?.style.setProperty('display','none','important');
      const mapBtn=document.querySelector('button[data-base="gta"]'); if(mapBtn && !mapBtn.classList.contains('active'))mapBtn.click();
      const three=document.querySelector('button[data-layer="buildings"]'); if(three && !three.classList.contains('active'))three.click();
      const parcels=document.querySelector('button[data-layer="parcels"]'); if(parcels && !parcels.classList.contains('active'))parcels.click();
    });
    await sleep(900);

    await card(page,'LIVE PRODUCT FILM','BridgePoint Intelligence','From a national 3D spatial index to individual property truth — captured directly from the production app.',3000,2);
    await cityMontage(page);
    await card(page,'DEEP DIVE','10 demo properties across the U.S.','Every section below is the actual production interface. No fake property values are composited into the capture.',2200,25);

    for(let i=0;i<properties.length;i++){
      await propertySequence(page,properties[i],i,properties.length);
    }

    await cinematicMove(page,-72.6734,41.7658,15.7,62,-18,700);
    await card(page,'BUILT FOR DECISIONS','Search → render → inspect → verify','Property geometry, structure, source lineage and live context in one continuous workflow.',2400,96);
    await cinematicMove(page,-98.5,39.5,3.35,0,0,900);
    await card(page,'BRIDGEPOINT INTELLIGENCE','One map. The backend underneath it.','Production walkthrough complete • clean master ready for your voice-over.',3300,100);
  } catch(e){
    console.error('CAPTURE_FATAL',e && e.stack ? e.stack : e);
    try{
      await addCinematicOverlay(page);
      await card(page,'LIVE CAPTURE INTERRUPTED','BridgePoint Intelligence','The browser recording preserves the real production state reached before interruption.',2300,100);
    }catch{}
  }

  await context.close();
  await browser.close();
  const p=await video.path();
  fs.writeFileSync('demo-output-fast/video-path.txt',p);
  console.log('VIDEO_PATH='+p);
})();