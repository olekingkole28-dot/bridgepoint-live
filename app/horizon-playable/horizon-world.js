import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

const ENDPOINT='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-horizon-preview-v2984';
const FREE_BASE='https://cdn.jsdelivr.net/gh/agentkaerf/FreeModels@main/Zombie%20Apocalypse%20Kit%20-%20March%202024';
const INTERIOR_BASE='https://cdn.jsdelivr.net/gh/sijun-kevin-hu/break-my-house@main/public/models/house-interior';
const ASSETS={
  player:FREE_BASE+'/Characters/glTF/Characters_Matt_SingleWeapon.gltf',
  zombie:FREE_BASE+'/Characters/glTF/Zombie_Basic.gltf',
  barrel:FREE_BASE+'/Environment/glTF/Barrel.gltf',
  trash:FREE_BASE+'/Environment/glTF/TrashBag_1.gltf',
  pallet:FREE_BASE+'/Environment/glTF/Pallet_Broken.gltf',
  barrier:FREE_BASE+'/Environment/glTF/TrafficBarrier_1.gltf',
  cone:FREE_BASE+'/Environment/glTF/TrafficCone_1.gltf',
  streetlight:FREE_BASE+'/Environment/glTF/StreetLights.gltf',
  hydrant:FREE_BASE+'/Environment/glTF/FireHydrant.gltf',
  vehicle:FREE_BASE+'/Vehicles/glTF/Vehicle_Pickup.gltf',
  axe:FREE_BASE+'/Weapons/glTF/Axe.gltf',
  bat:FREE_BASE+'/Weapons/glTF/WoodenBat_Barbed.gltf',
  knife:FREE_BASE+'/Weapons/glTF/Knife.gltf'
};
const INTERIOR_ASSETS={
  chair:INTERIOR_BASE+'/Chair.glb',
  couch:INTERIOR_BASE+'/Couch%20Small-X9msj0gtb5.glb',
  plant:INTERIOR_BASE+'/Houseplant.glb',
  fridge:INTERIOR_BASE+'/Kitchen%20Fridge.glb',
  sink:INTERIOR_BASE+'/Kitchen%20Sink.glb',
  lamp:INTERIOR_BASE+'/Lamp.glb',
  oven:INTERIOR_BASE+'/Oven.glb',
  shelf:INTERIOR_BASE+'/Shelf%20Large.glb',
  table:INTERIOR_BASE+'/Table%20Round%20Small.glb'
};

const params=new URLSearchParams(location.search);
const params=new URLSearchParams(location.search);
const CELL=params.get('cell')==='middletown'?'middletown':'manhattan';
const $=id=>document.getElementById(id);
const root=$('world');
const loadText=$('loadText');
$('cellMiddletown')?.classList.toggle('active',CELL==='middletown');
$('cellManhattan')?.classList.toggle('active',CELL==='manhattan');

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x68746e);
scene.fog=new THREE.FogExp2(0x69736d,CELL==='manhattan'?.00019:.00027);

const camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.08,12000);
camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.03;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

function resizeRenderer(){
  const w=Math.max(1,root.clientWidth||innerWidth),h=Math.max(1,root.clientHeight||innerHeight);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
}
addEventListener('resize',resizeRenderer,{passive:true});
addEventListener('orientationchange',()=>setTimeout(resizeRenderer,180),{passive:true});
resizeRenderer();

const loader=new GLTFLoader();
const clock=new THREE.Clock();
const exteriorRoot=new THREE.Group();
const worldGroup=new THREE.Group();
const artGroup=new THREE.Group();
const lootGroup=new THREE.Group();
const zombieGroup=new THREE.Group();
const entryGroup=new THREE.Group();
const interiorGroup=new THREE.Group();
exteriorRoot.add(worldGroup,artGroup,lootGroup,zombieGroup,entryGroup);
scene.add(exteriorRoot,interiorGroup);
interiorGroup.visible=false;

let data,lon0,lat0,mx,my,baseElevation=0;
let data,lon0,lat0,mx,my,baseElevation=0;
let parcelLayer,partsLayer,buildingLayer,roadLayer,terrainLayer;
let hemi,sun,lightMode=0;
let playerRoot=null,playerMixer=null,playerClips=[],playerAction=null;
let yaw=0,pitch=.14,cameraMode=0;
let health=100,lastDamageAt=0;
let playerSpawn=new THREE.Vector3();
const playerVelocity=new THREE.Vector3();
let roadAnchors=[],buildingCenters=[],buildingEntries=[],zombies=[],interiorZombies=[];
let nearestInteract=null,lootCount=2;
let inventory={Bandage:1,Water:1};
let packName='Starter Duffel',packCapacity=24,packMesh=null;
let weaponPivot=null,weaponTemplates={},equippedWeaponName='Axe',swingTime=0,attackCooldown=0;
let zombieTemplate=null;
let mobileMove={x:0,y:0},mobileSprint=false;
let interiorMode=false,activeInterior=null,exteriorReturn=new THREE.Vector3(),exteriorYaw=0;
let interiorWalls=[],interiorContainers=[],interiorBounds=null,interiorExit=null,interiorTemplates={};
const keys=new Set();
const keys=new Set();

