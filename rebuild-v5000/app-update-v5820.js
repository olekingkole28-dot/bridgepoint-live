(()=>{const BUILD=6167,CACHE_VERSION='6167-cloud-startup-performance',CURRENT_SW='/sw.js?v='+CACHE_VERSION,CURRENT_CACHE='bp-intelligence-v6167-cloud-startup-performance',RELOAD_KEY='bp-update-reload-'+BUILD;
let busy=false;
const sameOrigin=u=>{try{return new URL(u,location.href).origin===location.origin}catch{return false}};
const scopePath=s=>{try{return new URL(s).pathname}catch{return''}};
const scriptPath=r=>{const w=r.active||r.waiting||r.installing;try{return w?new URL(w.scriptURL).pathname:''}catch{return''}};
const preserve=p=>p.startsWith('/app/horizon/');
function isCurrentWorker(w){try{const u=new URL(w?.scriptURL||'');return u.origin===location.origin&&u.pathname==='/sw.js'&&u.searchParams.get('v')===CACHE_VERSION}catch{return false}}
function reloadOnce(reason){try{if(sessionStorage.getItem(RELOAD_KEY)==='1')return false;sessionStorage.setItem(RELOAD_KEY,'1');const u=new URL(location.href);u.searchParams.set('bp-build',String(BUILD));u.searchParams.set('bp-refresh',String(Date.now()));window.__BP_UPDATE_PENDING_RELOAD__={build:BUILD,reason,reloadDeferredUntilNavigation:false,updatedAt:Date.now()};location.replace(u.href);return true}catch(_){location.reload();return true}}
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
 window.__BP_APP_UPDATE__={build:BUILD,retired,cleared,scope:reg.scope,activeWorkerCurrent:isCurrentWorker(reg.active),controllerCurrent:isCurrentWorker(navigator.serviceWorker.controller),checkedAt:new Date().toISOString()};
 // If the v6163 worker has activated but this document is still controlled by an older worker,
 // hard-navigate once with a new URL so website, installed app and worker agree on one build.
 if(isCurrentWorker(reg.active)&&!isCurrentWorker(navigator.serviceWorker.controller))setTimeout(async()=>{if(isCurrentWorker(navigator.serviceWorker.controller))return;const current=await navigator.serviceWorker.getRegistration('/').catch(()=>null);if(isCurrentWorker(current?.active))reloadOnce('current-worker-activated-controller-stale')},1200);
 }catch(e){window.__BP_APP_UPDATE__={build:BUILD,error:String(e?.message||e),checkedAt:new Date().toISOString()}}
 finally{busy=false}}
navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(isCurrentWorker(navigator.serviceWorker.controller))reloadOnce('current-worker-controller-change')});
void update();
addEventListener('pageshow',()=>{void update()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void update()});
setInterval(()=>{if(!document.hidden)void update()},300000);
})();
