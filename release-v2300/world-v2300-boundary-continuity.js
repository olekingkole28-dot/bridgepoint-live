const COUNTRY='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const ADMIN1='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson';
const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const add=(m,l,before)=>{try{if(!has(m,l.id))m.addLayer(l,before&&has(m,before)?before:undefined)}catch(e){console.warn('V2300 boundary continuity layer',l.id,e)}};

export function initBoundaryContinuity(map){
 if(!map)return null;if(window.__bpBoundaryContinuityV2300?.map===map)return window.__bpBoundaryContinuityV2300;let installed=false;
 function install(){
  let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource?.('ofm')}catch(_){}if(!ready)return;
  try{if(!map.getSource('bp-world-country-continuity'))map.addSource('bp-world-country-continuity',{type:'geojson',data:COUNTRY,generateId:true})}catch(e){console.warn('V2300 country continuity source',e)}
  try{if(!map.getSource('bp-world-admin1-continuity'))map.addSource('bp-world-admin1-continuity',{type:'geojson',data:ADMIN1,generateId:true})}catch(e){console.warn('V2300 admin1 continuity source',e)}

  // Polygon outlines include coastal edges, eliminating the visual gaps that line-only tiled admin boundaries can show at coast/tile transitions.
  add(map,{id:'gta-world-country-continuity-casing',type:'line',source:'bp-world-country-continuity',minzoom:1.5,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#02080b','line-width':['interpolate',['linear'],['zoom'],1.5,1.8,5,2.8,9,4.2,14,5.2],'line-opacity':['interpolate',['linear'],['zoom'],1.5,.82,6,.86,10,.7,14,.38]}},'gta-state');
  add(map,{id:'gta-world-country-continuity',type:'line',source:'bp-world-country-continuity',minzoom:1.5,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ecfdff','line-width':['interpolate',['linear'],['zoom'],1.5,.72,5,1.05,9,1.55,14,1.9],'line-opacity':['interpolate',['linear'],['zoom'],1.5,.9,6,.94,10,.72,14,.38]}},'gta-state');
  add(map,{id:'gta-world-admin1-continuity-casing',type:'line',source:'bp-world-admin1-continuity',minzoom:3.2,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#061015','line-width':['interpolate',['linear'],['zoom'],3.2,1.4,6,2.1,10,3.1,14,3.8],'line-opacity':['interpolate',['linear'],['zoom'],3.2,.46,6,.58,10,.42,14,.18]}},'gta-state');
  add(map,{id:'gta-world-admin1-continuity',type:'line',source:'bp-world-admin1-continuity',minzoom:3.2,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#d7f8fb','line-width':['interpolate',['linear'],['zoom'],3.2,.4,6,.72,10,1.05,14,1.2],'line-opacity':['interpolate',['linear'],['zoom'],3.2,.58,6,.72,10,.46,14,.18]}},'gta-state');
  // Existing OpenFreeMap admin-4 layer remains the precise higher-zoom detail layer.
  try{if(has(map,'gta-state')){map.setPaintProperty('gta-state','line-opacity',['interpolate',['linear'],['zoom'],2.5,.78,5,.9,9,.96,15,1]);map.setLayoutProperty('gta-state','line-cap','round');map.setLayoutProperty('gta-state','line-join','round')}}catch(_){}
  installed=true;map.triggerRepaint();
 }
 install();map.on('styledata',install);for(const ms of [80,350,1100,3000])setTimeout(install,ms);
 const api={version:2300,map,requirementKey:'v2300_world_boundary_continuity_v1',install,get state(){return{installed,countryCoastAndBorderFallback:true,admin1Fallback:true,worldwide:true,untiledGeojsonFallback:true,detailedVectorBoundariesPreserved:true,terrainSurfaceAttached:true,secondaryCanvases:0,sources:{countries:'Natural Earth 1:50m admin-0',admin1:'Natural Earth 1:50m states/provinces',detail:'OpenFreeMap/OpenStreetMap vector boundaries'}}}};window.__bpBoundaryContinuityV2300=api;return api;
}
