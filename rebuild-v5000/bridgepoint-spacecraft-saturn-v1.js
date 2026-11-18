/* BridgePoint Spacecraft Collection — NASA Saturn V + Launch Complex 39 gantry scene.
 * NASA source GLBs are mirrored to BridgePoint and presented in a locally hosted viewer.
 * The two source models are NASA 3D resources, not photogrammetry scans. The concrete apron
 * and the relative arrangement of vehicle/gantry are illustrative, not a surveyed reconstruction.
 */
const VERSION=1;
const THREE_URL='/vendor/three.module.js?v=169-local';
const GLTF_URL='/vendor/GLTFLoader.bundle.js?v=169-local';
const DRACO_URL='/vendor/DRACOLoader.bundle.js?v=169-draco-v1';
const TOGGLE_ID='bp-spacecraft-toggle-v1';
const COUNT_ID='bp-spacecraft-count-v1';
const STATUS_ID='bp-spacecraft-status-v1';
const MARKER_CLASS='bp-spacecraft-saturn-marker-v1';
const LAYER_ID='bp-spacecraft-saturn-native-v1';
const SATURN_ASSET='/assets/spacecraft/nasa-saturn-v.glb';
const GANTRY_ASSET='/assets/spacecraft/nasa-gantry.glb';
export const SPACECRAFT_SATURN_ASSETS=[SATURN_ASSET,GANTRY_ASSET];
export const SPACECRAFT_SATURN={
 id:'nasa-saturn-v-launch-complex-39a',
 name:'NASA Saturn V + Launch Complex 39A Gantry',
 label:'SATURN V · LAUNCH GANTRY',
 vehicle:'Apollo-era Saturn V launch vehicle',
 site:'Launch Complex 39A, Kennedy Space Center, Florida, USA',
 coordinates:[-80.6041,28.6082],
 coordinateText:'Approx. 28.6082° N, 80.6041° W',
 heightM:111,
 heightFt:363,
 stages:3,
 apollo11LaunchDate:'July 16, 1969',
 thrustLbf:7600000,
 sourceSaturnUrl:'https://science.nasa.gov/3d-resources/saturn-v/',
 sourceGantryUrl:'https://science.nasa.gov/3d-resources/gantry/',
 sourceApolloUrl:'https://www.nasa.gov/history/50-years-ago-apollo-11-to-launch-from-pad-39a/',
 sourceModelUrl:'https://science.nasa.gov/3d-resources/saturn-v/',
 sourceMethod:'NASA 3D Resources GLB models for the Saturn V and Launch Complex 39 gantry. These are supplied 3D models, not photogrammetry scans. BridgePoint hosts the GLBs locally and composes them with a simple generated launch apron.',
 sourceLicense:'NASA 3D Resources government-produced models; NASA source attribution and links are retained. Consult each NASA source page for its media and usage guidance.',
 placementPrecision:'The persistent marker is an approximate Launch Complex 39A pad reference. The NASA model packages do not provide a geodetic origin or a survey-control transform. The gantry-to-rocket spacing, orientation and generated concrete apron are an illustrative scene composition, not a survey-grade reconstruction of the historic pad.'
};
export function resolveSaturnSourceFit(sourceDimensions,targetHeightM=111){
 const axes=['x','y','z'];
 const values=axes.map(axis=>Number(sourceDimensions?.[axis]));
 if(values.some(value=>!Number.isFinite(value)||value<=0))throw new Error('NASA Saturn launch model has invalid source bounds');
 if(!Number.isFinite(targetHeightM)||targetHeightM<=0)throw new Error('NASA Saturn launch model target height is invalid');
 let upAxis=0;
 for(let i=1;i<3;i++)if(values[i]>values[upAxis])upAxis=i;
 const height=values[upAxis];
 if(height<0.1||height>100000)throw new Error('NASA Saturn launch model has implausible source extents');
 return {upAxis,sourceHeight:height,targetHeightM,scale:targetHeightM/height};
}
const states=new WeakMap();
let threePromise=null;
function safe(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
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
async function fetchGltf(state,path,label){
 const response=await fetch(path,{cache:'force-cache'});
 if(!response.ok)throw new Error('BridgePoint '+label+' asset request failed ('+response.status+')');
 const buffer=await response.arrayBuffer();
 if(buffer.byteLength<24||new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('BridgePoint '+label+' asset is not a valid binary glTF');
 const gltf=await configureLoader(state).parseAsync(buffer,'');
 if(!gltf?.scene)throw new Error('NASA '+label+' GLB contains no scene');
 return gltf.scene;
}
function addBox(THREE,group,width,height,depth,position,color,roughness=0.86){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),new THREE.MeshStandardMaterial({color,roughness,metalness:0.06}));
 mesh.position.set(position[0],position[1],position[2]);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function makeApron(THREE){
 const apron=new THREE.Group();apron.name='BridgePoint illustrative launch apron and service base';
 const concrete=new THREE.MeshStandardMaterial({color:0x777e80,roughness:0.94});
 const slab=new THREE.Mesh(new THREE.BoxGeometry(104,2.4,82),concrete);
 slab.position.y=-1.2;slab.receiveShadow=true;slab.castShadow=true;apron.add(slab);
 const pad=new THREE.Mesh(new THREE.BoxGeometry(70,0.22,52),new THREE.MeshStandardMaterial({color:0x9a9b93,roughness:0.92}));
 pad.position.set(0,0.12,0);pad.receiveShadow=true;apron.add(pad);
 const yellow=new THREE.MeshStandardMaterial({color:0xc9a64e,roughness:0.82});
 // Low-contrast service-lane and safety markings, not a claimed survey layout.
 for(const z of [-25.4,25.4]){
  const line=new THREE.Mesh(new THREE.BoxGeometry(66,0.035,0.24),yellow);
  line.position.set(0,0.245,z);apron.add(line);
 }
 for(const x of [-34.2,34.2]){
  const line=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.035,48),yellow);
  line.position.set(x,0.245,0);apron.add(line);
 }
 // Four concrete footings anchor the gantry legs to the apron visually.
 for(const x of [18,35])for(const z of [-13,13]){
  addBox(THREE,apron,4.2,1.15,4.2,[x,0.55,z],0x555f64,0.9);
 }
 return apron;
}
function fitUpright(THREE,source,targetHeightM,name){
 const wrapper=new THREE.Group();wrapper.name=name;wrapper.add(source);
 wrapper.updateMatrixWorld(true);
 let bounds=new THREE.Box3().setFromObject(wrapper);
 if(bounds.isEmpty())throw new Error(name+' has empty geometry');
 const size=bounds.getSize(new THREE.Vector3());
 const fit=resolveSaturnSourceFit({x:size.x,y:size.y,z:size.z},targetHeightM);
 // The longest axis in each NASA model is its principal vertical dimension.
 if(fit.upAxis===0)wrapper.rotation.z=Math.PI/2;
 else if(fit.upAxis===2)wrapper.rotation.x=-Math.PI/2;
 wrapper.updateMatrixWorld(true);
 bounds=new THREE.Box3().setFromObject(wrapper);
 const orientedSize=bounds.getSize(new THREE.Vector3());
 const scale=targetHeightM/orientedSize.y;
 wrapper.scale.setScalar(scale);
 wrapper.updateMatrixWorld(true);
 bounds=new THREE.Box3().setFromObject(wrapper);
 const center=bounds.getCenter(new THREE.Vector3());
 wrapper.position.set(-center.x,-bounds.min.y,-center.z);
 wrapper.updateMatrixWorld(true);
 const finalBounds=new THREE.Box3().setFromObject(wrapper);
 return {group:wrapper,bounds:finalBounds,heightM:finalBounds.max.y-finalBounds.min.y,scale,upAxis:fit.upAxis};
}
async function loadLaunchScene(state){
 if(state.group)return state.group;
 if(state.promise)return state.promise;
 state.promise=(async()=>{
  const pair=await loadThree();
  if(state.destroyed)throw new Error('Saturn V layer was closed');
  state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;state.DRACOLoader=pair.DRACOLoader;
  const [saturnSource,gantrySource]=await Promise.all([
   fetchGltf(state,SATURN_ASSET,'Saturn V'),
   fetchGltf(state,GANTRY_ASSET,'Launch Complex 39 gantry')
  ]);
  const scene=new pair.THREE.Group();scene.name='BridgePoint Saturn V + Launch Complex 39A launch scene';
  scene.add(makeApron(pair.THREE));
  const rocket=fitUpright(pair.THREE,saturnSource,SPACECRAFT_SATURN.heightM,'NASA Saturn V GLB · scaled to 111 m');
  rocket.group.position.set(-15,0,0);scene.add(rocket.group);
  // The gantry is scaled proportionally to a visualization height near the launch vehicle.
  // Its relative position is a presentation choice; this is not a georeferenced as-built plan.
  const tower=fitUpright(pair.THREE,gantrySource,119,'NASA Launch Complex 39 gantry GLB · illustrative scene scale');
  tower.group.position.set(25,0,0);scene.add(tower.group);
  scene.traverse(object=>{if(object.isMesh){object.frustumCulled=false;object.castShadow=true;object.receiveShadow=true;}});
  scene.updateMatrixWorld(true);
  const allBounds=new pair.THREE.Box3().setFromObject(scene);
  if(allBounds.isEmpty())throw new Error('Saturn V launch scene has empty combined bounds');
  const size=allBounds.getSize(new pair.THREE.Vector3());
  state.group=scene;
  state.sceneBounds={x:size.x,y:size.y,z:size.z};
  state.stats.assetLoaded=true;
  state.stats.saturnHeightM=rocket.heightM;
  state.stats.gantryHeightM=tower.heightM;
  state.stats.sceneBounds=state.sceneBounds;
  state.status='Both NASA 3D-resource GLBs are hosted by BridgePoint and loaded into the local Saturn V + gantry viewer.';
  setStatus(state,state.status);
  return scene;
 })().catch(error=>{state.promise=null;throw error;});
 return state.promise;
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
function ensureNativeLayer(state){
 const map=state.map,THREE=state.THREE;
 if(!THREE||!state.group||state.destroyed||!map?.getStyle?.())return false;
 if(map.getLayer(LAYER_ID)&&state.mapRenderer&&state.mapScene)return true;
 const layer={
  id:LAYER_ID,type:'custom',renderingMode:'3d',
  onAdd(mapRef,gl){
   state.mapRenderer=new THREE.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
   state.mapRenderer.autoClear=false;state.mapRenderer.outputColorSpace=THREE.SRGBColorSpace;
   state.mapScene=new THREE.Scene();
   state.mapScene.add(new THREE.AmbientLight(0xffffff,2.0));
   const key=new THREE.DirectionalLight(0xffffff,1.25);key.position.set(-35,95,55);state.mapScene.add(key);
   const fill=new THREE.DirectionalLight(0x9cbccf,0.65);fill.position.set(45,25,-55);state.mapScene.add(fill);
   state.mapCamera=new THREE.Camera();
   if(state.group.parent!==state.mapScene)state.mapScene.add(state.group);
   state.stats.nativeLayerReady=true;
  },
  render(_gl,args){
   if(!state.enabled||!state.modelVisible||!state.group||!state.mapRenderer||!state.mapScene||!state.mapCamera)return;
   if(Number(map.getZoom?.()||0)<12.0){state.group.visible=false;return;}
   try{const bounds=map.getBounds?.();if(bounds&&!bounds.contains(SPACECRAFT_SATURN.coordinates)){state.group.visible=false;return;}}catch(_){}
   let altitude=0;
   try{const z=map.queryTerrainElevation?.(SPACECRAFT_SATURN.coordinates,{exaggerated:false});if(Number.isFinite(Number(z)))altitude=Number(z);}catch(_){}
   const raw=args&&(args.defaultProjectionData?.mainMatrix||args.modelViewProjectionMatrix);
   if(!raw||raw.length<16)return;
   const matrix=nativeMapMatrix(map,THREE,SPACECRAFT_SATURN.coordinates,altitude);
   if(!matrix){state.group.visible=false;return;}
   state.group.visible=true;
   state.mapCamera.projectionMatrix.copy(new THREE.Matrix4().fromArray(raw)).multiply(matrix);
   try{state.mapRenderer.resetState();state.mapRenderer.render(state.mapScene,state.mapCamera);}
   catch(error){if(!state.stats.renderWarning){state.stats.renderWarning=true;console.warn('BridgePoint Saturn V globe renderer',error);}}
   finally{state.group.visible=false;}
  },
  onRemove(){
   try{state.mapRenderer?.dispose();}catch(_){}
   state.mapRenderer=null;state.mapScene=null;state.mapCamera=null;state.stats.nativeLayerReady=false;
  }
 };
 try{map.addLayer(layer);return true;}
 catch(error){state.stats.nativeLayerError=String(error?.message||error);return false;}
}
async function showOnGlobe(state){
 if(!state.enabled)return false;
 state.modelVisible=true;setStatus(state,'Loading the BridgePoint-hosted NASA Saturn V and gantry models onto the globe…');
 try{
  await loadLaunchScene(state);
  if(state.destroyed||!state.enabled)return false;
  if(!ensureNativeLayer(state))throw new Error('MapLibre Saturn V native 3D layer could not attach');
  if(!state.mapRenderer)throw new Error('MapLibre Saturn V WebGL renderer is unavailable');
  if(state.mapScene&&state.group.parent!==state.mapScene)state.mapScene.add(state.group);
  state.map.flyTo?.({center:SPACECRAFT_SATURN.coordinates,zoom:16.0,pitch:52,duration:1450});
  state.map.triggerRepaint?.();
  state.status='The BridgePoint-hosted Saturn V and gantry scene is loaded. The model placement and generated apron are illustrative, not survey-controlled.';
  setStatus(state,state.status);return true;
 }catch(error){
  state.modelVisible=false;state.autoAttempted=false;state.status='Saturn V globe model could not load: '+String(error?.message||error);setStatus(state,state.status);return false;
 }
}
function ensureMarker(state,visible=state.enabled){
 const Marker=window.maplibregl?.Marker;if(typeof Marker!=='function')return false;
 try{
  if(!state.marker){
   const element=document.createElement('button');element.type='button';element.className=MARKER_CLASS;
   element.setAttribute('aria-label','NASA Saturn V and launch gantry at Kennedy Space Center Launch Complex 39A. Open BridgePoint 3D card.');
   element.title='NASA Saturn V + Launch Complex 39A gantry · open BridgePoint 3D card';
   element.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M32 4c-7 7-10 19-10 31l-9 10v8l14-6h10l14 6v-8l-9-10C42 23 39 11 32 4Z" fill="currentColor" stroke="#fff0c2" stroke-width="2" stroke-linejoin="round"/><path d="M23 38 14 54l12-5M41 38l9 16-12-5M27 47l5 13 5-13" fill="#ee7835" stroke="#fff0c2" stroke-width="1.3" stroke-linejoin="round"/><circle cx="32" cy="25" r="4.2" fill="#24475c" stroke="#fff0c2" stroke-width="1.2"/></svg>';
   element.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(state.enabled)openPopup(state,SPACECRAFT_SATURN.coordinates);});
   state.markerElement=element;state.marker=new Marker({element,anchor:'center',offset:[0,0]});
  }
  state.marker.setLngLat(SPACECRAFT_SATURN.coordinates).addTo(state.map);
  const element=state.marker.getElement?.()||state.markerElement;
  if(element){element.hidden=!visible;element.setAttribute('aria-hidden',String(!visible));element.disabled=!visible;}
  state.stats.markerReady=true;state.stats.markerVisible=!!visible;return true;
 }catch(error){state.stats.markerError=String(error?.message||error);return false;}
}
function maybeAutoMaterialize(state){
 if(!state.enabled)return false;
 ensureMarker(state,true);
 if(Number(state.map.getZoom?.()||0)<12.0)return false;
 try{const bounds=state.map.getBounds?.();if(bounds&&!bounds.contains(SPACECRAFT_SATURN.coordinates))return false;}catch(_){}
 if(state.group){state.modelVisible=true;if(!ensureNativeLayer(state))return false;state.map.triggerRepaint?.();return true;}
 if(state.promise||state.autoAttempted)return false;
 state.autoAttempted=true;state.modelVisible=true;void showOnGlobe(state);return true;
}
function mountViewer(state,popup){
 const root=popup?.getElement?.(),host=root?.querySelector('[data-bp-local-spacecraft-viewer]');
 if(!host)return;
 let disposed=false,renderer=null,resizeObserver=null,frame=0,scene=null,camera=null,model=null,resizeHandler=null;
 let distance=245,lastX=0,lastY=0,dragging=false;
 const clean=()=>{
  if(disposed)return;disposed=true;if(frame)cancelAnimationFrame(frame);resizeObserver?.disconnect();
  if(resizeHandler)window.removeEventListener('resize',resizeHandler);
  try{renderer?.dispose();}catch(_){}try{scene?.clear?.();}catch(_){}
 };
 popup.on?.('close',clean);
 const fail=error=>{if(!disposed&&host.isConnected)host.innerHTML='<div class="bp-spacecraft-viewer-error">BridgePoint Saturn V viewer could not start: '+safe(error?.message||error)+'</div>';};
 (async()=>{
  try{
   const pair=await loadThree();if(disposed||!host.isConnected)return;
   await loadLaunchScene(state);if(disposed||!host.isConnected)return;
   const THREE=pair.THREE,canvas=document.createElement('canvas');canvas.style.touchAction='none';canvas.style.cursor='grab';
   canvas.setAttribute('aria-label','Interactive BridgePoint-hosted NASA Saturn V and Launch Complex 39 gantry 3D scene. Drag to rotate; scroll or pinch to zoom.');
   host.replaceChildren(canvas);
   renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
   renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
   scene=new THREE.Scene();scene.background=new THREE.Color(0x04111c);
   camera=new THREE.PerspectiveCamera(36,1,0.1,2500);
   scene.add(new THREE.AmbientLight(0xffffff,1.75));
   const key=new THREE.DirectionalLight(0xffedce,1.55);key.position.set(-60,150,100);scene.add(key);
   const fill=new THREE.DirectionalLight(0x91b9d2,0.72);fill.position.set(75,45,-95);scene.add(fill);
   model=state.group.clone(true);model.visible=true;model.traverse(object=>{if(object.isMesh)object.frustumCulled=false;});scene.add(model);
   const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),target=bounds.getCenter(new THREE.Vector3());
   const span=Math.max(size.x,size.y,size.z);distance=span*1.55;
   const spherical={theta:0.72,phi:1.02};
   const resize=()=>{
    if(disposed||!renderer||!camera)return;
    const width=Math.max(1,host.clientWidth||360),height=Math.max(1,host.clientHeight||270);
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
   const reset=()=>{distance=span*1.55;spherical.theta=0.72;spherical.phi=1.02;updateCamera();};
   canvas.addEventListener('pointerdown',event=>{dragging=true;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture?.(event.pointerId);canvas.style.cursor='grabbing';});
   canvas.addEventListener('pointermove',event=>{if(!dragging)return;const dx=event.clientX-lastX,dy=event.clientY-lastY;lastX=event.clientX;lastY=event.clientY;spherical.theta-=dx*0.008;spherical.phi+=dy*0.008;updateCamera();});
   const stop=()=>{dragging=false;canvas.style.cursor='grab';};
   canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
   canvas.addEventListener('wheel',event=>{event.preventDefault();distance=Math.max(span*0.65,Math.min(span*5,distance*Math.exp(event.deltaY*0.001)));updateCamera();},{passive:false});
   root.querySelector('[data-saturn-view-reset]')?.addEventListener('click',reset);
   updateCamera();
   const draw=()=>{if(disposed||!renderer||!scene||!camera)return;renderer.render(scene,camera);frame=requestAnimationFrame(draw);};draw();
  }catch(error){fail(error);}
 })();
}
function openPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 state.popup?.remove();
 const html=
  '<article class="bp-spacecraft-popup">'+
   '<div class="bp-spacecraft-kicker">BRIDGEPOINT · SPACECRAFT COLLECTION</div>'+
   '<h3>NASA Saturn V + Launch Complex 39A Gantry</h3>'+
   '<p class="bp-spacecraft-subtitle">Apollo-era launch vehicle · Kennedy Space Center · Merritt Island, Florida</p>'+
   '<div class="bp-spacecraft-viewer" data-bp-local-spacecraft-viewer role="group" aria-label="BridgePoint-hosted Saturn V and launch gantry 3D model viewer"><div class="bp-spacecraft-viewer-loading">Loading BridgePoint-hosted NASA Saturn V and gantry models…</div></div>'+
   '<div class="bp-spacecraft-viewer-controls"><button type="button" data-saturn-view-reset>Reset 3D view</button><button type="button" data-saturn-action="materialize">Show launch scene on the globe</button></div>'+
   '<div class="bp-spacecraft-status" data-spacecraft-status>'+safe(state.status||'NASA Saturn V and Launch Complex 39 gantry models ready to load.')+'</div>'+
   '<div class="bp-spacecraft-facts">'+
    '<span><b>Launch vehicle</b>Saturn V · three stages</span>'+
    '<span><b>Overall height</b>111 m / 363 ft</span>'+
    '<span><b>Apollo 11</b>Launched July 16, 1969</span>'+
    '<span><b>Lift-off thrust</b>Approx. 7.6 million lbf</span>'+
    '<span><b>Historic site</b>Launch Complex 39A</span>'+
    '<span><b>Location</b>Kennedy Space Center, Florida</span>'+
   '</div>'+
   '<p class="bp-spacecraft-note"><strong>What you are viewing:</strong> The NASA Saturn V GLB and the NASA Launch Complex 39 gantry GLB, mirrored to BridgePoint and rendered in a local interactive 3D viewer. BridgePoint adds a simple concrete launch apron so the upright rocket and gantry read together as a launch scene. The source GLBs are NASA 3D-resource models, not photogrammetry scans.</p>'+
   '<p class="bp-spacecraft-note"><strong>Scale and placement:</strong> The Saturn V is scaled to NASA’s published 111 m / 363 ft overall height. The gantry is proportionally normalized for scene presentation. The persistent icon is an approximate LC-39A marker; gantry spacing, orientation and generated apron are illustrative, not survey-controlled or an as-built pad reconstruction.</p>'+
   '<div class="bp-spacecraft-sources"><b>NASA source models and mission context</b>'+
    '<a href="'+safe(SPACECRAFT_SATURN.sourceSaturnUrl)+'" target="_blank" rel="noopener noreferrer">NASA 3D Resources · Saturn V GLB ↗</a>'+
    '<a href="'+safe(SPACECRAFT_SATURN.sourceGantryUrl)+'" target="_blank" rel="noopener noreferrer">NASA 3D Resources · Launch Complex 39 gantry GLB ↗</a>'+
    '<a href="'+safe(SPACECRAFT_SATURN.sourceApolloUrl)+'" target="_blank" rel="noopener noreferrer">NASA History · Apollo 11 Pad 39A launch ↗</a>'+
   '</div>'+
   '<p class="bp-spacecraft-attribution">Sources: NASA 3D Resources, Saturn V and Gantry models. NASA source attribution and links are retained. The launch apron and scene registration are BridgePoint-created illustrative visualization assets.</p>'+
  '</article>';
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'540px',className:'bp-spacecraft-saturn-popup-wrap'}).setLngLat(lngLat||SPACECRAFT_SATURN.coordinates).setHTML(html).addTo(state.map);
 const root=state.popup.getElement?.();
 root?.querySelector('[data-saturn-action="materialize"]')?.addEventListener('click',()=>{void showOnGlobe(state);});
 mountViewer(state,state.popup);
}
function addStyles(){
 if(document.getElementById('bp-spacecraft-saturn-style-v1'))return;
 const style=document.createElement('style');style.id='bp-spacecraft-saturn-style-v1';
 style.textContent=
  '.'+MARKER_CLASS+'{display:grid;place-items:center;width:46px;height:46px;padding:7px;border:1px solid rgba(255,232,178,.98);border-radius:50%;background:radial-gradient(circle,rgba(13,35,49,.97) 38%,rgba(5,17,27,.92) 74%);color:#f4c978;box-shadow:0 0 0 3px rgba(232,186,94,.22),0 2px 12px rgba(0,0,0,.86);cursor:pointer;touch-action:manipulation;z-index:44}'+
  '.'+MARKER_CLASS+'[hidden]{display:none!important}.'+MARKER_CLASS+' svg{display:block;width:31px;height:31px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.95))}.'+MARKER_CLASS+':focus-visible{outline:3px solid #fff;outline-offset:3px}'+
  '.bp-spacecraft-saturn-popup-wrap .maplibregl-popup-content{background:#06131f;color:#e8f5fb;border:1px solid rgba(231,187,103,.64);border-radius:13px;padding:12px;font:12px/1.45 system-ui,sans-serif;max-height:min(84vh,900px);overflow:auto;width:min(510px,calc(100vw - 38px))}'+
  '.bp-spacecraft-saturn-popup-wrap .maplibregl-popup-tip{border-top-color:#06131f;border-bottom-color:#06131f}'+
  '.bp-spacecraft-kicker{font-size:9px;letter-spacing:.13em;font-weight:900;color:#f0c878}.bp-spacecraft-popup h3{font-size:18px;color:#fff;margin:4px 0}.bp-spacecraft-subtitle{color:#c4d6df;margin:2px 0 8px}'+
  '.bp-spacecraft-viewer{width:100%;aspect-ratio:4/3;min-height:260px;background:#02070d;border-radius:9px;overflow:hidden;margin:9px 0;border:1px solid rgba(226,186,109,.36)}.bp-spacecraft-viewer canvas{width:100%;height:100%;display:block}.bp-spacecraft-viewer-loading,.bp-spacecraft-viewer-error{display:grid;place-items:center;min-height:240px;padding:20px;text-align:center;color:#c3d7df;font-size:12px;background:radial-gradient(ellipse at center,rgba(28,67,83,.42),rgba(2,7,13,.96))}'+
  '.bp-spacecraft-viewer-controls{display:flex;gap:7px;flex-wrap:wrap}.bp-spacecraft-viewer-controls button{flex:1 1 150px;border:1px solid rgba(231,187,103,.55);border-radius:8px;padding:9px 10px;background:rgba(74,54,25,.48);color:#fff1cb;font:700 11px system-ui,sans-serif}'+
  '.bp-spacecraft-status{margin:7px 0;color:#a9d2c8;font-size:10px;overflow-wrap:anywhere}.bp-spacecraft-facts{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0}.bp-spacecraft-facts span{display:grid;gap:2px;padding:7px;border:1px solid rgba(170,197,207,.18);border-radius:7px;color:#e4eff4;font-size:10px}.bp-spacecraft-facts b{font-size:9px;color:#9eb7c5;text-transform:uppercase;letter-spacing:.08em}.bp-spacecraft-note,.bp-spacecraft-attribution{color:#a9c2cb;margin:8px 0;font-size:10px}.bp-spacecraft-sources{display:grid;gap:5px;border-top:1px solid rgba(154,205,212,.16);padding-top:8px;margin-top:8px;font-size:10px}.bp-spacecraft-sources>b{color:#dceaf0}.bp-spacecraft-sources a{color:#f1cf88;text-decoration:underline}'+
  '@media(max-width:480px){.bp-spacecraft-saturn-popup-wrap .maplibregl-popup-content{width:min(365px,calc(100vw - 30px));padding:10px}.bp-spacecraft-viewer{min-height:220px}.bp-spacecraft-facts{grid-template-columns:1fr 1fr}}';
 document.head.appendChild(style);
}
function setStatus(state,message){
 state.status=String(message||'');
 const popup=state.popup?.getElement?.()?.querySelector('[data-spacecraft-status]');
 if(popup)popup.textContent=state.status;
 const status=document.getElementById(STATUS_ID);
 if(status&&!status.textContent.includes('Saturn V'))status.textContent+=' · Saturn V + gantry available';
}
function updateCount(){
 const count=document.getElementById(COUNT_ID);
 if(!count)return;
 const label='4 persistent spacecraft icons · SLS + Mobile Launcher at Pad 39B · Apollo 11 Columbia · Space Shuttle Discovery · Saturn V + gantry at Pad 39A · BridgePoint-hosted 3D viewers';
 if(count.textContent!==label)count.textContent=label;
}
function readToggle(state){
 const button=state.toggleButton||document.getElementById(TOGGLE_ID);
 const enabled=button?.getAttribute('aria-pressed')==='true';
 if(enabled===state.enabled)return;
 state.enabled=enabled;ensureMarker(state,enabled);
 if(!enabled){state.modelVisible=false;state.marker?.getElement?.()?.setAttribute('aria-hidden','true');}
 else{ensureMarker(state,true);maybeAutoMaterialize(state);}
 state.map.triggerRepaint?.();updateCount();
}
function attachToggle(state){
 const button=document.getElementById(TOGGLE_ID);
 if(!button||state.toggleButton===button)return false;
 state.toggleButton=button;
 button.addEventListener('click',()=>queueMicrotask(()=>readToggle(state)));
 state.toggleObserver?.disconnect();
 state.toggleObserver=new MutationObserver(()=>readToggle(state));
 state.toggleObserver.observe(button,{attributes:true,attributeFilter:['aria-pressed']});
 readToggle(state);updateCount();return true;
}
function bindMapEvents(state){
 if(state.bound)return;state.bound=true;
 state.handleMapChange=()=>{
  if(!state.enabled)return;
  ensureMarker(state,true);
  if(state.group&&!state.map.getLayer(LAYER_ID))ensureNativeLayer(state);
  maybeAutoMaterialize(state);state.map.triggerRepaint?.();
 };
 for(const event of ['style.load','load','idle','moveend','zoomend','rotateend','pitchend'])state.map.on?.(event,state.handleMapChange);
}
export function initSpacecraftSaturnRenderer(target){
 const map=mapOf(target);
 if(!map||typeof map.getBounds!=='function'||typeof map.addLayer!=='function')return null;
 const existing=states.get(map);if(existing)return existing.api;
 addStyles();
 const state={
  map,enabled:false,destroyed:false,bound:false,toggleButton:null,toggleObserver:null,bodyObserver:null,
  popup:null,marker:null,markerElement:null,group:null,promise:null,modelVisible:false,autoAttempted:false,
  dracoLoader:null,THREE:null,GLTFLoader:null,DRACOLoader:null,mapRenderer:null,mapScene:null,mapCamera:null,
  status:'The NASA Saturn V and Launch Complex 39 gantry models have not loaded yet.',
  stats:{markerReady:false,markerVisible:false,assetLoaded:false,nativeLayerReady:false,saturnHeightM:null,gantryHeightM:null,renderWarning:false}
 };
 const api={
  version:VERSION,model:SPACECRAFT_SATURN,assets:SPACECRAFT_SATURN_ASSETS,
  get enabled(){return state.enabled;},get status(){return state.status;},get stats(){return Object.assign({},state.stats);},
  setEnabled(on){
   state.enabled=!!on;ensureMarker(state,state.enabled);
   if(!state.enabled)state.modelVisible=false;else maybeAutoMaterialize(state);
   state.map.triggerRepaint?.();updateCount();return state.enabled;
  },
  showOnGlobe(){return showOnGlobe(state);},
  openCard(){if(state.enabled)openPopup(state,SPACECRAFT_SATURN.coordinates);},
  destroy(){
   state.destroyed=true;state.enabled=false;state.popup?.remove();state.toggleObserver?.disconnect();state.bodyObserver?.disconnect();
   try{state.marker?.remove?.();}catch(_){}
   if(state.handleMapChange)for(const event of ['style.load','load','idle','moveend','zoomend','rotateend','pitchend'])state.map.off?.(event,state.handleMapChange);
   if(state.map.getLayer?.(LAYER_ID))try{state.map.removeLayer(LAYER_ID);}catch(_){}
   try{state.mapRenderer?.dispose();}catch(_){}try{state.dracoLoader?.dispose?.();}catch(_){}
   document.getElementById('bp-spacecraft-saturn-style-v1')?.remove();states.delete(map);
  }
 };
 state.api=api;states.set(map,state);window.__BP_SPACECRAFT_SATURN_V1__=api;
 bindMapEvents(state);attachToggle(state);
 if(typeof MutationObserver!=='undefined'&&document.body){
  state.bodyObserver=new MutationObserver(()=>{if(!state.toggleButton||!state.toggleButton.isConnected)attachToggle(state);updateCount();});
  state.bodyObserver.observe(document.body,{childList:true,subtree:true});
 }
 updateCount();return api;
}
