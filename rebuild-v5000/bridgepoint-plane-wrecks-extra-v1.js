/* BridgePoint Plane Wrecks extras — BridgePoint-hosted photogrammetry cards and native globe meshes. */
const THREE_URL='/vendor/three.module.js?v=169-local';
const GLTF_URL='/vendor/GLTFLoader.bundle.js?v=169-local';
const TOGGLE_ID='bp-plane-wrecks-toggle-v1';
const COUNT_ID='bp-plane-wrecks-count-v1';
const MARKER_CLASS='bp-plane-wreck-extra-marker-v1';
const STATE_BY_MAP=new WeakMap();
let threePromise=null;

export const EXTRA_PLANE_WRECKS=[
 {
  id:'b29-over-exposed-bleaklow',
  name:'Boeing RB-29A Superfortress “Over Exposed”',
  label:'B-29 OVER EXPOSED',
  aircraft:'Boeing RB-29A Superfortress',
  coordinates:[-1.86542,53.45091],
  location:'Higher Shelf Stones, Bleaklow, Peak District, England, United Kingdom',
  date:'3 November 1948',
  details:'The model is a photogrammetry scan of the surviving fuselage remains from the Bleaklow crash site. The wider memorial site contains dispersed aircraft wreckage; this scan is not a complete intact aircraft.',
  creator:'gentlegiantJGC',
  photos:null,
  zenodoId:'10318135',
  doi:'10.5281/zenodo.10318135',
  sourceUrl:'https://zenodo.org/records/10318135',
  originalModelUrl:'https://sketchfab.com/3d-models/b-29-over-exposed-fuselage-413af6535d214ff0bb3543114b7dd21a',
  historyUrl:'https://www.peakdistrict.gov.uk/visiting/places-to-visit/bleaklow',
  assetUrl:'/assets/plane-wrecks/extra/b29-over-exposed-bleaklow.glb.gz',
  assetName:'b29-over-exposed-bleaklow.glb.gz',
  license:'CC BY 4.0',
  attribution:'gentlegiantJGC, “B-29 Over Exposed Fuselage”, Zenodo record 10318135, CC BY 4.0. Model hosted by BridgePoint from the openly downloadable Zenodo GLB.',
  locationNote:'Crash-site pin is approximate and marks the Bleaklow memorial wreckage area, not a survey-grade model origin.'
 },
 {
  id:'mitsubishi-zero-a6m3-iwm-london',
  name:'Mitsubishi A6M3 Zero Fighter Wreckage',
  label:'MITSUBISHI ZERO',
  aircraft:'Mitsubishi A6M3 Zero',
  coordinates:[-0.108328,51.496009],
  location:'Imperial War Museum London, Lambeth Road, London SE1 6HZ, United Kingdom',
  date:'Aircraft dated 1943 · wreckage now held at IWM London',
  details:'148 photographs captured in September 2020 and processed in RealityCapture. The scanned wreckage is now held by the Imperial War Museum in London; the marker therefore identifies the museum collection location, not the original Pacific loss location.',
  creator:'artfletch',
  photos:148,
  zenodoId:'10264214',
  doi:'10.5281/zenodo.10264214',
  sourceUrl:'https://zenodo.org/records/10264214',
  originalModelUrl:'https://sketchfab.com/3d-models/zero-fighter-wreckage-5d169fd080d64552ae66ffee76daf675',
  historyUrl:'https://www.iwm.org.uk/collections/item/object/70000201',
  assetUrl:'/assets/plane-wrecks/extra/zero-fighter-a6m3-iwm-london.glb.gz',
  assetName:'zero-fighter-a6m3-iwm-london.glb.gz',
  license:'CC BY 4.0',
  attribution:'artfletch, “Zero Fighter Wreckage”, Zenodo record 10264214, CC BY 4.0. Model hosted by BridgePoint from the openly downloadable Zenodo GLB.',
  locationNote:'Museum-location pin is approximate to the IWM London building; the scanned wreckage is in the museum collection.'
 } ,
 {
  id:'short-sunderland-ej138-munkholmen',
  name:'Short Sunderland EJ138 WH-Y · Forward Section',
  label:'SHORT SUNDERLAND · FORWARD SECTION',
  aircraft:'Short Sunderland Mk V flying boat',
  coordinates:[10.373180,63.452221],
  worldDepthM:64,
  worldScale:1,
  location:'Wreck west of Munkholmen, Trondheim, Trøndelag, Norway',
  date:'Wrecked 3 November 1945 · later stripped, damaged by fire and sunk near Munkholmen',
  details:'Underwater photogrammetry scan of the forward section of Short Sunderland EJ138 WH-Y. The aircraft broke loose from its moorings on the night of 3 November 1945, struck the shoreline and was later stripped, damaged by fire during fuel removal, then towed out and sunk near Munkholmen. This scan is the forward section, not a complete intact aircraft.',
  creator:'Blueye Robotics',
  photos:null,
  zenodoId:'10327701',
  doi:'10.5281/zenodo.10327701',
  sourceUrl:'https://zenodo.org/records/10327701',
  originalModelUrl:'https://sketchfab.com/3d-models/short-sunderland-3be976d6c87d47129067be221053d4bf',
  historyUrl:'https://www.dykkepedia.com/wiki/Short_Sunderland',
  assetUrl:'/assets/plane-wrecks/extra/short-sunderland-ej138-munkholmen.glb.gz',
  assetName:'short-sunderland-ej138-munkholmen.glb.gz',
  license:'CC BY 4.0',
  attribution:'Blueye Robotics, “Short Sunderland”, Sketchfab model 3be976d6c87d47129067be221053d4bf, mirrored in Zenodo record 10327701, CC BY 4.0. Model hosted by BridgePoint from the openly downloadable Zenodo GLB.',
  locationNote:'Wreck-site position is 63.452221° N, 10.373180° E, with the wreck reported at 57–72 m depth. BridgePoint places this scan at the 64 m reference depth; the model origin and orientation are approximate, not a survey-grade alignment.'
 },
 {
  id:'tokai-maru-apra-harbor',
  name:'Tokai Maru — Apra Harbor, Guam',
  label:'TOKAI MARU · GUAM',
  typeLabel:'Vessel',
  vehicleType:'Japanese passenger-cargo freighter',
  kicker:'BRIDGEPOINT · UNDERWATER SHIPWRECK',
  iconType:'ship',
  representationLabel:'Colorized COLMAP photogrammetry point cloud',
  coordinates:[144.65596,13.45905],
  worldDepthM:12.8,
  worldScale:1,
  location:'Apra Harbor, Guam, United States',
  date:'Sunk by USS Snapper · 27 August 1943',
  details:'Tokai Maru was a Japanese passenger-cargo freighter torpedoed and sunk by USS Snapper on 27 August 1943 in Apra Harbor. The wreck lies beside the SMS Cormoran. The Abyssal dataset’s ISRO sequence contains 2,239 underwater photographs of Tokai Maru and companion Depth Anything depth maps. BridgePoint hosts a colorized COLMAP reconstruction point cloud from the ISRO sequence; it is a photogrammetric 3D reconstruction, not a closed textured hull mesh.',
  creator:'Haoran Wang · Nantheera Anantrasirichai · Brett Seymour',
  photos:2239,
  depthMaps:2288,
  zenodoId:'21824088',
  doi:'10.5281/zenodo.21824088',
  sourceUrl:'https://zenodo.org/records/21824088',
  originalModelUrl:'https://zenodo.org/records/21824088',
  historyUrl:'https://www.padi.com/dive-site/guam/tokai-maru/',
  assetUrl:'/assets/plane-wrecks/extra/tokai-maru-apra-harbor-photogrammetry.glb.gz',
  assetName:'tokai-maru-apra-harbor-photogrammetry.glb.gz',
  license:'CC BY 4.0',
  attribution:'Haoran Wang, Nantheera Anantrasirichai and Brett Seymour, “Abyssal: A Large-scale Underwater 3D Reconstruction Dataset”, Zenodo record 21824088, CC BY 4.0. Tokai Maru / ISRO sequence converted and hosted by BridgePoint.',
  locationNote:'Apra Harbor wreck-site marker is approximate to published dive-site coordinates. Published descriptions put the shallowest part at about 42 ft (12.8 m); BridgePoint uses that as an approximate visual depth reference. The COLMAP model origin and orientation are not survey-grade.'
 },
 {
  id:'bell-p39q-airacobra-lake-huron',
  name:'Bell P-39Q Airacobra (#42-21226) — Wing Scan',
  label:'P-39Q AIRACOBRA',
  typeLabel:'Aircraft wreckage',
  vehicleType:'Bell P-39Q Airacobra · serial #42-21226',
  representationLabel:'Photogrammetry triangle mesh · wing component',
  coordinates:[-82.425,43.028],
  worldDepthM:10,
  worldScale:1,
  location:'Lake Huron, approximately four miles north of Port Huron, Michigan, USA',
  date:'Lost 11 April 1944',
  details:'Second Lt. Frank H. Moody’s Bell P-39Q Airacobra (#42-21226) crashed into Lake Huron during a training exercise on 11 April 1944. A search led by Michigan maritime archaeologist Wayne Lusardi and partners located the wreckage; NOAA reports an intact wing and Allison V-12 engine at approximately 10 meters depth. NOAA Ocean Exploration photographed the wing during the 2023 documentation work, and Raymond Phipps processed 438 still photographs into this photogrammetry model. This BridgePoint viewer shows the wing scan only—not a complete or intact aircraft.',
  creator:'Raymond Phipps · NOAA Ocean Exploration',
  photos:438,
  sourceLabel:'NOAA Ocean Exploration source record and photogrammetry details',
  sourceUrl:'https://oceanexplorer.noaa.gov/photogrammetry/p39q/',
  originalModelUrl:'https://construkted.com/asset/ah9tooshsxa/',
  historyUrl:'https://www.miplace.org/historic-preservation/programs-and-services/governors-awards-for-historic-preservation/lake-huron-red-tail-aircraft/',
  assetUrl:'/assets/plane-wrecks/extra/p39q-airacobra-wing-photogrammetry.glb.gz',
  assetName:'p39q-airacobra-wing-photogrammetry.glb.gz',
  license:'Public Domain · NOAA-created model',
  attribution:'Model courtesy of NOAA Ocean Exploration. Photogrammetry developed by Raymond Phipps, NOAA Ocean Exploration explorer-in-training, August 4, 2023. BridgePoint conversion of the publicly downloadable model; NOAA does not endorse BridgePoint.',
  locationNote:'The marker is an approximate site locator based on NOAA’s description of the wreck as about four miles north of Port Huron. NOAA publishes an approximate site depth of 10 m but does not publish survey-grade coordinates or a geospatial transform for this wing mesh; the globe placement and model orientation are therefore for reference, not survey navigation.'
 }
 ,
 {
  id:'kawanishi-h8k-emily-jaluit',
  name:'Kawanishi H8K “Emily” — Jaluit Atoll',
  label:'KAWANISHI H8K · EMILY',
  aircraft:'Imperial Japanese Navy Kawanishi H8K flying boat',
  coordinates:[169.717,6.0127667],
  location:'Jaluit Atoll lagoon, off Imiej Island, Republic of the Marshall Islands',
  depthM:27.4,
  date:'World War II wreck · 3D capture 1 May 2023',
  details:'The NPS Submerged Resources Center photogrammetry scan depicts an Imperial Japanese Navy Kawanishi H8K (“Emily”) four-engine maritime patrol flying boat resting inverted in the Jaluit lagoon, with its tail separated after American airstrikes. The Republic of the Marshall Islands Historic Preservation Office 1999 underwater survey documents intact H8K wreckage as site MI-JL-LA-002 off Imiej Island, at approximately 90 ft (27.4 m) depth. The survey describes the aircraft as inverted and very well intact. The asset page identifies a 40.58-million-polygon mesh captured on 1 May 2023 and processed in 3DF Zephyr.',
  creator:'NPS Submerged Resources Center',
  photos:null,
  representationLabel:'40.58-million-polygon photogrammetry mesh',
  viewerMode:'public-source-embed',
  embedUrl:'https://construkted.com/embed/aekeemf4u6h',
  sourceLabel:'NPS Submerged Resources Center public model record',
  sourceUrl:'https://construkted.com/asset/aekeemf4u6h/',
  originalModelUrl:'https://construkted.com/asset/aekeemf4u6h/',
  historyUrl:'https://rmi-data.sprep.org/system/files/Anthropological-Survey-of-Jaluit-Atoll_Terrestrial_Underwater_Reconnaissance_Surveys_Oral_History_recordings_1999.pdf',
  license:'Public viewing · download / redistribution not verified',
  attribution:'Model and public viewer courtesy of the National Park Service Submerged Resources Center, “Jaluit Atoll Kawanishi H8K Emily”, hosted on Construkted Reality. BridgePoint embeds the source-provided public viewer; no local model-file mirror is claimed.',
  locationNote:'Approximate locator from the RMI Historic Preservation Office 1999 survey for Site MI-JL-LA-002: 06°00.766′ N, 169°43.020′ E, southwest of the first coral pinnacle off Imiej Island. The report repeats the same coordinate string for the separate shallow-water H8K record, so this pin is a broad site reference only—not a verified photogrammetry origin or navigation-grade position.'
 }
];

