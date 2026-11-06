/* BridgePoint materialized 3D lighthouses v1.
 * OSM-backed global lighthouse locations; meter-scale polygon towers at close zoom;
 * locally calculated twilight controls the rotating lantern beam.
 */
const VERSION = 1;
const THREE_URL = '/vendor/three.module.js?v=169-local';
const SOURCE_ID = 'bp-lighthouses-source-v1';
const MARKER_LAYER_ID = 'bp-lighthouses-markers-v1';
const MODEL_LAYER_ID = 'bp-lighthouses-3d-v1';
const MIN_MODEL_ZOOM = 9.2;
const NIGHT_THRESHOLD_DEG = -6;
const WORLD_BOUNDS = [-85, -180, 85, 180];
const EMPTY = { type: 'FeatureCollection', features: [] };
const MOBILE = typeof window !== 'undefined' &&
  ((Number(window.innerWidth) || 1024) <= 820 ||
   (typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints) > 0));
const MAX_GLOBAL_FEATURES = 10000;
const MAX_RENDERED_MODELS = MOBILE ? 8 : 24;
const RAD = Math.PI / 180;
const TAU = Math.PI * 2;

const COLOR_NAMES = {
  white:'#f1ead9', offwhite:'#eee5d1', ivory:'#eee5d1', cream:'#e8ddc4',
  red:'#b64436', darkred:'#762b27', orange:'#c46d32', yellow:'#e7c56d',
  black:'#242b30', grey:'#858b8d', gray:'#858b8d', silver:'#aeb7bb',
  blue:'#4f7d98', green:'#657b61', brown:'#79583f', stone:'#aaa18e'
};

export function parseLengthMetres(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  const match = String(value).trim().replace(',', '.')
    .match(/^([0-9]+(?:\.[0-9]+)?)\s*(m|metres?|meters?|ft|feet|foot|')?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = String(match[2] || 'm').toLowerCase();
  const metres = ['ft','feet','foot',"'"].includes(unit) ? amount * 0.3048 : amount;
  return metres > 0 && metres <= 500 ? metres : null;
}

function parseElevationMetres(value) {
  if (value === null || value === undefined || value === '') return null;
  const match = String(value).trim().replace(',', '.')
    .match(/^(-?[0-9]+(?:\.[0-9]+)?)\s*(m|metres?|meters?|ft|feet|foot)?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const unit = String(match[2] || 'm').toLowerCase();
  const metres = unit === 'ft' || unit === 'feet' || unit === 'foot'
    ? amount * 0.3048 : amount;
  return metres >= -500 && metres <= 9000 ? metres : null;
}

function firstLength(tags, keys) {
  for (const key of keys) {
    const value = parseLengthMetres(tags && tags[key]);
    if (value !== null) return value;
  }
  return null;
}

function normalizeColor(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!raw) return null;
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(raw)) return raw;
  if (/^[0-9a-f]{6}$/i.test(raw)) return '#' + raw;
  return COLOR_NAMES[raw] || null;
}

function colorPalette(tags) {
  const raw = tags && (
    tags.colour || tags.color || tags['building:colour'] ||
    tags['building:color'] || tags['seamark:colour']
  );
  const parsed = String(raw || '').split(/[;,/]/)
    .map(normalizeColor).filter(Boolean).slice(0, 3);
  return parsed.length ? parsed : ['#f1ead9', '#b64436'];
}

function isLighthouseElement(element) {
  const tags = element && element.tags || {};
  return tags.man_made === 'lighthouse' ||
    tags.building === 'lighthouse' ||
    tags['seamark:type'] === 'light_major';
}

function elementCoordinate(element) {
  if (Number.isFinite(Number(element && element.lat)) &&
      Number.isFinite(Number(element && element.lon))) {
    return [Number(element.lon), Number(element.lat)];
  }
  const center = element && element.center;
  if (center && Number.isFinite(Number(center.lon)) && Number.isFinite(Number(center.lat))) {
    return [Number(center.lon), Number(center.lat)];
  }
  return null;
}

export function normalizeLighthouseElement(element) {
  if (!isLighthouseElement(element)) return null;
  const coordinate = elementCoordinate(element);
  if (!coordinate || coordinate[0] < -180 || coordinate[0] > 180 ||
      coordinate[1] < -85 || coordinate[1] > 85) return null;
  const tags = element.tags || {};
  const measuredHeight = firstLength(tags, [
    'height', 'height:structure', 'tower:height', 'building:height', 'seamark:height'
  ]);
  const heightM = measuredHeight || 22;
  const measuredDiameter = firstLength(tags, [
    'diameter', 'tower:diameter', 'building:width', 'width'
  ]);
  const diameterM = measuredDiameter || Math.max(4.6, Math.min(8.5, heightM * 0.24));
  const period = Number(String(tags['seamark:light:period'] ||
    tags['light:period'] || tags.period || '').replace(/[^0-9.]/g, ''));
  const lightColor = normalizeColor(
    tags['seamark:light:colour'] || tags['light:colour'] || tags['seamark:light:color']
  ) || '#ffe6a4';
  const elevation = parseElevationMetres(tags.ele);
  const id = String(element.type || 'osm') + '/' +
    String(element.id ?? coordinate[0].toFixed(6) + '/' + coordinate[1].toFixed(6));
  const palette = colorPalette(tags);
  const name = String(tags.name || tags['seamark:name'] || tags['name:en'] || 'Lighthouse');
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: coordinate },
    properties: {
      key: id, name, heightM, measuredHeight: measuredHeight !== null,
      diameterM, measuredDiameter: measuredDiameter !== null, palette,
      markerColor: palette[1] || palette[0], lightColor,
      periodSec: Number.isFinite(period) && period >= 1 && period <= 60 ? period : 5,
      groundElevationM: elevation, source: 'OpenStreetMap contributors',
      sourceType: String(element.type || 'osm'), sourceId: String(element.id ?? '')
    }
  };
}

