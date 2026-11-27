/* BridgePoint aircraft appearance-only upgrades. Live ADS-B positions, headings,
   pressure/geometric altitude, filtering, and history belong to the existing tracker.
   Unknown types remain visibly labelled as representative class models. */
export const AIRCRAFT_VISUAL_VERSION=11;
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
const sketchfabAirframes=new Map();
let sketchfabAirframePromise=null;
export async function prepareSketchfabAirframes(T){
 if(sketchfabAirframes.size)return sketchfabAirframes;
 if(!sketchfabAirframePromise){sketchfabAirframePromise=(async()=>{
  const [street,loaderApi]=await Promise.all([
   import('/vendor/bp-street-detail-v1.mjs?v=20261127-sketchfab-models'),
   import('/vendor/GLTFLoader.bundle.js?v=169-local')
  ]);
  const loader=new loaderApi.GLTFLoader(),gltf=await street.loadStreetGLTF(loader,{url:'/assets/street-detail-v1/sketchfab/aircraft737.glb.gz'}),root=gltf.scene||gltf.scenes?.[0];
  if(!root)throw Error('SKETCHFAB_AIRCRAFT_SCENE_MISSING');root.updateMatrixWorld(true);
  const axis=new T.Matrix4().makeRotationX(Math.PI/2),positions=[],normals=[],uvs=[],indices=[],groups=[],materials=[],materialIndex=new Map();let offset=0;
  const slot=m=>{if(!materialIndex.has(m)){materialIndex.set(m,materials.length);materials.push(m.clone())}return materialIndex.get(m)};
  root.traverse(o=>{
   if(!o.isMesh||!o.geometry||String(o.name||'').toLowerCase()==='cube')return;
   const g=o.geometry.clone().applyMatrix4(o.matrixWorld).applyMatrix4(axis),pa=g.getAttribute('position'),na=g.getAttribute('normal'),uv=g.getAttribute('uv');
   if(!pa)return;for(let i=0;i<pa.count;i++){positions.push(pa.getX(i),pa.getY(i),pa.getZ(i));normals.push(na?na.getX(i):0,na?na.getY(i):0,na?na.getZ(i):1);uvs.push(uv?uv.getX(i):0,uv?uv.getY(i):0)}
   const local=g.index?Array.from(g.index.array):Array.from({length:pa.count},(_,i)=>i),base=indices.length,ms=Array.isArray(o.material)?o.material:[o.material];
   for(const i of local)indices.push(offset+i);
   const sourceGroups=g.groups?.length?g.groups:[{start:0,count:local.length,materialIndex:0}];
   for(const part of sourceGroups){const mat=ms[part.materialIndex]||ms[0];groups.push({start:base+part.start,count:part.count,materialIndex:slot(mat)})}
   offset+=pa.count;g.dispose();
  });
  if(!positions.length||!materials.length)throw Error('SKETCHFAB_AIRCRAFT_GEOMETRY_EMPTY');
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);for(const group of groups)geometry.addGroup(group.start,group.count,group.materialIndex);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const size=geometry.boundingBox.getSize(new T.Vector3()),center=geometry.boundingBox.getCenter(new T.Vector3()),span=Math.max(size.y,.001),s=2.38/span;
  geometry.translate(-center.x,-center.y,-geometry.boundingBox.min.z);geometry.scale(s,s,s);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  sketchfabAirframes.set('fixed-wing',{geometry,materials,source:'Sketchfab 1/400 Boeing 737 Airplane For Free'});return sketchfabAirframes;
 })().catch(error=>{sketchfabAirframePromise=null;throw error})}
 return sketchfabAirframePromise;
}
function sketchfabAirframeGeometry(T){
 const base=sketchfabAirframes.get('fixed-wing');if(!base)return null;
 const geometry=base.geometry.clone();geometry.userData.bpSketchfabMaterials=base.materials;geometry.userData.bpSketchfabSource=base.source;return geometry;
}
export function buildDetailedAirframe(T,kind,variant='general',grounded=false){
 if(kind==='jet'||kind==='airplane'){const source=sketchfabAirframeGeometry(T);return source||new T.BufferGeometry();}
 const pieces=[];
 const materialColor=c=>new T.Color(c??palette.white);
 function part(g,xyz=[0,0,0],r=[0,0,0],s=[1,1,1],color=palette.white,spin=0,pivot=[0,0,0],lamp=0){
  if(!g)return;
  const position=new T.Vector3(...xyz),rot=new T.Quaternion().setFromEuler(new T.Euler(...r)),scale=new T.Vector3(...s);
  g.applyMatrix4(new T.Matrix4().compose(position,rot,scale));
  pieces.push({g,color:materialColor(color),spin,pivot,lamp});
 }
 const sphere=(x,y,z,rx,ry,rz,col,seg=12)=>part(new T.SphereGeometry(1,Math.max(32,seg*2),Math.max(20,Math.round(seg*1.25))),
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
 const lamp=(x,y,z,col,mode)=>part(new T.SphereGeometry(mode>=5?.052:.041,12,8),[x,y,z],[0,0,0],[1,1,1],col,0,[0,0,0],mode);
 const main=kind==='jet'||kind==='airplane'||kind==='propeller'||kind==='glider';
 if(main){
  const wide=variant==='widebody'||variant==='jumbo';
  const small=variant==='regional'||variant==='business';
  const long=variant==='jumbo'?1.56:wide?1.40:small?.93:1.12;
  const fat=wide?.22:small?.135:.16;
  const ws=kind==='glider'?1.86:kind==='propeller'?.87:wide?1.43:1.19;
  sphere(-.035,0,0,long,fat,fat*.96,palette.white,32);
  sphere(-long*.72,0,.016,long*.29,fat*.66,fat*.72,palette.skin,26);
  // Fuselage doors, recessed seams, antennas and individual window frames.
  for(const side of [-1,1]){
   for(const x of [-long*.64,long*.57]){
    const y=side*fat*Math.sqrt(Math.max(.1,1-Math.pow((x+.035)/long,2)));
    box(x,y,.015,.10,.006,.16,palette.shadow);
    box(x,y+side*.004,.015,.087,.007,.145,palette.skin);
    box(x-.025,y+side*.009,.045,.018,.006,.009,palette.shadow);
   }
   for(let i=0;i<4;i++)box(long*.19-i*.095,side*fat*.98,-.075,.055,.004,.023,palette.silver);
  }
  box(-.16,0,fat,.08,.012,.05,palette.silver);
  box(-long*.50,0,fat*.82,.10,.012,.045,palette.shadow);
  if(variant==='jumbo')sphere(long*.34,0,fat*.58,long*.50,fat*.77,fat*.63,palette.white,30);
  sphere(long*.74,0,.008,long*.26,fat*.93,fat*.82,palette.silver,12);
  sphere(long*.79,0,.055,long*.20,fat*.81,fat*.30,palette.glass,12);
  wing(1,.05,ws,.42,wide?.67:.52,.14,-.07,palette.silver);
  wing(-1,.05,ws,.42,wide?.67:.52,.14,-.07,palette.silver);
  wing(1,-long*.76,.46,.14,.25,.065,.11,palette.white);
  wing(-1,-long*.76,.46,.14,.25,.065,.11,palette.white);
  const fin=new T.Shape();fin.moveTo(-long*.99,.04);fin.lineTo(-long*.57,.04);fin.lineTo(-long*.83,.53);fin.lineTo(-long*.99,.48);fin.closePath();
  part(new T.ExtrudeGeometry(fin,{depth:.042,bevelEnabled:true,bevelSegments:2,bevelSize:.008,bevelThickness:.006}),[0,.021,0],[Math.PI/2,0,0],[1,1,1],palette.blue);
  for(const sign of [-1,1]){
   for(let j=0;j<5;j++)box(-.14-j*.051,sign*ws*(.25+j*.125),-.028,.10,.075,.015,palette.shadow);
   box(-.34,sign*ws*.98,.018,.075,.027,.15,palette.blue);
   sphere(-.26,sign*ws*.98,-.034,.07,.03,.026,palette.silver,12);
  }
  sphere(-long*.80,0,.03,.20,.12,.09,palette.navy,10);
  const windowCount=kind==='propeller'?4:kind==='glider'?1:wide?34:small?13:23;
  for(const sign of [-1,1])for(let i=0;i<windowCount;i++){
   const x=-long*.66+i/windowCount*long*1.36;
   const y=sign*fat*Math.sqrt(Math.max(.05,1-Math.pow((x+.035)/long,2)-Math.pow(.082/(fat*.96),2)));
   sphere(x,y,.082,.027,.009,.022,palette.shadow,12);
   sphere(x,y+sign*.006,.082,.022,.008,.017,palette.glass,12);
   if(kind!=='glider')box(x,sign*(fat*.94),.081,.025,.008,.014,palette.teal,0,[0,0,0],4);
  }
  for(const sign of [-1,1]){
   lamp(-.1,sign*(ws*.97),-.07,sign>0?palette.green:palette.red,sign>0?2:1);
  }
  lamp(-long*.85,0,.18,palette.white,3);
  lamp(.02,0,fat+.025,palette.red,5);
  lamp(.05,0,-fat-.02,palette.red,5);
  for(const side of [-1,1]){
   lamp(-.27,side*ws*.98,-.045,palette.white,6);
   lamp(.32,side*.32,-.095,palette.white,7);
  }
  lamp(long*.85,0,-fat*.58,palette.white,7);
  if(kind==='jet'||kind==='airplane'){
   const engines=variant==='jumbo'?[-.42,-.82,.42,.82]:[-.54,.54];
   for(const y of engines){
    const x=.02,z=-.17;
    const outer=new T.Shape(),hole=new T.Path();outer.absarc(0,0,.128,0,Math.PI*2,false);hole.absarc(0,0,.087,0,Math.PI*2,true);outer.holes.push(hole);
    part(new T.ExtrudeGeometry(outer,{depth:.43,curveSegments:32,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2}),[x-.22,y,z],[0,Math.PI/2,0],[1,1,1],palette.silver);
    part(new T.TorusGeometry(.107,.014,12,48),[x+.23,y,z],[0,Math.PI/2,0],[1,1,1],palette.skin);
    part(new T.CylinderGeometry(.083,.083,.014,32),[x+.035,y,z],[0,0,Math.PI/2],[1,1,1],palette.black);
    sphere(x+.13,y,z,.065,.029,.029,palette.shadow,24);
    box(x,y,z+.12,.23,.061,.13,palette.skin);
    const pivot=[x+.17,y,z];
    for(let i=0;i<24;i++){
     const phi=i*Math.PI*2/24;
     rod([pivot[0],y+Math.cos(phi)*.025,z+Math.sin(phi)*.025],[pivot[0]-.018,y+Math.cos(phi+.19)*.084,z+Math.sin(phi+.19)*.084],.008,palette.silver,3,pivot);
    }
    part(new T.TorusGeometry(.080,.012,10,32),[x-.25,y,z],[0,Math.PI/2,0],[1,1,1],palette.shadow);

   }
  }else if(kind==='propeller'){
   const pivot=[long*.95,0,0];
   part(new T.CylinderGeometry(.07,.095,.16,12),pivot,[0,0,Math.PI/2],[1,1,1],palette.shadow);
   box(pivot[0]+.10,0,0,.032,.032,.56,palette.black,3,pivot);
   box(pivot[0]+.10,0,0,.032,.56,.033,palette.black,3,pivot);
   sphere(pivot[0]+.105,0,0,.065,.043,.043,palette.silver,24);
   if(variant==='turboprop')for(const y of [-.49,.49]){
     const p=[.21,y,-.075];sphere(p[0]-.11,y,p[2],.23,.085,.085,palette.skin,24);
     for(let i=0;i<6;i++){const a=i*Math.PI/3;rod(p,[p[0],y+Math.cos(a)*.23,p[2]+Math.sin(a)*.23],.016,palette.black,3,p);}
     sphere(p[0]+.025,y,p[2],.06,.044,.044,palette.silver,20);
   }
  }
  if(grounded){
   const gear=(x,y,z,r)=>{rod([x,y,z+.18],[x,y,z],.018,palette.silver);part(new T.CylinderGeometry(r,r,.042,24),[x,y,z],[Math.PI/2,0,0],[1,1,1],palette.black);part(new T.CylinderGeometry(r*.42,r*.42,.046,16),[x,y,z],[Math.PI/2,0,0],[1,1,1],palette.silver);};
   if(kind==='glider')gear(0,0,-.19,.055);
   else{gear(long*.65,0,-.26,.075);for(const side of [-1,1])gear(-.11,side*(wide?.30:.23),-.29,wide?.12:.095);}
  }
  if(kind==='glider'){
   box(.34,0,.10,.70,.11,.085,palette.glass);
   sphere(.26,0,.12,.24,.10,.075,palette.glass,12);
  }
 }else if(kind==='drone'){
  sphere(0,0,.06,.24,.20,.12,palette.shadow,14);
  box(0,0,.12,.31,.24,.10,palette.silver);
  for(const sx of [-1,1])for(const sy of [-1,1]){
   const x=sx*.47,y=sy*.47,p=[x,y,.10];
   rod([0,0,.10],[x,y,.10],.032,palette.black);
   part(new T.CylinderGeometry(.070,.070,.10,12),[x,y,.11],[Math.PI/2,0,0],[1,1,1],palette.blue);
   box(x,y,.19,.42,.025,.018,palette.black,1,p);
   box(x,y,.19,.025,.42,.018,palette.black,1,p);
   lamp(x,y,.18,sy>0?palette.green:palette.red,sy>0?2:1);
  }
  sphere(.23,0,.03,.09,.10,.08,palette.glass,10);lamp(.08,0,.22,palette.white,6);
 }else if(kind==='helicopter'){
  sphere(.25,0,0,.60,.32,.38,palette.white,32);
  for(const side of [-1,1]){
   box(.05,side*.300,.015,.46,.013,.30,palette.shadow);
   box(.05,side*.310,.015,.43,.014,.27,palette.skin);
   box(.05,side*.325,.095,.35,.014,.115,palette.glass);
   box(.22,side*.332,-.047,.065,.013,.018,palette.shadow);
   box(-.20,side*.255,-.09,.20,.09,.09,palette.silver);
   for(let k=0;k<4;k++)box(-.16+k*.06,side*.288,-.14,.035,.015,.025,palette.shadow);
  }
  sphere(-.17,0,.28,.28,.21,.14,palette.shadow,30);
  for(const side of [-1,1])part(new T.CylinderGeometry(.055,.065,.16,20),[-.29,side*.16,.31],[0,0,Math.PI/2],[1,1,1],palette.silver);
  sphere(.53,0,-.035,.38,.29,.28,palette.glass,14);
  box(.0,.29,.05,.47,.018,.24,palette.navy);
  box(.0,-.29,.05,.47,.018,.24,palette.navy);
  sphere(-.17,0,.11,.22,.24,.13,palette.blue,12);
  rod([-.35,0,.08],[-1.25,0,.22],.071,palette.white);
  box(-1.28,0,.36,.32,.07,.30,palette.blue);
  box(-1.14,0,.19,.10,.49,.025,palette.silver,5,[-1.14,0,.2]);
  box(-1.14,0,.19,.10,.032,.46,palette.silver,5,[-1.14,0,.2]);
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
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;rod([0,0,.69],[Math.cos(a)*.90,Math.sin(a)*.90,.69],.025,palette.shadow,1,[0,0,.69]);}
  sphere(0,0,.70,.12,.12,.065,palette.silver,24);
  lamp(-.92,0,.20,palette.white,3);
  lamp(-.20,0,.44,palette.red,5);
  lamp(-.18,0,-.32,palette.red,5);
  lamp(.25,.31,.035,palette.white,6);
  lamp(.25,-.31,.035,palette.white,6);
  lamp(.76,0,-.21,palette.white,7);
 }else if(kind==='balloon'){
  if(variant==='airship'){
   sphere(0,0,.20,1.20,.44,.52,palette.silver,22);
   sphere(-.15,0,-.26,.18,.14,.18,palette.navy,12);
   wing(1,-.75,.36,.03,.20,.07,.15,palette.silver);
   wing(-1,-.75,.36,.03,.20,.07,.15,palette.silver);
  }else{
   const hues=[0xe64c55,0xffa631,0xf5dc64,0x5ad8b4,0x4c97d5,0x8365ce,0xe37fa9,0xf4e6cb];
   for(let i=0;i<hues.length;i++){
    part(new T.SphereGeometry(.65,12,32,i*Math.PI/4,Math.PI/4,0,Math.PI),
      [0,0,.37],[Math.PI/2,0,0],[1,1.26,1],hues[i]);
   }
   for(const side of [-1,1])for(const y of [-.18,.18]){
    rod([side*.40,y,-.06],[side*.21,y,-.72],.010,palette.rope);
   }
   box(0,0,-.80,.35,.35,.28,palette.gold);
   for(const side of [-1,1])for(let j=0;j<9;j++){
    box(0,side*.178,-.92+j*.029,.35,.006,.008,palette.rope);
    box(side*.178,0,-.92+j*.029,.006,.35,.008,palette.rope);
   }
   for(const x of [-.19,.19])for(const y of [-.19,.19]){
    sphere(x,y,-.80,.061,.047,.090,palette.rope,20);
    rod([x,y,-.67],[x,y,-.60],.012,palette.shadow);
   }
   box(0,0,-.95,.38,.38,.065,palette.shadow);
   for(const side of [-1,1]){
    box(side*.16,0,-.80,.09,.12,.12,palette.rope);
   }
   // Flame and fuel-burner assembly, softly pulsed by the night shader.
   rod([0,0,-.64],[0,0,-.48],.045,palette.shadow);
   part(new T.ConeGeometry(.09,.27,24),[0,0,-.46],[Math.PI/2,0,0],[1,1,1],palette.flame,4,[0,0,-.59],4);
   part(new T.ConeGeometry(.045,.20,20),[0,0,-.49],[Math.PI/2,0,0],[1,1,1],0xfff1a0,4,[0,0,-.59],4);
  }
  lamp(0,.16,-.72,palette.white,3);
 }
 // Each mesh is ONE instanced GPU draw call, with individual body, canopy,
 // windows, lights, skids, engines, rotor/fan details and rich vertex color.
 let total=0,triangles=0;
 for(const p of pieces){total+=p.g.getAttribute('position')?.count||0;triangles+=(p.g.index?.count||p.g.getAttribute('position')?.count||0)}
 const pos=new Float32Array(total*3),norm=new Float32Array(total*3),col=new Float32Array(total*3),
  rotor=new Float32Array(total),pivot=new Float32Array(total*3),beacon=new Float32Array(total),glass=new Float32Array(total),trim=new Float32Array(total),
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
   beacon[j]=p.lamp;glass[j]=p.color.equals(new T.Color(palette.glass))?1:0;trim[j]=p.color.equals(new T.Color(palette.blue))?1:0;
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
 geom.setAttribute('aBpGlass',new T.BufferAttribute(glass,1));geom.setAttribute('aBpTrim',new T.BufferAttribute(trim,1));
 geom.setIndex(new T.BufferAttribute(idx.slice(0,indexAt),1));geom.computeBoundingSphere();
 geom.userData.bpAirframeVersion=11;geom.userData.bpParkedGeometry=grounded;geom.userData.bpAircraftClass=kind;geom.userData.bpVariant=variant;
 geom.userData.bpParts=pieces.length;
 return geom;
}
export function buildAircraftMaterial(T,geometry=null){
 const source=geometry?.userData?.bpSketchfabMaterials;if(Array.isArray(source)&&source.length)return source.map(m=>m.clone());
 const mat=new T.MeshStandardMaterial({color:0xffffff,metalness:.28,roughness:.38,
  emissive:0x000406,emissiveIntensity:.14,vertexColors:true,side:T.DoubleSide});
 mat.onBeforeCompile=shader=>{
  shader.uniforms.bpFlightTime={value:0};shader.uniforms.bpViewDir={value:new T.Vector3(0,-1,1).normalize()};shader.uniforms.bpMapView={value:0};
  mat.userData.bpFlightShader=shader;
  shader.vertexShader=shader.vertexShader.replace('#include <common>',
   '#include <common>\nattribute float aBpRotor;\nattribute vec3 aBpPivot;\nattribute float aBpBeacon;\nattribute float aBpNight;\nattribute float aBpParked;\nattribute float aBpGlass;\nattribute float aBpTrim;\nattribute vec3 aBpLivery;\nvarying float vBpGlass;\nvarying float vBpTrim;\nvarying vec3 vBpLivery;\nuniform float bpFlightTime;\nvarying float vBpBeacon;\nvarying float vBpDark;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\nvBpBeacon=aBpBeacon;vBpDark=aBpNight;vBpGlass=aBpGlass;vBpTrim=aBpTrim;vBpLivery=aBpLivery;\n'+
   'if(aBpRotor>0.5&&aBpParked<.5){float a=bpFlightTime*(aBpRotor<1.5?18.0:aBpRotor<2.5?26.0:33.0);'+
   'float sn=sin(a),cs=cos(a);vec3 p=transformed-aBpPivot;'+
   'if(aBpRotor<1.5)transformed=aBpPivot+vec3(p.x*cs-p.y*sn,p.x*sn+p.y*cs,p.z);'+
   'else if(aBpRotor<3.5)transformed=aBpPivot+vec3(p.x,p.y*cs-p.z*sn,p.y*sn+p.z*cs);else if(aBpRotor<4.5)transformed=aBpPivot+vec3(p.xy*(.86+.14*sin(bpFlightTime*17.)),p.z*(.82+.18*sin(bpFlightTime*11.)));else transformed=aBpPivot+vec3(p.x*cs-p.z*sn,p.y,p.x*sn+p.z*cs);}');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
   '#include <common>\nvarying float vBpBeacon;\nvarying float vBpDark;\nvarying float vBpGlass;\nvarying float vBpTrim;\nvarying vec3 vBpLivery;\nuniform vec3 bpViewDir;\nuniform float bpMapView;\nuniform float bpFlightTime;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vBpLivery,vBpTrim*.90);');
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.11,vBpGlass);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
   '#include <emissivemap_fragment>\n'+
   'vec3 bpV=normalize(mix(normalize(vViewPosition),bpViewDir,bpMapView));float bpF=pow(1.-abs(dot(normalize(normal),bpV)),2.);float bpSpec=pow(max(0.,dot(reflect(-normalize(vec3(-.45,-.2,1.)),normalize(normal)),bpV)),20.);totalEmissiveRadiance+=vBpGlass*(vec3(.25,.62,.88)*(.18+bpF*.8)+vec3(1.,.98,.88)*bpSpec*1.6);'+
   'if(vBpBeacon>0.5){float mode=vBpBeacon;float phase=fract(bpFlightTime*.92);float strobe=1.-smoothstep(.065,.105,phase);strobe=max(strobe,(smoothstep(.15,.17,phase)*(1.-smoothstep(.22,.26,phase))));float redPulse=1.-smoothstep(.10,.17,fract(bpFlightTime*.79));vec3 lamp=mode<1.5?vec3(1.,.025,.01):mode<2.5?vec3(.05,1.,.20):mode<3.5?vec3(1.,1.,.92):mode<4.5?vec3(1.,.55,.12):mode<5.5?vec3(1.,.025,.012):vec3(1.,.98,.90);float power=mode<3.5?(.85+2.4*vBpDark):mode<4.5?2.3:mode<5.5?redPulse*7.:mode<6.5?strobe*9.:vBpDark*7.;totalEmissiveRadiance+=lamp*power;}');
 };
 mat.customProgramCacheKey=()=> 'bp-airframe-colored-rotors-lights-v10';
 mat.userData.bpFlightShader=null;
 return mat;
}
export function attachInstancedNight(T,geom,capacity){
 geom.setAttribute('aBpNight',new T.InstancedBufferAttribute(new Float32Array(Math.max(1,capacity)),1));geom.setAttribute('aBpParked',new T.InstancedBufferAttribute(new Float32Array(Math.max(1,capacity)),1));const c=new T.Color(0x386ea9),livery=new Float32Array(Math.max(1,capacity)*3);for(let i=0;i<livery.length;i+=3){livery[i]=c.r;livery[i+1]=c.g;livery[i+2]=c.b;}geom.setAttribute('aBpLivery',new T.InstancedBufferAttribute(livery,3));
}
export function updateAircraftView(material,view){const u=material?.userData?.bpFlightShader?.uniforms;if(u?.bpViewDir){u.bpViewDir.value.copy(view);u.bpMapView.value=1;}}
export function updateAircraftShader(material,seconds){
 for(const m of Array.isArray(material)?material:[material]){const shader=m?.userData?.bpFlightShader;if(shader?.uniforms?.bpFlightTime)shader.uniforms.bpFlightTime.value=seconds;}
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
  mat=buildAircraftMaterial(T,geom);
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
