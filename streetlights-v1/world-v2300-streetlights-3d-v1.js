const VERSION = 4;
const SOURCE_ID = 'bp-global-streetlights-overture-source-v2';
const QUERY_LAMPS = 'bp-global-streetlights-overture-query-v2';
const DATA_QUERY_LAMPS = 'bp-global-streetlights-overture-query-data-v1';
const LAYER_ID = 'bp-global-streetlights-3d-v1';
const PMTILES_SCHEME = 'pmtiles';
const PMTILES_LIBRARY_URL = '/vendor/pmtiles.js';
const OVERTURE_BASE_PMTILES = 'pmtiles://https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/2026-10-21.0/base.pmtiles';
const PMTILES_PROTOCOL_KEY = '__BP_OVERTURE_STREETLIGHTS_PM_PROTOCOL_V2__';
const THREE_URL = '/vendor/three.module.js?v=169-local';
const MIN_ZOOM = 13;
const PRECISE_MIN_ZOOM = 16;
const MAX_FEATURES_DESKTOP = 950;
const MAX_FEATURES_MOBILE = 420;
const NIGHT_ALTITUDE_DEGREES = -6;
const RAD = Math.PI / 180;
const STATIC_PARTS = ['base', 'shaft', 'arm', 'brace', 'housing', 'dayLens'];
const NIGHT_PARTS = ['nightLens', 'beam', 'groundPool'];

const compass = { n: 0, north: 0, ne: 45, northeast: 45, e: 90, east: 90, se: 135, southeast: 135,
  s: 180, south: 180, sw: 225, southwest: 225, w: 270, west: 270, nw: 315, northwest: 315 };