const minimap=$('minimap');
const mapCtx=minimap.getContext('2d');
const mapBase=document.createElement('canvas');
const mapFog=document.createElement('canvas');
mapBase.width=mapFog.width=minimap.width;
mapBase.height=mapFog.height=minimap.height;
const baseCtx=mapBase.getContext('2d');
const fogCtx=mapFog.getContext('2d');
let lastReveal=null,exploredPoints=[];

const outerRings=g=>g?.type==='Polygon'?(g.coordinates?.[0]?[g.coordinates[0]]:[]):g?.type==='MultiPolygon'?(g.coordinates||[]).map(p=>p?.[0]).filter(Boolean):[];
const allLines=g=>g?.type==='LineString'?[g.coordinates||[]]:g?.type==='MultiLineString'?(g.coordinates||[]):g?.type==='Polygon'?(g.coordinates||[]):g?.type==='MultiPolygon'?(g.coordinates||[]).flat():[];
function project(p){return{x:(+p[0]-lon0)*mx,y:(+p[1]-lat0)*my}}
function unproject(x,y){return[lon0+x/mx,lat0+y/my]}
function centerRing(r){
  let x=0,y=0,n=0;
  for(const p of r||[])if(Number.isFinite(+p?.[0])&&Number.isFinite(+p?.[1])){x+=+p[0];y+=+p[1];n++}
  return n?[x/n,y/n]:[lon0,lat0];
}
function shapeFromRing(r){
  const s=new THREE.Shape();let first=true;
  for(const p of r||[]){const q=project(p);if(first){s.moveTo(q.x,q.y);first=false}else s.lineTo(q.x,q.y)}
  return first?null:s;
}
function ringArea(r){
  let a=0;
  for(let i=0,j=r.length-1;i<r.length;j=i++)a+=(+r[j][0])*(+r[i][1])-(+r[i][0])*(+r[j][1]);
  return Math.abs(a/2);
}
function heightFor(row){
  const h=Number(row.height_m);
  if(Number.isFinite(h)&&h>1)return{h:Math.min(h,500),proxy:false};
  const f=Number(row.floors);
  if(Number.isFinite(f)&&f>0)return{h:Math.min(f*3.15,420),proxy:true};
  return{h:CELL==='manhattan'?13:7.5,proxy:true};
}
function terrainZ(lon,lat){
  const t=data?.terrain;
  if(!t?.heights_m?.length)return 0;
  const fx=(lon-data.bbox.west)/(data.bbox.east-data.bbox.west)*(t.width-1);
  const fy=(data.bbox.north-lat)/(data.bbox.north-data.bbox.south)*(t.height-1);
  const x0=Math.max(0,Math.min(t.width-1,Math.floor(fx))),x1=Math.max(0,Math.min(t.width-1,x0+1));
  const y0=Math.max(0,Math.min(t.height-1,Math.floor(fy))),y1=Math.max(0,Math.min(t.height-1,y0+1));
  const tx=Math.max(0,Math.min(1,fx-x0)),ty=Math.max(0,Math.min(1,fy-y0)),v=t.heights_m;
  const a=v[y0*t.width+x0],b=v[y0*t.width+x1],c=v[y1*t.width+x0],d=v[y1*t.width+x1];
  return ((a*(1-tx)+b*tx)*(1-ty)+(c*(1-tx)+d*tx)*ty)-baseElevation;
}
function terrainZXY(x,y){const p=unproject(x,y);return terrainZ(p[0],p[1])}

function seeded(seed){let x=seed||1234567;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1000000)/1000000}}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
const rand=seeded(hash(CELL+'-horizon-2980'));

function canvasTexture(kind){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');const r=seeded(hash(kind));
  if(kind==='ground'){
    x.fillStyle='#5b664f';x.fillRect(0,0,256,256);
    for(let i=0;i<3400;i++){const g=Math.floor(55+r()*60),rr=Math.floor(55+r()*55),b=Math.floor(35+r()*35);x.fillStyle='rgba('+rr+','+g+','+b+','+(r()*.22+.03)+')';x.fillRect(r()*256,r()*256,1+r()*3,1+r()*3)}
  }else if(kind==='asphalt'){
    x.fillStyle='#2c302f';x.fillRect(0,0,256,256);
    for(let i=0;i<1400;i++){const v=Math.floor(35+r()*45);x.fillStyle='rgba('+v+','+v+','+v+','+(r()*.18)+')';x.fillRect(r()*256,r()*256,1,1)}
  }else{
    x.fillStyle=kind==='brick'?'#75645b':'#777d79';x.fillRect(0,0,256,256);
    for(let yy=6;yy<250;yy+=18){
      for(let xx=5;xx<250;xx+=18){
        if(r()>.22){x.fillStyle=kind==='glass'?'#273d42':(r()>.5?'#252c2d':'#403c32');x.fillRect(xx,yy,10,9)}
      }
    }
    x.fillStyle='rgba(255,255,255,.05)';
    for(let i=0;i<700;i++)x.fillRect(r()*256,r()*256,1,1);
  }
  const t=new THREE.CanvasTexture(c);
  t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(kind==='ground'?18:kind==='asphalt'?10:.055,kind==='ground'?18:kind==='asphalt'?10:.055);
  t.anisotropy=4;
  return t;
}
const groundTex=canvasTexture('ground'),asphaltTex=canvasTexture('asphalt'),wallTex=canvasTexture('wall'),brickTex=canvasTexture('brick'),glassTex=canvasTexture('glass');

