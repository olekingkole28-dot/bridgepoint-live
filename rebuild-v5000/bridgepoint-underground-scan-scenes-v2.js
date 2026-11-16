/* BridgePoint Caves & Underground Sites v2.
 * Real GLB scan meshes render in BridgePoint's own Three.js/MapLibre 3D scene.
 * Map anchors and visual vertical offsets are clearly distinguished from surveyed locations.
 */
const VERSION=2, MAP_STATES=new WeakMap(), MIN_MODEL_ZOOM=11.2;
const THREE_URL='/vendor/three.module.js?v=169-local';
const GLTF_URL='/vendor/GLTFLoader.bundle.js?v=169-local';
const SOURCE_ID='bp-underground-scenes-source-v2', HALO_ID='bp-underground-scenes-halo-v2';
const MARKER_ID='bp-underground-scenes-markers-v2', LABEL_ID='bp-underground-scenes-labels-v2';
const MODEL_LAYER_ID='bp-underground-scenes-models-v2';
const CONTROL_ID='bp-underground-scan-scenes-control-v2', TOGGLE_ID='bp-underground-scan-scenes-toggle-v2';
const COUNT_ID='bp-underground-scan-scenes-count-v2', STATUS_ID='bp-underground-scan-scenes-status-v2';
let threePromise=null;