export function lighthouseProfile(properties = {}) {
  const h = Number(properties.heightM);
  const d = Number(properties.diameterM);
  return {
    heightM: Number.isFinite(h) && h >= 3 && h <= 180 ? h : 22,
    diameterM: Number.isFinite(d) && d >= 2 && d <= 50 ? d : 5.28,
    measuredHeight: properties.measuredHeight === true,
    measuredDiameter: properties.measuredDiameter === true,
    palette: Array.isArray(properties.palette) && properties.palette.length
      ? properties.palette.map(normalizeColor).filter(Boolean).slice(0, 3)
      : ['#f1ead9', '#b64436'],
    lightColor: normalizeColor(properties.lightColor) || '#ffe6a4',
    periodSec: Math.max(1, Math.min(60, Number(properties.periodSec) || 5))
  };
}

export function solarElevationDegrees(latitude, longitude, date = new Date()) {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const day = Math.floor((Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - start) / 86400000) + 1;
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 + date.getUTCMilliseconds() / 3600000;
  const days = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
  const gamma = TAU / days * (day - 1 + (hour - 12) / 24);
  const equationMinutes = 229.18 * (
    0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)
  );
  const declination =
    0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const solarMinutes = hour * 60 + equationMinutes + 4 * Number(longitude);
  const hourAngle = (solarMinutes / 4 - 180) * RAD;
  const lat = Number(latitude) * RAD;
  const cosineZenith = Math.max(-1, Math.min(1,
    Math.sin(lat) * Math.sin(declination) +
    Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)
  ));
  return 90 - Math.acos(cosineZenith) / RAD;
}

export function isDarkAt(latitude, longitude, date = new Date()) {
  return solarElevationDegrees(latitude, longitude, date) <= NIGHT_THRESHOLD_DEG;
}

function modelMatrixFor(map, THREE, coordinate, altitude) {
  try {
    const raw = map.transform && typeof map.transform.getMatrixForModel === 'function'
      ? map.transform.getMatrixForModel(
          [Number(coordinate[0]), Number(coordinate[1])], Number(altitude) || 0
        ) : null;
    if (raw && raw.length >= 16) return new THREE.Matrix4().fromArray(raw);
    const Mercator = window.maplibregl && window.maplibregl.MercatorCoordinate;
    if (!Mercator || typeof Mercator.fromLngLat !== 'function') return null;
    const mc = Mercator.fromLngLat(
      [Number(coordinate[0]), Number(coordinate[1])], Number(altitude) || 0
    );
    const metres = mc.meterInMercatorCoordinateUnits();
    if (![mc.x, mc.y, mc.z, metres].every(Number.isFinite) || metres <= 0) return null;
    return new THREE.Matrix4().set(
      metres, 0, 0, mc.x,
      0, 0, metres, mc.y,
      0, metres, 0, mc.z,
      0, 0, 0, 1
    );
  } catch (_) {
    return null;
  }
}

