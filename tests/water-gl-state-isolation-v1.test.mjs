import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../release-v2300/world-v2300-water.js', import.meta.url), 'utf8');
const begin = source.indexOf('function captureWaterGLState(gl, locations, isolatedVao)');
const end = source.indexOf('function createLayer(api, map)', begin);
assert.ok(begin >= 0 && end > begin, 'water has a standalone shared-context graphics-state boundary');
const { captureWaterGLState, restoreWaterGLState } = Function(source.slice(begin, end) +
  '\nreturn { captureWaterGLState, restoreWaterGLState };')();

const P = {
  BLEND: 1, CURRENT_PROGRAM: 2, ARRAY_BUFFER_BINDING: 3, DEPTH_WRITEMASK: 4,
  BLEND_SRC_RGB: 5, BLEND_DST_RGB: 6, BLEND_SRC_ALPHA: 7, BLEND_DST_ALPHA: 8,
  VERTEX_ARRAY_BINDING: 9, ARRAY_BUFFER: 10, VERTEX_ATTRIB_ARRAY_ENABLED: 11,
  VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: 12, VERTEX_ATTRIB_ARRAY_SIZE: 13,
  VERTEX_ATTRIB_ARRAY_TYPE: 14, VERTEX_ATTRIB_ARRAY_NORMALIZED: 15,
  VERTEX_ATTRIB_ARRAY_STRIDE: 16, VERTEX_ATTRIB_ARRAY_POINTER: 17
};
function fakeGL(){
  const values = new Map([[P.CURRENT_PROGRAM, 'map-program'], [P.ARRAY_BUFFER_BINDING, 'map-buffer'],
    [P.DEPTH_WRITEMASK, false], [P.BLEND_SRC_RGB, 21], [P.BLEND_DST_RGB, 22],
    [P.BLEND_SRC_ALPHA, 23], [P.BLEND_DST_ALPHA, 24], [P.VERTEX_ARRAY_BINDING, 'map-vao']]);
  const attrib = new Map([[P.VERTEX_ATTRIB_ARRAY_ENABLED, true],
    [P.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING, 'map-attrib-buffer'],
    [P.VERTEX_ATTRIB_ARRAY_SIZE, 3], [P.VERTEX_ATTRIB_ARRAY_TYPE, 5126],
    [P.VERTEX_ATTRIB_ARRAY_NORMALIZED, false], [P.VERTEX_ATTRIB_ARRAY_STRIDE, 24]]);
  let blending = false;
  return {...P, getParameter:p=>values.get(p), isEnabled:p=>p===P.BLEND&&blending,
    getVertexAttrib:(_,p)=>attrib.get(p), getVertexAttribOffset:()=>8,
    bindVertexArray:x=>values.set(P.VERTEX_ARRAY_BINDING,x),
    enable:p=>{if(p===P.BLEND)blending=true}, disable:p=>{if(p===P.BLEND)blending=false},
    blendFuncSeparate:(a,b,c,d)=>{values.set(P.BLEND_SRC_RGB,a);values.set(P.BLEND_DST_RGB,b);
      values.set(P.BLEND_SRC_ALPHA,c);values.set(P.BLEND_DST_ALPHA,d)},
    depthMask:x=>values.set(P.DEPTH_WRITEMASK,x), useProgram:x=>values.set(P.CURRENT_PROGRAM,x),
    bindBuffer:(p,x)=>{if(p===P.ARRAY_BUFFER)values.set(P.ARRAY_BUFFER_BINDING,x)},
    vertexAttribPointer:()=>{}, enableVertexAttribArray:()=>{}, disableVertexAttribArray:()=>{}
  };
}
const gl = fakeGL();
const state = captureWaterGLState(gl, [0,1,2], true);
gl.bindVertexArray('water-vao');
gl.enable(gl.BLEND);gl.depthMask(true);gl.useProgram('water-program');gl.bindBuffer(gl.ARRAY_BUFFER,'water-buffer');
gl.blendFuncSeparate(77,78,79,80);
restoreWaterGLState(gl, state);
assert.equal(gl.getParameter(gl.VERTEX_ARRAY_BINDING),'map-vao','original MapLibre VAO restored');
assert.equal(gl.getParameter(gl.CURRENT_PROGRAM),'map-program','shader binding restored');
assert.equal(gl.getParameter(gl.ARRAY_BUFFER_BINDING),'map-buffer','vertex buffer restored');
assert.equal(gl.getParameter(gl.DEPTH_WRITEMASK),false,'original disabled depth-writing restored');
assert.equal(gl.isEnabled(gl.BLEND),false,'blending state restored');
assert.deepEqual([gl.getParameter(gl.BLEND_SRC_RGB),gl.getParameter(gl.BLEND_DST_RGB),
  gl.getParameter(gl.BLEND_SRC_ALPHA),gl.getParameter(gl.BLEND_DST_ALPHA)],[21,22,23,24],
  'all original blend factors restored');

const fallback= captureWaterGLState(gl, [0,0,3,-1], false);
assert.equal(fallback.attrs.length,2,'non-VAO browsers capture each attribute just once');
restoreWaterGLState(gl, fallback);
assert.match(source, /savedWaterState = captureWaterGLState\(/);
assert.match(source, /finally\s*\{\s*restoreWaterGLState\(gl, savedWaterState\)/);
assert.match(source, /const priorBuffer = gl\.getParameter\(gl\.ARRAY_BUFFER_BINDING\)/);
assert.match(source, /gl\.bindBuffer\(gl\.ARRAY_BUFFER, priorBuffer\)/);
assert.doesNotMatch(source, /gl\.depthMask\(true\);\s*\/\/ Leave blending enabled/);
console.log('BRIDGEPOINT_SHARED_WEBGL_WATER_STATE_RESTORATION_PASS');
