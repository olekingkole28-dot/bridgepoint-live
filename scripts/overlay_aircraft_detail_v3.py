from pathlib import Path
import sys,re,hashlib
site=Path(sys.argv[1]);key='aircraft-detail-flight-v20261124-v3'
tracker='bridgepoint-drone-awareness-v1.js';visual='bridgepoint-aircraft-visuals-v2.js'
allowed={'index.html','app/index.html',tracker,'app/'+tracker,visual,'app/'+visual}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def read(n):return (site/n).read_text(encoding='utf-8')
def write(n,s):(site/n).write_text(s,encoding='utf-8')
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('AIRCRAFT_ANCHOR '+str(s.count(a))+' '+a[:140])
 return s.replace(a,b,1)
s=read(visual)
s=one(s,'export const AIRCRAFT_VISUAL_VERSION=2;','export const AIRCRAFT_VISUAL_VERSION=3;')
# High resolution sculpted body surfaces and more distinct aircraft profiles.
s=one(s,"col,seg=12)=>part(new T.SphereGeometry(1,seg,Math.max(8,Math.round(seg*.65))),","col,seg=12)=>part(new T.SphereGeometry(1,Math.max(32,seg*2),Math.max(20,Math.round(seg*1.25))),")
s=one(s,"const long=wide?1.40:small?.93:1.12;","const long=variant==='jumbo'?1.56:wide?1.40:small?.93:1.12;")
s=one(s,"sphere(-.035,0,0,long,fat,fat*.96,palette.white,18);","""sphere(-.035,0,0,long,fat,fat*.96,palette.white,32);
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
  if(variant==='jumbo')sphere(long*.34,0,fat*.58,long*.50,fat*.77,fat*.63,palette.white,30);""")
s=one(s,"wide?17:small?7:12","wide?34:small?13:23")
s=one(s,"sphere(x,sign*(fat*.92),.082,.032,.012,.024,palette.glass,8);","""const y=sign*fat*Math.sqrt(Math.max(.05,1-Math.pow((x+.035)/long,2)-Math.pow(.082/(fat*.96),2)));
   sphere(x,y,.082,.027,.009,.022,palette.shadow,12);
   sphere(x,y+sign*.006,.082,.022,.008,.017,palette.glass,12);""")
# Swept vertical stabilizer, articulated wing surfaces, navigation housings.
s=one(s,"box(-long*.77,0,.24,.18,.055,.45,palette.blue);","""const fin=new T.Shape();fin.moveTo(-long*.99,.04);fin.lineTo(-long*.57,.04);fin.lineTo(-long*.83,.53);fin.lineTo(-long*.99,.48);fin.closePath();
  part(new T.ExtrudeGeometry(fin,{depth:.042,bevelEnabled:true,bevelSegments:2,bevelSize:.008,bevelThickness:.006}),[0,.021,0],[Math.PI/2,0,0],[1,1,1],palette.blue);
  for(const sign of [-1,1]){
   for(let j=0;j<5;j++)box(-.14-j*.051,sign*ws*(.25+j*.125),-.028,.10,.075,.015,palette.shadow);
   box(-.34,sign*ws*.98,.018,.075,.027,.15,palette.blue);
   sphere(-.26,sign*ws*.98,-.034,.07,.03,.026,palette.silver,12);
  }""")
