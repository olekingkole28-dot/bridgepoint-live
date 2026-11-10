/**
 * BridgePoint Mars planetary system v6291.
 * Native global relief from NASA MGS MOLA MEGDR, Viking MDIM color,
 * PDS Thomas Phobos/Deimos shape grids, a local HiRISE Gale DTM, and
 * Mars-centred Keplerian moon propagation.
 */
const ASSET='/assets/mars/v1/';
const EARTH_RADIUS_KM=6371.0084;
const MARS_RADIUS_KM=3389.5;
const MARS_MU_KM3_S2=42828.375214;
const DEG=Math.PI/180;
const TAU=Math.PI*2;
const EPOCH_UTC=Date.parse('2026-11-09T00:00:00Z');
const TIME_LAPSE=60;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const MOONS={
 phobos:{name:'Phobos',radiusKm:11.1,semimajorAxisKm:9376.0,eccentricity:.0151,
  inclinationDeg:1.075,periodHours:7.653,meanAnomalyDeg:38.0,argumentPeriapsisDeg:150.0,
  visualScale:34.0,color:0xaaa39a,texture:'textures/phobos-thomas-viking-mosaic.webp',
  mesh:'meshes/phobos-thomas-grid-v1.bin.gz'},
 deimos:{name:'Deimos',radiusKm:6.2,semimajorAxisKm:23463.2,eccentricity:.0002,
  inclinationDeg:1.793,periodHours:30.312,meanAnomalyDeg:226.0,argumentPeriapsisDeg:260.0,
  visualScale:43.0,color:0xbcb5a9,texture:'textures/deimos-thomas-viking-mosaic.webp',
  mesh:'meshes/deimos-thomas-grid-v1.bin.gz'}
};

