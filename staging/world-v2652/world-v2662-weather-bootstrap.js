const BP_URL='https://xdfsjztwgsbmabshzsjw.supabase.co';
const BP_KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const COLORS={TORNADO:'#a67cff',HURRICANE:'#ff9d40',HURRICANE_CONE:'#ff9d40',HURRICANE_TRACK:'#ff9d40',WILDFIRE:'#ff6538',FLOOD:'#42bfff',WIND:'#c5d5e5',HAIL:'#d9f7ff',LIGHTNING:'#ffd15c',RAIN:'#5d8dff',FIRE_WEATHER:'#ff815c',WEATHER_REPORT:'#48e1ff'};
async function waitViewer(){const started=Date.now();while(Date.now()-started<10000){const v=window.BridgePointWorldV2500?.viewer;if(v)return v;await sleep(8)}throw new Error('viewer unavailable')}
function remove(viewer){const old=viewer.dataSources.getByName('bp-weather-bootstrap-v2662')[0];if(old)viewer.dataSources.remove(old,true)}
async function load(){
  const viewer=await waitViewer();remove(viewer);const ds=new Cesium.CustomDataSource('bp-weather-bootstrap-v2662');viewer.dataSources.add(ds);
  const r=await fetch(`${BP_URL}/rest/v1/rpc/bridgepoint_us_weather_bootstrap_v2662`,{method:'POST',headers:{apikey:BP_KEY,'content-type':'application/json'},body:'{}',cache:'no-store',signal:AbortSignal.timeout(3500)});
  if(!r.ok)throw new Error(`weather bootstrap ${r.status}`);const data=await r.json();let shown=0;
  for(const item of data?.items||[]){if(shown>=520)break;const lat=Number(item.lat),lon=Number(item.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;const type=String(item.type||'WEATHER_REPORT').toUpperCase(),color=Cesium.Color.fromCssColorString(COLORS[type]||'#48e1ff'),major=['TORNADO','HURRICANE','WILDFIRE','FLOOD'].includes(type);ds.entities.add({position:Cesium.Cartesian3.fromDegrees(lon,lat,major?2600:1800),point:{pixelSize:major?8:5,color:color.withAlpha(item.observed===false?.55:.88),outlineColor:Cesium.Color.BLACK.withAlpha(.72),outlineWidth:major?1.4:.8,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,26000000),scaleByDistance:new Cesium.NearFarScalar(100000,1.15,12000000,.65)},properties:{hazard_type:type,event_name:item.name||type,observed:item.observed!==false,source:item.source||null}});shown++}
  const title=document.querySelector('#bp-weather-key .keyTitle');if(title)title.textContent=`LIVE U.S. WEATHER · ${shown.toLocaleString()} instant current hazards · refreshing`;
  viewer.scene.requestRender();
  const live=viewer.dataSources.getByName('bp-weather')[0];if(live){const swap=()=>{if(live.entities.values.length){remove(viewer);live.entities.collectionChanged.removeEventListener(swap);viewer.scene.requestRender()}};live.entities.collectionChanged.addEventListener(swap);setTimeout(swap,200)}
  window.BridgePointWeatherBootstrapV2662={viewer,data,shown,refresh:load};document.documentElement.dataset.bridgepointWeatherBootstrap='2662';
}
load().catch(error=>console.warn('BridgePoint weather bootstrap unavailable',error));