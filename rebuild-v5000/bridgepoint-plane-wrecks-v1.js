/* BridgePoint Plane Wrecks v1 — persistent underwater aircraft wreck markers and BridgePoint-hosted scans. */
const VERSION=1;
const STATES=new WeakMap();
const THREE_URL='/vendor/three.module.js?v=169-local';
const GLTF_URL='/vendor/GLTFLoader.bundle.js?v=169-local';
const ASSET='/assets/plane-wrecks/f4u1-corsair-kwajalein-photogrammetry.glb.gz';
const SOURCE_ID='bp-plane-wrecks-source-v1';
const HALO_ID='bp-plane-wrecks-halo-v1';
const MARKER_ID='bp-plane-wrecks-markers-v1';
const LABEL_ID='bp-plane-wrecks-labels-v1';
const CONTROL_ID='bp-plane-wrecks-control-v1';
const TOGGLE_ID='bp-plane-wrecks-toggle-v1';
const COUNT_ID='bp-plane-wrecks-count-v1';
const STATUS_ID='bp-plane-wrecks-status-v1';
const ICON_ID='bp-plane-wrecks-icon-v1';
const MODEL_LAYER_ID='bp-plane-wrecks-native-model-v1';
let threePromise=null;

export const F4U1_CORSAIR_WRECK={
 id:'f4u1-corsair-kwajalein',
 name:'F4U-1 Corsair — BuNo 56267',
 label:'F4U-1 CORSAIR',
 aircraft:'Chance Vought F4U-1 Corsair',
 coordinates:[167.4270,9.3442],
 coordinateText:'Approximate position off Mellu Island, Kwajalein Atoll',
 depthM:33.5,
 lostDate:'30 June 1945',
 builtYear:1943,
 sourcePhotos:1294,
 license:'CC BY 4.0',
 creators:'Haoran Wang · Nantheera Anantrasirichai · Brett Seymour',
 datasetUrl:'https://zenodo.org/records/21824088',
 sourceUrl:'https://www.nps.gov/articles/000/kwajalein-atoll-underwater-aircraft-graveyard.htm',
 historySourceUrl:'https://www.pacificwrecks.com/aircraft/f4u/56267.html',
 assetUrl:ASSET,
 location:'Aircraft graveyard off Mellu Island, Kwajalein Atoll, Republic of the Marshall Islands',
 representation:'BridgePoint-hosted colorized COLMAP photogrammetry point cloud generated from the source 3D reconstruction. It is not a watertight or textured aircraft mesh.',
 locationPrecision:'Approximate wreck-site placement off Mellu Island. The source point cloud has no published GPS origin or survey-grade geodetic transform.',
 scalePrecision:'The source COLMAP reconstruction does not publish a metric scale certificate. Original local reconstruction units are preserved; apparent size is for visualization.',
 depthPrecision:'Published source reports approximately 110 ft (33.5 m) depth. BridgePoint places the visual center at that approximate depth.',
 wreckCondition:'The aircraft lies nose-down. Published wreck documentation reports the rudder, elevators and landing gear missing.'
};