export function hasLoadedStyle(map) {
  try {
    const style = map?.getStyle?.();
    // MapLibre's isStyleLoaded() also waits for every source tile to finish.
    // BridgePoint has several optional live feeds which can keep that false
    // indefinitely even after the style JSON itself is usable for addSource/addLayer.
    return !!(style && Array.isArray(style.layers) && style.layers.length > 0 &&
      map.style?._loaded !== false);
  } catch (_) {
    return false;
  }
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function normalizeDegrees(value) {
  return ((Number(value) % 360) + 360) % 360;
}
function signedDegrees(value) {
  const d = normalizeDegrees(value);
  return d > 180 ? d - 360 : d;
}
function centroidOfRing(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const originX = finiteNumber(ring[0]?.[0]), originY = finiteNumber(ring[0]?.[1]);
  if (originX === null || originY === null) return null;
  let area2 = 0, cx = 0, cy = 0, sx = 0, sy = 0, count = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    if (!Array.isArray(a) || !Array.isArray(b)) continue;
    const ax0 = finiteNumber(a[0]), ay0 = finiteNumber(a[1]);
    const bx0 = finiteNumber(b[0]), by0 = finiteNumber(b[1]);
    if (ax0 === null || ay0 === null || bx0 === null || by0 === null) continue;
    // Center the shoelace calculation near the footprint to avoid catastrophic
    // cancellation when tiny polygons use full-precision WGS84 coordinates.
    const ax = ax0 - originX, ay = ay0 - originY;
    const bx = bx0 - originX, by = by0 - originY;
    const cross = ax * by - bx * ay;
    area2 += cross;
    cx += (ax + bx) * cross;
    cy += (ay + by) * cross;
    sx += ax; sy += ay; count++;
  }
  if (Math.abs(area2) > 1e-20) return [originX + cx / (3 * area2), originY + cy / (3 * area2)];
  return count ? [originX + sx / count, originY + sy / count] : null;
}
function geometryCenter(feature) {
  const geometry = feature && feature.geometry;
  if (!geometry) return null;
  const coordinates = geometry.coordinates;
  if (geometry.type === 'Point' && Array.isArray(coordinates) && coordinates.length >= 2) {
    const lon = finiteNumber(coordinates[0]), lat = finiteNumber(coordinates[1]);
    return lon !== null && lat !== null ? [lon, lat] : null;
  }
  if (geometry.type === 'MultiPoint' && Array.isArray(coordinates) && coordinates.length) {
    const point = coordinates.find(p => Array.isArray(p) && finiteNumber(p[0]) !== null && finiteNumber(p[1]) !== null);
    return point ? [Number(point[0]), Number(point[1])] : null;
  }
  let rings = [];
  if (geometry.type === 'Polygon' && Array.isArray(coordinates)) rings = coordinates.slice(0, 1);
  if (geometry.type === 'MultiPolygon' && Array.isArray(coordinates)) {
    rings = coordinates.map(poly => Array.isArray(poly) ? poly[0] : null).filter(Boolean);
  }
  let best = null, bestArea = -1;
  for (const ring of rings) {
    const center = centroidOfRing(ring);
    if (!center) continue;
    let area = 0;
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1], b = ring[i];
      if (Array.isArray(a) && Array.isArray(b)) area += Number(a[0]) * Number(b[1]) - Number(b[0]) * Number(a[1]);
    }
    if (Math.abs(area) > bestArea) { best = center; bestArea = Math.abs(area); }
  }
  return best;
}
export function featureCoordinate(feature) {
  const p = feature && feature.properties || {};
  const lon = finiteNumber(p.longitude ?? p.lon ?? p.lng ?? p.LONGITUDE ?? p.LON ?? p.streetlight_longitude);
  const lat = finiteNumber(p.latitude ?? p.lat ?? p.LATITUDE ?? p.LAT ?? p.streetlight_latitude);
  if (lon !== null && lat !== null && Math.abs(lon) <= 180 && Math.abs(lat) <= 90) return [lon, lat];
  const center = geometryCenter(feature);
  return center && Math.abs(center[0]) <= 180 && Math.abs(center[1]) <= 90 ? center : null;
}
function parseHeight(value) {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim().toLowerCase().replace(/,/g, '');
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  let height = Number(match[0]);
  if (/\b(?:ft|feet|foot)\b/.test(raw) || raw.includes("'")) height *= 0.3048;
  return Number.isFinite(height) && height >= 3 && height <= 35 ? height : null;
}
export function streetlightHeight(properties = {}) {
  const fields = ['render_height_m', 'pole_height_m', 'height_m', 'height', 'fixture_mount_height',
    'mount_height_m', 'MOUNT_HT', 'mount_height'];
  for (const field of fields) {
    const height = parseHeight(properties[field]);
    if (height !== null) return { height, measured: true, field };
  }
  return { height: 8.0, measured: false, field: 'visual-fallback' };
}
function featureId(feature) {
  const p = feature && feature.properties || {};
  const value = p.osm_id ?? p.osm_node_id ?? p.pole_id ?? p.streetlight_id ?? p.asset_id ?? p.id ?? feature?.id;
  return value === null || value === undefined || value === '' ? null : String(value);
}
function recordKey(feature, coordinate) {
  return featureId(feature) || (coordinate ? coordinate[0].toFixed(7) + ',' + coordinate[1].toFixed(7) : null);
}
export function uniqueStreetlightFeatures(features = []) {
  const unique = new Map();
  for (const feature of features || []) {
    const coordinate = featureCoordinate(feature);
    if (!coordinate) continue;
    const key = recordKey(feature, coordinate);
    if (key && !unique.has(key)) unique.set(key, feature);
  }
  return [...unique.values()];
}
export function solarAltitude(date, longitude, latitude) {
  const time = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const lon = finiteNumber(longitude), lat = finiteNumber(latitude);
  if (!Number.isFinite(time) || lon === null || lat === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) return NaN;
  const jd = time / 86400000 + 2440587.5;
  const days = jd - 2451545.0;
  const century = days / 36525;
  const meanLongitude = normalizeDegrees(280.46646 + 36000.76983 * century + 0.0003032 * century * century);
  const meanAnomaly = normalizeDegrees(357.52911 + 35999.05029 * century - 0.0001537 * century * century) * RAD;
  const equationCenter = (1.914602 - 0.004817 * century - 0.000014 * century * century) * Math.sin(meanAnomaly) +
    (0.019993 - 0.000101 * century) * Math.sin(2 * meanAnomaly) + 0.000289 * Math.sin(3 * meanAnomaly);
  const omega = (125.04 - 1934.136 * century) * RAD;
  const apparentLongitude = (meanLongitude + equationCenter - 0.00569 - 0.00478 * Math.sin(omega)) * RAD;
  const meanObliquity = 23 + (26 + (21.448 - century * (46.815 + century * (0.00059 - century * 0.001813))) / 60) / 60;
  const obliquity = (meanObliquity + 0.00256 * Math.cos(omega)) * RAD;
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(apparentLongitude));
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(apparentLongitude), Math.cos(apparentLongitude)) / RAD;
  const gmst = normalizeDegrees(280.46061837 + 360.98564736629 * days +
    0.000387933 * century * century - century * century * century / 38710000);
  const hourAngle = signedDegrees(gmst + lon - rightAscension) * RAD;
  const latitudeRad = lat * RAD;
  const altitude = Math.asin(Math.sin(latitudeRad) * Math.sin(declination) +
    Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngle));
  return altitude / RAD;
}
export function isDarkAt(date, coordinate) {
  return Array.isArray(coordinate) && coordinate.length >= 2 &&
    solarAltitude(date, coordinate[0], coordinate[1]) <= NIGHT_ALTITUDE_DEGREES;
}
function featureBearing(properties = {}) {
  const raw = properties.bearing ?? properties.azimuth ?? properties.direction_deg ??
    properties.streetlight_direction ?? properties.direction ?? properties.orientation;
  if (typeof raw === 'string' && compass[raw.trim().toLowerCase()] !== undefined) {
    return compass[raw.trim().toLowerCase()];
  }
  const angle = finiteNumber(raw);
  // Overture/OSM street_lamp points rarely encode arm bearing. Use a consistent
  // east-west default so the cantilever is visible in the globe's common north-up view.
  return angle === null ? 90 : normalizeDegrees(angle);
}
function makeRecord(feature, poleFeature = null) {
  const chosen = poleFeature || feature;
  const coordinate = featureCoordinate(chosen) || featureCoordinate(feature);
  if (!coordinate) return null;
  const properties = { ...(poleFeature?.properties || {}), ...(feature?.properties || {}) };
  const height = streetlightHeight(properties);
  return {
    key: recordKey(chosen, coordinate) || recordKey(feature, coordinate),
    coordinate, properties, height: height.height, measuredHeight: height.measured,
    heightField: height.field, yaw: (90 - featureBearing(properties)) * RAD
  };
}
function collectStreetlightRecords(sourceMap = dataMap || map) {
    let features = [];
    try { features = sourceMap.querySourceFeatures(SOURCE_ID, { sourceLayer: 'infrastructure' }) || []; }
    catch (_) { features = []; }
    const lamps = uniqueStreetlightFeatures(features.filter(feature => {
      const properties = feature && feature.properties || {};
      return String(properties.class || '').toLowerCase() === 'street_lamp';
    }));
    const records = lamps.map(feature => makeRecord(feature)).filter(Boolean);
    const max = window.innerWidth <= 700 ? MAX_FEATURES_MOBILE : MAX_FEATURES_DESKTOP;
    return records.slice(0, max);
  }
