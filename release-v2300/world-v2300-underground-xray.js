const VERSION=5935;
const ROOT_ID='bp-underground-xray-v5935';
const STYLE_ID='bp-underground-xray-style-v5935';
const SOURCE_ID='bp-underground-xray-source-v5935';
const GLOW_ID='bp-underground-xray-glow-v5935';
const LINE_ID='bp-underground-xray-line-v5935';
const FN='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-public-underground-xray-v5935';
const EMPTY=new Uint8Array();
const CSS=`
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
function hexToBytes(v){const s=String(v||'').replace(/^\\\\x/,'');const out=new Uint8Array(Math.floor(s.length/2));for(let i=0;i<out.length;i++)out[i]=parseInt(s.slice(i*2,i*2+2),16);return out}
async function fetchStatus(){const r=await fetch(FN+'?status=1',{headers:{Accept:'application/json'},cache:'no-store'});if(!r.ok)throw new Error('Coverage status HTTP '+r.status);const j=await r.json();if(j?.complete!==true)throw new Error(j?.error||'Coverage status unavailable');return j}
export function initUndergroundXray(target){
 const map=target?.map||target,container=map?.getContainer?.();
 if(!map||!container||typeof fetch!=='function')return null;
 if(window.__BP_UNDERGROUND_XRAY_V5935__?.map===map)return window.__BP_UNDERGROUND_XRAY_V5935__;
 if(!document.getElementById(STYLE_ID)){const style=document.createElement('style');style.id=STYLE_ID;style.textContent=CSS;document.head.appendChild(style)}
 const state={version:VERSION,map,enabled:true,available:true,coverage:null,source:'Overture public mapped tunnels/underpasses',leakTelemetryConnected:false,lastUpdated:Date.now()};
 window.__BP_UNDERGROUND_XRAY_V5935__=state;
 const dock=document.createElement('section');dock.id=ROOT_ID;dock.setAttribute('aria-label','Underground X-ray map layer');
 dock.innerHTML='<div class="bpxr-row"><button class="bpxr-toggle" type="button" data-toggle aria-pressed="true">◈ UNDERGROUND X-RAY · ON</button><span class="bpxr-count" data-count>CHECKING COVERAGE</span></div><div class="bpxr-status" data-status>Loading source-backed tunnel and underpass coverage…</div><div class="bpxr-key"><span><i class="bpxr-swatch"></i> MAPPED PUBLIC TUNNEL / PASSAGE</span><span><i class="bpxr-swatch leak"></i> LEAK TELEMETRY NOT CONNECTED</span></div>';
 const $=s=>dock.querySelector(s),button=$('[data-toggle]'),status=$('[data-status]'),count=$('[data-count]');
 let disposed=false,mountTimer=null,tries=0,retryTimer=null,styleRetry=null;
 const opacityOriginal=new Map();
 function captureOpacity(id,prop){const k=id+'|'+prop;if(opacityOriginal.has(k))return;let value;try{value=map.getPaintProperty(id,prop)}catch(_){}opacityOriginal.set(k,{has:value!==undefined,value})}
 function setXrayOpacity(on){
  const ids=['gta-context-buildings','gta-city-buildings','gta-exact-building','gta-bp-buildings'];
  for(const id of ids){if(!map.getLayer(id))continue;const prop='fill-extrusion-opacity';captureOpacity(id,prop);try{map.setPaintProperty(id,prop,on?0.24:(opacityOriginal.get(id+'|'+prop).has?opacityOriginal.get(id+'|'+prop).value:null))}catch(_){}}
  const roofIds=['gta-city-roofs','gta-bp-roofs','gta-context-roofs','gta-exact-roof','gta-city-building-roof-caps'];
  for(const id of roofIds){if(!map.getLayer(id))continue;const type=map.getLayer(id).type,prop=type==='fill-extrusion'?'fill-extrusion-opacity':'fill-opacity';captureOpacity(id,prop);try{map.setPaintProperty(id,prop,on?0.32:(opacityOriginal.get(id+'|'+prop).has?opacityOriginal.get(id+'|'+prop).value:null))}catch(_){}}
 }
 function syncButton(){button.setAttribute('aria-pressed',String(state.enabled));button.textContent=state.enabled?'◈ UNDERGROUND X-RAY · ON':'◈ UNDERGROUND X-RAY · OFF'}
 function ensureLayers(){
  if(disposed||!map||typeof map.addSource!=='function')return false;
  try{
   if(!map.isStyleLoaded?.())return false;
   if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{type:'vector',tiles:[FN+'?z={z}&x={x}&y={y}&v=5935'],minzoom:10,maxzoom:17,attribution:'Overture Maps public mapped tunnel and underpass geometry; generalized public display'});
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
 button.addEventListener('click',()=>{
  state.enabled=!state.enabled;state.lastUpdated=Date.now();syncButton();
  if(!ensureLayers())setStatus('Map style is still loading. The X-ray layer will retry automatically.');
 });
 function setStatus(value,error=false){status.textContent=value;status.dataset.error=error?'true':'false'}
 async function refreshCoverage(){
  try{
   const d=await fetchStatus();if(disposed)return;
   state.coverage=d;state.lastUpdated=Date.now();state.leakTelemetryConnected=Number(d.leak_signal_records||0)>0;
   count.textContent=Number(d.mapped_tunnel_passage_records||0).toLocaleString()+' MAPPED';
   const pipe=Number(d.mapped_pipe_records||0),leaks=Number(d.leak_signal_records||0),jur=Number(d.jurisdictions||0);
   setStatus(Number(d.mapped_tunnel_passage_records||0).toLocaleString()+' source-backed tunnel / underpass records across '+jur+' jurisdictions. '+pipe.toLocaleString()+' pipe records; '+leaks.toLocaleString()+' leak signals currently materialized. Exact depth and active leaks are not inferred from tunnel lines.');
  }catch(e){count.textContent='STATUS UNAVAILABLE';setStatus('Map layer is linked, but coverage statistics are temporarily unavailable. Unverified pipes and leaks will not be drawn.',true);console.warn('BridgePoint underground X-ray coverage status',e)}
 }
 const onStyle=()=>{if(!ensureLayers()&&!styleRetry)styleRetry=setTimeout(()=>{styleRetry=null;ensureLayers()},350)};
 map.on('styledata',onStyle);map.on('load',onStyle);
 ensureLayers();
 [200,650,1400,2600].forEach(ms=>setTimeout(()=>{if(!disposed)ensureLayers()},ms));
 retryTimer=setInterval(()=>{if(disposed){clearInterval(retryTimer);return}if(!map.getLayer(LINE_ID))ensureLayers()},2500);
 void refreshCoverage();
 mount();
 state.open=()=>{state.enabled=true;syncButton();ensureLayers();return state};
 state.close=()=>{state.enabled=false;syncButton();ensureLayers();return state};
 state.toggle=()=>{button.click();return state};
 state.destroy=()=>{disposed=true;clearTimeout(mountTimer);clearTimeout(styleRetry);clearInterval(retryTimer);map.off('styledata',onStyle);map.off('load',onStyle);try{map.setPaintProperty(GLOW_ID,'visibility','none');map.setLayoutProperty(LINE_ID,'visibility','none')}catch(_){}dock.remove();state.available=false};
 state.ready=!!map.getSource(SOURCE_ID);
 return state;
}
