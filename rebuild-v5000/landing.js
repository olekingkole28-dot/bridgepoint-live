window.__BP_LIVE_COUNTRY_COUNTERS_VERSION__=5902;
const LOCAL_RUNTIME=location.hostname==='127.0.0.1'||location.hostname==='localhost';const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co',KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25',RPC=SUPA+'/rest/v1/rpc/',AUTH_STORE='bp_auth_v5045';const H={'apikey':KEY,'Content-Type':'application/json','Accept':'application/json'};let mode='signup',installPrompt=null,map=null,landingWeatherTimer=0,landingWeatherRetryTimer=0,landingWeatherEnabled=true,landingWeatherActivationPromise=null,landingWeatherModules=null,landingOpportunityTimer=0,landingOpportunitySeq=0,landingListingTimer=0,landingListingSeq=0,backdropFrame=0;const $=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString();async function rpc(n,a={},ms=5000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms),localNames=['bridgepoint_frontend_status_v5000','bridgepoint_data_sprint_status_v5106','bridgepoint_public_global_status_v957','bridgepoint_public_global_coverage_v5601','bridgepoint_public_global_coverage_v5597','bridgepoint_public_live_counters_v5902'],base=LOCAL_RUNTIME&&localNames.includes(n)?location.origin+'/rest/v1/rpc/':RPC;try{const r=await fetch(base+n,{method:'POST',headers:H,body:JSON.stringify(a),signal:c.signal,cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||('HTTP '+r.status));return d}finally{clearTimeout(t)}}function saveSession(d){if(!d?.access_token)return false;if(!d.expires_at&&d.expires_in)d.expires_at=Math.floor(Date.now()/1000)+Number(d.expires_in);localStorage.setItem(AUTH_STORE,JSON.stringify(d));return true}function hashSession(){const h=new URLSearchParams(location.hash.replace(/^#/,''));if(!h.get('access_token'))return false;saveSession({access_token:h.get('access_token'),refresh_token:h.get('refresh_token'),expires_in:h.get('expires_in')});history.replaceState(null,'',location.pathname+location.search);location.replace('/app/');return true}function setMode(v){mode=v==='signin'?'signin':'signup';const s=mode==='signup';$('nameField').hidden=!s;$('authTitle').textContent=s?'Start using BridgePoint':'Welcome back';$('authEyebrow').textContent=s?'CREATE YOUR BRIDGEPOINT ACCOUNT':'SIGN IN TO BRIDGEPOINT';$('authIntro').textContent=s?'Your account connects Saved, package access, Claims and Workflow to the same BridgePoint identity.':'Sign in to continue into your BridgePoint workspace.';$('authSubmit').textContent=s?'CREATE ACCOUNT':'SIGN IN';$('authSwitch').textContent=s?'Already have an account? Sign in':'Need an account? Create one';$('authPassword').autocomplete=s?'new-password':'current-password';$('authMessage').textContent=''}function openAuth(v){setMode(v||'signup');$('authModal').hidden=false;setTimeout(()=>$('authEmail').focus(),50)}async function submit(e){e.preventDefault();const email=$('authEmail').value.trim(),password=$('authPassword').value,name=$('authName').value.trim(),m=$('authMessage'),b=$('authSubmit');b.disabled=true;m.textContent=mode==='signup'?'Creating your BridgePoint account…':'Signing in…';try{const path=mode==='signup'?'signup':'token?grant_type=password',body=mode==='signup'?{email,password,data:{display_name:name||email.split('@')[0],signup_source:'bridgepoint_landing'}}:{email,password};const r=await fetch(SUPA+'/auth/v1/'+path,{method:'POST',headers:H,body:JSON.stringify(body),cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok){window.BridgePointAcquisition?.send?.(mode==='signup'?'SIGNUP_ERROR':'SIGNIN_ERROR',{auth_surface:'landing',http_status:r.status});throw new Error(d.msg||d.message||d.error_description||d.error||('HTTP '+r.status))}const hasSession=saveSession(d);if(mode==='signup'){window.BridgePointAcquisition?.send?.('SIGNUP_SUCCESS',{auth_surface:'landing',session_returned:hasSession,confirmation_required:!hasSession});if(d?.user?.id)window.BridgePointAcquisition?.identify?.(d.user.id,{auth_surface:'landing',signup_source:'bridgepoint_landing'});if(hasSession){m.textContent='Account ready. Opening BridgePoint…';const target=localStorage.getItem('bp_landing_package')?'/app/?page=packages':'/app/';setTimeout(()=>location.assign(target),250)}else m.textContent='Account created. Check your email if confirmation is required, then sign in.'}else{if(!hasSession)throw new Error('No session returned. Please retry.');window.BridgePointAcquisition?.send?.('SIGNIN_SUCCESS',{auth_surface:'landing'});if(d?.user?.id)window.BridgePointAcquisition?.identify?.(d.user.id,{auth_surface:'landing'});m.textContent='Account ready. Opening BridgePoint…';const target=localStorage.getItem('bp_landing_package')?'/app/?page=packages':'/app/';setTimeout(()=>location.assign(target),250)}}catch(err){m.textContent=String(err.message||err)}finally{b.disabled=false}}
function landingWeatherColorExpr(){
 // WMO_CAP_WARNING shapes inherit a phenomenon-specific icon_key when classified; unknown warnings use severity colors.
 return['match',['get','icon_key'],
 'probsevere','#ff18df','wildfire','#ff3e18','fire','#ff7922','tornado','#bd5cff',
 'hurricane','#20eaff','thunderstorm','#ff562f','lightning','#ffe529','hail','#6deaff',
 'flood','#168cff','wind','#8bdcff','rain','#35baff','snow','#eafaff','ice','#98efff',
 'earthquake','#ffc247','volcano','#ff5147','dust','#d2b18a','heat','#ff8058',
 'drought','#ffd052','landslide','#c89470',
 'alert',['match',['get','severity'],'Extreme','#ff3b30','Severe','#ff8a3d','Moderate','#ffd34d','Minor','#59e4ff','#ffbd3f'],
 '#ffbd3f']
}
const BP_LANDING_WEATHER_ICON_CATALOG_V6132=[
 {key:'probsevere',glyph:'⛈',color:'#ff18df'},{key:'wildfire',glyph:'🔥',color:'#ff3e18'},
 {key:'fire',glyph:'🔥',color:'#ff7922'},{key:'tornado',glyph:'🌪',color:'#bd5cff'},
 {key:'hurricane',glyph:'🌀',color:'#20eaff'},{key:'thunderstorm',glyph:'⛈',color:'#ff562f'},
 {key:'lightning',glyph:'⚡',color:'#ffe529'},{key:'hail',glyph:'🧊',color:'#6deaff'},
 {key:'flood',glyph:'🌊',color:'#168cff'},{key:'wind',glyph:'💨',color:'#8bdcff'},
 {key:'rain',glyph:'🌧',color:'#35baff'},{key:'snow',glyph:'❄',color:'#eafaff'},
 {key:'ice',glyph:'🧊',color:'#98efff'},{key:'earthquake',glyph:'〰',color:'#ffc247'},
 {key:'volcano',glyph:'🌋',color:'#ff5147'},{key:'dust',glyph:'🌫',color:'#d2b18a'},
 {key:'heat',glyph:'🌡',color:'#ff8058'},{key:'drought',glyph:'☀',color:'#ffd052'},
 {key:'landslide',glyph:'⛰',color:'#c89470'},{key:'alert',glyph:'⚠',color:'#ffbd3f'}
];
function landingWeatherIconKey(type){
 const t=String(type||'').trim().toUpperCase().replace(/[\s-]+/g,'_');
 if(t.includes('PROBSEVERE')||t==='PROB_SEVERE')return'probsevere';
 if(t.includes('WILDFIRE'))return'wildfire';if(t.includes('FIRE'))return'fire';
 if(t.includes('TORNADO')||t==='TOR')return'tornado';
 if(t.includes('HURRICANE')||t.includes('CYCLONE')||t.includes('TROPICAL_STORM'))return'hurricane';
 if(t.includes('LIGHTNING'))return'lightning';
 if(t.includes('THUNDER')||t.includes('CONVECTIVE')||t==='STORM')return'thunderstorm';
 if(t.includes('HAIL'))return'hail';
 if(t.includes('FLOOD')||t.includes('INUNDATION')||t.includes('SURGE'))return'flood';
 if(t.includes('WIND')||t.includes('GUST'))return'wind';
 if(t.includes('RAIN')||t.includes('DRIZZLE')||t.includes('PRECIP'))return'rain';
 if(t.includes('SNOW')||t.includes('BLIZZARD')||t.includes('SLEET'))return'snow';
 if(t.includes('ICE')||t.includes('FREEZ'))return'ice';
 if(t.includes('EARTHQUAKE')||t.includes('SEISMIC'))return'earthquake';
 if(t.includes('VOLCANO')||t.includes('VOLCANIC'))return'volcano';
 if(t.includes('DUST')||t.includes('ASH'))return'dust';
 if(t.includes('HEAT')||t.includes('TEMPERATURE'))return'heat';
 if(t.includes('DROUGHT'))return'drought';
 if(t.includes('LANDSLIDE')||t.includes('MUDSLIDE'))return'landslide';
 return'alert'
}
function landingWeatherSeverityRank(value){const v=String(value||'').trim().toUpperCase();return v==='EXTREME'?4:v==='SEVERE'?3:v==='MODERATE'?2:v==='MINOR'?1:0}
function landingWeatherGeometryAnchor(geometry){
 const points=[];const visit=value=>{if(!Array.isArray(value))return;if(value.length>=2&&typeof value[0]==='number'&&typeof value[1]==='number'&&Number.isFinite(value[0])&&Number.isFinite(value[1])){points.push(value);return}for(const item of value)visit(item)};
 visit(geometry?.coordinates);if(!points.length)return null;const limit=Math.min(points.length,1600);let lng=0,lat=0;
 for(let i=0;i<limit;i++){lng+=points[i][0];lat+=points[i][1]}return[lng/limit,lat/limit]
}
function ensureLandingWeatherIconSprites(map){
 if(!map?.addImage)return false;
 for(const spec of BP_LANDING_WEATHER_ICON_CATALOG_V6132){
  const id='bp-landing-wx-icon-v6132-'+spec.key;
  try{if(map.hasImage?.(id))continue;const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;const ctx=canvas.getContext('2d');if(!ctx)continue;
   ctx.scale(2,2);ctx.clearRect(0,0,24,24);ctx.shadowColor=spec.color;ctx.shadowBlur=3;ctx.beginPath();ctx.arc(12,12,10.7,0,Math.PI*2);ctx.fillStyle='rgba(3,12,20,.97)';ctx.fill();ctx.shadowBlur=0;ctx.lineWidth=2.3;ctx.strokeStyle=spec.color;ctx.stroke();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='15px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';ctx.fillText(spec.glyph,12,12.5);map.addImage(id,canvas,{pixelRatio:2})
  }catch(e){console.warn('BridgePoint landing hazard icon',spec.key,e)}
 }
 return BP_LANDING_WEATHER_ICON_CATALOG_V6132.every(spec=>{try{return !!map.hasImage?.('bp-landing-wx-icon-v6132-'+spec.key)}catch(_){return false}})
}
function landingGroundRadarTileUrlV6132(epoch){
 const base='https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer/exportImage';
 return base+'?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&time='+encodeURIComponent(String(epoch))+'&f=image'
}
function ensureLandingGroundRadarDrapeV6132(map){
 if(!map?.addSource||!map?.getLayer)return false;
 const sourceId='bp-landing-v6132-ground-radar-source',layerId='bp-landing-v6132-ground-radar',frame=()=>Math.floor(Date.now()/300000)*300000;
 const before=['gta-landmark3d-base','gta-bridge3d-pier','gta-context-building-shadow','gta-context-buildings','gta-place-label'].find(id=>map.getLayer(id));
 try{
  if(!map.getSource(sourceId))map.addSource(sourceId,{type:'raster',tiles:[landingGroundRadarTileUrlV6132(frame())],tileSize:256,minzoom:0,maxzoom:14,attribution:'NOAA/NWS radar reflectivity'});
  if(!map.getLayer(layerId))map.addLayer({id:layerId,type:'raster',source:sourceId,minzoom:0,maxzoom:24,paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,.50,1.5,.50,3,.53,5,.59,8,.63,12,.66,18,.66],'raster-saturation':.55,'raster-contrast':.32,'raster-fade-duration':0,'raster-resampling':'linear'}},before);
  try{if((map.getLayoutProperty(layerId,'visibility')||'visible')!=='visible')map.setLayoutProperty(layerId,'visibility','visible')}catch(_){}
  let state=window.__BP_LANDING_GROUND_RADAR_DRAPE_V6132__;
  if(!state||state.map!==map){
   state={version:6132,map,enabled:true,layerId,sourceId,terrainAware:!!map.getTerrain?.(),placedBelowBuildings:true,region:'NOAA/NWS radar coverage',updatedAt:Date.now()};
   window.__BP_LANDING_GROUND_RADAR_DRAPE_V6132__=state;
   state.refresh=()=>{if(document.hidden||map.isMoving?.())return;try{map.getSource(sourceId)?.setTiles?.([landingGroundRadarTileUrlV6132(frame())]);map.triggerRepaint?.();state.updatedAt=Date.now()}catch(_){}};
   state.timer=setInterval(state.refresh,300000);
   try{map.on('styledata',()=>{try{if(map.getLayer(layerId)){if((map.getLayoutProperty(layerId,'visibility')||'visible')!=='visible')map.setLayoutProperty(layerId,'visibility','visible')}else ensureLandingGroundRadarDrapeV6132(map)}catch(_){}})}catch(_){}
  }
  return true
 }catch(error){window.__BP_LANDING_GROUND_RADAR_DRAPE_V6132_ERROR__=String(error?.message||error);return false}
}
function landingWeatherCollections(items){
 const points=[],shapes=[];
 for(const item of items||[]){
  const rawType=String(item.type||'WEATHER_REPORT').trim().toUpperCase().replace(/[\s-]+/g,'_');
  const rawSeverity=String(item.severity||''),severityKey=rawSeverity.trim().toUpperCase(),rawPhen=String(item.phenom||item.phenomenon||'').trim().toUpperCase();
  let icon_key=landingWeatherIconKey([rawType,item.phenom,item.phenomenon,item.event,item.name].filter(Boolean).join(' '));
  if(icon_key==='alert'){const phenomIcon={TO:'tornado',SV:'thunderstorm',FF:'flood',FA:'flood',HU:'hurricane',TR:'hurricane',TS:'hurricane',FL:'flood',CF:'flood',HY:'flood',WS:'snow',WW:'snow',BZ:'snow',EC:'ice',WC:'wind',HW:'wind',WI:'wind',HT:'heat',EH:'heat',LE:'snow'};icon_key=phenomIcon[rawPhen]||'alert'}
  const iconSpec=BP_LANDING_WEATHER_ICON_CATALOG_V6132.find(x=>x.key===icon_key)||BP_LANDING_WEATHER_ICON_CATALOG_V6132[BP_LANDING_WEATHER_ICON_CATALOG_V6132.length-1];
  const props={type:rawType==='PROBSEVERE_STORM'?'PROBSEVERE_STORM':rawType,name:item.name||item.type||'Weather event',severity:({EXTREME:'Extreme',SEVERE:'Severe',MODERATE:'Moderate',MINOR:'Minor'}[severityKey]||rawSeverity),severity_rank:landingWeatherSeverityRank(severityKey),icon_key,icon_color:iconSpec.color,certainty:item.certainty||'',urgency:item.urgency||'',observed:item.observed===true,source:item.source||'',observed_at:item.observed_at||'',ends_at:item.ends_at||''};
  const gt=item.geometry?.type||'';
  if(['Polygon','MultiPolygon','LineString','MultiLineString'].includes(gt))shapes.push({type:'Feature',properties:props,geometry:item.geometry});
  let lon=Number(item.lon??item.longitude??item.lng),lat=Number(item.lat??item.latitude);
  if(!(Number.isFinite(lon)&&Number.isFinite(lat))&&gt==='Point'&&Array.isArray(item.geometry?.coordinates)){lon=Number(item.geometry.coordinates[0]);lat=Number(item.geometry.coordinates[1])}
  if(!(Number.isFinite(lon)&&Number.isFinite(lat))){const anchor=landingWeatherGeometryAnchor(item.geometry);if(anchor){lon=anchor[0];lat=anchor[1]}}
  if(Number.isFinite(lon)&&Number.isFinite(lat)&&Math.abs(lon)<=180&&Math.abs(lat)<=90)points.push({type:'Feature',properties:props,geometry:{type:'Point',coordinates:[lon,lat]}})
 }
 return{points:{type:'FeatureCollection',features:points},shapes:{type:'FeatureCollection',features:shapes}}
}
function ensureLandingWeatherLegend(){
 let root=$('landingWeatherLegend');if(root)return root;
 root=document.createElement('div');root.id='landingWeatherLegend';root.className='landing-weather-legend';
 root.innerHTML='<div class="landing-weather-head"><b>CINEMATIC WEATHER FX</b><span><span id="landingWeatherCount">FX INITIALIZING</span> <button id="landingWeatherToggle" type="button" aria-expanded="false">MORE</button></span></div><div class="landing-weather-items"><span><i style="color:#68b9ff;background:#68b9ff"></i>Rain</span><span><i style="color:#dff7ff;background:#dff7ff"></i>Snow / hail</span><span><i style="color:#65e6ff;background:#65e6ff"></i>Hurricane vortex</span><span><i style="color:#d596ff;background:#d596ff"></i>Tornado funnel</span><span><i style="color:#ffe16d;background:#ffe16d"></i>Lightning</span><span><i style="color:#ff744f;background:#ff744f"></i>Wildfire + smoke</span><span style="color:#ff18df">⛈ ProbSevere storms</span></div><div id="landingWeatherMore" class="landing-weather-more" hidden><div class="landing-weather-grid"><span style="color:#68b9ff">Animated rain bands and precipitation</span><span style="color:#dff7ff">Snow and hail particle fields</span><span style="color:#65e6ff">Rotating 3D cyclone spiral and eye</span><span style="color:#d596ff">Rotating tornado / funnel volume</span><span style="color:#ffe16d">Forked lightning and cloud flashes</span><span style="color:#ff744f">Anchored flames, smoke and ash</span><span style="color:#4ca7ff">Source-backed flood and snow-depth volumes</span><span style="color:#9ad7ff">Wind-driven weather cells</span></div><small>Source-backed hazard icons and boundaries are visible from globe zoom; ProbSevere storm areas use vivid magenta outlines and translucent fills. NOAA/NWS reflectivity is separately draped over the ground where radar coverage exists. No fake global storm events are fabricated, and old screen-space weather effects remain disabled.</small></div><small id="landingWeatherTime">Initializing shared WebGL weather effects…</small>';
 document.querySelector('.preview')?.appendChild(root);
 const t=$('landingWeatherToggle'),m=$('landingWeatherMore');
 if(t&&m)t.onclick=e=>{e.stopPropagation();const open=m.hidden;m.hidden=!open;root.classList.toggle('expanded',open);t.textContent=open?'LESS':'MORE';t.setAttribute('aria-expanded',String(open))};
 return root
}

function landingWeatherPopup(m,e){const f=e.features?.[0];if(!f)return;const p=f.properties||{},wrap=document.createElement('div');wrap.style.cssText='min-width:200px;max-width:280px;font-family:Inter,system-ui,sans-serif;color:#071118';const title=document.createElement('b');title.style.cssText='display:block;font-size:13px';title.textContent=p.name||p.type||'Live weather';const meta=document.createElement('div');meta.style.cssText='margin-top:5px;font-size:10px;line-height:1.45;color:#415661';meta.textContent=[p.type?String(p.type).replaceAll('_',' '):'',p.severity||'',p.source||''].filter(Boolean).join(' · ');wrap.append(title,meta);new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'310px'}).setLngLat(e.lngLat).setDOMContent(wrap).addTo(m)}

