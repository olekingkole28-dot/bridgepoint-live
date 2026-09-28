const V='bp-intelligence-v5881';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys()){const legacy=k.startsWith('bridgepoint-universe-')||k.startsWith('bridgepoint-intelligence-launch-')||(k.startsWith('bp-intelligence-')&&k!==V);if(legacy)await caches.delete(k)}await self.clients.claim()})()));
self.addEventListener('message',e=>{if(e.data==='skipWaiting'||e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin){e.respondWith(fetch(e.request));return}
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r&&r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c)).catch(()=>{})}return r}).catch(async()=>caches.match(e.request)||caches.match(u.pathname.startsWith('/app')?'/app/':'/')));return}
if(/\.(?:js|css|svg|webmanifest|json)$/.test(u.pathname)){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r&&r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c)).catch(()=>{})}return r}).catch(()=>caches.match(e.request)));return}
e.respondWith(fetch(e.request))});