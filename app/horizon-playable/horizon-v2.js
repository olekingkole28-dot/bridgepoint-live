import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import {clone as skeletonClone} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js';
import {makeHorizonRifle,makeHorizonWeapon,avatarModelForKey,avatarVariantForKey} from '/app/horizon/cosmetics-v4320.js';
const SUPABASE_URL='https://xdfsjztwgsbmabshzsjw.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const ENDPOINT=SUPABASE_URL+'/functions/v1/bridgepoint-horizon-stream-v3020';
const $=id=>document.getElementById(id),root=$('world'),loadText=$('loadText'),errorBox=$('error'),errorText=$('errorText');
const p=new URLSearchParams(location.search);
const lat=Number(p.get('lat')||41.5623),lon=Number(p.get('lon')||-72.6506);
const span=Math.max(.75,Math.min(5,Number(p.get('span_km')||1.25)));
const stateCode=(p.get('state')||'CT').toUpperCase();
const mode=(p.get('mode')||'TDM').toUpperCase();
const matchId=p.get('match')||'';
const matchSeed=p.get('seed')||'4313';
const activeMatch=(()=>{try{return JSON.parse(localStorage.getItem('horizon-active-match')||'null')}catch{return null}})();
const playerId=localStorage.getItem('horizon-player-id')||'';
const playerSecret=localStorage.getItem('horizon-player-secret')||'';
const savedProfile=(()=>{try{return JSON.parse(localStorage.getItem('horizon-player-profile')||'null')}catch{return null}})();
const MOBILE=/Android|iPhone|iPad/i.test(navigator.userAgent);
const DEVICE_MEM=Number(navigator.deviceMemory||0),DEVICE_CORES=Number(navigator.hardwareConcurrency||0);
const HIGH_DEVICE=!MOBILE||(DEVICE_MEM>=8&&DEVICE_CORES>=8);
let renderScale=Math.min(devicePixelRatio||1,HIGH_DEVICE?1.25:(MOBILE?.88:1.05));
const scene=new THREE.Scene();scene.background=new THREE.Color(0x737e70);scene.fog=new THREE.FogExp2(0x70796c,.00072);
const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.08,2800);camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:HIGH_DEVICE,powerPreference:'high-performance',stencil:false,depth:true});
renderer.setPixelRatio(renderScale);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
renderer.shadowMap.enabled=HIGH_DEVICE;renderer.shadowMap.type=THREE.PCFSoftShadowMap;root.appendChild(renderer.domElement);
const world=new THREE.Group();scene.add(world);const interiorGroup=new THREE.Group();interiorGroup.visible=false;scene.add(interiorGroup);
const hemi=new THREE.HemisphereLight(0xcad5c1,0x263126,1.5);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffd69a,2.0);sun.position.set(-180,-110,240);sun.castShadow=HIGH_DEVICE;sun.shadow.mapSize.set(MOBILE?512:1024,MOBILE?512:1024);scene.add(sun);
const player=new THREE.Group();scene.add(player);player.position.set(0,0,0);
let data=null,centerLon=lon,centerLat=lat,yaw=0,pitch=-.08,moveX=0,moveY=0,touchMoveX=0,touchMoveY=0,keyMoveX=0,keyMoveY=0,sprint=false,aiming=false,shooting=false,last=performance.now(),frames=0,fpsT=performance.now(),lootCount=0,health=100,flash=false,storm=false,dayPhase=.62;
let terrainInfo=null,perfLowStreak=0,perfHighStreak=0,lastMeasuredFps=60;
let liveWeather={feed:false,event:null,distance_km:null,last_at:null},rainFx=null;
const WORLD_COUNTS={buildings:0,buildingParts:0,parcels:0,roads:0,water:0};
const DETAIL_BUILDING_LIMIT=MOBILE?(HIGH_DEVICE?115:58):220;
const BUILDING_LIMIT=MOBILE?(HIGH_DEVICE?650:480):900;
const PART_LIMIT=MOBILE?(HIGH_DEVICE?420:260):700;
const PARCEL_LIMIT=MOBILE?(HIGH_DEVICE?1250:850):1800;
let ammoMag=30,ammoReserve=120,reloading=false,dead=false,buildCount=0,pickupTarget=null,pickupStarted=0,lastFireAt=0,weaponRig=null,fpWeaponRig=null,muzzleFlash=null;
let cameraMode=localStorage.getItem('horizon-camera-mode')||'third',crouched=false,verticalVelocity=0,airborne=false,interiorMode=false,activeInterior=null,rooftopState=null;
let activeZipline=null,activeVehicle=null,audioCtx=null,lastFootstepAt=0,contextTarget=null;
const buildingEntries=[],ziplines=[],vehicles=[],ambientFx=[],interiorRects=[];const exteriorReturn=new THREE.Vector3();let exteriorYaw=0;
const WEAPONS=[
  {key:'rifle',name:'AR-12',kind:'rifle',mag:30,reserve:120,damage:42,head:100,interval:92,range:145,spread:.006},
  {key:'smg',name:'Viper SMG',kind:'smg',mag:36,reserve:180,damage:28,head:70,interval:70,range:92,spread:.012},
  {key:'shotgun',name:'Breach-8',kind:'shotgun',mag:8,reserve:40,damage:96,head:120,interval:680,range:34,spread:.055},
  {key:'pistol',name:'Rook Pistol',kind:'pistol',mag:12,reserve:72,damage:48,head:96,interval:260,range:72,spread:.01},
  {key:'axe',name:'Field Axe',kind:'melee',mag:0,reserve:0,damage:82,head:82,interval:520,range:2.6,spread:0}
];
const weaponState=Object.fromEntries(WEAPONS.map(w=>[w.key,{mag:w.mag,reserve:w.reserve,owned:true}]));
let activeWeaponIndex=0;
const interactables=[],infected=[],combatants=[],roadAnchors=[],buildingCenters=[],solidRects=[],solidPolys=[],lootPickups=[],builtCover=[];
const COLLISION_CELL=32,collisionGrid=new Map();
const activeMembers=Array.isArray(activeMatch?.members)?activeMatch.members:[];
const playerTeam=Number(activeMembers.find(m=>m.player_id===playerId)?.team_no||1);
const gltfLoader=new GLTFLoader(),assetCache=new Map(),killSnapshots=[];
const CHAR_MODELS={
  free_01:'/app/horizon-playable/assets/characters/mesh2motion/models/female_31.glb',
  free_02:'/app/horizon-playable/assets/characters/mesh2motion/models/female_31.glb',
  free_03:'/app/horizon-playable/assets/characters/mesh2motion/models/male_32.glb',
  free_04:'/app/horizon-playable/assets/characters/mesh2motion/models/male_32.glb',
  free_05:'/app/horizon-playable/assets/characters/mesh2motion/models/police_male.glb',
  free_06:'/app/horizon-playable/assets/characters/mesh2motion/models/police_male.glb',
  free_07:'/app/horizon-playable/assets/characters/mesh2motion/models/swat_male.glb',
  free_08:'/app/horizon-playable/assets/characters/mesh2motion/models/swat_male.glb',
  free_09:'/app/horizon-playable/assets/characters/mesh2motion/models/hazmat_suit_male.glb',
  free_10:'/app/horizon-playable/assets/characters/mesh2motion/models/hazmat_suit_male.glb'
};const rand=(s=>()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296))(913733);const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
async function rpc(name,params={}){
  if(!playerId||!playerSecret)throw new Error('HORIZON_PLAYER_IDENTITY_MISSING');
  const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:PUBLISHABLE_KEY,'content-type':'application/json','accept':'application/json'},body:JSON.stringify(params)});
  const t=await r.text();if(!r.ok){let m=t;try{m=JSON.parse(t)?.message||t}catch{}throw new Error(m)}return t?JSON.parse(t):null;
}
function loadAsset(url){
  if(!assetCache.has(url))assetCache.set(url,new Promise((resolve,reject)=>gltfLoader.load(url,resolve,undefined,reject)));
  return assetCache.get(url);
}
function prepHumanoid(root,{infectedTint=false,variant=1}={}){
  root.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;
    const mats=(Array.isArray(o.material)?o.material:[o.material]).filter(Boolean);
    if(mats.length){
      const out=mats.map(m=>{const n=m.clone();if(n.color){if(infectedTint)n.color.multiply(new THREE.Color(.42,.55,.38));else if(variant===2)n.color.multiply(new THREE.Color(.74,.78,.96))}n.roughness=Math.min(1,(n.roughness??.72)+.05);return n});
      o.material=out.length===1?out[0]:out;
    }
  });
}
function orientHumanoid(root,targetHeight=1.8){
  const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
  const h=Math.max(size.y,size.z,.01),scale=targetHeight/h;
  root.scale.multiplyScalar(scale);
  root.rotation.x=Math.PI/2;
  const b2=new THREE.Box3().setFromObject(root),min=b2.min;
  root.position.z-=min.z;
}
function makeNameSprite(name,color='#ffffff'){
  const c=document.createElement('canvas');c.width=512;c.height=96;
  const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.font='900 38px system-ui';x.textAlign='center';x.textBaseline='middle';x.strokeStyle='rgba(0,0,0,.88)';x.lineWidth=9;x.strokeText(name,256,48);x.fillStyle=color;x.fillText(name,256,48);
  const tex=new THREE.CanvasTexture(c),mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}),s=new THREE.Sprite(mat);s.scale.set(2.5,.47,1);s.position.z=2.45;s.renderOrder=20;return s;
}
function circleVsRect(x,y,r,o){
  const nx=Math.max(o.minx,Math.min(x,o.maxx)),ny=Math.max(o.miny,Math.min(y,o.maxy));
  return (x-nx)*(x-nx)+(y-ny)*(y-ny)<r*r;
}
function pointInPoly(x,y,pts){
  let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+1e-12)+xi))inside=!inside;
  }return inside;
}
function segDistSq(px,py,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy||1;
  const t=Math.max(0,Math.min(1,((px-a.x)*dx+(py-a.y)*dy)/l)),x=a.x+t*dx,y=a.y+t*dy;
  return (px-x)*(px-x)+(py-y)*(py-y);
}
function circleVsPoly(x,y,r,o){
  if(x+r<o.minx||x-r>o.maxx||y+r<o.miny||y-r>o.maxy)return false;
  if(pointInPoly(x,y,o.pts))return true;
  const rr=r*r;for(let i=0,j=o.pts.length-1;i<o.pts.length;j=i++)if(segDistSq(x,y,o.pts[j],o.pts[i])<rr)return true;
  return false;
}
function collisionKey(ix,iy){return ix+':'+iy}
function registerSolidPoly(pts){
  if(!pts?.length)return;
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),o={pts,minx:Math.min(...xs),maxx:Math.max(...xs),miny:Math.min(...ys),maxy:Math.max(...ys),index:solidPolys.length};
  solidPolys.push(o);
  const ax=Math.floor(o.minx/COLLISION_CELL),bx=Math.floor(o.maxx/COLLISION_CELL),ay=Math.floor(o.miny/COLLISION_CELL),by=Math.floor(o.maxy/COLLISION_CELL);
  for(let ix=ax;ix<=bx;ix++)for(let iy=ay;iy<=by;iy++){const k=collisionKey(ix,iy),arr=collisionGrid.get(k)||[];arr.push(o);collisionGrid.set(k,arr)}
}
function blocked(x,y,r=.36){
  if(interiorMode)return interiorRects.some(o=>circleVsRect(x,y,r,o));
  if(rooftopState){
    const e=rooftopState.entry;
    if(e&&x>e.cx-e.w*.48&&x<e.cx+e.w*.48&&y>e.cy-e.d*.48&&y<e.cy+e.d*.48)return false;
  }
  if(solidRects.some(o=>circleVsRect(x,y,r,o)))return true;
  const ix=Math.floor(x/COLLISION_CELL),iy=Math.floor(y/COLLISION_CELL),seen=new Set();
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const o of collisionGrid.get(collisionKey(ix+dx,iy+dy))||[]){
    if(seen.has(o.index))continue;seen.add(o.index);if(circleVsPoly(x,y,r,o))return true;
  }
  return false;
}
function addKillFeed(killer,victim,weapon='AR-12',headshot=false){
  const feed=$('killFeed');if(!feed)return;
  const row=document.createElement('div');row.className='killRow'+(headshot?' headshot':'');
  row.innerHTML='<b>'+String(killer||'UNKNOWN')+'</b><span class="weapon">'+String(weapon||'')+'</span><b>'+String(victim||'UNKNOWN')+'</b>';
  feed.prepend(row);while(feed.children.length>6)feed.lastElementChild.remove();setTimeout(()=>row.remove(),6500);
}
function activeWeapon(){return WEAPONS[activeWeaponIndex]||WEAPONS[0]}
function renderWeaponBar(){
  const bar=$('weaponBar');if(!bar)return;
  bar.innerHTML=WEAPONS.map((w,i)=>{
    const st=weaponState[w.key],ammo=w.mag?st.mag+'/'+st.reserve:'MELEE';
    return '<button class="weaponSlot '+(i===activeWeaponIndex?'active ':'')+(st?.owned?'':'empty')+'" data-w="'+i+'"><b>'+w.name+'</b>'+ammo+'</button>';
  }).join('');
  bar.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>equipWeaponIndex(Number(b.dataset.w)));
}
function refreshWeaponRig(){
  const w=activeWeapon(),wrap=savedProfile?.wrap_key||'wrap_ash';
  if(weaponRig){player.remove(weaponRig);weaponRig=null}
  if(fpWeaponRig){camera.remove(fpWeaponRig);fpWeaponRig=null}
  weaponRig=makeHorizonWeapon(THREE,w.kind,wrap);weaponRig.scale.setScalar(w.kind==='melee'?.32:.28);weaponRig.rotation.set(.04,-.18,w.kind==='melee'?-.15:-Math.PI/2);weaponRig.position.set(.38,.08,1.28);player.add(weaponRig);
  fpWeaponRig=makeHorizonWeapon(THREE,w.kind,wrap);fpWeaponRig.scale.setScalar(w.kind==='melee'?.24:.19);fpWeaponRig.rotation.set(.02,-.08,w.kind==='melee'?-.2:-Math.PI/2);fpWeaponRig.position.set(.29,-.42,-.24);camera.add(fpWeaponRig);
  fpWeaponRig.visible=cameraMode==='first';
}
function equipWeaponIndex(i){
  i=(i+WEAPONS.length)%WEAPONS.length;if(!weaponState[WEAPONS[i].key]?.owned)return;
  activeWeaponIndex=i;reloading=false;refreshWeaponRig();updateAmmo();renderWeaponBar();toast(activeWeapon().name);
}
function cycleWeapon(){for(let n=1;n<=WEAPONS.length;n++){const i=(activeWeaponIndex+n)%WEAPONS.length;if(weaponState[WEAPONS[i].key]?.owned){equipWeaponIndex(i);return}}}
function dropActiveWeapon(){
  const w=activeWeapon();if(w.key==='axe'){toast('Keep one melee backup');return}
  weaponState[w.key].owned=false;toast('Dropped '+w.name);
  cycleWeapon();renderWeaponBar();
}
function updateAmmo(){
  const w=activeWeapon(),st=weaponState[w.key],el=$('ammo');
  ammoMag=st?.mag??0;ammoReserve=st?.reserve??0;
  if(el){el.textContent=w.mag?(ammoMag+'/'+ammoReserve):'MELEE';el.classList.toggle('ammoLow',w.mag>0&&ammoMag<=Math.max(2,Math.floor(w.mag*.2)))}
  renderWeaponBar();
}
function ensureAudio(){
  try{
    if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
  }catch{}
}
function tone(freq=140,dur=.05,gain=.035,type='square'){
  ensureAudio();if(!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);
  o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);
}
function gunAudio(w){tone(w.kind==='shotgun'?62:w.kind==='pistol'?155:w.kind==='smg'?115:88,w.kind==='shotgun'?.12:.055,w.kind==='shotgun'?.09:.04,'sawtooth')}
function footstepAudio(){
  const now=performance.now(),gap=sprint?250:crouched?560:390;if(now-lastFootstepAt<gap)return;lastFootstepAt=now;tone(58,.025,.013,'triangle');
}
function cycleCameraMode(){
  cameraMode=cameraMode==='third'?'first':'third';localStorage.setItem('horizon-camera-mode',cameraMode);
  if(fpWeaponRig)fpWeaponRig.visible=cameraMode==='first';if(weaponRig)weaponRig.visible=cameraMode!=='first';
  $('viewBtn')?.classList.toggle('active',cameraMode==='first');toast(cameraMode==='first'?'FIRST PERSON':'THIRD PERSON');
}
function toggleCrouch(){crouched=!crouched;$('crouchBtn')?.classList.toggle('active',crouched);toast(crouched?'CROUCH':'STAND')}
function jumpOrVault(){
  if(dead||activeZipline||activeVehicle)return;
  const f=new THREE.Vector2(-Math.sin(yaw),Math.cos(yaw)),near=.65,far=1.55;
  const bx=player.position.x+f.x*near,by=player.position.y+f.y*near,fx=player.position.x+f.x*far,fy=player.position.y+f.y*far;
  if(blocked(bx,by,.3)&&!blocked(fx,fy,.3)){player.position.x=fx;player.position.y=fy;verticalVelocity=3.1;airborne=true;toast('VAULT');return}
  if(!airborne){verticalVelocity=5.2;airborne=true;tone(90,.04,.018,'triangle')}
}
function pollGamepad(){
  const pads=navigator.getGamepads?.()||[],p=[...pads].find(Boolean);if(!p)return;
  const dz=.14,deadzone=v=>Math.abs(v)<=dz?0:Math.sign(v)*(Math.abs(v)-dz)/(1-dz);
  const lx=deadzone(p.axes?.[0]||0),ly=deadzone(p.axes?.[1]||0),rx=deadzone(p.axes?.[2]||0),ry=deadzone(p.axes?.[3]||0);
  if(Math.abs(lx)>Math.abs(touchMoveX))moveX=lx;if(Math.abs(ly)>Math.abs(touchMoveY))moveY=-ly;
  yaw-=rx*.045;pitch=Math.max(-.42,Math.min(.32,pitch-ry*.03));
  const edge=(i)=>p.buttons?.[i]?.pressed&&!pollGamepad.prev?.[i];
  if(edge(0))jumpOrVault();if(edge(1))toggleCrouch();if(edge(3))cycleWeapon();if(edge(2))reload();
  if(edge(8))cycleCameraMode();sprint=!!p.buttons?.[10]?.pressed;aiming=!!p.buttons?.[6]?.pressed;
  if(p.buttons?.[7]?.pressed)shootOnce();
  pollGamepad.prev=(p.buttons||[]).map(b=>!!b.pressed);
}
function renderMinimap(){
  const cv=$('miniMap');if(!cv||!data)return;const g=cv.getContext('2d'),w=cv.width,h=cv.height,scale=2.4;
  g.clearRect(0,0,w,h);g.fillStyle='rgba(3,10,11,.92)';g.fillRect(0,0,w,h);
  const ox=w/2-player.position.x/scale,oy=h/2+player.position.y/scale;
  const drawLines=(rows,color,width=1)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();for(const row of rows||[])for(const line of lines(row.geometry)){for(let i=0;i<line.length;i++){const p=project(line[i]),x=ox+p.x/scale,y=oy-p.y/scale;if(i===0)g.moveTo(x,y);else g.lineTo(x,y)}}g.stroke()};
  drawLines(data.transport,'rgba(95,226,255,.48)',1.2);
  g.strokeStyle='rgba(65,245,255,.24)';g.lineWidth=.8;for(const row of (data.parcels||[]).slice(0,350))for(const ring of rings(row.geometry)){g.beginPath();ring.forEach((q,i)=>{const p=project(q),x=ox+p.x/scale,y=oy-p.y/scale;i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke()}
  const mark=(x,y,color,r=3)=>{g.fillStyle=color;g.beginPath();g.arc(ox+x/scale,oy-y/scale,r,0,Math.PI*2);g.fill()};
  if(mode==='TDM')combatants.filter(q=>q.alive).forEach(q=>mark(q.g.position.x,q.g.position.y,q.friendly?'#64ffd4':'#ff7868',2.5));
  else infected.filter(q=>q.alive&&Math.hypot(q.g.position.x-player.position.x,q.g.position.y-player.position.y)<70).forEach(q=>mark(q.g.position.x,q.g.position.y,'#ff7868',2));
  g.save();g.translate(w/2,h/2);g.rotate(-yaw);g.fillStyle='#ffffff';g.beginPath();g.moveTo(0,-8);g.lineTo(6,7);g.lineTo(-6,7);g.closePath();g.fill();g.restore();
}
function snapshotKillcam(now=performance.now()){
  killSnapshots.push({
    t:now,camera:camera.position.toArray(),player:player.position.toArray(),yaw,pitch,
    infected:infected.map(z=>z.alive?z.g.position.toArray():null)
  });
  while(killSnapshots.length&&killSnapshots[0].t<now-12000)killSnapshots.shift();
}

function fail(e){errorBox.hidden=false;errorText.textContent=String(e?.message||e);loadText.textContent='V2 startup failed';console.error(e)}
function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1500)}
function project(c){return new THREE.Vector2((c[0]-centerLon)*111320*Math.cos(centerLat*Math.PI/180),(c[1]-centerLat)*110540)}
function rings(g){if(!g)return[];if(g.type==='Polygon')return[g.coordinates?.[0]||[]];if(g.type==='MultiPolygon')return(g.coordinates||[]).map(x=>x?.[0]||[]);return[]}
function lines(g){if(!g)return[];if(g.type==='LineString')return[g.coordinates||[]];if(g.type==='MultiLineString')return g.coordinates||[];return[]}
function mat(color,rough=.85,metal=.02){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
function addSky(){const sky=new THREE.Mesh(new THREE.SphereGeometry(2200,18,10),new THREE.MeshBasicMaterial({color:0x869184,side:THREE.BackSide}));scene.add(sky);const cm=new THREE.MeshStandardMaterial({color:0xa5a69e,transparent:true,opacity:.37,roughness:1});for(let i=0;i<20;i++){const c=new THREE.Mesh(new THREE.SphereGeometry(18+rand()*30,8,5),cm);c.scale.z=.18;c.position.set((rand()-.5)*900,(rand()-.5)*800,120+rand()*100);scene.add(c)}}
const textureLoader=new THREE.TextureLoader();
function repeatTexture(url,x=12,y=12){
  const t=textureLoader.load(url);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(x,y);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function repeatDataTexture(url,x=12,y=12){
  const t=textureLoader.load(url);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(x,y);return t;
}
const DIRT_MAP=repeatTexture('/app/horizon-playable/assets/pbr/polyhaven/dirt_diff_1k.jpg',18,18);
const DIRT_NORMAL=repeatDataTexture('/app/horizon-playable/assets/pbr/polyhaven/dirt_nor_gl_1k.jpg',18,18);
const DIRT_ROUGH=repeatDataTexture('/app/horizon-playable/assets/pbr/polyhaven/dirt_rough_1k.jpg',18,18);
const ASPHALT_MAP=repeatTexture('/app/horizon-playable/assets/pbr/polyhaven/asphalt_03_diff_1k.jpg',7,7);
const ASPHALT_NORMAL=repeatDataTexture('/app/horizon-playable/assets/pbr/polyhaven/asphalt_03_nor_gl_1k.jpg',7,7);
const ASPHALT_ROUGH=repeatDataTexture('/app/horizon-playable/assets/pbr/polyhaven/asphalt_03_rough_1k.jpg',7,7);
const CONCRETE_MAP=repeatTexture('/app/horizon-playable/assets/pbr/polyhaven/concrete_wall_005_diff_1k.jpg',5,5);
const CONCRETE_NORMAL=repeatDataTexture('/app/horizon-playable/assets/pbr/polyhaven/concrete_wall_005_nor_gl_1k.jpg',5,5);
const CONCRETE_ROUGH=repeatDataTexture('/app/horizon-playable/assets/pbr/polyhaven/concrete_wall_005_rough_1k.jpg',5,5);
const UNIT_BOX=new THREE.BoxGeometry(1,1,1),UNIT_PLANE=new THREE.PlaneGeometry(1,1);
const ROAD_MAT=new THREE.MeshStandardMaterial({map:ASPHALT_MAP,normalMap:ASPHALT_NORMAL,roughnessMap:ASPHALT_ROUGH,color:0x727979,roughness:.94,metalness:.02});
const SIDEWALK_MAT=new THREE.MeshStandardMaterial({map:CONCRETE_MAP,normalMap:CONCRETE_NORMAL,roughnessMap:CONCRETE_ROUGH,color:0x9a9fa0,roughness:.9,metalness:.02});
const BUILD_COLORS=[0x98a1a3,0x808b8e,0xb2b6b4,0x737d80,0x9b9690,0x879093];
const BUILD_MATS=BUILD_COLORS.map(color=>new THREE.MeshStandardMaterial({map:CONCRETE_MAP,normalMap:CONCRETE_NORMAL,roughnessMap:CONCRETE_ROUGH,color,roughness:.82,metalness:.025}));
const PART_MAT=new THREE.MeshStandardMaterial({color:0xc0cbcd,roughness:.76,metalness:.04,transparent:true,opacity:.88});
const PARCEL_MAT=new THREE.LineBasicMaterial({color:0x48ecff,transparent:true,opacity:.56,depthWrite:false,blending:THREE.AdditiveBlending});
const ROAD_CYAN=new THREE.LineBasicMaterial({color:0x6beeff,transparent:true,opacity:.82,depthWrite:false});
const ROAD_YELLOW=new THREE.LineBasicMaterial({color:0xffdf7a,transparent:true,opacity:.92,depthWrite:false});
const RAIL_MAT=new THREE.LineBasicMaterial({color:0xe9f9ff,transparent:true,opacity:.72,depthWrite:false});
const WATER_LINE_MAT=new THREE.LineBasicMaterial({color:0x4ebfff,transparent:true,opacity:.75,depthWrite:false});
const WATER_MAT=new THREE.MeshStandardMaterial({color:0x225f7b,roughness:.18,metalness:.08,transparent:true,opacity:.84});

function initTerrain(){
  const t=data?.terrain;
  if(!t||!Array.isArray(t.heights_m)||Number(t.width)<2||Number(t.height)<2)return terrainInfo=null;
  const hs=t.heights_m.map(Number);if(!hs.some(Number.isFinite))return terrainInfo=null;
  const clean=hs.filter(Number.isFinite),base=Math.min(...clean);
  const west=project([data.bbox.west,centerLat]).x,east=project([data.bbox.east,centerLat]).x;
  const south=project([centerLon,data.bbox.south]).y,north=project([centerLon,data.bbox.north]).y;
  terrainInfo={width:Number(t.width),height:Number(t.height),heights:hs,base,west,east,south,north,source:t.source||'USGS 3DEP'};
  return terrainInfo;
}
function terrainZ(x,y){
  const t=terrainInfo;if(!t)return 0;
  const fx=Math.max(0,Math.min(1,(x-t.west)/Math.max(.001,t.east-t.west)));
  const fy=Math.max(0,Math.min(1,(t.north-y)/Math.max(.001,t.north-t.south)));
  const gx=fx*(t.width-1),gy=fy*(t.height-1),x0=Math.floor(gx),y0=Math.floor(gy),x1=Math.min(t.width-1,x0+1),y1=Math.min(t.height-1,y0+1),tx=gx-x0,ty=gy-y0;
  const h=(ix,iy)=>Number.isFinite(t.heights[iy*t.width+ix])?t.heights[iy*t.width+ix]:t.base;
  const a=h(x0,y0)*(1-tx)+h(x1,y0)*tx,b=h(x0,y1)*(1-tx)+h(x1,y1)*tx;
  return Math.max(-12,Math.min(260,(a*(1-ty)+b*ty)-t.base));
}
function addGround(){
  initTerrain();
  const west=project([data.bbox.west,centerLat]).x,east=project([data.bbox.east,centerLat]).x,south=project([centerLon,data.bbox.south]).y,north=project([centerLon,data.bbox.north]).y;
  const sx=terrainInfo?terrainInfo.width-1:1,sy=terrainInfo?terrainInfo.height-1:1;
  const g=new THREE.PlaneGeometry(Math.max(60,east-west),Math.max(60,north-south),sx,sy);
  if(terrainInfo){
    const pos=g.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setZ(i,terrainZ(pos.getX(i),pos.getY(i)));
    pos.needsUpdate=true;g.computeVertexNormals();
  }
  const m=new THREE.MeshStandardMaterial({map:DIRT_MAP,normalMap:DIRT_NORMAL,roughnessMap:DIRT_ROUGH,color:0x7b8374,roughness:.98,metalness:0});
  const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;world.add(mesh);
}
function lineSegmentsFrom(points,material,zOffset=.08){
  if(points.length<2)return null;
  const a=[];for(let i=1;i<points.length;i++){const p0=points[i-1],p1=points[i];a.push(p0.x,p0.y,terrainZ(p0.x,p0.y)+zOffset,p1.x,p1.y,terrainZ(p1.x,p1.y)+zOffset)}
  if(!a.length)return null;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));
  const l=new THREE.LineSegments(g,material);l.frustumCulled=true;world.add(l);return l;
}
function roadStrip(a,b,w,material=ROAD_MAT,z=.025){
  const len=a.distanceTo(b);if(len<1)return;
  const m=new THREE.Mesh(UNIT_PLANE,material);m.position.set((a.x+b.x)/2,(a.y+b.y)/2,terrainZ((a.x+b.x)/2,(a.y+b.y)/2)+z);m.scale.set(w,len,1);m.rotation.z=Math.atan2(b.y-a.y,b.x-a.x)-Math.PI/2;m.receiveShadow=true;world.add(m);
}
function addRoads(){
  let n=0,surfaces=0;const cyan=[],yellow=[],rail=[];
  const surfaceLimit=MOBILE?(HIGH_DEVICE?780:520):1300;
  for(const row of data.transport||[]){
    const kind=String(row.kind||'ROAD_LOCAL').toUpperCase();
    for(const line of lines(row.geometry)){
      for(let i=1;i<line.length;i++){
        const a=project(line[i-1]),b=project(line[i]),len=a.distanceTo(b);if(len<2||len>900)continue;
        const primary=kind.includes('PRIMARY'),secondary=kind.includes('SECONDARY'),isRail=kind.includes('RAIL');
        const w=isRail?2.5:primary?10.5:secondary?8:5.5;
        if(!isRail&&surfaces<surfaceLimit){roadStrip(a,b,w,ROAD_MAT,.035);surfaces++;if((primary||secondary)&&!MOBILE){const ang=Math.atan2(b.y-a.y,b.x-a.x),nx=-Math.sin(ang),ny=Math.cos(ang);roadStrip(a.clone().add(new THREE.Vector2(nx*(w/2+.7),ny*(w/2+.7))),b.clone().add(new THREE.Vector2(nx*(w/2+.7),ny*(w/2+.7))),.9,SIDEWALK_MAT,.045);roadStrip(a.clone().add(new THREE.Vector2(-nx*(w/2+.7),-ny*(w/2+.7))),b.clone().add(new THREE.Vector2(-nx*(w/2+.7),-ny*(w/2+.7))),.9,SIDEWALK_MAT,.045)}}
        const target=isRail?rail:primary?yellow:cyan;target.push(a,b);
        if(len>20&&!isRail&&n%2===0)roadAnchors.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,a:Math.atan2(b.y-a.y,b.x-a.x),w});
        n++;
      }
    }
  }
  const build=(pts,matl)=>{if(!pts.length)return;const arr=[];for(let i=0;i<pts.length;i+=2){const a=pts[i],b=pts[i+1];arr.push(a.x,a.y,terrainZ(a.x,a.y)+.075,b.x,b.y,terrainZ(b.x,b.y)+.075)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));world.add(new THREE.LineSegments(g,matl))};
  build(cyan,ROAD_CYAN);build(yellow,ROAD_YELLOW);build(rail,RAIL_MAT);WORLD_COUNTS.roads=n;return n;
}
function addParcels(){
  const arr=[];let count=0;
  for(const row of (data.parcels||[]).slice(0,PARCEL_LIMIT)){
    for(const ring of rings(row.geometry)){if(ring.length<3)continue;const pts=ring.map(project);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];arr.push(a.x,a.y,terrainZ(a.x,a.y)+.11,b.x,b.y,terrainZ(b.x,b.y)+.11)}count++}
  }
  if(arr.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));const l=new THREE.LineSegments(g,PARCEL_MAT);l.renderOrder=4;world.add(l)}
  WORLD_COUNTS.parcels=count;return count;
}
function addWater(){
  let count=0;const linePts=[];
  for(const row of (data.water||[]).slice(0,MOBILE?220:500)){
    for(const line of lines(row.geometry)){const pts=line.map(project);for(let i=1;i<pts.length;i++)linePts.push(pts[i-1],pts[i]);count++}
    for(const ring of rings(row.geometry)){
      if(ring.length<4)continue;const pts=ring.map(project),shape=new THREE.Shape();shape.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)shape.lineTo(pts[i].x,pts[i].y);
      const g=new THREE.ShapeGeometry(shape),mesh=new THREE.Mesh(g,WATER_MAT);const cx=pts.reduce((s,p)=>s+p.x,0)/pts.length,cy=pts.reduce((s,p)=>s+p.y,0)/pts.length;mesh.position.z=terrainZ(cx,cy)+.055;mesh.renderOrder=2;world.add(mesh);count++;
    }
  }
  if(linePts.length){const arr=[];for(let i=0;i<linePts.length;i+=2){const a=linePts[i],b=linePts[i+1];arr.push(a.x,a.y,terrainZ(a.x,a.y)+.08,b.x,b.y,terrainZ(b.x,b.y)+.08)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));world.add(new THREE.LineSegments(g,WATER_LINE_MAT))}
  WORLD_COUNTS.water=count;return count;
}
function roofMaterial(row){
  const s=String(row?.roof_material||'').toLowerCase();
  if(/metal|steel|copper|tin/.test(s))return mat(0x67767d,.36,.55);
  if(/tile|clay|terracotta/.test(s))return mat(0x815949,.86,.03);
  if(/shingle|asphalt/.test(s))return mat(0x383d40,.92,.02);
  if(/membrane|rubber|tpo|epdm/.test(s))return mat(0x757a7d,.9,.02);
  return mat(0x4d5456,.88,.03);
}
function addBuildingDetails(cx,cy,w,d,h,id,row,baseZ){
  const roofShape=String(row?.roof_shape||'').toLowerCase(),roofH=Math.max(.18,Math.min(5,Number(row?.roof_height_m||0)||.22)),rmat=roofMaterial(row);
  if(/gable|hip|pyramid|pyramidal/.test(roofShape)){
    const roof=new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*.68,Math.max(1.1,roofH),4),rmat);roof.position.set(cx,cy,baseZ+h+Math.max(.55,roofH/2));roof.rotation.z=Math.PI/4;world.add(roof);
  }else{
    const roof=new THREE.Mesh(UNIT_BOX,rmat);roof.scale.set(w*.97,d*.97,Math.max(.14,roofH));roof.position.set(cx,cy,baseZ+h+Math.max(.08,roofH/2));world.add(roof);
  }
  const floors=Math.max(1,Math.floor(h/3.05));
  const door=new THREE.Mesh(new THREE.PlaneGeometry(1.05,2.05),mat(0x312920,.9,0));door.position.set(cx,cy-d/2-.02,baseZ+1.02);door.rotation.x=Math.PI/2;world.add(door);
  interactables.push({type:'door',x:cx,y:cy-d/2-1.2,z:baseZ,label:'ENTER',building:{id,cx,cy,w,d,h,baseZ,row,floors}});
  if(MOBILE&&!HIGH_DEVICE)return;
  const dark=mat(0x26383a,.28,.18),cols=Math.min(7,Math.max(2,Math.floor(w/4)));
  for(let f=0;f<floors;f+=Math.max(1,Math.floor(floors/4)))for(let i=0;i<cols;i++){if(hash(id+':'+f+':'+i)%100<42)continue;const win=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(1.2,w/(cols+1)*.56),.7),dark);win.position.set(cx-w/2+(i+1)*w/(cols+1),cy-d/2-.012,baseZ+1.5+f*3);win.rotation.x=Math.PI/2;world.add(win)}

}
function addBuildings(){
  let count=0;const buckets=BUILD_MATS.map(()=>[]),details=[];
  outer:for(const row of data.buildings||[]){
    for(const ring of rings(row.geometry)){
      if(ring.length<4)continue;const pts=ring.map(project),xs=pts.map(q=>q.x),ys=pts.map(q=>q.y),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),w=maxx-minx,d=maxy-miny;
      if(w<2||d<2||w>180||d>180)continue;
      const id=String(row.id||count),h=Number(row.height_m||0)>2?Math.min(160,Number(row.height_m)):4.8+(hash(id)%130)/10,cx=(minx+maxx)/2,cy=(miny+maxy)/2,baseZ=terrainZ(cx,cy),bucket=hash(id)%BUILD_MATS.length;
      buckets[bucket].push({cx,cy,h,w,d,baseZ});
      if(details.length<DETAIL_BUILDING_LIMIT){const entry={cx,cy,h,w,d,id,row,baseZ,pts,floors:Math.max(1,Math.floor(h/3.05))};details.push(entry);buildingEntries.push(entry)}
      buildingCenters.push({x:cx,y:cy,z:baseZ,h,w,d});registerSolidPoly(pts);count++;if(count>=BUILDING_LIMIT)break outer;
    }
  }
  const dummy=new THREE.Object3D();
  buckets.forEach((rows,i)=>{if(!rows.length)return;const inst=new THREE.InstancedMesh(UNIT_BOX,BUILD_MATS[i],rows.length);inst.castShadow=renderer.shadowMap.enabled;inst.receiveShadow=true;rows.forEach((r,j)=>{dummy.position.set(r.cx,r.cy,r.baseZ+r.h/2+.08);dummy.scale.set(r.w,r.d,r.h);dummy.rotation.set(0,0,0);dummy.updateMatrix();inst.setMatrixAt(j,dummy.matrix)});inst.instanceMatrix.needsUpdate=true;world.add(inst)});
  const exactWallMat=new THREE.MeshStandardMaterial({map:CONCRETE_MAP,normalMap:CONCRETE_NORMAL,roughnessMap:CONCRETE_ROUGH,color:0x9da7a9,roughness:.82,metalness:.025,transparent:true,opacity:.98});
  const exactEdgeMat=new THREE.LineBasicMaterial({color:0xdffaff,transparent:true,opacity:.5,depthWrite:false});
  details.forEach(r=>{
    if(r.pts?.length>=4){
      const shape=new THREE.Shape();shape.moveTo(r.pts[0].x-r.cx,r.pts[0].y-r.cy);for(let i=1;i<r.pts.length;i++)shape.lineTo(r.pts[i].x-r.cx,r.pts[i].y-r.cy);
      const eg=new THREE.ExtrudeGeometry(shape,{depth:r.h,bevelEnabled:false,steps:1}),em=new THREE.Mesh(eg,exactWallMat);
      em.position.set(r.cx,r.cy,r.baseZ+.09);em.castShadow=renderer.shadowMap.enabled;em.receiveShadow=true;world.add(em);
      const ep=r.pts.map(p=>new THREE.Vector3(p.x,p.y,terrainZ(p.x,p.y)+r.h+.13));if(ep.length){const edge=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ep),exactEdgeMat);world.add(edge)}
    }
    addBuildingDetails(r.cx,r.cy,r.w,r.d,r.h,r.id,r.row,r.baseZ)
  });WORLD_COUNTS.buildings=count;return count;
}
function addBuildingParts(){
  const rows=[];let count=0;
  outer:for(const row of data.building_parts||[]){
    for(const ring of rings(row.geometry)){if(ring.length<4)continue;const pts=ring.map(project),xs=pts.map(q=>q.x),ys=pts.map(q=>q.y),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),w=maxx-minx,d=maxy-miny;if(w<1||d<1||w>140||d>140)continue;const cx=(minx+maxx)/2,cy=(miny+maxy)/2,minH=Math.max(0,Number(row.min_height_m||0)),height=Math.max(.3,Math.min(110,Number(row.height_m||row.roof_height_m||2)));rows.push({cx,cy,w,d,z:terrainZ(cx,cy)+minH+height/2,h:height});count++;if(count>=PART_LIMIT)break outer}
  }
  if(rows.length){const inst=new THREE.InstancedMesh(UNIT_BOX,PART_MAT,rows.length),dummy=new THREE.Object3D();rows.forEach((r,i)=>{dummy.position.set(r.cx,r.cy,r.z);dummy.scale.set(r.w,r.d,r.h);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix)});inst.instanceMatrix.needsUpdate=true;inst.receiveShadow=true;world.add(inst)}
  WORLD_COUNTS.buildingParts=count;return count;
}

