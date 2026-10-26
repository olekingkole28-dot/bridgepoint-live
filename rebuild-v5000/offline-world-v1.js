/* BridgePoint Global Offline World — storage core v1.
 * Additive only: not wired into either globe renderer in checkpoint 1.
 * Packs may only cache same-origin resources until source/licence policy is reviewed.
 */
(function (root) {
  'use strict';
  const DB_NAME = 'bridgepoint-global-offline-v1';
  const DB_VERSION = 1;
  const META_STORE = 'packs';
  const CACHE_PREFIX = 'bridgepoint-offline-pack-v1-';
  const MAX_CONCURRENCY = 4;
  const ID_RE = /^[a-z0-9][a-z0-9._-]{1,95}$/i;

  function assertManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') throw new TypeError('Pack manifest must be an object.');
    if (manifest.schemaVersion !== 1) throw new TypeError('Unsupported offline pack schemaVersion.');
    if (typeof manifest.id !== 'string' || !ID_RE.test(manifest.id)) throw new TypeError('Invalid offline pack id.');
    if (typeof manifest.title !== 'string' || !manifest.title.trim()) throw new TypeError('Pack title is required.');
    if (!Array.isArray(manifest.resources) || manifest.resources.length === 0) throw new TypeError('Pack resources must be a non-empty array.');
    const seen = new Set();
    for (const item of manifest.resources) {
      if (!item || typeof item.url !== 'string') throw new TypeError('Every resource needs a URL.');
      const url = new URL(item.url, root.location && root.location.href ? root.location.href : 'https://bridgepoint.invalid/');
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new TypeError('Only HTTP(S) pack resources are supported.');
      if (root.location && url.origin !== root.location.origin) throw new TypeError('Checkpoint 1 only permits same-origin pack resources.');
      if (seen.has(url.href)) throw new TypeError('Duplicate resource URL in pack.');
      seen.add(url.href);
      if (item.bytes != null && (!Number.isFinite(item.bytes) || item.bytes < 0)) throw new TypeError('Resource byte estimate must be non-negative.');
    }
    return manifest;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!root.indexedDB) return reject(new Error('IndexedDB is unavailable in this browser.'));
      const req = root.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Could not open offline metadata store.'));
    });
  }

  async function txRequest(mode, operation) {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(META_STORE, mode);
        const store = tx.objectStore(META_STORE);
        let result;
        try { result = operation(store); } catch (error) { reject(error); return; }
        tx.oncomplete = () => resolve(result && typeof result.result !== 'undefined' ? result.result : result);
        tx.onerror = () => reject(tx.error || new Error('Offline metadata transaction failed.'));
        tx.onabort = () => reject(tx.error || new Error('Offline metadata transaction aborted.'));
      });
    } finally { db.close(); }
  }

  async function listPacks() {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const req = db.transaction(META_STORE, 'readonly').objectStore(META_STORE).getAll();
        req.onsuccess = () => resolve((req.result || []).sort((a, b) => a.title.localeCompare(b.title)));
        req.onerror = () => reject(req.error || new Error('Could not list offline packs.'));
      });
    } finally { db.close(); }
  }

  async function getPack(id) {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const req = db.transaction(META_STORE, 'readonly').objectStore(META_STORE).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error || new Error('Could not read offline pack.'));
      });
    } finally { db.close(); }
  }

  async function storageEstimate() {
    if (!root.navigator || !root.navigator.storage || !root.navigator.storage.estimate) return { quota: null, usage: null, available: null };
    const estimate = await root.navigator.storage.estimate();
    const quota = Number.isFinite(estimate.quota) ? estimate.quota : null;
    const usage = Number.isFinite(estimate.usage) ? estimate.usage : null;
    return { quota, usage, available: quota == null || usage == null ? null : Math.max(0, quota - usage) };
  }

  async function installPack(input, options) {
    const manifest = assertManifest(input);
    const opts = options || {};
    const cacheName = CACHE_PREFIX + manifest.id;
    const cache = await root.caches.open(cacheName);
    const previous = await getPack(manifest.id);
    const estimatedBytes = manifest.resources.reduce((sum, item) => sum + (item.bytes || 0), 0);
    const storage = await storageEstimate();
    if (storage.available != null && estimatedBytes > storage.available) {
      throw new Error('Estimated pack size exceeds available browser storage. Free space or choose a smaller pack.');
    }
    let completed = 0;
    let cursor = 0;
    let failure = null;
    const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, manifest.resources.length) }, async () => {
      while (cursor < manifest.resources.length && !failure) {
        const item = manifest.resources[cursor++];
        try {
          const url = new URL(item.url, root.location.href);
          const response = await root.fetch(url.href, { cache: 'no-store', credentials: 'same-origin', signal: opts.signal });
          if (!response.ok || response.type === 'opaque') throw new Error('Resource request failed (' + response.status + '): ' + url.pathname);
          await cache.put(url.href, response.clone());
          completed++;
          if (typeof opts.onProgress === 'function') opts.onProgress({ packId: manifest.id, completed, total: manifest.resources.length, url: url.href });
        } catch (error) { failure = error; }
      }
    });
    await Promise.all(workers);
    if (failure) {
      // Do not advertise an incomplete install. If this is an update, preserve the
      // prior metadata but remove the partial cache to avoid mixing versions.
      await root.caches.delete(cacheName);
      if (!previous) await txRequest('readwrite', store => store.delete(manifest.id));
      throw failure;
    }
    const record = {
      id: manifest.id, title: manifest.title, schemaVersion: manifest.schemaVersion,
      version: String(manifest.version || '1'), resourceCount: manifest.resources.length,
      estimatedBytes, installedAt: new Date().toISOString(), status: 'installed',
      source: manifest.source || null, licence: manifest.licence || null,
      generatedAt: manifest.generatedAt || null, cacheName
    };
    await txRequest('readwrite', store => store.put(record));
    return record;
  }

  async function removePack(id) {
    if (typeof id !== 'string' || !ID_RE.test(id)) throw new TypeError('Invalid offline pack id.');
    const record = await getPack(id);
    if (record && record.cacheName && record.cacheName.startsWith(CACHE_PREFIX)) await root.caches.delete(record.cacheName);
    await txRequest('readwrite', store => store.delete(id));
    return true;
  }

  async function matchResource(url) {
    const target = new URL(url, root.location.href);
    const packs = await listPacks();
    for (const pack of packs) {
      if (pack.status !== 'installed' || !pack.cacheName) continue;
      const cache = await root.caches.open(pack.cacheName);
      const response = await cache.match(target.href);
      if (response) return response;
    }
    return null;
  }

  const api = Object.freeze({ assertManifest, listPacks, getPack, storageEstimate, installPack, removePack, matchResource });
  root.BridgePointOfflineWorldV1 = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
