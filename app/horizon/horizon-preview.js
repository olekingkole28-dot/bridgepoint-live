import * as THREE from 'three';

const ENDPOINT='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-horizon-stream-v3020';
const $=id=>document.getElementById(id);
const presets={
  city:{label:'DENSE CITY TEST CELL',title:'Manhattan after collapse.',sub:'Real Manhattan streets and building footprints with vertical density, abandoned traffic, rooftop detail, debris, haze and survival atmosphere.',lat:40.7580,lon:-73.9855,state:'NY',span:1.45,profile:'city'},
  mountain:{label:'MOUNTAIN TOWN TEST CELL',title:'Aspen surrounded by the Rockies.',sub:'Real Aspen geometry inside a steep alpine survival backdrop with pine forest, snow-tipped peaks, colder fog and scattered structures.',lat:39.1911,lon:-106.8175,state:'CO',span:1.65,profile:'mountain'},
  coastal:{label:'WATERFRONT SUBURB TEST CELL',title:'Seattle suburbs at the waterline.',sub:'Real Seattle-area streets and structures mixed with residential blocks, trees, hills, shoreline water, abandoned vehicles and distant skyline.',lat:47.6686,lon:-122.3869,state:'WA',span:1.8,profile:'coastal'}
};

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x7b8790);
scene.fog=new THREE.FogExp2(0x738087,.00058);
const camera=new THREE.PerspectiveCamera(67,innerWidth/innerHeight,.08,3500);
camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.9;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$('world').appendChild(renderer.domElement);

const world=new THREE.Group();scene.add(world);
const skyGroup=new THREE.Group();scene.add(skyGroup);
const hemi=new THREE.HemisphereLight(0xbfd2d8,0x24302b,1.45);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffdfad,2.15);sun.position.set(-220,-160,280);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const player=new THREE.Group();scene.add(player);
player.add(camera);camera.position.set(0,0,1.72);

let activeKey='city',active=presets.city,centerLat=active.lat,centerLon=active.lon;
let yaw=.28,pitch=-.09,moveX=0,moveY=0,sprinting=false,storm=false,night=false,last=performance.now(),fpsFrames=0,fpsT=performance.now();
let infected=[];
let hasRenderedScene=false;
const sceneCache=new Map();
const retryTimers=new Map();
const keyState=new Set();
const randSeed=s=>{let n=s>>>0;return()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296)};
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const mat=(color,rough=.86,metal=.02)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
const project=c=>new THREE.Vector2((c[0]-centerLon)*111320*Math.cos(centerLat*Math.PI/180),(c[1]-centerLat)*110540);
const lines=g=>!g?[]:g.type==='LineString'?[g.coordinates||[]]:g.type==='MultiLineString'?(g.coordinates||[]):[];
const rings=g=>!g?[]:g.type==='Polygon'?[g.coordinates?.[0]||[]]:g.type==='MultiPolygon'?(g.coordinates||[]).map(x=>x?.[0]||[]):[];