function buildTerrain(){
  const t=data.terrain;
  if(!t?.heights_m?.length){
    const w=(data.bbox.east-data.bbox.west)*mx,h=(data.bbox.north-data.bbox.south)*my;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h,1,1),new THREE.MeshStandardMaterial({map:groundTex,color:0x7d846d,roughness:1}));
    mesh.receiveShadow=true;terrainLayer=mesh;worldGroup.add(mesh);return;
  }
  const center=Math.floor(t.height/2)*t.width+Math.floor(t.width/2);
  baseElevation=Number(t.heights_m[center]||0);
  const pos=[],uv=[],idx=[];
  for(let y=0;y<t.height;y++)for(let x=0;x<t.width;x++){
    const lon=data.bbox.west+(data.bbox.east-data.bbox.west)*x/(t.width-1);
    const lat=data.bbox.north-(data.bbox.north-data.bbox.south)*y/(t.height-1),p=project([lon,lat]);
    pos.push(p.x,p.y,Number(t.heights_m[y*t.width+x])-baseElevation);uv.push(x/(t.width-1),1-y/(t.height-1));
  }
  for(let y=0;y<t.height-1;y++)for(let x=0;x<t.width-1;x++){const a=y*t.width+x,b=a+1,c=a+t.width,d=c+1;idx.push(a,c,b,b,c,d)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  terrainLayer=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:groundTex,color:0x8a8f78,roughness:1}));
  terrainLayer.receiveShadow=true;worldGroup.add(terrainLayer);
}

