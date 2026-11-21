/* BridgePoint aircraft appearance-only upgrades. Live ADS-B positions, headings,
   pressure/geometric altitude, filtering, and history belong to the existing tracker.
   Unknown types remain visibly labelled as representative class models. */
export const AIRCRAFT_VISUAL_VERSION=2;
const operatorCodes={
 UAL:['United Airlines',0x264d8a],DAL:['Delta Air Lines',0x344a78],
 AAL:['American Airlines',0x8fa6c0],SWA:['Southwest Airlines',0x2e52a9],
 JBU:['JetBlue',0x1c346b],BAW:['British Airways',0xe8e8ec],
 AFR:['Air France',0xe9f0fa],DLH:['Lufthansa',0xe4d7ac],
 KLM:['KLM',0x71a9de],ACA:['Air Canada',0xe4e8ec],
 QFA:['Qantas',0xf0f0f1],UAE:['Emirates',0xf6eeee],
 EZY:['easyJet',0xff6c39],RYR:['Ryanair',0xf1ed9c],
 WJA:['WestJet',0xebf4f1],NKS:['Spirit Airlines',0xf3d942],
 FFT:['Frontier Airlines',0xd9efda],ASA:['Alaska Airlines',0xcde4f3],
 VIR:['Virgin Atlantic',0xe9e9e9],UPS:['UPS Airlines',0xb7aa8d],
 FDX:['FedEx Express',0xd1c1eb],NAX:['Norwegian',0xe3e4ee]
};
const typeSpans={
 A318:34.1,A319:35.8,A320:35.8,A321:35.8,A20N:35.8,A21N:35.8,
 A332:60.3,A333:60.3,A339:64,A359:64.75,A35K:64.75,A388:79.75,
 B737:35.8,B738:35.8,B739:35.8,B37M:35.9,B38M:35.9,B39M:35.9,
 B744:64.44,B748:68.4,B752:38.05,B763:47.57,B772:60.93,B77W:64.8,
 B788:60.12,B789:60.12,B78X:60.12,E190:28.72,E195:28.72,
 CRJ7:23.24,CRJ9:24.85,CRJ2:21.21,AT72:27.05,DH8D:28.42,
 C172:11.0,C182:11.0,C208:15.87,PA28:10.7,PC12:16.28,
 SR22:11.68,DA40:11.94,R44:10.06,R66:10.06,B407:10.67,
 B429:12.68,S76:13.4,S92:17.17,EC35:10.2,EC45:11.0,AW139:13.8
};
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function operatorForFlight(flight){
 const code=String(flight||'').trim().toUpperCase().match(/^[A-Z]{3}/)?.[0]||'';
 const known=operatorCodes[code];
 return known?{code,name:known[0],color:known[1],basis:'broadcast callsign prefix; operator not independently verified'}:null;
}
export function airframeForRecord(kind,record={}){
 const t=String(record.t||record.type||record.type_code||'').trim().toUpperCase();
 const desc=String(record.desc||record.description||record.type_description||'').toUpperCase();
 let variant=kind==='jet'?'narrowbody':kind==='helicopter'?'utility':
  kind==='balloon'?'balloon':kind==='glider'?'sailplane':kind==='propeller'?'singleprop':'general';
 if(kind==='jet'){
  if(/^(A38|B74)/.test(t))variant='jumbo';
  else if(/^(A33|A35|B76|B77|B78)/.test(t)||/WIDEBODY/.test(desc))variant='widebody';
  else if(/^(E1|CRJ|E5)/.test(t))variant='regional';
  else if(/^(C5|C6|GLF|CL3|FA\d|G\d)/.test(t)||/BUSINESS JET|PRIVATE JET/.test(desc))variant='business';
 }else if(kind==='helicopter'){
  if(/^(S92|AW1|EC2|H2)/.test(t))variant='rescue';
  if(/^(R22|R44|R66|B06)/.test(t))variant='light';
 }else if(kind==='propeller'){
  if(/^(AT7|DH8|C208|PC12)/.test(t)||/TURBOPROP/.test(desc))variant='turboprop';
  else if(/^(C17|C18|PA28|SR22)/.test(t))variant='singleprop';
 }else if(kind==='balloon'&&/AIRSHIP|BLIMP|DIRIGIBLE/.test(desc))variant='airship';
 let span=typeSpans[t];
 if(!Number.isFinite(span))span=({
  jet:variant==='widebody'?62:variant==='jumbo'?73:variant==='regional'?28:variant==='business'?18:36,
  helicopter:variant==='rescue'?17:variant==='light'?10:13.5,
  glider:18,balloon:12,propeller:variant==='turboprop'?25:12,airplane:18,drone:.8
 })[kind]||18;
 return {kind,variant,type:t||null,spanM:span,typeConfirmed:Number.isFinite(typeSpans[t]),
  operator:operatorForFlight(record.flight||record.callsign||'')};
}
export function sunBelowHorizon(lat,lon,date=new Date()){
 const now=date instanceof Date?date:new Date(date);
 const day=Math.floor((Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())-
  Date.UTC(now.getUTCFullYear(),0,1))/86400000)+1;
 const decl=23.44*Math.cos(2*Math.PI*(day-172)/365)*Math.PI/180;
 const h=(now.getUTCHours()+now.getUTCMinutes()/60+now.getUTCSeconds()/3600+lon/15-12)*Math.PI/12;
 const p=clamp(Number(lat)||0,-89.99,89.99)*Math.PI/180;
 const sinAlt=Math.sin(p)*Math.sin(decl)+Math.cos(p)*Math.cos(decl)*Math.cos(h);
 return sinAlt<Math.sin(-3*Math.PI/180);
}
const palette={
 white:0xf0f5fc,silver:0xa7b6ce,blue:0x386ea9,navy:0x17345e,glass:0x172e42,
 teal:0x36d0de,orange:0xf5a64f,red:0xff454d,green:0x47f6a9,
 black:0x111b28,gold:0xe6bd58,flame:0xffb735,rope:0xb4a08c,
 shadow:0x4a596d,skin:0xe5e9ef
};
export function buildDetailedAirframe(T,kind,variant='general'){
 const pieces=[];
 const materialColor=c=>new T.Color(c??palette.white);
 function part(g,xyz=[0,0,0],r=[0,0,0],s=[1,1,1],color=palette.white,spin=0,pivot=[0,0,0],lamp=0){
  if(!g)return;
  const position=new T.Vector3(...xyz),rot=new T.Quaternion().setFromEuler(new T.Euler(...r)),scale=new T.Vector3(...s);
  g.applyMatrix4(new T.Matrix4().compose(position,rot,scale));
  pieces.push({g,color:materialColor(color),spin,pivot,lamp});
 }
 const sphere=(x,y,z,rx,ry,rz,col,seg=12)=>part(new T.SphereGeometry(1,seg,Math.max(8,Math.round(seg*.65))),
  [x,y,z],[0,0,0],[rx,ry,rz],col);
 const box=(x,y,z,dx,dy,dz,col,spin=0,pivot=[0,0,0],lamp=0)=>part(
  new T.BoxGeometry(dx,dy,dz),[x,y,z],[0,0,0],[1,1,1],col,spin,pivot,lamp);
 const rod=(a,b,r,col,spin=0,pivot=[0,0,0])=>{
  const p=new T.Vector3(...a),q=new T.Vector3(...b),vec=q.clone().sub(p),length=vec.length();
  if(length<.001)return;
  const g=new T.CylinderGeometry(r,r*.85,length,7);
  const quaternion=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),vec.normalize());
  g.applyMatrix4(new T.Matrix4().compose(p.add(q).multiplyScalar(.5),quaternion,new T.Vector3(1,1,1)));
  pieces.push({g,color:materialColor(col),spin,pivot,lamp:0});
 };
 const wing=(sign,rootX,span,sweep,rootChord,tipChord,z,color)=>{
  const y=sign*span;
  const sh=new T.Shape();sh.moveTo(rootX,-sign*.10);
  sh.lineTo(rootX+rootChord*.65,-sign*.10);
  sh.lineTo(rootX+rootChord*.25-sweep,y);
  sh.lineTo(rootX-sweep-tipChord*.5,y);
  sh.closePath();
  part(new T.ExtrudeGeometry(sh,{depth:.042,bevelEnabled:false,steps:1}),[0,0,z],[0,0,0],[1,1,1],color);
 };
 const lamp=(x,y,z,col,mode)=>part(new T.SphereGeometry(.041,9,6),[x,y,z],[0,0,0],[1,1,1],col,0,[0,0,0],mode);
 const main=kind==='jet'||kind==='airplane'||kind==='propeller'||kind==='glider';
 if(main){
  const wide=variant==='widebody'||variant==='jumbo';
  const small=variant==='regional'||variant==='business';
  const long=wide?1.40:small?.93:1.12;
  const fat=wide?.22:small?.135:.16;
  const ws=kind==='glider'?1.86:kind==='propeller'?.87:wide?1.43:1.19;
  sphere(-.035,0,0,long,fat,fat*.96,palette.white,18);
  sphere(long*.74,0,.008,long*.26,fat*.93,fat*.82,palette.silver,12);
  sphere(long*.79,0,.055,long*.20,fat*.81,fat*.30,palette.glass,12);
  wing(1,.05,ws,.42,wide?.67:.52,.14,-.07,palette.silver);
  wing(-1,.05,ws,.42,wide?.67:.52,.14,-.07,palette.silver);
  wing(1,-long*.76,.46,.14,.25,.065,.11,palette.white);
  wing(-1,-long*.76,.46,.14,.25,.065,.11,palette.white);
  box(-long*.77,0,.24,.18,.055,.45,palette.blue);
  sphere(-long*.80,0,.03,.20,.12,.09,palette.navy,10);
  const windowCount=kind==='propeller'?4:kind==='glider'?1:wide?17:small?7:12;
  for(const sign of [-1,1])for(let i=0;i<windowCount;i++){
   const x=-long*.66+i/windowCount*long*1.36;
   sphere(x,sign*(fat*.92),.082,.032,.012,.024,palette.glass,8);
   if(kind!=='glider')box(x,sign*(fat*.94),.081,.025,.008,.014,palette.teal,0,[0,0,0],4);
  }
  for(const sign of [-1,1]){
   lamp(-.1,sign*(ws*.97),-.07,sign>0?palette.green:palette.red,sign>0?2:1);
  }
  lamp(-long*.85,0,.18,palette.white,3);
  if(kind==='jet'){
   const engines=variant==='jumbo'?[-.42,-.82,.42,.82]:[-.54,.54];
   for(const y of engines){
    const x=.02,z=-.17;
    part(new T.CylinderGeometry(.105,.125,.43,14),[x,y,z],[0,0,Math.PI/2],[1,1,1],palette.silver);
    part(new T.CylinderGeometry(.073,.073,.018,12),[x+.23,y,z],[0,0,Math.PI/2],[1,1,1],palette.black);
    const pivot=[x+.25,y,z];
    for(let i=0;i<5;i++){
     const phi=i*Math.PI*2/5;
     rod([x+.255,y,z],[x+.255,y+Math.cos(phi)*.075,z+Math.sin(phi)*.075],.012,palette.silver,3,pivot);
    }
   }
  }else if(kind==='propeller'||kind==='airplane'){
   const pivot=[long*.95,0,0];
   part(new T.CylinderGeometry(.07,.095,.16,12),pivot,[0,0,Math.PI/2],[1,1,1],palette.shadow);
   box(pivot[0]+.10,0,0,.032,.032,.56,palette.black,3,pivot);
   box(pivot[0]+.10,0,0,.032,.56,.033,palette.black,3,pivot);
  }
  if(kind==='glider'){
   box(.34,0,.10,.70,.11,.085,palette.glass);
   sphere(.26,0,.12,.24,.10,.075,palette.glass,12);
  }
 }else if(kind==='helicopter'){
  sphere(.25,0,0,.60,.32,.38,palette.white,18);
  sphere(.53,0,-.035,.38,.29,.28,palette.glass,14);
  box(.0,.29,.05,.47,.018,.24,palette.navy);
  box(.0,-.29,.05,.47,.018,.24,palette.navy);
  sphere(-.17,0,.11,.22,.24,.13,palette.blue,12);
  rod([-.35,0,.08],[-1.25,0,.22],.071,palette.white);
  box(-1.28,0,.36,.32,.07,.30,palette.blue);
  box(-1.14,0,.19,.10,.49,.025,palette.silver,2,[-1.14,0,.2]);
  box(-1.14,0,.19,.10,.032,.46,palette.silver,2,[-1.14,0,.2]);
  // Landing skids: rails, cross tubes and foot/step pads.
  for(const side of [-1,1]){
   rod([-.46,side*.35,-.46],[.66,side*.35,-.46],.035,palette.shadow);
   for(const x of [-.23,.33])rod([x,side*.24,-.21],[x,side*.35,-.46],.023,palette.shadow);
   box(.29,side*.33,-.41,.31,.12,.022,palette.silver);
   lamp(.4,side*.30,.05,side>0?palette.green:palette.red,side>0?2:1);
  }
  rod([0,0,.35],[0,0,.63],.040,palette.shadow);
  sphere(0,0,.65,.11,.11,.06,palette.gold,10);
  box(0,0,.69,.070,1.82,.018,palette.black,1,[0,0,.69]);
  box(0,0,.69,1.82,.070,.018,palette.black,1,[0,0,.69]);
  lamp(-.92,0,.20,palette.white,3);
 }else if(kind==='balloon'){
  if(variant==='airship'){
   sphere(0,0,.20,1.20,.44,.52,palette.silver,22);
   sphere(-.15,0,-.26,.18,.14,.18,palette.navy,12);
   wing(1,-.75,.36,.03,.20,.07,.15,palette.silver);
   wing(-1,-.75,.36,.03,.20,.07,.15,palette.silver);
  }else{
   const hues=[0xe64c55,0xffa631,0xf5dc64,0x5ad8b4,0x4c97d5,0x8365ce,0xe37fa9,0xf4e6cb];
   for(let i=0;i<hues.length;i++){
    part(new T.SphereGeometry(.65,5,16,i*Math.PI/4,Math.PI/4,0,Math.PI),
      [0,0,.37],[0,0,0],[1,1,1.26],hues[i]);
   }
   for(const side of [-1,1])for(const y of [-.18,.18]){
    rod([side*.40,y,-.06],[side*.21,y,-.72],.010,palette.rope);
   }
   box(0,0,-.80,.35,.35,.28,palette.gold);
   box(0,0,-.95,.38,.38,.065,palette.shadow);
   for(const side of [-1,1]){
    box(side*.16,0,-.80,.09,.12,.12,palette.rope);
   }
   // Flame and fuel-burner assembly, softly pulsed by the night shader.
   rod([0,0,-.64],[0,0,-.48],.045,palette.shadow);
   part(new T.ConeGeometry(.09,.27,10),[0,0,-.46],[Math.PI/2,0,0],[1,1,1],palette.flame,0,[0,0,0],4);
  }
  lamp(0,.16,-.72,palette.white,3);
 }
 // Each mesh is ONE instanced GPU draw call, with individual body, canopy,
 // windows, lights, skids, engines, rotor/fan details and rich vertex color.
 let total=0,triangles=0;
 for(const p of pieces){total+=p.g.getAttribute('position')?.count||0;triangles+=(p.g.index?.count||p.g.getAttribute('position')?.count||0)}
 const pos=new Float32Array(total*3),norm=new Float32Array(total*3),col=new Float32Array(total*3),
  rotor=new Float32Array(total),pivot=new Float32Array(total*3),beacon=new Float32Array(total),
  idx=new Uint32Array(triangles);
 let at=0,indexAt=0;
 for(const p of pieces){
  const pa=p.g.getAttribute('position'),na=p.g.getAttribute('normal'),indices=p.g.index?.array;
  const r=p.color.r,g=p.color.g,b=p.color.b;
  for(let i=0;i<pa.count;i++){
   const j=at+i,k=j*3;
   pos[k]=pa.getX(i);pos[k+1]=pa.getY(i);pos[k+2]=pa.getZ(i);
   norm[k]=na?.getX(i)||0;norm[k+1]=na?.getY(i)||0;norm[k+2]=na?.getZ(i)||1;
   col[k]=r;col[k+1]=g;col[k+2]=b;
   rotor[j]=p.spin;pivot[k]=p.pivot[0]||0;pivot[k+1]=p.pivot[1]||0;pivot[k+2]=p.pivot[2]||0;
   beacon[j]=p.lamp;
  }
  if(indices){for(let i=0;i<indices.length;i++)idx[indexAt++]=at+indices[i]}
  else for(let i=0;i<pa.count;i++)idx[indexAt++]=at+i;
  at+=pa.count;p.g.dispose();
 }
 const geom=new T.BufferGeometry();
 geom.setAttribute('position',new T.BufferAttribute(pos,3));
 geom.setAttribute('normal',new T.BufferAttribute(norm,3));
 geom.setAttribute('color',new T.BufferAttribute(col,3));
 geom.setAttribute('aBpRotor',new T.BufferAttribute(rotor,1));
 geom.setAttribute('aBpPivot',new T.BufferAttribute(pivot,3));
 geom.setAttribute('aBpBeacon',new T.BufferAttribute(beacon,1));
 geom.setIndex(new T.BufferAttribute(idx.slice(0,indexAt),1));geom.computeBoundingSphere();
 geom.userData.bpAirframeVersion=2;geom.userData.bpAircraftClass=kind;geom.userData.bpVariant=variant;
 geom.userData.bpParts=pieces.length;
 return geom;
}
export function buildAircraftMaterial(T){
 const mat=new T.MeshStandardMaterial({color:0xffffff,metalness:.28,roughness:.38,
  emissive:0x000406,emissiveIntensity:.14,vertexColors:true,side:T.DoubleSide});
 mat.onBeforeCompile=shader=>{
  shader.uniforms.bpFlightTime={value:0};
  mat.userData.bpFlightShader=shader;
  shader.vertexShader=shader.vertexShader.replace('#include <common>',
   '#include <common>\nattribute float aBpRotor;\nattribute vec3 aBpPivot;\nattribute float aBpBeacon;\nattribute float aBpNight;\nuniform float bpFlightTime;\nvarying float vBpBeacon;\nvarying float vBpDark;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\nvBpBeacon=aBpBeacon;vBpDark=aBpNight;\n'+
   'if(aBpRotor>0.5){float a=bpFlightTime*(aBpRotor<1.5?18.0:aBpRotor<2.5?26.0:33.0);'+
   'float sn=sin(a),cs=cos(a);vec3 p=transformed-aBpPivot;'+
   'if(aBpRotor<1.5)transformed=aBpPivot+vec3(p.x*cs-p.y*sn,p.x*sn+p.y*cs,p.z);'+
   'else transformed=aBpPivot+vec3(p.x,p.y*cs-p.z*sn,p.y*sn+p.z*cs);}');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
   '#include <common>\nvarying float vBpBeacon;\nvarying float vBpDark;\nuniform float bpFlightTime;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
   '#include <emissivemap_fragment>\n'+
   'if(vBpBeacon>0.5){vec3 lamp=vBpBeacon<1.5?vec3(1.,.035,.018):'+
   'vBpBeacon<2.5?vec3(.08,1.,.31):vBpBeacon<3.5?vec3(1.,1.,.90):vec3(1.,.55,.12);'+
   'float flash=.75+.25*sin(bpFlightTime*7.0);'+
   'totalEmissiveRadiance+=lamp*vBpDark*(1.7+flash*.9);}');
 };
 mat.customProgramCacheKey=()=> 'bp-airframe-colored-rotors-lights-v2';
 mat.userData.bpFlightShader=null;
 return mat;
}
export function attachInstancedNight(T,geom,capacity){
 geom.setAttribute('aBpNight',new T.InstancedBufferAttribute(new Float32Array(Math.max(1,capacity)),1));
}
export function updateAircraftShader(material,seconds){
 const shader=material?.userData?.bpFlightShader;
 if(shader?.uniforms?.bpFlightTime)shader.uniforms.bpFlightTime.value=seconds;
}
export function mountAircraftCardPreview(host,T,{kind='airplane',variant='general',type='',flight='',registration='',operator=null}={}){
 if(!host||!T?.WebGLRenderer)return()=>{};
 const section=document.createElement('section');
 section.className='bp-aircraft-visual-model-card-v2';
 section.style.cssText='margin:10px 0;padding:8px;border:1px solid #639fb455;border-radius:10px;background:#071925;color:#d6f2ff';
 const heading=document.createElement('div');
 heading.textContent=(type||kind).toUpperCase()+' · 3D COLORED AIRCRAFT MODEL';
 heading.style.cssText='font:800 11px system-ui;margin-bottom:6px;color:#e2faff';
 const sub=document.createElement('div');
 sub.textContent=(operator?.name?operator.name+' · ':'')+
  (registration?registration+' · ':'')+
  (type?'type-code-based airframe':'representative airframe (exact model not broadcast)')+
  ' · rotate the view by dragging';
 sub.style.cssText='font:10px/1.4 system-ui;color:#b7d3e8;margin-bottom:6px';
 const canvas=document.createElement('canvas');
 canvas.width=560;canvas.height=296;
 canvas.style.cssText='width:100%;height:145px;display:block;touch-action:none;background:radial-gradient(ellipse at center,#18384b,#050e1b);border-radius:7px';
 section.append(heading,sub,canvas);host.appendChild(section);
 let renderer,geom,mat,frame=0,disposed=false,angle=.35,last=0;
 try{
  renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'});
  renderer.setSize(280,148,false);renderer.setPixelRatio(1);renderer.setClearColor(0x071525,0);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(43,280/148,.1,100);
  scene.add(new T.AmbientLight(0xffffff,2.1));
  const light=new T.DirectionalLight(0xffffff,2.8);light.position.set(4,-2,8);scene.add(light);
  geom=buildDetailedAirframe(T,kind,variant);attachInstancedNight(T,geom,1);
  geom.getAttribute('aBpNight').setX(0,1);
  mat=buildAircraftMaterial(T);
  const mesh=new T.InstancedMesh(geom,mat,1);mesh.frustumCulled=false;
  mesh.setMatrixAt(0,new T.Matrix4());mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);
  const edge=new T.GridHelper(3.2,8,0x5485a4,0x21465d);edge.rotation.x=Math.PI/2;edge.position.z=-.76;scene.add(edge);
  camera.position.set(0,-4.3,2.6);camera.lookAt(0,0,0);
  let held=false,x=0;
  canvas.addEventListener('pointerdown',e=>{held=true;x=e.clientX;canvas.setPointerCapture?.(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(held){angle+=(e.clientX-x)*.012;x=e.clientX}});
  canvas.addEventListener('pointerup',()=>{held=false});
  canvas.addEventListener('pointercancel',()=>{held=false});
  const tick=now=>{
   if(disposed||!section.isConnected)return;
   if(now-last>=50){last=now;
    updateAircraftShader(mat,now*.001);
    mesh.setMatrixAt(0,new T.Matrix4().makeRotationZ(angle));
    mesh.instanceMatrix.needsUpdate=true;
    renderer.render(scene,camera);
   }
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
 }catch(e){section.dataset.previewError=String(e?.message||e);console.warn('BridgePoint aircraft 3D card model',e)}
 return ()=>{disposed=true;cancelAnimationFrame(frame);try{mat?.dispose()}catch(_){}try{geom?.dispose()}catch(_){}
  try{renderer?.dispose()}catch(_){}section.remove()};
}
