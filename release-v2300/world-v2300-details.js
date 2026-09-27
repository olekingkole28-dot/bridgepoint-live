import{EMPTY,TIER,rpc,bbox,clamp}from'./world-v2300-config.js';

const OPP_MIN=TIER==='LOW'?15.0:TIER==='HIGH'?13.9:14.4;
const OPP_ICON_MIN=TIER==='LOW'?16.3:TIER==='HIGH'?15.0:15.6;
const LABEL_DENSITY=TIER==='LOW'?.82:TIER==='HIGH'?1.06:.94;
const OPP_COLOR=['match',['downcase',['coalesce',['get','opportunity_family'],'']],'roofing','#ff4ea3','construction','#ffb34a','fire','#ff5a43','water','#49d8ff','environmental','#9be35c','insurance','#a98cff','commercial','#ffd36a','#f0bf55'];
const nameField=['coalesce',['get','name:en'],['get','name'],['get','name:latin'],['get','ref'],''];
const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const vis=(m,id,on)=>{try{if(has(m,id))m.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}};
const paint=(m,id,k,v)=>{try{if(has(m,id))m.setPaintProperty(id,k,v)}catch(_){}};
const add=(m,layer,before)=>{try{if(!has(m,layer.id))m.addLayer(layer,before&&has(m,before)?before:undefined)}catch(e){console.warn('V2300 detail layer',layer.id,e)}};

