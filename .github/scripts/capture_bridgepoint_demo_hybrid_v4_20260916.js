const { chromium } = require('playwright');
const fs = require('fs');

const SITE='https://bridgepointintelligence.online/app/?capture=hybrid-v4';
const OUT='demo-output-v4';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const cities=[
['NEW YORK CITY','New York, NY',-73.9857,40.7484,16.6,62,-18],
['LOS ANGELES','Los Angeles, CA',-118.2437,34.0522,16.2,60,18],
['CHICAGO','Chicago, IL',-87.6298,41.8781,16.4,62,-15],
['MIAMI','Miami, FL',-80.1918,25.7617,16.4,60,-18],
['SEATTLE','Seattle, WA',-122.3321,47.6062,16.3,60,18],
['DENVER','Denver, CO',-104.9903,39.7392,16.2,58,-16],
['BOSTON','Boston, MA',-71.0589,42.3601,16.3,60,15],
['SAN FRANCISCO','San Francisco, CA',-122.4194,37.7749,16.4,62,18],
['DALLAS','Dallas, TX',-96.7970,32.7767,16.4,60,-16],
['HARTFORD','Hartford, CT',-72.6734,41.7658,16.6,62,-18]
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
    const s=document.getElementById('systemPanel');if(s)s.style.setProperty('display','none','important');
    const live=document.getElementById('toggleLiveContext');if(live&&live.classList.contains('active'))live.click();
    const three=document.querySelector('button[data-layer="buildings"]');if(three&&!three.classList.contains('active'))three.click();
    const parcels=document.querySelector('button[data-layer="parcels"]');if(parcels&&!parcels.classList.contains('active'))parcels.click();
  });
}

async function mapJump(page,lng,lat,zoom,pitch,bearing){
  await se(page,({lng,lat,zoom,pitch,bearing})=>{
    const m=window.__BP_V5000_WORLD?.map;
    if(m)m.jumpTo({center:[lng,lat],zoom,pitch,bearing});
  },{lng,lat,zoom,pitch,bearing});
}

async function captureCityShots(browser){
  fs.mkdirSync(OUT+'/cities',{recursive:true});
  const ctx=await browser.newContext({viewport:{width:1920,height:1080},ignoreHTTPSErrors:true});
  const page=await ctx.newPage();
  const cdp=await ctx.newCDPSession(page);
  await boot(page);
  for(let i=0;i<cities.length;i++){
    const c=cities[i];
    await mapJump(page,c[2],c[3],c[4],c[5],c[6]);
    try{await page.waitForFunction(()=>{const m=window.__BP_V5000_WORLD?.map;return !!m&&(typeof m.areTilesLoaded!=='function'||m.areTilesLoaded())},{timeout:7000})}catch{}
    await sleep(4200);
    const shot=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
    fs.writeFileSync(OUT+'/cities/city-'+String(i).padStart(2,'0')+'.png',Buffer.from(shot.data,'base64'));
  }
  await ctx.close();
}

async function resolveGeocoders(){
  let supa=null,key=null;
  try{
    const js=await fetch('https://bridgepointintelligence.online/app.js?capture='+Date.now()).then(r=>r.text());
    const m=js.match(/const\s+SUPA\s*=\s*['"]([^'"]+)['"]\s*,\s*KEY\s*=\s*['"]([^'"]+)['"]/);
    if(m){supa=m[1];key=m[2]}
  }catch{}
  return {supa,key};
}

