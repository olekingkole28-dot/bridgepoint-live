const { chromium } = require('playwright');
const fs = require('fs');
const SITE='https://bridgepointintelligence.online/app/?capture=final-v5';
const OUT='demo-final-v5';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const cities=[
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
const properties=[
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
  await sleep(2200);
  await se(page,()=>{
    const s=document.getElementById('systemPanel'); if(s)s.style.setProperty('display','none','important');
    const live=document.getElementById('toggleLiveContext'); if(live&&live.classList.contains('active'))live.click();
    const b=document.querySelector('button[data-layer="buildings"]'); if(b&&!b.classList.contains('active'))b.click();
    const p=document.querySelector('button[data-layer="parcels"]'); if(p&&!p.classList.contains('active'))p.click();
  });
}
async function overlay(page){
  await page.evaluate(()=>{
    const s=document.createElement('style');
    s.textContent=[
      '#f{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#fff}',
      '#top{position:absolute;top:22px;left:26px;right:26px;display:flex;align-items:center;gap:12px;text-shadow:0 2px 12px #000}',
      '#m{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,#3bc4ff,#1559ff);font-size:22px;font-weight:950;box-shadow:0 0 30px rgba(47,163,255,.55)}',
      '#b{font-size:13px;font-weight:950;letter-spacing:.16em}',
      '#badge{margin-left:auto;padding:8px 11px;border-radius:999px;background:rgba(3,10,20,.76);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(12px);font-size:10px;font-weight:900;letter-spacing:.12em}',
      '#lower{position:absolute;left:30px;bottom:42px;max-width:860px;padding:16px 20px;border-radius:18px;background:linear-gradient(90deg,rgba(2,9,21,.93),rgba(2,9,21,.52));border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(14px);box-shadow:0 18px 48px rgba(0,0,0,.35);opacity:0;transform:translateY(10px);transition:.2s ease}',
      '#lower.show{opacity:1;transform:translateY(0)}',
      '#k{font-size:10px;font-weight:950;letter-spacing:.19em;color:#6bd8ff;margin-bottom:6px}',
      '#t{font-size:31px;font-weight:950;line-height:1.05}',
      '#s{font-size:13px;line-height:1.4;color:rgba(255,255,255,.84);margin-top:8px}',
      '#prog{position:absolute;left:0;bottom:0;height:4px;width:0;background:linear-gradient(90deg,#37bdff,#765fff,#00e2bd);box-shadow:0 0 15px rgba(55,189,255,.65);transition:width .35s ease}',
      '#curtain{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,#11315d 0,#071426 38%,#02060d 76%);display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .18s ease}',
      '#curtain.show{opacity:1;visibility:visible}',
      '#ci{text-align:center;max-width:900px;padding:40px}',
      '#ck{font-size:11px;font-weight:950;letter-spacing:.2em;color:#6bd8ff}',
      '#ct{font-size:46px;font-weight:950;line-height:1.02;margin-top:10px}',
      '#cs{font-size:15px;color:rgba(255,255,255,.72);margin-top:10px}',
      '#line{width:240px;height:3px;border-radius:3px;background:linear-gradient(90deg,transparent,#35c7ff,#7d5cff,transparent);margin:22px auto 0}'
    ].join('');
    document.head.appendChild(s);
    const o=document.createElement('div');o.id='f';
    o.innerHTML='<div id="top"><div id="m">B</div><div id="b">BRIDGEPOINT INTELLIGENCE</div><div id="badge">LIVE PRODUCTION CAPTURE</div></div><div id="lower"><div id="k"></div><div id="t"></div><div id="s"></div></div><div id="prog"></div><div id="curtain"><div id="ci"><div id="ck"></div><div id="ct"></div><div id="cs"></div><div id="line"></div></div></div>';
    document.body.appendChild(o);
  });
}
async function lower(page,k,t,s,hold=1100,p=null){
  await se(page,({k,t,s,p})=>{
    const e=document.getElementById('lower'); if(!e)return;
    document.getElementById('k').textContent=k||'';
    document.getElementById('t').textContent=t||'';
    document.getElementById('s').textContent=s||'';
    if(p!=null)document.getElementById('prog').style.width=Math.max(0,Math.min(100,p))+'%';
    e.classList.add('show');
  },{k,t,s,p});
  await sleep(hold);
  await se(page,()=>document.getElementById('lower')?.classList.remove('show'));
  await sleep(120);
}
async function curtain(page,k,t,s,on=true){
  await se(page,({k,t,s,on})=>{
    document.getElementById('ck').textContent=k||'';
    document.getElementById('ct').textContent=t||'';
    document.getElementById('cs').textContent=s||'';
    document.getElementById('curtain')?.classList.toggle('show',!!on);
  },{k,t,s,on}); await sleep(180);
}
async function jump(page,lng,lat,zoom=16.5,pitch=62,bearing=-18){
  await se(page,({lng,lat,zoom,pitch,bearing})=>{
    const m=window.__BP_V5000_WORLD?.map;
    if(m)m.jumpTo({center:[lng,lat],zoom,pitch,bearing});
  },{lng,lat,zoom,pitch,bearing});
}
async function geocode(q){
  try{
    const u='https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address='+encodeURIComponent(q);
    const d=await fetch(u).then(r=>r.json());
    const x=d?.result?.addressMatches?.[0];
    if(x?.coordinates)return {lng:+x.coordinates.x,lat:+x.coordinates.y,label:x.matchedAddress||q};
  }catch{}
  return null;
}
async function tab(page,name,title,sub,p,scroll=0){
  const ok=await se(page,({name,scroll})=>{
    const btn=document.querySelector('#bpInspectorTabs button[data-tab="'+name+'"]');
    if(!btn)return false;
    btn.click();
    const pan=document.getElementById('buildingPanel'); if(pan)pan.scrollTo({top:scroll,behavior:'smooth'});
    return true;
  },{name,scroll});
  if(ok){await sleep(420); await lower(page,'PROPERTY INTELLIGENCE',title,sub,760,p)}
}
(async()=>{
  fs.mkdirSync(OUT+'/raw',{recursive:true});
  const browser=await chromium.launch({headless:false,args:['--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage']});
  const ctx=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:OUT+'/raw',size:{width:1920,height:1080}},ignoreHTTPSErrors:true});
  const page=await ctx.newPage(); const video=page.video();
  await boot(page); await overlay(page);

  const st=await se(page,()=>window.__BP_FRONTEND_STATUS__||null);
  const can=st?.canonical_properties?Number(st.canonical_properties).toLocaleString():'NATIONAL';
  await lower(page,'BRIDGEPOINT INTELLIGENCE',can+' CANONICAL PROPERTIES','3D buildings • parcel geometry • structural X-ray • property timeline • source lineage • live context',2600,2);

  for(let i=0;i<cities.length;i++){
    const c=cities[i];
    await curtain(page,'CITY '+String(i+1).padStart(2,'0')+' / '+cities.length,c[0],'Rendering full 3D city context…',true);
    await jump(page,c[2],c[3],16.6,62,i%2?18:-18);
    await sleep(6500);
    await curtain(page,'','','',false);
    await lower(page,'NATIONAL 3D WORLD',c[0],c[1]+' • rendered production map',1700,5+(i/cities.length)*18);
    await sleep(900);
  }

  const geos=[];
  for(const q of properties){geos.push(await geocode(q)); await sleep(80)}

  for(let i=0;i<properties.length;i++){
    const q=properties[i],g=geos[i],base=25+(i/properties.length)*70;
    await curtain(page,'PROPERTY '+String(i+1).padStart(2,'0')+' / '+properties.length,q,g?'Resolving building + parcel + property intelligence…':'No resolved address coordinate — nothing fabricated.',true);
    if(!g){await sleep(900);await curtain(page,'','','',false);continue}
    await jump(page,g.lng,g.lat,18.2,64,-18);
    await se(page,({lng,lat})=>window.__BP_V5000_SELECT_BUILDING__?.({lngLat:{lng,lat},feature:null}),{lng:g.lng,lat:g.lat});
    await sleep(6500);
    await curtain(page,'','','',false);
    await lower(page,'PROPERTY '+String(i+1).padStart(2,'0')+' / '+properties.length,q,'Real production property selection',1000,base);
    await tab(page,'overview','OVERVIEW','Canonical identity • height • floors • geometry • source confidence',base+1,0);
    await tab(page,'xray','3D PICK-UP + PARCEL CUTOUT','Building model • parcel boundary • terrain/surface • top-down measurable geometry',base+2,0);
    await tab(page,'xray','STRUCTURAL X-RAY','Floor stack • roof evidence • source-backed vs derived structure',base+3,520);
    await tab(page,'provenance','SOURCE / PROVENANCE','Dataset/provider • source record • timestamp • license/release • parcel source',base+4,0);
    await tab(page,'context','LIVE CONTEXT','Terrain • surface material • source freshness • nearby hazards',base+5,0);
    await tab(page,'intel','PROPERTY TIMELINE + SCORE','Heartbeat • evidence families • property timeline • explainability when authorized',base+6,120);
    await tab(page,'media','PROPERTY VIEWS','Top/aerial • 3D • street-level context • imagery-history surface',base+7,0);
    await sleep(500);
  }

  await curtain(page,'FINAL SHOT','HARTFORD, CONNECTICUT','Rendering closing city view…',true);
  await jump(page,-72.6734,41.7658,16.6,62,-18); await sleep(6500);
  await curtain(page,'','','',false);
  await lower(page,'BUILT FOR DECISIONS','SEARCH → RENDER → INSPECT → VERIFY','A national property-intelligence workflow from city scale down to one structure.',2100,97);
  await curtain(page,'BRIDGEPOINT INTELLIGENCE','ONE MAP. THE BACKEND UNDERNEATH IT.','Silent master ready for voice-over.',true); await sleep(2600);

  await ctx.close(); await browser.close();
  const p=await video.path(); fs.writeFileSync(OUT+'/video-path.txt',p); console.log('VIDEO_PATH='+p);
})().catch(e=>{console.error(e?.stack||e);process.exit(1)});