# True annular nacelles and many animated fan blades, not solid cylinders.
a=s.index("    part(new T.CylinderGeometry(.105,.125,.43,14)");b=s.index("\n   }\n  }else if(kind==='propeller'",a)
s=s[:a]+"""    const outer=new T.Shape(),hole=new T.Path();outer.absarc(0,0,.128,0,Math.PI*2,false);hole.absarc(0,0,.087,0,Math.PI*2,true);outer.holes.push(hole);
    part(new T.ExtrudeGeometry(outer,{depth:.43,curveSegments:32,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2}),[x-.22,y,z],[0,Math.PI/2,0],[1,1,1],palette.silver);
    part(new T.TorusGeometry(.107,.014,12,48),[x+.23,y,z],[0,Math.PI/2,0],[1,1,1],palette.skin);
    part(new T.CylinderGeometry(.083,.083,.014,32),[x+.035,y,z],[0,0,Math.PI/2],[1,1,1],palette.black);
    sphere(x+.13,y,z,.065,.029,.029,palette.shadow,24);
    box(x,y,z+.12,.23,.061,.13,palette.skin);
    const pivot=[x+.17,y,z];
    for(let i=0;i<16;i++){
     const phi=i*Math.PI*2/16;
     rod([pivot[0],y+Math.cos(phi)*.025,z+Math.sin(phi)*.025],[pivot[0]-.018,y+Math.cos(phi+.19)*.084,z+Math.sin(phi+.19)*.084],.010,palette.silver,3,pivot);
    }
    part(new T.TorusGeometry(.080,.012,10,32),[x-.25,y,z],[0,Math.PI/2,0],[1,1,1],palette.shadow);
"""+s[b:]
s=one(s,"box(pivot[0]+.10,0,0,.032,.56,.033,palette.black,3,pivot);","""box(pivot[0]+.10,0,0,.032,.56,.033,palette.black,3,pivot);
   sphere(pivot[0]+.105,0,0,.065,.043,.043,palette.silver,24);
   if(variant==='turboprop')for(const y of [-.49,.49]){
     const p=[.21,y,-.075];sphere(p[0]-.11,y,p[2],.23,.085,.085,palette.skin,24);
     for(let i=0;i<6;i++){const a=i*Math.PI/3;rod(p,[p[0],y+Math.cos(a)*.23,p[2]+Math.sin(a)*.23],.016,palette.black,3,p);}
     sphere(p[0]+.025,y,p[2],.06,.044,.044,palette.silver,20);
   }""")
s=one(s,"sphere(.25,0,0,.60,.32,.38,palette.white,18);","""sphere(.25,0,0,.60,.32,.38,palette.white,32);
  for(const side of [-1,1]){
   box(.05,side*.300,.015,.46,.013,.30,palette.shadow);
   box(.05,side*.310,.015,.43,.014,.27,palette.skin);
   box(.05,side*.325,.095,.35,.014,.115,palette.glass);
   box(.22,side*.332,-.047,.065,.013,.018,palette.shadow);
   box(-.20,side*.255,-.09,.20,.09,.09,palette.silver);
   for(let k=0;k<4;k++)box(-.16+k*.06,side*.288,-.14,.035,.015,.025,palette.shadow);
  }
  sphere(-.17,0,.28,.28,.21,.14,palette.shadow,30);
  for(const side of [-1,1])part(new T.CylinderGeometry(.055,.065,.16,20),[-.29,side*.16,.31],[0,0,Math.PI/2],[1,1,1],palette.silver);""")
# Real tail rotor plane: spin about lateral axis; main rotor stays horizontal.
s=s.replace("palette.silver,2,[-1.14,0,.2]","palette.silver,5,[-1.14,0,.2]")
s=one(s,"box(0,0,.69,1.82,.070,.018,palette.black,1,[0,0,.69]);","""box(0,0,.69,1.82,.070,.018,palette.black,1,[0,0,.69]);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;rod([0,0,.69],[Math.cos(a)*.90,Math.sin(a)*.90,.69],.025,palette.shadow,1,[0,0,.69]);}
  sphere(0,0,.70,.12,.12,.065,palette.silver,24);""")
