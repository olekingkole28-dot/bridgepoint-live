const VERSION=5931;
const STAC_SEARCH='https://planetarycomputer.microsoft.com/api/stac/v1/search';
const DATA_API='https://planetarycomputer.microsoft.com/api/data/v1/item/';
const ROOT_ID='bp-spectral-imagery-v5931';
const STYLE_ID='bp-spectral-imagery-style-v5931';
const SOURCE_ID='bp-spectral-imagery-source-v5931';
const LAYER_ID='bp-spectral-imagery-raster-v5931';
const ATTRIBUTION='Landsat Collection 2 Level-2 · USGS/NASA · Microsoft Planetary Computer';
const COMBOS={
 natural:{label:'Natural Color · Red / Green / Blue',assets:['red','green','blue'],description:'Visible-band composite approximating natural color. Haze, clouds and acquisition date affect appearance.'},
 earth:{label:'Earth-as-Art · SWIR-2 / NIR / Red',assets:['swir22','nir08','red'],description:'Bright green/yellow vegetation; dark water channels; strong landform contrast.'},
 water:{label:'Water & Soil · SWIR-1 / NIR / Red',assets:['swir16','nir08','red'],description:'Emphasizes moisture, sediment, soil, and vegetation boundaries.'},
 vegetation:{label:'Vegetation · NIR / Red / Green',assets:['nir08','red','green'],description:'Classic infrared false color; healthy vegetation responds strongly in red.'},
 geology:{label:'Geology / Burn Scars · SWIR-2 / SWIR-1 / Red',assets:['swir22','swir16','red'],description:'Highlights mineral/soil contrasts and some burn-scar patterns. It is not an automatic damage verdict.'},
 agriculture:{label:'Agriculture · NIR / SWIR-1 / Green',assets:['nir08','swir16','green'],description:'Emphasizes vegetation vigor and moisture differences for landscape/agricultural interpretation.'}
};