function safe(value){
 return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function mapOf(target){return target&&(target.map||target);}
function loadThree(){
 if(!threePromise)threePromise=Promise.all([import(THREE_URL),import(GLTF_URL)]).then(([THREE,loader])=>{
  if(!THREE?.WebGLRenderer||!loader?.GLTFLoader)throw new Error('BridgePoint local Three.js / GLTFLoader is unavailable');
  return {THREE,GLTFLoader:loader.GLTFLoader};
 }).catch(error=>{threePromise=null;throw error;});
 return threePromise;
}
function loadModel(wreck){
 if(wreck.modelPromise)return wreck.modelPromise;
 wreck.modelPromise=(async()=>{
  const pair=await loadThree();
  const response=await fetch(wreck.assetUrl,{cache:'force-cache'});
  if(!response.ok)throw new Error('BridgePoint-hosted '+wreck.aircraft+' GLB request failed ('+response.status+')');
  if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot decompress the BridgePoint-hosted model');
  const compressed=await response.arrayBuffer();
  const raw=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if(raw.byteLength<20||new DataView(raw).getUint32(0,true)!==0x46546c67)throw new Error('The BridgePoint-hosted file is not a valid binary glTF');
  const gltf=await new pair.GLTFLoader().parseAsync(raw,'');
  if(!gltf?.scene)throw new Error('The photogrammetry GLB contains no scene');
  const root=gltf.scene;
  root.updateMatrixWorld(true);
  const bounds=new pair.THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())throw new Error('The photogrammetry model contains no visible geometry');
  const size=bounds.getSize(new pair.THREE.Vector3());
  const center=bounds.getCenter(new pair.THREE.Vector3());
  root.position.sub(center);
  root.updateMatrixWorld(true);
  let meshes=0,triangles=0,pointClouds=0,pointCount=0;
  root.traverse(object=>{
   if(!object.isMesh&&!object.isPoints)return;
   object.frustumCulled=false;
   const position=object.geometry?.attributes?.position;
   if(object.isPoints){
    pointClouds++;
    pointCount+=position?.count||0;
   }else{
    meshes++;
    const index=object.geometry?.index;
    triangles+=index?Math.floor(index.count/3):Math.floor((position?.count||0)/3);
    object.castShadow=false;object.receiveShadow=false;
   }
   const materials=Array.isArray(object.material)?object.material:[object.material];
   for(const material of materials){
    if(!material)continue;
    if(object.isMesh)material.side=pair.THREE.DoubleSide;
    if(object.isPoints){
     material.vertexColors=true;
     material.size=Math.max(Math.max(size.x,size.y,size.z)*0.003,0.05);
     material.sizeAttenuation=true;
     material.toneMapped=false;
    }
    material.needsUpdate=true;
   }
  });
  if((!meshes||triangles<1000)&&pointCount<1000)throw new Error('The source GLB did not contain a substantial triangle mesh or photogrammetry point cloud');
  return {THREE:pair.THREE,root,size,meshes,triangles,pointClouds,pointCount};
 })().catch(error=>{wreck.modelPromise=null;throw error;});
 return wreck.modelPromise;
}

