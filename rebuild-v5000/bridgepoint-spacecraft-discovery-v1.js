/* BridgePoint Spacecraft Collection — Smithsonian Space Shuttle Orbiter OV-103 Discovery.
 * A third persistent marker is synchronized to the existing Spacecraft toggle.
 * The official Smithsonian high-resolution exterior GLB is hosted locally by BridgePoint
 * and displayed in a local interactive card viewer / optional native globe model. CC0.
 */
const VERSION=1;
const THREE_URL='/vendor/three.module.js?v=169-local';
const GLTF_URL='/vendor/GLTFLoader.bundle.js?v=169-local';
const DRACO_URL='/vendor/DRACOLoader.bundle.js?v=169-draco-v1';
const TOGGLE_ID='bp-spacecraft-toggle-v1';
const COUNT_ID='bp-spacecraft-count-v1';
const STATUS_ID='bp-spacecraft-status-v1';
const MARKER_CLASS='bp-spacecraft-discovery-marker-v1';
const LAYER_ID='bp-spacecraft-discovery-native-v1';
export const SPACECRAFT_DISCOVERY_ASSETS=[
 '/assets/spacecraft/smithsonian-space-shuttle-discovery-150k-4096.glb'
];
export const SPACECRAFT_DISCOVERY={
 id:'space-shuttle-orbiter-ov103-discovery-smithsonian',
 name:'Space Shuttle Orbiter OV-103 “Discovery”',
 label:'SPACE SHUTTLE · DISCOVERY',
 vehicle:'NASA Space Shuttle Orbiter OV-103',
 site:'Steven F. Udvar-Hazy Center, Chantilly, Virginia, USA',
 coordinates:[-77.44441,38.91084],
 coordinateText:'Approx. 38.91084° N, 77.44441° W',
 mission:'39 missions · 1984–2011',
 manufacturer:'Rockwell International Corporation',
 inventoryNumber:'A20120325000',
 crew:'251 crew assignments across 39 missions',
 dimensions:'24.314 m × 17.768 m × 38.03 m',
 massKg:73176.5,
 scanHeightM:17.768,
 flightDays:365,
 totalDistanceKm:240000000,
 sourceModelUrl:'https://3d.si.edu/object/3d/d8c636ce-4ebc-11ea-b77f-2e728ce88125',
 sourceRecordUrl:'https://www.si.edu/object/orbiter-space-shuttle-ov-103-discovery%3Anasm_A20120325000',
 sourceManifestUrl:'https://3d-api.si.edu/content/document/3d_package:d8c636ce-4ebc-11ea-b77f-2e728ce88125/document.json',
 sourceAssetUrl:'https://3d-api.si.edu/content/document/3d_package:d8c636ce-4ebc-11ea-b77f-2e728ce88125/resources/SShuttle_Exterior_2019_CLI_TIF_Model_12-150k-4096-high.glb',
 sourceLicense:'Smithsonian Open Access · CC0 / public domain. The Smithsonian states this media may be copied, modified, and distributed without contacting the institution.',
 sourceMethod:'Smithsonian Digitization Program Office 3D scan. BridgePoint hosts the official high-resolution 150,000-face GLB distribution with a 4096-pixel texture; the source manifest identifies model units as metres.',
 placementPrecision:'The persistent marker identifies the Steven F. Udvar-Hazy Center, where Space Shuttle Discovery is on display. The source mesh has no geodetic origin or survey alignment; positioning the model at the museum marker is illustrative, not an indoor survey-controlled placement.'
};
export function resolveDiscoveryScanTransform(sourceDimensions){
 const axes=['x','y','z'];
 const values=axes.map(axis=>Number(sourceDimensions?.[axis]));
 if(values.some(value=>!Number.isFinite(value)||value<=0))throw new Error('Smithsonian Discovery scan has invalid source bounds');
 // The official Smithsonian 3D package manifest declares model units in metres.
 const scale=1;
 const dimensionsM=values.map(value=>value*scale);
 if(dimensionsM.some(value=>value<5||value>60)){
  throw new Error('Smithsonian Discovery GLB bounds are implausible after its documented metre-unit conversion ('+
   dimensionsM.map(value=>value.toFixed(3)).join(' × ')+' m)');
 }
 return {units:'m',scale,dimensionsM};
}

