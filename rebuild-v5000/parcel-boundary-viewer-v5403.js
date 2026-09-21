(()=>{
'use strict';

const FN='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-parcel-boundary-tile-v5403';
const VERSION=5405;
const SOURCE='bp-boundary-viewer-v5403';
const GLOW='bp-boundary-glow-v5403';
const LINE='bp-boundary-line-v5403';
let viewer=null, refreshTimer=null, statusTimer=null, mode='public';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function token(){
  let t=sessionStorage.getItem('bp_owner_access_token')||'';
  if(t)return t;
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||'';
      if(k.startsWith('sb-')&&k.endsWith('-auth-token')){
        const d=JSON.parse(localStorage.getItem(k)||'{}');
        t=d?.access_token||d?.currentSession?.access_token||d?.session?.access_token||'';
        if(t)return t;
      }
    }
  }catch(_){}
  return '';
}
function ownerAllowed(){return window.__BP_ACCESS_STATE__?.platform_owner===true}
function world(){return window.__BP_V5000_WORLD__?.map||window.__BP_LANDING_WORLD__?.map||null}
function fmt(n){return Number(n||0).toLocaleString()}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function installStyle(){
  if(document.getElementById('bpBoundaryViewerStyle5403'))return;
  const s=document.createElement('style');
  s.id='bpBoundaryViewerStyle5403';
  s.textContent=`
#bpBoundaryViewer5403{position:fixed;inset:0;z-index:10050;background:#02070b;color:#fff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#bpBoundaryViewer5403[hidden]{display:none!important}
#bpBoundaryMap5403{position:absolute;inset:0}
.bp-boundary-top5403{position:absolute;z-index:5;left:14px;right:14px;top:max(14px,env(safe-area-inset-top));display:flex;gap:10px;align-items:flex-start;justify-content:space-between;pointer-events:none}
.bp-boundary-card5403{pointer-events:auto;max-width:min(680px,calc(100vw - 88px));padding:11px 13px;border-radius:14px;background:rgba(2,10,16,.88);border:1px solid rgba(51,232,255,.34);box-shadow:0 12px 45px rgba(0,0,0,.38);backdrop-filter:blur(15px)}
.bp-boundary-card5403 b{display:block;font-size:13px;letter-spacing:.02em}.bp-boundary-card5403 small{display:block;color:#a9c0cc;font-size:10px;line-height:1.35;margin-top:3px}
.bp-boundary-counts5403{display:flex;gap:10px;flex-wrap:wrap;margin-top:7px;font-size:10px}.bp-boundary-counts5403 span{border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:4px 7px;background:rgba(255,255,255,.04)}
.bp-boundary-close5403{pointer-events:auto;border:1px solid rgba(255,255,255,.18);background:rgba(2,10,16,.9);color:#fff;width:44px;height:44px;border-radius:13px;font-size:23px;cursor:pointer}
.bp-boundary-zoom5403{position:absolute;z-index:4;left:50%;bottom:max(22px,env(safe-area-inset-bottom));transform:translateX(-50%);padding:7px 10px;border-radius:999px;background:rgba(2,10,16,.86);border:1px solid rgba(51,232,255,.25);font-size:10px;color:#c7dce5;pointer-events:none;white-space:nowrap}
.bp-boundary-open5403{border:1px solid rgba(51,232,255,.45)!important;background:rgba(7,32,45,.88)!important;color:#fff!important;font-weight:900!important}
#bpLandingBoundaryOpen5403{position:absolute;z-index:12;right:12px;bottom:12px;border:1px solid rgba(51,232,255,.4);background:rgba(2,12,18,.88);color:#fff;border-radius:10px;padding:8px 10px;font:800 10px/1 system-ui;cursor:pointer;backdrop-filter:blur(12px)}
.bp-owner-boundary-card5403{border-color:rgba(51,232,255,.4)!important;background:linear-gradient(145deg,rgba(7,28,42,.94),rgba(6,16,26,.94))!important}
.bp-owner-boundary-card5403 .owner-actions{margin-top:10px}
@media(max-width:620px){.bp-boundary-card5403{max-width:calc(100vw - 76px)}.bp-boundary-counts5403{gap:5px}.bp-boundary-counts5403 span{font-size:9px}.bp-boundary-zoom5403{bottom:76px}}
`;
  document.head.appendChild(s);
}

function cleanStyle(base){
  const src=base?.getStyle?.();
  if(!src)return null;
  const st=typeof structuredClone==='function'?structuredClone(src):JSON.parse(JSON.stringify(src));
  const remove=/(weather|radar|storm|hazard|wildfire|fire-|fire_|precip|lightning|opportunity|signal|measure|selected|parcel|bp5507|bp5510|gta-city|gta-exact|gta-context|roof|building)/i;
  st.layers=(st.layers||[]).filter(l=>!remove.test(String(l.id||'')));
  const used=new Set(st.layers.map(l=>typeof l.source==='string'?l.source:null).filter(Boolean));
  const terrain=base.getTerrain?.();
  if(terrain?.source)used.add(terrain.source);
  for(const k of Object.keys(st.sources||{}))if(!used.has(k))delete st.sources[k];
  if(terrain?.source&&st.sources?.[terrain.source])st.terrain={...terrain};
  return st;
}