function nativeWorldMatrix(map,THREE,wreck){
 try{
  const raw=map.transform?.getMatrixForModel?.(
   [Number(wreck.coordinates[0]),Number(wreck.coordinates[1])],
   -Number(wreck.worldDepthM||0)
  );
  if(raw&&raw.length>=16)return new THREE.Matrix4().fromArray(raw);
  const Mercator=window.maplibregl?.MercatorCoordinate;
  if(!Mercator?.fromLngLat)return null;
  const mc=Mercator.fromLngLat(
   [Number(wreck.coordinates[0]),Number(wreck.coordinates[1])],
   -Number(wreck.worldDepthM||0)
  );
  const metres=mc.meterInMercatorCoordinateUnits();
  if(![mc.x,mc.y,mc.z,metres].every(Number.isFinite)||metres<=0)return null;
  return new THREE.Matrix4().set(
   metres,0,0,mc.x,
   0,0,metres,mc.y,
   0,metres,0,mc.z,
   0,0,0,1
  );
 }catch(_){return null;}
}
function ensureWorldMeshLayer(state,wreck,result){
 const map=state.map,THREE=result.THREE;
 const layerId='bp-plane-wreck-extra-world-'+wreck.id;
 if(map.getLayer?.(layerId))return true;
 const root=result.root.clone(true);
 if(wreck.worldScale&&wreck.worldScale!==1)root.scale.setScalar(wreck.worldScale);
 root.traverse(object=>{
  if(!object.isMesh&&!object.isPoints)return;
  object.frustumCulled=false;
  const materials=Array.isArray(object.material)?object.material:[object.material];
  for(const material of materials){
   if(!material)continue;
   if(object.isMesh)material.side=THREE.DoubleSide;
   if(object.isPoints){
    material.vertexColors=true;
    material.size=2.8;
    material.sizeAttenuation=false;
    material.toneMapped=false;
   }
   material.depthTest=false;
   material.depthWrite=false;
   material.needsUpdate=true;
  }
 });
 root.visible=false;
 const scene=new THREE.Scene();
 scene.add(root);
 scene.add(new THREE.AmbientLight(0xffffff,1.75));
 const key=new THREE.DirectionalLight(0xffe4bb,1.25);
 key.position.set(3,5,4);scene.add(key);
 const fill=new THREE.DirectionalLight(0x8cb8d0,0.7);
 fill.position.set(-4,1,-3);scene.add(fill);
 const camera=new THREE.Camera();
 let renderer=null;
 const layer={
  id:layerId,type:'custom',renderingMode:'3d',
  onAdd(mapRef,gl){
   renderer=new THREE.WebGLRenderer({
    canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'
   });
   renderer.autoClear=false;
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.setPixelRatio(1);
   state.worldLayers.set(wreck.id,{layerId,root,scene,camera,renderer});
  },
  render(_gl,args){
   if(!state.enabled||!renderer||state.destroyed)return;
   if(Number(map.getZoom?.()||0)<12.2){root.visible=false;return;}
   const bounds=map.getBounds?.();
   try{if(bounds&&!bounds.contains(wreck.coordinates)){root.visible=false;return;}}catch(_){}
   const raw=args&&(args.defaultProjectionData?.mainMatrix||args.modelViewProjectionMatrix);
   if(!raw||raw.length<16){root.visible=false;return;}
   const matrix=nativeWorldMatrix(map,THREE,wreck);
   if(!matrix){root.visible=false;return;}
   root.visible=true;
   camera.projectionMatrix.copy(new THREE.Matrix4().fromArray(raw)).multiply(matrix);
   try{
    renderer.resetState();
    renderer.render(scene,camera);
   }catch(error){
    if(!state.worldWarning){
     state.worldWarning=true;
     console.warn('BridgePoint aircraft wreck native globe render',error);
    }
   }finally{
    root.visible=false;
   }
  },
  onRemove(){
   try{renderer?.dispose();}catch(_){}
   renderer=null;
   state.worldLayers.delete(wreck.id);
  }
 };
 try{
  map.addLayer(layer);
  map.triggerRepaint?.();
  return true;
 }catch(error){
  state.worldError=String(error?.message||error);
  return false;
 }
}
async function ensureWorldModel(state,wreck){
 if(!wreck.assetUrl||!wreck.worldDepthM||!state.enabled||state.destroyed)return false;
 if(state.worldPromises.has(wreck.id))return state.worldPromises.get(wreck.id);
 const task=(async()=>{
  try{
   if(!state.map.isStyleLoaded?.()){
    await new Promise(resolve=>state.map.once?.('load',resolve));
   }
   if(!state.enabled||state.destroyed)return false;
   const result=await loadModel(wreck);
   if(!state.enabled||state.destroyed)return false;
   if(!ensureWorldMeshLayer(state,wreck,result)){
    throw new Error('MapLibre 3D layer could not attach the BridgePoint-hosted wreck mesh');
   }
   return true;
  }catch(error){
   console.warn('BridgePoint aircraft wreck globe model unavailable',wreck.id,error);
   return false;
  }finally{
   state.worldPromises.delete(wreck.id);
  }
 })();
 state.worldPromises.set(wreck.id,task);
 return task;
}