const buildingMaterials={
  brick:new THREE.MeshStandardMaterial({map:brickTex,color:0xa49186,roughness:.88}),
  concrete:new THREE.MeshStandardMaterial({map:wallTex,color:0xa6aaa4,roughness:.86}),
  glass:new THREE.MeshStandardMaterial({map:glassTex,color:0x8b9c99,roughness:.28,metalness:.16,emissive:0x101a18,emissiveIntensity:.32}),
  wood:new THREE.MeshStandardMaterial({map:wallTex,color:0x8a755f,roughness:.9}),
  metal:new THREE.MeshStandardMaterial({map:wallTex,color:0x8b9491,roughness:.48,metalness:.28})
};
function facadeKey(row){
  const f=String(row.facade_material||'').toLowerCase();
  if(f.includes('brick'))return'brick';if(/glass/.test(f))return'glass';if(/wood|timber/.test(f))return'wood';if(/metal|steel/.test(f))return'metal';return'concrete';
}
function buildBuildings(){
  buildingLayer=new THREE.Group();buildingLayer.name='source-buildings';worldGroup.add(buildingLayer);
  const buckets={brick:[],concrete:[],glass:[],wood:[],metal:[]};let proxies=0,sourceH=0;
  for(const row of data.buildings||[])for(const r of outerRings(row.geometry)){
    const shape=shapeFromRing(r);if(!shape)continue;
    const ht=heightFor(row);ht.proxy?proxies++:sourceH++;
    const geo=new THREE.ExtrudeGeometry(shape,{depth:ht.h,bevelEnabled:false,steps:1});
    const c=centerRing(r),q=project(c);geo.translate(0,0,terrainZ(c[0],c[1])+.16);geo.computeVertexNormals();
    buckets[facadeKey(row)].push(geo);
    if(ringArea(r)>.000000002)buildingCenters.push({x:q.x,y:q.y,z:terrainZ(c[0],c[1]),height:ht.h});
  }
  for(const [k,geos] of Object.entries(buckets)){
    if(!geos.length)continue;
    const merged=mergeLocal(geos);if(!merged)continue;
    const mesh=new THREE.Mesh(merged,buildingMaterials[k]);mesh.castShadow=true;mesh.receiveShadow=true;buildingLayer.add(mesh);
    for(const g of geos)g.dispose();
  }
  loadText.textContent='Geometry ready · '+sourceH.toLocaleString()+' source-height buildings · '+proxies.toLocaleString()+' visual-height proxies';
}
function mergeLocal(geos){
  if(!geos.length)return null;
  const first=geos[0],attrNames=Object.keys(first.attributes),indexArrays=[];
  let vertexOffset=0,totalVertices=0;
  const attrData={};
  for(const name of attrNames)attrData[name]=[];
  for(const g of geos){
    for(const name of attrNames){
      const a=g.getAttribute(name);if(!a)continue;
      for(let i=0;i<a.array.length;i++)attrData[name].push(a.array[i]);
    }
    const count=g.getAttribute('position').count;
    if(g.index){for(let i=0;i<g.index.array.length;i++)indexArrays.push(g.index.array[i]+vertexOffset)}
    else{for(let i=0;i<count;i++)indexArrays.push(i+vertexOffset)}
    vertexOffset+=count;totalVertices+=count;
  }
  const out=new THREE.BufferGeometry();
  for(const name of attrNames){
    const a=first.getAttribute(name);
    const arr=a.array instanceof Float64Array?new Float64Array(attrData[name]):new Float32Array(attrData[name]);
    out.setAttribute(name,new THREE.BufferAttribute(arr,a.itemSize,a.normalized));
  }
  out.setIndex(totalVertices>65535?new THREE.Uint32BufferAttribute(indexArrays,1):new THREE.Uint16BufferAttribute(indexArrays,1));
  out.computeBoundingSphere();return out;
}
function buildParts(){
  partsLayer=new THREE.Group();partsLayer.name='building-parts';worldGroup.add(partsLayer);const geos=[];
  for(const row of data.building_parts||[])for(const r of outerRings(row.geometry)){
    const shape=shapeFromRing(r);if(!shape)continue;
    const top=Math.max(Number(row.height_m)||4,2),min=Math.max(Number(row.min_height_m)||0,0);
    const geo=new THREE.ExtrudeGeometry(shape,{depth:Math.max(1,top-min),bevelEnabled:false,steps:1}),c=centerRing(r);
    geo.translate(0,0,terrainZ(c[0],c[1])+min+.22);geos.push(geo);
  }
  const g=mergeLocal(geos);
  if(g){const m=new THREE.MeshStandardMaterial({color:0x63716d,roughness:.62,metalness:.06});const mesh=new THREE.Mesh(g,m);mesh.castShadow=true;partsLayer.add(mesh)}
  for(const x of geos)x.dispose();
}
function buildParcels(){
  const pos=[];
  for(const row of data.parcels||[])for(const ring of allLines(row.geometry))for(let i=1;i<ring.length;i++){
    const a=ring[i-1],b=ring[i],pa=project(a),pb=project(b);
    pos.push(pa.x,pa.y,terrainZ(a[0],a[1])+.36,pb.x,pb.y,terrainZ(b[0],b[1])+.36);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  parcelLayer=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x71d99a,transparent:true,opacity:.30,depthWrite:false}));
  parcelLayer.visible=false;worldGroup.add(parcelLayer);
}
function lineFeatures(g){if(g?.type==='LineString')return[g.coordinates||[]];if(g?.type==='MultiLineString')return g.coordinates||[];if(g?.type==='Polygon')return g.coordinates||[];if(g?.type==='MultiPolygon')return(g.coordinates||[]).flat();return[]}
function buildStrips(features){
  const pos=[],idx=[];let vi=0;
  for(const f of features||[])for(const line of lineFeatures(f.geometry)){
    const width=f.kind==='ROAD_PRIMARY'?15:f.kind==='ROAD_SECONDARY'?10:f.kind==='ROAD_LOCAL'?6:f.kind==='RAIL'?3.5:5;
    for(let i=1;i<line.length;i++){
      const a=line[i-1],b=line[i],pa=project(a),pb=project(b),dx=pb.x-pa.x,dy=pb.y-pa.y,len=Math.hypot(dx,dy);
      if(len<.2)continue;
      const nx=-dy/len*width/2,ny=dx/len*width/2,za=terrainZ(a[0],a[1])+.18,zb=terrainZ(b[0],b[1])+.18;
      pos.push(pa.x+nx,pa.y+ny,za,pa.x-nx,pa.y-ny,za,pb.x+nx,pb.y+ny,zb,pb.x-nx,pb.y-ny,zb);
      idx.push(vi,vi+1,vi+2,vi+2,vi+1,vi+3);vi+=4;
    }
  }
  if(!pos.length)return null;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function buildRoads(){
  const roads=(data.transport||[]).filter(x=>x.kind!=='RAIL'),rails=(data.transport||[]).filter(x=>x.kind==='RAIL');
  roadLayer=new THREE.Group();worldGroup.add(roadLayer);
  const rg=buildStrips(roads);if(rg){const mesh=new THREE.Mesh(rg,new THREE.MeshStandardMaterial({map:asphaltTex,color:0x777b78,roughness:.96}));mesh.receiveShadow=true;roadLayer.add(mesh)}
  const rail=buildStrips(rails);if(rail)roadLayer.add(new THREE.Mesh(rail,new THREE.MeshStandardMaterial({color:0x474744,roughness:.78,metalness:.25})));
  roadAnchors=[];
  for(const f of roads)for(const line of lineFeatures(f.geometry))for(let i=0;i<line.length;i+=Math.max(1,Math.floor(line.length/8))){
    const p=line[i];if(!p)continue;const q=project(p);roadAnchors.push({x:q.x,y:q.y,z:terrainZ(p[0],p[1])});
  }
}
function buildWater(){
  const geos=[];
  for(const f of data.water||[])for(const r of outerRings(f.geometry)){const s=shapeFromRing(r);if(!s)continue;const g=new THREE.ShapeGeometry(s),c=centerRing(r);g.translate(0,0,terrainZ(c[0],c[1])+.23);geos.push(g)}
  const g=mergeLocal(geos);
  if(g)worldGroup.add(new THREE.Mesh(g,new THREE.MeshPhysicalMaterial({color:0x315e66,roughness:.18,metalness:.03,transparent:true,opacity:.78})));
  for(const x of geos)x.dispose();
}
function addLights(){
  hemi=new THREE.HemisphereLight(0xdce9df,0x283125,1.15);scene.add(hemi);
  sun=new THREE.DirectionalLight(0xffefd0,2.65);sun.position.set(-900,-650,1500);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);
  sun.shadow.camera.left=-800;sun.shadow.camera.right=800;sun.shadow.camera.top=800;sun.shadow.camera.bottom=-800;sun.shadow.camera.far=3500;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xb7d1d7,.38);fill.position.set(500,900,700);scene.add(fill);
}
function setLighting(mode){
  lightMode=mode%3;const b=$('lightBtn'),modes=[['☀','Day'],['◐','Dusk'],['☾','Night']],v=modes[lightMode];b.innerHTML=v[0]+' <span>'+v[1]+'</span>';
  if(lightMode===0){scene.background.set(0x68746e);scene.fog.color.set(0x69736d);hemi.intensity=1.15;sun.intensity=2.65;sun.color.set(0xffefd0);renderer.toneMappingExposure=1.03}
  if(lightMode===1){scene.background.set(0x403d3a);scene.fog.color.set(0x494743);hemi.intensity=.63;sun.intensity=1.7;sun.color.set(0xf49a62);renderer.toneMappingExposure=.86}
  if(lightMode===2){scene.background.set(0x07100d);scene.fog.color.set(0x0b1511);hemi.intensity=.23;sun.intensity=.28;sun.color.set(0x91b8c4);renderer.toneMappingExposure=.64}
}

