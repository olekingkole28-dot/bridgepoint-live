const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const add=(m,l,before)=>{try{if(!has(m,l.id))m.addLayer(l,before&&has(m,before)?before:undefined)}catch(e){console.warn('V2300 streetscape detail layer',l.id,e)}};
const zoom=(m,id,min,max=24)=>{try{if(has(m,id))m.setLayerZoomRange(id,min,max)}catch(_){}};

export function initStreetscapeDetail(map){
 if(!map)return null;if(window.__bpStreetscapeDetailV2300?.map===map)return window.__bpStreetscapeDetailV2300;
 let installed=false;
 function install(){
  let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource?.('ofm')}catch(_){}if(!ready)return;

  // Use legacy filter syntax supported by the bundled MapLibre v1995 runtime.
  const service=['all',['==','class','service'],['!in','subclass','pedestrian','footway','path','cycleway','steps','sidewalk']];
  const path=['any',['==','class','path'],['in','subclass','pedestrian','footway','path','cycleway','sidewalk','steps']];
  const crossing=['in','subclass','crossing','crosswalk'];
  const major=['in','class','motorway','trunk','primary','secondary'];

  // Source-backed service/access pavement. This supplements the existing local-road layer;
  // it does not replace road geometry or fabricate streets where the vector source has none.
  add(map,{id:'gta-service-drive-casing-v2300',type:'line',source:'ofm','source-layer':'transportation',minzoom:10.4,filter:service,layout:{'line-cap':'round','line-join':'round'},paint:{
    'line-color':'#050708','line-width':['interpolate',['exponential',1.25],['zoom'],10.4,.75,13,1.7,16,4.1,20,9.2],'line-opacity':['interpolate',['linear'],['zoom'],10.4,.35,12,.62,15,.9]
  }},'gta-road-local');
  add(map,{id:'gta-service-drive-v2300',type:'line',source:'ofm','source-layer':'transportation',minzoom:10.4,filter:service,layout:{'line-cap':'round','line-join':'round'},paint:{
    'line-color':'#171b1e','line-width':['interpolate',['exponential',1.25],['zoom'],10.4,.48,13,1.18,16,3.15,20,7.5],'line-opacity':['interpolate',['linear'],['zoom'],10.4,.38,12,.68,15,.96]
  }},'gta-road-local');

  // Sidewalks, pedestrian paths and cycle paths remain tied to the transportation source.
  add(map,{id:'gta-pedestrian-casing-v2300',type:'line',source:'ofm','source-layer':'transportation',minzoom:11.25,filter:path,layout:{'line-cap':'round','line-join':'round'},paint:{
    'line-color':'#1b2022','line-width':['interpolate',['linear'],['zoom'],11.25,.55,15,1.5,19,3.4],'line-opacity':['interpolate',['linear'],['zoom'],11.25,.3,14,.6,17,.82]
  }},'gta-context-buildings');
  add(map,{id:'gta-pedestrian-surface-v2300',type:'line',source:'ofm','source-layer':'transportation',minzoom:11.25,filter:path,layout:{'line-cap':'round','line-join':'round'},paint:{
    'line-color':['match',['downcase',['coalesce',['get','subclass'],'']],'cycleway','#7c9c9f','steps','#b4aaa0','#a8ada9'],
    'line-width':['interpolate',['linear'],['zoom'],11.25,.3,15,1.0,19,2.6],'line-opacity':['interpolate',['linear'],['zoom'],11.25,.28,14,.62,17,.9]
  }},'gta-context-buildings');

  // Parking-aisle / access-road white guidance appears later than the black pavement itself.
  add(map,{id:'gta-service-guide-v2300',type:'line',source:'ofm','source-layer':'transportation',minzoom:13.1,filter:service,layout:{'line-cap':'round','line-join':'round'},paint:{
    'line-color':'#eef2ef','line-width':['interpolate',['linear'],['zoom'],13.1,.1,17,.3,20,.55],'line-opacity':['interpolate',['linear'],['zoom'],13.1,.2,16,.52,19,.78],'line-dasharray':[3,4]
  }},'gta-context-buildings');

  // Crossings are shown only when the source explicitly classifies a crossing/path segment.
  add(map,{id:'gta-crosswalk-v2300',type:'line',source:'ofm','source-layer':'transportation',minzoom:14.1,filter:crossing,layout:{'line-cap':'butt'},paint:{
    'line-color':'#f7f7f2','line-width':['interpolate',['linear'],['zoom'],14.1,.7,17,1.7,20,3.2],'line-opacity':.92,'line-dasharray':[.45,.7]
  }},'gta-context-buildings');

  // Edge lines give major roads recognizable pavement width at medium zoom while preserving
  // the existing black casing and yellow/white center-line hierarchy.
  add(map,{id:'gta-road-edge-v2300',type:'line',source:'ofm','source-layer':'transportation',minzoom:9.3,filter:major,layout:{'line-cap':'round','line-join':'round'},paint:{
    'line-color':'#f0f2ed','line-width':['interpolate',['linear'],['zoom'],9.3,.18,13,.35,17,.7,20,1.1],
    'line-gap-width':['interpolate',['exponential',1.25],['zoom'],9.3,1.2,13,2.8,17,7.5,20,13],
    'line-opacity':['interpolate',['linear'],['zoom'],9.3,.18,12,.4,15,.68,18,.82]
  }},'gta-road-major-center-v2300');

  // Pull known existing road-detail layers outward too; no geometry is duplicated.
  for(const [id,min] of [['gta-road-supplement-casing-bp',10.0],['gta-road-supplement-bp',10.0],['gta-local-street-name-v2300',12.1]])zoom(map,id,min);
  installed=true;map.triggerRepaint?.();
 }
 install();map.on?.('styledata',install);for(const ms of [100,420,1200,3000])setTimeout(install,ms);
 const api={version:2300,map,requirementKey:'v2300_streetscape_detail_v1',install,get state(){return{installed,sourceBackedServiceDrives:has(map,'gta-service-drive-v2300'),sourceBackedPedestrianPaths:has(map,'gta-pedestrian-surface-v2300'),sourceBackedCrossings:has(map,'gta-crosswalk-v2300'),parkingAisleGuidance:has(map,'gta-service-guide-v2300'),majorRoadEdgeLines:has(map,'gta-road-edge-v2300'),legacyMapLibreFilters:true,pavementPalette:'BLACK_YELLOW_WHITE',secondaryCanvases:0}}};window.__bpStreetscapeDetailV2300=api;return api;
}
