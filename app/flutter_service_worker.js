const VERSION = "bridgepoint-direct-world-v2663";
const CACHE = VERSION;
const CORE = [
  "./bridgepoint-world-v2652/",
  "./bridgepoint-world-v2652/index.html",
  "./bridgepoint-world-v2652/us-states.geojson",
  "./bridgepoint-world-v2652/countries-110m.geojson",
  "./bridgepoint-world-v2652/world-v2500.js",
  "./bridgepoint-world-v2652/world-v2663-first-map.js",
  "./bridgepoint-world-v2652/world-v2661-first-frame.js",
  "./bridgepoint-world-v2652/world-v2662-weather-bootstrap.js",
  "./bridgepoint-world-v2652/world-v2652.css",
  "./bridgepoint-world-v2652/world-v2500.css"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => { event.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", event => {
  const req = event.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  if(req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(req).then(r => r || caches.match("./bridgepoint-world-v2652/"))));
    return;
  }
  if(url.pathname.includes("/app/bridgepoint-world-v2652/")) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); return res; })));
  }
});
