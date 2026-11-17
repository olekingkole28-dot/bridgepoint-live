/* BridgePoint Shipwrecks v4 — Titanic + Robert Gaskin + HMS Grafton + Kanonvraget.
 * Each wreck has a persistent marker, dedicated source-backed card and native underwater model.
 */
const VERSION=4, MAP_STATES=new WeakMap();
const THREE_URL='/vendor/three.module.js?v=169-local';
const GLTF_URL='/vendor/GLTFLoader.bundle.js?v=169-local';
const NATIVE_MODEL_LAYER_ID='bp-shipwrecks-native-model-v2';
const ROBERT_GASKIN_ASSET='/assets/shipwrecks/robert-gaskin-photogrammetry.glb.gz';
const ROBERT_GASKIN_LENGTH_M=40.42;
const HMS_GRAFTON_ASSET='/assets/shipwrecks/hms-grafton-photogrammetry.glb.gz';
const CANNON_ASSET='/assets/shipwrecks/cannon-photogrammetry.glb.gz';
let shipwreckThreePromise=null;
const SOURCE_ID='bp-shipwrecks-titanic-source-v1';
const HALO_ID='bp-shipwrecks-titanic-halo-v1';
const MARKER_ID='bp-shipwrecks-titanic-markers-v1';
const LABEL_ID='bp-shipwrecks-titanic-labels-v1';
const CONTROL_ID='bp-shipwrecks-control-v1';
const TOGGLE_ID='bp-shipwrecks-toggle-v1';
const COUNT_ID='bp-shipwrecks-count-v1';
const STATUS_ID='bp-shipwrecks-status-v1';
const ICON_ID='bp-shipwrecks-icon-v2';

export const TITANIC_SHIPWRECK_PARTS=[
 {id:'titanic-bow',name:'RMS Titanic — Bow section',label:'TITANIC · BOW',part:'bow',coordinates:[-49.946944444444,41.7325],
  coordinateText:'41° 43′ 57″ N, 49° 56′ 49″ W',depthM:3800,defaultModelId:'titanic-bow-photogrammetry',
  locationPrecision:'NOAA 2004 Titanic Expedition waypoint: center of the bow section.'},
 {id:'titanic-stern',name:'RMS Titanic — Stern section',label:'TITANIC · STERN',part:'stern',coordinates:[-49.948333333333,41.726388888889],
  coordinateText:'41° 43′ 35″ N, 49° 56′ 54″ W',depthM:3800,defaultModelId:'titanic-stern-photogrammetry',
  locationPrecision:'NOAA 2004 Titanic Expedition waypoint: center of the stern section.'},
 {id:'titanic-debris',name:'RMS Titanic — Debris-field center',label:'TITANIC · DEBRIS FIELD',part:'debris',coordinates:[-49.946944444444,41.725555555556],
  coordinateText:'41° 43′ 32″ N, 49° 56′ 49″ W',depthM:3800,defaultModelId:null,
  locationPrecision:'NOAA 2004 Titanic Expedition waypoint: center of the debris field. No separate debris-field mesh is included in this release.'}
];

export const ROBERT_GASKIN_WRECK={
 id:'robert-gaskin',name:'Robert Gaskin — 1889 wooden barque',label:'ROBERT GASKIN',
 part:'hull',coordinates:[-75.677083,44.589317],
 coordinateText:'44° 35′ 21.54″ N, 75° 40′ 37.50″ W',
 depthM:19.8,depthRangeM:[18.3,21.3],waterSurfaceElevationM:74.64,verticalDatum:'IGLD 1985',waterSurfaceReferenceDate:'2026-11-16',lengthM:40.42,beamM:8.02,
 sourcePhotos:49000,triangles:598600,vertices:322800,license:'CC BY 4.0',creator:'Christian Rémillard',
 sourceUrl:'https://sketchfab.com/3d-models/robert-gaskin-wreck-1916420a764c4e73b754755d7f2780ce',
 datasetUrl:'https://doi.org/10.5281/zenodo.10288556',
 locationSourceUrl:'https://www.shipwreckworld.com/maps/robert-gaskin-barque-st-lawrence-river-shipwreck',
 historySourceUrl:'https://www.hmdb.org/m.asp?m=141820',assetUrl:ROBERT_GASKIN_ASSET,
 locationPrecision:'Approximate wreck-site center from published wreck coordinates; the photogrammetry mesh origin is not GPS-georeferenced.',
 scalePrecision:'Visualization scale calibrated against published 132.6 ft (40.42 m) vessel length; not a survey-control certificate.',
 orientationPrecision:'Approximate north/inland axis based on the dive-site description that the bow faces inland; not a survey-grade heading.',
 detail:'Photogrammetry reconstruction from approximately 49,000 underwater photographs. The original scan is preserved as a native GLB and placed at the wreck-site coordinate and published 18.3–21.3 m depth range.'
};
export const HMS_GRAFTON_WRECK={
 id:'hms-grafton',name:'HMS Grafton — 1940 G-class destroyer',label:'HMS GRAFTON',
 part:'hull',coordinates:[2.818383333333,51.4071],
 coordinateText:'51° 24.4260′ N, 2° 49.1030′ E',
 scanDepthM:19,waterSurfaceElevationM:0,capturedAt:'2025-05-19',
 license:'CC BY 4.0',creators:'DTU Aqua · Patrizio Mariani · Fletcher Thompson · Javier Alonso Fernández',
 sourceUrl:'https://zenodo.org/records/19592377',datasetUrl:'https://doi.org/10.5281/zenodo.19592377',
 licenseSourceUrl:'https://datasetcatalog.nlm.nih.gov/dataset?q=0000776569',
 viewerUrl:'https://obstek.aqua.dtu.dk/demos/viewer/Grafton',
 locationSourceUrl:'https://publicaties.vlaanderen.be/view-file/83815',
 historySourceUrl:'https://www.uboat.net/allies/warships/ship/4395.html',
 assetUrl:HMS_GRAFTON_ASSET,
 locationPrecision:'The Belgian maritime plan gives the wreck-site coordinate. The source GLB does not publish a verified GPS origin or per-model geodetic transform; its center is placed at the official site point for visualization.',
 scalePrecision:'The source GLB scale is preserved. No survey-control scale certificate is published with this single-model file.',
 orientationPrecision:'The source GLB orientation is preserved; its heading relative to true north is not verified.',
 detail:'DTU Aqua underwater 3D reconstruction at the Grafton site off Oostende, captured 19 May 2025. The source record reports an approximate capture depth of 19 m.'
};
export const CANNON_WRECK={
 id:'kanonvraget',name:'Kanonvraget — Cannon Wreck',label:'KANONVRAGET · CANNON WRECK',
 part:'wreck',coordinates:[12.8688,55.6448],coordinateText:'55.6448° N, 12.8688° E',
 depthRangeM:[14,16],displayDepthM:15,captureDepthM:11,
 estimatedLengthM:48,cannonCount:16,cannonWeightPounds:[12,14],capturedAt:'2025-06-12',
 license:'CC BY 4.0',
 creators:'DTU Aqua · Patrizio Mariani · Fletcher Thompson · Javier Alonso Fernández',
 sourceUrl:'https://zenodo.org/records/19592377',datasetUrl:'https://doi.org/10.5281/zenodo.19592377',
 viewerUrl:'https://obstek.aqua.dtu.dk/demos/viewer/cannon',
 locationSourceUrl:'https://www.vragguiden.dk/vrag/4643',
 coordinateSourceUrl:'https://www.vragguiden.dk/api/WreckPdf/4643',
 assetUrl:CANNON_ASSET,
 location:'East of Saltholm in the Øresund, Denmark, about 4.4 km from shore.',
 locationPrecision:'Verified WGS84 wreck-site position from the Danish wreck database. The GLB itself does not publish a GPS origin or survey-control transform; BridgePoint centers the original scan at the wreck-site coordinate for visualization.',
 scalePrecision:'BridgePoint preserves the source GLB scale and orientation. The approximately 48 m vessel length is a historical estimate, not a scale-control certificate for the mesh.',
 detail:'The wreck is unidentified. The Danish wreck record describes at least 16 large 12–14-pound iron cannons scattered across and beside an approximately 48 m vessel. Kanonvraget is a descriptive wreck name, not a confirmed vessel name.'
};

export function buildAllShipwreckFeatures(){
 const p=ROBERT_GASKIN_WRECK;
 const gaskin={type:'Feature',id:p.id,geometry:{type:'Point',coordinates:[Number(p.coordinates[0]),Number(p.coordinates[1])]},
  properties:{wreckId:p.id,name:p.name,label:p.label,part:p.part,iconImage:ICON_ID,depthM:p.depthM,coordinateText:p.coordinateText}};
 const g=HMS_GRAFTON_WRECK;
 const grafton={type:'Feature',id:g.id,geometry:{type:'Point',coordinates:[Number(g.coordinates[0]),Number(g.coordinates[1])]},
  properties:{wreckId:g.id,name:g.name,label:g.label,part:g.part,iconImage:ICON_ID,depthM:g.scanDepthM,coordinateText:g.coordinateText}};
 const c=CANNON_WRECK;
 const cannon={type:'Feature',id:c.id,geometry:{type:'Point',coordinates:[Number(c.coordinates[0]),Number(c.coordinates[1])]},
  properties:{wreckId:c.id,name:c.name,label:c.label,part:c.part,iconImage:ICON_ID,depthM:c.displayDepthM,coordinateText:c.coordinateText}};
 return [...buildTitanicShipwreckFeatures(),gaskin,grafton,cannon];
}

