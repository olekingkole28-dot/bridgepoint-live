// BridgePoint Water & Hydrology GPU surface v6113.
// Additive MapLibre custom layer: one shared map canvas/context, bounded source geometry,
// GPU wave displacement, source-gated flood elevations, and view-aware mesh LOD.
const VERSION = 6113;
const LAYER_ID = 'bp-water-surface-gpu-v6113';
const EARTH_CIRCUMFERENCE_M = 40075016.68557849;
const RAD = Math.PI / 180;
const MIN_VALID_TERRAIN_ELEVATION_M = -500;
const MAX_VALID_TERRAIN_ELEVATION_M = 8900;
const MAX_VALID_INLAND_WATER_ELEVATION_M = 6000;
// High-altitude water remains available from the native basemap until its water-surface
// datum is corroborated; this cap is for the additive animated overlay only.
const MAX_CUSTOM_INLAND_WATER_SURFACE_ELEVATION_M = 250;
const MAX_VALID_MARINE_SURFACE_OFFSET_M = 15;
const SHORELINE_GUARD_ZOOM = 12;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const finite = v => Number.isFinite(Number(v));
const text = v => String(v == null ? '' : v).toLowerCase();
const mod1 = x => ((x % 1) + 1) % 1;

function mercX(lng) { return (Number(lng) + 180) / 360; }
function mercY(lat) {
  const p = clamp(Number(lat), -85.05112878, 85.05112878) * RAD;
  return 0.5 - Math.log((1 + Math.sin(p)) / (1 - Math.sin(p))) / (4 * Math.PI);
}
function unmercY(y) {
  return Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) / RAD;
}
function wrapLon(lng) {
  let n = (Number(lng) + 180) % 360;
  if (n < 0) n += 360;
  return n - 180;
}
function geometryOf(row) {
  let g = row && (row.geometry || row.geometry_geojson || row.geojson);
  if (typeof g === 'string') { try { g = JSON.parse(g); } catch (_) { return null; } }
  if (g && g.type === 'Feature') g = g.geometry;
  return g && g.type && g.coordinates ? g : null;
}
function allCoords(value, visit) {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && finite(value[0]) && finite(value[1])) { visit(Number(value[0]), Number(value[1])); return; }
  for (const item of value) allCoords(item, visit);
}
function prepareFeature(row) {
  const geometry = geometryOf(row);
  if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) return null;
  const props = row.properties || row;
  const parts = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  allCoords(geometry.coordinates, (x, y) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  });
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
  return { row, props, parts, bbox: [minX, minY, maxX, maxY] };
}
function pointInRing(lng, lat, ring) {
  let inside = false;
  if (!ring || ring.length < 3) return false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i][0]), yi = Number(ring[i][1]);
    const xj = Number(ring[j][0]), yj = Number(ring[j][1]);
    const crosses = ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi);
    if (crosses) inside = !inside;
  }
  return inside;
}
function featureContains(feature, lng, lat) {
  const b = feature.bbox;
  if (lng < b[0] - 1e-7 || lng > b[2] + 1e-7 || lat < b[1] - 1e-7 || lat > b[3] + 1e-7) return false;
  for (const rings of feature.parts) {
    if (!rings || !rings.length || !pointInRing(lng, lat, rings[0])) continue;
    let hole = false;
    for (let i = 1; i < rings.length; i++) if (pointInRing(lng, lat, rings[i])) { hole = true; break; }
    if (!hole) return true;
  }
  return false;
}
function featureIntersectsBounds(feature, bounds) {
  if (!bounds) return true;
  const [minLng, minLat, maxLng, maxLat] = feature.bbox;
  const top = mercY(maxLat), bottom = mercY(minLat), pad = 0.025;
  if (bottom < bounds.y0 - pad || top > bounds.y1 + pad) return false;
  if (maxLng - minLng > 300) return true;
  const fx0 = (minLng + 180) / 360, fx1 = (maxLng + 180) / 360;
  for (const shift of [-1, 0, 1]) {
    if (fx1 + shift >= bounds.x0 - pad && fx0 + shift <= bounds.x1 + pad) return true;
  }
  return false;
}
function sourceFeatures(map, sourceLayer, limit, bounds) {
  try {
    if (!map.getSource('ofm')) return [];
    const raw = map.querySourceFeatures('ofm', { sourceLayer });
    const prepared = [];
    for (const row of raw || []) {
      if (!row || typeof row !== 'object') continue;
      const item = prepareFeature(row);
      if (!item || !featureIntersectsBounds(item, bounds)) continue;
      if (prepared.length >= limit) break;
      prepared.push(item);
    }
    return prepared;
  } catch (_) { return []; }
}
function marineFeature(feature) {
  const p = feature.props || {};
  const labels = text([p.class, p.kind, p.water, p.natural, p.type, p.name].filter(Boolean).join(' '));
  if (/\b(ocean|sea|bay|gulf|strait|sound|estuary|open water)\b/.test(labels)) return true;
  const b = feature.bbox;
  // A large, sea-like area with generic tile properties is treated as sea level, never seabed.
  return (b[2] - b[0] > 2.5 || b[3] - b[1] > 1.8) && (b[2] - b[0]) * (b[3] - b[1]) > 1.6;
}
function featureDepth(feature) {
  const p = feature.props || {};
  for (const key of ['depth_m', 'flood_depth_m', 'water_depth_m', 'inundation_depth_m']) {
    const v = Number(p[key]);
    if (Number.isFinite(v) && v > 0 && v <= 12) return v;
  }
  return 0;
}
function collectDepthFeatures(scene, bounds) {
  const out = [];
  for (const row of scene.flood_depths || []) {
    const f = prepareFeature(row);
    const depth = f && featureDepth(f);
    if (f && depth > 0 && featureIntersectsBounds(f, bounds)) { f.depth = depth; out.push(f); }
    if (out.length >= 160) break;
  }
  return out;
}
function absoluteWaterLevelAt(scene, lng, lat) {
  let best = null, bestD = Infinity;
  for (const row of scene.water_levels || []) {
    if (!row || typeof row !== 'object') continue;
    const p = row.properties && typeof row.properties === 'object' ? row.properties : row;
    // Keep absolute inland elevations distinct from sea-surface offsets. A corrupt or
    // mismatched vertical datum must never become a kilometre-scale water surface.
    let h = null, isSeaSurfaceOffset = false;
    if (p.water_surface_elevation_m != null) h = Number(p.water_surface_elevation_m);
    else if (p.surface_elevation_msl != null) h = Number(p.surface_elevation_msl);
    else if (p.sea_surface_height_m != null) {
      h = Number(p.sea_surface_height_m);
      isSeaSurfaceOffset = true;
    } else continue;
    const maxAllowed = isSeaSurfaceOffset ? MAX_VALID_MARINE_SURFACE_OFFSET_M : MAX_VALID_INLAND_WATER_ELEVATION_M;
    if (!Number.isFinite(h) || h < (isSeaSurfaceOffset ? -MAX_VALID_MARINE_SURFACE_OFFSET_M : MIN_VALID_TERRAIN_ELEVATION_M) ||
        h > maxAllowed) {
      apiWaterLevelReject(scene);
      continue;
    }
    const x = Number(row.lng ?? row.longitude ?? p.lng ?? p.longitude);
    const y = Number(row.lat ?? row.latitude ?? p.lat ?? p.latitude);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const dx = wrapLon(x - lng) * Math.cos(lat * RAD);
    const dy = y - lat;
    const d = Math.hypot(dx, dy);
    if (d < bestD) { bestD = d; best = h; }
  }
  // A gauge several kilometres away may belong to another river, lake or elevation
  // regime. Prefer a conservative default over projecting that level across land.
  return bestD <= 0.03 ? best : null;
}
function apiWaterLevelReject(scene) {
  // Keep a lightweight per-build diagnostic without changing the source weather object.
  if (window.__BP_WATER_ENGINE_V6113__ && Number.isFinite(window.__BP_WATER_ENGINE_V6113__.rejectedWaterLevelSamples)) {
    window.__BP_WATER_ENGINE_V6113__.rejectedWaterLevelSamples++;
  }
}