function normalizedModel(source,targetHeight,animated=false){
  const model=animated?cloneSkeleton(source):source.clone(true);
  const box=new THREE.Box3().setFromObject(model),size=new THREE.Vector3();box.getSize(size);
  const scale=targetHeight/Math.max(.01,size.y);
  model.scale.multiplyScalar(scale);
  const box2=new THREE.Box3().setFromObject(model),center=new THREE.Vector3();box2.getCenter(center);
  model.position.x-=center.x;model.position.z-=center.z;model.position.y-=box2.min.y;
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  const inner=new THREE.Group();inner.rotation.x=Math.PI/2;inner.add(model);
  const root=new THREE.Group();root.add(inner);
  return{root,model};
}
async function loadAsset(url){
  try{return await loader.loadAsync(url)}catch(e){console.warn('Asset load failed',url,e);return null}
}
function nearestRoadToCenter(){
  if(!roadAnchors.length)return{x:0,y:0,z:terrainZ(lon0,lat0)};
  let best=roadAnchors[0],d=Infinity;
  for(const a of roadAnchors){const q=a.x*a.x+a.y*a.y;if(q<d){d=q;best=a}}
  return best;
}
function fallbackPlayer(){
  const root=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0x39473d,roughness:.82});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.8,4,8),mat);body.position.z=1.05;body.rotation.x=Math.PI/2;
  const head=new THREE.Mesh(new THREE.SphereGeometry(.24,12,10),new THREE.MeshStandardMaterial({color:0x9b806c,roughness:.85}));head.position.z=1.78;
  const pack=new THREE.Mesh(new THREE.BoxGeometry(.5,.23,.65),new THREE.MeshStandardMaterial({color:0x4c3b2c,roughness:.95}));pack.position.set(0,-.27,1.2);
  root.add(body,head,pack);return root;
}
async function buildPlayer(){
  const spawn=nearestRoadToCenter();playerSpawn.set(spawn.x,spawn.y,spawn.z+.05);
  const gltf=await loadAsset(ASSETS.player);
  if(gltf){
    const n=normalizedModel(gltf.scene,1.82,true);playerRoot=n.root;playerClips=gltf.animations||[];playerMixer=new THREE.AnimationMixer(n.model);
    playPlayerAnimation(false);
  }else playerRoot=fallbackPlayer();
  playerRoot.position.copy(playerSpawn);scene.add(playerRoot);
}
function playPlayerAnimation(moving){
  if(!playerMixer||!playerClips.length)return;
  const desired=playerClips.find(c=>moving?/run|walk/i.test(c.name):/idle/i.test(c.name))||playerClips[0];
  if(playerAction?._clip===desired)return;
  const next=playerMixer.clipAction(desired);next.reset().fadeIn(.16).play();if(playerAction)playerAction.fadeOut(.16);playerAction=next;
}
function staticClone(template,targetHeight){
  if(!template)return null;
  const n=normalizedModel(template.scene,targetHeight,false);return n.root;
}
function scatterTemplate(template,count,targetHeight,spread=7){
  if(!template||!roadAnchors.length)return;
  for(let i=0;i<count;i++){
    const a=roadAnchors[Math.floor(rand()*roadAnchors.length)],o=staticClone(template,targetHeight);if(!o)continue;
    const ang=rand()*Math.PI*2,dist=2+rand()*spread;o.position.set(a.x+Math.cos(ang)*dist,a.y+Math.sin(ang)*dist,terrainZXY(a.x,a.y)+.05);o.rotation.z=rand()*Math.PI*2;artGroup.add(o);
  }
}
function makeFallbackChest(){
  const g=new THREE.Group(),base=new THREE.Mesh(new THREE.BoxGeometry(.9,.55,.42),new THREE.MeshStandardMaterial({color:0x69502f,roughness:.86}));base.position.z=.25;
  const band=new THREE.Mesh(new THREE.BoxGeometry(.94,.08,.46),new THREE.MeshStandardMaterial({color:0xb9985f,metalness:.2,roughness:.55}));band.position.z=.27;g.add(base,band);return g;
}
function chooseLootBuildings(){
  const sorted=[...buildingCenters].sort((a,b)=>(a.x*a.x+a.y*a.y)-(b.x*b.x+b.y*b.y));
  const out=[];const gap=CELL==='manhattan'?13:9;
  for(let i=5;i<sorted.length&&out.length<(CELL==='manhattan'?28:20);i+=gap)out.push(sorted[i]);
  return out;
}
function buildLoot(chestTemplate){
  const candidates=chooseLootBuildings();
  for(let i=0;i<candidates.length;i++){
    const c=candidates[i],root=chestTemplate?staticClone(chestTemplate,.78):makeFallbackChest();
    root.position.set(c.x,c.y,c.z+.08);root.rotation.z=rand()*Math.PI*2;lootGroup.add(root);
    lootSpawns.push({root,x:c.x,y:c.y,z:c.z,active:true,seed:i});
  }
}
function randomLoot(seed){
  const table=['Bandage','Water','Canned food','Scrap','Batteries','9mm ammo','Rifle rounds','Painkillers','Cloth','Tool parts'];
  const r=seeded(seed*991+hash(CELL));
  const n=1+Math.floor(r()*3),out=[];
  for(let i=0;i<n;i++)out.push(table[Math.floor(r()*table.length)]);
  return out;
}
function collectNearestLoot(){
  if(!nearestLoot||!nearestLoot.active)return;
  nearestLoot.active=false;lootGroup.remove(nearestLoot.root);
  for(const item of randomLoot(nearestLoot.seed+lootCount*17)){inventory[item]=(inventory[item]||0)+1;lootCount++}
  $('lootStat').textContent=String(lootCount);updateInventory();nearestLoot=null;$('interactPrompt').hidden=true;
}
function updateInventory(){
  const entries=Object.entries(inventory);$('inventoryCount').textContent=lootCount+' items';
  $('inventoryList').innerHTML=entries.length?entries.slice(0,8).map(([k,v])=>'<span>'+k+' ×'+v+'</span>').join(''):'<span class="empty">Find loot inside buildings.</span>';
}
function updateLootPrompt(){
  if(!playerRoot)return;
  let best=null,d=Infinity;
  for(const l of lootSpawns)if(l.active){const dx=l.x-playerRoot.position.x,dy=l.y-playerRoot.position.y,q=Math.hypot(dx,dy);if(q<d){d=q;best=l}}
  nearestLoot=d<3.4?best:null;
  $('interactPrompt').hidden=!nearestLoot;
  if(nearestLoot)$('interactLabel').textContent='LOOT BUILDING CACHE';
}

