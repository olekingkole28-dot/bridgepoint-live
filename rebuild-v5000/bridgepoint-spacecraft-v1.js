/* BridgePoint Spacecraft & Launch Sites v1 — NASA Mobile Launcher + true-scale SLS Block 1 visualization.
 * NASA's Mobile Launcher is a textured, BridgePoint-hosted GLB. The SLS stack is an explicitly
 * disclosed dimensions-based BridgePoint model built from NASA-published Block 1 dimensions;
 * this first release is NOT a photogrammetry scan.
 */
const VERSION=1;
const THREE_URL='/vendor/three.module.js?v=169-local';
const GLTF_URL='/vendor/GLTFLoader.bundle.js?v=169-local';
const DRACO_URL='/vendor/DRACOLoader.bundle.js?v=169-draco-v1';
const MOBILE_LAUNCHER_ASSET='/assets/spacecraft/nasa-mobile-launcher.glb';
const MAP_LAYER_ID='bp-spacecraft-launchsite-native-v1';
const CONTROL_ID='bp-spacecraft-control-v1';
const TOGGLE_ID='bp-spacecraft-toggle-v1';
const COUNT_ID='bp-spacecraft-count-v1';
const STATUS_ID='bp-spacecraft-status-v1';
const MARKER_CLASS='bp-spacecraft-launchsite-marker-v1';
const MODEL={
 id:'sls-block-1-mobile-launcher-39b',
 name:'NASA Space Launch System (SLS) Block 1 + Mobile Launcher 1',
 label:'SLS · MOBILE LAUNCHER',
 vehicle:'NASA SLS Block 1 with Orion spacecraft',
 site:'Launch Complex 39B, Kennedy Space Center, Florida, USA',
 coordinates:[-80.620869,28.627306],
 coordinateText:'Approx. 28.627306° N, 80.620869° W',
 launchConfiguration:'SLS Block 1 / Artemis I configuration',
 rocketHeightM:98.3,
 coreStageLengthM:64.6,
 coreStageDiameterM:8.4,
 boosterLengthM:54.0,
 boosterDiameterM:3.66,
 mobileLauncherHeightM:115.824,
 mobileLauncherBaseLengthM:50.292,
 mobileLauncherBaseWidthM:41.148,
 mobileLauncherDeckHeightM:14.3256,
 mobileLauncherScale:115.824/(246.4329071044922*0.01),
 modelLicense:'NASA public-domain government work; source is a NASA 3D model, not a photogrammetry scan',
 rocketRepresentation:'BridgePoint dimensions-based SLS Block 1 visualization. Overall height and major stage dimensions follow NASA-published figures; detailed geometry, surface markings, fasteners and the Orion/LAS assembly are illustrative, not a NASA photogrammetry reconstruction.',
 placementPrecision:'The map pin is an approximate Launch Complex 39B pad-centre reference. NASA’s source Mobile Launcher GLB has no published geodetic origin or true-north transform. BridgePoint centers the launcher footprint on the site reference and places the SLS beside the tower using the source model geometry; the placement is visualization-grade, not survey-controlled.',
 sourceModelUrl:'https://science.nasa.gov/3d-resources/mobile-launcher/',
 sourceModelRepositoryUrl:'https://github.com/nasa/NASA-3D-Resources',
 sourceSlsUrl:'https://science.nasa.gov/3d-resources/space-launch-system-sls/',
 sourceGroundSystemsUrl:'https://www.nasa.gov/humans-in-space/exploration-ground-systems/mobile-launcher/',
 sourceRocketSpecsUrl:'https://www.nasa.gov/reference/space-launch-system/',
 sourceDimensionsUrl:'https://www.nasa.gov/reference/space-launch-system/'
};
export const SPACECRAFT_LAUNCH_SITE=MODEL;
export function buildSlsBlock1Dimensions(){
 return {totalHeightM:MODEL.rocketHeightM,coreStageHeightM:MODEL.coreStageLengthM,boosterHeightM:MODEL.boosterLengthM,mobileLauncherHeightM:MODEL.mobileLauncherHeightM};
}
const stateByMap=new WeakMap();
let threePromise=null;
function safe(value){
 return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function mapOf(target){return target&&(target.map||target);}
async function loadThree(){
 if(!threePromise)threePromise=Promise.all([import(THREE_URL),import(GLTF_URL),import(DRACO_URL)]).then(([THREE,gltf,draco])=>{
  if(!THREE?.WebGLRenderer||!gltf?.GLTFLoader||!draco?.DRACOLoader)throw new Error('BridgePoint local Three.js, GLTFLoader or DRACOLoader is unavailable');
  return {THREE,GLTFLoader:gltf.GLTFLoader,DRACOLoader:draco.DRACOLoader};
 }).catch(error=>{threePromise=null;throw error;});
 return threePromise;
}
function configureLoader(state){
 const loader=new state.GLTFLoader();
 if(!state.dracoLoader){
  state.dracoLoader=new state.DRACOLoader();
  state.dracoLoader.setDecoderPath('/vendor/draco/');
  state.dracoLoader.setWorkerLimit(2);
 }
 loader.setDRACOLoader(state.dracoLoader);
 return loader;
}
function material(THREE,color,roughness=0.72,metalness=0){
 return new THREE.MeshStandardMaterial({color,roughness,metalness});
}
function addCylinder(THREE,group,top,bottom,height,y,mat,segments=40){
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,segments,1,false),mat);
 mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function makeSlsBlock1(THREE){
 const root=new THREE.Group();root.name='BridgePoint SLS Block 1 — dimensions-based visualization';
 const orange=material(THREE,0xf07822,0.86,0.02);
 const orangeLight=material(THREE,0xff8a32,0.86,0.02);
 const white=material(THREE,0xe8e9e5,0.45,0.04);
 const whiteBooster=material(THREE,0xf0eee7,0.55,0.03);
 const dark=material(THREE,0x242b31,0.48,0.35);
 const metal=material(THREE,0x9aa4a8,0.32,0.68);
 const black=material(THREE,0x151b20,0.45,0.16);
 const gold=material(THREE,0xd5a24a,0.44,0.35);
 const coreH=MODEL.coreStageLengthM,coreR=MODEL.coreStageDiameterM/2;
 addCylinder(THREE,root,coreR,coreR,coreH,coreH/2,orange,64);
 // Intertank band and upper interstage.
 addCylinder(THREE,root,coreR+0.04,coreR+0.04,1.15,coreH-0.60,dark,64);
 addCylinder(THREE,root,3.2,coreR,4.0,coreH+2.0,white,56);
 // Core-stage forward adapter / ICPS upper stage.
 addCylinder(THREE,root,3.18,3.18,13.7,68.6+6.85,white,56);
 addCylinder(THREE,root,3.22,3.18,0.55,82.0,dark,56);
 // Orion service module and crew module.
 addCylinder(THREE,root,2.45,2.85,2.3,83.45,metal,48);
 addCylinder(THREE,root,2.35,2.45,0.30,84.75,gold,48);
 const capsule=new THREE.Mesh(new THREE.ConeGeometry(2.35,1.9,48,1,false),white);
 capsule.position.y=85.85;capsule.castShadow=true;root.add(capsule);
 const capsuleBand=addCylinder(THREE,root,1.45,1.75,0.20,85.05,dark,48);
 // Launch Abort System mast above the Orion capsule; narrow truss + escape motor fairing.
 const lasBase=addCylinder(THREE,root,0.62,1.1,0.7,87.15,white,32);
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.34,7.0,16),white);
 mast.position.y=91.0;root.add(mast);
 const nose=new THREE.Mesh(new THREE.ConeGeometry(0.38,3.6,24),white);
 nose.position.y=96.3;root.add(nose);
 // Two five-segment solid rocket boosters, 54 m long and 3.66 m in diameter.
 for(const side of [-1,1]){
  const x=side*6.65;
  const booster=new THREE.Group();booster.name=side<0?'SLS left solid rocket booster':'SLS right solid rocket booster';
  const body=addCylinder(THREE,booster,MODEL.boosterDiameterM/2,MODEL.boosterDiameterM/2,49.8,24.9,whiteBooster,40);
  const noseCone=new THREE.Mesh(new THREE.ConeGeometry(MODEL.boosterDiameterM/2,4.2,40),whiteBooster);
  noseCone.position.y=51.9;booster.add(noseCone);
  const nozzle=new THREE.Mesh(new THREE.ConeGeometry(1.12,2.6,32),dark);
  nozzle.rotation.x=Math.PI;nozzle.position.y=-1.3;booster.add(nozzle);
  const topRing=addCylinder(THREE,booster,1.84,1.84,0.65,49.5,dark,40);
  booster.position.x=x;root.add(booster);
 }
 // Five RS-25 engine bells under the core stage.
 const enginePositions=[[0,0],[1.72,0],[-1.72,0],[0,1.72],[0,-1.72]];
 for(const [x,z] of enginePositions){
  const bell=new THREE.Mesh(new THREE.CylinderGeometry(0.62,1.0,2.1,28,1,true),metal);
  bell.position.set(x,-1.0,z);bell.castShadow=true;root.add(bell);
  const throat=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.58,0.45,28),black);
  throat.position.set(x,-2.0,z);root.add(throat);
 }
 // Modest, non-branded separation stripes add legibility without inventing NASA logos.
 const accent=addCylinder(THREE,root,coreR+0.06,coreR+0.06,0.16,coreH*0.56,gold,64);
 accent.material=gold;
 return root;
}
function sampleLauncherTowerCenter(group,root,THREE,bounds){
 const h=bounds.max.y-bounds.min.y;
 const threshold=bounds.min.y+h*0.60;
 const point=new THREE.Vector3();
 let sx=0,sz=0,count=0;
 root.traverse(object=>{
  if(!object.isMesh||!object.geometry?.attributes?.position)return;
  const attr=object.geometry.attributes.position;
  const stride=Math.max(1,Math.floor(attr.count/18000));
  for(let i=0;i<attr.count;i+=stride){
   point.fromBufferAttribute(attr,i);
   object.localToWorld(point);
   group.worldToLocal(point);
   if(point.y>=threshold){sx+=point.x;sz+=point.z;count++;}
  }
 });
 if(!count)return {x:bounds.getCenter(new THREE.Vector3()).x,z:bounds.getCenter(new THREE.Vector3()).z};
 return {x:sx/count,z:sz/count};
}
async function loadLaunchScene(state){
 if(state.launchGroup)return state.launchGroup;
 if(state.launchPromise)return state.launchPromise;
 state.launchPromise=(async()=>{
  const pair=await loadThree();
  if(state.destroyed)throw new Error('Spacecraft layer was closed');
  state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;state.DRACOLoader=pair.DRACOLoader;
  const response=await fetch(MOBILE_LAUNCHER_ASSET,{cache:'force-cache'});
  if(!response.ok)throw new Error('BridgePoint Mobile Launcher asset request failed ('+response.status+')');
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength<24||new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('BridgePoint Mobile Launcher file is not a valid binary glTF');
  const gltf=await configureLoader(state).parseAsync(buffer,'');
  if(!gltf?.scene)throw new Error('NASA Mobile Launcher GLB contains no scene');
  const group=new pair.THREE.Group();group.name='BridgePoint launch-site scene — NASA Mobile Launcher 1 + SLS Block 1';
  const launcher=gltf.scene.clone(true);launcher.name='NASA Mobile Launcher 1 — original textured GLB';
  const rawBounds=new pair.THREE.Box3().setFromObject(launcher);
  if(rawBounds.isEmpty())throw new Error('NASA Mobile Launcher geometry is empty');
  const rawSize=rawBounds.getSize(new pair.THREE.Vector3());
  if(!Number.isFinite(rawSize.y)||rawSize.y<=0)throw new Error('NASA Mobile Launcher source height is invalid');
  const scale=MODEL.mobileLauncherHeightM/rawSize.y;
  launcher.scale.multiplyScalar(scale);
  group.add(launcher);group.updateMatrixWorld(true);
  let worldBounds=new pair.THREE.Box3().setFromObject(launcher);
  if(worldBounds.isEmpty())throw new Error('Scaled NASA Mobile Launcher geometry is empty');
  const originalCenter=worldBounds.getCenter(new pair.THREE.Vector3());
  launcher.position.x-=originalCenter.x;
  launcher.position.z-=originalCenter.z;
  launcher.position.y-=worldBounds.min.y;
  group.updateMatrixWorld(true);
  worldBounds=new pair.THREE.Box3().setFromObject(launcher);
  const tower=sampleLauncherTowerCenter(group,launcher,pair.THREE,worldBounds);
  // Put the SLS beside the tower on the launcher deck. The offset uses the tower's
  // actual high-level mesh centroid, not an arbitrary screen-space location.
  let dx=-tower.x,dz=-tower.z;
  let distance=Math.hypot(dx,dz);
  if(!Number.isFinite(distance)||distance<0.5){dx=1;dz=0;distance=1;}
  const rocketOffset=11.25;
  const rocketX=tower.x+(dx/distance)*rocketOffset;
  const rocketZ=tower.z+(dz/distance)*rocketOffset;
  const rocket=makeSlsBlock1(pair.THREE);
  // Keep the two boosters transverse to the tower-to-vehicle separation axis.
  rocket.rotation.y=Math.atan2(dx,dz);
  rocket.position.set(rocketX,MODEL.mobileLauncherDeckHeightM,rocketZ);
  group.add(rocket);group.updateMatrixWorld(true);
  group.traverse(object=>{if(object.isMesh)object.frustumCulled=false;});
  const fullBounds=new pair.THREE.Box3().setFromObject(group);
  const size=fullBounds.getSize(new pair.THREE.Vector3());
  state.launchGroup=group;
  state.launchBounds={x:size.x,y:size.y,z:size.z};
  state.launcherHeightM=worldBounds.max.y-worldBounds.min.y;
  state.stats.assetLoaded=true;
  state.stats.launcherHeightM=state.launcherHeightM;
  state.stats.sceneBounds={x:size.x,y:size.y,z:size.z};
  state.modelStatus='BridgePoint-hosted NASA Mobile Launcher GLB loaded with embedded color textures; the SLS Block 1 is a dimensions-based BridgePoint model.';
  updateStatus(state,state.modelStatus);
  return group;
 })().catch(error=>{state.launchPromise=null;throw error;});
 return state.launchPromise;
}
function nativeMapMatrix(map,THREE,coordinates,altitudeM){
 try{
  const raw=map.transform?.getMatrixForModel?.([Number(coordinates[0]),Number(coordinates[1])],Number(altitudeM)||0);
  if(raw&&raw.length>=16)return new THREE.Matrix4().fromArray(raw);
  const Mercator=window.maplibregl?.MercatorCoordinate;
  if(!Mercator?.fromLngLat)return null;
  const mc=Mercator.fromLngLat([Number(coordinates[0]),Number(coordinates[1])],Number(altitudeM)||0);
  const metres=mc.meterInMercatorCoordinateUnits();
  if(![mc.x,mc.y,mc.z,metres].every(Number.isFinite)||metres<=0)return null;
  return new THREE.Matrix4().set(metres,0,0,mc.x,0,0,metres,mc.y,0,metres,0,0,0,0,0,1);
 }catch(_){return null;}
}
function updateAltitude(state){
 try{
  const value=state.map.queryTerrainElevation?.(MODEL.coordinates,{exaggerated:false});
  if(Number.isFinite(Number(value)))state.altitudeM=Number(value);
 }catch(_){}
}
function ensureNativeLayer(state){
 const map=state.map,THREE=state.THREE;
 if(!THREE||!state.launchGroup||state.destroyed||!map?.getStyle?.())return false;
 if(map.getLayer(MAP_LAYER_ID)&&state.mapRenderer&&state.mapScene)return true;
 const layer={
  id:MAP_LAYER_ID,type:'custom',renderingMode:'3d',
  onAdd(mapRef,gl){
   state.mapRenderer=new THREE.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
   state.mapRenderer.autoClear=false;
   state.mapRenderer.outputColorSpace=THREE.SRGBColorSpace;
   state.mapScene=new THREE.Scene();
   state.mapScene.add(new THREE.AmbientLight(0xffffff,2.0));
   const key=new THREE.DirectionalLight(0xffffff,1.2);key.position.set(-25,80,45);state.mapScene.add(key);
   state.mapCamera=new THREE.Camera();
   if(state.launchGroup&&state.launchGroup.parent!==state.mapScene)state.mapScene.add(state.launchGroup);
   state.stats.nativeLayerReady=true;
  },
  render(_gl,args){
   if(!state.enabled||!state.modelVisible||!state.launchGroup||!state.mapRenderer||!state.mapScene||!state.mapCamera)return;
   if(Number(map.getZoom?.()||0)<12.0){state.launchGroup.visible=false;return;}
   try{const bounds=map.getBounds?.();if(bounds&&!bounds.contains(MODEL.coordinates)){state.launchGroup.visible=false;return;}}catch(_){}
   updateAltitude(state);
   const raw=args&&(args.defaultProjectionData?.mainMatrix||args.modelViewProjectionMatrix);
   if(!raw||raw.length<16)return;
   const matrix=nativeMapMatrix(map,THREE,MODEL.coordinates,state.altitudeM);
   if(!matrix){state.launchGroup.visible=false;return;}
   state.launchGroup.visible=true;
   state.mapCamera.projectionMatrix.copy(new THREE.Matrix4().fromArray(raw)).multiply(matrix);
   try{state.mapRenderer.resetState();state.mapRenderer.render(state.mapScene,state.mapCamera);}
   catch(error){if(!state.stats.renderWarning){state.stats.renderWarning=true;console.warn('BridgePoint spacecraft native launch-site renderer',error);}}
   finally{state.launchGroup.visible=false;}
  },
  onRemove(){
   try{state.mapRenderer?.dispose();}catch(_){}
   state.mapRenderer=null;state.mapScene=null;state.mapCamera=null;state.stats.nativeLayerReady=false;
  }
 };
 try{map.addLayer(layer);return true;}
 catch(error){state.stats.nativeLayerError=String(error?.message||error);return false;}
}
async function showOnPad(state){
 if(!state.enabled)return false;
 state.modelVisible=true;
 updateStatus(state,'Loading the BridgePoint-hosted NASA Mobile Launcher and SLS Block 1 scene…');
 try{
  await loadLaunchScene(state);
  if(state.destroyed||!state.enabled)return false;
  updateAltitude(state);
  if(!ensureNativeLayer(state))throw new Error('MapLibre native 3D launch-site layer could not attach');
  if(!state.mapRenderer)throw new Error('MapLibre WebGL renderer is unavailable');
  if(state.mapScene&&state.launchGroup.parent!==state.mapScene)state.mapScene.add(state.launchGroup);
  state.map.triggerRepaint?.();
  state.modelStatus='The color Mobile Launcher GLB and true-dimension SLS Block 1 scene are hosted by BridgePoint. Globe placement is anchored to the approximate LC-39B site reference and current terrain elevation.';
  updateStatus(state,state.modelStatus);
  return true;
 }catch(error){
  state.modelVisible=false;state.modelAutoAttempted=false;
  state.modelStatus='Native launch-site model could not load: '+String(error?.message||error);
  updateStatus(state,state.modelStatus);
  return false;
 }
}
function updateStatus(state,message){
 state.status=String(message||'');
 const node=document.getElementById(STATUS_ID);if(node)node.textContent=state.status;
 const popup=state.popup?.getElement?.()?.querySelector('[data-spacecraft-status]');
 if(popup)popup.textContent=state.modelStatus||state.status;
}
function makeRocketIcon(){
 const node=document.createElement('span');
 node.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M32 4c-7 7-10 19-10 31l-9 10v8l14-6h10l14 6v-8l-9-10C42 23 39 11 32 4Z" fill="currentColor" stroke="#fff0c2" stroke-width="2" stroke-linejoin="round"/><path d="M23 38 14 54l12-5M41 38l9 16-12-5M27 47l5 13 5-13" fill="#ee7835" stroke="#fff0c2" stroke-width="1.3" stroke-linejoin="round"/><circle cx="32" cy="25" r="4.2" fill="#24475c" stroke="#fff0c2" stroke-width="1.2"/></svg>';
 return node.firstElementChild;
}
function ensurePersistentMarker(state,visible=state.enabled){
 const Marker=window.maplibregl?.Marker;if(typeof Marker!=='function')return false;
 try{
  if(!state.domMarker){
   const element=document.createElement('button');element.type='button';element.className=MARKER_CLASS;
   element.setAttribute('aria-label','NASA Space Launch System and Mobile Launcher at Kennedy Space Center Pad 39B. Open BridgePoint 3D card.');
   element.title='NASA SLS Block 1 + Mobile Launcher 1 · Pad 39B · open BridgePoint 3D card';
   element.appendChild(makeRocketIcon());
   element.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(state.enabled)openPopup(state,MODEL.coordinates);});
   state.domMarkerElement=element;state.domMarker=new Marker({element,anchor:'center',offset:[0,0]});
  }
  state.domMarker.setLngLat(MODEL.coordinates).addTo(state.map);
  const element=state.domMarker.getElement?.()||state.domMarkerElement;
  if(element){element.hidden=!visible;element.setAttribute('aria-hidden',String(!visible));element.disabled=!visible;}
  state.stats.markerReady=true;state.stats.markerVisible=!!visible;return true;
 }catch(error){state.stats.markerError=String(error?.message||error);return false;}
}
function maybeAutoMaterialize(state){
 if(!state.enabled)return false;
 if(Number(state.map.getZoom?.()||0)<12.0)return false;
 try{const bounds=state.map.getBounds?.();if(bounds&&!bounds.contains(MODEL.coordinates))return false;}catch(_){}
 if(state.launchGroup){
  state.modelVisible=true;
  if(!ensureNativeLayer(state))return false;
  if(state.mapScene&&state.launchGroup.parent!==state.mapScene)state.mapScene.add(state.launchGroup);
  state.map.triggerRepaint?.();return true;
 }
 if(state.launchPromise||state.modelAutoAttempted)return false;
 state.modelAutoAttempted=true;state.modelVisible=true;void showOnPad(state);return true;
}
function mountCardViewer(state,popup){
 const popupRoot=popup?.getElement?.();
 const host=popupRoot?.querySelector('[data-bp-local-spacecraft-viewer]');
 if(!host)return;
 let disposed=false,renderer=null,resizeObserver=null,frame=0,model=null,camera=null,scene=null,resizeHandler=null;
 let distance=190,lastX=0,lastY=0,dragging=false;
 const clean=()=>{
  if(disposed)return;disposed=true;
  if(frame)cancelAnimationFrame(frame);
  resizeObserver?.disconnect();if(resizeHandler)window.removeEventListener('resize',resizeHandler);
  try{renderer?.dispose();}catch(_){}
  try{scene?.clear?.();}catch(_){}
 };
 popup.on?.('close',clean);
 const fail=error=>{if(!disposed&&host.isConnected)host.innerHTML='<div class="bp-spacecraft-viewer-error">BridgePoint 3D viewer could not start: '+safe(error?.message||error)+'</div>';};
 (async()=>{
  try{
   const pair=await loadThree();if(disposed||!host.isConnected)return;
   await loadLaunchScene(state);if(disposed||!host.isConnected)return;
   const THREE=pair.THREE,canvas=document.createElement('canvas');
   canvas.style.touchAction='none';canvas.style.cursor='grab';
   canvas.setAttribute('aria-label','Interactive BridgePoint SLS Block 1 and NASA Mobile Launcher 3D viewer. Drag to rotate; pinch or scroll to zoom.');
   host.replaceChildren(canvas);
   renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
   renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
   scene=new THREE.Scene();scene.background=new THREE.Color(0x04111c);
   camera=new THREE.PerspectiveCamera(38,1,0.1,2500);
   scene.add(new THREE.AmbientLight(0xffffff,1.55));
   const key=new THREE.DirectionalLight(0xffedce,1.6);key.position.set(-40,100,70);scene.add(key);
   const fill=new THREE.DirectionalLight(0x8ebbd3,0.65);fill.position.set(40,20,-60);scene.add(fill);
   model=state.launchGroup.clone(true);model.visible=true;model.traverse(object=>{object.frustumCulled=false;});
   scene.add(model);
   const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
   const target=bounds.getCenter(new THREE.Vector3());
   distance=Math.max(size.x,size.y,size.z)*1.62;
   const spherical={theta:0.72,phi:1.06};
   const resize=()=>{
    if(disposed||!renderer||!camera)return;
    const width=Math.max(1,host.clientWidth||340),height=Math.max(1,host.clientHeight||255);
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
   };
   resize();resizeHandler=resize;window.addEventListener('resize',resizeHandler);
   if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);}
   const updateCamera=()=>{
    spherical.phi=Math.max(0.08,Math.min(Math.PI-0.08,spherical.phi));
    const sin=Math.sin(spherical.phi);
    camera.position.set(target.x+distance*sin*Math.sin(spherical.theta),target.y+distance*Math.cos(spherical.phi),target.z+distance*sin*Math.cos(spherical.theta));
    camera.lookAt(target);camera.updateProjectionMatrix();
   };
   const reset=()=>{distance=Math.max(size.x,size.y,size.z)*1.62;spherical.theta=0.72;spherical.phi=1.06;updateCamera();};
   canvas.addEventListener('pointerdown',event=>{dragging=true;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture?.(event.pointerId);canvas.style.cursor='grabbing';});
   canvas.addEventListener('pointermove',event=>{if(!dragging)return;const dx=event.clientX-lastX,dy=event.clientY-lastY;lastX=event.clientX;lastY=event.clientY;spherical.theta-=dx*0.008;spherical.phi+=dy*0.008;updateCamera();});
   const stop=()=>{dragging=false;canvas.style.cursor='grab';};
   canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
   canvas.addEventListener('wheel',event=>{event.preventDefault();distance=Math.max(Math.max(size.x,size.y,size.z)*0.62,Math.min(Math.max(size.x,size.y,size.z)*8,distance*Math.exp(event.deltaY*0.001)));updateCamera();},{passive:false});
   popupRoot.querySelector('[data-spacecraft-view-reset]')?.addEventListener('click',reset);
   updateCamera();
   const draw=()=>{if(disposed||!renderer||!scene||!camera)return;renderer.render(scene,camera);frame=requestAnimationFrame(draw);};
   draw();
  }catch(error){fail(error);}
 })();
}
function openPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 state.popup?.remove();
 const html=
  '<article class="bp-spacecraft-popup">'+
   '<div class="bp-spacecraft-kicker">BRIDGEPOINT · SPACECRAFT & LAUNCH SITES</div>'+
   '<h3>NASA SLS Block 1 + Mobile Launcher 1</h3>'+
   '<p class="bp-spacecraft-subtitle">Artemis I launch configuration · Launch Complex 39B · Kennedy Space Center, Florida</p>'+
   '<div class="bp-spacecraft-viewer" data-bp-local-spacecraft-viewer role="group" aria-label="BridgePoint-hosted SLS and Mobile Launcher 3D viewer"><div class="bp-spacecraft-viewer-loading">Loading the BridgePoint-hosted, color 3D launch-site scene…</div></div>'+
   '<div class="bp-spacecraft-viewer-controls"><button type="button" data-spacecraft-view-reset>Reset 3D view</button><button type="button" data-spacecraft-action="materialize">Show true-scale model on the globe</button></div>'+
   '<div class="bp-spacecraft-status" data-spacecraft-status>'+safe(state.modelStatus||'BridgePoint-hosted NASA Mobile Launcher model and dimensions-based SLS scene are ready to load.')+'</div>'+
   '<div class="bp-spacecraft-facts">'+
    '<span><b>Vehicle</b>SLS Block 1 + Orion</span>'+
    '<span><b>Stack height</b>98.3 m / 322.4 ft</span>'+
    '<span><b>Core stage</b>64.6 m × 8.4 m</span>'+
    '<span><b>Solid boosters</b>54 m × 3.66 m each</span>'+
    '<span><b>Mobile Launcher</b>115.824 m / 380 ft tall</span>'+
    '<span><b>Launch site</b>Pad 39B · LC-39B</span>'+
   '</div>'+
   '<p class="bp-spacecraft-note"><strong>What is modeled:</strong> The launch tower and base/platform are NASA’s original textured Mobile Launcher GLB, mirrored and hosted by BridgePoint. The SLS Block 1 vehicle beside it is a BridgePoint-built, dimensions-based 3D visualization using NASA-published overall and major-stage dimensions. It is not a photogrammetry scan, not a detailed NASA vehicle mesh, and not an exact representation of every surface feature.</p>'+
   '<p class="bp-spacecraft-note"><strong>Globe placement:</strong> The launch-site icon marks the approximate Pad 39B centre. The Mobile Launcher’s source GLB does not contain a GPS origin or survey-grade north alignment; BridgePoint scales its height to NASA’s published 380 ft figure, centers its footprint on the site reference and seats the scene against available terrain elevation. The model is true-scale by its published height, but its pad-centre alignment and heading are visualization-grade, not survey-controlled.</p>'+
   '<div class="bp-spacecraft-sources"><b>NASA model, location and engineering dimensions</b>'+
    '<a href="'+safe(MODEL.sourceModelUrl)+'" target="_blank" rel="noopener noreferrer">NASA · Mobile Launcher 3D model and download ↗</a>'+
    '<a href="'+safe(MODEL.sourceSlsUrl)+'" target="_blank" rel="noopener noreferrer">NASA · Space Launch System 3D resource ↗</a>'+
    '<a href="'+safe(MODEL.sourceGroundSystemsUrl)+'" target="_blank" rel="noopener noreferrer">NASA · Mobile Launcher 1 and Pad 39B overview ↗</a>'+
    '<a href="'+safe(MODEL.sourceRocketSpecsUrl)+'" target="_blank" rel="noopener noreferrer">NASA · SLS vehicle specifications ↗</a>'+
    '<a href="https://github.com/nasa/NASA-3D-Resources" target="_blank" rel="noopener noreferrer">NASA 3D Resources source repository ↗</a>'+
   '</div>'+
   '<p class="bp-spacecraft-attribution">Source: NASA / Samuel H. Neblett, “Mobile Launcher (assembled)” 3D model, from NASA-3D-Resources. The SLS vehicle is an original BridgePoint dimensions-based visualization. NASA source figures are credited in the model metadata and card. Pad position and relative vehicle/tower placement are approximate; not for engineering or navigation use.</p>'+
  '</article>';
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'540px',className:'bp-spacecraft-popup-wrap'}).setLngLat(lngLat||MODEL.coordinates).setHTML(html).addTo(state.map);
 const root=state.popup.getElement?.();
 root?.querySelector('[data-spacecraft-action="materialize"]')?.addEventListener('click',()=>{void showOnPad(state);});
 mountCardViewer(state,state.popup);
}
function addStyles(){
 if(document.getElementById('bp-spacecraft-style-v1'))return;
 const style=document.createElement('style');style.id='bp-spacecraft-style-v1';
 style.textContent=
  '#'+CONTROL_ID+' .bpv-data-note{font:600 10px/1.45 system-ui,sans-serif;color:#9bb7c6;margin:5px 2px;overflow-wrap:anywhere}'+
  '#'+TOGGLE_ID+'.is-active{border-color:rgba(235,192,112,.9);background:rgba(102,71,28,.52);box-shadow:inset 0 0 0 1px rgba(255,226,165,.2)}'+
  '.'+MARKER_CLASS+'{display:grid;place-items:center;width:46px;height:46px;padding:7px;border:1px solid rgba(255,232,178,.98);border-radius:50%;background:radial-gradient(circle,rgba(13,35,49,.97) 38%,rgba(5,17,27,.92) 74%);color:#f4c978;box-shadow:0 0 0 3px rgba(232,186,94,.22),0 2px 12px rgba(0,0,0,.86);cursor:pointer;touch-action:manipulation;z-index:42}'+
  '.'+MARKER_CLASS+'[hidden]{display:none!important}.'+MARKER_CLASS+' svg{display:block;width:31px;height:31px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.95))}.'+MARKER_CLASS+':focus-visible{outline:3px solid #fff;outline-offset:3px}'+
  '.bp-spacecraft-popup-wrap .maplibregl-popup-content{background:#06131f;color:#e8f5fb;border:1px solid rgba(231,187,103,.64);border-radius:13px;padding:12px;font:12px/1.45 system-ui,sans-serif;max-height:min(84vh,900px);overflow:auto;width:min(510px,calc(100vw - 38px))}'+
  '.bp-spacecraft-popup-wrap .maplibregl-popup-tip{border-top-color:#06131f;border-bottom-color:#06131f}'+
  '.bp-spacecraft-kicker{font-size:9px;letter-spacing:.13em;font-weight:900;color:#f0c878}.bp-spacecraft-popup h3{font-size:18px;color:#fff;margin:4px 0}.bp-spacecraft-subtitle{color:#c4d6df;margin:2px 0 8px}'+
  '.bp-spacecraft-viewer{width:100%;aspect-ratio:4/3;min-height:260px;background:#02070d;border-radius:9px;overflow:hidden;margin:9px 0;border:1px solid rgba(226,186,109,.36)}.bp-spacecraft-viewer canvas{width:100%;height:100%;display:block}.bp-spacecraft-viewer-loading,.bp-spacecraft-viewer-error{display:grid;place-items:center;min-height:240px;padding:20px;text-align:center;color:#c3d7df;font-size:12px;background:radial-gradient(ellipse at center,rgba(28,67,83,.42),rgba(2,7,13,.96))}'+
  '.bp-spacecraft-viewer-controls{display:flex;gap:7px;flex-wrap:wrap}.bp-spacecraft-viewer-controls button{flex:1 1 150px;border:1px solid rgba(231,187,103,.55);border-radius:8px;padding:9px 10px;background:rgba(74,54,25,.48);color:#fff1cb;font:700 11px system-ui,sans-serif}'+
  '.bp-spacecraft-status{margin:7px 0;color:#a9d2c8;font-size:10px;overflow-wrap:anywhere}.bp-spacecraft-facts{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0}.bp-spacecraft-facts span{display:grid;gap:2px;padding:7px;border:1px solid rgba(170,197,207,.18);border-radius:7px;color:#e4eff4;font-size:10px}.bp-spacecraft-facts b{font-size:9px;color:#9eb7c5;text-transform:uppercase;letter-spacing:.08em}.bp-spacecraft-note,.bp-spacecraft-attribution{color:#a9c2cb;margin:8px 0;font-size:10px}.bp-spacecraft-sources{display:grid;gap:5px;border-top:1px solid rgba(154,205,212,.16);padding-top:8px;margin-top:8px;font-size:10px}.bp-spacecraft-sources>b{color:#dceaf0}.bp-spacecraft-sources a{color:#f1cf88;text-decoration:underline}'+
  '@media(max-width:480px){.bp-spacecraft-popup-wrap .maplibregl-popup-content{width:min(365px,calc(100vw - 30px));padding:10px}.bp-spacecraft-viewer{min-height:220px}.bp-spacecraft-facts{grid-template-columns:1fr 1fr}}';
 document.head.appendChild(style);
}
function refreshUi(state){
 const button=document.getElementById(TOGGLE_ID);
 if(button){button.setAttribute('aria-pressed',String(state.enabled));button.classList.toggle('is-active',state.enabled);}
 const status=document.getElementById(STATUS_ID);if(status)status.textContent=state.status;
}
function addControlGroup(state){
 const dock=document.getElementById('bpv-dock-actions');if(!dock)return false;
 if(document.getElementById(CONTROL_ID))return true;
 addStyles();
 const group=document.createElement('section');group.id=CONTROL_ID;group.className='bpv-command-group';
 group.setAttribute('data-bpv-command-section','spacecraft');
 group.setAttribute('aria-label','Spacecraft and Launch Sites');
 group.innerHTML=
  '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">🚀</span><span><b>SPACECRAFT & LAUNCH SITES</b><small>BridgePoint-hosted true-scale 3D launch scenes</small></span></div>'+
  '<div class="bpv-command-grid"><button id="'+TOGGLE_ID+'" data-bpv-action="spacecraft" type="button" class="bpv-command-btn" aria-pressed="false" title="Show or hide spacecraft and launch-site markers"><span class="bpv-command-icon" aria-hidden="true">🚀</span><span class="bpv-command-label">Spacecraft</span></button></div>'+
  '<div id="'+COUNT_ID+'" class="bpv-data-note">4 persistent spacecraft icons · SLS + Mobile Launcher at Pad 39B · Apollo 11 Columbia at the Smithsonian · Space Shuttle Discovery at Udvar-Hazy · Saturn V + gantry at Pad 39A · BridgePoint-hosted 3D viewers</div>'+
  '<div id="'+STATUS_ID+'" class="bpv-data-note">Layer off · existing Plane Wrecks and Shipwrecks layers remain unchanged.</div>';
 const plane=document.getElementById('bp-plane-wrecks-control-v1');
 const ship=document.getElementById('bp-shipwrecks-control-v1');
 if(plane?.parentNode===dock)plane.after(group);else if(ship?.parentNode===dock)ship.after(group);else dock.appendChild(group);
 group.querySelector('#'+TOGGLE_ID).addEventListener('click',()=>{void setEnabled(state,!state.enabled);});
 refreshUi(state);return true;
}
async function setEnabled(state,on){
 state.enabled=!!on;
 if(state.enabled){
  ensurePersistentMarker(state,true);
  if(state.launchGroup){
   state.modelVisible=true;ensureNativeLayer(state);
  }else maybeAutoMaterialize(state);
  updateStatus(state,'Spacecraft ON · the persistent LC-39B rocket icon remains visible at every zoom. Select it for the BridgePoint-hosted SLS + Mobile Launcher viewer.');
 }else{
  state.modelVisible=false;ensurePersistentMarker(state,false);
  updateStatus(state,'Spacecraft OFF · the launch-site icon and native 3D scene are hidden; other BridgePoint layers are untouched.');
 }
 if(state.launchGroup)state.launchGroup.visible=false;
 state.map.triggerRepaint?.();refreshUi(state);return state.enabled;
}
function bindInteractions(state){
 if(state.interactionsBound)return;
 state.interactionsBound=true;
 state.handleVisibility=()=>{
  if(!state.enabled)return;
  ensurePersistentMarker(state,true);
  if(state.launchGroup&&!state.map.getLayer(MAP_LAYER_ID))ensureNativeLayer(state);
  maybeAutoMaterialize(state);updateAltitude(state);state.map.triggerRepaint?.();
 };
 for(const event of ['style.load','load','idle','moveend','zoomend','rotateend','pitchend']){
  state.map.on?.(event,state.handleVisibility);
 }
}
export function initSpacecraftRenderer(target){
 const map=mapOf(target);
 if(!map||typeof map.getBounds!=='function'||typeof map.addLayer!=='function')return null;
 const existing=stateByMap.get(map);if(existing)return existing.api;
 const state={
  map,enabled:false,destroyed:false,interactionsBound:false,popup:null,
  domMarker:null,domMarkerElement:null,launchGroup:null,launchPromise:null,
  modelVisible:false,modelAutoAttempted:false,THREE:null,GLTFLoader:null,DRACOLoader:null,
  dracoLoader:null,mapRenderer:null,mapScene:null,mapCamera:null,altitudeM:0,
  modelStatus:'The NASA Mobile Launcher and BridgePoint SLS Block 1 scene has not loaded yet.',
  status:'Spacecraft off',
  stats:{version:VERSION,markerReady:false,markerVisible:false,assetLoaded:false,nativeLayerReady:false,launcherHeightM:null,sceneBounds:null,renderWarning:false}
 };
 const api={
  version:VERSION,model:MODEL,get enabled(){return state.enabled;},get status(){return state.status;},
  get stats(){return Object.assign({},state.stats);},get partCount(){return 1;},get modelCount(){return 1;},
  toggle(){return setEnabled(state,!state.enabled);},setEnabled(on){return setEnabled(state,on);},
  showOnPad(){return showOnPad(state);},
  refresh(){if(state.enabled)ensurePersistentMarker(state,true);return Object.assign({},state.stats);},
  destroy(){
   state.destroyed=true;state.enabled=false;state.modelVisible=false;state.popup?.remove();
   try{state.domMarker?.remove?.();}catch(_){}
   if(state.handleVisibility)for(const event of ['style.load','load','idle','moveend','zoomend','rotateend','pitchend'])state.map.off?.(event,state.handleVisibility);
   if(state.map.getLayer?.(MAP_LAYER_ID))try{state.map.removeLayer(MAP_LAYER_ID);}catch(_){}
   try{state.mapRenderer?.dispose();}catch(_){}
   try{state.dracoLoader?.dispose?.();}catch(_){}
   state.mapRenderer=null;state.mapScene=null;state.mapCamera=null;state.launchGroup=null;
   document.getElementById(CONTROL_ID)?.remove();document.getElementById('bp-spacecraft-style-v1')?.remove();
   state.observer?.disconnect();if(state.dockTimer)clearTimeout(state.dockTimer);
   stateByMap.delete(map);
  }
 };
 state.api=api;stateByMap.set(map,state);window.__BP_SPACECRAFT_V1__=api;
 bindInteractions(state);
 const observeDock=()=>{
  if(!stateByMap.has(map))return;
  if(addControlGroup(state))return;
  state.dockTimer=setTimeout(observeDock,500);
 };
 observeDock();
 if(typeof MutationObserver!=='undefined'&&document.body){
  state.observer=new MutationObserver(()=>{if(stateByMap.has(map)&&!document.getElementById(CONTROL_ID))addControlGroup(state);});
  state.observer.observe(document.body,{childList:true,subtree:true});
 }
 return api;
}
