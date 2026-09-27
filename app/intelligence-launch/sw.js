const V='bridgepoint-intelligence-launch-retired-v5820';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('bridgepoint-intelligence-launch-')||k.startsWith('bridgepoint-universe-'))await caches.delete(k);await self.clients.claim();const cs=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const c of cs){try{await c.navigate('/app/?migrated=legacy-intelligence-v5820')}catch{}}})()));
self.addEventListener('message',e=>{if(e.data==='skipWaiting'||e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{if(e.request.method==='GET')e.respondWith(fetch(e.request,{cache:'no-store'}))});