function addMesh(THREE, parent, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x || 0, y || 0, z || 0);
  mesh.frustumCulled = false;
  parent.add(mesh);
  return mesh;
}

function disposeObject(root) {
  if (!root) return;
  root.traverse(object => {
    if (object.geometry && typeof object.geometry.dispose === 'function') object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material) continue;
        for (const value of Object.values(material)) {
          if (value && value.isTexture && typeof value.dispose === 'function') value.dispose();
        }
        if (typeof material.dispose === 'function') material.dispose();
      }
    }
  });
}

function triangle(vertices, a, b, c) {
  vertices.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
}

function createBeamGeometry(THREE, rangeM) {
  const angle = 0.11;
  const halfHeight = 1.15;
  const left = [Math.sin(-angle) * rangeM, 0, Math.cos(-angle) * rangeM];
  const right = [Math.sin(angle) * rangeM, 0, Math.cos(angle) * rangeM];
  const ot = [0, halfHeight, 0], lt = [left[0], halfHeight, left[2]];
  const rt = [right[0], halfHeight, right[2]];
  const ob = [0, -halfHeight, 0], lb = [left[0], -halfHeight, left[2]];
  const rb = [right[0], -halfHeight, right[2]];
  const v = [];
  triangle(v, ot, lt, rt); triangle(v, ob, rb, lb);
  triangle(v, ot, ob, lb); triangle(v, ot, lb, lt);
  triangle(v, ot, rt, rb); triangle(v, ot, rb, ob);
  triangle(v, lt, lb, rb); triangle(v, lt, rb, rt);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createLighthouseModel(THREE, feature) {
  const p = feature.properties || {};
  const profile = lighthouseProfile(p);
  const h = profile.heightM, diameter = profile.diameterM;
  const root = new THREE.Group();
  root.name = 'OSM lighthouse ' + String(p.name || p.key || '');
  root.matrixAutoUpdate = false;
  const side = THREE.DoubleSide;
  const mat = (color, roughness = 0.72, metalness = 0.02) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, side });
  const stone = mat(profile.palette[0]);
  const accent = mat(profile.palette[1] || profile.palette[0]);
  const metal = mat('#343b40', 0.48, 0.62);
  const roof = mat('#293239', 0.62, 0.42);
  const glass = new THREE.MeshStandardMaterial({
    color: '#9eb9c0', roughness: 0.13, metalness: 0.14, transparent: true,
    opacity: 0.34, depthWrite: false, side
  });
  const baseY = 0.22, bodyHeight = h * 0.755;
  const bodyBottom = diameter * 0.50, bodyTop = diameter * 0.285;
  const steps = 8, segmentHeight = bodyHeight / steps;
  addMesh(THREE, root,
    new THREE.CylinderGeometry(diameter * 0.55, diameter * 0.58, 0.44, 20),
    stone, 0, 0.22, 0);
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps, t1 = (i + 1) / steps;
    const lower = bodyBottom + (bodyTop - bodyBottom) * t0;
    const upper = bodyBottom + (bodyTop - bodyBottom) * t1;
    const band = profile.palette.length > 1 && i % 3 === 2;
    addMesh(THREE, root,
      new THREE.CylinderGeometry(upper, lower, segmentHeight + 0.012, 20, 1, false),
      band ? accent : stone, 0,
      baseY + i * segmentHeight + segmentHeight * 0.5, 0);
  }
  const galleryY = baseY + bodyHeight;
  const galleryRadius = diameter * 0.405;
  addMesh(THREE, root,
    new THREE.CylinderGeometry(galleryRadius, galleryRadius * 1.04, 0.22, 24),
    metal, 0, galleryY, 0);
  addMesh(THREE, root, new THREE.TorusGeometry(galleryRadius * 0.93, 0.035, 7, 32),
    metal, 0, galleryY + 0.55, 0).rotation.x = Math.PI / 2;
  const railRadius = galleryRadius * 0.93;
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU;
    addMesh(THREE, root, new THREE.CylinderGeometry(0.022, 0.022, 0.56, 6),
      metal, Math.cos(a) * railRadius, galleryY + 0.28, Math.sin(a) * railRadius);
  }
  const chamberHeight = Math.max(1.5, h * 0.105);
  const chamberRadius = diameter * 0.305;
  const chamberY = galleryY + 0.22 + chamberHeight * 0.5;
  addMesh(THREE, root,
    new THREE.CylinderGeometry(chamberRadius, chamberRadius, chamberHeight, 16, 1, true),
    glass, 0, chamberY, 0);
  addMesh(THREE, root,
    new THREE.CylinderGeometry(chamberRadius * 1.05, chamberRadius * 1.05, 0.10, 20),
    metal, 0, chamberY - chamberHeight * 0.5, 0);
  addMesh(THREE, root,
    new THREE.CylinderGeometry(chamberRadius * 1.09, chamberRadius * 1.09, 0.11, 20),
    metal, 0, chamberY + chamberHeight * 0.5, 0);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU;
    addMesh(THREE, root, new THREE.BoxGeometry(0.045, chamberHeight * 0.94, 0.045),
      metal, Math.cos(a) * chamberRadius, chamberY, Math.sin(a) * chamberRadius);
  }
  const lampMaterial = new THREE.MeshStandardMaterial({
    color: profile.lightColor, emissive: profile.lightColor, emissiveIntensity: 1.35,
    roughness: 0.18, metalness: 0, side
  });
  const lampY = chamberY;
  addMesh(THREE, root,
    new THREE.CylinderGeometry(chamberRadius * 0.22, chamberRadius * 0.22,
      chamberHeight * 0.58, 14), lampMaterial, 0, lampY, 0);
  addMesh(THREE, root, new THREE.SphereGeometry(chamberRadius * 0.22, 12, 8),
    lampMaterial, 0, lampY, 0);
  const roofHeight = Math.max(0.9, h * 0.075);
  addMesh(THREE, root, new THREE.ConeGeometry(chamberRadius * 1.28, roofHeight, 16),
    roof, 0, chamberY + chamberHeight * 0.5 + roofHeight * 0.5, 0);
  addMesh(THREE, root,
    new THREE.CylinderGeometry(0.07, 0.11, roofHeight * 0.24, 8),
    metal, 0, chamberY + chamberHeight * 0.5 + roofHeight * 0.93, 0);
  const beamGroup = new THREE.Group();
  beamGroup.position.y = lampY;
  beamGroup.visible = false;
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: profile.lightColor, transparent: true, opacity: 0.19,
    blending: THREE.AdditiveBlending, depthWrite: false, side
  });
  const beamRange = Math.max(260, Math.min(1100, h * 24));
  addMesh(THREE, beamGroup, createBeamGeometry(THREE, beamRange), beamMaterial, 0, 0, 0);
  root.add(beamGroup);
  return {
    root, beamGroup, lampMaterial, coordinate: feature.geometry.coordinates,
    groundElevationM: p.groundElevationM !== null && p.groundElevationM !== undefined && Number.isFinite(Number(p.groundElevationM)) ? Number(p.groundElevationM) : null,
    periodSec: profile.periodSec, night: false, nightCheckedAt: 0
  };
}

