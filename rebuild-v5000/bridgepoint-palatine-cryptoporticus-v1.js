/* BridgePoint Palatine Hill — photo-derived Neronian Cryptoporticus scan.
 * The source is a creator-hosted 68.5 MB Gaussian-splat scene reconstructed from 568 photographs.
 * The marker is an approximate site/entrance reference only; the published scan origin and depth
 * are not georeferenced, so this module deliberately does not claim a terrain-registered mesh.
 */
const VERSION=1, STATES=new WeakMap();
const SOURCE_ID='bp-palatine-crypto-source-v1';
const HALO_ID='bp-palatine-crypto-halo-v1';
const MARKER_ID='bp-palatine-crypto-marker-v1';
const LABEL_ID='bp-palatine-crypto-label-v1';
const IMAGE_ID='bp-palatine-crypto-icon-v1';
const BUTTON_ID='bp-paris-catacombs-toggle-v3';
const CONTROL_ID='bp-paris-catacombs-control-v3';
const NOTE_ID='bp-palatine-crypto-note-v1';
const VIEWER_ID='bp-palatine-crypto-viewer-v1';
export const PALATINE_CRYPTO_SCAN_V1={
 uid:'palatine-neronian-cryptoporticus',
 title:'Palatine Neronian Cryptoporticus — Photogrammetry Scan',
 site:'Neronian Cryptoporticus, near the House of Livia, Palatine Hill, Rome, Italy',
 coordinates:[12.48718,41.89005],
 coordinateOrder:'longitude, latitude',
 locationPrecision:'Approximate site/entrance reference near the House of Livia. The creator has not published the captured segment origin, surveyed control points, or underground depth.',
 creator:'artfletch',
 license:'CC BY 4.0',
 captureMethod:'568 Sony a7R V photographs processed with RealityScan',
 publishedTriangles:1845375,
 publishedVertices:936915,
 splatCountApprox:5000000,
 splatPackageSize:'68.5 MB',
 sourceUrl:'https://sketchfab.com/3d-models/palatine-neronian-cryptoporticus-tunnel-827278527982425799ddbc0ec6bcc81d',
 viewerUrl:'https://superspl.at/scene/096380c2',
 sketchfabEmbedUrl:'https://sketchfab.com/models/827278527982425799ddbc0ec6bcc81d/embed?autostart=1&preload=1&ui_theme=dark',
 detail:'A photo-derived 3D scan of one separate section of the ancient underground cryptoporticus tunnel, near the House of Livia. This is a scan segment, not a complete scan of the entire 130 m corridor.'
};
function iconImage(){
 const c=document.createElement('canvas');c.width=88;c.height=88;
 const x=c.getContext('2d');
 const g=x.createRadialGradient(24,18,2,44,44,44);
 g.addColorStop(0,'#faffff');g.addColorStop(.25,'#b0f0ec');g.addColorStop(1,'#17645f');
 x.fillStyle='rgba(2,13,20,.96)';x.beginPath();x.arc(44,44,40,0,Math.PI*2);x.fill();
 x.strokeStyle='#b9fff0';x.lineWidth=3;x.stroke();
 x.fillStyle=g;x.strokeStyle='#f4fffc';x.lineWidth=2.5;
 x.beginPath();x.moveTo(17,67);x.lineTo(17,43);x.quadraticCurveTo(44,5,71,43);x.lineTo(71,67);x.closePath();x.fill();x.stroke();
 x.fillStyle='#061a20';x.beginPath();x.moveTo(29,67);x.lineTo(29,45);x.quadraticCurveTo(44,25,59,45);x.lineTo(59,67);x.closePath();x.fill();
 x.strokeStyle='#f4fffc';x.lineWidth=2;x.beginPath();x.moveTo(44,34);x.lineTo(44,58);x.moveTo(37,42);x.lineTo(51,42);x.stroke();
 return x.getImageData(0,0,88,88);
}
function desiredVisibility(state){return state.enabled?'visible':'none';}
function setLayerVisibility(state){
 const map=state.map,wanted=desiredVisibility(state);
 for(const id of [HALO_ID,MARKER_ID,LABEL_ID]){
  if(map.getLayer(id)&&map.getLayoutProperty(id,'visibility')!==wanted)
   map.setLayoutProperty(id,'visibility',wanted);
 }
}
function installLayers(state){
 const map=state.map;
 if(!map?.getStyle?.())return false;
 if(typeof map.isStyleLoaded==='function'&&!map.isStyleLoaded())return false;
 try{
  if(!map.hasImage?.(IMAGE_ID))map.addImage(IMAGE_ID,iconImage(),{pixelRatio:2});
  if(!map.getSource(SOURCE_ID)){
   map.addSource(SOURCE_ID,{type:'geojson',data:{type:'FeatureCollection',features:[{
    type:'Feature',id:PALATINE_CRYPTO_SCAN_V1.uid,
    geometry:{type:'Point',coordinates:PALATINE_CRYPTO_SCAN_V1.coordinates},
    properties:{name:'Neronian Cryptoporticus',label:'Neronian Cryptoporticus · Photo Scan',iconImage:IMAGE_ID}
   }]},buffer:64,maxzoom:14,attribution:'Neronian Cryptoporticus photogrammetry by artfletch, CC BY 4.0'});
  }
  const add=(id,layer)=>{if(!map.getLayer(id))map.addLayer(layer);};
  add(HALO_ID,{id:HALO_ID,type:'circle',source:SOURCE_ID,minzoom:0,maxzoom:24,
   layout:{visibility:desiredVisibility(state)},
   paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,3,5,5,10,8,16,12,22,15],
    'circle-color':'#83e8dc','circle-opacity':.42,'circle-blur':.42}});
  add(MARKER_ID,{id:MARKER_ID,type:'symbol',source:SOURCE_ID,minzoom:0,maxzoom:24,
   layout:{visibility:desiredVisibility(state),'icon-image':['get','iconImage'],
    'icon-size':['interpolate',['linear'],['zoom'],0,.32,3,.45,7,.6,12,.76,18,.88,23,.96],
    'icon-anchor':'bottom','icon-allow-overlap':true,'icon-ignore-placement':true,'symbol-sort-key':120}});
  add(LABEL_ID,{id:LABEL_ID,type:'symbol',source:SOURCE_ID,minzoom:5,maxzoom:24,
   layout:{visibility:desiredVisibility(state),'text-field':['get','label'],
    'text-size':['interpolate',['linear'],['zoom'],5,8,10,10,17,12],
    'text-offset':[0,1.3],'text-anchor':'top','text-allow-overlap':true,'text-ignore-placement':true},
   paint:{'text-color':'#eafffb','text-halo-color':'rgba(3,12,20,.96)','text-halo-width':1.5}});
  setLayerVisibility(state);
  return true;
 }catch(error){state.lastError=String(error?.message||error);console.warn('BridgePoint Palatine photogrammetry layer unavailable',error);return false;}
}
function addCardNote(){
 const group=document.getElementById(CONTROL_ID);
 if(!group||document.getElementById(NOTE_ID))return;
 const note=document.createElement('div');note.id=NOTE_ID;note.className='bpv-data-note';
 note.textContent='Rome, Italy · 568-photo photogrammetry · 68.5 MB creator-hosted Gaussian splat';
 note.style.cssText='font:600 10px/1.45 system-ui,sans-serif;color:#9bb7c6;margin:5px 2px;overflow-wrap:anywhere';
 const status=group.querySelector('#bp-paris-catacombs-status-v3');
 if(status&&status.parentNode===group)status.after(note);else group.appendChild(note);
}
function closeViewer(state){
 const viewer=state.viewer;if(!viewer)return;
 document.removeEventListener('keydown',viewer.keyHandler);
 viewer.el?.remove();
 document.body.style.overflow=viewer.previousOverflow||'';
 state.viewer=null;
}
function openViewer(state){
 closeViewer(state);
 const scan=PALATINE_CRYPTO_SCAN_V1;
 const el=document.createElement('section');el.id=VIEWER_ID;
 el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
 el.setAttribute('aria-label',scan.title);
 el.innerHTML=
  '<header class="bp-pal-crypto-head"><div><b>BRIDGEPOINT · 3D UNDERGROUND</b><strong>'+scan.title+'</strong><small>Palatine Hill · Rome, Italy</small></div><button type="button" data-close aria-label="Close 3D scan">Close ✕</button></header>'+
  '<iframe class="bp-pal-crypto-frame" title="Neronian Cryptoporticus 568-photo photogrammetry Gaussian splat" src="'+scan.viewerUrl+'" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe>'+
  '<footer class="bp-pal-crypto-foot"><span>568 photographs · RealityScan · approx. 5 million Gaussian splats · 68.5 MB · CC BY 4.0 · artfletch</span><span><a href="'+scan.sourceUrl+'" target="_blank" rel="noopener noreferrer">Original photogrammetry model</a> · <a href="'+scan.viewerUrl+'" target="_blank" rel="noopener noreferrer">Open SuperSplat viewer</a></span><small>Creator-hosted interactive scan. The map pin is an approximate site reference; the scan segment is not GPS/depth registered for below-terrain placement.</small></footer>';
 let style=document.getElementById('bp-pal-crypto-style-v1');
 if(!style){
  style=document.createElement('style');style.id='bp-pal-crypto-style-v1';
  style.textContent=[
   '#'+VIEWER_ID+'{position:fixed;inset:0;z-index:2147483001;background:#06131b;color:#eaf8f5;display:flex;flex-direction:column;font:500 13px/1.45 system-ui,sans-serif}',
   '#'+VIEWER_ID+' .bp-pal-crypto-head{display:flex;align-items:center;gap:14px;padding:11px 14px;background:rgba(3,12,18,.96);border-bottom:1px solid rgba(139,225,211,.2)}',
   '#'+VIEWER_ID+' .bp-pal-crypto-head>div{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}',
   '#'+VIEWER_ID+' .bp-pal-crypto-head b{font-size:10px;letter-spacing:.13em;color:#9ee8dc}',
   '#'+VIEWER_ID+' .bp-pal-crypto-head strong{font-size:14px;white-space:normal}',
   '#'+VIEWER_ID+' .bp-pal-crypto-head small{color:#9ab8bd}',
   '#'+VIEWER_ID+' button{border:1px solid rgba(159,231,219,.46);border-radius:9px;background:#12343b;color:#f3fffc;padding:9px 13px;font:700 12px system-ui;cursor:pointer}',
   '#'+VIEWER_ID+' .bp-pal-crypto-frame{display:block;flex:1;min-height:0;width:100%;height:100%;border:0;background:#02070d}',
   '#'+VIEWER_ID+' .bp-pal-crypto-foot{display:flex;flex-direction:column;gap:4px;padding:9px 13px;background:rgba(3,12,18,.96);border-top:1px solid rgba(139,225,211,.2);font-size:11px;color:#b5cdd0}',
   '#'+VIEWER_ID+' .bp-pal-crypto-foot small{font-size:10px;color:#8faeb3}',
   '#'+VIEWER_ID+' a{color:#9ce9de}'
  ].join('\n');
  document.head.appendChild(style);
 }
 const previousOverflow=document.body.style.overflow;
 document.body.style.overflow='hidden';
 document.body.appendChild(el);
 el.querySelector('[data-close]')?.addEventListener('click',()=>closeViewer(state));
 const keyHandler=e=>{if(e.key==='Escape')closeViewer(state);};
 document.addEventListener('keydown',keyHandler);
 state.viewer={el,keyHandler,previousOverflow};
}
function syncToggle(state){
 const button=document.getElementById(BUTTON_ID);
 if(button!==state.button){
  state.buttonObserver?.disconnect?.();state.button=button||null;
  if(button&&typeof MutationObserver!=='undefined'){
   state.buttonObserver=new MutationObserver(()=>syncFromButton(state));
   state.buttonObserver.observe(button,{attributes:true,attributeFilter:['aria-pressed']});
  }else state.buttonObserver=null;
 }
 syncFromButton(state);
 addCardNote();
}
function syncFromButton(state){
 const button=state.button||document.getElementById(BUTTON_ID);
 const enabled=!!button&&button.getAttribute('aria-pressed')==='true';
 if(enabled===state.enabled){if(enabled)installLayers(state);setLayerVisibility(state);return;}
 state.enabled=enabled;
 if(state.enabled){
  window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('subsurface',true);
  if(installLayers(state))state.status='Palatine photo scan marker ON';
 }else{
  closeViewer(state);state.status='Palatine photo scan marker OFF';
 }
 setLayerVisibility(state);state.map.triggerRepaint?.();
}
export function initPalatineCryptoporticusRenderer(target){
 const map=target&&(target.map||target);
 if(!map||typeof map.queryRenderedFeatures!=='function'||typeof map.addSource!=='function')return null;
 const prior=STATES.get(map);if(prior)return prior.api;
 const state={map,enabled:false,dead:false,viewer:null,button:null,buttonObserver:null,
  bodyObserver:null,lastError:null,status:'off'};
 state.handleClick=e=>{
  if(!state.enabled)return;
  const hits=map.queryRenderedFeatures?.(e.point,{layers:[MARKER_ID]})||[];
  if(!hits.some(f=>f.properties?.name==='Neronian Cryptoporticus'))return;
  map.flyTo?.({center:PALATINE_CRYPTO_SCAN_V1.coordinates,zoom:Math.max(17.6,Number(map.getZoom?.()||0)),duration:850});
  openViewer(state);
 };
 state.handleMove=e=>{
  if(!state.enabled)return;
  const hits=map.queryRenderedFeatures?.(e.point,{layers:[MARKER_ID]})||[];
  if(map.getCanvas?.()?.style)map.getCanvas().style.cursor=hits.length?'pointer':'';
 };
 state.handleStyle=()=>{
  if(state.dead)return;
  if(state.enabled)installLayers(state);
  setLayerVisibility(state);
 };
 map.on('click',state.handleClick);map.on('mousemove',state.handleMove);
 map.on('style.load',state.handleStyle);map.on('load',state.handleStyle);
 for(const event of ['styledata','idle','moveend','zoomend','rotateend','pitchend'])map.on(event,state.handleStyle);
 state.bodyObserver=typeof MutationObserver!=='undefined'&&document.body?new MutationObserver(()=>{if(document.getElementById(BUTTON_ID)!==state.button||!document.getElementById(NOTE_ID))syncToggle(state);}):null;
 state.bodyObserver?.observe(document.body,{childList:true,subtree:true});
 state.api={version:VERSION,get enabled(){return state.enabled;},get status(){return state.status;},
  get stats(){return {version:VERSION,enabled:state.enabled,lastError:state.lastError};},
  openViewer(){openViewer(state);},closeViewer(){closeViewer(state);},
  destroy(){
   state.dead=true;closeViewer(state);state.bodyObserver?.disconnect?.();state.buttonObserver?.disconnect?.();
   map.off('click',state.handleClick);map.off('mousemove',state.handleMove);
   map.off('style.load',state.handleStyle);map.off('load',state.handleStyle);
   for(const event of ['styledata','idle','moveend','zoomend','rotateend','pitchend'])map.off(event,state.handleStyle);
   for(const id of [LABEL_ID,MARKER_ID,HALO_ID])if(map.getLayer(id))map.removeLayer(id);
   if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);
   if(map.hasImage?.(IMAGE_ID))map.removeImage(IMAGE_ID);
   document.getElementById(NOTE_ID)?.remove();STATES.delete(map);
  }
 };
 STATES.set(map,state);window.__BP_PALATINE_CRYPTO_V1__=state.api;
 syncToggle(state);
 return state.api;
}