let landingRadarActive='A',landingRadarFrames=[],landingRadarIndex=0,landingRadarTimer=0;
function landingRadarTileUrl(epoch){
 const base='https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer/exportImage';
 const time=Number.isFinite(+epoch)?'&time='+encodeURIComponent(String(epoch)):'';
 return base+'?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true'+time+'&f=image'
}
function landingWeatherBefore(m){for(const id of ['gta-landmark3d-base','gta-bridge3d-pier','gta-context-building-shadow','gta-context-buildings','gta-state','gta-place-label'])if(m.getLayer(id))return id;return undefined}
function installLandingRadar(world){
 const m=world?.map;if(!m)return false;const before=landingWeatherBefore(m),blank='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
 try{
  for(const side of ['A','B']){
   const sid='bpLandingRadar'+side,lid='bp-landing-radar-'+side.toLowerCase();
   if(!m.getSource(sid))m.addSource(sid,{type:'raster',tiles:[blank],tileSize:256,minzoom:0,maxzoom:14});
   if(!m.getLayer(lid))m.addLayer({id:lid,type:'raster',source:sid,minzoom:0,maxzoom:24,layout:{visibility:'visible'},paint:{'raster-opacity':0,'raster-fade-duration':0,'raster-resampling':'linear'}},before);
   try{if(before&&m.getLayer(lid))m.moveLayer(lid,before)}catch(_){} 
  }
  if(!m.__bpLandingRadarDrape5822){m.__bpLandingRadarDrape5822=true;const pin=()=>{const b=landingWeatherBefore(m);for(const id of ['bp-landing-radar-a','bp-landing-radar-b'])try{if(b&&m.getLayer(id))m.moveLayer(id,b)}catch(_){};window.__BP_LANDING_RADAR_DRAPE_V5822__={terrain:!!m.getTerrain?.(),below3d:true,sourceMaxZoom:14,displayMaxZoom:24,updatedAt:Date.now()}};m.on?.('pitchend',pin);m.on?.('zoomend',pin);m.on?.('styledata',pin);setTimeout(pin,0)}
  return !!m.getLayer('bp-landing-radar-a')&&!!m.getLayer('bp-landing-radar-b')
 }catch(e){console.warn('Landing radar install',e);return false}
}
function landingRadarFramesNow(){
 const step=5*60*1000,end=Math.floor(Date.now()/step)*step,out=[];
 for(let i=11;i>=0;i--)out.push(end-i*step);
 return out
}
function showLandingRadarFrame(world,epoch){
 const m=world?.map;if(!m||!installLandingRadar(world))return false;
 const next=landingRadarActive==='A'?'B':'A',sid='bpLandingRadar'+next,lid='bp-landing-radar-'+next.toLowerCase(),old='bp-landing-radar-'+landingRadarActive.toLowerCase(),src=m.getSource(sid);
 if(!src||typeof src.setTiles!=='function')return false;
 try{
  src.setTiles([landingRadarTileUrl(epoch)]);
  for(const id of [lid,old]){const vis=m.getLayoutProperty(id,'visibility')||'visible';if(vis==='none')m.setLayoutProperty(id,'visibility','visible')}
  setTimeout(()=>{try{m.setPaintProperty(lid,'raster-opacity',.70);m.setPaintProperty(old,'raster-opacity',0);landingRadarActive=next;m.triggerRepaint();window.__BP_LANDING_RADAR_STATE__={visible:true,active:next,epoch,opacity:.70,updatedAt:Date.now()}}catch(_){}},220);
  return true
 }catch(e){console.warn('Landing radar frame',e);return false}
}
function startLandingRadar(world){
 const m=world?.map;if(!m)return;
 clearInterval(landingRadarTimer);landingRadarTimer=0;
 ensureLandingGroundRadarDrapeV6132(m);
 window.__BP_LANDING_RADAR_STATE__={version:6132,visible:true,enabled:true,groundDraped:true,layerId:'bp-landing-v6132-ground-radar',source:'NOAA/NWS radar reflectivity',refreshCadenceMs:300000,terrainAware:!!m.getTerrain?.(),updatedAt:Date.now()}
}
function installLandingNationalWeather(world){
 const m=world?.map;if(!m)return false;ensureLandingGroundRadarDrapeV6132(m);ensureLandingWeatherIconSprites(m);
 const empty={type:'FeatureCollection',features:[]};
 const install=()=>{
  try{if(!m.getSource('bpLandingWeatherPoints'))m.addSource('bpLandingWeatherPoints',{type:'geojson',data:empty})}catch(e){console.warn('Landing weather point source',e)}
  try{if(!m.getSource('bpLandingWeatherShapes'))m.addSource('bpLandingWeatherShapes',{type:'geojson',data:empty})}catch(e){console.warn('Landing weather shape source',e)}
  const add=layer=>{try{if(!m.getLayer(layer.id))m.addLayer(layer);return !!m.getLayer(layer.id)}catch(e){window.__BP_LANDING_WEATHER_LAYER_ERRORS__=[...(window.__BP_LANDING_WEATHER_LAYER_ERRORS__||[]),{id:layer.id,message:String(e?.message||e),at:Date.now()}].slice(-12);console.warn('Landing weather layer '+layer.id,e);return false}};
  add({id:'bp-landing-weather-fill',type:'fill',source:'bpLandingWeatherShapes',minzoom:0,layout:{visibility:'visible'},paint:{'fill-color':landingWeatherColorExpr(),'fill-opacity':['interpolate',['linear'],['zoom'],0,.26,2,.28,4,.30,7,.30,11,.29,16,.30]}});
  add({id:'bp-landing-weather-line',type:'line',source:'bpLandingWeatherShapes',minzoom:0,paint:{'line-color':landingWeatherColorExpr(),'line-width':['interpolate',['linear'],['zoom'],0,3.2,1.2,3.6,2.2,4.0,4,4.6,8,5.4,14,6.8],'line-opacity':['case',['==',['get','observed'],true],1,.99]}});
  add({id:'bp-landing-weather-glow',type:'circle',source:'bpLandingWeatherPoints',minzoom:0,paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,5.8,1.2,6.7,2.2,7.8,3.5,9,8,10.5,13,14,17],'circle-color':landingWeatherColorExpr(),'circle-opacity':['case',['==',['get','observed'],true],.56,.42],'circle-blur':.48}});
  add({id:'bp-landing-weather-points',type:'circle',source:'bpLandingWeatherPoints',minzoom:0,paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,3.8,1.2,4.4,2.2,5.0,3.5,5.8,4.5,6.7,9,8.5,14,10.5],'circle-color':landingWeatherColorExpr(),'circle-opacity':['case',['==',['get','observed'],true],.99,.92],'circle-stroke-color':'#f5fdff','circle-stroke-width':['interpolate',['linear'],['zoom'],0,1.1,2.2,1.25,3.5,1.45,4.5,1.6,12,1.9],'circle-stroke-opacity':['interpolate',['linear'],['zoom'],0,.92,3.5,.95,6,.98,12,.99]}});
  ensureLandingWeatherIconSprites(m);if(!m.getLayer('bp-landing-v6132-weather-icons')){const firstSymbol=m.getStyle?.()?.layers?.find(l=>l.type==='symbol')?.id;add({id:'bp-landing-v6132-weather-icons',type:'symbol',source:'bpLandingWeatherPoints',minzoom:0,layout:{'icon-image':['concat','bp-landing-wx-icon-v6132-', ['coalesce',['get','icon_key'],'alert']],'icon-size':['interpolate',['linear'],['zoom'],0,1.28,1.5,1.24,3,1.18,6,1.12,10,1.06],'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-optional':true,'icon-padding':0,'symbol-sort-key':['-',100,['coalesce',['get','severity_rank'],0]]},paint:{'icon-opacity':.99}});try{if(firstSymbol&&m.getLayer('bp-landing-v6132-weather-icons'))m.moveLayer('bp-landing-v6132-weather-icons',firstSymbol)}catch(_){}}add({id:'bp-landing-weather-hit',type:'circle',source:'bpLandingWeatherPoints',minzoom:0,paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,7,3.5,9,9,13],'circle-color':'#ffffff','circle-opacity':.001,'circle-stroke-opacity':0}});
  const pendingWeather=window.__BP_PENDING_LANDING_WEATHER_V6134__;if(pendingWeather){try{m.getSource('bpLandingWeatherPoints')?.setData(pendingWeather.points);m.getSource('bpLandingWeatherShapes')?.setData(pendingWeather.shapes);if(m.getSource('bpLandingWeatherPoints')&&m.getSource('bpLandingWeatherShapes')){window.__BP_PENDING_LANDING_WEATHER_V6134__=null;for(const id of ['bp-landing-weather-fill','bp-landing-weather-line','bp-landing-weather-glow','bp-landing-weather-points','bp-landing-v6132-weather-icons','bp-landing-weather-hit'])try{if(m.getLayer(id))m.setLayoutProperty(id,'visibility','visible')}catch(_){}}}catch(_){}}const interactive=['bp-landing-weather-hit','bp-landing-weather-points','bp-landing-weather-fill','bp-landing-weather-line'].filter(id=>m.getLayer(id));
  if(!m.__bpLandingWeatherBound&&interactive.length){m.__bpLandingWeatherBound=true;for(const id of interactive){m.on('click',id,e=>landingWeatherPopup(m,e));m.on('mouseenter',id,()=>m.getCanvas().style.cursor='pointer');m.on('mouseleave',id,()=>{m.getCanvas().style.cursor=''})}}
  return !!m.getLayer('bp-landing-weather-line')&&!!m.getLayer('bp-landing-weather-points')
 };
 ensureLandingWeatherLegend();
 if(m.loaded()||m.isStyleLoaded?.())return install();
 try{m.once('styledata',install);m.once('idle',install);m.once('load',install)}catch(_){}
 setTimeout(install,180);setTimeout(install,700);return false
}

