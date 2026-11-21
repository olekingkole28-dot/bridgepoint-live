/**
 * BridgePoint Named Earthquakes Layer V2
 *
 * Source: USGS ComCat public GeoJSON summary feed.
 * Representation: published ShakeMap MMI contours where available, plus
 * clearly labeled magnitude/depth impact-radius estimates for every event.
 * Network activity is strictly opt-in and stops when the layer is turned off.
 */
export const SEISMIC_FEED_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson';
export const SEISMIC_REFRESH_MS = 60_000;
export const SEISMIC_MAX_FEATURES = 1500;

const SOURCE_ID = 'bp-usgs-seismic-source-v1';
const GLOW_LAYER_ID = 'bp-usgs-seismic-glow-v1';
const POINT_LAYER_ID = 'bp-usgs-seismic-points-v1';
const EMPTY = Object.freeze({ type: 'FeatureCollection', features: [] });
const GLOBAL_KEY = '__BP_USGS_SEISMIC_LAYER_V1__';

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const IMPACT_SOURCE_ID = 'bp-usgs-seismic-impact-v1';
const IMPACT_BOUNDARY_SOURCE_ID = 'bp-usgs-seismic-boundary-source-v1';
const RIPPLE_SOURCE_ID = 'bp-usgs-seismic-ripples-v1';
const IMPACT_FILL_LAYER_ID = 'bp-usgs-seismic-impact-fill-v1';
const IMPACT_BOUNDARY_LAYER_ID = 'bp-usgs-seismic-impact-boundary-v1';
const RIPPLE_LAYER_ID = 'bp-usgs-seismic-ripple-lines-v1';
const PULSE_LAYER_ID = 'bp-usgs-seismic-global-pulse-v1';
const RIPPLE_FRAME_INTERVAL_MS = 40;
const EARTH_RADIUS_KM = 6371;

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function wrapLongitude(value) { return ((value + 180) % 360 + 360) % 360 - 180; }

export function estimateEarthquakeImpactRadiusKm(magnitude, depthKm = 0, intensity = null) {
  const mag = finiteNumber(magnitude);
  if (mag === null) return null;
  const depth = Math.max(0, finiteNumber(depthKm) ?? 0);
  const felt = finiteNumber(intensity);
  const intensityFactor = felt === null ? 1 : clamp(1 + (felt - 3) * 0.035, 0.9, 1.18);
  const km = 12 * Math.pow(10, 0.34 * (clamp(mag, 2.5, 9.5) - 2.5)) *
    (1 + Math.min(300, depth) * 0.0015) * intensityFactor;
  return Math.round(clamp(km, 5, 1600) * 10) / 10;
}

function destination(lon, lat, distanceKm, bearing) {
  const d = Math.max(0, distanceKm) / EARTH_RADIUS_KM;
  const p = lat * Math.PI / 180;
  const l = lon * Math.PI / 180;
  const p2 = Math.asin(clamp(Math.sin(p) * Math.cos(d) +
    Math.cos(p) * Math.sin(d) * Math.cos(bearing), -1, 1));
  const l2 = l + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(p),
    Math.cos(d) - Math.sin(p) * Math.sin(p2));
  return [wrapLongitude(l2 * 180 / Math.PI), p2 * 180 / Math.PI];
}

function circleLine(lon, lat, radiusKm, segments = 48) {
  return Array.from({ length: segments }, (_, i) =>
    destination(lon, lat, radiusKm, 2 * Math.PI * i / segments));
}

function splitDateLine(line) {
  const coords = (Array.isArray(line) ? line : []).filter(p =>
    Array.isArray(p) && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1])) &&
    Number(p[1]) >= -90 && Number(p[1]) <= 90
  ).map(p => [wrapLongitude(Number(p[0])), Number(p[1])]);
  if (coords.length < 2) return [];
  const result = [];
  let segment = [coords[0]];
  for (let i = 1; i < coords.length; i += 1) {
    const a = coords[i - 1], b = coords[i], delta = b[0] - a[0];
    if (Math.abs(delta) > 180) {
      const adjusted = b[0] + (delta > 0 ? -360 : 360);
      const edge = delta > 0 ? -180 : 180;
      const t = (edge - a[0]) / (adjusted - a[0]);
      const y = a[1] + (b[1] - a[1]) * t;
      segment.push([edge, y]);
      if (segment.length > 1) result.push(segment);
      segment = [[-edge, y], b];
    } else segment.push(b);
  }
  if (segment.length > 1) result.push(segment);
  if (coords.length > 2 && coords[0][0] === coords.at(-1)[0] && coords[0][1] === coords.at(-1)[1]) {
    const last = result.at(-1);
    if (last && (last[0][0] !== last.at(-1)[0] || last[0][1] !== last.at(-1)[1])) last.push([...last[0]]);
  }
  return result;
}

function linesGeometry(lines) {
  const parts = (Array.isArray(lines) ? lines : []).flatMap(splitDateLine);
  if (!parts.length) return null;
  return parts.length === 1 ? { type: 'LineString', coordinates: parts[0] } :
    { type: 'MultiLineString', coordinates: parts };
}

function clipLongitude(points, edge, greater) {
  if (!points.length) return [];
  const inside = point => greater ? point[0] >= edge : point[0] <= edge;
  const output = [];
  let previous = points[points.length - 1];
  for (const current of points) {
    const wasInside = inside(previous), isInside = inside(current);
    if (wasInside !== isInside) {
      const span = current[0] - previous[0];
      const t = span === 0 ? 0 : (edge - previous[0]) / span;
      output.push([edge, previous[1] + (current[1] - previous[1]) * t]);
    }
    if (isInside) output.push(current);
    previous = current;
  }
  return output;
}