function makeMarkerElement(wreck){
 const element=document.createElement('button');
 element.type='button';
 element.className=MARKER_CLASS;
 element.setAttribute('aria-label',wreck.name+(wreck.embedUrl?'. Open BridgePoint card with public source-hosted 3D viewer and details.':'. Open BridgePoint-hosted photogrammetry viewer and details.'));
 element.title=wreck.name+' · open BridgePoint 3D model card';
 element.innerHTML=wreck.iconType==='ship'
  ?'<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M8 38h48l-7 15H17z" fill="currentColor" stroke="#fff1ca" stroke-width="1.7" stroke-linejoin="round"/><path d="M18 35V21h9v-8h12v22M29 21h10M12 57c4-3 8-3 12 0s8 3 12 0 8-3 12 0 6 2 8 0" fill="none" stroke="#fff1ca" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  :'<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M29 4h6l4 20 20 10v6L39 35l2 15 9 7v4l-18-5-18 5v-4l9-7 2-15L5 40v-6l20-10z" fill="currentColor" stroke="#fff1ca" stroke-width="1.7" stroke-linejoin="round"/></svg>';
 return element;
}
function ensureMarker(state,wreck){
 let marker=state.markers.get(wreck.id);
 if(marker){
  try{marker.addTo(state.map);}catch(_){}
  return marker;
 }
 const Marker=window.maplibregl?.Marker;
 if(typeof Marker!=='function')return null;
 const element=makeMarkerElement(wreck);
 element.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  if(state.enabled)openCard(state,wreck);
 });
 marker=new Marker({element,anchor:'center',offset:[0,0]});
 marker.setLngLat(wreck.coordinates).addTo(state.map);
 state.markers.set(wreck.id,marker);
 return marker;
}
function setMarkerVisibility(state,wreck,visible){
 const marker=ensureMarker(state,wreck);
 const element=marker?.getElement?.();
 if(element){
  element.hidden=!visible;
  element.setAttribute('aria-hidden',String(!visible));
  element.disabled=!visible;
 }
}
function setCountNote(){
 const count=document.getElementById(COUNT_ID);
 if(count)count.textContent='7 persistent wreck icons · 7 BridgePoint wreck cards · Jaluit Atoll Kawanishi H8K “Emily” added';
}
function setEnabledFromButton(state){
 const button=document.getElementById(TOGGLE_ID);
 const next=button?.getAttribute('aria-pressed')==='true';
 if(next===state.enabled){
  for(const wreck of EXTRA_PLANE_WRECKS)setMarkerVisibility(state,wreck,state.enabled);
  setCountNote();
  return;
 }
 state.enabled=next;
 for(const wreck of EXTRA_PLANE_WRECKS){
  setMarkerVisibility(state,wreck,state.enabled);
  if(state.enabled&&wreck.worldDepthM)void ensureWorldModel(state,wreck);
 }
 state.map.triggerRepaint?.();
 if(!state.enabled&&state.popup){state.popup.remove();state.popup=null;}
 setCountNote();
}
function addStyles(){
 if(document.getElementById('bp-plane-wreck-extra-style-v1'))return;
 const style=document.createElement('style');style.id='bp-plane-wreck-extra-style-v1';
 style.textContent=
  '.bp-plane-wreck-extra-marker-v1{display:grid;place-items:center;width:42px;height:42px;padding:0;border:1px solid rgba(255,232,178,.98);border-radius:50%;background:radial-gradient(circle,rgba(13,35,49,.97) 38%,rgba(5,17,27,.92) 74%);color:#f4c978;box-shadow:0 0 0 3px rgba(232,186,94,.20),0 2px 12px rgba(0,0,0,.85);cursor:pointer;touch-action:manipulation;z-index:41}'+
  '.bp-plane-wreck-extra-marker-v1[hidden]{display:none!important}'+
  '.bp-plane-wreck-extra-marker-v1 svg{display:block;width:29px;height:29px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.95))}'+
  '.bp-plane-wreck-extra-marker-v1:focus-visible{outline:3px solid #fff;outline-offset:3px}'+
  '.bp-plane-wreck-extra-popup-v1 .maplibregl-popup-content{background:#06131f;color:#e8f5fb;border:1px solid rgba(231,187,103,.62);border-radius:13px;padding:12px;font:12px/1.45 system-ui,sans-serif;max-height:min(82vh,820px);overflow:auto;width:min(450px,calc(100vw - 44px))}'+
  '.bp-plane-wreck-extra-popup-v1 .maplibregl-popup-tip{border-top-color:#06131f;border-bottom-color:#06131f}'+
  '.bp-plane-wreck-extra-card-v1 .bp-extra-kicker{font-size:9px;letter-spacing:.13em;font-weight:900;color:#f0c878}.bp-plane-wreck-extra-card-v1 h3{font-size:18px;color:#fff;margin:4px 0}.bp-plane-wreck-extra-card-v1 .bp-extra-subtitle{color:#c4d6df;margin:2px 0 8px}'+
  '.bp-plane-wreck-extra-card-v1 .bp-extra-facts{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:7px 0 10px}.bp-plane-wreck-extra-card-v1 .bp-extra-facts span{display:grid;gap:2px;padding:7px;border:1px solid rgba(170,197,207,.18);border-radius:7px;color:#e4eff4;font-size:10px;overflow-wrap:anywhere}.bp-plane-wreck-extra-card-v1 .bp-extra-facts b{font-size:9px;color:#9eb7c5;text-transform:uppercase;letter-spacing:.08em}'+
  '.bp-plane-wreck-extra-viewer-v1{width:100%;aspect-ratio:4/3;min-height:230px;background:#02070d;border-radius:9px;overflow:hidden;margin:9px 0;border:1px solid rgba(226,186,109,.3)}.bp-plane-wreck-extra-viewer-v1 canvas,.bp-plane-wreck-extra-viewer-v1 iframe{width:100%;height:100%;min-height:230px;display:block;border:0;touch-action:pan-x pan-y}.bp-plane-wreck-extra-viewer-loading-v1,.bp-plane-wreck-extra-viewer-error-v1{display:grid;place-items:center;min-height:220px;padding:20px;text-align:center;color:#c3d7df;font-size:12px;background:radial-gradient(ellipse at center,rgba(28,67,83,.42),rgba(2,7,13,.96))}'+
  '.bp-plane-wreck-extra-status-v1,.bp-plane-wreck-extra-note-v1{margin:7px 0;color:#a9d2c8;font-size:10px;overflow-wrap:anywhere}.bp-plane-wreck-extra-note-v1{color:#a9c2cb}.bp-plane-wreck-extra-sources-v1{display:grid;gap:5px;border-top:1px solid rgba(154,205,212,.16);padding-top:8px;margin-top:8px;font-size:10px}.bp-plane-wreck-extra-sources-v1>b{color:#dceaf0}.bp-plane-wreck-extra-sources-v1 a{color:#f1cf88;text-decoration:underline}'+
  '@media(max-width:480px){.bp-plane-wreck-extra-popup-v1 .maplibregl-popup-content{width:min(345px,calc(100vw - 44px));padding:10px}.bp-plane-wreck-extra-viewer-v1{min-height:190px}}';
 document.head.appendChild(style);
}
function cardHtml(wreck){
 const photos=wreck.photos?wreck.photos+' source photographs':'Source photogrammetry scan';
 return '<article class="bp-plane-wreck-extra-card-v1">'+
  '<div class="bp-extra-kicker">'+safe(wreck.kicker||'BRIDGEPOINT · PLANE WRECKS')+'</div>'+
  '<h3>'+safe(wreck.name)+'</h3>'+
  '<p class="bp-extra-subtitle">'+safe(wreck.vehicleType||wreck.aircraft)+' · '+safe(wreck.location)+'</p>'+
  '<div class="bp-extra-facts">'+
   '<span><b>'+safe(wreck.typeLabel||'Aircraft')+'</b>'+safe(wreck.vehicleType||wreck.aircraft)+'</span>'+
   '<span><b>Date</b>'+safe(wreck.date)+'</span>'+
   '<span><b>Scan source</b>'+safe(photos)+'</span>'+
   (wreck.depthMaps?'<span><b>Depth products</b>'+safe(wreck.depthMaps)+' companion Depth Anything maps</span>':'')+
   '<span><b>Reconstruction</b>'+safe(wreck.representationLabel||'Photogrammetry triangle mesh')+'</span>'+
   '<span><b>Rights</b>'+safe(wreck.license)+'</span>'+
   '<span><b>Viewer hosting</b>'+(wreck.embedUrl?'Public Construkted embed':'BridgePoint local GLB')+'</span>'+ 
   (wreck.worldDepthM?'<span><b>BridgePoint Earth</b>Placed at the wreck site · '+safe(wreck.worldDepthM)+' m below sea level</span>':(wreck.depthM?'<span><b>Published depth</b>Approx. '+safe(wreck.depthM)+' m below sea level</span>':''))+ 
  '</div>'+
  (wreck.embedUrl
   ? '<div class="bp-plane-wreck-extra-viewer-v1 bp-plane-wreck-extra-source-viewer-v1" role="group" aria-label="Public NPS Submerged Resources Center 3D model viewer"><iframe src="'+safe(wreck.embedUrl)+'" title="'+safe(wreck.name)+' — public 3D viewer" loading="lazy" allow="fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'
   : '<div class="bp-plane-wreck-extra-viewer-v1" data-bp-plane-wreck-extra-viewer="'+safe(wreck.id)+'" role="group" aria-label="BridgePoint-hosted interactive photogrammetry model"><div class="bp-plane-wreck-extra-viewer-loading-v1">Loading BridgePoint-hosted '+safe(wreck.representationLabel||'photogrammetry mesh')+'…</div></div>')+
  (wreck.embedUrl?'<div class="bp-plane-wreck-extra-status-v1">Public Construkted Reality 3D viewer embedded inside this BridgePoint card · the model is streamed by the source host</div>':'<div class="bp-plane-wreck-extra-status-v1" data-extra-model-status>BridgePoint-hosted model · drag to rotate and scroll or pinch to zoom</div>')+
  '<p class="bp-plane-wreck-extra-note-v1">'+safe(wreck.details)+'</p>'+
  '<p class="bp-plane-wreck-extra-note-v1">'+safe(wreck.locationNote)+'</p>'+
  '<div class="bp-plane-wreck-extra-sources-v1"><b>Model source, history and attribution</b>'+
   '<a href="'+safe(wreck.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+safe(wreck.sourceLabel||'Source dataset and model provenance')+' ↗</a>'+
   '<a href="'+safe(wreck.historyUrl)+'" target="_blank" rel="noopener noreferrer">Aircraft / wreck historical reference ↗</a>'+
   '<a href="'+safe(wreck.originalModelUrl)+'" target="_blank" rel="noopener noreferrer">Original 3D model record ↗</a>'+
  '</div>'+
  '<p class="bp-plane-wreck-extra-note-v1">Attribution: '+safe(wreck.attribution)+'</p>'+
 '</article>';
}
function openCard(state,wreck){
 const Popup=window.maplibregl?.Popup;
 if(!Popup)return;
 if(state.popup)state.popup.remove();
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'490px',className:'bp-plane-wreck-extra-popup-v1'})
  .setLngLat(wreck.coordinates).setHTML(cardHtml(wreck)).addTo(state.map);
 mountViewer(state,state.popup,wreck);
}
function mountViewer(state,popup,wreck){
 if(wreck.embedUrl)return;
 const root=popup?.getElement?.();
 const host=root?.querySelector('[data-bp-plane-wreck-extra-viewer="'+wreck.id+'"]');
 if(!host)return;
 let disposed=false,renderer=null,resizeObserver=null,animationFrame=0,resizeHandler=null;
 let scene=null,camera=null,model=null,dragging=false,lastX=0,lastY=0,distance=3;
 const cleanup=()=>{
  if(disposed)return;disposed=true;
  if(animationFrame)cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  if(resizeHandler)window.removeEventListener('resize',resizeHandler);
  try{renderer?.dispose();}catch(_){}
  try{scene?.clear?.();}catch(_){}
 };
 popup.on?.('close',cleanup);
 const status=message=>{const node=root?.querySelector('[data-extra-model-status]');if(node)node.textContent=message;};
 const fail=error=>{
  if(disposed||!host.isConnected)return;
  host.innerHTML='<div class="bp-plane-wreck-extra-viewer-error-v1">BridgePoint 3D viewer could not start: '+safe(error?.message||error)+'</div>';
  status('BridgePoint-hosted photogrammetry viewer failed to load.');
 };
 (async()=>{
  try{
   const result=await loadModel(wreck);
   if(disposed||!host.isConnected)return;
   const THREE=result.THREE;
   const canvas=document.createElement('canvas');
   canvas.style.cursor='grab';canvas.style.touchAction='none';
   canvas.setAttribute('aria-label',wreck.name+' photogrammetry mesh. Drag to rotate; pinch or scroll to zoom.');
   host.replaceChildren(canvas);
   renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
   scene=new THREE.Scene();scene.background=new THREE.Color(0x04111c);
   const maxDim=Math.max(result.size.x,result.size.y,result.size.z,0.001);
   camera=new THREE.PerspectiveCamera(42,1,Math.max(0.001,maxDim/10000),maxDim*100);
   scene.add(new THREE.HemisphereLight(0xe8f4ff,0x27313d,1.7));
   const key=new THREE.DirectionalLight(0xffe6c0,2.1);key.position.set(3,5,6);scene.add(key);
   const fill=new THREE.DirectionalLight(0x8bbbd5,0.8);fill.position.set(-5,1,-4);scene.add(fill);
   const rim=new THREE.DirectionalLight(0xffffff,0.6);rim.position.set(0,-4,3);scene.add(rim);
   model=result.root.clone(true);
   model.traverse(object=>{
    if(!object.isMesh&&!object.isPoints)return;
    object.frustumCulled=false;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    for(const material of materials){
     if(!material)continue;
     if(object.isMesh)material.side=THREE.DoubleSide;
     if(object.isPoints){
      material.vertexColors=true;
      material.size=Math.max(maxDim*0.004,0.05);
      material.sizeAttenuation=true;
      material.toneMapped=false;
     }
     material.needsUpdate=true;
    }
   });
   scene.add(model);
   const target=new THREE.Vector3(0,0,0);
   distance=maxDim*2.15;
   const spherical={theta:0.72,phi:1.05};
   const resize=()=>{
    const width=Math.max(1,host.clientWidth||320),height=Math.max(1,host.clientHeight||230);
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
   };
   resize();resizeHandler=resize;window.addEventListener('resize',resizeHandler);
   if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);}
   const updateCamera=()=>{
    spherical.phi=Math.max(0.08,Math.min(Math.PI-0.08,spherical.phi));
    const sin=Math.sin(spherical.phi);
    camera.position.set(target.x+distance*sin*Math.sin(spherical.theta),target.y+distance*Math.cos(spherical.phi),target.z+distance*sin*Math.cos(spherical.theta));
    camera.lookAt(target);
   };
   updateCamera();
   canvas.addEventListener('pointerdown',event=>{
    dragging=true;lastX=event.clientX;lastY=event.clientY;
    canvas.setPointerCapture?.(event.pointerId);canvas.style.cursor='grabbing';
   });
   canvas.addEventListener('pointermove',event=>{
    if(!dragging)return;
    const dx=event.clientX-lastX,dy=event.clientY-lastY;lastX=event.clientX;lastY=event.clientY;
    spherical.theta-=dx*0.008;spherical.phi+=dy*0.008;updateCamera();
   });
   const stop=()=>{dragging=false;canvas.style.cursor='grab';};
   canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
   canvas.addEventListener('wheel',event=>{
    event.preventDefault();distance=Math.max(maxDim*0.45,Math.min(maxDim*25,distance*Math.exp(event.deltaY*0.0012)));updateCamera();
   },{passive:false});
   const render=()=>{
    if(disposed||!host.isConnected)return;
    renderer.render(scene,camera);animationFrame=requestAnimationFrame(render);
   };
   render();
   const geometrySummary=result.pointCount
    ?result.pointCount.toLocaleString()+' colorized reconstruction points'
    :result.meshes.toLocaleString()+' mesh parts · approximately '+result.triangles.toLocaleString()+' triangles';
   status('BridgePoint-hosted photogrammetry loaded · '+geometrySummary+' · rotate and zoom to inspect.');
  }catch(error){fail(error);}
 })();
}
function attachButtonObserver(state){
 const bind=()=>{
  const button=document.getElementById(TOGGLE_ID);
  if(!button)return false;
  if(state.observedButton===button)return true;
  state.buttonObserver?.disconnect();
  state.observedButton=button;
  state.buttonObserver=new MutationObserver(()=>setEnabledFromButton(state));
  state.buttonObserver.observe(button,{attributes:true,attributeFilter:['aria-pressed']});
  button.addEventListener('click',()=>queueMicrotask(()=>setEnabledFromButton(state)));
  setEnabledFromButton(state);
  return true;
 };
 bind();
 if(typeof MutationObserver!=='undefined'&&document.body){
  state.bodyObserver=new MutationObserver(()=>{if(!state.observedButton)bind();});
  state.bodyObserver.observe(document.body,{childList:true,subtree:true});
 }
}
export function initPlaneWrecksExtraRenderer(target){
 const map=mapOf(target);
 if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
 const existing=STATE_BY_MAP.get(map);if(existing)return existing.api;
 addStyles();
 const state={map,enabled:false,destroyed:false,markers:new Map(),worldLayers:new Map(),worldPromises:new Map(),worldError:null,worldWarning:false,popup:null,observedButton:null,buttonObserver:null,bodyObserver:null};
 const sync=()=>{if(state.enabled)for(const wreck of EXTRA_PLANE_WRECKS){setMarkerVisibility(state,wreck,true);if(wreck.worldDepthM)void ensureWorldModel(state,wreck);}};
 for(const event of ['load','style.load','idle'])map.on?.(event,sync);
 attachButtonObserver(state);
 const api={
  version:1,
  wrecks:EXTRA_PLANE_WRECKS.map(w=>({id:w.id,name:w.name,coordinates:w.coordinates.slice(),assetUrl:w.assetUrl})),
  get enabled(){return state.enabled;},
  get markerCount(){return state.markers.size;},
  refresh(){setEnabledFromButton(state);return state.markers.size;},
  destroy(){
   state.destroyed=true;state.buttonObserver?.disconnect();state.bodyObserver?.disconnect();
   for(const event of ['load','style.load','idle'])map.off?.(event,sync);
   for(const wreck of EXTRA_PLANE_WRECKS){const layerId='bp-plane-wreck-extra-world-'+wreck.id;if(map.getLayer?.(layerId))try{map.removeLayer(layerId);}catch(_){}}
   for(const marker of state.markers.values())try{marker.remove();}catch(_){}
   state.markers.clear();state.popup?.remove();state.popup=null;
   document.getElementById('bp-plane-wreck-extra-style-v1')?.remove();
   STATE_BY_MAP.delete(map);
  }
 };
 state.api=api;STATE_BY_MAP.set(map,state);
 window.__BP_PLANE_WRECKS_EXTRA_V1__=api;
 return api;
}
