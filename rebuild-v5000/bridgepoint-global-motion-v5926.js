(()=>{
'use strict';
if(window.__BP_GLOBAL_MOTION_V5926__)return;
const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const SOURCE='https://tle.ivanstanojevic.me/api/tle/';
const FLIGHT_ROOT='https://api.adsb.lol/v2/point/';
const EMPTY={type:'FeatureCollection',features:[]};
const state={map:null,satApi:null,satelliteEnabled:false,aircraftEnabled:false,followSatellite:false,followAircraft:false,
 catalog:[],catalogAfter:null,catalogHasMore:false,catalogKnown:0,plottedSatellites:0,aircraft:[],selectedSatellite:null,selectedAircraft:null,
 lastSatelliteAt:null,lastFlightAt:null,lastError:null,satellitePageLoading:false,flightLoading:false,styleTimer:null,flightTimer:null,summaryTimer:null,
 summaries:{physical:null,motion:null,satellite:null},refreshing:false,bootAttempts:0};
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString();
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const safeText=(v,max=100)=>String(v??'').replace(/[<>]/g,'').slice(0,max);
async function rpc(name,args={},timeout=12000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const res=await fetch(SUPA+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(args),cache:'no-store',signal:controller.signal});
  const d=await res.json().catch(()=>null);if(!res.ok)throw new Error(d?.message||d?.hint||('RPC '+name+' HTTP '+res.status));return d;
 }finally{clearTimeout(timer)}
}
function css(){
 if($('bp-global-motion-style-v5926'))return;
 const s=el('style');s.id='bp-global-motion-style-v5926';s.textContent=[
 '#bp-global-motion-v5926{margin:12px 0;padding:12px;border:1px solid rgba(99,220,255,.32);border-radius:13px;background:linear-gradient(145deg,rgba(6,23,33,.98),rgba(3,10,16,.97));color:#e8f8ff;font:12px/1.42 system-ui,sans-serif}',
 '#bp-global-motion-v5926 .bpm-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}',
 '#bp-global-motion-v5926 .bpm-title{font-size:13px;font-weight:900;letter-spacing:.055em}',
 '#bp-global-motion-v5926 .bpm-sub,#bp-global-motion-v5926 .bpm-note{font-size:10px;color:#9cb9c7;margin-top:3px}',
 '#bp-global-motion-v5926 .bpm-badge{font-size:9px;color:#7ce9ff;border:1px solid #265a6b;border-radius:14px;padding:3px 6px;white-space:nowrap}',
 '#bp-global-motion-v5926 .bpm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:10px 0}',
 '#bp-global-motion-v5926 .bpm-stat{background:rgba(255,255,255,.025);border:1px solid rgba(170,220,240,.13);border-radius:8px;padding:7px;min-width:0}',
 '#bp-global-motion-v5926 .bpm-stat strong{display:block;font-size:15px;line-height:1.22;color:#fff;overflow-wrap:anywhere}',
 '#bp-global-motion-v5926 .bpm-stat small{display:block;font-size:10px;color:#a3bdc8;margin-top:3px}',
 '#bp-global-motion-v5926 .bpm-row{display:flex;align-items:flex-start;gap:8px;padding:8px 2px;border-top:1px solid rgba(150,210,230,.12)}',
 '#bp-global-motion-v5926 .bpm-row input{accent-color:#55e4ff;margin:3px 0 0}',
 '#bp-global-motion-v5926 .bpm-row b{display:block;font-size:11px}',
 '#bp-global-motion-v5926 .bpm-row small{display:block;color:#a0b9c5;font-size:10px;margin-top:2px}',
 '#bp-global-motion-v5926 .bpm-buttons{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0}',
 '#bp-global-motion-v5926 .bpm-btn{background:#0c2632;color:#dffaff;border:1px solid rgba(94,226,255,.37);border-radius:8px;padding:7px 9px;font:700 11px system-ui,sans-serif;cursor:pointer}',
 '#bp-global-motion-v5926 .bpm-btn[disabled]{opacity:.46;cursor:not-allowed}',
 '#bp-global-motion-v5926 .bpm-status{font-size:10px;color:#87e8fa;min-height:15px;overflow-wrap:anywhere}',
 '#bp-global-motion-v5926 .bpm-selected{padding:8px;border-radius:8px;background:rgba(38,106,125,.16);border:1px solid rgba(95,220,250,.16);margin:6px 0;font-size:10px;overflow-wrap:anywhere}',
 '#bp-global-motion-v5926 .bpm-feed{border-top:1px solid rgba(150,210,230,.12);padding-top:8px;margin-top:8px}',
 '@media(max-width:420px){#bp-global-motion-v5926{padding:9px}#bp-global-motion-v5926 .bpm-stat strong{font-size:13px}}'
 ].join('');document.head.appendChild(s);
}
function controlsPane(){
 return document.querySelector('#bpv-sidecar [data-bpv-pane="controls"]')||document.querySelector('[data-bpv-pane="controls"]')||null;
}
function addPanel(){
 css();const pane=controlsPane();if(!pane)return false;let box=$('bp-global-motion-v5926');
 if(!box){
  box=el('section');box.id='bp-global-motion-v5926';
  const head=el('div','bpm-head'),title=el('div');
  title.append(el('div','bpm-title','BRIDGEPOINT EYE · GLOBAL MOTION'),el('div','bpm-sub','Orbital elements, nearby live aircraft, static transport and source coverage.'));
  const badge=el('span','bpm-badge','SOURCE-TRACKED');badge.id='bpm-badge-v5926';head.append(title,badge);
  const grid=el('div','bpm-grid');grid.id='bpm-grid-v5926';
  const controls=el('div','bpm-controls');
  const addToggle=(id,label,note,initial,fn)=>{
   const row=el('label','bpm-row'),input=el('input');input.type='checkbox';input.id=id;input.checked=initial;
   const copy=el('span');copy.append(el('b','',label),el('small','',note));row.append(input,copy);controls.append(row);
   input.addEventListener('change',()=>fn(input.checked));
  };
  addToggle('bpm-sat-enable','Show satellite ground tracks','Estimated positions propagated from public GP orbital elements; not live spacecraft telemetry.',false,async on=>{await setSatellitesEnabled(on)});
  addToggle('bpm-flight-enable','Show nearby public aircraft','ADSB.lol open feed · current map center ±250 nautical miles · refreshed about every 45 seconds.',false,async on=>{await setAircraftEnabled(on)});
  const actions=el('div','bpm-buttons');
  const satPage=el('button','bpm-btn','Load next satellite page');satPage.type='button';satPage.id='bpm-load-sat-page';satPage.addEventListener('click',()=>loadSatellitePage(false));
  const satFollow=el('button','bpm-btn','Follow selected satellite');satFollow.type='button';satFollow.id='bpm-sat-follow';satFollow.addEventListener('click',()=>followSat());
  const planeFollow=el('button','bpm-btn','Follow selected aircraft');planeFollow.type='button';planeFollow.id='bpm-plane-follow';planeFollow.addEventListener('click',()=>followPlane());
  const update=el('button','bpm-btn','Refresh source counters');update.type='button';update.addEventListener('click',()=>refreshSummaries(true));
  actions.append(satPage,satFollow,planeFollow,update);
  const selected=el('div','bpm-selected','Click a satellite or aircraft point on the map to inspect it.');selected.id='bpm-selected-v5926';
  const satStatus=el('div','bpm-status','Loading BridgePoint source status…');satStatus.id='bpm-sat-status-v5926';
  const flightStatus=el('div','bpm-status','Live aircraft feed is off.');flightStatus.id='bpm-flight-status-v5926';
  const foot=el('p','bpm-note','SOURCE COVERAGE: satellite positions are propagated orbital estimates, not onboard telemetry; aircraft are ADSB.lol positions within 250 nautical miles of the map center. Transit/rail features are static public geometry, not live train positions. No authorized global AIS vessel feed or licensed global camera catalog is connected yet, so ships and cameras remain unavailable rather than using invented tracks.');
  const feed=el('div','bpm-feed');feed.append(el('b','', 'FEED COVERAGE'),foot,selected,satStatus,flightStatus);
  box.append(head,grid,controls,actions,feed);
 }
 if(box.parentElement!==pane)pane.appendChild(box);renderSummaries();return true;
}
function renderSummaries(){
 const grid=$('bpm-grid-v5926');if(!grid)return;const p=state.summaries.physical||{},m=state.summaries.motion||{},s=state.summaries.satellite||{};
 const tiles=[
  [s.total_known_objects,'Satellite OMM records'],
  [state.plottedSatellites,'Satellite positions plotted'],
  [m.rooftop_solar_records,'Rooftop solar features'],
  [m.solar_site_boundary_records,'Utility-scale solar sites'],
  [p.roof_geometry_records,'Source roof/building geometry'],
  [p.roof_shape_truth_records,'Roof-shape evidence rows'],
  [p.roof_plane_records,'Roof-plane records'],
  [p.lidar_roof_records,'LiDAR-derived roof rows'],
  [p.pool_records,'Pool geometry records'],
  [p.tunnel_underpass_records,'Tunnel/underpass records'],
  [m.rail_segment_records,'Static rail segments'],
  [m.fhwa_nbi_expected_records,'FHWA bridge inventory expectation'],
  [m.fhwa_bridge_geometry_records,'Bridge geometries materialized'],
  [m.approved_subsurface_source_cohorts,'Approved subsurface source cohorts'],
  [p.public_subsurface_records,'Public subsurface rows materialized'],
  [m.world_feature_rows_persisted,'World feature rows persisted']
 ];
 grid.replaceChildren();for(const [n,label] of tiles){const card=el('div','bpm-stat');card.append(el('strong','',fmt(n)),el('small','',label));grid.append(card)}
 const badge=$('bpm-badge-v5926');if(badge)badge.textContent='COUNTERS '+(m.refreshed_at?new Date(m.refreshed_at).toLocaleTimeString():'WAITING');
 const sat=$('bpm-sat-status-v5926');
 if(sat){
  if(s.operator_review_required)sat.textContent='SATELLITE SOURCE REFRESH PAUSED · '+fmt(s.total_known_objects)+' cached orbital records remain preserved. New source refresh is paused for provider review; any displayed positions remain propagated estimates, not telemetry.';
  else if(s.total_known_objects>0)sat.textContent='Orbital elements: '+fmt(s.total_known_objects)+' cached records · '+fmt(state.plottedSatellites)+' plotted · refreshed '+(s.source_fetched_at?new Date(s.source_fetched_at).toLocaleString():'time unavailable')+'. Positions are propagated estimates, not telemetry.';
  else sat.textContent='Satellite catalogue has 0 materialized records. Source refresh status: '+(s.last_refresh_status||'WAITING')+'. The catalog will stay honest until a permitted TLE source returns records.';
 }
 const flight=$('bpm-flight-status-v5926');
 if(flight){
  if(state.aircraftEnabled)flight.textContent='Nearby aircraft feed: '+fmt(state.aircraft.length)+' returned for the current 250-nm search area · '+(state.lastFlightAt?new Date(state.lastFlightAt).toLocaleTimeString():'waiting for first feed')+'. Source: ADSB.lol ODbL.';
  else flight.textContent='Nearby aircraft feed is off. Enable it to request aircraft around the current map center. It is not a worldwide all-aircraft inventory.';
 }
 const selected=$('bpm-selected-v5926');
 if(selected){
  if(state.selectedSatellite)selected.textContent='Selected satellite ground track: '+safeText(state.selectedSatellite.name)+' · NORAD '+safeText(state.selectedSatellite.id)+' · altitude '+fmt(Math.round(state.selectedSatellite.altitudeKm||0))+' km · '+(state.followSatellite?'FOLLOWING':'selected only')+'.';
  else if(state.selectedAircraft)selected.textContent='Selected aircraft: '+safeText(state.selectedAircraft.callsign||state.selectedAircraft.hex)+' · '+safeText(state.selectedAircraft.hex)+' · '+safeText(state.selectedAircraft.altitude)+' · '+(state.followAircraft?'FOLLOWING':'selected only')+'.';
  else selected.textContent='Click a satellite or aircraft point on the map to inspect it, then choose Follow.';
 }
 const next=$('bpm-load-sat-page');if(next)next.disabled=!state.catalogHasMore||state.satellitePageLoading||!!s.operator_review_required;
}
async function refreshSummaries(force=false){
 if(state.refreshing)return;state.refreshing=true;
 try{
  const [p,m,s]=await Promise.all([
   rpc('bridgepoint_public_physical_map_summary_v5924',{},10000).catch(e=>{console.warn('BridgePoint physical summary',e);return null}),
   rpc('bridgepoint_public_global_motion_summary_v5926',{},10000).catch(e=>{console.warn('BridgePoint motion summary',e);return null}),
   rpc('bridgepoint_public_satellite_summary_v5926',{},10000).catch(e=>{console.warn('BridgePoint satellite summary',e);return null})
  ]);
  if(p?.version===5924)state.summaries.physical=p;
  if(m?.version===5926)state.summaries.motion=m;
  if(s?.version===5926)state.summaries.satellite=s;
  renderSummaries();
  if(state.satelliteEnabled&&state.summaries.satellite?.total_known_objects>0&&state.catalog.length===0&&!state.summaries.satellite.operator_review_required)await loadSatellitePage(true);
 }finally{state.refreshing=false}
}
function setData(sourceId,fc){try{state.map?.getSource(sourceId)?.setData(fc||EMPTY)}catch(_){}}
function buildLayers(){
 const map=state.map;if(!map||!map.getStyle?.())return false;
 try{
  const sources=[
   ['bpV5926Satellites',EMPTY],['bpV5926SatelliteTrail',EMPTY],['bpV5926Aircraft',EMPTY]
  ];
  for(const [id,data] of sources)if(!map.getSource(id))map.addSource(id,{type:'geojson',data});
  const add=(id,layer)=>{if(!map.getLayer(id))map.addLayer(layer)};
  add('bp-v5926-satellite-trail',{id:'bp-v5926-satellite-trail',type:'line',source:'bpV5926SatelliteTrail',layout:{visibility:state.satelliteEnabled?'visible':'none'},paint:{'line-color':'#ffd86d','line-width':['interpolate',['linear'],['zoom'],1,1,7,2,14,3],'line-opacity':.78,'line-dasharray':[2,1]}});
  add('bp-v5926-satellite-points',{id:'bp-v5926-satellite-points',type:'circle',source:'bpV5926Satellites',minzoom:1.1,layout:{visibility:state.satelliteEnabled?'visible':'none'},paint:{
   'circle-radius':['interpolate',['linear'],['zoom'],1.1,1.7,3,2.5,7,4.2,12,6],
   'circle-color':['match',['get','object_type'],'PAYLOAD','#ffde75','ROCKET BODY','#65c9ff','DEBRIS','#b4a3ff','UNKNOWN','#b9c8d0','#b9ff8a'],
   'circle-stroke-color':'#f6fbff','circle-stroke-width':['interpolate',['linear'],['zoom'],1,.25,7,.8,13,1.2],
   'circle-opacity':['interpolate',['linear'],['zoom'],1.1,.72,5,.96]
  }});
  add('bp-v5926-aircraft-points',{id:'bp-v5926-aircraft-points',type:'circle',source:'bpV5926Aircraft',minzoom:2,layout:{visibility:state.aircraftEnabled?'visible':'none'},paint:{
   'circle-radius':['interpolate',['linear'],['zoom'],2,2,5,3.2,9,5.2],
   'circle-color':['case',['==',['get','selected'],true],'#ffffff','#36e7ff'],
   'circle-stroke-color':['case',['==',['get','selected'],true],'#ffb84d','#0a3040'],
   'circle-stroke-width':1.2,'circle-opacity':.97
  }});
  add('bp-v5926-aircraft-labels',{id:'bp-v5926-aircraft-labels',type:'symbol',source:'bpV5926Aircraft',minzoom:6,layout:{
   visibility:state.aircraftEnabled?'visible':'none',
   'text-field':['coalesce',['get','callsign'],['get','hex']],
   'text-size':['interpolate',['linear'],['zoom'],6,9,12,12],
   'text-offset':[0,1.2],'text-anchor':'top','text-allow-overlap':false,'text-ignore-placement':false
  },paint:{'text-color':'#d6fbff','text-halo-color':'rgba(0,14,22,.94)','text-halo-width':1.5}});
  for(const id of ['bp-v5926-satellite-trail','bp-v5926-satellite-points'])map.setLayoutProperty(id,'visibility',state.satelliteEnabled?'visible':'none');
  for(const id of ['bp-v5926-aircraft-points','bp-v5926-aircraft-labels'])map.setLayoutProperty(id,'visibility',state.aircraftEnabled?'visible':'none');
  if(!map.__bpMotionClickBound5926){
   map.__bpMotionClickBound5926=true;
   map.on('click','bp-v5926-satellite-points',e=>{
    const p=e.features?.[0]?.properties;if(!p)return;
    state.selectedSatellite={id:p.norad_cat_id,name:p.object_name,latitude:Number(p.latitude),longitude:Number(p.longitude),altitudeKm:Number(p.altitude_km),satrec:state.catalog.find(x=>String(x.NORAD_CAT_ID??x.NORAD_CATID)===String(p.norad_cat_id))?._bpSatrec||null};
    state.followSatellite=false;state.followAircraft=false;renderSummaries();void drawSelectedSatelliteTrail();
   });
   map.on('click','bp-v5926-aircraft-points',e=>{
    const p=e.features?.[0]?.properties;if(!p)return;
    state.selectedAircraft={hex:String(p.hex||''),callsign:String(p.callsign||''),lat:Number(p.lat),lon:Number(p.lon),altitude:String(p.altitude||'unknown'),track:Number(p.track||0)};
    state.followAircraft=false;state.followSatellite=false;renderSummaries();void refreshFlights(true);
   });
   for(const id of ['bp-v5926-satellite-points','bp-v5926-aircraft-points'])map.on('mouseenter',id,()=>{try{map.getCanvas().style.cursor='pointer'}catch(_){}});
   for(const id of ['bp-v5926-satellite-points','bp-v5926-aircraft-points'])map.on('mouseleave',id,()=>{try{map.getCanvas().style.cursor=''}catch(_){}});
  }
  return true;
 }catch(e){console.warn('BridgePoint motion layer install',e);return false}
}
function attachMap(){
 const m=window.__BP_V5000_WORLD__?.map||window.__BP_V5000_WORLD?.map||window.__BP_LANDING_WORLD__?.map||window.__BP_WORLD?.map;
 if(!m||typeof m.getCenter!=='function'){if(state.bootAttempts++<180)setTimeout(attachMap,500);return false}
 if(state.map===m)return true;state.map=m;
 const setup=()=>{buildLayers();if(state.catalog.length)propagateCatalog();if(state.aircraft.length)setAircraftData(state.aircraft)};
 if(m.isStyleLoaded?.())setup();else m.once('style.load',setup);
 m.on('style.load',setup);
 m.on('moveend',()=>{if(state.aircraftEnabled){clearTimeout(state.flightTimer);state.flightTimer=setTimeout(()=>refreshFlights(false),900)}});
 m.on('zoomend',()=>{if(state.aircraftEnabled&&m.getZoom()>2){clearTimeout(state.flightTimer);state.flightTimer=setTimeout(()=>refreshFlights(false),900)}});
 return true;
}
async function loadSatLib(){
 if(state.satApi)return state.satApi;
 const lib=await import('https://esm.sh/satellite.js@6.0.2');
 if(typeof lib.json2satrec!=='function'||typeof lib.propagate!=='function')throw new Error('SATELLITE_LIBRARY_API_UNAVAILABLE');
 state.satApi=lib;return lib;
}
async function loadSatellitePage(reset){
 const status=$('bpm-sat-status-v5926');const summary=state.summaries.satellite||{};
 if(summary.operator_review_required&&Number(summary.total_known_objects||0)<=0){if(status)status.textContent='Satellite source refresh is paused for provider review; there are no cached orbit records to display. No upstream refresh request will be repeated.';return}
 if(state.satellitePageLoading)return;
 if(reset){state.catalog=[];state.catalogAfter=null;state.catalogHasMore=false;state.plottedSatellites=0}
 state.satellitePageLoading=true;renderSummaries();
 try{
  if(!state.map)attachMap();
  const d=await rpc('bridgepoint_public_satellite_orbits_v5926',{p_after_id:state.catalogAfter,p_limit:2500},16000);
  if(!Array.isArray(d?.items))throw new Error('SATELLITE_CATALOG_RESPONSE_INVALID');
  let imported=0;
  for(const item of d.items){
   if(!item?.omm||!/^\d{1,9}$/.test(String(item.norad_cat_id||'')))continue;
   if(!state.catalog.some(x=>String(x.norad_cat_id)===String(item.norad_cat_id))){
    state.catalog.push({norad_cat_id:String(item.norad_cat_id),object_name:item.object_name||('NORAD '+item.norad_cat_id),object_type:item.object_type||item.omm.OBJECT_TYPE||'UNKNOWN',epoch:item.epoch,omm:item.omm,source_key:item.source_key||d.source_key||summary.source_key||'PUBLIC_TLE_API',source_url:item.source_url||d.source_url||summary.source_url||SOURCE});
    imported++;
   }
  }
  state.catalogAfter=d.next_after_id||state.catalogAfter;state.catalogHasMore=!!d.has_more;
  state.catalogKnown=Number(d.total_known_objects||state.catalogKnown||0);
  await loadSatLib();
  propagateCatalog();state.lastSatelliteAt=Date.now();
  if(status)status.textContent='Loaded '+fmt(imported)+' new OMM records in this page · '+fmt(state.catalog.length)+' in memory of '+fmt(state.catalogKnown)+' cached source records. Satellite positions are propagated estimates, not telemetry.';
  renderSummaries();
 }catch(e){
  console.warn('BridgePoint satellite propagation',e);
  if(status&&!summary.operator_review_required)status.textContent='Satellite layer unavailable: '+safeText(e.message||e,160)+'. Catalog/source counters remain visible; no placeholder points were drawn.';
 }finally{state.satellitePageLoading=false;renderSummaries()}
}
function propagateOne(item,lib,date){
 try{
  if(!item._bpSatrec){const raw=item.omm||{};item._bpSatrec=raw.line1&&raw.line2&&typeof lib.twoline2satrec==='function'?lib.twoline2satrec(raw.line1,raw.line2):lib.json2satrec(raw);}
  const p=lib.propagate(item._bpSatrec,date);
  if(!p?.position||item._bpSatrec?.error>0)return null;
  const gmst=lib.gstime(date),geo=lib.eciToGeodetic(p.position,gmst);
  const lat=lib.degreesLat(geo.latitude),lon=lib.degreesLong(geo.longitude),alt=geo.height;
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(alt)||lat < -90||lat>90||lon < -180||lon>180)return null;
  return {lat,lon,alt};
 }catch(_){return null}
}
function propagateCatalog(){
 if(!state.satelliteEnabled||!state.satApi||!state.map)return;
 const now=new Date(),features=[];
 for(const item of state.catalog){
  const epoch=Date.parse(item.epoch||item.omm?.EPOCH||'');
  if(Number.isFinite(epoch)&&now.getTime()-epoch>45*86400000)continue;
  const g=propagateOne(item,state.satApi,now);if(!g)continue;
  features.push({type:'Feature',geometry:{type:'Point',coordinates:[g.lon,g.lat]},properties:{
   norad_cat_id:item.norad_cat_id,object_name:item.object_name,object_type:String(item.object_type||item.omm?.OBJECT_TYPE||'UNKNOWN').toUpperCase(),
   latitude:g.lat,longitude:g.lon,altitude_km:g.alt,epoch:item.epoch||item.omm?.EPOCH||null,
   source_key:item.source_key||state.summaries.satellite?.source_key||'PUBLIC_TLE_API',source_url:item.source_url||state.summaries.satellite?.source_url||SOURCE,truth_class:'PROPAGATED_ORBIT_ESTIMATE'
  }});
  if(state.selectedSatellite&&String(state.selectedSatellite.id)===String(item.norad_cat_id)){
   state.selectedSatellite.latitude=g.lat;state.selectedSatellite.longitude=g.lon;state.selectedSatellite.altitudeKm=g.alt;
   if(state.followSatellite&&state.map){try{state.map.easeTo({center:[g.lon,g.lat],zoom:Math.max(state.map.getZoom(),4.8),duration:500})}catch(_){}}
  }
 }
 state.plottedSatellites=features.length;
 buildLayers();setData('bpV5926Satellites',{type:'FeatureCollection',features});
 void drawSelectedSatelliteTrail();renderSummaries();
}
async function drawSelectedSatelliteTrail(){
 const s=state.selectedSatellite;if(!s||!state.satApi||!state.satelliteEnabled){setData('bpV5926SatelliteTrail',EMPTY);return}
 const item=state.catalog.find(x=>String(x.norad_cat_id)===String(s.id));if(!item)return;
 const now=Date.now(),coords=[];
 for(let minute=-25;minute<=90;minute+=3){
  const pos=propagateOne(item,state.satApi,new Date(now+minute*60000));if(pos)coords.push([pos.lon,pos.lat]);
 }
 setData('bpV5926SatelliteTrail',coords.length>1?{type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'LineString',coordinates:coords},properties:{norad_cat_id:s.id,source_key:item.source_key||state.summaries.satellite?.source_key||'PUBLIC_TLE_API',source_url:item.source_url||state.summaries.satellite?.source_url||SOURCE,truth_class:'PROPAGATED_ORBIT_PATH_ESTIMATE'}}]}:EMPTY);
}
function followSat(){
 const s=state.selectedSatellite;if(!s||!state.map){setStatus('Select a satellite point first.');return}
 state.followSatellite=!state.followSatellite;state.followAircraft=false;
 if(state.followSatellite){try{state.map.easeTo({center:[s.longitude,s.latitude],zoom:Math.max(state.map.getZoom(),5),duration:850,pitch:Math.max(state.map.getPitch(),35)})}catch(_){}}
 const btn=$('bpm-sat-follow');if(btn)btn.textContent=state.followSatellite?'Stop satellite follow':'Follow selected satellite';
 renderSummaries();
}
function followPlane(){
 const a=state.selectedAircraft;if(!a||!state.map){setStatus('Select an aircraft point first.');return}
 state.followAircraft=!state.followAircraft;state.followSatellite=false;
 if(state.followAircraft){try{state.map.easeTo({center:[a.lon,a.lat],zoom:Math.max(state.map.getZoom(),6.5),duration:850,pitch:Math.max(state.map.getPitch(),45)})}catch(_){}}
 const btn=$('bpm-plane-follow');if(btn)btn.textContent=state.followAircraft?'Stop aircraft follow':'Follow selected aircraft';
 renderSummaries();
}
function setAircraftData(aircraft){
 const selectedHex=state.selectedAircraft?.hex,features=[];
 for(const a of aircraft||[]){
  const lon=Number(a.lon),lat=Number(a.lat);if(!Number.isFinite(lon)||!Number.isFinite(lat)||lat<-90||lat>90||lon<-180||lon>180)continue;
  const hex=String(a.hex||'').toLowerCase(),callsign=String(a.flight||'').trim(),alt=typeof a.alt_baro==='number'?Math.round(a.alt_baro)+' ft':String(a.alt_baro||'unknown');
  features.push({type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{
   hex,callsign:callsign||hex,lat,lon,altitude:alt,track:Number(a.track)||0,
   groundspeed:Number(a.gs)||0,category:String(a.category||''),seen_position_sec:Number(a.seen_pos)||null,
   selected:!!selectedHex&&hex===selectedHex,source_key:'ADSB_LOL_OPEN_FEED',truth_class:'PUBLIC_ADSB_POSITION',
   source_attribution:'ADSB.lol · Open Data Commons Open Database License (ODbL) 1.0'
  }});
  if(selectedHex&&hex===selectedHex){
   state.selectedAircraft={...state.selectedAircraft,hex,callsign:callsign||hex,lat,lon,altitude:alt,track:Number(a.track)||0};
   if(state.followAircraft&&state.map){try{state.map.easeTo({center:[lon,lat],zoom:Math.max(state.map.getZoom(),6.5),duration:600})}catch(_){}}
  }
 }
 state.aircraft=aircraft||[];buildLayers();setData('bpV5926Aircraft',{type:'FeatureCollection',features});renderSummaries();
}
async function refreshFlights(force){
 if(!state.aircraftEnabled||state.flightLoading||!state.map)return;
 state.flightLoading=true;const status=$('bpm-flight-status-v5926');
 try{
  const c=state.followAircraft&&state.selectedAircraft?{lng:state.selectedAircraft.lon,lat:state.selectedAircraft.lat}:state.map.getCenter();
  const url=FLIGHT_ROOT+encodeURIComponent(Number(c.lat).toFixed(4))+'/'+encodeURIComponent(Number(c.lng).toFixed(4))+'/250';
  const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),12000);
  let d;try{const res=await fetch(url,{method:'GET',headers:{'Accept':'application/json'},cache:'no-store',signal:ctl.signal});if(!res.ok)throw new Error('ADSB.lol HTTP '+res.status);d=await res.json()}finally{clearTimeout(timeout)}
  const rows=Array.isArray(d?.aircraft)?d.aircraft:[];
  setAircraftData(rows);state.lastFlightAt=Date.now();
  if(status)status.textContent='ADSB.lol: '+fmt(rows.length)+' aircraft returned for a 250-nautical-mile search around '+c.lat.toFixed(2)+', '+c.lng.toFixed(2)+'. Not a global/uniform aircraft feed. Updated '+new Date(state.lastFlightAt).toLocaleTimeString()+'.';
 }catch(e){console.warn('BridgePoint nearby aircraft',e);if(status)status.textContent='Live aircraft request failed or unavailable: '+safeText(e.message||e,130)+'. Existing static transport layers remain intact.'}
 finally{
  state.flightLoading=false;
  if(state.aircraftEnabled){clearTimeout(state.flightTimer);state.flightTimer=setTimeout(()=>refreshFlights(false),45000)}
 }
}
function syncLayerVisibility(){const m=state.map;if(!m)return;for(const [id,on] of [['bp-v5926-satellite-trail',state.satelliteEnabled],['bp-v5926-satellite-points',state.satelliteEnabled],['bp-v5926-aircraft-points',state.aircraftEnabled]]){try{if(m.getLayer(id))m.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}}}
async function setSatellitesEnabled(on){state.satelliteEnabled=!!on;if(!state.map)attachMap();if(state.map){buildLayers();syncLayerVisibility()}const t=$('bpm-sat-enable');if(t)t.checked=state.satelliteEnabled;if(state.satelliteEnabled)await loadSatellitePage(true);else{state.selectedSatellite=null;state.followSatellite=false;setData('bpV5926Satellites',EMPTY);setData('bpV5926SatelliteTrail',EMPTY)}syncLayerVisibility();renderSummaries();return state.satelliteEnabled}
async function setAircraftEnabled(on){state.aircraftEnabled=!!on;if(!state.map)attachMap();if(state.map){buildLayers();syncLayerVisibility()}const t=$('bpm-flight-enable');if(t)t.checked=state.aircraftEnabled;if(state.aircraftEnabled)await refreshFlights(true);else{state.followAircraft=false;state.selectedAircraft=null;state.aircraft=[];setData('bpV5926Aircraft',EMPTY);clearTimeout(state.flightTimer)}syncLayerVisibility();renderSummaries();return state.aircraftEnabled}

function setStatus(message){const n=$('bpm-sat-status-v5926');if(n)n.textContent=message}
function open(){
 if(!addPanel())return false;
 const panel=document.querySelector('[data-bpv-pane="controls"]');
 if(panel){panel.hidden=false;panel.removeAttribute('hidden')}
 if(state.map){buildLayers()}
 return true;
}
function boot(){
 addPanel();attachMap();void refreshSummaries();
 if(state.satelliteEnabled&&state.summaries.satellite?.total_known_objects>0&&!state.summaries.satellite.operator_review_required)void loadSatellitePage(true);
 if(state.summaryTimer===null)state.summaryTimer=setInterval(()=>{if(!document.hidden){addPanel();void refreshSummaries()}},5*60*1000);
}
window.__BP_GLOBAL_MOTION_V5926__={version:5926,open,refreshSummaries,loadSatellitePage,refreshFlights,followSat,followPlane,setSatellitesEnabled,setAircraftEnabled,state};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
const observer=new MutationObserver(()=>{if(!$('bp-global-motion-v5926'))addPanel();if(!state.map)attachMap()});
if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>{addPanel();attachMap();void refreshSummaries()},{once:true});
})();