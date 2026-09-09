from pathlib import Path

root = Path('site/app')
index = root / 'index.html'
service_worker = root / 'flutter_service_worker.js'

# The production app is intentionally map-only while the UI is rebuilt page by page.
# Nothing from the previous Flutter shell is loaded or visible here.
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
    src="bridgepoint-world-v2652/?release=2654-map-only"
    title="BridgePoint World V2653"
    allow="geolocation; fullscreen"
    allowfullscreen
  ></iframe>
  <script>
    // Retire stale Flutter/PWA caches so the removed UI cannot reappear.
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

# Replace the old Flutter cache worker with a tiny map-only worker that immediately
# takes control and clears legacy app caches. The map itself is network-backed/live.
service_worker.write_text('''const VERSION = "bridgepoint-map-only-v2654";
self.addEventListener("install", event => { self.skipWaiting(); });
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", event => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request));
  }
});
''')

s = index.read_text()
assert 'id="bp-map-only"' in s
assert 'bridgepoint-world-v2652/?release=2654-map-only' in s
assert 'flutter_bootstrap.js' not in s
assert 'main.dart.js' not in s
assert 'bp-v2652-home' not in s
print('MAP_ONLY_V2654')
