from pathlib import Path

root = Path('site/app')
index = root / 'index.html'
service_worker = root / 'flutter_service_worker.js'

map_only = '''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
  <meta name="theme-color" content="#020711">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>BridgePoint World</title>
  <link rel="manifest" href="manifest.json">
  <style>html,body{width:100%;height:100%;margin:0;background:#020711;color:#dff7ff;font-family:system-ui,sans-serif;display:grid;place-items:center}small{opacity:.7}</style>
</head>
<body>
  <small>Opening BridgePoint World…</small>
  <script>
    if('serviceWorker' in navigator){navigator.serviceWorker.register('./flutter_service_worker.js').catch(()=>{});}
    location.replace('bridgepoint-world-v2652/?release=instant-map-world-2663');
  </script>
  <noscript><a href="bridgepoint-world-v2652/?release=instant-map-world-2663">Open BridgePoint World</a></noscript>
</body>
</html>
'''

index.write_text(map_only)
service_worker.write_text('''const VERSION = "bridgepoint-direct-world-v2663";
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
''')

s = index.read_text()
assert 'instant-map-world-2663' in s
assert 'caches.delete' not in s
assert 'unregister' not in s
assert '<iframe' not in s
assert 'flutter_bootstrap.js' not in s
assert 'main.dart.js' not in s
print('DIRECT_INSTANT_MAP_WORLD_V2663')