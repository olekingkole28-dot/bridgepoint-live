const { chromium } = require('playwright');
const fs = require('fs');

const SITE='https://bridgepointintelligence.online/app/?capture=segmented-v6';
const OUT='demo-segmented-v6';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const CITIES=[
['NEW YORK CITY','New York, NY',-73.9857,40.7484],
['LOS ANGELES','Los Angeles, CA',-118.2437,34.0522],
['CHICAGO','Chicago, IL',-87.6298,41.8781],
['MIAMI','Miami, FL',-80.1918,25.7617],
['SEATTLE','Seattle, WA',-122.3321,47.6062],
['DENVER','Denver, CO',-104.9903,39.7392],
['BOSTON','Boston, MA',-71.0589,42.3601],
['SAN FRANCISCO','San Francisco, CA',-122.4194,37.7749],
['DALLAS','Dallas, TX',-96.7970,32.7767],
['HARTFORD','Hartford, CT',-72.6734,41.7658]
];

const PROPERTIES=[
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

async function se(page,fn,arg){try{return await page.evaluate(fn,arg)}catch{return null}}
async function boot(page){
  await page.goto(SITE,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.__BP_V5000_WORLD?.map,{timeout:60000});
  await sleep(1700);
  await se(page,()=>{
    const p=document.getElementById('systemPanel'); if(p)p.style.setProperty('display','none','important');
    const live=document.getElementById('toggleLiveContext'); if(live&&live.classList.contains('active'))live.click();
    const b=document.querySelector('button[data-layer="buildings"]'); if(b&&!b.classList.contains('active'))b.click();
    const parcels=document.querySelector('button[data-layer="parcels"]'); if(parcels&&!parcels.classList.contains('active'))parcels.click();
  });
}
async function installFilm(page){
  await page.evaluate(()=>{
    if(document.getElementById('bpfilm'))return;
    const st=document.createElement('style');
    st.textContent=[
      '#bpfilm{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#fff}',
      '#bptop{position:absolute;top:18px;left:22px;right:22px;display:flex;align-items:center;gap:10px;text-shadow:0 2px 12px #000}',
      '#bpmark{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:linear-gradient(135deg,#3bc4ff,#1559ff);font-size:20px;font-weight:950;box-shadow:0 0 25px rgba(47,163,255,.55)}',
      '#bpbrand{font-size:12px;font-weight:950;letter-spacing:.15em}',
      '#bplive{margin-left:auto;padding:7px 10px;border-radius:999px;background:rgba(3,10,20,.78);border:1px solid rgba(255,255,255,.18);font-size:9px;font-weight:900;letter-spacing:.12em}',
      '#bplower{position:absolute;left:24px;bottom:30px;max-width:690px;padding:14px 17px;border-radius:16px;background:linear-gradient(90deg,rgba(2,9,21,.93),rgba(2,9,21,.50));border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(12px);box-shadow:0 15px 40px rgba(0,0,0,.33)}',
      '#bpk{font-size:9px;font-weight:950;letter-spacing:.18em;color:#6bd8ff;margin-bottom:5px}',
      '#bpt{font-size:25px;font-weight:950;line-height:1.06}',
      '#bps{font-size:12px;line-height:1.35;color:rgba(255,255,255,.82);margin-top:6px}',
      '#bpcursor{position:absolute;width:16px;height:16px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(47,178,255,.2),0 0 16px rgba(47,178,255,.8);left:50%;top:50%;transform:translate(-50%,-50%);transition:left .18s ease,top .18s ease,transform .08s ease}',
      '#bpcursor.down{transform:translate(-50%,-50%) scale(.70)}'
    ].join('');
    document.head.appendChild(st);
    const o=document.createElement('div');o.id='bpfilm';
    o.innerHTML='<div id="bptop"><div id="bpmark">B</div><div id="bpbrand">BRIDGEPOINT INTELLIGENCE</div><div id="bplive">LIVE PRODUCTION</div></div><div id="bplower"><div id="bpk"></div><div id="bpt"></div><div id="bps"></div></div><div id="bpcursor"></div>';
    document.body.appendChild(o);
  });
}
async function label(page,k,t,s){
  await se(page,({k,t,s})=>{document.getElementById('bpk').textContent=k;document.getElementById('bpt').textContent=t;document.getElementById('bps').textContent=s},{k,t,s});
}
async function jump(page,lng,lat,zoom=16.6,pitch=62,bearing=-18){
  await se(page,({lng,lat,zoom,pitch,bearing})=>window.__BP_V5000_WORLD?.map?.jumpTo({center:[lng,lat],zoom,pitch,bearing}),{lng,lat,zoom,pitch,bearing});
}
async function clickTab(page,name){
  const loc=page.locator('#bpInspectorTabs button[data-tab="'+name+'"]');
  try{
    await loc.waitFor({state:'visible',timeout:4000});
    const b=await loc.boundingBox();
    if(b){
      const x=b.x+b.width/2,y=b.y+b.height/2;
      await se(page,({x,y})=>{const c=document.getElementById('bpcursor');c.style.left=x+'px';c.style.top=y+'px'},{x,y});
      await sleep(160);
      await se(page,()=>document.getElementById('bpcursor')?.classList.add('down'));
      await page.mouse.click(x,y);
      await se(page,()=>document.getElementById('bpcursor')?.classList.remove('down'));
    } else await loc.click();
    await sleep(250);
    return true;
  }catch{return false}
}
async function getBridgePointAuth(){
  try{
    const js=await fetch('https://bridgepointintelligence.online/app.js?x='+Date.now()).then(r=>r.text());
    const m=js.match(/const\s+SUPA\s*=\s*['"]([^'"]+)['"]\s*,\s*KEY\s*=\s*['"]([^'"]+)['"]/);
    return m?{supa:m[1],key:m[2]}:{};
  }catch{return{}}
}
async function geocode(q,auth){
  if(auth.supa&&auth.key){
    try{
      const d=await fetch(auth.supa+'/functions/v1/bridgepoint-public-address-geocode-v5300',{method:'POST',headers:{apikey:auth.key,'Content-Type':'application/json'},body:JSON.stringify({q})}).then(r=>r.json());
      const x=d?.results?.[0];
      if(x&&isFinite(+x.longitude)&&isFinite(+x.latitude))return{lng:+x.longitude,lat:+x.latitude,label:x.full_address||q};
    }catch{}
  }
  try{
    const u='https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address='+encodeURIComponent(q);
    const d=await fetch(u).then(r=>r.json()),x=d?.result?.addressMatches?.[0];
    if(x?.coordinates)return{lng:+x.coordinates.x,lat:+x.coordinates.y,label:x.matchedAddress||q};
  }catch{}
  return null;
}
async function closeAndSave(ctx,video,name){
  await ctx.close();
  const p=await video.path();
  fs.copyFileSync(p,OUT+'/clips/'+name+'.webm');
}
(async()=>{
  fs.mkdirSync(OUT+'/clips',{recursive:true});
  const browser=await chromium.launch({headless:false,args:['--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage']});
  const auth=await getBridgePointAuth();
  const coords=[];
  for(const q of PROPERTIES){coords.push(await geocode(q,auth));await sleep(60)}

  // Intro clip
  {
    const ctx=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:OUT+'/raw',size:{width:1280,height:720}},ignoreHTTPSErrors:true});
    const page=await ctx.newPage(),video=page.video();await boot(page);await installFilm(page);
    const st=await se(page,()=>window.__BP_FRONTEND_STATUS__||null);
    const can=st?.canonical_properties?Number(st.canonical_properties).toLocaleString():'NATIONAL';
    await label(page,'BRIDGEPOINT INTELLIGENCE',can+' CANONICAL PROPERTIES','3D buildings • parcel geometry • structural X-ray • property timeline • provenance • live context');
    await sleep(3200);await closeAndSave(ctx,video,'intro');
  }

  // City clips: each context loads, renders, then only the last 3 seconds are used in edit.
  for(let i=0;i<CITIES.length;i++){
    const c=CITIES[i];
    const ctx=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:OUT+'/raw',size:{width:1280,height:720}},ignoreHTTPSErrors:true});
    const page=await ctx.newPage(),video=page.video();await boot(page);await installFilm(page);
    await jump(page,c[2],c[3],16.7,63,i%2?18:-18);
    await label(page,'CITY '+String(i+1).padStart(2,'0')+' / '+CITIES.length,c[0],c[1]+' • live rendered 3D production map');
    await sleep(7200);
    // subtle camera change after everything has loaded
    await jump(page,c[2],c[3],16.85,65,i%2?24:-24);
    await sleep(3200);
    await closeAndSave(ctx,video,'city'+String(i).padStart(2,'0'));
  }

  // Property clips
  for(let i=0;i<PROPERTIES.length;i++){
    const q=PROPERTIES[i],g=coords[i];
    const ctx=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:OUT+'/raw',size:{width:1280,height:720}},ignoreHTTPSErrors:true});
    const page=await ctx.newPage(),video=page.video();await boot(page);await installFilm(page);
    if(!g){
      await label(page,'PROPERTY '+String(i+1).padStart(2,'0')+' / '+PROPERTIES.length,q,'Address could not be resolved in the live capture; no property data fabricated.');
      await sleep(4200);await closeAndSave(ctx,video,'prop'+String(i).padStart(2,'0'));continue;
    }
    await jump(page,g.lng,g.lat,18.2,64,-18);
    await se(page,({lng,lat})=>window.__BP_V5000_SELECT_BUILDING__?.({lngLat:{lng,lat},feature:null}),{lng:g.lng,lat:g.lat});
    await label(page,'PROPERTY '+String(i+1).padStart(2,'0')+' / '+PROPERTIES.length,q,'Resolving live building + parcel intelligence…');
    await sleep(6000);
    await label(page,'OVERVIEW',q,'Canonical identity • building metrics • height • floors • geometry • source confidence');
    await clickTab(page,'overview'); await sleep(1600);
    await label(page,'3D PICK-UP + PARCEL CUTOUT',q,'Building model • parcel geometry • terrain/surface • measurable top-down view');
    await clickTab(page,'xray'); await sleep(1900);
    await se(page,()=>document.getElementById('buildingPanel')?.scrollTo({top:520,behavior:'smooth'}));await sleep(1100);
    await label(page,'STRUCTURAL X-RAY',q,'Floor stack • roof evidence • source-backed vs derived structure');await sleep(1300);
    await label(page,'SOURCE / PROVENANCE',q,'Dataset/provider • original record • timestamps • release/license • parcel source');
    await clickTab(page,'provenance');await sleep(1500);
    await label(page,'LIVE CONTEXT',q,'Terrain • surface material • source freshness • nearby active hazards');
    await clickTab(page,'context');await sleep(1500);
    await label(page,'PROPERTY TIMELINE + SCORE',q,'Heartbeat • evidence families • timeline • explainability when authorized');
    await clickTab(page,'intel');await sleep(1600);
    await label(page,'PROPERTY VIEWS',q,'Top/aerial • 3D • street-level context • imagery-history surface');
    await clickTab(page,'media');await sleep(1500);
    await closeAndSave(ctx,video,'prop'+String(i).padStart(2,'0'));
  }

  await browser.close();
  fs.writeFileSync(OUT+'/done.txt','ok');
})().catch(e=>{console.error(e?.stack||e);process.exit(1)});