function solveKepler(M,e){
 let E=M+e*Math.sin(M)*(1+e*Math.cos(M));
 for(let i=0;i<10;i++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
 return E;
}
function moonOrbitPosition(seconds,moon,THREE){
 const a=moon.semimajorAxisKm,n=Math.sqrt(MARS_MU_KM3_S2/(a*a*a));
 const E=solveKepler(moon.meanAnomalyDeg*DEG+n*seconds,moon.eccentricity);
 const x=a*(Math.cos(E)-moon.eccentricity);
 const y=a*Math.sqrt(1-moon.eccentricity*moon.eccentricity)*Math.sin(E);
 const w=moon.argumentPeriapsisDeg*DEG,inc=moon.inclinationDeg*DEG;
 const px=x*Math.cos(w)-y*Math.sin(w),py=x*Math.sin(w)+y*Math.cos(w);
 return new THREE.Vector3(px,py*Math.sin(inc),py*Math.cos(inc)).multiplyScalar(1/EARTH_RADIUS_KM);
}
function orbitCurve(THREE,moon){
 const points=[],a=moon.semimajorAxisKm/EARTH_RADIUS_KM,e=moon.eccentricity;
 const w=moon.argumentPeriapsisDeg*DEG,inc=moon.inclinationDeg*DEG;
 for(let i=0;i<=360;i++){
  const E=i/360*TAU,x=a*(Math.cos(E)-e),y=a*Math.sqrt(1-e*e)*Math.sin(E);
  const px=x*Math.cos(w)-y*Math.sin(w),py=x*Math.sin(w)+y*Math.cos(w);
  points.push(new THREE.Vector3(px,py*Math.sin(inc),py*Math.cos(inc)));
 }
 return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),
  new THREE.LineBasicMaterial({color:moon.name==='Phobos'?0xe6ad78:0xb7c9db,transparent:true,opacity:.62,depthWrite:false}));
}
function decompress(buffer){
 if(typeof DecompressionStream==='undefined')throw Error('This browser cannot decode local Mars asset compression');
 return new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
function loadTexture(THREE,url){
 return new Promise((resolve,reject)=>new THREE.TextureLoader().load(url,t=>{
  t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;
  t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.needsUpdate=true;resolve(t);
 },undefined,reject));
}
function textSprite(THREE,label){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
 const context=canvas.getContext('2d');context.clearRect(0,0,512,128);
 context.font='800 58px system-ui,Arial,sans-serif';context.textAlign='center';context.textBaseline='middle';
 context.lineJoin='round';context.lineWidth=12;context.strokeStyle='rgba(2,7,14,.92)';
 context.strokeText(label.toUpperCase(),256,62);
 context.fillStyle='#fff0e6';context.shadowColor='rgba(235,126,78,.92)';context.shadowBlur=15;
 context.fillText(label.toUpperCase(),256,62);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false}));
 sprite.scale.set(1,.25,1);sprite.userData.baseWidthPx=76;return sprite;
}
function decodeMarsShape(raw,THREE,name){
 const dv=new DataView(raw);
 if(String.fromCharCode(...new Uint8Array(raw,0,4))!=='BPSM'||dv.getUint32(4,true)!==1)
  throw Error('Invalid PDS '+name+' shape mesh header');
 const count=dv.getUint32(8,true),triangles=dv.getUint32(12,true),off=20;
 if(!count||count%3!==0||triangles!==count/3)throw Error(name+' shape mesh triangle count mismatch');
 const positions=new Float32Array(raw,off,count*3),normals=new Float32Array(raw,off+count*12,count*3);
 const uv=new Float32Array(raw,off+count*24,count*2),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(positions.slice(),3));
 geometry.setAttribute('normal',new THREE.BufferAttribute(normals.slice(),3));
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv.slice(),2));
 geometry.computeBoundingSphere();return geometry;
}
function parseHeightHeader(raw,magic){
 const dv=new DataView(raw);
 if(String.fromCharCode(...new Uint8Array(raw,0,4))!==magic||dv.getUint32(4,true)!==1)
  throw Error('Mars terrain payload header/version mismatch: '+magic);
 const width=dv.getUint32(8,true),height=dv.getUint32(12,true),flags=dv.getUint32(16,true);
 if(width<64||height<64||width*height>50000000)throw Error('Mars terrain payload dimensions are unsafe');
 if(magic==='BPMH')return {width,height,flags,min:dv.getFloat32(20,true),max:dv.getFloat32(24,true),offset:28};
 return {width,height,flags,west:dv.getFloat32(20,true),east:dv.getFloat32(24,true),
  south:dv.getFloat32(28,true),north:dv.getFloat32(32,true),
  min:dv.getFloat32(36,true),max:dv.getFloat32(40,true),offset:44};
}
function toGal(x,y,z){
 const ra=192.85948*DEG,dec=27.12825*DEG,cra=266.4051*DEG,cdec=-28.936175*DEG;
 const north=[Math.cos(dec)*Math.cos(ra),Math.sin(dec),Math.cos(dec)*Math.sin(ra)];
 const center=[Math.cos(cdec)*Math.cos(cra),Math.sin(cdec),Math.cos(cdec)*Math.sin(cra)];
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const norm=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)};
 const gx=norm(center),gy=norm(north.map((v,i)=>v-dot(north,gx)*gx[i]));
 const gz=norm([gx[1]*gy[2]-gx[2]*gy[1],gx[2]*gy[0]-gx[0]*gy[2],gx[0]*gy[1]-gx[1]*gy[0]]);
 return [x*gx[0]+y*gx[1]+z*gx[2],x*gy[0]+y*gy[1]+z*gy[2],x*gz[0]+y*gz[1]+z*gz[2]];
}
function equatorialPoleToThree(raDeg,decDeg){
 const ra=raDeg*DEG,dec=decDeg*DEG,eps=23.439291*DEG;
 const x=Math.cos(dec)*Math.cos(ra),y=Math.cos(dec)*Math.sin(ra),z=Math.sin(dec);
 // Equatorial -> ecliptic, then map ecliptic xyz to the shared Three.js xzy axes.
 const yEcl=y*Math.cos(eps)+z*Math.sin(eps);
 const zEcl=-y*Math.sin(eps)+z*Math.cos(eps);
 return [x,zEcl,yEcl];
}

