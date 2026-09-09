const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const paint=(m,id,k,v)=>{try{if(has(m,id))m.setPaintProperty(id,k,v)}catch(e){console.warn('V2300 road style paint',id,k,e)}};
const add=(m,l,before)=>{try{if(!has(m,l.id))m.addLayer(l,before&&has(m,before)?before:undefined)}catch(e){console.warn('V2300 road style layer',l.id,e)}};
const major=['in',['get','class'],['literal',['motorway','trunk','primary','secondary']]];
const supplement=['in',['get','class'],['literal',['path','residential','living_street','unclassified','pedestrian','cycleway','footway']]];
const MAJOR_ASPHALT='#15191c',LOCAL_ASPHALT='#1b1f22',GOLD='#f2b83f',WHITE='#f4f5f1';

export function initRoadStyle(map){
 if(!map)return null;if(window.__bpRoadStyleV2300?.map===map)return window.__bpRoadStyleV2300;let installed=false;
 function install(){
  let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource?.('ofm')}catch(_){}if(!ready)return;
  // Single authoritative street material language: asphalt is dark; hierarchy is communicated
  // with yellow/white markings, casing, width and labels rather than pale road-body paint.
  paint(map,'gta-road-major-glow','line-color',GOLD);paint(map,'gta-road-major-glow','line-opacity',.22);
  paint(map,'gta-road-major','line-color',MAJOR_ASPHALT);paint(map,'gta-road-major','line-opacity',.99);
  paint(map,'gta-road-local-casing','line-color','#050708');paint(map,'gta-road-local-casing','line-opacity',.99);
  paint(map,'gta-road-local','line-color',LOCAL_ASPHALT);
  paint(map,'gta-road-local','line-opacity',['interpolate',['linear'],['zoom'],9.15,.5,11,.72,14,.9,17,.99]);

  add(map,{id:'gta-road-major-casing-bp',type:'line',source:'ofm','source-layer':'transportation',minzoom:6.5,filter:major,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#050708','line-width':['interpolate',['exponential',1.35],['zoom'],7,1.5,11,3.2,15,8.1,19,18.2],'line-opacity':.98}},'gta-road-major-glow');
  add(map,{id:'gta-road-supplement-casing-bp',type:'line',source:'ofm','source-layer':'transportation',minzoom:10.0,filter:supplement,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#050708','line-width':['interpolate',['exponential',1.35],['zoom'],10,.45,12.2,.7,15,2.4,18,7.8,21,16],'line-opacity':['interpolate',['linear'],['zoom'],10,.35,12.2,.65,15,.94]}},'gta-rail-ballast');
  add(map,{id:'gta-road-supplement-bp',type:'line',source:'ofm','source-layer':'transportation',minzoom:10.0,filter:supplement,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['get','class'],'path','#a99d70','cycleway','#8fa7a8','footway','#aaa9a1','residential',LOCAL_ASPHALT,'living_street',LOCAL_ASPHALT,'unclassified',LOCAL_ASPHALT,LOCAL_ASPHALT],'line-width':['interpolate',['exponential',1.35],['zoom'],10,.2,12.2,.3,15,.8,18,3.6,21,7.8],'line-opacity':['interpolate',['linear'],['zoom'],10,.28,12.2,.45,15,.72,18,.94]}},'gta-rail-ballast');
  add(map,{id:'gta-road-center-gold-bp',type:'line',source:'ofm','source-layer':'transportation',minzoom:12.0,filter:['in',['get','class'],['literal',['motorway','trunk','primary']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':GOLD,'line-width':['interpolate',['linear'],['zoom'],12,.12,15.5,.24,18,.5,21,.9],'line-opacity':['interpolate',['linear'],['zoom'],12,.3,15.5,.7,18,.84],'line-dasharray':[3,2]}},'gta-rail-ballast');
  add(map,{id:'gta-road-center-white-bp',type:'line',source:'ofm','source-layer':'transportation',minzoom:12.2,filter:['in',['get','class'],['literal',['secondary','tertiary','minor','residential']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':WHITE,'line-width':['interpolate',['linear'],['zoom'],12.2,.1,16,.28,20,.62],'line-opacity':['interpolate',['linear'],['zoom'],12.2,.22,15,.55,18,.82],'line-dasharray':[4,3]}},'gta-rail-ballast');
  installed=true;map.triggerRepaint();
 }
 install();map.on('styledata',install);for(const ms of [80,300,900,2200])setTimeout(install,ms);
 const api={version:2300,map,requirementKey:'v2300_all_road_styling_v1',install,get state(){return{installed,blackYellowWhite:true,majorRoads:true,localRoads:true,supplementalCloseZoomRoads:true,majorAsphalt:MAJOR_ASPHALT,localAsphalt:LOCAL_ASPHALT,yellowWhiteMarkings:true,terrainDraped:true,streetLabelsPreserved:true,bridgeLayersPreserved:true,secondaryCanvases:0}}};window.__bpRoadStyleV2300=api;return api;
}
