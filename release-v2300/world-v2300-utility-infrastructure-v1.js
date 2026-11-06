const VERSION = 8;
const POWER_SOURCE = 'bp-utility-power-v1';
const TELECOM_SOURCE = 'bp-utility-telecom-v1';
const THREE_URL = '/vendor/three.module.js?v=169-local';
const IS_SMALL_DEVICE = typeof window !== 'undefined' &&
  ((Number(window.innerWidth) || 1024) <= 820 ||
    (typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints) > 0));
const MIN_ZOOM = 13;
const PRECISE_POLE_MIN_ZOOM = 16;
const MAX_GROUND_SAMPLES = IS_SMALL_DEVICE ? 56 : 96;
const MAX_SOURCE_ZOOM = 17;
const MAX_SUPPORTS = IS_SMALL_DEVICE ? 420 : 900;
const MAX_SPANS = IS_SMALL_DEVICE ? 160 : 420;
const MAX_LINE_FEATURES = IS_SMALL_DEVICE ? 260 : 650;
const SOURCE_REFRESH_DELAY_MS = IS_SMALL_DEVICE ? 160 : 95;
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
      { exaggerated: true }
    );
    return value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null;
  } catch (_) {
    return null;
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
          const rawCount = String(properties.wires ?? properties.cables ?? '').match(/\d+/);
          const conductorCount = rawCount ? Number(rawCount[0]) : NaN;
          pairs.set(key, {
            a, b, kind,
            bearing: matches[i - 1].bearing || matches[i].bearing || 0,
            conductorCount: kind === 'telecom' ? 1 :
              (Number.isFinite(conductorCount) && conductorCount >= 1 && conductorCount <= 4 ? conductorCount : 3),
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
    poles: 0, towers: 0, powerSpans: 0, telecomSpans: 0, transformers: 0, switches: 0,
    cabinets: 0, telecomMasts: 0, measuredHeights: 0, estimatedHeights: 0,
    updatedAt: null, source: 'OpenInfraMap/OSM + Middletown municipal StreetLights GIS + USGS 3DEP ground elevations',
    municipalPoleCount: 0, telecomPoleCount: 0, guyWireCount: 0, groundSamples: 0,
    groundUnresolved: 0,
    heightNote: 'Pole positions use source coordinates. USGS 3DEP/EPQS supplies ground elevation where available. Only OSM pole height tags count as measured pole-top height; Middletown MOUNT_HT is luminaire mounting height, not total pole height. Missing pole-top heights use an 11 m visual estimate.'
  };
  window.__BP_UTILITY_INFRASTRUCTURE_V1__ = state;

  let THREE = null, threePromise = null, renderer = null, scene = null, dataGroup = null, customLayer = null;
  let dead = false, refreshTimer = null, sequence = 0, bootTries = 0, lastZoom = -1, listenersBound = false;
  let styleInitPromise = null, customLayerInstalling = false;
  let lastAssetSignature = '', groundCacheRevision = 0;
  let bodyGeometry = null, poleBaseGeometry = null, armGeometry = null, braceGeometry = null;
  let precisePoleGroups = [], standardPoleMeshes = [];
  let insulatorGeometry = null, telecomBracketGeometry = null, towerGeometry = null;
  let transformerGeometry = null, switchGeometry = null, cabinetGeometry = null, mastGeometry = null, spliceBoxGeometry = null;
  let woodMaterial = null, towerMaterial = null, metalMaterial = null, ceramicMaterial = null;
  let cableMaterial = null, telecomMaterial = null;
  let distributionCableMaterial = null, telecomCableMaterial = null, guyWireMaterial = null;
  let municipalStreetlightFeatures = [], municipalRequestKey = '', municipalFetchedAt = 0, municipalRequestPromise = null;
  let overpassFeatures = [], overpassRequestKey = '', overpassFetchedAt = 0, overpassRequestPromise = null;
  const groundElevationCache = new Map(), groundElevationPending = new Set(), groundElevationRetryAt = new Map();
  let groundLoadPromise = null;
  const powerSourceUrl = 'https://openinframap.org/map/power/{z}/{x}/{y}.pbf';
  const telecomSourceUrl = 'https://openinframap.org/map/telecoms/{z}/{x}/{y}.pbf';

  function groundKey(coordinate) {
    return Number(coordinate[0]).toFixed(7) + ',' + Number(coordinate[1]).toFixed(7);
  }

  function hasGroundElevation(coordinate) {
    const key = groundKey(coordinate);
    return groundElevationCache.has(key) || Number.isFinite(terrainAt(map, coordinate));
  }

  function localMetresPerPixel(coordinate) {
    const zoom = Math.max(0, Math.min(24, Number(map.getZoom && map.getZoom()) || 0));
    const latitudeCosine = Math.max(0.08, Math.cos(Number(coordinate[1]) * RAD));
    return 40075016.68557849 * latitudeCosine / (512 * Math.pow(2, zoom));
  }

  function minimumDisplayScale(coordinate, realDiameterMetres, targetPixels = 1.6, maxScale = 14) {
    const realDiameter = Math.max(0.04, Number(realDiameterMetres) || 0.04);
    return Math.max(1, Math.min(maxScale, localMetresPerPixel(coordinate) * targetPixels / realDiameter));
  }

  function wireRadiusFor(coordinate, baseRadius) {
    // Solid round cables retain a slightly stronger pixel floor on mobile.
    return baseRadius * minimumDisplayScale(coordinate, baseRadius * 2, 1.0, 16);
  }

  function localTerrainAt(coordinate) {
    const key = groundKey(coordinate);
    if (groundElevationCache.has(key)) return groundElevationCache.get(key);
    const terrain = terrainAt(map, coordinate);
    if (Number.isFinite(terrain)) return terrain;

    // A missing DEM sample must not suppress an otherwise mapped pole. Reuse the
    // nearest recent USGS ground sample for a short local radius while exact samples
    // continue loading; this avoids planting nearby poles at sea level on hills.
    let nearestElevation = null, nearestDistance = 251;
    for (const [sampleKey, elevation] of groundElevationCache) {
      const [lon, lat] = sampleKey.split(',').map(Number);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
      const distance = haversineMetres(coordinate, [lon, lat]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestElevation = elevation;
      }
    }
    return nearestElevation === null ? 0 : nearestElevation;
  }

  async function loadUSGS3DEPGround(assets) {
    if (groundLoadPromise) return groundLoadPromise;
    groundLoadPromise = (async () => {
      const candidates = [
        ...(assets.supports || []).map(s => s.coordinate),
        ...(assets.transformers || []).map(x => x.coordinate),
        ...(assets.switches || []).map(x => x.coordinate),
        ...(assets.cabinets || []).map(x => x.coordinate),
        ...(assets.masts || []).map(x => x.coordinate)
      ];
      const unique = new Map();
      for (const coordinate of candidates) {
        if (!Array.isArray(coordinate) || !coordinate.every(Number.isFinite)) continue;
        const [lon, lat] = coordinate;
        if (lon < -180 || lon > -50 || lat < 5 || lat > 75) continue;
        const key = groundKey(coordinate);
        // Prefer the same exaggerated DEM sample used by the visible globe.
        // Only ask EPQS for points where the active map DEM has no decoded height.
        if (groundElevationCache.has(key) || Number.isFinite(terrainAt(map, coordinate)) ||
            groundElevationPending.has(key) || (groundElevationRetryAt.get(key) || 0) > Date.now()) continue;
        unique.set(key, coordinate);
      }
      const center = map.getCenter && map.getCenter();
      const items = [...unique.entries()].sort((a, b) => {
        if (!center) return 0;
        const ca = a[1], cb = b[1];
        return haversineMetres(ca, [center.lng, center.lat]) - haversineMetres(cb, [center.lng, center.lat]);
      }).slice(0, MAX_GROUND_SAMPLES);
      if (!items.length) return false;
      let changed = 0, cursor = 0;
      const worker = async () => {
        while (cursor < items.length && !dead) {
          const [key, coordinate] = items[cursor++];
          groundElevationPending.add(key);
          let timeout = null;
          try {
            const url = 'https://epqs.nationalmap.gov/v1/json?x=' +
              encodeURIComponent(coordinate[0]) + '&y=' + encodeURIComponent(coordinate[1]) +
              '&units=Meters&wkid=4326&includeDate=false';
            const controller = new AbortController();
            timeout = setTimeout(() => controller.abort(), 4500);
            const response = await fetch(url, {
              mode: 'cors', credentials: 'omit', headers: { Accept: 'application/json' }, signal: controller.signal
            });
            if (!response.ok) throw new Error('USGS EPQS HTTP ' + response.status);
            const json = await response.json();
            const value = Number(json && json.value);
            if (Number.isFinite(value) && value > -500 && value < 9000) {
              groundElevationCache.set(key, value);
              groundCacheRevision++;
              changed++;
            } else {
              groundElevationRetryAt.set(key, Date.now() + 600000);
            }
          } catch (_) {
            groundElevationRetryAt.set(key, Date.now() + 600000);
          } finally {
            if (timeout) clearTimeout(timeout);
            groundElevationPending.delete(key);
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(8, items.length) }, worker));
      if (changed) {
        state.groundSamples = groundElevationCache.size;
        if (!dead) scheduleRefresh();
      }
      return changed > 0;
    })().finally(() => { groundLoadPromise = null; });
    return groundLoadPromise;
  }

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
    // Use the same capped solid-beam construction as the working transmission
    // infrastructure meshes. This avoids the very thin cylinder shaft disappearing
    // under mobile globe lighting, face culling, or low-resolution rasterization.
    bodyGeometry = (() => {
      const vertices = [];
      pushBeam(vertices, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), .17, THREE, 8);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();
      return geometry;
    })();
    poleBaseGeometry = (() => {
      const vertices = [];
      pushBeam(vertices, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, .28, 0), .19, THREE, 8);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();
      return geometry;
    })();
    armGeometry = new THREE.BoxGeometry(1, .18, .24);
    braceGeometry = (() => {
      const vertices = [];
      pushBeam(vertices, new THREE.Vector3(-.48, 0, 0), new THREE.Vector3(-.045, -.62, 0), .04, THREE, 7);
      pushBeam(vertices, new THREE.Vector3(.48, 0, 0), new THREE.Vector3(.045, -.62, 0), .04, THREE, 7);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();
      return geometry;
    })();
    insulatorGeometry = new THREE.CylinderGeometry(.06, .075, .30, 12).translate(0, .14, 0);
    telecomBracketGeometry = new THREE.BoxGeometry(.82, .14, .22);
    towerGeometry = makeTowerGeometry(THREE);
    transformerGeometry = new THREE.CylinderGeometry(.38, .42, 1.05, 12);
    switchGeometry = new THREE.BoxGeometry(.46, .28, .34);
    cabinetGeometry = new THREE.BoxGeometry(.78, .86, .52);
    mastGeometry = new THREE.CylinderGeometry(.022, .04, 1, 8).translate(0, .5, 0);
    spliceBoxGeometry = new THREE.BoxGeometry(.48, .32, .26);

    // Globe model transforms can reverse a local face orientation during projection
    // transitions. DoubleSide keeps every solid polygon part visible at every angle.
    woodMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .82, metalness: .015, emissive: 0x2a1b0d, emissiveIntensity: .10, side: THREE.DoubleSide });
    towerMaterial = new THREE.MeshStandardMaterial({ color: 0x73818a, roughness: .58, metalness: .62, side: THREE.DoubleSide });
    metalMaterial = new THREE.MeshStandardMaterial({ color: 0xb6c1c6, roughness: .42, metalness: .58, emissive: 0x171e22, emissiveIntensity: .10, side: THREE.DoubleSide });
    ceramicMaterial = new THREE.MeshStandardMaterial({ color: 0xf0eadb, roughness: .36, metalness: .03, side: THREE.DoubleSide });
    cableMaterial = new THREE.MeshStandardMaterial({ color: 0xf3dfba, roughness: .48, metalness: .16, emissive: 0x201c16, emissiveIntensity: .08, side: THREE.DoubleSide });
    telecomMaterial = new THREE.MeshStandardMaterial({ color: 0x71818b, roughness: .72, metalness: .14, side: THREE.DoubleSide });
    distributionCableMaterial = new THREE.MeshStandardMaterial({ color: 0x303940, roughness: .82, metalness: .16, emissive: 0x0c1114, emissiveIntensity: .055, side: THREE.DoubleSide });
    telecomCableMaterial = new THREE.MeshStandardMaterial({ color: 0x202a30, roughness: .88, metalness: .02, emissive: 0x080e12, emissiveIntensity: .04, side: THREE.DoubleSide });
    guyWireMaterial = new THREE.MeshStandardMaterial({ color: 0x89949a, roughness: .66, metalness: .48, side: THREE.DoubleSide });
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
      { id: 'bp-utility-query-power-support-v2', source: POWER_SOURCE, sourceLayer: 'power_tower', type: 'circle' },
      { id: 'bp-utility-query-transformer-v2', source: POWER_SOURCE, sourceLayer: 'power_transformer', type: 'circle' },
      { id: 'bp-utility-query-switch-v2', source: POWER_SOURCE, sourceLayer: 'power_switch', type: 'circle' },
      { id: 'bp-utility-query-telecom-v1', source: TELECOM_SOURCE, sourceLayer: 'telecoms_communication_line', type: 'line' },
      { id: 'bp-utility-query-telecom-mast-v2', source: TELECOM_SOURCE, sourceLayer: 'telecoms_mast', type: 'circle' },
      { id: 'bp-utility-query-telecom-cabinet-v2', source: TELECOM_SOURCE, sourceLayer: 'telecoms_cabinet', type: 'circle' }
    ];
    for (const layer of queryLayers) {
      if (map.getLayer(layer.id)) continue;
      map.addLayer({
        id: layer.id, type: layer.type, source: layer.source, 'source-layer': layer.sourceLayer,
        minzoom: 8, maxzoom: 24,
        paint: layer.type === 'line'
          ? { 'line-color': '#ffffff', 'line-opacity': 0, 'line-width': 1 }
          : { 'circle-color': '#ffffff', 'circle-opacity': 0, 'circle-radius': 0.1 }
      });
    }
    return !!map.getSource(POWER_SOURCE) && !!map.getSource(TELECOM_SOURCE);
  }

  function clearSceneData() {
    disposeChildren(dataGroup);
    standardPoleMeshes = [];
    for (const group of precisePoleGroups) {
      try { scene && scene.remove(group); } catch (_) {}
      disposeChildren(group);
    }
    precisePoleGroups = [];
    state.poles = 0; state.towers = 0; state.powerSpans = 0; state.telecomSpans = 0;
    state.transformers = 0; state.switches = 0; state.cabinets = 0; state.telecomMasts = 0;
    state.measuredHeights = 0; state.estimatedHeights = 0;
    state.municipalPoleCount = 0; state.telecomPoleCount = 0; state.guyWireCount = 0;
    state.groundSamples = groundElevationCache.size;
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
        const projection = new THREE.Matrix4().fromArray(matrix);
        const closeZoom = Number(map.getZoom && map.getZoom() || 0) >= PRECISE_POLE_MIN_ZOOM;
        for (const mesh of standardPoleMeshes) mesh.visible = !closeZoom;
        for (const group of precisePoleGroups) group.visible = false;
        customLayer.camera.projectionMatrix.copy(projection);
        try {
          customLayer.renderer.resetState && customLayer.renderer.resetState();
          if (customLayer.renderer.state && customLayer.renderer.state.reset) customLayer.renderer.state.reset();
        } catch (_) {}
        customLayer.renderer.render(customLayer.scene, customLayer.camera);
        if (closeZoom && precisePoleGroups.length) {
          const restoreVisibility = dataGroup.visible;
          dataGroup.visible = false;
          for (const group of precisePoleGroups) {
            const anchorMatrix = group.userData && group.userData.bpAnchorMatrix;
            if (!anchorMatrix) continue;
            group.visible = true;
            customLayer.camera.projectionMatrix.copy(projection).multiply(anchorMatrix);
            try {
              customLayer.renderer.resetState && customLayer.renderer.resetState();
              if (customLayer.renderer.state && customLayer.renderer.state.reset) customLayer.renderer.state.reset();
            } catch (_) {}
            customLayer.renderer.render(customLayer.scene, customLayer.camera);
            group.visible = false;
          }
          dataGroup.visible = restoreVisibility;
          customLayer.camera.projectionMatrix.copy(projection);
        }
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
        'way["telecom"~"^(line|cable)$"](' + bbox + ');' +
        'way["communication"="cable"](' + bbox + ');' +
        'way["man_made"="cable"](' + bbox + ');' +
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
    // OpenInfraMap's power_tower layer contains both poles and lattice towers.
    // Only the single-pole type enters this renderer; transmission remains yellow elsewhere.
    const tileSupports = cacheSourceFeatures(POWER_SOURCE, 'power_tower', 'support')
      .filter(feature => String(feature.properties && feature.properties.type || '').toLowerCase() === 'pole');
    const overpassPoints = overpassFeatures.filter(feature => pointOf(feature));
    const municipalPoints = municipalStreetlightFeatures;
    const overpassPoleFeatures = overpassPoints.filter(feature => {
      const p = feature.properties || {};
      return p.power === 'pole' || (p.man_made === 'utility_pole' && p.utility !== 'street_lighting');
    });
    const supportFeatures = uniqueFeatures(
      [...tileSupports, ...overpassPoleFeatures, ...municipalPoints],
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
        feature.properties.communication === 'cable' ||
        feature.properties.aerial_line === 'telephone' ||
        feature.properties.phone === 'line' ||
        feature.properties.telephone === 'line' ||
        feature.properties.telecom === 'line' ||
        feature.properties.telecom === 'cable' ||
        feature.properties.man_made === 'cable'
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
      const utility = String(properties.utility || '').toLowerCase();
      const height = measuredHeight(properties, 11);
      const bearing = parseBearingDegrees(properties.angle ?? properties.arm_direction);
      const candidate = {
        key: featureKey(feature, 'support'), coordinate: point, type: 'pole',
        network: utility === 'telecom' || properties.telecom === 'pole' ? 'telecom' : 'power',
        height: height.metres, measuredHeight: height.measured,
        material: String(properties.material || ''), structure: String(properties.structure || ''),
        bearing, bearingDistance: bearing === null ? Infinity : 1e6,
        armLengthMetres: Number(properties.arm_length_metres) || parseArmLengthMetres(properties.arm_length),
        utilityPoleNumber: properties.utility_pole_number || properties.UTIL_PN || '',
        fieldPoleNumber: properties.field_pole_number || properties.FIELD_PN || '',
        municipalAuditDate: properties.municipal_audit_date || properties.AUDIT_DATE || '',
        fixtureMountHeight: properties.fixture_mount_height || '',
        inventoryOwnership: properties.inventory_ownership || properties.OWNERSHIP || '',
        streetlightFeed: properties.streetlight_feed || properties.FEED || '',
        municipal: !!properties.source
      };
      let near = null, nearDistance = 2.25;
      for (const existing of supports) {
        const distance = haversineMetres(existing.coordinate, point);
        if (distance < nearDistance) { near = existing; nearDistance = distance; }
      }
      if (near) {
        if (candidate.municipal) {
          near.coordinate = point;
          near.municipal = true;
          near.material = candidate.material || near.material;
          near.armLengthMetres = candidate.armLengthMetres || near.armLengthMetres;
          near.bearing = candidate.bearing === null ? near.bearing : candidate.bearing;
          near.utilityPoleNumber = candidate.utilityPoleNumber || near.utilityPoleNumber;
          near.fieldPoleNumber = candidate.fieldPoleNumber || near.fieldPoleNumber;
          near.municipalAuditDate = candidate.municipalAuditDate || near.municipalAuditDate;
          near.fixtureMountHeight = candidate.fixtureMountHeight || near.fixtureMountHeight;
          near.inventoryOwnership = candidate.inventoryOwnership || near.inventoryOwnership;
          near.streetlightFeed = candidate.streetlightFeed || near.streetlightFeed;
        }
        continue;
      }
      supports.push(candidate);
    }

    const center = map.getCenter && map.getCenter();
    supports.sort((a, b) => {
      const da = center ? haversineMetres(a.coordinate, [center.lng, center.lat]) : 0;
      const db = center ? haversineMetres(b.coordinate, [center.lng, center.lat]) : 0;
      return da - db;
    });
    supports.length = Math.min(supports.length, MAX_SUPPORTS);
    const powerSupports = supports.filter(s => s.network === 'power');
    const lineFeatures = rawPowerLines
      .filter(feature => isDistributionPowerLine(feature, powerSupports))
      .slice(0, MAX_LINE_FEATURES);
    const powerSpans = makeSpans(lineFeatures, powerSupports, 'power', POWER_SNAP_M, 240, MAX_SPANS);
    const telecomSpans = makeSpans(
      telecomLineFeatures.filter(feature => isOverheadFeature(feature.properties || {}))
        .slice(0, MAX_LINE_FEATURES),
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
    return {
      supports, powerSpans, telecomSpans, transformers, switches, cabinets, masts, guyWires,
      lineCount: lineFeatures.length,
      municipalPoleCount: supports.filter(s => s.municipal).length,
      telecomPoleCount: supports.filter(s => s.network === 'telecom').length
    };
  }

  function wireTileAnchor(coordinate, zoom = 14) {
    const n = Math.pow(2, zoom);
    const lon = Math.max(-179.999999, Math.min(179.999999, Number(coordinate[0])));
    const lat = Math.max(-85.0511, Math.min(85.0511, Number(coordinate[1])));
    const latRad = lat * RAD;
    const x = Math.max(0, Math.min(n - 1, Math.floor((lon + 180) / 360 * n)));
    const y = Math.max(0, Math.min(n - 1,
      Math.floor((1 - Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / Math.PI) / 2 * n)));
    const centerLon = (x + .5) / n * 360 - 180;
    const mercatorY = Math.PI * (1 - 2 * (y + .5) / n);
    const centerLat = Math.atan(Math.sinh(mercatorY)) / RAD;
    return { key: zoom + '/' + x + '/' + y, coordinate: [centerLon, centerLat] };
  }

  // Close-range pole meshes use tile-local metre coordinates. Storing absolute
  // Mercator coordinates in InstancedMesh matrices loses sub-metre detail in
  // Float32 at street zoom. The renderer composes projection * anchor on the CPU,
  // then draws each small local batch with the same geographic ground anchor.
  function buildPrecisePoleGroups(supports) {
    const batches = new Map();
    for (const support of supports || []) {
      const tile = wireTileAnchor(support.coordinate, 17);
      let batch = batches.get(tile.key);
      if (!batch) {
        batch = { anchor: tile.coordinate, supports: [] };
        batches.set(tile.key, batch);
      }
      batch.supports.push(support);
    }
    for (const batch of batches.values()) {
      const anchorGround = localTerrainAt(batch.anchor);
      const anchorMatrix = modelMatrixFor(map, THREE, batch.anchor, anchorGround);
      if (!anchorMatrix) continue;
      const group = new THREE.Group();
      group.name = 'BridgePoint close-zoom ground-anchored poles';
      group.matrixAutoUpdate = false;
      group.matrix.identity();
      group.visible = false;
      group.userData.bpAnchorMatrix = anchorMatrix;
      const count = batch.supports.length;
      const poleMesh = new THREE.InstancedMesh(bodyGeometry, woodMaterial, count);
      const baseMesh = new THREE.InstancedMesh(poleBaseGeometry, woodMaterial, count);
      const armMesh = new THREE.InstancedMesh(armGeometry, woodMaterial, count);
      const braceMesh = new THREE.InstancedMesh(braceGeometry, woodMaterial, count);
      const insulatorMesh = new THREE.InstancedMesh(insulatorGeometry, ceramicMaterial, count * 3);
      const telecomMesh = new THREE.InstancedMesh(telecomBracketGeometry, metalMaterial, count);
      const meshes = [poleMesh, baseMesh, armMesh, braceMesh, insulatorMesh, telecomMesh];
      for (const mesh of meshes) {
        mesh.count = 0;
        mesh.frustumCulled = false;
        mesh.renderOrder = 920;
      }
      let placed = 0;
      for (const support of batch.supports) {
        const ground = localTerrainAt(support.coordinate);
        const offset = localEastNorth(batch.anchor, support.coordinate);
        const origin = new THREE.Matrix4().makeTranslation(
          offset[0], ground - anchorGround, -offset[1]
        );
        const yaw = Number.isFinite(Number(support.bearing)) ? Number(support.bearing) * RAD : 0;
        const rotation = new THREE.Matrix4().makeRotationY(yaw);
        const sourceHeight = Number(support.height);
        const height = support.measuredHeight && Number.isFinite(sourceHeight) && sourceHeight >= 3
          ? sourceHeight : 11;
        const armLength = Math.max(1.2, Math.min(4.5, Number(support.armLengthMetres) || 2.0));
        const crossarmY = height * .84;
        const poleScale = minimumDisplayScale(support.coordinate, .34, 1.8, 14);
        const hardwareScale = minimumDisplayScale(support.coordinate, .20, 1.3, 11);
        const poleMatrix = origin.clone().multiply(rotation)
          .multiply(new THREE.Matrix4().makeScale(poleScale, height, poleScale));
        const baseMatrix = origin.clone().multiply(rotation)
          .multiply(new THREE.Matrix4().makeScale(poleScale, 1, poleScale));
        const armMatrix = origin.clone().multiply(rotation)
          .multiply(new THREE.Matrix4().makeTranslation(0, crossarmY, 0))
          .multiply(new THREE.Matrix4().makeScale(armLength, hardwareScale, hardwareScale));
        const braceMatrix = origin.clone().multiply(rotation)
          .multiply(new THREE.Matrix4().makeTranslation(0, crossarmY, 0))
          .multiply(new THREE.Matrix4().makeScale(armLength, 1, hardwareScale));
        const poleMeshHex = String(support.material || '').toLowerCase();
        const poleColor = new THREE.Color(
          poleMeshHex.includes('concrete') ? 0x9da8ad :
            (poleMeshHex.includes('steel') || poleMeshHex.includes('metal') ||
             poleMeshHex.includes('iron') || poleMeshHex.includes('alumin')) ? 0x98a5aa :
              poleMeshHex.includes('composite') ? 0x7d8990 : 0xb08a5b
        );
        for (const mesh of [poleMesh, baseMesh, armMesh, braceMesh]) mesh.setColorAt(placed, poleColor);
        poleMesh.setMatrixAt(placed, poleMatrix);
        baseMesh.setMatrixAt(placed, baseMatrix);
        armMesh.setMatrixAt(placed, armMatrix);
        braceMesh.setMatrixAt(placed, braceMatrix);
        const pinOffset = Math.min(.34, armLength * .36);
        for (let pin = 0; pin < 3; pin++) {
          const across = (pin - 1) * pinOffset;
          const pinMatrix = origin.clone().multiply(rotation)
            .multiply(new THREE.Matrix4().makeTranslation(across, crossarmY + .045, 0))
            .multiply(new THREE.Matrix4().makeScale(hardwareScale, 1.2, hardwareScale));
          insulatorMesh.setMatrixAt(placed * 3 + pin, pinMatrix);
        }
        const telecomScale = minimumDisplayScale(support.coordinate, .22, 1.2, 10);
        const telecomMatrix = origin.clone().multiply(rotation)
          .multiply(new THREE.Matrix4().makeTranslation(0, height * .68, 0))
          .multiply(new THREE.Matrix4().makeScale(Math.sqrt(telecomScale), telecomScale, telecomScale));
        telecomMesh.setMatrixAt(placed, telecomMatrix);
        placed++;
      }
      poleMesh.count = baseMesh.count = armMesh.count = braceMesh.count = telecomMesh.count = placed;
      insulatorMesh.count = placed * 3;
      for (const mesh of meshes) {
        if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        if (mesh.count) group.add(mesh);
      }
      if (placed) {
        scene.add(group);
        precisePoleGroups.push(group);
      }
    }
  }

  function getWireBatch(batches, coordinate) {
    const tile = wireTileAnchor(coordinate);
    let batch = batches.get(tile.key);
    if (!batch) {
      batch = { anchor: tile.coordinate, ground: localTerrainAt(tile.coordinate), power: [], telecom: [], powerSpans: 0, telecomSpans: 0 };
      batches.set(tile.key, batch);
    }
    return batch;
  }

  function appendWireSpan(batch, span, kind) {
    const telecom = kind === 'telecom';
    const anchorGround = localTerrainAt(span.a.coordinate);
    const nextGround = localTerrainAt(span.b.coordinate);
    const offset = localEastNorth(span.a.coordinate, span.b.coordinate);
    const groupOffset = localEastNorth(batch.anchor, span.a.coordinate);
    const distance = Math.hypot(offset[0], offset[1]);
    if (!Number.isFinite(distance) || distance < 10) return false;
    const bearing = Math.atan2(offset[0], offset[1]);
    const acrossEast = Math.cos(bearing), acrossNorth = -Math.sin(bearing);
    const sag = Math.min(telecom ? 2.4 : 3.2, Math.max(telecom ? .30 : .42, distance * (telecom ? .012 : .018)));
    let catenaryA = distance * distance / Math.max(.1, 8 * sag);
    for (let iteration = 0; iteration < 6; iteration++) {
      const ratio = distance / (2 * catenaryA);
      const residual = catenaryA * (Math.cosh(ratio) - 1) - sag;
      const derivative = Math.cosh(ratio) - 1 - ratio * Math.sinh(ratio);
      if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-12) break;
      catenaryA = Math.max(.05, catenaryA - residual / derivative);
    }
    const catenaryEnd = Math.cosh(distance / (2 * catenaryA));
    const conductorCount = telecom ? 2 : Math.max(1, Math.min(4, Number(span.conductorCount) || 3));
    const spacing = telecom ? .16 : .34;
    const lanes = Array.from({ length: conductorCount }, (_, i) => (i - (conductorCount - 1) * .5) * spacing);
    const attachmentHeight = support => telecom ? support.height * .68 + .07 : support.height * .84 + .245;
    const heightA = anchorGround - batch.ground + attachmentHeight(span.a);
    const heightB = nextGround - batch.ground + attachmentHeight(span.b);
    const vertices = telecom ? batch.telecom : batch.power;
    const radius = wireRadiusFor(span.a.coordinate, telecom ? .018 : .024);
    for (const lane of lanes) {
      let previous = null;
      const steps = Math.min(18, Math.max(5, Math.ceil(distance / 12)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const east = groupOffset[0] + offset[0] * t + acrossEast * lane;
        const north = groupOffset[1] + offset[1] * t + acrossNorth * lane;
        const linearHeight = heightA + (heightB - heightA) * t;
        const sagDrop = catenaryA * (Math.cosh((t - .5) * distance / catenaryA) - catenaryEnd);
        const current = new THREE.Vector3(east, linearHeight + sagDrop, -north);
        if (previous) pushBeam(vertices, previous, current, radius, THREE, 6);
        previous = current;
      }
    }
    if (telecom) batch.telecomSpans++;
    else batch.powerSpans++;
    return true;
  }

  function flushWireBatches(batches) {
    let powerCount = 0, telecomCount = 0, meshCount = 0;
    for (const batch of batches.values()) {
      const matrix = modelMatrixFor(map, THREE, batch.anchor, batch.ground);
      if (!matrix) continue;
      for (const [kind, vertices, material] of [
        ['power', batch.power, distributionCableMaterial],
        ['telecom', batch.telecom, telecomCableMaterial]
      ]) {
        if (!vertices.length) continue;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.matrix.copy(matrix);
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = false;
        mesh.renderOrder = 920;
        mesh.userData.bpOwnedGeometry = true;
        dataGroup.add(mesh);
        meshCount++;
        if (kind === 'telecom') telecomCount += batch.telecomSpans;
        else powerCount += batch.powerSpans;
      }
    }
    return { powerCount, telecomCount, meshCount };
  }

  function createGuyWireMesh(feature, supports) {
    const paths = pathsOf(feature);
    if (!paths.length) return [];
    const meshes = [];
    for (const path of paths) {
      if (!path || path.length < 2) continue;
      const first = path[0], last = path[path.length - 1];
      let support = null, anchor = null, best = 8;
      for (const candidate of supports) {
        const da = haversineMetres(candidate.coordinate, first);
        const db = haversineMetres(candidate.coordinate, last);
        if (da < best) { support = candidate; anchor = last; best = da; }
        if (db < best) { support = candidate; anchor = first; best = db; }
      }
      if (!support || !anchor) continue;
      const base = localTerrainAt(support.coordinate);
      const anchorGround = localTerrainAt(anchor);
      const offset = localEastNorth(support.coordinate, anchor);
      const length = Math.hypot(offset[0], offset[1]);
      if (length < 1) continue;
      const vertices = [];
      let previous = null;
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const point = new THREE.Vector3(
          offset[0] * t,
          support.height * .78 * (1 - t) + (anchorGround - base + .22) * t - .10 * 4 * t * (1 - t),
          -offset[1] * t
        );
        if (previous) pushBeam(vertices, previous, point, wireRadiusFor(support.coordinate, .012), THREE, 6);
        previous = point;
      }
      if (!vertices.length) continue;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();
      const matrix = modelMatrixFor(map, THREE, support.coordinate, base);
      if (!matrix) { geometry.dispose(); continue; }
      const mesh = new THREE.Mesh(geometry, guyWireMaterial);
      mesh.matrix.copy(matrix); mesh.matrixAutoUpdate = false; mesh.frustumCulled = false;
      mesh.renderOrder = 920; mesh.userData.bpOwnedGeometry = true;
      meshes.push(mesh);
    }
    return meshes;
  }

  function assetSignature(assets, zoom) {
    const ids = (items, keyFn) => items.map(keyFn).sort().join(',');
    const pointId = item => String(item.key || '') + '@' +
      (item.coordinate || []).map(value => Number(value).toFixed(6)).join(',');
    const spanId = item => String(item.a && item.a.key || '') + '>' + String(item.b && item.b.key || '');
    return [
      Math.round(Number(zoom) * 4) / 4, groundCacheRevision,
      ids(assets.supports, pointId), ids(assets.powerSpans, spanId),
      ids(assets.telecomSpans, spanId), ids(assets.transformers, pointId),
      ids(assets.switches, pointId), ids(assets.cabinets, pointId),
      ids(assets.masts, pointId), ids(assets.guyWires, feature => pathFeatureKey(feature, 'guy'))
    ].join('|');
  }

  function buildSceneAssets(assets) {
    clearSceneData();
    const incoming = assets;
    const supports = incoming.supports;
    const supportSet = new Set(supports);
    const nearestSupport = coordinate => {
      let best = null;
      for (const support of supports) {
        const distance = haversineMetres(support.coordinate, coordinate);
        if (!best || distance < best.distance) best = { support, distance };
      }
      return best;
    };
    assets = {
      ...incoming,
      supports,
      powerSpans: incoming.powerSpans.filter(span => supportSet.has(span.a) && supportSet.has(span.b)),
      telecomSpans: incoming.telecomSpans.filter(span => supportSet.has(span.a) && supportSet.has(span.b)),
      transformers: incoming.transformers.filter(item => hasGroundElevation(item.coordinate) ||
        (nearestSupport(item.coordinate)?.distance ?? Infinity) <= 9),
      switches: incoming.switches.filter(item => hasGroundElevation(item.coordinate) ||
        (nearestSupport(item.coordinate)?.distance ?? Infinity) <= 8),
      cabinets: incoming.cabinets.filter(item => item.mountOnPole
        ? (nearestSupport(item.coordinate)?.distance ?? Infinity) <= 7
        : hasGroundElevation(item.coordinate)),
      masts: incoming.masts.filter(item => hasGroundElevation(item.coordinate))
    };
    state.groundUnresolved = incoming.supports.length - supports.length;
    if (!supports.length && !assets.transformers.length && !assets.cabinets.length && !assets.masts.length) {
      state.updatedAt = Date.now();
      state.ready = true;
      state.lineFeatures = assets.lineCount;
      state.poles = 0; state.towers = 0;
      say(incoming.supports.length
        ? 'Mapped utility assets found; waiting for verified ground heights before placing ' + incoming.supports.length + ' poles. They will appear automatically as terrain samples resolve.'
        : 'No mapped distribution poles or telecommunications assets in the loaded tiles for this view yet.');
      return;
    }
    // The custom renderer draws local distribution supports only. Transmission towers
    // and high-voltage routes remain in the original yellow BridgePoint layer.
    const poleMesh = new THREE.InstancedMesh(bodyGeometry, woodMaterial, supports.length);
    const poleBaseMesh = new THREE.InstancedMesh(poleBaseGeometry, woodMaterial, supports.length);
    const armMesh = new THREE.InstancedMesh(armGeometry, woodMaterial, supports.length);
    const braceMesh = new THREE.InstancedMesh(braceGeometry, woodMaterial, supports.length);
    const insulatorMesh = new THREE.InstancedMesh(insulatorGeometry, ceramicMaterial, supports.length * 3);
    const telecomBracketMesh = new THREE.InstancedMesh(telecomBracketGeometry, metalMaterial, supports.length);
    const hardwareMeshes = [poleMesh, poleBaseMesh, armMesh, braceMesh, insulatorMesh, telecomBracketMesh];
    standardPoleMeshes = hardwareMeshes;
    for (const mesh of hardwareMeshes) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.renderOrder = 920;
    }
    let poleCount = 0, measured = 0, estimated = 0, groundUnresolved = 0;
    for (const support of supports) {
      const ground = localTerrainAt(support.coordinate);
      if (!groundElevationCache.has(groundKey(support.coordinate)) && !Number.isFinite(terrainAt(map, support.coordinate))) groundUnresolved++;
      const index = poleCount;
      const model = modelMatrixFor(map, THREE, support.coordinate, ground);
      if (!model) continue;
      poleCount++;
      if (support.measuredHeight) measured++; else estimated++;
      const materialTag = String(support.material || '').toLowerCase();
      const poleHex = materialTag.includes('concrete') ? 0x9da8ad :
        (materialTag.includes('steel') || materialTag.includes('metal') || materialTag.includes('iron') || materialTag.includes('alumin')) ? 0x98a5aa :
        materialTag.includes('composite') ? 0x7d8990 : 0xb08a5b;
      const poleColor = new THREE.Color(poleHex);
      for (const mesh of [poleMesh, poleBaseMesh, armMesh, braceMesh]) mesh.setColorAt(index, poleColor);

      // OSM bearing is the direction of the span. A crossarm runs perpendicular
      // to it: north/south wires get an east/west arm, east/west wires get a north/south arm.
      const yaw = ((Number.isFinite(Number(support.bearing)) ? Number(support.bearing) : 0) * RAD);
      const rotation = new THREE.Matrix4().makeRotationY(yaw);
      const sourceHeight = Number(support.height);
      const height = support.measuredHeight && Number.isFinite(sourceHeight) && sourceHeight >= 3
        ? sourceHeight : 11;
      const armLength = Math.max(1.2, Math.min(4.5, Number(support.armLengthMetres) || 2.0));
      const crossarmY = height * .84;
      const poleDisplayScale = minimumDisplayScale(support.coordinate, .34, 1.8, 14);
      const hardwareScale = minimumDisplayScale(support.coordinate, .20, 1.3, 11);
      poleMesh.setMatrixAt(index, model.clone().multiply(rotation)
        .multiply(new THREE.Matrix4().makeScale(poleDisplayScale, height, poleDisplayScale)));
      poleBaseMesh.setMatrixAt(index, model.clone().multiply(rotation)
        .multiply(new THREE.Matrix4().makeScale(poleDisplayScale, 1, poleDisplayScale)));
      const armTransform = model.clone().multiply(rotation)
        .multiply(new THREE.Matrix4().makeTranslation(0, crossarmY, 0))
        .multiply(new THREE.Matrix4().makeScale(armLength, hardwareScale, hardwareScale));
      armMesh.setMatrixAt(index, armTransform);
      const braceTransform = model.clone().multiply(rotation)
        .multiply(new THREE.Matrix4().makeTranslation(0, crossarmY, 0))
        .multiply(new THREE.Matrix4().makeScale(armLength, 1, hardwareScale));
      braceMesh.setMatrixAt(index, braceTransform);
      const pinOffset = Math.min(.34, armLength * .36);
      for (let pin = 0; pin < 3; pin++) {
        const across = (pin - 1) * pinOffset;
        const pinMatrix = model.clone().multiply(rotation)
          .multiply(new THREE.Matrix4().makeTranslation(across, crossarmY + .045, 0))
          .multiply(new THREE.Matrix4().makeScale(hardwareScale, 1.2, hardwareScale));
        insulatorMesh.setMatrixAt(index * 3 + pin, pinMatrix);
      }
      const telecomScale = minimumDisplayScale(support.coordinate, .22, 1.2, 10);
      const telecomMatrix = model.clone().multiply(rotation)
        .multiply(new THREE.Matrix4().makeTranslation(0, height * .68, 0))
        .multiply(new THREE.Matrix4().makeScale(Math.sqrt(telecomScale), telecomScale, telecomScale));
      telecomBracketMesh.setMatrixAt(index, telecomMatrix);
      armMesh.count = poleCount;
      braceMesh.count = poleCount;
      poleBaseMesh.count = poleCount;
      insulatorMesh.count = poleCount * 3;
      telecomBracketMesh.count = poleCount;
    }
    poleMesh.count = poleCount;
    if (poleCount) {
      for (const mesh of hardwareMeshes) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        dataGroup.add(mesh);
      }
      buildPrecisePoleGroups(supports);
    }

    state.groundUnresolved = groundUnresolved + incoming.supports.length - supports.length;
    const transformerMesh = new THREE.InstancedMesh(transformerGeometry, metalMaterial, assets.transformers.length);
    let transformerCount = 0;
    for (const transformer of assets.transformers) {
      const attached = nearestSupport(transformer.coordinate);
      const support = attached && attached.distance <= 9 ? attached.support : null;
      const ground = localTerrainAt(transformer.coordinate);
      const matrix = modelMatrixFor(map, THREE, transformer.coordinate, ground);
      if (!matrix) continue;
      matrix.multiply(new THREE.Matrix4().makeTranslation(.34, support ? support.height * .66 : .55, 0));
      const equipmentScale = minimumDisplayScale(transformer.coordinate, .72, 1.15, 3.2);
      matrix.multiply(new THREE.Matrix4().makeScale(.72 * equipmentScale, support ? .9 : 1.1, .72 * equipmentScale));
      transformerMesh.setMatrixAt(transformerCount++, matrix);
    }
    transformerMesh.count = transformerCount;
    if (transformerCount) {
      transformerMesh.instanceMatrix.needsUpdate = true;
      transformerMesh.frustumCulled = false;
      dataGroup.add(transformerMesh);
    }

    const switchMesh = new THREE.InstancedMesh(switchGeometry, metalMaterial, assets.switches.length);
    let switchCount = 0;
    for (const item of assets.switches) {
      const attached = nearestSupport(item.coordinate);
      if (!attached || attached.distance > 8) continue;
      const support = attached.support, ground = localTerrainAt(item.coordinate);
      const matrix = modelMatrixFor(map, THREE, item.coordinate, ground);
      if (!matrix) continue;
      matrix.multiply(new THREE.Matrix4().makeRotationY(Number(item.angle) * RAD));
      matrix.multiply(new THREE.Matrix4().makeTranslation(0, support.height * .83, 0));
      const switchScale = minimumDisplayScale(item.coordinate, .42, 1.15, 3.5);
      matrix.multiply(new THREE.Matrix4().makeScale(switchScale, 1, switchScale));
      switchMesh.setMatrixAt(switchCount++, matrix);
    }
    switchMesh.count = switchCount;
    if (switchCount) {
      switchMesh.instanceMatrix.needsUpdate = true;
      switchMesh.frustumCulled = false;
      dataGroup.add(switchMesh);
    }

    const cabinetMesh = new THREE.InstancedMesh(cabinetGeometry, telecomMaterial, assets.cabinets.length);
    const spliceMesh = new THREE.InstancedMesh(spliceBoxGeometry, telecomMaterial, assets.cabinets.length);
    let cabinetCount = 0, spliceCount = 0;
    for (const cabinet of assets.cabinets) {
      const attached = nearestSupport(cabinet.coordinate);
      if (cabinet.mountOnPole && attached && attached.distance <= 7) {
        const support = attached.support, ground = localTerrainAt(support.coordinate);
        const matrix = modelMatrixFor(map, THREE, support.coordinate, ground);
        if (!matrix) continue;
        matrix.multiply(new THREE.Matrix4().makeRotationY((Number(support.bearing) || 0) * RAD));
        matrix.multiply(new THREE.Matrix4().makeTranslation(.18, support.height * .66, .04));
        const spliceScale = minimumDisplayScale(support.coordinate, .44, 1.15, 3.5);
        matrix.multiply(new THREE.Matrix4().makeScale(.9 * spliceScale, .9, .9 * spliceScale));
        spliceMesh.setMatrixAt(spliceCount++, matrix);
      } else {
        const ground = localTerrainAt(cabinet.coordinate);
        const matrix = modelMatrixFor(map, THREE, cabinet.coordinate, ground);
        if (!matrix) continue;
        matrix.multiply(new THREE.Matrix4().makeTranslation(0, .42, 0));
        const cabinetScale = minimumDisplayScale(cabinet.coordinate, .72, 1.15, 3.2);
        matrix.multiply(new THREE.Matrix4().makeScale(cabinetScale, 1, cabinetScale));
        cabinetMesh.setMatrixAt(cabinetCount++, matrix);
      }
    }
    cabinetMesh.count = cabinetCount; spliceMesh.count = spliceCount;
    if (cabinetCount) {
      cabinetMesh.instanceMatrix.needsUpdate = true;
      cabinetMesh.frustumCulled = false;
      dataGroup.add(cabinetMesh);
    }
    if (spliceCount) {
      spliceMesh.instanceMatrix.needsUpdate = true;
      spliceMesh.frustumCulled = false;
      dataGroup.add(spliceMesh);
    }

    const mastMesh = new THREE.InstancedMesh(mastGeometry, telecomMaterial, assets.masts.length);
    let mastCount = 0;
    for (const mast of assets.masts) {
      const ground = localTerrainAt(mast.coordinate);
      const matrix = modelMatrixFor(map, THREE, mast.coordinate, ground);
      if (!matrix) continue;
      matrix.multiply(new THREE.Matrix4().makeScale(1, mast.height, 1));
      mastMesh.setMatrixAt(mastCount++, matrix);
      if (mast.measuredHeight) measured++; else estimated++;
    }
    mastMesh.count = mastCount;
    if (mastCount) {
      mastMesh.instanceMatrix.needsUpdate = true;
      mastMesh.frustumCulled = false;
      dataGroup.add(mastMesh);
    }

    const wireBatches = new Map();
    for (const span of assets.powerSpans) appendWireSpan(getWireBatch(wireBatches, span.a.coordinate), span, 'power');
    for (const span of assets.telecomSpans) appendWireSpan(getWireBatch(wireBatches, span.a.coordinate), span, 'telecom');
    const wireStats = flushWireBatches(wireBatches);
    const powerSpanCount = wireStats.powerCount;
    const telecomSpanCount = wireStats.telecomCount;
    let guyWireCount = 0;
    for (const feature of assets.guyWires.slice(0, IS_SMALL_DEVICE ? 24 : 60)) {
      for (const mesh of createGuyWireMesh(feature, supports)) {
        dataGroup.add(mesh);
        guyWireCount++;
      }
    }

    state.poles = poleCount; state.towers = 0;
    state.powerSpans = powerSpanCount; state.telecomSpans = telecomSpanCount;
    state.transformers = transformerCount; state.switches = switchCount;
    state.cabinets = cabinetCount + spliceCount; state.telecomMasts = mastCount;
    state.measuredHeights = measured; state.estimatedHeights = estimated;
    state.municipalPoleCount = assets.municipalPoleCount || 0;
    state.telecomPoleCount = assets.telecomPoleCount || 0;
    state.guyWireCount = guyWireCount; state.lineFeatures = assets.lineCount;
    state.updatedAt = Date.now();
    say('Mapped local utility assets: ' + poleCount + ' single poles (including ' + state.municipalPoleCount +
      ' municipal inventory records), ' + powerSpanCount + ' distribution-wire spans, ' +
      telecomSpanCount + ' telecom-wire spans, ' + transformerCount + ' transformers, ' +
      switchCount + ' switches, ' + (cabinetCount + spliceCount) + ' cabinets/splice boxes, ' +
      guyWireCount + ' guy wires. Towers rendered by this layer: 0. Pole heights measured: ' +
      measured + '; estimated: ' + estimated + '.');
    try { map.triggerRepaint && map.triggerRepaint(); } catch (_) {}
  }

  async function refresh() {
    // BridgePoint can report isStyleLoaded() false while unrelated globe/source tiles
    // stream. A live style object is enough to install our own vector sources and 3D layer.
    if (dead || !map || typeof map.getStyle !== 'function' || !map.getStyle()) return;
    const zoom = Number(map.getZoom && map.getZoom() || 0);
    lastZoom = zoom;
    if (zoom < MIN_ZOOM) {
      lastAssetSignature = '';
      if (state.poles || state.towers || state.powerSpans || state.transformers || state.cabinets) {
        clearSceneData();
      }
      say('Global distribution poles, local power/telecom wires and equipment appear automatically from zoom ' + MIN_ZOOM + '+. Transmission towers remain in the existing yellow transmission layer.');
      return;
    }
    const seq = ++sequence;
    say('Loading mapped poles, distribution lines and utility equipment for the visible area…');
    try {
      if (!installSources()) throw new Error('Public utility vector sources unavailable');
      if (!installCustomLayer()) throw new Error('3D utility renderer is not ready');
      // Non-blocking: the first view renders from OSM while municipal/Overpass data loads.
      void loadMiddletownStreetlights();
      void loadOverpassInfrastructure();
      const assets = collectAssets();
      if (seq !== sequence || dead) return;
      const signature = assetSignature(assets, zoom);
      if (state.ready && signature === lastAssetSignature) return;
      // Draw immediately from terrain samples already decoded by the globe.
      // Missing points are resolved progressively from USGS EPQS in the background;
      // Every source-mapped pole renders immediately. Exact terrain anchors are used
      // when decoded; nearby USGS samples are a temporary local fallback while
      // the larger 3DEP sample batch fills in.
      void loadUSGS3DEPGround(assets).catch(error => console.warn('BridgePoint USGS utility ground samples', error));
      if (seq !== sequence || dead) return;
      buildSceneAssets(assets);
      lastAssetSignature = signature;
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
    refreshTimer = setTimeout(() => { void refresh(); }, SOURCE_REFRESH_DELAY_MS);
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
    if (!event) return;
    const isUtilitySource = event.sourceId === POWER_SOURCE || event.sourceId === TELECOM_SOURCE;
    const isTerrainSource = event.sourceId === 'dem';
    // Ignore style/metadata events. Only decoded content can add assets or anchors.
    if ((isUtilitySource || isTerrainSource) &&
        (!event.sourceDataType || event.sourceDataType === 'content')) {
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
    municipalPoleCount: state.municipalPoleCount, telecomPoleCount: state.telecomPoleCount,
    guyWireCount: state.guyWireCount, groundSamples: groundElevationCache.size,
    groundUnresolved: state.groundUnresolved || 0,
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
      municipalStreetlightFeatures = []; overpassFeatures = [];
      groundElevationCache.clear(); groundElevationPending.clear(); groundElevationRetryAt.clear();
      if (map.getLayer('bp-utility-poles-3d-v1')) map.removeLayer('bp-utility-poles-3d-v1');
      for (const layer of map.getStyle().layers || []) {
        if (String(layer.id || '').startsWith('bp-utility-query-') && map.getLayer(layer.id)) map.removeLayer(layer.id);
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