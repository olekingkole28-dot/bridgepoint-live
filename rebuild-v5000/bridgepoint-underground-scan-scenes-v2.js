/* BridgePoint Paris Catacombs — native underground mesh + independent 3D viewer.
 * The source scan is a real iPhone LiDAR capture. Its district anchor and below-ground offset
 * are visualization references only: the source mesh is not georeferenced to a surveyed chamber.
 */
const VERSION=3, MAP_STATES=new WeakMap(), MIN_MODEL_ZOOM=11.2;
const THREE_URL='/vendor/three.module.js?v=169-local';
const GLTF_URL='/vendor/GLTFLoader.bundle.js?v=169-local';
const SOURCE_ID='bp-paris-catacombs-source-v3', HALO_ID='bp-paris-catacombs-halo-v3';
const MARKER_ID='bp-paris-catacombs-marker-v3', LABEL_ID='bp-paris-catacombs-label-v3';
const MODEL_LAYER_ID='bp-paris-catacombs-model-v3';
const CONTROL_ID='bp-paris-catacombs-control-v3', TOGGLE_ID='bp-paris-catacombs-toggle-v3';
const COUNT_ID='bp-paris-catacombs-count-v3', STATUS_ID='bp-paris-catacombs-status-v3';
const MODEL_UID='39e7050d272f4aac8493497621b86f39';
const MODEL={
 uid:MODEL_UID,title:'Paris Catacombs — Large Gallery',creator:'Emm (@edemaistre)',
 license:'CC BY 4.0',captureMethod:'iPhone 12 Pro · Scaniverse LiDAR',
 sourceUrl:'https://sketchfab.com/3d-models/paris-catacombs-large-gallery-39e7050d272f4aac8493497621b86f39',
 datasetUrl:'https://doi.org/10.5281/zenodo.10287234',
 assetUrl:'/assets/underground-scan-scenes/'+MODEL_UID+'.glb.gz'
};
export const PARIS_CATACOMBS_SITE_V3={
 id:'paris-catacombs',name:'Paris Catacombs',type:'catacomb',
 coordinates:[2.3324,48.8336],
 locationPrecision:'Approximate Paris Catacombs district anchor. The source scan does not publish surveyed chamber coordinates.',
 visualizationOffsetM:-16,
 description:'A real iPhone LiDAR scan of a gallery in the Paris Catacombs. This is one scanned gallery segment, not a complete survey of the entire catacomb network.'
};
export const UNDERGROUND_SCAN_SITES_V2=[{...PARIS_CATACOMBS_SITE_V3,models:[MODEL]}];
export function buildUndergroundSceneFeatures(sites=UNDERGROUND_SCAN_SITES_V2){
 return (Array.isArray(sites)?sites:[]).filter(s=>s&&s.id==='paris-catacombs'&&Array.isArray(s.coordinates)&&
  Number.isFinite(Number(s.coordinates[0]))&&Number.isFinite(Number(s.coordinates[1]))&&
  Math.abs(Number(s.coordinates[0]))<=180&&Math.abs(Number(s.coordinates[1]))<=85&&Array.isArray(s.models)&&s.models.length>0)
  .map(s=>({type:'Feature',id:s.id,geometry:{type:'Point',coordinates:[Number(s.coordinates[0]),Number(s.coordinates[1])]},
   properties:{siteId:s.id,name:s.name,type:'catacomb',iconImage:'bp-paris-catacomb-icon-v3'}}));
}
function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function iconImage(){
 const c=document.createElement('canvas');c.width=80;c.height=80;const x=c.getContext('2d');
 const g=x.createRadialGradient(26,18,3,40,40,38);g.addColorStop(0,'#f6ffff');g.addColorStop(.25,'#93eaf4');g.addColorStop(1,'#16516e');
 x.fillStyle='rgba(3,13,21,.92)';x.beginPath();x.arc(40,40,36,0,Math.PI*2);x.fill();
 x.strokeStyle='#9eeaf4';x.lineWidth=3;x.stroke();x.fillStyle=g;x.strokeStyle='#f0ffff';x.lineWidth=2.5;
 x.beginPath();x.moveTo(15,60);x.lineTo(15,39);x.quadraticCurveTo(40,4,65,39);x.lineTo(65,60);x.closePath();x.fill();x.stroke();
 x.fillStyle='#061b2a';x.beginPath();x.moveTo(27,60);x.lineTo(27,41);x.quadraticCurveTo(40,22,53,41);x.lineTo(53,60);x.closePath();x.fill();
 x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.moveTo(40,28);x.lineTo(40,50);x.moveTo(33,35);x.lineTo(47,35);x.stroke();
 return x.getImageData(0,0,80,80);
}
function loadThree(){return Promise.all([import(THREE_URL),import(GLTF_URL)]).then(([THREE,l])=>{
 if(!THREE?.WebGLRenderer||!l?.GLTFLoader)throw new Error('BridgePoint local Three.js / GLTFLoader unavailable');return {THREE,GLTFLoader:l.GLTFLoader};
});}
async function getAssetBuffer(state){
 if(state.assetBuffer)return state.assetBuffer;
 if(state.assetPromise)return state.assetPromise;
 state.assetPromise=(async()=>{
  const response=await fetch(MODEL.assetUrl,{cache:'force-cache'});
  if(!response.ok)throw new Error('Paris Catacombs GLB request failed ('+response.status+')');
  if(typeof DecompressionStream==='undefined')throw new Error('Browser gzip decompression is unavailable');
  const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer=await new Response(stream).arrayBuffer();
  if(new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('Paris Catacombs asset is not a valid GLB');
  state.assetBuffer=buffer;return buffer;
 })().catch(e=>{state.assetPromise=null;throw e;});
 return state.assetPromise;
}
async function getAssetScene(state){
 if(state.assetScene)return state.assetScene;
 if(state.assetScenePromise)return state.assetScenePromise;
 state.assetScenePromise=(async()=>{
  if(!state.THREE||!state.loader){const pair=await loadThree();if(state.dead)throw new Error('Layer closed');state.THREE=pair.THREE;state.loader=new pair.GLTFLoader();}
  const buffer=await getAssetBuffer(state);
  const gltf=await state.loader.parseAsync(buffer,'');
  if(!gltf?.scene)throw new Error('Paris Catacombs GLB has no scene');
  state.assetScene=gltf.scene;return gltf.scene;
 })().catch(e=>{state.assetScenePromise=null;throw e;});
 return state.assetScenePromise;
}
function boundsOf(THREE,root){root.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(root);if(b.isEmpty())throw new Error('Paris Catacombs scan has no mesh geometry');return b;}
function makeMapRoot(THREE,source){
 const root=source.clone(true),box=boundsOf(THREE,root),size=box.getSize(new THREE.Vector3()),centre=box.getCenter(new THREE.Vector3());
 root.position.x-=centre.x;root.position.z-=centre.z;root.position.y-=box.min.y;
 const max=Math.max(size.x,size.y,size.z)||1;
 if(max>45)root.scale.multiplyScalar(45/max);
 root.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;o.renderOrder=1000;
  for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){m.depthTest=false;m.depthWrite=false;m.needsUpdate=true;}});
 root.updateMatrixWorld(true);return root;
}
function mapMatrix(map,THREE,coord,alt){
 try{
  const raw=map.transform&&typeof map.transform.getMatrixForModel==='function'?map.transform.getMatrixForModel([+coord[0],+coord[1]],+alt||0):null;
  if(raw&&raw.length>=16)return new THREE.Matrix4().fromArray(raw);
  const M=window.maplibregl?.MercatorCoordinate;if(!M?.fromLngLat)return null;
  const mc=M.fromLngLat([+coord[0],+coord[1]],+alt||0),metres=mc.meterInMercatorCoordinateUnits();
  if(![mc.x,mc.y,mc.z,metres].every(Number.isFinite)||metres<=0)return null;
  return new THREE.Matrix4().set(metres,0,0,mc.x,0,0,metres,mc.y,0,metres,0,0,0,0,0,1);
 }catch(_){return null;}
}
function status(state,msg){
 state.status=String(msg||'');
 const el=document.getElementById(STATUS_ID);if(el)el.textContent=state.status;
 const p=state.popup?.getElement?.()?.querySelector('[data-catacomb-status]');if(p)p.textContent=state.status;
}
function refreshUi(state){
 const n=document.getElementById(COUNT_ID);if(n)n.textContent='1 real LiDAR gallery scan · Paris, France';
 const s=document.getElementById(STATUS_ID);if(s)s.textContent=state.status;
 const b=document.getElementById(TOGGLE_ID);if(b){b.setAttribute('aria-pressed',String(state.enabled));b.classList.toggle('is-active',state.enabled);}
}
function installLayers(state){
 const map=state.map;if(!map?.getStyle?.())return false;
 try{
  if(!map.hasImage?.('bp-paris-catacomb-icon-v3'))map.addImage('bp-paris-catacomb-icon-v3',iconImage(),{pixelRatio:2});
  if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{type:'geojson',data:{type:'FeatureCollection',features:buildUndergroundSceneFeatures()},buffer:64,maxzoom:14,
   attribution:'Paris Catacombs LiDAR scan by Emm (@edemaistre), CC BY 4.0 · Zenodo DOI 10.5281/zenodo.10287234'});
  const add=(id,l)=>{if(!map.getLayer(id))map.addLayer(l);};
  add(HALO_ID,{id:HALO_ID,type:'circle',source:SOURCE_ID,minzoom:0,maxzoom:24,layout:{visibility:state.enabled?'visible':'none'},
   paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,3,5,5.5,10,8,16,12,22,15],
    'circle-color':'#63d8eb','circle-opacity':.38,'circle-blur':.48}});
  add(MARKER_ID,{id:MARKER_ID,type:'symbol',source:SOURCE_ID,minzoom:0,maxzoom:24,layout:{
   visibility:state.enabled?'visible':'none','icon-image':['get','iconImage'],
   'icon-size':['interpolate',['linear'],['zoom'],0,.31,3,.43,7,.58,12,.72,18,.84,23,.92],
   'icon-anchor':'bottom','icon-allow-overlap':true,'icon-ignore-placement':true,'symbol-sort-key':100}});
  add(LABEL_ID,{id:LABEL_ID,type:'symbol',source:SOURCE_ID,minzoom:4,maxzoom:24,layout:{visibility:state.enabled?'visible':'none',
   'text-field':'PARIS CATACOMBS','text-size':['interpolate',['linear'],['zoom'],4,9,10,11,17,13],
   'text-offset':[0,1.3],'text-anchor':'top','text-allow-overlap':false,'text-ignore-placement':false},
   paint:{'text-color':'#eafcff','text-halo-color':'rgba(3,12,20,.94)','text-halo-width':1.4}});
  return true;
 }catch(e){state.stats.lastError=String(e?.message||e);console.warn('BridgePoint Paris Catacombs layers',e);return false;}
}
async function ensureMapModelLayer(state){
 const map=state.map;if(map.getLayer(MODEL_LAYER_ID)&&state.scene)return;
 if(state.layerPromise&&map.getLayer(MODEL_LAYER_ID))return state.layerPromise;
 state.layerPromise=new Promise((resolve,reject)=>{
  const THREE=state.THREE;
  const layer={id:MODEL_LAYER_ID,type:'custom',renderingMode:'3d',
   onAdd(mapRef,gl){
    if(!state.renderer){
     state.renderer=new THREE.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
     state.renderer.autoClear=false;state.renderer.outputColorSpace=THREE.SRGBColorSpace;
     state.camera=new THREE.Camera();state.scene=new THREE.Scene();
     state.scene.add(new THREE.AmbientLight(0xffffff,1.65));
     const light=new THREE.DirectionalLight(0xfff0d4,1.25);light.position.set(-.65,1.5,.9);state.scene.add(light);
    }
    state.stats.layerReady=true;resolve();
   },
   render(gl,args){
    const root=state.mapRoot;
    if(!state.enabled||!state.mapVisible||!root||!state.renderer||!state.scene||!state.camera)return;
    if(Number(map.getZoom()||0)<MIN_MODEL_ZOOM){root.visible=false;return;}
    const raw=args&&(args.defaultProjectionData?.mainMatrix||args.modelViewProjectionMatrix);if(!raw||raw.length<16)return;
    let ground=0;try{const v=map.queryTerrainElevation?.({lng:PARIS_CATACOMBS_SITE_V3.coordinates[0],lat:PARIS_CATACOMBS_SITE_V3.coordinates[1]},{exaggerated:false});if(Number.isFinite(v))ground=v;}catch(_){}
    const matrix=mapMatrix(map,THREE,PARIS_CATACOMBS_SITE_V3.coordinates,ground+PARIS_CATACOMBS_SITE_V3.visualizationOffsetM);if(!matrix)return;
    root.visible=true;state.camera.projectionMatrix.copy(new THREE.Matrix4().fromArray(raw)).multiply(matrix);
    try{state.renderer.resetState();state.renderer.render(state.scene,state.camera);}
    catch(e){if(!state.renderWarned){state.renderWarned=true;console.warn('BridgePoint Paris Catacombs render',e);}}
    finally{root.visible=false;}
   }
  };
  try{if(!map.getLayer(MODEL_LAYER_ID))map.addLayer(layer);if(map.getLayer(MODEL_LAYER_ID)&&state.scene)resolve();}
  catch(e){state.layerPromise=null;reject(e);}
 });
 return state.layerPromise;
}
async function showUnderTerrain(state){
 state.mapVisible=true;status(state,'Loading the Paris Catacombs scan beneath the terrain…');
 try{
  const source=await getAssetScene(state);if(state.dead)return;
  if(!state.mapRoot){state.mapRoot=makeMapRoot(state.THREE,source);state.scene?.add(state.mapRoot);}
  await ensureMapModelLayer(state);if(state.dead)return;
  status(state,'Paris Catacombs gallery mesh displayed below the terrain at an approximate site anchor.');state.map.triggerRepaint?.();refreshUi(state);
 }catch(e){state.mapVisible=false;status(state,'Could not display the catacomb scan: '+String(e?.message||e));refreshUi(state);}
}
function popupHtml(){
 return '<article class="bp-paris-catacomb-popup-v3">'+
  '<div class="bp-paris-catacomb-kicker-v3">BRIDGEPOINT · UNDERGROUND LiDAR SCAN</div><h3>Paris Catacombs</h3>'+
  '<p>One real scanned gallery from the Paris Catacombs. Turn on the underground mesh to inspect its approximate position below the BridgePoint terrain, or open the scan by itself for a full orbit-and-zoom inspection.</p>'+
  '<div class="bp-paris-catacomb-actions-v3"><button type="button" data-catacomb-action="terrain">Show below terrain</button><button type="button" data-catacomb-action="viewer">Open 3D model viewer</button></div>'+
  '<div class="bp-paris-catacomb-meta-v3"><b>Scan:</b> '+safe(MODEL.title)+'<br><b>Creator:</b> '+safe(MODEL.creator)+'<br><b>Capture:</b> '+safe(MODEL.captureMethod)+'<br><b>License:</b> '+safe(MODEL.license)+
  '<br><b>Dataset:</b> <a href="'+MODEL.datasetUrl+'" target="_blank" rel="noopener noreferrer">Zenodo DOI 10.5281/zenodo.10287234</a><br><b>Original scan:</b> <a href="'+MODEL.sourceUrl+'" target="_blank" rel="noopener noreferrer">Sketchfab source and attribution</a></div>'+
  '<p class="bp-paris-catacomb-warning-v3">Map anchor is approximate; the scan is not georeferenced to a surveyed chamber. The below-ground offset is a visualization placement, not a measured depth. The viewer shows the scan in its own local 3D space.</p>'+
  '<p data-catacomb-status class="bp-paris-catacomb-status-v3">Choose how to inspect the scan.</p></article>';
}
function addPopupActions(state,popup){
 const el=popup.getElement?.();if(!el)return;
 el.querySelector('[data-catacomb-action="terrain"]')?.addEventListener('click',()=>{void showUnderTerrain(state);});
 el.querySelector('[data-catacomb-action="viewer"]')?.addEventListener('click',()=>{void openViewer(state);});
}
function openPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 if(state.popup)state.popup.remove();
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'420px',className:'bp-paris-catacomb-popup-wrap-v3'})
  .setLngLat(lngLat||PARIS_CATACOMBS_SITE_V3.coordinates).setHTML(popupHtml()).addTo(state.map);
 addPopupActions(state,state.popup);state.map.flyTo?.({center:PARIS_CATACOMBS_SITE_V3.coordinates,zoom:Math.max(11.4,Number(state.map.getZoom()||0)),duration:750});
}
const VIEWER_STYLE=[
 "#bp-paris-catacomb-viewer-v3{position:fixed;inset:0;z-index:2147483000;background:radial-gradient(ellipse at 50% 35%,#183448 0%,#07131f 65%,#02070d 100%);color:#e9f7ff;font:500 14px/1.45 system-ui,sans-serif;display:flex;flex-direction:column}",
 "#bp-paris-catacomb-viewer-v3 .bpv3-head{display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(2,10,18,.82);border-bottom:1px solid rgba(135,207,231,.2)}",
 "#bp-paris-catacomb-viewer-v3 .bpv3-title{font-weight:800;letter-spacing:.07em;font-size:13px;flex:1}",
 "#bp-paris-catacomb-viewer-v3 button{border:1px solid rgba(142,217,235,.4);border-radius:9px;background:rgba(17,53,73,.82);color:#eafaff;padding:9px 13px;font:700 12px system-ui;cursor:pointer}",
 "#bp-paris-catacomb-viewer-v3 canvas{display:block;flex:1;min-height:0;width:100%;touch-action:none;cursor:grab}",
 "#bp-paris-catacomb-viewer-v3 .bpv3-foot{padding:10px 15px;background:rgba(2,10,18,.8);border-top:1px solid rgba(135,207,231,.2);font-size:11px;color:#b4cbd7}",
 "#bp-paris-catacomb-viewer-v3 a{color:#93e8f1}"
].join('\n');
function disposeViewer(state){
 const v=state.viewer;if(!v)return;
 try{v.renderer.setAnimationLoop(null);v.renderer.dispose();}catch(_){}
 v.resizeObserver?.disconnect?.();v.el?.remove?.();state.viewer=null;
}
function viewerCamera(THREE,v){
 const p=v.phi,t=v.theta,r=v.radius;
 v.camera.position.set(r*Math.sin(p)*Math.sin(t),r*Math.cos(p),r*Math.sin(p)*Math.cos(t));v.camera.lookAt(0,0,0);
}
async function openViewer(state){
 try{
  status(state,'Preparing the full 3D catacomb viewer…');
  const source=await getAssetScene(state);if(state.dead)return;
  disposeViewer(state);
  const el=document.createElement('section');el.id='bp-paris-catacomb-viewer-v3';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Paris Catacombs 3D model viewer');
  el.innerHTML='<header class="bpv3-head"><div class="bpv3-title">PARIS CATACOMBS · LARGE GALLERY</div><button type="button" data-reset>Reset view</button><button type="button" data-close aria-label="Close 3D viewer">Close ✕</button></header><canvas aria-label="Interactive 3D scanned gallery. Drag to rotate; scroll or pinch to zoom."></canvas><footer class="bpv3-foot">Drag to orbit · Scroll or pinch to zoom · Creator: '+safe(MODEL.creator)+' · '+safe(MODEL.license)+' · <a href="'+MODEL.sourceUrl+'" target="_blank" rel="noopener noreferrer">Original scan attribution</a></footer>';
  let style=document.getElementById('bp-paris-catacomb-viewer-style-v3');if(!style){style=document.createElement('style');style.id='bp-paris-catacomb-viewer-style-v3';style.textContent=VIEWER_STYLE;document.head.appendChild(style);}
  document.body.appendChild(el);
  const canvas=el.querySelector('canvas'),THREE=state.THREE;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x061522);
  scene.add(new THREE.HemisphereLight(0xb9eaff,0x17212a,2.0));
  const key=new THREE.DirectionalLight(0xffedcc,2.4);key.position.set(-5,9,7);scene.add(key);
  const fill=new THREE.DirectionalLight(0x6fcde6,1.0);fill.position.set(7,2,-6);scene.add(fill);
  const root=source.clone(true),box=boundsOf(THREE,root),size=box.getSize(new THREE.Vector3()),centre=box.getCenter(new THREE.Vector3());
  const span=Math.max(size.x,size.y,size.z)||1;root.position.sub(centre);root.scale.multiplyScalar(12/span);
  root.traverse(o=>{if(o.isMesh){o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){m.side=THREE.DoubleSide;m.needsUpdate=true;}}});
  scene.add(root);
  const camera=new THREE.PerspectiveCamera(45,1,.01,1500);
  const v={el,renderer,scene,camera,root,theta:.65,phi:1.12,radius:17,resizeObserver:null};
  viewerCamera(THREE,v);
  const resize=()=>{const r=canvas.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
  if(typeof ResizeObserver!=='undefined'){v.resizeObserver=new ResizeObserver(resize);v.resizeObserver.observe(canvas);}else window.addEventListener('resize',resize);
  resize();
  let last=null;
  canvas.addEventListener('pointerdown',e=>{last={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!last)return;const dx=e.clientX-last.x,dy=e.clientY-last.y;last={x:e.clientX,y:e.clientY};v.theta-=dx*.008;v.phi=Math.max(.12,Math.min(Math.PI-.12,v.phi+dy*.008));viewerCamera(THREE,v);});
  const stop=()=>{last=null;};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
  canvas.addEventListener('wheel',e=>{e.preventDefault();v.radius=Math.max(4,Math.min(70,v.radius*Math.exp(e.deltaY*.001)));viewerCamera(THREE,v);},{passive:false});
  el.querySelector('[data-reset]').addEventListener('click',()=>{v.theta=.65;v.phi=1.12;v.radius=17;viewerCamera(THREE,v);});
  el.querySelector('[data-close]').addEventListener('click',()=>disposeViewer(state));
  renderer.setAnimationLoop(()=>{renderer.render(scene,camera);});
  state.viewer=v;status(state,'Full 3D catacomb viewer open.');refreshUi(state);
 }catch(e){status(state,'Could not open the 3D catacomb viewer: '+String(e?.message||e));}
}
function addControl(state){
 const dock=document.getElementById('bpv-dock-actions');if(!dock)return false;
 let group=document.getElementById(CONTROL_ID);
 if(!group){
  group=document.createElement('section');group.id=CONTROL_ID;group.className='bpv-command-group';group.setAttribute('data-bpv-command-section','paris-catacombs');
  group.innerHTML='<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">🕳️</span><span><b>PARIS CATACOMBS</b><small>Real underground LiDAR scan · native 3D</small></span></div>'+
   '<div class="bpv-command-grid"><button id="'+TOGGLE_ID+'" type="button" class="bpv-command-btn" aria-pressed="false" title="Show Paris Catacombs scan markers on the globe"><span class="bpv-command-icon" aria-hidden="true">🪦</span><span class="bpv-command-label">Paris Catacombs</span></button></div>'+
   '<div id="'+COUNT_ID+'" class="bpv-data-note">1 real LiDAR gallery scan · Paris, France</div><div id="'+STATUS_ID+'" class="bpv-data-note">Layer off · existing BridgePoint layers are unchanged.</div>';
  const wells=document.getElementById('bp-subsurface-wells-control-v1');if(wells&&wells.parentNode===dock)wells.after(group);else dock.prepend(group);
 }
 const b=document.getElementById(TOGGLE_ID);if(b&&!b.dataset.bpCatacombBound){b.dataset.bpCatacombBound='1';b.addEventListener('click',()=>{void setEnabled(state,!state.enabled);});}
 refreshUi(state);return true;
}
async function setEnabled(state,on){
 state.enabled=!!on;
 if(state.enabled){if(installLayers(state))status(state,'Paris Catacombs ON · icon remains visible from globe view through street-level zoom. Select it to inspect the scanned gallery.');else status(state,'Waiting for the BridgePoint globe style…');}
 else{state.mapVisible=false;if(state.popup){state.popup.remove();state.popup=null;}if(state.mapRoot)state.mapRoot.visible=false;
  for(const id of [HALO_ID,MARKER_ID,LABEL_ID])if(state.map.getLayer(id))state.map.setLayoutProperty(id,'visibility','none');
  status(state,'Paris Catacombs OFF · every other BridgePoint layer remains unchanged.');}
 refreshUi(state);state.map.triggerRepaint?.();return state.enabled;
}
export function initUndergroundScanScenesRenderer(target){
 const map=target&&(target.map||target);if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
 const prior=MAP_STATES.get(map);if(prior)return prior.api;
 const state={map,enabled:false,mapVisible:false,dead:false,popup:null,THREE:null,loader:null,renderer:null,camera:null,scene:null,
  mapRoot:null,assetBuffer:null,assetPromise:null,assetScene:null,assetScenePromise:null,viewer:null,layerPromise:null,observer:null,dockTimer:null,status:'off',
  stats:{version:VERSION,sites:1,models:1,layerReady:false,lastError:null}};
 state.handleClick=e=>{
  if(!state.enabled)return;
  const hits=state.map.queryRenderedFeatures?.(e.point,{layers:[MARKER_ID]})||[];
  if(hits.some(f=>f.properties?.siteId==='paris-catacombs'))openPopup(state,e.lngLat||PARIS_CATACOMBS_SITE_V3.coordinates);
 };
 state.handleStyle=()=>{if(state.enabled){installLayers(state);if(state.mapVisible&&state.mapRoot&&state.THREE)void ensureMapModelLayer(state).catch(e=>status(state,'Catacomb 3D layer reattach failed: '+String(e?.message||e)));refreshUi(state);}};
 map.on('click',state.handleClick);map.on('style.load',state.handleStyle);map.on('load',state.handleStyle);
 map.on('zoomend',()=>{if(state.renderer)map.triggerRepaint?.();});
 const api={version:VERSION,get enabled(){return state.enabled;},get status(){return state.status;},get stats(){return {...state.stats};},
  toggle(){return setEnabled(state,!state.enabled);},setEnabled(v){return setEnabled(state,v);},
  showUnderTerrain(){return showUnderTerrain(state);},openViewer(){return openViewer(state);},
  destroy(){state.dead=true;disposeViewer(state);if(state.popup)state.popup.remove();state.observer?.disconnect?.();if(state.dockTimer)clearTimeout(state.dockTimer);
   map.off('click',state.handleClick);map.off('style.load',state.handleStyle);map.off('load',state.handleStyle);
   if(state.mapRoot){state.scene?.remove(state.mapRoot);}
   for(const id of [LABEL_ID,MARKER_ID,HALO_ID,MODEL_LAYER_ID])if(map.getLayer(id))map.removeLayer(id);
   if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);MAP_STATES.delete(map);}
 };
 state.api=api;MAP_STATES.set(map,state);window.__BP_PARIS_CATACOMBS_V3__=api;
 const retry=()=>{if(state.dead)return;if(addControl(state))return;state.dockTimer=setTimeout(retry,250);};retry();
 if(typeof MutationObserver!=='undefined'&&document.body){state.observer=new MutationObserver(()=>{if(!document.getElementById(CONTROL_ID))addControl(state);});state.observer.observe(document.body,{childList:true,subtree:true});}
 return api;
}
