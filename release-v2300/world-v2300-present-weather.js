import{TIER,LOW,edge,bbox,clamp,fc}from'./world-v2300-config.js';

const text=v=>String(v??'').toLowerCase();
const point=o=>Number.isFinite(+o?.lng)&&Number.isFinite(+o?.lat)?{type:'Feature',geometry:{type:'Point',coordinates:[+o.lng,+o.lat]},properties:o}:null;
function key(o){return`${o.station||''}|${Number(o.lng).toFixed(4)}|${Number(o.lat).toFixed(4)}`}
function merge(base,metar){const out=[],seen=new Set();for(const o of [...metar,...base]){if(!Number.isFinite(+o?.lng)||!Number.isFinite(+o?.lat))continue;const k=key(o);if(seen.has(k))continue;seen.add(k);out.push(o)}return out}
function nearest(map,a){const c=map.getCenter();let best=null,d0=Infinity;for(const o of a){const d=(+o.lng-c.lng)**2+(+o.lat-c.lat)**2;if(d<d0){d0=d;best=o}}return best}
function applyAtmosphere(map,o){if(!o)return;const cond=text([o.weather,o.rawdata].join(' ')),vis=clamp(Number(o.visibility_mi??10),.05,50),fog=vis<1||/\bfg\b|fog|mist/.test(cond),storm=/\bts\b|thunderstorm|squall/.test(cond);if(!fog&&!storm)return;try{map.setSky({'sky-color':storm?'#26313b':'#68777c','horizon-color':storm?'#53606a':'#849196','fog-color':storm?'#69747d':'#9aa4a6','sky-horizon-blend':fog?.035:.11,'horizon-fog-blend':fog?.25:.06,'fog-ground-blend':fog?.08:0,'atmosphere-blend':['interpolate',['linear'],['zoom'],0,storm?.72:.58,6,storm?.38:.32,10,fog?.08:0]});map.setLight({anchor:'map',color:storm?'#9faab2':'#c4cccd',intensity:storm?.27:.34,position:[1.2,205,38]})}catch(_){}}

export function initPresentWeather(map){
 if(!map)return null;if(window.__bpPresentWeatherV2301?.map===map)return window.__bpPresentWeatherV2301;
 let active=true,last=0,seq=0,timer=0,count=0,lastWeather=[];
 async function refresh(force=false){
  const weather=window.__bpWeatherV2300;if(!active||!weather?.fx)return;
  const now=Date.now();if(!force&&now-last<45000)return;last=now;const id=++seq,b=bbox(map,.1);
  try{
   const d=await edge('bridgepoint-present-weather-v2301',{west:b.west,south:b.south,east:b.east,north:b.north,limit:TIER==='LOW'?260:TIER==='HIGH'?760:480},13500);
   if(id!==seq)return;lastWeather=Array.isArray(d?.observations)?d.observations:[];count=lastWeather.length;
   const current=weather.getScene?.()||{},observations=merge(current.observations||[],lastWeather),scene={...current,observations};
   weather.fx.setScene(scene,{generated_at:d?.generated_at||current.generated_at});
   try{map.getSource('wx-obs')?.setData(fc(observations.map(point)))}catch(_){}
   applyAtmosphere(map,nearest(map,lastWeather));
   window.dispatchEvent(new CustomEvent('bp2300:present-weather-updated',{detail:{count,generated_at:d?.generated_at,source:d?.source}}));
  }catch(e){if(force)console.warn('V2300 present weather',e?.message||e)}
 }
 function schedule(delay=250){clearTimeout(timer);timer=setTimeout(()=>refresh(false),delay)}
 const wait=()=>{if(window.__bpWeatherV2300?.fx){refresh(true);return}setTimeout(wait,180)};wait();
 map.on('moveend',()=>schedule(LOW?800:450));map.on('zoomend',()=>schedule(220));setInterval(()=>document.querySelector('[data-surface="map"]')?.classList.contains('active')&&refresh(false),60000);
 const api={version:2301,map,source:'NOAA/NWS Aviation Weather Center METAR',presentWeatherCodes:true,drivesRainSnowHail:true,exactLightningStrikesInvented:false,secondaryCanvases:0,refresh,setActive(v){active=!!v;if(active)refresh(true)},get state(){return{active,last,count,secondaryCanvases:0,source:'NOAA_AWC_METAR'}}};
 window.__bpPresentWeatherV2301=api;return api;
}