const GLOBAL_BASEMAP_MODES={
 dark:{label:'Dark Intelligence (default)',background:'#040b12',water:'#0c3d56',waterOpacity:.97,landcoverOpacity:null,landuseOpacity:null,majorRoad:'#53717c',localRoad:'#45616b',roof:'#ffffff',rasterHue:0,rasterSaturation:0,rasterContrast:0,rasterOpacity:.95,usgsOpacity:.95,oamOpacity:.95},
 natural:{label:'Natural Satellite',background:'#06120f',water:'#1b5c70',waterOpacity:.42,landcoverOpacity:.09,landuseOpacity:.08,majorRoad:'#b2c9c1',localRoad:'#5d8b83',roof:'#c2b9a4',rasterHue:0,rasterSaturation:.12,rasterContrast:.12,rasterOpacity:.94,usgsOpacity:.9,oamOpacity:.96},
 earth:{label:'Earth-as-Art',background:'#15190c',water:'#68742e',waterOpacity:.36,landcoverOpacity:.06,landuseOpacity:.06,majorRoad:'#d3cc79',localRoad:'#89934b',roof:'#b2a35e',rasterHue:38,rasterSaturation:.32,rasterContrast:.16,rasterOpacity:.96,usgsOpacity:.92,oamOpacity:.97},
 water:{label:'Water & Soil',background:'#041522',water:'#087ba7',waterOpacity:.36,landcoverOpacity:.055,landuseOpacity:.045,majorRoad:'#76d0e5',localRoad:'#398ca2',roof:'#81aab8',rasterHue:148,rasterSaturation:.3,rasterContrast:.16,rasterOpacity:.96,usgsOpacity:.92,oamOpacity:.97},
 vegetation:{label:'Vegetation',background:'#061b13',water:'#14584c',waterOpacity:.38,landcoverOpacity:.075,landuseOpacity:.055,majorRoad:'#9bcbaa',localRoad:'#548b72',roof:'#91a978',rasterHue:68,rasterSaturation:.3,rasterContrast:.15,rasterOpacity:.96,usgsOpacity:.92,oamOpacity:.97},
 geology:{label:'Geology / Burn Scars',background:'#1a100e',water:'#684239',waterOpacity:.34,landcoverOpacity:.055,landuseOpacity:.05,majorRoad:'#d5a17e',localRoad:'#976952',roof:'#a57961',rasterHue:315,rasterSaturation:.34,rasterContrast:.2,rasterOpacity:.96,usgsOpacity:.92,oamOpacity:.97},
 agriculture:{label:'Agriculture',background:'#1b1608',water:'#3b6878',waterOpacity:.38,landcoverOpacity:.07,landuseOpacity:.055,majorRoad:'#d4c17e',localRoad:'#99854b',roof:'#b8a878',rasterHue:74,rasterSaturation:.28,rasterContrast:.14,rasterOpacity:.96,usgsOpacity:.92,oamOpacity:.97}
};
const BASEMAP_PAINT_PROPERTIES={
 'gta-bg':['background-color'],'gta-water':['fill-color','fill-opacity'],
 'gta-landcover':['fill-opacity'],'gta-landuse':['fill-opacity'],
 'gta-road-major':['line-color'],'gta-road-local':['line-color'],
 'gta-city-building-roof-caps':['fill-extrusion-color'],'gta-city-roofs':['fill-extrusion-color'],
 'gta-context-roofs':['fill-extrusion-color'],'gta-bp-roofs':['fill-extrusion-color'],'gta-exact-roof':['fill-extrusion-color'],
 'gta-nasa':['raster-hue-rotate','raster-saturation','raster-contrast','raster-opacity'],
 'gta-usgs':['raster-hue-rotate','raster-saturation','raster-contrast','raster-opacity'],
 'gta-oam':['raster-hue-rotate','raster-saturation','raster-contrast','raster-opacity']
};
const BASEMAP_RASTER_LAYERS=['gta-nasa','gta-usgs','gta-oam'];
const BASEMAP_STORAGE_KEY='bp-global-map-mode-v5931';
const CSS=[
'#liveMap #'+ROOT_ID+'{position:absolute;z-index:22;left:12px;top:12px;width:min(350px,calc(100% - 24px));box-sizing:border-box;color:#eaf8ff;font:12px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;pointer-events:none}',
'#liveMap #'+ROOT_ID+' *{box-sizing:border-box}',
'#liveMap #'+ROOT_ID+' button,#liveMap #'+ROOT_ID+' input,#liveMap #'+ROOT_ID+' select{font:inherit;pointer-events:auto}',
'#liveMap #'+ROOT_ID+' button{border:1px solid rgba(100,240,203,.34);border-radius:9px;background:rgba(4,22,29,.94);color:#eafff7;padding:8px 10px;min-height:34px;font-weight:850;font-size:10px;letter-spacing:.035em;cursor:pointer}',
'#liveMap #'+ROOT_ID+' button:hover{background:rgba(13,69,65,.97);border-color:#70f1ca}',
'#liveMap #'+ROOT_ID+' .bps-trigger{background:linear-gradient(130deg,rgba(4,31,39,.96),rgba(6,66,63,.95));box-shadow:0 8px 26px rgba(0,0,0,.32);font-size:11px;min-height:38px;pointer-events:auto}',
'#liveMap #'+ROOT_ID+' .bps-trigger[aria-expanded=true]{border-color:#72f4c8;box-shadow:0 0 0 2px rgba(114,244,200,.13),0 8px 26px rgba(0,0,0,.32)}',
'#liveMap #'+ROOT_ID+' .bps-panel{margin-top:8px;padding:12px;border:1px solid rgba(100,240,203,.35);border-radius:14px;background:linear-gradient(160deg,rgba(2,15,24,.96),rgba(3,34,39,.94));box-shadow:0 14px 38px rgba(0,0,0,.4);backdrop-filter:blur(13px) saturate(130%);-webkit-backdrop-filter:blur(13px) saturate(130%);pointer-events:auto}',
'#liveMap #'+ROOT_ID+' .bps-panel[hidden]{display:none!important}',
'#liveMap #'+ROOT_ID+' .bps-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}',
'#liveMap #'+ROOT_ID+' .bps-kicker{font-size:9px;letter-spacing:.15em;color:#75f0c6;font-weight:950}',
'#liveMap #'+ROOT_ID+' .bps-title{font-size:14px;font-weight:950;color:#fff;margin-top:2px}',
'#liveMap #'+ROOT_ID+' .bps-status{font-size:10px;font-weight:850;color:#a8c9d7;margin:8px 0 7px;overflow-wrap:anywhere}',
'#liveMap #'+ROOT_ID+' .bps-status[data-error=true]{color:#ffb9a7}',
'#liveMap #'+ROOT_ID+' .bps-meta{font-size:10px;line-height:1.45;color:#d6e9f0;padding:8px;border-radius:9px;background:rgba(12,52,60,.66);min-height:34px}',
'#liveMap #'+ROOT_ID+' label{display:block;margin:9px 0 4px;color:#a8cbd5;font-size:10px;font-weight:800}',
'#liveMap #'+ROOT_ID+' select{display:block;width:100%;border:1px solid rgba(133,190,202,.3);border-radius:8px;background:#08252e;color:#e9ffff;min-height:35px;padding:7px}',
'#liveMap #'+ROOT_ID+' input[type=range]{display:block;width:100%;accent-color:#65edc0;min-height:22px}',
'#liveMap #'+ROOT_ID+' .bps-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}',
'#liveMap #'+ROOT_ID+' .bps-actions button{flex:1 1 135px}',
'#liveMap #'+ROOT_ID+' .bps-note{border-top:1px solid rgba(110,195,200,.16);margin-top:9px;padding-top:8px;color:#9ab9c4;font-size:9px;line-height:1.45}',
'#liveMap #'+ROOT_ID+' .bps-close{padding:4px 8px;min-height:26px;font-size:12px}',
'@media(max-width:700px){#liveMap #'+ROOT_ID+'{left:8px;top:8px;width:min(340px,calc(100% - 16px))}#liveMap #'+ROOT_ID+' .bps-panel{padding:10px}#liveMap #'+ROOT_ID+' .bps-title{font-size:13px}}'
].join('\n');

