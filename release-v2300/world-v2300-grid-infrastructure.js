const VERSION=5961;
const ROOT_ID='bp-grid-infrastructure-v5961';
const STYLE_ID='bp-grid-infrastructure-style-v5961';
const POWER_SOURCE='bp-grid-infrastructure-data-v5961';
const POWER_LINE='bp-grid-infrastructure-transmission-lines-v5961';
const TOWER_POINTS='bp-grid-infrastructure-fcc-points-v5961';
const VOLUME_LAYER='bp-grid-infrastructure-volume-v5961';
const THREE_URL='./vendor/three.module.js?v=169-local';
const POWER_URL='https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/US_Electric_Power_Transmission_Lines/FeatureServer/0';
// Archival ASR extract, last edited 2022-11-29. Do not present it as the current complete FCC registry.
const FCC_URL='https://services.arcgis.com/XG15cJAlne2vxtgt/ArcGIS/rest/services/NMSZ_HSIP2015_Layers_2018/FeatureServer/24';
const EMPTY={type:'FeatureCollection',features:[]};
const fmt=n=>Number(n||0).toLocaleString();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function initGridInfrastructure(target){
 const world=target?.map?target:{map:target},map=world?.map||target,container=map?.getContainer?.();
 if(!map||!container||typeof fetch!=='function')return null;
 if(window.__BP_GRID_INFRASTRUCTURE_V5961__?.map===map)return window.__BP_GRID_INFRASTRUCTURE_V5961__;
 if(!document.getElementById(STYLE_ID)){const st=document.createElement('style');st.id=STYLE_ID;st.textContent=CSS;document.head.appendChild(st)}
 const state={version:VERSION,map,available:true,powerEnabled:false,towersEnabled:false,sourceStatus:'OFF',powerCount:0,towerCount:0,updatedAt:null,volume:null};
 window.__BP_GRID_INFRASTRUCTURE_V5961__=state;
 let disposed=false,requestSeq=0,refreshTimer=null,threePromise=null,scene=null,renderer=null,volumeLayer=null;
 let powerFeatures=[],towerFeatures=[];
 const dock=document.createElement('section');dock.id=ROOT_ID;dock.setAttribute('aria-label','Transmission grid and registered antenna structures');
 dock.innerHTML='<div class="bpg-head"><div><b>GRID + ANTENNA INFRASTRUCTURE</b><small>Source-linked linework and registered structures</small></div><span class="bpg-badge">US GRID</span></div>'+
  '<label class="bpg-toggle"><input data-power type="checkbox"><span><b>POWER TRANSMISSION LINES</b><small>HIFLD/ArcGIS alignments; 3D cable sag is a schematic estimate when conductor details are absent.</small></span></label>'+
  '<label class="bpg-toggle"><input data-towers type="checkbox"><span><b>FCC REGISTERED ANTENNA STRUCTURES</b><small>Height-driven 3D mast models from an archival FCC ASR layer; not every cellular site is registered here.</small></span></label>'+
  '<div class="bpg-actions"><button data-refresh type="button">REFRESH VISIBLE AREA</button><button data-home type="button">TURN OFF</button></div>'+
  '<div class="bpg-status" data-status>Off · external sources are not queried until a layer is enabled.</div>'+
  '<div class="bpg-note">Power source: HIFLD / ArcGIS Living Atlas. FCC source: archived ASR extract (service data last edited 2022). OpenCellID global cell locations are not connected because an authorized export/API token is not configured. Modelled cable sag and untyped mast shapes are estimates, not engineering clearance or surveyed tower models.</div>';
 const q=s=>dock.querySelector(s),status=q('[data-status]'),powerToggle=q('[data-power]'),towerToggle=q('[data-towers]'),badge=q('.bpg-badge');
 function setStatus(t,error=false){status.textContent=t;status.dataset.error=error?'true':'false'}
 function mount(){
  const host=document.querySelector('#bpv-dock');
  const anchor=document.querySelector('#bpv-satellite-slot');
  if(host&&!dock.isConnected){if(anchor&&anchor.parentElement===host)host.insertBefore(dock,anchor);else host.appendChild(dock)}
 }
 function installMapLayers(){
  if(disposed||!map.isStyleLoaded?.())return false;
  try{
   if(!map.getSource(POWER_SOURCE))map.addSource(POWER_SOURCE,{type:'geojson',data:EMPTY,buffer:64,maxzoom:14});
   if(!map.getLayer(POWER_LINE))map.addLayer({id:POWER_LINE,type:'line',source:POWER_SOURCE,filter:['==',['get','bp_kind'],'powerline'],minzoom:3.2,paint:{
    'line-color':['case',['>=',['to-number',['get','VOLTAGE'],0],345],'#ffcc63',['>=',['to-number',['get','VOLTAGE'],0],230],'#ff7dd6','#6feaff'],
    'line-opacity':0.9,'line-width':['interpolate',['linear'],['zoom'],3.2,.55,5,.85,8,1.2,11,1.9,14,2.8,18,3.6]
   }});
   if(!map.getLayer(TOWER_POINTS))map.addLayer({id:TOWER_POINTS,type:'circle',source:POWER_SOURCE,filter:['==',['get','bp_kind'],'fcc_asr'],minzoom:4.5,paint:{
    'circle-radius':['interpolate',['linear'],['zoom'],4.5,1.8,7,2.7,10,4.2,14,6.5,18,8.2],
    'circle-color':'#c3a4ff','circle-opacity':.92,'circle-stroke-color':'#f2eaff','circle-stroke-width':.8
   }});
   setLayerVisibility();return true;
  }catch(e){console.warn('BridgePoint grid infrastructure layer setup',e);setStatus('Map layers are loading. They will retry when the map style is ready.',true);return false}
 }
 function setLayerVisibility(){
  try{if(map.getLayer(POWER_LINE))map.setLayoutProperty(POWER_LINE,'visibility',state.powerEnabled?'visible':'none')}catch(_){}
  try{if(map.getLayer(TOWER_POINTS))map.setLayoutProperty(TOWER_POINTS,'visibility',state.towersEnabled?'visible':'none')}catch(_){}
 }
 function bounds(){
  const b=map.getBounds();return{west:b.getWest(),south:Math.max(-84.9,b.getSouth()),east:b.getEast(),north:Math.min(84.9,b.getNorth())}
 }
 function queryUrl(base,b,fields,limit){
  const u=new URL(base+'/query');
  u.searchParams.set('where','1=1');u.searchParams.set('outFields',fields);
  u.searchParams.set('returnGeometry','true');u.searchParams.set('outSR','4326');
  u.searchParams.set('geometry',[b.west,b.south,b.east,b.north].join(','));
  u.searchParams.set('geometryType','esriGeometryEnvelope');u.searchParams.set('inSR','4326');
  u.searchParams.set('spatialRel','esriSpatialRelIntersects');u.searchParams.set('resultRecordCount',String(limit));
  u.searchParams.set('f','geojson');return u.toString();
 }
 async function fetchGeoJson(url,timeout=16000){
  const r=await fetch(url,{headers:{Accept:'application/geo+json, application/json'},cache:'no-store',signal:AbortSignal.timeout(timeout)});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const j=await r.json();if(j?.error)throw new Error(j.error.message||'ArcGIS query error');
  if(j?.type!=='FeatureCollection'||!Array.isArray(j.features))throw new Error('Expected a GeoJSON FeatureCollection');
  return j;
 }
 function validBBox(b){
  const width=b.east-b.west,height=b.north-b.south;
  return Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0&&width<150&&height<100;
 }
 function featureKey(f,kind,i){
  const p=f?.properties||{};return String(kind==='powerline'?(p.ID??p.OBJECTID??i):(p.REGNUM??p.OBJECTID??i));
 }
 function tagFeature(f,kind,i){
  if(!f?.geometry||!['LineString','MultiLineString','Point'].includes(f.geometry.type))return null;
  const p={...(f.properties||{}),bp_kind:kind,bp_source_id:featureKey(f,kind,i)};
  return{type:'Feature',id:f.id??p.bp_source_id,geometry:f.geometry,properties:p};
 }
 function toPointLines(g){
  if(!g)return[];
  if(g.type==='LineString')return[g.coordinates||[]];
  if(g.type==='MultiLineString')return g.coordinates||[];
  if(g.type==='GeometryCollection')return(g.geometries||[]).flatMap(toPointLines);
  return[];
 }
 function distMeters(a,b){
  const lat=(Number(a[1])+Number(b[1]))*.5*Math.PI/180;
  const dx=(Number(b[0])-Number(a[0]))*111320*Math.cos(lat),dy=(Number(b[1])-Number(a[1]))*110540;
  return Math.hypot(dx,dy);
 }
 function interpCoord(a,b,t){return[Number(a[0])+(Number(b[0])-Number(a[0]))*t,Number(a[1])+(Number(b[1])-Number(a[1]))*t]}
 // Insert schematic support intervals along HIFLD geometry; the source does not contain surveyed pylon positions.
 function resampleRoute(coords,step){
  if(!Array.isArray(coords)||coords.length<2)return[];
  const out=[[Number(coords[0][0]),Number(coords[0][1])]];
  let distanceToNext=step;
  for(let i=1;i<coords.length;i++){
   const a=coords[i-1],b=coords[i],len=distMeters(a,b);if(!Number.isFinite(len)||len<=0)continue;
   let used=0;
   while(len-used>=distanceToNext){
    used+=distanceToNext;out.push(interpCoord(a,b,used/len));distanceToNext=step;
    if(out.length>500)return out;
   }
   distanceToNext-=len-used;if(distanceToNext<=.01)distanceToNext=step;
  }
  const last=coords[coords.length-1];if(distMeters(out[out.length-1],last)>2)out.push([Number(last[0]),Number(last[1])]);
  return out;
 }
 function voltageProfile(p){
  const kv=Number(p?.VOLTAGE),txt=String(p?.VOLT_CLASS||'');
  const voltage=Number.isFinite(kv)&&kv>0&&kv<1000?kv:(/500|765/.test(txt)?500:/345/.test(txt)?345:/230/.test(txt)?230:/161/.test(txt)?161:115);
  return{kv:Number.isFinite(kv)&&kv>0?kv:null,height:voltage>=500?47:voltage>=345?39:voltage>=230?32:voltage>=161?27:22,sag:voltage>=500?12:voltage>=345?9:voltage>=230?7:5,span:voltage>=500?450:voltage>=230?360:280};
 }
 function loadThree(){
  if(!threePromise)threePromise=import(THREE_URL).then(m=>m.default||m).catch(e=>{threePromise=null;throw e});
  return threePromise;
 }
 function mercatorPosition(THREE,coord,altitude){
  const MC=window.maplibregl?.MercatorCoordinate||window.MapLibreGL?.MercatorCoordinate;if(!MC?.fromLngLat)return null;
  const lng=Number(coord?.[0]),lat=Number(coord?.[1]);if(!Number.isFinite(lng)||!Number.isFinite(lat)||Math.abs(lat)>85.0511)return null;
  let ground=0;try{const h=Number(map.queryTerrainElevation?.({lng,lat}));if(Number.isFinite(h))ground=h}catch(_){}
  const mc=MC.fromLngLat({lng,lat},ground+altitude);return new THREE.Vector3(mc.x,mc.y,mc.z);
 }
 function catenaryDrop(t,length,sag){
  const safeLength=Math.max(length,1),safeSag=clamp(sag,.5,Math.max(1,safeLength*.08)),a=safeLength*safeLength/(8*safeSag),x=(t-.5)*safeLength;
  return a*(Math.cosh(x/a)-Math.cosh((safeLength*.5)/a));
 }
 function disposeScene(){
  if(!scene)return;
  for(const o of [...scene.children]){scene.remove(o);try{o.geometry?.dispose?.()}catch(_){}for(const m of(Array.isArray(o.material)?o.material:[o.material]))try{m?.dispose?.()}catch(_){}}
 }
 function ensureVolumeLayer(THREE){
  if(map.getLayer(VOLUME_LAYER)&&scene)return true;
  const layer={id:VOLUME_LAYER,type:'custom',renderingMode:'3d',
   onAdd:(m,gl)=>{const r=new THREE.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:false,alpha:true});r.autoClear=false;renderer=r;scene=new THREE.Scene();layer.camera=new THREE.Camera();layer.renderer=r;layer.scene=scene},
   render:(gl,args)=>{if(!layer.renderer||!layer.scene||!layer.camera)return;const mx=args?.defaultProjectionData?.mainMatrix||args?.modelViewProjectionMatrix||args;if(!mx||typeof mx.length!=='number'||mx.length<16)return;layer.camera.projectionMatrix.fromArray(mx);try{layer.renderer.resetState?.();if(layer.renderer.state?.reset)layer.renderer.state.reset()}catch(_){}layer.renderer.render(layer.scene,layer.camera)},
   onRemove:()=>{disposeScene();try{layer.renderer?.dispose?.()}catch(_){}scene=null;renderer=null;layer.scene=null;layer.renderer=null;layer.camera=null;volumeLayer=null}
  };
  try{map.addLayer(layer);volumeLayer=layer;return!!scene}catch(e){console.warn('BridgePoint grid 3D layer',e);return false}
 }
 function makeCatenaryMesh(THREE,feature){
  const prof=voltageProfile(feature.properties||{}),objects=[];
  for(const raw of toPointLines(feature.geometry)){
   const coords=resampleRoute(raw,prof.span);if(coords.length<2)continue;
   const points=[];
   for(let i=1;i<coords.length;i++){
    const a=coords[i-1],b=coords[i],length=distMeters(a,b);if(length<30||length>prof.span*2.5)continue;
    for(let j=0;j<8;j++){
     const t=j/8,c=interpCoord(a,b,t),drop=catenaryDrop(t,length,prof.sag),pos=mercatorPosition(THREE,c,prof.height+drop);
     if(pos)points.push(pos);
    }
   }
   const end=coords[coords.length-1],endPos=mercatorPosition(THREE,end,prof.height);if(endPos)points.push(endPos);
   if(points.length<2)continue;
   const MC=window.maplibregl?.MercatorCoordinate||window.MapLibreGL?.MercatorCoordinate,mcu=MC?.fromLngLat?MC.fromLngLat({lng:Number(coords[0][0]),lat:Number(coords[0][1])},0).meterInMercatorCoordinateUnits():0;
   const radius=Math.max(1e-9,mcu*.12),curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
   const geom=new THREE.TubeGeometry(curve,Math.min(320,Math.max(20,points.length*2)),radius,5,false);
   const wire=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({color:0x70efff,transparent:true,opacity:.94,depthTest:false,depthWrite:false}));
   wire.renderOrder=920;objects.push(wire);break;
  }
  return objects;
 }
 function makeTowerMesh(THREE,feature){
  const p=feature.properties||{},g=feature.geometry;if(g?.type!=='Point'||!Array.isArray(g.coordinates))return[];
  const h=Number(p.STRUCHT),measured=Number.isFinite(h)&&h>0&&h<=700,height=measured?h:30;
  const base=mercatorPosition(THREE,g.coordinates,0),top=mercatorPosition(THREE,g.coordinates,height);if(!base||!top)return[];
  const MC=window.maplibregl?.MercatorCoordinate||window.MapLibreGL?.MercatorCoordinate,mcu=MC?.fromLngLat?MC.fromLngLat({lng:Number(g.coordinates[0]),lat:Number(g.coordinates[1])},0).meterInMercatorCoordinateUnits():0;
  if(!mcu)return[];const geom=new THREE.CylinderGeometry(mcu*.14,mcu*.5,top.z-base.z,5,1,false),mesh=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({color:measured?0xb59aff:0xf6bc66,transparent:true,opacity:.95,depthTest:false,depthWrite:false}));
  mesh.position.set(base.x,base.y,(base.z+top.z)*.5);mesh.renderOrder=930;return[mesh];
 }
 async function refreshVolume(mySeq){
  if(disposed||!(state.powerEnabled||state.towersEnabled)||Number(map.getZoom?.()||0)<8)return;
  try{
   const THREE=await loadThree();if(disposed||mySeq!==requestSeq||!(state.powerEnabled||state.towersEnabled))return;
   if(!ensureVolumeLayer(THREE))throw new Error('3D layer not ready');disposeScene();
   if(state.powerEnabled)for(const f of powerFeatures.slice(0,70))for(const o of makeCatenaryMesh(THREE,f)){scene.add(o)}
   let measured=0,estimated=0;
   if(state.towersEnabled)for(const f of towerFeatures.slice(0,160)){
    for(const o of makeTowerMesh(THREE,f))scene.add(o);
    const n=Number(f?.properties?.STRUCHT);if(Number.isFinite(n)&&n>0&&n<=700)measured++;else estimated++;
   }
   state.volume={routesShown:state.powerEnabled?Math.min(70,powerFeatures.length):0,towersShown:state.towersEnabled?Math.min(160,towerFeatures.length):0,measuredTowerHeights:measured,estimatedTowerHeights:estimated,at:Date.now()};
   try{map.triggerRepaint?.()}catch(_){}
  }catch(e){console.warn('BridgePoint 3D grid infrastructure',e);setStatus('2D features are available; 3D assets will retry when the view settles.',true)}
 }
 function clearScene(){disposeScene();try{if(map.getLayer(VOLUME_LAYER))map.removeLayer(VOLUME_LAYER)}catch(_){}try{renderer?.dispose?.()}catch(_){}scene=null;renderer=null;volumeLayer=null;state.volume=null}
 async function refresh(force=false){
  if(disposed)return null;
  const zoom=Number(map.getZoom?.()||0),b=bounds(),seq=++requestSeq;
  if(!state.powerEnabled&&!state.towersEnabled){setStatus('Off · external sources are not queried until a layer is enabled.');clearScene();return null}
  if(zoom<3.2||!validBBox(b)){setStatus('Zoom into North America to query the US transmission grid; global view is kept lightweight.');map.getSource(POWER_SOURCE)?.setData?.(EMPTY);powerFeatures=[];towerFeatures=[];clearScene();return null}
  setStatus('Querying source-backed features for the visible area…');
  const tasks=[];
  if(state.powerEnabled)tasks.push(fetchGeoJson(queryUrl(POWER_URL,b,'OBJECTID,ID,TYPE,STATUS,VOLTAGE,VOLT_CLASS,OWNER,SOURCEDATE,VAL_DATE',500),18000).then(d=>({kind:'powerline',data:d})));
  if(state.towersEnabled)tasks.push(fetchGeoJson(queryUrl(FCC_URL,b,'OBJECTID,REGNUM,ENTITY,STRUCHT,DESCRIPT,STRUCADD,STRUCCITY,STRUCSTATE,ISSUEDATE',300),18000).then(d=>({kind:'fcc_asr',data:d})));
  try{
   const results=await Promise.allSettled(tasks);if(disposed||seq!==requestSeq)return null;
   const all=[];let powerError='',towerError='',limited=false;
   for(const result of results){
    if(result.status!=='fulfilled'){if(state.powerEnabled&&!powerFeatures.length)powerError=String(result.reason?.message||result.reason);else towerError=String(result.reason?.message||result.reason);continue}
    const {kind,data}=result.value;if(data.properties?.exceededTransferLimit)limited=true;
    const fs=data.features.map((f,i)=>tagFeature(f,kind,i)).filter(Boolean);
    if(kind==='powerline'){powerFeatures=fs;state.powerCount=fs.length;all.push(...fs)}
    else{towerFeatures=fs;state.towerCount=fs.length;all.push(...fs)}
   }
   const source=map.getSource(POWER_SOURCE);if(!source)throw new Error('GeoJSON source not installed');source.setData({type:'FeatureCollection',features:all});
   installMapLayers();state.updatedAt=Date.now();state.sourceStatus='READY';
   const notes=[];if(state.powerEnabled)notes.push('transmission lines '+fmt(state.powerCount));if(state.towersEnabled)notes.push('FCC ASR structures '+fmt(state.towerCount));
   if(limited)notes.push('server-limited sample; pan/zoom for more');if(powerError)notes.push('power source error: '+powerError);if(towerError)notes.push('FCC source error: '+towerError);
   setStatus(notes.join(' · ')+' · refreshed '+new Date(state.updatedAt).toLocaleTimeString());
   badge.textContent=limited?'VIEWPORT SAMPLE':'SOURCE LINKED';
   await refreshVolume(seq);return{power:state.powerCount,towers:state.towerCount,limited,updatedAt:state.updatedAt};
  }catch(e){if(seq===requestSeq){setStatus('Source query failed: '+String(e?.message||e),true);console.warn('BridgePoint source-backed grid infrastructure',e)}return null}
 }
 function scheduleRefresh(force=false){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>void refresh(force),force?50:650)}
 function onStyle(){installMapLayers();scheduleRefresh(true)}
 function onMove(){setLayerVisibility();scheduleRefresh(false)}
 powerToggle.addEventListener('change',()=>{state.powerEnabled=powerToggle.checked;setLayerVisibility();scheduleRefresh(true)});
 towerToggle.addEventListener('change',()=>{state.towersEnabled=towerToggle.checked;setLayerVisibility();scheduleRefresh(true)});
 q('[data-refresh]').addEventListener('click',()=>scheduleRefresh(true));
 q('[data-home]').addEventListener('click',()=>{state.powerEnabled=false;state.towersEnabled=false;powerToggle.checked=false;towerToggle.checked=false;setLayerVisibility();clearScene();scheduleRefresh(true)});
 map.on('style.load',onStyle);map.on('moveend',onMove);map.on('zoomend',onMove);
 installMapLayers();mount();
 state.openPower=()=>{state.powerEnabled=true;powerToggle.checked=true;setLayerVisibility();scheduleRefresh(true);return state};
 state.openTowers=()=>{state.towersEnabled=true;towerToggle.checked=true;setLayerVisibility();scheduleRefresh(true);return state};
 state.refresh=refresh;
 state.destroy=()=>{disposed=true;clearTimeout(refreshTimer);map.off('style.load',onStyle);map.off('moveend',onMove);map.off('zoomend',onMove);clearScene();try{if(map.getLayer(TOWER_POINTS))map.removeLayer(TOWER_POINTS);if(map.getLayer(POWER_LINE))map.removeLayer(POWER_LINE);if(map.getSource(POWER_SOURCE))map.removeSource(POWER_SOURCE)}catch(_){}dock.remove();state.available=false};
 return state;
}