function coordsOfPoint(row) {
  const p = row && (row.properties || row);
  const g = geometryOf(row);
  if (g && g.type === 'Point') return { lng: Number(g.coordinates[0]), lat: Number(g.coordinates[1]), props: p };
  const lng = Number(row && (row.lng ?? row.longitude ?? (p && (p.lng ?? p.longitude))));
  const lat = Number(row && (row.lat ?? row.latitude ?? (p && (p.lat ?? p.latitude))));
  return Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat, props: p } : null;
}
function stormSignals(scene) {
  const out = [];
  for (const row of scene.storms || []) {
    const c = coordsOfPoint(row);
    if (!c) continue;
    const p = c.props || {};
    const label = text([p.name, p.event, p.type, p.classification, p.status, p.storm_type].filter(Boolean).join(' '));
    if (/\b(tornado|waterspout|earthquake)\b/.test(label)) continue;
    const cyclone = /\b(hurricane|typhoon|cyclone|tropical storm|tropical depression|tropical cyclone)\b/.test(label) ||
      p.is_tropical_cyclone === true || p.is_hurricane === true || p.is_typhoon === true;
    if (!cyclone) continue;
    const mphRaw = Number(p.max_wind_mph ?? p.wind_speed_mph ?? p.max_wind_speed_mph ?? p.wind_mph);
    const ktRaw = Number(p.max_wind_kt ?? p.wind_speed_kt ?? p.max_wind_speed_kt);
    let mph = Number.isFinite(mphRaw) && mphRaw > 0 ? mphRaw : (Number.isFinite(ktRaw) && ktRaw > 0 ? ktRaw * 1.15078 : 0);
    const catRaw = Number(p.category ?? p.saffir_simpson_category);
    const intensity = clamp(mph > 0 ? mph / 120 : (Number.isFinite(catRaw) ? 0.45 + catRaw * 0.13 : 0.58), 0.25, 1.6);
    const radiusKmRaw = Number(p.storm_radius_km ?? p.radius_km ?? p.wind_radius_km ?? p.gale_radius_km);
    const radiusM = clamp(Number.isFinite(radiusKmRaw) && radiusKmRaw > 0 ? radiusKmRaw * 1000 : 180000, 25000, 550000);
    out.push({ lng: wrapLon(c.lng), lat: clamp(c.lat, -85, 85), x: mod1(mercX(c.lng)), y: mercY(c.lat), radiusM, intensity, mph, name: String(p.name || p.event || 'Cyclone') });
  }
  out.sort((a, b) => b.intensity - a.intensity);
  return out.slice(0, 4);
}
function nearestWind(scene, lng, lat) {
  let best = null, bestD = Infinity;
  for (const row of scene.observations || []) {
    if (!row || typeof row !== 'object') continue;
    const p = row.properties && typeof row.properties === 'object' ? row.properties : row;
    const x = Number(row.lng ?? row.longitude ?? p.lng ?? p.longitude);
    const y = Number(row.lat ?? row.latitude ?? p.lat ?? p.latitude);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const kt = Number(p.wind_speed_kt);
    const mphRaw = Number(p.wind_speed_mph ?? p.wind_mph);
    const mph = Number.isFinite(mphRaw) ? mphRaw : (Number.isFinite(kt) ? kt * 1.15078 : 0);
    const dx = wrapLon(x - lng) * Math.cos(lat * RAD), dy = y - lat;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = { mph: clamp(mph, 0, 180), direction: clamp(Number(p.wind_dir_deg) || 0, 0, 360) }; }
  }
  return best || { mph: 0, direction: 0 };
}
function lineParts(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [geometry.coordinates || []];
  if (geometry.type === 'MultiLineString') return geometry.coordinates || [];
  return [];
}
function featureWaterwayWidth(feature) {
  const p = feature && typeof feature === 'object'
    ? (feature.properties && typeof feature.properties === 'object' ? feature.properties : feature)
    : {};
  const cls = text([p.class, p.waterway, p.type, p.natural].filter(Boolean).join(' '));
  const parsed = parseFloat(String(p.width || '').replace(',', '.'));
  if (Number.isFinite(parsed) && parsed > 0) return clamp(parsed, 1, 36);
  if (/river/.test(cls)) return 14;
  if (/canal|fairway|dock/.test(cls)) return 8;
  if (/ditch|drain/.test(cls)) return 1.6;
  return 3.2;
}

function buildShaders(gl, shaderDescription) {
  const vertexSource = [
    '#version 300 es',
    shaderDescription.vertexShaderPrelude,
    shaderDescription.define,
    'precision highp float;',
    'in vec2 a_pos;',
    'in float a_height;',
    'in float a_kind;',
    'in vec2 a_flow;',
    'in float a_flood;',
    'uniform float u_time;',
    'uniform vec2 u_waveOrigin;',
    'uniform float u_wavePhaseA;',
    'uniform float u_wavePhaseB;',
    'uniform float u_waveK;',
    'uniform float u_flowCycles;',
    'uniform float u_waveAmp;',
    'uniform float u_windSpeed;',
    'uniform vec2 u_windDir;',
    'uniform vec4 u_storms[4];',
    'out vec2 v_coord;',
    'out float v_kind;',
    'out float v_wave;',
    'out float v_storm;',
    'out vec2 v_flow;',
    'out float v_flood;',
    'out float v_streamPhaseOffset;',
    'void main() {',
    '  float lat = atan(sinh(3.141592653589793 * (1.0 - 2.0 * a_pos.y)));',
    '  float cLat = max(0.12, cos(lat));',
    '  vec2 ground = (a_pos - u_waveOrigin) * (40075016.6856 * cLat);',
    '  vec2 windDir = length(u_windDir) > 0.001 ? normalize(u_windDir) : vec2(1.0, 0.0);',
    '  float phaseA = dot(ground, windDir) * u_waveK + u_wavePhaseA - u_time * (0.48 + u_windSpeed * 0.014);',
    '  vec2 dirB = normalize(windDir + vec2(0.52, 0.31));',
    '  float phaseB = dot(ground, dirB) * u_waveK * 0.61 + u_wavePhaseB + u_time * 0.33;',
    '  float wave = 0.63 * sin(phaseA) + 0.25 * sin(phaseA * 1.91 + 0.71) + 0.18 * sin(phaseB);',
    '  float stormInfluence = 0.0;',
    '  float stormSurge = 0.0;',
    '  for (int i = 0; i < 4; i++) {',
    '    if (u_storms[i].w > 0.0) {',
    '      float dx = a_pos.x - u_storms[i].x;',
    '      dx -= floor(dx + 0.5);',
    '      float dy = a_pos.y - u_storms[i].y;',
    '      float distanceM = length(vec2(dx, dy)) * 40075016.6856 * cLat;',
    '      float radiusM = max(25000.0, u_storms[i].z);',
    '      float influence = exp(-distanceM / (radiusM * 1.8));',
    '      stormInfluence = max(stormInfluence, influence * u_storms[i].w);',
    '      stormSurge = max(stormSurge, influence * min(3.2, 0.55 + u_storms[i].w * 1.65));',
    '    }',
    '  }',
    '  float localScale = a_kind < 0.5 ? 0.28 : (a_kind > 3.5 ? 0.14 : (a_kind > 2.5 ? 1.0 : (a_kind > 1.5 ? 0.22 : 0.18)));',
    '  float localWindBoost = 0.72 + min(0.65, u_windSpeed / 80.0);',
    '  float amplitude = u_waveAmp * localScale * localWindBoost * (1.0 + stormInfluence * (0.9 + u_windSpeed * 0.011));',
    '  float marineSurgeMask = (a_kind < 0.5 || (a_kind > 2.5 && a_kind < 3.5)) ? 1.0 : 0.0;',
    '  float offsetM = wave * amplitude + stormSurge * marineSurgeMask + a_flood;',
    '  gl_Position = projectTileFor3D(a_pos, a_height + offsetM);',
    '  v_coord = a_pos - u_waveOrigin;',
    '  v_kind = a_kind;',
    '  v_wave = clamp(0.5 + wave * 0.34, 0.0, 1.0);',
    '  v_storm = clamp(stormInfluence, 0.0, 1.0);',
    '  v_flow = a_flow;',
    '  v_flood = a_flood;',
    '  vec2 ribbonDir = length(a_flow) > 0.001 ? normalize(a_flow) : vec2(1.0, 0.0);',
    '  v_streamPhaseOffset = 6.2831853 * fract(dot(u_waveOrigin, ribbonDir) * u_flowCycles);',
    '}'
  ].join('\n');
  const fragmentSource = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 v_coord;',
    'in float v_kind;',
    'in float v_wave;',
    'in float v_storm;',
    'in vec2 v_flow;',
    'in float v_flood;',
    'in float v_streamPhaseOffset;',
    'uniform float u_time;',
    'uniform float u_flowCycles;',
    'uniform float u_flowPhaseA;',
    'uniform float u_flowPhaseB;',
    'uniform float u_flowPhaseDetail;',
    'uniform float u_windSpeed;',
    'out highp vec4 fragColor;',
    'void main() {',
    '  float sparkle = sin((v_coord.x * 0.71 + v_coord.y * 0.29) * u_flowCycles * 6.2831853 + u_flowPhaseA + u_time * 0.38);',
    '  float fine = sin((v_coord.x * 0.27 - v_coord.y * 0.91) * u_flowCycles * 3.71 + u_flowPhaseB - u_time * 0.57);',
    '  float detail = 0.5 + 0.5 * sin((v_coord.x * 0.61 + v_coord.y * 0.39) * u_flowCycles * 1.37 * 6.2831853 + u_flowPhaseDetail + u_time * 0.21);',
    '  float glint = pow(max(0.0, 0.5 + 0.5 * (0.62 * sparkle + 0.24 * fine + 0.14 * detail)), 7.0);',
    '  float foam = (smoothstep(0.79, 0.98, v_wave) * 0.7 + smoothstep(0.81, 0.97, detail) * 0.08) * (0.05 + min(0.62, u_windSpeed / 120.0) + 0.42 * v_storm);',
    '  vec3 deep = vec3(0.006, 0.075, 0.135);',
    '  vec3 mid = vec3(0.012, 0.24, 0.345);',
    '  vec3 crest = vec3(0.42, 0.76, 0.82);',
    '  if (v_kind > 1.5 && v_kind < 2.5) {',
    '    vec2 flowDir = length(v_flow) > 0.001 ? normalize(v_flow) : vec2(1.0, 0.0);',
    '    float streamPhase = sin(dot(v_coord, flowDir) * u_flowCycles * 6.2831853 + v_streamPhaseOffset + u_time * 1.85);',
    '    float streak = smoothstep(0.73, 0.98, 0.5 + 0.5 * streamPhase);',
    '    vec3 streamColor = mix(mid, crest, streak * 0.78);',
    '    fragColor = vec4(streamColor, 0.24 + streak * 0.42);',
    '    return;',
    '  }',
    '  if (v_kind > 3.5) {',
    '    float depthTint = clamp(v_flood / 4.0, 0.0, 1.0);',
    '    vec3 floodColor = mix(vec3(0.08, 0.29, 0.31), vec3(0.015, 0.16, 0.25), depthTint);',
    '    floodColor = mix(floodColor, crest, glint * 0.24);',
    '    fragColor = vec4(floodColor, clamp(0.36 + v_flood * 0.028 + glint * 0.08, 0.36, 0.68));',
    '    return;',
    '  }',
    '  if (v_kind < 0.5) {',
    '    float shimmer = glint * 0.65 + foam * 0.13 + v_storm * 0.22;',
    '    vec3 color = mix(deep, mid, 0.28 + shimmer);',
    '    color = mix(color, crest, shimmer * 0.34);',
    '    fragColor = vec4(color, clamp(0.15 + shimmer * 0.13, 0.15, 0.32));',
    '    return;',
    '  }',
    '  float sheen = clamp(glint * 0.36 + foam * 0.6 + v_storm * 0.12, 0.0, 0.72);',
    '  vec3 color = mix(deep, mid, 0.22 + v_wave * 0.45);',
    '  color = mix(color, crest, sheen);',
    '  float alpha = v_kind > 2.5 ? 0.22 + glint * 0.21 + foam * 0.20 + v_storm * 0.10 : 0.17 + glint * 0.14 + foam * 0.11;',
    '  fragColor = vec4(color, clamp(alpha, 0.16, 0.62));',
    '}'
  ].join('\n');
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader) || 'shader compilation failed';
      gl.deleteShader(shader);
      throw new Error(error);
    }
    return shader;
  }
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program) || 'program link failed';
    gl.deleteProgram(program);
    throw new Error(error);
  }
  const names = ['u_projection_fallback_matrix', 'u_projection_matrix', 'u_projection_tile_mercator_coords',
    'u_projection_clipping_plane', 'u_projection_transition', 'u_time', 'u_waveOrigin', 'u_wavePhaseA',
    'u_wavePhaseB', 'u_waveK', 'u_waveAmp', 'u_windSpeed', 'u_windDir', 'u_storms[0]',
    'u_flowCycles', 'u_flowPhaseA', 'u_flowPhaseB', 'u_flowPhaseDetail'];
  const uniforms = {};
  for (const name of names) uniforms[name] = gl.getUniformLocation(program, name);
  const attributes = {
    pos: gl.getAttribLocation(program, 'a_pos'),
    height: gl.getAttribLocation(program, 'a_height'),
    kind: gl.getAttribLocation(program, 'a_kind'),
    flow: gl.getAttribLocation(program, 'a_flow'),
    flood: gl.getAttribLocation(program, 'a_flood')
  };
  return { program, uniforms, attributes };
}