async function waitWorld(){
  for(let i=0;i<80;i++){
    const m=world();
    if(m?.loaded?.()||m?.isStyleLoaded?.())return m;
    await sleep(125);
  }
  return world();
}

function tileUrl(bucket){
  return FN+'?mode='+encodeURIComponent(mode)+'&z={z}&x={x}&y={y}&v='+encodeURIComponent(bucket);
}
function authHeaders(){
  const t=token();
  return mode==='owner'&&t?{Authorization:'Bearer '+t}:{};
}
function addBoundaryLayers(map,bucket){
  try{if(map.getLayer(LINE))map.removeLayer(LINE)}catch(_){}
  try{if(map.getLayer(GLOW))map.removeLayer(GLOW)}catch(_){}
  try{if(map.getSource(SOURCE))map.removeSource(SOURCE)}catch(_){}
  map.addSource(SOURCE,{type:'vector',tiles:[tileUrl(bucket)],minzoom:5.9,maxzoom:22});
  map.addLayer({
    id:GLOW,type:'line',source:SOURCE,'source-layer':'parcels',minzoom:5.9,
    paint:{
      'line-color':'#004cff',
      'line-opacity':['interpolate',['linear'],['zoom'],7,.72,9,.62,12,.52,16,.44,20,.36],
      'line-width':['interpolate',['linear'],['zoom'],7,2.6,9,3.2,12,4.1,16,5.6,20,7.2],
      'line-blur':['interpolate',['linear'],['zoom'],7,1.5,14,2.2,20,3.0]
    }
  });
  map.addLayer({
    id:LINE,type:'line',source:SOURCE,'source-layer':'parcels',minzoom:5.9,
    paint:{
      'line-color':'#73ffff',
      'line-opacity':1,
      'line-width':['interpolate',['linear'],['zoom'],7,.8,9,.95,12,1.2,16,1.65,20,2.25]
    }
  });
}
async function refreshStatus(){
  const box=document.getElementById('bpBoundaryCounts5403');
  if(!box)return;
  try{
    const r=await fetch(FN+'?mode='+encodeURIComponent(mode)+'&status=1',{headers:authHeaders(),cache:'no-store'});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'status failed');
    const s=d.status||{};
    box.innerHTML=mode==='owner'
      ? '<span>Parcel counter '+fmt(s.parcel_counter_total)+'</span><span>Market canonical '+fmt(s.market_canonical_total)+'</span><span>Approved boundary sources '+fmt(s.active_boundary_candidates)+'</span>'
      : '<span>Parcel counter '+fmt(s.parcel_counter_total)+'</span><span>Public-display sources '+fmt(s.public_display_candidates)+'</span>';
  }catch(e){
    box.innerHTML='<span>'+esc(e.message||e)+'</span>';
  }
}

