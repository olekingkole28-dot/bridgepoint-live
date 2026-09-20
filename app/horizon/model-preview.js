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

function stylizedCharacter(ref){
  const g=new THREE.Group(),low=String(ref||'').toLowerCase();
  let seed=2166136261;for(const ch of low){seed^=ch.charCodeAt(0);seed=Math.imul(seed,16777619)}const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  const skinColors=[0x7b4d39,0x9c684d,0xc48765,0xe0a37e,0x684232],topColors=[0x245f55,0x5b376b,0x2b4f78,0x843e33,0x3a6036],accentColors=[0x67ffd1,0x9b7cff,0xffa663,0x66b9ff,0xff6d90];
  const skin=material(skinColors[Math.floor(rnd()*skinColors.length)],.02,.64),cloth=material(topColors[Math.floor(rnd()*topColors.length)],.08,.48),dark=material(0x171d22,.25,.38),accent=material(accentColors[Math.floor(rnd()*accentColors.length)],.22,.3,0x08231d);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.36,.72,10,18),cloth);torso.rotation.x=Math.PI/2;torso.position.z=1.18;g.add(torso);
  const hips=new THREE.Mesh(new THREE.SphereGeometry(.34,18,12),dark);hips.scale.set(1.08,.72,.72);hips.position.z=.72;g.add(hips);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.10,.12,.18,14),skin);neck.position.z=1.68;g.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.31,28,22),skin);head.scale.set(.94,.88,1.08);head.position.z=1.98;g.add(head);
  const jaw=new THREE.Mesh(new THREE.SphereGeometry(.25,20,14),skin);jaw.scale.set(.92,.82,.62);jaw.position.set(0,-.018,1.83);g.add(jaw);
  for(const side of[-1,1]){
    const eyeWhite=new THREE.Mesh(new THREE.SphereGeometry(.055,16,12),material(0xf4f1e9,.02,.25));eyeWhite.scale.set(1.18,.45,.78);eyeWhite.position.set(side*.112,-.274,2.02);g.add(eyeWhite);
    const iris=new THREE.Mesh(new THREE.SphereGeometry(.028,14,10),material(side<0?0x62c7d5:0x62c7d5,.08,.22,0x061317));iris.scale.set(1,.38,1);iris.position.set(side*.112,-.316,2.02);g.add(iris);
    const pupil=new THREE.Mesh(new THREE.SphereGeometry(.012,12,8),material(0x080a0b,.05,.2));pupil.scale.set(1,.35,1);pupil.position.set(side*.112,-.337,2.02);g.add(pupil);
    const brow=new THREE.Mesh(new THREE.BoxGeometry(.105,.025,.018),dark);brow.position.set(side*.11,-.302,2.115);brow.rotation.z=side*.12;g.add(brow);
    const upper=new THREE.Mesh(new THREE.CapsuleGeometry(.095,.56,8,12),cloth);upper.rotation.x=Math.PI/2;upper.rotation.y=side*.18;upper.position.set(side*.49,0,1.28);g.add(upper);
    const fore=new THREE.Mesh(new THREE.CapsuleGeometry(.082,.50,8,12),skin);fore.rotation.x=Math.PI/2;fore.rotation.y=side*.28;fore.position.set(side*.66,-.02,.89);g.add(fore);
    const hand=new THREE.Mesh(new THREE.BoxGeometry(.18,.12,.18),skin);hand.position.set(side*.75,-.03,.58);hand.rotation.z=side*.08;g.add(hand);
    for(let finger=0;finger<5;finger++){
      const fg=new THREE.Mesh(new THREE.CapsuleGeometry(.015,.08,5,7),skin);fg.rotation.x=Math.PI/2;fg.position.set(side*(.79+finger*.006),-.055+(finger-2)*.027,.50-finger*.006);g.add(fg)
    }
    const thigh=new THREE.Mesh(new THREE.CapsuleGeometry(.14,.66,8,12),dark);thigh.rotation.x=Math.PI/2;thigh.position.set(side*.19,0,.35);g.add(thigh);
    const calf=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.55,8,12),dark);calf.rotation.x=Math.PI/2;calf.position.set(side*.19,0,-.20);g.add(calf);
    const shoe=new THREE.Mesh(new THREE.BoxGeometry(.28,.48,.16),material(0x111519,.3,.3));shoe.position.set(side*.19,-.11,-.55);g.add(shoe);
  }
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.045,.10,12),skin);nose.rotation.x=-Math.PI/2;nose.position.set(0,-.30,1.94);g.add(nose);
  const mouth=new THREE.Mesh(new THREE.BoxGeometry(.12,.012,.018),material(0x522b2b,.02,.5));mouth.position.set(0,-.30,1.82);g.add(mouth);
  const hairStyle=Math.floor(rnd()*4);
  if(hairStyle===0){
    const hair=new THREE.Mesh(new THREE.SphereGeometry(.325,24,16,0,Math.PI*2,0,Math.PI*.52),dark);hair.position.z=2.08;g.add(hair)
  }else if(hairStyle===1){
    for(let i=0;i<18;i++){const a=(i/18)*Math.PI*2,h=new THREE.Mesh(new THREE.CapsuleGeometry(.025,.19,5,7),dark);h.position.set(Math.cos(a)*.25,Math.sin(a)*.20,2.14);h.rotation.set(.2*Math.sin(a),.2*Math.cos(a),a);g.add(h)}
  }else if(hairStyle===2){
    const mohawk=new THREE.Mesh(new THREE.BoxGeometry(.10,.28,.44),dark);mohawk.position.set(0,.02,2.24);mohawk.rotation.x=.12;g.add(mohawk)
  }else{
    for(let i=0;i<10;i++){const curl=new THREE.Mesh(new THREE.SphereGeometry(.075,10,8),dark);curl.position.set((i%5-2)*.10,(Math.floor(i/5)-.5)*.11,2.20-Math.abs(i%5-2)*.025);g.add(curl)}
  }
  const backpack=new THREE.Mesh(new THREE.BoxGeometry(.46,.20,.66),accent);backpack.position.set(0,.26,1.12);g.add(backpack);
  const strapMat=dark;for(const side of[-1,1]){const strap=new THREE.Mesh(new THREE.TorusGeometry(.23,.025,8,20,Math.PI),strapMat);strap.position.set(side*.18,-.02,1.20);strap.rotation.set(Math.PI/2,0,side*Math.PI/2);g.add(strap)}
  if(low.includes('vanta')||low.includes('cipher')||low.includes('prestige')){
    const visor=new THREE.Mesh(new THREE.BoxGeometry(.30,.035,.075),accent);visor.position.set(0,-.326,2.03);g.add(visor);
  }
  const plate=new THREE.Mesh(new THREE.TorusGeometry(.76,.045,12,48),accent);plate.rotation.x=Math.PI/2;plate.position.z=-.63;g.add(plate);
  g.rotation.z=.015;return g;
}

