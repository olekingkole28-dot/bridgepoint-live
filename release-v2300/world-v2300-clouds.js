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
      ? 'in vec3 a_pos;\nin float a_altitude;\nin vec3 a_local;\nin float a_tint;\nin vec2 a_center;\nout vec3 v_local;\nout float v_tint;\nout float v_anim_altitude;\n'
      : 'attribute vec3 a_pos;\nattribute float a_altitude;\nattribute vec3 a_local;\nattribute float a_tint;\nattribute vec2 a_center;\nvarying vec3 v_local;\nvarying float v_tint;\nvarying float v_anim_altitude;\n') +
    'uniform float u_time;\n' +
    (projectionAware ? '' : 'uniform mat4 u_matrix;\n') +
    'void main(){vec2 xy=a_pos.xy;float altitude=a_altitude;float stormTag=step(2.0,a_tint)*(1.0-step(2.5,a_tint));float rainTag=step(2.5,a_tint)*(1.0-step(3.5,a_tint));' +
    'if(stormTag>0.5||rainTag>0.5){float radial=length(xy-a_center);float direction=(a_tint<2.2||(stormTag>0.5&&a_tint<2.45)||(rainTag>0.5&&a_tint<3.0))?-1.0:1.0;float angularRate=rainTag>0.5?0.065:(0.055+0.026/(0.04+radial*60.0));float angle=direction*u_time*angularRate;float sn=sin(angle);float cs=cos(angle);vec2 d=xy-a_center;xy=a_center+vec2(d.x*cs-d.y*sn,d.x*sn+d.y*cs);if(stormTag>0.5){if(a_tint>=2.4){float phaseBase=a_tint<2.45?2.405:2.455;float climbPhase=mod(u_time*130.0+(a_tint-phaseBase)*130000.0,13000.0);float climbFraction=climbPhase/13000.0;xy=a_center+(xy-a_center)*(1.0+climbFraction*0.48);altitude=450.0+climbPhase+a_local.z*380.0;}else{altitude+=sin(u_time*0.72+a_tint*83.0+radial*1400.0)*70.0;}}}' +
    'if(rainTag>0.5){float fallPhase=mod(u_time*620.0+fract(a_tint*37.0)*10800.0,10800.0);altitude=180.0+mod(a_altitude-180.0-fallPhase+10800.0,10800.0)-a_local.z*260.0;}' +
    'v_local=a_local;v_tint=a_tint;v_anim_altitude=altitude;gl_Position=' +
    (projectionAware
      ? 'projectTileFor3D(xy,altitude)'
      : 'u_matrix*vec4(xy,a_pos.z+(altitude-a_altitude)/(max(0.05,cos(atan(sinh(3.14159265*(1.0-2.0*a_center.y)))))*40075016.685),1.0)') +
    ';}';

  const fragment = (webgl2 ? '#version 300 es\n' : '') +
    'precision mediump float;\n' +
    (webgl2 ? 'in vec3 v_local;\nin float v_tint;\nin float v_anim_altitude;\nout vec4 bpColor;\n' : 'varying vec3 v_local;\nvarying float v_tint;\nvarying float v_anim_altitude;\n') +
    'uniform float u_time;\n' +
    'float noise3(vec3 p){vec3 q=floor(p);vec3 f=fract(p);f=f*f*(3.0-2.0*f);float n=q.x+q.y*57.0+q.z*113.0;float a=fract(sin(n)*43758.5453);float b=fract(sin(n+1.0)*43758.5453);float c=fract(sin(n+57.0)*43758.5453);float d=fract(sin(n+58.0)*43758.5453);float e=fract(sin(n+113.0)*43758.5453);float f1=fract(sin(n+114.0)*43758.5453);float g=fract(sin(n+170.0)*43758.5453);float h=fract(sin(n+171.0)*43758.5453);return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,f1,f.x),mix(g,h,f.x),f.y),f.z);}\n' +
    'float bpLightningPulse(float t){float q=t*2.35;float phase=fract(q);float cycle=floor(q);float roll=fract(sin(cycle*12.9898+t*78.233)*43758.5453);return step(0.80,roll)*(1.0-smoothstep(0.015,0.16,phase));}\n' +
    'void main(){if(v_tint>=3.5){float pulse=bpLightningPulse(u_time+v_tint*0.11);float core=1.0-smoothstep(0.08,1.0,abs(v_local.x));float alpha=pulse*(0.42+core*0.58);if(alpha<0.012)discard;vec3 bolt=mix(vec3(0.24,0.56,1.0),vec3(0.96,0.99,1.0),core);' +
    (webgl2 ? 'bpColor=vec4(bolt,alpha);' : 'gl_FragColor=vec4(bolt,alpha);') + 'return;}' +
    'if(v_tint>=2.5&&v_tint<3.5){float widthFade=1.0-smoothstep(0.12,1.0,abs(v_local.x));float rainHeight=v_anim_altitude;float groundFade=smoothstep(14.0,120.0,rainHeight);float breakup=0.64+0.36*noise3(vec3(v_local.xy*8.0,u_time*0.35+v_tint*8.0));float alpha=widthFade*groundFade*breakup*0.54;if(alpha<0.01)discard;vec3 rain=mix(vec3(0.26,0.52,0.72),vec3(0.86,0.96,1.0),clamp(0.5+v_local.z*0.5,0.0,1.0));' +
    (webgl2 ? 'bpColor=vec4(rain,alpha);' : 'gl_FragColor=vec4(rain,alpha);') + 'return;}' +
    'vec3 n=normalize(v_local);float edge=clamp(0.58+abs(v_local.z)*0.18,0.0,1.0);float broad=noise3(v_local*3.0+vec3(u_time*0.004,v_tint*1.7,0.0));float detail=noise3(v_local*7.0+vec3(u_time*0.018,v_tint*4.0,0.0));float billow=noise3(v_local*15.0+vec3(0.0,u_time*0.012,v_tint*8.0));float fine=noise3(v_local*27.0+vec3(u_time*0.008,v_tint*11.0,0.0));float diffuse=max(0.0,dot(n,normalize(vec3(-0.42,0.55,0.72))));float density=broad*0.42+detail*0.33+billow*0.25;float sculpt=smoothstep(0.22,0.66,density);float silver=clamp(0.24+diffuse*0.77+broad*0.08+detail*0.08+billow*0.05,0.0,1.0);vec3 lit=mix(vec3(0.30,0.39,0.48),vec3(0.98,0.99,1.0),silver);lit=mix(lit,vec3(0.84,0.89,0.95),pow(max(0.0,1.0-abs(dot(n,normalize(vec3(0.2,0.0,1.0))))),2.0)*0.16);float alpha=clamp(edge*(0.18+sculpt*0.42+diffuse*0.16+fine*0.07),0.045,0.72);if(v_tint>=2.0&&v_tint<2.5){float flash=bpLightningPulse(u_time+v_tint*0.11);lit=mix(lit,vec3(0.88,0.95,1.0),flash*0.82);alpha=clamp(alpha+flash*0.16,0.055,0.84);}' +
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