export function initBridgePointMarsSystem(options){
 const {THREE,solarRoot,host,camera,bodyMap,planetMeshes,clickables,labelsGroup,labelMap,
  getMarsPosition,getSunPosition,getSelectedBody,isMobile=false}=options;
 if(!THREE||!solarRoot||!bodyMap||!planetMeshes||!clickables)throw Error('Mars system requires the existing BridgePoint shared celestial scene');
 const state={
  version:'v6291-mars-orbit-geometry',status:'idle',
  source:'NASA MGS MOLA MEGDR + Viking MDIM 2.1 + PDS Small Body Optical Shape Models + MRO HiRISE',
  assets:'same-origin local static files; no runtime NASA source downloads',
  ephemerisEpochUTC:'2026-11-09T00:00:00Z',orbitTimeLapse:TIME_LAPSE,
  marsMeanRadiusKm:MARS_RADIUS_KM,moonCount:2,
  loaded:{marsTexture:false,molaDEM:false,phobosShape:false,phobosTexture:false,deimosShape:false,deimosTexture:false,galeHiRISE:false},
  errors:[],localTerrain:'Gale Crater HiRISE DTM; 1.0117 m source pixel scale',
  moonVisualScale:{phobos:34,deimos:43},
  orbitModel:'Mars-centred Kepler propagation using standard semimajor axis, eccentricity and inclination'
 };
 const root=new THREE.Group();root.name='MarsSystemGroup — MOLA relief sphere, Phobos and Deimos';
 const marsPole=equatorialPoleToThree(317.68143,52.88650);
 root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...marsPole).normalize());
 solarRoot.add(root);
 const surfacePivot=new THREE.Group();surfacePivot.name='Mars rotating terrain and local HiRISE surface patches';root.add(surfacePivot);
 const marsRadius=MARS_RADIUS_KM/EARTH_RADIUS_KM;
 const marsGeometry=new THREE.SphereGeometry(marsRadius,isMobile?1024:2048,isMobile?512:1024);
 const marsUniforms={height:{value:null},min:{value:0},max:{value:0}};
 const marsMaterial=new THREE.MeshStandardMaterial({color:0xffe0ca,roughness:.94,metalness:0});
 marsMaterial.onBeforeCompile=shader=>{
  shader.uniforms.uMarsHeight=marsUniforms.height;
  shader.uniforms.uMarsHeightMin=marsUniforms.min;
  shader.uniforms.uMarsHeightMax=marsUniforms.max;
  shader.vertexShader=shader.vertexShader.replace('#include <common>',
   '#include <common>\nuniform sampler2D uMarsHeight;\nuniform float uMarsHeightMin;\nuniform float uMarsHeightMax;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\nfloat marsHeightNorm=texture2D(uMarsHeight,uv).r;\nfloat marsElevationKm=mix(uMarsHeightMin,uMarsHeightMax,marsHeightNorm);\ntransformed+=normalize(normal)*(marsElevationKm/6371.0084);');
 };
 marsMaterial.customProgramCacheKey=()=> 'bridgepoint-mars-mola-vertex-displacement-v6291';
 const marsMesh=new THREE.Mesh(marsGeometry,marsMaterial);
 marsMesh.name='Mars — MOLA MEGDR globally displaced 3D terrain';marsMesh.userData.body='mars';
 marsMesh.castShadow=true;marsMesh.receiveShadow=true;surfacePivot.add(marsMesh);
 bodyMap.set('mars',{mesh:marsMesh,radius:marsRadius,systemCameraDistance:9.0});
 planetMeshes.set('mars',marsMesh);clickables.push(marsMesh);
 const marsLabel=textSprite(THREE,'Mars');labelsGroup.add(marsLabel);labelMap.set('mars',marsLabel);
 const haze=new THREE.Mesh(new THREE.SphereGeometry(marsRadius*1.012,isMobile?96:128,isMobile?64:96),
  new THREE.ShaderMaterial({
   uniforms:{uHazeColor:{value:new THREE.Color(0xc87a58)},uTime:{value:0}},
   vertexShader:'varying vec3 vMarsHazeNormal;varying vec3 vMarsHazeView;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vMarsHazeNormal=normalize(normalMatrix*normal);vMarsHazeView=-mv.xyz;gl_Position=projectionMatrix*mv;}',
   fragmentShader:'uniform vec3 uHazeColor;uniform float uTime;varying vec3 vMarsHazeNormal;varying vec3 vMarsHazeView;void main(){float f=max(dot(normalize(vMarsHazeNormal),normalize(vMarsHazeView)),0.0);float rim=pow(1.0-f,3.0);float shimmer=.88+.12*sin(uTime*.0008+vMarsHazeNormal.y*10.0);float a=clamp(rim*.18*shimmer,0.0,.15);gl_FragColor=vec4(uHazeColor,a);}',
   transparent:true,depthWrite:false,depthTest:true,side:THREE.BackSide,blending:THREE.AdditiveBlending,toneMapped:false
  }));
 haze.name='Mars thin warm atmospheric rim';surfacePivot.add(haze);
 const moonMeshes=new Map(),orbitLines=new Map(),moonMaterials=[],moonTextures=[],moonLabelSprites=new Map();
 for(const [key,moon] of Object.entries(MOONS)){
  const physicalRadius=moon.radiusKm/EARTH_RADIUS_KM,visualRadius=physicalRadius*moon.visualScale;
  const geometry=new THREE.SphereGeometry(physicalRadius,isMobile?96:160,isMobile?64:96);
  const material=new THREE.MeshStandardMaterial({color:moon.color,roughness:.96,metalness:0});
  const mesh=new THREE.Mesh(geometry,material);mesh.scale.setScalar(moon.visualScale);
  mesh.name=moon.name+' — PDS Thomas irregular shape loads locally';
  mesh.userData.body=key;mesh.userData.visualScale=moon.visualScale;mesh.userData.physicalRadius=physicalRadius;
  mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  moonMeshes.set(key,mesh);planetMeshes.set(key,mesh);clickables.push(mesh);
  bodyMap.set(key,{mesh,radius:physicalRadius,visualRadius,visualScale:moon.visualScale,
   systemCameraDistance:Math.max(.12,visualRadius*3.8),orbitKm:moon.semimajorAxisKm});
  const line=orbitCurve(THREE,moon);line.name=moon.name+' Mars-centred orbital path';root.add(line);orbitLines.set(key,line);
  const label=textSprite(THREE,moon.name);labelsGroup.add(label);labelMap.set(key,label);moonLabelSprites.set(key,label);
  moonMaterials.push(material);
 }
 let marsTexture=null,marsHeightTexture=null,galePatch=null,galePromise=null,loadPromise=null;
 let simulationSeconds=Math.max(0,(Date.now()-EPOCH_UTC)/1000),last=performance.now();

 async function loadMarsHeight(){
  const response=await fetch(ASSET+'height/mola-global-bpmh.bin.gz',{cache:'force-cache'});
  if(!response.ok)throw Error('MOLA global height payload HTTP '+response.status);
  const raw=await decompress(await response.arrayBuffer()),info=parseHeightHeader(raw,'BPMH');
  if(raw.byteLength!==info.offset+info.width*info.height*2)throw Error('MOLA global height payload length mismatch');
  const values=new Uint16Array(raw,info.offset,info.width*info.height).slice();
  marsHeightTexture=new THREE.DataTexture(values,info.width,info.height,THREE.RedFormat,THREE.UnsignedShortType);
  marsHeightTexture.flipY=false;marsHeightTexture.unpackAlignment=1;
  marsHeightTexture.magFilter=THREE.LinearFilter;marsHeightTexture.minFilter=THREE.LinearFilter;
  marsHeightTexture.generateMipmaps=false;marsHeightTexture.needsUpdate=true;
  marsUniforms.height.value=marsHeightTexture;
  marsUniforms.min.value=info.min/1000;marsUniforms.max.value=info.max/1000;
  state.loaded.molaDEM=true;state.molaGrid=[info.width,info.height];
 }
 async function loadMoonAssets(key){
  const moon=MOONS[key],mesh=moonMeshes.get(key);
  try{
   const texture=await loadTexture(THREE,ASSET+moon.texture);
   mesh.material.map=texture;mesh.material.color.set(0xffffff);mesh.material.roughness=.95;
   mesh.material.needsUpdate=true;moonTextures.push(texture);state.loaded[key+'Texture']=true;
  }catch(error){state.errors.push(key+' surface map: '+String(error?.message||error))}
  try{
   const response=await fetch(ASSET+moon.mesh,{cache:'force-cache'});
   if(!response.ok)throw Error(moon.mesh+' HTTP '+response.status);
   const raw=await decompress(await response.arrayBuffer());
   const geometry=decodeMarsShape(raw,THREE,moon.name);
   mesh.geometry.dispose();mesh.geometry=geometry;
   mesh.name=moon.name+' — PDS Thomas irregular 3D shape model';
   state.loaded[key+'Shape']=true;
  }catch(error){state.errors.push(key+' PDS shape: '+String(error?.message||error))}
 }
 async function loadAssets(){
  state.status='loading';
  const texturePromise=loadTexture(THREE,ASSET+'textures/mars-viking-mdim-global.webp')
   .then(texture=>{marsTexture=texture;marsMaterial.map=texture;marsMaterial.color.set(0xffffff);marsMaterial.needsUpdate=true;state.loaded.marsTexture=true})
   .catch(error=>state.errors.push('Viking MDIM color: '+String(error?.message||error)));
  const heightPromise=loadMarsHeight().catch(error=>state.errors.push('MOLA global relief: '+String(error?.message||error)));
  const moonPromise=Promise.all(Object.keys(MOONS).map(loadMoonAssets));
  await Promise.all([texturePromise,heightPromise,moonPromise]);
  state.status=state.errors.some(e=>e.includes('MOLA global relief'))?'partial':'ready';
  if(!state.loaded.marsTexture&&!state.loaded.molaDEM)throw Error('Mars base texture and MOLA elevation assets are unavailable');
 }
 function ensureLoaded(){
  if(!loadPromise)loadPromise=loadAssets().catch(error=>{state.status='error';state.errors.push(String(error?.message||error))});
  return loadPromise;
 }
 async function loadGalePatch(){
  if(galePatch)return galePatch;
  if(galePromise)return galePromise;
  galePromise=(async()=>{
   const response=await fetch(ASSET+'height/gale-hirise-dtm-bpmg.bin.gz',{cache:'force-cache'});
   if(!response.ok)throw Error('HiRISE Gale DTM payload HTTP '+response.status);
   const raw=await decompress(await response.arrayBuffer()),info=parseHeightHeader(raw,'BPMG');
   const sampleCount=info.width*info.height,hasMask=!!(info.flags&1);
   const expectedLength=info.offset+sampleCount*2+(hasMask?sampleCount:0);
   if(raw.byteLength!==expectedLength)throw Error('HiRISE Gale DTM payload length/mask mismatch');
   const samples=new Uint16Array(raw,info.offset,sampleCount);
   const validMask=hasMask?new Uint8Array(raw,info.offset+sampleCount*2,sampleCount):null;
   const meshWidth=isMobile?256:512,meshHeight=isMobile?512:1024;
   const nodeCount=(meshWidth+1)*(meshHeight+1);
   const positions=new Float32Array(nodeCount*3);
   const uvs=new Float32Array(nodeCount*2);
   const nodeValid=new Uint8Array(nodeCount);
   const indices=new Uint32Array(meshWidth*meshHeight*6);
   let p=0,t=0;
   for(let y=0;y<=meshHeight;y++){
    const lat=info.north-(info.north-info.south)*y/meshHeight;
    const sy=clamp(Math.round((lat-info.south)/(info.north-info.south)*(info.height-1)),0,info.height-1);
    for(let x=0;x<=meshWidth;x++){
     const lon=info.west+(info.east-info.west)*x/meshWidth;
     const sx=clamp(Math.round(x/meshWidth*(info.width-1)),0,info.width-1);
     const sampleIndex=sy*info.width+sx;
     const valid=!validMask||validMask[sampleIndex]!==0;
     nodeValid[y*(meshWidth+1)+x]=valid?1:0;
     const elevKm=(info.min+(samples[sampleIndex]/65535)*(info.max-info.min))/1000;
     const latR=lat*DEG,lonR=lon*DEG,r=marsRadius+elevKm/EARTH_RADIUS_KM+.000025;
     // Match Three.js SphereGeometry's equirectangular UV orientation:
     // longitude 0 points down -Z, with east increasing toward +X.
     positions[p++]=r*Math.cos(latR)*Math.sin(lonR);
     positions[p++]=r*Math.sin(latR);
     positions[p++]=-r*Math.cos(latR)*Math.cos(lonR);
     uvs[t++]=(lon+180)/360;uvs[t++]=(lat+90)/180;
    }
   }
   let k=0,stride=meshWidth+1;
   for(let y=0;y<meshHeight;y++)for(let x=0;x<meshWidth;x++){
    const a=y*stride+x,b=a+stride,c=b+1,d=a+1;
    if(nodeValid[a]&&nodeValid[b]&&nodeValid[c]){indices[k++]=a;indices[k++]=b;indices[k++]=c;}
    if(nodeValid[a]&&nodeValid[c]&&nodeValid[d]){indices[k++]=a;indices[k++]=c;indices[k++]=d;}
   }
   if(k<3)throw Error('HiRISE Gale DTM validity mask contains no renderable terrain triangles');
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
   geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
   geometry.setIndex(new THREE.BufferAttribute(indices.slice(0,k),1));geometry.computeVertexNormals();geometry.computeBoundingSphere();
   const material=new THREE.MeshStandardMaterial({map:marsTexture||null,color:0xffe0ca,roughness:.98,metalness:0,
    polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:THREE.DoubleSide});
   galePatch=new THREE.Mesh(geometry,material);
   galePatch.name='Gale Crater HiRISE 1.01 m/pixel local replacement terrain mesh';
   galePatch.visible=false;galePatch.castShadow=true;galePatch.receiveShadow=true;surfacePivot.add(galePatch);
   state.loaded.galeHiRISE=true;
   state.galePatchBounds={west:info.west,east:info.east,south:info.south,north:info.north,
    sourcePixelScaleM:1.0117467945795,meshSegments:[meshWidth,meshHeight]};
   return galePatch;
  })().catch(error=>{state.errors.push('HiRISE Gale local terrain: '+String(error?.message||error));galePromise=null;return null});
  return galePromise;
 }
 function update(){
  const now=performance.now(),dt=clamp((now-last)/1000,0,.08);last=now;simulationSeconds+=dt*TIME_LAPSE;
  const selected=String(getSelectedBody?.()||'').toLowerCase();
  if(['mars','phobos','deimos'].includes(selected))void ensureLoaded();
  const marsPos=getMarsPosition?.();if(marsPos&&marsPos.isVector3)root.position.copy(marsPos);
  root.updateMatrixWorld(true);
  surfacePivot.rotation.y=(simulationSeconds*TAU/(24.6229*3600))%TAU;
  haze.material.uniforms.uTime.value=simulationSeconds;
  for(const [key,moon] of Object.entries(MOONS)){
   const mesh=moonMeshes.get(key),position=moonOrbitPosition(simulationSeconds,moon,THREE);
   mesh.position.copy(position);mesh.lookAt(new THREE.Vector3(0,0,0));
   const line=orbitLines.get(key);line.visible=['mars','phobos','deimos'].includes(selected);
   line.material.opacity=.52+.10*Math.sin(simulationSeconds*.0007+key.length);
  }
  const marsWorld=marsMesh.getWorldPosition(new THREE.Vector3()),distance=camera.position.distanceTo(marsWorld);
  const altitude=distance-marsRadius,nearGale=['mars','phobos','deimos'].includes(selected)&&altitude<.12;
  if(nearGale&&!state.loaded.galeHiRISE)void loadGalePatch();
  if(galePatch)galePatch.visible=nearGale;
  for(const key of ['mars','phobos','deimos']){
   const mesh=key==='mars'?marsMesh:moonMeshes.get(key),sprite=key==='mars'?marsLabel:moonLabelSprites.get(key);
   const position=mesh.getWorldPosition(new THREE.Vector3());
   const radius=key==='mars'?marsRadius:MOONS[key].radiusKm/EARTH_RADIUS_KM*MOONS[key].visualScale;
   sprite.position.copy(position).add(new THREE.Vector3(0,radius+.035,0));
   sprite.visible=selected==='mars'||selected===key||(key==='mars'&&['phobos','deimos'].includes(selected));
   const d=Math.max(1e-6,camera.position.distanceTo(sprite.position));
   const worldPerPixel=2*d*Math.tan(camera.fov*DEG*.5)/Math.max(1,host?.clientHeight||innerHeight);
   const w=(sprite.userData.baseWidthPx||76)*worldPerPixel;sprite.scale.set(w,w*.25,1);
  }
 }
 function dispose(){
  root.parent?.remove(root);
  const baseIndex=clickables.indexOf(marsMesh);if(baseIndex>=0)clickables.splice(baseIndex,1);
  for(const key of Object.keys(MOONS)){
   const mesh=moonMeshes.get(key),index=clickables.indexOf(mesh);if(index>=0)clickables.splice(index,1);
   bodyMap.delete(key);planetMeshes.delete(key);
   moonLabelSprites.get(key)?.parent?.remove(moonLabelSprites.get(key));
   mesh?.geometry?.dispose();mesh?.material?.dispose();
   orbitLines.get(key)?.geometry.dispose();orbitLines.get(key)?.material.dispose();
  }
  bodyMap.delete('mars');planetMeshes.delete('mars');marsLabel.parent?.remove(marsLabel);
  surfacePivot.clear();haze.geometry.dispose();haze.material.dispose();
  marsGeometry.dispose();marsMaterial.dispose();marsHeightTexture?.dispose();
  for(const texture of moonTextures)texture.dispose();
  if(marsTexture)marsTexture.dispose();
  if(galePatch){galePatch.geometry.dispose();galePatch.material.dispose()}
 }
 const api={
  version:'v6291-mars-orbit-geometry',state,update,ensureLoaded,loadGalePatch,dispose,
  getBody:name=>bodyMap.get(String(name||'').toLowerCase())||null,
  get marsMesh(){return marsMesh},get systemRoot(){return root},
  physical:{marsRadiusKm:MARS_RADIUS_KM,phobosRadiusKm:11.1,deimosRadiusKm:6.2,
   phobosOrbitKm:9376.0,deimosOrbitKm:23463.2}
 };
 window.__BP_MARS_SYSTEM_V6291__=api;state.status='idle';return api;
}
