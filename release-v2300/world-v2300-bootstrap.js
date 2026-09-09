import{VERSION}from'./world-v2300-config.js';
import{initWorld}from'./world-v2300-map.js';
import{initWeather}from'./world-v2300-weather.js';
import{initInspector}from'./world-v2300-inspector.js';

let booting=false,ready=false,world=null,weather=null,inspector=null;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitForMapShell(){for(let i=0;i<120;i++){if(window.maplibregl&&document.getElementById('liveMap'))return true;await sleep(50)}return false}
async function boot(){
  if(ready){try{world?.map?.resize?.()}catch(_){}return window.BridgePointWorldV2300}
  if(booting)return null;booting=true;
  try{
    if(!await waitForMapShell())throw new Error('MapLibre or map shell unavailable');
    world=initWorld();if(!world?.map)throw new Error('V2300 world map failed to initialize');
    if(world.map.loaded?.()){weather=initWeather(world.map);inspector=initInspector(world.map)}
    else await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('Map load timeout')),18000);world.map.once('load',()=>{clearTimeout(t);weather=initWeather(world.map);inspector=initInspector(world.map);resolve()})});
    ready=true;
    window.BridgePointWorldV2300={version:VERSION,authoritative:true,architecture:'MAPLIBRE_SINGLE_CANVAS_TILE_LOD_PLUS_LAZY_THREE_INSPECTOR',world,weather,inspector,get state(){return{version:VERSION,ready:true,mainCanvases:document.querySelectorAll('#liveMap canvas').length,inspectorOpen:!document.getElementById('bp2300Inspector')?.hidden,world:world?.state||null,weather:weather?.state||null}}};
    window.__bpAuthoritativeWorldRuntime=VERSION;
    console.info('BridgePoint V2300 authoritative world booted');
    return window.BridgePointWorldV2300;
  }catch(e){console.error('BridgePoint V2300 boot failed',e);const s=document.getElementById('mapStatus');if(s)s.textContent=`V2300 map start failed · ${e.message}`;return null}
  finally{booting=false}
}
window.addEventListener('bp:map-open',()=>{boot().then(()=>setTimeout(()=>world?.map?.resize?.(),80))});
window.addEventListener('resize',()=>ready&&world?.map?.resize?.(),{passive:true});
if(document.querySelector('[data-surface="map"]')?.classList.contains('active'))boot();
setTimeout(()=>{if(document.querySelector('[data-surface="map"]')?.classList.contains('active'))boot()},250);
window.BridgePointWorldV2300={version:VERSION,authoritative:true,boot,get state(){return{version:VERSION,ready,booting}}};