async function loadThree() {
  if (!threePromise) threePromise = import(THREE_URL).catch(error => {
    threePromise = null;
    throw error;
  });
  return threePromise;
}

function globalOverpassQuery() {
  const box = WORLD_BOUNDS.join(',');
  return '[out:json][timeout:28];(' +
    'nwr["man_made"="lighthouse"](' + box + ');' +
    'nwr["building"="lighthouse"](' + box + ');' +
    'nwr["seamark:type"="light_major"](' + box + ');' +
    ');out center tags ' + MAX_GLOBAL_FEATURES + ';';
}

function viewportOverpassQuery(bounds) {
  const box = [
    Math.max(-85, bounds.getSouth() - 0.06),
    Math.max(-180, bounds.getWest() - 0.06),
    Math.min(85, bounds.getNorth() + 0.06),
    Math.min(180, bounds.getEast() + 0.06)
  ].join(',');
  return '[out:json][timeout:18];(' +
    'nwr["man_made"="lighthouse"](' + box + ');' +
    'nwr["building"="lighthouse"](' + box + ');' +
    'nwr["seamark:type"="light_major"](' + box + ');' +
    ');out center tags 1800;';
}

async function fetchOverpass(query) {
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
  let lastError = null;
  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 32000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: 'data=' + encodeURIComponent(query), signal: controller.signal
      });
      if (!response.ok) throw new Error('Overpass HTTP ' + response.status);
      const data = await response.json();
      if (!data || !Array.isArray(data.elements)) throw new Error('Invalid Overpass response');
      return data.elements;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('Overpass lighthouse source unavailable');
}

