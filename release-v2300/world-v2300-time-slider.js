const STYLE_ID='bp-world-time-slider-style-v5908';
const ROOT_ID='bp-world-time-slider-v5908';
const SOURCE_ID='bp-world-activity-source-v5908';
const LAYER_FILL='bp-world-activity-fill-v5908';
const LAYER_LINE='bp-world-activity-line-v5908';
const LAYER_POINT='bp-world-activity-point-v5908';
const LAYER_LABEL='bp-world-activity-label-v5908';
const EMPTY={type:'FeatureCollection',features:[]};
const DAY=86400000;

const CSS=`
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908{
 position:absolute;z-index:18;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);
 width:min(620px,calc(100% - 24px));box-sizing:border-box;padding:12px 14px 11px;
 border:1px solid rgba(117,220,255,.42);border-radius:15px;
 background:linear-gradient(160deg,rgba(3,14,25,.91),rgba(4,21,34,.84));
 backdrop-filter:blur(13px) saturate(125%);-webkit-backdrop-filter:blur(13px) saturate(125%);
 color:#e8f7ff;font:12px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;
 box-shadow:0 13px 40px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.045);
 pointer-events:auto;
}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 *{box-sizing:border-box}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 [data-collapse]{min-height:23px;padding:4px 8px;margin-left:2px;font-size:12px;line-height:1}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-collapsed{width:min(300px,calc(100% - 24px));padding:8px 11px}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-collapsed .bpwt-head{margin-bottom:0}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-collapsed>.bpwt-scale,:is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-collapsed>.bpwt-controls,:is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-collapsed>.bpwt-filters,:is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-collapsed>.bpwt-list,:is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-collapsed>.bpwt-note{display:none!important}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-eyebrow{font-size:10px;letter-spacing:.13em;font-weight:900;color:#91eaff}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-status{font-variant-numeric:tabular-nums;color:#b6d2e0;font-size:11px}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-date{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin:0 0 2px}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-date strong{font-size:14px;letter-spacing:.01em;color:#fff}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-date span{font-size:11px;color:#9bbaca;text-align:right}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 input[type=range]{appearance:none;-webkit-appearance:none;width:100%;height:23px;display:block;margin:2px 0 0;background:transparent;cursor:pointer;touch-action:pan-y}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 input[type=range]::-webkit-slider-runnable-track{height:5px;border-radius:8px;background:linear-gradient(90deg,#427e9d,#8df1ff)}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 input[type=range]::-moz-range-track{height:5px;border-radius:8px;background:linear-gradient(90deg,#427e9d,#8df1ff)}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:17px;height:17px;margin-top:-6px;border-radius:50%;border:2px solid #dffbff;background:#27c8ff;box-shadow:0 0 0 4px rgba(39,200,255,.2),0 0 15px rgba(39,200,255,.7)}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;border:2px solid #dffbff;background:#27c8ff;box-shadow:0 0 0 4px rgba(39,200,255,.2),0 0 15px rgba(39,200,255,.7)}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-scale{display:flex;justify-content:space-between;color:#83a3b6;font-size:10px;margin-top:-1px}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-controls{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:9px}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-filters{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr) minmax(90px,.65fr);gap:6px;margin-top:8px}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-filters label{display:grid;gap:3px;min-width:0;color:#a8d7e5;font-size:8px;font-weight:900;letter-spacing:.06em}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-filters select{width:100%;min-width:0;min-height:30px;padding:6px 7px;border:1px solid rgba(125,223,250,.34);border-radius:7px;background:#081b29;color:#e9fbff;font:700 10px system-ui,sans-serif}
@media(max-width:700px){:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-filters{grid-template-columns:1fr 1fr;gap:5px}:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-filters label:last-child{grid-column:1/-1}}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 button{appearance:none;border:1px solid rgba(136,208,235,.3);border-radius:8px;background:rgba(18,51,70,.8);color:#e8f8ff;font:800 11px/1 system-ui,-apple-system,Segoe UI,sans-serif;padding:8px 10px;cursor:pointer;min-height:30px}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 button:hover{background:rgba(30,90,116,.9)}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 button[aria-pressed=true]{background:#146e88;border-color:#63eaff;color:#fff}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-stats{margin-left:auto;color:#9fc4d6;font-size:10px;white-space:nowrap}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-note{border-top:1px solid rgba(120,190,219,.18);margin-top:8px;padding-top:7px;color:#9db7c6;font-size:10px;line-height:1.4}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-list{display:flex;gap:6px;overflow-x:auto;scrollbar-width:thin;margin-top:7px;padding-bottom:2px}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-item{flex:1 0 145px;min-width:0;text-align:left;line-height:1.3;padding:7px 8px}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-item b{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-item small{display:block;color:#9fc4d6;font-size:9px;margin-top:4px;white-space:nowrap}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-item[hidden]{display:none}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-error{color:#ffc5b4}
@media(max-width:700px){
 :is(#liveMap,#previewMap) .bp-world-time-slider-v5908{width:calc(100% - 14px);bottom:max(10px,env(safe-area-inset-bottom));padding:10px;border-radius:13px}
 :is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-eyebrow{font-size:9px}
 :is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-date strong{font-size:12px}
 :is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-date span{font-size:10px}
 :is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-controls{gap:5px}
 :is(#liveMap,#previewMap) .bp-world-time-slider-v5908 button{padding:8px 8px;font-size:10px}
 :is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-stats{flex:1 0 100%;margin:0}
 :is(#liveMap,#previewMap) .bp-world-time-slider-v5908 .bpwt-note{font-size:9px}
}

:is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-standalone-open{
 position:absolute!important;z-index:1405!important;left:50%!important;right:auto!important;
 top:max(78px,calc(env(safe-area-inset-top) + 62px))!important;bottom:auto!important;
 transform:translateX(-50%)!important;width:min(760px,calc(100% - 20px))!important;
 max-height:calc(100dvh - 96px)!important;overflow:auto!important;
 border-color:rgba(104,239,255,.72);box-shadow:0 24px 70px rgba(0,0,0,.62),0 0 36px rgba(30,190,230,.12)
}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-standalone-open .bpwt-head{position:sticky;top:-12px;z-index:2;padding:3px 0 7px;background:linear-gradient(160deg,rgba(3,14,25,.99),rgba(4,21,34,.97))}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-standalone-open .bpwt-note{max-width:100%}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908 [data-standalone]{margin-left:auto;white-space:nowrap}
@media(max-width:700px){
 :is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-standalone-open{left:6px!important;right:6px!important;top:max(74px,calc(env(safe-area-inset-top) + 58px))!important;transform:none!important;width:auto!important;max-height:calc(100dvh - 86px)!important;padding:9px!important}
 :is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-standalone-open .bpwt-head{top:-9px;gap:5px;flex-wrap:wrap}
 :is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-standalone-open .bpwt-eyebrow{font-size:8px;letter-spacing:.06em}
 :is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-standalone-open .bpwt-status{font-size:9px}
}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-docked{
 position:relative!important;z-index:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;inset:auto!important;
 transform:none!important;width:100%!important;max-width:100%!important;max-height:none!important;overflow:visible!important;margin:5px 0 0!important;padding:8px!important;
 border-radius:11px;box-shadow:none!important;backdrop-filter:none;-webkit-backdrop-filter:none
}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-docked.bpwt-standalone-open{position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;inset:auto!important;transform:none!important;width:100%!important;max-height:none!important;overflow:visible!important}
:is(#liveMap,#previewMap) .bp-world-time-slider-v5908.bpwt-docked.bpwt-standalone-open .bpwt-head{position:static!important;top:auto!important;background:transparent!important}

/* Keep the time scrubber in the BridgePoint bottom card for any map host id. */
.bp-world-time-slider-v5908.bpwt-docked{position:relative!important;z-index:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;inset:auto!important;transform:none!important;width:100%!important;max-width:100%!important;max-height:none!important;overflow:visible!important;margin:5px 0 0!important;padding:8px!important}
.bp-world-time-slider-v5908.bpwt-docked.bpwt-standalone-open{position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;inset:auto!important;transform:none!important;width:100%!important;max-height:none!important;overflow:visible!important}
.bp-world-time-slider-v5908.bpwt-docked.bpwt-standalone-open .bpwt-head{position:static!important;top:auto!important;background:transparent!important}

`; 

