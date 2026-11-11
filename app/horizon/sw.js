const CACHE='bridgepoint-horizon-ue5-v6250';
const SHELL=[
  './index.html','./native/index.html','./manifest.webmanifest','./horizon-mark.svg'
];
const NATIVE_ENTRY='/app/horizon/native/';
const LEGACY_PATHS=new Set([
  '/app/horizon/','/app/horizon/index.html','/app/horizon/lobby.html','/app/horizon/preview.html',
  '/app/horizon-playable/','/app/horizon-playable/index.html','/app/horizon-playable/v2-entry.html',
  '/app/horizon-world/','/app/horizon-world/index.html',
  '/app/horizon-next/','/app/horizon-next/index.html'
]);
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(k=>k.startsWith('bridgepoint-horizon-')&&k!==CACHE).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    if(LEGACY_PATHS.has(u.pathname)||u.pathname.startsWith('/app/horizon/play/')){
      const target=new URL(NATIVE_ENTRY,self.location.origin);
      target.search=u.search;
      event.respondWith(Promise.resolve(Response.redirect(target.toString(),302)));
      return;
    }
    if(u.pathname===NATIVE_ENTRY||u.pathname===NATIVE_ENTRY+'index.html'){
      event.respondWith(caches.match('./native/index.html').then(cached=>cached||fetch(req)));
      return;
    }
  }
  if(u.pathname.startsWith('/app/horizon/')){
    event.respondWith(caches.match(req).then(cached=>cached||fetch(req)));
  }
});