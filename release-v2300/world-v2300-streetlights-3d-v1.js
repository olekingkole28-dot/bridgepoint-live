const VERSION = 1;
const SOURCE_ID = 'bp-global-streetlights-source-v1';
const QUERY_POLES = 'bp-global-streetlights-query-poles-v1';
const QUERY_LAMPS = 'bp-global-streetlights-query-lamps-v1';
const LAYER_ID = 'bp-global-streetlights-3d-v1';
const STREETLIGHT_TILE_URL = 'https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-public-streetlight-tile-v5937';
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
  return { height: 6.5, measured: false, field: 'visual-fallback' };
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
  return angle === null ? 0 : normalizeDegrees(angle);
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
function collectStreetlightRecords(map) {
  const query = layer => {
    try { return map.querySourceFeatures(SOURCE_ID, { sourceLayer: layer }) || []; }
    catch (_) { return []; }
  };
  const poles = uniqueStreetlightFeatures(query('streetlight_poles'));
  const lamps = uniqueStreetlightFeatures(query('streetlight_lamps'));
  const polesById = new Map();
  for (const pole of poles) {
    const id = featureId(pole);
    if (id) polesById.set(id, pole);
  }
  const output = [], consumed = new Set();
  for (const lamp of lamps) {
    const id = featureId(lamp);
    const pole = id ? polesById.get(id) : null;
    const record = makeRecord(lamp, pole);
    if (!record) continue;
    output.push(record);
    if (pole) consumed.add(recordKey(pole, featureCoordinate(pole)));
  }
  for (const pole of poles) {
    const key = recordKey(pole, featureCoordinate(pole));
    if (consumed.has(key)) continue;
    const record = makeRecord(pole);
    if (record) output.push(record);
  }
  const unique = new Map();
  for (const record of output) {
    if (!record.key) continue;
    if (!unique.has(record.key)) unique.set(record.key, record);
  }
  const max = window.innerWidth <= 700 ? MAX_FEATURES_MOBILE : MAX_FEATURES_DESKTOP;
  return [...unique.values()].slice(0, max);
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
function anchorFor(coordinate) {
  return [Math.round(coordinate[0] * 2000) / 2000, Math.round(coordinate[1] * 2000) / 2000];
}
function localOffset(anchor, coordinate) {
  const east = (coordinate[0] - anchor[0]) * 111320 * Math.max(0.08, Math.cos(anchor[1] * RAD));
  const north = (coordinate[1] - anchor[1]) * 110540;
  return [east, -north];
}
function createLampGeometry(THREE) {
  const shaft = new THREE.CylinderGeometry(0.055, 0.105, 1, 12, 1, false);
  shaft.translate(0, 0.5, 0);
  const base = new THREE.CylinderGeometry(0.13, 0.16, 0.18, 14, 1, false);
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.03, 0, 0), new THREE.Vector3(0.14, 0.10, 0),
    new THREE.Vector3(0.42, 0.13, 0), new THREE.Vector3(0.78, 0.075, 0),
    new THREE.Vector3(1.04, 0.035, 0)
  ]);
  const arm = new THREE.TubeGeometry(armCurve, 18, 0.031, 8, false);
  const braceCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.04, -0.54, 0), new THREE.Vector3(0.20, -0.36, 0),
    new THREE.Vector3(0.47, -0.19, 0), new THREE.Vector3(0.88, -0.075, 0)
  ]);
  const brace = new THREE.TubeGeometry(braceCurve, 12, 0.018, 7, false);
  const shape = new THREE.Shape();
  const w = 0.37, h = 0.085, r = 0.045;
  shape.moveTo(-w + r, -h); shape.lineTo(w - r, -h); shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r); shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h); shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r); shape.quadraticCurveTo(-w, -h, -w + r, -h);
  const housing = new THREE.ExtrudeGeometry(shape, { depth: 0.27, bevelEnabled: true, bevelSegments: 3,
    steps: 1, bevelSize: 0.018, bevelThickness: 0.014, curveSegments: 8 });
  housing.translate(0, 0, -0.135);
  const lens = new THREE.BoxGeometry(0.52, 0.014, 0.19);
  const beam = new THREE.ConeGeometry(1, 1, 20, 1, true);
  const pool = new THREE.CircleGeometry(1, 28);
  pool.rotateX(-Math.PI / 2);
  const photocell = new THREE.SphereGeometry(0.038, 10, 7);
  return { shaft, base, arm, brace, housing, lens, beam, pool, photocell };
}
function createMaterials(THREE) {
  const steel = new THREE.MeshStandardMaterial({ color: 0x89969e, roughness: 0.34, metalness: 0.78, side: THREE.DoubleSide });
  const castMetal = new THREE.MeshStandardMaterial({ color: 0x6c777d, roughness: 0.42, metalness: 0.72, side: THREE.DoubleSide });
  const housing = new THREE.MeshStandardMaterial({ color: 0xc3cbd0, roughness: 0.38, metalness: 0.58, side: THREE.DoubleSide });
  const lensDay = new THREE.MeshStandardMaterial({ color: 0x82877f, roughness: 0.42, metalness: 0.05, side: THREE.DoubleSide });
  const photocell = new THREE.MeshStandardMaterial({ color: 0x202c31, roughness: 0.52, metalness: 0.2, side: THREE.DoubleSide });
  const lensNight = new THREE.MeshStandardMaterial({ color: 0xffe6af, emissive: 0xffb85c, emissiveIntensity: 4.2,
    roughness: 0.22, metalness: 0, side: THREE.DoubleSide, toneMapped: false });
  const beam = new THREE.MeshBasicMaterial({ color: 0xffd38a, transparent: true, opacity: 0.065,
    depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false });
  const groundPool = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { uColor: { value: new THREE.Color(0xffc978) }, uOpacity: { value: 0.23 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv;uniform vec3 uColor;uniform float uOpacity;void main(){float r=length(vUv-vec2(0.5))*2.0;float a=pow(max(0.0,1.0-r),2.35)*uOpacity;gl_FragColor=vec4(uColor,a);}'
  });
  return { steel, castMetal, housing, lensDay, photocell, lensNight, beam, groundPool };
}
function partTransform(entry, part, THREE) {
  const height = entry.height;
  let position = [0, 0, 0], scale = [1, 1, 1];
  if (part === 'base') position = [0, 0.09, 0];
  if (part === 'photocell') position = [0.82, height + 0.025, 0];
  if (part === 'shaft') scale = [0.09, height, 0.09];
  if (part === 'arm') position = [0, height - 0.16, 0];
  if (part === 'brace') position = [0, height - 0.035, 0];
  if (part === 'housing') position = [1.045, height - 0.09, 0];
  if (part === 'dayLens' || part === 'nightLens') position = [1.045, height - 0.184, 0];
  if (part === 'photocell') position = [0.82, height + 0.025, 0];
  if (part === 'beam') { position = [1.045, height * 0.49, 0]; scale = [height * 0.235, height * 0.98, height * 0.235]; }
  if (part === 'groundPool') { position = [1.045, 0.035, 0]; scale = [2.35, 1, 2.35]; }
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
    version: VERSION, map, ready: false, enabled: true, status: 'Waiting for global mapped streetlights…',
    poles: 0, measuredHeights: 0, estimatedHeights: 0, nightLit: 0, source: 'BridgePoint global source-mapped OSM streetlight inventory',
    minimumZoom: MIN_ZOOM, preciseZoom: PRECISE_MIN_ZOOM, nightThresholdSolarAltitude: NIGHT_ALTITUDE_DEGREES
  };
  window.__BP_STREETLIGHTS_3D_V1__ = state;
  let THREE = null, threePromise = null, geometries = null, materials = null;
  let renderer = null, scene = null, dataGroup = null, customLayer = null;
  let bootTimer = null, refreshTimer = null, nightTimer = null, bootAttempts = 0;
  let dead = false, lastSignature = '', listenersBound = false;
  let standardCollection = null, preciseCollections = [];
  let groundDataLayerAdded = false;

  async function loadThree() {
    if (!threePromise) threePromise = import(THREE_URL).then(module => module.default || module)
      .catch(error => { threePromise = null; throw error; });
    return threePromise;
  }
  function installSourceAndQueryLayers() {
    if (!map.isStyleLoaded?.()) return false;
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: 'vector', tiles: [STREETLIGHT_TILE_URL + '?z={z}&x={x}&y={y}&v=5937'],
        minzoom: MIN_ZOOM, maxzoom: 22,
        attribution: 'OpenStreetMap contributors · BridgePoint mapped streetlight inventory'
      });
    }
    const before = ['gta-place-label', 'gta-water-label', 'gta-road-label']
      .find(id => map.getLayer(id));
    const queryLayers = [
      { id: QUERY_POLES, sourceLayer: 'streetlight_poles', type: 'fill-extrusion',
        paint: { 'fill-extrusion-color': '#ffffff', 'fill-extrusion-height': 0, 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0 } },
      { id: QUERY_LAMPS, sourceLayer: 'streetlight_lamps', type: 'circle',
        paint: { 'circle-color': '#ffffff', 'circle-opacity': 0, 'circle-radius': 0.1 } }
    ];
    for (const item of queryLayers) {
      if (map.getLayer(item.id)) continue;
      const layer = { id: item.id, type: item.type, source: SOURCE_ID, 'source-layer': item.sourceLayer,
        minzoom: MIN_ZOOM, maxzoom: 24, paint: item.paint };
      if (before) map.addLayer(layer, before); else map.addLayer(layer);
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
  function buildScene(records) {
    clearSceneData();
    const standardEntries = buildEntries(records);
    standardCollection = makeCollection(dataGroup, standardEntries);
    const batches = new Map();
    for (const record of records) {
      const anchor = anchorFor(record.coordinate);
      const key = anchor[0].toFixed(4) + ',' + anchor[1].toFixed(4);
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
    }
    state.poles = standardEntries.length;
    state.measuredHeights = standardEntries.filter(entry => entry.measuredHeight).length;
    state.estimatedHeights = state.poles - state.measuredHeights;
    state.ready = true;
    state.status = 'Global streetlight 3D active · ' + state.poles.toLocaleString() +
      ' mapped fixtures · ' + state.measuredHeights.toLocaleString() + ' source-height records · fixed ground anchors';
    updateNightAll(new Date());
    if (map.triggerRepaint) map.triggerRepaint();
  }
  function refresh() {
    if (dead || !THREE || !renderer || !scene || !dataGroup || !groundDataLayerAdded) return;
    const zoom = Number(map.getZoom?.() || 0);
    state.visible = zoom >= MIN_ZOOM;
    if (!state.visible) {
      dataGroup.visible = false;
      for (const collection of preciseCollections) collection.group.visible = false;
      if (map.triggerRepaint) map.triggerRepaint();
      return;
    }
    const records = collectStreetlightRecords(map);
    if (!records.length) {
      if (lastSignature) { clearSceneData(); lastSignature = ''; }
      state.status = 'Streetlight tile loaded; no mapped pole/lamp features in the current view yet.';
      return;
    }
    const signature = records.map(record => record.key + ':' + record.coordinate[0].toFixed(7) + ':' +
      record.coordinate[1].toFixed(7) + ':' + record.height.toFixed(2)).sort().join('|');
    if (signature !== lastSignature) {
      lastSignature = signature;
      buildScene(records);
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
        state.status = 'Streetlight 3D renderer ready; waiting for source-mapped tiles…';
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
    if (dead || !map.isStyleLoaded?.()) return false;
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
      if (!map.isStyleLoaded?.()) throw new Error('Map style is still loading');
      if (!install()) throw new Error('Streetlight layers are not attached yet');
      scheduleRefresh(350);
      state.status = 'Global mapped streetlight inventory connected; loading the visible area.';
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
  function onMapChange() { scheduleRefresh(260); }
  function onStyleLoad() { if (install()) scheduleRefresh(450); }
  function onVisibility() { if (!document.hidden) { updateNightAll(new Date()); scheduleRefresh(0); } }
  function onMapRemove() { dispose(); }
  function bindListeners() {
    if (listenersBound) return;
    listenersBound = true;
    map.on('sourcedata', onSourceData);
    map.on('moveend', onMapChange);
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
    clearTimeout(bootTimer); clearTimeout(refreshTimer); clearInterval(nightTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    for (const [event, handler] of [['sourcedata', onSourceData], ['moveend', onMapChange], ['zoomend', onMapChange],
      ['style.load', onStyleLoad], ['projectiontransition', onMapChange], ['remove', onMapRemove]]) {
      try { map.off(event, handler); } catch (_) {}
    }
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
      THREE = await loadThree();
      geometries = createLampGeometry(THREE);
      materials = createMaterials(THREE);
      if (!install()) throw new Error('Map style or custom layer is not ready');
      if (!ensureRenderer()) throw new Error('Map WebGL renderer is not ready yet');
      bindListeners();
      scheduleRefresh(500);
      state.status = 'Global 3D streetlights loading with fixed geographic anchors and local-sun lighting.';
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