export const UNDERGROUND_SCAN_SITES_V2=[
 {id:'paris-catacombs',name:'Paris Catacombs',type:'catacomb',coordinates:[2.3324,48.8336],
  locationPrecision:'Approximate Catacombs district anchor. Individual scan pages do not publish exact chamber coordinates.',
  locationNote:'Paris scan meshes use this site-region anchor for discovery; they are not surveyed chamber positions.',
  visualizationOffsetM:-18,description:'Real iPhone LiDAR / photogrammetry records of galleries, stairs and chambers in the former underground quarries of Paris.',
  models:[
   {uid:'39e7050d272f4aac8493497621b86f39',title:'Large gallery',creator:'Emm (@edemaistre)',license:'CC Attribution',captureMethod:'iPhone 12 Pro · Scaniverse',sourceUrl:'https://sketchfab.com/3d-models/paris-catacombs-large-gallery-39e7050d272f4aac8493497621b86f39'},
   {uid:'27ae0d6041c54e2eab6638d197985842',title:'Level 1 to Level 2 passage',creator:'Emm (@edemaistre)',license:'CC Attribution',captureMethod:'iPhone 12 Pro · 3DScannerApp',sourceUrl:'https://sketchfab.com/3d-models/paris-catacombs-from-level-1-to-level-2-27ae0d6041c54e2eab6638d197985842'},
   {uid:'c63534cc8b97437bb933b8eba87ffb0d',title:'Our Lady of the Catacombs chamber',creator:'Emm (@edemaistre)',license:'CC Attribution',captureMethod:'iPhone 12 Pro · Scaniverse',sourceUrl:'https://sketchfab.com/3d-models/paris-catacombs-our-lady-of-the-catacombs-c63534cc8b97437bb933b8eba87ffb0d'},
   {uid:'d407fb1ba0414482a99ccd6567b29512',title:'Salle Z (portion)',creator:'Emm (@edemaistre)',license:'CC Attribution',captureMethod:'iPhone 12 Pro · 3DScannerApp',sourceUrl:'https://sketchfab.com/3d-models/paris-catacombs-salle-z-portion-d407fb1ba0414482a99ccd6567b29512'},
   {uid:'ca80de4ccfdd45d4a5b44dad31cb0da2',title:'The Flag Room',creator:'Emm (@edemaistre)',license:'CC Attribution',captureMethod:'iPhone 12 Pro · Scaniverse',sourceUrl:'https://sketchfab.com/3d-models/paris-catacombs-the-flag-room-ca80de4ccfdd45d4a5b44dad31cb0da2'},
   {uid:'e78831639a3a4000b2130457badfc34b',title:'Bureau du Centre',creator:'Emm (@edemaistre)',license:'CC Attribution',captureMethod:'iPhone 12 Pro · Scaniverse',sourceUrl:'https://sketchfab.com/3d-models/paris-catacombs-bureau-du-centre-e78831639a3a4000b2130457badfc34b'},
   {uid:'befe33ccb4cf4005a6f26c83629a9be6',title:'German bunker passage',creator:'Emm (@edemaistre)',license:'CC Attribution',captureMethod:'iPhone 12 Pro · 3DScannerApp',sourceUrl:'https://sketchfab.com/3d-models/paris-catacombs-in-the-german-bunker-befe33ccb4cf4005a6f26c83629a9be6'}
  ]},
 {id:'vrlovka-cave',name:'Vrlovka Cave',type:'cave',coordinates:[15.390412,45.636916],
  locationPrecision:'Published cave-site anchor near the entrance. The model is an interior detail segment, not a georegistered full-cave survey mesh.',
  locationNote:'The icon marks Špilja Vrlovka in Kamanje, Croatia; it does not locate the scanned column segment inside the cave.',
  visualizationOffsetM:-12,description:'A high-detail GeoSLAM mobile-LiDAR scan segment from Vrlovka Cave.',
  models:[
   {uid:'2bff1e25b797418caea81927f394fa9d',title:'Stalagnate within Vrlovka Cave — highest LOD',creator:'Center for Geospatial Technologies (GAL)',license:'CC Attribution',captureMethod:'GeoSLAM mobile LiDAR survey',sourceUrl:'https://sketchfab.com/3d-models/stalagnate-within-vrlovka-cave-highest-lod-2bff1e25b797418caea81927f394fa9d'}
  ]},
 {id:'om-jaettestue',name:'Øm Jættestue Passage Tomb',type:'tomb',coordinates:[11.994633,55.599731],
  locationPrecision:'Published GPS coordinate for the passage-tomb site. The mesh is not a georeferenced excavation survey.',
  locationNote:'This is a Neolithic passage tomb and burial chamber, not a natural cave.',
  visualizationOffsetM:-5,description:'A photogrammetric scan of the Neolithic passage grave at Øm near Lejre, Denmark.',
  models:[
   {uid:'fe5da7d5202a4bfaa6b48e0096d4c6fd',title:'Øm Jættestue passage grave',creator:'Azad Balabanian (@azadbal)',license:'CC Attribution',captureMethod:'610-image photogrammetry · RealityCapture',sourceUrl:'https://sketchfab.com/3d-models/passage-grave-m-jttestue-denmark-fe5da7d5202a4bfaa6b48e0096d4c6fd'}
  ]}
];
export const UNDERGROUND_SCAN_RIGHTS_HOLDS_V2=[
 {title:'Ice cave — Lester paints the world',reason:'CC Attribution-NonCommercial-ShareAlike; excluded from commercial assets until separate permission.',sourceUrl:'https://sketchfab.com/3d-models/ice-cave-lester-paints-the-world-76c1a32650da44fea7b11315cc30a02f'},
 {title:'Samograd Cave / CARDIKARST scans',reason:'CC Attribution-NonCommercial-ShareAlike; excluded from commercial assets until separate permission.',sourceUrl:'https://cardikarst.geog.pmf.hr/?p=491'},
 {title:'Carlsbad Caverns scan candidate',reason:'No individually verified downloadable commercial-use scan with a defensible site anchor is included. No marker is fabricated.'}
];
function allModels(){
 return UNDERGROUND_SCAN_SITES_V2.flatMap(site=>site.models.map(model=>({...model,siteId:site.id,siteName:site.name,
  coordinates:site.coordinates,locationPrecision:site.locationPrecision,locationNote:site.locationNote,
  visualizationOffsetM:site.visualizationOffsetM,assetUrl:'/assets/underground-scan-scenes/'+model.uid+'.glb.gz'})));
}
export function buildUndergroundSceneFeatures(sites=UNDERGROUND_SCAN_SITES_V2){
 return (Array.isArray(sites)?sites:[]).filter(s=>s&&typeof s.id==='string'&&Array.isArray(s.coordinates)&&
  Number.isFinite(Number(s.coordinates[0]))&&Number.isFinite(Number(s.coordinates[1]))&&
  Math.abs(Number(s.coordinates[0]))<=180&&Math.abs(Number(s.coordinates[1]))<=85&&Array.isArray(s.models)&&s.models.length>0)
  .map(s=>({type:'Feature',id:s.id,geometry:{type:'Point',coordinates:[Number(s.coordinates[0]),Number(s.coordinates[1])]},
   properties:{siteId:s.id,name:s.name,type:s.type,iconImage:'bp-underground-scene-icon-'+s.type+'-v2',modelCount:s.models.length,locationPrecision:s.locationPrecision}}));
}
function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function findSite(id){return UNDERGROUND_SCAN_SITES_V2.find(s=>s.id===String(id))||null;}
function modelPopupHtml(site,selected){
 const options=site.models.map(m=>'<button type="button" class="bp-underground-scene-choice-v2'+(m.uid===selected.uid?' is-active':'')+'" data-underground-model="'+safe(m.uid)+'" aria-pressed="'+String(m.uid===selected.uid)+'"><b>'+safe(m.title)+'</b><small>'+safe(m.creator)+' · '+safe(m.captureMethod)+'</small></button>').join('');
 return '<article class="bp-underground-scene-popup-v2"><div class="bp-underground-scene-kicker-v2">BRIDGEPOINT · SKETCHFAB SOURCE · IN-SCENE 3D SCANS</div><h3>'+safe(site.name)+'</h3><p>'+safe(site.description)+'</p>'+
  '<div class="bp-underground-scene-active-v2"><b id="bp-underground-scene-active-title-v2">'+safe(selected.title)+'</b>'+
  '<span>Creator: <strong id="bp-underground-scene-active-creator-v2">'+safe(selected.creator)+'</strong></span>'+
  '<span>License: <strong id="bp-underground-scene-active-license-v2">'+safe(selected.license)+'</strong></span>'+
  '<span>Capture: <strong id="bp-underground-scene-active-method-v2">'+safe(selected.captureMethod)+'</strong></span>'+
  '<span>Source platform: <strong>Sketchfab</strong></span>'+
  '<span id="bp-underground-scene-active-state-v2">Selected mesh renders inside BridgePoint.</span>'+
  '<a id="bp-underground-scene-source-v2" href="'+safe(selected.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Original source / attribution ↗</a></div>'+
  (site.models.length>1?'<div class="bp-underground-scene-choices-v2" aria-label="Scanned models at this site">'+options+'</div>':'')+
  '<p class="bp-underground-scene-precision-v2"><b>Map location:</b> '+safe(site.locationPrecision)+'</p>'+
  '<p class="bp-underground-scene-attribution-v2">The Sketchfab-provided 3D mesh is rendered in BridgePoint, not an embedded viewer. Creator, license and Sketchfab source are shown for attribution. Its vertical offset below terrain is for visualization only, not a source-measured depth. The scan is not claimed as an exact georeferenced chamber mesh.</p></article>';
}
function makeIcon(type){
 const c=document.createElement('canvas');c.width=72;c.height=72;const x=c.getContext('2d');
 const colors=type==='tomb'?['#e5bb76','#825a30']:type==='catacomb'?['#8ce3ef','#236a80']:['#9ce5b4','#2a7755'];
 const g=x.createRadialGradient(25,20,3,36,36,34);g.addColorStop(0,'#f4ffff');g.addColorStop(.25,colors[0]);g.addColorStop(1,colors[1]);
 x.fillStyle='rgba(3,13,21,.86)';x.beginPath();x.arc(36,36,32,0,Math.PI*2);x.fill();x.strokeStyle=colors[0];x.lineWidth=3;x.stroke();
 x.fillStyle=g;x.strokeStyle='#eefcff';x.lineWidth=2.2;
 if(type==='tomb'){x.beginPath();x.moveTo(15,30);x.lineTo(36,15);x.lineTo(57,30);x.lineTo(54,53);x.lineTo(18,53);x.closePath();x.fill();x.stroke();x.beginPath();x.moveTo(29,53);x.lineTo(29,38);x.quadraticCurveTo(36,29,43,38);x.lineTo(43,53);x.stroke();}
 else if(type==='catacomb'){x.beginPath();x.moveTo(14,54);x.lineTo(14,34);x.quadraticCurveTo(36,5,58,34);x.lineTo(58,54);x.closePath();x.fill();x.stroke();x.fillStyle='#061a28';x.beginPath();x.moveTo(26,54);x.lineTo(26,36);x.quadraticCurveTo(36,20,46,36);x.lineTo(46,54);x.closePath();x.fill();x.strokeStyle='#f0ffff';x.beginPath();x.moveTo(36,24);x.lineTo(36,46);x.moveTo(29,31);x.lineTo(43,31);x.stroke();}
 else{x.beginPath();x.moveTo(11,55);x.lineTo(11,40);x.lineTo(21,25);x.lineTo(31,32);x.lineTo(44,13);x.lineTo(61,40);x.lineTo(61,55);x.closePath();x.fill();x.stroke();x.fillStyle='#061a28';x.beginPath();x.moveTo(25,55);x.lineTo(25,42);x.quadraticCurveTo(36,29,47,42);x.lineTo(47,55);x.closePath();x.fill();}
 return x.getImageData(0,0,72,72);
}
function status(state,msg){
 state.status=String(msg||'');const el=document.getElementById(STATUS_ID);if(el)el.textContent=state.status;
 const p=state.popup?.getElement?.()?.querySelector('#bp-underground-scene-active-state-v2');if(p)p.textContent=state.status;
}
function refreshUi(state){
 const n=document.getElementById(COUNT_ID);if(n)n.textContent=state.stats.models+' real scan meshes · '+state.stats.sites+' site anchors';
 const s=document.getElementById(STATUS_ID);if(s)s.textContent=state.status;
 const b=document.getElementById(TOGGLE_ID);if(b){b.setAttribute('aria-pressed',String(state.enabled));b.classList.toggle('is-active',state.enabled);}
}
function setVisibility(state,on){for(const id of [HALO_ID,MARKER_ID,LABEL_ID])if(state.map.getLayer(id))state.map.setLayoutProperty(id,'visibility',on?'visible':'none');}
function installLayers(state){
 const map=state.map;if(!map?.getStyle?.())return false;
 try{
  for(const t of ['cave','catacomb','tomb']){const id='bp-underground-scene-icon-'+t+'-v2';if(!map.hasImage?.(id))map.addImage(id,makeIcon(t),{pixelRatio:2});}
  if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{type:'geojson',data:{type:'FeatureCollection',features:buildUndergroundSceneFeatures()},buffer:64,maxzoom:14,attribution:'Scan creators and CC BY licenses are credited in each model card.'});
  const add=(id,l)=>{if(!map.getLayer(id))map.addLayer(l);};
  add(HALO_ID,{id:HALO_ID,type:'circle',source:SOURCE_ID,minzoom:0,maxzoom:24,layout:{visibility:state.enabled?'visible':'none'},paint:{
   'circle-radius':['interpolate',['linear'],['zoom'],0,3.2,5,5.5,10,8,16,12,22,15],
   'circle-color':['match',['get','type'],'tomb','#d9aa58','catacomb','#58d2e2','#7bd49a'],'circle-opacity':0.34,'circle-blur':0.52}});
  add(MARKER_ID,{id:MARKER_ID,type:'symbol',source:SOURCE_ID,minzoom:0,maxzoom:24,layout:{
   visibility:state.enabled?'visible':'none','icon-image':['get','iconImage'],
   'icon-size':['interpolate',['linear'],['zoom'],0,0.31,3,0.43,7,0.58,12,0.72,18,0.84,23,0.92],
   'icon-anchor':'bottom','icon-allow-overlap':true,'icon-ignore-placement':true,'symbol-sort-key':100}});
  add(LABEL_ID,{id:LABEL_ID,type:'symbol',source:SOURCE_ID,minzoom:4,maxzoom:24,layout:{
   visibility:state.enabled?'visible':'none','text-field':['get','name'],'text-size':['interpolate',['linear'],['zoom'],4,9,10,11,17,13],
   'text-offset':[0,1.25],'text-anchor':'top','text-allow-overlap':false,'text-ignore-placement':false},
   paint:{'text-color':'#eafcff','text-halo-color':'rgba(3,12,20,.94)','text-halo-width':1.4,'text-opacity':0.96}});
  setVisibility(state,state.enabled);return true;
 }catch(e){state.stats.lastError=String(e?.message||e);console.warn('BridgePoint underground scene layers',e);return false;}
}
function loadThree(){if(!threePromise)threePromise=Promise.all([import(THREE_URL),import(GLTF_URL)]).then(([THREE,l])=>{
 if(!THREE?.WebGLRenderer||!l?.GLTFLoader)throw new Error('Local Three.js / GLTFLoader unavailable');return {THREE,GLTFLoader:l.GLTFLoader};
}).catch(e=>{threePromise=null;throw e;});return threePromise;}
function modelMatrixFor(map,THREE,coord,alt){
 try{
  const raw=map.transform&&typeof map.transform.getMatrixForModel==='function'?map.transform.getMatrixForModel([+coord[0],+coord[1]],+alt||0):null;
  if(raw&&raw.length>=16)return new THREE.Matrix4().fromArray(raw);
  const M=window.maplibregl?.MercatorCoordinate;if(!M?.fromLngLat)return null;
  const mc=M.fromLngLat([+coord[0],+coord[1]],+alt||0),metres=mc.meterInMercatorCoordinateUnits();
  if(![mc.x,mc.y,mc.z,metres].every(Number.isFinite)||metres<=0)return null;
  return new THREE.Matrix4().set(metres,0,0,mc.x,0,0,metres,mc.y,0,metres,0,mc.z,0,0,0,1);
 }catch(_){return null;}
}
function disposeObject(root){if(!root)return;root.traverse(o=>{o.geometry?.dispose?.();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose?.();});}
function prepareRoot(THREE,root){
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root);if(box.isEmpty())throw new Error('3D scan mesh has no geometry');
 const centre=box.getCenter(new THREE.Vector3());root.position.x-=centre.x;root.position.z-=centre.z;root.position.y-=box.min.y;
 root.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;o.renderOrder=1000;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){m.depthTest=false;m.depthWrite=false;m.needsUpdate=true;}});
 root.updateMatrixWorld(true);return root;
}
async function ensureModelLayer(state){
 const map=state.map;
 if(map.getLayer(MODEL_LAYER_ID)&&state.scene)return;
 if(state.layerReadyPromise&&map.getLayer(MODEL_LAYER_ID))return state.layerReadyPromise;
 state.layerReadyPromise=null;
 state.layerReadyPromise=new Promise((resolve,reject)=>{
  const THREE=state.THREE;
  const layer={id:MODEL_LAYER_ID,type:'custom',renderingMode:'3d',
   onAdd(mapRef,gl){
    if(!state.renderer){
     const r=new THREE.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
     r.autoClear=false;r.outputColorSpace=THREE.SRGBColorSpace;state.renderer=r;state.camera=new THREE.Camera();state.scene=new THREE.Scene();
     state.scene.add(new THREE.AmbientLight(0xffffff,1.55));const light=new THREE.DirectionalLight(0xfff1d5,1.3);light.position.set(-.65,1.6,.85);state.scene.add(light);
    }
    state.stats.layerReady=true;resolve();
   },
   render(gl,args){
    const root=state.activeRoot;if(!state.enabled||!state.renderer||!state.scene||!state.camera||!root||!state.activeModel)return;
    if(Number(map.getZoom()||0)<MIN_MODEL_ZOOM){root.visible=false;return;}
    const raw=args&&(args.defaultProjectionData?.mainMatrix||args.modelViewProjectionMatrix);if(!raw||raw.length<16)return;
    let ground=0;try{const v=map.queryTerrainElevation?.({lng:state.activeModel.coordinates[0],lat:state.activeModel.coordinates[1]},{exaggerated:false});if(Number.isFinite(v))ground=v;}catch(_){}
    const offset=Number(state.activeModel.visualizationOffsetM),altitude=ground+(Number.isFinite(offset)?offset:-15);
    const matrix=modelMatrixFor(map,THREE,state.activeModel.coordinates,altitude);if(!matrix)return;
    root.visible=true;state.camera.projectionMatrix.copy(new THREE.Matrix4().fromArray(raw)).multiply(matrix);
    try{state.renderer.resetState();state.renderer.render(state.scene,state.camera);}catch(e){if(!state.renderWarned){state.renderWarned=true;console.warn('BridgePoint underground GLB render',e);}}finally{root.visible=false;}
   }
  };
  try{
   if(!map.getLayer(MODEL_LAYER_ID))map.addLayer(layer);
   if(map.getLayer(MODEL_LAYER_ID)&&state.scene)resolve();
  }catch(e){state.layerReadyPromise=null;reject(e);}
 });
 return state.layerReadyPromise;
}
async function fetchGlb(url){
 const response=await fetch(url,{cache:'force-cache'});if(!response.ok)throw new Error('GLB scan asset request failed ('+response.status+')');
 if(typeof DecompressionStream==='undefined')throw new Error('Browser gzip decompression is unavailable');
 const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
 return await new Response(stream).arrayBuffer();
}
async function loadScan(state,site,model){
 const request=++state.loadSequence;state.modelLoading=model.uid;
 if(state.activeRoot){state.scene?.remove(state.activeRoot);disposeObject(state.activeRoot);state.activeRoot=null;state.activeModel=null;}
 status(state,'Loading scan mesh inside BridgePoint: '+model.title+'…');
 try{
  if(!state.THREE||!state.loader){const pair=await loadThree();if(state.dead||request!==state.loadSequence)return;state.THREE=pair.THREE;state.loader=new pair.GLTFLoader();}
  await ensureModelLayer(state);if(state.dead||request!==state.loadSequence)return;
  const buffer=await fetchGlb('/assets/underground-scan-scenes/'+model.uid+'.glb.gz');if(state.dead||request!==state.loadSequence)return;
  const gltf=await state.loader.parseAsync(buffer,'');if(state.dead||request!==state.loadSequence){disposeObject(gltf.scene);return;}
  const root=prepareRoot(state.THREE,gltf.scene);root.name='BridgePoint scan · '+model.title;root.visible=false;state.scene.add(root);
  state.activeRoot=root;state.activeModel={...model,siteId:site.id,siteName:site.name,coordinates:site.coordinates,visualizationOffsetM:site.visualizationOffsetM};
  state.modelLoading=null;status(state,'3D scan loaded inside BridgePoint · '+model.title+' · '+model.license+' · '+model.creator);
  refreshUi(state);state.map.triggerRepaint?.();
 }catch(e){if(request!==state.loadSequence)return;state.modelLoading=null;status(state,'Could not load the in-scene scan mesh: '+String(e?.message||e));console.warn('BridgePoint underground GLB unavailable',model.uid,e);refreshUi(state);}
}
function selectPopupModel(state,site,model){
 const root=state.popup?.getElement?.();if(root){
  for(const [id,value] of [['#bp-underground-scene-active-title-v2',model.title],['#bp-underground-scene-active-creator-v2',model.creator],['#bp-underground-scene-active-license-v2',model.license],['#bp-underground-scene-active-method-v2',model.captureMethod]]){const el=root.querySelector(id);if(el)el.textContent=value;}
  const link=root.querySelector('#bp-underground-scene-source-v2');if(link)link.href=model.sourceUrl;
  for(const b of root.querySelectorAll('[data-underground-model]')){const active=b.getAttribute('data-underground-model')===model.uid;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));}
 }
 if(Number(state.map.getZoom()||0)<MIN_MODEL_ZOOM+.3)state.map.flyTo?.({center:site.coordinates,zoom:MIN_MODEL_ZOOM+.5,duration:1050});
 void loadScan(state,site,model);
}
function openPopup(state,site,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;if(state.popup)state.popup.remove();
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'390px',className:'bp-underground-scene-popup-wrap-v2'}).setLngLat(lngLat||site.coordinates).setHTML(modelPopupHtml(site,site.models[0])).addTo(state.map);
 const el=state.popup.getElement?.();if(el)for(const b of el.querySelectorAll('[data-underground-model]'))b.addEventListener('click',()=>{
  const model=site.models.find(m=>m.uid===b.getAttribute('data-underground-model'));if(model)selectPopupModel(state,site,model);
 });
 selectPopupModel(state,site,site.models[0]);
}
function bindMap(state){
 if(state.bound)return;state.bound=true;
 state.handleClick=e=>{
  if(!state.enabled)return;
  const hits=state.map.queryRenderedFeatures?.(e.point,{layers:[MARKER_ID]})||[];
  const hit=hits.find(f=>f.properties?.siteId);if(!hit)return;
  const site=findSite(hit.properties.siteId);if(site)openPopup(state,site,e.lngLat||site.coordinates);
 };
 state.handleStyle=()=>{if(state.enabled){installLayers(state);if(state.activeRoot&&state.THREE)void ensureModelLayer(state).catch(e=>status(state,'Underground 3D layer reattach failed: '+String(e?.message||e)));refreshUi(state);}};
 state.map.on('click',state.handleClick);state.map.on('style.load',state.handleStyle);state.map.on('load',state.handleStyle);
 state.map.on('zoomend',()=>{if(state.enabled&&state.renderer)state.map.triggerRepaint?.();});
}
function addControl(state){
 const dock=document.getElementById('bpv-dock-actions');if(!dock)return false;
 let group=document.getElementById(CONTROL_ID);
 if(!group){
  group=document.createElement('section');group.id=CONTROL_ID;group.className='bpv-command-group';group.setAttribute('data-bpv-command-section','underground-scan-scenes');
  group.innerHTML='<div class="bpv-command-heading"><span class="bpv-command-heading-icon">🕳️</span><span><b>CAVES & UNDERGROUND SITES</b><small>Real scan meshes rendered inside the BridgePoint globe</small></span></div>'+
   '<div class="bpv-command-grid"><button id="'+TOGGLE_ID+'" type="button" class="bpv-command-btn" aria-pressed="false"><span class="bpv-command-icon">🪨</span><span class="bpv-command-label">Caves & Sites</span></button></div>'+
   '<div id="'+COUNT_ID+'" class="bpv-data-note"></div><div id="'+STATUS_ID+'" class="bpv-data-note">Layer off · existing BridgePoint layers remain unchanged.</div>';
  const wells=document.getElementById('bp-subsurface-wells-control-v1');if(wells&&wells.parentNode===dock)wells.after(group);else dock.prepend(group);
 }
 const b=document.getElementById(TOGGLE_ID);if(b&&!b.dataset.bpUndergroundBound){b.dataset.bpUndergroundBound='1';b.addEventListener('click',()=>{void setEnabled(state,!state.enabled);});}
 refreshUi(state);return true;
}
async function setEnabled(state,on){
 state.enabled=!!on;
 if(state.enabled){
  if(installLayers(state))status(state,'Layer ON · select a cave, catacomb or tomb icon to load a real 3D mesh inside BridgePoint.');
  else status(state,'Waiting for the BridgePoint globe style…');
  if(state.activeRoot&&state.THREE)void ensureModelLayer(state).catch(e=>status(state,'Underground 3D layer reattach failed: '+String(e?.message||e)));
 }else{if(state.popup){state.popup.remove();state.popup=null;}if(state.activeRoot)state.activeRoot.visible=false;setVisibility(state,false);status(state,'Layer off · every other BridgePoint layer remains unchanged.');}
 refreshUi(state);if(state.renderer)state.map.triggerRepaint?.();return state.enabled;
}
export function initUndergroundScanScenesRenderer(target){
 const map=target&&(target.map||target);if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
 const prior=MAP_STATES.get(map);if(prior)return prior.api;
 const state={map,enabled:false,dead:false,popup:null,bound:false,THREE:null,loader:null,renderer:null,camera:null,scene:null,
  activeRoot:null,activeModel:null,modelLoading:null,loadSequence:0,layerReadyPromise:null,observer:null,dockTimer:null,status:'off',
  stats:{version:VERSION,sites:UNDERGROUND_SCAN_SITES_V2.length,models:allModels().length,layerReady:false,lastError:null}};
 const api={version:VERSION,get enabled(){return state.enabled;},get status(){return state.status;},get stats(){return {...state.stats};},
  toggle(){return setEnabled(state,!state.enabled);},setEnabled(v){return setEnabled(state,v);},refresh(){const s=map.getSource(SOURCE_ID);if(s?.setData)s.setData({type:'FeatureCollection',features:buildUndergroundSceneFeatures()});return state.stats;},
  destroy(){state.dead=true;if(state.popup)state.popup.remove();if(state.observer)state.observer.disconnect();if(state.dockTimer)clearTimeout(state.dockTimer);
   if(state.handleClick)map.off('click',state.handleClick);if(state.handleStyle){map.off('style.load',state.handleStyle);map.off('load',state.handleStyle);}
   if(state.activeRoot){state.scene?.remove(state.activeRoot);disposeObject(state.activeRoot);}
   for(const id of [LABEL_ID,MARKER_ID,HALO_ID,MODEL_LAYER_ID])if(map.getLayer(id))map.removeLayer(id);
   if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);MAP_STATES.delete(map);}
 };
 state.api=api;MAP_STATES.set(map,state);window.__BP_UNDERGROUND_SCAN_SCENES_V2__=api;bindMap(state);
 const retry=()=>{if(state.dead)return;if(addControl(state))return;state.dockTimer=setTimeout(retry,250);};retry();
 if(typeof MutationObserver!=='undefined'&&document.body){state.observer=new MutationObserver(()=>{if(!document.getElementById(CONTROL_ID))addControl(state);});state.observer.observe(document.body,{childList:true,subtree:true});}
 return api;
}
