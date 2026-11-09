/**
 * BridgePoint Saturn system v6284 — atmospheric motion, ring depth, and tappable moons.
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
 const state={version:'v6284-saturn-movement-depth',status:'idle',source:'NASA Cassini PDS + NASA NAIF DSK + JPL Horizons',
  ephemerisEpochUTC:'2026-11-09T00:00:00Z',ephemerisFrame:'Saturn BODY EQUATOR',
  orbitTimeLapse:TIME_LAPSE,physicalSizeScale:'true mean radii relative to Earth',
  ringRadiusUnit:'km from Saturn centre',assets:'same-origin local static; no external runtime terrain requests',
  loaded:{saturnTexture:false,titanDEM:false,titanTexture:false,enceladusShape:false,enceladusTexture:false,mimasShape:false,mimasTexture:false},
  errors:[],moonCount:3,visualMoonScale:'up to 25x physical; Titan capped to 18% of Saturn radius',ringProfile:'lit MeshStandardMaterial + generated 2048px radial alphaMap',ringBands:['D','C','B','Cassini Division','A','F','G','E']};
 const root=new THREE.Group();root.name='SaturnSystemGroup — Saturn, measured rings, and orbiting moons';
 // Saturn pole (IAU body pole RA 40.589°, Dec 83.537°) transformed from ICRF into ecliptic axes.
 const saturnPoleRA=40.589*DEG,saturnPoleDec=83.537*DEG,obliquity=23.439291*DEG;
 const poleEq=[Math.cos(saturnPoleDec)*Math.cos(saturnPoleRA),Math.cos(saturnPoleDec)*Math.sin(saturnPoleRA),Math.sin(saturnPoleDec)];
 const poleEcl=[poleEq[0],poleEq[1]*Math.cos(obliquity)+poleEq[2]*Math.sin(obliquity),-poleEq[1]*Math.sin(obliquity)+poleEq[2]*Math.cos(obliquity)];
 root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(poleEcl[0],poleEcl[2],poleEcl[1]).normalize());
 solarRoot.add(root);
 const saturnRadius=SATURN_RADIUS_KM/EARTH_RADIUS_KM;
 const saturnGeometry=new THREE.SphereGeometry(saturnRadius,isMobile?128:192,isMobile?80:128);
 const saturnMaterial=new THREE.MeshStandardMaterial({color:0xe2c995,roughness:.93,metalness:0});
 const saturnAtmosphereUniforms={time:{value:0},lightDir:{value:new THREE.Vector3(1,0,0)}};
 // Dual-flow Cassini cloud layers plus procedural fill for polar/equatorial
 // no-data seams in the published NASA chart. The source image is cropped to
 // the actual planetary raster before its UVs are animated.
 saturnMaterial.onBeforeCompile=shader=>{
  shader.uniforms.uSaturnAtmosTime=saturnAtmosphereUniforms.time;
  shader.uniforms.uSaturnLightDir=saturnAtmosphereUniforms.lightDir;
  shader.vertexShader=shader.vertexShader.replace('#include <common>',
   '#include <common>\nvarying vec3 vSaturnLocalPosition;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\nvSaturnLocalPosition=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
   '#include <common>\nuniform float uSaturnAtmosTime;\nuniform vec3 uSaturnLightDir;\nvarying vec3 vSaturnLocalPosition;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`\n   #ifdef USE_MAP\n   vec2 saturnUvA=vMapUv;
   vec2 saturnUvB=vMapUv;
   saturnUvA.x=.175+mod((vMapUv.x-.175)+uSaturnAtmosTime*.0000065,.75);
   saturnUvB.x=.175+mod((vMapUv.x-.175)-uSaturnAtmosTime*.0000032,.75);
   saturnUvB.y=clamp(vMapUv.y+.0015*sin(vMapUv.y*28.0+uSaturnAtmosTime*.00021),.30,.77);
   vec4 saturnLayerA=mapTexelToLinear(texture2D(map,saturnUvA));
   vec4 saturnLayerB=mapTexelToLinear(texture2D(map,saturnUvB));
   vec4 saturnCloud= mix(saturnLayerA,saturnLayerB,.34);
   float saturnLuma=dot(saturnCloud.rgb,vec3(.299,.587,.114));
   float saturnMissing=1.0-smoothstep(.012,.115,saturnLuma);
   float saturnBand=.5+.5*sin(vMapUv.y*92.0+sin(vMapUv.x*17.0+uSaturnAtmosTime*.0005)*2.1+uSaturnAtmosTime*.0011);
   float saturnStorm=sin(vMapUv.x*35.0+sin(vMapUv.y*22.0+uSaturnAtmosTime*.0008)*3.4+uSaturnAtmosTime*.0017);
   vec3 saturnProcedural=vec3(.56,.425,.285)+vec3(.115,.083,.052)*(saturnBand-.5)+vec3(.035,.025,.018)*saturnStorm;
   saturnCloud.rgb=mix(saturnCloud.rgb,saturnProcedural,saturnMissing);
   // Saturn's rings cast a soft, physically positioned equatorial shadow.
   float lightY=uSaturnLightDir.y;
   float ringRayT=-vSaturnLocalPosition.y/(abs(lightY)<.025?(lightY<0.0?-.025:.025):lightY);
   vec3 ringPlaneHit=vSaturnLocalPosition+uSaturnLightDir*ringRayT;
   float ringHitRadius=length(ringPlaneHit.xz);
   float ringCoverage=smoothstep(10.2,10.7,ringHitRadius)*(1.0-smoothstep(74.2,75.5,ringHitRadius));
   float ringShadow=ringCoverage*step(0.0,ringRayT)*step(.025,abs(lightY))*.46;
   saturnCloud.rgb*=1.0-ringShadow;
   diffuseColor*=saturnCloud;\n   #endif\n  `);
 };
 saturnMaterial.customProgramCacheKey=()=> 'bridgepoint-saturn-dual-cloud-flow-ring-shadow-v6284';
 const saturnMesh=new THREE.Mesh(saturnGeometry,saturnMaterial);
 saturnMesh.name='Saturn — animated Cassini ISS atmosphere';saturnMesh.userData.body='saturn';
 saturnMesh.castShadow=true;saturnMesh.receiveShadow=true;root.add(saturnMesh);
 const saturnHazeUniforms={uTime:{value:0},uColor:{value:new THREE.Color(0xe6bd83)}};
 const saturnHaze=new THREE.Mesh(new THREE.SphereGeometry(saturnRadius*1.027,isMobile?96:160,isMobile?64:112),
  new THREE.ShaderMaterial({
   uniforms:saturnHazeUniforms,
   vertexShader:'varying vec3 vSaturnHazeNormal;varying vec3 vSaturnHazeView;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vSaturnHazeNormal=normalize(normalMatrix*normal);vSaturnHazeView=-mv.xyz;gl_Position=projectionMatrix*mv;}',
   fragmentShader:'uniform vec3 uColor;uniform float uTime;varying vec3 vSaturnHazeNormal;varying vec3 vSaturnHazeView;void main(){float facing=max(dot(normalize(vSaturnHazeNormal),normalize(vSaturnHazeView)),0.0);float rim=pow(1.0-facing,3.1);float flow=.94+.06*sin(uTime*.0012+vSaturnHazeNormal.y*18.0);float alpha=clamp(rim*.23*flow,0.0,.22);gl_FragColor=vec4(uColor,alpha);}',
   transparent:true,depthWrite:false,depthTest:true,side:THREE.BackSide,blending:THREE.AdditiveBlending,toneMapped:false
  }));
 saturnHaze.name='Saturn volumetric Fresnel atmospheric rim';root.add(saturnHaze);
 bodyMap.set('saturn',{mesh:saturnMesh,radius:saturnRadius,systemCameraDistance:470});
 planetMeshes.set('saturn',saturnMesh);clickables.push(saturnMesh);

 const ringMeshes=[],ringTimeUniforms=[];
 function buildRingAlphaProfile(name,opacity){
  const width=2048,height=4,data=new Uint8Array(width*height*4);
  const seed=({D:3,C:7,B:11,A:17,F:23,G:29,E:31})[name]||5;
  for(let x=0;x<width;x++){
   const u=x/(width-1);
   const waves=.82+.085*Math.sin(u*TAU*97+seed)+.045*Math.sin(u*TAU*431+seed*1.7)+.025*Math.sin(u*TAU*1207+seed*.8);
   const fineGapA=Math.exp(-Math.pow((u-(.29+seed*.001))/.0018,2));
   const fineGapB=Math.exp(-Math.pow((u-(.71-seed*.0007))/.0028,2));
   const clump=.92+.08*Math.sin(u*TAU*19+seed*.31);
   const value=Math.round(clamp(opacity*waves*clump*(1.0-.82*fineGapA-.72*fineGapB),0,1)*255);
   for(let y=0;y<height;y++){const i=(y*width+x)*4;data[i]=255;data[i+1]=value;data[i+2]=255;data[i+3]=255;}
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.UnsignedByteType);
  texture.wrapS=THREE.ClampToEdgeWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;texture.colorSpace=THREE.NoColorSpace;texture.needsUpdate=true;
  texture.userData.profile='procedural radial Cassini-style optical-depth alpha profile';
  return texture;
 }
 function ringGeometry(innerKm,outerKm,steps=5,segments=768){
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
 function addRing(name,inner,outer,tint,opacity,seg=768){
  const ringTime={value:0},alphaMap=buildRingAlphaProfile(name,opacity);
  const material=new THREE.MeshStandardMaterial({
   color:tint,alphaMap,transparent:true,opacity:1,alphaTest:.018,
   roughness:.86,metalness:.015,side:THREE.DoubleSide,depthTest:true,depthWrite:false
  });
  material.onBeforeCompile=shader=>{
   shader.uniforms.uRingTime=ringTime;
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uRingTime;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
    '#include <color_fragment>\nfloat ringDustMotion=.986+.014*sin(gl_FragCoord.x*.073+gl_FragCoord.y*.019+uRingTime*.004);\ndiffuseColor.rgb*=ringDustMotion;');
  };
  material.customProgramCacheKey=()=> 'bridgepoint-lit-ring-profile-'+name+'-v6284';
  material.userData.ringTime=ringTime;
  const mesh=new THREE.Mesh(ringGeometry(inner,outer,5,seg),material);
  mesh.name='Saturn '+name+' lit dust ring '+inner+'–'+outer+' km';mesh.userData.ringBand=name;
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.renderOrder=2;root.add(mesh);
  ringMeshes.push(mesh);ringTimeUniforms.push(ringTime);return mesh;
 }
 // Cassini/PDS ring radii: gaps are left empty instead of drawing a solid disc.
 addRing('D',66900,74510,0x96836b,.13);
 addRing('C',74510,92000,0x9f9278,.28);
 addRing('B',92000,117580,0xd7c8a2,.78);
 addRing('A',122170,136775,0xcbb98d,.58);
 addRing('F',140180,140480,0xe5d3ad,.40,768);
 addRing('G',166000,174000,0xb9a98a,.085);
 addRing('E',180000,480000,0xcdbf9f,.045);

 const moonMeshes=new Map(),orbitLines=new Map(),labels=new Map(),plumeEffects=[],moonHitboxes=new Map();
 let titanAtmosphere=null;
 for(const [key,m] of Object.entries(MOONS)){
  const radius=m.radiusKm/EARTH_RADIUS_KM;
  const visualScale=Math.min(25,(saturnRadius*.18)/radius);
  const visualRadius=radius*visualScale;
  const segments=key==='titan'?(isMobile?512:1024):(isMobile?96:160);
  const rings=key==='titan'?(isMobile?256:512):(isMobile?64:96);
  const placeholder=new THREE.Mesh(new THREE.SphereGeometry(radius,segments,rings),
   new THREE.MeshStandardMaterial({color:m.color,roughness:.94,metalness:0}));
  placeholder.scale.setScalar(visualScale);
  placeholder.name=m.name+' — '+visualScale.toFixed(1)+'x visual relief globe';
  placeholder.userData.body=key;placeholder.userData.visualScale=visualScale;placeholder.userData.physicalRadius=radius;
  placeholder.castShadow=true;placeholder.receiveShadow=true;
  root.add(placeholder);moonMeshes.set(key,placeholder);planetMeshes.set(key,placeholder);clickables.push(placeholder);
  const hitbox=new THREE.Mesh(
   new THREE.BoxGeometry(visualRadius*2.65,visualRadius*2.65,visualRadius*2.65),
   new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,colorWrite:false,depthWrite:false,depthTest:false})
  );
  hitbox.name=m.name+' invisible mobile tap hitbox';hitbox.userData.body=key;hitbox.userData.hitbox=true;
  hitbox.position.copy(placeholder.position);root.add(hitbox);moonHitboxes.set(key,hitbox);clickables.push(hitbox);
  bodyMap.set(key,{mesh:placeholder,radius,visualRadius,visualScale,systemCameraDistance:Math.max(.22,visualRadius*3.6),orbitKm:m.semimajorAxisKm});
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
  if(loaded.saturn){
   // The published Cassini image is a plotted global chart. Keep only its
   // 360° planetary raster; discard title, axes, tick labels and page margin.
   loaded.saturn.offset.set(.175,.30);
   loaded.saturn.repeat.set(.75,.47);
   loaded.saturn.wrapS=THREE.RepeatWrapping;loaded.saturn.wrapT=THREE.ClampToEdgeWrapping;
   loaded.saturn.needsUpdate=true;saturnMaterial.map=loaded.saturn;saturnMaterial.needsUpdate=true;
  }
  if(loaded.titan){
   const t=moonMeshes.get('titan');t.material.color.set(0xb8793d);
   t.material.map=loaded.titan;t.material.bumpMap=loaded.titan;t.material.bumpScale=.0025;
   t.material.roughness=.96;t.material.needsUpdate=true;
  }
  for(const key of ['enceladus','mimas']){
   if(!loaded[key])continue;
   try{
    const m=MOONS[key],file=await fetch(ASSET+m.mesh,{cache:'force-cache'});
    if(!file.ok)throw Error(m.mesh+' HTTP '+file.status);
    const raw=await decompress(await file.arrayBuffer()),dv=new DataView(raw);
    if(String.fromCharCode(...new Uint8Array(raw,0,4))!=='BPSM'||dv.getUint32(4,true)!==1)throw Error('Invalid '+m.name+' mesh header');
    const count=dv.getUint32(8,true),off=20;
    const position=new Float32Array(raw,off,count*3),normal=new Float32Array(raw,off+count*12,count*3),uv=new Float32Array(raw,off+count*24,count*2);
     // The body-fixed DSK xyz -> Three.js xzy axis swap is a reflection.
    // Reverse each non-indexed triangle after the swap so its front face and
    // outward DSK normals agree; otherwise the visible near-side plates vanish.
    if(count%3!==0)throw Error(m.name+' mesh triangle count is not divisible by 3');
    for(let i=0;i<count;i+=3){
     const second=i+1,third=i+2;
     for(let j=0;j<3;j++){
      let q=position[second*3+j];position[second*3+j]=position[third*3+j];position[third*3+j]=q;
      q=normal[second*3+j];normal[second*3+j]=normal[third*3+j];normal[third*3+j]=q;
     }
     for(let j=0;j<2;j++){const q=uv[second*2+j];uv[second*2+j]=uv[third*2+j];uv[third*2+j]=q;}
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(position,3));
    geometry.setAttribute('normal',new THREE.BufferAttribute(normal,3));
    geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.computeBoundingSphere();
    if(!geometry.boundingSphere||!Number.isFinite(geometry.boundingSphere.radius)||geometry.boundingSphere.radius<1e-5)
     throw Error(m.name+' DSK geometry has invalid bounds');
    const moon=moonMeshes.get(key);moon.geometry.dispose();moon.geometry=geometry;
    moon.material.dispose();
    moon.material=new THREE.MeshStandardMaterial({
     map:loaded[key],bumpMap:loaded[key],bumpScale:key==='mimas'?.006:.0035,
     color:0xffffff,roughness:.95,metalness:0
    });
    moon.material.side=THREE.FrontSide;moon.material.needsUpdate=true;
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
   mat.customProgramCacheKey=()=> 'bridgepoint-titan-cassini-dem-4ppd-v6284';mat.needsUpdate=true;state.loaded.titanDEM=true;
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
  root.updateMatrixWorld(true);
  saturnMesh.rotation.y=(simulationSeconds*TAU/(10.656*3600))%TAU;
  saturnAtmosphereUniforms.time.value=simulationSeconds;
  saturnHazeUniforms.uTime.value=simulationSeconds;
  if(titanAtmosphere)titanAtmosphere.rotation.y=simulationSeconds*.00007;
  for(const u of ringTimeUniforms)u.value=simulationSeconds;
  if(getSunPosition){
   const sun=getSunPosition();
   if(sun&&sun.isVector3){
    const localSun=root.worldToLocal(sun.clone());
    // Fragment normals/positions are in Saturn mesh-local coordinates, not
    // the tilted Saturn-system parent frame.
    if(localSun.lengthSq()>1e-12){
     localSun.applyQuaternion(saturnMesh.quaternion.clone().invert()).normalize();
     saturnAtmosphereUniforms.lightDir.value.copy(localSun);
    }
   }
  }
  for(const [key,m] of Object.entries(MOONS)){
   const pos=orbitPosition(simulationSeconds,m.orbit),moon=moonMeshes.get(key);
   moon.position.copy(pos);moon.rotation.y=-Math.atan2(pos.z,pos.x);
   const hitbox=moonHitboxes.get(key);if(hitbox){hitbox.position.copy(pos);hitbox.quaternion.copy(moon.quaternion)}
   orbitLines.get(key).material.opacity=.22+.06*Math.sin(simulationSeconds*.0009+key.length);
  }
  for(const p of plumeEffects){
   for(let i=0;i<p.phases.length;i++){
    const t=(p.phases[i]+simulationSeconds*.025)%1,point=p.curves[p.jet[i]].getPoint(t),drift=.0018*Math.sin(simulationSeconds*.7+i*2.37);
    p.positions[i*3]=point.x+drift;p.positions[i*3+1]=point.y;p.positions[i*3+2]=point.z-drift*.7;
   }
   p.geometry.attributes.position.needsUpdate=true;p.material.opacity=.70+.22*(.5+.5*Math.sin(simulationSeconds*.9));
  }
  const focusIsSaturn=['saturn','titan','enceladus','mimas'].includes(selected);
  const overviewDistance=camera.position.distanceTo(new THREE.Vector3(0,0,0));
  const ordered=[...labels.entries()].sort((a,b)=>(a[0]===selected?-2:a[0]==='saturn'?-1:0)-(b[0]===selected?-2:b[0]==='saturn'?-1:0));
  const occupied=[];
  for(const [key,sprite] of ordered){
   const mesh=key==='saturn'?saturnMesh:moonMeshes.get(key),world=mesh.getWorldPosition(new THREE.Vector3());
   const radius=key==='saturn'?saturnRadius:MOONS[key].radiusKm/EARTH_RADIUS_KM*(bodyMap.get(key)?.visualScale||1);
   sprite.position.copy(world).add(new THREE.Vector3(0,radius+.22,0));
   const candidate=selected==='saturn'||(focusIsSaturn&&(key===selected||key==='saturn'))||(!focusIsSaturn&&overviewDistance>24&&camera.position.distanceTo(world)<2500);
   const projected=sprite.position.clone().project(camera);
   const sx=(projected.x*.5+.5)*Math.max(1,host.clientWidth||innerWidth);
   const sy=(-projected.y*.5+.5)*Math.max(1,host.clientHeight||innerHeight);
   const inView=projected.z>-1&&projected.z<1&&sx>16&&sx<(host.clientWidth||innerWidth)-16&&sy>40&&sy<(host.clientHeight||innerHeight)-40;
   const crowded=occupied.some(p=>Math.hypot(p.x-sx,p.y-sy)<66);
   sprite.visible=!!candidate&&inView&&!crowded;
   if(sprite.visible)occupied.push({x:sx,y:sy});
   const d=Math.max(1e-6,camera.position.distanceTo(sprite.position));
   const w=72*2*d*Math.tan(camera.fov*DEG*.5)/Math.max(1,host.clientHeight||innerHeight);
   sprite.scale.set(w,w*.25,1);
  }
 }
 function dispose(){
  root.parent?.remove(root);
  for(const sprite of labels.values())sprite.parent?.remove(sprite);
  for(const mesh of ringMeshes){mesh.geometry.dispose();mesh.material.alphaMap?.dispose();mesh.material.dispose()}
  for(const hitbox of moonHitboxes.values()){
   hitbox.parent?.remove(hitbox);
   const index=clickables.indexOf(hitbox);if(index>=0)clickables.splice(index,1);
   hitbox.geometry.dispose();hitbox.material.dispose();
  }
  for(const key of ['saturn','titan','enceladus','mimas']){
   const mesh=moonMeshes.get(key);if(mesh){const index=clickables.indexOf(mesh);if(index>=0)clickables.splice(index,1)}
   if(saturnMesh&&key==='saturn'){const index=clickables.indexOf(saturnMesh);if(index>=0)clickables.splice(index,1)}
   bodyMap.delete(key);planetMeshes.delete(key);
  }
 }
 const api={version:'v6284-saturn-movement-depth',state,update,ensureLoaded,dispose,
  getBody:name=>bodyMap.get(String(name||'').toLowerCase())||null,
  get systemRoot(){return root},get saturnMesh(){return saturnMesh},
  physical:{saturnRadiusKm:SATURN_RADIUS_KM,moonRadiiKm:{titan:2574.73,enceladus:252.1,mimas:198.2},
   moonOrbitsKm:{titan:1221870,enceladus:238042,mimas:185539}}
 };
 window.__BP_SATURN_SYSTEM_V6282__=api;
 window.__BP_SATURN_SYSTEM_V6283__=api;
 window.__BP_SATURN_SYSTEM_V6284__=api;state.status='idle';return api;
}
