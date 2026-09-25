const LOCAL_RUNTIME=location.hostname==='127.0.0.1'||location.hostname==='localhost';const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co',KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25',RPC=SUPA+'/rest/v1/rpc/',AUTH_STORE='bp_auth_v5045';const H={'apikey':KEY,'Content-Type':'application/json','Accept':'application/json'};let mode='signup',installPrompt=null,map=null,landingWeatherTimer=0,landingWeatherRetryTimer=0,landingOpportunityTimer=0,landingOpportunitySeq=0,backdropFrame=0;const $=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString();async function rpc(n,a={},ms=5000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms),localNames=['bridgepoint_frontend_status_v5000','bridgepoint_data_sprint_status_v5106','bridgepoint_public_global_status_v957','bridgepoint_public_global_coverage_v5601'],base=LOCAL_RUNTIME&&localNames.includes(n)?location.origin+'/rest/v1/rpc/':RPC;try{const r=await fetch(base+n,{method:'POST',headers:H,body:JSON.stringify(a),signal:c.signal,cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||('HTTP '+r.status));return d}finally{clearTimeout(t)}}function saveSession(d){if(!d?.access_token)return false;if(!d.expires_at&&d.expires_in)d.expires_at=Math.floor(Date.now()/1000)+Number(d.expires_in);localStorage.setItem(AUTH_STORE,JSON.stringify(d));return true}function hashSession(){const h=new URLSearchParams(location.hash.replace(/^#/,''));if(!h.get('access_token'))return false;saveSession({access_token:h.get('access_token'),refresh_token:h.get('refresh_token'),expires_in:h.get('expires_in')});history.replaceState(null,'',location.pathname+location.search);location.replace('/app/');return true}function setMode(v){mode=v==='signin'?'signin':'signup';const s=mode==='signup';$('nameField').hidden=!s;$('authTitle').textContent=s?'Start using BridgePoint':'Welcome back';$('authEyebrow').textContent=s?'CREATE YOUR BRIDGEPOINT ACCOUNT':'SIGN IN TO BRIDGEPOINT';$('authIntro').textContent=s?'Your account connects Saved, package access, Claims and Workflow to the same BridgePoint identity.':'Sign in to continue into your BridgePoint workspace.';$('authSubmit').textContent=s?'CREATE ACCOUNT':'SIGN IN';$('authSwitch').textContent=s?'Already have an account? Sign in':'Need an account? Create one';$('authPassword').autocomplete=s?'new-password':'current-password';$('authMessage').textContent=''}function openAuth(v){setMode(v||'signup');$('authModal').hidden=false;setTimeout(()=>$('authEmail').focus(),50)}async function submit(e){e.preventDefault();const email=$('authEmail').value.trim(),password=$('authPassword').value,name=$('authName').value.trim(),m=$('authMessage'),b=$('authSubmit');b.disabled=true;m.textContent=mode==='signup'?'Creating your BridgePoint account…':'Signing in…';try{const path=mode==='signup'?'signup':'token?grant_type=password',body=mode==='signup'?{email,password,data:{display_name:name||email.split('@')[0],signup_source:'bridgepoint_landing'}}:{email,password};const r=await fetch(SUPA+'/auth/v1/'+path,{method:'POST',headers:H,body:JSON.stringify(body),cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok){window.BridgePointAcquisition?.send?.(mode==='signup'?'SIGNUP_ERROR':'SIGNIN_ERROR',{auth_surface:'landing',http_status:r.status});throw new Error(d.msg||d.message||d.error_description||d.error||('HTTP '+r.status))}const hasSession=saveSession(d);if(mode==='signup'){window.BridgePointAcquisition?.send?.('SIGNUP_SUCCESS',{auth_surface:'landing',session_returned:hasSession,confirmation_required:!hasSession});if(d?.user?.id)window.BridgePointAcquisition?.identify?.(d.user.id,{auth_surface:'landing',signup_source:'bridgepoint_landing'});if(hasSession){m.textContent='Account ready. Opening BridgePoint…';const target=localStorage.getItem('bp_landing_package')?'/app/?page=packages':'/app/';setTimeout(()=>location.assign(target),250)}else m.textContent='Account created. Check your email if confirmation is required, then sign in.'}else{if(!hasSession)throw new Error('No session returned. Please retry.');window.BridgePointAcquisition?.send?.('SIGNIN_SUCCESS',{auth_surface:'landing'});if(d?.user?.id)window.BridgePointAcquisition?.identify?.(d.user.id,{auth_surface:'landing'});m.textContent='Account ready. Opening BridgePoint…';const target=localStorage.getItem('bp_landing_package')?'/app/?page=packages':'/app/';setTimeout(()=>location.assign(target),250)}}catch(err){m.textContent=String(err.message||err)}finally{b.disabled=false}}
function landingWeatherColorExpr(){return['match',['get','type'],'WILDFIRE','#ff744f','FIRE_WEATHER','#ff9c5a','TORNADO','#d596ff','HAIL','#c9efff','LIGHTNING','#ffe16d','FLOOD','#4ca7ff','HURRICANE','#65e6ff','HURRICANE_CONE','#65e6ff','HURRICANE_TRACK','#65e6ff','WIND','#9ad7ff','RAIN','#68b9ff','WEATHER_REPORT','#b9d6df','#9ab8c5']}
function landingWeatherCollections(items){const points=[],shapes=[];for(const item of items||[]){const props={type:item.type||'WEATHER_REPORT',name:item.name||item.type||'Weather event',severity:item.severity||'',certainty:item.certainty||'',urgency:item.urgency||'',observed:item.observed===true,source:item.source||'',observed_at:item.observed_at||'',ends_at:item.ends_at||''},gt=item.geometry?.type||'';if(['Polygon','MultiPolygon','LineString','MultiLineString'].includes(gt))shapes.push({type:'Feature',properties:props,geometry:item.geometry});const lon=Number(item.lon),lat=Number(item.lat);if(Number.isFinite(lon)&&Number.isFinite(lat))points.push({type:'Feature',properties:props,geometry:{type:'Point',coordinates:[lon,lat]}})}return{points:{type:'FeatureCollection',features:points},shapes:{type:'FeatureCollection',features:shapes}}}
function ensureLandingWeatherLegend(){let root=$('landingWeatherLegend');if(root)return root;root=document.createElement('div');root.id='landingWeatherLegend';root.className='landing-weather-legend';root.innerHTML='<div class="landing-weather-head"><b>LIVE WEATHER + HAZARDS</b><span><span id="landingWeatherCount">CHECKING</span> <button id="landingWeatherToggle" type="button" aria-expanded="false">MORE</button></span></div><div class="landing-weather-items"><span><i style="color:#ff744f;background:#ff744f"></i>Wildfire</span><span><i style="color:#ffe16d;background:#ffe16d"></i>Lightning</span><span><i style="color:#4ca7ff;background:#4ca7ff"></i>Flood</span><span><i style="color:#d596ff;background:#d596ff"></i>Tornado</span><span><i style="color:#65e6ff;background:#65e6ff"></i>Hurricane</span></div><div id="landingWeatherMore" class="landing-weather-more" hidden><div class="landing-weather-grid"><span style="color:#4ca7ff">▰ Flood watch / advisory / warning area</span><span style="color:#d596ff">▰ Tornado watch / warning polygon</span><span style="color:#9ad7ff">▰ Wind / severe-weather area</span><span style="color:#c9efff">▰ Hail outlook / radar-indicated storm</span><span style="color:#65e6ff">━ Hurricane cone / track</span><span style="color:#ff9c5a">● Fire-weather / wildfire context</span><span style="color:#68b9ff">━ NOAA radar precipitation</span><span style="color:#b9d6df">● Source weather report / observation</span></div><small>Area fills + outlines = alert/watch/warning or forecast geometry. Dots = event locations. Strong/solid = observed/source event; faded = alert or forecast. Radar reflectivity is weather context, not proof of property damage.</small></div><small id="landingWeatherTime">Loading fresh public source context…</small>';document.querySelector('.preview')?.appendChild(root);const t=$('landingWeatherToggle'),m=$('landingWeatherMore');if(t&&m)t.onclick=e=>{e.stopPropagation();const open=m.hidden;m.hidden=!open;root.classList.toggle('expanded',open);t.textContent=open?'LESS':'MORE';t.setAttribute('aria-expanded',String(open))};return root}
function landingWeatherPopup(m,e){const f=e.features?.[0];if(!f)return;const p=f.properties||{},wrap=document.createElement('div');wrap.style.cssText='min-width:200px;max-width:280px;font-family:Inter,system-ui,sans-serif;color:#071118';const title=document.createElement('b');title.style.cssText='display:block;font-size:13px';title.textContent=p.name||p.type||'Live weather';const meta=document.createElement('div');meta.style.cssText='margin-top:5px;font-size:10px;line-height:1.45;color:#415661';meta.textContent=[p.type?String(p.type).replaceAll('_',' '):'',p.severity||'',p.source||''].filter(Boolean).join(' · ');wrap.append(title,meta);new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'310px'}).setLngLat(e.lngLat).setDOMContent(wrap).addTo(m)}

let landingRadarActive='A',landingRadarFrames=[],landingRadarIndex=0,landingRadarTimer=0;
function landingRadarTileUrl(epoch){
 const base='https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer/exportImage';
 const time=Number.isFinite(+epoch)?'&time='+encodeURIComponent(String(epoch)):'';
 return base+'?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true'+time+'&f=image'
}
function landingWeatherBefore(m){for(const id of ['gta-state','gta-place-label'])if(m.getLayer(id))return id;return undefined}
function installLandingRadar(world){
 const m=world?.map;if(!m)return false;const before=landingWeatherBefore(m),blank='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
 try{
  for(const side of ['A','B']){
   const sid='bpLandingRadar'+side,lid='bp-landing-radar-'+side.toLowerCase();
   if(!m.getSource(sid))m.addSource(sid,{type:'raster',tiles:[blank],tileSize:256,minzoom:0,maxzoom:12});
   if(!m.getLayer(lid))m.addLayer({id:lid,type:'raster',source:sid,minzoom:0,maxzoom:24,layout:{visibility:'visible'},paint:{'raster-opacity':0,'raster-fade-duration':0,'raster-resampling':'linear'}},before)
  }
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
  setTimeout(()=>{try{m.setPaintProperty(lid,'raster-opacity',.62);m.setPaintProperty(old,'raster-opacity',0);landingRadarActive=next;m.triggerRepaint();window.__BP_LANDING_RADAR_STATE__={visible:true,active:next,epoch,opacity:.62,updatedAt:Date.now()}}catch(_){}},220);
  return true
 }catch(e){console.warn('Landing radar frame',e);return false}
}
function startLandingRadar(world){
 const m=world?.map;if(!m)return;
 installLandingRadar(world);landingRadarFrames=landingRadarFramesNow();landingRadarIndex=Math.max(0,landingRadarFrames.length-6);
 showLandingRadarFrame(world,landingRadarFrames[landingRadarIndex]);
 clearInterval(landingRadarTimer);
 landingRadarTimer=setInterval(()=>{if(document.hidden||m.isMoving?.())return;const z=m.getZoom?.()||0;if(z>10)return;landingRadarFrames=landingRadarFramesNow();const frame=landingRadarFrames[landingRadarIndex%landingRadarFrames.length];landingRadarIndex=(landingRadarIndex+1)%landingRadarFrames.length;showLandingRadarFrame(world,frame)},2200);
 const reassert=()=>{installLandingRadar(world);for(const id of ['bp-landing-radar-a','bp-landing-radar-b'])try{if(m.getLayer(id)&&(m.getLayoutProperty(id,'visibility')||'visible')==='none')m.setLayoutProperty(id,'visibility','visible')}catch(_){}};
 try{m.on('styledata',reassert);m.on('idle',reassert)}catch(_){}
}
function installLandingNationalWeather(world){
 const m=world?.map;if(!m)return false;
 const empty={type:'FeatureCollection',features:[]};
 const install=()=>{
  try{if(!m.getSource('bpLandingWeatherPoints'))m.addSource('bpLandingWeatherPoints',{type:'geojson',data:empty})}catch(e){console.warn('Landing weather point source',e)}
  try{if(!m.getSource('bpLandingWeatherShapes'))m.addSource('bpLandingWeatherShapes',{type:'geojson',data:empty})}catch(e){console.warn('Landing weather shape source',e)}
  const add=layer=>{try{if(!m.getLayer(layer.id))m.addLayer(layer);return !!m.getLayer(layer.id)}catch(e){window.__BP_LANDING_WEATHER_LAYER_ERRORS__=[...(window.__BP_LANDING_WEATHER_LAYER_ERRORS__||[]),{id:layer.id,message:String(e?.message||e),at:Date.now()}].slice(-12);console.warn('Landing weather layer '+layer.id,e);return false}};
  add({id:'bp-landing-weather-fill',type:'fill',source:'bpLandingWeatherShapes',minzoom:0,paint:{'fill-color':landingWeatherColorExpr(),'fill-opacity':['case',['==',['get','observed'],true],.24,.16]}});
  add({id:'bp-landing-weather-line',type:'line',source:'bpLandingWeatherShapes',minzoom:0,paint:{'line-color':landingWeatherColorExpr(),'line-width':['interpolate',['linear'],['zoom'],0,.42,1.2,.5,2.2,.7,4,1.15,8,2.6,14,5.8],'line-opacity':['case',['==',['get','observed'],true],1,.94]}});
  add({id:'bp-landing-weather-glow',type:'circle',source:'bpLandingWeatherPoints',minzoom:0,paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,.8,1.2,1.05,2.2,1.45,3.5,2.1,4.5,3.2,9,8,14,13],'circle-color':landingWeatherColorExpr(),'circle-opacity':['case',['==',['get','observed'],true],.25,.15],'circle-blur':.78}});
  add({id:'bp-landing-weather-points',type:'circle',source:'bpLandingWeatherPoints',minzoom:0,paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,.32,1.2,.42,2.2,.62,3.5,1,4.5,1.6,9,4.8,14,7.4],'circle-color':landingWeatherColorExpr(),'circle-opacity':['case',['==',['get','observed'],true],.96,.72],'circle-stroke-color':'#eefcff','circle-stroke-width':['interpolate',['linear'],['zoom'],0,.18,2.2,.24,3.5,.32,4.5,.52,12,1.25],'circle-stroke-opacity':['interpolate',['linear'],['zoom'],0,.42,3.5,.55,6,.72,12,.88]}});
  add({id:'bp-landing-weather-hit',type:'circle',source:'bpLandingWeatherPoints',minzoom:0,paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,7,3.5,9,9,13],'circle-color':'#ffffff','circle-opacity':.001,'circle-stroke-opacity':0}});
  const interactive=['bp-landing-weather-hit','bp-landing-weather-points','bp-landing-weather-fill','bp-landing-weather-line'].filter(id=>m.getLayer(id));
  if(!m.__bpLandingWeatherBound&&interactive.length){m.__bpLandingWeatherBound=true;for(const id of interactive){m.on('click',id,e=>landingWeatherPopup(m,e));m.on('mouseenter',id,()=>m.getCanvas().style.cursor='pointer');m.on('mouseleave',id,()=>{m.getCanvas().style.cursor=''})}}
  return !!m.getLayer('bp-landing-weather-line')&&!!m.getLayer('bp-landing-weather-points')
 };
 ensureLandingWeatherLegend();
 if(m.loaded()||m.isStyleLoaded?.())return install();
 try{m.once('styledata',install);m.once('idle',install);m.once('load',install)}catch(_){}
 setTimeout(install,180);setTimeout(install,700);return false
}
async function loadLandingNationalWeather(world,attempt=0){
 const m=world?.map;if(!m)return false;
 try{
  if(!m.getLayer('bp-landing-weather-line')||!m.getLayer('bp-landing-weather-points'))installLandingNationalWeather(world);
  const d=await rpc('bridgepoint_public_weather_bootstrap_v5512',{},6000);
  if(d?.fresh!==true){
   if($('landingWeatherCount'))$('landingWeatherCount').textContent='REFRESHING';
   if($('landingWeatherTime'))$('landingWeatherTime').textContent='Public weather cache is refreshing · preserving the last visible layer.';
   if(attempt<4){clearTimeout(landingWeatherRetryTimer);landingWeatherRetryTimer=setTimeout(()=>loadLandingNationalWeather(world,attempt+1),Math.min(9000,2200*(attempt+1)))}
   return false
  }
  const wx=landingWeatherCollections(d.items||[]);
  m.getSource('bpLandingWeatherPoints')?.setData(wx.points);
  m.getSource('bpLandingWeatherShapes')?.setData(wx.shapes);
  for(const id of ['bp-landing-radar-a','bp-landing-radar-b','bp-landing-weather-fill','bp-landing-weather-line','bp-landing-weather-glow','bp-landing-weather-points','bp-landing-weather-hit'])try{if(m.getLayer(id))m.setLayoutProperty(id,'visibility','visible')}catch(_){}
  for(const id of ['bp-landing-weather-fill','bp-landing-weather-line','bp-landing-weather-glow','bp-landing-weather-points'])try{if(m.getLayer(id))m.moveLayer(id)}catch(_){}
  if($('landingWeatherCount'))$('landingWeatherCount').textContent=(d.items?.length||0)+' EVENTS';
  if($('landingWeatherTime'))$('landingWeatherTime').textContent='Fresh '+new Date(d.generated_at).toLocaleTimeString()+' · national dots + watch/warning geometry + live source context';
  window.__BP_LANDING_LIVE_WEATHER__={fresh:true,count:d.items?.length||0,shapeCount:wx.shapes.features.length,pointCount:wx.points.features.length,updatedAt:Date.now()};
  clearTimeout(landingWeatherRetryTimer);return true
 }catch(e){
  console.warn('Landing national weather',e);
  if($('landingWeatherCount'))$('landingWeatherCount').textContent='RETRYING';
  if($('landingWeatherTime'))$('landingWeatherTime').textContent='Live source request is retrying · existing map layers stay visible.';
  if(attempt<4){clearTimeout(landingWeatherRetryTimer);landingWeatherRetryTimer=setTimeout(()=>loadLandingNationalWeather(world,attempt+1),Math.min(9000,2200*(attempt+1)))}
  return false
 }
}
async function startLandingNationalWeather(world){
 const m=world?.map;if(!m)return;
 startLandingRadar(world);
 for(let i=0;i<24;i++){
  installLandingNationalWeather(world);
  if(m.getLayer('bp-landing-weather-line')&&m.getLayer('bp-landing-weather-points'))break;
  await new Promise(r=>setTimeout(r,100))
 }
 window.__BP_LANDING_WEATHER_LAYER_STATE__={line:!!m.getLayer('bp-landing-weather-line'),points:!!m.getLayer('bp-landing-weather-points'),fill:!!m.getLayer('bp-landing-weather-fill'),glow:!!m.getLayer('bp-landing-weather-glow'),errors:window.__BP_LANDING_WEATHER_LAYER_ERRORS__||[],updatedAt:Date.now()};
 await loadLandingNationalWeather(world,0);
 clearInterval(landingWeatherTimer);
 landingWeatherTimer=setInterval(()=>loadLandingNationalWeather(world,0),60000)
}
function publicOpportunityGeojson(geo){
 const base=geo?.type==='FeatureCollection'?geo:{type:'FeatureCollection',features:[]};
 return{...base,features:(base.features||[]).map(f=>({...f,properties:{...(f.properties||{}),color:'#ff1744',label:'Opportunity here · see full intelligence in app',icon_key:'GENERAL',public_teaser:true}}))}
}
async function refreshLandingOpportunities(world){
 const m=world?.map,src=m?.getSource?.('bpOpportunities');if(!m||!src?.setData||m.isMoving?.())return false;
 const seq=++landingOpportunitySeq;
 if(m.getZoom()<10.8){src.setData({type:'FeatureCollection',features:[]});window.__BP_PUBLIC_OPPORTUNITY_STYLE_V5578__={mode:'PUBLIC_RED_TEASER',wholeBuilding:true,features:0,lowZoom:true,updatedAt:Date.now()};return true}
 const b=m.getBounds();
 try{
  const d=await rpc('bridgepoint_public_opportunity_viewport_v5025',{p_west:b.getWest(),p_south:b.getSouth(),p_east:b.getEast(),p_north:b.getNorth(),p_limit:window.innerWidth<=620?70:160},3600);
  if(seq!==landingOpportunitySeq)return false;
  const geo=publicOpportunityGeojson(d?.geojson);src.setData(geo);
  try{
   if(m.getLayer('gta-opportunity-buildings')){m.setLayoutProperty('gta-opportunity-buildings','visibility','visible');m.setPaintProperty('gta-opportunity-buildings','fill-extrusion-color','#ff1744');m.setPaintProperty('gta-opportunity-buildings','fill-extrusion-opacity',1)}
   if(m.getLayer('gta-opportunity-label')){m.setLayoutProperty('gta-opportunity-label','visibility','visible');m.setPaintProperty('gta-opportunity-label','text-color','#ff4967');m.setPaintProperty('gta-opportunity-label','icon-opacity',0)}
  }catch(_){}
  window.__BP_PUBLIC_OPPORTUNITY_STYLE_V5578__={mode:'PUBLIC_RED_TEASER',wholeBuilding:true,detailSuppressed:true,label:'Opportunity here · see full intelligence in app',features:geo.features.length,updatedAt:Date.now()};
  return true
 }catch(e){console.warn('Landing opportunity overlay',e);return false}
}
function startLandingOpportunities(world){
 const m=world?.map;if(!m||m.__bpLandingOpportunityBound)return;
 m.__bpLandingOpportunityBound=true;
 const run=()=>{clearTimeout(landingOpportunityTimer);landingOpportunityTimer=setTimeout(()=>void refreshLandingOpportunities(world),window.innerWidth<=620?700:320)};
 m.on('moveend',run);try{m.once('load',run)}catch(_){}
 setTimeout(run,650)
}

