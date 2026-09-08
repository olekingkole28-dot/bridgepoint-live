(()=>{
'use strict';
if(window.__bpVisualFidelityV2222Loaded)return;
window.__bpVisualFidelityV2222Loaded=true;
const VERSION=2222,MOBILE=innerWidth<=900||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const ANDROID=/Android/i.test(navigator.userAgent),DM=Number(navigator.deviceMemory||4),CORES=Number(navigator.hardwareConcurrency||4);
const TIER=(DM<=3||CORES<=4)?'LOW':((DM>=8&&CORES>=8)?'HIGH':'MID');
const CFG=TIER==='LOW'?{terrain:1.05,restore:150,treeMin:15.0,parcelMin:13.5,roofMin:13.6,pitch:72}:TIER==='HIGH'?{terrain:1.35,restore:75,treeMin:13.0,parcelMin:12.4,roofMin:12.2,pitch:80}:{terrain:1.2,restore:105,treeMin:13.8,parcelMin:12.8,roofMin:12.8,pitch:76};
let map=null,state=null,bound=false,moving=false,restoreTimer=0,cityPitchDone=false,terrainOn=false;
const has=id=>{try{return !!map?.getLayer?.(id)}catch(_){return false}};
const vis=(id,on)=>{try{if(has(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}};
const paint=(id,k,v)=>{try{if(has(id))map.setPaintProperty(id,k,v)}catch(_){}};
const range=(id,a,b=22)=>{try{if(has(id))map.setLayerZoomRange(id,a,b)}catch(_){}};
function setSceneOwnership(){
 window.__bpVisualFidelityV2222={
  version:VERSION,
  takesSceneAuthority:true,
  enabled:true,
  mode:'IMAGERY_TERRAIN_GAME_WORLD',
  visualContract:'SATELLITE_GROUND_PLUS_3D_TERRAIN_PLUS_TILED_BUILDINGS_PLUS_EXACT_ROOFS_AND_PARCELS',
  sourceBackedImagery:true,
  terrain:true,
  globe:true,
  highPitchCamera:true,
  buildingLOD:true,
  roofs:true,
  parcelBoundaries:true,
  trees:true,
  secondaryWebGL:false,
  continuousAnimation:false,
  deviceTier:TIER,
  getState:()=>({version:VERSION,tier:TIER,zoom:map?.getZoom?.()||0,pitch:map?.getPitch?.()||0,terrainOn,sourceLoaded:{sat:sourceLoaded('sat'),dem:sourceLoaded('dem'),buildings:sourceLoaded('bp2220-ofm-direct')}})
 };
}
setSceneOwnership();
function sourceLoaded(id){try{return !!map?.isSourceLoaded?.(id)}catch(_){return false}}
function terrain(){
 if(!map)return;
 const z=Number(map.getZoom?.()||0),should=z>=7.2&&!!map.getSource?.('dem');
 try{
  if(should){map.setTerrain?.({source:'dem',exaggeration:CFG.terrain});terrainOn=true}
  else{map.setTerrain?.(null);terrainOn=false}
 }catch(_){terrainOn=false}
}
function baseImagery(){
 const z=Number(map.getZoom?.()||0);
 vis('sat',true);vis('street',false);vis('radar',false);vis('hillshade',z>=7.2);vis('labels',true);
 paint('sat','raster-opacity',['interpolate',['linear'],['zoom'],2,.78,7,.86,11,.92,15,.96,19,.98]);
 paint('sat','raster-saturation',-.05);paint('sat','raster-contrast',.08);paint('sat','raster-brightness-min',.03);paint('sat','raster-brightness-max',.93);
 paint('hillshade','hillshade-exaggeration',TIER==='LOW'?.46:TIER==='HIGH'?.72:.6);
 paint('hillshade','hillshade-shadow-color','#081119');paint('hillshade','hillshade-highlight-color','#c5e6ef');paint('hillshade','hillshade-accent-color','#546d73');
 paint('labels','raster-opacity',['interpolate',['linear'],['zoom'],2,.82,10,.72,15,.58,19,.48]);
}
function softenVectorGround(){
 // Keep vector ground as an instant fallback underneath imagery; never blank the map while imagery tiles arrive.
 paint('bp2220-water','fill-opacity',['interpolate',['linear'],['zoom'],2,.72,8,.52,12,.26,16,.16]);
 paint('bp2220-landcover','fill-opacity',['interpolate',['linear'],['zoom'],3,.42,8,.26,11,.12,14,.035,17,0]);
 paint('bp2220-landuse','fill-opacity',['interpolate',['linear'],['zoom'],7,.3,11,.17,14,.08,18,.035]);
 paint('bp2220-major-road-casing','line-opacity',['interpolate',['linear'],['zoom'],7,.35,11,.52,15,.7,19,.76]);
 paint('bp2220-major-road','line-opacity',['interpolate',['linear'],['zoom'],7,.62,11,.8,15,.92]);
 paint('bp2220-local-road-casing','line-opacity',['interpolate',['linear'],['zoom'],10.5,.2,14,.42,18,.62]);
 paint('bp2220-local-road','line-opacity',['interpolate',['linear'],['zoom'],10.5,.48,14,.72,18,.9]);
 for(const id of ['bp2220-state-boundary','bp2220-county-boundary','bp2220-major-road-casing','bp2220-major-road','bp2220-local-road-casing','bp2220-local-road','bp2220-waterway','bp2220-rail'])vis(id,true);
 vis('bp2220-street-fallback',false);
}
function buildings(){
 vis('bp2220-buildings',false);vis('bp2174-context-buildings',false);
 for(const id of ['bp2221-building-body','bp2221-building-roof','bp2221-building-outline','bp2221-exact-building-outline','bp2221-exact-roof','bp97-building'])vis(id,true);
 range('bp2221-building-roof',CFG.roofMin);range('bp2221-building-outline',Math.max(11.8,CFG.roofMin-.5));range('bp2221-exact-building-outline',CFG.parcelMin);range('bp2221-exact-roof',CFG.parcelMin);
 try{if(has('bp97-building')){range('bp97-building',12.2);paint('bp97-building','fill-extrusion-opacity',.9)}}catch(_){}
 try{if(has('bp97-floorbands')){range('bp97-floorbands',TIER==='LOW'?16.8:15.7);vis('bp97-floorbands',true)}}catch(_){}
}
function parcels(){
 range('bp2221-parcel-line',CFG.parcelMin);range('bp2221-parcel-halo',CFG.parcelMin);range('bp2221-parcel-est-line',Math.max(13.8,CFG.parcelMin+.45));
 vis('bp2221-parcel-line',true);vis('bp2221-parcel-halo',true);vis('bp2221-parcel-est-line',true);
 // Avoid the historical giant elevated parcel sheets; the clean line truth is the visual contract.
 vis('bp97-exact-rise',false);vis('bp97-est-fill',false);
}
function trees(){
 for(const id of ['bp2174-tree-crown','bp2174-tree-shadow','bp2162-tree-points']){range(id,CFG.treeMin);vis(id,true)}
 vis('bp2162-tree-canopy',true);vis('bp2162-parks',true);
}
function camera(){
 try{map.setProjection?.({type:'globe'});map.setRenderWorldCopies?.(false);map.setMaxPitch?.(CFG.pitch)}catch(_){}
 const z=Number(map.getZoom?.()||0),p=Number(map.getPitch?.()||0);
 if(!cityPitchDone&&z>=12.4&&p<55){cityPitchDone=true;try{map.easeTo?.({pitch:Math.min(CFG.pitch,66),bearing:map.getBearing?.()||-18,duration:ANDROID?140:180})}catch(_){}}
 try{map.setLight?.({anchor:'map',color:'#e8f3f7',intensity:TIER==='LOW'?.42:.5,position:[1.15,205,38]})}catch(_){}
 try{map.setSky?.({'sky-color':'#15384b','horizon-color':'#9bb8c2','fog-color':'#b6c6ca','sky-horizon-blend':.2,'horizon-fog-blend':.08,'fog-ground-blend':.04,'atmosphere-blend':['interpolate',['linear'],['zoom'],0,.62,5,.42,8,.14,12,0]})}catch(_){}
}
function status(){const e=document.getElementById('mapStatus');if(e&&!moving)e.textContent='BridgePoint world · imagery terrain · 3D buildings + roofs · parcel truth · adaptive LOD'}
function apply(){
 if(!map)return;setSceneOwnership();camera();baseImagery();terrain();softenVectorGround();buildings();parcels();trees();
 try{map.setFadeDuration?.(0)}catch(_){}
 status();map.triggerRepaint?.();
}
const MOVE_DETAIL=['bp2221-building-roof','bp2221-building-outline','bp2221-exact-building-outline','bp2221-exact-roof','bp97-floorbands','bp2221-parcel-halo','bp2174-tree-crown','bp2174-tree-shadow','bp2162-tree-points'];
function motionStart(){moving=true;clearTimeout(restoreTimer);for(const id of MOVE_DETAIL)vis(id,false);paint('hillshade','hillshade-exaggeration',TIER==='LOW'?.28:.4)}
function motionEnd(){moving=false;clearTimeout(restoreTimer);restoreTimer=setTimeout(()=>{apply();for(const id of MOVE_DETAIL)vis(id,true);map?.triggerRepaint?.()},CFG.restore)}
function bind(){
 state=window.__bp97MapState;map=state?.map;if(!state?.ready||!map){setTimeout(bind,100);return}if(bound)return;bound=true;
 if(state.layers){state.layers.buildings=true;state.layers.boundaries=true;state.layers.radar=false}state.terrain=true;
 apply();
 map.on('styledata',()=>setTimeout(apply,0));
 map.on('zoomend',()=>{cityPitchDone=Number(map.getZoom?.()||0)<11?false:cityPitchDone;apply()});
 for(const ev of ['movestart','zoomstart','rotatestart','pitchstart'])map.on(ev,motionStart);
 for(const ev of ['moveend','zoomend','rotateend','pitchend'])map.on(ev,motionEnd);
 for(const ms of [100,350,900,1800,3600])setTimeout(apply,ms);
 console.info('BridgePoint V2222 visual fidelity world ready',TIER,CFG);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