function createLayer(api, map) {
  return {
    id: LAYER_ID,
    type: 'custom',
    renderingMode: '3d',
    shaderMap: new Map(),
    shaderInfo: new Map(),
    gl: null,
    map,
    buffer: null,
    flowBuffer: null,
    surfaceData: new Float32Array(0),
    flowData: new Float32Array(0),
    surfaceVertexCount: 0,
    flowVertexCount: 0,
    shaderError: null,
    lastScene: null,
    lastUniformSync: 0,
    lastRender: 0,
    frameTimer: 0,
    timeOrigin: performance.now(),
    enabled: true,
    onAdd(mapRef, gl) {
      this.map = mapRef;
      this.gl = gl;
      this.buffer = gl.createBuffer();
      this.flowBuffer = gl.createBuffer();
      this.upload();
      api.contextReady = true;
      api.glContextShared = true;
    },
    getShader(gl, shaderDescription) {
      const key = shaderDescription.variantName;
      if (this.shaderMap.has(key)) return this.shaderMap.get(key);
      const info = buildShaders(gl, shaderDescription);
      this.shaderMap.set(key, info.program);
      this.shaderInfo.set(key, info);
      return info.program;
    },
    upload() {
      if (!this.gl || !this.buffer || !this.flowBuffer) return;
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.surfaceData, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.flowBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.flowData, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    },
    setGeometry(surfaceValues, flowValues) {
      this.surfaceData = new Float32Array(surfaceValues);
      this.flowData = new Float32Array(flowValues);
      this.surfaceVertexCount = Math.floor(this.surfaceData.length / 7);
      this.flowVertexCount = Math.floor(this.flowData.length / 7);
      this.upload();
    },
    applyProjection(gl, u, d) {
      const pd = d && d.defaultProjectionData;
      if (!pd) return;
      if (u['u_projection_fallback_matrix']) gl.uniformMatrix4fv(u['u_projection_fallback_matrix'], false, pd.fallbackMatrix);
      if (u['u_projection_matrix']) gl.uniformMatrix4fv(u['u_projection_matrix'], false, pd.mainMatrix);
      if (u['u_projection_tile_mercator_coords']) gl.uniform4fv(u['u_projection_tile_mercator_coords'], pd.tileMercatorCoords);
      if (u['u_projection_clipping_plane']) gl.uniform4fv(u['u_projection_clipping_plane'], pd.clippingPlane);
      if (u['u_projection_transition']) gl.uniform1f(u['u_projection_transition'], pd.projectionTransition);
    },
    bindAttributes(gl, attrs, buffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const stride = 7 * Float32Array.BYTES_PER_ELEMENT;
      if (attrs.pos >= 0) { gl.enableVertexAttribArray(attrs.pos); gl.vertexAttribPointer(attrs.pos, 2, gl.FLOAT, false, stride, 0); }
      if (attrs.height >= 0) { gl.enableVertexAttribArray(attrs.height); gl.vertexAttribPointer(attrs.height, 1, gl.FLOAT, false, stride, 2 * 4); }
      if (attrs.kind >= 0) { gl.enableVertexAttribArray(attrs.kind); gl.vertexAttribPointer(attrs.kind, 1, gl.FLOAT, false, stride, 3 * 4); }
      if (attrs.flow >= 0) { gl.enableVertexAttribArray(attrs.flow); gl.vertexAttribPointer(attrs.flow, 2, gl.FLOAT, false, stride, 4 * 4); }
      if (attrs.flood >= 0) { gl.enableVertexAttribArray(attrs.flood); gl.vertexAttribPointer(attrs.flood, 1, gl.FLOAT, false, stride, 6 * 4); }
    },
    scene() { return currentScene(); },
    render(gl, args) {
      if (!this.enabled || (!this.surfaceVertexCount && !this.flowVertexCount) || !api.active) return;
      const now = performance.now();
      let info;
      try {
        const program = this.getShader(gl, args.shaderData);
        info = this.shaderInfo.get(args.shaderData.variantName);
        if (!info) return;
        gl.useProgram(program);
        this.applyProjection(gl, info.uniforms, args);
        const scene = this.scene();
        if (scene !== this.lastScene || now - this.lastUniformSync > 900) {
          api.syncScene(scene, map);
          this.lastScene = scene;
          this.lastUniformSync = now;
        }
        const u = info.uniforms;
        const z = map.getZoom();
        // Do not cap global wave cycles at 220k: that stretched waves into giant
        // low-frequency bands at street zoom. Geometry stays capped; detail is shader-side.
        const wavesPerWorld = 8.53 * Math.pow(2, clamp(z, 0.6, 20.0));
        const waveNumber = Math.PI * 2 * wavesPerWorld;
        const amp = z < 2.5 ? 0.85 : z < 7 ? 0.75 : z < 12 ? 1.0 : z < 15 ? 1.35 : 1.8;
        const center = map.getCenter();
        const originX = mercX(center.lng), originY = mercY(center.lat);
        const centerCosLat = Math.max(0.12, Math.cos(center.lat * RAD));
        const dir = api.wind.direction * RAD;
        const windX = Math.sin(dir), windY = -Math.cos(dir);
        let dirBX = windX + 0.52, dirBY = windY + 0.31;
        const dirBLen = Math.hypot(dirBX, dirBY) || 1;
        dirBX /= dirBLen; dirBY /= dirBLen;
        const frac = value => ((value % 1) + 1) % 1;
        const flowCycles = wavesPerWorld * 2.4;
        if (u.u_time) gl.uniform1f(u.u_time, ((now - this.timeOrigin) / 1000) % 4096);
        if (u.u_waveOrigin) gl.uniform2f(u.u_waveOrigin, originX, originY);
        if (u.u_wavePhaseA) gl.uniform1f(u.u_wavePhaseA, Math.PI * 2 * frac(wavesPerWorld * centerCosLat * (originX * windX + originY * windY)));
        if (u.u_wavePhaseB) gl.uniform1f(u.u_wavePhaseB, Math.PI * 2 * frac(wavesPerWorld * 0.61 * centerCosLat * (originX * dirBX + originY * dirBY)));
        if (u.u_waveK) gl.uniform1f(u.u_waveK, waveNumber / EARTH_CIRCUMFERENCE_M);
        if (u.u_waveAmp) gl.uniform1f(u.u_waveAmp, amp);
        if (u.u_windSpeed) gl.uniform1f(u.u_windSpeed, api.wind.mph);
        if (u.u_windDir) gl.uniform2f(u.u_windDir, windX, windY);
        if (u['u_storms[0]']) gl.uniform4fv(u['u_storms[0]'], api.stormUniforms);
        if (u.u_flowCycles) gl.uniform1f(u.u_flowCycles, flowCycles);
        if (u.u_flowPhaseA) gl.uniform1f(u.u_flowPhaseA, Math.PI * 2 * frac(flowCycles * (0.71 * originX + 0.29 * originY)));
        if (u.u_flowPhaseB) gl.uniform1f(u.u_flowPhaseB, Math.PI * 2 * 3.71 * frac(flowCycles * (0.27 * originX - 0.91 * originY)));
        if (u.u_flowPhaseDetail) gl.uniform1f(u.u_flowPhaseDetail, Math.PI * 2 * 1.37 * frac(flowCycles * (0.61 * originX + 0.39 * originY)));
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        if (this.surfaceVertexCount) {
          this.bindAttributes(gl, info.attributes, this.buffer);
          gl.drawArrays(gl.TRIANGLES, 0, this.surfaceVertexCount);
        }
        if (this.flowVertexCount) {
          this.bindAttributes(gl, info.attributes, this.flowBuffer);
          gl.drawArrays(gl.TRIANGLES, 0, this.flowVertexCount);
        }
        gl.depthMask(true);
        // Leave blending enabled for later translucent MapLibre style layers.
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.useProgram(null);
        this.lastRender = now;
        api.lastDrawAt = Date.now();
        if (api.active && !document.hidden && !this.frameTimer) {
          const delay = api.frameDelay();
          this.frameTimer = window.setTimeout(() => {
            this.frameTimer = 0;
            if (api.active && !document.hidden) map.triggerRepaint();
          }, delay);
        }
      } catch (error) {
        this.shaderError = String(error && error.message || error).slice(0, 220);
        api.shaderError = this.shaderError;
        this.enabled = false;
        console.warn('BridgePoint GPU water shader unavailable; native water remains enabled', error);
      }
    },
    onRemove(mapRef, gl) {
      if (this.frameTimer) clearTimeout(this.frameTimer);
      try { if (this.buffer) gl.deleteBuffer(this.buffer); } catch (_) {}
      try { if (this.flowBuffer) gl.deleteBuffer(this.flowBuffer); } catch (_) {}
      for (const program of this.shaderMap.values()) { try { gl.deleteProgram(program); } catch (_) {} }
      this.shaderMap.clear();
      this.shaderInfo.clear();
      this.buffer = this.flowBuffer = null;
      this.gl = null;
      api.contextReady = false;
    }
  };
}

