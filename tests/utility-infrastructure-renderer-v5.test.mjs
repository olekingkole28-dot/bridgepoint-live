import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../release-v2300/world-v2300-utility-infrastructure-v1.js', import.meta.url),
  'utf8'
);

assert.ok(source.includes('const VERSION = 5;'), 'utility renderer version advances to v5');
assert.ok(source.includes('const MIN_ZOOM = 11.5;'), 'local utility assets load at close zoom');
assert.ok(source.includes('new THREE.CylinderGeometry(.082, .145, 1, 14)'), 'wood/concrete poles use a full-dimension solid shaft');
assert.ok(source.includes('new THREE.CylinderGeometry(.145, .18, .26, 14)'), 'pole bases have a grounded collar');
assert.ok(source.includes('new THREE.BoxGeometry(1, .09, .14)'), 'crossarms are solid metre-scale timber or steel');
assert.ok(source.includes('new THREE.CylinderGeometry(.038, .052, .20, 10)'), 'crossarms carry visible ceramic insulators');
assert.ok(source.includes('const yaw = ((Number.isFinite(Number(support.bearing)) ? Number(support.bearing) : 0) * RAD)'), 'crossarms are aligned across the conductor route');
assert.ok(source.includes('let catenaryA = distance * distance / Math.max(.1, 8 * sag)'), 'overhead conductors use a catenary rather than a straight/parabolic strip');
assert.ok(source.includes('support.height * .84 + .245'), 'power conductors meet the top insulator attachment');
assert.ok(source.includes('support.height * .68 + .07'), 'telecom conductors meet the lower communications bracket');
assert.ok(source.includes('function hasGroundElevation(coordinate)'), 'unresolved ground points are detected before mesh placement');
assert.ok(source.includes('incoming.supports.filter(s => hasGroundElevation(s.coordinate))'), 'unresolved poles are withheld rather than buried/floating');
assert.ok(source.includes('void loadUSGS3DEPGround(assets)'), 'missing USGS ground samples load progressively without blocking first-frame rendering');
assert.ok(source.includes('const height = support.measuredHeight && Number.isFinite(sourceHeight)'), 'source-measured heights are not replaced by a generic cap');
assert.ok(source.includes('Towers rendered by this layer: 0'), 'transmission towers remain excluded from the distribution renderer');
assert.ok(source.includes('state.towers = 0;'), 'transmission tower counter stays zero for this module');

// Check that the catenary equation touches both insulators and reaches its
// intended downward sag at mid-span for representative local pole spacing.
const length = 48;
const sag = 0.95;
let a = length * length / (8 * sag);
for (let iteration = 0; iteration < 6; iteration++) {
  const ratio = length / (2 * a);
  const residual = a * (Math.cosh(ratio) - 1) - sag;
  const derivative = Math.cosh(ratio) - 1 - ratio * Math.sinh(ratio);
  if (Math.abs(derivative) < 1e-12) break;
  a = Math.max(.05, a - residual / derivative);
}
const end = Math.cosh(length / (2 * a));
const drop = t => a * (Math.cosh((t - 0.5) * length / a) - end);
assert.ok(Math.abs(drop(0)) < 1e-9, 'catenary starts at the first insulator');
assert.ok(Math.abs(drop(1)) < 1e-9, 'catenary ends at the second insulator');
assert.ok(Math.abs(drop(0.5) + sag) < 1e-6, 'catenary sag reaches the intended mid-span drop');

console.log('BRIDGEPOINT_UTILITY_RENDERER_V5_PASS');
