const CACHE='bridgepoint-horizon-test-v4208';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>new Response('Horizon test world is temporarily unavailable',{status:503,headers:{'Content-Type':'text/plain'}}))) });