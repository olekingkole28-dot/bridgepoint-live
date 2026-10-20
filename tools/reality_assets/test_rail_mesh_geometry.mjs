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

// Reproduce the important browser fallback: the existing gta-rail style layer has
// rendered real line geometry, even if querySourceFeatures returns no rail tiles at
// that instant. The materializer must capture and use that geometry, never invent a route.
const renderedRail = {
  id: 144,
  type: 'Feature',
  source: 'ofm',
  sourceLayer: 'transportation',
  geometry: { type: 'LineString', coordinates: [[-71.08, 42.34], [-71.07, 42.35], [-71.06, 42.36]] },
  properties: { class: 'primary', subclass: 'road' }
};
const railLayers = [
  { id: 'gta-rail', type: 'line', source: 'ofm', 'source-layer': 'transportation', layout: { visibility: 'none' } },
  { id: 'gta-rail-ballast', type: 'line', source: 'ofm', 'source-layer': 'transportation', layout: { visibility: 'visible' } },
  { id: 'gta-rail-ties', type: 'line', source: 'ofm', 'source-layer': 'transportation', layout: { visibility: 'visible' } },
  { id: 'gta-rail-steel', type: 'line', source: 'ofm', 'source-layer': 'transportation', layout: { visibility: 'visible' } }
];
const fakeMap = {
  getContainer: () => ({ id: 'test-map' }),
  getSource: id => id === 'ofm' ? {} : null,
  getStyle: () => ({ layers: railLayers }),
  getLayer: id => railLayers.find(layer => layer.id === id) || null,
  getLayoutProperty: (id, key) => railLayers.find(layer => layer.id === id)?.layout?.[key],
  querySourceFeatures: () => [],
  // The base gta-rail style is hidden. The visible detail layers carry the railway filter.
  queryRenderedFeatures: query => query?.layers?.some(id =>
    ['gta-rail-ballast', 'gta-rail-ties', 'gta-rail-steel'].includes(id)) ? [renderedRail] : []
};
const railState = { cachedRailFeatures: [] };
const tracks = api.sourceRailFeatures(fakeMap, railState);
assert.equal(tracks.length, 1, 'style-rendered railway geometry should be captured when source query is empty');
assert.equal(railState.cachedRailFeatures.length, 1, 'captured line geometry should be cached for the mesh build');
assert.equal(tracks[0].coordinates.length, 3);
assert.equal(railState.railSourceDiagnostics.lineFeatureCount, 1);
assert.equal(railState.railSourceDiagnostics.cachedRenderedRailFeatures, 1);
assert.ok(railState.railSourceDiagnostics.capturedRailLayerIds.includes('gta-rail-ballast'),
  'visible GTA rail-detail layer should be the source of captured track geometry when base gta-rail is hidden');
assert.equal(railState.railSourceDiagnostics.sample[0].class, 'primary',
  'a line returned by the explicit gta-rail style is trusted even if tile tags vary');
const emptyMap = {
  ...fakeMap,
  queryRenderedFeatures: () => [],
  querySourceFeatures: () => []
};
const emptyTracks = api.sourceRailFeatures(emptyMap, { cachedRailFeatures: [] });
assert.equal(emptyTracks.length, 0, 'no rail geometry must remain empty rather than synthesize tracks');

console.log('Rail geometry, terrain anchors, and rendered-source fallback tests passed.');