function currentScene() {
  const candidates = [
    window.__bpWeatherV2300,
    window.__BP_SHARED_VISUAL_WEATHER__ && window.__BP_SHARED_VISUAL_WEATHER__.weather,
    window.__BP_LANDING_VISUAL_WEATHER__ && window.__BP_LANDING_VISUAL_WEATHER__.weather
  ];
  for (const item of candidates) {
    if (!item || typeof item !== 'object') continue;
    // The live weather module exposes getScene(), not a .scene data property.
    // Read the actual live scene so hurricanes, winds and source flood polygons
    // reach the water shader instead of silently falling back to empty data.
    try {
      if (typeof item.getScene === 'function') {
        const live = item.getScene();
        if (live && typeof live === 'object') return live;
      }
    } catch (_) {}
    if (item.scene && typeof item.scene === 'object') return item.scene;
    if (Array.isArray(item.storms) || Array.isArray(item.water_levels) || Array.isArray(item.flood_depths)) return item;
  }
  return { storms: [], observations: [], water_levels: [], flood_depths: [], alerts: [] };
}

export function initWaterEngine(mapOrWorld, options = {}) {
  const map = mapOrWorld && mapOrWorld.map ? mapOrWorld.map : mapOrWorld;
  if (!map || typeof map.addLayer !== 'function' || typeof map.querySourceFeatures !== 'function') return null;
  if (window.__BP_WATER_ENGINE_V6113__ && window.__BP_WATER_ENGINE_V6113__.map === map) return window.__BP_WATER_ENGINE_V6113__;
  const mobile = window.innerWidth <= 900 || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const low = Number(navigator.deviceMemory || 4) <= 3 || Number(navigator.hardwareConcurrency || 4) <= 4;
  const api = {
    version: VERSION, map, options, enabled: true, active: true, mobile, low,
    contextReady: false, glContextShared: true, shaderError: null, lastDrawAt: 0,
    waterPolygonCells: 0, oceanFallbackCells: 0, flowSegments: 0, surfaceVertexCount: 0, flowVertexCount: 0,
    geometryBuilds: 0, sourceWaterFeatures: 0, sourceLandFeatures: 0, sourceWaterwayFeatures: 0,
    sourceFloodPolygonCount: 0, sourceWaterLevelCount: 0, absoluteWaterLevelCount: 0,
    sourceStormCount: 0, floodedLandCells: 0, rejectedWaterLevelSamples: 0,
    terrainSamples: 0, terrainMissing: 0, terrainRejectedSamples: 0,
    surfaceHeightOutliersCorrected: 0, flowSegmentsRejectedElevationJump: 0,
    flowSegmentsRejectedLong: 0, flowSegmentsRejectedAltitude: 0, flowSegmentsRejectedSlope: 0,
    surfaceCellsRejectedAtShoreline: 0, surfaceCellsRejectedElevation: 0,
    waterLevelsRejectedByShoreline: 0,
    stormCount: 0, stormSurgeIsModelled: true,
    floodHeightPolicy: 'only explicit source-reported depth_m/flood_depth_m/water_depth_m/inundation_depth_m; no fabricated land inundation',
    gaugeHeightPolicy: 'only explicit water_surface_elevation_m / surface_elevation_msl / sea_surface_height_m fields; ambiguous water_level_m is not absolute elevation',
    stormWavePolicy: 'source cyclone centers drive a local visual wave/surge approximation, not an observed storm-surge forecast',
    wind: { mph: 0, direction: 0 }, stormUniforms: new Float32Array(16), lastMetricsAt: 0,
    surfaceDataBytes: 0, flowDataBytes: 0, lastSourceRefreshAt: 0,
    frameDelay() {
      const z = map.getZoom();
      if (low) return z < 3 ? 110 : z < 10 ? 90 : 65;
      if (mobile) return z < 3 ? 85 : z < 10 ? 62 : 45;
      return z < 3 ? 65 : z < 10 ? 45 : 33;
    },
    syncScene(scene, mapRef) {
      const safeScene = scene && typeof scene === 'object' ? scene : {};
      const center = mapRef.getCenter();
      this.wind = nearestWind(safeScene, center.lng, center.lat);
      const storms = stormSignals(safeScene);
      this.sourceStormCount = Array.isArray(safeScene.storms) ? safeScene.storms.length : 0;
      this.stormCount = storms.length;
      const arr = new Float32Array(16);
      storms.forEach((s, i) => {
        const p = i * 4;
        arr[p] = s.x; arr[p + 1] = s.y; arr[p + 2] = s.radiusM; arr[p + 3] = s.intensity;
      });
      this.stormUniforms = arr;
      const waterLevels = Array.isArray(safeScene.water_levels) ? safeScene.water_levels : [];
      const floodDepths = Array.isArray(safeScene.flood_depths) ? safeScene.flood_depths : [];
      this.sourceWaterLevelCount = waterLevels.filter(row => row && typeof row === 'object').length;
      this.absoluteWaterLevelCount = waterLevels.filter(row => {
        if (!row || typeof row !== 'object') return false;
        const p = row.properties && typeof row.properties === 'object' ? row.properties : row;
        return Number.isFinite(Number(p.water_surface_elevation_m ?? p.surface_elevation_msl ?? p.sea_surface_height_m));
      }).length;
      this.sourceFloodPolygonCount = floodDepths.length;
    },
    setEnabled(value) {
      this.enabled = !!value;
      if (layer) layer.enabled = this.enabled;
      if (!this.enabled && layer && layer.frameTimer) { clearTimeout(layer.frameTimer); layer.frameTimer = 0; }
      if (this.enabled) { scheduleBuild(80); map.triggerRepaint(); }
      return this.state;
    },
    rebuild() { scheduleBuild(0); return this.state; },
    destroy() {
      this.active = false;
      if (buildTimer) clearTimeout(buildTimer);
      if (layer && layer.frameTimer) clearTimeout(layer.frameTimer);
      try { if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID); } catch (_) {}
      for (const spec of SOURCE_ANCHORS) { try { if (map.getLayer(spec.id)) map.removeLayer(spec.id); } catch (_) {} }
      try { window.removeEventListener('bp2300:weather-updated', onWeatherUpdated); } catch (_) {}
      if (window.__BP_WATER_ENGINE_V6113__ === this) window.__BP_WATER_ENGINE_V6113__ = null;
    },
    get buffers() {
      return layer ? { surface: layer.buffer, flow: layer.flowBuffer, strideFloats: 7, strideBytes: 28, vertexCount: layer.surfaceVertexCount + layer.flowVertexCount } : null;
    },
    get state() {
      return {
        version: VERSION, installed: !!map.getLayer(LAYER_ID), enabled: this.enabled, active: this.active,
        contextReady: this.contextReady, sharedMapLibreCanvas: true, secondaryCanvases: 0,
        styleLoaded: (()=>{try{return !!map.isStyleLoaded?.()}catch(_){return false}})(),
        nativeWaterLayerPresent: (()=>{try{return !!map.getLayer('gta-water')}catch(_){return false}})(),
        vectorSourcePresent: (()=>{try{return !!map.getSource('ofm')}catch(_){return false}})(),
        installError: this.installError || null, buildError: this.buildError || null,
        sourceAnchorLayersPresent: this.sourceAnchorLayersPresent || 0, sourceAnchorError: this.sourceAnchorError || null,
        waitingForVectorFeatures: !!this.waitingForVectorFeatures,
        gpuVertexDisplacement: true, adaptiveLOD: true, boundedGeometry: true,
        sourceWaterFeatures: this.sourceWaterFeatures, sourceLandFeatures: this.sourceLandFeatures,
        sourceWaterwayFeatures: this.sourceWaterwayFeatures, waterPolygonCells: this.waterPolygonCells,
        oceanFallbackCells: this.oceanFallbackCells, flowSegments: this.flowSegments,
        surfaceVertexCount: this.surfaceVertexCount, flowVertexCount: this.flowVertexCount,
        gpuBufferBytes: this.surfaceDataBytes + this.flowDataBytes, geometryBuilds: this.geometryBuilds,
        stormCentersUsed: this.stormCount, sourceStormCount: this.sourceStormCount,
        sourceFloodPolygonCount: this.sourceFloodPolygonCount, floodedLandCells: this.floodedLandCells,
        rejectedWaterLevelSamples: this.rejectedWaterLevelSamples, surfaceHeightOutliersCorrected: this.surfaceHeightOutliersCorrected,
        sourceWaterLevelCount: this.sourceWaterLevelCount, absoluteWaterLevelCount: this.absoluteWaterLevelCount,
        terrainSamples: this.terrainSamples, terrainMissing: this.terrainMissing, terrainRejectedSamples: this.terrainRejectedSamples,
        flowSegmentsRejectedElevationJump: this.flowSegmentsRejectedElevationJump,
        flowSegmentsRejectedLong: this.flowSegmentsRejectedLong,
        flowSegmentsRejectedAltitude: this.flowSegmentsRejectedAltitude,
        flowSegmentsRejectedSlope: this.flowSegmentsRejectedSlope,
        surfaceCellsRejectedAtShoreline: this.surfaceCellsRejectedAtShoreline,
        surfaceCellsRejectedElevation: this.surfaceCellsRejectedElevation,
        waterLevelsRejectedByShoreline: this.waterLevelsRejectedByShoreline,
        zoom: +map.getZoom().toFixed(2),
        tier: this.low ? 'LOW' : this.mobile ? 'MOBILE' : 'DESKTOP',
        stormSurgeIsModelled: this.stormSurgeIsModelled, floodHeightPolicy: this.floodHeightPolicy,
        gaugeHeightPolicy: this.gaugeHeightPolicy, stormWavePolicy: this.stormWavePolicy,
        shaderError: this.shaderError, lastDrawAt: this.lastDrawAt, updatedAt: Date.now()
      };
    }
  };
  let buildTimer = 0, moving = false, layer = null, destroyed = false;

  function terrainHeight(lng, lat, cache, key) {
  if (cache && cache.has(key)) return cache.get(key);
  let value = 0;
  if (map.getZoom() >= 5 && typeof map.queryTerrainElevation === 'function') {
    try {
      const h = map.queryTerrainElevation([lng, lat], { exaggerated: false });
      // Do not clamp corrupt DEM sentinels (for example 32767) into valid 9 km terrain.
      // Missing/out-of-range samples fall back safely; the native basemap remains visible.
      if (Number.isFinite(h) && h >= MIN_VALID_TERRAIN_ELEVATION_M && h <= MAX_VALID_TERRAIN_ELEVATION_M) {
        value = h;
        api.terrainSamples++;
      } else {
        api.terrainMissing++;
        if (Number.isFinite(h)) api.terrainRejectedSamples++;
      }
    } catch (_) { api.terrainMissing++; }
  }
  if (cache) cache.set(key, value);
  return value;
}