async function buildZombies(zombieTemplate){
  if(!zombieTemplate||!roadAnchors.length)return;
  const count=CELL==='manhattan'?8:6,candidates=roadAnchors.filter(a=>{const d=Math.hypot(a.x-playerSpawn.x,a.y-playerSpawn.y);return d>35&&d<220});
  const clip=(zombieTemplate.animations||[]).find(c=>/walk|run/i.test(c.name))||(zombieTemplate.animations||[])[0];
  for(let i=0;i<count&&candidates.length;i++){
    const a=candidates[Math.floor(rand()*candidates.length)],n=normalizedModel(zombieTemplate.scene,1.78,true);
    n.root.position.set(a.x,a.y,a.z+.05);n.root.rotation.z=rand()*Math.PI*2;zombieGroup.add(n.root);
    let mixer=null;if(clip){mixer=new THREE.AnimationMixer(n.model);mixer.clipAction(clip).play()}
    zombies.push({root:n.root,mixer,home:new THREE.Vector2(a.x,a.y),phase:rand()*Math.PI*2,speed:.75+rand()*.45});
  }
  $('zombieStat').textContent=String(zombies.length);
}
function updateZombies(dt,now){
  if(!playerRoot)return;
  for(const z of zombies){
    z.mixer?.update(dt);
    const dx=playerRoot.position.x-z.root.position.x,dy=playerRoot.position.y-z.root.position.y,dist=Math.hypot(dx,dy);
    let vx,vy;
    if(dist<32){vx=dx/Math.max(dist,.001);vy=dy/Math.max(dist,.001)}
    else{z.phase+=dt*.16;vx=Math.cos(z.phase);vy=Math.sin(z.phase)}
    z.root.position.x+=vx*z.speed*dt;z.root.position.y+=vy*z.speed*dt;z.root.position.z=terrainZXY(z.root.position.x,z.root.position.y)+.05;
    z.root.rotation.z=Math.atan2(vx,vy)+Math.PI;
    if(dist<1.55&&now-lastDamageAt>900){health=Math.max(0,health-8);lastDamageAt=now;$('healthStat').textContent=String(health)}
  }
}

async function buildSurvivalArt(){
  const [chest,barrel,trash,pallet,barrier,vehicle,zombie]=await Promise.all([
    loadAsset(ASSETS.chest),loadAsset(ASSETS.barrel),loadAsset(ASSETS.trash),loadAsset(ASSETS.pallet),
    loadAsset(ASSETS.barrier),loadAsset(ASSETS.vehicle),loadAsset(ASSETS.zombie)
  ]);
  scatterTemplate(barrel,CELL==='manhattan'?22:16,1.15,8);
  scatterTemplate(trash,CELL==='manhattan'?28:20,.72,8);
  scatterTemplate(pallet,12,.32,7);
  scatterTemplate(barrier,CELL==='manhattan'?16:10,1.1,5);
  scatterTemplate(vehicle,CELL==='manhattan'?12:6,1.75,10);
  buildLoot(chest);await buildZombies(zombie);
}

