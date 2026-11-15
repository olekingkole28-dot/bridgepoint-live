(()=> {
  'use strict';
  // Keep the current published service worker and its cache. Updating a worker
  // must never force a second navigation while the welcome world is visible.
  const BUILD=6300;
  const CACHE_VERSION='6293-full-planetarium';
  const CURRENT_SW='/sw.js?v='+CACHE_VERSION;
  const CURRENT_CACHE='bp-intelligence-v6293-full-planetarium';
  let busy=false;

  const sameOrigin=u=>{
    try{return new URL(u,location.href).origin===location.origin}catch{return false}
  };
  const scopePath=s=>{
    try{return new URL(s).pathname}catch{return ''}
  };
  const scriptPath=r=>{
    const w=r.active||r.waiting||r.installing;
    try{return w?new URL(w.scriptURL).pathname:''}catch{return ''}
  };
  const preserve=p=>p.startsWith('/app/horizon/');
  function isCurrentWorker(w){
    try{
      const u=new URL(w?.scriptURL||'');
      return u.origin===location.origin&&u.pathname==='/sw.js'&&u.searchParams.get('v')===CACHE_VERSION;
    }catch{return false}
  }
  async function cleanupCaches(){
    if(!('caches'in window))return 0;
    let n=0;
    for(const key of await caches.keys()){
      const legacy=key.startsWith('bridgepoint-universe-')||
        key.startsWith('bridgepoint-intelligence-launch-')||
        (key.startsWith('bp-intelligence-')&&key!==CURRENT_CACHE);
      if(legacy){await caches.delete(key);n++}
    }
    return n;
  }
  function updateStatus(extra={}){
    window.__BP_APP_UPDATE__={
      build:BUILD,
      scope:'/',
      currentCache:CURRENT_CACHE,
      reloadDeferredUntilNavigation:true,
      checkedAt:new Date().toISOString(),
      ...extra
    };
    return;
  }
  async function update(){
    if(busy||!('serviceWorker'in navigator))return;
    busy=true;
    let retired=0,cleared=0;
    try{
      const registrations=await navigator.serviceWorker.getRegistrations();
      for(const registration of registrations){
        if(!sameOrigin(registration.scope))continue;
        const path=scopePath(registration.scope),script=scriptPath(registration);
        if(preserve(path))continue;
        const legacyScope=path==='/app/'||path.startsWith('/app/intelligence-launch/');
        const wrongRoot=path==='/'&&script&&script!=='/sw.js';
        if(legacyScope||wrongRoot){
          if(await registration.unregister())retired++;
        }
      }
      cleared=await cleanupCaches();
      const registration=await navigator.serviceWorker.register(CURRENT_SW,{
        scope:'/',
        updateViaCache:'none'
      });
      await registration.update().catch(()=>{});
      if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});
      updateStatus({
        retired,
        cleared,
        scope:registration.scope,
        activeWorkerCurrent:isCurrentWorker(registration.active),
        controllerCurrent:isCurrentWorker(navigator.serviceWorker.controller),
        controllerUpdatePending:!isCurrentWorker(navigator.serviceWorker.controller)
      });
    }catch(error){
      updateStatus({error:String(error?.message||error)});
    }finally{
      busy=false;
    }
  }

  // A controller change affects future requests. The current document is already
  // valid and stays on screen; the updated worker is used on the next navigation.
  navigator.serviceWorker?.addEventListener('controllerchange',()=>{
    updateStatus({
      controllerCurrent:isCurrentWorker(navigator.serviceWorker.controller),
      controllerChangedAt:new Date().toISOString()
    });
  });
  void update();
  addEventListener('pageshow',()=>{void update()});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)void update();
  });
  setInterval(()=>{
    if(!document.hidden)void update();
  },300000);
})();
