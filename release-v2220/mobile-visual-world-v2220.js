(()=>{
'use strict';
if(window.__bpMobileVisualWorldV2220Loaded)return;
window.__bpMobileVisualWorldV2220Loaded=true;
const VERSION=2220;
const MOBILE=innerWidth<=900||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
if(!MOBILE)return;
const SOURCE='bp2220-ofm-direct';
const DIRECT='https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf';
const ATTR='OpenFreeMap © OpenMapTiles · Data © OpenStreetMap contributors';
let map=null,state=null,bound=false,fallbackTimer=0,restoreTimer=0;
const legacyWorld=['bp2162-land','bp2162-water','bp2162-tree-canopy','bp2162-parks','bp2162-state-boundary-halo','bp2162-state-boundary','bp2162-county-boundary','bp2162-river','bp2162-stream','bp2162-road-casing','bp2162-road-asphalt','bp2162-road-center','bp2162-bridge-glow','bp2162-bridge-deck','bp2162-rail','bp2162-tree-points','bp2174-context-buildings','bp2174-tree-crown','bp2174-tree-shadow','bp2174-asphalt-areas'];
const motionDetail=['bp2220-buildings','bp2220-local-road-casing','bp2220-local-road','bp2220-rail','bp97-floorbands'];
const richAuthority=()=>!!window.__bpVisualFidelityV2222?.takesSceneAuthority;
function has(id){try{return !!map?.getLayer(id)}catch(_){return false}}
function vis(id,on){try{if(has(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}}
function before(){for(const id of ['bp97-exact-rise','bp97-est-fill','bp97-building','labels'])if(has(id))return id;return undefined}
function add(layer,b){try{if(!has(layer.id))map.addLayer(layer,b&&has(b)?b:undefined)}catch(e){console.warn('BP2220 layer',layer.id,e)}}
function sourceReady(){try{return !!map?.isSourceLoaded?.(SOURCE)}catch(_){return false}}
function ensureSource(){
 try{if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'vector',tiles:[DIRECT],minzoom:0,maxzoom:14,attribution:ATTR})}catch(e){console.warn('BP2220 source',e)}
}
function installVectorWorld(){
 ensureSource();
 const first=before();
 add({id:'bp2220-ground',type:'background',paint:{'background-color':'#10191b'}},first);
 add({id:'bp2220-water',type:'fill',source:SOURCE,'source-layer':'water',paint:{'fill-color':'#082b3a','fill-opacity':1}},first);
 add({id:'bp2220-landcover',type:'fill',source:SOURCE,'source-layer':'landcover',minzoom:3,paint:{'fill-color':['match',['get','class'],'wood','#17372c','forest','#17372c','grass','#20372c','farmland','#302f28','ice','#dce9ef','#182324'],'fill-opacity':['interpolate',['linear'],['zoom'],3,.2,8,.42,13,.6,18,.72]}},first);
 add({id:'bp2220-landuse',type:'fill',source:SOURCE,'source-layer':'landuse',minzoom:7,filter:['in',['get','class'],['literal',['park','grass','cemetery','recreation_ground','school','hospital','residential','commercial','retail','industrial']]],paint:{'fill-color':['match',['get','class'],'park','#184936','grass','#1d4334','recreation_ground','#1d4c38','residential','#20272a','commercial','#2a292d','retail','#2c292f','industrial','#282d30','school','#273431','hospital','#313333','#24302d'],'fill-opacity':['interpolate',['linear'],['zoom'],7,.18,12,.42,17,.58]}},first);
 add({id:'bp2220-state-boundary',type:'line',source:SOURCE,'source-layer':'boundary',minzoom:2.5,filter:['==',['get','admin_level'],4],paint:{'line-color':'#8dddf4','line-width':['interpolate',['linear'],['zoom'],3,.45,7,1.0,12,1.45],'line-opacity':.72}},'labels');
 add({id:'bp2220-county-boundary',type:'line',source:SOURCE,'source-layer':'boundary',minzoom:6.5,filter:['==',['get','admin_level'],6],paint:{'line-color':'#5d7d88','line-width':['interpolate',['linear'],['zoom'],6.5,.3,11,.65,16,1.0],'line-opacity':.48,'line-dasharray':[3,2]}},'labels');
 add({id:'bp2220-major-road-casing',type:'line',source:SOURCE,'source-layer':'transportation',minzoom:7,filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#b9d7e0','line-width':['interpolate',['exponential',1.3],['zoom'],7,.55,8,1.0,12,2.8,16,9.5,19,19],'line-opacity':['interpolate',['linear'],['zoom'],7,.48,9,.64,13,.88]}},'labels');
 add({id:'bp2220-major-road',type:'line',source:SOURCE,'source-layer':'transportation',minzoom:7,filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['get','class'],'motorway','#25333a','trunk','#27343a','primary','#263036','#222a30'],'line-width':['interpolate',['exponential',1.3],['zoom'],7,.34,8,.66,12,2.15,16,7.8,19,16.2],'line-opacity':.98}},'labels');
 add({id:'bp2220-local-road-casing',type:'line',source:SOURCE,'source-layer':'transportation',minzoom:10.5,filter:['in',['get','class'],['literal',['tertiary','minor','service','track']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#8fa8b0','line-width':['interpolate',['exponential',1.35],['zoom'],10.5,.38,14,1.6,17,5.2,20,12],'line-opacity':.5}},'labels');
 add({id:'bp2220-local-road',type:'line',source:SOURCE,'source-layer':'transportation',minzoom:10.5,filter:['in',['get','class'],['literal',['tertiary','minor','service','track']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#182127','line-width':['interpolate',['exponential',1.35],['zoom'],10.5,.22,14,1.05,17,4.2,20,10.5],'line-opacity':.96}},'labels');
 add({id:'bp2220-waterway',type:'line',source:SOURCE,'source-layer':'waterway',minzoom:7,filter:['in',['get','class'],['literal',['river','canal','stream']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#2a8fc0','line-width':['interpolate',['linear'],['zoom'],7,.35,13,1.1,18,3.2],'line-opacity':.78}},'labels');
 add({id:'bp2220-rail',type:'line',source:SOURCE,'source-layer':'transportation',minzoom:11.5,filter:['in',['get','class'],['literal',['rail','transit']]],paint:{'line-color':'#7b8990','line-width':['interpolate',['linear'],['zoom'],11.5,.35,17,1.7,20,3],'line-opacity':.58,'line-dasharray':[2,2]}},'labels');
 const h=['max',4,['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],['*',['coalesce',['to-number',['get','levels']],2],3],9]];
 const b=['max',0,['coalesce',['to-number',['get','render_min_height']],['to-number',['get','min_height']],0]];
 add({id:'bp2220-buildings',type:'fill-extrusion',source:SOURCE,'source-layer':'building',minzoom:13,paint:{'fill-extrusion-color':['interpolate',['linear'],h,0,'#46545d',18,'#586b77',55,'#6e8390',120,'#7d93a0',260,'#94a7b0'],'fill-extrusion-height':h,'fill-extrusion-base':b,'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],13,.46,14,.64,16,.78,19,.86],'fill-extrusion-vertical-gradient':true}},'labels');
}
function styleWorld(){
 if(!map||richAuthority())return;
 for(const id of legacyWorld)vis(id,false);
 for(const id of ['sat','street','radar','hillshade'])vis(id,false);
 vis('bp97-exact-rise',false);vis('bp97-est-fill',false);
 try{for(const id of ['bp97-exact-halo','bp97-exact-glow','bp97-exact-core','bp97-est-line'])if(has(id))map.setLayerZoomRange(id,14.2,22)}catch(_){}
 try{if(has('bp97-building')){map.setLayerZoomRange('bp97-building',12.2,22);map.setPaintProperty('bp97-building','fill-extrusion-opacity',.82)}}catch(_){}
 try{if(has('bp97-floorbands'))map.setLayerZoomRange('bp97-floorbands',16.2,22)}catch(_){}
 try{if(has('labels')){map.setPaintProperty('labels','raster-opacity',.82);map.setLayoutProperty('labels','visibility','visible')}}catch(_){}
 try{map.setLight?.({anchor:'map',color:'#d9e8ee',intensity:.48,position:[1.25,210,42]})}catch(_){}
 try{
  const z=map.getZoom();
  map.setSky?.(z>=6.5?{'sky-color':'#081217','horizon-color':'#081217','fog-color':'#081217','sky-horizon-blend':0,'horizon-fog-blend':0,'fog-ground-blend':0,'atmosphere-blend':0}:{'sky-color':'#16384c','horizon-color':'#0c2634','fog-color':'#0c2634','sky-horizon-blend':.12,'horizon-fog-blend':.035,'fog-ground-blend':0,'atmosphere-blend':['interpolate',['linear'],['zoom'],0,.54,5,.28,6.5,0]});
 }catch(_){}
}
function ensureFallback(){
 if(richAuthority()){vis('bp2220-street-fallback',false);return}
 if(sourceReady()){vis('bp2220-street-fallback',false);return}
 try{
  if(!has('bp2220-street-fallback'))add({id:'bp2220-street-fallback',type:'raster',source:'street',paint:{'raster-opacity':.82,'raster-saturation':-.72,'raster-contrast':.18,'raster-brightness-min':.02,'raster-brightness-max':.52}},before());
  vis('bp2220-street-fallback',true);
 }catch(_){}
}
function hideMotionDetail(){clearTimeout(restoreTimer);for(const id of motionDetail)vis(id,false)}
function restoreMotionDetail(){clearTimeout(restoreTimer);restoreTimer=setTimeout(()=>{for(const id of motionDetail)vis(id,true);styleWorld();map?.triggerRepaint?.()},110)}
function enforce(){installVectorWorld();styleWorld();clearTimeout(fallbackTimer);fallbackTimer=setTimeout(ensureFallback,4500)}
function bind(){
 state=window.__bp97MapState;map=state?.map;
 if(!state?.ready||!map){setTimeout(bind,100);return}
 if(bound)return;bound=true;
 state.localTried=true;state.weatherFx=false;if(state.layers)state.layers.radar=false;
 enforce();
 map.on('styledata',()=>setTimeout(enforce,0));
 map.on('zoomend',()=>{styleWorld();clearTimeout(fallbackTimer);fallbackTimer=setTimeout(ensureFallback,1200)});
 map.on('sourcedata',e=>{if(e?.sourceId===SOURCE&&sourceReady())vis('bp2220-street-fallback',false)});
 for(const ev of ['movestart','zoomstart','rotatestart','pitchstart'])map.on(ev,hideMotionDetail);
 for(const ev of ['moveend','zoomend','rotateend','pitchend'])map.on(ev,restoreMotionDetail);
 for(const ms of [0,180,500,1200,2600,5200])setTimeout(enforce,ms);
 setInterval(()=>{if(document.querySelector('[data-surface="map"]')?.classList.contains('active'))styleWorld()},1800);
 window.__bpMobileVisualWorldV2220={version:VERSION,mode:'DIRECT_VECTOR_PHONE_WORLD',directVectorTemplate:DIRECT,sourceMaxZoom:14,tileJsonBypassed:true,land:true,water:true,majorRoads:true,localRoads:true,rail:true,boundaries:true,buildings3d:true,heavyGpu:false,fallback:'DIMMED_STREET_RASTER_ONLY_IF_DIRECT_VECTOR_UNAVAILABLE',cedesRichSceneAuthority:true};
 console.info('BridgePoint V2220 direct vector phone world ready');
}
bind();
})();