# Balloon envelope axis corrected (SphereGeometry's pole is Y). Vertical
# gores, woven basket, ropes and multiple flame layers.
s=one(s,"new T.SphereGeometry(.65,5,16,i*Math.PI/4,Math.PI/4,0,Math.PI),\n      [0,0,.37],[0,0,0],[1,1,1.26],hues[i]","new T.SphereGeometry(.65,12,32,i*Math.PI/4,Math.PI/4,0,Math.PI),\n      [0,0,.37],[Math.PI/2,0,0],[1,1.26,1],hues[i]")
s=one(s,"box(0,0,-.80,.35,.35,.28,palette.gold);","""box(0,0,-.80,.35,.35,.28,palette.gold);
   for(const side of [-1,1])for(let j=0;j<9;j++){
    box(0,side*.178,-.92+j*.029,.35,.006,.008,palette.rope);
    box(side*.178,0,-.92+j*.029,.006,.35,.008,palette.rope);
   }
   for(const x of [-.19,.19])for(const y of [-.19,.19]){
    sphere(x,y,-.80,.061,.047,.090,palette.rope,20);
    rod([x,y,-.67],[x,y,-.60],.012,palette.shadow);
   }""")
s=one(s,"part(new T.ConeGeometry(.09,.27,10),[0,0,-.46],[Math.PI/2,0,0],[1,1,1],palette.flame,0,[0,0,0],4);","""part(new T.ConeGeometry(.09,.27,24),[0,0,-.46],[Math.PI/2,0,0],[1,1,1],palette.flame,4,[0,0,-.59],4);
   part(new T.ConeGeometry(.045,.20,20),[0,0,-.49],[Math.PI/2,0,0],[1,1,1],0xfff1a0,4,[0,0,-.59],4);""")
# Subtle surface glass reflection and animated burner flame. Instance phase
# is local, so no changes are made to the source position or altitude.
s=one(s,"geom.userData.bpAirframeVersion=2;","geom.userData.bpAirframeVersion=3;")
s=one(s,"beacon=new Float32Array(total),","beacon=new Float32Array(total),glass=new Float32Array(total),")
s=one(s,"beacon[j]=p.lamp;","beacon[j]=p.lamp;glass[j]=p.color.equals(new T.Color(palette.glass))?1:0;")
s=one(s,"geom.setAttribute('aBpBeacon',new T.BufferAttribute(beacon,1));","geom.setAttribute('aBpBeacon',new T.BufferAttribute(beacon,1));\n geom.setAttribute('aBpGlass',new T.BufferAttribute(glass,1));")
s=one(s,"attribute float aBpNight;\\nuniform float bpFlightTime;","attribute float aBpNight;\\nattribute float aBpGlass;\\nvarying float vBpGlass;\\nuniform float bpFlightTime;")
s=one(s,"vBpBeacon=aBpBeacon;vBpDark=aBpNight;","vBpBeacon=aBpBeacon;vBpDark=aBpNight;vBpGlass=aBpGlass;")
s=one(s,"else transformed=aBpPivot+vec3(p.x,p.y*cs-p.z*sn,p.y*sn+p.z*cs);}","else if(aBpRotor<3.5)transformed=aBpPivot+vec3(p.x,p.y*cs-p.z*sn,p.y*sn+p.z*cs);else if(aBpRotor<4.5)transformed=aBpPivot+vec3(p.xy*(.86+.14*sin(bpFlightTime*17.)),p.z*(.82+.18*sin(bpFlightTime*11.)));else transformed=aBpPivot+vec3(p.x*cs-p.z*sn,p.y,p.x*sn+p.z*cs);}")
s=one(s,"varying float vBpDark;\\nuniform float bpFlightTime;');","varying float vBpDark;\\nvarying float vBpGlass;\\nuniform float bpFlightTime;');")
s=one(s," shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',"," shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\\nroughnessFactor=mix(roughnessFactor,.11,vBpGlass);');\n  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',")
s=one(s,"bp-airframe-colored-rotors-lights-v2","bp-airframe-colored-rotors-lights-v3")
for rel in (visual,'app/'+visual):write(rel,s)
s=read(tracker)
s=one(s,'bridgepoint-aircraft-visuals-v2.js?v=2-colored-type-rotors-night','bridgepoint-aircraft-visuals-v2.js?v='+key)
# Stable local model positions and projection. Keep the native map icon
# positions and ADS-B histories unchanged.
s=one(s,"let droneAnimationFrame=0,lastDroneAnimationAt=0;","""let droneAnimationFrame=0,lastDroneAnimationAt=0;
let flightOrigin={x:0,y:0},flightEffects=null,flightModelAnimation=[],flightVisualStamp='',flightMoveTimer=0;
function flightLocal(p){return {x:p.x-flightOrigin.x,y:p.y-flightOrigin.y,z:p.z}}
function flightOriginForView(){const MC=window.maplibregl?.MercatorCoordinate;if(!MC||!map)return;const c=MC.fromLngLat(map.getCenter(),0);flightOrigin={x:Math.round(c.x*8192)/8192,y:Math.round(c.y*8192)/8192}}
function flightWorldXYZ(x,y,z){return [x-flightOrigin.x,y-flightOrigin.y,z]}
function disposeFlightEffects(){if(!flightEffects)return;droneScene?.remove(flightEffects);flightEffects.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.()});flightEffects=null}
""")
# All aircraft-owned world-space geometry shares one rebased origin.
s=one(s,"layer.camera.projectionMatrix.fromArray(matrix);","""layer.camera.projectionMatrix.fromArray(matrix);
   layer.camera.projectionMatrix.multiply(new THREE.Matrix4().makeTranslation(flightOrigin.x,flightOrigin.y,0));
   layer.camera.projectionMatrixInverse.copy(layer.camera.projectionMatrix).invert();""")
