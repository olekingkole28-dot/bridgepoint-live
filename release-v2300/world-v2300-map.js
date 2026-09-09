import{VERSION,SUPA,EDGE,EMPTY,MOBILE,LOW,TIER,rpc,tileTransform,bbox,fc,lngLatCenter,clamp}from'./world-v2300-config.js';

const OFM='https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf';
const SAT='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const DEM='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const PARCEL=`${EDGE}bridgepoint-spatial-tile-v1957?layer=parcels&z={z}&x={x}&y={y}&limit=7000`;
const MAX_EXACT=TIER==='LOW'?1100:TIER==='HIGH'?3000:1900;
const DETAIL_MIN=TIER==='LOW'?15.4:TIER==='HIGH'?14.4:14.9;
const PARCEL_MIN=TIER==='LOW'?14.4:13.7;
const LIGHT_MIN=TIER==='LOW'?16.7:TIER==='HIGH'?15.6:16.1;

function add(map,layer,before){try{if(!map.getLayer(layer.id))map.addLayer(layer,before&&map.getLayer(before)?before:undefined)}catch(e){console.warn('V2300 layer',layer.id,e)}}
function setVis(map,id,on){try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}}
function setPaint(map,id,k,v){try{if(map.getLayer(id))map.setPaintProperty(id,k,v)}catch(_){}}
function roadFilter(classes){return['in',['get','class'],['literal',classes]]}