function interiorBox(x,y,z,w,d,h,material,collide=true){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,d,h),material);m.position.set(x,y,z+h/2);m.castShadow=renderer.shadowMap.enabled;m.receiveShadow=true;interiorGroup.add(m);
  if(collide)interiorRects.push({minx:x-w/2,maxx:x+w/2,miny:y-d/2,maxy:y+d/2});return m;
}
function clearInteriorRuntime(){while(interiorGroup.children.length)interiorGroup.remove(interiorGroup.children[0]);interiorRects.length=0;activeInterior=null}
function interiorFloorSlab(z,w,d,hx,hy,hw,hd,material){
  const left=(w-hw)/2,right=left,top=(d-hd)/2,bottom=top;
  interiorBox(-hw/2-left/2,0,z,left,d,.14,material,false);interiorBox(hw/2+right/2,0,z,right,d,.14,material,false);
  interiorBox(0,hy+hd/2+top/2,z,hw,top,.14,material,false);interiorBox(0,hy-hd/2-bottom/2,z,hw,bottom,.14,material,false);
}
function addInteriorWindowWall(y,w,z,seedValue){
  const wall=mat(0x8c8b84,.94,.02),glass=new THREE.MeshPhysicalMaterial({color:0x8dc7d4,roughness:.08,transparent:true,opacity:.30,transmission:.52,depthWrite:false,side:THREE.DoubleSide});
  const low=.72,high=2.30,levelH=2.86,openH=high-low,bays=Math.max(3,Math.min(8,Math.floor(w/2.4))),bay=w/bays,open=Math.abs(hash(seedValue))%bays;
  interiorBox(0,y,z,w,.16,low,wall,true);interiorBox(0,y,z+high,w,.16,levelH-high,wall,false);
  for(let i=0;i<=bays;i++){const x=-w/2+i*bay;interiorBox(x,y,z+low,.13,.17,openH,wall,false)}
  for(let i=0;i<bays;i++){if(i===open)continue;const pane=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(.5,bay-.24),openH-.08),glass.clone());pane.position.set(-w/2+(i+.5)*bay,y-.09,z+(low+high)/2);pane.rotation.x=Math.PI/2;interiorGroup.add(pane)}
}
function addRoomWallWithDoor(x,z,d){
  const wall=mat(0x77766f,.95,.01),gap=1.15;interiorBox(x,-d*.25,z,.14,d*.5-gap/2,2.75,wall,true);interiorBox(x,d*.25+gap/4,z,.14,d*.5-gap/2,2.75,wall,true);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.14,gap, .55),wall);head.position.set(x,0,z+2.48);interiorGroup.add(head);
}
function addInteriorVista(entry,w,d){
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:0x3b443c,roughness:1}));ground.position.set(0,0,-.22);interiorGroup.add(ground);
  const vm=new THREE.MeshStandardMaterial({color:0x566169,roughness:.84,metalness:.02});
  let n=0;for(const b of buildingCenters){
    if(n>36)break;const dx=b.x-entry.cx,dy=b.y-entry.cy;if(Math.hypot(dx,dy)<8||Math.hypot(dx,dy)>85)continue;
    const q=new THREE.Mesh(UNIT_BOX,vm);q.scale.set(Math.min(18,b.w),Math.min(18,b.d),Math.min(32,b.h));q.position.set(dx,dy,Math.min(16,b.h/2)-.1);interiorGroup.add(q);n++;
  }
}
function buildInterior(entry){
  clearInteriorRuntime();const w=Math.max(10,Math.min(24,entry.w*1.08)),d=Math.max(10,Math.min(22,entry.d*1.08)),actual=Math.max(1,entry.floors||Math.floor(entry.h/3.05)),floors=Math.min(actual,MOBILE?(HIGH_DEVICE?4:3):6),floorH=3.0;
  activeInterior={entry,w,d,floors,actualFloors:actual,floorH,stairX:w/2-2.0,stairMinY:-2.2,stairMaxY:2.2};
  const floorMat=new THREE.MeshStandardMaterial({color:0x5d5b54,roughness:.92}),wallMat=new THREE.MeshStandardMaterial({color:0x85837b,roughness:.95}),stairMat=new THREE.MeshStandardMaterial({color:0x444944,roughness:.88,metalness:.08});
  addInteriorVista(entry,w,d);
  for(let f=0;f<floors;f++){
    const z=f*floorH,holeX=activeInterior.stairX,holeY=0;
    interiorFloorSlab(z,w,d,holeX,holeY,2.1,4.8,floorMat);
    interiorBox(-w/2,0,z,.18,d,2.86,wallMat,true);interiorBox(w/2,0,z,.18,d,2.86,wallMat,true);
    addInteriorWindowWall(d/2,w,z,entry.id+':N:'+f);addInteriorWindowWall(-d/2,w,z,entry.id+':S:'+f);
    addRoomWallWithDoor(-w*.12,z,d);
    const warm=new THREE.PointLight(0xffd7a5,MOBILE?4:7,13,2);warm.position.set(-w*.22,-d*.08,z+2.35);interiorGroup.add(warm);
    if(f<floors-1){
      const dir=f%2===0?1:-1,steps=14,run=4.4;
      for(let i=0;i<steps;i++){const t=(i+.5)/steps,step=new THREE.Mesh(new THREE.BoxGeometry(1.55,run/steps+.035,floorH/steps),stairMat);step.position.set(activeInterior.stairX,(dir>0?-run/2:run/2)+dir*t*run,z+(i+.5)*floorH/steps);interiorGroup.add(step)}
    }
    const bed=new THREE.Mesh(new THREE.BoxGeometry(2.0,.95,.42),mat(0x655f55,.95,.01));bed.position.set(w*.22,d*.22,z+.23);interiorGroup.add(bed);
    const table=new THREE.Mesh(new THREE.BoxGeometry(1.3,.8,.08),mat(0x5f4937,.88,.02));table.position.set(-w*.28,d*.18,z+.78);interiorGroup.add(table);
  }
  const ceil=new THREE.Mesh(new THREE.BoxGeometry(w,d,.12),wallMat);ceil.position.set(0,0,floors*floorH+.08);interiorGroup.add(ceil);
  interiorGroup.visible=true;world.visible=false;
}
function enterInterior(entry){
  if(!entry||interiorMode)return;exteriorReturn.set(entry.cx,entry.cy-entry.d/2-1.8,entry.baseZ+.05);exteriorYaw=yaw;buildInterior(entry);interiorMode=true;rooftopState=null;
  player.position.set(0,-activeInterior.d/2+1.5,.05);verticalVelocity=0;airborne=false;yaw=0;toast('PROCEDURAL INTERIOR · '+activeInterior.floors+' PLAYABLE FLOORS');
}
function exitInterior(){
  if(!interiorMode)return;interiorMode=false;interiorGroup.visible=false;world.visible=true;player.position.copy(exteriorReturn);yaw=exteriorYaw;verticalVelocity=0;airborne=false;toast('BACK OUTSIDE');
}
function interiorGroundZ(x,y,currentZ){
  if(!activeInterior)return 0;const fH=activeInterior.floorH,max=activeInterior.floors-1;
  let floor=Math.max(0,Math.min(max,Math.floor((currentZ+.16)/fH)));
  const sx=activeInterior.stairX;if(Math.abs(x-sx)<1.0&&y>=activeInterior.stairMinY-.25&&y<=activeInterior.stairMaxY+.25){
    const dir=floor%2===0?1:-1,t=THREE.MathUtils.clamp(dir>0?(y-activeInterior.stairMinY)/(activeInterior.stairMaxY-activeInterior.stairMinY):(activeInterior.stairMaxY-y)/(activeInterior.stairMaxY-activeInterior.stairMinY),0,1);
    if(floor<max)return floor*fH+t*fH;
    if(floor>0){const lower=floor-1,ldir=lower%2===0?1:-1,lt=THREE.MathUtils.clamp(ldir>0?(y-activeInterior.stairMinY)/(activeInterior.stairMaxY-activeInterior.stairMinY):(activeInterior.stairMaxY-y)/(activeInterior.stairMaxY-activeInterior.stairMinY),0,1),lz=lower*fH+lt*fH;if(Math.abs(lz-currentZ)<1.3)return lz}
  }
  return floor*fH;
}
function enterRooftop(entry){
  if(!entry)return;interiorMode=false;interiorGroup.visible=false;world.visible=true;rooftopState={entry};player.position.set(entry.cx,entry.cy,entry.baseZ+entry.h+.22);verticalVelocity=0;airborne=false;toast('ROOFTOP · ZIPLINES ACTIVE');
}
function roofPoint(entry){return new THREE.Vector3(entry.cx,entry.cy,entry.baseZ+entry.h+1.15)}
function zipPoint(z,t){const p=z.a.clone().lerp(z.b,t);p.z-=Math.sin(Math.PI*t)*Math.min(4,z.length*.045);return p}
function buildZiplines(){
  const candidates=buildingEntries.filter(e=>e.h>7&&e.w>4&&e.d>4).slice(0,MOBILE?50:90),used=new Set(),max=MOBILE?5:10,matLine=new THREE.LineBasicMaterial({color:0x252927,transparent:true,opacity:.9});
  for(const a of candidates){
    if(ziplines.length>=max||used.has(a.id))continue;let best=null,bd=Infinity;
    for(const b of candidates){if(a===b||used.has(b.id))continue;const d=Math.hypot(a.cx-b.cx,a.cy-b.cy);if(d>9&&d<120&&d<bd&&Math.abs(a.h-b.h)<38){best=b;bd=d}}
    if(!best)continue;const za=roofPoint(a),zb=roofPoint(best),z={a:za,b:zb,length:za.distanceTo(zb),from:a,to:best},pts=[];for(let i=0;i<=18;i++)pts.push(zipPoint(z,i/18));
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),matLine.clone());world.add(line);z.line=line;ziplines.push(z);used.add(a.id);used.add(best.id);
    interactables.push({type:'zipline',x:za.x,y:za.y,z:za.z-1,label:'ZIPLINE',zip:z,direction:1},{type:'zipline',x:zb.x,y:zb.y,z:zb.z-1,label:'ZIPLINE',zip:z,direction:-1});
  }return ziplines.length;
}
function startZipline(q){
  if(!q?.zip)return;activeZipline={zip:q.zip,t:q.direction>0?0:1,dir:q.direction>0?1:-1};rooftopState=null;verticalVelocity=0;airborne=true;toast('ZIPLINE');
}
function updateZipline(dt){
  if(!activeZipline)return false;const q=activeZipline,z=q.zip;q.t+=q.dir*(12.5*dt/Math.max(1,z.length));const done=q.dir>0?q.t>=1:q.t<=0;q.t=THREE.MathUtils.clamp(q.t,0,1);const p=zipPoint(z,q.t);
  player.position.set(p.x,p.y,p.z-.92);yaw=Math.atan2(z.b.x-z.a.x,z.b.y-z.a.y)+(q.dir<0?Math.PI:0);
  if(done){const e=q.dir>0?z.to:z.from;activeZipline=null;rooftopState={entry:e};player.position.set(e.cx,e.cy,e.baseZ+e.h+.2);airborne=false;toast('ZIPLINE LANDING')}return true;
}
function makeVehicle(a,i){
  const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(3.9,1.75,.72),mat(i%2?0x4d5652:0x65483d,.74,.25)),cab=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.5,.7),mat(0x263438,.28,.35));
  body.position.z=.52;cab.position.set(.15,0,1.13);g.add(body,cab);g.position.set(a.x,a.y,terrainZ(a.x,a.y)+.02);g.rotation.z=a.a;world.add(g);
  const v={root:g,x:a.x,y:a.y,heading:a.a,speed:0,maxSpeed:i%3===0?22:17,fuel:100,type:i%3===0?'sport':'pickup'};vehicles.push(v);interactables.push({type:'vehicle',x:a.x,y:a.y,z:g.position.z,label:'DRIVE',vehicle:v});return v;
}
function spawnVehicles(){for(let i=0;i<Math.min(MOBILE?3:6,roadAnchors.length);i++){const a=roadAnchors[(i*17+9)%roadAnchors.length];if(a)makeVehicle(a,i)}return vehicles.length}
function enterVehicle(v){if(!v||interiorMode)return;activeVehicle=v;player.visible=false;toast('DRIVING · USE TO EXIT')}
function exitVehicle(){if(!activeVehicle)return;const v=activeVehicle,x=v.root.position.x+Math.cos(v.heading)*1.8,y=v.root.position.y-Math.sin(v.heading)*1.8;activeVehicle=null;player.visible=true;player.position.set(x,y,terrainZ(x,y));toast('EXITED VEHICLE')}
function updateVehicle(dt){
  if(!activeVehicle)return false;const v=activeVehicle,target=moveY*v.maxSpeed;v.speed=THREE.MathUtils.lerp(v.speed,target,1-Math.exp(-4.5*dt));v.heading-=moveX*(.75+Math.min(1,Math.abs(v.speed)/8))*dt*Math.sign(v.speed||1);
  const nx=v.root.position.x+Math.sin(v.heading)*v.speed*dt,ny=v.root.position.y+Math.cos(v.heading)*v.speed*dt;if(!blocked(nx,ny,.8)){v.root.position.x=nx;v.root.position.y=ny}else v.speed*=.15;
  v.root.position.z=terrainZ(v.root.position.x,v.root.position.y)+.02;v.root.rotation.z=v.heading;player.position.copy(v.root.position);yaw=THREE.MathUtils.lerp(yaw,v.heading,.14);return true;
}
function updateContext(){
  const btn=$('contextBtn');if(!btn)return;contextTarget=null;let best=3.4;
  if(activeVehicle){contextTarget={type:'vehicle_exit'};btn.hidden=false;btn.textContent='EXIT VEHICLE';return}
  if(interiorMode){
    if(player.position.y<-activeInterior.d/2+2.4&&player.position.z<1){contextTarget={type:'interior_exit'};btn.hidden=false;btn.textContent='EXIT';return}
    const top=(activeInterior.floors-1)*activeInterior.floorH;if(player.position.z>top-.3&&Math.abs(player.position.x-activeInterior.stairX)<1.5){contextTarget={type:'roof',building:activeInterior.entry};btn.hidden=false;btn.textContent='ROOF';return}
    btn.hidden=true;return;
  }
  for(const q of interactables){
    const qx=q.type==='vehicle'&&q.vehicle?.root?q.vehicle.root.position.x:q.x;
    const qy=q.type==='vehicle'&&q.vehicle?.root?q.vehicle.root.position.y:q.y;
    const qz=q.type==='vehicle'&&q.vehicle?.root?q.vehicle.root.position.z:(q.z??player.position.z);
    const dz=Math.abs(qz-player.position.z);if(dz>2.4)continue;const d=Math.hypot(player.position.x-qx,player.position.y-qy);
    if(d<best){best=d;contextTarget=q}
  }
  if(contextTarget){btn.hidden=false;btn.textContent=contextTarget.label||'USE'}else btn.hidden=true;
}
function contextUse(){
  const q=contextTarget;if(!q)return;if(q.type==='door')enterInterior(q.building);else if(q.type==='zipline')startZipline(q);else if(q.type==='vehicle')enterVehicle(q.vehicle);else if(q.type==='vehicle_exit')exitVehicle();else if(q.type==='interior_exit')exitInterior();else if(q.type==='roof')enterRooftop(q.building);
}

