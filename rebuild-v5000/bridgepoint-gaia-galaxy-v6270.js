import { initBridgePointSaturnSystem } from './bridgepoint-saturn-system-v6282.js?v=6282-saturn-system';

/**
 * BridgePoint unified celestial space — Gaia DR3 stars + solar-system bodies.
 * This module augments the existing welcome Three.js scene. It never creates a
 * second Earth, Moon or Sun, never replaces the camera, and has no Galaxy mode.
 *
 * Gaia coordinates stay in Galactic Cartesian parsecs. The solar-system
 * ephemerides use the same Galactic frame; the shared frame is rotated once so
 * its computed Earth-Sun vector meets the existing welcome Sun position.
 */
const BUILD='v6282-saturn-system';
const ROOT='/assets/stellar/gaia-dr3-v6270/';
const DEG=Math.PI/180;
const AU_PC=1/206264.80624709636;
const KM_AU=149597870.7;
const EARTH_RADIUS_KM=6371.0084;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PLANETS=[
 {name:'Mercury',a:.387098,e:.205635,i:7.0047,N:48.3313,w:29.1241,M:168.6562,nd:.0000324587,id:.00000005,wd:.0000101444,ed:.000000000559,md:4.0923344368,r:2439.7,c:0xcbbba5},
 {name:'Venus',a:.72333,e:.006773,i:3.3946,N:76.6799,w:54.891,M:48.0052,nd:.000024659,id:.0000000275,wd:.0000138374,ed:-.000000001302,md:1.6021302244,r:6051.8,c:0xffe6b9},
 {name:'Earth',a:1,e:.016709,i:0,N:0,w:282.9404,M:356.047,nd:0,id:0,wd:.0000470935,ed:-.000000001151,md:.9856002585,r:6371.0084,c:0x64aef6},
 {name:'Mars',a:1.523688,e:.093405,i:1.8497,N:49.5574,w:286.5016,M:18.6021,nd:.0000211081,id:-.0000000178,wd:.0000292961,ed:.000000002516,md:.5240207766,r:3389.5,c:0xef806b},
 {name:'Jupiter',a:5.20256,e:.048498,i:1.303,N:100.4542,w:273.8777,M:19.895,nd:.0000276854,id:-.0000001557,wd:.0000164505,ed:.000000004469,md:.0830853001,r:69911,c:0xe6c7a3},
 {name:'Saturn',a:9.55475,e:.055546,i:2.4886,N:113.6634,w:339.3939,M:316.967,nd:.000023898,id:-.0000001081,wd:.0000297661,ed:-.000000009499,md:.0334442282,r:58232,c:0xe8d29c},
 {name:'Uranus',a:19.18171,e:.047318,i:.7733,N:74.0005,w:96.6612,M:142.5905,nd:.000013978,id:.000000019,wd:.000030565,ed:.00000000745,md:.011725806,r:25362,c:0x9bd9df},
 {name:'Neptune',a:30.05826,e:.008606,i:1.77,N:131.7806,w:272.8461,M:260.2471,nd:.000030173,id:-.000000255,wd:-.000006027,ed:.00000000215,md:.005995147,r:24622,c:0x668fe8}
];
const GAL=(()=>{
 const ra=192.85948*DEG,dec=27.12825*DEG,cra=266.4051*DEG,cdec=-28.936175*DEG;
 const n=[Math.cos(dec)*Math.cos(ra),Math.sin(dec),Math.cos(dec)*Math.sin(ra)];
 const c=[Math.cos(cdec)*Math.cos(cra),Math.sin(cdec),Math.cos(cdec)*Math.sin(cra)];
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const norm=a=>{const q=Math.hypot(...a)||1;return a.map(v=>v/q)};
 const x=norm(c),y=norm(n.map((v,i)=>v-dot(n,x)*x[i]));
 const z=norm([x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]]);
 return {x,y,z};
})();
function toGal(x,y,z){
 return [
  x*GAL.x[0]+y*GAL.x[1]+z*GAL.x[2],
  x*GAL.y[0]+y*GAL.y[1]+z*GAL.y[2],
  x*GAL.z[0]+y*GAL.z[1]+z*GAL.z[2]
 ];
}
function eclToGal(x,y,z,e){
 const yy=y*Math.cos(e)-z*Math.sin(e),zz=y*Math.sin(e)+z*Math.cos(e);
 return toGal(x,yy,zz);
}
function readChunk(buffer){
 const d=new DataView(buffer);
 if(d.byteLength<16||d.getUint8(0)!==66||d.getUint8(1)!==80||d.getUint8(2)!==83||d.getUint8(3)!==71)throw Error('Invalid Gaia BPSG chunk');
 const version=d.getUint16(4,true),record=d.getUint16(6,true),count=d.getUint32(8,true);
 if(version!==6270||record!==68||d.byteLength!==16+count*record)throw Error('Gaia chunk schema mismatch');
 const rows=[];let p=16;
 for(let i=0;i<count;i++,p+=record){
  const id=((BigInt(d.getUint32(p+4,true))<<32n)|BigInt(d.getUint32(p,true))).toString();
  rows.push({id,x:d.getFloat64(p+8,true),y:d.getFloat64(p+16,true),z:d.getFloat64(p+24,true),
   g:d.getFloat32(p+32,true),color:d.getFloat32(p+36,true),radius:d.getFloat32(p+56,true)});
 }
 return rows;
}
function tint(v){
 const c=clamp(Number.isFinite(v)?v:.8,-.5,3.5);
 if(c<0)return [.62,.76,1];
 if(c<.35)return [.8,.88,1];
 if(c<.75)return [1,.98,.86];
 if(c<1.15)return [1,.83,.62];
 if(c<1.8)return [1,.64,.42];
 return [1,.43,.32];
}
function julian(d){return d.getTime()/86400000+2440587.5}
function obliquity(d){return (23.439291-.0130042*((julian(d)-2451545)/36525))*DEG}
function solve(M,e){
 let E=M+e*Math.sin(M)*(1+e*Math.cos(M));
 for(let i=0;i<7;i++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
 return E;
}
function planetPos(THREE,b,days,ob){
 const N=(b.N+b.nd*days)*DEG,I=(b.i+b.id*days)*DEG,w=(b.w+b.wd*days)*DEG,e=b.e+b.ed*days;
 const M=((b.M+b.md*days)%360+360)%360*DEG,E=solve(M,e);
 const xv=b.a*(Math.cos(E)-e),yv=b.a*Math.sqrt(Math.max(0,1-e*e))*Math.sin(E);
 const v=Math.atan2(yv,xv),r=Math.hypot(xv,yv),u=v+w;
 const x=r*(Math.cos(N)*Math.cos(u)-Math.sin(N)*Math.sin(u)*Math.cos(I));
 const y=r*(Math.sin(N)*Math.cos(u)+Math.cos(N)*Math.sin(u)*Math.cos(I));
 const z=r*Math.sin(u)*Math.sin(I);
 return new THREE.Vector3(...eclToGal(x,y,z,ob));
}
function labelSprite(THREE,text){
 const c=document.createElement('canvas');c.width=512;c.height=128;
 const x=c.getContext('2d');
 x.clearRect(0,0,c.width,c.height);
 x.font='800 58px system-ui,Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';
 x.lineJoin='round';x.lineWidth=12;x.strokeStyle='rgba(1,8,18,.92)';x.strokeText(text,256,62);
 x.fillStyle='#edf8ff';x.shadowColor='rgba(90,175,255,.85)';x.shadowBlur=14;x.fillText(text,256,62);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:true,depthWrite:false}));
 s.scale.set(1,0.25,1);s.renderOrder=20;s.userData.baseWidthPx=text==='MILKY WAY'?112:76;
 return s;
}
export function initBridgePointSolarCosmos(o){
 const {THREE,scene,camera,host,controls,starsGroup,getSunPosition,getMoonPosition,focusBody,clickables=[],bodyRefs={},isMobile=false}=o;
 if(!THREE||!scene||!camera||!starsGroup)throw new Error('Unified celestial scene requires the existing welcome Three.js objects');
 const state={version:BUILD,status:'loading',source:'ESA Gaia DR3 + Hipparcos bright-star supplement',
  starCount:0,loadedChunks:0,epoch:2026,distanceUnit:'parsec',stellarCoordinateFrame:'Galactic Cartesian, Sun-centred',
  planetCount:0,planetWork:'deferred until the next planet has its own detailed 3D model',
  controls:'single-scene-camera; zoom reveals existing Earth/Moon/Sun models and measured Gaia stars',
  externalDataRequests:0,errors:[],distanceRangePc:null};
 starsGroup.name='BridgePoint unified Gaia DR3 stellar and deep-space context';
 starsGroup.visible=true;
 const starSpace=new THREE.Group();starSpace.name='Gaia DR3 measured star positions and Milky Way-scale context';starsGroup.add(starSpace);
 const solarRoot=new THREE.Group();solarRoot.name='Continuous heliocentric planetary system; Earth/Sun/Moon reused from welcome scene';solarRoot.visible=false;starsGroup.add(solarRoot);
 const orbitScaleRoot=new THREE.Group();solarRoot.add(orbitScaleRoot);
 const labelsGroup=new THREE.Group();labelsGroup.name='World-anchored celestial body labels';scene.add(labelsGroup);
 const bodySelect=document.createElement('select');
 bodySelect.className='bpw-celestial-body-picker';
 bodySelect.setAttribute('aria-label','Choose a celestial body to explore');
 bodySelect.innerHTML='<option value="">CHOOSE CELESTIAL BODY</option>'+
  '<option value="earth">Earth</option><option value="moon">Moon</option><option value="sun">Sun</option>'+
  '<option value="saturn">Saturn</option><option value="titan">Titan</option><option value="enceladus">Enceladus</option><option value="mimas">Mimas</option>';
 const resetButton=controls?.querySelector('[data-space-reset]');
 if(controls)controls.insertBefore(bodySelect,resetButton||controls.firstChild);
 const css=document.createElement('style');
 css.textContent=
  '#bpWelcomeGateV1 .bpw-celestial-body-picker{appearance:none;max-width:min(56vw,245px);border:1px solid rgba(160,205,238,.48);border-radius:999px;padding:8px 28px 8px 11px;background:rgba(5,15,29,.82);color:#eaf7ff;font:800 10px/1.1 system-ui,sans-serif;letter-spacing:.045em;box-shadow:0 4px 16px rgba(0,0,0,.32);backdrop-filter:blur(8px);pointer-events:auto}'+
  '#bpWelcomeGateV1 .bpw-celestial-body-picker option{background:#061426;color:#eaf7ff}'+
  '#bpWelcomeGateV1 .bpw-space-controls{display:flex;align-items:center;gap:7px}'+
  '@media(max-width:620px){#bpWelcomeGateV1 .bpw-celestial-body-picker{max-width:58vw;padding:7px 23px 7px 9px;font-size:9px}#bpWelcomeGateV1 .bpw-space-controls{gap:5px}}';
 document.head.appendChild(css);
 let selectedBody='';
 bodySelect.addEventListener('change',()=>{
  selectedBody=bodySelect.value||'';
  if(selectedBody)focusBody?.(selectedBody);
 });
 const bodyMap=new Map();
 for(const [name,mesh] of Object.entries(bodyRefs||{})){
  if(mesh)bodyMap.set(name,{mesh,radius:name==='earth'?1:name==='moon'?.2727:1.22});
 }
 const labelMap=new Map();
 function addBodyLabel(name){
  const sprite=labelSprite(THREE,name.toUpperCase());labelsGroup.add(sprite);labelMap.set(name.toLowerCase(),sprite);return sprite;
 }
 addBodyLabel('Earth');addBodyLabel('Moon');addBodyLabel('Sun');
 const galaxyLabel=labelSprite(THREE,'MILKY WAY');labelsGroup.add(galaxyLabel);
 const planetMeshes=new Map(),planetMaterials=[],orbitMaterials=[],labelOffsets=new Map();
 const solarRevealLimit=22;
 const stellarContext=new THREE.Group();stellarContext.name='Milky Way large-scale structural context (schematic arms; Gaia points remain measured)';starSpace.add(stellarContext);
 const disk=new THREE.Mesh(new THREE.RingGeometry(1800,15000,192),new THREE.MeshBasicMaterial({color:0x31507c,transparent:true,opacity:.115,side:THREE.DoubleSide,depthWrite:false}));
 disk.rotation.x=-Math.PI/2;disk.position.set(8200,0,0);stellarContext.add(disk);
 const innerDisk=new THREE.Mesh(new THREE.RingGeometry(0,9000,160),new THREE.MeshBasicMaterial({color:0x29436b,transparent:true,opacity:.045,side:THREE.DoubleSide,depthWrite:false}));
 innerDisk.rotation.x=-Math.PI/2;innerDisk.position.set(8200,1,0);stellarContext.add(innerDisk);
 const armMaterial=new THREE.LineBasicMaterial({color:0x6c8fb9,transparent:true,opacity:.22,depthWrite:false});
 for(let arm=0;arm<4;arm++){
  const vertices=[];
  for(let i=0;i<=280;i++){
   const r=900+13600*i/280,a=arm*Math.PI/2+.6+.24*Math.log(r/900);
   vertices.push(8200+Math.cos(a)*r,18*Math.sin(i*.035+arm),Math.sin(a)*r);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  stellarContext.add(new THREE.Line(geometry,armMaterial));
 }
 stellarContext.visible=false;
 const planetDayZero=2451543.5;
 const planetRefs=[]; // Generic placeholder worlds are deferred until their dedicated models are built.
 const solarBodies=[];
 for(const p of planetRefs){
  const radius=p.r/EARTH_RADIUS_KM;
  const material=new THREE.MeshStandardMaterial({color:p.c,roughness:.82,metalness:.015,transparent:true,opacity:1});
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,isMobile?32:48,isMobile?20:32),material);
  mesh.name=p.name+' 3D planetary body';mesh.userData.body=p.name.toLowerCase();mesh.userData.celestialBody=p.name.toLowerCase();
  solarRoot.add(mesh);planetMeshes.set(p.name.toLowerCase(),mesh);planetMaterials.push(material);
  const label=labelSprite(THREE,p.name.toUpperCase());labelsGroup.add(label);labelMap.set(p.name.toLowerCase(),label);
  labelOffsets.set(p.name.toLowerCase(),radius);
  if(p.name==='Saturn'){
   const ring=new THREE.Mesh(new THREE.RingGeometry(radius*1.24,radius*2.23,96),
    new THREE.MeshBasicMaterial({color:0xd9c49b,transparent:true,opacity:.62,side:THREE.DoubleSide,depthWrite:false}));
   ring.rotation.x=-Math.PI/2;ring.name='Saturn 3D ring system';mesh.add(ring);
  }
  bodyMap.set(p.name.toLowerCase(),{mesh,radius});
  clickables.push(mesh);
 }
 for(const p of []){ // Defer orbital lines until a detailed planet model is ready.
  const points=[];
  for(let i=0;i<300;i++){
   const sample={...p,M:i*360/300};
   points.push(planetPos(THREE,sample,0,obliquity(new Date())));
  }
  const geometry=new THREE.BufferGeometry().setFromPoints(points);
  const material=new THREE.LineBasicMaterial({color:p.c,transparent:true,opacity:.24,depthWrite:false});
  const orbit=new THREE.LineLoop(geometry,material);orbit.name=p.name+' 3D heliocentric orbital path';orbitMaterials.push(material);orbitScaleRoot.add(orbit);
 }
 const starState={rows:[],points:null,parsecScale:0,orientation:new THREE.Quaternion(),planetDays:NaN,frame:null};
 const nowSun=()=>getSunPosition?getSunPosition():new THREE.Vector3(0,0,8);
 function astronomicalScale(){return Math.max(1,nowSun().length())}
 function applyFrame(){
   if(starState.frame)return starState.frame;
  const sun=nowSun();
  starsGroup.position.copy(sun);
  const date=new Date(),days=julian(date)-planetDayZero,ob=obliquity(date);
  const earthHelio=planetPos(THREE,PLANETS.find(p=>p.name==='Earth'),days,ob);
  // Align Earth's ephemeris to the existing welcome Earth at the origin.
  const auScale=sun.length()/Math.max(1e-12,earthHelio.length()),pcScale=auScale/AU_PC;
  const desiredSunToEarth=sun.clone().normalize().negate();
  const orientation=new THREE.Quaternion().setFromUnitVectors(earthHelio.clone().normalize(),desiredSunToEarth);
  starState.orientation.copy(orientation);starState.parsecScale=pcScale;
  starSpace.quaternion.copy(orientation);starSpace.scale.setScalar(pcScale);
  solarRoot.quaternion.copy(orientation);solarRoot.position.set(0,0,0);
  orbitScaleRoot.scale.setScalar(auScale);
  planetRefs.forEach(p=>{
   const mesh=planetMeshes.get(p.name.toLowerCase());
   mesh.position.copy(planetPos(THREE,p,days,ob).multiplyScalar(auScale));
   labelOffsets.set(p.name.toLowerCase(),p.r/EARTH_RADIUS_KM);
  });
  starState.planetDays=days;
  state.auToScene=auScale;state.parsecToScene=pcScale;
  const maxFar=pcScale*65000;
  if(camera.far<maxFar){camera.far=maxFar;camera.updateProjectionMatrix();}
  if(starState.points?.material?.uniforms?.uAUScale)starState.points.material.uniforms.uAUScale.value=auScale;
  if(starState.points?.material?.uniforms?.uViewportHeight)starState.points.material.uniforms.uViewportHeight.value=Math.max(1,host.clientHeight||innerHeight);
  starState.frame={sun,auScale,pcScale,orientation,days,ob};
  return starState.frame;
 }
 function addGaiaPoints(rows){
  const positions=new Float32Array(rows.length*3),colors=new Float32Array(rows.length*3),magnitudes=new Float32Array(rows.length),radii=new Float32Array(rows.length);
  rows.forEach((r,i)=>{
   const p=[r.x,r.y,r.z],j=i*3;
   positions.set(p,j);colors.set(tint(r.color),j);magnitudes[i]=r.g;radii[i]=Math.max(0,r.radius);
  });
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aColor',new THREE.BufferAttribute(colors,3));
  geometry.setAttribute('aMagnitude',new THREE.BufferAttribute(magnitudes,1));
  geometry.setAttribute('aRadius',new THREE.BufferAttribute(radii,1));
  geometry.computeBoundingSphere();
  const material=new THREE.ShaderMaterial({
   transparent:true,depthTest:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
   uniforms:{uViewportHeight:{value:Math.max(1,host.clientHeight||innerHeight)},uAUScale:{value:state.auToScene||astronomicalScale()}},
   vertexShader:'attribute vec3 aColor;attribute float aMagnitude;attribute float aRadius;varying vec3 vColor;varying float vBrightness;uniform float uViewportHeight;uniform float uAUScale;\n#include <logdepthbuf_pars_vertex>\nvoid main(){vColor=aColor;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;\n#include <logdepthbuf_vertex>\nfloat physical=(aRadius*0.00465047*uAUScale*projectionMatrix[1][1]*uViewportHeight)/max(1e-9,-mv.z);float photo=clamp(4.9-aMagnitude*.22,1.1,5.2);gl_PointSize=clamp(max(physical,photo),1.0,96.0);vBrightness=clamp(exp2((8.0-aMagnitude)*.16),.22,3.6);}',
   fragmentShader:'varying vec3 vColor;varying float vBrightness;\n#include <logdepthbuf_pars_fragment>\nvoid main(){\n#include <logdepthbuf_fragment>\nvec2 p=gl_PointCoord-vec2(.5);float r=length(p);if(r>.5)discard;float core=exp(-r*r*34.0);float halo=exp(-r*r*9.0);float a=clamp((core*.95+halo*.20)*vBrightness,0.0,1.0);gl_FragColor=vec4(vColor*(.45+core*1.9)*vBrightness,a);}'
  });
  const points=new THREE.Points(geometry,material);points.name='Gaia DR3 measured stellar positions';points.frustumCulled=false;starSpace.add(points);
  starState.points=points;state.starCount=rows.length;
  const ds=rows.map(r=>Math.hypot(r.x,r.y,r.z)).filter(Number.isFinite);
  state.distanceRangePc=[Math.min(...ds),Math.max(...ds)];
  state.status='ready';state.loadedChunks=6;state.hipparcosSupplement=24;state.galaxyModel='schematic Milky Way structure; individual points are Gaia/Hipparcos catalogue records';
 }
 function updateLabels(sun,pcScale,orientation,distance){
  const moon=getMoonPosition?getMoonPosition():new THREE.Vector3(8,.7,-1.4);
  const specs=[
   ['earth',new THREE.Vector3(0,1.34,0),1.34],
   ['moon',moon.clone().add(new THREE.Vector3(0,.45,0)),.45],
   ['sun',sun.clone().add(new THREE.Vector3(0,1.46,0)),1.46]
  ];
  for(const p of planetRefs){
   const mesh=planetMeshes.get(p.name.toLowerCase()),world=mesh.getWorldPosition(new THREE.Vector3());
   const off=p.r/EARTH_RADIUS_KM;
   specs.push([p.name.toLowerCase(),world.clone().add(new THREE.Vector3(0,off+.36,0)),off+.36]);
  }
  const localSolarScale=clamp((distance-solarRevealLimit)/10,0,1);
  const showLocalLabels=(distance>solarRevealLimit+2&&distance<pcScale*1500)||!!selectedBody;
  for(const [name,position] of specs){
   const sprite=labelMap.get(name);if(!sprite)continue;
   const focused=selectedBody===name;
   sprite.visible=focused||showLocalLabels&&(name==='earth'||name==='moon'||name==='sun'?true:localSolarScale>.42);
   sprite.position.copy(position);
   const d=Math.max(1e-6,camera.position.distanceTo(position));
   const worldPerPixel=2*d*Math.tan(camera.fov*DEG*.5)/Math.max(1,host.clientHeight||innerHeight);
   const w=(sprite.userData.baseWidthPx||76)*worldPerPixel;
   sprite.scale.set(w,w*.25,1);
  }
  stellarContext.visible=distance>pcScale*2500;
  galaxyLabel.visible=distance>pcScale*4500;
  if(galaxyLabel.visible){
   const center=new THREE.Vector3(8200,250,0).multiplyScalar(pcScale).applyQuaternion(orientation).add(sun);
   galaxyLabel.position.copy(center);
   const d=Math.max(1,camera.position.distanceTo(center));
   const worldPerPixel=2*d*Math.tan(camera.fov*DEG*.5)/Math.max(1,host.clientHeight||innerHeight);
   galaxyLabel.scale.set(112*worldPerPixel,28*worldPerPixel,1);
  }
 }
 function update(){
  if(state.status==='disposed')return;
  if(state.status!=='ready'||!starState.frame)return;
   const {sun,auScale,pcScale,orientation,days,ob}=starState.frame;
  const distance=camera.position.distanceTo(new THREE.Vector3(0,0,0));
  const focusedPlanet=selectedBody&&planetMeshes.has(selectedBody);
  const progress=focusedPlanet?1:clamp((distance-solarRevealLimit)/10,0,1);
  solarRoot.visible=progress>.001||!!focusedPlanet;
  planetMaterials.forEach(m=>{m.opacity=Math.max(.001,progress);});
  orbitMaterials.forEach(m=>{m.opacity=.24*progress;});
  updateLabels(sun,pcScale,orientation,distance);
  saturnController?.update?.();
 }
 function clearSelection(){selectedBody='';bodySelect.value='';}
 function setSelection(name){selectedBody=String(name||'').toLowerCase();bodySelect.value=selectedBody;}
 function getBody(name){return bodyMap.get(String(name||'').toLowerCase())||null}
 const saturnController=initBridgePointSaturnSystem({
  THREE,solarRoot,host,camera,bodyMap,planetMeshes,clickables,labelsGroup,labelMap,
  getSaturnPosition:()=>{const f=starState.frame;return f?planetPos(THREE,PLANETS.find(p=>p.name==='Saturn'),f.days,f.ob).applyQuaternion(f.orientation.clone().invert()).multiplyScalar(f.auScale):null},
  getSelectedBody:()=>selectedBody,isMobile
 });
 async function load(){
  const response=await fetch(ROOT+'manifest.json',{cache:'force-cache'});
  if(!response.ok)throw Error('Gaia manifest HTTP '+response.status);
  const manifest=await response.json();
  if(manifest.version!==6270||!Array.isArray(manifest.chunks)||manifest.chunks.length!==6)throw Error('Gaia manifest schema mismatch');
  state.epoch=manifest.position_epoch||2026;
  const chunks=await Promise.all(manifest.chunks.map(async c=>{
   const file=await fetch(ROOT+c.file,{cache:'force-cache'});if(!file.ok)throw Error(c.file+' HTTP '+file.status);
   if(typeof DecompressionStream==='undefined')throw Error('Browser gzip decompression unavailable');
   const raw=await file.arrayBuffer();
   const unpacked=await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
   return readChunk(unpacked);
  }));
  const seen=new Set(),rows=chunks.flat().filter(r=>{
   if(seen.has(r.id))return false;seen.add(r.id);
   return [r.x,r.y,r.z,r.g,r.color,r.radius].every(Number.isFinite)&&Math.hypot(r.x,r.y,r.z)>0;
  });
  if(!rows.length)throw Error('Gaia catalogue returned no usable 3D positions');
  state.loadedChunks=chunks.length;
  addGaiaPoints(rows);
  bodySelect.disabled=false;
  state.source=manifest.source||state.source;
  state.datasetQuality=manifest.quality||null;
  state.coordinateFrame=manifest.coordinate_frame||'Galactic Cartesian';
  state.namedStars=Object.keys(manifest.named_stars||{}).length;
  state.status='ready';
  window.__BP_SOLAR_COSMOS_V6280__=api;
  applyFrame();update();
 }
 const api={
  version:BUILD,state,
  update,
  getBody,
  setSelection,
  clearSelection,
  maxCameraDistance(){return (state.parsecToScene||astronomicalScale()/AU_PC)*60000},
  dispose(){
   state.status='disposed';saturnController?.dispose?.();bodySelect.remove();labelsGroup.parent?.remove(labelsGroup);
   stellarContext.clear();solarRoot.clear();starSpace.clear();
  }
 };
 window.__BP_SOLAR_COSMOS_V6280__=api;
 bodySelect.disabled=true;
 bodySelect.options[0].textContent='LOADING CELESTIAL DATA…';
 applyFrame();
 load().then(()=>{bodySelect.options[0].textContent='CHOOSE CELESTIAL BODY';bodySelect.disabled=false;})
  .catch(error=>{
   state.status='error';state.errors.push(String(error?.message||error));
   bodySelect.options[0].textContent='CELESTIAL DATA UNAVAILABLE';bodySelect.disabled=true;
   console.error('[BridgePoint Gaia DR3] Unified celestial data unavailable:',error);
  });
 return api;
}
