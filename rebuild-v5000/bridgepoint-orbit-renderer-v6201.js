// BridgePoint Orbit & Motion 3D renderer v6203.
// Satellite locations and orbital paths are propagated from stored public TLE/OMM records.
// Every model and sampled orbit vertex is transformed with MapLibre's globe-aware model
// matrix so objects remain above the spherical Earth through globe/mercator transitions.
const ORBIT_LAYER='bp-v5926-orbit-3d-models';
const THREE_URL='/vendor/three.module.js?v=169-local';
const WORLD_CIRCUMFERENCE_M=40075016.686;
const PATH_SAMPLES=96;
const MAX_ORBIT_AGE_MS=45*86400000;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function classify(item){
 const n=String(item?.object_name||item?.omm?.OBJECT_NAME||item?.omm?.name||'').toUpperCase();
 const t=String(item?.object_type||item?.omm?.OBJECT_TYPE||'').toUpperCase();
 if(/\b(ISS|TIANGONG|MIR\b|SKYLAB|SPACE STATION|SPACE STATION MODULE)\b/.test(n))return'station';
 if(/\b(DRAGON|SOYUZ|PROGRESS|CYGNUS|SHENZHOU|STARLINER|TIANZHOU|HTV|CREWED|CARGO VEHICLE)\b/.test(n))return'crew';
 if(/\b(ROCKET|R\/B|FREGAT|BREEZE|SL-?\d|ATLAS CENTAUR|ARIANE|SOYUZ R\/B|H-2A R\/B)\b/.test(n)||t.includes('ROCKET'))return'rocket';
 if(/\b(DEB|DEBRIS|FRAGMENT|FRAG)\b/.test(n)||t.includes('DEBRIS'))return'debris';
 if(/\b(CUBESAT|CUBE SAT|3U|6U|12U|LEMUR|DOVE|FLOCK)\b/.test(n))return'cubesat';
 if(/\b(VOYAGER|PIONEER|NEW HORIZONS|CASSINI|JUNO|OSIRIS|INTERPLANETARY|DEEP SPACE|LUNAR RECONNAISSANCE|LRO\b|PROBE)\b/.test(n))return'probe';
 if(/\b(NAVSTAR|GPS\b|GLONASS|GALILEO|BEIDOU|COMPASS NAV)\b/.test(n))return'navigation';
 if(/\b(GOES|NOAA|METOP|LANDSAT|SENTINEL|TERRA|AQUA|SUOMI|JPSS|RADARSAT|COSMO|WORLDVIEW|SPOT\b|EARTH OBSERVATION)\b/.test(n))return'earth';
 if(/\b(STARLINK|ONEWEB|IRIDIUM|GLOBALSTAR|O3B|INTELSAT|EUTELSAT|INMARSAT|SES\b|GALAXY)\b/.test(n))return'communications';
 return'satellite';
}
function metadata(kind){
 return({
  station:{span:110,minPixels:10.5,color:0xffd77c},
  crew:{span:18,minPixels:7.2,color:0xffb77a},
  rocket:{span:24,minPixels:6.8,color:0xff995f},
  debris:{span:7,minPixels:5.2,color:0xb7a8ff},
  cubesat:{span:5,minPixels:6.1,color:0x76e7ff},
  probe:{span:28,minPixels:7.2,color:0xd9b8ff},
  navigation:{span:18,minPixels:6.5,color:0x9effcb},
  earth:{span:25,minPixels:7,color:0x80d7ff},
  communications:{span:26,minPixels:7,color:0xffda85},
  satellite:{span:18,minPixels:6.5,color:0x93f4ff}
 })[kind]||{span:18,minPixels:6.5,color:0x93f4ff};
}
function mergeParts(T,parts){
 const positions=[],normals=[],colors=[],indices=[];let offset=0;
 for(const part of parts){
  const g=part.geometry;
  const matrix=new T.Matrix4().compose(
   new T.Vector3(...part.position),
   new T.Quaternion().setFromEuler(new T.Euler(...part.rotation)),
   new T.Vector3(1,1,1)
  );
  g.applyMatrix4(matrix);g.computeVertexNormals?.();
  const pa=g.getAttribute('position'),na=g.getAttribute('normal'),color=new T.Color(part.color);
  for(let i=0;i<pa.array.length;i++)positions.push(pa.array[i]);
  if(na)for(let i=0;i<na.array.length;i++)normals.push(na.array[i]);
  for(let i=0;i<pa.count;i++)colors.push(color.r,color.g,color.b);
  const idx=g.index?.array;
  if(idx){for(let i=0;i<idx.length;i++)indices.push(offset+idx[i])}
  else for(let i=0;i<pa.count;i++)indices.push(offset+i);
  offset+=pa.count;g.dispose();
 }
 const merged=new T.BufferGeometry();
 merged.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 merged.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
 merged.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 merged.setIndex(indices);merged.computeBoundingSphere();return merged;
}
function makeGeometry(T,kind){
 const parts=[];
 const box=(x,y,z,p,c,r=[0,0,0])=>parts.push({geometry:new T.BoxGeometry(x,y,z),position:p,rotation:r,color:c});
 const cylinder=(radius,length,p,c,r=[0,0,Math.PI/2])=>parts.push({geometry:new T.CylinderGeometry(radius,radius,length,12),position:p,rotation:r,color:c});
 const cone=(radius,length,p,c,r=[0,0,Math.PI/2])=>parts.push({geometry:new T.ConeGeometry(radius,length,12),position:p,rotation:r,color:c});
 if(kind==='station'){
  // Simplified but recognizable orbital station: pressurized modules, central truss,
  // four solar wings, radiators and docking hardware. Dimensions are class-relative.
  box(88,2.5,2.5,[0,0,0],0x9baeb9);box(102,1,1,[0,0,0],0xc8d3d8);
  for(const x of [-22,-12,-2,8,18,28])cylinder(2.05,8,[x,0,0],0xe0e8eb);
  box(1.5,72,1.5,[0,0,0],0xaabac2);
  for(const x of [-28,28])for(const side of [-1,1]){
   box(4,29,.45,[x,side*18,.35],0x1a5e9c);
   box(3.6,27,.12,[x,side*18,.62],0x2b7fc2);
   for(let i=0;i<7;i++)box(3.65,.12,.14,[x,side*(5+i*4),.72],0x75b9ef);
   box(5,1,1,[x,side*32,.1],0xd3dce1);
  }
  for(const x of [-35,-20,0,20,35])box(2,2,5,[x,0,2.1],0xf1f4f5);
  box(11,4,3,[0,0,3],0xe8edf0);
  cylinder(.35,8,[4,2.8,1],0xe9f2f4,[0,Math.PI/2,0]);
 }else if(kind==='rocket'){
  cylinder(1.35,15,[0,0,0],0xadb9c0);
  cone(1.35,4,[9.2,0,0],0xd7e0e4);
  cylinder(1.8,2.5,[-7,0,0],0x7a8891);
  for(const side of [-1,1])box(2.2,.35,2.6,[-6.2,side*1.1,0],0xd28b54,[0,0,side*.25]);
 }else if(kind==='debris'){
  box(3.2,2.2,1.5,[0,0,0],0xa9a4b9,[.3,.2,.35]);
  box(1.8,3.1,.8,[1.1,.4,.6],0x777d92,[.8,.4,.2]);
  box(2.3,.9,2.1,[-.7,-.4,-.4],0xbbb4c9,[.2,.6,.8]);
  cylinder(.5,2,[1.3,-.5,0],0xd6d0de,[.4,.3,.1]);
 }else if(kind==='cubesat'){
  box(1.25,1.25,1.25,[0,0,0],0xb8c3c9);
  box(2.2,1.35,.09,[-1.65,0,0],0x1d65a7);
  box(2.2,1.35,.09,[1.65,0,0],0x1d65a7);
  for(let x=-2.55;x<=2.55;x+=.72)box(.035,1.32,.1,[x,0,.08],0x80c9ee);
  cylinder(.42,.65,[0,.82,0],0xd6e0e5,[Math.PI/2,0,0]);
  cylinder(.08,1.7,[0,1.35,0],0xf0e6b5,[0,0,0]);
 }else if(kind==='crew'){
  // Crew/cargo capsule: blunt heat-shield base, tapered re-entry body and docking ring.
  cylinder(1.45,2.8,[0,0,0],0xe5e9e9);
  cone(1.45,2.6,[2.55,0,0],0xf4f0e6);
  cylinder(1.62,.45,[-1.55,0,0],0x343e48);
  box(2.8,.18,.18,[-.3,0,0],0xc1cbd0);
  for(const side of [-1,1])box(2.2,2.8,.08,[-.25,side*2,.15],0x1c5b91);
 }else if(kind==='probe'){
  // Deep-space probe with high-gain antenna, long science boom and compact bus.
  box(2.8,2.5,2.2,[0,0,0],0xb7c4ca);
  cone(1.9,1.1,[0,2.1,0],0xe8edf0,[Math.PI/2,0,0]);
  cylinder(.12,12,[0,-6.6,0],0xc4d0d6);
  cylinder(1.7,.25,[0,1.55,0],0xdde6eb,[Math.PI/2,0,0]);
  box(5.2,2.6,.1,[-4,0,0],0x1c5c95);
  box(5.2,2.6,.1,[4,0,0],0x1c5c95);
 }else if(kind==='navigation'){
  // Navigation satellite: compact octagonal bus, dual solar wings and antenna booms.
  parts.push({geometry:new T.CylinderGeometry(1.25,1.25,2.3,8),position:[0,0,0],rotation:[0,0,0],color:0xb8c5cc});
  box(4.4,2.3,.1,[-3.8,0,0],0x1c6198);
  box(4.4,2.3,.1,[3.8,0,0],0x1c6198);
  for(let x=-5.8;x<=5.8;x+=.8)box(.05,2.2,.11,[x,0,.08],0x80c9ee);
  for(const y of [-1,1])cylinder(.1,1.8,[0,y*1.6,0],0xe4edf0,[Math.PI/2,0,0]);
 }else if(kind==='earth'){
  // Earth-observation spacecraft with nadir sensor, thermal radiators and broad arrays.
  box(3.4,2.7,2.6,[0,0,0],0xb8c5cc);
  cylinder(.75,2.7,[0,-2.1,0],0xe7edf0);
  cylinder(.48,.55,[0,-3.55,0],0x263f54);
  box(6.2,3.2,.12,[-5.7,0,0],0x1c6198);
  box(6.2,3.2,.12,[5.7,0,0],0x1c6198);
  for(const side of [-1,1])for(let i=0;i<6;i++)box(.06,3.05,.14,[side*(3.1+i*1.02),0,.1],0x80c9ee);
  box(4.4,.28,.35,[0,1.65,0],0xc9d3d8);
 }else if(kind==='communications'){
  // Communications spacecraft with large solar wings, bus, feed horn and high-gain dish.
  box(3.1,2.8,2.6,[0,0,0],0xb8c5cc);
  box(6.2,3.2,.12,[-5.3,0,0],0x174f86);
  box(6.2,3.2,.12,[5.3,0,0],0x174f86);
  for(const side of [-1,1])for(let i=0;i<6;i++)box(.06,3.05,.14,[side*(2.35+i*.98),0,.1],0x78bce9);
  cylinder(1.35,.34,[0,1.8,0],0xe5edf0,[Math.PI/2,0,0]);
  cone(1.15,1.15,[0,2.55,0],0xd1dce1,[Math.PI/2,0,0]);
  cylinder(.12,2.6,[0,3.3,0],0xf0e6b5);
 }else{
  // General spacecraft bus with photovoltaic wings, antenna dish, boom and panel cells.
  box(2.4,2,1.45,[0,0,0],0xb8c5cc);
  box(5.2,2.4,.12,[-3.8,0,0],0x1d65a7);
  box(5.2,2.4,.12,[3.8,0,0],0x1d65a7);
  for(const side of [-1,1])for(let i=0;i<5;i++)box(.06,2.32,.13,[side*(1.55+i*.92),0,.1],0x77bce9);
  cylinder(.72,.45,[0,1.15,.3],0xe1e7eb,[Math.PI/2,0,0]);
  cylinder(.07,1.8,[0,1.75,.3],0xf2e2b1,[0,0,0]);
  box(.12,3.7,.12,[0,-2.1,0],0xd4dde1);
 }
 return mergeParts(T,parts);
}

