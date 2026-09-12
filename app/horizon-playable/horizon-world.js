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
  brick:new THREE.MeshStandardMaterial({map:brickTex,color:0xb29b8e,roughness:.84,emissive:0x100b07,emissiveIntensity:.10}),
  concrete:new THREE.MeshStandardMaterial({map:wallTex,color:0xaeb1aa,roughness:.82,emissive:0x0d100c,emissiveIntensity:.08}),
  glass:new THREE.MeshStandardMaterial({map:glassTex,color:0x8fa7aa,roughness:.22,metalness:.20,emissive:0x172522,emissiveIntensity:.42}),
  wood:new THREE.MeshStandardMaterial({map:wallTex,color:0x8a755f,roughness:.90}),
  metal:new THREE.MeshStandardMaterial({map:wallTex,color:0x8e999a,roughness:.42,metalness:.34,emissive:0x111515,emissiveIntensity:.10})
};
function facadeKey(row,height=8){
  const f=String(row.facade_material||'').toLowerCase();
  if(f.includes('brick'))return'brick';
  if(/glass/.test(f))return'glass';
  if(/wood|timber/.test(f))return'wood';
  if(/metal|steel/.test(f))return'metal';
  const roll=hash(String(row.id||'')+':'+Math.round(height))%100;
  if(CELL==='manhattan'&&height>85)return roll<72?'glass':'metal';
  if(CELL==='manhattan'&&height>35)return roll<35?'glass':roll<64?'brick':'concrete';
  if(CELL==='manhattan'&&roll<58)return'brick';
  return'concrete';
}
function buildBuildings(){
  buildingLayer=new THREE.Group();buildingLayer.name='source-buildings';worldGroup.add(buildingLayer);
  const buckets={brick:[],concrete:[],glass:[],wood:[],metal:[]};let proxies=0,sourceH=0;
  for(const row of data.buildings||[])for(const r of outerRings(row.geometry)){
    const shape=shapeFromRing(r);if(!shape)continue;
    const ht=heightFor(row);ht.proxy?proxies++:sourceH++;
    const geo=new THREE.ExtrudeGeometry(shape,{depth:ht.h,bevelEnabled:false,steps:1});
    const c=centerRing(r),q=project(c),z=terrainZ(c[0],c[1]);geo.translate(0,0,z+.16);geo.computeVertexNormals();
    buckets[facadeKey(row,ht.h)].push(geo);
    if(ringArea(r)>.0000000012){
      const pts=r.map(project).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
      const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
      const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
      const width=maxx-minx,depth=maxy-miny;
      if(width>2.8&&depth>2.8)buildingCenters.push({id:String(row.id||hash(JSON.stringify(c))),x:q.x,y:q.y,z,height:ht.h,minx,maxx,miny,maxy,width,depth});
    }
  }
  for(const [k,geos] of Object.entries(buckets)){
    if(!geos.length)continue;
    const merged=mergeLocal(geos);if(!merged)continue;
    const mesh=new THREE.Mesh(merged,buildingMaterials[k]);mesh.castShadow=true;mesh.receiveShadow=true;buildingLayer.add(mesh);
    for(const g of geos)g.dispose();
  }
  loadText.textContent='Geometry ready · '+sourceH.toLocaleString()+' source-height buildings · '+proxies.toLocaleString()+' visual-height proxies';
}
function nearestRoadForBuilding(b){
  let best=null,d=Infinity;
  const step=Math.max(1,Math.floor(roadAnchors.length/700));
  for(let i=0;i<roadAnchors.length;i+=step){
    const a=roadAnchors[i],q=(a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y);
    if(q<d){d=q;best=a}
  }
  return best;
}
function buildEntryPoints(){
  entryGroup.clear();buildingEntries=[];
  const candidates=[...buildingCenters].filter(b=>b.width>4&&b.depth>4&&b.height>5).sort((a,b)=>(a.x*a.x+a.y*a.y)-(b.x*b.x+b.y*b.y));
  const maxEntries=CELL==='manhattan'?46:28,stride=Math.max(1,Math.floor(candidates.length/maxEntries));
  for(let i=2;i<candidates.length&&buildingEntries.length<maxEntries;i+=stride){
    const b=candidates[i],road=nearestRoadForBuilding(b);if(!road)continue;
    const dx=road.x-b.x,dy=road.y-b.y;let x=b.x,y=b.y,rot=0;
    if(Math.abs(dx)>Math.abs(dy)){x=dx>0?b.maxx+.55:b.minx-.55;y=THREE.MathUtils.clamp(road.y,b.miny+.7,b.maxy-.7);rot=Math.PI/2}
    else{y=dy>0?b.maxy+.55:b.miny-.55;x=THREE.MathUtils.clamp(road.x,b.minx+.7,b.maxx-.7)}
    const root=new THREE.Group(),frameMat=new THREE.MeshStandardMaterial({color:0x242922,roughness:.68,metalness:.22}),glowMat=new THREE.MeshStandardMaterial({color:0x506c57,emissive:0x2a7b49,emissiveIntensity:.65,roughness:.55});
    const left=new THREE.Mesh(new THREE.BoxGeometry(.15,.18,2.35),frameMat),right=left.clone();left.position.set(-.62,0,1.17);right.position.set(.62,0,1.17);
    const top=new THREE.Mesh(new THREE.BoxGeometry(1.38,.18,.15),frameMat);top.position.set(0,0,2.28);
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(.18,.12,.18),glowMat);lamp.position.set(0,-.12,2.05);
    root.add(left,right,top,lamp);root.position.set(x,y,b.z);root.rotation.z=rot;entryGroup.add(root);
    buildingEntries.push({...b,entryX:x,entryY:y,entryZ:b.z,doorRoot:root,seed:hash(b.id+':interior')});
  }
}
function mergeLocal(geos){
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
  root.add(body,head);return root;
}
function attachDuffel(){
  if(!playerRoot)return;
  const bag=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(.62,.28,.72),new THREE.MeshStandardMaterial({color:0x4b3a27,roughness:.94}));
  body.position.z=1.05;
  const flap=new THREE.Mesh(new THREE.BoxGeometry(.64,.30,.18),new THREE.MeshStandardMaterial({color:0x34291e,roughness:.92}));flap.position.set(0,-.03,1.37);
  const strapMat=new THREE.MeshStandardMaterial({color:0x25231e,roughness:.9});
  const strap1=new THREE.Mesh(new THREE.BoxGeometry(.07,.05,.85),strapMat);strap1.position.set(-.2,-.18,1.08);strap1.rotation.x=.18;
  const strap2=strap1.clone();strap2.position.x=.2;
  bag.add(body,flap,strap1,strap2);bag.position.set(0,.27,.12);playerRoot.add(bag);packMesh=bag;
}
function updatePackVisual(){if(packMesh){const scale=packCapacity>=40?1.18:packCapacity>=34?1.08:1;packMesh.scale.setScalar(scale)}}
function mountWeaponModel(template,name){
  if(!playerRoot)return;
  if(!weaponPivot){weaponPivot=new THREE.Group();weaponPivot.position.set(.48,.02,1.15);playerRoot.add(weaponPivot)}
  while(weaponPivot.children.length)weaponPivot.remove(weaponPivot.children[0]);
  if(template){
    const w=staticClone(template,name==='Knife'?.46:name==='Barbed Bat'?1.05:.72);
    if(w){w.rotation.set(.15,.1,-.8);weaponPivot.add(w)}
  }else{
    const fallback=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.7),new THREE.MeshStandardMaterial({color:0x6d6253,roughness:.72,metalness:.18}));fallback.position.z=.3;weaponPivot.add(fallback);
  }
  equippedWeaponName=name;updateInventory();
}
function equipWeapon(name){const key=name==='Barbed Bat'?'bat':name==='Knife'?'knife':'axe';mountWeaponModel(weaponTemplates[key],name)}
async function buildPlayer(){
  const spawn=nearestRoadToCenter();playerSpawn.set(spawn.x,spawn.y,spawn.z+.05);
  const [gltf,axe,bat,knife]=await Promise.all([loadAsset(ASSETS.player),loadAsset(ASSETS.axe),loadAsset(ASSETS.bat),loadAsset(ASSETS.knife)]);
  weaponTemplates={axe,bat,knife};
  if(gltf){const n=normalizedModel(gltf.scene,1.82,true);playerRoot=n.root;playerClips=gltf.animations||[];playerMixer=new THREE.AnimationMixer(n.model)}
  else playerRoot=fallbackPlayer();
  playerRoot.position.copy(playerSpawn);scene.add(playerRoot);attachDuffel();mountWeaponModel(axe,'Axe');playPlayerAnimation('idle');
}
function playPlayerAnimation(state){
  if(!playerMixer||!playerClips.length)return;
  const re=state==='attack'?/attack|melee|swing|hit/i:state==='move'?/run|walk|move/i:/idle|stand/i;
  const desired=playerClips.find(c=>re.test(c.name))||playerClips[0];
  if(playerAction?._clip===desired)return;
  const next=playerMixer.clipAction(desired);next.reset().fadeIn(.12).play();if(playerAction)playerAction.fadeOut(.12);playerAction=next;
}
function staticClone(template,targetHeight){
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
function showToast(message){
  let el=document.getElementById('lootToast');
  if(!el){el=document.createElement('div');el.id='lootToast';document.body.appendChild(el)}
  el.textContent=message;el.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.remove('show'),2200);
}
function updateInventory(){
  const entries=Object.entries(inventory).filter(([,v])=>v>0);
  $('inventoryCount').textContent=lootCount+' / '+packCapacity+' slots';
  const pack=$('packName');if(pack)pack.textContent=packName.toUpperCase();
  const weapon=$('equippedWeapon');if(weapon)weapon.textContent='Equipped: '+equippedWeaponName;
  const packStat=$('packStat');if(packStat)packStat.textContent=lootCount+'/'+packCapacity;
  $('lootStat').textContent=String(lootCount);
  $('inventoryList').innerHTML=entries.length?entries.slice(0,10).map(([k,v])=>'<span>'+k+' ×'+v+'</span>').join(''):'<span class="empty">Search rooms, cabinets and furniture.</span>';
}
function addInventoryItem(item){
  if(item==='Hiking Backpack'){
    if(packCapacity<36){packCapacity=36;packName='Hiking Backpack';updatePackVisual();showToast('Pack upgraded: Hiking Backpack · 36 slots')}
    return true;
  }
  if(item==='Large Duffel'){
    if(packCapacity<42){packCapacity=42;packName='Large Duffel';updatePackVisual();showToast('Pack upgraded: Large Duffel · 42 slots')}
    return true;
  }
  if(lootCount>=packCapacity){showToast('PACK FULL — find a larger bag');return false}
  inventory[item]=(inventory[item]||0)+1;lootCount++;
  if(item==='Axe'||item==='Barbed Bat'||item==='Knife')equipWeapon(item);
  return true;
}
function lootForContainer(type,seed){
  const r=seeded(seed+lootCount*131);
  const common={
    kitchen:['Water','Canned food','Energy bar','Batteries','Kitchen knife','Cloth'],
    dresser:['Cloth','Bandage','Work gloves','Flashlight','Batteries','Painkillers'],
    medicine:['Bandage','Painkillers','First aid kit','Alcohol wipes','Water'],
    shelf:['Batteries','Scrap','Tool parts','Flashlight','Radio','Cloth'],
    fridge:['Water','Canned food','Energy drink','Food ration'],
    bed:['Bandage','Pocket knife','Cloth','Water','Flashlight'],
    picture:['Axe','Barbed Bat','Knife','First aid kit','Batteries','Tool parts'],
    cabinet:['Water','Bandage','Batteries','Canned food','Tool parts']
  };
  const source=common[type]||common.cabinet;
  const count=1+Math.floor(r()*3),out=[];
  for(let i=0;i<count;i++)out.push(source[Math.floor(r()*source.length)]);
  const rare=r();
  if(rare<.06)out.push('Large Duffel');
  else if(rare<.14)out.push('Hiking Backpack');
  if((type==='picture'||type==='bed')&&r()<.28){
    const loadouts=[
      ['Axe','Bandage','Water','Work gloves'],
      ['Barbed Bat','First aid kit','Energy bar','Flashlight'],
      ['Knife','Batteries','Radio','Canned food'],
      ['First aid kit','Bandage','Painkillers','Water']
    ];
    out.push(...loadouts[Math.floor(r()*loadouts.length)]);
  }
  return out;
}
function makePrimitive(type,matColor=0x6c6256){
  const mat=new THREE.MeshStandardMaterial({color:matColor,roughness:.86});
  if(type==='bed'){
    const g=new THREE.Group();
    const base=new THREE.Mesh(new THREE.BoxGeometry(2.1,3.7,.38),mat);base.position.z=.28;
    const mattress=new THREE.Mesh(new THREE.BoxGeometry(1.95,3.45,.28),new THREE.MeshStandardMaterial({color:0xb8b1a3,roughness:.95}));mattress.position.z=.57;
    const pillow=new THREE.Mesh(new THREE.BoxGeometry(.8,.62,.18),new THREE.MeshStandardMaterial({color:0xd3d0c7,roughness:.94}));pillow.position.set(0,1.12,.80);
    const head=new THREE.Mesh(new THREE.BoxGeometry(2.15,.14,1.0),new THREE.MeshStandardMaterial({color:0x4b3829,roughness:.9}));head.position.set(0,1.79,.72);
    g.add(base,mattress,pillow,head);return g;
  }
  if(type==='dresser'){
    const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(1.55,.62,1.12),mat);body.position.z=.56;g.add(body);
    for(let z=.25;z<1;z+=.28){const h=new THREE.Mesh(new THREE.BoxGeometry(.7,.05,.07),new THREE.MeshStandardMaterial({color:0x2c2822,metalness:.22,roughness:.5}));h.position.set(0,-.34,z);g.add(h)}
    return g;
  }
  if(type==='cabinet'){
    const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(1.2,.55,1.0),mat);body.position.z=.5;g.add(body);
    const seam=new THREE.Mesh(new THREE.BoxGeometry(.035,.03,.82),new THREE.MeshStandardMaterial({color:0x26231f}));seam.position.set(0,-.295,.52);g.add(seam);return g;
  }
  if(type==='picture'){
    const g=new THREE.Group(),frame=new THREE.Mesh(new THREE.BoxGeometry(1.2,.07,.82),new THREE.MeshStandardMaterial({color:0x34291e,roughness:.75}));frame.position.z=.45;
    const art=new THREE.Mesh(new THREE.BoxGeometry(1.02,.075,.64),new THREE.MeshStandardMaterial({color:0x725c49,roughness:.88}));art.position.set(0,-.01,.45);g.add(frame,art);return g;
  }
  return new THREE.Group();
}
function placeInteriorTemplate(key,x,y,z,height,rot=0){
  const template=interiorTemplates[key];if(!template)return null;
  const obj=staticClone(template,height);if(!obj)return null;
  obj.position.set(x,y,z);obj.rotation.z=rot;interiorGroup.add(obj);return obj;
}
function addWallRect(cx,cy,sx,sy,height=2.8,color=0xc1beb2,collision=true){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,height),new THREE.MeshStandardMaterial({color,roughness:.92}));
  mesh.position.set(cx,cy,height/2);mesh.castShadow=true;mesh.receiveShadow=true;interiorGroup.add(mesh);
  if(collision)interiorWalls.push({minx:cx-sx/2,maxx:cx+sx/2,miny:cy-sy/2,maxy:cy+sy/2});
  return mesh;
}
function addWallWithDoor(axis,pos,start,end,doorCenter,gap=1.45){
  const a1=start,a2=doorCenter-gap/2,b1=doorCenter+gap/2,b2=end;
  if(a2>a1){if(axis==='h')addWallRect((a1+a2)/2,pos,a2-a1,.16);else addWallRect(pos,(a1+a2)/2,.16,a2-a1)}
  if(b2>b1){if(axis==='h')addWallRect((b1+b2)/2,pos,b2-b1,.16);else addWallRect(pos,(b1+b2)/2,.16,b2-b1)}
}
function createSearchSpot(label,x,y,type,seed){const spot={label,x,y,type,seed,active:true};interiorContainers.push(spot);return spot}
function clearInterior(){
  while(interiorGroup.children.length)interiorGroup.remove(interiorGroup.children[0]);
  interiorWalls=[];interiorContainers=[];interiorZombies=[];interiorBounds=null;interiorExit=null;
}
function generateInterior(entry){
  clearInterior();
  const r=seeded(entry.seed),w=THREE.MathUtils.clamp(entry.width*1.15,13,25),h=THREE.MathUtils.clamp(entry.depth*1.15,11,22);
  interiorBounds={minx:-w/2+.42,maxx:w/2-.42,miny:-h/2+.42,maxy:h/2-.42};
  const floorMat=new THREE.MeshStandardMaterial({color:r()>.5?0x665647:0x5c5e57,roughness:.88});
  const floor=new THREE.Mesh(new THREE.BoxGeometry(w,h,.18),floorMat);floor.position.z=-.09;floor.receiveShadow=true;interiorGroup.add(floor);
  const ceiling=new THREE.Mesh(new THREE.BoxGeometry(w,h,.12),new THREE.MeshStandardMaterial({color:0x6e6f68,roughness:.98,side:THREE.DoubleSide}));ceiling.position.z=2.95;interiorGroup.add(ceiling);
  addWallRect(0,h/2,w,.18);addWallRect(-w/2,0,.18,h);addWallRect(w/2,0,.18,h);
  addWallWithDoor('h',-h/2,-w/2,w/2,0,1.75);
  interiorExit={x:0,y:-h/2+.9};

  const layoutRoll=r(),layout=layoutRoll<.28?'Two-bedroom apartment':layoutRoll<.52?'Loft apartment':layoutRoll<.74?'Office conversion':'Hotel-style floor';
  if(layout==='Two-bedroom apartment'){
    addWallWithDoor('v',-w*.13,-h*.10,h/2,h*.17,1.35);
    addWallWithDoor('h',h*.08,-w/2,-w*.13,-w*.30,1.25);
  }else if(layout==='Office conversion'){
    addWallWithDoor('h',0,-w/2,w/2,w*.18,1.45);
    addWallWithDoor('v',w*.18,0,h/2,h*.24,1.35);
  }else if(layout==='Hotel-style floor'){
    addWallWithDoor('h',h*.06,-w/2,w/2,-w*.18,1.35);
    addWallWithDoor('v',0,h*.06,h/2,h*.28,1.25);
  }else addWallWithDoor('v',w*.27,-h*.02,h/2,h*.19,1.4);

  const warm=new THREE.PointLight(0xffd6a0,18,18,2);warm.position.set(-w*.2,-h*.1,2.25);interiorGroup.add(warm);
  const cool=new THREE.PointLight(0xbfd7ff,10,15,2);cool.position.set(w*.28,h*.20,2.2);interiorGroup.add(cool);

  const windowMat=new THREE.MeshStandardMaterial({color:0x314650,emissive:0x182d36,emissiveIntensity:.52,roughness:.2,metalness:.12});
  for(let x=-w/2+1.4;x<w/2-1;x+=2.2){const win=new THREE.Mesh(new THREE.BoxGeometry(1.25,.08,1.15),windowMat);win.position.set(x,h/2-.13,1.62);interiorGroup.add(win)}

  placeInteriorTemplate('couch',-w*.22,h*.18,.02,1.0,Math.PI/2);
  placeInteriorTemplate('table',-w*.03,h*.18,.02,.78,0);
  placeInteriorTemplate('chair',w*.11,h*.18,.02,1.05,-Math.PI/2);
  placeInteriorTemplate('plant',w*.38,h*.32,.02,1.25,0);
  placeInteriorTemplate('fridge',-w*.38,-h*.25,.02,1.85,0);
  placeInteriorTemplate('sink',-w*.20,-h*.31,.02,1.0,0);
  placeInteriorTemplate('oven',-w*.04,-h*.31,.02,1.0,0);
  placeInteriorTemplate('shelf',w*.39,-h*.15,.02,1.9,-Math.PI/2);
  placeInteriorTemplate('lamp',w*.22,h*.25,.02,1.35,0);

  const bed=makePrimitive('bed');bed.position.set(w*.28,h*.25,.02);bed.rotation.z=Math.PI/2;interiorGroup.add(bed);
  const dresser=makePrimitive('dresser');dresser.position.set(w*.40,h*.02,.02);dresser.rotation.z=-Math.PI/2;interiorGroup.add(dresser);
  const cabinet=makePrimitive('cabinet');cabinet.position.set(-w*.34,-h*.36,.02);interiorGroup.add(cabinet);
  const picture=makePrimitive('picture');picture.position.set(w*.20,h/2-.22,1.15);interiorGroup.add(picture);

  createSearchSpot('Search kitchen cabinet',-w*.34,-h*.36,'kitchen',entry.seed+11);
  createSearchSpot('Search refrigerator',-w*.38,-h*.25,'fridge',entry.seed+23);
  createSearchSpot('Search dresser drawers',w*.40,h*.02,'dresser',entry.seed+37);
  createSearchSpot('Check under the bed',w*.28,h*.25,'bed',entry.seed+51);
  createSearchSpot('Search shelf',w*.39,-h*.15,'shelf',entry.seed+67);
  createSearchSpot('Look behind the picture',w*.20,h/2-.85,'picture',entry.seed+79);
  if(r()>.42)createSearchSpot('Search bathroom cabinet',w*.06,-h*.02,'medicine',entry.seed+91);
  if(r()>.58)createSearchSpot('Search closet',-w*.39,h*.12,'dresser',entry.seed+107);

  const floors=Math.max(1,Math.floor(entry.height/3.05)),floor=Math.min(floors,1+Math.floor(r()*Math.min(floors,18)));
  activeInterior={entry,width:w,depth:h,layout,floor,floors};
  if(zombieTemplate&&r()<.38)spawnInteriorZombie(zombieTemplate,r,w,h);
}
function spawnInteriorZombie(template,r,w,h){
  const n=normalizedModel(template.scene,1.78,true);n.root.position.set((r()-.5)*w*.48,h*.28,.05);n.root.rotation.z=r()*Math.PI*2;interiorGroup.add(n.root);
  const clip=(template.animations||[]).find(c=>/walk|run/i.test(c.name))||(template.animations||[])[0];
  let mixer=null;if(clip){mixer=new THREE.AnimationMixer(n.model);mixer.clipAction(clip).play()}
  interiorZombies.push({root:n.root,mixer,phase:r()*Math.PI*2,speed:.65+r()*.35,hp:100,dead:false});
}
function enterInterior(entry){
  if(interiorMode||!playerRoot)return;
  exteriorReturn.set(entry.entryX,entry.entryY,entry.entryZ+.05);exteriorYaw=yaw;generateInterior(entry);
  exteriorRoot.visible=false;interiorGroup.visible=true;interiorMode=true;playerVelocity.set(0,0,0);
  playerRoot.position.set(0,-activeInterior.depth/2+2.0,.05);yaw=0;pitch=.12;
  $('cellLabel').textContent='PROCEDURAL INTERIOR · GAME ART';
  $('worldTitle').textContent=activeInterior.layout+' · Floor '+activeInterior.floor;
  loadText.textContent='Search furniture, drawers, cabinets and hidden stashes.';
  const mapLabel=document.querySelector('.mapLabel b');if(mapLabel)mapLabel.textContent='FLOOR PLAN';
  const mapSub=document.querySelector('.mapLabel span');if(mapSub)mapSub.textContent='search every room';
  updateZombieCount();
}
function exitInterior(){
  if(!interiorMode)return;
  interiorMode=false;interiorGroup.visible=false;exteriorRoot.visible=true;clearInterior();playerVelocity.set(0,0,0);playerRoot.position.copy(exteriorReturn);yaw=exteriorYaw;
  $('cellLabel').textContent=CELL==='manhattan'?'DOWNTOWN MANHATTAN · SURVIVAL CELL':'MIDDLETOWN · NEIGHBORHOOD CELL';
  $('worldTitle').textContent=CELL==='manhattan'?'Downtown Manhattan survivor':'Neighborhood survivor';
  loadText.textContent=(data.counts?.buildings||0).toLocaleString()+' source-backed buildings · enter marked doorways';
  const mapLabel=document.querySelector('.mapLabel b');if(mapLabel)mapLabel.textContent='EXPLORED';
  const mapSub=document.querySelector('.mapLabel span');if(mapSub)mapSub.textContent='fog clears as you travel';
  updateZombieCount();
}
function searchContainer(spot){
  if(!spot?.active)return;
  spot.active=false;const items=lootForContainer(spot.type,spot.seed),added=[];
  for(const item of items)if(addInventoryItem(item))added.push(item);
  updateInventory();showToast(added.length?'Found: '+added.join(' · '):'Nothing useful here');
}
function findNearestInteraction(){
  if(!playerRoot)return null;let best=null,bestD=Infinity;
  if(interiorMode){
    if(interiorExit){const d=Math.hypot(playerRoot.position.x-interiorExit.x,playerRoot.position.y-interiorExit.y);if(d<2.05){best={kind:'exit',label:'EXIT BUILDING'};bestD=d}}
    for(const c of interiorContainers)if(c.active){const d=Math.hypot(playerRoot.position.x-c.x,playerRoot.position.y-c.y);if(d<2.05&&d<bestD){best={kind:'loot',label:c.label,spot:c};bestD=d}}
  }else{
    for(const e of buildingEntries){const d=Math.hypot(playerRoot.position.x-e.entryX,playerRoot.position.y-e.entryY);if(d<2.4&&d<bestD){best={kind:'entry',label:'ENTER BUILDING',entry:e};bestD=d}}
  }
  return best;
}
function interact(){
  const hit=findNearestInteraction();if(!hit)return;
  if(hit.kind==='entry')enterInterior(hit.entry);else if(hit.kind==='exit')exitInterior();else if(hit.kind==='loot')searchContainer(hit.spot);
}
function updateInteractionPrompt(){
  nearestInteract=findNearestInteraction();$('interactPrompt').hidden=!nearestInteract;if(nearestInteract)$('interactLabel').textContent=nearestInteract.label;
}
function attack(){
  if(attackCooldown>0||!playerRoot)return;
  attackCooldown=.48;swingTime=.38;playPlayerAnimation('attack');
  const targets=interiorMode?interiorZombies:zombies,fx=Math.sin(yaw),fy=Math.cos(yaw);let hit=false;
  for(const z of targets){
    if(z.dead)continue;
    const dx=z.root.position.x-playerRoot.position.x,dy=z.root.position.y-playerRoot.position.y,dist=Math.hypot(dx,dy);
    if(dist>2.65)continue;
    const dot=(dx*fx+dy*fy)/Math.max(dist,.001);if(dot<.08)continue;
    z.hp-=equippedWeaponName==='Axe'?70:equippedWeaponName==='Barbed Bat'?58:48;hit=true;
    if(z.hp<=0){z.dead=true;z.root.parent?.remove(z.root)}
  }
  if(hit)showToast(equippedWeaponName+' connected');updateZombieCount();
}
function updateZombieCount(){
  const list=interiorMode?interiorZombies:zombies;$('zombieStat').textContent=String(list.filter(z=>!z.dead).length);
}
function updateWeapon(dt){
  attackCooldown=Math.max(0,attackCooldown-dt);
  if(!weaponPivot)return;
  if(swingTime>0){
    const total=.38,t=1-swingTime/total;swingTime=Math.max(0,swingTime-dt);
    weaponPivot.rotation.z=-.55-Math.sin(t*Math.PI)*1.55;weaponPivot.rotation.x=.15+Math.sin(t*Math.PI)*.45;
  }else{weaponPivot.rotation.z=-.55;weaponPivot.rotation.x=.15}
}