s=one(s,"droneRenderer=renderer;droneScene=scene;droneLayer=layer;droneTemplate=makeDroneModel(THREE);","droneRenderer=renderer;droneScene=scene;droneLayer=layer;flightOriginForView();droneTemplate=makeDroneModel(THREE);")
s=one(s,"disposeAircraftTemplates();try{aircraftPopup","disposeFlightEffects();flightModelAnimation=[];disposeAircraftTemplates();try{aircraftPopup")
# Preserve the existing drone model contract, refine the body and add
# futuristic protective ducts and camera gimbal. No source-derived size claim.
s=one(s,"new THREE.BoxGeometry(.46,.31,.14),dark","new THREE.SphereGeometry(1,36,24),dark")
s=one(s,"body.position.z=.015;body.frustumCulled=false;","body.scale.set(.27,.19,.085);body.position.z=.015;body.frustumCulled=false;")
s=one(s,"const hub=new THREE.Mesh(new THREE.SphereGeometry(.058,10,8),edge);","""const duct=new THREE.Mesh(new THREE.TorusGeometry(.31,.025,12,48),edge);duct.position.set(x,y,.15);group.add(duct);
  const lower=new THREE.Mesh(new THREE.TorusGeometry(.31,.016,10,48),dark);lower.position.set(x,y,.09);group.add(lower);
  const hub=new THREE.Mesh(new THREE.SphereGeometry(.058,24,16),edge);""")
s=one(s,"group.traverse(o=>{o.frustumCulled=false});return group;","""for(const side of [-1,1]){
  const skid=new THREE.Mesh(new THREE.CapsuleGeometry(.018,.32,6,12),dark);skid.rotation.z=Math.PI/2;skid.position.set(0,side*.15,-.12);group.add(skid);
  const panel=new THREE.Mesh(new THREE.BoxGeometry(.18,.018,.052),edge);panel.position.set(.02,side*.18,.037);group.add(panel);
 }
 const gimbal=new THREE.Mesh(new THREE.SphereGeometry(.085,28,18),dark);gimbal.position.set(.19,0,-.10);group.add(gimbal);
 const glass=new THREE.Mesh(new THREE.SphereGeometry(.057,24,16),new THREE.MeshStandardMaterial({color:0x183c58,metalness:.7,roughness:.10}));glass.position.set(.249,0,-.10);group.add(glass);
 group.traverse(o=>{o.frustumCulled=false});return group;""")
