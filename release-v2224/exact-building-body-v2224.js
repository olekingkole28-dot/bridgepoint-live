(()=>{
'use strict';
if(window.__bpExactBuildingBodyV2224Loaded)return;
window.__bpExactBuildingBodyV2224Loaded=true;
const VERSION=2224,ORIGIN='bp97-buildings',SRC='bp2224-exact-buildings',LAYER='bp2224-exact-building-body',EMPTY={type:'FeatureCollection',features:[]};
let map=null,state=null,bound=false,timer=0,count=0,lastHash='';
const has=id=>{try{return !!map?.getLayer?.(id)}catch(_){return false}};
const vis=(id,on)=>{try{if(has(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}};
function sourceData(){
 try{
  const s=map?.getSource?.(ORIGIN);
  for(const v of [s?._data,s?._options?.data,map?.getStyle?.()?.sources?.[ORIGIN]?.data]){
   if(v?.type==='FeatureCollection'&&Array.isArray(v.features))return v;
   if(typeof v==='string'){try{const j=JSON.parse(v);if(j?.type==='FeatureCollection'&&Array.isArray(j.features))return j}catch(_){}}
  }
 }catch(_){}
 try{return{type:'FeatureCollection',features:map.querySourceFeatures(ORIGIN)||[]}}catch(_){return EMPTY}
}
function keyOf(f,i){const p=f?.properties||{};return String(p.building_id||p.source_record_id||p.property_id||f?.id||JSON.stringify(f?.geometry?.coordinates?.[0]?.[0]||f?.geometry?.coordinates?.[0]||i))}
function cleanFeature(f,i){
 const p=f?.properties||{},g=f?.geometry;if(!g||!['Polygon','MultiPolygon'].includes(g.type))return null;
 const h=Math.max(3,Number(p.render_height_m??p.height_m??p.height??8.5)||8.5),b=Math.max(0,Number(p.base_height_m??p.min_height_m??0)||0);
 return{type:'Feature',id:String(p.building_id||f.id||i),geometry:g,properties:{...p,building_id:String(p.building_id||f.id||i),render_height_m:h,base_height_m:b,height_truth:String(p.height_truth||'UNKNOWN')}}
}
function ensure(){
 if(!map)return;
 try{if(!map.getSource(SRC))map.addSource(SRC,{type:'geojson',data:EMPTY})}catch(e){console.warn('BP2224 source',e)}
 try{if(!has(LAYER))map.addLayer({id:LAYER,type:'fill-extrusion',source:SRC,minzoom:12,paint:{
  'fill-extrusion-color':['match',['get','height_truth'],'SOURCE_BACKED','#aebbc1','FLOOR_DERIVED_VISUAL','#9eabb2','GENERIC_VISUAL_ESTIMATE','#89969d','#96a4ab'],
  'fill-extrusion-height':['get','render_height_m'],
  'fill-extrusion-base':['get','base_height_m'],
  'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],12,.68,14,.84,17,.92,20,.96],
  'fill-extrusion-vertical-gradient':true
 }},has('bp2221-exact-building-outline')?'bp2221-exact-building-outline':(has('labels')?'labels':undefined))}catch(e){console.warn('BP2224 layer',e)}
}
function sync(){
 clearTimeout(timer);timer=setTimeout(()=>{
  ensure();const fc=sourceData(),seen=new Set(),features=[];
  for(let i=0;i<(fc.features||[]).length;i++){
   const raw=fc.features[i],k=keyOf(raw,i);if(seen.has(k))continue;seen.add(k);const f=cleanFeature(raw,i);if(f)features.push(f)
  }
  const hash=`${features.length}:${features[0]?.properties?.building_id||''}:${features[features.length-1]?.properties?.building_id||''}`;
  if(hash!==lastHash){lastHash=hash;count=features.length;try{map.getSource(SRC)?.setData({type:'FeatureCollection',features})}catch(e){console.warn('BP2224 setData',e)}}else count=features.length;
  vis('bp2223-exact-building-material',false);vis(LAYER,true);
  try{if(has('bp97-building'))map.setPaintProperty('bp97-building','fill-extrusion-opacity',.04)}catch(_){}
  try{if(has(LAYER)&&has('bp2221-exact-building-outline'))map.moveLayer(LAYER,'bp2221-exact-building-outline')}catch(_){}
  try{if(has('bp2221-exact-building-outline')&&has('bp2221-exact-roof'))map.moveLayer('bp2221-exact-building-outline','bp2221-exact-roof')}catch(_){}
  map?.triggerRepaint?.();
  const e=document.getElementById('mapStatus');if(e&&Number(map?.getZoom?.()||0)>=12)e.textContent=`BridgePoint world · ${count.toLocaleString()} exact 3D building bodies · roofs + parcel truth · satellite + 3DEP relief`;
 },45)
}
function bind(){
 state=window.__bp97MapState;map=state?.map;if(!state?.ready||!map){setTimeout(bind,100);return}if(bound)return;bound=true;
 ensure();sync();
 map.on('sourcedata',e=>{if(e?.sourceId===ORIGIN)sync()});
 map.on('moveend',sync);map.on('zoomend',sync);
 for(const ms of [150,500,1200,2600])setTimeout(sync,ms);
 window.__bpExactBuildingBodyV2224={version:VERSION,mode:'INDEPENDENT_DEDUPED_BRIDGEPOINT_EXACT_BODY_SOURCE',originSource:ORIGIN,renderSource:SRC,renderLayer:LAYER,independentGeoJSON:true,deduped:true,neutralPhysicalMaterial:true,interactionLayerPreserved:true,noContinuousLoop:true,secondaryWebGL:false,getState:()=>({version:VERSION,count,zoom:map?.getZoom?.()||0,layerVisible:has(LAYER)?(map.getLayoutProperty(LAYER,'visibility')||'visible'):'missing',sourceReady:!!map?.getSource?.(SRC)})};
 console.info('BridgePoint V2224 exact building body fix ready');
}
bind();
})();
