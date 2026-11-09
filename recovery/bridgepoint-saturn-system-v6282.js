/**
 * BridgePoint Saturn system v6282.
 * Saturn's Cassini ISS atmosphere map, measured main-ring boundaries, NASA DSK
 * satellite shape meshes, Titan Cassini topography, and Saturn-centred JPL
 * Horizons state vectors. All runtime assets are same-origin static files.
 */
const ASSET='/assets/saturn/v1/';
const EARTH_RADIUS_KM=6371.0084;
const SATURN_RADIUS_KM=58232.0;
const SATURN_MU_KM3_S2=3.7931187e7;
const DEG=Math.PI/180;
const TAU=Math.PI*2;
const EPOCH_UTC=Date.parse('2026-11-09T00:00:00Z');
const TIME_LAPSE=60;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const MOONS={
 mimas:{
  name:'Mimas',id:601,radiusKm:198.2,semimajorAxisKm:185539.0,periodDays:.942422,
  color:0xc5c8ce,orbitColor:0xb9c0ce,
  p:[159507.9391056501,100660.4590663533,-4367.822884452991],
  v:[-7.3885403180711,11.98086111228764,.205334716231883],
  texture:'textures/mimas-cassini-global-map.webp',
  mesh:'meshes/mimas-cassini-shape-v1.bin.gz'
 },
 enceladus:{
  name:'Enceladus',id:602,radiusKm:252.1,semimajorAxisKm:238042.0,periodDays:1.370218,
  color:0xe5f4ff,orbitColor:0x9ddfff,
  p:[146863.6020272087,-186675.9803038604,35.28338391641591],
  v:[9.982727758078839,7.786964737728151,-.000960023181416747],
  texture:'textures/enceladus-cassini-global-map.webp',
  mesh:'meshes/enceladus-cassini-shape-v1.bin.gz'
 },
 titan:{
  name:'Titan',id:606,radiusKm:2574.73,semimajorAxisKm:1221870.0,periodDays:15.945421,
  color:0xc98c3e,orbitColor:0xd8a568,
  p:[756097.3842162077,1002562.545025076,2685.248886195084],
  v:[-4.352188628121202,3.230561870569889,-.03653969956979],
  texture:'textures/titan-cassini-radar-topography.webp',
  height:'height/titan-cassini-topography-4ppd-u16.bin.gz'
 }
};

function norm(v){const n=Math.hypot(v[0],v[1],v[2])||1;return v.map(x=>x/n)}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function scale(v,s){return [v[0]*s,v[1]*s,v[2]*s]}
function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
let THREEVector=null;

function makeOrbit(pKm,vKmS){
 const rmag=Math.hypot(...pKm),v2=dot(vKmS,vKmS),h=cross(pKm,vKmS),hn=norm(h);
 const evec=sub(scale(cross(vKmS,h),1/SATURN_MU_KM3_S2),scale(pKm,1/rmag));
 const e=Math.hypot(...evec);
 const a=1/(2/rmag-v2/SATURN_MU_KM3_S2);
 const pHat=e>1e-8?norm(evec):norm(pKm);
 const qHat=norm(cross(hn,pHat));
 const cosE=e>1e-8?clamp((1-rmag/a)/e,-1,1):1;
 const sinE=e>1e-8?dot(pKm,vKmS)/(e*Math.sqrt(SATURN_MU_KM3_S2*a)):0;
 const E0=Math.atan2(sinE,cosE);
 return {a,e,pHat,qHat,M0:E0-e*Math.sin(E0),n:Math.sqrt(SATURN_MU_KM3_S2/(a*a*a))};
}
function solveKepler(M,e){
 let E=M+e*Math.sin(M)*(1+e*Math.cos(M));
 for(let i=0;i<10;i++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
 return E;
}
function orbitPosition(elapsed,orbit){
 const E=solveKepler(orbit.M0+orbit.n*elapsed,orbit.e);
 const x=orbit.a*(Math.cos(E)-orbit.e);
 const y=orbit.a*Math.sqrt(Math.max(0,1-orbit.e*orbit.e))*Math.sin(E);
 const r=[orbit.pHat[0]*x+orbit.qHat[0]*y,orbit.pHat[1]*x+orbit.qHat[1]*y,orbit.pHat[2]*x+orbit.qHat[2]*y];
 // JPL BODY EQUATOR uses +Z north; Three.js uses +Y up.
 return new THREEVector(r[0],r[2],r[1]).multiplyScalar(1/EARTH_RADIUS_KM);
}
function decompress(buffer){
 if(typeof DecompressionStream==='undefined')throw Error('This browser cannot decode local Saturn asset compression');
 return new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
function loadTexture(THREE,url,colorSpace=true){
 return new Promise((resolve,reject)=>{
  new THREE.TextureLoader().load(url,t=>{
   t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;
   t.colorSpace=colorSpace?THREE.SRGBColorSpace:THREE.NoColorSpace;
   t.anisotropy=4;t.needsUpdate=true;resolve(t);
  },undefined,reject);
 });
}
function textSprite(THREE,label){
 const c=document.createElement('canvas');c.width=512;c.height=128;
 const x=c.getContext('2d');x.clearRect(0,0,512,128);
 x.font='800 58px system-ui,Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';
 x.lineJoin='round';x.lineWidth=12;x.strokeStyle='rgba(1,8,18,.92)';x.strokeText(label.toUpperCase(),256,62);
 x.fillStyle='#edf8ff';x.shadowColor='rgba(130,190,235,.9)';x.shadowBlur=13;x.fillText(label.toUpperCase(),256,62);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:true,depthWrite:false}));
 s.scale.set(1,.25,1);s.userData.baseWidthPx=76;return s;
}