function sceneLevelAt(scene, lng, lat) { return absoluteWaterLevelAt(scene, lng, lat); }
  function estimatedInlandSurface(feature, scene, terrainCache, cellKey, lng, lat) {
    // Establish this polygon's own shoreline elevation before considering station data.
    // Choosing a different nearby gauge for each vertex can make adjoining vertices jump
    // to different heights and create blue walls or spikes.
    if (!feature || !feature.parts || map.getZoom() < 5 || typeof map.queryTerrainElevation !== 'function') {
      return terrainHeight(lng, lat, terrainCache, 'e:' + cellKey);
    }
    if (api._inlandLevels && api._inlandLevels.has(feature)) return api._inlandLevels.get(feature);
    const samples = [];
    let sampled = 0;
    // Use one robust shoreline-terrain estimate per inland polygon so the visible surface
    // stays level instead of following every underlying DEM vertex. Source water levels win.
    for (const polygon of feature.parts) {
      const ring = polygon && polygon[0];
      if (!ring || ring.length < 3) continue;
      const step = Math.max(1, Math.floor((ring.length - 1) / 8));
      for (let i = 0; i < ring.length - 1 && sampled < 8; i += step, sampled++) {
        const point = ring[i];
        if (!point || !finite(point[0]) || !finite(point[1])) continue;
        try {
          const h = map.queryTerrainElevation([wrapLon(point[0]), clamp(Number(point[1]), -85, 85)], { exaggerated: false });
          if (Number.isFinite(h) && h >= MIN_VALID_TERRAIN_ELEVATION_M && h <= MAX_VALID_TERRAIN_ELEVATION_M) {
            samples.push(h); api.terrainSamples++;
          } else {
            api.terrainMissing++;
            if (Number.isFinite(h)) api.terrainRejectedSamples++;
          }
        } catch (_) { api.terrainMissing++; }
      }
      if (sampled >= 8) break;
    }
    let level;
    if (samples.length) {
      samples.sort((a, b) => a - b);
      const mid = Math.floor(samples.length / 2);
      level = samples.length % 2 ? samples[mid] : (samples[mid - 1] + samples[mid]) * 0.5;
    } else level = terrainHeight(lng, lat, terrainCache, 'e:' + cellKey);
    // A source height is accepted only when it agrees with the sampled shoreline within
    // 25 m. Then the accepted value is cached once for the whole source polygon, never
    // applied independently at each rendered grid vertex.
    const explicit = sceneLevelAt(scene, lng, lat);
    if (explicit !== null) {
      if (samples.length && Math.abs(explicit - level) <= 25) level = explicit;
      else api.waterLevelsRejectedByShoreline++;
    }
    if (!api._inlandLevels) api._inlandLevels = new Map();
    api._inlandLevels.set(feature, level);
    return level;
  }
  // MapLibre may keep isStyleLoaded() false while vector tiles/weather layers are
  // still refreshing. The map style can already accept layers and expose its sources.
  function mapCanHostWater() {
    try {
      const style = map.getStyle && map.getStyle();
      return !!(style && Array.isArray(style.layers) && map.getLayer('gta-water') && map.getSource('ofm'));
    } catch (_) { return false; }
  }
  const SOURCE_ANCHORS = [
    { id: 'bp-water-data-anchor-v6102-water', type: 'fill', sourceLayer: 'water', minzoom: 0,
      paint: { 'fill-color': '#000000', 'fill-opacity': 0 } },
    { id: 'bp-water-data-anchor-v6102-landcover', type: 'fill', sourceLayer: 'landcover', minzoom: 0,
      paint: { 'fill-color': '#000000', 'fill-opacity': 0 } },
    { id: 'bp-water-data-anchor-v6102-landuse', type: 'fill', sourceLayer: 'landuse', minzoom: 0,
      paint: { 'fill-color': '#000000', 'fill-opacity': 0 } },
    { id: 'bp-water-data-anchor-v6102-waterway', type: 'line', sourceLayer: 'waterway', minzoom: 5.5,
      paint: { 'line-color': '#000000', 'line-width': 1, 'line-opacity': 0 } }
  ];
  function ensureSourceAnchors() {
    if (!map.getSource('ofm')) return false;
    const before = map.getLayer('gta-coast-shadow') ? 'gta-coast-shadow' :
      (map.getLayer('gta-landcover') ? 'gta-landcover' : undefined);
    let anyError = null;
    for (const spec of SOURCE_ANCHORS) {
      try {
        if (map.getLayer(spec.id)) continue;
        map.addLayer({
          id: spec.id,
          type: spec.type,
          source: 'ofm',
          'source-layer': spec.sourceLayer,
          minzoom: spec.minzoom,
          layout: { visibility: 'visible' },
          paint: spec.paint
        }, before);
      } catch (error) {
        anyError = String(error && error.message || error).slice(0, 180);
      }
    }
    api.sourceAnchorLayersPresent = SOURCE_ANCHORS.filter(s => !!map.getLayer(s.id)).length;
    api.sourceAnchorError = anyError;
    // Water + land masks are mandatory. Waterways are an optional extra stream-flow detail.
    return ['bp-water-data-anchor-v6102-water', 'bp-water-data-anchor-v6102-landcover',
      'bp-water-data-anchor-v6102-landuse'].every(id => !!map.getLayer(id));
  }
  function floodDepthAt(floodFeatures, lng, lat) {
    let depth = 0;
    for (const feature of floodFeatures) {
      if (feature.depth > depth && featureContains(feature, lng, lat)) depth = feature.depth;
    }
    return depth;
  }
  function pushVertex(target, x, y, height, kind, flowX, flowY, flood) {
    target.push(mod1(x), clamp(y, 0, 1), height, kind, flowX || 1, flowY || 0, flood || 0);
  }
  function makeRibbon(flowFeatures, bounds, target, scene, terrainCache, maxSegments) {
    const z = map.getZoom();
    if (z < 5.5) return 0;
    const closeZoom = z >= 8;
    let count = 0;
    const wx = bounds.x0, ex = bounds.x1, ny = bounds.y0, sy = bounds.y1;
    for (const feature of flowFeatures) {
      // Callers pass raw MapLibre features; also accept prepared { row } wrappers.
      const raw = feature && feature.row ? feature.row : feature;
      const geometry = geometryOf(raw);
      const coordsSet = lineParts(geometry);
      const widthM = featureWaterwayWidth(raw);
      for (const line of coordsSet) {
        for (let i = 1; i < line.length; i++) {
          if (count >= maxSegments) return count;
          const a = line[i - 1], b = line[i];
          if (!a || !b || !finite(a[0]) || !finite(a[1]) || !finite(b[0]) || !finite(b[1])) continue;
          const lngA = wrapLon(a[0]), lngB = wrapLon(b[0]);
          const latA = clamp(Number(a[1]), -85, 85), latB = clamp(Number(b[1]), -85, 85);
          let x1 = mercX(lngA), x2 = mercX(lngB);
          if (Math.abs(x2 - x1) > 0.5) continue;
          const y1 = mercY(latA), y2 = mercY(latB);
          const mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5;
          if (mx < wx - 0.02 || mx > ex + 0.02 || my < ny - 0.02 || my > sy + 0.02) continue;
          const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
          if (len < 1e-10) continue;
          const cosLat = Math.max(0.12, Math.cos(((latA + latB) * 0.5) * RAD));
          const segmentMeters = Math.hypot(
            (lngB - lngA) * RAD * (EARTH_CIRCUMFERENCE_M / (2 * Math.PI)) * cosLat,
            (latB - latA) * RAD * (EARTH_CIRCUMFERENCE_M / (2 * Math.PI))
          );
          // Long source segments are cartographic connections, not trustworthy local banks.
          // Do not span kilometres with an elevated, opaque GPU ribbon at close zoom.
          if (segmentMeters > (closeZoom ? 1400 : 5000)) {
            api.flowSegmentsRejectedLong++;
            continue;
          }
          const half = clamp(widthM, 1, 36) / (2 * EARTH_CIRCUMFERENCE_M * cosLat);
          const ox = -dy / len * half, oy = dx / len * half;
          const cx = (lngA + lngB) * 0.5, cy = (latA + latB) * 0.5;
          const k1 = 'r' + Math.round(x1 * 10000000) + ':' + Math.round(y1 * 10000000);
          const k2 = 'r' + Math.round(x2 * 10000000) + ':' + Math.round(y2 * 10000000);
          const h1 = terrainHeight(lngA, latA, terrainCache, k1);
          const h2 = terrainHeight(lngB, latB, terrainCache, k2);
          // At street zoom, only add animated lowland ribbons where terrain samples look
          // like a plausible local watercourse. Keep native MapLibre rivers as the fallback.
          // Native water remains visible where custom altitude cannot be trusted.
          // Reject elevated ribbons at all zoom levels so a bad DEM/datum cannot extrude
          // a thin blue triangle toward the sky.
          if (Math.abs(h1) > MAX_CUSTOM_INLAND_WATER_SURFACE_ELEVATION_M ||
              Math.abs(h2) > MAX_CUSTOM_INLAND_WATER_SURFACE_ELEVATION_M) {
            api.flowSegmentsRejectedAltitude++;
            continue;
          }
          // A lowland watercourse cannot safely climb tens or hundreds of metres per segment.
          // Use a conservative close-zoom slope envelope to prevent tall blue triangular walls.
          const maxRiseM = closeZoom
            ? clamp(segmentMeters * 0.015, 1.5, 8)
            : clamp(segmentMeters * 0.05, 8, 100);
          if (Math.abs(h2 - h1) > maxRiseM) {
            api.flowSegmentsRejectedElevationJump++;
            api.flowSegmentsRejectedSlope++;
            continue;
          }
          const flood = floodDepthAt(api._floodFeatures, cx, cy);
          const flowX = dx / len, flowY = dy / len;
          const p1 = [x1 + ox, y1 + oy, h1], p2 = [x1 - ox, y1 - oy, h1];
          const p3 = [x2 + ox, y2 + oy, h2], p4 = [x2 - ox, y2 - oy, h2];
          pushVertex(target, p1[0], p1[1], p1[2], 2, flowX, flowY, flood);
          pushVertex(target, p2[0], p2[1], p2[2], 2, flowX, flowY, flood);
          pushVertex(target, p3[0], p3[1], p3[2], 2, flowX, flowY, flood);
          pushVertex(target, p3[0], p3[1], p3[2], 2, flowX, flowY, flood);
          pushVertex(target, p2[0], p2[1], p2[2], 2, flowX, flowY, flood);
          pushVertex(target, p4[0], p4[1], p4[2], 2, flowX, flowY, flood);
          count++;
        }
      }
    }
    return count;
  }
  function scheduleBuild(delay = 220) {
    if (!api.active || destroyed) return;
    if (buildTimer) clearTimeout(buildTimer);
    buildTimer = window.setTimeout(() => {
      buildTimer = 0;
      if (!moving && api.active && !destroyed) {
        try { buildGeometry(); api.buildError = null; }
        catch (error) {
          api.buildError = String(error && error.message || error).slice(0, 220);
          console.warn('BridgePoint GPU water geometry build deferred; native water remains enabled', error);
        }
      }
    }, delay);
  }
  function buildGeometry() {
    if (!api.enabled || !mapCanHostWater()) return;
    api.terrainSamples = 0; api.terrainMissing = 0; api.terrainRejectedSamples = 0;
    api.rejectedWaterLevelSamples = 0; api.surfaceHeightOutliersCorrected = 0;
    api.flowSegmentsRejectedElevationJump = 0;
    api.flowSegmentsRejectedLong = 0; api.flowSegmentsRejectedAltitude = 0;
    api.flowSegmentsRejectedSlope = 0; api.surfaceCellsRejectedAtShoreline = 0;
    api.surfaceCellsRejectedElevation = 0; api.waterLevelsRejectedByShoreline = 0;
    let b;
    try { b = map.getBounds(); } catch (_) { return; }
    let west = Number(b.getWest()), east = Number(b.getEast()), south = clamp(Number(b.getSouth()), -85, 85), north = clamp(Number(b.getNorth()), -85, 85);
    if (![west, east, south, north].every(Number.isFinite)) return;
    if (east <= west) east += 360;
    if (east - west > 330) { west = -180; east = 180; }
    const bounds = {
      x0: (west + 180) / 360,
      x1: (east + 180) / 360,
      y0: mercY(north),
      y1: mercY(south)
    };
    if (!(bounds.x1 > bounds.x0) || !(bounds.y1 > bounds.y0)) return;
    const z = map.getZoom(), canvas = map.getCanvas();
    const width = Math.max(240, canvas.clientWidth || canvas.width || 800);
    const height = Math.max(240, canvas.clientHeight || canvas.height || 600);
    let targetPx = api.low ? 28 : api.mobile ? 20 : 15;
    if (z < 2.5) targetPx = Math.max(targetPx, 22);
    if (z >= 12) targetPx = api.low ? 30 : api.mobile ? 21 : 12;
    if (z > 15) targetPx = api.low ? 32 : api.mobile ? 24 : 10;
    const maxCells = api.low ? 1050 : api.mobile ? 1800 : 5800;
    let nx = clamp(Math.ceil(width / targetPx), 16, 106);
    let ny = clamp(Math.ceil(height / targetPx), 12, 84);
    if (nx * ny > maxCells) {
      const scale = Math.sqrt(maxCells / (nx * ny));
      nx = Math.max(12, Math.floor(nx * scale));
      ny = Math.max(10, Math.floor(ny * scale));
    }
    const dx = (bounds.x1 - bounds.x0) / nx;
    const dy = (bounds.y1 - bounds.y0) / ny;
    const waterFeatures = sourceFeatures(map, 'water', 850, bounds);
    const landCoverFeatures = sourceFeatures(map, 'landcover', 900, bounds);
    const landUseFeatures = sourceFeatures(map, 'landuse', 900, bounds);
    const hasLandMask = landCoverFeatures.length + landUseFeatures.length > 0;
    api.sourceWaterFeatures = waterFeatures.length;
    api.sourceLandFeatures = landCoverFeatures.length + landUseFeatures.length;
    api.waitingForVectorFeatures = !(waterFeatures.length > 0 || hasLandMask);
    // Do not paint ocean fallback without both source water features and a land mask.
    // The zero-alpha source-anchor layers below keep these vector layers requested even
    // when the selected basemap is satellite and native GTA fills are not visible.
    if (!waterFeatures.length && !hasLandMask) {
      api.sourceWaterwayFeatures = 0;
      api.waterPolygonCells = 0;
      api.oceanFallbackCells = 0;
      api.floodedLandCells = 0;
      api.flowSegments = 0;
      api.surfaceVertexCount = 0;
      api.flowVertexCount = 0;
      api.surfaceDataBytes = 0;
      api.flowDataBytes = 0;
      if (layer) layer.setGeometry([], []);
      return;
    }
    const flowRaw = [];
    if (z >= 5.5) {
      try {
        const rows = map.querySourceFeatures('ofm', { sourceLayer: 'waterway' }) || [];
        for (const row of rows) {
          if (flowRaw.length >= (api.low ? 120 : api.mobile ? 280 : 600)) break;
          if (lineParts(geometryOf(row)).some(line => line && line.length > 1)) flowRaw.push(row);
        }
      } catch (_) {}
    }
    const flowFeatures = flowRaw;
    api.sourceWaterwayFeatures = flowFeatures.length;
    const scene = currentScene();
    api.syncScene(scene, map);
    api._floodFeatures = collectDepthFeatures(scene, bounds);
    const terrainCache = new Map();
    api._inlandLevels = new Map();
    const surface = [], flow = [];
    let polygonCells = 0, fallbackCells = 0, floodedLandCells = 0;
    const gridKey = (i, j, kind) => kind + ':' + i + ':' + j;
    const heightAt = (i, j, kind, feature, lng, lat, sceneRef) => {
      const key = gridKey(i, j, kind);
      if (terrainCache.has(key)) return terrainCache.get(key);
      let h = 0;
      const marine = kind === 0 || kind === 3 || (feature && marineFeature(feature));
      const sourceLevel = kind === 4 ? null : sceneLevelAt(sceneRef, lng, lat);
      if (marine) {
        // Ocean/sea mesh must remain near mean sea level; never inherit an inland gauge datum.
        h = sourceLevel !== null && sourceLevel >= -MAX_VALID_MARINE_SURFACE_OFFSET_M &&
          sourceLevel <= MAX_VALID_MARINE_SURFACE_OFFSET_M ? sourceLevel : 0;
      } else if (kind === 1) h = estimatedInlandSurface(feature, sceneRef, terrainCache, key, lng, lat);
      else if (sourceLevel !== null && sourceLevel >= MIN_VALID_TERRAIN_ELEVATION_M &&
          sourceLevel <= MAX_VALID_INLAND_WATER_ELEVATION_M) h = sourceLevel;
      else h = terrainHeight(lng, lat, terrainCache, 'e:' + key);
      terrainCache.set(key, h);
      return h;
    };
    function locate(features, lng, lat) {
      for (const feature of features) if (featureContains(feature, lng, lat)) return feature;
      return null;
    }
    // Cache mask classification for each shared grid vertex so tighter shoreline checks
    // do not repeat expensive polygon searches for neighbouring cells.
    const waterVertexCache = new Map(), landVertexCache = new Map(), floodVertexCache = new Map();
    function pointFromGridVertex(pt) {
      return { lng: wrapLon(pt[0] * 360 - 180), lat: unmercY(pt[1]), key: pt[2] + ':' + pt[3] };
    }
    function waterAtGridVertex(pt) {
      const p = pointFromGridVertex(pt);
      if (!waterVertexCache.has(p.key)) waterVertexCache.set(p.key, locate(waterFeatures, p.lng, p.lat));
      return waterVertexCache.get(p.key);
    }
    function landAtGridVertex(pt) {
      const p = pointFromGridVertex(pt);
      if (!landVertexCache.has(p.key)) landVertexCache.set(p.key,
        !!(locate(landCoverFeatures, p.lng, p.lat) || locate(landUseFeatures, p.lng, p.lat)));
      return landVertexCache.get(p.key);
    }
    function floodAtGridVertex(pt) {
      const p = pointFromGridVertex(pt);
      if (!floodVertexCache.has(p.key)) floodVertexCache.set(p.key,
        api._floodFeatures.some(f => featureContains(f, p.lng, p.lat)));
      return floodVertexCache.get(p.key);
    }
    for (let j = 0; j < ny; j++) {
      const yTop = bounds.y0 + j * dy, yBottom = bounds.y0 + (j + 1) * dy;
      if (yTop < 0 || yBottom > 1) continue;
      for (let i = 0; i < nx; i++) {
        const xLeftRaw = bounds.x0 + i * dx, xRightRaw = bounds.x0 + (i + 1) * dx;
        // Split cells at the antimeridian rather than drawing a triangle across the whole world.
        if (Math.floor(xLeftRaw) !== Math.floor(xRightRaw)) continue;
        const xCenterRaw = (xLeftRaw + xRightRaw) * 0.5, yCenter = (yTop + yBottom) * 0.5;
        const lon = wrapLon(xCenterRaw * 360 - 180), lat = unmercY(yCenter);
        const waterFeature = locate(waterFeatures, lon, lat);
        // Draw land inundation only inside a source flood polygon with explicit depth.
        // A storm alone animates offshore surge; it must not invent flooded land.
        const flood = floodDepthAt(api._floodFeatures, lon, lat);
        // Kind 3 is source-classified ocean/sea; kind 1 is inland or source-flooded water.
        // Only open-marine and open-water fallback cells receive the storm-surge approximation.
        let kind = waterFeature && marineFeature(waterFeature) ? 3 : 1;
        if (!waterFeature) {
          const isLand = !!(locate(landCoverFeatures, lon, lat) || locate(landUseFeatures, lon, lat));
          if (isLand && flood <= 0) continue;
          if (flood > 0) {
            kind = 4; // distinct flood surface, only when explicit depth is in the source polygon.
            floodedLandCells++;
          } else {
            if (!waterFeatures.length || !hasLandMask) continue;
            kind = 0; // faint ocean shimmer only where both source masks are available.
          }
        }
        const points = [
          [xLeftRaw, yTop, i, j],
          [xRightRaw, yTop, i + 1, j],
          [xRightRaw, yBottom, i + 1, j + 1],
          [xLeftRaw, yBottom, i, j + 1]
        ];
        // The old center-only mask rendered the entire grid cell even when its corners
        // were dry land. On coastal/detail zoom, require every corner to stay in the same
        // source water class. Edge cells fall back to the native basemap's exact shoreline.
        if (z >= SHORELINE_GUARD_ZOOM) {
          if (waterFeature) {
            const isMarine = marineFeature(waterFeature);
            const cornersStayWet = points.every(pt => {
              const candidate = waterAtGridVertex(pt);
              return !!candidate && marineFeature(candidate) === isMarine;
            });
            if (!cornersStayWet) { api.surfaceCellsRejectedAtShoreline++; continue; }
          } else if (kind === 0 && points.some(landAtGridVertex)) {
            api.surfaceCellsRejectedAtShoreline++;
            continue;
          } else if (kind === 4 && !api._floodFeatures.some(feature =>
            points.every(pt => {
              const p = pointFromGridVertex(pt);
              return featureContains(feature, p.lng, p.lat);
            }))) {
            // A source flood polygon must cover the complete cell; never square off its edge.
            api.surfaceCellsRejectedAtShoreline++;
            continue;
          }
        }
        const heights = points.map(pt => {
          const px = mod1(pt[0]), py = pt[1];
          const plon = wrapLon(pt[0] * 360 - 180), plat = unmercY(py);
          return heightAt(pt[2], pt[3], kind, waterFeature, plon, plat, scene);
        });
        // Clamp only isolated corner outliers, never the whole water surface. This protects
        // close-zoom flood/shore meshes against one anomalous DEM sample without smoothing
        // ordinary terrain relief or changing underlying land geometry.
        // Native vector water is the safe fallback for inland surfaces outside the
        // validated low-elevation range. Do not render a custom floating sheet hundreds
        // of metres above the world while the vertical datum is uncertain.
        if (kind === 1 && heights.some(h =>
          !Number.isFinite(h) || h < MIN_VALID_TERRAIN_ELEVATION_M ||
          h > MAX_CUSTOM_INLAND_WATER_SURFACE_ELEVATION_M)) {
          api.surfaceCellsRejectedElevation++;
          continue;
        }
        const sortedHeights = heights.slice().sort((a, b) => a - b);
        const medianHeight = (sortedHeights[1] + sortedHeights[2]) * 0.5;
        const cellSpanMeters = Math.max(dx, dy) * EARTH_CIRCUMFERENCE_M *
          Math.max(0.12, Math.cos(lat * RAD));
        const maxLocalReliefM = clamp(cellSpanMeters * 0.35, 60, 600);
        for (let hi = 0; hi < heights.length; hi++) {
          if (Math.abs(heights[hi] - medianHeight) > maxLocalReliefM) {
            heights[hi] = medianHeight;
            api.surfaceHeightOutliersCorrected++;
          }
        }
        const flowDir = api.wind.direction * RAD;
        const fx = Math.sin(flowDir), fy = -Math.cos(flowDir);
        // Each cell is two triangles. Center-point masking follows native water polygons;
        // one-cell shoreline antialiasing is provided by the existing GTA fill/foam layers.
        for (const k of [0, 1, 2, 0, 2, 3]) {
          const pt = points[k], h = heights[k];
          pushVertex(surface, pt[0], pt[1], h, kind, fx, fy, kind === 4 ? flood : 0);
        }
        if (kind === 1 || kind === 3) polygonCells++;
        else if (kind === 0) fallbackCells++;
      }
    }
    const maxSegs = api.low ? 110 : api.mobile ? 240 : 580;
    const flowCount = makeRibbon(flowFeatures, bounds, flow, scene, terrainCache, maxSegs);
    if (layer) layer.setGeometry(surface, flow);
    api.waterPolygonCells = polygonCells;
    api.oceanFallbackCells = fallbackCells;
    api.floodedLandCells = floodedLandCells;
    api.flowSegments = flowCount;
    api.surfaceVertexCount = Math.floor(surface.length / 7);
    api.flowVertexCount = Math.floor(flow.length / 7);
    api.surfaceDataBytes = surface.length * 4;
    api.flowDataBytes = flow.length * 4;
    api.sourceWaterFeatures = waterFeatures.length;
    api.sourceLandFeatures = landCoverFeatures.length + landUseFeatures.length;
    api.sourceWaterwayFeatures = flowFeatures.length;
    api.geometryBuilds++;
    api.lastSourceRefreshAt = Date.now();
    window.__BP_WATER_FIELD_V6113__ = {
      version: VERSION, map, buffers: api.buffers,
      get state() { return api.state; },
      get weatherScene() { return currentScene(); },
      sourceCoordinates: 'WebMercator world [0..1] normalized, MapLibre projection prelude',
      grid: { columns: nx, rows: ny, maxCells, targetPx },
      feedContract: 'source water polygons/waterway geometry + source cyclone/wind/water-level/flood-depth scene',
      updatedAt: Date.now()
    };
    try { map.triggerRepaint(); } catch (_) {}
  }

  const layerRef = createLayer(api, map);
  layer = layerRef;
  try { Object.defineProperty(api, '_layer', { value: layer, enumerable: false }); } catch (_) {}
  let installing = false;
  function ensureInstalled() {
    if (!api.active || destroyed || installing || !mapCanHostWater()) return;
    installing = true;
    try {
      if (!ensureSourceAnchors()) return;
      if (map.getLayer(LAYER_ID)) { if (!layer.gl) scheduleBuild(80); return; }
      const before = map.getLayer('gta-coast-shadow') ? 'gta-coast-shadow' :
        (map.getLayer('gta-landcover') ? 'gta-landcover' : undefined);
      map.addLayer(layer, before);
      scheduleBuild(120);
    } catch (error) {
      api.installError = String(error && error.message || error).slice(0, 180);
      console.warn('BridgePoint GPU water layer deferred; native water remains enabled', error);
    } finally {
      installing = false;
    }
  }
  const onWeatherUpdated = () => {
    if (!api.active || destroyed) return;
    try { api.syncScene(currentScene(), map); } catch (_) {}
    scheduleBuild(140);
    try { map.triggerRepaint(); } catch (_) {}
  };
  try { api.syncScene(currentScene(), map); } catch (_) {}
  window.addEventListener('bp2300:weather-updated', onWeatherUpdated);
  map.on('load', ensureInstalled);
  map.on('styledata', ensureInstalled);
  map.on('movestart', () => { moving = true; });
  map.on('moveend', () => { moving = false; scheduleBuild(120); });
  map.on('zoomend', () => scheduleBuild(120));
  map.on('sourcedata', event => {
    if (event && event.sourceId === 'ofm' && event.sourceDataType === 'content') scheduleBuild(260);
  });
  map.on('idle', () => scheduleBuild(160));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && layer && layer.frameTimer) { clearTimeout(layer.frameTimer); layer.frameTimer = 0; }
    else if (!document.hidden && api.enabled) { scheduleBuild(80); map.triggerRepaint(); }
  });
  scheduleBuild(250);
  for (const delay of [700, 1700, 3400]) window.setTimeout(() => { ensureInstalled(); scheduleBuild(0); }, delay);
  window.__BP_WATER_ENGINE_V6113__ = api;
  window.__BP_WATER_FIELD_V6113__ = {
    version: VERSION, map, get buffers() { return api.buffers; },
    get state() { return api.state; },
    get weatherScene() { return currentScene(); },
    sourceCoordinates: 'WebMercator world [0..1] normalized, MapLibre projection prelude',
    feedContract: 'shared GPU water geometry and source weather/hydrology data contract',
    updatedAt: Date.now()
  };
  ensureInstalled();
  return api;
}
