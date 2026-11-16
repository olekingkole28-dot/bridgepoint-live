/* BridgePoint Jenolan Caves — CSIRO 3D LiDAR point cloud.
 * The deployed cloud is sampled from the CC BY-SA 3.0 CSIRO source PLY.
 * Its public WGS84 collection coordinate is a site-level anchor, not per-point GNSS.
 */
const VERSION=1, MAP_STATES=new WeakMap();
const THREE_URL='/vendor/three.module.js?v=169-local';
const CLOUD_URL='/assets/underground/jenolan-caves-v1/pointcloud.bin.gz';
const MANIFEST_URL='/assets/underground/jenolan-caves-v1/manifest.json';
const SOURCE_ID='bp-jenolan-caves-source-v1';
const HALO_ID='bp-jenolan-caves-halo-v1';
const MARKER_ID='bp-jenolan-caves-marker-v1';
const LABEL_ID='bp-jenolan-caves-label-v1';
const MODEL_LAYER_ID='bp-jenolan-caves-model-v1';
const CONTROL_ID='bp-jenolan-caves-control-v1';
const TOGGLE_ID='bp-jenolan-caves-toggle-v1';
const COUNT_ID='bp-jenolan-caves-count-v1';
const STATUS_ID='bp-jenolan-caves-status-v1';
const VIEWER_ID='bp-jenolan-caves-viewer-v1';

export const JENOLAN_CAVES_SITE_V1={
 id:'jenolan-caves-system',
 name:'Jenolan Caves — 3D LiDAR system',
 coordinates:[150.021444,-33.820556],
 country:'Australia',
 sourceUrl:'https://doi.org/10.4225/08/55911F74299DC',
 paperUrl:'https://doi.org/10.1007/s10021-014-9771-3',
 creator:'Robert Zlot and Michael Bosse · CSIRO',
 license:'CC BY-SA 3.0',
 caveTraverseKm:17.1,
 collectionTrajectoryKm:28.4,
 sourcePointCloudPoints:2300000000,
 depthBelowSurfaceM:8,
 locationPrecision:'The WGS84 coordinate is the CSIRO collection-level site anchor. The source PLY is a locally registered cave point cloud, not point-by-point GNSS. Internal scan geometry is oriented and centered at the collection anchor; it is not survey-grade absolute georeferencing.',
 geometryType:'LiDAR point cloud'
};

export function buildJenolanCavesFeature(){
 const s=JENOLAN_CAVES_SITE_V1;
 return {type:'Feature',id:s.id,geometry:{type:'Point',coordinates:[s.coordinates[0],s.coordinates[1]]},
  properties:{siteId:s.id,name:s.name,label:'Jenolan Caves · 17.1 km scan',type:'cave',
   iconImage:'bp-jenolan-cave-icon-v1',iconOffset:[0,0]}};
}

