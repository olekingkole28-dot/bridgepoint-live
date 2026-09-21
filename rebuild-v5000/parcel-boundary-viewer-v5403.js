(()=>{
'use strict';

const FN='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-parcel-boundary-tile-v5403';
const VERSION=5585;
const SOURCE='bp-boundary-viewer-v5403';
const GLOW='bp-boundary-glow-v5403';
const LINE='bp-boundary-line-v5403';
const STATE_SOURCE='bp-boundary-state-status-v5576';
const STATE_FILL='bp-boundary-state-fill-v5576';
const STATE_LINE='bp-boundary-state-line-v5576';
const STATE_LABEL='bp-boundary-state-label-v5576';
let viewer=null, refreshTimer=null, statusTimer=null, mode='public';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function token(){
  let t=sessionStorage.getItem('bp_owner_access_token')||'';
  if(t)return t;
  try{
    const app=JSON.parse(localStorage.getItem('bp_auth_v5045')||'null');
    t=app?.access_token||app?.currentSession?.access_token||app?.session?.access_token||'';
    if(t)return t;
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


const OFM_BOUNDARY='https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf';
const STATE_TOPOLOGY='/assets/us-state-boundaries-census.topo.json?v=5577';
let stateGeometryPromise=null,lastStateRows=[],stateFeatureCount=0;

function boundaryStyle(){
  return{
    version:8,
    glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources:{
      ofm:{type:'vector',tiles:[OFM_BOUNDARY],minzoom:0,maxzoom:14,attribution:'OpenFreeMap © OpenMapTiles · © OpenStreetMap contributors'}
    },
    layers:[
      {id:'bp-boundary-bg-v5576',type:'background',paint:{'background-color':'#061017'}},
      {id:'bp-boundary-water-v5576',type:'fill',source:'ofm','source-layer':'water',paint:{'fill-color':'#0b3044','fill-opacity':.96}},
      {id:'bp-boundary-road-v5576',type:'line',source:'ofm','source-layer':'transportation',minzoom:5.5,filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary']]],paint:{'line-color':'#53717c','line-width':['interpolate',['linear'],['zoom'],5.5,.25,10,1.1,16,3.2],'line-opacity':.34}},
      {id:'bp-boundary-country-v5576',type:'line',source:'ofm','source-layer':'boundary',minzoom:1,filter:['==',['get','admin_level'],2],paint:{'line-color':'#dffaff','line-width':['interpolate',['linear'],['zoom'],1,.55,4,1.05,10,1.8],'line-opacity':.88}},
      {id:'bp-boundary-state-base-v5576',type:'line',source:'ofm','source-layer':'boundary',minzoom:1,filter:['==',['get','admin_level'],4],paint:{'line-color':'#8fb6c1','line-width':['interpolate',['linear'],['zoom'],1,.22,4,.65,10,1.35],'line-opacity':.7}}
    ]
  };
}
function installStateStyle(){
  if(document.getElementById('bpBoundaryStateStyle5576'))return;
  const s=document.createElement('style');
  s.id='bpBoundaryStateStyle5576';
  s.textContent='.bp-boundary-legend5576{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px;font-size:9px;font-weight:800;letter-spacing:.04em}.bp-boundary-legend5576 span{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(255,255,255,.13);border-radius:999px;padding:4px 7px;background:rgba(255,255,255,.035)}.bp-boundary-legend5576 i{width:8px;height:8px;border-radius:50%;box-shadow:0 0 9px currentColor}.bp-boundary-legend5576 .public{color:#27ed89}.bp-boundary-legend5576 .private{color:#ff5d72}.bp-boundary-state-popup .maplibregl-popup-content{background:rgba(3,12,18,.96);color:#edfaff;border:1px solid rgba(96,226,244,.35);border-radius:13px;padding:12px 13px;box-shadow:0 15px 40px rgba(0,0,0,.42);font:600 11px/1.42 Inter,system-ui,sans-serif}.bp-boundary-state-popup .maplibregl-popup-tip{border-top-color:rgba(3,12,18,.96)!important;border-bottom-color:rgba(3,12,18,.96)!important}.bp-boundary-state-popup b{display:block;font-size:13px;margin-bottom:5px}.bp-boundary-state-popup em{display:inline-block;font-style:normal;font-size:9px;font-weight:900;letter-spacing:.08em;margin-bottom:7px}.bp-boundary-state-popup small{display:block;color:#9fb7c1;margin-top:7px}.bp-boundary-state-popup .ok{color:#27ed89}.bp-boundary-state-popup .hold{color:#ff7183}';
  document.head.appendChild(s);
}
function stateReason(row){
  if(row?.public_enabled===true)return 'Public parcel display is enabled by BridgePoint current source-rights metadata for at least one approved boundary source.';
  if(Number(row?.active_approved||0)>0)return 'BridgePoint has approved boundary source data internally, but the current source metadata does not explicitly permit public boundary display or raw redistribution.';
  return 'No boundary source currently passes BridgePoint active approval and public-display gate for this jurisdiction.';
}
function topologyToStateGeoJSON(topo){
  if(!topo||topo.type!=='Topology')throw new Error('STATE_TOPOLOGY_INVALID');
  const obj=topo.objects?.state||topo.objects?.states;
  if(!obj||!Array.isArray(obj.geometries))throw new Error('STATE_TOPOLOGY_OBJECT_MISSING');
  const tr=topo.transform||null,raw=Array.isArray(topo.arcs)?topo.arcs:[],cache=new Array(raw.length);
  const decodeArc=i=>{
    const rev=i<0,idx=rev?~i:i;
    let pts=cache[idx];
    if(!pts){
      let x=0,y=0;
      pts=(raw[idx]||[]).map(p=>{
        x+=Number(p?.[0]||0);y+=Number(p?.[1]||0);
        return tr?[x*tr.scale[0]+tr.translate[0],y*tr.scale[1]+tr.translate[1]]:[x,y];
      });
      cache[idx]=pts;
    }
    return rev?pts.slice().reverse():pts;
  };
  const stitch=ids=>{
    const out=[];
    (ids||[]).forEach((id,n)=>{
      const a=decodeArc(Number(id));
      out.push(...(n&&a.length?a.slice(1):a));
    });
    return out;
  };
  const geometry=g=>{
    if(g.type==='Polygon')return{type:'Polygon',coordinates:(g.arcs||[]).map(stitch)};
    if(g.type==='MultiPolygon')return{type:'MultiPolygon',coordinates:(g.arcs||[]).map(poly=>(poly||[]).map(stitch))};
    return null;
  };
  return{type:'FeatureCollection',features:obj.geometries.map(g=>({
    type:'Feature',id:g.id,
    properties:{...(g.properties||{}),state_code:String(g.properties?.STUSPS10||'').toUpperCase()},
    geometry:geometry(g)
  })).filter(f=>f.geometry)};
}
async function stateGeometry(){
  if(stateGeometryPromise)return stateGeometryPromise;
  stateGeometryPromise=fetch(STATE_TOPOLOGY,{cache:'force-cache'}).then(async r=>{
    if(!r.ok)throw new Error('STATE_GEOMETRY_HTTP_'+r.status);
    return topologyToStateGeoJSON(await r.json());
  }).then(d=>{
    if(d?.type!=='FeatureCollection'||!Array.isArray(d.features)||d.features.length<50)throw new Error('STATE_GEOMETRY_INVALID');
    return d;
  }).catch(e=>{stateGeometryPromise=null;throw e});
  return stateGeometryPromise;
}
function stateData(geo,rows){
  const by=new Map((rows||[]).map(r=>[String(r.state_code||'').toUpperCase(),r]));
  const d=JSON.parse(JSON.stringify(geo));
  stateFeatureCount=Array.isArray(d.features)?d.features.length:0;
  for(const f of d.features||[]){
    const p=f.properties||(f.properties={});
    const code=String(p.STUSAB||p.STUSPS||p.STUSPS10||f.id||p.state_code||p.STATE||'').toUpperCase();
    const row=by.get(code)||{state_code:code,active_approved:0,public_approved:0,public_enabled:false,reason_code:'NO_ACTIVE_APPROVED_BOUNDARY_SOURCE'};
    p.state_code=code;
    p.status_key=row.public_enabled===true?'public':'hold';
    p.status_short=row.public_enabled===true?'PUBLIC':(mode==='owner'?'OWNER ONLY':'NOT PUBLIC');
    p.reason=stateReason(row);
    p.active_approved=Number(row.active_approved||0);
    p.public_approved=Number(row.public_approved||0);
  }
  return d;
}
function bindStatePopup(map){
  if(map.__bpStatePopup5576)return;
  map.__bpStatePopup5576=true;
  map.on('mouseenter',STATE_FILL,()=>{try{map.getCanvas().style.cursor='pointer'}catch(_){}});
  map.on('mouseleave',STATE_FILL,()=>{try{map.getCanvas().style.cursor=''}catch(_){}});
  map.on('click',STATE_FILL,e=>{
    const f=e?.features?.[0];if(!f)return;
    const p=f.properties||{},ok=String(p.status_key)==='public',name=p.BASENAME||p.NAME||p.NAME10||p.name||p.state_code||'Jurisdiction';
    const html='<b>'+esc(name)+' · '+esc(p.state_code||'')+'</b><em class="'+(ok?'ok':'hold')+'">'+(ok?'PUBLIC DISPLAY ENABLED':'NOT PUBLIC-ENABLED')+'</em><div>'+esc(p.reason||'')+'</div><small>This reflects BridgePoint source-rights metadata and publishing policy; it is not a statement that state law itself prohibits publication.</small>';
    new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'330px',className:'bp-boundary-state-popup'}).setLngLat(e.lngLat).setHTML(html).addTo(map);
  });
}
async function syncStateOverlay(map,rows){
  if(!map)return;
  const geo=await stateGeometry(),data=stateData(geo,rows);
  const src=map.getSource(STATE_SOURCE);
  if(src?.setData)src.setData(data);
  else map.addSource(STATE_SOURCE,{type:'geojson',data,attribution:'U.S. Census Bureau state geometry · locally vendored Census-derived topology'});
  if(!map.getLayer(STATE_FILL)){
    const before=map.getLayer(GLOW)?GLOW:undefined;
    map.addLayer({id:STATE_FILL,type:'fill',source:STATE_SOURCE,minzoom:1.8,paint:{
      'fill-color':['case',['==',['get','status_key'],'public'],'#18df7a','#ff4d67'],
      'fill-opacity':['interpolate',['linear'],['zoom'],1.8,.28,3.4,.25,5.5,.13,7,.055,9,.015]
    }},before);
  }
  if(!map.getLayer(STATE_LINE))map.addLayer({id:STATE_LINE,type:'line',source:STATE_SOURCE,minzoom:1.8,paint:{
    'line-color':['case',['==',['get','status_key'],'public'],'#57ffa4','#ff7182'],
    'line-width':['interpolate',['linear'],['zoom'],2,.8,4,1.3,7,1.8],
    'line-opacity':['interpolate',['linear'],['zoom'],2,.9,7,.62]
  }});
  if(!map.getLayer(STATE_LABEL))map.addLayer({id:STATE_LABEL,type:'symbol',source:STATE_SOURCE,minzoom:2.15,maxzoom:6.8,layout:{
    'text-field':['concat',['get','state_code'],'\\n',['get','status_short']],
    'text-size':['interpolate',['linear'],['zoom'],2.15,8,4,10.5,6,12],
    'text-font':['Noto Sans Regular'],
    'text-anchor':'center',
    'text-allow-overlap':false,
    'text-padding':2
  },paint:{
    'text-color':['case',['==',['get','status_key'],'public'],'#b8ffd3','#ffd0d7'],
    'text-halo-color':'rgba(2,9,13,.96)',
    'text-halo-width':1.25
  }});
  bindStatePopup(map);
}

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
  const min=mode==='owner'?4:7;
  try{if(map.getLayer(LINE))map.removeLayer(LINE)}catch(_){}
  try{if(map.getLayer(GLOW))map.removeLayer(GLOW)}catch(_){}
  try{if(map.getSource(SOURCE))map.removeSource(SOURCE)}catch(_){}
  map.addSource(SOURCE,{type:'vector',tiles:[tileUrl(bucket)],minzoom:min,maxzoom:22,attribution:'BridgePoint approved parcel-boundary provenance'});
  map.addLayer({
    id:GLOW,type:'line',source:SOURCE,'source-layer':'parcels',minzoom:min,
    paint:{
      'line-color':'#004cff',
      'line-opacity':['interpolate',['linear'],['zoom'],4,.82,7,.76,9,.64,12,.54,16,.45,20,.36],
      'line-width':['interpolate',['linear'],['zoom'],4,1.25,6,1.7,7,2.25,9,3.2,12,4.1,16,5.6,20,7.2],
      'line-blur':['interpolate',['linear'],['zoom'],4,.65,7,1.15,14,2.2,20,3.0]
    }
  });
  map.addLayer({
    id:LINE,type:'line',source:SOURCE,'source-layer':'parcels',minzoom:min,
    paint:{
      'line-color':'#73ffff',
      'line-opacity':['interpolate',['linear'],['zoom'],4,.92,7,1,20,1],
      'line-width':['interpolate',['linear'],['zoom'],4,.34,6,.5,7,.7,9,.95,12,1.2,16,1.65,20,2.25]
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
    lastStateRows=Array.isArray(s.states)?s.states:[];
    let stateError='';
    if(viewer){
      try{await syncStateOverlay(viewer,lastStateRows)}catch(e){stateError=String(e?.message||e)}
    }
    const publicCount=lastStateRows.filter(x=>x.public_enabled===true).length;
    const denominator=stateFeatureCount?(' / '+fmt(stateFeatureCount)):'';
    box.innerHTML=mode==='owner'
      ? '<span>Parcel counter '+fmt(s.parcel_counter_total)+'</span><span>Market canonical '+fmt(s.market_canonical_total)+'</span><span>Approved boundary sources '+fmt(s.active_boundary_candidates)+'</span><span>Public-enabled jurisdictions '+fmt(publicCount)+denominator+'</span>'
      : '<span>Parcel counter '+fmt(s.parcel_counter_total)+'</span><span>Public-display sources '+fmt(s.public_display_candidates)+'</span><span>Public-enabled jurisdictions '+fmt(publicCount)+denominator+'</span>';
    if(stateError)box.innerHTML+='<span>State overlay retrying · '+esc(stateError)+'</span>';
  }catch(e){
    box.innerHTML='<span>'+esc(e.message||e)+'</span>';
  }
}

async function openViewer(nextMode='public'){
  installStyle();installStateStyle();
  mode=nextMode==='owner'&&ownerAllowed()?'owner':'public';
  let shell=document.getElementById('bpBoundaryViewer5403');
  if(!shell){
    shell=document.createElement('section');
    shell.id='bpBoundaryViewer5403';
    shell.hidden=true;
    shell.innerHTML=
      '<div id="bpBoundaryMap5403"></div>'+
      '<div class="bp-boundary-top5403">'+
        '<div class="bp-boundary-card5403">'+
          '<b id="bpBoundaryTitle5403">BridgePoint Parcel Boundary Viewer</b>'+
          '<small id="bpBoundaryCopy5403"></small>'+
          '<div class="bp-boundary-legend5576"><span class="public"><i></i>GREEN · PUBLIC ENABLED</span><span class="private"><i></i>RED · NOT PUBLIC-ENABLED</span></div>'+
          '<div id="bpBoundaryCounts5403" class="bp-boundary-counts5403"><span>Loading live boundary status…</span></div>'+
        '</div>'+
        '<button id="bpBoundaryClose5403" class="bp-boundary-close5403" type="button" aria-label="Close">×</button>'+
      '</div>'+
      '<div id="bpBoundaryZoom5403" class="bp-boundary-zoom5403">Loading parcel-boundary map…</div>';
    document.body.appendChild(shell);
    document.getElementById('bpBoundaryClose5403').onclick=closeViewer;
  }
  shell.hidden=false;
  document.body.style.overflow='hidden';
  document.getElementById('bpBoundaryTitle5403').textContent=mode==='owner'?'Owner Exact Parcel Boundary Viewer':'Public Parcel Boundary Viewer';
  document.getElementById('bpBoundaryCopy5403').textContent=mode==='owner'
    ? 'Green = BridgePoint public-display gate enabled. Red = keep parcel geometry owner-only. Owner parcel lines render from high regional zoom for promotion-safe review; tap a state for the current reason.'
    : 'Starts at a U.S. overview. Green states have public boundary display enabled by BridgePoint source-rights metadata; red states are withheld from the public parcel layer. Tap a state for the reason.';

  if(!window.maplibregl){
    document.getElementById('bpBoundaryCounts5403').innerHTML='<span>Map engine failed to load. Refresh the app and retry.</span>';
    return;
  }
  if(viewer){try{viewer.remove()}catch(_){} viewer=null}
  const t=token(),mobile=window.innerWidth<=620;
  const start=mode==='owner'
    ? {center:[-98.5,39.5],zoom:mobile?3.95:4.18,pitch:0,bearing:0}
    : {center:[-98.5,39.2],zoom:mobile?2.35:3.05,pitch:0,bearing:0};
  viewer=new maplibregl.Map({
    container:'bpBoundaryMap5403',
    style:boundaryStyle(),
    center:start.center,
    zoom:start.zoom,
    pitch:start.pitch,
    bearing:start.bearing,
    minZoom:1.8,
    maxZoom:22,
    maxPitch:85,
    projection:{type:'mercator'},
    antialias:false,
    fadeDuration:0,
    renderWorldCopies:false,
    maxTileCacheSize:mobile?56:120,
    cancelPendingTileRequestsWhileZooming:true,
    attributionControl:false,
    transformRequest:(url)=>{
      if(mode==='owner'&&url.includes('bridgepoint-parcel-boundary-tile-v5403')&&t){
        return {url,headers:{Authorization:'Bearer '+t}};
      }
      return {url};
    }
  });
  window.__BP_BOUNDARY_VIEWER_MAP_V5585__=viewer;
  window.__BP_BOUNDARY_VIEWER_BOOT_V5585__={version:5585,mode,phase:'map-created',ownerTokenFromAppStore:!!t,start,updatedAt:Date.now()};
  viewer.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
  viewer.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
  viewer.on('error',e=>{
    const msg=String(e?.error?.message||e?.error||'');
    if(/401|403|OWNER_REQUIRED/i.test(msg)){
      const box=document.getElementById('bpBoundaryCounts5403');
      if(box)box.innerHTML='<span>Owner authorization needs a fresh sign-in before exact boundary tiles can load.</span>';
    }
  });
  let viewerFinalized=false,viewerFinalizeTimer=0;
  const finalizeViewer=async(reason='load')=>{
    if(viewerFinalized||!viewer)return false;
    try{
      const styleReady=viewer.isStyleLoaded?.()===true||((viewer.getStyle?.()?.layers?.length||0)>0);
      if(!styleReady){clearTimeout(viewerFinalizeTimer);viewerFinalizeTimer=setTimeout(()=>void finalizeViewer('style-retry'),250);return false}
      viewerFinalized=true;
      addBoundaryLayers(viewer,Math.floor(Date.now()/20000));
      const z=document.getElementById('bpBoundaryZoom5403');
      const update=()=>{
        if(!z||!viewer)return;
        const min=mode==='owner'?4:7;
        z.textContent=viewer.getZoom()<min
          ? (mode==='owner'?'Zoom in slightly to stream owner parcel lines':'State availability overview · public parcel lines begin at regional zoom')
          : (mode==='owner'?'Owner exact parcel boundaries · thousands of lines remain visible from high zoom':'Public rights-cleared parcel boundaries · neon blue');
      };
      update();viewer.on('zoom',update);
      if(lastStateRows.length){try{await syncStateOverlay(viewer,lastStateRows)}catch(e){console.warn('boundary state overlay retry',e)}}
      else void refreshStatus();
      window.__BP_BOUNDARY_VIEWER_BOOT_V5577__={version:5585,mode,independentMap:true,ownerTokenFromAppStore:!!t,start,updatedAt:Date.now()};
      window.__BP_BOUNDARY_VIEWER_BOOT_V5585__={version:5585,mode,phase:'ready',reason,independentMap:true,ownerTokenFromAppStore:!!t,start,updatedAt:Date.now()};
      return true
    }catch(e){
      viewerFinalized=false;
      window.__BP_BOUNDARY_VIEWER_BOOT_V5585__={version:5585,mode,phase:'retry',reason,error:String(e?.message||e),updatedAt:Date.now()};
      clearTimeout(viewerFinalizeTimer);viewerFinalizeTimer=setTimeout(()=>void finalizeViewer('recovery'),350);
      return false
    }
  };
  viewer.on('load',()=>void finalizeViewer('load'));
  viewer.on('styledata',()=>{if(!viewerFinalized)void finalizeViewer('styledata')});
  void refreshStatus();
  setTimeout(()=>void finalizeViewer('boot-fallback'),120);
  setTimeout(()=>void finalizeViewer('boot-fallback-late'),900);
  clearInterval(refreshTimer);
  refreshTimer=setInterval(()=>{
    if(!viewer||document.getElementById('bpBoundaryViewer5403')?.hidden)return;
    const src=viewer.getSource(SOURCE);
    if(src?.setTiles)src.setTiles([tileUrl(Math.floor(Date.now()/20000))]);
    viewer.triggerRepaint?.();
  },20000);
  clearInterval(statusTimer);statusTimer=setInterval(refreshStatus,30000);
}

function closeViewer(){
  const shell=document.getElementById('bpBoundaryViewer5403');
  if(shell)shell.hidden=true;
  document.body.style.overflow='';
  clearInterval(refreshTimer);clearInterval(statusTimer);
  if(viewer){try{viewer.remove()}catch(_){}if(window.__BP_BOUNDARY_VIEWER_MAP_V5585__===viewer)window.__BP_BOUNDARY_VIEWER_MAP_V5585__=null;viewer=null}
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
  card.innerHTML='<span class="eyebrow">OWNER-ONLY SPATIAL TRUTH</span><h2>Live exact parcel boundary viewer</h2><p class="owner-sub">A separate clean 3D land viewer fed directly by approved parcel-boundary provenance. Thin glowing parcel lines refresh as new geometry materializes. Weather, opportunities, source IDs and unrelated overlays stay out of this view.</p><div class="owner-actions"><button id="bpOwnerBoundaryOpen5403" class="owner-btn primary" type="button">OPEN LIVE BOUNDARY VIEWER</button></div><div class="owner-sub">Owner mode can see all active approved boundary sources. Green states are currently enabled by BridgePoint for public boundary display; red states stay owner-only until the source-rights metadata explicitly allows redistribution or public display.</div>';
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
const BOUNDARY_API={version:VERSION,open:openViewer,close:closeViewer,getMap:()=>viewer||window.__BP_BOUNDARY_VIEWER_MAP_V5585__||null,get mode(){return mode},get stateStatus(){return lastStateRows.slice()},stateFillLayer:STATE_FILL};window.__BP_PARCEL_BOUNDARY_VIEWER_V5577__=BOUNDARY_API;window.__BP_PARCEL_BOUNDARY_VIEWER_V5576__=BOUNDARY_API;window.__BP_PARCEL_BOUNDARY_VIEWER_V5403__=BOUNDARY_API;window.__BP_PARCEL_BOUNDARY_VIEWER_V5404__=BOUNDARY_API;window.__BP_PARCEL_BOUNDARY_VIEWER_V5405__=BOUNDARY_API;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();