function solidStructures(map){
  // Keep distant continuity buildings inexpensive but make the BridgePoint/source-backed structures physical and opaque.
  paint(map,'gta-context-buildings','fill-extrusion-opacity',['interpolate',['linear'],['zoom'],11.2,.34,13,.52,15,.67,18,.78]);
  paint(map,'gta-bp-buildings','fill-extrusion-opacity',['interpolate',['linear'],['zoom'],11.4,.76,13,.88,15,.95,18,.985]);
  paint(map,'gta-exact-building','fill-extrusion-opacity',.995);
  paint(map,'gta-exact-roof','fill-extrusion-opacity',.998);
  paint(map,'gta-bp-building-edge','line-opacity',.72);
  paint(map,'gta-building-outline','line-opacity',.88);

  add(map,{id:'gta-bp-roof',type:'fill-extrusion',source:'bpBuildings','source-layer':'buildings',minzoom:13.5,paint:{
    'fill-extrusion-color':['match',['downcase',['coalesce',['get','roof_material'],'']],'metal','#c8d4d8','tile','#b26f55','slate','#667785','shingle','#857f7a','concrete','#aab0ae','#aebbc0'],
    'fill-extrusion-base':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],
    'fill-extrusion-height':['+',['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],['max',.18,['coalesce',['to-number',['get','roof_height_m']],.28]]],
    'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],13.5,.68,15,.9,18,.985],
    'fill-extrusion-vertical-gradient':false
  }},'gta-exact-building');

  add(map,{id:'gta-bp-structure-outline',type:'line',source:'bpBuildings','source-layer':'buildings',minzoom:14.2,paint:{
    'line-color':'#d2e3e7','line-width':['interpolate',['linear'],['zoom'],14.2,.28,18,.82,21,1.25],'line-opacity':.64
  }},'gta-exact-building');
}

function infrastructure(map){
  // 3D-looking track stack: ballast -> ties -> steel. All MapLibre lines stay terrain-draped and cost no extra WebGL context.
  vis(map,'gta-rail',false);
  const railFilter=['in',['get','class'],['literal',['rail','transit']]];
  add(map,{id:'gta-rail-ballast',type:'line',source:'ofm','source-layer':'transportation',minzoom:11.5,filter:railFilter,layout:{'line-cap':'round','line-join':'round'},paint:{
    'line-color':'#312f2b','line-width':['interpolate',['exponential',1.35],['zoom'],11.5,1.0,15,2.5,18,6.5,21,12.5],'line-opacity':.94
  }});
  add(map,{id:'gta-rail-ties',type:'line',source:'ofm','source-layer':'transportation',minzoom:14.0,filter:railFilter,layout:{'line-cap':'butt','line-join':'round'},paint:{
    'line-color':'#9a744b','line-width':['interpolate',['linear'],['zoom'],14,.8,18,2.2,21,4.2],'line-opacity':.9,'line-dasharray':[.45,1.05]
  }});
  add(map,{id:'gta-rail-steel',type:'line',source:'ofm','source-layer':'transportation',minzoom:12.5,filter:railFilter,layout:{'line-cap':'round','line-join':'round'},paint:{
    'line-color':'#d8e1e3','line-width':['interpolate',['linear'],['zoom'],12.5,.42,17,1.2,21,2.5],'line-opacity':.98
  }});
  add(map,{id:'gta-rail-highlight',type:'line',source:'ofm','source-layer':'transportation',minzoom:16.0,filter:railFilter,paint:{
    'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],16,.16,21,.62],'line-opacity':.7
  }});

  const bridgeFilter=['==',['coalesce',['get','brunnel'],''],'bridge'];
  add(map,{id:'gta-bridge-shadow',type:'line',source:'ofm','source-layer':'transportation',minzoom:11.5,filter:bridgeFilter,layout:{'line-cap':'round','line-join':'round'},paint:{
    'line-color':'#020609','line-width':['interpolate',['exponential',1.3],['zoom'],11.5,2.2,16,8,20,18],'line-opacity':.72,'line-blur':1.5
  }});
  add(map,{id:'gta-bridge-deck',type:'line',source:'ofm','source-layer':'transportation',minzoom:11.5,filter:bridgeFilter,layout:{'line-cap':'round','line-join':'round'},paint:{
    'line-color':'#b9d5da','line-width':['interpolate',['exponential',1.3],['zoom'],11.5,1.1,16,5.1,20,13],'line-opacity':.98
  }});
  add(map,{id:'gta-bridge-center',type:'line',source:'ofm','source-layer':'transportation',minzoom:15,filter:bridgeFilter,paint:{
    'line-color':'#f6d36a','line-width':['interpolate',['linear'],['zoom'],15,.26,20,.9],'line-opacity':.82,'line-dasharray':[2,2]
  }});
}

function landAttachedLabels(map){
  const common={
    'text-pitch-alignment':'map','text-rotation-alignment':'map','text-keep-upright':true,
    'text-allow-overlap':false,'text-ignore-placement':false,'text-padding':4
  };
  add(map,{id:'gta-state-label',type:'symbol',source:'ofm','source-layer':'place',minzoom:2.7,maxzoom:8.4,filter:['in',['get','class'],['literal',['state','province']]],layout:{...common,'text-field':nameField,'text-font':['Noto Sans Regular'],'text-transform':'uppercase','text-size':['interpolate',['linear'],['zoom'],3,12*LABEL_DENSITY,6,18*LABEL_DENSITY,8,22*LABEL_DENSITY],'symbol-sort-key':['coalesce',['get','rank'],5]},paint:{'text-color':'#d8edf0','text-opacity':['interpolate',['linear'],['zoom'],3,.72,6,.9,8,.54],'text-halo-color':'#071017','text-halo-width':1.4,'text-halo-blur':.5}});

  // OpenMapTiles may expose county names either as place class=county or on admin-6 boundary lines; support both without extra source cost.
  add(map,{id:'gta-county-place-label',type:'symbol',source:'ofm','source-layer':'place',minzoom:6.0,maxzoom:12.8,filter:['==',['get','class'],'county'],layout:{...common,'text-field':nameField,'text-size':['interpolate',['linear'],['zoom'],6,10,10,14,12.8,15]},paint:{'text-color':'#9fb8bd','text-opacity':.72,'text-halo-color':'#071017','text-halo-width':1.1}});
  add(map,{id:'gta-county-boundary-label',type:'symbol',source:'ofm','source-layer':'boundary',minzoom:7.0,maxzoom:13.0,filter:['all',['==',['get','admin_level'],6],['has','name']],layout:{...common,'symbol-placement':'line','symbol-spacing':460,'text-field':nameField,'text-size':['interpolate',['linear'],['zoom'],7,9,11,12.5,13,13.5]},paint:{'text-color':'#8ea7ad','text-opacity':.62,'text-halo-color':'#071017','text-halo-width':1}});

  add(map,{id:'gta-water-label',type:'symbol',source:'ofm','source-layer':'water_name',minzoom:3.2,layout:{...common,'text-field':nameField,'text-size':['interpolate',['linear'],['zoom'],3.2,10,8,13,14,15,18,17],'text-letter-spacing':.08},paint:{'text-color':'#72d9ff','text-opacity':.78,'text-halo-color':'#06121a','text-halo-width':1.2}});

  add(map,{id:'gta-road-name',type:'symbol',source:'ofm','source-layer':'transportation_name',minzoom:12.7,layout:{...common,'symbol-placement':'line','symbol-spacing':310,'text-field':nameField,'text-size':['interpolate',['linear'],['zoom'],12.7,8.5,15,10.5,18,12.2,21,13.2],'text-letter-spacing':.015},paint:{'text-color':'#dff9fa','text-opacity':['interpolate',['linear'],['zoom'],12.7,.3,15,.7,18,.92],'text-halo-color':'#081116','text-halo-width':1.1,'text-halo-blur':.35}});

  add(map,{id:'gta-poi-label',type:'symbol',source:'ofm','source-layer':'poi',minzoom:15.0,filter:['has','name'],layout:{...common,'text-field':nameField,'text-size':['interpolate',['linear'],['zoom'],15,8.5,17,10.5,20,12.5],'text-anchor':'center','text-offset':[0,0],'symbol-sort-key':['coalesce',['get','rank'],10]},paint:{'text-color':['match',['get','class'],'hospital','#ffb6c0','fire_station','#ff8d76','police','#9bcfff','fuel','#ffe07d','park','#9ee7a0','government','#d5c2ff','office','#d6e4e7','attraction','#ffd58c','monument','#ffd58c','#d7e8ea'],'text-opacity':['interpolate',['linear'],['zoom'],15,.38,17,.78,19,.94],'text-halo-color':'#071017','text-halo-width':1.15,'text-halo-blur':.35}});
}

function opportunityLayers(map){
  if(!map.getSource('opportunities'))try{map.addSource('opportunities',{type:'geojson',data:EMPTY})}catch(e){console.warn('V2300 opportunity source',e)}
  add(map,{id:'gta-opportunity-body',type:'fill-extrusion',source:'opportunities',minzoom:OPP_MIN,paint:{
    'fill-extrusion-color':OPP_COLOR,
    'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],
    'fill-extrusion-base':0,
    'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],OPP_MIN,.76,16,.92,19,.98],
    'fill-extrusion-vertical-gradient':true
  }},'gta-exact-roof');
  add(map,{id:'gta-opportunity-outline',type:'line',source:'opportunities',minzoom:OPP_MIN,paint:{
    'line-color':OPP_COLOR,'line-width':['interpolate',['linear'],['zoom'],OPP_MIN,1.2,17,2.4,20,3.4],'line-opacity':.95,'line-blur':.25
  }});
  add(map,{id:'gta-opportunity-icon',type:'symbol',source:'opportunities',minzoom:OPP_ICON_MIN,layout:{
    'text-field':'◆','text-size':['interpolate',['linear'],['zoom'],OPP_ICON_MIN,10,18,14,21,17],
    'text-pitch-alignment':'map','text-rotation-alignment':'map','text-allow-overlap':false,'text-ignore-placement':false,'text-padding':6
  },paint:{'text-color':OPP_COLOR,'text-halo-color':'#071017','text-halo-width':1.5,'text-opacity':.98}});
}

function createOpportunityLoader(map){
  let seq=0,timer=0,lastCount=0;
  async function load(force=false){
    if(map.getZoom()<OPP_MIN-.4){lastCount=0;try{map.getSource('opportunities')?.setData(EMPTY)}catch(_){}return}
    const my=++seq,b=bbox(map,.04),limit=TIER==='LOW'?360:TIER==='HIGH'?1200:700;
    try{
      const d=await rpc('bridgepoint_opportunity_viewport_v2301',{p_min_lat:b.south,p_max_lat:b.north,p_min_lng:b.west,p_max_lng:b.east,p_limit:limit},6500);
      if(my!==seq||!d||d.locked)return;
      const features=Array.isArray(d.features)?d.features:[];lastCount=features.length;
      map.getSource('opportunities')?.setData({type:'FeatureCollection',features});
    }catch(e){if(force)console.warn('V2300 opportunity viewport',e?.message||e)}
  }
  function schedule(delay=160){clearTimeout(timer);timer=setTimeout(()=>load(false),delay)}
  map.on('moveend',()=>schedule(130));map.on('zoomend',()=>schedule(90));
  for(const ms of [250,1000,2800])setTimeout(()=>load(false),ms);
  return{load,get count(){return lastCount}};
}

export function initDetails(map){
  if(!map)return null;if(window.__bpWorldDetailsV2301?.map===map)return window.__bpWorldDetailsV2301;
  let loader=null;
  const install=()=>{
    let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource('ofm')}catch(_){}
    if(!ready)return;
    solidStructures(map);infrastructure(map);landAttachedLabels(map);opportunityLayers(map);
    if(!loader)loader=createOpportunityLoader(map);
  };
  install();map.on('styledata',install);for(const ms of [80,300,900,2200])setTimeout(install,ms);
  const api={version:2301,map,architecture:'MAPLIBRE_TERRAIN_ATTACHED_SEMANTIC_DETAIL',solidBuildings:true,sourceBackedRoofs:true,stateLabelsSurfaceAligned:true,countyLabelsSurfaceAligned:true,streetNamesRoadAligned:true,waterLabelsSurfaceAligned:true,poiLabelsStructureAnchored:true,terrainDrapedRailStack:true,terrainDrapedBridges:true,opportunityBuildingColorMatch:true,opportunityIconsAnchored:true,secondaryCanvases:0,get state(){return{version:2301,opportunities:loader?.count||0,solidBuildings:true,secondaryCanvases:0}}};
  window.__bpWorldDetailsV2301=api;return api;
}