# Replace dot markers in-place, preserving existing filters and click handlers.
s=one(s,"function installLayer(){","""function installAircraftIcons(){
 for(const kind of ['jet','airplane','propeller','helicopter','drone','glider','balloon']){
  const id='bp-aircraft-detail-icon-'+kind;if(map.hasImage?.(id))continue;
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');if(!x)continue;
  const colors={jet:'#eaf6ff',airplane:'#63dcff',propeller:'#8be6b5',helicopter:'#ffb477',drone:'#4defff',glider:'#c8a9ff',balloon:'#ffd071'};
  x.lineCap='round';x.lineJoin='round';x.fillStyle='#081e31';x.strokeStyle=colors[kind];x.lineWidth=3;x.beginPath();x.arc(32,32,28,0,Math.PI*2);x.fill();x.stroke();x.translate(32,32);x.fillStyle=colors[kind];x.strokeStyle=colors[kind];
  if(kind==='balloon'){x.beginPath();x.ellipse(0,-6,12,15,0,0,Math.PI*2);x.fill();x.fillRect(-5,12,10,7);x.beginPath();x.moveTo(-8,5);x.lineTo(-4,13);x.moveTo(8,5);x.lineTo(4,13);x.stroke()}
  else if(kind==='drone'){x.fillRect(-5,-5,10,10);for(const a of [-1,1])for(const b of [-1,1]){x.beginPath();x.moveTo(0,0);x.lineTo(a*13,b*13);x.stroke();x.beginPath();x.arc(a*13,b*13,6,0,Math.PI*2);x.stroke()}}
  else if(kind==='helicopter'){x.beginPath();x.ellipse(0,-4,6,13,0,0,Math.PI*2);x.fill();x.fillRect(-2,6,4,14);x.fillRect(-8,17,16,3);x.fillRect(-18,-5,36,3);x.fillRect(-2,-22,4,36)}
  else {x.beginPath();x.moveTo(0,-22);x.lineTo(4,-8);x.lineTo(19,5);x.lineTo(19,9);x.lineTo(4,4);x.lineTo(3,14);x.lineTo(10,19);x.lineTo(10,21);x.lineTo(0,18);x.lineTo(-10,21);x.lineTo(-10,19);x.lineTo(-3,14);x.lineTo(-4,4);x.lineTo(-19,9);x.lineTo(-19,5);x.lineTo(-4,-8);x.closePath();x.fill();if(kind==='propeller')x.fillRect(-10,-20,20,3)}
  map.addImage(id,x.getImageData(0,0,64,64),{pixelRatio:2});
 }
}
function installLayer(){""")
s=one(s,"  bindAircraftInteractions();\n  return true;","  bindAircraftInteractions();\n  return true;")
s=one(s,"  if(!map.getLayer(AIRCRAFT_LAYER))map.addLayer(","  installAircraftIcons();\n  if(!map.getLayer(AIRCRAFT_LAYER))map.addLayer(")
for id in ['AIRCRAFT_LAYER','LAYER']:
 pat=r"  if\(!map.getLayer\("+id+r"\)\)map.addLayer\(\{[^\n]+\}\);"
 m=re.search(pat,s)
 if not m:raise SystemExit('missing icon layer '+id)
 source='AIRCRAFT_SOURCE' if id=='AIRCRAFT_LAYER' else 'SOURCE'
 filterpart=",filter:['!',['has','point_count']]" if id=='LAYER' else ''
 icon="['concat','bp-aircraft-detail-icon-',['coalesce',['get','aircraft_kind'],'airplane']]" if id=='AIRCRAFT_LAYER' else "'bp-aircraft-detail-icon-drone'"
 new="  if(!map.getLayer("+id+"))map.addLayer({id:"+id+",type:'symbol',source:"+source+filterpart+",minzoom:0,layout:{visibility:'none','icon-image':"+icon+",'icon-size':['interpolate',['linear'],['zoom'],0,.66,7,.87,15,1.0,22,.82],'icon-allow-overlap':false,'icon-ignore-placement':false,'icon-padding':2,'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport'}});"
 s=s[:m.start()]+new+s[m.end():]
