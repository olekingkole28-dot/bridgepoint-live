(()=>{
'use strict';
if(window.__BP_DRONE_AWARENESS_V1__)return;
const VERSION=2;
const SOURCE='bp-drone-awareness-live-source-v2';
const LAYER='bp-drone-awareness-live-dots-v2';
const TRAIL_SOURCE='bp-drone-awareness-trail-source-v2';
const TRAIL_GLOW='bp-drone-awareness-trail-glow-v2';
const TRAIL_LAYER='bp-drone-awareness-trail-lines-v2';
const TRAIL_DOT_SOURCE='bp-drone-awareness-trail-dots-source-v2';
const TRAIL_DOT_LAYER='bp-drone-awareness-trail-dots-v2';
const DRONE_3D_LAYER='bp-drone-awareness-3d-models-v2';
const THREE_URL='./vendor/three.module.js?v=169-local';
const MAX_TRACKED_DRONES=180;
const MAX_TRAIL_POINTS=24;
const TRACK_RETENTION_MS=45*60*1000;
const REFRESH_MS=180000;
const REQUEST_TIMEOUT_MS=9000;
const SUPPORTED_SOURCE='https://api.adsb.lol/v2/';
const WORLD_CIRCUMFERENCE_M=40075016.686;const $=s=>document.querySelector(s);
const emptyFeatureCollection=()=>({type:'FeatureCollection',features:[]});
let map=null,enabled=false,inFlight=false,refreshTimer=0,moveTimer=0,lastFetchAt=0,aborter=null;
let button=null,waterButton=null,waterApi=null,waterPromise=null,waterEnabled=false,pane=null,statusNode=null,summaryNode=null,refreshButton=null;
let trailNoteNode=null,drone3DError=null;
let droneThreePromise=null,droneThree=null,droneScene=null,droneRenderer=null,droneLayer=null,droneTemplate=null;
let droneModels=new Map(),trackedUavs=new Map(),lastCurrentRecords=[];
let droneAnimationFrame=0,lastDroneAnimationAt=0;
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
function writeSummary(positionCount,trackCount){
 if(!summaryNode)return;
 summaryNode.replaceChildren();
 const a=element('div','bp-drone-metric');
 a.append(element('b','',Number(positionCount||0).toLocaleString()),element('span','','Current public UAV positions'));
 const b=element('div','bp-drone-metric');
 b.append(element('b','',String(trackCount||0)),element('span','','Observed flight trails this session'));
 summaryNode.append(a,b);
}
function setLayerVisibility(on){
 if(!map)return false;
 try{
  const ids=[LAYER,TRAIL_GLOW,TRAIL_LAYER,TRAIL_DOT_LAYER];
  for(const id of ids)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none');
  map.triggerRepaint?.();return ids.some(id=>!!map.getLayer(id));
 }catch(e){return false}
}
function installLayer(){
 if(!map||!map.getStyle?.())return false;
 if(typeof map.isStyleLoaded==='function'&&!map.isStyleLoaded())return false;
 try{
  if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:emptyFeatureCollection()});
  if(!map.getSource(TRAIL_SOURCE))map.addSource(TRAIL_SOURCE,{type:'geojson',data:emptyFeatureCollection(),lineMetrics:true});
  if(!map.getSource(TRAIL_DOT_SOURCE))map.addSource(TRAIL_DOT_SOURCE,{type:'geojson',data:emptyFeatureCollection()});
  if(!map.getLayer(TRAIL_GLOW))map.addLayer({id:TRAIL_GLOW,type:'line',source:TRAIL_SOURCE,minzoom:0,layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':'#25dfff','line-opacity':.26,'line-width':['interpolate',['linear'],['zoom'],0,1.1,3,2.1,7,3.4,13,5.2],'line-blur':1.6}});
  if(!map.getLayer(TRAIL_LAYER))map.addLayer({id:TRAIL_LAYER,type:'line',source:TRAIL_SOURCE,minzoom:0,layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':'#9af8ff','line-opacity':.95,'line-width':['interpolate',['linear'],['zoom'],0,1.1,3,1.5,7,2.3,13,3.4]}});
  if(!map.getLayer(TRAIL_DOT_LAYER))map.addLayer({id:TRAIL_DOT_LAYER,type:'circle',source:TRAIL_DOT_SOURCE,minzoom:0,layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,2.2,5,3.1,12,4.1],'circle-color':'#48dfff','circle-opacity':.86,'circle-stroke-color':'#07212c','circle-stroke-width':1.1}});
  if(!map.getLayer(LAYER))map.addLayer({id:LAYER,type:'circle',source:SOURCE,minzoom:0,layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,4.1,3,5,8,6.3,14,8.2],'circle-color':'#f1ffff','circle-opacity':1,'circle-stroke-color':'#19dff5','circle-stroke-width':2.4,'circle-blur':0}});
  return true;
 }catch(e){console.warn('BridgePoint UAV position/trail layers could not attach',e);return false}
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
   droneModels.clear();disposeDroneTemplate();droneScene=null;droneRenderer=null;droneLayer=null;
  }
 };
 try{map.addLayer(layer);droneThree=THREE;drone3DError=null;return!!droneScene}catch(e){console.warn('BridgePoint 3D UAV renderer could not attach',e);return false}
}
function modelSpanMeters(lat,zoom){
 const latitudeScale=Math.max(.12,Math.cos(Number(lat||0)*Math.PI/180));
 const z=Math.max(0,Number(zoom)||0);
 return Math.max(2,Math.min(1800000,15*WORLD_CIRCUMFERENCE_M*latitudeScale/(512*Math.pow(2,z))));
}
function altitudeForRecord(a){
 for(const raw of [a?.alt_geom,a?.alt_baro]){
  if(typeof raw==='string'&&raw.toLowerCase()==='ground')return{meters:3,known:true};
  const n=Number(raw);
  if(raw!==null&&raw!==undefined&&raw!==''&&Number.isFinite(n)&&n>0&&n<60000)return{meters:n*.3048,known:true};
 }
 return{meters:24,known:false};
}
function setDroneModels(records){
 if(!droneScene||!droneTemplate||!droneThree||!map)return;
 const MC=window.maplibregl?.MercatorCoordinate||window.MapLibreGL?.MercatorCoordinate;
 if(!MC?.fromLngLat)return;
 const active=new Set(),zoom=Number(map.getZoom?.()||0);
 for(const a of records.slice(0,MAX_TRACKED_DRONES)){
  const key=a._trackKey,lat=Number(a.lat),lon=Number(a.lon);
  if(!key||!Number.isFinite(lat)||!Number.isFinite(lon))continue;
  const coord=MC.fromLngLat({lng:lon,lat},0),meterUnit=coord.meterInMercatorCoordinateUnits?.()||0;
  if(!Number.isFinite(meterUnit)||meterUnit<=0)continue;
  const altitude=altitudeForRecord(a),span=modelSpanMeters(lat,zoom);
  const position=MC.fromLngLat({lng:lon,lat},Math.max(altitude.meters,span*.42));
  let model=droneModels.get(key);
  if(!model){model=droneTemplate.clone(true);model.name='Public UAV · 3D schematic';model.traverse(o=>{o.frustumCulled=false});droneScene.add(model);droneModels.set(key,model)}
  model.position.set(position.x,position.y,position.z);model.scale.setScalar((span/1.36)*meterUnit);
  const heading=Number(a.track??a.true_heading??a.mag_heading);
  model.rotation.set(0,0,(Number.isFinite(heading)?heading:0)*Math.PI/180-Math.PI/2);
  model.userData.lastAltitudeKnown=altitude.known;active.add(key);
 }
 for(const [key,model] of droneModels)if(!active.has(key)){droneScene.remove(model);droneModels.delete(key)}
 map.triggerRepaint?.();
 if(droneModels.size&&!droneAnimationFrame)droneAnimationFrame=requestAnimationFrame(animateDroneModels);
 if(!droneModels.size&&droneAnimationFrame){cancelAnimationFrame(droneAnimationFrame);droneAnimationFrame=0}
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
 const now=Date.now(),fresh=new Map();
 for(const a of Array.isArray(records)?records:[]){
  if(!isUavRecord(a))continue;
  const lat=Number(a?.lat),lon=Number(a?.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
  const seenAge=Number(a?.seen_pos??a?.seen);if(Number.isFinite(seenAge)&&seenAge>240)continue;
  const rawId=String(a?.hex||a?.icao24||'').trim().toLowerCase();if(!rawId)continue;
  const prior=fresh.get(rawId),age=Number.isFinite(seenAge)?seenAge:999999;
  if(prior&&prior._seenAge<=age)continue;
  const heading=Number(a?.track??a?.true_heading??a?.mag_heading),speed=Number(a?.gs);
  fresh.set(rawId,{...a,lat,lon,track:Number.isFinite(heading)?heading:null,gs:Number.isFinite(speed)?speed:null,_trackKey:rawId,_seenAge:age});
 }
 const current=[...fresh.values()].slice(0,MAX_TRACKED_DRONES),activeKeys=new Set();
 for(const a of current){
  const key=a._trackKey,track=trackedUavs.get(key)||{points:[],lastSeen:0,current:null},next=[a.lon,a.lat];
  const last=track.points[track.points.length-1];
  if(last){const jump=Math.abs(next[0]-last.coord[0])>180?Infinity:distanceMeters(last.coord,next);if(jump>45000)track.points=[]}
  const previous=track.points[track.points.length-1];
  if(!previous||distanceMeters(previous.coord,next)>12){
   track.points.push({coord:next,at:now});
   if(track.points.length>MAX_TRAIL_POINTS)track.points.splice(0,track.points.length-MAX_TRAIL_POINTS);
  }
  track.lastSeen=now;track.current=a;trackedUavs.set(key,track);activeKeys.add(key);
 }
 for(const [key,track] of trackedUavs)if(now-track.lastSeen>TRACK_RETENTION_MS)trackedUavs.delete(key);
 const allCurrent=[...trackedUavs.entries()].filter(([key,t])=>activeKeys.has(key)&&t.current).map(([,t])=>t.current);
 const currentFeatures=allCurrent.map(a=>({type:'Feature',geometry:{type:'Point',coordinates:[a.lon,a.lat]},properties:{altitude_known:altitudeForRecord(a).known}}));
 const trailFeatures=[],trailDots=[];
 for(const track of trackedUavs.values()){
  const points=track.points;
  if(points.length>1)trailFeatures.push({type:'Feature',geometry:{type:'LineString',coordinates:points.map(p=>p.coord)},properties:{}});
  for(const p of points.slice(0,-1))trailDots.push({type:'Feature',geometry:{type:'Point',coordinates:p.coord},properties:{}});
 }
 const fc=features=>({type:'FeatureCollection',features});
 map.getSource(SOURCE)?.setData(fc(currentFeatures));map.getSource(TRAIL_SOURCE)?.setData(fc(trailFeatures));map.getSource(TRAIL_DOT_SOURCE)?.setData(fc(trailDots));
 lastCurrentRecords=allCurrent;setDroneModels(allCurrent);writeSummary(allCurrent.length,trailFeatures.length);
 if(trailNoteNode)trailNoteNode.textContent='Trails connect positions BridgePoint has sampled while this button is on (up to '+MAX_TRAIL_POINTS+' observations per aircraft). They are not a continuous replay of the complete flight.';
 map.triggerRepaint?.();return{positions:allCurrent.length,trails:trailFeatures.length,sampledReports:fresh.size};
}
function clearTrackedUavs(){
 trackedUavs.clear();lastCurrentRecords=[];
 for(const id of [SOURCE,TRAIL_SOURCE,TRAIL_DOT_SOURCE])try{map?.getSource(id)?.setData(emptyFeatureCollection())}catch(_){}
 for(const model of droneModels.values())try{droneScene?.remove(model)}catch(_){}
 droneModels.clear();writeSummary(0,0);
 if(droneAnimationFrame){cancelAnimationFrame(droneAnimationFrame);droneAnimationFrame=0}
 map?.triggerRepaint?.();
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
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
 requestControllers.add(controller);
 try{
  const url=SUPPORTED_SOURCE+'lat/'+encodeURIComponent(sample.lat.toFixed(4))+'/lon/'+encodeURIComponent(sample.lon.toFixed(4))+'/dist/'+REGION_RADIUS_NM;
  const response=await fetch(url,{method:'GET',cache:'no-store',signal:controller.signal,headers:{'Accept':'application/json'}});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const data=await response.json();
  return{sample,ok:true,records:Array.isArray(data?.ac)?data.ac:[],receivedAt:Date.now()};
 }catch(error){
  return{sample,ok:false,records:[],error:error?.name==='AbortError'?'timed out':String(error?.message||error)};
 }finally{clearTimeout(timer);requestControllers.delete(controller)}
}
async function fetchGlobalSamples(){
 const results=[];
 // Small batches avoid bursts against a public community service with dynamic rate limits.
 for(let i=0;i<GLOBAL_SAMPLES.length;i+=3){
  if(!enabled)throw new Error('Drone Awareness was turned off');
  const batch=await Promise.all(GLOBAL_SAMPLES.slice(i,i+3).map(getSample));
  results.push(...batch);
  showStatus('Sampling public ADS-B coverage hubs: '+results.length+'/'+GLOBAL_SAMPLES.length+' regional windows checked…');
 }
 return results;
}
async function refresh(force=false){
 if(!enabled||!map||inFlight)return;
 const remaining=15000-(Date.now()-lastFetchAt);
 if(!force&&remaining>0){showStatus('Public source refresh is briefly rate-limited. Next refresh is available in '+Math.ceil(remaining/1000)+' seconds.');return}
 if(force&&remaining>0){showStatus('Please wait '+Math.ceil(remaining/1000)+' seconds before refreshing public coverage.');return}
 inFlight=true;lastFetchAt=Date.now();if(refreshButton)refreshButton.disabled=true;
 showStatus('Sampling public UAV-class ADS-B positions across the global coverage hubs…');
 try{
  const samples=await fetchGlobalSamples();if(!enabled)return;
  const good=samples.filter(s=>s.ok),records=good.flatMap(s=>s.records),c=centerAndZoom();
  if(c&&c.zoom>=6){const localResult=await getSample({id:'Current map view',lat:c.lat,lon:c.lon});if(localResult.ok)records.push(...localResult.records)}
  if(!enabled)return;
  const result=updateTrackedUavs(records),now=new Date();
  const coverage=good.length?'Updated '+now.toLocaleTimeString()+' · '+result.positions+' current UAV-class positions · '+result.trails+' observed trails · '+good.length+'/'+GLOBAL_SAMPLES.length+' regional sample windows responded.':'No public sample windows responded. No aircraft are drawn from invented or cached demonstration positions.';
  if(drone3DError)showStatus(coverage+' 3D model renderer unavailable: '+drone3DError,'error');else showStatus(coverage,good.length?'ok':'error');
  const feedMeta=$('#bp-drone-feed-meta');
  if(feedMeta)feedMeta.textContent='Public ADS-B source sample: '+good.length+'/'+GLOBAL_SAMPLES.length+' regional windows responded; each hub request covers up to '+REGION_RADIUS_NM+' nautical miles. Coverage is incomplete and limited to UAV-class aircraft broadcasting ADS-B.';
  if(result.positions===0&&good.length)showStatus('No current UAV-class ADS-B positions were returned from the responding sample regions. The map is ready; no simulated drones are substituted.','info');
 }catch(error){if(enabled)showStatus('Live public ADS-B data unavailable: '+String(error?.message||error)+'. The map remains usable; no fabricated positions or tracks are displayed.','error')}
 finally{inFlight=false;if(refreshButton)refreshButton.disabled=false}
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
async function toggle(){
 if(!map){openDronePanel();showStatus('BridgePoint globe is still initializing. The control is ready; wait for the map to finish loading and press again.','error');return}
 enabled=!enabled;updateButton();openDronePanel();
 if(enabled){
  if(!installLayer()){showStatus('The map style is still initializing. Press Drone Awareness again once the globe finishes loading.','error');enabled=false;updateButton();return}
  setLayerVisibility(true);
  try{
   const THREE=await loadDroneThree();
   if(!ensureDrone3DLayer(THREE))throw new Error('3D drone layer could not attach to the globe');
   if(lastCurrentRecords.length)setDroneModels(lastCurrentRecords);
  }catch(error){drone3DError=String(error?.message||error);showStatus('Public UAV position dots and trails are enabled, but the 3D model renderer could not initialize: '+drone3DError,'error')}
  window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('drones',true);
  if(!droneScene&&!drone3DError)showStatus('Drone Awareness is on. Public position dots and sampled trails are enabled; 3D model setup is being retried.','info');
  else if(droneScene)showStatus('Drone Awareness is on. Live public UAV reports render as enlarged 3D quadcopters with observed position trails.','info');
  clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(enabled&&!document.hidden)void refresh(false)},REFRESH_MS);
  void refresh(false);
 }else{
  clearInterval(refreshTimer);clearTimeout(moveTimer);aborter?.abort();
  for(const controller of requestControllers)try{controller.abort()}catch(_){}
  requestControllers.clear();setLayerVisibility(false);clearTrackedUavs();removeDrone3DLayer();
  window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('drones',false);
  showStatus('Drone Awareness is off. Sampled positions and trails from this session were cleared; no background regional requests are running.');
 }
}
function createPane(panel){
 if(!panel)return null;
 let existing=panel.querySelector('[data-bpv-pane="drones"]');if(existing)return existing;
 const p=element('section','bp-drone-pane');p.dataset.bpvPane='drones';p.hidden=true;
 p.append(element('div','bp-drone-headline','OPT-IN · LIVE PUBLIC UAV POSITIONS + 3D TRACKS'));
 p.append(element('div','bp-drone-feed-note','3D quadcopter models are placed at source-reported UAV positions and headings. Model size is amplified at whole-Earth zoom so aircraft are visible; this is a display scale, not the aircraft’s physical size.'));
 p.append(element('div','bp-drone-feed-note','DATA LIMIT · Only public UAV-class ADS-B reports are represented. The public feed is sampled from 13 regional hubs (plus a local-area sample at close zoom); it is not a complete worldwide drone registry. Most consumer drones do not broadcast ADS-B. Remote ID receiver networks are not scraped or accessed without permission.'));
 const summary=element('div','bp-drone-summary');summary.id='bp-drone-summary-v2';summary.append(element('div','bp-drone-metric'));summary.append(element('div','bp-drone-metric'));p.append(summary);summaryNode=summary;
 const status=element('div','bp-drone-status','Drone Awareness is off. Press the button to load public UAV positions and observed trails.');status.id='bp-drone-status-v2';status.dataset.kind='info';p.append(status);statusNode=status;
 const actions=element('div','bp-drone-actions');
 const refreshBtn=element('button','bpv-wide-action','REFRESH GLOBAL UAV SAMPLE');refreshBtn.type='button';refreshBtn.addEventListener('click',()=>void refresh(true));actions.append(refreshBtn);refreshButton=refreshBtn;
 const off=element('button','bpv-wide-action','TURN DRONE AWARENESS OFF');off.type='button';off.addEventListener('click',()=>{if(enabled)void toggle();else{updateButton();showStatus('Drone Awareness is already off.')}});actions.append(off);p.append(actions);
 const meta=element('div','bp-drone-feed-note','Positions and tracks refresh every 3 minutes while enabled. Trails are built only from observations BridgePoint receives during this session; they are not a continuous or guaranteed complete flight history.');meta.id='bp-drone-feed-meta';p.append(meta);
 trailNoteNode=element('div','bp-drone-feed-note','Observed trail points accumulate after successive public feed updates.');p.append(trailNoteNode);
 const source=element('div','bp-drone-footnote');source.append(document.createTextNode('Source: '));
 const link=element('a','bp-drone-source','ADSB.lol API documentation');link.href='https://api.adsb.lol/docs/open-data/api/';link.target='_blank';link.rel='noopener noreferrer';source.append(link);
 source.append(document.createTextNode(' · ODbL 1.0. Position dots show public broadcast locations; aircraft identifiers and pilot/control-station locations are not displayed. No Remote ID radio interception or raw RF scanning.'));
 p.append(source);panel.append(p);writeSummary(0,0);return p;
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
 addStyle();addButton();
 const panel=$('#bpv-sidecar');if(panel){pane=createPane(panel)}
 const current=worldMap();
 if(current){
  if(map!==current){
   map=current;installEmptyMode(map);
   map.on?.('style.load',()=>{
    installLayer();
    if(enabled){
     void loadDroneThree().then(THREE=>{if(ensureDrone3DLayer(THREE))setDroneModels(lastCurrentRecords)}).catch(e=>{drone3DError=String(e?.message||e);showStatus('3D drone renderer unavailable after map style reload: '+drone3DError,'error')});
     void refresh(false);
    }
   });
   map.on?.('moveend',()=>{if(!enabled)return;setDroneModels(lastCurrentRecords);clearTimeout(moveTimer);moveTimer=setTimeout(()=>void refresh(false),1800)});
   map.on?.('zoomend',()=>{if(enabled)setDroneModels(lastCurrentRecords)});
  }
  installLayer();
  if(enabled&&Number(map.getZoom?.()||0)>=4.7&&!inFlight)void refresh(false);
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
  aggregation:'13 regional public ADS-B sample windows; individual UAV-class positions; bounded session-sampled trails',
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
  get state(){return{enabled,mapReady:!!map,zoom:map?.getZoom?.()??null,layerReady:!!map?.getLayer?.(LAYER),layerVisible:!!map?.getLayer?.(LAYER)&&(map.getLayoutProperty(LAYER,'visibility')||'visible')!=='none',trailLayerReady:!!map?.getLayer?.(TRAIL_LAYER),trailLayerVisible:!!map?.getLayer?.(TRAIL_LAYER)&&(map.getLayoutProperty(TRAIL_LAYER,'visibility')||'visible')!=='none',trailDotsVisible:!!map?.getLayer?.(TRAIL_DOT_LAYER)&&(map.getLayoutProperty(TRAIL_DOT_LAYER,'visibility')||'visible')!=='none',drone3DLayerReady:!!map?.getLayer?.(DRONE_3D_LAYER),drone3DRendererReady:!!droneRenderer&&!!droneScene,currentPositions:lastCurrentRecords.length,observedTrails:[...trackedUavs.values()].filter(t=>t.points.length>1).length,simulatedFleet:false,emptyModeActive,updatedAt:Date.now()}}
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();