function clearGroup(g){while(g.children.length){const o=g.children.pop();o.traverse?.(x=>{x.geometry?.dispose?.();if(Array.isArray(x.material))x.material.forEach(m=>m.dispose?.());else x.material?.dispose?.()})}}
function roadStrip(a,b,w,color,z=.025){const len=a.distanceTo(b);if(len<2)return;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,len),mat(color,.98,0));mesh.position.set((a.x+b.x)/2,(a.y+b.y)/2,z);mesh.rotation.z=Math.atan2(b.y-a.y,b.x-a.x)-Math.PI/2;mesh.receiveShadow=true;world.add(mesh)}
function addGround(profile,r){const size=active.span*1800;let groundColor=profile==='mountain'?0x46523f:profile==='coastal'?0x566653:0x50584f;const g=new THREE.Mesh(new THREE.PlaneGeometry(size,size),mat(groundColor,1,0));g.receiveShadow=true;world.add(g);for(let i=0;i<600;i++){const p=new THREE.Mesh(new THREE.CircleGeometry(.8+r()*3.2,6),mat(profile==='mountain'?0x394837:0x424d40,1,0));p.position.set((r()-.5)*size,(r()-.5)*size,.01);p.scale.y=.45+r()*1.5;world.add(p)}if(profile==='coastal'){const water=new THREE.Mesh(new THREE.PlaneGeometry(1600,2000),new THREE.MeshStandardMaterial({color:0x315765,roughness:.22,metalness:.08,transparent:true,opacity:.93}));water.position.set(-1050,0,.045);world.add(water);for(let i=0;i<18;i++){const foam=new THREE.Mesh(new THREE.PlaneGeometry(2+r()*7,180+r()*180),new THREE.MeshBasicMaterial({color:0xa5cbd0,transparent:true,opacity:.17}));foam.position.set(-320-i*18,(r()-.5)*700,.055);world.add(foam)}}}
function addMountains(profile,r){if(profile==='city')return;const count=profile==='mountain'?34:18;const radius=profile==='mountain'?780:950;for(let i=0;i<count;i++){const ang=i/count*Math.PI*2+(r()-.5)*.2,dist=radius+r()*520,h=(profile==='mountain'?160:70)+r()*(profile==='mountain'?390:160),base=(profile==='mountain'?120:160)+r()*170;const mountain=new THREE.Mesh(new THREE.ConeGeometry(base,h,5+Math.floor(r()*3)),mat(profile==='mountain'?0x48534a:0x536157,1,0));mountain.position.set(Math.cos(ang)*dist,Math.sin(ang)*dist,h/2-5);mountain.rotation.z=r()*.35;world.add(mountain);if(profile==='mountain'&&h>330){const cap=new THREE.Mesh(new THREE.ConeGeometry(base*.47,h*.27,5),mat(0xc7d0cb,.98,0));cap.position.set(mountain.position.x,mountain.position.y,h*.86);world.add(cap)}}}
function addClouds(r){for(let i=0;i<24;i++){const g=new THREE.Group();for(let j=0;j<4;j++){const c=new THREE.Mesh(new THREE.SphereGeometry(15+r()*25,8,5),new THREE.MeshStandardMaterial({color:storm?0x4c555b:0xa6afb0,transparent:true,opacity:storm?.56:.34,roughness:1}));c.scale.z=.22;c.position.set((j-1.5)*18,(r()-.5)*14,(r()-.5)*5);g.add(c)}g.position.set((r()-.5)*1200,(r()-.5)*1000,130+r()*150);skyGroup.add(g)}}
function addRoads(data){let count=0;for(const row of data.transport||[]){for(const line of lines(row.geometry)){for(let i=1;i<line.length;i++){const a=project(line[i-1]),b=project(line[i]);const len=a.distanceTo(b);if(len<3||len>900)continue;const w=Math.max(5,Math.min(13,Number(row.width_m||7)));roadStrip(a,b,w,0x24292c,.03);if(count%2===0)roadStrip(a,b,.12,0xd1b86e,.045);count++;if(count>1300)return count}}}return count}
function addBuildings(data,profile){let count=0;for(const row of data.buildings||[]){for(const ring of rings(row.geometry)){if(ring.length<4)continue;const pts=ring.map(project),xs=pts.map(q=>q.x),ys=pts.map(q=>q.y),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),w=maxx-minx,d=maxy-miny;if(w<2||d<2||w>180||d>180)continue;const id=String(row.id||count),base=Number(row.height_m||0);let h=base>2?base:5+(hash(id)%145)/10;if(profile==='city'&&h<22&&hash(id)%4===0)h=28+(hash(id+'tower')%550)/10;if(profile!=='city')h=Math.min(h,42);h=Math.min(profile==='city'?180:70,h);const cx=(minx+maxx)/2,cy=(miny+maxy)/2;const colors=profile==='city'?[0x625f5b,0x77756f,0x565d5d,0x716356]:profile==='mountain'?[0x6f6255,0x786b5d,0x5f645b]:[0x746b61,0x67706c,0x806f61];const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,d,h),mat(colors[hash(id)%colors.length],.82,.04));mesh.position.set(cx,cy,h/2+.07);mesh.castShadow=mesh.receiveShadow=true;world.add(mesh);if(count<360){const roof=new THREE.Mesh(new THREE.BoxGeometry(w*.93,d*.93,.18),mat(0x353a38,.88,.05));roof.position.set(cx,cy,h+.12);world.add(roof)}if(count<220){const floors=Math.min(12,Math.max(1,Math.floor(h/3.1))),cols=Math.min(7,Math.max(2,Math.floor(w/4)));const wm=new THREE.MeshBasicMaterial({color:night?0xd8b36b:0x243437});for(let f=0;f<floors;f+=Math.max(1,Math.floor(floors/6)))for(let c=1;c<=cols;c++){if(hash(id+f+c)%5===0)continue;const win=new THREE.Mesh(new THREE.PlaneGeometry(.9,.55),wm);win.position.set(cx-w/2+c*w/(cols+1),cy-d/2-.015,1.6+f*3.1);win.rotation.x=Math.PI/2;world.add(win)}}count++;if(count>=900)return count}}return count}
function addTrees(profile,r){const n=profile==='mountain'?620:profile==='coastal'?420:130;for(let i=0;i<n;i++){const x=(r()-.5)*active.span*1400,y=(r()-.5)*active.span*1400;if(profile==='city'&&Math.hypot(x,y)<220)continue;const h=(profile==='mountain'?5:4)+r()*(profile==='mountain'?12:8);const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.11,.2,h,5),mat(0x4c3828,1,0));trunk.position.set(x,y,h/2);world.add(trunk);const crown=new THREE.Mesh(profile==='mountain'?new THREE.ConeGeometry(1.4+r()*1.6,3+r()*4,7):new THREE.DodecahedronGeometry(1.1+r()*1.4,0),mat(profile==='mountain'?0x2e4737:0x38503b,1,0));crown.position.set(x,y,h+1.4);world.add(crown)}}
function addStreetDecay(profile,r){const vehicleN=profile==='city'?75:45;for(let i=0;i<vehicleN;i++){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(3.8,1.7,.72),mat([0x55473f,0x38494a,0x65423b,0x4d5049][i%4],.84,.18));body.position.z=.5;g.add(body);const cab=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.45,.62),mat(0x263436,.35,.22));cab.position.set(.1,0,1.04);g.add(cab);g.position.set((r()-.5)*620,(r()-.5)*620,.04);g.rotation.z=r()*Math.PI*2;world.add(g)}for(let i=0;i<260;i++){const debris=new THREE.Mesh(new THREE.BoxGeometry(.12+r()*.8,.12+r()*.8,.06+r()*.28),mat(0x50473e,1,.02));debris.position.set((r()-.5)*780,(r()-.5)*780,.1);debris.rotation.set(r()*3,r()*3,r()*6);world.add(debris)}}
function addInfected(profile,r){infected=[];const n=profile==='city'?34:profile==='mountain'?18:24;for(let i=0;i<n;i++){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.27,.78,4,6),mat(0x343a34,.95,0));body.rotation.x=Math.PI/2;body.position.z=.92;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.21,8,6),mat(0x737766,.92,0));head.position.z=1.68;g.add(head);g.position.set((r()-.5)*380,(r()-.5)*380,0);world.add(g);infected.push({g,phase:r()*6.28,s:.35+r()*.4})}$('infectedCount').textContent=n}
function applyLighting(){if(night){scene.background.set(storm?0x111820:0x14203b);scene.fog.color.set(storm?0x171d22:0x1a2730);hemi.intensity=.36;sun.intensity=.22;renderer.toneMappingExposure=.72}else{scene.background.set(storm?0x485159:active.profile==='mountain'?0x849096:0x7b8790);scene.fog.color.set(storm?0x4d565b:active.profile==='mountain'?0x7b878a:0x738087);hemi.intensity=storm?.82:1.45;sun.intensity=storm?.75:2.15;renderer.toneMappingExposure=storm?.72:.9}}
async function fetchSceneData(key,target){
  if(sceneCache.has(key))return sceneCache.get(key);
  let lastError=null;
  for(let attempt=0;attempt<3;attempt++){
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),24000);
    try{
      const u=new URL(ENDPOINT);
      u.searchParams.set('lat',target.lat);
      u.searchParams.set('lon',target.lon);
      u.searchParams.set('span_km',target.span);
      u.searchParams.set('state',target.state);
      u.searchParams.set('cell_id','HORIZON_TEST_'+target.state+'_'+key.toUpperCase());
      const res=await fetch(u,{cache:'no-store',signal:ctrl.signal});
      const text=await res.text();
      let body=null;
      try{body=text?JSON.parse(text):null}catch(_){throw new Error('World stream returned invalid data');}
      if(!res.ok||!body)throw new Error(body?.error||`World stream ${res.status}`);
      const data=body.scene||body.data||body;
      if(!data||(!Array.isArray(data.buildings)&&!Array.isArray(data.transport)))throw new Error('World stream did not contain scene geometry');
      sceneCache.set(key,data);
      return data;
    }catch(e){
      lastError=e;
      if(attempt<2)await new Promise(resolve=>setTimeout(resolve,650*(attempt+1)));
    }finally{
      clearTimeout(timer);
    }
  }
  throw lastError||new Error('World stream unavailable');
}
function applySceneMeta(key,target){
  activeKey=key;active=target;centerLat=target.lat;centerLon=target.lon;
  document.querySelectorAll('.scene').forEach(b=>b.classList.toggle('active',b.dataset.scene===key));
  $('eyebrow').textContent=target.label;$('title').textContent=target.title;$('sub').textContent=target.sub;
}
function buildSceneFromData(key,target,data){
  applySceneMeta(key,target);
  clearGroup(world);clearGroup(skyGroup);infected=[];player.position.set(0,0,0);
  const r=randSeed(hash(key+'4203'));
  addGround(target.profile,r);addMountains(target.profile,r);addClouds(r);applyLighting();
  const roads=addRoads(data);
  const buildings=addBuildings(data,target.profile);
  addTrees(target.profile,r);addStreetDecay(target.profile,r);addInfected(target.profile,r);
  $('buildingCount').textContent=buildings.toLocaleString();$('roadCount').textContent=roads.toLocaleString();
  hasRenderedScene=true;
}
function buildOfflineFallback(key,target,reason){
  applySceneMeta(key,target);
  clearGroup(world);clearGroup(skyGroup);infected=[];player.position.set(0,0,0);
  const r=randSeed(hash(key+'4203-fallback'));
  addGround(target.profile,r);addMountains(target.profile,r);addClouds(r);applyLighting();
  addTrees(target.profile,r);addStreetDecay(target.profile,r);addInfected(target.profile,r);
  $('buildingCount').textContent='0';$('roadCount').textContent='0';
  $('sub').textContent=target.sub+' Live source-backed geometry is reconnecting; temporary local fallback dressing is shown.';
  hasRenderedScene=true;
  console.warn('Horizon geometry fallback:',reason);
}
async function loadScene(key,{force=false}={}){
  const target=presets[key]||presets.city;
  if(force)sceneCache.delete(key);
  $('loading').classList.remove('hide');$('error').hidden=true;
  $('loadText').textContent='Streaming real-world roads and building footprints…';
  try{
    const data=await fetchSceneData(key,target);
    $('loadText').textContent='Building structures, survival dressing and atmosphere…';
    await new Promise(requestAnimationFrame);
    buildSceneFromData(key,target,data);
    $('loading').classList.add('hide');$('error').hidden=true;
    const pending=retryTimers.get(key);if(pending){clearTimeout(pending);retryTimers.delete(key)}
  }catch(e){
    console.warn('Horizon scene load failed:',e);
    $('loading').classList.add('hide');
    if(!hasRenderedScene){
      buildOfflineFallback(key,target,String(e?.message||e));
      if(!retryTimers.has(key)){
        const timer=setTimeout(()=>{retryTimers.delete(key);loadScene(key,{force:true})},3200);
        retryTimers.set(key,timer);
      }
    }else{
      $('error').hidden=true;
    }
  }
}

