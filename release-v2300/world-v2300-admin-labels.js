const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const add=(m,l,before)=>{try{if(!has(m,l.id))m.addLayer(l,before&&has(m,before)?before:undefined)}catch(e){console.warn('V2300 admin label layer',l.id,e)}};
const name=['coalesce',['get','name:en'],['get','name'],['get','name:latin'],['get','ref'],''];
const common={'text-pitch-alignment':'map','text-rotation-alignment':'map','text-keep-upright':true,'text-allow-overlap':false,'text-ignore-placement':false,'text-padding':5};
export function initAdminLabels(map){
 if(!map)return null;if(window.__bpAdminLabelsV2300?.map===map)return window.__bpAdminLabelsV2300;let installed=false;
 function install(){
  let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource?.('ofm')}catch(_){}if(!ready)return;
  add(map,{id:'gta-city-label-v2300',type:'symbol',source:'ofm','source-layer':'place',minzoom:5.2,maxzoom:15.5,filter:['==',['get','class'],'city'],layout:{...common,'text-field':name,'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],5.2,10.5,8,14.5,11,17,15.5,18.5],'symbol-sort-key':['coalesce',['get','rank'],6]},paint:{'text-color':'#f1f8f8','text-opacity':['interpolate',['linear'],['zoom'],5.2,.55,8,.9,12,.96,15.5,.74],'text-halo-color':'#071017','text-halo-width':1.45,'text-halo-blur':.45}},'gta-water-label');
  add(map,{id:'gta-town-label-v2300',type:'symbol',source:'ofm','source-layer':'place',minzoom:8.0,maxzoom:17.0,filter:['in',['get','class'],['literal',['town','village']]],layout:{...common,'text-field':name,'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],8,9.5,11,12.5,14,14.2,17,15],'symbol-sort-key':['coalesce',['get','rank'],9]},paint:{'text-color':'#dceced','text-opacity':['interpolate',['linear'],['zoom'],8,.42,11,.76,14,.92,17,.68],'text-halo-color':'#071017','text-halo-width':1.25,'text-halo-blur':.35}},'gta-water-label');
  add(map,{id:'gta-locality-label-v2300',type:'symbol',source:'ofm','source-layer':'place',minzoom:11.2,maxzoom:19.5,filter:['in',['get','class'],['literal',['hamlet','suburb','neighbourhood','neighborhood','quarter']]],layout:{...common,'text-field':name,'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],11.2,8.5,14,10.5,17,12.5,19.5,13.3],'symbol-sort-key':['coalesce',['get','rank'],12]},paint:{'text-color':'#b9ced2','text-opacity':['interpolate',['linear'],['zoom'],11.2,.3,14,.65,17,.85,19.5,.72],'text-halo-color':'#071017','text-halo-width':1.1,'text-halo-blur':.3}},'gta-road-name');
  installed=true;map.triggerRepaint();
 }
 install();map.on('styledata',install);for(const ms of [80,320,900,2400])setTimeout(install,ms);
 const api={version:2300,map,requirementKey:'v2300_surface_admin_labels_v1',install,get state(){return{installed,stateLabelsPreserved:has(map,'gta-state-label'),countyLabelsPreserved:has(map,'gta-county-place-label')||has(map,'gta-county-boundary-label'),cityLabels:true,townVillageLabels:true,localityLabels:true,zoomProgression:true,surfaceAligned:true,declutter:true,secondaryCanvases:0}}};window.__bpAdminLabelsV2300=api;return api;
}
