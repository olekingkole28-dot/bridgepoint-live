const VERSION = 6064;
const LAYER_ID = 'bp2300-rain-world-volume-v6064';
const GROUND_SOURCE = 'bp2300-rain-ground-source-v6064';
const WET_LAYER = 'bp2300-rain-wet-ground-v6064';
const PUDDLE_LAYER = 'bp2300-rain-puddle-fill-v6064';
const PUDDLE_GLINT = 'bp2300-rain-puddle-glint-v6064';
const EARTH_CIRCUMFERENCE = 40075016.68557849;
const RAD = Math.PI / 180;
const MOBILE = (typeof innerWidth === 'number' && innerWidth <= 760) ||
  /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
const MAX_DROPS = MOBILE ? 6000 : 14000;
const FLOATS_PER_VERTEX = 5;
const vertexData = new Float32Array(MAX_DROPS * 6 * FLOATS_PER_VERTEX);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fract = v => v - Math.floor(v);
const hash = (a, b = 0, c = 0) => fract(Math.sin(Number(a) * 127.1 + Number(b) * 311.7 + Number(c) * 74.7) * 43758.5453123);
const mod = (v, m) => ((v % m) + m) % m;
const text = v => String(v ?? '').toLowerCase();
const safeNum = (v, fallback = NaN) => Number.isFinite(Number(v)) ? Number(v) : fallback;

function rawWeather(o) {
  return text([o?.weather, o?.present_weather, o?.weather_text, o?.wx, o?.condition,
    o?.conditions, o?.rawdata].filter(Boolean).join(' '));
}
function isRainObservation(o) {
  const s = rawWeather(o);
  if (/hail|graupel|ice pellet|snow|flurr|blizzard/.test(s) && !/freezing rain/.test(s)) return false;
  return /\bra\b|\bdz\b|rain|drizzle|shower|thunderstorm|\bts\b/.test(s);
}
function weatherCenter(o) {
  let lng = safeNum(o?.lng ?? o?.longitude), lat = safeNum(o?.lat ?? o?.latitude);
  if ((!Number.isFinite(lng) || !Number.isFinite(lat)) && o?.geometry) {
    let g = o.geometry;
    if (typeof g === 'string') { try { g = JSON.parse(g); } catch (_) { g = null; } }
    if (g?.type === 'Feature') g = g.geometry;
    if (g?.type === 'Point' && Array.isArray(g.coordinates)) {
      lng = safeNum(g.coordinates[0]); lat = safeNum(g.coordinates[1]);
    }
  }
  return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lat) < 85
    ? { lng: ((((lng + 180) % 360) + 360) % 360) - 180, lat } : null;
}
function distanceMeters(a, b) {
  const mean = (a.lat + b.lat) * 0.5 * RAD;
  const dx = (a.lng - b.lng) * 111320 * Math.cos(mean), dy = (a.lat - b.lat) * 111320;
  return Math.hypot(dx, dy);
}
function metersPerPixel(lat, zoom) {
  return 156543.03392 * Math.max(0.12, Math.cos(lat * RAD)) / Math.pow(2, clamp(zoom, 0, 24));
}
function groundElevation(map, lng, lat) {
  try {
    const v = map.queryTerrainElevation?.([lng, lat]);
    return Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0;
  } catch (_) { return 0; }
}
function windOf(o) {
  const mph = Math.max(0, safeNum(o?.wind_speed_mph,
    Number.isFinite(Number(o?.wind_speed_kt)) ? Number(o.wind_speed_kt) * 1.15078 : 0));
  const from = safeNum(o?.wind_dir_deg, safeNum(o?.wind_direction_deg, 0));
  return { mph, heading: (from + 180) * RAD, mps: mph * 0.44704 };
}
function ring(lng, lat, radiusM, count = 22, seed = 0) {
  const coords = [], cosLat = Math.max(0.12, Math.cos(lat * RAD));
  for (let i = 0; i <= count; i++) {
    const a = i / count * Math.PI * 2, r = radiusM * (0.94 + hash(seed, i, 71) * 0.12);
    coords.push([lng + Math.cos(a) * r / (111320 * cosLat), lat + Math.sin(a) * r / 111320]);
  }
  return coords;
}
function puddlePolygon(lng, lat, rx, ry, rotation, seed, points = 9) {
  const coords = [], cosLat = Math.max(0.12, Math.cos(lat * RAD));
  for (let i = 0; i < points; i++) {
    const a = i / points * Math.PI * 2, wobble = 0.72 + hash(seed, i, 33) * 0.48;
    const east = Math.cos(a) * rx * wobble, north = Math.sin(a) * ry * wobble;
    const x = east * Math.cos(rotation) - north * Math.sin(rotation);
    const y = east * Math.sin(rotation) + north * Math.cos(rotation);
    coords.push([lng + x / (111320 * cosLat), lat + y / 111320]);
  }
  coords.push(coords[0]);
  return coords;
}
function mercator(lng, lat, altitudeM) {
  const safeLat = clamp(lat, -85, 85), r = safeLat * RAD, unit = 1 / (EARTH_CIRCUMFERENCE * Math.max(0.12, Math.cos(r)));
  const MC = window.maplibregl?.MercatorCoordinate || window.MapLibreGL?.MercatorCoordinate;
  if (MC?.fromLngLat) {
    const c = MC.fromLngLat({ lng, lat }, Math.max(0, altitudeM));
    return { x: c.x, y: c.y, z: c.z, unit: c.meterInMercatorCoordinateUnits() };
  }
  return {
    x: (lng + 180) / 360,
    y: (1 - Math.log(Math.tan(Math.PI / 4 + r / 2)) / Math.PI) / 2,
    z: Math.max(0, altitudeM) * unit,
    unit
  };
}
function firstLayer(map, ids) {
  for (const id of ids) if (map.getLayer?.(id)) return id;
  return map.getStyle?.()?.layers?.find(l => l.type === 'symbol')?.id;
}