export const TITANIC_3D_MODELS=[
 {id:'titanic-bow-photogrammetry',part:'bow',title:'RMS Titanic’s bow wreck',creator:'Pramet.Peet',platform:'Sketchfab',
  triangles:'5 million',vertices:'2.5 million',
  sourceUrl:'https://sketchfab.com/3d-models/rms-titanics-bow-wreck-292b9f523d4a4366bf6dfbbd5d959e43',
  embedUrl:'https://sketchfab.com/models/292b9f523d4a4366bf6dfbbd5d959e43/embed?autostart=0&ui_infos=1&ui_controls=1&ui_watermark=1&ui_theme=dark',
  description:'Independent Sketchfab upload titled “RMS Titanic’s bow wreck” and tagged photogrammetry. Its publisher does not document a survey-grade scale, georeferenced origin or connection to Magellan’s official dataset.'},
 {id:'titanic-stern-photogrammetry',part:'stern',title:'RMS Titanic’s stern wreck',creator:'Pramet.Peet',platform:'Sketchfab',
  triangles:'4.5 million',vertices:'2.2 million',
  sourceUrl:'https://sketchfab.com/3d-models/rms-titanics-stern-wreck-5baccbaf949f4882b4f73f1c0169392d',
  embedUrl:'https://sketchfab.com/models/5baccbaf949f4882b4f73f1c0169392d/embed?autostart=0&ui_infos=1&ui_controls=1&ui_watermark=1&ui_theme=dark',
  description:'Independent Sketchfab upload titled “RMS Titanic’s stern wreck” and tagged photogrammetry. Its publisher does not document a survey-grade scale, georeferenced origin or connection to Magellan’s official dataset.'},
 {id:'titanic-full-size-reference',part:'reference',title:'RMS Titanic — full-size historical reconstruction',creator:'Nicholas Correia · The Wreck Explorer',platform:'The Wreck Explorer',
  sourceUrl:'https://www.wreckexplorer.co.uk/titanic-3d',
  embedUrl:'https://www.wreckexplorer.co.uk/titanic-3d#t3-stage',
  triangles:null,vertices:null,
  description:'Interactive 1:1 historical reconstruction (one scene unit equals one metre), not a photogrammetry scan or survey of the wreck. Its author notes that its wreck view places the bow and stern 200 m apart rather than their seabed separation.'}
];

export const TITANIC_OFFICIAL_SCAN_SOURCES=[
 {title:'NOAA — Titanic Expedition 2004 waypoint record',url:'https://repository.library.noaa.gov/view/noaa/10519/noaa_10519_DS1.pdf'},
 {title:'Magellan — Titanic TT24 full-size digital twin',url:'https://www.magellan.gg/magellan-titanic-tt24/'},
 {title:'Voyis — RMS Titanic survey and 3D reconstruction',url:'https://voyis.com/projects-titanic/'}
];

export function buildTitanicShipwreckFeatures(parts=TITANIC_SHIPWRECK_PARTS){
 return (Array.isArray(parts)?parts:[]).filter(p=>
  p&&typeof p.id==='string'&&Array.isArray(p.coordinates)&&
  Number.isFinite(Number(p.coordinates[0]))&&Number.isFinite(Number(p.coordinates[1]))&&
  Math.abs(Number(p.coordinates[0]))<=180&&Math.abs(Number(p.coordinates[1]))<=85
 ).map(p=>({
  type:'Feature',id:p.id,
  geometry:{type:'Point',coordinates:[Number(p.coordinates[0]),Number(p.coordinates[1])]},
  properties:{partId:p.id,name:p.name,label:p.label,part:p.part,iconImage:ICON_ID,depthM:p.depthM,coordinateText:p.coordinateText}
 }));
}

function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function modelById(id){return TITANIC_3D_MODELS.find(m=>m.id===id)||null;}
function partById(id){return TITANIC_SHIPWRECK_PARTS.find(p=>p.id===id)||null;}
function officialLinksHtml(){
 return TITANIC_OFFICIAL_SCAN_SOURCES.map(s=>'<a href="'+safe(s.url)+'" target="_blank" rel="noopener noreferrer">'+safe(s.title)+' ↗</a>').join('');
}

export function titanicShipwreckPopupHtml(part,selectedModelId=null){
 if(!part)return '';
 const selected=modelById(selectedModelId);
 const modelChoices=TITANIC_3D_MODELS.map(m=>
  '<button type="button" class="bp-shipwreck-model-choice-v1'+(selected&&m.id===selected.id?' is-active':'')+'" data-shipwreck-model-id="'+safe(m.id)+'" aria-pressed="'+String(!!selected&&m.id===selected.id)+'"><span>'+safe(m.title)+'</span><small>'+safe(m.creator)+' · '+safe(m.platform)+'</small></button>'
 ).join('');
 const viewer=selected
  ?'<iframe id="bp-shipwreck-titanic-viewer-v1" title="'+safe(selected.title)+' — interactive 3D model" src="'+safe(selected.embedUrl)+'" allow="autoplay; fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>'
  :'<div class="bp-shipwreck-viewer-empty-v1" id="bp-shipwreck-viewer-empty-v1">No separate debris-field 3D mesh is included yet. Choose the bow or stern scan above to explore those wreck sections.</div>';
 const modelNote=selected?selected.description:'The selected map waypoint is the debris-field center; the available 3D section models are listed above.';
 const source=selected?selected.sourceUrl:'https://www.magellan.gg/magellan-titanic-tt24/';
 return '<article class="bp-shipwreck-titanic-popup-v1">'+
  '<div class="bp-shipwreck-kicker-v1">BRIDGEPOINT · SHIPWRECKS</div>'+
  '<h3>RMS Titanic</h3>'+
  '<div class="bp-shipwreck-part-v1">'+safe(part.name)+'</div>'+
  '<div class="bp-shipwreck-facts-v1"><span><b>NOAA waypoint</b>'+safe(part.coordinateText)+'</span><span><b>Seafloor depth</b>Approximately '+safe(Number(part.depthM).toLocaleString())+' m</span></div>'+
  '<div class="bp-shipwreck-viewer-v1" id="bp-shipwreck-titanic-viewer-wrap-v1">'+viewer+'</div>'+
  '<div class="bp-shipwreck-model-meta-v1">'+
   '<b id="bp-shipwreck-model-title-v1">'+safe(selected?selected.title:'Select a Titanic 3D model')+'</b>'+
   '<span id="bp-shipwreck-model-creator-v1">'+safe(selected?('Creator: '+selected.creator+' · '+selected.platform):'Bow, stern and full-size reference models are available above')+'</span>'+
   '<span id="bp-shipwreck-model-detail-v1">'+safe(selected?(selected.triangles?'Mesh listing: '+selected.triangles+' triangles · '+selected.vertices+' vertices':'Model scale: 1 unit = 1 metre · original ship dimensions: 269.1 m × 28.2 m'):modelNote)+'</span>'+
   '<p id="bp-shipwreck-model-note-v1">'+safe(modelNote)+'</p>'+
   '<a id="bp-shipwreck-model-source-v1" href="'+safe(source)+'" target="_blank" rel="noopener noreferrer">Open selected model source ↗</a>'+
  '</div>'+
  '<div class="bp-shipwreck-model-choices-v1" aria-label="Titanic 3D model choices">'+modelChoices+'</div>'+
  '<div class="bp-shipwreck-official-v1"><b>Official survey references</b>'+officialLinksHtml()+'</div>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Placement and model accuracy:</strong> The globe markers use the NOAA expedition waypoint for each section. The two Sketchfab models are independent public uploads tagged “photogrammetry”; their published pages do not document metric scale, georeferencing or provenance from Magellan. The official Magellan digital twin is linked above, but its complete model is not offered there as a public embeddable mesh. The 1:1 historical reconstruction is an interpretive reference, not the scanned wreck.</p>'+
  '<p class="bp-shipwreck-source-v1">NOAA coordinates are section/field centers, not survey footprints. The viewer models are references only and are not positioned or scaled as 3D meshes on the globe.</p>'+
 '</article>';
}

