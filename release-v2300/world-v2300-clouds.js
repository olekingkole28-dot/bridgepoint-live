const STYLE_ID = 'bp-sky-clouds-style-v6029';
const ROOT_CLASS = 'bp-sky-cloudfield-v5908';
const LAYER_ID = 'bp-sky-cloud-volume-v6029';
const MOBILE = (typeof innerWidth === 'number' && innerWidth <= 760) || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fract = v => v - Math.floor(v);
const hash = (a, b, c = 0) => fract(Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453123);
const number = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;

const CSS = [
  ':is(#liveMap,#previewMap) .' + ROOT_CLASS + '{position:absolute;inset:0;z-index:4;overflow:hidden;pointer-events:none;visibility:hidden;opacity:0;contain:paint;isolation:isolate;transition:opacity .32s ease,visibility .32s ease;}',
  ':is(#liveMap,#previewMap) .' + ROOT_CLASS + '[data-active="true"]{visibility:visible;opacity:1;}',
  ':is(#liveMap,#previewMap) .' + ROOT_CLASS + '::before{content:"";position:absolute;inset:0;opacity:0;background:linear-gradient(180deg,rgba(23,51,70,.11),rgba(8,24,40,.06) 45%,rgba(16,34,48,.02));mix-blend-mode:soft-light;transition:opacity .32s ease;}',
  ':is(#liveMap,#previewMap) .' + ROOT_CLASS + '[data-active="true"]::before{opacity:.8;}',
  '@media(prefers-reduced-motion:reduce){:is(#liveMap,#previewMap) .' + ROOT_CLASS + '{transition:none;}}'
].join('');

function makeShaders(webgl2, shaderData = null) {
  const projectionAware = !!(webgl2 && shaderData &&
    typeof shaderData.vertexShaderPrelude === 'string' && shaderData.vertexShaderPrelude.length &&
    typeof shaderData.define === 'string');
  const projectionPreamble = projectionAware
    ? shaderData.vertexShaderPrelude + '\n' + shaderData.define + '\n'
    : '';
  const vertex = (webgl2 ? '#version 300 es\n' : '') + projectionPreamble +
    'precision highp float;\n' +
    (webgl2
      ? 'in vec3 a_pos;\nin float a_altitude;\nin vec3 a_local;\nin float a_tint;\nout vec3 v_local;\nout float v_tint;\n'
      : 'attribute vec3 a_pos;\nattribute float a_altitude;\nattribute vec3 a_local;\nattribute float a_tint;\nvarying vec3 v_local;\nvarying float v_tint;\n') +
    (projectionAware ? '' : 'uniform mat4 u_matrix;\n') +
    'uniform float u_time;\n' +
    'void main(){v_local=a_local;v_tint=a_tint;float rainCell=smoothstep(1.1,1.3,a_tint);float seed=floor(a_tint*1000.0);float windAngle=fract(sin(seed*12.9898+23.7)*43758.5453)*6.2831853;float stormSpeed=mix(0.00000016,0.00000038,smoothstep(0.88,1.06,a_tint));float driftSpeed=stormSpeed*(1.0-rainCell);vec2 advect=vec2(cos(windAngle),sin(windAngle))*u_time*driftSpeed;gl_Position=' +
    (projectionAware ? 'projectTileFor3D(a_pos.xy+advect,a_altitude)' : 'u_matrix*vec4(a_pos.xy+advect,a_pos.z,1.0)') + ';}';

  const fragment = (webgl2 ? '#version 300 es\n' : '') +
    'precision mediump float;\n' +
    (webgl2 ? 'in vec3 v_local;\nin float v_tint;\nout vec4 bpColor;\n' : 'varying vec3 v_local;\nvarying float v_tint;\n') +
    'uniform float u_time;\n' +
    'float noise3(vec3 p){vec3 q=floor(p);vec3 f=fract(p);f=f*f*(3.0-2.0*f);float n=q.x+q.y*57.0+q.z*113.0;float a=fract(sin(n)*43758.5453);float b=fract(sin(n+1.0)*43758.5453);float c=fract(sin(n+57.0)*43758.5453);float d=fract(sin(n+58.0)*43758.5453);float e=fract(sin(n+113.0)*43758.5453);float f1=fract(sin(n+114.0)*43758.5453);float g=fract(sin(n+170.0)*43758.5453);float h=fract(sin(n+171.0)*43758.5453);return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,f1,f.x),mix(g,h,f.x),f.y),f.z);}\n' +
    'void main(){vec3 n=normalize(v_local);float edge=clamp(0.58+abs(v_local.z)*0.18,0.0,1.0);float broad=noise3(v_local*3.0+vec3(u_time*0.004,v_tint*1.7,0.0));float detail=noise3(v_local*7.0+vec3(u_time*0.018,v_tint*4.0,0.0));float billow=noise3(v_local*15.0+vec3(0.0,u_time*0.012,v_tint*8.0));float fine=noise3(v_local*27.0+vec3(u_time*0.008,v_tint*11.0,0.0));float diffuse=max(0.0,dot(n,normalize(vec3(-0.42,0.55,0.72))));float density=broad*0.42+detail*0.33+billow*0.25;float sculpt=smoothstep(0.22,0.66,density);float silver=clamp(0.24+diffuse*0.77+broad*0.08+detail*0.08+billow*0.05,0.0,1.0);vec3 lit=mix(vec3(0.30,0.39,0.48),vec3(0.98,0.99,1.0),silver);lit=mix(lit,vec3(0.84,0.89,0.95),pow(max(0.0,1.0-abs(dot(n,normalize(vec3(0.2,0.0,1.0))))),2.0)*0.16);float rainCell=smoothstep(1.1,1.3,v_tint);float stormCell=smoothstep(0.89,0.95,v_tint)*(1.0-rainCell);float hurricaneCell=smoothstep(1.00,1.07,v_tint)*(1.0-rainCell);lit=mix(lit,vec3(0.27,0.33,0.42),rainCell*0.68);lit=mix(lit,vec3(0.19,0.23,0.30),stormCell*0.46+hurricaneCell*0.62);float alpha=clamp(edge*(0.18+sculpt*0.42+diffuse*0.16+fine*0.07)*(1.0+rainCell*1.8+stormCell*0.14+hurricaneCell*0.24),0.045,0.94);' +
    (webgl2 ? 'bpColor=vec4(lit,alpha);' : 'gl_FragColor=vec4(lit,alpha);') +
    '}';
  return { vertex, fragment, projectionAware };
}
function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Cloud shader allocation failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader) || 'Cloud shader compilation failed';
    gl.deleteShader(shader);
    throw new Error(error);
  }
  return shader;
}
function compileProgram(gl, webgl2, shaderData = null) {
  const code = makeShaders(webgl2, shaderData);
  const vs = compileShader(gl, gl.VERTEX_SHADER, code.vertex);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, code.fragment);
  const program = gl.createProgram();
  if (!program) throw new Error('Cloud shader program allocation failed');
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program) || 'Cloud shader linking failed';
    gl.deleteProgram(program);
    throw new Error(error);
  }
  return program;
}

