/* BridgePoint Caves & Underground Sites v1.
 * Additive, opt-in map layer. Map anchors carry location precision; real 3D meshes remain
 * hosted by Sketchfab. No third-party model files are downloaded, cached or redistributed.
 */
const VERSION=1, MAP_STATES=new WeakMap();
const SOURCE_ID='bp-underground-scan-sites-source-v1';
const HALO_ID='bp-underground-scan-sites-halo-v1';
const MARKER_ID='bp-underground-scan-sites-markers-v1';
const LABEL_ID='bp-underground-scan-sites-labels-v1';
const CONTROL_ID='bp-underground-scan-sites-control-v1';
const TOGGLE_ID='bp-underground-scan-sites-toggle-v1';
const COUNT_ID='bp-underground-scan-sites-count-v1';
const STATUS_ID='bp-underground-scan-sites-status-v1';
// Full-resolution Cave & Sites markers: 72px sprite at pixelRatio 2, scaled to ~58–108 CSS px.
const CAVE_ICON_SIZE=['interpolate',['linear'],['zoom'],0,1.6,3,1.8,7,2.0,12,2.2,18,2.4,23,3.0];

export const UNDERGROUND_SCAN_SITES=[
 {id:'paris-catacombs',name:'Paris Catacombs',type:'catacomb',coordinates:[2.3324,48.8336],
  locationPrecision:'Approximate district anchor. The scan creator identifies the Paris Catacombs but does not publish exact chamber coordinates.',
  locationNote:'The icon marks the Catacombs area in Paris, not the measured position of each scanned passage.',
  description:'Creator-scanned underground quarry galleries, passages and chambers in the Paris Catacombs.',
  models:[
   {uid:'39e7050d272f4aac8493497621b86f39',title:'Paris catacombs — Large gallery',creator:'Emm (@edemaistre)',license:'CC Attribution',method:'iPhone 12 Pro · Scaniverse',detail:'A scanned gallery section showing the variation in size and shape of the Paris underground quarry passages.',modelUrl:'https://sketchfab.com/3d-models/paris-catacombs-large-gallery-39e7050d272f4aac8493497621b86f39'},
   {uid:'27ae0d6041c54e2eab6638d197985842',title:'Paris catacombs — Level 1 to Level 2',creator:'Emm (@edemaistre)',license:'CC Attribution',method:'iPhone 12 Pro · 3DScannerApp',detail:'A scanned stair passage connecting two levels of the former underground quarries.',modelUrl:'https://sketchfab.com/3d-models/paris-catacombs-from-level-1-to-level-2-27ae0d6041c54e2eab6638d197985842'},
   {uid:'c63534cc8b97437bb933b8eba87ffb0d',title:'Paris catacombs — Our Lady of the Catacombs',creator:'Emm (@edemaistre)',license:'CC Attribution',method:'iPhone 12 Pro · Scaniverse',detail:'A scanned chamber containing a small chapel assembled inside the Catacombs.',modelUrl:'https://sketchfab.com/3d-models/paris-catacombs-our-lady-of-the-catacombs-c63534cc8b97437bb933b8eba87ffb0d'}
  ]},
 {id:'vrlovka-cave',name:'Vrlovka Cave',type:'cave',coordinates:[15.390412,45.636916],
  locationPrecision:'Published cave-site coordinate near the entrance. The displayed model is a high-detail interior segment, not a georegistered full-cave mesh.',
  locationNote:'The site anchor locates Špilja Vrlovka in Kamanje, Croatia; the model is a detailed cave-column cross-section.',
  description:'A high-detail GeoSLAM-derived cave scan segment showing a large stalagnate column inside Vrlovka Cave.',
  models:[
   {uid:'2bff1e25b797418caea81927f394fa9d',title:'Stalagnate within Vrlovka Cave — Highest LOD',creator:'Center for Geospatial Technologies (GAL)',license:'CC Attribution',method:'GeoSLAM mobile LiDAR survey',detail:'A highest-detail cave cross-section segment. The creator notes the complete cave is represented by a separate lower-detail model.',modelUrl:'https://sketchfab.com/3d-models/stalagnate-within-vrlovka-cave-highest-lod-2bff1e25b797418caea81927f394fa9d'}
  ]},
 {id:'hohlenstein-stadel',name:'Hohlenstein-Stadel Cave',type:'cave',coordinates:[10.1725,48.54917],
  locationPrecision:'Published archaeological cave-site coordinate. The scan is of the cave entrance, not a surveyed underground interior.',
  locationNote:'The point is the published Hohlenstein-Stadel cave location in the Swabian Jura, Germany.',
  description:'A photogrammetry scan of the real Hohlenstein-Stadel cave entrance in the Swabian Jura.',
  models:[
   {uid:'6b0765f8887a47e1b0a063a118293c83',title:'Hohlenstein-Stadel — Rocky cave entrance',creator:'Nature-témoin (@speleotv)',license:'CC Attribution',method:'27-photo photogrammetry · 3DF Zephyr',detail:'A photogrammetric record of the cave entrance below the mammoth-shaped rock.',modelUrl:'https://sketchfab.com/3d-models/rocky-cave-entrance-6b0765f8887a47e1b0a063a118293c83'}
  ]},
 {id:'treak-cliff-cavern',name:'Treak Cliff Cavern — Stalactites',type:'cave',coordinates:[-1.7972,53.3451],
  locationPrecision:'Approximate Treak Cliff Cavern entrance/site anchor near Castleton, Derbyshire. This photographic scan is an interior stalactite formation, not a surveyed georegistered cave passage.',
  locationNote:'The marker identifies Treak Cliff Cavern, not the measured underground position of this formation.',
  description:'A real image-based 3D photogrammetry scan of natural stalactites inside Treak Cliff Cavern in the Peak District, England.',
  models:[
   {uid:'a6183b4fd7364ed59518a276ad8ef8ec',title:'Treak Cliff Cavern — Natural Stalactite Formation',creator:'9of9 (@9of9)',license:'CC Attribution',method:'Phone-photo photogrammetry · RealityCapture',detail:'Textured 3D scan of natural limestone stalactites photographed during a guided cave visit. Coverage is partial, especially in low-light areas; this is not a complete cave model.',modelUrl:'https://sketchfab.com/3d-models/treak-cliff-cavern-stalactites-a6183b4fd7364ed59518a276ad8ef8ec'}
  ]},
 {id:'gruta-dos-palhares',name:'Gruta dos Palhares',type:'cave',coordinates:[-47.466659,-19.931757],
  locationPrecision:'Approximate published cave entrance/municipal park coordinate near Sacramento, Minas Gerais, Brazil; the source mesh is not certified as a survey-aligned subsurface model.',
  locationNote:'The map icon identifies Gruta dos Palhares at its public site coordinate, not a measured position for every surface in the scan.',
  description:'A textured photogrammetry 3D mesh of the real sandstone Gruta dos Palhares cave, a natural rock shelter in Sacramento, Minas Gerais, Brazil.',
  models:[
   {uid:'378b82695f934eafa01b397ba4d0ff83',title:'Gruta dos Palhares — Sandstone Cave Photogrammetry',creator:'Paulo Rodrigo Simões (@rollingdrone)',license:'CC Attribution',method:'Textured photo-based mesh · photogrammetry',detail:'Creator-published photogrammetry of the sandstone grotto and entrance hall, catalogued as Brazilian cave MG 299. The scan documents cave surfaces; its exact underground geometry and absolute dimensions are not independently validated for globe placement.',modelUrl:'https://sketchfab.com/3d-models/gruta-dos-palhares-sacramento-mg-378b82695f934eafa01b397ba4d0ff83'}
  ]},
 {id:'gruta-dos-sete-saloes',name:'Gruta dos Sete Salões',type:'cave',coordinates:[-41.377075,-19.276911],
  locationPrecision:'Approximate reported cave-site coordinates in Parque Estadual dos Sete Salões, Minas Gerais, Brazil. Public location records differ, and the photographed cave geometry is not survey-georeferenced.',
  locationNote:'The marker identifies the cave area in the state park, not a surveyed point within its underground chambers.',
  description:'A real textured, photo-reconstructed 3D scan of the quartzite Gruta dos Sete Salões in the protected Rio Doce region of Minas Gerais, Brazil.',
  models:[
   {uid:'d3a9e08821e84226876b426958691adf',title:'Gruta dos Sete Salões — Quartzite Cave Photogrammetry',creator:'Paulo Rodrigo Simões / Rolling Drone Geotecnologias (@rollingdrone)',license:'CC Attribution',method:'Photo-mesh photogrammetry · textured 3D reconstruction',detail:'An original photographic 3D record of a natural quartzite cave within Parque Estadual dos Sete Salões. The creator describes this as a cave scan; it is a partial photogrammetric record, not a complete metrically aligned underground survey. Source model: approximately 2.5 million triangles.',modelUrl:'https://sketchfab.com/3d-models/gruta-dos-sete-saloes-v1-d3a9e08821e84226876b426958691adf'}
  ]},
 {id:'jackson-blue-spring-cavern',name:'Jackson Blue Spring — Cavern and Chimney',type:'cave',coordinates:[-85.140083,30.790528],
  locationPrecision:'Florida Geological Survey site coordinate for Jackson Blue Spring vent at Merritts Mill Pond, near Marianna, Florida (30°47′25.9″ N, 85°08′24.3″ W). The scan itself is not independently survey-georeferenced.',
  locationNote:'The persistent map icon marks the documented spring vent, not the position or orientation of each submerged cave passage.',
  description:'A textured underwater 3D photogrammetry scan of the real Jackson Blue Spring cavern and descending chimney cave passage in Jackson County, Florida.',
  models:[
   {uid:'c0ecd1020c794a9a83771d7957517438',title:'Jackson Blue — Cavern and Down the Chimney',creator:'Matthew Hardman / Divers Atlas (@diversatlas)',license:'CC Attribution',method:'1,017 Insta360 photos · Agisoft Metashape photogrammetry · May 24, 2026',detail:'Detailed creator-published underwater photographic reconstruction of Jackson Blue Spring cavern and the chimney passage. Sketchfab lists approximately 6.3 million triangles. This is a photo-textured cave mesh, not a LiDAR point cloud or a georeferenced full-system cave survey. The 3D viewer is embedded within BridgePoint while the original model remains creator-hosted.',modelUrl:'https://sketchfab.com/3d-models/jackson-blue-cavern-and-down-the-chimney-c0ecd1020c794a9a83771d7957517438'}
  ]},
 {id:'ellora-caves-india',name:'Ellora Caves — Rock-Cut Cave Temples',type:'cave',coordinates:[75.17917,20.02639],
  locationPrecision:'Ministry of Culture, India, Ellora Caves UNESCO World Heritage site coordinates (20°01′35.004″ N, 75°10′45.012″ E). This is a complex-wide site anchor; individual carved caves and 3D mesh surfaces are not independently georegistered.',
  locationNote:'This icon locates the documented Ellora cave-temple complex, not a surveyed point for every chamber or the exact position of each part of this 3D scan.',
  description:'A photo-reconstructed 3D mesh of the real Ellora rock-cut cave-temple complex in Maharashtra, India, a UNESCO World Heritage Site carved into basalt cliffs.',
  models:[
   {uid:'1a5ec1e212f9451e80dc051e97164d17',title:'Ellora Caves, India — Rock-Cut Heritage Scan',creator:'Graphic solutions (@hermes3)',license:'CC Attribution',method:'Photo-based 3D reconstruction · photogrammetry · approx. 136,500 triangles',detail:'Creator-published photographic 3D reconstruction associated with the Ellora Caves archaeological site. Ellora has Buddhist, Hindu and Jain rock-cut monuments, including Cave 16 (Kailasa Temple). The model is not verified as a complete survey of all cave chambers or precisely aligned to the surrounding terrain; this is not a LiDAR point cloud.',modelUrl:'https://sketchfab.com/3d-models/ellora-caves-india-1a5ec1e212f9451e80dc051e97164d17'}
  ]},
 {id:'om-jaettestue',name:'Øm Jættestue Passage Tomb',type:'tomb',coordinates:[11.994633,55.599731],
  locationPrecision:'Published GPS coordinate for the passage tomb site.',
  locationNote:'This is a Neolithic passage tomb and burial chamber, not a natural cave.',
  description:'A photogrammetric scan of the megalithic passage grave at Øm near Lejre, Denmark.',
  models:[
   {uid:'fe5da7d5202a4bfaa6b48e0096d4c6fd',title:'Passage Grave — Øm Jættestue, Denmark',creator:'Azad Balabanian (@azadbal)',license:'CC Attribution',method:'610-image photogrammetry · RealityCapture',detail:'A scan of the passage and chamber of a Neolithic megalithic tomb.',modelUrl:'https://sketchfab.com/3d-models/passage-grave-m-jttestue-denmark-fe5da7d5202a4bfaa6b48e0096d4c6fd'}
  ]}
];

