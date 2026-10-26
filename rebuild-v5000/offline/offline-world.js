(()=>{'use strict';
const $=id=>document.getElementById(id), API=window.BridgePointOfflineWorldV1;
const CATALOG_URL='/offline-packs/catalog.json', BASE_URL='/assets/offline/protomaps-world-z6.pmtiles';
let catalog=null,map=null,protocol=null,activeMode='none',lastInstalled=[],downloadAbort=null;
const size=n=>{if(!Number.isFinite(Number(n))||Number(n)<=0)return'Size not yet measured';const units=['B','KB','MB','GB'];let v=Number(n),i=0;while(v>=1000&&i<units.length-1){v/=1000;i++}return(v>=10?v.toFixed(0):v.toFixed(1))+' '+units[i]};
const status=t=>{if($('bpDownloadStatus'))$('bpDownloadStatus').textContent=t};
const mapStatus=t=>{if($('bpOfflineMapStatus'))$('bpOfflineMapStatus').textContent=t};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function connection(){const e=$('bpConnection');if(!e)return;e.textContent=navigator.onLine?'ONLINE · READY TO DOWNLOAD':'OFFLINE · LOCAL DATA ONLY';e.style.color=navigator.onLine?'#56e2b0':'#f3cb72'}
async function installed(){lastInstalled=await API.listPacks();return lastInstalled}
async function readBuildMeta(path){
 const cached=await API.matchResource(path);
 if(cached)return await cached.json();
 const response=await fetch(path,{cache:'no-store'});
 if(!response.ok)throw new Error('Build metadata unavailable: '+path);
 return await response.json();
}
async function updateRuntimeSizeEstimates(){
 try{
  const [z6,z7]=await Promise.all([
   readBuildMeta('/assets/offline/protomaps-world-z6.meta.json'),
   readBuildMeta('/assets/offline/protomaps-world-z7.meta.json')
  ]);
  const basemap=catalog.packages.find(p=>p.id==='global-basemap-z6-v1');
  const max=catalog.packages.find(p=>p.id==='global-max-v1');
  const basemapSupport=350000;
  const maxSupport=8300000;
  if(z6?.sizeBytes&&basemap){
   basemap.estimatedBytes=z6.sizeBytes+basemapSupport;
   basemap.sizeLabel='About '+size(basemap.estimatedBytes)+' total · archive '+size(z6.sizeBytes);
  }
  if(z7?.sizeBytes&&max){
   max.estimatedBytes=z7.sizeBytes+maxSupport;
   max.sizeLabel='About '+size(max.estimatedBytes)+' total · zoom-7 archive '+size(z7.sizeBytes);
   max.buildDate=z7.sourceDate||null;
  }
 }catch(_){/* Static estimates remain if build metadata was not installed or is not reachable. */}
}
function packageIsCovered(id,installedPacks){
 return id!=='global-max-v1'&&installedPacks.some(p=>p.id==='global-max-v1');
}
async function renderPackages(){
 const host=$('bpPackList');if(!host||!catalog)return;const packs=await installed();host.innerHTML='';
 for(const p of catalog.packages){
  const rec=packs.find(x=>x.id===p.id),covered=packageIsCovered(p.id,packs);
  const card=document.createElement('article');card.className='bp-pack-card'+(p.status==='recommended'?' recommended':'');
  const features=p.includes.map(x=>'<span>'+esc(x)+'</span>').join('');
  const sizeLabel=rec?size(rec.actualBytes||rec.estimatedBytes)+' stored':covered?'Included in Global Max':p.sizeLabel;
  let actions='';
  if(rec)actions='<span class="bp-status-pill">INSTALLED</span><button class="bp-danger-button" type="button" data-remove="'+esc(p.id)+'">REMOVE</button>';
  else if(covered)actions='<span class="bp-status-pill">ALREADY INCLUDED</span>';
  else actions='<button class="bp-primary-button" type="button" data-install="'+esc(p.id)+'" '+(!navigator.onLine?'disabled':'')+'>'+(!navigator.onLine?'NEED CONNECTION':'DOWNLOAD PACK')+'</button>';
  card.innerHTML='<h3>'+esc(p.title)+'</h3><div class="bp-pack-description">'+esc(p.description)+'</div><div class="bp-pack-meta"><span>'+esc(sizeLabel)+'</span><span class="bp-status-pill">'+(rec?'INSTALLED':p.status==='recommended'?'RECOMMENDED':'READY')+'</span></div><div class="bp-pack-features">'+features+'</div><div class="bp-pack-actions">'+actions+'</div>';
  host.appendChild(card);
 }
 host.querySelectorAll('[data-install]').forEach(b=>b.addEventListener('click',()=>void installPack(b.dataset.install)));
 host.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>void removePack(b.dataset.remove)));
 renderLayers(packs);renderAvailability();await storageStats();
}
async function installPack(id){
 if(!navigator.onLine){status('Connect before downloading a new offline package.');return}
 const p=catalog.packages.find(x=>x.id===id);if(!p)return;
 downloadAbort=new AbortController();status('Preparing '+p.title+'…');
 try{
  const mr=await fetch(p.manifestUrl,{cache:'no-store'});if(!mr.ok)throw new Error('Package manifest request failed (HTTP '+mr.status+').');
  const manifest=await mr.json();API.assertManifest(manifest);
  const rec=await API.installPack(manifest,{signal:downloadAbort.signal,onProgress:progress=>{
   if(progress.phase==='installed')return;
   const pct=progress.total?Math.round(100*progress.completed/progress.total):0;
   status('Downloading '+p.title+': '+progress.completed+'/'+progress.total+' resources ('+pct+'%). '+size(progress.actualBytes||progress.estimatedBytes)+' transferred/estimated.');
  }});
  status('Installed '+p.title+'. Actual reported resource total: '+size(rec.actualBytes||rec.estimatedBytes)+'.');
  await renderPackages();await openLocalMap();
 }catch(e){status((e.name==='AbortError'?'Download cancelled. ':'Could not install '+p.title+': ')+(e.message||e))}
 finally{downloadAbort=null}
}
async function removePack(id){
 const p=catalog.packages.find(x=>x.id===id);
 if(!confirm('Remove '+(p?.title||id)+' from this device?'))return;
 try{await API.removePack(id);status('Removed '+(p?.title||id)+'.');await renderPackages();await openLocalMap()}catch(e){status('Could not remove package: '+e.message)}
}
async function storageStats(){
 const t=$('bpStorageText'),bar=$('bpStorageFill');try{
  const s=await API.storageEstimate();
  if(s.quota==null||s.usage==null){t.textContent='This browser does not expose a reliable storage estimate. Actual limits vary by device and browser.';bar.style.width='0';return}
  bar.style.width=Math.min(100,100*s.usage/Math.max(1,s.quota))+'%';
  t.textContent=size(s.usage)+' used of '+size(s.quota)+' reported browser storage; about '+size(s.available)+' reported free. '+(s.persistent?'Persistent storage granted.':'Browser may evict site data under storage pressure.');
 }catch(e){t.textContent='Storage estimate unavailable: '+e.message}
}
function renderAvailability(){
 const host=$('bpLayerAvailability');if(!host)return;host.innerHTML='';
 for(const rowData of catalog.layerAvailability||[]){
  const labels={regional:'REGIONAL ONLY',snapshot:'DATED SNAPSHOTS',private:'LOCAL / PRIVATE',planned:'PLANNED'};
  const row=document.createElement('div');row.className='bp-availability-row';
  row.innerHTML='<div class="bp-availability-title"><span>'+esc(rowData.title)+'</span><em>'+esc(labels[rowData.status]||rowData.status.toUpperCase())+'</em></div><p>'+esc(rowData.note)+'</p>';
  host.appendChild(row);
 }
}
function groupFor(layer){
 const s=(String(layer.id||'')+' '+String(layer['source-layer']||'')).toLowerCase();
 if(/water|waterway|lake|ocean|river/.test(s))return'water';
 if(/road|transport|rail|aeroway|bridge|tunnel|highway/.test(s))return'transport';
 if(/building/.test(s))return'buildings';
 if(/place|poi|label|housenumber|shield/.test(s))return'places';
 if(/earth|landcover|landuse|park|forest|sand|rock|ice/.test(s))return'land';
 return null;
}
function toggleGroup(group,on){
 if(!map)return;let n=0;
 for(const layer of map.getStyle()?.layers||[]){
  if(groupFor(layer)===group){try{map.setLayoutProperty(layer.id,'visibility',on?'visible':'none');n++}catch(_){}}
  if(group==='borders'&&/^bp-world-lines-(110m|50m|10m)$/.test(layer.id)){try{map.setLayoutProperty(layer.id,'visibility',on?'visible':'none');n++}catch(_){}}
 }
 mapStatus(n?(on?'Enabled ':'Disabled ')+group+' layers.':'No '+group+' features are present at the installed data zoom level.');
}
function renderLayers(packs){
 const host=$('bpLayerToggles');if(!host)return;
 const hasMap=packs.some(p=>p.id==='global-basemap-z6-v1'||p.id==='global-max-v1');
 const hasBorders=packs.some(p=>p.id==='global-boundaries-v1'||p.id==='global-max-v1');
 if(!hasMap&&!hasBorders){host.innerHTML='<p class="bp-muted">No geography installed. Choose Global Borders (~7.9 MB), Global Basemap (~60–64 MB), or Global Max (~68–72 MB).</p>';return}
 const groups=[['Land / landcover','land',hasMap],['Water / waterways','water',hasMap],['Roads / rail / transport','transport',hasMap],['Buildings (only if present at these zooms)','buildings',hasMap],['Places / labels','places',hasMap],['Country boundaries','borders',hasBorders]];
 host.innerHTML=groups.map(([title,id,enabled])=>'<label class="bp-layer-toggle"><input type="checkbox" data-layer-toggle="'+id+'" '+(enabled?'checked':'')+' '+(enabled?'':'disabled')+'><span>'+esc(title)+'</span></label>').join('');
 host.querySelectorAll('[data-layer-toggle]').forEach(el=>el.addEventListener('change',()=>toggleGroup(el.dataset.layerToggle,el.checked)));
}
async function blobFromPack(url){
 const cached=await API.matchResource(url);if(!cached)throw new Error('Required resource is not stored on this device: '+url);return await cached.blob();
}
async function readTopology(name){
 const full='https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/'+name;
 const response=await API.matchResource(full);if(!response)return null;
 return API.topologyToFeatureCollection(JSON.parse(await response.text()),'countries');
}
async function addCountryBoundaryDetail(){
 const installedPacks=await installed();
 if(!installedPacks.some(p=>p.id==='global-max-v1'||p.id==='global-boundaries-v1'))return;
 const datasets=[
  ['110m', 'countries-110m.json',0,3.6],
  ['50m', 'countries-50m.json',3.6,6.8],
  ['10m', 'countries-10m.json',6.8,24]
 ];
 for(const [z,name,min,max] of datasets){
  const geo=await readTopology(name);if(!geo)continue;
  const sourceId='bp-boundaries-'+z,layerId='bp-world-lines-'+z;
  if(!map.getSource(sourceId))map.addSource(sourceId,{type:'geojson',data:geo,buffer:0,maxzoom:10});
  if(!map.getLayer(layerId))map.addLayer({id:layerId,type:'line',source:sourceId,minzoom:min,maxzoom:max,paint:{'line-color':z==='10m'?'#b7edf7':'#729caf','line-width':z==='10m'?1.05:z==='50m'?0.85:0.65,'line-opacity':0.9}});
 }
}
async function loadBasemap(){
 if(!window.maplibregl||!window.pmtiles||!window.basemaps?.layers||!window.basemaps?.namedFlavor)throw new Error('Offline rendering libraries are missing. Load Offline World while connected once, then retry.');
 try{maplibregl.removeProtocol('pmtiles')}catch(_){}
 protocol=new pmtiles.Protocol();maplibregl.addProtocol('pmtiles',protocol.tile);
 const installedPacks=await installed();
 const useMax=installedPacks.some(p=>p.id==='global-max-v1');
 const archiveUrl=useMax?'/assets/offline/protomaps-world-z7.pmtiles':BASE_URL;
 const localProtocolKey='bridgepoint-world-z6';
 const blob=await blobFromPack(archiveUrl);
 let file;try{file=new File([blob],localProtocolKey)}catch(_){file=blob;try{Object.defineProperty(file,'name',{value:localProtocolKey})}catch(_){}}
 protocol.add(new pmtiles.PMTiles(new pmtiles.FileSource(file)));
 const style={version:8,name:'BridgePoint Offline Global Basemap',
  glyphs:location.origin+'/assets/offline/fonts/{fontstack}/{range}.pbf',
  sprite:location.origin+'/assets/offline/sprites/v4/dark',
  sources:{protomaps:{type:'vector',url:'pmtiles://bridgepoint-world-z6',attribution:'© OpenStreetMap contributors · Protomaps'}},
  layers:basemaps.layers('protomaps',basemaps.namedFlavor('dark'),{lang:'en'})
 };
 await new Promise((resolve,reject)=>{
  let finished=false;const done=(err)=>{if(finished)return;finished=true;clearTimeout(timer);err?reject(err):resolve()};
  const timer=setTimeout(()=>done(new Error('Global basemap initialization timed out.')),25000);
  map.once('style.load',()=>done());
  map.setStyle(style);
 });
 await addCountryBoundaryDetail();
 activeMode=useMax?'global-max':'basemap';mapStatus(useMax?'GLOBAL MAX READY · local zoom-0–7 archive + detailed country boundaries.':'GLOBAL OFFLINE BASEMAP READY · local archive · zoom levels 0–6.');
}
async function loadBorders(){
 const geo=await readTopology('countries-110m.json');if(!geo)throw new Error('Saved border data is missing.');
 const style={version:8,name:'BridgePoint Offline Borders',sources:{'bp-country':{type:'geojson',data:geo}},
  layers:[{id:'bp-water-background',type:'background',paint:{'background-color':'#071a27'}},
   {id:'bp-world-fill',type:'fill',source:'bp-country',paint:{'fill-color':'#153243','fill-opacity':0.92}},
   {id:'bp-world-line',type:'line',source:'bp-country',paint:{'line-color':'#96d6e8','line-width':0.7}}]};
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Country map initialization timed out.')),10000);map.once('style.load',()=>{clearTimeout(timer);resolve()});map.setStyle(style)});
 await addCountryBoundaryDetail();activeMode='borders';mapStatus('GLOBAL COUNTRY BOUNDARIES READY · Natural Earth geometry stored locally.');
}
async function openLocalMap(){
 if(!map)return;
 const packs=await installed(),hasMap=packs.some(p=>p.id==='global-basemap-z6-v1'||p.id==='global-max-v1'),hasBorders=packs.some(p=>p.id==='global-boundaries-v1'||p.id==='global-max-v1');
 try{
  if(hasMap)await loadBasemap();else if(hasBorders)await loadBorders();else{
   map.setStyle({version:8,name:'Offline world not installed',sources:{},layers:[{id:'bp-empty-water',type:'background',paint:{'background-color':'#071a27'}}]});activeMode='none';mapStatus('No offline geography installed. Choose a package to begin.')
  }
  renderLayers(packs);
 }catch(e){mapStatus('Offline map could not load: '+e.message);status('Offline rendering error: '+e.message)}
}
async function start(){
 connection();window.addEventListener('online',connection);window.addEventListener('offline',connection);
 $('bpPanelCollapse').addEventListener('click',()=>{$('bpOfflinePanel').classList.add('collapsed');$('bpOfflinePanelOpen').hidden=false});
 $('bpOfflinePanelOpen').addEventListener('click',()=>{$('bpOfflinePanel').classList.remove('collapsed');$('bpOfflinePanelOpen').hidden=true});
 $('bpRefreshPacks').addEventListener('click',async()=>{await renderPackages();status('Pack list and storage refreshed.')});
 const res=await fetch(CATALOG_URL,{cache:'no-store'});if(!res.ok)throw new Error('Pack catalog request failed (HTTP '+res.status+').');catalog=await res.json();
 if(!API)throw new Error('BridgePoint offline storage engine did not load.');
 await updateRuntimeSizeEstimates();
 map=new maplibregl.Map({container:'bpOfflineMap',style:{version:8,name:'Offline World startup',sources:{},layers:[{id:'bp-empty-water',type:'background',paint:{'background-color':'#071a27'}}]},center:[0,20],zoom:1.25,minZoom:0,maxZoom:18,projection:{type:'globe'},renderWorldCopies:false,attributionControl:false,antialias:false});
 map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true}),'bottom-left');
 map.on('error',e=>{const m=e?.error?.message||'';if(/offline|pmtiles|glyph|sprite|404|range/i.test(m))mapStatus('Map resource notice: '+m)});
 map.on('load',()=>void openLocalMap());
 await renderPackages();await storageStats();
 // This page is visited before the user starts downloading. The same-origin worker
 // then preserves the page shell; geographic bytes are stored by the pack manager.
 if('serviceWorker' in navigator){try{await navigator.serviceWorker.register('/sw.js?v=6196-desktop-cloud-motion-autoupdate',{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready}catch(e){console.warn('Offline shell worker registration failed',e)}}
}
start().catch(e=>{status('Offline World could not initialize: '+e.message);mapStatus('Initialization failed. Open this page while connected, then retry.');console.error(e)});
})();