export function initRainLayer(map, getScene = () => ({})) {
  if (map.__bpRainRendererV6064) return map.__bpRainRendererV6064;
  let enabled = true, buffer = null, bufferAllocated = false, vao = null, vaoExt = null, vaoMode = 'none';
  let programCache = new Map(), scene = {}, cells = [], drops = [], cellMemories = new Map();
  let animationRaf = 0, groundTimer = 0, lastRepaint = 0, vertexCount = 0;
  let rendererError = null, droppedFrames = 0, lastRenderAt = 0, lastGroundUpdate = 0, puddleCount = 0;
  let lastProjectionMode = 'not-rendered', projectionUniformsBound = false;
  const timeOrigin = performance.now();

  function ensureGroundLayers() {
    try {
      if (!map.getSource(GROUND_SOURCE)) map.addSource(GROUND_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      const before = firstLayer(map, ['gta-context-buildings', 'gta-exact-building', 'gta-bp-buildings', 'gta-selected-body']);
      if (!map.getLayer(WET_LAYER)) map.addLayer({
        id: WET_LAYER, type: 'fill', source: GROUND_SOURCE, minzoom: 8,
        filter: ['==', ['get', 'kind'], 'wet-ground'],
        paint: { 'fill-color': '#263e49', 'fill-opacity': ['interpolate', ['linear'], ['get', 'wetness'], 0, 0.025, 0.25, 0.075, 0.65, 0.14, 1, 0.19] }
      }, before);
      if (!map.getLayer(PUDDLE_LAYER)) map.addLayer({
        id: PUDDLE_LAYER, type: 'fill', source: GROUND_SOURCE, minzoom: 13.5,
        filter: ['==', ['get', 'kind'], 'puddle'],
        paint: { 'fill-color': ['match', ['get', 'shade'], 1, '#2b5b6b', 2, '#355a65', '#254b5d'],
          'fill-opacity': ['interpolate', ['linear'], ['get', 'wetness'], 0, 0.025, 0.2, 0.19, 0.6, 0.34, 1, 0.48] }
      }, before);
      if (!map.getLayer(PUDDLE_GLINT)) map.addLayer({
        id: PUDDLE_GLINT, type: 'line', source: GROUND_SOURCE, minzoom: 14,
        filter: ['==', ['get', 'kind'], 'puddle'],
        paint: { 'line-color': '#a9deea', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.2, 17, 0.75, 20, 1.15],
          'line-opacity': ['interpolate', ['linear'], ['get', 'wetness'], 0, 0.025, 0.25, 0.18, 0.7, 0.38, 1, 0.58], 'line-blur': 0.25 }
      }, before);
      for (const id of [WET_LAYER, PUDDLE_LAYER, PUDDLE_GLINT]) {
        const current = map.getLayoutProperty?.(id, 'visibility');
        if (map.getLayer?.(id) && current === 'none' && enabled) map.setLayoutProperty(id, 'visibility', 'visible');
      }
    } catch (e) { rendererError = 'ground layers: ' + String(e?.message || e).slice(0, 160); }
  }

  function ensureRainLayer() {
    try {
      if (!map.getLayer(LAYER_ID)) map.addLayer({
        id: LAYER_ID, type: 'custom', renderingMode: '3d', minzoom: 10,
        onAdd(_map, gl) {
          buffer = gl.createBuffer(); bufferAllocated = false; vao = null; vaoExt = null; vaoMode = 'none';
          try {
            if (typeof gl.createVertexArray === 'function' && typeof gl.bindVertexArray === 'function') {
              vao = gl.createVertexArray(); if (vao) vaoMode = 'native';
            } else {
              vaoExt = gl.getExtension?.('OES_vertex_array_object') || null;
              if (vaoExt) { vao = vaoExt.createVertexArrayOES(); if (vao) vaoMode = 'extension'; }
            }
          } catch (_) { vao = null; vaoMode = 'none'; }
        },
        onRemove(_map, gl) {
          try {
            if (buffer) gl.deleteBuffer(buffer);
            if (vao && vaoMode === 'native') gl.deleteVertexArray(vao);
            else if (vao && vaoMode === 'extension') vaoExt?.deleteVertexArrayOES?.(vao);
            for (const info of programCache.values()) if (info.program) gl.deleteProgram(info.program);
          } catch (_) {}
          buffer = null; bufferAllocated = false; vao = null; vaoMode = 'none'; programCache = new Map();
        },
        render(gl, args) { renderRain(gl, args); }
      }, map.getStyle?.()?.layers?.find(l => l.type === 'symbol')?.id);
      const layer = map.getLayer(LAYER_ID);
      if (layer && layer.layout?.visibility === 'none' && enabled) map.setLayoutProperty(LAYER_ID, 'visibility', 'visible');
    } catch (e) { rendererError = 'rain layer: ' + String(e?.message || e).slice(0, 180); }
  }

  function shaderInfo(gl, args) {
    const shaderData = args?.shaderData;
    const webgl2 = String(gl.getParameter(gl.VERSION) || '').includes('WebGL 2');
    const projectionAware = !!(webgl2 && shaderData && typeof shaderData.vertexShaderPrelude === 'string' &&
      shaderData.vertexShaderPrelude.length && typeof shaderData.define === 'string');
    const preamble = projectionAware ? shaderData.vertexShaderPrelude + '\n' + shaderData.define + '\n' : '';
    const key = projectionAware ? 'project:' + preamble : (webgl2 ? 'matrix-webgl2' : 'matrix-webgl1');
    if (programCache.has(key)) return programCache.get(key);
    const head = webgl2 ? '#version 300 es\n' : '';
    const vin = webgl2 ? 'in' : 'attribute', vout = webgl2 ? 'out' : 'varying';
    const fin = webgl2 ? 'in' : 'varying', fout = webgl2 ? 'out vec4 outColor;' : '';
    const write = webgl2 ? 'outColor' : 'gl_FragColor';
    const project = projectionAware ? 'projectTileFor3D(a_pos.xy,a_altitude)' : 'u_matrix*vec4(a_pos,1.0)';
    const vs = head + preamble + 'precision highp float;\n' +
      vin + ' vec3 a_pos;\n' + vin + ' float a_altitude;\n' + vin + ' float a_alpha;\n' +
      vout + ' float v_alpha;\n' + (projectionAware ? '' : 'uniform mat4 u_matrix;\n') +
      'void main(){gl_Position=' + project + ';v_alpha=a_alpha;}';
    const fs = head + 'precision mediump float;\n' + fin + ' float v_alpha;\n' + fout + '\n' +
      'void main(){float a=clamp(v_alpha,0.0,0.9);' + write + '=vec4(0.74,0.86,0.93,a);}';
    function compile(type, source) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('rain shader allocation failed');
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader) || 'rain shader compilation failed';
        gl.deleteShader(shader); throw new Error(error);
      }
      return shader;
    }
    let vsShader, fsShader, program;
    try {
      vsShader = compile(gl.VERTEX_SHADER, vs); fsShader = compile(gl.FRAGMENT_SHADER, fs);
      program = gl.createProgram();
      if (!program) throw new Error('rain program allocation failed');
      gl.attachShader(program, vsShader); gl.attachShader(program, fsShader); gl.linkProgram(program);
      gl.deleteShader(vsShader); gl.deleteShader(fsShader);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(program) || 'rain shader link failed';
        gl.deleteProgram(program); throw new Error(error);
      }
    } catch (e) {
      if (vsShader) gl.deleteShader(vsShader);
      if (fsShader) gl.deleteShader(fsShader);
      throw e;
    }
    const info = { program, projectionAware,
      attrs: { pos: gl.getAttribLocation(program, 'a_pos'), altitude: gl.getAttribLocation(program, 'a_altitude'),
        alpha: gl.getAttribLocation(program, 'a_alpha'), matrix: gl.getUniformLocation(program, 'u_matrix') },
      uniforms: {
        projectionMatrix: gl.getUniformLocation(program, 'u_projection_matrix'),
        projectionFallbackMatrix: gl.getUniformLocation(program, 'u_projection_fallback_matrix'),
        projectionTileMercatorCoords: gl.getUniformLocation(program, 'u_projection_tile_mercator_coords'),
        projectionClippingPlane: gl.getUniformLocation(program, 'u_projection_clipping_plane'),
        projectionTransition: gl.getUniformLocation(program, 'u_projection_transition')
      } };
    programCache.set(key, info);
    return info;
  }

  function captureGL(gl, attrs) {
    const get = key => { try { return gl.getParameter(gl[key]); } catch (_) { return null; } };
    const is = key => { try { return gl.isEnabled(gl[key]); } catch (_) { return false; } };
    let vaoBinding = null;
    try {
      if (typeof gl.bindVertexArray === 'function' && gl.VERTEX_ARRAY_BINDING != null) vaoBinding = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
      else if (vaoExt?.VERTEX_ARRAY_BINDING_OES != null) vaoBinding = gl.getParameter(vaoExt.VERTEX_ARRAY_BINDING_OES);
    } catch (_) {}
    const vertexAttribs = vao ? [] : attrs.filter(x => x >= 0).map(location => {
      try {
        return { location, enabled: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_ENABLED),
          buffer: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),
          size: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_SIZE), type: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_TYPE),
          normalized: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED),
          stride: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_STRIDE),
          offset: gl.getVertexAttribOffset(location, gl.VERTEX_ATTRIB_ARRAY_POINTER) };
      } catch (_) { return null; }
    }).filter(Boolean);
    return { program: get('CURRENT_PROGRAM'), array: get('ARRAY_BUFFER_BINDING'), element: get('ELEMENT_ARRAY_BUFFER_BINDING'),
      depth: is('DEPTH_TEST'), blend: is('BLEND'), cull: is('CULL_FACE'), stencil: is('STENCIL_TEST'), scissor: is('SCISSOR_TEST'),
      depthMask: get('DEPTH_WRITEMASK'), colorMask: get('COLOR_WRITEMASK'),
      srcRgb: get('BLEND_SRC_RGB'), dstRgb: get('BLEND_DST_RGB'), srcA: get('BLEND_SRC_ALPHA'), dstA: get('BLEND_DST_ALPHA'),
      eqRgb: get('BLEND_EQUATION_RGB'), eqA: get('BLEND_EQUATION_ALPHA'), depthFunc: get('DEPTH_FUNC'), vaoBinding, vertexAttribs };
  }
  function restoreGL(gl, s) {
    if (!s) return;
    try {
      if (typeof gl.bindVertexArray === 'function' && gl.VERTEX_ARRAY_BINDING != null) gl.bindVertexArray(s.vaoBinding);
      else if (vaoExt?.bindVertexArrayOES) vaoExt.bindVertexArrayOES(s.vaoBinding);
    } catch (_) {}
    for (const a of s.vertexAttribs || []) {
      try {
        if (a.buffer) { gl.bindBuffer(gl.ARRAY_BUFFER, a.buffer); gl.vertexAttribPointer(a.location, a.size, a.type, !!a.normalized, a.stride, a.offset); }
        if (a.enabled) gl.enableVertexAttribArray(a.location); else gl.disableVertexAttribArray(a.location);
      } catch (_) {}
    }
    const cap = (name, on) => { try { if (on) gl.enable(gl[name]); else gl.disable(gl[name]); } catch (_) {} };
    cap('DEPTH_TEST', s.depth); cap('BLEND', s.blend); cap('CULL_FACE', s.cull); cap('STENCIL_TEST', s.stencil); cap('SCISSOR_TEST', s.scissor);
    try { if (s.depthMask != null) gl.depthMask(s.depthMask); } catch (_) {}
    try { if (s.colorMask) gl.colorMask(...Array.from(s.colorMask)); } catch (_) {}
    try { if ([s.srcRgb,s.dstRgb,s.srcA,s.dstA].every(x => x != null)) gl.blendFuncSeparate(s.srcRgb,s.dstRgb,s.srcA,s.dstA); } catch (_) {}
    try { if (s.eqRgb != null && s.eqA != null) gl.blendEquationSeparate(s.eqRgb,s.eqA); } catch (_) {}
    try { if (s.depthFunc != null) gl.depthFunc(s.depthFunc); } catch (_) {}
    try { gl.useProgram(s.program); gl.bindBuffer(gl.ARRAY_BUFFER,s.array); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,s.element); } catch (_) {}
  }

  function buildCells(nextScene) {
    const z = safeNum(map.getZoom?.(), 0), canvas = map.getCanvas?.(), center = map.getCenter?.();
    const w = canvas?.clientWidth || 900, h = canvas?.clientHeight || 700;
    const raw = Array.isArray(nextScene?.observations) ? nextScene.observations : [];
    const candidates = raw.filter(isRainObservation).map(o => {
      const c = weatherCenter(o); if (!c) return null;
      const supplied = safeNum(o.precipitation_radius_mi ?? o.rain_radius_mi, NaN);
      const thunder = /thunderstorm|\bts\b|squall/.test(rawWeather(o));
      let radiusM;
      if (Number.isFinite(supplied) && supplied > 0) radiusM = clamp(supplied * 1609.34, 2200, 26000);
      else radiusM = thunder ? 9800 : 5600;
      let p = null;
      try { p = map.project([c.lng, c.lat]); } catch (_) {}
      const margin = radiusM / Math.max(0.4, metersPerPixel(c.lat, z));
      if (p && (p.x < -margin || p.x > w + margin || p.y < -margin || p.y > h + margin)) return null;
      const wind = windOf(o), key = c.lng.toFixed(3) + ':' + c.lat.toFixed(3);
      return { key, obs: o, lng: c.lng, lat: c.lat, radiusM, thunderstorm: thunder,
        baseAglM: clamp(safeNum(o.cloud_base_height_m ?? o.cloudBaseHeightM, thunder ? 1650 : 1050), 650, 4200),
        wind, groundM: groundElevation(map, c.lng, c.lat), seenAt: Date.now() };
    }).filter(Boolean);
    const view = center ? { lng: center.lng, lat: center.lat } : { lng: 0, lat: 0 };
    candidates.sort((a, b) => distanceMeters(a, view) - distanceMeters(b, view));
    return candidates.slice(0, z >= 13 ? (MOBILE ? 4 : 8) : (MOBILE ? 5 : 10));
  }

  function makeDropSeeds(nextCells) {
    const all = [], perCell = nextCells.length ? Math.max(1, Math.floor(MAX_DROPS / nextCells.length)) : 0;
    for (let ci = 0; ci < nextCells.length; ci++) {
      const cell = nextCells[ci], cosLat = Math.max(0.12, Math.cos(cell.lat * RAD));
      const seedBase = Math.round((cell.lng + 180) * 1000) * 7 + Math.round((cell.lat + 90) * 1000) + ci * 931;
      for (let i = 0; i < perCell && all.length < MAX_DROPS; i++) {
        const a = hash(seedBase, i, 7) * Math.PI * 2;
        const r = Math.sqrt(hash(seedBase, i, 11)) * cell.radiusM;
        const lng = cell.lng + Math.cos(a) * r / (111320 * cosLat);
        const lat = clamp(cell.lat + Math.sin(a) * r / 111320, -84, 84);
        const groundM = groundElevation(map, lng, lat);
        const baseAglM = cell.baseAglM;
        const fallSpeedMps = 7.5 + hash(seedBase, i, 19) * 4.5;
        all.push({ lng, lat, groundM, baseAglM, windHeading: cell.wind.heading, windMps: cell.wind.mps,
          phase: hash(seedBase, i, 17), fallRate: fallSpeedMps / Math.max(300, baseAglM),
          segmentM: 18 + hash(seedBase, i, 23) * 42, widthM: 0.16 + hash(seedBase, i, 29) * 0.20,
          alpha: 0.54 + hash(seedBase, i, 31) * 0.34 });
      }
    }
    return all;
  }

  function addVertex(n, x, y, z, altitude, alpha) {
    const k = n * FLOATS_PER_VERTEX;
    vertexData[k] = x; vertexData[k + 1] = y; vertexData[k + 2] = z;
    vertexData[k + 3] = altitude; vertexData[k + 4] = alpha;
    return n + 1;
  }
  function rainVertices(t) {
    let n = 0;
    const zoom = safeNum(map.getZoom?.(), 0);
    if (!enabled || !cells.length || zoom < 10) return 0;
    const seconds = (t - timeOrigin) / 1000;
    for (const d of drops) {
      if (n >= MAX_DROPS * 6) break;
      const screenScaleM = metersPerPixel(d.lat, zoom);
      const segmentM = Math.min(d.baseAglM * 0.72, Math.max(d.segmentM, screenScaleM * 12));
      const phase = mod(d.phase + seconds * d.fallRate, 1);
      const fallAgl = d.baseAglM * (1 - phase), lowerAgl = Math.max(0, fallAgl - segmentM);
      const shiftM = Math.min(220, d.windMps * (d.baseAglM - fallAgl) / Math.max(5, 8.5));
      const lat = clamp(d.lat + Math.cos(d.windHeading) * shiftM / 111320, -84, 84);
      const cosLat = Math.max(0.12, Math.cos(lat * RAD));
      const lng = d.lng + Math.sin(d.windHeading) * shiftM / (111320 * cosLat);
      const topAlt = d.groundM + fallAgl, bottomAlt = d.groundM + lowerAgl;
      const c = mercator(lng, lat, topAlt);
      const tiltM = Math.min(4.5, d.windMps * segmentM / 8.5);
      const bLat = clamp(lat + Math.cos(d.windHeading) * tiltM / 111320, -84, 84);
      const bLng = lng + Math.sin(d.windHeading) * tiltM / (111320 * Math.max(0.12, Math.cos(bLat * RAD)));
      const b = mercator(bLng, bLat, bottomAlt);
      const adaptiveWidthM = Math.max(d.widthM, metersPerPixel(lat, zoom) * 0.88);
      const halfW = c.unit * adaptiveWidthM * 0.5, halfSide = c.unit * adaptiveWidthM * 0.06;
      const lx = Math.cos(d.windHeading) * halfW, ly = -Math.sin(d.windHeading) * halfW;
      const bx = Math.sin(d.windHeading) * halfSide, by = Math.cos(d.windHeading) * halfSide;
      const alpha = d.alpha * (0.72 + 0.28 * Math.sin(phase * Math.PI));
      const tl = [c.x - lx - bx, c.y - ly - by], tr = [c.x + lx - bx, c.y + ly - by];
      const bl = [b.x - lx + bx, b.y - ly + by], br = [b.x + lx + bx, b.y - ly + by];
      n = addVertex(n, tl[0], tl[1], c.z, topAlt, alpha);
      n = addVertex(n, tr[0], tr[1], c.z, topAlt, alpha);
      n = addVertex(n, bl[0], bl[1], b.z, bottomAlt, alpha);
      n = addVertex(n, tr[0], tr[1], c.z, topAlt, alpha);
      n = addVertex(n, br[0], br[1], b.z, bottomAlt, alpha);
      n = addVertex(n, bl[0], bl[1], b.z, bottomAlt, alpha);
    }
    return n;
  }

  function renderRain(gl, args) {
    if (!enabled || !cells.length || safeNum(map.getZoom?.(), 0) < 10 || document.hidden) return;
    const matrix = args?.defaultProjectionData?.mainMatrix || args?.modelViewProjectionMatrix || args;
    let saved = null, info = null, n = 0;
    try {
      info = shaderInfo(gl, args);
      if (!info?.program) return;
      if (!info.projectionAware && (!matrix || typeof matrix.length !== 'number' || matrix.length < 16)) return;
      n = rainVertices(performance.now()); vertexCount = n;
      if (!n || !buffer) return;
      const a = info.attrs;
      saved = captureGL(gl, [a.pos, a.altitude, a.alpha]);
      if (vao) {
        if (vaoMode === 'native') gl.bindVertexArray(vao);
        else if (vaoMode === 'extension') vaoExt?.bindVertexArrayOES?.(vao);
      }
      gl.useProgram(info.program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      if (!bufferAllocated) { gl.bufferData(gl.ARRAY_BUFFER, vertexData.byteLength, gl.DYNAMIC_DRAW); bufferAllocated = true; }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertexData.subarray(0, n * FLOATS_PER_VERTEX));
      const stride = FLOATS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
      gl.enableVertexAttribArray(a.pos); gl.vertexAttribPointer(a.pos, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(a.altitude); gl.vertexAttribPointer(a.altitude, 1, gl.FLOAT, false, stride, 3 * 4);
      gl.enableVertexAttribArray(a.alpha); gl.vertexAttribPointer(a.alpha, 1, gl.FLOAT, false, stride, 4 * 4);
      if (info.projectionAware) {
        const p = args?.defaultProjectionData;
        if (!p) throw new Error('MapLibre projection uniforms unavailable for 3D rain');
        gl.uniformMatrix4fv(info.uniforms.projectionMatrix, false, p.mainMatrix);
        gl.uniformMatrix4fv(info.uniforms.projectionFallbackMatrix, false, p.fallbackMatrix);
        gl.uniform4fv(info.uniforms.projectionTileMercatorCoords, p.tileMercatorCoords);
        gl.uniform4fv(info.uniforms.projectionClippingPlane, p.clippingPlane);
        gl.uniform1f(info.uniforms.projectionTransition, p.projectionTransition);
        lastProjectionMode = 'maplibre-projectTileFor3D';
        projectionUniformsBound = true;
      } else {
        if (info.attrs.matrix) gl.uniformMatrix4fv(info.attrs.matrix, false, matrix);
        lastProjectionMode = 'main-matrix-fallback';
        projectionUniformsBound = false;
      }
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(false);
      gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.CULL_FACE);
      gl.drawArrays(gl.TRIANGLES, 0, n);
      lastRenderAt = Date.now(); rendererError = null;
    } catch (e) {
      droppedFrames++; projectionUniformsBound = false; rendererError = String(e?.stack || e).slice(0, 320);
    } finally { restoreGL(gl, saved); }
  }

  function createMemory(cell, now) {
    return { key: cell.key, cell, wetness: 0.22, createdAt: now, lastRainAt: now, lastTick: now };
  }
  function updateGround() {
    const now = Date.now(), features = [], z = safeNum(map.getZoom?.(), 0), center = map.getCenter?.();
    const ordered = [...cellMemories.values()].sort((a, b) => b.lastRainAt - a.lastRainAt);
    for (const mem of ordered.slice(0, 18)) {
      const c = mem.cell;
      if (!c || mem.wetness <= 0.045 || now - mem.lastRainAt > 9 * 60 * 1000) continue;
      if (center && distanceMeters(c, center) > Math.max(55000, c.radiusM * 3)) continue;
      features.push({ type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [ring(c.lng, c.lat, c.radiusM, 30, Math.round((c.lng + 180) * 1000))] },
        properties: { kind: 'wet-ground', wetness: mem.wetness, source: 'active source-backed rain observation', observedAt: mem.lastRainAt }
      });
    }
    puddleCount = 0;
    const canvas = map.getCanvas?.();
    if (z >= 13.5 && canvas && center) {
      const maxRadius = clamp(metersPerPixel(center.lat, z) * Math.min(canvas.clientWidth || 400, canvas.clientHeight || 700) * 0.26, 90, 850);
      const spacing = MOBILE ? 32 : 28;
      const iy0 = Math.floor((center.lat * 111320) / spacing), ix0 = Math.floor((center.lng * 111320 * Math.cos(center.lat * RAD)) / spacing);
      const reach = Math.ceil(maxRadius / spacing) + 1;
      const budget = MOBILE ? 96 : 240;
      const localCells = ordered.filter(mem => mem.wetness > 0.09 && now - mem.lastRainAt <= 9 * 60 * 1000 &&
        distanceMeters(mem.cell, center) <= mem.cell.radiusM);
      let made = 0;
      for (let iy = iy0 - reach; iy <= iy0 + reach && made < budget; iy++) {
        for (let ix = ix0 - reach; ix <= ix0 + reach && made < budget; ix++) {
          const seed = ix * 73856093 ^ iy * 19349663, latBase = iy * spacing / 111320;
          const cosLat = Math.max(0.12, Math.cos(latBase * RAD));
          const lngBase = ix * spacing / (111320 * cosLat);
          const lat = latBase + (hash(seed, 4, 1) - 0.5) * spacing * 0.55 / 111320;
          const lng = lngBase + (hash(seed, 5, 2) - 0.5) * spacing * 0.55 / (111320 * cosLat);
          const at = { lng, lat };
          if (distanceMeters(at, center) > maxRadius) continue;
          const mem = localCells.find(m => distanceMeters(at, m.cell) <= m.cell.radiusM);
          if (!mem || hash(seed, 9, 4) > (MOBILE ? 0.34 : 0.42)) continue;
          const size = clamp(metersPerPixel(lat, z) * (0.55 + hash(seed, 13, 3) * 1.55), 2.2, 26), length = size * (0.55 + hash(seed, 16, 5) * 0.9);
          const rotation = hash(seed, 19, 7) * Math.PI;
          features.push({ type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [puddlePolygon(lng, lat, size, length, rotation, seed, 8)] },
            properties: { kind: 'puddle', wetness: mem.wetness, shade: Math.floor(hash(seed, 21, 9) * 3), source: 'geographically anchored pooled rainwater' }
          });
          made++;
        }
      }
      puddleCount = made;
    }
    try { map.getSource(GROUND_SOURCE)?.setData({ type: 'FeatureCollection', features }); } catch (_) {}
    lastGroundUpdate = now;
    return puddleCount;
  }

  function tickGround() {
    groundTimer = 0;
    if (!cellMemories.size) return;
    const now = Date.now();
    for (const [key, mem] of cellMemories) {
      const dt = Math.max(0, now - mem.lastTick); mem.lastTick = now;
      if (cells.some(c => c.key === key)) {
        mem.wetness = clamp(mem.wetness + dt / 70000, 0.22, 1); mem.lastRainAt = now;
      } else if (now - mem.lastRainAt > 9000) mem.wetness = Math.max(0, mem.wetness - dt / 260000);
      if (mem.wetness <= 0.045 || now - mem.lastRainAt > 9 * 60 * 1000) cellMemories.delete(key);
    }
    updateGround();
    if (cellMemories.size) groundTimer = setTimeout(tickGround, 5000);
  }

  function refreshScene(nextScene = {}) {
    scene = nextScene || {};
    const now = Date.now(), nextCells = buildCells(scene);
    cells = nextCells;
    for (const c of cells) {
      const old = cellMemories.get(c.key);
      if (old) { old.cell = c; old.lastRainAt = now; }
      else cellMemories.set(c.key, createMemory(c, now));
    }
    drops = makeDropSeeds(cells);
    ensureGroundLayers(); ensureRainLayer(); updateGround();
    if (cells.length && enabled && safeNum(map.getZoom?.(), 0) >= 10) startAnimation();
    else stopAnimation();
    if (!groundTimer && cellMemories.size) groundTimer = setTimeout(tickGround, 5000);
    publishDiagnostic();
    try { map.triggerRepaint?.(); } catch (_) {}
  }

  function startAnimation() {
    if (animationRaf || !enabled || !cells.length || document.hidden) return;
    const loop = t => {
      animationRaf = 0;
      if (!enabled || !cells.length || document.hidden) return;
      if (safeNum(map.getZoom?.(), 0) < 10) { animationRaf = 0; return; }
      if (t - lastRepaint >= 33) {
        lastRepaint = t;
        try { map.triggerRepaint?.(); } catch (_) {}
      }
      animationRaf = requestAnimationFrame(loop);
    };
    animationRaf = requestAnimationFrame(loop);
  }
  function stopAnimation() {
    if (animationRaf) cancelAnimationFrame(animationRaf);
    animationRaf = 0;
  }
  function publishDiagnostic() {
    const d = window.__BP_RAIN_RENDERER_V6064__ || (window.__BP_RAIN_RENDERER_V6064__ = {});
    Object.assign(d, { version: VERSION, renderer: 'georeferenced-3D-rain-ribbons', enabled,
      worldAnchored: true, layerAttached: !!map.getLayer?.(LAYER_ID), shaderVariants: programCache.size,
      projectionAware: Array.from(programCache.values()).some(info => info.projectionAware), projectionMode: lastProjectionMode,
      projectionUniformsBound, rainCellCount: cells.length, particleSeeds: drops.length, activeVertices: vertexCount, puddleCount,
      groundSourceAttached: !!map.getSource?.(GROUND_SOURCE), rendererError, droppedFrames, lastRenderAt,
      lastGroundUpdate, updatedAt: Date.now(), zoom: safeNum(map.getZoom?.(), 0) });
  }
  function setEnabled(value) {
    enabled = !!value;
    try {
      for (const id of [LAYER_ID, WET_LAYER, PUDDLE_LAYER, PUDDLE_GLINT]) {
        const current = map.getLayoutProperty?.(id, 'visibility'), wanted = enabled ? 'visible' : 'none';
        if (map.getLayer?.(id) && current !== wanted) map.setLayoutProperty(id, 'visibility', wanted);
      }
    } catch (_) {}
    if (enabled && cells.length && safeNum(map.getZoom?.(), 0) >= 10) startAnimation();
    else stopAnimation();
    publishDiagnostic();
  }

  ensureGroundLayers(); ensureRainLayer();
  const onMoveEnd = () => refreshScene(getScene?.() || scene);
  map.on?.('moveend', onMoveEnd);
  map.on?.('zoomend', onMoveEnd);
  map.on?.('styledata', () => { ensureGroundLayers(); ensureRainLayer(); publishDiagnostic(); });
  map.on?.('load', () => { ensureGroundLayers(); ensureRainLayer(); publishDiagnostic(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAnimation();
    else if (enabled && cells.length && safeNum(map.getZoom?.(), 0) >= 10) startAnimation();
  });
  const api = { version: VERSION, map, setScene: refreshScene, setEnabled,
    get state() { return { version: VERSION, enabled, layerAttached: !!map.getLayer?.(LAYER_ID),
      shaderVariants: programCache.size, projectionAware: Array.from(programCache.values()).some(info => info.projectionAware),
       projectionMode: lastProjectionMode, projectionUniformsBound, rainCellCount: cells.length, particleSeeds: drops.length, activeVertices: vertexCount,
      anchorFingerprint: drops.slice(0, 8).map(d => `${d.lng.toFixed(5)},${d.lat.toFixed(5)},${d.baseAglM.toFixed(0)}`).join('|'),
      puddleCount, rendererError, droppedFrames, lastRenderAt, lastGroundUpdate, worldAnchored: true }; } };
  map.__bpRainRendererV6064 = api;
  window.__BP_RAIN_RENDERER_V6064__ = api;
  refreshScene(getScene?.() || {});
  return api;
}