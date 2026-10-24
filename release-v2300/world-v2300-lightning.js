// BridgePoint v6130 — dedicated long-duration cloud-to-ground lightning.
 // This is separate from the legacy precipitation/fire/hail/snow particle bundle.
 // Source-backed storm/lightning features place the visual anchor; a point does not
 // imply that BridgePoint has verified an exact ground-strike location.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>Number.isFinite(Number(v))?Number(v):NaN;
const str=v=>String(v??'').toLowerCase();
const isCoord=(lng,lat)=>Number.isFinite(lng)&&Number.isFinite(lat)&&Math.abs(lng)<=180&&Math.abs(lat)<=89.8;
function geomCenter(geometry){
  if(!geometry)return null;
  if(geometry.type==='Feature')geometry=geometry.geometry;
  if(geometry.type==='Point'&&Array.isArray(geometry.coordinates))return {lng:finite(geometry.coordinates[0]),lat:finite(geometry.coordinates[1])};
  const points=[];
  const walk=value=>{
    if(!Array.isArray(value))return;
    if(value.length>=2&&typeof value[0]==='number'&&typeof value[1]==='number'){points.push([value[0],value[1]]);return}
    for(const child of value)walk(child);
  };
  walk(geometry.coordinates);
  if(!points.length)return null;
  // A circular longitude mean prevents date-line warning polygons from landing at Greenwich.
  const lon=points.reduce((sum,p)=>sum+Math.cos(p[0]*Math.PI/180),0);
  const sin=points.reduce((sum,p)=>sum+Math.sin(p[0]*Math.PI/180),0);
  return {lng:Math.atan2(sin,lon)*180/Math.PI,lat:points.reduce((sum,p)=>sum+p[1],0)/points.length};
}
function itemCenter(item){
  const geometry=item?.geometry?.type==='Feature'?item.geometry.geometry:item?.geometry;
  const fromGeom=geomCenter(geometry);
  if(fromGeom&&isCoord(fromGeom.lng,fromGeom.lat))return fromGeom;
  const p=item?.properties||item||{};
  const lng=finite(item?.lng??item?.lon??item?.longitude??p.lng??p.lon??p.longitude);
  const lat=finite(item?.lat??item?.latitude??p.lat??p.latitude);
  return isCoord(lng,lat)?{lng,lat}:null;
}
function textOf(item){
  const p=item?.properties||item||{};
  return str([item?.type,item?.kind,item?.classification,item?.name,item?.event,item?.phenom,item?.phenomenon,item?.description,
    p.type,p.kind,p.classification,p.name,p.event,p.phenom,p.phenomenon,p.description,p.headline,p.event_name,p.product,p.hazard,p.weather,p.present_weather,p.weather_text,p.wx,p.rawdata]
    .filter(Boolean).join(' '));
}
function pickLightningAnchors(scene){
  const picked=[],seen=new Set();
  const add=(item,kind,weight=1)=>{
    const c=itemCenter(item);if(!c)return;
    const p=item?.properties||item||{};
    const key=String(p.id||p.event_id||p.eventId||p.storm_id||p.stormId||p.name||p.type||kind)+':'+c.lng.toFixed(2)+':'+c.lat.toFixed(2);
    if(seen.has(key))return;seen.add(key);
    picked.push({lng:c.lng,lat:c.lat,kind,weight,name:String(p.name||p.event||p.type||kind),source:String(p.source||p.source_name||'')});
  };
  for(const row of (Array.isArray(scene?.lightning)?scene.lightning:[]).slice(0,100))add(row,'lightning',1.25);
  for(const row of (Array.isArray(scene?.alerts)?scene.alerts:[]).slice(0,300)){
    const t=textOf(row);
    if(/prob.?severe|severe thunderstorm|thunderstorm|lightning|convective|tornado|hail|squall|\\bsv\\b/.test(t))add(row,/prob.?severe/.test(t)?'probsevere':'warning',1.15);
  }
  for(const row of (Array.isArray(scene?.storms)?scene.storms:[]).slice(0,80)){
    const t=textOf(row);
    if(/prob.?severe|thunder|convective|squall|tornado/.test(t))add(row,'storm',1);
  }
  for(const row of (Array.isArray(scene?.observations)?scene.observations:[]).slice(0,400)){
    const t=textOf(row);
    if(/thunderstorm|lightning|\\bts\\b|squall|convective/.test(t))add(row,'observation',.85);
  }
  return picked;
}
function randomizer(seed){
  let n=(Math.abs(Math.floor(seed*1000003))|0)||9137;
  return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return ((n>>>0)%100000)/100000};
}
function lightningPath(start,end,rng,steps=19){
  const dx=end.x-start.x,dy=end.y-start.y;
  const length=Math.hypot(dx,dy)||1;
  const nx=-dy/length,ny=dx/length;
  const amplitude=clamp(length*.075,5,18);
  let d='M '+start.x.toFixed(1)+' '+start.y.toFixed(1);
  for(let i=1;i<steps;i++){
    const t=i/steps,falloff=Math.sin(Math.PI*t)*(.55+.45*rng());
    const jitter=(rng()-.5)*2*amplitude*falloff;
    const x=start.x+dx*t+nx*jitter,y=start.y+dy*t+ny*jitter;
    d+=' L '+x.toFixed(1)+' '+y.toFixed(1);
  }
  return d+' L '+end.x.toFixed(1)+' '+end.y.toFixed(1);
}
function svgPath(svg,d,attrs={}){
  const el=document.createElementNS('http://www.w3.org/2000/svg','path');
  el.setAttribute('d',d);
  for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));
  svg.appendChild(el);return el;
}
export function initLightningLayer(map,getScene=()=>({})){
  if(!map||typeof map.project!=='function')return null;
  const container=map.getContainer?.();if(!container)return null;
  const overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
  overlay.setAttribute('aria-hidden','true');
  overlay.setAttribute('focusable','false');
  overlay.setAttribute('class','bp-v6130-cloud-ground-lightning');
  overlay.style.position='absolute';overlay.style.inset='0';overlay.style.width='100%';overlay.style.height='100%';
  overlay.style.pointerEvents='none';overlay.style.overflow='hidden';overlay.style.zIndex='18';overlay.style.mixBlendMode='screen';
  overlay.style.display='block';
  const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
  defs.innerHTML='<filter id="bp6130-bolt-glow" x="-150%" y="-80%" width="400%" height="260%"><feGaussianBlur stdDeviation="4.2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  overlay.appendChild(defs);
  const style=document.createElementNS('http://www.w3.org/2000/svg','style');
  style.textContent='@keyframes bp6130-long-flash{0%{opacity:0}3%{opacity:1}12%{opacity:.72}21%{opacity:1}35%{opacity:.58}44%{opacity:.95}58%{opacity:.45}73%{opacity:.86}100%{opacity:0}} .bp6130-long-bolt{animation:bp6130-long-flash 1.85s ease-out forwards}';
  overlay.appendChild(style);container.appendChild(overlay);
  let enabled=true,disposed=false,scene={},timeout=0,seq=0,activeFlashes=[];
  const state={version:6130,enabled:true,renderer:'svg-cloud-to-ground',durationMs:1850,anchors:0,activeBolts:0,lastFlashAt:null,updatedAt:Date.now()};
  function dimensions(){
    const rect=container.getBoundingClientRect();
    const w=Math.max(1,rect.width||container.clientWidth||1),h=Math.max(1,rect.height||container.clientHeight||1);
    overlay.setAttribute('viewBox','0 0 '+w+' '+h);overlay.setAttribute('width',String(w));overlay.setAttribute('height',String(h));
    return {w,h};
  }
  function projectedAnchors(){
    const {w,h}=dimensions(),z=finite(map.getZoom?.())||0;
    const center=map.getCenter?.();
    let source=[];
    try{source=pickLightningAnchors(scene)}catch(_){source=[]}
    const candidates=[];
    for(const a of source){
      try{
        const p=map.project([a.lng,a.lat]);
        if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<8||p.x>w-8||p.y<16||p.y>h+160)continue;
        const dist=center?Math.hypot((a.lng-center.lng)*Math.cos((a.lat+center.lat)*Math.PI/360),a.lat-center.lat):0;
        candidates.push({...a,x:p.x,y:p.y,dist,zoom:z});
      }catch(_){}
    }
    candidates.sort((a,b)=>b.weight-a.weight||a.dist-b.dist);
    // A phone gets one active bolt; desktop allows a second independent strike.
    const max=innerWidth<=760?1:2;
    const result=candidates.slice(0,max);
    state.anchors=source.length;state.visibleAnchors=candidates.length;state.updatedAt=Date.now();
    return result;
  }
  function clearBolts(){
    for(const f of activeFlashes){try{f.group.remove()}catch(_){}}
    activeFlashes=[];state.activeBolts=0;
  }
  function stableSeed(a){
    const n=Math.sin(a.lng*17.31+a.lat*71.7+seq*13.7)*43758.5453;
    return Math.abs(n%1)+.001;
  }
  function renderBoltGeometry(group,anchor,seed){
    const bounds=dimensions(),z=finite(map.getZoom?.())||0;
    const ground={x:clamp(anchor.x,0,bounds.w),y:clamp(anchor.y,0,bounds.h+80)};
    const rng=randomizer(seed);
    const height=clamp(86+Math.max(0,z)*13,86,270);
    const top={x:ground.x+(rng()-.5)*Math.min(56,bounds.w*.08),y:Math.max(-12,ground.y-height)};
    const mainD=lightningPath(top,ground,rng,21);
    svgPath(group,mainD,{'fill':'none','stroke':'#71cfff','stroke-width':8,'stroke-linecap':'round','stroke-linejoin':'round','opacity':'.28'});
    svgPath(group,mainD,{'fill':'none','stroke':'#c8f4ff','stroke-width':3.6,'stroke-linecap':'round','stroke-linejoin':'round','opacity':'.96'});
    svgPath(group,mainD,{'fill':'none','stroke':'#ffffff','stroke-width':1.35,'stroke-linecap':'round','stroke-linejoin':'round','opacity':'1'});
    const branchCount=2+(rng()>.55?1:0);
    for(let i=0;i<branchCount;i++){
      const t=.24+rng()*.53;
      const mid={x:top.x+(ground.x-top.x)*t,y:top.y+(ground.y-top.y)*t};
      const side=rng()>.5?1:-1,dx=(15+rng()*40)*side,dy=18+rng()*48;
      const end={x:clamp(mid.x+dx,0,bounds.w),y:clamp(mid.y+dy,0,bounds.h+50)};
      const d=lightningPath(mid,end,rng,5+i);
      svgPath(group,d,{'fill':'none','stroke':'#b7ecff','stroke-width':1.7,'stroke-linecap':'round','stroke-linejoin':'round','opacity':'.88'});
    }
  }
  function buildBolt(anchor){
    const id='bp6130-bolt-'+(++seq);
    const group=document.createElementNS('http://www.w3.org/2000/svg','g');
    group.setAttribute('class','bp6130-long-bolt');group.setAttribute('data-bp-bolt-id',id);
    group.setAttribute('filter','url(#bp6130-bolt-glow)');
    const seed=stableSeed(anchor);
    renderBoltGeometry(group,anchor,seed);
    overlay.appendChild(group);
    const started=performance.now();
    const flash={id,group,anchor,seed,started,expires:started+1850};
    activeFlashes.push(flash);state.activeBolts=activeFlashes.length;state.lastFlashAt=Date.now();
    setTimeout(()=>{if(disposed)return;activeFlashes=activeFlashes.filter(x=>x!==flash);try{group.remove()}catch(_){}state.activeBolts=activeFlashes.length},1950);
  }
  function schedule(){
    clearTimeout(timeout);if(!enabled||disposed||document.hidden)return;
    const anchors=projectedAnchors();
    if(!anchors.length){timeout=setTimeout(schedule,4200);return}
    const gap=4800+Math.random()*5700;
    timeout=setTimeout(()=>{
      if(!enabled||disposed||document.hidden){schedule();return}
      const current=projectedAnchors();
      if(current.length){const index=seq%Math.min(current.length,innerWidth<=760?1:2);buildBolt(current[index]);if(innerWidth>760&&current.length>1&&Math.random()>.48)setTimeout(()=>{if(enabled&&!disposed&&!document.hidden){const latest=projectedAnchors();if(latest.length>1)buildBolt(latest[(seq+1)%latest.length])}},480+Math.random()*500)}
      schedule();
    },gap);
  }
  function refreshActivePositions(){
    if(disposed||!activeFlashes.length)return;
    dimensions();
    for(const flash of activeFlashes){
      try{
        const p=map.project([flash.anchor.lng,flash.anchor.lat]);
        if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
        flash.anchor.x=p.x;flash.anchor.y=p.y;
        flash.group.querySelectorAll('path').forEach(path=>path.remove());
        renderBoltGeometry(flash.group,flash.anchor,flash.seed);
      }catch(_){}
    }
  }
  function onMove(){refreshActivePositions()}
  function onVisibility(){if(document.hidden){clearTimeout(timeout);clearBolts()}else if(enabled)schedule()}
  function setScene(next){scene=next||{};if(enabled){clearTimeout(timeout);schedule()}state.updatedAt=Date.now()}
  function setEnabled(v){
    enabled=!!v;state.enabled=enabled;overlay.style.display=enabled?'block':'none';
    clearTimeout(timeout);
    if(!enabled)clearBolts();else schedule();
    state.updatedAt=Date.now();
  }
  function destroy(){
    if(disposed)return;disposed=true;clearTimeout(timeout);clearBolts();
    try{map.off?.('move',onMove);map.off?.('moveend',onMove);map.off?.('zoom',onMove);map.off?.('resize',onMove)}catch(_){}
    document.removeEventListener('visibilitychange',onVisibility);
    try{overlay.remove()}catch(_){}
    if(window.__BP_LIGHTNING_RENDERER_V6130__?.map===map)delete window.__BP_LIGHTNING_RENDERER_V6130__;
  }
  for(const event of ['move','moveend','zoom','resize'])try{map.on?.(event,onMove)}catch(_){}
  document.addEventListener('visibilitychange',onVisibility);
  window.__BP_LIGHTNING_RENDERER_V6130__={version:6130,map,get state(){return {...state,enabled,activeBolts:activeFlashes.length,overlayConnected:overlay.isConnected}},setScene,setEnabled,destroy};
  setScene(typeof getScene==='function'?getScene():{});
  return {map,setScene,setEnabled,destroy,get state(){return {...state,enabled,activeBolts:activeFlashes.length,overlayConnected:overlay.isConnected}}};
}
