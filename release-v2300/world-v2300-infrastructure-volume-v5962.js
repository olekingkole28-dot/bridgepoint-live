const VERSION=5970;
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
 if(!map||!container||typeof fetch!=='function'||typeof map.transform?.getMatrixForModel!=='function')return null;
 if(window.__BP_INFRASTRUCTURE_VOLUME_V5962__?.map===map)return window.__BP_INFRASTRUCTURE_VOLUME_V5962__;
 const state={version:VERSION,map,enabled:true,available:true,powerFeatures:0,towerFeatures:0,updatedAt:null,status:'Initializing globe-anchored power-grid and close-zoom FCC tower geometry…',volume:{towers:0,catenarySpans:0,meshes:0,solidTowerMeshes:0,solidCableMeshes:0,groundAnchored:true},sources:{power:'U.S. Electric Power Transmission Lines, HIFLD-derived ArcGIS FeatureServer',towers:'FCC Antenna Structure Registration extract, ArcGIS FeatureServer layer 45'},estimates:{towerPositions:'models sampled along source-mapped routes because the feed does not publish surveyed pylon coordinates',sag:'existing procedural catenary profile retained; conductor tension and attachment measurements are not supplied by the route feed',grounding:'tower bases and conductor height baselines use the active exaggerated DEM elevation when available',towerHeight:'FCC STRUCHT overall height is treated as source-reported meters above ground; missing or out-of-range heights are not replaced with invented tower heights'}};
 window.__BP_INFRASTRUCTURE_VOLUME_V5962__=state;
 let dead=false,refreshTimer=null,requestSeq=0,abortCtl=null,threePromise=null,scene=null,renderer=null,layer3d=null;
 function say(msg){state.status=String(msg||'');state.statusUpdatedAt=Date.now()}
 function remove3d(){
  if(scene)for(const o of [...scene.children]){scene.remove(o);try{o.geometry?.dispose?.()}catch(_){};for(const m of(Array.isArray(o.material)?o.material:[o.material]))try{m?.dispose?.()}catch(_){}}
  try{if(map.getLayer(VOLUME_LAYER))map.removeLayer(VOLUME_LAYER)}catch(_){}
  try{renderer?.dispose?.()}catch(_){}
  scene=null;renderer=null;layer3d=null;
 }
 const SOLID_3D_MIN_ZOOM=6.2;
 // FCC antenna structures are kept out of the regional 3D scene.
 // A tiny locator appears only at close zoom, then yields to the recorded-height model.
 const FCC_TOWER_DOTS_MIN_ZOOM=11.5;
 const FCC_TOWER_3D_MIN_ZOOM=13.0;
 const FCC_TOWER_MAX_HEIGHT_M=700;
 function terrainElevation(coord){try{const value=map.queryTerrainElevation?.([Number(coord[0]),Number(coord[1])],{exaggerated:true});return Number.isFinite(Number(value))?Number(value):0}catch(_){return 0}}
 function pushSolidBeam(vertices,a,b,radius,THREE,sides=6){const axis=new THREE.Vector3().subVectors(b,a),length=axis.length();if(!Number.isFinite(length)||length<1e-12||!Number.isFinite(radius)||radius<=0)return;axis.normalize();const reference=Math.abs(axis.z)<.88?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0),u=new THREE.Vector3().crossVectors(axis,reference).normalize(),v=new THREE.Vector3().crossVectors(axis,u).normalize(),ringA=[],ringB=[];for(let i=0;i<sides;i++){const angle=i/sides*Math.PI*2,offset=u.clone().multiplyScalar(Math.cos(angle)*radius).add(v.clone().multiplyScalar(Math.sin(angle)*radius));ringA.push(a.clone().add(offset));ringB.push(b.clone().add(offset))}const push=p=>vertices.push(p.x,p.y,p.z);for(let i=0;i<sides;i++){const j=(i+1)%sides,a0=ringA[i],a1=ringA[j],b0=ringB[i],b1=ringB[j];push(a0);push(a1);push(b1);push(a0);push(b1);push(b0);push(a);push(a1);push(a0);push(b);push(b0);push(b1)}}
 async function loadThree(){if(!threePromise)threePromise=import(THREE_URL).then(m=>m.default||m).catch(e=>{threePromise=null;throw e});return threePromise}
 function modelMatrixFor(THREE,coord,elevationM){
  try{
   const raw=map.transform?.getMatrixForModel?.([Number(coord[0]),Number(coord[1])],Number(elevationM)||0);
   if(!raw||raw.length<16)return null;
   return new THREE.Matrix4().fromArray(raw);
  }catch(_){return null}
 }
 function makeUnitTowerGeometry(THREE){
  const vertices=[],half=.5,legs=[[-half,0,-half],[half,0,-half],[half,0,half],[-half,0,half]];
  const point=(x,y,z)=>new THREE.Vector3(x,y,z);
  const main=(a,b)=>pushSolidBeam(vertices,a,b,.028,THREE,6);
  const brace=(a,b)=>pushSolidBeam(vertices,a,b,.016,THREE,6);
  const arm=(a,b)=>pushSolidBeam(vertices,a,b,.023,THREE,6);
  for(let i=0;i<4;i++){
   const a=legs[i],b=legs[(i+1)%4];
   main(point(a[0],0,a[2]),point(b[0],0,b[2]));
   main(point(a[0],0,a[2]),point(a[0]*.35,1,a[2]*.35));
  }
  for(const frac of [.38,.64,.84]){
   const y=frac;
   brace(point(-half*.65,y,-half*.65),point(half*.65,y,half*.65));
   brace(point(half*.65,y,-half*.65),point(-half*.65,y,half*.65));
  }
  for(const frac of [.72,.9]){
   const y=frac,w=half*(frac>.8?1.7:1.35);
   arm(point(-w,y,0),point(w,y,0));
   for(const x of [-w,0,w])brace(point(x,y,0),point(x,y-.06,0));
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.computeVertexNormals();
  return geometry;
 }
 function setTowerInstance(mesh,index,coord,height,width,groundM,THREE){
  const model=modelMatrixFor(THREE,coord,groundM);
  if(!model)return false;
  model.multiply(new THREE.Matrix4().makeScale(width,height,width));
  mesh.setMatrixAt(index,model);
  return true;
 }
 function localRouteOffset(anchor,coord){
  const cosLat=Math.max(.08,Math.cos(Number(anchor[1])*Math.PI/180));
  return[(Number(coord[0])-Number(anchor[0]))*111320*cosLat,(Number(coord[1])-Number(anchor[1]))*110540];
 }
 function addCableChunk(THREE,anchor,anchorGround,sample,groundValues,start,end,height,material){
  const vertices=[];
  for(let i=start;i<end;i++){
   const at=sample[i],next=sample[i+1],distance=metreDistance(at,next);
   if(!Number.isFinite(distance)||distance<20)continue;
   const midLat=(Number(at[1])+Number(next[1]))*.5*Math.PI/180;
   const dx=(Number(next[0])-Number(at[0]))*111320*Math.cos(midLat);
   const dy=(Number(next[1])-Number(at[1]))*110540,n=Math.hypot(dx,dy)||1;
   const atOffset=localRouteOffset(anchor,at),groundAt=groundValues[i],groundNext=groundValues[i+1];
   const sag=Math.min(18,Math.max(3,distance*.018)),a=distance*distance/(8*sag);
   for(const lane of [-1,0,1]){
    const offset=lane*2.2,count=Math.min(9,Math.max(4,Math.ceil(distance/170)));
    let previous=null;
    for(let j=0;j<=count;j++){
     const t=j/count;
     const east=atOffset[0]+dx*t+(-dy/n)*offset;
     const north=atOffset[1]+dy*t+(dx/n)*offset;
     const sagOffset=a*(Math.cosh((t-.5)*distance/a)-Math.cosh(distance/(2*a)));
     const y=(groundAt-anchorGround)+(groundNext-groundAt)*t+height+sagOffset;
     const current=new THREE.Vector3(east,y,-north);
     if(previous)pushSolidBeam(vertices,previous,current,.07,THREE,5);
     previous=current;
    }
   }
  }
  if(!vertices.length)return false;
  const model=modelMatrixFor(THREE,anchor,anchorGround);
  if(!model)return false;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);
  mesh.matrix.copy(model);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;mesh.renderOrder=920;
  scene.add(mesh);
  return true;
 }
 function voltageMeters(props){
  const v=cleanNumber(props?.VOLTAGE),cls=String(props?.VOLT_CLASS||'');
  if(v!==null&&v>0&&v<1000)return v>=500?48:v>=230?39:v>=100?31:24;
  if(/500|765/.test(cls))return 48;if(/230|345/.test(cls))return 39;return 30;
 }
 // FCC ASR STRUCHT is overall structure height above ground in meters.
 // Reject missing/invalid measurements instead of inventing a default tower height.
 function fccTowerHeightMeters(props){
  const raw=cleanNumber(props?.Strucht??props?.STRUCHT);
  return raw!==null&&raw>=5&&raw<=FCC_TOWER_MAX_HEIGHT_M?raw:null;
 }
 function build3DGeometry(THREE,power,towers,zoom){
  if(!scene)return;
  for(const o of [...scene.children]){
   if(o.userData?.bpInfrastructureLight)continue;
   scene.remove(o);
   try{o.geometry?.dispose?.()}catch(_){}
   for(const m of(Array.isArray(o.material)?o.material:[o.material]))try{m?.dispose?.()}catch(_){}
  }
  const hemi=new THREE.HemisphereLight(0xffffff,0x52616b,1.15);
  hemi.userData.bpInfrastructureLight=true;scene.add(hemi);
  const key=new THREE.DirectionalLight(0xffffff,1.35);
  key.position.set(-.7,-1,1.8);key.userData.bpInfrastructureLight=true;scene.add(key);

  // Local meter geometry + MapLibre model matrices keep every structure on the sphere.
  // The infrastructure layer must never change the map's configured globe projection.
  const unitTower=makeUnitTowerGeometry(THREE);
  const powerMat=new THREE.MeshStandardMaterial({color:0xffc66f,metalness:.68,roughness:.38,emissive:0x3a2109,side:THREE.DoubleSide});
  const fccMat=new THREE.MeshStandardMaterial({color:0xc9d8df,metalness:.56,roughness:.43,emissive:0x1b2c36,side:THREE.DoubleSide});
  const cableMat=new THREE.MeshStandardMaterial({color:0xfff1c8,metalness:.18,roughness:.34,emissive:0x4a4020,side:THREE.DoubleSide});
  const powerMesh=new THREE.InstancedMesh(unitTower,powerMat,260);
  const fccMesh=new THREE.InstancedMesh(unitTower,fccMat,300);
  powerMesh.count=0;fccMesh.count=0;
  powerMesh.frustumCulled=false;fccMesh.frustumCulled=false;
  powerMesh.renderOrder=920;fccMesh.renderOrder=920;
  let powerTowerN=0,fccTowerN=0,spanN=0,cableMeshN=0;
  const spacing=zoom>=12?420:zoom>=10?700:1050,CABLE_BATCH_SPANS=5;

  for(const f of power.features||[]){
   if(powerTowerN>=260||spanN>=800)break;
   const geometry=f?.geometry;
   const routes=geometry?.type==='LineString'?[geometry.coordinates]:geometry?.type==='MultiLineString'?(geometry.coordinates||[]):[];
   if(!routes.length)continue;
   const props=f.properties||{},towerHeight=voltageMeters(props);
   for(const route of routes){
    if(powerTowerN>=260||spanN>=800)break;
    const sample=sampleRoute(route,spacing,Math.min(90,Math.max(4,Math.ceil(route.length*1.5))));
    if(sample.length<2)continue;
    const groundValues=sample.map(terrainElevation);
    for(let i=0;i<sample.length&&powerTowerN<260;i++){
     if(setTowerInstance(powerMesh,powerTowerN,sample[i],towerHeight,Math.max(12,towerHeight*.65),groundValues[i],THREE))powerTowerN++;
    }
    for(let start=0;start<sample.length-1&&spanN<800;start+=CABLE_BATCH_SPANS){
     const end=Math.min(sample.length-1,start+CABLE_BATCH_SPANS),anchor=sample[start],anchorGround=groundValues[start];
     if(addCableChunk(THREE,anchor,anchorGround,sample,groundValues,start,end,towerHeight,cableMat))cableMeshN++;
     for(let i=start;i<end;i++)if(metreDistance(sample[i],sample[i+1])>=20)spanN++;
    }
   }
  }

  if(powerTowerN>0){
   powerMesh.count=powerTowerN;powerMesh.instanceMatrix.needsUpdate=true;scene.add(powerMesh);
  }else powerMat.dispose();
  if(zoom>=FCC_TOWER_3D_MIN_ZOOM){
   for(const f of towers.features||[]){
    if(powerTowerN+fccTowerN>=300)break;
    if(f?.geometry?.type!=='Point')continue;
    const coord=f.geometry.coordinates,props=f.properties||{},height=fccTowerHeightMeters(props);
    if(height===null)continue;
    const width=Math.max(4,Math.min(42,height*.10)),ground=terrainElevation(coord);
    if(setTowerInstance(fccMesh,fccTowerN,coord,height,width,ground,THREE))fccTowerN++;
   }
  }
  if(fccTowerN>0){
   fccMesh.count=fccTowerN;fccMesh.instanceMatrix.needsUpdate=true;scene.add(fccMesh);
  }else fccMat.dispose();
  if(powerTowerN+fccTowerN===0)unitTower.dispose();
  state.volume={
   towers:powerTowerN+fccTowerN,powerRouteTowerModels:powerTowerN,fccTowerModels:fccTowerN,
   fccTowerMinZoom:FCC_TOWER_3D_MIN_ZOOM,catenarySpans:spanN,
   meshes:(powerTowerN?1:0)+(fccTowerN?1:0)+cableMeshN,
   solidTowerMeshes:(powerTowerN?1:0)+(fccTowerN?1:0),solidCableMeshes:cableMeshN,
   globeAnchored:true,groundAnchored:true,modelMatrix:'map.transform.getMatrixForModel',
   terrainElevation:'queryTerrainElevation(exaggerated)',updatedAt:Date.now()
  };
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
   if(!map.getLayer(POWER_GLOW))map.addLayer({id:POWER_GLOW,type:'line',source:POWER_SRC,minzoom:1.8,maxzoom:17,paint:{'line-color':'#ffb24c','line-opacity':.30,'line-width':['interpolate',['linear'],['zoom'],1.8,.35,6,2,10,3.2,15,4.2],'line-blur':['interpolate',['linear'],['zoom'],1.8,.3,12,1.5]}});
   if(!map.getLayer(POWER_LINE))map.addLayer({id:POWER_LINE,type:'line',source:POWER_SRC,minzoom:1.8,maxzoom:17,paint:{'line-color':'#ffd889','line-opacity':.96,'line-width':['interpolate',['linear'],['zoom'],1.8,.12,6,.7,10,1.1,15,1.8]}});
   if(!map.getSource(TOWER_SRC))map.addSource(TOWER_SRC,{type:'geojson',data:empty(),maxzoom:14});
   if(!map.getLayer(TOWER_DOTS))map.addLayer({id:TOWER_DOTS,type:'circle',source:TOWER_SRC,minzoom:FCC_TOWER_DOTS_MIN_ZOOM,maxzoom:FCC_TOWER_3D_MIN_ZOOM,paint:{'circle-radius':1.55,'circle-color':'#fff0bd','circle-opacity':.92,'circle-stroke-color':'#ffac42','circle-stroke-width':.75}});
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
    say('Global inventory counts are available. Transmission routes appear from zoom 1.8; power-grid meshes appear from zoom '+SOLID_3D_MIN_ZOOM+'; FCC tower locators appear only from zoom '+FCC_TOWER_DOTS_MIN_ZOOM+' and true-height FCC tower models from zoom '+FCC_TOWER_3D_MIN_ZOOM+'.');
   }catch(e){if(e?.name!=='AbortError')say('Global source counts temporarily unavailable. Zoom in to query visible infrastructure area.')}
   if(POWER_SRC&&map.getSource(POWER_SRC))map.getSource(POWER_SRC).setData(empty());
   if(map.getSource(TOWER_SRC))map.getSource(TOWER_SRC).setData(empty());
   remove3d();return;
  }
  const bounds=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].map(Number);
  const normalized=[Math.max(-179.999,bounds[0]),Math.max(-85,bounds[1]),Math.min(179.999,bounds[2]),Math.min(85,bounds[3])];
  if(normalized[0]>=normalized[2]||normalized[1]>=normalized[3])return;
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
   say('Loaded '+pf.length.toLocaleString()+' mapped transmission routes and '+tf.length.toLocaleString()+' FCC structures for this viewport'+(exceeded?' (source result limit reached; pan/zoom to inspect each area)':'')+'. Existing conductor sag is retained as solid thin cable geometry; power-grid beams remain terrain-rooted. FCC structures stay hidden until close zoom and use recorded AGL heights.');
  }catch(e){if(e?.name==='AbortError')return;say('Infrastructure source request failed: '+String(e?.message||e).slice(0,140));console.warn('BridgePoint infrastructure fetch',e)}
 }
 function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>void refresh(),380)}
 const onMap=()=>{if(state.enabled)scheduleRefresh()};const onStyle=()=>{if(state.enabled){ensure2DLayers();scheduleRefresh()}};const onTerrainData=e=>{if(state.enabled&&e?.sourceId==='dem'&&e.isSourceLoaded)scheduleRefresh()};map.on('moveend',onMap);map.on('zoomend',onMap);map.on('styledata',onStyle);map.on('load',onStyle);map.on('sourcedata',onTerrainData);if(map.isStyleLoaded?.()){ensure2DLayers();scheduleRefresh()}state.refresh=()=>scheduleRefresh();state.snapshot=()=>({version:VERSION,enabled:state.enabled,powerFeatures:state.powerFeatures,towerFeatures:state.towerFeatures,globalPowerCount:state.globalPowerCount||null,globalTowerCount:state.globalTowerCount||null,updatedAt:state.updatedAt,status:state.status,volume:state.volume,source:state.sources,estimates:state.estimates});state.destroy=()=>{dead=true;if(abortCtl)abortCtl.abort();clearTimeout(refreshTimer);remove3d();map.off('moveend',onMap);map.off('zoomend',onMap);map.off('styledata',onStyle);map.off('load',onStyle);map.off('sourcedata',onTerrainData);for(const id of [POWER_GLOW,POWER_LINE,TOWER_DOTS])try{if(map.getLayer(id))map.removeLayer(id)}catch(_){};try{if(map.getSource(POWER_SRC))map.removeSource(POWER_SRC);if(map.getSource(TOWER_SRC))map.removeSource(TOWER_SRC)}catch(_){}};
 return state;
}
