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
#liveMap .bp-world-time-slider-v5908{
 position:absolute;z-index:18;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);
 width:min(620px,calc(100% - 24px));box-sizing:border-box;padding:12px 14px 11px;
 border:1px solid rgba(117,220,255,.42);border-radius:15px;
 background:linear-gradient(160deg,rgba(3,14,25,.91),rgba(4,21,34,.84));
 backdrop-filter:blur(13px) saturate(125%);-webkit-backdrop-filter:blur(13px) saturate(125%);
 color:#e8f7ff;font:12px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;
 box-shadow:0 13px 40px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.045);
 pointer-events:auto;
}
#liveMap .bp-world-time-slider-v5908 *{box-sizing:border-box}
#liveMap .bp-world-time-slider-v5908 .bpwt-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}
#liveMap .bp-world-time-slider-v5908 [data-collapse]{min-height:23px;padding:4px 8px;margin-left:2px;font-size:12px;line-height:1}
#liveMap .bp-world-time-slider-v5908.bpwt-collapsed{width:min(300px,calc(100% - 24px));padding:8px 11px}
#liveMap .bp-world-time-slider-v5908.bpwt-collapsed .bpwt-head{margin-bottom:0}
#liveMap .bp-world-time-slider-v5908.bpwt-collapsed>:not(.bpwt-head){display:none!important}
#liveMap .bp-world-time-slider-v5908 .bpwt-eyebrow{font-size:10px;letter-spacing:.13em;font-weight:900;color:#91eaff}
#liveMap .bp-world-time-slider-v5908 .bpwt-status{font-variant-numeric:tabular-nums;color:#b6d2e0;font-size:11px}
#liveMap .bp-world-time-slider-v5908 .bpwt-date{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin:0 0 2px}
#liveMap .bp-world-time-slider-v5908 .bpwt-date strong{font-size:14px;letter-spacing:.01em;color:#fff}
#liveMap .bp-world-time-slider-v5908 .bpwt-date span{font-size:11px;color:#9bbaca;text-align:right}
#liveMap .bp-world-time-slider-v5908 input[type=range]{appearance:none;-webkit-appearance:none;width:100%;height:23px;display:block;margin:2px 0 0;background:transparent;cursor:pointer;touch-action:pan-y}
#liveMap .bp-world-time-slider-v5908 input[type=range]::-webkit-slider-runnable-track{height:5px;border-radius:8px;background:linear-gradient(90deg,#427e9d,#8df1ff)}
#liveMap .bp-world-time-slider-v5908 input[type=range]::-moz-range-track{height:5px;border-radius:8px;background:linear-gradient(90deg,#427e9d,#8df1ff)}
#liveMap .bp-world-time-slider-v5908 input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:17px;height:17px;margin-top:-6px;border-radius:50%;border:2px solid #dffbff;background:#27c8ff;box-shadow:0 0 0 4px rgba(39,200,255,.2),0 0 15px rgba(39,200,255,.7)}
#liveMap .bp-world-time-slider-v5908 input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;border:2px solid #dffbff;background:#27c8ff;box-shadow:0 0 0 4px rgba(39,200,255,.2),0 0 15px rgba(39,200,255,.7)}
#liveMap .bp-world-time-slider-v5908 .bpwt-scale{display:flex;justify-content:space-between;color:#83a3b6;font-size:10px;margin-top:-1px}
#liveMap .bp-world-time-slider-v5908 .bpwt-controls{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:9px}
#liveMap .bp-world-time-slider-v5908 button{appearance:none;border:1px solid rgba(136,208,235,.3);border-radius:8px;background:rgba(18,51,70,.8);color:#e8f8ff;font:800 11px/1 system-ui,-apple-system,Segoe UI,sans-serif;padding:8px 10px;cursor:pointer;min-height:30px}
#liveMap .bp-world-time-slider-v5908 button:hover{background:rgba(30,90,116,.9)}
#liveMap .bp-world-time-slider-v5908 button[aria-pressed=true]{background:#146e88;border-color:#63eaff;color:#fff}
#liveMap .bp-world-time-slider-v5908 .bpwt-stats{margin-left:auto;color:#9fc4d6;font-size:10px;white-space:nowrap}
#liveMap .bp-world-time-slider-v5908 .bpwt-note{border-top:1px solid rgba(120,190,219,.18);margin-top:8px;padding-top:7px;color:#9db7c6;font-size:10px;line-height:1.4}
#liveMap .bp-world-time-slider-v5908 .bpwt-list{display:flex;gap:6px;overflow-x:auto;scrollbar-width:thin;margin-top:7px;padding-bottom:2px}
#liveMap .bp-world-time-slider-v5908 .bpwt-item{flex:1 0 145px;min-width:0;text-align:left;line-height:1.3;padding:7px 8px}
#liveMap .bp-world-time-slider-v5908 .bpwt-item b{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#liveMap .bp-world-time-slider-v5908 .bpwt-item small{display:block;color:#9fc4d6;font-size:9px;margin-top:4px;white-space:nowrap}
#liveMap .bp-world-time-slider-v5908 .bpwt-item[hidden]{display:none}
#liveMap .bp-world-time-slider-v5908 .bpwt-error{color:#ffc5b4}
@media(max-width:700px){
 #liveMap .bp-world-time-slider-v5908{width:calc(100% - 14px);bottom:max(10px,env(safe-area-inset-bottom));padding:10px;border-radius:13px}
 #liveMap .bp-world-time-slider-v5908 .bpwt-eyebrow{font-size:9px}
 #liveMap .bp-world-time-slider-v5908 .bpwt-date strong{font-size:12px}
 #liveMap .bp-world-time-slider-v5908 .bpwt-date span{font-size:10px}
 #liveMap .bp-world-time-slider-v5908 .bpwt-controls{gap:5px}
 #liveMap .bp-world-time-slider-v5908 button{padding:8px 8px;font-size:10px}
 #liveMap .bp-world-time-slider-v5908 .bpwt-stats{flex:1 0 100%;margin:0}
 #liveMap .bp-world-time-slider-v5908 .bpwt-note{font-size:9px}
}
`;

const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function sourceColor(p){
 const k=String(p?.event_type_key||p?.family_key||'').toUpperCase();
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
 const dock=document.createElement('section');dock.id=ROOT_ID;dock.className='bp-world-time-slider-v5908';dock.setAttribute('aria-label','World activity time slider');
 dock.innerHTML=`
  <div class="bpwt-head"><span class="bpwt-eyebrow">WORLD ACTIVITY · 30-DAY SCRUB</span><span class="bpwt-status" data-status>CONNECTING</span><button type="button" data-collapse aria-expanded="true" aria-label="Collapse world activity controls">⌄</button></div>
  <div class="bpwt-date"><strong data-date>Latest source observations</strong><span data-window>24-hour observation window</span></div>
  <input data-slider type="range" min="0" max="30" step="1" value="30" aria-label="Browse world activity from 30 days ago to now">
  <div class="bpwt-scale"><span>30 DAYS AGO</span><span>LIVE NOW</span></div>
  <div class="bpwt-controls">
   <button type="button" data-live aria-pressed="true">● LIVE</button>
   <button type="button" data-play aria-pressed="false">▶ PLAY</button>
   <button type="button" data-clouds aria-pressed="true">☁ CLOUDS ON</button>
   <button type="button" data-refresh>↻ REFRESH</button>
   <span class="bpwt-stats" data-stats>Waiting for map bounds…</span>
  </div>
  <div class="bpwt-list" data-list aria-label="Recent source-reported changes"></div>
  <div class="bpwt-note">Time-filtered source observations, not a historical rewind of building geometry or imagery. Forecasts/events are context—not proof of physical damage or sale intent.</div>`;
 container.appendChild(dock);
 const $=s=>dock.querySelector(s),slider=$('[data-slider]'),status=$('[data-status]'),date=$('[data-date]'),windowLabel=$('[data-window]'),stats=$('[data-stats]'),list=$('[data-list]'),liveBtn=$('[data-live]'),playBtn=$('[data-play]'),cloudBtn=$('[data-clouds]');
 const collapseBtn=$('[data-collapse]');
 collapseBtn.addEventListener('click',()=>{
  const collapsed=dock.classList.toggle('bpwt-collapsed');
  collapseBtn.setAttribute('aria-expanded',String(!collapsed));
  collapseBtn.setAttribute('aria-label',collapsed?'Expand world activity controls':'Collapse world activity controls');
  collapseBtn.textContent=collapsed?'⌃':'⌄';
 });
 let seq=0,timer=null,playTimer=null,disposed=false,playing=false,live=true,lastFeatures=[],lastMode='LIVE',lastRequestAt=0;
 const setStatus=(s,err=false)=>{status.textContent=s;status.classList.toggle('bpwt-error',!!err)};
 function selectedAt(){const val=Number(slider.value);if(val>=30)return new Date();return new Date(Date.now()-(30-val)*DAY)}
 function updateDate(){const d=selectedAt();date.textContent=Number(slider.value)>=30?'LIVE · '+dateLabel(d):dateLabel(d);windowLabel.textContent='Previous 24h ending at selected time'}
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
  const my=++seq,at=selectedAt(),args={...boundsArgs(),p_at:at.toISOString(),p_window_hours:24,p_limit:600};
  const liveNow=Number(slider.value)>=30;
  lastMode=liveNow?'LIVE':'HISTORY';updateDate();setStatus(liveNow?'REFRESHING LIVE…':'LOADING HISTORY…');
  try{
   const data=await rpc('bridgepoint_public_world_activity_v5908',args,6500);
   if(disposed||my!==seq)return;
   if(!data?.resolved||!data?.complete)throw new Error(data?.error||'ACTIVITY_FEED_UNAVAILABLE');
   const fc=data.geojson&&Array.isArray(data.geojson.features)?data.geojson:EMPTY;
   for(const f of fc.features){f.properties=f.properties||{};f.properties.display_color=sourceColor(f.properties)}
   map.getSource(SOURCE_ID).setData(fc);lastFeatures=fc.features;lastRequestAt=Date.now();
   const hz=Number(data.hazard_observations||0),ge=Number(data.global_events||0),num=fc.features.length;
   stats.textContent=num.toLocaleString()+' shown · '+hz.toLocaleString()+' hazards · '+ge.toLocaleString()+' global events';
   buildList(lastFeatures);setStatus(liveNow?'LIVE · UPDATED':'HISTORY · LOADED');dock.dataset.version='5908';
   window.__BP_WORLD_ACTIVITY_SLIDER_STATE_V5908__={version:5908,mode:lastMode,selectedAt:at.toISOString(),windowHours:24,returned:num,hazards:hz,globalEvents:ge,viewport:args,lastUpdatedAt:new Date(lastRequestAt).toISOString(),historicalReplay:false};
  }catch(e){
   if(disposed||my!==seq)return;
   setStatus('FEED RETRY',true);stats.textContent='Could not refresh source-reported activity.';console.warn('BridgePoint public world activity',e?.message||e);
  }
 }
 function schedule(force=false,delay=220){clearTimeout(timer);timer=setTimeout(()=>void refresh(force),delay)}
 slider.addEventListener('input',()=>{playing&&stopPlay();live=Number(slider.value)>=30;liveBtn.setAttribute('aria-pressed',String(live));schedule(true,120)});
 liveBtn.addEventListener('click',()=>{slider.value='30';live=true;liveBtn.setAttribute('aria-pressed','true');stopPlay();schedule(true,0)});
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
 $('[data-refresh]').addEventListener('click',()=>schedule(true,0));
 cloudBtn.addEventListener('click',()=>{
  const cloud=window.__BP_SKY_CLOUDS_V5908__;
  if(cloud?.toggle){const enabled=cloud.toggle();cloudBtn.setAttribute('aria-pressed',String(enabled));cloudBtn.textContent=enabled?'☁ CLOUDS ON':'☁ CLOUDS OFF'}
  else{window.dispatchEvent(new Event('bp:sky-cloud-toggle'));const enabled=cloudBtn.getAttribute('aria-pressed')!=='true';cloudBtn.setAttribute('aria-pressed',String(enabled));cloudBtn.textContent=enabled?'☁ CLOUDS ON':'☁ CLOUDS OFF'}
 });
 const onBounds=()=>schedule(false,360),onStyle=()=>{ensureLayers();if(!map.getSource(SOURCE_ID))setTimeout(ensureLayers,250)};
 map.on('moveend',onBounds);map.on('zoomend',onBounds);map.on('styledata',onStyle);
 if(document.hidden)dock.dataset.suspended='true';
 const onVisibility=()=>{dock.dataset.suspended=String(document.hidden);if(!document.hidden&&Number(slider.value)>=30)schedule(false,80)};
 document.addEventListener('visibilitychange',onVisibility);
 ensureLayers();[80,350,1000,2200].forEach(ms=>setTimeout(()=>{if(!disposed)ensureLayers()},ms));schedule(true,300);
 const poll=setInterval(()=>{if(disposed)return clearInterval(poll);if(!document.hidden&&Number(slider.value)>=30&&Date.now()-lastRequestAt>110000)schedule(false,0)},15000);
 const api={version:5908,map,dock,refresh:()=>refresh(true),setTimeOffsetDays(days){slider.value=String(Math.max(0,Math.min(30,30-Number(days||0))));live=Number(slider.value)>=30;schedule(true,0)},toggleClouds:()=>cloudBtn.click(),get state(){return window.__BP_WORLD_ACTIVITY_SLIDER_STATE_V5908__||null},destroy(){disposed=true;stopPlay();clearTimeout(timer);clearInterval(poll);map.off('moveend',onBounds);map.off('zoomend',onBounds);map.off('styledata',onStyle);document.removeEventListener('visibilitychange',onVisibility);dock.remove();try{map.getSource(SOURCE_ID)?.setData(EMPTY);if(map.getLayer(LAYER_LABEL))map.removeLayer(LAYER_LABEL);if(map.getLayer(LAYER_POINT))map.removeLayer(LAYER_POINT);if(map.getLayer(LAYER_LINE))map.removeLayer(LAYER_LINE);if(map.getLayer(LAYER_FILL))map.removeLayer(LAYER_FILL);if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID)}catch(_){} }};
 window.__BP_WORLD_TIME_SLIDER_V5908__=api;
 return api;
}