function polygonGeometryFromRing(ring) {
  const points = (Array.isArray(ring) ? ring : []).filter(point =>
    Array.isArray(point) && Number.isFinite(Number(point[0])) &&
    Number.isFinite(Number(point[1])) && Number(point[1]) >= -90 && Number(point[1]) <= 90
  ).map(point => [wrapLongitude(Number(point[0])), Number(point[1])]);
  if (points.length > 1 && points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1]) points.pop();
  if (points.length < 3) return null;
  const unwrapped = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    let lon = points[i][0];
    const previous = unwrapped.at(-1)[0];
    while (lon - previous > 180) lon -= 360;
    while (lon - previous < -180) lon += 360;
    unwrapped.push([lon, points[i][1]]);
  }
  const min = Math.min(...unwrapped.map(point => point[0]));
  const max = Math.max(...unwrapped.map(point => point[0]));
  const firstBand = Math.floor((min + 180) / 360);
  const lastBand = Math.floor((max + 180 - 1e-9) / 360);
  const polygons = [];
  for (let band = firstBand; band <= lastBand; band += 1) {
    const left = -180 + 360 * band, right = 180 + 360 * band;
    let clipped = clipLongitude(unwrapped, left, true);
    clipped = clipLongitude(clipped, right, false);
    if (clipped.length < 3) continue;
    const shifted = clipped.map(point => [clamp(point[0] - 360 * band, -180, 180), point[1]]);
    if (shifted[0][0] !== shifted.at(-1)[0] || shifted[0][1] !== shifted.at(-1)[1]) shifted.push([...shifted[0]]);
    if (shifted.length >= 4) polygons.push([shifted]);
  }
  if (!polygons.length) return null;
  return polygons.length === 1 ? { type: 'Polygon', coordinates: polygons[0] } :
    { type: 'MultiPolygon', coordinates: polygons };
}

function distanceKm(a, b) {
  const rad = x => x * Math.PI / 180;
  const p1 = rad(a[1]), p2 = rad(b[1]), dp = p2 - p1, dl = rad(wrapLongitude(b[0] - a[0]));
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(clamp(h, 0, 1)));
}

function sampleLine(line, limit = 48) {
  const clean = Array.isArray(line) ? line.filter(p => Array.isArray(p) &&
    Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1])) &&
    Number(p[0]) >= -180 && Number(p[0]) <= 180 && Number(p[1]) >= -90 && Number(p[1]) <= 90
  ).map(p => [Number(p[0]), Number(p[1])]) : [];
  if (clean.length <= limit) return clean;
  return Array.from({ length: limit }, (_, i) => clean[Math.round(i * (clean.length - 1) / (limit - 1))]);
}

function getContourLevel(properties = {}) {
  for (const [key, value] of Object.entries(properties)) {
    if (!/(mmi|intensity|contour|value)/i.test(key)) continue;
    const match = String(value).match(/-?\d+(?:\.\d+)?/);
    if (match && Number.isFinite(Number(match[0]))) return Number(match[0]);
  }
  return null;
}

export function extractShakeMapImpactBoundary(payload, epicenter) {
  const candidates = [];
  for (const feature of (Array.isArray(payload?.features) ? payload.features : [])) {
    const geometry = feature?.geometry;
    let lines = [];
    if (geometry?.type === 'LineString') lines = [geometry.coordinates];
    else if (geometry?.type === 'MultiLineString') lines = geometry.coordinates;
    else if (geometry?.type === 'Polygon') lines = geometry.coordinates?.slice(0, 1) || [];
    else if (geometry?.type === 'MultiPolygon') lines = (geometry.coordinates || []).map(p => p?.[0]).filter(Boolean);
    for (const line of lines) {
      const sampled = sampleLine(line);
      if (sampled.length >= 3) candidates.push({ level: getContourLevel(feature.properties), line: sampled });
    }
  }
  if (!candidates.length) return null;
  const levels = candidates.map(c => c.level).filter(x => x !== null);
  let selected = levels.length ? candidates.filter(c => c.level === Math.min(...levels)) : [];
  if (!selected.length) {
    const extent = c => Math.max(...c.line.map(p => distanceKm(epicenter, p)));
    selected = [candidates.reduce((best, item) => extent(item) > extent(best) ? item : best)];
  }
  const lines = selected.map(c => c.line);
  const radiusKm = Math.max(...lines.flat().map(p => distanceKm(epicenter, p)));
  return Number.isFinite(radiusKm) && radiusKm >= 1
    ? { lines, radiusKm: Math.round(radiusKm * 10) / 10, contourLevel: selected[0].level }
    : null;
}

function interpolateGreatCircle(origin, dest, t) {
  const rad = x => x * Math.PI / 180, deg = x => x * 180 / Math.PI;
  const vector = p => {
    const lat = rad(p[1]), lon = rad(p[0]);
    return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
  };
  const a = vector(origin), b = vector(dest);
  const omega = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
  if (omega < 1e-8) return [origin[0], origin[1]];
  const sin = Math.sin(omega), wa = Math.sin((1 - t) * omega) / sin, wb = Math.sin(t * omega) / sin;
  const x = wa * a[0] + wb * b[0], y = wa * a[1] + wb * b[1], z = wa * a[2] + wb * b[2];
  return [wrapLongitude(deg(Math.atan2(y, x))), deg(Math.atan2(z, Math.hypot(x, y)))];
}

