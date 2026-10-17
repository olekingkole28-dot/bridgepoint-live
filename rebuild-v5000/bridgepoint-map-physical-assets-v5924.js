(()=>{
'use strict';
if(window.__BP_PHYSICAL_ASSETS_V5924__)return;
const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co',KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const EMPTY={type:'FeatureCollection',features:[]};
const LAYERS={
 roof:['bp-v5924-roof-fill','bp-v5924-roof-outline'],
 solar:['bp-v5924-solar-fill','bp-v5924-solar-outline','bp-v5924-solar-points'],
 pool:['bp-v5924-pool-fill','bp-v5924-pool-outline','bp-v5924-pool-points'],
 underground:['bp-v5924-underground-fill','bp-v5924-underground-lines','bp-v5924-underground-points']
};
const INFO={
 roof:{title:'Roof geometry / shape evidence',color:'#f3df66',note:'Source-backed outlines and roof planes. Complete pitch-correct 3D roof meshes are not available for every building.'},
 solar:{title:'Solar arrays + rooftop solar',color:'#37e6ff',note:'Cyan marks roof-linked solar features; lime marks utility-scale facility boundaries, not individual panels.'},
 pool:{title:'Pools / property water',color:'#258fff',note:'Source-mapped pool polygons; not a flood signal.'},
 underground:{title:'Below ground / tunnels',color:'#ff648f',note:'Mapped tunnels/underpasses plus eligible public subsurface records. No utility pipes are invented.'}
};
let map=null,summary=null,summaryPromise=null,requestSeq=0,viewportTimer=null,lastViewKey='',lastUpdated=null,viewportCount=0,bootAttempts=0;
const visible={roof:true,solar:true,pool:true,underground:true};
const fmt=n=>Number(n||0).toLocaleString();
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const timeLabel=v=>{try{return new Date(v).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}catch(_){return 'just now'}};
async function rpc(name,args={},timeout=10000){
 const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),timeout);
 try{const r=await fetch(SUPA+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(args),cache:'no-store',signal:ctl.signal});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||d?.hint||('HTTP '+r.status));return d}finally{clearTimeout(t)}
}
function styleUI(){
 if(document.getElementById('bp-physical-assets-style-v5924'))return;
 const css=[
 '#bp-physical-assets-v5924{margin:12px 0;padding:12px;border:1px solid rgba(95,226,255,.3);border-radius:12px;background:linear-gradient(145deg,rgba(8,28,39,.97),rgba(4,12,18,.97));color:#e8f8ff;font:12px/1.4 system-ui,sans-serif}',
 '#bp-physical-assets-v5924 .bp-pa-head{display:flex;justify-content:space-between;gap:8px;margin-bottom:8px}',
 '#bp-physical-assets-v5924 .bp-pa-title{font-weight:850;font-size:13px;letter-spacing:.05em}',
 '#bp-physical-assets-v5924 .bp-pa-sub,#bp-physical-assets-v5924 .bp-pa-foot{font-size:10px;color:#9dbac5;margin-top:3px}',
 '#bp-physical-assets-v5924 .bp-pa-badge{border:1px solid rgba(85,226,255,.35);border-radius:20px;padding:3px 7px;font-size:9px;white-space:nowrap;color:#8bf0ff}',
 '#bp-physical-assets-v5924 .bp-pa-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:10px 0}',
 '#bp-physical-assets-v5924 .bp-pa-stat{padding:7px;border:1px solid rgba(163,221,241,.12);border-radius:8px;background:rgba(255,255,255,.025);min-width:0}',
 '#bp-physical-assets-v5924 .bp-pa-stat strong{display:block;font-size:15px;line-height:1.2;color:#fff}',
 '#bp-physical-assets-v5924 .bp-pa-stat small{display:block;color:#a8c5d1;margin-top:3px}',
 '#bp-physical-assets-v5924 .bp-pa-toggle{display:flex;align-items:flex-start;gap:8px;padding:8px 3px;border-top:1px solid rgba(163,221,241,.11);cursor:pointer}',
 '#bp-physical-assets-v5924 .bp-pa-toggle input{accent-color:#4adff7;margin:3px 0 0;flex:0 0 auto}',
 '#bp-physical-assets-v5924 .bp-pa-swatch{display:inline-block;width:9px;height:9px;border-radius:3px;flex:0 0 auto;margin-top:4px}',
 '#bp-physical-assets-v5924 .bp-pa-toggle b{display:block;font-size:11px}',
 '#bp-physical-assets-v5924 .bp-pa-toggle small{display:block;color:#9fbac5;font-size:10px;margin-top:2px}',
 '#bp-physical-assets-v5924 .bp-pa-actions{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0}',
 '#bp-physical-assets-v5924 .bp-pa-btn{background:#0c2632;color:#dffaff;border:1px solid rgba(94,226,255,.35);border-radius:8px;padding:7px 9px;font:700 11px system-ui;cursor:pointer}',
 '#bp-physical-assets-v5924 .bp-pa-status{color:#8fe9fb;font-size:10px;min-height:15px}',
 '@media(max-width:420px){#bp-physical-assets-v5924{padding:9px}#bp-physical-assets-v5924 .bp-pa-stat strong{font-size:13px}}'
 ].join('');
 const s=el('style');s.id='bp-physical-assets-style-v5924';s.textContent=css;document.head.appendChild(s);
}
function mountPane(){
 return document.querySelector('#bpv-sidecar [data-bpv-pane="controls"]')||document.querySelector('[data-bpv-pane="controls"]')||document.querySelector('[data-bpv-pane="mapkey"]')||document.querySelector('#bpv-sidecar [data-bpv-pane="eye"]')||document.querySelector('[data-bpv-pane="eye"]');
}
function addControls(){
 styleUI();const pane=mountPane();if(!pane)return false;
 let box=document.getElementById('bp-physical-assets-v5924');
 if(!box){
  box=el('section');box.id='bp-physical-assets-v5924';
  const head=el('div','bp-pa-head'),left=el('div');
  left.append(el('div','bp-pa-title','BRIDGEPOINT EYE · PHYSICAL WORLD'),el('div','bp-pa-sub','Source-linked details follow the visible map as you pan and zoom.'));
  const badge=el('span','bp-pa-badge','LIVE SOURCE INDEX');badge.id='bp-pa-badge-v5924';head.append(left,badge);
  const grid=el('div','bp-pa-grid');grid.id='bp-pa-counts-v5924';
  const toggles=el('div');
  for(const key of Object.keys(INFO)){
   const row=el('label','bp-pa-toggle'),input=el('input');input.type='checkbox';input.checked=visible[key];input.dataset.bpPhysicalToggle=key;
   const sw=el('i','bp-pa-swatch');sw.style.background=INFO[key].color;
   const copy=el('span');copy.append(el('b','',INFO[key].title),el('small','',INFO[key].note));
   row.append(input,sw,copy);toggles.append(row);
   input.addEventListener('change',()=>{visible[key]=input.checked;setVisibility(key,input.checked)});
  }
  const actions=el('div','bp-pa-actions'),reload=el('button','bp-pa-btn','Refresh visible area'),all=el('button','bp-pa-btn','Show all layers');
  reload.type='button';all.type='button';reload.addEventListener('click',()=>{lastViewKey='';void loadViewport(true)});
  all.addEventListener('click',()=>{Object.keys(visible).forEach(k=>{visible[k]=true;const x=box.querySelector('[data-bp-physical-toggle="'+k+'"]');if(x)x.checked=true;setVisibility(k,true)})});
  actions.append(reload,all);
  const status=el('div','bp-pa-status','Waiting for BridgePoint globe…');status.id='bp-pa-status-v5924';
  const foot=el('p','bp-pa-foot','Counts are source records, not unique buildings. Region coverage varies. Full 3D roof meshes, individual panel detections and buried utility alignments are not fabricated without a verified source.');
  box.append(head,grid,toggles,actions,status,foot);
 }
 if(box.parentElement!==pane)pane.appendChild(box);
 return true;
}
function renderCounts(){
 const grid=document.getElementById('bp-pa-counts-v5924');if(!grid||!summary)return;
 const fields=[
 ['roof_geometry_records','Source building / roof geometry rows'],['roof_shape_truth_records','Shape-backed roof records'],
 ['roof_plane_records','Roof-plane records'],['lidar_roof_records','LiDAR-derived roof records'],
 ['solar_array_records','Rooftop solar features'],['solar_farm_records','Utility-scale solar sites'],['pool_records','Mapped pools'],
 ['tunnel_underpass_records','Tunnels / underpasses'],['public_subsurface_records','Public subsurface records']
 ];
 grid.replaceChildren();fields.forEach(([k,label])=>{const card=el('div','bp-pa-stat');card.append(el('strong','',fmt(summary[k])),el('small','',label));grid.append(card)});
 const badge=document.getElementById('bp-pa-badge-v5924');if(badge)badge.textContent='UPDATED '+timeLabel(summary.refreshed_at);
 const foot=document.querySelector('#bp-physical-assets-v5924 .bp-pa-foot');if(foot)foot.textContent='Source records, not unique buildings; roof categories overlap and regional coverage varies. '+(summary.underground_coverage_note||'Subsurface coverage is source-limited.')+' No unsourced 3D roof mesh or buried pipe is fabricated.';
}
async function refreshSummary(){
 if(summaryPromise)return summaryPromise;
 summaryPromise=(async()=>{try{const d=await rpc('bridgepoint_public_physical_map_summary_v5924',{},10000);if(!d||Number(d.version)!==5924)throw new Error('Snapshot not ready');summary=d;window.__BP_PHYSICAL_MAP_SUMMARY_V5924__=d;renderCounts();return d}catch(e){console.warn('BridgePoint physical map summary',e);setStatus('Global physical-layer counts unavailable; retrying.');return null}finally{summaryPromise=null}})();return summaryPromise;
}
function setVisibility(key,on){if(!map)return;(LAYERS[key]||[]).forEach(id=>{try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}})}
function installLayers(){
 if(!map||!map.getStyle?.())return false;
 try{
  if(!map.getSource('bpV5924PhysicalAssets'))map.addSource('bpV5924PhysicalAssets',{type:'geojson',data:EMPTY,buffer:64,maxzoom:16});
  const add=(id,layer)=>{if(!map.getLayer(id))map.addLayer(layer)};
  add('bp-v5924-roof-fill',{id:'bp-v5924-roof-fill',type:'fill',source:'bpV5924PhysicalAssets',filter:['==',['get','bp_layer'],'roof'],minzoom:10.5,paint:{
   'fill-color':['case',['==',['get','shape_truth'],true],'#f3df66',['==',['get','truth_class'],'SOURCE_ROOF_PLANE'],'#63e6ff','#aaa0ff'],
   'fill-opacity':['case',['==',['get','shape_truth'],true],0.14,0.07]
  }});
  add('bp-v5924-roof-outline',{id:'bp-v5924-roof-outline',type:'line',source:'bpV5924PhysicalAssets',filter:['==',['get','bp_layer'],'roof'],minzoom:10.5,paint:{
   'line-color':['case',['==',['get','shape_truth'],true],'#fff0a0',['==',['get','truth_class'],'SOURCE_ROOF_PLANE'],'#6deaff','#b8afff'],
   'line-width':['interpolate',['linear'],['zoom'],10.5,.6,13,1.2,16,2.3,20,3.1],'line-opacity':0.92
  }});
  add('bp-v5924-solar-fill',{id:'bp-v5924-solar-fill',type:'fill',source:'bpV5924PhysicalAssets',filter:['all',['any',['==',['get','bp_layer'],'solar'],['==',['get','bp_layer'],'solar_farm']],['==',['geometry-type'],'Polygon']],minzoom:10,paint:{'fill-color':['case',['==',['get','bp_layer'],'solar_farm'],'#b6ff6b','#37e6ff'],'fill-opacity':0.55}});
  add('bp-v5924-solar-outline',{id:'bp-v5924-solar-outline',type:'line',source:'bpV5924PhysicalAssets',filter:['any',['==',['get','bp_layer'],'solar'],['==',['get','bp_layer'],'solar_farm']],minzoom:10,paint:{'line-color':['case',['==',['get','bp_layer'],'solar_farm'],'#e2ffb9','#c4fbff'],'line-width':['interpolate',['linear'],['zoom'],10,.8,15,2,20,3],'line-opacity':0.96}});
  add('bp-v5924-solar-points',{id:'bp-v5924-solar-points',type:'circle',source:'bpV5924PhysicalAssets',filter:['all',['any',['==',['get','bp_layer'],'solar'],['==',['get','bp_layer'],'solar_farm']],['==',['geometry-type'],'Point']],minzoom:10,paint:{'circle-radius':['interpolate',['linear'],['zoom'],10,2.5,15,5,20,8],'circle-color':['case',['==',['get','bp_layer'],'solar_farm'],'#b6ff6b','#37e6ff'],'circle-stroke-color':'#e9fdff','circle-stroke-width':1.1}});
  add('bp-v5924-pool-fill',{id:'bp-v5924-pool-fill',type:'fill',source:'bpV5924PhysicalAssets',filter:['all',['==',['get','bp_layer'],'pool'],['==',['geometry-type'],'Polygon']],minzoom:10,paint:{'fill-color':'#258fff','fill-opacity':0.68}});
  add('bp-v5924-pool-outline',{id:'bp-v5924-pool-outline',type:'line',source:'bpV5924PhysicalAssets',filter:['==',['get','bp_layer'],'pool'],minzoom:10,paint:{'line-color':'#a9e5ff','line-width':['interpolate',['linear'],['zoom'],10,.8,15,2,20,3],'line-opacity':1}});
  add('bp-v5924-pool-points',{id:'bp-v5924-pool-points',type:'circle',source:'bpV5924PhysicalAssets',filter:['all',['==',['get','bp_layer'],'pool'],['==',['geometry-type'],'Point']],minzoom:10,paint:{'circle-radius':['interpolate',['linear'],['zoom'],10,3,15,5,20,8],'circle-color':'#258fff','circle-stroke-color':'#d5efff','circle-stroke-width':1.1}});
  add('bp-v5924-underground-fill',{id:'bp-v5924-underground-fill',type:'fill',source:'bpV5924PhysicalAssets',filter:['all',['==',['get','bp_layer'],'underground'],['==',['geometry-type'],'Polygon']],minzoom:8.5,paint:{'fill-color':'#ff648f','fill-opacity':0.18}});
  add('bp-v5924-underground-lines',{id:'bp-v5924-underground-lines',type:'line',source:'bpV5924PhysicalAssets',filter:['==',['get','bp_layer'],'underground'],minzoom:8.5,paint:{'line-color':'#ff648f','line-width':['interpolate',['linear'],['zoom'],8.5,1,12,1.8,17,3.5],'line-opacity':0.95,'line-dasharray':[2,1]}});
  add('bp-v5924-underground-points',{id:'bp-v5924-underground-points',type:'circle',source:'bpV5924PhysicalAssets',filter:['all',['==',['get','bp_layer'],'underground'],['==',['geometry-type'],'Point']],minzoom:8.5,paint:{'circle-radius':['interpolate',['linear'],['zoom'],8.5,2.5,15,5,20,8],'circle-color':'#ff648f','circle-stroke-color':'#ffe1e9','circle-stroke-width':1}});
  Object.keys(LAYERS).forEach(k=>setVisibility(k,visible[k]));
  window.__BP_PHYSICAL_LAYERS_V5924__={ready:true,source:'bpV5924PhysicalAssets',layers:LAYERS,updatedAt:Date.now()};
  return true;
 }catch(e){console.warn('BridgePoint physical layer setup',e);setStatus('Map layer setup retrying: '+String(e.message||e).slice(0,90));return false}
}
function setStatus(s){const n=document.getElementById('bp-pa-status-v5924');if(n)n.textContent=s}
async function loadViewport(force=false){
 if(!map||!map.getBounds||!map.isStyleLoaded?.())return null;
 const zoom=Number(map.getZoom());
 if(zoom<8.5){const src=map.getSource('bpV5924PhysicalAssets');if(src)src.setData(EMPTY);viewportCount=0;lastViewKey='lowzoom:'+zoom.toFixed(1);setStatus('Zoom in to 8.5+ to load physical features. Global source counters remain visible above.');return null}
 const b=map.getBounds(),coords=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()],key=coords.map(n=>Number(n).toFixed(4)).join(',')+'@'+zoom.toFixed(2);
 if(!force&&key===lastViewKey)return null;lastViewKey=key;
 const mySeq=++requestSeq;setStatus('Loading source-backed BridgePoint features for visible area…');
 try{
  const d=await rpc('bridgepoint_public_physical_map_viewport_v5924',{p_west:coords[0],p_south:coords[1],p_east:coords[2],p_north:coords[3],p_zoom:zoom,p_limit:350},12000);
  if(mySeq!==requestSeq||!map)return null;
  if(!d||d.type!=='FeatureCollection'||!Array.isArray(d.features))throw new Error('Invalid source geometry response');
  if(!installLayers())throw new Error('Physical map layers are not ready');const src=map.getSource('bpV5924PhysicalAssets');if(!src)throw new Error('Physical map source is not ready');src.setData({type:'FeatureCollection',features:d.features});
  viewportCount=d.features.length;lastUpdated=Date.now();const counts={};d.features.forEach(f=>{const k=f?.properties?.bp_layer||'other';counts[k]=(counts[k]||0)+1});
  window.__BP_PHYSICAL_VIEWPORT_V5924__={features:viewportCount,byLayer:counts,at:lastUpdated,bounds:coords,zoom,meta:d.bridgepoint||{}};
  setStatus('Visible source features: '+fmt(viewportCount)+' · roofs '+fmt(counts.roof||0)+' · solar '+fmt(counts.solar||0)+' · pools '+fmt(counts.pool||0)+' · below-ground '+fmt(counts.underground||0)+' · '+timeLabel(lastUpdated));
  return d;
 }catch(e){if(mySeq===requestSeq){console.warn('BridgePoint physical viewport',e);setStatus('Viewport refresh retrying automatically. Existing mapped geometry is retained.')}return null}
}
function bindMap(){
 const candidate=window.__BP_V5000_WORLD?.map||window.__BP_WORLD?.map||window.__BP_MAP__;
 if(!candidate||typeof candidate.getBounds!=='function'){if(bootAttempts++<180)setTimeout(bindMap,500);return false}
 if(map===candidate)return true;map=candidate;
 if(map.isStyleLoaded?.()){installLayers();void loadViewport(true)}else map.once('style.load',()=>{installLayers();void loadViewport(true)});
 map.on('style.load',()=>{installLayers();void loadViewport(true)});
 map.on('moveend',()=>{clearTimeout(viewportTimer);viewportTimer=setTimeout(()=>void loadViewport(false),180)});
 map.on('zoomend',()=>{clearTimeout(viewportTimer);viewportTimer=setTimeout(()=>void loadViewport(false),180)});
 map.on('idle',()=>{if(!lastUpdated)void loadViewport(false)});
 window.__BP_PHYSICAL_MAP_REFRESH_V5924__=()=>{lastViewKey='';return loadViewport(true)};
 window.__BP_PHYSICAL_MAP_LAYERS_V5924__={setVisible:(key,on)=>{if(!(key in visible))return;visible[key]=!!on;const input=document.querySelector('[data-bp-physical-toggle="'+key+'"]');if(input)input.checked=!!on;setVisibility(key,!!on)},visible};
 return true;
}
function boot(){addControls();void refreshSummary();void bindMap();if(!map&&bootAttempts<180)setTimeout(boot,500)}
window.__BP_PHYSICAL_ASSETS_V5924__={version:5924,refreshSummary,loadViewport,installLayers,summary:()=>summary,visible};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
const observer=new MutationObserver(()=>{if(!document.getElementById('bp-physical-assets-v5924'))addControls()});
if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>{addControls();void refreshSummary();void bindMap()},{once:true});
setInterval(()=>{if(!document.hidden){if(!document.getElementById('bp-physical-assets-v5924'))addControls();void refreshSummary()}},5*60*1000);
})();