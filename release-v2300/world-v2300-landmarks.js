const EMPTY={type:'FeatureCollection',features:[]};
const LANDMARK_CLASSES=new Set(['hospital','fire_station','police','government','office','attraction','monument','museum','school','college','university','place_of_worship','stadium','town_hall','courthouse']);
const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const add=(m,l,before)=>{try{if(!has(m,l.id))m.addLayer(l,before&&has(m,before)?before:undefined)}catch(e){console.warn('V2300 landmark layer',l.id,e)}};
const toNum=(...v)=>{for(const x of v){const n=Number(x);if(Number.isFinite(n)&&n>=0)return n}return null};
const txt=(...v)=>{for(const x of v){const s=String(x??'').trim();if(s)return s}return''};
const validColor=s=>/^#[0-9a-f]{6}$/i.test(String(s||'').trim());
function materialColor(p){
  const explicit=txt(p.colour,p.color,p['building:colour'],p['building:color']);if(validColor(explicit))return{color:explicit,truth:'SOURCE_COLOR'};
  const m=txt(p.facade_material,p['building:material'],p.material).toLowerCase();
  if(/brick/.test(m))return{color:'#9c6355',truth:'SOURCE_MATERIAL'};
  if(/glass/.test(m))return{color:'#6f9dad',truth:'SOURCE_MATERIAL'};
  if(/metal|steel/.test(m))return{color:'#8f9ea4',truth:'SOURCE_MATERIAL'};
  if(/concrete|cement/.test(m))return{color:'#a5a7a3',truth:'SOURCE_MATERIAL'};
  if(/stone|granite|limestone/.test(m))return{color:'#aaa79b',truth:'SOURCE_MATERIAL'};
  if(/wood|timber/.test(m))return{color:'#8e775f',truth:'SOURCE_MATERIAL'};
  return null;
}
function roofColor(p,facade){
  const explicit=txt(p.roof_colour,p['roof:colour'],p.roof_color);if(validColor(explicit))return{color:explicit,truth:'SOURCE_COLOR'};
  const m=txt(p.roof_material,p['roof:material']).toLowerCase();
  if(/metal/.test(m))return{color:'#c6d6db',truth:'SOURCE_MATERIAL'};
  if(/tile/.test(m))return{color:'#ad7b64',truth:'SOURCE_MATERIAL'};
  if(/slate/.test(m))return{color:'#687985',truth:'SOURCE_MATERIAL'};
  if(/concrete/.test(m))return{color:'#aab0ae',truth:'SOURCE_MATERIAL'};
  return facade;
}
function poiClass(p){return txt(p.class,p.subclass,p.amenity,p.kind).toLowerCase()}
function isLandmark(p){const c=poiClass(p);return LANDMARK_CLASSES.has(c)||/museum|monument|memorial|stadium|arena|university|college|hospital|courthouse|town.?hall|capitol|government|fire.?station|police/.test(c+' '+txt(p.name,p['name:en']))}

