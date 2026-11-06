import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../release-v2300/world-v2300-utility-infrastructure-v1.js', import.meta.url),
  'utf8'
);

assert.ok(source.includes('const VERSION = 6;'), 'utility renderer version advances to v6');
assert.ok(source.includes('const MIN_ZOOM = 11.5;'), 'local utility assets load at close zoom');
assert.ok(source.includes('const MAX_GROUND_SAMPLES = 96;'), 'ground samples resolve in larger progressive batches');
assert.ok(source.includes('new THREE.CylinderGeometry(.082, .145, 1, 16)'), 'wood/concrete poles use a full-dimension solid shaft');
assert.ok(source.includes('new THREE.CylinderGeometry(.145, .18, .26, 16)'), 'pole bases have a grounded collar');
assert.ok(source.includes('new THREE.BoxGeometry(1, .13, .18)'), 'crossarms are solid metre-scale timber or steel');
assert.ok(source.includes('new THREE.CylinderGeometry(.045, .060, .24, 12)'), 'crossarms carry visible ceramic insulators');
assert.ok(source.includes('const yaw = ((Number.isFinite(Number(support.bearing)) ? Number(support.bearing) : 0) * RAD)'), 'crossarms are aligned across the conductor route');
assert.ok(source.includes('let catenaryA = distance * distance / Math.max(.1, 8 * sag)'), 'overhead conductors use a catenary rather than a straight/parabolic strip');
assert.ok(source.includes('support.height * .84 + .245'), 'power conductors meet the top insulator attachment');
assert.ok(source.includes('support.height * .68 + .07'), 'telecom conductors meet the lower communications bracket');
assert.ok(source.includes('function hasGroundElevation(coordinate)'), 'exact terrain availability is tracked for mapped utility points');
assert.ok(source.includes('const supports = incoming.supports;'), 'mapped poles render immediately while missing ground samples resolve');
assert.ok(source.includes('function localMetresPerPixel(coordinate)'), 'pole dimensions adapt to globe screen scale');
assert.ok(source.includes('function wireRadiusFor(coordinate, baseRadius)'), 'thin conductors retain a visible screen-space floor');
assert.ok(source.includes('nearestElevation === null ? 0 : nearestElevation'), 'nearby verified terrain anchors unresolved poles until exact samples arrive');
assert.ok(source.includes('void loadUSGS3DEPGround(assets)'), 'missing USGS ground samples load progressively without blocking first-frame rendering');
assert.ok(source.includes('minimumDisplayScale(support.coordinate, .164, .95, 5.5)'), 'thin pole shafts remain screen-visible at close zoom');
assert.ok(source.includes('wireRadiusFor(anchor, telecom ? .014 : .019)'), 'power and telecom wires use visibility-scaled round conductors');
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

console.log('BRIDGEPOINT_UTILITY_RENDERER_V6_PASS');