function makeTitanicIcon(){
 const canvas=document.createElement('canvas');canvas.width=88;canvas.height=88;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,88,88);
 const g=ctx.createRadialGradient(28,23,4,44,44,40);
 g.addColorStop(0,'#fff7d8');g.addColorStop(.32,'#e3b55c');g.addColorStop(1,'#68451f');
 ctx.fillStyle='rgba(3,14,25,.94)';ctx.beginPath();ctx.arc(44,44,40,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#f5cf81';ctx.lineWidth=3;ctx.stroke();
 ctx.fillStyle=g;ctx.strokeStyle='#fff3cb';ctx.lineWidth=2.2;
 // A clearly recognizable ship silhouette, gently listing above three sonar/wave rings.
 ctx.beginPath();ctx.moveTo(15,47);ctx.lineTo(72,47);ctx.lineTo(63,61);ctx.lineTo(25,61);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#fff0c6';ctx.fillRect(31,35,8,11);ctx.fillRect(43,31,9,15);ctx.fillRect(56,36,7,10);
 ctx.strokeStyle='#fff0c6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(35,34);ctx.lineTo(35,25);ctx.moveTo(47,30);ctx.lineTo(47,21);ctx.moveTo(59,35);ctx.lineTo(59,28);ctx.stroke();
 ctx.strokeStyle='rgba(150,225,240,.95)';ctx.lineWidth=2.4;
 for(const [y,w] of [[68,27],[75,19]]){ctx.beginPath();ctx.moveTo(44-w/2,y);ctx.quadraticCurveTo(44,y+4,44+w/2,y);ctx.stroke();}
 return ctx.getImageData(0,0,88,88);
}
function setStatus(state,msg){state.status=msg;const el=document.getElementById(STATUS_ID);if(el)el.textContent=msg;}
function refreshStatusUi(state){
 const count=document.getElementById(COUNT_ID);
 if(count)count.textContent='6 persistent wreck icons · 3 native CC BY 4.0 seabed scans · '+state.stats.models.toLocaleString()+' Titanic viewer references';
 const status=document.getElementById(STATUS_ID);if(status)status.textContent=state.status;
 const button=document.getElementById(TOGGLE_ID);
 if(button){button.setAttribute('aria-pressed',String(state.enabled));button.classList.toggle('is-active',state.enabled);}
}
export function syncTitanicShipwreckCategory(enabled,overlayGuard){
 if(!overlayGuard||typeof overlayGuard.allowLayerCategory!=='function')return false;
 return overlayGuard.allowLayerCategory('shipwrecks',!!enabled)!==false;
}
function syncSharedOverlayCategory(state){
 try{
  state.stats.sharedVisibilityCategoryReady=syncTitanicShipwreckCategory(
   state.enabled,window.__BP_DRONE_AWARENESS_V1__
  );
 }catch(error){
  state.stats.sharedVisibilityCategoryReady=false;
  state.stats.sharedVisibilityCategoryError=String(error?.message||error);
 }
 return !!state.stats.sharedVisibilityCategoryReady;
}
function setVisibility(state,visible){
 syncSharedOverlayCategory(state);
 const next=visible?'visible':'none';
 for(const id of [HALO_ID,MARKER_ID,LABEL_ID]){
  if(!state.map.getLayer(id))continue;
  const current=state.map.getLayoutProperty(id,'visibility')||'visible';
  if(current!==next)state.map.setLayoutProperty(id,'visibility',next);
 }
}
function installLayers(state){
 const map=state.map;if(!map?.getStyle?.())return false;
 try{
  if(!map.hasImage?.(ICON_ID))map.addImage(ICON_ID,makeTitanicIcon(),{pixelRatio:2});
  if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{
   type:'geojson',data:{type:'FeatureCollection',features:buildAllShipwreckFeatures()},
   buffer:64,maxzoom:14,attribution:'Titanic waypoint centers: NOAA 2004 Expedition. Robert Gaskin photogrammetry: Christian Remillard, CC BY 4.0 / Zenodo 10.5281/zenodo.10288556.'
  });
  const add=(id,layer)=>{if(!map.getLayer(id))map.addLayer(layer);};
  add(HALO_ID,{id:HALO_ID,type:'circle',source:SOURCE_ID,minzoom:0,maxzoom:24,
   layout:{visibility:state.enabled?'visible':'none'},
   paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,4,5,7,10,10,16,14,22,17],
    'circle-color':'#e6b95f','circle-opacity':0.36,'circle-blur':0.52}});
  add(MARKER_ID,{id:MARKER_ID,type:'symbol',source:SOURCE_ID,minzoom:0,maxzoom:24,
   layout:{visibility:state.enabled?'visible':'none','icon-image':ICON_ID,
    'icon-size':['interpolate',['linear'],['zoom'],0,0.35,3,0.45,7,0.60,12,0.74,18,0.84,23,0.92],
    'icon-anchor':'center','icon-allow-overlap':true,'icon-ignore-placement':true,'symbol-sort-key':120}});
  add(LABEL_ID,{id:LABEL_ID,type:'symbol',source:SOURCE_ID,minzoom:4,maxzoom:24,
   layout:{visibility:state.enabled?'visible':'none','text-field':['get','label'],
    'text-size':['interpolate',['linear'],['zoom'],4,9,10,11,17,13],
    'text-offset':[0,1.28],'text-anchor':'top','text-allow-overlap':false,'text-ignore-placement':false},
   paint:{'text-color':'#ffe8b7','text-halo-color':'rgba(3,12,22,.96)','text-halo-width':1.5,'text-opacity':0.98}});
  setVisibility(state,state.enabled);return true;
 }catch(error){
  state.stats.lastError=String(error?.message||error);
  console.warn('BridgePoint Titanic shipwreck layer unavailable',error);return false;
 }
}
function applySelectedModel(root,model){
 const viewer=root.querySelector('#bp-shipwreck-titanic-viewer-wrap-v1');
 if(viewer){
  viewer.replaceChildren();
  if(model){
   const frame=document.createElement('iframe');
   frame.id='bp-shipwreck-titanic-viewer-v1';frame.title=model.title+' — interactive 3D model';
   frame.src=model.embedUrl;frame.allow='autoplay; fullscreen; xr-spatial-tracking; gyroscope; accelerometer';
   frame.allowFullscreen=true;frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
   viewer.appendChild(frame);
  }else{
   const empty=document.createElement('div');empty.className='bp-shipwreck-viewer-empty-v1';
   empty.textContent='No separate debris-field 3D mesh is included yet. Choose the bow or stern scan above to explore those wreck sections.';
   viewer.appendChild(empty);
  }
 }
 const put=(selector,value)=>{const el=root.querySelector(selector);if(el)el.textContent=value;};
 put('#bp-shipwreck-model-title-v1',model?model.title:'Select a Titanic 3D model');
 put('#bp-shipwreck-model-creator-v1',model?('Creator: '+model.creator+' · '+model.platform):'Bow, stern and full-size reference models are available above');
 put('#bp-shipwreck-model-detail-v1',model?(model.triangles?'Mesh listing: '+model.triangles+' triangles · '+model.vertices+' vertices':'Model scale: 1 unit = 1 metre · original ship dimensions: 269.1 m × 28.2 m'):'The selected map waypoint is the debris-field center.');
 put('#bp-shipwreck-model-note-v1',model?model.description:'No separate debris-field 3D mesh is included in this first release.');
 const link=root.querySelector('#bp-shipwreck-model-source-v1');
 if(link){link.href=model?model.sourceUrl:'https://www.magellan.gg/magellan-titanic-tt24/';link.textContent=model?'Open selected model source ↗':'Open official Magellan scan reference ↗';}
 for(const button of root.querySelectorAll('[data-shipwreck-model-id]')){
  const active=!!model&&button.getAttribute('data-shipwreck-model-id')===model.id;
  button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));
 }
}
function openTitanicPopup(state,part,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 if(state.popup)state.popup.remove();
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'450px',className:'bp-shipwreck-titanic-popup-wrap-v1'})
  .setLngLat(lngLat||part.coordinates).setHTML(titanicShipwreckPopupHtml(part,part.defaultModelId)).addTo(state.map);
 const root=state.popup.getElement?.();if(!root)return;
 for(const button of root.querySelectorAll('[data-shipwreck-model-id]')){
  button.addEventListener('click',()=>{
   const model=modelById(button.getAttribute('data-shipwreck-model-id'));
   if(model)applySelectedModel(root,model);
  });
 }
}
function updateRobertGaskinModelStatus(state,message){
 state.nativeModelStatus=String(message||'');
 const element=document.getElementById('bp-shipwreck-robert-status-v2');
 if(element)element.textContent=state.nativeModelStatus;
 const popup=state.popup?.getElement?.()?.querySelector('[data-robert-gaskin-status]');
 if(popup)popup.textContent=state.nativeModelStatus;
}
function updateHmsGraftonModelStatus(state,message){
 state.graftonModelStatus=String(message||'');
 const popup=state.popup?.getElement?.()?.querySelector('[data-hms-grafton-status]');
 if(popup)popup.textContent=state.graftonModelStatus;
}
function updateCannonModelStatus(state,message){
 state.cannonModelStatus=String(message||'');
 const popup=state.popup?.getElement?.()?.querySelector('[data-cannon-wreck-status]');
 if(popup)popup.textContent=state.cannonModelStatus;
}
async function loadShipwreckThree(){
 if(!shipwreckThreePromise)shipwreckThreePromise=Promise.all([import(THREE_URL),import(GLTF_URL)]).then(([THREE,loader])=>{
  if(!THREE?.WebGLRenderer||!loader?.GLTFLoader)throw new Error('BridgePoint local Three.js / GLTFLoader unavailable');
  return {THREE,GLTFLoader:loader.GLTFLoader};
 }).catch(error=>{shipwreckThreePromise=null;throw error;});
 return shipwreckThreePromise;
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
async function loadRobertGaskinMesh(state){
 if(state.nativeModelRoot)return state.nativeModelRoot;
 if(state.nativeModelPromise)return state.nativeModelPromise;
 state.nativeModelPromise=(async()=>{
  const pair=await loadShipwreckThree();if(state.destroyed)throw new Error('Shipwreck layer closed');
  state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;
  const response=await fetch(ROBERT_GASKIN_ASSET,{cache:'force-cache'});
  if(!response.ok)throw new Error('Robert Gaskin GLB request failed ('+response.status+')');
  if(typeof DecompressionStream==='undefined')throw new Error('Gzip decompression is unavailable in this browser');
  const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer=await new Response(stream).arrayBuffer();
  if(new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('Robert Gaskin asset is not a valid GLB');
  const gltf=await new state.GLTFLoader().parseAsync(buffer,'');
  if(!gltf?.scene)throw new Error('Robert Gaskin GLB contains no scene');
  const root=gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const bounds=new pair.THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())throw new Error('Robert Gaskin scan contains no 3D geometry');
  const size=bounds.getSize(new pair.THREE.Vector3());
  const longAxis=Math.max(size.x,size.z);
  if(!Number.isFinite(longAxis)||longAxis<=0)throw new Error('Robert Gaskin scan has invalid dimensions');
  const scale=ROBERT_GASKIN_LENGTH_M/longAxis;
  root.scale.multiplyScalar(scale);
  // The original GLB is not GPS-oriented. Rotate its long axis approximately
  // north/south; source dive notes say the bow faces inland.
  root.rotation.y=size.x>=size.z?Math.PI/2:0;
  root.updateMatrixWorld(true);
  const centeredBounds=new pair.THREE.Box3().setFromObject(root);
  const center=centeredBounds.getCenter(new pair.THREE.Vector3());
  root.position.x-=center.x;root.position.y-=center.y;root.position.z-=center.z;
  root.traverse(object=>{
   if(!object.isMesh&&!object.isPoints)return;
   object.frustumCulled=false;object.renderOrder=1000;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material)continue;
    material.depthTest=false;material.depthWrite=false;material.needsUpdate=true;
   }
  });
  root.updateMatrixWorld(true);
  state.nativeModelRoot=root;
  state.nativeModelBounds={x:size.x*scale,y:size.y*scale,z:size.z*scale};
  state.nativeModelScale=scale;
  if(state.nativeModelScene)state.nativeModelScene.add(root);
  return root;
 })().catch(error=>{state.nativeModelPromise=null;throw error;});
 return state.nativeModelPromise;
}
async function loadHmsGraftonMesh(state){
 if(state.graftonModelRoot)return state.graftonModelRoot;
 if(state.graftonModelPromise)return state.graftonModelPromise;
 state.graftonModelPromise=(async()=>{
  const pair=await loadShipwreckThree();if(state.destroyed)throw new Error('Shipwreck layer closed');
  state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;
  const response=await fetch(HMS_GRAFTON_ASSET,{cache:'force-cache'});
  if(!response.ok)throw new Error('HMS Grafton GLB request failed ('+response.status+')');
  if(typeof DecompressionStream==='undefined')throw new Error('Gzip decompression is unavailable in this browser');
  const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer=await new Response(stream).arrayBuffer();
  if(new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('HMS Grafton asset is not a valid GLB');
  const gltf=await new state.GLTFLoader().parseAsync(buffer,'');
  if(!gltf?.scene)throw new Error('HMS Grafton GLB contains no scene');
  const root=gltf.scene.clone(true);root.updateMatrixWorld(true);
  const bounds=new pair.THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())throw new Error('HMS Grafton scan contains no 3D geometry');
  const size=bounds.getSize(new pair.THREE.Vector3());
  if(![size.x,size.y,size.z].every(Number.isFinite)||Math.max(size.x,size.y,size.z)<=0)throw new Error('HMS Grafton scan has invalid dimensions');
  // The individual GLB lacks a published GPS transform; keep its source scale/orientation.
  const center=bounds.getCenter(new pair.THREE.Vector3());
  root.position.x-=center.x;root.position.y-=center.y;root.position.z-=center.z;
  root.visible=false;
  root.traverse(object=>{
   if(!object.isMesh&&!object.isPoints)return;
   object.frustumCulled=false;object.renderOrder=1000;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material)continue;
    material.depthTest=false;material.depthWrite=false;material.needsUpdate=true;
   }
  });
  root.updateMatrixWorld(true);
  state.graftonModelRoot=root;state.graftonModelBounds={x:size.x,y:size.y,z:size.z};
  if(state.nativeModelScene)state.nativeModelScene.add(root);
  return root;
 })().catch(error=>{state.graftonModelPromise=null;throw error;});
 return state.graftonModelPromise;
}
async function loadCannonMesh(state){
 if(state.cannonModelRoot)return state.cannonModelRoot;
 if(state.cannonModelPromise)return state.cannonModelPromise;
 state.cannonModelPromise=(async()=>{
  const pair=await loadShipwreckThree();if(state.destroyed)throw new Error('Shipwreck layer closed');
  state.THREE=pair.THREE;state.GLTFLoader=pair.GLTFLoader;
  const response=await fetch(CANNON_ASSET,{cache:'force-cache'});
  if(!response.ok)throw new Error('Kanonvraget GLB request failed ('+response.status+')');
  if(typeof DecompressionStream==='undefined')throw new Error('Gzip decompression is unavailable in this browser');
  const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer=await new Response(stream).arrayBuffer();
  if(new DataView(buffer).getUint32(0,true)!==0x46546c67)throw new Error('Kanonvraget asset is not a valid GLB');
  const gltf=await new state.GLTFLoader().parseAsync(buffer,'');
  if(!gltf?.scene)throw new Error('Kanonvraget GLB contains no scene');
  const root=gltf.scene.clone(true);root.updateMatrixWorld(true);
  const bounds=new pair.THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())throw new Error('Kanonvraget scan contains no 3D geometry');
  const size=bounds.getSize(new pair.THREE.Vector3());
  if(![size.x,size.y,size.z].every(Number.isFinite)||Math.max(size.x,size.y,size.z)<=0)throw new Error('Kanonvraget scan has invalid dimensions');
  // Preserve DTU Aqua source scale/orientation; center the GLB on the wreck-site anchor.
  const center=bounds.getCenter(new pair.THREE.Vector3());
  root.position.x-=center.x;root.position.y-=center.y;root.position.z-=center.z;
  root.visible=false;
  root.traverse(object=>{
   if(!object.isMesh&&!object.isPoints)return;
   object.frustumCulled=false;object.renderOrder=1000;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material)continue;
    material.depthTest=false;material.depthWrite=false;material.needsUpdate=true;
   }
  });
  root.updateMatrixWorld(true);
  state.cannonModelRoot=root;state.cannonModelBounds={x:size.x,y:size.y,z:size.z};
  if(state.nativeModelScene)state.nativeModelScene.add(root);
  return root;
 })().catch(error=>{state.cannonModelPromise=null;throw error;});
 return state.cannonModelPromise;
}
function ensureRobertGaskinMapLayer(state){
 const map=state.map,THREE=state.THREE;
 if(!THREE||(!state.nativeModelRoot&&!state.graftonModelRoot&&!state.cannonModelRoot)||state.destroyed)return false;
 if(map.getLayer(NATIVE_MODEL_LAYER_ID)&&state.nativeModelRenderer&&state.nativeModelScene){
  for(const root of [state.nativeModelRoot,state.graftonModelRoot,state.cannonModelRoot])if(root&&root.parent!==state.nativeModelScene)state.nativeModelScene.add(root);
  return true;
 }
 const layer={
  id:NATIVE_MODEL_LAYER_ID,type:'custom',renderingMode:'3d',
  onAdd(mapRef,gl){
   state.nativeModelRenderer=new THREE.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
   state.nativeModelRenderer.autoClear=false;state.nativeModelRenderer.outputColorSpace=THREE.SRGBColorSpace;
   state.nativeModelCamera=new THREE.Camera();state.nativeModelScene=new THREE.Scene();
   state.nativeModelScene.add(new THREE.AmbientLight(0xffffff,1.55));
   const key=new THREE.DirectionalLight(0xffe9c7,1.2);key.position.set(-.6,1.4,.9);state.nativeModelScene.add(key);
   for(const root of [state.nativeModelRoot,state.graftonModelRoot,state.cannonModelRoot])if(root)state.nativeModelScene.add(root);
   state.stats.nativeModelLayerReady=true;
  },
  render(gl,args){
   if(!state.enabled||!state.nativeModelRenderer||!state.nativeModelScene||!state.nativeModelCamera)return;
   const raw=args&&(args.defaultProjectionData?.mainMatrix||args.modelViewProjectionMatrix);
   if(!raw||raw.length<16)return;
   const draw=(root,visible,coordinates,altitudeM,warningKey,label)=>{
    if(!root)return;
    const inZoom=Number(map.getZoom?.()||0)>=12.2;
    const bounds=map.getBounds?.();let inBounds=true;
    try{if(bounds&&!bounds.contains(coordinates))inBounds=false;}catch(_){}
    if(!visible||!inZoom||!inBounds){root.visible=false;return;}
    const matrix=nativeMapMatrix(map,THREE,coordinates,altitudeM);
    if(!matrix){root.visible=false;return;}
    root.visible=true;
    state.nativeModelCamera.projectionMatrix.copy(new THREE.Matrix4().fromArray(raw)).multiply(matrix);
    try{state.nativeModelRenderer.resetState();state.nativeModelRenderer.render(state.nativeModelScene,state.nativeModelCamera);}
    catch(error){if(!state[warningKey]){state[warningKey]=true;console.warn('BridgePoint '+label+' native seabed render',error);}}
    finally{root.visible=false;}
   };
   draw(state.nativeModelRoot,state.nativeModelVisible,ROBERT_GASKIN_WRECK.coordinates,
    ROBERT_GASKIN_WRECK.waterSurfaceElevationM-ROBERT_GASKIN_WRECK.depthM,'nativeModelRenderWarned','Robert Gaskin');
   draw(state.graftonModelRoot,state.graftonModelVisible,HMS_GRAFTON_WRECK.coordinates,
    HMS_GRAFTON_WRECK.waterSurfaceElevationM-HMS_GRAFTON_WRECK.scanDepthM,'graftonModelRenderWarned','HMS Grafton');
   draw(state.cannonModelRoot,state.cannonModelVisible,CANNON_WRECK.coordinates,
    -CANNON_WRECK.displayDepthM,'cannonModelRenderWarned','Kanonvraget');
  },
  onRemove(){
   try{state.nativeModelRenderer?.dispose();}catch(_){}
   state.nativeModelRenderer=null;state.nativeModelCamera=null;state.nativeModelScene=null;
   state.stats.nativeModelLayerReady=false;
  }
 };
 try{map.addLayer(layer);return true;}catch(error){state.stats.nativeModelLastError=String(error?.message||error);console.warn('BridgePoint native shipwreck layer unavailable',error);return false;}
}
async function showRobertGaskinOnRiverbed(state){
 if(!state.enabled)return false;
 state.nativeModelAutoAttempted=true;state.nativeModelVisible=true;
 updateRobertGaskinModelStatus(state,'Loading the CC BY 4.0 photogrammetry scan…');
 setStatus(state,'Robert Gaskin native underwater mesh loading; all six wreck icons remain on.');
 try{
  await loadRobertGaskinMesh(state);
  if(state.destroyed||!state.enabled)return false;
  if(!ensureRobertGaskinMapLayer(state))throw new Error('MapLibre native 3D layer could not attach');
  if(state.nativeModelScene&&state.nativeModelRoot.parent!==state.nativeModelScene)state.nativeModelScene.add(state.nativeModelRoot);
  updateRobertGaskinModelStatus(state,'Native scan loaded · '+Math.round(state.nativeModelBounds.x*100)/100+' m long after historical-length calibration. Visible when zoomed in near the wreck site.');
  setStatus(state,'Robert Gaskin native photogrammetry mesh loaded at its published wreck-depth reference.');
  state.map.triggerRepaint?.();refreshStatusUi(state);return true;
 }catch(error){
  state.nativeModelVisible=false;
  updateRobertGaskinModelStatus(state,'Native scan could not load: '+String(error?.message||error));
  setStatus(state,'Robert Gaskin native 3D mesh unavailable: '+String(error?.message||error));
  return false;
 }
}
async function showHmsGraftonOnSeabed(state){
 if(!state.enabled)return false;
 state.graftonModelAutoAttempted=true;state.graftonModelVisible=true;
 updateHmsGraftonModelStatus(state,'Loading the CC BY 4.0 HMS Grafton scan…');
 setStatus(state,'HMS Grafton native underwater mesh loading; all six wreck icons remain on.');
 try{
  await loadHmsGraftonMesh(state);
  if(state.destroyed||!state.enabled)return false;
  if(!ensureRobertGaskinMapLayer(state))throw new Error('MapLibre native 3D layer could not attach');
  if(state.nativeModelScene&&state.graftonModelRoot.parent!==state.nativeModelScene)state.nativeModelScene.add(state.graftonModelRoot);
  const b=state.graftonModelBounds;
  updateHmsGraftonModelStatus(state,'Native scan loaded · source GLB bounds '+[b.x,b.y,b.z].map(n=>n.toFixed(1)+' m').join(' × ')+'. Source scale/orientation preserved; displayed at the approximate 19 m capture-depth reference when zoomed to the wreck.');
  setStatus(state,'HMS Grafton native photogrammetry mesh loaded at its approximate wreck-site/depth reference.');
  state.map.triggerRepaint?.();refreshStatusUi(state);return true;
 }catch(error){
  state.graftonModelVisible=false;
  updateHmsGraftonModelStatus(state,'Native scan could not load: '+String(error?.message||error));
  setStatus(state,'HMS Grafton native 3D mesh unavailable: '+String(error?.message||error));
  return false;
 }
}
async function showCannonOnSeabed(state){
 if(!state.enabled)return false;
 state.cannonModelAutoAttempted=true;state.cannonModelVisible=true;
 updateCannonModelStatus(state,'Loading the CC BY 4.0 DTU Aqua Cannon Shipwreck scan…');
 setStatus(state,'Kanonvraget native underwater mesh loading; all six wreck icons remain on.');
 try{
  await loadCannonMesh(state);
  if(state.destroyed||!state.enabled)return false;
  if(!ensureRobertGaskinMapLayer(state))throw new Error('MapLibre native 3D layer could not attach');
  if(state.nativeModelScene&&state.cannonModelRoot.parent!==state.nativeModelScene)state.nativeModelScene.add(state.cannonModelRoot);
  const b=state.cannonModelBounds;
  updateCannonModelStatus(state,'Native DTU Aqua scan loaded · source GLB bounds '+[b.x,b.y,b.z].map(n=>n.toFixed(1)+' m').join(' × ')+'. Source scale/orientation preserved; centered at the verified wreck position and displayed at the 15 m midpoint of the published 14–16 m depth range.');
  setStatus(state,'Kanonvraget native photogrammetry mesh loaded at its approximate wreck-site/depth reference.');
  state.map.triggerRepaint?.();refreshStatusUi(state);return true;
 }catch(error){
  state.cannonModelVisible=false;
  updateCannonModelStatus(state,'Native scan could not load: '+String(error?.message||error));
  setStatus(state,'Kanonvraget native 3D mesh unavailable: '+String(error?.message||error));
  return false;
 }
}
function addRobertGaskinStyles(){
 if(document.getElementById('bp-shipwreck-gaskin-style-v2'))return;
 const style=document.createElement('style');style.id='bp-shipwreck-gaskin-style-v2';
 style.textContent='.bp-shipwreck-gaskin-popup-v2{color:#e8f5fb;font:12px/1.45 system-ui,sans-serif}.bp-shipwreck-gaskin-popup-v2 h3{font-size:18px;color:#fff;margin:4px 0}.bp-shipwreck-gaskin-popup-v2 .facts{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}.bp-shipwreck-gaskin-popup-v2 .facts span{padding:7px;border:1px solid rgba(170,197,207,.18);border-radius:7px;font-size:10px}.bp-shipwreck-gaskin-popup-v2 .facts b{display:block;font-size:9px;color:#9eb7c5;text-transform:uppercase}.bp-shipwreck-gaskin-popup-v2 iframe{width:100%;height:210px;border:0}.bp-shipwreck-gaskin-actions-v2{display:grid;gap:7px;margin:10px 0}.bp-shipwreck-gaskin-actions-v2 button{background:#3b321f;color:#ffe9bb;border:1px solid #d7b66d;border-radius:8px;padding:9px;font-weight:800}.bp-shipwreck-gaskin-status-v2{padding:8px;border:1px solid rgba(231,187,103,.28);border-radius:7px;color:#c8d9df;font-size:10px;margin:7px 0}.bp-shipwreck-gaskin-popup-v2 a{color:#f1cf88}';
 document.head.appendChild(style);
}
function openHmsGraftonPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 addRobertGaskinStyles();
 if(state.popup)state.popup.remove();
 const p=HMS_GRAFTON_WRECK;
 const html='<article class="bp-shipwreck-grafton-popup-v1">'+
  '<div class="bp-shipwreck-kicker-v1">BRIDGEPOINT · SHIPWRECKS</div><h3>HMS Grafton (H89)</h3>'+
  '<p>British G-class destroyer · lost 29 May 1940 while returning from the Dunkirk evacuation</p>'+
  '<div class="facts"><span><b>Official wreck position</b>'+safe(p.coordinateText)+'</span><span><b>3D scan capture depth</b>Approximately 19 m</span>'+
  '<span><b>Scan captured</b>19 May 2025 · Oostende, Belgium</span><span><b>Model source</b>DTU Aqua · Benthic 3D Models and Tiles</span></div>'+
  '<div class="bp-shipwreck-viewer-v1"><iframe title="HMS Grafton underwater 3D scan viewer" src="'+safe(p.viewerUrl)+'" allow="autoplay; fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'+
  '<div class="bp-shipwreck-gaskin-actions-v2"><button type="button" data-hms-grafton-action="materialize">Place native 3D scan beneath the water</button></div>'+
  '<div class="bp-shipwreck-gaskin-status-v2" data-hms-grafton-status>'+safe(state.graftonModelStatus||'Native scan not loaded yet. Select the button to download the licensed GLB and place it at the wreck-site depth reference.')+'</div>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>3D placement accuracy:</strong> The source dataset reports the Grafton model at an approximate 19 m capture depth. The Belgian maritime plan publishes the HMS Grafton wreck coordinate shown above. The individual GLB does not publish a verified GPS origin or a per-model geodetic/bathymetric transform. BridgePoint preserves the source GLB scale and orientation, centers it at the official wreck position and places its center at approximately 19 m below the water surface for visualization. This is an approximate site placement, not survey-controlled registration of the full scan to the actual seabed; local wreck relief and charted depths vary.</p>'+
  '<div class="bp-shipwreck-official-v1"><b>Model, rights and wreck references</b>'+
   '<a href="'+safe(p.datasetUrl)+'" target="_blank" rel="noopener noreferrer">DTU Aqua · original 3D dataset and GLB download ↗</a>'+
   '<a href="'+safe(p.licenseSourceUrl)+'" target="_blank" rel="noopener noreferrer">NLM Dataset Catalog · CC BY 4.0 rights and contributor record ↗</a>'+
   '<a href="'+safe(p.locationSourceUrl)+'" target="_blank" rel="noopener noreferrer">Belgian maritime plan · official HMS Grafton position ↗</a>'+
   '<a href="'+safe(p.historySourceUrl)+'" target="_blank" rel="noopener noreferrer">HMS Grafton history and sinking details ↗</a>'+
   '<a href="'+safe(p.viewerUrl)+'" target="_blank" rel="noopener noreferrer">Open original DTU Aqua 3D viewer ↗</a></div>'+
  '<p class="bp-shipwreck-source-v1">The native GLB is mirrored into BridgePoint under CC BY 4.0 with creator attribution. Its original coordinate transform is not included in the individual Grafton GLB.</p></article>';
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'450px',className:'bp-shipwreck-titanic-popup-wrap-v1'}).setLngLat(lngLat||p.coordinates).setHTML(html).addTo(state.map);
 const root=state.popup.getElement?.();
 root?.querySelector('[data-hms-grafton-action="materialize"]')?.addEventListener('click',()=>{void showHmsGraftonOnSeabed(state);});
}
function openCannonWreckPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 addRobertGaskinStyles();
 if(state.popup)state.popup.remove();
 const p=CANNON_WRECK;
 const html='<article class="bp-shipwreck-grafton-popup-v1 bp-shipwreck-cannon-popup-v1">'+
  '<div class="bp-shipwreck-kicker-v1">BRIDGEPOINT · SHIPWRECKS</div><h3>Kanonvraget — Cannon Wreck</h3>'+
  '<p>Unidentified historic sailing vessel · east of Saltholm · Øresund, Denmark</p>'+
  '<div class="facts"><span><b>Verified WGS84 site</b>'+safe(p.coordinateText)+'</span><span><b>Wreck depth</b>14–16 m (site record)</span>'+
  '<span><b>DTU scan capture</b>12 June 2025 · approximately 11 m depth</span><span><b>Vessel length</b>Approximately 48 m (historical estimate)</span>'+
  '<span><b>Armament</b>At least 16 iron cannons · 12–14 lb</span><span><b>Scan model</b>DTU Aqua · underwater photogrammetry GLB</span></div>'+
  '<div class="bp-shipwreck-viewer-v1"><iframe title="Kanonvraget Cannon Shipwreck interactive DTU Aqua 3D viewer" src="'+safe(p.viewerUrl)+'" allow="autoplay; fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'+
  '<div class="bp-shipwreck-gaskin-actions-v2"><button type="button" data-cannon-wreck-action="materialize">Place native 3D scan beneath the Øresund</button></div>'+
  '<div class="bp-shipwreck-gaskin-status-v2" data-cannon-wreck-status>'+safe(state.cannonModelStatus||'Native scan not loaded yet. Select the button to place the local DTU Aqua GLB at the wreck-site depth reference.')+'</div>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Scan and placement:</strong> DTU Aqua describes its Cannon Shipwreck reconstruction as captured on 12 June 2025 at approximately 11 m depth. The Danish wreck database separately gives a verified WGS84 position and a 14–16 m top-to-bottom wreck depth range. BridgePoint anchors the original GLB at that verified site coordinate and places its center at 15 m below the water surface for visualization. The GLB does not publish a GPS origin or survey-control transform; its source scale and orientation are preserved, so full mesh registration is approximate. The capture-depth and wreck-depth figures are kept separate rather than treated as the same measurement.</p>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Historical identification:</strong> The vessel has not been conclusively identified. The Danish wreck record describes at least 16 large 12–14-pound iron cannons and estimates the ship at about 48 m long. Suggestions such as a frigate from the 1801 Battle of Copenhagen or the frigate Charlotte are hypotheses, not confirmed identifications.</p>'+
  '<div class="bp-shipwreck-official-v1"><b>3D model, rights and wreck references</b>'+
   '<a href="'+safe(p.datasetUrl)+'" target="_blank" rel="noopener noreferrer">Zenodo · DTU Aqua original GLB and dataset (CC BY 4.0) ↗</a>'+
   '<a href="'+safe(p.viewerUrl)+'" target="_blank" rel="noopener noreferrer">DTU Aqua · original interactive 3D viewer ↗</a>'+
   '<a href="'+safe(p.locationSourceUrl)+'" target="_blank" rel="noopener noreferrer">Vragguiden · Kanonvraget verified wreck record and location ↗</a>'+
   '<a href="'+safe(p.coordinateSourceUrl)+'" target="_blank" rel="noopener noreferrer">Vragguiden · wreck coordinates, depth and historical description ↗</a>'+
   '<a href="https://datasetcatalog.nlm.nih.gov/dataset?q=0000776569" target="_blank" rel="noopener noreferrer">NLM Dataset Catalog · CC BY 4.0 rights record ↗</a></div>'+
  '<p class="bp-shipwreck-source-v1">Attribution: DTU Aqua, National Institute of Aquatic Resources, Technical University of Denmark; Patrizio Mariani; Fletcher Thompson; Javier Alonso Fernández. Licensed under Creative Commons Attribution 4.0 International.</p></article>';
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'450px',className:'bp-shipwreck-titanic-popup-wrap-v1'}).setLngLat(lngLat||p.coordinates).setHTML(html).addTo(state.map);
 const root=state.popup.getElement?.();
 root?.querySelector('[data-cannon-wreck-action="materialize"]')?.addEventListener('click',()=>{void showCannonOnSeabed(state);});
}
function openRobertGaskinPopup(state,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 addRobertGaskinStyles();
 if(state.popup)state.popup.remove();
 const p=ROBERT_GASKIN_WRECK;
 const html='<article class="bp-shipwreck-gaskin-popup-v2">'+
  '<div class="bp-shipwreck-kicker-v1">BRIDGEPOINT · SHIPWRECKS</div><h3>Robert Gaskin</h3>'+
  '<p>1863 wooden barque · sank 1889 · St. Lawrence River, Brockville, Ontario</p>'+
  '<div class="facts"><span><b>Wreck-site center</b>'+safe(p.coordinateText)+'</span><span><b>Hull depth range</b>18.3–21.3 m (60–70 ft)</span>'+
  '<span><b>Published length</b>40.42 m / 132.6 ft</span><span><b>Photogrammetry</b>approximately 49,000 photos</span></div>'+
  '<div class="bp-shipwreck-viewer-v1"><iframe title="Robert Gaskin underwater photogrammetry viewer" src="https://sketchfab.com/models/1916420a764c4e73b754755d7f2780ce/embed?autostart=0&ui_infos=1&ui_controls=1&ui_watermark=1&ui_theme=dark" allow="autoplay; fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'+
  '<div class="bp-shipwreck-gaskin-actions-v2"><button type="button" data-robert-gaskin-action="materialize">Place 3D scan at its wreck depth</button></div>'+
  '<div class="bp-shipwreck-gaskin-status-v2" data-robert-gaskin-status>'+safe(state.nativeModelStatus||'Native scan not loaded yet. Select the button to download and display the local 3D mesh at the wreck site.')+'</div>'+
  '<p class="bp-shipwreck-accuracy-v1"><strong>Scan and placement:</strong> Christian Rémillard’s CC BY 4.0 GLB is a photogrammetry scan processed from approximately 49,000 underwater photographs (about 598,600 triangles). It is calibrated to the published 132.6 ft historical length and placed at the published wreck-site center. Its original mesh origin is not GPS-georeferenced, so its center and heading are approximate. The model uses a 74.64 m IGLD85 water-surface reference dated 16 Nov 2026 minus the 19.8 m midpoint depth; actual river levels vary. The source reports the bow faces inland and the bow/stern range from about 18.3 to 21.3 m.</p>'+
  '<div class="bp-shipwreck-official-v1"><b>Survey and location references</b><a href="'+safe(p.datasetUrl)+'" target="_blank" rel="noopener noreferrer">Zenodo CC BY 4.0 original GLB and metadata ↗</a><a href="'+safe(p.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Sketchfab photogrammetry source ↗</a><a href="'+safe(p.locationSourceUrl)+'" target="_blank" rel="noopener noreferrer">Shipwreck World GPS and depth reference ↗</a><a href="'+safe(p.historySourceUrl)+'" target="_blank" rel="noopener noreferrer">Brockville historical marker ↗</a></div>'+
  '<p class="bp-shipwreck-source-v1">The Robert Gaskin is a freshwater St. Lawrence River wreck, not an ocean site. The native GLB is locally hosted by BridgePoint under CC BY 4.0 with creator attribution.</p></article>';
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'450px',className:'bp-shipwreck-titanic-popup-wrap-v1'}).setLngLat(lngLat||p.coordinates).setHTML(html).addTo(state.map);
 const root=state.popup.getElement?.();
 root?.querySelector('[data-robert-gaskin-action="materialize"]')?.addEventListener('click',()=>{void showRobertGaskinOnRiverbed(state);});
}
function maybeAutoMaterializeRobertGaskin(state){
 if(!state.enabled||state.nativeModelAutoAttempted||state.nativeModelRoot||state.nativeModelPromise)return false;
 if(Number(state.map.getZoom?.()||0)<12.2)return false;
 const bounds=state.map.getBounds?.();
 try{if(bounds&&!bounds.contains(ROBERT_GASKIN_WRECK.coordinates))return false;}catch(_){}
 state.nativeModelAutoAttempted=true;
 void showRobertGaskinOnRiverbed(state);
 return true;
}
function maybeAutoMaterializeHmsGrafton(state){
 if(!state.enabled||state.graftonModelAutoAttempted||state.graftonModelRoot||state.graftonModelPromise)return false;
 if(Number(state.map.getZoom?.()||0)<12.2)return false;
 const bounds=state.map.getBounds?.();
 try{if(bounds&&!bounds.contains(HMS_GRAFTON_WRECK.coordinates))return false;}catch(_){}
 state.graftonModelAutoAttempted=true;
 void showHmsGraftonOnSeabed(state);
 return true;
}
function maybeAutoMaterializeCannon(state){
 if(!state.enabled||state.cannonModelAutoAttempted||state.cannonModelRoot||state.cannonModelPromise)return false;
 if(Number(state.map.getZoom?.()||0)<12.2)return false;
 const bounds=state.map.getBounds?.();
 try{if(bounds&&!bounds.contains(CANNON_WRECK.coordinates))return false;}catch(_){}
 state.cannonModelAutoAttempted=true;
 void showCannonOnSeabed(state);
 return true;
}
function bindInteractions(state){
 if(state.interactionsBound)return;state.interactionsBound=true;
 state.handleClick=event=>{
  if(!state.enabled)return;
  const hits=state.map.queryRenderedFeatures?.(event.point,{layers:[MARKER_ID]})||[];
  const hit=hits.find(feature=>feature.properties?.partId||feature.properties?.wreckId);
  if(!hit)return;
  if(hit.properties?.wreckId==='robert-gaskin'){openRobertGaskinPopup(state,event.lngLat||ROBERT_GASKIN_WRECK.coordinates);return;}
  if(hit.properties?.wreckId==='hms-grafton'){openHmsGraftonPopup(state,event.lngLat||HMS_GRAFTON_WRECK.coordinates);return;}
  if(hit.properties?.wreckId==='kanonvraget'){openCannonWreckPopup(state,event.lngLat||CANNON_WRECK.coordinates);return;}
  const part=partById(String(hit.properties.partId));
  if(part)openTitanicPopup(state,part,event.lngLat||part.coordinates);
 };
 state.handlePersistentVisibility=()=>{
  if(!state.enabled)return;
  // The shared clean-start guard can hide optional marker layers after camera
  // settles. Re-allow this dedicated category and restore only Titanic layers.
  syncSharedOverlayCategory(state);
  if(!installLayers(state)){
   setStatus(state,'Shipwrecks ON · waiting for the globe style before restoring all six shipwreck icons.');
   refreshStatusUi(state);return;
  }
  setVisibility(state,true);
  state.stats.visibilityReassertions=(state.stats.visibilityReassertions||0)+1;
  if((state.nativeModelVisible&&state.nativeModelRoot)||(state.graftonModelVisible&&state.graftonModelRoot)||(state.cannonModelVisible&&state.cannonModelRoot))ensureRobertGaskinMapLayer(state);
  maybeAutoMaterializeRobertGaskin(state);
  maybeAutoMaterializeHmsGrafton(state);
  maybeAutoMaterializeCannon(state);
  setStatus(state,'Shipwrecks ON · all six icons remain visible through zoom, angle and style changes. Select a wreck for its card and native 3D scan.');
  refreshStatusUi(state);
 };
 state.handleStyleLoad=state.handlePersistentVisibility;
 state.map.on('click',state.handleClick);
 for(const event of ['style.load','load','idle','moveend','zoomend','rotateend','pitchend'])
  state.map.on(event,state.handlePersistentVisibility);
}
function addControlGroup(state){
 const dock=document.getElementById('bpv-dock-actions');if(!dock)return false;
 if(document.getElementById(CONTROL_ID))return true;
 const group=document.createElement('section');group.id=CONTROL_ID;group.className='bpv-command-group';
 group.setAttribute('data-bpv-command-section','shipwrecks');
 group.setAttribute('aria-label','Shipwrecks');
 group.innerHTML=
  '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">🚢</span><span><b>SHIPWRECKS</b><small>Titanic + three native underwater photogrammetry scans</small></span></div>'+
  '<div class="bpv-command-grid"><button id="'+TOGGLE_ID+'" data-bpv-action="shipwrecks" type="button" class="bpv-command-btn" aria-pressed="false" title="Show or hide mapped shipwreck markers"><span class="bpv-command-icon" aria-hidden="true">🚢</span><span class="bpv-command-label">Shipwrecks</span></button></div>'+
  '<div id="'+COUNT_ID+'" class="bpv-data-note">6 persistent wreck icons · '+state.stats.models+' Titanic viewer references · 3 native seabed GLBs</div>'+
  '<div id="'+STATUS_ID+'" class="bpv-data-note">Layer off · the rest of the BridgePoint globe remains unchanged.</div>'+
  '<style id="bp-shipwrecks-titanic-style-v2">'+
  '#'+CONTROL_ID+' .bpv-data-note{font:600 10px/1.45 system-ui,sans-serif;color:#9bb7c6;margin:5px 2px;overflow-wrap:anywhere}'+
  '#'+TOGGLE_ID+'.is-active{border-color:rgba(235,192,112,.88);background:rgba(102,71,28,.52);box-shadow:inset 0 0 0 1px rgba(255,226,165,.2)}'+
  '.bp-shipwreck-titanic-popup-wrap-v1 .maplibregl-popup-content{background:#06131f;color:#e8f5fb;border:1px solid rgba(231,187,103,.55);border-radius:13px;padding:12px;font:12px/1.45 system-ui,sans-serif;max-height:min(80vh,780px);overflow:auto;width:min(410px,calc(100vw - 54px))}'+
  '.bp-shipwreck-titanic-popup-wrap-v1 .maplibregl-popup-tip{border-top-color:#06131f;border-bottom-color:#06131f}'+
  '.bp-shipwreck-kicker-v1{font-size:9px;letter-spacing:.13em;font-weight:900;color:#f0c878}.bp-shipwreck-titanic-popup-v1 h3{font-size:18px;color:#fff;margin:4px 0 2px}.bp-shipwreck-part-v1{font-size:12px;font-weight:800;color:#d9c49b;margin-bottom:8px}'+
  '.bp-shipwreck-facts-v1{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:7px 0 10px}.bp-shipwreck-facts-v1 span{display:grid;gap:2px;padding:7px;border:1px solid rgba(170,197,207,.18);border-radius:7px;color:#e4eff4;font-size:10px}.bp-shipwreck-facts-v1 b{font-size:9px;color:#9eb7c5;text-transform:uppercase;letter-spacing:.08em}'+
  '.bp-shipwreck-viewer-v1{width:100%;aspect-ratio:4/3;min-height:205px;background:#02070d;border-radius:9px;overflow:hidden;margin:9px 0;border:1px solid rgba(226,186,109,.28)}.bp-shipwreck-viewer-v1 iframe{width:100%;height:100%;border:0;display:block}.bp-shipwreck-viewer-empty-v1{display:grid;place-items:center;min-height:205px;padding:20px;text-align:center;color:#aec3cd;font-size:12px;background:radial-gradient(ellipse at center,rgba(28,67,83,.42),rgba(2,7,13,.96))}'+
  '.bp-shipwreck-model-meta-v1{display:grid;gap:4px;color:#b9d0d8;font-size:11px}.bp-shipwreck-model-meta-v1>b{font-size:13px;color:#fff}.bp-shipwreck-model-meta-v1 p{margin:4px 0;color:#adc3cc}.bp-shipwreck-model-meta-v1 a,.bp-shipwreck-official-v1 a{color:#f1cf88;text-decoration:underline}'+
  '.bp-shipwreck-model-choices-v1{display:grid;gap:5px;margin:10px 0}.bp-shipwreck-model-choice-v1{display:grid;gap:2px;text-align:left;border:1px solid rgba(157,187,199,.24);background:rgba(14,36,47,.8);color:#eafaff;border-radius:8px;padding:7px 9px;font:600 11px/1.35 system-ui,sans-serif}.bp-shipwreck-model-choice-v1 small{font-size:9px;color:#9cbac5}.bp-shipwreck-model-choice-v1.is-active{border-color:#e3b76a;background:rgba(82,60,28,.48)}'+
  '.bp-shipwreck-official-v1{display:grid;gap:5px;border-top:1px solid rgba(154,205,212,.16);padding-top:8px;margin-top:8px;font-size:10px}.bp-shipwreck-official-v1>b{color:#dceaf0}.bp-shipwreck-accuracy-v1,.bp-shipwreck-source-v1{color:#a9c2cb;margin:8px 0;font-size:10px}.bp-shipwreck-source-v1{border-top:1px solid rgba(154,205,212,.16);padding-top:8px}'+
  '@media(max-width:480px){.bp-shipwreck-titanic-popup-wrap-v1 .maplibregl-popup-content{width:min(345px,calc(100vw - 44px));padding:10px}.bp-shipwreck-viewer-v1{min-height:175px}.bp-shipwreck-facts-v1{grid-template-columns:1fr 1fr}}'+
  '</style>';
 const wells=document.getElementById('bp-subsurface-wells-control-v1');
 if(wells&&wells.parentNode===dock)wells.after(group);else dock.appendChild(group);
 group.querySelector('#'+TOGGLE_ID).addEventListener('click',()=>{void setEnabled(state,!state.enabled);});
 refreshStatusUi(state);return true;
}
async function setEnabled(state,on){
 state.enabled=!!on;
 if(state.enabled){
  if(!installLayers(state))setStatus(state,'Shipwrecks ON · waiting for the map style before showing all six wreck icons.');
  else setStatus(state,'Shipwrecks ON · all six wreck icons remain visible from global zoom through close zoom. Select a marker for its card and any native underwater scan.');
  if(state.nativeModelRoot){
   state.nativeModelVisible=true;
   if(!state.map.getLayer(NATIVE_MODEL_LAYER_ID))ensureRobertGaskinMapLayer(state);
  }else{
   maybeAutoMaterializeRobertGaskin(state);
  }
  if(state.graftonModelRoot){
   state.graftonModelVisible=true;
   if(!state.map.getLayer(NATIVE_MODEL_LAYER_ID))ensureRobertGaskinMapLayer(state);
  }else{
   maybeAutoMaterializeHmsGrafton(state);
  }
  if(state.cannonModelRoot){
   state.cannonModelVisible=true;
   if(!state.map.getLayer(NATIVE_MODEL_LAYER_ID))ensureRobertGaskinMapLayer(state);
  }else{
   maybeAutoMaterializeCannon(state);
  }
 }else{
  if(state.popup){state.popup.remove();state.popup=null;}
  state.nativeModelVisible=false;state.nativeModelAutoAttempted=false;if(state.nativeModelRoot)state.nativeModelRoot.visible=false;
  state.graftonModelVisible=false;state.graftonModelAutoAttempted=false;if(state.graftonModelRoot)state.graftonModelRoot.visible=false;
  state.cannonModelVisible=false;state.cannonModelAutoAttempted=false;if(state.cannonModelRoot)state.cannonModelRoot.visible=false;
  setVisibility(state,false);setStatus(state,'Shipwrecks off · all six wreck icons and all three native meshes are hidden; other BridgePoint layers are unchanged.');
 }
 refreshStatusUi(state);state.map.triggerRepaint?.();return state.enabled;
}
export function initShipwrecksRenderer(target){
 const map=target&&(target.map||target);
 if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
 const existing=MAP_STATES.get(map);if(existing)return existing.api;
 const state={map,enabled:false,popup:null,interactionsBound:false,status:'off',destroyed:false,
  nativeModelVisible:false,nativeModelAutoAttempted:false,nativeModelStatus:'Native scan not loaded.',nativeModelRoot:null,nativeModelPromise:null,
  graftonModelVisible:false,graftonModelAutoAttempted:false,graftonModelStatus:'Native scan not loaded.',graftonModelRoot:null,graftonModelPromise:null,graftonModelBounds:null,
  cannonModelVisible:false,cannonModelAutoAttempted:false,cannonModelStatus:'Native scan not loaded.',cannonModelRoot:null,cannonModelPromise:null,cannonModelBounds:null,
  nativeModelRenderer:null,nativeModelCamera:null,nativeModelScene:null,nativeModelLayerReady:false,nativeModelBounds:null,
  stats:{version:VERSION,parts:6,sites:4,models:TITANIC_3D_MODELS.length,nativeModels:3,lastError:null}};
 const api={
  version:VERSION,get enabled(){return state.enabled;},get status(){return state.status;},
  get stats(){return Object.assign({},state.stats);},get partCount(){return state.stats.parts;},get modelCount(){return state.stats.models;},
  toggle(){return setEnabled(state,!state.enabled);},setEnabled(on){return setEnabled(state,on);},
  refresh(){const source=map.getSource(SOURCE_ID);if(source?.setData)source.setData({type:'FeatureCollection',features:buildAllShipwreckFeatures()});return state.stats;},
  showRobertGaskinOnRiverbed(){return showRobertGaskinOnRiverbed(state);},
  showHmsGraftonOnSeabed(){return showHmsGraftonOnSeabed(state);},
  showCannonOnSeabed(){return showCannonOnSeabed(state);},
  destroy(){
   state.destroyed=true;state.enabled=false;state.nativeModelVisible=false;state.graftonModelVisible=false;state.cannonModelVisible=false;
   if(state.popup)state.popup.remove();
   if(state.handleClick)map.off('click',state.handleClick);
   if(state.handlePersistentVisibility){
    for(const event of ['style.load','load','idle','moveend','zoomend','rotateend','pitchend'])
     map.off(event,state.handlePersistentVisibility);
   }
   if(state.observer)state.observer.disconnect();if(state.dockTimer)clearTimeout(state.dockTimer);
   if(map.getLayer(NATIVE_MODEL_LAYER_ID))map.removeLayer(NATIVE_MODEL_LAYER_ID);
   try{state.nativeModelRenderer?.dispose();}catch(_){}
   if(state.nativeModelRoot){state.nativeModelScene?.remove(state.nativeModelRoot);state.nativeModelRoot=null;}
   if(state.graftonModelRoot){state.nativeModelScene?.remove(state.graftonModelRoot);state.graftonModelRoot=null;}
   if(state.cannonModelRoot){state.nativeModelScene?.remove(state.cannonModelRoot);state.cannonModelRoot=null;}
   for(const id of [LABEL_ID,MARKER_ID,HALO_ID])if(map.getLayer(id))map.removeLayer(id);
   if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);
   try{if(map.hasImage?.(ICON_ID))map.removeImage(ICON_ID)}catch(_){}
   MAP_STATES.delete(map);
  }
 };
 state.api=api;MAP_STATES.set(map,state);window.__BP_SHIPWRECKS_V1__=api;bindInteractions(state);
 const observeDock=()=>{if(!MAP_STATES.has(map))return;if(addControlGroup(state))return;state.dockTimer=setTimeout(observeDock,500);};
 observeDock();
 if(typeof MutationObserver!=='undefined'&&document.body){
  state.observer=new MutationObserver(()=>{if(MAP_STATES.has(map)&&!document.getElementById(CONTROL_ID))addControlGroup(state);});
  state.observer.observe(document.body,{childList:true,subtree:true});
 }
 return api;
}
