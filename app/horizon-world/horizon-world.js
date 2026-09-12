import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js';
import {mergeGeometries} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/BufferGeometryUtils.js';

const ENDPOINT='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-horizon-preview-v2969';
const root=document.getElementById('world');
const loadText=document.getElementById('loadText');
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x77838a);
scene.fog=new THREE.FogExp2(0x79858a,.00030);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.2,30000);
camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.55));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;root.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.screenSpacePanning=false;controls.minDistance=10;controls.maxDistance=9000;controls.maxPolarAngle=Math.PI*.49;

let data,lon0,lat0,mx,my,baseElevation=0,terrainSampler=()=>0;
let parcelLayer,partsLayer,artLayer,buildingLayer,roadLayer,terrainLayer;
let hemi,sun,lightMode=0;

const outerRings=g=>g?.type==='Polygon'?(g.coordinates?.[0]?[g.coordinates[0]]:[]):g?.type==='MultiPolygon'?(g.coordinates||[]).map(p=>p?.[0]).filter(Boolean):[];
const allLines=g=>g?.type==='LineString'?[g.coordinates||[]]:g?.type==='MultiLineString'?(g.coordinates||[]):g?.type==='Polygon'?(g.coordinates||[]):g?.type==='MultiPolygon'?(g.coordinates||[]).flat():[];
function project(p){return{x:(+p[0]-lon0)*mx,y:(+p[1]-lat0)*my}}
function heightFor(row){const h=Number(row.height_m);if(Number.isFinite(h)&&h>1)return{h:Math.min(h,260),proxy:false};const f=Number(row.floors);if(Number.isFinite(f)&&f>0)return{h:Math.min(f*3.1,180),proxy:true};return{h:7.5,proxy:true}}
function centerRing(r){let x=0,y=0,n=0;for(const p of r||[]){if(Number.isFinite(+p?.[0])&&Number.isFinite(+p?.[1])){x+=+p[0];y+=+p[1];n++}}return n?[x/n,y/n]:[lon0,lat0]}
function shapeFromRing(r){const s=new THREE.Shape();let first=true;for(const p of r||[]){const q=project(p);if(first){s.moveTo(q.x,q.y);first=false}else s.lineTo(q.x,q.y)}return first?null:s}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function seeded(seed){let x=seed||1234567;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1000000)/1000000}}
function texture(kind){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');const rand=seeded(hash(kind));
  if(kind==='ground'){
    x.fillStyle='#526043';x.fillRect(0,0,256,256);
    for(let i=0;i<4200;i++){const a=rand()*.25+.03,g=Math.floor(55+rand()*70),r=Math.floor(65+rand()*70),b=Math.floor(38+rand()*50);x.fillStyle='rgba('+r+','+g+','+b+','+a+')';x.fillRect(rand()*256,rand()*256,1+rand()*3,1+rand()*3)}
  }else if(kind==='asphalt'){
    x.fillStyle='#24282a';x.fillRect(0,0,256,256);for(let i=0;i<1800;i++){const v=Math.floor(30+rand()*50);x.fillStyle='rgba('+v+','+v+','+v+','+(rand()*.18)+')';x.fillRect(rand()*256,rand()*256,1,1)}
    x.strokeStyle='rgba(8,10,11,.24)';x.lineWidth=1;for(let i=0;i<20;i++){x.beginPath();x.moveTo(rand()*256,rand()*256);x.lineTo(rand()*256,rand()*256);x.stroke()}
  }else{
    const brick=kind==='brick';x.fillStyle=brick?'#67534a':'#6a7070';x.fillRect(0,0,256,256);
    for(let i=0;i<900;i++){const v=Math.floor(90+rand()*55);x.fillStyle='rgba('+v+','+v+','+v+','+(rand()*.10)+')';x.fillRect(rand()*256,rand()*256,1+rand()*2,1+rand()*2)}
    if(brick){x.strokeStyle='rgba(28,25,22,.22)';x.lineWidth=2;for(let y=0;y<256;y+=22){x.beginPath();x.moveTo(0,y);x.lineTo(256,y);x.stroke();for(let xx=(Math.floor(y/22)%2)*24;xx<256;xx+=48){x.beginPath();x.moveTo(xx,y);x.lineTo(xx,y+22);x.stroke()}}}
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='ground'?18:kind==='asphalt'?12:5,kind==='ground'?18:kind==='asphalt'?12:5);t.anisotropy=4;return t;
}
const groundTex=texture('ground'),asphaltTex=texture('asphalt'),wallTex=texture('wall'),brickTex=texture('brick');