function toMapXY(x,y){
  const west=project([data.bbox.west,lat0]).x,east=project([data.bbox.east,lat0]).x;
  const south=project([lon0,data.bbox.south]).y,north=project([lon0,data.bbox.north]).y;
  return{x:(x-west)/(east-west)*mapBase.width,y:mapBase.height-(y-south)/(north-south)*mapBase.height};
}
function drawMinimapBase(){
  baseCtx.fillStyle='#435444';baseCtx.fillRect(0,0,mapBase.width,mapBase.height);
  baseCtx.lineCap='round';
  for(const f of data.transport||[]){
    baseCtx.strokeStyle=f.kind==='RAIL'?'#2b2c2b':f.kind==='ROAD_PRIMARY'?'#a39f8e':'#74776f';baseCtx.lineWidth=f.kind==='ROAD_PRIMARY'?3:f.kind==='ROAD_SECONDARY'?2:1;
    for(const line of lineFeatures(f.geometry)){baseCtx.beginPath();let first=true;for(const p of line){const q=project(p),m=toMapXY(q.x,q.y);if(first){baseCtx.moveTo(m.x,m.y);first=false}else baseCtx.lineTo(m.x,m.y)}baseCtx.stroke()}
  }
  baseCtx.fillStyle='#b2aea0';
  for(const row of data.buildings||[])for(const ring of outerRings(row.geometry)){baseCtx.beginPath();let first=true;for(const p of ring){const q=project(p),m=toMapXY(q.x,q.y);if(first){baseCtx.moveTo(m.x,m.y);first=false}else baseCtx.lineTo(m.x,m.y)}baseCtx.closePath();baseCtx.fill()}
  fogCtx.globalCompositeOperation='source-over';fogCtx.fillStyle='#696d68';fogCtx.fillRect(0,0,mapFog.width,mapFog.height);
  loadExploration();
}
function revealMap(x,y,save=true){
  const m=toMapXY(x,y);fogCtx.globalCompositeOperation='destination-out';
  const radius=CELL==='manhattan'?13:15,gr=fogCtx.createRadialGradient(m.x,m.y,2,m.x,m.y,radius);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.72,'rgba(0,0,0,.96)');gr.addColorStop(1,'rgba(0,0,0,0)');
  fogCtx.fillStyle=gr;fogCtx.beginPath();fogCtx.arc(m.x,m.y,radius,0,Math.PI*2);fogCtx.fill();
  if(save){
    exploredPoints.push([Math.round(x),Math.round(y)]);if(exploredPoints.length>500)exploredPoints.shift();
    try{localStorage.setItem('horizon-explore-'+CELL,JSON.stringify(exploredPoints))}catch(_){}
  }
}
function loadExploration(){
  try{const a=JSON.parse(localStorage.getItem('horizon-explore-'+CELL)||'[]');if(Array.isArray(a)){exploredPoints=a.slice(-500);for(const p of exploredPoints)revealMap(+p[0],+p[1],false)}}catch(_){}
}
function renderMinimap(){
  if(!playerRoot)return;
  mapCtx.clearRect(0,0,minimap.width,minimap.height);mapCtx.drawImage(mapBase,0,0);mapCtx.drawImage(mapFog,0,0);
  const p=toMapXY(playerRoot.position.x,playerRoot.position.y);
  mapCtx.save();mapCtx.translate(p.x,p.y);mapCtx.rotate(-yaw);mapCtx.fillStyle='#8effb5';mapCtx.beginPath();mapCtx.moveTo(0,-7);mapCtx.lineTo(5,6);mapCtx.lineTo(-5,6);mapCtx.closePath();mapCtx.fill();mapCtx.restore();
}

