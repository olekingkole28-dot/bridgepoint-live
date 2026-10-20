/* BridgePoint Eiffel Tower source mesh v5983.
 * Attribution: koterstudios / koters, “Eiffel Tower”, Sketchfab model 0efc103a12ad4c34b09a37e5050f8b23.
 * Source record: Zenodo 10353458 / Objaverse 1.0. Sketchfab page states CC BY 4.0.
 * Model is scaled to the published 330 m overall tower height, anchored to sampled terrain,
 * and loaded only when the camera is close to Paris. This is a source mesh, not a site laser survey.
 */
(() => {
  'use strict';
  if (window.__BP_EIFFEL_TOWER_V5983_BOOTED__) return;
  window.__BP_EIFFEL_TOWER_V5983_BOOTED__ = true;

  const VERSION = 5983;
  const EIFFEL = [2.2945, 48.8584]; // longitude, latitude
  const OFFICIAL_HEIGHT_M = 330;
  const EIFFEL_SCAN_URL = '/assets/eiffel-tower-koterstudios-v5983.glb';
  const THREE_URL = 'https://esm.sh/three@0.169.0';
  const GLTF_URL = 'https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';
  const MODEL_SOURCE = 'https://sketchfab.com/3d-models/eiffel-tower-0efc103a12ad4c34b09a37e5050f8b23';
  const ZENODO_SOURCE = 'https://zenodo.org/records/10353458';
  const MAPS = new Set();
  const STATES = new WeakMap();
  let modulesPromise = null;

  const style = document.createElement('style');
  style.id = 'bp-eiffel-v5983-style';
  style.textContent = '.bp-eiffel-chip-v5983{position:absolute;z-index:1102;left:10px;top:max(62px,calc(env(safe-area-inset-top) + 60px));display:none;max-width:min(290px,calc(100% - 20px));padding:8px 11px;border:1px solid rgba(255,190,112,.4);border-radius:12px;background:rgba(16,21,27,.93);color:#fff1dc;font:700 10px/1.4 system-ui,sans-serif;pointer-events:none;box-shadow:0 10px 26px rgba(0,0,0,.3)}.bp-eiffel-chip-v5983[data-show="true"]{display:block}.bp-eiffel-chip-v5983 small{display:block;color:#d2b99b;font-size:9px;margin-top:2px}';
  document.head.appendChild(style);

  function mapsFound() {
    const candidates = [
      window.__BP_LANDING_WORLD__, window.__bpLandingWorldV5420,
      window.__BP_V5000_WORLD, window.__BP_V5000_WORLD__
    ];
    const result = [];
    for (const item of candidates) {
      const map = item && item.map;
      if (map && typeof map.on === 'function' && !result.includes(map)) result.push(map);
    }
    const pending = window.__BP_PENDING_LANDMARK_MAP_V5940__;
    if (pending && typeof pending.on === 'function' && !result.includes(pending)) result.push(pending);
    return result;
  }

  function nearEiffel(map, minZoom = 13.1) {
    try {
      if (!map || Number(map.getZoom()) < minZoom) return false;
      const b = map.getBounds();
      return EIFFEL[0] >= b.getWest() && EIFFEL[0] <= b.getEast() &&
        EIFFEL[1] >= b.getSouth() && EIFFEL[1] <= b.getNorth();
    } catch (_) { return false; }
  }

  function ensureChip(map, state) {
    const container = map.getContainer && map.getContainer();
    if (!container) return;
    let chip = container.querySelector('.bp-eiffel-chip-v5983');
    if (!chip) {
      chip = document.createElement('div');
      chip.className = 'bp-eiffel-chip-v5983';
      chip.setAttribute('aria-hidden', 'true');
      chip.innerHTML = '<b>EIFFEL TOWER · 3D MODEL</b><small>Source mesh · scaled to 330 m · terrain anchored</small>';
      container.appendChild(chip);
    }
    state.chip = chip;
  }

  function setLabel(map) {
    const sourceId = 'bp-eiffel-tower-point-v5983';
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [{
          type: 'Feature',
          properties: { name: 'EIFFEL TOWER · SOURCE 3D MODEL' },
          geometry: { type: 'Point', coordinates: EIFFEL }
        }] }
      });
    }
    if (!map.getLayer('bp-eiffel-tower-label-v5983')) {
      map.addLayer({
        id: 'bp-eiffel-tower-label-v5983', type: 'symbol', source: sourceId,
        minzoom: 6.5,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 6.5, 9, 10, 12, 14, 14],
          'text-anchor': 'top', 'text-offset': [0, 1.2], 'text-max-width': 16,
          'text-allow-overlap': false
        },
        paint: { 'text-color': '#fff0d7', 'text-halo-color': 'rgba(15,16,18,0.96)', 'text-halo-width': 1.6 }
      });
    }
  }

  async function loadModules() {
    if (!modulesPromise) {
      modulesPromise = Promise.all([import(THREE_URL), import(GLTF_URL)])
        .then(([THREE, gltf]) => ({ THREE, GLTFLoader: gltf.GLTFLoader }))
        .catch(error => { modulesPromise = null; throw error; });
    }
    return modulesPromise;
  }

  function prepareModel(THREE, gltf) {
    const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
    if (!root) throw new Error('GLB contains no scene');
    root.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(root);
    let size = box.getSize(new THREE.Vector3());
    // Normalize common Z-up/X-up exports to Y-up, then measure the real longest axis.
    if (size.z > size.y && size.z >= size.x) root.rotation.x = -Math.PI / 2;
    else if (size.x > size.y && size.x >= size.z) root.rotation.z = Math.PI / 2;
    root.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(root);
    size = box.getSize(new THREE.Vector3());
    const sourceHeight = size.y;
    if (!Number.isFinite(sourceHeight) || sourceHeight <= 0) throw new Error('Model height is invalid');
    root.scale.setScalar(OFFICIAL_HEIGHT_M / sourceHeight);
    root.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(root);
    root.position.x -= (box.min.x + box.max.x) / 2;
    root.position.z -= (box.min.z + box.max.z) / 2;
    root.position.y -= box.min.y;

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(50, 90, 65); scene.add(key);
    const fill = new THREE.DirectionalLight(0xc5d8ff, 0.6);
    fill.position.set(-60, 30, -40); scene.add(fill);
    scene.add(root);
    return { scene, sourceHeight };
  }

  function publish(status, extra = {}) {
    window.__BP_EIFFEL_TOWER_V5983__ = Object.assign({
      version: VERSION, status, coordinates: EIFFEL.slice(), coordinatesCrs: 'EPSG:4326',
      asset: EIFFEL_SCAN_URL, sourceUrl: MODEL_SOURCE, sourceRecord: ZENODO_SOURCE,
      creator: 'koterstudios / koters', license: 'CC BY 4.0 as stated on Sketchfab source page',
      sourceGeometry: 'Sketchfab/Objaverse GLB source mesh; not represented as a laser survey',
      targetHeightM: OFFICIAL_HEIGHT_M, loadedOnDemand: true, updatedAt: Date.now()
    }, extra);
  }

  async function install(map, state) {
    if (state.installing || !map || !map.getStyle || !map.getStyle()) return;
    state.installing = true;
    try {
      setLabel(map);
      ensureChip(map, state);
      if (!state.listeners) {
        state.listeners = true;
        map.on('moveend', () => update(map, state));
        map.on('zoomend', () => update(map, state));
      }
      if (nearEiffel(map)) await addModelLayer(map, state);
      else publish('waiting-for-close-view', { attachedMaps: MAPS.size });
    } catch (error) {
      publish('install-error', { detail: String(error && error.message || error) });
      console.warn('BridgePoint Eiffel Tower setup', error);
    } finally {
      state.installing = false;
    }
  }

  async function addModelLayer(map, state) {
    if (state.layerRequested || map.getLayer('bp-eiffel-tower-source-mesh-v5983')) return;
    state.layerRequested = true;
    publish('loading-source-mesh', { attachedMaps: MAPS.size });
    try {
      const { THREE, GLTFLoader } = await loadModules();
      if (!nearEiffel(map) || !map.getStyle || !map.getStyle()) {
        state.layerRequested = false;
        return;
      }
      const layer = {
        id: 'bp-eiffel-tower-source-mesh-v5983',
        type: 'custom',
        renderingMode: '3d',
        onAdd(mapRef, gl) {
          this.map = mapRef;
          this.THREE = THREE;
          this.camera = new THREE.Camera();
          this.scene = new THREE.Scene();
          this.renderer = new THREE.WebGLRenderer({
            canvas: mapRef.getCanvas(), context: gl, antialias: false,
            alpha: true, powerPreference: 'low-power'
          });
          this.renderer.autoClear = false;
          this.ready = false;
          this.failed = false;
          new GLTFLoader().load(EIFFEL_SCAN_URL, gltf => {
            try {
              const prepared = prepareModel(THREE, gltf);
              this.scene = prepared.scene;
              this.sourceHeight = prepared.sourceHeight;
              this.ready = true;
              publish('source-mesh-loaded', { loaded: true, rendered: false, sourceHeightUnits: prepared.sourceHeight, loadedAt: Date.now() });
              if (state.chip) state.chip.dataset.show = 'true';
              mapRef.triggerRepaint();
            } catch (error) {
              this.failed = true;
              publish('model-normalization-error', { detail: String(error && error.message || error) });
              console.warn('BridgePoint Eiffel Tower normalization', error);
            }
          }, undefined, error => {
            this.failed = true;
            publish('asset-load-failed', { detail: String(error && error.message || error || 'GLB load failed') });
            console.warn('BridgePoint Eiffel Tower source mesh', error);
          });
        },
        render(gl, args) {
          if (!this.ready || this.failed || !nearEiffel(this.map)) return;
          try {
            const elevation = typeof this.map.queryTerrainElevation === 'function'
              ? this.map.queryTerrainElevation({ lng: EIFFEL[0], lat: EIFFEL[1] }, { exaggerated: false }) : 0;
            const groundM = Number.isFinite(elevation) ? elevation : 0;
            const modelMatrix = this.map.transform.getMatrixForModel(EIFFEL, groundM);
            const projection = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
            this.camera.projectionMatrix = projection.multiply(new THREE.Matrix4().fromArray(modelMatrix));
            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);
            publish('materialized-and-rendered', {
              loaded: true, rendered: true, renderedAt: Date.now(),
              terrainElevationM: groundM, baseAboveTerrainM: 0, sourceHeightUnits: this.sourceHeight,
              finalHeightM: OFFICIAL_HEIGHT_M, mapZoom: this.map.getZoom(),
              placement: { longitude: EIFFEL[0], latitude: EIFFEL[1], verticalReference: 'sampled live terrain elevation', scale: 'normalized to 330 m overall height' }
            });
            if (state.chip) state.chip.dataset.show = 'true';
          } catch (error) {
            publish('render-error', { detail: String(error && error.message || error) });
            console.warn('BridgePoint Eiffel Tower render', error);
          }
        },
        onRemove() {
          try {
            this.scene && this.scene.traverse(o => {
              if (o.geometry) o.geometry.dispose();
              if (o.material) {
                const mats = Array.isArray(o.material) ? o.material : [o.material];
                for (const m of mats) {
                  for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
                  m.dispose();
                }
              }
            });
            this.renderer && this.renderer.dispose();
          } catch (_) {}
        }
      };
      map.addLayer(layer);
      state.layerAdded = true;
      publish('3d-layer-added-awaiting-first-render', { attachedMaps: MAPS.size });
    } catch (error) {
      state.layerRequested = false;
      publish('three-import-error', { detail: String(error && error.message || error) });
      console.warn('BridgePoint Eiffel Tower loader', error);
    }
  }

  function update(map, state) {
    if (!map || !map.getStyle || !map.getStyle()) return;
    const inView = nearEiffel(map, 6.5);
    if (state.chip) state.chip.dataset.show = inView && nearEiffel(map) ? 'true' : 'false';
    if (!map.getSource('bp-eiffel-tower-point-v5983')) {
      try { setLabel(map); } catch (_) { return; }
    }
    if (nearEiffel(map)) addModelLayer(map, state);
    else publish('outside-close-view', { loaded: !!state.layerAdded, attachedMaps: MAPS.size, mapZoom: map.getZoom() });
  }

  function attach(map) {
    if (!map || STATES.has(map)) return;
    MAPS.add(map);
    const state = { installing: false, listeners: false, layerRequested: false, layerAdded: false, chip: null };
    STATES.set(map, state);
    const ready = () => install(map, state);
    map.on('style.load', ready);
    map.on('load', ready);
    if (map.isStyleLoaded && map.isStyleLoaded()) ready();
  }

  function discover() {
    for (const map of mapsFound()) attach(map);
    if (MAPS.size < 2 && discover.tries < 80) {
      discover.tries++;
      setTimeout(discover, 600);
    }
  }
  discover.tries = 0;
  window.addEventListener('bp:world-map-ready-v5940', event => {
    const map = event && event.detail && event.detail.map;
    if (map && typeof map.on === 'function') attach(map);
  });
  discover();
  window.addEventListener('load', discover, { once: true });
  publish('booting');
})();