const BP_SOURCE_WEATHER_CACHE_KEY_V6134='bp_source_weather_items_v6134';
const BP_SOURCE_WEATHER_CACHE_MAX_AGE_V6134=15*60*1000;
let landingWeatherWarmupPromiseV6134=null;
function saveLandingWeatherCacheV6134(items,generatedAt){
 if(!Array.isArray(items)||!items.length)return false;
 try{
  let payload=null;
  for(const limit of [250,160,100,60]){
   payload=JSON.stringify({savedAt:Date.now(),generatedAt:generatedAt||null,items:items.slice(0,limit)});
   if(payload.length<=850000)break;
   payload=null;
  }
  if(!payload)return false;
  localStorage.setItem(BP_SOURCE_WEATHER_CACHE_KEY_V6134,payload);
  return true;
 }catch(error){window.__BP_LANDING_WEATHER_CACHE_WRITE_ERROR_V6134__=String(error?.message||error).slice(0,160);return false}
}
function readLandingWeatherCacheV6134(){
 try{
  const value=JSON.parse(localStorage.getItem(BP_SOURCE_WEATHER_CACHE_KEY_V6134)||'null');
  if(!Array.isArray(value?.items)||!value.items.length)return null;
  const age=Date.now()-Number(value.savedAt||0);
  if(age<0||age>BP_SOURCE_WEATHER_CACHE_MAX_AGE_V6134)return null;
  return value;
 }catch(_){return null}
}
async function requestLandingWeatherBootstrapV6134(){
 try{return await rpc('bridgepoint_public_weather_bootstrap_v5823',{},7000)}
 catch(first){console.warn('global weather bootstrap v5823',first);try{return await rpc('bridgepoint_public_weather_bootstrap_v5821',{},7000)}
 catch(second){console.warn('global weather bootstrap v5821',second);return await rpc('bridgepoint_public_weather_bootstrap_v5512',{},6000)}}
}
function warmLandingWeatherFirstFrameV6134(){
 if(landingWeatherWarmupPromiseV6134)return;
 landingWeatherWarmupPromiseV6134=requestLandingWeatherBootstrapV6134().then(d=>{
  if(d?.fresh===true&&Array.isArray(d.items))saveLandingWeatherCacheV6134(d.items,d.generated_at);
  return d;
 }).catch(error=>{console.warn('BridgePoint homepage first-frame weather warmup',error);return null});
}
async function takeLandingWeatherBootstrapV6134(){
 if(landingWeatherWarmupPromiseV6134){
  const pending=landingWeatherWarmupPromiseV6134;
  landingWeatherWarmupPromiseV6134=null;
  return await pending;
 }
 const d=await requestLandingWeatherBootstrapV6134();
 if(d?.fresh===true&&Array.isArray(d.items))saveLandingWeatherCacheV6134(d.items,d.generated_at);
 return d;
}
function applyLandingWeatherItemsV6134(world,items){
 const m=world?.map;if(!m||!landingWeatherEnabled||!Array.isArray(items))return null;
 const wx=landingWeatherCollections(items);
 window.__BP_PENDING_LANDING_WEATHER_V6134__=wx;
 installLandingNationalWeather(world);
 const ps=m.getSource('bpLandingWeatherPoints'),ss=m.getSource('bpLandingWeatherShapes');
 if(ps?.setData)ps.setData(wx.points);
 if(ss?.setData)ss.setData(wx.shapes);
 if(ps?.setData&&ss?.setData)window.__BP_PENDING_LANDING_WEATHER_V6134__=null;
 for(const id of ['bp-landing-weather-fill','bp-landing-weather-line','bp-landing-weather-glow','bp-landing-weather-points','bp-landing-v6132-weather-icons','bp-landing-weather-hit'])try{if(m.getLayer(id))m.setLayoutProperty(id,'visibility','visible')}catch(_){}
 return wx;
}
function restoreLandingWeatherFirstFrameV6134(world){
 const cached=readLandingWeatherCacheV6134();
 if(!cached||!world?.map||!landingWeatherEnabled)return false;
 try{
  const wx=applyLandingWeatherItemsV6134(world,cached.items);if(!wx)return false;
  window.__BP_LANDING_WEATHER_CACHE_FIRST_FRAME_V6134__={used:true,items:cached.items.length,points:wx.points.features.length,shapes:wx.shapes.features.length,ageMs:Date.now()-cached.savedAt,generated_at:cached.generatedAt||null,updatedAt:Date.now()};
  if($('landingWeatherCount'))$('landingWeatherCount').textContent=cached.items.length+' EVENTS · CACHED';
  if($('landingWeatherTime'))$('landingWeatherTime').textContent='Showing last source snapshot while new observations refresh';
  return true;
 }catch(error){window.__BP_LANDING_WEATHER_CACHE_RESTORE_ERROR_V6134__=String(error?.message||error).slice(0,160);return false}
}
async function loadLandingNationalWeather(world,attempt=0){if(!landingWeatherEnabled)return false;
 const m=world?.map;if(!m)return false;
 try{
  if(!m.getLayer('bp-landing-weather-line')||!m.getLayer('bp-landing-weather-points'))installLandingNationalWeather(world);
  const d=await takeLandingWeatherBootstrapV6134();
  if(d?.fresh!==true){if(Array.isArray(d?.items)&&d.items.length){const staleWx=applyLandingWeatherItemsV6134(world,d.items);if(staleWx)window.__BP_LANDING_WEATHER_STALE_V6134__={usedCachedItems:true,items:d.items.length,points:staleWx.points.features.length,shapes:staleWx.shapes.features.length,generated_at:d.generated_at,updatedAt:Date.now()}}if($('landingWeatherCount'))$('landingWeatherCount').textContent=window.__BP_LANDING_WEATHER_STALE_V6134__?.items?window.__BP_LANDING_WEATHER_STALE_V6134__.items+' EVENTS · REFRESHING':'REFRESHING';if($('landingWeatherTime'))$('landingWeatherTime').textContent='Keeping last available source weather visible while current observations refresh.';if(attempt<4){clearTimeout(landingWeatherRetryTimer);landingWeatherRetryTimer=setTimeout(()=>{if(landingWeatherEnabled)void loadLandingNationalWeather(world,attempt+1)},Math.min(9000,2200*(attempt+1)))}return false}
   saveLandingWeatherCacheV6134(d.items||[],d.generated_at);window.__BP_LANDING_WEATHER_STALE_V6134__=null;const wx=applyLandingWeatherItemsV6134(world,d.items||[]);if(!wx)throw new Error('Homepage weather layers not ready');for(const id of ['bp-landing-weather-fill','bp-landing-weather-line','bp-landing-weather-glow','bp-landing-weather-points','bp-landing-v6132-weather-icons','bp-landing-weather-hit'])try{if(m.getLayer(id))m.setLayoutProperty(id,'visibility','visible')}catch(_){}
  for(const id of ['bp-landing-weather-line','bp-landing-weather-glow','bp-landing-weather-points'])try{if(m.getLayer(id))m.moveLayer(id)}catch(_){}
  if($('landingWeatherCount'))$('landingWeatherCount').textContent=(d.items?.length||0)+' EVENTS';
  if($('landingWeatherTime'))$('landingWeatherTime').textContent='Fresh '+new Date(d.generated_at).toLocaleTimeString()+' · global source events + tracks · U.S. watch/warning geometry · live precipitation context';
  window.__BP_LANDING_LIVE_WEATHER__={fresh:true,count:d.items?.length||0,shapeCount:wx.shapes.features.length,pointCount:wx.points.features.length,updatedAt:Date.now()};
  clearTimeout(landingWeatherRetryTimer);return true
 }catch(e){
  console.warn('Landing national weather',e);
  if($('landingWeatherCount'))$('landingWeatherCount').textContent='RETRYING';
  if($('landingWeatherTime'))$('landingWeatherTime').textContent='Live source request is retrying · existing map layers stay visible.';
  if(attempt<4){clearTimeout(landingWeatherRetryTimer);landingWeatherRetryTimer=setTimeout(()=>{if(landingWeatherEnabled)void loadLandingNationalWeather(world,attempt+1)},Math.min(9000,2200*(attempt+1)))}
  return false
 }
}
async function startLandingNationalWeather(world){const m=world?.map;if(!m||!landingWeatherEnabled)return;ensureLandingGroundRadarDrapeV6132(m);installLandingNationalWeather(world);restoreLandingWeatherFirstFrameV6134(world);window.__BP_LANDING_WEATHER_LAYER_STATE__={line:!!m.getLayer('bp-landing-weather-line'),points:!!m.getLayer('bp-landing-weather-points'),fill:!!m.getLayer('bp-landing-weather-fill'),glow:!!m.getLayer('bp-landing-weather-glow'),errors:window.__BP_LANDING_WEATHER_LAYER_ERRORS__||[],firstFrameCache:true,updatedAt:Date.now()};void loadLandingNationalWeather(world,0);clearInterval(landingWeatherTimer);clearTimeout(landingListingTimer);landingWeatherTimer=setInterval(()=>{if(landingWeatherEnabled)void loadLandingNationalWeather(world,0)},60000)} function hideLegacyLandingWeather(targetMap=map){
 const m=targetMap;if(!m)return;
 // Keep the NOAA radar in its dedicated ground-draped layer and preserve source polygons/lines.
 ensureLandingGroundRadarDrapeV6132(m);
 for(const id of ['bp-landing-radar-a','bp-landing-radar-b'])try{if(m.getLayer(id)){m.setLayoutProperty(id,'visibility','none');if(Number(m.getPaintProperty(id,'raster-opacity')??1)!==0)m.setPaintProperty(id,'raster-opacity',0)}}catch(_){}
 window.__BP_LANDING_LEGACY_WEATHER_HIDDEN_V6132__={legacyRasterBuffersHidden:true,sourceWeatherOverlaysPreserved:true,groundDrapedNoaaRadar:true,updatedAt:Date.now()}
}
function setLandingWeatherEnabled(world,on){
 landingWeatherEnabled=!!on;
 const button=$('landingWeatherActivation');
 if(button){button.setAttribute('aria-pressed',String(landingWeatherEnabled));button.textContent='SOURCE WEATHER · '+(landingWeatherEnabled?'ON':'OFF');button.title=landingWeatherEnabled?'Live source-backed weather/hazard dots and warning boundaries are enabled; legacy rain/snow/hail/fire effects remain disabled':'Hide source-backed weather/hazard dots and warning boundaries'}
 const m=world?.map;ensureLandingWeatherLegend();hideLegacyLandingWeather(m);
 if(!landingWeatherEnabled){
  clearInterval(landingWeatherTimer);landingWeatherTimer=0;clearTimeout(landingWeatherRetryTimer);landingWeatherRetryTimer=0;clearInterval(landingRadarTimer);landingRadarTimer=0;
  try{landingWeatherModules?.weather?.setRadar?.(false);landingWeatherModules?.weather?.setActive?.(false);landingWeatherModules?.present?.setActive?.(false)}catch(_){}
  if($('landingWeatherCount'))$('landingWeatherCount').textContent='SOURCE WEATHER · OFF';
  if($('landingWeatherTime'))$('landingWeatherTime').textContent='Source-backed weather dots and warning boundaries are hidden. Legacy rain/snow/hail/fire effects and animated radar remain disabled.';
  if(window.__BP_LANDING_RADAR_STATE__)window.__BP_LANDING_RADAR_STATE__={...window.__BP_LANDING_RADAR_STATE__,visible:false,enabled:false,updatedAt:Date.now()};
  for(const id of ['bp-landing-weather-fill','bp-landing-weather-line','bp-landing-weather-glow','bp-landing-weather-points','bp-landing-v6132-weather-icons','bp-landing-weather-hit'])try{if(m?.getLayer(id))m.setLayoutProperty(id,'visibility','none')}catch(_){}
  window.__BP_LANDING_VISUAL_WEATHER__={version:6130,enabled:false,sourceWeatherVisible:false,cinematicFx:false,legacyCinematicFxDisabled:true,renderer:'source-weather-data-plus-dedicated-rain-lightning',mapShared:true,legacyOverlaysHidden:true,radarVisible:false,updatedAt:Date.now()};
  return Promise.resolve(false)
 }
 if(!m)return Promise.resolve(false);
 const enable=async()=>{
  if(!landingWeatherModules){
   const [wm,pm]=await Promise.all([import('./world-v2300-weather.js?v=6138-cloud-linked-lightning'),import('./world-v2300-present-weather.js?v=6134-legacy-fx-disabled')]);
   landingWeatherModules={weather:wm.initWeather(world.map),present:pm.initPresentWeather(world.map)}
  }
  if(!landingWeatherEnabled)return false;
  hideLegacyLandingWeather(m);
  landingWeatherModules.weather?.setActive?.(true);
  landingWeatherModules.weather?.setRadar?.(false);
  landingWeatherModules.present?.setActive?.(false);
  window.__BP_LANDING_VISUAL_WEATHER__={version:6134,renderer:'source-weather-data-plus-dedicated-rain-lightning',...landingWeatherModules,enabled:true,cinematicFx:false,legacyCinematicFxDisabled:true,sourceWeatherVisible:true,sourceWeatherOverlaysPreserved:true,mapShared:true,nationalWeather:true,networkActivationDeferred:false,legacyOverlaysHidden:true,radarVisible:!!m.getLayer('bp-landing-v6132-ground-radar')&&(m.getLayoutProperty('bp-landing-v6132-ground-radar','visibility')||'visible')!=='none',radarOwnedByGroundDrape:true,radarAnimatedAtCloseZoom:false,radarGroundDrape:true,asyncAttach:true,updatedAt:Date.now()};
  if($('landingWeatherCount'))$('landingWeatherCount').textContent='SOURCE WEATHER · LIVE';
  if($('landingWeatherTime'))$('landingWeatherTime').textContent='Live source-backed hazard dots, warning boundaries and storm tracks. New cloud-linked rain and longer cloud-to-ground lightning are separate; legacy snow/hail/fire effects stay disabled.';
  try{if(!m.__bpLandingCinematicGuard6057){m.__bpLandingCinematicGuard6057=true;m.on('styledata',()=>hideLegacyLandingWeather(m))}}catch(_){}
  [150,600,1400].forEach(ms=>setTimeout(()=>{if(landingWeatherEnabled)hideLegacyLandingWeather(m)},ms));
  return true
 };
 if(landingWeatherActivationPromise)return landingWeatherActivationPromise;
 landingWeatherActivationPromise=enable().finally(()=>{landingWeatherActivationPromise=null});
 return landingWeatherActivationPromise
}

