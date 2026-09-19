import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import {clone as skeletonClone} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js';
import {makeHorizonRifle} from './cosmetics-v4320.js';

const loader=new GLTFLoader();
const cache=new Map();

async function asset(url){
  if(!cache.has(url))cache.set(url,new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject)));
  return cache.get(url);
}
function applyVariant(root,variant=1){
  root.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    const mats=Array.isArray(o.material)?o.material:[o.material].filter(Boolean);
    if(!mats.length)return;
    const next=mats.map(m=>{
      const n=m.clone();
      if(variant===2&&n.color)n.color.multiply(new THREE.Color(.72,.78,.95));
      n.roughness=Math.min(1,(n.roughness??.7)+.04);
      return n;
    });
    o.material=next.length===1?next[0]:next;
  });
}
function material(color,metal=.1,rough=.55,emissive=0){
  return new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive,emissiveIntensity:emissive?0.18:0});
}
function addPreviewLights(scene){
  scene.add(new THREE.HemisphereLight(0xc9fff0,0x180d08,1.8));
  const key=new THREE.DirectionalLight(0xffffff,2.7);key.position.set(3,5,4);scene.add(key);
  const rim=new THREE.DirectionalLight(0x57f1c0,2.0);rim.position.set(-4,3,-3);scene.add(rim);
  const warm=new THREE.PointLight(0xff8457,8,12);warm.position.set(2,-2,2);scene.add(warm);
}
function rifle(ref){
  const group=new THREE.Group(),low=String(ref||'').toLowerCase();
  const toxic=low.includes('toxic'),rust=low.includes('rust'),base=toxic?0x2d8f67:rust?0x8d4935:0x4a5960;
  const dark=material(0x181d1d,.6,.28),skin=material(base,.55,.36,toxic?0x0b3928:0);
  const receiver=new THREE.Mesh(new THREE.BoxGeometry(2.5,.34,.42),skin);group.add(receiver);
  const handguard=new THREE.Mesh(new THREE.BoxGeometry(1.35,.27,.3),skin);handguard.position.x=1.78;group.add(handguard);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1.5,12),dark);barrel.rotation.z=Math.PI/2;barrel.position.x=3.18;group.add(barrel);
  const stock=new THREE.Mesh(new THREE.BoxGeometry(1.0,.27,.38),dark);stock.position.x=-1.7;stock.rotation.z=-.12;group.add(stock);
  const grip=new THREE.Mesh(new THREE.BoxGeometry(.28,.24,.9),dark);grip.position.set(-.35,0,-.57);grip.rotation.y=-.18;group.add(grip);
  const mag=new THREE.Mesh(new THREE.BoxGeometry(.42,.25,.85),dark);mag.position.set(.35,0,-.62);mag.rotation.y=.16;group.add(mag);
  const optic=new THREE.Mesh(new THREE.BoxGeometry(.55,.24,.22),material(0x252b2c,.75,.18));optic.position.set(.45,0,.36);group.add(optic);
  if(toxic||rust){
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.3,.355,.07),material(toxic?0x78ffc8:0xd67a4d,.25,.34,toxic?0x0d5038:0));
    stripe.position.set(.2,0,.17);group.add(stripe);
  }
  group.rotation.set(.1,-.45,.08);group.scale.setScalar(.72);return group;
}
function mannequin(ref){
  const group=new THREE.Group(),low=String(ref||'').toLowerCase(),fin=low.includes('finisher');
  const suit=material(fin?0x42272b:0x2d4e45,.12,.62),skin=material(0x9c715a,.02,.78);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.38,.85,8,12),suit);torso.rotation.x=Math.PI/2;torso.position.z=1.15;group.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.27,20,16),skin);head.position.z=2.05;group.add(head);
  for(const side of[-1,1]){
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.11,.72,6,8),suit);arm.rotation.x=Math.PI/2;arm.rotation.y=side*(fin?.75:.35);arm.position.set(side*.52,0,1.25);group.add(arm);
    const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.14,.86,6,8),suit);leg.rotation.x=Math.PI/2;leg.rotation.y=side*(fin?.16:.05);leg.position.set(side*.2,0,.34);group.add(leg);
  }
  if(fin){group.rotation.z=-.18;group.rotation.x=.08}
  return group;
}
function banner(ref){
  const group=new THREE.Group();
  const panel=new THREE.Mesh(new THREE.BoxGeometry(3.2,.12,1.55),material(0x111b21,.5,.32,0x071115));group.add(panel);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(2.75,1.05),new THREE.MeshBasicMaterial({color:0x5ff5d8,transparent:true,opacity:.23}));
  glow.position.set(0,-.071,0);glow.rotation.x=Math.PI/2;group.add(glow);
  for(let i=0;i<5;i++){const bar=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.8+i*.08),material(i%2?0x7c69ff:0x53e9be,.3,.35,i%2?0x1b1455:0x0c4a38));bar.position.set(-1.05+i*.52,-.12,0);bar.rotation.x=Math.PI/2;group.add(bar)}
  group.rotation.x=.12;return group;
}
function cacheCrate(ref){
  const g=new THREE.Group(),body=material(0x35443e,.45,.48),edge=material(0x72f0c4,.25,.28,0x123d31);
  const box=new THREE.Mesh(new THREE.BoxGeometry(1.7,1.05,.95),body);g.add(box);
  for(const z of[-.5,.5]){const rail=new THREE.Mesh(new THREE.BoxGeometry(1.82,.09,.12),edge);rail.position.z=z*.82;g.add(rail)}
  for(const x of[-.72,.72]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.1,1.12,.12),edge);rail.position.x=x;g.add(rail)}
  const lock=new THREE.Mesh(new THREE.BoxGeometry(.32,.12,.28),material(0xf0bd58,.55,.25));lock.position.set(0,-.57,0);g.add(lock);
  g.rotation.set(.28,-.42,.08);return g;
}
function sprayCan(ref){
  const g=new THREE.Group(),body=material(0x2f4542,.42,.32),accent=material(0x8b6cff,.3,.32,0x211958);
  const can=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,1.5,24),body);g.add(can);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.26,.3,.26,20),accent);cap.position.y=.86;g.add(cap);
  const mark=new THREE.Mesh(new THREE.TorusGeometry(.22,.055,10,28),accent);mark.rotation.x=Math.PI/2;mark.position.set(0,-.385,.12);g.add(mark);
  g.rotation.set(.12,.2,-.15);return g;
}
function skinDisplay(ref){
  const g=mannequin(ref);
  const plate=new THREE.Mesh(new THREE.TorusGeometry(.82,.045,12,42),material(0x53e9be,.3,.3,0x0b4b38));plate.rotation.x=Math.PI/2;plate.position.z=.1;g.add(plate);
  return g;
}
function genericReward(ref){
  const group=new THREE.Group();
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.9,2),material(0x54dcb5,.35,.3,0x0a4232));group.add(core);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.25,.055,12,48),material(0x826dff,.55,.25,0x211865));ring.rotation.x=Math.PI/2;group.add(ring);
  const ring2=ring.clone();ring2.rotation.y=Math.PI/2;group.add(ring2);
  return group;
}
function runtimeObject(ref){
  const low=String(ref||'').toLowerCase();
  if(low.includes('/weapon_wrap/')||low.includes('/wrap/')||low.includes('weapon')||low.includes('wrap_'))return makeHorizonRifle(THREE,low);
  if(low.includes('/emote/')||low.includes('/finisher/')||low.includes('emote')||low.includes('finisher'))return mannequin(low);
  if(low.includes('/profile/')||low.includes('banner'))return banner(low);
  if(low.includes('/cache/'))return cacheCrate(low);
  if(low.includes('/spray/'))return sprayCan(low);
  if(low.includes('/skin/'))return skinDisplay(low);
  return genericReward(low);
}
function fitCamera(root,w,h){
  const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  root.position.sub(center);
  const max=Math.max(size.x,size.y,size.z,1);
  const camera=new THREE.PerspectiveCamera(30,w/h,.01,100);
  camera.position.set(max*.15,max*.18,max*2.45);camera.lookAt(0,0,0);
  return camera;
}
async function renderCanvas(canvas){
  const url=canvas.dataset.model||'',runtime=canvas.dataset.runtime||'',variant=Number(canvas.dataset.variant||1);
  if(!url&&!runtime)return;
  let renderer=null;
  try{
    const rect=canvas.getBoundingClientRect(),w=Math.max(120,Math.round(rect.width||180)),h=Math.max(120,Math.round(rect.height||180));
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
    renderer.setPixelRatio(Math.min(1.35,devicePixelRatio||1));renderer.setSize(w,h,false);
    const scene=new THREE.Scene();addPreviewLights(scene);
    let root;
    if(url){
      const gltf=await asset(url);root=skeletonClone(gltf.scene);applyVariant(root,variant);root.rotation.y=Math.PI;
    }else{
      root=runtimeObject(runtime);root.rotation.y=-.28;
    }
    scene.add(root);
    const ground=new THREE.Mesh(new THREE.CircleGeometry(2.4,48),new THREE.MeshStandardMaterial({color:0x07100d,roughness:.85,metalness:.12,transparent:true,opacity:.72}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-1.15;scene.add(ground);
    const camera=fitCamera(root,w,h);
    renderer.render(scene,camera);
  }catch(e){
    const ctx=canvas.getContext('2d');if(ctx){ctx.fillStyle='#07110e';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#9fb3aa';ctx.textAlign='center';ctx.fillText('3D PREVIEW',canvas.width/2,canvas.height/2)}
  }finally{
    if(renderer)setTimeout(()=>renderer.dispose(),0);
  }
}
export function mountModelPreviews(root=document){
  const canvases=[...root.querySelectorAll('canvas.preview3d[data-model],canvas.preview3d[data-runtime]')];
  const io=new IntersectionObserver(entries=>{
    for(const e of entries)if(e.isIntersecting&&!e.target.dataset.rendered){
      e.target.dataset.rendered='1';renderCanvas(e.target);io.unobserve(e.target);
    }
  },{root:root.closest?.('.modal-card')||null,rootMargin:'220px'});
  canvases.forEach(c=>io.observe(c));
}
