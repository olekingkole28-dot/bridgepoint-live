const VERSION='bridgepoint-universe-v1992';
const SHELL=[
  '/app/',
  '/app/index.html',
  '/app/universe-v1992.css?v=1992',
  '/app/universe-v1992.js?v=1992',
  '/app/manifest.json?v=1992',
  '/app/icons/Icon-192.png',
  '/app/icons/Icon-512.png'
];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)).catch(()=>{}));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('message',event=>{
  if(event.data==='skipWaiting'||event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'&&url.pathname.startsWith('/app/')){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(event.request,{cache:'no-store'});
        if(fresh&&fresh.ok){const cache=await caches.open(VERSION);cache.put('/app/',fresh.clone());}
        return fresh;
      }catch(_){return (await caches.match('/app/'))||(await caches.match('/app/index.html'));}
    })());
    return;
  }
  if(url.pathname.startsWith('/app/')){
    event.respondWith((async()=>{
      const cached=await caches.match(event.request);
      const network=fetch(event.request).then(async response=>{
        if(response&&response.ok){const cache=await caches.open(VERSION);cache.put(event.request,response.clone());}
        return response;
      }).catch(()=>null);
      return cached||(await network)||Response.error();
    })());
  }
});