import{VERSION}from'./world-v2300-config.js';
import{initWorld}from'./world-v2300-map.js';
import{initDetails}from'./world-v2300-details.js';
import{initWeather}from'./world-v2300-weather.js';
import{initPresentWeather}from'./world-v2300-present-weather.js';
import{initWeatherKey}from'./world-v2300-weather-key.js';
import{initWeatherPersistence}from'./world-v2300-weather-persistence.js';
import{initFlythrough}from'./world-v2300-flythrough.js';
import{initBuildingFidelity}from'./world-v2300-building-fidelity.js';
import{initRoadStyle}from'./world-v2300-road-style.js';
import{initBoundaryContinuity}from'./world-v2300-boundary-continuity.js';
import{initInspector}from'./world-v2300-inspector.js';

let booting=false,ready=false,world=null,details=null,weather=null,presentWeather=null,weatherKey=null,weatherPersistence=null,flythrough=null,buildingFidelity=null,roadStyle=null,boundaryContinuity=null,inspector=null,extensionsBound=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitForMapShell(){for(let i=0;i<120;i++){if(window.maplibregl&&document.getElementById('liveMap'))return true;await sleep(50)}return false}
function expose(){
  window.BridgePointWorldV2300={version:VERSION,authoritative:true,cleanReplacement:true,architecture:'MAPLIBRE_SINGLE_CANVAS_TILE_LOD_PLUS_SEMANTIC_DETAIL_PLUS_BOUNDED_WEATHER_PLUS_LAZY_THREE_INSPECTOR',boot,world,details,weather,presentWeather,weatherKey,weatherPersistence,flythrough,buildingFidelity,roadStyle,boundaryContinuity,inspector,get state(){return{version:VERSION,ready,booting,cleanReplacement:true,mainCanvases:document.querySelectorAll('#liveMap canvas').length,inspectorOpen:!document.getElementById('bp2300Inspector')?.hidden,world:world?.state||null,details:details?.state||null,weather:weather?.state||null,presentWeather:presentWeather?.state||null,weatherKey:weatherKey?.state||null,weatherPersistence:weatherPersistence?.state||null,flythrough:flythrough?.state||null,buildingFidelity:buildingFidelity?.state||null,roadStyle:roadStyle?.state||null,boundaryContinuity:boundaryContinuity?.state||null}}};
  window.__bpAuthoritativeWorldRuntime=VERSION;
  return window.BridgePointWorldV2300;
}
function bindExtensions(){
  if(extensionsBound||!world?.map)return;
  const attach=()=>{
    if(extensionsBound)return;
    let styleReady=false;try{styleReady=world.map.isStyleLoaded?.()===true||!!world.map.getSource?.('ofm')}catch(_){}
    if(!styleReady)return;
    extensionsBound=true;
    try{world.map.setGlyphs?.('https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf')}catch(e){console.warn('V2300 glyph source',e)}
    try{details=initDetails(world.map)}catch(e){console.warn('V2300 details init',e)}
    try{roadStyle=initRoadStyle(world.map)}catch(e){console.warn('V2300 road style init',e)}
    try{buildingFidelity=initBuildingFidelity(world.map)}catch(e){console.warn('V2300 building fidelity init',e)}
    try{boundaryContinuity=initBoundaryContinuity(world.map)}catch(e){console.warn('V2300 boundary continuity init',e)}
    try{inspector=initInspector(world.map)}catch(e){console.warn('V2300 inspector init',e)}
    try{weather=initWeather(world.map)}catch(e){console.warn('V2300 weather init',e)}
    try{weatherPersistence=initWeatherPersistence(world.map,weather)}catch(e){console.warn('V2300 weather persistence init',e)}
    try{presentWeather=initPresentWeather(world.map)}catch(e){console.warn('V2300 present weather init',e)}
    try{weatherKey=initWeatherKey(world.map)}catch(e){console.warn('V2300 weather key init',e)}
    try{flythrough=initFlythrough(world.map)}catch(e){console.warn('V2300 flythrough init',e)}
    expose();
  };
  world.map.on?.('styledata',attach);
  world.map.on?.('load',attach);
  for(const ms of [0,80,250,700,1600,3500,7000])setTimeout(attach,ms);
}
async function boot(){
  if(ready){try{world?.map?.resize?.()}catch(_){}return expose()}
  if(booting)return window.BridgePointWorldV2300;booting=true;expose();
  try{
    if(!await waitForMapShell())throw new Error('MapLibre or map shell unavailable');
    world=initWorld();if(!world?.map)throw new Error('V2300 world map failed to initialize');
    ready=true;booting=false;bindExtensions();expose();
    try{world.map.resize?.()}catch(_){}
    console.info('BridgePoint V2300 core world ready; public tiles continue streaming');
    return window.BridgePointWorldV2300;
  }catch(e){
    ready=false;booting=false;console.error('BridgePoint V2300 boot failed',e);const s=document.getElementById('mapStatus');if(s)s.textContent=`V2300 map start failed · ${e.message}`;return expose()
  }
}
window.addEventListener('bp:map-open',()=>{boot().then(()=>setTimeout(()=>world?.map?.resize?.(),80))});
window.addEventListener('resize',()=>ready&&world?.map?.resize?.(),{passive:true});
if(document.querySelector('[data-surface="map"]')?.classList.contains('active'))boot();
setTimeout(()=>{if(document.querySelector('[data-surface="map"]')?.classList.contains('active'))boot()},250);
expose();
