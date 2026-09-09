const OPP_COLOR=['match',['downcase',['coalesce',['get','opportunity_family'],'']],'roofing','#ff4ea3','construction','#ffb34a','fire','#ff5a43','water','#49d8ff','environmental','#9be35c','insurance','#a98cff','commercial','#ffd36a','#f0bf55'];
const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const same=a=>JSON.stringify(a)===JSON.stringify(OPP_COLOR);

export function initOpportunitySync(map){
  if(!map)return null;if(window.__bpOpportunitySyncV2300?.map===map)return window.__bpOpportunitySyncV2300;
  let installed=false,roofElevated=false,bodySynced=false,iconSynced=false,outlineSynced=false;
  function install(){
    let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource?.('opportunities')}catch(_){}if(!ready)return;
    if(!has(map,'gta-opportunity-body')||!has(map,'gta-opportunity-icon'))return;
    try{map.setPaintProperty('gta-opportunity-body','fill-extrusion-color',OPP_COLOR)}catch(e){console.warn('V2300 opportunity body sync',e)}
    try{if(has(map,'gta-opportunity-outline'))map.setPaintProperty('gta-opportunity-outline','line-color',OPP_COLOR)}catch(e){console.warn('V2300 opportunity outline sync',e)}
    try{map.setPaintProperty('gta-opportunity-icon','text-color',OPP_COLOR)}catch(e){console.warn('V2300 opportunity icon sync',e)}
    try{map.setLayoutProperty('gta-opportunity-icon','text-allow-overlap',false);map.setLayoutProperty('gta-opportunity-icon','text-ignore-placement',false);map.setLayoutProperty('gta-opportunity-icon','text-padding',7);map.setLayoutProperty('gta-opportunity-icon','text-pitch-alignment','map');map.setLayoutProperty('gta-opportunity-icon','text-rotation-alignment','map')}catch(_){}
    try{map.setLayoutProperty('gta-opportunity-icon','symbol-z-elevate',true);roofElevated=map.getLayoutProperty('gta-opportunity-icon','symbol-z-elevate')===true}catch(_){roofElevated=false}
    try{bodySynced=same(map.getPaintProperty('gta-opportunity-body','fill-extrusion-color'))}catch(_){bodySynced=false}
    try{iconSynced=same(map.getPaintProperty('gta-opportunity-icon','text-color'))}catch(_){iconSynced=false}
    try{outlineSynced=!has(map,'gta-opportunity-outline')||same(map.getPaintProperty('gta-opportunity-outline','line-color'))}catch(_){outlineSynced=false}
    installed=bodySynced&&iconSynced&&outlineSynced;
    map.triggerRepaint?.();
  }
  install();map.on?.('styledata',install);for(const ms of [80,300,900,2200])setTimeout(install,ms);
  const api={version:2300,map,requirementKey:'v2300_opportunity_building_sync_v1',install,colorExpression:OPP_COLOR,get state(){return{installed,bodyLayerPresent:has(map,'gta-opportunity-body'),iconLayerPresent:has(map,'gta-opportunity-icon'),outlineLayerPresent:has(map,'gta-opportunity-outline'),bodySynced,iconSynced,outlineSynced,buildingGeometrySource:'bridgepoint_opportunity_viewport_v2301 -> analytics.us_building_geometry_v700',sameCategoryColor:true,buildingPolygonAnchored:true,collisionSafe:true,roofElevationApplied:roofElevated,roofElevationFallbackSafe:true,secondaryCanvases:0}}};window.__bpOpportunitySyncV2300=api;return api;
}
