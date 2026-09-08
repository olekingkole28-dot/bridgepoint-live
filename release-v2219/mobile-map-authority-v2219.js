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
function markManual(){manualUntil=Date.now()+4500;try{if(window.__bp97MapState)window.__bp97MapState.localTried=false}catch(_){} }
document.addEventListener('pointerdown',e=>{if(e.target?.closest?.('#bp97Local,#locateMe'))markManual()},true);
document.addEventListener('click',e=>{if(e.target?.closest?.('#bp97Local,#locateMe'))markManual()},true);

// Suppress the historical automatic geolocation before its 450ms startup timer can run.
function suppressAutoLocate(){try{const s=window.__bp97MapState;if(s&&!isManual())s.localTried=true}catch(_){} }
suppressAutoLocate();
for(const ms of [0,30,80,160,260,380,520,800,1200])setTimeout(suppressAutoLocate,ms);

function patchMapLibre(){
 const ML=window.maplibregl,Base=ML?.Map;
 if(!Base||window.__bp2219MapLibrePatched)return false;
 window.__bp2219MapLibrePatched=true;
 const P=Base.prototype;
 const fly=P.flyTo,ease=P.easeTo,terrain=P.setTerrain,maxPitch=P.setMaxPitch,layout=P.setLayoutProperty,projection=P.setProjection;
 if(typeof fly==='function')P.flyTo=function(o={},eventData){
   const z=Number.isFinite(+o.zoom)?+o.zoom:Number(this.getZoom?.()||0);
   const startupLocate=z>=15.5&&Number(o.duration||0)>=700;
   if(startupLocate&&!isManual())return this;
   try{projection?.call(this,{type:z>=6.5?'mercator':'globe'})}catch(_){}
   const n={...o,duration:0,pitch:Math.min(ANDROID?40:44,Number.isFinite(+o.pitch)?+o.pitch:Number(this.getPitch?.()||0))};
   try{return this.jumpTo?.(n,eventData)||this}catch(_){return fly.call(this,n,eventData)}
 };
 if(typeof ease==='function')P.easeTo=function(o={},eventData){
   const n={...o,duration:0,pitch:Math.min(ANDROID?42:46,Number.isFinite(+o.pitch)?+o.pitch:Number(this.getPitch?.()||0))};
   try{return this.jumpTo?.(n,eventData)||this}catch(_){return ease.call(this,n,eventData)}
 };
 if(typeof terrain==='function')P.setTerrain=function(){return terrain.call(this,null)};
 if(typeof maxPitch==='function')P.setMaxPitch=function(v){return maxPitch.call(this,Math.min(+v||48,ANDROID?46:50))};
 if(typeof layout==='function')P.setLayoutProperty=function(id,name,value,...rest){
   if(['sat','street','radar','hillshade'].includes(id)&&name==='visibility'&&value==='visible')value='none';
   return layout.call(this,id,name,value,...rest);
 };
 if(typeof projection==='function')P.setProjection=function(spec,...rest){
   try{if((typeof spec==='string'?spec:spec?.type)==='globe'&&Number(this.getZoom?.()||0)>=6.5)spec={type:'mercator'}}catch(_){}
   return projection.call(this,spec,...rest);
 };
 return true;
}
patchMapLibre();
for(const ms of [20,60,120,220,400])setTimeout(patchMapLibre,ms);

const heavyIds=['bp2206WaterShader','bp2209PostFX','bp2205FireGpu','bp2205WildfireGpu','bp2205WildfireFx','bp2201Precipitation','bp2200CloudDeck','bp2055FxCanvas','bp2081WeatherCanvas','bp2060AtmosphereCanvas'];
function removeHeavyCanvases(){for(const id of heavyIds){const el=document.getElementById(id);if(!el)continue;try{const g=el.getContext?.('webgl2')||el.getContext?.('webgl');g?.getExtension?.('WEBGL_lose_context')?.loseContext?.()}catch(_){}try{el.remove()}catch(_){}}}
function vis(id,on){try{if(map?.getLayer?.(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){} }
function applyStaticScene(){
 if(!map)return;
 try{map.setTerrain?.(null)}catch(_){}
 for(const id of ['sat','street','radar','hillshade'])vis(id,false);
 try{map.setProjection?.({type:map.getZoom()>=6.5?'mercator':'globe'});map.setRenderWorldCopies?.(false)}catch(_){}
 try{
   if(map.getZoom()>=6.5)map.setSky?.({'sky-color':'#071019','horizon-color':'#071019','fog-color':'#071019','sky-horizon-blend':0,'horizon-fog-blend':0,'fog-ground-blend':0,'atmosphere-blend':0});
   else map.setSky?.({'sky-color':'#14334a','horizon-color':'#0b2232','fog-color':'#0b2232','sky-horizon-blend':.14,'horizon-fog-blend':.04,'fog-ground-blend':0,'atmosphere-blend':['interpolate',['linear'],['zoom'],0,.6,5,.35,6.5,0]});
 }catch(_){}
 try{if(map.getLayer('bp2162-water')){map.setPaintProperty('bp2162-water','fill-pattern',null);map.setPaintProperty('bp2162-water','fill-color','#082536');map.setPaintProperty('bp2162-water','fill-opacity',.97)}}catch(_){}
 for(const [id,minz] of [['bp2174-context-buildings',9.9],['bp97-floorbands',15.6],['bp2174-tree-crown',15.5],['bp2174-tree-shadow',15.5],['bp2162-tree-points',15.5]])try{if(map.getLayer(id))map.setLayerZoomRange(id,minz,22)}catch(_){}
 removeHeavyCanvases();
}
const micro=['bp97-floorbands','bp2212-building-sheen','bp2212-building-rim','bp2208-rail-ties','bp2209-city-bloom','bp2209-ao-outline','bp2174-tree-crown','bp2174-tree-shadow','bp2162-tree-points','bp2174-context-buildings'];
function motionStart(){clearTimeout(restoreTimer);for(const id of micro){try{if(!map?.getLayer(id))continue;if(!hidden.has(id))hidden.set(id,map.getLayoutProperty(id,'visibility')||'visible');map.setLayoutProperty(id,'visibility','none')}catch(_){}}}
function motionEnd(){clearTimeout(restoreTimer);restoreTimer=setTimeout(()=>{applyStaticScene();for(const [id,v] of hidden)try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',v)}catch(_){}hidden.clear();map.triggerRepaint?.()},ANDROID?150:120)}
function bind(){
 state=window.__bp97MapState;map=state?.map;
 if(!state?.ready||!map){setTimeout(bind,100);return}
 if(window.__bp2219Bound)return;window.__bp2219Bound=true;
 state.localTried=true;state.weatherFx=false;state.terrain=false;if(state.layers)state.layers.radar=false;
 for(const ev of ['movestart','zoomstart','rotatestart','pitchstart'])map.on(ev,motionStart);
 for(const ev of ['moveend','zoomend','rotateend','pitchend'])map.on(ev,motionEnd);
 map.on('styledata',()=>setTimeout(applyStaticScene,0));
 map.on('zoomend',applyStaticScene);
 for(const ms of [0,100,300,700,1400,2800,5000])setTimeout(applyStaticScene,ms);
 window.__bpMobileAuthorityV2219={version:VERSION,production:true,satelliteBoot:false,autoLocate:false,animatedWater:false,whiteHorizon:false,secondaryGpu:false,localProjection:'MERCATOR',globalProjection:'GLOBE',cameraAnimationMs:0,contextBuildingsMinZoom:9.9};
 console.info('BridgePoint V2219 mobile authority ready');
}
bind();
})();