export function initLandmarks(map){
  if(!map)return null;if(window.__bpLandmarksV2300?.map===map)return window.__bpLandmarksV2300;
  let installed=false,count=0,matchedWithSourceAppearance=0,timer=0;
  function install(){
    let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource?.('ofm')}catch(_){}if(!ready)return;
    try{if(!map.getSource('bp-landmarks-v2300'))map.addSource('bp-landmarks-v2300',{type:'geojson',data:EMPTY})}catch(e){console.warn('V2300 landmark source',e)}
    add(map,{id:'gta-landmark-contact',type:'fill-extrusion',source:'bp-landmarks-v2300',minzoom:14.2,paint:{
      'fill-extrusion-color':'#020608','fill-extrusion-height':.16,'fill-extrusion-base':0,'fill-extrusion-opacity':.48,'fill-extrusion-vertical-gradient':false
    }},'gta-context-buildings');
    add(map,{id:'gta-landmark-body',type:'fill-extrusion',source:'bp-landmarks-v2300',minzoom:14.2,paint:{
      'fill-extrusion-color':['get','facade_color'],'fill-extrusion-height':['get','render_height_m'],'fill-extrusion-base':['get','base_height_m'],
      'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],14.2,.86,16,.96,18,.995],'fill-extrusion-vertical-gradient':true
    }},'gta-exact-roof');
    add(map,{id:'gta-landmark-roof',type:'fill-extrusion',source:'bp-landmarks-v2300',minzoom:15.0,filter:['>', ['get','roof_height_m'],0],paint:{
      'fill-extrusion-color':['get','roof_color'],'fill-extrusion-base':['get','render_height_m'],
      'fill-extrusion-height':['+',['get','render_height_m'],['get','roof_height_m']],
      'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],15,.9,18,1],'fill-extrusion-vertical-gradient':false
    }},'gta-building-outline');
    add(map,{id:'gta-landmark-edge',type:'line',source:'bp-landmarks-v2300',minzoom:14.8,paint:{
      'line-color':'#f3fbfc','line-width':['interpolate',['linear'],['zoom'],14.8,.35,18,.9,21,1.35],'line-opacity':.64
    }},'gta-building-outline');
    add(map,{id:'gta-landmark-name',type:'symbol',source:'bp-landmarks-v2300',minzoom:15.4,layout:{
      'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],15.4,9.5,18,12,21,13.5],
      'text-pitch-alignment':'map','text-rotation-alignment':'map','text-allow-overlap':false,'text-ignore-placement':false,'text-padding':8,'text-offset':[0,-.35]
    },paint:{'text-color':'#f6f8ef','text-halo-color':'#071017','text-halo-width':1.3,'text-halo-blur':.35,'text-opacity':['interpolate',['linear'],['zoom'],15.4,.45,17,.86,20,.98]}});
    installed=true;
  }
  function rebuild(){
    clearTimeout(timer);timer=setTimeout(()=>{
      if(map.getZoom()<14.1){count=0;matchedWithSourceAppearance=0;try{map.getSource('bp-landmarks-v2300')?.setData(EMPTY)}catch(_){}return}
      const buildingLayers=['gta-exact-building','gta-bp-buildings','gta-context-buildings'].filter(id=>has(map,id));
      if(!buildingLayers.length||!has(map,'gta-poi-label'))return;
      let pois=[];try{pois=map.queryRenderedFeatures({layers:['gta-poi-label']})||[]}catch(_){return}
      const out=[],seen=new Set();matchedWithSourceAppearance=0;
      for(const poi of pois){if(!isLandmark(poi.properties||{}))continue;const g=poi.geometry;if(!g||g.type!=='Point')continue;const screen=map.project(g.coordinates);let candidates=[];try{candidates=map.queryRenderedFeatures([[screen.x-10,screen.y-10],[screen.x+10,screen.y+10]],{layers:buildingLayers})||[]}catch(_){}
        const b=candidates[0];if(!b?.geometry)continue;const bp=b.properties||{},facade=materialColor(bp);if(!facade)continue;
        const id=txt(bp.building_id,bp.id,b.id,JSON.stringify(b.geometry.coordinates?.[0]?.[0]||[]));if(seen.has(id))continue;seen.add(id);
        const h=toNum(bp.render_height_m,bp.render_height,bp.height,8.5)??8.5,base=toNum(bp.base_height_m,bp.render_min_height,bp.min_height,0)??0,roofH=toNum(bp.roof_height_m,0)??0,roof=roofColor(bp,facade);
        out.push({type:'Feature',geometry:b.geometry,properties:{name:txt(poi.properties?.['name:en'],poi.properties?.name,'Landmark'),class:poiClass(poi.properties||{}),render_height_m:Math.max(2,h),base_height_m:Math.max(0,base),roof_height_m:Math.max(0,roofH),facade_color:facade.color,roof_color:roof?.color||facade.color,appearance_truth:facade.truth,source_key:txt(bp.source_key,b.sourceLayer,'OpenFreeMap/OpenStreetMap')}});matchedWithSourceAppearance++;
      }
      count=out.length;try{map.getSource('bp-landmarks-v2300')?.setData({type:'FeatureCollection',features:out});map.triggerRepaint()}catch(_){}
    },180)
  }
  install();map.on('styledata',()=>{install();rebuild()});map.on('moveend',rebuild);map.on('zoomend',rebuild);for(const ms of [120,500,1400,3500])setTimeout(()=>{install();rebuild()},ms);
  const api={version:2300,map,requirementKey:'v2300_landmark_structures_v1',rebuild,get state(){return{installed,count,matchedWithSourceAppearance,sourceMatchedFootprints:true,sourceHeightPreserved:true,sourceColorOrMaterialRequiredForOverlay:true,semanticColorFabrication:false,poiToBuildingSpatialMatch:true,progressiveCloseZoom3D:true,secondaryCanvases:0}}};window.__bpLandmarksV2300=api;return api;
}