const LANDING_OPPORTUNITY_COLORS={ROOF:'#fff200',STORM:'#b026ff',FIRE:'#ff3b19',WATER:'#00a8ff',SOLAR:'#ffe600',DEVELOPMENT:'#00f0ff',INVESTMENT:'#39ff88',COMPLIANCE:'#ff8a00',CLAIMS:'#a98cff',RESTORATION:'#ff4ea3',CONSTRUCTION:'#ffb34a',GENERAL:'#ff2bd6'};
function publicOpportunityGeojson(geo){
 const base=geo?.type==='FeatureCollection'?geo:{type:'FeatureCollection',features:[]};
 return{...base,features:(base.features||[]).map(f=>{const p={...(f.properties||{})},key=String(p.icon_key||'GENERAL').toUpperCase();return{...f,properties:{...p,icon_key:key,color:LANDING_OPPORTUNITY_COLORS[key]||p.color||LANDING_OPPORTUNITY_COLORS.GENERAL,label:String(p.label||key.replaceAll('_',' ')+' opportunity'),public_teaser:true}}})}
}
async function refreshLandingOpportunities(world){
 const m=world?.map,src=m?.getSource?.('bpOpportunities');if(!m||!src?.setData||m.isMoving?.())return false;
 const seq=++landingOpportunitySeq,zoom=m.getZoom(),mobile=window.innerWidth<=620;
 const limit=mobile?(zoom<3?25:zoom<6?35:zoom<10?50:70):(zoom<3?25:zoom<6?45:zoom<10?100:160);
 const b=m.getBounds();
 try{
  const d=await rpc('bridgepoint_public_opportunity_viewport_v5906',{p_west:b.getWest(),p_south:b.getSouth(),p_east:b.getEast(),p_north:b.getNorth(),p_limit:limit},3600);
  if(seq!==landingOpportunitySeq||m.isMoving?.())return false;
  const geo=publicOpportunityGeojson(d?.geojson);src.setData(geo);
  try{
   if(m.getLayer('gta-opportunity-buildings')){m.setLayoutProperty('gta-opportunity-buildings','visibility','visible');m.setPaintProperty('gta-opportunity-buildings','fill-extrusion-color',['coalesce',['get','color'],'#ff1744']);m.setPaintProperty('gta-opportunity-buildings','fill-extrusion-opacity',1)}
   if(m.getLayer('gta-opportunity-label')){m.setLayoutProperty('gta-opportunity-label','visibility','visible');m.setPaintProperty('gta-opportunity-label','text-color',['coalesce',['get','color'],'#7adcf0']);m.setPaintProperty('gta-opportunity-label','icon-opacity',1)}
  }catch(_){}
  window.__BP_PUBLIC_OPPORTUNITY_STYLE_V5906__={mode:'PUBLIC_GLOBAL_CLASSIFIED',wholeBuilding:true,icons:true,categorizedColors:true,features:geo.features.length,zoomBand:zoom<3?'globe':zoom<6?'regional':zoom<10?'city':'local',limit,updatedAt:Date.now()};
  return true
 }catch(e){console.warn('Landing opportunity overlay',e);return false}
}
function bindLandingOpportunityInfo(world){
 const m=world?.map;if(!m||m.__bpLandingOpportunityInfoBound)return;m.__bpLandingOpportunityInfoBound=true;
 m.on('click',e=>{
  let f=null;try{const layers=['gta-opportunity-label','gta-opportunity-buildings'].filter(id=>m.getLayer(id));if(!layers.length)return;f=(m.queryRenderedFeatures(e.point,{layers})||[]).find(x=>x?.properties?.icon_key)}catch(_){return}if(!f)return;
  const p=f.properties||{},root=document.createElement('div');root.style.cssText='min-width:210px;max-width:280px;font:13px/1.45 system-ui,sans-serif;color:#10232c';
  const title=document.createElement('strong');title.style.cssText='display:block;font-size:15px';title.textContent=String(p.specific_opportunity||p.label||'BridgePoint opportunity');
  const badge=document.createElement('span');badge.style.cssText='display:inline-block;width:max-content;max-width:100%;padding:5px 8px;border-radius:7px;font-size:10px;font-weight:900;color:#071318;background:'+String(p.color||'#ff2bd6');badge.textContent=String(p.map_color_label||p.icon_key||'General property intelligence');const vertical=document.createElement('small');vertical.style.cssText='display:block;margin-top:5px;color:#405963';vertical.textContent=[p.vertical_key?String(p.vertical_key).replaceAll('_',' '):'',p.opportunity_family?String(p.opportunity_family).replaceAll('_',' '):'',p.opportunity_key?String(p.opportunity_key).replaceAll('_',' '):''].filter(Boolean).join(' · ');const meta=document.createElement('p');meta.style.cssText='margin:7px 0;color:#405963';const count=Math.max(1,Number(p.opportunity_count)||1),freshness=String(p.freshness||'UNKNOWN'),age=Number.isFinite(Number(p.evidence_age_days))?Math.max(0,Math.round(Number(p.evidence_age_days))):null;meta.textContent=count.toLocaleString()+' related signals · '+Number(p.source_count||0).toLocaleString()+' source records · '+Number(p.matched_pattern_count||0).toLocaleString()+' matched patterns · evidence '+freshness.toLowerCase()+(age!==null?' ('+age+' days old)':'');
  const note=document.createElement('small');note.style.cssText='display:block;margin:0 0 9px;color:#526e78';note.textContent=(freshness==='STALE'||freshness==='AGING'?'Evidence is aging; verify sources before acting. ':'Public opportunity preview. ')+'Opportunity signals are not proof of damage, a listing, a sale, or customer intent.';
  const a=document.createElement('a');a.href='/app/?lat='+encodeURIComponent(e.lngLat.lat)+'&lng='+encodeURIComponent(e.lngLat.lng)+'&z=16&select=0';a.textContent='Explore this location on the public map →';a.style.cssText='display:inline-block;color:#075e91;font-weight:800;text-decoration:underline';root.append(title,badge,vertical,meta,note,a);
  try{new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'310px'}).setLngLat(e.lngLat).setDOMContent(root).addTo(m)}catch(_){ }
 });
}
function startLandingOpportunities(world){
 const m=world?.map;if(!m||m.__bpLandingOpportunityBound)return;
 m.__bpLandingOpportunityBound=true;bindLandingOpportunityInfo(world);
 const run=()=>{clearTimeout(landingOpportunityTimer);landingOpportunityTimer=setTimeout(()=>void refreshLandingOpportunities(world),window.innerWidth<=620?1000:650)};
 m.on('moveend',run);try{m.once('load',run)}catch(_){}
 setTimeout(run,850)
}

const LANDING_LISTING_COLORS={FOR_SALE:'#7dff63',FOR_RENT:'#24ffc8'};
function landingListingGeojson(geo){
 const base=geo?.type==='FeatureCollection'?geo:{type:'FeatureCollection',features:[]};
 return{...base,features:(base.features||[]).map(f=>{const p={...(f.properties||{})},kind=String(p.listing_type||'FOR_SALE').toUpperCase();return{...f,properties:{...p,listing_type:kind,color:LANDING_LISTING_COLORS[kind]||LANDING_LISTING_COLORS.FOR_SALE}}})}
}
async function refreshLandingListings(world){
 const m=world?.map,src=m?.getSource?.('bpListings');if(!m||!src?.setData||m.isMoving?.())return false;
 const seq=++landingListingSeq,z=m.getZoom(),b=m.getBounds(),mobile=window.innerWidth<=620;
 const limit=mobile?(z<2.5?18:z<5?35:z<9?60:120):(z<2.5?30:z<5?55:z<9?100:180);
 try{
  const d=await rpc('bridgepoint_public_listings_viewport_v5906',{p_west:b.getWest(),p_south:b.getSouth(),p_east:b.getEast(),p_north:b.getNorth(),p_limit:limit},2600);
  if(seq!==landingListingSeq||m.isMoving?.())return false;
  const geo=landingListingGeojson(d?.geojson);src.setData(geo);
  window.__BP_LANDING_PUBLIC_LISTINGS_V5906__={source:d?.source_key||'UNKNOWN',status:d?.source_status||'UNKNOWN',features:geo.features.length,totalInLastSync:Number(d?.source_total_last_sync||0),sourceSnapshotLastEdit:d?.source_layer_last_edit||null,lastSync:d?.source_last_synced_at||null,zoomBand:z<2.5?'globe':z<5?'regional':z<9?'city':'local',updatedAt:Date.now()};
  return true
 }catch(e){console.warn('Landing public listing overlay',e);return false}
}
function bindLandingListingInfo(world){
 const m=world?.map;if(!m||m.__bpLandingListingInfoBound)return;m.__bpLandingListingInfoBound=true;
 m.on('click',e=>{
  let f=null;try{if(!m.getLayer('gta-property-listings'))return;f=(m.queryRenderedFeatures(e.point,{layers:['gta-property-listings']})||[]).find(x=>x?.properties?.listing_id)}catch(_){return}
  if(!f)return;
  const p=f.properties||{},root=document.createElement('div');root.style.cssText='min-width:215px;max-width:290px;font:13px/1.45 system-ui,sans-serif;color:#102319';
  const title=document.createElement('strong');title.style.cssText='display:block;font-size:15px;color:#237d22';title.textContent=String(p.title||'Property listing');
  const details=document.createElement('p');details.style.cssText='margin:7px 0;color:#40594a';
  details.textContent=[p.address,p.city,p.state_code,p.postal_code,p.price_amount!=null?new Intl.NumberFormat(undefined,{style:'currency',currency:p.price_currency||'USD',maximumFractionDigits:0}).format(Number(p.price_amount)):null].filter(Boolean).join(' · ');
  const date=p.source_updated_at?new Date(p.source_updated_at):null,sourceAge=date&&!Number.isNaN(date.getTime())?Math.max(0,Math.floor((Date.now()-date.getTime())/86400000)):null;
  const warning=document.createElement('small');warning.style.cssText='display:block;margin:7px 0;color:#7b4d00';
  warning.textContent='HUD FHA property record · for-sale status is not guaranteed current. '+(sourceAge!==null?'Source snapshot last updated '+date.toLocaleDateString()+' ('+sourceAge+' days old). ':'')+'Verify availability and price with the publisher before acting.';
  const link=document.createElement('a');link.href=String(p.listing_url||p.source_url||'https://www.hudhomestore.gov/Home/Index.aspx');link.target='_blank';link.rel='noopener noreferrer';link.textContent='Check source listing ↗';link.style.cssText='display:inline-block;color:#1d7027;font-weight:800;text-decoration:underline;margin-top:4px';
  root.append(title,details,warning,link);
  try{new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'320px'}).setLngLat(e.lngLat).setDOMContent(root).addTo(m)}catch(_){}
 });
}
function startLandingListings(world){
 const m=world?.map;if(!m||m.__bpLandingListingsBound)return;m.__bpLandingListingsBound=true;
 bindLandingListingInfo(world);
 const run=()=>{clearTimeout(landingListingTimer);landingListingTimer=setTimeout(()=>void refreshLandingListings(world),window.innerWidth<=620?1450:950)};
 m.on('moveend',run);try{m.once('load',run)}catch(_){}
 setTimeout(run,1200)
}


