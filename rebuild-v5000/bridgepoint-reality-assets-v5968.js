/* BridgePoint Reality Mesh Assets v5968
 * Lazy, single-mesh photogrammetry viewer for reviewed, same-origin GLB assets.
 * No assets are synthesized. The catalog stays empty until a source/license/calibration
 * record and matching hosted GLB have been reviewed and published.
 */
(() => {
  'use strict';
  if (window.__BP_REALITY_ASSETS_V5968__) return;

  const VERSION = 5968;
  const MANIFEST_URL = '/assets/reality-assets/manifest.json';
  const ASSET_PREFIX = '/assets/reality-assets/';
  const MAX_ASSETS = 40;
  const MAX_GLB_BYTES = 35 * 1024 * 1024;
  const THREE_URL = 'https://esm.sh/three@0.169.0';
  const GLTF_URL = 'https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';

  let manifestPromise = null;
  let modulesPromise = null;
  let selectedAsset = null;
  let pendingAsset = null;
  let activeLayer = null;
  let activeMap = null;
  let loadPromise = null;
  let lastMessage = 'Waiting for the BridgePoint map.';
  let lastError = null;
  const MAPS = new Set();
  const MAP_STATE = new WeakMap();

  const $ = id => document.getElementById(id);
  const fmt = n => Number(n || 0).toLocaleString();
  const safeText = (v, max = 220) => String(v ?? '').replace(/[<>]/g, '').slice(0, max);
  const numeric = v => typeof v === 'number' && Number.isFinite(v);
  const validHttpUrl = value => {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch (_) { return false; }
  };

  function validateAsset(raw, index) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const id = String(raw.id || '');
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) return null;
    const title = String(raw.title || '').trim();
    const modelUrl = String(raw.modelUrl || '');
    if (!title || !modelUrl.startsWith(ASSET_PREFIX) || !modelUrl.endsWith('.glb')) return null;
    if (modelUrl.includes('..') || modelUrl.includes('?') || modelUrl.includes('#') || modelUrl.includes('\\')) return null;

    const west = raw.boundsWgs84?.[0], south = raw.boundsWgs84?.[1];
    const east = raw.boundsWgs84?.[2], north = raw.boundsWgs84?.[3];
    const lng = raw.longitude, lat = raw.latitude;
    if (![west, south, east, north, lng, lat].every(numeric)) return null;
    if (west < -180 || east > 180 || west >= east || south < -90 || north > 90 || south >= north) return null;
    if (east - west > 5 || north - south > 5 || lng < west || lng > east || lat < south || lat > north) return null;
    if (!numeric(raw.targetHeightMeters) || raw.targetHeightMeters < 0.2 || raw.targetHeightMeters > 5000) return null;
    if (!numeric(raw.minZoom) || raw.minZoom < 12 || raw.minZoom > 21) return null;
    if (!['Y', 'Z'].includes(raw.upAxis)) return null;
    if (raw.groundOffsetMeters != null && (!numeric(raw.groundOffsetMeters) || Math.abs(raw.groundOffsetMeters) > 100)) return null;
    if (raw.rotationDegrees != null && !numeric(raw.rotationDegrees)) return null;
    if (!String(raw.source || '').trim() || !String(raw.license || '').trim() || !String(raw.attribution || '').trim()) return null;
    if (!validHttpUrl(String(raw.sourceUrl || ''))) return null;
    if (!/^\d{4}-\d{2}-\d{2}(?:T.*(?:Z|[+-]\d{2}:\d{2}))?$/.test(String(raw.capturedAt || ''))) return null;
    const date = new Date(raw.capturedAt);
    if (!Number.isFinite(date.getTime())) return null;

    return {
      id, title: title.slice(0, 140), modelUrl,
      boundsWgs84: [west, south, east, north],
      longitude: lng, latitude: lat,
      groundOffsetMeters: Number(raw.groundOffsetMeters || 0),
      targetHeightMeters: raw.targetHeightMeters,
      minZoom: raw.minZoom,
      upAxis: raw.upAxis,
      rotationDegrees: Number(raw.rotationDegrees || 0),
      source: String(raw.source).trim().slice(0, 160),
      sourceUrl: String(raw.sourceUrl).trim(),
      license: String(raw.license).trim().slice(0, 140),
      attribution: String(raw.attribution).trim().slice(0, 240),
      capturedAt: String(raw.capturedAt),
      notes: String(raw.notes || '').trim().slice(0, 400),
      index
    };
  }

  async function loadManifest(force = false) {
    if (manifestPromise && !force) return manifestPromise;
    manifestPromise = (async () => {
      const response = await fetch(MANIFEST_URL, {
        cache: force ? 'no-cache' : 'force-cache',
        credentials: 'omit',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Mesh manifest HTTP ' + response.status);
      const body = await response.json();
      if (!body || body.schemaVersion !== 1 || !Array.isArray(body.assets) || body.assets.length > MAX_ASSETS) {
        throw new Error('Mesh manifest schema is invalid or exceeds the asset cap.');
      }
      const seen = new Set();
      const assets = [];
      for (let i = 0; i < body.assets.length; i++) {
        const asset = validateAsset(body.assets[i], i);
        if (!asset || seen.has(asset.id)) throw new Error('Mesh entry ' + (i + 1) + ' has invalid metadata or a duplicate ID.');
        seen.add(asset.id);
        assets.push(asset);
      }
      return { schemaVersion: 1, assets, updatedAt: body.updatedAt || null };
    })().catch(error => {
      manifestPromise = null;
      throw error;
    });
    return manifestPromise;
  }

  function css() {
    if ($('bp-reality-assets-style-v5968')) return;
    const style = document.createElement('style');
    style.id = 'bp-reality-assets-style-v5968';
    style.textContent = [
      '#bp-reality-assets-v5968{position:absolute;z-index:38;top:max(76px,calc(env(safe-area-inset-top) + 72px));right:10px;width:min(355px,calc(100% - 20px));max-height:min(62dvh,540px);overflow:auto;box-sizing:border-box;padding:12px;border:1px solid rgba(104,225,255,.36);border-radius:13px;background:linear-gradient(150deg,rgba(5,19,28,.98),rgba(3,10,17,.98));box-shadow:0 15px 42px rgba(0,0,0,.4);color:#e7f8ff;font:12px/1.45 system-ui,sans-serif}',
      '#bp-reality-assets-v5968[hidden]{display:none!important}',
      '#bp-reality-assets-v5968 *{box-sizing:border-box}',
      '#bp-reality-assets-v5968 .bp-ra-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}',
      '#bp-reality-assets-v5968 .bp-ra-kicker{font-size:9px;letter-spacing:.14em;color:#7ce9ff;font-weight:950}',
      '#bp-reality-assets-v5968 .bp-ra-title{font-size:14px;font-weight:950;color:#fff;margin-top:2px}',
      '#bp-reality-assets-v5968 .bp-ra-close{border:1px solid rgba(130,200,218,.35);background:#102630;color:#e7faff;border-radius:8px;padding:3px 8px;min-height:28px;cursor:pointer}',
      '#bp-reality-assets-v5968 .bp-ra-sub,#bp-reality-assets-v5968 .bp-ra-note{font-size:10px;color:#9fbac8;margin-top:6px}',
      '#bp-reality-assets-v5968 .bp-ra-status{font-size:10px;color:#8feaff;min-height:16px;margin:9px 0;overflow-wrap:anywhere}',
      '#bp-reality-assets-v5968 .bp-ra-status[data-error=true]{color:#ffb5a5}',
      '#bp-reality-assets-v5968 .bp-ra-item{border-top:1px solid rgba(147,207,225,.16);padding:10px 0}',
      '#bp-reality-assets-v5968 .bp-ra-item h3{font-size:12px;margin:0 0 5px;color:#fff}',
      '#bp-reality-assets-v5968 .bp-ra-meta{font-size:10px;color:#aac4cf;overflow-wrap:anywhere}',
      '#bp-reality-assets-v5968 .bp-ra-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}',
      '#bp-reality-assets-v5968 .bp-ra-btn{border:1px solid rgba(104,225,255,.38);border-radius:8px;background:#0b2b39;color:#e4faff;padding:7px 10px;font:750 10px system-ui,sans-serif;cursor:pointer}',
      '#bp-reality-assets-v5968 .bp-ra-btn[disabled]{opacity:.45;cursor:not-allowed}',
      '#bp-reality-assets-v5968 .bp-ra-link{color:#8ceaff;font-size:10px;text-decoration:underline}',
      '.bp-reality-toggle-v5968{border:1px solid rgba(104,225,255,.42)!important;background:#0c2632!important;color:#e7faff!important;font-weight:850!important}',
      '@media(max-width:520px){#bp-reality-assets-v5968{right:8px;width:calc(100% - 16px);max-height:52dvh;padding:10px}#bp-reality-assets-v5968 .bp-ra-title{font-size:13px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function currentMaps() {
    const worlds = [
      window.__BP_LANDING_WORLD__,
      window.__bpLandingWorldV5420,
      window.__BP_V5000_WORLD,
      window.__BP_V5000_WORLD__
    ];
    const found = [];
    for (const world of worlds) {
      const map = world && world.map;
      if (map && typeof map.on === 'function' && !found.includes(map)) found.push(map);
    }
    return found;
  }

  function mapBoundsIntersects(map, asset) {
    try {
      const b = map.getBounds();
      const sw = asset.boundsWgs84;
      const south = b.getSouth(), north = b.getNorth();
      if (north < sw[1] || south > sw[3]) return false;
      const west = b.getWest(), east = b.getEast();
      if (east - west >= 359) return true;
      const span = east - west;
      const start = ((west + 180) % 360 + 360) % 360 - 180;
      const end = start + span;
      const viewSegments = end <= 180 ? [[start, end]] : [[start, 180], [-180, end - 360]];
      return viewSegments.some(segment => segment[0] <= sw[2] && segment[1] >= sw[0]);
    } catch (_) { return false; }
  }

  function inAssetView(map, asset) {
    return !!map && !!asset && Number(map.getZoom()) >= asset.minZoom - 0.35 && mapBoundsIntersects(map, asset);
  }

  function disposeObject(THREE, root) {
    if (!root || !THREE) return;
    try {
      root.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
        for (const material of materials) {
          for (const value of Object.values(material || {})) {
            if (value && value.isTexture) value.dispose();
          }
          if (material && material.dispose) material.dispose();
        }
      });
    } catch (_) {}
  }

  function prepareScene(THREE, gltf, asset) {
    const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
    if (!root) throw new Error('GLB has no scene.');
    root.updateMatrixWorld(true);
    if (asset.upAxis === 'Z') root.rotation.x = -Math.PI / 2;
    root.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(root);
    let size = box.getSize(new THREE.Vector3());
    const height = size.y;
    if (!Number.isFinite(height) || height <= 0.001) throw new Error('GLB has no measurable height after axis normalization.');
    root.scale.setScalar(asset.targetHeightMeters / height);
    root.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(root);
    root.position.x -= (box.min.x + box.max.x) * 0.5;
    root.position.z -= (box.min.z + box.max.z) * 0.5;
    root.position.y -= box.min.y;

    const wrapper = new THREE.Group();
    wrapper.rotation.y = THREE.MathUtils.degToRad(asset.rotationDegrees);
    wrapper.add(root);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const key = new THREE.DirectionalLight(0xffffff, 1.75);
    key.position.set(45, 70, 80);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfefff, 0.5);
    fill.position.set(-40, 25, -30);
    scene.add(fill);
    scene.add(wrapper);
    return { scene, root, sourceHeightUnits: height, scale: asset.targetHeightMeters / height };
  }

  function setStatus(message, isError = false) {
    lastMessage = safeText(message, 320);
    lastError = isError ? lastMessage : null;
    const el = $('bp-reality-assets-status-v5968');
    if (el) {
      el.textContent = lastMessage;
      el.dataset.error = isError ? 'true' : 'false';
    }
    const panel = $('bp-reality-assets-v5968');
    if (panel) panel.dataset.error = isError ? 'true' : 'false';
    const state = window.__BP_REALITY_ASSETS_V5968__;
    if (state) {
      state.status = lastMessage;
      state.error = lastError;
      state.updatedAt = Date.now();
    }
  }

  function buildUI(map, state) {
    css();
    const container = map.getContainer();
    if (!container || !container.id) return false;
    const safeId = container.id.replace(/[^a-zA-Z0-9_-]/g, '-');
    const buttonId = 'bp-reality-toggle-v5968-' + safeId;
    let button = $(buttonId);
    if (!button) {
      button = document.createElement('button');
      button.id = buttonId;
      button.type = 'button';
      button.textContent = '3D MESHES';
      button.className = 'bp-reality-toggle-v5968';
      const tools = document.querySelector('.map-tools');
      if (container.id === 'liveMap' && tools) {
        tools.appendChild(button);
      } else {
        Object.assign(button.style, {
          position: 'absolute',
          zIndex: '39',
          right: '12px',
          top: 'max(70px,calc(env(safe-area-inset-top) + 66px))',
          minHeight: '34px',
          borderRadius: '8px',
          padding: '7px 9px',
          cursor: 'pointer',
          font: '800 10px system-ui,sans-serif'
        });
        container.appendChild(button);
      }
      button.addEventListener('click', () => {
        const panel = $('bp-reality-assets-v5968');
        if (!panel) return;
        panel.hidden = !panel.hidden;
        if (!panel.hidden) void renderCatalog(map, safeId);
      });
    }
    let panel = $('bp-reality-assets-v5968-' + safeId);
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'bp-reality-assets-v5968';
      panel.hidden = true;
      panel.innerHTML = '<div class="bp-ra-head"><div><div class="bp-ra-kicker">BRIDGEPOINT · REALITY ASSETS</div><div class="bp-ra-title">Photogrammetry / 3D capture</div></div><button type="button" class="bp-ra-close" aria-label="Close 3D capture panel">×</button></div><div class="bp-ra-sub">Reviewed, source-backed meshes load only when requested and close to their mapped region. One mesh at a time.</div><div id="bp-reality-assets-status-v5968" class="bp-ra-status" role="status">Checking the capture catalog…</div><div id="bp-reality-assets-list-v5968"></div><p class="bp-ra-note">A capture is only shown when its model, geographic alignment, acquisition date, attribution and licence are recorded. Missing assets are never replaced with invented geometry.</p>';
      container.appendChild(panel);
      panel.querySelector('.bp-ra-close')?.addEventListener('click', () => { panel.hidden = true; });
    }
    state.button = button;
    state.panel = panel;
    void renderCatalog(map, safeId);
    return true;
  }

  async function renderCatalog(map, safeId) {
    const list = $('bp-reality-assets-list-v5968');
    if (!list) return;
    list.replaceChildren();
    setStatus('Loading the reviewed capture catalog…');
    try {
      const manifest = await loadManifest();
      if (!manifest.assets.length) {
        list.textContent = 'No verified photogrammetry meshes are published yet. The viewer is ready, but no area is represented as drone-scanned until a calibrated, licensed asset is added.';
        setStatus('Catalog valid · 0 published meshes · no download or rendering started.');
        return;
      }
      for (const asset of manifest.assets) {
        const item = document.createElement('article');
        item.className = 'bp-ra-item';
        const title = document.createElement('h3');
        title.textContent = asset.title;
        const meta = document.createElement('div');
        meta.className = 'bp-ra-meta';
        meta.textContent = [
          'Captured ' + asset.capturedAt,
          asset.source,
          'Licence: ' + asset.license,
          asset.attribution,
          'Calibration height: ' + asset.targetHeightMeters + ' m'
        ].join(' · ');
        item.append(title, meta);
        if (asset.notes) {
          const notes = document.createElement('div');
          notes.className = 'bp-ra-meta';
          notes.style.marginTop = '5px';
          notes.textContent = asset.notes;
          item.appendChild(notes);
        }
        const actions = document.createElement('div');
        actions.className = 'bp-ra-actions';
        const show = document.createElement('button');
        show.type = 'button';
        show.className = 'bp-ra-btn';
        show.textContent = selectedAsset?.id === asset.id && activeLayer ? 'Loaded · unload' : 'Focus + load mesh';
        show.addEventListener('click', () => {
          if (selectedAsset?.id === asset.id && activeLayer) {
            unloadActive(map, 'Mesh unloaded to conserve memory.');
            pendingAsset = null;
            selectedAsset = null;
            renderCatalog(map, safeId);
          } else {
            void focusAndLoad(map, asset, safeId);
          }
        });
        const source = document.createElement('a');
        source.className = 'bp-ra-link';
        source.href = asset.sourceUrl;
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        source.textContent = 'Source / licence record';
        actions.append(show, source);
        item.appendChild(actions);
        list.appendChild(item);
      }
      if (!activeLayer) setStatus(manifest.assets.length + ' reviewed catalog entr' + (manifest.assets.length === 1 ? 'y' : 'ies') + ' · nothing loaded until selected.');
    } catch (error) {
      list.textContent = 'The capture catalog could not be verified. Mesh loading is disabled until the manifest can be read and validated.';
      setStatus(error && error.message ? error.message : 'Capture catalog unavailable.', true);
    }
  }

  async function modelSizeOk(asset) {
    const response = await fetch(asset.modelUrl, {
      method: 'HEAD',
      cache: 'force-cache',
      credentials: 'omit'
    });
    if (!response.ok) throw new Error('Mesh file HTTP ' + response.status);
    const length = Number(response.headers.get('content-length') || 0);
    if (!Number.isFinite(length) || length <= 0) throw new Error('Mesh file size could not be verified.');
    if (length > MAX_GLB_BYTES) throw new Error('Mesh exceeds the 35 MiB single-asset safety limit.');
    return length;
  }

  async function loadThreeModules() {
    if (!modulesPromise) {
      modulesPromise = Promise.all([import(THREE_URL), import(GLTF_URL)])
        .then(modules => ({ THREE: modules[0], GLTFLoader: modules[1].GLTFLoader }))
        .catch(error => { modulesPromise = null; throw error; });
    }
    return modulesPromise;
  }

  async function focusAndLoad(map, asset, safeId) {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      if (activeLayer && activeMap && activeLayer.id !== asset.id) unloadActive(activeMap, 'Switching the active mesh.');
      selectedAsset = asset;
      pendingAsset = asset;
      lastMessage = 'Moving to ' + asset.title + '…';
      setStatus(lastMessage);
      try {
        map.easeTo({
          center: [asset.longitude, asset.latitude],
          zoom: Math.max(Number(map.getZoom()), asset.minZoom + 0.4),
          pitch: Math.max(Number(map.getPitch()) || 0, 50),
          duration: 900,
          essential: true
        });
      } catch (_) {}
      await new Promise(resolve => {
        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          map.off('moveend', done);
          resolve();
        };
        map.on('moveend', done);
        setTimeout(done, 1600);
      });
      if (!inAssetView(map, asset)) throw new Error('Camera did not arrive inside the reviewed mesh bounds. Check the anchor/bounds calibration.');
      await modelSizeOk(asset);
      const { THREE, GLTFLoader } = await loadThreeModules();
      if (pendingAsset?.id !== asset.id || !inAssetView(map, asset)) throw new Error('Mesh load cancelled because the camera left its region.');
      const layer = {
        id: 'bp-reality-capture-' + asset.id,
        type: 'custom',
        renderingMode: '3d',
        onAdd(mapRef, gl) {
          this.map = mapRef;
          this.THREE = THREE;
          this.scene = new THREE.Scene();
          this.camera = new THREE.Camera();
          this.renderer = new THREE.WebGLRenderer({
            canvas: mapRef.getCanvas(),
            context: gl,
            antialias: false,
            alpha: true,
            powerPreference: 'low-power'
          });
          this.renderer.autoClear = false;
          this.ready = false;
          this.removed = false;
          this.failed = false;
          setStatus('Downloading reviewed mesh: ' + asset.title + '…');
          const loader = new GLTFLoader();
          loader.load(asset.modelUrl, gltf => {
            try {
              if (this.removed || activeLayer !== this || pendingAsset?.id !== asset.id) {
                disposeObject(THREE, gltf.scene || (gltf.scenes && gltf.scenes[0]));
                return;
              }
              const prepared = prepareScene(THREE, gltf, asset);
              this.scene = prepared.scene;
              this.root = prepared.root;
              this.sourceHeightUnits = prepared.sourceHeightUnits;
              this.ready = true;
              state.loadedAsset = asset.id;
              state.loadedAt = Date.now();
              setStatus('Mesh loaded · waiting for the next map frame to confirm render.');
              mapRef.triggerRepaint();
              renderCatalog(map, safeId);
            } catch (error) {
              this.failed = true;
              setStatus('Mesh normalization failed: ' + (error?.message || error), true);
              console.warn('BridgePoint reality mesh normalization', error);
            }
          }, undefined, error => {
            this.failed = true;
            setStatus('Mesh download failed; the base map remains active.', true);
            console.warn('BridgePoint reality mesh download', error);
          });
        },
        render(gl, args) {
          if (!this.ready || this.failed || this.removed || !inAssetView(this.map, asset)) return;
          try {
            const terrain = typeof this.map.queryTerrainElevation === 'function'
              ? (this.map.queryTerrainElevation({ lng: asset.longitude, lat: asset.latitude }, { exaggerated: false }) || 0)
              : 0;
            const modelMatrix = this.map.transform.getMatrixForModel(
              [asset.longitude, asset.latitude],
              terrain + asset.groundOffsetMeters
            );
            const projection = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
            const model = new THREE.Matrix4().fromArray(modelMatrix);
            this.camera.projectionMatrix = projection.multiply(model);
            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);
            if (!this.reportedRendered) {
              this.reportedRendered = true;
              state.renderedAsset = asset.id;
              state.renderedAt = Date.now();
              setStatus('Rendered source mesh · ' + asset.title + ' · ' + asset.license + '.');
              renderCatalog(map, safeId);
            }
          } catch (error) {
            if (!this.renderWarned) {
              this.renderWarned = true;
              setStatus('3D mesh could not render at this location; the base map remains available.', true);
              console.warn('BridgePoint reality mesh render', error);
            }
          }
        },
        onRemove() {
          this.removed = true;
          disposeObject(THREE, this.scene);
          try { this.renderer?.dispose(); } catch (_) {}
          if (activeLayer === this) activeLayer = null;
          if (activeMap === mapRef) activeMap = null;
          if (state.loadedAsset === asset.id) state.loadedAsset = null;
        }
      };
      activeLayer = layer;
      activeMap = map;
      pendingAsset = asset;
      map.addLayer(layer);
      setStatus('Mesh renderer attached · loading source geometry…');
    })().catch(error => {
      pendingAsset = null;
      setStatus(error && error.message ? error.message : 'Mesh loading was stopped.', true);
      console.warn('BridgePoint reality asset load', error);
    }).finally(() => { loadPromise = null; });
    return loadPromise;
  }

  function unloadActive(map, message) {
    pendingAsset = null;
    if (activeLayer && activeMap && activeMap.getLayer(activeLayer.id)) {
      try { activeMap.removeLayer(activeLayer.id); } catch (_) {}
    }
    activeLayer = null;
    activeMap = null;
    if (message) setStatus(message);
  }

  function mapChanged(map, safeId) {
    if (pendingAsset && !activeLayer && !loadPromise && inAssetView(map, pendingAsset)) {
      void focusAndLoad(map, pendingAsset, safeId);
    }
    if (activeLayer && activeMap === map && !inAssetView(map, selectedAsset)) {
      unloadActive(map, 'Mesh automatically unloaded outside its close-view region to preserve performance.');
      selectedAsset = null;
      renderCatalog(map, safeId);
    }
  }

  function attachMap(map) {
    if (!map || MAPS.has(map) || typeof map.getContainer !== 'function') return;
    MAPS.add(map);
    const container = map.getContainer();
    if (!container) return;
    const safeId = container.id.replace(/[^a-zA-Z0-9_-]/g, '-') || 'map';
    const state = { version: VERSION, map, container, safeId, button: null, panel: null, loadedAsset: null, renderedAsset: null };
    MAP_STATE.set(map, state);
    buildUI(map, state);
    const changed = () => mapChanged(map, safeId);
    map.on('moveend', changed);
    map.on('zoomend', changed);
    map.on('remove', () => unloadActive(map, 'Map closed; mesh renderer released.'));
  }

  async function discoverMaps() {
    for (const map of currentMaps()) attachMap(map);
    if (MAPS.size === 0 && !discoverMaps.stopped) {
      discoverMaps.attempts = (discoverMaps.attempts || 0) + 1;
      if (discoverMaps.attempts < 100) setTimeout(discoverMaps, 500);
      else discoverMaps.stopped = true;
    }
  }
  discoverMaps.attempts = 0;

  window.__BP_REALITY_ASSETS_V5968__ = {
    version: VERSION,
    status: lastMessage,
    error: null,
    catalogUrl: MANIFEST_URL,
    maxCatalogEntries: MAX_ASSETS,
    maxSingleMeshBytes: MAX_GLB_BYTES,
    renderer: 'MapLibre custom 3D layer sharing the existing map WebGL context',
    loadedAsset: null,
    renderedAsset: null,
    refresh: async () => {
      manifestPromise = null;
      await loadManifest(true);
      for (const map of MAPS) {
        const state = MAP_STATE.get(map);
        if (state) await renderCatalog(map, state.safeId);
      }
      return true;
    },
    unload: () => {
      if (activeMap) unloadActive(activeMap, 'Mesh manually unloaded.');
      selectedAsset = null;
      pendingAsset = null;
      return true;
    },
    getState: () => ({
      version: VERSION,
      status: lastMessage,
      error: lastError,
      catalogCount: manifestPromise ? 'loaded-or-loading' : 'not-yet-loaded',
      selectedAsset: selectedAsset?.id || null,
      activeLayer: activeLayer?.id || null,
      loadedAsset: activeLayer?.ready ? selectedAsset?.id || null : null,
      renderedAsset: activeLayer?.reportedRendered ? selectedAsset?.id || null : null,
      singleMeshCap: 1,
      maxSingleMeshBytes: MAX_GLB_BYTES
    })
  };

  window.addEventListener('load', discoverMaps, { once: true });
  window.addEventListener('bp:world-map-ready-v5940', discoverMaps);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', discoverMaps, { once: true });
  else void discoverMaps();

  const observer = new MutationObserver(() => {
    for (const map of currentMaps()) {
      if (!MAPS.has(map)) attachMap(map);
    }
  });
  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
})();