export function computeDiscoveryPrincipalFrame(points,scale=1.0){
 if(!Array.isArray(points)||points.length<8)throw new Error('Smithsonian Discovery scan has too few vertices to determine its orientation');
 let sx=0,sy=0,sz=0,count=0;
 for(const p of points){
  if(!p||p.length<3||!p.slice(0,3).every(Number.isFinite))continue;
  sx+=p[0];sy+=p[1];sz+=p[2];count++;
 }
 if(count<8)throw new Error('Smithsonian Discovery scan vertices are invalid');
 const mean=[sx/count,sy/count,sz/count];
 const cov=[[0,0,0],[0,0,0],[0,0,0]];
 for(const p of points){
  if(!p||p.length<3||!p.slice(0,3).every(Number.isFinite))continue;
  const d=[p[0]-mean[0],p[1]-mean[1],p[2]-mean[2]];
  for(let r=0;r<3;r++)for(let c=r;c<3;c++)cov[r][c]+=d[r]*d[c];
 }
 for(let r=0;r<3;r++)for(let c=r;c<3;c++){cov[r][c]/=count;cov[c][r]=cov[r][c];}
 const a=cov.map(row=>row.slice());
 const v=[[1,0,0],[0,1,0],[0,0,1]];
 // Jacobi diagonalization of the symmetric 3×3 covariance matrix.
 for(let iteration=0;iteration<48;iteration++){
  let p=0,q=1,max=Math.abs(a[0][1]);
  for(const pair of [[0,2],[1,2]]){
   const value=Math.abs(a[pair[0]][pair[1]]);
   if(value>max){max=value;p=pair[0];q=pair[1];}
  }
  if(max<1e-10)break;
  const app=a[p][p],aqq=a[q][q],apq=a[p][q];
  const tau=(aqq-app)/(2*apq);
  const t=(tau>=0?1:-1)/(Math.abs(tau)+Math.sqrt(1+tau*tau));
  const cosine=1/Math.sqrt(1+t*t),sine=t*cosine;
  a[p][p]=app-t*apq;a[q][q]=aqq+t*apq;a[p][q]=0;a[q][p]=0;
  for(let k=0;k<3;k++){
   if(k===p||k===q)continue;
   const akp=a[k][p],akq=a[k][q];
   a[k][p]=cosine*akp-sine*akq;a[p][k]=a[k][p];
   a[k][q]=sine*akp+cosine*akq;a[q][k]=a[k][q];
  }
  for(let k=0;k<3;k++){
   const vkp=v[k][p],vkq=v[k][q];
   v[k][p]=cosine*vkp-sine*vkq;
   v[k][q]=sine*vkp+cosine*vkq;
  }
 }
 const order=[0,1,2].sort((i,j)=>a[j][j]-a[i][i]);
 const axes=order.map(index=>{
  const length=Math.hypot(v[0][index],v[1][index],v[2][index])||1;
  return [v[0][index]/length,v[1][index]/length,v[2][index]/length];
 });
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const p of points){
  if(!p||p.length<3||!p.slice(0,3).every(Number.isFinite))continue;
  const d=[p[0]-mean[0],p[1]-mean[1],p[2]-mean[2]];
  for(let i=0;i<3;i++){
   const projection=d[0]*axes[i][0]+d[1]*axes[i][1]+d[2]*axes[i][2];
   min[i]=Math.min(min[i],projection);max[i]=Math.max(max[i],projection);
  }
 }
 const extentsM=max.map((value,i)=>(value-min[i])*scale);
 // The Smithsonian catalogue dimensions are 24.314 m × 17.768 m × 38.03 m.
 // Fit the measured shuttle's 17.768 m vertical axis from the full mesh rather than its raw rotated bounds.
 const expectedHeights=[17.768,38.03,24.314];
 let upIndex=-1,bestError=Infinity;
 for(const target of expectedHeights){
  for(let i=0;i<3;i++){
   const error=Math.abs(extentsM[i]-target)/target;
   if(error<bestError){bestError=error;upIndex=i;}
  }
  if(bestError<0.12)break;
 }
 if(bestError>0.35)upIndex=extentsM.indexOf(Math.min(...extentsM));
 const horizontal= [0,1,2].filter(i=>i!==upIndex).sort((i,j)=>extentsM[j]-extentsM[i]);
 return {mean,axes,extentsM,upIndex,rightIndex:horizontal[0],forwardIndex:horizontal[1],heightMatchError:bestError};
}

