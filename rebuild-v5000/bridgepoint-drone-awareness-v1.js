(()=>{
'use strict';
if(window.__BP_DRONE_AWARENESS_V1__)return;
const VERSION=1;
const SOURCE='bp-drone-awareness-source-v1';
const LAYER='bp-drone-awareness-cells-v1';
const MIN_GROUP=1;
const GRID_DEGREES=2;
const REGION_RADIUS_NM=250;
const REFRESH_MS=180000;
const REQUEST_TIMEOUT_MS=9000;
const SUPPORTED_SOURCE='https://api.adsb.lol/v2/';
const $=s=>document.querySelector(s);
const emptyFeatureCollection=()=>({type:'FeatureCollection',features:[]});
let map=null,enabled=false,inFlight=false,refreshTimer=0,moveTimer=0,lastFetchAt=0,aborter=null;
let button=null,waterButton=null,waterApi=null,waterPromise=null,waterEnabled=false,cloudButton=null,cloudApi=null,cloudPromise=null,cloudEnabled=false,pane=null,statusNode=null,summaryNode=null,cellsNode=null,refreshButton=null;
let emptyModeActive=true,emptyModeMap=null,emptyModeHandler=null,sweepFrame=0;
const requestControllers=new Set();
const baseLayers=new Set([
 'gta-bg','gta-water','gta-coast-shadow','gta-coast-edge','gta-coast-foam','gta-landcover','gta-landuse','gta-hillshade',
 'gta-context-building-footprints','gta-context-building-shadow','gta-context-buildings','gta-context-floor-lines','gta-context-roofs','gta-context-facade-detail','gta-context-building-parts',
 'gta-bp-building-shadow','gta-bp-buildings','gta-bp-floor-lines','gta-bp-roofs','gta-bp-facade-detail','gta-bp-building-edge',
 'gta-city-buildings','gta-city-floor-lines','gta-city-building-roof-caps','gta-city-roofs','gta-exact-building','gta-exact-roof','gta-exact-floor-lines',
]);
const parcelLayers=new Set(['gta-parcel','gta-parcel-glow','gta-parcel-halo','bp-public-auto-parcel-glow-v5933','bp-public-auto-parcel-line-v5933']);
let parcelLayerEnabled=true;
const allowedCategories=new Set();
const categoryPatterns={
 parcels:/parcel|cadastral|boundary-viewer/i,
 buildings:/^gta-(?:context-building-footprints|context-building-shadow|context-buildings|context-floor-lines|context-roofs|context-facade-detail|context-building-parts|bp-building-shadow|bp-buildings|bp-floor-lines|bp-roofs|bp-facade-detail|bp-building-edge|city-buildings|city-floor-lines|city-building-roof-caps|city-roofs|exact-building|exact-roof|exact-floor-lines)$/i,
 imagery:/gta-(nasa|esri|usgs|oam)|satellite|spectral-imagery|aerial-imagery/i,
 weather:/weather|\bwx\b|wx-|radar|cloud|rain|lightning|storm|cyclone|tornado|hurricane|wildfire|fire-perimeter|precipitation|present-weather/i,
 wind:/wind|volumetric|\brf\b|signal-field|rf-field/i,
 history:/history|world-change|timeline|time-slider/i,
 opportunities:/opportunity/i,
 listings:/listing/i,
 transport:/road-|bridge-|rail|transportation|transport-mesh/i,
 water:/bp-water-surface|water-surface|waterway-flow|hydrology/i,
 clouds:/cloud-volume|sky-cloud|satellite-cloud|eumetsat-cloud/i
};
function layerAllowed(id){
 if(parcelLayers.has(String(id)))return parcelLayerEnabled;
 if(baseLayers.has(id)||String(id).startsWith('bp-drone-awareness'))return true;
 for(const category of allowedCategories)if(categoryPatterns[category]?.test(String(id)))return true;
 return false;
}
function ensureInitialBaseLayers(){
 // Do not force every whitelisted building sub-layer on: the shared renderer owns
 // building LOD visibility. This gate only hides optional overlays outside the
 // allowlist and leaves the renderer's intended base-layer state untouched.
}
function categoryForTarget(target){
 if(!target)return null;
 const action=String(target.dataset?.bpvAction||'');
 // Opening the fields panel is not itself a layer activation; the panel's own
 // Wind / RF / Drone controls opt their category in only when pressed.
 if(action==='volumetric')return null;
 const actionMap={parcels:'parcels',boundaryviewer:'parcels',worldchanges:'history',weatherfx:'weather',windfx:'wind',volumetric:'wind',satellite:'imagery',opportunities:'opportunities',listings:'listings',water:'water',clouds:'clouds'};
 if(actionMap[action])return actionMap[action];
 if(target.dataset?.layer==='parcels')return'parcels';
 if(target.dataset?.layer==='buildings')return'buildings';
 if(target.dataset?.base==='satellite')return'imagery';
 if(target.id==='toggleLiveContext')return'weather';
 if(target.id==='toggleTransport')return'transport';
 const label=[target.textContent,target.title,target.getAttribute?.('aria-label')].filter(Boolean).join(' ').toLowerCase();
 if(/parcel|boundary|cadastral|lot line/.test(label))return'parcels';
 if(/satellite|aerial|imagery|land color/.test(label))return'imagery';
 if(/building|roof|\b3d\b/.test(label))return'buildings';
 if(/weather|cloud|rain|lightning|storm|radar|hurricane|tornado|wildfire|\bwx\b/.test(label))return'weather';
 if(/wind|\brf\b|signal|volumetric/.test(label))return'wind';
 if(/history|changes|timeline/.test(label))return'history';
 if(/opportunit/.test(label))return'opportunities';
 if(/road|rail|bridge|transport/.test(label))return'transport';
 return null;
}
function worldMap(){
 return window.__BP_LANDING_WORLD__?.map
  ||window.__bpLandingWorldV5420?.map
  ||window.__BP_V5000_WORLD__?.map
  ||window.__BP_V5000_WORLD?.map
  ||window.__bpWorldV2300?.map
  ||window.__BP_WORLD_V2300__?.map
  ||null;
}
function addStyle(){
 if($('#bp-drone-awareness-styles-v1'))return;
 const s=document.createElement('style');s.id='bp-drone-awareness-styles-v1';
 s.textContent='.bp-drone-pane{display:grid;gap:10px;color:#dff7ff}.bp-drone-headline{font-size:11px;font-weight:950;letter-spacing:.09em;color:#77eaff}.bp-drone-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.bp-drone-metric{border:1px solid rgba(107,218,255,.2);background:rgba(5,20,30,.8);border-radius:10px;padding:10px;min-width:0}.bp-drone-metric b{display:block;font-size:20px;color:#70efff}.bp-drone-metric span{display:block;font-size:9px;color:#92b8c7;line-height:1.4}.bp-drone-status{padding:10px;border:1px solid rgba(122,221,255,.2);border-radius:10px;background:rgba(3,16,25,.9);font-size:11px;line-height:1.5;overflow-wrap:anywhere}.bp-drone-status[data-kind=\"error\"]{border-color:rgba(255,165,100,.5);color:#ffd8bc}.bp-drone-status[data-kind=\"ok\"]{border-color:rgba(105,245,185,.35)}.bp-drone-actions{display:flex;flex-wrap:wrap;gap:7px}.bp-drone-actions button{flex:1 1 140px;min-width:0}.bp-drone-feed-note{font-size:10px;line-height:1.5;color:#98b6c4}.bp-drone-source{color:#7ce9ff;overflow-wrap:anywhere}.bpv-mapkey-swatch-drone{background:linear-gradient(90deg,#58cfff,#35e8f4,#62efad,#ffd166,#ff9f68)!important}.bpv-mapkey-swatch-clouds{background:linear-gradient(180deg,#ffffff,#b8c9d4)!important}.bp-drone-cells{display:grid;gap:5px}.bp-drone-cell-row{display:flex;justify-content:space-between;align-items:center;gap:9px;padding:8px 10px;background:rgba(7,29,42,.85);border:1px solid rgba(107,218,255,.16);border-radius:8px;font-size:10px}.bp-drone-cell-row b{color:#d9fbff}.bp-drone-cell-row span{color:#79eaff;white-space:nowrap}.bp-drone-footnote{font-size:9px;line-height:1.5;color:#86a7b7}';
 document.head.appendChild(s);
}
function element(tag,cls,text){
 const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;
}
function showStatus(message,kind='info'){
 if(!statusNode)return;statusNode.textContent=String(message);statusNode.dataset.kind=kind;
}
function updateButton(){
 if(!button)return;
 button.classList.toggle('active',enabled);
 button.setAttribute('aria-pressed',String(enabled));
 const label=button.querySelector('.bpv-command-label');if(label)label.textContent=enabled?'Drone Awareness · ON':'Drone Awareness';
 button.title=enabled?'Turn off aggregated public UAV awareness':'Show an opt-in, coarse regional UAV awareness layer';
}
function writeSummary(cellCount, rawCount){
 if(summaryNode){
  summaryNode.replaceChildren();
  const a=element('div','bp-drone-metric');a.append(element('b','',Number(rawCount||0).toLocaleString()),element('span','','Deduplicated UAV-class ADS-B reports'));
  const b=element('div','bp-drone-metric');b.append(element('b','',String(cellCount)),element('span','','Coarse '+GRID_DEGREES+'° cells shown'));
  summaryNode.append(a,b);
 }
 if(cellsNode&&!cellCount){
  cellsNode.replaceChildren();
  cellsNode.append(element('div','bp-drone-feed-note','No UAV-class ADS-B records were returned in the sampled public coverage windows. This is not a full drone census; most drones do not continuously broadcast ADS-B.'));
 }
}
function setLayerVisibility(on){
 if(!map)return false;
 try{
  const layers=map.getStyle?.()?.layers||[];
  if(!layers.some(x=>x.id===LAYER))return false;
  const setLayoutProperty=(layer,visibility)=>map.setLayoutProperty(layer,'visibility',visibility);
  setLayoutProperty(LAYER,on?'visible':'none');map.triggerRepaint?.();return true;
 }catch(e){return false}
}
function installLayer(){
 if(!map||!map.getStyle?.())return false;
 try{
  if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:emptyFeatureCollection()});
  if(!map.getLayer(LAYER)){
   map.addLayer({id:LAYER,type:'circle',source:SOURCE,minzoom:0,layout:{visibility:'none'},paint:{
    'circle-radius':['+', ['interpolate',['linear'],['zoom'],0,2,2,3.5,5,5,9,7], ['interpolate',['linear'],['get','count'],1,0,4,1.5,12,3,32,5]],
    'circle-color':['interpolate',['linear'],['get','count'],1,'#58cfff',4,'#35e8f4',10,'#62efad',24,'#ffd166',48,'#ff9f68'],
    'circle-opacity':.82,'circle-stroke-color':'#06131c','circle-stroke-width':1.5,'circle-blur':0.02
   }});
  }
  return true;
 }catch(e){console.warn('BridgePoint drone awareness layer setup failed',e);return false}
}
function gridKey(lat,lon){
 const y=Math.max(-90,Math.min(90,Math.floor((lat+90)/GRID_DEGREES)*GRID_DEGREES-90+GRID_DEGREES/2));
 const raw=Math.floor((lon+180)/GRID_DEGREES)*GRID_DEGREES-180+GRID_DEGREES/2;
 const x=Math.max(-179,Math.min(179,raw));
 return String(y.toFixed(1))+','+String(x.toFixed(1));
}
function cellLabel(lat,lon){
 const ns=lat>=0?'N':'S',ew=lon>=0?'E':'W';
 return String(Math.abs(lat)).padStart(2,'0')+'°'+ns+' · '+String(Math.abs(lon)).padStart(3,'0')+'°'+ew+' · '+GRID_DEGREES+'° cell';
}
function isUavRecord(a){
 const category=String(a?.category||a?.emitter_category||'').trim().toUpperCase();
 if(category==='B6'||category==='14'||category==='UAV')return true;
 const description=[a?.desc,a?.description,a?.typeDescription,a?.type,a?.t].filter(Boolean).join(' ');
 return /\b(?:UAV|UAS|UNMANNED AERIAL|UNMANNED AIRCRAFT|DRONE)\b/i.test(description);
}
function aggregate(records){
 const groups=new Map(),seen=new Set();let screened=0,duplicates=0;
 for(const a of Array.isArray(records)?records:[]){
  const lat=Number(a?.lat),lon=Number(a?.lon);
  if(!isUavRecord(a)||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
  const identity=String(a?.hex||a?.icao24||a?.id||([a?.t,a?.lat,a?.lon,a?.seen].join('|')));
  if(seen.has(identity)){duplicates++;continue}seen.add(identity);screened++;
  const key=gridKey(lat,lon);let g=groups.get(key);
  if(!g){g={key,lat:Number(key.split(',')[0]),lon:Number(key.split(',')[1]),count:0};groups.set(key,g)}
  g.count++;
 }
 const features=[];
 for(const g of groups.values()){
  if(g.count<MIN_GROUP)continue;
  features.push({type:'Feature',geometry:{type:'Point',coordinates:[g.lon,g.lat]},properties:{cell:g.key,count:g.count,label:cellLabel(g.lat,g.lon),source:'adsb.lol · ODbL 1.0',aggregation_degrees:GRID_DEGREES,threshold:MIN_GROUP}});
 }
 return{features,screened,duplicates};
}
function renderCells(features){
 if(!cellsNode)return;
 cellsNode.replaceChildren();
 if(!features.length){
  cellsNode.append(element('div','bp-drone-feed-note','No 1° grid cell contained three or more UAV-class ADS-B reports. Sparse cells are intentionally not displayed.'));
  return;
 }
 for(const f of features.slice(0,50)){
  const p=f.properties||{},row=element('div','bp-drone-cell-row');
  row.append(element('b','',p.label||'Aggregated region'),element('span','',String(p.count)+'+ reports'));
  cellsNode.append(row);
 }
 if(features.length>50)cellsNode.append(element('div','bp-drone-feed-note',(features.length-50)+' additional cells are shown on the map but omitted from this list.'));
}
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
 requestControllers.add(controller);
 try{
  const url=SUPPORTED_SOURCE+'lat/'+encodeURIComponent(sample.lat.toFixed(4))+'/lon/'+encodeURIComponent(sample.lon.toFixed(4))+'/dist/'+REGION_RADIUS_NM;
  const response=await fetch(url,{method:'GET',cache:'no-store',signal:controller.signal,headers:{'Accept':'application/json'}});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const data=await response.json();
  return{sample,ok:true,records:Array.isArray(data?.ac)?data.ac:[],receivedAt:Date.now()};
 }catch(error){
  return{sample,ok:false,records:[],error:error?.name==='AbortError'?'timed out':String(error?.message||error)};
 }finally{clearTimeout(timer);requestControllers.delete(controller)}
}
async function fetchGlobalSamples(){
 const results=[];
 // Small batches avoid bursts against a public community service with dynamic rate limits.
 for(let i=0;i<GLOBAL_SAMPLES.length;i+=3){
  if(!enabled)throw new Error('Drone Awareness was turned off');
  const batch=await Promise.all(GLOBAL_SAMPLES.slice(i,i+3).map(getSample));
  results.push(...batch);
  showStatus('Sampling public ADS-B coverage hubs: '+results.length+'/'+GLOBAL_SAMPLES.length+' regional windows checked…');
 }
 return results;
}
async function refresh(force=false){
 if(!enabled||!map||inFlight)return;
 const remaining=15000-(Date.now()-lastFetchAt);
 if(!force&&remaining>0){showStatus('Public source refresh is briefly rate-limited. Next refresh is available in '+Math.ceil(remaining/1000)+' seconds.');return}
 if(force&&remaining>0){showStatus('Please wait '+Math.ceil(remaining/1000)+' seconds before refreshing public coverage.');return}
 inFlight=true;lastFetchAt=Date.now();
 if(refreshButton)refreshButton.disabled=true;
 showStatus('Starting global sample of public UAV-class ADS-B reports…');
 try{
  const samples=await fetchGlobalSamples();
  if(!enabled)return;
  const good=samples.filter(s=>s.ok);
  const records=good.flatMap(s=>s.records);
  const c=centerAndZoom();
  // Add one explicitly regional request when zoomed close enough to be useful; never show that
  // request as world coverage or as an exact per-aircraft track.
  let localResult=null;
  if(c&&c.zoom>=6){
   localResult=await getSample({id:'Current map view',lat:c.lat,lon:c.lon});
   if(localResult.ok)records.push(...localResult.records);
  }
  if(!enabled)return;
  const grouped=aggregate(records);
  const fc={type:'FeatureCollection',features:grouped.features};
  map.getSource(SOURCE)?.setData(fc);
  setLayerVisibility(grouped.features.length>0);
  renderCells(grouped.features);writeSummary(grouped.features.length,grouped.screened);
  const goodCount=good.length,total=GLOBAL_SAMPLES.length;
  const now=new Date();
  const coverage=goodCount
   ? 'Updated '+now.toLocaleTimeString()+' · '+grouped.screened.toLocaleString()+' deduplicated UAV-class reports across '+grouped.features.length+' coarse cells · '+goodCount+'/'+total+' regional sample windows responded.'
   : 'No public sample windows responded. No live locations are displayed; this is a feed failure, not evidence that drones are absent.';
  showStatus(coverage,goodCount?'ok':'error');
  const feedMeta=$('#bp-drone-feed-meta');
  if(feedMeta)feedMeta.textContent='Global sample centers: '+goodCount+'/'+total+' responded · each request radius '+REGION_RADIUS_NM+' nautical miles · '+GRID_DEGREES+'° grid · refreshed '+now.toLocaleString()+'. This is sampled sensor coverage, not a complete global inventory.';
 }catch(error){
  if(enabled){
   const message=String(error?.message||error);
   showStatus('Live public ADS-B data unavailable: '+message+'. The map remains usable; no historical or invented locations are shown.','error');
  }
 }finally{
  inFlight=false;if(refreshButton)refreshButton.disabled=false;
 }
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
function toggle(){
 if(!map){openDronePanel();showStatus('BridgePoint globe is still initializing. The control is ready; wait for the map to load and press refresh.','error');return}
 enabled=!enabled;updateButton();openDronePanel();
 if(enabled){
  if(!installLayer()){showStatus('The map layer is not ready yet. Try again once the globe finishes loading.','error');enabled=false;updateButton();return}
  setLayerVisibility(false);
  window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('drones',true);
  showStatus('Sampling public UAV-class ADS-B detections across 13 regional sensor windows. Coarse cells only; this cannot show every drone worldwide and does not include Remote ID-only broadcasts.');
  clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(enabled&&!document.hidden)void refresh(false)},REFRESH_MS);
  void refresh(false);
 }else{
  clearInterval(refreshTimer);clearTimeout(moveTimer);aborter?.abort();
  for(const controller of requestControllers)try{controller.abort()}catch(_){}
  requestControllers.clear();setLayerVisibility(false);
  try{map.getSource(SOURCE)?.setData(emptyFeatureCollection())}catch(_){}
  renderCells([]);writeSummary(0,0);window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('drones',false);showStatus('Drone Awareness is off. No background regional requests are running.');
 }
}
function createPane(panel){
 if(!panel)return null;
 let existing=panel.querySelector('[data-bpv-pane="drones"]');if(existing)return existing;
 const p=element('section','bp-drone-pane');p.dataset.bpvPane='drones';p.hidden=true;
 p.append(element('div','bp-drone-headline','OPT-IN · PUBLIC CIVIL AIRSPACE DATA'));
 p.append(element('div','bp-drone-feed-note','Samples 13 public ADS-B regions and combines reported UAV-class records into coarse 2° cells. The map never displays individual aircraft points, callsigns, identifiers or operator locations. These are sensor-fed sample regions, not exhaustive worldwide coverage; most consumer drones do not broadcast ADS-B.'));
 p.append(element('div','bp-drone-feed-note','For broader Remote ID detections from community Wi-Fi/Bluetooth receivers, DroneAware maintains a separate live map. Its terms reserve API access for approved third parties under a written agreement, so BridgePoint links to that network instead of scraping its private feed.'));
 const remoteLink=element('a','bp-drone-source','Open DroneAware Remote ID live map ↗');remoteLink.href='https://droneaware.io/';remoteLink.target='_blank';remoteLink.rel='noopener noreferrer';p.append(remoteLink);
 const summary=element('div','bp-drone-summary');summary.id='bp-drone-summary-v1';summary.append(element('div','bp-drone-metric'));summary.append(element('div','bp-drone-metric'));p.append(summary);summaryNode=summary;
 const status=element('div','bp-drone-status','Drone Awareness is off. Press the button to activate a regional refresh.');status.id='bp-drone-status-v1';status.dataset.kind='info';p.append(status);statusNode=status;
 const actions=element('div','bp-drone-actions');
 const refreshBtn=element('button','bpv-wide-action','REFRESH GLOBAL SAMPLE');refreshBtn.type='button';refreshBtn.addEventListener('click',()=>void refresh(true));actions.append(refreshBtn);refreshButton=refreshBtn;
 const off=element('button','bpv-wide-action','TURN DRONE AWARENESS OFF');off.type='button';off.addEventListener('click',()=>{if(enabled)toggle();else{updateButton();showStatus('Drone Awareness is already off.')}});actions.append(off);p.append(actions);
 const meta=element('div','bp-drone-feed-note','Coverage refreshes every 3 minutes while enabled. A blank cell means no eligible report was received from the sampled windows; it does not prove an area is drone-free.');meta.id='bp-drone-feed-meta';p.append(meta);
 const cells=element('div','bp-drone-cells');cells.id='bp-drone-cells-v1';cellsNode=cells;p.append(cells);
 const source=element('div','bp-drone-footnote');
 source.append(document.createTextNode('Source: '));
 const link=element('a','bp-drone-source','ADSB.lol API documentation');link.href='https://api.adsb.lol/docs/open-data/api/';link.target='_blank';link.rel='noopener noreferrer';source.append(link);
 source.append(document.createTextNode(' · ODbL 1.0. Public transponder feeds can be incomplete. No Remote ID radio interception, controller/pilot location, target-level history, or offline RF scanning is performed.'));
 p.append(source);panel.append(p);writeSummary(0,0);
 return p;
}
function updateWaterButton(){
 if(!waterButton)return;
 waterButton.classList.toggle('active',waterEnabled);
 waterButton.setAttribute('aria-pressed',String(waterEnabled));
 const label=waterButton.querySelector('.bpv-command-label');if(label)label.textContent=waterEnabled?'Water + Flow · ON':'Water + Flow';
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
function updateCloudButton(){
 if(!cloudButton)return;
 cloudButton.classList.toggle('active',cloudEnabled);
 cloudButton.setAttribute('aria-pressed',String(cloudEnabled));
 const label=cloudButton.querySelector('.bpv-command-label');if(label)label.textContent=cloudEnabled?'3D Clouds · ON':'3D Clouds';
 cloudButton.title=cloudEnabled?'Turn off the 3D cloud renderer':'Load the optional 3D cloud renderer';
}
async function toggleClouds(){
 if(!map)throw new Error('BridgePoint globe is not ready');
 if(typeof window.__BP_TOGGLE_CLOUDS__==='function'){
  const result=await window.__BP_TOGGLE_CLOUDS__();cloudEnabled=result===true;
  window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('clouds',cloudEnabled);
  updateCloudButton();hideDefaultOverlays();return cloudEnabled;
 }
 if(cloudEnabled){
  cloudEnabled=false;window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('clouds',false);cloudApi?.setEnabled?.(false);
  try{if(map.getLayer('bp-sky-cloud-volume-v6029'))map.setLayoutProperty('bp-sky-cloud-volume-v6029','visibility','none')}catch(_){}
  updateCloudButton();return false;
 }
 if(!cloudApi){
  if(!cloudPromise)cloudPromise=import('./world-v2300-clouds.js?v=6168-desktop-global-cloud-motion-stop')
   .then(m=>{const api=m.initSkyClouds({map});if(!api)throw new Error('3D cloud engine did not initialize');cloudApi=api;window.__BP_SKY_CLOUDS_V5908__=api;return api})
   .finally(()=>{cloudPromise=null});
  await cloudPromise;
 }
 if(!cloudApi)throw new Error('3D cloud engine unavailable');
 cloudEnabled=true;window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('clouds',true);cloudApi.setEnabled?.(true);
 try{if(map.getLayer('bp-sky-cloud-volume-v6029'))map.setLayoutProperty('bp-sky-cloud-volume-v6029','visibility','visible')}catch(_){}
 updateCloudButton();return true;
}
function addButton(){
 const grid=$('[data-bpv-command-grid="environment"]');if(!grid)return false;
 let b=grid.querySelector('[data-bp-drone-awareness-button="1"]');
 if(!b){
  b=element('button','bpv-command-btn','');
  b.type='button';b.dataset.bpDroneAwarenessButton='1';b.dataset.bpvAction='drones';
  b.title='Open coarse, public ADS-B UAV awareness; no per-aircraft tracking';
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
 let cb=grid.querySelector('[data-bp-cloud-toggle-button="1"]');
 if(!cb){
  cb=element('button','bpv-command-btn','');cb.type='button';cb.dataset.bpCloudToggleButton='1';cb.dataset.bpvAction='clouds';
  cb.title='Load or hide the optional 3D cloud renderer';
  cb.innerHTML='<span class="bpv-command-icon" aria-hidden="true">☁</span><span class="bpv-command-label">3D Clouds</span>';
  cb.addEventListener('click',async()=>{
   cb.disabled=true;
   try{await toggleClouds();window.__BP_SHOW_ACTION_NOTICE__?.(cloudEnabled?'3D Clouds are enabled.':'3D Clouds are off.')}
   catch(e){window.__BP_SHOW_ACTION_NOTICE__?.('3D Clouds failed: '+String(e?.message||e));console.warn('BridgePoint 3D Clouds',e)}
   finally{cb.disabled=false;updateCloudButton()}
  });
  grid.append(cb);
 }
 cloudButton=cb;updateCloudButton();return true;
}
function hideDefaultOverlays(){
 if(!emptyModeActive||!emptyModeMap||sweepFrame)return;
 sweepFrame=requestAnimationFrame(()=>{
  sweepFrame=0;if(!emptyModeActive||!emptyModeMap)return;
  ensureInitialBaseLayers();
  let layers=[];
  try{layers=emptyModeMap.getStyle?.()?.layers||[]}catch(_){return}
  for(const layer of layers){
   if(layerAllowed(layer.id))continue;
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
 if(emptyModeMap&&emptyModeHandler){try{for(const event of ['styledata','idle','moveend','zoomend','rotateend','pitchend'])emptyModeMap.off(event,emptyModeHandler)}catch(_){}}
 emptyModeMap=m;emptyModeHandler=hideDefaultOverlays;
 // Map LOD + weather modules may reset visibility when a camera settles. Reapply
 // the opt-in allowlist after each settled camera/style event, not continuously.
 try{for(const event of ['styledata','idle','moveend','zoomend','rotateend','pitchend'])m.on(event,hideDefaultOverlays)}catch(_){}
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
  if(map!==current){map=current;installLayer();installEmptyMode(map);map.on?.('moveend',()=>{if(!enabled)return;clearTimeout(moveTimer);moveTimer=setTimeout(()=>void refresh(false),1800)})}
  installLayer();
  if(enabled&&Number(map.getZoom?.()||0)>=4.7&&!inFlight)void refresh(false);
 }
}
function boot(){
 bindStartMode();
 tryBoot();
 let attempts=0;
 const observer=new MutationObserver(()=>{tryBoot()});
 try{observer.observe(document.body,{childList:true,subtree:true})}catch(_){}
 const timer=setInterval(()=>{
  tryBoot();attempts++;
  if((button&&pane&&map)||attempts>240){clearInterval(timer);try{observer.disconnect()}catch(_){}}
 },250);
 window.__BP_DRONE_AWARENESS_V1__={
  version:VERSION,
  source:'adsb.lol public community ADS-B feed',
  aggregation:'13 global sample regions; 2-degree grid; min 1 classified UAV-class report per cell',
  targetLevelDetails:false,
  pilotOrControlStationLocations:false,
  rawRfScanning:false,
  offlineReceiver:false,
  waterToggle:toggleWater,
  cloudToggle:toggleClouds,
  allowLayerCategory(category,on=true){
   const key=String(category||'').trim().toLowerCase();
   if(key==='drones')return true;
   if(key==='parcels'){parcelLayerEnabled=!!on;hideDefaultOverlays();return true}
   if(!categoryPatterns[key])return false;
   if(on)allowedCategories.add(key);else allowedCategories.delete(key);
   hideDefaultOverlays();return true;
  },
  toggle,
  refresh:()=>refresh(true),
  get state(){return{enabled,mapReady:!!map,zoom:map?.getZoom?.()??null,layerReady:!!map?.getLayer?.(LAYER),emptyModeActive,updatedAt:Date.now()}}
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();