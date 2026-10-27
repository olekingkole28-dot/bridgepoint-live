(()=>{
'use strict';
if(window.__BP_DRONE_AWARENESS_V1__)return;
const VERSION=1;
const SOURCE='bp-drone-awareness-source-v1';
const LAYER='bp-drone-awareness-cells-v1';
const MIN_GROUP=3;
const REGION_RADIUS_NM=250;
const REFRESH_MS=60000;
const SUPPORTED_SOURCE='https://api.adsb.lol/v2/';
const $=s=>document.querySelector(s);
const safeNumber=(v, fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const emptyFeatureCollection=()=>({type:'FeatureCollection',features:[]});
let map=null,enabled=false,inFlight=false,refreshTimer=0,moveTimer=0,lastFetchAt=0,aborter=null;
let button=null,pane=null,statusNode=null,summaryNode=null,cellsNode=null,refreshButton=null;
let emptyModeActive=true,emptyModeMap=null,emptyModeHandler=null,sweepFrame=0;
const baseLayers=new Set(['gta-bg','gta-water','gta-coast-shadow','gta-coast-edge','gta-coast-foam','gta-landcover','gta-landuse','gta-hillshade']);
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
 s.textContent='.bp-drone-pane{display:grid;gap:10px;color:#dff7ff}.bp-drone-headline{font-size:11px;font-weight:950;letter-spacing:.09em;color:#77eaff}.bp-drone-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.bp-drone-metric{border:1px solid rgba(107,218,255,.2);background:rgba(5,20,30,.8);border-radius:10px;padding:10px;min-width:0}.bp-drone-metric b{display:block;font-size:20px;color:#70efff}.bp-drone-metric span{display:block;font-size:9px;color:#92b8c7;line-height:1.4}.bp-drone-status{padding:10px;border:1px solid rgba(122,221,255,.2);border-radius:10px;background:rgba(3,16,25,.9);font-size:11px;line-height:1.5;overflow-wrap:anywhere}.bp-drone-status[data-kind=\"error\"]{border-color:rgba(255,165,100,.5);color:#ffd8bc}.bp-drone-status[data-kind=\"ok\"]{border-color:rgba(105,245,185,.35)}.bp-drone-actions{display:flex;flex-wrap:wrap;gap:7px}.bp-drone-actions button{flex:1 1 140px;min-width:0}.bp-drone-feed-note{font-size:10px;line-height:1.5;color:#98b6c4}.bp-drone-source{color:#7ce9ff;overflow-wrap:anywhere}.bp-drone-cells{display:grid;gap:5px}.bp-drone-cell-row{display:flex;justify-content:space-between;align-items:center;gap:9px;padding:8px 10px;background:rgba(7,29,42,.85);border:1px solid rgba(107,218,255,.16);border-radius:8px;font-size:10px}.bp-drone-cell-row b{color:#d9fbff}.bp-drone-cell-row span{color:#79eaff;white-space:nowrap}.bp-drone-footnote{font-size:9px;line-height:1.5;color:#86a7b7}';
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
  const a=element('div','bp-drone-metric');a.append(element('b','',String(cellCount)),element('span','','Aggregate cells shown'));
  const b=element('div','bp-drone-metric');b.append(element('b','',String(MIN_GROUP)+'+'),element('span','','Reports required in each displayed cell'));
  summaryNode.append(a,b);
 }
 if(cellsNode){
  cellsNode.replaceChildren();
  if(!cellCount){
   cellsNode.append(element('div','bp-drone-feed-note','No aggregate cells met the display threshold in this region at the last refresh. That does not establish that no drones are present.'));
  }
 }
}
function setLayerVisibility(on){
 if(!map)return false;
 try{
  const layers=map.getStyle?.()?.layers||[];
  if(!layers.some(x=>x.id===LAYER))return false;
  map.setLayoutProperty(LAYER,'visibility',on?'visible':'none');map.triggerRepaint?.();return true;
 }catch(e){return false}
}
function installLayer(){
 if(!map||!map.getStyle?.())return false;
 try{
  if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:emptyFeatureCollection()});
  if(!map.getLayer(LAYER)){
   map.addLayer({id:LAYER,type:'circle',source:SOURCE,minzoom:3,layout:{visibility:'none'},paint:{
    'circle-radius':['interpolate',['linear'],['get','count'],3,5,6,7,12,10,24,14,48,18],
    'circle-color':['interpolate',['linear'],['get','count'],3,'#58cfff',6,'#35e8f4',12,'#62efad',24,'#ffd166',48,'#ff9f68'],
    'circle-opacity':.82,'circle-stroke-color':'#06131c','circle-stroke-width':1.5,'circle-blur':0.02
   }});
  }
  return true;
 }catch(e){console.warn('BridgePoint drone awareness layer setup failed',e);return false}
}
function gridKey(lat,lon){
 let y=Math.max(-89,Math.min(89,Math.round(lat)));
 let x=((Math.round(lon)+540)%360)-180;
 return String(y)+','+String(x);
}
function cellLabel(lat,lon){
 const ns=lat>=0?'N':'S',ew=lon>=0?'E':'W';
 return String(Math.abs(lat)).padStart(2,'0')+'°'+ns+' · '+String(Math.abs(lon)).padStart(3,'0')+'°'+ew+' cell';
}
function isUavRecord(a){
 const category=String(a?.category||'').trim().toUpperCase();
 if(category==='B6')return true;
 const text=[a?.desc,a?.description,a?.typeDescription,a?.t].filter(Boolean).join(' ');
 return /\b(?:UAV|UAS|UNMANNED AERIAL|UNMANNED AIRCRAFT|DRONE)\b/i.test(text);
}
function aggregate(records){
 const groups=new Map();let screened=0;
 for(const a of Array.isArray(records)?records:[]){
  const lat=Number(a?.lat),lon=Number(a?.lon);
  if(!isUavRecord(a)||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
  screened++;
  const key=gridKey(lat,lon);let g=groups.get(key);
  if(!g){g={key,lat:Number(key.split(',')[0]),lon:Number(key.split(',')[1]),count:0};groups.set(key,g)}
  g.count++;
 }
 const features=[];
 for(const g of groups.values()){
  if(g.count<MIN_GROUP)continue;
  features.push({type:'Feature',geometry:{type:'Point',coordinates:[g.lon,g.lat]},properties:{cell:g.key,count:g.count,label:cellLabel(g.lat,g.lon),source:'adsb.lol · ODbL 1.0',aggregation_degrees:1,threshold:MIN_GROUP}});
 }
 return{features,screened};
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
async function refresh(force=false){
 if(!enabled||!map||inFlight)return;
 const c=centerAndZoom();
 if(!c||!Number.isFinite(c.lat)||!Number.isFinite(c.lon)){showStatus('Map center is not ready yet. Try again after the globe finishes loading.');return}
 if(c.zoom<4.7){
  showStatus('Zoom into the part of the world you want to inspect. The public feed queried here supports a regional radius of up to 250 nautical miles, not a complete worldwide drone feed.');
  if(cellsNode)renderCells([]);if(summaryNode)writeSummary(0,0);return;
 }
 const remaining=15000-(Date.now()-lastFetchAt);
 if(!force&&remaining>0){showStatus('Regional source refresh is rate-limited briefly to avoid stalling the map. Next refresh is available in '+Math.ceil(remaining/1000)+' seconds.');return}
 if(force&&remaining>0){showStatus('Please wait '+Math.ceil(remaining/1000)+' seconds before the next live source request.');return}
 inFlight=true;lastFetchAt=Date.now();
 if(refreshButton)refreshButton.disabled=true;
 showStatus('Requesting the selected region from the community ADS-B feed…');
 aborter=new AbortController();const timer=setTimeout(()=>aborter?.abort(),10000);
 try{
  const url=SUPPORTED_SOURCE+'lat/'+encodeURIComponent(c.lat.toFixed(4))+'/lon/'+encodeURIComponent(c.lon.toFixed(4))+'/dist/'+REGION_RADIUS_NM;
  const response=await fetch(url,{method:'GET',cache:'no-store',signal:aborter.signal,headers:{'Accept':'application/json'}});
  if(!response.ok)throw new Error('Source returned HTTP '+response.status);
  const data=await response.json();
  const records=Array.isArray(data?.ac)?data.ac:[];
  const grouped=aggregate(records);
  const fc={type:'FeatureCollection',features:grouped.features};
  map.getSource(SOURCE)?.setData(fc);
  setLayerVisibility(true);
  renderCells(grouped.features);writeSummary(grouped.features.length,grouped.screened);
  const now=new Date();
  const coverage=grouped.features.length
   ? 'Updated '+now.toLocaleTimeString()+' · '+grouped.features.length+' coarse grid cell(s) shown. Exact aircraft positions and identifiers are not displayed.'
   : 'Updated '+now.toLocaleTimeString()+' · no grid cell met the minimum display threshold. A blank result does not prove absence.';
  showStatus(coverage,'ok');
  const feedMeta=$('#bp-drone-feed-meta');
  if(feedMeta)feedMeta.textContent='Query center '+c.lat.toFixed(2)+', '+c.lon.toFixed(2)+' · radius '+REGION_RADIUS_NM+' NM · selected region only';
 }catch(e){
  const message=e?.name==='AbortError'?'The public source timed out. The map remains responsive; try another refresh later.':String(e?.message||e);
  showStatus('Live regional data unavailable: '+message+'. No cached positions are being presented as live.', 'error');
 }finally{
  clearTimeout(timer);aborter=null;inFlight=false;if(refreshButton)refreshButton.disabled=false;
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
  showStatus('Opt-in only. Zoom into a region, then refresh. This uses public ADS-B aircraft records classified as UAV (B6) where provided; it is not a universal drone registry and does not include local Remote ID-only broadcasts.');
  clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(enabled&&!document.hidden)void refresh(false)},REFRESH_MS);
  if(Number(map.getZoom?.()||0)>=4.7)void refresh(false);
 }else{
  clearInterval(refreshTimer);clearTimeout(moveTimer);aborter?.abort();setLayerVisibility(false);
  try{map.getSource(SOURCE)?.setData(emptyFeatureCollection())}catch(_){}
  renderCells([]);writeSummary(0,0);showStatus('Drone Awareness is off. No background regional requests are running.');
 }
}
function createPane(panel){
 if(!panel)return null;
 let existing=panel.querySelector('[data-bpv-pane="drones"]');if(existing)return existing;
 const p=element('section','bp-drone-pane');p.dataset.bpvPane='drones';p.hidden=true;
 p.append(element('div','bp-drone-headline','OPT-IN · PUBLIC CIVIL AIRSPACE DATA'));
 p.append(element('div','bp-drone-feed-note','This view aggregates UAV-class ADS-B reports into approximately 1° cells and only draws cells containing at least three reports. Exact aircraft points, callsigns, identifiers and control-station locations are deliberately not shown.'));
 const summary=element('div','bp-drone-summary');summary.id='bp-drone-summary-v1';summary.append(element('div','bp-drone-metric'));summary.append(element('div','bp-drone-metric'));p.append(summary);summaryNode=summary;
 const status=element('div','bp-drone-status','Drone Awareness is off. Press the button to activate a regional refresh.');status.id='bp-drone-status-v1';status.dataset.kind='info';p.append(status);statusNode=status;
 const actions=element('div','bp-drone-actions');
 const refreshBtn=element('button','bpv-wide-action','REFRESH SELECTED REGION');refreshBtn.type='button';refreshBtn.addEventListener('click',()=>void refresh(true));actions.append(refreshBtn);refreshButton=refreshBtn;
 const off=element('button','bpv-wide-action','TURN DRONE AWARENESS OFF');off.type='button';off.addEventListener('click',()=>{if(enabled)toggle();else{updateButton();showStatus('Drone Awareness is already off.')}});actions.append(off);p.append(actions);
 const meta=element('div','bp-drone-feed-note','Source window: latest records available from the regional feed. Request center and timestamps are shown; the source itself is not a guarantee of complete airspace coverage.');meta.id='bp-drone-feed-meta';p.append(meta);
 const cells=element('div','bp-drone-cells');cells.id='bp-drone-cells-v1';cellsNode=cells;p.append(cells);
 const source=element('div','bp-drone-footnote');
 source.append(document.createTextNode('Source: '));
 const link=element('a','bp-drone-source','ADSB.lol API documentation');link.href='https://www.adsb.lol/docs/open-data/api/';link.target='_blank';link.rel='noopener noreferrer';source.append(link);
 source.append(document.createTextNode(' · ODbL 1.0. Public transponder feeds can be incomplete. No Remote ID radio interception, controller/pilot location, target-level history, or offline RF scanning is performed.'));
 p.append(source);panel.append(p);writeSummary(0,0);
 return p;
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
 button=b;updateButton();return true;
}
function hideDefaultOverlays(){
 if(!emptyModeActive||!emptyModeMap||sweepFrame)return;
 sweepFrame=requestAnimationFrame(()=>{
  sweepFrame=0;if(!emptyModeActive||!emptyModeMap)return;
  try{
   const layers=emptyModeMap.getStyle?.()?.layers||[];
   for(const layer of layers){
    if(baseLayers.has(layer.id)||layer.id.startsWith('bp-drone-awareness'))continue;
    if((emptyModeMap.getLayoutProperty(layer.id,'visibility')||'visible')!=='none')emptyModeMap.setLayoutProperty(layer.id,'visibility','none');
   }
  }catch(_){}
 });
}
function stopEmptyMode(){
 if(!emptyModeActive)return;emptyModeActive=false;
 if(emptyModeMap&&emptyModeHandler){try{emptyModeMap.off('styledata',emptyModeHandler);emptyModeMap.off('idle',emptyModeHandler)}catch(_){}}
 if(sweepFrame)cancelAnimationFrame(sweepFrame);sweepFrame=0;
}
function installEmptyMode(m){
 if(!m||emptyModeMap===m)return;
 if(emptyModeMap&&emptyModeHandler){try{emptyModeMap.off('styledata',emptyModeHandler);emptyModeMap.off('idle',emptyModeHandler)}catch(_){}}
 emptyModeMap=m;emptyModeHandler=hideDefaultOverlays;
 try{m.on('styledata',hideDefaultOverlays);m.on('idle',hideDefaultOverlays)}catch(_){}
 hideDefaultOverlays();
}
function bindStartMode(){
 document.addEventListener('click',e=>{
  if(!emptyModeActive)return;
  const target=e.target?.closest?.('.bpv-dock [data-bpv-action], .bpv-dock [data-bpv-panel], .bpv-dock [data-bpv-slot-action], #bpv-mapkey-rail, .map-tools button, .bpv-contained-control button');
  if(!target)return;
  const action=String(target.dataset?.bpvAction||'');
  const shouldEnable=target.matches('.map-tools button, .bpv-contained-control button')
   ||['parcels','boundaryviewer','worldchanges','weatherfx','windfx','volumetric','motion','satellite','opportunities'].includes(action);
  // Browsing/search/property tabs keep the map empty. A real layer/tool command
  // releases the initial-visibility gate so that command can activate its layer.
  if(shouldEnable)stopEmptyMode();
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
  source:'adsb.lol public community ADS-B regional API',
  aggregation:'1-degree grid; minimum 3 UAV-class reports per displayed cell',
  targetLevelDetails:false,
  pilotOrControlStationLocations:false,
  rawRfScanning:false,
  offlineReceiver:false,
  toggle,
  refresh:()=>refresh(true),
  get state(){return{enabled,mapReady:!!map,zoom:map?.getZoom?.()??null,layerReady:!!map?.getLayer?.(LAYER),emptyModeActive,updatedAt:Date.now()}}
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();