function captureCloudGLState(gl, locations) {
  const enabled = name => { try { return gl.isEnabled(gl[name]); } catch (_) { return false; } };
  const parameter = name => { try { return gl.getParameter(gl[name]); } catch (_) { return null; } };
  const attributes = locations.filter(a => a >= 0).map(location => {
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
    eqA: parameter('BLEND_EQUATION_ALPHA'), attributes
  };
}
function restoreCloudGLState(gl, state) {
  if (!state) return;
  const capability = (name, value) => { try { if (value) gl.enable(gl[name]); else gl.disable(gl[name]); } catch (_) {} };
  for (const a of state.attributes || []) {
    try {
      if (a.buffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, a.buffer);
        gl.vertexAttribPointer(a.location, a.size, a.type, !!a.normalized, a.stride, a.offset);
      }
      if (a.enabled) gl.enableVertexAttribArray(a.location); else gl.disableVertexAttribArray(a.location);
    } catch (_) {}
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
function pushCloudVertex(vertices, x, y, z, altitude, lx, ly, lz, tint, centerX, centerY) {
  vertices.push(x, y, z, altitude, lx, ly, lz, tint, centerX, centerY);
}
function makePuffGeometry(THREEless, MC, vertices, indices, lng, lat, altitude, rx, ry, rz, tint, slices = 8, stacks = 5, rotationCenter = null) {
  const c = MC.fromLngLat({ lng, lat }, Math.max(0, altitude));
  const unit = c.meterInMercatorCoordinateUnits();
  const pivot = rotationCenter ? MC.fromLngLat({ lng: rotationCenter.lng, lat: rotationCenter.lat }, 0) : MC.fromLngLat({ lng, lat }, 0);
  const base = vertices.length / 10;
  for (let j = 0; j <= stacks; j++) {
    const v = j / stacks, phi = Math.PI * v;
    const sz = Math.cos(phi), ring = Math.sin(phi);
    for (let i = 0; i <= slices; i++) {
      const u = i / slices, theta = TAU * u;
      const lx = Math.cos(theta) * ring;
      const ly = Math.sin(theta) * ring;
      pushCloudVertex(vertices, c.x + lx * rx * unit, c.y + ly * ry * unit, c.z + sz * rz * unit,
        altitude + sz * rz, lx, ly, sz, tint, pivot.x, pivot.y);
    }
  }
  for (let j = 0; j < stacks; j++) for (let i = 0; i < slices; i++) {
    const a = base + j * (slices + 1) + i, b = a + slices + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
}
function makeFunnelGeometry(MC, vertices, indices, lng, lat, altitudeTop, tint) {
  const center = MC.fromLngLat({ lng, lat }, 0), unit = center.meterInMercatorCoordinateUnits();
  const base = vertices.length / 10, rings = 11, segments = 12;
  const bottomM = 220, topM = 5600;
  for (let j = 0; j <= rings; j++) {
    const t = j / rings;
    const zM = 220 + t * (Math.max(altitudeTop, 3500) - 220);
    const radius = bottomM + Math.pow(t, 0.9) * (Math.min(2600, topM) - bottomM);
    for (let i = 0; i <= segments; i++) {
      const a = TAU * i / segments, lx = Math.cos(a), ly = Math.sin(a);
      pushCloudVertex(vertices, center.x + lx * radius * unit, center.y + ly * radius * unit,
        center.z + zM * unit, zM, lx * radius / topM, ly * radius / topM, t, tint, center.x, center.y);
    }
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < segments; i++) {
    const a = base + j * (segments + 1) + i, b = a + segments + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
}
function makeHurricaneWallGeometry(MC, vertices, indices, lng, lat, eyeRadiusM, topM, tint) {
  const center = MC.fromLngLat({ lng, lat }, 0), unit = center.meterInMercatorCoordinateUnits();
  const segments = MOBILE ? 20 : 30, levels = MOBILE ? 5 : 7;
  const inner = clamp(eyeRadiusM * 0.78, 6500, 31000);
  const outer = inner + clamp(eyeRadiusM * 0.92, 9000, 28000);
  const baseAltitude = 750;
  for (let side = 0; side < 2; side++) {
    const baseRadius = side === 0 ? inner : outer;
    for (let j = 0; j < levels; j++) {
      const t0 = j / levels, t1 = (j + 1) / levels;
      const z0 = baseAltitude + t0 * (topM - baseAltitude), z1 = baseAltitude + t1 * (topM - baseAltitude);
      for (let i = 0; i < segments; i++) {
        const a0 = TAU * i / segments, a1 = TAU * (i + 1) / segments;
        const r0 = baseRadius * (1.0 + t0 * 0.15), r1 = baseRadius * (1.0 + t1 * 0.15);
        const base = vertices.length / 10;
        const items = [
          [a0, z0, r0, t0], [a1, z0, r0, t0], [a0, z1, r1, t1], [a1, z1, r1, t1]
        ];
        for (const [a, z, r, t] of items) {
          const lx = Math.cos(a), ly = Math.sin(a);
          pushCloudVertex(vertices, center.x + lx * r * unit, center.y + ly * r * unit,
            center.z + z * unit, z, lx, ly, t, tint, center.x, center.y);
        }
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }
  }
}
function makeHurricaneUpdraftPuffs(MC, vertices, indices, lng, lat, eyeRadiusM, outerRadiusM, topM, seed) {
  const count = MOBILE ? 14 : 26;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * TAU * 1.7 + hash(i, seed, 501) * 0.85;
    const radius = clamp(eyeRadiusM * 0.48, 4500, 26000) +
      hash(i, seed, 502) * Math.max(9000, outerRadiusM * 0.28);
    const dlat = (radius * Math.sin(angle)) / 111320;
    const dlng = (radius * Math.cos(angle)) / (111320 * Math.max(0.12, Math.cos(lat * Math.PI / 180)));
    const puffLat = clamp(lat + dlat, -82, 82), puffLng = getLon(lng + dlng);
    const altitude = 520 + hash(i, seed, 503) * Math.max(6500, topM - 900);
    const radiusX = clamp(1000 + hash(i, seed, 504) * 2600, 900, 3700);
    const radiusY = radiusX * (0.72 + hash(i, seed, 505) * 0.52);
    const tint = lat >= 0 ? 2.405 + hash(i, seed, 506) * 0.039 : 2.455 + hash(i, seed, 506) * 0.039;
    // The shader raises each small cloud volume from the lower eyewall, rotates it,
    // then lets it drift outward aloft before it recycles to the lower circulation.
    makePuffGeometry(null, MC, vertices, indices, puffLng, puffLat, altitude,
      radiusX, radiusY, 430 + hash(i, seed, 507) * 380, tint, 6, 4, { lng, lat });
  }
}
function makeHurricaneRainGeometry(MC, vertices, indices, lng, lat, eyeRadiusM, outerRadiusM, topM, seed) {
  const center = MC.fromLngLat({ lng, lat }, 0), unit = center.meterInMercatorCoordinateUnits();
  const count = MOBILE ? 76 : 150;
  const topCap = clamp(topM, 9000, 15000);
  const tintBase = lat >= 0 ? 2.55 : 3.04;
  const radialStart = clamp(eyeRadiusM * 1.15, 9000, 38000);
  const radialEnd = Math.max(radialStart + 12000, outerRadiusM * 0.78);
  const streakLength = 260;
  for (let i = 0; i < count; i++) {
    const a = hash(i, seed, 301) * TAU;
    const radius = radialStart + hash(i, seed, 302) * (radialEnd - radialStart);
    const x = center.x + Math.cos(a) * radius * unit, y = center.y + Math.sin(a) * radius * unit;
    const width = clamp(45 + hash(i, seed, 303) * 110, 35, 160) * unit;
    const tx = -Math.sin(a) * width * 0.5, ty = Math.cos(a) * width * 0.5;
    const baseAltitude = 900 + hash(i, seed, 304) * (topCap - 1700);
    const tint = tintBase + hash(i, seed, 305) * 0.34;
    const base = vertices.length / 10;
    // Each quad is a short rain streak; the shader moves the whole streak down together.
    pushCloudVertex(vertices, x + tx, y + ty, center.z + baseAltitude * unit, baseAltitude, -1, 0, 0, tint, center.x, center.y);
    pushCloudVertex(vertices, x - tx, y - ty, center.z + baseAltitude * unit, baseAltitude, 1, 0, 0, tint, center.x, center.y);
    pushCloudVertex(vertices, x + tx, y + ty, center.z + baseAltitude * unit, baseAltitude, -1, 0, 1, tint, center.x, center.y);
    pushCloudVertex(vertices, x - tx, y - ty, center.z + baseAltitude * unit, baseAltitude, 1, 0, 1, tint, center.x, center.y);
    indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
}
function makeHurricaneLightningGeometry(MC, vertices, indices, lng, lat, topM, seed, tint) {
  const center = MC.fromLngLat({ lng, lat }, 0), unit = center.meterInMercatorCoordinateUnits();
  const segments = MOBILE ? 6 : 9;
  const theta = hash(seed, 61, 1) * TAU;
  const boltRadius = 7000 + hash(seed, 62, 2) * 27000;
  let last = null;
  for (let j = 0; j <= segments; j++) {
    const t = j / segments;
    const jitterAngle = (hash(j, seed, 63) - 0.5) * 0.62;
    const angle = theta + jitterAngle + Math.sin(t * 8.0 + seed) * 0.18;
    const radius = boltRadius * (0.18 + 0.72 * t);
    const x = center.x + Math.cos(angle) * radius * unit;
    const y = center.y + Math.sin(angle) * radius * unit;
    const altitude = topM * (1.0 - t) + 180.0 * t;
    const point = { x, y, altitude, t };
    if (last) {
      const dx = x - last.x, dy = y - last.y;
      const length = Math.max(1e-9, Math.hypot(dx, dy));
      const halfWidth = (MOBILE ? 48 : 75) * unit;
      const px = -dy / length * halfWidth, py = dx / length * halfWidth;
      const base = vertices.length / 10;
      const tintLocal = tint + hash(j, seed, 64) * 0.16;
      pushCloudVertex(vertices, last.x + px, last.y + py, center.z + last.altitude * unit, last.altitude, -1, 0, last.t, tintLocal, center.x, center.y);
      pushCloudVertex(vertices, last.x - px, last.y - py, center.z + last.altitude * unit, last.altitude, 1, 0, last.t, tintLocal, center.x, center.y);
      pushCloudVertex(vertices, x + px, y + py, center.z + altitude * unit, altitude, -1, 0, t, tintLocal, center.x, center.y);
      pushCloudVertex(vertices, x - px, y - py, center.z + altitude * unit, altitude, 1, 0, t, tintLocal, center.x, center.y);
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
    last = point;
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

  let enabled = true, disposed = false, animationTimer = 0, rebuildTimer = 0, refreshHandle = 0;
  let vertexData = new Float32Array(0), indexData = new Uint16Array(0);
  let globalCloudGeometryCache = null;
  let geometryDirty = true, formationCount = 0, measuredCount = 0, funnelCount = 0, stormCount = 0;
  let heightSource = 'not connected', rendererError = null, vbo = null, ibo = null, glRef = null;
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
      version: 6047, map, enabled, visible: enabled && !document.hidden,
      kind: 'georeferenced 3D cloud-volume layer',
      renderer: 'single shared MapLibre WebGL context',
      cloudFormations: formationCount, globalCloudFormations: globalCloudGeometryCache?.formationCount || 0,
      projectionMode: 'MapLibre shaderData projectTileFor3D', projectionShaderVariants: programCache.size,
      projectionShaderVariantNames: Array.from(programCache.keys()),
      persistentGlobalCloudField: true, localCloudFormations: Math.max(0, formationCount - (globalCloudGeometryCache?.formationCount || 0)), redrawIntervalMs: MOBILE ? 250 : 160, measuredCloudSamples: measuredCount,
      cloudHeightSource: heightSource,
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
        tint: gl.getAttribLocation(program, 'a_tint'),
        center: gl.getAttribLocation(program, 'a_center')
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
        saved = captureCloudGLState(gl, [info.attrs.pos, info.attrs.altitude, info.attrs.local, info.attrs.tint, info.attrs.center]);
        gl.useProgram(info.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        if (geometryDirty) {
          gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
          geometryDirty = false;
        } else gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        const stride = 10 * Float32Array.BYTES_PER_ELEMENT;
        gl.enableVertexAttribArray(info.attrs.pos); gl.vertexAttribPointer(info.attrs.pos, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(info.attrs.altitude); gl.vertexAttribPointer(info.attrs.altitude, 1, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(info.attrs.local); gl.vertexAttribPointer(info.attrs.local, 3, gl.FLOAT, false, stride, 4 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(info.attrs.tint); gl.vertexAttribPointer(info.attrs.tint, 1, gl.FLOAT, false, stride, 7 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(info.attrs.center); gl.vertexAttribPointer(info.attrs.center, 2, gl.FLOAT, false, stride, 8 * Float32Array.BYTES_PER_ELEMENT);
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

  function addLayerIfReady() {
    if (disposed || !map.isStyleLoaded?.()) return;
    if (map.getLayer?.(LAYER_ID)) { layerInstalled = true; return; }
    layerInstalled = false;
    try {
      const firstSymbol = map.getStyle?.()?.layers?.find(l => l.type === 'symbol')?.id;
      map.addLayer(cloudLayer, firstSymbol);
      layerInstalled = true;
      if (enabled) map.triggerRepaint?.();
    } catch (error) {
      rendererError = String(error?.message || error).slice(0, 180); publishState();
    }
  }

  function buildGlobalCloudGeometry() {
    if (globalCloudGeometryCache) return globalCloudGeometryCache;
    const vertices = [], indices = [], candidates = [];
    const columns = 40, rows = 18, maxGlobal = MOBILE ? 250 : 380;
    for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < columns; gx++) {
      const broad = hash(Math.floor(gx / 3), Math.floor(gy / 2), 901);
      const fine = hash(gx, gy, 902);
      if (broad * 0.58 + fine * 0.42 > 0.94) continue;
      candidates.push({ gx, gy, rank: hash(gx, gy, 903), seed: hash(gx, gy, 904) });
    }
    candidates.sort((a, b) => a.rank - b.rank);
    const formations = candidates.slice(0, maxGlobal);
    for (let k = 0; k < formations.length; k++) {
      const q = formations[k];
      const lat = clamp(-76 + q.gy * (152 / (rows - 1)) + (hash(q.gx, q.gy, 905) - 0.5) * 4.2, -77, 77);
      const lng = (((( -180 + q.gx * 9 + (hash(q.gx, q.gy, 906) - 0.5) * 5.2) + 180) % 360 + 360) % 360) - 180;
      const latScale = Math.sqrt(Math.max(0.16, Math.cos(lat * Math.PI / 180)));
      const radius = clamp(9 * 111320 * (0.39 + hash(q.gx, q.gy, 907) * 0.43) * latScale, 170000, 510000);
      const top = 4100 + hash(q.gx, q.gy, 908) * 7600;
      const base = Math.max(750, top * (0.29 + hash(q.gx, q.gy, 909) * 0.30));
      for (let i = 0; i < 3; i++) {
        const a = i * 2.399 + q.seed * 5.3;
        const ring = i === 0 ? 0 : radius * (0.28 + hash(k, i, 910) * 0.31);
        const puffLat = lat + Math.sin(a) * ring / 111320;
        const puffLng = lng + Math.cos(a) * ring / (111320 * Math.max(0.12, Math.cos(lat * Math.PI / 180)));
        const rx = radius * (i === 0 ? 1 : 0.44 + hash(k, i, 911) * 0.28);
        const ry = radius * (i === 0 ? 0.74 : 0.42 + hash(k, i, 912) * 0.31);
        const altitude = base + (top - base) * (i === 0 ? 0.48 : 0.24 + hash(k, i, 913) * 0.48);
        const vertical = Math.max(950, (top - base) * (i === 0 ? 0.58 : 0.40 + hash(k, i, 914) * 0.20));
        makePuffGeometry(null, MC, vertices, indices, puffLng, puffLat, altitude, rx, ry, vertical,
          0.28 + hash(k, i, 915) * 0.52, 6, 4);
      }
    }
    globalCloudGeometryCache = {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
      formationCount: formations.length
    };
    return globalCloudGeometryCache;
  }

  function generateGeometry() {
    if (disposed || !enabled) return;
    const bounds = map.getBounds?.();
    if (!bounds) return;
    const z = number(map.getZoom?.()), west0 = number(bounds.getWest()), east0 = number(bounds.getEast());
    const south = clamp(number(bounds.getSouth(), -55), -78, 82), north = clamp(number(bounds.getNorth(), 70), -78, 82);
    const west = Math.min(west0, east0), east = Math.max(west0, east0);
    const cell = z < 1.2 ? 9 : z < 3 ? 6.5 : z < 5 ? 2.7 : z < 7 ? 0.85 : z < 9 ? 0.27 : z < 11 ? 0.085 : z < 13 ? 0.035 : z < 15 ? 0.014 : 0.006;
    /* Keep the mesh under 16-bit index limits while increasing close-range shape detail. */
    const maxForm = MOBILE ? (z < 5 ? 8 : 12) : (z < 5 ? 16 : 24);
    const vertices = [], indices = [], formations = [];
    measuredCount = 0; funnelCount = 0; stormCount = 0;
    const scene = getScene();
    const measured = collectHeightFeatures(scene);
    measuredCount = measured.length;
    heightSource = measuredCount ? String(measured[0]?.source || measured[0]?.provenance || 'world-effects cloud-height samples') : 'not connected';
    const stormList = Array.isArray(scene?.storms) ? scene.storms : [];
    const alerts = Array.isArray(scene?.alerts) ? scene.alerts : [];
    const getLon = lng => ((((lng + 180) % 360) + 360) % 360) - 180;
    function addFormation(lng, lat, radiusM, baseM, topM, seed, kind = 'ordinary', stormCenter = null) {
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 82 || formations.length >= maxForm) return;
      formations.push({ lng: getLon(lng), lat, radiusM: clamp(radiusM, 600, 520000),
        baseM: clamp(baseM, 450, 14000), topM: clamp(topM, baseM + 180, 18500), seed, kind,
        stormCenter: stormCenter ? { lng: getLon(stormCenter.lng), lat: stormCenter.lat } : null });
    }

    /* Current source-backed cloud-top heights win over visual-fill altitude when provided. */
    for (const sample of measured.slice(0, MOBILE ? 7 : 35)) {
      const top = number(sample.cloud_top_height_m, number(sample.cloudTopHeightM));
      if (top < 200 || top > 23000) continue;
      addFormation(number(sample.lng), number(sample.lat), number(sample.radius_m || sample.radius_meters, 6500),
        number(sample.cloud_base_height_m, top * 0.64), top, hash(number(sample.lng), number(sample.lat), 8), 'measured');
    }

    /* Source-backed cyclone centers create a persistent eye-wall; close-range rain and bolts are LOD-gated. */
    const stormCandidates = stormList.map(storm => {
      const lng = number(storm.lng, number(storm.longitude, NaN));
      const lat = number(storm.lat, number(storm.latitude, NaN));
      const name = String(storm.name || storm.event || storm.type || '').toLowerCase();
      const hurricane = /hurricane|tropical|cyclone|typhoon/.test(name) ||
        number(storm.wind_mph) >= 64 || number(storm.wind_kt) >= 56;
      const windMph = clamp(number(storm.wind_mph, number(storm.wind_kt, 56) * 1.15078), 64, 190);
      const eyeRadiusM = clamp(number(storm.eye_radius_mi, 12) * 1609.34, 5000, 60000);
      const outerRadiusM = clamp(80000 + windMph * 900, 100000, 250000);
      return { storm, lng, lat, name, hurricane, windMph, eyeRadiusM, outerRadiusM };
    }).filter(x => Number.isFinite(x.lng) && Number.isFinite(x.lat) && Math.abs(x.lat) <= 82 && x.hurricane);
    const mapCenter = map.getCenter?.();
    stormCandidates.sort((a, b) => {
      if (!mapCenter) return 0;
      return ((a.lng - mapCenter.lng) ** 2 + (a.lat - mapCenter.lat) ** 2) -
        ((b.lng - mapCenter.lng) ** 2 + (b.lat - mapCenter.lat) ** 2);
    });
    const activeStormLimit = MOBILE ? 1 : 2;
    for (const item of stormCandidates.slice(0, activeStormLimit)) {
      const { storm, lng, lat, windMph, eyeRadiusM, outerRadiusM } = item;
      if (z >= 3.0 && typeof map.project === 'function') {
        try {
          const p = map.project([lng, lat]), canvas = map.getCanvas?.();
          const marginX = Math.max(260, (canvas?.clientWidth || 1) * 0.42);
          const marginY = Math.max(260, (canvas?.clientHeight || 1) * 0.42);
          if (p.x < -marginX || p.x > (canvas?.clientWidth || 1) + marginX ||
              p.y < -marginY || p.y > (canvas?.clientHeight || 1) + marginY) continue;
        } catch (_) {}
      }
      const topM = clamp(9000 + windMph * 30, 9800, 15000);
      const wallTint = lat >= 0 ? 2.05 : 2.33;
      makeHurricaneWallGeometry(MC, vertices, indices, lng, lat, eyeRadiusM, topM, wallTint + hash(lng, lat, 401) * 0.055);
      if (z >= 3.2) makeHurricaneUpdraftPuffs(MC, vertices, indices, lng, lat, eyeRadiusM, outerRadiusM, topM, hash(lng, lat, 402));
      if (z >= 3.8) {
        makeHurricaneRainGeometry(MC, vertices, indices, lng, lat, eyeRadiusM, outerRadiusM, topM, hash(lng, lat, 402));
      }
      if (z >= 4.6) {
        const boltCount = MOBILE ? 2 : 3;
        for (let bolt = 0; bolt < boltCount; bolt++) {
          makeHurricaneLightningGeometry(MC, vertices, indices, lng, lat, topM, hash(lng, lat, 410 + bolt), 3.53 + hash(lng, lat, 420 + bolt) * 0.24);
        }
      }
      const turns = MOBILE ? 7 : 9;
      for (let i = 0; i < turns; i++) {
        const t = i / Math.max(1, turns - 1);
        const a = t * TAU * 2.35 + hash(lng, lat, i) * 0.62;
        const r = eyeRadiusM * 0.92 + t * (outerRadiusM * 0.72 - eyeRadiusM * 0.92);
        const dlat = (r * Math.sin(a)) / 111320;
        const dlng = (r * Math.cos(a)) / (111320 * Math.max(0.12, Math.cos(lat * Math.PI / 180)));
        addFormation(lng + dlng, lat + dlat, clamp(r * 0.28, 7000, 23000),
          2200 + hash(lng, lat, i + 20) * 2600, topM,
          hash(lng, lat, i + 40), 'hurricane', { lng, lat });
      }
      stormCount++;
    }

    /* Warning polygons are explicitly illustrative context, not confirmed tornado tracks. */
    for (const alert of alerts) {
      const p = alert?.properties || alert || {};
      const desc = String([p.phenom, p.event, p.headline, p.event_name, p.description].join(' ')).toLowerCase();
      if (!(/\btornado\b/.test(desc) || String(p.phenom || '').toUpperCase() === 'TO')) continue;
      const center = centerOf(alert);
      if (center) { addFormation(center[0], center[1], 10000, 3000, 11000, hash(center[0], center[1], 88), 'funnel'); funnelCount++; }
    }

    /* Sample the full visible world before applying the mesh budget. The previous
       row-major loop hit its cloud cap in the first few rows, so globe-level
       clouds appeared in one band instead of across the full planet. */
    if (z >= 2.2) {
    const pad = z >= 14 ? 0.09 : z >= 9 ? 0.18 : cell * 1.4;
    const lngStart = Math.floor((west - pad) / cell), lngEnd = Math.ceil((east + pad) / cell);
    const latStart = Math.floor((south - pad) / cell), latEnd = Math.ceil((north + pad) / cell);
    const gridX = Math.max(1, lngEnd - lngStart + 1), gridY = Math.max(1, latEnd - latStart + 1);
    const totalCells = gridX * gridY, sampleCount = Math.min(totalCells, z >= 9 ? 1800 : 3500);
    const candidates = [];
    for (let sample = 0; sample < sampleCount; sample++) {
      const linear = totalCells <= sampleCount ? sample : Math.floor((sample + 0.5) * totalCells / sampleCount);
      const xi = lngStart + (linear % gridX), yi = latStart + Math.floor(linear / gridX);
      const seed = hash(xi, yi, 2);
      const macroCover = hash(Math.floor(xi / 2), Math.floor(yi / 2), 5);
      const microCover = hash(xi, yi, 5);
      const coverage = macroCover * 0.68 + microCover * 0.32;
      if (coverage > 0.58) continue;
      candidates.push({ xi, yi, seed, rank: hash(xi, yi, 33) });
    }
    /* A stable spatial hash ranks candidate cells, producing even globe coverage
       without loading or sorting an unbounded number of close-range grid cells. */
    candidates.sort((a, b) => a.rank - b.rank);
    for (const candidate of candidates) {
      if (formations.length >= maxForm) break;
      const { xi, yi, seed } = candidate;
      const lat = clamp((yi + 0.18 + seed * 0.64) * cell, -77, 81);
      const lng = (xi + 0.18 + hash(xi, yi, 4) * 0.64) * cell;
      const cloudSize = cell * 111320 * (0.38 + hash(xi, yi, 6) * 0.46);
      const latitudeScale = Math.max(0.13, Math.cos(lat * Math.PI / 180));
      const radius = clamp(cloudSize * Math.sqrt(latitudeScale), z < 2 ? 100000 : 650, z < 2 ? 520000 : 90000);
      const top = 3600 + hash(xi, yi, 9) * 7600;
      const base = Math.max(650, top * (0.31 + hash(xi, yi, 10) * 0.38));
      addFormation(lng, lat, radius, base, top, seed, 'ordinary');
    }
    }
    if (!formations.length && z >= 2.2) addFormation(number(map.getCenter?.()?.lng), number(map.getCenter?.()?.lat), 8000, 2200, 8500, 0.43);

    function puff(lng, lat, altitude, rx, ry, rz, seed, tint, detailed, rotationCenter = null) {
      const slices = detailed ? (z >= 12 ? 9 : 8) : 6;
      const stacks = detailed ? (z >= 12 ? 6 : 5) : 4;
      makePuffGeometry(null, MC, vertices, indices, getLon(lng), clamp(lat, -82, 82),
        altitude, rx, ry, rz, tint, slices, stacks, rotationCenter);
    }
    for (let k = 0; k < formations.length; k++) {
      const f = formations[k], n = MOBILE ? 3 : (z < 2 ? 6 : 5);
      for (let i = 0; i < n; i++) {
        const a = i * 2.399 + f.seed * 5.3;
        const ring = i === 0 ? 0 : f.radiusM * (0.20 + hash(k, i, 1) * 0.46);
        const lat = f.lat + Math.sin(a) * ring / 111320;
        const lng = f.lng + Math.cos(a) * ring / (111320 * Math.max(0.12, Math.cos(f.lat * Math.PI / 180)));
        const scaleX = i === 0 ? 1.00 : 0.45 + hash(k, i, 3) * 0.54;
        const scaleY = i === 0 ? 0.76 : 0.44 + hash(k, i, 4) * 0.48;
        const altitude = f.baseM + (f.topM - f.baseM) * (i === 0 ? 0.42 : 0.18 + hash(k, i, 5) * 0.70);
        const vertical = Math.max(420, (f.topM - f.baseM) * (i === 0 ? 0.54 : 0.34 + hash(k, i, 6) * 0.20));
        const tint = f.kind === 'hurricane'
          ? (f.lat >= 0 ? 2.02 : 2.30) + hash(k, i, 7) * 0.065
          : 0.22 + hash(k, i, 7) * 0.52;
        puff(lng, lat, altitude, f.radiusM * scaleX, f.radiusM * scaleY, vertical, f.seed,
          tint, z >= 5, f.kind === 'hurricane' ? f.stormCenter : null);
      }
      if (f.kind === 'funnel' && !MOBILE) makeFunnelGeometry(MC, vertices, indices, f.lng, f.lat, f.topM, 0.92);
    }
    /* Cap is intentionally bounded for low-memory phones; 16-bit indices avoid uint-index extensions. */
    const global = buildGlobalCloudGeometry();
    const globalVertexCount = Math.floor(global.vertices.length / 10);
    const localVertexCount = Math.min(Math.floor(vertices.length / 10), 65530 - globalVertexCount);
    vertexData = new Float32Array(global.vertices.length + localVertexCount * 10);
    vertexData.set(global.vertices, 0);
    vertexData.set(vertices.slice(0, localVertexCount * 10), global.vertices.length);
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
      if (!disposed && enabled && !document.hidden && layerInstalled) map.triggerRepaint?.();
    }, MOBILE ? 220 : 125);
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
      addLayerIfReady();
      scheduleGeometry(0);
      startAnimation();
    } else {
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
  function onMoveEnd() { if (enabled) scheduleGeometry(200); }
  function onStyleData() { if (enabled) addLayerIfReady(); }
  const onWeatherUpdated = () => { if (enabled) scheduleGeometry(150); };

  map.on?.('moveend', onMoveEnd); map.on?.('zoomend', onMoveEnd); map.on?.('resize', onMoveEnd);
  map.on?.('styledata', onStyleData);
  window.addEventListener('bp2300:weather-updated', onWeatherUpdated);
  window.addEventListener('bp2300:present-weather-updated', onWeatherUpdated);
  document.addEventListener('visibilitychange', onVisibility);
  const onToggleEvent = event => { if (event?.detail?.map && event.detail.map !== map) return; toggle(); };
  window.addEventListener('bp:sky-cloud-toggle', onToggleEvent);
  if (map.isStyleLoaded?.()) addLayerIfReady();
  else map.once?.('load', addLayerIfReady);

  const api = {
    version: 6047, map, overlay,
    get enabled() { return enabled; },
    setEnabled, toggle,
    get state() { return window.__BP_SKY_CLOUDS_STATE_V6047__ || window.__BP_SKY_CLOUDS_STATE_V6046__ || window.__BP_SKY_CLOUDS_STATE_V6045__ || window.__BP_SKY_CLOUDS_STATE_V6031__ || window.__BP_SKY_CLOUDS_STATE_V6029__ || window.__BP_SKY_CLOUDS_STATE_V5908__ || null; },
    destroy() {
      if (disposed) return; disposed = true;
      stopAnimation(); clearTimeout(rebuildTimer); clearTimeout(refreshHandle);
      map.off?.('moveend', onMoveEnd); map.off?.('zoomend', onMoveEnd); map.off?.('resize', onMoveEnd); map.off?.('styledata', onStyleData);
      window.removeEventListener('bp2300:weather-updated', onWeatherUpdated);
      window.removeEventListener('bp2300:present-weather-updated', onWeatherUpdated);
      document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('bp:sky-cloud-toggle', onToggleEvent);
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
