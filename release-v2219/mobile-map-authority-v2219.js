(()=>{
'use strict';
if(window.__bpMobileAuthorityV2219Loaded)return;
window.__bpMobileAuthorityV2219Loaded=true;
const VERSION=2219;
const MOBILE=innerWidth<=900||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const ANDROID=/Android/i.test(navigator.userAgent);
if(!MOBILE)return;
let manualUntil=0,map=null,state=null,restoreTimer=0,hidden=new Map();
const isManual=()=>Date.now()<manualUntil;
const richAuthority=()=>!!window.__bpVisualFidelityV2222?.takesSceneAuthority;
function markManual(){manualUntil=Date.now()+4500;try{if(window.__bp97MapState)window.__bp97MapState.localTried=false}catch(_){} }
document.addEventListener('pointerdown',e=>{if(e.target?.closest?.('#bp97Local,#locateMe'))markManual()},true);
document.addEventListener('click',e=>{if(e.target?.closest?.('#bp97Local,#locateMe'))markManual()},true);

// Suppress only the historical startup geolocation. Do not suppress terrain, imagery,
// globe projection, or the high-pitch camera: those are part of the requested map.
function suppressAutoLocate(){try{const s=window.__bp97MapState;if(s&&!isManual())s.localTried=true}catch(_){} }
suppressAutoLocate();
for(const ms of [0,30,80,160,260,380,520,800,1200])setTimeout(suppressAutoLocate,ms);

function patchMapLibre(){
 const ML=window.maplibregl,Base=ML?.Map;
 if(!Base||window.__bp2219MapLibrePatched)return false;
 window.__bp2219MapLibrePatched=true;
 const P=Base.prototype;
 const fly=P.flyTo,ease=P.easeTo,maxPitch=P.setMaxPitch;
 // Keep camera transitions short on phones, but preserve the free high-pitch game camera.
 if(typeof fly==='function')P.flyTo=function(o={},eventData){
   const z=Number.isFinite(+o.zoom)?+o.zoom:Number(this.getZoom?.()||0);
   const startupLocate=z>=15.5&&Number(o.duration||0)>=700;
   if(startupLocate&&!isManual())return this;
   const n={...o,duration:Math.min(Number.isFinite(+o.duration)?+o.duration:180,ANDROID?180:240),pitch:Math.min(ANDROID?78:82,Number.isFinite(+o.pitch)?+o.pitch:Number(this.getPitch?.()||0))};
   try{return fly.call(this,n,eventData)}catch(_){return this.jumpTo?.(n,eventData)||this}
 };
 if(typeof ease==='function')P.easeTo=function(o={},eventData){
   const n={...o,duration:Math.min(Number.isFinite(+o.duration)?+o.duration:140,ANDROID?160:220),pitch:Math.min(ANDROID?78:82,Number.isFinite(+o.pitch)?+o.pitch:Number(this.getPitch?.()||0))};
   try{return ease.call(this,n,eventData)}catch(_){return this.jumpTo?.(n,eventData)||this}
 };
 if(typeof maxPitch==='function')P.setMaxPitch=function(v){return maxPitch.call(this,Math.min(+v||82,ANDROID?78:82))};
 return true;
}
patchMapLibre();
for(const ms of [20,60,120,220,400])setTimeout(patchMapLibre,ms);

const heavyIds=['bp2206WaterShader','bp2209PostFX','bp2205FireGpu','bp2205WildfireGpu','bp2205WildfireFx','bp2201Precipitation','bp2200CloudDeck','bp2055FxCanvas','bp2081WeatherCanvas','bp2060AtmosphereCanvas'];
function removeHeavyCanvases(){for(const id of heavyIds){const el=document.getElementById(id);if(!el)continue;try{const g=el.getContext?.('webgl2')||el.getContext?.('webgl');g?.getExtension?.('WEBGL_lose_context')?.loseContext?.()}catch(_){}try{el.remove()}catch(_){}}}
function vis(id,on){try{if(map?.getLayer?.(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){} }
function applyStaticScene(){
 if(!map||richAuthority())return;
 // Conservative fallback only. The richer V2222 authority owns the final visual scene.
 vis('radar',false);
 try{map.setRenderWorldCopies?.(false)}catch(_){}
 removeHeavyCanvases();
}
const micro=['bp97-floorbands','bp2212-building-sheen','bp2212-building-rim','bp2208-rail-ties','bp2209-city-bloom','bp2209-ao-outline','bp2174-tree-crown','bp2174-tree-shadow','bp2162-tree-points'];
function motionStart(){clearTimeout(restoreTimer);for(const id of micro){try{if(!map?.getLayer(id))continue;if(!hidden.has(id))hidden.set(id,map.getLayoutProperty(id,'visibility')||'visible');map.setLayoutProperty(id,'visibility','none')}catch(_){}}}
function motionEnd(){clearTimeout(restoreTimer);restoreTimer=setTimeout(()=>{applyStaticScene();for(const [id,v] of hidden)try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',v)}catch(_){}hidden.clear();map.triggerRepaint?.()},ANDROID?120:90)}
function bind(){
 state=window.__bp97MapState;map=state?.map;
 if(!state?.ready||!map){setTimeout(bind,100);return}
 if(window.__bp2219Bound)return;window.__bp2219Bound=true;
 state.localTried=true;state.weatherFx=false;if(state.layers)state.layers.radar=false;
 for(const ev of ['movestart','zoomstart','rotatestart','pitchstart'])map.on(ev,motionStart);
 for(const ev of ['moveend','zoomend','rotateend','pitchend'])map.on(ev,motionEnd);
 map.on('styledata',()=>setTimeout(applyStaticScene,0));
 map.on('zoomend',applyStaticScene);
 for(const ms of [0,100,300,700,1400,2800,5000])setTimeout(applyStaticScene,ms);
 window.__bpMobileAuthorityV2219={version:VERSION,production:true,satelliteAllowed:true,terrainAllowed:true,autoLocate:false,animatedWater:false,whiteHorizon:false,secondaryGpu:false,localProjection:'SCENE_AUTHORITY',globalProjection:'GLOBE',cameraAnimationMs:ANDROID?180:240,maxPitch:ANDROID?78:82,doesNotStripVisualFidelity:true};
 console.info('BridgePoint V2219 mobile stability guard ready');
}
bind();
})();
