const { chromium } = require('playwright');
const fs = require('fs');

const SITE='https://bridgepointintelligence.online/app/?capture=perfect-v3';
const OUT='demo-output-v3';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const cities=[
['NEW YORK CITY','New York, NY',-73.9857,40.7484,16.5,62,-18],
['LOS ANGELES','Los Angeles, CA',-118.2437,34.0522,16.1,60,18],
['CHICAGO','Chicago, IL',-87.6298,41.8781,16.3,62,-15],
['MIAMI','Miami, FL',-80.1918,25.7617,16.3,60,-18],
['SEATTLE','Seattle, WA',-122.3321,47.6062,16.2,60,18],
['DENVER','Denver, CO',-104.9903,39.7392,16.1,58,-16],
['BOSTON','Boston, MA',-71.0589,42.3601,16.2,60,15],
['SAN FRANCISCO','San Francisco, CA',-122.4194,37.7749,16.3,62,18],
['DALLAS','Dallas, TX',-96.7970,32.7767,16.3,60,-16],
['HARTFORD','Hartford, CT',-72.6734,41.7658,16.5,62,-18]
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
  await sleep(1800);
  await se(page,()=>{
    const s=document.getElementById('systemPanel');if(s)s.style.setProperty('display','none','important');
    const live=document.getElementById('toggleLiveContext');if(live&&live.classList.contains('active'))live.click();
    const three=document.querySelector('button[data-layer="buildings"]');if(three&&!three.classList.contains('active'))three.click();
    const parcels=document.querySelector('button[data-layer="parcels"]');if(parcels&&!parcels.classList.contains('active'))parcels.click();
  });
}

async function installOverlay(page){
  await page.evaluate(()=>{
    if(document.getElementById('bpFilm'))return;
    const s=document.createElement('style');
    s.textContent=[
      '#bpFilm{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#fff}',
      '#bpTop{position:absolute;top:22px;left:26px;right:26px;display:flex;align-items:center;gap:12px;text-shadow:0 2px 12px #000}',
      '#bpMark{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,#3bc4ff,#1559ff);font-size:22px;font-weight:950;box-shadow:0 0 30px rgba(47,163,255,.55)}',
      '#bpBrand{font-size:13px;font-weight:950;letter-spacing:.16em}',
      '#bpBadge{margin-left:auto;padding:8px 11px;border-radius:999px;background:rgba(3,10,20,.76);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(12px);font-size:10px;font-weight:900;letter-spacing:.12em}',
      '#bpLower{position:absolute;left:30px;bottom:42px;max-width:820px;padding:16px 20px;border-radius:18px;background:linear-gradient(90deg,rgba(2,9,21,.92),rgba(2,9,21,.55));border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(14px);box-shadow:0 18px 48px rgba(0,0,0,.35);opacity:0;transform:translateY(10px);transition:.22s ease}',
      '#bpLower.show{opacity:1;transform:translateY(0)}',
      '#bpK{font-size:10px;font-weight:950;letter-spacing:.19em;color:#6bd8ff;margin-bottom:6px}',
      '#bpT{font-size:30px;font-weight:950;line-height:1.06}',
      '#bpS{font-size:13px;line-height:1.4;color:rgba(255,255,255,.84);margin-top:8px}',
      '#bpProgress{position:absolute;left:0;bottom:0;height:4px;width:0;background:linear-gradient(90deg,#37bdff,#765fff,#00e2bd);box-shadow:0 0 15px rgba(55,189,255,.65);transition:width .4s ease}',
      '#bpCurtain{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,#11315d 0,#071426 38%,#02060d 76%);display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .22s ease;pointer-events:none}',
      '#bpCurtain.show{opacity:1;visibility:visible}',
      '#bpCurtainInner{text-align:center;max-width:900px;padding:40px}',
      '#bpCurtainK{font-size:11px;font-weight:950;letter-spacing:.2em;color:#6bd8ff}',
      '#bpCurtainT{font-size:46px;font-weight:950;line-height:1.02;margin-top:10px}',
      '#bpCurtainS{font-size:15px;color:rgba(255,255,255,.72);margin-top:10px}',
      '#bpLine{width:240px;height:3px;border-radius:3px;background:linear-gradient(90deg,transparent,#35c7ff,#7d5cff,transparent);margin:22px auto 0;animation:bpPulse 1s infinite alternate}',
      '@keyframes bpPulse{from{opacity:.35;transform:scaleX(.72)}to{opacity:1;transform:scaleX(1)}}',
      '#bpCursor{position:absolute;width:18px;height:18px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 5px rgba(47,178,255,.2),0 0 18px rgba(47,178,255,.8);left:50%;top:50%;transform:translate(-50%,-50%);transition:left .18s ease,top .18s ease,transform .08s ease;opacity:.94}',
      '#bpCursor.down{transform:translate(-50%,-50%) scale(.72)}'
    ].join('');
    document.head.appendChild(s);
    const o=document.createElement('div');
    o.id='bpFilm';
    o.innerHTML='<div id="bpTop"><div id="bpMark">B</div><div id="bpBrand">BRIDGEPOINT INTELLIGENCE</div><div id="bpBadge">LIVE PRODUCTION CAPTURE</div></div><div id="bpLower"><div id="bpK"></div><div id="bpT"></div><div id="bpS"></div></div><div id="bpProgress"></div><div id="bpCurtain"><div id="bpCurtainInner"><div id="bpCurtainK"></div><div id="bpCurtainT"></div><div id="bpCurtainS"></div><div id="bpLine"></div></div></div><div id="bpCursor"></div>';
    document.body.appendChild(o);
  });
}

