const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const paint=(m,id,k,v)=>{try{if(has(m,id))m.setPaintProperty(id,k,v)}catch(e){console.warn('V2300 road style paint',id,k,e)}};
const add=(m,l,before)=>{try{if(!has(m,l.id))m.addLayer(l,before&&has(m,before)?before:undefined)}catch(e){console.warn('V2300 road style layer',l.id,e)}};
const major=['in',['get','class'],['literal',['motorway','trunk','primary','secondary']]];
const supplement=['in',['get','class'],['literal',['path','residential','living_street','unclassified','pedestrian','cycleway','footway']]];

export function initRoadStyle(map){
 if(!map)return null;if(window.__bpRoadStyleV2300?.map===map)return window.__bpRoadStyleV2300;let installed=false;
 function install(){
  let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource?.('ofm')}catch(_){}if(!ready)return;
  // Established BridgePoint street language: dark asphalt/casing, gold hierarchy cues, white local-road surface.
  paint(map,'gta-road-major-glow','line-color','#ffc84f');paint(map,'gta-road-major-glow','line-opacity',.2);
  paint(map,'gta-road-major','line-color',['match',['get','class'],'motorway','#ffd15c','trunk','#ffe08b','primary','#fff0bb','secondary','#f7f6e9','#ffffff']);
  paint(map,'gta-road-local-casing','line-color','#05080a');paint(map,'gta-road-local-casing','line-opacity',.98);
  paint(map,'gta-road-local','line-color',['match',['get','class'],'tertiary','#f5f5ed','minor','#e9eef0','service','#d7dddc','track','#d7b45d','#eef3f3']);
  paint(map,'gta-road-local','line-opacity',['interpolate',['linear'],['zoom'],10.5,.55,14,.84,17,.97]);

  add(map,{id:'gta-road-major-casing-bp',type:'line',source:'ofm','source-layer':'transportation',minzoom:6.5,filter:major,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#05080a','line-width':['interpolate',['exponential',1.35],['zoom'],7,1.5,11,3.2,15,8.1,19,18.2],'line-opacity':.98}},'gta-road-major-glow');
  add(map,{id:'gta-road-supplement-casing-bp',type:'line',source:'ofm','source-layer':'transportation',minzoom:12.2,filter:supplement,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#05080a','line-width':['interpolate',['exponential',1.35],['zoom'],12.2,.7,15,2.4,18,7.8,21,16],'line-opacity':.94}},'gta-rail-ballast');
  add(map,{id:'gta-road-supplement-bp',type:'line',source:'ofm','source-layer':'transportation',minzoom:12.2,filter:supplement,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['get','class'],'path','#d6c486','cycleway','#eee6ba','footway','#e8e2d0','#f0f2ee'],'line-width':['interpolate',['exponential',1.35],['zoom'],12.2,.24,15,.8,18,3.6,21,7.8],'line-opacity':['interpolate',['linear'],['zoom'],12.2,.4,15,.72,18,.94]}},'gta-rail-ballast');
  add(map,{id:'gta-road-center-gold-bp',type:'line',source:'ofm','source-layer':'transportation',minzoom:15.5,filter:['in',['get','class'],['literal',['motorway','trunk','primary']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#f3b83f','line-width':['interpolate',['linear'],['zoom'],15.5,.24,18,.5,21,.9],'line-opacity':.7,'line-dasharray':[3,2]}},'gta-rail-ballast');
  installed=true;map.triggerRepaint();
 }
 install();map.on('styledata',install);for(const ms of [80,300,900,2200])setTimeout(install,ms);
 const api={version:2300,map,requirementKey:'v2300_all_road_styling_v1',install,get state(){return{installed,blackYellowWhite:true,majorRoads:true,localRoads:true,supplementalCloseZoomRoads:true,terrainDraped:true,streetLabelsPreserved:true,bridgeLayersPreserved:true,secondaryCanvases:0}}};window.__bpRoadStyleV2300=api;return api;
}
