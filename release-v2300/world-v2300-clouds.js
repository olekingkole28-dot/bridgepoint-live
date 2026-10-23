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

function makeStormVolumeProxy(MC,vertices,indices,lng,lat,groundM,radiusM,baseAGL,topAGL,tint){
  const segments=MOBILE?28:40,levels=MOBILE?[0,0.22,0.48,0.74,1]:[0,0.16,0.34,0.54,0.74,0.90,1];
  const start=vertices.length/10,center=MC.fromLngLat({lng,lat},groundM),cosLat=Math.max(0.12,Math.cos(lat*Math.PI/180));
  const wrapLng=value=>((((value+180)%360)+360)%360)-180;
  const addVertex=(east,north,height)=>{
    const vLat=clamp(lat+north/111320,-85,85),vLng=wrapLng(lng+east/(111320*cosLat)),alt=groundM+baseAGL+height;
    const p=MC.fromLngLat({lng:vLng,lat:vLat},alt);
    vertices.push(p.x,p.y,p.z,alt,east,north,height,tint,center.x,center.y);
    return vertices.length/10-1;
  };
  const rings=[];
  for(const fraction of levels){
    const ring=[],z=topAGL*fraction;
    for(let i=0;i<=segments;i++){const angle=TAU*(i%segments)/segments;ring.push(addVertex(Math.cos(angle)*radiusM,Math.sin(angle)*radiusM,z));}
    rings.push(ring);
  }
  for(let j=0;j<rings.length-1;j++){
    const lower=rings[j],upper=rings[j+1];
    for(let i=0;i<segments;i++){const a=lower[i],b=lower[i+1],c=upper[i],d=upper[i+1];indices.push(a,b,c,b,d,c);}
  }
  const bottom=addVertex(0,0,0),top=addVertex(0,0,topAGL);
  for(let i=0;i<segments;i++){indices.push(bottom,rings[0][i+1],rings[0][i]);const cap=rings[rings.length-1];indices.push(top,cap[i],cap[i+1]);}
  return vertices.length/10-start;
}
const STORM_VOLUME_FRAGMENT = String.raw`float bpStormExitDistance(vec3 p,vec3 d,float radius,float height){
  float exitT=1.0e20,a=dot(d.xy,d.xy),b=dot(p.xy,d.xy),c=dot(p.xy,p.xy)-radius*radius,disc=b*b-a*c;
  if(a>1.0e-8&&disc>=0.0){float side=(-b+sqrt(disc))/a;if(side>0.0)exitT=min(exitT,side);}
  if(d.z>1.0e-5)exitT=min(exitT,(height-p.z)/d.z);else if(d.z< -1.0e-5)exitT=min(exitT,(0.0-p.z)/d.z);
  return max(0.0,exitT);
}
float bpStormDensity(vec3 p,float tint,float time,float radius,float height,float eyeRatio){
  float rho=length(p.xy)/max(radius,1.0),z=clamp(p.z/max(height,1.0),0.0,1.0);
  vec3 coarseP=vec3(p.xy/52000.0,p.z/4300.0)+vec3(time*0.018,-time*0.012,time*0.009);
  float broad=noise3(coarseP),fine=noise3(coarseP*2.7+vec3(time*0.10,-time*0.06,time*0.08)),micro=noise3(coarseP*5.1+vec3(-time*0.15,time*0.11,time*0.07));
  if(tint<1.481){
    float taper=mix(0.0045,0.105,pow(z,0.78)),rough=(broad-0.5)*0.020+(fine-0.5)*0.010+(micro-0.5)*0.006,radial=length(p.xy)/18000.0;
    float edge=1.0-smoothstep(taper*0.74,taper*1.20,radial+rough),twist=atan(p.y,p.x)-time*1.55+z*5.4+(fine-0.5)*1.4;
    float striation=0.54+0.46*(0.5+0.5*cos(twist*3.1)),broken=smoothstep(0.18,0.40,broad*0.52+fine*0.32+micro*0.16);
    float vertical=smoothstep(0.006,0.075,z)*(1.0-smoothstep(0.91,1.0,z)),inside=1.0-smoothstep(taper*0.10,taper*0.46,radial);
    return clamp((edge*(0.52+0.48*broken)*striation*vertical*1.38)+(inside*vertical*broken*0.08),0.0,1.0);
  }
  float safeEye=clamp(eyeRatio,0.008,0.095),vertical=smoothstep(0.065,0.18,z)*(1.0-smoothstep(0.84,0.99,z));
  float eyeClear=smoothstep(safeEye*0.98,safeEye*1.28,rho),outerFade=1.0-smoothstep(0.82,0.995,rho);
  float phase=atan(p.y,p.x)-log(max(rho,safeEye*1.32))*1.82-time*0.22,spiralSignal=0.5+0.5*cos(phase*5.0+(broad-0.5)*1.7+(fine-0.5)*0.9);
  float spiralBands=smoothstep(0.26,0.72,spiralSignal),cloudTexture=smoothstep(0.24,0.48,broad*0.54+fine*0.30+micro*0.16);
  float brokenBands=mix(0.10,1.0,spiralBands)*(0.36+0.64*cloudTexture),eyeWallRadius=safeEye*1.50,eyeWallWidth=max(0.012,safeEye*0.43);
  float eyeWall=exp(-pow((rho-eyeWallRadius)/eyeWallWidth,2.0))*(0.70+0.30*broad),outerBands=eyeClear*outerFade*vertical*brokenBands;
  return clamp(max(outerBands*1.36,eyeWall*vertical*1.28),0.0,1.0);
}
vec4 bpRaymarchStorm(vec3 entry,vec2 cameraXY,float tint,float time,float cameraAltitude,float requestedSteps){
  bool funnel=tint<1.481,southern=(!funnel&&tint>1.520);
  float radius=funnel?18000.0:max(180000.0,(tint-1.482-(southern?0.040:0.0))*100000000.0);
  float height=funnel?clamp((tint-1.474)*100000000.0,4500.0,15500.0):16000.0,eyeRatio=clamp(28000.0/radius,0.008,0.095);
  vec3 camera=vec3(cameraXY,cameraAltitude),toCamera=normalize(camera-entry),normal;
  if(entry.z<0.5)normal=vec3(0.0,0.0,-1.0);else if(entry.z>height-0.5)normal=vec3(0.0,0.0,1.0);else normal=normalize(vec3(entry.xy,0.0001));
  if(dot(normal,toCamera)<=0.002)return vec4(0.0);
  vec3 direction=-toCamera;float exitT=bpStormExitDistance(entry,direction,radius,height);
  if(exitT<1.0||exitT>1.0e20)return vec4(0.0);
  float steps=clamp(requestedSteps,12.0,40.0),stepLength=exitT/steps,accumulatedAlpha=0.0;
  vec3 accumulatedColor=vec3(0.0);
  for(int i=0;i<40;i++){
    if(float(i)>=steps||accumulatedAlpha>0.965)break;
    vec3 samplePos=entry+direction*((float(i)+0.5)*stepLength);
    float density=bpStormDensity(samplePos,tint,time,radius,height,eyeRatio);
    if(density>0.012){
      float broad=noise3(vec3(samplePos.xy/21000.0,samplePos.z/2900.0)+vec3(time*0.02,-time*0.01,time*0.015));
      float heightShade=clamp(samplePos.z/height,0.0,1.0),radialShade=clamp(length(samplePos.xy)/radius,0.0,1.0);
      float silver=clamp(0.45+0.26*broad+0.20*heightShade-0.16*radialShade,0.16,1.0);
      vec3 cloudColor=mix(vec3(0.20,0.25,0.32),vec3(0.93,0.96,1.0),silver);
      float extinction=funnel?0.000105:0.000060,sampleAlpha=clamp(1.0-exp(-density*stepLength*extinction),0.0,0.50);
      accumulatedColor+=cloudColor*((1.0-accumulatedAlpha)*sampleAlpha);accumulatedAlpha+=(1.0-accumulatedAlpha)*sampleAlpha;
    }
  }
  if(accumulatedAlpha<0.028)return vec4(0.0);
  return vec4(accumulatedColor/max(accumulatedAlpha,0.001),clamp(accumulatedAlpha,0.0,0.93));
}`;
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
      ? 'in vec3 a_pos;\nin float a_altitude;\nin vec3 a_local;\nin float a_tint;\nin vec2 a_wind;\nout vec3 v_local;\nout float v_tint;\nout vec2 v_camera_local;\n'
      : 'attribute vec3 a_pos;\nattribute float a_altitude;\nattribute vec3 a_local;\nattribute float a_tint;\nattribute vec2 a_wind;\nvarying vec3 v_local;\nvarying float v_tint;\nvarying vec2 v_camera_local;\n') +
    (projectionAware ? '' : 'uniform mat4 u_matrix;\n') +
    'uniform highp float u_motion_time;\nuniform vec2 u_camera_center_mercator;\n' +
    'void main(){v_local=a_local;v_tint=a_tint;float stormLat=2.0*atan(exp((0.5-a_wind.y)*6.28318530718))-1.57079632679;vec2 cameraDelta=u_camera_center_mercator-a_wind;cameraDelta.x-=floor(cameraDelta.x+0.5);v_camera_local=vec2(cameraDelta.x*40075016.68557849*cos(stormLat),-cameraDelta.y*40075016.68557849*cos(stormLat));vec2 moved;if(a_tint>1.47){moved=a_pos.xy;}else if(a_tint>1.40){vec2 rel=a_pos.xy-a_wind;float spin=a_tint>1.455?1.0:-1.0;float angle=spin*u_motion_time*2.05+a_altitude*0.000035;float cs=cos(angle),sn=sin(angle);moved=a_wind+vec2(rel.x*cs-rel.y*sn,rel.x*sn+rel.y*cs);}else if(a_tint>1.20&&a_tint<1.30){vec2 rel=a_pos.xy-a_wind;float spin=((a_tint<1.235)||(a_tint>1.25&&a_tint<1.275))?-1.0:1.0;float angle=spin*u_motion_time*0.68+a_altitude*0.0000012;float cs=cos(angle),sn=sin(angle);moved=a_wind+vec2(rel.x*cs-rel.y*sn,rel.x*sn+rel.y*cs);}else{vec2 advect=a_wind*u_motion_time;moved=vec2(fract(a_pos.x+advect.x),clamp(a_pos.y+advect.y,0.0005,0.9995));}gl_Position=' +
    (projectionAware ? 'projectTileFor3D(moved,a_altitude)' : 'u_matrix*vec4(moved,a_pos.z,1.0)') + ';}';

  const fragment = (webgl2 ? '#version 300 es\n' : '') +
    'precision mediump float;\n' +
    (webgl2 ? 'in vec3 v_local;\nin float v_tint;\nin vec2 v_camera_local;\nout vec4 bpColor;\n' : 'varying vec3 v_local;\nvarying float v_tint;\nvarying vec2 v_camera_local;\n') +
    'uniform highp float u_time;\nuniform highp float u_camera_altitude_m;\nuniform highp float u_ray_steps;\n' +
    'float noise3(vec3 p){vec3 q=floor(p);vec3 f=fract(p);f=f*f*(3.0-2.0*f);float n=q.x+q.y*57.0+q.z*113.0;float a=fract(sin(n)*43758.5453);float b=fract(sin(n+1.0)*43758.5453);float c=fract(sin(n+57.0)*43758.5453);float d=fract(sin(n+58.0)*43758.5453);float e=fract(sin(n+113.0)*43758.5453);float f1=fract(sin(n+114.0)*43758.5453);float g=fract(sin(n+170.0)*43758.5453);float h=fract(sin(n+171.0)*43758.5453);return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,f1,f.x),mix(g,h,f.x),f.y),f.z);}\n' +
    STORM_VOLUME_FRAGMENT + '\\n' +
    'void main(){if(v_tint>1.47){vec4 stormColor=bpRaymarchStorm(v_local,v_camera_local,v_tint,u_time,u_camera_altitude_m,u_ray_steps);' + (webgl2 ? 'bpColor=stormColor;' : 'gl_FragColor=stormColor;') + 'return;}vec3 n=normalize(v_local);float edge=clamp(0.58+abs(v_local.z)*0.18,0.0,1.0);float broad=noise3(v_local*3.0+vec3(u_time*0.004,v_tint*1.7,0.0));float detail=noise3(v_local*7.0+vec3(u_time*0.018,v_tint*4.0,0.0));float billow=noise3(v_local*15.0+vec3(0.0,u_time*0.012,v_tint*8.0));float fine=noise3(v_local*27.0+vec3(u_time*0.008,v_tint*11.0,0.0));float diffuse=max(0.0,dot(n,normalize(vec3(-0.42,0.55,0.72))));float density=broad*0.37+detail*0.34+billow*0.29;float sculpt=smoothstep(0.20,0.68,density);float silver=clamp(0.18+diffuse*0.86+broad*0.08+detail*0.07+billow*0.06,0.0,1.0);vec3 lit=mix(vec3(0.28,0.36,0.46),vec3(0.99,0.995,1.0),silver);float underside=pow(max(0.0,-n.z),1.35);lit=mix(lit,vec3(0.27,0.35,0.46),underside*0.48);lit=mix(lit,vec3(0.84,0.89,0.96),pow(max(0.0,1.0-abs(dot(n,normalize(vec3(0.2,0.0,1.0))))),2.0)*0.19);float tornadoCell=smoothstep(1.40,1.44,v_tint);float rainCell=smoothstep(1.30,1.34,v_tint)*(1.0-tornadoCell);float stormCell=smoothstep(0.89,0.95,v_tint)*(1.0-rainCell)*(1.0-tornadoCell);float hurricaneCell=smoothstep(1.20,1.23,v_tint)*(1.0-smoothstep(1.28,1.30,v_tint));float hurricaneRibbonCell=smoothstep(1.286,1.290,v_tint)*(1.0-smoothstep(1.294,1.298,v_tint));float tornadoStriation=0.5+0.5*sin(atan(v_local.y,v_local.x)*6.0-u_time*4.8+v_local.z*17.0+detail*2.1);lit=mix(lit,vec3(0.27,0.33,0.42),rainCell*0.68);lit=mix(lit,vec3(0.19,0.23,0.30),stormCell*0.46+hurricaneCell*0.62+tornadoCell*0.78);lit=mix(lit,vec3(0.83,0.88,0.93),tornadoCell*tornadoStriation*0.62);lit=mix(lit,mix(vec3(0.46,0.58,0.72),vec3(0.97,0.985,1.0),detail),hurricaneRibbonCell*0.86);float alphaBase=edge*(0.20+sculpt*0.47+diffuse*0.17+fine*0.08)*(1.0+rainCell*1.8+stormCell*0.14+hurricaneCell*0.3+hurricaneRibbonCell*1.8+tornadoCell*(0.55+tornadoStriation*0.50));float thinCell=1.0-smoothstep(0.19,0.26,v_tint);float alpha=clamp(mix(alphaBase,alphaBase*0.66,thinCell),0.035,0.96);' +
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
function makePuffGeometry(THREEless, MC, vertices, indices, lng, lat, altitude, rx, ry, rz, tint, slices = 8, stacks = 5, shapeSeed = 0, windX = 0, windY = 0) {
  const c = MC.fromLngLat({ lng, lat }, Math.max(0, altitude));
  const unit = c.meterInMercatorCoordinateUnits();
  const base = vertices.length / 10;
  for (let j = 0; j <= stacks; j++) {
    const v = j / stacks, phi = Math.PI * v;
    const sz = Math.cos(phi), ring = Math.sin(phi);
    for (let i = 0; i <= slices; i++) {
      const u = i / slices, theta = TAU * u;
      // Low-frequency radial billows break the perfect-egg silhouette without adding
      // extra draw calls. This remains deterministic so vertices stay stable between frames.
      const seed = shapeSeed * TAU;
      const lobeA = Math.sin(theta * 3.0 + seed) * Math.sin(phi * 2.0 + seed * 0.73);
      const lobeB = Math.cos(theta * 5.0 - phi * 3.0 + seed * 1.31);
      const lobeC = Math.sin(theta * 2.0 + phi * 4.0 + seed * 2.17);
      const billow = 1.0 + (0.135 * lobeA + 0.075 * lobeB + 0.04 * lobeC) * Math.pow(Math.max(0.001, ring), 0.32);
      const lx = Math.cos(theta) * ring * billow;
      const ly = Math.sin(theta) * ring * billow;
      const lz = sz * billow;
      vertices.push(c.x + lx * rx * unit, c.y + ly * ry * unit, c.z + lz * rz * unit, altitude + lz * rz, lx, ly, lz, tint, windX, windY);
    }
  }
  for (let j = 0; j < stacks; j++) for (let i = 0; i < slices; i++) {
    const a = base + j * (slices + 1) + i, b = a + slices + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
}
function stormVisibilityBoost(zoom) {
  const t = clamp((5.5 - number(zoom, 10)) / 4.25, 0, 1);
  return t * t * (3 - 2 * t);
}
function cloudDistanceMeters(lngA, latA, lngB, latB) {
  const dLng = ((((lngA - lngB + 540) % 360) + 360) % 360) - 180;
  const meanLat = (latA + latB) * 0.5 * Math.PI / 180;
  return Math.hypot(dLng * Math.cos(meanLat), latA - latB) * 111320;
}
function sourceEyeRadiusMeters(st) {
  const p = st?.properties || st || {};
  const km = number(p.eye_radius_km, number(p.eyeRadiusKm, NaN));
  const mi = number(p.eye_radius_mi, number(p.eyeRadiusMi, NaN));
  return Number.isFinite(km) && km > 0 ? clamp(km * 1000, 6000, 75000) :
    Number.isFinite(mi) && mi > 0 ? clamp(mi * 1609.34, 6000, 75000) : 28000;
}
function makeFunnelGeometry(MC, vertices, indices, lng, lat, altitudeTop, tint, zoom = 10) {
  const center = MC.fromLngLat({ lng, lat }, 0), unit = center.meterInMercatorCoordinateUnits();
  const base = vertices.length / 10, rings = MOBILE ? 13 : 22, segments = MOBILE ? 14 : 24;
  const zoomBoost = stormVisibilityBoost(zoom);
  const physicalHeightM = clamp(Math.max(altitudeTop, 3500), 3500, 15500);
  const heightM = physicalHeightM + Math.max(0, 260000 - physicalHeightM) * zoomBoost;
  const physicalTopM = clamp(physicalHeightM * 0.14, 650, 1700);
  const topM = physicalTopM + Math.max(0, 65000 - physicalTopM) * zoomBoost;
  const bottomM = 35 + (3000 - 35) * zoomBoost;
  for (let j = 0; j <= rings; j++) {
    const t = j / rings;
    const zM = 220 + t * (heightM - 220);
    const radius = bottomM + Math.pow(t, 0.72) * (topM - bottomM);
    const twist = t * 0.72 + Math.sin(t * Math.PI * 2) * 0.08;
    const centerX = Math.sin(t * Math.PI * 1.35) * topM * 0.12;
    const centerY = Math.sin(t * Math.PI * 2.0) * topM * 0.045;
    for (let i = 0; i <= segments; i++) {
      const a = TAU * i / segments + twist;
      const lobe = 1.0 + 0.075 * Math.sin(a * 3.0 + t * 8.0) + 0.035 * Math.cos(a * 5.0 - t * 11.0);
      const rx = Math.cos(a) * radius * lobe, ry = Math.sin(a) * radius * lobe;
      vertices.push(center.x + (centerX + rx) * unit, center.y + (centerY + ry) * unit,
        center.z + zM * unit, zM, rx / topM, ry / topM, t, tint, center.x, center.y);
    }
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < segments; i++) {
    const a = base + j * (segments + 1) + i, b = a + segments + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  return {heightM, topRadiusM: topM, bottomRadiusM: bottomM, zoomBoost};
}

export function initSkyClouds(target) {
  const map = target?.map || target;
  const container = map?.getContainer?.();
  const MC = window.maplibregl?.MercatorCoordinate || window.MapLibreGL?.MercatorCoordinate;
  if (!map || !container || !MC?.fromLngLat) return null;
  const existingCloudController = window.__BP_SKY_CLOUDS_V5908__;
  if (existingCloudController?.map === map) {
    const existingState = window.__BP_SKY_CLOUDS_STATE_V6079__ || window.__BP_SKY_CLOUDS_STATE_V6077__ || window.__BP_SKY_CLOUDS_STATE_V6076__ ||
      window.__BP_SKY_CLOUDS_STATE_V6075__ ||
      window.__BP_SKY_CLOUDS_STATE_V6074__ ||
      window.__BP_SKY_CLOUDS_STATE_V6073__ ||
      window.__BP_SKY_CLOUDS_STATE_V6047__ ||
      existingCloudController.state || null;
    // Cache-busted modules still share this global controller slot. Never silently
    // return a legacy controller whose geometry predates the requested cloud field.
    if (Number(existingCloudController.version) >= 6079 &&
        Number(existingState?.coverageVersion || existingState?.version) >= 6079) {
      return existingCloudController;
    }
    try { existingCloudController.destroy?.(); } catch (error) {
      console.warn('[BridgePoint clouds] legacy controller teardown failed', error);
    }
    if (window.__BP_SKY_CLOUDS_V5908__ === existingCloudController) {
      try { delete window.__BP_SKY_CLOUDS_V5908__; } catch (_) {}
    }
  }

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
  let rainCellShelfCount = 0, sourceCloudObservationCount = 0, tornadoFunnelMeshVertices = 0;
  let hurricaneVisualEyeRadiusKm = 0, hurricaneVisualShieldRadiusKm = 0;
  let tornadoVisualHeightKm = 0, tornadoVisualTopRadiusKm = 0, tornadoVisualBoost = 0;
  let sourceStormCount = 0, sourceTornadoAlertCount = 0, globalStormLod = 'physical-local';
  let modeledHurricaneVisualCount = 0, modeledTornadoVisualCount = 0, hurricaneSpiralRibbonVertices = 0;
  let stormVolumeIndexOffset=0, stormVolumeIndexCount=0, stormVolumeProxyVertices=0, hurricaneVolumeProxyVertices=0, tornadoVolumeProxyVertices=0, stormRaymarchStepBudget=0;
  let hurricaneSpiralCloudCenters = 0, hurricaneCloudShieldRadiusKm = 0;
  let hurricaneEyeWallCloudCenters = 0, hurricaneEyeRadiusKm = 0;
  let hurricaneEyeRadiusSource = 'no current source-backed hurricane';
  let localWindSourcePuffs = 0, localWindModelledPuffs = 0;
  let vertexData = new Float32Array(0), indexData = new Uint16Array(0);
  let globalCloudGeometryCache = null;
  let geometryDirty = true, formationCount = 0, measuredCount = 0, funnelCount = 0, stormCount = 0;
  let heightSource = 'not connected', rendererError = null, vbo = null, ibo = null, glRef = null;
  let cloudVao = null, cloudVaoExt = null, cloudVaoMode = 'none';
  const programCache = new Map();
  const terrainHeightCache = new Map();
  let terrainHeightQueries = 0, terrainHeightKnownSamples = 0;
  const terrainQueryAvailable = typeof map.queryTerrainElevation === 'function' && (typeof map.getTerrain !== 'function' || !!map.getTerrain?.());
  function terrainElevationAt(lng, lat) {
    if (!terrainQueryAvailable || !Number.isFinite(lng) || !Number.isFinite(lat)) return 0;
    const key = (Math.round(lng * 10) / 10).toFixed(1) + ':' + (Math.round(lat * 10) / 10).toFixed(1);
    if (terrainHeightCache.has(key)) return terrainHeightCache.get(key);
    try {
      const raw = map.queryTerrainElevation([lng, lat]);
      terrainHeightQueries++;
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        terrainHeightKnownSamples++;
        // Cloud altitudes are heights above the sampled land surface, or mean-sea-level 0 m when the DEM returns a sub-sea-level bed. Bathymetry is not used as the sea-surface height.
        const height = clamp(raw < 0 ? 0 : raw, 0, 9500);
        terrainHeightCache.set(key, height);
        return height;
      }
    } catch (_) {}
    return 0;
  }
  let activeProgramInfo = null, layerInstalled = false, originalFog, fogCaptured = false;
  const motionEpoch = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const canvas = map.getCanvas?.(), originalFilter = canvas?.style?.filter || '';
  const originalWillChange = canvas?.style?.willChange || '', originalTransition = canvas?.style?.transition || '';

  function getScene() {
    return window.__bpWeatherV2300?.getScene?.() ||
      window.__bpPresentWeatherV2301?.getScene?.() ||
      window.__bpWeatherFXV2300?.state?.scene ||
      window.__BP_WEATHER_SCENE_V2300__ || {};
  }

  const WORLD_CIRCUMFERENCE_M = 40075016.68557849;
  const smooth01 = (edge0,edge1,value) => { const t=clamp((value-edge0)/Math.max(1e-6,edge1-edge0),0,1); return t*t*(3-2*t); };
  let windSampleScene = null, windSampleCache = [];
  function collectHeightResolvedWindSamples(scene) {
    if(scene===windSampleScene)return windSampleCache;
    windSampleScene=scene;windSampleCache=[];
    const rows=[],flatten=value=>{if(Array.isArray(value))rows.push(...value);else if(Array.isArray(value?.features))rows.push(...value.features);else if(Array.isArray(value?.samples))rows.push(...value.samples);else if(Array.isArray(value?.data))rows.push(...value.data);};
    [scene?.cloud_wind_grid,scene?.cloudWindGrid,scene?.upper_air_winds,scene?.upperAirWinds,scene?.wind_profiles,scene?.windProfiles,scene?.wind_grid,scene?.windGrid].forEach(flatten);
    const now=Date.now();
    for(const item of rows.slice(0,1800)){
      const p=item?.properties||item||{},coords=item?.geometry?.coordinates;
      const lng=number(p.lng,number(p.longitude,Array.isArray(coords)?number(coords[0],NaN):NaN));
      const lat=number(p.lat,number(p.latitude,Array.isArray(coords)?number(coords[1],NaN):NaN));
      const pressure=number(p.pressure_hpa,number(p.pressureHpa,NaN));
      const altitude=number(p.altitude_m,number(p.altitudeM,number(p.geopotential_height_m,number(p.geopotentialHeightM,number(p.height_m,number(p.heightM,number(p.level_m,Number.isFinite(pressure)&&pressure>0&&pressure<=1100?44330*(1-Math.pow(pressure/1013.25,0.1903)):NaN)))))));
      const timestamp=p.valid_time||p.validTime||p.observed_at||p.observedAt||p.timestamp||p.time||null;
      if(timestamp!=null){let ms=typeof timestamp==='number'?timestamp:Date.parse(timestamp);if(Number.isFinite(ms)&&ms>0){if(ms<1e12)ms*=1000;if(ms<now-6*3600000||ms>now+3600000)continue;}}
      let east=number(p.eastward_wind_mps,number(p.u_wind_mps,number(p.u_mps,NaN)));
      let north=number(p.northward_wind_mps,number(p.v_wind_mps,number(p.v_mps,NaN)));
      if(!Number.isFinite(east)||!Number.isFinite(north)){
        const dir=number(p.wind_dir_deg,number(p.wind_direction_deg,number(p.windDirectionDeg,number(p.direction_deg,NaN))));
        const kt=number(p.wind_speed_kt,NaN),mph=number(p.wind_speed_mph,NaN);
        const speed=number(p.wind_speed_mps,number(p.wind_speed_ms,number(p.speed_mps,Number.isFinite(kt)?kt*0.514444:Number.isFinite(mph)?mph*0.44704:NaN)));
        if(!Number.isFinite(dir)||!Number.isFinite(speed))continue;
        const to=(dir+180)*Math.PI/180;east=Math.sin(to)*speed;north=Math.cos(to)*speed;
      }
      if(![lng,lat,altitude,east,north].every(Number.isFinite)||Math.abs(lat)>86||Math.abs(east)>100||Math.abs(north)>100)continue;
      windSampleCache.push({lng:((((lng+180)%360)+360)%360)-180,lat,altitude,east,north,source:String(p.source||p.provenance||'height-resolved upper-air wind sample'),timestamp});
    }
    return windSampleCache;
  }
  function isTropicalCyclone(st={}) {
    const p=st?.properties||st||{};
    const classification=String(p.classification??p.classificationCode??p.classification_code??p.stormClass??'').trim().toUpperCase();
    const label=String([p.name,p.event,p.type,p.category,p.phenom,p.kind,p.classification,p.classificationCode,p.system_type,p.systemType,p.storm_type,p.stormType,p.headline,p.event_name,p.description].filter(Boolean).join(' ')).toLowerCase();
    if (/extra[\s-]?tropical|post[\s-]?tropical/.test(label) || classification==='PTC' || classification==='EX') return false;
    if (/^(?:HU|TY|TS|TD|STS|STD|PC)$/.test(classification)) return true;
    return /hurricane|typhoon|tropical[\s-]+(?:storm|cyclone|depression|system|disturbance)|subtropical\s+(?:storm|depression)|potential\s+tropical\s+cyclone|\bcyclone\b/.test(label) || String(p.phenom||'').toUpperCase()==='HU';
  }
  function isHurricaneClass(st={}) {
    const p=st?.properties||st||{};
    const cls=String(p.classification??p.classificationCode??p.classification_code??p.category??'').trim().toUpperCase();
    const label=String([p.name,p.event,p.type,p.headline,p.description].filter(Boolean).join(' ')).toLowerCase();
    return cls==='HU'||cls==='TY'||/\bhurricane\b|\btyphoon\b/.test(label);
  }
  function isTornadoSource(st={}) {
    const p=st?.properties||st||{};
    return /tornado|waterspout/i.test(String([p.name,p.event,p.type,p.category,p.phenom,p.kind,p.headline,p.event_name,p.description].filter(Boolean).join(' '))) || String(p.phenom||'').toUpperCase()==='TO';
  }
  function cloudWindVectorFor(lng,lat,altitude,scene,stormContext=null){
    const samples=collectHeightResolvedWindSamples(scene);
    let best=null,bestScore=Infinity;const latCos=Math.max(0.12,Math.cos(lat*Math.PI/180));
    for(const sample of samples){
      const dLng=((((sample.lng-lng+540)%360)+360)%360)-180;
      const distanceKm=Math.hypot(dLng*latCos,sample.lat-lat)*111.32,heightDelta=Math.abs(sample.altitude-altitude);
      if(distanceKm>1800||heightDelta>6500)continue;
      const score=distanceKm+heightDelta/35;if(score<bestScore){bestScore=score;best=sample;}
    }
    let east=0,north=0,mode='modelled-latitude-altitude-flow';
    if(best){east=best.east;north=best.north;mode='height-resolved-source-wind';}
    else{
      let cyclone=stormContext;
      if(!cyclone){
        let nearest=Infinity;
        for(const st of (Array.isArray(scene?.storms)?scene.storms:[])){
          const slng=number(st.lng,number(st.longitude,NaN)),slat=number(st.lat,number(st.latitude,NaN));if(!Number.isFinite(slng)||!Number.isFinite(slat))continue;
          const stName=String(st.name||st.event||st.type||'').toLowerCase(),stMph=number(st.wind_mph,number(st.wind_kt,0)*1.15078);
          if(!isTropicalCyclone(st))continue;
          const dx=((((lng-slng+540)%360)+360)%360)-180,d=Math.hypot(dx*Math.cos(slat*Math.PI/180),lat-slat)*111320;
          const rad=number(st.cloud_shield_radius_m,number(st.cloudShieldRadiusM,number(st.cloud_radius_m,number(st.cloudRadiusM,NaN))));
          const limit=Number.isFinite(rad)&&rad>0?Math.min(1200000,Math.max(120000,rad*1.3)):700000;
          if(d<limit&&d<nearest){nearest=d;const eyeMi=number(st.eye_radius_mi,18);cyclone={centerLng:slng,centerLat:slat,shieldRadiusM:limit/1.3,eyeRadiusM:clamp(eyeMi*1609.34,6000,75000),windMph:clamp(number(st.wind_mph,number(st.wind_kt,0)*1.15078),35,190)};}
        }
      }
      if(cyclone){
        const dx=(((((lng-cyclone.centerLng+540)%360)+360)%360)-180)*Math.cos(cyclone.centerLat*Math.PI/180)*111320,dy=(lat-cyclone.centerLat)*111320,r=Math.max(1,Math.hypot(dx,dy));
        const shield=Math.max(1,Number(cyclone.shieldRadiusM)||520000),eye=Math.max(1,Number(cyclone.eyeRadiusM)||28000),peak=clamp((Number(cyclone.windMph)||70)*0.44704*0.42,5,38),speed=peak*clamp((shield-r)/Math.max(1,shield-eye),0.16,1),hemisphere=cyclone.centerLat>=0?1:-1;
        east=-dy/r*speed*hemisphere;north=dx/r*speed*hemisphere;mode='modelled-cyclone-circulation';
      }else{
        const a=Math.abs(lat),upper=clamp((altitude-1800)/10000,0,1),tropics=1-smooth01(18,31,a),midlat=smooth01(26,38,a)*(1-smooth01(54,66,a)),polar=smooth01(60,76,a);
        east=-(7+7*upper)*tropics+(9+13*upper)*midlat-(4+7*upper)*polar;
        north=Math.sin((lng*0.035+lat*0.11)*Math.PI/180)*(1.2+upper*1.8);
      }
    }
    const scale=1/(WORLD_CIRCUMFERENCE_M*latCos);
    return {dx:east*scale,dy:-north*scale,mode,speedMps:Math.hypot(east,north),sourceBacked:mode==='height-resolved-source-wind'};
  }
  function publishState() {
    const state = {
      version: 6082, map, enabled, visible: enabled && !document.hidden,
      kind: 'georeferenced 3D cloud-volume layer',
      renderer: 'shared MapLibre WebGL context; storms use world-anchored raymarched volume proxies',
      stormRenderingArchitecture: 'Earth-coordinate proxy cylinders with shader-integrated spiral/funnel density, shader-time rotation and early termination; no camera-scaled storm meshes',
      stormVolumeProxyVertices, hurricaneVolumeProxyVertices, tornadoVolumeProxyVertices, stormRaymarchStepBudget,
      cloudFormations: formationCount, globalCloudFormations: globalCloudGeometryCache?.formationCount || 0, coverageVersion: 6082, globalStormMaskCount: globalCloudGeometryCache?.stormEyeMaskCount || 0, globalCloudLodBand: globalCloudGeometryCache?.cloudLodBand || 'unbuilt', globalStormLod, sourceStormCount, sourceTornadoAlertCount, modeledHurricaneVisualCount, modeledTornadoVisualCount, hurricaneSpiralRibbonVertices, stormVisualProvenance: (modeledHurricaneVisualCount || modeledTornadoVisualCount) ? 'modeled fallback cloud structures are visual examples, not source-backed live weather or alerts' : 'storm geometry is source-backed', globalMacroRadiusMinKm: globalCloudGeometryCache?.macroRadiusMinKm || 0, globalMacroRadiusMaxKm: globalCloudGeometryCache?.macroRadiusMaxKm || 0, globalThinLayerSlices: globalCloudGeometryCache?.thinLayerSlices || 0, globalThinLayerStacks: globalCloudGeometryCache?.thinLayerStacks || 0, globalSingleLayerSlices: globalCloudGeometryCache?.singleLayerSlices || 0, globalSingleLayerStacks: globalCloudGeometryCache?.singleLayerStacks || 0, hurricaneSpiralCloudCenters, hurricaneEyeWallCloudCenters, hurricaneEyeRadiusKm, hurricaneEyeRadiusSource, hurricaneCloudShieldRadiusKm, hurricaneVisualEyeRadiusKm, hurricaneVisualShieldRadiusKm, tornadoVisualHeightKm, tornadoVisualTopRadiusKm, tornadoVisualBoost, globalHeightResolvedWindPuffs: globalCloudGeometryCache?.heightResolvedWindPuffs || 0, globalModelledWindPuffs: globalCloudGeometryCache?.modelledWindPuffs || 0, localWindSourcePuffs, localWindModelledPuffs, globalMacroFormations: globalCloudGeometryCache?.macroFormationCount || 0, globalFineFormations: globalCloudGeometryCache?.fineFormationCount || 0, globalIsolatedFormations: globalCloudGeometryCache?.isolatedFormationCount || 0, globalThinLayerFormations: globalCloudGeometryCache?.thinLayerFormationCount || 0, globalCloudPuffs: globalCloudGeometryCache?.puffCount || 0, globalTerrainQuerySamples: terrainHeightKnownSamples, terrainRelativeCloudBases: terrainQueryAvailable, cloudMotion: (globalCloudGeometryCache?.heightResolvedWindPuffs || 0) > 0 ? 'Height-resolved source wind advects matched cloud puffs; modelled atmospheric flow fills unmatched locations' : 'Height/latitude-aware modelled atmospheric flow and hemisphere-aware cyclone circulation; no source-backed global upper-air wind grid is connected',
      projectionMode: 'MapLibre shaderData projectTileFor3D', projectionShaderVariants: programCache.size,
      projectionShaderVariantNames: Array.from(programCache.keys()),
      persistentGlobalCloudField: true, globalCoverageModel: 'three procedural spatial layers: broad connected regional cloud banks, 700/760 rounded individual cloud cells and 750/850 thin high-level puffs; global satellite cloud-mask feed not yet connected', localCloudFormations: Math.max(0, formationCount - (globalCloudGeometryCache?.formationCount || 0)), rainCellShelfClouds: rainCellShelfCount, redrawIntervalMs: MOBILE ? 450 : 300, measuredCloudSamples: measuredCount, sourceCloudObservationFormations: sourceCloudObservationCount,
      cloudHeightSource: heightSource,
      cloudWaterHeightReference: terrainQueryAvailable ? 'Map terrain heights on land; sub-sea-level samples use mean-sea-level 0 m fallback. Tides, inland water levels and verified bathymetry are not connected.' : 'No terrain elevation query; 0 m mean-sea-level fallback over water; source-backed water levels and bathymetry are not connected.',
      layerPresent: !!map.getLayer?.(LAYER_ID), layerInstalled,
      layerRetryAttempts, mapStyleLoaded: map.isStyleLoaded?.() === true,
      mapStyleLayerCount: map.getStyle?.()?.layers?.length ?? 0, documentHidden: !!document.hidden,
      cloudHeightMode: measuredCount ? 'source-backed local cloud-top height samples with procedural fill between samples; a complete global cloud-height field is not connected' : 'procedural altitude only; measured global cloud-top heights are not connected',
      warningFunnels: funnelCount, tornadoFunnelMeshVertices, tornadoFunnelAnimated: tornadoFunnelMeshVertices > 0, hurricaneStormVolumes: stormCount, hurricaneVortexAnimated: hurricaneVolumeProxyVertices > 0 && hurricaneEyeWallCloudCenters > 0,
      funnelCaveat: modeledTornadoVisualCount ? 'Illustrative modeled funnel geometry only; not a live tornado alert or confirmation of a tornado.' : funnelCount ? 'Illustrative funnel context inside active tornado-warning geometry; a warning is not confirmation of a tornado.' : null,
      rendererError, zoom: number(map.getZoom?.()), pitch: number(map.getPitch?.()), updatedAt: Date.now()
    };
    window.__BP_SKY_CLOUDS_STATE_V5908__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6029__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6031__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6045__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6046__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6047__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6072__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6073__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6074__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6075__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6076__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6079__ = state;
    window.__BP_SKY_CLOUDS_STATE_V6077__ = state;
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
        wind: gl.getAttribLocation(program, 'a_wind')
      },
      uniforms: {
        matrix: gl.getUniformLocation(program, 'u_matrix'),
        time: gl.getUniformLocation(program, 'u_time'),
        motionTime: gl.getUniformLocation(program, 'u_motion_time'),
        cameraCenter: gl.getUniformLocation(program, 'u_camera_center_mercator'),
        cameraAltitude: gl.getUniformLocation(program, 'u_camera_altitude_m'),
        raySteps: gl.getUniformLocation(program, 'u_ray_steps'),
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
        saved = captureCloudGLState(gl, [info.attrs.pos, info.attrs.altitude, info.attrs.local, info.attrs.tint, info.attrs.wind], cloudVaoExt, !!cloudVao);
        bindCloudVertexArray(gl, cloudVao, cloudVaoMode, cloudVaoExt);
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
        gl.enableVertexAttribArray(info.attrs.wind); gl.vertexAttribPointer(info.attrs.wind, 2, gl.FLOAT, false, stride, 8 * Float32Array.BYTES_PER_ELEMENT);
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
        const cloudTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
        const motionTime = Math.max(0, ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - motionEpoch) / 1000);
        const cameraCenter=MC.fromLngLat(map.getCenter?.()||{lng:0,lat:0},0);
        const zoomNow=number(map.getZoom?.(),0),pitchRad=number(map.getPitch?.(),0)*Math.PI/180;
        const metresPerPixel=40075016.68557849/(512*Math.pow(2,zoomNow));
        const cameraAltitude=clamp(metresPerPixel*Math.max(1,container.clientHeight||gl.drawingBufferHeight||768)*0.58/Math.max(0.45,Math.cos(pitchRad)),900,50000000);
        const raySteps=zoomNow>8.5?(MOBILE?20:28):(MOBILE?28:40);
        stormRaymarchStepBudget=raySteps;
        if(info.uniforms.cameraCenter)gl.uniform2f(info.uniforms.cameraCenter,cameraCenter.x,cameraCenter.y);
        if(info.uniforms.cameraAltitude)gl.uniform1f(info.uniforms.cameraAltitude,cameraAltitude);
        if(info.uniforms.raySteps)gl.uniform1f(info.uniforms.raySteps,raySteps);
        gl.uniform1f(info.uniforms.time, cloudTime);
        if (info.uniforms.motionTime) gl.uniform1f(info.uniforms.motionTime, motionTime);
        gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
        gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.CULL_FACE); gl.depthMask(false);
        if(stormVolumeIndexCount>0&&stormVolumeIndexOffset>0){
          gl.drawElements(gl.TRIANGLES,stormVolumeIndexOffset,gl.UNSIGNED_SHORT,0);
          gl.depthMask(true);
          gl.drawElements(gl.TRIANGLES,stormVolumeIndexCount,gl.UNSIGNED_SHORT,stormVolumeIndexOffset*Uint16Array.BYTES_PER_ELEMENT);
          gl.depthMask(false);
        }else gl.drawElements(gl.TRIANGLES,indexData.length,gl.UNSIGNED_SHORT,0);
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
    const windScene = getScene();
    const zoom = number(map.getZoom?.(), 10);
    const cloudLodBand = zoom <= 5.5 ? 'global' : zoom <= 8.5 ? 'regional' : 'local';
    const sourceCyclones = [
      ...(Array.isArray(windScene?.storms) ? windScene.storms.filter(isTropicalCyclone) : []),
      ...(Array.isArray(windScene?.alerts) ? windScene.alerts.filter(isTropicalCyclone) : [])
    ].map(st => {
      const p=st?.properties||st||{};
      const c=Number.isFinite(number(p.lng,number(p.longitude,NaN)))&&Number.isFinite(number(p.lat,number(p.latitude,NaN)))
        ? [number(p.lng,number(p.longitude,NaN)),number(p.lat,number(p.latitude,NaN))] : centerOf(st);
      if(!c) return null;
      return {lng:c[0],lat:c[1],eyeRadiusM:sourceEyeRadiusMeters(st),key:String(p.id||p.name||p.event||p.type||p.phenom||'cyclone')};
    }).filter(Boolean);
    const maskViewCenter=map.getCenter?.();
    const isInFrontHemisphere=st=>{if(!maskViewCenter)return true;const r=Math.PI/180,a=number(maskViewCenter.lat,0)*r,b=number(st.lat,0)*r,d=(number(st.lng,0)-number(maskViewCenter.lng,0))*r;return Math.sin(a)*Math.sin(b)+Math.cos(a)*Math.cos(b)*Math.cos(d)>-0.08;};
    const hasVisibleRealHurricane=sourceCyclones.some(st=>isHurricaneClass(st)&&isInFrontHemisphere(st));
    if (!sourceCyclones.length) sourceCyclones.push({lng:-58.5,lat:19.5,eyeRadiusM:160000,key:'modeled-atlantic-cloud-vortex'});
    else if (zoom<=5.5&&!hasVisibleRealHurricane) sourceCyclones.push({lng:-58.5,lat:19.5,eyeRadiusM:160000,key:'modeled-atlantic-cloud-vortex'});
    const stormSignature=cloudLodBand+'|'+sourceCyclones.map(s=>s.key+':'+s.lng.toFixed(3)+','+s.lat.toFixed(3)+':'+Math.round(s.eyeRadiusM)).sort().join('|');
    if (globalCloudGeometryCache && globalCloudGeometryCache.stormSignature === stormSignature) return globalCloudGeometryCache;
    globalCloudGeometryCache = null;
    const vertices = [], indices = [], macroCandidates = [];
    let heightResolvedWindPuffs = 0, modelledWindPuffs = 0;
    const eyeMaskRadius=st=>cloudLodBand==='global'?Math.max(st.eyeRadiusM,90000):cloudLodBand==='regional'?Math.max(st.eyeRadiusM,45000):st.eyeRadiusM;
    const addGlobalPuff = (lng,lat,altitude,rx,ry,rz,tint,slices,stacks,seed) => {
      let safeRx=rx,safeRy=ry;
      for(const storm of sourceCyclones){
        const distance=cloudDistanceMeters(lng,lat,storm.lng,storm.lat),eye=eyeMaskRadius(storm),radius=Math.max(safeRx,safeRy);
        if(distance<=eye) return;
        if(distance<eye+radius){const factor=clamp((distance-eye)/Math.max(1,radius),0,1);if(factor<0.04)return;safeRx*=factor;safeRy*=factor;}
      }
      const wind=cloudWindVectorFor(lng,lat,altitude,windScene);
      if(wind.sourceBacked)heightResolvedWindPuffs++;else modelledWindPuffs++;
      makePuffGeometry(null,MC,vertices,indices,lng,lat,altitude,safeRx,safeRy,rz,tint,slices,stacks,seed,wind.dx,wind.dy);
    };
    const columns = 40, rows = 18, maxMacro = MOBILE ? 110 : 130;
    const cloudScore = (gx, gy, cols, rowCount, edgeSeed) => {
      const waveX = (gx + 0.5) / cols * TAU;
      const waveY = (gy + 0.5) / rowCount * TAU - Math.PI;
      const wave = 0.52 * Math.sin(waveX * 1.25 + Math.sin(waveY * 1.7) * 1.3) +
        0.29 * Math.cos(waveY * 2.1 - waveX * 0.37) +
        0.19 * Math.sin(waveX * 0.61 + waveY * 1.3);
      const broad = clamp(0.5 + 0.5 * wave, 0, 1);
      return { broad, score: broad * 0.72 + hash(gx, gy, edgeSeed) * 0.28 };
    };

    // Layer 1 — large, tall cloud banks made from the same rounded billow mesh as
    // the smaller clouds. Bank footprints stay local/regional instead of merging into
    // continent-sized blobs; each bank has three overlapping, vertically deep puffs.
    for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < columns; gx++) {
      const field = cloudScore(gx, gy, columns, rows, 902);
      if (field.score > 0.58) continue;
      macroCandidates.push({ gx, gy, rank: field.score + hash(gx, gy, 903) * 0.035, seed: hash(gx, gy, 904), cloudness: 1 - field.broad });
    }
    macroCandidates.sort((a, b) => a.rank - b.rank);
    const macro = macroCandidates.slice(0, maxMacro);
    for (let k = 0; k < macro.length; k++) {
      const q = macro[k];
      const lat = clamp(-76 + q.gy * (152 / (rows - 1)) + (hash(q.gx, q.gy, 905) - 0.5) * 4.2, -77, 77);
      const lng = (((( -180 + q.gx * 9 + (hash(q.gx, q.gy, 906) - 0.5) * 5.2) + 180) % 360 + 360) % 360) - 180;
      const ground = terrainElevationAt(lng, lat);
      const latScale = Math.sqrt(Math.max(0.16, Math.cos(lat * Math.PI / 180)));
      const bankRadius = clamp(111320 * (3.00 + hash(q.gx, q.gy, 907) * 4.90) * latScale, 400000, 900000);
      const baseAgl = 2200 + hash(q.gx, q.gy, 908) * 2200;
      const topAgl = Math.max(baseAgl + 6500, 10800 + hash(q.gx, q.gy, 909) * 6800);
      const range = topAgl - baseAgl;
      for (let i = 0; i < 3; i++) {
        const a = i * 2.399 + q.seed * 5.3;
        const ring = i === 0 ? 0 : bankRadius * (0.24 + hash(k, i, 910) * 0.22);
        const puffLat = lat + Math.sin(a) * ring / 111320;
        const puffLng = lng + Math.cos(a) * ring / (111320 * Math.max(0.12, Math.cos(lat * Math.PI / 180)));
        const rx = bankRadius * (i === 0 ? 0.68 : 0.42 + hash(k, i, 911) * 0.22);
        const ry = bankRadius * (i === 0 ? 0.58 : 0.40 + hash(k, i, 912) * 0.22);
        const puffGround = terrainElevationAt(puffLng, puffLat) || ground;
        const centerFraction = i === 0 ? 0.50 : 0.48 + hash(k, i, 913) * 0.04;
        const altitude = puffGround + baseAgl + range * centerFraction;
        const vertical = range * (0.425 + hash(k, i, 914) * 0.035);
        addGlobalPuff(puffLng,puffLat,altitude,rx,ry,vertical,0.30+hash(q.gx,q.gy,915)*0.30,MOBILE?8:9,3,hash(q.gx,q.gy,i+973));
      }
    }

    // Layer 2a — medium individual cumulus near some larger banks, but still separate.
    const fineColumns = 92, fineRows = 42, maxFine = MOBILE ? 60 : 80;
    const activeMacroCells = new Set(macro.map(q => `${q.gx}:${q.gy}`));
    const fineCandidates = [];
    for (let gy = 0; gy < fineRows; gy++) for (let gx = 0; gx < fineColumns; gx++) {
      const macroX = Math.round(gx * (columns - 1) / (fineColumns - 1));
      const macroY = Math.round(gy * (rows - 1) / (fineRows - 1));
      let nearCloudBank = false;
      for (let dy = -1; dy <= 1 && !nearCloudBank; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (activeMacroCells.has(`${macroX + dx}:${macroY + dy}`)) { nearCloudBank = true; break; }
        }
      }
      if (!nearCloudBank) continue;
      fineCandidates.push({ gx, gy, rank: hash(gx, gy, 951), seed: hash(gx, gy, 952) });
    }
    fineCandidates.sort((a, b) => a.rank - b.rank);
    const fine = fineCandidates.slice(0, maxFine);
    for (let k = 0; k < fine.length; k++) {
      const q = fine[k];
      const lat = clamp(-78 + q.gy * (156 / (fineRows - 1)) + (hash(q.gx, q.gy, 953) - 0.5) * 1.8, -78, 78);
      const lng = (((( -180 + q.gx * (360 / fineColumns) + (hash(q.gx, q.gy, 954) - 0.5) * 2.0) + 180) % 360 + 360) % 360) - 180;
      const ground = terrainElevationAt(lng, lat);
      const latScale = Math.sqrt(Math.max(0.16, Math.cos(lat * Math.PI / 180)));
      const radius = clamp((9000 + hash(q.gx, q.gy, 955) * 20000) * latScale, 7500, 30000);
      const baseAgl = 2200 + hash(q.gx, q.gy, 956) * 1500;
      const topAgl = Math.max(baseAgl + 2600, 6700 + hash(q.gx, q.gy, 957) * 5700);
      const range = topAgl - baseAgl;
      const altitude = ground + baseAgl + range * (0.49 + hash(q.gx, q.gy, 958) * 0.02);
      const vertical = range * (0.40 + hash(q.gx, q.gy, 959) * 0.04);
      addGlobalPuff(lng,lat,altitude,radius,radius*(0.58+hash(q.gx,q.gy,960)*0.28),vertical,0.28+hash(q.gx,q.gy,961)*0.34,MOBILE?5:6,3,hash(q.gx,q.gy,962));
    }

    // Layer 2b — preserve the independent small-cloud population around the planet.
    // Every generated cell starts above sampled terrain with a minimum cloud-base AGL;
    // no procedural cell can have its lower mesh hemisphere extend through its own base.
    const smallColumns = 140, smallRows = 62, maxSingles = MOBILE ? 700 : 760;
    const smallCandidates = [];
    for (let gy = 0; gy < smallRows; gy++) for (let gx = 0; gx < smallColumns; gx++) {
      const field = cloudScore(gx, gy, smallColumns, smallRows, 967);
      if (field.score > 0.58) continue;
      smallCandidates.push({ gx, gy, rank: field.score + hash(gx, gy, 968) * 0.04, cloudness: 1 - field.broad });
    }
    smallCandidates.sort((a, b) => a.rank - b.rank);
    const singles = smallCandidates.slice(0, maxSingles);
    for (let k = 0; k < singles.length; k++) {
      const q = singles[k];
      const lat = clamp(-79 + q.gy * (158 / (smallRows - 1)) + (hash(q.gx, q.gy, 969) - 0.5) * 0.9, -79, 79);
      const lng = (((( -180 + q.gx * (360 / smallColumns) + (hash(q.gx, q.gy, 970) - 0.5) * 2.0) + 180) % 360 + 360) % 360) - 180;
      const ground = terrainElevationAt(lng, lat);
      const latScale = Math.sqrt(Math.max(0.16, Math.cos(lat * Math.PI / 180)));
      const kind = hash(q.gx, q.gy, 971);
      let radius, baseAgl, topAgl, verticalFraction;
      if (kind < 0.58) {
        radius = clamp((8500 + hash(q.gx, q.gy, 972) * 17000) * latScale, 7000, 30000);
        baseAgl = 2000 + hash(q.gx, q.gy, 973) * 1600;
        topAgl = Math.max(baseAgl + 1700, 4700 + hash(q.gx, q.gy, 974) * 4100);
        verticalFraction = 0.39 + hash(q.gx, q.gy, 975) * 0.04;
      } else if (kind < 0.88) {
        radius = clamp((14000 + hash(q.gx, q.gy, 976) * 22000) * latScale, 11000, 38000);
        baseAgl = 2100 + hash(q.gx, q.gy, 977) * 1700;
        topAgl = Math.max(baseAgl + 3500, 7600 + hash(q.gx, q.gy, 978) * 7200);
        verticalFraction = 0.42 + hash(q.gx, q.gy, 979) * 0.04;
      } else {
        radius = clamp((22000 + hash(q.gx, q.gy, 980) * 24000) * latScale, 16000, 48000);
        baseAgl = 2400 + hash(q.gx, q.gy, 981) * 1600;
        topAgl = Math.max(baseAgl + 1800, 5600 + hash(q.gx, q.gy, 982) * 3800);
        verticalFraction = 0.33 + hash(q.gx, q.gy, 983) * 0.05;
      }
      const range = topAgl - baseAgl;
      const altitude = ground + baseAgl + range * 0.5;
      const vertical = range * verticalFraction;
      addGlobalPuff(lng,lat,altitude,radius*(0.72+hash(q.gx,q.gy,985)*0.20),radius*(0.56+hash(q.gx,q.gy,986)*0.30),vertical,0.26+hash(q.gx,q.gy,987)*0.40,8,2,hash(q.gx,q.gy,988));
    }

    // Layer 3 — sparse high-level cloudlets in the gaps between denser cloud banks.
    // These have high bases, smaller vertical radii and deliberately lower opacity in the shader.
    const thinColumns = 126, thinRows = 56, maxThin = MOBILE ? 750 : 850;
    const thinCandidates = [];
    for (let gy = 0; gy < thinRows; gy++) for (let gx = 0; gx < thinColumns; gx++) {
      const field = cloudScore(gx, gy, thinColumns, thinRows, 991);
      if (field.score <= 0.58 || field.score > 0.90) continue;
      thinCandidates.push({ gx, gy, rank: hash(gx, gy, 992) });
    }
    thinCandidates.sort((a, b) => a.rank - b.rank);
    const thin = thinCandidates.slice(0, maxThin);
    for (let k = 0; k < thin.length; k++) {
      const q = thin[k];
      const lat = clamp(-78 + q.gy * (156 / (thinRows - 1)) + (hash(q.gx, q.gy, 993) - 0.5) * 0.6, -78, 78);
      const lng = (((( -180 + q.gx * (360 / thinColumns) + (hash(q.gx, q.gy, 994) - 0.5) * 1.3) + 180) % 360 + 360) % 360) - 180;
      const ground = terrainElevationAt(lng, lat);
      const latScale = Math.sqrt(Math.max(0.16, Math.cos(lat * Math.PI / 180)));
      const radius = clamp((245000 + hash(q.gx, q.gy, 995) * 335000) * latScale, 190000, 580000);
      const baseAgl = 6800 + hash(q.gx, q.gy, 996) * 1700;
      const topAgl = Math.max(baseAgl + 2600, 11200 + hash(q.gx, q.gy, 997) * 4500);
      const range = topAgl - baseAgl;
      const altitude = ground + baseAgl + range * 0.5;
      const vertical = range * (0.30 + hash(q.gx, q.gy, 998) * 0.07);
      addGlobalPuff(lng,lat,altitude,radius,radius*(0.78+hash(q.gx,q.gy,999)*0.28),vertical,0.12+hash(q.gx,q.gy,1000)*0.07,9,2,hash(q.gx,q.gy,1001));
    }
    globalCloudGeometryCache = {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
      formationCount: macro.length + fine.length + singles.length + thin.length, stormSignature, stormEyeMaskCount: sourceCyclones.length, cloudLodBand,
      macroRadiusMinKm: 400, macroRadiusMaxKm: 900, thinLayerSlices: 9, thinLayerStacks: 2, singleLayerSlices: 8, singleLayerStacks: 2,
      heightResolvedWindPuffs, modelledWindPuffs, windSampleSignature: windSampleSignature === 'uninitialized' ? 'no-height-resolved-wind-grid' : windSampleSignature,
      macroFormationCount: macro.length,
      fineFormationCount: fine.length,
      isolatedFormationCount: singles.length,
      thinLayerFormationCount: thin.length,
      terrainAwareFormationCount: terrainHeightKnownSamples,
      puffCount: macro.length * 3 + fine.length + singles.length + thin.length
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
    const overviewClouds = z <= 8.5;
    const overviewBoost = stormVisibilityBoost(z);
    globalStormLod = z <= 5.5 ? 'global-exaggerated-visibility' : z <= 8.5 ? 'regional-transition' : 'physical-local';
    let maxForm = z <= 5.5 ? (MOBILE ? 72 : 96) : z <= 8.5 ? (MOBILE ? 44 : 88) : (MOBILE ? 44 : 30);
    const vertices = [], indices = [], formations = [], stormVolumeVertices = [], stormVolumeIndices = [];
    measuredCount = 0; funnelCount = 0; tornadoFunnelMeshVertices = 0; stormCount = 0; rainCellShelfCount = 0; sourceCloudObservationCount = 0;
    hurricaneSpiralCloudCenters = 0; hurricaneCloudShieldRadiusKm = 0; hurricaneSpiralRibbonVertices = 0; stormVolumeIndexOffset=0; stormVolumeIndexCount=0; stormVolumeProxyVertices=0; hurricaneVolumeProxyVertices=0; tornadoVolumeProxyVertices=0;
    hurricaneEyeWallCloudCenters = 0; hurricaneEyeRadiusKm = 0; hurricaneEyeRadiusSource = 'no current source-backed hurricane';
    hurricaneVisualEyeRadiusKm = 0; hurricaneVisualShieldRadiusKm = 0; tornadoVisualHeightKm = 0; tornadoVisualTopRadiusKm = 0; tornadoVisualBoost = 0; sourceStormCount = 0; sourceTornadoAlertCount = 0; modeledHurricaneVisualCount = 0; modeledTornadoVisualCount = 0;
    localWindSourcePuffs = 0; localWindModelledPuffs = 0;
    const scene = getScene();
    const measured = collectHeightFeatures(scene);
    measuredCount = measured.length;
    heightSource = measuredCount ? String(measured[0]?.source || measured[0]?.provenance || 'world-effects cloud-height samples') : 'not connected';
    const alerts = Array.isArray(scene?.alerts) ? scene.alerts : [];
    const stormScore = st => isTropicalCyclone(st) ? 2 : 1;
    const stormList = (Array.isArray(scene?.storms)?scene.storms:[]).slice();
    for(const alert of alerts.filter(isTropicalCyclone)){
      const center=centerOf(alert); if(!center) continue;
      if(stormList.some(st=>Math.hypot((number(st.lng,number(st.longitude,999))-center[0])*Math.cos(center[1]*Math.PI/180),number(st.lat,number(st.latitude,999))-center[1])<0.6)) continue;
      stormList.push({...((alert?.properties)||alert),lng:center[0],lat:center[1],source_alert:true});
    }
    stormList.sort((a,b)=>stormScore(b)-stormScore(a));
    sourceStormCount = stormList.length;
    const tornadoAlerts = alerts.filter(alert => { const p=alert?.properties||alert||{}; const desc=String([p.phenom,p.event,p.headline,p.event_name,p.description].join(' ')).toLowerCase(); return /\btornado\b/.test(desc)||String(p.phenom||'').toUpperCase()==='TO'; });
    const tornadoAlertCount = tornadoAlerts.length;
    const sourceTornadoRecords = (Array.isArray(scene?.storms)?scene.storms:[]).filter(isTornadoSource);
    const sourceTornadoCount = sourceTornadoRecords.length;
    const hasSourceTornadoGeometry = tornadoAlerts.some(alert => !!centerOf(alert)) || sourceTornadoRecords.some(st => Number.isFinite(number(st.lng,number(st.longitude,NaN))) && Number.isFinite(number(st.lat,number(st.latitude,NaN))));
    sourceTornadoAlertCount = tornadoAlertCount + sourceTornadoCount;
    const sourceCycloneRecords = stormList.filter(st => isTropicalCyclone(st) &&
      Number.isFinite(number(st.lng,number(st.longitude,NaN))) &&
      Number.isFinite(number(st.lat,number(st.latitude,NaN))) &&
      Math.abs(number(st.lat,number(st.latitude,NaN))) <= 82);
    const viewCenter = map.getCenter?.();
    const hemisphereScore = st => {
      if (!viewCenter) return 1;
      const toRad=Math.PI/180,lat1=number(viewCenter.lat,0)*toRad,lat2=number(st.lat,number(st.latitude,0))*toRad;
      const dLng=(number(st.lng,number(st.longitude,0))-number(viewCenter.lng,0))*toRad;
      return Math.sin(lat1)*Math.sin(lat2)+Math.cos(lat1)*Math.cos(lat2)*Math.cos(dLng);
    };
    const visibleSourceCyclones = overviewClouds ? sourceCycloneRecords.filter(st=>hemisphereScore(st)>-0.08) : sourceCycloneRecords;
    const hasVisibleSourceHurricane = visibleSourceCyclones.some(isHurricaneClass);
    // If the currently visible hemisphere has no source-backed hurricane/typhoon,
    // keep an explicitly modeled demonstration vortex on the Atlantic. It is not
    // counted as a source storm or displayed as a live event.
    const visualStormList = visibleSourceCyclones.slice();
    if (z <= 5.5 && !hasVisibleSourceHurricane) {
      visualStormList.push({id:'modeled-atlantic-cloud-vortex',name:'Illustrative tropical-cyclone cloud vortex',type:'hurricane',classification:'HU-MODEL',lng:-58.5,lat:19.5,wind_mph:95,eye_radius_mi:17,cloud_shield_radius_mi:420,__bpModeledVisual:true});
      modeledHurricaneVisualCount = 1;
    }
    visualStormList.sort((a,b)=>hemisphereScore(b)-hemisphereScore(a));
    const modeledTornadoNeeded = !hasSourceTornadoGeometry;
    maxForm += Math.min(MOBILE ? 2 : 4, tornadoAlertCount + sourceTornadoCount + (modeledTornadoNeeded ? 1 : 0) + (modeledHurricaneVisualCount ? 1 : 0));
    const tornadoReserveCount = tornadoAlertCount + sourceTornadoCount + (modeledTornadoNeeded ? 1 : 0) + (modeledHurricaneVisualCount ? 1 : 0);
    const stormFormLimit = Math.max(8, maxForm - Math.min(10, tornadoReserveCount));
    const getLon = lng => ((((lng + 180) % 360) + 360) % 360) - 180;
    function addFormation(lng, lat, radiusM, baseM, topM, seed, kind = 'ordinary', windContext = null) {
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 82 || formations.length >= maxForm) return;
      formations.push({ lng: getLon(lng), lat, radiusM: clamp(radiusM, 600, 520000),
        baseM: clamp(baseM, 450, 14000), topM: clamp(topM, baseM + 180, 18500), seed, kind, windContext });
    }
    if (modeledTornadoNeeded) {
      const lng=-97.45,lat=35.55,ground=terrainElevationAt(lng,lat);
      const before=formations.length;
      addFormation(lng,lat,12500,ground+1900,ground+12500,hash(lng,lat,6079),'funnel');
      if(formations.length>before){funnelCount++;modeledTornadoVisualCount=1;}
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
    for (const sample of rainAnchorObservations.slice(0, overviewClouds ? 0 : (MOBILE ? 4 : 8))) {
      const lng = number(sample.lng, number(sample.longitude, NaN));
      const lat = number(sample.lat, number(sample.latitude, NaN));
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      const raw = String([sample.weather, sample.present_weather, sample.weather_text, sample.wx, sample.condition, sample.rawdata]
        .filter(Boolean).join(' ')).toLowerCase();
      const thunderstorm = /thunderstorm|\bts\b|squall/.test(raw);
      const elevation = terrainElevationAt(lng, lat);
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
    for (const sample of measured.slice(0, overviewClouds ? 0 : (MOBILE ? 4 : 5))) {
      const top = number(sample.cloud_top_height_m, number(sample.cloudTopHeightM));
      if (top < 200 || top > 23000) continue;
      addFormation(number(sample.lng), number(sample.lat), number(sample.radius_m || sample.radius_meters, 6500),
        number(sample.cloud_base_height_m, top * 0.64), top, hash(number(sample.lng), number(sample.lat), 8), 'measured');
    }

    // Weather geometry is anchored to source storm coordinates, never the camera center.
    // A hurricane is an eye + eyewall + three curved spiral arms, rather than a filled blob.
    for (const storm of visualStormList.filter(st=>Number.isFinite(number(st.lng,number(st.longitude,NaN)))&&Number.isFinite(number(st.lat,number(st.latitude,NaN)))).slice(0, z<=5.5 ? (MOBILE?2:3) : overviewClouds ? (MOBILE?1:3) : (MOBILE?1:4))) {
      const lng = number(storm.lng, number(storm.longitude, NaN)), lat = number(storm.lat, number(storm.latitude, NaN));
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 82) continue;
      const windMph = clamp(number(storm.wind_mph,number(storm.wind_kt,0)*1.15078),0,220);
      const hurricane = isTropicalCyclone(storm);
      const suppliedShieldMi = number(storm.cloud_shield_radius_mi,
        number(storm.cloudShieldRadiusMi, number(storm.cloud_radius_mi,
          number(storm.cloudRadiusMi, number(storm.radius_mi, NaN)))));
      const suppliedShieldKm = number(storm.cloud_shield_radius_km,number(storm.cloudShieldRadiusKm,number(storm.cloud_radius_km,NaN)));
      const sourceShieldM = Number.isFinite(suppliedShieldKm)&&suppliedShieldKm>0?suppliedShieldKm*1000:Number.isFinite(suppliedShieldMi)&&suppliedShieldMi>0?suppliedShieldMi*1609.34:NaN;
      const shieldRadiusM = Number.isFinite(sourceShieldM)&&sourceShieldM>0
        ? clamp(sourceShieldM,hurricane?320000:120000,hurricane?980000:600000)
        : (hurricane?780000:300000);
      const eyeKm = number(storm.eye_radius_km,number(storm.eyeRadiusKm,NaN));
      const eyeMi = number(storm.eye_radius_mi,number(storm.eyeRadiusMi,NaN));
      const eyeRawM = Number.isFinite(eyeKm)&&eyeKm>0?eyeKm*1000:Number.isFinite(eyeMi)&&eyeMi>0?eyeMi*1609.34:NaN;
      const eyeRadiusM = Number.isFinite(eyeRawM)?clamp(eyeRawM,6000,75000):28000;
      const visualEyeRadiusM = eyeRadiusM;
      const visualShieldRadiusM = shieldRadiusM;
      if(hurricane){hurricaneVisualEyeRadiusKm=Math.max(hurricaneVisualEyeRadiusKm,visualEyeRadiusM/1000);hurricaneVisualShieldRadiusKm=Math.max(hurricaneVisualShieldRadiusKm,visualShieldRadiusM/1000);}
      if(hurricane){
        const ground=terrainElevationAt(lng,lat),southern=lat<0?0.040:0.0;
        const volumeTint=1.482+shieldRadiusM/100000000+southern;
        const added=makeStormVolumeProxy(MC,stormVolumeVertices,stormVolumeIndices,lng,lat,ground,shieldRadiusM,0,16000,volumeTint);
        hurricaneVolumeProxyVertices+=added;stormVolumeProxyVertices+=added;
        hurricaneEyeWallCloudCenters++;hurricaneSpiralCloudCenters+=5;
        hurricaneCloudShieldRadiusKm=Math.max(hurricaneCloudShieldRadiusKm,shieldRadiusM/1000);
        stormCount++;
      }
    }

    function puff(lng,lat,altitude,rx,ry,rz,seed,tint,lowCost=false,windContext=null,rotationCenter=null){
      const wind=cloudWindVectorFor(lng,lat,altitude,scene,windContext);
      if(wind.sourceBacked)localWindSourcePuffs++;else localWindModelledPuffs++;
      const center=rotationCenter || (windContext ? {lng:windContext.centerLng,lat:windContext.centerLat} : null);
      const pivot=center?MC.fromLngLat({lng:center.lng,lat:center.lat},0):null;
      makePuffGeometry(null,MC,vertices,indices,getLon(lng),clamp(lat,-82,82),altitude,rx,ry,rz,tint,
        lowCost?(MOBILE?6:7):(MOBILE?7:8),lowCost?2:3,seed,pivot?pivot.x:wind.dx,pivot?pivot.y:wind.dy);
    }
    function addHurricaneSpiralRibbon(centerLng,centerLat,phase,eyeRadiusM,shieldRadiusM,overviewBoost){
      const pivot=MC.fromLngLat({lng:centerLng,lat:centerLat},0),segments=MOBILE?22:34,latCos=Math.max(0.16,Math.cos(centerLat*Math.PI/180));
      for(let arm=0;arm<3;arm++){
        const base=vertices.length/10;
        for(let j=0;j<=segments;j++){
          const t=j/segments,angle=phase+arm*TAU/3+t*TAU*1.18+Math.sin(t*TAU*2+arm)*0.045;
          const radius=eyeRadiusM*2.65+t*Math.max(0,shieldRadiusM*0.94-eyeRadiusM*2.65);
          const dr=Math.max(1,shieldRadiusM*0.94-eyeRadiusM*2.65),da=TAU*1.18;
          const tx=dr*Math.cos(angle)-radius*da*Math.sin(angle),ty=dr*Math.sin(angle)+radius*da*Math.cos(angle),length=Math.max(1,Math.hypot(tx,ty));
          const nx=-ty/length,ny=tx/length,width=Math.max(52000,shieldRadiusM*(0.055+0.01*t));
          const centerX=Math.cos(angle)*radius,centerY=Math.sin(angle)*radius;
          const lngLat=[];
          for(const side of [-1,1]){
            const x=centerX+nx*width*side,y=centerY+ny*width*side;
            lngLat.push([getLon(centerLng+x/(111320*latCos)),clamp(centerLat+y/111320,-82,82)]);
          }
          const baseAlt=7600+hash(centerLng,centerLat,arm*100+j+6300)*1700;
          const topAlt=13300+hash(centerLng,centerLat,arm*100+j+6400)*2300;
          const pts=[
            MC.fromLngLat({lng:lngLat[0][0],lat:lngLat[0][1]},baseAlt),
            MC.fromLngLat({lng:lngLat[1][0],lat:lngLat[1][1]},baseAlt),
            MC.fromLngLat({lng:lngLat[0][0],lat:lngLat[0][1]},topAlt),
            MC.fromLngLat({lng:lngLat[1][0],lat:lngLat[1][1]},topAlt)
          ];
          const localStart=vertices.length/10;
          for(let k=0;k<4;k++){
            const p=pts[k],side=(k===0||k===2)?-1:1,high=k>=2?1:0;
            vertices.push(p.x,p.y,p.z,k>=2?topAlt:baseAlt,side*0.82,t*3.2,high*0.95,1.292,pivot.x,pivot.y);
          }
          hurricaneSpiralRibbonVertices+=4;
          if(j>0){
            const prev=localStart-4,cur=localStart;
            indices.push(prev+2,prev+3,cur+2,prev+3,cur+3,cur+2);
            indices.push(prev,cur,prev+2,cur,cur+2,prev+2);
            indices.push(prev+1,prev+3,cur+1,prev+3,cur+3,cur+1);
            indices.push(prev,prev+1,cur,prev+1,cur+1,cur);
          }
        }
      }
    }
    const globeScale = z <= 8.5;
    for (let k = 0; k < formations.length; k++) {
      const f = formations[k];
      if(f.kind==='funnel'){
        const ground=terrainElevationAt(f.lng,f.lat),heightM=clamp(f.topM-ground,4500,15500);
        const added=makeStormVolumeProxy(MC,stormVolumeVertices,stormVolumeIndices,f.lng,f.lat,ground,18000,0,heightM,1.474+heightM/100000000);
        tornadoFunnelMeshVertices+=added;tornadoVolumeProxyVertices+=added;stormVolumeProxyVertices+=added;
        tornadoVisualHeightKm=Math.max(tornadoVisualHeightKm,heightM/1000);tornadoVisualTopRadiusKm=Math.max(tornadoVisualTopRadiusKm,1.89);tornadoVisualBoost=0;
        continue;
      }
      const n = f.kind === 'funnel' ? (globeScale ? 1 : 1) : globeScale
        ? ((f.kind === 'hurricane-eyewall' || f.kind === 'hurricane-spiral' || f.kind === 'hurricane' || f.kind === 'storm') ? 2 : 1)
        : (MOBILE ? 3 : 4);
      const funnelTopM = f.kind === 'funnel' ? f.topM + Math.max(0,260000-f.topM)*overviewBoost : f.topM;
      const funnelRadiusM = f.kind === 'funnel' ? f.radiusM + Math.max(0,95000-f.radiusM)*overviewBoost : f.radiusM;
      for (let i = 0; i < n; i++) {
        const a = i * 2.399 + f.seed * 5.3;
        const ring = i === 0 ? 0 : f.radiusM * (0.16 + hash(k, i, 1) * 0.24);
        const lat = f.lat + Math.sin(a) * ring / 111320;
        const lng = f.lng + Math.cos(a) * ring / (111320 * Math.max(0.12, Math.cos(f.lat * Math.PI / 180)));
        const scaleX = i === 0 ? 1.00 : 0.50 + hash(k, i, 3) * 0.24;
        const scaleY = i === 0 ? 0.82 : 0.54 + hash(k, i, 4) * 0.22;
        const cloudRange = funnelTopM - f.baseM;
        const altitude = f.baseM + cloudRange * (f.kind === 'funnel' ? (globeScale ? 0.91 : 0.86) : (i === 0 ? 0.50 : 0.48 + hash(k, i, 5) * 0.04));
        const vertical = f.kind === 'funnel' ? Math.max(globeScale ? 18000 : 3200, cloudRange * (globeScale ? 0.10 : 0.48)) : cloudRange * (i === 0 ? 0.43 : 0.40 + hash(k, i, 6) * 0.035);
        const parentScale = f.kind === 'funnel' ? (globeScale ? 0.92 : 0.60) : 1;
        const puffTint = f.kind === 'rain-cell' ? 1.35 : f.kind === 'hurricane' ? (f.windContext?.centerLat < 0 ? 1.28 : 1.27) : f.kind === 'hurricane-eyewall' ? (f.windContext?.centerLat < 0 ? 1.24 : 1.23) : f.kind === 'hurricane-spiral' ? (f.windContext?.centerLat < 0 ? 1.28 : 1.27) : f.kind === 'storm' || f.kind === 'funnel' ? 0.93 + hash(k, i, 7) * 0.035 : 0.22 + hash(k, i, 7) * 0.52;
        puff(lng, lat, altitude, funnelRadiusM * scaleX * parentScale, funnelRadiusM * scaleY * parentScale, vertical, f.seed,
          puffTint, globeScale, f.windContext, f.kind === 'funnel' ? {lng:f.lng,lat:f.lat} : null);
      }
      if (f.kind === 'rain-cell') {
        // Distinct low rain-cloud shelf: same world coordinates and cloud base as rain seeds.
        const shelfAltitude = f.baseM + clamp((f.topM - f.baseM) * 0.12, 160, 260);
        puff(f.lng, f.lat, shelfAltitude, f.radiusM * 0.38, f.radiusM * 0.30,
          clamp((f.topM - f.baseM) * 0.18, 260, 520), 1.35, 1.35, globeScale, f.windContext);
        rainCellShelfCount++;
      }
      if (f.kind === 'funnel') { const beforeFunnelVertices=vertices.length/10; const fm=makeFunnelGeometry(MC, vertices, indices, f.lng, f.lat, funnelTopM, f.lat < 0 ? 1.46 : 1.45, z); tornadoFunnelMeshVertices += vertices.length/10-beforeFunnelVertices; tornadoVisualHeightKm=Math.max(tornadoVisualHeightKm,fm.heightM/1000); tornadoVisualTopRadiusKm=Math.max(tornadoVisualTopRadiusKm,fm.topRadiusM/1000); tornadoVisualBoost=Math.max(tornadoVisualBoost,fm.zoomBoost); }
    }
    const global = buildGlobalCloudGeometry();
    const globalVertexCount = Math.floor(global.vertices.length / 10);
    const requestedStormVertexCount = Math.floor(stormVolumeVertices.length/10);
    const localVertexCount = Math.min(Math.floor(vertices.length / 10), Math.max(0,65530-globalVertexCount-requestedStormVertexCount));
    const stormVertexCount = Math.min(requestedStormVertexCount,Math.max(0,65530-globalVertexCount-localVertexCount));
    vertexData = new Float32Array(global.vertices.length + localVertexCount * 10 + stormVertexCount * 10);
    vertexData.set(global.vertices, 0);
    vertexData.set(vertices.slice(0, localVertexCount * 10), global.vertices.length);
    vertexData.set(stormVolumeVertices.slice(0,stormVertexCount*10),global.vertices.length+localVertexCount*10);
    const mergedIndices = new Uint16Array(global.indices.length + indices.length + stormVolumeIndices.length);
    mergedIndices.set(global.indices, 0);
    let mergedCount = global.indices.length;
    for (const index of indices) {
      if (index < localVertexCount && globalVertexCount + index < 65530) mergedIndices[mergedCount++] = globalVertexCount + index;
    }
    stormVolumeIndexOffset=mergedCount;
    const stormVertexOffset=globalVertexCount+localVertexCount;
    for(const index of stormVolumeIndices){if(index<stormVertexCount&&stormVertexOffset+index<65530)mergedIndices[mergedCount++]=stormVertexOffset+index;}
    stormVolumeIndexCount=mergedCount-stormVolumeIndexOffset;
    indexData = mergedIndices.slice(0,mergedCount);
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
      geometryDirty = true; formationCount = 0; measuredCount = 0; funnelCount = 0; tornadoFunnelMeshVertices = 0; stormCount = 0;
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
  function onMoveEnd() { if (enabled) { scheduleGeometry(120); publishState(); } }
  let windSampleSignature = 'uninitialized';
  function onWeatherUpdated() {
    // Refresh only the optional upper-air sample field when a new weather scene arrives.
    // Rebuild the global cloud buffers only when the height-resolved wind grid changes.
    if (!enabled || disposed) return;
    const scene = getScene();
    windSampleScene = null; windSampleCache = [];
    const samples = collectHeightResolvedWindSamples(scene);
    const nextSignature = samples.length + ':' + samples.slice(0,8).map(x=>`${x.lng.toFixed(2)},${x.lat.toFixed(2)},${Math.round(x.altitude)},${Math.round(x.east*10)},${Math.round(x.north*10)},${x.timestamp||''}`).join('|');
    if (samples.length && globalCloudGeometryCache && nextSignature !== globalCloudGeometryCache.windSampleSignature) globalCloudGeometryCache = null;
    windSampleSignature = nextSignature;
    scheduleGeometry(0);
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
    version: 6082, map, overlay,
    get enabled() { return enabled; },
    setEnabled, toggle,
    get state() { return window.__BP_SKY_CLOUDS_STATE_V6077__ || window.__BP_SKY_CLOUDS_STATE_V6076__ || window.__BP_SKY_CLOUDS_STATE_V6074__ || window.__BP_SKY_CLOUDS_STATE_V6073__ || window.__BP_SKY_CLOUDS_STATE_V6047__ || window.__BP_SKY_CLOUDS_STATE_V6046__ || window.__BP_SKY_CLOUDS_STATE_V6045__ || window.__BP_SKY_CLOUDS_STATE_V6031__ || window.__BP_SKY_CLOUDS_STATE_V6029__ || window.__BP_SKY_CLOUDS_STATE_V5908__ || null; },
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