function mergeElements(state, elements) {
  for (const element of elements || []) {
    const feature = normalizeLighthouseElement(element);
    if (feature) state.featureCache.set(feature.id, feature);
  }
  const features = [...state.featureCache.values()].slice(0, MAX_GLOBAL_FEATURES);
  state.collection = { type: 'FeatureCollection', features };
  state.stats.sourceFeatures = features.length;
  state.stats.measuredHeights = features.filter(f => f.properties.measuredHeight).length;
  const source = state.map.getSource(SOURCE_ID);
  if (source) source.setData(state.collection);
}

function addMarkerLayer(map) {
  if (!map.getSource(SOURCE_ID)) map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY, tolerance: 0.35, attribution: '© OpenStreetMap contributors · Lighthouse locations (ODbL)' });
  if (!map.getLayer(MARKER_LAYER_ID)) {
    const style = map.getStyle && map.getStyle();
    const before = style && Array.isArray(style.layers)
      ? (style.layers.find(layer => layer.type === 'symbol') || {}).id : undefined;
    map.addLayer({
      id: MARKER_LAYER_ID, type: 'circle', source: SOURCE_ID,
      minzoom: 0, maxzoom: MIN_MODEL_ZOOM + 0.55,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 1.4, 5, 2.5, 9.5, 4.1],
        'circle-color': ['coalesce', ['get', 'markerColor'], '#b64436'],
        'circle-stroke-color': '#f2ead9', 'circle-stroke-width': 0.75, 'circle-opacity': 0.94
      }
    }, before);
  }
}

function mapMatrix(map, THREE, coordinate, ground) {
  let elevation = ground;
  try {
    if (typeof map.queryTerrainElevation === 'function') {
      const sampled = map.queryTerrainElevation(coordinate, { exaggerated: false });
      if (sampled !== null && sampled !== undefined && Number.isFinite(Number(sampled))) {
        elevation = Number(sampled);
      }
    }
  } catch (_) {}
  return modelMatrixFor(map, THREE, coordinate, Number.isFinite(elevation) ? elevation : 0);
}

function withinBounds(bounds, coordinate) {
  try { return bounds && bounds.contains(coordinate); } catch (_) { return false; }
}

function modelCandidates(state) {
  const map = state.map;
  if (Number(map.getZoom && map.getZoom() || 0) < MIN_MODEL_ZOOM) return [];
  const bounds = map.getBounds && map.getBounds();
  if (!bounds) return [];
  const center = map.getCenter && map.getCenter();
  const list = [];
  for (const feature of state.collection.features) {
    const coordinate = feature.geometry.coordinates;
    if (!withinBounds(bounds, coordinate)) continue;
    const latScale = Math.max(0.12, Math.cos(Number(coordinate[1]) * RAD));
    const dx = (Number(coordinate[0]) - Number(center && center.lng || 0)) * 111320 * latScale;
    const dy = (Number(coordinate[1]) - Number(center && center.lat || 0)) * 110540;
    list.push({ feature, distance: dx * dx + dy * dy });
  }
  list.sort((a, b) => a.distance - b.distance);
  return list.slice(0, MAX_RENDERED_MODELS).map(item => item.feature);
}

function rebuildModels(state) {
  if (!state.THREE || !state.scene || state.dead) return;
  const selected = modelCandidates(state);
  const signature = selected.map(f => f.id).join('|');
  if (signature === state.modelSignature) return;
  for (const item of state.models) {
    state.scene.remove(item.root);
    disposeObject(item.root);
  }
  state.models = [];
  state.modelSignature = signature;
  for (const feature of selected) {
    try {
      const item = createLighthouseModel(state.THREE, feature);
      state.scene.add(item.root);
      state.models.push(item);
    } catch (error) {
      console.warn('BridgePoint lighthouse model skipped', feature.id, error);
    }
  }
  state.stats.renderedModels = state.models.length;
}