function captureCloudGLState(gl, locations, vaoExt = null, isolatedVao = false) {
  const enabled = name => { try { return gl.isEnabled(gl[name]); } catch (_) { return false; } };
  const parameter = name => { try { return gl.getParameter(gl[name]); } catch (_) { return null; } };
  let vaoMode = 'none', vaoBinding = null;
  try {
    if (typeof gl.bindVertexArray === 'function' && gl.VERTEX_ARRAY_BINDING != null) {
      vaoMode = 'native'; vaoBinding = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    } else if (vaoExt?.bindVertexArrayOES && vaoExt.VERTEX_ARRAY_BINDING_OES != null) {
      vaoMode = 'extension'; vaoBinding = gl.getParameter(vaoExt.VERTEX_ARRAY_BINDING_OES);
    }
  } catch (_) {}
  const attributes = isolatedVao ? [] : locations.filter(a => a >= 0).map(location => {
    try {
      return {
        location,
        enabled: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_ENABLED),
        buffer: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),
        size: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_SIZE),
        type: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_TYPE),
        normalized: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED),
        stride: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_STRIDE),
        offset: gl.getVertexAttribOffset(location, gl.VERTEX_ATTRIB_ARRAY_POINTER)
      };
    } catch (_) { return null; }
  }).filter(Boolean);
  return {
    program: parameter('CURRENT_PROGRAM'), array: parameter('ARRAY_BUFFER_BINDING'),
    element: parameter('ELEMENT_ARRAY_BUFFER_BINDING'), depth: enabled('DEPTH_TEST'),
    blend: enabled('BLEND'), cull: enabled('CULL_FACE'), stencil: enabled('STENCIL_TEST'),
    scissor: enabled('SCISSOR_TEST'), depthMask: parameter('DEPTH_WRITEMASK'),
    colorMask: parameter('COLOR_WRITEMASK'), srcRgb: parameter('BLEND_SRC_RGB'),
    dstRgb: parameter('BLEND_DST_RGB'), srcA: parameter('BLEND_SRC_ALPHA'),
    dstA: parameter('BLEND_DST_ALPHA'), eqRgb: parameter('BLEND_EQUATION_RGB'),
    eqA: parameter('BLEND_EQUATION_ALPHA'), attributes, vaoMode, vaoBinding, vaoExt, isolatedVao
  };
}
function bindCloudVertexArray(gl, vao, mode, vaoExt) {
  if (!vao) return;
  try {
    if (mode === 'native') gl.bindVertexArray(vao);
    else if (mode === 'extension') vaoExt?.bindVertexArrayOES?.(vao);
  } catch (_) {}
}
function restoreCloudGLState(gl, state) {
  if (!state) return;
  const capability = (name, value) => { try { if (value) gl.enable(gl[name]); else gl.disable(gl[name]); } catch (_) {} };
  try {
    if (state.vaoMode === 'native') gl.bindVertexArray(state.vaoBinding);
    else if (state.vaoMode === 'extension') state.vaoExt?.bindVertexArrayOES?.(state.vaoBinding);
  } catch (_) {}
  if (!state.isolatedVao) {
    for (const a of state.attributes || []) {
      try {
        if (a.buffer) {
          gl.bindBuffer(gl.ARRAY_BUFFER, a.buffer);
          gl.vertexAttribPointer(a.location, a.size, a.type, !!a.normalized, a.stride, a.offset);
        }
        if (a.enabled) gl.enableVertexAttribArray(a.location); else gl.disableVertexAttribArray(a.location);
      } catch (_) {}
    }
  }
  try { if (state.depthMask != null) gl.depthMask(state.depthMask); } catch (_) {}
  try { if (state.colorMask) gl.colorMask(...Array.from(state.colorMask)); } catch (_) {}
  capability('DEPTH_TEST', state.depth); capability('BLEND', state.blend);
  capability('CULL_FACE', state.cull); capability('STENCIL_TEST', state.stencil);
  capability('SCISSOR_TEST', state.scissor);
  try { if ([state.srcRgb,state.dstRgb,state.srcA,state.dstA].every(v => v != null)) gl.blendFuncSeparate(state.srcRgb,state.dstRgb,state.srcA,state.dstA); } catch (_) {}
  try { if (state.eqRgb != null && state.eqA != null) gl.blendEquationSeparate(state.eqRgb,state.eqA); } catch (_) {}
  try { gl.useProgram(state.program); } catch (_) {}
  try { gl.bindBuffer(gl.ARRAY_BUFFER, state.array); } catch (_) {}
  try { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, state.element); } catch (_) {}
}
function coordsOf(feature) {
  const points = [];
  const visit = value => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
      points.push([Number(value[0]), Number(value[1])]); return;
    }
    for (const item of value) visit(item);
  };
  visit(feature?.geometry?.coordinates);
  return points;
}
function centerOf(feature) {
  const points = coordsOf(feature);
  if (!points.length) return null;
  let lng = 0, lat = 0;
  for (const point of points) { lng += point[0]; lat += point[1]; }
  return [lng / points.length, lat / points.length];
}
function collectHeightFeatures(scene) {
  const raw = scene?.cloud_top_height_samples || scene?.cloud_top_heights || scene?.cloudHeightSamples || [];
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.features) ? raw.features.map(f => ({ ...f.properties, lng: f.geometry?.coordinates?.[0], lat: f.geometry?.coordinates?.[1] })) : [];
  return list.filter(x => Number.isFinite(Number(x?.lng)) && Number.isFinite(Number(x?.lat)) &&
    (Number.isFinite(Number(x?.cloud_top_height_m)) || Number.isFinite(Number(x?.cloudTopHeightM))));
}
function makePuffGeometry(THREEless, MC, vertices, indices, lng, lat, altitude, rx, ry, rz, tint, slices = 8, stacks = 5) {
  const c = MC.fromLngLat({ lng, lat }, Math.max(0, altitude));
  const unit = c.meterInMercatorCoordinateUnits();
  const base = vertices.length / 8;
  for (let j = 0; j <= stacks; j++) {
    const v = j / stacks, phi = Math.PI * v;
    const sz = Math.cos(phi), ring = Math.sin(phi);
    for (let i = 0; i <= slices; i++) {
      const u = i / slices, theta = TAU * u;
      const lx = Math.cos(theta) * ring;
      const ly = Math.sin(theta) * ring;
      vertices.push(c.x + lx * rx * unit, c.y + ly * ry * unit, c.z + sz * rz * unit, altitude + sz * rz, lx, ly, sz, tint);
    }
  }
  for (let j = 0; j < stacks; j++) for (let i = 0; i < slices; i++) {
    const a = base + j * (slices + 1) + i, b = a + slices + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
}
function makeFunnelGeometry(MC, vertices, indices, lng, lat, altitudeTop, tint) {
  const center = MC.fromLngLat({ lng, lat }, 0), unit = center.meterInMercatorCoordinateUnits();
  const base = vertices.length / 8, rings = 11, segments = 12;
  const bottomM = 220, topM = 5600;
  for (let j = 0; j <= rings; j++) {
    const t = j / rings;
    const zM = 220 + t * (Math.max(altitudeTop, 3500) - 220);
    const radius = bottomM + Math.pow(t, 0.9) * (Math.min(2600, topM) - bottomM);
    for (let i = 0; i <= segments; i++) {
      const a = TAU * i / segments, lx = Math.cos(a), ly = Math.sin(a);
      vertices.push(center.x + lx * radius * unit, center.y + ly * radius * unit, center.z + zM * unit, zM,
        lx * radius / topM, ly * radius / topM, t, tint);
    }
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < segments; i++) {
    const a = base + j * (segments + 1) + i, b = a + segments + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
}

export function initSkyClouds(target) {
  const map = target?.map || target;
  const container = map?.getContainer?.();
  const MC = window.maplibregl?.MercatorCoordinate || window.MapLibreGL?.MercatorCoordinate;
  if (!map || !container || !MC?.fromLngLat) return null;
  if (window.__BP_SKY_CLOUDS_V5908__?.map === map) return window.__BP_SKY_CLOUDS_V5908__;

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style'); style.id = STYLE_ID; style.textContent = CSS;
    document.head.appendChild(style);
  }
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  let overlay = container.querySelector('.' + ROOT_CLASS);
  if (!overlay) {
    overlay = document.createElement('div'); overlay.className = ROOT_CLASS;
    overlay.setAttribute('aria-hidden', 'true'); overlay.dataset.active = 'false';
    container.appendChild(overlay);
  }

  let enabled = true, disposed = false, animationTimer = 0, rebuildTimer = 0, refreshHandle = 0, layerRetryTimer = 0, layerRetryAttempts = 0, lastLayerHealthCheckAt = 0;
  let rainCellShelfCount = 0;
  let vertexData = new Float32Array(0), indexData = new Uint16Array(0);
  let globalCloudGeometryCache = null;
  let geometryDirty = true, formationCount = 0, measuredCount = 0, funnelCount = 0, stormCount = 0;
  let heightSource = 'not connected', rendererError = null, vbo = null, ibo = null, glRef = null;
  let cloudVao = null, cloudVaoExt = null, cloudVaoMode = 'none';
  const programCache = new Map();
  let activeProgramInfo = null, layerInstalled = false, originalFog, fogCaptured = false;
  const canvas = map.getCanvas?.(), originalFilter = canvas?.style?.filter || '';
  const originalWillChange = canvas?.style?.willChange || '', originalTransition = canvas?.style?.transition || '';

  function getScene() {
    return window.__bpWeatherV2300?.getScene?.() ||
      window.__bpPresentWeatherV2301?.getScene?.() ||
      window.__bpWeatherFXV2300?.state?.scene ||
      window.__BP_WEATHER_SCENE_V2300__ || {};
  }
  function publishState() {
    const state = {
      version: 6048, map, enabled, visible: enabled && !document.hidden,
      kind: 'georeferenced 3D cloud-volume layer',
      renderer: 'shared MapLibre WebGL context with isolated cloud vertex state where supported',
      cloudFormations: formationCount, globalCloudFormations: globalCloudGeometryCache?.formationCount || 0, coverageVersion: 6070, globalMacroFormations: globalCloudGeometryCache?.macroFormationCount || 0, globalFineFormations: globalCloudGeometryCache?.fineFormationCount || 0, globalCloudPuffs: globalCloudGeometryCache?.puffCount || 0, cloudMotion: 'GPU vertex advection; source-located storm volumes prioritized; rain-cell anchors held fixed in cloud-only phase',
      projectionMode: 'MapLibre shaderData projectTileFor3D', projectionShaderVariants: programCache.size,
      projectionShaderVariantNames: Array.from(programCache.keys()),
      persistentGlobalCloudField: true, localCloudFormations: Math.max(0, formationCount - (globalCloudGeometryCache?.formationCount || 0)), rainCellShelfClouds: rainCellShelfCount, redrawIntervalMs: MOBILE ? 450 : 300, measuredCloudSamples: measuredCount,
      cloudHeightSource: heightSource,
      layerPresent: !!map.getLayer?.(LAYER_ID), layerInstalled,
      layerRetryAttempts, mapStyleLoaded: map.isStyleLoaded?.() === true,
      mapStyleLayerCount: map.getStyle?.()?.layers?.length ?? 0, documentHidden: !!document.hidden,
      cloudHeightMode: measuredCount ? 'source-backed cloud-top height samples, with procedural fill between samples' : 'procedural altitude only; measured global cloud-top heights are not connected',
      warningFunnels: funnelCount, hurricaneStormVolumes: stormCount,
      funnelCaveat: funnelCount ? 'Illustrative funnel context inside active tornado-warning geometry; a warning is not confirmation of a tornado.' : null,
      rendererError, zoom: number(map.getZoom?.()), pitch: number(map.getPitch?.()), updatedAt: Date.now()
    };
    window.__BP_SKY_CLOUDS_STATE_V5908__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6029__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6031__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6045__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6046__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6047__ = state;
    window.dispatchEvent(new CustomEvent('bp:sky-cloud-state', { detail: state }));
    return state;
  }
  function setWorldGrade(on) {
    if (canvas?.style) {
      // Do not post-process the entire map canvas; this keeps phone rendering responsive.
      canvas.style.transition = originalTransition;
      canvas.style.willChange = originalWillChange;
      canvas.style.filter = originalFilter;
    }
    try {
      if (!fogCaptured) {
        const f = map.getStyle?.()?.fog;
        originalFog = f ? JSON.parse(JSON.stringify(f)) : null;
        fogCaptured = true;
      }
      if (typeof map.setFog === 'function') {
        map.setFog(on ? {
          color: '#92a3af', 'high-color': '#29475b', 'space-color': '#07131f',
          'horizon-blend': 0.12, 'star-intensity': 0, range: [0.55, 9.5]
        } : originalFog);
      }
    } catch (_) {}
    overlay.dataset.grade = on ? 'cinematic-atmosphere' : 'normal';
  }
  function getProgramInfo(gl, shaderData) {
    const webgl2 = String(gl.getParameter(gl.VERSION) || '').includes('WebGL 2');
    const projectionAware = !!(webgl2 && shaderData &&
      typeof shaderData.vertexShaderPrelude === 'string' && shaderData.vertexShaderPrelude.length &&
      typeof shaderData.define === 'string');
    const key = projectionAware ? String(shaderData.variantName || 'projection') : 'legacy-mercator';
    if (programCache.has(key)) return programCache.get(key);
    const program = compileProgram(gl, webgl2, projectionAware ? shaderData : null);
    const info = {
      key, program, projectionAware,
      attrs: {
        pos: gl.getAttribLocation(program, 'a_pos'),
        altitude: gl.getAttribLocation(program, 'a_altitude'),
        local: gl.getAttribLocation(program, 'a_local'),
        tint: gl.getAttribLocation(program, 'a_tint')
      },
      uniforms: {
        matrix: gl.getUniformLocation(program, 'u_matrix'),
        time: gl.getUniformLocation(program, 'u_time'),
        projectionMatrix: gl.getUniformLocation(program, 'u_projection_matrix'),
        projectionFallbackMatrix: gl.getUniformLocation(program, 'u_projection_fallback_matrix'),
        projectionTileMercatorCoords: gl.getUniformLocation(program, 'u_projection_tile_mercator_coords'),
        projectionClippingPlane: gl.getUniformLocation(program, 'u_projection_clipping_plane'),
        projectionTransition: gl.getUniformLocation(program, 'u_projection_transition')
      }
    };
    programCache.set(key, info); activeProgramInfo = info;
    publishState();
    return info;
  }

  function cleanupGpu(gl) {
    try { if (vbo) gl.deleteBuffer(vbo); } catch (_) {}
    try { if (ibo) gl.deleteBuffer(ibo); } catch (_) {}
    for (const info of programCache.values()) {
      try { if (info?.program) gl.deleteProgram(info.program); } catch (_) {}
    }
    try {
      if (cloudVao && cloudVaoMode === 'native') gl.deleteVertexArray(cloudVao);
      else if (cloudVao && cloudVaoMode === 'extension') cloudVaoExt?.deleteVertexArrayOES?.(cloudVao);
    } catch (_) {}
    cloudVao = null; cloudVaoExt = null; cloudVaoMode = 'none';
    programCache.clear(); activeProgramInfo = null;
    vbo = null; ibo = null; glRef = null;
  }
  const cloudLayer = {
    id: LAYER_ID, type: 'custom', renderingMode: '3d',
    onAdd(_map, gl) {
      glRef = gl;
      try {
        // The correct GPU program is compiled lazily for each MapLibre projection variant.
        vbo = gl.createBuffer(); ibo = gl.createBuffer();
        if (!vbo || !ibo) throw new Error('Cloud geometry buffer allocation failed');
        cloudVao = null; cloudVaoExt = null; cloudVaoMode = 'none';
        if (typeof gl.createVertexArray === 'function' && typeof gl.bindVertexArray === 'function') {
          cloudVao = gl.createVertexArray();
          if (cloudVao) cloudVaoMode = 'native';
        } else {
          try {
            cloudVaoExt = gl.getExtension?.('OES_vertex_array_object') || null;
            if (cloudVaoExt) {
              cloudVao = cloudVaoExt.createVertexArrayOES();
              if (cloudVao) cloudVaoMode = 'extension';
            }
          } catch (_) { cloudVao = null; cloudVaoMode = 'none'; }
        }
        programCache.clear(); activeProgramInfo = null;
        geometryDirty = true; rendererError = null;
      } catch (error) {
        rendererError = String(error?.message || error).slice(0, 180); cleanupGpu(gl);
      }
      publishState();
    },
    render(gl, args) {
      if (!enabled || document.hidden || disposed || !vbo || !ibo || indexData.length < 3) return;
      let saved = null;
      try {
        const info = getProgramInfo(gl, args?.shaderData);
        if (!info?.program) return;
        const matrix = args?.defaultProjectionData?.mainMatrix || args?.modelViewProjectionMatrix || args;
        if (!info.projectionAware && (!matrix || typeof matrix.length !== 'number' || matrix.length < 16)) return;
        saved = captureCloudGLState(gl, [info.attrs.pos, info.attrs.altitude, info.attrs.local, info.attrs.tint], cloudVaoExt, !!cloudVao);
        bindCloudVertexArray(gl, cloudVao, cloudVaoMode, cloudVaoExt);
        gl.useProgram(info.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        if (geometryDirty) {
          gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
          geometryDirty = false;
        } else gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        const stride = 8 * Float32Array.BYTES_PER_ELEMENT;
        gl.enableVertexAttribArray(info.attrs.pos); gl.vertexAttribPointer(info.attrs.pos, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(info.attrs.altitude); gl.vertexAttribPointer(info.attrs.altitude, 1, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(info.attrs.local); gl.vertexAttribPointer(info.attrs.local, 3, gl.FLOAT, false, stride, 4 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(info.attrs.tint); gl.vertexAttribPointer(info.attrs.tint, 1, gl.FLOAT, false, stride, 7 * Float32Array.BYTES_PER_ELEMENT);
        if (info.projectionAware) {
          const p = args?.defaultProjectionData;
          if (!p) throw new Error('MapLibre projection uniforms unavailable for 3D clouds');
          gl.uniformMatrix4fv(info.uniforms.projectionMatrix, false, p.mainMatrix);
          gl.uniformMatrix4fv(info.uniforms.projectionFallbackMatrix, false, p.fallbackMatrix);
          gl.uniform4fv(info.uniforms.projectionTileMercatorCoords, p.tileMercatorCoords);
          gl.uniform4fv(info.uniforms.projectionClippingPlane, p.clippingPlane);
          gl.uniform1f(info.uniforms.projectionTransition, p.projectionTransition);
        } else {
          gl.uniformMatrix4fv(info.uniforms.matrix, false, matrix);
        }
        gl.uniform1f(info.uniforms.time, (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000);
        gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
        gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.CULL_FACE); gl.depthMask(false);
        gl.drawElements(gl.TRIANGLES, indexData.length, gl.UNSIGNED_SHORT, 0);
        rendererError = null;
      } catch (error) {
        rendererError = String(error?.message || error).slice(0, 180); publishState();
      } finally {
        restoreCloudGLState(gl, saved);
      }
    },
    onRemove(_map, gl) { if (gl) cleanupGpu(gl); layerInstalled = false; }
  };

  function clearLayerRetry() {
    if (layerRetryTimer) clearTimeout(layerRetryTimer);
    layerRetryTimer = 0;
    layerRetryAttempts = 0;
  }
  function scheduleLayerRetry(delay = 240) {
    // Keep retrying at a low rate until the map style accepts the custom layer. A finite
    // retry cap can leave clouds missing after a temporary style transition or background tab.
    if (disposed || !enabled || layerRetryTimer) return;
    layerRetryAttempts += 1;
    layerRetryTimer = setTimeout(() => {
      layerRetryTimer = 0;
      if (disposed || !enabled) return;
      addLayerIfReady();
      if (!map.getLayer?.(LAYER_ID)) scheduleLayerRetry(Math.min(900, 180 + layerRetryAttempts * 45));
    }, delay);
  }
  function addLayerIfReady() {
    if (disposed) return;
    // A style may expose its layer graph before all sources/tiles finish loading.
    // Attempt attachment as soon as the graph exists; MapLibre errors are caught below
    // and retried without blocking the existing map or cloud geometry.
    const style = map.getStyle?.();
    if (!style || !Array.isArray(style.layers)) { scheduleLayerRetry(240); publishState(); return; }
    if (map.getLayer?.(LAYER_ID)) {
      layerInstalled = true;
      clearLayerRetry();
      return;
    }
    layerInstalled = false;
    try {
      const firstSymbol = map.getStyle?.()?.layers?.find(l => l.type === 'symbol')?.id;
      map.addLayer(cloudLayer, firstSymbol);
      layerInstalled = !!map.getLayer?.(LAYER_ID);
      if (layerInstalled) {
        clearLayerRetry();
        if (enabled) map.triggerRepaint?.();
      } else if (enabled) scheduleLayerRetry(240);
    } catch (error) {
      rendererError = String(error?.message || error).slice(0, 180);
      publishState();
      if (enabled) scheduleLayerRetry(280);
    }
  }

  function buildGlobalCloudGeometry() {
    if (globalCloudGeometryCache) return globalCloudGeometryCache;
    const vertices = [], indices = [], macroCandidates = [];
    const columns = 40, rows = 18, maxMacro = MOBILE ? 170 : 240;
    for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < columns; gx++) {
      const broad = hash(Math.floor(gx / 3), Math.floor(gy / 2), 901);
      const fine = hash(gx, gy, 902);
      if (broad * 0.58 + fine * 0.42 > 0.64) continue;
      macroCandidates.push({ gx, gy, rank: hash(gx, gy, 903), seed: hash(gx, gy, 904) });
    }
    macroCandidates.sort((a, b) => a.rank - b.rank);
    const macro = macroCandidates.slice(0, maxMacro);
    for (let k = 0; k < macro.length; k++) {
      const q = macro[k];
      const lat = clamp(-76 + q.gy * (152 / (rows - 1)) + (hash(q.gx, q.gy, 905) - 0.5) * 4.2, -77, 77);
      const lng = (((( -180 + q.gx * 9 + (hash(q.gx, q.gy, 906) - 0.5) * 5.2) + 180) % 360 + 360) % 360) - 180;
      const latScale = Math.sqrt(Math.max(0.16, Math.cos(lat * Math.PI / 180)));
      const radius = clamp(9 * 111320 * (0.39 + hash(q.gx, q.gy, 907) * 0.43) * latScale, 170000, 510000);
      const top = 4100 + hash(q.gx, q.gy, 908) * 7600;
      const base = Math.max(750, top * (0.29 + hash(q.gx, q.gy, 909) * 0.30));
      for (let i = 0; i < 3; i++) {
        const a = i * 2.399 + q.seed * 5.3;
        const ring = i === 0 ? 0 : radius * (0.28 + hash(k, i, 910) * 0.34);
        const puffLat = lat + Math.sin(a) * ring / 111320;
        const puffLng = lng + Math.cos(a) * ring / (111320 * Math.max(0.12, Math.cos(lat * Math.PI / 180)));
        const rx = radius * (i === 0 ? 1 : 0.42 + hash(k, i, 911) * 0.27);
        const ry = radius * (i === 0 ? 0.82 : 0.44 + hash(k, i, 912) * 0.29);
        const altitude = base + (top - base) * (i === 0 ? 0.52 : i === 1 ? 0.46 : 0.76 + hash(k, i, 913) * 0.04);
        const vertical = Math.max(1400, (top - base) * (i === 0 ? 0.88 : i === 1 ? 0.40 : 0.20 + hash(k, i, 914) * 0.06));
        makePuffGeometry(null, MC, vertices, indices, puffLng, puffLat, altitude, rx, ry, vertical,
          0.28 + hash(k, i, 915) * 0.52, MOBILE ? 6 : 7, 4);
      }
    }

    // A finer, fixed geographic lattice keeps recognizable 3D clouds present on close zooms.
    const fineColumns = 84, fineRows = 38, maxFine = MOBILE ? 360 : 680;
    const fineCandidates = [];
    for (let gy = 0; gy < fineRows; gy++) for (let gx = 0; gx < fineColumns; gx++) {
      fineCandidates.push({ gx, gy, rank: hash(gx, gy, 951), seed: hash(gx, gy, 952) });
    }
    fineCandidates.sort((a, b) => a.rank - b.rank);
    const fine = fineCandidates.slice(0, maxFine);
    for (let k = 0; k < fine.length; k++) {
      const q = fine[k];
      const lat = clamp(-78 + q.gy * (156 / (fineRows - 1)) + (hash(q.gx, q.gy, 953) - 0.5) * 1.8, -78, 78);
      const lng = (((( -180 + q.gx * (360 / fineColumns) + (hash(q.gx, q.gy, 954) - 0.5) * 2.0) + 180) % 360 + 360) % 360) - 180;
      const latScale = Math.sqrt(Math.max(0.16, Math.cos(lat * Math.PI / 180)));
      const radius = clamp((26000 + hash(q.gx, q.gy, 955) * 78000) * latScale, 18000, 105000);
      const top = 2700 + hash(q.gx, q.gy, 956) * 8800;
      const base = Math.max(550, top * (0.28 + hash(q.gx, q.gy, 957) * 0.36));
      const altitude = base + (top - base) * (0.51 + hash(q.gx, q.gy, 958) * 0.12);
      const vertical = Math.max(1600, (top - base) * (0.38 + hash(q.gx, q.gy, 959) * 0.12));
      makePuffGeometry(null, MC, vertices, indices, lng, lat, altitude, radius,
        radius * (0.58 + hash(q.gx, q.gy, 960) * 0.36), vertical,
        0.26 + hash(q.gx, q.gy, 961) * 0.62, MOBILE ? 6 : 7, 4);
    }
    globalCloudGeometryCache = {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
      formationCount: macro.length + fine.length, macroFormationCount: macro.length, fineFormationCount: fine.length, puffCount: macro.length * 3 + fine.length
    };
    return globalCloudGeometryCache;
  }

  function seedGlobalGeometry() {
    const global = buildGlobalCloudGeometry();
    vertexData = global.vertices;
    indexData = global.indices;
    formationCount = global.formationCount;
    geometryDirty = true;
    rendererError = null;
    publishState();
    map.triggerRepaint?.();
  }

function generateGeometry() {
    if (disposed || !enabled) return;
    const z = number(map.getZoom?.());
    const maxForm = MOBILE ? 18 : 40;
    const vertices = [], indices = [], formations = [];
    measuredCount = 0; funnelCount = 0; stormCount = 0; rainCellShelfCount = 0;
    const scene = getScene();
    const measured = collectHeightFeatures(scene);
    measuredCount = measured.length;
    heightSource = measuredCount ? String(measured[0]?.source || measured[0]?.provenance || 'world-effects cloud-height samples') : 'not connected';
    const stormList = Array.isArray(scene?.storms) ? scene.storms : [];
    const alerts = Array.isArray(scene?.alerts) ? scene.alerts : [];
    const getLon = lng => ((((lng + 180) % 360) + 360) % 360) - 180;
    function addFormation(lng, lat, radiusM, baseM, topM, seed, kind = 'ordinary') {
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 82 || formations.length >= maxForm) return;
      formations.push({ lng: getLon(lng), lat, radiusM: clamp(radiusM, 600, 520000),
        baseM: clamp(baseM, 450, 14000), topM: clamp(topM, baseM + 180, 18500), seed, kind });
    }

    // Rain-only cloud anchors: source-reported precipitation observations get a local 3D cloud base.
    // This supplements, rather than replaces, the persistent global cloud field and existing cloud shader.
    const rainAnchorObservations = (window.__BP_CLOUDS_ONLY_PHASE_V6070__ === true ? [] : (Array.isArray(scene?.observations) ? scene.observations : []))
      .filter(o => {
        const raw = String([o?.weather, o?.present_weather, o?.weather_text, o?.wx, o?.condition, o?.conditions, o?.rawdata]
          .filter(Boolean).join(' ')).toLowerCase();
        if (/hail|graupel|ice pellet|snow|flurr|blizzard/.test(raw) && !/freezing rain/.test(raw)) return false;
        return /\bra\b|\bdz\b|rain|drizzle|shower|thunderstorm|\bts\b/.test(raw);
      })
      .filter(o => Number.isFinite(Number(o?.lng ?? o?.longitude)) && Number.isFinite(Number(o?.lat ?? o?.latitude)))
      .sort((a, b) => {
        const c = map.getCenter?.();
        if (!c) return 0;
        const da = Math.hypot((Number(a.lng ?? a.longitude) - c.lng) * Math.cos(c.lat * Math.PI / 180), Number(a.lat ?? a.latitude) - c.lat);
        const db = Math.hypot((Number(b.lng ?? b.longitude) - c.lng) * Math.cos(c.lat * Math.PI / 180), Number(b.lat ?? b.latitude) - c.lat);
        return da - db;
      });
    for (const sample of rainAnchorObservations.slice(0, MOBILE ? 4 : 8)) {
      const lng = number(sample.lng, number(sample.longitude, NaN));
      const lat = number(sample.lat, number(sample.latitude, NaN));
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      const raw = String([sample.weather, sample.present_weather, sample.weather_text, sample.wx, sample.condition, sample.rawdata]
        .filter(Boolean).join(' ')).toLowerCase();
      const thunderstorm = /thunderstorm|\bts\b|squall/.test(raw);
      const elevation = Math.max(0, number(map.queryTerrainElevation?.([lng, lat]), 0));
      const baseAgl = clamp(number(sample.cloud_base_height_m, number(sample.cloudBaseHeightM, thunderstorm ? 450 : 350)), 180, 4200);
      const top = clamp(number(sample.cloud_top_height_m, number(sample.cloudTopHeightM, thunderstorm ? 2800 : 1800)), baseAgl + 500, 16000);
      const suppliedRadius = number(sample.precipitation_radius_mi, number(sample.rain_radius_mi, NaN));
      const radiusM = Number.isFinite(suppliedRadius) && suppliedRadius > 0
        ? clamp(suppliedRadius * 1609.34, 2200, 26000)
        : (thunderstorm ? 900 : 650);
      addFormation(lng, lat, radiusM, elevation + baseAgl, elevation + top,
        hash(lng, lat, 6058), 'rain-cell');
    }

    // Existing source-measured cloud-height samples stay intact.
    for (const sample of measured.slice(0, MOBILE ? 4 : 5)) {
      const top = number(sample.cloud_top_height_m, number(sample.cloudTopHeightM));
      if (top < 200 || top > 23000) continue;
      addFormation(number(sample.lng), number(sample.lat), number(sample.radius_m || sample.radius_meters, 6500),
        number(sample.cloud_base_height_m, top * 0.64), top, hash(number(sample.lng), number(sample.lat), 8), 'measured');
    }

    // Cyclone/storm geometry uses the supplied storm coordinates, not camera bounds.
    for (const storm of stormList.slice(0, MOBILE ? 1 : 4)) {
      const lng = number(storm.lng, number(storm.longitude, NaN)), lat = number(storm.lat, number(storm.latitude, NaN));
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 82) continue;
      const name = String(storm.name || storm.event || storm.type || '').toLowerCase();
      const hurricane = /hurricane|tropical|cyclone|typhoon/.test(name) || number(storm.wind_mph) >= 64 || number(storm.wind_kt) >= 56;
      const radius = clamp(number(storm.eye_radius_mi, 18) * 1609.34, 18000, 95000);
      const turns = hurricane ? 9 : 4;
      for (let i = 0; i < turns; i++) {
        const a = i * 2.399 + hash(lng, lat, i) * 0.7;
        const r = radius * (0.35 + 0.75 * (i / turns));
        const dlat = (r * Math.sin(a)) / 111320;
        const dlng = (r * Math.cos(a)) / (111320 * Math.max(0.12, Math.cos(lat * Math.PI / 180)));
        addFormation(lng + dlng, lat + dlat, radius * (hurricane ? 0.42 : 0.30),
          2600 + hash(lng, lat, i + 20) * 3000, 7500 + hash(lng, lat, i + 30) * 6700,
          hash(lng, lat, i + 40), hurricane ? 'hurricane' : 'storm');
      }
      if (hurricane) stormCount++;
    }

    // A warning polygon is illustrative context, not confirmation of a tornado.
    for (const alert of alerts) {
      if (formations.length >= maxForm) break;
      const p = alert?.properties || alert || {};
      const desc = String([p.phenom, p.event, p.headline, p.event_name, p.description].join(' ')).toLowerCase();
      if (!(/\btornado\b/.test(desc) || String(p.phenom || '').toUpperCase() === 'TO')) continue;
      const center = centerOf(alert);
      if (center) { addFormation(center[0], center[1], 10000, 3000, 11000, hash(center[0], center[1], 88), 'funnel'); funnelCount++; }
    }

    function puff(lng, lat, altitude, rx, ry, rz, seed, tint) {
      // Use a real 3D ellipsoid mesh at every camera zoom, not a 2D fallback at close range.
      makePuffGeometry(null, MC, vertices, indices, getLon(lng), clamp(lat, -82, 82),
        altitude, rx, ry, rz, tint, MOBILE ? 6 : 8, MOBILE ? 4 : 5);
    }
    for (let k = 0; k < formations.length; k++) {
      const f = formations[k], n = MOBILE ? 3 : 5;
      for (let i = 0; i < n; i++) {
        const a = i * 2.399 + f.seed * 5.3;
        const ring = i === 0 ? 0 : f.radiusM * (0.20 + hash(k, i, 1) * 0.46);
        const lat = f.lat + Math.sin(a) * ring / 111320;
        const lng = f.lng + Math.cos(a) * ring / (111320 * Math.max(0.12, Math.cos(f.lat * Math.PI / 180)));
        const scaleX = i === 0 ? 1.00 : 0.45 + hash(k, i, 3) * 0.54;
        const scaleY = i === 0 ? 0.76 : 0.44 + hash(k, i, 4) * 0.48;
        const altitude = f.baseM + (f.topM - f.baseM) * (i === 0 ? 0.42 : 0.18 + hash(k, i, 5) * 0.70);
        const vertical = Math.max(420, (f.topM - f.baseM) * (i === 0 ? 0.54 : 0.34 + hash(k, i, 6) * 0.20));
        puff(lng, lat, altitude, f.radiusM * scaleX, f.radiusM * scaleY, vertical, f.seed,
          f.kind === 'rain-cell' ? 1.35 : f.kind === 'hurricane' ? 1.02 + hash(k, i, 7) * 0.05 : f.kind === 'storm' ? 0.90 + hash(k, i, 7) * 0.07 : f.kind === 'funnel' ? 1.14 : 0.22 + hash(k, i, 7) * 0.52);
      }
      if (f.kind === 'rain-cell') {
        // Distinct low rain-cloud shelf: same world coordinates and cloud base as rain seeds.
        const shelfAltitude = f.baseM + clamp((f.topM - f.baseM) * 0.06, 90, 180);
        puff(f.lng, f.lat, shelfAltitude, f.radiusM * 0.38, f.radiusM * 0.30,
          clamp((f.topM - f.baseM) * 0.10, 180, 320), 1.35, 1.35);
        rainCellShelfCount++;
      }
      if (f.kind === 'funnel' && !MOBILE) makeFunnelGeometry(MC, vertices, indices, f.lng, f.lat, f.topM, 0.92);
    }
    const global = buildGlobalCloudGeometry();
    const globalVertexCount = Math.floor(global.vertices.length / 8);
    const localVertexCount = Math.min(Math.floor(vertices.length / 8), 65530 - globalVertexCount);
    vertexData = new Float32Array(global.vertices.length + localVertexCount * 8);
    vertexData.set(global.vertices, 0);
    vertexData.set(vertices.slice(0, localVertexCount * 8), global.vertices.length);
    const mergedIndices = new Uint16Array(global.indices.length + indices.length);
    mergedIndices.set(global.indices, 0);
    let mergedCount = global.indices.length;
    for (const index of indices) {
      if (index < localVertexCount && globalVertexCount + index < 65530) mergedIndices[mergedCount++] = globalVertexCount + index;
    }
    indexData = mergedCount === mergedIndices.length ? mergedIndices : mergedIndices.slice(0, mergedCount);
    formationCount = global.formationCount + formations.length;
    geometryDirty = true;
    rendererError = null;
    publishState();
    map.triggerRepaint?.();
  }

function scheduleGeometry(delay = 180) {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      if (enabled && !disposed) {
        try { generateGeometry(); }
        catch (error) { rendererError = String(error?.message || error).slice(0, 180); publishState(); }
      }
    }, delay);
  }
  function startAnimation() {
    if (animationTimer || !enabled || document.hidden) return;
    animationTimer = setInterval(() => {
      if (disposed || !enabled || document.hidden) return;
      // If another map subsystem replaces the style/layers, restore our custom cloud renderer.
      // This check is intentionally sparse so the always-on cloud field stays light on phones.
      const now = Date.now();
      if (!map.getLayer?.(LAYER_ID) && now - lastLayerHealthCheckAt >= 1800) {
        lastLayerHealthCheckAt = now;
        layerRetryAttempts = 0;
        addLayerIfReady();
      }
      // Map gestures already drive frames. Avoid stacking extra cloud repaint requests while moving.
      if (layerInstalled && !map.isMoving?.()) map.triggerRepaint?.();
    }, MOBILE ? 450 : 300);
  }
  function stopAnimation() {
    if (animationTimer) clearInterval(animationTimer);
    animationTimer = 0;
  }

  function setEnabled(value) {
    enabled = !!value;
    overlay.dataset.active = enabled && !document.hidden ? 'true' : 'false';
    setWorldGrade(enabled);
    if (enabled) {
      layerRetryAttempts = 0;
      addLayerIfReady();
      if (!map.getLayer?.(LAYER_ID)) scheduleLayerRetry(300);
      if (indexData.length < 3) {
        try { seedGlobalGeometry(); }
        catch (error) { rendererError = String(error?.message || error).slice(0, 180); publishState(); }
      }
      scheduleGeometry(0);
      startAnimation();
    } else {
      clearLayerRetry();
      stopAnimation(); clearTimeout(rebuildTimer);
      vertexData = new Float32Array(0); indexData = new Uint16Array(0);
      geometryDirty = true; formationCount = 0; measuredCount = 0; funnelCount = 0; stormCount = 0;
    }
    publishState(); map.triggerRepaint?.();
    return enabled;
  }
  function toggle() { return setEnabled(!enabled); }
  function onVisibility() {
    overlay.dataset.active = enabled && !document.hidden ? 'true' : 'false';
    if (enabled && !document.hidden) { scheduleGeometry(0); startAnimation(); } else stopAnimation();
    publishState();
  }
  function onMoveEnd() { if (enabled) publishState(); }
  function onWeatherUpdated() {
    // Weather arrives after the global cloud field starts. Rebuild the local
    // rain-cell cloud formations from the same observation coordinates/heights
    // so precipitation has a real 3D cloud base over its reported rain footprint.
    if (enabled && !disposed) scheduleGeometry(0);
  }
  function onStyleData() { if (enabled && !map.getLayer?.(LAYER_ID)) { layerRetryAttempts = 0; addLayerIfReady(); } }
  function onLayerIdle() { if (enabled && !disposed && !map.getLayer?.(LAYER_ID)) { layerRetryAttempts = 0; addLayerIfReady(); } }

  map.on?.('moveend', onMoveEnd); map.on?.('zoomend', onMoveEnd); map.on?.('resize', onMoveEnd);
  map.on?.('styledata', onStyleData);
  map.on?.('style.load', onStyleData);
  window.addEventListener('bp2300:weather-updated', onWeatherUpdated);
  map.on?.('load', onLayerIdle);
  map.on?.('idle', onLayerIdle);
  document.addEventListener('visibilitychange', onVisibility);
  const onToggleEvent = event => { if (event?.detail?.map && event.detail.map !== map) return; toggle(); };
  window.addEventListener('bp:sky-cloud-toggle', onToggleEvent);
  if (map.isStyleLoaded?.()) addLayerIfReady();
  else map.once?.('load', addLayerIfReady);

  const api = {
    version: 6048, map, overlay,
    get enabled() { return enabled; },
    setEnabled, toggle,
    get state() { return window.__BP_SKY_CLOUDS_STATE_V6047__ || window.__BP_SKY_CLOUDS_STATE_V6046__ || window.__BP_SKY_CLOUDS_STATE_V6045__ || window.__BP_SKY_CLOUDS_STATE_V6031__ || window.__BP_SKY_CLOUDS_STATE_V6029__ || window.__BP_SKY_CLOUDS_STATE_V5908__ || null; },
    destroy() {
      if (disposed) return; disposed = true;
      stopAnimation(); clearTimeout(rebuildTimer); clearTimeout(refreshHandle); clearLayerRetry();
      map.off?.('moveend', onMoveEnd); map.off?.('zoomend', onMoveEnd); map.off?.('resize', onMoveEnd); map.off?.('styledata', onStyleData); map.off?.('style.load', onStyleData); map.off?.('load', onLayerIdle); map.off?.('idle', onLayerIdle);
      document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('bp:sky-cloud-toggle', onToggleEvent);
      window.removeEventListener('bp2300:weather-updated', onWeatherUpdated);
      setWorldGrade(false);
      try { if (map.getLayer?.(LAYER_ID)) map.removeLayer(LAYER_ID); } catch (_) {}
      overlay.remove();
      if (window.__BP_SKY_CLOUDS_V5908__ === api) delete window.__BP_SKY_CLOUDS_V5908__;
    }
  };
  window.__BP_SKY_CLOUDS_V5908__ = api;
  publishState();
  if (enabled) setEnabled(true);
  return api;
}
