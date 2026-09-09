import{VERSION,EMPTY,LOW,edge,bbox,fc}from'./world-v2300-config.js';

const RADAR='https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity_time/ImageServer/WMSServer?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=1&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256';
function add(map,l,before){try{if(!map.getLayer(l.id))map.addLayer(l,before&&map.getLayer(before)?before:undefined)}catch(e){console.warn('weather layer',l.id,e)}}
function source(map,id){return map.getSource(id)}
function ensure(map){
  for(const id of ['wx-alerts','wx-fires','wx-quakes','wx-storms','wx-thermal','wx-obs'])if(!map.getSource(id))map.addSource(id,{type:'geojson',data:EMPTY});
  if(!map.getSource('wx-radar'))try{map.addSource('wx-radar',{type:'raster',tiles:[RADAR],tileSize:256,minzoom:3,maxzoom:12,attribution:'NOAA/NWS MRMS'})}catch(_){}
  add(map,{id:'wx-radar',type:'raster',source:'wx-radar',layout:{visibility:'none'},paint:{'raster-opacity':LOW?.46:.58,'raster-fade-duration':0}},'gta-road-major-glow');
  add(map,{id:'wx-alert-fill',type:'fill',source:'wx-alerts',paint:{'fill-color':['match',['upcase',['coalesce',['get','phenom'],'']],'TO','#ff3c6e','SV','#ffb84a','FF','#34d7ff','FA','#34d7ff','HU','#d764ff','TR','#d764ff','#ff9a56'],'fill-opacity':.16}},'gta-road-major-glow');
  add(map,{id:'wx-alert-line',type:'line',source:'wx-alerts',paint:{'line-color':['match',['upcase',['coalesce',['get','phenom'],'']],'TO','#ff3c6e','SV','#ffb84a','FF','#34d7ff','FA','#34d7ff','HU','#d764ff','TR','#d764ff','#ff9a56'],'line-width':['interpolate',['linear'],['zoom'],3,1.1,10,2.2,17,3.8],'line-opacity':.9}},'gta-road-major-glow');
  add(map,{id:'wx-fire-fill',type:'fill',source:'wx-fires',paint:{'fill-color':'#ff4f29','fill-opacity':.16}},'gta-exact-building');
  add(map,{id:'wx-fire-line',type:'line',source:'wx-fires',paint:{'line-color':'#ff7c3d','line-width':['interpolate',['linear'],['zoom'],4,1,14,3,19,5],'line-opacity':.95,'line-blur':.4}},'gta-exact-building');
  add(map,{id:'wx-thermal',type:'heatmap',source:'wx-thermal',maxzoom:15,paint:{'heatmap-weight':['interpolate',['linear'],['coalesce',['get','frp'],0],0,.2,80,1],'heatmap-intensity':['interpolate',['linear'],['zoom'],4,.4,12,1.2],'heatmap-radius':['interpolate',['linear'],['zoom'],4,5,12,18],'heatmap-opacity':.68}},'gta-exact-building');
  add(map,{id:'wx-quake-glow',type:'circle',source:'wx-quakes',paint:{'circle-radius':['interpolate',['linear'],['coalesce',['get','magnitude'],0],0,4,3,9,6,18],'circle-color':'#ff4fd6','circle-opacity':.22,'circle-blur':.7}},'gta-exact-building');
  add(map,{id:'wx-quake',type:'circle',source:'wx-quakes',paint:{'circle-radius':['interpolate',['linear'],['coalesce',['get','magnitude'],0],0,2,3,5,6,11],'circle-color':'#fff0fa','circle-stroke-color':'#ff4fd6','circle-stroke-width':2,'circle-opacity':.95}},'gta-exact-building');
  add(map,{id:'wx-storm-glow',type:'circle',source:'wx-storms',paint:{'circle-radius':['interpolate',['linear'],['coalesce',['get','wind_mph'],0],0,7,75,18,150,30],'circle-color':'#b555ff','circle-opacity':.2,'circle-blur':.75}},'gta-exact-building');
  add(map,{id:'wx-storm',type:'circle',source:'wx-storms',paint:{'circle-radius':7,'circle-color':'#e8c9ff','circle-stroke-color':'#b555ff','circle-stroke-width':2}},'gta-exact-building');
  add(map,{id:'wx-obs',type:'circle',source:'wx-obs',minzoom:6,paint:{'circle-radius':['interpolate',['linear'],['zoom'],6,1.5,12,3.2],'circle-color':['interpolate',['linear'],['coalesce',['get','temperature_f'],60],0,'#70b8ff',55,'#d4f7ff',80,'#ffcf7e',105,'#ff5c48'],'circle-opacity':.72}},'gta-exact-building');
}
function geomFeature(g,p={}){return g?{type:'Feature',geometry:g,properties:p}:null}
function point(lng,lat,p={}){return Number.isFinite(+lng)&&Number.isFinite(+lat)?{type:'Feature',geometry:{type:'Point',coordinates:[+lng,+lat]},properties:p}:null}

