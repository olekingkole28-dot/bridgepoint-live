const nameField=['coalesce',['get','name:en'],['get','name'],['get','name:latin'],['get','ref'],''];
const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const add=(m,l,before)=>{try{if(!has(m,l.id))m.addLayer(l,before&&has(m,before)?before:undefined)}catch(e){console.warn('V2300 water label layer',l.id,e)}};

export function initWaterLabels(map){
  if(!map)return null;
  if(window.__bpWaterLabelsV2300?.map===map)return window.__bpWaterLabelsV2300;
  let installed=false;
  function install(){
    let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource?.('ofm')}catch(_){}
    if(!ready)return;
    // Keep the existing water_name layer for oceans, seas, lakes and named polygon water.
    try{
      if(has(map,'gta-water-label')){
        map.setLayoutProperty('gta-water-label','text-pitch-alignment','map');
        map.setLayoutProperty('gta-water-label','text-rotation-alignment','map');
        map.setLayoutProperty('gta-water-label','text-keep-upright',true);
        map.setPaintProperty('gta-water-label','text-halo-color','#06121a');
        map.setPaintProperty('gta-water-label','text-halo-width',1.2);
      }
    }catch(e){console.warn('V2300 existing water label tune',e)}

    // Rivers/streams are line geometry, so names follow the actual waterway on the terrain surface.
    add(map,{id:'gta-waterway-name-v2300',type:'symbol',source:'ofm','source-layer':'waterway',minzoom:8.2,filter:['has','name'],layout:{
      'symbol-placement':'line','symbol-spacing':380,'text-field':nameField,'text-font':['Noto Sans Regular'],
      'text-size':['interpolate',['linear'],['zoom'],8.2,8.4,12,10.3,16,12.2,20,13.4],
      'text-letter-spacing':.035,'text-pitch-alignment':'map','text-rotation-alignment':'map','text-keep-upright':true,
      'text-allow-overlap':false,'text-ignore-placement':false,'text-padding':5
    },paint:{
      'text-color':'#6fddff','text-opacity':['interpolate',['linear'],['zoom'],8.2,.32,11,.62,15,.84,19,.92],
      'text-halo-color':'#06121a','text-halo-width':1.15,'text-halo-blur':.35
    }});
    installed=true;map.triggerRepaint?.();
  }
  install();map.on?.('styledata',install);for(const ms of [100,450,1200,3200])setTimeout(install,ms);
  const api={version:2300,map,requirementKey:'v2300_surface_water_labels_v1',install,get state(){return{installed,polygonWaterLabelsPreserved:has(map,'gta-water-label'),waterwayLineLabels:has(map,'gta-waterway-name-v2300'),surfaceAligned:true,collisionSafe:true,secondaryCanvases:0,sources:['OpenFreeMap/OpenStreetMap water_name','OpenFreeMap/OpenStreetMap waterway']}}};
  window.__bpWaterLabelsV2300=api;return api;
}