export function decodeJenolanPointCloud(input){
 let buffer=input;
 if(ArrayBuffer.isView(input))buffer=input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength);
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<16)throw new Error('Jenolan point-cloud binary is truncated');
 const view=new DataView(buffer);
 if(view.getUint8(0)!==66||view.getUint8(1)!==80||view.getUint8(2)!==67||view.getUint8(3)!==49)
  throw new Error('Jenolan point-cloud header is invalid');
 const count=view.getUint32(4,true),sourceCount=view.getUint32(8,true),formatVersion=view.getUint32(12,true);
 if(formatVersion!==1||count<1||count>20000000)throw new Error('Jenolan point-cloud version or point count is invalid');
 const positionsOffset=16,positionsBytes=count*3*4,colorsOffset=positionsOffset+positionsBytes,colorsBytes=count*3;
 if(buffer.byteLength<colorsOffset+colorsBytes)throw new Error('Jenolan point-cloud payload is incomplete');
 return {count,sourceCount,positions:new Float32Array(buffer,positionsOffset,count*3),
  colors:new Uint8Array(buffer,colorsOffset,count*3),buffer};
}
function safe(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function makeIcon(){
 const c=document.createElement('canvas');c.width=88;c.height=88;const x=c.getContext('2d');
 const g=x.createRadialGradient(24,18,3,44,44,43);
 g.addColorStop(0,'#fff8da');g.addColorStop(.25,'#e7b764');g.addColorStop(1,'#75502a');
 x.fillStyle='rgba(10,13,17,.96)';x.beginPath();x.arc(44,44,41,0,Math.PI*2);x.fill();
 x.strokeStyle='#f6d48c';x.lineWidth=3;x.stroke();
 x.fillStyle=g;x.beginPath();x.moveTo(12,66);x.lineTo(12,47);x.quadraticCurveTo(16,18,44,13);
 x.quadraticCurveTo(72,18,76,47);x.lineTo(76,66);x.closePath();x.fill();
 x.fillStyle='#111820';x.beginPath();x.moveTo(28,66);x.lineTo(28,47);x.quadraticCurveTo(44,27,60,47);x.lineTo(60,66);x.closePath();x.fill();
 x.strokeStyle='#fff3cf';x.lineWidth=2.5;x.beginPath();x.moveTo(20,38);x.lineTo(27,32);x.lineTo(32,40);x.moveTo(56,39);x.lineTo(62,31);x.lineTo(69,39);x.stroke();
 return x.getImageData(0,0,88,88);
}
function mapMatrix(map,THREE,coord,alt){
 try{
  const raw=map.transform&&typeof map.transform.getMatrixForModel==='function'
   ?map.transform.getMatrixForModel([+coord[0],+coord[1]],+alt||0):null;
  if(raw&&raw.length>=16)return new THREE.Matrix4().fromArray(raw);
  const M=window.maplibregl?.MercatorCoordinate;if(!M?.fromLngLat)return null;
  const mc=M.fromLngLat([+coord[0],+coord[1]],+alt||0),metres=mc.meterInMercatorCoordinateUnits();
  if(![mc.x,mc.y,mc.z,metres].every(Number.isFinite)||metres<=0)return null;
  return new THREE.Matrix4().set(metres,0,0,mc.x,0,0,metres,mc.y,0,metres,0,0,0,0,0,1);
 }catch(_){return null;}
}
function setStatus(state,message){
 state.status=String(message||'');
 const el=document.getElementById(STATUS_ID);if(el)el.textContent=state.status;
}
function refreshUi(state){
 const count=document.getElementById(COUNT_ID);
 if(count){
  const n=state.manifest?.materializedPointCount;
  count.textContent=n?Number(n).toLocaleString()+' points materialized · '+JENOLAN_CAVES_SITE_V1.caveTraverseKm+' km scanned cave traverse · CSIRO LiDAR':'17.1 km scanned cave traverse · loading native point cloud';
 }
 const status=document.getElementById(STATUS_ID);if(status)status.textContent=state.status;
 const button=document.getElementById(TOGGLE_ID);
 if(button){button.setAttribute('aria-pressed',String(state.enabled));button.classList.toggle('is-active',state.enabled);}
}
function installLayers(state){
 const map=state.map;if(!map?.getStyle?.())return false;
 if(typeof map.isStyleLoaded==='function'&&!map.isStyleLoaded())return false;
 try{
  if(!map.hasImage?.('bp-jenolan-cave-icon-v1'))map.addImage('bp-jenolan-cave-icon-v1',makeIcon(),{pixelRatio:2});
  if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{type:'geojson',
   data:{type:'FeatureCollection',features:[buildJenolanCavesFeature()]},buffer:64,maxzoom:14,
   attribution:'Jenolan Caves 3D LiDAR · Robert Zlot and Michael Bosse, CSIRO · CC BY-SA 3.0 · DOI 10.4225/08/55911F74299DC'});
  const add=(id,layer)=>{if(!map.getLayer(id))map.addLayer(layer);};
  add(HALO_ID,{id:HALO_ID,type:'circle',source:SOURCE_ID,minzoom:0,maxzoom:24,
   layout:{visibility:state.enabled?'visible':'none'},
   paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,3,6,6,11,9,17,13,22,16],
    'circle-color':'#f0bd68','circle-opacity':.42,'circle-blur':.4}});
  add(MARKER_ID,{id:MARKER_ID,type:'symbol',source:SOURCE_ID,minzoom:0,maxzoom:24,
   layout:{visibility:state.enabled?'visible':'none','icon-image':['get','iconImage'],
    'icon-offset':['get','iconOffset'],'icon-size':['interpolate',['linear'],['zoom'],0,.34,4,.46,8,.62,13,.78,19,.9,23,1],
    'icon-anchor':'bottom','icon-allow-overlap':true,'icon-ignore-placement':true,'symbol-sort-key':120}});
  add(LABEL_ID,{id:LABEL_ID,type:'symbol',source:SOURCE_ID,minzoom:3,maxzoom:24,
   layout:{visibility:state.enabled?'visible':'none','text-field':['get','label'],
    'text-size':['interpolate',['linear'],['zoom'],3,8,9,10,16,12],
    'text-offset':[0,1.35],'text-anchor':'top','text-allow-overlap':true,'text-ignore-placement':true},
   paint:{'text-color':'#fff0cd','text-halo-color':'rgba(9,13,18,.96)','text-halo-width':1.6}});
  const visibility=state.enabled?'visible':'none';
  for(const id of [HALO_ID,MARKER_ID,LABEL_ID]){
   if(map.getLayer(id)&&map.getLayoutProperty(id,'visibility')!==visibility)map.setLayoutProperty(id,'visibility',visibility);
  }
  return true;
 }catch(e){state.stats.lastError=String(e?.message||e);console.warn('BridgePoint Jenolan map layers',e);return false;}
}
function scheduleVisibility(state){
 if(!state.enabled||state.dead||state.visibilityFrame)return;
 const request=window.requestAnimationFrame||((fn)=>setTimeout(fn,16));
 state.visibilityFrame=request(()=>{
  state.visibilityFrame=0;if(!state.enabled||state.dead)return;
  try{
   if(typeof state.map.isStyleLoaded==='function'&&!state.map.isStyleLoaded())return;
   if(!installLayers(state))return;
   window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('subsurface',true);
   for(const id of [HALO_ID,MARKER_ID,LABEL_ID]){
    if(state.map.getLayer(id)&&state.map.getLayoutProperty(id,'visibility')==='none')
     state.map.setLayoutProperty(id,'visibility','visible');
   }
   refreshUi(state);
  }catch(e){state.stats.lastError=String(e?.message||e);}
 });
}
async function loadPointCloud(state){
 if(state.geometry)return state.geometry;
 if(state.cloudPromise)return state.cloudPromise;
 state.cloudPromise=(async()=>{
  const THREE=state.THREE||(state.THREE=await import(THREE_URL));
  const [manifestResponse,cloudResponse]=await Promise.all([
   fetch(MANIFEST_URL,{cache:'force-cache'}),fetch(CLOUD_URL,{cache:'force-cache'})
  ]);
  if(!manifestResponse.ok)throw new Error('Jenolan cloud manifest request failed ('+manifestResponse.status+')');
  if(!cloudResponse.ok)throw new Error('Jenolan point-cloud request failed ('+cloudResponse.status+')');
  const manifest=await manifestResponse.json();
  if(manifest?.license!=='CC BY-SA 3.0'||manifest?.siteId!==JENOLAN_CAVES_SITE_V1.id)
   throw new Error('Jenolan source manifest or license validation failed');
  const packed=await cloudResponse.arrayBuffer();
  if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot decompress the hosted Jenolan point cloud');
  const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer=await new Response(stream).arrayBuffer();
  const decoded=decodeJenolanPointCloud(buffer);
  if(decoded.count!==Number(manifest.materializedPointCount))throw new Error('Jenolan point count does not match its manifest');
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(decoded.positions,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(decoded.colors,3,true));
  geometry.computeBoundingSphere();
  const material=new THREE.PointsMaterial({size:.13,sizeAttenuation:true,vertexColors:true,transparent:false,depthWrite:true});
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.visible=false;
  state.manifest=manifest;state.decoded=decoded;state.geometry=geometry;state.points=points;state.mapMaterial=material;
  state.stats.materializedPointCount=decoded.count;state.stats.sourcePointCount=decoded.sourceCount;
  refreshUi(state);return geometry;
 })().catch(error=>{state.cloudPromise=null;throw error;});
 return state.cloudPromise;
}
async function ensureMapLayer(state){
 const map=state.map;if(map.getLayer(MODEL_LAYER_ID)&&state.scene)return;
 if(state.layerPromise)return state.layerPromise;
 state.layerPromise=new Promise((resolve,reject)=>{
  const THREE=state.THREE;
  const layer={id:MODEL_LAYER_ID,type:'custom',renderingMode:'3d',
   onAdd(mapRef,gl){
    if(!state.renderer){
     state.renderer=new THREE.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
     state.renderer.autoClear=false;state.renderer.outputColorSpace=THREE.SRGBColorSpace;
     state.camera=new THREE.Camera();state.scene=new THREE.Scene();
     state.scene.add(new THREE.AmbientLight(0xffffff,1.0));
    }
    if(state.points&&state.points.parent!==state.scene)state.scene.add(state.points);
    state.stats.layerReady=true;resolve();
   },
   render(gl,args){
    if(!state.enabled||!state.points||!state.renderer||!state.scene||!state.camera)return;
    if(Number(map.getZoom()||0)<10.8){state.points.visible=false;return;}
    const raw=args&&(args.defaultProjectionData?.mainMatrix||args.modelViewProjectionMatrix);
    if(!raw||raw.length<16)return;
    const coordinates=JENOLAN_CAVES_SITE_V1.coordinates;
    let ground;
    try{ground=map.queryTerrainElevation?.({lng:coordinates[0],lat:coordinates[1]},{exaggerated:false});}catch(_){}
    if(!Number.isFinite(ground)){state.points.visible=false;return;}
    const bounds=state.manifest?.localBounds;
    const maxY=Number(bounds?.max?.[1]??0);
    const altitude=ground-JENOLAN_CAVES_SITE_V1.depthBelowSurfaceM-maxY;
    const matrix=mapMatrix(map,THREE,coordinates,altitude);if(!matrix)return;
    state.camera.projectionMatrix.copy(new THREE.Matrix4().fromArray(raw)).multiply(matrix);
    state.points.visible=true;
    try{state.renderer.resetState();state.renderer.render(state.scene,state.camera);}
    catch(e){if(!state.renderWarned){state.renderWarned=true;console.warn('BridgePoint Jenolan point-cloud render',e);}}
    finally{state.points.visible=false;}
   }
  };
  try{if(!map.getLayer(MODEL_LAYER_ID))map.addLayer(layer);if(map.getLayer(MODEL_LAYER_ID)&&state.scene)resolve();}
  catch(e){state.layerPromise=null;reject(e);}
 });
 return state.layerPromise;
}
async function materializeUnderTerrain(state){
 try{
  setStatus(state,'Downloading the CSIRO Jenolan point cloud for below-terrain rendering…');
  await loadPointCloud(state);if(state.dead)return;
  if(!state.scene)await ensureMapLayer(state);else if(!state.map.getLayer(MODEL_LAYER_ID))await ensureMapLayer(state);
  if(state.dead)return;
  if(state.points&&state.points.parent!==state.scene)state.scene.add(state.points);
  setStatus(state,'Jenolan native 3D point cloud loaded · '+state.stats.materializedPointCount.toLocaleString()+' points · visible below terrain when zoomed in.');
  state.map.triggerRepaint?.();refreshUi(state);
 }catch(e){
  state.mapVisible=false;setStatus(state,'Jenolan 3D point cloud could not be loaded: '+String(e?.message||e));refreshUi(state);
 }
}
const VIEWER_STYLE=[
 '#bp-jenolan-caves-viewer-v1{position:fixed;inset:0;z-index:2147483000;background:radial-gradient(ellipse at 50% 32%,#263647 0%,#101923 58%,#05090e 100%);color:#edf5fa;font:500 14px/1.45 system-ui,sans-serif;display:flex;flex-direction:column}',
 '#bp-jenolan-caves-viewer-v1 .jcv-head{display:flex;align-items:center;gap:10px;padding:12px 15px;background:rgba(4,10,16,.88);border-bottom:1px solid rgba(229,190,128,.25)}',
 '#bp-jenolan-caves-viewer-v1 .jcv-title{font-weight:850;letter-spacing:.06em;font-size:13px;flex:1}',
 '#bp-jenolan-caves-viewer-v1 button{border:1px solid rgba(236,196,132,.4);border-radius:9px;background:rgba(70,53,32,.62);color:#fff5df;padding:9px 12px;font:700 12px system-ui;cursor:pointer}',
 '#bp-jenolan-caves-viewer-v1 canvas{display:block;flex:1;min-height:0;width:100%;touch-action:none;cursor:grab}',
 '#bp-jenolan-caves-viewer-v1 .jcv-foot{padding:9px 14px;background:rgba(4,10,16,.88);border-top:1px solid rgba(229,190,128,.25);font-size:11px;color:#c1d0db}',
 '#bp-jenolan-caves-viewer-v1 .jcv-meta{margin-top:5px;color:#f0d5a8;font-weight:700}',
 '#bp-jenolan-caves-viewer-v1 .jcv-note{margin-top:4px;color:#aebdca}',
 '#bp-jenolan-caves-viewer-v1 a{color:#f4ce91}'
].join('\n');
function disposeViewer(state){
 const viewer=state.viewer;if(!viewer)return;
 try{viewer.renderer.setAnimationLoop(null);viewer.renderer.dispose();}catch(_){}
 viewer.resizeObserver?.disconnect?.();viewer.el?.remove?.();state.viewer=null;
}
function cameraOrbit(THREE,viewer){
 const p=viewer.phi,t=viewer.theta,r=viewer.radius;
 viewer.camera.position.set(r*Math.sin(p)*Math.sin(t),r*Math.cos(p),r*Math.sin(p)*Math.cos(t));
 viewer.camera.lookAt(0,0,0);
}
async function openViewer(state){
 try{
  setStatus(state,'Preparing the full Jenolan Caves 3D viewer…');
  await loadPointCloud(state);if(state.dead)return;
  disposeViewer(state);
  const THREE=state.THREE,manifest=state.manifest;
  const el=document.createElement('section');el.id=VIEWER_ID;
  el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
  el.setAttribute('aria-label','Jenolan Caves CSIRO 3D LiDAR point-cloud viewer');
  el.innerHTML='<header class="jcv-head"><div class="jcv-title">JENOLAN CAVES · FULL 3D LiDAR SYSTEM</div><button type="button" data-reset>Reset view</button><button type="button" data-close aria-label="Close 3D viewer">Close ✕</button></header><canvas aria-label="Interactive Jenolan Caves point cloud. Drag to orbit; scroll or pinch to zoom."></canvas><footer class="jcv-foot">Drag to orbit · Scroll or pinch to zoom · '+safe(Number(manifest.materializedPointCount).toLocaleString())+' hosted points from the CSIRO 2010–2014 scan collection · <a href="'+safe(JENOLAN_CAVES_SITE_V1.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Open source dataset and attribution</a><div class="jcv-meta">17.1 km cave traverse · '+safe(manifest.geometryType||'LiDAR point cloud')+' · CC BY-SA 3.0</div><div class="jcv-note">'+safe(JENOLAN_CAVES_SITE_V1.locationPrecision)+'</div></footer>';
  let style=document.getElementById('bp-jenolan-caves-viewer-style-v1');
  if(!style){style=document.createElement('style');style.id='bp-jenolan-caves-viewer-style-v1';style.textContent=VIEWER_STYLE;document.head.appendChild(style);}
  document.body.appendChild(el);
  const canvas=el.querySelector('canvas');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x101923);
  const pointsMaterial=new THREE.PointsMaterial({size:2.0,sizeAttenuation:false,vertexColors:true,transparent:false,depthWrite:true});
  const points=new THREE.Points(state.geometry,pointsMaterial);points.frustumCulled=false;scene.add(points);
  const bounds=state.geometry.boundingBox||state.geometry.computeBoundingBox();
  const size=bounds.getSize(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z)||1;
  const camera=new THREE.PerspectiveCamera(44,1,.01,Math.max(5000,span*20));
  const viewer={el,renderer,scene,camera,points,theta:.62,phi:1.15,radius:span*1.35,resizeObserver:null};
  cameraOrbit(THREE,viewer);
  const resize=()=>{const r=canvas.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
  if(typeof ResizeObserver!=='undefined'){viewer.resizeObserver=new ResizeObserver(resize);viewer.resizeObserver.observe(canvas);}else window.addEventListener('resize',resize);
  resize();
  let last=null,pinch=0;const active=new Map();
  const distance=()=>{const pts=[...active.values()];return pts.length<2?0:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);};
  canvas.addEventListener('pointerdown',e=>{active.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture?.(e.pointerId);if(active.size===1)last={x:e.clientX,y:e.clientY};if(active.size===2){last=null;pinch=distance();}});
  canvas.addEventListener('pointermove',e=>{
   if(!active.has(e.pointerId))return;active.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(active.size>=2){const next=distance();if(pinch>0&&next>0)viewer.radius=Math.max(span*.22,Math.min(span*8,viewer.radius*pinch/next));pinch=next;cameraOrbit(THREE,viewer);return;}
   if(!last)return;const dx=e.clientX-last.x,dy=e.clientY-last.y;last={x:e.clientX,y:e.clientY};
   viewer.theta-=dx*.008;viewer.phi=Math.max(.12,Math.min(Math.PI-.12,viewer.phi+dy*.008));cameraOrbit(THREE,viewer);
  });
  const stop=e=>{if(e?.pointerId!==undefined)active.delete(e.pointerId);pinch=0;last=null;if(active.size===1){const p=[...active.values()][0];last={x:p.x,y:p.y};}};
  canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
  canvas.addEventListener('wheel',e=>{e.preventDefault();viewer.radius=Math.max(span*.22,Math.min(span*8,viewer.radius*Math.exp(e.deltaY*.001)));cameraOrbit(THREE,viewer);},{passive:false});
  el.querySelector('[data-reset]').addEventListener('click',()=>{viewer.theta=.62;viewer.phi=1.15;viewer.radius=span*1.35;cameraOrbit(THREE,viewer);});
  el.querySelector('[data-close]').addEventListener('click',()=>disposeViewer(state));
  renderer.setAnimationLoop(()=>renderer.render(scene,camera));
  state.viewer=viewer;setStatus(state,'Jenolan Caves full 3D point-cloud viewer open.');refreshUi(state);
 }catch(e){setStatus(state,'Could not open Jenolan Caves 3D viewer: '+String(e?.message||e));refreshUi(state);}
}
function addControl(state){
 const dock=document.getElementById('bpv-dock-actions');if(!dock)return false;
 let group=document.getElementById(CONTROL_ID);
 if(!group){
  group=document.createElement('section');group.id=CONTROL_ID;group.className='bpv-command-group';
  group.setAttribute('data-bpv-command-section','jenolan-caves');
  group.setAttribute('aria-label','Jenolan Caves 3D LiDAR underground asset');
  group.innerHTML='<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">🕳️</span><span><b>JENOLAN CAVES</b><small>17.1 km · CSIRO 3D LiDAR point cloud</small></span></div>'+
   '<div class="bpv-command-grid"><button id="'+TOGGLE_ID+'" data-bpv-action="jenolan-caves" type="button" class="bpv-command-btn" aria-pressed="false" title="Show the materialized Jenolan Caves 3D point cloud beneath terrain"><span class="bpv-command-icon" aria-hidden="true">⛰️</span><span class="bpv-command-label">Jenolan Caves 3D</span></button></div>'+
   '<div id="'+COUNT_ID+'" class="bpv-data-note">17.1 km scanned cave traverse · CSIRO LiDAR</div><div id="'+STATUS_ID+'" class="bpv-data-note">Layer off · existing underground and other BridgePoint layers remain unchanged.</div>';
  const catacombs=document.getElementById('bp-paris-catacombs-control-v3');
  const underground=document.querySelector('[data-bpv-command-section="underground-scan-sites"]');
  if(catacombs?.parentNode===dock)catacombs.after(group);else if(underground?.parentNode===dock)underground.after(group);else dock.appendChild(group);
 }
 const button=document.getElementById(TOGGLE_ID);
 if(button&&!button.dataset.bpJenolanBound){button.dataset.bpJenolanBound='1';button.addEventListener('click',()=>{void setEnabled(state,!state.enabled);});}
 refreshUi(state);return true;
}
async function setEnabled(state,on){
 state.enabled=!!on;state.mapVisible=state.enabled;
 if(state.enabled){
  window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('subsurface',true);
  if(!installLayers(state))setStatus(state,'Waiting for the BridgePoint globe style…');
  else setStatus(state,'Jenolan marker ON · loading its native below-terrain point cloud…');
  scheduleVisibility(state);
  void materializeUnderTerrain(state);
 }else{
  if(state.visibilityFrame){(window.cancelAnimationFrame||clearTimeout)(state.visibilityFrame);state.visibilityFrame=0;}
  state.mapVisible=false;if(state.points)state.points.visible=false;
  for(const id of [HALO_ID,MARKER_ID,LABEL_ID]){
   if(state.map.getLayer(id)&&state.map.getLayoutProperty(id,'visibility')!=='none')state.map.setLayoutProperty(id,'visibility','none');
  }
  setStatus(state,'Jenolan Caves layer OFF · existing BridgePoint layers remain unchanged.');
 }
 refreshUi(state);state.map.triggerRepaint?.();return state.enabled;
}
export function initJenolanCavesRenderer(target){
 const map=target&&(target.map||target);
 if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
 const prior=MAP_STATES.get(map);if(prior)return prior.api;
 const state={map,enabled:false,mapVisible:false,dead:false,THREE:null,manifest:null,geometry:null,decoded:null,points:null,mapMaterial:null,
  renderer:null,camera:null,scene:null,viewer:null,cloudPromise:null,layerPromise:null,visibilityFrame:0,dockTimer:0,status:'off',
  stats:{version:VERSION,sites:1,layerReady:false,materializedPointCount:0,sourcePointCount:0,lastError:null}};
 state.handleClick=e=>{
  if(!state.enabled)return;
  const hits=map.queryRenderedFeatures?.(e.point,{layers:[MARKER_ID]})||[];
  const hit=hits.find(f=>f.properties?.siteId===JENOLAN_CAVES_SITE_V1.id);
  if(hit){map.flyTo?.({center:JENOLAN_CAVES_SITE_V1.coordinates,zoom:Math.max(11.2,Number(map.getZoom()||0)),duration:700});void openViewer(state);}
 };
 state.handleStyle=()=>{
  if(!state.enabled)return;
  window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('subsurface',true);
  installLayers(state);scheduleVisibility(state);
  if(state.geometry&&!map.getLayer(MODEL_LAYER_ID)){state.layerPromise=null;void ensureMapLayer(state).catch(e=>setStatus(state,'Jenolan layer reattach failed: '+String(e?.message||e)));}
  refreshUi(state);
 };
 state.handleVisibility=()=>scheduleVisibility(state);
 map.on('click',state.handleClick);map.on('style.load',state.handleStyle);map.on('load',state.handleStyle);
 for(const event of ['styledata','idle','moveend','zoomend','rotateend','pitchend'])map.on(event,state.handleVisibility);
 const attemptControl=()=>{if(state.dead)return;if(addControl(state)){if(state.dockTimer)clearInterval(state.dockTimer);state.dockTimer=0;}};
 attemptControl();
 if(!document.getElementById(CONTROL_ID)){let tries=0;state.dockTimer=setInterval(()=>{attemptControl();if(++tries>80&&state.dockTimer){clearInterval(state.dockTimer);state.dockTimer=0;}},250);}
 const api={version:VERSION,get enabled(){return state.enabled;},get status(){return state.status;},get stats(){return {...state.stats};},
  toggle(){return setEnabled(state,!state.enabled);},setEnabled(value){return setEnabled(state,value);},
  openViewer(){return openViewer(state);},showUnderTerrain(){return materializeUnderTerrain(state);},
  destroy(){
   state.dead=true;if(state.visibilityFrame)(window.cancelAnimationFrame||clearTimeout)(state.visibilityFrame);
   if(state.dockTimer)clearInterval(state.dockTimer);disposeViewer(state);
   map.off('click',state.handleClick);map.off('style.load',state.handleStyle);map.off('load',state.handleStyle);
   for(const event of ['styledata','idle','moveend','zoomend','rotateend','pitchend'])map.off(event,state.handleVisibility);
   try{if(map.getLayer(MODEL_LAYER_ID))map.removeLayer(MODEL_LAYER_ID);}catch(_){}
   for(const id of [LABEL_ID,MARKER_ID,HALO_ID])try{if(map.getLayer(id))map.removeLayer(id);}catch(_){}
   try{if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);}catch(_){}
   try{state.geometry?.dispose?.();state.mapMaterial?.dispose?.();state.renderer?.dispose?.();}catch(_){}
   MAP_STATES.delete(map);
  }};
 state.api=api;MAP_STATES.set(map,state);return api;
}
