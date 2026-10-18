/* BridgePoint source-backed landmarks v5940
 * Statue of Liberty: Metron3D laser scan (CC BY), lazy-loaded on close view only.
 * Great Wall: simplified full-route overview at wide zoom + regional GeoJSON at close zoom (MIT).
 * Wall height/width are explicitly estimated where no surveyed cross-section exists.
 */
(() => {
  'use strict';
  if (window.__BP_LANDMARKS_V5940__) return;

  const VERSION = 5940;
  const EMPTY = { type: 'FeatureCollection', features: [] };
  const STATUE = [-74.044643, 40.689211];
  const STATUE_HEIGHT_M = 93.0;
  const STATUE_FACING_DEG = 135;
  const STATUE_SCAN_URL = '/assets/statue-of-liberty-scan-v5940.glb';
  const THREE_URL = 'https://esm.sh/three@0.169.0';
  const GLTF_URL = 'https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';
  const WALL_WIDTH_M_EST = 5.0;
  const WALL_HEIGHT_M_EST = 6.5;
  const OVERVIEW_SOURCE = '/assets/great-wall-overview-v5940.geojson';
  const REGION_SOURCE = 'https://raw.githubusercontent.com/Adl3rAi/The-Great-Wall-of-China-geodata/main/';
  const REGIONS = [
    { id: 'gansu', box: [92.0, 35.0, 107.6, 42.8], url: 'direction/gansu.geojson' },
    { id: 'ningxia', box: [104.0, 35.0, 108.2, 39.8], url: 'direction/ningxia.geojson' },
    { id: 'shaanxi', box: [105.0, 31.5, 111.4, 39.8], url: 'direction/shaanxi.geojson' },
    { id: 'shanxi', box: [109.5, 34.2, 114.8, 41.2], url: 'direction/shanxi.geojson' },
    { id: 'hebei', box: [113.0, 36.2, 120.4, 42.8], url: 'direction/hebei.geojson' },
    { id: 'beijing', box: [115.1, 39.2, 117.8, 41.3], url: 'direction/beijing.geojson' },
    { id: 'tianjin', box: [116.5, 38.3, 118.3, 40.6], url: 'direction/tianjin.geojson' },
    { id: 'liaodong', box: [118.8, 39.4, 124.8, 42.8], url: 'direction/liaodong.geojson' }
  ];

  const REGION_CACHE = new Map();
  let overviewPromise = null;
  const MAPS = new Set();
  const MAP_STATE = new WeakMap();
  const featureBounds = new WeakMap();
  let modulesPromise = null;

  const overlayStyle = document.createElement('style');
  overlayStyle.id = 'bp-landmarks-style-v5940';
  overlayStyle.textContent =
    '.bp-landmark-chip-v5940{position:absolute;z-index:1102;left:10px;top:max(62px,calc(env(safe-area-inset-top) + 60px));max-width:min(290px,calc(100% - 20px));display:none;gap:8px;align-items:center;padding:8px 11px;border:1px solid rgba(106,225,255,.34);border-radius:12px;background:linear-gradient(135deg,rgba(4,17,27,.94),rgba(8,36,49,.92));box-shadow:0 10px 28px rgba(0,0,0,.28);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#e9fbff;font:700 10px/1.4 system-ui,sans-serif;pointer-events:none}' +
    '.bp-landmark-chip-v5940[data-show="true"]{display:flex}' +
    '.bp-landmark-chip-v5940 i{width:7px;height:7px;flex:0 0 7px;border-radius:50%;background:#68e5b7;box-shadow:0 0 10px rgba(104,229,183,.6)}' +
    '.bp-landmark-chip-v5940 span{min-width:0;overflow-wrap:anywhere}' +
    '.bp-landmark-chip-v5940 small{display:block;margin-top:2px;color:#92bdcb;font-size:9px;font-weight:600}';
  document.head.appendChild(overlayStyle);

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

  function boundsArray(map, pad) {
    const b = map.getBounds();
    return [b.getWest() - pad, b.getSouth() - pad, b.getEast() + pad, b.getNorth() + pad];
  }

  function intersects(a, b) {
    return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
  }

  function regionIntersects(region, view) {
    return intersects(region.box, view);
  }

  function getFeatureBounds(feature) {
    if (featureBounds.has(feature)) return featureBounds.get(feature);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const walk = value => {
      if (!Array.isArray(value)) return;
      if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
        minX = Math.min(minX, value[0]); maxX = Math.max(maxX, value[0]);
        minY = Math.min(minY, value[1]); maxY = Math.max(maxY, value[1]);
      } else {
        for (const child of value) walk(child);
      }
    };
    walk(feature && feature.geometry && feature.geometry.coordinates);
    const result = [minX, minY, maxX, maxY];
    featureBounds.set(feature, result);
    return result;
  }

  async function loadOverview() {
    if (!overviewPromise) {
      overviewPromise = fetch(OVERVIEW_SOURCE, {
        mode: 'cors',
        credentials: 'omit',
        cache: 'force-cache'
      }).then(response => {
        if (!response.ok) throw new Error('Overview route HTTP ' + response.status);
        return response.json();
      }).then(data => {
        if (!data || !Array.isArray(data.features)) throw new Error('Invalid overview route GeoJSON');
        return data.features.filter(f => f && f.geometry &&
          (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'));
      }).catch(error => {
        overviewPromise = null;
        throw error;
      });
    }
    return overviewPromise;
  }

  async function loadRegion(region) {
    if (!REGION_CACHE.has(region.id)) {
      REGION_CACHE.set(region.id, fetch(REGION_SOURCE + region.url, {
        mode: 'cors',
        credentials: 'omit',
        cache: 'force-cache'
      }).then(response => {
        if (!response.ok) throw new Error('Route source HTTP ' + response.status);
        return response.json();
      }).then(data => {
        if (!data || !Array.isArray(data.features)) throw new Error('Invalid route GeoJSON');
        return data.features.filter(f => f && f.geometry &&
          (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'));
      }).catch(error => {
        REGION_CACHE.delete(region.id);
        throw error;
      }));
    }
    return REGION_CACHE.get(region.id);
  }

  function getStride(zoom, mobile) {
    if (zoom < 5.5) return mobile ? 36 : 24;
    if (zoom < 7.5) return mobile ? 18 : 12;
    if (zoom < 9.5) return mobile ? 8 : 5;
    if (zoom < 11.5) return mobile ? 5 : 3;
    if (zoom < 13.5) return mobile ? 3 : 2;
    return 1;
  }

  function thinLine(line, stride) {
    if (!Array.isArray(line) || line.length < 2 || stride <= 1) return line;
    const out = [];
    for (let i = 0; i < line.length; i += stride) out.push(line[i]);
    if (out[out.length - 1] !== line[line.length - 1]) out.push(line[line.length - 1]);
    return out.length >= 2 ? out : line;
  }

  function lineParts(geometry) {
    if (!geometry) return [];
    if (geometry.type === 'LineString') return [geometry.coordinates || []];
    if (geometry.type === 'MultiLineString') return geometry.coordinates || [];
    return [];
  }

  function segmentInView(a, b, view) {
    return Math.max(a[0], b[0]) >= view[0] &&
      Math.min(a[0], b[0]) <= view[2] &&
      Math.max(a[1], b[1]) >= view[1] &&
      Math.min(a[1], b[1]) <= view[3];
  }

  function wallSegmentPolygon(map, a, b, widthM) {
    const midLat = ((a[1] + b[1]) * 0.5) * Math.PI / 180;
    const metersLon = Math.max(1000, 111320 * Math.cos(midLat));
    const metersLat = 110540;
    const dx = (b[0] - a[0]) * metersLon;
    const dy = (b[1] - a[1]) * metersLat;
    const length = Math.hypot(dx, dy);
    if (!Number.isFinite(length) || length < 0.4) return null;
    const nx = (dy / length) * widthM * 0.5 / metersLon;
    const ny = (-dx / length) * widthM * 0.5 / metersLat;
    const ring = [
      [a[0] + nx, a[1] + ny],
      [b[0] + nx, b[1] + ny],
      [b[0] - nx, b[1] - ny],
      [a[0] - nx, a[1] - ny],
      [a[0] + nx, a[1] + ny]
    ];
    let terrainBaseM = 0;
    try {
      if (map && typeof map.queryTerrainElevation === 'function') {
        const sampled = map.queryTerrainElevation({
          lng: (a[0] + b[0]) * 0.5,
          lat: (a[1] + b[1]) * 0.5
        }, { exaggerated: false });
        if (Number.isFinite(sampled)) terrainBaseM = sampled;
      }
    } catch (_) {}
    return {
      type: 'Feature',
      properties: {
        part: 'estimated-wall-body',
        base_m: terrainBaseM,
        top_m: terrainBaseM + WALL_HEIGHT_M_EST,
        terrain_base_m: terrainBaseM,
        width_m_estimate: WALL_WIDTH_M_EST,
        height_m_estimate: WALL_HEIGHT_M_EST,
        measurement_status: 'PROFILE_ESTIMATED_NOT_SURVEYED',
        elevation_status: terrainBaseM === 0 ? 'DEM_UNAVAILABLE_OR_ZERO' : 'SAMPLED_MAP_TERRAIN',
        source_region_geometry: 'MIT regional route GeoJSON'
      },
      geometry: { type: 'Polygon', coordinates: [ring] }
    };
  }

  function setSourceData(map, id, data) {
    try {
      const source = map.getSource(id);
      if (source && typeof source.setData === 'function') source.setData(data);
    } catch (_) {}
  }

  function ensureSource(map, id, data, extra) {
    if (map.getSource(id)) return;
    map.addSource(id, Object.assign({ type: 'geojson', data, maxzoom: 14, tolerance: 0.4, buffer: 64 }, extra || {}));
  }

  function ensureLayer(map, layer, beforeId) {
    if (map.getLayer(layer.id)) return;
    if (beforeId && map.getLayer(beforeId)) map.addLayer(layer, beforeId);
    else map.addLayer(layer);
  }

  function ensureMapChrome(map, state) {
    const container = map.getContainer && map.getContainer();
    if (!container) return;
    let chip = container.querySelector('.bp-landmark-chip-v5940');
    if (!chip) {
      chip = document.createElement('div');
      chip.className = 'bp-landmark-chip-v5940';
      chip.setAttribute('aria-live', 'polite');
      chip.innerHTML = '<i aria-hidden="true"></i><span></span>';
      container.appendChild(chip);
    }
    state.chip = chip;
  }

  function setChip(state, title, detail, show = true) {
    if (!state || !state.chip) return;
    const span = state.chip.querySelector('span');
    if (span) {
      span.textContent = '';
      const b = document.createElement('b');
      b.textContent = title;
      const small = document.createElement('small');
      small.textContent = detail;
      span.append(b, small);
    }
    state.chip.dataset.show = show ? 'true' : 'false';
  }

  function installStyle(map, state) {
    if (!map || state.installing || !map.getStyle || !map.getStyle()) return;
    state.installing = true;
    try {
      ensureSource(map, 'bp-v5940-statue-point', {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { kind: 'statue', label: 'STATUE OF LIBERTY' }, geometry: { type: 'Point', coordinates: STATUE } },
          { type: 'Feature', properties: { kind: 'wall', label: 'GREAT WALL OF CHINA · SOURCE ROUTE' }, geometry: { type: 'Point', coordinates: [116.017, 40.356] } }
        ]
      });
      ensureSource(map, 'bp-v5940-wall-route', EMPTY);
      ensureSource(map, 'bp-v5940-wall-body', EMPTY);

      ensureLayer(map, {
        id: 'bp-v5940-wall-body',
        type: 'fill-extrusion',
        source: 'bp-v5940-wall-body',
        minzoom: 11.2,
        paint: {
          'fill-extrusion-color': '#93836b',
          'fill-extrusion-opacity': 0.98,
          'fill-extrusion-base': ['to-number', ['get', 'base_m'], 0],
          'fill-extrusion-height': ['to-number', ['get', 'top_m'], WALL_HEIGHT_M_EST],
          'fill-extrusion-vertical-gradient': true
        }
      });
      ensureLayer(map, {
        id: 'bp-v5940-wall-casing',
        type: 'line',
        source: 'bp-v5940-wall-route',
        minzoom: 4.2,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#251d15',
          'line-opacity': 0.9,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.6, 7, 1.4, 10, 2.5, 13, 4.2, 16, 6.0]
        }
      });
      ensureLayer(map, {
        id: 'bp-v5940-wall-route-line',
        type: 'line',
        source: 'bp-v5940-wall-route',
        minzoom: 4.2,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#d7a35c',
          'line-opacity': 0.98,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.35, 7, 0.8, 10, 1.6, 13, 2.7, 16, 3.5]
        }
      });
      ensureLayer(map, {
        id: 'bp-v5940-landmark-labels',
        type: 'symbol',
        source: 'bp-v5940-statue-point',
        minzoom: 7.0,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 7, 9, 11, 12, 15, 14],
          'text-offset': [0, 1.15],
          'text-anchor': 'top',
          'text-max-width': 14,
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#f1fbff',
          'text-halo-color': 'rgba(3,12,18,0.94)',
          'text-halo-width': 1.5
        },
        filter: ['==', ['get', 'kind'], 'statue']
      });
      ensureLayer(map, {
        id: 'bp-v5940-wall-label',
        type: 'symbol',
        source: 'bp-v5940-statue-point',
        minzoom: 5.2,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 5.2, 8, 9, 11, 14, 13],
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
          'text-max-width': 16,
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#f8d5a4',
          'text-halo-color': 'rgba(14,12,8,0.94)',
          'text-halo-width': 1.5
        },
        filter: ['==', ['get', 'kind'], 'wall']
      });
      state.styleReady = true;
      ensureMapChrome(map, state);
      if (!state.listeners) {
        state.listeners = true;
        map.on('moveend', () => scheduleUpdate(map, state));
        map.on('zoomend', () => scheduleUpdate(map, state));
      }
      scheduleUpdate(map, state, true);
    } catch (error) {
      console.warn('BridgePoint landmarks style install', error);
      state.status = 'Waiting for compatible map style';
    } finally {
      state.installing = false;
    }
  }

  function scheduleUpdate(map, state, immediate = false) {
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.timer = 0;
      updateMap(map, state);
    }, immediate ? 50 : 280);
  }

  async function updateWall(map, state) {
    const requestId = ++state.wallRequest;
    const zoom = Number(map.getZoom());
    const mobile = !!(window.matchMedia && window.matchMedia('(max-width: 720px)').matches) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 4);
    const pad = zoom < 5.5 ? 3.8 : zoom < 7.5 ? 1.8 : zoom < 9.5 ? 0.65 : zoom < 11.5 ? 0.24 : zoom < 13.5 ? 0.09 : 0.035;
    const view = boundsArray(map, pad);
    const chinaBox = [73, 24, 135, 55];
    if (zoom < 4.0 || !intersects(view, chinaBox)) {
      setSourceData(map, 'bp-v5940-wall-route', EMPTY);
      setSourceData(map, 'bp-v5940-wall-body', EMPTY);
      return;
    }

    if (zoom < 7.5) {
      state.wallBusy = true;
      try {
        const overview = await loadOverview();
        if (state.wallRequest !== requestId || !state.styleReady) return;
        const stride = getStride(zoom, mobile);
        const routeFeatures = [];
        for (const feature of overview) {
          const fb = getFeatureBounds(feature);
          if (!intersects(fb, view)) continue;
          const originalParts = lineParts(feature.geometry);
          const simplifiedParts = originalParts.map(part => thinLine(part, stride)).filter(part => part.length >= 2);
          if (!simplifiedParts.length) continue;
          const geometry = simplifiedParts.length === 1
            ? { type: 'LineString', coordinates: simplifiedParts[0] }
            : { type: 'MultiLineString', coordinates: simplifiedParts };
          routeFeatures.push({
            type: 'Feature',
            properties: Object.assign({}, feature.properties || {}, {
              bp_source: 'Adl3rAi/The-Great-Wall-of-China-geodata/direction/fulldirection.geojson',
              bp_source_license: 'MIT',
              bp_geometry_truth: 'SIMPLIFIED_SOURCE_ROUTE_OVERVIEW'
            }),
            geometry
          });
        }
        setSourceData(map, 'bp-v5940-wall-route', { type: 'FeatureCollection', features: routeFeatures });
        setSourceData(map, 'bp-v5940-wall-body', EMPTY);
        state.status = 'Great Wall overview route active';
        if (intersects(boundsArray(map, 0), [114, 36, 125, 43]) && zoom >= 5.2) {
          setChip(state, 'GREAT WALL OF CHINA', 'Simplified source route · detailed regional geometry loads closer in', true);
        } else if (!state.statueActive) {
          setChip(state, '', '', false);
        }
        window.__BP_GREAT_WALL_V5940__ = {
          version: VERSION,
          status: 'viewport-driven-overview-loaded',
          routeFeatures: routeFeatures.length,
          extrudedSegments: 0,
          regions: ['overview'],
          source: 'MIT simplified overview route',
          mobileLOD: mobile,
          overviewBytes: 404581,
          updatedAt: Date.now()
        };
        return;
      } catch (error) {
        console.warn('BridgePoint Great Wall overview route', error);
        state.status = 'overview route unavailable; falling back to regional data';
      } finally {
        state.wallBusy = false;
      }
    }

    const candidates = REGIONS.filter(r => regionIntersects(r, view));
    const center = map.getCenter();
    candidates.sort((a, b) => {
      const cx = (a.box[0] + a.box[2]) * 0.5, cy = (a.box[1] + a.box[3]) * 0.5;
      const dx = (b.box[0] + b.box[2]) * 0.5, dy = (b.box[1] + b.box[3]) * 0.5;
      return ((cx-center.lng)**2 + (cy-center.lat)**2) - ((dx-center.lng)**2 + (dy-center.lat)**2);
    });
    const maxRegions = zoom < 9.5 ? (mobile ? 2 : 3) : (mobile ? 3 : 4);
    const chosen = candidates.slice(0, maxRegions);
    if (!chosen.length) {
      setSourceData(map, 'bp-v5940-wall-route', EMPTY);
      setSourceData(map, 'bp-v5940-wall-body', EMPTY);
      return;
    }

    state.wallBusy = true;
    try {
      const results = await Promise.all(chosen.map(async region => {
        try { return { region, features: await loadRegion(region) }; }
        catch (error) {
          console.warn('BridgePoint Great Wall region source', region.id, error);
          return { region, features: [] };
        }
      }));
      if (state.wallRequest !== requestId || !state.styleReady) return;
      const stride = getStride(zoom, mobile);
      const routeFeatures = [];
      const sourceSegments = [];
      for (const item of results) {
        for (const feature of item.features) {
          const fb = getFeatureBounds(feature);
          if (!intersects(fb, view)) continue;
          const originalParts = lineParts(feature.geometry);
          const simplifiedParts = [];
          for (const part of originalParts) {
            if (!Array.isArray(part) || part.length < 2) continue;
            const thinned = thinLine(part, stride);
            if (thinned.length >= 2) simplifiedParts.push(thinned);
            if (zoom >= 11.2) sourceSegments.push(part);
          }
          if (!simplifiedParts.length) continue;
          const geometry = simplifiedParts.length === 1
            ? { type: 'LineString', coordinates: simplifiedParts[0] }
            : { type: 'MultiLineString', coordinates: simplifiedParts };
          routeFeatures.push({
            type: 'Feature',
            properties: Object.assign({}, feature.properties || {}, {
              bp_source: 'Adl3rAi/The-Great-Wall-of-China-geodata',
              bp_source_license: 'MIT',
              bp_geometry_truth: 'SOURCE_ROUTE_LINE'
            }),
            geometry
          });
        }
      }
      setSourceData(map, 'bp-v5940-wall-route', { type: 'FeatureCollection', features: routeFeatures });

      let extrudedSegments = 0;
      if (zoom < 11.2) {
        setSourceData(map, 'bp-v5940-wall-body', EMPTY);
      } else {
        const maxSegments = mobile ? (zoom < 13.5 ? 120 : 240) : (zoom < 13.5 ? 500 : 900);
        const segStride = zoom < 12.5 ? 5 : zoom < 14.5 ? 2 : 1;
        const body = [];
        for (const line of sourceSegments) {
          let seen = 0;
          for (let i = 1; i < line.length; i++) {
            const a = line[i - 1], b = line[i];
            if (!a || !b || !segmentInView(a, b, view)) continue;
            if ((seen++ % segStride) !== 0) continue;
            const poly = wallSegmentPolygon(map, a, b, WALL_WIDTH_M_EST);
            if (poly) body.push(poly);
            if (body.length >= maxSegments) break;
          }
          if (body.length >= maxSegments) break;
        }
        setSourceData(map, 'bp-v5940-wall-body', { type: 'FeatureCollection', features: body });
        extrudedSegments = body.length;
      }
      state.status = 'Great Wall route active';
      if (intersects(boundsArray(map, 0), [114, 36, 125, 43]) && zoom >= 5.2) {
        setChip(state, 'GREAT WALL OF CHINA', 'Source route trace · local wall height and width are estimates', true);
      } else if (!state.statueActive) {
        setChip(state, '', '', false);
      }
      window.__BP_GREAT_WALL_V5940__ = {
        version: VERSION,
        status: 'viewport-driven-route-loaded',
        routeFeatures: routeFeatures.length,
        extrudedSegments,
        regions: chosen.map(r => r.id),
        source: 'MIT regional GeoJSON route trace',
        profile: 'estimated 6.5 m height × 5 m width where no surveyed cross-section is available',
        mobileLOD: mobile,
        updatedAt: Date.now()
      };
    } finally {
      state.wallBusy = false;
    }
  }

  function nearStatue(map) {
    if (!map || Number(map.getZoom()) < 13.8) return false;
    const b = map.getBounds();
    return STATUE[0] >= b.getWest() && STATUE[0] <= b.getEast() &&
      STATUE[1] >= b.getSouth() && STATUE[1] <= b.getNorth();
  }

  async function loadThreeModules() {
    if (!modulesPromise) {
      modulesPromise = Promise.all([
        import(THREE_URL),
        import(GLTF_URL)
      ]).then(modules => ({ THREE: modules[0], GLTFLoader: modules[1].GLTFLoader }))
        .catch(error => { modulesPromise = null; throw error; });
    }
    return modulesPromise;
  }

  function prepareScanScene(THREE, gltf) {
    const sourceRoot = gltf.scene || (gltf.scenes && gltf.scenes[0]);
    if (!sourceRoot) throw new Error('Scan GLB has no scene');
    sourceRoot.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(sourceRoot);
    let size = box.getSize(new THREE.Vector3());
    if (size.z > size.y && size.z >= size.x) sourceRoot.rotation.x = -Math.PI / 2;
    else if (size.x > size.y && size.x >= size.z) sourceRoot.rotation.z = Math.PI / 2;
    sourceRoot.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(sourceRoot);
    size = box.getSize(new THREE.Vector3());
    const sourceHeight = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(sourceHeight) || sourceHeight <= 0) throw new Error('Scan dimensions unavailable');
    sourceRoot.scale.setScalar(STATUE_HEIGHT_M / sourceHeight);
    sourceRoot.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(sourceRoot);
    sourceRoot.position.x -= (box.min.x + box.max.x) * 0.5;
    sourceRoot.position.z -= (box.min.z + box.max.z) * 0.5;
    sourceRoot.position.y -= box.min.y;

    const THREEwrap = new THREE.Group();
    THREEwrap.rotation.y = THREE.MathUtils.degToRad(STATUE_FACING_DEG);
    THREEwrap.add(sourceRoot);
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.45));
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(40, 75, 90);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc4f7ed, 0.55);
    fill.position.set(-55, 20, -25);
    scene.add(fill);
    scene.add(THREEwrap);
    return { scene, sourceHeight };
  }

  function ensureStatueLayer(map, state) {
    if (state.statueLayerRequested || !nearStatue(map)) return;
    state.statueLayerRequested = true;
    state.statueActive = true;
    setChip(state, 'STATUE OF LIBERTY', 'Loading source laser scan · 93.0 m ground-to-torch', true);
    window.__BP_STATUE_SCAN_V5940__ = {
      version: VERSION,
      status: 'loading-on-close-zoom-only',
      source: 'Metron3D Statue of Liberty 3D Scan',
      license: 'CC BY; attributed to Metron3D / Sketchfab source record',
      officialHeightM: STATUE_HEIGHT_M,
      sourceUrl: 'https://zenodo.org/records/10355435',
      updatedAt: Date.now()
    };

    loadThreeModules().then(({ THREE, GLTFLoader }) => {
      if (!nearStatue(map) || !state.styleReady || map.getLayer('bp-v5940-statue-scan')) return;
      const customLayer = {
        id: 'bp-v5940-statue-scan',
        type: 'custom',
        renderingMode: '3d',
        onAdd(mapRef, gl) {
          this.map = mapRef;
          this.THREE = THREE;
          this.camera = new THREE.Camera();
          this.scene = new THREE.Scene();
          this.renderer = new THREE.WebGLRenderer({
            canvas: mapRef.getCanvas(),
            context: gl,
            antialias: false,
            alpha: true,
            powerPreference: 'low-power'
          });
          this.renderer.autoClear = false;
          this.ready = false;
          this.failed = false;
          const loader = new GLTFLoader();
          loader.load(STATUE_SCAN_URL, gltf => {
            try {
              const prepared = prepareScanScene(THREE, gltf);
              this.scene = prepared.scene;
              this.ready = true;
              this.scanSourceHeight = prepared.sourceHeight;
              state.statueLoaded = true;
              window.__BP_STATUE_SCAN_V5940__ = {
                version: VERSION,
                status: 'loaded-source-scan',
                source: 'Metron3D Statue of Liberty 3D Scan · Zenodo DOI 10.5281/zenodo.10355435',
                license: 'CC BY; attributed to Metron3D / Sketchfab source record',
                officialHeightM: STATUE_HEIGHT_M,
                facingDegrees: STATUE_FACING_DEG,
                sourceModelHeightUnits: prepared.sourceHeight,
                loadedAt: Date.now(),
                rendered: false
              };
              setChip(state, 'STATUE OF LIBERTY · 3D SCAN', 'Metron3D scan · scaled to 93.0 m ground-to-torch', true);
              mapRef.triggerRepaint();
            } catch (error) {
              this.failed = true;
              console.warn('BridgePoint statue scan normalization', error);
            }
          }, undefined, error => {
            this.failed = true;
            window.__BP_STATUE_SCAN_V5940__.status = 'scan-load-failed';
            window.__BP_STATUE_SCAN_V5940__.detail = String(error && error.message || error || 'Model download failed');
            setChip(state, 'STATUE OF LIBERTY', '3D scan could not load; map remains available', true);
            console.warn('BridgePoint statue scan load', error);
          });
        },
        render(gl, args) {
          if (!this.ready || this.failed || !nearStatue(this.map)) return;
          try {
            const terrain = typeof this.map.queryTerrainElevation === 'function'
              ? (this.map.queryTerrainElevation({ lng: STATUE[0], lat: STATUE[1] }, { exaggerated: false }) || 0)
              : 0;
            const modelMatrix = this.map.transform.getMatrixForModel(STATUE, terrain);
            const projection = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
            const model = new THREE.Matrix4().fromArray(modelMatrix);
            this.camera.projectionMatrix = projection.multiply(model);
            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);
            const renderStatus = window.__BP_STATUE_SCAN_V5940__;
            if (renderStatus) {
              renderStatus.rendered = true;
              renderStatus.renderedAt = Date.now();
              delete renderStatus.renderError;
            }
          } catch (error) {
            if (!state.renderWarned) {
              state.renderWarned = true;
              const renderStatus = window.__BP_STATUE_SCAN_V5940__;
              if (renderStatus) renderStatus.renderError = String(error && error.message || error || '3D render skipped');
              console.warn('BridgePoint statue render skipped', error);
            }
          }
        },
        onRemove() {
          try { this.scene && this.scene.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              for (const value of Object.values(obj.material)) {
                if (value && value.isTexture) value.dispose();
              }
              if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
              else obj.material.dispose();
            }
          }); } catch (_) {}
          try { this.renderer && this.renderer.dispose(); } catch (_) {}
        }
      };
      if (!map.getLayer('bp-v5940-statue-scan')) map.addLayer(customLayer);
    }).catch(error => {
      state.statueLayerRequested = false;
      window.__BP_STATUE_SCAN_V5940__ = {
        version: VERSION, status: 'threejs-import-failed',
        detail: String(error && error.message || error || '3D module load failed'),
        updatedAt: Date.now()
      };
      setChip(state, 'STATUE OF LIBERTY', '3D scan renderer unavailable; map remains available', true);
      console.warn('BridgePoint statue renderer modules', error);
    });
  }

  async function updateMap(map, state) {
    if (!state.styleReady || !map.getStyle || !map.getStyle()) return;
    const zoom = Number(map.getZoom());
    const inStatueArea = nearStatue(map);
    state.statueActive = inStatueArea;
    if (inStatueArea) ensureStatueLayer(map, state);
    else if (state.status !== 'Great Wall route active') setChip(state, '', '', false);
    await updateWall(map, state);
    if (inStatueArea && state.statueLoaded) {
      setChip(state, 'STATUE OF LIBERTY · 3D SCAN', 'Metron3D scan · 93.0 m ground-to-torch', true);
    }
    if (zoom < 11.2) setSourceData(map, 'bp-v5940-wall-body', EMPTY);
  }

  function attachMap(map) {
    if (!map || MAPS.has(map)) return;
    MAPS.add(map);
    const state = {
      styleReady: false, installing: false, listeners: false, timer: 0,
      wallRequest: 0, wallBusy: false, status: 'waiting for map style',
      statueLayerRequested: false, statueLoaded: false, statueActive: false,
      chip: null, renderWarned: false
    };
    MAP_STATE.set(map, state);
    const ready = () => installStyle(map, state);
    map.on('style.load', ready);
    map.on('load', ready);
    if (map.isStyleLoaded && map.isStyleLoaded()) ready();
  }

  window.__BP_LANDMARKS_V5940__ = {
    version: VERSION,
    status: 'ready',
    attribution: 'Statue scan: Metron3D / Sketchfab, CC BY. Great Wall line: Adl3rAi, MIT. Wall profile is estimated; source notes regional geometry limitations.',
    statue: {
      coordinates: STATUE,
      height_m: STATUE_HEIGHT_M,
      facing_degrees: STATUE_FACING_DEG,
      geometry: 'Metron3D laser scan; loaded only when zoomed in to Liberty Island',
      source: 'https://zenodo.org/records/10355435',
      license: 'Creative Commons Attribution'
    },
    greatWall: {
      routeSource: 'Adl3rAi/The-Great-Wall-of-China-geodata',
      license: 'MIT',
      strategy: 'regional lazy loading + zoom-dependent simplification + local 3D extrusion',
      profileHeightM: WALL_HEIGHT_M_EST,
      profileWidthM: WALL_WIDTH_M_EST,
      profileTruth: 'estimated, not a surveyed height profile'
    },
    mobile: { lazyScanDownload: true, regionLoadedByViewport: true, adaptiveGeometryLOD: true },
    attachedMaps: 0,
    updatedAt: Date.now()
  };

  const pendingMap=window.__BP_PENDING_LANDMARK_MAP_V5940__;
  if(pendingMap&&typeof pendingMap.on==='function')attachMap(pendingMap);
  window.addEventListener('bp:world-map-ready-v5940',event=>{const readyMap=event&&event.detail&&event.detail.map;if(readyMap&&typeof readyMap.on==='function')attachMap(readyMap);if(window.__BP_LANDMARKS_V5940__)window.__BP_LANDMARKS_V5940__.attachedMaps=MAPS.size});

  function discoverMaps() {
    const maps = currentMaps();
    for (const map of maps) {
      attachMap(map);
    }
    window.__BP_LANDMARKS_V5940__.attachedMaps = MAPS.size;
    if (MAPS.size === 0 && !discoverMaps.stopped) {
      discoverMaps.attempts = (discoverMaps.attempts || 0) + 1;
      if (discoverMaps.attempts >= 80) discoverMaps.stopped = true;
      else setTimeout(discoverMaps, 600);
    }
  }
  discoverMaps.attempts = 0;
  window.addEventListener('load', discoverMaps, { once: true });
  discoverMaps();
})();