async function geocode(q,auth){
  if(auth.supa&&auth.key){
    try{
      const r=await fetch(auth.supa+'/functions/v1/bridgepoint-public-address-geocode-v5300',{
        method:'POST',
        headers:{apikey:auth.key,'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({q})
      });
      const d=await r.json();
      const x=d?.results?.[0];
      if(x&&Number.isFinite(+x.longitude)&&Number.isFinite(+x.latitude))return {lng:+x.longitude,lat:+x.latitude,label:x.full_address||x.geocoder_address||q,source:'BridgePoint address geocode'};
    }catch{}
  }
  try{
    const u='https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address='+encodeURIComponent(q);
    const d=await fetch(u).then(r=>r.json());
    const x=d?.result?.addressMatches?.[0];
    if(x?.coordinates)return {lng:+x.coordinates.x,lat:+x.coordinates.y,label:x.matchedAddress||q,source:'U.S. Census geocode'};
  }catch{}
  return null;
}

async function installOverlay(page){
  await page.evaluate(()=>{
    const s=document.createElement('style');
    s.textContent=[
      '#film{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#fff}',
      '#filmTop{position:absolute;top:22px;left:26px;right:26px;display:flex;align-items:center;gap:12px;text-shadow:0 2px 12px #000}',
      '#mark{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,#3bc4ff,#1559ff);font-size:22px;font-weight:950;box-shadow:0 0 30px rgba(47,163,255,.55)}',
      '#brand{font-size:13px;font-weight:950;letter-spacing:.16em}',
      '#badge{margin-left:auto;padding:8px 11px;border-radius:999px;background:rgba(3,10,20,.76);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(12px);font-size:10px;font-weight:900;letter-spacing:.12em}',
      '#lower{position:absolute;left:30px;bottom:42px;max-width:850px;padding:16px 20px;border-radius:18px;background:linear-gradient(90deg,rgba(2,9,21,.93),rgba(2,9,21,.52));border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(14px);box-shadow:0 18px 48px rgba(0,0,0,.35);opacity:0;transform:translateY(10px);transition:.2s ease}',
      '#lower.show{opacity:1;transform:translateY(0)}',
      '#k{font-size:10px;font-weight:950;letter-spacing:.19em;color:#6bd8ff;margin-bottom:6px}',
      '#t{font-size:31px;font-weight:950;line-height:1.05}',
      '#sub{font-size:13px;line-height:1.4;color:rgba(255,255,255,.84);margin-top:8px}',
      '#progress{position:absolute;left:0;bottom:0;height:4px;width:0;background:linear-gradient(90deg,#37bdff,#765fff,#00e2bd);box-shadow:0 0 15px rgba(55,189,255,.65);transition:width .35s ease}',
      '#curtain{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,#11315d 0,#071426 38%,#02060d 76%);display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .18s ease}',
      '#curtain.show{opacity:1;visibility:visible}',
      '#curtainInner{text-align:center;max-width:900px;padding:40px}',
      '#ck{font-size:11px;font-weight:950;letter-spacing:.2em;color:#6bd8ff}',
      '#ct{font-size:46px;font-weight:950;line-height:1.02;margin-top:10px}',
      '#cs{font-size:15px;color:rgba(255,255,255,.72);margin-top:10px}',
      '#line{width:240px;height:3px;border-radius:3px;background:linear-gradient(90deg,transparent,#35c7ff,#7d5cff,transparent);margin:22px auto 0}',
      '#cityStill{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;visibility:hidden;transform:scale(1.06);transition:opacity .28s ease,transform 2.8s ease;filter:saturate(1.05) contrast(1.03)}',
      '#cityStill.show{opacity:1;visibility:visible;transform:scale(1)}',
      '#cursor{position:absolute;width:18px;height:18px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 5px rgba(47,178,255,.2),0 0 18px rgba(47,178,255,.8);left:50%;top:50%;transform:translate(-50%,-50%);transition:left .18s ease,top .18s ease,transform .08s ease;opacity:.94}',
      '#cursor.down{transform:translate(-50%,-50%) scale(.72)}'
    ].join('');
    document.head.appendChild(s);
    const o=document.createElement('div');
    o.id='film';
    o.innerHTML='<img id="cityStill"><div id="filmTop"><div id="mark">B</div><div id="brand">BRIDGEPOINT INTELLIGENCE</div><div id="badge">LIVE PRODUCTION CAPTURE</div></div><div id="lower"><div id="k"></div><div id="t"></div><div id="sub"></div></div><div id="progress"></div><div id="curtain"><div id="curtainInner"><div id="ck"></div><div id="ct"></div><div id="cs"></div><div id="line"></div></div></div><div id="cursor"></div>';
    document.body.appendChild(o);
  });
}

async function lower(page,k,t,sub,hold=1200,p=null){
  await se(page,({k,t,sub,p})=>{
    const e=document.getElementById('lower');if(!e)return;
    document.getElementById('k').textContent=k||'';
    document.getElementById('t').textContent=t||'';
    document.getElementById('sub').textContent=sub||'';
    if(p!=null)document.getElementById('progress').style.width=Math.max(0,Math.min(100,p))+'%';
    e.classList.add('show');
  },{k,t,sub,p});
  await sleep(hold);
  await se(page,()=>document.getElementById('lower')?.classList.remove('show'));
  await sleep(140);
}

async function curtain(page,k,t,sub,on=true){
  await se(page,({k,t,sub,on})=>{
    document.getElementById('ck').textContent=k||'';
    document.getElementById('ct').textContent=t||'';
    document.getElementById('cs').textContent=sub||'';
    document.getElementById('curtain')?.classList.toggle('show',!!on);
  },{k,t,sub,on});
  await sleep(220);
}

async function showCityStill(page,path,k,t,sub,p){
  const b64=fs.readFileSync(path).toString('base64');
  await se(page,({src})=>{
    const im=document.getElementById('cityStill');im.src=src;im.classList.remove('show');
    void im.offsetWidth;im.classList.add('show');
  },{src:'data:image/png;base64,'+b64});
  await lower(page,k,t,sub,1500,p);
  await sleep(900);
  await se(page,()=>document.getElementById('cityStill')?.classList.remove('show'));
  await sleep(240);
}

async function cursorTo(page,loc){
  try{
    const b=await loc.boundingBox();if(!b)return;
    await se(page,({x,y})=>{const c=document.getElementById('cursor');if(c){c.style.left=x+'px';c.style.top=y+'px'}},{x:b.x+b.width/2,y:b.y+b.height/2});
    await sleep(170);
  }catch{}
}
async function click(page,loc){
  await cursorTo(page,loc);
  await se(page,()=>document.getElementById('cursor')?.classList.add('down'));
  await sleep(65);
  try{await loc.click({force:true,timeout:3000})}catch{}
  await se(page,()=>document.getElementById('cursor')?.classList.remove('down'));
  await sleep(120);
}

async function tab(page,name,title,sub,p,scroll=0){
  const loc=page.locator('#bpInspectorTabs button[data-tab="'+name+'"]');
  try{
    await loc.waitFor({state:'attached',timeout:3000});
    await click(page,loc);
    await se(page,scroll=>{const panel=document.getElementById('buildingPanel');if(panel)panel.scrollTo({top:scroll,behavior:'smooth'})},scroll);
    await sleep(520);
    await lower(page,'PROPERTY INTELLIGENCE',title,sub,980,p);
    return true;
  }catch{return false}
}

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const browser=await chromium.launch({headless:false,args:['--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage']});

  console.log('CAPTURE_CITY_STILLS');
  await captureCityShots(browser);

  console.log('GEOCODE_PROPERTIES');
  const auth=await resolveGeocoders();
  const geos=[];
  for(const q of properties){geos.push(await geocode(q,auth));await sleep(120)}

  console.log('START_RECORDING');
  fs.mkdirSync(OUT+'/raw',{recursive:true});
  const ctx=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:OUT+'/raw',size:{width:1920,height:1080}},ignoreHTTPSErrors:true});
  const page=await ctx.newPage();
  const video=page.video();
  page.setDefaultTimeout(4000);
  await boot(page);
  await installOverlay(page);

  const status=await se(page,()=>window.__BP_FRONTEND_STATUS__||null);
  const can=status?.canonical_properties?Number(status.canonical_properties).toLocaleString():'NATIONAL';
  const bld=status?.archived_buildings?Number(status.archived_buildings).toLocaleString()+' BUILDING RECORDS':'3D BUILDING INTELLIGENCE';
  await lower(page,'BRIDGEPOINT INTELLIGENCE',can+' CANONICAL PROPERTIES',bld+' • parcel geometry • structural X-ray • source lineage • live context',2800,2);

  for(let i=0;i<cities.length;i++){
    await showCityStill(page,OUT+'/cities/city-'+String(i).padStart(2,'0')+'.png','CITY '+String(i+1).padStart(2,'0')+' / '+cities.length,cities[i][0],cities[i][1]+' • real rendered production-map capture',5+(i/cities.length)*18);
  }

  await curtain(page,'PROPERTY INTELLIGENCE','10 LIVE ADDRESS DEEP DIVES','Real production building and parcel inspector views',true);
  await sleep(900);
  await curtain(page,'','','',false);

  for(let i=0;i<properties.length;i++){
    const q=properties[i],g=geos[i],base=25+(i/properties.length)*70;
    await curtain(page,'PROPERTY '+String(i+1).padStart(2,'0')+' / '+properties.length,q,g?'Resolving the production building and parcel inspector…':'Address coordinate could not be resolved; no data will be fabricated.',true);
    if(!g){await sleep(850);await curtain(page,'','','',false);continue}

    await mapJump(page,g.lng,g.lat,18.15,62,-18);
    await se(page,({lng,lat})=>{
      window.__BP_V5000_SELECT_BUILDING__?.({lngLat:{lng,lat},feature:null});
    },{lng:g.lng,lat:g.lat});
    try{await page.locator('#buildingPanel').waitFor({state:'visible',timeout:7000})}catch{}
    await sleep(5200);
    await curtain(page,'','','',false);
    await lower(page,'PROPERTY '+String(i+1).padStart(2,'0')+' / '+properties.length,q,g.source+' • live production property selection',1250,base);

    await tab(page,'overview','OVERVIEW','Canonical property identity • source-backed building metrics • geometry • height • floors • source confidence',base+1,0);
    await tab(page,'xray','3D PICK-UP + PARCEL CUTOUT','Selected building • stored parcel cutout • terrain/surface • top-down measurable geometry',base+2,0);
    await se(page,()=>{const p=document.getElementById('buildingPanel');if(p)p.scrollTo({top:520,behavior:'smooth'})});
    await sleep(750);
    await lower(page,'STRUCTURAL X-RAY','FLOOR STACK + ROOF EVIDENCE','BridgePoint separates source-backed structure from derived floors and does not invent unavailable interiors.',950,base+3);
    await tab(page,'provenance','SOURCE / PROVENANCE','Dataset/provider • original record • timestamps • release/license • parcel-boundary source',base+4,0);
    await tab(page,'context','LIVE CONTEXT','Terrain • land/surface material • source freshness • nearby hazard context',base+5,0);
    await tab(page,'intel','PROPERTY TIMELINE + SCORE','Heartbeat • evidence families • property timeline • explainability when the session is authorized',base+6,120);
    await tab(page,'media','PROPERTY VIEWS','Top/aerial • 3D • street-level context • imagery-history surface',base+7,0);
    await tab(page,'xray','ONE PROPERTY. MULTIPLE LAYERS.','3D geometry, parcel truth, structural stack, provenance and live context remain attached to one selection.',base+8,0);
    await sleep(500);
  }

  await showCityStill(page,OUT+'/cities/city-09.png','FINAL SHOT','HARTFORD, CONNECTICUT','BridgePoint Intelligence • city-to-property spatial workflow',97);
  await curtain(page,'BRIDGEPOINT INTELLIGENCE','ONE MAP. THE BACKEND UNDERNEATH IT.','Silent master ready for your voice-over.',true);
  await sleep(2800);

  await ctx.close();
  await browser.close();
  const p=await video.path();
  fs.writeFileSync(OUT+'/video-path.txt',p);
  console.log('VIDEO_PATH='+p);
})().catch(e=>{console.error(e?.stack||e);process.exit(1)});