function safe(value){
 return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function mapOf(target){return target&&(target.map||target);}
function allowed(state,on){
 try{return window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('planewrecks',!!on)!==false;}
 catch(_){return false;}
}
function setStatus(state,message){
 state.status=String(message||'');
 const element=document.getElementById(STATUS_ID);
 if(element)element.textContent=state.status;
 const popup=state.popup?.getElement?.()?.querySelector('[data-plane-wreck-status]');
 if(popup)popup.textContent=state.modelStatus||state.status;
}
function refreshUi(state){
 const count=document.getElementById(COUNT_ID);
 if(count)count.textContent='1 persistent aircraft-wreck icon · '+(state.stats.pointCount||'812,536')+' photogrammetry points · BridgePoint-hosted viewer';
 const status=document.getElementById(STATUS_ID);
 if(status)status.textContent=state.status;
 const button=document.getElementById(TOGGLE_ID);
 if(button){
  button.setAttribute('aria-pressed',String(state.enabled));
  button.classList.toggle('is-active',state.enabled);
 }
}
function makePlaneIcon(){
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
 const context=canvas.getContext('2d');
 context.clearRect(0,0,64,64);
 context.shadowColor='rgba(4,11,18,.95)';context.shadowBlur=5;
 context.fillStyle='#f1c876';context.strokeStyle='#fff0bf';context.lineWidth=1.6;
 context.beginPath();
 context.moveTo(32,4);context.lineTo(36,24);context.lineTo(59,34);
 context.lineTo(59,39);context.lineTo(36,35);context.lineTo(37,51);
 context.lineTo(45,57);context.lineTo(45,60);context.lineTo(32,56);
 context.lineTo(19,60);context.lineTo(19,57);context.lineTo(27,51);
 context.lineTo(28,35);context.lineTo(5,39);context.lineTo(5,34);
 context.lineTo(28,24);context.closePath();
 context.fill();context.stroke();
 return canvas;
}
export function buildPlaneWreckFeatures(){
 const wreck=F4U1_CORSAIR_WRECK;
 return [{
  type:'Feature',
  id:wreck.id,
  geometry:{type:'Point',coordinates:wreck.coordinates.slice()},
  properties:{wreckId:wreck.id,name:wreck.name,label:wreck.label,iconImage:ICON_ID,depthM:wreck.depthM}
 }];
}
function installLayers(state){
 const map=state.map;
 if(!map?.getStyle?.())return false;
 try{
  allowed(state,state.enabled);
  if(!map.hasImage?.(ICON_ID))map.addImage(ICON_ID,makePlaneIcon(),{pixelRatio:2});
  if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{
   type:'geojson',
   data:{type:'FeatureCollection',features:buildPlaneWreckFeatures()},
   buffer:64,maxzoom:14,
   attribution:'F4U-1 Corsair KWAJ underwater photogrammetry: Haoran Wang, Nantheera Anantrasirichai and Brett Seymour, Abyssal dataset, CC BY 4.0.'
  });
  const add=(id,layer)=>{if(!map.getLayer(id))map.addLayer(layer);};
  add(HALO_ID,{
   id:HALO_ID,type:'circle',source:SOURCE_ID,minzoom:0,maxzoom:24,
   layout:{visibility:state.enabled?'visible':'none'},
   paint:{
    'circle-radius':['interpolate',['linear'],['zoom'],0,4,5,7,10,10,16,14,22,17],
    'circle-color':'#e7b95d','circle-opacity':0.38,'circle-blur':0.50
   }
  });
  add(MARKER_ID,{
   id:MARKER_ID,type:'symbol',source:SOURCE_ID,minzoom:0,maxzoom:24,
   layout:{
    visibility:state.enabled?'visible':'none','icon-image':ICON_ID,
    'icon-size':['interpolate',['linear'],['zoom'],0,0.40,4,0.50,9,0.68,14,0.82,22,0.95],
    'icon-anchor':'center','icon-allow-overlap':true,'icon-ignore-placement':true,
    'symbol-sort-key':150
   }
  });
  add(LABEL_ID,{
   id:LABEL_ID,type:'symbol',source:SOURCE_ID,minzoom:4,maxzoom:24,
   layout:{
    visibility:state.enabled?'visible':'none','text-field':['get','label'],
    'text-size':['interpolate',['linear'],['zoom'],4,9,10,11,17,13],
    'text-offset':[0,1.3],'text-anchor':'top','text-allow-overlap':true,'text-ignore-placement':true
   },
   paint:{'text-color':'#ffe8b7','text-halo-color':'rgba(3,12,22,.96)','text-halo-width':1.5}
  });
  setVisibility(state,state.enabled);
  state.stats.layersReady=true;
  return true;
 }catch(error){
  state.stats.lastError=String(error?.message||error);
  console.warn('BridgePoint Plane Wrecks layer unavailable',error);
  return false;
 }
}
function setVisibility(state,visible){
 allowed(state,visible);
 const value=visible?'visible':'none';
 for(const id of [HALO_ID,MARKER_ID,LABEL_ID]){
  if(!state.map.getLayer(id))continue;
  const current=state.map.getLayoutProperty(id,'visibility')||'visible';
  if(current!==value)state.map.setLayoutProperty(id,'visibility',value);
 }
}
async function loadThree(){
 if(!threePromise)threePromise=Promise.all([import(THREE_URL),import(GLTF_URL)]).then(([THREE,loader])=>{
  if(!THREE?.WebGLRenderer||!loader?.GLTFLoader)throw new Error('BridgePoint local Three.js or GLTFLoader is unavailable');
  return {THREE,GLTFLoader:loader.GLTFLoader};
 }).catch(error=>{threePromise=null;throw error;});
 return threePromise;
}
async function loadPointCloud(state){
 if(state.modelRoot)return state.modelRoot;
 if(state.modelPromise)return state.modelPromise;
 state.modelPromise=(async()=>{
  const pair=await loadThree();
  if(state.destroyed)throw new Error('Plane Wrecks layer closed');
  const response=await fetch(ASSET,{cache:'force-cache'});
  if(!response.ok)throw new Error('BridgePoint Corsair GLB request failed ('+response.status+')');
  if(typeof DecompressionStream==='undefined')throw new Error('Gzip decompression is unavailable in this browser');
  const compressed=await response.arrayBuffer();
  const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer=await new Response(stream).arrayBuffer();
  if(new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('Corsair asset is not a valid binary glTF');
  const gltf=await new pair.GLTFLoader().parseAsync(buffer,'');
  if(!gltf?.scene)throw new Error('Corsair point-cloud GLB contains no scene');
  const root=gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const bounds=new pair.THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())throw new Error('Corsair photogrammetry contains no points');
  const size=bounds.getSize(new pair.THREE.Vector3());
  const center=bounds.getCenter(new pair.THREE.Vector3());
  root.position.sub(center);
  root.traverse(object=>{
   if(!object.isPoints&&!object.isMesh)return;
   object.frustumCulled=false;
   object.renderOrder=1000;
   const materials=Array.isArray(object.material)?object.material:[object.material];
   for(const original of materials){
    if(!original)continue;
    const material=original.clone?.()||original;
    material.depthTest=false;
    material.depthWrite=false;
    material.transparent=false;
    material.vertexColors=true;
    if(object.isPoints){
     material.size=2.6;
     material.sizeAttenuation=false;
     material.toneMapped=false;
   }
    material.needsUpdate=true;
    if(Array.isArray(object.material)){
     const index=materials.indexOf(original);
     object.material[index]=material;
    }else object.material=material;
   }
  });
  root.updateMatrixWorld(true);
  state.modelRoot=root;
  state.modelBounds={x:size.x,y:size.y,z:size.z};
  state.THREE=pair.THREE;
  state.GLTFLoader=pair.GLTFLoader;
  state.stats.pointCount=rootPointCount(gltf.scene);
  return root;
 })().catch(error=>{state.modelPromise=null;throw error;});
 return state.modelPromise;
}
function rootPointCount(root){
 let count=0;
 root?.traverse?.(object=>{if(object.isPoints&&object.geometry?.attributes?.position)count+=object.geometry.attributes.position.count;});
 return count;
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
function ensureNativeMapLayer(state){
 const map=state.map,THREE=state.THREE;
 if(!THREE||state.destroyed)return false;
 if(map.getLayer(MODEL_LAYER_ID)&&state.mapRenderer&&state.mapScene)return true;
 const layer={
  id:MODEL_LAYER_ID,type:'custom',renderingMode:'3d',
  onAdd(mapRef,gl){
   state.mapRenderer=new THREE.WebGLRenderer({
    canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'
   });
   state.mapRenderer.autoClear=false;
   state.mapRenderer.outputColorSpace=THREE.SRGBColorSpace;
   state.mapScene=new THREE.Scene();
   state.mapCamera=new THREE.Camera();
   state.mapScene.add(new THREE.AmbientLight(0xffffff,1.8));
   if(state.modelRoot)state.mapScene.add(state.modelRoot);
   state.stats.nativeLayerReady=true;
  },
  render(_gl,args){
   if(!state.enabled||!state.modelVisible||!state.modelRoot||!state.mapRenderer||!state.mapScene||!state.mapCamera)return;
   if(Number(map.getZoom?.()||0)<12.2){state.modelRoot.visible=false;return;}
   const bounds=map.getBounds?.();
   try{if(bounds&&!bounds.contains(F4U1_CORSAIR_WRECK.coordinates)){state.modelRoot.visible=false;return;}}catch(_){}
   const raw=args&&(args.defaultProjectionData?.mainMatrix||args.modelViewProjectionMatrix);
   if(!raw||raw.length<16)return;
   const matrix=nativeMapMatrix(map,THREE,F4U1_CORSAIR_WRECK.coordinates,-F4U1_CORSAIR_WRECK.depthM);
   if(!matrix){state.modelRoot.visible=false;return;}
   state.modelRoot.visible=true;
   state.mapCamera.projectionMatrix.copy(new THREE.Matrix4().fromArray(raw)).multiply(matrix);
   try{
    state.mapRenderer.resetState();
    state.mapRenderer.render(state.mapScene,state.mapCamera);
   }catch(error){
    if(!state.stats.renderWarning){state.stats.renderWarning=true;console.warn('BridgePoint Corsair native seabed render',error);}
   }finally{
    state.modelRoot.visible=false;
   }
  },
  onRemove(){
   try{state.mapRenderer?.dispose();}catch(_){}
   state.mapRenderer=null;state.mapScene=null;state.mapCamera=null;
   state.stats.nativeLayerReady=false;
  }
 };
 try{map.addLayer(layer);return true;}
 catch(error){state.stats.nativeLayerError=String(error?.message||error);return false;}
}
async function showOnSeabed(state){
 if(!state.enabled)return false;
 state.modelVisible=true;
 state.modelAutoAttempted=true;
 state.modelStatus='Preparing the BridgePoint-native point-cloud renderer…';
 updatePopupStatus(state);
 setStatus(state,'F4U-1 Corsair native underwater point cloud loading; its persistent icon remains visible.');
 try{
  const pair=await loadThree();
  if(state.destroyed||!state.enabled)return false;
  state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;
  if(!ensureNativeMapLayer(state))throw new Error('MapLibre native 3D plane-wreck layer could not attach');
  if(!state.mapRenderer)throw new Error('MapLibre WebGL renderer is unavailable');
  const root=await loadPointCloud(state);
  if(state.destroyed||!state.enabled)return false;
  if(!ensureNativeMapLayer(state))throw new Error('MapLibre native 3D plane-wreck layer could not attach');
  if(state.mapScene&&root.parent!==state.mapScene)state.mapScene.add(root);
  const b=state.modelBounds;
  state.modelStatus='BridgePoint-hosted photogrammetry points loaded · source bounds '+[b.x,b.y,b.z].map(n=>n.toFixed(1)).join(' × ')+' local reconstruction units. Displayed at the approximate 33.5 m wreck-depth reference when zoomed onto the site.';
  updatePopupStatus(state);
  setStatus(state,'F4U-1 Corsair colorized photogrammetry point cloud loaded beneath the water at the wreck-site reference.');
  state.map.triggerRepaint?.();refreshUi(state);return true;
 }catch(error){
  state.modelVisible=false;
  state.modelStatus='Native point cloud could not load: '+String(error?.message||error);
  updatePopupStatus(state);
  setStatus(state,'F4U-1 Corsair native 3D model unavailable: '+String(error?.message||error));
  return false;
 }
}
function updatePopupStatus(state){
 const node=state.popup?.getElement?.()?.querySelector('[data-plane-wreck-status]');
 if(node)node.textContent=state.modelStatus||state.status;
}
function mountCardViewer(state,popup){
 const popupRoot=popup?.getElement?.();
 const host=popupRoot?.querySelector('[data-bp-local-plane-viewer="f4u1-corsair-kwajalein"]');
 if(!host)return;
 let disposed=false,renderer=null,resizeObserver=null,animationFrame=0,model=null,scene=null,camera=null,resizeHandler=null;
 let lastX=0,lastY=0,dragging=false,distance=65;
 const cleanup=()=>{
  if(disposed)return;disposed=true;
  if(animationFrame)cancelAnimationFrame(animationFrame);
  if(resizeObserver)resizeObserver.disconnect();
  if(resizeHandler)window.removeEventListener('resize',resizeHandler);
  try{renderer?.dispose();}catch(_){}
  try{scene?.clear?.();}catch(_){}
 };
 popup.on?.('close',cleanup);
 const fail=error=>{
  if(disposed||!host.isConnected)return;
  host.innerHTML='<div class="bp-plane-wreck-viewer-error-v1">BridgePoint 3D viewer could not start: '+safe(error?.message||error)+'</div>';
 };
 (async()=>{
  try{
   const pair=await loadThree();
   if(disposed||!host.isConnected)return;
   const THREE=pair.THREE;
   const canvas=document.createElement('canvas');
   canvas.style.touchAction='none';canvas.style.cursor='grab';
   canvas.setAttribute('aria-label','F4U-1 Corsair photogrammetry point cloud. Drag to rotate; pinch or scroll to zoom.');
   host.replaceChildren(canvas);
   renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
   scene=new THREE.Scene();scene.background=new THREE.Color(0x04111c);
   camera=new THREE.PerspectiveCamera(38,1,0.1,2000);
   scene.add(new THREE.AmbientLight(0xffffff,1.7));
   const key=new THREE.DirectionalLight(0xffe5b5,1.0);key.position.set(2,4,5);scene.add(key);
   const source=await loadPointCloud(state);
   if(disposed||!host.isConnected)return;
   model=source.clone(true);
   model.traverse(object=>{
    if(!object.isPoints&&!object.isMesh)return;
    object.frustumCulled=false;
    if(object.material){
     object.material=Array.isArray(object.material)?object.material.map(m=>m.clone()):object.material.clone();
     const materials=Array.isArray(object.material)?object.material:[object.material];
     for(const material of materials){
      material.depthTest=true;material.depthWrite=true;material.vertexColors=true;
      if(object.isPoints){material.size=0.16;material.sizeAttenuation=true;material.toneMapped=false;}
      material.needsUpdate=true;
     }
    }
   });
   scene.add(model);
   const box=new THREE.Box3().setFromObject(model);
   const size=box.getSize(new THREE.Vector3());
   distance=Math.max(size.x,size.y,size.z)*1.9;
   const target=new THREE.Vector3(0,0,0);
   const spherical={theta:0.7,phi:1.05};
   const resize=()=>{
    const width=Math.max(1,host.clientWidth||320),height=Math.max(1,host.clientHeight||220);
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
   };
   resize();
   resizeHandler=resize;window.addEventListener('resize',resizeHandler);
   if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);}
   const updateCamera=()=>{
    spherical.phi=Math.max(0.08,Math.min(Math.PI-0.08,spherical.phi));
    const sin=Math.sin(spherical.phi);
    camera.position.set(
     target.x+distance*sin*Math.sin(spherical.theta),
     target.y+distance*Math.cos(spherical.phi),
     target.z+distance*sin*Math.cos(spherical.theta)
    );
    camera.lookAt(target);
   };
   updateCamera();
   canvas.addEventListener('pointerdown',event=>{
    dragging=true;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture?.(event.pointerId);canvas.style.cursor='grabbing';
   });
   canvas.addEventListener('pointermove',event=>{
    if(!dragging)return;
    const dx=event.clientX-lastX,dy=event.clientY-lastY;lastX=event.clientX;lastY=event.clientY;
    spherical.theta-=dx*0.008;spherical.phi+=dy*0.008;updateCamera();
   });
   const stop=()=>{dragging=false;canvas.style.cursor='grab';};
   canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
   canvas.addEventListener('wheel',event=>{
    event.preventDefault();distance=Math.max(4,Math.min(1600,distance*Math.exp(event.deltaY*0.0012)));updateCamera();
   },{passive:false});
   const render=()=>{
    if(disposed||!host.isConnected)return;
    renderer.render(scene,camera);animationFrame=requestAnimationFrame(render);
   };
   render();
  }catch(error){fail(error);}
 })();
}
function openPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;
 if(!Popup)return;
 if(state.popup)state.popup.remove();
 const p=F4U1_CORSAIR_WRECK;
 const html=
  '<article class="bp-plane-wreck-popup-v1">'+
   '<div class="bp-plane-wreck-kicker-v1">BRIDGEPOINT · PLANE WRECKS</div>'+
   '<h3>F4U-1 Corsair — BuNo 56267</h3>'+
   '<p class="bp-plane-wreck-subtitle-v1">World War II fighter · aircraft graveyard off Mellu Island, Kwajalein Atoll</p>'+
   '<div class="bp-plane-wreck-facts-v1">'+
    '<span><b>Aircraft</b>Chance Vought F4U-1 Corsair</span>'+
    '<span><b>BuNo</b>56267</span>'+
    '<span><b>Built</b>1943</span>'+
    '<span><b>Lost / dumped</b>30 June 1945</span>'+
    '<span><b>Published depth</b>Approx. 110 ft / 33.5 m</span>'+
    '<span><b>Source imagery</b>1,294 underwater photographs</span>'+
    '<span><b>Reconstruction</b>Approx. 812,536 colored 3D points</span>'+
    '<span><b>Model rights</b>CC BY 4.0</span>'+
   '</div>'+
   '<div class="bp-plane-wreck-viewer-v1" data-bp-local-plane-viewer="f4u1-corsair-kwajalein" role="group" aria-label="BridgePoint-hosted Corsair underwater photogrammetry viewer"><div class="bp-plane-wreck-viewer-loading-v1">Loading BridgePoint-hosted Corsair photogrammetry…</div></div>'+
   '<div class="bp-plane-wreck-actions-v1"><button type="button" data-plane-wreck-action="materialize">Place / show photogrammetry beneath the water</button></div>'+
   '<div class="bp-plane-wreck-status-v1" data-plane-wreck-status>'+safe(state.modelStatus||'BridgePoint-hosted colorized point-cloud model. The same reconstruction can be placed beneath the water at the approximate wreck depth.')+'</div>'+
   '<p class="bp-plane-wreck-accuracy-v1"><strong>Wreck history:</strong> The F4U-1 Corsair was one of the aircraft dumped into the Kwajalein lagoon at the end of World War II. Published documentation identifies this wreck as BuNo 56267, a 1943 aircraft dumped on 30 June 1945. The aircraft rests nose-down; the published wreck report notes that its rudder, elevators and landing gear are missing.</p>'+
   '<p class="bp-plane-wreck-accuracy-v1"><strong>What the model represents:</strong> This BridgePoint viewer uses the original KWAJ COLMAP 3D reconstruction from the 1,294-photo underwater sequence. It is a colorized point cloud, not a closed textured mesh or a complete restored aircraft model. The source scan includes the photographed wreck and surrounding scene.</p>'+
   '<p class="bp-plane-wreck-accuracy-v1"><strong>Globe placement:</strong> The map pin is an approximate wreck-site reference off Mellu Island, not a survey-grade aircraft GPS origin. The COLMAP model has no published geodetic origin, north alignment or metric scale certificate. BridgePoint preserves its source local reconstruction coordinates and places its visual center at the approximate site and 33.5 m depth reference.</p>'+
   '<div class="bp-plane-wreck-sources-v1"><b>Photogrammetry, history, location and licence</b>'+
    '<a href="'+safe(p.datasetUrl)+'" target="_blank" rel="noopener noreferrer">Abyssal 3D reconstruction dataset · Zenodo · CC BY 4.0 ↗</a>'+
    '<a href="'+safe(p.sourceUrl)+'" target="_blank" rel="noopener noreferrer">National Park Service · Kwajalein underwater aircraft graveyard ↗</a>'+
    '<a href="'+safe(p.historySourceUrl)+'" target="_blank" rel="noopener noreferrer">Aircraft identification and wreck record · F4U-1 BuNo 56267 ↗</a>'+
    '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution 4.0 licence ↗</a>'+
   '</div>'+
   '<p class="bp-plane-wreck-attribution-v1">Attribution: Haoran Wang, Nantheera Anantrasirichai and Brett Seymour, “Abyssal: A Large-scale Underwater 3D Reconstruction Dataset” (2026), KWAJ sequence; CC BY 4.0. BridgePoint hosts a derived colorized point-cloud GLB. Wreck positions are for visualization, not navigation.</p>'+
  '</article>';
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'490px',className:'bp-plane-wreck-popup-wrap-v1'})
  .setLngLat(lngLat||p.coordinates).setHTML(html).addTo(state.map);
 const root=state.popup.getElement?.();
 root?.querySelector('[data-plane-wreck-action="materialize"]')?.addEventListener('click',()=>{void showOnSeabed(state);});
 mountCardViewer(state,state.popup);
 void showOnSeabed(state);
}
function addStyles(){
 if(document.getElementById('bp-plane-wrecks-style-v1'))return;
 const style=document.createElement('style');style.id='bp-plane-wrecks-style-v1';
 style.textContent=
  '#'+CONTROL_ID+' .bpv-data-note{font:600 10px/1.45 system-ui,sans-serif;color:#9bb7c6;margin:5px 2px;overflow-wrap:anywhere}'+
  '#'+TOGGLE_ID+'.is-active{border-color:rgba(235,192,112,.9);background:rgba(102,71,28,.52);box-shadow:inset 0 0 0 1px rgba(255,226,165,.2)}'+
  '.bp-plane-wreck-popup-wrap-v1 .maplibregl-popup-content{background:#06131f;color:#e8f5fb;border:1px solid rgba(231,187,103,.62);border-radius:13px;padding:12px;font:12px/1.45 system-ui,sans-serif;max-height:min(82vh,820px);overflow:auto;width:min(450px,calc(100vw - 44px))}'+
  '.bp-plane-wreck-popup-wrap-v1 .maplibregl-popup-tip{border-top-color:#06131f;border-bottom-color:#06131f}'+
  '.bp-plane-wreck-kicker-v1{font-size:9px;letter-spacing:.13em;font-weight:900;color:#f0c878}.bp-plane-wreck-popup-v1 h3{font-size:18px;color:#fff;margin:4px 0}.bp-plane-wreck-subtitle-v1{color:#c4d6df;margin:2px 0 8px}'+
  '.bp-plane-wreck-facts-v1{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:7px 0 10px}.bp-plane-wreck-facts-v1 span{display:grid;gap:2px;padding:7px;border:1px solid rgba(170,197,207,.18);border-radius:7px;color:#e4eff4;font-size:10px}.bp-plane-wreck-facts-v1 b{font-size:9px;color:#9eb7c5;text-transform:uppercase;letter-spacing:.08em}'+
  '.bp-plane-wreck-viewer-v1{width:100%;aspect-ratio:4/3;min-height:220px;background:#02070d;border-radius:9px;overflow:hidden;margin:9px 0;border:1px solid rgba(226,186,109,.3)}.bp-plane-wreck-viewer-v1 canvas{width:100%;height:100%;display:block}.bp-plane-wreck-viewer-loading-v1,.bp-plane-wreck-viewer-error-v1{display:grid;place-items:center;min-height:210px;padding:20px;text-align:center;color:#c3d7df;font-size:12px;background:radial-gradient(ellipse at center,rgba(28,67,83,.42),rgba(2,7,13,.96))}'+
  '.bp-plane-wreck-actions-v1 button{width:100%;border:1px solid rgba(231,187,103,.55);border-radius:8px;padding:9px 10px;background:rgba(74,54,25,.48);color:#fff1cb;font:700 11px system-ui,sans-serif}'+
  '.bp-plane-wreck-status-v1{margin:7px 0;color:#a9d2c8;font-size:10px;overflow-wrap:anywhere}.bp-plane-wreck-accuracy-v1,.bp-plane-wreck-attribution-v1{color:#a9c2cb;margin:8px 0;font-size:10px}.bp-plane-wreck-sources-v1{display:grid;gap:5px;border-top:1px solid rgba(154,205,212,.16);padding-top:8px;margin-top:8px;font-size:10px}.bp-plane-wreck-sources-v1>b{color:#dceaf0}.bp-plane-wreck-sources-v1 a{color:#f1cf88;text-decoration:underline}'+
  '@media(max-width:480px){.bp-plane-wreck-popup-wrap-v1 .maplibregl-popup-content{width:min(345px,calc(100vw - 44px));padding:10px}.bp-plane-wreck-viewer-v1{min-height:185px}}';
 document.head.appendChild(style);
}
function addControlGroup(state){
 const dock=document.getElementById('bpv-dock-actions');
 if(!dock)return false;
 if(document.getElementById(CONTROL_ID))return true;
 addStyles();
 const group=document.createElement('section');
 group.id=CONTROL_ID;group.className='bpv-command-group';
 group.setAttribute('data-bpv-command-section','planewrecks');
 group.setAttribute('aria-label','Plane Wrecks');
 group.innerHTML=
  '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">✈</span><span><b>PLANE WRECKS</b><small>Underwater aircraft photogrammetry</small></span></div>'+
  '<div class="bpv-command-grid"><button id="'+TOGGLE_ID+'" data-bpv-action="planewrecks" type="button" class="bpv-command-btn" aria-pressed="false" title="Show or hide mapped plane-wreck markers"><span class="bpv-command-icon" aria-hidden="true">✈</span><span class="bpv-command-label">Plane Wrecks</span></button></div>'+
  '<div id="'+COUNT_ID+'" class="bpv-data-note">1 persistent aircraft-wreck icon · 812,536 photogrammetry points</div>'+
  '<div id="'+STATUS_ID+'" class="bpv-data-note">Layer off · the rest of the BridgePoint globe remains unchanged.</div>';
 const shipwreck=document.getElementById('bp-shipwrecks-control-v1');
 if(shipwreck&&shipwreck.parentNode===dock)shipwreck.after(group);else dock.appendChild(group);
 group.querySelector('#'+TOGGLE_ID).addEventListener('click',()=>{void setEnabled(state,!state.enabled);});
 refreshUi(state);
 return true;
}
function maybeAutoMaterialize(state){
 if(!state.enabled||state.modelAutoAttempted||state.modelRoot||state.modelPromise)return false;
 if(Number(state.map.getZoom?.()||0)<12.2)return false;
 const bounds=state.map.getBounds?.();
 try{if(bounds&&!bounds.contains(F4U1_CORSAIR_WRECK.coordinates))return false;}catch(_){}
 state.modelAutoAttempted=true;
 state.modelVisible=true;
 void showOnSeabed(state);
 return true;
}
function bindInteractions(state){
 if(state.interactionsBound)return;
 state.interactionsBound=true;
 state.handleClick=event=>{
  if(!state.enabled)return;
  const hits=state.map.queryRenderedFeatures?.(event.point,{layers:[MARKER_ID]})||[];
  if(!hits.some(hit=>hit.properties?.wreckId===F4U1_CORSAIR_WRECK.id))return;
  openPopup(state,event.lngLat||F4U1_CORSAIR_WRECK.coordinates);
 };
 state.handleVisibility=()=>{
  if(!state.enabled)return;
  allowed(state,true);
  if(!installLayers(state)){
   setStatus(state,'Plane Wrecks ON · waiting for map style to restore the aircraft icon.');
   refreshUi(state);return;
  }
  setVisibility(state,true);
  maybeAutoMaterialize(state);
  refreshUi(state);
 };
 state.map.on('click',state.handleClick);
 for(const event of ['style.load','load','idle','moveend','zoomend','rotateend','pitchend'])
  state.map.on(event,state.handleVisibility);
}
async function setEnabled(state,on){
 state.enabled=!!on;
 if(state.enabled){
  allowed(state,true);
  if(!installLayers(state))setStatus(state,'Plane Wrecks ON · waiting for the globe style before showing the Corsair icon.');
  else setStatus(state,'Plane Wrecks ON · the F4U-1 Corsair icon is persistent. Select it for the BridgePoint-hosted scan and wreck details.');
  if(state.modelRoot){
   state.modelVisible=true;
   if(!state.map.getLayer(MODEL_LAYER_ID))ensureNativeMapLayer(state);
  }else{
   state.modelAutoAttempted=false;
   maybeAutoMaterialize(state);
  }
 }else{
  if(state.popup){state.popup.remove();state.popup=null;}
  state.modelVisible=false;state.modelAutoAttempted=false;
  if(state.modelRoot)state.modelRoot.visible=false;
  setVisibility(state,false);
  setStatus(state,'Plane Wrecks off · its marker and seabed scan are hidden; other BridgePoint layers are unchanged.');
 }
 refreshUi(state);state.map.triggerRepaint?.();return state.enabled;
}
export function initPlaneWrecksRenderer(target){
 const map=mapOf(target);
 if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
 const existing=STATES.get(map);if(existing)return existing.api;
 const state={
  map,enabled:false,destroyed:false,popup:null,interactionsBound:false,
  modelVisible:false,modelAutoAttempted:false,modelRoot:null,modelPromise:null,modelBounds:null,
  mapRenderer:null,mapScene:null,mapCamera:null,THREE:null,GLTFLoader:null,
  modelStatus:'BridgePoint-hosted Corsair point-cloud scan has not been loaded.',
  status:'Plane Wrecks off',
  stats:{version:VERSION,parts:1,models:1,pointCount:812536,layersReady:false,nativeLayerReady:false,lastError:null}
 };
 const api={
  version:VERSION,
  get enabled(){return state.enabled;},
  get status(){return state.status;},
  get stats(){return Object.assign({},state.stats);},
  get partCount(){return 1;},
  toggle(){return setEnabled(state,!state.enabled);},
  setEnabled(on){return setEnabled(state,on);},
  refresh(){
   const source=map.getSource(SOURCE_ID);
   source?.setData?.({type:'FeatureCollection',features:buildPlaneWreckFeatures()});
   return Object.assign({},state.stats);
  },
  showOnSeabed(){return showOnSeabed(state);},
  destroy(){
   state.destroyed=true;state.enabled=false;state.modelVisible=false;
   if(state.popup)state.popup.remove();
   if(state.handleClick)map.off('click',state.handleClick);
   if(state.handleVisibility){
    for(const event of ['style.load','load','idle','moveend','zoomend','rotateend','pitchend'])
     map.off(event,state.handleVisibility);
   }
   if(state.observer)state.observer.disconnect();
   if(state.dockTimer)clearTimeout(state.dockTimer);
   if(map.getLayer(MODEL_LAYER_ID))map.removeLayer(MODEL_LAYER_ID);
   try{state.mapRenderer?.dispose();}catch(_){}
   if(state.modelRoot){state.mapScene?.remove(state.modelRoot);state.modelRoot=null;}
   for(const id of [LABEL_ID,MARKER_ID,HALO_ID])if(map.getLayer(id))map.removeLayer(id);
   if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);
   try{if(map.hasImage?.(ICON_ID))map.removeImage(ICON_ID);}catch(_){}
   const control=document.getElementById(CONTROL_ID);control?.remove();
   const styles=document.getElementById('bp-plane-wrecks-style-v1');styles?.remove();
   STATES.delete(map);
  }
 };
 state.api=api;STATES.set(map,state);
 window.__BP_PLANE_WRECKS_V1__=api;
 bindInteractions(state);
 const observeDock=()=>{
  if(!STATES.has(map))return;
  if(addControlGroup(state))return;
  state.dockTimer=setTimeout(observeDock,500);
 };
 observeDock();
 if(typeof MutationObserver!=='undefined'&&document.body){
  state.observer=new MutationObserver(()=>{
   if(STATES.has(map)&&!document.getElementById(CONTROL_ID))addControlGroup(state);
  });
  state.observer.observe(document.body,{childList:true,subtree:true});
 }
 return api;
}