function addVegetation(){const size=span*1250,tr=mat(0x4d3928,1,0),leaves=[mat(0x344d32,1,0),mat(0x405b38,1,0),mat(0x50633e,1,0)],treeN=MOBILE?(HIGH_DEVICE?240:135):430,bushN=MOBILE?(HIGH_DEVICE?100:55):180;for(let i=0;i<treeN;i++){const x=(rand()-.5)*size,y=(rand()-.5)*size;if(Math.hypot(x,y)<15)continue;const h=3+rand()*7,t=new THREE.Mesh(new THREE.CylinderGeometry(.1,.22,h,6),tr);t.rotation.x=Math.PI/2;t.position.set(x,y,terrainZ(x,y)+h/2);world.add(t);const c=new THREE.Mesh(new THREE.ConeGeometry(.8+rand()*1.6,2.2+rand()*3.2,7),leaves[i%3]);c.position.set(x,y,terrainZ(x,y)+h+1.1);world.add(c)}for(let i=0;i<bushN;i++){const b=new THREE.Mesh(new THREE.DodecahedronGeometry(.35+rand()*.65,0),leaves[(i+1)%3]);{const bx=(rand()-.5)*size,by=(rand()-.5)*size;b.position.set(bx,by,terrainZ(bx,by)+.4)}world.add(b)}}
function addStreetLife(){const poleMat=mat(0x303a35,.6,.4),signMat=mat(0x6e2b24,.65,.12);for(let i=0;i<Math.min(110,roadAnchors.length);i+=2){const a=roadAnchors[i],side=i%4<2?1:-1,nx=-Math.sin(a.a),ny=Math.cos(a.a),x=a.x+nx*side*(a.w/2+2.2),y=a.y+ny*side*(a.w/2+2.2);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,4.5,6),poleMat);pole.rotation.x=Math.PI/2;pole.position.set(x,y,2.25);world.add(pole);const lamp=new THREE.Mesh(new THREE.BoxGeometry(.65,.22,.18),mat(0x49534e,.45,.45));lamp.position.set(x,y,4.45);world.add(lamp);if(i%6===0){const sign=new THREE.Mesh(new THREE.BoxGeometry(.7,.08,.7),signMat);sign.position.set(x+.35,y,2.25);world.add(sign)}}}
function makeSmokeTexture(){
  const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d'),r=g.createRadialGradient(32,32,3,32,32,31);
  r.addColorStop(0,'rgba(120,126,120,.72)');r.addColorStop(.45,'rgba(70,76,72,.42)');r.addColorStop(1,'rgba(20,24,22,0)');g.fillStyle=r;g.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(cv);
}
const SMOKE_TEX=makeSmokeTexture();
function addAmbientDisasterFx(){
  const count=MOBILE?(HIGH_DEVICE?5:3):9;
  for(let i=0;i<count;i++){
    const a=roadAnchors[(i*23+7)%Math.max(1,roadAnchors.length)]||{x:(rand()-.5)*250,y:(rand()-.5)*250};
    const x=a.x+(rand()-.5)*18,y=a.y+(rand()-.5)*18,z=terrainZ(x,y);
    const light=new THREE.PointLight(0xff6b2a,MOBILE?4:7,10,2);light.position.set(x,y,z+1.1);world.add(light);
    const fire=new THREE.Mesh(new THREE.ConeGeometry(.32+.18*rand(),1.1+.6*rand(),8),new THREE.MeshBasicMaterial({color:0xff6a2c,transparent:true,opacity:.82}));
    fire.position.set(x,y,z+.55);world.add(fire);
    const smoke=new THREE.Sprite(new THREE.SpriteMaterial({map:SMOKE_TEX,color:0x59615d,transparent:true,opacity:.52,depthWrite:false}));
    smoke.position.set(x,y,z+2.1);smoke.scale.set(2.4,3.4,1);world.add(smoke);
    ambientFx.push({fire,smoke,light,phase:rand()*6.28,baseZ:z});
  }
  return ambientFx.length;
}
function updateAmbientDisasterFx(now){
  if(interiorMode)return;
  const t=now*.001;
  for(const q of ambientFx){
    q.fire.scale.y=.82+.25*Math.sin(t*7+q.phase);q.fire.rotation.z=t*.35+q.phase;
    q.light.intensity=(MOBILE?3.2:5.5)+(1.4*Math.sin(t*11+q.phase));
    q.smoke.position.z=q.baseZ+2.0+(Math.sin(t*.7+q.phase)+1)*.7;q.smoke.material.opacity=.38+.16*Math.sin(t*.8+q.phase);
    q.smoke.scale.setScalar(2.4+.45*Math.sin(t*.6+q.phase));
  }
}