export function initWeather(map){
  if(window.__bpWeatherV2300)return window.__bpWeatherV2300;ensure(map);
  let active=true,radar=false,timer=0,last=0,abort=0;
  function setData(id,data){try{source(map,id)?.setData(data)}catch(_){}}
  function atmosphere(obs){
    if(!obs?.length)return;const c=map.getCenter();let best=null,dist=Infinity;for(const o of obs){const d=(o.lng-c.lng)**2+(o.lat-c.lat)**2;if(d<dist){dist=d;best=o}}if(!best)return;
    const cloud=Math.max(0,Math.min(1,Number(best.cloud_fraction||0))),visibility=Number(best.visibility_mi||10),storm=cloud>.8;
    try{map.setSky({'sky-color':storm?'#26313b':'#102d3e','horizon-color':storm?'#53606a':'#31515e','fog-color':storm?'#69747d':'#718a92','sky-horizon-blend':visibility<1?.04:.18,'horizon-fog-blend':visibility<1?.18:.04,'fog-ground-blend':0,'atmosphere-blend':['interpolate',['linear'],['zoom'],0,.5+cloud*.25,6,.22+cloud*.18,10,0]});map.setLight({anchor:'map',color:storm?'#9faab2':'#e5f7ff',intensity:storm?.28:.48,position:[1.2,205,38]})}catch(_){}
  }
  async function refresh(force=false){
    if(!active)return;const now=Date.now();if(!force&&now-last<45000)return;last=now;const id=++abort,b=bbox(map,.18),z=map.getZoom();
    try{
      const d=await edge('bridgepoint-world-effects-v2190',{west:b.west,south:b.south,east:b.east,north:b.north,zoom:z,modes:['all']},14500);if(id!==abort)return;
      setData('wx-alerts',fc((d.alerts||[]).map(x=>geomFeature(x.geometry,{...(x.properties||{}),source:'NOAA/NWS'}))));
      setData('wx-fires',fc((d.fires||[]).map(x=>geomFeature(x.geometry,{id:x.id,name:x.name,acres:x.acres,contained_pct:x.contained_pct,source:x.source}))));
      setData('wx-quakes',fc((d.earthquakes||[]).map(x=>point(x.lng,x.lat,x))));
      setData('wx-storms',fc((d.storms||[]).map(x=>point(x.lng,x.lat,x))));
      setData('wx-thermal',fc((d.thermal||[]).map(x=>point(x.lng,x.lat,x))));
      setData('wx-obs',fc((d.observations||[]).map(x=>point(x.lng,x.lat,x))));
      atmosphere(d.observations||[]);
      window.dispatchEvent(new CustomEvent('bp2300:weather-updated',{detail:{generated_at:d.generated_at,sources:d.sources||[],counts:{alerts:d.alerts?.length||0,fires:d.fires?.length||0,quakes:d.earthquakes?.length||0,storms:d.storms?.length||0}}}));
    }catch(e){console.warn('V2300 weather',e)}
  }
  function setRadar(on){radar=!!on;try{map.setLayoutProperty('wx-radar','visibility',radar?'visible':'none')}catch(_){}const b=document.querySelector('[data-layer="radar"]');if(b)b.classList.toggle('active',radar)}
  map.on('moveend',()=>{clearTimeout(timer);timer=setTimeout(()=>refresh(false),LOW?700:350)});
  map.on('zoomend',()=>refresh(false));
  document.querySelector('[data-layer="radar"]')?.addEventListener('click',e=>setRadar(e.currentTarget.classList.contains('active')));
  document.querySelector('[data-layer="signals"]')?.addEventListener('click',e=>{active=e.currentTarget.classList.contains('active');for(const id of ['wx-alert-fill','wx-alert-line','wx-fire-fill','wx-fire-line','wx-thermal','wx-quake-glow','wx-quake','wx-storm-glow','wx-storm','wx-obs'])try{map.setLayoutProperty(id,'visibility',active?'visible':'none')}catch(_){}if(active)refresh(true)});
  refresh(true);setInterval(()=>document.querySelector('[data-surface="map"]')?.classList.contains('active')&&refresh(false),60000);
  const api={version:VERSION,refresh,setRadar,get state(){return{active,radar,last}}};window.__bpWeatherV2300=api;return api;
}
