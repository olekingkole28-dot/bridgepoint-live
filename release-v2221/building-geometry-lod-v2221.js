(()=>{
'use strict';
if(window.__bpBuildingGeometryLOD2221Loaded)return;
window.__bpBuildingGeometryLOD2221Loaded=true;
const VERSION=2221,EMPTY={type:'FeatureCollection',features:[]};
const MOBILE=innerWidth<=900||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const DM=Number(navigator.deviceMemory||4),CORES=Number(navigator.hardwareConcurrency||4);
const TIER=(DM<=3||CORES<=4)?'LOW':((DM>=8&&CORES>=8)?'HIGH':'MID');
const CFG=TIER==='LOW'?{body:11.4,roof:13.6,outline:13.2,exact:13.4,parcel:13.6,restore:150}:TIER==='HIGH'?{body:9.7,roof:12.2,outline:11.7,exact:12.5,parcel:12.5,restore:80}:{body:10.4,roof:12.8,outline:12.3,exact:12.8,parcel:12.9,restore:105};
const DIRECT='https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf',OWN='bp2221-building-tiles',EXACT_ROOF='bp2221-exact-roofs';
let map=null,state=null,sourceId=null,bound=false,roofTimer=0,restoreTimer=0,exactRoofCount=0;
const H=['max',4,['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],['*',['coalesce',['to-number',['get','levels']],2],3],9]];
const B=['max',0,['coalesce',['to-number',['get','render_min_height']],['to-number',['get','min_height']],0]];
const RH=['max',.28,['coalesce',['to-number',['get','roof_height']],['to-number',['get','roof:height']],['*',['coalesce',['to-number',['get','roof_levels']],0],2.4],.34]];
const TOP=['+',H,RH];
function has(id){try{return !!map?.getLayer(id)}catch(_){return false}}
function vis(id,on){try{if(has(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}}
function add(layer,before){try{if(!has(layer.id))map.addLayer(layer,before&&has(before)?before:undefined)}catch(e){console.warn('BP2221 layer',layer.id,e)}}
function beforeExact(){return has('bp97-building')?'bp97-building':(has('labels')?'labels':undefined)}
function beforeLabels(){return has('labels')?'labels':undefined}
function chooseSource(){
 if(map.getSource('bp2220-ofm-direct'))return 'bp2220-ofm-direct';
 if(map.getSource('bp2162-openmaptiles'))return 'bp2162-openmaptiles';
 if(!map.getSource(OWN))try{map.addSource(OWN,{type:'vector',tiles:[DIRECT],minzoom:0,maxzoom:14,attribution:'OpenFreeMap © OpenMapTiles · Data © OpenStreetMap contributors'})}catch(e){console.warn('BP2221 source',e)}
 return OWN;
}
function installTiledGeometry(){
 sourceId=chooseSource(); if(!sourceId)return;
 const first=beforeExact();
 add({id:'bp2221-building-body',type:'fill-extrusion',source:sourceId,'source-layer':'building',minzoom:CFG.body,paint:{'fill-extrusion-color':['interpolate',['linear'],H,0,'#3f4d56',18,'#52636e',55,'#687d89',120,'#798f9a',260,'#91a4ad'],'fill-extrusion-height':H,'fill-extrusion-base':B,'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],CFG.body,.28,12,.48,14,.68,16,.79,19,.86],'fill-extrusion-vertical-gradient':true}},first);
 add({id:'bp2221-building-roof',type:'fill-extrusion',source:sourceId,'source-layer':'building',minzoom:CFG.roof,paint:{'fill-extrusion-base':H,'fill-extrusion-height':TOP,'fill-extrusion-color':['match',['get','roof_material'],'metal','#a9bcc5','tile','#9aa8aa','slate','#788995','concrete','#a2a9aa','#b8c7cc'],'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],CFG.roof,.38,15,.58,18,.72],'fill-extrusion-vertical-gradient':true}},first);
 add({id:'bp2221-building-outline',type:'line',source:sourceId,'source-layer':'building',minzoom:CFG.outline,paint:{'line-color':'#b9e9f5','line-width':['interpolate',['linear'],['zoom'],CFG.outline,.22,15,.48,18,.82,21,1.2],'line-opacity':['interpolate',['linear'],['zoom'],CFG.outline,.18,15,.34,19,.52]}},first);
 // V2221 replaces the duplicate V2220 building mass while reusing its direct vector source.
 vis('bp2220-buildings',false);
}
function roofCap(shape,material,raw){
 const n=Number(raw);if(Number.isFinite(n)&&n>0)return Math.max(.18,Math.min(4,n));
 const s=String(shape||'').toLowerCase();
 if(/dome|onion/.test(s))return 1.25;if(/pyramid/.test(s))return 1.05;if(/gambrel|mansard/.test(s))return .95;if(/gabled|gable/.test(s))return .82;if(/hipped|hip/.test(s))return .7;if(/shed|skillion/.test(s))return .42;if(/flat/.test(s))return .22;
 return String(material||'').length?.34:.3;
}
function installExactLayers(){
 if(!map.getSource(EXACT_ROOF))try{map.addSource(EXACT_ROOF,{type:'geojson',data:EMPTY})}catch(_){}
 if(map.getSource('bp97-buildings')){
  add({id:'bp2221-exact-building-outline',type:'line',source:'bp97-buildings',minzoom:CFG.exact,paint:{'line-color':'#e5fbff','line-width':['interpolate',['linear'],['zoom'],CFG.exact,.45,16,.9,19,1.45,21,1.9],'line-opacity':.82}},beforeLabels());
 }
 add({id:'bp2221-exact-roof',type:'fill-extrusion',source:EXACT_ROOF,minzoom:CFG.exact,paint:{'fill-extrusion-base':['get','roof_base_m'],'fill-extrusion-height':['get','roof_top_m'],'fill-extrusion-color':['match',['get','roof_shape'],'flat','#d4e9ee','gabled','#b4dce7','hipped','#a9cedd','pyramidal','#b8c6dc','dome','#d8c9d9','#bed7df'],'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],CFG.exact,.45,16,.68,19,.82],'fill-extrusion-vertical-gradient':true}},beforeLabels());
}
function syncExactRoofs(){
 clearTimeout(roofTimer);roofTimer=setTimeout(()=>{
  if(!map?.getSource?.('bp97-buildings')||!map.getSource(EXACT_ROOF))return;
  let rows=[];try{rows=map.querySourceFeatures('bp97-buildings')||[]}catch(_){return}
  const seen=new Set(),features=[];
  for(const f of rows){const p=f.properties||{},g=f.geometry;if(!g||!['Polygon','MultiPolygon'].includes(g.type))continue;const id=String(p.building_id||f.id||JSON.stringify(g.coordinates?.[0]?.[0]||g.coordinates?.[0]||'')).slice(0,240);if(seen.has(id))continue;seen.add(id);const base=Math.max(2,Number(p.render_height_m||p.render_height||p.height||8.5)),shape=String(p.roof_shape||'').toLowerCase(),mat=String(p.roof_material||'').toLowerCase(),cap=roofCap(shape,mat,p.roof_height_m);features.push({type:'Feature',id:id||undefined,geometry:g,properties:{building_id:id,roof_shape:shape,roof_material:mat,roof_base_m:base,roof_top_m:base+cap,roof_cap_m:cap}})}
  exactRoofCount=features.length;try{map.getSource(EXACT_ROOF).setData({type:'FeatureCollection',features})}catch(_){ }
 },90);
}
function enforceExactTruth(){
 // Keep BridgePoint's existing colored exact building extrusion. Never overwrite its color expression.
 try{if(has('bp97-building')){map.setLayerZoomRange('bp97-building',12.5,22);map.setPaintProperty('bp97-building','fill-extrusion-opacity',.88);vis('bp97-building',true)}}catch(_){}
 try{if(has('bp97-floorbands'))map.setLayerZoomRange('bp97-floorbands',TIER==='LOW'?17:16.2,22)}catch(_){}
 for(const id of ['bp97-exact-halo','bp97-exact-glow','bp97-exact-core'])try{if(has(id)){map.setLayerZoomRange(id,CFG.parcel,22);vis(id,true)}}catch(_){}
 try{if(has('bp97-est-line')){map.setLayerZoomRange('bp97-est-line',Math.max(14,CFG.parcel+.5),22);vis('bp97-est-line',true)}}catch(_){}
 // Filled parcel fabric stays off on phones; line truth is what scales cleanly.
 if(MOBILE){vis('bp97-exact-rise',false);vis('bp97-est-fill',false)}
}
const DETAIL=['bp2221-building-roof','bp2221-building-outline','bp2221-exact-building-outline','bp2221-exact-roof','bp97-floorbands','bp97-exact-halo','bp97-exact-glow'];
function motionStart(){clearTimeout(restoreTimer);for(const id of DETAIL)vis(id,false);try{if(has('bp2221-building-body'))map.setPaintProperty('bp2221-building-body','fill-extrusion-opacity',TIER==='LOW'?.4:.55)}catch(_){} }
function motionEnd(){clearTimeout(restoreTimer);restoreTimer=setTimeout(()=>{for(const id of DETAIL)vis(id,true);installTiledGeometry();installExactLayers();enforceExactTruth();syncExactRoofs();try{if(has('bp2221-building-body'))map.setPaintProperty('bp2221-building-body','fill-extrusion-opacity',['interpolate',['linear'],['zoom'],CFG.body,.28,12,.48,14,.68,16,.79,19,.86])}catch(_){}map?.triggerRepaint?.()},CFG.restore)}
function install(){installTiledGeometry();installExactLayers();enforceExactTruth();syncExactRoofs()}
function bind(){
 state=window.__bp97MapState;map=state?.map;if(!state?.ready||!map){setTimeout(bind,100);return}if(bound)return;bound=true;
 install();
 map.on('styledata',()=>setTimeout(install,0));
 map.on('sourcedata',e=>{if(e?.sourceId==='bp97-buildings')syncExactRoofs()});
 for(const ev of ['movestart','zoomstart','rotatestart','pitchstart'])map.on(ev,motionStart);
 for(const ev of ['moveend','zoomend','rotateend','pitchend'])map.on(ev,motionEnd);
 // Context-tile click: jump straight to detail zoom; exact BridgePoint geometry then overlays without a cinematic fly.
 map.on('click','bp2221-building-body',e=>{try{if(map.getZoom()<12.6&&e.lngLat)map.jumpTo({center:e.lngLat,zoom:13.2,pitch:Math.min(42,map.getPitch?.()||38),bearing:map.getBearing?.()||0})}catch(_){}});
 window.__bpBuildingGeometryLOD2221={version:VERSION,architecture:'TILED_LOD_PLUS_EXACT_VISIBLE_OVERLAY',deviceTier:TIER,thresholds:{...CFG},tiledContext:true,vectorTileMaxZoom:14,overscaledCityTiles:true,buildingBodies:true,roofCaps:true,buildingFootprintOutlines:true,exactBridgePointOverlay:true,exactRoofMetadataOverlay:true,parcelBoundaryLines:true,filledParcelFabricOnMobile:false,preservesIntelligenceColor:true,secondaryWebGL:false,continuousAnimation:false,getState:()=>({version:VERSION,tier:TIER,sourceId,exactRoofCount,zoom:map?.getZoom?.()||0})};
 console.info('BridgePoint V2221 tiled building LOD ready',TIER,CFG);
}
bind();
})();
