/* BridgePoint live global wildfires: source-backed detections/perimeters + 3D volumes.
 * Dedicated to the existing Wildfire button. No fabricated active-fire coordinates,
 * fake surveyed perimeters, sprite flames, core/weather/tree renderer mutations.
 * Sources: WorldFires (NASA FIRMS / Copernicus EFFIS/GWIS etc), NASA EONET.
 * A thermal detection is NOT proof that a building/tree is burning; all effects
 * represent a visual fire scenario near an active observed thermal signal.
 */
const API='https://worldfires.org/api/v1';
const EONET='https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&days=14&limit=300';
const THREE_URL='/vendor/three.module.js?v=169-local';
const FIRE_VOLUME_V4_URL='./bridgepoint-wildfire-realistic-mesh-v4.js?v=4-rolling-heat-turbulence&restore=20261120-emrf-fire';
let volumeV4Promise=null;
function getFireVolumeV4(){
 if(!volumeV4Promise)volumeV4Promise=import(FIRE_VOLUME_V4_URL).then(m=>{
  if(typeof m.createBridgePointWildfireVolumeV4!=='function')throw Error('BridgePoint V4 fire shader missing');
  return m;
 }).catch(e=>{volumeV4Promise=null;throw e;});
 return volumeV4Promise;
}
const sourceId='bp-live-wildfires-v1',perimeterId='bp-live-fire-perimeters-v1';
const iconId='bp-live-wildfire-icon-v1';
const pointLayer='bp-live-fire-icon-symbols-v1';
const fillLayer='bp-live-fire-boundary-fill-v1',lineLayer='bp-live-fire-boundary-line-v1';
const detectionLine='bp-live-fire-detection-line-v1',styleId='bp-live-fire-popup-v1';
const layer3d='bp-live-native-volumetric-fire-v1',MAX_MAP_FIRE_RECORDS=5000;
const states=new WeakMap();let threePromise;
const empty=()=>({type:'FeatureCollection',features:[]});
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const normCoord=p=>Array.isArray(p)&&finite(+p[0])&&finite(+p[1])&&Math.abs(+p[0])<=180&&Math.abs(+p[1])<=90?[+p[0],+p[1]]:null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sanitizeURL=v=>typeof v==='string'&&v.startsWith('https://')?v:'';
export function normalizeActiveFireRecords(data,now=Date.now()){
 const rows=Array.isArray(data?.data)?data.data:Array.isArray(data)?data:[];
 const seen=new Set(),out=[];
 for(const row of rows){
  const coordinate=normCoord([row.lon??row.lng,row.lat]);
  if(!coordinate||row.static===true||row.static===1)continue;
  // Strict recency: stale source records are never represented as live fires.
  const rawDate=String(row.ultimo||row.last_detection||row.date||'').trim();
  const when=Date.parse(rawDate.replace(' ','T')+(rawDate&&!/[zZ]$|[+-]\d\d:?\d\d$/.test(rawDate)?'Z':''));
  if(!Number.isFinite(when)||when>now+300000||now-when>72*3600000)continue;
  const count=Math.max(0,Math.floor(Number(row.n??row.hotspots??1)||0));
  if(count<1)continue;
  const identifier=String(row.evento||row.slug||row.id||coordinate.join(',')),key=coordinate.join(',');
  if(seen.has(key))continue;seen.add(key);
  const perimeterSlug=/^[a-z0-9][a-z0-9-]{1,130}$/.test(String(row.evento||''))&&row.evento_fuente==='perimetro'?String(row.evento):null;
  out.push({id:identifier+'-'+out.length,coordinates:coordinate,name:String(row.nombre||row.local||'Satellite thermal anomaly').slice(0,150),
   country:String(row.pais||'').slice(0,4),detectedAt:new Date(when).toISOString(),
   count,frp:Number(row.frp_max)||0,frpSum:Number(row.frp)||0,ha:Number(row.ha)||0,
   eventAreaHa:Number(row.evento_ha)||0,firstDetectedAt:row.primero||null,
   locality:String(row.local||'').slice(0,120),countryName:String(row.pais||'').slice(0,4),
   perimeterProvider:String(row.evento_fuente||'none').slice(0,50),
   eventId:String(row.evento||'').slice(0,130),
   url:sanitizeURL(row.url),perimeterSlug,source:'WorldFires · NASA FIRMS VIIRS',
   sourceKind:'detection',radiusM:Math.min(700,Math.max(170,Math.sqrt(count)*32))});
  if(out.length>=MAX_MAP_FIRE_RECORDS)break;
 }
 return out;
}
export function normalizeEonetFires(data,now=Date.now()){
 const rows=Array.isArray(data?.events)?data.events:[];
 const out=[];
 for(const ev of rows){
  if(ev.closed!==null&&ev.closed!==undefined)continue;
  const g=Array.isArray(ev.geometry)?ev.geometry:[];
  const dated=g.filter(x=>Number.isFinite(Date.parse(x.date||''))&&now-Date.parse(x.date)>=0&&now-Date.parse(x.date)<14*86400000).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
  const recent=dated[0];if(!recent)continue;
  const geo=recent.coordinates||recent.geometry?.coordinates;
  const type=recent.type||recent.geometry?.type;
  const c=type==='Point'?normCoord(geo):type==='Polygon'?normCoord(geo?.[0]?.[0]):null;
  if(!c)continue;
  out.push({id:'eonet-'+String(ev.id||out.length),coordinates:c,name:String(ev.title||'EONET wildfire').slice(0,150),
   country:'',detectedAt:new Date(recent.date).toISOString(),count:1,frp:0,ha:0,
   url:sanitizeURL(ev.link),perimeterSlug:null,source:'NASA EONET',sourceKind:'event',radiusM:190,
   geometry:type==='Polygon'?{type:'Polygon',coordinates:geo}:null});
 }
 return out.slice(0,300);
}
function validGeometry(g){
 if(!g||!['Polygon','MultiPolygon'].includes(g.type))return null;
 const rings=g.type==='Polygon'?g.coordinates:g.coordinates?.flat(1);
 if(!Array.isArray(rings)||rings.length===0||rings.length>1200)return null;
 let points=0;
 for(const ring of rings){if(!Array.isArray(ring)||ring.length<4||ring.length>15000)return null;
  for(const p of ring){if(!normCoord(p))return null;points++;if(points>35000)return null;}
 }
 return g;
}
export function parseFirePerimeter(data){
 // Supports official-source GeoJSON and WorldFires' GeoJSON or {data:geometry}.
 const value=data?.data||data?.geometry||data?.perimeter||data;
 const candidates=Array.isArray(value)?value:
  value?.type==='FeatureCollection'?value.features:
  value?.type==='Feature'?[value]:
  value?.type==='Polygon'||value?.type==='MultiPolygon'?[{geometry:value}]:
  value?.geometry?[{geometry:value.geometry}]:[];
 const out=[];
 for(const item of candidates){
  const g=validGeometry(item.geometry||item);
  if(g)out.push({type:'Feature',properties:{source:'Source-mapped burned area / fire perimeter',kind:'mapped-perimeter'},geometry:g});
 }
 return out.slice(0,10);
}
function circlePolygon(coords,radiusM,steps=28){
 const lat=coords[1],dLat=radiusM/111320;
 const dLng=radiusM/(111320*Math.max(.1,Math.cos(lat*Math.PI/180)));
 const ring=[];
 for(let k=0;k<=steps;k++){
  const a=k*2*Math.PI/steps;
  ring.push([Math.max(-180,Math.min(180,coords[0]+Math.cos(a)*dLng)),
   Math.max(-90,Math.min(90,lat+Math.sin(a)*dLat))]);
 }
 return {type:'Polygon',coordinates:[ring]};
}
function boundsContains(bounds,coords){
 if(!bounds)return false;
 try{return bounds.contains(coords)}catch(_){return true;}
}
function sourceFeature(fire){return {type:'Feature',id:fire.id,
 properties:{name:fire.name,age:fire.detectedAt,source:fire.source,
   kind:fire.sourceKind,frp:fire.frp,hotspots:fire.count,fireId:fire.id},
 geometry:{type:'Point',coordinates:fire.coordinates}};}
