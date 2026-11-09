/**
 * BridgePoint Gaia DR3 3D star catalogue + heliocentric planetary scene.
 * Star positions are Gaia astrometry in parsecs, propagated to epoch 2026.0.
 */
const BUILD='v6270-gaia-dr3-galaxy', ROOT='/assets/stellar/gaia-dr3-v6270/';
const DEG=Math.PI/180, AU_PC=1/206264.80624709636, KM_AU=149597870.7;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const GAL=(()=>{
 const ra=192.85948*DEG,dec=27.12825*DEG,cra=266.4051*DEG,cdec=-28.936175*DEG;
 const n=[Math.cos(dec)*Math.cos(ra),Math.sin(dec),Math.cos(dec)*Math.sin(ra)];
 const c=[Math.cos(cdec)*Math.cos(cra),Math.sin(cdec),Math.cos(cdec)*Math.sin(cra)];
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],norm=a=>{const q=Math.hypot(...a)||1;return a.map(v=>v/q)};
 const x=norm(c),y=norm(n.map((v,i)=>v-dot(n,x)*x[i])),z=norm([x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]]);
 return {x,y,z};
})();
function toGal(x,y,z){return [x*GAL.x[0]+y*GAL.x[1]+z*GAL.x[2],x*GAL.y[0]+y*GAL.y[1]+z*GAL.y[2],x*GAL.z[0]+y*GAL.z[1]+z*GAL.z[2]]}
function eclToGal(x,y,z,e){const yy=y*Math.cos(e)-z*Math.sin(e),zz=y*Math.sin(e)+z*Math.cos(e);return toGal(x,yy,zz)}
function readChunk(buffer){
 const d=new DataView(buffer);
 if(d.byteLength<16||d.getUint8(0)!==66||d.getUint8(1)!==80||d.getUint8(2)!==83||d.getUint8(3)!==71)throw Error('Invalid Gaia BPSG chunk');
 const version=d.getUint16(4,true),record=d.getUint16(6,true),count=d.getUint32(8,true),epoch=d.getFloat32(12,true);
 if(version!==6270||record!==68||d.byteLength!==16+count*record)throw Error('Gaia chunk schema mismatch');
 const rows=[];let p=16;
 for(let i=0;i<count;i++,p+=record){
  const id=((BigInt(d.getUint32(p+4,true))<<32n)|BigInt(d.getUint32(p,true))).toString();
  rows.push({id,x:d.getFloat64(p+8,true),y:d.getFloat64(p+16,true),z:d.getFloat64(p+24,true),
   g:d.getFloat32(p+32,true),color:d.getFloat32(p+36,true),pmra:d.getFloat32(p+40,true),
   pmdec:d.getFloat32(p+44,true),rv:d.getFloat32(p+48,true),parallax:d.getFloat32(p+52,true),
   radius:d.getFloat32(p+56,true),temperature:d.getFloat32(p+60,true),absG:d.getFloat32(p+64,true)});
 }
 return {epoch,rows};
}
function tint(v){const c=clamp(Number.isFinite(v)?v:.8,-.5,3.5);if(c<0)return [.62,.76,1];if(c<.35)return [.8,.88,1];if(c<.75)return [1,.98,.86];if(c<1.15)return [1,.83,.62];if(c<1.8)return [1,.64,.42];return [1,.43,.32]}
function julian(d){return d.getTime()/86400000+2440587.5}
function obliquity(d){return (23.439291-.0130042*((julian(d)-2451545)/36525))*DEG}
function solve(M,e){let E=M+e*Math.sin(M)*(1+e*Math.cos(M));for(let i=0;i<7;i++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));return E}
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
function planetPos(b,days,ob){
 const N=(b.N+b.nd*days)*DEG,I=(b.i+b.id*days)*DEG,w=(b.w+b.wd*days)*DEG,e=b.e+b.ed*days;
 const M=((b.M+b.md*days)%360+360)%360*DEG,E=solve(M,e),xv=b.a*(Math.cos(E)-e),yv=b.a*Math.sqrt(Math.max(0,1-e*e))*Math.sin(E);
 const v=Math.atan2(yv,xv),r=Math.hypot(xv,yv),u=v+w;
 const x=r*(Math.cos(N)*Math.cos(u)-Math.sin(N)*Math.sin(u)*Math.cos(I));
 const y=r*(Math.sin(N)*Math.cos(u)+Math.cos(N)*Math.sin(u)*Math.cos(I));
 const z=r*Math.sin(u)*Math.sin(I);return eclToGal(x,y,z,ob).map(q=>q*AU_PC);
}
function labelSprite(THREE,text){
 const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');
 x.font='700 24px system-ui';x.textAlign='center';x.textBaseline='middle';x.shadowColor='#07111f';x.shadowBlur=8;x.fillStyle='#eaf3ff';x.fillText(text,128,31);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:true,depthWrite:false}));s.scale.set(.00012,.00003,1);return s;
}
export async function initBridgePointGaiaGalaxy(o){
 const {THREE,scene,camera,renderer,canvas,host,controls,starsGroup,getSunPosition,setTarget,target,setViewState,
  setMainBodiesVisible,setBackground,resetMainView,isMobile=false}=o;
 const state={version:BUILD,status:'loading',active:false,mode:'overview',starCount:0,loadedChunks:0,epoch:2026,
  source:'Gaia DR3',distanceUnit:'parsec',externalDataRequests:0,errors:[],planetCount:8};
 const bar=document.createElement('div');bar.className='bpw-gaia-controls';
 bar.innerHTML='<button data-gaia="local" disabled>GALAXY VIEW</button><button data-gaia="milkyway" disabled hidden>MILKY WAY</button><button data-gaia="solar" disabled hidden>SOLAR SYSTEM</button><button data-gaia="constellations" disabled hidden>CONSTELLATIONS OFF</button><button data-gaia="exit" hidden>BACK TO GLOBE</button>';
 controls.appendChild(bar);
 const css=document.createElement('style');css.textContent=
 '#bpWelcomeGateV1 .bpw-gaia-controls{display:flex;gap:5px;align-items:center;justify-content:flex-end;flex-wrap:wrap;pointer-events:auto;max-width:min(94vw,740px)}'+
 '#bpWelcomeGateV1 .bpw-gaia-controls button{appearance:none;border:1px solid rgba(135,190,235,.48);border-radius:999px;padding:8px 10px;background:rgba(5,15,29,.8);color:#eaf7ff;font:700 9px/1.1 system-ui,sans-serif;letter-spacing:.06em;backdrop-filter:blur(8px)}'+
 '#bpWelcomeGateV1 .bpw-gaia-controls button:disabled{opacity:.4}#bpWelcomeGateV1 .bpw-gaia-controls button[hidden]{display:none}'+
 '#bpWelcomeGateV1 .bpw-gaia-hud{position:absolute;z-index:10;left:max(12px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));max-width:min(86vw,490px);padding:9px 12px;border:1px solid rgba(135,190,235,.24);border-radius:10px;background:rgba(3,10,22,.78);color:#e8f4ff;font:600 10px/1.45 system-ui,sans-serif;pointer-events:none;white-space:pre-line;backdrop-filter:blur(8px)}'+
 '#bpWelcomeGateV1 .bpw-gaia-hud[hidden]{display:none}@media(max-width:620px){#bpWelcomeGateV1 .bpw-gaia-controls{gap:4px;max-width:calc(100vw - 16px)}#bpWelcomeGateV1 .bpw-gaia-controls button{padding:7px 8px;font-size:8px}#bpWelcomeGateV1 .bpw-gaia-hud{font-size:9px;max-width:88vw}}';
 document.head.appendChild(css);
 const hud=document.createElement('div');hud.className='bpw-gaia-hud';hud.hidden=true;host.appendChild(hud);
 const backdrop=new THREE.Group();backdrop.name='Milky Way contextual geometry (not catalogue stars)';backdrop.visible=false;starsGroup.add(backdrop);
 const disk=new THREE.Mesh(new THREE.RingGeometry(1800,15000,192),new THREE.MeshBasicMaterial({color:0x31507c,transparent:true,opacity:.11,side:THREE.DoubleSide,depthWrite:false}));
 disk.rotation.x=-Math.PI/2;disk.position.set(8200,0,0);backdrop.add(disk);
 const inner=new THREE.Mesh(new THREE.RingGeometry(0,9000,160),new THREE.MeshBasicMaterial({color:0x29436b,transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false}));
 inner.rotation.x=-Math.PI/2;inner.position.set(8200,1,0);backdrop.add(inner);
 const armMat=new THREE.LineBasicMaterial({color:0x6c8fb9,transparent:true,opacity:.2,depthWrite:false});
 for(let arm=0;arm<4;arm++){const v=[];for(let i=0;i<=220;i++){const r=900+13600*i/220,a=arm*Math.PI/2+.6+.24*Math.log(r/900);v.push(8200+Math.cos(a)*r,18*Math.sin(i*.035+arm),Math.sin(a)*r)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));backdrop.add(new THREE.Line(g,armMat))}
 let rows=[],absolute=new Float64Array(0),points=null,constellation=null,lineGeom=null,named=new Map();
 const edges=[['Betelgeuse','Bellatrix'],['Bellatrix','Mintaka'],['Mintaka','Alnilam'],['Alnilam','Alnitak'],['Alnitak','Saiph'],['Saiph','Rigel'],['Rigel','Mintaka'],
 ['Vega','Deneb'],['Deneb','Altair'],['Altair','Vega'],['Dubhe','Mizar'],['Mizar','Alkaid'],['Aldebaran','Elnath'],['Antares','Shaula'],['Sirius','Procyon']];
 let origin=new THREE.Vector3(),constellationOn=false,chosen=null,mode='overview';
 const sunMarker=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0xffd27a,size:7,sizeAttenuation:false,depthWrite:false}));
 sunMarker.geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0],3));starsGroup.add(sunMarker);sunMarker.visible=false;
 const sunSphere=new THREE.Mesh(new THREE.SphereGeometry(695700/KM_AU*AU_PC,24,16),new THREE.MeshBasicMaterial({color:0xffb84a}));starsGroup.add(sunSphere);sunSphere.visible=false;
 const solar=new THREE.Group();solar.name='Heliocentric planetary system (parsec world coordinates)';solar.visible=false;starsGroup.add(solar);
 const meshes=new Map(),labels=[],planetPosArray=new Float32Array(24),planetGeo=new THREE.BufferGeometry();
 planetGeo.setAttribute('position',new THREE.BufferAttribute(planetPosArray,3));
 const colors=new Float32Array(24);PLANETS.forEach((p,i)=>{const c=new THREE.Color(p.c);colors.set([c.r,c.g,c.b],i*3)});
 planetGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const planetMarks=new THREE.Points(planetGeo,new THREE.PointsMaterial({size:isMobile?3.2:4.2,sizeAttenuation:false,vertexColors:true,depthWrite:false}));solar.add(planetMarks);
 PLANETS.forEach(p=>{
  const m=new THREE.Mesh(new THREE.SphereGeometry(p.r/KM_AU*AU_PC,isMobile?14:20,isMobile?10:14),new THREE.MeshStandardMaterial({color:p.c,roughness:.8}));
  m.name=p.name+' — physical radius sphere';m.userData.planet=p.name;solar.add(m);meshes.set(p.name,m);
  const label=labelSprite(THREE,p.name);solar.add(label);labels.push(label);
  const curve=[];for(let i=0;i<240;i++){const sample={...p,M:i*360/240,nd:0,id:0,wd:0,ed:0,md:0};curve.push(new THREE.Vector3(...planetPos(sample,0,obliquity(new Date()))))}
  solar.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(curve),new THREE.LineBasicMaterial({color:p.c,transparent:true,opacity:.2,depthWrite:false})));
 });
 const moon=new THREE.Mesh(new THREE.SphereGeometry(1737.4/KM_AU*AU_PC,14,10),new THREE.MeshStandardMaterial({color:0xbfc7d3,roughness:.95}));moon.name='Moon physical-radius sphere';solar.add(moon);
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),pointers=new Map();let pinch=0,center=null,last={x:0,y:0},moved=false;
 function hudText(){return 'GAIA DR3 · '+state.starCount.toLocaleString()+' STAR POSITIONS\nTRUE 3D CARTESIAN POSITIONS · PARSECS · EPOCH '+state.epoch.toFixed(1)+'\nVIEW: '+(mode==='solar'?'SOLAR SYSTEM — PHYSICAL RADII + APPROXIMATE EPHEMERIDES':mode==='milkyway'?'MILKY WAY CONTEXT':'LOCAL STELLAR NEIGHBORHOOD')+'\n'+(chosen?('SELECTED '+chosen.id+' · '+chosen.distance.toFixed(2)+' pc · G '+chosen.g.toFixed(2)+' · BP−RP '+chosen.color.toFixed(2)):'Drag to orbit · two fingers to pan · pinch/wheel to zoom · tap a star for Gaia data')+(mode==='milkyway'?'\nDisk/arms are contextual geometry; points are Gaia catalogue stars.':'')}
 function drawHud(){hud.textContent=hudText()}
 function buttons(){
  [['local',!state.active],['milkyway',!state.active],['solar',!state.active],['constellations',!state.active],['exit',!state.active]].forEach(([a,hide])=>{bar.querySelector('[data-gaia="'+a+'"]').hidden=hide});
  bar.querySelector('[data-gaia="constellations"]').textContent=constellationOn?'CONSTELLATIONS ON':'CONSTELLATIONS OFF';
 }
 function setBase(next){
  origin.copy(next);if(!points)return;
  const a=points.geometry.getAttribute('position').array;
  for(let i=0;i<rows.length;i++){const j=i*3;a[j]=absolute[j]-origin.x;a[j+1]=absolute[j+1]-origin.y;a[j+2]=absolute[j+2]-origin.z}
  points.geometry.getAttribute('position').needsUpdate=true;points.geometry.computeBoundingSphere();
  if(lineGeom){const v=lineGeom.getAttribute('position').array;let n=0;for(const edge of edges){const a=named.get(edge[0]),b=named.get(edge[1]);if(!a||!b)continue;
   v[n++]=a[0]-origin.x;v[n++]=a[1]-origin.y;v[n++]=a[2]-origin.z;v[n++]=b[0]-origin.x;v[n++]=b[1]-origin.y;v[n++]=b[2]-origin.z}
   v.fill(0,n);lineGeom.setDrawRange(0,n/3);lineGeom.getAttribute('position').needsUpdate=true;lineGeom.computeBoundingSphere()}
  sunMarker.position.set(-origin.x,-origin.y,-origin.z);sunSphere.position.copy(sunMarker.position);
  backdrop.position.copy(sunMarker.position);solar.position.copy(sunMarker.position);
 }
 function rebase(){if(mode==='solar'||mode==='overview'||target.length()<20)return;const d=target.clone();camera.position.sub(d);target.sub(d);origin.add(d);setBase(origin)}
 function updatePlanets(date=new Date()){
  const days=julian(date)-2451543.5,ob=obliquity(date);let earth=[0,0,0];
  PLANETS.forEach((p,i)=>{const v=planetPos(p,days,ob);if(p.name==='Earth')earth=v;meshes.get(p.name).position.set(...v);labels[i].position.set(v[0]+.000015,v[1]+.000015,v[2]);planetPosArray.set(v,i*3)});
  const a=days/27.321661*Math.PI*2,inc=5.145*DEG,dist=384400/KM_AU;
  const off=eclToGal(dist*Math.cos(a),dist*Math.sin(a)*Math.cos(inc),dist*Math.sin(a)*Math.sin(inc),ob).map(q=>q*AU_PC);
  moon.position.set(earth[0]+off[0],earth[1]+off[1],earth[2]+off[2]);planetGeo.getAttribute('position').needsUpdate=true;
 }
 function enterGalaxy(){
  state.active=true;mode='galaxy';state.mode=mode;chosen=null;origin.set(0,0,0);setBase(origin);
  setViewState('galaxy');setMainBodiesVisible(false);setBackground(new THREE.Color(0x020712));
  starsGroup.position.set(0,0,0);starsGroup.visible=true;backdrop.visible=false;solar.visible=false;sunMarker.visible=true;sunSphere.visible=true;
  camera.up.set(0,1,0);camera.fov=60;camera.near=1e-9;camera.far=100000;camera.updateProjectionMatrix();
  setTarget(new THREE.Vector3(0,0,0));camera.position.set(0,30,170);camera.lookAt(target);hud.hidden=false;buttons();drawHud();
 }
 function enterMilky(){if(!state.active)enterGalaxy();mode='milkyway';state.mode=mode;backdrop.visible=true;solar.visible=false;
  setTarget(new THREE.Vector3(8200,0,0));camera.position.set(0,2600,14500);camera.lookAt(target);buttons();drawHud()}
 function enterSolar(){if(!state.active)enterGalaxy();mode='solar';state.mode=mode;backdrop.visible=false;solar.visible=true;starsGroup.position.set(0,0,0);
  origin.set(0,0,0);setBase(origin);setTarget(new THREE.Vector3(0,0,0));camera.near=1e-12;camera.far=100000;camera.fov=52;camera.updateProjectionMatrix();
  camera.position.set(0,.00024,115*AU_PC);camera.lookAt(target);updatePlanets();buttons();drawHud()}
 function exit(){state.active=false;mode='overview';state.mode='overview';chosen=null;hud.hidden=true;backdrop.visible=false;solar.visible=false;sunMarker.visible=false;sunSphere.visible=false;
  starsGroup.position.copy(getSunPosition());setMainBodiesVisible(true);setBackground(null);setViewState('overview');resetMainView();buttons()}
 function zoom(f){const off=camera.position.clone().sub(target);let d=off.length()*f;d=clamp(d,mode==='solar'?1e-10:1e-5,mode==='solar'?.02:mode==='milkyway'?50000:25000);camera.position.copy(target).add(off.normalize().multiplyScalar(d));camera.lookAt(target)}
 function pan(dx,dy){const d=Math.max(1e-10,camera.position.distanceTo(target)),right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
  const w=2*d*Math.tan(camera.fov*DEG*.5)/Math.max(1,host.clientHeight),shift=right.multiplyScalar(-dx*w).add(up.multiplyScalar(dy*w));
  camera.position.add(shift);target.add(shift);rebase();camera.lookAt(target)}
 function orbit(dx,dy){const off=camera.position.clone().sub(target),s=new THREE.Spherical().setFromVector3(off);s.theta-=dx*.0042;s.phi=clamp(s.phi+dy*.0042,.025,Math.PI-.025);off.setFromSpherical(s);camera.position.copy(target).add(off);camera.lookAt(target)}
 function gesture(){const p=[...pointers.values()].slice(0,2);if(p.length<2)return null;return {distance:Math.max(1,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)),center:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}}}
 function pick(e){const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));ray.setFromCamera(mouse,camera);ray.params.Points.threshold=Math.max(.0005,camera.position.distanceTo(target)*.002);
  const hits=[];if(points)hits.push(...ray.intersectObject(points,false));if(mode==='solar')hits.push(...ray.intersectObject(planetMarks,false));if(!hits.length)return;hits.sort((a,b)=>a.distance-b.distance);const h=hits[0];
  if(h.object===points&&h.index!=null){const r=rows[h.index];const code=BigInt(r.id),isHip=(code&(1n<<63n))!==0n;chosen={id:isHip?'HIP '+(code&((1n<<63n)-1n)).toString():'Gaia '+r.id,distance:Math.hypot(r.x,r.y,r.z),g:r.g,color:r.color};drawHud()}
  else if(h.object===planetMarks&&h.index!=null){const p=PLANETS[h.index];hud.textContent=p.name.toUpperCase()+' · APPROXIMATE KEPLERIAN EPHEMERIS\nMean radius '+p.r.toLocaleString()+' km · orbit '+p.a.toFixed(3)+' AU\nPhysical sphere + visible point marker'}}
 canvas.addEventListener('pointerdown',e=>{if(!state.active)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});last={x:e.clientX,y:e.clientY};moved=false;canvas.setPointerCapture?.(e.pointerId);if(pointers.size===2){const g=gesture();pinch=g.distance;center=g.center;moved=true}});
 canvas.addEventListener('pointermove',e=>{if(!state.active||!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>1){const g=gesture();if(center)pan(g.center.x-center.x,g.center.y-center.y);if(pinch>0)zoom(pinch/g.distance);pinch=g.distance;center=g.center;moved=true;return}
  const dx=e.clientX-last.x,dy=e.clientY-last.y;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;last={x:e.clientX,y:e.clientY};if(e.shiftKey||e.button===2)pan(dx,dy);else orbit(dx,dy)});
 canvas.addEventListener('pointerup',e=>{if(!state.active)return;const single=pointers.size===1;pointers.delete(e.pointerId);if(pointers.size<2){pinch=0;center=null}if(single&&!moved)pick(e)});
 canvas.addEventListener('pointercancel',e=>pointers.delete(e.pointerId));
 canvas.addEventListener('wheel',e=>{if(state.active){e.preventDefault();zoom(Math.exp(e.deltaY*.001)}},{passive:false});
 canvas.addEventListener('contextmenu',e=>{if(state.active)e.preventDefault()});
 bar.addEventListener('click',e=>{const b=e.target.closest('button[data-gaia]');if(!b)return;const a=b.dataset.gaia;
  if(a==='local')enterGalaxy();else if(a==='milkyway')enterMilky();else if(a==='solar')enterSolar();else if(a==='exit')exit();
  else if(a==='constellations'){constellationOn=!constellationOn;if(constellation)constellation.visible=constellationOn;b.textContent=constellationOn?'CONSTELLATIONS ON':'CONSTELLATIONS OFF';drawHud()}});
 new ResizeObserver(()=>{if(state.active){camera.aspect=Math.max(1,host.clientWidth)/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),false)}}).observe(host);
 async function load(){
  const res=await fetch(ROOT+'manifest.json',{cache:'force-cache'});if(!res.ok)throw Error('Gaia manifest HTTP '+res.status);
  const manifest=await res.json();if(manifest.version!==6270||!Array.isArray(manifest.chunks)||!manifest.chunks.length)throw Error('Gaia manifest schema mismatch');
  state.epoch=manifest.position_epoch||2026;state.source=manifest.source||'Gaia DR3';
  const chunks=await Promise.all(manifest.chunks.map(async c=>{const f=await fetch(ROOT+c.file,{cache:'force-cache'});if(!f.ok)throw Error(c.file+' HTTP '+f.status);
   if(typeof DecompressionStream==='undefined')throw Error('Browser gzip decompression unavailable');
   const raw=await f.arrayBuffer(),unpacked=await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();return readChunk(unpacked)}));
  const seen=new Set();rows=chunks.flatMap(c=>c.rows).filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return [r.x,r.y,r.z,r.g,r.color,r.radius].every(Number.isFinite)&&Math.hypot(r.x,r.y,r.z)>0});
  state.starCount=rows.length;state.loadedChunks=chunks.length;state.distanceRangePc=[Math.min(...rows.map(r=>Math.hypot(r.x,r.y,r.z))),Math.max(...rows.map(r=>Math.hypot(r.x,r.y,r.z)))];
  absolute=new Float64Array(rows.length*3);const pos=new Float32Array(rows.length*3),colors=new Float32Array(rows.length*3),mag=new Float32Array(rows.length),radii=new Float32Array(rows.length);
  rows.forEach((r,i)=>{const p=toGal(r.x,r.y,r.z),j=i*3;absolute.set(p,j);pos.set(p,j);colors.set(tint(r.color),j);mag[i]=r.g;radii[i]=r.radius});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('aColor',new THREE.BufferAttribute(colors,3));geo.setAttribute('aMagnitude',new THREE.BufferAttribute(mag,1));geo.setAttribute('aRadius',new THREE.BufferAttribute(radii,1));geo.computeBoundingSphere();
  const material=new THREE.ShaderMaterial({transparent:true,depthTest:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uViewportHeight:{value:Math.max(1,host.clientHeight||innerHeight)}},
   vertexShader:'attribute vec3 aColor;attribute float aMagnitude;attribute float aRadius;varying vec3 vColor;varying float vBrightness;uniform float uViewportHeight;void main(){vColor=aColor;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;float physical=(aRadius*projectionMatrix[1][1]*uViewportHeight)/max(1e-9,-mv.z);float photo=clamp(4.9-aMagnitude*.22,1.1,5.2);gl_PointSize=clamp(max(physical,photo),1.0,96.0);vBrightness=clamp(exp2((8.0-aMagnitude)*.16),.22,3.6);}',
   fragmentShader:'varying vec3 vColor;varying float vBrightness;void main(){vec2 p=gl_PointCoord-vec2(.5);float r=length(p);if(r>.5)discard;float core=exp(-r*r*34.0);float halo=exp(-r*r*9.0);float a=clamp((core*.95+halo*.20)*vBrightness,0.0,1.0);gl_FragColor=vec4(vColor*(.45+core*1.9)*vBrightness,a);}'});
  points=new THREE.Points(geo,material);points.name='Gaia DR3 measured stellar positions';starsGroup.add(points);
  const byId=new Map(rows.map(r=>[r.id,r]));Object.entries(manifest.named_stars||{}).forEach(([name,id])=>{const r=byId.get(String(id));if(r)named.set(name,toGal(r.x,r.y,r.z))});
  lineGeom=new THREE.BufferGeometry();const linePos=new Float32Array(edges.length*6);let n=0;
  edges.forEach(e=>{const a=named.get(e[0]),b=named.get(e[1]);if(!a||!b)return;const j=n++*6;linePos.set(a,j);linePos.set(b,j+3)});
  lineGeom.setAttribute('position',new THREE.BufferAttribute(linePos,3));lineGeom.setDrawRange(0,n*2);lineGeom.computeBoundingSphere();
  constellation=new THREE.LineSegments(lineGeom,new THREE.LineBasicMaterial({color:0x80baff,transparent:true,opacity:.55,depthWrite:false}));constellation.visible=false;constellation.name='Constellation guides linked to measured Gaia 3D star positions';starsGroup.add(constellation);
  state.namedStarCount=named.size;state.constellationLines=n;state.status='ready';bar.querySelectorAll('button').forEach(b=>b.disabled=false);
  bar.querySelector('[data-gaia="local"]').textContent='GALAXY VIEW · '+state.starCount.toLocaleString();starsGroup.position.copy(getSunPosition());
  buttons();drawHud();state.manifest={source:manifest.source,count:state.starCount,quality:manifest.quality,epoch:state.epoch,chunks:chunks.length,distanceRangePc:state.distanceRangePc};
 }
 const api={version:BUILD,state,enterGalaxy,enterMilkyWay:enterMilky,enterSolarSystem:enterSolar,exit,
  update(){if(!state.active)return;if(mode==='solar'&&Date.now()-(state.lastPlanetUpdate||0)>250){state.lastPlanetUpdate=Date.now();updatePlanets()}if(points?.material?.uniforms?.uViewportHeight)points.material.uniforms.uViewportHeight.value=Math.max(1,host.clientHeight||innerHeight)},
  selectStarAt(i){const r=rows[i];if(!r)return null;chosen={id:r.id,distance:Math.hypot(r.x,r.y,r.z),g:r.g,color:r.color};drawHud();return chosen}};
 window.__BP_GAIA_DR3_GALAXY_V6270__=api;
 load().catch(e=>{state.status='error';state.errors.push(String(e?.message||e));console.error('[BridgePoint Gaia DR3]',e);bar.querySelector('[data-gaia="local"]').disabled=true;hud.textContent='GAIA DR3 CATALOGUE FAILED TO LOAD\n'+state.errors[0]});
 return api;
}
