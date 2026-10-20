/* BridgePoint Lincoln Memorial original LiDAR point-cloud layer v5986.
 * Source: CyArk / DJS Associates, distributed through Open Heritage 3D.
 * DOI: 10.26301/90yg-1054. Potree metadata declares 665,663,299 source points.
 * Live point data streams from the publisher's Potree octree; it is not copied into this repository.
 * License: CC BY-NC-SA 4.0. Survey has no georeferencing; this integration applies a documented manual site anchor.
 */
(() => {
  'use strict';
  if (window.__BP_LINCOLN_POINTSCAN_V5986_BOOTED__) return;
  window.__BP_LINCOLN_POINTSCAN_V5986_BOOTED__ = true;

  const VERSION = 5986;
  const LOCATION = [-77.0502, 38.8893]; // longitude, latitude; Lincoln Memorial
  const GROUND_ANCHOR_LOCAL = [3.93, 12.983, 0];
  const SOURCE_URL = 'https://pointcloud.ucsd.edu/archive_temp/oh3d_store/oh3d-vis/datasets/90yg-1054/potree/90yg-1054_lidar_terrestrial/metadata.json';
  const SOURCE_BASE = 'https://pointcloud.ucsd.edu/archive_temp/oh3d_store/oh3d-vis/datasets/90yg-1054/potree/90yg-1054_lidar_terrestrial/';
  const POTREE_BASE = 'https://pointcloud.ucsd.edu/archive_temp/oh3d_store/oh3d-vis/base_potree_template/';
  const LOCAL_WORKER_ROOT = window.location.origin + '/assets/bp-potree-lincoln-runtime';
  const DATASET_URL = 'https://openheritage3d.org/project.php?id=90yg-1054';
  const SOURCE_LICENSE = 'CC BY-NC-SA 4.0';
  const LAYER_ID = 'bp-lincoln-point-scan-v5986';
  const MAPS = new Set();
  const STATES = new WeakMap();
  let runtimePromise = null;
  let originalFetch = null;

  function publish(status, extra = {}) {
    window.__BP_LINCOLN_POINTSCAN_V5986__ = Object.assign({
      version: VERSION,
      status,
      source: 'CyArk / DJS Associates terrestrial LiDAR',
      datasetDoi: '10.26301/90yg-1054',
      datasetUrl: DATASET_URL,
      pointCloudMetadata: SOURCE_URL,
      pointCount: 665663299,
      sourceDataIsStreamedNotMirrored: true,
      license: SOURCE_LICENSE,
      coordinates: LOCATION.slice(),
      coordinatesCrs: 'EPSG:4326',
      georeferencing: 'Manual local-coordinate anchor; source dataset itself is marked not georeferenced',
      renderer: 'Potree 1.8 octree LOD rendered in MapLibre shared WebGL context',
      pointBudgetDesktop: 1600000,
      pointBudgetMobile: 420000,
      updatedAt: Date.now()
    }, extra);
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const found = [...document.scripts].find(s => s.src === url);
      if (found) {
        if (found.dataset.bpPotreeLoaded === 'true') return resolve();
        found.addEventListener('load', () => resolve(), { once: true });
        found.addEventListener('error', () => reject(new Error('Script load failed: ' + url)), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = url;
      s.async = false;
      s.dataset.bpPotreeRuntime = '5986';
      s.onload = () => { s.dataset.bpPotreeLoaded = 'true'; resolve(); };
      s.onerror = () => reject(new Error('Script load failed: ' + url));
      document.head.appendChild(s);
    });
  }

  function patchRangeFetch() {
    if (originalFetch || typeof window.fetch !== 'function') return;
    originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url.startsWith(SOURCE_BASE) && init && init.headers) {
          const headers = new Headers(init.headers);
          // The source viewer's Potree loader sends this non-essential content-type on ranged GETs.
          // Dropping it avoids triggering an unnecessary CORS preflight; the Range request remains intact.
          if (headers.get('content-type') === 'multipart/byteranges') {
            headers.delete('content-type');
            init = Object.assign({}, init, { headers });
          }
        }
      } catch (_) {}
      return originalFetch(input, init);
    };
  }

  async function ensureRuntime() {
    if (runtimePromise) return runtimePromise;
    runtimePromise = (async () => {
      if (!window.THREE) {
        await loadScript(POTREE_BASE + 'libs/three.js/build/three.min.js');
      }
      if (!window.jQuery) {
        await loadScript(POTREE_BASE + 'libs/jquery/jquery-3.1.1.min.js');
      }
      if (!window.BinaryHeap) {
        await loadScript(POTREE_BASE + 'libs/other/BinaryHeap.js');
      }
      if (!window.TWEEN) {
        await loadScript(POTREE_BASE + 'libs/tween/tween.min.js');
      }
      if (!window.Potree || !window.Potree.loadPointCloud) {
        await loadScript(POTREE_BASE + 'build/potree/potree.js');
      }
      if (!window.THREE || !window.Potree || !window.Potree.updatePointClouds) {
        throw new Error('Potree / THREE runtime exports were not created');
      }
      // Keep the Brotli decoder worker same-origin; point data itself remains streamed from the publisher.
      window.Potree.scriptPath = LOCAL_WORKER_ROOT;
      window.Potree.resourcePath = LOCAL_WORKER_ROOT + '/resources';
      window.Potree.pointBudget = matchMedia('(max-width: 700px)').matches ? 420000 : 1600000;
      patchRangeFetch();
      return { THREE: window.THREE, Potree: window.Potree };
    })().catch(error => {
      runtimePromise = null;
      publish('runtime-load-error', { detail: String(error && error.message || error) });
      throw error;
    });
    return runtimePromise;
  }

  function findMaps() {
    const refs = [
      window.__BP_LANDING_WORLD__, window.__bpLandingWorldV5420,
      window.__BP_V5000_WORLD, window.__BP_V5000_WORLD__
    ];
    const found = [];
    for (const ref of refs) {
      const m = ref && ref.map;
      if (m && typeof m.on === 'function' && !found.includes(m)) found.push(m);
    }
    const pending = window.__BP_PENDING_LANDMARK_MAP_V5940__;
    if (pending && typeof pending.on === 'function' && !found.includes(pending)) found.push(pending);
    return found;
  }

  function mapNearScan(map) {
    try {
      if (!map || Number(map.getZoom()) < 13.35) return false;
      const b = map.getBounds();
      return LOCATION[0] >= b.getWest() && LOCATION[0] <= b.getEast() &&
        LOCATION[1] >= b.getSouth() && LOCATION[1] <= b.getNorth();
    } catch (_) { return false; }
  }

  function updateCard(state, text) {
    state.statusText = text;
    const chip = state.map?.getContainer?.().querySelector('.bp-lincoln-scan-chip-v5984');
    const small = chip?.querySelector('small');
    if (small) small.textContent = text;
  }

  function startPointCloud(map, state, Potree) {
    if (state.loadPromise || state.cloud || !mapNearScan(map)) return;
    state.loadPromise = true;
    publish('streaming-original-octree', { mapZoom: map.getZoom(), sourceUrl: SOURCE_URL });
    updateCard(state, 'STREAMING ORIGINAL LiDAR · 665.7M SOURCE POINTS');
    const start = Date.now();
    // Promise mode is intentional: the publisher's Potree 1.8 callback branch starts a redundant second load.
    Potree.loadPointCloud(SOURCE_URL, 'Lincoln Memorial original terrestrial LiDAR').then(result => {
      const cloud = result && result.pointcloud;
      if (!cloud) throw new Error('Potree returned no PointCloudOctree');
      state.cloud = cloud;
      cloud.name = 'Lincoln Memorial original terrestrial LiDAR';
      cloud.material.activeAttributeName = 'rgba';
      cloud.material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
      cloud.material.shape = Potree.PointShape.CIRCLE;
      cloud.material.minSize = 1.4;
      cloud.material.size = 1.0;
      cloud.material.opacity = 1.0;
      cloud.material.useEDL = false;
      cloud.visible = true;
      // The source is local XYZ (not georeferenced); orient Z-up into the map model's Y-up frame
      // and place the survey's documented Potree viewing target on the memorial's ground anchor.
      cloud.rotation.set(-Math.PI / 2, 0, 0);
      cloud.position.set(-GROUND_ANCHOR_LOCAL[0], 0, GROUND_ANCHOR_LOCAL[1]);
      cloud.updateMatrix();
      state.scene.add(cloud);
      state.loadPromise = false;
      state.dataReady = true;
      publish('source-octree-loaded', {
        loaded: true, sourcePoints: 665663299, loadMilliseconds: Date.now() - start,
        localBoundingBox: cloud.pcoGeometry?.boundingBox ? {
          min: cloud.pcoGeometry.boundingBox.min.toArray(),
          max: cloud.pcoGeometry.boundingBox.max.toArray()
        } : null,
        sourceProjection: cloud.pcoGeometry?.projection || '',
        georeferencedAt: LOCATION.slice(),
        renderMode: 'streamed Potree point-cloud LOD',
        attribution: 'CyArk / DJS Associates; Open Heritage 3D; CC BY-NC-SA 4.0'
      });
      updateCard(state, 'ORIGINAL LiDAR STREAM LOADED · zoom in to inspect the points');
      map.triggerRepaint();
    }).catch(error => {
      state.loadPromise = false;
      publish('source-octree-load-error', { detail: String(error && error.message || error), sourceUrl: SOURCE_URL });
      updateCard(state, 'LiDAR stream error · check scan-source access');
      console.warn('BridgePoint Lincoln original point cloud', error);
    });
  }

  function buildLayer(map, state, THREE, Potree) {
    return {
      id: LAYER_ID,
      type: 'custom',
      renderingMode: '3d',
      onAdd(mapRef, gl) {
        state.map = mapRef;
        state.THREE = THREE;
        state.Potree = Potree;
        state.gl = gl;
        state.scene = new THREE.Scene();
        state.camera = new THREE.Camera();
        state.renderer = new THREE.WebGLRenderer({
          canvas: mapRef.getCanvas(),
          context: gl,
          antialias: false,
          alpha: true,
          powerPreference: 'low-power'
        });
        state.renderer.autoClear = false;
        state.renderer.setPixelRatio(1);
        state.lastStatusAt = 0;
        updateCard(state, 'ORIGINAL LiDAR · 665.7M SOURCE POINTS · ZOOM IN');
        publish('map-render-layer-installed', { attachedMaps: MAPS.size, layerId: LAYER_ID });
      },
      render(gl, args) {
        if (!state.map || !state.renderer || !state.scene || !state.camera) return;
        const near = mapNearScan(state.map);
        const cloud = state.cloud;
        if (!near || !cloud) {
          if (cloud) cloud.visible = false;
          if (near && !cloud) startPointCloud(state.map, state, Potree);
          return;
        }
        cloud.visible = true;
        try {
          const map = state.map;
          const elevation = typeof map.queryTerrainElevation === 'function'
            ? map.queryTerrainElevation({ lng: LOCATION[0], lat: LOCATION[1] }, { exaggerated: false }) : 0;
          const groundM = Number.isFinite(elevation) ? elevation : 0;
          const modelMatrix = new THREE.Matrix4().fromArray(map.transform.getMatrixForModel(LOCATION, groundM));
          const projection = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
          state.camera.projectionMatrix.copy(projection).multiply(modelMatrix);
          state.camera.position.set(0, 0, 0);
          state.camera.matrixWorld.identity();
          state.camera.matrixWorldInverse.identity();
          state.camera.near = 0.01;
          state.camera.far = 1e12;
          state.scene.updateMatrixWorld(true);
          state.renderer.resetState();
          Potree.updatePointClouds([cloud], state.camera, state.renderer);
          state.renderer.render(state.scene, state.camera);
          const nodes = Number(cloud.numVisibleNodes || 0);
          const points = Number(cloud.numVisiblePoints || 0);
          const now = Date.now();
          if (nodes > 0) {
            if (window.__BP_LINCOLN_POINTSCAN_V5986__?.status !== 'rendering-source-points' ||
                now - state.lastStatusAt > 2500) {
              publish('rendering-source-points', {
                loaded: true, rendered: true, visibleNodes: nodes, visiblePoints: points,
                mapZoom: map.getZoom(), terrainElevationM: groundM,
                sourcePoints: 665663299, placement: 'local scan manually anchored to EPSG:4326 site point',
                attribution: 'CyArk / DJS Associates · Open Heritage 3D · CC BY-NC-SA 4.0'
              });
              updateCard(state, 'ORIGINAL LiDAR RENDERING · ' + points.toLocaleString() + ' POINTS VISIBLE');
              state.lastStatusAt = now;
            }
          }
          // Keep LOD selection and asynchronous node arrivals updating while the survey is in view.
          map.triggerRepaint();
        } catch (error) {
          publish('pointcloud-render-error', { detail: String(error && error.message || error), mapZoom: state.map.getZoom() });
          console.warn('BridgePoint Lincoln point-cloud render', error);
        }
      },
      onRemove() {
        try { state.renderer?.dispose(); } catch (_) {}
      }
    };
  }

  async function attach(map) {
    if (!map || STATES.has(map)) return;
    const state = { map, installing: false, layerAdded: false, loadPromise: false, cloud: null, scene: null, camera: null, renderer: null, statusText: '' };
    STATES.set(map, state);
    MAPS.add(map);
    const install = async () => {
      if (state.installing || state.layerAdded || !map.getStyle || !map.getStyle()) return;
      state.installing = true;
      try {
        const { THREE, Potree } = await ensureRuntime();
        if (!map.getStyle || !map.getStyle()) return;
        if (!map.getLayer(LAYER_ID)) map.addLayer(buildLayer(map, state, THREE, Potree));
        state.layerAdded = true;
        map.on('moveend', () => { if (mapNearScan(map)) startPointCloud(map, state, Potree); map.triggerRepaint(); });
        map.on('zoomend', () => { if (mapNearScan(map)) startPointCloud(map, state, Potree); map.triggerRepaint(); });
        if (mapNearScan(map)) startPointCloud(map, state, Potree);
        publish('layer-attached', { attachedMaps: MAPS.size, layerId: LAYER_ID });
      } catch (error) {
        publish('layer-install-error', { detail: String(error && error.message || error) });
        console.warn('BridgePoint Lincoln point-cloud install', error);
      } finally {
        state.installing = false;
      }
    };
    map.on('style.load', install);
    map.on('load', install);
    if (map.isStyleLoaded && map.isStyleLoaded()) install();
  }

  function discover() {
    for (const map of findMaps()) attach(map);
    if (MAPS.size < 1 && discover.tries < 100) {
      discover.tries++;
      setTimeout(discover, 500);
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