export const UNDERGROUND_SCAN_RIGHTS_HOLDS=[
 {title:'Ice cave — Lester paints the world',reason:'Displayed license: CC Attribution-NonCommercial-ShareAlike. Excluded from BridgePoint commercial display until separate permission is obtained.',sourceUrl:'https://sketchfab.com/3d-models/ice-cave-lester-paints-the-world-76c1a32650da44fea7b11315cc30a02f'},
 {title:'Tomb of San Gennaro and Mosaics',reason:'Displayed license: CC Attribution-NonCommercial. Excluded from BridgePoint commercial display until separate permission is obtained.',sourceUrl:'https://sketchfab.com/3d-models/tomb-of-san-gennaro-and-mosaics-8ed34da0eaf6434c913b3dd417652efd'},
 {title:'Carlsbad Caverns scan candidate',reason:'No individually verified openly licensed Sketchfab scan with a defensible geographic anchor was confirmed for this first release. No marker or placeholder is fabricated.'}
];

export function buildUndergroundSiteFeatures(sites=UNDERGROUND_SCAN_SITES){
 return (Array.isArray(sites)?sites:[]).filter(s=>s&&typeof s.id==='string'&&Array.isArray(s.coordinates)&&Number.isFinite(Number(s.coordinates[0]))&&Number.isFinite(Number(s.coordinates[1]))&&Math.abs(Number(s.coordinates[0]))<=180&&Math.abs(Number(s.coordinates[1]))<=85&&Array.isArray(s.models)&&s.models.length>0).map(s=>({
  type:'Feature',id:s.id,geometry:{type:'Point',coordinates:[Number(s.coordinates[0]),Number(s.coordinates[1])]},
  properties:{siteId:s.id,name:s.name,type:s.type,iconImage:'bp-underground-site-icon-'+s.type+'-v1',modelCount:s.models.length,locationPrecision:s.locationPrecision}
 }));
}
function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function embedUrl(uid){return 'https://sketchfab.com/models/'+encodeURIComponent(uid)+'/embed?autostart=1&preload=1&ui_theme=dark&dnt=1';}
function modelByUid(site,uid){return (site.models||[]).find(m=>m.uid===uid)||site.models[0]||null;}

