const C={supa:'https://xdfsjztwgsbmabshzsjw.supabase.co',key:'sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25',map:null,world:null,surface:null,signals:null,last:0,bootAt:Date.now(),imergDate:null,styleTimer:0,bgTimer:0,bgRunning:false,mobile:matchMedia('(max-width:760px)').matches||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)};
const $=id=>document.getElementById(id);const fc=()=>({type:'FeatureCollection',features:[]});
function authHeaders(){let a='';try{const s=JSON.parse(localStorage.getItem('bp_auth_v5045')||'null');if(s&&s.access_token)a='Bearer '+s.access_token}catch(_){}return{apikey:C.key,'Content-Type':'application/json',Accept:'application/json',...(a?{Authorization:a}:{})}}
export async function rpc(name,args={},timeout=12000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(C.supa+'/rest/v1/rpc/'+name,{method:'POST',headers:authHeaders(),body:JSON.stringify(args),signal:c.signal,cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||('HTTP '+r.status));return d}finally{clearTimeout(t)}}
export function sessionKey(){let v=localStorage.getItem('bp_free_premium_session_v5507');if(!/^[0-9a-f-]{36}$/i.test(v||'')){v=crypto.randomUUID();localStorage.setItem('bp_free_premium_session_v5507',v)}return v}
function shell(){return C.surface==='app'?document.querySelector('[data-surface="map"]'):(document.querySelector('.preview')||$('previewMap')?.parentElement)}
function waitWorld(){return new Promise((resolve,reject)=>{const started=Date.now();(function tick(){const a=window.__BP_V5000_WORLD,l=window.__BP_LANDING_WORLD__||window.__bpLandingWorldV5420,w=a&&a.map?a:l&&l.map?l:null;if(w){C.world=w;C.map=w.map;C.surface=a&&a.map?'app':'landing';return resolve(w)}if(Date.now()-started>30000)return reject(new Error('BridgePoint map readiness timeout'));setTimeout(tick,120)})()})}
function before(){for(const id of ['gta-place-label','gta-road-label-major','gta-context-buildings','gta-bp-buildings'])try{if(C.map.getLayer(id))return id}catch(_){}return undefined}
function weatherBefore(){for(const id of ['bp-radar-a','bp-radar-b','bp-landing-radar-a','bp-landing-radar-b','bp-v5004-weather-shape-fill','bp-landing-weather-fill','bp-v5004-weather-points','bp-landing-weather-points'])try{if(C.map.getLayer(id))return id}catch(_){}return before()}
function imergTile(date,z='{z}',y='{y}',x='{x}'){return 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate_30min/default/'+date+'/GoogleMapsCompatible_Level6/'+z+'/'+y+'/'+x+'.png'}
async function resolveImergDate(){
 const date=new Date(Date.now()-12*3600000).toISOString().slice(0,10);
 return{date,requested:date,mode:'NONBLOCKING_GIBS_DATE'};
}
async function installGlobalWeather(){
 if(!C.map)return null;
 const resolved=await resolveImergDate();if(!resolved)return null;
 const id='bp5510-global-imerg',layer='bp5510-global-imerg',dateChanged=C.imergDate!==resolved.date;
 try{
  if(dateChanged){if(C.map.getLayer(layer))C.map.removeLayer(layer);if(C.map.getSource(id))C.map.removeSource(id)}
  if(!C.map.getSource(id))C.map.addSource(id,{type:'raster',tiles:[imergTile(resolved.date)],tileSize:256,minzoom:0,maxzoom:6,attribution:'NASA GPM IMERG via Earthdata GIBS'});
  if(!C.map.getLayer(layer))C.map.addLayer({id:layer,type:'raster',source:id,minzoom:0,maxzoom:12,paint:{'raster-opacity':.48,'raster-fade-duration':180}},weatherBefore());
  C.imergDate=resolved.date;
 }catch(e){console.warn('BP global precipitation attach',e)}
 window.__BP_GLOBAL_WEATHER_V5510__={version:5510,projection:'globe',imerg:true,imergDate:C.imergDate,truth:'NASA_GPM_IMERG_NEAR_REALTIME_NOT_ZERO_LATENCY',updatedAt:Date.now()};
 return window.__BP_GLOBAL_WEATHER_V5510__
}
function source(id,data){let s=C.map.getSource(id);if(!s){C.map.addSource(id,{type:'geojson',data});s=C.map.getSource(id)}else s.setData&&s.setData(data);return s}
function ensureSource(id,data=fc()){let s=C.map.getSource(id);if(!s){C.map.addSource(id,{type:'geojson',data});s=C.map.getSource(id)}return s}
function setLayerVisible(id,on=true){try{if(!C.map?.getLayer(id))return;const cur=C.map.getLayoutProperty(id,'visibility')||'visible',next=on?'visible':'none';if(cur!==next)C.map.setLayoutProperty(id,'visibility',next)}catch(_){}}
export function globe(){try{if(C.map&&C.map.setProjection){const current=C.map.getProjection?.()?.type||'';if(current!=='globe')C.map.setProjection({type:'globe'});window.__BP_GLOBE_MODE_V5507__={enabled:true,projection:'globe',at:Date.now()};return true}}catch(e){console.warn('BP globe',e)}return false}
function addLayers(){if(!C.map)return;const b=before();try{ensureSource('bp5507-live');ensureSource('bp5507-tect');ensureSource('bp5507-geo');ensureSource('bp5507-scenario');if(!C.map.getLayer('bp5507-geo-fill'))C.map.addLayer({id:'bp5507-geo-fill',type:'fill',source:'bp5507-geo',minzoom:0,filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':'#ffad42','fill-opacity':.12}},b);if(!C.map.getLayer('bp5507-tect-line'))C.map.addLayer({id:'bp5507-tect-line',type:'line',source:'bp5507-tect',minzoom:0,paint:{'line-color':['match',['get','feature_class'],'MICROPLATE_BOUNDARY','#47dbcf','#ba75ff'],'line-width':['interpolate',['linear'],['zoom'],0,.22,1.2,.28,3,.52,5,1.05,10,2.6],'line-opacity':.82,'line-dasharray':[2,1]}},b);if(!C.map.getLayer('bp5507-live-glow'))C.map.addLayer({id:'bp5507-live-glow',type:'circle',source:'bp5507-live',minzoom:0,paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,.9,1.2,1.15,3,2.1,6,5,12,11],'circle-color':['match',['get','domain'],'SEISMIC','#ffc45b','VOLCANO','#ff615c','GLOBAL_HAZARDS','#5ce0ff','#a9c7d2'],'circle-opacity':.18,'circle-blur':.7}},b);if(!C.map.getLayer('bp5507-live-points'))C.map.addLayer({id:'bp5507-live-points',type:'circle',source:'bp5507-live',minzoom:0,paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,.42,1.2,.55,3,1.05,6,2.8,12,7],'circle-color':['match',['get','domain'],'SEISMIC','#ffc45b','VOLCANO','#ff615c','GLOBAL_HAZARDS','#5ce0ff','#a9c7d2'],'circle-stroke-color':'#effcff','circle-stroke-width':.6,'circle-opacity':.9}},b);if(!C.map.getLayer('bp5507-live-hit'))C.map.addLayer({id:'bp5507-live-hit',type:'circle',source:'bp5507-live',minzoom:0,paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,7,3,9,8,13],'circle-color':'#ffffff','circle-opacity':.001,'circle-stroke-opacity':0}},b);if(!C.map.getLayer('bp5507-tect-hit'))C.map.addLayer({id:'bp5507-tect-hit',type:'line',source:'bp5507-tect',minzoom:0,paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],0,8,5,11,10,15],'line-opacity':.001}},b);if(!C.map.getLayer('bp5507-geyser'))C.map.addLayer({id:'bp5507-geyser',type:'circle',source:'bp5507-geo',minzoom:0,filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,1.5,10,5],'circle-color':'#ffd861','circle-stroke-color':'#fff4c0','circle-stroke-width':.6}},b);if(!C.map.getLayer('bp5507-scenario-fill'))C.map.addLayer({id:'bp5507-scenario-fill',type:'fill',source:'bp5507-scenario',minzoom:0,paint:{'fill-color':['get','color'],'fill-opacity':.13}},b);if(!C.map.getLayer('bp5507-scenario-line'))C.map.addLayer({id:'bp5507-scenario-line',type:'line',source:'bp5507-scenario',minzoom:0,paint:{'line-color':['get','color'],'line-width':2.2}},b);if(!C.map.getLayer('bp5507-scenario-points'))C.map.addLayer({id:'bp5507-scenario-points',type:'circle',source:'bp5507-scenario',minzoom:0,filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':4,'circle-color':['coalesce',['get','color'],'#6ceaff'],'circle-stroke-color':'#effcff','circle-stroke-width':.6}},b)}catch(e){console.warn('BP global layers',e)}}
function entities(rows){return(rows||[]).flatMap(x=>{const lat=+x.lat,lon=+x.lon;if(!Number.isFinite(lat)||!Number.isFinite(lon))return[];const m=x.metadata||{},detail=x.domain==='SEISMIC'?['M'+(m.mag??'?'),m.place||''].filter(Boolean).join(' · '):x.domain==='VOLCANO'?[m.status,m.alert_level].filter(Boolean).join(' · '):String(m.description||'').slice(0,180);return[{type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{source_key:x.source_key,domain:x.domain,entity_type:x.entity_type,display_name:x.display_name||x.entity_type,detail}}]})}
function refs(rows){return(rows||[]).flatMap(x=>x&&x.geometry?[{type:'Feature',geometry:x.geometry,properties:{source_key:x.source_key,domain:x.domain,feature_class:x.feature_class,display_name:x.display_name||x.feature_class,detail:[x.properties?.chemistry,x.properties?.thermal_activity,x.properties?.boundary_type].filter(Boolean).join(' · ')}}]:[])}
function globalFires(rows){
 return(rows||[]).flatMap(x=>{
  const label=String([x.entity_type,x.display_name,x.metadata?.category,x.metadata?.title].filter(Boolean).join(' ')).toLowerCase();
  const lat=+x.lat,lon=+x.lon;if(!Number.isFinite(lat)||!Number.isFinite(lon)||!/wildfire|fire/.test(label))return[];
  return[{id:x.entity_key||x.display_name||'global-fire',name:x.display_name||'NASA EONET fire',source:x.source_key||'NASA_EONET_GLOBAL',geometry:{type:'Point',coordinates:[lon,lat]},acres:0,contained_pct:0}]
 })
}
function mergeGlobalFx(rows){
 try{
  const fx=window.__bpWeatherV2300?.fx;if(!fx)return;
  const current=fx.scene||{},extra=globalFires(rows),seen=new Set((current.fires||[]).map(x=>String(x.id||x.name||'')));
  const fires=[...(current.fires||[]),...extra.filter(x=>!seen.has(String(x.id||x.name||'')))];
  fx.setScene({...current,fires},{generated_at:new Date().toISOString()})
 }catch(e){console.warn('BP global FX merge',e)}
}
const REGION_HOME={
 US:[-98.5,39.5,2.55],CA:[-106,56,2.15],MX:[-102,23.6,2.85],BR:[-52,-10,2.35],AR:[-64,-34,2.45],CL:[-71,-33,2.55],CO:[-74,4,3.0],PE:[-75,-9,2.8],
 GB:[-3,55,4.0],IE:[-8,53.3,4.4],FR:[2,46.5,4.0],DE:[10.4,51.1,4.25],ES:[-3.5,40.2,4.0],PT:[-8,39.6,4.5],IT:[12.5,42.8,4.1],NL:[5.4,52.2,5.0],BE:[4.7,50.8,5.0],CH:[8.2,46.8,5.0],AT:[14.2,47.6,4.8],
 SE:[16,62,3.3],NO:[10,62,3.2],FI:[26,64,3.3],DK:[9.5,56,4.8],PL:[19,52,4.2],CZ:[15.5,49.8,4.8],GR:[22,39,4.2],TR:[35,39,3.7],UA:[31,49,3.6],RO:[25,46,4.3],
 IN:[79,22,3.1],PK:[69,30,3.5],BD:[90,23.7,4.3],CN:[104,35,2.6],JP:[138,36,3.7],KR:[127.8,36.4,4.2],ID:[118,-2,2.8],PH:[122,12,3.4],TH:[101,15,3.7],VN:[108,16,3.7],MY:[102,4,4.0],SG:[103.82,1.35,7],
 AU:[134,-25,2.45],NZ:[172,-41,3.3],ZA:[24,-29,3.4],NG:[8,9,3.5],KE:[37.8,.3,3.8],EG:[30,27,3.5],MA:[-6,32,3.9],SA:[45,24,3.25],AE:[54,24.2,4.6],IL:[35,31.7,5.0]
};
async function centerOnViewerCountry(){
 let region='';try{region=new Intl.Locale(navigator.language||'en-US').region||''}catch(_){}
 const fallback=REGION_HOME[region],userIntent=()=>Number(window.__BP_MAP_USER_INTENT_AT__||0)>0;
 try{
  if(navigator.permissions&&navigator.geolocation){
   const p=await navigator.permissions.query({name:'geolocation'});
   if(p.state==='granted'){
    const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,maximumAge:86400000,timeout:2500}));
    if(pos?.coords){if(userIntent()){window.__BP_VIEWER_COUNTRY_START__={region,mode:'user-interaction-preserved',at:Date.now()};return}C.map.jumpTo({center:[pos.coords.longitude,pos.coords.latitude],zoom:fallback?.[2]||3.25,pitch:0,bearing:0});window.__BP_VIEWER_COUNTRY_START__={region,mode:'granted-geolocation',at:Date.now()};return}
   }
  }
 }catch(_){}
 if(fallback){if(userIntent()){window.__BP_VIEWER_COUNTRY_START__={region,mode:'user-interaction-preserved',at:Date.now()};return}C.map.jumpTo({center:[fallback[0],fallback[1]],zoom:fallback[2],pitch:0,bearing:0});window.__BP_VIEWER_COUNTRY_START__={region,mode:'locale-region',at:Date.now()}}
}

export async function refresh(force=false){
 if(!force&&Date.now()-C.last<90000)return;
 if(C.bgRunning&&!force)return;
 C.last=Date.now();
 const yieldUi=()=>new Promise(resolve=>setTimeout(resolve,C.mobile?140:25)),mobileWarm=C.mobile&&(Date.now()-C.bootAt<45000),liveLimit=C.mobile?650:1800,refLimit=C.mobile?850:2500;
 try{
  const live=await rpc('bridgepoint_intelligence_live_entities_v5507',{p_domain:null,p_limit:liveLimit});
  if(globalInputPending())await yieldUi();
  source('bp5507-live',{type:'FeatureCollection',features:entities(live.entities)});mergeGlobalFx(live.entities);await yieldUi();
  let tect={count:0,features:[]},geo={count:0,features:[]};
  if(!mobileWarm){
   tect=await rpc('bridgepoint_intelligence_reference_geometry_v5505',{p_domain:'TECTONICS',p_feature_class:null,p_limit:refLimit});
   if(globalInputPending())await yieldUi();
   source('bp5507-tect',{type:'FeatureCollection',features:refs(tect.features)});await yieldUi();
   geo=await rpc('bridgepoint_intelligence_reference_geometry_v5505',{p_domain:'GEOTHERMAL',p_feature_class:null,p_limit:refLimit});
   if(globalInputPending())await yieldUi();
   source('bp5507-geo',{type:'FeatureCollection',features:refs(geo.features)});await yieldUi();
  }else{
   const wait=Math.max(2500,45000-(Date.now()-C.bootAt)+800);
   scheduleGlobalBackground(wait)
  }
  const space=await rpc('bridgepoint_intelligence_global_signals_v5503',{p_domain:'SPACE_WEATHER',p_limit:C.mobile?80:200});
  C.signals=space;
  window.__BP_INTELLIGENCE_GLOBAL_V5507__={liveCount:live.count||0,tectonics:tect.count||0,geothermal:geo.count||0,spaceSignals:space.count||0,sequentialCommit:true,mobileReferenceDeferred:mobileWarm,renderLimits:{live:liveLimit,reference:refLimit},updatedAt:Date.now()};
  const e=$('bp5507-key-counts');if(e)e.textContent=(live.count||0).toLocaleString()+' live events · '+(mobileWarm?'reference layers warming':(tect.count||0).toLocaleString()+' tectonic · '+(geo.count||0).toLocaleString()+' geothermal')+' · '+(space.count||0)+' space-weather signals'
 }catch(e){console.warn('BP refresh',e)}
}
export function globalVisible(on){for(const id of ['bp5510-global-imerg','bp5507-live-glow','bp5507-live-points','bp5507-live-hit','bp5507-tect-line','bp5507-tect-hit','bp5507-geo-fill','bp5507-geyser'])setLayerVisible(id,on)}
function bindInfo(){
 if(!C.map||C.map.__bp5507InfoBound)return;C.map.__bp5507InfoBound=true;
 const show=e=>{const f=e.features?.[0];if(!f)return;const p=f.properties||{},wrap=document.createElement('div');wrap.style.cssText='min-width:210px;max-width:310px;font-family:Inter,system-ui,sans-serif;color:#071118';const k=document.createElement('div');k.style.cssText='font-size:9px;font-weight:900;letter-spacing:.08em;color:#397180';k.textContent=String(p.domain||p.feature_class||'BRIDGEPOINT SOURCE').replaceAll('_',' ');const b=document.createElement('b');b.style.cssText='display:block;margin-top:4px;font-size:13px;line-height:1.25';b.textContent=String(p.display_name||p.entity_type||p.feature_class||'Source-backed map feature');const d=document.createElement('div');d.style.cssText='margin-top:6px;font-size:10px;line-height:1.4;color:#415661';d.textContent=String(p.detail||p.source_key||'');wrap.append(k,b,d);new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'330px'}).setLngLat(e.lngLat).setDOMContent(wrap).addTo(C.map)};
 for(const id of ['bp5507-live-hit','bp5507-live-points','bp5507-tect-hit','bp5507-tect-line','bp5507-geyser']){try{C.map.on('click',id,show);C.map.on('mouseenter',id,()=>{C.map.getCanvas().style.cursor='pointer'});C.map.on('mouseleave',id,()=>{C.map.getCanvas().style.cursor=''})}catch(_){}}
}
function row(color,title,desc){return'<div class="bp5507-row"><i style="background:'+color+'"></i><div><b>'+title+'</b><span>'+desc+'</span></div></div>'}
function key(){const s=shell();if(!s||$('bp5507-key'))return;const root=document.createElement('div');root.id='bp5507-key';root.innerHTML='<button type="button">MAP KEY · WEATHER + WORLD</button><div id="bp5507-key-panel" hidden><div class="bp5507-head"><div><b>BridgePoint map key</b><small id="bp5507-key-counts">Live weather + global science layers</small></div><button data-close type="button">×</button></div><section class="bp5507-section"><h4>U.S. weather + hazards</h4>'+row('#2c7cff','NOAA radar','Animated reflectivity at national zoom.')+row('#4ca7ff','Flood boundaries','Watch, advisory and warning geometry.')+row('#d596ff','Tornado / severe','Watch and warning polygons.')+row('#c9efff','Hail','Hail event/outlook context.')+row('#9ad7ff','Wind','Wind and severe-weather context.')+row('#ff744f','Wildfire','Source-backed active wildfire context.')+row('#ffe16d','Lightning','Source-backed event points.')+row('#65e6ff','Hurricane','Storm points, cone and track.')+row('#246bff','Global precipitation','NASA GPM IMERG 30-minute near-real-time precipitation across the globe; source latency is labeled.')+row('#68b9ff','U.S. radar / precipitation','NOAA radar remains distinct and overlays the global layer in U.S. view.')+row('#d8f7ff','Snow / winter / ice','Source-labeled winter weather; no invented accumulation.')+row('#b9d6df','Observations','Source weather reports and observations.')+'</section><section class="bp5507-section"><h4>Global geology + natural events</h4>'+row('#ffc45b','Earthquakes','USGS observed earthquake catalog.')+row('#ff615c','Volcano status','USGS volcano context; not a prediction.')+row('#5ce0ff','NASA natural events','NASA EONET open event context.')+row('#ba75ff','Plate boundaries','USGS tectonic boundaries.')+row('#47dbcf','Microplates','USGS microplate boundaries.')+row('#ffd861','Geysers / thermal','Materialized government/USGS reference geometry when available.')+'</section><section class="bp5507-section"><h4>Space + sky</h4>'+row('#78a9ff','NOAA space weather','SWPC global signals; non-spatial status.')+row('#8998a2','Live aircraft','Source-gated until approved feed exists.')+row('#8998a2','Satellite orbits','Source-gated until approved orbital catalog exists.')+row('#8998a2','Public cameras','Only public/embeddable or licensed feeds.')+'</section><div class="bp5507-note"><b>Truth labels:</b> alerts/forecasts remain distinct from observations. Scenario tools are hypothetical. Aircraft and satellite positions are never fabricated.</div></div>';s.appendChild(root);for(const id of ['liveLegend','landingWeatherLegend','bp2300WeatherKey']){const old=$(id);if(old)old.style.display='none'}const b=root.firstElementChild,p=$('bp5507-key-panel');b.onclick=()=>{p.hidden=!p.hidden};p.querySelector('[data-close]').onclick=()=>p.hidden=true}
function mobile(){if(!C.mobile)return;const s=shell(),g=document.createElement('div');g.id='bp5507-gesture';g.innerHTML='<i>☝ ☝</i><b>3D MAP GESTURE</b><span>Use two fingers and swipe / scroll up to tilt the map into 3D.</span>';s.appendChild(g);let y=null;const cv=C.map.getCanvas();cv.addEventListener('touchstart',e=>{if(e.touches.length===2)y=(e.touches[0].clientY+e.touches[1].clientY)/2},{passive:true});cv.addEventListener('touchmove',e=>{if(e.touches.length!==2||y===null)return;const n=(e.touches[0].clientY+e.touches[1].clientY)/2;if(y-n>24){try{C.map.easeTo({pitch:Math.max(62,C.map.getPitch()),duration:180})}catch(_){}g.classList.add('hide');setTimeout(()=>g.remove(),500);y=n}},{passive:true});cv.addEventListener('touchend',()=>y=null,{passive:true});setTimeout(()=>{if(g.isConnected){g.classList.add('hide');setTimeout(()=>g.remove(),500)}},9500);const mark=active=>{window.__BP_MOBILE_MAP_INTERACTION_V5580__={active,chromePersistent:true,updatedAt:Date.now()}};for(const ev of ['movestart','dragstart','zoomstart','rotatestart','pitchstart'])C.map.on(ev,()=>mark(true));for(const ev of ['moveend','dragend','zoomend','rotateend','pitchend'])C.map.on(ev,()=>mark(false));document.body.classList.remove('bp5507-mobile-busy')}
function weatherVisible(){for(const id of ['bp-v5004-weather-shape-fill','bp-v5004-weather-shape-line','bp-v5004-weather-point-glow','bp-v5004-weather-points','bp-v5004-weather-hit','bp-landing-weather-fill','bp-landing-weather-line','bp-landing-weather-glow','bp-landing-weather-points','bp-landing-weather-hit','bp-radar-a','bp-radar-b','bp-landing-radar-a','bp-landing-radar-b'])setLayerVisible(id,true)}
function globalInputPending(){try{return navigator.scheduling?.isInputPending?.({includeContinuous:true})===true}catch(_){return false}}
function globalBackgroundBlocked(){
 const hold=Number(window.__BP_INTERACTION_PRIORITY_UNTIL__||0),mapSurface=C.surface==='app'?document.querySelector('[data-surface="map"]'):null;
 return document.hidden||!!(mapSurface&&mapSurface.hidden)||C.map?.isMoving?.()||globalInputPending()||(hold>performance.now())
}
function scheduleGlobalBackground(delay=C.mobile?8500:2500){
 clearTimeout(C.bgTimer);
 C.bgTimer=setTimeout(()=>{
  if(globalBackgroundBlocked()){scheduleGlobalBackground(C.mobile?900:300);return}
  const run=async()=>{
   if(globalBackgroundBlocked()){scheduleGlobalBackground(C.mobile?900:300);return}
   if(C.bgRunning)return;C.bgRunning=true;
   try{await installGlobalWeather();await new Promise(r=>setTimeout(r,C.mobile?120:30));await refresh(true)}
   catch(e){console.warn('BridgePoint deferred global background',e)}
   finally{C.bgRunning=false;window.__BP_GLOBAL_RUNTIME_BOOT_V5516__={ready:true,visualsPending:false,networkPending:false,at:Date.now()}}
  };
  if('requestIdleCallback'in window)requestIdleCallback(()=>void run(),{timeout:C.mobile?3500:1400});else void run()
 },Math.max(0,delay));
 window.__BP_GLOBAL_BACKGROUND_SCHEDULER_V5592__={version:5592,deferred:true,interactionAware:true,offMapAware:true,sequentialSourceCommits:true,mobileReferenceHydrationDeferred:true,precipitationAttachImmediate:true,delayMs:delay,updatedAt:Date.now()}
}
async function boot(){
 try{
  await waitWorld();
  window.__BP_INTELLIGENCE_GLOBAL_RUNTIME_V5507__={version:5516,get map(){return C.map},get surface(){return C.surface},get signals(){return C.signals},get globalWeather(){return window.__BP_GLOBAL_WEATHER_V5510__||null},rpc,sessionKey,globe,refresh,globalVisible,source};
  window.__BP_GLOBAL_RUNTIME_BOOT_V5516__={ready:true,visualsPending:true,networkPending:true,at:Date.now()};
  console.info('BridgePoint global runtime v5516 ready');
  try{C.map.setMaxPitch&&C.map.setMaxPitch(85)}catch(_){}
  const visuals=()=>{
   try{globe(true)}catch(e){console.warn('BP globe setup',e)}
   try{addLayers()}catch(e){console.warn('BP global layers setup',e)}
   try{bindInfo()}catch(e){console.warn('BP global info setup',e)}
   try{key()}catch(e){console.warn('BP global key setup',e)}
   try{weatherVisible()}catch(e){console.warn('BP weather visibility setup',e)}
   window.__BP_GLOBAL_RUNTIME_BOOT_V5516__={ready:true,visualsPending:false,networkPending:window.__BP_GLOBAL_RUNTIME_BOOT_V5516__?.networkPending!==false,at:Date.now()}
  };
  visuals();
  // V5596: attach the lightweight global precipitation source/layer immediately.
  // Network-heavy global refresh stays pressure/interaction gated below.
  try{await installGlobalWeather()}catch(e){console.warn('BP global precipitation attach',e)}
  try{mobile()}catch(e){console.warn('BP mobile gesture setup',e)}
  try{C.map.once('load',()=>{visuals();try{void installGlobalWeather().catch(e=>console.warn('BP global precipitation load attach',e))}catch(_){}})}catch(_){}
  try{C.map.on('styledata',()=>{clearTimeout(C.styleTimer);C.styleTimer=setTimeout(()=>{if(C.map.isMoving?.())return;visuals()},C.mobile?900:300)})}catch(_){}
  try{const cv=C.map.getCanvas?.();for(const ev of ['pointerdown','touchstart','wheel'])cv?.addEventListener(ev,()=>{window.__BP_MAP_USER_INTENT_AT__=Date.now()},{once:true,passive:true,capture:true})}catch(_){}
  void centerOnViewerCountry().catch(e=>console.warn('BridgePoint viewer country start',e));
  scheduleGlobalBackground(C.surface==='app'?(C.mobile?8500:2500):(C.mobile?3000:1000));
  setInterval(()=>{if(document.hidden)return;scheduleGlobalBackground(C.mobile?700:220)},120000)
 }catch(e){
  window.__BP_GLOBAL_RUNTIME_BOOT_V5516__={ready:false,error:String(e?.message||e),at:Date.now()};
  console.error('BridgePoint global runtime',e)
 }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
