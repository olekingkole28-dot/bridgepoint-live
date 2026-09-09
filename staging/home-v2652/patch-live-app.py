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
      location.replace('bridgepoint-world-v2652/?release=instant-surface-world-2661');
    })();
  </script>
  <noscript><a href="bridgepoint-world-v2652/?release=instant-surface-world-2661">Open BridgePoint World</a></noscript>
</body>
</html>
'''

index.write_text(map_only)
service_worker.write_text('''const VERSION = "bridgepoint-direct-world-v2661";
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
assert 'location.replace' in s
assert 'instant-surface-world-2661' in s
assert '<iframe' not in s
assert 'flutter_bootstrap.js' not in s
assert 'main.dart.js' not in s
print('DIRECT_INSTANT_SURFACE_WORLD_V2661')