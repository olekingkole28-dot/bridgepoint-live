const VERSION=5951;
const ROOT_ID='bp-underground-xray-v5951';
const STYLE_ID='bp-underground-xray-style-v5951';
const SOURCE_ID='bp-underground-xray-source-v5951';
const GLOW_ID='bp-underground-xray-glow-v5951';
const LINE_ID='bp-underground-xray-line-v5951';
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
 function captureOpacity(id,prop){const k=id+'|'+prop;if(opacityOriginal.has(k))return;let value;try{value=map.getPaintProperty(id,prop)}catch(_){}opacityOriginal.set(k,{has:value!==undefined,value})}
 function setXrayOpacity(on){
  const active=!!on&&Number(map.getZoom?.()||0)>=10;
  const ids=['gta-context-buildings','gta-city-buildings','gta-exact-building','gta-bp-buildings'];
  for(const id of ids){if(!map.getLayer(id))continue;const prop='fill-extrusion-opacity';captureOpacity(id,prop);try{map.setPaintProperty(id,prop,active?0.24:(opacityOriginal.get(id+'|'+prop).has?opacityOriginal.get(id+'|'+prop).value:null))}catch(_){}}
  const roofIds=['gta-city-roofs','gta-bp-roofs','gta-context-roofs','gta-exact-roof','gta-city-building-roof-caps'];
  for(const id of roofIds){if(!map.getLayer(id))continue;const type=map.getLayer(id).type,prop=type==='fill-extrusion'?'fill-extrusion-opacity':'fill-opacity';captureOpacity(id,prop);try{map.setPaintProperty(id,prop,active?0.32:(opacityOriginal.get(id+'|'+prop).has?opacityOriginal.get(id+'|'+prop).value:null))}catch(_){}}
 }
 function syncButton(){button.setAttribute('aria-pressed',String(state.enabled));button.textContent=state.enabled?'◈ UNDERGROUND X-RAY · ON':'◈ UNDERGROUND X-RAY · OFF';syncMapIcon()}
 const ICON_LAYER_ID='bp-underground-feature-icons-v5951';
const ICON_IMAGE_ID='bp-underground-feature-sprite-v5951';
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
   const layer={id:ICON_LAYER_ID,type:'symbol',source:SOURCE_ID,'source-layer':'underground_markers',minzoom:3,maxzoom:17,
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
function ensureLayers(){
  if(disposed||!state.enabled||!map||typeof map.addSource!=='function')return false;
  try{
   if(!map.isStyleLoaded?.())return false;
   if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{type:'vector',tiles:[FN+'?z={z}&x={x}&y={y}&v=5951'],minzoom:3,maxzoom:17,attribution:'OpenStreetMap contributors (ODbL-1.0); source-mapped tunnel / underpass geometry'});
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
   return true;
  }catch(e){console.warn('BridgePoint underground X-ray retries after style readiness',String(e?.message||e));return false}
 }
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
 function deactivateLayers(){try{for(const id of [ICON_LAYER_ID,GLOW_ID,LINE_ID])if(map.getLayer(id))map.removeLayer(id);setXrayOpacity(false);if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID)}catch(_){}}
 button.addEventListener('click',()=>{
  state.enabled=!state.enabled;state.lastUpdated=Date.now();syncButton();
  if(state.enabled){if(!ensureLayers())setStatus('Map style is loading. The X-ray layer will attach when ready.');syncMapIcon();void refreshCoverage()}
  else{deactivateLayers();syncMapIcon();count.textContent='UNLOADED';setStatus('<strong>Fast map mode.</strong> Underground geometry is unloaded until switched on again.')}
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
 const onStyle=()=>{if(state.enabled){if(!ensureLayers()&&!styleRetry)styleRetry=setTimeout(()=>{styleRetry=null;if(state.enabled)ensureLayers()},600);syncMapIcon()}};
 map.on('styledata',onStyle);map.on('load',onStyle);map.on('zoomend',onStyle);
 mount();
 state.open=()=>{state.enabled=true;syncButton();if(!ensureLayers())setStatus('Map style is loading. The X-ray layer will attach when ready.');syncMapIcon();void refreshCoverage();return state};
 state.close=()=>{state.enabled=false;syncButton();deactivateLayers();syncMapIcon();count.textContent='UNLOADED';setStatus('<strong>Fast map mode.</strong> Underground geometry is unloaded until re-enabled.');return state};
 state.toggle=()=>{button.click();return state};
 state.destroy=()=>{disposed=true;clearTimeout(mountTimer);clearTimeout(styleRetry);clearInterval(retryTimer);map.off('styledata',onStyle);map.off('load',onStyle);map.off('zoomend',onStyle);deactivateLayers();dock.remove();state.available=false};
 state.ready=false;
 return state;
}