export function undergroundSitePopupHtml(site,selectedUid=null){
 if(!site||!Array.isArray(site.models)||!site.models.length)return '';
 const selected=modelByUid(site,selectedUid);
 const choices=site.models.map(m=>'<button type="button" class="bp-underground-scan-choice-v1'+(m.uid===selected.uid?' is-active':'')+'" data-scan-uid="'+safe(m.uid)+'" aria-pressed="'+String(m.uid===selected.uid)+'"><span>'+safe(m.title)+'</span><small>'+safe(m.creator)+' · '+safe(m.license)+'</small></button>').join('');
 return '<article class="bp-underground-site-popup-v1">'+
  '<div class="bp-underground-site-kicker-v1">BRIDGEPOINT · CAVES & UNDERGROUND SITES</div><h3>'+safe(site.name)+'</h3>'+
  '<p class="bp-underground-site-description-v1">'+safe(site.description)+'</p>'+
  '<div class="bp-underground-site-viewer-v1"><iframe id="bp-underground-scan-viewer-v1" title="'+safe(selected.title)+' — interactive 3D scan by '+safe(selected.creator)+'" src="'+safe(embedUrl(selected.uid))+'" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'+
  '<div class="bp-underground-site-model-meta-v1"><b id="bp-underground-scan-title-v1">'+safe(selected.title)+'</b>'+
  '<span>Creator: <strong id="bp-underground-scan-creator-v1">'+safe(selected.creator)+'</strong></span>'+
  '<span>Displayed license: <strong id="bp-underground-scan-license-v1">'+safe(selected.license)+'</strong></span>'+
  '<span>Capture method: <strong id="bp-underground-scan-method-v1">'+safe(selected.method)+'</strong></span>'+
  '<p id="bp-underground-scan-detail-v1">'+safe(selected.detail)+'</p>'+
  '<a id="bp-underground-scan-source-v1" href="'+safe(selected.modelUrl)+'" target="_blank" rel="noopener noreferrer">Open original Sketchfab model ↗</a></div>'+
  (site.models.length>1?'<div class="bp-underground-site-choices-v1" aria-label="Other scans at this site">'+choices+'</div>':'')+
  '<p class="bp-underground-site-precision-v1"><strong>Map placement:</strong> '+safe(site.locationPrecision)+'</p>'+
  '<p class="bp-underground-site-attribution-v1">3D content is hosted by Sketchfab and remains on its creator’s model page. Creator attribution and displayed license are shown above. BridgePoint does not claim this scan is a metrically georeferenced subsurface mesh.</p></article>';
}

