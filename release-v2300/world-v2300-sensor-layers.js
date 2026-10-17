const ROOT='bp-sensor-layers-v5937',CSS_ID=ROOT+'-css';
const NIGHT_SRC='bp-nightlights-src-v5937',NIGHT_LAYER='bp-nightlights-v5937';
const LAMP_SRC='bp-streetlights-src-v5937',POLES='bp-streetlight-poles-v5937',GLOW='bp-streetlight-glow-v5937',LAMPS='bp-streetlight-lamps-v5937';
const TRANSIT_SRC='bp-transit-src-v5937',TRANSIT='bp-transit-points-v5937';
const DEM='bp-gebco-depth-dem-v5936',BATHY_SRC='bp-gebco-colored-depth-src-v5937',BATHY='bp-gebco-colored-depth-v5937';
const NIGHT='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-nasa-nightlights-v5937';
const STREET='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-public-streetlight-tile-v5937';
const XRAY='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-public-underground-xray-v5935';
const GEBCO='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-gebco-terrain-v5936';
const GEBCO_IMG='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-gebco-depth-image-v5937';
const CSS=[
'#'+ROOT+'{display:grid;gap:5px;margin-top:6px;color:#eaffff;font:10px/1.35 system-ui,sans-serif}',
'#'+ROOT+' *{box-sizing:border-box}',
'#'+ROOT+' .r{display:grid;grid-template-columns:1fr 1fr;gap:5px}',
'#'+ROOT+' button{width:100%;min-width:0;min-height:30px;padding:7px;border-radius:8px;border:1px solid rgba(111,229,255,.4);background:linear-gradient(125deg,rgba(9,43,61,.97),rgba(26,31,68,.97));color:#efffff;text-align:left;font:900 9px/1.2 system-ui,sans-serif;cursor:pointer}',
'#'+ROOT+' button[aria-pressed=true]{border-color:#80ffff;background:linear-gradient(125deg,rgba(5,82,91,.98),rgba(34,34,93,.98))}',
'#'+ROOT+' .s{color:#9ed0dc;font-size:9px;line-height:1.4;overflow-wrap:anywhere}',
'@media(max-width:520px){#'+ROOT+' .r{gap:4px}#'+ROOT+' button{font-size:8px;padding:6px}}'
].join('\n');
const H={Accept:'application/json'};
function selected(){const v=window.__BP_WORLD_ACTIVITY_SLIDER_STATE_V5908__?.selectedAt,d=v?new Date(v):new Date();return Number.isNaN(d.getTime())?new Date():d}
export function initSensorLayers(target){
 const map=target?.map||target,container=map?.getContainer?.();
 if(!map||!container||typeof fetch!=='function')return null;
 if(window.__BP_SENSOR_LAYERS_V5937__?.map===map)return window.__BP_SENSOR_LAYERS_V5937__;
 if(!document.getElementById(CSS_ID)){const st=document.createElement('style');st.id=CSS_ID;st.textContent=CSS;document.head.appendChild(st)}
 const state={version:5937,map,lights:true,surface:true,selectedAt:selected().toISOString(),coverage:null,streetlights:null,lastUpdated:Date.now()};
 window.__BP_SENSOR_LAYERS_V5937__=state;
 const ui=document.createElement('section');ui.id=ROOT;ui.setAttribute('aria-label','BridgePoint global night lights, streetlights, underwater depth and transit controls');
 ui.innerHTML='<div class="r"><button data-light aria-pressed="true">✦ NASA NIGHT LIGHTS · AUTO ON</button><button data-surface aria-pressed="true">◈ OCEAN DEPTH + SEE-THROUGH · ON</button></div><div class="s" data-status>Loading NASA daily lights, mapped street lamps, public transit and GEBCO terrain…</div>';
 const $=s=>ui.querySelector(s),bl=$('[data-light]'),bs=$('[data-surface]'),status=$('[data-status]');let dead=false,tries=0,mountTimer=null,retry=null,statusTimer=null,lightTimer=null,selectedAt=selected();
 const paintDefaults=new Map();
 function url(at){const d=at instanceof Date?at:new Date(at),stamp=Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();return NIGHT+'?z={z}&x={x}&y={y}&at='+encodeURIComponent(stamp)+'&t='+Math.floor(Date.now()/300000)}
 function addSrc(id,s){if(!map.getSource(id))map.addSource(id,s)}
 function before(ids){for(const id of ids)if(map.getLayer(id))return id;return undefined}
 function paint(id,p,v,on){if(!map.getLayer(id))return;const k=id+'|'+p;if(!paintDefaults.has(k)){let q;try{q=map.getPaintProperty(id,p)}catch(_){}paintDefaults.set(k,{has:q!==undefined,value:q})}const o=paintDefaults.get(k);try{map.setPaintProperty(id,p,on?v:(o.has?o.value:null))}catch(_){}}
 function setSurface(on){
  state.surface=!!on;bs.setAttribute('aria-pressed',String(state.surface));bs.textContent=state.surface?'◈ OCEAN DEPTH + SEE-THROUGH · ON':'◈ OCEAN DEPTH + SEE-THROUGH · OFF';
  for(const [id,p,v] of [['gta-water','fill-opacity',.12],['gta-landuse','fill-opacity',.14],['gta-landcover','fill-opacity',.12],['gta-landcover-texture','fill-opacity',.10],['gta-nasa','raster-opacity',.14],['gta-usgs','raster-opacity',.14],['gta-oam','raster-opacity',.14]])paint(id,p,v,state.surface);
  const near=Number(map.getZoom?.()||0)>=10;
  for(const id of ['gta-context-buildings','gta-city-buildings','gta-exact-building','gta-bp-buildings'])paint(id,'fill-extrusion-opacity',near?.24:.42,state.surface);
  for(const id of ['gta-city-roofs','gta-bp-roofs','gta-context-roofs','gta-exact-roof','gta-city-building-roof-caps'])if(map.getLayer(id))paint(id,map.getLayer(id).type==='fill-extrusion'?'fill-extrusion-opacity':'fill-opacity',near?.2:.35,state.surface);
  try{if(map.getLayer(BATHY))map.setLayoutProperty(BATHY,'visibility',state.surface?'visible':'none')}catch(_){}
  try{if(state.surface){window.__BP_TERRAIN_SOURCE_OVERRIDE__=DEM;if(map.getZoom()>=2&&map.getSource(DEM))map.setTerrain({source:DEM,exaggeration:1})}else{if(window.__BP_TERRAIN_SOURCE_OVERRIDE__===DEM)delete window.__BP_TERRAIN_SOURCE_OVERRIDE__;if(map.getZoom()>=2&&map.getSource('dem'))map.setTerrain({source:'dem',exaggeration:1})}}catch(e){console.warn('BridgePoint depth terrain',e)}
 }
 function setLights(on){state.lights=!!on;bl.setAttribute('aria-pressed',String(state.lights));bl.textContent=state.lights?'✦ NASA NIGHT LIGHTS · AUTO ON':'✦ NASA NIGHT LIGHTS · OFF';try{if(map.getLayer(NIGHT_LAYER))map.setLayoutProperty(NIGHT_LAYER,'visibility',state.lights?'visible':'none')}catch(_){}document.querySelectorAll('[data-nightlights]').forEach(x=>{x.setAttribute('aria-pressed',String(state.lights));x.textContent=state.lights?'✦ LIGHTS AUTO · ON':'✦ LIGHTS AUTO · OFF'})}
 function refreshNight(at){selectedAt=at instanceof Date?new Date(at):new Date(at||Date.now());if(Number.isNaN(selectedAt.getTime()))selectedAt=new Date();state.selectedAt=selectedAt.toISOString();try{if(map.getLayer(NIGHT_LAYER))map.removeLayer(NIGHT_LAYER);if(map.getSource(NIGHT_SRC))map.removeSource(NIGHT_SRC);addSrc(NIGHT_SRC,{type:'raster',tiles:[url(selectedAt)],tileSize:256,minzoom:0,maxzoom:18,attribution:'NASA GIBS VIIRS SNPP daily Day/Night Band, solar-position night mask'});const b=before(['gta-context-buildings','gta-city-buildings','gta-bp-buildings','gta-water-label','gta-place-label']),l={id:NIGHT_LAYER,type:'raster',source:NIGHT_SRC,minzoom:0,maxzoom:18,layout:{visibility:state.lights?'visible':'none'},paint:{'raster-opacity':.92,'raster-saturation':.08,'raster-contrast':.1,'raster-fade-duration':0,'raster-resampling':'linear'}};if(b)map.addLayer(l,b);else map.addLayer(l);map.triggerRepaint?.()}catch(e){console.warn('BridgePoint NASA daily light layer',e)}}
 function ensure(){
  if(dead||!map.isStyleLoaded?.())return false;
  try{
   addSrc(NIGHT_SRC,{type:'raster',tiles:[url(selectedAt)],tileSize:256,minzoom:0,maxzoom:18,attribution:'NASA GIBS · VIIRS SNPP daily Day/Night Band, masked by local solar time'});
   addSrc(LAMP_SRC,{type:'vector',tiles:[STREET+'?z={z}&x={x}&y={y}&v=5937'],minzoom:14,maxzoom:22,attribution:'Source-backed public OSM street-lamp locations'});
   addSrc(TRANSIT_SRC,{type:'vector',tiles:[XRAY+'?z={z}&x={x}&y={y}&v=5936'],minzoom:3,maxzoom:17,attribution:'Generalized public transit access plus public-safe mapped tunnels'});
   addSrc(DEM,{type:'raster-dem',tiles:[GEBCO+'?z={z}&x={x}&y={y}&v=5936'],tileSize:256,minzoom:0,maxzoom:13,encoding:'terrarium',attribution:'GEBCO global gridded elevation and bathymetry'});
   addSrc(BATHY_SRC,{type:'raster',tiles:[GEBCO_IMG+'?z={z}&x={x}&y={y}&v=5937'],tileSize:256,minzoom:0,maxzoom:13,attribution:'GEBCO Latest global elevation and ocean-depth color layer'});
   const beforeBuildings=before(['gta-context-buildings','gta-city-buildings','gta-bp-buildings','gta-water-label','gta-place-label']);
   if(!map.getLayer(NIGHT_LAYER)){const l={id:NIGHT_LAYER,type:'raster',source:NIGHT_SRC,minzoom:0,maxzoom:18,layout:{visibility:state.lights?'visible':'none'},paint:{'raster-opacity':.92,'raster-saturation':.08,'raster-contrast':.1,'raster-fade-duration':0,'raster-resampling':'linear'}};if(beforeBuildings)map.addLayer(l,beforeBuildings);else map.addLayer(l)}
   if(!map.getLayer(BATHY)){const l={id:BATHY,type:'raster',source:BATHY_SRC,minzoom:0,maxzoom:13,layout:{visibility:state.surface?'visible':'none'},paint:{'raster-opacity':.52,'raster-fade-duration':0,'raster-resampling':'linear'}};if(beforeBuildings)map.addLayer(l,beforeBuildings);else map.addLayer(l)}
   const beforeLabels=before(['gta-place-label','gta-water-label']);
   if(!map.getLayer(POLES)){const l={id:POLES,type:'fill-extrusion',source:LAMP_SRC,'source-layer':'streetlight_poles',minzoom:16,paint:{'fill-extrusion-color':'#626e73','fill-extrusion-base':0,'fill-extrusion-height':['max',4,['to-number',['get','render_height_m'],6.5]],'fill-extrusion-opacity':.9,'fill-extrusion-vertical-gradient':true}};if(beforeLabels)map.addLayer(l,beforeLabels);else map.addLayer(l)}
   if(!map.getLayer(GLOW)){const l={id:GLOW,type:'circle',source:LAMP_SRC,'source-layer':'streetlight_lamps',minzoom:14,paint:{'circle-radius':['interpolate',['linear'],['zoom'],14,2,17,4,20,7,22,9],'circle-color':'#ffc75b','circle-opacity':.8,'circle-blur':.78}};if(beforeLabels)map.addLayer(l,beforeLabels);else map.addLayer(l)}
   if(!map.getLayer(LAMPS)){const l={id:LAMPS,type:'circle',source:LAMP_SRC,'source-layer':'streetlight_lamps',minzoom:14,paint:{'circle-radius':['interpolate',['linear'],['zoom'],14,.8,17,1.6,20,2.4,22,3.2],'circle-color':'#fff1b5','circle-opacity':.96,'circle-stroke-color':'#79643a','circle-stroke-width':.5}};if(beforeLabels)map.addLayer(l,beforeLabels);else map.addLayer(l)}
   if(!map.getLayer(TRANSIT)){const l={id:TRANSIT,type:'circle',source:TRANSIT_SRC,'source-layer':'transit',minzoom:3,maxzoom:17,paint:{'circle-radius':['interpolate',['linear'],['zoom'],3,1.2,7,2,11,3,15,4.4],'circle-color':['match',['get','feature_kind'],'subway_station','#73edff','railway_station','#8ff4c5','railway_halt','#8ff4c5','ferry_terminal','#b4c4ff','bus_station','#ffe09a','platform','#a0ffd0','#9fffd0'],'circle-opacity':.92,'circle-stroke-color':'#06202a','circle-stroke-width':.8}};if(beforeLabels)map.addLayer(l,beforeLabels);else map.addLayer(l)}
   setLights(state.lights);setSurface(state.surface);return true;
  }catch(e){console.warn('BridgePoint sensor layers retry',e);return false}
 }
 function mount(){if(dead)return;const slot=document.querySelector('#bpv-underground-slot')||document.querySelector('#bpv-world-activity-slot')||document.querySelector('#bpv-dock');if(slot){if(ui.parentElement!==slot)slot.appendChild(ui);ui.hidden=false;clearTimeout(mountTimer);return}ui.hidden=true;if(++tries<120)mountTimer=setTimeout(mount,150);else{ui.hidden=false;container.appendChild(ui)}}
 async function statusRefresh(){try{const r=await fetch(STREET+'?status=1',{headers:H,cache:'no-store'});if(r.ok)state.streetlights=await r.json()}catch(_){}try{const r=await fetch(XRAY+'?status=1',{headers:H,cache:'no-store'});if(r.ok)state.coverage=await r.json()}catch(_){}if(dead)return;const a=[];if(state.streetlights)a.push(Number(state.streetlights.materialized_streetlights||0).toLocaleString()+' materialized public lamps · '+Number(state.streetlights.jurisdictions||0)+' jurisdictions');if(state.coverage)a.push(Number(state.coverage.public_transit_access_records||0).toLocaleString()+' public transit points · '+Number(state.coverage.mapped_tunnel_passage_records||0).toLocaleString()+' mapped tunnels · '+Number(state.coverage.mapped_pipe_records||0)+' pipes · '+Number(state.coverage.leak_signal_records||0)+' leak signals');a.push('Night-light dimming can reflect clouds/observation conditions and is not an outage confirmation.');status.textContent=a.join(' · ');state.lastUpdated=Date.now()}
 const onLight=()=>setLights(!state.lights),onHistory=e=>{refreshNight(e?.detail?.selectedAt||selected());status.textContent='NASA daily night imagery follows the World History scrub. Dimming is a signal only, not proof of outage.'},onStyle=()=>{if(!ensure()&&!retry)retry=setTimeout(()=>{retry=null;ensure()},350)},onZoom=()=>setSurface(state.surface);
 bl.addEventListener('click',onLight);bs.addEventListener('click',()=>setSurface(!state.surface));window.addEventListener('bp:nightlights-toggle',onLight);window.addEventListener('bp:world-time-change',onHistory);map.on('styledata',onStyle);map.on('load',onStyle);map.on('zoomend',onZoom);
 ensure();[180,600,1400,2600].forEach(ms=>setTimeout(()=>{if(!dead)ensure()},ms));mount();void statusRefresh();statusTimer=setInterval(()=>{if(!dead)void statusRefresh()},180000);lightTimer=setInterval(()=>{if(!dead&&state.lights&&document.visibilityState!=='hidden')refreshNight(selectedAt)},300000);
 state.toggleLights=()=>{onLight();return state.lights};state.toggleSurface=()=>{setSurface(!state.surface);return state.surface};state.setTime=at=>{refreshNight(at);return state.selectedAt};state.snapshot=()=>({version:5937,lights:state.lights,surface:state.surface,selectedAt:state.selectedAt,streetlights:state.streetlights,coverage:state.coverage,lastUpdated:state.lastUpdated});
 state.destroy=()=>{dead=true;clearTimeout(mountTimer);clearTimeout(retry);clearInterval(statusTimer);clearInterval(lightTimer);map.off('styledata',onStyle);map.off('load',onStyle);map.off('zoomend',onZoom);window.removeEventListener('bp:nightlights-toggle',onLight);window.removeEventListener('bp:world-time-change',onHistory);ui.remove()};
 return state;
}
