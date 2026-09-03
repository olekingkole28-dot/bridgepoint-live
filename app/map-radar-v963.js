(()=>{
  'use strict';
  if(window.__bridgepointMapRadarV963) return;
  window.__bridgepointMapRadarV963=true;

  const API='https://xdfsjztwgsbmabshzsjw.supabase.co/rest/v1/rpc/';
  const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
  const NOAA_QUERY='https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer/query';
  const NOAA_WMS='https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity_time/ImageServer/WMSServer?';
  const LEAFLET_JS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  const LEAFLET_CSS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  let leafletPromise=null;
  let dialog,map,baseLayer,radarLayer,propertyLayer,opportunityLayer;
  let frames=[],frameIndex=0,playing=false,playTimer=null,loadTimer=null;
  let access=null;
  let currentState='CT';
  let latestOpps=[];

  const stateCenters={
    AL:[32.8067,-86.7911],AK:[61.3707,-152.4044],AZ:[33.7298,-111.4312],AR:[34.9697,-92.3731],CA:[36.1162,-119.6816],CO:[39.0598,-105.3111],CT:[41.5978,-72.7554],DE:[39.3185,-75.5071],DC:[38.8974,-77.0268],FL:[27.7663,-81.6868],GA:[33.0406,-83.6431],HI:[21.0943,-157.4983],ID:[44.2405,-114.4788],IL:[40.3495,-88.9861],IN:[39.8494,-86.2583],IA:[42.0115,-93.2105],KS:[38.5266,-96.7265],KY:[37.6681,-84.6701],LA:[31.1695,-91.8678],ME:[44.6939,-69.3819],MD:[39.0639,-76.8021],MA:[42.2302,-71.5301],MI:[43.3266,-84.5361],MN:[45.6945,-93.9002],MS:[32.7416,-89.6787],MO:[38.4561,-92.2884],MT:[46.9219,-110.4544],NE:[41.1254,-98.2681],NV:[38.3135,-117.0554],NH:[43.4525,-71.5639],NJ:[40.2989,-74.5210],NM:[34.8405,-106.2485],NY:[42.1657,-74.9481],NC:[35.6301,-79.8064],ND:[47.5289,-99.7840],OH:[40.3888,-82.7649],OK:[35.5653,-96.9289],OR:[44.5720,-122.0709],PA:[40.5908,-77.2098],RI:[41.6809,-71.5118],SC:[33.8569,-80.9450],SD:[44.2998,-99.4388],TN:[35.7478,-86.6923],TX:[31.0545,-97.5635],UT:[40.1500,-111.8624],VT:[44.0459,-72.7107],VA:[37.7693,-78.1700],WA:[47.4009,-121.4905],WV:[38.4912,-80.9545],WI:[44.2685,-89.6165],WY:[42.7560,-107.3025]
  };

  const style=document.createElement('style');
  style.textContent=`
    #bp963-dialog{position:fixed;z-index:2147483620;inset:0;display:none;background:#06111e;color:#fff;font:500 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    #bp963-dialog.show{display:block}#bp963-dialog *{box-sizing:border-box}
    #bp963-dialog .bp963-shell{height:100%;display:flex;flex-direction:column;background:#06111e}
    #bp963-dialog .bp963-head{display:flex;align-items:center;gap:8px;padding:max(9px,env(safe-area-inset-top)) 10px 8px;border-bottom:1px solid rgba(72,225,255,.15);background:#0a192a;z-index:3}
    .bp963-title{font-size:17px;font-weight:950}.bp963-sub{color:#9fb3c6;font-size:10.5px}.bp963-grow{flex:1;min-width:0}.bp963-btn,.bp963-select{min-height:38px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:#12243a;color:#fff;padding:0 10px;font-weight:800;cursor:pointer}.bp963-btn.primary{border-color:rgba(72,225,255,.35);color:#48e1ff}.bp963-btn.active{background:rgba(72,225,255,.12);border-color:#48e1ff}.bp963-btn:disabled{opacity:.42;cursor:not-allowed}.bp963-close{font-size:18px;min-width:42px}
    #bp963-map{flex:1;min-height:0;background:#0a1827}.bp963-toolbar{position:absolute;z-index:1000;left:10px;top:76px;display:flex;gap:6px;flex-wrap:wrap;max-width:calc(100vw - 76px)}
    .bp963-radarbar{position:absolute;z-index:1001;left:10px;right:10px;bottom:max(10px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid rgba(72,225,255,.2);border-radius:13px;background:rgba(6,17,30,.94);backdrop-filter:blur(12px)}
    .bp963-radarstatus{min-width:150px;color:#48e1ff;font-size:11px;font-weight:900}.bp963-slider{flex:1;min-width:90px}.bp963-note{font-size:9.5px;color:#9fb3c6;max-width:310px}
    .bp963-marker{width:30px;height:30px;display:grid;place-items:center;border-radius:10px;background:rgba(7,19,33,.96);border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.42);font-size:16px;line-height:1}.bp963-marker.opp{width:38px;height:38px;border-radius:12px}.bp963-marker.critical{border-color:#ff7474}.bp963-marker.high{border-color:#ffc95e}.bp963-marker.mid{border-color:#48e1ff}.bp963-marker.lower{border-color:#45e6a6}
    .bp963-popup{min-width:235px;max-width:310px;color:#0b1929}.bp963-popup h3{margin:0 0 5px;font-size:14px}.bp963-popup .tag{font-size:10px;font-weight:900;text-transform:uppercase}.bp963-popup p{margin:6px 0;font-size:11.5px;line-height:1.4}.bp963-popup .limit{padding-top:6px;border-top:1px solid #ddd;color:#5c6770;font-size:10.5px}
    .bp963-key{position:absolute;z-index:1002;right:10px;top:76px;width:min(300px,calc(100vw - 20px));display:none;padding:12px;border:1px solid rgba(72,225,255,.22);border-radius:14px;background:rgba(6,17,30,.96);box-shadow:0 18px 50px rgba(0,0,0,.4)}.bp963-key.show{display:block}.bp963-key h3{margin:0 0 7px}.bp963-keyrow{display:flex;gap:8px;align-items:flex-start;margin:7px 0;color:#c3d2df;font-size:11px}.bp963-keyrow b{color:#fff}.bp963-key .emoji{font-size:18px;width:25px;text-align:center}
    .bp963-lock{position:absolute;z-index:1003;inset:50% auto auto 50%;transform:translate(-50%,-50%);width:min(480px,calc(100vw - 30px));padding:18px;border-radius:16px;background:#0b1929;border:1px solid rgba(255,201,94,.28);box-shadow:0 28px 80px rgba(0,0,0,.55)}.bp963-lock h2{margin:0 0 7px}.bp963-lock p{color:#b5c6d9}.bp963-loading{position:absolute;z-index:1004;right:10px;bottom:72px;padding:7px 9px;border-radius:9px;background:rgba(6,17,30,.88);color:#b5c6d9;font-size:10px;display:none}.bp963-loading.show{display:block}
    #bp963-dialog .leaflet-control-attribution{font-size:8px;background:rgba(255,255,255,.75)}
    @media(max-width:700px){#bp963-dialog .bp963-head{gap:5px;flex-wrap:wrap}.bp963-title{font-size:15px}.bp963-sub{display:none}.bp963-toolbar{top:94px}.bp963-key{top:94px}.bp963-radarbar{gap:5px;padding:6px 7px;flex-wrap:wrap}.bp963-radarstatus{min-width:125px;font-size:10px}.bp963-note{display:none}.bp963-btn,.bp963-select{min-height:36px;font-size:11px;padding:0 8px}}
  `;
  document.head.appendChild(style);

  function findAccessToken(){
    const seen=new Set();
    const walk=v=>{if(v==null||seen.has(v))return null;if(typeof v==='object'){seen.add(v);if(typeof v.access_token==='string'&&v.access_token.length>30)return v.access_token;for(const x of Object.values(v)){const hit=walk(x);if(hit)return hit;}}return null;};
    try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(!/auth|supabase|sb-/i.test(k))continue;const raw=localStorage.getItem(k);if(!raw)continue;try{const hit=walk(JSON.parse(raw));if(hit)return hit;}catch(_){}}}catch(_){ }
    return null;
  }
  async function rpc(name,token,body={}){const r=await fetch(`${API}${name}`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${token||KEY}`,'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body),cache:'no-store'});if(!r.ok)throw new Error(`${name}:${r.status}`);return await r.json();}
  const feature=name=>!!(access&&Array.isArray(access.features)&&access.features.includes(name));

  function loadLeaflet(){
    if(window.L) return Promise.resolve(window.L);
    if(leafletPromise) return leafletPromise;
    leafletPromise=new Promise((resolve,reject)=>{
      if(!document.querySelector(`link[href="${LEAFLET_CSS}"]`)){const l=document.createElement('link');l.rel='stylesheet';l.href=LEAFLET_CSS;document.head.appendChild(l);}
      const s=document.createElement('script');s.src=LEAFLET_JS;s.onload=()=>resolve(window.L);s.onerror=reject;document.head.appendChild(s);
    });
    return leafletPromise;
  }

  function makeDialog(){
    dialog=document.createElement('div');dialog.id='bp963-dialog';
    const states=Object.keys(stateCenters).sort().map(s=>`<option value="${s}"${s==='CT'?' selected':''}>${s}</option>`).join('');
    dialog.innerHTML=`<div class="bp963-shell"><div class="bp963-head"><div class="bp963-grow"><div class="bp963-title">BridgePoint Map + NOAA Radar</div><div class="bp963-sub">Tap every marker. Latest radar stays still until you press Play.</div></div><select class="bp963-select" data-state aria-label="State">${states}</select><button class="bp963-btn" data-key>Map key</button><button class="bp963-btn" data-locate>My location</button><button class="bp963-btn bp963-close" data-close aria-label="Close">×</button></div><div id="bp963-map"></div><div class="bp963-toolbar"><button class="bp963-btn active" data-props>🏠 Properties</button><button class="bp963-btn active" data-opps>◎ Opportunities</button><button class="bp963-btn primary active" data-radar>◉ Radar</button></div><div class="bp963-key" data-keybox><h3>What am I seeing?</h3><div class="bp963-keyrow"><span class="emoji">🏠</span><span><b>Property</b><br>A property record in this viewport. It does not mean damage or an opportunity.</span></div><div class="bp963-keyrow"><span class="emoji">🏚️</span><span><b>Roof</b><br>Roofing-related opportunity/evidence.</span></div><div class="bp963-keyrow"><span class="emoji">⛈️</span><span><b>Storm</b><br>Weather/wind/hail context. Weather pixels are not proof of property damage.</span></div><div class="bp963-keyrow"><span class="emoji">🔥</span><span><b>Fire</b><br>Fire-related evidence/opportunity.</span></div><div class="bp963-keyrow"><span class="emoji">💧</span><span><b>Water / flood</b><br>Flood, water or drainage context.</span></div><div class="bp963-keyrow"><span class="emoji">☀️</span><span><b>Solar</b><br>Solar-related opportunity or physical signal.</span></div><div class="bp963-keyrow"><span class="emoji">🏗️</span><span><b>Development / permit</b><br>Construction, permit, building-change or development opportunity.</span></div><div class="bp963-keyrow"><span class="emoji">🏢</span><span><b>Investor / transfer</b><br>Ownership, sale, commercial or investment opportunity.</span></div><div class="bp963-keyrow"><span class="emoji">◉</span><span><b>NOAA radar</b><br>MRMS base reflectivity. Latest frame by default; press Play for recent history.</span></div><div class="bp963-keyrow"><span style="color:#ff7474">■</span><span><b>Red border</b> = critical / 85+; <span style="color:#ffc95e">■</span> amber = high / 70+; <span style="color:#48e1ff">■</span> cyan = 55+; <span style="color:#45e6a6">■</span> green = lower qualified.</span></div></div><div class="bp963-radarbar"><button class="bp963-btn" data-play>▶ Play</button><div class="bp963-radarstatus" data-status>NOAA • latest</div><input class="bp963-slider" data-slider type="range" min="0" max="0" value="0" step="1" disabled><div class="bp963-note">NOAA/NWS MRMS reflectivity is regional weather context, not proof of damage.</div></div><div class="bp963-loading" data-loading>Loading BridgePoint map…</div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('[data-close]').onclick=closeMap;
    dialog.querySelector('[data-key]').onclick=()=>dialog.querySelector('[data-keybox]').classList.toggle('show');
    dialog.querySelector('[data-state]').onchange=e=>goState(e.target.value);
    dialog.querySelector('[data-locate]').onclick=locate;
    dialog.querySelector('[data-play]').onclick=togglePlay;
    dialog.querySelector('[data-slider]').oninput=e=>{playing=false;syncPlay();frameIndex=Number(e.target.value);applyRadarFrame();};
    dialog.querySelector('[data-radar]').onclick=e=>toggleLayer(e.currentTarget,'radar');
    dialog.querySelector('[data-props]').onclick=e=>toggleLayer(e.currentTarget,'properties');
    dialog.querySelector('[data-opps]').onclick=e=>toggleLayer(e.currentTarget,'opportunities');
  }

  function loading(on,text='Loading BridgePoint map…'){const el=dialog?.querySelector('[data-loading]');if(!el)return;el.textContent=text;el.classList.toggle('show',!!on);}
  function closeMap(){dialog?.classList.remove('show');playing=false;syncPlay();}
  function stateFromCenter(lat,lng){let best='CT',dist=Infinity;for(const [s,c] of Object.entries(stateCenters)){const d=(lat-c[0])**2+(lng-c[1])**2;if(d<dist){dist=d;best=s;}}return best;}
  function goState(code){currentState=code;const c=stateCenters[code]||[39.4,-98.3];dialog.querySelector('[data-state]').value=code;map.setView(c,7);loadOpportunities(code);scheduleProperties();}

  function iconFor(row){
    const s=`${row.model_key||''} ${row.title||''} ${row.stage||''}`.toLowerCase();
    if(/roof/.test(s))return '🏚️'; if(/storm|wind|hail|weather/.test(s))return '⛈️'; if(/fire/.test(s))return '🔥'; if(/flood|water|drain/.test(s))return '💧'; if(/solar/.test(s))return '☀️'; if(/develop|construct|permit|contract/.test(s))return '🏗️'; if(/invest|sale|transfer|commercial/.test(s))return '🏢'; return '◎';
  }
  function priorityClass(row){const n=Number(row.score||0);return n>=85?'critical':n>=70?'high':n>=55?'mid':'lower';}
  function esc(v){return String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}
  function propertyPopup(row){return `<div class="bp963-popup"><div class="tag">PROPERTY</div><h3>${esc(row.full_address||row.parcel_number||'Property')}</h3><p>${esc(row.municipality||'')}${row.state_code?`, ${esc(row.state_code)}`:''}${row.property_type?` • ${esc(row.property_type)}`:''}</p><p>${row.year_built?`Built ${esc(row.year_built)} • `:''}${row.assessed_total_value?`Assessed ${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(row.assessed_total_value))}`:''}</p><p class="limit"><b>What this does not prove:</b> a property marker alone does not mean damage, a claim or an active opportunity.</p></div>`;}
  function oppPopup(row){const families=Array.isArray(row.evidence_families)?row.evidence_families.join(', '):'';return `<div class="bp963-popup"><div class="tag">${esc(row.priority||'Opportunity')} • ${esc(row.score||'—')}/100</div><h3>${esc(row.title||'BridgePoint opportunity')}</h3><p><b>${esc(row.full_address||'Property')}</b><br>${esc(row.municipality||'')} ${esc(row.state_code||'')}</p><p>${esc(row.explanation||'BridgePoint combined multiple evidence sources to prioritize this property for review.')}</p>${families?`<p><b>Evidence:</b> ${esc(families)}</p>`:''}<p><b>Confidence:</b> ${esc(row.confidence_score||'—')} • <b>Direct signals:</b> ${esc(row.direct_signal_count||0)} • <b>Independent sources:</b> ${esc(row.direct_source_count||0)}</p><p class="limit"><b>What this does not prove:</b> this is a ranked intelligence result, not proof of loss, coverage, ownership intent or guaranteed work.</p></div>`;}

  async function loadOpportunities(state){
    const token=findAccessToken();if(!token||!feature('opportunities')){opportunityLayer?.clearLayers();return;}
    try{loading(true,`Loading ${state} opportunities…`);const data=await rpc('bridgepoint_flutter_opportunities_state_v341',token,{p_state_code:state,p_model_key:'all',p_limit:60,p_offset:0,p_priority:null,p_stage:null});latestOpps=Array.isArray(data?.opportunities)?data.opportunities:[];opportunityLayer.clearLayers();for(const row of latestOpps){if(!Number.isFinite(Number(row.latitude))||!Number.isFinite(Number(row.longitude)))continue;const html=`<div class="bp963-marker opp ${priorityClass(row)}">${iconFor(row)}</div>`;const marker=L.marker([Number(row.latitude),Number(row.longitude)],{icon:L.divIcon({className:'',html,iconSize:[38,38],iconAnchor:[19,19]})});marker.bindPopup(oppPopup(row),{maxWidth:330});marker.addTo(opportunityLayer);} }catch(_){ }finally{loading(false);}
  }

  function scheduleProperties(){clearTimeout(loadTimer);loadTimer=setTimeout(loadProperties,350);}
  async function loadProperties(){
    const token=findAccessToken();if(!token||!feature('property_profiles')||!map||map.getZoom()<7){propertyLayer?.clearLayers();return;}
    const b=map.getBounds();
    try{loading(true,'Loading properties in this view…');const data=await rpc('bridgepoint_flutter_property_map_viewport_v838',token,{p_min_lat:b.getSouth(),p_max_lat:b.getNorth(),p_min_lng:b.getWest(),p_max_lng:b.getEast(),p_limit:120});const rows=Array.isArray(data?.properties)?data.properties:[];propertyLayer.clearLayers();for(const row of rows){if(!Number.isFinite(Number(row.latitude))||!Number.isFinite(Number(row.longitude)))continue;const marker=L.marker([Number(row.latitude),Number(row.longitude)],{icon:L.divIcon({className:'',html:'<div class="bp963-marker">🏠</div>',iconSize:[30,30],iconAnchor:[15,15]})});marker.bindPopup(propertyPopup(row),{maxWidth:320});marker.addTo(propertyLayer);} }catch(_){ }finally{loading(false);}
  }

  async function loadFrames(){
    try{const u=new URL(NOAA_QUERY);Object.entries({where:'1=1',outFields:'idp_validtime',returnGeometry:'false',orderByFields:'idp_validtime ASC',resultRecordCount:'300',f:'json'}).forEach(([k,v])=>u.searchParams.set(k,v));const r=await fetch(u,{cache:'no-store'});if(!r.ok)return;const j=await r.json();const now=Date.now(),buckets=new Map();for(const f of (j.features||[])){const t=Number(f?.attributes?.idp_validtime||0);if(!t||t<now-4*3600000||t>now+15*60000)continue;buckets.set(Math.floor(t/300000),new Date(t));}frames=[...buckets.values()].sort((a,b)=>a-b).slice(-18);frameIndex=Math.max(0,frames.length-1);const slider=dialog.querySelector('[data-slider]');slider.max=String(Math.max(0,frames.length-1));slider.value=String(frameIndex);slider.disabled=frames.length<2;applyRadarFrame();}catch(_){updateRadarStatus();}
  }
  function wmsTime(d){return d.toISOString();}
  function applyRadarFrame(){if(!radarLayer)return;const latest=frames.length===0||frameIndex>=frames.length-1;const params=latest?{TIME:null}:{TIME:wmsTime(frames[frameIndex])};if(latest){radarLayer.setParams({TIME:''},false);}else{radarLayer.setParams(params,false);}const slider=dialog.querySelector('[data-slider]');if(slider)slider.value=String(frameIndex);updateRadarStatus();}
  function updateRadarStatus(){const el=dialog?.querySelector('[data-status]');if(!el)return;if(!frames.length){el.textContent='NOAA • latest';return;}const d=frames[Math.min(frameIndex,frames.length-1)];const latest=frameIndex>=frames.length-1;el.textContent=`NOAA • ${latest?'Latest':`Frame ${frameIndex+1}/${frames.length}`} • ${d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`;}
  function syncPlay(){const b=dialog?.querySelector('[data-play]');if(b)b.textContent=playing?'Ⅱ Pause':'▶ Play';}
  function togglePlay(){if(frames.length<2)return;playing=!playing;if(playing&&frameIndex>=frames.length-1)frameIndex=0;syncPlay();clearInterval(playTimer);if(playing)playTimer=setInterval(()=>{if(!playing)return;if(frameIndex<frames.length-1){frameIndex++;applyRadarFrame();}else{playing=false;clearInterval(playTimer);syncPlay();}},5500);}
  function toggleLayer(button,which){button.classList.toggle('active');const on=button.classList.contains('active');if(which==='radar'){if(on){radarLayer.addTo(map);loadFrames();}else map.removeLayer(radarLayer);}if(which==='properties'){if(on){propertyLayer.addTo(map);loadProperties();}else map.removeLayer(propertyLayer);}if(which==='opportunities'){if(on){opportunityLayer.addTo(map);loadOpportunities(currentState);}else map.removeLayer(opportunityLayer);}}
  function locate(){if(!navigator.geolocation)return;navigator.geolocation.getCurrentPosition(p=>{const lat=p.coords.latitude,lng=p.coords.longitude;map.setView([lat,lng],13);const s=stateFromCenter(lat,lng);currentState=s;dialog.querySelector('[data-state]').value=s;loadOpportunities(s);scheduleProperties();},()=>{} ,{enableHighAccuracy:false,timeout:8000,maximumAge:300000});}

  async function openMap(){
    if(!dialog)makeDialog();dialog.classList.add('show');
    const token=findAccessToken();
    if(!token){showLock('Sign in to use the intelligence map','BridgePoint must verify your package before loading customer property intelligence or weather layers.');return;}
    try{access=await rpc('bridgepoint_customer_access_contract_v318',token);if(!access?.complete&&!access?.available)throw new Error('access');}catch(_){showLock('Could not verify your access','BridgePoint did not change your account. Close this panel and try again after your session refreshes.');return;}
    if(!feature('map')){showLock('Map is not unlocked in this package','Open Packages → My access to see what your account currently includes.');return;}
    removeLock();
    await loadLeaflet();
    if(!map){
      map=L.map('bp963-map',{zoomControl:true,preferCanvas:true}).setView([39.4,-98.3],4);
      baseLayer=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri'}).addTo(map);
      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri'}).addTo(map);
      propertyLayer=L.layerGroup().addTo(map);opportunityLayer=L.layerGroup().addTo(map);
      radarLayer=L.tileLayer.wms(NOAA_WMS,{layers:'0',format:'image/png',transparent:true,version:'1.3.0',maxZoom:18,opacity:.68,attribution:'NOAA/NWS MRMS'});
      if(feature('weather_intelligence'))radarLayer.addTo(map);else{const r=dialog.querySelector('[data-radar]');r.classList.remove('active');r.disabled=true;r.title='Weather intelligence is not unlocked in this package';dialog.querySelector('[data-play]').disabled=true;dialog.querySelector('[data-status]').textContent='Radar • not in package';}
      map.on('moveend zoomend',()=>{const c=map.getCenter();const s=stateFromCenter(c.lat,c.lng);if(s!==currentState&&map.getZoom()>=6){currentState=s;dialog.querySelector('[data-state]').value=s;loadOpportunities(s);}scheduleProperties();});
    }
    setTimeout(()=>map.invalidateSize(),80);
    if(feature('weather_intelligence'))loadFrames();
    goState(currentState);
  }

  function showLock(title,text){if(!dialog)return;removeLock();const el=document.createElement('div');el.className='bp963-lock';el.setAttribute('data-lock','');el.innerHTML=`<h2>${esc(title)}</h2><p>${esc(text)}</p><button class="bp963-btn primary" type="button">Close</button>`;el.querySelector('button').onclick=closeMap;dialog.appendChild(el);}
  function removeLock(){dialog?.querySelector('[data-lock]')?.remove();}

  function attach(){
    const bar=document.getElementById('bp-live-system-v961');if(!bar)return false;
    if(bar.querySelector('[data-map-radar-v963]'))return true;
    const owner=bar.querySelector('.bp961-owner');const button=document.createElement('button');button.type='button';button.className='bp961-metric';button.setAttribute('data-map-radar-v963','');button.innerHTML='<span class="bp961-label">Map + radar</span><span class="bp961-value">Open</span>';button.addEventListener('click',openMap);if(owner)bar.insertBefore(button,owner);else bar.appendChild(button);return true;
  }
  if(!attach()){let tries=0;const t=setInterval(()=>{tries++;if(attach()||tries>80)clearInterval(t)},250);}
})();