# Thin upward-moving pulsing ground rods, per-segment normalized distance.
a=s.index('  const geometry=new droneThree.BufferGeometry();',s.index('function replaceTetherGroup'));b=s.index("  const lines=new droneThree.LineSegments",a)
s=s[:a]+"""  const xyz=[],progress=[];
  for(let i=0;i<positions.length;i+=6){const ax=positions[i]-flightOrigin.x,ay=positions[i+1]-flightOrigin.y,az=positions[i+2],bx=positions[i+3]-flightOrigin.x,by=positions[i+4]-flightOrigin.y,bz=positions[i+5];xyz.push(ax,ay,az,bx,by,bz);progress.push(0,1)}
  const geometry=new droneThree.BufferGeometry();geometry.setAttribute('position',new droneThree.Float32BufferAttribute(xyz,3));geometry.setAttribute('aProgress',new droneThree.Float32BufferAttribute(progress,1));
  const material=new droneThree.ShaderMaterial({transparent:true,depthTest:true,depthWrite:false,uniforms:{uTime:{value:0},uColor:{value:new droneThree.Color(aircraftColor(kind))}},vertexShader:'attribute float aProgress;varying float vP;void main(){vP=aProgress;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying float vP;uniform float uTime;uniform vec3 uColor;void main(){float p=pow(max(0.,sin(6.2831853*(vP*5.-uTime*.85))),8.);gl_FragColor=vec4(mix(uColor,vec3(.85,1.,1.),p),.42+.56*p);}'});
"""+s[b:]
# Filter all new effects together with their aircraft.
s=one(s," if(aircraftTetherGroup){aircraftTetherGroup.visible=active;"," if(flightEffects){flightEffects.visible=active;for(const child of flightEffects.children)child.visible=active&&isAircraftKindVisible(child.userData.aircraftKind)}\n if(aircraftTetherGroup){aircraftTetherGroup.visible=active;")
# Keep model geometry at true physical scale and only instantiate viewport
# candidates; icons remain available everywhere. Local anchors survive zoom.
s=one(s," const branded=[];"," const branded=[],effects=[];flightModelAnimation=[];")
s=one(s,"  const kind=DroneCore.aircraftKindForRecord(aircraft);","""  const kind=DroneCore.aircraftKindForRecord(aircraft);
  if(zoom>=7){let visible=true;try{const p=map.project([lon,lat]),cv=map.getCanvas(),pad=600;visible=p.x>=-pad&&p.x<=cv.clientWidth+pad&&p.y>=-pad&&p.y<=cv.clientHeight+pad}catch(_){}if(!visible)continue;}""")