async function initMap(){
 window.__BP_LANDING_MAP_BOOT__={stage:'start',maplibre:!!window.maplibregl,at:Date.now()};
 if(!window.maplibregl){window.__BP_LANDING_MAP_BOOT__={stage:'error',error:'MAPLIBRE_UNAVAILABLE',maplibre:false,at:Date.now()};return}
 try{
  window.__BP_LANDING_MAP_BOOT__={stage:'importing-world',maplibre:true,at:Date.now()};
  const mod=await import('./world-v2300-map.js?v=6137-globe-first-weather-lockstep');
  window.__BP_LANDING_MAP_BOOT__={stage:'initializing-world',maplibre:true,module:true,at:Date.now()};
  const world=mod.initWorld({
   containerId:'previewMap',
   globalKey:'__bpLandingWorldV5420',
   center:[0,20],
   zoom:window.innerWidth<=620?1.05:1.25,
   pitch:0,
   bearing:0,
   projection:'globe',
   preview:true
  });
  if(!world?.map)throw new Error('Shared BridgePoint world renderer unavailable');
  map=world.map;
  window.__BP_LANDING_WORLD__=world;
  void startLandingNationalWeather(world);
  // Add the GPU water/hydrology surface to this same globe canvas before other visual modules.
  void import('./world-v2300-water.js?v=6124-solar-ocean-swell')
   .then(m=>{if(world?.map)window.__BP_WATER_ENGINE_LANDING_V6123__=m.initWaterEngine(world,{surface:'landing'})})
   .catch(e=>console.warn('BridgePoint GPU water layer unavailable; native water remains enabled',e));
  // Start persistent global 3D clouds immediately on the homepage globe, before other visual modules.
  void import('./world-v2300-clouds.js?v=6137-globe-first-weather-lockstep')
   .then(m=>{window.__BP_SKY_CLOUDS_V5908__=m.initSkyClouds(world)})
   .catch(e=>console.warn('BridgePoint global 3D cloud field unavailable',e));
  // Keep source weather feeds live so global-zoom storm-cloud geometry is source-backed; non-cloud visuals stay locked off.
  void Promise.all([
   import('./world-v2300-weather.js?v=6138-cloud-linked-lightning'),
   import('./world-v2300-present-weather.js?v=6134-legacy-fx-disabled')
  ]).then(([wm,pm])=>{
   if(!world?.map)return;
   landingWeatherModules={weather:wm.initWeather(world.map),present:pm.initPresentWeather(world.map)};
   landingWeatherModules.weather?.setActive?.(true);
   landingWeatherModules.weather?.setRadar?.(false);
   landingWeatherModules.present?.setActive?.(false);
   hideLegacyLandingWeather(world.map);
   window.__BP_LANDING_VISUAL_WEATHER__={version:6134,renderer:'source-weather-data-plus-dedicated-rain-lightning',...landingWeatherModules,enabled:true,cinematicFx:false,cloudsOnlyPhase:false,visualWeatherEffectsEnabled:true,legacyCinematicFxDisabled:true,sourceWeatherVisible:true,sourceWeatherOverlaysPreserved:true,mapShared:true,nationalWeather:true,networkActivationDeferred:false,legacyOverlaysHidden:true,radarVisible:!!world.map.getLayer('bp-landing-v6132-ground-radar')&&(world.map.getLayoutProperty('bp-landing-v6132-ground-radar','visibility')||'visible')!=='none',radarOwnedByGroundDrape:true,radarAnimatedAtCloseZoom:false,radarGroundDrape:true,asyncAttach:true,sourceWeatherFeedActive:true,updatedAt:Date.now()};
   if($('landingWeatherCount'))$('landingWeatherCount').textContent='SOURCE WEATHER · LIVE';
   if($('landingWeatherTime'))$('landingWeatherTime').textContent='Live source-backed hazard dots, warning/ProbSevere boundaries and the NOAA ground-radar drape are active. Dedicated rain and cloud-to-ground lightning are source-anchored; legacy generic weather FX remain disabled.';
  }).catch(e=>console.warn('BridgePoint cloud-phase weather feeds unavailable',e));
   void import('./world-v2300-lod-controls.js?v=6038-world-lod-range-apply').then(m=>{window.__BP_LOD_CONTROL_LANDING_V6016__=m.initWorldLodControls(world,{surface:'landing'})}).catch(e=>console.warn('BridgePoint homepage LOD controls unavailable',e));
  // Explicitly connect the landmark module to the newly created homepage map.
  // Do not depend on its polling loop winning a race with slow mobile/globe startup.
  window.__BP_PENDING_LANDMARK_MAP_V5940__=world.map;
  try{window.dispatchEvent(new CustomEvent('bp:world-map-ready-v5940',{detail:{map:world.map,source:'landing'}}))}catch(_){}
  void import('./bridgepoint-landmarks-v5940.js?v=5966-statue-pedestal-aligned')
   .then(()=>{try{window.dispatchEvent(new CustomEvent('bp:world-map-ready-v5940',{detail:{map:world.map,source:'landing-module-ready'}}))}catch(_){};if(window.__BP_LANDMARKS_V5940__)window.__BP_LANDMARKS_V5940__.attachedMaps=Math.max(1,Number(window.__BP_LANDMARKS_V5940__.attachedMaps||0))})
   .catch(e=>console.warn('BridgePoint homepage landmarks loader unavailable',e));
   // BridgePoint exposes the same 30-day source-event timeline on the website globe.
   void import('./world-v2300-time-slider.js?v=6137-globe-first-weather-lockstep')
    .then(m=>{window.__BP_WORLD_TIME_SLIDER_V5908__=window.__BP_WORLD_TIME_SLIDER_V5908__?.map===map?window.__BP_WORLD_TIME_SLIDER_V5908__:m.initWorldTimeSlider(world,rpc)})
    .catch(e=>console.warn('BridgePoint 30-day world change scrub unavailable',e));
   // BridgePoint satellite filters, daylight materials and sky layers also run on the homepage globe.
   void import('./world-v2300-spectral-imagery.js?v=5934-world-controls')
    .then(m=>{window.__BP_SPECTRAL_IMAGERY_V5931__=m.initSpectralImagery(world)})
    .catch(e=>console.warn('BridgePoint satellite filters unavailable',e));
   void import('./world-v2300-underground-xray.js?v=5965-landmarks-and-effects')
    .then(m=>{window.__BP_UNDERGROUND_XRAY_V5935__=m.initUndergroundXray(world)})
    .catch(e=>console.warn('BridgePoint Underground X-ray unavailable',e));
  void import('./world-v2300-infrastructure-volume-v5962.js?v=5962-power-grid-fcc-towers')
   .then(m=>{window.__BP_INFRASTRUCTURE_VOLUME_V5962__=m.initInfrastructureVolume(world)})
   .catch(e=>console.warn('BridgePoint power grid and FCC tower volume unavailable',e));
  void import('./world-v2300-sensor-layers.js?v=6015-nasa-light-toggle')
   .then(m=>{window.__BP_SENSOR_LAYERS_V5945__=m.initSensorLayers(world)})
   .catch(e=>console.warn('BridgePoint NASA night lights, GEBCO depth and mapped streetlights unavailable',e));
   void import('./world-v2300-realism.js?v=5926-world-sun-materials')
    .then(m=>{window.__BP_WORLD_REALISM_V5910__=m.initRealismMode(world)})
    .catch(e=>console.warn('BridgePoint real-world rendering controls unavailable',e));

  window.__BP_LANDING_MAP_BOOT__={stage:'world-ready',maplibre:true,module:true,world:true,at:Date.now()};
  // Heavy opportunity and listing overlays stay idle until the BridgePoint panels are opened.
  window.__BP_LANDING_RENDERER_PARITY__={sharedModule:true,version:5513,container:'previewMap',sameWorldRendererAsApp:true,sameWeatherEngineAsApp:true,updatedAt:Date.now()};
  try{
   map.jumpTo({center:[0,20],zoom:window.innerWidth<=620?1.05:1.25,pitch:0,bearing:0});
   window.__BP_LANDING_GLOBAL_START__={center:[0,20],projection:'globe',zoom:map.getZoom(),at:Date.now()}
  }catch(_){};
  world.onBuildingSelect?.(({feature})=>{
   const p=feature?.properties||{},h=Number(p.render_height_m||p.height_m||p.height||p.render_height||8.5),id=p.building_id||feature?.id||'mapped';
   $('previewTitle').textContent='Building #'+id;
   $('previewMeta').textContent=h.toFixed(1)+' m rendered height · same live BridgePoint World renderer as the app';
   $('previewCard').hidden=false
  });
  let bpUserMapGesture=false;const previewEl=$('previewMap');for(const ev of ['pointerdown','touchstart','wheel'])previewEl?.addEventListener(ev,()=>{bpUserMapGesture=true},{passive:true});const hidePreviewSample=()=>{const sample=document.querySelector('.preview-sample');if(!sample)return;sample.style.setProperty('opacity','0','important');sample.style.setProperty('pointer-events','none','important');sample.style.setProperty('transform','translateY(6px)','important');sample.setAttribute('aria-hidden','true')};map.on('move',()=>{$('previewCard').hidden=true;if(bpUserMapGesture)hidePreviewSample()});map.on('moveend',()=>{if(bpUserMapGesture)hidePreviewSample()});
  const weatherButton=$('landingWeatherActivation');
  if(weatherButton&&!weatherButton.dataset.bpBound){weatherButton.dataset.bpBound='1';weatherButton.addEventListener('click',()=>{void setLandingWeatherEnabled(world,!landingWeatherEnabled)})}
  void setLandingWeatherEnabled(world,true);

 }catch(e){
  const msg=String(e?.stack||e?.message||e||'UNKNOWN_MAP_BOOT_ERROR');
  window.__BP_LANDING_MAP_BOOT__={stage:'error',error:msg,maplibre:!!window.maplibregl,module:!!window.__BP_WORLD_RENDER_VERSION__,provisional:!!window.__bpLandingWorldV5420?.map,at:Date.now()};
  console.error('BridgePoint shared preview renderer',e);
  const el=$('previewMap');if(el)el.innerHTML='<div style="display:grid;place-items:center;height:100%;padding:24px;text-align:center;color:#a9c0ca;background:#071017">BridgePoint World preview is refreshing. Open the app for the live map.</div>'
 }
}
async function stats(){try{return await headline()}catch(e){console.warn(e);return null}}

const BP_COVERAGE_COLORS=['#37d4ff','#7c6cff','#5ee1a2','#ffb74d','#ff6b8a','#4dd0e1','#b388ff','#ffd166','#72e06a','#ff8a65','#64b5f6','#ce93d8'];
const BP_REGION_NAMES=(()=>{try{return new Intl.DisplayNames(['en'],{type:'region'})}catch(_){return null}})();
const BP_NON_ISO_REGION_NAMES={HI:'Hawaii (U.S.)',XK:'Kosovo'};
function bpCountryName(code,fallback=''){
 const c=String(code||'').trim().toUpperCase(),f=String(fallback||'').trim();
 if(f&&f.toUpperCase()!==c)return f;
 try{const n=BP_REGION_NAMES?.of(c);if(n&&n!==c)return n}catch(_){}
 return BP_NON_ISO_REGION_NAMES[c]||f||c;
}
function bpDonut(el,rows,total){
 if(!el)return;
 const safe=rows.filter(x=>Number(x.value)>0),sum=Number(total)||safe.reduce((a,b)=>a+Number(b.value||0),0);
 if(!sum||!safe.length){el.style.background='conic-gradient(#27404b 0 100%)';return}
 let at=0,parts=[];
 safe.forEach((row,i)=>{const start=at,pct=100*Number(row.value)/sum;at+=pct;parts.push((row.color||BP_COVERAGE_COLORS[i%BP_COVERAGE_COLORS.length])+' '+start.toFixed(3)+'% '+at.toFixed(3)+'%')});
 el.style.background='conic-gradient('+parts.join(',')+')';
}
function bpLegend(el,rows){
 if(!el)return;el.textContent='';
 rows.forEach((row,i)=>{const d=document.createElement('div');d.className='bp-legend-row';const dot=document.createElement('i');dot.style.background=row.color||BP_COVERAGE_COLORS[i%BP_COVERAGE_COLORS.length];const n=document.createElement('span');n.textContent=row.name;const v=document.createElement('b');v.textContent=fmt(row.value);d.append(dot,n,v);el.appendChild(d)});
}
let headlineLoading=null,globalCoverageLoading=null,opportunitySummaryLoading=null;
const BP_LIVE_CACHE_KEY='bp_live_metric_snapshot_v5841';
function bpLiveCacheRead(){try{return JSON.parse(localStorage.getItem(BP_LIVE_CACHE_KEY)||'{}')}catch(_){return{}}}
function bpLiveCacheWrite(patch){try{localStorage.setItem(BP_LIVE_CACHE_KEY,JSON.stringify({...bpLiveCacheRead(),...patch,updatedAt:Date.now()}))}catch(_){}}
const BP_CRITICAL_METRIC_IDS=['landingProperties','landingBuildings','landingAddresses','landingBoundaries','landingGlobalProperties','landingLayouts','landingParts','landingTransport','landingWeatherEvents','landingOpportunityHeroStat'];
const BP_METRIC_LAST_VISIBLE=Object.fromEntries(BP_CRITICAL_METRIC_IDS.map(id=>[id,String($(id)?.textContent||'').trim()]).filter(([,v])=>v));
function bpStableText(id,value){const el=$(id);if(!el)return;const next=String(value??'—');if(!next.trim())return;if(BP_CRITICAL_METRIC_IDS.includes(id))BP_METRIC_LAST_VISIBLE[id]=next;if(el.textContent===next)return;el.textContent=next}
const BP_CRITICAL_COPY=[['.hero-cta-primary strong','CREATE FREE ACCOUNT'],['.hero-cta-primary small','Start with live map access'],['.hero-cta-map strong','OPEN LIVE APP'],['.hero-cta-map small','Sign in required · live 3D globe'],['.hero-cta-report strong','SEE SAMPLE REPORT'],['.hero-cta-report small','Storm → property → opportunity'],['.stat-properties .stat-copy>span','global canonical properties'],['.stat-buildings .stat-copy>span','global map-ready buildings'],['.stat-addresses .stat-copy>span','global address records'],['.stat-parcels .stat-copy>span','global stored parcel boundaries'],['.stat-global .stat-copy>span','global canonical properties'],['.stat-layouts .stat-copy>span','global 3D building models'],['.stat-parts .stat-copy>span','global roof-shell buildings'],['.stat-transport .stat-copy>span','global transport source rows'],['.stat-weather .stat-copy>span','global live events'],['.stat-opportunities .stat-copy>span','global live opportunities']];
function ensureCriticalCopy(){for(const [selector,fallback] of BP_CRITICAL_COPY){const el=document.querySelector(selector);if(el&&!String(el.textContent||'').trim())el.textContent=fallback}for(const id of BP_CRITICAL_METRIC_IDS){const el=$(id);if(el&&!String(el.textContent||'').trim()&&BP_METRIC_LAST_VISIBLE[id])el.textContent=BP_METRIC_LAST_VISIBLE[id]}}
function watchCriticalCopy(){ensureCriticalCopy();const roots=[document.querySelector('.hero-actions-premium'),document.querySelector('.premium-stats')].filter(Boolean);if(!roots.length||window.__BP_CRITICAL_COPY_OBSERVER__)return;let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;ensureCriticalCopy()})});for(const root of roots)observer.observe(root,{subtree:true,childList:true,characterData:true});window.__BP_CRITICAL_COPY_OBSERVER__=observer}
function hydrateLiveMetricSnapshot(){
 const c=bpLiveCacheRead();
 // Never hydrate the authoritative global counter from localStorage; wait for the live Supabase RPC.
 if(c.globalDetail)bpStableText('landingGlobalCountryMix',c.globalDetail);
 if(Number.isFinite(Number(c.opportunities))){
  const v=fmt(c.opportunities);bpStableText('landingOpportunityTotal',v);bpStableText('landingOpportunityTotalHero',v);bpStableText('landingOpportunityHeroStat',v);
 }
 if(Number.isFinite(Number(c.opportunityProperties)))bpStableText('landingOpportunityProperties',fmt(c.opportunityProperties));
 if(Number.isFinite(Number(c.opportunityStates)))bpStableText('landingOpportunityStatesCount',fmt(c.opportunityStates));
}
const BP_HEADLINE_CACHE_KEY='bp-public-headline-v5904';
function paintHeadline(d){
 if(!d||typeof d!=='object')return false;
 const put=(id,v)=>{const el=$(id);if(!el||v===null||v===undefined||v==='')return;const n=Number(v);if(Number.isFinite(n))bpStableText(id,fmt(n))};
 // Global canonical counters have exactly one writer: paintLiveCountryCounters(), sourced from bridgepoint_public_live_counters_v5902.
 // Headline snapshots are intentionally forbidden from rewriting those counters.
 put('landingBuildings',d.map_ready_buildings);put('landingAddresses',d.address_records);put('landingBoundaries',d.stored_boundaries);
 put('landingLayouts',d.global_3d_building_models);put('landingParts',d.global_roof_shell_buildings);put('landingTransport',d.global_transport_rows);put('landingWeatherEvents',d.global_live_events??d.weather_events);
  if(!window.__BP_MAP_OPPORTUNITY_SUMMARY_V5920__){put('landingOpportunityHeroStat',d.opportunities_total);put('landingOpportunityTotal',d.opportunities_total);put('landingOpportunityTotalHero',d.opportunities_total);put('landingOpportunityProperties',d.opportunity_properties);put('landingOpportunityStatesCount',d.opportunity_jurisdictions)}
 const cp=d.claims_parity||{};if($('landingOpportunityClaimsParity')&&Number.isFinite(Number(cp.minimum_met)))bpStableText('landingOpportunityClaimsParity',fmt(cp.minimum_met)+' / '+fmt(cp.jurisdictions_total||56)+' at minimum source parity');
 window.__BP_HEADLINE_V5822__={...d,paintedAt:Date.now()};document.documentElement.dataset.bpHeadlineReady='1';return true
}
function cachedHeadline(){try{return JSON.parse(localStorage.getItem(BP_HEADLINE_CACHE_KEY)||'null')}catch(_){return null}}
let canonicalSessionBaseline=null,canonicalLastVerified=null,canonicalAnimFrame=0;
function paintAnimatedCanonicalCounters(world){
 const ids=['landingProperties','landingGlobalProperties','globalCountryTotal'];
 const badge=$('landingCanonicalDelta');
 if(canonicalSessionBaseline===null||canonicalLastVerified===null){
  cancelAnimationFrame(canonicalAnimFrame);canonicalAnimFrame=0;
  canonicalSessionBaseline=world;canonicalLastVerified=world;
  for(const id of ids)bpStableText(id,fmt(world));
  if(badge)badge.textContent='LIVE · VERIFIED BASELINE · NET Δ +0';
  return;
 }
 const previousVerified=canonicalLastVerified;
 canonicalLastVerified=world;
 if(world>previousVerified){
  cancelAnimationFrame(canonicalAnimFrame);
  const shown=Number(String($(ids[0])?.textContent||'').replace(/[^0-9-]/g,''));
  const start=Number.isFinite(shown)&&shown>0?shown:previousVerified;
  const t0=performance.now(),duration=900;
  const tick=now=>{
   const p=Math.min(1,(now-t0)/duration),eased=1-Math.pow(1-p,3);
   const value=Math.round(start+(world-start)*eased);
   for(const id of ids)bpStableText(id,fmt(value));
   if(p<1)canonicalAnimFrame=requestAnimationFrame(tick);
   else{for(const id of ids)bpStableText(id,fmt(world));canonicalAnimFrame=0}
  };
  canonicalAnimFrame=requestAnimationFrame(tick);
 }else if(world!==previousVerified){
  cancelAnimationFrame(canonicalAnimFrame);canonicalAnimFrame=0;
  for(const id of ids)bpStableText(id,fmt(world));
 }
 const delta=world-canonicalSessionBaseline;
 if(badge)badge.textContent='LIVE · NET Δ '+(delta>=0?'+':'')+fmt(delta)+' VERIFIED SINCE OPEN';
}
let liveCountryCounterLoading=null;
function paintLiveCountryCounters(d){
 if(!d||typeof d!=='object')return false;
 const world=Number(d.worldwide_canonical_total),us=Number(d.us_public_parcels),boundaries=Number(d.materialized_global_boundaries),raw=Array.isArray(d.countries)?d.countries:[];
 if(!Number.isFinite(world))return false;
 const rows=raw.filter(x=>Number(x.active_canonical)>0).map((x,i)=>{const code=String(x.country_code||'').toUpperCase(),value=Number(x.active_canonical||0);return{name:bpCountryName(code,code)+' · '+code,code,value,canonical:value,boundaries:Number(x.materialized_boundary_rows||0),updated_at:x.updated_at,color:BP_COVERAGE_COLORS[(i+1)%BP_COVERAGE_COLORS.length]}}).sort((a,b)=>b.value-a.value||a.code.localeCompare(b.code));
 const display=[{name:'United States · US',code:'US',value:Number.isFinite(us)?us:0,canonical:Number.isFinite(us)?us:0,boundaries:0,color:BP_COVERAGE_COLORS[0]},...rows].filter(x=>x.value>0);
 paintAnimatedCanonicalCounters(world);
 const countryCount=rows.length+(Number.isFinite(us)&&us>0?1:0),detail=fmt(countryCount)+' active countries · '+fmt(boundaries)+' non-U.S. boundaries';
 bpStableText('landingGlobalCountryMix',detail);bpLiveCacheWrite({globalCanonical:world,globalDetail:detail});
 bpDonut($('globalCountryDonut'),display,world);bpLegend($('globalCountryLegend'),display);
 const drop=$('landingGlobalCountryDropdown');
 if(drop){
  const frag=document.createDocumentFragment();
  for(const row of display){
   const item=document.createElement('div'),name=document.createElement('span'),value=document.createElement('b'),meta=document.createElement('small');
   name.textContent=row.name;value.textContent=fmt(row.value);meta.textContent=row.code==='US'?'LIVE U.S. PUBLIC PARCEL TOTAL':fmt(row.boundaries||0)+' materialized boundaries · LIVE';
   item.append(name,value,meta);frag.appendChild(item);
  }
  drop.replaceChildren(frag);
 }
 if($('globalCoverageUpdated'))$('globalCoverageUpdated').textContent='Last updated: '+new Date(d.updated_at||Date.now()).toLocaleString();
 window.__BP_LIVE_COUNTRY_COUNTERS__={...d,displayCountries:display,paintedAt:Date.now()};
 return true
}
async function liveCountryCounters(){
 if(liveCountryCounterLoading)return liveCountryCounterLoading;
 liveCountryCounterLoading=(async()=>{try{
  const d=await rpc('bridgepoint_public_live_counters_v5902',{},3000);paintLiveCountryCounters(d);return d
 }catch(e){console.warn('BridgePoint live country counters',e);return window.__BP_LIVE_COUNTRY_COUNTERS__||null}
 finally{liveCountryCounterLoading=null}})();
 return liveCountryCounterLoading
}
async function headline(){
 if(headlineLoading)return headlineLoading;
 headlineLoading=(async()=>{const cached=cachedHeadline();try{
  const d=await rpc('bridgepoint_public_headline_v5822',{},3500),merged={...(cached||{}),...(d||{})};
  paintHeadline(merged);try{localStorage.setItem(BP_HEADLINE_CACHE_KEY,JSON.stringify(merged))}catch(_){}
  void rpc('bridgepoint_global_live_event_count_v5852',{},1800).then(globalLive=>{const n=Number(globalLive);if(!Number.isFinite(n))return;const next={...merged,global_live_events:n};paintHeadline(next);try{localStorage.setItem(BP_HEADLINE_CACHE_KEY,JSON.stringify(next))}catch(_){}}).catch(()=>{});
  return merged
 }catch(e){if(cached)paintHeadline(cached);ensureCriticalCopy();console.warn('BridgePoint headline cache',e);return cached}finally{headlineLoading=null}})();
 return headlineLoading
}
function bindMetricNavigation(){
 const bind=(id,target)=>{const el=$(id),dest=$(target);if(!el||!dest||el.dataset.bpScrollBound)return;el.dataset.bpScrollBound='1';const go=e=>{if(e?.type==='keydown'&&!['Enter',' '].includes(e.key))return;e?.preventDefault?.();dest.scrollIntoView({behavior:'auto',block:'start'})};el.addEventListener('click',go);el.addEventListener('keydown',go)};
 bind('globalCanonicalTile','global-coverage');bind('opportunityMetricTile','opportunities');
}
const initialHeadline=cachedHeadline();if(initialHeadline)paintHeadline(initialHeadline);

