const TOOL_VERSION=5500;
const EMPTY={type:'FeatureCollection',features:[]};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString();
function sessionKey(){
  let k=localStorage.getItem('bp_public_tools_session_v5500');
  if(!k){k=crypto.randomUUID();localStorage.setItem('bp_public_tools_session_v5500',k)}
  return k
}
function addStyle(){
 if(document.getElementById('bpIntelligenceToolsV5500Css'))return;
 const s=document.createElement('style');s.id='bpIntelligenceToolsV5500Css';s.textContent=`
 .bp-tools5500{position:absolute;z-index:23;right:10px;top:132px;display:grid;gap:5px;pointer-events:auto;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
 .bp-tools5500 button{width:78px;min-height:34px;border:1px solid rgba(255,255,255,.10);border-radius:8px;background:rgba(3,11,14,.90);backdrop-filter:blur(11px);color:#b7ccd3;font:900 7px/1.15 system-ui;letter-spacing:.06em;cursor:pointer}
 .bp-tools5500 button.active{background:#62e6ff;color:#061015;border-color:#62e6ff}.bp-tools5500 button.pending{color:#f3ca69;border-color:rgba(243,202,105,.32)}
 .bp-toolpanel5500{position:absolute;z-index:24;right:98px;top:82px;width:min(390px,calc(100vw - 118px));max-height:calc(100vh - 155px);overflow:auto;padding:12px;border:1px solid rgba(98,230,255,.18);border-radius:14px;background:rgba(2,9,13,.95);backdrop-filter:blur(18px);box-shadow:0 20px 56px rgba(0,0,0,.42);color:#dff9ff;font:700 10px/1.45 system-ui;pointer-events:auto}
 .bp-toolpanel5500[hidden]{display:none!important}.bp-toolpanel5500 header{display:flex;align-items:center;gap:8px;position:sticky;top:-12px;background:rgba(2,9,13,.98);padding:8px 0;z-index:2}.bp-toolpanel5500 header b{color:#62e6ff;letter-spacing:.12em}.bp-toolpanel5500 header button{margin-left:auto;border:0;background:transparent;color:#9fb2ba;font-size:18px;cursor:pointer}
 .bp-toolpanel5500 h3{margin:12px 0 5px;font-size:12px}.bp-toolpanel5500 p,.bp-toolpanel5500 small{color:#8fa5ae}.bp-toolpanel5500 .grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.bp-toolpanel5500 .card{padding:9px;border:1px solid rgba(255,255,255,.07);border-radius:9px;background:rgba(255,255,255,.025)}.bp-toolpanel5500 .card b{display:block;color:#e8fbff}.bp-toolpanel5500 .card small{display:block;margin-top:3px}
 .bp-toolpanel5500 select,.bp-toolpanel5500 input{width:100%;box-sizing:border-box;padding:8px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#061116;color:#e7fbff}.bp-toolpanel5500 .action{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.bp-toolpanel5500 .action button{padding:8px 10px;border:1px solid rgba(98,230,255,.25);border-radius:8px;background:rgba(98,230,255,.08);color:#dff9ff;font-weight:900;cursor:pointer}
 .bp-toolstatus5500{position:absolute;z-index:22;right:10px;bottom:154px;max-width:min(420px,calc(100vw - 20px));padding:6px 9px;border-radius:8px;background:rgba(2,8,12,.84);border:1px solid rgba(255,255,255,.06);color:#94a9b1;font:800 7px system-ui;pointer-events:none}.bp-toolstatus5500 b{color:#62e6ff}
 .bp-sim-badge5500{position:absolute;z-index:22;left:50%;top:82px;transform:translateX(-50%);padding:7px 12px;border-radius:999px;background:rgba(126,40,31,.9);border:1px solid rgba(255,125,92,.55);color:#ffe3db;font:950 8px system-ui;letter-spacing:.09em;pointer-events:none}.bp-sim-badge5500[hidden]{display:none}
 .bp-flight-hud5500{position:absolute;z-index:25;left:50%;bottom:154px;transform:translateX(-50%);display:flex;gap:10px;padding:8px 11px;border-radius:10px;background:rgba(1,8,10,.8);border:1px solid rgba(98,230,255,.16);color:#ccebf2;font:850 8px system-ui;pointer-events:none}.bp-flight-hud5500[hidden]{display:none}
 .bp-qrstage{display:grid;place-items:center;min-height:290px;perspective:700px}.bp-qrflat,.bp-qrhouse{grid-area:1/1;width:220px;height:220px;transition:opacity .6s}.bp-qrflat{animation:bpQrFlat 8s infinite}.bp-qrhouse{position:relative;transform-style:preserve-3d;animation:bpQrHouse 8s infinite}.bp-qrhouse .wall{position:absolute;inset:35px;background-size:cover;background-position:center;image-rendering:pixelated;border:2px solid #89f4ff;box-shadow:0 0 24px rgba(98,230,255,.18)}.bp-qrhouse .front{transform:translateZ(65px)}.bp-qrhouse .side{transform:rotateY(90deg) translateZ(65px)}.bp-qrhouse .roof{clip-path:polygon(50% 0,100% 100%,0 100%);transform:translateY(-60px) rotateX(48deg) translateZ(25px);transform-origin:bottom}.bp-qrhouse{transform:rotateX(-8deg) rotateY(24deg)}
 @keyframes bpQrFlat{0%,38%,100%{opacity:1;transform:scale(1)}48%,88%{opacity:0;transform:scale(.72)}}@keyframes bpQrHouse{0%,38%,100%{opacity:0;transform:rotateX(-8deg) rotateY(24deg) scale(.65)}52%,86%{opacity:1;transform:rotateX(-8deg) rotateY(384deg) scale(1)}}
 .bp-night5500 .maplibregl-canvas{filter:brightness(.48) saturate(.75) hue-rotate(8deg)}
 @media(max-width:760px){.bp-tools5500{right:7px;top:116px}.bp-tools5500 button{width:62px;min-height:30px;font-size:6px}.bp-toolpanel5500{right:76px;top:68px;width:calc(100vw - 88px);max-height:62vh}.bp-toolstatus5500{bottom:132px}.bp-flight-hud5500{bottom:130px}.bp-toolpanel5500 .grid{grid-template-columns:1fr}}
 `;document.head.appendChild(s)
}
function polygonCenter(g){
 const ring=g?.type==='Polygon'?g.coordinates?.[0]:g?.type==='MultiPolygon'?g.coordinates?.[0]?.[0]:null;if(!ring?.length)return null;
 let x=0,y=0,n=0;for(const p of ring){if(Number.isFinite(+p[0])&&Number.isFinite(+p[1])){x+=+p[0];y+=+p[1];n++}}return n?[x/n,y/n]:null
}
function circle(lon,lat,radiusKm,steps=64){
 const out=[];for(let i=0;i<=steps;i++){const a=i/steps*Math.PI*2,dy=Math.sin(a)*radiusKm/110.54,dx=Math.cos(a)*radiusKm/(111.32*Math.max(.15,Math.cos(lat*Math.PI/180)));out.push([lon+dx,lat+dy])}return out
}
function makeSource(map,id){if(!map.getSource(id))map.addSource(id,{type:'geojson',data:EMPTY});return map.getSource(id)}
function ensureLayer(map,def,before){try{if(!map.getLayer(def.id))map.addLayer(def,before);return true}catch{return false}}
export function initIntelligenceTools({map,rpc,weather,mode='app'}={}){
 if(!map||typeof rpc!=='function')return null;if(window.__BP_INTELLIGENCE_TOOLS_V5500)return window.__BP_INTELLIGENCE_TOOLS_V5500;
 addStyle();const surface=document.querySelector('.map-surface')||map.getContainer().parentElement;
 const state={mode,session:sessionKey(),globe:false,global:false,liveDomains:new Set(),selectedBuilding:null,flight:null,driveNight:false,sourceCaps:null,globalCache:null,globalFetchedAt:0,liveEntityRows:[],ride:null};
 const rail=document.createElement('div');rail.className='bp-tools5500';
 const tools=[
  ['globe','GLOBE'],['timemap','TIME'],['global','GLOBAL'],['flight','FLIGHT'],['drive','DRIVE'],
  ['sky','SKY'],['transport','TRANSIT'],['cameras','CAMS'],['scenario','SIM'],['wind','WIND'],['qr','QR']
 ];
 rail.innerHTML=tools.map(([k,l])=>'<button data-tool="'+k+'">'+l+'</button>').join('');surface.appendChild(rail);
 const panel=document.createElement('aside');panel.className='bp-toolpanel5500';panel.hidden=true;panel.innerHTML='<header><b data-title>BRIDGEPOINT TOOLS</b><button data-close>×</button></header><div data-body></div>';surface.appendChild(panel);
 const status=document.createElement('div');status.className='bp-toolstatus5500';status.innerHTML='<b>TOOLS READY</b> · heavy live layers are off by default';surface.appendChild(status);
 const simBadge=document.createElement('div');simBadge.className='bp-sim-badge5500';simBadge.hidden=true;simBadge.textContent='SIMULATION · NOT A FORECAST';surface.appendChild(simBadge);
 const flightHud=document.createElement('div');flightHud.className='bp-flight-hud5500';flightHud.hidden=true;surface.appendChild(flightHud);
 const btn=k=>rail.querySelector('[data-tool="'+k+'"]'),body=()=>panel.querySelector('[data-body]');
 const say=t=>{status.innerHTML='<b>BRIDGEPOINT</b> · '+esc(t)};
 async function allow(tool){
  try{const q=await rpc('bridgepoint_intelligence_public_tool_allow_v5500',{p_session_key:state.session,p_tool_key:tool,p_surface:mode==='public'?'PUBLIC_WEB':'APP'},5000);if(q?.allowed===false){say(tool+' free limit reached · sign in/package access required');return false}if(q?.remaining!=null&&q.remaining<5)say(tool+' · '+q.remaining+' free uses remaining');return true}catch{return mode!=='public'}
 }
 async function caps(){if(state.sourceCaps)return state.sourceCaps;try{state.sourceCaps=await rpc('bridgepoint_intelligence_live_capabilities_v5500',{},5000)}catch{state.sourceCaps={enabled:[],pending:[]}}return state.sourceCaps}
 function show(title,html){panel.hidden=false;panel.querySelector('[data-title]').textContent=title;body().innerHTML=html}
 function clearLayer(id){try{const s=map.getSource(id);if(s?.setData)s.setData(EMPTY)}catch{}}
 function toggleGlobe(){
  try{state.globe=!state.globe;map.setProjection?.({type:state.globe?'globe':'mercator'});btn('globe').classList.toggle('active',state.globe);say(state.globe?'Globe projection · existing layers preserved':'Mercator projection');return true}catch(e){state.globe=false;say('Globe unavailable on this renderer · Mercator preserved');return false}
 }
 function ensureGlobal(){
  makeSource(map,'bpGlobalHazardsV5500');
  ensureLayer(map,{id:'bp-global-hazard-glow',type:'circle',source:'bpGlobalHazardsV5500',paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,2,5,4,10,9],'circle-color':['match',['get','domain'],'EARTHQUAKE','#ffb25d','VOLCANO','#ff704e','WILDFIRE','#ff8d45','SEVERE_WEATHER','#66c8ff','#b6d9e7'],'circle-opacity':.22,'circle-blur':.65}});
  ensureLayer(map,{id:'bp-global-hazard-point',type:'circle',source:'bpGlobalHazardsV5500',paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,1,5,2.5,10,5.5],'circle-color':['match',['get','domain'],'EARTHQUAKE','#ffb25d','VOLCANO','#ff704e','WILDFIRE','#ff8d45','SEVERE_WEATHER','#66c8ff','#b6d9e7'],'circle-opacity':.9,'circle-stroke-width':.5,'circle-stroke-color':'#f6ffff'}});
 }
 async function globalHazards(){
  if(!(await allow('GLOBAL')))return;if(state.global){state.global=false;btn('global').classList.remove('active');clearLayer('bpGlobalHazardsV5500');say('Global hazard layer off');return}
  ensureGlobal();say('Loading approved global government hazard feeds…');let features=[];
  try{
   const [eq,eo]=await Promise.all([
    fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',{cache:'no-store'}).then(r=>r.ok?r.json():EMPTY),
    fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=250',{cache:'no-store'}).then(r=>r.ok?r.json():({events:[]}))
   ]);
   for(const f of eq.features||[]){if(f?.geometry?.type!=='Point')continue;features.push({type:'Feature',geometry:f.geometry,properties:{domain:'EARTHQUAKE',name:f.properties?.place||'Earthquake',magnitude:f.properties?.mag,source:'USGS',observed_at:f.properties?.time||0}})}
   for(const e of eo.events||[]){const cat=String(e.categories?.[0]?.title||'GLOBAL_HAZARD').toUpperCase(),g=[...(e.geometry||[])].reverse().find(x=>x?.coordinates?.length>=2);if(!g||g.type!=='Point')continue;const domain=/VOLCANO/.test(cat)?'VOLCANO':/WILD|FIRE/.test(cat)?'WILDFIRE':/STORM|FLOOD|ICE|SNOW/.test(cat)?'SEVERE_WEATHER':'GLOBAL_HAZARD';features.push({type:'Feature',geometry:{type:'Point',coordinates:g.coordinates.slice(0,2)},properties:{domain,name:e.title||cat,source:'NASA EONET',observed_at:g.date||''}})}
  }catch(e){say('Global feed retry · '+String(e?.message||e))}
  map.getSource('bpGlobalHazardsV5500')?.setData({type:'FeatureCollection',features});state.global=true;btn('global').classList.add('active');say('Global hazards · '+features.length+' approved-source events');
 }
 async function liveEntities(domain,tool){
  if(!(await allow(tool)))return;const c=await caps(),enabled=(c.enabled||[]).filter(x=>x.domain===domain);
  const b=map.getBounds();let d={entities:[]};try{d=await rpc('bridgepoint_intelligence_live_entities_v5500',{p_domain:domain,p_min_lat:b.getSouth(),p_max_lat:b.getNorth(),p_min_lng:b.getWest(),p_max_lng:b.getEast(),p_limit:mode==='public'?250:800},6000)}catch{}
  const rows=d.entities||[];state.liveEntityRows=rows;const source='bpLiveEntitiesV5500';makeSource(map,source).setData({type:'FeatureCollection',features:rows.map(x=>({type:'Feature',geometry:{type:'Point',coordinates:[+x.lon,+x.lat]},properties:{...x,metadata:JSON.stringify(x.metadata||{})}}))});
  ensureLayer(map,{id:'bp-live-entities-v5500',type:'symbol',source,layout:{'icon-image':['case',['==',['get','domain'],'AVIATION'],'airport-15',['==',['get','domain'],'SATELLITES'],'rocket-15','circle-11'],'icon-size':1.1,'icon-allow-overlap':true,'text-field':['coalesce',['get','display_name'],''],'text-size':9,'text-offset':[0,1.2],'text-optional':true},paint:{'text-color':'#dff9ff','text-halo-color':'#071016','text-halo-width':1}});
  if(!map.__bpLiveEntityClick){map.__bpLiveEntityClick=true;map.on('click','bp-live-entities-v5500',e=>{const p=e.features?.[0]?.properties;if(!p)return;show('LIVE ENTITY','<div class="card"><b>'+esc(p.display_name||p.entity_key)+'</b><small>'+esc(p.domain)+' · '+esc(p.entity_type)+' · '+esc(p.source_key)+'</small><small>ALT '+esc(p.altitude_m||'—')+' m · SPEED '+esc(p.speed_mps||'—')+' m/s · HDG '+esc(p.heading_deg||'—')+'</small></div><div class="action"><button data-ride="'+esc(p.entity_key)+'">RIDE ALONG</button></div><p>Ride-along is a BridgePoint rendering from telemetry, not an onboard camera.</p>')})}
  const pending=(c.pending||[]).filter(x=>x.domain===domain);
  if(!rows.length)show(domain+' STATUS','<p>No approved live entities are currently available in this viewport.</p>'+enabled.map(x=>'<div class="card"><b>'+esc(x.provider)+'</b><small>ENABLED · '+esc(x.source_key)+'</small></div>').join('')+pending.map(x=>'<div class="card"><b>'+esc(x.provider)+'</b><small>'+esc(x.status)+' · '+esc(x.notes||'')</small></div>').join(''));
  say(domain+' · '+rows.length+' live approved entities');return rows
 }
 function rideEntity(key){
  const row=state.liveEntityRows.find(x=>String(x.entity_key)===String(key));if(!row)return;state.ride=row;map.easeTo({center:[+row.lon,+row.lat],zoom:15,pitch:78,bearing:Number(row.heading_deg||0),duration:700});say('Ride-along · '+(row.display_name||row.entity_key)+' · rendered from telemetry')
 }
 function scenarioPanel(){
  show('WEATHER / HAZARD SIMULATION','<p>Choose a scenario. This visualizes a hypothetical event around the current map center; it is <b>not a forecast or engineering determination.</b></p><label>EVENT<select id="bpSimType"><option>HURRICANE</option><option>TORNADO</option><option>FLOOD</option><option>WILDFIRE</option><option>VOLCANO</option><option>EARTHQUAKE</option><option>HAIL</option><option>SNOW</option><option>WIND</option></select></label><label>INTENSITY<input id="bpSimIntensity" type="range" min="1" max="5" value="3"></label><div class="action"><button data-run-sim>RUN AT MAP CENTER</button><button data-clear-sim>CLEAR</button></div>');
 }
 async function runScenario(){
  if(!(await allow('SCENARIO')))return;const center=map.getCenter(),type=document.getElementById('bpSimType')?.value||'HURRICANE',level=Number(document.getElementById('bpSimIntensity')?.value||3);
  try{await rpc('bridgepoint_intelligence_record_simulation_v5500',{p_session_key:state.session,p_simulation_type:type,p_lat:center.lat,p_lon:center.lng,p_parameters:{intensity:level,client:'v5500'}},5000)}catch{}
  const radius={HURRICANE:60,TORNADO:8,FLOOD:12,WILDFIRE:18,VOLCANO:45,EARTHQUAKE:80,HAIL:20,SNOW:40,WIND:55}[type]*(.5+level*.25),rings=[];
  for(let i=1;i<=4;i++)rings.push({type:'Feature',geometry:{type:'Polygon',coordinates:[circle(center.lng,center.lat,radius*i/4)]},properties:{type,band:i,intensity:level}});
  makeSource(map,'bpScenarioV5500').setData({type:'FeatureCollection',features:rings});
  ensureLayer(map,{id:'bp-sim-fill-v5500',type:'fill',source:'bpScenarioV5500',paint:{'fill-color':['match',['get','type'],'HURRICANE','#4acde8','TORNADO','#cb72ff','FLOOD','#4f9cff','WILDFIRE','#ff713d','VOLCANO','#b85b42','EARTHQUAKE','#ffb154','HAIL','#d6efff','SNOW','#e9f7ff','WIND','#8dd7ff','#ff7350'],'fill-opacity':['interpolate',['linear'],['get','band'],1,.10,4,.025]}});
  ensureLayer(map,{id:'bp-sim-line-v5500',type:'line',source:'bpScenarioV5500',paint:{'line-color':'#ffb48d','line-width':['interpolate',['linear'],['zoom'],3,1.5,15,4],'line-opacity':.72}});
  simBadge.hidden=false;say(type+' simulation · intensity '+level+' · '+Math.round(radius)+' km outer radius')
 }
 function flightStart(){
  if(state.flight){state.flight.active=false;state.flight=null;flightHud.hidden=true;btn('flight').classList.remove('active');say('Flight simulator off');return}
  allow('FLIGHT_SIM').then(ok=>{if(!ok)return;const c=map.getCenter();state.flight={active:true,lon:c.lng,lat:c.lat,alt:900,speed:85,bearing:map.getBearing(),pitch:0,keys:new Set(),last:performance.now()};btn('flight').classList.add('active');flightHud.hidden=false;say('Flight simulator · WASD steer · arrows climb/descend · controller supported');requestAnimationFrame(flightFrame)})
 }
 function flightFrame(now){
  const f=state.flight;if(!f?.active)return;const dt=Math.min(.05,(now-f.last)/1000);f.last=now;const gp=navigator.getGamepads?.()?.[0],axisX=gp?.axes?.[0]||0,axisY=gp?.axes?.[1]||0;
  if(f.keys.has('KeyA'))f.bearing-=48*dt;if(f.keys.has('KeyD'))f.bearing+=48*dt;f.bearing+=axisX*48*dt;
  if(f.keys.has('KeyW'))f.speed=Math.min(260,f.speed+30*dt);if(f.keys.has('KeyS'))f.speed=Math.max(20,f.speed-30*dt);
  const climb=(f.keys.has('ArrowUp')?1:0)-(f.keys.has('ArrowDown')?1:0)-axisY;f.alt=clamp(f.alt+climb*420*dt,30,12000);
  const meters=f.speed*dt,rad=f.bearing*Math.PI/180;f.lat+=Math.cos(rad)*meters/110540;f.lon+=Math.sin(rad)*meters/(111320*Math.max(.15,Math.cos(f.lat*Math.PI/180)));
  const zoom=clamp(18-Math.log2(Math.max(40,f.alt)/40),7,18);map.jumpTo({center:[f.lon,f.lat],zoom,pitch:78,bearing:f.bearing});
  flightHud.textContent='FLIGHT · '+Math.round(f.alt)+'M ALT · '+Math.round(f.speed*1.94384)+' KT · HDG '+Math.round((f.bearing+360)%360);requestAnimationFrame(flightFrame)
 }
 function driveToggle(){
  allow('DRIVE').then(ok=>{if(!ok)return;const walk=document.getElementById('bpWalkToggle');if(walk){walk.click();btn('drive').classList.toggle('active',String(walk.textContent).includes('EXIT'));say('Drive/road mode · BridgePoint rendered 3D · no external street-photo feed')}else say('Drive mode is waiting for the road renderer to finish loading')})
 }
 function windPanel(){
  const c=state.selectedBuilding?polygonCenter(state.selectedBuilding.geometry):null;
  show('BUILDING AERODYNAMICS','<p>'+(c?'Selected building ready.':'Select/tap a building on the map first.')+' This is a visualization aid, not stamped structural engineering.</p><label>WIND SPEED MPH<input id="bpWindSpeed" type="number" min="1" max="200" value="45"></label><label>DIRECTION °<input id="bpWindDir" type="number" min="0" max="359" value="270"></label><div class="action"><button data-run-wind>VISUALIZE</button><button data-clear-wind>CLEAR</button></div>')
 }
 async function runWind(){
  if(!(await allow('WIND')))return;const ctr=state.selectedBuilding?polygonCenter(state.selectedBuilding.geometry):null;if(!ctr){say('Wind tool · select a building first');return}
  const speed=clamp(Number(document.getElementById('bpWindSpeed')?.value||45),1,200),dir=Number(document.getElementById('bpWindDir')?.value||270)%360,features=[],rad=(dir+180)*Math.PI/180;
  for(let row=-5;row<=5;row++){const cross=row*8/111320,dx=Math.sin(rad),dy=Math.cos(rad);const start=[ctr[0]-dx*.0018+cross*Math.cos(rad),ctr[1]-dy*.0018-cross*Math.sin(rad)],end=[ctr[0]+dx*.0028+cross*Math.cos(rad),ctr[1]+dy*.0028-cross*Math.sin(rad)];features.push({type:'Feature',geometry:{type:'LineString',coordinates:[start,ctr,end]},properties:{kind:'VECTOR',speed,row}})}
  features.push({type:'Feature',geometry:{type:'Polygon',coordinates:[circle(ctr[0],ctr[1],.035,30)]},properties:{kind:'PRESSURE',speed}});
  makeSource(map,'bpWindV5500').setData({type:'FeatureCollection',features});
  ensureLayer(map,{id:'bp-wind-fill-v5500',type:'fill',source:'bpWindV5500',filter:['==',['get','kind'],'PRESSURE'],paint:{'fill-color':'#ff825c','fill-opacity':.16,'fill-outline-color':'#ffb283'}});
  ensureLayer(map,{id:'bp-wind-line-v5500',type:'line',source:'bpWindV5500',filter:['==',['get','kind'],'VECTOR'],paint:{'line-color':['interpolate',['linear'],['get','speed'],0,'#5dc7ff',70,'#ffe36f',140,'#ff604c'],'line-width':['interpolate',['linear'],['zoom'],12,1.4,18,4],'line-opacity':.85}});
  say('Wind around selected building · '+speed+' mph @ '+dir+'° · pressure/wake visualization')
 }
 async function ensureQrLib(){
  if(window.qrcode)return true;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/vendor/qrcode-generator.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});return !!window.qrcode
 }
 async function qrPanel(){
  if(!(await allow('QR')))return;show('BRIDGEPOINT QR HOUSE','<p>The flat state is the scannable QR. It then folds into a 3D house visualization and returns to the valid flat code.</p><div class="bp-qrstage" id="bpQrStage">Generating…</div>');
  try{await ensureQrLib();const qr=window.qrcode(0,'M');qr.addData('https://bridgepointintelligence.online/app/');qr.make();const url=qr.createDataURL(7,4),stage=document.getElementById('bpQrStage');stage.innerHTML='<img class="bp-qrflat" src="'+url+'" alt="BridgePoint Intelligence QR code"><div class="bp-qrhouse"><div class="wall front"></div><div class="wall side"></div><div class="wall roof"></div></div>';stage.querySelectorAll('.wall').forEach(x=>x.style.backgroundImage='url('+url+')')}catch(e){document.getElementById('bpQrStage').textContent='QR renderer retrying · '+String(e?.message||e)}
 }
 function sourcePanel(domain,title){liveEntities(domain,domain==='AVIATION'||domain==='SATELLITES'?'SKY':domain==='CAMERAS'?'CAMERAS':'TRANSPORT').then(()=>{if(panel.hidden)show(title,'<p>Source status loaded.</p>')})}
 function timemap(){allow('TIMEMAP').then(ok=>{if(!ok)return;const tm=window.__BP_WEATHER_TIMEMAP_V5201;if(tm){tm.queryHistory?.(true);say('Weather TimeMap active · drag FROM / TO / MOMENT bars')}else say('Weather TimeMap is still initializing')})}
 function clearSimulation(){clearLayer('bpScenarioV5500');simBadge.hidden=true;say('Simulation cleared')}
 panel.querySelector('[data-close]').onclick=()=>panel.hidden=true;
 rail.onclick=e=>{const b=e.target.closest('[data-tool]');if(!b)return;const k=b.dataset.tool;if(k==='globe')toggleGlobe();else if(k==='timemap')timemap();else if(k==='global')globalHazards();else if(k==='flight')flightStart();else if(k==='drive')driveToggle();else if(k==='sky'){sourcePanel('AVIATION','AIRCRAFT / SATELLITES');liveEntities('SATELLITES','SKY')}else if(k==='transport')sourcePanel('TRANSPORT','LIVE TRANSPORT');else if(k==='cameras')sourcePanel('CAMERAS','PUBLIC CAMERA SOURCES');else if(k==='scenario')scenarioPanel();else if(k==='wind')windPanel();else if(k==='qr')qrPanel()};
 panel.onclick=e=>{if(e.target.matches('[data-run-sim]'))runScenario();if(e.target.matches('[data-clear-sim]'))clearSimulation();if(e.target.matches('[data-run-wind]'))runWind();if(e.target.matches('[data-clear-wind]'))clearLayer('bpWindV5500');const r=e.target.closest('[data-ride]');if(r)rideEntity(r.dataset.ride)};
 addEventListener('keydown',e=>{if(state.flight?.active)state.flight.keys.add(e.code)});
 addEventListener('keyup',e=>state.flight?.keys.delete(e.code));
 addEventListener('bp2300:building-click',e=>{state.selectedBuilding=e.detail?.feature||null});
 map.on('styledata',()=>{if(state.global)ensureGlobal()});
 caps().then(c=>{for(const k of ['sky','transport','cameras']){const domain=k==='sky'?'AVIATION':k==='transport'?'TRANSPORT':'CAMERAS',has=(c.enabled||[]).some(x=>x.domain===domain);btn(k)?.classList.toggle('pending',!has)}}).catch(()=>{});
 try{map.setProjection?.({type:'globe'});state.globe=true;btn('globe').classList.add('active')}catch{}
 const api={version:TOOL_VERSION,state,toggleGlobe,globalHazards,liveEntities,runScenario,runWind,flightStart,rideEntity};
 window.__BP_INTELLIGENCE_TOOLS_V5500=api;say('Tools v5500 · globe on · heavy live layers off');return api
}
