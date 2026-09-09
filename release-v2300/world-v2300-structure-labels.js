const EMPTY={type:'FeatureCollection',features:[]};
const TARGET=new Set(['fuel','gas_station','fire_station','hospital','clinic','doctors','police','government','town_hall','courthouse','office','school','college','university','library','post','post_office','bank','pharmacy','supermarket','hotel']);
const MOBILE=innerWidth<=900||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const LABEL_MIN=MOBILE?13.6:13.15;
const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const text=(...v)=>{for(const x of v){const s=String(x??'').trim();if(s)return s}return''};
function kind(p){return text(p.class,p.subclass,p.amenity,p.shop,p.office,p.tourism,p.kind).toLowerCase()}
function wanted(p){const k=kind(p);return TARGET.has(k)||/fire.?station|hospital|clinic|police|court|town.?hall|government|municip|fuel|gas.?station|office|school|college|university|library|post.?office|pharmacy|supermarket|hotel/.test(k)}
function center(g){const pts=[];const walk=v=>{if(!Array.isArray(v))return;if(v.length>=2&&typeof v[0]==='number'&&typeof v[1]==='number'){pts.push(v);return}for(const x of v)walk(x)};walk(g?.coordinates);if(!pts.length)return null;let x=0,y=0;for(const p of pts){x+=p[0];y+=p[1]}return[x/pts.length,y/pts.length]}
function categoryColor(){return['match',['get','class'],'hospital','#ffb6c0','clinic','#ffb6c0','doctors','#ffb6c0','fire_station','#ff8d76','police','#9bcfff','fuel','#ffe07d','gas_station','#ffe07d','government','#d5c2ff','town_hall','#d5c2ff','courthouse','#d5c2ff','office','#d6e4e7','school','#bfe8ff','college','#bfe8ff','university','#bfe8ff','pharmacy','#c4ffc9','supermarket','#ffe4a5','hotel','#ffd6aa','#d7e8ea']}
function addLabel(map,base){
  if(has(map,base.id))return true;
  try{map.addLayer(base);return true}catch(e){
    if(base.layout?.['symbol-z-elevate']!=null){const fallback={...base,layout:{...base.layout}};delete fallback.layout['symbol-z-elevate'];try{map.addLayer(fallback);return true}catch(e2){console.warn('V2300 structure label fallback',e2)}}
    console.warn('V2300 structure label layer',e);return false
  }
}

export function initStructureLabels(map){
  if(!map)return null;if(window.__bpStructureLabelsV2300?.map===map)return window.__bpStructureLabelsV2300;
  let installed=false,matched=0,elevated=false,timer=0;
  function install(){
    let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource?.('ofm')}catch(_){}if(!ready)return;
    try{if(!map.getSource('bp-structure-labels-v2300'))map.addSource('bp-structure-labels-v2300',{type:'geojson',data:EMPTY})}catch(e){console.warn('V2300 structure label source',e)}
    addLabel(map,{id:'gta-structure-label-v2300',type:'symbol',source:'bp-structure-labels-v2300',minzoom:LABEL_MIN,layout:{
      'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],LABEL_MIN,8.2,15,9.4,17,10.8,20,12.8],
      'text-pitch-alignment':'map','text-rotation-alignment':'map','text-keep-upright':true,'text-anchor':'center','text-offset':[0,-.35],
      'text-allow-overlap':false,'text-ignore-placement':false,'text-padding':7,'symbol-z-elevate':true
    },paint:{'text-color':categoryColor(),'text-opacity':['interpolate',['linear'],['zoom'],LABEL_MIN,.22,15,.48,17,.82,19,.96],'text-halo-color':'#071017','text-halo-width':1.25,'text-halo-blur':.35}});
    try{map.setLayerZoomRange('gta-structure-label-v2300',LABEL_MIN,24)}catch(_){}
    try{elevated=map.getLayoutProperty('gta-structure-label-v2300','symbol-z-elevate')===true}catch(_){elevated=false}
    installed=has(map,'gta-structure-label-v2300');
  }
  function rebuild(){
    clearTimeout(timer);timer=setTimeout(()=>{
      if(map.getZoom()<LABEL_MIN-.2){matched=0;try{map.getSource('bp-structure-labels-v2300')?.setData(EMPTY)}catch(_){}return}
      const buildingLayers=['gta-exact-building','gta-bp-buildings','gta-context-buildings'].filter(id=>has(map,id));if(!buildingLayers.length)return;
      let pois=[];try{pois=map.querySourceFeatures('ofm',{sourceLayer:'poi'})||[]}catch(_){try{pois=map.queryRenderedFeatures({layers:['gta-poi-label']})||[]}catch(__){return}}
      const out=[],seen=new Set(),cap=MOBILE?140:420;
      for(const poi of pois){if(out.length>=cap)break;const pp=poi.properties||{};if(!wanted(pp)||!poi.geometry||poi.geometry.type!=='Point')continue;const name=text(pp['name:en'],pp.name);if(!name)continue;
        const p=map.project(poi.geometry.coordinates);let bs=[];try{bs=map.queryRenderedFeatures([[p.x-14,p.y-14],[p.x+14,p.y+14]],{layers:buildingLayers})||[]}catch(_){}const b=bs[0];if(!b?.geometry)continue;
        const c=center(b.geometry);if(!c)continue;const bp=b.properties||{},id=text(bp.building_id,b.id,`${c[0].toFixed(6)}|${c[1].toFixed(6)}`);if(seen.has(id))continue;seen.add(id);
        out.push({type:'Feature',geometry:{type:'Point',coordinates:c},properties:{name,class:kind(pp),building_id:id,source_key:text(bp.source_key,b.sourceLayer,'OpenFreeMap/OpenStreetMap'),render_height_m:Number(bp.render_height_m||bp.render_height||bp.height||0)||0}})
      }
      matched=out.length;try{map.getSource('bp-structure-labels-v2300')?.setData({type:'FeatureCollection',features:out});map.triggerRepaint?.()}catch(_){}
    },MOBILE?210:145)
  }
  install();map.on?.('styledata',()=>{install();rebuild()});map.on?.('moveend',rebuild);map.on?.('zoomend',rebuild);for(const ms of [120,500,1400,3400])setTimeout(()=>{install();rebuild()},ms);
  const api={version:2300,map,requirementKey:'v2300_structure_labels_v1',rebuild,get state(){return{installed,matchedStructures:matched,labelMinZoom:LABEL_MIN,buildingFootprintAnchored:true,sourcePOIMatched:true,roofElevationApplied:elevated,roofElevationFallbackSafe:true,collisionSafe:true,mapAligned:true,secondaryCanvases:0}}};window.__bpStructureLabelsV2300=api;return api;
}