function addAbandonment(){
  const colors=[0x58473a,0x45514e,0x69433a,0x4c4d45];
  for(let i=0;i<(MOBILE?24:50);i++){
    const a=roadAnchors[i%Math.max(1,roadAnchors.length)]||{x:(rand()-.5)*400,y:(rand()-.5)*400,a:rand()*6.28,w:7};
    const car=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(3.8,1.72,.72),mat(colors[i%colors.length],.82,.22));
    body.position.z=.52;car.add(body);
    const cab=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.48,.66),mat(0x283536,.34,.3));cab.position.set(.15,0,1.12);car.add(cab);
    car.position.set(a.x+(rand()-.5)*18,a.y+(rand()-.5)*18,.02);car.rotation.z=a.a+(rand()-.5)*.45;world.add(car);
    const rr=2.05;solidRects.push({type:'car',minx:car.position.x-rr,maxx:car.position.x+rr,miny:car.position.y-1.12,maxy:car.position.y+1.12});
  }
  const coverMat=[mat(0x69513c,1,0),mat(0x565b57,.8,.12),mat(0x4a4038,.95,.02),mat(0x6c6657,.9,.04)];
  for(let i=0;i<(MOBILE?70:130);i++){
    const a=roadAnchors[i%Math.max(1,roadAnchors.length)]||{x:(rand()-.5)*500,y:(rand()-.5)*500,a:rand()*6.28,w:7};
    const side=rand()<.5?-1:1,nx=-Math.sin(a.a),ny=Math.cos(a.a);
    const x=a.x+nx*side*(a.w/2+2+rand()*8)+(rand()-.5)*14,y=a.y+ny*side*(a.w/2+2+rand()*8)+(rand()-.5)*14;
    if(blocked(x,y,.9))continue;
    const kind=i%4;
    const geom=kind===0?new THREE.BoxGeometry(1.25,.55,.85):kind===1?new THREE.CylinderGeometry(.34,.36,1.05,12):kind===2?new THREE.BoxGeometry(1.7,.45,.72):new THREE.BoxGeometry(.8,.8,1.45);
    const cover=new THREE.Mesh(geom,coverMat[kind]);cover.position.set(x,y,kind===1?.52:kind===3?.72:.42);if(kind===1)cover.rotation.x=Math.PI/2;cover.rotation.z=rand()*Math.PI;cover.castShadow=cover.receiveShadow=true;world.add(cover);
    solidRects.push({type:'cover',minx:x-.82,maxx:x+.82,miny:y-.65,maxy:y+.65});
  }
  for(let i=0;i<44;i++){
    const a=roadAnchors[(i*3)%Math.max(1,roadAnchors.length)]||{x:(rand()-.5)*350,y:(rand()-.5)*350};
    const x=a.x+(rand()-.5)*22,y=a.y+(rand()-.5)*22;if(blocked(x,y,.45))continue;
    const type=i%4===0?'ammo':i%4===1?'medkit':i%4===2?'armor':'weapon';
    const color=type==='ammo'?0xd1b05e:type==='medkit'?0xd85858:type==='armor'?0x5aa7c9:0x73e1b2;
    const mesh=new THREE.Mesh(type==='weapon'?new THREE.BoxGeometry(.9,.12,.12):new THREE.BoxGeometry(.34,.34,.22),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.25,roughness:.5}));
    mesh.position.set(x,y,.22);mesh.rotation.z=rand()*Math.PI;world.add(mesh);
    lootPickups.push({id:'loot-'+i,type,x,y,mesh,picked:false});
  }
  for(let i=0;i<(MOBILE?90:220);i++){
    const d=new THREE.Mesh(new THREE.BoxGeometry(.15+rand()*.7,.15+rand()*.7,.08+rand()*.28),mat(0x51463b,1,.03));
    d.position.set((rand()-.5)*span*900,(rand()-.5)*span*900,.08);d.rotation.set(rand()*2,rand()*2,rand()*6);world.add(d);
  }
}
function nearestLoot(){
  let best=null,dist=1.75;
  for(const q of lootPickups){if(q.picked)continue;const d=Math.hypot(player.position.x-q.x,player.position.y-q.y);if(d<dist){dist=d;best=q}}
  return best;
}
function collectLoot(q){
  if(!q||q.picked)return;q.picked=true;q.mesh.visible=false;lootCount++;$('loot').textContent=lootCount;
  if(q.type==='ammo'){for(const w of WEAPONS)if(w.mag&&weaponState[w.key]?.owned)weaponState[w.key].reserve=Math.min(w.reserve*3,weaponState[w.key].reserve+Math.max(12,Math.floor(w.reserve*.35)));updateAmmo();toast('Ammo acquired')}
  else if(q.type==='medkit'){health=Math.min(100,health+35);$('health').textContent=Math.round(health);toast('Med kit acquired')}
  else if(q.type==='armor')toast('Armor plate acquired');
  else {const locked=WEAPONS.find(w=>!weaponState[w.key]?.owned);if(locked){weaponState[locked.key].owned=true;weaponState[locked.key].mag=locked.mag;weaponState[locked.key].reserve=locked.reserve;toast(locked.name+' acquired')}else toast('Weapon salvage acquired');renderWeaponBar()}
}
function updateDwellPickup(now){
  const q=nearestLoot(),prompt=$('pickupPrompt'),ring=$('pickupRing'),label=$('pickupLabel');
  if(!q){pickupTarget=null;pickupStarted=0;if(prompt)prompt.hidden=true;return}
  if(pickupTarget!==q){pickupTarget=q;pickupStarted=now}
  const progress=Math.max(0,Math.min(1,(now-pickupStarted)/1750));
  if(prompt){prompt.hidden=false;prompt.style.setProperty('--pickup-angle',(progress*360)+'deg')}
  if(ring)ring.style.setProperty('--pickup-angle',(progress*360)+'deg');
  if(label)label.textContent='PICKING UP '+q.type.toUpperCase();
  if(progress>=1){collectLoot(q);pickupTarget=null;pickupStarted=0;if(prompt)prompt.hidden=true}
}
function clearSpawn(x,y,r=1.1){
  if(Math.hypot(x-player.position.x,y-player.position.y)<8)return false;
  return !blocked(x,y,r);
}
function chooseCombatSpawn(team,index){
  const pool=roadAnchors.length?roadAnchors:buildingCenters;
  for(let tries=0;tries<80;tries++){
    const seed=(index+1)*97+team*131+tries*17;
    const q=pool.length?pool[seed%pool.length]:{x:(rand()-.5)*220,y:(rand()-.5)*220};
    const ang=(seed%628)/100,dist=8+(seed%23);
    const x=q.x+Math.cos(ang)*dist,y=q.y+Math.sin(ang)*dist;
    if(clearSpawn(x,y))return{x,y};
  }
  return{x:(team===1?-1:1)*(35+index*3),y:(index%5-2)*8};
}
function canSee(a,b){
  const dx=b.x-a.x,dy=b.y-a.y;
  for(let i=1;i<8;i++){const t=i/8;if(blocked(a.x+dx*t,a.y+dy*t,.18))return false}
  return true;
}
async function spawnTdmBots(){
  const requested=Math.max(0,Math.min(11,Number(activeMatch?.bot_players||0)));
  if(mode!=='TDM'||requested<=0){if($('enemyLabel'))$('enemyLabel').textContent=mode==='TDM'?'players':'infected';return 0}
  const source=await loadAsset(CHAR_MODELS.free_07);
  const humanTeamCounts={1:0,2:0};for(const m of activeMembers){const t=Number(m.team_no||1);if(t===1||t===2)humanTeamCounts[t]++}
  const desired={1:Math.max(0,6-humanTeamCounts[1]),2:Math.max(0,6-humanTeamCounts[2])};
  let remaining=requested,index=0;
  for(const team of [1,2]){
    const n=Math.min(remaining,desired[team]);
    for(let j=0;j<n;j++,index++){
      const g=skeletonClone(source.scene);prepHumanoid(g,{variant:(j+team)%2+1});orientHumanoid(g,1.8);
      const pos=chooseCombatSpawn(team,index);g.position.set(pos.x,pos.y,terrainZ(pos.x,pos.y));g.rotation.z=rand()*Math.PI*2;
      const rifle=makeHorizonRifle(THREE,j%3===0?'wrap_toxic_rain':j%3===1?'wrap_blood_rust':'wrap_ash');
      rifle.scale.setScalar(.25);rifle.rotation.set(.04,-.18,-Math.PI/2);rifle.position.set(.36,.08,1.25);g.add(rifle);
      const friendly=team===playerTeam,name=(friendly?'ALLY ':'ENEMY ')+String(j+1).padStart(2,'0');
      g.add(makeNameSprite(name,friendly?'#7dffe0':'#ff927d'));world.add(g);
      combatants.push({g,team,friendly,name,health:100,alive:true,speed:3.2+rand()*.8,phase:rand()*6.28,lastShot:performance.now()+rand()*900,index});
    }
    remaining-=n;
  }
  while(remaining>0){
    const team=2,index2=combatants.length,pos=chooseCombatSpawn(team,index2),g=skeletonClone(source.scene);
    prepHumanoid(g,{variant:index2%2+1});orientHumanoid(g,1.8);g.position.set(pos.x,pos.y,terrainZ(pos.x,pos.y));g.add(makeNameSprite('ENEMY '+String(index2+1).padStart(2,'0'),'#ff927d'));world.add(g);
    combatants.push({g,team,friendly:team===playerTeam,name:'ENEMY '+String(index2+1).padStart(2,'0'),health:100,alive:true,speed:3.3,phase:rand()*6.28,lastShot:performance.now()+rand()*900,index:index2});remaining--;
  }
  if($('enemyLabel'))$('enemyLabel').textContent='combatants';
  $('infected').textContent=combatants.filter(x=>x.alive&&!x.friendly).length;
  return combatants.length;
}
function respawnCombatant(b){
  const p=chooseCombatSpawn(b.team,b.index+17);b.g.position.set(p.x,p.y,terrainZ(p.x,p.y));b.g.visible=true;b.health=100;b.alive=true;b.lastShot=performance.now()+700;
  $('infected').textContent=combatants.filter(x=>x.alive&&!x.friendly).length;
}
function eliminateCombatant(b,killer='YOU'){
  if(!b.alive)return;b.alive=false;b.g.visible=false;
  addKillFeed(killer,b.name,'AR-12',false);
  $('infected').textContent=combatants.filter(x=>x.alive&&!x.friendly).length;
  setTimeout(()=>{if(mode==='TDM')respawnCombatant(b)},2200);
}
function updateCombatants(dt,t){
  if(mode!=='TDM')return;
  const liveEnemies=combatants.filter(x=>x.alive);
  for(const b of liveEnemies){
    let target=null,targetPos=null;
    if(b.team!==playerTeam&&!dead){target={player:true,name:savedProfile?.display_name||'YOU'};targetPos=player.position}
    const rivals=liveEnemies.filter(x=>x.team!==b.team);
    if(rivals.length){
      const nearest=rivals.reduce((best,q)=>{const d=Math.hypot(q.g.position.x-b.g.position.x,q.g.position.y-b.g.position.y);return !best||d<best.d?{q,d}:best},null);
      const pd=targetPos?Math.hypot(targetPos.x-b.g.position.x,targetPos.y-b.g.position.y):Infinity;
      if(nearest&&nearest.d<pd){target=nearest.q;targetPos=nearest.q.g.position}
    }
    if(!targetPos)continue;
    const dx=targetPos.x-b.g.position.x,dy=targetPos.y-b.g.position.y,d=Math.max(.001,Math.hypot(dx,dy)),visible=canSee(b.g.position,targetPos);
    if(d>13||!visible){
      const nx=b.g.position.x+dx/d*b.speed*dt,ny=b.g.position.y+dy/d*b.speed*dt;
      if(!blocked(nx,ny,.36)){b.g.position.x=nx;b.g.position.y=ny;b.g.position.z=terrainZ(nx,ny)}
    }else{
      const strafe=Math.sin(t*.002+b.phase)*b.speed*.36*dt,nx=b.g.position.x-dy/d*strafe,ny=b.g.position.y+dx/d*strafe;
      if(!blocked(nx,ny,.34)){b.g.position.x=nx;b.g.position.y=ny;b.g.position.z=terrainZ(nx,ny)}
    }
    b.g.rotation.z=Math.atan2(dy,dx)-Math.PI/2;
    if(visible&&d<52&&t-b.lastShot>620+((b.index*113)%380)){
      b.lastShot=t;
      const accuracy=Math.max(.18,.72-d/105);
      if(rand()<accuracy){
        if(target?.player){
          health=Math.max(0,health-(5+Math.floor(rand()*7)));$('health').textContent=Math.round(health);if(health<=0)triggerDeath(b);
        }else if(target?.alive){
          target.health-=12+Math.floor(rand()*11);if(target.health<=0)eliminateCombatant(target,b.name);
        }
      }
    }
  }
}
function buildInfectedPatrol(x,y,index){
  if(!roadAnchors.length)return[{x,y}];
  let cur=roadAnchors.reduce((best,a)=>{const d=Math.hypot(a.x-x,a.y-y);return !best||d<best.d?{a,d}:best},null)?.a||roadAnchors[index%roadAnchors.length],route=[];
  const used=new Set();
  for(let k=0;k<6;k++){
    route.push({x:cur.x,y:cur.y});used.add(cur);
    let best=null,score=Infinity;
    for(const a of roadAnchors){if(used.has(a))continue;const d=Math.hypot(a.x-cur.x,a.y-cur.y);if(d>8&&d<85){const s=d+((hash(index+':'+k+':'+Math.round(a.x))%100)/20);if(s<score){score=s;best=a}}}
    if(!best)break;cur=best;
  }
  return route.length?route:[{x,y}];
}
async function spawnInfected(){
  const defs=[
    {id:'shambler',model:'free_03',label:'SHAMBLER',speed:1.05,health:110,damage:13,detect:38,scale:1},
    {id:'stalker',model:'free_07',label:'STALKER',speed:1.65,health:105,damage:15,detect:52,scale:1},
    {id:'sprinter',model:'free_05',label:'SPRINTER',speed:2.65,health:80,damage:17,detect:58,scale:.96},
    {id:'brute',model:'free_09',label:'BRUTE',speed:.82,health:260,damage:27,detect:42,scale:1.16},
    {id:'screamer',model:'free_01',label:'SCREAMER',speed:1.28,health:120,damage:10,detect:64,scale:1}
  ];
  const count=MOBILE?(HIGH_DEVICE?15:11):22;
  for(let i=0;i<count;i++){
    const def=defs[i%defs.length],source=await loadAsset(CHAR_MODELS[def.model]||CHAR_MODELS.free_03),g=skeletonClone(source.scene);
    prepHumanoid(g,{infectedTint:true,variant:i%2+1});orientHumanoid(g,1.7*def.scale);
    const a=roadAnchors.length?roadAnchors[(i*11+3)%roadAnchors.length]:null,gx=a?a.x+(rand()-.5)*15:(rand()-.5)*300,gy=a?a.y+(rand()-.5)*15:(rand()-.5)*300;
    g.position.set(gx,gy,terrainZ(gx,gy));g.rotation.z=rand()*Math.PI*2;world.add(g);
    infected.push({g,s:def.speed,phase:rand()*6.28,health:def.health,maxHealth:def.health,damage:def.damage,detect:def.detect,alive:true,index:i,name:def.label+' '+String(i+1).padStart(2,'0'),kind:def.id,patrol:buildInfectedPatrol(gx,gy,i),patrolIndex:0,alertUntil:0,nextScream:performance.now()+2500+rand()*4500});
  }
  $('infected').textContent=count;
}
async function addSurvivor(){
  const key=savedProfile?.avatar_key||'free_03',url=avatarModelForKey(key,CHAR_MODELS)||CHAR_MODELS.free_03;
  const source=await loadAsset(url),g=skeletonClone(source.scene);prepHumanoid(g,{variant:avatarVariantForKey(key)});orientHumanoid(g,1.82);
  g.userData.playerBody=true;player.add(g);player.add(makeNameSprite(savedProfile?.display_name||'SURVIVOR','#dffff4'));
  refreshWeaponRig();
  muzzleFlash=new THREE.PointLight(0xffc06c,0,4,2);muzzleFlash.position.set(.38,.86,1.32);player.add(muzzleFlash);
}
const flashlight=new THREE.SpotLight(0xfff0ca,0,38,.42,.55,1.5);camera.add(flashlight);flashlight.target.position.set(0,0,-4);camera.add(flashlight.target);scene.add(camera);
function nearest(){let best=null,dist=4.1;for(const q of interactables){const d=Math.hypot(player.position.x-q.x,player.position.y-q.y);if(d<dist){dist=d;best=q}}return best}
function use(){if(contextTarget)contextUse();else toast('Stand near a door, vehicle or zipline to interact')}
function reload(){
  const w=activeWeapon(),st=weaponState[w.key];if(!w.mag||reloading||st.mag>=w.mag||st.reserve<=0)return;
  reloading=true;toast('Reloading '+w.name);tone(190,.035,.02,'triangle');
  const reloadMs=w.kind==='shotgun'?1850:w.kind==='pistol'?1050:1350;
  setTimeout(()=>{const need=w.mag-st.mag,take=Math.min(need,st.reserve);st.mag+=take;st.reserve-=take;reloading=false;updateAmmo();tone(260,.03,.018,'triangle')},reloadMs);
}
async function recordKill(victimName,headshot=false){
  addKillFeed(savedProfile?.display_name||'YOU',victimName,activeWeapon().name,headshot);
  if(!matchId||activeMatch?.host_player_id!==playerId)return;
  rpc('bridgepoint_horizon_record_kill_v4310',{
    p_host_player_id:playerId,p_host_secret:playerSecret,p_match_id:matchId,
    p_event_type:'INFECTED_KILL',p_killer_player_id:playerId,p_victim_player_id:null,
    p_weapon_key:activeWeapon().key,p_headshot:headshot,p_distance_m:null,p_metadata:{mode,client_build:4330}
  }).catch(()=>{});
}
function shootOnce(){
  if(dead||reloading)return;
  const w=activeWeapon(),st=weaponState[w.key],now=performance.now();if(now-lastFireAt<w.interval)return;lastFireAt=now;
  if(w.mag&&st.mag<=0){reload();return}
  if(w.mag){st.mag--;updateAmmo();gunAudio(w);if(muzzleFlash){muzzleFlash.intensity=7;setTimeout(()=>{if(muzzleFlash)muzzleFlash.intensity=0},34)}}
  else tone(82,.06,.035,'triangle');
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);
  if(w.spread){dir.x+=(rand()-.5)*w.spread;dir.y+=(rand()-.5)*w.spread;dir.z+=(rand()-.5)*w.spread;dir.normalize()}
  const origin=camera.position.clone();
  let hit=null,best=Infinity,headshot=false,hitKind='';
  if(mode==='TDM'){
    for(const z of combatants){
      if(!z.alive||z.team===playerTeam)continue;
      const target=z.g.position.clone().add(new THREE.Vector3(0,0,1.2)),to=target.clone().sub(origin),along=to.dot(dir);
      if(along<0||along>w.range)continue;
      const closest=origin.clone().addScaledVector(dir,along),lateral=closest.distanceTo(target);
      if(lateral<.7&&along<best){hit=z;best=along;headshot=lateral<.22;hitKind='combatant'}
    }
  }else{
    for(const z of infected){
      if(!z.alive)continue;
      const target=z.g.position.clone().add(new THREE.Vector3(0,0,1.15)),to=target.clone().sub(origin),along=to.dot(dir);
      if(along<0||along>w.range)continue;
      const closest=origin.clone().addScaledVector(dir,along),lateral=closest.distanceTo(target);
      if(lateral<.72&&along<best){hit=z;best=along;headshot=lateral<.24;hitKind='infected'}
    }
  }
  if(hit){
    hit.health-=headshot?w.head:w.damage;hit.g.position.addScaledVector(dir,.08);
    if(hit.health<=0){
      if(hitKind==='combatant')eliminateCombatant(hit,savedProfile?.display_name||'YOU');
      else{hit.alive=false;hit.g.visible=false;$('infected').textContent=infected.filter(z=>z.alive).length;recordKill(hit.name,headshot)}
    }
  }
  if(w.mag&&st.mag===0)reload();
}
function buildCover(){
  if(dead)return;
  const f=new THREE.Vector2(-Math.sin(yaw),Math.cos(yaw)),x=player.position.x+f.x*2.1,y=player.position.y+f.y*2.1;
  if(blocked(x,y,.8)){toast('Cannot build here');return}
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(2.2,.45,1.18),new THREE.MeshStandardMaterial({color:0x5c5144,roughness:.95,metalness:.03}));
  mesh.position.set(x,y,terrainZ(x,y)+.59);mesh.rotation.z=yaw;mesh.castShadow=mesh.receiveShadow=true;world.add(mesh);
  const rect={type:'built',minx:x-1.18,maxx:x+1.18,miny:y-.52,maxy:y+.52};solidRects.push(rect);builtCover.push({mesh,rect});buildCount++;toast('Barricade built');
  if(matchId)rpc('bridgepoint_horizon_emit_world_event_v4303',{
    p_player_id:playerId,p_player_secret:playerSecret,p_match_id:matchId,p_cell_key:activeMatch?.cell_seed||('MATCH_'+matchId),
    p_event_type:'FORTIFICATION',p_event_key:'build-'+playerId+'-'+buildCount,p_payload:{kind:'barricade',x,y,yaw},p_ttl_seconds:86400
  }).catch(()=>{});
}
function respawn(){
  dead=false;health=100;$('health').textContent='100';player.position.set(0,0,terrainZ(0,0));camera.fov=aiming?50:68;camera.updateProjectionMatrix();
  $('killCam').hidden=true;toast('Respawned');
}
let yearDeathResult=null,killcamTimer=null;
async function finishDeathFlow(){
  clearTimeout(killcamTimer);
  if(mode==='YEAR_ONE'&&yearDeathResult?.spectator_only){
    location.assign('/app/horizon/?tab=WATCH');return;
  }
  respawn();
}
async function triggerDeath(killer){
  if(dead)return;dead=true;shooting=false;sprint=false;
  const kc=$('killCam');if(kc)kc.hidden=false;
  const title=$('killCamTitle'),phase=$('killCamPhase');
  if(title)title.textContent='ELIMINATED BY '+(killer?.name||'THE HORDE');
  if(mode==='YEAR_ONE'&&playerId&&playerSecret){
    yearDeathResult=await rpc('bridgepoint_horizon_year_one_death_v4310',{
      p_player_id:playerId,p_player_secret:playerSecret,p_death_key:'death-'+Date.now()
    }).catch(()=>null);
  }
  const killerIndex=killer?.index??-1,pre=killSnapshots.filter(s=>s.t>=performance.now()-5000),started=performance.now();
  const playback=()=>{
    if(!dead)return;
    const elapsed=performance.now()-started;
    if(elapsed<5000&&pre.length&&killerIndex>=0){
      const idx=Math.min(pre.length-1,Math.floor(elapsed/5000*pre.length)),s=pre[idx],kp=s.infected?.[killerIndex],pp=s.player;
      if(kp&&pp){camera.position.set(kp[0],kp[1],kp[2]+1.5);camera.lookAt(pp[0],pp[1],pp[2]+1.05)}
      if(phase)phase.textContent='5 seconds before the kill';
      requestAnimationFrame(playback);return;
    }
    if(elapsed<6500){
      if(phase)phase.textContent='SLOW-MOTION KILL';
      if(killer){camera.position.lerp(killer.g.position.clone().add(new THREE.Vector3(0,0,1.5)),.08);camera.lookAt(player.position.clone().add(new THREE.Vector3(0,0,1.05)))}
      requestAnimationFrame(playback);return;
    }
    if(elapsed<11500){
      if(phase)phase.textContent='5 seconds after elimination';
      if(killer){camera.position.lerp(killer.g.position.clone().add(new THREE.Vector3(0,0,1.8)),.04);camera.lookAt(player.position.clone().add(new THREE.Vector3(0,0,1.0)))}
      requestAnimationFrame(playback);return;
    }
  };
  playback();killcamTimer=setTimeout(finishDeathFlow,11550);
}
function updateInfected(dt,t){
  if(interiorMode)return;
  for(const z of infected){
    if(!z.alive)continue;
    const dx=player.position.x-z.g.position.x,dy=player.position.y-z.g.position.y,d=Math.hypot(dx,dy),aggro=!dead&&(d<z.detect||z.alertUntil>t);
    if(z.kind==='screamer'&&aggro&&d<28&&t>z.nextScream){
      z.nextScream=t+7000;tone(330,.18,.025,'sawtooth');
      for(const q of infected)if(q.alive&&Math.hypot(q.g.position.x-z.g.position.x,q.g.position.y-z.g.position.y)<70)q.alertUntil=t+9000;
    }
    if(aggro&&d>1.15){
      const nx=z.g.position.x+dx/Math.max(.001,d)*z.s*dt,ny=z.g.position.y+dy/Math.max(.001,d)*z.s*dt;
      if(!blocked(nx,ny,.32)){z.g.position.x=nx;z.g.position.y=ny;z.g.position.z=terrainZ(nx,ny)}
      z.g.rotation.z=Math.atan2(dy,dx)-Math.PI/2;
    }else if(!dead&&z.patrol?.length){
      const p=z.patrol[z.patrolIndex%z.patrol.length],px=p.x-z.g.position.x,py=p.y-z.g.position.y,pd=Math.hypot(px,py);
      if(pd<1.2)z.patrolIndex=(z.patrolIndex+1)%z.patrol.length;
      else{const speed=z.s*.42,nx=z.g.position.x+px/pd*speed*dt,ny=z.g.position.y+py/pd*speed*dt;if(!blocked(nx,ny,.3)){z.g.position.x=nx;z.g.position.y=ny;z.g.position.z=terrainZ(nx,ny)}z.g.rotation.z=Math.atan2(py,px)-Math.PI/2}
    }
    if(!dead&&d<1.18){
      health=Math.max(0,health-z.damage*dt);$('health').textContent=Math.round(health);
      if(health<=0)triggerDeath(z);
    }
  }
}
function kmBetween(lat1,lon1,lat2,lon2){
  const r=6371,toRad=Math.PI/180,dLat=(lat2-lat1)*toRad,dLon=(lon2-lon1)*toRad;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*toRad)*Math.cos(lat2*toRad)*Math.sin(dLon/2)**2;
  return 2*r*Math.asin(Math.sqrt(a));
}
function ensureRainFx(){
  if(rainFx)return rainFx;
  const n=MOBILE?260:520,positions=new Float32Array(n*3);
  for(let i=0;i<n;i++){positions[i*3]=(rand()-.5)*28;positions[i*3+1]=(rand()-.5)*28;positions[i*3+2]=2+rand()*18}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const m=new THREE.PointsMaterial({color:0xa7dcff,size:MOBILE?.045:.055,transparent:true,opacity:.62,depthWrite:false});
  rainFx=new THREE.Points(g,m);rainFx.visible=false;rainFx.frustumCulled=false;scene.add(rainFx);return rainFx;
}
function updateWeatherFx(dt,now){
  const fx=rainFx;if(!fx||!fx.visible)return;
  fx.position.set(player.position.x,player.position.y,player.position.z);
  const p=fx.geometry.attributes.position;
  for(let i=0;i<p.count;i++){let z=p.getZ(i)-dt*24;if(z<.15)z=12+rand()*9;p.setZ(i,z)}
  p.needsUpdate=true;
  fx.material.opacity=.5+.12*Math.sin(now*.006);
}
async function pollLiveWeather(){
  const el=$('weatherLive');
  try{
    const out=await rpc('bridgepoint_public_weather_bootstrap_v5004',{}),items=Array.isArray(out?.items)?out.items:[];
    const now=Date.now();
    const active=items.filter(x=>{
      if(!Number.isFinite(Number(x?.lat))||!Number.isFinite(Number(x?.lon)))return false;
      if(String(x?.urgency||'').toLowerCase()==='past')return false;
      if(x?.ends_at&&Date.parse(x.ends_at)<now)return false;
      return true;
    }).map(x=>({...x,_km:kmBetween(lat,lon,Number(x.lat),Number(x.lon))})).sort((a,b)=>a._km-b._km);
    const near=active[0]||null,local=near&&near._km<=80?near:null;
    liveWeather={feed:true,event:local,distance_km:local?Number(local._km.toFixed(1)):null,last_at:new Date().toISOString()};
    const name=String(local?.name||''),type=String(local?.type||'').toUpperCase();
    const threat=!!local&&(/TORNADO|HURRICANE|FLOOD|WIND|HAIL|LIGHTNING/.test(type)||/storm|warning|advisory|rain/i.test(name));
    const wet=!!local&&(/rain|thunderstorm|hurricane|tropical|storm/i.test(name)||/HURRICANE|LIGHTNING/.test(type));
    storm=threat;
    const fx=ensureRainFx();fx.visible=wet;
    if(el){
      el.textContent=local?`LIVE · ${name} · ${Math.round(local._km)} km`:'LIVE WEATHER · NO NEARBY ACTIVE ALERT';
      el.classList.toggle('alert',!!local);
      el.title=local?`${local.source||'Public source'} · ${local.severity||''} · ${local.certainty||''}`:'No current source-labelled event within 80 km';
    }
    if(window.BP_HORIZON_V2)window.BP_HORIZON_V2.weather={...liveWeather};
  }catch(e){
    liveWeather={feed:false,event:null,distance_km:null,last_at:new Date().toISOString()};
    if(el)el.textContent='LIVE WEATHER · RETRYING';
  }
}
function updateWorldLight(t){dayPhase=(dayPhase+dtGlobal*.002)%1;const sunAmt=Math.max(.12,Math.sin(dayPhase*Math.PI));sun.intensity=storm?1.05:1.2+sunAmt*1.2;hemi.intensity=storm?.72:1.15+sunAmt*.55;scene.background.set(storm?0x454c49:(dayPhase>.15&&dayPhase<.85?0x738071:0x172028));scene.fog.color.copy(scene.background);scene.fog.density=storm?.00105:.00072;renderer.toneMappingExposure=storm?.68:.72+sunAmt*.35;$('time').textContent=dayPhase>.15&&dayPhase<.85?'DAY':'NIGHT';flashlight.intensity=flash?5.5:0}
let dtGlobal=0;
function updateCamera(dt){
  if(dead)return;
  pollGamepad();
  if(activeZipline)updateZipline(dt);
  else if(activeVehicle)updateVehicle(dt);
  else{
    const baseSpeed=crouched?2.45:(sprint?8.4:aiming?2.8:4.65),sp=baseSpeed*dt;
    const f=new THREE.Vector2(-Math.sin(yaw),Math.cos(yaw)),r=new THREE.Vector2(Math.cos(yaw),Math.sin(yaw));
    const dx=(f.x*moveY+r.x*moveX)*sp,dy=(f.y*moveY+r.y*moveX)*sp,nx=player.position.x+dx,ny=player.position.y+dy;
    if(!blocked(nx,player.position.y,.34))player.position.x=nx;
    if(!blocked(player.position.x,ny,.34))player.position.y=ny;
    let ground;
    if(interiorMode)ground=interiorGroundZ(player.position.x,player.position.y,player.position.z);
    else if(rooftopState){
      const e=rooftopState.entry,onRoof=e&&player.position.x>e.cx-e.w*.5&&player.position.x<e.cx+e.w*.5&&player.position.y>e.cy-e.d*.5&&player.position.y<e.cy+e.d*.5;
      if(onRoof)ground=e.baseZ+e.h+.18;else{rooftopState=null;ground=terrainZ(player.position.x,player.position.y);if(!airborne){airborne=true;verticalVelocity=-.5}}
    }else ground=terrainZ(player.position.x,player.position.y);
    if(airborne){player.position.z+=verticalVelocity*dt;verticalVelocity-=9.8*dt;if(player.position.z<=ground){player.position.z=ground;airborne=false;verticalVelocity=0}}
    else player.position.z=ground;
    if((Math.abs(moveX)+Math.abs(moveY))>.18&&!airborne)footstepAudio();
    player.rotation.z=yaw;
  }

  const bodyHeight=crouched?1.02:1.46,target=player.position.clone().add(new THREE.Vector3(0,0,bodyHeight));
  const look=target.clone().add(new THREE.Vector3(-Math.sin(yaw)*9,Math.cos(yaw)*9,pitch*8));
  player.children.forEach(ch=>{if(ch.userData?.playerBody)ch.visible=cameraMode!=='first'&&!activeVehicle});
  if(weaponRig)weaponRig.visible=cameraMode!=='first'&&!activeVehicle;
  if(fpWeaponRig)fpWeaponRig.visible=cameraMode==='first'&&!activeVehicle;

  if(activeVehicle){
    const v=activeVehicle,carTarget=v.root.position.clone().add(new THREE.Vector3(0,0,1.15)),back=new THREE.Vector3(Math.sin(yaw)*6,-Math.cos(yaw)*6,3.0),desired=carTarget.clone().add(back);
    camera.position.lerp(desired,Math.min(1,dt*7));camera.lookAt(carTarget.clone().add(new THREE.Vector3(-Math.sin(yaw)*8,Math.cos(yaw)*8,0)));
  }else if(cameraMode==='first'){
    const eye=target.clone().add(new THREE.Vector3(0,0,crouched ? .08 : .12));camera.position.lerp(eye,Math.min(1,dt*18));camera.lookAt(look);
    if(fpWeaponRig){fpWeaponRig.position.lerp(aiming?new THREE.Vector3(.04,-.18,-.55):new THREE.Vector3(.29,-.32,-.62),Math.min(1,dt*12));fpWeaponRig.rotation.y=THREE.MathUtils.lerp(fpWeaponRig.rotation.y,aiming?0:-.08,Math.min(1,dt*12))}
  }else{
    const arm=aiming?2.15:4.9,camZ=aiming?1.8:2.35+pitch*2.4,back=new THREE.Vector3(Math.sin(yaw)*arm,-Math.cos(yaw)*arm,camZ),desired=target.clone().add(back);
    let safe=desired.clone(),prev=target.clone();
    for(let i=1;i<=10;i++){const q=target.clone().lerp(desired,i/10);if(blocked(q.x,q.y,.18)&&!interiorMode){safe=prev;break}prev=q;safe=q}
    camera.position.lerp(safe,Math.min(1,dt*(aiming?13:8)));camera.lookAt(look);
    if(weaponRig){const tw=aiming?new THREE.Vector3(.18,.16,1.38):new THREE.Vector3(.38,.08,1.28);weaponRig.position.lerp(tw,Math.min(1,dt*10));weaponRig.rotation.z=THREE.MathUtils.lerp(weaponRig.rotation.z,aiming?-1.38:(activeWeapon().kind==='melee'?-.15:-Math.PI/2),Math.min(1,dt*10))}
  }
  const targetFov=aiming?50:(cameraMode==='first'?72:68);camera.fov=THREE.MathUtils.lerp(camera.fov,targetFov,Math.min(1,dt*12));camera.updateProjectionMatrix();
  $('reticle')?.classList.toggle('aiming',aiming);updateContext();
}
async function pollKillFeed(){
  if(!matchId||!playerId||!playerSecret)return;
  let seen=0;
  setInterval(async()=>{
    try{
      const out=await rpc('bridgepoint_horizon_kill_feed_v4310',{p_player_id:playerId,p_player_secret:playerSecret,p_match_id:matchId,p_limit:12});
      for(const e of [...(out?.feed||[])].reverse()){
        if(Number(e.id)<=seen)continue;seen=Math.max(seen,Number(e.id));
        if(e.type==='INFECTED_KILL'&&e.killer_player_id===playerId)continue;
        addKillFeed(e.killer_name||'WORLD',e.victim_name||e.type,e.weapon_key||'',!!e.headshot);
      }
    }catch{}
  },1500);
}
async function startSpectatorHeartbeat(){
  if(!matchId||!playerId||!playerSecret)return;
  const beat=()=>rpc('bridgepoint_horizon_spectator_heartbeat_v4310',{p_player_id:playerId,p_player_secret:playerSecret,p_match_id:matchId,p_alive:!dead}).catch(()=>{});
  beat();setInterval(beat,5000);
}
async function load(){
  const west=lon-span/111.32/2,east=lon+span/111.32/2,south=lat-span/110.54/2,north=lat+span/110.54/2,u=new URL(ENDPOINT);
  for(const [k,v] of Object.entries({lat,lon,west,east,south,north,state:stateCode,span_km:span,cell_id:'HORIZON_MATCH_'+(matchId||matchSeed)}))u.searchParams.set(k,String(v));
  const r=await fetch(u,{cache:'no-store',headers:{apikey:PUBLISHABLE_KEY}});
  if(!r.ok)throw new Error('world stream '+r.status);
  data=await r.json();if(!data?.complete)throw new Error(data?.error||'incomplete world stream');
  centerLon=(data.bbox.west+data.bbox.east)/2;centerLat=(data.bbox.south+data.bbox.north)/2;
  $('modeName').textContent=mode.replaceAll('_',' ');
  $('zone').textContent=(data?.resolved_jurisdiction?.state||stateCode)+' · '+(data?.resolved_jurisdiction?.name||data?.resolved_jurisdiction?.label||'WORLD CELL');
  addSky();addGround();
  const roads=addRoads(),parcels=addParcels(),water=addWater(),buildings=addBuildings(),buildingParts=addBuildingParts();
  addVegetation();addStreetLife();addAbandonment();const ziplineCount=buildZiplines(),vehicleCount=spawnVehicles(),disasterFx=addAmbientDisasterFx();
  await Promise.all([addSurvivor(),mode==='TDM'?spawnTdmBots():spawnInfected()]);
  updateAmmo();renderWeaponBar();pollKillFeed();startSpectatorHeartbeat();pollLiveWeather();setInterval(pollLiveWeather,30000);renderMinimap();
  loadText.textContent=`${buildings.toLocaleString()} source-backed structures · ${buildingParts.toLocaleString()} building parts · ${parcels.toLocaleString()} parcel outlines · ${roads.toLocaleString()} transport segments · ${ziplineCount} ziplines · ${vehicleCount} vehicles · restored traversal active`;
  window.BP_HORIZON_V2={ok:true,build:4330,mode,matchId,state:stateCode,buildings,buildingParts,parcels,roads,water,ziplines:ziplineCount,vehicles:vehicleCount,disasterFx,terrainSource:terrainInfo?.source||null,infected:infected.length,combatBots:combatants.length,playerTeam,mobileSafe:true,actualCharacterModel:true,sourceBackedTwin:true,exactFootprintCollision:true,liveWeather:true,weather:{...liveWeather},solidCollision:true,dwellPickup:true,killFeed:true,killcam:true,firstPerson:true,crouch:true,jumpVault:true,gamepad:true,weaponInventory:true,minimap:true,proceduralInteriors:true,roofTraversal:true,drivableVehicles:true,infectedPatrols:true,ambientDisasterFx:true};
}
function animate(){
  requestAnimationFrame(animate);
  const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;dtGlobal=dt;
  if(!dead){
    updateCamera(dt);updateDwellPickup(now);if(shooting)shootOnce();if(mode==='TDM')updateCombatants(dt,now);else updateInfected(dt,now);
    if(now-(killSnapshots.at(-1)?.t||0)>80)snapshotKillcam(now);
  }else{
    if(mode==='TDM')updateCombatants(dt,now);else updateInfected(dt,now);
  }
  updateWeatherFx(dt,now);updateAmbientDisasterFx(now);updateWorldLight(now);if((frames%6)===0)renderMinimap();renderer.render(scene,camera);
  frames++;if(now-fpsT>1200){
    const fps=Math.round(frames*1000/(now-fpsT));lastMeasuredFps=fps;$('fps').textContent=fps+' FPS';
    const floor=MOBILE?.58:.75,ceiling=Math.min(devicePixelRatio||1,HIGH_DEVICE?1.25:(MOBILE?.88:1.05));
    if(fps<46){perfLowStreak++;perfHighStreak=0}else if(fps>57){perfHighStreak++;perfLowStreak=0}else{perfLowStreak=Math.max(0,perfLowStreak-1);perfHighStreak=0}
    let next=renderScale;
    if(perfLowStreak>=1)next=Math.max(floor,renderScale-.1);
    else if(perfHighStreak>=3)next=Math.min(ceiling,renderScale+.05);
    if(Math.abs(next-renderScale)>.02){renderScale=next;renderer.setPixelRatio(renderScale);renderer.setSize(innerWidth,innerHeight,false)}
    if(fps<39&&renderer.shadowMap.enabled){renderer.shadowMap.enabled=false;sun.castShadow=false}
    else if(fps>58&&HIGH_DEVICE&&!renderer.shadowMap.enabled){renderer.shadowMap.enabled=true;sun.castShadow=true}
    frames=0;fpsT=now;
  }
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(renderScale);renderer.setSize(innerWidth,innerHeight,false)});let looking=false,lx=0,ly=0;renderer.domElement.addEventListener('pointerdown',e=>{if(e.clientX<innerWidth*.4)return;looking=true;lx=e.clientX;ly=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(!looking)return;const dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;yaw-=dx*.006;pitch=Math.max(-.42,Math.min(.32,pitch-dy*.0035))});renderer.domElement.addEventListener('pointerup',()=>looking=false);
const pad=$('movePad'),knob=$('moveKnob');let pid=null;function padMove(e){const q=pad.getBoundingClientRect(),dx=e.clientX-(q.left+q.width/2),dy=e.clientY-(q.top+q.height/2),m=q.width*.34,l=Math.hypot(dx,dy)||1,s=Math.min(1,m/l),x=dx*s,y=dy*s;knob.style.transform=`translate(${x}px,${y}px)`;touchMoveX=x/m;touchMoveY=-y/m;moveX=Math.max(-1,Math.min(1,touchMoveX+keyMoveX));moveY=Math.max(-1,Math.min(1,touchMoveY+keyMoveY))}pad.addEventListener('pointerdown',e=>{pid=e.pointerId;pad.setPointerCapture(pid);padMove(e)});pad.addEventListener('pointermove',e=>{if(e.pointerId===pid)padMove(e)});const endPad=e=>{if(e&&pid!==null&&e.pointerId!==pid)return;pid=null;touchMoveX=touchMoveY=0;moveX=keyMoveX;moveY=keyMoveY;knob.style.transform='translate(0,0)'};pad.addEventListener('pointerup',endPad);pad.addEventListener('pointercancel',endPad);pad.addEventListener('lostpointercapture',endPad);$('runBtn').addEventListener('pointerdown',()=>{sprint=true;$('runBtn').classList.add('active')});
$('runBtn').addEventListener('pointerup',()=>{sprint=false;$('runBtn').classList.remove('active')});
$('runBtn').addEventListener('pointercancel',()=>{sprint=false;$('runBtn').classList.remove('active')});
$('aimBtn').addEventListener('click',()=>{aiming=!aiming;sprint=false;$('aimBtn').classList.toggle('active',aiming);toast(aiming?'Aim locked':'Hip fire')});
const shootOn=()=>{shooting=true;$('shootBtn').classList.add('active');shootOnce()},shootOff=()=>{shooting=false;$('shootBtn').classList.remove('active')};
$('shootBtn').addEventListener('pointerdown',shootOn);$('shootBtn').addEventListener('pointerup',shootOff);$('shootBtn').addEventListener('pointercancel',shootOff);$('shootBtn').addEventListener('lostpointercapture',shootOff);
$('buildBtn').addEventListener('click',buildCover);
$('contextBtn')?.addEventListener('click',contextUse);
$('viewBtn')?.addEventListener('click',cycleCameraMode);
$('crouchBtn')?.addEventListener('click',toggleCrouch);
$('jumpBtn')?.addEventListener('click',jumpOrVault);
$('weaponBtn')?.addEventListener('click',cycleWeapon);
$('dropBtn')?.addEventListener('click',dropActiveWeapon);
$('skipKillcam').addEventListener('click',finishDeathFlow);
const keys={};
addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(e.code==='KeyQ'){aiming=!aiming;$('aimBtn').classList.toggle('active',aiming)}
  if(e.code==='KeyR')reload();
  if(e.code==='KeyB')buildCover();
  if(e.code==='KeyT')flash=!flash;
  if(e.code==='KeyV')cycleCameraMode();
  if(e.code==='KeyC')toggleCrouch();
  if(e.code==='KeyF'||e.code==='KeyE')contextUse();
  if(e.code==='KeyX')dropActiveWeapon();
  if(e.code==='KeyG')cycleWeapon();
  if(/^Digit[1-5]$/.test(e.code))equipWeaponIndex(Number(e.code.slice(-1))-1);
  if(e.code==='Space'){if(dead)finishDeathFlow();else jumpOrVault();e.preventDefault()}
});
addEventListener('keyup',e=>keys[e.code]=false);
renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===0&&e.pointerType==='mouse')shootOn()});
renderer.domElement.addEventListener('pointerup',e=>{if(e.button===0&&e.pointerType==='mouse')shootOff()});renderer.domElement.addEventListener('wheel',e=>{cycleWeapon();e.preventDefault()},{passive:false});
setInterval(()=>{
  keyMoveX=(keys.KeyD?1:0)-(keys.KeyA?1:0);keyMoveY=(keys.KeyW?1:0)-(keys.KeyS?1:0);
  moveX=Math.max(-1,Math.min(1,touchMoveX+keyMoveX));moveY=Math.max(-1,Math.min(1,touchMoveY+keyMoveY));
  sprint=!!(keys.ShiftLeft||keys.ShiftRight);
},16);
load().then(animate).catch(fail);