s=one(s,"   new droneThree.Vector3(position.x,position.y,position.z),","   new droneThree.Vector3(position.x-flightOrigin.x,position.y-flightOrigin.y,position.z),")
s=one(s,"  bucket.items.push({matrix,night});grouped.set(modelKey,bucket);","  bucket.items.push({matrix,night,kind,scale,meterUnit,phase:((key.charCodeAt(0)||0)+(key.charCodeAt(1)||0))*.37});grouped.set(modelKey,bucket);\n  if(kind==='jet'&&altitude.meters>=7000&&zoom>=7&&effects.length<40)effects.push({matrix,kind,design,aircraft});")
s=one(s,"   entry.mesh.setMatrixAt(i,item.matrix);","   entry.mesh.setMatrixAt(i,item.matrix);\n   flightModelAnimation.push({entry,index:i,...item});")
# Source name decal UV follows curved body surface (no floating billboard).
s=one(s,"if(design.operator&&zoom>=10&&branded.length<28)","if((design.operator||aircraft.flight||aircraft.r)&&zoom>=10&&branded.length<28)")
s=one(s,"   const op=item.design.operator;","   const op=item.design.operator||{name:String(item.aircraft.flight||item.aircraft.r||'').trim()};if(!op.name)continue;")
s=one(s,"ctx.clearRect(0,0,512,100);ctx.fillStyle='#eff8fc';\n   ctx.fillRect(0,10,512,78);ctx.fillStyle='#17345e';","ctx.clearRect(0,0,512,100);ctx.fillStyle='#17345e';")
a=s.index("   const lateral=(item.design.variant");b=s.index("   group.add(decalGroup);",a)
s=s[:a]+"""   const wide=['widebody','jumbo'].includes(item.design.variant),small=['regional','business'].includes(item.design.variant),long=item.design.variant==='jumbo'?1.56:wide?1.4:small?.93:1.12,fat=wide?.22:small?.135:.16;
   if(!['jet','airplane','propeller','glider'].includes(item.design.kind))continue;
   const pos=[],uv=[],idx=[],n=32;
   for(const side of [-1,1]){const off=pos.length/3;for(let j=0;j<=4;j++)for(let i=0;i<=n;i++){
    const x=-long*.52+long*1.04*i/n,z=-.048+j*.023,y=side*(fat*Math.sqrt(Math.max(.03,1-Math.pow((x+.035)/long,2)-Math.pow(z/(fat*.96),2)))+.003);
    pos.push(x,y,z);uv.push(side===1?1-i/n:i/n,j/4);
   }for(let j=0;j<4;j++)for(let i=0;i<n;i++){const a=off+j*(n+1)+i,b=a+n+1;idx.push(a,b,a+1,a+1,b,b+1)}}
   const g=new droneThree.BufferGeometry();g.setAttribute('position',new droneThree.Float32BufferAttribute(pos,3));g.setAttribute('uv',new droneThree.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
   const m=new droneThree.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.12,side:droneThree.DoubleSide,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
   const name=new droneThree.Mesh(g,m);name.frustumCulled=false;decalGroup.add(name);
   decalGroup.userData.flightBase=item.matrix.clone();decalGroup.userData.flightKey=item.aircraft._trackKey;
"""+s[b:]
# Simulated volumetric exhaust condensation tubes: paired tapered, expanding
# billows with moving transparency and soft edges, never an observed route.
s=one(s," aircraftModels=nextModels;",""" disposeFlightEffects();
 if(effects.length){
  flightEffects=new droneThree.Group();flightEffects.name='Simulated high-altitude jet condensation wakes';
  for(const item of effects){
   const g=new droneThree.BufferGeometry(),p=[],uv=[],idx=[],N=42,R=12;
   const engines=item.design.variant==='jumbo'?[-.82,-.42,.42,.82]:[-.54,.54];
   for(const y of engines){const off=p.length/3;for(let j=0;j<=N;j++){const u=j/N,r=.075+.25*u+Math.sin(u*29+y)*.022*u;
    for(let k=0;k<=R;k++){const a=k/R*Math.PI*2;p.push(-.24-u*55,y+Math.cos(a)*r,-.17+Math.sin(a)*r);uv.push(u,k/R);}
   }for(let j=0;j<N;j++)for(let k=0;k<R;k++){const a=off+j*(R+1)+k,b=a+R+1;idx.push(a,b,a+1,a+1,b,b+1)}}
   g.setAttribute('position',new droneThree.Float32BufferAttribute(p,3));g.setAttribute('uv',new droneThree.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
   const m=new droneThree.ShaderMaterial({transparent:true,depthWrite:false,side:droneThree.DoubleSide,uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',fragmentShader:'varying vec2 vUv;varying vec3 vN;varying vec3 vV;uniform float uTime;void main(){float edge=pow(abs(dot(normalize(vN),normalize(vV))),.7);float n=.68+.22*sin(vUv.x*115.-uTime*2.+sin(vUv.y*25.))+.10*sin(vUv.x*239.+vUv.y*19.-uTime*3.);float a=smoothstep(0.,.035,vUv.x)*pow(1.-vUv.x,.65)*edge*n*.42;gl_FragColor=vec4(vec3(.86,.94,1.),a);}'});
   const mesh=new droneThree.Mesh(g,m);mesh.matrixAutoUpdate=false;mesh.matrix.copy(item.matrix);mesh.frustumCulled=false;mesh.userData.aircraftKind='jet';flightEffects.add(mesh);
  }droneScene.add(flightEffects);
 }
 aircraftModels=nextModels;""")
