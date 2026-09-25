(()=>{
'use strict';

const LOCAL_RUNTIME=location.hostname==='127.0.0.1'||location.hostname==='localhost';
const FN=LOCAL_RUNTIME?location.origin+'/functions/v1/bridgepoint-parcel-boundary-tile-v5403':'https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-parcel-boundary-tile-v5403';
const SEARCH_FN=LOCAL_RUNTIME?location.origin+'/functions/v1/bridgepoint-boundary-search-v1091':'https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-boundary-search-v1091';
const PUBLIC_BUILDINGS='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-public-building-tile-v5019?z={z}&x={x}&y={y}&limit=7000';
const VERSION=5634;
const SOURCE='bp-boundary-viewer-v5403';
const GLOW='bp-boundary-glow-v5403';
const LINE='bp-boundary-line-v5403';
const STATE_SOURCE='bp-boundary-state-status-v5576';
const STATE_FILL='bp-boundary-state-fill-v5576';
const STATE_LINE='bp-boundary-state-line-v5576';
const STATE_LABEL='bp-boundary-state-label-v5576';
const GLOBAL_SOURCE='bp-boundary-global-status-v5750';
const GLOBAL_DOT='bp-boundary-global-dot-v5750';
const GLOBAL_LABEL='bp-boundary-global-label-v5750';
const DEM='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
let viewer=null, refreshTimer=null, statusTimer=null, mode='public';
let lastGlobalRows=[];

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

function bpBoundaryMapNameExpr(){return window.BridgePointLanguage?.mapNameExpression?.()||['coalesce',['get','name:en'],['get','name_en'],['get','name'],'']}
function bpBoundaryApplyLanguage(){
 if(!viewer)return false;
 const expr=bpBoundaryMapNameExpr();let n=0;
 for(const id of ['bp-boundary-country-label-v5750','bp-boundary-admin-label-v5750']){
  try{if(viewer.getLayer(id)){viewer.setLayoutProperty(id,'text-field',expr);n++}}catch(_){}
 }
 return n>0
}
window.addEventListener('bridgepoint:languagechange',()=>setTimeout(bpBoundaryApplyLanguage,80));


const OFM_BOUNDARY='https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf';
const STATE_TOPOLOGY='/assets/us-state-boundaries-census.topo.json?v=5577';
let stateGeometryPromise=null,lastStateRows=[],stateFeatureCount=0;

function boundaryStyle(){
  return{
    version:8,
    glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources:{
      ofm:{type:'vector',tiles:[OFM_BOUNDARY],minzoom:0,maxzoom:14,attribution:'OpenFreeMap © OpenMapTiles · © OpenStreetMap contributors'},
      publicBuildings:{type:'vector',tiles:[PUBLIC_BUILDINGS],minzoom:10,maxzoom:22,attribution:'BridgePoint public-safe source-backed building geometry'},
      dem:{type:'raster-dem',tiles:[DEM],tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'Mapzen Terrain Tiles · AWS Open Data'}
    },
    terrain:{source:'dem',exaggeration:1.12},
    layers:[
      {id:'bp-boundary-bg-v5576',type:'background',paint:{'background-color':'#061017'}},
      {id:'bp-boundary-water-v5576',type:'fill',source:'ofm','source-layer':'water',paint:{'fill-color':'#0b3044','fill-opacity':.96}},
      {id:'bp-boundary-hillshade-v5750',type:'hillshade',source:'dem',minzoom:2,paint:{'hillshade-exaggeration':.62,'hillshade-shadow-color':'#0b1112','hillshade-highlight-color':'#d7d2b8','hillshade-accent-color':'#60706b'}},
      {id:'bp-boundary-road-v5576',type:'line',source:'ofm','source-layer':'transportation',minzoom:5.5,filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary']]],paint:{'line-color':'#53717c','line-width':['interpolate',['linear'],['zoom'],5.5,.25,10,1.1,16,3.2],'line-opacity':.34}},
      {id:'bp-boundary-context-buildings-v1091',type:'fill-extrusion',source:'ofm','source-layer':'building',minzoom:11.2,paint:{'fill-extrusion-color':'#7f878b','fill-extrusion-height':['max',4,['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],['*',['coalesce',['to-number',['get','levels']],3],3],9]],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','render_min_height']],['to-number',['get','min_height']],0]],'fill-extrusion-opacity':.86,'fill-extrusion-vertical-gradient':true}},
      {id:'bp-boundary-context-roofs-v1091',type:'fill-extrusion',source:'ofm','source-layer':'building',minzoom:11.2,paint:{'fill-extrusion-color':'#ffffff','fill-extrusion-base':['max',4,['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],['*',['coalesce',['to-number',['get','levels']],3],3],9]],'fill-extrusion-height':['+',['max',4,['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],['*',['coalesce',['to-number',['get','levels']],3],3],9]],['max',.45,['coalesce',['to-number',['get','roof_height']],['to-number',['get','roof:height']],.55]]],'fill-extrusion-opacity':.96,'fill-extrusion-vertical-gradient':true}},
      {id:'bp-boundary-public-buildings-v1091',type:'fill-extrusion',source:'publicBuildings','source-layer':'buildings',minzoom:11.4,paint:{'fill-extrusion-color':'#7f878b','fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','base_height_m']],0]],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':true}},
      {id:'bp-boundary-public-roofs-v1091',type:'fill-extrusion',source:'publicBuildings','source-layer':'buildings',minzoom:13.8,paint:{'fill-extrusion-color':'#ffffff','fill-extrusion-base':['max',['coalesce',['to-number',['get','base_height_m']],0],['-',['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],['max',.18,['coalesce',['to-number',['get','roof_height_m']],.35]]]],'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':true}},
      {id:'bp-boundary-country-v5576',type:'line',source:'ofm','source-layer':'boundary',minzoom:1,filter:['==',['get','admin_level'],2],paint:{'line-color':'#dffaff','line-width':['interpolate',['linear'],['zoom'],1,.55,4,1.05,10,1.8],'line-opacity':.88}},
      {id:'bp-boundary-state-base-v5576',type:'line',source:'ofm','source-layer':'boundary',minzoom:1,filter:['==',['get','admin_level'],4],paint:{'line-color':'#8fb6c1','line-width':['interpolate',['linear'],['zoom'],1,.22,4,.65,10,1.35],'line-opacity':.7}},
      {id:'bp-boundary-country-label-v5750',type:'symbol',source:'ofm','source-layer':'place',minzoom:0,maxzoom:6.5,filter:['==',['get','class'],'country'],layout:{'text-field':bpBoundaryMapNameExpr(),'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],0,8,2,10,4,12.5,6,14],'text-allow-overlap':false,'text-padding':4},paint:{'text-color':'#e9fbff','text-halo-color':'rgba(2,9,13,.96)','text-halo-width':1.35,'text-opacity':.86}},
      {id:'bp-boundary-admin-label-v5750',type:'symbol',source:'ofm','source-layer':'place',minzoom:3,maxzoom:8,filter:['in',['get','class'],['literal',['state','province','region']]],layout:{'text-field':['coalesce',['get','name:en'],['get','name'],''],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],3,8,5,10,8,12],'text-allow-overlap':false,'text-padding':3},paint:{'text-color':'#b9d9df','text-halo-color':'rgba(2,9,13,.96)','text-halo-width':1.15,'text-opacity':.78}}
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
  if(mode==='owner'){
    if(row?.owner_enabled===true)return 'Owner view: at least one active approved parcel-boundary source is available internally for this jurisdiction.';
    return 'Owner view: no currently active approved parcel-boundary source is materialized for this jurisdiction yet.';
  }
  if(row?.public_enabled===true)return 'Public parcel display is enabled by BridgePoint current source-rights metadata for at least one approved boundary source.';
  if(Number(row?.active_approved||0)>0)return 'BridgePoint has approved boundary source data internally, but exact public parcel detail remains restricted by BridgePoint publishing/source-rights policy.';
  return 'Exact public parcel detail is still acquiring or no active public-enabled boundary source is available for this jurisdiction.';
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
    const row=by.get(code)||{state_code:code,active_approved:0,public_approved:0,public_enabled:false,owner_enabled:false,parcel_count:0,reason_code:'NO_ACTIVE_APPROVED_BOUNDARY_SOURCE'};
    const enabled=mode==='owner'?row.owner_enabled===true:row.public_enabled===true;
    p.state_code=code;
    p.status_key=enabled?'public':'hold';
    p.status_short=enabled?(mode==='owner'?'OWNER LIVE':'PUBLIC'):(mode==='owner'?'ACQUIRING':'RESTRICTED');
    p.reason=stateReason(row);
    p.active_approved=Number(row.active_approved||0);
    p.public_approved=Number(row.public_approved||0);
    p.parcel_count=Number(row.parcel_count||0);
    p.parcel_count_fmt=fmt(p.parcel_count);
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
function globalCoverageData(rows){
  return{type:'FeatureCollection',features:(rows||[]).filter(r=>Number.isFinite(Number(r?.center_lon))&&Number.isFinite(Number(r?.center_lat))&&Number(r?.boundaries)>0).map(r=>({
    type:'Feature',
    properties:{
      country_code:String(r.country_code||'').trim(),
      boundaries:Number(r.boundaries||0),
      canonicals:Number(r.canonicals||0),
      boundaries_fmt:fmt(r.boundaries),
      canonicals_fmt:fmt(r.canonicals),
      public_enabled:r.public_enabled===true
    },
    geometry:{type:'Point',coordinates:[Number(r.center_lon),Number(r.center_lat)]}
  }))};
}
function syncGlobalOverlay(map,rows){
  if(!map)return;
  const data=globalCoverageData(rows);
  const src=map.getSource(GLOBAL_SOURCE);
  if(src?.setData)src.setData(data); else map.addSource(GLOBAL_SOURCE,{type:'geojson',data});
  if(!map.getLayer(GLOBAL_DOT))map.addLayer({id:GLOBAL_DOT,type:'circle',source:GLOBAL_SOURCE,minzoom:1,maxzoom:7,paint:{
    'circle-radius':['interpolate',['linear'],['zoom'],1,3.5,3,5,5,7.5,7,10],
    'circle-color':mode==='owner'?'#27ed89':'#ff4d67',
    'circle-opacity':.9,'circle-stroke-color':'#eaffff','circle-stroke-width':1.1
  }});
  if(!map.getLayer(GLOBAL_LABEL))map.addLayer({id:GLOBAL_LABEL,type:'symbol',source:GLOBAL_SOURCE,minzoom:1,maxzoom:7,layout:{
    'text-field':['concat',['get','country_code'],' · ',['get','boundaries_fmt'],' parcels'],
    'text-font':['Noto Sans Regular'],
    'text-size':['interpolate',['linear'],['zoom'],1,8,3,10,5,12,7,13],
    'text-offset':[0,1.25],'text-anchor':'top','text-allow-overlap':false,'text-padding':3
  },paint:{'text-color':mode==='owner'?'#b8ffd3':'#ffd0d7','text-halo-color':'rgba(2,9,13,.98)','text-halo-width':1.25}});
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
.bp-boundary-search1091{position:absolute;z-index:6;top:max(102px,calc(env(safe-area-inset-top) + 86px));left:50%;transform:translateX(-50%);width:min(560px,calc(100vw - 32px));pointer-events:auto}.bp-boundary-search1091 form{display:flex;gap:7px;padding:7px;border:1px solid rgba(255,255,255,.16);border-radius:13px;background:rgba(2,10,16,.92);backdrop-filter:blur(14px);box-shadow:0 12px 34px rgba(0,0,0,.28)}.bp-boundary-search1091 input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:#fff;font:700 12px/1.2 Inter,system-ui,sans-serif;padding:8px}.bp-boundary-search1091 button[type=submit]{border:1px solid rgba(51,232,255,.25);border-radius:9px;background:rgba(51,232,255,.10);color:#dffbff;font-weight:900;padding:0 12px;cursor:pointer}.bp-boundary-search-results1091{margin-top:6px;max-height:min(42vh,330px);overflow:auto;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(2,10,16,.96);box-shadow:0 15px 40px rgba(0,0,0,.36)}.bp-boundary-search-results1091[hidden]{display:none!important}.bp-boundary-search-result1091{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid rgba(255,255,255,.07);background:transparent;color:#fff;padding:10px 11px;cursor:pointer}.bp-boundary-search-result1091:last-child{border-bottom:0}.bp-boundary-search-result1091 b{display:block;font-size:11px}.bp-boundary-search-result1091 small{display:block;margin-top:3px;color:#8da8b4;font-size:8px}.bp-boundary-search-result1091 span{display:block;margin-top:4px;color:#b8cbd3;font-size:8px;line-height:1.35}.bp-boundary-search-note1091{padding:11px;color:#b8cbd3;font-size:9px;line-height:1.4}@media(max-width:620px){.bp-boundary-search1091{top:max(154px,calc(env(safe-area-inset-top) + 140px));width:calc(100vw - 24px)}}
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
  const remove=/(weather|radar|storm|hazard|wildfire|fire-|fire_|precip|lightning|signal|measure|selected|parcel|bp5507|bp5510)/i;
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
  const min=6;
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
function ownerBuildingTileUrl(bucket){
  return FN+'?mode=owner&layer=buildings&z={z}&x={x}&y={y}&v='+encodeURIComponent(bucket);
}
function addOwnerBuildingLayers(map,bucket){
  if(mode!=='owner'||!map)return;
  const source='bp-boundary-owner-buildings-v1091',walls='bp-boundary-owner-buildings-fill-v1091',roofs='bp-boundary-owner-roofs-v1091';
  try{if(map.getLayer(roofs))map.removeLayer(roofs)}catch(_){}
  try{if(map.getLayer(walls))map.removeLayer(walls)}catch(_){}
  try{if(map.getSource(source))map.removeSource(source)}catch(_){}
  map.addSource(source,{type:'vector',tiles:[ownerBuildingTileUrl(bucket)],minzoom:8,maxzoom:22,attribution:'BridgePoint owner-approved building geometry'});
  map.addLayer({id:walls,type:'fill-extrusion',source,'source-layer':'buildings',minzoom:8,paint:{
    'fill-extrusion-color':'#7f878b',
    'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],
    'fill-extrusion-base':['max',0,['coalesce',['to-number',['get','base_height_m']],0]],
    'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':true
  }});
  map.addLayer({id:roofs,type:'fill-extrusion',source,'source-layer':'buildings',minzoom:8,paint:{
    'fill-extrusion-color':'#ffffff',
    'fill-extrusion-base':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],
    'fill-extrusion-height':['+',['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],['max',.35,['coalesce',['to-number',['get','roof_height_m']],.45]]],
    'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':true
  }});
  for(const id of ['bp-boundary-public-buildings-v1091','bp-boundary-public-roofs-v1091']){
    try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none')}catch(_){}
  }
}
async function boundarySearch(q){
  const box=document.getElementById('bpBoundarySearchResults1091');
  if(!box||!viewer)return;
  const query=String(q||'').trim();
  if(query.length<3){box.hidden=false;box.innerHTML='<div class="bp-boundary-search-note1091">Type at least 3 characters.</div>';return}
  box.hidden=false;box.innerHTML='<div class="bp-boundary-search-note1091">Searching source-backed addresses…</div>';
  try{
    const r=await fetch(SEARCH_FN+'?mode='+encodeURIComponent(mode)+'&q='+encodeURIComponent(query),{headers:authHeaders(),cache:'no-store',signal:AbortSignal.timeout(5000)});
    const d=await r.json();
    if(!r.ok||d?.complete===false)throw new Error(d?.error||'SEARCH_TEMPORARILY_UNAVAILABLE');
    const rows=Array.isArray(d?.results)?d.results:[];
    if(!rows.length){
      box.innerHTML='<div class="bp-boundary-search-note1091">'+esc(d?.message||'No source-backed address match yet. Still acquiring coverage; nothing was fabricated.')+'</div>';
      return
    }
    box.innerHTML='';
    for(const row of rows){
      const b=document.createElement('button');b.type='button';b.className='bp-boundary-search-result1091';
      const meta=[row.municipality,row.state_code,row.country_code,row.target_kind,row.parcel_access].filter(Boolean).join(' · ');
      b.innerHTML='<b class="notranslate" translate="no">'+esc(row.full_address||'Address result')+'</b><small>'+esc(meta)+'</small><span>'+esc(row.message||'Source-backed location found.')+'</span>';
      b.onclick=()=>{
        const lng=Number(row.longitude),lat=Number(row.latitude);
        if(Number.isFinite(lng)&&Number.isFinite(lat)){
          box.hidden=true;
          viewer.easeTo({center:[lng,lat],zoom:mode==='owner'?17.2:Math.min(11.35,10.9),pitch:mode==='owner'?62:45,bearing:-18,duration:650});
        }
      };
      box.appendChild(b);
    }
  }catch(e){
    box.innerHTML='<div class="bp-boundary-search-note1091">Search temporarily reconnecting. Existing map coverage remains available.</div>';
  }
}
async function refreshStatus(){
  const box=document.getElementById('bpBoundaryCounts5403');
  if(!box)return;
  try{
    const r=await fetch(FN+'?mode='+encodeURIComponent(mode)+'&status=1',{headers:authHeaders(),cache:'no-store',signal:AbortSignal.timeout(4500)});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'status failed');
    const s=d.status||{};
    lastStateRows=Array.isArray(s.states)?s.states:[];
    lastGlobalRows=Array.isArray(s.global?.countries)?s.global.countries:[];
    let stateError='';
    if(viewer){
      try{await syncStateOverlay(viewer,lastStateRows)}catch(e){stateError=String(e?.message||e)}
      try{syncGlobalOverlay(viewer,lastGlobalRows)}catch(e){stateError=stateError||String(e?.message||e)}
    }
    const publicCount=lastStateRows.filter(x=>x.public_enabled===true).length;
    const denominator=stateFeatureCount?(' / '+fmt(stateFeatureCount)):'';
    const gb=Number(s.global?.global_boundaries||0),gc=Number(s.global?.global_canonicals||0),gCountries=lastGlobalRows.filter(x=>Number(x.boundaries||0)>0).length;
    box.innerHTML=mode==='owner'
      ? '<span>U.S. parcel counter '+fmt(s.parcel_counter_total)+'</span><span>U.S. market canonical '+fmt(s.market_canonical_total)+'</span><span>Global parcel boundaries '+fmt(gb)+'</span><span>Global canonicals '+fmt(gc)+'</span><span>Countries materialized '+fmt(gCountries)+'</span><span>Approved U.S. boundary sources '+fmt(s.active_boundary_candidates)+'</span><span>Public-enabled U.S. jurisdictions '+fmt(publicCount)+denominator+'</span>'
      : '<span>U.S. parcel counter '+fmt(s.parcel_counter_total)+'</span><span>Global public boundaries '+fmt(gb)+'</span><span>Countries with public materialized parcels '+fmt(gCountries)+'</span><span>Public-display U.S. sources '+fmt(s.public_display_candidates)+'</span><span>Public-enabled U.S. jurisdictions '+fmt(publicCount)+denominator+'</span>';
    box.dataset.ready='1';
    if(stateError)box.innerHTML+='<span>State overlay retrying · '+esc(stateError)+'</span>';
  }catch(e){
    if(box.dataset.ready!=='1')box.innerHTML='<span>Live boundary status reconnecting…</span>';
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
          '<div id="bpBoundaryLegend1091" class="bp-boundary-legend5576"><span class="public"><i></i>GREEN · PUBLIC ENABLED</span><span class="private"><i></i>RED · RESTRICTED / ACQUIRING</span></div>'+
          '<div id="bpBoundaryCounts5403" class="bp-boundary-counts5403"><span>Loading live boundary status…</span></div>'+
        '</div>'+
        '<button id="bpBoundaryClose5403" class="bp-boundary-close5403" type="button" aria-label="Close">×</button>'+
      '</div>'+
      '<div class="bp-boundary-search1091"><form id="bpBoundarySearchForm1091"><input id="bpBoundarySearchInput1091" autocomplete="street-address" placeholder="Search any source-backed address…" aria-label="Search address"><button type="submit">SEARCH</button></form><div id="bpBoundarySearchResults1091" class="bp-boundary-search-results1091" hidden></div></div>'+
      '<div id="bpBoundaryZoom5403" class="bp-boundary-zoom5403">Loading parcel-boundary map…</div>';
    document.body.appendChild(shell);
    document.getElementById('bpBoundaryClose5403').onclick=closeViewer;
    document.getElementById('bpBoundarySearchForm1091').onsubmit=e=>{e.preventDefault();void boundarySearch(document.getElementById('bpBoundarySearchInput1091')?.value||'')};
  }
  shell.hidden=false;
  document.body.style.overflow='hidden';
  document.getElementById('bpBoundaryTitle5403').textContent=mode==='owner'?'Owner Exact Parcel Boundary Viewer':'Public Parcel Boundary Viewer';
  document.getElementById('bpBoundaryCopy5403').textContent=mode==='owner'
    ? 'Private full spatial atlas: global roads and labels, 3D owner-approved buildings with white roof caps, country/state parcel counters, high-altitude coverage, and exact approved parcel lines from regional zoom.'
    : 'Public-safe spatial atlas: global roads and labels, uniform 3D buildings with white roofs, red country coverage, and exact parcel detail only for the four public-enabled U.S. jurisdictions.';
  const legend=document.getElementById('bpBoundaryLegend1091');
  if(legend)legend.innerHTML=mode==='owner'?'<span class="public"><i></i>GREEN · OWNER DATA AVAILABLE</span><span class="private"><i></i>RED · STILL ACQUIRING</span>':'<span class="public"><i></i>GREEN · CT / MD / MI / NE PUBLIC</span><span class="private"><i></i>RED · RESTRICTED / ACQUIRING</span>';

  if(!window.maplibregl){
    document.getElementById('bpBoundaryCounts5403').innerHTML='<span>Map engine failed to load. Refresh the app and retry.</span>';
    return;
  }
  if(viewer){try{viewer.remove()}catch(_){} viewer=null}
  const t=token(),mobile=window.innerWidth<=620;
  const start=mode==='owner'
    ? {center:[-20,33],zoom:mobile?1.55:1.9,pitch:mobile?18:28,bearing:0}
    : {center:[-20,28],zoom:mobile?1.35:1.75,pitch:mobile?12:22,bearing:0};
  viewer=new maplibregl.Map({
    container:'bpBoundaryMap5403',
    style:boundaryStyle(),
    center:start.center,
    zoom:start.zoom,
    pitch:start.pitch,
    bearing:start.bearing,
    minZoom:1.15,
    maxZoom:mode==='owner'?22:11.45,
    maxPitch:85,
    projection:{type:'globe'},
    antialias:false,
    fadeDuration:0,
    renderWorldCopies:false,
    maxTileCacheSize:mobile?72:180,
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
      try{if(viewer.getSource('dem'))viewer.setTerrain?.({source:'dem',exaggeration:1.12})}catch(e){console.warn('boundary terrain',e)}
      const bucket=Math.floor(Date.now()/20000);
      addBoundaryLayers(viewer,bucket);
      if(mode==='owner')addOwnerBuildingLayers(viewer,bucket);
      if(lastGlobalRows.length)try{syncGlobalOverlay(viewer,lastGlobalRows)}catch(e){console.warn('global coverage overlay',e)}
      const z=document.getElementById('bpBoundaryZoom5403');
      const update=()=>{
        if(!z||!viewer)return;
        const min=6;
        z.textContent=viewer.getZoom()<min
          ? 'High-altitude coverage · live country/state counters · exact parcel lines begin at z6'
          : (mode==='owner'?'Owner global parcel atlas · exact lines + owner buildings refine through street level':'Public parcel detail · CT / MD / MI / NE only · zoom capped for anti-scraping protection');
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
  // Keep the current tile URL stable during a viewing session. Replacing it every 20s
  // invalidated visible tiles and could make parcel lines blink while replacements loaded.
  refreshTimer=setInterval(()=>{
    if(!viewer||document.getElementById('bpBoundaryViewer5403')?.hidden)return;
    viewer.triggerRepaint?.();
  },60000);
  clearInterval(statusTimer);statusTimer=setInterval(refreshStatus,60000);
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
  card.innerHTML='<span class="eyebrow">OWNER-ONLY SPATIAL TRUTH</span><h2>Live exact parcel boundary viewer</h2><p class="owner-sub">A private 3D spatial atlas fed by approved parcel and building provenance, with global roads/labels, live counters, uniform buildings, white roofs, and exact parcel lines that refine as you zoom.</p><div class="owner-actions"><button id="bpOwnerBoundaryOpen5403" class="owner-btn primary" type="button">OPEN LIVE BOUNDARY VIEWER</button></div><div class="owner-sub">Owner mode can see all active approved boundary sources. Green states are currently enabled by BridgePoint for public boundary display; red states stay owner-only until the source-rights metadata explicitly allows redistribution or public display.</div>';
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