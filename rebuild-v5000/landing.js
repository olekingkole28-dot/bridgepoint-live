const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co',KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25',RPC=SUPA+'/rest/v1/rpc/',AUTH_STORE='bp_auth_v5045';const H={'apikey':KEY,'Content-Type':'application/json','Accept':'application/json'};let mode='signup',installPrompt=null,map=null;const $=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString();async function rpc(n,a={},ms=5000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(RPC+n,{method:'POST',headers:H,body:JSON.stringify(a),signal:c.signal,cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||('HTTP '+r.status));return d}finally{clearTimeout(t)}}function saveSession(d){if(!d?.access_token)return false;if(!d.expires_at&&d.expires_in)d.expires_at=Math.floor(Date.now()/1000)+Number(d.expires_in);localStorage.setItem(AUTH_STORE,JSON.stringify(d));return true}function hashSession(){const h=new URLSearchParams(location.hash.replace(/^#/,''));if(!h.get('access_token'))return false;saveSession({access_token:h.get('access_token'),refresh_token:h.get('refresh_token'),expires_in:h.get('expires_in')});history.replaceState(null,'',location.pathname+location.search);location.replace('/app/');return true}function setMode(v){mode=v==='signin'?'signin':'signup';const s=mode==='signup';$('nameField').hidden=!s;$('authTitle').textContent=s?'Start using BridgePoint':'Welcome back';$('authEyebrow').textContent=s?'CREATE YOUR BRIDGEPOINT ACCOUNT':'SIGN IN TO BRIDGEPOINT';$('authIntro').textContent=s?'Your account connects Saved, package access, Claims and Workflow to the same BridgePoint identity.':'Sign in to continue into your BridgePoint workspace.';$('authSubmit').textContent=s?'CREATE ACCOUNT':'SIGN IN';$('authSwitch').textContent=s?'Already have an account? Sign in':'Need an account? Create one';$('authPassword').autocomplete=s?'new-password':'current-password';$('authMessage').textContent=''}function openAuth(v){setMode(v||'signup');$('authModal').hidden=false;setTimeout(()=>$('authEmail').focus(),50)}async function submit(e){e.preventDefault();const email=$('authEmail').value.trim(),password=$('authPassword').value,name=$('authName').value.trim(),m=$('authMessage'),b=$('authSubmit');b.disabled=true;m.textContent=mode==='signup'?'Creating your BridgePoint account…':'Signing in…';try{const path=mode==='signup'?'signup':'token?grant_type=password',body=mode==='signup'?{email,password,data:{display_name:name||email.split('@')[0],signup_source:'bridgepoint_landing'}}:{email,password};const r=await fetch(SUPA+'/auth/v1/'+path,{method:'POST',headers:H,body:JSON.stringify(body),cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok){window.BridgePointAcquisition?.send?.(mode==='signup'?'SIGNUP_ERROR':'SIGNIN_ERROR',{auth_surface:'landing',http_status:r.status});throw new Error(d.msg||d.message||d.error_description||d.error||('HTTP '+r.status))}const hasSession=saveSession(d);if(mode==='signup'){window.BridgePointAcquisition?.send?.('SIGNUP_SUCCESS',{auth_surface:'landing',session_returned:hasSession,confirmation_required:!hasSession});if(d?.user?.id)window.BridgePointAcquisition?.identify?.(d.user.id,{auth_surface:'landing',signup_source:'bridgepoint_landing'});if(hasSession){m.textContent='Account ready. Opening BridgePoint…';const target=localStorage.getItem('bp_landing_package')?'/app/?page=packages':'/app/';setTimeout(()=>location.assign(target),250)}else m.textContent='Account created. Check your email if confirmation is required, then sign in.'}else{if(!hasSession)throw new Error('No session returned. Please retry.');window.BridgePointAcquisition?.send?.('SIGNIN_SUCCESS',{auth_surface:'landing'});if(d?.user?.id)window.BridgePointAcquisition?.identify?.(d.user.id,{auth_surface:'landing'});m.textContent='Account ready. Opening BridgePoint…';const target=localStorage.getItem('bp_landing_package')?'/app/?page=packages':'/app/';setTimeout(()=>location.assign(target),250)}}catch(err){m.textContent=String(err.message||err)}finally{b.disabled=false}}async function initMap(){
 if(!window.maplibregl)return;
 try{
  const mod=await import('./world-v2300-map.js?v=5371');
  const world=mod.initWorld({
   containerId:'previewMap',
   globalKey:'__bpLandingWorldV5371',
   center:[-73.9857,40.7484],
   zoom:16.35,
   pitch:62,
   bearing:-22,
   projection:'mercator',
   preview:true
  });
  if(!world?.map)throw new Error('Shared BridgePoint world renderer unavailable');
  map=world.map;
  window.__BP_LANDING_WORLD__=world;
  world.onBuildingSelect?.(({feature})=>{
   const p=feature?.properties||{},h=Number(p.render_height_m||p.height_m||p.height||p.render_height||8.5),id=p.building_id||feature?.id||'mapped';
   $('previewTitle').textContent='Building #'+id;
   $('previewMeta').textContent=h.toFixed(1)+' m rendered height · same live BridgePoint World renderer as the app';
   $('previewCard').hidden=false
  });
  map.on('move',()=>{$('previewCard').hidden=true});
  try{const [wm,pm]=await Promise.all([import('./world-v2300-weather.js?v=5365'),import('./world-v2300-present-weather.js?v=5365')]);const weather=wm.initWeather(world.map),present=pm.initPresentWeather(world.map);window.__BP_LANDING_VISUAL_WEATHER__={version:5371,weather,present,mapShared:true,updatedAt:Date.now()}}catch(e){console.warn('BridgePoint preview weather',e)}
  window.__BP_LANDING_RENDERER_PARITY__={sharedModule:true,version:5371,container:'previewMap',sameWorldRendererAsApp:true,sameWeatherEngineAsApp:true,updatedAt:Date.now()}
 }catch(e){
  console.error('BridgePoint shared preview renderer',e);
  const el=$('previewMap');if(el)el.innerHTML='<div style="display:grid;place-items:center;height:100%;padding:24px;text-align:center;color:#a9c0ca;background:#071017">BridgePoint World preview is refreshing. Open the app for the live map.</div>'
 }
}
async function stats(){try{const [d,s]=await Promise.all([rpc('bridgepoint_frontend_status_v5000'),rpc('bridgepoint_data_sprint_status_v5106')]);$('landingProperties').textContent=fmt(d.canonical_properties);$('landingBuildings').textContent=fmt(d.map_ready_buildings);$('landingAddresses').textContent=fmt(s.address_rows_estimate||d.unique_addresses);if($('landingBoundaries'))$('landingBoundaries').textContent=fmt(s.stored_boundary_rows_estimate)}catch(e){console.warn(e)}}function pkg(p){const a=document.createElement('article');a.className='package-card';const top=document.createElement('div');top.className='top';const s=document.createElement('span');s.textContent=String(p.delivery_status||'PACKAGE').replaceAll('_',' ');const pr=document.createElement('b');pr.textContent=Number(p.monthly_price||0)>0?'$'+Number(p.monthly_price).toLocaleString()+'/mo':'Custom';top.append(s,pr);const h=document.createElement('h3');h.textContent=p.package_name||p.package_key;const d=document.createElement('p');d.textContent=p.description||'BridgePoint intelligence access.';const foot=document.createElement('div');foot.className='foot';const sm=document.createElement('small');sm.textContent=(p.trial_days?p.trial_days+' day trial · ':'')+String(p.purchase_mode||'ACCESS').replaceAll('_',' ');const b=document.createElement('button');b.type='button';b.textContent=p.owner_approval_required?'REQUEST ACCESS':'CHOOSE PACKAGE';b.onclick=()=>{localStorage.setItem('bp_landing_package',p.package_key||'');let s=null;try{s=JSON.parse(localStorage.getItem(AUTH_STORE)||'null')}catch(_){}if(s?.access_token)location.assign('/app/?page=packages');else openAuth('signup')};foot.append(sm,b);a.append(top,h,d,foot);return a}async function packages(){const g=$('landingPackages');try{const d=await rpc('bridgepoint_public_package_catalog_v1054',{},6000),rows=(d.packages||[]).filter(p=>!String(p.package_key||'').startsWith('technology_'));g.textContent='';rows.forEach(p=>g.appendChild(pkg(p)));if(!rows.length)g.textContent='Package catalog is updating.'}catch(e){g.textContent='Package catalog retry · '+String(e.message||e)}}
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
async function install(){if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return}alert('Use your browser install or Add to Home Screen option to install BridgePoint on this device.')}function bind(){document.querySelectorAll('.auth-open').forEach(b=>b.onclick=()=>openAuth(b.dataset.mode));$('closeAuth').onclick=()=>$('authModal').hidden=true;$('authModal').onclick=e=>{if(e.target===$('authModal'))$('authModal').hidden=true};$('authSwitch').onclick=()=>setMode(mode==='signup'?'signin':'signup');$('authForm').onsubmit=submit;$('installTop').onclick=install;$('installBottom').onclick=install;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});const q=new URLSearchParams(location.search);if(q.get('auth'))openAuth(q.get('auth')==='signin'?'signin':'signup')}if(!hashSession()){bind();bindConversionPreview();initMap();stats();setInterval(stats,15000);packages();if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{})}