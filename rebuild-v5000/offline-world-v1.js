/* BridgePoint Global Offline World — local pack manager v2.
 * Cache Storage owns resource bytes; IndexedDB owns installed-pack metadata.
 * Resources may be same-origin or explicitly allowlisted HTTPS origins in the manifest.
 * Do not add customer-private records or secrets to public packs.
 */
(function (root) {
  'use strict';
  const DB_NAME = 'bridgepoint-global-offline-v1';
  const DB_VERSION = 1;
  const META_STORE = 'packs';
  const CACHE_PREFIX = 'bridgepoint-offline-pack-v1-';
  const MAX_CONCURRENCY = 3;
  const ID_RE = /^[a-z0-9][a-z0-9._-]{1,95}$/i;

  function assertManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') throw new TypeError('Pack manifest must be an object.');
    if (manifest.schemaVersion !== 1) throw new TypeError('Unsupported offline pack schemaVersion.');
    if (typeof manifest.id !== 'string' || !ID_RE.test(manifest.id)) throw new TypeError('Invalid offline pack id.');
    if (typeof manifest.title !== 'string' || !manifest.title.trim()) throw new TypeError('Pack title is required.');
    if (!Array.isArray(manifest.resources) || manifest.resources.length === 0) throw new TypeError('Pack resources must be a non-empty array.');
    const pageUrl = root.location && root.location.href ? root.location.href : 'https://bridgepoint.invalid/';
    const pageOrigin = new URL(pageUrl).origin;
    const allow = new Set();
    for (const origin of (Array.isArray(manifest.allowedOrigins) ? manifest.allowedOrigins : [])) {
      if (typeof origin !== 'string') throw new TypeError('Allowed resource origins must be exact HTTPS origins.');
      const parsed = new URL(origin);
      if (parsed.protocol !== 'https:' || parsed.origin !== origin || parsed.pathname !== '/' || parsed.search || parsed.hash) {
        throw new TypeError('Allowed resource origins must be exact HTTPS origins without paths.');
      }
      allow.add(parsed.origin);
    }
    const seen = new Set();
    for (const item of manifest.resources) {
      if (!item || typeof item.url !== 'string' || !item.url.trim()) throw new TypeError('Every resource needs a URL.');
      const url = new URL(item.url, pageUrl);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new TypeError('Only HTTP(S) pack resources are supported.');
      if (url.username || url.password || url.hash) throw new TypeError('Credentials and URL fragments are not allowed in pack resources.');
      if (url.origin !== pageOrigin && (url.protocol !== 'https:' || !allow.has(url.origin))) {
        throw new TypeError('Cross-origin resources must use an explicitly allowlisted HTTPS origin.');
      }
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

  async function writeMeta(mode, operation) {
    const db = await openDb();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(META_STORE, mode);
        try { operation(tx.objectStore(META_STORE)); }
        catch (error) { reject(error); return; }
        tx.oncomplete = resolve;
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
    if (!root.navigator || !root.navigator.storage || !root.navigator.storage.estimate) {
      return { quota: null, usage: null, available: null, persistent: false };
    }
    const estimate = await root.navigator.storage.estimate();
    const quota = Number.isFinite(estimate.quota) ? estimate.quota : null;
    const usage = Number.isFinite(estimate.usage) ? estimate.usage : null;
    let persistent = false;
    if (root.navigator.storage.persisted) {
      try { persistent = await root.navigator.storage.persisted(); } catch (_) {}
    }
    return { quota, usage, available: quota == null || usage == null ? null : Math.max(0, quota - usage), persistent };
  }

  async function installPack(input, options) {
    const manifest = assertManifest(input);
    const opts = options || {};
    if (!root.caches || typeof root.caches.open !== 'function') throw new Error('Cache Storage is unavailable in this browser.');
    if (opts.signal && opts.signal.aborted) throw new DOMException('Download cancelled.', 'AbortError');
    const previous = await getPack(manifest.id);
    const estimatedBytes = manifest.resources.reduce((sum, item) => sum + (item.bytes || 0), 0);
    const storage = await storageEstimate();
    if (storage.available != null && estimatedBytes > 0 && estimatedBytes > storage.available) {
      throw new Error('The estimated pack size exceeds the browser storage space currently available. Free space or choose a smaller pack.');
    }

    const unique = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    const cacheName = CACHE_PREFIX + manifest.id + '-' + unique;
    const cache = await root.caches.open(cacheName);
    let completed = 0;
    let actualBytes = 0;
    let cursor = 0;
    let failure = null;
    const resources = manifest.resources.slice();
    const worker = async () => {
      while (cursor < resources.length && !failure) {
        if (opts.signal && opts.signal.aborted) { failure = new DOMException('Download cancelled.', 'AbortError'); break; }
        const item = resources[cursor++];
        const url = new URL(item.url, root.location.href);
        try {
          if (typeof opts.onProgress === 'function') opts.onProgress({ packId: manifest.id, phase: 'downloading', completed, total: resources.length, url: url.href, estimatedBytes, actualBytes });
          const response = await root.fetch(url.href, { cache: 'no-store', credentials: 'same-origin', mode: url.origin === root.location.origin ? 'same-origin' : 'cors', signal: opts.signal });
          if (!response.ok || response.type === 'opaque') throw new Error('Resource request failed (' + response.status + '): ' + url.pathname);
          const headerBytes = Number(response.headers && response.headers.get('content-length'));
          await cache.put(url.href, response.clone());
          actualBytes += Number.isFinite(headerBytes) && headerBytes > 0 ? headerBytes : (item.bytes || 0);
          completed++;
          if (typeof opts.onProgress === 'function') opts.onProgress({ packId: manifest.id, phase: 'downloading', completed, total: resources.length, url: url.href, estimatedBytes, actualBytes });
        } catch (error) { failure = error; }
      }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, resources.length) }, worker));

    if (failure) {
      await root.caches.delete(cacheName);
      throw failure;
    }

    const record = {
      id: manifest.id, title: manifest.title, schemaVersion: manifest.schemaVersion,
      version: String(manifest.version || '1'), resourceCount: manifest.resources.length,
      estimatedBytes, actualBytes: actualBytes || estimatedBytes,
      installedAt: new Date().toISOString(), status: 'installed',
      source: manifest.source || null, sourceUrl: manifest.sourceUrl || null,
      licence: manifest.licence || null, attribution: manifest.attribution || null,
      generatedAt: manifest.generatedAt || null, cacheName
    };
    try {
      await writeMeta('readwrite', store => store.put(record));
    } catch (error) {
      await root.caches.delete(cacheName);
      throw error;
    }
    if (previous && previous.cacheName && previous.cacheName !== cacheName) {
      await root.caches.delete(previous.cacheName).catch(() => false);
    }
    if (typeof opts.onProgress === 'function') opts.onProgress({ packId: manifest.id, phase: 'installed', completed: resources.length, total: resources.length, estimatedBytes, actualBytes: record.actualBytes });
    return record;
  }

  async function removePack(id) {
    if (typeof id !== 'string' || !ID_RE.test(id)) throw new TypeError('Invalid offline pack id.');
    const record = await getPack(id);
    if (record && record.cacheName && record.cacheName.startsWith(CACHE_PREFIX)) await root.caches.delete(record.cacheName);
    await writeMeta('readwrite', store => store.delete(id));
    return true;
  }

  async function matchResource(url) {
    if (!root.caches) return null;
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

  function topologyToFeatureCollection(topology, objectName) {
    if (!topology || topology.type !== 'Topology' || !Array.isArray(topology.arcs) || !topology.objects) {
      throw new TypeError('Invalid TopoJSON topology.');
    }
    const object = topology.objects[objectName || 'countries'];
    if (!object) throw new TypeError('TopoJSON object not found: ' + (objectName || 'countries'));
    const transform = topology.transform;
    const decodedArcs = topology.arcs.map(arc => {
      let x = 0, y = 0;
      return arc.map(point => {
        if (transform) { x += point[0]; y += point[1]; return [x * transform.scale[0] + transform.translate[0], y * transform.scale[1] + transform.translate[1]]; }
        return [point[0], point[1]];
      });
    });
    const getArc = ref => {
      const index = ref < 0 ? ~ref : ref;
      const coords = decodedArcs[index];
      if (!coords) throw new TypeError('TopoJSON references a missing arc.');
      return ref < 0 ? coords.slice().reverse() : coords;
    };
    const stitch = refs => {
      const out = [];
      refs.forEach((ref, index) => {
        const coords = getArc(ref);
        out.push(...(index ? coords.slice(1) : coords));
      });
      if (out.length < 4) throw new TypeError('Invalid TopoJSON ring.');
      return out;
    };
    const geometry = g => {
      if (!g) throw new TypeError('Missing TopoJSON geometry.');
      if (g.type === 'Polygon') return { type: 'Polygon', coordinates: g.arcs.map(stitch) };
      if (g.type === 'MultiPolygon') return { type: 'MultiPolygon', coordinates: g.arcs.map(poly => poly.map(stitch)) };
      if (g.type === 'LineString') return { type: 'LineString', coordinates: stitch(g.arcs) };
      if (g.type === 'MultiLineString') return { type: 'MultiLineString', coordinates: g.arcs.map(stitch) };
      if (g.type === 'Point') {
        const c = g.coordinates || [];
        return { type: 'Point', coordinates: transform ? [c[0] * transform.scale[0] + transform.translate[0], c[1] * transform.scale[1] + transform.translate[1]] : c };
      }
      if (g.type === 'MultiPoint') return { type: 'MultiPoint', coordinates: (g.coordinates || []).map(c => transform ? [c[0] * transform.scale[0] + transform.translate[0], c[1] * transform.scale[1] + transform.translate[1]] : c) };
      throw new TypeError('Unsupported TopoJSON geometry type: ' + g.type);
    };
    const toFeature = g => ({ type: 'Feature', ...(g.id == null ? {} : { id: g.id }), properties: g.properties || {}, geometry: geometry(g) });
    const geometries = object.type === 'GeometryCollection' ? object.geometries : [object];
    return { type: 'FeatureCollection', features: (geometries || []).map(toFeature) };
  }

  const api = Object.freeze({ assertManifest, listPacks, getPack, storageEstimate, installPack, removePack, matchResource, topologyToFeatureCollection });
  root.BridgePointOfflineWorldV1 = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
