(()=>{
'use strict';
const LOCAL_RUNTIME=location.hostname==='127.0.0.1'||location.hostname==='localhost';
const SUPA=LOCAL_RUNTIME?location.origin:'https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY=LOCAL_RUNTIME?'bridgepoint-local':'sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const RPC=SUPA+'/rest/v1/rpc/';
const SOURCE='bp-global-parcels-v957';
const GLOW='bp-global-parcel-glow-v957';
const LINE='bp-global-parcel-line-v957';
const HIT='bp-global-parcel-hit-v957';
const EMPTY={type:'FeatureCollection',features:[]};
const PUBLIC_PARCEL_GEOMETRY=false;
window.__BP_PUBLIC_MAP_PRIVACY_V1116__={version:1116,parcelGeometry:false,parcelCounts:true,parcelSearch:true,ownerViewerUnaffected:true,updatedAt:Date.now()};
const state={map:null,timer:0,statusTimer:0,seq:0,lastKey:'',lastStatus:null,lastData:EMPTY};
const fmt=n=>Number(n||0).toLocaleString();
async function rpc(name,args={},timeout=7000){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
 try{
  const r=await fetch(RPC+name,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json','Accept':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(args),signal:c.signal,cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d?.message||d?.error||('HTTP '+r.status));
  return d;
 }finally{clearTimeout(t)}
}
async function status(){const d=await rpc('bridgepoint_public_global_status_v957',{},5000);state.lastStatus=d;updateCounters(d);return d}
async function search(q,limit=8){return rpc('bridgepoint_public_global_search_v957',{p_query:String(q||''),p_limit:limit},4500)}
async function detail(lng,lat,radius=140){return rpc('bridgepoint_public_global_property_detail_v957',{p_lng:Number(lng),p_lat:Number(lat),p_radius_m:Number(radius)||140},4500)}
function currentMap(){return window.__BP_V5000_WORLD__?.map||window.__BP_LANDING_WORLD__?.map||null}
const BP_COUNTRY_NAMES=(()=>{try{return new Intl.DisplayNames(['en'],{type:'region'})}catch(_){return null}})();
function countryName(code){
 const c=String(code||'').trim().toUpperCase();
 const overrides={CD:'DR Congo',GB:'United Kingdom',KR:'South Korea',TW:'Taiwan',XK:'Kosovo'};
 if(overrides[c])return overrides[c];
 try{const n=BP_COUNTRY_NAMES?.of(c);if(n&&n!==c)return n}catch(_){}
 return c||'Global'
}
function updateCounters(d){
 const total=document.getElementById('landingGlobalProperties');
 if(total)total.textContent=fmt(d?.active_global_canonical);
 const sub=document.getElementById('landingGlobalCountryMix');
 const footholdCount=x=>Number(x?.official_foothold_features||x?.foothold_features||0);
 const seededParcels=x=>Number(x?.seeded_parcels||x?.seed_records||0);
 const seededBuildings=x=>Number(x?.seeded_buildings||0);
 const backlog=x=>!!x?.legal_backlog||!!x?.waiting_turn||seededParcels(x)>0||seededBuildings(x)>0;
 const countries=(d?.countries||[]).filter(x=>Number(x.active_canonical)>0||Number(x.building_footprints)>0||Number(x.addresses)>0||Number(x.roof_records)>0||footholdCount(x)>0||backlog(x)).sort((a,b)=>{
  const ar=backlog(a)?1:0,br=backlog(b)?1:0;
  const av=Number(a.active_canonical)+Number(a.building_footprints)+Number(a.addresses)+Number(a.roof_records)+footholdCount(a)+seededParcels(a)+seededBuildings(a);
  const bv=Number(b.active_canonical)+Number(b.building_footprints)+Number(b.addresses)+Number(b.roof_records)+footholdCount(b)+seededParcels(b)+seededBuildings(b);
  return bv-av||br-ar||String(a.country_code||'').localeCompare(String(b.country_code||''));
 });
 if(sub){
  const head=countries.slice(0,3).map(x=>countryName(x.country_code)+' '+fmt(x.active_canonical));
  if(countries.length>3)head.push('+'+(countries.length-3)+' more');
  if(Number(d?.materialized_global_boundaries)>=0)head.push(fmt(d.materialized_global_boundaries)+' boundaries');
  sub.textContent=head.join(' · ');
 }
 const list=document.getElementById('landingGlobalCountryDropdown');
 if(list){
  list.textContent='';
  for(const x of countries){
   const row=document.createElement('div'),name=document.createElement('span'),count=document.createElement('b'),meta=document.createElement('small');
   name.textContent=countryName(x.country_code)+' · '+String(x.country_code||'');
   const canon=Number(x.active_canonical||0),buildings=Number(x.building_footprints||0),addresses=Number(x.addresses||0),roofs=Number(x.roof_records||0),footholds=footholdCount(x),seedP=seededParcels(x),seedB=seededBuildings(x);
   count.textContent=canon>0?fmt(canon)+' canonical':seedP>0?fmt(seedP)+' seeded parcels':buildings>0?fmt(buildings)+' buildings':addresses>0?fmt(addresses)+' addresses':roofs>0?fmt(roofs)+' roofs':footholds>0?fmt(footholds)+' foothold features':String(x.display_status||'acquiring').toLowerCase();
   meta.textContent=[Number(x.materialized_boundary_rows||x.with_boundary||0)>0?fmt(x.materialized_boundary_rows||x.with_boundary)+' boundaries':'',seedP>0?fmt(seedP)+' seeded parcels':'',seedB>0?fmt(seedB)+' seeded buildings':'',buildings>0?fmt(buildings)+' buildings':'',addresses>0?fmt(addresses)+' addresses':'',roofs>0?fmt(roofs)+' roofs':'',footholds>0?fmt(footholds)+' official foothold features':'',x.waiting_turn?'waiting turn':'',canon===0&&footholds>0&&!x.waiting_turn?'parcels acquiring':''].filter(Boolean).join(' · ');
   row.append(name,count,meta);list.appendChild(row);
  }
  if(!countries.length){const row=document.createElement('div');row.textContent='International materialization starting…';list.appendChild(row)}
 }
 const g=document.getElementById('globalCountryTotal');
 if(g&&Number(d?.active_global_canonical)>=0)g.textContent=fmt(d.active_global_canonical);
 window.__BP_GLOBAL_PROPERTY_STATUS_V957__={...(d||{}),updatedAt:Date.now()};
}
function beforeLayer(map){
 for(const id of ['gta-opportunity-buildings','gta-bp-buildings','gta-exact-building','gta-context-buildings','bp-v5004-weather-points']){
  try{if(map.getLayer(id))return id}catch(_){}
 }
 return undefined;
}
function clearPublicParcelGeometry(map){
 if(!map)return;
 try{for(const id of [HIT,LINE,GLOW])if(map.getLayer(id))map.removeLayer(id)}catch(_){}
 try{if(map.getSource(SOURCE))map.removeSource(SOURCE)}catch(_){}
 state.lastData=EMPTY;state.lastKey='';
 window.__BP_GLOBAL_PARCEL_VIEW_V957__={count:0,hiddenOnPublicMap:true,statusAndSearchRemainAvailable:true,updatedAt:Date.now()};
}
function addLayers(map){
 if(!map)return;
 if(!PUBLIC_PARCEL_GEOMETRY){clearPublicParcelGeometry(map);return}
 try{
  if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:state.lastData||EMPTY});
  const before=beforeLayer(map);
  if(!map.getLayer(GLOW))map.addLayer({id:GLOW,type:'line',source:SOURCE,minzoom:7,paint:{
    'line-color':'#2cf3a3',
    'line-width':['interpolate',['linear'],['zoom'],7,1.5,10,2.4,14,4.2,18,6.2],
    'line-opacity':['interpolate',['linear'],['zoom'],7,.45,10,.58,14,.48,18,.4],
    'line-blur':['interpolate',['linear'],['zoom'],7,.5,12,1.1,18,1.8]
  }},before);
  if(!map.getLayer(LINE))map.addLayer({id:LINE,type:'line',source:SOURCE,minzoom:7,paint:{
    'line-color':'#b9ffe3',
    'line-width':['interpolate',['linear'],['zoom'],7,.38,10,.7,14,1.15,18,1.8],
    'line-opacity':.95
  }},before);
  if(!map.getLayer(HIT))map.addLayer({id:HIT,type:'line',source:SOURCE,minzoom:7,paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],7,7,14,12,18,16],'line-opacity':.001}},before);
 }catch(e){console.warn('BridgePoint global parcel layers',e)}
}
function bboxKey(map){
 const b=map?.getBounds?.(),z=map?.getZoom?.();
 if(!b||!Number.isFinite(z))return null;
 const w=b.getWest(),s=b.getSouth(),e=b.getEast(),n=b.getNorth();
 if(![w,s,e,n].every(Number.isFinite)||w>=e||s>=n)return null;
 return{w,s,e,n,z,key:[w,s,e,n].map(x=>x.toFixed(4)).join('|')+'|'+z.toFixed(2)}
}
async function refresh(force=false){
 const map=state.map||currentMap();if(!map)return null;state.map=map;addLayers(map);if(!PUBLIC_PARCEL_GEOMETRY)return EMPTY;
 const b=bboxKey(map);if(!b)return null;
 if(b.z<7){
  state.lastData=EMPTY;map.getSource(SOURCE)?.setData?.(EMPTY);state.lastKey='';return EMPTY
 }
 if(!force&&b.key===state.lastKey)return state.lastData;
 const seq=++state.seq;state.lastKey=b.key;
 try{
  const d=await rpc('bridgepoint_public_global_parcels_bbox_v957',{p_min_lng:b.w,p_min_lat:b.s,p_max_lng:b.e,p_max_lat:b.n,p_zoom:b.z,p_limit:BP_LIMIT()},5200);
  if(seq!==state.seq)return null;
  state.lastData=d?.type==='FeatureCollection'?d:EMPTY;
  addLayers(map);map.getSource(SOURCE)?.setData?.(state.lastData);
  window.__BP_GLOBAL_PARCEL_VIEW_V957__={count:Number(d?.count||0),possiblyTruncated:!!d?.possibly_truncated,zoom:b.z,bounds:[b.w,b.s,b.e,b.n],updatedAt:Date.now()};
  return state.lastData;
 }catch(e){
  if(seq===state.seq)console.warn('BridgePoint global parcel viewport',e);
  return null
 }
}
function BP_LIMIT(){return innerWidth<=760?700:1400}
function schedule(ms=220){clearTimeout(state.timer);state.timer=setTimeout(()=>{const m=state.map||currentMap();if(!m||m.isMoving?.())return schedule(250);void refresh(false)},ms)}
function bindRootPopup(map){
 if(!PUBLIC_PARCEL_GEOMETRY)return;
 if(map.__bpGlobalParcelPopup957)return;map.__bpGlobalParcelPopup957=true;
 map.on('mouseenter',HIT,()=>{try{map.getCanvas().style.cursor='pointer'}catch(_){}});
 map.on('mouseleave',HIT,()=>{try{map.getCanvas().style.cursor=''}catch(_){}});
 map.on('click',HIT,e=>{
  if(document.querySelector('.app-shell'))return;
  const f=e.features?.[0];if(!f)return;const p=f.properties||{};
  const wrap=document.createElement('div');wrap.style.cssText='min-width:220px;max-width:320px;font-family:Inter,system-ui,sans-serif;color:#071118';
  const k=document.createElement('div');k.style.cssText='font-size:9px;font-weight:900;letter-spacing:.08em;color:#397180';k.textContent='GLOBAL SOURCE PARCEL · '+countryName(p.country_code);
  const b=document.createElement('b');b.style.cssText='display:block;margin-top:4px;font-size:13px;line-height:1.25';b.textContent='Parcel '+String(p.parcel_number||p.source_record_id||'source record');
  const d=document.createElement('div');d.style.cssText='margin-top:6px;font-size:10px;line-height:1.4;color:#415661';d.textContent=[p.source_name,p.region_code,String(p.allowed_use_scope||'').replaceAll('_',' ')].filter(Boolean).join(' · ');
  const n=document.createElement('small');n.style.cssText='display:block;margin-top:6px;color:#607681';n.textContent=p.country_code==='MX'?'RAN social/agrarian parcel scope; not a complete private/urban cadastre.':'Source-backed parcel geometry; not a legal survey.';
  wrap.append(k,b,d,n);
  try{new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'340px'}).setLngLat(e.lngLat).setDOMContent(wrap).addTo(map)}catch(_){}
 });
}
function install(map){
 if(!map||map.__bpGlobalParcels957)return;map.__bpGlobalParcels957=true;state.map=map;
 const ready=()=>{addLayers(map);bindRootPopup(map);schedule(50)};
 if(map.isStyleLoaded?.())ready();else map.once?.('load',ready);
 map.on?.('moveend',()=>schedule(innerWidth<=760?420:180));
 map.on?.('zoomend',()=>schedule(innerWidth<=760?420:180));
 map.on?.('styledata',()=>{clearTimeout(map.__bpGlobalStyleTimer957);map.__bpGlobalStyleTimer957=setTimeout(()=>{if(map.isMoving?.())return;addLayers(map)},250)});
}
async function boot(){
 void status().catch(e=>console.warn('BridgePoint global status',e));
 clearInterval(state.statusTimer);state.statusTimer=setInterval(()=>void status().catch(()=>{}),60000);
 for(let i=0;i<100;i++){
  const m=currentMap();
  if(m){install(m);return}
  await new Promise(r=>setTimeout(r,120));
 }
}
window.__BP_GLOBAL_PROPERTY_V957__={version:1120,rpc,status,search,detail,refresh,publicParcelGeometry:false,get statusData(){return state.lastStatus},get viewport(){return state.lastData}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void boot(),{once:true});else void boot();
})();