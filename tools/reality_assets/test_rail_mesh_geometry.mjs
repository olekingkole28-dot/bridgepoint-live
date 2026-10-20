import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(here, '../../rebuild-v5000/bridgepoint-rail-mesh-v5973.js');
const source = readFileSync(sourcePath, 'utf8');

const window = { addEventListener() {} };
const document = {
  readyState: 'complete',
  documentElement: null,
  getElementById() { return null; },
  addEventListener() {}
};
class MutationObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
  disconnect() {}
}
const context = {
  window, document, MutationObserver,
  console: { warn() {}, log() {}, error() {} },
  matchMedia: () => ({ matches: false }),
  setTimeout() { return 1; },
  clearTimeout() {}
};
vm.runInNewContext(source, context, { filename: sourcePath });

const api = window.__BP_RAIL_MESH_V5973__;
assert.ok(api, '3D rail mesh module exposes a testable geometry API');
assert.equal(api.version, 5973);
assert.equal(api.enabledByDefault, false, 'mesh materialization must remain opt-in');

assert.equal(api.isRailFeature({ properties: { class: 'rail' } }), true);
assert.equal(api.isRailFeature({ properties: { class: 'transit' } }), true);
assert.equal(api.isRailFeature({ properties: { subclass: 'subway' } }), true);
assert.equal(api.isRailFeature({ properties: { railway: 'tram' } }), true);
assert.equal(api.isRailFeature({ properties: { class: 'primary', subclass: 'road' } }), false);
assert.equal(api.isRailFeature({ properties: { class: 'minor', subclass: 'residential' } }), false);
assert.equal(api.isRailFeature({ geometry: { type: 'Polygon' }, properties: { class: 'rail' } }), true,
  'classification is source-tag driven; geometry type is checked separately before rendering');

const local = api.localPoint([-71.0579, 42.36], [-71.0589, 42.36], 27, 7);
assert.ok(local.x > 70 && local.x < 90, 'one-thousandth degree east should become a ~70–90 m local offset');
assert.ok(Math.abs(local.z) < 1e-5, 'same latitude should produce zero north/south offset');
assert.equal(local.y, 20, 'local vertical coordinate should remain relative to the sampled DEM anchor');
assert.ok(Math.abs(api.metersApart([-71.0589, 42.36], [-71.0579, 42.36]) - local.x) < 0.5,
  'the local coordinate converter should agree with distance sampling for east-west movement');

const north = api.localPoint([-71.0589, 42.361], [-71.0589, 42.36], 7, 7);
assert.ok(north.z < 0, 'northward movement should map to negative Three.js local z');
assert.equal(north.y, 0);

console.log('Rail geometry and terrain-anchor tests passed.');
