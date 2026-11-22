(function(){
 'use strict';

 const VERSION='6528-global-power-outages-v4';
 const BUTTON_ACTION='poweroutages';
 const BUTTON_ID='bp-power-outages-v1-button';
 const STATUS_ID='bp-power-outages-v1-status';
 const DETAIL_ID='bp-power-outages-v1-detail';
 const POLL_MS=5*60*1000;
 const ORNL_API='https://ornl.opendatasoft.com/api/explore/v2.1/catalog/datasets/odin-real-time-outages-county/records';
 const ORNL_META='https://ornl.opendatasoft.com/api/explore/v2.1/catalog/datasets/odin-real-time-outages-county';
 const ORNL_URL='https://ornl.opendatasoft.com/explore/assets/odin-real-time-outages-county/';
 const POWERCUT_API='https://powercut.io/api/now.json';
 const POWERCUT_URL='https://powercut.io/';
 const SEED_URL='/bp-power-outages-seed-v1.json?v=6528-global-power-outages-v4';
 const SEED_CACHE_KEY='bp-power-outages-seed-v2';
 const ORNL_SELECT='cause,communitydescriptor,metersaffected,reportedstarttime,statuskind,estimatedrestorationtime,causekind,incident_cause,name,utility_id,county,state,geom,geo_point_2d,centroid';
 const IDS={
  countiesSource:'bp-global-outage-counties-v1',
  countyMarkersSource:'bp-global-outage-county-markers-v3',
  pointsSource:'bp-global-outage-report-points-v3',
  areaFill:'bp-global-outage-area-fill-v1',
  areaLine:'bp-global-outage-area-line-v1',
  areaPoints:'bp-global-outage-county-icons-v3',
  reportPoints:'bp-global-outage-report-icons-v3',
  areaDots:'bp-global-outage-county-dots-v3',
  reportDots:'bp-global-outage-report-dots-v3'
 };
 let map=null,enabled=false,busy=false,lastData=null,lastRefresh=0,refreshTimer=0,mapWaitTimer=0,refreshTimeout=0,observer=null,scanQueued=false,mapWaitStartedAt=0;
 let metaLastModified='',activeController=null;
 let seedData=readSeedCache(),seedPromise=null;
 const numFmt=new Intl.NumberFormat();
 const dateFmt=new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'});
 const empty=()=>({type:'FeatureCollection',features:[]});

 function normalizeSeed(value){
  if(!value||typeof value!=='object')return null;
  const countyMarkers=value.countyMarkers,globalPoints=value.globalPoints;
  if(!Array.isArray(countyMarkers?.features)||!Array.isArray(globalPoints?.features))return null;
  return {countyMarkers,globalPoints,generatedAt:String(value.generatedAt||''),counts:{
   counties:Number(value.counts?.counties)||countyMarkers.features.length,
   reports:Number(value.counts?.reports)||globalPoints.features.length
  }};
 }
 function readSeedCache(){
  try{
   const cached=JSON.parse(localStorage.getItem(SEED_CACHE_KEY)||'null');
   if(!cached||Date.now()-Number(cached.cachedAt)>14*24*60*60*1000)return null;
   return normalizeSeed(cached.seed);
  }catch(_){return null}
 }
 function storeSeedCache(value){
  const normalized=normalizeSeed(value);if(!normalized)return;
  seedData=normalized;
  try{localStorage.setItem(SEED_CACHE_KEY,JSON.stringify({cachedAt:Date.now(),seed:normalized}))}catch(_){}
 }
 function primeSeed(){
  if(seedPromise)return seedPromise;
  seedPromise=fetch(SEED_URL,{mode:'cors',credentials:'omit',cache:'no-store',headers:{Accept:'application/json'}})
   .then(response=>{if(!response.ok)throw new Error('HTTP '+response.status);return response.json()})
   .then(value=>{
    const normalized=normalizeSeed(value);if(!normalized)throw new Error('Invalid outage marker snapshot');
    storeSeedCache(normalized);
    if(enabled&&map?.isStyleLoaded?.()){ensureMapLayers();applySeedSnapshot()}
    return normalized;
   })
   .catch(error=>{console.warn('Power outage instant marker snapshot unavailable',error);return seedData})
   .finally(()=>{seedPromise=null});
  return seedPromise;
 }
 function applySeedSnapshot(){
  if(!map||!seedData)return false;
  const countySource=map.getSource(IDS.countyMarkersSource),reportSource=map.getSource(IDS.pointsSource);
  if(!countySource||!reportSource)return false;
  try{countySource.setData(seedData.countyMarkers);reportSource.setData(seedData.globalPoints)}catch(_){return false}
  if(!lastRefresh){
   const counties=empty();
   lastData={counties,points:seedData.globalPoints,countyPoints:seedData.countyMarkers,globalPoints:seedData.globalPoints,
    reports:seedData.globalPoints,counts:seedData.counts,generatedAt:seedData.generatedAt,errors:[]};
  }
  statusText('showing instant outage markers · checking live feeds');
  return true;
 }

 function safeDate(value){
  if(!value)return '';
  const d=new Date(value);
  return Number.isFinite(d.getTime())?dateFmt.format(d):String(value);
 }
 function safeLink(value){
  try{const u=new URL(String(value||''));return u.protocol==='https:'?u.href:''}catch(_){return ''}
 }
 function makeElement(tag,cls,text){
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=String(text);
  return el;
 }
 function styleOnce(){
  if(document.getElementById('bp-power-outages-v1-style'))return;
  const s=document.createElement('style');
  s.id='bp-power-outages-v1-style';
  s.textContent=
   '.bp-power-outages-v1-button{border-color:rgba(255,96,83,.5)!important}'+
   '.bp-power-outages-v1-status{position:absolute;z-index:45;top:14px;left:50%;transform:translateX(-50%);max-width:min(520px,calc(100% - 28px));padding:9px 12px;border:1px solid rgba(115,224,215,.38);border-radius:12px;background:rgba(3,16,22,.9);box-shadow:0 8px 24px rgba(0,0,0,.35);color:#e8fbff;font:700 12px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;pointer-events:none;backdrop-filter:blur(10px)}'+
   '.bp-power-outages-v1-status[hidden],.bp-power-outages-v1-detail[hidden]{display:none!important}'+
   '.bp-power-outages-v1-detail{position:absolute;z-index:60;right:14px;bottom:76px;width:min(370px,calc(100% - 28px));max-height:min(48vh,440px);overflow:auto;padding:15px;border:1px solid rgba(117,222,235,.42);border-radius:16px;background:rgba(4,19,28,.96);box-shadow:0 18px 55px rgba(0,0,0,.48);color:#effcff;font:500 14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;backdrop-filter:blur(14px)}'+
   '.bp-power-outages-v1-detail header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 0 8px}'+
   '.bp-power-outages-v1-detail h3{margin:0;color:#fff;font-size:17px;line-height:1.25}'+
   '.bp-power-outages-v1-detail button{flex:none;border:1px solid rgba(184,227,236,.35);border-radius:8px;background:#102d3a;color:#f1fcff;padding:5px 9px;font:700 14px system-ui;cursor:pointer}'+
   '.bp-power-outages-v1-detail p{margin:8px 0;color:#cde3eb}'+
   '.bp-power-outages-v1-detail dl{display:grid;grid-template-columns:minmax(88px,.65fr) minmax(0,1.35fr);gap:6px 12px;margin:10px 0}'+
   '.bp-power-outages-v1-detail dt{color:#8fb7c4;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}'+
   '.bp-power-outages-v1-detail dd{margin:0;overflow-wrap:anywhere;color:#f2fbfd}'+
   '.bp-power-outages-v1-detail a{color:#7fe6ee;text-decoration:underline;text-underline-offset:2px}'+
   '.bp-power-outages-v1-detail .bp-outage-note{padding:8px 10px;border-radius:9px;background:rgba(36,93,109,.28);font-size:12px}'+
   '@media(max-width:620px){.bp-power-outages-v1-status{top:8px;font-size:11px}.bp-power-outages-v1-detail{bottom:68px;max-height:42vh;padding:13px}}';
  document.head.appendChild(s);
 }
 function ensureButton(){
  const existing=document.getElementById(BUTTON_ID);
  if(existing)return true;
  const grid=document.querySelector('[data-bpv-command-grid="environment"]');
  if(!grid)return false;
  const button=document.createElement('button');
  button.type='button';
  button.id=BUTTON_ID;
  button.className='bpv-command-btn bp-power-outages-v1-button';
  button.dataset.bpvAction=BUTTON_ACTION;
  button.setAttribute('aria-pressed',enabled?'true':'false');
  button.title='Show live reported power-outage locations and affected boundaries';
  const icon=makeElement('span','bpv-command-icon','⚡');
  icon.setAttribute('aria-hidden','true');
  const label=makeElement('span','bpv-command-label','Power Outages');
  button.append(icon,label);
  const wildfire=grid.querySelector('[data-bpv-action="wildfire"]');
  if(wildfire&&wildfire.parentElement===grid)wildfire.after(button);else grid.prepend(button);
  return true;
 }
 function queueButtonScan(){
  if(scanQueued)return;
  scanQueued=true;
  requestAnimationFrame(()=>{scanQueued=false;ensureButton()});
 }
 function observeButtonGrid(){
  styleOnce();
  ensureButton();
  if(observer)return;
  observer=new MutationObserver(queueButtonScan);
  observer.observe(document.documentElement,{childList:true,subtree:true});
 }
 function getMap(){
  const worlds=[window.__BP_LANDING_WORLD__,window.__bpLandingWorldV5420,
   window.__BP_V5000_WORLD__,window.__BP_V5000_WORLD,window.__bpWorldV2300,
   window.__BP_WORLD_V2300__,window.__BP_WORLD__,window.__BP_MAP_WORLD__];
  for(const world of worlds){
   const candidate=world?.map;
   if(candidate&&typeof candidate.getSource==='function'&&typeof candidate.addSource==='function'&&
    typeof candidate.getLayer==='function'&&typeof candidate.isStyleLoaded==='function')return candidate;
  }
  return null;
 }
 function severity(value){
  const n=Number(value)||0;
  return n>=10000?'major':n>=1000?'moderate':'minor';
 }
 function colour(level){
  return level==='major'?'#ff4055':level==='moderate'?'#ffb63e':'#ffe269';
 }
 function iconCanvas(tint){
  const c=document.createElement('canvas');
  c.width=64;c.height=64;
  const x=c.getContext('2d');
  if(!x)return c;
  x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=8;
  x.beginPath();x.arc(32,29,21,0,Math.PI*2);x.fillStyle=tint;x.fill();
  x.shadowBlur=0;x.lineWidth=3;x.strokeStyle='rgba(255,255,255,.96)';x.stroke();
  x.beginPath();x.moveTo(35,11);x.lineTo(22,31);x.lineTo(31,31);x.lineTo(26,48);x.lineTo(42,25);x.lineTo(33,25);x.closePath();
  x.fillStyle='#fff';x.fill();
  x.beginPath();x.arc(32,29,27,0,Math.PI*2);x.lineWidth=2;x.strokeStyle='rgba(7,20,28,.94)';x.stroke();
  return c;
 }
 function addIconImages(){
  const icons=[['bp-outage-icon-major-v1','#ff4055'],['bp-outage-icon-moderate-v1','#ffb63e'],['bp-outage-icon-minor-v1','#ffe269']];
  for(const item of icons){
   if(map.hasImage&&map.hasImage(item[0]))continue;
   try{map.addImage(item[0],iconCanvas(item[1]),{pixelRatio:2})}catch(e){console.warn('Power outage icon unavailable',e)}
  }
 }
 function addLayer(layer){
  if(!map.getLayer(layer.id))map.addLayer(layer);
 }
 function ensureMapLayers(){
  if(!map||!map.isStyleLoaded?.())return false;
  addIconImages();
  if(!map.getSource(IDS.countiesSource)){
   map.addSource(IDS.countiesSource,{type:'geojson',data:empty(),maxzoom:6,tolerance:0.55,buffer:24});
  }
  if(!map.getSource(IDS.pointsSource)){
   map.addSource(IDS.pointsSource,{type:'geojson',data:empty(),maxzoom:6,tolerance:0.55,buffer:24});
  }
  addLayer({
   id:IDS.areaFill,type:'fill',source:IDS.countiesSource,
   paint:{'fill-color':['match',['get','severity'],'major','#ff4055','moderate','#ffb63e','#ffe269'],
    'fill-opacity':['interpolate',['linear'],['zoom'],0,0.035,3,0.06,8,0.08,12,0.055]}
  });
  addLayer({
   id:IDS.areaLine,type:'line',source:IDS.countiesSource,
   paint:{'line-color':['match',['get','severity'],'major','#ff4055','moderate','#ffb63e','#ffe269'],
    'line-width':['interpolate',['linear'],['zoom'],0,0.55,3,1.1,8,1.7,13,2.25],
    'line-opacity':['interpolate',['linear'],['zoom'],0,0.74,5,0.9,13,0.98]}
  });
  if(!map.getSource(IDS.countyMarkersSource)){
   map.addSource(IDS.countyMarkersSource,{type:'geojson',data:empty(),maxzoom:10,tolerance:0.3,buffer:32});
  }
  addLayer({
   id:IDS.areaDots,type:'circle',source:IDS.countyMarkersSource,filter:['==',['get','kind'],'county'],
   paint:{'circle-color':['match',['get','severity'],'major','#ff4055','moderate','#ffb63e','#ffe269'],
    'circle-radius':['interpolate',['linear'],['zoom'],0,5.2,2,5.8,5,6.8,9,8,13,9.5],
    'circle-stroke-color':'#fff','circle-stroke-width':1.6,'circle-opacity':0.98}
  });
  addLayer({
   id:IDS.reportDots,type:'circle',source:IDS.pointsSource,filter:['==',['get','kind'],'point'],
   paint:{'circle-color':['match',['get','severity'],'major','#ff4055','moderate','#ffb63e','#ffe269'],
    'circle-radius':['interpolate',['linear'],['zoom'],0,5.4,2,6,5,7,9,8.2,13,9.8],
    'circle-stroke-color':'#fff','circle-stroke-width':1.6,'circle-opacity':0.98}
  });
  addLayer({
   id:IDS.areaPoints,type:'symbol',source:IDS.countyMarkersSource,filter:['==',['get','kind'],'county'],
   layout:{'icon-image':['concat','bp-outage-icon-',['get','severity'],'-v1'],
    'icon-size':['interpolate',['linear'],['zoom'],0,0.62,2,0.7,5,0.82,9,0.98,13,1.14],
    'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-anchor':'center'}
  });
  addLayer({
   id:IDS.reportPoints,type:'symbol',source:IDS.pointsSource,filter:['==',['get','kind'],'point'],
   layout:{'icon-image':['concat','bp-outage-icon-',['get','severity'],'-v1'],
    'icon-size':['interpolate',['linear'],['zoom'],0,0.64,2,0.74,5,0.86,9,1.02,13,1.18],
    'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-anchor':'center'}
  });
  for(const id of [IDS.areaFill,IDS.areaLine,IDS.areaDots,IDS.reportDots,IDS.areaPoints,IDS.reportPoints]){
   if(map.getLayoutProperty(id,'visibility')!== (enabled?'visible':'none'))map.setLayoutProperty(id,'visibility',enabled?'visible':'none');
  }
  for(const id of ['bp-global-outage-area-points-v1','bp-global-outage-report-points-v1',
   'bp-global-outage-area-points-v2','bp-global-outage-report-points-v2']){
   if(map.getLayer(id)&&map.getLayoutProperty(id,'visibility')!=='none')map.setLayoutProperty(id,'visibility','none');
  }
  map.off('click',handleMapClick);
  map.on('click',handleMapClick);
  for(const id of [IDS.areaPoints,IDS.reportPoints,IDS.areaDots,IDS.reportDots]){
   map.off('mouseenter',id,setPointer);map.off('mouseleave',id,clearPointer);
   map.on('mouseenter',id,setPointer);map.on('mouseleave',id,clearPointer);
  }
  return true;
 }
 function setPointer(){try{map.getCanvas().style.cursor='pointer'}catch(_){}}
 function clearPointer(){try{map.getCanvas().style.cursor=''}catch(_){}}
 function ensureStatus(){
  let el=document.getElementById(STATUS_ID);
  const container=document.getElementById('liveMap')||document.getElementById('previewMap');
  if(!container)return null;
  if(!el){el=makeElement('div','bp-power-outages-v1-status');el.id=STATUS_ID;el.setAttribute('aria-live','polite');container.appendChild(el)}
  el.hidden=!enabled;
  return el;
 }
 function statusText(state){
  const el=ensureStatus();
  if(!el)return;
  el.hidden=!enabled;
  if(!enabled)return;
  const counties=lastData?.counts?.counties||lastData?.counties?.features?.length||0;
  const reports=lastData?.counts?.reports||lastData?.reports?.features?.length||0;
  const checked=safeDate(lastData?.generatedAt||lastRefresh)||'waiting for first feed';
  let label=state||'live report layer';
  if(busy&&!lastData)label='loading public feeds · markers will appear from the instant snapshot';
  else if(busy&&lastData)label='checking live feeds · instant markers are visible';
  else if(lastData?.errors?.length)label='partial feed · retrying';
  else if(lastData)label='live reports';
  el.replaceChildren(makeElement('span','', 'POWER OUTAGES · '+label+' · '+numFmt.format(counties)+' U.S. county areas · '+numFmt.format(reports)+' international point reports · checked '+checked));
 }
 async function fetchJson(url,signal){
  const response=await fetch(url,{mode:'cors',credentials:'omit',cache:'no-store',signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('HTTP '+response.status);
  return response.json();
 }
 function getGeometry(row){
  const g=row?.geom;
  if(g?.type==='Feature'&&g.geometry)return g.geometry;
  if(g?.geometry)return g.geometry;
  if(g?.type&&g.coordinates)return g;
  return null;
 }
 function getPoint(row){
  const candidates=[row?.geo_point_2d,row?.centroid];
  for(const p of candidates){
   if(Array.isArray(p)&&p.length>=2&&Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1])))return [Number(p[0]),Number(p[1])];
   if(p&&Number.isFinite(Number(p.lon))&&Number.isFinite(Number(p.lat)))return [Number(p.lon),Number(p.lat)];
   if(p?.coordinates&&Array.isArray(p.coordinates))return p.coordinates.slice(0,2).map(Number);
  }
  const geometry=getGeometry(row),bounds=[Infinity,Infinity,-Infinity,-Infinity];
  const visit=value=>{
   if(!Array.isArray(value))return;
   if(value.length>=2&&!Array.isArray(value[0])&&Number.isFinite(Number(value[0]))&&Number.isFinite(Number(value[1]))){
    const lon=Number(value[0]),lat=Number(value[1]);bounds[0]=Math.min(bounds[0],lon);bounds[1]=Math.min(bounds[1],lat);bounds[2]=Math.max(bounds[2],lon);bounds[3]=Math.max(bounds[3],lat);return;
   }
   for(const child of value)visit(child);
  };
  if(geometry?.coordinates)visit(geometry.coordinates);
  if(Number.isFinite(bounds[0]))return [(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2];
  return null;
 }
 async function fetchOdin(signal){
  const limit=100;
  const makeUrl=offset=>{
   const params=new URLSearchParams({limit:String(limit),offset:String(offset),select:ORNL_SELECT});
   return ORNL_API+'?'+params.toString();
  };
  const first=await fetchJson(makeUrl(0),signal);
  const total=Math.min(Number(first.total_count)||first.results?.length||0,1500);
  const offsets=[];
  for(let offset=limit;offset<total;offset+=limit)offsets.push(offset);
  const rest=await Promise.all(offsets.map(offset=>fetchJson(makeUrl(offset),signal)));
  const rows=[...(first.results||[])];
  for(const page of rest)rows.push(...(page.results||[]));
  const grouped=new Map();
  for(const row of rows){
   const affected=Math.max(0,Number(row.metersaffected)||0);
   const geom=getGeometry(row);
   if(!affected||!geom)continue;
   const fips=String(row.communitydescriptor||'').trim();
   const key=fips||[row.state,row.county].join(':');
   const group=grouped.get(key);
   const cause=String(row.incident_cause||row.cause||row.causekind||'').trim();
   const utility=String(row.name||row.utility_id||'').trim();
   const start=String(row.reportedstarttime||'').trim();
   let etr='';
   try{const parsed=typeof row.estimatedrestorationtime==='string'?JSON.parse(row.estimatedrestorationtime):row.estimatedrestorationtime;etr=String(parsed?.ert||parsed?.estimatedRestorationTime||parsed?.time||'')}catch(_){}
   if(group){
    group.customers+=affected;
    group.events+=1;
    if(cause&&!group.causes.includes(cause))group.causes.push(cause);
    if(utility&&!group.utilities.includes(utility))group.utilities.push(utility);
    if(start&&(!group.start||new Date(start)<new Date(group.start)))group.start=start;
    if(etr&&!group.etr)group.etr=etr;
   }else{
    grouped.set(key,{key,fips,county:String(row.county||'Unknown county'),state:String(row.state||'United States'),
     customers:affected,events:1,causes:cause?[cause]:[],utilities:utility?[utility]:[],start,etr,geometry:geom,
     point:getPoint(row),status:String(row.statuskind||'Reported'),source:'Oak Ridge National Laboratory · U.S. DOE ODIN'});
   }
  }
  const features=[];
  for(const g of grouped.values()){
   const severityLevel=severity(g.customers);
   const props={eventId:'us:'+g.key,title:g.county+', '+g.state,kind:'county',severity:severityLevel,
    customers:g.customers,events:g.events,causes:g.causes.join('; '),utilities:g.utilities.join('; '),
    start:g.start,etr:g.etr,status:g.status,fips:g.fips,source:g.source,sourceUrl:ORNL_URL,
    license:'OpenEnergyDataPortal public dataset; credit Oak Ridge National Laboratory and U.S. Census Bureau'};
   features.push({type:'Feature',id:props.eventId,geometry:g.geometry,properties:props});
  }
  const pointFeatures=[];
  for(const f of features){
   const group=grouped.get(String(f.properties.fips||''))||Array.from(grouped.values()).find(x=>x.key===f.properties.eventId?.slice(3));
   const p=group?.point;
   if(p)pointFeatures.push({type:'Feature',id:f.id,geometry:{type:'Point',coordinates:p},properties:f.properties});
  }
  return {features,pointFeatures,total,metaModified:metaLastModified};
 }
 function allowedLicense(text){
  const value=String(text||'');
  return /CC\s*BY\s*4\.0/i.test(value)||
   /^NGED Open Data Licence$/i.test(value.trim())||
   /^Northern Powergrid Open Data Licence v1\.0$/i.test(value.trim())||
   /Open Government Data License,\s*version 1\.0/i.test(value);
 }
 async function fetchGlobalPoints(signal){
  const body=await fetchJson(POWERCUT_API,signal);
  const sources=new Map((body.sources||[]).map(s=>[s.id,s]));
  const features=[];
  for(const report of body.outages||[]){
   if(report.kind!=='unplanned')continue;
   const source=sources.get(report.source);
   if(!source||!source.enabled||!source.ok||source.stale||!allowedLicense(source.licence))continue;
   const lon=Number(report.lon),lat=Number(report.lat);
   if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)continue;
   const level=severity(report.customers);
   const eventId='world:'+String(report.id||report.source+':'+lat+':'+lon);
   features.push({type:'Feature',id:eventId,geometry:{type:'Point',coordinates:[lon,lat]},properties:{
    eventId,title:String(report.place||report.area||source.name||'Reported outage'),kind:'point',severity:level,
    customers:Number(report.customers)||0,events:1,country:String(report.country||source.country||''),
    area:String(report.area||''),cause:String(report.cause||''),start:String(report.start||''),etr:String(report.etr||''),
    status:'Unplanned · operator reported',utility:String(report.operator||source.operators||source.name||''),
    source:String(source.name||source.operators||'Grid operator'),sourceUrl:String(source.homepage||''),
    sourceLicense:String(source.licence||''),checked:String(source.fetchedAt||body.generatedAt||''),
    normalization:'PowerCut live open-feed normalization'
   }});
  }
  return {features,generatedAt:String(body.generatedAt||''),sources:sources.size};
 }
 async function fetchOdinMeta(signal){
  try{
   const d=await fetchJson(ORNL_META,signal);
   metaLastModified=String(d?.metas?.default?.modified||'');
  }catch(_){}
 }
 function makeFeatures(countyRows,pointRows){
  return {counties:{type:'FeatureCollection',features:countyRows.features},countyMarkers:{type:'FeatureCollection',features:countyRows.pointFeatures},points:{type:'FeatureCollection',features:pointRows.features}};
 }
 async function refresh(){
  if(!enabled||busy||document.hidden)return;
  busy=true;statusText();
  if(activeController)activeController.abort();
  activeController=new AbortController();
  const signal=activeController.signal;
  clearTimeout(refreshTimeout);
  refreshTimeout=setTimeout(()=>activeController?.abort(),30000);
  const jobs=await Promise.allSettled([fetchOdin(signal),fetchGlobalPoints(signal),fetchOdinMeta(signal)]);
  clearTimeout(refreshTimeout);refreshTimeout=0;
  if(!enabled||signal.aborted){busy=false;return}
  const errors=[];
  let countyRows=jobs[0].status==='fulfilled'?jobs[0].value:null;
  let globalRows=jobs[1].status==='fulfilled'?jobs[1].value:null;
  if(!countyRows)errors.push('U.S. feed');
  if(!globalRows)errors.push('international feed');
  if(countyRows||globalRows){
   const counties=countyRows?.features||lastData?.counties?.features||[];
   const globalPoints=globalRows?.features||lastData?.globalPoints?.features||[];
   const countyPoints=countyRows?.pointFeatures||lastData?.countyPoints?.features||[];
   const merged={counties:{type:'FeatureCollection',features:counties},
    points:{type:'FeatureCollection',features:globalPoints},
    countyPoints:{type:'FeatureCollection',features:countyPoints},
    globalPoints:{type:'FeatureCollection',features:globalPoints},
    reports:{type:'FeatureCollection',features:globalPoints},
    counts:{counties:counties.length,reports:globalPoints.length},
    generatedAt:globalRows?.generatedAt||lastData?.generatedAt||'',
    errors};
   lastData=merged;
   try{
    const countySource=map?.getSource(IDS.countiesSource),markerSource=map?.getSource(IDS.countyMarkersSource),pointSource=map?.getSource(IDS.pointsSource);
    if(countySource)countySource.setData(merged.counties);
    if(markerSource)markerSource.setData(merged.countyPoints);
    if(pointSource)pointSource.setData(merged.globalPoints);
   }catch(e){console.warn('Power outage map update failed',e)}
   lastRefresh=Date.now();
   storeSeedCache({countyMarkers:merged.countyPoints,globalPoints:merged.globalPoints,generatedAt:new Date(lastRefresh).toISOString(),counts:merged.counts});
   window.__BP_POWER_OUTAGES_V1_STATE__={version:VERSION,enabled,updatedAt:lastRefresh,countyAreas:counties.length,internationalReports:globalPoints.length,errors};
  }else errors.push('all feeds');
  busy=false;
  statusText(errors.length?'partial feed · retrying':'');
  if(errors.length)console.warn('Power outage feeds incomplete',errors);
 }
 async function loadMap(){
  if(!enabled)return false;
  map=getMap();
  if(!map){
   statusText('waiting for globe map');
   if(!mapWaitStartedAt)mapWaitStartedAt=Date.now();
   if(Date.now()-mapWaitStartedAt>45000){statusText('globe renderer is still starting · outage markers will attach automatically');mapWaitStartedAt=Date.now()}
   clearTimeout(mapWaitTimer);
   mapWaitTimer=setTimeout(loadMap,250);
   return false;
  }
  if(!map.isStyleLoaded?.()){
   statusText('waiting for map style');
   if(!mapWaitStartedAt)mapWaitStartedAt=Date.now();
   if(Date.now()-mapWaitStartedAt>45000){statusText('globe map is still drawing · outage markers will attach automatically');mapWaitStartedAt=Date.now()}
   clearTimeout(mapWaitTimer);
   mapWaitTimer=setTimeout(loadMap,250);
   return false;
  }
  if(!ensureMapLayers()){
   statusText('waiting for map layers');
   return false;
  }
  mapWaitStartedAt=0;
  if(seedData)applySeedSnapshot();
  if(lastData){
   try{map.getSource(IDS.countiesSource)?.setData(lastData.counties);map.getSource(IDS.countyMarkersSource)?.setData(lastData.countyPoints);map.getSource(IDS.pointsSource)?.setData(lastData.globalPoints)}catch(_){}
  }
  void refresh();
  if(!refreshTimer)refreshTimer=setInterval(()=>refresh(),POLL_MS);
  statusText();
  return true;
 }
 function ensureDetailCard(){
  const container=document.getElementById('liveMap')||document.getElementById('previewMap');
  if(!container)return null;
  let card=document.getElementById(DETAIL_ID);
  if(card)return card;
  card=makeElement('section','bp-power-outages-v1-detail');
  card.id=DETAIL_ID;card.hidden=true;card.setAttribute('role','dialog');card.setAttribute('aria-label','Power outage report details');
  card.addEventListener('click',event=>event.stopPropagation());
  container.appendChild(card);
  return card;
 }
 function appendRow(dl,label,value,href){
  if(value===undefined||value===null||String(value)==='')return;
  const dt=makeElement('dt','',label),dd=makeElement('dd');
  if(href){const a=makeElement('a','',value);a.href=href;a.target='_blank';a.rel='noopener noreferrer';dd.appendChild(a)}
  else dd.textContent=String(value);
  dl.append(dt,dd);
 }
 function showDetails(feature){
  const p=feature?.properties||{};
  const card=ensureDetailCard();if(!card)return;
  card.replaceChildren();
  const header=makeElement('header');
  const title=makeElement('h3','',p.title||p.area||'Reported power outage');
  const close=makeElement('button','','Close');close.type='button';close.setAttribute('aria-label','Close outage details');
  close.addEventListener('click',event=>{event.stopPropagation();card.hidden=true});
  header.append(title,close);
  const intro=makeElement('p','',p.kind==='county'?'County-level outage area reported by ODIN.':'Operator-reported outage location.');
  const dl=makeElement('dl');
  appendRow(dl,'Area',p.kind==='county'?[p.county,p.state].filter(Boolean).join(', '):[p.area,p.country].filter(Boolean).join(' · '));
  appendRow(dl,'Meters affected',p.customers?numFmt.format(Number(p.customers)): 'Not reported');
  appendRow(dl,'Reports grouped',p.events?numFmt.format(Number(p.events)):'1');
  appendRow(dl,'Utility / operator',p.utilities||p.utility||'Not provided');
  appendRow(dl,'Cause',p.causes||p.cause||'Not provided');
  appendRow(dl,'Reported start',safeDate(p.start));
  appendRow(dl,'Estimated restoration',safeDate(p.etr));
  appendRow(dl,'Report status',p.status||'Unplanned outage');
  appendRow(dl,'Feed checked',safeDate(p.checked||lastRefresh));
  appendRow(dl,'Source',p.source||'Public outage feed',safeLink(p.sourceUrl));
  appendRow(dl,'Data license',p.sourceLicense||p.license||'Public ODIN feed · attribution provided');
  const note=makeElement('p','bp-outage-note',p.kind==='county'?
   'The highlighted outline is the county-level area supplied with the report; it is not a home-by-home outage map.':
   'This provider reports a point location without an affected-area boundary, so the ring marks the report location, not an inferred outage footprint.');
  const footer=makeElement('p','bp-outage-note','Coverage follows participating public reporting feeds. No marker means no report was returned by these feeds, not confirmation that power is on. Reports refresh automatically about every 5 minutes.');
  card.append(header,intro,dl,note,footer);
  card.hidden=false;
 }
 function handleMapClick(e){
  if(!enabled||!map)return;
  let hits=[];
  try{hits=map.queryRenderedFeatures(e.point,{layers:[IDS.reportPoints,IDS.areaPoints,IDS.reportDots,IDS.areaDots,IDS.areaLine,IDS.areaFill].filter(id=>!!map.getLayer(id))})||[]}catch(_){}
  if(!hits.length)return;
  const feature=hits[0];
  showDetails(feature);
 }
 function setButtonState(){
  const b=document.getElementById(BUTTON_ID);
  if(b)b.setAttribute('aria-pressed',enabled?'true':'false');
 }
 function toggle(){
  enabled=!enabled;
  setButtonState();
  if(!enabled){
   clearTimeout(mapWaitTimer);
   if(refreshTimer){clearInterval(refreshTimer);refreshTimer=0}
   if(activeController)activeController.abort();clearTimeout(refreshTimeout);refreshTimeout=0;mapWaitStartedAt=0;
   busy=false;
   if(map&&map.isStyleLoaded?.()){
    for(const id of [IDS.areaFill,IDS.areaLine,IDS.areaDots,IDS.reportDots,IDS.areaPoints,IDS.reportPoints])if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');
   }
   const status=document.getElementById(STATUS_ID);if(status)status.hidden=true;
   const card=document.getElementById(DETAIL_ID);if(card)card.hidden=true;
   window.__BP_POWER_OUTAGES_V1_STATE__={version:VERSION,enabled:false,updatedAt:Date.now()};
   return;
  }
  const status=ensureStatus();
  if(status){status.hidden=false;status.textContent='POWER OUTAGES · loading live reported areas';}
  void loadMap();
 }
 document.addEventListener('click',event=>{
  const button=event.target?.closest?.('[data-bpv-action="'+BUTTON_ACTION+'"]');
  if(!button)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  toggle();
 },true);
 document.addEventListener('visibilitychange',()=>{
  if(enabled&&!document.hidden&&(!lastRefresh||Date.now()-lastRefresh>POLL_MS))void refresh();
 });
 observeButtonGrid();
 window.__BP_POWER_OUTAGES_V1__={version:VERSION,toggle,refresh:()=>refresh(),getState:()=>({version:VERSION,enabled,lastRefresh,counts:lastData?.counts||null})};
 window.__BP_POWER_OUTAGES_V1_STATE__={version:VERSION,enabled:false,updatedAt:Date.now(),coverage:'US county polygons plus explicitly reusable international operator feeds'};
 void primeSeed();
})();