async function buildZombies(template){
  if(!template||!roadAnchors.length)return;
  const count=CELL==='manhattan'?18:8,candidates=roadAnchors.filter(a=>{const d=Math.hypot(a.x-playerSpawn.x,a.y-playerSpawn.y);return d>28&&d<260});
  const clip=(template.animations||[]).find(c=>/walk|run/i.test(c.name))||(template.animations||[])[0];
  for(let i=0;i<count&&candidates.length;i++){
    const a=candidates[Math.floor(rand()*candidates.length)],n=normalizedModel(template.scene,1.78,true);
    n.root.position.set(a.x,a.y,a.z+.05);n.root.rotation.z=rand()*Math.PI*2;zombieGroup.add(n.root);
    let mixer=null;if(clip){mixer=new THREE.AnimationMixer(n.model);mixer.clipAction(clip).play()}
    zombies.push({root:n.root,mixer,home:new THREE.Vector2(a.x,a.y),phase:rand()*Math.PI*2,speed:.72+rand()*.55,hp:100,dead:false});
  }
  updateZombieCount();
}
function isBlockedInterior(x,y){
  const r=.34;if(!interiorBounds)return false;
  if(x-r<interiorBounds.minx||x+r>interiorBounds.maxx||y-r<interiorBounds.miny||y+r>interiorBounds.maxy)return true;
  for(const w of interiorWalls)if(x+r>w.minx&&x-r<w.maxx&&y+r>w.miny&&y-r<w.maxy)return true;
  return false;
}
function isBlockedExterior(x,y){
  const r=.33;
  for(const b of buildingCenters){
    if(Math.abs(x-b.x)>b.width/2+1.5||Math.abs(y-b.y)>b.depth/2+1.5)continue;
    if(x+r>b.minx&&x-r<b.maxx&&y+r>b.miny&&y-r<b.maxy)return true;
  }
  return false;
}
function updateZombies(dt,now){
  if(!playerRoot)return;
  const list=interiorMode?interiorZombies:zombies;
  for(const z of list){
    if(z.dead)continue;z.mixer?.update(dt);
    const dx=playerRoot.position.x-z.root.position.x,dy=playerRoot.position.y-z.root.position.y,dist=Math.hypot(dx,dy);
    let vx,vy;
    if(dist<28){vx=dx/Math.max(dist,.001);vy=dy/Math.max(dist,.001)}
    else{z.phase+=dt*.18;vx=Math.cos(z.phase);vy=Math.sin(z.phase)}
    const nx=z.root.position.x+vx*z.speed*dt,ny=z.root.position.y+vy*z.speed*dt;
    if(interiorMode){
      if(!isBlockedInterior(nx,z.root.position.y))z.root.position.x=nx;
      if(!isBlockedInterior(z.root.position.x,ny))z.root.position.y=ny;
      z.root.position.z=.05;
    }else{
      if(!isBlockedExterior(nx,z.root.position.y))z.root.position.x=nx;
      if(!isBlockedExterior(z.root.position.x,ny))z.root.position.y=ny;
      z.root.position.z=terrainZXY(z.root.position.x,z.root.position.y)+.05;
    }
    z.root.rotation.z=Math.atan2(vx,vy)+Math.PI;
    if(dist<1.48&&now-lastDamageAt>850){
      health=Math.max(0,health-7);lastDamageAt=now;$('healthStat').textContent=String(health);showToast('Hit — '+health+' health');
    }
  }
  updateZombieCount();
}

