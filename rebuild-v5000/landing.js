const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co',KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25',RPC=SUPA+'/rest/v1/rpc/',AUTH_STORE='bp_auth_v5045';const H={'apikey':KEY,'Content-Type':'application/json','Accept':'application/json'};let mode='signup',installPrompt=null,map=null,landingWeatherTimer=0,landingWeatherRetryTimer=0,backdropFrame=0;const $=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString();async function rpc(n,a={},ms=5000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(RPC+n,{method:'POST',headers:H,body:JSON.stringify(a),signal:c.signal,cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||('HTTP '+r.status));return d}finally{clearTimeout(t)}}function saveSession(d){if(!d?.access_token)return false;if(!d.expires_at&&d.expires_in)d.expires_at=Math.floor(Date.now()/1000)+Number(d.expires_in);localStorage.setItem(AUTH_STORE,JSON.stringify(d));return true}function hashSession(){const h=new URLSearchParams(location.hash.replace(/^#/,''));if(!h.get('access_token'))return false;saveSession({access_token:h.get('access_token'),refresh_token:h.get('refresh_token'),expires_in:h.get('expires_in')});history.replaceState(null,'',location.pathname+location.search);location.replace('/app/');return true}function setMode(v){mode=v==='signin'?'signin':'signup';const s=mode==='signup';$('nameField').hidden=!s;$('authTitle').textContent=s?'Start using BridgePoint':'Welcome back';$('authEyebrow').textContent=s?'CREATE YOUR BRIDGEPOINT ACCOUNT':'SIGN IN TO BRIDGEPOINT';$('authIntro').textContent=s?'Your account connects Saved, package access, Claims and Workflow to the same BridgePoint identity.':'Sign in to continue into your BridgePoint workspace.';$('authSubmit').textContent=s?'CREATE ACCOUNT':'SIGN IN';$('authSwitch').textContent=s?'Already have an account? Sign in':'Need an account? Create one';$('authPassword').autocomplete=s?'new-password':'current-password';$('authMessage').textContent=''}function openAuth(v){setMode(v||'signup');$('authModal').hidden=false;setTimeout(()=>$('authEmail').focus(),50)}async function submit(e){e.preventDefault();const email=$('authEmail').value.trim(),password=$('authPassword').value,name=$('authName').value.trim(),m=$('authMessage'),b=$('authSubmit');b.disabled=true;m.textContent=mode==='signup'?'Creating your BridgePoint account…':'Signing in…';try{const path=mode==='signup'?'signup':'token?grant_type=password',body=mode==='signup'?{email,password,data:{display_name:name||email.split('@')[0],signup_source:'bridgepoint_landing'}}:{email,password};const r=await fetch(SUPA+'/auth/v1/'+path,{method:'POST',headers:H,body:JSON.stringify(body),cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok){window.BridgePointAcquisition?.send?.(mode==='signup'?'SIGNUP_ERROR':'SIGNIN_ERROR',{auth_surface:'landing',http_status:r.status});throw new Error(d.msg||d.message||d.error_description||d.error||('HTTP '+r.status))}const hasSession=saveSession(d);if(mode==='signup'){window.BridgePointAcquisition?.send?.('SIGNUP_SUCCESS',{auth_surface:'landing',session_returned:hasSession,confirmation_required:!hasSession});if(d?.user?.id)window.BridgePointAcquisition?.identify?.(d.user.id,{auth_surface:'landing',signup_source:'bridgepoint_landing'});if(hasSession){m.textContent='Account ready. Opening BridgePoint…';const target=localStorage.getItem('bp_landing_package')?'/app/?page=packages':'/app/';setTimeout(()=>location.assign(target),250)}else m.textContent='Account created. Check your email if confirmation is required, then sign in.'}else{if(!hasSession)throw new Error('No session returned. Please retry.');window.BridgePointAcquisition?.send?.('SIGNIN_SUCCESS',{auth_surface:'landing'});if(d?.user?.id)window.BridgePointAcquisition?.identify?.(d.user.id,{auth_surface:'landing'});m.textContent='Account ready. Opening BridgePoint…';const target=localStorage.getItem('bp_landing_package')?'/app/?page=packages':'/app/';setTimeout(()=>location.assign(target),250)}}catch(err){m.textContent=String(err.message||err)}finally{b.disabled=false}}
function landingWeatherColorExpr(){return['match',['get','type'],'WILDFIRE','#ff744f','FIRE_WEATHER','#ff9c5a','TORNADO','#d596ff','HAIL','#c9efff','LIGHTNING','#ffe16d','FLOOD','#4ca7ff','HURRICANE','#65e6ff','HURRICANE_CONE','#65e6ff','HURRICANE_TRACK','#65e6ff','WIND','#9ad7ff','RAIN','#68b9ff','WEATHER_REPORT','#b9d6df','#9ab8c5']}
function landingWeatherCollections(items){const points=[],shapes=[];for(const item of items||[]){const props={type:item.type||'WEATHER_REPORT',name:item.name||item.type||'Weather event',severity:item.severity||'',certainty:item.certainty||'',urgency:item.urgency||'',observed:item.observed===true,source:item.source||'',observed_at:item.observed_at||'',ends_at:item.ends_at||''},gt=item.geometry?.type||'';if(['Polygon','MultiPolygon','LineString','MultiLineString'].includes(gt)){shapes.push({type:'Feature',properties:props,geometry:item.geometry});continue}const lon=Number(item.lon),lat=Number(item.lat);if(Number.isFinite(lon)&&Number.isFinite(lat))points.push({type:'Feature',properties:props,geometry:{type:'Point',coordinates:[lon,lat]}})}return{points:{type:'FeatureCollection',features:points},shapes:{type:'FeatureCollection',features:shapes}}}
function ensureLandingWeatherLegend(){let root=$('landingWeatherLegend');if(root)return root;root=document.createElement('div');root.id='landingWeatherLegend';root.className='landing-weather-legend';root.innerHTML='<div class="landing-weather-head"><b>LIVE WEATHER + HAZARDS</b><span><span id="landingWeatherCount">CHECKING</span> <button id="landingWeatherToggle" type="button" aria-expanded="false">MORE</button></span></div><div class="landing-weather-items"><span><i style="color:#ff744f;background:#ff744f"></i>Wildfire</span><span><i style="color:#ffe16d;background:#ffe16d"></i>Lightning</span><span><i style="color:#4ca7ff;background:#4ca7ff"></i>Flood</span><span><i style="color:#d596ff;background:#d596ff"></i>Tornado</span><span><i style="color:#65e6ff;background:#65e6ff"></i>Hurricane</span></div><div id="landingWeatherMore" class="landing-weather-more" hidden><div class="landing-weather-grid"><span style="color:#4ca7ff">▰ Flood watch / advisory / warning area</span><span style="color:#d596ff">▰ Tornado watch / warning polygon</span><span style="color:#9ad7ff">▰ Wind / severe-weather area</span><span style="color:#c9efff">▰ Hail outlook / radar-indicated storm</span><span style="color:#65e6ff">━ Hurricane cone / track</span><span style="color:#ff9c5a">● Fire-weather / wildfire context</span><span style="color:#68b9ff">━ NOAA radar precipitation</span><span style="color:#b9d6df">● Source weather report / observation</span></div><small>Area fills + outlines = alert/watch/warning or forecast geometry. Dots = event locations. Strong/solid = observed/source event; faded = alert or forecast. Radar reflectivity is weather context, not proof of property damage.</small></div><small id="landingWeatherTime">Loading fresh public source context…</small>';document.querySelector('.preview')?.appendChild(root);const t=$('landingWeatherToggle'),m=$('landingWeatherMore');if(t&&m)t.onclick=e=>{e.stopPropagation();const open=m.hidden;m.hidden=!open;root.classList.toggle('expanded',open);t.textContent=open?'LESS':'MORE';t.setAttribute('aria-expanded',String(open))};return root}
function landingWeatherPopup(m,e){const f=e.features?.[0];if(!f)return;const p=f.properties||{},wrap=document.createElement('div');wrap.style.cssText='min-width:200px;max-width:280px;font-family:Inter,system-ui,sans-serif;color:#071118';const title=document.createElement('b');title.style.cssText='display:block;font-size:13px';title.textContent=p.name||p.type||'Live weather';const meta=document.createElement('div');meta.style.cssText='margin-top:5px;font-size:10px;line-height:1.45;color:#415661';meta.textContent=[p.type?String(p.type).replaceAll('_',' '):'',p.severity||'',p.source||''].filter(Boolean).join(' · ');wrap.append(title,meta);new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'310px'}).setLngLat(e.lngLat).setDOMContent(wrap).addTo(m)}
function installLandingNationalWeather(world){const m=world?.map;if(!m)return;const empty={type:'FeatureCollection',features:[]},install=()=>{try{if(!m.getSource('bpLandingWeatherPoints'))m.addSource('bpLandingWeatherPoints',{type:'geojson',data:empty});if(!m.getSource('bpLandingWeatherShapes'))m.addSource('bpLandingWeatherShapes',{type:'geojson',data:empty});if(!m.getLayer('bp-landing-weather-fill'))m.addLayer({id:'bp-landing-weather-fill',type:'fill',source:'bpLandingWeatherShapes',minzoom:0,filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':landingWeatherColorExpr(),'fill-opacity':['case',['==',['get','observed'],true],.18,.10]}});if(!m.getLayer('bp-landing-weather-line'))m.addLayer({id:'bp-landing-weather-line',type:'line',source:'bpLandingWeatherShapes',minzoom:0,paint:{'line-color':landingWeatherColorExpr(),'line-width':['interpolate',['linear'],['zoom'],0,1.1,2.2,1.5,4,2,8,3,14,4.5],'line-opacity':['case',['==',['get','observed'],true],.94,.72]}});if(!m.getLayer('bp-landing-weather-glow'))m.addLayer({id:'bp-landing-weather-glow',type:'circle',source:'bpLandingWeatherPoints',minzoom:0,paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,3.5,2.2,5.5,4.5,7,9,10,14,14],'circle-color':landingWeatherColorExpr(),'circle-opacity':['case',['==',['get','observed'],true],.25,.15],'circle-blur':.78}});if(!m.getLayer('bp-landing-weather-points'))m.addLayer({id:'bp-landing-weather-points',type:'circle',source:'bpLandingWeatherPoints',minzoom:0,paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,1.8,2.2,2.8,4.5,3.4,9,4.8,14,7],'circle-color':landingWeatherColorExpr(),'circle-opacity':['case',['==',['get','observed'],true],.96,.72],'circle-stroke-color':'#eefcff','circle-stroke-width':['interpolate',['linear'],['zoom'],0,.45,4.5,.7,12,1.2],'circle-stroke-opacity':.88}});if(!m.__bpLandingWeatherBound){m.__bpLandingWeatherBound=true;for(const id of ['bp-landing-weather-points','bp-landing-weather-fill','bp-landing-weather-line']){m.on('click',id,e=>landingWeatherPopup(m,e));m.on('mouseenter',id,()=>m.getCanvas().style.cursor='pointer');m.on('mouseleave',id,()=>{m.getCanvas().style.cursor=''})}}}catch(e){console.warn('Landing national weather install',e)}};ensureLandingWeatherLegend();if(m.loaded()||m.isStyleLoaded?.())install();else m.once('load',install)}
async function loadLandingNationalWeather(world,attempt=0){
 const m=world?.map;if(!m)return false;
 try{
  const d=await rpc('bridgepoint_public_weather_bootstrap_v5004',{},12000);
  if(d?.fresh!==true){
   if($('landingWeatherCount'))$('landingWeatherCount').textContent='REFRESHING';
   if($('landingWeatherTime'))$('landingWeatherTime').textContent='Public weather cache is refreshing · preserving the last visible layer.';
   if(attempt<4){clearTimeout(landingWeatherRetryTimer);landingWeatherRetryTimer=setTimeout(()=>loadLandingNationalWeather(world,attempt+1),Math.min(9000,2200*(attempt+1)))}
   return false
  }
  const wx=landingWeatherCollections(d.items||[]);
  m.getSource('bpLandingWeatherPoints')?.setData(wx.points);
  m.getSource('bpLandingWeatherShapes')?.setData(wx.shapes);
  for(const id of ['bp-landing-weather-fill','bp-landing-weather-line','bp-landing-weather-glow','bp-landing-weather-points'])try{if(m.getLayer(id))m.setLayoutProperty(id,'visibility','visible')}catch(_){}
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
 installLandingNationalWeather(world);
 await loadLandingNationalWeather(world,0);
 clearInterval(landingWeatherTimer);
 landingWeatherTimer=setInterval(()=>loadLandingNationalWeather(world,0),60000)
}
async function initMap(){
 if(!window.maplibregl)return;
 try{
  const mod=await import('./world-v2300-map.js?v=5420');
  const world=mod.initWorld({
   containerId:'previewMap',
   globalKey:'__bpLandingWorldV5420',
   center:[-98.5,39.5],
   zoom:window.innerWidth<=620?2.55:3.15,
   pitch:0,
   bearing:0,
   projection:'mercator',
   preview:true
  });
  if(!world?.map)throw new Error('Shared BridgePoint world renderer unavailable');
  map=world.map;
  try{
   const nationalBounds=[[-125.2,24.1],[-66.4,49.8]];
   const padding=window.innerWidth<=620?{top:10,right:8,bottom:10,left:8}:{top:22,right:22,bottom:22,left:22};
   map.fitBounds(nationalBounds,{padding,duration:0,maxZoom:3.65});
   map.setPitch?.(0);map.setBearing?.(0);
   window.__BP_LANDING_NATIONAL_START__={bounds:nationalBounds,fit:true,at:Date.now()}
  }catch(_){};
  world.onBuildingSelect?.(({feature})=>{
   const p=feature?.properties||{},h=Number(p.render_height_m||p.height_m||p.height||p.render_height||8.5),id=p.building_id||feature?.id||'mapped';
   $('previewTitle').textContent='Building #'+id;
   $('previewMeta').textContent=h.toFixed(1)+' m rendered height · same live BridgePoint World renderer as the app';
   $('previewCard').hidden=false
  });
  map.on('move',()=>{$('previewCard').hidden=true});
  try{
   if(!map.isStyleLoaded?.())await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve()};map.once?.('load',finish);setTimeout(finish,5000)});
   const [wm,pm]=await Promise.all([import('./world-v2300-weather.js?v=5430'),import('./world-v2300-present-weather.js?v=5430')]);
   const weather=wm.initWeather(world.map),present=pm.initPresentWeather(world.map);
   weather?.setActive?.(true);weather?.setRadar?.(true);await startLandingNationalWeather(world);
   window.__BP_LANDING_VISUAL_WEATHER__={version:5430,weather,present,mapShared:true,nationalWeather:true,radarVisible:true,radarAnimated:true,updatedAt:Date.now()}
  }catch(e){console.warn('BridgePoint preview weather',e)}
  window.__BP_LANDING_WORLD__=world;
  window.__BP_LANDING_RENDERER_PARITY__={sharedModule:true,version:5430,container:'previewMap',sameWorldRendererAsApp:true,sameWeatherEngineAsApp:true,updatedAt:Date.now()}
 }catch(e){
  console.error('BridgePoint shared preview renderer',e);
  const el=$('previewMap');if(el)el.innerHTML='<div style="display:grid;place-items:center;height:100%;padding:24px;text-align:center;color:#a9c0ca;background:#071017">BridgePoint World preview is refreshing. Open the app for the live map.</div>'
 }
}
async function stats(){try{const [d,s]=await Promise.all([rpc('bridgepoint_frontend_status_v5000'),rpc('bridgepoint_data_sprint_status_v5106')]);$('landingProperties').textContent=fmt(d.canonical_properties);$('landingBuildings').textContent=fmt(d.map_ready_buildings);$('landingAddresses').textContent=fmt(s.address_rows_estimate||d.unique_addresses);if($('landingBoundaries'))$('landingBoundaries').textContent=fmt(s.stored_boundary_rows_estimate);if($('landingLayouts'))$('landingLayouts').textContent=fmt(d.layout_indexed_buildings);if($('landingParts'))$('landingParts').textContent=fmt(d.materialized_part_geometries);if($('landingTransport'))$('landingTransport').textContent=fmt(d.transport_rows_archived);if($('landingWeatherEvents'))$('landingWeatherEvents').textContent=fmt(d.weather_bootstrap_events)}catch(e){console.warn(e)}}
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
function freeLookupUsed(){return localStorage.getItem(FREE_LOOKUP_KEY)==='1'}
function gateLookup(message){
 const box=$('landingPropertySearchResults');
 if(box){box.hidden=false;box.innerHTML='<button type="button" data-gate-lookup><b>Continue with BridgePoint</b><small>'+esc(message||'Your free property lookup has been used. Create an account to continue and unlock package intelligence.')+'</small></button>';box.querySelector('[data-gate-lookup]')?.addEventListener('click',()=>openAuth('signup'))}
}
async function hydrateLandingLookup(row){
 const lng=Number(row.longitude),lat=Number(row.latitude),address=row.full_address||row.geocoder_address||'Selected property';
 if(Number.isFinite(lng)&&Number.isFinite(lat)&&map){map.easeTo({center:[lng,lat],zoom:17,pitch:62,bearing:-18,duration:850})}
 $('previewTitle').textContent=address;
 $('previewMeta').textContent='Loading public property + structure truth…';
 $('previewType').textContent=row.match_type||'Address match';
 $('previewRoof').textContent='Checking source-backed roof context';
 $('previewCard').hidden=false;
 try{
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
 }catch(err){
  $('previewMeta').textContent='Address resolved on the live map. Deeper building enrichment will retry in the full app.';
  $('previewRoof').textContent='Package-gated roof intelligence';
 }
 window.BridgePointAcquisition?.send?.('FREE_PROPERTY_LOOKUP',{surface:'landing',query:address,matched:!!row.property_id});
}
async function landingSearchSubmit(e){
 e.preventDefault();
 const input=$('landingPropertySearchInput'),box=$('landingPropertySearchResults'),q=input?.value.trim()||'';
 if(q.length<4)return;
 if(freeLookupUsed()){gateLookup('Your first free property lookup has already been used in this browser. Create an account to keep searching and use a 7-day trial where available.');return}
 box.hidden=false;box.innerHTML='<button disabled><b>Searching BridgePoint…</b><small>Matching address and property identity.</small></button>';
 let rows=[];
 try{const d=await rpc('bridgepoint_public_search_v5200',{p_query:q,p_limit:6},3200);rows=d?.results||[]}catch(_){}
 if(!rows.length){try{const d=await landingAddressFallback(q,7000);rows=d?.results||[]}catch(_){}}
 if(!rows.length){box.innerHTML='<button disabled><b>No match yet</b><small>Try a fuller street address, city and state.</small></button>';return}
 box.innerHTML='';
 rows.slice(0,6).forEach(row=>{
  const b=document.createElement('button');b.type='button';
  const address=row.full_address||row.geocoder_address||'Address';
  const meta=[row.city,row.state_code||row.state,row.match_type].filter(Boolean).join(' · ');
  b.innerHTML='<b>'+esc(address)+'</b><small>'+esc(meta||'BridgePoint address match')+'</small>';
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
function bind(){document.querySelectorAll('.auth-open').forEach(b=>b.onclick=()=>openAuth(b.dataset.mode));$('closeAuth').onclick=()=>$('authModal').hidden=true;$('authModal').onclick=e=>{if(e.target===$('authModal'))$('authModal').hidden=true};$('authSwitch').onclick=()=>setMode(mode==='signup'?'signin':'signup');$('authForm').onsubmit=submit;$('installTop').onclick=install;$('installBottom').onclick=install;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});const q=new URLSearchParams(location.search);if(q.get('auth'))openAuth(q.get('auth')==='signin'?'signin':'signup')}if(!hashSession()){bind();bindWorldBackdrop();bindConversionPreview();initMap();stats();setInterval(stats,15000);packages();if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{})}
// BP_V5430_DEPLOY_SYNC: adaptive landing + persistent national weather + exact package entitlements.
