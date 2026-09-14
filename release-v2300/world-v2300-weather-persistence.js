const sig=map=>{const b=map.getBounds(),z=map.getZoom();return`${z.toFixed(2)}|${b.getWest().toFixed(2)}|${b.getSouth().toFixed(2)}|${b.getEast().toFixed(2)}|${b.getNorth().toFixed(2)}`};

export function initWeatherPersistence(map,weather){
 if(!map||!weather)return null;if(window.__bpWeatherPersistenceV2300?.map===map)return window.__bpWeatherPersistenceV2300;
 let timer=0,lastForced=0,lastSig='',forceCount=0,lastReason='boot',lastCompletedAt=0;
 async function refreshNow(reason='viewport'){
  if(document.hidden||!document.querySelector('[data-surface="map"]')?.classList.contains('active'))return;
  const now=Date.now(),s=sig(map);lastReason=reason;
  if(reason==='idle'&&s===lastSig&&now-lastForced<30000)return;
  if(now-lastForced<1800){clearTimeout(timer);timer=setTimeout(()=>refreshNow(reason),1900-(now-lastForced));return}
  lastForced=now;lastSig=s;forceCount++;
  try{await weather.refresh(true);lastCompletedAt=Date.now();weather.fx?.refreshNative?.();map.triggerRepaint()}catch(e){console.warn('V2300 weather persistence',reason,e)}
 }
 function schedule(reason,delay=180){clearTimeout(timer);timer=setTimeout(()=>refreshNow(reason),delay)}
 map.on('zoomend',()=>schedule('zoomend',110));
 map.on('moveend',()=>schedule('moveend',190));
 map.on('idle',()=>{if(Date.now()-lastForced>15000)schedule('idle',80)});
 window.addEventListener('bp:map-open',()=>schedule('map-open',120));
 window.addEventListener('pageshow',()=>schedule('pageshow',180));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule('visibility-return',220)});
 for(const ms of [700,2400])setTimeout(()=>schedule('boot-settle',20),ms);
 const api={version:2300,map,weather,requirementKey:'v2300_weather_persistence_v1',refreshNow,get state(){return{viewportForceRefresh:true,zoomOutRepopulation:true,panRepopulation:true,radarStatePreserved:true,weatherVisualSemanticsChanged:false,minimumForceIntervalMs:1800,lastViewportSignature:lastSig,lastReason,forceCount,lastForcedAt:lastForced?new Date(lastForced).toISOString():null,lastCompletedAt:lastCompletedAt?new Date(lastCompletedAt).toISOString():null,secondaryCanvases:0,mapLayersAdded:0}}};
 window.__bpWeatherPersistenceV2300=api;return api;
}