s=one(s,"const vector=[projected.x,projected.y,projected.z];","const vector=flightWorldXYZ(projected.x,projected.y,projected.z);")
s=one(s,"model.position.set(position.x,position.y,position.z);","model.position.set(position.x-flightOrigin.x,position.y-flightOrigin.y,position.z);")
s=one(s,"model.scale.setScalar((span/1.36)*meterUnit);","model.scale.setScalar((span/1.76)*meterUnit);")
s=one(s,"const vector=new droneThree.Vector3(projected.x,projected.y,projected.z);","const vector=new droneThree.Vector3(...flightWorldXYZ(projected.x,projected.y,projected.z));")
# Smooth tiny vertical animation for airborne aircraft, with no extrapolated
# horizontal positions. Ground markers, feeds, histories remain source-backed.
s=one(s,"if(now-lastDroneAnimationAt>=65){","if(now-lastDroneAnimationAt>=40){")
s=one(s,"  for(const entry of aircraftTemplates.values()){\n   aircraftVisualModule?.updateAircraftShader?.(entry.material,now*.001);\n  }","""  for(const entry of aircraftTemplates.values())aircraftVisualModule?.updateAircraftShader?.(entry.material,now*.001);
  const temp=new droneThree.Matrix4();
  for(const item of flightModelAnimation){
   if(!item.entry.mesh.visible)continue;
   temp.copy(item.matrix);const amp=item.kind==='balloon'?.6:item.kind==='helicopter'?.35:.16;
   temp.elements[14]+=Math.sin(now*.0016+item.phase)*amp*item.meterUnit;
   item.entry.mesh.setMatrixAt(item.index,temp);item.entry.mesh.instanceMatrix.needsUpdate=true;
  }
  for(const group of [aircraftTetherGroup,droneTetherGroup,flightEffects])for(const o of group?.children||[])if(o.material?.uniforms?.uTime)o.material.uniforms.uTime.value=now*.001;""")
# Avoid rebuilding both histories twice for a single zoom gesture.
a=s.index("   map.on?.('moveend',()=>{if(enabled){setDroneModels(");b=s.index('\n',s.index("   map.on?.('zoomend',",a))
s=s[:a]+"""   map.on?.('moveend',()=>{if(!enabled)return;clearTimeout(flightMoveTimer);flightMoveTimer=setTimeout(()=>{if(!enabled)return;flightOriginForView();setDroneModels(lastCurrentRecords);rebuildDroneTrails();setAircraftModels(lastCurrentAircraftRecords);rebuildAircraftTrails();scheduleViewportRefresh()},80)});"""+s[b:]
s=one(s,"function clearTrackedAircraft(){","function clearTrackedAircraft(){\n disposeFlightEffects();flightModelAnimation=[];")
# Cache bust only aircraft scripts and no shared controls or feeds.
for rel in (tracker,'app/'+tracker):
 if (site/rel).is_file():write(rel,s)
for rel in ('index.html','app/index.html'):
 old=read(rel);new,n=re.subn(r'('+re.escape(tracker)+r'\?[^"\s]+)',lambda m:m.group(1)+'&airdetail='+key,old)
 if n<1:raise SystemExit('missing aircraft cache reference '+rel)
 write(rel,new)
if snap()!=before:raise SystemExit('UNRELATED_PRODUCTION_FILE_CHANGED')
print('AIRCRAFT_DETAIL_SCOPE_PASS',len(before),'unchanged files including water, vessels, terrain, clouds, space and accounts')