function installModelLayer(state) {
  const map = state.map;
  if (map.getLayer(MODEL_LAYER_ID)) return true;
  if (state.layerInstalling) return false;
  state.layerInstalling = true;
  const THREE = state.THREE;
  const layer = {
    id: MODEL_LAYER_ID, type: 'custom', renderingMode: '3d',
    onAdd(mapRef, gl) {
      if (state.renderer) return;
      const renderer = new THREE.WebGLRenderer({
        canvas: mapRef.getCanvas(), context: gl, antialias: false,
        alpha: true, powerPreference: 'low-power'
      });
      renderer.autoClear = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      state.renderer = renderer;
      state.camera = new THREE.Camera();
      state.scene = new THREE.Scene();
      state.scene.add(new THREE.AmbientLight(0xffffff, 1.25));
      const key = new THREE.DirectionalLight(0xfff3dc, 1.25);
      key.position.set(-0.6, 1.4, 0.8);
      state.scene.add(key);
      state.stats.layerReady = true;
      rebuildModels(state);
    },
    render(gl, args) {
      if (!state.renderer || !state.scene || !state.camera) return;
      const raw = args && (
        (args.defaultProjectionData && args.defaultProjectionData.mainMatrix) ||
        args.modelViewProjectionMatrix
      );
      if (!raw || raw.length < 16) return;
      const projection = new THREE.Matrix4().fromArray(raw);
      const now = Date.now();
      let anyNight = false;
      const zoom = Number(map.getZoom && map.getZoom() || 0);
      for (const item of state.models) item.root.visible = false;
      if (zoom >= MIN_MODEL_ZOOM) {
        for (const item of state.models) {
          if (now - item.nightCheckedAt > 30000) {
            item.night = isDarkAt(item.coordinate[1], item.coordinate[0], new Date(now));
            item.nightCheckedAt = now;
            item.lampMaterial.emissiveIntensity = item.night ? 2.7 : 0.72;
          }
          item.beamGroup.visible = item.night;
          if (item.night) {
            item.beamGroup.rotation.y = ((now / 1000) % item.periodSec) / item.periodSec * TAU;
            anyNight = true;
          }
          const matrix = mapMatrix(map, THREE, item.coordinate, item.groundElevationM);
          if (!matrix) continue;
          item.root.visible = true;
          state.camera.projectionMatrix.copy(projection).multiply(matrix);
          try {
            state.renderer.resetState();
            state.renderer.render(state.scene, state.camera);
          } catch (error) {
            if (!state.renderWarned) {
              state.renderWarned = true;
              console.warn('BridgePoint lighthouse draw', error);
            }
          } finally {
            item.root.visible = false;
          }
        }
      }
      if (anyNight && map.triggerRepaint && !state.animationTimer && !document.hidden) {
        state.animationTimer = setTimeout(() => {
          state.animationTimer = 0;
          if (!state.dead && !document.hidden) map.triggerRepaint();
        }, 50);
      }
    },
    onRemove() {
      try { state.renderer && state.renderer.dispose(); } catch (_) {}
      state.renderer = null; state.camera = null; state.scene = null;
      state.stats.layerReady = false; state.layerInstalling = false;
    }
  };
  try {
    map.addLayer(layer);
    state.layerInstalling = false;
    return true;
  } catch (error) {
    state.layerInstalling = false;
    console.warn('BridgePoint lighthouse 3D layer could not attach', error);
    return false;
  }
}

function scheduleRefresh(state) {
  if (state.dead || state.refreshTimer) return;
  state.refreshTimer = setTimeout(() => {
    state.refreshTimer = 0;
    try {
      if (state.map.getSource(SOURCE_ID) && state.collection.features.length) rebuildModels(state);
      if (state.map.getZoom() >= MIN_MODEL_ZOOM && state.models.length &&
          state.map.triggerRepaint) state.map.triggerRepaint();
    } catch (error) {
      console.warn('BridgePoint lighthouse refresh', error);
    }
  }, 140);
}