async function curtain(page,k,t,s,on=true){
  await se(page,({k,t,s,on})=>{
    const c=document.getElementById('bpCurtain');if(!c)return;
    document.getElementById('bpCurtainK').textContent=k||'';
    document.getElementById('bpCurtainT').textContent=t||'';
    document.getElementById('bpCurtainS').textContent=s||'';
    c.classList.toggle('show',!!on);
  },{k,t,s,on});
  await sleep(on?260:260);
}

async function lower(page,k,t,s,hold=1200,p=null){
  await se(page,({k,t,s,p})=>{
    const c=document.getElementById('bpLower');if(!c)return;
    document.getElementById('bpK').textContent=k||'';
    document.getElementById('bpT').textContent=t||'';
    document.getElementById('bpS').textContent=s||'';
    if(p!=null)document.getElementById('bpProgress').style.width=Math.max(0,Math.min(100,p))+'%';
    c.classList.add('show');
  },{k,t,s,p});
  await sleep(hold);
  await se(page,()=>document.getElementById('bpLower')?.classList.remove('show'));
  await sleep(140);
}

async function waitMap(page,min=900,timeout=12000){
  try{
    await page.waitForFunction(()=>{
      const m=window.__BP_V5000_WORLD?.map;if(!m)return false;
      try{return typeof m.areTilesLoaded!=='function'||m.areTilesLoaded()}catch{return true}
    },{timeout});
  }catch{}
  await sleep(min);
}

async function waitBuildings(page,timeout=9000){
  try{
    await page.waitForFunction(()=>{
      const m=window.__BP_V5000_WORLD?.map;if(!m)return false;
      for(const id of ['gta-context-buildings','gta-opportunity-buildings','gta-exact-building','gta-bp-buildings']){
        try{if(m.getLayer(id)&&m.queryRenderedFeatures({layers:[id]}).length>2)return true}catch{}
      }
      return false;
    },{timeout});
  }catch{}
}

async function mapTo(page,lng,lat,zoom,pitch,bearing,duration=600){
  await se(page,({lng,lat,zoom,pitch,bearing,duration})=>{
    const m=window.__BP_V5000_WORLD?.map;if(m)m.jumpTo({center:[lng,lat],zoom,pitch,bearing});
  },{lng,lat,zoom,pitch,bearing,duration});
  await waitMap(page,700,10000);
  await waitBuildings(page,8000);
  await sleep(700);
}