function buildImpactCollections(geojson, shakemapCache = null) {
  const areas = [], boundaries = [];
  for (const event of (geojson?.features || [])) {
    const [lon, lat] = event.geometry.coordinates;
    const p = event.properties || {}, mag = finiteNumber(p.mag) ?? 2.5;
    const radiusKm = finiteNumber(p.bp_impact_radius_km) ?? estimateEarthquakeImpactRadiusKm(mag, p.bp_depth_km);
    const cachedBoundary = shakemapCache?.get(String(event.id));
    const actual = Array.isArray(cachedBoundary?.lines) && cachedBoundary.lines.length ? cachedBoundary.lines : null;
    const common = { event_id: String(event.id || ''), mag, estimated: !actual, radius_km: radiusKm };
    const estimatedRing = circleLine(lon, lat, radiusKm);
    const lines = actual || [[...estimatedRing, estimatedRing[0]]];
    const geometry = linesGeometry(lines);
    if (geometry) boundaries.push({ type: 'Feature', id: String(event.id) + '-boundary', geometry, properties: common });
    if (actual) {
      for (const line of actual) {
        if (line.length >= 4 && distanceKm(line[0], line[line.length - 1]) <= 5) {
          const polygon = polygonGeometryFromRing(line);
          if (polygon) areas.push({ type: 'Feature', id: String(event.id) + '-area', geometry: polygon, properties: common });
        }
      }
    } else {
      const ring = circleLine(lon, lat, radiusKm);
      const polygon = polygonGeometryFromRing(ring);
      if (polygon) areas.push({ type: 'Feature', id: String(event.id) + '-area', geometry: polygon, properties: common });
    }
  }
  return { areas: { type: 'FeatureCollection', features: areas }, boundaries: { type: 'FeatureCollection', features: boundaries } };
}

function stablePhase(id) {
  let h = 2166136261;
  for (const c of String(id || '')) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % 3400;
}

function buildRippleFrame(geojson, now, shakemapCache = null) {
  const features = [];
  for (const event of (geojson?.features || [])) {
    const [lon, lat] = event.geometry.coordinates, p = event.properties || {};
    const mag = finiteNumber(p.mag) ?? 2.5;
    const phase = ((now + stablePhase(event.id)) % 3400) / 3400;
    const origin = [lon, lat];
    let lines;
    const cachedBoundary = shakemapCache?.get(String(event.id));
    if (Array.isArray(cachedBoundary?.lines) && cachedBoundary.lines.length) {
      lines = cachedBoundary.lines.map(line => sampleLine(line, 40).map(point => interpolateGreatCircle(origin, point, phase)));
    } else {
      const radius = finiteNumber(p.bp_impact_radius_km) ?? estimateEarthquakeImpactRadiusKm(mag, p.bp_depth_km);
      const ring = circleLine(lon, lat, Math.max(0.6, radius * phase), 32);
      lines = [[...ring, ring[0]]];
    }
    const geometry = linesGeometry(lines);
    if (geometry) features.push({
      type: 'Feature', id: String(event.id) + '-ripple', geometry,
      properties: { mag, opacity: 0.16 + Math.sin(Math.PI * phase) * 0.78 }
    });
    const pulse = (phase + 0.22) % 1;
    features.push({
      type: 'Feature', id: String(event.id) + '-pulse', geometry: { type: 'Point', coordinates: origin },
      properties: { mag, scale: 0.78 + pulse * 1.6, opacity: 0.16 + Math.sin(Math.PI * pulse) * 0.32 }
    });
  }
  return { type: 'FeatureCollection', features };
}

async function fetchShakeMapBoundary(event, signal) {
  let detailUrl;
  try {
    detailUrl = new URL(String(event?.properties?.detail || ''));
    if (detailUrl.origin !== 'https://earthquake.usgs.gov' ||
        !detailUrl.pathname.startsWith('/earthquakes/feed/v1.0/detail/')) return null;
  } catch (_) { return null; }
  const options = { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'force-cache',
    headers: { Accept: 'application/json' }, signal };
  const response = await fetch(detailUrl.href, options);
  if (!response.ok) return null;
  const detail = await response.json();
  const products = Array.isArray(detail?.properties?.products?.shakemap) ? detail.properties.products.shakemap.slice() : [];
  products.sort((a, b) => Number(b?.properties?.updateTime || 0) - Number(a?.properties?.updateTime || 0));
  for (const product of products) {
    let contourUrl;
    try {
      contourUrl = new URL(String(product?.contents?.['download/cont_mmi.json']?.url || ''));
      if (contourUrl.origin !== 'https://earthquake.usgs.gov') continue;
    } catch (_) { continue; }
    const contourResponse = await fetch(contourUrl.href, options);
    if (!contourResponse.ok) continue;
    const payload = await contourResponse.json();
    const boundary = extractShakeMapImpactBoundary(payload, event.geometry.coordinates);
    if (boundary) return boundary;
  }
  return null;
}

/**
 * Validate and normalize the official feed without changing source locations,
 * event times, magnitudes, or depths. Only earthquake events at M2.5+ are kept.
 */
