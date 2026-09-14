import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';

const ua=navigator.userAgent||'';
const android=/Android/i.test(ua);
const coarse=matchMedia?.('(pointer:coarse)')?.matches===true;
const enabled=android;
window.BP_MOBILE_SAFE={enabled,android,coarse,version:3052,sceneTrimmed:false};

if(enabled){
  document.documentElement.classList.add('horizon-mobile-safe');
  document.body.classList.add('horizon-mobile-safe');

  // Android Chromium has been rendering the GTAO/Bloom chain as a white frame on some GPUs.
  // Keep the same Three.js scene, but render the first scene/camera pass directly on phones.
  const originalAddPass=EffectComposer.prototype.addPass;
  EffectComposer.prototype.addPass=function(pass){
    const name=pass?.constructor?.name||'';
    if(/GTAOPass|UnrealBloomPass|OutputPass/.test(name))return pass;
    return originalAddPass.call(this,pass);
  };
  EffectComposer.prototype.render=function(){
    const pass=this.passes?.find(p=>p?.scene&&p?.camera);
    if(pass){
      this.renderer.setRenderTarget(null);
      this.renderer.clear(true,true,true);
      this.renderer.render(pass.scene,pass.camera);
    }
  };

  // Cap phone render scale to stop the main thread/GPU from getting saturated.
  const originalSetPixelRatio=THREE.WebGLRenderer.prototype.setPixelRatio;
  THREE.WebGLRenderer.prototype.setPixelRatio=function(){return originalSetPixelRatio.call(this,1)};

  // Keep source-backed geometry, but use a phone LOD so the UI stays responsive.
  // The full source arrays remain untouched on desktop.
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const response=await nativeFetch(input,init);
    const url=typeof input==='string'?input:String(input?.url||'');
    if(!url.includes('/functions/v1/bridgepoint-horizon-stream-v3020')||!response.ok)return response;
    try{
      const payload=await response.clone().json();
      if(!payload?.complete)return response;
      const limit=(arr,n)=>Array.isArray(arr)&&arr.length>n?arr.slice(0,n):arr;
      payload.buildings=limit(payload.buildings,520);
      payload.building_parts=limit(payload.building_parts,650);
      payload.parcels=limit(payload.parcels,420);
      payload.transport=limit(payload.transport,850);
      payload.water=limit(payload.water,180);
      payload.mobile_lod=true;
      window.BP_MOBILE_SAFE.sceneTrimmed=true;
      return new Response(JSON.stringify(payload),{
        status:response.status,
        statusText:response.statusText,
        headers:response.headers
      });
    }catch(_){return response}
  };

  const style=document.createElement('style');
  style.textContent=`
    .horizon-mobile-safe .hud{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
    .horizon-mobile-safe .grain{display:none!important}
    .horizon-mobile-safe .vignette{background:radial-gradient(circle at 50% 47%,transparent 58%,rgba(0,0,0,.18) 84%,rgba(0,0,0,.42) 100%)!important}
    .horizon-mobile-safe .mobileControls{pointer-events:none!important}
    .horizon-mobile-safe .movePad,.horizon-mobile-safe .actionButton{pointer-events:auto!important;touch-action:none!important;-webkit-tap-highlight-color:transparent!important}
    .horizon-mobile-safe button,.horizon-mobile-safe a,.horizon-mobile-safe select{touch-action:manipulation!important}
    .horizon-mobile-safe #world canvas{filter:none!important;opacity:1!important}
  `;
  document.head.appendChild(style);

  addEventListener('webglcontextlost',e=>{
    e.preventDefault();
    const load=document.getElementById('loadText');
    if(load)load.textContent='Graphics context recovering…';
  },{passive:false});
}