export function initBridgePointSaturnSystem(options){
 const {THREE,solarRoot,host,camera,bodyMap,planetMeshes,clickables,labelsGroup,labelMap,
  getSaturnPosition,getSelectedBody,isMobile=false}=options;
 if(!THREE||!solarRoot||!bodyMap||!planetMeshes)throw Error('Saturn system requires the existing BridgePoint shared celestial scene');
 THREEVector=THREE.Vector3;
 const state={version:'v6283-isolated',status:'idle',source:'NASA Cassini PDS + NASA NAIF DSK + JPL Horizons',
  ephemerisEpochUTC:'2026-11-09T00:00:00Z',ephemerisFrame:'Saturn BODY EQUATOR',
  orbitTimeLapse:TIME_LAPSE,physicalSizeScale:'true mean radii relative to Earth',
  ringRadiusUnit:'km from Saturn centre',assets:'same-origin local static; no external runtime terrain requests',
  loaded:{saturnTexture:false,titanDEM:false,titanTexture:false,enceladusShape:false,enceladusTexture:false,mimasShape:false,mimasTexture:false},
  errors:[],moonCount:3,ringBands:['D','C','B','Cassini Division','A','F','G','E']};
 const root=new THREE.Group();root.name='SaturnSystemGroup — Saturn, measured rings, and orbiting moons';
 // Saturn pole (IAU body pole RA 40.589°, Dec 83.537°) transformed from ICRF into ecliptic axes.
 const saturnPoleRA=40.589*DEG,saturnPoleDec=83.537*DEG,obliquity=23.439291*DEG;
 const poleEq=[Math.cos(saturnPoleDec)*Math.cos(saturnPoleRA),Math.cos(saturnPoleDec)*Math.sin(saturnPoleRA),Math.sin(saturnPoleDec)];
 const poleEcl=[poleEq[0],poleEq[1]*Math.cos(obliquity)+poleEq[2]*Math.sin(obliquity),-poleEq[1]*Math.sin(obliquity)+poleEq[2]*Math.cos(obliquity)];
 root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(poleEcl[0],poleEcl[2],poleEcl[1]).normalize());
 solarRoot.add(root);
 const saturnRadius=SATURN_RADIUS_KM/EARTH_RADIUS_KM;
 const saturnGeometry=new THREE.SphereGeometry(saturnRadius,isMobile?128:192,isMobile?80:128);
 const saturnMaterial=new THREE.MeshStandardMaterial({color:0xe2c995,roughness:.95,metalness:0});
 const saturnAtmosphereUniforms={time:{value:0}};
 // Latitude-dependent cloud drift animates Cassini's mapped atmosphere while
 // the whole globe retains Saturn's measured ~10.656-hour rotation.
 saturnMaterial.onBeforeCompile=shader=>{
  shader.uniforms.uSaturnAtmosTime=saturnAtmosphereUniforms.time;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uSaturnAtmosTime;');
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',
   '#include <uv_vertex>\n#ifdef USE_MAP\nfloat saturnLatitude=abs(vMapUv.y-.5)*2.0;\nfloat saturnDrift=0.00000115+0.00000105*(1.0-saturnLatitude);\nvMapUv.x=fract(vMapUv.x+uSaturnAtmosTime*saturnDrift);\n#endif');
 };
 saturnMaterial.customProgramCacheKey=()=> 'bridgepoint-saturn-differential-cloud-drift-v6283';
 const saturnMesh=new THREE.Mesh(saturnGeometry,saturnMaterial);
 saturnMesh.name='Saturn — Cassini ISS mapped atmosphere';saturnMesh.userData.body='saturn';root.add(saturnMesh);
 const saturnHaze=new THREE.Mesh(new THREE.SphereGeometry(saturnRadius*1.018,isMobile?96:144,isMobile?64:96),
  new THREE.MeshBasicMaterial({color:0xe7c998,transparent:true,opacity:.085,side:THREE.BackSide,depthWrite:false}));
 saturnHaze.name='Saturn upper atmospheric haze';root.add(saturnHaze);
 bodyMap.set('saturn',{mesh:saturnMesh,radius:saturnRadius,systemCameraDistance:470});
 planetMeshes.set('saturn',saturnMesh);clickables.push(saturnMesh);

 const ringMeshes=[];
 function ringGeometry(innerKm,outerKm,steps=5,segments=512){
  const inner=innerKm/EARTH_RADIUS_KM,outer=outerKm/EARTH_RADIUS_KM;
  const positions=[],uvs=[],indices=[];
  for(let r=0;r<=steps;r++){
   const f=r/steps,rad=inner+(outer-inner)*f;
   for(let a=0;a<=segments;a++){
    const ang=TAU*a/segments;
    positions.push(rad*Math.cos(ang),0,rad*Math.sin(ang));
    uvs.push(f,a/segments);
   }
  }
  for(let r=0;r<steps;r++)for(let a=0;a<segments;a++){
   const p=r*(segments+1)+a,q=p+segments+1;
   indices.push(p,q,p+1,p+1,q,q+1);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.setIndex(indices);g.computeVertexNormals();return g;
 }
 const ringVertex='varying vec2 vRingUv; void main(){vRingUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
 const ringFragment='uniform vec3 uTint;uniform float uOpacity;uniform float uTime;varying vec2 vRingUv;\nvoid main(){float r=vRingUv.x;float a=vRingUv.y*6.2831853;\nfloat fine=.91+.07*sin(r*1830.0+sin(a*33.0)*3.2)+.025*sin(r*7400.0+a*51.0+uTime*.11);\nfloat wav=.96+.04*sin(r*118.0+a*5.0+sin(a*13.0));\nfloat alpha=clamp(uOpacity*fine*wav,0.0,.94);vec3 col=uTint*(.82+.18*fine);gl_FragColor=vec4(col,alpha);}';
 function addRing(name,inner,outer,tint,opacity,seg=512){
  const material=new THREE.ShaderMaterial({uniforms:{uTint:{value:new THREE.Color(tint)},uOpacity:{value:opacity},uTime:{value:0}},
   vertexShader:ringVertex,fragmentShader:ringFragment,transparent:true,depthTest:true,depthWrite:false,
   side:THREE.DoubleSide,toneMapped:false});
  const mesh=new THREE.Mesh(ringGeometry(inner,outer,4,seg),material);
  mesh.name='Saturn '+name+' ring '+inner+'–'+outer+' km';mesh.userData.ringBand=name;root.add(mesh);ringMeshes.push(mesh);return mesh;
 }
 // Cassini/PDS ring radii: gaps are left empty instead of drawing a solid disc.
 addRing('D',66900,74510,0x96836b,.13);
 addRing('C',74510,92000,0x9f9278,.28);
 addRing('B',92000,117580,0xd7c8a2,.78);
 addRing('A',122170,136775,0xcbb98d,.58);
 addRing('F',140180,140480,0xe5d3ad,.40,768);
 addRing('G',166000,174000,0xb9a98a,.085);
 addRing('E',180000,480000,0xcdbf9f,.045);

 const moonMeshes=new Map(),orbitLines=new Map(),labels=new Map(),plumeEffects=[];
 let titanAtmosphere=null;
 for(const [key,m] of Object.entries(MOONS)){
  const radius=m.radiusKm/EARTH_RADIUS_KM;
  const segments=key==='titan'?(isMobile?256:512):(isMobile?48:72);
  const rings=key==='titan'?(isMobile?128:256):(isMobile?32:48);
  const placeholder=new THREE.Mesh(new THREE.SphereGeometry(radius,segments,rings),
   new THREE.MeshStandardMaterial({color:m.color,roughness:.92,metalness:0}));
  placeholder.name=m.name+' — physical-size 3D moon';placeholder.userData.body=key;
  root.add(placeholder);moonMeshes.set(key,placeholder);planetMeshes.set(key,placeholder);clickables.push(placeholder);
  if(key==='titan'){
   const haze=new THREE.Mesh(new THREE.SphereGeometry(radius*1.055,isMobile?64:96,isMobile?48:64),
    new THREE.MeshBasicMaterial({color:0xd9a34e,transparent:true,opacity:.19,side:THREE.BackSide,depthWrite:false}));
   haze.name='Titan thick golden nitrogen atmosphere';placeholder.add(haze);titanAtmosphere=haze;
  }
  const orbit=makeOrbit(m.p,m.v);m.orbit=orbit;
  const path=[],samples=220;
  for(let i=0;i<samples;i++){
   const E=TAU*i/samples;
   const x=orbit.a*(Math.cos(E)-orbit.e),y=orbit.a*Math.sqrt(Math.max(0,1-orbit.e*orbit.e))*Math.sin(E);
   const v=[orbit.pHat[0]*x+orbit.qHat[0]*y,orbit.pHat[1]*x+orbit.qHat[1]*y,orbit.pHat[2]*x+orbit.qHat[2]*y];
   path.push(new THREE.Vector3(v[0],v[2],v[1]).multiplyScalar(1/EARTH_RADIUS_KM));
  }
  const og=new THREE.BufferGeometry().setFromPoints(path);
  const ol=new THREE.Line(og,new THREE.LineBasicMaterial({color:m.orbitColor,transparent:true,opacity:.27,depthWrite:false}));
  ol.name=m.name+' JPL-derived Saturn-centred orbit';root.add(ol);orbitLines.set(key,ol);
  const label=textSprite(THREE,m.name);labelsGroup.add(label);labelMap.set(key,label);labels.set(key,label);
  bodyMap.set(key,{mesh:placeholder,radius,systemCameraDistance:Math.max(.22,radius*4.1),orbitKm:m.semimajorAxisKm});
 }
 const saturnLabel=textSprite(THREE,'Saturn');labelsGroup.add(saturnLabel);labelMap.set('saturn',saturnLabel);labels.set('saturn',saturnLabel);

 function createEnceladusPlumes(mesh){
  const group=new THREE.Group();group.name='Enceladus south-polar water-ice geyser plumes';mesh.add(group);
  const r=MOONS.enceladus.radiusKm/EARTH_RADIUS_KM,lineMaterial=new THREE.LineBasicMaterial({color:0xbdeeff,transparent:true,opacity:.78,depthWrite:false}),curves=[];
  for(let i=0;i<8;i++){
   const a=TAU*i/8,side=new THREE.Vector3(Math.cos(a),0,Math.sin(a));
   const start=side.clone().multiplyScalar(r*.48).add(new THREE.Vector3(0,-r*.86,0));
   const control=start.clone().addScaledVector(side,r*.9).add(new THREE.Vector3(0,-r*.72,0));
   const end=start.clone().addScaledVector(side,r*1.7).add(new THREE.Vector3(0,-r*1.95,0));
   const curve=new THREE.QuadraticBezierCurve3(start,control,end);curves.push(curve);
   const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(28)),lineMaterial.clone());group.add(line);
  }
  const count=192,positions=new Float32Array(count*3),phases=new Float32Array(count),jet=new Uint8Array(count);
  for(let i=0;i<count;i++){phases[i]=i/count;jet[i]=i%8}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const pm=new THREE.PointsMaterial({color:0xecfaff,size:isMobile?1.45:2.05,transparent:true,opacity:.88,depthWrite:false,blending:THREE.AdditiveBlending});
  const points=new THREE.Points(pg,pm);points.name='Enceladus animated water-ice plume particles';group.add(points);
  plumeEffects.push({curves,positions,phases,jet,geometry:pg,material:pm});
 }
 createEnceladusPlumes(moonMeshes.get('enceladus'));

 let loadPromise=null;
 async function loadAssets(){
  const urls=[['saturn','textures/saturn-cassini-iss-global.webp'],['titan','textures/titan-cassini-surface-mosaic.webp'],
   ['enceladus','textures/enceladus-cassini-global-map.webp'],['mimas','textures/mimas-cassini-global-map.webp']];
  const loaded={};
  for(const [key,path] of urls){
   try{loaded[key]=await loadTexture(THREE,ASSET+path,true);state.loaded[key==='saturn'?'saturnTexture':key+'Texture']=true}
   catch(e){state.errors.push(key+' texture: '+String(e?.message||e))}
  }
  if(loaded.saturn)saturnMaterial.map=loaded.saturn;
  if(loaded.titan){const t=moonMeshes.get('titan');t.material.map=loaded.titan;t.material.needsUpdate=true}
  for(const key of ['enceladus','mimas']){
   if(!loaded[key])continue;
   try{
    const m=MOONS[key],file=await fetch(ASSET+m.mesh,{cache:'force-cache'});
    if(!file.ok)throw Error(m.mesh+' HTTP '+file.status);
    const raw=await decompress(await file.arrayBuffer()),dv=new DataView(raw);
    if(String.fromCharCode(...new Uint8Array(raw,0,4))!=='BPSM'||dv.getUint32(4,true)!==1)throw Error('Invalid '+m.name+' mesh header');
    const count=dv.getUint32(8,true),off=20;
    const position=new Float32Array(raw,off,count*3),normal=new Float32Array(raw,off+count*12,count*3),uv=new Float32Array(raw,off+count*24,count*2);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(position,3));
    geometry.setAttribute('normal',new THREE.BufferAttribute(normal,3));
    geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.computeBoundingSphere();
    const moon=moonMeshes.get(key);moon.geometry.dispose();moon.geometry=geometry;
    moon.material.dispose();moon.material=new THREE.MeshStandardMaterial({map:loaded[key],color:0xffffff,roughness:.94,metalness:0});
    state.loaded[key+'Shape']=true;
   }catch(e){state.errors.push(m.name+' shape: '+String(e?.message||e))}
  }
  try{
   const response=await fetch(ASSET+'height/titan-cassini-topography-4ppd-u16.bin.gz',{cache:'force-cache'});
   if(!response.ok)throw Error('Titan height HTTP '+response.status);
   const raw=await decompress(await response.arrayBuffer()),dv=new DataView(raw);
   if(String.fromCharCode(...new Uint8Array(raw,0,4))!=='BPSH'||dv.getUint32(4,true)!==1)throw Error('Titan height header mismatch');
   const width=dv.getUint32(8,true),height=dv.getUint32(12,true),min=dv.getFloat32(20,true),max=dv.getFloat32(24,true),data=new Uint16Array(raw,28,width*height);
   const tex=new THREE.DataTexture(data,width,height,THREE.RedFormat,THREE.UnsignedShortType);
   tex.flipY=false;tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.ClampToEdgeWrapping;
   tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;tex.unpackAlignment=1;tex.generateMipmaps=false;tex.needsUpdate=true;
   const mat=moonMeshes.get('titan').material,uniforms={uTitanHeight:{value:tex},uTitanHeightMin:{value:min},uTitanHeightMax:{value:max}};
   const previous=mat.onBeforeCompile;
   mat.onBeforeCompile=shader=>{
    if(previous)previous(shader);Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform sampler2D uTitanHeight;uniform float uTitanHeightMin;uniform float uTitanHeightMax;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat titanH=texture2D(uTitanHeight,uv).r;float titanMeters=mix(uTitanHeightMin,uTitanHeightMax,titanH);transformed+=normalize(objectNormal)*(titanMeters/6371008.4);');
   };
   mat.customProgramCacheKey=()=> 'bridgepoint-titan-cassini-dem-4ppd-v6282';mat.needsUpdate=true;state.loaded.titanDEM=true;
  }catch(e){state.errors.push('Titan DEM: '+String(e?.message||e))}
  saturnMaterial.needsUpdate=true;state.status='ready';
 }
 function ensureLoaded(){
  if(!loadPromise){state.status='loading';loadPromise=loadAssets().catch(e=>{state.status='error';state.errors.push(String(e?.message||e))})}
  return loadPromise;
 }
 const start=performance.now();let last=start,simulationSeconds=Math.max(0,(Date.now()-EPOCH_UTC)/1000);
 function update(){
  const now=performance.now(),dt=clamp((now-last)/1000,0,.08);last=now;simulationSeconds+=dt*TIME_LAPSE;
  const selected=String(getSelectedBody?.()||'').toLowerCase();
  if(['saturn','titan','enceladus','mimas'].includes(selected))void ensureLoaded();
  if(getSaturnPosition){const p=getSaturnPosition();if(p&&p.isVector3)root.position.copy(p)}
  saturnMesh.rotation.y=(simulationSeconds*TAU/(10.656*3600))%TAU;
  saturnAtmosphereUniforms.time.value=simulationSeconds;
  saturnHaze.rotation.y=saturnMesh.rotation.y*.92;
  if(titanAtmosphere)titanAtmosphere.rotation.y=simulationSeconds*.00007;
  for(const mesh of ringMeshes)mesh.material.uniforms.uTime.value=simulationSeconds;
  for(const [key,m] of Object.entries(MOONS)){
   const pos=orbitPosition(simulationSeconds,m.orbit);moonMeshes.get(key).position.copy(pos);
   moonMeshes.get(key).rotation.y=-Math.atan2(pos.z,pos.x);
   orbitLines.get(key).material.opacity=.22+.06*Math.sin(simulationSeconds*.0009+key.length);
  }
  for(const p of plumeEffects){
   for(let i=0;i<p.phases.length;i++){
    const t=(p.phases[i]+simulationSeconds*.025)%1,point=p.curves[p.jet[i]].getPoint(t),drift=.0018*Math.sin(simulationSeconds*.7+i*2.37);
    p.positions[i*3]=point.x+drift;p.positions[i*3+1]=point.y;p.positions[i*3+2]=point.z-drift*.7;
   }
   p.geometry.attributes.position.needsUpdate=true;p.material.opacity=.70+.22*(.5+.5*Math.sin(simulationSeconds*.9));
  }
  const focusIsSaturn=['saturn','titan','enceladus','mimas'].includes(selected),overviewDistance=camera.position.distanceTo(new THREE.Vector3(0,0,0));
  for(const [key,sprite] of labels){
   const mesh=key==='saturn'?saturnMesh:moonMeshes.get(key),world=mesh.getWorldPosition(new THREE.Vector3());
   const radius=key==='saturn'?saturnRadius:MOONS[key].radiusKm/EARTH_RADIUS_KM;
   sprite.position.copy(world).add(new THREE.Vector3(0,radius+.35,0));
   sprite.visible=selected===key||(focusIsSaturn&&key!=='saturn')||(!focusIsSaturn&&overviewDistance>24&&camera.position.distanceTo(world)<2500);
   const d=Math.max(1e-6,camera.position.distanceTo(sprite.position));
   const w=76*2*d*Math.tan(camera.fov*DEG*.5)/Math.max(1,host.clientHeight||innerHeight);
   sprite.scale.set(w,w*.25,1);
  }
 }
 function dispose(){
  root.parent?.remove(root);
  for(const sprite of labels.values())sprite.parent?.remove(sprite);
  for(const mesh of ringMeshes){mesh.geometry.dispose();mesh.material.dispose()}
  for(const key of ['saturn','titan','enceladus','mimas']){bodyMap.delete(key);planetMeshes.delete(key)}
 }
 const api={version:'v6283-isolated',state,update,ensureLoaded,dispose,
  getBody:name=>bodyMap.get(String(name||'').toLowerCase())||null,
  get systemRoot(){return root},get saturnMesh(){return saturnMesh},
  physical:{saturnRadiusKm:SATURN_RADIUS_KM,moonRadiiKm:{titan:2574.73,enceladus:252.1,mimas:198.2},
   moonOrbitsKm:{titan:1221870,enceladus:238042,mimas:185539}}
 };
 window.__BP_SATURN_SYSTEM_V6282__=api;
 window.__BP_SATURN_SYSTEM_V6283__=api;state.status='idle';return api;
}
