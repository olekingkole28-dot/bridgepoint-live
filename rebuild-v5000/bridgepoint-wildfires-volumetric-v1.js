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
   count,frp:Number(row.frp_max)||0,ha:Number(row.ha)||0,
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
 const response=await fetch(url,{signal,mode:'cors',cache:'no-cache',headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('Wildfire source HTTP '+response.status);
 return response.json();
}
async function loadCurrentFires(state){
 if(state.loading||!state.enabled||state.destroyed)return;
 state.loading=true;state.error='';state.abort?.abort();
 const controller=new AbortController();state.abort=controller;
 try{
  let all=[];
  for(const hours of [24,72]){
   const data=await getJSON(API+'/active?hours='+hours,controller.signal);
   all=normalizeActiveFireRecords(data);
   if(all.length>0)break;
  }
  // NASA EONET enriches named events, without replacing observed thermal points.
  try{
   const ev=normalizeEonetFires(await getJSON(EONET,controller.signal));
   const seen=new Set(all.map(x=>x.coordinates.map(v=>v.toFixed(2)).join(',')));
   for(const fire of ev){
    const key=fire.coordinates.map(v=>v.toFixed(2)).join(',');
    if(!seen.has(key)){all.push(fire);seen.add(key);}
   }
  }catch(e){if(!all.length)state.eonetError=String(e?.message||e);}
  if(controller.signal.aborted||state.destroyed||!state.enabled)return;
  if(!all.length)throw Error('No recent fire detections returned (or source unavailable)');
  state.fires=all.slice(0,MAX_MAP_FIRE_RECORDS);
  state.lastUpdated=Date.now();
  updateMap(state);
  schedulePerimeterLoads(state);
 }catch(e){
  if(!controller.signal.aborted){
   state.error=String(e?.message||e);
   console.warn('BridgePoint wildfire live source unavailable',e);
   updateMap(state);
  }
 }finally{if(state.abort===controller){state.loading=false;state.abort=null;}}
}