async function globalCoverage(){
 if(globalCoverageLoading)return globalCoverageLoading;
 globalCoverageLoading=(async()=>{try{
  const [d,legacy,g]=await Promise.all([
   rpc('bridgepoint_public_global_coverage_v5597',{},9000),
   rpc('bridgepoint_public_global_coverage_v5601',{},9000).catch(()=>null),
   rpc('bridgepoint_public_global_status_v957',{},6000).catch(()=>null)
  ]);
  const liveNow=await liveCountryCounters().catch(()=>null),liveWorldNow=Number(liveNow?.worldwide_canonical_total),liveNonUsNow=Number(liveNow?.global_non_us_canonical),legacyWorld=legacy?.world||{},legacyUs=legacy?.us||{},countries=Array.isArray(d?.countries)?d.countries:[],states=Array.isArray(d?.us_states)?d.us_states:(Array.isArray(legacyUs.states_and_jurisdictions)?legacyUs.states_and_jurisdictions:[]),queue=Array.isArray(legacyWorld.expansion_queue)?legacyWorld.expansion_queue:[],liveCountries=Array.isArray(g?.countries)?g.countries:[],summaryMeta=d?.summary||{};
  const names={AU:'Australia',BR:'Brazil',CA:'Canada',CD:'DR Congo',CL:'Chile',CN:'China',CY:'Cyprus',DE:'Germany',DJ:'Djibouti',EE:'Estonia',EG:'Egypt',GB:'United Kingdom',HU:'Hungary',IN:'India',IS:'Iceland',JP:'Japan',KE:'Kenya',KR:'South Korea',LT:'Lithuania',LV:'Latvia',MD:'Moldova',MK:'North Macedonia',AL:'Albania',AM:'Armenia',MX:'Mexico',MY:'Malaysia',NL:'Netherlands',NO:'Norway',NZ:'New Zealand',PA:'Panama',PH:'Philippines',PL:'Poland',RO:'Romania',SG:'Singapore',TW:'Taiwan',TZ:'Tanzania',UA:'Ukraine',VN:'Vietnam'};
  const canonicalCountryRows=liveCountries.filter(x=>Number(x.active_canonical)>0).map((x,i)=>{
   const code=String(x.country_code||'').toUpperCase(),canonical=Number(x.active_canonical||0);
   return {name:bpCountryName(code,x.country_name||names[code])+' · '+code,value:canonical,canonical,seeded:Number(x.seed_records||0),kind:'CANONICAL',color:BP_COVERAGE_COLORS[(i+1)%BP_COVERAGE_COLORS.length]};
  });
  const fallbackCountryRows=countries.filter(x=>Number(x.canonical_records)>0).map((x,i)=>{
   const code=String(x.country_code||'').toUpperCase(),canonical=Number(x.canonical_records||0);
   return {name:bpCountryName(code,x.country_name||names[code])+' · '+code,value:canonical,canonical,seeded:Number(x.seeded_parcels||0),kind:'CANONICAL',color:BP_COVERAGE_COLORS[(i+1)%BP_COVERAGE_COLORS.length]};
  });
  const nonUsRows=canonicalCountryRows.length?canonicalCountryRows:fallbackCountryRows;
  const visibleNonUs=nonUsRows.reduce((a,b)=>a+Number(b.value||0),0),countryCanonicalTotal=Number.isFinite(liveNonUsNow)?liveNonUsNow:Number(g?.active_global_canonical||visibleNonUs||0);
  if(countryCanonicalTotal>visibleNonUs)nonUsRows.push({name:'Other live non-U.S. coverage',value:countryCanonicalTotal-visibleNonUs,canonical:countryCanonicalTotal-visibleNonUs,seeded:0,kind:'CANONICAL',color:BP_COVERAGE_COLORS[(nonUsRows.length+1)%BP_COVERAGE_COLORS.length]});
  const usCanonical=Number(legacyUs.canonical_properties||summaryMeta.us_canonical_records||0),worldCanonicalTotal=Number.isFinite(liveWorldNow)?liveWorldNow:usCanonical+countryCanonicalTotal;
  const displayCountries=[{name:'United States · US',value:usCanonical,canonical:usCanonical,seeded:0,kind:'CANONICAL',color:BP_COVERAGE_COLORS[0]},...nonUsRows].filter(x=>Number(x.value)>0);
  const countryDisplayTotal=worldCanonicalTotal;
  const topStates=states.slice(0,10).map((x,i)=>({name:x.state_code||x.code,value:Number(x.canonical_records??x.count??0),color:BP_COVERAGE_COLORS[i%BP_COVERAGE_COLORS.length]}));
  const stateAll=states.reduce((a,b)=>a+Number(b.canonical_records??b.count??0),0),topSum=topStates.reduce((a,b)=>a+b.value,0);
  if(stateAll>topSum)topStates.push({name:'Other U.S. jurisdictions',value:stateAll-topSum,color:BP_COVERAGE_COLORS[topStates.length%BP_COVERAGE_COLORS.length]});
  bpDonut($('globalCountryDonut'),displayCountries,countryDisplayTotal);bpLegend($('globalCountryLegend'),displayCountries.length?displayCountries:[{name:'No live or seeded country records published yet',value:0,color:'#27404b'}]);
  bpDonut($('globalStateDonut'),topStates,stateAll);bpLegend($('globalStateLegend'),topStates);
  const liveTruth=window.__BP_LIVE_COUNTRY_COUNTERS__||{},liveWorld=Number(liveTruth.worldwide_canonical_total),worldDisplay=Number.isFinite(liveWorld)?liveWorld:countryDisplayTotal;
  bpStableText('globalStateTotal',fmt(stateAll));
  const liveCanonical=countryCanonicalTotal,liveCountryCount=liveCountries.filter(x=>Number(x.active_canonical)>0||Number(x.official_foothold_features||x.foothold_features||0)>0).length,liveBoundaryCount=Number(g?.materialized_global_boundaries||0),worldCountryCount=liveCountryCount+(usCanonical>0?1:0),worldBoundaryCount=Number(legacyUs.stored_parcel_boundaries_estimate||0)+liveBoundaryCount,compactGlobalDetail=fmt(worldCountryCount)+' countries · '+fmt(worldBoundaryCount)+' boundaries';
  // Do not write landingProperties/landingGlobalProperties/globalCountryTotal here. This coverage refresh is a secondary snapshot and must never overwrite the live canonical counter.
  const footholdCountries=liveCountries.filter(x=>Number(x.official_foothold_features||x.foothold_features||0)>0),footholdFeatures=footholdCountries.reduce((n,x)=>n+Number(x.official_foothold_features||x.foothold_features||0),0),seededTotal=Number(summaryMeta.seeded_parcels_waiting_turn||0),seededCountries=Number(summaryMeta.countries_with_seeded_footholds||0);
  const summary=$('globalCoverageSummary');if(summary){summary.textContent='';[
    ['Global canonical properties',fmt(worldCanonicalTotal)],
    ['U.S. canonical properties',fmt(legacyUs.canonical_properties||summaryMeta.us_canonical_records||0)],
    ['U.S. stored parcel boundaries',fmt(legacyUs.stored_parcel_boundaries_estimate||0)],
    ['Live non-U.S. canonical properties',fmt(liveCanonical)],
    ['Legal seeded parcels waiting turn',fmt(seededTotal)],
    ['Seeded foothold countries',fmt(seededCountries)],
    ['Live non-U.S. materialized boundaries',fmt(g?.materialized_global_boundaries||0)],
    ['Official geospatial foothold countries',fmt(footholdCountries.length)],
    ['Official foothold features',fmt(footholdFeatures)],
    ['Country registry',fmt(summaryMeta.countries_registered||legacyWorld.country_registry_total||0)]
  ].forEach(([k,v])=>{const s=document.createElement('span');s.textContent=k+': '+v;summary.appendChild(s)})}
  const q=$('globalExpansionQueue');if(q){q.textContent='';queue.forEach(x=>{const c=document.createElement('div');c.className='bp-country-chip';const b=document.createElement('b');b.textContent=(x.name||x.code)+' · '+x.code;const s=document.createElement('span');s.textContent=String(x.status||'QUEUED').replaceAll('_',' ');c.append(b,s);q.appendChild(c)});const waiting=countries.filter(x=>Number(x.seeded_parcels)>0);waiting.forEach(x=>{const c=document.createElement('div');c.className='bp-country-chip';const b=document.createElement('b');b.textContent=bpCountryName(x.country_code,x.country_name||names[x.country_code])+' · '+x.country_code;const s=document.createElement('span');s.textContent=fmt(x.seeded_parcels)+' SEEDED · WAITING TURN';c.append(b,s);q.appendChild(c)});if(!queue.length&&!waiting.length){const c=document.createElement('div');c.className='bp-country-chip';c.innerHTML='<b>No country queue yet</b><span>LEGAL-GATED</span>';q.appendChild(c)}}
  if($('globalCoverageNotice'))$('globalCoverageNotice').textContent=d?.counting_note||g?.truth_notice||legacy?.public_notice||'Public-safe operational coverage only.';
  if($('globalCoverageUpdated')){const when=summaryMeta.last_updated_at||legacy?.updated_at; $('globalCoverageUpdated').textContent='Last updated: '+(when?new Date(when):new Date()).toLocaleString()}
  window.__BP_GLOBAL_COVERAGE__={version:5902,data:d,legacy,liveGlobal:g,layoutStable:true,seedAware:true,liveCounters:true,updatedAt:Date.now()};if(window.__BP_LIVE_COUNTRY_COUNTERS__)paintLiveCountryCounters(window.__BP_LIVE_COUNTRY_COUNTERS__);
 }catch(e){console.warn('BridgePoint global coverage',e);if($('globalCoverageUpdated'))$('globalCoverageUpdated').textContent='Last updated: retrying live coverage…'}
 finally{globalCoverageLoading=null}})();
 return globalCoverageLoading;
}