function updateMovement(dt,t){let x=moveX,y=moveY;if(keyState.has('KeyW'))y+=1;if(keyState.has('KeyS'))y-=1;if(keyState.has('KeyA'))x-=1;if(keyState.has('KeyD'))x+=1;const l=Math.hypot(x,y)||1;x/=l;y/=l;const speed=(sprinting||keyState.has('ShiftLeft')?13:6.5)*dt;const fwd=new THREE.Vector2(Math.sin(yaw),Math.cos(yaw)),right=new THREE.Vector2(Math.cos(yaw),-Math.sin(yaw));player.position.x+=(fwd.x*y+right.x*x)*speed;player.position.y+=(fwd.y*y+right.y*x)*speed;const max=active.span*620;player.position.x=Math.max(-max,Math.min(max,player.position.x));player.position.y=Math.max(-max,Math.min(max,player.position.y));player.rotation.z=-yaw;camera.rotation.x=Math.PI/2+pitch;for(const z of infected){z.g.position.x+=Math.sin(t*.00035+z.phase)*z.s*dt;z.g.position.y+=Math.cos(t*.00031+z.phase)*z.s*dt}}
function loop(t){const dt=Math.min(.05,(t-last)/1000);last=t;updateMovement(dt,t);renderer.render(scene,camera);fpsFrames++;if(t-fpsT>700){$('fps').textContent=Math.round(fpsFrames*1000/(t-fpsT));fpsFrames=0;fpsT=t}requestAnimationFrame(loop)}