const CSS=[
 '#'+ROOT_ID+'{margin:7px 0 0;padding:10px;border:1px solid rgba(126,205,255,.26);border-radius:12px;background:linear-gradient(145deg,rgba(7,22,34,.96),rgba(17,17,44,.96));box-shadow:0 7px 21px rgba(0,0,0,.18);color:#e9f8ff;font:11px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;box-sizing:border-box;width:100%;max-width:100%;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}',
 '#'+ROOT_ID+' *{box-sizing:border-box}',
 '#'+ROOT_ID+' .bpg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}',
 '#'+ROOT_ID+' .bpg-head b{display:block;font-size:10px;font-weight:950;letter-spacing:.08em}',
 '#'+ROOT_ID+' .bpg-head small{display:block;margin-top:3px;color:#99bacb;font-size:9px}',
 '#'+ROOT_ID+' .bpg-badge{white-space:nowrap;border:1px solid rgba(117,225,255,.28);border-radius:20px;padding:3px 7px;color:#93f2ff;font-size:8px;font-weight:900}',
 '#'+ROOT_ID+' .bpg-toggle{display:flex;gap:8px;padding:9px 1px;border-top:1px solid rgba(160,215,240,.12);cursor:pointer;align-items:flex-start}',
 '#'+ROOT_ID+' .bpg-toggle input{accent-color:#69ebff;margin:2px 0 0;flex:0 0 auto}',
 '#'+ROOT_ID+' .bpg-toggle b{display:block;font-size:9px;letter-spacing:.035em;color:#eafaff}',
 '#'+ROOT_ID+' .bpg-toggle small{display:block;margin-top:3px;font-size:9px;line-height:1.4;color:#9ab9c8}',
 '#'+ROOT_ID+' .bpg-actions{display:flex;gap:6px}',
 '#'+ROOT_ID+' button{border:1px solid rgba(105,226,255,.27);border-radius:7px;padding:7px 8px;background:rgba(13,54,72,.86);color:#e4fbff;font:900 8px/1.15 system-ui,sans-serif;cursor:pointer}',
 '#'+ROOT_ID+' .bpg-status{margin-top:7px;color:#9eeeff;font-size:9px;line-height:1.4;overflow-wrap:anywhere}',
 '#'+ROOT_ID+' .bpg-status[data-error=true]{color:#ffd3ac}',
 '#'+ROOT_ID+' .bpg-note{margin:6px 0 0;color:#86a8b8;font-size:8px;line-height:1.4}'
].join('');
