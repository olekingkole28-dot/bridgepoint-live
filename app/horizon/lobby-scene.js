import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import {clone as skeletonClone} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js';

const POS=[-2.55,-.85,.85,2.55];
const loader=new GLTFLoader();

function loadGltf(url){
  return new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject));
}
function tintModel(root,variant=1,zombie=false){
  root.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    if(o.material){
      const mats=Array.isArray(o.material)?o.material:[o.material];
      o.material=mats.map(m=>{
        const n=m.clone();
        if(n.color){
          if(zombie)n.color.multiply(new THREE.Color(0.38,0.52,0.38));
          else if(variant===2)n.color.multiply(new THREE.Color(0.70,0.78,0.95));
        }
        n.roughness=Math.min(1,(n.roughness??.72)+.06);
        return n;
      });
      if(o.material.length===1)o.material=o.material[0];
    }
  });
}

export function createLobbyScene(canvas){
  const mobile=/Android|iPhone|iPad/i.test(navigator.userAgent);
  const mem=Number(navigator.deviceMemory||0),cores=Number(navigator.hardwareConcurrency||0);
  const high=(!mobile)||(mem>=8&&cores>=8);
  let currentDpr=Math.min(high?1.65:1.15,window.devicePixelRatio||1);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:high,alpha:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;

  const scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2(0x07100d,.052);
  const camera=new THREE.PerspectiveCamera(42,1,.1,90);
  camera.position.set(0,2.15,8.6);
  camera.lookAt(0,1.3,0);

  const hemi=new THREE.HemisphereLight(0x9cd8c5,0x190d08,1.2);scene.add(hemi);
  const moon=new THREE.DirectionalLight(0xaad9ff,2.2);moon.position.set(-5,8,4);moon.castShadow=true;scene.add(moon);
  const ember=new THREE.PointLight(0xff572e,50,18,1.7);ember.position.set(4.5,1.5,-4);scene.add(ember);
  const mint=new THREE.PointLight(0x4af2bd,35,12,2);mint.position.set(-4,1.1,1);scene.add(mint);

  const tex=new THREE.TextureLoader();
  const dirt=tex.load('/app/horizon-playable/assets/pbr/polyhaven/dirt_diff_1k.jpg');
  const dirtN=tex.load('/app/horizon-playable/assets/pbr/polyhaven/dirt_nor_gl_1k.jpg');
  const dirtR=tex.load('/app/horizon-playable/assets/pbr/polyhaven/dirt_rough_1k.jpg');
  for(const t of [dirt,dirtN,dirtR]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(14,14)}
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(42,30),new THREE.MeshStandardMaterial({map:dirt,normalMap:dirtN,roughnessMap:dirtR,roughness:.95,color:0x655649}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.02;ground.receiveShadow=true;scene.add(ground);

  const pedestalMat=new THREE.MeshStandardMaterial({color:0x10231d,emissive:0x1acb97,emissiveIntensity:.38,roughness:.42,metalness:.2});
  const pedestals=POS.map(x=>{
    const p=new THREE.Mesh(new THREE.CylinderGeometry(.58,.74,.06,48),pedestalMat.clone());
    p.position.set(x,.03,.25);p.receiveShadow=true;scene.add(p);return p;
  });

  const wreckMat=new THREE.MeshStandardMaterial({color:0x3a332e,roughness:.9,metalness:.12});
  for(let i=0;i<14;i++){
    const g=i%3===0?new THREE.CylinderGeometry(.18,.2,.65,14):new THREE.BoxGeometry(.55+.3*Math.random(),.28+.4*Math.random(),.35+.5*Math.random());
    const m=new THREE.Mesh(g,wreckMat.clone());
    m.position.set((Math.random()-.5)*18,.2+(i%3===0?.32:.15),-2-Math.random()*8);
    m.rotation.set(Math.random()*.3,Math.random()*Math.PI,Math.random()*.15);m.castShadow=true;m.receiveShadow=true;scene.add(m);
  }
  const ribMat=new THREE.MeshStandardMaterial({color:0x211d19,roughness:1});
  for(let i=0;i<9;i++){
    const wall=new THREE.Mesh(new THREE.BoxGeometry(.12,1.2+Math.random()*1.8,2.2+Math.random()*2.5),ribMat);
    wall.position.set(-9+i*2.3,.65,-7-Math.random()*3);wall.rotation.y=(Math.random()-.5)*.35;scene.add(wall);
  }

  const dustGeo=new THREE.BufferGeometry();
  const count=320,arr=new Float32Array(count*3);
  for(let i=0;i<count;i++){arr[i*3]=(Math.random()-.5)*28;arr[i*3+1]=Math.random()*7;arr[i*3+2]=-12+Math.random()*18}
  dustGeo.setAttribute('position',new THREE.BufferAttribute(arr,3));
  const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xd6a06c,size:.035,transparent:true,opacity:.38,depthWrite:false}));
  scene.add(dust);

  const playerGroup=new THREE.Group();scene.add(playerGroup);
  const slotGroup=new THREE.Group();scene.add(slotGroup);
  const zombieGroup=new THREE.Group();scene.add(zombieGroup);
  const cache=new Map();
  let catalog=new Map(),party=[],models=[],zombies=[],destroyed=false;

  async function modelFor(charKey,zombie=false){
    const c=catalog.get(charKey)||catalog.values().next().value;
    if(!c)return null;
    const key=c.model_path;
    let asset=cache.get(key);
    if(!asset){asset=await loadGltf(key);cache.set(key,asset)}
    const root=skeletonClone(asset.scene);
    tintModel(root,Number(c.outfit_variant||1),zombie);
    root.traverse(o=>{if(o.isMesh){o.frustumCulled=false}});
    return root;
  }

  function addOpenSlot(i){
    const g=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.42,.025,12,48),new THREE.MeshStandardMaterial({color:0x56f4c3,emissive:0x1f8f71,emissiveIntensity:.75,transparent:true,opacity:.55,metalness:.25,roughness:.3}));
    ring.rotation.x=Math.PI/2;g.add(ring);
    const v=new THREE.Mesh(new THREE.BoxGeometry(.04,.04,.5),new THREE.MeshBasicMaterial({color:0xa5ffe4,transparent:true,opacity:.8}));
    const h=new THREE.Mesh(new THREE.BoxGeometry(.5,.04,.04),v.material.clone());g.add(v,h);
    g.position.set(POS[i],1.08,.22);slotGroup.add(g);
  }
  async function rebuildPlayers(){
    while(playerGroup.children.length)playerGroup.remove(playerGroup.children[0]);
    while(slotGroup.children.length)slotGroup.remove(slotGroup.children[0]);
    models=[];
    const token=Symbol();rebuildPlayers.token=token;
    for(let i=0;i<4;i++){
      const m=party.find(x=>Number(x.slot)===i+1);
      if(!m){addOpenSlot(i);continue}
      try{
        const root=await modelFor(m.avatar_key,false);
        if(rebuildPlayers.token!==token||!root)return;
        root.scale.setScalar(1.02);
        root.position.set(POS[i],.06,.18);
        root.rotation.y=Math.PI;
        playerGroup.add(root);
        models.push({root,slot:i,phase:i*.9});
      }catch(e){console.warn('Lobby character load',e)}
    }
  }

  async function ensureZombies(){
    if(zombies.length||!catalog.size)return;
    const keys=[...catalog.keys()];
    for(let i=0;i<9;i++){
      try{
        const root=await modelFor(keys[i%Math.min(keys.length,5)],true);
        if(!root)return;
        const scale=.72+Math.random()*.22;root.scale.setScalar(scale);
        root.position.set(-9+Math.random()*18,.03,-4-Math.random()*7);
        root.rotation.y=Math.random()*Math.PI*2;
        zombieGroup.add(root);
        zombies.push({root,speed:.18+Math.random()*.16,dir:Math.random()<.5?-1:1,phase:Math.random()*10,z:-4-Math.random()*6});
      }catch{}
    }
  }

  function setCatalog(chars){
    catalog=new Map((chars||[]).map(c=>[c.character_key,c]));
    ensureZombies();rebuildPlayers();
  }
  function setParty(next){party=(next||[]).slice().sort((a,b)=>a.slot-b.slot);rebuildPlayers()}

  const clock=new THREE.Clock();
  let perfFrames=0,perfAt=performance.now(),lastFps=60;
  function resize(){
    const r=canvas.getBoundingClientRect();renderer.setPixelRatio(currentDpr);renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);
    camera.aspect=Math.max(.1,r.width/Math.max(1,r.height));camera.updateProjectionMatrix();
  }
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();

  function frame(){
    if(destroyed)return;
    const t=clock.getElapsedTime(),dt=Math.min(.033,clock.getDelta()||.016);
    camera.position.x=Math.sin(t*.11)*.14;camera.position.y=2.16+Math.sin(t*.16)*.025;camera.lookAt(0,1.32,.1);
    ember.intensity=42+Math.sin(t*3.7)*6+Math.sin(t*7.1)*3;
    dust.rotation.y=t*.006;dust.position.x=Math.sin(t*.08)*.45;
    models.forEach(({root,phase})=>{root.position.y=.06+Math.sin(t*1.2+phase)*.012;root.rotation.y=Math.PI+Math.sin(t*.35+phase)*.015});
    zombies.forEach((z,i)=>{
      z.root.position.x+=z.speed*z.dir*dt;
      if(Math.abs(z.root.position.x)>10){z.dir*=-1;z.root.rotation.y=z.dir>0?Math.PI/2:-Math.PI/2}
      z.root.rotation.z=Math.sin(t*2.1+z.phase)*.025;
      z.root.position.y=.02+Math.abs(Math.sin(t*2.5+z.phase))*.025;
    });
    slotGroup.children.forEach((g,i)=>{g.rotation.z=t*.18+i*.3;g.position.z=.22+Math.sin(t*1.7+i)*.025});
    renderer.render(scene,camera);
    perfFrames++;
    const now=performance.now();
    if(now-perfAt>1800){
      const fps=perfFrames*1000/(now-perfAt);lastFps=fps;
      const floor=mobile?.7:.85,ceiling=Math.min(high?1.65:1.15,window.devicePixelRatio||1);
      let next=currentDpr;
      if(fps<48)next=Math.max(floor,currentDpr-.12);
      else if(fps>58)next=Math.min(ceiling,currentDpr+.06);
      if(Math.abs(next-currentDpr)>.02){currentDpr=next;resize()}
      if(mobile)zombieGroup.visible=fps>=42;
      perfFrames=0;perfAt=now;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return{setCatalog,setParty,getStats:()=>({models:models.length,openSlots:slotGroup.children.length,zombies:zombieGroup.children.length,fps:Math.round(lastFps),dpr:Number(currentDpr.toFixed(2)),mobile,high}),destroy(){destroyed=true;ro.disconnect();renderer.dispose()}};
}