function initInput(){
  addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='KeyE')collectNearestLoot()});
  addEventListener('keyup',e=>keys.delete(e.code));

  let lookId=null,lastX=0,lastY=0;
  renderer.domElement.addEventListener('pointerdown',e=>{lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId)});
  renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;yaw-=dx*.0055;pitch=THREE.MathUtils.clamp(pitch+dy*.0038,-.18,.58)});
  const stopLook=e=>{if(e.pointerId===lookId)lookId=null};renderer.domElement.addEventListener('pointerup',stopLook);renderer.domElement.addEventListener('pointercancel',stopLook);

  const pad=$('movePad'),knob=$('moveKnob');let padId=null;
  function padMove(e){
    const r=pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.34,len=Math.hypot(dx,dy)||1,s=Math.min(1,max/len),px=dx*s,py=dy*s;
    knob.style.transform='translate('+px+'px,'+py+'px)';mobileMove.x=px/max;mobileMove.y=-py/max;
  }
  pad?.addEventListener('pointerdown',e=>{padId=e.pointerId;pad.setPointerCapture?.(e.pointerId);padMove(e)});
  pad?.addEventListener('pointermove',e=>{if(e.pointerId===padId)padMove(e)});
  const padEnd=e=>{if(e.pointerId!==padId)return;padId=null;mobileMove.x=mobileMove.y=0;knob.style.transform='translate(0,0)'};pad?.addEventListener('pointerup',padEnd);pad?.addEventListener('pointercancel',padEnd);

  $('interactBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();collectNearestLoot()});
  const sprint=$('sprintBtn');sprint?.addEventListener('pointerdown',e=>{e.preventDefault();mobileSprint=true});sprint?.addEventListener('pointerup',()=>mobileSprint=false);sprint?.addEventListener('pointercancel',()=>mobileSprint=false);

  $('cameraBtn').onclick=()=>cameraMode=(cameraMode+1)%2;
  $('lightBtn').onclick=()=>setLighting(lightMode+1);
  $('parcelBtn').onclick=()=>{parcelLayer.visible=!parcelLayer.visible;$('parcelBtn').classList.toggle('active',parcelLayer.visible)};
  $('artBtn').onclick=()=>{artGroup.visible=!artGroup.visible;lootGroup.visible=artGroup.visible;zombieGroup.visible=artGroup.visible;$('artBtn').classList.toggle('active',artGroup.visible)};
}
function updatePlayer(dt){
  if(!playerRoot)return;
  let ix=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+mobileMove.x;
  let iy=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+mobileMove.y;
  const len=Math.hypot(ix,iy);if(len>1){ix/=len;iy/=len}
  const moving=Math.hypot(ix,iy)>.06,sprint=keys.has('ShiftLeft')||keys.has('ShiftRight')||mobileSprint,speed=sprint?7.2:4.25;
  if(moving){
    const fx=Math.sin(yaw),fy=Math.cos(yaw),rx=Math.cos(yaw),ry=-Math.sin(yaw);
    playerRoot.position.x+=(fx*iy+rx*ix)*speed*dt;playerRoot.position.y+=(fy*iy+ry*ix)*speed*dt;
    playerRoot.rotation.z=Math.atan2(fx*iy+rx*ix,fy*iy+ry*ix)+Math.PI;
  }
  playerRoot.position.z=terrainZXY(playerRoot.position.x,playerRoot.position.y)+.05;
  playPlayerAnimation(moving);playerMixer?.update(dt);
  const revealDist=lastReveal?Math.hypot(playerRoot.position.x-lastReveal.x,playerRoot.position.y-lastReveal.y):999;
  if(revealDist>5){revealMap(playerRoot.position.x,playerRoot.position.y,true);lastReveal=playerRoot.position.clone()}
}
function updateCamera(){
  if(!playerRoot)return;
  const target=playerRoot.position.clone().add(new THREE.Vector3(0,0,1.35)),forward=new THREE.Vector3(Math.sin(yaw),Math.cos(yaw),0),right=new THREE.Vector3(Math.cos(yaw),-Math.sin(yaw),0);
  const dist=cameraMode===0?4.6:2.15,shoulder=cameraMode===0?.45:.34;
  const desired=target.clone().addScaledVector(forward,-dist*Math.cos(pitch)).addScaledVector(right,shoulder);desired.z+=1.0+dist*Math.sin(pitch);
  camera.position.lerp(desired,.18);camera.lookAt(target.clone().addScaledVector(forward,cameraMode===0?2.0:3.2));
}
async function enterLandscape(){
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'})}catch(_){}
  try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape')}catch(_){}
  setTimeout(resizeRenderer,160);
}
$('landscapeBtn')?.addEventListener('click',enterLandscape);
$('fullscreenBtn')?.addEventListener('click',enterLandscape);

async function boot(){
  try{
    $('cellLabel').textContent=CELL==='manhattan'?'MANHATTAN · DENSE CITY CELL':'MIDDLETOWN · NEIGHBORHOOD CELL';
    $('worldTitle').textContent=CELL==='manhattan'?'Manhattan survivor':'Neighborhood survivor';
    const r=await fetch(ENDPOINT+'?cell='+CELL,{headers:{accept:'application/json'},cache:'no-store'});
    if(!r.ok)throw new Error('Horizon scene endpoint returned '+r.status);
    data=await r.json();if(!data?.complete)throw new Error(data?.error||'Horizon scene incomplete');
    lon0=Number(data.center.lon);lat0=Number(data.center.lat);mx=111320*Math.cos(lat0*Math.PI/180);my=110540;

    buildTerrain();buildRoads();buildWater();buildBuildings();buildParts();buildParcels();addLights();setLighting(0);drawMinimapBase();initInput();
    await buildPlayer();
    revealMap(playerRoot.position.x,playerRoot.position.y,true);lastReveal=playerRoot.position.clone();
    loadText.textContent='Loading CC0 survivor, loot, vehicles and infected…';
    await buildSurvivalArt();
    loadText.textContent=(data.counts?.buildings||0).toLocaleString()+' buildings · playable ground world ready';
    window.BP_HORIZON_SMOKE={ok:true,cell:CELL,buildings:Number(data.counts?.buildings||0),parts:Number(data.counts?.building_parts||0),player:Boolean(playerRoot),loot:lootSpawns.length,zombies:zombies.length,artChildren:artGroup.children.length};
    updateLootPrompt();resizeRenderer();
  }catch(e){
    console.error(e);window.BP_HORIZON_SMOKE={ok:false,cell:CELL,error:String(e?.message||e)};$('error').hidden=false;$('errorText').textContent=String(e?.message||e);loadText.textContent='Preview unavailable';
  }
}

let lastPrompt=0;
function loop(now=performance.now()){
  const dt=Math.min(.05,clock.getDelta()||.016);
  updatePlayer(dt);updateZombies(dt,now);updateCamera();
  if(now-lastPrompt>180){updateLootPrompt();lastPrompt=now}
  renderMinimap();renderer.render(scene,camera);requestAnimationFrame(loop);
}
loop();boot();
