(()=>{
'use strict';
if(window.__bridgepointLazyRuntimeV1001)return;
window.__bridgepointLazyRuntimeV1001=true;
const V='1224';
window.__bridgepointHighriseLazyV1224=true;
const loaded=new Map();
function loadScript(src,id){
  if(id&&document.getElementById(id))return Promise.resolve();
  if(loaded.has(src))return loaded.get(src);
  const p=new Promise((resolve,reject)=>{const s=document.createElement('script');if(id)s.id=id;s.src=src;s.async=true;s.onload=()=>resolve();s.onerror=()=>reject(new Error(`Could not load ${src}`));document.head.appendChild(s);});
  loaded.set(src,p);return p;
}
function prefetch(src){if(document.querySelector(`link[data-bp-prefetch="${src}"]`))return;const l=document.createElement('link');l.rel='prefetch';l.as='script';l.href=src;l.dataset.bpPrefetch=src;document.head.appendChild(l);}
let mapPromise=null;
async function loadMap(){
  if(mapPromise)return mapPromise;
  mapPromise=(async()=>{
    await loadScript(`map-radar-v974.js?v=${V}`,'bp1001-map-runtime');
    await loadScript(`radar-rest-v1000.js?v=${V}`,'bp1001-radar-rest');
    await loadScript(`map-polish-v984.js?v=${V}`,'bp1001-map-polish');
    return true;
  })().catch(e=>{mapPromise=null;throw e;});
  return mapPromise;
}
async function openMap(){await loadMap();return window.BridgePointOpenIntelligenceMapV974?.();}
let ownerPromise=null;
async function loadOwner(){
  if(ownerPromise)return ownerPromise;
  ownerPromise=loadScript(`owner-console-v984.js?v=${V}`,'bp1001-owner-console').catch(e=>{ownerPromise=null;throw e;});
  return ownerPromise;
}
const ownerProxy=async()=>{try{await loadOwner();const fn=window.BridgePointOpenOwnerConsoleV984;if(fn&&fn!==ownerProxy)return fn();}catch(e){console.error(e);}};
window.BridgePointOpenOwnerConsoleV984=ownerProxy;
window.BridgePointOpenMapV993=openMap;
addEventListener('bridgepoint-owner-confirmed-v993',()=>{setTimeout(()=>prefetch(`owner-console-v984.js?v=${V}`),1800);},{once:true});
const idle=window.requestIdleCallback||((fn)=>setTimeout(fn,3000));
idle(()=>{prefetch(`map-radar-v974.js?v=${V}`);prefetch(`radar-rest-v1000.js?v=${V}`);prefetch(`map-polish-v984.js?v=${V}`);},{timeout:5000});
})();