window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
window.addEventListener('keydown',e=>keyState.add(e.code));window.addEventListener('keyup',e=>keyState.delete(e.code));
let looking=false,lastX=0,lastY=0;renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.clientX<innerWidth*.42)return;looking=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(!looking)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;yaw-=dx*.0042;pitch=Math.max(-1.05,Math.min(.75,pitch-dy*.0035))});renderer.domElement.addEventListener('pointerup',()=>looking=false);renderer.domElement.addEventListener('pointercancel',()=>looking=false);
const pad=$('movePad'),knob=$('moveKnob');let padId=null;function padMove(e){const r=pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,d=Math.min(40,Math.hypot(dx,dy)),a=Math.atan2(dy,dx);const kx=Math.cos(a)*d,ky=Math.sin(a)*d;knob.style.transform=`translate(${kx}px,${ky}px)`;moveX=kx/40;moveY=-ky/40}pad.addEventListener('pointerdown',e=>{padId=e.pointerId;pad.setPointerCapture(e.pointerId);padMove(e)});pad.addEventListener('pointermove',e=>{if(e.pointerId===padId)padMove(e)});function padEnd(e){if(e.pointerId!==padId)return;padId=null;moveX=moveY=0;knob.style.transform=''}pad.addEventListener('pointerup',padEnd);pad.addEventListener('pointercancel',padEnd);
$('sprintBtn').addEventListener('pointerdown',()=>sprinting=true);$('sprintBtn').addEventListener('pointerup',()=>sprinting=false);$('sprintBtn').addEventListener('pointercancel',()=>sprinting=false);
document.querySelectorAll('.scene').forEach(b=>b.addEventListener('click',()=>loadScene(b.dataset.scene)));
$('weatherBtn').addEventListener('click',()=>{storm=!storm;$('weatherBtn').textContent=storm?'CLEAR':'STORM';clearGroup(skyGroup);addClouds(randSeed(hash(activeKey+'weather'+storm)));applyLighting()});
$('lightBtn').addEventListener('click',()=>{night=!night;$('lightBtn').textContent=night?'DAY':'NIGHT';applyLighting()});
$('retryBtn').addEventListener('click',()=>loadScene(activeKey,{force:true}));

loadScene('city');requestAnimationFrame(loop);
window.__BP_HORIZON_PREVIEW__=()=>({build:4203,scene:activeKey,profile:active.profile,lat:active.lat,lon:active.lon,storm,night,buildings:Number(($('buildingCount').textContent||'0').replaceAll(',',''))||0,roads:Number(($('roadCount').textContent||'0').replaceAll(',',''))||0,infected:infected.length,errorHidden:$('error').hidden});