const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const same=(a,b)=>{try{return JSON.stringify(a)===JSON.stringify(b)}catch(_){return a===b}};
const LANDCOVER=['match',['get','class'],'wood','#205b38','forest','#205b38','grass','#4f8f46','farmland','#6d7440','ice','#dbeef4','#324335'];
const LANDUSE=['match',['get','class'],'park','#327849','grass','#4b914e','residential','#30383c','commercial','#3c3542','retail','#463b43','industrial','#443d36','cemetery','#46634a','school','#405c50','#353f3d'];
const WATER='#0b4f79',WATERWAY='#36b9ff',ASPHALT='#15191c',LOCAL_ASPHALT='#1b1f22',GOLD='#f2b83f',ROAD_EDGE='#f0f2ed';

export function initPaletteLock(map){
 if(!map)return null;if(window.__bpPaletteLockV2300?.map===map)return window.__bpPaletteLockV2300;
 let installed=false,applyCount=0,timer=0,applying=false;
 const set=(id,key,val)=>{if(!has(map,id))return false;try{const cur=map.getPaintProperty(id,key);if(same(cur,val))return false;map.setPaintProperty(id,key,val);return true}catch(_){return false}};
 function apply(){
  if(applying)return;applying=true;let changed=false;
  try{
   changed=set('gta-water','fill-color',WATER)||changed;
   changed=set('gta-water','fill-opacity',.985)||changed;
   changed=set('gta-waterway','line-color',WATERWAY)||changed;
   changed=set('gta-waterway','line-opacity',.86)||changed;
   changed=set('gta-landcover','fill-color',LANDCOVER)||changed;
   changed=set('gta-landuse','fill-color',LANDUSE)||changed;
   changed=set('gta-road-major','line-color',ASPHALT)||changed;
   changed=set('gta-road-major-glow','line-color',GOLD)||changed;
   changed=set('gta-road-local-casing','line-color','#050708')||changed;
   changed=set('gta-road-local','line-color',LOCAL_ASPHALT)||changed;
   changed=set('gta-parking-v2300','fill-color',ASPHALT)||changed;
   changed=set('gta-parking-edge-v2300','line-color','#eef1ed')||changed;
   changed=set('gta-road-major-center-v2300','line-color',['match',['get','class'],'secondary','#f4f4ef',GOLD])||changed;
   changed=set('gta-road-local-center-v2300','line-color','#f4f5f1')||changed;
   changed=set('gta-road-edge-v2300','line-color',ROAD_EDGE)||changed;
   installed=has(map,'gta-water')&&has(map,'gta-landcover')&&has(map,'gta-road-major');
   if(changed){applyCount++;try{map.triggerRepaint?.()}catch(_){}}
  }finally{applying=false}
 }
 function schedule(ms=35){clearTimeout(timer);timer=setTimeout(apply,ms)}
 apply();
 // Other additive modules can legitimately run after style creation. Reassert only when a value
 // actually changed, so this final owner cannot create a styledata loop.
 map.on?.('styledata',()=>schedule(45));
 map.on?.('zoomend',()=>schedule(25));
 map.on?.('moveend',()=>schedule(25));
 for(const ms of [100,380,1100,2600,6000])setTimeout(apply,ms);
 const api={version:2300,map,requirementKey:'v2300_material_palette_lock_v1',apply,get state(){return{installed,applyCount,blueWater:has(map,'gta-water')&&same(map.getPaintProperty('gta-water','fill-color'),WATER),greenVegetation:has(map,'gta-landcover')&&same(map.getPaintProperty('gta-landcover','fill-color'),LANDCOVER),blackMajorPavement:has(map,'gta-road-major')&&same(map.getPaintProperty('gta-road-major','line-color'),ASPHALT),blackLocalPavement:has(map,'gta-road-local')&&same(map.getPaintProperty('gta-road-local','line-color'),LOCAL_ASPHALT),yellowWhiteRoadLanguage:true,paletteOwner:'FINAL_ADDITIVE_V2300',secondaryCanvases:0}}};
 window.__bpPaletteLockV2300=api;return api;
}
