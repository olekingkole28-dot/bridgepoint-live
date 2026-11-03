(()=>{
'use strict';
if(window.__BP_VESSEL_AWARENESS_V1__)return;
const VERSION=1;
const TILEJSON_URL='https://ais.openwaters.io/v1/vessels/tiles.json';
const COVERAGE_TILEJSON_URL='https://ais.openwaters.io/v1/coverage/tiles.json';
const SOURCE='bp-vessel-live-source-v1';
const COVERAGE_SOURCE='bp-vessel-coverage-source-v1';
const STILL_LAYER='bp-vessel-live-still-v1';
const MOVING_LAYER='bp-vessel-live-moving-v1';
const COVERAGE_LAYER='bp-vessel-coverage-footprint-v1';
const TRAIL_SOURCE='bp-vessel-observed-trail-source-v1';
const TRAIL_DOT_SOURCE='bp-vessel-observed-trail-dots-source-v1';
const TRAIL_LAYER='bp-vessel-observed-trails-v1';
const TRAIL_DOT_LAYER='bp-vessel-observed-trail-points-v1';
const MODEL_LAYER='bp-vessel-3d-models-v1';
const THREE_URL='/vendor/three.module.js?v=169-local';
const REFRESH_MS=15000;
const STATUS_MS=60000;
const MAX_MODELS=12000;
const MAX_TRACKS=5000;
const MAX_TRACK_POINTS=24;
const TRACK_RETENTION_MS=45*60*1000;
const WORLD_CIRCUMFERENCE_M=40075016.686;
const WATERLINE_METERS=0;
const EMPTY=()=>({type:'FeatureCollection',features:[]});
const $=s=>document.querySelector(s);
let map=null,enabled=false,coverageEnabled=true,button=null,pane=null,statusNode=null,summaryNode=null,coverageButton=null,refreshButton=null;
let refreshTimer=0,statusTimer=0,updateQueued=false,statsAt=0,sourceReady=false;
let threePromise=null,THREE=null,renderer=null,scene=null,camera=null,customLayer=null;
let templates=new Map(),lastRecords=[],tracks=new Map(),lastSummary={features:0,fresh:0,models:0,trailPoints:0};
let mapListenersBound=false,styleListenerMap=null,sourceError='';
const colors={cargo:0x00f08b,tanker:0xff563f,passenger:0x35b9ff,fishing:0xffc247,sail:0xcb91ff,tug:0xfff052,highspeed:0x24f1de,other:0xf2f8ff};
const $el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n};
function worldMap(){return window.__BP_LANDING_WORLD__?.map||window.__bpLandingWorldV5420?.map||window.__BP_V5000_WORLD__?.map||window.__BP_V5000_WORLD?.map||window.__bpWorldV2300?.map||window.__BP_WORLD_V2300__?.map||null}
function addStyle(){
 if($('#bp-vessel-awareness-style-v1'))return;
 const style=document.createElement('style');style.id='bp-vessel-awareness-style-v1';
 style.textContent='.bp-vessel-pane{display:grid;gap:10px;color:#dff7ff}.bp-vessel-head{font-size:11px;font-weight:950;letter-spacing:.09em;color:#77eaff}.bp-vessel-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.bp-vessel-metric{border:1px solid rgba(107,218,255,.2);background:rgba(5,20,30,.8);border-radius:10px;padding:10px;min-width:0}.bp-vessel-metric b{display:block;font-size:20px;color:#70efff}.bp-vessel-metric span{display:block;font-size:9px;color:#92b8c7;line-height:1.4}.bp-vessel-status{padding:10px;border:1px solid rgba(122,221,255,.2);border-radius:10px;background:rgba(3,16,25,.9);font-size:11px;line-height:1.5;overflow-wrap:anywhere}.bp-vessel-status[data-kind="error"]{border-color:rgba(255,165,100,.5);color:#ffd8bc}.bp-vessel-status[data-kind="ok"]{border-color:rgba(105,245,185,.35)}.bp-vessel-actions{display:flex;flex-wrap:wrap;gap:7px}.bp-vessel-actions button{flex:1 1 140px;min-width:0}.bp-vessel-note{font-size:10px;line-height:1.5;color:#98b6c4}.bp-vessel-source{color:#7ce9ff;overflow-wrap:anywhere}.bp-vessel-popup{min-width:210px;max-width:290px;color:#e9faff;background:#071924;border:1px solid rgba(95,220,255,.35);border-radius:10px;padding:11px;font:11px/1.45 system-ui,sans-serif}.bp-vessel-popup b{display:block;color:#77eaff;font-size:13px;margin-bottom:4px}.bp-vessel-popup-row{display:grid;grid-template-columns:94px 1fr;gap:7px;padding:4px 0;border-top:1px solid rgba(125,211,238,.14)}.bp-vessel-popup-row span:first-child{color:#8caebb}.bp-vessel-popup-row span:last-child{overflow-wrap:anywhere;color:#effcff}';
 document.head.appendChild(style);
}
function showStatus(message,kind='info'){if(!statusNode)return;statusNode.textContent=String(message);statusNode.dataset.kind=kind}
function updateButton(){
 if(!button)return;button.classList.toggle('active',enabled);button.setAttribute('aria-pressed',String(enabled));
 const label=button.querySelector('.bpv-command-label');if(label)label.textContent=enabled?'Vessel Awareness · ON':'Vessel Awareness';
 button.title=enabled?'Hide live AIS vessel positions, 3D ship models, observed trails and coverage':'Show live AIS vessel positions, 3D ship models, observed trails and coverage';
}
function updateCoverageButton(){
 if(!coverageButton)return;coverageButton.classList.toggle('active',coverageEnabled);coverageButton.setAttribute('aria-pressed',String(coverageEnabled));
 coverageButton.textContent=coverageEnabled?'HIDE COVERAGE FOOTPRINT':'SHOW COVERAGE FOOTPRINT';
}
function writeSummary(){
 if(summaryNode){
  const rows=[['Vessels in loaded map tiles',lastSummary.features],['Fresh reports · under 10 min',lastSummary.fresh],['3D ship models rendered',lastSummary.models],['Observed trail points retained',lastSummary.trailPoints]];
  summaryNode.replaceChildren();for(const [label,value] of rows){const item=$el('div','bp-vessel-metric');item.append($el('b','',Number(value||0).toLocaleString()),$el('span','',label));summaryNode.append(item)}
 }
 updateCoverageButton();
}
function openPane(){
 if(!pane)return;const side=$('#bpv-sidecar');if(!side)return;
 side.hidden=false;side.dataset.panel='vessels';document.body.classList.add('bpv-panel-open');
 const title=$('#bpv-sidecar-title');if(title)title.textContent='BRIDGEPOINT VESSEL AWARENESS';
 side.querySelectorAll('[data-bpv-pane]').forEach(section=>{section.hidden=section!==pane});
 side.querySelectorAll('[data-bpv-panel]').forEach(b=>{const active=b.dataset.bpvPanel==='vessels';b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 const dock=$('#bpv-dock'),expand=dock?.querySelector('[data-bpv-dock-expand]');
 if(dock){dock.classList.add('bpv-dock-maximized');if(expand){expand.textContent='RESTORE ↘';expand.setAttribute('aria-pressed','true')}}
}
function createPane(side){
 if(!side)return null;const existing=side.querySelector('[data-bpv-pane="vessels"]');if(existing)return existing;
 const p=$el('section','bp-vessel-pane');p.dataset.bpvPane='vessels';p.hidden=true;
 p.append($el('div','bp-vessel-head','OPT-IN · LIVE AIS · GLOBAL VECTOR TILES · 3D SHIP MODELS'));
 p.append($el('div','bp-vessel-note','Live vessel points come from Open Waters AIS vector tiles. The source aggregates public feeds and volunteer receivers; visible coverage varies by coast, receiver network, reporting status and vessel equipment. Tiles show recent moving reports and last-known stationary positions. Vessel models sit at sea level and orient from reported heading/course. Model families are based on the transmitted AIS ship-type code; they are not claims of an exact ship identity or exact 3D hull.'));
 const summary=$el('div','bp-vessel-summary');summaryNode=summary;p.append(summary);
 const status=$el('div','bp-vessel-status','Vessel Awareness is off.');status.dataset.kind='info';statusNode=status;p.append(status);
 const actions=$el('div','bp-vessel-actions');
 const refresh=$el('button','bpv-wide-action','REFRESH VESSEL TILES NOW');refresh.type='button';refresh.addEventListener('click',()=>refreshTiles(true));actions.append(refresh);refreshButton=refresh;
 const coverage=$el('button','bpv-wide-action','HIDE COVERAGE FOOTPRINT');coverage.type='button';coverage.addEventListener('click',()=>{coverageEnabled=!coverageEnabled;applyVisibility();writeSummary()});actions.append(coverage);coverageButton=coverage;
 const off=$el('button','bpv-wide-action','TURN VESSEL AWARENESS OFF');off.type='button';off.addEventListener('click',()=>{if(enabled)void toggle()});actions.append(off);p.append(actions);
 p.append($el('div','bp-vessel-note','COVERAGE LAYER · Receiver activity over the last 7 complete UTC days, not a live radar boundary. A blank area can mean no receiver heard a vessel, no vessel transmitted, or a gap in the contributing feeds; it does not prove the water is empty.'));
 p.append($el('div','bp-vessel-note','FRESHNESS · Moving reports are generally kept for 30 minutes and stationary reports for up to 7 days. Older or stationary points fade. Trails are built only from successive observed tile positions; BridgePoint does not invent routes or extrapolate ship locations.'));
 const attribution=$el('div','bp-vessel-note');attribution.append(document.createTextNode('DATA · '));const link=$el('a','bp-vessel-source','Open Waters AIS network, coverage and source credits');link.href='https://openwaters.io/ais/network';link.target='_blank';link.rel='noopener noreferrer';attribution.append(link);p.append(attribution);
 p.append($el('div','bp-vessel-note','NOT FOR NAVIGATION OR SAFETY-OF-LIFE DECISIONS. Provider terms identify anonymous access as personal-use; commercial deployment requires confirmation of the appropriate commercial arrangement. This preview is source-attributed and does not represent that commercial permission has been granted.'));
 side.append(p);writeSummary();return p;
}
function addButton(){
 const grid=$('[data-bpv-command-grid="environment"]');if(!grid)return false;
 let b=grid.querySelector('[data-bp-vessel-awareness-button="1"]');
 if(!b){b=$el('button','bpv-command-btn','');b.type='button';b.dataset.bpVesselAwarenessButton='1';b.dataset.bpvAction='vessels';b.title='Show public AIS vessel positions, 3D ship models, observed trails and receiver coverage';b.innerHTML='<span class="bpv-command-icon" aria-hidden="true">⚓</span><span class="bpv-command-label">Vessel Awareness</span>';b.addEventListener('click',toggle);grid.append(b)}
 button=b;updateButton();return true;
}
function usableMap(m){try{return!!m&&!!m.getCanvas?.()?.width&&Array.isArray(m.getStyle?.()?.layers)&&m.getStyle().layers.length>0&&typeof m.addSource==='function'&&typeof m.addLayer==='function'}catch(_){return false}}
function addShipIcon(){
 if(!map||map.hasImage?.('bp-vessel-arrow-v1'))return;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=48;const c=canvas.getContext('2d');if(!c)return;
 c.fillStyle='#fff';c.beginPath();c.moveTo(24,4);c.lineTo(42,43);c.lineTo(24,34);c.lineTo(6,43);c.closePath();c.fill();
 try{map.addImage('bp-vessel-arrow-v1',c.getImageData(0,0,48,48),{sdf:true})}catch(_){}
}
function installSourcesAndLayers(){
 if(!usableMap(map))return false;
 try{
  addShipIcon();
  if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'vector',url:TILEJSON_URL});
  if(!map.getSource(COVERAGE_SOURCE))map.addSource(COVERAGE_SOURCE,{type:'vector',url:COVERAGE_TILEJSON_URL});
  if(!map.getSource(TRAIL_SOURCE))map.addSource(TRAIL_SOURCE,{type:'geojson',data:EMPTY()});
  if(!map.getSource(TRAIL_DOT_SOURCE))map.addSource(TRAIL_DOT_SOURCE,{type:'geojson',data:EMPTY()});
  if(!map.getLayer(COVERAGE_LAYER))map.addLayer({id:COVERAGE_LAYER,type:'fill',source:COVERAGE_SOURCE,'source-layer':'coverage',minzoom:0,maxzoom:10,layout:{visibility:'none'},paint:{'fill-color':['step',['coalesce',['get','stations'],0],'#135a86',2,'#00c8ff',5,'#21e5bd',12,'#ddff55'],'fill-opacity':['*',['/', ['coalesce',['get','days'],0],7],.48],'fill-outline-color':'rgba(100,225,240,.25)'}});
  if(!map.getLayer(TRAIL_LAYER))map.addLayer({id:TRAIL_LAYER,type:'line',source:TRAIL_SOURCE,layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':'#fff06a','line-width':['interpolate',['linear'],['zoom'],0,1.2,6,2,13,3.2],'line-opacity':.96}});
  if(!map.getLayer(TRAIL_DOT_LAYER))map.addLayer({id:TRAIL_DOT_LAYER,type:'circle',source:TRAIL_DOT_SOURCE,layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,2.2,6,3.1,12,4.5],'circle-color':'#fff37c','circle-stroke-color':'#142735','circle-stroke-width':1.1,'circle-opacity':.96}});
  if(!map.getLayer(STILL_LAYER))map.addLayer({id:STILL_LAYER,type:'circle',source:SOURCE,'source-layer':'vessels',filter:['all',['==',['get','kind'],'vessel'],['<',['coalesce',['get','sog'],0],.7]],minzoom:0,layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,3.2,4,4.4,9,5.6,14,7.2],'circle-color':['match',['get','type'],70,'#00f08b',71,'#00f08b',72,'#00f08b',80,'#ff563f',81,'#ff563f',82,'#ff563f',60,'#35b9ff',61,'#35b9ff',30,'#ffc247',36,'#cb91ff',37,'#cb91ff',50,'#fff052','#f2f8ff'],'circle-opacity':['step',['coalesce',['get','age_s'],0],.96,600,.74,3600,.44,86400,.18],'circle-stroke-color':'#f4fbff','circle-stroke-width':1.35}});
  if(!map.getLayer(MOVING_LAYER))map.addLayer({id:MOVING_LAYER,type:'symbol',source:SOURCE,'source-layer':'vessels',filter:['all',['==',['get','kind'],'vessel'],['>=',['coalesce',['get','sog'],0],.7]],minzoom:0,layout:{visibility:'none','icon-image':'bp-vessel-arrow-v1','icon-size':['interpolate',['linear'],['zoom'],0,.25,4,.30,9,.37,14,.46],'icon-rotate':['coalesce',['get','hdg'],['get','cog'],0],'icon-rotation-alignment':'map','icon-allow-overlap':true,'icon-ignore-placement':true},paint:{'icon-color':['match',['get','type'],70,'#00f08b',71,'#00f08b',72,'#00f08b',80,'#ff563f',81,'#ff563f',82,'#ff563f',60,'#35b9ff',61,'#35b9ff',30,'#ffc247',36,'#cb91ff',37,'#cb91ff',50,'#fff052','#f2f8ff'],'icon-halo-color':'#061421','icon-halo-width':1.8,'icon-halo-blur':.25,'icon-opacity':['step',['coalesce',['get','age_s'],0],.98,600,.76,3600,.46,86400,.18]}});
  bindInteractions();applyVisibility();return true;
 }catch(error){sourceError=String(error?.message||error);showStatus('Vessel map layer initialization failed: '+sourceError,'error');console.warn('BridgePoint vessel layers failed',error);return false}
}
function applyVisibility(){
 if(!map)return;const on=enabled?'visible':'none';
 for(const id of [STILL_LAYER,MOVING_LAYER,TRAIL_LAYER,TRAIL_DOT_LAYER,MODEL_LAYER])try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on)}catch(_){}
 try{if(map.getLayer(COVERAGE_LAYER))map.setLayoutProperty(COVERAGE_LAYER,'visibility',enabled&&coverageEnabled?'visible':'none')}catch(_){}
 try{map.triggerRepaint?.()}catch(_){}
}
function bindInteractions(){
 if(!map||map.__bpVesselInteractionsV1)return;
 for(const id of [STILL_LAYER,MOVING_LAYER]){
  map.on('click',id,showVesselDetails);
  map.on('mouseenter',id,()=>{try{map.getCanvas().style.cursor='pointer'}catch(_){}});
  map.on('mouseleave',id,()=>{try{map.getCanvas().style.cursor=''}catch(_){}});
 }
 map.__bpVesselInteractionsV1=true;
}
function vesselClass(type){
 const t=Number(type);if(t>=70&&t<=79)return'cargo';if(t>=80&&t<=89)return'tanker';if(t>=60&&t<=69)return'passenger';if(t===30)return'fishing';if(t===36||t===37)return'sail';if(t>=50&&t<=59)return'tug';if(t>=40&&t<=49)return'highspeed';return'other';
}
function classLabel(kind){return({cargo:'Cargo / container vessel',tanker:'Tanker',passenger:'Passenger vessel',fishing:'Fishing vessel',sail:'Sailing / pleasure craft',tug:'Tug / service craft',highspeed:'High-speed craft',other:'Other vessel'})[kind]||'Vessel'}
function formatAge(seconds){if(!Number.isFinite(Number(seconds)))return'Not reported';const s=Math.max(0,Math.round(Number(seconds)));if(s<60)return s+' sec';if(s<3600)return Math.round(s/60)+' min';if(s<86400)return (s/3600).toFixed(1)+' hr';return (s/86400).toFixed(1)+' days'}
function showVesselDetails(event){
 const f=event?.features?.[0];if(!f)return;const p=f.properties||{},kind=vesselClass(p.type),root=$el('div','bp-vessel-popup');
 root.append($el('b','',String(p.name||('MMSI '+(p.mmsi??f.id??'Unknown vessel')))));
 root.append($el('div','',classLabel(kind)+' · last AIS report '+formatAge(p.age_s)+' ago'));
 const rows=[['MMSI',p.mmsi??f.id],['Ship type',p.type??'Not reported'],['Flag',p.flag||'Not reported'],['Speed',p.sog==null?'Not reported':Number(p.sog).toFixed(1)+' kn'],['Course',p.cog==null?'Not reported':Number(p.cog).toFixed(0)+'°'],['Heading',p.heading==null?(p.hdg==null?'Not reported':Number(p.hdg).toFixed(0)+'°'):Number(p.heading).toFixed(0)+'°'],['Length',p.length==null?'Not reported':p.length+' m'],['Beam',p.beam==null?'Not reported':p.beam+' m'],['Last heard by',p.station||p.source||'Not reported'],['Freshness',formatAge(p.age_s)]];
 for(const [label,value] of rows){const row=$el('div','bp-vessel-popup-row');row.append($el('span','',label),$el('span','',value));root.append(row)}
 const coords=f.geometry?.coordinates;if(Array.isArray(coords)&&Number.isFinite(Number(coords[0]))&&Number.isFinite(Number(coords[1])))try{new window.maplibregl.Popup({closeButton:true,maxWidth:'320px'}).setLngLat([Number(coords[0]),Number(coords[1])]).setDOMContent(root).addTo(map)}catch(_){}
}
function loadThree(){if(!threePromise)threePromise=import(THREE_URL).then(m=>m.default||m).catch(e=>{threePromise=null;throw e});return threePromise}
function makeShipGeometry(T,kind){
 const parts=[],add=(g,p=[0,0,0],r=[0,0,0],s=[1,1,1],color=colors[kind]||colors.other)=>parts.push({g,p,r,s,color});
 const box=(x,y,z)=>new T.BoxGeometry(x,y,z);
 const cyl=(radius,height,segments=10)=>new T.CylinderGeometry(radius,radius,height,segments);
 const hullShape=new T.Shape();
 hullShape.moveTo(-.79,-.125);hullShape.lineTo(-.69,-.19);hullShape.lineTo(.48,-.195);
 hullShape.lineTo(.79,0);hullShape.lineTo(.48,.195);hullShape.lineTo(-.69,.19);hullShape.lineTo(-.79,.125);hullShape.closePath();
 const hull=new T.ExtrudeGeometry(hullShape,{depth:.17,steps:1,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2});
 hull.translate(0,0,-.17);
 const hullColors={cargo:0x176d64,tanker:0x9f3436,passenger:0x285b83,fishing:0x9a6b35,sail:0x62528f,tug:0x9b8528,highspeed:0x226b7b,other:0x536c78};
 const hullColor=hullColors[kind]||hullColors.other,accent=colors[kind]||colors.other;
 add(hull,[0,0,0],[0,0,0],[1,1,1],hullColor);
 add(box(1.34,.345,.022),[-.005,0,.009],[0,0,0],[1,1,1],0xb8c8ce);
 add(box(1.28,.012,.025),[-.035,.174,.043],[0,0,0],[1,1,1],0xe1edf0);
 add(box(1.28,.012,.025),[-.035,-.174,.043],[0,0,0],[1,1,1],0xe1edf0);
 const mast=(x,y,z,height=.28,radius=.008,color=0xe7f1f4)=>{
  add(cyl(radius,height,8),[x,y,z+height/2],[Math.PI/2,0,0],[1,1,1],color);
  add(box(height*.56,.012,.012),[x,y,z+height*.66],[0,0,0],[1,1,1],accent);
 };
 const cabin=(x,z,length,width,height,color=0xe5edf0)=>{
  add(box(length,width,height),[x,0,z+height/2],[0,0,0],[1,1,1],color);
  for(const side of [-1,1]){
   add(box(length*.84,.012,Math.max(.018,height*.16)),[x,side*(width/2+.006),z+height*.54],[0,0,0],[1,1,1],0x18374a);
   add(box(length*.82,width*.92,.012),[x,0,z+height*.79],[0,0,0],[1,1,1],accent);
  }
 };
 const pipe=(x,y,z,height=.10,radius=.018,color=0x718b96)=>{
  add(cyl(radius,height,8),[x,y,z+height/2],[Math.PI/2,0,0],[1,1,1],color);
 };
 const triangle=(a,b,c,color)=>{
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute([...a,...b,...c],3));
  g.setIndex([0,1,2]);g.computeVertexNormals();add(g,[0,0,0],[0,0,0],[1,1,1],color);
 };
 if(kind==='cargo'){
  for(let row=0;row<2;row++)for(let i=0;i<5;i++)for(let level=0;level<4;level++){
   const x=.47-i*.185,y=row===0?-.084:.084,z=.075+level*.112;
   const palette=[0xd9573c,0xe0a93d,0x268fba,0x36a67b,0xb65c8f];
   const cc=palette[(i+row*2+level)%palette.length];
   add(box(.17,.155,.102),[x,y,z],[0,0,0],[1,1,1],cc);
   add(box(.012,.145,.086),[x+.055,y,z],[0,0,0],[1,1,1],0x263f4e);
   add(box(.012,.145,.086),[x-.055,y,z],[0,0,0],[1,1,1],0x263f4e);
  }
  cabin(-.61,.055,.24,.25,.29,0xe0e8eb);
  add(box(.18,.265,.035),[-.61,0,.36],[0,0,0],[1,1,1],0x18384c);
  pipe(-.61,0,.38,.22,.008,0xe8f2f4);
  for(const x of [-.12,.23]){pipe(x,.145,.035,.25,.009,accent);pipe(x,-.145,.035,.25,.009,accent);add(box(.28,.018,.014),[x+.12,0,.28],[0,0,0],[1,1,1],0xc7d7dc)}
 }else if(kind==='tanker'){
  for(let i=0;i<5;i++){
   const x=.47-i*.235;
   add(cyl(.082,.16,14),[x,0,.085],[Math.PI/2,0,0],[1,1,1],0xd8e1e3);
   add(cyl(.085,.012,14),[x,0,.17],[Math.PI/2,0,0],[1,1,1],accent);
   add(box(.018,.25,.025),[x,0,.045],[0,0,0],[1,1,1],0x526c76);
  }
  for(const y of [-.145,.145]){add(box(1.08,.012,.018),[-.02,y,.075],[0,0,0],[1,1,1],0xf0c66d);add(box(.95,.018,.018),[.02,y,.105],[0,0,0],[1,1,1],0x718d94)}
  cabin(-.62,.055,.23,.25,.28,0xe4ebed);pipe(-.59,0,.34,.18,.012,0xe5eced);mast(-.71,0,.34,.28,.007);
 }else if(kind==='passenger'){
  cabin(.03,.055,.88,.305,.17,0xe8eff1);
  cabin(.02,.215,.75,.28,.145,0xd8e4e8);
  cabin(.10,.35,.57,.245,.12,0xe7eef0);
  add(box(.48,.22,.035),[.10,0,.49],[0,0,0],[1,1,1],0x1c465d);
  for(const side of [-1,1]){
   for(let i=0;i<7;i++){
    const x=-.34+i*.115;
    add(box(.058,.018,.035),[x,side*.158,.22],[0,0,0],[1,1,1],0x123c55);
    add(box(.058,.018,.025),[x,side*.145,.37],[0,0,0],[1,1,1],0x123c55);
    add(box(.072,.038,.032),[x,side*.18,.105],[0,0,0],[1,1,1],0xff8f38);
   }
  }
  pipe(.27,0,.49,.16,.032,0xd95b36);pipe(.48,0,.49,.16,.032,0xe0a64b);
  mast(-.56,0,.20,.32,.007);
 }else if(kind==='fishing'){
  cabin(-.22,.055,.34,.24,.23,0xe6edef);
  add(box(.16,.19,.09),[-.2,0,.30],[0,0,0],[1,1,1],0x19435a);
  add(box(.12,.02,.20),[.34,0,.21],[0,0,-.2],[1,1,1],accent);
  add(box(.018,.34,.018),[.43,0,.34],[0,0,.1],[1,1,1],0xe8eff0);
  mast(-.18,0,.30,.40,.007);
  for(const y of [-.14,.14]){pipe(.36,y,.17,.22,.006,accent);add(box(.24,.012,.012),[.42,y,.36],[0,0,0],[1,1,1],0xf0d88a)}
 }else if(kind==='sail'){
  cabin(-.38,.05,.20,.18,.12,0xe7ecee);
  mast(-.16,0,.035,1.12,.009,0xe5edf0);
  triangle([-.145,0,.18],[-.12,0,1.10],[.22,0,.20],0xf3eee0);
  triangle([-.10,-.006,.20],[-.08,-.006,.78],[.37,-.006,.20],accent);
  add(box(.10,.035,.035),[-.5,0,.035],[0,0,0],[1,1,1],0x18394a);
 }else if(kind==='tug'){
  cabin(-.36,.055,.34,.26,.22,0xe5ecee);
  cabin(-.37,.255,.22,.22,.16,0xd8e4e7);
  pipe(-.16,0,.40,.17,.035,0xffb34e);
  mast(-.52,0,.40,.30,.009);
  for(const y of [-.16,.16])for(const x of [-.48,-.18,.18,.48])add(cyl(.027,.065,8),[x,y,.015],[0,0,0],[1,1,1],0x192d39);
  add(box(.025,.30,.025),[.24,0,.19],[0,0,.15],[1,1,1],accent);
 }else if(kind==='highspeed'){
  const portHull=hull.clone();const starboardHull=hull.clone();
  add(portHull,[0,-.12,-.015],[0,0,0],[1,.27,.68],0x176c80);
  add(starboardHull,[0,.12,-.015],[0,0,0],[1,.27,.68],0x176c80);
  cabin(.02,.06,.82,.25,.20,0xe9f0f2);
  add(box(.40,.25,.04),[.02,.25,.20],[0,0,0],[1,1,1],accent);
  mast(-.5,0,.25,.25,.007);
 }else{
  cabin(-.24,.055,.42,.25,.22,0xe1e9ec);
  cabin(-.25,.25,.25,.20,.14,0xd7e3e7);
  mast(-.5,0,.37,.36,.008);
  add(box(.035,.24,.035),[.33,0,.20],[0,0,.18],[1,1,1],accent);
  add(box(.26,.025,.025),[.42,0,.38],[0,0,0],[1,1,1],0xe4edf0);
  pipe(.37,0,.39,.18,.012,0xe4edf0);
 }
 const positions=[],normals=[],vertexColors=[],indices=[];let offset=0;
 for(const part of parts){
  const g=part.g;g.computeVertexNormals?.();
  const pos=new T.Vector3(...part.p),quat=new T.Quaternion().setFromEuler(new T.Euler(...part.r)),scale=new T.Vector3(...part.s);
  g.applyMatrix4(new T.Matrix4().compose(pos,quat,scale));
  const pa=g.getAttribute('position'),na=g.getAttribute('normal'),color=new T.Color(part.color);
  for(let i=0;i<pa.array.length;i++)positions.push(pa.array[i]);
  if(na)for(let i=0;i<na.array.length;i++)normals.push(na.array[i]);
  for(let i=0;i<pa.count;i++)vertexColors.push(color.r,color.g,color.b);
  const idx=g.index?.array;if(idx){for(let i=0;i<idx.length;i++)indices.push(offset+idx[i])}else for(let i=0;i<pa.count;i++)indices.push(offset+i);
  offset+=pa.count;g.dispose();
 }
 const merged=new T.BufferGeometry();
 merged.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 merged.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
 merged.setAttribute('color',new T.Float32BufferAttribute(vertexColors,3));
 merged.setIndex(indices);merged.computeBoundingSphere();return merged;
}
function ensureMesh(kind,capacity){
 let entry=templates.get(kind);if(entry&&entry.capacity>=capacity)return entry;
 if(entry){try{scene?.remove(entry.mesh);entry.geometry.dispose();entry.material.dispose()}catch(_){}templates.delete(kind)}
 const geometry=makeShipGeometry(THREE,kind);
 const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.28,roughness:.48,emissive:0x0c1b24,emissiveIntensity:.12,side:THREE.DoubleSide});
 const mesh=new THREE.InstancedMesh(geometry,material,Math.max(1,capacity));mesh.name='BridgePoint live AIS 3D '+kind+' vessels';mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
 entry={kind,geometry,material,mesh,capacity:Math.max(1,capacity)};templates.set(kind,entry);return entry;
}
function disposeRenderer(){
 if(customLayer?.renderer){try{customLayer.renderer.dispose()}catch(_){}}
 for(const entry of templates.values()){try{scene?.remove(entry.mesh);entry.geometry.dispose();entry.material.dispose()}catch(_){}}
 templates.clear();renderer=null;scene=null;camera=null;customLayer=null;THREE=null;
}
function ensure3DLayer(){
 if(!map||!map.getStyle?.())return false;
 if(map.getLayer(MODEL_LAYER)&&renderer&&scene)return true;
 const layer={id:MODEL_LAYER,type:'custom',renderingMode:'3d',
  onAdd:(mapRef,gl)=>{
   const r=new THREE.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});r.autoClear=false;r.outputColorSpace=THREE.SRGBColorSpace;
   const sc=new THREE.Scene();sc.add(new THREE.AmbientLight(0xffffff,1.35));
   const key=new THREE.DirectionalLight(0xffffff,2.05);key.position.set(-.55,-.7,1.25);sc.add(key);
   const fill=new THREE.DirectionalLight(0x75cfff,.72);fill.position.set(.65,.4,.72);sc.add(fill);
   renderer=r;scene=sc;camera=new THREE.Camera();customLayer=layer;
  },
  render:(gl,args)=>{
   if(!renderer||!scene||!camera)return;
   const matrix=args?.defaultProjectionData?.mainMatrix||args?.modelViewProjectionMatrix||args;
   if(!matrix||typeof matrix.length!=='number'||matrix.length<16)return;
   camera.projectionMatrix.fromArray(matrix);
   try{renderer.resetState?.();if(renderer.state?.reset)renderer.state.reset()}catch(_){}
   renderer.render(scene,camera);
  },
  onRemove:()=>{disposeRenderer()}
 };
 try{map.addLayer(layer);return!!renderer&&!!scene}catch(error){console.warn('BridgePoint 3D ship renderer could not attach',error);return false}
}
function normalizeFeature(feature){
 const p=feature?.properties||{},g=feature?.geometry;if(!g||g.type!=='Point'||!Array.isArray(g.coordinates))return null;
 const lon=Number(g.coordinates[0]),lat=Number(g.coordinates[1]),mmsi=String(p.mmsi??feature.id??'');
 if(!mmsi||!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lat)>85.05113||lon<-180||lon>180)return null;
 if(String(p.kind||'vessel')!=='vessel')return null;
 const age=Number(p.age_s??0),type=Number(p.type),speed=p.sog==null?null:Number(p.sog),heading=p.heading==null?(p.hdg==null?(p.cog==null?null:Number(p.cog)):Number(p.hdg)):Number(p.heading);
 return{mmsi,lon,lat,age:Number.isFinite(age)?Math.max(0,age):0,type:Number.isFinite(type)?type:0,speed:Number.isFinite(speed)?speed:null,heading:Number.isFinite(heading)?heading:0,length:Number.isFinite(Number(p.length))?Number(p.length):null,beam:Number.isFinite(Number(p.beam))?Number(p.beam):null,properties:p};
}
function updateTracks(records){
 const now=Date.now();
 for(const vessel of records){
  let track=tracks.get(vessel.mmsi);if(!track){track=[];tracks.set(vessel.mmsi,track)}
  const last=track[track.length-1];
  const moved=!last||Math.abs(last.lon-vessel.lon)>0.00001||Math.abs(last.lat-vessel.lat)>0.00001;
  if(moved)track.push({lon:vessel.lon,lat:vessel.lat,time:now-vessel.age*1000});
  while(track.length>MAX_TRACK_POINTS)track.shift();
 }
 if(tracks.size>MAX_TRACKS){
  const keys=[...tracks.keys()];for(let i=0;i<keys.length-MAX_TRACKS;i++)tracks.delete(keys[i]);
 }
 for(const [key,track] of tracks){while(track.length&&now-track[0].time>TRACK_RETENTION_MS)track.shift();if(!track.length)tracks.delete(key)}
 const lines=[],dots=[];let pointCount=0;
 for(const [mmsi,track] of tracks){
  if(track.length<2)continue;
  lines.push({type:'Feature',id:mmsi,properties:{mmsi},geometry:{type:'LineString',coordinates:track.map(p=>[p.lon,p.lat])}});
  for(let i=0;i<track.length;i++){dots.push({type:'Feature',properties:{mmsi,index:i},geometry:{type:'Point',coordinates:[track[i].lon,track[i].lat]}});pointCount++}
 }
 try{map.getSource(TRAIL_SOURCE)?.setData({type:'FeatureCollection',features:lines});map.getSource(TRAIL_DOT_SOURCE)?.setData({type:'FeatureCollection',features:dots})}catch(_){}
 lastSummary.trailPoints=pointCount;
}
function updateModels(records){
 if(!scene||!THREE||!map)return 0;
 const MC=window.maplibregl?.MercatorCoordinate||window.MapLibreGL?.MercatorCoordinate;if(!MC?.fromLngLat)return 0;
 const bounds=map.getBounds?.(),zoom=Number(map.getZoom?.()||0),grouped=new Map();let placed=0;
 for(const v of records){
  if(placed>=MAX_MODELS)break;
  if(bounds){try{if(!bounds.contains([v.lon,v.lat]))continue}catch(_){}}
  const pos=MC.fromLngLat({lng:v.lon,lat:v.lat},WATERLINE_METERS),unit=pos.meterInMercatorCoordinateUnits?.()||0;if(!Number.isFinite(unit)||unit<=0)continue;
  const kind=vesselClass(v.type),meterPerPixel=WORLD_CIRCUMFERENCE_M*Math.max(.12,Math.cos(v.lat*Math.PI/180))/(512*Math.pow(2,Math.max(0,zoom)));
  const targetPixels=zoom<2?9:zoom<4?8:zoom<6?6:zoom<8?4.5:zoom<10?2.5:0;
  const trueLength=Math.max(18,Math.min(500,Number(v.length)||80)),displayLength=Math.max(trueLength,targetPixels*meterPerPixel);
  const displayBeam=Math.max(Number(v.beam)||0,displayLength*.19,5);
  const verticalFactor=kind==='sail'?.95:kind==='passenger'?.70:kind==='cargo'?.72:kind==='tanker'?.58:kind==='fishing'?.62:kind==='tug'?.65:kind==='highspeed'?.52:.62;
  const sx=displayLength/1.55*unit,sy=displayBeam/.40*unit,sz=Math.max(4,displayBeam*verticalFactor)*unit;
  const heading=(Number.isFinite(v.heading)?v.heading:0)*Math.PI/180-Math.PI/2;
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(pos.x,pos.y,pos.z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,heading)),new THREE.Vector3(sx,sy,sz));
  const bucket=grouped.get(kind)||[];bucket.push(matrix);grouped.set(kind,bucket);placed++;
 }
 for(const [kind,matrices] of grouped){
  const entry=ensureMesh(kind,matrices.length);
  for(let i=0;i<matrices.length;i++)entry.mesh.setMatrixAt(i,matrices[i]);
  entry.mesh.count=matrices.length;entry.mesh.instanceMatrix.needsUpdate=true;try{entry.mesh.computeBoundingSphere()}catch(_){}
 }
 for(const [kind,entry] of templates)if(!grouped.has(kind)){entry.mesh.count=0;entry.mesh.instanceMatrix.needsUpdate=true}
 map.triggerRepaint?.();return placed;
}
function recordsFromTiles(){
 if(!map||!map.getSource(SOURCE))return[];
 let features=[];try{features=map.querySourceFeatures(SOURCE,{sourceLayer:'vessels'})||[]}catch(_){}
 const byId=new Map();
 for(const feature of features){const v=normalizeFeature(feature);if(!v)continue;const old=byId.get(v.mmsi);if(!old||v.age<old.age)byId.set(v.mmsi,v)}
 return [...byId.values()];
}
function refreshSummary(records,models){
 lastSummary.features=records.length;lastSummary.fresh=records.filter(v=>v.age<=600).length;lastSummary.models=models;
 writeSummary();
}
function scheduleUpdate(){
 if(updateQueued||!enabled)return;updateQueued=true;
 requestAnimationFrame(()=>{updateQueued=false;if(!enabled||!map)return;
  const records=recordsFromTiles();lastRecords=records;updateTracks(records);
  let models=0;try{models=updateModels(records)}catch(error){console.warn('BridgePoint ship model update failed',error);showStatus('AIS positions loaded, but the 3D vessel renderer failed: '+String(error?.message||error),'error')}
  refreshSummary(records,models);
  if(records.length){sourceReady=true;showStatus('Live AIS vessel tiles loaded · '+records.length.toLocaleString()+' vessels in the currently loaded map tiles · '+models.toLocaleString()+' 3D models in view. Source positions refresh from the provider tile cache; observed tracks are drawn only when a new position is received.','ok')}
  else if(!sourceReady)showStatus('Vessel layer is enabled. Waiting for the first public AIS vector tiles to load for this map view.','info');
 });
}
function refreshTiles(force=false){
 if(!map||!enabled)return;
 if(refreshButton)refreshButton.disabled=true;
 try{
  // The provider publishes 10-second tiles. BridgePoint's map uses MapLibre
  // refreshExpiredTiles=true, so normal expiry reloads them. Open Waters'
  // first-party MapLibre build also exposes refreshTiles; use it when present.
  if(typeof map.refreshTiles==='function')map.refreshTiles(SOURCE);
  if(typeof map.refreshTiles==='function')map.refreshTiles(COVERAGE_SOURCE);
  const s=map.getSource(SOURCE);if(s&&typeof s.setTiles==='function'&&s.tiles?.length)s.setTiles(s.tiles);
  if(force)showStatus('Requested a fresh vessel-tile read. MapLibre will keep the previous tile pixels until replacements arrive.','info');
 }catch(error){showStatus('Vessel tile refresh request failed: '+String(error?.message||error),'error')}
 finally{if(refreshButton)refreshButton.disabled=false}
 scheduleUpdate();
}
async function activate(){
 if(!enabled)return false;
 if(!usableMap(map)){showStatus('Vessel Awareness is ON and waiting for the globe map style to finish loading. It will retry automatically.','info');return false}
 if(!installSourcesAndLayers()){showStatus('Vessel Awareness is ON; waiting for the map style to accept the live sources. It will retry automatically.','info');return false}
 applyVisibility();
 try{
  const T=await loadThree();if(!enabled)return false;THREE=T;
  if(!ensure3DLayer())throw new Error('3D vessel layer could not attach to the initialized globe');
 }catch(error){showStatus('AIS dots and receiver coverage can still load, but 3D ships are unavailable: '+String(error?.message||error),'error')}
 window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('vessels',true);
 showStatus('Vessel Awareness is ON. Loading source-backed global AIS vessel tiles and 3D ship models.','info');
 refreshTiles(true);scheduleUpdate();return true;
}
async function toggle(){
 openPane();
 if(!enabled){
  enabled=true;sourceReady=false;updateButton();applyVisibility();await activate();
  if(refreshTimer)clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(enabled&&!document.hidden){refreshTiles(false);scheduleUpdate()}},REFRESH_MS);
  if(statusTimer)clearInterval(statusTimer);statusTimer=setInterval(()=>{if(enabled&&!document.hidden)scheduleUpdate()},5000);
  return;
 }
 enabled=false;updateButton();if(refreshTimer)clearInterval(refreshTimer);refreshTimer=0;if(statusTimer)clearInterval(statusTimer);statusTimer=0;applyVisibility();showStatus('Vessel Awareness is off. No AIS tile requests or 3D vessel updates will be made while it is disabled.','info');
}
function bootMap(){
 addStyle();addButton();const side=$('#bpv-sidecar');if(side)pane=createPane(side);
 const current=worldMap();
 if(current&&map!==current){
  map=current;mapListenersBound=false;
  const onSource=e=>{if(enabled&&e?.sourceId===SOURCE&&e.isSourceLoaded)scheduleUpdate()};
  map.on?.('sourcedata',onSource);map.on?.('idle',scheduleUpdate);map.on?.('moveend',scheduleUpdate);map.on?.('zoomend',scheduleUpdate);
  map.on?.('style.load',()=>{if(enabled){installSourcesAndLayers();void activate()}else installSourcesAndLayers()});
  mapListenersBound=true;
 }
 if(map){installSourcesAndLayers();if(enabled){applyVisibility();if(!renderer)void activate()}}
}
function boot(){
 bootMap();let attempts=0;
 const observer=new MutationObserver(()=>{bootMap();if(button&&pane){try{observer.disconnect()}catch(_){}}});
 try{observer.observe(document.body,{childList:true,subtree:true})}catch(_){}
 const timer=setInterval(()=>{bootMap();attempts++;if((button&&pane&&map)||attempts>240){clearInterval(timer);try{observer.disconnect()}catch(_){}}},250);
 window.__BP_VESSEL_AWARENESS_V1__={
  version:VERSION,
  provider:'Open Waters AIS public vector tiles',
  tileUrl:TILEJSON_URL,
  coverageUrl:COVERAGE_TILEJSON_URL,
  noApiKey:true,
  noAccessToken:true,
  commercialUseApproved:false,
  toggle,
  refresh:()=>refreshTiles(true),
  diagnostics:()=>({enabled,coverageEnabled,mapReady:!!map,sourceReady,loadedVessels:lastSummary.features,freshUnderTenMinutes:lastSummary.fresh,modelsRendered:lastSummary.models,observedTrailPoints:lastSummary.trailPoints,sourceError}),
  get state(){return{enabled,coverageEnabled,mapReady:!!map,sourceLayerReady:!!map?.getLayer?.(STILL_LAYER),coverageLayerReady:!!map?.getLayer?.(COVERAGE_LAYER),modelLayerReady:!!map?.getLayer?.(MODEL_LAYER),rendererReady:!!renderer&&!!scene,loadedVessels:lastSummary.features,modelsRendered:lastSummary.models}}
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();