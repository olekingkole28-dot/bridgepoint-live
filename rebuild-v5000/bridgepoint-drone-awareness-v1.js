(()=>{
'use strict';
if(window.__BP_DRONE_AWARENESS_V1__)return;
const VERSION=3;
const SOURCE='bp-drone-awareness-live-source-v3';
const LAYER='bp-drone-awareness-live-dots-v3';
const TRAIL_SOURCE='bp-drone-awareness-trail-source-v3';
const TRAIL_GLOW='bp-drone-awareness-trail-glow-v3';
const TRAIL_LAYER='bp-drone-awareness-trail-lines-v3';
const TRAIL_DOT_SOURCE='bp-drone-awareness-trail-dots-source-v3';
const TRAIL_DOT_LAYER='bp-drone-awareness-trail-dots-v3';
const DRONE_3D_LAYER='bp-drone-awareness-3d-models-v3';
const THREE_URL='./vendor/three.module.js?v=169-local';
const MAX_TRACKED_DRONES=180;
const MAX_TRAIL_POINTS=24;
const TRACK_RETENTION_MS=45*60*1000;
const REFRESH_MS=180000;
const REQUEST_TIMEOUT_MS=9000;
const SUPPORTED_SOURCE='https://api.adsb.lol/v2/';
const REGION_RADIUS_NM=250;
const WORLD_CIRCUMFERENCE_M=40075016.686;const $=s=>document.querySelector(s);
const DroneCore=(()=>{
 const FEET_TO_METERS=0.3048;
 function buildRequestUrl(sample){
  if(!sample||!Number.isFinite(Number(sample.lat))||!Number.isFinite(Number(sample.lon)))throw new Error('Invalid regional sample coordinates');
  return SUPPORTED_SOURCE+'lat/'+encodeURIComponent(Number(sample.lat).toFixed(4))+'/lon/'+encodeURIComponent(Number(sample.lon).toFixed(4))+'/dist/'+REGION_RADIUS_NM;
 }
 function parseResponse(payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Invalid ADSB.lol response: expected a JSON object');
  if(!Array.isArray(payload.ac))throw new Error('Invalid ADSB.lol response: expected the ac aircraft array');
  return{records:payload.ac,total:Number.isFinite(Number(payload.total))?Number(payload.total):payload.ac.length,message:String(payload.msg||'')};
 }
 function isUavRecord(a){return DroneCore.isUavRecord(a)}
function centerAndZoom(){
 if(!map)return null;
 const c=map.getCenter?.();if(!c)return null;
 return{lat:Number(c.lat),lon:Number(c.lng),zoom:Number(map.getZoom?.()||0)};
}
const GLOBAL_SAMPLES=[
 {id:'North America · East',lat:40.7,lon:-74.0},
 {id:'North America · Central',lat:39.1,lon:-96.8},
 {id:'North America · West',lat:34.1,lon:-118.2},
 {id:'Central America · Panama',lat:9.0,lon:-79.5},
 {id:'South America · Southeast',lat:-23.6,lon:-46.6},
 {id:'Europe · West',lat:51.5,lon:-0.1},
 {id:'Europe · Central',lat:52.2,lon:21.0},
 {id:'Middle East · Gulf',lat:25.2,lon:55.3},
 {id:'South Asia · West',lat:19.1,lon:72.9},
 {id:'East Asia · Japan',lat:35.7,lon:139.7},
 {id:'Southeast Asia · Singapore',lat:1.35,lon:103.8},
 {id:'Africa · South',lat:-26.2,lon:28.0},
 {id:'Australia · East',lat:-33.9,lon:151.2}
];
async function getSample(sample){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
 requestControllers.add(controller);let url='';
 try{
  url=DroneCore.buildRequestUrl(sample);
  const response=await fetch(url,{method:'GET',cache:'no-store',signal:controller.signal,headers:{'Accept':'application/json'}});
  const body=await response.text();
  if(!response.ok)throw new Error('HTTP '+response.status+(response.statusText?' '+response.statusText:'')+(body?' · '+body.replace(/\\s+/g,' ').slice(0,220):''));
  let payload;
  try{payload=JSON.parse(body)}catch(error){throw new Error('Invalid JSON response: '+String(error?.message||error)+' · body: '+body.replace(/\\s+/g,' ').slice(0,180))}
  const parsed=DroneCore.parseResponse(payload);
  return{sample,requestUrl:url,ok:true,records:parsed.records,responseTotal:parsed.total,message:parsed.message,receivedAt:Date.now(),error:null};
 }catch(error){
  return{sample,requestUrl:url,ok:false,records:[],error:error?.name==='AbortError'?'Request timed out after '+REQUEST_TIMEOUT_MS+' ms':String(error?.message||error),errorName:String(error?.name||'Error'),receivedAt:Date.now()};
 }finally{clearTimeout(timer);requestControllers.delete(controller)}
}
async function fetchGlobalSamples(){
 const results=[];
 diagnosticState.regionalRequestsAttempted=0;diagnosticState.regionalRequestsCompleted=0;
 diagnosticState.regionalResults=GLOBAL_SAMPLES.map(sample=>({sample,status:'pending',ok:false,records:[],error:null}));
 writeSummary();
 // Concurrent batches of three keep request pressure bounded against the API's dynamic limits.
 for(let i=0;i<GLOBAL_SAMPLES.length;i+=3){
  if(!enabled)throw new Error('Drone Awareness was turned off');
  const batchSamples=GLOBAL_SAMPLES.slice(i,i+3);
  diagnosticState.regionalRequestsAttempted+=batchSamples.length;writeSummary();
  const batch=await Promise.all(batchSamples.map(getSample));results.push(...batch);
  for(const result of batch){
   const slot=diagnosticState.regionalResults.find(item=>item.sample.id===result.sample.id);
   if(slot)Object.assign(slot,{status:result.ok?'complete':'failed',ok:result.ok,records:result.records,error:result.error||null,requestUrl:result.requestUrl||''});
  }
  diagnosticState.regionalRequestsCompleted=results.filter(result=>result.ok).length;writeSummary();
  showStatus('Regional ADS-B requests: '+results.length+'/'+GLOBAL_SAMPLES.length+' attempted; '+diagnosticState.regionalRequestsCompleted+' completed successfully.',batch.some(item=>!item.ok)?'error':'info');
 }
 return results;
}
async function refresh(force=false){
 if(!enabled||!map||inFlight)return;
 if(!mapStyleReady()){activationQueued=true;showStatus('Drone Awareness is active and waiting for the MapLibre style. Sampling will resume automatically when the globe is ready.','info');return}
 const remaining=15000-(Date.now()-lastFetchAt);
 if(!force&&remaining>0)return;
 if(force&&remaining>0){showStatus('Public source refresh is briefly rate-limited. Next refresh is available in '+Math.ceil(remaining/1000)+' seconds.');return}
 inFlight=true;lastFetchAt=Date.now();if(refreshButton)refreshButton.disabled=true;
 diagnosticState.aircraftRecordsReceived=0;diagnosticState.uavRecordsIdentified=0;diagnosticState.invalidOrStaleRecords=0;diagnosticState.currentPositionsAccepted=0;diagnosticState.modelsRendered=0;diagnosticState.localSample=null;writeSummary();
 showStatus('Requesting live public ADS-B data from '+GLOBAL_SAMPLES.length+' regional windows (up to '+REGION_RADIUS_NM+' NM each)…');
 try{
  const samples=await fetchGlobalSamples();if(!enabled)return;
  const good=samples.filter(sample=>sample.ok),records=good.flatMap(sample=>sample.records),center=centerAndZoom();
  if(center&&center.zoom>=6){
   diagnosticState.localSample={status:'pending',ok:false,records:[],error:null};writeSummary();
   const local=await getSample({id:'Current map view',lat:center.lat,lon:center.lon});
   diagnosticState.localSample={status:local.ok?'complete':'failed',ok:local.ok,records:local.records,error:local.error||null,requestUrl:local.requestUrl||''};
   if(local.ok)records.push(...local.records);writeSummary();
  }
  if(!enabled)return;
  diagnosticState.aircraftRecordsReceived=records.length;
  const result=updateTrackedUavs(records),failures=samples.filter(sample=>!sample.ok);
  const errors=failures.slice(0,3).map(sample=>sample.sample.id+': '+sample.error).join(' · ');
  let message='';
  if(good.length===0)message='All '+samples.length+' regional ADS-B requests failed. No zero-drone conclusion is possible. '+(errors||'See the regional request rows for the actual errors.');
  else if(records.length>0&&result.identified===0)message=good.length+'/'+samples.length+' regional requests succeeded and returned '+records.length+' aircraft records, but none were identified as UAVs (no B6/UAV-class records in this sample).';
  else if(result.positions===0&&result.identified>0)message=result.identified+' UAV records were identified; '+result.rejected+' invalid/stale UAV records were rejected and no current positions were accepted.';
  else if(records.length===0)message='Requests succeeded, but the responding sample areas returned no aircraft records. These regional samples do not represent worldwide coverage.';
  else message='Updated '+new Date().toLocaleTimeString()+' · '+result.positions+' current UAV positions accepted · '+result.models+' 3D models rendered (close zoom, source altitude only) · '+result.trailPoints+' historical points · '+result.trails+' altitude-aware 3D trail segments.';
  if(failures.length)message+=' '+failures.length+' regional request(s) failed: '+errors+(failures.length>3?' · More details are listed by region below.':'');
  if(drone3DError)message+=' 3D renderer error: '+drone3DError;
  showStatus(message,failures.length||good.length===0||drone3DError?'error':(result.positions||records.length===0?'ok':'info'));
  const feedMeta=$('#bp-drone-feed-meta');
  if(feedMeta)feedMeta.textContent='Source: ADSB.lol public community ADS-B API · '+good.length+'/'+samples.length+' regional responses succeeded · radius '+REGION_RADIUS_NM+' NM per request. '+(center&&center.zoom>=6?'A separate close-zoom local sample is supplemental. ':'')+'Partial geographic sampling only; not a worldwide drone registry. Most consumer drones do not broadcast ADS-B.';
 }catch(error){
  if(enabled)showStatus('Live ADS-B sampling failed: '+String(error?.message||error)+'. Regional request outcomes remain visible below. No fabricated positions or trails are used.','error');
 }finally{inFlight=false;if(refreshButton)refreshButton.disabled=false}
}
function openDronePanel(){
 if(!pane)return;
 const p=$('#bpv-sidecar');if(!p)return;
 p.hidden=false;p.dataset.panel='drones';document.body.classList.add('bpv-panel-open');
 const title=$('#bpv-sidecar-title');if(title)title.textContent='BRIDGEPOINT DRONE AWARENESS';
 p.querySelectorAll('[data-bpv-pane]').forEach(s=>{s.hidden=s!==pane});
 p.querySelectorAll('[data-bpv-panel]').forEach(b=>{b.classList.toggle('active',b.dataset.bpvPanel==='drones');b.setAttribute('aria-pressed',String(b.dataset.bpvPanel==='drones'))});
 const dock=$('#bpv-dock'),expand=dock?.querySelector('[data-bpv-dock-expand]');
 if(dock){dock.classList.add('bpv-dock-maximized');if(expand){expand.textContent='RESTORE ↘';expand.setAttribute('aria-pressed','true')}}
}
function scheduleDroneRefresh(){
 if(refreshTimer)clearInterval(refreshTimer);
 refreshTimer=setInterval(()=>{if(enabled&&!document.hidden)void refresh(false)},REFRESH_MS);
}
async function activateWhenStyleReady(){
 if(!enabled)return false;
 if(!map||!mapStyleReady()){
  activationQueued=true;
  showStatus('Drone Awareness is on. Activation is queued until the globe and MapLibre style finish initializing; sampling starts automatically.','info');
  return false;
 }
 if(activationPromise)return activationPromise;
 const generation=activationGeneration;activationQueued=false;
 activationPromise=(async()=>{
  if(!installLayer()){activationQueued=true;showStatus('Drone Awareness is queued while MapLibre finishes preparing its style. It will retry automatically.','info');return false}
  setLayerVisibility(true);
  try{
   const THREE=await loadDroneThree();
   if(!enabled||generation!==activationGeneration)return false;
   if(!ensureDrone3DLayer(THREE))throw new Error('3D drone layer could not attach to the initialized globe');
   setDroneModels(lastCurrentRecords);rebuildDroneTrails();drone3DError=null;
  }catch(error){drone3DError=String(error?.message||error);showStatus('Position markers can still load, but 3D model renderer initialization failed: '+drone3DError,'error')}
  if(!enabled||generation!==activationGeneration)return false;
  window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('drones',true);
  scheduleDroneRefresh();void refresh(false);return true;
 })().finally(()=>{activationPromise=null;if(enabled&&activationQueued&&mapStyleReady())void activateWhenStyleReady()});
 return activationPromise;
}
async function toggle(){
 openDronePanel();
 if(!enabled){
  enabled=true;activationGeneration++;activationQueued=true;updateButton();
  showStatus('Drone Awareness is on. It will start automatically when the globe style is ready; no second press is needed.','info');
  void activateWhenStyleReady();return;
 }
 enabled=false;activationGeneration++;activationQueued=false;updateButton();
 if(refreshTimer)clearInterval(refreshTimer);refreshTimer=0;clearTimeout(moveTimer);aborter?.abort();
 for(const controller of requestControllers)try{controller.abort()}catch(_){}requestControllers.clear();
 setLayerVisibility(false);clearTrackedUavs();removeDrone3DLayer();
 window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('drones',false);
 showStatus('Drone Awareness is off. Session positions and tracks were cleared; no background regional requests are running.');
}
function createPane(panel){
 if(!panel)return null;
 let existing=panel.querySelector('[data-bpv-pane="drones"]');if(existing)return existing;
 const p=element('section','bp-drone-pane');p.dataset.bpvPane='drones';p.hidden=true;
 p.append(element('div','bp-drone-headline','OPT-IN · PUBLIC ADS-B UAV POSITIONS + ALTITUDE-AWARE 3D TRACKS'));
 p.append(element('div','bp-drone-feed-note','At whole-Earth and mid zoom, visible map markers remain anchored to source-reported coordinates. At close zoom, a 3D quadcopter is rendered only when its ADS-B record supplies a usable altitude. Model display size is independent of its real geographic anchor.'));
 p.append(element('div','bp-drone-feed-note','DATA LIMIT · '+GLOBAL_SAMPLES.length+' regional ADS-B sample hubs, each up to '+REGION_RADIUS_NM+' NM, plus one supplemental local-view sample at close zoom. This is not complete worldwide coverage. Most consumer drones do not broadcast ADS-B. Remote ID: NOT CONNECTED — no authorized receiver/network provider credentials are configured. No private networks, unauthorized radio interception, or pilot/control-station locations are used.'));
 const summary=element('div','bp-drone-summary');summary.id='bp-drone-summary-v3';p.append(summary);summaryNode=summary;
 const status=element('div','bp-drone-status','Drone Awareness is off. Press to queue activation and request public ADS-B data.');status.id='bp-drone-status-v3';status.dataset.kind='info';p.append(status);statusNode=status;
 const regions=element('div','bp-drone-cells');regions.id='bp-drone-regional-status-v3';p.append(regions);regionalStatusNode=regions;
 const actions=element('div','bp-drone-actions');
 const refreshBtn=element('button','bpv-wide-action','REFRESH REGIONAL UAV SAMPLE');refreshBtn.type='button';refreshBtn.addEventListener('click',()=>void refresh(true));actions.append(refreshBtn);refreshButton=refreshBtn;
 const off=element('button','bpv-wide-action','TURN DRONE AWARENESS OFF');off.type='button';off.addEventListener('click',()=>{if(enabled)void toggle();else{updateButton();showStatus('Drone Awareness is already off.')}});actions.append(off);p.append(actions);
 const meta=element('div','bp-drone-feed-note','Positions refresh every 3 minutes while enabled. Requests run in staggered groups of three to respect dynamic public API limits. Each regional request outcome is shown above.');meta.id='bp-drone-feed-meta';p.append(meta);
 trailNoteNode=element('div','bp-drone-feed-note','Tracks are bounded to '+MAX_TRAIL_POINTS+' observations per aircraft. Lines use source altitude only and split across stale/missing observations.');p.append(trailNoteNode);
 const source=element('div','bp-drone-footnote');source.append(document.createTextNode('Source: '));
 const link=element('a','bp-drone-source','ADSB.lol API documentation');link.href='https://api.adsb.lol/docs/open-data/api/';link.target='_blank';link.rel='noopener noreferrer';source.append(link);
 source.append(document.createTextNode(' · ODbL 1.0. Position markers show public broadcast aircraft positions only. No pilot/control station positions or raw RF scans.'));
 p.append(source);panel.append(p);writeSummary();return p;
}
function updateWaterButton(){
 if(!waterButton)return;
 waterButton.classList.toggle('active',waterEnabled);
 waterButton.setAttribute('aria-pressed',String(waterEnabled));
 const label=waterButton.querySelector('.bpv-command-label');setLabelTextIfChanged(label,waterEnabled?'Water + Flow · ON':'Water + Flow');
 waterButton.title=waterEnabled?'Turn off the animated water/hydrology surface':'Load the optional water/hydrology surface';
}
async function toggleWater(){
 if(!map)throw new Error('BridgePoint globe is not ready');
 if(typeof window.__BP_TOGGLE_WATER__==='function'){
  const result=await window.__BP_TOGGLE_WATER__();
  waterEnabled=result===true;
  window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('water',waterEnabled);
  updateWaterButton();hideDefaultOverlays();return waterEnabled;
 }
 if(waterEnabled){
  waterEnabled=false;window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('water',false);
  if(waterApi){waterApi.active=false;waterApi.setEnabled?.(false)}
  try{if(map.getLayer('bp-water-surface-gpu-v6123'))map.setLayoutProperty('bp-water-surface-gpu-v6123','visibility','none')}catch(_){}
  updateWaterButton();return false;
 }
 if(!waterApi){
  if(!waterPromise){
   const world={map};
   waterPromise=import('./world-v2300-water.js?v=6194-stable-water-low-cost')
    .then(m=>{
     const api=m.initWaterEngine(world,{surface:location.pathname.startsWith('/app/')?'app':'landing'});
     if(!api)throw new Error('Water surface engine did not initialize');
     waterApi=api;
     if(location.pathname.startsWith('/app/'))window.__BP_WATER_ENGINE_APP_V6123__=api;
     else window.__BP_WATER_ENGINE_LANDING_V6123__=api;
     return api;
    }).finally(()=>{waterPromise=null});
  }
  await waterPromise;
 }
 if(!waterApi)throw new Error('Water surface engine unavailable');
 waterEnabled=true;waterApi.active=true;
 window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('water',true);
 if(typeof waterApi.setEnabled==='function')waterApi.setEnabled(true);
 try{if(map.getLayer('bp-water-surface-gpu-v6123'))map.setLayoutProperty('bp-water-surface-gpu-v6123','visibility','visible')}catch(_){}
 updateWaterButton();return true;
}
function addButton(){
 const grid=$('[data-bpv-command-grid="environment"]');if(!grid)return false;
 let b=grid.querySelector('[data-bp-drone-awareness-button="1"]');
 if(!b){
  b=element('button','bpv-command-btn','');
  b.type='button';b.dataset.bpDroneAwarenessButton='1';b.dataset.bpvAction='drones';
  b.title='Show live public UAV positions, 3D drone models and observed flight trails';
  b.innerHTML='<span class="bpv-command-icon" aria-hidden="true">⌁</span><span class="bpv-command-label">Drone Awareness</span>';
  b.addEventListener('click',toggle);grid.append(b);
 }
 button=b;updateButton();
 let wb=grid.querySelector('[data-bp-water-flow-button="1"]');
 if(!wb){
  wb=element('button','bpv-command-btn','');wb.type='button';wb.dataset.bpWaterFlowButton='1';wb.dataset.bpvAction='water';
  wb.title='Load or hide the optional water/hydrology surface';
  wb.innerHTML='<span class="bpv-command-icon" aria-hidden="true">≈</span><span class="bpv-command-label">Water + Flow</span>';
  wb.addEventListener('click',async()=>{
   wb.disabled=true;
   try{await toggleWater();window.__BP_SHOW_ACTION_NOTICE__?.(waterEnabled?'Water + Flow is enabled.':'Water + Flow is off.')}
   catch(e){window.__BP_SHOW_ACTION_NOTICE__?.('Water + Flow failed: '+String(e?.message||e));console.warn('BridgePoint Water + Flow',e)}
   finally{wb.disabled=false;updateWaterButton()}
  });
  grid.append(wb);
 }
 waterButton=wb;updateWaterButton();
 return true;
}

function hideDefaultOverlays(){
 if(!emptyModeActive||!emptyModeMap||sweepFrame)return;
 sweepFrame=requestAnimationFrame(()=>{
  sweepFrame=0;if(!emptyModeActive||!emptyModeMap)return;
  ensureInitialBaseLayers();
  let layers=[];
  try{layers=emptyModeMap.getStyle?.()?.layers||[]}catch(_){return}
  for(const layer of layers){
   if(!isManagedOptionalOverlay(layer.id)||layerAllowed(layer.id))continue;
   try{
    if((emptyModeMap.getLayoutProperty(layer.id,'visibility')||'visible')!=='none')emptyModeMap.setLayoutProperty(layer.id,'visibility','none');
   }catch(_){}
  }
 });
}
function stopEmptyMode(){
 if(!emptyModeActive)return;emptyModeActive=false;
 if(emptyModeMap&&emptyModeHandler){try{emptyModeMap.off('styledata',emptyModeHandler);emptyModeMap.off('idle',emptyModeHandler)}catch(_){}}
 if(sweepFrame)cancelAnimationFrame(sweepFrame);sweepFrame=0;
}
function installEmptyMode(m){
 if(!m||emptyModeMap===m)return;
 if(emptyModeMap&&emptyModeHandler){try{for(const event of ['styledata','style.load','idle','moveend','zoomend','rotateend','pitchend'])emptyModeMap.off(event,emptyModeHandler)}catch(_){}}
 emptyModeMap=m;emptyModeHandler=hideDefaultOverlays;
 // Map LOD + weather modules may reset visibility when a camera settles. Reapply
 // the opt-in allowlist after each settled camera/style event, not continuously.
 try{for(const event of ['style.load','idle','moveend','zoomend','rotateend','pitchend'])m.on(event,hideDefaultOverlays)}catch(_){}
 hideDefaultOverlays();
}
function bindStartMode(){
 document.addEventListener('click',e=>{
  if(!emptyModeActive)return;
  const target=e.target?.closest?.('.bpv-dock [data-bpv-action], .bpv-dock [data-bpv-panel], .bpv-dock [data-bpv-slot-action], #bpv-mapkey-rail, .map-tools button, .bpv-contained-control button');
  if(!target)return;
  const category=categoryForTarget(target);
  if(!category)return;
  if(category!=='parcels')allowedCategories.add(category);
  hideDefaultOverlays();
  // The existing toggle owns on/off state. If it ended off, remove just that
  // category from the opt-in allowlist; unrelated layers stay hidden.
  setTimeout(()=>{
   if(category==='parcels')parcelLayerEnabled=target.classList.contains('active')||target.getAttribute('aria-pressed')==='true';
   if(category==='buildings'&&!target.classList.contains('active')&&target.getAttribute('aria-pressed')!=='true')allowedCategories.delete(category);
   hideDefaultOverlays();
  },0);
 },true);
}
function tryBoot(){
 addStyle();addButton();
 const panel=$('#bpv-sidecar');if(panel){pane=createPane(panel)}
 const current=worldMap();
 if(current){
  if(map!==current){
   map=current;installEmptyMode(map);
   map.on?.('style.load',()=>{if(enabled){activationQueued=true;void activateWhenStyleReady()}else installLayer()});
   map.on?.('idle',()=>{if(enabled&&activationQueued)void activateWhenStyleReady()});
   map.on?.('moveend',()=>{if(!enabled)return;setDroneModels(lastCurrentRecords);rebuildDroneTrails();clearTimeout(moveTimer);moveTimer=setTimeout(()=>void refresh(false),1800)});
   map.on?.('zoomend',()=>{if(enabled){setDroneModels(lastCurrentRecords);rebuildDroneTrails()}});
  }
  installLayer();
  if(enabled&&activationQueued)void activateWhenStyleReady();
 }
}
function boot(){
 bindStartMode();
 tryBoot();
 let attempts=0;
 const observer=new MutationObserver(()=>{
  tryBoot();
  // Once the late-loading dock controls exist, polling alone is sufficient to
  // discover the map. Disconnect the document-wide observer to avoid UI updates
  // retriggering startup work while the map module is importing.
  if(button&&pane){try{observer.disconnect()}catch(_){}}
 });
 try{observer.observe(document.body,{childList:true,subtree:true})}catch(_){}
 if(button&&pane){try{observer.disconnect()}catch(_){}}
 const timer=setInterval(()=>{
  tryBoot();attempts++;
  if((button&&pane&&map)||attempts>240){clearInterval(timer);try{observer.disconnect()}catch(_){}}
 },250);
 window.__BP_DRONE_AWARENESS_V1__={
  version:VERSION,
  source:'adsb.lol public community ADS-B feed',
  aggregation:GLOBAL_SAMPLES.length+' regional ADS-B sample windows, up to '+REGION_RADIUS_NM+' NM each; partial coverage only; altitude-aware 3D tracks',
  targetLevelDetails:false,
  pilotOrControlStationLocations:false,
  rawRfScanning:false,
  offlineReceiver:false,
  waterToggle:toggleWater,
  allowLayerCategory(category,on=true){
   const key=String(category||'').trim().toLowerCase();
   if(key==='drones')return true;
   if(key==='clouds'){allowedCategories.add('clouds');hideDefaultOverlays();return true}
   if(key==='parcels'){parcelLayerEnabled=!!on;hideDefaultOverlays();return true}
   if(!categoryPatterns[key])return false;
   if(on)allowedCategories.add(key);else allowedCategories.delete(key);
   hideDefaultOverlays();return true;
  },
  toggle,
  refresh:()=>refresh(true),
  get state(){return{enabled,mapReady:!!map,zoom:map?.getZoom?.()??null,layerReady:!!map?.getLayer?.(LAYER),layerVisible:!!map?.getLayer?.(LAYER)&&(map.getLayoutProperty(LAYER,'visibility')||'visible')!=='none',trailLayerReady:!!map?.getLayer?.(TRAIL_LAYER),trailLayerVisible:!!map?.getLayer?.(TRAIL_LAYER)&&(map.getLayoutProperty(TRAIL_LAYER,'visibility')||'visible')!=='none',trailDotsVisible:!!map?.getLayer?.(TRAIL_DOT_LAYER)&&(map.getLayoutProperty(TRAIL_DOT_LAYER,'visibility')||'visible')!=='none',drone3DLayerReady:!!map?.getLayer?.(DRONE_3D_LAYER),drone3DRendererReady:!!droneRenderer&&!!droneScene,currentPositions:lastCurrentRecords.length,observedTrails:[...trackedUavs.values()].filter(t=>t.points.length>1).length,simulatedFleet:false,emptyModeActive,updatedAt:Date.now()}}
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();