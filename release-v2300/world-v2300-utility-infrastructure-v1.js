const VERSION = 2;
const POWER_SOURCE = 'bp-utility-power-v1';
const TELECOM_SOURCE = 'bp-utility-telecom-v1';
const THREE_URL = '/vendor/three.module.js?v=169-local';
const MIN_ZOOM = 12;
const MAX_SOURCE_ZOOM = 17;
const MAX_SUPPORTS = 720;
const MAX_SPANS = 560;
const POWER_SNAP_M = 13;
const RAD = Math.PI / 180;

function uniqueFeatures(features, keyOf) {
  const out = new Map();
  for (const feature of features || []) {
    if (!feature || !feature.geometry) continue;
    const key = keyOf(feature);
    if (!key || out.has(key)) continue;
    out.set(key, feature);
  }
  return [...out.values()];
}

function pointOf(feature) {
  const geometry = feature && feature.geometry;
  if (!geometry || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) return null;
  const point = [Number(geometry.coordinates[0]), Number(geometry.coordinates[1])];
  return point.every(Number.isFinite) ? point : null;
}

function pathsOf(feature) {
  const geometry = feature && feature.geometry;
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [geometry.coordinates || []];
  if (geometry.type === 'MultiLineString') return geometry.coordinates || [];
  return [];
}

function featureKey(feature, prefix) {
  const properties = feature.properties || {};
  const id = properties.osm_id ?? feature.id;
  if (id !== undefined && id !== null && id !== '') return prefix + ':' + String(id);
  const point = pointOf(feature);
  if (point) return prefix + ':' + point[0].toFixed(7) + ',' + point[1].toFixed(7);
  const path = pathsOf(feature)[0];
  if (path && path.length) {
    const first = path[0], last = path[path.length - 1];
    return prefix + ':' + JSON.stringify([first, last, path.length]);
  }
  return null;
}

function pathFeatureKey(feature, prefix) {
  const properties = feature && feature.properties || {};
  const id = properties.osm_id ?? feature.id ?? 'unidentified';
  const signature = pathsOf(feature).map(path => {
    if (!path || !path.length) return '';
    const first = path[0], last = path[path.length - 1];
    return [first[0], first[1], last[0], last[1], path.length].map(v => Number(v).toFixed(6)).join(',');
  }).join(';');
  return prefix + ':' + String(id) + ':' + signature;
}

function parseHeightMetres(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value).trim().match(/^(-?\d+(?:\.\d+)?)\s*(m|metres?|meters?|ft|feet|')?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const unit = String(match[2] || 'm').toLowerCase();
  return unit === 'ft' || unit === 'feet' || unit === "'" ? amount * 0.3048 : amount;
}

function measuredHeight(properties, fallback) {
  for (const key of ['height_m', 'height', 'heightMeters', 'height_meters', 'height:power', 'height:structure', 'height:utility', 'tower:height', 'pole:height']) {
    const value = parseHeightMetres(properties && properties[key]);
    if (Number.isFinite(value) && value >= 3 && value <= 180) {
      return { metres: value, measured: true };
    }
  }
  return { metres: fallback, measured: false };
}

function haversineMetres(a, b) {
  const lat1 = Number(a[1]) * RAD, lat2 = Number(b[1]) * RAD;
  const dLat = lat2 - lat1, dLon = (Number(b[0]) - Number(a[0])) * RAD;
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(Math.max(0, 1 - q)));
}

function projectSupportToPath(point, path) {
  if (!Array.isArray(path) || path.length < 2) return null;
  let travelled = 0, bestDistance = Infinity, bestAlong = 0, bestBearing = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    if (!Array.isArray(a) || !Array.isArray(b)) continue;
    const cosLat = Math.max(0.08, Math.cos(((Number(a[1]) + Number(b[1]) + Number(point[1])) / 3) * RAD));
    const dx = (Number(b[0]) - Number(a[0])) * 111320 * cosLat;
    const dy = (Number(b[1]) - Number(a[1])) * 110540;
    const px = (Number(point[0]) - Number(a[0])) * 111320 * cosLat;
    const py = (Number(point[1]) - Number(a[1])) * 110540;
    const lengthSquared = dx * dx + dy * dy;
    const length = Math.sqrt(lengthSquared);
    if (!length) continue;
    const t = Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared));
    const distance = Math.hypot(px - t * dx, py - t * dy);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestAlong = travelled + length * t;
      bestBearing = (Math.atan2(dx, dy) / RAD + 360) % 360;
    }
    travelled += length;
  }
  return Number.isFinite(bestDistance) ? { distance: bestDistance, along: bestAlong, bearing: bestBearing } : null;
}

function terrainAt(map, coordinate) {
  try {
    const value = map.queryTerrainElevation && map.queryTerrainElevation(
      [Number(coordinate[0]), Number(coordinate[1])],
      { exaggerated: false }
    );
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  } catch (_) {
    return 0;
  }
}

function localEastNorth(anchor, point) {
  const cos = Math.max(0.08, Math.cos(Number(anchor[1]) * RAD));
  return [
    (Number(point[0]) - Number(anchor[0])) * 111320 * cos,
    (Number(point[1]) - Number(anchor[1])) * 110540
  ];
}

function pushBeam(vertices, a, b, radius, THREE, sides) {
  const axis = new THREE.Vector3().subVectors(b, a);
  const length = axis.length();
  if (!Number.isFinite(length) || length < 0.005) return;
  axis.normalize();
  const reference = Math.abs(axis.y) < 0.88
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(axis, reference).normalize();
  const v = new THREE.Vector3().crossVectors(axis, u).normalize();
  const ringA = [], ringB = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const offset = u.clone().multiplyScalar(Math.cos(angle) * radius)
      .add(v.clone().multiplyScalar(Math.sin(angle) * radius));
    ringA.push(a.clone().add(offset));
    ringB.push(b.clone().add(offset));
  }
  const put = point => vertices.push(point.x, point.y, point.z);
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    const a0 = ringA[i], a1 = ringA[next], b0 = ringB[i], b1 = ringB[next];
    put(a0); put(a1); put(b1);
    put(a0); put(b1); put(b0);
    put(a); put(a1); put(a0);
    put(b); put(b0); put(b1);
  }
}