function makeIcon(type){
 const canvas=document.createElement('canvas');canvas.width=72;canvas.height=72;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,72,72);
 const colors=type==='tomb'?['#e0b66a','#8e6335']:type==='catacomb'?['#8fe5ed','#236c80']:['#9ce3b5','#2c7b5a'];
 const g=ctx.createRadialGradient(25,20,3,36,36,34);g.addColorStop(0,'#f4ffff');g.addColorStop(.22,colors[0]);g.addColorStop(1,colors[1]);
 ctx.fillStyle='rgba(3,13,21,.82)';ctx.beginPath();ctx.arc(36,36,32,0,Math.PI*2);ctx.fill();ctx.strokeStyle=colors[0];ctx.lineWidth=3;ctx.stroke();
 ctx.fillStyle=g;ctx.strokeStyle='#eefcff';ctx.lineWidth=2.2;
 if(type==='tomb'){
  ctx.beginPath();ctx.moveTo(15,30);ctx.lineTo(36,15);ctx.lineTo(57,30);ctx.lineTo(54,53);ctx.lineTo(18,53);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(29,53);ctx.lineTo(29,38);ctx.quadraticCurveTo(36,29,43,38);ctx.lineTo(43,53);ctx.stroke();
 }else if(type==='catacomb'){
  ctx.beginPath();ctx.moveTo(14,54);ctx.lineTo(14,34);ctx.quadraticCurveTo(36,5,58,34);ctx.lineTo(58,54);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#061a28';ctx.beginPath();ctx.moveTo(26,54);ctx.lineTo(26,36);ctx.quadraticCurveTo(36,20,46,36);ctx.lineTo(46,54);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#f0ffff';ctx.beginPath();ctx.moveTo(36,24);ctx.lineTo(36,46);ctx.moveTo(29,31);ctx.lineTo(43,31);ctx.stroke();
 }else{
  ctx.beginPath();ctx.moveTo(11,55);ctx.lineTo(11,40);ctx.lineTo(21,25);ctx.lineTo(31,32);ctx.lineTo(44,13);ctx.lineTo(61,40);ctx.lineTo(61,55);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#061a28';ctx.beginPath();ctx.moveTo(25,55);ctx.lineTo(25,42);ctx.quadraticCurveTo(36,29,47,42);ctx.lineTo(47,55);ctx.closePath();ctx.fill();
 }
 return ctx.getImageData(0,0,72,72);
}
function setStatus(state,msg){state.status=msg;const el=document.getElementById(STATUS_ID);if(el)el.textContent=msg;}
function refreshStatusUi(state){
 const count=document.getElementById(COUNT_ID);if(count)count.textContent=state.stats.models.toLocaleString()+' scan models · '+state.stats.sites.toLocaleString()+' site icons · '+state.stats.rightsHolds.toLocaleString()+' rights/source holds';
 const status=document.getElementById(STATUS_ID);if(status)status.textContent=state.status;
 const b=document.getElementById(TOGGLE_ID);if(b){b.setAttribute('aria-pressed',String(state.enabled));b.classList.toggle('is-active',state.enabled);}
}
function setVisibility(state,visible){
 const wanted=visible?'visible':'none';
 for(const id of [HALO_ID,MARKER_ID,LABEL_ID]){
  if(state.map.getLayer(id)&&state.map.getLayoutProperty(id,'visibility')!==wanted)state.map.setLayoutProperty(id,'visibility',wanted);
 }
}
// Preserve opt-in cave markers when another globe renderer updates the map style.
// One deferred check per frame maximum; no polling loop or extra network requests.
function scheduleCaveMarkerPersistence(state){
 if(state.dead||!state.enabled||state.markerFrame)return;
 const run=()=>{
  state.markerFrame=0;
  if(state.dead||!state.enabled)return;
  const map=state.map;
  if(typeof map.isStyleLoaded==='function'&&!map.isStyleLoaded())return;
  if(!map.getSource(SOURCE_ID)||!map.getLayer(MARKER_ID)||!map.hasImage?.('bp-underground-site-icon-cave-v1')){
   installLayers(state);
   return;
  }
  setVisibility(state,true);
  const size=map.getLayoutProperty(MARKER_ID,'icon-size');
  if(JSON.stringify(size)!==JSON.stringify(CAVE_ICON_SIZE))map.setLayoutProperty(MARKER_ID,'icon-size',CAVE_ICON_SIZE);
 };
 state.markerFrame=(typeof requestAnimationFrame==='function'?requestAnimationFrame:(cb=>setTimeout(cb,25)))(run);
}
function installLayers(state){
 const map=state.map;if(!map?.getStyle?.())return false;
 try{
  for(const type of ['cave','catacomb','tomb']){const id='bp-underground-site-icon-'+type+'-v1';if(!map.hasImage?.(id))map.addImage(id,makeIcon(type),{pixelRatio:2});}
  if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{type:'geojson',data:{type:'FeatureCollection',features:buildUndergroundSiteFeatures()},buffer:64,maxzoom:14,attribution:'3D scans via Sketchfab; model creators and displayed licenses are attributed in each site viewer.'});
  const add=(id,layer)=>{if(!map.getLayer(id))map.addLayer(layer);};
  add(HALO_ID,{id:HALO_ID,type:'circle',source:SOURCE_ID,minzoom:0,maxzoom:24,layout:{visibility:state.enabled?'visible':'none'},paint:{
   'circle-radius':['interpolate',['linear'],['zoom'],0,3.5,5,6,10,9,16,13,22,16],
   'circle-color':['match',['get','type'],'tomb','#d9aa58','catacomb','#58d2e2','#7bd49a'],'circle-opacity':0.35,'circle-blur':0.55}});
  add(MARKER_ID,{id:MARKER_ID,type:'symbol',source:SOURCE_ID,minzoom:0,maxzoom:24,layout:{
   visibility:state.enabled?'visible':'none','icon-image':['get','iconImage'],
   'icon-size':CAVE_ICON_SIZE,'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport',
   'icon-anchor':'bottom','icon-allow-overlap':true,'icon-ignore-placement':true,'symbol-sort-key':100}});
  add(LABEL_ID,{id:LABEL_ID,type:'symbol',source:SOURCE_ID,minzoom:4,maxzoom:24,layout:{
   visibility:state.enabled?'visible':'none','text-field':['get','name'],
   'text-size':['interpolate',['linear'],['zoom'],4,9,10,11,17,13],
   'text-offset':[0,1.28],'text-anchor':'top','text-allow-overlap':false,'text-ignore-placement':false
  },paint:{'text-color':'#eafcff','text-halo-color':'rgba(3,12,20,.94)','text-halo-width':1.4,'text-opacity':0.96}});
  setVisibility(state,state.enabled);return true;
 }catch(e){state.stats.lastError=String(e?.message||e);console.warn('BridgePoint cave and underground site layer unavailable',e);return false;}
}
function openSitePopup(state,site,lngLat){
 const Popup=window.maplibregl?.Popup;if(!Popup)return;
 if(state.popup)state.popup.remove();
 state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'430px',className:'bp-underground-site-popup-wrap-v1'})
  .setLngLat(lngLat||site.coordinates).setHTML(undergroundSitePopupHtml(site)).addTo(state.map);
 const root=state.popup.getElement?.();if(!root)return;
 for(const button of root.querySelectorAll('[data-scan-uid]'))button.addEventListener('click',()=>{
  const model=modelByUid(site,button.getAttribute('data-scan-uid'));if(!model)return;
  const viewer=root.querySelector('#bp-underground-scan-viewer-v1');
  if(viewer){viewer.src=embedUrl(model.uid);viewer.title=model.title+' — interactive 3D scan by '+model.creator;}
  const put=(selector,value)=>{const el=root.querySelector(selector);if(el)el.textContent=value;};
  put('#bp-underground-scan-title-v1',model.title);put('#bp-underground-scan-creator-v1',model.creator);
  put('#bp-underground-scan-license-v1',model.license);put('#bp-underground-scan-method-v1',model.method);put('#bp-underground-scan-detail-v1',model.detail);
  const link=root.querySelector('#bp-underground-scan-source-v1');if(link)link.href=model.modelUrl;
  for(const choice of root.querySelectorAll('[data-scan-uid]')){const active=choice.getAttribute('data-scan-uid')===model.uid;choice.classList.toggle('is-active',active);choice.setAttribute('aria-pressed',String(active));}
 });
}
function bindInteractions(state){
 if(state.interactionsBound)return;state.interactionsBound=true;
 state.handleClick=e=>{
  if(!state.enabled)return;
  const hits=state.map.queryRenderedFeatures?.(e.point,{layers:[MARKER_ID]})||[];
  const hit=hits.find(f=>f.properties?.siteId);if(!hit)return;
  const site=UNDERGROUND_SCAN_SITES.find(s=>s.id===String(hit.properties.siteId));if(site)openSitePopup(state,site,e.lngLat||site.coordinates);
 };
 state.handleStyleLoad=()=>{if(!state.enabled)return;if(installLayers(state))setStatus(state,'Layer ON · '+state.stats.sites+' site icons stay visible from global zoom through close zoom. Select an icon to open its real 3D scan.');refreshStatusUi(state);};
 state.handlePersistence=()=>scheduleCaveMarkerPersistence(state);
 state.map.on('click',state.handleClick);state.map.on('style.load',state.handleStyleLoad);state.map.on('load',state.handleStyleLoad);
 for(const event of ['styledata','idle','moveend','zoomend','pitchend'])state.map.on(event,state.handlePersistence);
}
function addControlGroup(state){
 const dock=document.getElementById('bpv-dock-actions');if(!dock)return false;
 if(document.getElementById(CONTROL_ID))return true;
 const group=document.createElement('section');group.id=CONTROL_ID;group.className='bpv-command-group';
 group.setAttribute('data-bpv-command-section','underground-scan-sites');
 group.setAttribute('aria-label','Caves, catacombs, passage tombs and underground 3D scans');
 group.innerHTML=
  '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">🕳️</span><span><b>CAVES & UNDERGROUND SITES</b><small>Real cave surveys, catacombs, crypts and subterranean heritage scans</small></span></div>'+
  '<div class="bpv-command-grid"><button id="'+TOGGLE_ID+'" type="button" class="bpv-command-btn" aria-pressed="false" title="Show or hide real cave and underground heritage 3D scan locations"><span class="bpv-command-icon" aria-hidden="true">🪨</span><span class="bpv-command-label">Caves & Sites</span></button></div>'+
  '<div id="'+COUNT_ID+'" class="bpv-data-note">'+state.stats.models+' scan models · '+state.stats.sites+' site icons · '+state.stats.rightsHolds+' rights/source holds</div>'+
  '<div id="'+STATUS_ID+'" class="bpv-data-note">Layer off · no other BridgePoint layer is changed</div>'+
  '<style id="bp-underground-scan-sites-style-v1">'+
  '#'+CONTROL_ID+' .bpv-data-note{font:600 10px/1.45 system-ui,sans-serif;color:#9bb7c6;margin:5px 2px;overflow-wrap:anywhere}'+
  '#'+TOGGLE_ID+'.is-active{border-color:rgba(113,225,190,.78);background:rgba(22,86,72,.56);box-shadow:inset 0 0 0 1px rgba(113,225,190,.22)}'+
  '.bp-underground-site-popup-wrap-v1 .maplibregl-popup-content{background:#06131f;color:#e6f6fb;border:1px solid rgba(112,219,199,.40);border-radius:13px;padding:12px;font:12px/1.45 system-ui,sans-serif;max-height:min(78vh,760px);overflow:auto;width:min(390px,calc(100vw - 54px))}'+
  '.bp-underground-site-popup-wrap-v1 .maplibregl-popup-tip{border-top-color:#06131f;border-bottom-color:#06131f}'+
  '.bp-underground-site-kicker-v1{font-size:9px;letter-spacing:.13em;font-weight:900;color:#83dfc5}.bp-underground-site-popup-v1 h3{font-size:17px;color:#fff;margin:4px 0 6px}'+
  '.bp-underground-site-description-v1,.bp-underground-site-precision-v1,.bp-underground-site-attribution-v1{color:#a9c2cb;margin:6px 0}'+
  '.bp-underground-site-viewer-v1{width:100%;aspect-ratio:4/3;min-height:190px;background:#03080d;border-radius:9px;overflow:hidden;margin:9px 0;border:1px solid rgba(120,210,205,.25)}'+
  '.bp-underground-site-viewer-v1 iframe{width:100%;height:100%;border:0;display:block}'+
  '.bp-underground-site-model-meta-v1{display:grid;gap:4px;color:#b9d0d8;font-size:11px}.bp-underground-site-model-meta-v1>b{font-size:13px;color:#fff}.bp-underground-site-model-meta-v1 strong{color:#edfaff}.bp-underground-site-model-meta-v1 p{margin:3px 0;color:#adc3cc}'+
  '.bp-underground-site-model-meta-v1 a{color:#7ee3d4;text-decoration:underline}'+
  '.bp-underground-site-choices-v1{display:grid;gap:5px;margin:10px 0}.bp-underground-scan-choice-v1{display:grid;gap:2px;text-align:left;border:1px solid rgba(135,184,196,.24);background:rgba(14,36,47,.8);color:#eafaff;border-radius:8px;padding:7px 9px;font:600 11px/1.35 system-ui,sans-serif}.bp-underground-scan-choice-v1 small{font-size:9px;color:#9cbac5}.bp-underground-scan-choice-v1.is-active{border-color:#75dbc8;background:rgba(22,82,75,.52)}'+
  '.bp-underground-site-precision-v1{border-top:1px solid rgba(154,205,212,.16);padding-top:8px;margin-top:9px}.bp-underground-site-attribution-v1{font-size:10px}'+
  '@media(max-width:480px){.bp-underground-site-popup-wrap-v1 .maplibregl-popup-content{width:min(320px,calc(100vw - 44px));padding:10px}.bp-underground-site-viewer-v1{min-height:170px}}'+
  '</style>';
 const wells=document.getElementById('bp-subsurface-wells-control-v1');
 if(wells&&wells.parentNode===dock)wells.after(group);else dock.appendChild(group);
 group.querySelector('#'+TOGGLE_ID).addEventListener('click',()=>{void setEnabled(state,!state.enabled)});
 refreshStatusUi(state);return true;
}
async function setEnabled(state,on){
 state.enabled=!!on;
 if(state.enabled){
  if(!installLayers(state))setStatus(state,'Waiting for the map style before showing cave and underground site icons…');
  else setStatus(state,'Layer ON · '+state.stats.sites+' site icons stay visible from global zoom through close zoom. Select an icon to open its real 3D scan.');
  scheduleCaveMarkerPersistence(state);
 }else{
  if(state.popup){state.popup.remove();state.popup=null;}
  setVisibility(state,false);setStatus(state,'Layer off · all existing BridgePoint layers remain unchanged.');
 }
 refreshStatusUi(state);return state.enabled;
}
export function initUndergroundScanSitesRenderer(target){
 const map=target&&(target.map||target);
 if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
 const existing=MAP_STATES.get(map);if(existing)return existing.api;
 const modelCount=UNDERGROUND_SCAN_SITES.reduce((n,s)=>n+s.models.length,0);
 const state={map,enabled:false,dead:false,popup:null,interactionsBound:false,markerFrame:0,status:'off',
  stats:{version:VERSION,sites:UNDERGROUND_SCAN_SITES.length,models:modelCount,rightsHolds:UNDERGROUND_SCAN_RIGHTS_HOLDS.length,lastError:null}};
 const api={
  version:VERSION,get enabled(){return state.enabled;},get status(){return state.status;},
  get stats(){return Object.assign({},state.stats);},get siteCount(){return state.stats.sites;},get modelCount(){return state.stats.models;},
  toggle(){return setEnabled(state,!state.enabled);},setEnabled(on){return setEnabled(state,on);},
  refresh(){const source=map.getSource(SOURCE_ID);if(source?.setData)source.setData({type:'FeatureCollection',features:buildUndergroundSiteFeatures()});return state.stats;},
  destroy(){
   state.dead=true;if(state.popup)state.popup.remove();
   if(state.handleClick)map.off('click',state.handleClick);
   if(state.handleStyleLoad){map.off('style.load',state.handleStyleLoad);map.off('load',state.handleStyleLoad);}
   if(state.handlePersistence)for(const event of ['styledata','idle','moveend','zoomend','pitchend'])map.off(event,state.handlePersistence);
   if(state.markerFrame)(typeof cancelAnimationFrame==='function'?cancelAnimationFrame:clearTimeout)(state.markerFrame);
   if(state.observer)state.observer.disconnect();if(state.dockTimer)clearTimeout(state.dockTimer);
   for(const id of [LABEL_ID,MARKER_ID,HALO_ID])if(map.getLayer(id))map.removeLayer(id);
   if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);MAP_STATES.delete(map);
  }
 };
 state.api=api;MAP_STATES.set(map,state);window.__BP_UNDERGROUND_SCAN_SITES_V1__=api;bindInteractions(state);
 const observeDock=()=>{if(state.dead)return;if(addControlGroup(state))return;state.dockTimer=setTimeout(observeDock,500);};
 observeDock();
 if(typeof MutationObserver!=='undefined'&&document.body){state.observer=new MutationObserver(()=>{if(!document.getElementById(CONTROL_ID))addControlGroup(state);});state.observer.observe(document.body,{childList:true,subtree:true});}
 return api;
}