async function buildSurvivalArt(){
  const [barrel,trash,pallet,barrier,cone,streetlight,hydrant,vehicle,zombie,...interiors]=await Promise.all([
    loadAsset(ASSETS.barrel),loadAsset(ASSETS.trash),loadAsset(ASSETS.pallet),loadAsset(ASSETS.barrier),
    loadAsset(ASSETS.cone),loadAsset(ASSETS.streetlight),loadAsset(ASSETS.hydrant),loadAsset(ASSETS.vehicle),loadAsset(ASSETS.zombie),
    ...Object.values(INTERIOR_ASSETS).map(loadAsset)
  ]);
  const keys=Object.keys(INTERIOR_ASSETS);interiorTemplates={};keys.forEach((k,i)=>interiorTemplates[k]=interiors[i]);
  zombieTemplate=zombie;
  scatterTemplate(barrel,CELL==='manhattan'?38:16,1.15,9);
  scatterTemplate(trash,CELL==='manhattan'?54:20,.72,9);
  scatterTemplate(pallet,CELL==='manhattan'?22:12,.32,8);
  scatterTemplate(barrier,CELL==='manhattan'?30:10,1.1,6);
  scatterTemplate(cone,CELL==='manhattan'?26:8,.75,5);
  scatterTemplate(streetlight,CELL==='manhattan'?42:16,4.8,6);
  scatterTemplate(hydrant,CELL==='manhattan'?24:10,.95,5);
  scatterTemplate(vehicle,CELL==='manhattan'?24:6,1.75,10);
  await buildZombies(zombie);
}
function toMapXY(x,y){
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
  mapCtx.clearRect(0,0,minimap.width,minimap.height);
  if(interiorMode&&activeInterior){
    mapCtx.fillStyle='#5f625e';mapCtx.fillRect(0,0,minimap.width,minimap.height);
    const sx=minimap.width/activeInterior.width,sy=minimap.height/activeInterior.depth;
    mapCtx.fillStyle='#30332f';
    for(const w of interiorWalls){
      const x=(w.minx+activeInterior.width/2)*sx,y=minimap.height-(w.maxy+activeInterior.depth/2)*sy;
      mapCtx.fillRect(x,y,Math.max(2,(w.maxx-w.minx)*sx),Math.max(2,(w.maxy-w.miny)*sy));
    }
    const px=(playerRoot.position.x+activeInterior.width/2)*sx,py=minimap.height-(playerRoot.position.y+activeInterior.depth/2)*sy;
    mapCtx.save();mapCtx.translate(px,py);mapCtx.rotate(-yaw);mapCtx.fillStyle='#8effb5';mapCtx.beginPath();mapCtx.moveTo(0,-7);mapCtx.lineTo(5,6);mapCtx.lineTo(-5,6);mapCtx.closePath();mapCtx.fill();mapCtx.restore();
    return;
  }
  mapCtx.drawImage(mapBase,0,0);mapCtx.drawImage(mapFog,0,0);
  const p=toMapXY(playerRoot.position.x,playerRoot.position.y);
  mapCtx.save();mapCtx.translate(p.x,p.y);mapCtx.rotate(-yaw);mapCtx.fillStyle='#8effb5';mapCtx.beginPath();mapCtx.moveTo(0,-7);mapCtx.lineTo(5,6);mapCtx.lineTo(-5,6);mapCtx.closePath();mapCtx.fill();mapCtx.restore();
}

