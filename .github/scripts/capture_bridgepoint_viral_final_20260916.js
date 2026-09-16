const { chromium } = require('playwright');
const fs = require('fs');

const SITE='https://bridgepointintelligence.online/app/?viral_demo=20260916';

const ADDRESSES=[
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

const CITY_FALLBACK={
  'Santa Monica, CA':[-118.4912,34.0195],
  'Fayetteville, AR':[-94.1574,36.0626],
  'Immokalee, FL':[-81.4173,26.4187],
  'Montgomery, AL':[-86.3000,32.3668],
  'Groton, CT':[-72.0784,41.3501],
  'North Haven, CT':[-72.8595,41.3909],
  'Hartford, CT':[-72.6734,41.7658],
  'Vernon, CT':[-72.4637,41.8187]
};

const CITIES=[
  ['NEW YORK CITY',[-73.9857,40.7484],16.1,62,-18],
  ['LOS ANGELES',[-118.2437,34.0522],15.8,60,18],
  ['CHICAGO',[-87.6298,41.8781],16.0,62,-15],
  ['HOUSTON',[-95.3698,29.7604],15.8,58,15],
  ['PHOENIX',[-112.0740,33.4484],15.8,58,-14],
  ['PHILADELPHIA',[-75.1652,39.9526],16.0,60,15],
  ['SAN ANTONIO',[-98.4936,29.4241],15.8,58,-10],
  ['SAN DIEGO',[-117.1611,32.7157],15.8,60,18],
  ['DALLAS',[-96.7970,32.7767],16.0,60,-16],
  ['SAN FRANCISCO',[-122.4194,37.7749],16.0,62,18],
  ['MIAMI',[-80.1918,25.7617],16.0,60,-18],
  ['SEATTLE',[-122.3321,47.6062],16.0,60,18],
  ['DENVER',[-104.9903,39.7392],15.9,58,-16],
  ['BOSTON',[-71.0589,42.3601],16.0,60,15],
  ['HARTFORD',[-72.6734,41.7658],16.2,62,-18]
];

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function fallbackForAddress(a){
  for(const [city,xy] of Object.entries(CITY_FALLBACK)) if(a.includes(city)) return xy;
  return [-98.5,39.5];
}

async function waitMap(page){
  await page.waitForFunction(()=>!!window.__BP_V5000_WORLD?.map,{timeout:45000});
  await sleep(900);
}

async function resolveAddress(page,q){
  try{
    await page.evaluate(q=>{
      const f=document.getElementById('publicSearchForm');
      const i=document.getElementById('publicSearchInput');
      const r=document.getElementById('publicSearchResults');
      if(r){r.hidden=true;r.innerHTML='';}
      if(i)i.value=q;
      f?.requestSubmit();
    },q);

    await page.waitForFunction(()=>{
      const r=document.getElementById('publicSearchResults');
      const good=r?.querySelector('button:not([disabled])');
      const txt=r?.innerText||'';
      return !!good || /No address location|linked BridgePoint property match/i.test(txt);
    },{timeout:11500});

    const clicked=await page.evaluate(()=>{
      const b=document.querySelector('#publicSearchResults button:not([disabled])');
      if(!b)return false;
      b.click();
      return true;
    });
    if(!clicked)return null;
    await sleep(1150);
    const state=await page.evaluate(()=>{
      const m=window.__BP_V5000_WORLD?.map;
      const c=m?.getCenter?.();
      return c?{lng:c.lng,lat:c.lat}:null;
    });
    return state;
  }catch{return null}
}

async function preflight(browser){
  const ctx=await browser.newContext({viewport:{width:1280,height:720},ignoreHTTPSErrors:true});
  const page=await ctx.newPage();
  page.setDefaultTimeout(5000);
  const out={};
  try{
    await page.goto(SITE,{waitUntil:'domcontentloaded',timeout:50000});
    await waitMap(page);
    for(const q of ADDRESSES){
      const xy=await resolveAddress(page,q);
      out[q]=xy||(()=>{const f=fallbackForAddress(q);return {lng:f[0],lat:f[1],fallback:true}})();
      await page.evaluate(()=>window.__BP_V5000_CLEAR_BUILDING__?.()).catch(()=>{});
      await sleep(120);
    }
  }finally{
    await ctx.close();
  }
  return out;
}

async function addOverlay(page){
  await page.evaluate(()=>{
    const s=document.createElement('style');
    s.textContent=[
      '#vf{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#fff}',
      '#vfTop{position:absolute;top:22px;left:28px;right:28px;display:flex;align-items:center;gap:11px;text-shadow:0 2px 12px rgba(0,0,0,.7)}',
      '#vfLogo{width:35px;height:35px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,#2cb5ff,#164fff);font-size:21px;font-weight:950;box-shadow:0 0 26px rgba(49,153,255,.55)}',
      '#vfBrand{font-size:13px;font-weight:950;letter-spacing:.17em}',
      '#vfTag{margin-left:auto;padding:7px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(1,9,22,.74);backdrop-filter:blur(12px);font-size:10px;font-weight:900;letter-spacing:.13em}',
      '#vfCard{position:absolute;left:30px;bottom:38px;width:min(790px,calc(100vw - 545px));min-width:520px;padding:17px 20px;border-radius:18px;background:linear-gradient(90deg,rgba(2,10,24,.93),rgba(2,10,24,.52));border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(13px);box-shadow:0 18px 50px rgba(0,0,0,.34);opacity:0;transform:translateY(11px);transition:opacity .18s ease,transform .18s ease}',
      '#vfCard.show{opacity:1;transform:translateY(0)}',
      '#vfK{font-size:10px;font-weight:950;letter-spacing:.2em;color:#63d0ff;margin-bottom:7px}',
      '#vfT{font-size:29px;font-weight:950;line-height:1.06}',
      '#vfS{font-size:13px;line-height:1.4;color:rgba(255,255,255,.83);margin-top:7px}',
      '#vfBar{position:absolute;left:0;bottom:0;height:4px;width:0;background:linear-gradient(90deg,#33b7ff,#735cff,#00dfbd);box-shadow:0 0 14px rgba(51,183,255,.7);transition:width .35s ease}',
      '#vfFlash{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,rgba(66,187,255,.18),rgba(2,7,18,.0) 48%);opacity:0;transition:opacity .18s ease}',
      '.viral-clean .map-brand-card,.viral-clean #liveLegend{opacity:.15!important}'
    ].join('');
    document.head.appendChild(s);
    const d=document.createElement('div');d.id='vf';
    d.innerHTML='<div id="vfTop"><div id="vfLogo">B</div><div id="vfBrand">BRIDGEPOINT INTELLIGENCE</div><div id="vfTag">LIVE PRODUCTION CAPTURE</div></div><div id="vfCard"><div id="vfK"></div><div id="vfT"></div><div id="vfS"></div></div><div id="vfFlash"></div><div id="vfBar"></div>';
    document.body.appendChild(d);
    document.body.classList.add('viral-clean');
  });
}

async function title(page,k,t,s,hold=750,p=0){
  await page.evaluate(({k,t,s,p})=>{
    const c=document.getElementById('vfCard');
    document.getElementById('vfK').textContent=k||'';
    document.getElementById('vfT').textContent=t||'';
    document.getElementById('vfS').textContent=s||'';
    document.getElementById('vfBar').style.width=Math.max(0,Math.min(100,p))+'%';
    c.classList.add('show');
  },{k,t,s,p});
  await sleep(hold);
  await page.evaluate(()=>document.getElementById('vfCard')?.classList.remove('show'));
  await sleep(90);
}

async function flash(page){
  await page.evaluate(()=>{const f=document.getElementById('vfFlash');if(f)f.style.opacity='1'});
  await sleep(90);
  await page.evaluate(()=>{const f=document.getElementById('vfFlash');if(f)f.style.opacity='0'});
}

async function move(page,lng,lat,zoom=17.4,pitch=64,bearing=-18,duration=600){
  await page.evaluate(({lng,lat,zoom,pitch,bearing,duration})=>{
    const m=window.__BP_V5000_WORLD?.map;if(!m)return;
    m.easeTo({center:[lng,lat],zoom,pitch,bearing,duration,essential:true});
  },{lng,lat,zoom,pitch,bearing,duration});
  await sleep(duration+110);
}

async function selectAt(page,lng,lat){
  await page.evaluate(({lng,lat})=>{
    window.__BP_V5000_CLEAR_BUILDING__?.();
    window.__BP_V5000_SELECT_BUILDING__?.({lngLat:{lng,lat}});
  },{lng,lat});
  try{await page.locator('#buildingPanel').waitFor({state:'visible',timeout:3000})}catch{}
  try{await page.locator('#bpInspectorTabs').waitFor({state:'visible',timeout:3000})}catch{}
  await sleep(900);
}

async function showTab(page,name,hold=580){
  await page.evaluate(name=>{
    const b=document.querySelector('#bpInspectorTabs button[data-tab="'+name+'"]');
    b?.click();
    const p=document.getElementById('buildingPanel'); if(p)p.scrollTo({top:0,behavior:'auto'});
  },name);
  await sleep(hold);
}

async function showXrayMotion(page){
  await showTab(page,'xray',520);
  await page.evaluate(()=>{
    const p=document.getElementById('buildingPanel');if(p)p.scrollTo({top:330,behavior:'smooth'});
    document.getElementById('bPickedZoomIn')?.click();
  });
  await sleep(520);
  await page.evaluate(()=>{
    const p=document.getElementById('buildingPanel');if(p)p.scrollTo({top:760,behavior:'smooth'});
  });
  await sleep(560);
}

(async()=>{
  fs.mkdirSync('viral-output/raw',{recursive:true});
  const browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage']});
  const resolved=await preflight(browser);
  console.log('RESOLVED',JSON.stringify(resolved));

  const ctx=await browser.newContext({
    viewport:{width:1920,height:1080},
    deviceScaleFactor:1,
    recordVideo:{dir:'viral-output/raw',size:{width:1920,height:1080}},
    ignoreHTTPSErrors:true
  });
  const page=await ctx.newPage();
  page.setDefaultTimeout(4500);
  const video=page.video();

  try{
    await page.goto(SITE,{waitUntil:'domcontentloaded',timeout:50000});
    await waitMap(page);
    await addOverlay(page);
    await page.evaluate(()=>{
      document.getElementById('systemPanel')?.style.setProperty('display','none','important');
      const three=document.querySelector('button[data-layer="buildings"]');if(three&&!three.classList.contains('active'))three.click();
      const parcels=document.querySelector('button[data-layer="parcels"]');if(parcels&&!parcels.classList.contains('active'))parcels.click();
    });
    await sleep(500);

    await title(page,'THE PROPERTY LAYER BECOMES THE INTERFACE','BridgePoint Intelligence','National 3D context → individual property geometry → source lineage → live conditions.',1800,2);

    for(let i=0;i<CITIES.length;i++){
      const [name,xy,z,pitch,bearing]=CITIES[i];
      await move(page,xy[0],xy[1],z,pitch,bearing,430);
      await title(page,'NATIONAL 3D · '+String(i+1).padStart(2,'0')+'/'+CITIES.length,name,'Live spatial context',390,3+(i/CITIES.length)*15);
    }

    await title(page,'10 REAL-WORLD DEMO LOCATIONS','Now dropping from national scale to property scale','The browser uses BridgePoint production building/parcel resolution at each geocoded location.',1200,19);

    for(let i=0;i<ADDRESSES.length;i++){
      const q=ADDRESSES[i],r=resolved[q],base=20+(i/ADDRESSES.length)*72;
      await flash(page);
      await move(page,r.lng,r.lat,17.6,64,-18,520);
      await title(page,'PROPERTY '+String(i+1).padStart(2,'0')+' / '+ADDRESSES.length,q,r.fallback?'Geocoder fallback location • live BridgePoint resolution shown as returned':'Resolved address location • querying live BridgePoint building + parcel layers',700,base);
      await selectAt(page,r.lng,r.lat);

      await showTab(page,'overview',500);
      await title(page,'OVERVIEW','Canonical identity + building metrics','Height • floors • parts • roof/facade • source record',530,base+1.2);

      await showXrayMotion(page);
      await title(page,'3D PICK-UP + LAYOUT','Building + parcel cutout + top-down geometry','Floor stack and interior lines appear only when source-backed — nothing invented.',620,base+2.5);

      await showTab(page,'provenance',480);
      await title(page,'SOURCE LINEAGE','Where the geometry came from','Dataset/provider • release/license • source timestamp • parcel-boundary source',480,base+4);

      await showTab(page,'context',500);
      await title(page,'LIVE CONTEXT','What is happening around the property','Terrain • land/surface • source freshness • nearby hazards',480,base+5.2);

      await showTab(page,'intel',470);
      const gated=await page.evaluate(()=>/sign in|authorized/i.test(document.getElementById('bpTabIntel')?.innerText||''));
      await title(page,gated?'ACCOUNT INTELLIGENCE · AUTH GATED':'PROPERTY TIMELINE + SCORE','Heartbeat • timeline • evidence families • explainability',gated?360:520,base+6.3);

      await showTab(page,'media',420);
      await title(page,'PROPERTY VIEWS','Aerial • 3D • street context • imagery history','One selection stays anchored across the workflow.',430,base+7.0);
    }

    await page.evaluate(()=>window.__BP_V5000_CLEAR_BUILDING__?.());
    await move(page,-72.6734,41.7658,15.8,62,-18,650);
    await title(page,'ONE MAP. THE BACKEND UNDERNEATH IT.','BridgePoint Intelligence','Search • render • inspect • verify • move to the next opportunity.',1700,96);
    await move(page,-98.5,39.5,3.35,0,0,800);
    await title(page,'BRIDGEPOINT INTELLIGENCE','Built from property-scale truth upward.','Silent production master • ready for your voice-over.',1900,100);
  }catch(e){
    console.error('VIRAL_CAPTURE_FATAL',e?.stack||e);
    try{await title(page,'LIVE CAPTURE','BridgePoint Intelligence','Recording preserved the production state reached before interruption.',1400,100)}catch{}
  }

  await ctx.close();
  await browser.close();
  const p=await video.path();
  fs.writeFileSync('viral-output/video-path.txt',p);
  fs.writeFileSync('viral-output/resolved.json',JSON.stringify(resolved,null,2));
  console.log('VIDEO_PATH='+p);
})();