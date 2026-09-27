const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const add=(m,l,before)=>{try{if(!has(m,l.id))m.addLayer(l,before&&has(m,before)?before:undefined)}catch(e){console.warn('V2300 street label layer',l.id,e)}};
const setLayout=(m,id,k,v)=>{try{if(has(m,id))m.setLayoutProperty(id,k,v)}catch(e){console.warn('V2300 street label layout',k,e)}};
const setPaint=(m,id,k,v)=>{try{if(has(m,id))m.setPaintProperty(id,k,v)}catch(e){console.warn('V2300 street label paint',k,e)}};
const name=['coalesce',['get','name:en'],['get','name'],['get','name:latin'],''];
export function initStreetLabels(map){
 if(!map)return null;if(window.__bpStreetLabelsV2300?.map===map)return window.__bpStreetLabelsV2300;let installed=false;
 function install(){
  let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource?.('ofm')}catch(_){}if(!ready)return;
  if(has(map,'gta-road-name')){
    try{map.setLayerZoomRange('gta-road-name',12.2,24)}catch(_){}
    setLayout(map,'gta-road-name','symbol-placement','line');setLayout(map,'gta-road-name','symbol-spacing',260);setLayout(map,'gta-road-name','text-pitch-alignment','map');setLayout(map,'gta-road-name','text-rotation-alignment','map');setLayout(map,'gta-road-name','text-keep-upright',true);setLayout(map,'gta-road-name','text-allow-overlap',false);setLayout(map,'gta-road-name','text-ignore-placement',false);setLayout(map,'gta-road-name','text-padding',3);
    setPaint(map,'gta-road-name','text-opacity',['interpolate',['linear'],['zoom'],12.2,.28,14,.66,16,.88,18,.96]);
  }
  add(map,{id:'gta-route-ref-v2300',type:'symbol',source:'ofm','source-layer':'transportation_name',minzoom:8.8,maxzoom:17.3,filter:['all',['has','ref'],['!=',['get','ref'],'']],layout:{
    'symbol-placement':'line','symbol-spacing':520,'text-field':['get','ref'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],8.8,8,12,9.5,16,10.5],
    'text-pitch-alignment':'map','text-rotation-alignment':'map','text-keep-upright':true,'text-allow-overlap':false,'text-ignore-placement':false,'text-padding':9
  },paint:{'text-color':'#f5d06c','text-opacity':['interpolate',['linear'],['zoom'],8.8,.4,12,.72,16,.82],'text-halo-color':'#071017','text-halo-width':1.35,'text-halo-blur':.3}},'gta-road-name');
  add(map,{id:'gta-local-street-name-v2300',type:'symbol',source:'ofm','source-layer':'transportation_name',minzoom:15.3,maxzoom:24,filter:['all',['!=',name,''],['in',['get','class'],['literal',['minor','service','residential','living_street','unclassified','tertiary']]]],layout:{
    'symbol-placement':'line','symbol-spacing':205,'text-field':name,'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],15.3,9.2,18,11.6,21,13],
    'text-pitch-alignment':'map','text-rotation-alignment':'map','text-keep-upright':true,'text-allow-overlap':false,'text-ignore-placement':false,'text-padding':3,'text-letter-spacing':.01
  },paint:{'text-color':'#f4f8f7','text-opacity':['interpolate',['linear'],['zoom'],15.3,.42,17,.76,19,.94],'text-halo-color':'#071017','text-halo-width':1.05,'text-halo-blur':.25}});
  installed=true;map.triggerRepaint();
 }
 install();map.on('styledata',install);for(const ms of [80,320,950,2500])setTimeout(install,ms);
 const api={version:2300,map,requirementKey:'v2300_surface_street_labels_v1',install,get state(){return{installed,existingRoadNamesPreserved:has(map,'gta-road-name'),majorAndRouteNames:true,closeZoomLocalStreetNames:true,lineGeometryAttached:true,surfaceAligned:true,collisionDecluttered:true,contentBlockingDisabled:true,secondaryCanvases:0}}};window.__bpStreetLabelsV2300=api;return api;
}
