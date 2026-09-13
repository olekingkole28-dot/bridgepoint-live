const CACHE='bridgepoint-horizon-install-v11';
const SHELL=['./','./index.html','./lobby.html','./manifest.webmanifest','./horizon-mark.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith('bridgepoint-horizon-')&&k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  const isLanding=url.pathname==='/app/horizon/'||
    url.pathname==='/app/horizon/index.html'||
    url.pathname==='/app/horizon/lobby.html'||
    url.pathname.endsWith('/app/horizon/manifest.webmanifest')||
    url.pathname.endsWith('/app/horizon/horizon-mark.svg');

  if(isLanding){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
          return response;
        })
        .catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html')))
    );
  }
});
