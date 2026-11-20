/* BridgePoint ten museum spacecraft exhibits v3. Additive, on-globe, same-origin 3D.
 * Distinct physical exhibits at real museums with published vehicle dimensions.
 * BridgePoint procedural models: NOT 3D scans, surveyed models or exact room placements.
 */
const THREE_URL='/vendor/three.module.js?v=169-local';
const TOGGLE_ID='bp-spacecraft-toggle-v1', LAYER_ID='bp-museum-spacecraft-native-v3';
const STYLE_ID='bp-museum-spacecraft-style-v3', ICON_CLASS='bp-museum-spacecraft-icon-v3';
export const SPACECRAFT_MUSEUM_EXHIBITS_V3=Object.freeze([
 {id:'atlantis-ov104-ksc',name:'Space Shuttle Atlantis (OV-104)',type:'orbiter',variant:'shuttle',
  loc:'Kennedy Space Center Visitor Complex, Florida, USA',exhibit:'Space Shuttle Atlantis exhibit',
  coordinates:[-80.6817,28.5228],dims:{length:37.24,span:23.79,height:17.25},color:0xe3e8ee,accent:0xe0ab50,
  display:'Suspended indoors',description:'Flown NASA orbiter preserved at the Kennedy Space Center Visitor Complex.',
  source:'https://www.kennedyspacecenter.com/explore-attractions/space-shuttle-atlantis',specs:'https://www.nasa.gov/reference/the-space-shuttle/'},
 {id:'enterprise-ov101-intrepid',name:'Space Shuttle Enterprise (OV-101)',type:'orbiter',variant:'shuttle',
  loc:'Intrepid Museum, New York City, New York, USA',exhibit:'Space Shuttle Pavilion, Pier 86',
  coordinates:[-74.00018,40.76464],dims:{length:37.24,span:23.79,height:17.25},color:0xe2eef2,accent:0x61c1d1,
  display:'Indoors',description:'NASA prototype orbiter used for approach and landing tests; it did not fly in space.',
  source:'https://intrepidmuseum.org/exhibitions/permanent-exhibitions/space-shuttle-pavilion',specs:'https://www.nasa.gov/reference/the-space-shuttle/'},
 {id:'buran-ok-gli-speyer',name:'Buran OK-GLI Test Spaceplane',type:'orbiter',variant:'buran',
  loc:'Technik Museum Speyer, Germany',exhibit:'Space exhibition hall',
  coordinates:[8.44639,49.31250],dims:{length:36.37,span:23.92,height:16.5},color:0xe9e9e3,accent:0x82c4ee,
  display:'Indoors',description:'Soviet atmospheric test spaceplane with jet engines. This particular Buran test article never orbited Earth.',
  source:'https://www.technik-museum.de/en/discover/exhibits/space-shuttle-buran/',specs:'https://buran.space/buran/'},
 {id:'soyuz-tma19m-london',name:'Soyuz TMA-19M Descent Capsule',type:'capsule',variant:'soyuz',
  loc:'Science Museum, London, United Kingdom',exhibit:'Space gallery',
  coordinates:[-0.17649,51.49730],dims:{height:2.2,diameter:2.2},color:0xb7a98b,accent:0xe0ad63,
  display:'Indoors',description:'Flown Soyuz descent module from the mission carrying Tim Peake, Yuri Malenchenko and Tim Kopra.',
  source:'https://collection.sciencemuseumgroup.org.uk/objects/co8593265',specs:'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Principia'},
 {id:'apollo13-odyssey-hutchinson',name:'Apollo 13 Odyssey Command Module',type:'capsule',variant:'apollo',
  loc:'Cosmosphere, Hutchinson, Kansas, USA',exhibit:'Hall of Space',
  coordinates:[-97.92134,38.06530],dims:{height:3.2,diameter:3.9},color:0xb07d50,accent:0xeabd7b,
  display:'Indoors',description:'The recovered Apollo 13 command module Odyssey, returned to Earth in April 1970.',
  source:'https://cosmo.org/about/spaceworks/restoration-and-replication/',specs:'https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloloc.html'},
 {id:'apollo16-casper-huntsville',name:'Apollo 16 Casper Command Module',type:'capsule',variant:'apollo',
  loc:'U.S. Space & Rocket Center, Huntsville, Alabama, USA',exhibit:'Davidson Center for Space Exploration',
  coordinates:[-86.65549,34.71035],dims:{height:3.2,diameter:3.9},color:0x947863,accent:0xe9bd71,
  display:'Indoors',description:'Apollo 16 flown command module Casper, preserved in Huntsville.',
  source:'https://rocketcenter.com/aboutus/',specs:'https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloloc.html'},
 {id:'apollo15-endeavour-dayton',name:'Apollo 15 Endeavour Command Module',type:'capsule',variant:'apollo',
  loc:'National Museum of the U.S. Air Force, Dayton, Ohio, USA',exhibit:'Space Gallery',
  coordinates:[-84.10957,39.78079],dims:{height:3.2,diameter:3.9},color:0x957d66,accent:0xd4af60,
  display:'Indoors',description:'Apollo 15 flown command module Endeavour on display in the museum Space Gallery.',
  source:'https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/197685/apollo-15-command-module/',specs:'https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloloc.html'},
 {id:'ariane5-replica-toulouse',name:'Ariane 5 Full-Scale Display',type:'rocket',variant:'ariane5',
  loc:"Cité de l'espace, Toulouse, France",exhibit:'Outdoor full-scale replica',
  coordinates:[1.49370,43.58571],dims:{length:53,diameter:5.4},color:0xf4f4ed,accent:0x3e8bd9,
  display:'Upright replica',description:'Full-size museum replica of Ariane 5. It is not a flown launch vehicle.',
  source:'https://metropole.toulouse.fr/annuaire/cite-de-lespace',specs:'https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/Ariane_5_Generic'},
 {id:'vostok-k-vdnkh-moscow',name:'Vostok-K Rocket Monument',type:'rocket',variant:'vostok',
  loc:'VDNKh Cosmos Pavilion, Moscow, Russia',exhibit:'Vostok 8K72K outdoor display',
  coordinates:[37.622986,55.834323],dims:{length:38.4,diameter:2.68},color:0xe4ebde,accent:0xc95846,
  display:'Upright outdoor exhibition rocket',description:'Vostok-class carrier-rocket display adjacent to the historic Cosmos Pavilion.',
  source:'https://commons.wikimedia.org/wiki/File:Vostok_8K72K_in_VDNKh_(1).jpg',specs:'https://mos-radius.ru/en/kak-mehanizacija-na-vdnh-stala-kosmosom-istorija-pavilona-34/'},
 {id:'hii-rocket-tsukuba',name:'H-II Rocket at Rocket Square',type:'rocket',variant:'hii',
  loc:'JAXA Tsukuba Space Center, Ibaraki, Japan',exhibit:'Rocket Square',
  coordinates:[140.12939,36.06813],dims:{length:50,diameter:4},color:0xf1f5f3,accent:0x3d87ca,
  display:'Horizontally displayed',description:'Full-size H-II rocket exhibit outdoors at the entrance to JAXA Tsukuba.',
  source:'https://www.japan.travel/en/spot/1453/',specs:'https://global.jaxa.jp/projects/rockets/h2/index.html'}
]);
const states=new WeakMap();
let threePromise=null;
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function getThree(){
 if(!threePromise)threePromise=import(THREE_URL).then(T=>{
  if(!T.WebGLRenderer||!T.Group)throw Error('BridgePoint local Three.js unavailable');
  return T;
 }).catch(e=>{threePromise=null;throw e;});
 return threePromise;
}
function mat(T,c,metalness=.16){return new T.MeshStandardMaterial({color:c,metalness,roughness:.65,side:T.DoubleSide});}
function box(T,g,w,h,d,x,y,z,m){
 const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o;
}
function cylinder(T,g,top,bottom,h,x,y,z,m,seg=36){
 const o=new T.Mesh(new T.CylinderGeometry(top,bottom,h,seg),m);o.position.set(x,y,z);g.add(o);return o;
}
function cone(T,g,r,h,x,y,z,m,seg=36){
 const o=new T.Mesh(new T.ConeGeometry(r,h,seg),m);o.position.set(x,y,z);g.add(o);return o;
}
function brace(T,g,a,b,r,m){
 const v=new T.Vector3(...b).sub(new T.Vector3(...a));
 const o=new T.Mesh(new T.CylinderGeometry(r,r,v.length(),7),m);
 o.position.copy(new T.Vector3(...a)).addScaledVector(v,.5);
 o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());g.add(o);return o;
}
function plinth(T,g,w,d){
 const base=mat(T,0x59616c,.3),trim=mat(T,0xc8a46b,.4);
 box(T,g,w,.30,d,0,.15,0,base);
 box(T,g,w,.12,.18,0,.40,-d/2,trim);
 box(T,g,w,.12,.18,0,.40,d/2,trim);
}
function makeApollo(T,site){
 const g=new T.Group(),H=site.dims.height,D=site.dims.diameter;
 const hull=mat(T,site.color,.33),rim=mat(T,0x302b2c,.15),detail=mat(T,0xe5cdab,.28),glass=mat(T,0x193242,.32);
 plinth(T,g,7,7);box(T,g,4,.7,4,0,.70,0,rim);
 cylinder(T,g,D*.22,D/2,H*.83,0,1.17+H*.415,0,hull,56);
 cylinder(T,g,D/2,D/2,.15,0,1.16,0,rim,56);
 cylinder(T,g,D*.22,D*.23,H*.17,0,1.17+H*.915,0,detail,42);
 cylinder(T,g,.48,.50,.17,0,1.17+H,0,rim,32);
 for(const a of [-.55,.55]){
  const pane=box(T,g,.58,.36,.07,Math.sin(a)*D*.28,1.17+H*.64,-Math.cos(a)*D*.28,glass);
  pane.rotation.y=a;
 }
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6;
  box(T,g,.13,.23,.13,Math.cos(a)*D*.47,1.2,Math.sin(a)*D*.47,detail);
 }
 return g;
}
function makeSoyuz(T,site){
 const g=new T.Group(),D=site.dims.diameter,H=site.dims.height;
 const hull=mat(T,site.color,.21),heat=mat(T,0x2e3034,.29),shell=mat(T,0xad947a,.2);
 plinth(T,g,5,5);box(T,g,2.7,.65,2.7,0,.65,0,heat);
 cylinder(T,g,D*.40,D*.50,H*.58,0,1.03+H*.29,0,hull);
 const dome=new T.Mesh(new T.SphereGeometry(D*.47,30,15,0,Math.PI*2,0,Math.PI*.53),shell);
 dome.scale.y=.52;dome.position.y=1.02+H*.59;g.add(dome);
 cylinder(T,g,D*.52,D*.52,.16,0,1.04,0,heat);
 cylinder(T,g,.40,.40,.12,0,1.03+H*.78,0,heat);
 box(T,g,.59,.32,.07,.24,1.03+H*.4,-D*.48,heat).rotation.y=-.16;
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4;
  brace(T,g,[Math.cos(a)*D*.43,.85,Math.sin(a)*D*.43],
             [Math.cos(a)*D*.43,1.6,Math.sin(a)*D*.43],.045,heat);
 }
 return g;
}
function makeOrbiter(T,site){
 const g=new T.Group(),L=site.dims.length,W=site.dims.span,H=site.dims.height;
 const white=mat(T,site.color,.25),dark=mat(T,0x24282d,.15),glass=mat(T,0x203b50,.32),
       silver=mat(T,0xb0b9bb,.29),gold=mat(T,site.accent,.23);
 plinth(T,g,Math.max(W+5,32),Math.max(L+5,43));
 box(T,g,5.5,.72,L*.42,0,.73,0,dark);
 const body=cylinder(T,g,2.3,2.5,L*.72,0,4.15,L*.10,white,48);
 body.rotation.x=Math.PI/2;
 cone(T,g,2.3,L*.20,0,4.15,-L*.39,white,48).rotation.x=-Math.PI/2;
 cone(T,g,2.45,L*.10,0,4.15,L*.44,white,48).rotation.x=Math.PI/2;
 const pts=[[-2.5,-L*.29],[-W*.5,L*.135],[-W*.5,L*.24],[-3.5,L*.14],
            [3.5,L*.14],[W*.5,L*.24],[W*.5,L*.135],[2.5,-L*.29]];
 const shape=new T.Shape();pts.forEach(([x,z],i)=>i===0?shape.moveTo(x,-z):shape.lineTo(x,-z));shape.closePath();
 const wing=new T.Mesh(new T.ShapeGeometry(shape),white);
 wing.rotation.x=-Math.PI/2;wing.position.y=3.78;g.add(wing);
 const under=wing.clone();under.position.y=3.54;under.material=dark;g.add(under);
 const geom=new T.BufferGeometry();
 geom.setAttribute('position',new T.Float32BufferAttribute([0,3.55,L*.2,0,3.55,L*.44,0,H,L*.4],3));
 geom.computeVertexNormals();g.add(new T.Mesh(geom,white));
 for(let side of [-1,1]){
  box(T,g,W*.13,.14,L*.085,side*W*.25,3.8,L*.18,gold);
  box(T,g,.62,.20,L*.37,side*1.8,6.5,0,silver);
  box(T,g,.95,.4,.09,side*1.08,6.06,-L*.28,glass).rotation.y=side*.29;
 }
 for(let i=-1;i<=1;i++)cylinder(T,g,.73,.91,1.6,i*1.35,4.2,L*.45,dark,24).rotation.x=Math.PI/2;
 for(let x of [-2.3,2.3])box(T,g,.48,3.8,.48,x,1.9,L*.015,silver);
 if(site.variant==='buran'){
  for(let side of [-1,1])
   cylinder(T,g,.65,.79,3.4,side*2.6,6.0,L*.37,dark,24).rotation.x=Math.PI/2;
 }
 return g;
}
function buildRocket(T,site){
 const H=site.dims.length,D=site.dims.diameter;
 const r=new T.Group(),white=mat(T,site.color,.2),metal=mat(T,0x9ba5a9,.55),
       dark=mat(T,0x22313c,.32),accent=mat(T,site.accent,.22);
 const core=H*.68,upper=H*.19,tip=H-core-upper;
 cylinder(T,r,D*.5,D*.5,core,0,core/2,0,white,44);
 cylinder(T,r,D*.38,D*.38,upper,0,core+upper/2,0,accent,36);
 cone(T,r,D*.38,tip,0,H-tip/2,0,white,36);
 for(const k of [.13,.32,.57,.71,.86])
  cylinder(T,r,D*.51,D*.51,Math.max(.10,H*.005),0,H*k,0,accent,36);
 for(let i=0;i<(site.variant==='vostok'?4:2);i++){
  const n=site.variant==='vostok'?4:2,phi=i*2*Math.PI/n+Math.PI/4;
  const x=Math.cos(phi)*D*.82,z=Math.sin(phi)*D*.82,bh=H*(n===4?.60:.55),br=D*(n===4?.20:.27);
  cylinder(T,r,br*.67,br,bh*.85,x,bh*.425,z,white,22);
  cone(T,r,br*.67,bh*.15,x,bh*.925,z,white,22);
  cylinder(T,r,br*.57,br*.65,H*.025,x,-.1,z,dark,16);
 }
 cylinder(T,r,D*.25,D*.35,.9,0,-.2,0,metal,26);
 const out=new T.Group();
 if(site.variant==='hii'){
  // The real Tsukuba exhibit is horizontal. Keep rocket length 50 metres in +X.
  r.rotation.z=-Math.PI/2;r.position.set(-H/2,5.5,0);
  plinth(T,out,H+8,10);out.add(r);
  for(const x of [-H*.29,H*.28]){
   box(T,out,3,3.1,4,x,1.9,0,metal);
   box(T,out,4,.6,6,x,3.85,0,dark);
  }
 }else{
  plinth(T,out,Math.max(12,D*4),Math.max(12,D*4));
  r.position.y=.55;out.add(r);
  for(let i=0;i<6;i++){
   const p=i*Math.PI/3,t=Math.max(D*1.4,4);
   box(T,out,.28,2,.28,Math.cos(p)*t,1.0,Math.sin(p)*t,metal);
  }
  if(site.variant==='ariane5')for(const side of [-1,1]){
   brace(T,out,[side*D*1.7,.5,0],[side*D*.75,H*.22,0],.18,metal);
  }
 }
 return out;
}
export function buildMuseumExhibitScene(T,site){
 if(!site?.dims||!['rocket','capsule','orbiter'].includes(site.type))throw Error('Invalid spacecraft exhibit');
 const group=site.type==='orbiter'?makeOrbiter(T,site):
  site.type==='rocket'?buildRocket(T,site):
  site.variant==='soyuz'?makeSoyuz(T,site):makeApollo(T,site);
 group.name='BridgePoint spacecraft museum reconstruction: '+site.name;
 group.userData={source:'BridgePoint original procedural visualization, not a 3D scan',dimensionsM:site.dims};
 group.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=false;o.receiveShadow=false;}});
 return group;
}
