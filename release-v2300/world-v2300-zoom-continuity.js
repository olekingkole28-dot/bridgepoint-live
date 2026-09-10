import{MOBILE,TIER}from'./world-v2300-config.js';

const EMPTY={type:'FeatureCollection',features:[]};
const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const add=(m,l,before)=>{try{if(!has(m,l.id))m.addLayer(l,before&&has(m,before)?before:undefined)}catch(e){console.warn('V2300 zoom continuity layer',l.id,e)}};
const paint=(m,id,k,v)=>{try{if(has(m,id))m.setPaintProperty(id,k,v)}catch(e){console.warn('V2300 zoom continuity paint',id,k,e)}};
const zoom=(m,id,min,max=24)=>{try{if(has(m,id))m.setLayerZoomRange(id,min,max)}catch(e){console.warn('V2300 zoom continuity range',id,e)}};
const landKind=p=>String(p?.class||p?.subclass||p?.landuse||'').toLowerCase();
const roadClasses=['motorway','trunk','primary','secondary','tertiary','minor','residential','living_street','unclassified','service'];
const vegClasses=new Set(['wood','forest','park','grass','garden','recreation_ground','meadow']);
const capTrees=TIER==='LOW'?110:TIER==='HIGH'?420:240;
const capLights=TIER==='LOW'?150:TIER==='HIGH'?620:320;
const meterLon=lat=>111320*Math.max(.15,Math.cos(lat*Math.PI/180));
const meterLat=110540;

function circleRing(c,r,n=8){const out=[];for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2;out.push([c[0]+Math.cos(a)*r/meterLon(c[1]),c[1]+Math.sin(a)*r/meterLat])}out.push(out[0]);return out}
function flattenRings(g){if(!g)return[];if(g.type==='Polygon')return g.coordinates?.[0]?[g.coordinates[0]]:[];if(g.type==='MultiPolygon')return(g.coordinates||[]).map(p=>p?.[0]).filter(Boolean);return[]}
function ringCenter(r){if(!r?.length)return null;let x=0,y=0,n=0;for(const p of r){if(!Array.isArray(p)||p.length<2)continue;x+=p[0];y+=p[1];n++}return n?[x/n,y/n]:null}
function treeFeatures(center,kind,index){const height=kind==='forest'||kind==='wood'?7.2+(index%4)*.65:5.2+(index%3)*.55;const crown=kind==='forest'||kind==='wood'?2.8+(index%3)*.35:2.25+(index%2)*.4;const trunk=.42+(index%2)*.08;return[
 {type:'Feature',geometry:{type:'Polygon',coordinates:[circleRing(center,trunk,7)]},properties:{part:'trunk',kind,height_m:height,derived_from_landcover:true}},
 {type:'Feature',geometry:{type:'Polygon',coordinates:[circleRing(center,crown,9)]},properties:{part:'canopy',kind,height_m:height,base_m:Math.max(1.9,height*.32),derived_from_landcover:true}}
]}
function vegetationColor(){return['match',['get','kind'],'forest','#1c6b3d','wood','#245f36','park','#2f8247','grass','#4d9b4d','garden','#3f8e4a','meadow','#5c9d50','#397b45']}