export function normalizeUSGSEarthquakeFeed(payload, maxFeatures = SEISMIC_MAX_FEATURES) {
  const input = Array.isArray(payload?.features) ? payload.features : [];
  const features = [];
  const seen = new Set();
  const cap = Math.max(0, Math.min(SEISMIC_MAX_FEATURES, Number(maxFeatures) || 0));

  for (const feature of input) {
    if (features.length >= cap) break;
    if (feature?.geometry?.type !== 'Point') continue;

    const coordinates = feature.geometry.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) continue;
    const longitude = finiteNumber(coordinates[0]);
    const latitude = finiteNumber(coordinates[1]);
    const depth = coordinates.length > 2 ? finiteNumber(coordinates[2]) : null;
    if (longitude === null || latitude === null ||
        longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) continue;

    const properties = feature.properties || {};
    const type = String(properties.type || 'earthquake').trim().toLowerCase();
    if (type !== 'earthquake') continue;
    const magnitude = finiteNumber(properties.mag);
    const time = finiteNumber(properties.time);
    if (magnitude === null || magnitude < 2.5 || time === null || time <= 0) continue;

    const id = String(feature.id || properties.code || properties.ids || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const safeProperties = {
      ...properties,
      mag: magnitude,
      time,
      place: String(properties.place || properties.title || 'Location not supplied by source'),
      type: 'earthquake'
    };
    if (depth !== null) safeProperties.bp_depth_km = depth;
    safeProperties.bp_impact_radius_km = estimateEarthquakeImpactRadiusKm(magnitude, depth, properties.mmi ?? properties.cdi);
    safeProperties.bp_impact_estimated = true;
    safeProperties.bp_impact_method = 'Magnitude/depth estimate';

    features.push({
      type: 'Feature',
      id,
      geometry: {
        type: 'Point',
        coordinates: depth === null ? [longitude, latitude] : [longitude, latitude, depth]
      },
      properties: safeProperties
    });
  }

  const generated = finiteNumber(payload?.metadata?.generated);
  return {
    type: 'FeatureCollection',
    metadata: {
      source: 'USGS ComCat',
      generated: generated !== null && generated > 0 ? generated : null,
      feedCount: finiteNumber(payload?.metadata?.count),
      eventCount: features.length,
      feedTitle: String(payload?.metadata?.title || 'USGS Magnitude 2.5+ Earthquakes, Past Week')
    },
    features
  };
}

function setText(node, value) {
  if (node) node.textContent = String(value ?? '');
}

function formatSourceTime(value) {
  const date = new Date(Number(value));
  if (!Number.isFinite(date.getTime())) return 'source time unavailable';
  try {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch (_) {
    return date.toISOString();
  }
}

function popupContent(feature) {
  const properties = feature?.properties || {};
  const coordinates = feature?.geometry?.coordinates || [];
  const magnitude = finiteNumber(properties.mag);
  const depth = finiteNumber(coordinates[2] ?? properties.bp_depth_km);
  const occurred = finiteNumber(properties.time);
  const root = document.createElement('div');
  root.style.cssText = 'min-width:190px;max-width:260px;color:#101820;font:12px/1.45 system-ui,sans-serif';
  const heading = document.createElement('strong');
  heading.style.cssText = 'display:block;font-size:14px;margin-bottom:5px';
  heading.textContent = 'M ' + (magnitude === null ? '—' : magnitude.toFixed(1)) + ' earthquake';
  root.appendChild(heading);

  const addLine = (label, value) => {
    const line = document.createElement('div');
    line.textContent = label + ': ' + String(value);
    root.appendChild(line);
  };
  addLine('Location', properties.place || 'Not supplied');
  addLine('Depth', depth === null ? 'Not supplied' : depth.toFixed(1) + ' km');
  const radius = finiteNumber(properties.bp_impact_radius_km);
  addLine('Affected-area radius', radius === null ? 'Unavailable' : 'about ' + radius.toFixed(0) + ' km');
  addLine('Boundary source', properties.bp_impact_estimated === false ? 'USGS ShakeMap MMI contour' : 'Magnitude/depth estimate; not a measured shaking contour');
  addLine('Origin time', occurred === null ? 'Not supplied' : new Date(occurred).toLocaleString());
  if (properties.status) addLine('Solution', properties.status);
  if (properties.alert) addLine('USGS alert', properties.alert);
  if (Number(properties.tsunami) === 1) addLine('Tsunami flag', 'USGS feed flag present');

  const url = String(properties.url || '');
  if (url.startsWith('https://earthquake.usgs.gov/earthquakes/eventpage/')) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open USGS event details';
    link.style.cssText = 'display:inline-block;margin-top:7px;color:#075b9a;font-weight:700';
    root.appendChild(link);
  }
  const attribution = document.createElement('small');
  attribution.style.cssText = 'display:block;margin-top:7px;color:#586570';
  attribution.textContent = 'Source: USGS ComCat';
  root.appendChild(attribution);
  return root;
}

