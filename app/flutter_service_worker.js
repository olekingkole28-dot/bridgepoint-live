const BP_CACHE_RESET=2300;
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil((async()=>{try{for(const k of await caches.keys())await caches.delete(k)}catch(_){}try{await self.registration.unregister()}catch(_){}try{await self.clients.claim()}catch(_){}try{const cs=await self.clients.matchAll({type:"window",includeUncontrolled:true});for(const c of cs){const u=new URL(c.url);if(u.pathname.startsWith("/app/")){u.searchParams.set("bp-runtime","2300");c.navigate(u.href)}}}catch(_){}})()));
self.addEventListener("fetch",()=>{});
