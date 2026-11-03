/* BridgePoint Blender World v1 — additive Manhattan-only city mode.
 * Reuses the live MapLibre globe, projection, camera controls and DEM terrain.
 * The legacy global city/building layers are suppressed only while this mode is enabled.
 */
(() => {
  'use strict';
  if (window.__BP_BLENDER_WORLD_V1__) return;

  const VERSION = 1;
  const MANIFEST_URL = '/assets/blender-world/manifest.json';
  const ASSET_ROOT = '/assets/blender-world/';
  const LAYER_ID = 'bp-blender-world-v1';
  const MODE_HIDE = /(?:building|roof|floor|facade|structure|landmark|bridge|^gta-road-|^gta-rail|tree|vegetation|canopy|streetlight|hydrant|solar|pool|transport|ship|vessel|drone|flight|satellite|parcel|zoning|listing|opportunity|nyc-lidar|reality-capture)/i;
  const THREE_URL = 'https://esm.sh/three@0.169.0';
  const GLTF_URL = 'https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';
  const MIN_DETAIL_ZOOM = 11.6;
  const MAX_CONCURRENT_TILE_LOADS = 2;

  let manifestPromise = null;
  let modulePromise = null;
  let map = null;
  let customLayer = null;
  let originalCamera = null;
  let suppressing = false;
  let legacyVisibility = new Map();
  let tileQueue = [];
  let tileLoadsActive = 0;
  let observer = null;

  const state = {
    version: VERSION, status: 'waiting-for-map', enabled: false,
    manifestLoaded: false, tileCount: 0, loadedTiles: 0, visibleTiles: 0,
    renderedTiles: 0, failedTiles: [], updatedAt: Date.now()
  };
  window.__BP_BLENDER_WORLD_V1__ = state;

  function publish(status, extra = {}) {
    Object.assign(state, extra, { status, enabled: state.enabled, updatedAt: Date.now() });
    const button = document.querySelector('[data-bp-blender-world-button="1"]');
    if (button) {
      button.setAttribute('aria-pressed', String(state.enabled));
      button.classList.toggle('active', state.enabled);
      button.querySelector('.bpv-command-label').textContent = state.enabled ? 'Blender World · ON' : 'Blender World';
      button.title = state.status || 'Open the separate Blender World globe';
    }
    const note = document.getElementById('bp-blender-world-status-v1');
    if (note) note.textContent = statusText(status);
  }

  function statusText(status) {
    if (status === 'loading-manifest') return 'Opening the Manhattan Blender World…';
    if (status === 'loading-three') return 'Preparing the 3D city renderer…';
    if (status === 'loading-tiles') return 'Loading only the Manhattan tiles in view…';
    if (status === 'ready') return 'Blender World · Manhattan pilot';
    if (status === 'waiting-for-zoom') return 'Zoom in to load the city tiles.';
    if (status === 'error') return 'Blender World could not load. The regular globe is still available.';
    if (status === 'manifest-unavailable') return 'Manhattan tile package is not published yet.';
    return status.replaceAll('-', ' ');
  }

  function findMap() {
    const worlds = [
      window.__BP_V5000_WORLD, window.__BP_V5000_WORLD__,
      window.__BP_LANDING_WORLD__, window.__bpLandingWorldV5420,
      window.__BP_WORLD__, window.__BP_MAP_WORLD__
    ];
    for (const world of worlds) {
      const candidate = world?.map || world;
      if (candidate && typeof candidate.addLayer === 'function' &&
          typeof candidate.getBounds === 'function' && candidate.getContainer?.()) return candidate;
    }
    return null;
  }

  function getManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch(MANIFEST_URL, { cache: 'force-cache' }).then(response => {
        if (!response.ok) throw new Error('MANHATTAN_MANIFEST_HTTP_' + response.status);
        return response.json();
      }).then(manifest => {
        if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.tiles) || manifest.tiles.length < 1) {
          throw new Error('MANHATTAN_MANIFEST_SCHEMA_INVALID');
        }
        for (const tile of manifest.tiles) {
          if (!tile || typeof tile.id !== 'string' || !/^[a-z0-9-]+$/i.test(tile.id) ||
              typeof tile.url !== 'string' || tile.url.includes('..') || !tile.url.endsWith('.glb') ||
              !Array.isArray(tile.boundsWgs84) || tile.boundsWgs84.length !== 4 ||
              ![tile.longitude, tile.latitude, ...tile.boundsWgs84].every(Number.isFinite)) {
            throw new Error('MANHATTAN_TILE_ENTRY_INVALID');
          }
        }
        return manifest;
      }).catch(error => {
        manifestPromise = null;
        throw error;
      });
    }
    return manifestPromise;
  }

  function intersects(bounds, box, pad = 0) {
    const west = box.getWest(), east = box.getEast(), south = box.getSouth(), north = box.getNorth();
    const dx = (east - west) * pad, dy = (north - south) * pad;
    const w = west - dx, e = east + dx, s = south - dy, n = north + dy;
    return bounds[2] >= w && bounds[0] <= e && bounds[3] >= s && bounds[1] <= n;
  }

  function suppressLegacyLayers() {
    if (!map || !state.enabled || suppressing) return;
    suppressing = true;
    try {
      const layers = map.getStyle?.()?.layers || [];
      for (const layer of layers) {
        if (!MODE_HIDE.test(layer.id)) continue;
        if (!legacyVisibility.has(layer.id)) {
          legacyVisibility.set(layer.id, map.getLayoutProperty(layer.id, 'visibility') || 'visible');
        }
        if ((map.getLayoutProperty(layer.id, 'visibility') || 'visible') !== 'none') {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      }
    } catch (error) {
      console.warn('BridgePoint Blender World legacy-layer mask', error);
    } finally {
      suppressing = false;
    }
  }

  function restoreLegacyLayers() {
    if (!map) return;
    const entries = Array.from(legacyVisibility.entries());
    legacyVisibility.clear();
    for (const [id, visibility] of entries) {
      try {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
      } catch (_) {}
    }
    try { window.__BP_V5000_WORLD?.refresh?.(); } catch (_) {}
  }

  function disposeObject(THREE, root) {
    if (!root) return;
    try {
      root.traverse(object => {
        object.geometry?.dispose?.();
        const mats = Array.isArray(object.material) ? object.material : (object.material ? [object.material] : []);
        for (const material of mats) {
          for (const value of Object.values(material || {})) if (value?.isTexture) value.dispose();
          material?.dispose?.();
        }
      });
    } catch (_) {}
  }

  function loadThreeModules() {
    if (!modulePromise) {
      modulePromise = Promise.all([import(THREE_URL), import(GLTF_URL)]).then(modules => ({
        THREE: modules[0], GLTFLoader: modules[1].GLTFLoader
      })).catch(error => {
        modulePromise = null;
        throw error;
      });
    }
    return modulePromise;
  }

  function createCustomLayer(targetMap, manifest) {
    const tileById = new Map();
    const tiles = manifest.tiles.map(raw => {
      const tile = { ...raw, root: null, anchor: null, loading: false, failed: false, visible: false };
      tileById.set(tile.id, tile);
      return tile;
    });

    const layer = {
      id: LAYER_ID,
      type: 'custom',
      renderingMode: '3d',
      map: targetMap,
      tiles,
      ready: false,
      removed: false,
      onAdd(mapRef, gl) {
        this.map = mapRef;
        this.removed = false;
        loadThreeModules().then(({ THREE, GLTFLoader }) => {
          if (this.removed) return;
          this.THREE = THREE;
          this.GLTFLoader = GLTFLoader;
          this.scene = new THREE.Scene();
          this.camera = new THREE.Camera();
          this.scene.add(new THREE.AmbientLight(0xffffff, 1.3));
          const sun = new THREE.DirectionalLight(0xffffff, 2.15);
          sun.position.set(1, 2, 1);
          this.scene.add(sun);
          const fill = new THREE.DirectionalLight(0x9bc7e8, 0.45);
          fill.position.set(-1, 0.5, -1);
          this.scene.add(fill);
          this.renderer = new THREE.WebGLRenderer({
            canvas: mapRef.getCanvas(), context: gl,
            antialias: false, alpha: true, powerPreference: 'low-power'
          });
          this.renderer.autoClear = false;
          this.renderer.setPixelRatio(1);
          this.ready = true;
          publish('ready', { tileCount: tiles.length });
          syncTiles();
          mapRef.triggerRepaint?.();
        }).catch(error => {
          console.warn('BridgePoint Blender World renderer', error);
          publish('error', { error: String(error?.message || error) });
        });
      },
      render(gl, args) {
        if (!this.ready || this.removed || !state.enabled || !this.renderer) return;
        try {
          const matrixData = args?.defaultProjectionData?.mainMatrix;
          if (!matrixData) return;
          this.camera.projectionMatrix.fromArray(matrixData);
          this.camera.matrixWorld.identity();
          this.camera.matrixWorldInverse.identity();
          for (const tile of tiles) {
            if (!tile.anchor || !tile.visible) continue;
            const modelMatrix = this.map.transform?.getMatrixForModel?.(
              [tile.longitude, tile.latitude], 0
            );
            if (modelMatrix) {
              tile.anchor.matrix.fromArray(modelMatrix);
              tile.anchor.matrixWorldNeedsUpdate = true;
            }
          }
          this.scene.updateMatrixWorld(true);
          this.renderer.resetState();
          this.renderer.render(this.scene, this.camera);
          state.renderedTiles = tiles.filter(tile => tile.root && tile.visible).length;
          state.updatedAt = Date.now();
        } catch (error) {
          if (!this.renderWarned) {
            this.renderWarned = true;
            console.warn('BridgePoint Blender World render', error);
          }
        }
      },
      onRemove() {
        this.removed = true;
        for (const tile of tiles) unloadTile(tile);
        try { this.renderer?.dispose(); } catch (_) {}
        this.ready = false;
      }
    };

    function unloadTile(tile) {
      if (!tile.anchor || !layer.scene) return;
      try { layer.scene.remove(tile.anchor); } catch (_) {}
      disposeObject(layer.THREE, tile.anchor);
      tile.root = null;
      tile.anchor = null;
      tile.visible = false;
    }

    function loadTile(tile) {
      if (!layer.ready || tile.loading || tile.root || tile.failed) return;
      tile.loading = true;
      const url = ASSET_ROOT + tile.url;
      const loader = new layer.GLTFLoader();
      loader.load(url, gltf => {
        tile.loading = false;
        if (layer.removed || !state.enabled) {
          disposeObject(layer.THREE, gltf.scene);
          return;
        }
        try {
          const model = gltf.scene || gltf.scenes?.[0];
          if (!model) throw new Error('GLB tile has no scene: ' + tile.id);
          const anchor = new layer.THREE.Group();
          anchor.matrixAutoUpdate = false;
          anchor.add(model);
          tile.root = model;
          tile.anchor = anchor;
          layer.scene.add(anchor);
          tile.visible = true;
          state.loadedTiles = tiles.filter(item => item.root).length;
          state.updatedAt = Date.now();
          publish('loading-tiles', { loadedTiles: state.loadedTiles });
          layer.map.triggerRepaint?.();
          syncTiles();
        } catch (error) {
          tile.failed = true;
          state.failedTiles.push({ id: tile.id, error: String(error?.message || error).slice(0, 180) });
          console.warn('BridgePoint Blender World tile decode', tile.id, error);
        }
      }, undefined, error => {
        tile.loading = false;
        tile.failed = true;
        state.failedTiles.push({ id: tile.id, error: String(error?.message || error).slice(0, 180) });
        console.warn('BridgePoint Blender World tile download', tile.id, error);
      });
    }

    function syncTiles() {
      if (!layer.ready || !state.enabled) return;
      const zoom = Number(layer.map.getZoom());
      const bounds = layer.map.getBounds();
      const detailReady = zoom >= Math.max(MIN_DETAIL_ZOOM, Number(manifest.minZoom || 0));
      let visible = 0;
      for (const tile of tiles) {
        const inView = detailReady && intersects(tile.boundsWgs84, bounds, 0.18);
        tile.visible = !!(inView && tile.anchor);
        if (inView) {
          visible++;
          enqueue(tile);
        } else if (tile.anchor && !intersects(tile.boundsWgs84, bounds, 0.42)) {
          unloadTile(tile);
        }
      }
      state.visibleTiles = visible;
      state.loadedTiles = tiles.filter(tile => tile.root).length;
      if (!detailReady) publish('waiting-for-zoom', { visibleTiles: 0 });
      else if (visible || tileQueue.length) publish('loading-tiles', { visibleTiles: visible });
      layer.map.triggerRepaint?.();
    }

    function enqueue(tile) {
      if (tile.loading || tile.root || tile.failed || tileQueue.includes(tile)) return;
      tileQueue.push(tile);
      pumpQueue();
    }

    function pumpQueue() {
      while (tileLoadsActive < MAX_CONCURRENT_TILE_LOADS && tileQueue.length) {
        const tile = tileQueue.shift();
        if (!state.enabled || tile.loading || tile.root || tile.failed) continue;
        tileLoadsActive++;
        const previousLoader = layer.GLTFLoader;
        const url = ASSET_ROOT + tile.url;
        const loader = new previousLoader();
        tile.loading = true;
        loader.load(url, gltf => {
          tile.loading = false;
          tileLoadsActive = Math.max(0, tileLoadsActive - 1);
          if (layer.removed || !state.enabled) {
            disposeObject(layer.THREE, gltf.scene);
            pumpQueue();
            return;
          }
          try {
            const model = gltf.scene || gltf.scenes?.[0];
            if (!model) throw new Error('GLB tile has no scene: ' + tile.id);
            const anchor = new layer.THREE.Group();
            anchor.matrixAutoUpdate = false;
            anchor.add(model);
            tile.root = model;
            tile.anchor = anchor;
            layer.scene.add(anchor);
            tile.visible = true;
            state.loadedTiles = tiles.filter(item => item.root).length;
            state.updatedAt = Date.now();
            layer.map.triggerRepaint?.();
            syncTiles();
          } catch (error) {
            tile.failed = true;
            state.failedTiles.push({ id: tile.id, error: String(error?.message || error).slice(0, 180) });
            console.warn('BridgePoint Blender World tile decode', tile.id, error);
          }
          pumpQueue();
        }, undefined, error => {
          tile.loading = false;
          tile.failed = true;
          tileLoadsActive = Math.max(0, tileLoadsActive - 1);
          state.failedTiles.push({ id: tile.id, error: String(error?.message || error).slice(0, 180) });
          console.warn('BridgePoint Blender World tile download', tile.id, error);
          pumpQueue();
        });
      }
    }

    layer.sync = syncTiles;
    layer.unloadAll = () => {
      tileQueue = [];
      for (const tile of tiles) unloadTile(tile);
      state.loadedTiles = 0;
      state.visibleTiles = 0;
      state.renderedTiles = 0;
    };
    state.tileById = tileById;
    return layer;
  }

  async function enableMode(button) {
    map = findMap();
    if (!map) throw new Error('The live BridgePoint map is not ready.');
    if (state.enabled) return;
    originalCamera = {
      center: map.getCenter().toArray(), zoom: map.getZoom(),
      pitch: map.getPitch(), bearing: map.getBearing()
    };
    state.enabled = true;
    window.__BP_BLENDER_WORLD_MODE__ = { version: VERSION, enabled: true, updatedAt: Date.now() };
    publish('loading-manifest', { failedTiles: [], renderedTiles: 0, loadedTiles: 0 });
    suppressLegacyLayers();
    map.on('idle', suppressLegacyLayers);
    map.on('styledata', suppressLegacyLayers);
    map.on('moveend', suppressLegacyLayers);

    const manifest = await getManifest();
    state.manifestLoaded = true;
    state.tileCount = manifest.tileCount || manifest.tiles.length;
    if (customLayer && map.getLayer(LAYER_ID)) {
      customLayer.unloadAll?.();
      map.removeLayer(LAYER_ID);
      customLayer = null;
    }
    customLayer = createCustomLayer(map, manifest);
    const firstSymbol = (map.getStyle()?.layers || []).find(item => item.type === 'symbol' && item.id !== LAYER_ID)?.id;
    map.addLayer(customLayer, firstSymbol);
    const isMobile = innerWidth <= 700;
    map.easeTo({
      center: [-73.9717, 40.7831],
      zoom: isMobile ? 12.35 : 12.65,
      pitch: 48, bearing: -8, duration: 850, essential: true
    });
    button?.setAttribute('aria-pressed', 'true');
    button?.classList.add('active');
    publish('ready', { manifestLoaded: true, tileCount: state.tileCount });
  }

  function disableMode() {
    if (!map) return;
    state.enabled = false;
    window.__BP_BLENDER_WORLD_MODE__ = { version: VERSION, enabled: false, updatedAt: Date.now() };
    map.off('idle', suppressLegacyLayers);
    map.off('styledata', suppressLegacyLayers);
    map.off('moveend', suppressLegacyLayers);
    if (customLayer && map.getLayer(LAYER_ID)) {
      try { customLayer.unloadAll?.(); map.removeLayer(LAYER_ID); } catch (_) {}
    }
    customLayer = null;
    tileQueue = [];
    tileLoadsActive = 0;
    restoreLegacyLayers();
    if (originalCamera) {
      try { map.easeTo({ ...originalCamera, duration: 550, essential: true }); } catch (_) {}
    }
    originalCamera = null;
    publish('ready', { loadedTiles: 0, visibleTiles: 0, renderedTiles: 0 });
  }

  function mountButton() {
    const grid = document.querySelector('[data-bpv-command-grid="map"]');
    if (!grid) return false;
    let button = grid.querySelector('[data-bp-blender-world-button="1"]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'bpv-command-btn bpv-blender-world-btn';
      button.dataset.bpBlenderWorldButton = '1';
      button.setAttribute('aria-pressed', 'false');
      button.title = 'Open the separate Blender World globe with the Manhattan city pilot';
      button.innerHTML = '<span class="bpv-command-icon" aria-hidden="true">◈</span><span class="bpv-command-label">Blender World</span>';
      button.addEventListener('click', async () => {
        if (state.enabled) {
          disableMode();
          return;
        }
        button.disabled = true;
        try {
          await enableMode(button);
        } catch (error) {
          console.warn('BridgePoint Blender World open', error);
          if (state.enabled) disableMode();
          publish('error', { error: String(error?.message || error) });
        } finally {
          button.disabled = false;
        }
      });
      grid.appendChild(button);
    }
    if (!document.getElementById('bp-blender-world-status-v1')) {
      const note = document.createElement('div');
      note.id = 'bp-blender-world-status-v1';
      note.style.cssText = 'grid-column:1/-1;padding:2px 3px;color:#83a9b8;font:700 9px/1.35 system-ui,sans-serif;letter-spacing:.05em';
      note.textContent = 'Manhattan Blender pilot · separate world mode';
      grid.appendChild(note);
    }
    return true;
  }

  function bindMap() {
    const candidate = findMap();
    if (!candidate || candidate === map) return;
    map = candidate;
    map.on('moveend', () => {
      if (state.enabled) customLayer?.sync?.();
    });
    map.on('zoomend', () => {
      if (state.enabled) customLayer?.sync?.();
    });
    publish('ready');
  }

  function boot() {
    mountButton();
    bindMap();
  }

  boot();
  observer = new MutationObserver(() => boot());
  try { observer.observe(document.documentElement, { childList: true, subtree: true }); } catch (_) {}
  window.addEventListener('bp:world-map-ready-v5940', () => { bindMap(); boot(); });
  window.addEventListener('bp:map-open', () => { bindMap(); boot(); });
  window.addEventListener('resize', () => { if (state.enabled) customLayer?.sync?.(); }, { passive: true });
  let tries = 0;
  const timer = setInterval(() => {
    boot();
    if ((map && document.querySelector('[data-bp-blender-world-button="1"]')) || ++tries > 180) {
      clearInterval(timer);
      try { observer?.disconnect(); } catch (_) {}
    }
  }, 200);
})();