async function showSearch(page){
  await se(page,()=>{
    document.getElementById('toggleSearch')?.click();
    const f=document.getElementById('publicSearchForm');
    if(f){
      f.style.setProperty('display','block','important');
      f.style.setProperty('visibility','visible','important');
      f.style.setProperty('opacity','1','important');
      f.style.setProperty('pointer-events','auto','important');
      f.style.setProperty('transform','none','important');
    }
  });
  await sleep(300);
}

async function cursorTo(page,loc){
  try{
    const b=await loc.boundingBox();if(!b)return;
    await se(page,({x,y})=>{const c=document.getElementById('bpCursor');if(c){c.style.left=x+'px';c.style.top=y+'px'}},{x:b.x+b.width/2,y:b.y+b.height/2});
    await sleep(180);
  }catch{}
}

async function click(page,loc){
  await cursorTo(page,loc);
  await se(page,()=>document.getElementById('bpCursor')?.classList.add('down'));
  await sleep(70);
  try{await loc.click({force:true,timeout:4000})}catch{}
  await se(page,()=>document.getElementById('bpCursor')?.classList.remove('down'));
  await sleep(120);
}

async function tab(page,name,title,sub,p,scroll=0){
  const loc=page.locator('#bpInspectorTabs button[data-tab="'+name+'"]');
  try{
    await loc.waitFor({state:'attached',timeout:5000});
    await click(page,loc);
    await se(page,scroll=>{const p=document.getElementById('buildingPanel');if(p)p.scrollTo({top:scroll,behavior:'smooth'})},scroll);
    await sleep(650);
    await lower(page,'PROPERTY INTELLIGENCE',title,sub,1050,p);
    return true;
  }catch{return false}
}

