(()=>{
'use strict';

const LOCAL_RUNTIME=location.hostname==='127.0.0.1'||location.hostname==='localhost';
const FN=LOCAL_RUNTIME?location.origin+'/functions/v1/bridgepoint-parcel-boundary-tile-v5403':'https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-parcel-boundary-tile-v5403';
const VERSION=5801;
const SOURCE='bp-boundary-viewer-v5403';
const GLOW='bp-boundary-glow-v5403';
const LINE='bp-boundary-line-v5403';
const STATE_SOURCE='bp-boundary-state-status-v5576';
const STATE_FILL='bp-boundary-state-fill-v5576';
const STATE_LINE='bp-boundary-state-line-v5576';
const STATE_LABEL='bp-boundary-state-label-v5576';
const GLOBAL_SOURCE='bp-boundary-global-status-v5750';
const GLOBAL_DOT='bp-boundary-global-dot-v5750';
const GLOBAL_LABEL='bp-boundary-global-label-v5801';
const COUNTRY_FILL_SOURCE='bp-boundary-country-fill-v5801';
const COUNTRY_FILL='bp-boundary-country-fill-layer-v5801';
const COUNTRY_STATUS_LINE='bp-boundary-country-status-line-v5801';
const BUILDING_SOURCE='bp-boundary-buildings-v5801';
const BUILDING_BODY='bp-boundary-building-body-v5801';
const BUILDING_ROOF='bp-boundary-building-roof-v5801';
const COUNTRY_TOPOLOGY='https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const PUBLIC_BUILDINGS='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-public-building-tile-v5019?z={z}&x={x}&y={y}&limit=2200';
function buildingTiles(){return mode==='owner'?FN+'?mode=owner&layer=buildings&z={z}&x={x}&y={y}&v=5801':PUBLIC_BUILDINGS}
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


const OFM_BOUNDARY='https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf';
const STATE_TOPOLOGY='/assets/us-state-boundaries-census.topo.json?v=5577';
let stateGeometryPromise=null,countryGeometryPromise=null,lastStateRows=[],stateFeatureCount=0;
const countryPointCache=new Map();

function boundaryStyle(){
  return{
    version:8,
    glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources:{
      ofm:{type:'vector',tiles:[OFM_BOUNDARY],minzoom:0,maxzoom:14,attribution:'OpenFreeMap © OpenMapTiles · © OpenStreetMap contributors'},
      dem:{type:'raster-dem',tiles:[DEM],tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'Mapzen Terrain Tiles · AWS Open Data'},
      [BUILDING_SOURCE]:{type:'vector',tiles:[buildingTiles()],minzoom:mode==='owner'?8:11,maxzoom:22,attribution:'BridgePoint source-backed building geometry'}
    },
    terrain:{source:'dem',exaggeration:1.12},
    layers:[
      {id:'bp-boundary-bg-v5576',type:'background',paint:{'background-color':'#061017'}},
      {id:'bp-boundary-water-v5576',type:'fill',source:'ofm','source-layer':'water',paint:{'fill-color':'#0b3044','fill-opacity':.96}},
      {id:'bp-boundary-hillshade-v5750',type:'hillshade',source:'dem',minzoom:2,paint:{'hillshade-exaggeration':.62,'hillshade-shadow-color':'#0b1112','hillshade-highlight-color':'#d7d2b8','hillshade-accent-color':'#60706b'}},
      {id:'bp-boundary-road-v5576',type:'line',source:'ofm','source-layer':'transportation',minzoom:5.5,filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary']]],paint:{'line-color':'#53717c','line-width':['interpolate',['linear'],['zoom'],5.5,.25,10,1.1,16,3.2],'line-opacity':.34}},
      {id:'bp-boundary-country-v5576',type:'line',source:'ofm','source-layer':'boundary',minzoom:1,filter:['==',['get','admin_level'],2],paint:{'line-color':'#dffaff','line-width':['interpolate',['linear'],['zoom'],1,.55,4,1.05,10,1.8],'line-opacity':.88}},
      {id:'bp-boundary-state-base-v5576',type:'line',source:'ofm','source-layer':'boundary',minzoom:1,filter:['==',['get','admin_level'],4],paint:{'line-color':'#8fb6c1','line-width':['interpolate',['linear'],['zoom'],1,.22,4,.65,10,1.35],'line-opacity':.7}},
      {id:'bp-boundary-country-label-v5750',type:'symbol',source:'ofm','source-layer':'place',minzoom:0,maxzoom:6.5,filter:['==',['get','class'],'country'],layout:{'text-field':['coalesce',['get','name_en'],['get','name:en'],['get','name'],''],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],0,8,2,10,4,12.5,6,14],'text-allow-overlap':false,'text-padding':4},paint:{'text-color':'#e9fbff','text-halo-color':'rgba(2,9,13,.96)','text-halo-width':1.35,'text-opacity':.86}},
      {id:'bp-boundary-admin-label-v5750',type:'symbol',source:'ofm','source-layer':'place',minzoom:3,maxzoom:8,filter:['in',['get','class'],['literal',['state','province','region']]],layout:{'text-field':['coalesce',['get','name_en'],['get','name:en'],['get','name'],''],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],3,8,5,10,8,12],'text-allow-overlap':false,'text-padding':3},paint:{'text-color':'#b9d9df','text-halo-color':'rgba(2,9,13,.96)','text-halo-width':1.15,'text-opacity':.78}},
      {id:BUILDING_BODY,type:'fill-extrusion',source:BUILDING_SOURCE,'source-layer':'buildings',minzoom:mode==='owner'?8:11,paint:{'fill-extrusion-color':mode==='owner'?'#405d6b':'#4f6e7a','fill-extrusion-base':['max',0,['coalesce',['to-number',['get','base_height_m']],0]],'fill-extrusion-height':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':true}},
      {id:BUILDING_ROOF,type:'fill-extrusion',source:BUILDING_SOURCE,'source-layer':'buildings',minzoom:mode==='owner'?8:11,paint:{'fill-extrusion-color':mode==='owner'?'#f0d7a6':'#ffffff','fill-extrusion-base':['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],'fill-extrusion-height':['+',['max',3,['coalesce',['to-number',['get','render_height_m']],8.5]],['max',.28,['coalesce',['to-number',['get','roof_height_m']],.45]]],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':false}},
      {id:'bp-boundary-water-label-v5801',type:'symbol',source:'ofm','source-layer':'water_name',minzoom:4,layout:{'text-field':['coalesce',['get','name_en'],['get','name:en'],['get','name'],''],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],4,9,10,11,16,13],'text-allow-overlap':false,'text-padding':6},paint:{'text-color':'#74ccec','text-halo-color':'rgba(2,9,13,.96)','text-halo-width':1.2}},
      {id:'bp-boundary-place-label-v5801',type:'symbol',source:'ofm','source-layer':'place',minzoom:5,filter:['in',['get','class'],['literal',['city','town','village','suburb']]],layout:{'text-field':['coalesce',['get','name_en'],['get','name:en'],['get','name'],''],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],5,9,10,11,16,13.5],'text-allow-overlap':false,'text-padding':6},paint:{'text-color':'#e9f7fb','text-halo-color':'rgba(2,9,13,.96)','text-halo-width':1.35}},
      {id:'bp-boundary-road-label-v5801',type:'symbol',source:'ofm','source-layer':'transportation_name',minzoom:9,layout:{'symbol-placement':'line','text-field':['coalesce',['get','name_en'],['get','name:en'],['get','name'],''],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],9,9.5,14,11,18,13],'text-allow-overlap':false,'text-padding':9},paint:{'text-color':'#d7edf2','text-halo-color':'rgba(2,9,13,.96)','text-halo-width':1.4}}
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
    if(row?.blocked===true)return 'BridgePoint backend currently marks this jurisdiction blocked.';
    if(row?.owner_enabled===true)return 'BridgePoint has approved parcel coverage for this jurisdiction.';
    return 'BridgePoint has not materialized an owner-available parcel source here yet.';
  }
  if(row?.public_enabled===true)return 'Public parcel display is enabled by BridgePoint current source-rights metadata for at least one approved boundary source.';
  return 'Parcel geometry is not public-enabled for this jurisdiction.';
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
    const row=by.get(code)||{state_code:code,active_approved:0,public_approved:0,parcel_count:0,owner_enabled:false,blocked:false,public_enabled:false,reason_code:'NO_ACTIVE_APPROVED_BOUNDARY_SOURCE'};
    const full=String(p.BASENAME||p.NAME||p.NAME10||p.name||code);
    const publicMode=mode!=='owner';
    const statusKey=publicMode?(row.public_enabled===true?'public':'hold'):(row.blocked===true?'blocked':(row.owner_enabled===true?'available':'pending'));
    const statusShort=publicMode?(row.public_enabled===true?'PUBLIC':'NOT PUBLIC'):(statusKey==='available'?'AVAILABLE':statusKey==='blocked'?'BLOCKED':'REVIEWING');
    p.state_code=code;
    p.state_name=full;
    p.parcel_count=Number(row.parcel_count||0);
    p.parcel_count_fmt=fmt(row.parcel_count||0);
    p.status_key=statusKey;
    p.status_short=statusShort;
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
    const p=f.properties||{},publicOk=String(p.status_key)==='public',ownerOk=String(p.status_key)==='available';
    const ok=mode==='owner'?ownerOk:publicOk;
    const name=p.state_name||p.BASENAME||p.NAME||p.NAME10||p.name||p.state_code||'Jurisdiction';
    const html='<b>'+esc(name)+' · '+esc(p.state_code||'')+'</b><em class="'+(ok?'ok':'hold')+'">'+esc(p.status_short||'')+'</em><div>'+fmt(p.parcel_count||0)+' parcels</div><small>'+esc(p.reason||'')+'</small>';
    new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'330px',className:'bp-boundary-state-popup'}).setLngLat(e.lngLat).setHTML(html).addTo(map);
  });
}