async function initMap(){
 window.__BP_LANDING_MAP_BOOT__={stage:'start',maplibre:!!window.maplibregl,at:Date.now()};
 if(!window.maplibregl){window.__BP_LANDING_MAP_BOOT__={stage:'error',error:'MAPLIBRE_UNAVAILABLE',maplibre:false,at:Date.now()};return}
 try{
  window.__BP_LANDING_MAP_BOOT__={stage:'importing-world',maplibre:true,at:Date.now()};
  const mod=await import('./world-v2300-map.js?v=5620-city5380');
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
  window.__BP_LANDING_MAP_BOOT__={stage:'world-ready',maplibre:true,module:true,world:true,at:Date.now()};
  startLandingOpportunities(world);
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
  let bpUserMapGesture=false;const previewEl=$('previewMap');for(const ev of ['pointerdown','touchstart','wheel'])previewEl?.addEventListener(ev,()=>{bpUserMapGesture=true},{passive:true});map.on('move',()=>{$('previewCard').hidden=true;if(bpUserMapGesture){const s=document.querySelector('.preview-sample');if(s){s.style.opacity='0';s.style.pointerEvents='none';s.style.transform='translateY(6px)'}}});
  try{
   if(!map.isStyleLoaded?.())await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve()};map.once?.('load',finish);setTimeout(finish,5000)});
   const [wm,pm]=await Promise.all([import('./world-v2300-weather.js?v=5615'),import('./world-v2300-present-weather.js?v=5544')]);
   const weather=wm.initWeather(world.map),present=pm.initPresentWeather(world.map);
   weather?.setActive?.(true);weather?.setRadar?.(true);
   void startLandingNationalWeather(world).catch(e=>console.warn('BridgePoint national weather async',e));
   window.__BP_LANDING_VISUAL_WEATHER__={version:5544,weather,present,mapShared:true,nationalWeather:true,radarVisible:true,radarAnimatedAtCloseZoom:false,radarGroundDrape:true,asyncAttach:true,updatedAt:Date.now()}
  }catch(e){console.warn('BridgePoint preview weather',e)}
 }catch(e){
  const msg=String(e?.stack||e?.message||e||'UNKNOWN_MAP_BOOT_ERROR');
  window.__BP_LANDING_MAP_BOOT__={stage:'error',error:msg,maplibre:!!window.maplibregl,module:!!window.__BP_WORLD_RENDER_VERSION__,provisional:!!window.__bpLandingWorldV5420?.map,at:Date.now()};
  console.error('BridgePoint shared preview renderer',e);
  const el=$('previewMap');if(el)el.innerHTML='<div style="display:grid;place-items:center;height:100%;padding:24px;text-align:center;color:#a9c0ca;background:#071017">BridgePoint World preview is refreshing. Open the app for the live map.</div>'
 }
}
async function stats(){try{const [d,s]=await Promise.all([rpc('bridgepoint_frontend_status_v5000'),rpc('bridgepoint_data_sprint_status_v5106')]);$('landingProperties').textContent=fmt(d.canonical_properties);$('landingBuildings').textContent=fmt(d.map_ready_buildings);$('landingAddresses').textContent=fmt(s.address_rows_estimate||d.unique_addresses);if($('landingBoundaries'))$('landingBoundaries').textContent=fmt(s.stored_boundary_rows_estimate);if($('landingLayouts'))$('landingLayouts').textContent=fmt(d.layout_indexed_buildings);if($('landingParts'))$('landingParts').textContent=fmt(d.materialized_part_geometries);if($('landingTransport'))$('landingTransport').textContent=fmt(d.transport_rows_archived);if($('landingWeatherEvents'))$('landingWeatherEvents').textContent=fmt(d.weather_bootstrap_events)}catch(e){console.warn(e)}}

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
async function globalCoverage(){
 try{
  const [d,g]=await Promise.all([
   rpc('bridgepoint_public_global_coverage_v5601',{},9000),
   rpc('bridgepoint_public_global_status_v957',{},6000).catch(()=>null)
  ]);
  const world=d?.world||{},us=d?.us||{},countries=Array.isArray(world.countries)?world.countries:[],states=Array.isArray(us.states_and_jurisdictions)?us.states_and_jurisdictions:[],queue=Array.isArray(world.expansion_queue)?world.expansion_queue:[],liveCountries=Array.isArray(g?.countries)?g.countries:[];
  const names={AU:'Australia',BR:'Brazil',CA:'Canada',CD:'DR Congo',CL:'Chile',CN:'China',CY:'Cyprus',DE:'Germany',DJ:'Djibouti',EE:'Estonia',EG:'Egypt',GB:'United Kingdom',IN:'India',IS:'Iceland',JP:'Japan',KE:'Kenya',KR:'South Korea',LT:'Lithuania',LV:'Latvia',MX:'Mexico',MY:'Malaysia',NL:'Netherlands',NO:'Norway',NZ:'New Zealand',PA:'Panama',PH:'Philippines',PL:'Poland',RO:'Romania',SG:'Singapore',TW:'Taiwan',TZ:'Tanzania',UA:'Ukraine',VN:'Vietnam'};
  const positiveCountries=liveCountries.some(x=>Number(x.active_canonical)>0)
   ? liveCountries.filter(x=>Number(x.active_canonical)>0).map((x,i)=>({name:bpCountryName(x.country_code,x.country_name||names[x.country_code])+' · '+x.country_code,value:Number(x.active_canonical),color:BP_COVERAGE_COLORS[i%BP_COVERAGE_COLORS.length]}))
   : countries.filter(x=>Number(x.canonical_count)>0).map((x,i)=>({name:bpCountryName(x.code,x.name)+' · '+x.code,value:Number(x.canonical_count),color:BP_COVERAGE_COLORS[i%BP_COVERAGE_COLORS.length]}));
  const countryTotal=positiveCountries.reduce((a,b)=>a+b.value,0);
  const topStates=states.slice(0,10).map((x,i)=>({name:x.code,value:Number(x.count),color:BP_COVERAGE_COLORS[i%BP_COVERAGE_COLORS.length]}));
  const stateAll=states.reduce((a,b)=>a+Number(b.count||0),0),topSum=topStates.reduce((a,b)=>a+b.value,0);
  if(stateAll>topSum)topStates.push({name:'Other U.S. jurisdictions',value:stateAll-topSum,color:BP_COVERAGE_COLORS[topStates.length%BP_COVERAGE_COLORS.length]});
  bpDonut($('globalCountryDonut'),positiveCountries,countryTotal);bpLegend($('globalCountryLegend'),positiveCountries.length?positiveCountries:[{name:'No non-U.S. canonical records published yet',value:0,color:'#27404b'}]);
  bpDonut($('globalStateDonut'),topStates,stateAll);bpLegend($('globalStateLegend'),topStates);
  if($('globalCountryTotal'))$('globalCountryTotal').textContent=fmt(countryTotal);
  if($('globalStateTotal'))$('globalStateTotal').textContent=fmt(stateAll);
  if($('landingGlobalProperties')&&g)$('landingGlobalProperties').textContent=fmt(g.active_global_canonical);
  if($('landingGlobalCountryMix')&&g)$('landingGlobalCountryMix').textContent=liveCountries.filter(x=>Number(x.active_canonical)>0).map(x=>bpCountryName(x.country_code,x.country_name||names[x.country_code])+' '+fmt(x.active_canonical)).join(' · ')+' · '+fmt(g.materialized_global_boundaries)+' boundaries';
  const summary=$('globalCoverageSummary');if(summary){summary.textContent='';[
    ['U.S. canonical properties',fmt(us.canonical_properties||0)],
    ['U.S. stored parcel boundaries',fmt(us.stored_parcel_boundaries_estimate||0)],
    ['Live non-U.S. canonical properties',fmt(g?.active_global_canonical||countryTotal)],
    ['Live non-U.S. materialized boundaries',fmt(g?.materialized_global_boundaries||0)],
    ['Country registry',fmt(world.country_registry_total||0)],
    ['Non-U.S. countries started',fmt(world.non_us_started||0)]
  ].forEach(([k,v])=>{const s=document.createElement('span');s.textContent=k+': '+v;summary.appendChild(s)})}
  const q=$('globalExpansionQueue');if(q){q.textContent='';queue.forEach(x=>{const c=document.createElement('div');c.className='bp-country-chip';const b=document.createElement('b');b.textContent=(x.name||x.code)+' · '+x.code;const s=document.createElement('span');s.textContent=String(x.status||'QUEUED').replaceAll('_',' ');c.append(b,s);q.appendChild(c)});if(!queue.length){const c=document.createElement('div');c.className='bp-country-chip';c.innerHTML='<b>No country queue yet</b><span>LEGAL-GATED</span>';q.appendChild(c)}}
  if($('globalCoverageNotice'))$('globalCoverageNotice').textContent=g?.truth_notice||d.public_notice||'Public-safe operational coverage only.';
  if($('globalCoverageUpdated')){const when=d.updated_at?new Date(d.updated_at):new Date();$('globalCoverageUpdated').textContent='Last updated: '+when.toLocaleString()}
  window.__BP_GLOBAL_COVERAGE__={version:5602,data:d,liveGlobal:g,updatedAt:Date.now()};
 }catch(e){console.warn('BridgePoint global coverage',e);if($('globalCoverageUpdated'))$('globalCoverageUpdated').textContent='Last updated: retrying live coverage…'}
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
 try{
  const d=await rpc('bridgepoint_public_opportunity_summary_v5626',{},7000),families=Array.isArray(d?.families)?d.families:[],states=Array.isArray(d?.states)?d.states:[],positive=states.filter(x=>Number(x.count)>0),maxFamily=Math.max(1,...families.map(x=>Number(x.count)||0)),claims=d?.claims_parity||{};
  if($('landingOpportunityTotal'))$('landingOpportunityTotal').textContent=fmt(d.total_opportunities);
  if($('landingOpportunityTotalHero'))$('landingOpportunityTotalHero').textContent=fmt(d.total_opportunities);
  if($('landingOpportunityHeroStat'))$('landingOpportunityHeroStat').textContent=fmt(d.total_opportunities);
  if($('landingOpportunityProperties'))$('landingOpportunityProperties').textContent=fmt(d.unique_properties);
  if($('landingOpportunityStatesCount'))$('landingOpportunityStatesCount').textContent=fmt(d.states_with_opportunities);
  if($('landingOpportunityClaimsParity'))$('landingOpportunityClaimsParity').textContent=fmt(claims.minimum_met||0)+' / '+fmt(claims.jurisdictions_total||56)+' at minimum source parity';
  const fam=$('landingOpportunityFamilies');
  if(fam){
    fam.textContent='';
    families.forEach(x=>{
      const row=document.createElement('div');row.className='bp-opp-bar-row';
      const color=BP_OPP_COLORS[x.key]||'#62e6ff',width=Math.max(3,100*Number(x.count||0)/maxFamily);
      row.innerHTML='<div class="bp-opp-bar-copy"><span><i style="background:'+color+'"></i>'+esc(x.label||oppFamilyLabel(x.key))+'</span><b>'+fmt(x.count)+'</b></div><div class="bp-opp-track"><i style="width:'+width.toFixed(1)+'%;background:'+color+'"></i></div>';
      fam.appendChild(row);
    });
  }
  const list=$('landingOpportunityStates');
  if(list){
    list.textContent='';
    positive.forEach(s=>{
      const card=document.createElement('article');card.className='bp-opp-state';
      const fs=Object.entries(s.families||{}).filter(([,v])=>Number(v)>0).sort((a,b)=>Number(b[1])-Number(a[1]));
      card.innerHTML='<div class="bp-opp-state-head"><b>'+esc(s.state_code)+'</b><strong>'+fmt(s.count)+'</strong></div><small>'+fmt(s.properties)+' properties · claims parity '+esc(String(s.claims_target_status||'BUILDING').replaceAll('_',' '))+'</small><div class="bp-opp-chips">'+fs.map(([k,v])=>'<span style="--opp:'+esc(BP_OPP_COLORS[k]||'#62e6ff')+'"><i></i>'+esc(oppFamilyLabel(k))+' '+fmt(v)+'</span>').join('')+'</div>';
      list.appendChild(card);
    });
    const zero=states.filter(x=>Number(x.count)===0);
    if(zero.length){
      const details=document.createElement('details');details.className='bp-opp-zero-states';
      details.innerHTML='<summary>VIEW '+fmt(zero.length)+' MORE JURISDICTIONS CURRENTLY AT 0 CUSTOMER-READY OPPORTUNITIES</summary><div>'+zero.map(s=>'<span>'+esc(s.state_code)+' · '+esc(String(s.claims_target_status||'BUILDING').replaceAll('_',' '))+'</span>').join('')+'</div>';
      list.appendChild(details);
    }
  }
  window.__BP_PUBLIC_OPPORTUNITY_SUMMARY_V5626__={version:5626,total:Number(d.total_opportunities||0),properties:Number(d.unique_properties||0),states:Number(d.states_with_opportunities||0),updatedAt:Date.now()};
 }catch(e){console.warn('opportunity summary',e)}
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
 window.BridgePointAcquisition?.send?.('FREE_PROPERTY_LOOKUP',{surface:'landing',query:address,matched:!!(row.property_id||row.global_property_id),country:String(row.country_code||'US')});
}

