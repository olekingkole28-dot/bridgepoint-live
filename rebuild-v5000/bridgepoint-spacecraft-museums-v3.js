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