function normCountry(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').trim()}
function topologyToCountryGeoJSON(topo){
  if(!topo||topo.type!=='Topology')throw new Error('COUNTRY_TOPOLOGY_INVALID');
  const obj=topo.objects?.countries;
  if(!obj||!Array.isArray(obj.geometries))throw new Error('COUNTRY_TOPOLOGY_OBJECT_MISSING');
  const tr=topo.transform||null,raw=Array.isArray(topo.arcs)?topo.arcs:[],cache=new Array(raw.length);
  const decodeArc=i=>{
    const rev=i<0,idx=rev?~i:i;let pts=cache[idx];
    if(!pts){let x=0,y=0;pts=(raw[idx]||[]).map(p=>{x+=Number(p?.[0]||0);y+=Number(p?.[1]||0);return tr?[x*tr.scale[0]+tr.translate[0],y*tr.scale[1]+tr.translate[1]]:[x,y]});cache[idx]=pts}
    return rev?pts.slice().reverse():pts
  };
  const stitch=ids=>{const out=[];(ids||[]).forEach((id,n)=>{const a=decodeArc(Number(id));out.push(...(n&&a.length?a.slice(1):a))});return out};
  const geometry=g=>g.type==='Polygon'?{type:'Polygon',coordinates:(g.arcs||[]).map(stitch)}:g.type==='MultiPolygon'?{type:'MultiPolygon',coordinates:(g.arcs||[]).map(poly=>(poly||[]).map(stitch))}:null;
  return{type:'FeatureCollection',features:obj.geometries.map(g=>({type:'Feature',id:g.id,properties:{...(g.properties||{})},geometry:geometry(g)})).filter(f=>f.geometry)}
}
async function countryGeometry(){
  if(countryGeometryPromise)return countryGeometryPromise;
  countryGeometryPromise=fetch(COUNTRY_TOPOLOGY,{cache:'force-cache'}).then(async r=>{if(!r.ok)throw new Error('COUNTRY_GEOMETRY_HTTP_'+r.status);return topologyToCountryGeoJSON(await r.json())}).catch(e=>{countryGeometryPromise=null;throw e});
  return countryGeometryPromise
}
function countryFeatureCenter(g){
  const pts=[];const walk=v=>{if(!Array.isArray(v))return;if(typeof v[0]==='number'&&typeof v[1]==='number')pts.push(v);else v.forEach(walk)};walk(g?.coordinates);
  if(!pts.length)return null;let w=180,e=-180,s=90,n=-90;for(const p of pts){w=Math.min(w,p[0]);e=Math.max(e,p[0]);s=Math.min(s,p[1]);n=Math.max(n,p[1])}return[(w+e)/2,(s+n)/2]
}
function refreshCountryPointCache(map){
  try{
    for(const f of map.querySourceFeatures('ofm',{sourceLayer:'place'})||[]){
      const p=f.properties||{};if(String(p.class||'')!=='country')continue;
      const code=String(p.iso_a2||p.iso_3166_1_alpha_2||'').toUpperCase().trim();
      const c=f.geometry?.type==='Point'?f.geometry.coordinates:null;
      if(code&&Array.isArray(c)&&Number.isFinite(+c[0])&&Number.isFinite(+c[1]))countryPointCache.set(code,[+c[0],+c[1]]);
    }
  }catch(_){}
}
function countryStatusData(geo,rows){
  const byCode=new Map((rows||[]).map(r=>[String(r.country_code||'').toUpperCase(),r]));
  const byName=new Map();
  for(const r of rows||[]){const k=normCountry(r.country_name);if(k)byName.set(k,r)}
  const alias={
    'united states of america':'US','dem rep congo':'CD','dominican rep':'DO','w sahara':'EH','central african rep':'CF',
    's sudan':'SS','eq guinea':'GQ','solomon is':'SB','bosnia and herz':'BA','falkland is':'FK','fr s antarctic lands':'TF',
    'czech rep':'CZ','macedonia':'MK','russia':'RU','laos':'LA','brunei':'BN','iran':'IR','venezuela':'VE','bolivia':'BO',
    'tanzania':'TZ','moldova':'MD','vietnam':'VN','syria':'SY','south korea':'KR','north korea':'KP'
  };
  const polys=[],points=[],matched=new Set();
  for(const f of geo.features||[]){
    const natural=String(f.properties?.name||'');let row=byName.get(normCountry(natural));
    if(!row){const code=alias[normCountry(natural)];if(code)row=byCode.get(code)}
    if(!row)continue;
    const code=String(row.country_code||'').toUpperCase(),blocked=row.blocked===true,ownerOk=row.owner_enabled===true;
    const key=mode==='owner'?(blocked?'blocked':ownerOk?'available':'pending'):'hold';
    const props={country_code:code,country_name:String(row.country_name||natural||code),boundaries:Number(row.boundaries||0),boundaries_fmt:fmt(row.boundaries||0),canonicals:Number(row.canonicals||0),status_key:key,status_short:mode==='owner'?(key==='available'?'AVAILABLE':key==='blocked'?'BLOCKED':'REVIEWING'):'NOT PUBLIC'};
    polys.push({type:'Feature',properties:props,geometry:f.geometry});matched.add(code);
    const c=countryFeatureCenter(f.geometry);if(c)points.push({type:'Feature',properties:props,geometry:{type:'Point',coordinates:c}})
  }
  for(const row of rows||[]){
    const code=String(row.country_code||'').toUpperCase();if(matched.has(code))continue;const c=countryPointCache.get(code);if(!c)continue;
    const blocked=row.blocked===true,ownerOk=row.owner_enabled===true,key=mode==='owner'?(blocked?'blocked':ownerOk?'available':'pending'):'hold';
    points.push({type:'Feature',properties:{country_code:code,country_name:String(row.country_name||code),boundaries:Number(row.boundaries||0),boundaries_fmt:fmt(row.boundaries||0),canonicals:Number(row.canonicals||0),status_key:key,status_short:mode==='owner'?(key==='available'?'AVAILABLE':key==='blocked'?'BLOCKED':'REVIEWING'):'NOT PUBLIC'},geometry:{type:'Point',coordinates:c}})
  }
  return{polygons:{type:'FeatureCollection',features:polys},points:{type:'FeatureCollection',features:points}}
}
function bindCountryPopup(map){
  if(map.__bpCountryPopup5801)return;map.__bpCountryPopup5801=true;
  map.on('mouseenter',COUNTRY_FILL,()=>{try{map.getCanvas().style.cursor='pointer'}catch(_){}});
  map.on('mouseleave',COUNTRY_FILL,()=>{try{map.getCanvas().style.cursor=''}catch(_){}});
  map.on('click',COUNTRY_FILL,e=>{const p=e?.features?.[0]?.properties||{};const ok=String(p.status_key)==='available';const html='<b>'+esc(p.country_name||p.country_code||'Country')+' · '+esc(p.country_code||'')+'</b><em class="'+(ok?'ok':'hold')+'">'+esc(p.status_short||'')+'</em><div>'+fmt(p.boundaries||0)+' parcel boundaries</div><small>'+ (mode==='owner'?'Owner status comes from BridgePoint backend materialization/block state.':'Country parcel geometry is not public.') +'</small>';new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'330px',className:'bp-boundary-state-popup'}).setLngLat(e.lngLat).setHTML(html).addTo(map)});
}
async function syncGlobalOverlay(map,rows){
  if(!map)return;
  refreshCountryPointCache(map);
  const geo=await countryGeometry();
  const d=countryStatusData(geo,rows);
  let src=map.getSource(COUNTRY_FILL_SOURCE);
  if(src?.setData)src.setData(d.polygons);else map.addSource(COUNTRY_FILL_SOURCE,{type:'geojson',data:d.polygons,attribution:'Natural Earth public-domain country geometry via world-atlas'});
  src=map.getSource(GLOBAL_SOURCE);
  if(src?.setData)src.setData(d.points);else map.addSource(GLOBAL_SOURCE,{type:'geojson',data:d.points});
  if(!map.getLayer(COUNTRY_FILL))map.addLayer({id:COUNTRY_FILL,type:'fill',source:COUNTRY_FILL_SOURCE,minzoom:0,maxzoom:7,paint:{
    'fill-color':['match',['get','status_key'],'available','#1adb7a','blocked','#ff405b','pending','#d6a73b','#ff405b'],
    'fill-opacity':['interpolate',['linear'],['zoom'],0,.22,2,.25,4,.19,6,.10]
  }},map.getLayer('bp-boundary-country-v5576')?'bp-boundary-country-v5576':undefined);
  if(!map.getLayer(COUNTRY_STATUS_LINE))map.addLayer({id:COUNTRY_STATUS_LINE,type:'line',source:COUNTRY_FILL_SOURCE,minzoom:0,maxzoom:8,paint:{
    'line-color':['match',['get','status_key'],'available','#42ff99','blocked','#ff6277','pending','#f2c75d','#ff6277'],
    'line-width':['interpolate',['linear'],['zoom'],0,.55,2,.8,5,1.4,8,2],
    'line-opacity':.9
  }});
  if(!map.getLayer(GLOBAL_DOT))map.addLayer({id:GLOBAL_DOT,type:'circle',source:GLOBAL_SOURCE,minzoom:1,maxzoom:9,paint:{
    'circle-radius':['interpolate',['linear'],['zoom'],1,2.5,3,4.5,6,7,9,9],
    'circle-color':['match',['get','status_key'],'available','#27ed89','blocked','#ff4d67','pending','#e2b74a','#ff4d67'],
    'circle-opacity':.95,'circle-stroke-color':'#eaffff','circle-stroke-width':.8
  }});
  if(!map.getLayer(GLOBAL_LABEL))map.addLayer({id:GLOBAL_LABEL,type:'symbol',source:GLOBAL_SOURCE,minzoom:1,maxzoom:9,layout:{
    'text-field':['concat',['get','country_name'],'\n',['get','boundaries_fmt'],' parcels · ',['get','status_short']],
    'text-font':['Noto Sans Regular'],
    'text-size':['interpolate',['linear'],['zoom'],1,7,3,8.5,5,10.5,8,12],
    'text-offset':[0,1.1],'text-anchor':'top','text-allow-overlap':false,'text-padding':2
  },paint:{'text-color':['match',['get','status_key'],'available','#baffd2','blocked','#ffd0d7','pending','#ffe6a7','#ffd0d7'],'text-halo-color':'rgba(2,9,13,.98)','text-halo-width':1.25}});
  bindCountryPopup(map)
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
      'fill-color':['match',['get','status_key'],'public','#18df7a','available','#18df7a','blocked','#ff4d67','pending','#d6a73b','#ff4d67'],
      'fill-opacity':['interpolate',['linear'],['zoom'],1.8,.28,3.4,.25,5.5,.13,7,.055,9,.015]
    }},before);
  }
  if(!map.getLayer(STATE_LINE))map.addLayer({id:STATE_LINE,type:'line',source:STATE_SOURCE,minzoom:1.8,paint:{
    'line-color':['match',['get','status_key'],'public','#57ffa4','available','#57ffa4','blocked','#ff7182','pending','#f2c75d','#ff7182'],
    'line-width':['interpolate',['linear'],['zoom'],2,.8,4,1.3,7,1.8],
    'line-opacity':['interpolate',['linear'],['zoom'],2,.9,7,.62]
  }});
  if(!map.getLayer(STATE_LABEL))map.addLayer({id:STATE_LABEL,type:'symbol',source:STATE_SOURCE,minzoom:2.15,maxzoom:6.8,layout:{
    'text-field':['concat',['get','state_name'],'\\n',['get','parcel_count_fmt'],' parcels · ',['get','status_short']],
    'text-size':['interpolate',['linear'],['zoom'],2.15,8,4,10.5,6,12],
    'text-font':['Noto Sans Regular'],
    'text-anchor':'center',
    'text-allow-overlap':false,
    'text-padding':2
  },paint:{
    'text-color':['match',['get','status_key'],'public','#b8ffd3','available','#b8ffd3','blocked','#ffd0d7','pending','#ffe6a7','#ffd0d7'],
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
  const min=6;
  try{if(map.getLayer(LINE))map.removeLayer(LINE)}catch(_){}
  try{if(map.getLayer(GLOW))map.removeLayer(GLOW)}catch(_){}
  try{if(map.getSource(SOURCE))map.removeSource(SOURCE)}catch(_){}
  map.addSource(SOURCE,{type:'vector',tiles:[tileUrl(bucket)],minzoom:min,maxzoom:22,attribution:'BridgePoint approved parcel-boundary provenance'});
  map.addLayer({
    id:GLOW,type:'line',source:SOURCE,'source-layer':'parcels',minzoom:min,
    paint:{
      'line-color':'#004cff',
      'line-opacity':['interpolate',['linear'],['zoom'],2,.72,3,.80,4,.82,7,.76,9,.64,12,.54,16,.45,20,.36],
      'line-width':['interpolate',['linear'],['zoom'],2,.78,3,.95,4,1.25,6,1.7,7,2.25,9,3.2,12,4.1,16,5.6,20,7.2],
      'line-blur':['interpolate',['linear'],['zoom'],2,.30,3,.42,4,.65,7,1.15,14,2.2,20,3.0]
    }
  });
  map.addLayer({
    id:LINE,type:'line',source:SOURCE,'source-layer':'parcels',minzoom:min,
    paint:{
      'line-color':'#73ffff',
      'line-opacity':['interpolate',['linear'],['zoom'],2,.82,3,.88,4,.92,7,1,20,1],
      'line-width':['interpolate',['linear'],['zoom'],2,.18,3,.24,4,.34,6,.5,7,.7,9,.95,12,1.2,16,1.65,20,2.25]
    }
  });
}
async function refreshStatus(){
  const box=document.getElementById('bpBoundaryCounts5403');
  if(!box)return;
  try{
    const r=await fetch(FN+'?mode='+encodeURIComponent(mode)+'&status=1',{headers:authHeaders(),cache:'no-store',signal:AbortSignal.timeout(6500)});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'status failed');
    const s=d.status||{};
    lastStateRows=Array.isArray(s.states)?s.states:[];
    lastGlobalRows=Array.isArray(s.global?.countries)?s.global.countries:[];
    let stateError='';
    if(viewer){
      try{await syncStateOverlay(viewer,lastStateRows)}catch(e){stateError=String(e?.message||e)}
      try{await syncGlobalOverlay(viewer,lastGlobalRows)}catch(e){stateError=stateError||String(e?.message||e)}
    }
    const publicCount=lastStateRows.filter(x=>x.public_enabled===true).length;
    const denominator=stateFeatureCount?(' / '+fmt(stateFeatureCount)):'';
    const gb=Number(s.global?.global_boundaries||0),gc=Number(s.global?.global_canonicals||0),gCountries=lastGlobalRows.filter(x=>Number(x.boundaries||0)>0).length;
    box.innerHTML=mode==='owner'
      ? '<span>U.S. parcel counter '+fmt(s.parcel_counter_total)+'</span><span>U.S. market canonical '+fmt(s.market_canonical_total)+'</span><span>Global parcel boundaries '+fmt(gb)+'</span><span>Global canonicals '+fmt(gc)+'</span><span>Countries materialized '+fmt(gCountries)+'</span><span>Approved U.S. boundary sources '+fmt(s.active_boundary_candidates)+'</span><span>Public-enabled U.S. jurisdictions '+fmt(publicCount)+denominator+'</span>'
      : '<span>U.S. parcel counter '+fmt(s.parcel_counter_total)+'</span><span>Public-display U.S. sources '+fmt(s.public_display_candidates)+'</span><span>Public-enabled U.S. jurisdictions '+fmt(publicCount)+denominator+'</span>';
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
          '<div id="bpBoundaryLegend5801" class="bp-boundary-legend5576"></div>'+
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
    ? 'Owner-only 3D parcel atlas. Country/state coverage colors and counters stay visible from globe altitude; exact source parcel lines render from zoom 6. Solid 3D buildings and contrasting roofs render where BridgePoint building tiles are available.'
    : 'Public parcel viewer. Countries are NOT PUBLIC. Exact parcel geometry is restricted to CT, MD, MI and NE and only within the protected detail range.';
  const legend=document.getElementById('bpBoundaryLegend5801');if(legend)legend.innerHTML=mode==='owner'?'<span class="public"><i></i>GREEN · AVAILABLE</span><span class="private"><i></i>RED · BLOCKED</span><span style="color:#e2b74a"><i></i>AMBER · REVIEWING</span>':'<span class="public"><i></i>GREEN · PUBLIC (CT/MD/MI/NE)</span><span class="private"><i></i>RED · NOT PUBLIC</span>';

  if(!window.maplibregl){
    document.getElementById('bpBoundaryCounts5403').innerHTML='<span>Map engine failed to load. Refresh the app and retry.</span>';
    return;
  }
  if(viewer){try{viewer.remove()}catch(_){} viewer=null}
  const t=token(),mobile=window.innerWidth<=620;
  const start=mode==='owner'
    ? {center:[-20,33],zoom:mobile?2.05:2.2,pitch:mobile?18:28,bearing:0}
    : {center:[-20,28],zoom:mobile?1.35:1.75,pitch:mobile?12:22,bearing:0};
  viewer=new maplibregl.Map({
    container:'bpBoundaryMap5403',
    style:boundaryStyle(),
    center:start.center,
    zoom:start.zoom,
    pitch:start.pitch,
    bearing:start.bearing,
    minZoom:1.15,
    maxZoom:mode==='owner'?22:11,
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
  window.__BP_BOUNDARY_VIEWER_MAP_V5801__=viewer;
  window.__BP_BOUNDARY_VIEWER_BOOT_V5801__={version:5801,mode,phase:'map-created',ownerTokenFromAppStore:!!t,start,updatedAt:Date.now()};
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
      addBoundaryLayers(viewer,Math.floor(Date.now()/20000));
      if(lastGlobalRows.length)try{await syncGlobalOverlay(viewer,lastGlobalRows)}catch(e){console.warn('global coverage overlay',e)}
      const z=document.getElementById('bpBoundaryZoom5403');
      const update=()=>{
        if(!z||!viewer)return;
        const min=7;
        z.textContent=viewer.getZoom()<min
          ? (mode==='owner'?'Global coverage + parcel counters · exact parcel lines begin at zoom 6 to prevent world-scale tile timeouts':'Countries NOT PUBLIC · CT/MD/MI/NE exact parcel lines begin at zoom 6')
          : (mode==='owner'?'Owner U.S. + global exact parcel boundaries · solid 3D buildings · 3D terrain':'Public exact parcel boundaries · CT/MD/MI/NE only · detail capped at zoom 12');
      };
      update();viewer.on('zoom',update);viewer.on('moveend',()=>{refreshCountryPointCache(viewer);if(lastGlobalRows.length)void syncGlobalOverlay(viewer,lastGlobalRows)});
      if(lastStateRows.length){try{await syncStateOverlay(viewer,lastStateRows)}catch(e){console.warn('boundary state overlay retry',e)}}
      else void refreshStatus();
      window.__BP_BOUNDARY_VIEWER_BOOT_V5577__={version:5801,mode,independentMap:true,ownerTokenFromAppStore:!!t,start,updatedAt:Date.now()};
      window.__BP_BOUNDARY_VIEWER_BOOT_V5801__={version:5801,mode,phase:'ready',reason,independentMap:true,ownerTokenFromAppStore:!!t,start,updatedAt:Date.now()};
      return true
    }catch(e){
      viewerFinalized=false;
      window.__BP_BOUNDARY_VIEWER_BOOT_V5801__={version:5801,mode,phase:'retry',reason,error:String(e?.message||e),updatedAt:Date.now()};
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
  if(viewer){try{viewer.remove()}catch(_){}if(window.__BP_BOUNDARY_VIEWER_MAP_V5801__===viewer)window.__BP_BOUNDARY_VIEWER_MAP_V5801__=null;viewer=null}
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
  card.innerHTML='<span class="eyebrow">OWNER-ONLY SPATIAL TRUTH</span><h2>Live exact parcel boundary viewer</h2><p class="owner-sub">A separate clean 3D terrain viewer fed by approved parcel provenance, country/state status, and BridgePoint building geometry. Coverage colors and counters stay visible globally; exact parcel lines begin at the safe detail threshold; solid buildings use contrasting roofs.</p><div class="owner-actions"><button id="bpOwnerBoundaryOpen5403" class="owner-btn primary" type="button">OPEN LIVE BOUNDARY VIEWER</button></div><div class="owner-sub">Owner mode can see all active approved boundary sources. Green states are currently enabled by BridgePoint for public boundary display; red states stay owner-only until the source-rights metadata explicitly allows redistribution or public display.</div>';
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
const BOUNDARY_API={version:VERSION,open:openViewer,close:closeViewer,getMap:()=>viewer||window.__BP_BOUNDARY_VIEWER_MAP_V5801__||null,get mode(){return mode},get stateStatus(){return lastStateRows.slice()},stateFillLayer:STATE_FILL};window.__BP_PARCEL_BOUNDARY_VIEWER_V5577__=BOUNDARY_API;window.__BP_PARCEL_BOUNDARY_VIEWER_V5576__=BOUNDARY_API;window.__BP_PARCEL_BOUNDARY_VIEWER_V5403__=BOUNDARY_API;window.__BP_PARCEL_BOUNDARY_VIEWER_V5404__=BOUNDARY_API;window.__BP_PARCEL_BOUNDARY_VIEWER_V5405__=BOUNDARY_API;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();