const PACKAGE_FEATURES={
 homeowner:['Package Community Chat','Intelligence Map','Property Profiles','Weather Intelligence','Alerts','Calendar','Favorites'],
 home:['Package Community Chat','Intelligence Map','Property Profiles','Weather Intelligence','Opportunity Rankings','Patterns','Score Explanations','Score Movement','Signals','Micro-Climate Hail Impact','Alerts','Calendar','Favorites','Saved Searches'],
 solar:['Intelligence Map','Property Profiles','Solar Intelligence','Weather Intelligence','Opportunity Rankings','Patterns','Score Explanations','Score Movement','Signals','Alerts','Calendar','Favorites','Saved Searches'],
 investor:['Climate Risk Intelligence','Package Community Chat','Intelligence Map','Property Profiles','Market Intelligence','Opportunity Rankings','Patterns','Score Explanations','Score Movement','Signals','Alerts','Calendar','Favorites','Saved Searches'],
 commercial:['AI Building Automation','AI Lease Optimization','Climate Risk Intelligence','Dynamic Property Health Score','Insurance Risk Intelligence','Interactive Digital Twin','Smart Building Sensor Fusion','Automated Material Procurement','Interactive 3D Claim Evidence Scene','Predictive Pre-Storm Client Alerts','Smart Supplement Intelligence','Package Community Chat','Business Profiles','Intelligence Map','Project Profiles','Property Profiles','Capital Intelligence','Market Intelligence','3D Building X-Ray','Drone-to-CAD / BIM Reconstruction','Thermal Moisture Mapping','Opportunity Rankings','Patterns','Score Explanations','Score Movement','Signals','On-Demand Drone Dispatch Marketplace','Micro-Climate Hail Impact','Alerts','Calendar','Favorites','Saved Searches'],
 infrastructure:['AI Building Automation','Climate Risk Intelligence','Interactive Digital Twin','Smart Building Sensor Fusion','Intelligence Map','Project Profiles','Property Profiles','Capital Intelligence','Infrastructure Intelligence','3D Building X-Ray','Opportunity Rankings','Patterns','Score Explanations','Score Movement','Signals','Alerts','Calendar','Favorites','Saved Searches'],
 pattern_intelligence:['Package Community Chat','Institutional Pattern Intelligence','Patterns','Geographic Pattern Intelligence'],
 custom_model:['Custom Model Builder','Model Marketplace'],
 company:['AI Building Automation','AI Lease Optimization','Climate Risk Intelligence','Dynamic Property Health Score','Interactive Digital Twin','Smart Building Sensor Fusion','AI Damage Scope','AI Repair Estimate','Carrier Submission Automation','Claims Intelligence','Evidence Integrity Vault','Policy Translation','Automated Material Procurement','Interactive 3D Claim Evidence Scene','Predictive Pre-Storm Client Alerts','Smart Supplement Intelligence','Package Community Chat','Business Profiles','Intelligence Map','Project Profiles','Property Profiles','Capital Intelligence','Infrastructure Intelligence','Market Intelligence','Solar Intelligence','Weather Intelligence','API Access','3D Building X-Ray','Drone-to-CAD / BIM Reconstruction','Thermal Moisture Mapping','Opportunity Rankings','Patterns','Score Explanations','Score Movement','Signals','On-Demand Drone Dispatch Marketplace','Custom Model Builder','Model Marketplace','Team Access','Micro-Climate Hail Impact','Alerts','Calendar','Data Export','Favorites','Saved Searches'],
 all_intelligence:['AI Building Automation','AI Lease Optimization','Climate Risk Intelligence','Dynamic Property Health Score','Insurance Risk Intelligence','Interactive Digital Twin','Smart Building Sensor Fusion','AI Damage Scope','AI Repair Estimate','Carrier Submission Automation','Claims Intelligence','Evidence Integrity Vault','Policy Translation','Automated Material Procurement','Interactive 3D Claim Evidence Scene','Predictive Pre-Storm Client Alerts','Smart Supplement Intelligence','Package Community Chat','Business Profiles','Intelligence Map','Project Profiles','Property Profiles','Capital Intelligence','Infrastructure Intelligence','Market Intelligence','Solar Intelligence','Weather Intelligence','API Access','3D Building X-Ray','Drone-to-CAD / BIM Reconstruction','Thermal Moisture Mapping','Opportunity Rankings','Patterns','Score Explanations','Score Movement','Signals','On-Demand Drone Dispatch Marketplace','Custom Model Builder','Model Marketplace','Team Access','Specialized Data Supplier API','Micro-Climate Hail Impact','Alerts','Calendar','Data Export','Favorites','Saved Searches']
};
const PACKAGE_ICON_PATHS={
 homeowner:'M7 22 24 8l17 14v19H29V29H19v12H7Z',
 home:'M8 24 24 10l16 14v17H8Zm8 3h16M24 27v14',
 solar:'M24 7v7m0 20v7M7 24h7m20 0h7M12 12l5 5m14 14 5 5m0-24-5 5M17 31l-5 5M24 17a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z',
 investor:'M8 39V25m10 14V17m10 22V10m10 29V21M6 41h36M8 20l10-7 10 2 10-9',
 commercial:'M8 42V9h21v33M29 18h11v24M14 15h5m-5 7h5m-5 7h5m-5 7h5m16-12h-3m3 7h-3m3 7h-3',
 infrastructure:'M8 40h32M13 40l4-29m14 29-4-29M16 18h12m-13 8h14m-15 8h16',
 pattern_intelligence:'M8 34c5-18 10-18 15 0s10 18 17 0M8 20c5-13 10-13 15 0s10 13 17 0',
 custom_model:'M9 37 17 9l14 7 8 23-15-5Zm8-28 7 25m7-18-7 18',
 company:'M7 40V15h18v25m0-17h16v17M13 21h6m-6 7h6m-6 7h6m18-6h-6m6 7h-6',
 all_intelligence:'M24 5 29 17l13 2-10 9 3 13-11-7-11 7 3-13-10-9 13-2Z'
};
function packageIcon(key){const wrap=document.createElement('span');wrap.className='package-icon';const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 48 48');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',PACKAGE_ICON_PATHS[key]||'M8 8h32v32H8ZM16 16h16v16H16Z');svg.appendChild(path);wrap.appendChild(svg);return wrap}
function packageFeatureList(features,start=0,end=features.length){const ul=document.createElement('ul');ul.className='package-feature-list';features.slice(start,end).forEach(name=>{const li=document.createElement('li');li.textContent=name;ul.appendChild(li)});return ul}
function pkg(p){
 const key=String(p.package_key||'package').replace(/[^a-z0-9_]+/gi,'_').toLowerCase(),features=PACKAGE_FEATURES[key]||[];
 const a=document.createElement('article');a.className='package-card package-'+key;
 const inner=document.createElement('div');inner.className='package-card-inner';
 const head=document.createElement('div');head.className='package-card-head';head.appendChild(packageIcon(key));
 const headCopy=document.createElement('div');headCopy.className='package-head-copy';
 const status=document.createElement('div');status.className='package-status';
 const ready=document.createElement('span');ready.textContent=String(p.delivery_status||'PACKAGE').replaceAll('_',' ');
 const modeTag=document.createElement('span');modeTag.textContent=p.owner_approval_required?'APPROVAL':'SELF-SERVICE';
 status.append(ready,modeTag);headCopy.appendChild(status);head.appendChild(headCopy);
 const h=document.createElement('h3');h.textContent=p.package_name||p.package_key;
 const price=document.createElement('div');price.className='package-price';price.textContent=Number(p.monthly_price||0)>0?'$'+Number(p.monthly_price).toLocaleString():'Custom';if(Number(p.monthly_price||0)>0){const small=document.createElement('small');small.textContent=' / MONTH';price.appendChild(small)}
 const d=document.createElement('p');d.className='package-desc';d.textContent=p.description||'BridgePoint intelligence access.';
 const meta=document.createElement('div');meta.className='package-meta-line';
 const trial=document.createElement('span');trial.textContent=Number(p.trial_days||0)>0?p.trial_days+'-DAY TRIAL':'NO AUTO TRIAL';
 const purchase=document.createElement('span');purchase.textContent=String(p.purchase_mode||'ACCESS').replaceAll('_',' ');
 meta.append(trial,purchase);
 const inc=document.createElement('div');inc.className='package-includes';const label=document.createElement('b');label.textContent='WHAT YOU GET · LIVE ENTITLEMENTS';inc.appendChild(label);
 if(features.length){inc.appendChild(packageFeatureList(features,0,Math.min(6,features.length)));if(features.length>6){const details=document.createElement('details');details.className='package-more';const summary=document.createElement('summary');summary.textContent='VIEW ALL '+features.length+' INCLUDED FEATURES';details.append(summary,packageFeatureList(features,6));inc.appendChild(details)}}else{const no=document.createElement('p');no.className='package-desc';no.textContent='Detailed entitlement list is loading from the package catalog.';inc.appendChild(no)}
 const foot=document.createElement('div');foot.className='foot';const sm=document.createElement('small');sm.textContent=p.owner_approval_required?'Owner approval required for activation.':Number(p.trial_days||0)>0?'Trial and checkout rules come from the live BridgePoint catalog.':'Access rules come from the live BridgePoint catalog.';
 const b=document.createElement('button');b.type='button';b.textContent=p.owner_approval_required?'REQUEST ACCESS':'CHOOSE PACKAGE';b.onclick=()=>{localStorage.setItem('bp_landing_package',p.package_key||'');let s=null;try{s=JSON.parse(localStorage.getItem(AUTH_STORE)||'null')}catch(_){}if(s?.access_token)location.assign('/app/?page=packages');else openAuth('signup')};foot.append(sm,b);
 inner.append(head,h,price,d,meta,inc,foot);a.appendChild(inner);return a
}

