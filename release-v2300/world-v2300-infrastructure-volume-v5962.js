const VERSION=5962;
const ROOT='bp-infrastructure-volume-v5962';
const CSS_ID=ROOT+'-style';
const POWER_URL='https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/US_Electric_Power_Transmission_Lines/FeatureServer/0/query';
const FCC_URL='https://services.arcgis.com/XG15cJAlne2vxtgt/ArcGIS/rest/services/NMSZ_HSIP2015_Layers_2018/FeatureServer/24/query';
const POWER_SRC='bp-infra-power-source-v5962',TOWER_SRC='bp-infra-fcc-tower-source-v5962';
const POWER_LINE='bp-infra-power-route-v5962',POWER_GLOW='bp-infra-power-glow-v5962',TOWER_DOTS='bp-infra-fcc-tower-dots-v5962',VOLUME_LAYER='bp-infra-volume-custom-v5962';
const THREE_URL='./vendor/three.module.js?v=169-local';
const EMPTY={type:'FeatureCollection',features:[]};
const CSS=`
#${ROOT}{display:grid;gap:6px;margin:6px 0 2px;padding:9px;border:1px solid rgba(255,193,102,.29);border-radius:12px;background:linear-gradient(135deg,rgba(27,22,22,.97),rgba(8,20,31,.97));box-shadow:0 8px 22px rgba(0,0,0,.22);color:#effaff;font:10px/1.4 system-ui,sans-serif;min-width:0}
#${ROOT} *{box-sizing:border-box}
#${ROOT} .head{display:flex;justify-content:space-between;gap:8px;align-items:center;color:#ffd39a;font-size:8px;font-weight:950;letter-spacing:.1em}
#${ROOT} .toggle{width:100%;min-height:34px;padding:8px;border-radius:9px;border:1px solid rgba(255,203,123,.4);background:linear-gradient(120deg,rgba(67,45,23,.96),rgba(19,35,48,.97));color:#fff1dc;text-align:left;font:950 9px/1.25 system-ui,sans-serif;cursor:pointer}
#${ROOT} .toggle[aria-pressed=true]{border-color:#ffe4b6;background:linear-gradient(120deg,rgba(129,72,21,.94),rgba(20,62,70,.97));box-shadow:0 0 12px rgba(255,166,67,.15)}
#${ROOT} .stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
#${ROOT} .stat{padding:6px;border:1px solid rgba(255,220,180,.13);border-radius:7px;background:rgba(255,255,255,.025);min-width:0}
#${ROOT} .stat b{display:block;font-size:12px;color:#fff;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
#${ROOT} .stat small{display:block;font-size:8px;color:#b3c9d4;margin-top:2px}
#${ROOT} .status{font-size:8px;line-height:1.45;color:#b5cbd5;overflow-wrap:anywhere}
#${ROOT} .status strong{color:#ffe0b3}
#${ROOT} .key{display:flex;gap:8px;flex-wrap:wrap;color:#9bb7c5;font-size:7.5px}
#${ROOT} .sw{display:inline-block;width:9px;height:3px;border-radius:2px;margin-right:4px;vertical-align:middle;background:#ffc25d}
#${ROOT} .sw.tower{width:7px;height:7px;border-radius:50%;background:#fff1c2;box-shadow:0 0 7px #ffac42}
`;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const timeLabel=()=>new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
const cleanNumber=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
function empty(){return{type:'FeatureCollection',features:[]}}
function queryUrl(base,params){const u=new URL(base);for(const[k,v]of Object.entries(params))u.searchParams.set(k,String(v));return u.toString()}
async function requestFeatures(base,bounds,outFields,limit,signal){
 const [w,s,e,n]=bounds;
 const u=queryUrl(base,{where:'1=1',geometry:`${w},${s},${e},${n}`,geometryType:'esriGeometryEnvelope',inSR:4326,spatialRel:'esriSpatialRelIntersects',outFields,returnGeometry:true,outSR:4326,resultRecordCount:limit,returnExceededLimitFeatures:true,f:'geojson'});
 const r=await fetch(u,{headers:{Accept:'application/geo+json,application/json'},cache:'no-store',signal});
 if(!r.ok)throw new Error('GIS service HTTP '+r.status);
 const d=await r.json();
 if(d?.error)throw new Error(d.error.message||'GIS service query failed');
 if(!Array.isArray(d?.features))throw new Error('GIS service returned no GeoJSON feature array');
 return d;
}
function metreDistance(a,b){const lat=(Number(a[1])+Number(b[1]))*.5*Math.PI/180;const dx=(Number(b[0])-Number(a[0]))*111320*Math.cos(lat),dy=(Number(b[1])-Number(a[1]))*110540;return Math.hypot(dx,dy)}
function interpolate(a,b,t){return[Number(a[0])+(Number(b[0])-Number(a[0]))*t,Number(a[1])+(Number(b[1])-Number(a[1]))*t]}
function sampleRoute(coords,spacing,cap=140){
 const pts=(coords||[]).filter(c=>Array.isArray(c)&&Number.isFinite(Number(c[0]))&&Number.isFinite(Number(c[1]))&&Math.abs(Number(c[1]))<=85.0511);
 if(pts.length<2)return[];
 const segs=[],total=0;
 let distance=0;
 for(let i=1;i<pts.length;i++){const d=metreDistance(pts[i-1],pts[i]);if(d>0){segs.push({a:pts[i-1],b:pts[i],d,start:distance});distance+=d}}
 if(!segs.length)return[];
 const n=Math.min(cap,Math.max(1,Math.ceil(distance/spacing))),out=[];
 for(let j=0;j<=n;j++){
  const dist=distance*j/n;
  const seg=segs.find(x=>dist<=x.start+x.d)||segs[segs.length-1];
  out.push(interpolate(seg.a,seg.b,Math.max(0,Math.min(1,(dist-seg.start)/seg.d))));
 }
 return out;
}
export function initInfrastructureVolume(target){
 const map=target?.map||target,container=map?.getContainer?.();
 if(!map||!container||typeof fetch!=='function'||!window.maplibregl?.MercatorCoordinate)return null;
 if(window.__BP_INFRASTRUCTURE_VOLUME_V5962__?.map===map)return window.__BP_INFRASTRUCTURE_VOLUME_V5962__;
 if(!document.getElementById(CSS_ID)){const st=document.createElement('style');st.id=CSS_ID;st.textContent=CSS;document.head.appendChild(st)}
 const state={version:VERSION,map,enabled:false,available:true,powerFeatures:0,towerFeatures:0,updatedAt:null,volume:{towers:0,catenarySpans:0,meshes:0},sources:{power:'U.S. Electric Power Transmission Lines, HIFLD-derived ArcGIS FeatureServer',towers:'FCC Antenna Structure Registration extract, ArcGIS FeatureServer layer 24'},estimates:{towerPositions:'schematic intervals along mapped transmission routes; individual pylon coordinates not supplied by route layer',sag:'procedural catenary; actual conductor tension, temperature, wind and tower attachment height not in source layer'}};
 window.__BP_INFRASTRUCTURE_VOLUME_V5962__=state;
 const ui=document.createElement('section');ui.id=ROOT;ui.setAttribute('aria-label','Power transmission and FCC antenna structures');
 ui.innerHTML='<div class="head"><span>⚡ INFRASTRUCTURE VOLUME</span><small>US GRID + FCC ASR</small></div><button class="toggle" type="button" data-toggle aria-pressed="false">⚡ POWER LINES + 3D TOWERS · OFF</button><div class="stats"><div class="stat"><b data-power-count>—</b><small>Transmission routes in view</small></div><div class="stat"><b data-tower-count>—</b><small>FCC structures in view</small></div></div><div class="key"><span><i class="sw"></i>HIFLD-derived transmission routes</span><span><i class="sw tower"></i>FCC ASR structures</span></div><div class="status" data-status>Off by default. When enabled, BridgePoint requests source records for the visible map area. Close-up towers and conductor sag are procedural visualization, not surveyed tower/span geometry.</div><div class="status">Sources: <a href="https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/US_Electric_Power_Transmission_Lines/FeatureServer" target="_blank" rel="noopener" style="color:#a3e8ff">HIFLD-derived lines</a> · <a href="https://www.fcc.gov/wireless/universal-licensing-system" target="_blank" rel="noopener" style="color:#a3e8ff">FCC ASR</a>. Route coverage is U.S.-focused; FCC ASR is not a complete global cell-tower inventory.</div>';
 const $=q=>ui.querySelector(q),toggle=$('[data-toggle]'),status=$('[data-status]'),powerCount=$('[data-power-count]'),towerCount=$('[data-tower-count]');
 let dead=false,mountTimer=null,mountTries=0,refreshTimer=null,requestSeq=0,abortCtl=null,threePromise=null,scene=null,renderer=null,layer3d=null,projectionBefore=null,projectionChanged=false;
 const originalPaint=new Map(),volumeObjects=[];
 function say(msg){status.textContent=msg}
 function addSrc(id,data){if(!map.getSource(id))map.addSource(id,{type:'geojson',data,buffer:64,maxzoom:16});else map.getSource(id).setData(data)}
 function setLayerVisibility(id,on){try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}}
 function remove3d(){
  if(scene)for(const o of [...scene.children]){scene.remove(o);try{o.geometry?.dispose?.()}catch(_){};for(const m of(Array.isArray(o.material)?o.material:[o.material]))try{m?.dispose?.()}catch(_){}}
  try{if(map.getLayer(VOLUME_LAYER))map.removeLayer(VOLUME_LAYER)}catch(_){}
  try{renderer?.dispose?.()}catch(_){}
  scene=null;renderer=null;layer3d=null;volumeObjects.length=0;
 }
 function restoreProjection(){
  if(projectionChanged&&projectionBefore)try{map.setProjection?.({type:projectionBefore})}catch(_){}
  projectionChanged=false;projectionBefore=null;
 }
 function syncProjection(){
  if(!state.enabled)return;
  const zoom=Number(map.getZoom?.()||0),type=map.getProjection?.()?.type||'mercator';
  if(projectionBefore==null)projectionBefore=type;
  if(zoom>=7.5&&projectionBefore==='globe'&&type!=='mercator'){try{map.setProjection?.({type:'mercator'});projectionChanged=true}catch(_){}}
  else if(zoom<7.5&&projectionChanged){try{map.setProjection?.({type:projectionBefore});projectionChanged=false}catch(_){}}
 }
 async function loadThree(){if(!threePromise)threePromise=import(THREE_URL).then(m=>m.default||m).catch(e=>{threePromise=null;throw e});return threePromise}
 function meterUnit(coord){return window.maplibregl.MercatorCoordinate.fromLngLat({lng:coord[0],lat:coord[1]},0).meterInMercatorCoordinateUnits()}
 function mcPoint(THREE,coord,zMeters=0){
  const c=window.maplibregl.MercatorCoordinate.fromLngLat({lng:Number(coord[0]),lat:Number(coord[1])},zMeters);
  return new THREE.Vector3(c.x,c.y,c.z);
 }
 function voltageMeters(props){
  const v=cleanNumber(props?.VOLTAGE),cls=String(props?.VOLT_CLASS||'');
  if(v!==null&&v>0&&v<1000)return v>=500?48:v>=230?39:v>=100?31:24;
  if(/500|765/.test(cls))return 48;if(/230|345/.test(cls))return 39;return 30;
 }
 function addTowerWire(wire,coord,height,spanWidth,THREE){
  const base=mcPoint(THREE,coord,0),scale=meterUnit(coord);
  const topZ=height*scale,half=spanWidth*scale*.5;
  const pts=[];
  const add=(a,b)=>{pts.push(a.x,a.y,a.z,b.x,b.y,b.z)};
  const mk=(x,y,z)=>new THREE.Vector3(base.x+x,base.y+y,base.z+z);
  const foot=height*scale;
  const legs=[[ -half,-half],[half,-half],[half,half],[-half,half]];
  for(let i=0;i<4;i++){const a=legs[i],b=legs[(i+1)%4];add(mk(a[0],a[1],0),mk(b[0],b[1],0));add(mk(a[0],a[1],0),mk(a[0]*.35,a[1]*.35,foot))}
  for(const frac of [.38,.64,.84]){const z=foot*frac;add(mk(-half*.65,-half*.65,z),mk(half*.65,half*.65,z));add(mk(half*.65,-half*.65,z),mk(-half*.65,half*.65,z))}
  for(const frac of [.72,.9]){const z=foot*frac,w=half*(frac>.8?1.35:1.7);add(mk(-w,0,z),mk(w,0,z));for(const x of [-w,0,w])add(mk(x,0,z),mk(x,0,z-foot*.06))}
  wire.push(...pts);
 }
 function build3DGeometry(THREE,power,towers,zoom){
  if(!scene)return;
  for(const o of [...scene.children]){scene.remove(o);try{o.geometry?.dispose?.()}catch(_){};for(const m of(Array.isArray(o.material)?o.material:[o.material]))try{m?.dispose?.()}catch(_){}}
  const towerLines=[],wireLines=[];
  let towerN=0,spanN=0;
  const spacing=zoom>=12?420:zoom>=10?700:1050,voltageDefault=30;
  for(const f of power.features||[]){
   if(towerN>=260||spanN>=800)break;
   const route=f?.geometry?.type==='LineString'?f.geometry.coordinates:null;
   if(!route||route.length<2)continue;
   const props=f.properties||{},height=voltageMeters(props),sample=sampleRoute(route,spacing,Math.min(90,Math.max(4,Math.ceil(route.length*1.5))));
   if(sample.length<2)continue;
   for(let i=0;i<sample.length;i++){
    if(towerN>=260)break;
    const at=sample[i];addTowerWire(towerLines,at,height,Math.max(12,height*.65),THREE);towerN++;
    if(i===sample.length-1||spanN>=800)continue;
    const next=sample[i+1],distance=metreDistance(at,next);if(distance<20)continue;
    const lat=(at[1]+next[1])*.5*Math.PI/180,dx=(next[0]-at[0])*111320*Math.cos(lat),dy=(next[1]-at[1])*110540,n=Math.hypot(dx,dy)||1;
    for(const lane of [-1,0,1]){
     const count=Math.min(9,Math.max(4,Math.ceil(distance/170))),sag=Math.min(18,Math.max(3,distance*.018)),a=distance*distance/(8*sag),offset=lane*2.2;
     let previousPoint=null;
     for(let j=0;j<=count;j++){
      const t=j/count;
      const lng=at[0]+(next[0]-at[0])*t+(-dy/n)*(offset/(111320*Math.max(.08,Math.cos(lat))));
      const latv=at[1]+(next[1]-at[1])*t+(dx/n)*(offset/110540);
      const z=height+a*(Math.cosh((t-.5)*distance/a)-Math.cosh(distance/(2*a)));
      const pt=mcPoint(THREE,[lng,latv],z);
      if(j>0&&previousPoint)wireLines.push(previousPoint.x,previousPoint.y,previousPoint.z,pt.x,pt.y,pt.z);
      previousPoint=pt;
     }
    }
    spanN++;
   }
  }
  for(const f of towers.features||[]){
   if(towerN>=300)break;
   if(f?.geometry?.type!=='Point')continue;
   const c=f.geometry.coordinates,p=f.properties||{},raw=cleanNumber(p.STRUCHT),height=raw&&raw>0?Math.min(300,raw):35;
   addTowerWire(towerLines,c,height,Math.max(9,height*.28),THREE);towerN++;
  }
  if(towerLines.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(towerLines,3));const o=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xffc25d,transparent:true,opacity:.85,depthTest:false}));o.renderOrder=920;scene.add(o)}
  if(wireLines.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(wireLines,3));const o=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xffefbb,transparent:true,opacity:.95,depthTest:false}));o.renderOrder=921;scene.add(o)}
  state.volume={towers:towerN,catenarySpans:spanN,meshes:scene.children.length,updatedAt:Date.now()};
 }
 function ensure3DLayer(THREE){
  if(map.getLayer(VOLUME_LAYER)&&scene)return true;
  const layer={id:VOLUME_LAYER,type:'custom',renderingMode:'3d',
   onAdd:(m,gl)=>{const r=new THREE.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:false,alpha:true});r.autoClear=false;renderer=r;scene=new THREE.Scene();layer.camera=new THREE.Camera();layer.renderer=r;layer.scene=scene},
   render:(gl,args)=>{if(!layer.renderer||!layer.scene||!layer.camera)return;const matrix=args?.defaultProjectionData?.mainMatrix||args?.modelViewProjectionMatrix||args;if(!matrix||typeof matrix.length!=='number'||matrix.length<16)return;layer.camera.projectionMatrix.fromArray(matrix);try{layer.renderer.resetState?.();if(layer.renderer.state?.reset)layer.renderer.state.reset()}catch(_){}layer.renderer.render(layer.scene,layer.camera)},
   onRemove:()=>{try{layer.renderer?.dispose?.()}catch(_){}scene=null;renderer=null;layer3d=null}
  };
  try{map.addLayer(layer);layer3d=layer;return!!scene}catch(e){console.warn('BridgePoint infrastructure volume layer',e);return false}
 }
 function ensure2DLayers(){
  try{
   if(!map.getSource(POWER_SRC))map.addSource(POWER_SRC,{type:'geojson',data:empty()});
   if(!map.getLayer(POWER_GLOW))map.addLayer({id:POWER_GLOW,type:'line',source:POWER_SRC,minzoom:3.5,maxzoom:17,paint:{'line-color':'#ffb24c','line-opacity':.30,'line-width':['interpolate',['linear'],['zoom'],3.5,.7,6,2,10,3.2,15,4.2],'line-blur':['interpolate',['linear'],['zoom'],3.5,.5,12,1.5]}});
   if(!map.getLayer(POWER_LINE))map.addLayer({id:POWER_LINE,type:'line',source:POWER_SRC,minzoom:3.5,maxzoom:17,paint:{'line-color':'#ffd889','line-opacity':.96,'line-width':['interpolate',['linear'],['zoom'],3.5,.25,6,.7,10,1.1,15,1.8]}});
   if(!map.getSource(TOWER_SRC))map.addSource(TOWER_SRC,{type:'geojson',data:empty(),maxzoom:14});
   if(!map.getLayer(TOWER_DOTS))map.addLayer({id:TOWER_DOTS,type:'circle',source:TOWER_SRC,minzoom:3,maxzoom:17,paint:{'circle-radius':['interpolate',['linear'],['zoom'],3,1.8,6,3,10,5,15,7],'circle-color':'#fff0bd','circle-opacity':.95,'circle-stroke-color':'#ffac42','circle-stroke-width':1.3}});
   return true;
  }catch(e){console.warn('BridgePoint infrastructure 2D layers',e);return false}
 }
 async function refresh(){
  if(dead||!state.enabled)return;
  const zoom=Number(map.getZoom?.()||0),b=map.getBounds?.();if(!b)return;
  if(abortCtl)abortCtl.abort();abortCtl=new AbortController();const seq=++requestSeq;
  if(zoom<3.2){
   // Keep the globe light: report source sizes; load the actual viewport geometries only after regional zoom.
   try{
    const counts=await Promise.all([
     fetch(queryUrl(POWER_URL,{where:'1=1',returnCountOnly:true,f:'json'}),{signal:abortCtl.signal,cache:'force-cache'}).then(r=>r.json()),
     fetch(queryUrl(FCC_URL,{where:'1=1',returnCountOnly:true,f:'json'}),{signal:abortCtl.signal,cache:'force-cache'}).then(r=>r.json())
    ]);
    if(seq!==requestSeq||dead)return;
    powerCount.textContent=Number(counts[0]?.count||0).toLocaleString();
    towerCount.textContent=Number(counts[1]?.count||0).toLocaleString();
    say('Global inventory counts from live source services. Zoom in to load visible route geometry and FCC registered structures. Towers are not equivalent to every cell site; 3D tower frames and conductor sag are schematic where exact construction/attachment data are absent.');
   }catch(e){if(e?.name!=='AbortError')say('Global source counts temporarily unavailable. Zoom in to query visible infrastructure area.')}
   if(POWER_SRC&&map.getSource(POWER_SRC))map.getSource(POWER_SRC).setData(empty());
   if(map.getSource(TOWER_SRC))map.getSource(TOWER_SRC).setData(empty());
   remove3d();return;
  }
  const bounds=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].map(Number);
  const normalized=[Math.max(-179.999,bounds[0]),Math.max(-85,bounds[1]),Math.min(179.999,bounds[2]),Math.min(85,bounds[3])];
  if(normalized[0]>=normalized[2]||normalized[1]>=normalized[3])return;
  syncProjection();
  say('Loading viewport-specific transmission routes and FCC antenna structures…');
  try{
   const [p,t]=await Promise.all([
    requestFeatures(POWER_URL,normalized,'OBJECTID,ID,TYPE,STATUS,VOLTAGE,VOLT_CLASS,OWNER,SOURCEDATE,VAL_DATE,INFERRED',500,abortCtl.signal),
    requestFeatures(FCC_URL,normalized,'OBJECTID,REGNUM,ENTITY,STRUCHT,STRUCADD,STRUCCITY,STRUCSTATE,CONTNAME,CONTSTATE,FAASTUDY',500,abortCtl.signal)
   ]);
   if(seq!==requestSeq||dead)return;
   const pf=(p.features||[]).filter(f=>f?.geometry?.type==='LineString'||f?.geometry?.type==='MultiLineString');
   const tf=(t.features||[]).filter(f=>f?.geometry?.type==='Point');
   const pData={type:'FeatureCollection',features:pf},tData={type:'FeatureCollection',features:tf};
   if(!ensure2DLayers())throw new Error('Map style cannot install infrastructure layers');
   map.getSource(POWER_SRC)?.setData(pData);map.getSource(TOWER_SRC)?.setData(tData);
   state.powerFeatures=pf.length;state.towerFeatures=tf.length;state.updatedAt=Date.now();
   powerCount.textContent=pf.length.toLocaleString();towerCount.textContent=tf.length.toLocaleString();
   if(zoom>=7.5){
    const THREE=await loadThree();if(seq!==requestSeq||dead)return;
    if(!ensure3DLayer(THREE))throw new Error('3D infrastructure renderer could not attach');
    build3DGeometry(THREE,pData,tData,zoom);
    try{map.triggerRepaint?.()}catch(_){}
   }else remove3d();
   const exceeded=!!p.properties?.exceededTransferLimit||!!t.properties?.exceededTransferLimit;
   say('Loaded '+pf.length.toLocaleString()+' transmission routes and '+tf.length.toLocaleString()+' FCC antenna structures for this viewport'+(exceeded?' (source result limit reached; pan/zoom to inspect each area)':'')+'. 3D lattice silhouettes and sag use estimates where the source does not give pylon locations, conductor height or physical tension.');
  }catch(e){if(e?.name==='AbortError')return;say('Infrastructure source request failed: '+String(e?.message||e).slice(0,140));console.warn('BridgePoint infrastructure fetch',e)}
 }
 function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>void refresh(),380)}
 function sync(){
  toggle.setAttribute('aria-pressed',String(state.enabled));toggle.textContent=state.enabled?'⚡ POWER LINES + 3D TOWERS · ON':'⚡ POWER LINES + 3D TOWERS · OFF';
 }
 function mount(){const slot=document.querySelector('#bpv-underground-slot')||document.querySelector('#bpv-satellite-slot')||document.querySelector('#bpv-dock');if(slot){if(ui.parentElement!==slot)slot.appendChild(ui);ui.hidden=false;return}ui.hidden=true;if(++mountTries<120)mountTimer=setTimeout(mount,180);else{ui.hidden=false;container.appendChild(ui)}}
 function close(){state.enabled=false;sync();if(abortCtl)abortCtl.abort();clearTimeout(refreshTimer);remove3d();for(const id of [POWER_GLOW,POWER_LINE,TOWER_DOTS])setLayerVisibility(id,false);restoreProjection();if(map.getSource(POWER_SRC))map.getSource(POWER_SRC).setData(empty());if(map.getSource(TOWER_SRC))map.getSource(TOWER_SRC).setData(empty());say('Off. Infrastructure geometry is unloaded; source services remain available to query on demand.');return state}
 toggle.addEventListener('click',()=>{
  state.enabled=!state.enabled;sync();
  if(state.enabled){if(!ensure2DLayers())say('Map style is loading; the infrastructure layers will retry when ready.');for(const id of [POWER_GLOW,POWER_LINE,TOWER_DOTS])setLayerVisibility(id,true);scheduleRefresh()}
  else close();
 });
 const onMap=()=>{if(state.enabled)scheduleRefresh()};
 const onStyle=()=>{if(state.enabled){ensure2DLayers();scheduleRefresh()}};
 map.on('moveend',onMap);map.on('zoomend',onMap);map.on('styledata',onStyle);map.on('load',onStyle);mount();
 state.open=()=>{if(!state.enabled)toggle.click();return state};
 state.close=close;state.toggle=()=>{toggle.click();return state.enabled};
 state.snapshot=()=>({version:VERSION,enabled:state.enabled,powerFeatures:state.powerFeatures,towerFeatures:state.towerFeatures,updatedAt:state.updatedAt,volume:state.volume,source:state.sources,estimates:state.estimates});
 state.destroy=()=>{dead=true;close();clearTimeout(mountTimer);map.off('moveend',onMap);map.off('zoomend',onMap);map.off('styledata',onStyle);map.off('load',onStyle);ui.remove();for(const id of [POWER_GLOW,POWER_LINE,TOWER_DOTS])try{if(map.getLayer(id))map.removeLayer(id)}catch(_){};try{if(map.getSource(POWER_SRC))map.removeSource(POWER_SRC);if(map.getSource(TOWER_SRC))map.removeSource(TOWER_SRC)}catch(_){}};
 return state;
}
