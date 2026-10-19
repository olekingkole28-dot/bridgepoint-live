const VERSION=5961;
const ROOT_ID='bp-underground-xray-v5951';
const STYLE_ID='bp-underground-xray-style-v5951';
const SOURCE_ID='bp-underground-xray-source-v5951';
const GLOW_ID='bp-underground-xray-glow-v5951';
const LINE_ID='bp-underground-xray-line-v5951';
const VOLUME_LAYER_ID='bp-underground-volume-v5951';
const THREE_URL='./vendor/three.module.js?v=169-local';
const FN='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-public-underground-xray-v5935';
// Public rendering uses generalized TUNNELS_UNDERPASSES records only.
// No pipe network or leak telemetry exists in the current materialized dataset; never infer either from tunnel geometry.
const EMPTY=new Uint8Array();
const CSS=`
:is(#liveMap,#previewMap) #${ROOT_ID}{padding:10px;border:1px solid rgba(111,226,255,.24);border-radius:13px;background:linear-gradient(135deg,rgba(5,22,34,.96),rgba(14,14,36,.94));box-shadow:0 8px 22px rgba(0,0,0,.22),inset 0 1px 0 rgba(211,250,255,.06);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
:is(#liveMap,#previewMap) #${ROOT_ID}{display:block;width:100%;min-width:0;max-width:100%;box-sizing:border-box;color:#eafaff;font:11px/1.35 system-ui,-apple-system,Segoe UI,sans-serif}
:is(#liveMap,#previewMap) #${ROOT_ID} *{box-sizing:border-box}
:is(#liveMap,#previewMap) #${ROOT_ID} .bpxr-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center}
:is(#liveMap,#previewMap) #${ROOT_ID} .bpxr-toggle{min-width:0;min-height:34px;padding:8px 9px;border:1px solid rgba(114,248,255,.48);border-radius:9px;background:linear-gradient(125deg,rgba(21,62,86,.96),rgba(42,24,92,.92));color:#e9ffff;font:950 9px/1.2 system-ui,sans-serif;letter-spacing:.04em;cursor:pointer;text-align:left}
:is(#liveMap,#previewMap) #${ROOT_ID} .bpxr-toggle[aria-pressed=true]{border-color:#80ffff;box-shadow:0 0 0 1px rgba(83,239,255,.18),0 0 16px rgba(68,142,255,.14);background:linear-gradient(125deg,rgba(8,93,103,.97),rgba(42,30,106,.96))}
:is(#liveMap,#previewMap) #${ROOT_ID} .bpxr-count{font-variant-numeric:tabular-nums;font-weight:900;color:#9af8ff;font-size:9px;text-align:right;white-space:nowrap}
:is(#liveMap,#previewMap) #${ROOT_ID} .bpxr-status{margin-top:5px;color:#a5c6d3;font-size:9px;line-height:1.45;overflow-wrap:anywhere}
:is(#liveMap,#previewMap) #${ROOT_ID} .bpxr-status strong{color:#d7fdff}
:is(#liveMap,#previewMap) #${ROOT_ID} .bpxr-status[data-error=true]{color:#ffd0ba}
:is(#liveMap,#previewMap) #${ROOT_ID} .bpxr-key{display:flex;gap:9px;flex-wrap:wrap;margin-top:5px;color:#93b9c8;font-size:8px}
:is(#liveMap,#previewMap) #${ROOT_ID} .bpxr-key span{display:inline-flex;align-items:center;gap:4px}
:is(#liveMap,#previewMap) #${ROOT_ID} .bpxr-swatch{display:inline-block;width:12px;height:3px;border-radius:3px;background:#83ffff;box-shadow:0 0 6px #765bff}
:is(#liveMap,#previewMap) #${ROOT_ID} .bpxr-swatch.leak{background:#ffb15e;box-shadow:none}
`;
function hexToBytes(v){const raw=String(v||'');const prefix=String.fromCharCode(92)+'x';const s=raw.startsWith(prefix)?raw.slice(2):raw;const out=new Uint8Array(Math.floor(s.length/2));for(let i=0;i<out.length;i++)out[i]=parseInt(s.slice(i*2,i*2+2),16);return out}
async function fetchStatus(){const r=await fetch(FN+'?status=1',{headers:{Accept:'application/json'},cache:'no-store'});if(!r.ok)throw new Error('Coverage status HTTP '+r.status);const j=await r.json();if(j?.complete!==true)throw new Error(j?.error||'Coverage status unavailable');return j}
export function initUndergroundXray(target){
 const map=target?.map||target,container=map?.getContainer?.();
 if(!map||!container||typeof fetch!=='function')return null;
 if(window.__BP_UNDERGROUND_XRAY_V5951__?.map===map)return window.__BP_UNDERGROUND_XRAY_V5951__;
 if(!document.getElementById(STYLE_ID)){const style=document.createElement('style');style.id=STYLE_ID;style.textContent=CSS;document.head.appendChild(style)}
 const state={version:VERSION,map,enabled:false,available:true,coverage:null,source:'OpenStreetMap public mapped tunnels/underpasses (ODbL-1.0)',iconLayer:'tile-backed tunnel / underpass center markers',leakTelemetryConnected:false,lastUpdated:Date.now()};
 window.__BP_UNDERGROUND_XRAY_V5951__=state;
 const dock=document.createElement('section');dock.id=ROOT_ID;dock.setAttribute('aria-label','Underground X-ray map layer');
 dock.innerHTML='<div class="bpxr-row"><button class="bpxr-toggle" type="button" data-toggle aria-pressed="false">◈ UNDERGROUND X-RAY · OFF</button><span class="bpxr-count" data-count>UNLOADED</span></div><div class="bpxr-status" data-status><strong>Fast map mode.</strong> Click for global cluster badges immediately, then zoom for source-mapped tunnel / underpass locations and glowing paths. Utility pipes appear only where real data exist.</div><div class="bpxr-key"><span><i class="bpxr-swatch"></i> GLOWING PATH = MAPPED ROUTE</span><span><i class="bpxr-swatch" style="background:#eaffff;box-shadow:0 0 8px #62edff"></i> ICON = MAPPED TUNNEL / UNDERPASS</span></div><div class="bpxr-status">Cluster icons are visible from global zoom. Numbers summarize mapped features inside each grid cluster; zoom in for individual mapped locations and glowing route geometry. Coverage is incomplete; no fabricated pipes, depths, or leak points.</div>';
 const $=s=>dock.querySelector(s),button=$('[data-toggle]'),status=$('[data-status]'),count=$('[data-count]');
 let disposed=false,mountTimer=null,tries=0,retryTimer=null,styleRetry=null;
 const opacityOriginal=new Map();
 let volumeScene=null,volumeRenderer=null,volumeLayer=null,threePromise=null,volumeRefreshTimer=null;
 function captureOpacity(id,prop){const k=id+'|'+prop;if(opacityOriginal.has(k))return;let value;try{value=map.getPaintProperty(id,prop)}catch(_){}opacityOriginal.set(k,{has:value!==undefined,value})}
 function setXrayOpacity(on){
  const active=!!on&&Number(map.getZoom?.()||0)>=10;
  const ids=['gta-context-buildings','gta-city-buildings','gta-exact-building','gta-bp-buildings'];
  for(const id of ids){if(!map.getLayer(id))continue;const prop='fill-extrusion-opacity';captureOpacity(id,prop);try{map.setPaintProperty(id,prop,active?0.24:(opacityOriginal.get(id+'|'+prop).has?opacityOriginal.get(id+'|'+prop).value:null))}catch(_){}}
  const roofIds=['gta-city-roofs','gta-bp-roofs','gta-context-roofs','gta-exact-roof','gta-city-building-roof-caps'];
  for(const id of roofIds){if(!map.getLayer(id))continue;const type=map.getLayer(id).type,prop=type==='fill-extrusion'?'fill-extrusion-opacity':'fill-opacity';captureOpacity(id,prop);try{map.setPaintProperty(id,prop,active?0.32:(opacityOriginal.get(id+'|'+prop).has?opacityOriginal.get(id+'|'+prop).value:null))}catch(_){}}
 }
 function setXraySurface(on){
  const active=!!on&&Number(map.getZoom?.()||0)>=8.5;
  let layers=[];try{layers=map.getStyle?.()?.layers||[]}catch(_){}
  for(const layer of layers){
   if(!layer?.id)continue;
   if(layer.type==='raster'){
    const prop='raster-opacity';captureOpacity(layer.id,prop);const old=opacityOriginal.get(layer.id+'|'+prop);
    try{map.setPaintProperty(layer.id,prop,active?0.16:(old?.has?old.value:null))}catch(_){}
   }else if(layer.type==='background'){
    const prop='background-color';captureOpacity(layer.id,prop);const old=opacityOriginal.get(layer.id+'|'+prop);
    try{map.setPaintProperty(layer.id,prop,active?'#06111a':(old?.has?old.value:null))}catch(_){}
   }
  }
 }
 function syncButton(){button.setAttribute('aria-pressed',String(state.enabled));button.textContent=state.enabled?'◈ UNDERGROUND X-RAY · ON':'◈ UNDERGROUND X-RAY · OFF';syncMapIcon()}
 const ICON_LAYER_ID='bp-underground-feature-icons-v5951';
const ICON_IMAGE_ID='bp-underground-feature-sprite-v5951';
const CLUSTER_SOURCE_ID='bp-underground-global-clusters-source-v5961';
const CLUSTER_GLOW_ID='bp-underground-global-clusters-glow-v5961';
const CLUSTER_BADGE_ID='bp-underground-global-clusters-badge-v5961';
const CLUSTER_COUNT_ID='bp-underground-global-clusters-count-v5961';
let globalClusterData=null,globalClusterPromise=null;
function installUndergroundIcon(){
 if(map.hasImage?.(ICON_IMAGE_ID))return true;
 try{
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const x=canvas.getContext('2d');if(!x)return false;
  x.clearRect(0,0,64,64);
  // High contrast badge: readable over terrain, satellite imagery and 3D buildings.
  x.save();x.shadowColor='#25eaff';x.shadowBlur=9;x.beginPath();x.arc(32,32,27,0,Math.PI*2);x.fillStyle='#061722';x.fill();x.lineWidth=3;x.strokeStyle='#70f4ff';x.stroke();x.restore();
  // Tunnel mouth, opening and downward location chevron.
  x.beginPath();x.moveTo(17,39);x.lineTo(17,29);x.arc(32,29,15,Math.PI,0,false);x.lineTo(47,39);x.closePath();x.fillStyle='#123b52';x.fill();x.lineWidth=3;x.strokeStyle='#e9ffff';x.stroke();
  x.beginPath();x.moveTo(23,39);x.lineTo(23,31);x.arc(32,31,9,Math.PI,0,false);x.lineTo(41,39);x.closePath();x.fillStyle='#633eff';x.fill();
  x.beginPath();x.moveTo(32,39);x.lineTo(32,48);x.moveTo(26,43);x.lineTo(32,49);x.lineTo(38,43);x.strokeStyle='#70f4ff';x.lineWidth=3;x.lineCap='round';x.lineJoin='round';x.stroke();
  map.addImage(ICON_IMAGE_ID,x,{pixelRatio:2});
  return true;
 }catch(e){console.warn('BridgePoint underground icon sprite',String(e?.message||e));return false}
}
function syncMapIcon(){
 if(!state.enabled){if(map.getLayer(ICON_LAYER_ID))try{map.removeLayer(ICON_LAYER_ID)}catch(_){}return}
 if(!map.isStyleLoaded?.()||!map.getSource(SOURCE_ID))return;
 try{
  if(!installUndergroundIcon())return;
  if(!map.getLayer(ICON_LAYER_ID)){
   const before=['gta-place-label','gta-poi-label','gta-opportunity-label','gta-city-buildings','gta-context-buildings'].find(id=>map.getLayer(id));
   const layer={id:ICON_LAYER_ID,type:'symbol',source:SOURCE_ID,'source-layer':'underground_markers',minzoom:8,maxzoom:17,
    layout:{
     'symbol-placement':'point','icon-image':ICON_IMAGE_ID,
     'icon-size':['interpolate',['linear'],['zoom'],3,.42,5,.46,8,.52,10,.58,12,.66,14,.76,17,.9],
     'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-padding':1,
     'icon-rotation-alignment':'viewport','icon-pitch-alignment':'viewport',
     'text-field':['case',['>', ['to-number',['get','feature_count']],1],['to-string',['get','feature_count']],''],
     'text-font':['Open Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],3,10,7,12,12,13],
     'text-optional':true,'text-allow-overlap':true,'text-ignore-placement':true,
     'text-offset':[0,1.05],'visibility':'visible'
    },paint:{'icon-opacity':1,'text-color':'#eaffff','text-halo-color':'#061722','text-halo-width':1.6}
   };
   if(before)map.addLayer(layer,before);else map.addLayer(layer);
  }else map.setLayoutProperty(ICON_LAYER_ID,'visibility','visible');
 }catch(e){console.warn('BridgePoint underground source-geometry icons',String(e?.message||e))}
}

async function ensureGlobalClusters(){
 if(disposed||!state.enabled||!map.isStyleLoaded?.())return false;
 if(!globalClusterData&&!globalClusterPromise){
  globalClusterPromise=(async()=>{
   try{
    const r=await fetch(FN+'?clusters=1&v=5961',{headers:{Accept:'application/geo+json'},cache:'no-store'});
    if(!r.ok)throw new Error('Global cluster HTTP '+r.status);
    const d=await r.json();
    if(d?.type!=='FeatureCollection'||!Array.isArray(d.features))throw new Error('Invalid global cluster collection');
    globalClusterData=d;
   }finally{globalClusterPromise=null}
  })();
 }
 if(!globalClusterData&&globalClusterPromise)try{await globalClusterPromise}catch(e){console.warn('BridgePoint global underground cluster badges',e);return false}
 if(disposed||!state.enabled||!map.isStyleLoaded?.()||!globalClusterData)return false;
 try{
  if(!map.getSource(CLUSTER_SOURCE_ID))map.addSource(CLUSTER_SOURCE_ID,{type:'geojson',data:globalClusterData});
  else map.getSource(CLUSTER_SOURCE_ID).setData(globalClusterData);
  const before=['gta-place-label','gta-poi-label','gta-opportunity-label','gta-city-buildings','gta-context-buildings'].find(id=>map.getLayer(id));
  if(!map.getLayer(CLUSTER_GLOW_ID)){
   const layer={id:CLUSTER_GLOW_ID,type:'circle',source:CLUSTER_SOURCE_ID,maxzoom:8,
    paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,15,2,17,4,19,7,22],
     'circle-color':'#20e7ff','circle-opacity':.22,'circle-blur':.65,'circle-stroke-color':'#61f3ff','circle-stroke-opacity':.55,'circle-stroke-width':1}};
   if(before)map.addLayer(layer,before);else map.addLayer(layer);
  }else map.setLayoutProperty(CLUSTER_GLOW_ID,'visibility','visible');
  if(!map.getLayer(CLUSTER_BADGE_ID)){
   const layer={id:CLUSTER_BADGE_ID,type:'circle',source:CLUSTER_SOURCE_ID,maxzoom:8,
    paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,8,2,10,4,12,7,14],
     'circle-color':'#072332','circle-opacity':.99,'circle-stroke-color':'#8bfbff','circle-stroke-width':2.4,'circle-stroke-opacity':1}};
   if(before)map.addLayer(layer,before);else map.addLayer(layer);
  }else map.setLayoutProperty(CLUSTER_BADGE_ID,'visibility','visible');
  if(!map.getLayer(CLUSTER_COUNT_ID)){
   const layer={id:CLUSTER_COUNT_ID,type:'symbol',source:CLUSTER_SOURCE_ID,maxzoom:8,
    layout:{'text-field':['to-string',['get','feature_count']],
     'text-font':['Open Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],0,9,3,11,6,13],
     'text-allow-overlap':true,'text-ignore-placement':true,'text-padding':0,'text-anchor':'center','text-offset':[0,0]},
    paint:{'text-color':'#f1ffff','text-halo-color':'#03131c','text-halo-width':1.4}};
   if(before)map.addLayer(layer,before);else map.addLayer(layer);
  }else map.setLayoutProperty(CLUSTER_COUNT_ID,'visibility','visible');
  state.globalClusters={count:globalClusterData.features.length,
   sourceRecords:globalClusterData.features.reduce((sum,f)=>sum+Number(f?.properties?.feature_count||0),0),updatedAt:Date.now()};
  return true;
 }catch(e){console.warn('BridgePoint global underground clusters did not attach',e);return false}
}
function removeGlobalClusters(){
 for(const id of [CLUSTER_COUNT_ID,CLUSTER_BADGE_ID,CLUSTER_GLOW_ID])try{if(map.getLayer(id))map.removeLayer(id)}catch(_){}
 try{if(map.getSource(CLUSTER_SOURCE_ID))map.removeSource(CLUSTER_SOURCE_ID)}catch(_){}
}