function makeTowerGeometry(THREE) {
  const vertices = [];
  const point = (x, y, z) => new THREE.Vector3(x, y, z);
  const beam = (a, b, r) => pushBeam(vertices, a, b, r, THREE, 6);
  const legs = [[-.22, 0, -.22], [.22, 0, -.22], [.22, 0, .22], [-.22, 0, .22]];
  for (let i = 0; i < 4; i++) {
    const a = legs[i], b = legs[(i + 1) % 4];
    beam(point(a[0], 0, a[2]), point(b[0] * .32, 1, b[2] * .32), .009);
    beam(point(a[0], 0, a[2]), point(a[0] * .32, 1, a[2] * .32), .009);
  }
  for (const y of [.26, .48, .68]) {
    beam(point(-.18, y, -.18), point(.18, y, .18), .006);
    beam(point(.18, y, -.18), point(-.18, y, .18), .006);
  }
  for (const y of [.72, .9]) {
    const width = y > .8 ? .88 : .68;
    beam(point(-width, y, 0), point(width, y, 0), .008);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function modelMatrixFor(map, THREE, coordinate, altitude) {
  try {
    // BridgePoint's production globe exposes the same model transform used by its
    // existing landmark, rail and infrastructure 3D renderers. Prefer it so models
    // remain sphere-anchored while the projection is globe and transition to Mercator.
    const model = map.transform && typeof map.transform.getMatrixForModel === 'function'
      ? map.transform.getMatrixForModel([Number(coordinate[0]), Number(coordinate[1])], Number(altitude) || 0)
      : null;
    if (model && model.length >= 16) return new THREE.Matrix4().fromArray(model);

    // MapLibre's public Mercator fallback covers Map instances where that internal
    // world helper is unavailable (e.g. independent integration tests).
    const MercatorCoordinate = window.maplibregl && window.maplibregl.MercatorCoordinate;
    if (!MercatorCoordinate || typeof MercatorCoordinate.fromLngLat !== 'function') return null;
    const mercator = MercatorCoordinate.fromLngLat(
      [Number(coordinate[0]), Number(coordinate[1])],
      Number(altitude) || 0
    );
    const metres = mercator.meterInMercatorCoordinateUnits();
    if (![mercator.x, mercator.y, mercator.z, metres].every(Number.isFinite) || metres <= 0) return null;
    return new THREE.Matrix4().set(
      metres, 0, 0, mercator.x,
      0, 0, metres, mercator.y,
      0, metres, 0, mercator.z,
      0, 0, 0, 1
    );
  } catch (_) {
    return null;
  }
}

function setInstance(mesh, index, map, THREE, coordinate, altitude, yaw, scale) {
  const matrix = modelMatrixFor(map, THREE, coordinate, altitude);
  if (!matrix) return false;
  if (yaw) matrix.multiply(new THREE.Matrix4().makeRotationY(Number(yaw)));
  matrix.multiply(new THREE.Matrix4().makeScale(scale[0], scale[1], scale[2]));
  mesh.setMatrixAt(index, matrix);
  return true;
}

function lineFeaturesFor(map, source, layer) {
  try {
    return map.querySourceFeatures(source, { sourceLayer: layer }) || [];
  } catch (_) {
    return [];
  }
}

function makeSpans(lines, supports, kind, snapLimit, maxSpan, maxCount) {
  const pairs = new Map();
  for (const feature of lines) {
    const properties = feature.properties || {};
    if (properties.disused === true || properties.construction === true) continue;
    if (properties.tunnel === true || String(properties.location || '').toLowerCase() === 'underground') continue;
    if (kind === 'power' && String(properties.type || '').toLowerCase() === 'cable') continue;
    for (const path of pathsOf(feature)) {
      if (!path || path.length < 2) continue;
      const coordinates = path.filter(point => Array.isArray(point) && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1])));
      if (coordinates.length < 2) continue;
      const longitudes = coordinates.map(point => Number(point[0]));
      const latitudes = coordinates.map(point => Number(point[1]));
      const midLat = (Math.min(...latitudes) + Math.max(...latitudes)) * .5;
      const padLat = snapLimit / 110000 + .00002;
      const padLon = snapLimit / (111000 * Math.max(.08, Math.cos(midLat * RAD))) + .00002;
      const minLon = Math.min(...longitudes) - padLon, maxLon = Math.max(...longitudes) + padLon;
      const minLat = Math.min(...latitudes) - padLat, maxLat = Math.max(...latitudes) + padLat;
      const candidates = supports.filter(support =>
        support.coordinate[0] >= minLon && support.coordinate[0] <= maxLon &&
        support.coordinate[1] >= minLat && support.coordinate[1] <= maxLat
      );
      const matches = [];
      for (const support of candidates) {
        const projected = projectSupportToPath(support.coordinate, path);
        if (projected && projected.distance <= snapLimit) {
          matches.push({ support, along: projected.along, bearing: projected.bearing });
          if (!support.bearing || projected.distance < support.bearingDistance) {
            support.bearing = projected.bearing;
            support.bearingDistance = projected.distance;
          }
        }
      }
      matches.sort((a, b) => a.along - b.along);
      for (let i = 1; i < matches.length; i++) {
        const a = matches[i - 1].support, b = matches[i].support;
        if (a.key === b.key) continue;
        const distance = haversineMetres(a.coordinate, b.coordinate);
        if (distance < 12 || distance > maxSpan) continue;
        const key = [a.key, b.key].sort().join('|') + '|' + kind;
        if (!pairs.has(key)) {
          pairs.set(key, {
            a, b, kind,
            bearing: matches[i - 1].bearing || matches[i].bearing || 0,
            distance
          });
        }
        if (pairs.size >= maxCount) return [...pairs.values()];
      }
    }
  }
  return [...pairs.values()];
}

function disposeChildren(group) {
  if (!group) return;
  for (const child of [...group.children]) {
    group.remove(child);
    if (child.userData && child.userData.bpOwnedGeometry) {
      try { child.geometry && child.geometry.dispose(); } catch (_) {}
    }
  }
}

