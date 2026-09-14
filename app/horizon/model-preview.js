import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import {clone as skeletonClone} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js';

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
async function renderCanvas(canvas){
  const url=canvas.dataset.model;if(!url)return;
  const variant=Number(canvas.dataset.variant||1);
  try{
    const gltf=await asset(url);
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    const rect=canvas.getBoundingClientRect(),w=Math.max(120,Math.round(rect.width||180)),h=Math.max(120,Math.round(rect.height||180));
    renderer.setPixelRatio(Math.min(1.5,devicePixelRatio||1));renderer.setSize(w,h,false);
    const scene=new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xc9fff0,0x180d08,1.8));
    const key=new THREE.DirectionalLight(0xffffff,2.5);key.position.set(3,5,4);scene.add(key);
    const rim=new THREE.DirectionalLight(0x57f1c0,1.8);rim.position.set(-4,3,-3);scene.add(rim);
    const root=skeletonClone(gltf.scene);applyVariant(root,variant);scene.add(root);
    const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const max=Math.max(size.x,size.y,size.z,1);
    const camera=new THREE.PerspectiveCamera(32,w/h,.01,100);
    camera.position.set(0,size.y*.06,max*2.15);camera.lookAt(0,0,0);
    root.rotation.y=Math.PI;
    renderer.render(scene,camera);
  }catch(e){
    const ctx=canvas.getContext('2d');if(ctx){ctx.fillStyle='#07110e';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#9fb3aa';ctx.textAlign='center';ctx.fillText('3D PREVIEW',canvas.width/2,canvas.height/2)}
  }
}
export function mountModelPreviews(root=document){
  const canvases=[...root.querySelectorAll('canvas.preview3d[data-model]')];
  const io=new IntersectionObserver(entries=>{
    for(const e of entries)if(e.isIntersecting&&!e.target.dataset.rendered){
      e.target.dataset.rendered='1';renderCanvas(e.target);io.unobserve(e.target);
    }
  },{root:root.closest?.('.modal-card')||null,rootMargin:'180px'});
  canvases.forEach(c=>io.observe(c));
}
