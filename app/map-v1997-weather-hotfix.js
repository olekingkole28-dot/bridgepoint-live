(()=>{
'use strict';
if(window.__bp97WeatherVolumeHotfix)return;window.__bp97WeatherVolumeHotfix=true;
function install(){const s=window.__bp97MapState,m=s?.map;if(!s?.ready||!m){setTimeout(install,180);return}try{
  if(!m.getLayer('bp97-weather-volume')&&m.getSource('bp97-hazards')){
    m.addLayer({id:'bp97-weather-volume',type:'fill-extrusion',source:'bp97-hazards',filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],paint:{'fill-extrusion-color':['match',['get','peril'],'hail','#87efff','wind','#65e4c5','rain','#419fff','snow','#e9fbff','tornado','#bd76ff','hurricane','#ffc45f','fire','#ff664f','flood','#3d9fff','#ffad62'],'fill-extrusion-height':['get','volume_height'],'fill-extrusion-base':0,'fill-extrusion-opacity':.18}});
    try{if(m.getLayer('labels'))m.moveLayer('labels')}catch(_){}
  }
}catch(e){console.warn('BridgePoint V1997 weather volume hotfix',e)}
}
function loadV1998(){if(window.__bridgepointV1998Extras||document.querySelector('script[data-bp-v1998]'))return;const s=document.createElement('script');s.src='./v1998-live-extras.js?v=1998';s.defer=true;s.dataset.bpV1998='1';document.head.appendChild(s)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{install();loadV1998()},{once:true});else{install();loadV1998()}
})();