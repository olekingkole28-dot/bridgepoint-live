(()=>{
'use strict';
if(window.__BP_DRONE_AWARENESS_V1__)return;
const VERSION=4;
const SOURCE='bp-drone-awareness-live-source-v4';
const LAYER='bp-drone-awareness-live-dots-v4';
const TRAIL_SOURCE='bp-drone-awareness-trail-source-v4';
const TRAIL_GLOW='bp-drone-awareness-trail-glow-v4';
const TRAIL_LAYER='bp-drone-awareness-trail-lines-v4';
const TRAIL_DOT_SOURCE='bp-drone-awareness-trail-dots-source-v4';
const TRAIL_DOT_LAYER='bp-drone-awareness-trail-dots-v4';
const DRONE_3D_LAYER='bp-drone-awareness-3d-models-v4';
const CLUSTER_LAYER='bp-drone-awareness-clusters-v4';
const CLUSTER_COUNT_LAYER='bp-drone-awareness-cluster-counts-v4';
const THREE_URL='./vendor/three.module.js?v=169-local';
const MAX_TRACKED_DRONES=1200;
const MAX_CLOSE_ZOOM_MODELS=120;
const MAX_TRAIL_POINTS=24;
const TRACK_RETENTION_MS=45*60*1000;
const REFRESH_MS=180000;
const REQUEST_TIMEOUT_MS=9000;
const SUPPORTED_SOURCE='https://api.adsb.lol/v2/';
const REGION_RADIUS_NM=250;
const SAMPLE_CACHE_MS=150000;
const WORLD_CIRCUMFERENCE_M=40075016.686;const $=s=>document.querySelector(s);
const emptyFeatureCollection=()=>({type:'FeatureCollection',features:[]});
let map=null,enabled=false,inFlight=false,refreshTimer=0,moveTimer=0,lastFetchAt=0,aborter=null;
let activationQueued=false,activationPromise=null,activationGeneration=0,styleRetryCleanup=null;
let button=null,waterButton=null,waterApi=null,waterPromise=null,waterEnabled=false,pane=null,statusNode=null,summaryNode=null,refreshButton=null;
let trailNoteNode=null,drone3DError=null;
let droneThreePromise=null,droneThree=null,droneScene=null,droneRenderer=null,droneLayer=null,droneTemplate=null;
let droneModels=new Map(),trackedUavs=new Map(),lastCurrentRecords=[];
let droneTrailGroup=null;
let droneAnimationFrame=0,lastDroneAnimationAt=0;
let diagnosticState={sourceStatus:'idle',hasSuccessfulSource:false,regionalRequestsAttempted:0,regionalRequestsCompleted:0,regionalCacheHits:0,aircraftRecordsReceived:0,uavRecordsIdentified:0,invalidOrStaleRecords:0,currentPositionsAccepted:0,modelsRendered:0,historicalTrailPoints:0,trailsRendered:0,regionalResults:[],localSample:null};
let regionalStatusNode=null;
const sampleCache=new Map();
let emptyModeActive=true,emptyModeMap=null,emptyModeHandler=null,sweepFrame=0;const requestControllers=new Set();
const baseLayers=new Set([
 'gta-bg','gta-water','gta-coast-shadow','gta-coast-edge','gta-coast-foam','gta-landcover','gta-landuse','gta-hillshade',
 'gta-context-building-footprints','gta-context-building-shadow','gta-context-buildings','gta-context-floor-lines','gta-context-roofs','gta-context-facade-detail','gta-context-building-parts',
 'gta-bp-building-shadow','gta-bp-buildings','gta-bp-floor-lines','gta-bp-roofs','gta-bp-facade-detail','gta-bp-building-edge',
 'gta-city-buildings','gta-city-floor-lines','gta-city-building-roof-caps','gta-city-roofs','gta-exact-building','gta-exact-roof','gta-exact-floor-lines',
]);
const parcelLayers=new Set(['gta-parcel','gta-parcel-glow','gta-parcel-halo','bp-public-auto-parcel-glow-v5933','bp-public-auto-parcel-line-v5933']);
let parcelLayerEnabled=false;
const allowedCategories=new Set(['clouds']);
const categoryPatterns={
 parcels:/parcel|cadastral|boundary-viewer/i,
 buildings:/^gta-(?:context-building-footprints|context-building-shadow|context-buildings|context-floor-lines|context-roofs|context-facade-detail|context-building-parts|bp-building-shadow|bp-buildings|bp-floor-lines|bp-roofs|bp-facade-detail|bp-building-edge|city-buildings|city-floor-lines|city-building-roof-caps|city-roofs|exact-building|exact-roof|exact-floor-lines)$/i,
 imagery:/gta-(nasa|esri|usgs|oam)|satellite|spectral-imagery|aerial-imagery/i,
 weather:/weather|\bwx\b|wx-|radar|cloud|rain|lightning|storm|cyclone|tornado|hurricane|wildfire|fire-perimeter|precipitation|present-weather/i,
 wind:/wind|volumetric|\brf\b|signal-field|rf-field/i,
 history:/history|world-change|timeline|time-slider/i,
 opportunities:/opportunity/i,
 listings:/listing/i,
 transport:/road-|bridge(?:3d|-)|rail|transportation|transport-mesh/i,
 water:/bp-water-surface|water-surface|waterway-flow|hydrology/i,
 clouds:/cloud-volume|sky-cloud|satellite-cloud|eumetsat-cloud/i
};
// Only manage explicitly recognized optional overlays. Unknown style layers may be
// essential basemap/background/terrain layers, so they must not be blanket-hidden.
const OPTIONAL_OVERLAY_PATTERNS=[
 ...Object.values(categoryPatterns),
 /\b(?:dot|dots|marker|markers|cluster|clusters|heatmap|hotspot|hotspots)\b/i,
 /landmark|poi|tree|streetlight|transit|infra-points|fire|bridge3d/i
];
function isManagedOptionalOverlay(id){
 const value=String(id||'');
 return parcelLayers.has(value)||OPTIONAL_OVERLAY_PATTERNS.some(pattern=>pattern.test(value));
}
function layerAllowed(id){
 if(parcelLayers.has(String(id)))return parcelLayerEnabled;
 if(baseLayers.has(id)||String(id).startsWith('bp-drone-awareness')||String(id).startsWith('bp-drone-sim-fleet'))return true;
 for(const category of allowedCategories)if(categoryPatterns[category]?.test(String(id)))return true;
 return false;
}
function ensureInitialBaseLayers(){
 // Do not force every whitelisted building sub-layer on: the shared renderer owns
 // building LOD visibility. This gate only hides optional overlays outside the
 // allowlist and leaves the renderer's intended base-layer state untouched.
}
function categoryForTarget(target){
 if(!target)return null;
 const action=String(target.dataset?.bpvAction||'');
 if(action==='boundaryviewer')return null;
 // Opening the fields panel is not itself a layer activation; the panel's own
 // Wind / RF / Drone controls opt their category in only when pressed.
 if(action==='volumetric')return null;
 const actionMap={parcels:'parcels',boundaryviewer:'parcels',worldchanges:'history',weatherfx:'weather',windfx:'wind',volumetric:'wind',satellite:'imagery',opportunities:'opportunities',listings:'listings',water:'water'};
 if(actionMap[action])return actionMap[action];
 if(target.dataset?.layer==='parcels')return'parcels';
 if(target.dataset?.layer==='buildings')return'buildings';
 if(target.dataset?.base==='satellite')return'imagery';
 if(target.id==='toggleLiveContext')return'weather';
 if(target.id==='toggleTransport')return'transport';
 const label=[target.textContent,target.title,target.getAttribute?.('aria-label')].filter(Boolean).join(' ').toLowerCase();
 if(/parcel|boundary|cadastral|lot line/.test(label))return'parcels';
 if(/satellite|aerial|imagery|land color/.test(label))return'imagery';
 if(/building|roof|\b3d\b/.test(label))return'buildings';
 if(/weather|cloud|rain|lightning|storm|radar|hurricane|tornado|wildfire|\bwx\b/.test(label))return'weather';
 if(/wind|\brf\b|signal|volumetric/.test(label))return'wind';
 if(/history|changes|timeline/.test(label))return'history';
 if(/opportunit/.test(label))return'opportunities';
 if(/road|rail|bridge|transport/.test(label))return'transport';
 return null;
}
function worldMap(){
 return window.__BP_LANDING_WORLD__?.map
  ||window.__bpLandingWorldV5420?.map
  ||window.__BP_V5000_WORLD__?.map
  ||window.__BP_V5000_WORLD?.map
  ||window.__bpWorldV2300?.map
  ||window.__BP_WORLD_V2300__?.map
  ||null;
}
function addStyle(){
 if($('#bp-drone-awareness-styles-v1'))return;
 const s=document.createElement('style');s.id='bp-drone-awareness-styles-v1';
 s.textContent='.bp-drone-pane{display:grid;gap:10px;color:#dff7ff}.bp-drone-headline{font-size:11px;font-weight:950;letter-spacing:.09em;color:#77eaff}.bp-drone-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.bp-drone-metric{border:1px solid rgba(107,218,255,.2);background:rgba(5,20,30,.8);border-radius:10px;padding:10px;min-width:0}.bp-drone-metric b{display:block;font-size:20px;color:#70efff}.bp-drone-metric span{display:block;font-size:9px;color:#92b8c7;line-height:1.4}.bp-drone-status{padding:10px;border:1px solid rgba(122,221,255,.2);border-radius:10px;background:rgba(3,16,25,.9);font-size:11px;line-height:1.5;overflow-wrap:anywhere}.bp-drone-status[data-kind=\"error\"]{border-color:rgba(255,165,100,.5);color:#ffd8bc}.bp-drone-status[data-kind=\"ok\"]{border-color:rgba(105,245,185,.35)}.bp-drone-actions{display:flex;flex-wrap:wrap;gap:7px}.bp-drone-actions button{flex:1 1 140px;min-width:0}.bp-drone-feed-note{font-size:10px;line-height:1.5;color:#98b6c4}.bp-drone-source{color:#7ce9ff;overflow-wrap:anywhere}.bpv-mapkey-swatch-drone{background:linear-gradient(90deg,#58cfff,#35e8f4,#62efad,#ffd166,#ff9f68)!important}.bpv-mapkey-swatch-clouds{background:linear-gradient(180deg,#ffffff,#b8c9d4)!important}.bp-drone-cells{display:grid;gap:5px}.bp-drone-cell-row{display:flex;justify-content:space-between;align-items:center;gap:9px;padding:8px 10px;background:rgba(7,29,42,.85);border:1px solid rgba(107,218,255,.16);border-radius:8px;font-size:10px}.bp-drone-cell-row b{color:#d9fbff}.bp-drone-cell-row span{color:#79eaff;white-space:nowrap}.bp-drone-footnote{font-size:9px;line-height:1.5;color:#86a7b7}';
 document.head.appendChild(s);
}
function element(tag,cls,text){
 const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;
}
function showStatus(message,kind='info'){
 if(!statusNode)return;statusNode.textContent=String(message);statusNode.dataset.kind=kind;
}
function setLabelTextIfChanged(node,value){
 if(!node)return;
 const next=String(value??'');
 if(node.textContent!==next)node.textContent=next;
}
function updateButton(){
 if(!button)return;
 button.classList.toggle('active',enabled);
 button.setAttribute('aria-pressed',String(enabled));
 const label=button.querySelector('.bpv-command-label');
 setLabelTextIfChanged(label,enabled?'Drone Awareness · ON':'Drone Awareness');
 button.title=enabled?'Hide public UAV positions, 3D models and observed trails':'Show public UAV positions, 3D models and observed trails';
}
function writeSummary(){
 const liveReady=diagnosticState.hasSuccessfulSource;
 const metrics=[['Regional requests attempted',diagnosticState.regionalRequestsAttempted],['Requests successfully completed',diagnosticState.regionalRequestsCompleted],['Cached regional responses',diagnosticState.regionalCacheHits],['Aircraft records received',liveReady?diagnosticState.aircraftRecordsReceived:'—'],['Records identified as UAVs',liveReady?diagnosticState.uavRecordsIdentified:'—'],['Invalid or stale records rejected',liveReady?diagnosticState.invalidOrStaleRecords:'—'],['Current UAV positions accepted',liveReady?diagnosticState.currentPositionsAccepted:'—'],['3D quadcopter models rendered',liveReady?diagnosticState.modelsRendered:'—'],['Historical trail points retained',liveReady?diagnosticState.historicalTrailPoints:'—'],['3D trail segments rendered',liveReady?diagnosticState.trailsRendered:'—']];
 if(summaryNode){summaryNode.replaceChildren();for(const [label,value] of metrics){const item=element('div','bp-drone-metric');item.append(element('b','',typeof value==='number'?value.toLocaleString():value),element('span','',label));summaryNode.append(item)}}
 if(regionalStatusNode){
  regionalStatusNode.replaceChildren();
  for(const result of diagnosticState.regionalResults){const row=element('div','bp-drone-cell-row');row.append(element('b','',result.sample.id));const detail=result.status==='pending'?'PENDING':result.cached?'CACHED · '+result.records.length+' aircraft':result.ok?'OK · '+result.records.length+' aircraft':'FAILED · '+String(result.error||'Unknown request error');const value=element('span','',detail);value.title=result.error||result.requestUrl||'';row.append(value);regionalStatusNode.append(row)}
  if(diagnosticState.localSample){const result=diagnosticState.localSample,row=element('div','bp-drone-cell-row');row.append(element('b','','Local map-view sample'));const detail=result.status==='pending'?'PENDING':result.cached?'CACHED · '+result.records.length+' aircraft':result.ok?'OK · '+result.records.length+' aircraft':'FAILED · '+String(result.error||'Unknown request error');const value=element('span','',detail);value.title=result.error||result.requestUrl||'';row.append(value);regionalStatusNode.append(row)}
 }
}
function setLayerVisibility(on){
 if(!map)return false;try{const ids=[CLUSTER_LAYER,CLUSTER_COUNT_LAYER,LAYER,TRAIL_DOT_LAYER];for(const id of ids)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none');map.triggerRepaint?.();return!!map.getLayer(LAYER)}catch(error){showStatus('Drone Awareness visibility error: '+String(error?.message||error),'error');return false}
}
function mapStyleReady(){if(!map)return false;try{return!!map.getStyle?.()&&(typeof map.isStyleLoaded!=='function'||map.isStyleLoaded()===true)}catch(_){return false}}
function bindMapStyleRetry(mapRef,isReady,onReady){
 if(!mapRef||typeof mapRef.on!=='function')return()=>{};
 const check=()=>{let ready=false;try{ready=!!isReady()}catch(_){}if(ready)onReady()};
 for(const event of ['load','style.load','idle'])mapRef.on(event,check);check();
 return()=>{for(const event of ['load','style.load','idle'])try{mapRef.off?.(event,check)}catch(_){}};
}
function installLayer(){
 if(!mapStyleReady())return false;
 try{
  if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:emptyFeatureCollection(),cluster:true,clusterMaxZoom:7,clusterRadius:48});
  if(!map.getSource(TRAIL_DOT_SOURCE))map.addSource(TRAIL_DOT_SOURCE,{type:'geojson',data:emptyFeatureCollection()});
  if(!map.getLayer(CLUSTER_LAYER))map.addLayer({id:CLUSTER_LAYER,type:'circle',source:SOURCE,filter:['has','point_count'],minzoom:0,layout:{visibility:'none'},paint:{'circle-color':['step',['get','point_count'],'#24d8f2',10,'#f7c85d',50,'#ff966f',200,'#ff6e79'],'circle-radius':['step',['get','point_count'],10,10,14,50,19,200,25],'circle-opacity':.94,'circle-stroke-color':'#09202a','circle-stroke-width':1.5}});
  if(!map.getLayer(CLUSTER_COUNT_LAYER))map.addLayer({id:CLUSTER_COUNT_LAYER,type:'symbol',source:SOURCE,filter:['has','point_count'],minzoom:0,layout:{visibility:'none','text-field':['get','point_count_abbreviated'],'text-font':['Open Sans Bold','Arial Unicode MS Bold'],'text-size':11},paint:{'text-color':'#06202a','text-halo-color':'#ffffff','text-halo-width':.6}});
  if(!map.getLayer(TRAIL_DOT_LAYER))map.addLayer({id:TRAIL_DOT_LAYER,type:'circle',source:TRAIL_DOT_SOURCE,minzoom:0,layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,2.2,5,3.1,12,4.1],'circle-color':'#48dfff','circle-opacity':.86,'circle-stroke-color':'#07212c','circle-stroke-width':1.1}});
  if(!map.getLayer(LAYER))map.addLayer({id:LAYER,type:'circle',source:SOURCE,filter:['!',['has','point_count']],minzoom:0,layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,4.1,3,5,8,6.3,14,8.2],'circle-color':'#f1ffff','circle-opacity':1,'circle-stroke-color':'#19dff5','circle-stroke-width':2.4,'circle-blur':0}});
  return true;
 }catch(error){showStatus('Drone Awareness MapLibre layer initialization failed: '+String(error?.message||error),'error');console.error('Drone position layers failed',error);return false}
}
function loadDroneThree(){
 if(!droneThreePromise)droneThreePromise=import(THREE_URL).then(m=>m.default||m).catch(e=>{droneThreePromise=null;throw e});
 return droneThreePromise;
}
function makeDroneModel(THREE){
 const group=new THREE.Group();group.name='BridgePoint schematic quadcopter';
 const dark=new THREE.MeshStandardMaterial({color:0x172b36,metalness:.72,roughness:.27});
 const edge=new THREE.MeshStandardMaterial({color:0x73ecff,metalness:.36,roughness:.2,emissive:0x0b5967,emissiveIntensity:1.15});
 const bladeMat=new THREE.MeshStandardMaterial({color:0x91f6ff,metalness:.22,roughness:.2,transparent:true,opacity:.88,emissive:0x10596b,emissiveIntensity:.55});
 const lampMat=new THREE.MeshBasicMaterial({color:0xff4fcf});
 const body=new THREE.Mesh(new THREE.BoxGeometry(.46,.31,.14),dark);body.position.z=.015;body.frustumCulled=false;group.add(body);
 const crown=new THREE.Mesh(new THREE.BoxGeometry(.25,.21,.075),edge);crown.position.z=.105;group.add(crown);
 const armX=new THREE.Mesh(new THREE.BoxGeometry(1.28,.065,.06),dark);armX.position.z=.035;group.add(armX);
 const armY=new THREE.Mesh(new THREE.BoxGeometry(.065,1.28,.06),dark);armY.position.z=.035;group.add(armY);
 const lens=new THREE.Mesh(new THREE.SphereGeometry(.075,12,9),edge);lens.position.set(.245,0,-.015);group.add(lens);
 for(const x of [-.57,.57])for(const y of [-.57,.57]){
  const rotor=new THREE.Group();rotor.name='bp-drone-rotor';rotor.position.set(x,y,.105);
  const motor=new THREE.Mesh(new THREE.CylinderGeometry(.075,.085,.11,12),dark);motor.rotation.x=Math.PI/2;rotor.add(motor);
  const hub=new THREE.Mesh(new THREE.SphereGeometry(.058,10,8),edge);hub.position.z=.06;rotor.add(hub);
  const bladeA=new THREE.Mesh(new THREE.BoxGeometry(.58,.035,.012),bladeMat);bladeA.position.z=.055;rotor.add(bladeA);
  const bladeB=new THREE.Mesh(new THREE.BoxGeometry(.035,.58,.012),bladeMat);bladeB.position.z=.057;rotor.add(bladeB);
  const light=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),lampMat);light.position.set(0,0,.125);rotor.add(light);
  group.add(rotor);
 }
 group.traverse(o=>{o.frustumCulled=false});return group;
}
function disposeDroneTemplate(){
 if(!droneTemplate)return;
 const geometries=new Set(),materials=new Set();
 droneTemplate.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const x of(Array.isArray(o.material)?o.material:[o.material]))if(x)materials.add(x)});
 for(const g of geometries)try{g.dispose()}catch(_){}
 for(const x of materials)try{x.dispose()}catch(_){}
 droneTemplate=null;
}
function ensureDrone3DLayer(THREE){
 if(!map||!map.getStyle?.())return false;
 if(map.getLayer(DRONE_3D_LAYER)&&droneScene)return true;
 const layer={id:DRONE_3D_LAYER,type:'custom',renderingMode:'3d',
  onAdd:(mapRef,gl)=>{
   const renderer=new THREE.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
   renderer.autoClear=false;renderer.outputColorSpace=THREE.SRGBColorSpace;
   const scene=new THREE.Scene();scene.add(new THREE.AmbientLight(0xffffff,1.35));
   const key=new THREE.DirectionalLight(0xc8f7ff,1.6);key.position.set(-.35,-.5,1);scene.add(key);
   layer.renderer=renderer;layer.scene=scene;layer.camera=new THREE.Camera();
   droneRenderer=renderer;droneScene=scene;droneLayer=layer;droneTemplate=makeDroneModel(THREE);
  },
  render:(gl,args)=>{
   if(!layer.renderer||!layer.scene||!layer.camera)return;
   const matrix=args?.defaultProjectionData?.mainMatrix||args?.modelViewProjectionMatrix||args;
   if(!matrix||typeof matrix.length!=='number'||matrix.length<16)return;
   layer.camera.projectionMatrix.fromArray(matrix);
   try{layer.renderer.resetState?.();if(layer.renderer.state?.reset)layer.renderer.state.reset()}catch(_){}
   layer.renderer.render(layer.scene,layer.camera);
  },
  onRemove:()=>{
   try{layer.renderer?.dispose?.()}catch(_){}
   for(const model of droneModels.values())try{layer.scene?.remove(model)}catch(_){}
   droneModels.clear();
   if(droneTrailGroup&&layer.scene){try{layer.scene.remove(droneTrailGroup);droneTrailGroup.traverse(o=>{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>m?.dispose?.());else o.material?.dispose?.()})}catch(_){}droneTrailGroup=null}
   disposeDroneTemplate();droneScene=null;droneRenderer=null;droneLayer=null;
  }
 };
 try{map.addLayer(layer);droneThree=THREE;drone3DError=null;return!!droneScene}catch(e){console.warn('BridgePoint 3D UAV renderer could not attach',e);return false}
}
function modelSpanMeters(lat,zoom){
 const latitudeScale=Math.max(.12,Math.cos(Number(lat||0)*Math.PI/180));
 const z=Math.max(0,Number(zoom)||0);
 return Math.max(2,Math.min(1800000,15*WORLD_CIRCUMFERENCE_M*latitudeScale/(512*Math.pow(2,z))));
}
function altitudeForRecord(a){return DroneCore.altitudeForRecord(a)}
function setDroneModels(records){
 if(!droneScene||!droneTemplate||!droneThree||!map){diagnosticState.modelsRendered=0;writeSummary();return 0}
 const MC=window.maplibregl?.MercatorCoordinate||window.MapLibreGL?.MercatorCoordinate;if(!MC?.fromLngLat)return 0;
 const active=new Set(),zoom=Number(map.getZoom?.()||0),bounds=map.getBounds?.();
 if(zoom>=9){
  const visibleRecords=records.filter(a=>{const lat=Number(a.lat),lon=Number(a.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))return false;try{return!bounds||bounds.contains([lon,lat])}catch(_){return true}}).slice(0,MAX_CLOSE_ZOOM_MODELS);
  for(const a of visibleRecords){
   const key=a._trackKey,lat=Number(a.lat),lon=Number(a.lon),altitude=altitudeForRecord(a);
   if(!key||!Number.isFinite(lat)||!Number.isFinite(lon)||!altitude.projectable)continue;
   const point=DroneCore.createTrailPoint(a,Date.now(),'ADSB.lol'),position=DroneCore.project3DPoint(point,MC),meterUnit=MC.fromLngLat({lng:lon,lat},0).meterInMercatorCoordinateUnits?.()||0;
   if(!position||!Number.isFinite(meterUnit)||meterUnit<=0)continue;
   const span=modelSpanMeters(lat,zoom);let model=droneModels.get(key);
   if(!model){model=droneTemplate.clone(true);model.name='Source-geometric-altitude public UAV model';model.traverse(o=>{o.frustumCulled=false});droneScene.add(model);droneModels.set(key,model)}
   model.position.set(position.x,position.y,position.z);model.scale.setScalar((span/1.36)*meterUnit);
   model.rotation.set(0,0,(Number.isFinite(point.heading)?point.heading:0)*Math.PI/180-Math.PI/2);
   model.userData.altitude={value:altitude.sourceValue,field:altitude.sourceField,units:altitude.sourceUnits,datum:altitude.datum,meters:altitude.meters};active.add(key);
  }
 }
 for(const [key,model] of droneModels)if(!active.has(key)){droneScene.remove(model);droneModels.delete(key)}
 diagnosticState.modelsRendered=droneModels.size;writeSummary();map.triggerRepaint?.();
 if(droneModels.size&&!droneAnimationFrame)droneAnimationFrame=requestAnimationFrame(animateDroneModels);
 if(!droneModels.size&&droneAnimationFrame){cancelAnimationFrame(droneAnimationFrame);droneAnimationFrame=0}
 return droneModels.size;
}
function rebuildDroneTrails(){
 if(!droneScene||!droneThree||!map)return{trails:0,knownPoints:0};
 if(droneTrailGroup){droneScene.remove(droneTrailGroup);droneTrailGroup.traverse(o=>{try{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>m?.dispose?.());else o.material?.dispose?.()}catch(_){}});droneTrailGroup=null}
 const MC=window.maplibregl?.MercatorCoordinate||window.MapLibreGL?.MercatorCoordinate;if(!MC?.fromLngLat)return{trails:0,knownPoints:0};
 const group=new droneThree.Group();group.name='Altitude-aware UAV history';const allDots=[];let segments=0;
 for(const track of trackedUavs.values()){
  let segment=[];
  const flush=()=>{if(segment.length>1){const geometry=new droneThree.BufferGeometry().setFromPoints(segment),material=new droneThree.LineBasicMaterial({color:0x83efff,transparent:true,opacity:.9}),line=new droneThree.Line(geometry,material);line.name='3D source-altitude trail';group.add(line);segments++}segment=[]};
  for(const point of track.points){if(point.gapBefore)flush();const projected=DroneCore.project3DPoint(point,MC);if(!projected){flush();continue}const vector=new droneThree.Vector3(projected.x,projected.y,projected.z);segment.push(vector);allDots.push(vector)}
  flush();
 }
 if(allDots.length){const geometry=new droneThree.BufferGeometry().setFromPoints(allDots),material=new droneThree.PointsMaterial({color:0x48dfff,size:4,sizeAttenuation:false,transparent:true,opacity:.95}),dots=new droneThree.Points(geometry,material);dots.name='Individual 3D observation markers';group.add(dots)}
 droneScene.add(group);droneTrailGroup=group;diagnosticState.trailsRendered=segments;writeSummary();map.triggerRepaint?.();return{trails:segments,knownPoints:allDots.length};
}
function animateDroneModels(now){
 droneAnimationFrame=0;if(!enabled||!droneScene||!droneModels.size)return;
 if(document.hidden){droneAnimationFrame=requestAnimationFrame(animateDroneModels);return}
 if(now-lastDroneAnimationAt>=65){
  lastDroneAnimationAt=now;
  for(const model of droneModels.values())model.traverse(o=>{if(o.name==='bp-drone-rotor')o.rotation.z+=.38});
  map?.triggerRepaint?.();
 }
 droneAnimationFrame=requestAnimationFrame(animateDroneModels);
}
function distanceMeters(a,b){
 const lat=(Number(a[1])+Number(b[1]))*.5*Math.PI/180;
 const dx=(Number(b[0])-Number(a[0]))*111320*Math.cos(lat),dy=(Number(b[1])-Number(a[1]))*110540;
 return Math.hypot(dx,dy);
}
function updateTrackedUavs(records){
 const now=Date.now(),fresh=new Map();let identified=0,rejected=0;
 for(const a of Array.isArray(records)?records:[]){
  const invalid=DroneCore.invalidPositionReason(a);if(invalid)rejected++;
  if(!DroneCore.isUavRecord(a))continue;identified++;if(invalid)continue;
  const key=String(a.hex||a.icao24||'').trim().toLowerCase(),lat=Number(a.lat),lon=Number(a.lon),ageRaw=a.seen_pos??a.seen,age=ageRaw===null||ageRaw===undefined||ageRaw===''?999999:Number(ageRaw),prior=fresh.get(key);
  if(prior&&prior._seenAge<=age)continue;fresh.set(key,{...a,lat,lon,_trackKey:key,_seenAge:age});
 }
 const active=new Set(),current=[...fresh.values()].slice(0,MAX_TRACKED_DRONES);
 for(const a of current){
  const key=a._trackKey,track=trackedUavs.get(key)||{points:[],lastSeen:0,current:null},point=DroneCore.createTrailPoint(a,now,'ADSB.lol'),last=track.points[track.points.length-1];
  if(last){const ageGap=point.observationTimestamp-last.observationTimestamp,dist=distanceMeters([last.longitude,last.latitude],[point.longitude,point.latitude]);if(ageGap>REFRESH_MS*1.5){point.gapBefore=true;point.gapReason='No observation for '+Math.round(ageGap/1000)+' seconds'}if(!Number.isFinite(dist)||dist>45000){point.gapBefore=true;point.gapReason='Position discontinuity; segment restarted'}}
  if(!last||now-last.sampledAt>=REFRESH_MS*.8){track.points.push(point);if(track.points.length>MAX_TRAIL_POINTS)track.points.splice(0,track.points.length-MAX_TRAIL_POINTS)}
  track.lastSeen=now;track.current=a;trackedUavs.set(key,track);active.add(key);
 }
 for(const [key,track] of trackedUavs)if(now-track.lastSeen>TRACK_RETENTION_MS)trackedUavs.delete(key);
 const accepted=[...trackedUavs.entries()].filter(([key,track])=>active.has(key)&&track.current).map(([,track])=>track.current);
 const positions=accepted.map(a=>({type:'Feature',geometry:{type:'Point',coordinates:[a.lon,a.lat]},properties:{altitude_known:altitudeForRecord(a).known,altitude_projectable:altitudeForRecord(a).projectable,altitude_datum:altitudeForRecord(a).datum}}));
 const historical=[];for(const track of trackedUavs.values())for(const point of track.points)historical.push({type:'Feature',geometry:{type:'Point',coordinates:[point.longitude,point.latitude]},properties:{altitude_known:point.altitudeKnown,altitude_projectable:point.altitudeProjectable,altitude_datum:point.altitudeDatum,observed_at:point.observationTimestamp,source:point.sourceName,gap_before:point.gapBefore,gap_reason:point.gapReason||''}});
 const collection=features=>({type:'FeatureCollection',features});map.getSource(SOURCE)?.setData(collection(positions));map.getSource(TRAIL_DOT_SOURCE)?.setData(collection(historical));lastCurrentRecords=accepted;
 diagnosticState.uavRecordsIdentified=identified;diagnosticState.invalidOrStaleRecords=rejected;diagnosticState.currentPositionsAccepted=accepted.length;diagnosticState.historicalTrailPoints=historical.length;
 const models=setDroneModels(accepted),trailState=rebuildDroneTrails();diagnosticState.modelsRendered=models;diagnosticState.trailsRendered=trailState.trails;writeSummary();
 if(trailNoteNode)trailNoteNode.textContent='Each observation preserves track key, source longitude/latitude, reported altitude, units/datum, heading, timestamp and source. The actual 3D model and trail use geometric altitude only; barometric values remain labelled as barometric and are never treated as geometric height. Missing altitude and data gaps split 3D tracks. No altitude is invented. History is bounded to '+MAX_TRAIL_POINTS+' points per aircraft.';
 map.triggerRepaint?.();return{positions:accepted.length,trails:trailState.trails,identified,rejected,trailPoints:historical.length,models};
}
function clearTrackedUavs(){
 trackedUavs.clear();lastCurrentRecords=[];for(const id of [SOURCE,TRAIL_SOURCE,TRAIL_DOT_SOURCE])try{map?.getSource(id)?.setData(emptyFeatureCollection())}catch(_){}
 for(const model of droneModels.values())try{droneScene?.remove(model)}catch(_){}droneModels.clear();
 if(droneTrailGroup&&droneScene){droneScene.remove(droneTrailGroup);droneTrailGroup.traverse(o=>{try{o.geometry?.dispose?.();o.material?.dispose?.()}catch(_){}});droneTrailGroup=null}
 diagnosticState.hasSuccessfulSource=false;diagnosticState.aircraftRecordsReceived=0;diagnosticState.uavRecordsIdentified=0;diagnosticState.invalidOrStaleRecords=0;diagnosticState.currentPositionsAccepted=0;diagnosticState.modelsRendered=0;diagnosticState.historicalTrailPoints=0;diagnosticState.trailsRendered=0;writeSummary();
 if(droneAnimationFrame){cancelAnimationFrame(droneAnimationFrame);droneAnimationFrame=0}map?.triggerRepaint?.();
}
function removeDrone3DLayer(){
 if(droneAnimationFrame){cancelAnimationFrame(droneAnimationFrame);droneAnimationFrame=0}
 try{if(map?.getLayer(DRONE_3D_LAYER))map.removeLayer(DRONE_3D_LAYER)}catch(_){}
}
function isUavRecord(a){
 const category=String(a?.category||a?.emitter_category||'').trim().toUpperCase();
 if(category==='B6'||category==='14'||category==='UAV')return true;
 const description=[a?.desc,a?.description,a?.typeDescription,a?.type,a?.t].filter(Boolean).join(' ');
 return /\b(?:UAV|UAS|UNMANNED AERIAL|UNMANNED AIRCRAFT|DRONE)\b/i.test(description);
}
const DroneCore=(()=>{
 const FEET_TO_METERS=0.3048;
 function buildRequestUrl(sample){
  if(!sample||!Number.isFinite(Number(sample.lat))||!Number.isFinite(Number(sample.lon))||Number(sample.lat)<-90||Number(sample.lat)>90||Number(sample.lon)<-180||Number(sample.lon)>180)throw new Error('Invalid regional sample coordinates');
  return SUPPORTED_SOURCE+'lat/'+encodeURIComponent(Number(sample.lat).toFixed(4))+'/lon/'+encodeURIComponent(Number(sample.lon).toFixed(4))+'/dist/'+REGION_RADIUS_NM;
 }
 function parseResponse(payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Invalid ADSB.lol response: expected a JSON object');
  if(!Array.isArray(payload.ac))throw new Error('Invalid ADSB.lol response: expected the ac aircraft array');
  return{records:payload.ac,total:Number.isFinite(Number(payload.total))?Number(payload.total):payload.ac.length,message:String(payload.msg||'')};
 }
 async function requestSample(sample,fetchImpl,signal){
  if(typeof fetchImpl!=='function')throw new Error('ADS-B request requires a fetch implementation');
  const requestUrl=buildRequestUrl(sample);
  const response=await fetchImpl(requestUrl,{method:'GET',cache:'no-store',signal,headers:{'Accept':'application/json'}});
  const body=await response.text();
  if(!response.ok)throw new Error('HTTP '+response.status+(response.statusText?' '+response.statusText:'')+(body?' · '+body.replace(/\\s+/g,' ').slice(0,220):''));
  let payload;try{payload=JSON.parse(body)}catch(error){throw new Error('Invalid JSON response: '+String(error?.message||error)+' · body: '+body.replace(/\\s+/g,' ').slice(0,180))}
  const parsed=parseResponse(payload);
  return{requestUrl,records:parsed.records,responseTotal:parsed.total,message:parsed.message};
 }
 function isUavRecord(a){
  const category=String(a?.category||a?.emitter_category||'').trim().toUpperCase();
  if(category==='B6'||category==='14'||category==='UAV')return true;
  const description=[a?.desc,a?.description,a?.typeDescription,a?.type,a?.t].filter(Boolean).join(' ');
  return /\\b(?:UAV|UAS|UNMANNED AERIAL|UNMANNED AIRCRAFT|DRONE)\\b/i.test(description);
 }
 function invalidPositionReason(a){
  const rawLat=a?.lat,rawLon=a?.lon,lat=Number(rawLat),lon=Number(rawLon);
  if(rawLat===null||rawLat===undefined||rawLat===''||rawLon===null||rawLon===undefined||rawLon==='')return'invalid coordinates';
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return'invalid coordinates';
  if(!String(a?.hex||a?.icao24||'').trim())return'missing tracking key';
  const ageRaw=a?.seen_pos??a?.seen;
  if(ageRaw!==null&&ageRaw!==undefined&&ageRaw!==''){const age=Number(ageRaw);if(!Number.isFinite(age)||age<0)return'invalid position age';if(age>240)return'stale position ('+Math.round(age)+'s old)'}
  return null;
 }
 function altitudeForRecord(a){
  const geomRaw=a?.alt_geom;
  if(typeof geomRaw==='string'&&geomRaw.trim().toLowerCase()==='ground')return{known:false,projectable:false,value:null,meters:null,sourceValue:geomRaw,sourceField:'alt_geom',sourceUnits:'ft',mapUnits:'m',datum:'unknown'};
  if(geomRaw!==null&&geomRaw!==undefined&&geomRaw!==''){
   const value=Number(geomRaw);if(Number.isFinite(value)&&value>=-2000&&value<=60000)return{known:true,projectable:true,value,meters:value*FEET_TO_METERS,sourceValue:geomRaw,sourceField:'alt_geom',sourceUnits:'ft',mapUnits:'m',datum:'geometric'};
  }
  const baroRaw=a?.alt_baro;
  if(baroRaw!==null&&baroRaw!==undefined&&baroRaw!==''&&!(typeof baroRaw==='string'&&baroRaw.trim().toLowerCase()==='ground')){
   const value=Number(baroRaw);if(Number.isFinite(value)&&value>=-2000&&value<=60000)return{known:true,projectable:false,value,meters:value*FEET_TO_METERS,sourceValue:baroRaw,sourceField:'alt_baro',sourceUnits:'ft',mapUnits:'m',datum:'barometric'};
  }
  return{known:false,projectable:false,value:null,meters:null,sourceValue:null,sourceField:null,sourceUnits:'ft',mapUnits:'m',datum:'unknown'};
 }
 function createTrailPoint(a,observedAt=Date.now(),sourceName='ADSB.lol'){
  const alt=altitudeForRecord(a),ageRaw=a?.seen_pos??a?.seen,age=ageRaw===null||ageRaw===undefined||ageRaw===''?null:Number(ageRaw),headingRaw=a?.track??a?.true_heading??a?.mag_heading,heading=headingRaw===null||headingRaw===undefined||headingRaw===''?null:Number(headingRaw);
  return{trackKey:String(a?.hex||a?.icao24||'').trim().toLowerCase(),longitude:Number(a?.lon),latitude:Number(a?.lat),altitudeValue:alt.sourceValue,altitudeField:alt.sourceField,altitudeUnits:alt.sourceUnits,altitudeMeters:alt.projectable?alt.meters:null,altitudeReportedMeters:alt.known?alt.meters:null,altitudeDatum:alt.datum,altitudeKnown:alt.known,altitudeProjectable:alt.projectable,heading:Number.isFinite(heading)?heading:null,observationTimestamp:Number.isFinite(age)&&age>=0?observedAt-age*1000:observedAt,sampledAt:observedAt,sourceName,sourceAgeSeconds:Number.isFinite(age)&&age>=0?age:null,gapBefore:false,gapReason:null};
 }
 function project3DPoint(point,MC){
  if(!point?.altitudeProjectable||point.altitudeDatum!=='geometric'||!Number.isFinite(Number(point.altitudeMeters))||!MC?.fromLngLat)return null;
  return MC.fromLngLat({lng:Number(point.longitude),lat:Number(point.latitude)},Number(point.altitudeMeters));
 }
 return Object.freeze({buildRequestUrl,parseResponse,requestSample,isUavRecord,invalidPositionReason,altitudeForRecord,createTrailPoint,project3DPoint,feetToMeters:FEET_TO_METERS,radiusNm:REGION_RADIUS_NM});
})();
function centerAndZoom(){
 if(!map)return null;
 const c=map.getCenter?.();if(!c)return null;
 return{lat:Number(c.lat),lon:Number(c.lng),zoom:Number(map.getZoom?.()||0)};
}
const GLOBAL_SAMPLES=[
 {id:'North America · East',lat:40.7,lon:-74.0},
 {id:'North America · Central',lat:39.1,lon:-96.8},
 {id:'North America · West',lat:34.1,lon:-118.2},
 {id:'Central America · Panama',lat:9.0,lon:-79.5},
 {id:'South America · Southeast',lat:-23.6,lon:-46.6},
 {id:'Europe · West',lat:51.5,lon:-0.1},
 {id:'Europe · Central',lat:52.2,lon:21.0},
 {id:'Middle East · Gulf',lat:25.2,lon:55.3},
 {id:'South Asia · West',lat:19.1,lon:72.9},
 {id:'East Asia · Japan',lat:35.7,lon:139.7},
 {id:'Southeast Asia · Singapore',lat:1.35,lon:103.8},
 {id:'Africa · South',lat:-26.2,lon:28.0},
 {id:'Australia · East',lat:-33.9,lon:151.2}
];
async function getSample(sample){
 let url='';try{url=DroneCore.buildRequestUrl(sample);const cached=sampleCache.get(url);if(cached&&Date.now()-cached.at<SAMPLE_CACHE_MS)return{...cached.result,cached:true}}catch(error){return{sample,requestUrl:url,ok:false,records:[],error:String(error?.message||error),errorName:String(error?.name||'Error'),cached:false}}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);requestControllers.add(controller);
 try{
  const response=await DroneCore.requestSample(sample,fetch,controller.signal),result={sample,requestUrl:response.requestUrl,ok:true,records:response.records,responseTotal:response.responseTotal,message:response.message,receivedAt:Date.now(),error:null,cached:false};
  sampleCache.set(url,{at:Date.now(),result});return result;
 }catch(error){return{sample,requestUrl:url,ok:false,records:[],error:error?.name==='AbortError'?'Request timed out after '+REQUEST_TIMEOUT_MS+' ms':String(error?.message||error),errorName:String(error?.name||'Error'),receivedAt:Date.now(),cached:false}}
 finally{clearTimeout(timer);requestControllers.delete(controller)}
}
async function fetchGlobalSamples(){
 const results=[];diagnosticState.regionalRequestsAttempted=0;diagnosticState.regionalRequestsCompleted=0;diagnosticState.regionalCacheHits=0;
 diagnosticState.regionalResults=GLOBAL_SAMPLES.map(sample=>({sample,status:'pending',ok:false,records:[],error:null}));writeSummary();
 for(let i=0;i<GLOBAL_SAMPLES.length;i+=3){
  if(!enabled)throw new Error('Drone Awareness was turned off');
  const batch=await Promise.all(GLOBAL_SAMPLES.slice(i,i+3).map(getSample));results.push(...batch);
  diagnosticState.regionalRequestsAttempted+=batch.filter(x=>!x.cached).length;diagnosticState.regionalRequestsCompleted+=batch.filter(x=>!x.cached&&x.ok).length;diagnosticState.regionalCacheHits+=batch.filter(x=>x.cached).length;
  for(const result of batch){const row=diagnosticState.regionalResults.find(x=>x.sample.id===result.sample.id);if(row)Object.assign(row,{status:result.ok?'complete':'failed',ok:result.ok,cached:!!result.cached,records:result.records,error:result.error||null,requestUrl:result.requestUrl||''})}
  writeSummary();showStatus('Regional ADS-B requests: '+diagnosticState.regionalRequestsAttempted+' attempted · '+diagnosticState.regionalRequestsCompleted+' completed · '+diagnosticState.regionalCacheHits+' cached.',batch.some(x=>!x.ok)?'error':'info');
 }
 return results;
}
async function refresh(force=false){
 if(!enabled||!map||inFlight)return;
 if(!mapStyleReady()){activationQueued=true;diagnosticState.sourceStatus='waiting';writeSummary();showStatus('Drone Awareness is ON and queued for the MapLibre style. It will sample automatically when the globe is ready; no second press is needed.','info');return}
 const wait=15000-(Date.now()-lastFetchAt);if(!force&&wait>0)return;if(force&&wait>0){showStatus('Public API refresh is briefly rate-limited. Try again in '+Math.ceil(wait/1000)+' seconds.');return}
 inFlight=true;lastFetchAt=Date.now();if(refreshButton)refreshButton.disabled=true;
 diagnosticState.sourceStatus='loading';diagnosticState.aircraftRecordsReceived=0;diagnosticState.uavRecordsIdentified=0;diagnosticState.invalidOrStaleRecords=0;diagnosticState.currentPositionsAccepted=0;diagnosticState.modelsRendered=0;diagnosticState.historicalTrailPoints=0;diagnosticState.trailsRendered=0;diagnosticState.localSample=null;writeSummary();
 showStatus('Requesting public ADS-B aircraft records from '+GLOBAL_SAMPLES.length+' regional sample areas…');
 try{
  const samples=await fetchGlobalSamples();if(!enabled)return;
  const good=samples.filter(x=>x.ok),records=good.flatMap(x=>x.records),center=centerAndZoom();
  if(center&&center.zoom>=6){
   diagnosticState.localSample={status:'pending',ok:false,records:[],error:null};writeSummary();
   const local=await getSample({id:'Local map view',lat:center.lat,lon:center.lon});
   diagnosticState.localSample={status:local.ok?'complete':'failed',ok:local.ok,cached:!!local.cached,records:local.records,error:local.error||null,requestUrl:local.requestUrl||''};
   if(local.ok)records.push(...local.records);writeSummary();
  }
  if(!enabled)return;
  diagnosticState.hasSuccessfulSource=good.length>0||!!diagnosticState.localSample?.ok;
  diagnosticState.sourceStatus=diagnosticState.hasSuccessfulSource?(samples.some(x=>!x.ok)||(diagnosticState.localSample&&!diagnosticState.localSample.ok)?'partial':'ready'):'failed';
  diagnosticState.aircraftRecordsReceived=records.length;
  const result=updateTrackedUavs(records),failed=samples.filter(x=>!x.ok),err=failed.slice(0,3).map(x=>x.sample.id+': '+x.error).join(' · ');
  let message='';
  if(!diagnosticState.hasSuccessfulSource)message='All '+samples.length+' regional ADS-B requests failed. No UAV count is available; 0 would be misleading. '+err;
  else if(records.length>0&&result.identified===0)message=records.length+' aircraft records were received, but none identified as UAVs (no B6/UAV-class reports in these sampled areas).';
  else if(result.positions===0&&result.identified>0)message=result.identified+' UAV records were identified; '+result.rejected+' invalid/stale aircraft records were rejected and no current UAV positions were accepted.';
  else if(records.length===0)message='Requests succeeded but returned no aircraft records in the sampled areas. This is not complete worldwide coverage.';
  else message='Updated '+new Date().toLocaleTimeString()+' · '+result.positions+' current UAV positions · '+result.models+' close-zoom geometric-altitude 3D models · '+result.trailPoints+' retained observations · '+result.trails+' 3D trail segments.';
  if(failed.length)message+=' '+failed.length+' regional requests failed: '+err+(failed.length>3?' · Remaining errors are listed by region below.':'');
  if(drone3DError)message+=' 3D renderer error: '+drone3DError;
  showStatus(message,failed.length||!diagnosticState.hasSuccessfulSource||drone3DError?'error':'info');
  const meta=$('#bp-drone-feed-meta');if(meta)meta.textContent='Source: ADSB.lol public community ADS-B · '+good.length+'/'+samples.length+' regional sample windows succeeded · '+REGION_RADIUS_NM+' NM maximum radius each. '+(diagnosticState.localSample?.ok?'A separate close-zoom local sample also succeeded. ':'')+'Partial geographic sampling only; not a worldwide registry. Most consumer drones do not broadcast ADS-B.';
  writeSummary();
 }catch(error){
  diagnosticState.sourceStatus='failed';writeSummary();
  if(enabled)showStatus('ADS-B sampling failed: '+String(error?.message||error)+'. Live UAV count is unavailable, not zero. See each regional row for its actual request result; no fabricated positions are used.','error');
 }finally{inFlight=false;if(refreshButton)refreshButton.disabled=false}
}
function openDronePanel(){
 if(!pane)return;
 const p=$('#bpv-sidecar');if(!p)return;
 p.hidden=false;p.dataset.panel='drones';document.body.classList.add('bpv-panel-open');
 const title=$('#bpv-sidecar-title');if(title)title.textContent='BRIDGEPOINT DRONE AWARENESS';
 p.querySelectorAll('[data-bpv-pane]').forEach(s=>{s.hidden=s!==pane});
 p.querySelectorAll('[data-bpv-panel]').forEach(b=>{b.classList.toggle('active',b.dataset.bpvPanel==='drones');b.setAttribute('aria-pressed',String(b.dataset.bpvPanel==='drones'))});
 const dock=$('#bpv-dock'),expand=dock?.querySelector('[data-bpv-dock-expand]');
 if(dock){dock.classList.add('bpv-dock-maximized');if(expand){expand.textContent='RESTORE ↘';expand.setAttribute('aria-pressed','true')}}
}
function scheduleDroneRefresh(){if(refreshTimer)clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(enabled&&!document.hidden)void refresh(false)},REFRESH_MS)}
function scheduleDroneRefresh(){if(refreshTimer)clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(enabled&&!document.hidden)void refresh(false)},REFRESH_MS)}
function scheduleViewportRefresh(){
 clearTimeout(moveTimer);
 const run=()=>{if(!enabled)return;if(inFlight){moveTimer=setTimeout(run,1200);return}const remaining=15000-(Date.now()-lastFetchAt);if(remaining>0){moveTimer=setTimeout(run,remaining+100);return}void refresh(false)};
 moveTimer=setTimeout(run,1200);
}
async function activateWhenStyleReady(){
 if(!enabled)return false;
 if(!map||!mapStyleReady()){activationQueued=true;diagnosticState.sourceStatus='waiting';writeSummary();showStatus('Drone Awareness is ON and queued until the globe style is ready. It will activate and sample automatically; no second press is needed.','info');return false}
 if(activationPromise)return activationPromise;
 const generation=activationGeneration;activationQueued=false;
 activationPromise=(async()=>{
  if(!installLayer()){activationQueued=true;diagnosticState.sourceStatus='waiting';writeSummary();showStatus('Drone Awareness remains ON while MapLibre finishes its style. Automatic retry is registered; do not press again.','info');return false}
  setLayerVisibility(true);
  try{const THREE=await loadDroneThree();if(!enabled||generation!==activationGeneration)return false;if(!ensureDrone3DLayer(THREE))throw new Error('3D drone layer could not attach to the initialized globe');setDroneModels(lastCurrentRecords);rebuildDroneTrails();drone3DError=null}
  catch(error){drone3DError=String(error?.message||error);showStatus('Public position markers can still load, but the 3D renderer failed: '+drone3DError,'error')}
  if(!enabled||generation!==activationGeneration)return false;
  window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('drones',true);scheduleDroneRefresh();void refresh(false);return true;
 })().finally(()=>{activationPromise=null;if(enabled&&activationQueued&&mapStyleReady())void activateWhenStyleReady()});
 return activationPromise;
}
async function toggle(){
 openDronePanel();
 if(!enabled){enabled=true;activationGeneration++;activationQueued=true;diagnosticState.sourceStatus='waiting';updateButton();showStatus('Drone Awareness is ON. Waiting for globe initialization if necessary; live sampling starts automatically.','info');void activateWhenStyleReady();return}
 enabled=false;activationGeneration++;activationQueued=false;updateButton();if(refreshTimer)clearInterval(refreshTimer);refreshTimer=0;clearTimeout(moveTimer);aborter?.abort();
 for(const c of requestControllers)try{c.abort()}catch(_){}requestControllers.clear();setLayerVisibility(false);clearTrackedUavs();removeDrone3DLayer();diagnosticState.sourceStatus='idle';diagnosticState.hasSuccessfulSource=false;writeSummary();
 window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('drones',false);showStatus('Drone Awareness is off. Session positions and observed trails were cleared; no background regional requests are running.');
}
function createPane(panel){
 if(!panel)return null;let existing=panel.querySelector('[data-bpv-pane="drones"]');if(existing)return existing;
 const p=element('section','bp-drone-pane');p.dataset.bpvPane='drones';p.hidden=true;
 p.append(element('div','bp-drone-headline','OPT-IN · PUBLIC ADS-B UAV POSITIONS + ALTITUDE-AWARE 3D TRACKS'));
 p.append(element('div','bp-drone-feed-note','Whole-Earth markers stay anchored to the broadcast coordinates. Close-zoom quadcopter models require an actual source altitude. Model size is visual only; its position and altitude are not moved.'));
 p.append(element('div','bp-drone-feed-note','DATA LIMIT · '+GLOBAL_SAMPLES.length+' regional sample hubs, each up to '+REGION_RADIUS_NM+' NM, plus a supplemental local sample at close zoom. This is partial coverage, not a worldwide registry. Most consumer drones do not broadcast ADS-B. Remote ID: NOT CONNECTED — no authorized receiver or network provider credentials are configured. Private networks, unauthorized radio interception and pilot/control-station locations are not accessed.'));
 const summary=element('div','bp-drone-summary');summary.id='bp-drone-summary-v3';p.append(summary);summaryNode=summary;
 const status=element('div','bp-drone-status','Drone Awareness is off.');status.id='bp-drone-status-v3';status.dataset.kind='info';p.append(status);statusNode=status;
 const regions=element('div','bp-drone-cells');regions.id='bp-drone-regional-status-v3';p.append(regions);regionalStatusNode=regions;
 const actions=element('div','bp-drone-actions'),refreshBtn=element('button','bpv-wide-action','REFRESH REGIONAL UAV SAMPLE');refreshBtn.type='button';refreshBtn.addEventListener('click',()=>void refresh(true));actions.append(refreshBtn);refreshButton=refreshBtn;
 const off=element('button','bpv-wide-action','TURN DRONE AWARENESS OFF');off.type='button';off.addEventListener('click',()=>{if(enabled)void toggle()});actions.append(off);p.append(actions);
 const meta=element('div','bp-drone-feed-note','Live positions refresh every 3 minutes. Requests are grouped in batches of three and successful responses are cached briefly.');meta.id='bp-drone-feed-meta';p.append(meta);
 trailNoteNode=element('div','bp-drone-feed-note','Altitude-aware 3D history is limited to '+MAX_TRAIL_POINTS+' observations per aircraft; gaps split the line. Unknown altitude is not fabricated.');p.append(trailNoteNode);
 const attribution=element('div','bp-drone-footnote');attribution.append(document.createTextNode('Source: '));const link=element('a','bp-drone-source','ADSB.lol public API documentation');link.href='https://api.adsb.lol/docs/open-data/api/';link.target='_blank';link.rel='noopener noreferrer';attribution.append(link);attribution.append(document.createTextNode(' · ODbL 1.0'));p.append(attribution);panel.append(p);writeSummary();return p;
}
function updateWaterButton(){
 if(!waterButton)return;
 waterButton.classList.toggle('active',waterEnabled);
 waterButton.setAttribute('aria-pressed',String(waterEnabled));
 const label=waterButton.querySelector('.bpv-command-label');setLabelTextIfChanged(label,waterEnabled?'Water + Flow · ON':'Water + Flow');
 waterButton.title=waterEnabled?'Turn off the animated water/hydrology surface':'Load the optional water/hydrology surface';
}
async function toggleWater(){
 if(!map)throw new Error('BridgePoint globe is not ready');
 if(typeof window.__BP_TOGGLE_WATER__==='function'){
  const result=await window.__BP_TOGGLE_WATER__();
  waterEnabled=result===true;
  window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('water',waterEnabled);
  updateWaterButton();hideDefaultOverlays();return waterEnabled;
 }
 if(waterEnabled){
  waterEnabled=false;window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('water',false);
  if(waterApi){waterApi.active=false;waterApi.setEnabled?.(false)}
  try{if(map.getLayer('bp-water-surface-gpu-v6123'))map.setLayoutProperty('bp-water-surface-gpu-v6123','visibility','none')}catch(_){}
  updateWaterButton();return false;
 }
 if(!waterApi){
  if(!waterPromise){
   const world={map};
   waterPromise=import('./world-v2300-water.js?v=6194-stable-water-low-cost')
    .then(m=>{
     const api=m.initWaterEngine(world,{surface:location.pathname.startsWith('/app/')?'app':'landing'});
     if(!api)throw new Error('Water surface engine did not initialize');
     waterApi=api;
     if(location.pathname.startsWith('/app/'))window.__BP_WATER_ENGINE_APP_V6123__=api;
     else window.__BP_WATER_ENGINE_LANDING_V6123__=api;
     return api;
    }).finally(()=>{waterPromise=null});
  }
  await waterPromise;
 }
 if(!waterApi)throw new Error('Water surface engine unavailable');
 waterEnabled=true;waterApi.active=true;
 window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('water',true);
 if(typeof waterApi.setEnabled==='function')waterApi.setEnabled(true);
 try{if(map.getLayer('bp-water-surface-gpu-v6123'))map.setLayoutProperty('bp-water-surface-gpu-v6123','visibility','visible')}catch(_){}
 updateWaterButton();return true;
}
function addButton(){
 const grid=$('[data-bpv-command-grid="environment"]');if(!grid)return false;
 let b=grid.querySelector('[data-bp-drone-awareness-button="1"]');
 if(!b){
  b=element('button','bpv-command-btn','');
  b.type='button';b.dataset.bpDroneAwarenessButton='1';b.dataset.bpvAction='drones';
  b.title='Show live public UAV positions, 3D drone models and observed flight trails';
  b.innerHTML='<span class="bpv-command-icon" aria-hidden="true">⌁</span><span class="bpv-command-label">Drone Awareness</span>';
  b.addEventListener('click',toggle);grid.append(b);
 }
 button=b;updateButton();
 let wb=grid.querySelector('[data-bp-water-flow-button="1"]');
 if(!wb){
  wb=element('button','bpv-command-btn','');wb.type='button';wb.dataset.bpWaterFlowButton='1';wb.dataset.bpvAction='water';
  wb.title='Load or hide the optional water/hydrology surface';
  wb.innerHTML='<span class="bpv-command-icon" aria-hidden="true">≈</span><span class="bpv-command-label">Water + Flow</span>';
  wb.addEventListener('click',async()=>{
   wb.disabled=true;
   try{await toggleWater();window.__BP_SHOW_ACTION_NOTICE__?.(waterEnabled?'Water + Flow is enabled.':'Water + Flow is off.')}
   catch(e){window.__BP_SHOW_ACTION_NOTICE__?.('Water + Flow failed: '+String(e?.message||e));console.warn('BridgePoint Water + Flow',e)}
   finally{wb.disabled=false;updateWaterButton()}
  });
  grid.append(wb);
 }
 waterButton=wb;updateWaterButton();
 return true;
}