const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function sourceColor(p){
 const k=String(p?.event_type_key||p?.family_key||'').toUpperCase();
 if(/LANDSLIDE|LANDSLIP|MASS_MOVEMENT|SLOPE_FAILURE/.test(k))return '#b18a59';
 if(/VOLCANO|VOLCANIC|ERUPTION/.test(k))return '#fb6a40';
 if(/OPPORTUNITY/.test(k))return '#59efb5';
 if(/TERRAIN/.test(k))return '#d9b87a';
 if(/ASSET_MATERIALIZED|NEW_MATERIALIZED_ASSET/.test(k))return '#66e9ff';
 if(/TORNADO|LIGHTNING|HAIL|WIND|SEVERE/.test(k))return '#ffb23d';
 if(/WILDFIRE|FIRE/.test(k))return '#ff593f';
 if(/FLOOD|WATER|RAIN/.test(k))return '#35c9ff';
 if(/HURRICANE|CYCLONE|TROPICAL/.test(k))return '#bd8cff';
 if(/EARTHQUAKE|QUAKE/.test(k))return '#ff6f9f';
 return '#80f1d2';
}
function centerOfFeature(f){
 const g=f?.geometry;if(!g)return null;
 if(g.type==='Point'&&Array.isArray(g.coordinates))return g.coordinates.slice(0,2);
 const all=[];
 const visit=x=>{if(!Array.isArray(x))return;if(x.length>=2&&typeof x[0]==='number'&&typeof x[1]==='number'){all.push([x[0],x[1]]);return}for(const y of x)visit(y)};
 visit(g.coordinates);
 if(!all.length)return null;
 let sx=0,sy=0;for(const p of all){sx+=p[0];sy+=p[1]}return[sx/all.length,sy/all.length];
}
function dateLabel(d){
 try{return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d)}catch{return d.toISOString()}
}
export function initWorldTimeSlider(target,rpc){
 const map=target?.map||target,container=map?.getContainer?.();
 if(!map||!container||typeof rpc!=='function')return null;
 if(window.__BP_WORLD_TIME_SLIDER_V5908__?.map===map)return window.__BP_WORLD_TIME_SLIDER_V5908__;
 if(container.querySelector('#'+ROOT_ID))return window.__BP_WORLD_TIME_SLIDER_V5908__||null;
 if(getComputedStyle(container).position==='static')container.style.position='relative';
 if(!document.getElementById(STYLE_ID)){const style=document.createElement('style');style.id=STYLE_ID;style.textContent=CSS;document.head.appendChild(style)}
 const dock=document.createElement('section');dock.id=ROOT_ID;dock.className='bp-world-time-slider-v5908 bpwt-collapsed';dock.setAttribute('aria-label','World activity time slider');
 dock.innerHTML=`
  <div class="bpwt-head"><span class="bpwt-eyebrow">WORLD HISTORY · 30-DAY CHANGE SCRUB</span><span class="bpwt-status" data-status>CONNECTING</span><button type="button" data-standalone aria-pressed="false" aria-label="Expand the 30-day world activity controls inline">EXPAND TIMELINE</button><button type="button" data-collapse aria-expanded="false" aria-label="Expand world activity details">⌃</button></div>
  <div class="bpwt-date"><strong data-date>Latest source observations</strong><span data-window>24-hour observation window</span></div>
  <input data-slider type="range" min="0" max="30" step="1" value="30" aria-label="Browse world activity from 30 days ago to now">
  <div class="bpwt-scale"><span>30 DAYS AGO</span><span>LIVE NOW</span></div>
  <div class="bpwt-controls">
   <button type="button" data-live aria-pressed="true">● LIVE</button>
   <button type="button" data-play aria-pressed="false">▶ PLAY</button>
   <button type="button" data-clouds aria-pressed="true" title="NASA Earth imagery with persistent 3D cloud volumes and local storm effects">☁ NASA EARTH + 3D CLOUDS · ON</button>
   <button type="button" data-skyview aria-pressed="false" title="Look above the street-level horizon into the height-aware sky and cloud volumes">⬆ LOOK UP · SKY VIEW</button>
   <button type="button" data-nightlights aria-pressed="false">✦ NASA LIGHTS · OFF</button>
   <button type="button" data-refresh>↻ REFRESH</button>
   <span class="bpwt-stats" data-stats>Waiting for map bounds…</span>
  </div>
  <div class="bpwt-filters" aria-label="World history filters">
   <label>CHANGE TYPE<select data-filter-category><option value="all">All change signals</option><option value="storms">Storms / severe weather</option><option value="flood">Flooding / water</option><option value="wildfire">Wildfire / burn perimeter</option><option value="lights">Night lights / possible outage</option><option value="underground">Underground / tunnels / transit</option><option value="buildings">Buildings / roofs</option><option value="solar">Rooftop solar</option><option value="boundaries">Parcels / boundary lines</option><option value="infrastructure">Roads / bridges / lamps</option><option value="terrain">Terrain / coast / erosion</option><option value="opportunities">Opportunity / market updates</option><option value="assets">Newly indexed assets</option></select></label>
   <label>RECORD CLASS<select data-filter-domain><option value="all">All source records</option><option value="HAZARD">Hazard observations</option><option value="GLOBAL_EVENT">Global source events</option><option value="NEW_MATERIALIZED_ASSET">Newly indexed assets</option><option value="OPPORTUNITY_CHANGE">Opportunity updates</option><option value="TERRAIN_DATA_REFRESH">Terrain refreshes</option></select></label>
   <label>TIME WINDOW<select data-window-hours><option value="6">Previous 6 hours</option><option value="24" selected>Previous 24 hours</option><option value="72">Previous 3 days</option><option value="168">Previous 7 days</option></select></label>
  </div>
  <div class="bpwt-list" data-list aria-label="Recent source-reported changes"></div>
  <div class="bpwt-note">Source-reported hazards/events, first-indexed assets, opportunity records and terrain refreshes are date-filtered; NASA VIIRS daily night imagery follows the selected time. Newly indexed buildings/solar do not prove construction date, dimming is not proof of outage, and boundary movement needs versioned geometry. Burn acreage is shown only when a source perimeter exists. Current imagery/geometry are not fully rewound.</div>`;
 function mountInCard(){
  const target=document.querySelector('#bpv-world-activity-slot')||document.querySelector('#bpv-dock');
  if(!target)return false;
  if(dock.parentElement!==target)target.appendChild(dock);
  dock.classList.add('bpwt-docked');
  dock.hidden=false;
  return true;
 }
 let mountTurns=0,mountHandle=null;
 if(!mountInCard()){
  dock.hidden=true;
  const retryMount=()=>{if(disposed)return;if(mountInCard())return;mountTurns++;mountHandle=setTimeout(retryMount,mountTurns<100?150:800)};
  mountHandle=setTimeout(retryMount,100);
 }
 const $=s=>dock.querySelector(s),slider=$('[data-slider]'),status=$('[data-status]'),date=$('[data-date]'),windowLabel=$('[data-window]'),stats=$('[data-stats]'),list=$('[data-list]'),liveBtn=$('[data-live]'),playBtn=$('[data-play]'),cloudBtn=$('[data-clouds]'),skyViewBtn=$('[data-skyview]');
 const collapseBtn=$('[data-collapse]'),standaloneBtn=$('[data-standalone]'),categoryFilter=$('[data-filter-category]'),domainFilter=$('[data-filter-domain]'),hoursSelect=$('[data-window-hours]'),nightlightsBtn=$('[data-nightlights]');
 function setStandalone(on){
  const expanded=!!on;
  dock.classList.toggle('bpwt-standalone-open',expanded);
  dock.classList.toggle('bpwt-collapsed',!expanded);
  standaloneBtn?.setAttribute('aria-pressed',String(expanded));
  if(standaloneBtn)standaloneBtn.textContent=expanded?'COLLAPSE TIMELINE':'EXPAND TIMELINE';
  collapseBtn?.setAttribute('aria-expanded',String(expanded));
  collapseBtn?.setAttribute('aria-label',expanded?'Collapse world activity details':'Expand world activity details');
  if(collapseBtn)collapseBtn.textContent=expanded?'⌄':'⌃';
 }
 standaloneBtn?.addEventListener('click',()=>setStandalone(dock.classList.contains('bpwt-collapsed')));
 collapseBtn.addEventListener('click',()=>setStandalone(dock.classList.contains('bpwt-collapsed')));
 let seq=0,timer=null,playTimer=null,disposed=false,playing=false,live=true,lastFeatures=[],lastMode='LIVE',lastRequestAt=0,lastSummary={};
 const setStatus=(s,err=false)=>{status.textContent=s;status.classList.toggle('bpwt-error',!!err)};
 function selectedAt(){const val=Number(slider.value);if(val>=30)return new Date();return new Date(Date.now()-(30-val)*DAY)}
 function updateDate(){const d=selectedAt(),hours=Number(hoursSelect.value||24);date.textContent=Number(slider.value)>=30?'LIVE · '+dateLabel(d):dateLabel(d);windowLabel.textContent='Previous '+(hours===168?'7 days':hours===72?'3 days':hours+'h')+' ending at selected time';window.dispatchEvent(new CustomEvent('bp:world-time-change',{detail:{selectedAt:d.toISOString(),live:Number(slider.value)>=30,windowHours:hours}}))}
 function clearLayers(){
  try{if(map.getSource(SOURCE_ID))map.getSource(SOURCE_ID).setData(EMPTY)}catch(_){}
  lastFeatures=[];list.textContent='';stats.textContent='No source observations in this view/window.';
 }
 function ensureLayers(){
  if(disposed)return;
  let ready=false;try{ready=map.isStyleLoaded?.()===true}catch(_){}
  if(!ready)return;
  try{
   if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{type:'geojson',data:EMPTY});
   if(!map.getLayer(LAYER_FILL))map.addLayer({id:LAYER_FILL,type:'fill',source:SOURCE_ID,minzoom:1.5,filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':['coalesce',['get','display_color'],'#75ddec'],'fill-opacity':.16}});
   if(!map.getLayer(LAYER_LINE))map.addLayer({id:LAYER_LINE,type:'line',source:SOURCE_ID,minzoom:1,paint:{'line-color':['coalesce',['get','display_color'],'#75ddec'],'line-width':['interpolate',['linear'],['zoom'],1,.7,6,1.4,12,2.2],'line-opacity':.85}});
   if(!map.getLayer(LAYER_POINT))map.addLayer({id:LAYER_POINT,type:'circle',source:SOURCE_ID,filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],1,3.5,5,5.5,11,8],'circle-color':['coalesce',['get','display_color'],'#75ddec'],'circle-stroke-color':'#e7fbff','circle-stroke-width':1,'circle-opacity':.93}});
   if(!map.getLayer(LAYER_LABEL))map.addLayer({id:LAYER_LABEL,type:'symbol',source:SOURCE_ID,minzoom:4.5,layout:{'text-field':['coalesce',['get','title'],'World event'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],4.5,9,9,11],'text-max-width':15,'text-offset':[0,1.2],'text-allow-overlap':false,'text-ignore-placement':false},paint:{'text-color':'#edfbff','text-halo-color':'#071622','text-halo-width':1.3}});
  }catch(e){console.warn('BridgePoint time slider layers',e)}
 }
 function boundsArgs(){
  const b=map.getBounds();let west=Number(b.getWest()),east=Number(b.getEast()),south=Number(b.getSouth()),north=Number(b.getNorth());
  west=Math.max(-180,Math.min(180,west));east=Math.max(-180,Math.min(180,east));south=Math.max(-90,Math.min(90,south));north=Math.max(-90,Math.min(90,north));
  if(north-south<.02){const c=(north+south)/2;south=Math.max(-90,c-.01);north=Math.min(90,c+.01)}
  if(Math.abs(east-west)<.02){west=Math.max(-180,west-.01);east=Math.min(180,east+.01);if(west===east){west=-180;east=180}}
  return{p_west:west,p_south:south,p_east:east,p_north:north};
 }
 function filterFeature(f){
 const p=f?.properties||{},s=[p.event_type_key,p.family_key,p.title,p.description,p.source_label,p.domain].filter(Boolean).join(' ').toUpperCase(),cat=String(categoryFilter.value||'all');
 if(domainFilter.value!=='all'&&String(p.domain||'')!==domainFilter.value)return false;
 const q={storms:/STORM|HURRICANE|CYCLONE|TORNADO|SEVERE|WIND|LIGHTNING|HAIL|THUNDER|TROPICAL/,flood:/FLOOD|INUNDATION|WATER_LEVEL|SURGE|RIVER/,wildfire:/WILDFIRE|BURNED AREA|BURN PERIMETER|FIRE PERIMETER|FIRE/,lights:/NIGHT.?LIGHT|LIGHT DIM|POWER OUTAGE|ELECTRIC|GRID OUTAGE/,underground:/TUNNEL|UNDERGROUND|SUBSURFACE|SEWER|PIPE|TRANSIT|SUBWAY|CATACOMB|PASSAGE|MANHOLE/,buildings:/BUILDING|STRUCTURE|ROOF|FOOTPRINT/,solar:/SOLAR|PHOTOVOLTAIC|PV SYSTEM/,boundaries:/BOUNDARY|PARCEL|CADASTRAL|PROPERTY.LINE|LOT.LINE/,infrastructure:/ROAD|BRIDGE|RAIL|TRANSPORT|STREETLIGHT|STREET.LAMP|TRAFFIC.SIGNAL|POWER.POLE/,terrain:/TERRAIN|ELEVATION|BATHYMETRY|COAST|SHORE|LANDSLIDE|EROSION|SLOPE/,opportunities:/OPPORTUNITY|MARKET/,assets:/NEW_MATERIALIZED_ASSET|ASSET_MATERIALIZED|FIRST.INDEXED/};
 return !q[cat]||q[cat].test(s);
 }
 function renderFiltered(){
 const shown=lastFeatures.filter(filterFeature);try{map.getSource(SOURCE_ID)?.setData({type:'FeatureCollection',features:shown})}catch(_){}
 const z=lastSummary;stats.textContent=shown.length.toLocaleString()+' matching / '+lastFeatures.length.toLocaleString()+' records · '+Number(z.hazards||0).toLocaleString()+' hazards · '+Number(z.globals||0).toLocaleString()+' global events · '+Number(z.assets||0).toLocaleString()+' new records · '+Number(z.terrain||0).toLocaleString()+' terrain refreshes';buildList(shown);
 window.__BP_WORLD_ACTIVITY_FILTERS_V5937__={category:categoryFilter.value,domain:domainFilter.value,windowHours:Number(hoursSelect.value||24),shown:shown.length,total:lastFeatures.length,updatedAt:new Date().toISOString()};
 }
 function buildList(features){
  list.textContent='';
  const rows=[...features].sort((a,b)=>String(b?.properties?.observed_at||'').localeCompare(String(a?.properties?.observed_at||''))).slice(0,4);
  if(!rows.length){const note=document.createElement('button');note.type='button';note.className='bpwt-item';note.disabled=true;note.textContent='No source-reported activity for this window and viewport.';list.appendChild(note);return}
  for(const f of rows){
   const p=f?.properties||{},button=document.createElement('button');button.type='button';button.className='bpwt-item';
   const title=document.createElement('b');title.textContent=String(p.title||p.event_type_key||p.family_key||'Source event');
   const sub=document.createElement('small');sub.textContent=[p.source_label,dateLabel(new Date(p.observed_at||Date.now()))].filter(Boolean).join(' · ');
   button.append(title,sub);
   button.addEventListener('click',()=>{const c=centerOfFeature(f);if(c)try{map.flyTo({center:c,zoom:Math.max(Number(map.getZoom?.()||0),f.geometry?.type==='Point'?7:5),duration:700})}catch(_){}});
   list.appendChild(button);
  }
 }
 async function refresh(force=false){
  if(disposed)return;
  ensureLayers();
  if(!map.getSource(SOURCE_ID)){setStatus('MAP STYLE LOADING');if(force)setTimeout(()=>refresh(true),500);return}
  const my=++seq,at=selectedAt(),windowHours=Number(hoursSelect.value||24),args={...boundsArgs(),p_at:at.toISOString(),p_window_hours:windowHours,p_limit:600};
  const liveNow=Number(slider.value)>=30;
  lastMode=liveNow?'LIVE':'HISTORY';updateDate();setStatus(liveNow?'REFRESHING LIVE…':'LOADING HISTORY…');
  try{
   const data=await rpc('bridgepoint_public_world_activity_v5927',args,6500);
   if(disposed||my!==seq)return;
   if(!data?.resolved||!data?.complete)throw new Error(data?.error||'ACTIVITY_FEED_UNAVAILABLE');
   const fc=data.geojson&&Array.isArray(data.geojson.features)?data.geojson:EMPTY;
   for(const f of fc.features){f.properties=f.properties||{};f.properties.display_color=sourceColor(f.properties)}
   lastFeatures=fc.features;lastRequestAt=Date.now();
   const hz=Number(data.hazard_observations||0),ge=Number(data.global_events||0),op=Number(data.opportunity_changes||0),assets=Number(data.newly_materialized_assets||0),terrain=Number(data.terrain_data_refreshes||0);lastSummary={hazards:hz,globals:ge,opportunities:op,assets,terrain};renderFiltered();setStatus(liveNow?'LIVE · SOURCES UPDATED':'HISTORY · SOURCE SNAPSHOT');dock.dataset.version='5937';
   window.__BP_WORLD_ACTIVITY_SLIDER_STATE_V5908__={version:5937,mode:lastMode,selectedAt:at.toISOString(),windowHours,returned:lastFeatures.length,hazards:hz,globalEvents:ge,opportunityChanges:op,newMaterializedAssets:assets,terrainDataRefreshes:terrain,viewport:args,lastUpdatedAt:new Date(lastRequestAt).toISOString(),historicalReplay:false,filters:{category:categoryFilter.value,domain:domainFilter.value}};window.__BP_WORLD_ACTIVITY_SLIDER_STATE_V5937__=window.__BP_WORLD_ACTIVITY_SLIDER_STATE_V5908__;
  }catch(e){
   if(disposed||my!==seq)return;
   setStatus('FEED RETRY',true);stats.textContent='Could not refresh source-reported activity.';console.warn('BridgePoint public world activity',e?.message||e);
  }
 }
 function schedule(force=false,delay=220){clearTimeout(timer);timer=setTimeout(()=>void refresh(force),delay)}
 slider.addEventListener('input',()=>{playing&&stopPlay();live=Number(slider.value)>=30;liveBtn.setAttribute('aria-pressed',String(live));updateDate();schedule(true,120)});
 liveBtn.addEventListener('click',()=>{slider.value='30';live=true;liveBtn.setAttribute('aria-pressed','true');stopPlay();updateDate();schedule(true,0)});
 function stopPlay(){playing=false;clearInterval(playTimer);playTimer=null;playBtn.textContent='▶ PLAY';playBtn.setAttribute('aria-pressed','false')}
 playBtn.addEventListener('click',()=>{
  if(playing){stopPlay();return}
  if(Number(slider.value)>=30)slider.value='0';
  playing=true;playBtn.textContent='Ⅱ PAUSE';playBtn.setAttribute('aria-pressed','true');
  playTimer=setInterval(()=>{
   let n=Number(slider.value);
   if(n>=30){slider.value='30';live=true;liveBtn.setAttribute('aria-pressed','true');stopPlay();schedule(true,0);return}
   slider.value=String(Math.min(30,n+1));live=false;liveBtn.setAttribute('aria-pressed','false');schedule(true,0);
  },1650);
  schedule(true,0);
 });
 categoryFilter.addEventListener('change',renderFiltered);domainFilter.addEventListener('change',renderFiltered);hoursSelect.addEventListener('change',()=>schedule(true,0));const syncNightlightsButton=enabled=>{nightlightsBtn.setAttribute('aria-pressed',String(!!enabled));nightlightsBtn.textContent=enabled?'✦ NASA LIGHTS · ON':'✦ NASA LIGHTS · OFF'};const onNightlightsState=e=>{if(e?.detail?.map&&e.detail.map!==map)return;syncNightlightsButton(!!e?.detail?.enabled)};window.addEventListener('bp:nightlights-state',onNightlightsState);let nightlightsToggleBusy=false;async function toggleNasaNightlights(){if(nightlightsToggleBusy)return;nightlightsToggleBusy=true;nightlightsBtn.disabled=true;try{let sensor=window.__BP_SENSOR_LAYERS_V5945__;if(!sensor||sensor.map!==map||typeof sensor.toggleLights!=='function'){const mod=await import('./world-v2300-sensor-layers.js?v=6027-nasa-nightlight-corrected-radiance');sensor=window.__BP_SENSOR_LAYERS_V5945__;if(!sensor||sensor.map!==map)sensor=mod.initSensorLayers(map)}if(!sensor||sensor.map!==map||typeof sensor.toggleLights!=='function')throw new Error('night-light controller did not attach to this map');const enabled=!!sensor.toggleLights();syncNightlightsButton(enabled);setStatus(enabled?'NASA NIGHT LIGHTS ON · requesting VIIRS tiles':'NASA NIGHT LIGHTS OFF · optional imagery removed')}catch(error){setStatus('NASA NIGHT LIGHTS UNAVAILABLE · '+String(error?.message||error).slice(0,90),true);console.warn('BridgePoint NASA night-lights toggle failed',error)}finally{nightlightsToggleBusy=false;nightlightsBtn.disabled=false}}nightlightsBtn.addEventListener('click',()=>{void toggleNasaNightlights()});$('[data-refresh]').addEventListener('click',()=>schedule(true,0));
 let cloudToggleBusy=false,cloudSavedBase=null,defaultCloudModeSynced=false;
 function cloudBaseRestoreSlot(){let slot=window.__BP_SKY_CLOUD_BASE_RESTORE_V6077__;if(!slot||slot.map!==map){slot={map,base:null};window.__BP_SKY_CLOUD_BASE_RESTORE_V6077__=slot}return slot}
 function saveCloudBase(mode){const base=mode==='satellite'?'satellite':'gta';cloudSavedBase=base;cloudBaseRestoreSlot().base=base;return base}
 function takeCloudRestoreBase(){const slot=cloudBaseRestoreSlot(),saved=cloudSavedBase||slot.base;const base=saved==='satellite'?'satellite':'gta';cloudSavedBase=null;slot.base=null;return base}
 function cloudWorldApi(){return [window.__BP_V5000_WORLD,window.__BP_LANDING_WORLD__,window.__BP_OWNER_WORLD__].find(w=>w?.map===map&&typeof w.setBase==='function')||null}
 function cloudCurrentBase(){const w=cloudWorldApi(),active=w?.base??w?.state?.base;if(w)return active==='satellite'?'satellite':'gta';return window.__BP_TECH_BASEMAP_V1116__?.activeBase==='satellite'?'satellite':'gta'}
 function setCloudEarthBase(mode){const w=cloudWorldApi();if(w){w.setBase(mode);return}try{const sat=mode==='satellite';for(const id of ['gta-nasa','gta-usgs','gta-oam'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',sat?'visible':'none');map.triggerRepaint?.()}catch(_){}}
 function syncCloudButton(enabled){cloudBtn.setAttribute('aria-pressed',String(!!enabled));cloudBtn.textContent=enabled?'☁ NASA EARTH + 3D CLOUDS · ON':'☁ NASA EARTH + 3D CLOUDS · OFF'}
 function adoptDefaultCloudMode(){if(defaultCloudModeSynced)return;const cloud=window.__BP_SKY_CLOUDS_V5908__;if(!cloud||cloud.map!==map||typeof cloud.setEnabled!=='function'||!cloud.enabled)return;const slot=cloudBaseRestoreSlot();if(!cloudSavedBase&&!slot.base)saveCloudBase(cloudCurrentBase());else cloudSavedBase=cloudSavedBase||slot.base;setCloudEarthBase('satellite');defaultCloudModeSynced=true;syncCloudButton(true)}
 window.addEventListener('bp:sky-cloud-state',e=>{if(e?.detail?.map&&e.detail.map!==map)return;const enabled=!!e?.detail?.enabled;syncCloudButton(enabled);if(enabled&&!cloudToggleBusy)adoptDefaultCloudMode()});
 setTimeout(adoptDefaultCloudMode,0);
 async function toggleSkyClouds(){
  if(cloudToggleBusy)return;cloudToggleBusy=true;cloudBtn.disabled=true;
  try{
   let cloud=window.__BP_SKY_CLOUDS_V5908__;
   if(!cloud||cloud.map!==map||typeof cloud.setEnabled!=='function'){
    const mod=await import('./world-v2300-clouds.js?v=6140-live-satellite-cloud-volume');
    cloud=window.__BP_SKY_CLOUDS_V5908__;if(!cloud||cloud.map!==map)cloud=mod.initSkyClouds(map)
   }
   if(!cloud||cloud.map!==map||typeof cloud.setEnabled!=='function')throw new Error('3D cloud controller did not attach to this map');
   const enabling=!cloud.enabled;
   if(enabling){
    const slot=cloudBaseRestoreSlot();if(!cloudSavedBase&&!slot.base)saveCloudBase(cloudCurrentBase());else cloudSavedBase=cloudSavedBase||slot.base;
    setCloudEarthBase('satellite');
    defaultCloudModeSynced=true;
    cloud.setEnabled(true);
   }else{
    cloud.setEnabled(false);
    const restore=takeCloudRestoreBase();
    setCloudEarthBase(restore);
   }
   const enabled=!!cloud.enabled;
   cloudBtn.setAttribute('aria-pressed',String(enabled));
   cloudBtn.textContent=enabled?'☁ NASA EARTH + 3D CLOUDS · ON':'☁ NASA EARTH + 3D CLOUDS · OFF';
   setStatus(enabled?'NASA BLUE MARBLE / SATELLITE IMAGERY + 3D CLOUD VOLUMES ON':'EARTH CLOUD MODE OFF · prior map imagery restored');
  }catch(error){
   setStatus('EARTH / CLOUD MODE UNAVAILABLE · '+String(error?.message||error).slice(0,90),true);
   console.warn('BridgePoint NASA Earth + cloud toggle failed',error)
  }finally{cloudToggleBusy=false;cloudBtn.disabled=false}
 }
 
 let skyViewBusy=false,skyViewRestore=null;const skyViewDiag=window.__BP_SKY_VIEW_CONTROLLER_V6077__={version:6077,map,listenerBound:false,clickCount:0,busy:false,phase:'initialized',lastError:null,initial:null,updatedAt:Date.now()};
 function skyProjectionType(){return String(map.getProjection?.()?.type||'mercator')}
 function syncSkyViewButton(active){skyViewBtn?.setAttribute('aria-pressed',String(!!active));if(skyViewBtn)skyViewBtn.textContent=active?'⬇ RETURN TO STREET':'⬆ LOOK UP · SKY VIEW'}
 function waitSkyMapState(test,timeoutMs,label){return new Promise((resolve,reject)=>{const start=performance.now();const tick=()=>{let ok=false;try{ok=!!test()}catch(_){}if(ok){resolve(true);return}if(performance.now()-start>=timeoutMs){reject(new Error(label+' timeout · projection='+skyProjectionType()+' · maxPitch='+String(map.getMaxPitch?.())+' · pitch='+String(map.getPitch?.())));return}requestAnimationFrame(tick)};requestAnimationFrame(tick)})}
 async function restoreSkyStreetView(restore){
  window.__BP_SKY_VIEW_OVERRIDE_V6077__=true;
  map.stop?.();
  const targetProjection=restore.projection==='globe'?'globe':restore.projection;
  const safePitch=Math.max(0,Math.min(Number(restore.pitch)||0,85));
  const camera={center:restore.center,zoom:restore.zoom,bearing:restore.bearing,pitch:safePitch,elevation:0};
  // Clear the above-horizon camera first. Keep this operation short and deterministic:
  // the production gate must see the camera and control restored, not just a map that
  // happens to look normal after a timed-out asynchronous cleanup.
  try{map.setMaxPitch(160)}catch(_){}
  try{map.setCenterClampedToGround(false)}catch(_){}
  map.jumpTo(camera);
  map.triggerRepaint?.();
  await waitSkyMapState(()=>map.getPitch()<90,1800,'safe pitch before projection restore');

  // Restore the requested projection only after the high pitch is gone.
  map.setCenterClampedToGround(true);
  map.setProjection({type:targetProjection});
  map.triggerRepaint?.();
  await waitSkyMapState(()=>skyProjectionType()===targetProjection,3000,'projection restore');

  const limit=Math.max(60,Math.min(Number(restore.maxPitch)||85,targetProjection==='globe'?85:110));
  map.setMaxPitch(limit);
  map.setCenterClampedToGround(true);
  map.jumpTo(camera);
  map.triggerRepaint?.();
  await waitSkyMapState(()=>map.getZoom()>0&&Math.abs(map.getZoom()-restore.zoom)<0.25&&map.getPitch()<90&&Math.abs(map.getPitch()-safePitch)<2&&skyProjectionType()===targetProjection&&map.getCenterClampedToGround?.()===true,3000,'street camera restore');
  window.__BP_SKY_VIEW_OVERRIDE_V6077__=false;
 }
 async function toggleSkyView(){
  if(skyViewBusy||!skyViewBtn)return;
  skyViewBusy=true;skyViewBtn.disabled=true;skyViewDiag.clickCount++;skyViewDiag.busy=true;skyViewDiag.phase='starting';skyViewDiag.lastError=null;skyViewDiag.failedAt=null;skyViewDiag.updatedAt=Date.now();
  try{
   if(!skyViewRestore){
    if(typeof map.setProjection!=='function'||typeof map.setMaxPitch!=='function'||typeof map.setCenterClampedToGround!=='function')throw new Error('free sky camera API unavailable');
    const center=map.getCenter(),projection=skyProjectionType(),previousPitch=map.getPitch(),previousMaxPitch=map.getMaxPitch?.()??85;
    skyViewRestore={center:[center.lng,center.lat],zoom:map.getZoom(),bearing:map.getBearing(),pitch:previousPitch,projection,maxPitch:previousMaxPitch};skyViewDiag.initial={center:skyViewRestore.center,zoom:skyViewRestore.zoom,bearing:skyViewRestore.bearing,pitch:previousPitch,maxPitch:previousMaxPitch,projection};
    window.__BP_SKY_VIEW_OVERRIDE_V6077__=true;skyViewDiag.overrideActive=true;
    map.stop?.();
    // MapLibre applies a projection change on its render cycle. Wait until Mercator is active
    // before raising maxPitch; otherwise the globe projection can keep the effective cap at 85°.
    skyViewDiag.phase='setting-mercator';skyViewDiag.updatedAt=Date.now();map.setProjection({type:'mercator'});
    map.triggerRepaint?.();
    await waitSkyMapState(()=>skyProjectionType()==='mercator',6000,'mercator projection activation');
    skyViewDiag.phase='raising-pitch-cap';skyViewDiag.updatedAt=Date.now();map.setMaxPitch(160);
    await waitSkyMapState(()=>Number(map.getMaxPitch?.())>=145,4000,'above-horizon pitch limit');
    skyViewDiag.phase='raising-center-pivot';skyViewDiag.updatedAt=Date.now();map.setCenterClampedToGround(false);
    const targetSkyPitch=125,skyZoom=Math.min((Number(map.getMaxZoom?.())||22)-0.1,Math.max(18.8,skyViewRestore.zoom)),skyCenter=map.getCenter();
    // Above 90°, the camera sits on the opposite side of the pivot. Raise that pivot so the camera remains above ground instead of being clipped at the horizon.
    if(typeof map.setCenterElevation==='function')map.setCenterElevation(0);
    map.jumpTo({center:[skyCenter.lng,skyCenter.lat],zoom:skyZoom,bearing:skyViewRestore.bearing,pitch:55,elevation:0});
    map.triggerRepaint?.();
    await waitSkyMapState(()=>map.getZoom()>=skyZoom-0.15&&Number(map.getPitch())<90,6000,'street-zoom sky baseline');
    const free=map.getFreeCameraOptions?.(),cameraAltitude=free?.position?.toAltitude?.(),basePitchRad=Number(map.getPitch())*Math.PI/180;
    let cameraDistance=Number.isFinite(cameraAltitude)&&Math.cos(basePitchRad)>0.1?cameraAltitude/Math.cos(basePitchRad):NaN;
    if(!Number.isFinite(cameraDistance)||cameraDistance<=0){const height=map.getCanvas?.()?.clientHeight||window.innerHeight||844,fov=Number(map.getVerticalFieldOfView?.())||36.87,pixels=(height/2)/Math.tan(fov*Math.PI/360),worldPixels=512*Math.pow(2,skyZoom),latScale=Math.max(0.12,Math.cos(skyCenter.lat*Math.PI/180)),pixelsPerMeter=worldPixels/(40075016.68557849*latScale);cameraDistance=pixels/pixelsPerMeter;}
    const rawGround=typeof map.queryTerrainElevation==='function'?map.queryTerrainElevation(skyCenter,{exaggerated:true}):null,groundReference=Number.isFinite(rawGround)?Math.max(0,rawGround):0,centerElevation=groundReference+6-Math.cos(targetSkyPitch*Math.PI/180)*cameraDistance;
    if(!Number.isFinite(centerElevation)||centerElevation<0||centerElevation>10000)throw new Error('sky pivot elevation out of bounds · distance='+cameraDistance+' · centerElevation='+centerElevation);
    if(typeof map.setCenterElevation==='function')map.setCenterElevation(centerElevation);
    map.jumpTo({center:[skyCenter.lng,skyCenter.lat],zoom:skyZoom,bearing:skyViewRestore.bearing,pitch:targetSkyPitch,elevation:centerElevation});
    skyViewDiag.pivot={targetSkyPitch,skyZoom,cameraDistanceMeters:cameraDistance,centerElevationMeters:centerElevation,groundReferenceMeters:groundReference,terrainSampleAvailable:Number.isFinite(rawGround)};
    skyViewDiag.phase='looking-above-horizon';skyViewDiag.updatedAt=Date.now();map.triggerRepaint?.();
    await waitSkyMapState(()=>skyProjectionType()==='mercator'&&Number(map.getMaxPitch?.())>=145&&Number(map.getPitch?.())>=120,8000,'above-horizon camera');
    syncSkyViewButton(true);skyViewDiag.phase='sky-active';skyViewDiag.updatedAt=Date.now();
    setStatus('SKY VIEW ON · looking above the street horizon · press RETURN TO STREET to restore');
   }else{
    const restore=skyViewRestore;
    skyViewDiag.phase='restoring-street';skyViewDiag.updatedAt=Date.now();
    await restoreSkyStreetView(restore);
    skyViewRestore=null;
    syncSkyViewButton(false);
    setStatus('STREET VIEW RESTORED · location and camera pitch restored');
   }
  }catch(error){
   skyViewDiag.failedAt={phase:skyViewDiag.phase,projection:skyProjectionType(),pitch:map.getPitch?.(),maxPitch:map.getMaxPitch?.(),zoom:map.getZoom?.(),overrideActive:window.__BP_SKY_VIEW_OVERRIDE_V6077__===true,error:String(error?.message||error)};
   skyViewDiag.lastError=String(error?.message||error);
   const restore=skyViewRestore;
   if(restore){
    try{await restoreSkyStreetView(restore)}catch(restoreError){console.warn('BridgePoint sky camera restore required fallback',restoreError);try{map.stop?.();map.setMaxPitch(85);map.setCenterClampedToGround(true);map.setProjection({type:'globe'});map.jumpTo({center:restore.center,zoom:restore.zoom,bearing:restore.bearing,pitch:Math.min(restore.pitch,85)})}catch(_){}}
   }
   skyViewDiag.phase='error-restoring';skyViewDiag.updatedAt=Date.now();skyViewRestore=null;syncSkyViewButton(false);
   setStatus('SKY VIEW UNAVAILABLE · '+String(error?.message||error).slice(0,140),true);
   console.warn('BridgePoint sky-facing camera failed',error);
  }finally{skyViewBusy=false;skyViewBtn.disabled=false;skyViewDiag.busy=false;if(skyViewDiag.phase!=='sky-active'&&!skyViewRestore)window.__BP_SKY_VIEW_OVERRIDE_V6077__=false;skyViewDiag.final={phase:skyViewDiag.phase,projection:skyProjectionType(),pitch:map.getPitch?.(),maxPitch:map.getMaxPitch?.(),zoom:map.getZoom?.(),buttonPressed:skyViewBtn?.getAttribute('aria-pressed'),overrideActive:window.__BP_SKY_VIEW_OVERRIDE_V6077__===true};skyViewDiag.updatedAt=Date.now()}
 }

 skyViewBtn?.addEventListener('click',()=>{void toggleSkyView()});skyViewDiag.listenerBound=true;skyViewDiag.phase='ready';skyViewDiag.updatedAt=Date.now();
 cloudBtn.addEventListener('click',()=>{void toggleSkyClouds()});
 const onBounds=()=>schedule(false,360),onStyle=()=>{ensureLayers();if(!map.getSource(SOURCE_ID))setTimeout(ensureLayers,250)};
 map.on('moveend',onBounds);map.on('zoomend',onBounds);map.on('styledata',onStyle);
 if(document.hidden)dock.dataset.suspended='true';
 const onVisibility=()=>{dock.dataset.suspended=String(document.hidden);if(!document.hidden&&Number(slider.value)>=30)schedule(false,80)};
 document.addEventListener('visibilitychange',onVisibility);
 ensureLayers();[80,350,1000,2200].forEach(ms=>setTimeout(()=>{if(!disposed)ensureLayers()},ms));schedule(true,300);
 const poll=setInterval(()=>{if(disposed)return clearInterval(poll);if(!document.hidden&&Number(slider.value)>=30&&Date.now()-lastRequestAt>110000)schedule(false,0)},15000);
 const api={version:5937,map,dock,refresh:()=>refresh(true),open(){setStandalone(true);return dock},close(){setStandalone(false);return dock},toggle(){setStandalone(dock.classList.contains('bpwt-collapsed'));return dock},setTimeOffsetDays(days){slider.value=String(Math.max(0,Math.min(30,30-Number(days||0))));live=Number(slider.value)>=30;updateDate();schedule(true,0)},toggleClouds:()=>cloudBtn.click(),get state(){return window.__BP_WORLD_ACTIVITY_SLIDER_STATE_V5908__||null},destroy(){disposed=true;stopPlay();clearTimeout(timer);clearTimeout(mountHandle);clearInterval(poll);map.off('moveend',onBounds);map.off('zoomend',onBounds);map.off('styledata',onStyle);document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('bp:nightlights-state',onNightlightsState);categoryFilter.removeEventListener('change',renderFiltered);domainFilter.removeEventListener('change',renderFiltered);dock.remove();try{map.getSource(SOURCE_ID)?.setData(EMPTY);if(map.getLayer(LAYER_LABEL))map.removeLayer(LAYER_LABEL);if(map.getLayer(LAYER_POINT))map.removeLayer(LAYER_POINT);if(map.getLayer(LAYER_LINE))map.removeLayer(LAYER_LINE);if(map.getLayer(LAYER_FILL))map.removeLayer(LAYER_FILL);if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID)}catch(_){} }};
 window.__BP_WORLD_TIME_SLIDER_V5908__=api;
 return api;
}