function collectDiscoveryVertices(root,THREE,maxSamplesPerMesh=30000){
 const points=[],position=new THREE.Vector3();
 root.traverse(object=>{
  const attribute=object.isMesh&&object.geometry?.attributes?.position;
  if(!attribute||!attribute.count)return;
  const stride=Math.max(1,Math.ceil(attribute.count/maxSamplesPerMesh));
  for(let i=0;i<attribute.count;i+=stride){
   position.fromBufferAttribute(attribute,i).applyMatrix4(object.matrixWorld);
   points.push([position.x,position.y,position.z]);
  }
 });
 return points;
}
const states=new WeakMap();
let threePromise=null;
function mapOf(target){return target&&(target.map||target);}
function safe(value){
 return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
async function loadThree(){
 if(!threePromise)threePromise=Promise.all([import(THREE_URL),import(GLTF_URL),import(DRACO_URL)]).then(([THREE,gltf,draco])=>{
  if(!THREE?.WebGLRenderer||!gltf?.GLTFLoader||!draco?.DRACOLoader)throw new Error('BridgePoint local Three.js/GLTF loaders are unavailable');
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
async function loadDiscovery(state){
 const col=state.discovery;
 if(col.group)return col.group;
 if(col.promise)return col.promise;
 col.promise=(async()=>{
  const pair=await loadThree();
  if(state.destroyed)throw new Error('Discovery viewer was closed');
  state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;state.DRACOLoader=pair.DRACOLoader;
  const root=new pair.THREE.Group();
  root.name='Smithsonian Space Shuttle Discovery — exterior digitization';
  for(const asset of SPACECRAFT_DISCOVERY_ASSETS){
   const response=await fetch(asset,{cache:'force-cache'});
   if(!response.ok)throw new Error('BridgePoint-hosted Discovery asset failed ('+response.status+'): '+asset);
   const buffer=await response.arrayBuffer();
   if(buffer.byteLength<24||new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('Discovery asset is not a valid binary glTF: '+asset);
   const gltf=await configureLoader(state).parseAsync(buffer,'');
   if(!gltf?.scene)throw new Error('Smithsonian Discovery component contains no scene: '+asset);
   const part=gltf.scene;
   part.name=asset.split('/').pop();
   root.add(part);
  }
  // The scan is centimetre-scaled and not aligned to a single source X/Y/Z axis.
  // Fit principal axes from mesh vertices, then orient its real long/short axes upright.
  root.quaternion.identity();
  root.scale.setScalar(1);
  root.updateMatrixWorld(true);
  const sourceBounds=new pair.THREE.Box3().setFromObject(root);
  if(sourceBounds.isEmpty())throw new Error('Smithsonian Discovery exterior mesh is empty');
  const sourceDimensions=sourceBounds.getSize(new pair.THREE.Vector3());
  const transform=resolveDiscoveryScanTransform(sourceDimensions);
  const vertices=collectDiscoveryVertices(root,pair.THREE);
  const frame=computeDiscoveryPrincipalFrame(vertices,transform.scale);
  const right=new pair.THREE.Vector3(...frame.axes[frame.rightIndex]).normalize();
  const up=new pair.THREE.Vector3(...frame.axes[frame.upIndex]).normalize();
  const forward=new pair.THREE.Vector3().crossVectors(right,up).normalize();
  const principalBasis=new pair.THREE.Matrix4().makeBasis(right,up,forward);
  root.quaternion.setFromRotationMatrix(principalBasis.transpose());
  root.scale.setScalar(transform.scale);
  root.updateMatrixWorld(true);
  let bounds=new pair.THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())throw new Error('Smithsonian Discovery exterior mesh is empty after normalization');
  const dimensions=bounds.getSize(new pair.THREE.Vector3());
  if(![dimensions.x,dimensions.y,dimensions.z].every(value=>Number.isFinite(value)&&value>5&&value<60)){
   throw new Error('Normalized Discovery scan bounds are outside the plausible metre range');
  }
  const center=bounds.getCenter(new pair.THREE.Vector3());
  root.position.x-=center.x;
  root.position.z-=center.z;
  root.position.y-=bounds.min.y;
  root.updateMatrixWorld(true);
  bounds=new pair.THREE.Box3().setFromObject(root);
  col.group=root;
  col.dimensions={x:dimensions.x,y:dimensions.y,z:dimensions.z};
  col.scanTransform={units:transform.units,scale:transform.scale,principalExtentsM:frame.extentsM,principalHeightAxis:frame.upIndex};
  col.stats.assetLoaded=true;
  col.stats.heightM=dimensions.y;
  col.status='The Smithsonian Discovery scan uses its manifest-declared metre units and is aligned using its fitted principal 3D axes. The oriented mesh envelope is '+dimensions.x.toFixed(3)+' × '+dimensions.y.toFixed(3)+' × '+dimensions.z.toFixed(3)+' m; catalogue object dimensions remain '+SPACECRAFT_DISCOVERY.dimensions+'.';
  setStatus(state,col.status);
  return root;
 })().catch(error=>{col.promise=null;throw error;});
 return col.promise;
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
 const col=state.discovery,map=state.map,THREE=state.THREE;
 if(!THREE||!col.group||state.destroyed||!map?.getStyle?.())return false;
 if(map.getLayer(LAYER_ID)&&col.renderer&&col.scene)return true;
 const layer={
  id:LAYER_ID,type:'custom',renderingMode:'3d',
  onAdd(mapRef,gl){
   col.renderer=new THREE.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
   col.renderer.autoClear=false;
   col.renderer.outputColorSpace=THREE.SRGBColorSpace;
   col.scene=new THREE.Scene();
   col.scene.add(new THREE.AmbientLight(0xffffff,2.0));
   const key=new THREE.DirectionalLight(0xffffff,1.25);key.position.set(-3,8,5);col.scene.add(key);
   const fill=new THREE.DirectionalLight(0x9ec7df,0.65);fill.position.set(4,2,-5);col.scene.add(fill);
   col.camera=new THREE.Camera();
   if(col.group.parent!==col.scene)col.scene.add(col.group);
   col.stats.nativeLayerReady=true;
  },
  render(_gl,args){
   if(!state.enabled||!col.modelVisible||!col.group||!col.renderer||!col.scene||!col.camera)return;
   if(Number(map.getZoom?.()||0)<15.5){col.group.visible=false;return;}
   try{const bounds=map.getBounds?.();if(bounds&&!bounds.contains(SPACECRAFT_DISCOVERY.coordinates)){col.group.visible=false;return;}}catch(_){}
   try{
    const elevation=map.queryTerrainElevation?.(SPACECRAFT_DISCOVERY.coordinates,{exaggerated:false});
    if(elevation!==null&&elevation!==undefined&&Number.isFinite(Number(elevation)))col.altitudeM=Number(elevation);
   }catch(_){}
   const raw=args&&(args.defaultProjectionData?.mainMatrix||args.modelViewProjectionMatrix);
   if(!raw||raw.length<16)return;
   const matrix=nativeMapMatrix(map,THREE,SPACECRAFT_DISCOVERY.coordinates,col.altitudeM);
   if(!matrix){col.group.visible=false;return;}
   col.group.visible=true;
   col.camera.projectionMatrix.copy(new THREE.Matrix4().fromArray(raw)).multiply(matrix);
   try{col.renderer.resetState();col.renderer.render(col.scene,col.camera);}
   catch(error){if(!col.stats.renderWarning){col.stats.renderWarning=true;console.warn('BridgePoint Discovery globe renderer',error);}}
   finally{col.group.visible=false;}
  },
  onRemove(){
   try{col.renderer?.dispose();}catch(_){}
   col.renderer=null;col.scene=null;col.camera=null;col.stats.nativeLayerReady=false;
  }
 };
 try{map.addLayer(layer);return true;}
 catch(error){col.stats.nativeLayerError=String(error?.message||error);return false;}
}
async function showOnGlobe(state){
 if(!state.enabled)return false;
 const col=state.discovery;
 col.modelVisible=true;
 setStatus(state,'Loading the BridgePoint-hosted Smithsonian Discovery scan for the globe…');
 try{
  await loadDiscovery(state);
  if(state.destroyed||!state.enabled)return false;
  if(!ensureNativeLayer(state))throw new Error('MapLibre Discovery 3D layer could not attach');
  if(!col.renderer)throw new Error('MapLibre Discovery WebGL renderer is unavailable');
  if(col.scene&&col.group.parent!==col.scene)col.scene.add(col.group);
  state.map.flyTo?.({center:SPACECRAFT_DISCOVERY.coordinates,zoom:16.4,pitch:48,duration:1500});
  state.map.triggerRepaint?.();
  col.status='The Smithsonian Space Shuttle Discovery scan is hosted by BridgePoint in metre units and aligned using its principal scan axes; the museum pin is approximate, not survey-controlled.';
  setStatus(state,col.status);
  return true;
 }catch(error){
  col.modelVisible=false;col.autoAttempted=false;
  col.status='Discovery globe model could not load: '+String(error?.message||error);
  setStatus(state,col.status);
  return false;
 }
}
function makeMarkerIcon(){
 const node=document.createElement('span');
 node.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M32 4c-7 7-10 19-10 31l-9 10v8l14-6h10l14 6v-8l-9-10C42 23 39 11 32 4Z" fill="currentColor" stroke="#fff0c2" stroke-width="2" stroke-linejoin="round"/><path d="M23 38 14 54l12-5M41 38l9 16-12-5M27 47l5 13 5-13" fill="#ee7835" stroke="#fff0c2" stroke-width="1.3" stroke-linejoin="round"/><circle cx="32" cy="25" r="4.2" fill="#24475c" stroke="#fff0c2" stroke-width="1.2"/></svg>';
 return node.firstElementChild;
}
function ensureMarker(state,visible=state.enabled){
 const Marker=window.maplibregl?.Marker;
 if(typeof Marker!=='function')return false;
 const col=state.discovery;
 try{
  if(!col.marker){
   const element=document.createElement('button');
   element.type='button';
   element.className=MARKER_CLASS;
   element.setAttribute('aria-label','Space Shuttle Orbiter OV-103 Discovery at the Steven F. Udvar-Hazy Center. Open BridgePoint 3D card.');
   element.title='Space Shuttle Orbiter OV-103 Discovery · Smithsonian · open BridgePoint 3D card';
   element.appendChild(makeMarkerIcon());
   element.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    if(state.enabled)openPopup(state,SPACECRAFT_DISCOVERY.coordinates);
   });
   col.markerElement=element;
   col.marker=new Marker({element,anchor:'center',offset:[0,0]});
  }
  col.marker.setLngLat(SPACECRAFT_DISCOVERY.coordinates).addTo(state.map);
  const element=col.marker.getElement?.()||col.markerElement;
  if(element){element.hidden=!visible;element.setAttribute('aria-hidden',String(!visible));element.disabled=!visible;}
  col.stats.markerReady=true;col.stats.markerVisible=!!visible;
  return true;
 }catch(error){col.stats.markerError=String(error?.message||error);return false;}
}
function maybeAutoMaterialize(state){
 const col=state.discovery;
 if(!state.enabled)return false;
 ensureMarker(state,true);
 if(Number(state.map.getZoom?.()||0)<15.5)return false;
 try{const bounds=state.map.getBounds?.();if(bounds&&!bounds.contains(SPACECRAFT_DISCOVERY.coordinates))return false;}catch(_){}
 if(col.group){col.modelVisible=true;if(!ensureNativeLayer(state))return false;state.map.triggerRepaint?.();return true;}
 if(col.promise||col.autoAttempted)return false;
 col.autoAttempted=true;col.modelVisible=true;void showOnGlobe(state);return true;
}
function mountViewer(state,popup){
 const popupRoot=popup?.getElement?.();
 const host=popupRoot?.querySelector('[data-bp-local-spacecraft-viewer]');
 if(!host)return;
 let disposed=false,renderer=null,resizeObserver=null,frame=0,model=null,camera=null,scene=null,resizeHandler=null;
 let distance=8,lastX=0,lastY=0,dragging=false;
 const clean=()=>{
  if(disposed)return;disposed=true;
  if(frame)cancelAnimationFrame(frame);
  resizeObserver?.disconnect();
  if(resizeHandler)window.removeEventListener('resize',resizeHandler);
  try{renderer?.dispose();}catch(_){}
  try{scene?.clear?.();}catch(_){}
 };
 popup.on?.('close',clean);
 const fail=error=>{
  if(!disposed&&host.isConnected)host.innerHTML='<div class="bp-spacecraft-viewer-error">BridgePoint Discovery viewer could not start: '+safe(error?.message||error)+'</div>';
 };
 (async()=>{
  try{
   const pair=await loadThree();
   if(disposed||!host.isConnected)return;
   await loadDiscovery(state);
   if(disposed||!host.isConnected)return;
   const THREE=pair.THREE,canvas=document.createElement('canvas');
   canvas.style.touchAction='none';canvas.style.cursor='grab';
   canvas.setAttribute('aria-label','Interactive BridgePoint-hosted Smithsonian Space Shuttle Discovery exterior 3D scan. Drag to rotate; scroll or pinch to zoom.');
   host.replaceChildren(canvas);
   renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
   scene=new THREE.Scene();scene.background=new THREE.Color(0x04111c);
   camera=new THREE.PerspectiveCamera(38,1,0.05,500);
   scene.add(new THREE.AmbientLight(0xffffff,1.6));
   const key=new THREE.DirectionalLight(0xffedce,1.5);key.position.set(-4,9,6);scene.add(key);
   const fill=new THREE.DirectionalLight(0x8ebbd3,0.7);fill.position.set(4,2,-6);scene.add(fill);
   model=state.discovery.group.clone(true);
   model.visible=true;model.traverse(object=>{object.frustumCulled=false;});
   scene.add(model);
   const bounds=new THREE.Box3().setFromObject(model);
   const size=bounds.getSize(new THREE.Vector3());
   const target=bounds.getCenter(new THREE.Vector3());
   const span=Math.max(size.x,size.y,size.z);
   distance=span*2.0;
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
   const reset=()=>{distance=span*2.0;spherical.theta=0.72;spherical.phi=1.06;updateCamera();};
   canvas.addEventListener('pointerdown',event=>{dragging=true;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture?.(event.pointerId);canvas.style.cursor='grabbing';});
   canvas.addEventListener('pointermove',event=>{if(!dragging)return;const dx=event.clientX-lastX,dy=event.clientY-lastY;lastX=event.clientX;lastY=event.clientY;spherical.theta-=dx*0.008;spherical.phi+=dy*0.008;updateCamera();});
   const stop=()=>{dragging=false;canvas.style.cursor='grab';};
   canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
   canvas.addEventListener('wheel',event=>{event.preventDefault();distance=Math.max(span*0.72,Math.min(span*7,distance*Math.exp(event.deltaY*0.001)));updateCamera();},{passive:false});
   popupRoot.querySelector('[data-spacecraft-view-reset]')?.addEventListener('click',reset);
   updateCamera();
   const draw=()=>{if(disposed||!renderer||!scene||!camera)return;renderer.render(scene,camera);frame=requestAnimationFrame(draw);};
   draw();
  }catch(error){fail(error);}
 })();
}
function openPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;
 if(!Popup)return;
 state.popup?.remove();
 const html=
  '<article class="bp-spacecraft-popup">'+
   '<div class="bp-spacecraft-kicker">BRIDGEPOINT · SPACECRAFT COLLECTION</div>'+
   '<h3>Space Shuttle Orbiter OV-103 “Discovery”</h3>'+
   '<p class="bp-spacecraft-subtitle">NASA Space Shuttle · Steven F. Udvar-Hazy Center · Chantilly, Virginia</p>'+
   '<div class="bp-spacecraft-viewer" data-bp-local-spacecraft-viewer role="group" aria-label="BridgePoint-hosted Smithsonian Space Shuttle Discovery 3D scan viewer"><div class="bp-spacecraft-viewer-loading">Loading the BridgePoint-hosted Smithsonian Discovery scan…</div></div>'+
   '<div class="bp-spacecraft-viewer-controls"><button type="button" data-spacecraft-view-reset>Reset 3D view</button><button type="button" data-spacecraft-action="materialize-discovery">Show 3D scan on the globe</button></div>'+
   '<div class="bp-spacecraft-status" data-spacecraft-status>'+safe(state.discovery.status||'Smithsonian Space Shuttle Discovery 3D scan ready to load.')+'</div>'+
   '<div class="bp-spacecraft-facts">'+
    '<span><b>Orbiter</b>OV-103 · Discovery</span>'+
    '<span><b>Flight record</b>39 missions · 1984–2011</span>'+
    '<span><b>Time in space</b>365 days</span>'+
    '<span><b>Total distance</b>Approx. 240 million km</span>'+
    '<span><b>Manufacturer</b>Rockwell International</span>'+
    '<span><b>Overall dimensions</b>24.314 × 17.768 × 38.03 m</span>'+
    '<span><b>Mass</b>73,176.5 kg</span>'+
    '<span><b>Inventory</b>Smithsonian A20120325000</span>'+
   '</div>'+
   '<p class="bp-spacecraft-note"><strong>What you are viewing:</strong> The actual Smithsonian 3D digitization of Space Shuttle Discovery, not a BridgePoint-built CAD approximation. BridgePoint hosts the Smithsonian high-resolution 150,000-face GLB distribution with a 4096-pixel texture. The Smithsonian package declares metre units; BridgePoint fits the model’s principal 3D axes so its long, wide and vertical dimensions are oriented correctly in the viewer.</p>'+
   '<p class="bp-spacecraft-note"><strong>Globe placement:</strong> The persistent icon marks the Steven F. Udvar-Hazy Center, where Discovery is on display. The source has no geodetic origin or survey alignment, so the model’s globe position is an illustrative museum placement, not an exact indoor survey position.</p>'+
   '<div class="bp-spacecraft-sources"><b>Smithsonian object, 3D model and source package</b>'+
    '<a href="'+safe(SPACECRAFT_DISCOVERY.sourceRecordUrl)+'" target="_blank" rel="noopener noreferrer">Smithsonian · Space Shuttle Discovery collection record ↗</a>'+
    '<a href="'+safe(SPACECRAFT_DISCOVERY.sourceModelUrl)+'" target="_blank" rel="noopener noreferrer">Smithsonian 3D · Discovery scan and model ↗</a>'+
    '<a href="'+safe(SPACECRAFT_DISCOVERY.sourceManifestUrl)+'" target="_blank" rel="noopener noreferrer">Smithsonian · 3D package manifest ↗</a>'+
   '</div>'+
   '<p class="bp-spacecraft-attribution">Source: Smithsonian Institution, National Air and Space Museum, Orbiter, Space Shuttle, OV-103, Discovery, inventory A20120325000. Model rights: Open Access CC0 / public domain; the Smithsonian permits copying, modification and distribution. Smithsonian attribution is retained. The marker and globe registration are approximate, not survey-grade.</p>'+
  '</article>';
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'540px',className:'bp-spacecraft-discovery-popup-wrap'}).setLngLat(lngLat||SPACECRAFT_DISCOVERY.coordinates).setHTML(html).addTo(state.map);
 const root=state.popup.getElement?.();
 root?.querySelector('[data-spacecraft-action="materialize-discovery"]')?.addEventListener('click',()=>{void showOnGlobe(state);});
 mountViewer(state,state.popup);
}
function addStyles(){
 if(document.getElementById('bp-spacecraft-discovery-style-v1'))return;
 const style=document.createElement('style');
 style.id='bp-spacecraft-discovery-style-v1';
 style.textContent=
  '.'+MARKER_CLASS+'{display:grid;place-items:center;width:46px;height:46px;padding:7px;border:1px solid rgba(255,232,178,.98);border-radius:50%;background:radial-gradient(circle,rgba(13,35,49,.97) 38%,rgba(5,17,27,.92) 74%);color:#f4c978;box-shadow:0 0 0 3px rgba(232,186,94,.22),0 2px 12px rgba(0,0,0,.86);cursor:pointer;touch-action:manipulation;z-index:44}'+
  '.'+MARKER_CLASS+'[hidden]{display:none!important}.'+MARKER_CLASS+' svg{display:block;width:31px;height:31px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.95))}.'+MARKER_CLASS+':focus-visible{outline:3px solid #fff;outline-offset:3px}'+
  '.bp-spacecraft-discovery-popup-wrap .maplibregl-popup-content{background:#06131f;color:#e8f5fb;border:1px solid rgba(231,187,103,.64);border-radius:13px;padding:12px;font:12px/1.45 system-ui,sans-serif;max-height:min(84vh,900px);overflow:auto;width:min(510px,calc(100vw - 38px))}'+
  '.bp-spacecraft-discovery-popup-wrap .maplibregl-popup-tip{border-top-color:#06131f;border-bottom-color:#06131f}'+
  '.bp-spacecraft-kicker{font-size:9px;letter-spacing:.13em;font-weight:900;color:#f0c878}.bp-spacecraft-popup h3{font-size:18px;color:#fff;margin:4px 0}.bp-spacecraft-subtitle{color:#c4d6df;margin:2px 0 8px}'+
  '.bp-spacecraft-viewer{width:100%;aspect-ratio:4/3;min-height:260px;background:#02070d;border-radius:9px;overflow:hidden;margin:9px 0;border:1px solid rgba(226,186,109,.36)}.bp-spacecraft-viewer canvas{width:100%;height:100%;display:block}.bp-spacecraft-viewer-loading,.bp-spacecraft-viewer-error{display:grid;place-items:center;min-height:240px;padding:20px;text-align:center;color:#c3d7df;font-size:12px;background:radial-gradient(ellipse at center,rgba(28,67,83,.42),rgba(2,7,13,.96))}'+
  '.bp-spacecraft-viewer-controls{display:flex;gap:7px;flex-wrap:wrap}.bp-spacecraft-viewer-controls button{flex:1 1 150px;border:1px solid rgba(231,187,103,.55);border-radius:8px;padding:9px 10px;background:rgba(74,54,25,.48);color:#fff1cb;font:700 11px system-ui,sans-serif}'+
  '.bp-spacecraft-status{margin:7px 0;color:#a9d2c8;font-size:10px;overflow-wrap:anywhere}.bp-spacecraft-facts{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0}.bp-spacecraft-facts span{display:grid;gap:2px;padding:7px;border:1px solid rgba(170,197,207,.18);border-radius:7px;color:#e4eff4;font-size:10px}.bp-spacecraft-facts b{font-size:9px;color:#9eb7c5;text-transform:uppercase;letter-spacing:.08em}.bp-spacecraft-note,.bp-spacecraft-attribution{color:#a9c2cb;margin:8px 0;font-size:10px}.bp-spacecraft-sources{display:grid;gap:5px;border-top:1px solid rgba(154,205,212,.16);padding-top:8px;margin-top:8px;font-size:10px}.bp-spacecraft-sources>b{color:#dceaf0}.bp-spacecraft-sources a{color:#f1cf88;text-decoration:underline}'+
  '@media(max-width:480px){.bp-spacecraft-discovery-popup-wrap .maplibregl-popup-content{width:min(365px,calc(100vw - 30px));padding:10px}.bp-spacecraft-viewer{min-height:220px}.bp-spacecraft-facts{grid-template-columns:1fr 1fr}}';
 document.head.appendChild(style);
}
function setStatus(state,message){
 state.discovery.status=String(message||'');
 const popup=state.popup?.getElement?.()?.querySelector('[data-spacecraft-status]');
 if(popup)popup.textContent=state.discovery.status;
 const status=document.getElementById(STATUS_ID);
 if(status&&!status.textContent.includes('Discovery'))status.textContent+=' · Discovery 3D scan available';
}
function updateCount(){
 const count=document.getElementById(COUNT_ID);
 if(!count)return;
 const label='3 persistent spacecraft icons · SLS + Mobile Launcher at Pad 39B · Apollo 11 Columbia at the Smithsonian · Space Shuttle Discovery at Udvar-Hazy · BridgePoint-hosted 3D viewers';
 if(count.textContent!==label)count.textContent=label;
}
function readToggle(state){
 const button=state.toggleButton||document.getElementById(TOGGLE_ID);
 const enabled=button?.getAttribute('aria-pressed')==='true';
 if(enabled===state.enabled)return;
 state.enabled=enabled;
 ensureMarker(state,enabled);
 if(!enabled){
  state.discovery.modelVisible=false;
  state.discovery.marker?.getElement?.()?.setAttribute('aria-hidden','true');
  state.map.triggerRepaint?.();
 }else{
  ensureMarker(state,true);
  maybeAutoMaterialize(state);
  state.map.triggerRepaint?.();
 }
 updateCount();
}
function attachToggle(state){
 const button=document.getElementById(TOGGLE_ID);
 if(!button||state.toggleButton===button)return false;
 state.toggleButton=button;
 button.addEventListener('click',()=>queueMicrotask(()=>readToggle(state)));
 state.toggleObserver?.disconnect();
 state.toggleObserver=new MutationObserver(()=>readToggle(state));
 state.toggleObserver.observe(button,{attributes:true,attributeFilter:['aria-pressed']});
 readToggle(state);
 updateCount();
 return true;
}
function bindMapEvents(state){
 if(state.bound)return;
 state.bound=true;
 state.handleMapChange=()=>{
  if(!state.enabled)return;
  ensureMarker(state,true);
  if(state.discovery.group&&!state.map.getLayer(LAYER_ID))ensureNativeLayer(state);
  maybeAutoMaterialize(state);
  state.map.triggerRepaint?.();
 };
 for(const event of ['style.load','load','idle','moveend','zoomend','rotateend','pitchend'])state.map.on?.(event,state.handleMapChange);
}
export function initSpacecraftDiscoveryRenderer(target){
 const map=mapOf(target);
 if(!map||typeof map.getBounds!=='function'||typeof map.addLayer!=='function')return null;
 const existing=states.get(map);
 if(existing)return existing.api;
 addStyles();
 const state={
  map,enabled:false,destroyed:false,bound:false,toggleButton:null,toggleObserver:null,bodyObserver:null,
  popup:null,dracoLoader:null,THREE:null,GLTFLoader:null,DRACOLoader:null,
  discovery:{marker:null,markerElement:null,group:null,promise:null,modelVisible:false,autoAttempted:false,renderer:null,scene:null,camera:null,altitudeM:0,status:'The Smithsonian Space Shuttle Discovery exterior scan has not loaded yet.',stats:{markerReady:false,markerVisible:false,assetLoaded:false,nativeLayerReady:false,heightM:null,renderWarning:false}}
 };
 const api={
  version:VERSION,model:SPACECRAFT_DISCOVERY,assets:SPACECRAFT_DISCOVERY_ASSETS,
  get enabled(){return state.enabled;},
  get status(){return state.discovery.status;},
  get stats(){return Object.assign({},state.discovery.stats);},
  setEnabled(on){
   state.enabled=!!on;
   ensureMarker(state,state.enabled);
   if(!state.enabled)state.discovery.modelVisible=false;
   else maybeAutoMaterialize(state);
   state.map.triggerRepaint?.();updateCount();return state.enabled;
  },
  showOnGlobe(){return showOnGlobe(state);},
  openCard(){if(state.enabled)openPopup(state,SPACECRAFT_DISCOVERY.coordinates);},
  destroy(){
   state.destroyed=true;state.enabled=false;state.popup?.remove();
   state.toggleObserver?.disconnect();state.bodyObserver?.disconnect();
   try{state.discovery.marker?.remove?.();}catch(_){}
   if(state.handleMapChange)for(const event of ['style.load','load','idle','moveend','zoomend','rotateend','pitchend'])state.map.off?.(event,state.handleMapChange);
   if(state.map.getLayer?.(LAYER_ID))try{state.map.removeLayer(LAYER_ID);}catch(_){}
   try{state.discovery.renderer?.dispose();}catch(_){}
   try{state.dracoLoader?.dispose?.();}catch(_){}
   document.getElementById('bp-spacecraft-discovery-style-v1')?.remove();
   states.delete(map);
  }
 };
 state.api=api;states.set(map,state);
 window.__BP_SPACECRAFT_DISCOVERY_V1__=api;
 bindMapEvents(state);
 attachToggle(state);
 if(typeof MutationObserver!=='undefined'&&document.body){
  state.bodyObserver=new MutationObserver(()=>{if(!state.toggleButton||!state.toggleButton.isConnected)attachToggle(state);updateCount();});
  state.bodyObserver.observe(document.body,{childList:true,subtree:true});
 }
 updateCount();
 return api;
}
