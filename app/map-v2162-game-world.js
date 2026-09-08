(()=>{
'use strict';
if(window.__bridgepointGameWorldV2162)return;window.__bridgepointGameWorldV2162=true;
let tries=0,installed=false;
const firstExisting=(m,ids)=>ids.find(id=>m.getLayer(id));
function add(m,layer,before){try{if(!m.getLayer(layer.id))m.addLayer(layer,before&&m.getLayer(before)?before:undefined)}catch(e){console.warn('BP2162 add layer',layer.id,e)}}
function setup(){
 const s=window.__bp97MapState,m=s?.map;
 if(!s?.ready||!m){if(tries++<360)setTimeout(setup,200);return}
 if(installed)return; installed=true;
 try{
  try{m.setMaxPitch(85)}catch(_){}
  if(!m.getSource('bp2162-openmaptiles'))m.addSource('bp2162-openmaptiles',{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'© OpenStreetMap contributors · OpenFreeMap'});
  const bottom=firstExisting(m,['sat','street','radar','hillshade','labels']);
  add(m,{id:'bp2162-game-ground',type:'background',paint:{'background-color':'#071019'}},bottom);
  add(m,{id:'bp2162-water',type:'fill',source:'bp2162-openmaptiles','source-layer':'water',paint:{'fill-color':'#071c2a','fill-opacity':.96}},bottom);
  add(m,{id:'bp2162-tree-canopy',type:'fill',source:'bp2162-openmaptiles','source-layer':'landcover',minzoom:6,filter:['in',['get','class'],['literal',['wood','forest']]],paint:{'fill-color':'#0f3c31','fill-opacity':['interpolate',['linear'],['zoom'],6,.36,14,.66,18,.8]}},bottom);
  add(m,{id:'bp2162-parks',type:'fill',source:'bp2162-openmaptiles','source-layer':'landuse',minzoom:8,filter:['in',['get','class'],['literal',['park','grass','cemetery','recreation_ground']]],paint:{'fill-color':'#103c32','fill-opacity':.52}},bottom);
  add(m,{id:'bp2162-road-casing',type:'line',source:'bp2162-openmaptiles','source-layer':'transportation',minzoom:5,filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary','tertiary','minor','service']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#f5fbff','line-width':['interpolate',['exponential',1.35],['zoom'],5,.45,10,1.2,14,4.8,18,18],'line-opacity':['interpolate',['linear'],['zoom'],5,.38,11,.62,14,.9]}},'labels');
  add(m,{id:'bp2162-road-asphalt',type:'line',source:'bp2162-openmaptiles','source-layer':'transportation',minzoom:5,filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary','tertiary','minor','service']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['get','class'],'motorway','#171b21','trunk','#171b21','primary','#15191f','secondary','#14181e','#10151b'],'line-width':['interpolate',['exponential',1.35],['zoom'],5,.28,10,.8,14,3.7,18,16],'line-opacity':.98}},'labels');
  add(m,{id:'bp2162-road-center',type:'line',source:'bp2162-openmaptiles','source-layer':'transportation',minzoom:12,filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary']]],layout:{'line-cap':'butt','line-join':'round'},paint:{'line-color':'#f5d65b','line-width':['interpolate',['linear'],['zoom'],12,.45,16,1.05,19,1.8],'line-dasharray':[3,3],'line-opacity':.94}},'labels');
  add(m,{id:'bp2162-tree-points',type:'circle',source:'bp2162-openmaptiles','source-layer':'poi',minzoom:15,filter:['any',['==',['get','subclass'],'tree'],['==',['get','class'],'tree']],paint:{'circle-radius':['interpolate',['linear'],['zoom'],15,2.2,19,6.2],'circle-color':'#28765a','circle-stroke-color':'#9ce7bd','circle-stroke-width':.5,'circle-opacity':.82}},'labels');
  for(const id of ['sat','street'])try{if(m.getLayer(id))m.setLayoutProperty(id,'visibility','none')}catch(_){}
  try{if(m.getLayer('hillshade')){m.setLayoutProperty('hillshade','visibility','visible');m.setPaintProperty('hillshade','hillshade-exaggeration',.72)}}catch(_){}
  for(const id of ['bp97-building','bp2060-building'])if(m.getLayer(id)){
    try{m.setPaintProperty(id,'fill-extrusion-color',['interpolate',['linear'],['get','render_height_m'],0,'#47505b',18,'#667786',55,'#8098aa',120,'#70889c',240,'#879dad',420,'#aab8c2']);m.setPaintProperty(id,'fill-extrusion-opacity',.9)}catch(_){}
  }
  if(m.getLayer('bp2060-roof')){try{m.setPaintProperty('bp2060-roof','fill-extrusion-opacity',.96)}catch(_){}}
  if(m.getLayer('bp97-floorbands')){try{m.setLayerZoomRange('bp97-floorbands',12.5,22);m.setPaintProperty('bp97-floorbands','fill-extrusion-color','#d9f6ff');m.setPaintProperty('bp97-floorbands','fill-extrusion-opacity',.76)}catch(_){}}
  const labels=firstExisting(m,['labels']); if(labels)try{m.moveLayer(labels)}catch(_){}
  const chipHost=document.querySelector('.layer-scroll');
  if(chipHost&&!document.getElementById('bp2162GameView')){const b=document.createElement('button');b.id='bp2162GameView';b.className='chip active';b.textContent='Game 3D';b.onclick=()=>{const on=b.classList.toggle('active');for(const id of ['bp2162-game-ground','bp2162-water','bp2162-tree-canopy','bp2162-parks','bp2162-road-casing','bp2162-road-asphalt','bp2162-road-center','bp2162-tree-points'])try{if(m.getLayer(id))m.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){};try{if(m.getLayer('sat'))m.setLayoutProperty('sat','visibility',on?'none':'visible')}catch(_){};if(on)m.easeTo({pitch:Math.max(68,m.getPitch()),bearing:m.getBearing()||-18,duration:650})};chipHost.prepend(b)}
  const toolbar=document.querySelector('.map-toolbar');
  if(toolbar&&!document.getElementById('bp2162RealityNote')){const n=document.createElement('span');n.id='bp2162RealityNote';n.style.cssText='font-size:9px;font-weight:850;opacity:.78;padding:4px 7px;border:1px solid rgba(140,210,255,.25);border-radius:999px';n.textContent='Game 3D · source-backed height + roof truth';toolbar.appendChild(n)}
  m.on('zoomend',()=>{try{if(m.getZoom()>=13&&m.getPitch()<64)m.easeTo({pitch:70,duration:350})}catch(_){}});
  window.__bp2162GameWorld={version:2162,mode:'SOURCE_BACKED_GAME_3D',photorealisticProvider:'LICENSED_3D_TILES_ADAPTER_REQUIRED_FOR_TEXTURED_MESH',trees:'OPENMAPTILES_CANOPY_AND_TREE_POINTS',roads:'OPENMAPTILES_VECTOR'};
 }catch(e){installed=false;console.warn('BridgePoint game-world V2162',e);setTimeout(setup,1200)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
