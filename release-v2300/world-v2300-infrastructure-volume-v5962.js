const VERSION=5968;
const POWER_URL='https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/US_Electric_Power_Transmission_Lines/FeatureServer/0/query';
const FCC_URL='https://services.arcgis.com/XG15cJAlne2vxtgt/ArcGIS/rest/services/Antenna_Structure_Registrate1/FeatureServer/45/query';
const POWER_SRC='bp-infra-power-source-v5962',TOWER_SRC='bp-infra-fcc-tower-source-v5962';
const POWER_LINE='bp-infra-power-route-v5962',POWER_GLOW='bp-infra-power-glow-v5962',TOWER_DOTS='bp-infra-fcc-tower-dots-v5962',VOLUME_LAYER='bp-infra-volume-custom-v5962';
const THREE_URL='./vendor/three.module.js?v=169-local';
const EMPTY={type:'FeatureCollection',features:[]};
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
 const state={version:VERSION,map,enabled:true,available:true,powerFeatures:0,towerFeatures:0,updatedAt:null,status:'Initializing automatic power-grid geometry…',volume:{towers:0,catenarySpans:0,meshes:0,solidTowerMeshes:0,solidCableMeshes:0,groundAnchored:true},sources:{power:'U.S. Electric Power Transmission Lines, HIFLD-derived ArcGIS FeatureServer',towers:'FCC Antenna Structure Registration extract, ArcGIS FeatureServer layer 45'},estimates:{towerPositions:'models sampled along source-mapped routes because the feed does not publish surveyed pylon coordinates',sag:'existing procedural catenary profile retained; conductor tension and attachment measurements are not supplied by the route feed',grounding:'tower bases and conductor height baselines use the active exaggerated DEM elevation when available',towerHeight:'existing voltage-derived tower heights and FCC STRUCHT visual inputs retained; FCC layer metadata does not document STRUCHT units'}};
 window.__BP_INFRASTRUCTURE_VOLUME_V5962__=state;
 let dead=false,refreshTimer=null,requestSeq=0,abortCtl=null,threePromise=null,scene=null,renderer=null,layer3d=null,projectionBefore=null,projectionChanged=false;
 function say(msg){state.status=String(msg||'');state.statusUpdatedAt=Date.now()}
 function remove3d(){
  if(scene)for(const o of [...scene.children]){scene.remove(o);try{o.geometry?.dispose?.()}catch(_){};for(const m of(Array.isArray(o.material)?o.material:[o.material]))try{m?.dispose?.()}catch(_){}}
  try{if(map.getLayer(VOLUME_LAYER))map.removeLayer(VOLUME_LAYER)}catch(_){}
  try{renderer?.dispose?.()}catch(_){}
  scene=null;renderer=null;layer3d=null;
 }
 function restoreProjection(){
  if(projectionChanged&&projectionBefore)try{map.setProjection?.({type:projectionBefore})}catch(_){}
  projectionChanged=false;projectionBefore=null;
 }
 const SOLID_3D_MIN_ZOOM=6.2;
 function syncProjection(){if(!state.enabled)return;const zoom=Number(map.getZoom?.()||0),type=map.getProjection?.()?.type||'mercator';if(projectionBefore==null)projectionBefore=type;if(zoom>=SOLID_3D_MIN_ZOOM&&projectionBefore==='globe'&&type!=='mercator'){try{map.setProjection?.({type:'mercator'});projectionChanged=true}catch(_){}}else if(zoom<SOLID_3D_MIN_ZOOM&&projectionChanged){try{map.setProjection?.({type:projectionBefore});projectionChanged=false}catch(_){}}}
 function terrainElevation(coord){try{const value=map.queryTerrainElevation?.([Number(coord[0]),Number(coord[1])],{exaggerated:true});return Number.isFinite(Number(value))?Number(value):0}catch(_){return 0}}
 function pushSolidBeam(vertices,a,b,radius,THREE,sides=6){const axis=new THREE.Vector3().subVectors(b,a),length=axis.length();if(!Number.isFinite(length)||length<1e-12||!Number.isFinite(radius)||radius<=0)return;axis.normalize();const reference=Math.abs(axis.z)<.88?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0),u=new THREE.Vector3().crossVectors(axis,reference).normalize(),v=new THREE.Vector3().crossVectors(axis,u).normalize(),ringA=[],ringB=[];for(let i=0;i<sides;i++){const angle=i/sides*Math.PI*2,offset=u.clone().multiplyScalar(Math.cos(angle)*radius).add(v.clone().multiplyScalar(Math.sin(angle)*radius));ringA.push(a.clone().add(offset));ringB.push(b.clone().add(offset))}const push=p=>vertices.push(p.x,p.y,p.z);for(let i=0;i<sides;i++){const j=(i+1)%sides,a0=ringA[i],a1=ringA[j],b0=ringB[i],b1=ringB[j];push(a0);push(a1);push(b1);push(a0);push(b1);push(b0);push(a);push(a1);push(a0);push(b);push(b0);push(b1)}}
 function addTowerSolid(vertices,coord,height,spanWidth,groundM,THREE){const base=mcPoint(THREE,coord,groundM),scale=meterUnit(coord),half=spanWidth*scale*.5,mk=(x,y,z)=>new THREE.Vector3(base.x+x,base.y+y,base.z+z),foot=height*scale,legs=[[-half,-half],[half,-half],[half,half],[-half,half]],mainBeam=(a,b)=>pushSolidBeam(vertices,a,b,Math.max(.18,.42*scale),THREE,6),braceBeam=(a,b)=>pushSolidBeam(vertices,a,b,Math.max(.12,.24*scale),THREE,6),armBeam=(a,b)=>pushSolidBeam(vertices,a,b,Math.max(.15,.34*scale),THREE,6);for(let i=0;i<4;i++){const a=legs[i],b=legs[(i+1)%4];mainBeam(mk(a[0],a[1],0),mk(b[0],b[1],0));mainBeam(mk(a[0],a[1],0),mk(a[0]*.35,a[1]*.35,foot))}for(const frac of [.38,.64,.84]){const z=foot*frac;braceBeam(mk(-half*.65,-half*.65,z),mk(half*.65,half*.65,z));braceBeam(mk(half*.65,-half*.65,z),mk(-half*.65,half*.65,z))}for(const frac of [.72,.9]){const z=foot*frac,w=half*(frac>.8?1.35:1.7);armBeam(mk(-w,0,z),mk(w,0,z));for(const x of [-w,0,w])braceBeam(mk(x,0,z),mk(x,0,z-foot*.06))}}
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
 function build3DGeometry(THREE,power,towers,zoom){if(!scene)return;for(const o of [...scene.children]){if(o.userData?.bpInfrastructureLight)continue;scene.remove(o);try{o.geometry?.dispose?.()}catch(_){}for(const m of(Array.isArray(o.material)?o.material:[o.material]))try{m?.dispose?.()}catch(_){}}const hemi=new THREE.HemisphereLight(0xffffff,0x52616b,1.15);hemi.userData.bpInfrastructureLight=true;scene.add(hemi);const key=new THREE.DirectionalLight(0xffffff,1.35);key.position.set(-.7,-1,1.8);key.userData.bpInfrastructureLight=true;scene.add(key);const powerTowerVertices=[],fccTowerVertices=[],cableVertices=[];let towerN=0,spanN=0;const spacing=zoom>=12?420:zoom>=10?700:1050;for(const f of power.features||[]){if(towerN>=260||spanN>=800)break;const geometry=f?.geometry,routes=geometry?.type==='LineString'?[geometry.coordinates]:geometry?.type==='MultiLineString'?(geometry.coordinates||[]):[];if(!routes.length)continue;const props=f.properties||{},height=voltageMeters(props);for(const route of routes){if(towerN>=260||spanN>=800)break;const sample=sampleRoute(route,spacing,Math.min(90,Math.max(4,Math.ceil(route.length*1.5))));if(sample.length<2)continue;for(let i=0;i<sample.length;i++){if(towerN>=260)break;const at=sample[i],groundAt=terrainElevation(at);addTowerSolid(powerTowerVertices,at,height,Math.max(12,height*.65),groundAt,THREE);towerN++;if(i===sample.length-1||spanN>=800)continue;const next=sample[i+1],distance=metreDistance(at,next);if(distance<20)continue;const groundNext=terrainElevation(next),lat=(at[1]+next[1])*.5*Math.PI/180,dx=(next[0]-at[0])*111320*Math.cos(lat),dy=(next[1]-at[1])*110540,n=Math.hypot(dx,dy)||1;for(const lane of [-1,0,1]){const count=Math.min(9,Math.max(4,Math.ceil(distance/170))),sag=Math.min(18,Math.max(3,distance*.018)),a=distance*distance/(8*sag),offset=lane*2.2;let previousPoint=null;for(let j=0;j<=count;j++){const t=j/count,lng=at[0]+(next[0]-at[0])*t+(-dy/n)*(offset/(111320*Math.max(.08,Math.cos(lat)))),latv=at[1]+(next[1]-at[1])*t+(dx/n)*(offset/110540),z=groundAt+(groundNext-groundAt)*t+height+a*(Math.cosh((t-.5)*distance/a)-Math.cosh(distance/(2*a))),pt=mcPoint(THREE,[lng,latv],z);if(j>0&&previousPoint)pushSolidBeam(cableVertices,previousPoint,pt,.07*meterUnit([lng,latv]),THREE,5);previousPoint=pt}}spanN++}}}for(const f of towers.features||[]){if(towerN>=300)break;if(f?.geometry?.type!=='Point')continue;const c=f.geometry.coordinates,p=f.properties||{},raw=cleanNumber(p.Strucht??p.STRUCHT),height=raw&&raw>0?Math.min(300,raw):35;addTowerSolid(fccTowerVertices,c,height,Math.max(9,height*.28),terrainElevation(c),THREE);towerN++}const addMesh=(vertices,color,metalness,roughness,emissive)=>{if(!vertices.length)return 0;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();const material=new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,side:THREE.DoubleSide}),mesh=new THREE.Mesh(g,material);mesh.renderOrder=920;mesh.frustumCulled=false;scene.add(mesh);return 1};const towerMeshes=addMesh(powerTowerVertices,0xffc66f,.68,.38,0x3a2109)+addMesh(fccTowerVertices,0xc9d8df,.56,.43,0x1b2c36),cableMeshes=addMesh(cableVertices,0xfff1c8,.18,.34,0x4a4020);state.volume={towers:towerN,catenarySpans:spanN,meshes:towerMeshes+cableMeshes,solidTowerMeshes:towerMeshes,solidCableMeshes:cableMeshes,groundAnchored:true,terrainElevation:'queryTerrainElevation(exaggerated)',updatedAt:Date.now()}}
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
   if(!map.getLayer(POWER_GLOW))map.addLayer({id:POWER_GLOW,type:'line',source:POWER_SRC,minzoom:1.8,maxzoom:17,paint:{'line-color':'#ffb24c','line-opacity':.30,'line-width':['interpolate',['linear'],['zoom'],1.8,.35,6,2,10,3.2,15,4.2],'line-blur':['interpolate',['linear'],['zoom'],1.8,.3,12,1.5]}});
   if(!map.getLayer(POWER_LINE))map.addLayer({id:POWER_LINE,type:'line',source:POWER_SRC,minzoom:1.8,maxzoom:17,paint:{'line-color':'#ffd889','line-opacity':.96,'line-width':['interpolate',['linear'],['zoom'],1.8,.12,6,.7,10,1.1,15,1.8]}});
   if(!map.getSource(TOWER_SRC))map.addSource(TOWER_SRC,{type:'geojson',data:empty(),maxzoom:14});
   if(!map.getLayer(TOWER_DOTS))map.addLayer({id:TOWER_DOTS,type:'circle',source:TOWER_SRC,minzoom:1.8,maxzoom:17,paint:{'circle-radius':['interpolate',['linear'],['zoom'],3,1.8,6,3,10,5,15,7],'circle-color':'#fff0bd','circle-opacity':.95,'circle-stroke-color':'#ffac42','circle-stroke-width':1.3}});
   return true;
  }catch(e){console.warn('BridgePoint infrastructure 2D layers',e);return false}
 }
 async function refresh(){
  if(dead||!state.enabled)return;
  const zoom=Number(map.getZoom?.()||0),b=map.getBounds?.();if(!b)return;
  if(abortCtl)abortCtl.abort();abortCtl=new AbortController();const seq=++requestSeq;
  if(zoom<1.8){
   // Keep the globe light: report source sizes; load the actual viewport geometries only after regional zoom.
   try{
    const counts=await Promise.all([
     fetch(queryUrl(POWER_URL,{where:'1=1',returnCountOnly:true,f:'json'}),{signal:abortCtl.signal,cache:'force-cache'}).then(r=>r.json()),
     fetch(queryUrl(FCC_URL,{where:'1=1',returnCountOnly:true,f:'json'}),{signal:abortCtl.signal,cache:'force-cache'}).then(r=>r.json())
    ]);
    if(seq!==requestSeq||dead)return;
    say('Global inventory counts are available. Transmission route geometry appears from zoom 1.8; solid terrain-anchored tower and catenary meshes appear from zoom '+SOLID_3D_MIN_ZOOM+'.');
   }catch(e){if(e?.name!=='AbortError')say('Global source counts temporarily unavailable. Zoom in to query visible infrastructure area.')}
   if(POWER_SRC&&map.getSource(POWER_SRC))map.getSource(POWER_SRC).setData(empty());
   if(map.getSource(TOWER_SRC))map.getSource(TOWER_SRC).setData(empty());
   remove3d();return;
  }
  const bounds=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].map(Number);
  const normalized=[Math.max(-179.999,bounds[0]),Math.max(-85,bounds[1]),Math.min(179.999,bounds[2]),Math.min(85,bounds[3])];
  if(normalized[0]>=normalized[2]||normalized[1]>=normalized[3])return;
  syncProjection();
  say('Loading source-mapped transmission routes and terrain-anchored solid 3D structures…');
  try{
   const [p,t]=await Promise.all([
    requestFeatures(POWER_URL,normalized,'OBJECTID,ID,TYPE,STATUS,VOLTAGE,VOLT_CLASS,OWNER,SOURCEDATE,VAL_DATE,INFERRED',500,abortCtl.signal),
    requestFeatures(FCC_URL,normalized,'OBJECTID,RegNum,Entity,Strucht,LocAdd,LocCity,LocState,ContName,ContState,FAAstudy',500,abortCtl.signal)
   ]);
   if(seq!==requestSeq||dead)return;
   const pf=(p.features||[]).filter(f=>f?.geometry?.type==='LineString'||f?.geometry?.type==='MultiLineString');
   const tf=(t.features||[]).filter(f=>f?.geometry?.type==='Point');
   const pData={type:'FeatureCollection',features:pf},tData={type:'FeatureCollection',features:tf};
   if(!ensure2DLayers())throw new Error('Map style cannot install infrastructure layers');
   map.getSource(POWER_SRC)?.setData(pData);map.getSource(TOWER_SRC)?.setData(tData);
   state.powerFeatures=pf.length;state.towerFeatures=tf.length;state.updatedAt=Date.now();
   if(zoom>=SOLID_3D_MIN_ZOOM){
    const THREE=await loadThree();if(seq!==requestSeq||dead)return;
    if(!ensure3DLayer(THREE))throw new Error('3D infrastructure renderer could not attach');
    build3DGeometry(THREE,pData,tData,zoom);
    try{map.triggerRepaint?.()}catch(_){}
   }else remove3d();
   const exceeded=!!p.properties?.exceededTransferLimit||!!t.properties?.exceededTransferLimit;
   say('Loaded '+pf.length.toLocaleString()+' mapped transmission routes and '+tf.length.toLocaleString()+' FCC structures for this viewport'+(exceeded?' (source result limit reached; pan/zoom to inspect each area)':'')+'. Existing conductor sag is retained as solid thin cable geometry; polygonal tower beams are rooted to terrain elevation.');
  }catch(e){if(e?.name==='AbortError')return;say('Infrastructure source request failed: '+String(e?.message||e).slice(0,140));console.warn('BridgePoint infrastructure fetch',e)}
 }
 function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>void refresh(),380)}
 const onMap=()=>{if(state.enabled)scheduleRefresh()};const onStyle=()=>{if(state.enabled){ensure2DLayers();scheduleRefresh()}};const onTerrainData=e=>{if(state.enabled&&e?.sourceId==='dem'&&e.isSourceLoaded)scheduleRefresh()};map.on('moveend',onMap);map.on('zoomend',onMap);map.on('styledata',onStyle);map.on('load',onStyle);map.on('sourcedata',onTerrainData);if(map.isStyleLoaded?.()){ensure2DLayers();scheduleRefresh()}state.refresh=()=>scheduleRefresh();state.snapshot=()=>({version:VERSION,enabled:state.enabled,powerFeatures:state.powerFeatures,towerFeatures:state.towerFeatures,globalPowerCount:state.globalPowerCount||null,globalTowerCount:state.globalTowerCount||null,updatedAt:state.updatedAt,status:state.status,volume:state.volume,source:state.sources,estimates:state.estimates});state.destroy=()=>{dead=true;if(abortCtl)abortCtl.abort();clearTimeout(refreshTimer);remove3d();restoreProjection();map.off('moveend',onMap);map.off('zoomend',onMap);map.off('styledata',onStyle);map.off('load',onStyle);map.off('sourcedata',onTerrainData);for(const id of [POWER_GLOW,POWER_LINE,TOWER_DOTS])try{if(map.getLayer(id))map.removeLayer(id)}catch(_){};try{if(map.getSource(POWER_SRC))map.removeSource(POWER_SRC);if(map.getSource(TOWER_SRC))map.removeSource(TOWER_SRC)}catch(_){}};
 return state;
}