async function loadGlobalData(state) {
  if (state.globalLoading || state.globalLoaded || state.dead) return;
  state.globalLoading = true;
  state.status = 'loading-global-openstreetmap';
  try {
    const elements = await fetchOverpass(globalOverpassQuery());
    if (state.dead) return;
    mergeElements(state, elements);
    state.globalLoaded = true;
    state.status = 'global-openstreetmap-ready';
    rebuildModels(state);
  } catch (error) {
    if (!state.dead) {
      state.status = 'global-source-unavailable';
      state.stats.lastError = String(error && error.message || error);
      console.warn('BridgePoint global lighthouse source unavailable', error);
    }
  } finally {
    state.globalLoading = false;
  }
}

async function loadViewportData(state) {
  if (state.dead || state.globalLoaded || state.globalLoading || state.viewportLoading) return;
  if (Number(state.map.getZoom()) < 4.5) return;
  state.viewportLoading = true;
  try {
    const elements = await fetchOverpass(viewportOverpassQuery(state.map.getBounds()));
    if (state.dead) return;
    mergeElements(state, elements);
    state.status = 'viewport-openstreetmap-ready';
    rebuildModels(state);
  } catch (error) {
    if (!state.dead) {
      state.stats.lastError = String(error && error.message || error);
      state.status = 'viewport-source-unavailable';
    }
  } finally {
    state.viewportLoading = false;
  }
}

function install(map, state) {
  if (!map || state.installed || !map.getStyle || !map.getStyle()) return;
  state.installed = true;
  try {
    addMarkerLayer(map);
    state.stats.markerLayerReady = !!map.getLayer(MARKER_LAYER_ID);
  } catch (error) {
    state.installed = false;
    state.stats.lastError = String(error && error.message || error);
    console.warn('BridgePoint lighthouse markers could not attach', error);
    return;
  }
  loadThree().then(THREE => {
    if (state.dead) return;
    state.THREE = THREE;
    installModelLayer(state);
    rebuildModels(state);
    state.status = state.globalLoaded ? 'ready' : '3d-renderer-ready-loading-data';
  }).catch(error => {
    state.status = 'three-unavailable';
    state.stats.lastError = String(error && error.message || error);
    console.warn('BridgePoint lighthouse Three.js module unavailable', error);
  });
  void loadGlobalData(state);
  map.on('moveend', () => {
    scheduleRefresh(state);
    if (!state.globalLoaded) void loadViewportData(state);
  });
  map.on('zoomend', () => scheduleRefresh(state));
  map.on('idle', () => {
    if (!state.globalLoaded && !state.globalLoading) void loadViewportData(state);
  });
}

export function initLighthouseRenderer(target) {
  const map = target && (target.map || target);
  if (!map || typeof map.getBounds !== 'function' || typeof map.addSource !== 'function') return null;
  const existing = MAP_STATES.get(map);
  if (existing) return existing.api;
  const state = {
    map, installed: false, dead: false, layerInstalling: false,
    globalLoading: false, globalLoaded: false, viewportLoading: false,
    refreshTimer: 0, animationTimer: 0, THREE: null, scene: null, camera: null, renderer: null,
    featureCache: new Map(), collection: EMPTY, models: [], modelSignature: '',
    status: 'initializing',
    stats: { version: VERSION, sourceFeatures: 0, renderedModels: 0,
      measuredHeights: 0, markerLayerReady: false, layerReady: false, lastError: null },
    renderWarned: false
  };
  const api = {
    version: VERSION,
    get status() { return state.status; },
    get stats() { return Object.assign({}, state.stats); },
    get features() { return state.collection.features.length; },
    refresh() {
      state.globalLoaded = false;
      state.globalLoading = false;
      void loadGlobalData(state);
    },
    destroy() {
      state.dead = true;
      if (state.refreshTimer) clearTimeout(state.refreshTimer);
      if (state.animationTimer) clearTimeout(state.animationTimer);
      for (const item of state.models) {
        if (state.scene) state.scene.remove(item.root);
        disposeObject(item.root);
      }
      state.models = [];
    }
  };
  state.api = api;
  MAP_STATES.set(map, state);
  window.__BP_LIGHTHOUSES_V1__ = api;
  const ready = () => install(map, state);
  map.on('style.load', ready);
  map.on('load', ready);
  if (map.isStyleLoaded && map.isStyleLoaded()) ready();
  state.status = 'waiting-for-map-style';
  return api;
}
