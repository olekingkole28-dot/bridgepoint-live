(()=>{
'use strict';
if(window.__bpRichWorldFusionV2223Loaded)return;
window.__bpRichWorldFusionV2223Loaded=true;
const VERSION=2223;
const MOBILE=innerWidth<=900||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const DM=Number(navigator.deviceMemory||4),CORES=Number(navigator.hardwareConcurrency||4);
const TIER=(DM<=3||CORES<=4)?'LOW':((DM>=8&&CORES>=8)?'HIGH':'MID');
const RELIEF_SOURCE='bp2223-usgs-3dep',RELIEF_LAYER='bp2223-usgs-3dep-relief',EXACT_MATERIAL='bp2223-exact-building-material';
const USGS_WMS='https://elevation.nationalmap.gov/arcgis/services/3DEPElevation/ImageServer/WMSServer?FORMAT=image/png32&TRANSPARENT=TRUE&VERSION=1.3.0&SERVICE=WMS&REQUEST=GetMap&LAYERS=3DEPElevation%3AHillshade%20Multidirectional&STYLES=&CRS=EPSG%3A3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}';
const CFG=TIER==='LOW'?{reliefMin:12.6,reliefOpacity:.16,contextOpacity:.34,restore:190}:TIER==='HIGH'?{reliefMin:10.2,reliefOpacity:.24,contextOpacity:.42,restore:80}:{reliefMin:11.2,reliefOpacity:.20,contextOpacity:.38,restore:120};
let state=null,map=null,bound=false,restoreTimer=0,exactCount=0,exactRoofCount=0,reliefSeen=false,lastStatus='';
const has=id=>{try{return !!map?.getLayer?.(id)}catch(_){return false}};
const vis=(id,on)=>{try{if(has(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}};
const paint=(id,k,v)=>{try{if(has(id))map.setPaintProperty(id,k,v)}catch(_){}};
const move=(id,before)=>{try{if(has(id))map.moveLayer(id,before&&has(before)?before:undefined)}catch(_){}};
const range=(id,a,b=22)=>{try{if(has(id))map.setLayerZoomRange(id,a,b)}catch(_){}};
function firstOverlay(){for(const id of ['bp2220-water','bp2220-landcover','bp2220-major-road-casing','labels','bp97-building'])if(has(id))return id;return undefined}
function installRelief(){
 if(!map)return;
 try{if(!map.getSource(RELIEF_SOURCE))map.addSource(RELIEF_SOURCE,{type:'raster',tiles:[USGS_WMS],tileSize:256,minzoom:8,maxzoom:19,bounds:[-125,24,-66,50],attribution:'USGS 3D Elevation Program (3DEP)'})}catch(e){console.warn('BP2223 3DEP source',e)}
 try{if(!has(RELIEF_LAYER))map.addLayer({id:RELIEF_LAYER,type:'raster',source:RELIEF_SOURCE,minzoom:CFG.reliefMin,maxzoom:20,paint:{'raster-opacity':['interpolate',['linear'],['zoom'],CFG.reliefMin,0,CFG.reliefMin+.45,CFG.reliefOpacity,17,Math.min(.28,CFG.reliefOpacity+.035)],'raster-saturation':-1,'raster-contrast':.28,'raster-brightness-min':.08,'raster-brightness-max':.92,'raster-resampling':'linear','raster-fade-duration':0}},firstOverlay())}catch(e){console.warn('BP2223 3DEP layer',e)}
}
function installExactMaterial(){
 if(!map?.getSource?.('bp97-buildings'))return;
 try{if(!has(EXACT_MATERIAL))map.addLayer({id:EXACT_MATERIAL,type:'fill-extrusion',source:'bp97-buildings',minzoom:12,paint:{
  'fill-extrusion-color':['match',['get','height_truth'],'SOURCE_BACKED','#aab7bd','FLOOR_DERIVED_VISUAL','#98a7af','#87939a'],
  'fill-extrusion-height':['max',3,['to-number',['coalesce',['get','render_height_m'],8.5],8.5]],
  'fill-extrusion-base':['max',0,['to-number',['coalesce',['get','base_height_m'],0],0]],
  'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],12,.66,14,.82,17,.9,20,.94],
  'fill-extrusion-vertical-gradient':true
 }},has('bp2221-exact-building-outline')?'bp2221-exact-building-outline':(has('labels')?'labels':undefined))}catch(e){console.warn('BP2223 exact material',e)}
}
function uncoverImagery(){
 vis('bp2220-ground',false);vis('sat',true);vis('street',false);vis('bp2220-street-fallback',false);
 paint('sat','raster-opacity',['interpolate',['linear'],['zoom'],2,.8,8,.9,12,.96,16,.985,20,1]);
 paint('sat','raster-saturation',-.03);paint('sat','raster-contrast',.07);paint('sat','raster-fade-duration',0);
 if(has('hillshade')){vis('hillshade',true);paint('hillshade','hillshade-exaggeration',TIER==='LOW'?.22:.3);paint('hillshade','hillshade-illumination-anchor','map')}
}
function exactFeatures(){if(!map?.getSource?.('bp97-buildings'))return 0;try{const rows=map.querySourceFeatures('bp97-buildings')||[],seen=new Set();for(const f of rows){const k=String(f.id??f.properties?.building_id??JSON.stringify(f.geometry?.coordinates?.[0]?.[0]||''));if(k)seen.add(k)}return seen.size}catch(_){return 0}}
function roofFeatures(){try{return map?.getSource?.('bp2221-exact-roofs')?(map.querySourceFeatures('bp2221-exact-roofs')||[]).length:0}catch(_){return 0}}
function buildingAuthority(){
 installExactMaterial();exactCount=exactFeatures();exactRoofCount=roofFeatures();
 if(has('bp2221-building-body')){vis('bp2221-building-body',true);paint('bp2221-building-body','fill-extrusion-opacity',exactCount>0?CFG.contextOpacity*.5:CFG.contextOpacity)}
 if(has('bp2221-building-roof')){vis('bp2221-building-roof',true);paint('bp2221-building-roof','fill-extrusion-opacity',exactCount>0?.22:.46)}
 vis('bp2221-building-outline',true);
 // Keep the original BridgePoint intelligence layer underneath for click/hit behavior, but make the physical material the visible body.
 if(has('bp97-building')){vis('bp97-building',true);range('bp97-building',12);paint('bp97-building','fill-extrusion-opacity',.055)}
 vis(EXACT_MATERIAL,true);
 for(const id of ['bp2221-exact-building-outline','bp2221-exact-roof','bp97-floorbands'])vis(id,true);
 move('bp97-building',EXACT_MATERIAL);move(EXACT_MATERIAL,'bp2221-exact-building-outline');move('bp2221-exact-building-outline','bp2221-exact-roof');move('bp2221-exact-roof','bp2221-parcel-halo');
}
function boundaryAuthority(){for(const id of ['bp2221-parcel-halo','bp2221-parcel-line','bp2221-parcel-est-line'])vis(id,true);vis('bp97-exact-rise',false);vis('bp97-est-fill',false);move('bp2221-parcel-halo','labels');move('bp2221-parcel-line','labels');move('bp2221-parcel-est-line','labels')}
function treesAndWorld(){for(const id of ['bp2162-tree-canopy','bp2162-parks','bp2174-tree-shadow','bp2174-tree-crown','bp2162-tree-points'])vis(id,true);for(const id of ['bp2220-major-road-casing','bp2220-major-road','bp2220-local-road-casing','bp2220-local-road','bp2220-waterway','bp2220-rail'])vis(id,true);paint('bp2220-major-road-casing','line-opacity',['interpolate',['linear'],['zoom'],7,.18,13,.36,18,.55]);paint('bp2220-major-road','line-opacity',['interpolate',['linear'],['zoom'],7,.34,13,.58,18,.78]);paint('bp2220-local-road-casing','line-opacity',['interpolate',['linear'],['zoom'],11,.12,15,.28,19,.48]);paint('bp2220-local-road','line-opacity',['interpolate',['linear'],['zoom'],11,.28,15,.5,19,.72])}
function camera(){try{if(map.getProjection?.()?.type!=='globe')map.setProjection?.({type:'globe'});map.setRenderWorldCopies?.(false);if(Number(map.getMaxPitch?.()||0)<76)map.setMaxPitch?.(TIER==='LOW'?74:TIER==='HIGH'?82:78)}catch(_){}}
function status(){const e=document.getElementById('mapStatus');if(!e)return;const z=Number(map?.getZoom?.()||0);const s=z>=12?`BridgePoint world · ${exactCount.toLocaleString()} source-backed 3D buildings in loaded detail · roofs + parcel truth · satellite + 3DEP relief`:'BridgePoint world · satellite terrain · zoom in for BridgePoint building and parcel detail';if(s!==lastStatus){lastStatus=s;e.textContent=s}}
function enforce(){installRelief();uncoverImagery();camera();buildingAuthority();boundaryAuthority();treesAndWorld();status();map?.triggerRepaint?.()}
function motionStart(){clearTimeout(restoreTimer);if(TIER!=='HIGH')vis(RELIEF_LAYER,false);for(const id of ['bp2221-exact-roof','bp2221-exact-building-outline','bp97-floorbands','bp2174-tree-crown','bp2174-tree-shadow'])vis(id,false)}
function motionEnd(){clearTimeout(restoreTimer);restoreTimer=setTimeout(()=>{vis(RELIEF_LAYER,true);for(const id of ['bp2221-exact-roof','bp2221-exact-building-outline','bp97-floorbands','bp2174-tree-crown','bp2174-tree-shadow'])vis(id,true);enforce()},CFG.restore)}
function bind(){
 state=window.__bp97MapState;map=state?.map;if(!state?.ready||!map){setTimeout(bind,100);return}if(bound)return;bound=true;
 if(state.layers){state.layers.buildings=true;state.layers.boundaries=true;state.layers.radar=false}state.terrain=true;
 enforce();
 map.on('sourcedata',e=>{if(e?.sourceId==='bp97-buildings'||e?.sourceId==='bp2221-exact-roofs'){clearTimeout(restoreTimer);restoreTimer=setTimeout(()=>{buildingAuthority();status()},70)}if(e?.sourceId===RELIEF_SOURCE&&e.isSourceLoaded){reliefSeen=true;status()}});
 map.on('zoomend',enforce);
 for(const ev of ['movestart','zoomstart','rotatestart','pitchstart'])map.on(ev,motionStart);
 for(const ev of ['moveend','zoomend','rotateend','pitchend'])map.on(ev,motionEnd);
 for(const ms of [180,700,1800,3800])setTimeout(enforce,ms);
 window.__bpRichWorldFusionV2223={version:VERSION,mode:'BRIDGEPOINT_FIRST_3D_3DEP_SATELLITE_FUSION',bridgePointGeometryPrimary:true,neutralPhysicalBuildingMaterial:true,intelligenceLayerRetainedForInteraction:true,vectorTilesContinuityOnly:true,satelliteGround:true,usgs3depRelief:true,usgs3depSource:'USGS 3D Elevation Program 1m where available',terrainMeshFallback:'Terrarium raster-dem',exactRoofs:true,parcelTruth:true,globe:true,gameCamera:true,secondaryWebGL:false,continuousAnimation:false,deviceTier:TIER,getState:()=>({version:VERSION,tier:TIER,zoom:map?.getZoom?.()||0,exactCount,exactRoofCount,reliefSeen,reliefVisible:has(RELIEF_LAYER)?(map.getLayoutProperty(RELIEF_LAYER,'visibility')||'visible'):'missing',satelliteVisible:has('sat')?(map.getLayoutProperty('sat','visibility')||'visible'):'missing',opaqueGroundHidden:has('bp2220-ground')?map.getLayoutProperty('bp2220-ground','visibility')==='none':true})};
 console.info('BridgePoint V2223 rich world fusion ready',TIER,CFG);
}
bind();
})();