function initInput(){
  addEventListener('keydown',e=>{
    keys.add(e.code);
    if(e.code==='KeyE')interact();
    if(e.code==='Space'||e.code==='KeyF'){e.preventDefault();attack()}
  });
  addEventListener('keyup',e=>keys.delete(e.code));

  let lookId=null,lastX=0,lastY=0;
  renderer.domElement.addEventListener('pointerdown',e=>{lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId)});
  renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;yaw-=dx*.0047;pitch=THREE.MathUtils.clamp(pitch+dy*.0032,-.12,.50)});
  const stopLook=e=>{if(e.pointerId===lookId)lookId=null};renderer.domElement.addEventListener('pointerup',stopLook);renderer.domElement.addEventListener('pointercancel',stopLook);

  const pad=$('movePad'),knob=$('moveKnob');let padId=null;
  function padMove(e){
    const r=pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.34,len=Math.hypot(dx,dy)||1,s=Math.min(1,max/len),px=dx*s,py=dy*s;
    knob.style.transform='translate('+px+'px,'+py+'px)';
    const nx=px/max,ny=-py/max,mag=Math.hypot(nx,ny);mobileMove.x=mag<.13?0:nx;mobileMove.y=mag<.13?0:ny;
  }
  pad?.addEventListener('pointerdown',e=>{padId=e.pointerId;pad.setPointerCapture?.(e.pointerId);padMove(e)});
  pad?.addEventListener('pointermove',e=>{if(e.pointerId===padId)padMove(e)});
  const padEnd=e=>{if(e.pointerId!==padId)return;padId=null;mobileMove.x=mobileMove.y=0;knob.style.transform='translate(0,0)'};pad?.addEventListener('pointerup',padEnd);pad?.addEventListener('pointercancel',padEnd);

  $('interactBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();interact()});
  $('attackBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();attack()});
  const sprint=$('sprintBtn');sprint?.addEventListener('pointerdown',e=>{e.preventDefault();mobileSprint=true});sprint?.addEventListener('pointerup',()=>mobileSprint=false);sprint?.addEventListener('pointercancel',()=>mobileSprint=false);

  $('cameraBtn').onclick=()=>cameraMode=(cameraMode+1)%2;
  $('lightBtn').onclick=()=>setLighting(lightMode+1);
  $('parcelBtn').onclick=()=>{if(!interiorMode){parcelLayer.visible=!parcelLayer.visible;$('parcelBtn').classList.toggle('active',parcelLayer.visible)}};
  $('artBtn').onclick=()=>{if(!interiorMode){artGroup.visible=!artGroup.visible;zombieGroup.visible=artGroup.visible;entryGroup.visible=artGroup.visible;$('artBtn').classList.toggle('active',artGroup.visible)}};
}
function lerpAngle(a,b,t){let d=(b-a+Math.PI)%(Math.PI*2)-Math.PI;return a+d*t}
function updatePlayer(dt){
  if(!playerRoot)return;
  let ix=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+mobileMove.x;
  let iy=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+mobileMove.y;
  const len=Math.hypot(ix,iy);if(len>1){ix/=len;iy/=len}
  const inputMag=Math.hypot(ix,iy),moving=inputMag>.05,sprint=keys.has('ShiftLeft')||keys.has('ShiftRight')||mobileSprint;
  const speed=(interiorMode?3.6:4.35)*(sprint?1.55:1);
  const fx=Math.sin(yaw),fy=Math.cos(yaw),rx=Math.cos(yaw),ry=-Math.sin(yaw);
  const desiredX=moving?(fx*iy+rx*ix)*speed:0,desiredY=moving?(fy*iy+ry*ix)*speed:0;
  const response=1-Math.exp(-(moving?11:15)*dt);
  playerVelocity.x=THREE.MathUtils.lerp(playerVelocity.x,desiredX,response);playerVelocity.y=THREE.MathUtils.lerp(playerVelocity.y,desiredY,response);

  const nx=playerRoot.position.x+playerVelocity.x*dt,ny=playerRoot.position.y+playerVelocity.y*dt;
  const blockedX=interiorMode?isBlockedInterior(nx,playerRoot.position.y):isBlockedExterior(nx,playerRoot.position.y);
  if(!blockedX)playerRoot.position.x=nx;else playerVelocity.x=0;
  const blockedY=interiorMode?isBlockedInterior(playerRoot.position.x,ny):isBlockedExterior(playerRoot.position.x,ny);
  if(!blockedY)playerRoot.position.y=ny;else playerVelocity.y=0;

  playerRoot.position.z=interiorMode?.05:terrainZXY(playerRoot.position.x,playerRoot.position.y)+.05;
  if(moving){
    const targetRot=Math.atan2(playerVelocity.x,playerVelocity.y)+Math.PI;
    playerRoot.rotation.z=lerpAngle(playerRoot.rotation.z,targetRot,1-Math.exp(-12*dt));
  }
  if(swingTime<=0)playPlayerAnimation(moving?'move':'idle');playerMixer?.update(dt);

  if(!interiorMode){
    const revealDist=lastReveal?Math.hypot(playerRoot.position.x-lastReveal.x,playerRoot.position.y-lastReveal.y):999;
    if(revealDist>4.5){revealMap(playerRoot.position.x,playerRoot.position.y,true);lastReveal=playerRoot.position.clone()}
  }
}
function updateCamera(dt){
function updateCamera(dt){
  if(!playerRoot)return;
  const target=playerRoot.position.clone().add(new THREE.Vector3(0,0,1.38));
  const forward=new THREE.Vector3(Math.sin(yaw),Math.cos(yaw),0),right=new THREE.Vector3(Math.cos(yaw),-Math.sin(yaw),0);
  const dist=interiorMode?(cameraMode===0?3.35:1.95):(cameraMode===0?4.25:2.15),shoulder=cameraMode===0?.52:.32;
  const desired=target.clone().addScaledVector(forward,-dist*Math.cos(pitch)).addScaledVector(right,shoulder);desired.z+=.9+dist*Math.sin(pitch);
  const alpha=1-Math.exp(-9*dt);camera.position.lerp(desired,alpha);camera.lookAt(target.clone().addScaledVector(forward,cameraMode===0?2.2:3.0));
}
async function enterLandscape(){
async function enterLandscape(){
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'})}catch(_){}
  try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape')}catch(_){}
  setTimeout(resizeRenderer,160);
}
$('landscapeBtn')?.addEventListener('click',enterLandscape);
$('fullscreenBtn')?.addEventListener('click',enterLandscape);

async function boot(){
  try{
    $('cellLabel').textContent=CELL==='manhattan'?'DOWNTOWN MANHATTAN · SURVIVAL CELL':'MIDDLETOWN · NEIGHBORHOOD CELL';
    $('worldTitle').textContent=CELL==='manhattan'?'Downtown Manhattan survivor':'Neighborhood survivor';
    updateInventory();
    const r=await fetch(ENDPOINT+'?cell='+CELL,{headers:{accept:'application/json'},cache:'no-store'});
    if(!r.ok)throw new Error('Horizon scene endpoint returned '+r.status);
    data=await r.json();if(!data?.complete)throw new Error(data?.error||'Horizon scene incomplete');
    lon0=Number(data.center.lon);lat0=Number(data.center.lat);mx=111320*Math.cos(lat0*Math.PI/180);my=110540;

    buildTerrain();buildRoads();buildWater();buildBuildings();buildParts();buildParcels();addLights();setLighting(0);drawMinimapBase();initInput();
    await buildPlayer();buildEntryPoints();
    revealMap(playerRoot.position.x,playerRoot.position.y,true);lastReveal=playerRoot.position.clone();
    loadText.textContent='Loading interiors, city dressing and infected…';
    await buildSurvivalArt();
    loadText.textContent=(data.counts?.buildings||0).toLocaleString()+' source-backed buildings · enter marked doorways and search interiors';
    updateInventory();updateInteractionPrompt();resizeRenderer();
    window.BP_HORIZON_SMOKE={ok:true,cell:CELL,buildings:Number(data.counts?.buildings||0),parts:Number(data.counts?.building_parts||0),player:Boolean(playerRoot),loot:buildingEntries.length,zombies:zombies.length,entries:buildingEntries.length,packCapacity,weapon:equippedWeaponName,interiorAssets:Object.values(interiorTemplates).filter(Boolean).length,artChildren:artGroup.children.length};
  }catch(e){
    console.error(e);window.BP_HORIZON_SMOKE={ok:false,cell:CELL,error:String(e?.message||e)};$('error').hidden=false;$('errorText').textContent=String(e?.message||e);loadText.textContent='Preview unavailable';
  }
}

let lastPrompt=0;
function loop(now=performance.now()){
  const dt=Math.min(.05,clock.getDelta()||.016);
  updateWeapon(dt);updatePlayer(dt);updateZombies(dt,now);updateCamera(dt);
  if(now-lastPrompt>120){updateInteractionPrompt();lastPrompt=now}
  renderMinimap();renderer.render(scene,camera);requestAnimationFrame(loop);
}
loop();boot();