(async()=>{
  fs.mkdirSync(OUT+'/raw',{recursive:true});
  const browser=await chromium.launch({headless:false,args:['--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage']});
  const context=await browser.newContext({
    viewport:{width:1920,height:1080},
    recordVideo:{dir:OUT+'/raw',size:{width:1920,height:1080}},
    ignoreHTTPSErrors:true
  });
  const page=await context.newPage();
  const video=page.video();
  page.setDefaultTimeout(6000);
  await boot(page);
  await installOverlay(page);

  const status=await se(page,()=>window.__BP_FRONTEND_STATUS__||null);
  const can=status?.canonical_properties?Number(status.canonical_properties).toLocaleString():'NATIONAL';
  const bld=status?.archived_buildings?Number(status.archived_buildings).toLocaleString()+' BUILDING RECORDS':'3D BUILDING INTELLIGENCE';
  await lower(page,'BRIDGEPOINT INTELLIGENCE',can+' CANONICAL PROPERTIES',bld+' • parcel geometry • structural X-ray • source lineage • live context',2600,2);

  for(let i=0;i<cities.length;i++){
    const c=cities[i];
    await curtain(page,'CITY '+String(i+1).padStart(2,'0')+' / '+cities.length,c[0],'Rendering live 3D city context…',true);
    await mapTo(page,c[2],c[3],c[4],c[5],c[6],600);
    await curtain(page,'','','',false);
    await lower(page,'NATIONAL 3D WORLD',c[0],c[1]+' • rendered city context',1550,5+(i/cities.length)*18);
    await sleep(900);
  }

  await curtain(page,'PROPERTY INTELLIGENCE','10 LIVE ADDRESS DEEP DIVES','Search → select → inspect → verify',true);
  await sleep(800);
  await curtain(page,'','','',false);

  for(let i=0;i<properties.length;i++){
    const q=properties[i],base=25+(i/properties.length)*70;
    await se(page,()=>document.getElementById('closeBuilding')?.click());
    await showSearch(page);
    const input=page.locator('#publicSearchInput');
    await cursorTo(page,input);
    await input.fill('');
    await input.type(q,{delay:12});
    await sleep(280);
    const go=page.locator('#publicSearchForm button[type="submit"]');
    await click(page,go);

    const result=page.locator('#publicSearchResults button:not([disabled])').first();
    let found=false;
    try{
      await result.waitFor({state:'visible',timeout:15000});
      await cursorTo(page,result);
      await sleep(550);
      await click(page,result);
      found=true;
    }catch{}

    await curtain(page,'PROPERTY '+String(i+1).padStart(2,'0')+' / '+properties.length,q,found?'Resolving building, parcel and inspector layers…':'Live search returned no selectable property match.',true);

    if(found){
      try{await page.locator('#buildingPanel').waitFor({state:'visible',timeout:12000})}catch{}
      await waitMap(page,950,12000);
      await waitBuildings(page,9000);
      try{
        await page.waitForFunction(()=>{
          const b=document.getElementById('buildingTruthBadge')?.textContent||'';
          return b && !/LOADING|RETRY/i.test(b);
        },{timeout:9000});
      }catch{}
      await sleep(850);
      await curtain(page,'','','',false);

      const center=await se(page,()=>window.__BP_V5000_WORLD?.map?.getCenter()?.toArray?.());
      if(Array.isArray(center)){
        await se(page,c=>window.__BP_V5000_WORLD?.map?.jumpTo({center:c,zoom:18.25,pitch:64,bearing:-24}),center);
        await waitMap(page,700,8000);
        await sleep(800);
      }

      await lower(page,'PROPERTY '+String(i+1).padStart(2,'0')+' / '+properties.length,q,'Real production property selection',1250,base);
      await tab(page,'overview','OVERVIEW','Canonical property identity • building metrics • geometry • height • floors • source confidence',base+1,0);
      await tab(page,'xray','3D PICK-UP + PARCEL CUTOUT','Orbitable building • exact parcel cutout • terrain/surface • top-down measurable geometry',base+2,0);
      await sleep(600);
      await se(page,()=>{const p=document.getElementById('buildingPanel');if(p)p.scrollTo({top:520,behavior:'smooth'})});
      await sleep(850);
      await lower(page,'STRUCTURAL X-RAY','FLOOR STACK + ROOF EVIDENCE','Source-backed structure is separated from derived floors; interior geometry is never invented.',1000,base+3);
      await se(page,()=>{const p=document.getElementById('buildingPanel');if(p)p.scrollTo({top:920,behavior:'smooth'})});
      await sleep(850);
      await tab(page,'provenance','SOURCE / PROVENANCE','Dataset/provider • original record • timestamps • release/license • parcel-boundary source',base+4,0);
      await tab(page,'context','LIVE CONTEXT','Terrain • land/surface material • source freshness • nearby hazards',base+5,0);
      await tab(page,'intel','PROPERTY TIMELINE + SCORE','Heartbeat • opportunity strength • evidence families • property timeline • explainability',base+6,140);
      await tab(page,'media','PROPERTY VIEWS','Top/aerial • 3D • street-level context • imagery-history surface',base+7,0);
      await tab(page,'xray','ONE PROPERTY. MULTIPLE LAYERS.','3D geometry, parcel truth, structural stack, source lineage and live context stay attached to one selection.',base+8,0);
      await sleep(650);
    }else{
      await sleep(900);
      await curtain(page,'','','',false);
      await lower(page,'LIVE SEARCH RESPONSE',q,'No property detail was fabricated for an unresolved production search.',1300,base);
    }
  }

  await curtain(page,'FINAL SHOT','HARTFORD, CONNECTICUT','Rendering the closing city view…',true);
  await mapTo(page,-72.6734,41.7658,16.4,62,-18,600);
  await curtain(page,'','','',false);
  await lower(page,'BUILT FOR DECISIONS','SEARCH → RENDER → INSPECT → VERIFY','A national property-intelligence workflow from city scale down to one structure.',2200,97);
  await curtain(page,'BRIDGEPOINT INTELLIGENCE','ONE MAP. THE BACKEND UNDERNEATH IT.','Silent master ready for voice-over.',true);
  await sleep(2600);
  await context.close();
  await browser.close();
  const p=await video.path();
  fs.writeFileSync(OUT+'/video-path.txt',p);
  console.log('VIDEO_PATH='+p);
})().catch(e=>{console.error(e?.stack||e);process.exit(1)});