function ensureLayers(){
  if(disposed||!state.enabled||!map||typeof map.addSource!=='function')return false;
  try{
   if(!map.isStyleLoaded?.())return false;
   if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{type:'vector',tiles:[FN+'?z={z}&x={x}&y={y}&v=5951'],minzoom:0,maxzoom:17,attribution:'OpenStreetMap contributors (ODbL-1.0); source-mapped tunnel / underpass geometry'});
   const before=['gta-place-label','gta-poi-label','gta-opportunity-label','gta-city-buildings','gta-context-buildings'].find(id=>map.getLayer(id));
   if(!map.getLayer(GLOW_ID)){
    const layer={id:GLOW_ID,type:'line',source:SOURCE_ID,'source-layer':'underground',minzoom:10,maxzoom:17,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#7257ff','line-opacity':.72,'line-width':['interpolate',['linear'],['zoom'],10,1.8,12,3.5,14,5.5,17,7.5],'line-blur':['interpolate',['linear'],['zoom'],10,1.2,14,2.4,17,3.2]}};
    if(before)map.addLayer(layer,before);else map.addLayer(layer);
   }
   if(!map.getLayer(LINE_ID)){
    const layer={id:LINE_ID,type:'line',source:SOURCE_ID,'source-layer':'underground',minzoom:10,maxzoom:17,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#8effff','line-opacity':.98,'line-width':['interpolate',['linear'],['zoom'],10,.65,12,1.15,14,1.75,17,2.3]}};
    if(before)map.addLayer(layer,before);else map.addLayer(layer);
   }
   for(const id of [GLOW_ID,LINE_ID])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',state.enabled?'visible':'none');
   setXrayOpacity(state.enabled);
   setXraySurface(state.enabled);
   syncMapIcon();
   void ensureGlobalClusters();
   return true;
  }catch(e){console.warn('BridgePoint underground X-ray retries after style readiness',String(e?.message||e));return false}
 }

 // Procedural underground tubes use source-backed visible line geometry; unmeasured depths are schematic estimates.
 function projectionType(){try{return map.getProjection?.()?.type||'mercator'}catch(_){return 'mercator'}}
 function syncXrayProjection(){
  if(!state.enabled)return;
  const zoom=Number(map.getZoom?.()||0),current=projectionType();
  if(state.originalProjection==null)state.originalProjection=current;
  if(zoom>=8.5&&state.originalProjection==='globe'&&current!=='mercator'){
   try{map.setProjection?.({type:'mercator'});state.projectionChanged=true}catch(e){console.warn('BridgePoint underground projection switch',e)}
  }else if(zoom<8.5&&state.projectionChanged){
   try{map.setProjection?.({type:state.originalProjection});state.projectionChanged=false}catch(e){console.warn('BridgePoint underground projection restore',e)}
  }
 }
 function restoreXrayProjection(){
  if(state.projectionChanged&&state.originalProjection)try{map.setProjection?.({type:state.originalProjection})}catch(e){console.warn('BridgePoint underground projection restore',e)}
  state.projectionChanged=false;state.originalProjection=null;
 }
 function loadThree(){if(!threePromise)threePromise=import(THREE_URL).then(m=>m.default||m).catch(e=>{threePromise=null;throw e});return threePromise}
 function linePaths(g){if(!g)return[];if(g.type==='LineString')return[g.coordinates||[]];if(g.type==='MultiLineString')return g.coordinates||[];if(g.type==='GeometryCollection')return(g.geometries||[]).flatMap(linePaths);return[]}
 function numberFrom(v){if(typeof v==='number'&&Number.isFinite(v))return v;const m=String(v??'').trim().match(/-?\d+(?:[.,]\d+)?/);if(!m)return null;const n=Number(m[0].replace(',','.'));return Number.isFinite(n)?n:null}
 function depthInfo(props){
  const p=props||{},tags=p.tags&&typeof p.tags==='object'?p.tags:{},a={...tags,...p};
  for(const k of ['depth_m','burial_depth_m','tunnel_depth_m','depthMeters']){const n=numberFrom(a[k]);if(n!==null&&n>0&&n<300)return{meters:n,measured:true}}
  for(const k of ['depth_ft','depth_feet','burial_depth_ft']){const n=numberFrom(a[k]);if(n!==null&&n>0&&n<1000)return{meters:n*.3048,measured:true}}
  const raw=numberFrom(a.depth);if(raw!==null&&raw>0&&raw<300)return{meters:raw,measured:true};
  const t=[a.utility_type,a.infrastructure_type,a.kind,a.class,a.subtype,a.tunnel,a.railway,a.water,a.power].filter(Boolean).join(' ').toLowerCase();
  if(/subway|metro|rail|train/.test(t))return{meters:9.1,measured:false};
  if(/sewer|storm.?drain|waste.?water/.test(t))return{meters:4.6,measured:false};
  if(/water.?main|water.?pipe/.test(t))return{meters:1.52,measured:false};
  if(/gas|electric|power|cable/.test(t))return{meters:.91,measured:false};
  if(/footway|pedestrian|passage/.test(t))return{meters:2.4,measured:false};
  if(/underpass/.test(t))return{meters:3.7,measured:false};
  return{meters:5.5,measured:false};
 }
 function diameterInfo(props,type){
  const p=props||{},tags=p.tags&&typeof p.tags==='object'?p.tags:{},a={...tags,...p};
  for(const k of ['diameter_m','pipe_diameter_m']){const n=numberFrom(a[k]);if(n!==null&&n>0&&n<100)return{meters:n,measured:true}}
  for(const k of ['diameter_ft','diameter_feet']){const n=numberFrom(a[k]);if(n!==null&&n>0&&n<1000)return{meters:n*.3048,measured:true}}
  const raw=numberFrom(a.diameter);
  if(raw!==null&&raw>0&&raw<10000){const txt=String(a.diameter).toLowerCase(),m=txt.match(/(mm|millimet(?:er|re)s?|cm|centimet(?:er|re)s?|ft|feet|in|inch|inches)/);let value=raw;
   if(m&&/mm|millimet/.test(m[1]))value=raw/1000;else if(m&&/cm|centimet/.test(m[1]))value=raw/100;else if(m&&/ft|feet/.test(m[1]))value=raw*.3048;else if(m&&/in|inch/.test(m[1]))value=raw*.0254;else if(raw>100)value=raw/1000;else if(raw>5)value=raw/100;
   if(value>0&&value<100)return{meters:value,measured:true}
  }
  if(/rail|subway|train/.test(type))return{meters:1.8,measured:false};
  if(/sewer|storm/.test(type))return{meters:1.1,measured:false};
  if(/water/.test(type))return{meters:.25,measured:false};
  if(/gas|electric|power|cable/.test(type))return{meters:.12,measured:false};
  if(/passage|pedestrian|footway/.test(type))return{meters:.55,measured:false};
  return{meters:1.05,measured:false};
 }
 function utilityStyle(props){
  const p=props||{},tags=p.tags&&typeof p.tags==='object'?p.tags:{},t=[tags.utility,tags.power,tags.water,tags.sewer,p.utility_type,p.infrastructure_type,p.kind,p.class,p.subtype,tags.railway,tags.tunnel].filter(Boolean).join(' ').toLowerCase();
  if(/water/.test(t))return{type:'water',color:0x39a7ff};
  if(/sewer|storm.?drain|waste.?water/.test(t))return{type:'sewer',color:0x3dff9e};
  if(/gas/.test(t))return{type:'gas',color:0xffb34f};
  if(/electric|power|cable/.test(t))return{type:'electric',color:0xff4f65};
  if(/rail|subway|metro|train/.test(t))return{type:'transit',color:0xb08cff};
  if(/passage|pedestrian|footway/.test(t))return{type:'passage',color:0xe5a0ff};
  return{type:'tunnel / underpass',color:0x73f4ff};
 }
 function visibleLineFeatures(){
  const out=[],seen=new Set();
  const collect=(features,layer)=>{for(const f of features||[]){const p=f?.properties||{},g=f?.geometry;
   const eligible=layer==='underground'||p.bp_layer==='underground'||/TUNNEL|UNDERPASS|SUBSURFACE|PIPE|SEWER|CABLE|UTILITY/i.test([p.kind,p.class,p.layer_key,p.utility_type,p.infrastructure_type].filter(Boolean).join(' '));
   if(!eligible||!g||!linePaths(g).some(a=>Array.isArray(a)&&a.length>=2))continue;
   const id=p.osm_id||p.source_record_id||p.id||f.id,key=String(id||JSON.stringify(g.coordinates||[]).slice(0,220));if(seen.has(key))continue;seen.add(key);out.push(f);if(out.length>=140)return;
  }};
  try{collect(map.querySourceFeatures(SOURCE_ID,{sourceLayer:'underground'}),'underground')}catch(_){}
  try{collect(map.querySourceFeatures('bpV5924PhysicalAssets'),'physical')}catch(_){}
  return out.slice(0,140);
 }
 function disposeVolumeScene(){if(!volumeScene)return;for(const o of [...volumeScene.children]){volumeScene.remove(o);try{o.geometry?.dispose?.()}catch(_){}for(const m of (Array.isArray(o.material)?o.material:[o.material]))try{m?.dispose?.()}catch(_){}}}
 function ensureVolumeLayer(THREE){
  if(map.getLayer(VOLUME_LAYER_ID)&&volumeScene)return true;
  const layer={id:VOLUME_LAYER_ID,type:'custom',renderingMode:'3d',
   onAdd:(m,gl)=>{const r=new THREE.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:false,alpha:true});r.autoClear=false;volumeRenderer=r;volumeScene=new THREE.Scene();layer.camera=new THREE.Camera();layer.renderer=r;layer.scene=volumeScene},
   render:(gl,args)=>{if(!layer.renderer||!layer.scene||!layer.camera)return;const matrix=args?.defaultProjectionData?.mainMatrix||args?.modelViewProjectionMatrix||args;if(!matrix||typeof matrix.length!=='number'||matrix.length<16)return;layer.camera.projectionMatrix.fromArray(matrix);try{layer.renderer.resetState?.();if(layer.renderer.state?.reset)layer.renderer.state.reset()}catch(_){}layer.renderer.render(layer.scene,layer.camera)},
   onRemove:()=>{disposeVolumeScene();try{layer.renderer?.dispose?.()}catch(_){}volumeScene=null;volumeRenderer=null;layer.renderer=null;layer.scene=null;layer.camera=null;volumeLayer=null}
  };
  try{map.addLayer(layer);volumeLayer=layer;return!!volumeScene}catch(e){console.warn('BridgePoint underground volume layer',e);return false}
 }
 function mercatorPoint(THREE,c,depth){
  const MC=window.maplibregl?.MercatorCoordinate||window.MapLibreGL?.MercatorCoordinate;if(!MC?.fromLngLat)return null;
  const lng=Number(c?.[0]),lat=Number(c?.[1]);if(!Number.isFinite(lng)||!Number.isFinite(lat)||Math.abs(lat)>85.0511)return null;
  let ground=0;try{const h=Number(map.queryTerrainElevation?.({lng,lat}));if(Number.isFinite(h))ground=h}catch(_){}
  const mc=MC.fromLngLat({lng,lat},ground-depth);return new THREE.Vector3(mc.x,mc.y,mc.z);
 }
 function buildFeatureMeshes(THREE,f){
  const p=f?.properties||{},sty=utilityStyle(p),dep=depthInfo(p),dia=diameterInfo(p,sty.type),radiusMeters=Math.max(.65,dia.meters*.5),objects=[];
  for(const raw of linePaths(f.geometry)){const coords=(raw||[]).filter(c=>Array.isArray(c)&&c.length>=2&&Number.isFinite(Number(c[0]))&&Number.isFinite(Number(c[1])));if(coords.length<2)continue;
   const pts=coords.map(c=>mercatorPoint(THREE,c,dep.meters)).filter(Boolean);if(pts.length<2)continue;
   const MC=window.maplibregl?.MercatorCoordinate||window.MapLibreGL?.MercatorCoordinate,mcu=MC?.fromLngLat?MC.fromLngLat({lng:Number(coords[0][0]),lat:Number(coords[0][1])},0).meterInMercatorCoordinateUnits():0;
   if(!Number.isFinite(mcu)||mcu<=0)continue;
   const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal'),r=mcu*radiusMeters,segments=Math.min(180,Math.max(18,coords.length*5));
   const glow=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,r*2.5,7,false),new THREE.MeshBasicMaterial({color:sty.color,transparent:true,opacity:.14,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
   const core=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,r,7,false),new THREE.MeshBasicMaterial({color:sty.color,transparent:true,opacity:.96,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
   glow.renderOrder=900;core.renderOrder=901;objects.push(glow,core)
  }
  return{objects,measuredDepth:dep.measured,measuredDiameter:dia.measured,type:sty.type}
 }
 async function refreshVolumeGeometry(){
  if(disposed||!state.enabled)return;
  // Check projection before the low-zoom exit so returning to global view restores the original globe.
  syncXrayProjection();
  if(Number(map.getZoom?.()||0)<8.5){disposeVolumeScene();return}
  if(projectionType()==='globe')return;
  try{const THREE=await loadThree();if(disposed||!state.enabled||Number(map.getZoom?.()||0)<8.5||!map.isStyleLoaded?.())return;
   if(!ensureVolumeLayer(THREE))throw new Error('3D volume layer could not attach');
   disposeVolumeScene();const features=visibleLineFeatures();let meshCount=0,measuredDepth=0,measuredDiameter=0;
   for(const f of features){const b=buildFeatureMeshes(THREE,f);for(const mesh of b.objects){volumeScene.add(mesh);meshCount++}if(b.measuredDepth)measuredDepth++;if(b.measuredDiameter)measuredDiameter++}
   state.volume={features:features.length,meshCount,measuredDepthCount:measuredDepth,measuredDiameterCount:measuredDiameter,estimatedDepthCount:Math.max(0,features.length-measuredDepth),updatedAt:Date.now()};
   setStatus(features.length
    ?'3D subsurface view · '+features.length.toLocaleString()+' source-backed route features · '+measuredDepth.toLocaleString()+' measured-depth attributes and '+Math.max(0,features.length-measuredDepth).toLocaleString()+' estimated depths. Tube diameter is visually emphasized for legibility; estimates are not survey-grade.'
    :'Underground X-ray is on. Global cluster icons remain visible; zoom to a mapped tunnel/underpass at 10+ for local 3D tubes. Pipe and cable features appear only when source geometry is materialized.');
   try{map.triggerRepaint?.()}catch(_){}
  }catch(e){console.warn('BridgePoint underground 3D volume refresh',e);setStatus('Underground icons are active; local 3D tubes will retry when source geometry and renderer are ready.')}
 }
 function scheduleVolumeRefresh(){clearTimeout(volumeRefreshTimer);volumeRefreshTimer=setTimeout(()=>void refreshVolumeGeometry(),240)}
 function removeVolumeLayer(){disposeVolumeScene();try{if(map.getLayer(VOLUME_LAYER_ID))map.removeLayer(VOLUME_LAYER_ID)}catch(_){}try{volumeRenderer?.dispose?.()}catch(_){}volumeRenderer=null;volumeScene=null;volumeLayer=null}

 function mount(){
  if(disposed)return;
  const targetDock=document.querySelector('#bpv-underground-slot')||document.querySelector('#bpv-dock');
  if(targetDock){
   if(dock.parentElement!==targetDock)targetDock.appendChild(dock);
   dock.hidden=false;
   syncButton();
   if(mountTimer){clearTimeout(mountTimer);mountTimer=null}
   return;
  }
  dock.hidden=true;
  if(++tries<120)mountTimer=setTimeout(mount,150);
  else{dock.hidden=false;container.appendChild(dock);dock.dataset.mountFallback='1'}
 }
 function deactivateLayers(){try{for(const id of [ICON_LAYER_ID,GLOW_ID,LINE_ID])if(map.getLayer(id))map.removeLayer(id);removeGlobalClusters();removeVolumeLayer();setXrayOpacity(false);setXraySurface(false);if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);restoreXrayProjection()}catch(_){}}
 button.addEventListener('click',()=>{
  state.enabled=!state.enabled;state.lastUpdated=Date.now();syncButton();
  if(state.enabled){if(!ensureLayers())setStatus('Map style is loading. The X-ray layer will attach when ready.');syncMapIcon();void refreshCoverage();scheduleVolumeRefresh()}
  else{deactivateLayers();syncMapIcon();count.textContent='UNLOADED';setStatus('Fast map mode. Underground geometry is unloaded until switched on again.')}
 });
 function setStatus(value,error=false){status.textContent=value;status.dataset.error=error?'true':'false'}
 async function refreshCoverage(){
  try{
   const d=await fetchStatus();if(disposed)return;
   state.coverage=d;state.lastUpdated=Date.now();state.leakTelemetryConnected=Number(d.leak_signal_records||0)>0;
   count.textContent=Number(d.mapped_tunnel_passage_records||0).toLocaleString()+' MAPPED';syncMapIcon();
   const pipe=Number(d.mapped_pipe_records||0),leaks=Number(d.leak_signal_records||0),jur=Number(d.jurisdictions||0);
   setStatus(Number(d.mapped_tunnel_passage_records||0).toLocaleString()+' source-backed tunnel / underpass records across '+jur+' jurisdictions. '+pipe.toLocaleString()+' pipe records; '+leaks.toLocaleString()+' leak signals currently materialized. Exact depth and active leaks are not inferred from tunnel lines.');
  }catch(e){count.textContent='STATUS UNAVAILABLE';setStatus('Map layer is linked, but coverage statistics are temporarily unavailable. Unverified pipes and leaks will not be drawn.',true);console.warn('BridgePoint underground X-ray coverage status',e)}
 }
 const onStyle=()=>{if(state.enabled){if(!ensureLayers()&&!styleRetry)styleRetry=setTimeout(()=>{styleRetry=null;if(state.enabled)ensureLayers()},600);syncMapIcon();void ensureGlobalClusters();scheduleVolumeRefresh()}};
 const onVolumeMove=()=>{if(state.enabled)scheduleVolumeRefresh()};
 map.on('styledata',onStyle);map.on('load',onStyle);map.on('zoomend',onStyle);map.on('moveend',onVolumeMove);map.on('idle',onVolumeMove);
 mount();
 state.open=()=>{state.enabled=true;syncButton();if(!ensureLayers())setStatus('Map style is loading. The X-ray layer will attach when ready.');syncMapIcon();void refreshCoverage();scheduleVolumeRefresh();return state};
 state.close=()=>{state.enabled=false;syncButton();deactivateLayers();syncMapIcon();count.textContent='UNLOADED';setStatus('Fast map mode. Underground geometry is unloaded until re-enabled.');return state};
 state.toggle=()=>{button.click();return state};
 state.destroy=()=>{disposed=true;clearTimeout(mountTimer);clearTimeout(styleRetry);clearTimeout(volumeRefreshTimer);clearInterval(retryTimer);map.off('styledata',onStyle);map.off('load',onStyle);map.off('zoomend',onStyle);map.off('moveend',onVolumeMove);map.off('idle',onVolumeMove);deactivateLayers();dock.remove();state.available=false};
 state.ready=false;
 return state;
}