function hideDefaultOverlays(){
 if(!emptyModeActive||!emptyModeMap||sweepFrame)return;
 sweepFrame=requestAnimationFrame(()=>{
  sweepFrame=0;if(!emptyModeActive||!emptyModeMap)return;
  ensureInitialBaseLayers();
  let layers=[];
  try{layers=emptyModeMap.getStyle?.()?.layers||[]}catch(_){return}
  for(const layer of layers){
   if(!isManagedOptionalOverlay(layer.id)||layerAllowed(layer.id))continue;
   try{
    if((emptyModeMap.getLayoutProperty(layer.id,'visibility')||'visible')!=='none')emptyModeMap.setLayoutProperty(layer.id,'visibility','none');
   }catch(_){}
  }
 });
}
function stopEmptyMode(){
 if(!emptyModeActive)return;emptyModeActive=false;
 if(emptyModeMap&&emptyModeHandler){try{emptyModeMap.off('styledata',emptyModeHandler);emptyModeMap.off('idle',emptyModeHandler)}catch(_){}}
 if(sweepFrame)cancelAnimationFrame(sweepFrame);sweepFrame=0;
}
function installEmptyMode(m){
 if(!m||emptyModeMap===m)return;
 if(emptyModeMap&&emptyModeHandler){try{for(const event of ['styledata','style.load','idle','moveend','zoomend','rotateend','pitchend'])emptyModeMap.off(event,emptyModeHandler)}catch(_){}}
 emptyModeMap=m;emptyModeHandler=hideDefaultOverlays;
 // Map LOD + weather modules may reset visibility when a camera settles. Reapply
 // the opt-in allowlist after each settled camera/style event, not continuously.
 try{for(const event of ['style.load','idle','moveend','zoomend','rotateend','pitchend'])m.on(event,hideDefaultOverlays)}catch(_){}
 hideDefaultOverlays();
}
function bindStartMode(){
 document.addEventListener('click',e=>{
  if(!emptyModeActive)return;
  const target=e.target?.closest?.('.bpv-dock [data-bpv-action], .bpv-dock [data-bpv-panel], .bpv-dock [data-bpv-slot-action], #bpv-mapkey-rail, .map-tools button, .bpv-contained-control button');
  if(!target)return;
  const category=categoryForTarget(target);
  if(!category)return;
  if(category!=='parcels')allowedCategories.add(category);
  hideDefaultOverlays();
  // The existing toggle owns on/off state. If it ended off, remove just that
  // category from the opt-in allowlist; unrelated layers stay hidden.
  setTimeout(()=>{
   if(category==='parcels')parcelLayerEnabled=target.classList.contains('active')||target.getAttribute('aria-pressed')==='true';
   if(category==='buildings'&&!target.classList.contains('active')&&target.getAttribute('aria-pressed')!=='true')allowedCategories.delete(category);
   hideDefaultOverlays();
  },0);
 },true);
}
function tryBoot(){
 addStyle();addButton();const panel=$('#bpv-sidecar');if(panel)pane=createPane(panel);const current=worldMap();
 if(current){
  if(map!==current){try{styleRetryCleanup?.()}catch(_){}map=current;installEmptyMode(map);
   styleRetryCleanup=bindMapStyleRetry(map,()=>map===current&&mapStyleReady(),()=>{if(enabled){activationQueued=true;void activateWhenStyleReady()}else installLayer()});
   map.on?.('moveend',()=>{if(enabled){setDroneModels(lastCurrentRecords);rebuildDroneTrails();scheduleViewportRefresh()}});
   map.on?.('zoomend',()=>{if(enabled){setDroneModels(lastCurrentRecords);rebuildDroneTrails();scheduleViewportRefresh()}});
  }
  installLayer();if(enabled&&activationQueued)void activateWhenStyleReady();
 }
}
function boot(){
 bindStartMode();
 tryBoot();
 let attempts=0;
 const observer=new MutationObserver(()=>{
  tryBoot();
  // Once the late-loading dock controls exist, polling alone is sufficient to
  // discover the map. Disconnect the document-wide observer to avoid UI updates
  // retriggering startup work while the map module is importing.
  if(button&&pane){try{observer.disconnect()}catch(_){}}
 });
 try{observer.observe(document.body,{childList:true,subtree:true})}catch(_){}
 if(button&&pane){try{observer.disconnect()}catch(_){}}
 const timer=setInterval(()=>{
  tryBoot();attempts++;
  if((button&&pane&&map)||attempts>240){clearInterval(timer);try{observer.disconnect()}catch(_){}}
 },250);
 window.__BP_DRONE_AWARENESS_V1__={
  version:VERSION,
  source:'adsb.lol public community ADS-B feed',
  aggregation:GLOBAL_SAMPLES.length+' regional ADS-B sample windows, maximum '+REGION_RADIUS_NM+' NM radius; partial coverage only; 3D altitude-aware tracks',
  targetLevelDetails:false,
  pilotOrControlStationLocations:false,
  rawRfScanning:false,
  offlineReceiver:false,
  waterToggle:toggleWater,
  allowLayerCategory(category,on=true){
   const key=String(category||'').trim().toLowerCase();
   if(key==='drones')return true;
   if(key==='clouds'){allowedCategories.add('clouds');hideDefaultOverlays();return true}
   if(key==='parcels'){parcelLayerEnabled=!!on;hideDefaultOverlays();return true}
   if(!categoryPatterns[key])return false;
   if(on)allowedCategories.add(key);else allowedCategories.delete(key);
   hideDefaultOverlays();return true;
  },
  toggle,
  refresh:()=>refresh(true),
  diagnostics:()=>JSON.parse(JSON.stringify(diagnosticState)),
  get state(){return{enabled,activationQueued,mapReady:!!map,mapStyleReady:mapStyleReady(),zoom:map?.getZoom?.()??null,layerReady:!!map?.getLayer?.(LAYER),layerVisible:!!map?.getLayer?.(LAYER)&&(map.getLayoutProperty(LAYER,'visibility')||'visible')!=='none',clusterLayerReady:!!map?.getLayer?.(CLUSTER_LAYER),clusterLayerVisible:!!map?.getLayer?.(CLUSTER_LAYER)&&(map.getLayoutProperty(CLUSTER_LAYER,'visibility')||'visible')!=='none',trailLayerReady:!!droneTrailGroup,trailLayerVisible:!!droneTrailGroup&&enabled,trailDotsVisible:!!map?.getLayer?.(TRAIL_DOT_LAYER)&&(map.getLayoutProperty(TRAIL_DOT_LAYER,'visibility')||'visible')!=='none',drone3DLayerReady:!!map?.getLayer?.(DRONE_3D_LAYER),drone3DRendererReady:!!droneRenderer&&!!droneScene,currentPositions:lastCurrentRecords.length,modelsRendered:droneModels.size,observedTrailPoints:diagnosticState.historicalTrailPoints,observedTrails:diagnosticState.trailsRendered,sourceStatus:diagnosticState.sourceStatus,simulatedFleet:false,remoteIdConnected:false,emptyModeActive,updatedAt:Date.now()}}
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();