function detectionBoundary(fire){
 return {type:'Feature',properties:{name:fire.name,kind:'approximate-thermal-footprint',fireId:fire.id},
 geometry:circlePolygon(fire.coordinates,fire.radiusM)};
}
function displayIcon(){
 const width=44,height=44,c=document.createElement('canvas');c.width=width;c.height=height;
 const ctx=c.getContext('2d');if(!ctx)return null;
 ctx.clearRect(0,0,width,height);ctx.lineWidth=2.1;ctx.strokeStyle='#fff0c7';
 ctx.fillStyle='#122333';ctx.beginPath();ctx.arc(22,22,19,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(22,7);ctx.bezierCurveTo(14,18,15,22,12,28);
 ctx.bezierCurveTo(7,38,19,43,23,39);ctx.bezierCurveTo(37,44,41,31,34,24);
 ctx.bezierCurveTo(28,19,29,13,22,7);ctx.closePath();
 const grd=ctx.createLinearGradient(0,8,0,41);
 grd.addColorStop(0,'#ffe176');grd.addColorStop(.5,'#ff682d');grd.addColorStop(1,'#b51d1b');
 ctx.fillStyle=grd;ctx.fill();
 ctx.fillStyle='#ffe5a2';ctx.beginPath();ctx.moveTo(24,23);
 ctx.bezierCurveTo(18,29,18,35,23,36);ctx.bezierCurveTo(29,37,30,30,24,23);ctx.fill();
 return {width,height,data:ctx.getImageData(0,0,width,height).data};
}
async function getThree(){
 if(!threePromise)threePromise=import(THREE_URL).then(T=>{
  if(!T.WebGLRenderer||!T.BufferGeometry)throw Error('BridgePoint local Three.js not available');
  return T;
 }).catch(e=>{threePromise=null;throw e;});
 return threePromise;
}
async function getJSON(url,signal){
 const controller=new AbortController();
 const stop=()=>controller.abort();
 signal?.addEventListener('abort',stop,{once:true});
 if(signal?.aborted)stop();
 const timeout=setTimeout(()=>controller.abort(),14000);
 try{
  const response=await fetch(url,{signal:controller.signal,mode:'cors',cache:'no-cache',headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Wildfire source HTTP '+response.status);
  return await response.json();
 }finally{clearTimeout(timeout);signal?.removeEventListener('abort',stop);}
}
function publishFireStatus(state){
 if(typeof document==='undefined'||typeof CustomEvent==='undefined')return;
 const ready=!!state.map.getLayer?.(pointLayer);
 const markers=state.markers?.size||0;
 const status={enabled:state.enabled,loading:state.loading,fireCount:state.fires.length,
  markerCount:markers,sourcePerimeters:state.perimeters.size,mapLayerReady:ready,
  lastUpdated:state.lastUpdated,error:state.error||''};
 try{document.dispatchEvent(new CustomEvent('bp:wildfire-state',{detail:status}));}catch(_){}
}
function renderFireData(state,all){
 if(!state.enabled||state.destroyed)return;
 state.fires=all.slice(0,MAX_MAP_FIRE_RECORDS);
 state.lastUpdated=Date.now();
 state.error='';
 updateMap(state);
 refreshPersistentMarkers(state);
 schedulePerimeterLoads(state);
 maybeShowNative3D(state);
 publishFireStatus(state);
}
async function loadCurrentFires(state){
 if(state.loading||!state.enabled||state.destroyed)return;
 state.loading=true;state.error='';
 state.abort?.abort();
 const controller=new AbortController();state.abort=controller;
 publishFireStatus(state);
 let primaryError=null,all=[];
 try{
  // Primary source must render as soon as it arrives: EONET is OPTIONAL and
  // must never hold back 2,000+ current WorldFires/VIIRS observations.
  for(const hours of [24,72]){
   try{
    all=normalizeActiveFireRecords(await getJSON(API+'/active?hours='+hours,controller.signal));
    if(all.length)break;
   }catch(e){primaryError=e;break;}
  }
  if(controller.signal.aborted||!state.enabled||state.destroyed)return;
  if(all.length){
   state.loading=false;
   renderFireData(state,all);
   // Fetch named NASA events after the active markers have appeared.
   // Use a separate abort timer so an unresponsive EONET cannot block the layer.
   const eventController=new AbortController();
   state.eventsAbort?.abort();state.eventsAbort=eventController;
   const timer=setTimeout(()=>eventController.abort(),11000);
   void getJSON(EONET,eventController.signal).then(data=>{
    if(!state.enabled||state.destroyed||controller.signal.aborted)return;
    const extras=normalizeEonetFires(data);
    const existing=new Set(state.fires.map(f=>f.coordinates.map(v=>v.toFixed(2)).join(',')));
    const additions=[];
    for(const fire of extras){
     const k=fire.coordinates.map(v=>v.toFixed(2)).join(',');
     if(!existing.has(k)){additions.push(fire);existing.add(k);}
    }
    if(additions.length){
     state.fires=state.fires.concat(additions).slice(0,MAX_MAP_FIRE_RECORDS);
     updateMap(state);refreshPersistentMarkers(state);publishFireStatus(state);
    }
   }).catch(()=>{}).finally(()=>{
    clearTimeout(timer);
    if(state.eventsAbort===eventController)state.eventsAbort=null;
   });
   return;
  }
  // WorldFires missing or empty: use only genuinely dated open NASA events.
  const fallback=normalizeEonetFires(await getJSON(EONET,controller.signal));
  if(!fallback.length)throw primaryError||Error('No fresh wildfire observations are currently available');
  if(controller.signal.aborted||!state.enabled||state.destroyed)return;
  state.loading=false;
  renderFireData(state,fallback);
 }catch(e){
  if(!controller.signal.aborted&&state.enabled&&!state.destroyed){
   state.error='Live wildfire source failed: '+String(e?.message||e);
   state.loading=false;
   console.warn('BridgePoint wildfire data unavailable',e);
   publishFireStatus(state);
  }
 }finally{
  if(state.abort===controller){state.loading=false;state.abort=null;publishFireStatus(state);}
 }
}
function selectedMarkerFires(state){
 if(!state.enabled||!state.fires.length)return [];
 const bounds=state.map.getBounds?.();
 const zoom=Number(state.map.getZoom?.()||0);
 const step=zoom<2?6:zoom<4?3:zoom<7?1:zoom<11?.2:.02;
 const picked=new Map();
 for(const f of state.fires){
  if(!boundsContains(bounds,f.coordinates))continue;
  const [lon,lat]=f.coordinates;
  const key=Math.floor((lon+180)/step)+':'+Math.floor((lat+90)/step);
  const prev=picked.get(key);
  if(!prev||f.frp+f.count*.8>prev.frp+prev.count*.8)picked.set(key,f);
 }
 // Reserve slots across the visible globe before filling by intensity,
 // so high-FRP regional clusters never hide weaker fires on other continents.
 const score=f=>f.frp+f.count*.8;
 const bestRegional=new Map();
 for(const fire of picked.values()){
  const [lon,lat]=fire.coordinates;
  const region=Math.floor((lon+180)/30)+':'+Math.floor((lat+90)/20);
  const prev=bestRegional.get(region);
  if(!prev||score(fire)>score(prev))bestRegional.set(region,fire);
 }
 const coverage=Array.from(bestRegional.values()).sort((a,b)=>score(b)-score(a));
 const firstIds=new Set(coverage.map(f=>f.id));
 const rest=Array.from(picked.values()).filter(f=>!firstIds.has(f.id)).sort((a,b)=>score(b)-score(a));
 return coverage.concat(rest).slice(0,160);
}
function refreshPersistentMarkers(state){
 if(!state.enabled){for(const entry of state.markers.values())entry.marker.remove();state.markers.clear();return;}
 const Marker=window.maplibregl?.Marker;
 if(typeof Marker!=='function')return;
 const selected=selectedMarkerFires(state),ids=new Set(selected.map(f=>f.id));
 for(const [id,entry] of state.markers){
  if(!ids.has(id)){entry.marker.remove();state.markers.delete(id);}
 }
 for(const fire of selected){
  if(state.markers.has(fire.id))continue;
  const el=document.createElement('button');
  el.type='button';
  el.className='bp-fire-fixed-marker-v3';
  el.title=fire.name+' · '+fire.detectedAt+' · wildfire observation';
  el.setAttribute('aria-label','View wildfire observation '+fire.name);
  el.style.cssText='width:29px;height:29px;display:grid;place-items:center;border:1px solid #ffd6a2;border-radius:50%;background:#13202c;box-shadow:0 0 0 1px #ff4b2b77,0 1px 8px #000a;color:#ff662e;padding:3px;cursor:pointer;touch-action:manipulation';
  el.innerHTML='<svg aria-hidden="true" viewBox="0 0 32 32" width="21" height="21"><path d="M17 2C9 9 13 15 8 19 3 27 11 31 17 30c8 0 13-7 9-14-1-3-5-6-5-11-3 2-3 5-4 6-1-3-1-6 0-9Z" fill="#ff6124" stroke="#ffca68" stroke-width="1.1"/><path d="M18 15c-3 4-7 7-5 11 2 4 10 3 11-3 1-3-2-5-3-8-1 3-2 4-3 5-1-2-1-3 0-5Z" fill="#ffe061"/></svg>';
  el.addEventListener('click',e=>{
   e.preventDefault();e.stopPropagation();
   if(state.enabled)addPopup(state,fire);
  });
  try{
   const marker=new Marker({element:el,anchor:'center'}).setLngLat(fire.coordinates).addTo(state.map);
   state.markers.set(fire.id,{marker,el});
  }catch(e){if(!state.markerWarned){state.markerWarned=true;console.warn('BridgePoint wildfire pin renderer',e);}}
 }
 publishFireStatus(state);
}
function ensureMapSources(state){
 const map=state.map;
 if(!state.enabled||!map.getStyle?.())return false;
 if(!map.hasImage?.(iconId)){
  const icon=displayIcon();
  if(icon)try{map.addImage(iconId,icon,{pixelRatio:2});}catch(e){console.warn('Fire icon install failed',e);}
 }
 const addSource=(id)=>{if(!map.getSource?.(id))map.addSource(id,{type:'geojson',data:empty(),attribution:'NASA FIRMS · WorldFires · EFFIS/GWIS Copernicus · NASA EONET'});};
 const addLayer=(layer,before)=>{if(!map.getLayer?.(layer.id))map.addLayer(layer,before);};
 try{
  addSource(sourceId);addSource(perimeterId);
  addLayer({id:fillLayer,type:'fill',source:perimeterId,
   paint:{'fill-color':['case',['==',['get','kind'],'mapped-perimeter'],'#ff301c','#ff682f'],
      'fill-opacity':['case',['==',['get','kind'],'mapped-perimeter'],.20,.095],
      'fill-antialias':true}});
  addLayer({id:lineLayer,type:'line',source:perimeterId,
   filter:['==',['get','kind'],'mapped-perimeter'],
   layout:{'line-join':'round','line-cap':'round'},
   paint:{'line-color':'#ff3e21','line-width':['interpolate',['linear'],['zoom'],3,1.25,12,3.0,17,4.2],
     'line-opacity':.95}});
  addLayer({id:detectionLine,type:'line',source:perimeterId,
   filter:['==',['get','kind'],'approximate-thermal-footprint'],
   layout:{'line-join':'round','line-cap':'round'},
   paint:{'line-color':'#ff9153','line-dasharray':[1.8,1.7],
    'line-width':['interpolate',['linear'],['zoom'],8,1,17,2],
    'line-opacity':.85}});
  addLayer({id:pointLayer,type:'symbol',source:sourceId,
   layout:{'icon-image':iconId,'icon-anchor':'center',
    'icon-size':['interpolate',['linear'],['zoom'],1,.30,8,.39,16,.50],
    'icon-allow-overlap':false,'icon-ignore-placement':false,'symbol-sort-key':['get','frp']},
   paint:{'icon-opacity':.98}});
  return true;
 }catch(e){state.error='Map wildfire layer install: '+String(e?.message||e);return false;}
}
function updateMap(state){
 if(!state.enabled||!ensureMapSources(state))return;
 const points=state.fires.map(sourceFeature);
 try{state.map.getSource(sourceId)?.setData({type:'FeatureCollection',features:points});}catch(e){console.warn('Fire markers refresh',e);}
 updateVisibleZones(state);
}
function updateVisibleZones(state){
 if(!state.enabled||!state.map.getSource?.(perimeterId))return;
 const bounds=state.map.getBounds?.(),zoom=Number(state.map.getZoom?.()||0);
 const polygons=[];
 // Official or source-derived perimeters remain distinct from thermal point buffers.
 for(const [id,geo] of state.perimeters){
  if(!state.fires.some(f=>f.id===id))continue;
  for(const f of geo)polygons.push(f);
 }
 if(zoom>=6.5){
  const fires=state.fires.filter(f=>boundsContains(bounds,f.coordinates))
   .sort((a,b)=>b.frp-a.frp).slice(0,240);
  for(const fire of fires)polygons.push(detectionBoundary(fire));
 }
 try{state.map.getSource(perimeterId).setData({type:'FeatureCollection',features:polygons});}
 catch(e){console.warn('Wildfire perimeter drape refresh',e);}
}
async function retrievePerimeter(state,fire){
 const slug=fire.perimeterSlug;
 if(!slug||state.fetchedSlugs.has(slug)||state.perimeterLoading.has(slug)||!state.enabled)return;
 state.perimeterLoading.add(slug);
 const ctl=new AbortController();state.perimeterAbort.set(slug,ctl);
 try{
  const raw=await getJSON(API+'/fires/'+encodeURIComponent(slug)+'/geometry',ctl.signal);
  const features=parseFirePerimeter(raw);
  if(!state.destroyed&&state.enabled&&features.length){
   for(const f of features){
    f.properties={...f.properties,fireId:fire.id,name:fire.name,source:fire.source};
  }
   state.perimeters.set(fire.id,features);
   updateVisibleZones(state);
  }
  state.fetchedSlugs.add(slug);
 }catch(e){
  if(!ctl.signal.aborted)console.warn('No mapped source perimeter for '+slug,String(e?.message||e));
  state.fetchedSlugs.add(slug);
 }finally{state.perimeterLoading.delete(slug);state.perimeterAbort.delete(slug);}
}
function schedulePerimeterLoads(state){
 if(!state.enabled||state.destroyed)return;
 const bounds=state.map.getBounds?.();
 const fires=state.fires.filter(f=>f.perimeterSlug&&boundsContains(bounds,f.coordinates));
 fires.sort((a,b)=>b.count-a.count);
 // Only a small number of detail requests in a given viewport, fetch at most 3 at once.
 const options=fires.slice(0,32).filter(f=>!state.fetchedSlugs.has(f.perimeterSlug)&&!state.perimeterLoading.has(f.perimeterSlug));
 const slots=Math.max(0,3-state.perimeterLoading.size);
 for(const fire of options.slice(0,slots))void retrievePerimeter(state,fire);
}
function installFireCardStyles(){
 if(typeof document==='undefined'||document.getElementById(styleId))return;
 const s=document.createElement('style');s.id=styleId;
 s.textContent='.bp-fire-popup .maplibregl-popup-content{background:linear-gradient(160deg,#17222a,#07131d);color:#edf3f6;border:1px solid #ef7949;border-radius:12px;padding:13px;max-width:min(470px,calc(100vw - 36px));max-height:min(76vh,670px);overflow:auto;font:12px/1.55 system-ui,sans-serif;box-shadow:0 16px 35px #0009}'+
 '.bp-fire-popup h3{margin:3px 24px 8px 0;font-size:18px;line-height:1.2;color:#fff1dc}'+
 '.bp-fire-popup h4{margin:13px 0 5px;padding-bottom:3px;border-bottom:1px solid #a1604255;text-transform:uppercase;letter-spacing:.09em;color:#ffbc89;font-size:10px}'+
 '.bp-fire-popup p{margin:6px 0;color:#d5e1e9}'+
 '.bp-fire-popup strong{color:#ffd1a2}'+
 '.bp-fire-popup .bp-fire-subhead{color:#ffa86f;font-size:10px;font-weight:800;letter-spacing:.12em}'+
 '.bp-fire-popup .bp-fire-meta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0}'+
 '.bp-fire-popup .bp-fire-meta span{display:grid;gap:2px;padding:7px;border:1px solid #485d6a;background:#14232d;border-radius:7px}'+
 '.bp-fire-popup .bp-fire-meta b{font-size:9px;color:#90bbd1;text-transform:uppercase}'+
 '.bp-fire-popup .bp-fire-notice{padding:9px;background:#31241e;border-left:2px solid #fc9c64;border-radius:4px;font-size:11px;line-height:1.55}'+
 '.bp-fire-popup .bp-fire-source{display:block;padding:8px;border-radius:7px;color:#ffdcad;background:#1d2b36;border:1px solid #a77c56;text-decoration:underline;font-weight:700}'+
 '.bp-fire-popup .maplibregl-popup-tip{border-top-color:#101920;border-bottom-color:#101920}'+
 '@media(max-width:480px){.bp-fire-popup .maplibregl-popup-content{padding:10px}.bp-fire-popup .bp-fire-meta{gap:5px}}';
 document.head.appendChild(s);
}
function fireAtLngLat(state,coord){
 let closest=null,d=Infinity;
 const target=normCoord(coord);if(!target)return null;
 for(const f of state.fires){
  const k=Math.pow((f.coordinates[0]-target[0])*Math.cos(target[1]*Math.PI/180),2)+Math.pow(f.coordinates[1]-target[1],2);
  if(k<d){d=k;closest=f;}
 }
 return closest;
}
function addPopup(state,fire){
 if(!state.enabled||!window.maplibregl?.Popup)return;
 state.popup?.remove();
 const mappedFeatures=state.perimeters.get(fire.id)||[];
 const hasMapped=mappedFeatures.length>0;
 const utc=new Date(fire.detectedAt);
 const ago=Math.max(0,(Date.now()-utc.getTime())/3600000);
 const age=ago<1?Math.round(ago*60)+' minutes':ago<48?ago.toFixed(1)+' hours':(ago/24).toFixed(1)+' days';
 const quality=fire.sourceKind==='event'?'NASA EONET open event report':'NASA FIRMS / VIIRS orbital infrared thermal detections';
 const [lon,lat]=fire.coordinates;
 const sourcePerimeter=hasMapped?'Confirmed source-provided GeoJSON perimeter / reported burned-area geometry':
  fire.geometry?.type==='Polygon'?'EONET supplied event polygon; not an independently verified ground survey':
  'No measured perimeter loaded. Dashed detection zone is an illustrative spatial uncertainty/cluster footprint.';
 const number=(n,decimals=0)=>Number.isFinite(+n)?Number(n).toLocaleString('en-US',{maximumFractionDigits:decimals}):'Not reported';
 const field=(title,value)=>'<span><b>'+esc(title)+'</b>'+esc(value)+'</span>';
 const meta='<div class="bp-fire-meta">'+
  field('Observation class',fire.sourceKind==='event'?'Named wildfire event':'Satellite thermal anomaly cluster')+
  field('Last observed',utc.toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})+' UTC')+
  field('Detection age',age)+
  field('Country / region',fire.countryName||fire.country||'Not reported')+
  field('Latitude / longitude',Math.abs(lat).toFixed(5)+'° '+(lat>=0?'N':'S')+', '+Math.abs(lon).toFixed(5)+'° '+(lon>=0?'E':'W'))+
  field('Associated detections',number(fire.count))+
  '</div>';
 const metrics=fire.sourceKind==='event'?
  '<p>This is an event tracked by NASA EONET. EONET does not necessarily provide thermal radiative power, acreage or a surveyed fireline for each event.</p>':
  '<div class="bp-fire-meta">'+
   field('Peak radiative power',fire.frp>0?number(fire.frp,2)+' MW':'Not reported')+
   field('Summed radiative power',fire.frpSum>0?number(fire.frpSum,1)+' MW':'Not reported')+
   field('Source-estimated active area',fire.ha>0?number(fire.ha,1)+' hectares':'Not reported')+
   field('Reported event area',fire.eventAreaHa>0?number(fire.eventAreaHa,1)+' hectares':'Not reported')+
  '</div>'+
  '<p><strong>FRP interpretation:</strong> Fire Radiative Power estimates infrared energy emitted by hot surfaces. It is not temperature, fire speed, flame height, damage, or a confirmed count of burning buildings.</p>';
 const html='<article class="bp-fire-card">'+
  '<div class="bp-fire-subhead">BRIDGEPOINT INTELLIGENCE · GLOBAL FIRE OBSERVATION</div>'+
  '<h3>'+esc(fire.name)+'</h3>'+
  '<p><strong>Live source status:</strong> '+esc(quality)+'. '+esc(fire.source)+'.</p>'+
  '<h4>Location and detection history</h4>'+meta+
  (fire.locality?'<p><strong>Reported locality:</strong> '+esc(fire.locality)+'</p>':'')+
  (fire.firstDetectedAt?'<p><strong>First recorded by aggregation:</strong> '+esc(fire.firstDetectedAt)+' (source timestamp)</p>':'')+
  '<h4>Thermal intensity and footprint</h4>'+metrics+
  '<h4>Boundaries and location accuracy</h4>'+
  '<p><strong>Boundary type:</strong> '+esc(sourcePerimeter)+'</p>'+
  (fire.perimeterProvider&&fire.perimeterProvider!=='none'?'<p><strong>Fire event geometry classification:</strong> '+esc(fire.perimeterProvider)+'</p>':'')+
  '<p><strong>Globe display:</strong> An observed hotspot or event coordinate is placed at the source-provided location. When a measured perimeter exists, BridgePoint displays its mapped geometry; otherwise the orange dashed outline is an approximate visual footprint, not a mapped fire edge.</p>'+
  '<h4>On-Earth 3D visualization</h4>'+
  '<p>The animated flames are BridgePoint-built true 3D mesh volumes with multiple fluctuating yellow, amber and red tongues, simulated wind-driven bending, flickering ember cores and a terrain-following moving fire front. They are anchored to sampled elevation inside the mapped or estimated detection area.</p>'+
  '<p>Where usable 3D building and tree records intersect the display area, illustrative flame volumes are shown across those assets. <strong>This does not confirm that any individual home, tree, parcel or structure has burned.</strong></p>'+
  '<h4>Source, interpretation and safety</h4>'+
  '<p class="bp-fire-notice">Near-real-time satellite products can be delayed or obscured by cloud, canopy and smoke. Thermal anomalies can be industrial, agricultural, or other hot surfaces, and detection does not prove a spreading forest fire. Reported area and radiative power are source estimates, not damage assessments. Do not use this visualization to plan emergency routes or infer property loss; follow official local incident authorities.</p>'+
  (fire.url?'<a class="bp-fire-source" href="'+esc(fire.url)+'" target="_blank" rel="noopener noreferrer">Open original incident/detection source (external)</a>':'')+
  '</article>';
 const p=new window.maplibregl.Popup({className:'bp-fire-popup',maxWidth:'500px',closeButton:true,closeOnClick:true})
  .setLngLat(fire.coordinates).setHTML(html).addTo(state.map);
 state.popup=p;
}
function onClickMarker(state,e){
 if(!state.enabled||!e.features?.length)return;
 const item=e.features[0];const id=item.properties?.fireId;
 const fire=state.fires.find(f=>f.id===id)||fireAtLngLat(state,item.geometry?.coordinates);
 if(fire)addPopup(state,fire);
}
function refreshFireActivity(state){
 if(!state.enabled||state.destroyed)return;
 if(!state.lastUpdated||Date.now()-state.lastUpdated>15*60000)void loadCurrentFires(state);
}
// Actual 3D fire: curved multi-sided illuminated, tapered, animated volumetric
// geometry (not camera-facing billboards or particle sprites).
function flameTongue(T,height,radius,colorIndex,seed){
 const rings=8,sides=9,pos=[],cols=[],tri=[];
 const palette=[[0xcc2713,0xff6619,0xffd24b,0xffef9c],[0x9d180f,0xff4a16,0xffb335,0xffec85],
                [0xff4417,0xff8f24,0xffe55c,0xffffcd]];
 const colors=palette[colorIndex%palette.length].map(c=>new T.Color(c));
 for(let j=0;j<=rings;j++){
  const q=j/rings,fade=Math.pow(Math.max(0,1-q),.85);
  const bend=Math.sin(q*4.9+seed*6.1)*height*.11*q;
  const skew=Math.cos(q*4.2+seed*9.3)*height*.075*q;
  for(let k=0;k<sides;k++){
   const a=k*2*Math.PI/sides+q*1.8+seed;
   const rr=radius*fade*(1+Math.sin(a*3+q*6+seed)*.12);
   pos.push(bend+Math.cos(a)*rr,q*height,skew+Math.sin(a)*rr);
   const col=colors[Math.min(3,Math.floor(q*3.5))].clone();
   col.multiplyScalar(.72+Math.sin(a*2+seed)*.15+q*.15);
   cols.push(col.r,col.g,col.b);
  }
 }
 for(let j=0;j<rings;j++)for(let k=0;k<sides;k++){
  const i=j*sides+k,n=j*sides+(k+1)%sides;
  tri.push(i,n,i+sides,n,n+sides,i+sides);
 }
 const geom=new T.BufferGeometry();
 geom.setAttribute('position',new T.Float32BufferAttribute(pos,3));
 geom.setAttribute('color',new T.Float32BufferAttribute(cols,3));
 geom.setIndex(tri);geom.computeVertexNormals();
 const m=new T.Mesh(geom,new T.MeshBasicMaterial({vertexColors:true,transparent:true,
  opacity:.83,depthWrite:false,depthTest:true,side:T.DoubleSide,blending:T.AdditiveBlending}));
 m.frustumCulled=false;return m;
}
function flameBody(T,ht,seed){
 const group=new T.Group();group.userData.seed=seed;
 const n=5;
 for(let i=0;i<n;i++){
  const angle=i*2*Math.PI/n+seed*3.2;
  const tall=ht*(i===0?1: (.52+Math.sin(seed*3+i*2)*.21));
  const r=Math.max(.25,tall*(i===0?.18:.12));
  const shape=flameTongue(T,tall,r,i,seed+i*.39);
  shape.position.set(Math.cos(angle)*ht*.12,0,Math.sin(angle)*ht*.12);
  group.add(shape);
 }
 const ember=new T.Mesh(new T.SphereGeometry(Math.max(.12,ht*.19),9,7),
  new T.MeshBasicMaterial({color:0xff4d0d,transparent:true,opacity:.55,depthWrite:false}));
 ember.scale.y=.28;ember.position.y=.15;group.add(ember);
 return group;
}
function distMeters(a,b){
 const mid=(a[1]+b[1])*.5*Math.PI/180;
 const dx=(a[0]-b[0])*111320*Math.cos(mid);
 const dy=(a[1]-b[1])*111320;
 return Math.hypot(dx,dy);
}
function deltaMeters(fire,c){
 return [(c[0]-fire.coordinates[0])*111320*Math.cos(fire.coordinates[1]*Math.PI/180),
         (c[1]-fire.coordinates[1])*111320];
}
function pointInRing(point,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const x=ring[i][0],y=ring[i][1],xx=ring[j][0],yy=ring[j][1];
  if(((y>point[1])!==(yy>point[1]))&&
     point[0]<(xx-x)*(point[1]-y)/((yy-y)||1e-15)+x)inside=!inside;
 }
 return inside;
}
export function pointWithinFireGeometry(point,geometry){
 const polys=geometry?.type==='Polygon'?[geometry.coordinates]:
  geometry?.type==='MultiPolygon'?geometry.coordinates:[];
 return polys.some(rings=>{
  if(!rings?.length||!pointInRing(point,rings[0]))return false;
  return !rings.slice(1).some(hole=>pointInRing(point,hole));
 });
}
function detectedFireArea(state,fire,coords){
 if(distMeters(fire.coordinates,coords)>fire.radiusM)return false;
 const feature=state.perimeters.get(fire.id);
 if(!feature?.length)return true;
 return feature.some(f=>pointWithinFireGeometry(coords,f.geometry));
}
function centroidOfGeo(geo){
 if(!geo)return null;
 if(geo.type==='Point')return normCoord(geo.coordinates);
 if(geo.type==='MultiPoint')return normCoord(geo.coordinates?.[0]);
 const r=geo.type==='Polygon'?geo.coordinates?.[0]:
  geo.type==='MultiPolygon'?geo.coordinates?.[0]?.[0]:
  geo.type==='LineString'?geo.coordinates:null;
 if(!Array.isArray(r)||!r.length)return null;
 let x=0,y=0,n=0;
 for(const c of r.slice(0,300)){const p=normCoord(c);if(!p)continue;x+=p[0];y+=p[1];n++;}
 return n?[x/n,y/n]:null;
}
function objectsUnderFire(state,fire){
 const map=state.map,zoom=Number(map.getZoom?.()||0);
 if(zoom<15||typeof map.queryRenderedFeatures!=='function')return {buildings:[],trees:[]};
 let screen;try{screen=map.project(fire.coordinates);}catch(_){return {buildings:[],trees:[]};}
 if(!screen||!finite(+screen.x)||!finite(+screen.y))return {buildings:[],trees:[]};
 const pixelPerMetre=(Math.pow(2,zoom)/(156543.034*Math.max(.03,Math.cos(fire.coordinates[1]*Math.PI/180))));
 const radiusPx=Math.max(12,Math.min(250,fire.radiusM*pixelPerMetre));
 const layers=map.getStyle?.()?.layers||[];
 const buildingLayers=layers.filter(x=>(x.type==='fill-extrusion'||/buildings|building-3d|extrusion/i.test(x.id))&&
  ['fill-extrusion','fill','circle','symbol'].includes(x.type)).map(x=>x.id);
 const treeLayers=layers.filter(x=>/tree|vegetation|canopy/i.test(x.id)&&
  ['circle','symbol','fill'].includes(x.type)).map(x=>x.id);
 const candidates=[...new Set([...buildingLayers,...treeLayers])];
 if(!candidates.length)return {buildings:[],trees:[]};
 let feats=[];
 try{feats=map.queryRenderedFeatures([
  [screen.x-radiusPx,screen.y-radiusPx],[screen.x+radiusPx,screen.y+radiusPx]
 ],{layers:candidates}).slice(0,1400)||[];}catch(_){return {buildings:[],trees:[]};}
 const buildings=[],trees=[],seen=new Set();
 for(const feature of feats){
  const coord=centroidOfGeo(feature.geometry);
  if(!coord||!detectedFireArea(state,fire,coord))continue;
  const layer=String(feature.layer?.id||'');
  const isTree=treeLayers.includes(layer);
  const key=(isTree?'tree:':'building:')+(feature.id??coord.map(v=>v.toFixed(6)).join(','));
  if(seen.has(key))continue;seen.add(key);
  if(isTree){
   if(trees.length>=22)continue;
   const props=feature.properties||{};
   const h=Number(props.height||props.tree_height||props.canopy_height||props.height_m)||7;
   trees.push({coord,height:Math.max(3,Math.min(35,h))});
  }else{
   if(buildings.length>=18)continue;
   const props=feature.properties||{};
   const h=Number(props.render_height??props.height_m??props.height??props.building_height)||
     (Number(props['building:levels']??props.levels)||3)*3;
   buildings.push({coord,height:Math.max(2.5,Math.min(220,h))});
  }
 }
 return {buildings,trees};
}
function placeFlame(T,group,x,y,z,height,seed,output){
 const flame=flameBody(T,height,seed);
 flame.position.set(x,y,z);group.add(flame);
 output.push(flame);
}
function makeSceneForFire(T,state,fire,quality){
 const surfaces=objectsUnderFire(state,fire);
 // The same genuine FIRMS detection and its verified official perimeter
 // constrain the 3D geometry; heat and flames are visual reconstructions.
 const effect=state.volumeV4.createBridgePointWildfireVolumeV4(T,{
  map:state.map,fire,perimeters:state.perimeters.get(fire.id)||[],
  buildings:surfaces.buildings,trees:surfaces.trees,quality
 });
 if(!effect)throw Error('Volumetric wildfire renderer not ready');
 return effect;
}
function worldMatrix(map,T,coords,elev){
 try{
  const raw=map.transform?.getMatrixForModel?.(coords,elev);
  if(raw&&raw.length>=16)return new T.Matrix4().fromArray(raw);
  const C=window.maplibregl?.MercatorCoordinate;
  if(!C?.fromLngLat)return null;
  const p=C.fromLngLat(coords,elev),s=p.meterInMercatorCoordinateUnits();
  if(!finite(s)||s<=0)return null;
  return new T.Matrix4().set(s,0,0,p.x,0,0,s,p.y,0,s,0,p.z,0,0,0,1);
 }catch(_){return null;}
}
function visible3DFires(state){
 if(!state.enabled||!state.map)return [];
 const zoom=Number(state.map.getZoom?.()||0);
 if(zoom<12.5)return [];
 const bounds=state.map.getBounds?.();
 const center=state.map.getCenter?.();
 const ref=[center?.lng||0,center?.lat||0];
 return state.fires.filter(f=>boundsContains(bounds,f.coordinates))
  .sort((a,b)=>distMeters(a.coordinates,ref)-distMeters(b.coordinates,ref))
  .slice(0,zoom<15?3:7);
}
function ensureNative3D(state){
 if(!state.enabled||!state.THREE||!state.volumeV4||!state.map.getStyle?.())return;
 if(state.map.getLayer?.(layer3d))return;
 const map=state.map,T=state.THREE;
 const layer={id:layer3d,type:'custom',renderingMode:'3d',
  onAdd(m,gl){
   state.renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,alpha:true,antialias:false,powerPreference:'low-power'});
   state.renderer.autoClear=false;state.renderer.outputColorSpace=T.SRGBColorSpace;
   state.camera=new T.Camera();state.effects=new Map();
  },
  render(_gl,args){
   if(!state.enabled||!state.camera||!state.renderer)return;
   const sites=visible3DFires(state);if(!sites.length)return;
   const projection=args?.defaultProjectionData?.mainMatrix||args?.modelViewProjectionMatrix;
   if(!projection||projection.length<16)return;
   const now=performance.now();
   if(now-state.lastFrame<30){map.triggerRepaint?.();return;}state.lastFrame=now;
   const activeIds=new Set(sites.map(s=>s.id));
   for(const [id,effect] of state.effects){
    if(!activeIds.has(id)){effect.dispose?.();state.effects.delete(id);}
   }
   const zoom=Number(map.getZoom?.()||0);
   const quality=zoom>=17?2:zoom>=15?1:0;
   for(const site of sites){
    let effect=state.effects.get(site.id);
    if(effect&&effect.quality!==quality){effect.dispose?.();state.effects.delete(site.id);effect=null;}
    if(!effect){effect=makeSceneForFire(T,state,site,quality);state.effects.set(site.id,effect);}
    let height=0;
    try{const sample=map.queryTerrainElevation?.(site.coordinates,{exaggerated:false});if(Number.isFinite(sample))height=sample;}catch(_){}
    const model=worldMatrix(map,T,site.coordinates,height);
    if(!model)continue;
    // Shader-sampled turbulence curls and flickers every frame without
    // moving fire roots away from sampled 3D terrain or mapped structures.
    for(const shader of effect.uniforms)shader.uTime.value=now*.001;
    state.camera.projectionMatrix.copy(new T.Matrix4().fromArray(projection)).multiply(model);
    try{state.renderer.resetState();state.renderer.render(effect.scene,state.camera);}
    catch(e){if(!state.renderWarned){state.renderWarned=true;console.warn('3D wildfire native renderer',e);}}
   }
   // Only animate if a real current detection is in view; never keep idle globe repainting.
   if(state.enabled&&sites.length)map.triggerRepaint?.();
  },
  onRemove(){
   for(const effect of state.effects.values())effect.dispose?.();
   state.effects.clear();
   try{state.renderer?.dispose();}catch(_){}
   state.camera=null;state.renderer=null;
  }
 };
 try{map.addLayer(layer);}catch(e){state.error='3D wildfire init: '+String(e?.message||e);}
}
function maybeShowNative3D(state){
 if(!state.enabled||!visible3DFires(state).length)return;
 if(state.THREE&&state.volumeV4){ensureNative3D(state);return;}
 if(state.loadingVolumeV4)return;
 state.loadingVolumeV4=true;
 void Promise.all([getThree(),getFireVolumeV4()]).then(([T,module])=>{
  if(!state.enabled||state.destroyed)return;
  state.THREE=T;state.volumeV4=module;
  ensureNative3D(state);state.map.triggerRepaint?.();
 }).catch(e=>{
  state.error='Realistic wildfire volume: '+String(e?.message||e);
  publishFireStatus(state);
 }).finally(()=>{state.loadingVolumeV4=false;});
}
function turnOff(state){
 state.abort?.abort();state.eventsAbort?.abort();state.eventsAbort=null;
 state.abort=null;
 for(const controller of state.perimeterAbort.values())controller.abort();
 state.perimeterAbort.clear();state.perimeterLoading.clear();
 state.popup?.remove();state.popup=null;
 if(state.refreshTimer!==null){clearInterval(state.refreshTimer);state.refreshTimer=null;}
 for(const layer of [layer3d,pointLayer,detectionLine,lineLayer,fillLayer]){
  if(state.map.getLayer?.(layer))try{state.map.removeLayer(layer);}catch(_){}
 }
 for(const id of [sourceId,perimeterId]){
  if(state.map.getSource?.(id))try{state.map.removeSource(id);}catch(_){}
 }
 state.effects=new Map();
 for(const entry of state.markers.values())entry.marker.remove();
 state.markers.clear();
 publishFireStatus(state);
 state.map.triggerRepaint?.();
}
function handleMapMove(state){
 if(!state.enabled||state.destroyed)return;
 ensureMapSources(state);
 updateVisibleZones(state);
 refreshPersistentMarkers(state);
 schedulePerimeterLoads(state);
 maybeShowNative3D(state);
 refreshFireActivity(state);
}
export function initLiveWildfireRenderer(target){
 const map=target&&(target.map||target);
 if(!map||typeof map.getStyle!=='function'||typeof map.addLayer!=='function')return null;
 const existing=states.get(map);if(existing)return existing.api;
 installFireCardStyles();
 const state={map,enabled:false,destroyed:false,fires:[],error:'',lastUpdated:0,loading:false,markers:new Map(),eventsAbort:null,markerWarned:false,
  abort:null,perimeters:new Map(),fetchedSlugs:new Set(),perimeterLoading:new Set(),
  perimeterAbort:new Map(),THREE:null,volumeV4:null,loadingVolumeV4:false,renderer:null,camera:null,effects:new Map(),
  refreshTimer:null,lastFrame:0,popup:null,renderWarned:false};
 const handleStyle=()=>{if(state.enabled){
  if(ensureMapSources(state)){updateMap(state);schedulePerimeterLoads(state);}
  refreshPersistentMarkers(state);
  maybeShowNative3D(state);
 }};
 const click=e=>onClickMarker(state,e);
 const mouseEnter=()=>{map.getCanvas().style.cursor='pointer';};
 const mouseLeave=()=>{map.getCanvas().style.cursor='';};
 for(const evt of ['load','style.load'])map.on(evt,handleStyle);
 for(const evt of ['moveend','zoomend'])map.on(evt,()=>handleMapMove(state));
 map.on('click',pointLayer,click);
 map.on('mouseenter',pointLayer,mouseEnter);
 map.on('mouseleave',pointLayer,mouseLeave);
 const api={
  map,version:1,
  get enabled(){return state.enabled;},
  get state(){return {enabled:state.enabled,loading:state.loading,fireCount:state.fires.length,
   markerCount:state.markers.size,mapLayerReady:!!map.getLayer?.(pointLayer),
   sourcePerimeters:state.perimeters.size,visibleFlameSites:visible3DFires(state).length,
   lastUpdated:state.lastUpdated,error:state.error};},
  setEnabled(value){
   const next=!!value;if(state.destroyed)return false;
   if(state.enabled===next)return next;
   state.enabled=next;
   if(!next){turnOff(state);return false;}
   publishFireStatus(state);
   ensureMapSources(state);updateMap(state);
   void loadCurrentFires(state);
   state.refreshTimer=setInterval(()=>{if(state.enabled)void loadCurrentFires(state);},15*60000);
   maybeShowNative3D(state);
   return true;
  },
  refresh(){if(state.enabled&&!state.loading)void loadCurrentFires(state);},
  openFire(id){const f=state.fires.find(x=>x.id===id);if(f&&state.enabled)addPopup(state,f);},
  destroy(){
   if(state.destroyed)return;
   api.setEnabled(false);state.destroyed=true;
   for(const evt of ['load','style.load'])map.off(evt,handleStyle);
   map.off('click',pointLayer,click);
   map.off('mouseenter',pointLayer,mouseEnter);
   map.off('mouseleave',pointLayer,mouseLeave);
   states.delete(map);
  }
 };
 state.api=api;states.set(map,state);
 return api;
}