const BP_OPP_COLORS={acquisition:'#7f8cff',construction:'#ff9f5f',claims:'#d77cff',redevelopment:'#58e0b5',property_damage:'#ff5c73'};
function oppFamilyLabel(k){return({acquisition:'Investor / Acquisition',construction:'Construction',claims:'Claims',redevelopment:'Redevelopment',property_damage:'Property Damage / Restoration'})[k]||String(k||'Opportunity').replaceAll('_',' ')}
async function opportunitySummary(){
 if(opportunitySummaryLoading)return opportunitySummaryLoading;
 opportunitySummaryLoading=(async()=>{try{
   const [d,mapSummary]=await Promise.all([rpc('bridgepoint_public_opportunity_summary_v5626',{},7000),rpc('bridgepoint_public_map_opportunity_summary_v5920',{},10000).catch(e=>{console.warn('main map opportunity summary',e);return null})]),truth=window.__BP_HEADLINE_V5822__||await headline().catch(()=>null),mapTypes=Array.isArray(mapSummary?.by_type)?mapSummary.by_type:[],families=mapTypes.length?mapTypes.map(t=>({key:t.vertical_key,count:t.opportunity_count,label:({public_adjusting:'Public adjusting / claims',restoration:'Restoration',roofing:'Roofing',property_investment:'Property investment / acquisition',general_contracting:'General contracting / construction',development:'Development / redevelopment',solar:'Solar / property improvements'})[t.vertical_key]||String(t.vertical_key||'Opportunity').replaceAll('_',' '),color:({public_adjusting:'#a98cff',restoration:'#ff4ea3',roofing:'#fff200',property_investment:'#39ff88',general_contracting:'#ffb34a',development:'#00f0ff',solar:'#ffe600'})[t.vertical_key]||'#62e6ff'})):(Array.isArray(d?.families)?d.families:[]),states=Array.isArray(d?.states)?d.states:[],countries=Array.isArray(d?.countries)?d.countries:[],positive=states.filter(x=>Number(x.count)>0),positiveCountries=countries.filter(x=>Number(x.count)>0),maxFamily=Math.max(1,...families.map(x=>Number(x.count)||0)),claims=d?.claims_parity||{};
   const total=Number.isFinite(Number(mapSummary?.counts?.map_opportunity_records))?Number(mapSummary.counts.map_opportunity_records):(Number.isFinite(Number(truth?.opportunities_total))?Number(truth.opportunities_total):Number(d?.total_opportunities||0)),props=Number.isFinite(Number(mapSummary?.counts?.map_unique_properties))?Number(mapSummary.counts.map_unique_properties):(Number.isFinite(Number(truth?.opportunity_properties))?Number(truth.opportunity_properties):Number(d?.unique_properties||0)),stateCount=Number.isFinite(Number(truth?.opportunity_jurisdictions))?Number(truth.opportunity_jurisdictions):Number(d?.states_with_opportunities||0),claimText=fmt(claims.minimum_met||0)+' / '+fmt(claims.jurisdictions_total||56)+' U.S. jurisdictions at minimum source parity';
   if(mapSummary?.complete===true)window.__BP_MAP_OPPORTUNITY_SUMMARY_V5920__=mapSummary;
  requestAnimationFrame(()=>{
   const v=fmt(total);
   bpStableText('landingOpportunityTotal',v);bpStableText('landingOpportunityTotalHero',v);bpStableText('landingOpportunityHeroStat',v);
   bpStableText('landingOpportunityProperties',fmt(props));bpStableText('landingOpportunityStatesCount',fmt(stateCount));bpStableText('landingOpportunityClaimsParity',claimText);
  });
  bpLiveCacheWrite({opportunities:total,opportunityProperties:props,opportunityStates:stateCount});
  const domSig=JSON.stringify([total,props,stateCount,families.map(x=>[x.key,x.count]),states.map(x=>[x.state_code,x.count,x.properties,x.claims_target_status]),countries.map(x=>[x.country_code,x.count,x.properties,x.avg_score])]);
  if(window.__BP_OPPORTUNITY_DOM_SIG__!==domSig){
   const fam=$('landingOpportunityFamilies');
   if(fam){
    const frag=document.createDocumentFragment();
    families.forEach(x=>{
      const row=document.createElement('div');row.className='bp-opp-bar-row';
      const color=x.color||BP_OPP_COLORS[x.key]||'#62e6ff',width=Math.max(3,100*Number(x.count||0)/maxFamily);
      row.innerHTML='<div class="bp-opp-bar-copy"><span><i style="background:'+color+'"></i>'+esc(x.label||oppFamilyLabel(x.key))+'</span><b>'+fmt(x.count)+'</b></div><div class="bp-opp-track"><i style="width:'+width.toFixed(1)+'%;background:'+color+'"></i></div>';
      frag.appendChild(row);
    });
    fam.replaceChildren(frag);
   }
   const list=$('landingOpportunityStates');
   if(list){
    const frag=document.createDocumentFragment();
    positive.forEach(st=>{
      const card=document.createElement('article');card.className='bp-opp-state';
      const fs=Object.entries(st.families||{}).filter(([,v])=>Number(v)>0).sort((a,b)=>Number(b[1])-Number(a[1]));
      card.innerHTML='<div class="bp-opp-state-head"><b>'+esc(st.state_code)+'</b><strong>'+fmt(st.count)+'</strong></div><small>'+fmt(st.properties)+' properties · claims parity '+esc(String(st.claims_target_status||'BUILDING').replaceAll('_',' '))+'</small><div class="bp-opp-chips">'+fs.map(([k,v])=>'<span style="--opp:'+esc(BP_OPP_COLORS[k]||'#62e6ff')+'"><i></i>'+esc(oppFamilyLabel(k))+' '+fmt(v)+'</span>').join('')+'</div>';
      frag.appendChild(card);
    });
    const zero=states.filter(x=>Number(x.count)===0);
    if(zero.length){
      const details=document.createElement('details');details.className='bp-opp-zero-states';
      details.innerHTML='<summary>VIEW '+fmt(zero.length)+' MORE JURISDICTIONS CURRENTLY AT 0 CUSTOMER-READY OPPORTUNITIES</summary><div>'+zero.map(st=>'<span>'+esc(st.state_code)+' · '+esc(String(st.claims_target_status||'BUILDING').replaceAll('_',' '))+'</span>').join('')+'</div>';
      frag.appendChild(details);
    }
    list.replaceChildren(frag);
   }
   const countryList=$('landingOpportunityCountries');
   if(countryList){
    const frag=document.createDocumentFragment();
    positiveCountries.forEach(ct=>{
      const card=document.createElement('article');card.className='bp-opp-state';
      const code=String(ct.country_code||'').toUpperCase(),fs=Object.entries(ct.families||{}).filter(([,v])=>Number(v)>0).sort((a,b)=>Number(b[1])-Number(a[1]));
      card.innerHTML='<div class="bp-opp-state-head"><b>'+esc(bpCountryName(code,code))+' · '+esc(code)+'</b><strong>'+fmt(ct.count)+'</strong></div><small>'+fmt(ct.properties)+' properties · avg score '+Number(ct.avg_score||0).toFixed(1)+'</small><div class="bp-opp-chips">'+fs.map(([k,v])=>'<span style="--opp:'+esc(BP_OPP_COLORS[k]||'#62e6ff')+'"><i></i>'+esc(oppFamilyLabel(k))+' '+fmt(v)+'</span>').join('')+'</div>';
      frag.appendChild(card);
    });
    if(!positiveCountries.length){const empty=document.createElement('div');empty.className='bp-opp-loading';empty.textContent='No non-U.S. customer-ready opportunities published yet.';frag.appendChild(empty)}
    countryList.replaceChildren(frag);
   }
   window.__BP_OPPORTUNITY_DOM_SIG__=domSig;
  }
  window.__BP_PUBLIC_OPPORTUNITY_SUMMARY_V5626__={version:5627,total,properties:props,states:stateCount,atomicCommit:true,layoutStable:true,updatedAt:Date.now()};
 }catch(e){console.warn('opportunity summary',e)}
 finally{opportunitySummaryLoading=null}})();
 return opportunitySummaryLoading;
}
async function packages(){const g=$('landingPackages');try{const d=await rpc('bridgepoint_public_package_catalog_v1054',{},10000),rows=(d.packages||[]).filter(p=>!String(p.package_key||'').startsWith('technology_'));g.textContent='';rows.forEach(p=>g.appendChild(pkg(p)));if(!rows.length)g.textContent='Package catalog is updating.'}catch(e){g.textContent='Package catalog retry · '+String(e.message||e)}}
const FREE_LOOKUP_KEY='bp_landing_free_lookup_v5400';
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
async function landingAddressFallback(q,timeout=7000){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
 try{
  const r=await fetch(SUPA+'/functions/v1/bridgepoint-public-address-geocode-v5300',{method:'POST',headers:H,body:JSON.stringify({q}),signal:ctl.signal,cache:'no-store'});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||('HTTP '+r.status));return d;
 }finally{clearTimeout(timer)}
}
function credibleAddressRows(q,rows){
 const raw=String(q||'').trim().toLowerCase(),state=(raw.match(/\b(al|ak|az|ar|ca|co|ct|de|dc|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b/)||[])[1];
 return (Array.isArray(rows)?rows:[]).filter(r=>{
   const reason=String(r?.match_reason||'').toUpperCase(),score=Number(r?.match_score||0),addr=String(r?.full_address||r?.geocoder_address||'').toLowerCase();
   const cc=String(r?.country_code||'').trim().toUpperCase(),globalTruth=!!r?.global_property_id||(cc&&cc!=='US'),display=String(r?.display_label||'').trim();
   if(globalTruth&&display)return !!r?.global_property_id||reason.startsWith('GLOBAL_')||score>=0.50;
   if(!addr)return false;
   if(reason.includes('EXACT')||reason.startsWith('CENSUS_'))return true;
   if(state&&String(r?.state_code||r?.state||'').toLowerCase()!==state)return false;
   return score>=0.72;
 });
}
function freeLookupUsed(){return localStorage.getItem(FREE_LOOKUP_KEY)==='1'}
function gateLookup(message){
 const box=$('landingPropertySearchResults');
 if(box){box.hidden=false;box.innerHTML='<button type="button" data-gate-lookup><b>Continue with BridgePoint</b><small>'+esc(message||'Your free property lookup has been used. Create an account to continue and unlock package intelligence.')+'</small></button>';box.querySelector('[data-gate-lookup]')?.addEventListener('click',()=>openAuth('signup'))}
}
async function resolveLandingRowCoordinates(row){
 const lng=Number(row?.longitude),lat=Number(row?.latitude);
 if(Number.isFinite(lng)&&Number.isFinite(lat))return row;
 const address=row?.full_address||row?.geocoder_address||row?.display_label||'';
 if(!address)return row;
 const cc=String(row?.country_code||'').trim().toUpperCase();
 if(cc&&cc!=='US')return row;
 try{
  const d=await landingAddressFallback(address,7000),g=Array.isArray(d?.results)?d.results[0]:null;
  if(g&&Number.isFinite(Number(g.longitude))&&Number.isFinite(Number(g.latitude))){
   window.BridgePointAcquisition?.send?.('VALUE_VIEW',{action:'address_selection_geocoded',surface:'landing'});
   return {...row,...g,property_id:row.property_id||g.property_id,address_id:row.address_id||g.address_id};
  }
 }catch(_){}
 return row;
}
async function hydrateLandingLookup(row){
 const lng=Number(row.longitude),lat=Number(row.latitude),cc=String(row.country_code||'').trim().toUpperCase(),globalRow=!!row.global_property_id||(cc&&cc!=='US'),address=row.full_address||row.geocoder_address||row.display_label||'Selected property';
 if(Number.isFinite(lng)&&Number.isFinite(lat)&&map){map.easeTo({center:[lng,lat],zoom:17,pitch:62,bearing:-18,duration:850})}
 $('previewTitle').textContent=address;
 $('previewMeta').textContent=globalRow?'Loading public global parcel truth…':'Loading public property + structure truth…';
 $('previewType').textContent=row.match_type||row.match_reason||'Property match';
 $('previewRoof').textContent=globalRow?'Checking source-backed parcel provenance':'Checking source-backed roof context';
 $('previewCard').hidden=false;
 try{
  if(globalRow){
   const d=await rpc('bridgepoint_public_global_property_detail_v957',{p_lng:lng,p_lat:lat,p_radius_m:180},5500),p=d?.property||{};
   $('previewMeta').textContent=[p.source_name,p.provider,p.country_code&&('Country '+p.country_code),p.region_code||p.state_code].filter(Boolean).join(' · ')||'Source-backed global parcel resolved.';
   $('previewType').textContent=p.property_type||'Source parcel';
   $('previewRoof').textContent=d?.truth_notice||'Global parcel geometry is source-backed and shown as a GIS reference.';
  }else{
   const d=await rpc('bridgepoint_public_building_detail_v5000',{p_lng:lng,p_lat:lat,p_radius_m:140},6500);
   const b=d?.building||{};
   const bits=[];
   if(b.render_height_m)bits.push(Number(b.render_height_m).toFixed(1)+' m height');
   if(b.floors)bits.push(String(b.floors)+' floors');
   if(b.building_part_count)bits.push(fmt(b.building_part_count)+' structural parts');
   if(b.source_key)bits.push(String(b.source_key));
   $('previewMeta').textContent=bits.length?bits.join(' · '):'Public property match resolved. Select the building on the map for the live 3D frame.';
   $('previewType').textContent=b.building_type||b.class_name||row.match_type||'Mapped structure';
   $('previewRoof').textContent=[b.roof_shape,b.roof_material].filter(Boolean).join(' · ')||'Roof intelligence available with eligible package access';
  }
 }catch(err){
  $('previewMeta').textContent=globalRow?'Global parcel resolved on the live map. Source detail will retry.':'Address resolved on the live map. Deeper building enrichment will retry in the full app.';
  $('previewRoof').textContent=globalRow?'Source-backed global parcel':'Package-gated roof intelligence';
 }
 window.BridgePointAcquisition?.send?.('VALUE_VIEW',{action:'free_property_lookup',surface:'landing',matched:!!(row.property_id||row.global_property_id),country:String(row.country_code||'US')});
 return Number.isFinite(lng)&&Number.isFinite(lat);
}

async function landingSearchSubmit(e){
 e.preventDefault();
 const input=$('landingPropertySearchInput'),box=$('landingPropertySearchResults'),q=input?.value.trim()||'';
 if(q.length<4)return;
 window.BridgePointAcquisition?.send?.('VALUE_VIEW',{action:'address_search_submit',surface:'landing'});
 box.hidden=false;box.innerHTML='<button disabled><b>Searching BridgePoint…</b><small>Matching address, parcel and property identity.</small></button>';
 let rows=[],rawRows=[],recoveryUsed=false,globalUsed=false;
 try{const d=await rpc('bridgepoint_public_search_v5200',{p_query:q,p_limit:6},3200);rawRows=d?.results||[];rows=credibleAddressRows(q,rawRows);if(rawRows.length>rows.length)window.BridgePointAcquisition?.send?.('VALUE_VIEW',{action:'address_search_weak_match_suppressed',surface:'landing',suppressed:rawRows.length-rows.length})}catch(_){}
 if(!rows.length){
  try{const d=await rpc('bridgepoint_public_global_search_v957',{p_query:q,p_limit:6},4200);rows=d?.results||[];globalUsed=rows.length>0}catch(_){}
 }
 if(!rows.length){try{const d=await landingAddressFallback(q,7000);rows=d?.results||[];recoveryUsed=rows.length>0;if(recoveryUsed)window.BridgePointAcquisition?.send?.('VALUE_VIEW',{action:'address_search_recovered',surface:'landing',resolver:String(d?.resolver||'CENSUS')})}catch(_){}}
 if(!rows.length){window.BridgePointAcquisition?.send?.('VALUE_VIEW',{action:'address_search_no_match',surface:'landing'});box.innerHTML='<button disabled><b>No match yet</b><small>Try a complete street address, cadastral/parcel ID, municipality, or another source-backed location from a live coverage area.</small></button>';return}
 window.BridgePointAcquisition?.send?.('VALUE_VIEW',{action:'address_search_results',surface:'landing',result_count:rows.length});
 box.innerHTML='';
 rows.slice(0,6).forEach(row=>{
  const b=document.createElement('button');b.type='button';
  const address=row.full_address||row.geocoder_address||row.display_label||'Property / parcel';
  const meta=globalUsed||row.global_property_id?[row.municipality,row.state_code,row.country_code,row.match_reason].filter(Boolean).join(' · '):[row.city,row.state_code||row.state,row.match_type].filter(Boolean).join(' · ');
  b.innerHTML='<b class="notranslate" translate="no">'+esc(address)+'</b><small class="notranslate" translate="no">'+esc(meta||'BridgePoint property match')+'</small>';
  b.addEventListener('click',async()=>{
   if(freeLookupUsed()){gateLookup('Your first free property lookup has already been used. Create an account to open another property and continue into the live intelligence tools.');return}
   b.disabled=true;
   const original=b.innerHTML;
   b.innerHTML='<b>Locating property…</b><small>Resolving map coordinates.</small>';
   const resolved=await resolveLandingRowCoordinates(row);
   const lng=Number(resolved?.longitude),lat=Number(resolved?.latitude);
   if(!Number.isFinite(lng)||!Number.isFinite(lat)){
    b.disabled=false;b.innerHTML=original;
    window.BridgePointAcquisition?.send?.('VALUE_VIEW',{action:'address_search_unresolved_coordinates',surface:'landing'});
    box.innerHTML='<button disabled><b>Address found — map location still resolving</b><small>BridgePoint found this property record, but its map coordinate is still being attached. Try another complete address or open the full app search.</small></button>';
    return
   }
   box.hidden=true;
   const opened=await hydrateLandingLookup(resolved);
   if(opened)localStorage.setItem(FREE_LOOKUP_KEY,'1');
  });
  box.appendChild(b);
 });
}

function bindConversionPreview(){
 $('landingPropertySearch')?.addEventListener('submit',landingSearchSubmit);
 document.querySelectorAll('[data-preview-cap]').forEach(btn=>btn.addEventListener('click',()=>{
  const cap=btn.dataset.previewCap;
  document.querySelectorAll('[data-preview-cap]').forEach(x=>x.classList.toggle('active',x===btn));
  if(cap==='overview'){$('previewCapabilityNote').textContent='Overview is public-safe. Search one property free, move the map freely, and tap buildings.';return}
  $('previewCapabilityNote').textContent='This is business-critical intelligence. Create an account to start eligible trial/package access.';
  openAuth('signup');
 }));
}
async function install(){if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return}alert('Use your browser install or Add to Home Screen option to install BridgePoint on this device.')}function bindWorldBackdrop(){const paint=()=>{backdropFrame=0;const shift=Math.min(innerWidth<=600?84:170,scrollY*.055);document.documentElement.style.setProperty('--bp-world-shift',shift.toFixed(1)+'px')};const queue=()=>{if(!backdropFrame)backdropFrame=requestAnimationFrame(paint)};addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue,{passive:true});paint()}
function bind(){document.querySelectorAll('.auth-open').forEach(b=>b.onclick=()=>openAuth(b.dataset.mode));$('closeAuth').onclick=()=>$('authModal').hidden=true;$('authModal').onclick=e=>{if(e.target===$('authModal'))$('authModal').hidden=true};$('authSwitch').onclick=()=>setMode(mode==='signup'?'signin':'signup');$('authForm').onsubmit=submit;$('installTop').onclick=install;$('installBottom').onclick=install;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});const q=new URLSearchParams(location.search);if(q.get('auth'))openAuth(q.get('auth')==='signin'?'signin':'signup')}window.addEventListener('bridgepoint:softrefresh',()=>{
 try{headline()}catch(_){}
 try{globalCoverage()}catch(_){}
 try{opportunitySummary()}catch(_){}
 try{if(window.__BP_LANDING_WORLD__)void loadLandingNationalWeather(window.__BP_LANDING_WORLD__,0)}catch(_){}
 try{window.__BP_LANDING_WORLD__?.map?.triggerRepaint?.()}catch(_){}
 window.__BP_LANDING_SOFT_REFRESH__={hardReload:false,lastAt:Date.now()}
});
if(!hashSession()){bind();bindMetricNavigation();bindWorldBackdrop();bindConversionPreview();watchCriticalCopy();hydrateLiveMetricSnapshot();headline();warmLandingWeatherFirstFrameV6134();initMap();setInterval(headline,60000);liveCountryCounters();setInterval(liveCountryCounters,30000);window.__BP_LIVE_COUNTER_LOOP_V5906__={intervalMs:30000,source:'bridgepoint_public_live_counters_v5902',updatedAt:Date.now()};globalCoverage();setInterval(globalCoverage,300000);opportunitySummary();setInterval(opportunitySummary,300000);packages();if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js?v=6135-source-weather-entrypoint',{updateViaCache:'none'}).catch(()=>{})}
// BP_V5441_DEPLOY_SYNC: compact national hazard dots; radar and boundaries unchanged.