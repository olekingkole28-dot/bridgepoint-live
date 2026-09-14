const CACHE='bridgepoint-horizon-v4311';
const SHELL=[
  './','./index.html','./styles.css','./app.js','./runtime-contract.js','./lobby-scene.js','./model-preview.js',
  './manifest.webmanifest','./horizon-mark.svg'
];
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
  if(u.hostname.endsWith('supabase.co')||u.hostname.includes('jsdelivr.net')||u.hostname.includes('google.com'))return;
  if(u.origin!==self.location.origin)return;
  const legacy=u.pathname==='/app/horizon/lobby.html'||u.pathname==='/app/horizon/preview.html'||u.pathname.startsWith('/app/horizon/play/');
  if(req.mode==='navigate'&&legacy){event.respondWith(Response.redirect('/app/horizon/',302));return;}
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(r=>{
      const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});return r;
    }).catch(()=>caches.match('./index.html')));return;
  }
  event.respondWith(caches.match(req).then(cached=>{
    const net=fetch(req).then(r=>{
      if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{})}return r;
    }).catch(()=>cached);
    return cached||net;
  }));
});