function profileIcon(ref){
  const g=new THREE.Group(),low=String(ref||'').toLowerCase(),accent=material(low.includes('rose')?0xd84f76:low.includes('alien')?0x69e4a6:low.includes('crown')?0xf2c75b:0x8a7cff,.28,.34,0x10261f),dark=material(0x14191a,.38,.42);
  if(low.includes('skull')){
    const head=new THREE.Mesh(new THREE.SphereGeometry(.72,24,18),material(0xe2dfd2,.08,.58));head.scale.set(.9,.72,1);g.add(head);
    for(const s of[-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.17,14,10),dark);eye.position.set(s*.25,-.54,.18);g.add(eye)}
    const jaw=new THREE.Mesh(new THREE.BoxGeometry(.78,.38,.36),material(0xd1cdbf,.05,.62));jaw.position.set(0,-.08,-.62);g.add(jaw);
  }else if(low.includes('alien')){
    const head=new THREE.Mesh(new THREE.SphereGeometry(.8,26,20),accent);head.scale.set(.82,.72,1.18);g.add(head);
    for(const s of[-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.24,18,12),dark);eye.scale.set(.82,.32,1.25);eye.position.set(s*.25,-.62,.16);eye.rotation.z=s*.18;g.add(eye)}
  }else if(low.includes('rose')){
    for(let i=0;i<18;i++){const petal=new THREE.Mesh(new THREE.SphereGeometry(.28,14,10),accent);const a=i/18*Math.PI*2,r=.18+.42*(i/18);petal.scale.set(1,.42,.72);petal.position.set(Math.cos(a)*r,Math.sin(a)*r,(i%3)*.05);petal.rotation.z=a;g.add(petal)}
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,1.5,10),material(0x2d6a43,.08,.72));stem.position.z=-1;g.add(stem);
  }else{
    const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.78,2),accent);g.add(core);const ring=new THREE.Mesh(new THREE.TorusGeometry(1.0,.05,10,40),dark);ring.rotation.x=Math.PI/2;g.add(ring)
  }
  const halo=new THREE.Mesh(new THREE.TorusGeometry(1.18,.035,10,44),accent);halo.rotation.x=Math.PI/2;g.add(halo);return g;
}
function vehiclePreview(ref){
  const g=new THREE.Group(),low=String(ref||'').toLowerCase(),bodyColor=low.includes('afterburn')?0xf05e3f:low.includes('circuit')?0x4e7cff:0x4d6f62,body=material(bodyColor,.62,.3,bodyColor===0xf05e3f?0x3c1008:0x09142e),glass=material(0x12222b,.35,.18),rubber=material(0x111213,.15,.88),metal=material(0xb4bbb8,.75,.24);
  const base=new THREE.Mesh(new THREE.BoxGeometry(2.8,1.25,.48),body);base.position.z=.42;g.add(base);
  const hood=new THREE.Mesh(new THREE.BoxGeometry(.9,1.12,.32),body);hood.position.set(1.18,0,.69);g.add(hood);
  const cab=new THREE.Mesh(new THREE.BoxGeometry(1.28,1.08,.58),glass);cab.position.set(.1,0,.86);cab.rotation.y=-.05;g.add(cab);
  const spoiler=new THREE.Mesh(new THREE.BoxGeometry(.42,1.16,.08),metal);spoiler.position.set(-1.42,0,.87);g.add(spoiler);
  for(const x of[-.92,.92])for(const y of[-.62,.62]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.18,18),rubber);wheel.rotation.x=Math.PI/2;wheel.position.set(x,y,.30);g.add(wheel);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.19,14),metal);hub.rotation.x=Math.PI/2;hub.position.copy(wheel.position);g.add(hub)}
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.25,.02,.05),material(low.includes('circuit')?0x79ffd4:0xffd86e,.28,.26,0x17382d));stripe.position.set(.05,-.64,.63);g.add(stripe);
  g.rotation.set(.24,-.46,.05);return g;
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
  if(low.includes('/character/')||low.includes('/prestige/'))return stylizedCharacter(low);
  if(low.includes('/vehicle/'))return vehiclePreview(low);
  if(low.includes('/icon/')||low.includes('profile_icon'))return profileIcon(low);
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
