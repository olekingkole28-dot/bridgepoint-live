'use strict';

const BRIDGEPOINT_CACHE_RETIREMENT = 'v984';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (_) {}

    try {
      await self.clients.claim();
    } catch (_) {}

    try {
      await self.registration.unregister();
    } catch (_) {}

    try {
      const clients = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
      for (const client of clients) {
        if (!client.url || !('navigate' in client)) continue;
        const url = new URL(client.url);
        url.searchParams.set('bpv', BRIDGEPOINT_CACHE_RETIREMENT);
        client.navigate(url.toString());
      }
    } catch (_) {}
  })());
});

self.addEventListener('fetch', () => {
  // v984 intentionally does not cache BridgePoint. Network is the source of truth.
});