export function initUtilityInfrastructure(target) {
  const map = target && (target.map || target);
  if (!map || typeof map.getBounds !== 'function' || typeof map.addSource !== 'function') return null;
  if (window.__BP_UTILITY_INFRASTRUCTURE_V1__ && window.__BP_UTILITY_INFRASTRUCTURE_V1__.map === map) {
    return window.__BP_UTILITY_INFRASTRUCTURE_V1__;
  }

  const state = {
    version: VERSION, map, enabled: true, ready: false, status: 'Waiting for source-mapped utility infrastructure…',
    cabinets: 0, telecomMasts: 0, measuredHeights: 0, estimatedHeights: 0,
    updatedAt: null, source: 'OpenInfraMap vector tiles from OpenStreetMap contributors',
    heightNote: 'Mapped height attributes are used when present. Where the source has no height, the 10 m distribution-pole, 30 m tower and 18 m telecom-mast dimensions are visual estimates, not surveyed measurements.'
  };
  window.__BP_UTILITY_INFRASTRUCTURE_V1__ = state;

  let THREE = null, threePromise = null, renderer = null, scene = null, dataGroup = null, customLayer = null;
  let dead = false, refreshTimer = null, sequence = 0, bootTries = 0, lastZoom = -1, listenersBound = false;
  let styleInitPromise = null, customLayerInstalling = false;
  let bodyGeometry = null, armGeometry = null, insulatorGeometry = null, towerGeometry = null;
  let transformerGeometry = null, switchGeometry = null, cabinetGeometry = null, mastGeometry = null, spliceBoxGeometry = null;
  let woodMaterial = null, towerMaterial = null, metalMaterial = null, cableMaterial = null, telecomMaterial = null;
  let distributionCableMaterial = null, telecomCableMaterial = null;
  let municipalStreetlightFeatures = [], municipalRequestKey = '', municipalFetchedAt = 0, municipalRequestPromise = null;
  let overpassFeatures = [], overpassRequestKey = '', overpassFetchedAt = 0, overpassRequestPromise = null;
  const powerSourceUrl = 'https://openinframap.org/map/power/{z}/{x}/{y}.pbf';
  const telecomSourceUrl = 'https://openinframap.org/map/telecoms/{z}/{x}/{y}.pbf';

  function say(message) {
    state.status = String(message || '');
    state.statusUpdatedAt = Date.now();
  }

  async function loadThree() {
    if (!threePromise) {
      threePromise = import(THREE_URL).then(module => module.default || module)
        .catch(error => { threePromise = null; throw error; });
    }
    return threePromise;
  }

  function createGeometry() {
    bodyGeometry = new THREE.CylinderGeometry(.0085, .014, 1, 10).translate(0, .5, 0);
    armGeometry = new THREE.BoxGeometry(.225, .014, .018).translate(0, .84, 0);
    insulatorGeometry = new THREE.CylinderGeometry(.005, .0075, .028, 8).translate(0, .98, 0);
    towerGeometry = makeTowerGeometry(THREE);
    transformerGeometry = new THREE.CylinderGeometry(.34, .38, 1.0, 12);
    switchGeometry = new THREE.BoxGeometry(.42, .24, .3);
    cabinetGeometry = new THREE.BoxGeometry(.72, .82, .48);
    mastGeometry = new THREE.CylinderGeometry(.012, .035, 1, 8).translate(0, .5, 0);
    spliceBoxGeometry = new THREE.BoxGeometry(.34, .22, .18);

    woodMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .78, metalness: .04, emissive: 0x342316, emissiveIntensity: .22 });
    towerMaterial = new THREE.MeshStandardMaterial({ color: 0x65717a, roughness: .58, metalness: .62 });
    metalMaterial = new THREE.MeshStandardMaterial({ color: 0xb0bdc0, roughness: .4, metalness: .62, emissive: 0x1b2527, emissiveIntensity: .12 });
    cableMaterial = new THREE.MeshStandardMaterial({ color: 0xf3dfba, roughness: .48, metalness: .16, emissive: 0x201c16, emissiveIntensity: .08 });
    telecomMaterial = new THREE.MeshStandardMaterial({ color: 0x70838e, roughness: .62, metalness: .28 });
    distributionCableMaterial = new THREE.MeshStandardMaterial({ color: 0x34383a, roughness: .76, metalness: .12, emissive: 0x090b0c, emissiveIntensity: .06 });
    telecomCableMaterial = new THREE.MeshStandardMaterial({ color: 0x14191d, roughness: .86, metalness: .02, emissive: 0x050607, emissiveIntensity: .04 });
  }

  function installSources() {
    if (!map.getSource(POWER_SOURCE)) {
      map.addSource(POWER_SOURCE, {
        type: 'vector', tiles: [powerSourceUrl], minzoom: 8, maxzoom: MAX_SOURCE_ZOOM,
        attribution: '© OpenStreetMap contributors · OpenInfraMap'
      });
    }
    if (!map.getSource(TELECOM_SOURCE)) {
      map.addSource(TELECOM_SOURCE, {
        type: 'vector', tiles: [telecomSourceUrl], minzoom: 8, maxzoom: MAX_SOURCE_ZOOM,
        attribution: '© OpenStreetMap contributors · OpenInfraMap'
      });
    }
    // MapLibre only requests vector-source tiles when a style layer references the source.
    // These transparent query layers load the global OSM infrastructure tiles without adding
    // any extra 2D symbols or lines to the user's existing map.
    const queryLayers = [
      { id: 'bp-utility-query-power-v1', source: POWER_SOURCE, sourceLayer: 'power_line', type: 'line' },
      { id: 'bp-utility-query-telecom-v1', source: TELECOM_SOURCE, sourceLayer: 'telecoms_communication_line', type: 'line' }
    ];
    for (const layer of queryLayers) {
      if (map.getLayer(layer.id)) continue;
      map.addLayer({
        id: layer.id, type: layer.type, source: layer.source, 'source-layer': layer.sourceLayer,
        minzoom: 8, maxzoom: 24,
        paint: { 'line-color': '#ffffff', 'line-opacity': 0, 'line-width': 1 }
      });
    }
    return !!map.getSource(POWER_SOURCE) && !!map.getSource(TELECOM_SOURCE);
  }

  function clearSceneData() {
    disposeChildren(dataGroup);
    state.poles = 0; state.towers = 0; state.powerSpans = 0; state.telecomSpans = 0;
    state.transformers = 0; state.switches = 0; state.cabinets = 0; state.telecomMasts = 0;
    state.measuredHeights = 0; state.estimatedHeights = 0;
    try { map.triggerRepaint && map.triggerRepaint(); } catch (_) {}
  }

  function ensureCustomLayerRenderer() {
    if (renderer && scene && dataGroup) return true;
    const registered = map.getLayer('bp-utility-poles-3d-v1');
    const implementation = registered && (registered.implementation || registered);
    const target = implementation || customLayer;
    if (!target || typeof target.onAdd !== 'function' || !THREE) return false;

    // MapLibre can register a custom layer before its style renderer calls onAdd.
    // Attach to the map's existing WebGL context as a guarded fallback so mapped
    // infrastructure does not remain stuck in a renderer-not-ready retry state.
    let gl = null;
    try {
      gl = (map.painter && map.painter.context && map.painter.context.gl) ||
        map.getCanvas().getContext('webgl2') ||
        map.getCanvas().getContext('webgl');
    } catch (_) {}
    if (!gl) return false;
    try {
      target.onAdd(map, gl);
      if (renderer && scene && dataGroup) {
        try { map.triggerRepaint && map.triggerRepaint(); } catch (_) {}
        return true;
      }
    } catch (error) {
      console.warn('BridgePoint mapped utility renderer late-attach retry', error);
    }
    return false;
  }

  function installCustomLayer() {
    if (map.getLayer('bp-utility-poles-3d-v1')) return ensureCustomLayerRenderer();
    if (customLayerInstalling) return ensureCustomLayerRenderer();
    customLayerInstalling = true;
    customLayer = {
      id: 'bp-utility-poles-3d-v1',
      type: 'custom',
      renderingMode: '3d',
      onAdd: (mapRef, gl) => {
        // MapLibre and the guarded fallback may both reach onAdd; keep it idempotent.
        if (renderer && scene && dataGroup) {
          customLayer.renderer = renderer;
          customLayer.scene = scene;
          customLayer.camera = customLayer.camera || new THREE.Camera();
          return;
        }
        const webgl = new THREE.WebGLRenderer({
          canvas: mapRef.getCanvas(), context: gl, antialias: false, alpha: true, powerPreference: 'low-power'
        });
        webgl.autoClear = false;
        webgl.outputColorSpace = THREE.SRGBColorSpace;
        renderer = webgl;
        scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0xffffff, 1.35));
        const key = new THREE.DirectionalLight(0xfff3dc, 1.7);
        key.position.set(-.65, -1, 1.8);
        scene.add(key);
        dataGroup = new THREE.Group();
        dataGroup.name = 'BridgePoint mapped utility assets';
        scene.add(dataGroup);
        customLayer.renderer = webgl;
        customLayer.scene = scene;
        customLayer.camera = new THREE.Camera();
      },
      render: (gl, args) => {
        if (!customLayer.renderer || !customLayer.scene || !customLayer.camera) return;
        const matrix = args && (args.defaultProjectionData && args.defaultProjectionData.mainMatrix ||
          args.modelViewProjectionMatrix) || args;
        if (!matrix || typeof matrix.length !== 'number' || matrix.length < 16) return;
        customLayer.camera.projectionMatrix.fromArray(matrix);
        try {
          customLayer.renderer.resetState && customLayer.renderer.resetState();
          if (customLayer.renderer.state && customLayer.renderer.state.reset) customLayer.renderer.state.reset();
        } catch (_) {}
        customLayer.renderer.render(customLayer.scene, customLayer.camera);
      },
      onRemove: () => {
        try { customLayer.renderer && customLayer.renderer.dispose(); } catch (_) {}
        renderer = null; scene = null; dataGroup = null;
        if (customLayer) {
          customLayer.renderer = null; customLayer.scene = null; customLayer.camera = null;
        }
      }
    };
    try {
      map.addLayer(customLayer);
      customLayerInstalling = false;
      return ensureCustomLayerRenderer();
    } catch (error) {
      customLayerInstalling = false;
      console.warn('BridgePoint mapped utility 3D layer could not attach', error);
      return false;
    }
  }

  function sourceFeatures(source, layer) {
    try { return map.querySourceFeatures(source, { sourceLayer: layer }) || []; }
    catch (_) { return []; }
  }

  const featureCache = new Map();

  function cacheSourceFeatures(source, layer, prefix) {
    const key = source + '|' + layer;
    let bucket = featureCache.get(key);
    if (!bucket) featureCache.set(key, bucket = new Map());
    const fresh = sourceFeatures(source, layer);
    for (const feature of fresh) {
      const id = layer.includes('line')
        ? pathFeatureKey(feature, prefix)
        : featureKey(feature, prefix);
      if (id) bucket.set(id, feature);
    }

    const bounds = map.getBounds && map.getBounds();
    if (!bounds) return [...bucket.values()];
    const center = map.getCenter();
    const spanLon = Math.abs(bounds.getEast() - bounds.getWest());
    const spanLat = Math.abs(bounds.getNorth() - bounds.getSouth());
    const padLon = Math.max(.02, spanLon * 1.6);
    const padLat = Math.max(.02, spanLat * 1.6);
    const westRaw = bounds.getWest() - padLon;
    const eastRaw = bounds.getEast() + padLon;
    const longitudeWindows = westRaw <= eastRaw
      ? [[Math.max(-180, westRaw), Math.min(180, eastRaw)]]
      : [[Math.max(-180, westRaw), 180], [-180, Math.min(180, eastRaw)]];
    const south = Math.max(-85, bounds.getSouth() - padLat);
    const north = Math.min(85, bounds.getNorth() + padLat);
    const kept = [];
    for (const [id, feature] of bucket) {
      const point = pointOf(feature);
      let visible = false;
      if (point) {
        visible = longitudeWindows.some(([west, east]) => point[0] >= west && point[0] <= east) &&
          point[1] >= south && point[1] <= north;
      } else {
        const coordinates = pathsOf(feature).flat();
        if (coordinates.length) {
          const xs = coordinates.map(p => Number(p[0]));
          const ys = coordinates.map(p => Number(p[1]));
          visible = longitudeWindows.some(([west, east]) =>
            Math.min(...xs) <= east && Math.max(...xs) >= west
          ) && Math.min(...ys) <= north && Math.max(...ys) >= south;
        }
      }
      if (visible) kept.push(feature);
      else bucket.delete(id);
    }
    return kept;
  }

  function parseArmLengthMetres(value) {
    const numbers = String(value || '').match(/\d+(?:\.\d+)?/g) || [];
    if (!numbers.length) return 1.8;
    const feet = numbers.length > 1
      ? (Number(numbers[0]) + Number(numbers[1])) * .5
      : Number(numbers[0]);
    return Number.isFinite(feet) ? Math.max(.45, Math.min(4.5, feet * .3048)) : 1.8;
  }

  function parseBearingDegrees(value) {
    const match = String(value || '').match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const angle = Number(match[0]);
    return Number.isFinite(angle) ? (angle + 360) % 360 : null;
  }

  function parseVoltageKilovolts(properties) {
    const p = properties || {};
    const raw = p.voltage ?? p['voltage:primary'] ?? p.voltage_primary ?? p.voltageKv;
    if (raw === null || raw === undefined || raw === '') return null;
    const match = String(raw).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
    if (!match) return null;
    let value = Number(match[0]);
    if (!Number.isFinite(value) || value <= 0) return null;
    if (String(raw).toLowerCase().includes('kv')) return value;
    if (value >= 1000) value /= 1000;
    return value;
  }

  function isOverheadFeature(properties) {
    const p = properties || {};
    const location = String(p.location || p['location:line'] || '').toLowerCase();
    return location !== 'underground' && location !== 'underwater' && p.tunnel !== true;
  }

  function isDistributionPowerLine(feature, supports) {
    const p = feature && feature.properties || {};
    if (!isOverheadFeature(p) || p.disused === true || p.construction === true) return false;
    const kind = String(p.power || p.type || '').toLowerCase();
    if (kind !== 'line' && kind !== 'minor_line') return false;
    const voltage = parseVoltageKilovolts(p);
    if (voltage !== null && voltage >= 50) return false;
    if (kind === 'minor_line') return true;
    if (voltage !== null) return voltage < 50;
    // An un-volted "line" is only admitted when it is physically associated
    // with at least two mapped local distribution poles in this view.
    return supports.some(s => pathsOf(feature).some(path => {
      const hit = projectSupportToPath(s.coordinate, path);
      return hit && hit.distance <= POWER_SNAP_M;
    })) && supports.some((s, i) => i > 0 && pathsOf(feature).some(path => {
      const hit = projectSupportToPath(s.coordinate, path);
      return hit && hit.distance <= POWER_SNAP_M;
    }));
  }

  function overpassElementToFeature(element) {
    if (!element || !element.tags) return null;
    const tags = element.tags;
    const properties = { ...tags, osm_id: element.id, osm_element_type: element.type };
    if (element.type === 'node' && Number.isFinite(Number(element.lon)) && Number.isFinite(Number(element.lat))) {
      return { type: 'Feature', id: 'osm-node-' + element.id, geometry: { type: 'Point', coordinates: [Number(element.lon), Number(element.lat)] }, properties };
    }
    if (element.type === 'way' && Array.isArray(element.geometry)) {
      const coordinates = element.geometry
        .filter(p => Number.isFinite(Number(p.lon)) && Number.isFinite(Number(p.lat)))
        .map(p => [Number(p.lon), Number(p.lat)]);
      if (coordinates.length >= 2) {
        return { type: 'Feature', id: 'osm-way-' + element.id, geometry: { type: 'LineString', coordinates }, properties };
      }
    }
    return null;
  }

  function currentQueryBounds(padFactor) {
    const bounds = map.getBounds && map.getBounds();
    if (!bounds) return null;
    const west = bounds.getWest(), east = bounds.getEast();
    const south = bounds.getSouth(), north = bounds.getNorth();
    const padLon = Math.min(.05, Math.max(.0015, Math.abs(east - west) * padFactor));
    const padLat = Math.min(.05, Math.max(.0015, Math.abs(north - south) * padFactor));
    return {
      west: Math.max(-180, west - padLon), south: Math.max(-85, south - padLat),
      east: Math.min(180, east + padLon), north: Math.min(85, north + padLat)
    };
  }

  function boundsKey(bounds) {
    return [bounds.west, bounds.south, bounds.east, bounds.north].map(v => Number(v).toFixed(4)).join(',');
  }

  async function loadMiddletownStreetlights() {
    if (dead || Number(map.getZoom()) < 14) return false;
    const b = currentQueryBounds(.28);
    if (!b || b.east < -72.705 || b.west > -72.60 || b.north < 41.54 || b.south > 41.60) return false;
    const key = boundsKey(b);
    if (key === municipalRequestKey && Date.now() - municipalFetchedAt < 90000) return false;
    if (municipalRequestPromise) return municipalRequestPromise;
    municipalRequestKey = key;
    municipalRequestPromise = (async () => {
      try {
        const fields = 'OBJECTID,UTIL_PN,FIELD_PN,OWNERSHIP,ALONEVDIST,POLEMAT,ARM_LENGTH,ARM_DIR,MOUNT_HT,FEED,AUDIT_DATE,LATITUDE,LONGITUDE';
        const params = new URLSearchParams({
          where: '1=1', outFields: fields, returnGeometry: 'true', outSR: '4326',
          geometry: [b.west, b.south, b.east, b.north].join(','),
          geometryType: 'esriGeometryEnvelope', inSR: '4326',
          spatialRel: 'esriSpatialRelIntersects', resultRecordCount: '1000', f: 'json'
        });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch('https://gis.cityofmiddletown.com/arcgis/rest/services/Website/MiddletownStreetLights/MapServer/0/query?' + params.toString(), {
          mode: 'cors', credentials: 'omit', headers: { Accept: 'application/json' }, signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) throw new Error('Middletown GIS HTTP ' + response.status);
        const json = await response.json();
        if (json.error) throw new Error(json.error.message || 'Middletown GIS query error');
        const mapped = (json.features || []).map(feature => {
          const a = feature.attributes || {}, g = feature.geometry || {};
          const lon = Number(g.x ?? a.LONGITUDE), lat = Number(g.y ?? a.LATITUDE);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
          if (String(a.ALONEVDIST || '').toLowerCase() !== 'distribution') return null;
          const utilityPoleNumber = String(a.UTIL_PN || '').trim();
          const fieldPoleNumber = String(a.FIELD_PN || '').trim();
          const identity = utilityPoleNumber && utilityPoleNumber.toLowerCase() !== 'n/a'
            ? 'MIDDLETOWN-UTIL-' + utilityPoleNumber
            : 'MIDDLETOWN-OBJECT-' + String(a.OBJECTID);
          return {
            type: 'Feature', id: identity,
            geometry: { type: 'Point', coordinates: [lon, lat] },
            properties: {
              osm_id: identity, type: 'pole', power: 'pole', material: a.POLEMAT || '',
              angle: parseBearingDegrees(a.ARM_DIR), arm_length: a.ARM_LENGTH || '',
              arm_direction: a.ARM_DIR || '', arm_length_metres: parseArmLengthMetres(a.ARM_LENGTH),
              utility_pole_number: utilityPoleNumber, field_pole_number: fieldPoleNumber,
              inventory_ownership: a.OWNERSHIP || '', distribution_class: a.ALONEVDIST || '',
              fixture_mount_height: a.MOUNT_HT || '', streetlight_feed: a.FEED || '',
              municipal_audit_date: a.AUDIT_DATE || '', source: 'Middletown CT StreetLights GIS'
            }
          };
        }).filter(Boolean);
        municipalStreetlightFeatures = uniqueFeatures(mapped, feature => featureKey(feature, 'municipal-pole'));
        municipalFetchedAt = Date.now();
        say('Middletown municipal distribution-pole records loaded: ' + municipalStreetlightFeatures.length + ' in this view (streetlight inventory, audited 2019).');
        return true;
      } catch (error) {
        console.warn('BridgePoint Middletown distribution-pole inventory unavailable', error);
        municipalFetchedAt = Date.now();
        return false;
      } finally {
        municipalRequestPromise = null;
        if (!dead) scheduleRefresh();
      }
    })();
    return municipalRequestPromise;
  }

  async function loadOverpassInfrastructure() {
    if (dead || Number(map.getZoom()) < 15) return false;
    const b = currentQueryBounds(.2);
    if (!b || Math.abs(b.east - b.west) > .13 || Math.abs(b.north - b.south) > .13) return false;
    const key = boundsKey(b);
    if (key === overpassRequestKey && Date.now() - overpassFetchedAt < 180000) return false;
    if (overpassRequestPromise) return overpassRequestPromise;
    overpassRequestKey = key;
    overpassRequestPromise = (async () => {
      const bbox = [b.south, b.west, b.north, b.east].join(',');
      const query = '[out:json][timeout:15];(' +
        'node["power"="pole"](' + bbox + ');' +
        'node["man_made"="utility_pole"](' + bbox + ');' +
        'node["man_made"="street_cabinet"](' + bbox + ');' +
        'node["telecom"~"^(connection_point|distribution_point|remote_terminal)$"](' + bbox + ');' +
        'node["power"~"^(transformer|switch)$"](' + bbox + ');' +
        'way["power"~"^(line|minor_line)$"](' + bbox + ');' +
        'way["communication"="line"](' + bbox + ');' +
        'way["aerial_line"="telephone"](' + bbox + ');' +
        'way["phone"="line"](' + bbox + ');' +
        'way["telephone"="line"](' + bbox + ');' +
        'way["man_made"="guy_wire"](' + bbox + ');' +
        ');out body geom;';
      const endpoints = ['https://overpass-api.de/api/interpreter?data=', 'https://overpass.kumi.systems/api/interpreter?data='];
      try {
        let json = null;
        for (const endpoint of endpoints) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6500);
            const response = await fetch(endpoint + encodeURIComponent(query), {
              mode: 'cors', credentials: 'omit', headers: { Accept: 'application/json' }, signal: controller.signal
            });
            clearTimeout(timeout);
            if (!response.ok) throw new Error('Overpass HTTP ' + response.status);
            json = await response.json();
            break;
          } catch (error) {
            console.warn('BridgePoint Overpass source retry', String(error && error.message || error));
          }
        }
        if (!json || !Array.isArray(json.elements)) throw new Error('No Overpass endpoint returned a valid response');
        overpassFeatures = uniqueFeatures(json.elements.map(overpassElementToFeature).filter(Boolean), feature =>
          feature.geometry && feature.geometry.type === 'Point'
            ? featureKey(feature, 'osm-point')
            : pathFeatureKey(feature, 'osm-line')
        );
        overpassFetchedAt = Date.now();
        return true;
      } catch (error) {
        console.warn('BridgePoint Overpass local utility data unavailable', error);
        overpassFetchedAt = Date.now();
        return false;
      } finally {
        overpassRequestPromise = null;
        if (!dead) scheduleRefresh();
      }
    })();
    return overpassRequestPromise;
  }

  function collectAssets() {
    const tileSupports = cacheSourceFeatures(POWER_SOURCE, 'power_tower', 'support');
    const overpassPoints = overpassFeatures.filter(feature => pointOf(feature));
    const municipalPoints = municipalStreetlightFeatures;
    const supportFeatures = uniqueFeatures(
      [...tileSupports, ...overpassPoints.filter(feature => {
        const p = feature.properties || {};
        return p.power === 'pole' || (p.man_made === 'utility_pole' && p.utility !== 'street_lighting');
      }), ...municipalPoints],
      feature => featureKey(feature, 'support')
    );
    const rawPowerLines = uniqueFeatures([
      ...cacheSourceFeatures(POWER_SOURCE, 'power_line', 'line'),
      ...overpassFeatures.filter(feature => pathsOf(feature).length && (
        feature.properties.power === 'line' || feature.properties.power === 'minor_line'
      ))
    ], feature => pathFeatureKey(feature, 'line'));
    const transformerFeatures = uniqueFeatures([
      ...cacheSourceFeatures(POWER_SOURCE, 'power_transformer', 'transformer'),
      ...overpassPoints.filter(feature => feature.properties.power === 'transformer')
    ], feature => featureKey(feature, 'transformer'));
    const switchFeatures = uniqueFeatures([
      ...cacheSourceFeatures(POWER_SOURCE, 'power_switch', 'switch'),
      ...overpassPoints.filter(feature => feature.properties.power === 'switch')
    ], feature => featureKey(feature, 'switch'));
    const mastFeatures = uniqueFeatures([
      ...cacheSourceFeatures(TELECOM_SOURCE, 'telecoms_mast', 'mast'),
      ...overpassPoints.filter(feature => feature.properties.man_made === 'mast' &&
        (feature.properties['tower:type'] === 'communication' || feature.properties['communication:mobile_phone'] === 'yes'))
    ], feature => featureKey(feature, 'mast'));
    const cabinetFeatures = uniqueFeatures([
      ...cacheSourceFeatures(TELECOM_SOURCE, 'telecoms_cabinet', 'cabinet'),
      ...overpassPoints.filter(feature => feature.properties.man_made === 'street_cabinet' ||
        ['connection_point', 'distribution_point', 'remote_terminal'].includes(String(feature.properties.telecom || '')))
    ], feature => featureKey(feature, 'cabinet'));
    const telecomLineFeatures = uniqueFeatures([
      ...cacheSourceFeatures(TELECOM_SOURCE, 'telecoms_communication_line', 'telecom-line'),
      ...overpassFeatures.filter(feature => pathsOf(feature).length && (
        feature.properties.communication === 'line' ||
        feature.properties.aerial_line === 'telephone' ||
        feature.properties.phone === 'line' ||
        feature.properties.telephone === 'line' ||
        feature.properties.telecom === 'line'
      ))
    ], feature => pathFeatureKey(feature, 'telecom-line'));

    const supports = [];
    for (const feature of supportFeatures) {
      const point = pointOf(feature), properties = feature.properties || {};
      if (!point || properties.disused === true || properties.construction === true) continue;
      const osmPole = String(properties.power || '').toLowerCase() === 'pole' ||
        String(properties.type || '').toLowerCase() === 'pole';
      const telecomPole = String(properties.man_made || '').toLowerCase() === 'utility_pole';
      const municipalPole = String(properties.distribution_class || properties.ALONEVDIST || '').toLowerCase() === 'distribution';
      if (!osmPole && !telecomPole && !municipalPole) continue;
      const height = measuredHeight(properties, 10);
      const bearing = parseBearingDegrees(properties.angle ?? properties.arm_direction);
      const utility = String(properties.utility || '').toLowerCase();
      supports.push({
        key: featureKey(feature, 'support'), coordinate: point, type: 'pole',
        network: utility === 'telecom' ? 'telecom' : 'power',
        height: height.metres, measuredHeight: height.measured,
        material: String(properties.material || ''), structure: String(properties.structure || ''),
        bearing, bearingDistance: bearing === null ? Infinity : 1e6,
        armLengthMetres: Number(properties.arm_length_metres) || parseArmLengthMetres(properties.arm_length),
        utilityPoleNumber: properties.utility_pole_number || properties.UTIL_PN || '',
        municipalAuditDate: properties.municipal_audit_date || properties.AUDIT_DATE || '',
        municipal: !!properties.source
      });
    }

    // Merge municipal streetlight distribution records onto nearby OSM utility poles,
    // preserving the municipality's pole reference/material/arm metadata at its coordinate.
    for (const feature of municipalPoints) {
      const point = pointOf(feature), p = feature.properties || {};
      if (!point) continue;
      let nearest = null, nearestDistance = 4.5;
      for (const support of supports) {
        const distance = haversineMetres(support.coordinate, point);
        if (distance < nearestDistance) { nearestDistance = distance; nearest = support; }
      }
      if (nearest) {
        if (!nearest.material && p.material) nearest.material = String(p.material);
        nearest.armLengthMetres = Number(p.arm_length_metres) || nearest.armLengthMetres;
        if (Number.isFinite(Number(p.angle))) {
          nearest.bearing = Number(p.angle); nearest.bearingDistance = 0;
        }
        nearest.utilityPoleNumber = nearest.utilityPoleNumber || p.utility_pole_number || '';
        nearest.municipalAuditDate = p.municipal_audit_date || nearest.municipalAuditDate;
        nearest.municipal = true;
      }
    }

    const center = map.getCenter && map.getCenter();
    supports.sort((a, b) => {
      const da = center ? haversineMetres(a.coordinate, [center.lng, center.lat]) : 0;
      const db = center ? haversineMetres(b.coordinate, [center.lng, center.lat]) : 0;
      return da - db;
    });
    supports.length = Math.min(supports.length, MAX_SUPPORTS);
    const powerSupports = supports.filter(s => s.network === 'power');

    const lineFeatures = rawPowerLines.filter(feature => isDistributionPowerLine(feature, powerSupports));
    const powerSpans = makeSpans(lineFeatures, powerSupports, 'power', POWER_SNAP_M, 240, MAX_SPANS);
    const telecomSpans = makeSpans(
      telecomLineFeatures.filter(feature => isOverheadFeature(feature.properties || {})),
      supports, 'telecom', 12, 150, MAX_SPANS
    );
    const masts = mastFeatures.map(feature => {
      const coordinate = pointOf(feature);
      if (!coordinate) return null;
      const height = measuredHeight(feature.properties || {}, 18);
      return { key: featureKey(feature, 'mast'), coordinate, height: height.metres, measuredHeight: height.measured };
    }).filter(Boolean);
    const cabinets = cabinetFeatures.map(feature => {
      const coordinate = pointOf(feature);
      if (!coordinate) return null;
      const p = feature.properties || {};
      return {
        key: featureKey(feature, 'cabinet'), coordinate,
        mountOnPole: String(p.location || '').toLowerCase() === 'pole' ||
          ['distribution_point', 'remote_terminal'].includes(String(p.telecom || '')),
        sourceType: String(p.telecom || p.man_made || 'cabinet')
      };
    }).filter(Boolean);
    const transformers = transformerFeatures.map(feature => {
      const coordinate = pointOf(feature);
      return coordinate ? { key: featureKey(feature, 'transformer'), coordinate } : null;
    }).filter(Boolean);
    const switches = switchFeatures.map(feature => {
      const coordinate = pointOf(feature);
      return coordinate ? { key: featureKey(feature, 'switch'), coordinate, angle: Number(feature.properties && feature.properties.angle) || 0 } : null;
    }).filter(Boolean);
    const guyWires = overpassFeatures.filter(feature => pathsOf(feature).length &&
      String(feature.properties && feature.properties.man_made || '') === 'guy_wire');
    const municipalPoleCount = supports.filter(s => s.municipal).length;
    const telecomPoleCount = supports.filter(s => s.network === 'telecom').length;
    return {
      supports, powerSpans, telecomSpans, transformers, switches, cabinets, masts, guyWires,
      lineCount: lineFeatures.length, municipalPoleCount, telecomPoleCount
    };
  }

  function createWireMesh(span, kind) {
    const anchor = span.a.coordinate, anchorGround = terrainAt(map, anchor);
    const nextGround = terrainAt(map, span.b.coordinate);
    const offset = localEastNorth(anchor, span.b.coordinate);
    const distance = Math.hypot(offset[0], offset[1]);
    if (!Number.isFinite(distance) || distance < 10) return null;
    const bearing = Math.atan2(offset[0], offset[1]);
    const acrossEast = Math.cos(bearing), acrossNorth = -Math.sin(bearing);
    const sag = Math.min(kind === 'telecom' ? 7 : 11, Math.max(.35, distance * (kind === 'telecom' ? .022 : .028)));
    const conductorCount = kind === 'telecom' ? 1 : Math.max(1, Math.min(4, Number(span.conductorCount) || 3));
    const spacing = kind === 'telecom' ? .06 : .42;
    const lanes = Array.from({ length: conductorCount }, (_, i) =>
      (i - (conductorCount - 1) * .5) * spacing
    );
    const vertices = [];
    for (const lane of lanes) {
      let previous = null;
      const steps = Math.min(16, Math.max(6, Math.ceil(distance / 30)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const east = offset[0] * t + acrossEast * lane;
        const north = offset[1] * t + acrossNorth * lane;
        const base = anchorGround + (nextGround - anchorGround) * t;
        const heightA = kind === 'telecom' ? span.a.height * .76 : span.a.height * .94;
        const heightB = kind === 'telecom' ? span.b.height * .76 : span.b.height * .94;
        const height = base - anchorGround + heightA + (heightB - heightA) * t - 4 * sag * t * (1 - t);
        const current = new THREE.Vector3(east, height, -north);
        if (previous) pushBeam(vertices, previous, current, kind === 'telecom' ? .012 : .022, THREE, 6);
        previous = current;
      }
    }
    if (!vertices.length) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    const matrix = modelMatrixFor(map, THREE, anchor, anchorGround);
    if (!matrix) { geometry.dispose(); return null; }
    const mesh = new THREE.Mesh(geometry, kind === 'telecom' ? telecomCableMaterial : distributionCableMaterial);
    mesh.matrix.copy(matrix);
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = 920;
    mesh.userData.bpOwnedGeometry = true;
    return mesh;
  }

  function buildSceneAssets(assets) {
    clearSceneData();
    const supports = assets.supports;
    if (!supports.length && !assets.transformers.length && !assets.cabinets.length && !assets.masts.length) {
      state.updatedAt = Date.now();
      state.ready = true;
      state.lineFeatures = assets.lineCount;
      say('No mapped power or communications structures in the loaded tiles for this view yet.');
      return;
    }

    const poleMesh = new THREE.InstancedMesh(bodyGeometry, woodMaterial, supports.length);
    const armMesh = new THREE.InstancedMesh(armGeometry, woodMaterial, supports.length);
    const insulatorMesh = new THREE.InstancedMesh(insulatorGeometry, metalMaterial, supports.length * 3);
    const towerMesh = new THREE.InstancedMesh(towerGeometry, towerMaterial, Math.max(1, supports.length));
    poleMesh.count = 0; armMesh.count = 0; insulatorMesh.count = 0; towerMesh.count = 0;
    for (const mesh of [poleMesh, armMesh, insulatorMesh, towerMesh]) {
      mesh.frustumCulled = false;
      mesh.renderOrder = 920;
    }

    let poleCount = 0, towerCount = 0, measured = 0, estimated = 0;
    const byKey = new Map();
    supports.forEach(support => {
      const ground = terrainAt(map, support.coordinate);
      const yaw = (Number(support.bearing) || 0) * RAD;
      const mesh = support.type === 'tower' ? towerMesh : poleMesh;
      const index = support.type === 'tower' ? towerCount : poleCount;
      const scale = support.height;
      if (setInstance(mesh, index, map, THREE, support.coordinate, ground, yaw, [scale, scale, scale])) {
        if (support.type === 'tower') towerCount++; else poleCount++;
        if (support.measuredHeight) measured++; else estimated++;
        byKey.set(support.key, support);
        if (support.type === 'pole') {
          const materialTag = String(support.material || '').toLowerCase();
          const poleHex = materialTag.includes('concrete') ? 0x9da8ad :
            (materialTag.includes('steel') || materialTag.includes('metal') || materialTag.includes('iron') || materialTag.includes('alumin')) ? 0x98a5aa :
            materialTag.includes('composite') ? 0x7d8990 : 0xb28a5d;
          const poleColor = new THREE.Color(poleHex);
          poleMesh.setColorAt(index, poleColor);
          armMesh.setColorAt(index, poleColor);
          const model = modelMatrixFor(map, THREE, support.coordinate, ground);
          if (model) {
            const rotation = new THREE.Matrix4().makeRotationY(yaw);
            const scaled = new THREE.Matrix4().makeScale(scale, scale, scale);
            armMesh.setMatrixAt(index, model.clone().multiply(rotation).multiply(scaled));
            for (let pin = 0; pin < 3; pin++) {
              const across = (pin - 1) * .072;
              const pinMatrix = model.clone().multiply(rotation).multiply(scaled)
                .multiply(new THREE.Matrix4().makeTranslation(across, 0, 0));
              insulatorMesh.setMatrixAt(index * 3 + pin, pinMatrix);
            }
            armMesh.count = poleCount;
            insulatorMesh.count = poleCount * 3;
          }
        }
      }
    });
    poleMesh.count = poleCount; towerMesh.count = towerCount;
    if (poleCount) {
      poleMesh.instanceMatrix.needsUpdate = true; armMesh.instanceMatrix.needsUpdate = true; insulatorMesh.instanceMatrix.needsUpdate = true;
      if (poleMesh.instanceColor) poleMesh.instanceColor.needsUpdate = true;
      if (armMesh.instanceColor) armMesh.instanceColor.needsUpdate = true;
      dataGroup.add(poleMesh, armMesh, insulatorMesh);
    }
    if (towerCount) { towerMesh.instanceMatrix.needsUpdate = true; dataGroup.add(towerMesh); }

    const transformerMesh = new THREE.InstancedMesh(transformerGeometry, metalMaterial, assets.transformers.length);
    let transformerCount = 0;
    for (const transformer of assets.transformers) {
      const attached = supports
        .map(s => ({ support: s, distance: haversineMetres(s.coordinate, transformer.coordinate) }))
        .sort((a, b) => a.distance - b.distance)[0];
      const support = attached && attached.distance <= 9 ? attached.support : null;
      const ground = terrainAt(map, transformer.coordinate);
      const altitude = ground + (support ? support.height * .66 : .55);
      let matrix = modelMatrixFor(map, THREE, transformer.coordinate, ground);
      if (!matrix) continue;
      matrix.multiply(new THREE.Matrix4().makeTranslation(.34, support ? support.height * .66 : .55, 0));
      matrix.multiply(new THREE.Matrix4().makeScale(.72, support ? .9 : 1.1, .72));
      transformerMesh.setMatrixAt(transformerCount++, matrix);
    }
    transformerMesh.count = transformerCount;
    if (transformerCount) { transformerMesh.instanceMatrix.needsUpdate = true; transformerMesh.frustumCulled = false; dataGroup.add(transformerMesh); }

    const switchMesh = new THREE.InstancedMesh(switchGeometry, metalMaterial, assets.switches.length);
    let switchCount = 0;
    for (const item of assets.switches) {
      const attached = supports
        .map(s => ({ support: s, distance: haversineMetres(s.coordinate, item.coordinate) }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (!attached || attached.distance > 8) continue;
      const support = attached.support, ground = terrainAt(map, item.coordinate);
      const matrix = modelMatrixFor(map, THREE, item.coordinate, ground);
      if (!matrix) continue;
      matrix.multiply(new THREE.Matrix4().makeRotationY(Number(item.angle) * RAD));
      matrix.multiply(new THREE.Matrix4().makeTranslation(0, support.height * .83, 0));
      switchMesh.setMatrixAt(switchCount++, matrix);
    }
    switchMesh.count = switchCount;
    if (switchCount) { switchMesh.instanceMatrix.needsUpdate = true; switchMesh.frustumCulled = false; dataGroup.add(switchMesh); }

    const cabinetMesh = new THREE.InstancedMesh(cabinetGeometry, telecomMaterial, assets.cabinets.length);
    let cabinetCount = 0;
    for (const cabinet of assets.cabinets) {
      const ground = terrainAt(map, cabinet.coordinate);
      const matrix = modelMatrixFor(map, THREE, cabinet.coordinate, ground);
      if (!matrix) continue;
      matrix.multiply(new THREE.Matrix4().makeTranslation(0, .42, 0));
      cabinetMesh.setMatrixAt(cabinetCount++, matrix);
    }
    cabinetMesh.count = cabinetCount;
    if (cabinetCount) { cabinetMesh.instanceMatrix.needsUpdate = true; cabinetMesh.frustumCulled = false; dataGroup.add(cabinetMesh); }

    const mastMesh = new THREE.InstancedMesh(mastGeometry, telecomMaterial, assets.masts.length);
    let mastCount = 0;
    for (const mast of assets.masts) {
      const ground = terrainAt(map, mast.coordinate);
      const matrix = modelMatrixFor(map, THREE, mast.coordinate, ground);
      if (!matrix) continue;
      matrix.multiply(new THREE.Matrix4().makeScale(mast.height, mast.height, mast.height));
      mastMesh.setMatrixAt(mastCount++, matrix);
      if (mast.measuredHeight) measured++; else estimated++;
    }
    mastMesh.count = mastCount;
    if (mastCount) { mastMesh.instanceMatrix.needsUpdate = true; mastMesh.frustumCulled = false; dataGroup.add(mastMesh); }

    let powerSpanCount = 0, telecomSpanCount = 0;
    for (const span of assets.powerSpans) {
      const mesh = createWireMesh(span, 'power');
      if (mesh) { dataGroup.add(mesh); powerSpanCount++; }
    }
    for (const span of assets.telecomSpans) {
      const mesh = createWireMesh(span, 'telecom');
      if (mesh) { dataGroup.add(mesh); telecomSpanCount++; }
    }

    state.poles = poleCount; state.towers = towerCount;
    state.powerSpans = powerSpanCount; state.telecomSpans = telecomSpanCount;
    state.transformers = transformerCount; state.switches = switchCount;
    state.cabinets = cabinetCount; state.telecomMasts = mastCount;
    state.measuredHeights = measured; state.estimatedHeights = estimated;
    state.updatedAt = Date.now();
    say('Mapped utility assets: ' + poleCount + ' poles, ' + towerCount + ' towers, ' +
      powerSpanCount + ' power-wire spans, ' + transformerCount + ' transformers, ' +
      switchCount + ' switches, ' + cabinetCount + ' cabinets, ' + mastCount +
      ' communications masts. Heights measured: ' + measured + '; estimated by structure class: ' + estimated + '.');
    try { map.triggerRepaint && map.triggerRepaint(); } catch (_) {}
  }

  async function refresh() {
    // BridgePoint can report isStyleLoaded() false while unrelated globe/source tiles
    // stream. A live style object is enough to install our own vector sources and 3D layer.
    if (dead || !map || typeof map.getStyle !== 'function' || !map.getStyle()) return;
    const zoom = Number(map.getZoom && map.getZoom() || 0);
    lastZoom = zoom;
    if (zoom < MIN_ZOOM) {
      if (state.poles || state.towers || state.powerSpans || state.transformers || state.cabinets) {
        clearSceneData();
      }
      say('Global utility infrastructure is ready. Mapped 3D poles, towers, wires and equipment appear automatically from zoom ' + MIN_ZOOM + '+.');
      return;
    }
    const seq = ++sequence;
    say('Loading mapped poles, distribution lines and utility equipment for the visible area…');
    try {
      if (!installSources()) throw new Error('Public utility vector sources unavailable');
      if (!installCustomLayer()) throw new Error('3D utility renderer is not ready');
      const assets = collectAssets();
      if (seq !== sequence || dead) return;
      buildSceneAssets(assets);
      state.lineFeatures = assets.lineCount;
      state.enabled = true;
      state.ready = true;
    } catch (error) {
      console.warn('BridgePoint global utility infrastructure', error);
      say('Utility infrastructure refresh retrying: ' + String(error && error.message || error).slice(0, 130));
    }
  }

  function scheduleRefresh() {
    if (dead) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { void refresh(); }, 260);
  }

  function onStyleReady() {
    if (dead || !map || typeof map.getStyle !== 'function' || !map.getStyle() || styleInitPromise) return;
    styleInitPromise = (async () => {
      try {
        if (!installSources()) throw new Error('Public utility vector sources unavailable');
        THREE = await loadThree();
        if (dead) return;
        if (!bodyGeometry) createGeometry();
        if (!installCustomLayer()) {
          // MapLibre may still be invoking onAdd for this custom layer.
          if (!dataGroup && !map.getLayer('bp-utility-poles-3d-v1')) {
            throw new Error('3D utility renderer is not ready');
          }
        }
        scheduleRefresh();
      } catch (error) {
        console.warn('BridgePoint utility poles Three.js unavailable', error);
        say('Utility 3D engine unavailable: ' + String(error && error.message || error).slice(0, 100));
      } finally {
        styleInitPromise = null;
      }
    })();
  }

  function onMapData(event) {
    // Rebuild when each viewport tile finishes decoding, not merely when the whole source settles.
    // This keeps later-arriving support-point layers in step with their route tiles.
    if (event && (event.sourceId === POWER_SOURCE || event.sourceId === TELECOM_SOURCE)) {
      scheduleRefresh();
    }
  }

  function onMapIdle() {
    if (!state.updatedAt || lastZoom !== Number(map.getZoom())) scheduleRefresh();
  }

  function bindMap() {
    if (!map || dead) return false;
    if (!listenersBound) {
      map.on('style.load', onStyleReady);
      map.on('moveend', scheduleRefresh);
      map.on('zoomend', scheduleRefresh);
      map.on('sourcedata', onMapData);
      map.on('idle', onMapIdle);
      listenersBound = true;
    }
    if (typeof map.getStyle === 'function' && map.getStyle()) onStyleReady();
    return true;
  }

  function boot() {
    if (dead) return;
    if (bindMap()) return;
    if (bootTries++ < 180) setTimeout(boot, 500);
    else say('Waiting for the active BridgePoint globe map object.');
  }

  state.snapshot = () => ({
    version: VERSION, enabled: state.enabled, ready: state.ready, status: state.status,
    poles: state.poles, towers: state.towers, powerSpans: state.powerSpans,
    telecomSpans: state.telecomSpans, transformers: state.transformers,
    switches: state.switches, cabinets: state.cabinets, telecomMasts: state.telecomMasts,
    measuredHeights: state.measuredHeights, estimatedHeights: state.estimatedHeights,
    lineFeatures: state.lineFeatures || 0, source: state.source, heightNote: state.heightNote,
    updatedAt: state.updatedAt
  });
  state.refresh = scheduleRefresh;
  state.destroy = () => {
    if (dead) return;
    dead = true;
    clearTimeout(refreshTimer);
    try {
      map.off('style.load', onStyleReady);
      map.off('moveend', scheduleRefresh);
      map.off('zoomend', scheduleRefresh);
      map.off('sourcedata', onMapData);
      map.off('idle', onMapIdle);
      clearSceneData();
      featureCache.clear();
      if (map.getLayer('bp-utility-poles-3d-v1')) map.removeLayer('bp-utility-poles-3d-v1');
      for (const id of ['bp-utility-query-power-v1', 'bp-utility-query-telecom-v1']) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource(TELECOM_SOURCE)) map.removeSource(TELECOM_SOURCE);
      if (map.getSource(POWER_SOURCE)) map.removeSource(POWER_SOURCE);
    } catch (_) {}
    try { delete window.__BP_UTILITY_INFRASTRUCTURE_V1__; } catch (_) {}
  };


  const start = () => boot();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  return state;
}