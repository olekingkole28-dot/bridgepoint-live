(()=>{
'use strict';
if(window.__BP_WATER_FLOW_BUOYS_V1__)return;
const VERSION=1, SOURCE='bp-water-flow-buoys-v1', ICON_LAYER=SOURCE+'-icons', LABEL_LAYER=SOURCE+'-labels';
const NDBC_URL='https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt';
const CURRENT_ENDPOINTS=[
 'https://cwcgom.aoml.noaa.gov/erddap/griddap/miamicurrents.json',
 'https://erddap.ipma.pt/erddap/griddap/miamicurrents.json',
 'https://erddap.riddc.brown.edu/erddap/griddap/miamicurrents.json'
];
const CURRENT_SLICE='[(last)][(-64.7):1.6:(64.7)][(-179.9):1.6:(179.9)]';
const COLORS={green:'#35e89a',yellow:'#ffd166',red:'#ff5266'};
const $=s=>document.querySelector(s);
const state={version:VERSION,active:false,status:'waiting-for-map',buoys:0,flowStrokes:0,currentDate:null,currentSource:null,lastBuoyUpdate:null,error:null};
window.__BP_WATER_FLOW_BUOYS_V1__=state;
let map=null,button=null,sourceReady=false,layerReady=false,buoyData=new Map(),field=[],fieldLookup=new Map(),currentFetchAt=0;
let flowCanvas=null,flowCtx=null,flowSamples=[],flowFrame=0,flowBuildRaf=0,flowBuildGeneration=0,lastFrame=0,rebuildTimer=0,bouyTimer=0,currentTimer=0;
let statusBox=null,card=null,viewer=null,markerById=new Map(),markerMap=null,styleObserver=null,buttonObserver=null,styleInstalled=false,layersInstalling=false,markerZoomTimer=0;
const WATER_FILL_RE=/water|ocean|sea|lake|pond|reservoir|hydro/i;
const FLOW_LAYER_IDS=[];
function worldMap(){return window.__BP_LANDING_WORLD__?.map||window.__bpLandingWorldV5420?.map||window.__BP_V5000_WORLD__?.map||window.__BP_V5000_WORLD?.map||window.__bpWorldV2300?.map||window.__BP_WORLD_V2300__?.map||null}
function timeoutFetch(url,ms=12000){const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),ms);return fetch(url,{signal:ctl.signal,cache:'no-store',mode:'cors'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r}).finally(()=>clearTimeout(timer))}
function addStyles(){
 if($('#bp-water-flow-buoys-style-v1'))return;
 const s=document.createElement('style');s.id='bp-water-flow-buoys-style-v1';
 s.textContent=[
  '.bp-water-flow-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}',
  '.bp-water-flow-status{position:absolute;z-index:4;top:62px;left:12px;padding:8px 11px;border:1px solid rgba(84,225,210,.34);border-radius:11px;background:rgba(3,16,23,.83);backdrop-filter:blur(9px);color:#dffcff;font:700 10px/1.45 system-ui,sans-serif;pointer-events:none;box-shadow:0 5px 22px #0006}',
  '.bp-water-flow-status b{color:#66f0cf}.bp-water-flow-legend{display:flex;gap:9px;margin-top:4px;color:#b2c9d0;font-size:9px}.bp-water-flow-legend i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:3px}',
  '.bp-buoy-marker{width:30px;height:58px;position:relative;cursor:pointer;perspective:90px;transform-style:preserve-3d;filter:drop-shadow(0 3px 4px #0009)}',
  '.bp-buoy-model{position:absolute;inset:0;transform-style:preserve-3d;animation:bp-buoy-rock-v1 2.5s ease-in-out infinite}',
  '.bp-buoy-mast{position:absolute;left:14px;bottom:18px;width:3px;height:35px;background:linear-gradient(90deg,#c9e9e8,#354b55 45%,#eef9f6);border-radius:3px;box-shadow:0 0 3px #fff8}',
  '.bp-buoy-cross{position:absolute;left:7px;bottom:30px;width:17px;height:3px;background:#dcebea;border-radius:2px;transform:rotateX(55deg)}',
  '.bp-buoy-lamp{position:absolute;left:10px;bottom:48px;width:10px;height:8px;border-radius:4px 4px 2px 2px;background:#fff4b4;box-shadow:0 0 9px 3px var(--buoy-color)}',
  '.bp-buoy-hull{position:absolute;left:4px;bottom:5px;width:23px;height:17px;border-radius:45% 45% 50% 50%;background:linear-gradient(90deg,#071821 0%,var(--buoy-color) 27%,var(--buoy-color) 67%,#f4f5e8 70%,#253c45 100%);transform:rotateX(17deg);box-shadow:inset 0 -4px 4px #00131b99}',
  '.bp-buoy-ring{position:absolute;left:3px;bottom:11px;width:25px;height:7px;border:2px solid #e4e6dc;border-radius:50%;box-shadow:0 0 2px #000}',
  '.bp-buoy-waterline{position:absolute;left:0;bottom:2px;width:30px;height:4px;border-top:1px solid #70d8ff;border-radius:50%;opacity:.82}',
  '@keyframes bp-buoy-rock-v1{0%,100%{transform:translateY(0) rotateZ(-4deg) rotateX(2deg)}50%{transform:translateY(-3px) rotateZ(5deg) rotateX(-3deg)}}',
  '.bp-water-buoy-card{position:absolute;z-index:8;left:12px;bottom:122px;width:min(352px,calc(100% - 24px));max-height:58vh;overflow:auto;border:1px solid rgba(98,224,241,.4);border-radius:15px;background:linear-gradient(155deg,rgba(5,24,36,.97),rgba(3,10,17,.97));box-shadow:0 18px 46px #000a;color:#e8faff;font:12px/1.45 system-ui,sans-serif;backdrop-filter:blur(12px)}',
  '.bp-wb-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:12px 13px 8px}.bp-wb-title{font-size:15px;font-weight:900;color:#8ff2ff}.bp-wb-sub{font-size:10px;color:#9bbbc7;margin-top:2px}.bp-wb-close{border:1px solid #ffffff22;background:#ffffff10;color:#eafcff;border-radius:8px;width:28px;height:28px;font-size:18px;cursor:pointer}',
  '.bp-wb-view{height:132px;margin:0 12px 7px;border:1px solid #68d7ff2b;border-radius:11px;overflow:hidden;background:radial-gradient(ellipse at 50% 25%,#16486a,#051723 68%)}.bp-wb-view canvas{width:100%;height:100%;display:block}',
  '.bp-wb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:4px 12px 8px}.bp-wb-metric{padding:7px 8px;border-radius:8px;background:#ffffff0c;border:1px solid #a1eaff16;min-width:0}.bp-wb-metric span{display:block;font-size:9px;color:#8eabb7}.bp-wb-metric b{display:block;font-size:11px;color:#e9fcff;overflow-wrap:anywhere}',
  '.bp-wb-chart-wrap{margin:0 12px 8px;padding:8px;border:1px solid #7be6ff24;border-radius:10px;background:#021019a8}.bp-wb-chart-title{font-size:10px;font-weight:900;color:#c8f8ff;margin-bottom:5px}.bp-wb-chart{display:block;width:100%;height:74px;overflow:visible}.bp-wb-chart polyline{fill:none;stroke:#66dfff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:5 3;animation:bp-wb-dash 2.2s linear infinite}.bp-wb-chart line{stroke-width:1.3}.bp-wb-chart circle{fill:#fff;stroke:#68dfff;stroke-width:2;animation:bp-wb-pulse 1.5s ease-in-out infinite;transform-box:fill-box;transform-origin:center}.bp-wb-chart-note{font-size:9px;color:#91aeb9;min-height:13px}.bp-wb-key{display:flex;gap:12px;font-size:9px;color:#acc6ce;margin-top:4px}.bp-wb-key i{display:inline-block;width:14px;border-top:2px solid #59e8aa;margin:0 4px 3px 0}.bp-wb-key i.current{border-color:#ff6c79;border-top-style:solid}.bp-wb-foot{padding:0 12px 10px;font-size:9px;color:#7e9ba9}.bp-wb-foot a{color:#7ceaff}',
  '@keyframes bp-wb-dash{to{stroke-dashoffset:-32}}@keyframes bp-wb-pulse{50%{r:5}}',
  '@media(max-width:700px){.bp-water-flow-status{top:56px;left:8px;font-size:9px}.bp-water-buoy-card{left:8px;bottom:calc(env(safe-area-inset-bottom) + 124px);width:calc(100% - 16px);max-height:48vh}.bp-wb-view{height:116px}}'
 ].join('');
 document.head.appendChild(s);
}
function makeStatus(){
 if(!map||statusBox)return;
 const box=document.createElement('div');box.className='bp-water-flow-status';box.hidden=true;
 box.innerHTML='<div><b>WATER + FLOW</b> · <span data-bpw-status>Loading live layers…</span></div><div class="bp-water-flow-legend"><span><i style="background:#35e89a"></i>calm</span><span><i style="background:#ffd166"></i>moderate</span><span><i style="background:#ff5266"></i>major</span></div>';
 map.getContainer().appendChild(box);statusBox=box;
}
function setStatus(){
 if(!statusBox)return;
 const label=statusBox.querySelector('[data-bpw-status]');
 const date=state.currentDate?new Date(state.currentDate).toLocaleDateString():'loading current grid';
 const val=(state.flowStrokes||0).toLocaleString()+' moving lines · '+(state.buoys||0).toLocaleString()+' active stations · currents through '+date;
 if(label)label.textContent=state.error?'feed retrying · '+(state.buoys||0)+' stations':val;
}
function addSvgIcon(id,color){
 if(!map||map.hasImage?.(id))return Promise.resolve();
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 48 64"><ellipse cx="24" cy="54" rx="16" ry="5" fill="#04202b" opacity=".7"/><path d="M24 5v34" stroke="#e7ffff" stroke-width="4" stroke-linecap="round"/><path d="M11 26h26" stroke="#d9f4f3" stroke-width="3" stroke-linecap="round"/><rect x="18" y="6" width="12" height="9" rx="3" fill="#fff5b1" stroke="'+color+'" stroke-width="3"/><path d="M13 36h22l8 10-6 9H11l-6-9z" fill="'+color+'" stroke="#f1ffff" stroke-width="2"/><path d="M12 48h24" stroke="#eefaff" stroke-width="3"/></svg>';
 return new Promise(resolve=>{const img=new Image();img.onload=()=>{try{if(!map.hasImage?.(id))map.addImage(id,img,{pixelRatio:2})}catch(_){}resolve()};img.onerror=()=>resolve();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)});
}
async function ensureLayers(){
 if(!map||!map.isStyleLoaded?.()||layersInstalling)return;
 layersInstalling=true;
 try{
  const container=map.getContainer();
  if(!flowCanvas){flowCanvas=document.createElement('canvas');flowCanvas.className='bp-water-flow-canvas';flowCanvas.setAttribute('aria-hidden','true');container.appendChild(flowCanvas);flowCtx=flowCanvas.getContext('2d',{alpha:true})}
  makeStatus();
  await Promise.all([addSvgIcon(SOURCE+'-green',COLORS.green),addSvgIcon(SOURCE+'-yellow',COLORS.yellow),addSvgIcon(SOURCE+'-red',COLORS.red)]);
  if(!map||!map.isStyleLoaded?.())return;
  if(!map.getSource(SOURCE)){map.addSource(SOURCE,{type:'geojson',data:{type:'FeatureCollection',features:[]}})}
  if(!map.getLayer(ICON_LAYER)){
   map.addLayer({id:ICON_LAYER,type:'symbol',source:SOURCE,layout:{
    'icon-image':['match',['get','severity'],'red',SOURCE+'-red','yellow',SOURCE+'-yellow',SOURCE+'-green'],
    'icon-size':['interpolate',['linear'],['zoom'],0,.42,2,.57,5,.78,9,1.0,14,1.15],
    'icon-allow-overlap':true,'icon-ignore-placement':true
   },paint:{'icon-opacity':.96}});
  }
  if(!map.getLayer(LABEL_LAYER)){
   map.addLayer({id:LABEL_LAYER,type:'symbol',source:SOURCE,minzoom:7,layout:{'text-field':['get','station'],'text-size':10,'text-offset':[0,1.25],'text-anchor':'top','text-allow-overlap':false,'text-ignore-placement':false},paint:{'text-color':'#eaffff','text-halo-color':'#031018','text-halo-width':1.3}});
  }
  sourceReady=true;layerReady=true;styleInstalled=true;
  setVisible(enabled);attachMapHandlers();setStatus();scheduleFlowBuild(100);
 }catch(err){state.error=String(err?.message||err);setStatus()}
 finally{layersInstalling=false}
}
function setVisible(on){
 if(flowCanvas)flowCanvas.style.display=on?'block':'none';
 if(statusBox)statusBox.hidden=!on;
 if(!map)return;
 for(const id of [ICON_LAYER,LABEL_LAYER])try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}
}
function parseLatest(text){
 const out=new Map();
 const rows=String(text||'').split(/\r?\n/).filter(x=>x&&!x.startsWith('#'));
 for(const row of rows){
  const c=row.trim().split(/\s+/);if(c.length<22)continue;
  const id=c[0];if(!/^[a-z0-9_-]{2,12}$/i.test(id))continue;
  const lat=Number(c[1]),lon=Number(c[2]);if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
  const date=new Date(Date.UTC(Number(c[3]),Number(c[4])-1,Number(c[5]),Number(c[6]),Number(c[7])));
  if(!Number.isFinite(date.getTime()))continue;
  const age=Date.now()-date.getTime();if(age>2*3600000||age< -60000)continue;
  const val=i=>{const n=Number(c[i]);return Number.isFinite(n)&&c[i]!=='MM'?n:null};
  const rec={id,station:id.toUpperCase(),lat,lon,time:date.toISOString(),windDir:val(8),wind:val(9),gust:val(10),wave:val(11),wavePeriod:val(12),waveAvgPeriod:val(13),waveDir:val(14),pressure:val(15),pressureTrend:val(16),airTemp:val(17),waterTemp:val(18),dewPoint:val(19),visibility:val(20),tideFt:val(21),history:null};
  rec.severity=severityFor(rec,flowAt(lat,lon).speed);out.set(id,rec);
 }
 return out;
}
function severityFor(rec,speed){
 if(Number.isFinite(rec.wave)&&rec.wave>=2.8||Number.isFinite(rec.gust)&&rec.gust>=20||speed>=1.0)return'red';
 if(Number.isFinite(rec.wave)&&rec.wave>=1.25||Number.isFinite(rec.gust)&&rec.gust>=12||speed>=.45)return'yellow';
 if(Number.isFinite(rec.wave)||Number.isFinite(rec.wind)||Number.isFinite(rec.tideFt))return'green';
 return'yellow';
}
function featuresForBuoys(){
 return {type:'FeatureCollection',features:[...buoyData.values()].map(r=>({type:'Feature',geometry:{type:'Point',coordinates:[r.lon,r.lat]},properties:{station:r.station,severity:r.severity,wave:r.wave,tideFt:r.tideFt,wind:r.wind,updated:r.time}}))};
}
async function loadBuoys(){
 try{
  const response=await timeoutFetch(NDBC_URL,12000),text=await response.text();
  const latest=parseLatest(text);
  if(latest.size){buoyData=latest;state.buoys=latest.size;state.lastBuoyUpdate=new Date().toISOString();state.error=null}
  if(sourceReady)map.getSource(SOURCE)?.setData(featuresForBuoys());
  refreshSeverity();buildCloseMarkers();setStatus();
 }catch(err){state.error='NDBC: '+String(err?.message||err);setStatus()}
}
async function loadCurrentGrid(force=false){
 if(!force&&field.length&&Date.now()-currentFetchAt<60*60*1000)return;
 state.status='loading-current-grid';setStatus();
 const q='u_current'+CURRENT_SLICE+',v_current'+CURRENT_SLICE;
 let lastError=null;
 for(const root of CURRENT_ENDPOINTS){
  try{
   const url=root+'?'+encodeURIComponent(q);
   const response=await timeoutFetch(url,18000),data=await response.json();
   const table=data.table||data,columns=table.columnNames||data.columnNames||[],rows=table.rows||data.rows||[];
   if(!Array.isArray(rows)||!rows.length)throw new Error('The current grid returned no rows');
   const index=(re)=>{const i=columns.findIndex(x=>re.test(String(x)));return i>=0?i:null};
   const latI=index(/^latitude/i)??1,lonI=index(/^longitude/i)??2,uI=index(/^u_current/i)??3,vI=index(/^v_current/i)??4,timeI=index(/^time/i)??0;
   const next=[];
   for(const row of rows){
    const lat=Number(row[latI]),lon=Number(row[lonI]),u=Number(row[uI]),v=Number(row[vI]);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(u)||!Number.isFinite(v)||Math.abs(u)>5||Math.abs(v)>5)continue;
    const speed=Math.hypot(u,v);
    const li=Math.round((lat+64.7)/1.6),oi=Math.round((lon+179.9)/1.6);
    const item={lat,lon,u,v,speed,li,oi};next.push(item);
   }
   if(!next.length)throw new Error('The current grid contained no usable velocity samples');
   field=next;fieldLookup.clear();for(const p of field)fieldLookup.set(p.li+':'+p.oi,p);
   const dateVal=rows.find(r=>r[timeI]!=null)?.[timeI];
   state.currentDate=typeof dateVal==='number'?new Date(dateVal*1000).toISOString():String(dateVal||'').replace(' ','T');
   state.currentSource=root;state.status='ready';currentFetchAt=Date.now();state.error=null;
   refreshSeverity();setStatus();scheduleFlowBuild(20);return;
  }catch(err){lastError=err}
 }
 state.status='estimated-fallback';state.error='Current grid: '+String(lastError?.message||lastError||'unavailable');
 setStatus();scheduleFlowBuild(20);
}
function flowAt(lat,lon){
 if(field.length&&Math.abs(lat)<=66){
  const li=Math.round((lat+64.7)/1.6),oi=Math.round((lon+179.9)/1.6);
  let best=null,dist=Infinity;
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
   const p=fieldLookup.get((li+a)+':'+(oi+b));if(!p)continue;
   const d=(p.lat-lat)*(p.lat-lat)*Math.cos(lat*Math.PI/180)**2+(p.lon-lon)*(p.lon-lon);
   if(d<dist){dist=d;best=p}
  }
  if(best&&dist<16)return best;
 }
 const phase=(Math.sin(lat*.18+lon*.13)+Math.cos(lon*.09-lat*.2))*Math.PI;
 const speed=.035+Math.abs(Math.sin(lat*.11+lon*.08))*.07;
 return {lat,lon,u:Math.cos(phase)*speed,v:Math.sin(phase)*speed,speed,estimated:true};
}
function refreshSeverity(){
 for(const rec of buoyData.values())rec.severity=severityFor(rec,flowAt(rec.lat,rec.lon).speed);
}
function attachMapHandlers(){
 if(!map||map.__bpWaterFlowEventsV1)return;
 map.__bpWaterFlowEventsV1=true;
 const schedule=()=>{scheduleFlowBuild(260);clearTimeout(markerZoomTimer);markerZoomTimer=setTimeout(buildCloseMarkers,230)};
 ['moveend','zoomend','resize'].forEach(name=>map.on(name,schedule));
 map.on('click',ICON_LAYER,e=>{const f=e.features?.[0];const id=f?.properties?.station;if(id)openBuoy(String(id))});
 map.on('mouseenter',ICON_LAYER,()=>{try{map.getCanvas().style.cursor='pointer'}catch(_){}});
 map.on('mouseleave',ICON_LAYER,()=>{try{map.getCanvas().style.cursor=''}catch(_){}});
}
function waterLayers(){
 try{return (map.getStyle()?.layers||[]).filter(l=>l.type==='fill'&&WATER_FILL_RE.test(l.id)&&!/(flow|label|symbol|shadow|outline)/i.test(l.id)&&map.getLayoutProperty(l.id,'visibility')!=='none').map(l=>l.id)}catch(_){return[]}
}
function seeded(x,y){const a=Math.sin(x*127.1+y*311.7)*43758.5453;return a-Math.floor(a)}
function scheduleFlowBuild(delay=160){
 if(!enabled||!map)return;clearTimeout(rebuildTimer);const generation=++flowBuildGeneration;rebuildTimer=setTimeout(()=>buildFlowSamples(generation),delay);
}
function buildFlowSamples(generation=flowBuildGeneration){
 if(!enabled||!map||!flowCanvas||!map.isStyleLoaded?.())return;
 const rect=map.getContainer().getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
 const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
 if(flowCanvas.width!==Math.round(w*dpr)||flowCanvas.height!==Math.round(h*dpr)){flowCanvas.width=Math.round(w*dpr);flowCanvas.height=Math.round(h*dpr);flowCanvas.style.width=w+'px';flowCanvas.style.height=h+'px'}
 const water=waterLayers(),waterReady=water.length>0,step=(w<700?14:16),samples=[],max=5200;
 const finish=()=>{if(generation!==flowBuildGeneration||!enabled)return;flowSamples=samples;state.flowStrokes=samples.length;setStatus();startFlowAnimation()};
 if(waterReady){
  let x=step/2,y=step/2;
  const processChunk=()=>{
   if(!enabled||generation!==flowBuildGeneration||!map)return;
   const deadline=performance.now()+7;let checked=0;
   while(y<h&&samples.length<max&&checked<80&&performance.now()<deadline){
    const sx=x+(seeded(x,y)-.5)*3,sy=y+(seeded(y,x)-.5)*3;
    x+=step;if(x>=w){x=step/2;y+=step}checked++;
    let hits=[];try{hits=map.queryRenderedFeatures([sx,sy],{layers:water})}catch(_){}
    if(!hits.length)continue;
    const ll=map.unproject([sx,sy]);if(!Number.isFinite(ll.lat)||!Number.isFinite(ll.lng))continue;
    const vector=flowAt(ll.lat,ll.lng),mag=Math.max(.01,vector.speed||.01);
    const latStep=(vector.v/mag)*.018,lonStep=(vector.u/mag)*.018/Math.max(.12,Math.cos(ll.lat*Math.PI/180));
    let p2;try{p2=map.project([ll.lng+lonStep,ll.lat+latStep])}catch(_){continue}
    let dx=p2.x-sx,dy=p2.y-sy,d=Math.hypot(dx,dy);if(!Number.isFinite(d)||d<.0001){dx=1;dy=0;d=1}
    samples.push({x:sx,y:sy,dx:dx/d,dy:dy/d,speed:vector.speed||.02,phase:seeded(x+101,y+7),length:7+Math.min(12,(vector.speed||.02)*11),estimated:vector.estimated===true});
   }
   if(y<h&&samples.length<max){flowBuildRaf=requestAnimationFrame(processChunk);return}
   flowBuildRaf=0;finish();
  };
  processChunk();
 }else{
  const stride=Math.max(1,Math.ceil(field.length/max));
  for(let i=0;i<field.length&&samples.length<max;i+=stride){const p=field[i];
   let pos;try{pos=map.project([p.lon,p.lat])}catch(_){continue}
   if(pos.x<-30||pos.x>w+30||pos.y<-30||pos.y>h+30)continue;
   const latStep=(p.v/Math.max(.02,p.speed))*.018,lonStep=(p.u/Math.max(.02,p.speed))*.018/Math.max(.12,Math.cos(p.lat*Math.PI/180));
   let p2;try{p2=map.project([p.lon+lonStep,p.lat+latStep])}catch(_){continue}
   let dx=p2.x-pos.x,dy=p2.y-pos.y,d=Math.hypot(dx,dy)||1;
   samples.push({x:pos.x,y:pos.y,dx:dx/d,dy:dy/d,speed:p.speed,phase:seeded(p.lon,p.lat),length:8+Math.min(12,p.speed*11)});
  }
  finish();
 }
}
function flowColor(speed){
 if(speed>=.55)return COLORS.red;
 if(speed>=.22)return COLORS.yellow;
 return COLORS.green;
}
function drawFlow(now){
 flowFrame=0;
 if(!enabled||!flowCtx||!flowCanvas)return;
 if(now-lastFrame<40){flowFrame=requestAnimationFrame(drawFlow);return}
 lastFrame=now;
 const dpr=Math.min(2,window.devicePixelRatio||1),w=flowCanvas.width/dpr,h=flowCanvas.height/dpr;
 flowCtx.setTransform(dpr,0,0,dpr,0,0);flowCtx.clearRect(0,0,w,h);flowCtx.lineWidth=1.15;flowCtx.lineCap='round';
 const t=now/1000;
 for(const p of flowSamples){
  const intensity=Math.min(1,Math.max(.1,(p.speed||.02)*1.8));
  const span=10+p.length,phase=(p.phase+t*(.08+intensity*.28))%1;
  const along=(phase-.5)*span,trail=p.length*(.4+.6*intensity);
  const x1=p.x+p.dx*along,y1=p.y+p.dy*along,x2=x1+p.dx*trail,y2=y1+p.dy*trail;
  flowCtx.strokeStyle=flowColor(p.speed);flowCtx.globalAlpha=.28+intensity*.38;
  flowCtx.beginPath();flowCtx.moveTo(x1,y1);flowCtx.lineTo(x2,y2);flowCtx.stroke();
 }
 flowCtx.globalAlpha=1;
 flowFrame=requestAnimationFrame(drawFlow);
}
function startFlowAnimation(){if(enabled&&!flowFrame)flowFrame=requestAnimationFrame(drawFlow)}
function findMap(){
 if(map)return true;
 const candidate=worldMap();
 if(!candidate||typeof candidate.getContainer!=='function')return false;
 map=candidate;map.on('load',()=>void ensureLayers());map.on('style.load',()=>{styleInstalled=false;sourceReady=false;layerReady=false;void ensureLayers()});
 if(map.isStyleLoaded?.())void ensureLayers();
 return true;
}
function parseStationText(text){
 const lines=String(text||'').split(/\r?\n/),header=lines.find(x=>x.startsWith('#')&&/YY.*MM.*DD/i.test(x));
 if(!header)return[];
 const rawNames=header.replace(/^#\s*/,'').trim().split(/\s+/),names=rawNames.map(x=>x.toUpperCase());
 const ix={};names.forEach((n,i)=>{if(ix[n]===undefined)ix[n]=i});
 const minuteIndex=rawNames.findIndex(x=>x==='mm');
 const result=[],cut=Date.now()-24*3600000;
 for(const line of lines){if(!line||line.startsWith('#'))continue;const c=line.trim().split(/\s+/);if(c.length<names.length)continue;
  let yy=Number(c[ix.YY]),month=Number(c[ix.MM]),day=Number(c[ix.DD]),hour=Number(c[ix.HH]),minute=Number(c[minuteIndex]);
  if(yy<100)yy+=yy>=70?1900:2000;
  const dt=new Date(Date.UTC(yy,month-1,day,hour,minute));if(!Number.isFinite(dt.getTime())||dt.getTime()<cut)continue;
  const number=key=>{const i=ix[key];if(i===undefined)return null;const n=Number(c[i]);return Number.isFinite(n)&&c[i]!=='MM'?n:null};
  result.push({time:dt.getTime(),tide:number('TIDE'),wave:number('WVHT')});
 }
 return result.sort((a,b)=>a.time-b.time);
}
async function fetchHistory(rec){
 if(rec.history)return rec.history;
 const id=encodeURIComponent(rec.id);
 try{
  const response=await timeoutFetch('https://www.ndbc.noaa.gov/data/realtime2/'+id+'.txt',9000);
  rec.history=parseStationText(await response.text());return rec.history;
 }catch(_){rec.history=[];return rec.history}
}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n}
function metric(grid,label,value){const m=el('div','bp-wb-metric');m.append(el('span','',label),el('b','',value));grid.appendChild(m)}
function stopViewer(){
 if(!viewer)return;cancelAnimationFrame(viewer.frame);try{viewer.resize?.disconnect()}catch(_){}try{viewer.renderer?.dispose()}catch(_){}viewer=null;
}
function buildViewer(canvas,rec){
 stopViewer();
 import('./vendor/three.module.js?v=169-local').then(THREE=>{
  if(!card||!card.contains(canvas))return;
  const scene=new THREE.Scene();scene.background=null;
  const camera=new THREE.PerspectiveCamera(35,canvas.clientWidth/Math.max(1,canvas.clientHeight),.1,100);camera.position.set(3.1,2.35,4.6);camera.lookAt(0,.45,0);
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
  scene.add(new THREE.HemisphereLight(0xd8f4ff,0x071e2b,1.55));
  const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(-3,6,4);scene.add(key);
  const color=COLORS[rec.severity]||COLORS.yellow;
  const paint=new THREE.MeshStandardMaterial({color:new THREE.Color(color),roughness:.42,metalness:.12});
  const dark=new THREE.MeshStandardMaterial({color:0x163744,roughness:.62,metalness:.35});
  const white=new THREE.MeshStandardMaterial({color:0xf1f9ee,roughness:.38});
  const buoy=new THREE.Group();scene.add(buoy);
  const hull=new THREE.Mesh(new THREE.CylinderGeometry(.36,.47,.48,20),paint);hull.position.y=.42;buoy.add(hull);
  const collar=new THREE.Mesh(new THREE.TorusGeometry(.4,.095,8,24),white);collar.rotation.x=Math.PI/2;collar.position.y=.24;buoy.add(collar);
  const deck=new THREE.Mesh(new THREE.CylinderGeometry(.31,.34,.08,20),dark);deck.position.y=.68;buoy.add(deck);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.035,.048,.86,10),white);mast.position.y=1.14;buoy.add(mast);
  const cross=new THREE.Mesh(new THREE.BoxGeometry(.6,.045,.055),dark);cross.position.y=1.31;buoy.add(cross);
  const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.11,.14,.13,12),new THREE.MeshStandardMaterial({color:0xfff3b0,emissive:new THREE.Color(color),emissiveIntensity:1.2}));lamp.position.y=1.54;buoy.add(lamp);
  for(let i=0;i<4;i++){const a=i*Math.PI/2,leg=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.45,6),white);leg.position.set(Math.cos(a)*.18,.97,Math.sin(a)*.18);leg.rotation.z=.24*Math.cos(a);leg.rotation.x=.24*Math.sin(a);buoy.add(leg)}
  const waterGeo=new THREE.PlaneGeometry(6,5,28,18);waterGeo.rotateX(-Math.PI/2);
  const waterMat=new THREE.MeshStandardMaterial({color:0x0c6080,roughness:.18,metalness:.28,transparent:true,opacity:.82});
  const water=new THREE.Mesh(waterGeo,waterMat);water.position.y=.04;scene.add(water);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.018,5,48),new THREE.MeshBasicMaterial({color:0x76dff5,transparent:true,opacity:.62}));ring.rotation.x=Math.PI/2;ring.position.y=.055;scene.add(ring);
  const amp=Number.isFinite(rec.wave)?Math.min(.2,.035+rec.wave*.035):.09;
  const resize=()=>{if(!canvas.clientWidth||!canvas.clientHeight)return;renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix()};
  const ro=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;if(ro)ro.observe(canvas.parentElement);
  let start=performance.now();
  const animate=now=>{if(!viewer||!card||!card.contains(canvas))return;const t=(now-start)/1000;buoy.position.y=.03+Math.sin(t*2.1)*amp;buoy.rotation.z=Math.sin(t*1.25)*.085;buoy.rotation.x=Math.cos(t*1.7)*.045;
   const pos=waterGeo.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,.025*Math.sin(x*1.9+t*1.55)*Math.cos(z*1.8-t*1.1)+.012*Math.sin(x*3.2+z*2+t*2.1))}pos.needsUpdate=true;waterGeo.computeVertexNormals();ring.scale.setScalar(1+Math.sin(t*1.1)*.12);renderer.render(scene,camera);viewer.frame=requestAnimationFrame(animate)};
  viewer={renderer,scene,camera,frame:0,resize:ro};resize();viewer.frame=requestAnimationFrame(animate);
 }).catch(()=>{});
}
function renderChart(svg,note,rec){
 const ns='http://www.w3.org/2000/svg',width=320,height=74,left=4,right=316,top=7,bottom=66;
 svg.replaceChildren();
 const hist=Array.isArray(rec.history)?rec.history:[],tides=hist.filter(x=>Number.isFinite(x.tide)),waves=hist.filter(x=>Number.isFinite(x.wave));
 const currentTide=Number.isFinite(rec.tideFt)?rec.tideFt:(tides.length?tides[tides.length-1].tide:null);
 let values,label,unit,normal,current,normalLabel;
 const useTide=Number.isFinite(currentTide);
 if(useTide){values=tides.map(x=>x.tide);label='Observed tide height';unit='ft';current=currentTide;normal=values.length>1?values.reduce((a,b)=>a+b,0)/values.length:0;normalLabel='24h station mean'}
 else {values=waves.map(x=>x.wave);label='Significant wave height';unit='m';current=Number.isFinite(rec.wave)?rec.wave:(values.length?values[values.length-1]:null);normal=values.length?values.reduce((a,b)=>a+b,0)/values.length:0;normalLabel='24h mean wave height'}
 if(!Number.isFinite(current)){note.textContent='No current tide or wave-height reading is reported by this station.';return}
 const padded=[...values,current,normal].filter(Number.isFinite),lo=Math.min(0,...padded),hi=Math.max(.2,...padded),range=Math.max(.2,hi-lo),y=v=>bottom-(v-lo)/range*(bottom-top);
 const mk=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));svg.appendChild(n);return n};
 mk('line',{x1:left,y1:y(normal),x2:right,y2:y(normal),stroke:'#59e8aa','stroke-dasharray':'4 3'});
 mk('line',{x1:left,y1:y(current),x2:right,y2:y(current),stroke:'#ff6c79'});
 if(values.length>1){const chartRows=hist.filter(x=>Number.isFinite(useTide?x.tide:x.wave));const points=chartRows.map((x,i)=>{const v=useTide?x.tide:x.wave;return (left+i*(right-left)/Math.max(1,chartRows.length-1))+','+y(v)}).join(' ');mk('polyline',{points})}
 mk('circle',{cx:right-3,cy:y(current),r:3.8});
 note.textContent=label+' · '+normalLabel+' '+normal.toFixed(2)+' '+unit+' · Latest '+current.toFixed(2)+' '+unit+(Number.isFinite(rec.tideFt)?' (NDBC tide datum)':' (wave height; tide not reported)');
}
function openBuoy(id){
 const rec=buoyData.get(id)||[...buoyData.values()].find(x=>x.station===id);if(!rec||!map)return;
 closeCard();addStyles();
 card=el('section','bp-water-buoy-card');card.setAttribute('role','dialog');card.setAttribute('aria-label','Buoy details '+rec.station);
 const head=el('div','bp-wb-head'),titleWrap=el('div');titleWrap.append(el('div','bp-wb-title','NDBC Buoy '+rec.station),el('div','bp-wb-sub',rec.lat.toFixed(3)+'°, '+rec.lon.toFixed(3)+'° · '+new Date(rec.time).toLocaleString()));
 const close=el('button','bp-wb-close','×');close.type='button';close.setAttribute('aria-label','Close buoy details');close.onclick=closeCard;head.append(titleWrap,close);card.appendChild(head);
 const view=el('div','bp-wb-view'),canvas=document.createElement('canvas');view.appendChild(canvas);card.appendChild(view);
 const grid=el('div','bp-wb-grid');
 metric(grid,'Sea state',rec.severity==='red'?'MAJOR':rec.severity==='yellow'?'MODERATE / LIMITED DATA':'CALM');
 metric(grid,'Significant waves',Number.isFinite(rec.wave)?rec.wave.toFixed(1)+' m':'No reading');
 metric(grid,'Wind / gust',Number.isFinite(rec.wind)?rec.wind.toFixed(1)+' / '+(Number.isFinite(rec.gust)?rec.gust.toFixed(1):'—')+' m/s':'No reading');
 metric(grid,'Sea temperature',Number.isFinite(rec.waterTemp)?rec.waterTemp.toFixed(1)+' °C':'No reading');
 metric(grid,'Tide / sea level',Number.isFinite(rec.tideFt)?rec.tideFt.toFixed(2)+' ft':'Not reported');
 metric(grid,'Report time',new Date(rec.time).toLocaleTimeString());
 card.appendChild(grid);
 const wrap=el('div','bp-wb-chart-wrap'),ct=el('div','bp-wb-chart-title','SEA LEVEL AND WAVE HEIGHT');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('bp-wb-chart');svg.setAttribute('viewBox','0 0 320 74');svg.setAttribute('preserveAspectRatio','none');
 const note=el('div','bp-wb-chart-note','Loading the station’s recent observations…');
 const key=el('div','bp-wb-key');key.innerHTML='<span><i></i>24h normal</span><span><i class="current"></i>latest reading</span>';
 wrap.append(ct,svg,note,key);card.appendChild(wrap);
 const foot=el('div','bp-wb-foot');foot.append(document.createTextNode('NDBC observations · '));const link=el('a','','station record');link.href='https://www.ndbc.noaa.gov/station_page.php?station='+encodeURIComponent(rec.id);link.target='_blank';link.rel='noopener noreferrer';foot.appendChild(link);card.appendChild(foot);
 map.getContainer().appendChild(card);renderChart(svg,note,rec);buildViewer(canvas,rec);
 fetchHistory(rec).then(()=>{if(!card||!card.contains(svg))return;renderChart(svg,note,rec)});
}
function closeCard(){stopViewer();if(card){card.remove();card=null}}
function markerElement(rec){
 const root=el('div','bp-buoy-marker');root.style.setProperty('--buoy-color',COLORS[rec.severity]||COLORS.yellow);root.title='NDBC buoy '+rec.station+' · '+rec.severity;
 const model=el('div','bp-buoy-model');model.append(el('div','bp-buoy-mast'),el('div','bp-buoy-cross'),el('div','bp-buoy-lamp'),el('div','bp-buoy-hull'),el('div','bp-buoy-ring'),el('div','bp-buoy-waterline'));root.appendChild(model);
 root.addEventListener('click',e=>{e.stopPropagation();openBuoy(rec.id)});
 root.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openBuoy(rec.id)}});
 root.tabIndex=0;root.setAttribute('role','button');root.setAttribute('aria-label','Open buoy '+rec.station+' details');
 return root;
}
function buildCloseMarkers(){
 if(!map||!enabled||!window.maplibregl?.Marker)return;
 const zoom=map.getZoom?.()||0;
 if(zoom<8){for(const m of markerById.values())try{m.remove()}catch(_){}markerById.clear();markerMap=map;return}
 let bounds;try{bounds=map.getBounds()}catch(_){return}
 const active=new Set();
 for(const rec of buoyData.values()){
  if(!bounds.contains([rec.lon,rec.lat]))continue;
  active.add(rec.id);let m=markerById.get(rec.id);
  if(!m){const node=markerElement(rec);m=new window.maplibregl.Marker({element:node,anchor:'bottom',offset:[0,0]}).setLngLat([rec.lon,rec.lat]).addTo(map);markerById.set(rec.id,m)}
  else {m.setLngLat([rec.lon,rec.lat]);m.getElement().style.setProperty('--buoy-color',COLORS[rec.severity]||COLORS.yellow)}
 }
 for(const [id,m]of markerById)if(!active.has(id)){try{m.remove()}catch(_){}markerById.delete(id)}
 markerMap=map;
}
function clearMarkers(){for(const m of markerById.values())try{m.remove()}catch(_){}markerById.clear()}
function activate(on){
 const next=!!on;
 if(next&&!findMap()){state.status='waiting-for-map';return}
 if(state.active===next){if(next&&!styleInstalled)void ensureLayers();return}
 state.active=next;state.status=next?'loading':'off';state.error=null;
 if(next){
  void ensureLayers();setVisible(true);void Promise.all([loadBuoys(),loadCurrentGrid()]);
  clearInterval(bouyTimer);bouyTimer=setInterval(()=>{if(enabled)void loadBuoys()},5*60*1000);
  clearInterval(currentTimer);currentTimer=setInterval(()=>{if(enabled)void loadCurrentGrid(true)},60*60*1000);
  scheduleFlowBuild(250);buildCloseMarkers();
 }else{
  clearInterval(bouyTimer);clearInterval(currentTimer);clearTimeout(rebuildTimer);flowBuildGeneration++;cancelAnimationFrame(flowBuildRaf);flowBuildRaf=0;
  setVisible(false);cancelAnimationFrame(flowFrame);flowFrame=0;flowSamples=[];state.flowStrokes=0;
  clearMarkers();closeCard();setStatus();
 }
}
let enabled=false;
function syncButton(){
 const b=$('[data-bp-water-flow-button="1"]');if(!b)return;
 if(button!==b){
  button=b;
  const observer=new MutationObserver(()=>{const on=button.classList.contains('active');enabled=on;activate(on)});
  observer.observe(button,{attributes:true,attributeFilter:['class','aria-pressed']});
  button.addEventListener('click',()=>setTimeout(()=>{enabled=button.classList.contains('active');activate(enabled)},300));
 }
 enabled=b.classList.contains('active');activate(enabled);
}
function boot(){
 addStyles();findMap();syncButton();
 if(!buttonObserver){buttonObserver=new MutationObserver(()=>{if(findMap())syncButton()});buttonObserver.observe(document.documentElement,{childList:true,subtree:true})}
 if(!window.__BP_WATER_FLOW_BUOYS_RETRY_V1__)window.__BP_WATER_FLOW_BUOYS_RETRY_V1__=setInterval(()=>{if(!map)findMap();syncButton();if(map&&enabled&&!styleInstalled)void ensureLayers()},500);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(flowFrame);flowFrame=0}else if(enabled){scheduleFlowBuild(80);startFlowAnimation()}});
}
const api={version:VERSION,get state(){return state},refresh:()=>Promise.all([loadBuoys(),loadCurrentGrid(true)]),close:closeCard};
window.__BP_WATER_FLOW_BUOYS_API_V1__=api;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