function mapLayerSpecs() {
  const color = [
    'interpolate', ['linear'], ['get', 'mag'],
    2.5, '#57f3d2',
    3.5, '#f5ec67',
    4.5, '#ffab55',
    5.5, '#ff5369',
    7.5, '#dc63ff'
  ];
  return {
    impactFill: {
      id: IMPACT_FILL_LAYER_ID, type: 'fill', source: IMPACT_SOURCE_ID,
      paint: {
        'fill-color': ['case', ['get', 'estimated'], '#ffad59', color],
        'fill-opacity': ['case', ['get', 'estimated'], 0.075, 0.115],
        'fill-outline-color': 'rgba(255,255,255,0)'
      }
    },
    impactBoundary: {
      id: IMPACT_BOUNDARY_LAYER_ID, type: 'line', source: IMPACT_BOUNDARY_SOURCE_ID,
      paint: {
        'line-color': ['case', ['get', 'estimated'], '#ffc06a', color],
        'line-width': ['interpolate', ['linear'], ['get', 'mag'], 2.5, 1.15, 5.5, 2, 8, 3.1],
        'line-opacity': ['case', ['get', 'estimated'], 0.82, 0.98],
        'line-blur': 0.25
      }
    },
    ripples: {
      id: RIPPLE_LAYER_ID, type: 'line', source: RIPPLE_SOURCE_ID,
      paint: {
        'line-color': color,
        'line-width': ['interpolate', ['linear'], ['get', 'mag'], 2.5, 1.25, 5.5, 2.3, 8, 3.6],
        'line-opacity': ['get', 'opacity'],
        'line-blur': 1.2
      }
    },
    pulse: {
      id: PULSE_LAYER_ID, type: 'circle', source: RIPPLE_SOURCE_ID,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-color': color,
        'circle-radius': ['*', ['interpolate', ['linear'], ['get', 'mag'], 2.5, 8, 5.5, 15, 8, 22], ['get', 'scale']],
        'circle-opacity': ['get', 'opacity'],
        'circle-blur': 0.86,
        'circle-stroke-color': color,
        'circle-stroke-width': 1.4
      }
    },
    glow: {
      id: GLOW_LAYER_ID, type: 'circle', source: SOURCE_ID,
      paint: {
        'circle-color': color,
        'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 2.5, 7, 4.5, 11, 6.5, 16, 8.5, 22],
        'circle-blur': 0.72,
        'circle-opacity': 0.22
      }
    },
    points: {
      id: POINT_LAYER_ID, type: 'circle', source: SOURCE_ID,
      paint: {
        'circle-color': color,
        'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 2.5, 2.7, 4.5, 4.6, 6.5, 7.2, 8.5, 10],
        'circle-stroke-color': '#07131d',
        'circle-stroke-width': 1.1,
        'circle-opacity': 0.96
      }
    }
  };
}

function ensureControlMount() {
  let slot = document.getElementById('bpv-seismic-slot');
  if (slot) return slot;

  const anchor = document.getElementById('bpv-underground-slot') ||
    document.getElementById('bpv-satellite-slot');
  if (!anchor?.parentNode) return null;

  slot = document.createElement('div');
  slot.id = 'bpv-seismic-slot';
  slot.className = 'bpv-command-inline-slot';
  slot.setAttribute('aria-label', 'USGS seismic activity layer control');
  anchor.insertAdjacentElement('afterend', slot);
  return slot;
}