function baseStyle(){
  return{
    version:8,
    glyphs:'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sources:{
      ofm:{type:'vector',tiles:[OFM],minzoom:0,maxzoom:14,attribution:'OpenFreeMap · OpenMapTiles · OpenStreetMap'},
      sat:{type:'raster',tiles:[SAT],tileSize:256,maxzoom:20,attribution:'Esri World Imagery'},
      dem:{type:'raster-dem',tiles:[DEM],tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'AWS Terrain Tiles'},
      parcels:{type:'vector',tiles:[PARCEL],minzoom:10,maxzoom:22},
      exact:{type:'geojson',data:EMPTY},
      exactRoof:{type:'geojson',data:EMPTY},
      selected:{type:'geojson',data:EMPTY},
      streetlights:{type:'geojson',data:EMPTY}
    },
    layers:[
      {id:'gta-bg',type:'background',paint:{'background-color':'#071017'}},
      {id:'gta-sat',type:'raster',source:'sat',layout:{visibility:'none'},paint:{'raster-opacity':.94,'raster-saturation':-.12,'raster-contrast':.12,'raster-fade-duration':0}},
      {id:'gta-water',type:'fill',source:'ofm','source-layer':'water',paint:{'fill-color':'#071f31','fill-opacity':1}},
      {id:'gta-landcover',type:'fill',source:'ofm','source-layer':'landcover',minzoom:2,paint:{'fill-color':['match',['get','class'],'wood','#102b25','forest','#102b25','grass','#172d24','farmland','#29271d','ice','#dcecf1','#111b20'],'fill-opacity':['interpolate',['linear'],['zoom'],2,.56,8,.72,13,.82]}},
      {id:'gta-landuse',type:'fill',source:'ofm','source-layer':'landuse',minzoom:8,paint:{'fill-color':['match',['get','class'],'park','#13372b','grass','#183528','residential','#171f24','commercial','#202027','retail','#24212a','industrial','#1f272b','#1b2528'],'fill-opacity':.74}},
      {id:'gta-hillshade',type:'hillshade',source:'dem',minzoom:4,paint:{'hillshade-exaggeration':LOW?.35:.55,'hillshade-shadow-color':'#02070a','hillshade-highlight-color':'#b5d6d8','hillshade-accent-color':'#47626b'}},
      {id:'gta-road-major-glow',type:'line',source:'ofm','source-layer':'transportation',minzoom:6.5,filter:roadFilter(['motorway','trunk','primary','secondary']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#48e7ff','line-width':['interpolate',['exponential',1.35],['zoom'],7,1,11,2.6,15,9,19,20],'line-opacity':.18,'line-blur':3}},
      {id:'gta-road-major',type:'line',source:'ofm','source-layer':'transportation',minzoom:6.5,filter:roadFilter(['motorway','trunk','primary','secondary']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['get','class'],'motorway','#fff6c7','trunk','#d4fcff','primary','#a7f4ff','#79dce9'],'line-width':['interpolate',['exponential',1.35],['zoom'],7,.5,11,1.5,15,5.5,19,13],'line-opacity':.96}},
      {id:'gta-road-local-casing',type:'line',source:'ofm','source-layer':'transportation',minzoom:10.5,filter:roadFilter(['tertiary','minor','service','track']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#071017','line-width':['interpolate',['exponential',1.35],['zoom'],10.5,.7,14,2.5,17,7,20,15],'line-opacity':.96}},
      {id:'gta-road-local',type:'line',source:'ofm','source-layer':'transportation',minzoom:10.5,filter:roadFilter(['tertiary','minor','service','track']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#c2f4f7','line-width':['interpolate',['exponential',1.35],['zoom'],10.5,.22,14,.95,17,3.3,20,7.8],'line-opacity':['interpolate',['linear'],['zoom'],10.5,.36,14,.72,17,.9]}},
      {id:'gta-rail',type:'line',source:'ofm','source-layer':'transportation',minzoom:11,filter:roadFilter(['rail','transit']),paint:{'line-color':'#f2d88e','line-width':['interpolate',['linear'],['zoom'],11,.4,17,1.7,20,3.5],'line-opacity':.64,'line-dasharray':[2,2]}},
      {id:'gta-waterway',type:'line',source:'ofm','source-layer':'waterway',minzoom:8,paint:{'line-color':'#2bc5ff','line-width':['interpolate',['linear'],['zoom'],8,.4,17,2.5],'line-opacity':.72}},
      {id:'gta-state',type:'line',source:'ofm','source-layer':'boundary',minzoom:2.5,filter:['==',['get','admin_level'],4],paint:{'line-color':'#e6fbff','line-width':['interpolate',['linear'],['zoom'],3,.5,9,1.4,15,2.2],'line-opacity':.82}},
      {id:'gta-county',type:'line',source:'ofm','source-layer':'boundary',minzoom:7,filter:['==',['get','admin_level'],6],paint:{'line-color':'#5c8a93','line-width':.8,'line-opacity':.48,'line-dasharray':[3,2]}},
      {id:'gta-context-buildings',type:'fill-extrusion',source:'ofm','source-layer':'building',minzoom:11.6,paint:{'fill-extrusion-color':['interpolate',['linear'],['max',4,['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],['*',['coalesce',['to-number',['get','levels']],2],3],8]],0,'#3b4850',20,'#4e626d',60,'#617a86',150,'#7b919a',300,'#a3b2b7'],'fill-extrusion-height':['max',4,['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],['*',['coalesce',['to-number',['get','levels']],2],3],8]],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','render_min_height']],['to-number',['get','min_height']],0]],'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],11.6,.34,13,.52,15,.66,18,.78],'fill-extrusion-vertical-gradient':true}},
      {id:'gta-exact-building',type:'fill-extrusion',source:'exact',minzoom:DETAIL_MIN,paint:{'fill-extrusion-color':['match',['get','facade_material'],'brick','#9c6355','glass','#6b94a5','metal','#8a9ca3','concrete','#9b9d98','wood','#8f785f','#aeb9bb'],'fill-extrusion-height':['get','render_height_m'],'fill-extrusion-base':['get','base_height_m'],'fill-extrusion-opacity':.94,'fill-extrusion-vertical-gradient':true}},
      {id:'gta-exact-roof',type:'fill-extrusion',source:'exactRoof',minzoom:DETAIL_MIN,paint:{'fill-extrusion-color':['match',['get','roof_material'],'metal','#c6d6db','tile','#ad7b64','slate','#687985','shingle','#8d8580','concrete','#aab0ae','#bac7ca'],'fill-extrusion-base':['get','roof_base_m'],'fill-extrusion-height':['get','roof_top_m'],'fill-extrusion-opacity':.96,'fill-extrusion-vertical-gradient':false}},
      {id:'gta-building-outline',type:'line',source:'exact',minzoom:DETAIL_MIN,paint:{'line-color':'#dffcff','line-width':['interpolate',['linear'],['zoom'],14.5,.45,18,1.2,21,1.8],'line-opacity':.78}},
      {id:'gta-parcel-glow',type:'line',source:'parcels','source-layer':'parcels',minzoom:PARCEL_MIN,paint:{'line-color':'#26e8ff','line-width':['interpolate',['linear'],['zoom'],PARCEL_MIN,2,17,4.8,21,8],'line-opacity':.18,'line-blur':3}},
      {id:'gta-parcel',type:'line',source:'parcels','source-layer':'parcels',minzoom:PARCEL_MIN,paint:{'line-color':['case',['>', ['coalesce',['get','render_score'],0],75],'#ffd15c','#d4fbff'],'line-width':['interpolate',['linear'],['zoom'],PARCEL_MIN,.55,17,1.25,21,2.1],'line-opacity':.94}},
      {id:'gta-streetlights-glow',type:'circle',source:'streetlights',minzoom:LIGHT_MIN,paint:{'circle-radius':['interpolate',['linear'],['zoom'],LIGHT_MIN,2,18,4.4,21,6],'circle-color':'#fff1a6','circle-opacity':.3,'circle-blur':.8}},
      {id:'gta-streetlights',type:'circle',source:'streetlights',minzoom:LIGHT_MIN,paint:{'circle-radius':['interpolate',['linear'],['zoom'],LIGHT_MIN,.7,18,1.5,21,2.4],'circle-color':'#fff9d8','circle-opacity':['interpolate',['linear'],['zoom'],LIGHT_MIN,.3,18,.88,21,1]}},
      {id:'gta-selected-body',type:'fill-extrusion',source:'selected',minzoom:12,paint:{'fill-extrusion-color':'#00fff0','fill-extrusion-height':['coalesce',['get','render_height_m'],10],'fill-extrusion-base':['coalesce',['get','base_height_m'],0],'fill-extrusion-opacity':.34}},
      {id:'gta-selected-outline',type:'line',source:'selected',minzoom:12,paint:{'line-color':'#8affff','line-width':3,'line-opacity':1,'line-blur':.4}}
    ]
  };
}

function makeExactRoof(data){
  const features=[];
  for(const f of data?.features||[]){
    const p=f.properties||{},base=Number(p.render_height_m||8.5),rh=Math.max(.18,Number(p.roof_height_m||.28));
    features.push({type:'Feature',id:f.id,geometry:f.geometry,properties:{...p,roof_base_m:base,roof_top_m:base+rh}})
  }
  return fc(features);
}

function featureKey(f){return String(f?.properties?.building_id??f?.id??JSON.stringify(f?.geometry?.coordinates?.[0]?.[0]||''))}
function dedupe(data){const s=new Set(),out=[];for(const f of data?.features||[]){const k=featureKey(f);if(!k||s.has(k))continue;s.add(k);out.push(f)}return fc(out)}

function roadLightPoints(map){
  if(map.getZoom()<LIGHT_MIN)return EMPTY;
  let fs=[];try{fs=map.queryRenderedFeatures({layers:['gta-road-major','gta-road-local']})||[]}catch(_){return EMPTY}
  const pts=[],seen=new Set(),max=TIER==='LOW'?450:TIER==='HIGH'?1400:800;
  const addPoint=(c,i)=>{const q=`${c[0].toFixed(5)}|${c[1].toFixed(5)}`;if(seen.has(q)||pts.length>=max)return;seen.add(q);pts.push({type:'Feature',properties:{kind:'streetlight',i},geometry:{type:'Point',coordinates:c}})};
  for(const f of fs){const g=f.geometry;if(!g)continue;const lines=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];for(const line of lines){const step=Math.max(4,Math.ceil(line.length/(MOBILE?7:10)));for(let i=0;i<line.length;i+=step)addPoint(line[i],i)}}
  return fc(pts);
}

export function initWorld(){
  const container=document.getElementById('liveMap');if(!container||!window.maplibregl)return null;
  if(window.__bpWorldV2300?.map)return window.__bpWorldV2300;
  container.innerHTML='';
  const map=new maplibregl.Map({
    container,
    style:baseStyle(),
    center:[-98.5,39.5],zoom:3.2,pitch:0,bearing:0,minZoom:2.2,maxZoom:21,
    projection:{type:'globe'},
    antialias:!LOW,
    fadeDuration:0,
    renderWorldCopies:false,
    transformRequest:tileTransform,
    maxTileCacheSize:TIER==='LOW'?70:TIER==='HIGH'?220:130
  });
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true,showCompass:true}),'top-right');
  let exactAbort=0,detailTimer=0,lightsTimer=0,moving=false,base='gta';

  function setStatus(text){const e=document.getElementById('mapStatus');if(e)e.textContent=text}
  function applyProjection(){const z=map.getZoom();try{map.setProjection({type:z<=8.4?'globe':'mercator'})}catch(_){}}
  function applyTerrain(){const z=map.getZoom();try{map.setTerrain(z>=7?{source:'dem',exaggeration:LOW?1.0:TIER==='HIGH'?1.35:1.18}:null)}catch(_){}}
  function setBase(next){base=next==='satellite'?'satellite':'gta';setVis(map,'gta-sat',base==='satellite');setPaint(map,'gta-landcover','fill-opacity',base==='satellite'?['interpolate',['linear'],['zoom'],2,.28,9,.12,14,.03,17,0]:['interpolate',['linear'],['zoom'],2,.56,8,.72,13,.82]);setPaint(map,'gta-landuse','fill-opacity',base==='satellite'?.08:.74);document.querySelectorAll('[data-base]').forEach(b=>b.classList.toggle('active',b.dataset.base===base));map.triggerRepaint()}

  async function loadExact(){
    const z=map.getZoom();if(z<DETAIL_MIN){map.getSource('exact')?.setData(EMPTY);map.getSource('exactRoof')?.setData(EMPTY);return}
    const id=++exactAbort,b=bbox(map,.08);setStatus('Streaming exact building geometry…');
    try{
      const d=await rpc('bridgepoint_building_viewport_v2300',{p_min_lat:b.south,p_max_lat:b.north,p_min_lng:b.west,p_max_lng:b.east,p_limit:MAX_EXACT},6500);
      if(id!==exactAbort)return;const clean=dedupe(d);map.getSource('exact')?.setData(clean);map.getSource('exactRoof')?.setData(makeExactRoof(clean));
      setStatus(`V2300 · ${clean.features.length.toLocaleString()} exact buildings loaded · tiled city field stays continuous`);
    }catch(e){if(id===exactAbort)setStatus(`Tiled world active · exact detail delayed: ${e.message}`)}
  }
  function updateLights(){try{map.getSource('streetlights')?.setData(roadLightPoints(map))}catch(_){}}
  function movementStart(){moving=true;clearTimeout(detailTimer);clearTimeout(lightsTimer);for(const id of ['gta-exact-roof','gta-building-outline','gta-streetlights','gta-streetlights-glow'])setVis(map,id,false);setPaint(map,'gta-context-buildings','fill-extrusion-opacity',LOW?.28:.4)}
  function movementEnd(){moving=false;for(const id of ['gta-exact-roof','gta-building-outline','gta-streetlights','gta-streetlights-glow'])setVis(map,id,true);setPaint(map,'gta-context-buildings','fill-extrusion-opacity',['interpolate',['linear'],['zoom'],11.6,.34,13,.52,15,.66,18,.78]);applyProjection();applyTerrain();detailTimer=setTimeout(loadExact,LOW?220:120);lightsTimer=setTimeout(updateLights,LOW?340:180);window.dispatchEvent(new CustomEvent('bp2300:viewport-idle',{detail:{map}}))}
  function selectFeature(feature){if(!feature?.geometry)return;const p={...feature.properties,render_height_m:Number(feature.properties?.render_height_m||feature.properties?.height||10),base_height_m:Number(feature.properties?.base_height_m||0)};map.getSource('selected')?.setData({type:'FeatureCollection',features:[{type:'Feature',geometry:feature.geometry,properties:p}]})}
  function onBuilding(e){const feature=e.features?.[0];if(!feature)return;selectFeature(feature);const c=lngLatCenter(feature.geometry)||{x:e.lngLat.lng,y:e.lngLat.lat};map.easeTo({center:[c.x,c.y],zoom:Math.max(map.getZoom(),16.2),pitch:LOW?60:68,bearing:map.getBearing()||-18,duration:MOBILE?280:420});window.dispatchEvent(new CustomEvent('bp2300:building-click',{detail:{feature,lngLat:{lng:c.x,lat:c.y},map}}))}

  map.on('load',()=>{
    try{map.setMaxPitch(LOW?74:82);map.setLight({anchor:'map',color:'#e5f7ff',intensity:.48,position:[1.2,205,38]});map.setSky({'sky-color':'#102d3e','horizon-color':'#31515e','fog-color':'#718a92','sky-horizon-blend':.18,'horizon-fog-blend':.04,'fog-ground-blend':0,'atmosphere-blend':['interpolate',['linear'],['zoom'],0,.55,6,.28,9,0]})}catch(_){}
    applyTerrain();setBase('gta');loadExact();updateLights();
    for(const id of ['gta-exact-building','gta-context-buildings']){try{map.on('click',id,onBuilding);map.on('mouseenter',id,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',id,()=>map.getCanvas().style.cursor='')}catch(_){}}
    setStatus('V2300 GTA world ready · globe + terrain + tiled buildings + parcel truth');
    window.dispatchEvent(new CustomEvent('bp2300:map-ready',{detail:{map}}));
  });
  for(const ev of ['movestart','zoomstart','rotatestart','pitchstart'])map.on(ev,movementStart);
  for(const ev of ['moveend','zoomend','rotateend','pitchend'])map.on(ev,movementEnd);
  map.on('webglcontextlost',e=>{e.preventDefault();setStatus('GPU context paused · recovering map…')});
  map.on('webglcontextrestored',()=>{setStatus('GPU context restored');setTimeout(()=>{map.resize();movementEnd()},120)});

  document.querySelectorAll('[data-base]').forEach(b=>b.addEventListener('click',()=>setBase(b.dataset.base)));
  document.querySelectorAll('[data-layer]').forEach(b=>b.addEventListener('click',()=>{
    b.classList.toggle('active');const on=b.classList.contains('active'),k=b.dataset.layer;
    if(k==='parcels')for(const id of ['gta-parcel','gta-parcel-glow'])setVis(map,id,on);
    if(k==='buildings')for(const id of ['gta-context-buildings','gta-exact-building','gta-exact-roof','gta-building-outline'])setVis(map,id,on);
  }));
  document.getElementById('resetMap')?.addEventListener('click',()=>map.easeTo({center:[-98.5,39.5],zoom:3.2,pitch:0,bearing:0,duration:320}));
  document.getElementById('locateMe')?.addEventListener('click',()=>navigator.geolocation?.getCurrentPosition(p=>map.easeTo({center:[p.coords.longitude,p.coords.latitude],zoom:15.8,pitch:LOW?58:66,bearing:-18,duration:300}),()=>setStatus('Location permission unavailable'),{enableHighAccuracy:false,timeout:6000,maximumAge:120000}));
  const resize=()=>{requestAnimationFrame(()=>map.resize())};addEventListener('orientationchange',()=>setTimeout(resize,180),{passive:true});visualViewport?.addEventListener?.('resize',resize,{passive:true});

  const api={version:VERSION,map,setBase,selectFeature,loadExact,updateLights,get state(){return{version:VERSION,tier:TIER,base,zoom:map.getZoom(),moving,projection:map.getProjection?.()?.type||'',terrain:map.getTerrain?.()||null,canvases:container.querySelectorAll('canvas').length}}};
  window.__bpWorldV2300=api;return api;
}