const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function formatDate(value){
 const d=new Date(value);
 if(!Number.isFinite(d.getTime()))return 'Unknown acquisition date';
 try{return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(d)+' UTC'}catch{return d.toISOString().slice(0,10)+' UTC'}
}
function cloudCover(item){const v=Number(item?.properties?.['eo:cloud_cover']);return Number.isFinite(v)?Math.max(0,Math.min(100,v)):100}
function sceneCandidates(features){
 return (Array.isArray(features)?features:[]).filter(f=>{
  const platform=String(f?.properties?.platform||'').toLowerCase();
  const a=f?.assets||{};
  return /^landsat-[89]$/.test(platform)&&!!f.id&&!!a.red&&!!a.green&&!!a.blue&&!!a.nir08&&!!a.swir22&&!!a.swir16;
 }).sort((a,b)=>{
  const ca=cloudCover(a),cb=cloudCover(b),qa=ca<=35?0:1,qb=cb<=35?0:1;
  if(qa!==qb)return qa-qb;
  if(qa===0)return String(b.properties?.datetime||'').localeCompare(String(a.properties?.datetime||''));
  return ca-cb||String(b.properties?.datetime||'').localeCompare(String(a.properties?.datetime||''));
 });
}
function searchBounds(map){
 const b=map.getBounds(),c=map.getCenter(),z=map.getZoom();
 const halfLon=z>=13?.32:z>=10?.75:z>=8?1.5:2.8;
 const halfLat=halfLon*.65;
 const lng=((c.lng+180)%360+360)%360-180;
 const lat=Math.max(-81.5,Math.min(81.5,c.lat));
 return [
  Math.max(-180,lng-halfLon),
  Math.max(-82,Math.min(lat-halfLat,b.getSouth())),
  Math.min(180,lng+halfLon),
  Math.min(82,Math.max(lat+halfLat,b.getNorth()))
 ];
}
function comboParams(item,comboKey){
 const combo=COMBOS[comboKey]||COMBOS.earth;
 const p=new URLSearchParams();
 p.set('collection','landsat-c2-l2');
 p.set('item',item.id);
 combo.assets.forEach(a=>p.append('assets',a));
 p.set('asset_as_band','true');
 p.set('unscale','true');
 combo.assets.forEach(()=>p.append('rescale','0,0.38'));
 p.set('color_formula','gamma RGB 1.18, saturation 1.55, sigmoidal RGB 10 0.38');
 p.set('format','png');
 p.set('tile_format','png');
 return p;
}
async function fetchJson(url,signal){
 const r=await fetch(url,{headers:{Accept:'application/geo+json, application/json'},cache:'no-store',signal});
 if(!r.ok)throw new Error('Satellite service HTTP '+r.status);
 const d=await r.json().catch(()=>null);
 if(!d||typeof d!=='object')throw new Error('Satellite service returned an unreadable response');
 return d;
}
function layerBefore(map){
 const ids=['gta-bp-buildings','gta-context-buildings','gta-city-buildings','gta-exact-building','gta-bp-roofs','gta-context-building-footprints','gta-context-building-parts'];
 for(const id of ids)if(map.getLayer(id))return id;
 const layers=map.getStyle()?.layers||[];
 const first3d=layers.find(l=>l.type==='fill-extrusion');
 return first3d?.id;
}
function waitForStyle(map){
 if(map.isStyleLoaded?.())return Promise.resolve();
 return new Promise(resolve=>{
  const done=()=>{map.off('idle',done);resolve()};
  map.once('idle',done);
  setTimeout(done,8000);
 });
}
export function initSpectralImagery(target){
 const map=target?.map||target,container=map?.getContainer?.();
 if(!map||!container||typeof fetch!=='function')return null;
 if(window.__BP_SPECTRAL_IMAGERY_V5931__?.map===map)return window.__BP_SPECTRAL_IMAGERY_V5931__;
 if(container.querySelector('#'+ROOT_ID))return window.__BP_SPECTRAL_IMAGERY_V5931__||null;
 if(getComputedStyle(container).position==='static')container.style.position='relative';
 if(!document.getElementById(STYLE_ID)){const style=document.createElement('style');style.id=STYLE_ID;style.textContent=CSS.replaceAll('#liveMap',':is(#liveMap,#previewMap)');document.head.appendChild(style)}
 const root=document.createElement('div');root.id=ROOT_ID;
 root.innerHTML=
  '<button class="bps-trigger" type="button" data-toggle aria-expanded="false">🛰 FALSE-COLOR SATELLITE</button>'+
  '<section class="bps-panel" data-panel hidden aria-label="Real satellite false-color imagery">'+
  '<div class="bps-head"><div><div class="bps-kicker">BRIDGEPOINT SPECTRAL VIEW</div><div class="bps-title">Real satellite bands. No AI-drawn pixels.</div></div><button class="bps-close" type="button" data-close aria-label="Close satellite panel">×</button></div>'+
  '<div class="bps-status" data-status role="status" aria-live="polite">Color modes work globally. Zoom to a region to request source Landsat bands.</div>'+
  '<div class="bps-meta" data-meta>Source: USGS/NASA Landsat Collection 2 Level-2, served by Microsoft Planetary Computer. Target scene resolution: approximately 30 m.</div>'+
  '<label for="bp-global-map-mode-v5931">GLOBAL MAP COLOR MODE · INSTANT / ALL ZOOMS</label>'+
  '<select id="bp-global-map-mode-v5931" data-global-mode aria-label="Global map color mode"><option value="dark">Dark Intelligence · Default / Reset</option><option value="natural">Natural Satellite</option><option value="earth">Earth-as-Art</option><option value="water">Water &amp; Soil</option><option value="vegetation">Vegetation</option><option value="geology">Geology / Burn Scars</option><option value="agriculture">Agriculture</option></select>'+
  '<div class="bps-note">Mode changes apply immediately from globe to street scale. Satellite tiles appear where source coverage exists; the selected color palette remains active globally. Date-specific Landsat composites are loaded separately below.</div>'+
  '<label for="bp-spectral-combo-v5931">LANDSAT SPECTRAL COMBINATION · SOURCE DATA</label>'+
  '<select id="bp-spectral-combo-v5931" data-combo><option value="natural">Natural Color · Red / Green / Blue</option><option value="earth">Earth-as-Art · SWIR-2 / NIR / Red</option><option value="water">Water & Soil · SWIR-1 / NIR / Red</option><option value="vegetation">Vegetation · NIR / Red / Green</option><option value="geology">Geology / Burn Scars · SWIR-2 / SWIR-1 / Red</option><option value="agriculture">Agriculture · NIR / SWIR-1 / Green</option></select>'+
  '<label for="bp-spectral-opacity-v5931">IMAGERY OPACITY <span data-opacity-label>78%</span></label><input id="bp-spectral-opacity-v5931" type="range" min="20" max="100" value="78" data-opacity aria-label="Satellite imagery opacity">'+
  '<div class="bps-actions"><button type="button" data-load>FIND / REFRESH SCENE</button><button type="button" data-hide>HIDE OVERLAY</button></div>'+
  '<div class="bps-actions"><button type="button" data-png>EXPORT PNG PREVIEW</button><button type="button" data-tif>EXPORT RGB GEOTIFF</button></div>'+
  '<div class="bps-note" data-description>False color remaps non-visible wavelengths into RGB. Scene cloud cover is a scene-wide estimate, not a cloud-free guarantee for the selected location. Exports are georeferenced scene previews (up to 2048 px), not the full-resolution source COG.</div>'+
  '<div class="bps-note">Attribution: USGS / NASA Landsat Collection 2 Level-2 · Microsoft Planetary Computer. Imagery is requested from the source at view time and is not silently copied into BridgePoint storage.</div>'+
  '</section>';
 container.appendChild(root);
 const $=sel=>root.querySelector(sel),toggle=$('[data-toggle]'),panel=$('[data-panel]'),status=$('[data-status]'),meta=$('[data-meta]'),comboSel=$('[data-combo]'),modeSel=$('[data-global-mode]'),opacity=$('[data-opacity]'),opacityLabel=$('[data-opacity-label]'),description=$('[data-description]');
 let controller=null,requestId=0,loadedCombo='earth',disposed=false,scene=null,enabled=false;
 let currentBasemapMode='dark',defaultsCaptured=false,styleWaitPending=false;
 const originalPaint=new Map(),originalVisibility=new Map();
 const state={version:VERSION,map,available:true,enabled:false,loading:false,scene:null,basemapMode:'dark',source:'USGS_NASA_LANDSAT_C2_L2',attribution:ATTRIBUTION,
  setBasemapMode(mode){return applyGlobalBasemapMode(mode)},
  open(){panel.hidden=false;toggle.setAttribute('aria-expanded','true')},
  close(){panel.hidden=true;toggle.setAttribute('aria-expanded','false')},
  async load(){return loadScene()},
  hide(){hideLayer()},
  async export(format){return exportPreview(format)}
 };
 window.__BP_SPECTRAL_IMAGERY_V5931__=state;
  // The existing BridgePoint SAT button opens the real spectral controls.
  document.querySelectorAll('[data-base="satellite"]').forEach(button=>{
    if(button.dataset.bpSpectralBound==='1')return;
    button.dataset.bpSpectralBound='1';
    button.addEventListener('click',()=>setTimeout(()=>{
      state.open();
      if(!scene)setStatus('Choose a Landsat band combination, then find a source scene for this view.')
    },90));
  });
 const setStatus=(txt,error=false)=>{status.textContent=txt;status.dataset.error=error?'true':'false'};
 
 const setMeta=txt=>{meta.textContent=txt};
 function captureBasemapDefaults(){
  if(defaultsCaptured)return true;
  try{if(!map.isStyleLoaded?.())return false}catch(_){return false}
  for(const [id,props] of Object.entries(BASEMAP_PAINT_PROPERTIES)){
   if(!map.getLayer(id))continue;
   const values={};
   for(const prop of props){try{const value=map.getPaintProperty(id,prop);if(value!==undefined&&value!==null)values[prop]=value}catch(_){}}
   originalPaint.set(id,values);
  }
  for(const id of BASEMAP_RASTER_LAYERS){
   if(!map.getLayer(id))continue;
   try{originalVisibility.set(id,map.getLayoutProperty(id,'visibility')||'visible')}catch(_){originalVisibility.set(id,'visible')}
  }
  defaultsCaptured=true;
  return true;
 }
 function safeSetPaint(id,property,value){try{if(map.getLayer(id))map.setPaintProperty(id,property,value)}catch(_){}}
 function safeSetVisibility(id,value){try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',value)}catch(_){}}
 function readSavedBasemapMode(){
  try{const saved=window.localStorage?.getItem(BASEMAP_STORAGE_KEY);return Object.prototype.hasOwnProperty.call(GLOBAL_BASEMAP_MODES,saved)?saved:'dark'}catch(_){return 'dark'}
 }
 function updateBasemapZoomCoverage(){
  if(currentBasemapMode==='dark'||!map.getLayer('gta-nasa'))return;
  // Blue Marble is a global low-zoom backdrop. Avoid blurry over-zoom at street level;
  // permitted local USGS and OpenAerialMap imagery remain enabled where their tiles exist.
  safeSetVisibility('gta-nasa',map.getZoom()<=8.15?'visible':'none');
  safeSetVisibility('gta-usgs','visible');
  safeSetVisibility('gta-oam','visible');
 }
 function applyGlobalBasemapMode(rawMode,persist=true){
  const mode=Object.prototype.hasOwnProperty.call(GLOBAL_BASEMAP_MODES,rawMode)?rawMode:'dark';
  const previousMode=currentBasemapMode;
  currentBasemapMode=mode;
  state.basemapMode=mode;
  if(modeSel)modeSel.value=mode;
  if(persist){try{window.localStorage?.setItem(BASEMAP_STORAGE_KEY,mode)}catch(_){}}
  if(!captureBasemapDefaults()){
   if(!styleWaitPending){
    styleWaitPending=true;
    void waitForStyle(map).then(()=>{
     styleWaitPending=false;
     if(disposed)return;
     if(captureBasemapDefaults())applyGlobalBasemapMode(currentBasemapMode,false);
    }).catch(()=>{styleWaitPending=false});
   }
   return true;
  }
  const cfg=GLOBAL_BASEMAP_MODES[mode];
  if(mode==='dark'){
   // On initial load the baseline is already active; avoid needlessly recompiling every map layer.
   // Restore snapshots only when leaving a non-dark color mode.
   if(previousMode!=='dark'){
    for(const [id,values] of originalPaint.entries())for(const [prop,value] of Object.entries(values))safeSetPaint(id,prop,value);
    for(const [id,visibility] of originalVisibility.entries())safeSetVisibility(id,visibility);
    if(enabled||scene)hideLayer();
   }
   setStatus('DARK INTELLIGENCE ACTIVE · default BridgePoint map styling restored.');
  }else{
   safeSetPaint('gta-bg','background-color',cfg.background);
   safeSetPaint('gta-water','fill-color',cfg.water);
   safeSetPaint('gta-water','fill-opacity',cfg.waterOpacity);
   safeSetPaint('gta-landcover','fill-opacity',cfg.landcoverOpacity);
   safeSetPaint('gta-landuse','fill-opacity',cfg.landuseOpacity);
   safeSetPaint('gta-road-major','line-color',cfg.majorRoad);
   safeSetPaint('gta-road-local','line-color',cfg.localRoad);
   for(const id of ['gta-city-building-roof-caps','gta-city-roofs','gta-context-roofs','gta-bp-roofs','gta-exact-roof'])safeSetPaint(id,'fill-extrusion-color',cfg.roof);
   for(const id of BASEMAP_RASTER_LAYERS){
    safeSetPaint(id,'raster-hue-rotate',cfg.rasterHue);
    safeSetPaint(id,'raster-saturation',cfg.rasterSaturation);
    safeSetPaint(id,'raster-contrast',cfg.rasterContrast);
   }
   safeSetPaint('gta-nasa','raster-opacity',cfg.rasterOpacity);
   safeSetPaint('gta-usgs','raster-opacity',cfg.usgsOpacity);
   safeSetPaint('gta-oam','raster-opacity',cfg.oamOpacity);
   updateBasemapZoomCoverage();
   setStatus(cfg.label.toUpperCase()+' ACTIVE · global color mode changed immediately; imagery detail depends on source coverage.');
  }
  try{map.triggerRepaint?.()}catch(_){}
  return true;
 }
 modeSel?.addEventListener('change',()=>{
  const mode=modeSel.value;
  if(mode!=='dark'&&COMBOS[mode]){
   comboSel.value=mode;
   description.textContent=COMBOS[mode].description;
  }
  applyGlobalBasemapMode(mode);
 });

 toggle.addEventListener('click',()=>{if(panel.hidden)state.open();else state.close()});
 $('[data-close]').addEventListener('click',()=>state.close());
 $('[data-load]').addEventListener('click',()=>{void loadScene()});
 $('[data-hide]').addEventListener('click',()=>hideLayer());
 opacity.addEventListener('input',()=>{
  opacityLabel.textContent=opacity.value+'%';
  try{if(map.getLayer(LAYER_ID))map.setPaintProperty(LAYER_ID,'raster-opacity',Number(opacity.value)/100)}catch(_){}
 });
 comboSel.addEventListener('change',()=>{
  description.textContent=COMBOS[comboSel.value]?.description||COMBOS.earth.description;
  if(GLOBAL_BASEMAP_MODES[comboSel.value])applyGlobalBasemapMode(comboSel.value);
  if(scene&&enabled)void loadScene();
 });
 $('[data-png]').addEventListener('click',()=>void exportPreview('png'));
 $('[data-tif]').addEventListener('click',()=>void exportPreview('tif'));
 function hideLayer(){
  enabled=false;state.enabled=false;
  try{if(map.getLayer(LAYER_ID))map.setLayoutProperty(LAYER_ID,'visibility','none')}catch(_){}
  toggle.textContent='🛰 FALSE-COLOR SATELLITE';
  if(scene)setStatus('Overlay hidden · '+scene.id);
  else setStatus('Overlay is off. Find a scene for the current view.');
 }
 function clearOldLayer(){
  try{if(map.getLayer(LAYER_ID))map.removeLayer(LAYER_ID)}catch(_){}
  try{if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID)}catch(_){}
 }
 async function loadScene(){
  if(disposed)return;
  if(map.getZoom()<5.5){setStatus('Zoom in to a local region first (zoom level 6 or closer).',true);state.open();return}
  const bounds=searchBounds(map);
  if(bounds[0]>=bounds[2]||bounds[1]>=bounds[3]){setStatus('This view crosses a map seam. Pan slightly and try again.',true);return}
  if(controller)controller.abort();
  controller=new AbortController();
  const thisRequest=++requestId,signal=controller.signal;
  state.loading=true;setStatus('Searching real Landsat 8/9 scenes…');state.open();
  try{
   const q=new URLSearchParams({collections:'landsat-c2-l2',bbox:bounds.join(','),datetime:'2013-01-01T00:00:00Z/'+new Date().toISOString(),limit:'60',sortby:'-properties.datetime'});
   const search=await fetchJson(STAC_SEARCH+'?'+q.toString(),signal);
   if(thisRequest!==requestId)return;
   const options=sceneCandidates(search.features);
   if(!options.length)throw new Error('No Landsat 8/9 scene with the required spectral bands intersects this area. Try a nearby location or another date.');
   scene=options[0];loadedCombo=comboSel.value;
   const cloud=cloudCover(scene),when=formatDate(scene.properties?.datetime);
   const tileUrl=DATA_API+'tilejson.json?'+comboParams(scene,loadedCombo).toString();
   setStatus('Preparing spectral tiles…');
   const tiles=await fetchJson(tileUrl,signal);
   if(thisRequest!==requestId)return;
   if(!Array.isArray(tiles.tiles)||!tiles.tiles.length)throw new Error('The selected scene did not return a usable tile template.');
   await waitForStyle(map);
   if(thisRequest!==requestId)return;
   clearOldLayer();
   const sourceSpec={type:'raster',tiles:tiles.tiles,tileSize:Number(tiles.tileSize)||256,scheme:'xyz',minzoom:Number.isFinite(Number(tiles.minzoom))?Number(tiles.minzoom):5,maxzoom:Number.isFinite(Number(tiles.maxzoom))?Number(tiles.maxzoom):18,attribution:ATTRIBUTION};
   if(Array.isArray(scene.bbox)&&scene.bbox.length===4)sourceSpec.bounds=scene.bbox;
   map.addSource(SOURCE_ID,sourceSpec);
   const before=layerBefore(map),layer={id:LAYER_ID,type:'raster',source:SOURCE_ID,minzoom:0,paint:{'raster-opacity':Number(opacity.value)/100,'raster-fade-duration':250}};
   if(before)map.addLayer(layer,before);else map.addLayer(layer);
   enabled=true;state.enabled=true;state.scene=scene;state.combo=loadedCombo;state.tileJson=tiles;
   toggle.textContent='🛰 SATELLITE ON';toggle.setAttribute('aria-expanded','true');
   setStatus('REAL DATA LOADED · '+when);
   setMeta('Scene '+scene.id+' · '+String(scene.properties?.platform||'Landsat').toUpperCase()+' · scene cloud estimate '+(cloud>=100?'not reported':Math.round(cloud)+'%')+' · ~30 m source pixels. Rendering: '+COMBOS[loadedCombo].label+'.');
   description.textContent=COMBOS[loadedCombo].description;
   panel.hidden=false;toggle.setAttribute('aria-expanded','true');
   state.selectedAt=scene.properties?.datetime||null;
  }catch(e){
   if(e?.name==='AbortError')return;
   setStatus(e?.message||'Could not load satellite scene.',true);
  }finally{if(thisRequest===requestId)state.loading=false}
 }
 async function exportPreview(format){
  if(!scene){setStatus('Load a scene first, then export its preview.',true);return}
  if(!['png','tif'].includes(format))return;
  setStatus('Preparing '+format.toUpperCase()+' preview export…');
  const params=comboParams(scene,comboSel.value);
  params.delete('tile_format');
  params.set('max_size','2048');params.set('width','2048');params.set('height','2048');
  params.set('format',format==='png'?'png':'tif');
  const path=DATA_API+'preview.'+(format==='png'?'png':'tif')+'?'+params.toString();
  try{
   const res=await fetch(path,{cache:'no-store'});
   if(!res.ok)throw new Error('Export service HTTP '+res.status);
   const blob=await res.blob();
   if(!blob.size)throw new Error('Export was empty');
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='BridgePoint-'+scene.id+'-'+comboSel.value+'.'+(format==='png'?'png':'tif');
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   setStatus(format.toUpperCase()+' preview exported · '+Math.round(blob.size/1024)+' KB');
  }catch(e){setStatus((e?.message||'Export failed')+' · imagery display can still work without export.',true)}
 }
 const moveHandler=()=>{if(enabled&&scene){const text='Scene stays fixed while you pan. Refresh to fetch imagery for the new view.';setMeta(text+' '+scene.id+' · '+formatDate(scene.properties?.datetime));}};
 map.on('moveend',moveHandler);
 map.on('zoom',updateBasemapZoomCoverage);
 state.destroy=()=>{disposed=true;if(controller)controller.abort();map.off('moveend',moveHandler);map.off('zoom',updateBasemapZoomCoverage);clearOldLayer();root.remove();state.available=false};
 setStatus('Ready · choose a global color mode or load real Landsat source bands.');
 applyGlobalBasemapMode(readSavedBasemapMode(),false);
 return state;
}