export async function createOrbitRenderer(map){
 if(!map||!map.getStyle?.())throw new Error('The BridgePoint globe map is not style-ready.');
 const imported=await import(THREE_URL),T=imported.default||imported;
 let renderer=null,scene=null,camera=null,customLayer=null,pathLine=null;
 let dotGeometry=null,dotHaloMaterial=null,dotCoreMaterial=null,dotHaloMesh=null,dotCoreMesh=null,dotCapacity=0;
 let templates=new Map(),lastPositions=[],lastCatalog=[],lastSatApi=null;
 let enabled=true,pathGeneration=0,modelsRendered=0,pathsBuilt=0,disposed=false;
 function modelMatrixFor(lon,lat,altMeters){
  try{
   const raw=map.transform?.getMatrixForModel?.([Number(lon),clamp(Number(lat),-89.9999,89.9999)],Number(altMeters)||0);
   if(!raw||raw.length<16)return null;
   return new T.Matrix4().fromArray(raw);
  }catch(_){return null}
 }
 function globePosition(point){
  const anchor=modelMatrixFor(point.lon,point.lat,point.alt*1000);
  return anchor?new T.Vector3(0,0,0).applyMatrix4(anchor):null;
 }
 function disposeScene(){
  if(pathLine){try{scene?.remove(pathLine);pathLine.geometry?.dispose?.();pathLine.material?.dispose?.()}catch(_){}pathLine=null}
  for(const mesh of [dotHaloMesh,dotCoreMesh]){try{if(mesh)scene?.remove(mesh)}catch(_){}}
  try{dotGeometry?.dispose();dotHaloMaterial?.dispose();dotCoreMaterial?.dispose()}catch(_){}
  dotGeometry=null;dotHaloMaterial=null;dotCoreMaterial=null;dotHaloMesh=null;dotCoreMesh=null;dotCapacity=0;
  for(const entry of templates.values()){try{scene?.remove(entry.mesh);entry.geometry.dispose();entry.material.dispose()}catch(_){}}
  templates.clear();
  if(renderer){try{renderer.dispose()}catch(_){}}
  renderer=null;scene=null;camera=null;customLayer=null;modelsRendered=0;
 }
 function addLayer(){
  if(disposed||!map.getStyle?.())return false;
  if(map.getLayer(ORBIT_LAYER)&&renderer&&scene)return true;
  if(map.getLayer(ORBIT_LAYER)&&(!renderer||!scene)){try{map.removeLayer(ORBIT_LAYER)}catch(_){}}
  const layer={id:ORBIT_LAYER,type:'custom',renderingMode:'3d',
   onAdd:(mapRef,gl)=>{
    const r=new T.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
    r.autoClear=false;r.outputColorSpace=T.SRGBColorSpace;
    const sc=new T.Scene();
    sc.add(new T.AmbientLight(0xffffff,1.55));
    const key=new T.DirectionalLight(0xffffff,2.2);key.position.set(-.7,-.5,1.4);sc.add(key);
    const fill=new T.DirectionalLight(0x78bfff,.85);fill.position.set(.6,.35,.8);sc.add(fill);
    const rim=new T.DirectionalLight(0xffdca3,.5);rim.position.set(.2,.8,-.5);sc.add(rim);
    renderer=r;scene=sc;camera=new T.Camera();customLayer=layer;
    renderModels(lastPositions);
    if(lastCatalog.length&&lastSatApi)void rebuildPaths(lastCatalog,lastSatApi);
   },
   render:(gl,args)=>{
    if(!renderer||!scene||!camera)return;
    const matrix=args?.defaultProjectionData?.mainMatrix||args?.modelViewProjectionMatrix||args;
    if(!matrix||typeof matrix.length!=='number'||matrix.length<16)return;
    camera.projectionMatrix.fromArray(matrix);
    try{renderer.resetState?.();if(renderer.state?.reset)renderer.state.reset()}catch(_){}
    renderer.render(scene,camera);
   },
   onRemove:()=>disposeScene()
  };
  try{map.addLayer(layer);return!!renderer&&!!scene}catch(error){console.warn('BridgePoint orbital 3D layer install failed',error);return false}
 }
 function ensureMesh(kind,capacity){
  let entry=templates.get(kind);if(entry&&entry.capacity>=capacity)return entry;
  if(entry){try{scene?.remove(entry.mesh);entry.geometry.dispose();entry.material.dispose()}catch(_){}templates.delete(kind)}
  const geometry=makeGeometry(T,kind);
  const material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.42,roughness:.48,emissive:0x0b1924,emissiveIntensity:.13,side:T.DoubleSide});
  const mesh=new T.InstancedMesh(geometry,material,Math.max(1,capacity));
  mesh.name='BridgePoint source-derived 3D orbital '+kind+' objects';mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh);
  entry={kind,geometry,material,mesh,capacity:Math.max(1,capacity)};templates.set(kind,entry);return entry;
 }
 function ensureDotMeshes(capacity){
  if(dotHaloMesh&&dotCoreMesh&&dotCapacity>=capacity)return;
  for(const mesh of [dotHaloMesh,dotCoreMesh]){try{if(mesh)scene?.remove(mesh)}catch(_){}}
  try{dotGeometry?.dispose();dotHaloMaterial?.dispose();dotCoreMaterial?.dispose()}catch(_){}
  dotGeometry=new T.SphereGeometry(1,12,8);
  dotHaloMaterial=new T.MeshBasicMaterial({color:0x14dfff,transparent:true,opacity:.38,depthTest:true,depthWrite:false,toneMapped:false});
  dotCoreMaterial=new T.MeshBasicMaterial({color:0xffed79,transparent:false,depthTest:true,depthWrite:false,toneMapped:false});
  const size=Math.max(1,capacity);
  dotHaloMesh=new T.InstancedMesh(dotGeometry,dotHaloMaterial,size);
  dotCoreMesh=new T.InstancedMesh(dotGeometry,dotCoreMaterial,size);
  for(const mesh of [dotHaloMesh,dotCoreMesh]){
   mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.renderOrder=6;scene.add(mesh);
  }
  dotCapacity=size;
 }
 function renderModels(records=lastPositions){
  lastPositions=Array.isArray(records)?records:[];
  if(!scene||!map)return 0;
  if(typeof map.transform?.getMatrixForModel!=='function')return 0;
  const zoom=Number(map.getZoom?.()||0),groups=new Map(),dotHaloMatrices=[],dotCoreMatrices=[];let placed=0;
  for(const item of lastPositions){
   const kind=classify(item.item),meta=metadata(kind),lat=Number(item.lat),lon=Number(item.lon),alt=Number(item.alt);
   if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(alt))continue;
   const anchor=modelMatrixFor(lon,lat,alt*1000);if(!anchor)continue;
   const metersPerPixel=WORLD_CIRCUMFERENCE_M*Math.max(.12,Math.cos(lat*Math.PI/180))/(512*Math.pow(2,Math.max(0,zoom)));
   const displaySpan=Math.max(meta.span,metersPerPixel*meta.minPixels);
   const scale=displaySpan/meta.span;
   const heading=Number.isFinite(item.heading)?item.heading:0;
   // Align the spacecraft long axis to propagated velocity in the local tangent frame.
   const orientation=new T.Matrix4().makeRotationY(-heading);
   const matrix=anchor.clone().multiply(orientation).multiply(new T.Matrix4().makeScale(scale,scale,scale));
   const bucket=groups.get(kind)||[];bucket.push(matrix);groups.set(kind,bucket);
   // A bright two-part 3D marker is anchored to the same spacecraft transform.
   const dotBase=anchor.clone().multiply(orientation).multiply(new T.Matrix4().makeTranslation(0,0,displaySpan*.08));
   dotHaloMatrices.push(dotBase.clone().multiply(new T.Matrix4().makeScale(metersPerPixel*2.05,metersPerPixel*2.05,metersPerPixel*2.05)));
   dotCoreMatrices.push(dotBase.clone().multiply(new T.Matrix4().makeScale(metersPerPixel*1.05,metersPerPixel*1.05,metersPerPixel*1.05)));
   placed++;
  }
  for(const [kind,matrices] of groups){
   const entry=ensureMesh(kind,matrices.length);
   for(let i=0;i<matrices.length;i++)entry.mesh.setMatrixAt(i,matrices[i]);
   entry.mesh.count=matrices.length;entry.mesh.visible=enabled;entry.mesh.instanceMatrix.needsUpdate=true;
   try{entry.mesh.computeBoundingSphere()}catch(_){}
  }
  for(const [kind,entry] of templates)if(!groups.has(kind)){entry.mesh.count=0;entry.mesh.instanceMatrix.needsUpdate=true;entry.mesh.visible=enabled}
  if(placed){
   ensureDotMeshes(placed);
   for(let i=0;i<placed;i++){dotHaloMesh.setMatrixAt(i,dotHaloMatrices[i]);dotCoreMesh.setMatrixAt(i,dotCoreMatrices[i])}
   dotHaloMesh.count=placed;dotCoreMesh.count=placed;
   dotHaloMesh.visible=enabled;dotCoreMesh.visible=enabled;
   dotHaloMesh.instanceMatrix.needsUpdate=true;dotCoreMesh.instanceMatrix.needsUpdate=true;
   try{dotHaloMesh.computeBoundingSphere();dotCoreMesh.computeBoundingSphere()}catch(_){}
  }else if(dotHaloMesh&&dotCoreMesh){dotHaloMesh.count=0;dotCoreMesh.count=0}
  modelsRendered=placed;map.triggerRepaint?.();return placed;
 }
 function pickAtPoint(point,maxPixels=16){
  if(!camera||!map||!point||!Number.isFinite(Number(point.x))||!Number.isFinite(Number(point.y)))return null;
  const canvas=map.getCanvas?.();if(!canvas)return null;
  const width=Number(canvas.clientWidth||canvas.width),height=Number(canvas.clientHeight||canvas.height);
  if(!(width>0&&height>0))return null;
  const zoom=Number(map.getZoom?.()||0),limit=Math.max(4,Number(maxPixels)||16),limitSq=limit*limit;
  let best=null,bestDistance=limitSq,bestDepth=Infinity;
  for(const record of lastPositions){
   const item=record?.item,lat=Number(record?.lat),lon=Number(record?.lon),alt=Number(record?.alt);
   if(!item||!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(alt))continue;
   const meta=metadata(classify(item)),anchor=modelMatrixFor(lon,lat,alt*1000);if(!anchor)continue;
   const mpp=WORLD_CIRCUMFERENCE_M*Math.max(.12,Math.cos(lat*Math.PI/180))/(512*Math.pow(2,Math.max(0,zoom)));
   const displaySpan=Math.max(meta.span,mpp*meta.minPixels),heading=Number.isFinite(record.heading)?record.heading:0;
   const orientation=new T.Matrix4().makeRotationY(-heading);
   const centerClip=new T.Vector4(0,0,0,1).applyMatrix4(anchor).applyMatrix4(camera.projectionMatrix);
   if(centerClip.w<=0)continue;
   const surface=modelMatrixFor(lon,lat,0);
   if(surface){
    const groundClip=new T.Vector4(0,0,0,1).applyMatrix4(surface).applyMatrix4(camera.projectionMatrix);
    if(groundClip.w>0&&centerClip.z/centerClip.w>=groundClip.z/groundClip.w-0.00002)continue;
   }
   const dotBase=anchor.clone().multiply(orientation).multiply(new T.Matrix4().makeTranslation(0,0,displaySpan*.08));
   const clip=new T.Vector4(0,0,0,1).applyMatrix4(dotBase).applyMatrix4(camera.projectionMatrix);
   if(clip.w<=0)continue;
   const nx=clip.x/clip.w,ny=clip.y/clip.w,nz=clip.z/clip.w;
   if(Math.abs(nx)>1.05||Math.abs(ny)>1.05||nz< -1||nz>1)continue;
   const sx=(nx+1)*.5*width,sy=(1-ny)*.5*height,dx=sx-Number(point.x),dy=sy-Number(point.y),distance=dx*dx+dy*dy;
   if(distance<=bestDistance&&(distance<bestDistance-1||nz<bestDepth)){
    bestDistance=distance;bestDepth=nz;
    best={item,lat,lon,alt,heading,screen:{x:sx,y:sy}};
   }
  }
  return best;
 }
 function periodMinutes(item){
  const mean=Number(item?._bpSatrec?.no);
  if(Number.isFinite(mean)&&mean>0)return Math.max(75,Math.min(1500,2*Math.PI/mean));
  const revDay=Number(item?.omm?.MEAN_MOTION||item?.omm?.mean_motion||0);
  if(Number.isFinite(revDay)&&revDay>0)return Math.max(75,Math.min(1500,1440/revDay));
  return 96;
 }
 function propagate(item,lib,date){
  try{
   if(!item._bpSatrec){
    const raw=item.omm||{};
    item._bpSatrec=raw.line1&&raw.line2&&typeof lib.twoline2satrec==='function'?lib.twoline2satrec(raw.line1,raw.line2):lib.json2satrec(raw);
   }
   const result=lib.propagate(item._bpSatrec,date);
   if(!result?.position||item._bpSatrec?.error>0)return null;
   const gmst=lib.gstime(date),geo=lib.eciToGeodetic(result.position,gmst);
   const lat=lib.degreesLat(geo.latitude),lon=lib.degreesLong(geo.longitude),alt=geo.height;
   if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(alt))return null;
   return{lat,lon,alt};
  }catch(_){return null}
 }
 async function rebuildPaths(catalog=lastCatalog,lib=lastSatApi){
  lastCatalog=Array.isArray(catalog)?catalog:[];lastSatApi=lib;
  if(!enabled||!map||!lib||!scene)return{paths:0,vertices:0};
  if(typeof map.transform?.getMatrixForModel!=='function')return{paths:0,vertices:0};
  const generation=++pathGeneration,positions=[],colors=[];let count=0,processed=0;const now=Date.now();
  for(const item of lastCatalog){
   if(generation!==pathGeneration)return{paths:0,vertices:0};
   const epoch=Date.parse(item.epoch||item.omm?.EPOCH||'');
   if(Number.isFinite(epoch)&&now-epoch>MAX_ORBIT_AGE_MS)continue;
   const period=periodMinutes(item),kind=classify(item),color=new T.Color(metadata(kind).color);let previous=null,segments=0;
   for(let i=0;i<=PATH_SAMPLES;i++){
    const point=propagate(item,lib,new Date(now+period*60000*i/PATH_SAMPLES));
    if(!point){previous=null;continue}
    // Transform each propagated sample to globe space before connecting adjacent points.
    const current=globePosition(point);if(!current){previous=null;continue}
    if(previous){
     positions.push(previous.x,previous.y,previous.z,current.x,current.y,current.z);
     for(let j=0;j<2;j++)colors.push(color.r,color.g,color.b);
     segments++;
    }
    previous=current;
   }
   if(segments)count++;
   processed++;if(processed%100===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(generation!==pathGeneration)return{paths:0,vertices:0};
  if(pathLine){try{scene.remove(pathLine);pathLine.geometry.dispose();pathLine.material.dispose()}catch(_){}pathLine=null}
  if(positions.length){
   const geometry=new T.BufferGeometry();
   geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
   geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
   const material=new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.64,depthWrite:false});
   pathLine=new T.LineSegments(geometry,material);pathLine.name='BridgePoint propagated full orbital trajectories';pathLine.frustumCulled=false;pathLine.visible=enabled;scene.add(pathLine);
  }
  pathsBuilt=count;map.triggerRepaint?.();return{paths:count,vertices:positions.length/3};
 }
 function updatePositions(records){lastPositions=Array.isArray(records)?records:[];return renderModels(lastPositions)}
 function setVisible(value){
  enabled=!!value;if(pathLine)pathLine.visible=enabled;
  for(const entry of templates.values())entry.mesh.visible=enabled;
  if(dotHaloMesh)dotHaloMesh.visible=enabled;if(dotCoreMesh)dotCoreMesh.visible=enabled;
  map.triggerRepaint?.();
 }
 function onZoom(){if(enabled)renderModels(lastPositions)}
 function onStyle(){
  if(disposed||!enabled)return;
  if(!addLayer())return;
  renderModels(lastPositions);
  if(lastCatalog.length&&lastSatApi)void rebuildPaths(lastCatalog,lastSatApi);
 }
 map.on('zoomend',onZoom);
 map.on('style.load',onStyle);
 if(!addLayer())throw new Error('MapLibre did not accept the orbital 3D custom layer.');
 return{
  updatePositions,
  pickAtPoint,
  buildPaths:rebuildPaths,
  setVisible,
  get stats(){return{models:modelsRendered,paths:pathsBuilt,layerReady:!!renderer&&!!scene}},
  destroy(){
   if(disposed)return;disposed=true;enabled=false;pathGeneration++;
   try{map.off('zoomend',onZoom);map.off('style.load',onStyle)}catch(_){}
   try{if(map.getLayer(ORBIT_LAYER))map.removeLayer(ORBIT_LAYER)}catch(_){}
   disposeScene();
  }
 };
}