async function landingSearchSubmit(e){
 e.preventDefault();
 const input=$('landingPropertySearchInput'),box=$('landingPropertySearchResults'),q=input?.value.trim()||'';
 if(q.length<4)return;
 if(freeLookupUsed()){gateLookup('Your first free property lookup has already been used in this browser. Create an account to keep searching and use a 7-day trial where available.');return}
 box.hidden=false;box.innerHTML='<button disabled><b>Searching BridgePoint…</b><small>Matching address, parcel and property identity.</small></button>';
 let rows=[],rawRows=[],recoveryUsed=false,globalUsed=false;
 try{const d=await rpc('bridgepoint_public_search_v5200',{p_query:q,p_limit:6},3200);rawRows=d?.results||[];rows=credibleAddressRows(q,rawRows);if(rawRows.length>rows.length)window.BridgePointAcquisition?.send?.('ADDRESS_SEARCH_WEAK_MATCH_SUPPRESSED',{surface:'landing',suppressed:rawRows.length-rows.length})}catch(_){}
 if(!rows.length){
  try{const d=await rpc('bridgepoint_public_global_search_v957',{p_query:q,p_limit:6},4200);rows=d?.results||[];globalUsed=rows.length>0}catch(_){}
 }
 if(!rows.length){try{const d=await landingAddressFallback(q,7000);rows=d?.results||[];recoveryUsed=rows.length>0;if(recoveryUsed)window.BridgePointAcquisition?.send?.('ADDRESS_SEARCH_RECOVERED',{surface:'landing',resolver:String(d?.resolver||'CENSUS')})}catch(_){}}
 if(!rows.length){window.BridgePointAcquisition?.send?.('ADDRESS_SEARCH_NO_MATCH',{surface:'landing'});box.innerHTML='<button disabled><b>No match yet</b><small>Try a complete street address, cadastral/parcel ID, municipality, or another source-backed location from a live coverage area.</small></button>';return}
 box.innerHTML='';
 rows.slice(0,6).forEach(row=>{
  const b=document.createElement('button');b.type='button';
  const address=row.full_address||row.geocoder_address||row.display_label||'Property / parcel';
  const meta=globalUsed||row.global_property_id?[row.municipality,row.state_code,row.country_code,row.match_reason].filter(Boolean).join(' · '):[row.city,row.state_code||row.state,row.match_type].filter(Boolean).join(' · ');
  b.innerHTML='<b class="notranslate" translate="no">'+esc(address)+'</b><small class="notranslate" translate="no">'+esc(meta||'BridgePoint property match')+'</small>';
  b.addEventListener('click',async()=>{localStorage.setItem(FREE_LOOKUP_KEY,'1');box.hidden=true;await hydrateLandingLookup(row)});
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
 try{stats()}catch(_){}
 try{globalCoverage()}catch(_){}
 try{opportunitySummary()}catch(_){}
 try{if(window.__BP_LANDING_WORLD__)void loadLandingNationalWeather(window.__BP_LANDING_WORLD__,0)}catch(_){}
 try{window.__BP_LANDING_WORLD__?.map?.triggerRepaint?.()}catch(_){}
 window.__BP_LANDING_SOFT_REFRESH__={hardReload:false,lastAt:Date.now()}
});
if(!hashSession()){bind();bindWorldBackdrop();bindConversionPreview();initMap();stats();setInterval(stats,15000);globalCoverage();setInterval(globalCoverage,15000);opportunitySummary();setInterval(opportunitySummary,120000);packages();if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js?v=5592',{updateViaCache:'none'}).catch(()=>{})}
// BP_V5441_DEPLOY_SYNC: compact national hazard dots; radar and boundaries unchanged.