async function openViewer(nextMode='public'){
  installStyle();
  mode=nextMode==='owner'&&ownerAllowed()?'owner':'public';
  let shell=document.getElementById('bpBoundaryViewer5403');
  if(!shell){
    shell=document.createElement('section');
    shell.id='bpBoundaryViewer5403';
    shell.hidden=true;
    shell.innerHTML=`
      <div id="bpBoundaryMap5403"></div>
      <div class="bp-boundary-top5403">
        <div class="bp-boundary-card5403">
          <b id="bpBoundaryTitle5403">BridgePoint Parcel Boundary Viewer</b>
          <small id="bpBoundaryCopy5403"></small>
          <div id="bpBoundaryCounts5403" class="bp-boundary-counts5403"><span>Loading live boundary status…</span></div>
        </div>
        <button id="bpBoundaryClose5403" class="bp-boundary-close5403" type="button" aria-label="Close">×</button>
      </div>
      <div id="bpBoundaryZoom5403" class="bp-boundary-zoom5403">Parcel lines stream from regional zoom</div>`;
    document.body.appendChild(shell);
    document.getElementById('bpBoundaryClose5403').onclick=closeViewer;
  }
  shell.hidden=false;
  document.body.style.overflow='hidden';
  document.getElementById('bpBoundaryTitle5403').textContent=mode==='owner'?'Owner Exact Parcel Boundary Viewer':'Public Parcel Boundary Viewer';
  document.getElementById('bpBoundaryCopy5403').textContent=mode==='owner'
    ? 'Owner-only exact approved boundary provenance. No weather or opportunity overlays. Tiles refresh as new boundaries materialize.'
    : 'Read-only rights-cleared parcel display. Source IDs and parcel IDs are not exposed; bulk download is disabled.';

  const base=await waitWorld();
  if(!base||!window.maplibregl){
    document.getElementById('bpBoundaryCounts5403').innerHTML='<span>Map engine is still initializing. Close and reopen in a moment.</span>';
    return;
  }
  const center=base.getCenter?.()||{lng:-98.5,lat:39.5};
  const style=cleanStyle(base);
  if(viewer){try{viewer.remove()}catch(_){} viewer=null}
  const t=token();
  viewer=new maplibregl.Map({
    container:'bpBoundaryMap5403',
    style,
    center:[center.lng,center.lat],
    zoom:Math.max(7.65,Math.min(base.getZoom?.()||7.65,16)),
    pitch:Math.max(45,Math.min(base.getPitch?.()||55,78)),
    bearing:base.getBearing?.()||0,
    maxPitch:85,
    antialias:true,
    transformRequest:(url)=>{
      if(mode==='owner'&&url.includes('bridgepoint-parcel-boundary-tile-v5403')&&t){
        return {url,headers:{Authorization:'Bearer '+t}};
      }
      return {url};
    }
  });
  viewer.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
  viewer.on('load',()=>{
    addBoundaryLayers(viewer,Math.floor(Date.now()/20000));
    const z=document.getElementById('bpBoundaryZoom5403');
    const update=()=>{if(z)z.textContent=viewer.getZoom()<5.9?'Zoom in slightly to stream parcel lines':'Live bright parcel boundaries · refreshing as materialization advances'};
    update();viewer.on('zoom',update);
  });
  clearInterval(refreshTimer);
  refreshTimer=setInterval(()=>{
    if(!viewer||document.getElementById('bpBoundaryViewer5403')?.hidden)return;
    const src=viewer.getSource(SOURCE);
    if(src?.setTiles)src.setTiles([tileUrl(Math.floor(Date.now()/20000))]);
    viewer.triggerRepaint?.();
  },20000);
  clearInterval(statusTimer);statusTimer=setInterval(refreshStatus,20000);
  refreshStatus();
}
function closeViewer(){
  const shell=document.getElementById('bpBoundaryViewer5403');
  if(shell)shell.hidden=true;
  document.body.style.overflow='';
  clearInterval(refreshTimer);clearInterval(statusTimer);
  if(viewer){try{viewer.remove()}catch(_){}viewer=null}
}

function wirePublicApp(){
  const tools=document.querySelector('.map-tools');
  if(tools&&!document.getElementById('bpAppBoundaryOpen5403')){
    const b=document.createElement('button');
    b.id='bpAppBoundaryOpen5403';b.type='button';b.className='bp-boundary-open5403';b.textContent='BOUNDARY VIEW';
    b.title='Open the rights-cleared parcel boundary viewer';
    b.onclick=()=>openViewer('public');
    tools.appendChild(b);
  }
  const preview=document.getElementById('previewMap');
  if(preview&&!document.getElementById('bpLandingBoundaryOpen5403')){
    const cs=getComputedStyle(preview);
    if(cs.position==='static')preview.style.position='relative';
    const b=document.createElement('button');
    b.id='bpLandingBoundaryOpen5403';b.type='button';b.textContent='PARCEL BOUNDARIES';
    b.onclick=()=>openViewer('public');
    preview.appendChild(b);
  }
}
function wireOwner(){
  if(!ownerAllowed())return;
  const grid=document.querySelector('[data-surface="owner-everything"] .owner-grid');
  if(!grid||document.getElementById('bpOwnerBoundaryCard5403'))return;
  const card=document.createElement('section');
  card.id='bpOwnerBoundaryCard5403';
  card.className='owner-card wide bp-owner-boundary-card5403';
  card.innerHTML='<span class="eyebrow">OWNER-ONLY SPATIAL TRUTH</span><h2>Live exact parcel boundary viewer</h2><p class="owner-sub">A separate clean 3D land viewer fed directly by approved parcel-boundary provenance. Thin glowing parcel lines refresh as new geometry materializes. Weather, opportunities, source IDs and unrelated overlays stay out of this view.</p><div class="owner-actions"><button id="bpOwnerBoundaryOpen5403" class="owner-btn primary" type="button">OPEN LIVE BOUNDARY VIEWER</button></div><div class="owner-sub">Owner mode can see all active approved boundary sources. Public/app mode is intentionally restricted to sources whose BridgePoint rights metadata explicitly allows redistribution or public display.</div>';
  grid.insertBefore(card,grid.firstChild);
  document.getElementById('bpOwnerBoundaryOpen5403').onclick=()=>openViewer('owner');
}

function boot(){
  installStyle();
  wirePublicApp();
  wireOwner();
  let n=0;
  const t=setInterval(()=>{
    n++;wirePublicApp();wireOwner();
    if(n>120)clearInterval(t);
  },500);
}
window.__BP_PARCEL_BOUNDARY_VIEWER_V5403__={version:VERSION,open:openViewer,close:closeViewer,getMap:()=>viewer,get mode(){return mode}};window.__BP_PARCEL_BOUNDARY_VIEWER_V5404__=window.__BP_PARCEL_BOUNDARY_VIEWER_V5403__;window.__BP_PARCEL_BOUNDARY_VIEWER_V5405__=window.__BP_PARCEL_BOUNDARY_VIEWER_V5403__;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();