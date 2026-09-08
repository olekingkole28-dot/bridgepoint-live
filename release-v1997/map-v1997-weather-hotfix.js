(()=>{
'use strict';
if(window.__bp97WeatherVolumeHotfix)return;window.__bp97WeatherVolumeHotfix=true;
function install(){const s=window.__bp97MapState,m=s?.map;if(!s?.ready||!m){setTimeout(install,180);return}try{
  if(!m.getLayer('bp97-weather-volume')&&m.getSource('bp97-hazards')){
    m.addLayer({id:'bp97-weather-volume',type:'fill-extrusion',source:'bp97-hazards',filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],paint:{'fill-extrusion-color':['match',['get','peril'],'hail','#87efff','wind','#65e4c5','rain','#419fff','snow','#e9fbff','tornado','#bd76ff','hurricane','#ffc45f','fire','#ff664f','flood','#3d9fff','#ffad62'],'fill-extrusion-height':['get','volume_height'],'fill-extrusion-base':0,'fill-extrusion-opacity':0}});
  }
}catch(e){console.warn('BridgePoint V1997 weather compatibility layer',e)}
}
function loadScript(src,key){if(window[key]||document.querySelector(`script[data-bp-loader="${key}"]`))return;const s=document.createElement('script');s.src=src;s.defer=true;s.dataset.bpLoader=key;document.head.appendChild(s)}
function loadAll(){
  loadScript('./v1998-live-extras.js?v=1998','__bridgepointV1998Extras');
  loadScript('/language-v2000.js?v=2000','__bridgepointLanguageV2000');
  loadScript('./map-v2002-property-click.js?v=2002','__bridgepointMapPropertyClickV2002');
  loadScript('./owner-physical-world-v2020.js?v=2020','__bridgepointOwnerPhysicalWorldV2020');
  loadScript('./map-v2045-physical-world.js?v=2055','__bridgepointPhysicalWorldV2045');
  loadScript('./map-v2060-immersive-world.js?v=2060','__bridgepointImmersiveWorldV2060');
  loadScript('./map-v2070-weather-earth.js?v=2070','__bridgepointWeatherEarthV2070');
  loadScript('./map-v2080-cinematic-weather.js?v=2080','__bridgepointCinematicWeatherV2080');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{install();loadAll()},{once:true});else{install();loadAll()}
})();