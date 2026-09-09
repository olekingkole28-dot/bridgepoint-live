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
  <style>
    html,body,#bp-map-only{position:fixed;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;overflow:hidden;background:#020711}
    html,body{overscroll-behavior:none}
    #bp-map-only{display:block}
  </style>
</head>
<body>
  <iframe
    id="bp-map-only"
    src="bridgepoint-world-v2652/?release=generated-material-world-2655"
    title="BridgePoint World"
    allow="geolocation; fullscreen"
    allowfullscreen
  ></iframe>
  <script>
    (async()=>{
      try{
        if('serviceWorker' in navigator){
          const regs=await navigator.serviceWorker.getRegistrations();
          for(const reg of regs) await reg.unregister();
        }
        if('caches' in window){
          const keys=await caches.keys();
          await Promise.all(keys.map(key=>caches.delete(key)));
        }
      }catch(_){ }
    })();
  </script>
</body>
</html>
'''

index.write_text(map_only)
service_worker.write_text('''const VERSION = "bridgepoint-generated-world-v2655";
self.addEventListener("install", event => { self.skipWaiting(); });
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", event => {
  if (event.request.mode === "navigate") event.respondWith(fetch(event.request));
});
''')

s = index.read_text()
assert 'id="bp-map-only"' in s
assert 'generated-material-world-2655' in s
assert 'flutter_bootstrap.js' not in s
assert 'main.dart.js' not in s
assert 'bp-v2652-home' not in s
print('MAP_ONLY_GENERATED_WORLD_V2655')
