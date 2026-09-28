(()=>{const BUILD=5880,CURRENT_SW='/sw.js?v='+BUILD,CURRENT_CACHE='bp-intelligence-v'+BUILD,RELOAD_KEY='bp-update-reload-'+BUILD;
let busy=false;
const sameOrigin=u=>{try{return new URL(u,location.href).origin===location.origin}catch{return false}};
const scopePath=s=>{try{return new URL(s).pathname}catch{return''}};
const scriptPath=r=>{const w=r.active||r.waiting||r.installing;try{return w?new URL(w.scriptURL).pathname:''}catch{return''}};
const preserve=p=>p.startsWith('/app/horizon/');
async function cleanupCaches(){if(!('caches'in window))return 0;let n=0;for(const k of await caches.keys()){const legacy=k.startsWith('bridgepoint-universe-')||k.startsWith('bridgepoint-intelligence-launch-')||(k.startsWith('bp-intelligence-')&&k!==CURRENT_CACHE);if(legacy){await caches.delete(k);n++}}return n}
async function update(){if(busy||!('serviceWorker'in navigator))return;busy=true;let retired=0;try{
 const regs=await navigator.serviceWorker.getRegistrations();
 for(const r of regs){if(!sameOrigin(r.scope))continue;const p=scopePath(r.scope),sp=scriptPath(r);if(preserve(p))continue;
   const legacyScope=p==='/app/'||p.startsWith('/app/intelligence-launch/');
   const wrongRoot=p==='/'&&sp&&sp!=='/sw.js';
   if(legacyScope||wrongRoot){if(await r.unregister())retired++}
 }
 const cleared=await cleanupCaches();
 const reg=await navigator.serviceWorker.register(CURRENT_SW,{scope:'/',updateViaCache:'none'});
 await reg.update().catch(()=>{});
 if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
 window.__BP_APP_UPDATE__={build:BUILD,retired,cleared,scope:reg.scope,checkedAt:new Date().toISOString()};
 if(retired>0){sessionStorage.setItem(RELOAD_KEY,'1');window.__BP_UPDATE_PENDING_RELOAD__={build:BUILD,reason:'legacy-worker-retired',reloadDeferredUntilNavigation:true,updatedAt:Date.now()}}
 }catch(e){window.__BP_APP_UPDATE__={build:BUILD,error:String(e?.message||e),checkedAt:new Date().toISOString()}}
 finally{busy=false}}
navigator.serviceWorker?.addEventListener('controllerchange',()=>{const c=navigator.serviceWorker.controller;if(!c)return;let p='';try{p=new URL(c.scriptURL).pathname}catch{}if(p==='/sw.js'){sessionStorage.setItem(RELOAD_KEY,'1');window.__BP_UPDATE_PENDING_RELOAD__={build:BUILD,reason:'controller-changed',reloadDeferredUntilNavigation:true,updatedAt:Date.now()}}});
addEventListener('load',update,{once:true});addEventListener('pageshow',update);document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});setInterval(update,300000);
})();