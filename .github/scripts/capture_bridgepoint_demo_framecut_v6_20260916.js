const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
const SITE='https://bridgepointintelligence.online/app/?capture=framecut-v6';
const OUT='demo-framecut-v6';
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
const props=[
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
 await sleep(2500);
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
   '#film{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#fff}',
   '#top{position:absolute;top:24px;left:28px;right:28px;display:flex;align-items:center;gap:12px;text-shadow:0 2px 12px #000}',
   '#logo{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,#3cc5ff,#1456ff);font-size:23px;font-weight:950;box-shadow:0 0 30px rgba(48,166,255,.58)}',
   '#brand{font-size:13px;font-weight:950;letter-spacing:.17em}',
   '#live{margin-left:auto;padding:8px 12px;border-radius:999px;background:rgba(3,10,20,.78);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(12px);font-size:10px;font-weight:900;letter-spacing:.12em}',
   '#lower{position:absolute;left:32px;bottom:44px;max-width:900px;padding:17px 21px;border-radius:18px;background:linear-gradient(90deg,rgba(2,9,21,.94),rgba(2,9,21,.53));border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(14px);box-shadow:0 18px 48px rgba(0,0,0,.35)}',
   '#k{font-size:10px;font-weight:950;letter-spacing:.2em;color:#6bdcff;margin-bottom:7px}',
   '#t{font-size:31px;font-weight:950;line-height:1.05}',
   '#sub{font-size:13px;line-height:1.42;color:rgba(255,255,255,.84);margin-top:8px}',
   '#prog{position:absolute;left:0;bottom:0;height:4px;width:0;background:linear-gradient(90deg,#37bdff,#765fff,#00e2bd);box-shadow:0 0 15px rgba(55,189,255,.65)}'
  ].join('');
  document.head.appendChild(s);
  const o=document.createElement('div');o.id='film';
  o.innerHTML='<div id="top"><div id="logo">B</div><div id="brand">BRIDGEPOINT INTELLIGENCE</div><div id="live">LIVE PRODUCTION CAPTURE</div></div><div id="lower"><div id="k"></div><div id="t"></div><div id="sub"></div></div><div id="prog"></div>';
  document.body.appendChild(o);
 });
}
async function setOverlay(page,k,t,sub,p){
 await se(page,({k,t,sub,p})=>{
   document.getElementById('k').textContent=k||'';
   document.getElementById('t').textContent=t||'';
   document.getElementById('sub').textContent=sub||'';
   document.getElementById('prog').style.width=Math.max(0,Math.min(100,p||0))+'%';
 },{k,t,sub,p});
}
async function cdpShot(page,cdp,file){
 const r=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:88,fromSurface:true,captureBeyondViewport:false});
 fs.writeFileSync(file,Buffer.from(r.data,'base64'));
}
async function waitMap(page,ms=5000){
 try{await page.waitForFunction(()=>{const m=window.__BP_V5000_WORLD?.map;return !!m&&(typeof m.areTilesLoaded!=='function'||m.areTilesLoaded())},{timeout:8000})}catch{}
 await sleep(ms);
}
async function jump(page,lng,lat,zoom=16.6,pitch=62,bearing=-18){
 await se(page,({lng,lat,zoom,pitch,bearing})=>window.__BP_V5000_WORLD?.map?.jumpTo({center:[lng,lat],zoom,pitch,bearing}),{lng,lat,zoom,pitch,bearing});
}
async function searchAndSelect(page,q){
 return await se(page,async q=>{
  const inp=document.getElementById('publicSearchInput'),form=document.getElementById('publicSearchForm'),box=document.getElementById('publicSearchResults');
  if(!inp||!form||!box)return {ok:false,why:'search UI missing'};
  document.getElementById('closeBuilding')?.click();
  inp.value=q; inp.dispatchEvent(new Event('input',{bubbles:true}));
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  const started=Date.now();
  while(Date.now()-started<14000){
    const b=box.querySelector('button:not([disabled])');
    if(b){const text=b.innerText||q;b.click();return {ok:true,text}}
    const txt=box.innerText||'';
    if(/No address location|No.*match/i.test(txt))return {ok:false,why:txt};
    await new Promise(r=>setTimeout(r,250));
  }
  return {ok:false,why:'search timeout'};
 },q);
}
async function clickTab(page,name,scroll=0){
 return await se(page,({name,scroll})=>{
  const b=document.querySelector('#bpInspectorTabs button[data-tab="'+name+'"]');
  if(!b)return false;b.click();
  const p=document.getElementById('buildingPanel');if(p)p.scrollTo({top:scroll,behavior:'auto'});
  return true;
 },{name,scroll});
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true}); fs.mkdirSync(OUT+'/frames',{recursive:true});
 const browser=await chromium.launch({headless:false,args:['--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage']});
 const ctx=await browser.newContext({viewport:{width:1280,height:720},ignoreHTTPSErrors:true});
 const page=await ctx.newPage(); const cdp=await ctx.newCDPSession(page);
 page.setDefaultTimeout(5000);
 await boot(page); await overlay(page);
 let n=0; const manifest=[];
 const shot=async(label,dur=1.5)=>{
   const file=OUT+'/frames/'+String(n).padStart(3,'0')+'.jpg';
   await cdpShot(page,cdp,file); manifest.push({file:path.resolve(file),dur,label}); n++;
 };
 const st=await se(page,()=>window.__BP_FRONTEND_STATUS__||null);
 const can=st?.canonical_properties?Number(st.canonical_properties).toLocaleString():'NATIONAL';
 const bld=st?.archived_buildings?Number(st.archived_buildings).toLocaleString()+' building records':'3D building intelligence';
 await setOverlay(page,'BRIDGEPOINT INTELLIGENCE',can+' CANONICAL PROPERTIES',bld+' • parcel geometry • structural X-ray • property timeline • source lineage • live context',2);
 await waitMap(page,1800); await shot('intro',3);

 for(let i=0;i<cities.length;i++){
  const c=cities[i];
  await jump(page,c[2],c[3],16.6,62,i%2?18:-18); await waitMap(page,3500);
  await setOverlay(page,'CITY '+String(i+1).padStart(2,'0')+' / '+cities.length,c[0],c[1]+' • fully rendered production-map capture',5+(i/cities.length)*18);
  await shot('city '+c[0],1.8);
 }

 for(let i=0;i<props.length;i++){
  const q=props[i],base=25+(i/props.length)*70;
  await setOverlay(page,'PROPERTY '+String(i+1).padStart(2,'0')+' / '+props.length,q,'Searching the live BridgePoint production property graph…',base);
  const r=await searchAndSelect(page,q);
  if(!r?.ok){
    await setOverlay(page,'LIVE SEARCH RESPONSE',q,'No selectable production result returned. Nothing fabricated.',base);
    await shot('unresolved '+q,1.5); continue;
  }
  try{await page.waitForFunction(()=>{const p=document.getElementById('buildingPanel');return p&&!p.hidden},{timeout:9000})}catch{}
  await waitMap(page,3200);
  await setOverlay(page,'PROPERTY '+String(i+1).padStart(2,'0')+' / '+props.length,q,'Live production property selection',base);
  await shot('property '+q,1.6);

  const views=[
   ['overview',0,'OVERVIEW','Canonical identity • building metrics • geometry • height • floors • source confidence'],
   ['xray',0,'3D PICK-UP + PARCEL CUTOUT','Selected building • stored parcel geometry • terrain/surface • top-down measurable view'],
   ['xray',520,'STRUCTURAL X-RAY','Floor stack • roof evidence • source-backed versus derived structure'],
   ['provenance',0,'SOURCE / PROVENANCE','Dataset/provider • source record • timestamps • license/release • parcel source'],
   ['context',0,'LIVE CONTEXT','Terrain • surface material • source freshness • nearby active hazards'],
   ['intel',120,'PROPERTY TIMELINE + SCORE','Heartbeat • evidence families • timeline • explainability when authorized'],
   ['media',0,'PROPERTY VIEWS','Top/aerial • 3D • street-level context • imagery-history surface']
  ];
  for(let j=0;j<views.length;j++){
   const v=views[j]; const ok=await clickTab(page,v[0],v[1]); if(!ok)continue;
   await sleep(700);
   await setOverlay(page,'PROPERTY INTELLIGENCE',v[2],v[3],base+j+1);
   await shot(v[2]+' '+q,1.45);
  }
 }

 await jump(page,-72.6734,41.7658,16.6,62,-18); await waitMap(page,5000);
 await setOverlay(page,'BUILT FOR DECISIONS','SEARCH → RENDER → INSPECT → VERIFY','A national property-intelligence workflow from city scale down to one structure.',97);
 await shot('final city',2.2);
 await setOverlay(page,'BRIDGEPOINT INTELLIGENCE','ONE MAP. THE BACKEND UNDERNEATH IT.','Silent master ready for your voice-over.',100);
 await shot('outro',3);

 fs.writeFileSync(OUT+'/manifest.json',JSON.stringify(manifest,null,2));
 const lines=['ffconcat version 1.0'];
 for(const x of manifest){lines.push("file '"+x.file.replace(/'/g,"'\\''")+"'");lines.push('duration '+x.dur)}
 lines.push("file '"+manifest[manifest.length-1].file.replace(/'/g,"'\\''")+"'");
 fs.writeFileSync(OUT+'/concat.txt',lines.join('\n'));
 await ctx.close(); await browser.close();
 console.log('FRAMES='+manifest.length);
})().catch(e=>{console.error(e?.stack||e);process.exit(1)});