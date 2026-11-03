import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [moduleSource, landingHtml, appHtml, fullDeploy] = await Promise.all([
  read('../rebuild-v5000/bridgepoint-transportation-v1.js'),
  read('../rebuild-v5000/index.html'),
  read('../rebuild-v5000/app-index.html'),
  read('../.github/workflows/deploy-intelligence-rebuild-v5000.yml')
]);

const context = {
  window: { addEventListener() {} },
  document: { readyState: 'loading', addEventListener() {}, querySelector() { return null; } },
  console: { warn() {}, log() {}, error() {} },
  matchMedia: () => ({ matches: false }),
  MutationObserver: class { observe() {} disconnect() {} },
  setInterval() { return 1; },
  clearInterval() {},
  setTimeout() { return 1; },
  clearTimeout() {},
  requestAnimationFrame() { return 1; },
  cancelAnimationFrame() {},
  performance: { now: () => 1000 }
};
const window = context.window;
const document = context.document;
const bootModule = await import('node:vm');
bootModule.runInNewContext(moduleSource, context, { filename: 'bridgepoint-transportation-v1.js' });
const api = window.__BP_TRANSPORTATION_V1__;

assert.ok(api, 'transportation simulation exposes diagnostics and helper methods');
assert.equal(api.version, 1);
assert.equal(api.enabledByDefault, false, 'transportation stays off until the user presses the new button');
assert.equal(api.simulationOnly, true, 'generated traffic must never be described as real vehicle GPS');

const helpers = api.helpers;
assert.equal(helpers.isRoadFeature({ properties: { class: 'primary', subclass: 'road' } }), true);
assert.equal(helpers.isRoadFeature({ properties: { class: 'minor', subclass: 'residential' } }), true);
assert.equal(helpers.isRoadFeature({ properties: { class: 'motorway' } }), true);
assert.equal(helpers.isRoadFeature({ properties: { class: 'rail', subclass: 'rail' } }), false);
assert.equal(helpers.isRoadFeature({ properties: { class: 'transit' } }), false);
assert.equal(helpers.isRoadFeature({ properties: { class: 'path', subclass: 'footway' } }), false);
assert.equal(helpers.isRoadFeature({ properties: { class: 'pedestrian', subclass: 'pedestrian' } }), false);

const validKinds = new Set([
  'sedan', 'suv', 'pickup', 'sports-car', 'electric-sedan', 'jeep',
  'delivery-van', 'box-truck', 'tractor-truck', 'semi-trailer', 'city-bus'
]);
for (let seed = 0; seed < 100; seed++) {
  assert.ok(validKinds.has(helpers.vehicleKindForRoad('residential', seed)), 'civilian models come from the supported 3D catalog');
  assert.ok(validKinds.has(helpers.vehicleKindForRoad('motorway', seed)), 'motorway traffic uses supported civilian vehicle families');
}

const local = helpers.localPoint([-71.0579, 42.36], [-71.0589, 42.36], 27, 7);
assert.ok(local.x > 70 && local.x < 90, 'local coordinates use metre-scale east-west offsets');
assert.ok(Math.abs(local.z) < 1e-5, 'same-latitude points have no north/south offset');
assert.equal(local.y, 20, 'vehicle elevation is relative to the sampled terrain anchor');

const path = {
  roadClass: 'residential',
  length: 100,
  points: [
    { coordinate: [-71.06, 42.36], local: { x: 0, y: 0, z: 0 }, distance: 0 },
    { coordinate: [-71.059, 42.36], local: { x: 82, y: 2, z: 0 }, distance: 100 }
  ]
};
const midpoint = helpers.interpolatePath(path, 50);
assert.ok(midpoint);
assert.ok(Math.abs(midpoint.local.x - 41) < .001);
assert.ok(Math.abs(midpoint.local.y - 1) < .001);
assert.ok(Math.abs(midpoint.coordinate[0] - -71.0595) < .00001);

for (const phrase of [
  'Police cars', 'Ambulances', 'Fire trucks', 'Civilian vehicles',
  'SIMULATED police', 'SIMULATED ambulance', 'SIMULATED fire engines', 'Simulated fire truck',
  'No actual vehicle GPS', 'No vehicle GPS, dispatch, patient, officer, home or private-property data',
  'queryTerrainElevation', 'sourceLayer: ROAD_SOURCE_LAYER',
  'new THREE.WebGLRenderer', 'map.transform.getMatrixForModel',
  'wheelPivots', 'wheel.rotation.x', 'emissiveIntensity'
]) {
  assert.ok(moduleSource.includes(phrase), 'transportation source includes required safeguard or feature: ' + phrase);
}
assert.ok(!/tomtom|here\.com|911|cad feed|avl endpoint/i.test(moduleSource), 'this first preview does not claim or query unconfigured traffic/dispatch services');
assert.ok(!/fetch\s*\(/.test(moduleSource), 'no unconfigured remote vehicle telemetry endpoint is queried');

const expectedScript = 'bridgepoint-transportation-v1.js?v=1-3d-road-traffic-simulation';
assert.ok(landingHtml.includes(expectedScript), 'homepage loads the opt-in transportation simulation');
assert.ok(appHtml.includes(expectedScript), 'app loads the same opt-in transportation simulation');
assert.ok(fullDeploy.includes('node --check rebuild-v5000/bridgepoint-transportation-v1.js'), 'full deploy syntax-checks the transportation module');
assert.ok(fullDeploy.includes('node tests/transportation-simulation-v1.test.mjs'), 'full deploy runs the transportation regression tests');
assert.ok(fullDeploy.includes('cp rebuild-v5000/bridgepoint-transportation-v1.js site/bridgepoint-transportation-v1.js'), 'full deploy publishes the new transportation module');

console.log('BridgePoint Transportation Simulation v1 contract checks passed.');