function terrainAt(map, coordinate) {
  try {
    const elevation = map.queryTerrainElevation?.({ lng: coordinate[0], lat: coordinate[1] }, { exaggerated: true });
    return Number.isFinite(elevation) ? elevation : 0;
  } catch (_) { return 0; }
}
function modelMatrixFor(map, THREE, coordinate, altitude) {
  try {
    const model = map.transform && typeof map.transform.getMatrixForModel === 'function'
      ? map.transform.getMatrixForModel([Number(coordinate[0]), Number(coordinate[1])], Number(altitude) || 0)
      : null;
    if (model && model.length >= 16) return new THREE.Matrix4().fromArray(model);
    const MercatorCoordinate = window.maplibregl && window.maplibregl.MercatorCoordinate;
    if (!MercatorCoordinate || typeof MercatorCoordinate.fromLngLat !== 'function') return null;
    const mercator = MercatorCoordinate.fromLngLat([Number(coordinate[0]), Number(coordinate[1])], Number(altitude) || 0);
    const metres = mercator.meterInMercatorCoordinateUnits();
    if (![mercator.x, mercator.y, mercator.z, metres].every(Number.isFinite) || metres <= 0) return null;
    return new THREE.Matrix4().set(
      metres, 0, 0, mercator.x,
      0, 0, metres, mercator.y,
      0, metres, 0, mercator.z,
      0, 0, 0, 1
    );
  } catch (_) { return null; }
}
const PRECISION_ANCHOR_DEGREES = 0.005; // ~550 m cells: far fewer local draw batches than 55 m cells.
function anchorFor(coordinate) {
  const step = PRECISION_ANCHOR_DEGREES;
  return [Math.round(coordinate[0] / step) * step, Math.round(coordinate[1] / step) * step];
}
function localOffset(anchor, coordinate) {
  const deltaLon = ((coordinate[0] - anchor[0] + 540) % 360) - 180;
  const east = deltaLon * 111320 * Math.max(0.08, Math.cos(anchor[1] * RAD));
  const north = (coordinate[1] - anchor[1]) * 110540;
  return [east, -north];
}
function createLampGeometry(THREE) {
  const shaft = new THREE.CylinderGeometry(0.055, 0.105, 1, 12, 1, false);
  shaft.translate(0, 0.5, 0);
  const base = new THREE.CylinderGeometry(0.13, 0.16, 0.18, 14, 1, false);
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.03, 0, 0), new THREE.Vector3(0.22, 0.15, 0),
    new THREE.Vector3(0.78, 0.20, 0), new THREE.Vector3(1.32, 0.16, 0),
    new THREE.Vector3(1.86, 0.095, 0)
  ]);
  const arm = new THREE.TubeGeometry(armCurve, 22, 0.045, 8, false);
  const braceCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.04, -0.56, 0), new THREE.Vector3(0.30, -0.39, 0),
    new THREE.Vector3(0.94, -0.20, 0), new THREE.Vector3(1.68, -0.07, 0)
  ]);
  const brace = new THREE.TubeGeometry(braceCurve, 16, 0.024, 7, false);
  const shape = new THREE.Shape();
  const w = 0.46, h = 0.105, r = 0.055;
  shape.moveTo(-w + r, -h); shape.lineTo(w - r, -h); shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r); shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h); shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r); shape.quadraticCurveTo(-w, -h, -w + r, -h);
  const housing = new THREE.ExtrudeGeometry(shape, { depth: 0.27, bevelEnabled: true, bevelSegments: 3,
    steps: 1, bevelSize: 0.018, bevelThickness: 0.014, curveSegments: 8 });
  housing.translate(0, 0, -0.135);
  const lens = new THREE.BoxGeometry(0.86, 0.045, 0.28);
  const beam = new THREE.ConeGeometry(1, 1, 20, 1, true);
  const pool = new THREE.CircleGeometry(1, 28);
  pool.rotateX(-Math.PI / 2);
  const photocell = new THREE.SphereGeometry(0.038, 10, 7);
  return { shaft, base, arm, brace, housing, lens, beam, pool, photocell };
}
function createMaterials(THREE) {
  const steel = new THREE.MeshStandardMaterial({ color: 0xaeb8bf, emissive: 0x35404a, emissiveIntensity: 0.18, roughness: 0.4, metalness: 0.48, side: THREE.DoubleSide });
  const castMetal = new THREE.MeshStandardMaterial({ color: 0x6c777d, roughness: 0.42, metalness: 0.72, side: THREE.DoubleSide });
  const housing = new THREE.MeshStandardMaterial({ color: 0xc3cbd0, roughness: 0.38, metalness: 0.58, side: THREE.DoubleSide });
  const lensDay = new THREE.MeshStandardMaterial({ color: 0x82877f, roughness: 0.42, metalness: 0.05, side: THREE.DoubleSide });
  const photocell = new THREE.MeshStandardMaterial({ color: 0x202c31, roughness: 0.52, metalness: 0.2, side: THREE.DoubleSide });
  const lensNight = new THREE.MeshStandardMaterial({ color: 0xffe6af, emissive: 0xffb85c, emissiveIntensity: 4.2,
    roughness: 0.22, metalness: 0, side: THREE.DoubleSide, toneMapped: false });
  const beam = new THREE.MeshBasicMaterial({ color: 0xffd38a, transparent: true, opacity: 0.16,
    depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, toneMapped: false });
  const groundPool = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { uColor: { value: new THREE.Color(0xffc978) }, uOpacity: { value: 0.16 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv;uniform vec3 uColor;uniform float uOpacity;void main(){float r=length(vUv-vec2(0.5))*2.0;float a=pow(max(0.0,1.0-r),2.35)*uOpacity;gl_FragColor=vec4(uColor,a);}'
  });
  return { steel, castMetal, housing, lensDay, photocell, lensNight, beam, groundPool };
}
function partTransform(entry, part, THREE) {
  const height = entry.height;
  let position = [0, 0, 0], scale = [1, 1, 1];
  if (part === 'base') position = [0, 0.09, 0];
  if (part === 'photocell') position = [1.50, height + 0.025, 0];
  if (part === 'shaft') scale = [1, height, 1];
  if (part === 'arm') position = [0, height - 0.16, 0];
  if (part === 'brace') position = [0, height - 0.035, 0];
  if (part === 'housing') position = [1.86, height - 0.09, 0];
  if (part === 'dayLens' || part === 'nightLens') position = [1.86, height - 0.184, 0];
  if (part === 'photocell') position = [0.82, height + 0.025, 0];
  if (part === 'beam') { position = [1.86, height * 0.5, 0]; scale = [height * 0.28, height * 0.84, height * 0.28]; }
  if (part === 'groundPool') { position = [1.86, 0.035, 0]; scale = [1.25, 1, 1.25]; }
  const matrix = entry.baseMatrix.clone();
  matrix.multiply(new THREE.Matrix4().makeRotationY(entry.yaw));
  matrix.multiply(new THREE.Matrix4().makeTranslation(position[0], position[1], position[2]));
  matrix.multiply(new THREE.Matrix4().makeScale(scale[0], scale[1], scale[2]));
  return matrix;
}
function createInstanced(parent, geometry, material, count, THREE) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
  mesh.count = count;
  mesh.frustumCulled = false;
  if (mesh.instanceMatrix && THREE.DynamicDrawUsage) mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  parent.add(mesh);
  return mesh;
}
function clearChildren(group) {
  if (!group) return;
  for (const child of [...group.children]) group.remove(child);
}
export function initStreetlightRenderer(target) {
  const map = target && (target.map || target);
  if (!map || typeof map.getBounds !== 'function' || typeof map.addSource !== 'function') return null;
  if (window.__BP_STREETLIGHTS_3D_V1__?.map === map) return window.__BP_STREETLIGHTS_3D_V1__;

  const state = {
    version: VERSION, map, ready: false, enabled: true, status: 'Waiting for Overture global streetlight tiles…',
    poles: 0, measuredHeights: 0, estimatedHeights: 0, nightLit: 0,
    source: 'Overture Base Infrastructure 2026-10-21.0 · OSM street_lamp',
    sourceRelease: '2026-10-21.0', attribution: '© OpenStreetMap contributors · © Overture Maps Foundation · ODbL-1.0',
    minimumZoom: MIN_ZOOM, preciseZoom: PRECISE_MIN_ZOOM, nightThresholdSolarAltitude: NIGHT_ALTITUDE_DEGREES
  };
  window.__BP_STREETLIGHTS_3D_V1__ = state;
  let THREE = null, threePromise = null, geometries = null, materials = null;
  let renderer = null, scene = null, dataGroup = null, customLayer = null;
  let bootTimer = null, refreshTimer = null, nightTimer = null, bootAttempts = 0;
  let dead = false, lastSignature = '', lastPrecisionMode = null, listenersBound = false;
  let standardCollection = null, preciseCollections = [];
  let groundDataLayerAdded = false;
  // The production globe has many independent style/rendering systems and may
  // not schedule PMTiles vector tiles for late-added sources. A tiny, invisible
  // MapLibre data map reliably streams the same viewport tiles; all 3D geometry
  // remains on the user's real globe and uses its terrain and projection matrix.
  let dataMap = null, dataMapContainer = null, dataMapLoadPromise = null;
  let dataMapReady = false, dataProjection = null, syncTimer = null;

  async function loadThree() {
    if (!threePromise) threePromise = import(THREE_URL).then(module => module.default || module)
      .catch(error => { threePromise = null; throw error; });
    return threePromise;
  }
  async function ensurePmtilesProtocol() {
    if (window[PMTILES_PROTOCOL_KEY]) return window[PMTILES_PROTOCOL_KEY];
    const maplibre = window.maplibregl;
    if (!maplibre || typeof maplibre.addProtocol !== 'function') {
      throw new Error('MapLibre custom-protocol support is not available');
    }
    // BridgePoint already ships PMTiles locally for its other vector-tile feeds.
    // Reuse the shared protocol; never make the streetlight layer depend on a
    // second ESM CDN request or register a competing handler for the same scheme.
    let pmtiles = window.pmtiles;
    if (!pmtiles?.Protocol || !pmtiles?.PMTiles) {
      let promise = window.__BP_PMTILES_LIBRARY_PROMISE__;
      if (!promise) {
        promise = new Promise((resolve, reject) => {
          const existing = document.querySelector('script[data-bp-pmtiles-runtime],script[src="/vendor/pmtiles.js"]');
          if (existing) {
            existing.addEventListener('load', () => resolve(window.pmtiles), { once: true });
            existing.addEventListener('error', () => reject(new Error('BridgePoint PMTiles runtime failed to load')), { once: true });
            return;
          }
          const script = document.createElement('script');
          script.async = true;
          script.src = PMTILES_LIBRARY_URL;
          script.dataset.bpPmtilesRuntime = 'true';
          script.onload = () => resolve(window.pmtiles);
          script.onerror = () => reject(new Error('BridgePoint local PMTiles runtime failed to load'));
          document.head.appendChild(script);
        }).then(value => {
          if (!value?.Protocol || !value?.PMTiles) throw new Error('Local PMTiles runtime is incomplete');
          return value;
        }).catch(error => {
          window.__BP_PMTILES_LIBRARY_PROMISE__ = null;
          throw error;
        });
        window.__BP_PMTILES_LIBRARY_PROMISE__ = promise;
      }
      pmtiles = await promise;
    }
    // Let another BridgePoint PMTiles loader that received the same script
    // load event finish registering its shared handler before registering one.
    await new Promise(resolve => setTimeout(resolve, 0));
    let protocol = window.__BP_TRANSPORTATION_PMTILES_PROTOCOL__ ||
      window.__BP_UTILITY_PMTILES_PROTOCOL__ || window[PMTILES_PROTOCOL_KEY];
    if (!protocol) {
      protocol = new pmtiles.Protocol();
      maplibre.addProtocol(PMTILES_SCHEME, protocol.tile);
    }
    window[PMTILES_PROTOCOL_KEY] = protocol;
    // Publish the same instance under the existing shared key so any later
    // BridgePoint PMTiles consumer reuses this exact registered handler.
    window.__BP_TRANSPORTATION_PMTILES_PROTOCOL__ = protocol;
    return protocol;
  }
  async function ensureDataMap() {
    if (dataMap && dataMapReady && hasLoadedStyle(dataMap)) return dataMap;
    if (dataMapLoadPromise) return dataMapLoadPromise;
    const maplibre = window.maplibregl;
    if (!maplibre?.Map || typeof maplibre.addProtocol !== 'function') {
      throw new Error('BridgePoint MapLibre data-map runtime is unavailable');
    }
    const center = map.getCenter?.() || { lng: 0, lat: 18 };
    const width = Math.max(256, Math.min(2048,
      Math.round(map.getContainer?.().clientWidth || window.innerWidth || 1024)));
    const height = Math.max(256, Math.min(1600,
      Math.round(map.getContainer?.().clientHeight || window.innerHeight || 768)));
    dataMapContainer = document.createElement('div');
    dataMapContainer.setAttribute('aria-hidden', 'true');
    dataMapContainer.setAttribute('data-bp-streetlight-tile-stream', 'true');
    dataMapContainer.style.cssText = [
      'position:fixed', 'left:-12000px', 'top:0', 'z-index:-1',
      'opacity:0', 'pointer-events:none', 'overflow:hidden',
      'width:' + width + 'px', 'height:' + height + 'px'
    ].join(';');
    document.body.appendChild(dataMapContainer);
    const projectionType = map.getProjection?.()?.type || 'globe';
    dataProjection = projectionType;
    dataMap = new maplibre.Map({
      container: dataMapContainer,
      style: {
        version: 8,
        sources: {},
        layers: [{
          id: 'bp-streetlight-data-background-v1',
          type: 'background',
          paint: { 'background-color': '#000000' }
        }]
      },
      center: [Number(center.lng) || 0, Number(center.lat) || 0],
      zoom: Math.max(0, Math.min(22, Number(map.getZoom?.() || 0))),
      pitch: Math.max(0, Math.min(85, Number(map.getPitch?.() || 0))),
      bearing: Number(map.getBearing?.() || 0),
      projection: { type: projectionType },
      minZoom: 0,
      maxZoom: 22,
      maxPitch: 85,
      renderWorldCopies: false,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      antialias: false,
      preserveDrawingBuffer: false
    });
    dataMap.on('error', event => {
      const message = String(event?.error?.message || event?.error || 'unknown tile error');
      if (event?.sourceId === SOURCE_ID) state.dataMapLastError = message;
    });
    dataMapLoadPromise = new Promise((resolve, reject) => {
      let settled = false;
      const finish = (loaded, error = null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error); else resolve(loaded);
      };
      const timer = setTimeout(() => {
        finish(hasLoadedStyle(dataMap),
          hasLoadedStyle(dataMap) ? null : new Error('Streetlight data-map style did not load'));
      }, 15000);
      if (hasLoadedStyle(dataMap)) finish(true);
      else dataMap.once('load', () => finish(true));
    }).then(loaded => {
      dataMapReady = !!loaded && hasLoadedStyle(dataMap);
      if (!dataMapReady) throw new Error('Streetlight data-map style did not become ready');
      dataMap.on('sourcedata', onSourceData);
      dataMap.on('moveend', () => scheduleRefresh(180));
      syncDataMap();
      return dataMap;
    }).finally(() => { dataMapLoadPromise = null; });
    return dataMapLoadPromise;
  }
  function syncDataMap() {
    if (!dataMap || !dataMapReady || dead) return;
    try {
      const center = map.getCenter?.();
      if (!center) return;
      const nextProjection = map.getProjection?.()?.type || 'globe';
      if (nextProjection !== dataProjection) {
        dataMap.setProjection?.({ type: nextProjection });
        dataProjection = nextProjection;
      }
      const width = Math.max(256, Math.round(map.getContainer?.().clientWidth || window.innerWidth || 1024));
      const height = Math.max(256, Math.round(map.getContainer?.().clientHeight || window.innerHeight || 768));
      if (dataMapContainer &&
          (dataMapContainer.clientWidth !== width || dataMapContainer.clientHeight !== height)) {
        dataMapContainer.style.width = width + 'px';
        dataMapContainer.style.height = height + 'px';
        dataMap.resize();
      }
      dataMap.jumpTo({
        center: [Number(center.lng), Number(center.lat)],
        zoom: Math.max(0, Math.min(22, Number(map.getZoom?.() || 0))),
        pitch: Math.max(0, Math.min(85, Number(map.getPitch?.() || 0))),
        bearing: Number(map.getBearing?.() || 0)
      });
    } catch (error) {
      state.dataMapLastError = String(error?.message || error);
    }
  }
  function installSourceAndQueryLayers() {
    if (!dataMap || !dataMapReady || !hasLoadedStyle(dataMap)) return false;
    if (!dataMap.getSource(SOURCE_ID)) {
      dataMap.addSource(SOURCE_ID, {
        type: 'vector', url: OVERTURE_BASE_PMTILES, minzoom: MIN_ZOOM, maxzoom: MIN_ZOOM,
        attribution: state.attribution
      });
    }
    if (!dataMap.getLayer(DATA_QUERY_LAMPS)) {
      dataMap.addLayer({
        id: DATA_QUERY_LAMPS, type: 'circle', source: SOURCE_ID, 'source-layer': 'infrastructure',
        minzoom: MIN_ZOOM, maxzoom: 24,
        filter: ['==', ['get', 'class'], 'street_lamp'],
        paint: { 'circle-color': '#fff4cf', 'circle-radius': 3, 'circle-opacity': 1 }
      });
    }
    groundDataLayerAdded = true;
    return true;
  }
  function makeCollection(parent, entries) {
    const definitions = [
      ['base', geometries.base, materials.castMetal],
      ['shaft', geometries.shaft, materials.steel],
      ['arm', geometries.arm, materials.steel],
      ['brace', geometries.brace, materials.castMetal],
      ['housing', geometries.housing, materials.housing],
      ['dayLens', geometries.lens, materials.lensDay],
      ['photocell', geometries.photocell, materials.photocell]
    ];
    const staticMeshes = {};
    for (const [key, geometry, material] of definitions) {
      const mesh = createInstanced(parent, geometry, material, entries.length, THREE);
      for (let i = 0; i < entries.length; i++) mesh.setMatrixAt(i, partTransform(entries[i], key, THREE));
      mesh.instanceMatrix.needsUpdate = true;
      staticMeshes[key] = mesh;
    }
    const nightMeshes = {
      nightLens: createInstanced(parent, geometries.lens, materials.lensNight, entries.length, THREE),
      beam: createInstanced(parent, geometries.beam, materials.beam, entries.length, THREE),
      groundPool: createInstanced(parent, geometries.pool, materials.groundPool, entries.length, THREE)
    };
    return { entries, staticMeshes, nightMeshes };
  }
  function updateNightCollection(collection, date) {
    if (!collection) return 0;
    const darkEntries = collection.entries.filter(entry => isDarkAt(date, entry.coordinate));
    for (const part of NIGHT_PARTS) {
      const mesh = collection.nightMeshes[part];
      for (let i = 0; i < darkEntries.length; i++) mesh.setMatrixAt(i, partTransform(darkEntries[i], part, THREE));
      mesh.count = darkEntries.length;
      if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
    }
    return darkEntries.length;
  }
  function updateNightAll(date = new Date()) {
    let count = updateNightCollection(standardCollection, date);
    for (const collection of preciseCollections) count += updateNightCollection(collection, date);
    state.nightLit = count;
    state.lightingUpdatedAt = date.toISOString();
    if (map.triggerRepaint) map.triggerRepaint();
  }
  function clearSceneData() {
    clearChildren(dataGroup);
    for (const collection of preciseCollections) {
      if (collection.group && scene) {
        scene.remove(collection.group);
        clearChildren(collection.group);
      }
    }
    preciseCollections = [];
    standardCollection = null;
    state.poles = 0; state.measuredHeights = 0; state.estimatedHeights = 0; state.nightLit = 0;
  }
  function buildEntries(records, localAnchor = null, anchorGround = 0) {
    const entries = [];
    for (const record of records) {
      const ground = terrainAt(map, record.coordinate);
      let baseMatrix = null;
      if (localAnchor) {
        const offset = localOffset(localAnchor, record.coordinate);
        baseMatrix = new THREE.Matrix4().makeTranslation(offset[0], ground - anchorGround, offset[1]);
      } else {
        baseMatrix = modelMatrixFor(map, THREE, record.coordinate, ground);
      }
      if (!baseMatrix) continue;
      entries.push({
        key: record.key, coordinate: record.coordinate, height: record.height, yaw: record.yaw,
        measuredHeight: record.measuredHeight, baseMatrix
      });
    }
    return entries;
  }
  function buildScene(records, precisionMode = Number(map.getZoom?.() || 0) >= PRECISE_MIN_ZOOM) {
    clearSceneData();
    let renderedEntries = [];
    if (!precisionMode) {
      // Regional zoom uses one world-coordinate instanced batch; do not also
      // construct a hidden duplicate set for the close-zoom anchor renderer.
      renderedEntries = buildEntries(records);
      standardCollection = makeCollection(dataGroup, renderedEntries);
    } else {
      // Close zoom batches share a ~550 m local origin, keeping metre-level
      // placement precision while avoiding hundreds of tiny per-block draw groups.
      const batches = new Map();
      for (const record of records) {
        const anchor = anchorFor(record.coordinate);
        const key = anchor[0].toFixed(3) + ',' + anchor[1].toFixed(3);
        let batch = batches.get(key);
        if (!batch) { batch = { anchor, records: [] }; batches.set(key, batch); }
        batch.records.push(record);
      }
      for (const batch of batches.values()) {
        const anchorGround = terrainAt(map, batch.anchor);
        const anchorMatrix = modelMatrixFor(map, THREE, batch.anchor, anchorGround);
        if (!anchorMatrix) continue;
        const entries = buildEntries(batch.records, batch.anchor, anchorGround);
        if (!entries.length) continue;
        const group = new THREE.Group();
        group.name = 'BridgePoint precision-anchored streetlights';
        group.visible = false;
        group.userData.bpAnchorMatrix = anchorMatrix;
        const collection = makeCollection(group, entries);
        collection.group = group;
        scene.add(group);
        preciseCollections.push(collection);
        renderedEntries.push(...entries);
      }
    }
    state.precisionMode = precisionMode ? 'local-batches' : 'world-batch';
    state.poles = renderedEntries.length;
    state.measuredHeights = renderedEntries.filter(entry => entry.measuredHeight).length;
    state.estimatedHeights = state.poles - state.measuredHeights;
    state.ready = true;
    state.status = 'Global streetlight 3D active · ' + state.poles.toLocaleString() +
      ' mapped fixtures · ' + state.measuredHeights.toLocaleString() + ' source-height records · fixed ground anchors';
    updateNightAll(new Date());
    if (map.triggerRepaint) map.triggerRepaint();
  }
  function refresh() {
    if (dead || !THREE || !renderer || !scene || !dataGroup || !dataMapReady || !dataMap || !groundDataLayerAdded) return;
    const zoom = Number(map.getZoom?.() || 0);
    state.visible = zoom >= MIN_ZOOM;
    if (!state.visible) {
      dataGroup.visible = false;
      for (const collection of preciseCollections) collection.group.visible = false;
      if (map.triggerRepaint) map.triggerRepaint();
      return;
    }
    const records = collectStreetlightRecords(dataMap);
    if (!records.length) {
      if (lastSignature || lastPrecisionMode !== null) {
        clearSceneData(); lastSignature = ''; lastPrecisionMode = null;
      }
      state.status = 'Overture tile loaded; no mapped street_lamp features in the current view yet.';
      return;
    }
    const precisionMode = zoom >= PRECISE_MIN_ZOOM;
    const signature = records.map(record => record.key + ':' + record.coordinate[0].toFixed(7) + ':' +
      record.coordinate[1].toFixed(7) + ':' + record.height.toFixed(2)).sort().join('|');
    if (signature !== lastSignature || precisionMode !== lastPrecisionMode) {
      lastSignature = signature;
      lastPrecisionMode = precisionMode;
      buildScene(records, precisionMode);
    } else {
      updateNightAll(new Date());
      if (map.triggerRepaint) map.triggerRepaint();
    }
    state.visible = true;
  }
  function scheduleRefresh(delay = 260) {
    if (dead) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, delay);
  }
  function ensureRenderer() {
    if (renderer && scene && dataGroup) return true;
    const registered = map.getLayer(LAYER_ID);
    const implementation = registered && (registered.implementation || registered);
    const layer = implementation || customLayer;
    if (!layer || typeof layer.onAdd !== 'function' || !THREE) return false;
    let gl = null;
    try {
      gl = (map.painter && map.painter.context && map.painter.context.gl) ||
        map.getCanvas().getContext('webgl2') || map.getCanvas().getContext('webgl');
    } catch (_) {}
    if (!gl) return false;
    try {
      layer.onAdd(map, gl);
      return !!(renderer && scene && dataGroup);
    } catch (error) {
      console.warn('BridgePoint streetlight renderer late attach failed', error);
      return false;
    }
  }
  function installCustomLayer() {
    if (map.getLayer(LAYER_ID)) return ensureRenderer();
    customLayer = {
      id: LAYER_ID, type: 'custom', renderingMode: '3d',
      onAdd: (mapRef, gl) => {
        if (renderer && scene && dataGroup) return;
        const webgl = new THREE.WebGLRenderer({
          canvas: mapRef.getCanvas(), context: gl, antialias: false, alpha: true, powerPreference: 'low-power'
        });
        webgl.autoClear = false;
        webgl.outputColorSpace = THREE.SRGBColorSpace;
        renderer = webgl;
        scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0xffffff, 1.15));
        const key = new THREE.DirectionalLight(0xfff1d8, 1.55);
        key.position.set(-0.65, -1, 1.8);
        scene.add(key);
        const fill = new THREE.HemisphereLight(0xbad8ee, 0x45413a, 0.34);
        scene.add(fill);
        dataGroup = new THREE.Group();
        customLayer.camera = new THREE.Camera();
        dataGroup.name = 'BridgePoint global streetlight models';
        scene.add(dataGroup);
        state.ready = true;
        state.status = 'Streetlight 3D renderer ready; waiting for Overture infrastructure tiles…';
      },
      render: (gl, args) => {
        if (!renderer || !scene || !dataGroup || !customLayer?.camera) return;
        const matrix = args && (args.defaultProjectionData && args.defaultProjectionData.mainMatrix ||
          args.modelViewProjectionMatrix) || args;
        if (!matrix || typeof matrix.length !== 'number' || matrix.length < 16) return;
        const projection = new THREE.Matrix4().fromArray(matrix);
        const closeZoom = Number(map.getZoom?.() || 0) >= PRECISE_MIN_ZOOM;
        const visible = Number(map.getZoom?.() || 0) >= MIN_ZOOM;
        for (const collection of preciseCollections) collection.group.visible = false;
        dataGroup.visible = visible && !closeZoom;
        customLayer.camera.projectionMatrix.copy(projection);
        try { renderer.resetState?.(); renderer.state?.reset?.(); } catch (_) {}
        renderer.render(scene, customLayer.camera);
        if (visible && closeZoom && preciseCollections.length) {
          dataGroup.visible = false;
          for (const collection of preciseCollections) {
            const anchorMatrix = collection.group.userData.bpAnchorMatrix;
            if (!anchorMatrix) continue;
            collection.group.visible = true;
            customLayer.camera.projectionMatrix.copy(projection).multiply(anchorMatrix);
            try { renderer.resetState?.(); renderer.state?.reset?.(); } catch (_) {}
            try { renderer.render(scene, customLayer.camera); }
            finally { collection.group.visible = false; }
          }
          customLayer.camera.projectionMatrix.copy(projection);
        }
      },
      onRemove: () => {
        try { renderer?.dispose(); } catch (_) {}
        clearSceneData();
        renderer = null; scene = null; dataGroup = null;
        if (customLayer) customLayer.camera = null;
      }
    };
    const before = ['gta-place-label', 'gta-water-label', 'gta-road-label'].find(id => map.getLayer(id));
    try {
      if (before) map.addLayer(customLayer, before); else map.addLayer(customLayer);
      return ensureRenderer();
    } catch (error) {
      console.warn('BridgePoint streetlight custom layer unavailable', error);
      return false;
    }
  }
  function install() {
    if (dead || !hasLoadedStyle(map)) return false;
    try {
      if (!installSourceAndQueryLayers()) return false;
      if (!customLayer || !map.getLayer(LAYER_ID)) installCustomLayer();
      else ensureRenderer();
      return true;
    } catch (error) {
      console.warn('BridgePoint global streetlight install retry', error);
      return false;
    }
  }
  function boot() {
    if (dead) return;
    bootAttempts++;
    try {
      if (!hasLoadedStyle(map)) throw new Error('Map style JSON is still loading');
      if (!install()) throw new Error('Streetlight layers are not attached yet');
      scheduleRefresh(350);
      state.status = 'Overture global streetlight inventory connected; loading the visible area.';
    } catch (error) {
      state.status = 'Streetlight 3D initializing · ' + String(error?.message || error);
      if (bootAttempts < 45) {
        clearTimeout(bootTimer);
        bootTimer = setTimeout(boot, Math.min(1200, 180 + bootAttempts * 35));
      } else console.warn('BridgePoint streetlight initialization stopped after retries', error);
    }
  }
  function onSourceData(event) {
    if (event && event.sourceId === SOURCE_ID) scheduleRefresh(180);
  }
  function onMapChange() {
    syncDataMap();
    scheduleRefresh(260);
  }
  function onStyleLoad() { if (install()) scheduleRefresh(450); }
  function onVisibility() { if (!document.hidden) { updateNightAll(new Date()); scheduleRefresh(0); } }
  function onMapRemove() { dispose(); }
  function bindListeners() {
    if (listenersBound) return;
    listenersBound = true;
    dataMap?.on('sourcedata', onSourceData);
    map.on('moveend', onMapChange);
    map.on('resize', onMapChange);
    map.on('zoomend', onMapChange);
    map.on('style.load', onStyleLoad);
    map.on('projectiontransition', onMapChange);
    map.on('remove', onMapRemove);
    document.addEventListener('visibilitychange', onVisibility);
    nightTimer = setInterval(() => updateNightAll(new Date()), 60000);
  }
  function dispose() {
    if (dead) return;
    dead = true;
    clearTimeout(bootTimer); clearTimeout(refreshTimer); clearTimeout(syncTimer); clearInterval(nightTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    for (const [event, handler] of [['moveend', onMapChange], ['resize', onMapChange], ['zoomend', onMapChange],
      ['style.load', onStyleLoad], ['projectiontransition', onMapChange], ['remove', onMapRemove]]) {
      try { map.off(event, handler); } catch (_) {}
    }
    try { dataMap?.off('sourcedata', onSourceData); dataMap?.remove(); } catch (_) {}
    dataMap = null; dataMapReady = false;
    try { dataMapContainer?.remove(); } catch (_) {}
    dataMapContainer = null;
    clearSceneData();
    try { for (const geometry of Object.values(geometries || {})) geometry?.dispose?.(); } catch (_) {}
    try { for (const material of Object.values(materials || {})) material?.dispose?.(); } catch (_) {}
    try { renderer?.dispose?.(); } catch (_) {}
    renderer = null; scene = null; dataGroup = null;
    if (window.__BP_STREETLIGHTS_3D_V1__ === state) state.disposed = true;
  }

  const maxWait = 45;
  async function initialize() {
    if (dead) return;
    try {
      await ensurePmtilesProtocol();
      await ensureDataMap();
      syncDataMap();
      THREE = await loadThree();
      geometries = createLampGeometry(THREE);
      materials = createMaterials(THREE);
      if (!install()) throw new Error('Map style or custom layer is not ready');
      if (!ensureRenderer()) throw new Error('Map WebGL renderer is not ready yet');
      bindListeners();
      scheduleRefresh(500);
      state.status = 'Global Overture 3D streetlights streaming visible Overture tiles into the anchored globe renderer.';
    } catch (error) {
      state.lastError = String(error?.message || error);
      if (bootAttempts < maxWait && !dead) {
        bootAttempts++;
        clearTimeout(bootTimer);
        bootTimer = setTimeout(initialize, Math.min(1600, 240 + bootAttempts * 40));
      } else console.warn('BridgePoint global streetlight renderer could not initialize', error);
    }
  }
  void initialize();
  return state;
}