function terrainZ(lon,lat){
  const t=data?.terrain;if(!t?.heights_m?.length)return 0;
  const fx=(lon-data.bbox.west)/(data.bbox.east-data.bbox.west)*(t.width-1);
  const fy=(data.bbox.north-lat)/(data.bbox.north-data.bbox.south)*(t.height-1);
  const x0=Math.max(0,Math.min(t.width-1,Math.floor(fx))),x1=Math.max(0,Math.min(t.width-1,x0+1)),y0=Math.max(0,Math.min(t.height-1,Math.floor(fy))),y1=Math.max(0,Math.min(t.height-1,y0+1));
  const tx=Math.max(0,Math.min(1,fx-x0)),ty=Math.max(0,Math.min(1,fy-y0)),v=t.heights_m;
  const a=v[y0*t.width+x0],b=v[y0*t.width+x1],c=v[y1*t.width+x0],d=v[y1*t.width+x1];
  return ((a*(1-tx)+b*tx)*(1-ty)+(c*(1-tx)+d*tx)*ty)-baseElevation;
}
function buildTerrain(){
  const t=data.terrain;if(!t?.heights_m?.length)return;
  const center=Math.floor(t.height/2)*t.width+Math.floor(t.width/2);baseElevation=Number(t.heights_m[center]||0);
  const pos=[],uv=[],idx=[];
  for(let y=0;y<t.height;y++)for(let x=0;x<t.width;x++){
    const lon=data.bbox.west+(data.bbox.east-data.bbox.west)*x/(t.width-1),lat=data.bbox.north-(data.bbox.north-data.bbox.south)*y/(t.height-1),p=project([lon,lat]);
    pos.push(p.x,p.y,Number(t.heights_m[y*t.width+x])-baseElevation);uv.push(x/(t.width-1),1-y/(t.height-1));
  }
  for(let y=0;y<t.height-1;y++)for(let x=0;x<t.width-1;x++){const a=y*t.width+x,b=a+1,c=a+t.width,d=c+1;idx.push(a,c,b,b,c,d)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const m=new THREE.MeshStandardMaterial({map:groundTex,color:0x899077,roughness:1,metalness:0});
  terrainLayer=new THREE.Mesh(g,m);terrainLayer.receiveShadow=true;scene.add(terrainLayer);
}
function facadeKey(row){
  const f=String(row.facade_material||'').toLowerCase();if(f.includes('brick'))return'brick';if(/glass/.test(f))return'glass';if(/wood|timber/.test(f))return'wood';if(/metal|steel/.test(f))return'metal';return'concrete';
}
const buildingMaterials={
  brick:new THREE.MeshStandardMaterial({map:brickTex,color:0xb8a79e,roughness:.92}),
  concrete:new THREE.MeshStandardMaterial({map:wallTex,color:0xa6aaa7,roughness:.9}),
  glass:new THREE.MeshStandardMaterial({color:0x58747b,roughness:.24,metalness:.15,transparent:true,opacity:.9}),
  wood:new THREE.MeshStandardMaterial({map:wallTex,color:0x8b745e,roughness:.92}),
  metal:new THREE.MeshStandardMaterial({color:0x8b9496,roughness:.48,metalness:.35})
};
function buildBuildings(){
  buildingLayer=new THREE.Group();buildingLayer.name='real-buildings';scene.add(buildingLayer);
  const buckets={brick:[],concrete:[],glass:[],wood:[],metal:[]};let proxies=0,sourceH=0;
  for(const row of data.buildings||[])for(const r of outerRings(row.geometry)){
    const shape=shapeFromRing(r);if(!shape)continue;const ht=heightFor(row);ht.proxy?proxies++:sourceH++;
    const geo=new THREE.ExtrudeGeometry(shape,{depth:ht.h,bevelEnabled:false,steps:1});const c=centerRing(r);geo.translate(0,0,terrainZ(c[0],c[1])+.25);geo.computeVertexNormals();buckets[facadeKey(row)].push(geo);
  }
  for(const [k,geos] of Object.entries(buckets)){if(!geos.length)continue;const merged=mergeGeometries(geos,false);const mesh=new THREE.Mesh(merged,buildingMaterials[k]);mesh.castShadow=true;mesh.receiveShadow=true;buildingLayer.add(mesh);for(const g of geos)g.dispose()}
  loadText.textContent='World geometry loaded · '+sourceH.toLocaleString()+' source-height buildings · '+proxies.toLocaleString()+' visual-height proxies';
}
function buildParts(){
  partsLayer=new THREE.Group();partsLayer.name='building-parts';scene.add(partsLayer);const geos=[];
  for(const row of data.building_parts||[])for(const r of outerRings(row.geometry)){const shape=shapeFromRing(r);if(!shape)continue;const top=Math.max(Number(row.height_m)||4,2),min=Math.max(Number(row.min_height_m)||0,0),geo=new THREE.ExtrudeGeometry(shape,{depth:Math.max(1,top-min),bevelEnabled:false,steps:1}),c=centerRing(r);geo.translate(0,0,terrainZ(c[0],c[1])+min+.35);geos.push(geo)}
  if(geos.length){const g=mergeGeometries(geos,false),m=new THREE.MeshStandardMaterial({color:0x596b6c,roughness:.67,metalness:.08});const mesh=new THREE.Mesh(g,m);mesh.castShadow=true;partsLayer.add(mesh);for(const x of geos)x.dispose()}
}
function buildParcels(){
  const pos=[];for(const row of data.parcels||[])for(const ring of allLines(row.geometry)){for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],pa=project(a),pb=project(b);pos.push(pa.x,pa.y,terrainZ(a[0],a[1])+.48,pb.x,pb.y,terrainZ(b[0],b[1])+.48)}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));parcelLayer=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x52f5bd,transparent:true,opacity:.53,depthWrite:false}));scene.add(parcelLayer);
}
function lineFeatures(g){if(g?.type==='LineString')return[g.coordinates||[]];if(g?.type==='MultiLineString')return g.coordinates||[];if(g?.type==='Polygon')return g.coordinates||[];if(g?.type==='MultiPolygon')return(g.coordinates||[]).flat();return[]}
function buildStrips(features,kind){
  const pos=[],idx=[];let vi=0;
  for(const f of features||[])for(const line of lineFeatures(f.geometry)){const width=f.kind==='ROAD_PRIMARY'?18:f.kind==='ROAD_SECONDARY'?12:f.kind==='ROAD_LOCAL'?7:f.kind==='RAIL'?4:6;for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],pa=project(a),pb=project(b),dx=pb.x-pa.x,dy=pb.y-pa.y,len=Math.hypot(dx,dy);if(len<.2)continue;const nx=-dy/len*width/2,ny=dx/len*width/2,za=terrainZ(a[0],a[1])+.22,zb=terrainZ(b[0],b[1])+.22;pos.push(pa.x+nx,pa.y+ny,za,pa.x-nx,pa.y-ny,za,pb.x+nx,pb.y+ny,zb,pb.x-nx,pb.y-ny,zb);idx.push(vi,vi+1,vi+2,vi+2,vi+1,vi+3);vi+=4}}
  }
  if(!pos.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function buildRoads(){
  const roads=(data.transport||[]).filter(x=>x.kind!=='RAIL'),rails=(data.transport||[]).filter(x=>x.kind==='RAIL');roadLayer=new THREE.Group();scene.add(roadLayer);
  const rg=buildStrips(roads,'road');if(rg){const m=new THREE.MeshStandardMaterial({map:asphaltTex,color:0x858889,roughness:.98});const mesh=new THREE.Mesh(rg,m);mesh.receiveShadow=true;roadLayer.add(mesh)}
  const rail=buildStrips(rails,'rail');if(rail){roadLayer.add(new THREE.Mesh(rail,new THREE.MeshStandardMaterial({color:0x504c48,roughness:.85,metalness:.18})))}
}
function buildWater(){
  if(!(data.water||[]).length)return;const geos=[];for(const f of data.water)for(const r of outerRings(f.geometry)){const s=shapeFromRing(r);if(!s)continue;const g=new THREE.ShapeGeometry(s),c=centerRing(r);g.translate(0,0,terrainZ(c[0],c[1])+.3);geos.push(g)}
  if(geos.length){const g=mergeGeometries(geos,false),m=new THREE.MeshPhysicalMaterial({color:0x245d70,roughness:.2,metalness:.05,transparent:true,opacity:.78});scene.add(new THREE.Mesh(g,m));for(const x of geos)x.dispose()}
}
function collectRoadAnchors(){const a=[];for(const f of data.transport||[])if(f.kind!=='RAIL')for(const line of lineFeatures(f.geometry)){for(let i=1;i<line.length;i+=Math.max(1,Math.floor(line.length/5))){const p=line[i];if(p)a.push(p)}}return a}
function buildGameArt(){
  artLayer=new THREE.Group();artLayer.name='decorative-game-art';scene.add(artLayer);const anchors=collectRoadAnchors(),rand=seeded(0xB16B00B5);
  const grassGeo=new THREE.ConeGeometry(.28,1.8,4),grassMat=new THREE.MeshStandardMaterial({color:0x6c7143,roughness:1});const grass=new THREE.InstancedMesh(grassGeo,grassMat,320);const dummy=new THREE.Object3D();
  for(let i=0;i<320;i++){const lon=data.bbox.west+rand()*(data.bbox.east-data.bbox.west),lat=data.bbox.south+rand()*(data.bbox.north-data.bbox.south),p=project([lon,lat]);dummy.position.set(p.x,p.y,terrainZ(lon,lat)+.8);dummy.rotation.set(Math.PI/2*(rand()-.5),0,rand()*Math.PI*2);dummy.scale.set(.5+rand(),.5+rand(),.5+rand());dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix)}grass.instanceMatrix.needsUpdate=true;artLayer.add(grass);
  const crateGeo=new THREE.BoxGeometry(1.7,1.7,1.35),crateMat=new THREE.MeshStandardMaterial({color:0x5c4933,roughness:.95});const crates=new THREE.InstancedMesh(crateGeo,crateMat,28);
  const barrelGeo=new THREE.CylinderGeometry(.45,.45,1.2,12),barrelMat=new THREE.MeshStandardMaterial({color:0x68412f,roughness:.72,metalness:.18});const barrels=new THREE.InstancedMesh(barrelGeo,barrelMat,22);
  for(let i=0;i<28;i++){const p=anchors[Math.floor(rand()*anchors.length)]||[lon0,lat0],q=project(p);dummy.position.set(q.x+(rand()-.5)*14,q.y+(rand()-.5)*14,terrainZ(p[0],p[1])+.8);dummy.rotation.set(0,0,rand()*Math.PI);dummy.scale.setScalar(.75+rand()*.5);dummy.updateMatrix();crates.setMatrixAt(i,dummy.matrix)}
  for(let i=0;i<22;i++){const p=anchors[Math.floor(rand()*anchors.length)]||[lon0,lat0],q=project(p);dummy.position.set(q.x+(rand()-.5)*10,q.y+(rand()-.5)*10,terrainZ(p[0],p[1])+.65);dummy.rotation.set(Math.PI/2,0,rand()*Math.PI);dummy.scale.setScalar(.8+rand()*.35);dummy.updateMatrix();barrels.setMatrixAt(i,dummy.matrix)}
  crates.instanceMatrix.needsUpdate=true;barrels.instanceMatrix.needsUpdate=true;crates.castShadow=barrels.castShadow=true;artLayer.add(crates,barrels);
  const barricadeMat=new THREE.MeshStandardMaterial({color:0x6e6857,roughness:.92});for(let i=0;i<12;i++){const p=anchors[Math.floor(rand()*anchors.length)]||[lon0,lat0],q=project(p),m=new THREE.Mesh(new THREE.BoxGeometry(5,.45,1.15),barricadeMat);m.position.set(q.x+(rand()-.5)*8,q.y+(rand()-.5)*8,terrainZ(p[0],p[1])+.6);m.rotation.z=rand()*Math.PI;m.castShadow=true;artLayer.add(m)}
}
function addLights(){
  hemi=new THREE.HemisphereLight(0xd5ecf0,0x283021,1.35);scene.add(hemi);sun=new THREE.DirectionalLight(0xfff1cf,3.1);sun.position.set(-1400,-1000,2200);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-2500;sun.shadow.camera.right=2500;sun.shadow.camera.top=2500;sun.shadow.camera.bottom=-2500;sun.shadow.camera.far=6500;scene.add(sun);
}
function setLighting(mode){
  lightMode=mode%3;const b=$('lightBtn'),modes=[['☀','Day'],['◐','Dusk'],['☾','Night']],v=modes[lightMode];b.innerHTML=v[0]+' <span>'+v[1]+'</span>';
  if(lightMode===0){scene.background.set(0x77838a);scene.fog.color.set(0x79858a);hemi.intensity=1.35;sun.intensity=3.1;sun.color.set(0xfff1cf);renderer.toneMappingExposure=1.05}
  if(lightMode===1){scene.background.set(0x473e45);scene.fog.color.set(0x51474b);hemi.intensity=.75;sun.intensity=2.5;sun.color.set(0xff9d63);renderer.toneMappingExposure=.9}
  if(lightMode===2){scene.background.set(0x07111c);scene.fog.color.set(0x0a1520);hemi.intensity=.33;sun.intensity=.48;sun.color.set(0x95b8ff);renderer.toneMappingExposure=.72}
}
function view(which){
  if(which==='street'){camera.position.set(160,-260,115);controls.target.set(20,20,18);controls.maxPolarAngle=Math.PI*.48}
  else{camera.position.set(1050,-1350,1250);controls.target.set(0,0,40);controls.maxPolarAngle=Math.PI*.49}controls.update();
}
async function boot(){
  try{
    const r=await fetch(ENDPOINT,{headers:{accept:'application/json'},cache:'no-store'});if(!r.ok)throw new Error('Horizon scene endpoint returned '+r.status);data=await r.json();if(!data?.complete)throw new Error(data?.error||'Horizon scene incomplete');
    lon0=Number(data.center.lon);lat0=Number(data.center.lat);mx=111320*Math.cos(lat0*Math.PI/180);my=110540;
    buildTerrain();buildRoads();buildWater();buildParcels();buildBuildings();buildParts();buildGameArt();addLights();setLighting(0);view('overview');
    $('statBuildings').textContent=Number(data.counts?.buildings||0).toLocaleString();$('statParts').textContent=Number(data.counts?.building_parts||0).toLocaleString();$('statParcels').textContent=Number(data.counts?.parcels||0).toLocaleString();$('statRoads').textContent=Number(data.transport?.length||0).toLocaleString();
    $('attribution').innerHTML=(data.attribution||[]).map(x=>'• '+x).join('<br>')+'<br>• Survival dressing is BridgePoint Horizon game art.';
    document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
    $('lightBtn').onclick=()=>setLighting(lightMode+1);$('parcelBtn').onclick=()=>{parcelLayer.visible=!parcelLayer.visible;$('parcelBtn').classList.toggle('active',parcelLayer.visible)};$('partsBtn').onclick=()=>{partsLayer.visible=!partsLayer.visible;$('partsBtn').classList.toggle('active',partsLayer.visible)};$('artBtn').onclick=()=>{artLayer.visible=!artLayer.visible;$('artBtn').classList.toggle('active',artLayer.visible)};
    addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
  }catch(e){console.error(e);$('error').hidden=false;$('errorText').textContent=String(e?.message||e);loadText.textContent='Preview unavailable';}
}
function loop(){controls.update();renderer.render(scene,camera);requestAnimationFrame(loop)}loop();boot();