export function initZoomContinuity(map){
 if(!map)return null;if(window.__bpZoomContinuityV2300?.map===map)return window.__bpZoomContinuityV2300;
 let installed=false,timer=0,treeCount=0,lightCount=0;
 function install(){
  let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource?.('ofm')}catch(_){}if(!ready)return;

  // Pull the visual LOD envelope outward so detail arrives progressively instead of popping in at street zoom.
  for(const [id,min] of [
   ['gta-context-buildings',9.65],['gta-bp-buildings',10.0],['gta-bp-building-edge',11.15],['gta-bp-roof',12.15],
   ['gta-road-local-casing',9.15],['gta-road-local',9.15],['gta-road-supplement-casing-bp',10.25],['gta-road-supplement-bp',10.25],
   ['gta-rail',8.7],['gta-rail-ballast',8.7],['gta-rail-steel',9.5],['gta-rail-ties',11.15],['gta-rail-highlight',13.2],
   ['gta-bridge-shadow',8.6],['gta-bridge-deck',8.6],['gta-bridge-center',12.1],
   ['gta-road-name',10.45],['gta-route-ref-v2300',7.7],['gta-local-street-name-v2300',12.25],
   ['gta-city-label-v2300',4.4],['gta-town-label-v2300',6.6],['gta-locality-label-v2300',9.25],['gta-water-label',2.8]
  ])zoom(map,id,min);

  // More legible natural/material palette.
  paint(map,'gta-water','fill-color','#0b4f79');paint(map,'gta-water','fill-opacity',.985);
  paint(map,'gta-waterway','line-color','#36b9ff');paint(map,'gta-waterway','line-opacity',.86);
  paint(map,'gta-landcover','fill-color',['match',['get','class'],'wood','#205b38','forest','#205b38','grass','#4f8f46','farmland','#6d7440','ice','#dbeef4','#324335']);
  paint(map,'gta-landcover','fill-opacity',['interpolate',['linear'],['zoom'],2,.64,7,.76,11,.88,15,.93]);
  paint(map,'gta-landuse','fill-color',['match',['get','class'],'park','#327849','grass','#4b914e','residential','#30383c','commercial','#3c3542','retail','#463b43','industrial','#443d36','cemetery','#46634a','school','#405c50','#353f3d']);
  paint(map,'gta-landuse','fill-opacity',['interpolate',['linear'],['zoom'],7.5,.62,11,.76,15,.86]);

  // Deep asphalt surfaces with BridgePoint yellow/white road language.
  paint(map,'gta-road-major','line-color','#15191c');paint(map,'gta-road-major','line-opacity',.99);
  paint(map,'gta-road-major-glow','line-color','#f2b83f');paint(map,'gta-road-major-glow','line-opacity',.26);
  paint(map,'gta-road-local-casing','line-color','#050708');paint(map,'gta-road-local','line-color','#1b1f22');paint(map,'gta-road-local','line-opacity',['interpolate',['linear'],['zoom'],9.15,.5,11,.72,14,.9,17,.99]);

  add(map,{id:'gta-shore-shadow-v2300',type:'line',source:'ofm','source-layer':'water',minzoom:2.5,paint:{'line-color':'#02080c','line-width':['interpolate',['linear'],['zoom'],2.5,.35,8,.8,14,1.8,19,3.2],'line-opacity':.7,'line-blur':1.1}},'gta-waterway');
  add(map,{id:'gta-shoreline-v2300',type:'line',source:'ofm','source-layer':'water',minzoom:2.5,paint:{'line-color':'#72cfff','line-width':['interpolate',['linear'],['zoom'],2.5,.22,8,.45,14,.9,19,1.45],'line-opacity':['interpolate',['linear'],['zoom'],2.5,.38,7,.62,12,.82,18,.92]}},'gta-waterway');

  add(map,{id:'gta-parking-v2300',type:'fill',source:'ofm','source-layer':'landuse',minzoom:10.2,filter:['in',['get','class'],['literal',['parking','parking_aisle']]],paint:{'fill-color':'#15181a','fill-opacity':['interpolate',['linear'],['zoom'],10.2,.48,13,.78,16,.94],'fill-outline-color':'#8f9597'}},'gta-road-major-glow');
  add(map,{id:'gta-parking-edge-v2300',type:'line',source:'ofm','source-layer':'landuse',minzoom:12.2,filter:['in',['get','class'],['literal',['parking','parking_aisle']]],paint:{'line-color':'#eef1ed','line-width':['interpolate',['linear'],['zoom'],12.2,.25,16,.65,20,1.05],'line-opacity':.58}},'gta-road-major-glow');

  add(map,{id:'gta-road-major-center-v2300',type:'line',source:'ofm','source-layer':'transportation',minzoom:7.2,filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['get','class'],'secondary','#f4f4ef','#f0b83f'],'line-width':['interpolate',['linear'],['zoom'],7.2,.13,11,.24,15,.52,19,1.1],'line-opacity':['interpolate',['linear'],['zoom'],7.2,.36,10,.62,14,.86,18,.95],'line-dasharray':[4,2]}},'gta-rail-ballast');
  add(map,{id:'gta-road-local-center-v2300',type:'line',source:'ofm','source-layer':'transportation',minzoom:12.0,filter:['in',['get','class'],['literal',['tertiary','minor','residential','unclassified']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#f4f5f1','line-width':['interpolate',['linear'],['zoom'],12,.12,16,.32,20,.68],'line-opacity':['interpolate',['linear'],['zoom'],12,.28,15,.62,18,.86],'line-dasharray':[4,3]}},'gta-rail-ballast');

  // Keep rail recognizable well before the close-range 3D ties/steel pass.
  paint(map,'gta-rail-ballast','line-color','#37332e');paint(map,'gta-rail-ballast','line-opacity',.98);
  paint(map,'gta-rail-ties','line-color','#9c7143');paint(map,'gta-rail-ties','line-opacity',.92);
  paint(map,'gta-rail-steel','line-color','#e3eaec');paint(map,'gta-rail-steel','line-opacity',.99);
  paint(map,'gta-bridge-deck','line-color','#c8d6d8');paint(map,'gta-bridge-center','line-color','#f0b83f');

  // Material/class/height variation stays source-driven; unknown buildings still avoid one flat gray.
  const varied=['case',
    ['has','facade_material'],['match',['downcase',['get','facade_material']],'brick','#a86454','stone','#8e877c','glass','#6d9dae','metal','#8f9da2','concrete','#999b94','wood','#96765c','#9aa5a5'],
    ['in',['downcase',['coalesce',['get','building'],['get','class'],'']],['literal',['commercial','retail','office']]],'#8ca0a8',
    ['in',['downcase',['coalesce',['get','building'],['get','class'],'']],['literal',['industrial','warehouse']]],'#7f8b83',
    ['>',['coalesce',['to-number',['get','render_height_m']],['to-number',['get','height']],8],45],'#7898a5',
    ['>',['coalesce',['to-number',['get','render_height_m']],['to-number',['get','height']],8],18],'#9f8b7d','#9c9187'];
  for(const id of ['gta-context-buildings','gta-bp-buildings','gta-exact-building'])paint(map,id,'fill-extrusion-color',varied);

  try{if(!map.getSource('bp-vegetation-v2300'))map.addSource('bp-vegetation-v2300',{type:'geojson',data:EMPTY})}catch(e){console.warn('V2300 vegetation source',e)}
  add(map,{id:'gta-tree-canopy-flat-v2300',type:'fill',source:'bp-vegetation-v2300',minzoom:11.15,maxzoom:14.2,filter:['==',['get','part'],'canopy'],paint:{'fill-color':vegetationColor(),'fill-opacity':['interpolate',['linear'],['zoom'],11.15,.3,13,.66,14.2,.82]}},'gta-context-buildings');
  add(map,{id:'gta-tree-trunk-v2300',type:'fill-extrusion',source:'bp-vegetation-v2300',minzoom:13.2,filter:['==',['get','part'],'trunk'],paint:{'fill-extrusion-color':'#6f4a2f','fill-extrusion-base':0,'fill-extrusion-height':['*',['get','height_m'],.42],'fill-extrusion-opacity':.98,'fill-extrusion-vertical-gradient':true}},'gta-context-buildings');
  add(map,{id:'gta-tree-canopy-v2300',type:'fill-extrusion',source:'bp-vegetation-v2300',minzoom:13.2,filter:['==',['get','part'],'canopy'],paint:{'fill-extrusion-color':vegetationColor(),'fill-extrusion-base':['get','base_m'],'fill-extrusion-height':['get','height_m'],'fill-extrusion-opacity':.96,'fill-extrusion-vertical-gradient':true}},'gta-context-buildings');

  try{if(!map.getSource('bp-street-furniture-v2300'))map.addSource('bp-street-furniture-v2300',{type:'geojson',data:EMPTY})}catch(e){console.warn('V2300 street furniture source',e)}
  add(map,{id:'gta-streetlight-glow-v2300',type:'circle',source:'bp-street-furniture-v2300',minzoom:13.75,paint:{'circle-radius':['interpolate',['linear'],['zoom'],13.75,1.2,16,2.8,19,5.2],'circle-color':'#ffe78d','circle-opacity':['interpolate',['linear'],['zoom'],13.75,.14,16,.28,19,.48],'circle-blur':.82}},'gta-context-buildings');
  add(map,{id:'gta-streetlight-core-v2300',type:'circle',source:'bp-street-furniture-v2300',minzoom:14.0,paint:{'circle-radius':['interpolate',['linear'],['zoom'],14,.42,17,1.05,20,1.8],'circle-color':'#fff8cf','circle-opacity':['interpolate',['linear'],['zoom'],14,.34,17,.84,20,.98]}},'gta-context-buildings');

  installed=true;map.triggerRepaint?.();
 }

 function rebuildTrees(){
  if(map.getZoom()<11.0){treeCount=0;try{map.getSource('bp-vegetation-v2300')?.setData(EMPTY)}catch(_){}return}
  const layers=['gta-landcover','gta-landuse'].filter(id=>has(map,id));if(!layers.length)return;
  let fs=[];try{fs=map.queryRenderedFeatures({layers})||[]}catch(_){return}
  const out=[],seen=new Set();let idx=0;
  outer:for(const f of fs){const kind=landKind(f.properties||{});if(!vegClasses.has(kind))continue;for(const ring of flattenRings(f.geometry)){const c=ringCenter(ring);if(!c)continue;const candidates=[c];const stride=Math.max(8,Math.ceil(ring.length/4));for(let i=0;i<ring.length;i+=stride){const p=ring[i];if(Array.isArray(p)&&p.length>=2)candidates.push([c[0]+(p[0]-c[0])*.36,c[1]+(p[1]-c[1])*.36])}for(const p of candidates){if(treeCount>=capTrees)break outer;const k=`${p[0].toFixed(4)}|${p[1].toFixed(4)}`;if(seen.has(k))continue;seen.add(k);out.push(...treeFeatures(p,kind,idx++));treeCount++}}}
  try{map.getSource('bp-vegetation-v2300')?.setData({type:'FeatureCollection',features:out})}catch(_){}
 }
 function rebuildLights(){
  if(map.getZoom()<13.6){lightCount=0;try{map.getSource('bp-street-furniture-v2300')?.setData(EMPTY)}catch(_){}return}
  const layers=['gta-road-major','gta-road-local','gta-road-supplement-bp'].filter(id=>has(map,id));if(!layers.length)return;let fs=[];try{fs=map.queryRenderedFeatures({layers})||[]}catch(_){return}
  const out=[],seen=new Set();
  outer:for(const f of fs){const cls=String(f.properties?.class||'').toLowerCase();if(cls&&!roadClasses.includes(cls)&&!['path','pedestrian'].includes(cls))continue;const g=f.geometry,lines=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];for(const line of lines){const step=Math.max(5,Math.ceil(line.length/(MOBILE?5:9)));for(let i=0;i<line.length;i+=step){if(out.length>=capLights)break outer;const c=line[i];if(!Array.isArray(c)||c.length<2)continue;const k=`${c[0].toFixed(5)}|${c[1].toFixed(5)}`;if(seen.has(k))continue;seen.add(k);out.push({type:'Feature',geometry:{type:'Point',coordinates:c},properties:{kind:'streetlight',derived_from_road_geometry:true,road_class:cls}})}}}
  lightCount=out.length;try{map.getSource('bp-street-furniture-v2300')?.setData({type:'FeatureCollection',features:out})}catch(_){}
 }
 function rebuild(){clearTimeout(timer);timer=setTimeout(()=>{treeCount=0;rebuildTrees();rebuildLights();map.triggerRepaint?.()},TIER==='LOW'?260:150)}

 install();map.on?.('styledata',()=>{install();rebuild()});map.on?.('moveend',rebuild);map.on?.('zoomend',rebuild);for(const ms of [120,500,1400,3400])setTimeout(()=>{install();rebuild()},ms);
 const api={version:2300,map,requirementKey:'v2300_zoom_continuity_streetscape_v1',rebuild,get state(){return{installed,continuousMidZoom:true,buildingMinZoom:9.65,localRoadMinZoom:9.15,railMinZoom:8.7,bridgeMinZoom:8.6,townMinZoom:6.6,localStreetNameMinZoom:12.25,shorelineOutline:true,blueWater:true,greenVegetation:true,darkParking:true,blackYellowWhiteRoads:true,derivedTreeForms:treeCount,derivedStreetlights:lightCount,derivedAssetTruthLabels:true,secondaryCanvases:0}}};window.__bpZoomContinuityV2300=api;return api;
}