function mountControl(state) {
  const slot = ensureControlMount();
  if (!slot) return false;
  if (slot.querySelector('[data-bp-seismic-toggle]')) {
    state.button = slot.querySelector('[data-bp-seismic-toggle]');
    state.labelNode = slot.querySelector('[data-bp-seismic-label]');
    state.statusNode = slot.querySelector('[data-bp-seismic-status]');
    return true;
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;gap:4px;width:100%;margin-top:6px';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bpv-command-btn bp-seismic-toggle';
  button.dataset.bpSeismicToggle = '1';
  button.dataset.bpvAction = 'earthquakes';
  button.dataset.bpLayerToggle = '1';
  button.setAttribute('aria-pressed', 'false');
  button.title = 'Show named earthquakes reported by USGS ComCat during the latest seven days';
  const icon = document.createElement('span');
  icon.className = 'bpv-command-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '〰';
  const label = document.createElement('span');
  label.className = 'bpv-command-label';
  label.dataset.bpSeismicLabel = '1';
  label.textContent = 'Named earthquakes · OFF';
  button.append(icon, label);

  const status = document.createElement('small');
  status.dataset.bpSeismicStatus = '1';
  status.style.cssText = 'display:block;padding:0 4px 3px;color:#8da6b3;font:700 8px/1.45 system-ui,sans-serif;letter-spacing:.055em';
  status.textContent = 'M2.5+ · PAST 7 DAYS · SOURCE OFF';
  wrapper.append(button, status);
  slot.appendChild(wrapper);

  button.addEventListener('click', () => {
    void state.setEnabled(!state.enabled);
  });
  state.button = button;
  state.labelNode = label;
  state.statusNode = status;
  state.wrapper = wrapper;
  return true;
}

function syncControl(state) {
  if (!state.button) mountControl(state);
  if (state.button) {
    state.button.setAttribute('aria-pressed', String(!!state.enabled));
    state.button.classList.toggle('active', !!state.enabled);
    if (state.labelNode) {
      setText(state.labelNode, 'Named earthquakes · ' + (state.enabled ? 'ON' : 'OFF'));
    }
    state.button.disabled = !!state.busyToggle;
  }
  if (state.statusNode) setText(state.statusNode, state.statusText);
}

export function initUSGSSeismicLayer(world) {
  const map = world?.map || world;
  if (!map || typeof map.addSource !== 'function' || typeof map.addLayer !== 'function') {
    return null;
  }

  const existing = window[GLOBAL_KEY];
  if (existing?.map === map) return existing;

  const state = {
    version: 2,
    map,
    source: 'USGS_COMCAT_GEOJSON_M2_5_PAST_7_DAYS',
    feedUrl: SEISMIC_FEED_URL,
    minMagnitude: 2.5,
    periodDays: 7,
    refreshIntervalMs: SEISMIC_REFRESH_MS,
    enabled: false,
    status: 'off',
    statusText: 'M2.5+ · PAST 7 DAYS · SOURCE OFF',
    eventCount: 0,
    feedGeneratedAt: null,
    lastSuccessAt: null,
    lastError: null,
    lastGoodGeojson: null,
    impactCollections: { areas: EMPTY, boundaries: EMPTY },
    rippleGeojson: EMPTY,
    inFlight: false,
    busyToggle: false,
    interactionsBound: false,
    errorCount: 0,
    nextRetryAt: 0,
    timer: null,
    rippleFrame: null,
    lastRippleFrameAt: 0,
    shakemapCache: new Map(),
    enrichmentController: null,
    enrichmentTimer: null,
    retryTimer: null,
    mountObserver: null,
    disposed: false,
    requestSequence: 0,
    activeController: null,
    button: null,
    labelNode: null,
    statusNode: null,
    setEnabled: null,
    refresh: null
  };
  window[GLOBAL_KEY] = state;

  const updateStatus = (status, message) => {
    state.status = status;
    state.statusText = message;
    syncControl(state);
    window[GLOBAL_KEY] = state;
  };

  const setVisibility = visible => {
    for (const id of [IMPACT_FILL_LAYER_ID, IMPACT_BOUNDARY_LAYER_ID, RIPPLE_LAYER_ID, PULSE_LAYER_ID, GLOW_LAYER_ID, POINT_LAYER_ID]) {
      if (!map.getLayer?.(id)) continue;
      try { map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'); } catch (_) {}
    }
  };

  const addMapLayers = () => {
    if (!map.getStyle?.()) throw new Error('MAP_STYLE_NOT_READY');

    if (!map.getSource?.(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: state.lastGoodGeojson || EMPTY,
        maxzoom: 14,
        buffer: 64,
        tolerance: 0.375
      });
    }
    if (!map.getSource?.(IMPACT_SOURCE_ID)) map.addSource(IMPACT_SOURCE_ID, {
      type: 'geojson', data: state.impactCollections?.areas || EMPTY, maxzoom: 14, buffer: 64
    });
    if (!map.getSource?.(IMPACT_BOUNDARY_SOURCE_ID)) map.addSource(IMPACT_BOUNDARY_SOURCE_ID, {
      type: 'geojson', data: state.impactCollections?.boundaries || EMPTY, maxzoom: 14, buffer: 64
    });
    if (!map.getSource?.(RIPPLE_SOURCE_ID)) map.addSource(RIPPLE_SOURCE_ID, {
      type: 'geojson', data: state.rippleGeojson || EMPTY, maxzoom: 14, buffer: 64
    });
    const specs = mapLayerSpecs();
    if (!map.getLayer?.(IMPACT_FILL_LAYER_ID)) map.addLayer(specs.impactFill);
    if (!map.getLayer?.(IMPACT_BOUNDARY_LAYER_ID)) map.addLayer(specs.impactBoundary);
    if (!map.getLayer?.(RIPPLE_LAYER_ID)) map.addLayer(specs.ripples);
    if (!map.getLayer?.(PULSE_LAYER_ID)) map.addLayer(specs.pulse);
    if (!map.getLayer?.(GLOW_LAYER_ID)) map.addLayer(specs.glow);
    if (!map.getLayer?.(POINT_LAYER_ID)) map.addLayer(specs.points);
    setVisibility(!!state.enabled);
    // MapLibre validates layer-scoped event listeners immediately. Bind only
    // after the opt-in source/layers have actually been installed.
    if (!state.interactionsBound) {
      map.on?.('click', POINT_LAYER_ID, showPopup);
      map.on?.('mouseenter', POINT_LAYER_ID, onPointerEnter);
      map.on?.('mouseleave', POINT_LAYER_ID, onPointerLeave);
      state.interactionsBound = true;
    }
  };

  const showPopup = event => {
    const feature = event?.features?.[0];
    if (!feature) return;
    const Popup = window.maplibregl?.Popup;
    if (typeof Popup !== 'function') return;
    try {
      new Popup({ closeButton: true, closeOnClick: true, maxWidth: '290px' })
        .setLngLat(event.lngLat)
        .setDOMContent(popupContent(feature))
        .addTo(map);
    } catch (error) {
      console.warn('BridgePoint seismic event popup unavailable', error);
    }
  };
  const onPointerEnter = () => {
    try { map.getCanvas().style.cursor = 'pointer'; } catch (_) {}
  };
  const onPointerLeave = () => {
    try { map.getCanvas().style.cursor = ''; } catch (_) {}
  };
  const onStyleData = () => {
    if (!state.enabled || state.disposed || state.installing) return;
    if (map.getSource?.(SOURCE_ID) && map.getSource?.(IMPACT_SOURCE_ID) && map.getSource?.(IMPACT_BOUNDARY_SOURCE_ID) && map.getSource?.(RIPPLE_SOURCE_ID) &&
        map.getLayer?.(IMPACT_FILL_LAYER_ID) && map.getLayer?.(IMPACT_BOUNDARY_LAYER_ID) &&
        map.getLayer?.(RIPPLE_LAYER_ID) && map.getLayer?.(PULSE_LAYER_ID) &&
        map.getLayer?.(GLOW_LAYER_ID) && map.getLayer?.(POINT_LAYER_ID)) return;
    state.installing = true;
    try {
      addMapLayers();
      if (state.lastGoodGeojson) map.getSource(SOURCE_ID)?.setData(state.lastGoodGeojson);
      if (state.impactCollections) {
        map.getSource(IMPACT_SOURCE_ID)?.setData(state.impactCollections.areas);
        map.getSource(IMPACT_BOUNDARY_SOURCE_ID)?.setData(state.impactCollections.boundaries);
      }
      if (state.rippleGeojson) map.getSource(RIPPLE_SOURCE_ID)?.setData(state.rippleGeojson);
    } catch (_) {
      // The next style event or timed retry will try again.
    } finally {
      state.installing = false;
    }
  };

  map.on?.('styledata', onStyleData);

  const applyCachedShakeMaps = geojson => {
    for (const feature of geojson.features) {
      const cached = state.shakemapCache.get(String(feature.id));
      if (!cached) continue;
      feature.properties.bp_impact_radius_km = cached.radiusKm;
      feature.properties.bp_impact_estimated = false;
      feature.properties.bp_impact_method = 'USGS ShakeMap MMI contour' +
        (cached.contourLevel === null ? '' : ' MMI ' + cached.contourLevel);
    }
  };

  const enrichShakeMaps = async (geojson, sequence) => {
    if (!state.enabled || state.disposed) return;
    try { state.enrichmentController?.abort(); } catch (_) {}
    if (state.enrichmentTimer) window.clearTimeout(state.enrichmentTimer);
    const controller = new AbortController();
    state.enrichmentController = controller;
    state.enrichmentTimer = window.setTimeout(() => controller.abort(), 20_000);
    const candidates = geojson.features
      .filter(feature => finiteNumber(feature.properties?.mag) >= 4.5 &&
        String(feature.properties?.detail || '').startsWith('https://earthquake.usgs.gov/'))
      .sort((a, b) => Number(b.properties.mag) - Number(a.properties.mag))
      .slice(0, 24);
    const pending = candidates.filter(feature => !state.shakemapCache.has(String(feature.id)));
    const workers = Array.from({ length: 2 }, async () => {
      while (pending.length && !controller.signal.aborted && state.enabled && !state.disposed) {
        const feature = pending.shift();
        if (!feature) break;
        try {
          const boundary = await fetchShakeMapBoundary(feature, controller.signal);
          state.shakemapCache.set(String(feature.id), boundary || null);
        } catch (_) {
          if (!controller.signal.aborted) state.shakemapCache.set(String(feature.id), null);
        }
        const cached = state.shakemapCache.get(String(feature.id));
        if (cached && state.enabled && !state.disposed && sequence === state.requestSequence) {
          feature.properties.bp_impact_radius_km = cached.radiusKm;
          feature.properties.bp_impact_estimated = false;
          feature.properties.bp_impact_method = 'USGS ShakeMap MMI contour' +
            (cached.contourLevel === null ? '' : ' MMI ' + cached.contourLevel);
          state.lastGoodGeojson = geojson;
          state.impactCollections = buildImpactCollections(geojson, state.shakemapCache);
          map.getSource?.(IMPACT_SOURCE_ID)?.setData(state.impactCollections.areas);
      map.getSource?.(IMPACT_BOUNDARY_SOURCE_ID)?.setData(state.impactCollections.boundaries);
          map.getSource?.(SOURCE_ID)?.setData(geojson);
        }
      }
    });
    await Promise.all(workers);
    if (state.enrichmentController === controller) state.enrichmentController = null;
    if (state.enrichmentTimer) window.clearTimeout(state.enrichmentTimer);
    state.enrichmentTimer = null;
  };

  const startRippleAnimation = () => {
    if (state.rippleFrame !== null || !state.enabled || state.disposed) return;
    const animate = now => {
      if (!state.enabled || state.disposed || document.hidden) {
        state.rippleFrame = null;
        return;
      }
      if (now - state.lastRippleFrameAt >= RIPPLE_FRAME_INTERVAL_MS) {
        state.lastRippleFrameAt = now;
        state.rippleGeojson = buildRippleFrame(state.lastGoodGeojson, Date.now(), state.shakemapCache);
        map.getSource?.(RIPPLE_SOURCE_ID)?.setData(state.rippleGeojson);
      }
      state.rippleFrame = window.requestAnimationFrame(animate);
    };
    state.rippleFrame = window.requestAnimationFrame(animate);
  };

  const stopRippleAnimation = () => {
    if (state.rippleFrame !== null) {
      window.cancelAnimationFrame(state.rippleFrame);
      state.rippleFrame = null;
    }
  };

  const refresh = async ({ manual = false } = {}) => {
    if (!state.enabled || state.disposed || state.inFlight || document.hidden) return false;
    if (!manual && Date.now() < state.nextRetryAt) return false;
    state.inFlight = true;
    const sequence = ++state.requestSequence;
    const controller = new AbortController();
    state.activeController = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(SEISMIC_FEED_URL, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        headers: { Accept: 'application/geo+json, application/json' },
        signal: controller.signal
      });
      if (!response.ok) throw new Error('USGS_HTTP_' + response.status);
      const payload = await response.json();
      const geojson = normalizeUSGSEarthquakeFeed(payload);
      if (!state.enabled || state.disposed || sequence !== state.requestSequence) return false;
      applyCachedShakeMaps(geojson);

      const source = map.getSource?.(SOURCE_ID);
      if (!source?.setData) throw new Error('SEISMIC_MAP_SOURCE_NOT_READY');
      source.setData(geojson);
      state.impactCollections = buildImpactCollections(geojson, state.shakemapCache);
      map.getSource?.(IMPACT_SOURCE_ID)?.setData(state.impactCollections.areas);
      map.getSource?.(IMPACT_BOUNDARY_SOURCE_ID)?.setData(state.impactCollections.boundaries);
      state.lastGoodGeojson = geojson;
      startRippleAnimation();
      void enrichShakeMaps(geojson, sequence);
      state.eventCount = geojson.features.length;
      state.feedGeneratedAt = geojson.metadata.generated;
      state.lastSuccessAt = Date.now();
      state.lastError = null;
      state.errorCount = 0;
      state.nextRetryAt = 0;
      const timeLabel = formatSourceTime(state.feedGeneratedAt || state.lastSuccessAt);
      updateStatus('live', state.eventCount + ' EVENTS · USGS FEED ' + timeLabel);
      return true;
    } catch (error) {
      if (!state.enabled || state.disposed || sequence !== state.requestSequence) return false;
      state.lastError = String(error?.message || error).slice(0, 180);
      state.errorCount += 1;
      const backoff = Math.min(300_000, 30_000 * Math.pow(2, Math.min(4, state.errorCount - 1)));
      state.nextRetryAt = Date.now() + backoff;
      if (state.lastGoodGeojson) {
        updateStatus('stale', 'SOURCE DELAY · KEEPING ' + state.eventCount + ' LAST VALID EVENTS');
      } else {
        updateStatus('unavailable', 'USGS FEED UNAVAILABLE · RETRYING');
      }
      console.warn('BridgePoint USGS seismic feed unavailable', state.lastError);
      return false;
    } finally {
      window.clearTimeout(timeout);
      if (state.activeController === controller) state.activeController = null;
      state.inFlight = false;
    }
  };

  const scheduleStyleRetry = () => {
    if (state.retryTimer || state.disposed || !state.enabled) return;
    state.retryTimer = window.setTimeout(() => {
      state.retryTimer = null;
      if (!state.enabled || state.disposed) return;
      try {
        addMapLayers();
        if (state.lastGoodGeojson) map.getSource(SOURCE_ID)?.setData(state.lastGoodGeojson);
        void refresh({ manual: true });
      } catch (_) {
        scheduleStyleRetry();
      }
    }, 1400);
  };

  const setEnabled = async nextValue => {
    const next = !!nextValue;
    if (state.disposed || state.enabled === next || state.busyToggle) return state.enabled;
    state.busyToggle = true;
    state.enabled = next;
    state.requestSequence += 1;
    syncControl(state);

    if (!next) {
      try { state.activeController?.abort(); } catch (_) {}
      try { state.enrichmentController?.abort(); } catch (_) {}
      state.activeController = null;
      state.enrichmentController = null;
      if (state.enrichmentTimer) window.clearTimeout(state.enrichmentTimer);
      state.enrichmentTimer = null;
      stopRippleAnimation();
      if (state.timer) window.clearInterval(state.timer);
      if (state.retryTimer) window.clearTimeout(state.retryTimer);
      state.timer = null;
      state.retryTimer = null;
      setVisibility(false);
      updateStatus('off', 'M2.5+ · PAST 7 DAYS · SOURCE OFF');
      state.busyToggle = false;
      syncControl(state);
      return false;
    }

    state.nextRetryAt = 0;
    updateStatus('loading', 'CONNECTING TO USGS COMCAT…');
    try {
      addMapLayers();
      if (state.lastGoodGeojson) map.getSource(SOURCE_ID)?.setData(state.lastGoodGeojson);
      if (state.impactCollections) {
        map.getSource(IMPACT_SOURCE_ID)?.setData(state.impactCollections.areas);
        map.getSource(IMPACT_BOUNDARY_SOURCE_ID)?.setData(state.impactCollections.boundaries);
      }
      if (state.rippleGeojson) map.getSource(RIPPLE_SOURCE_ID)?.setData(state.rippleGeojson);
      setVisibility(true);
      if (state.lastGoodGeojson) {
        state.rippleGeojson = buildRippleFrame(state.lastGoodGeojson, Date.now(), state.shakemapCache);
        map.getSource?.(RIPPLE_SOURCE_ID)?.setData(state.rippleGeojson);
      }
      startRippleAnimation();
      state.timer = window.setInterval(() => { void refresh(); }, SEISMIC_REFRESH_MS);
      state.busyToggle = false;
      syncControl(state);
      void refresh({ manual: true });
      return true;
    } catch (error) {
      state.busyToggle = false;
      state.status = 'waiting-for-map';
      updateStatus('waiting-for-map', 'WAITING FOR MAP STYLE · WILL RETRY');
      scheduleStyleRetry();
      syncControl(state);
      return false;
    }
  };

  state.setEnabled = setEnabled;
  state.refresh = refresh;
  state.mountPending = !mountControl(state);
  if (state.mountPending && typeof MutationObserver === 'function') {
    state.mountObserver = new MutationObserver(() => {
      if (mountControl(state)) {
        state.mountObserver?.disconnect();
        state.mountObserver = null;
        state.mountPending = false;
        syncControl(state);
      }
    });
    try {
      state.mountObserver.observe(document.body, { childList: true, subtree: true });
      window.setTimeout(() => {
        state.mountObserver?.disconnect();
        state.mountObserver = null;
        state.mountPending = false;
      }, 20_000);
    } catch (_) {}
  }

  const onVisibilityChange = () => {
    if (!document.hidden && state.enabled) {
      startRippleAnimation();
      void refresh({ manual: true });
    } else {
      stopRippleAnimation();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });

  map.on?.('remove', () => {
    state.disposed = true;
    state.enabled = false;
    state.requestSequence += 1;
    if (state.timer) window.clearInterval(state.timer);
    if (state.retryTimer) window.clearTimeout(state.retryTimer);
    try { state.activeController?.abort(); } catch (_) {}
    try { state.enrichmentController?.abort(); } catch (_) {}
    if (state.enrichmentTimer) window.clearTimeout(state.enrichmentTimer);
    stopRippleAnimation();
    state.mountObserver?.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (state.interactionsBound) {
      map.off?.('click', POINT_LAYER_ID, showPopup);
      map.off?.('mouseenter', POINT_LAYER_ID, onPointerEnter);
      map.off?.('mouseleave', POINT_LAYER_ID, onPointerLeave);
      state.interactionsBound = false;
    }
    map.off?.('styledata', onStyleData);
    if (window[GLOBAL_KEY] === state) window[GLOBAL_KEY] = null;
  });

  updateStatus('off', 'M2.5+ · PAST 7 DAYS · SOURCE OFF');
  return state;
}
