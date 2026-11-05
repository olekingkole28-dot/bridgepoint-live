const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../rebuild-v5000/bridgepoint-global-bridges-v1.js'), 'utf8');
const fakeWindow = { addEventListener() {} };
const context = { window: fakeWindow, document: {}, matchMedia: () => ({ matches: true }),
  setTimeout: () => 1, clearTimeout() {}, console, fetch: async () => { throw Error('unexpected fetch'); },
  AbortController, Date, Map, Set, Math, Number, String, Array, Object, JSON, Promise, Infinity, parseFloat };
vm.runInNewContext(source, context, { filename: 'bridgepoint-global-bridges-v1.js' });
const api = fakeWindow.__BP_GLOBAL_BRIDGES_V1_TEST__;
const ring = [
  { lon: -71.0010, lat: 42.0000 }, { lon: -71.0000, lat: 42.0000 },
  { lon: -71.0000, lat: 42.0010 }, { lon: -71.0010, lat: 42.0010 },
  { lon: -71.0010, lat: 42.0000 }
];

test('parses metric, imperial, inch and centimetre dimensions', () => {
  assert.equal(api.parseLength('12.5 m'), 12.5);
  assert.equal(api.parseLength('30 cm'), 0.3);
  assert.equal(api.parseLength('10 ft'), 3.048);
  assert.ok(Math.abs(api.parseLength("10'6\"") - 3.2004) < 1e-9);
});

test('requires measured vertical placement and never converts layer to metres', () => {
  assert.equal(api.readDeckVertical({ layer: '1', bridge: 'yes' }), null);
  assert.equal(api.readDeckVertical({ bridge: 'yes', width: '12' }), null);
  assert.equal(api.readDeckVertical({ 'bridge:height': '8 m' }).valueM, 8);
  assert.equal(api.readDeckVertical({ ele: '35.2' }).mode, 'absolute-ele');
});

test('requires mapped bridge width instead of guessing from lane count', () => {
  assert.equal(api.readDeckWidth({ lanes: '4', highway: 'primary' }), null);
  assert.equal(api.readDeckWidth({ 'bridge:width': '11.5' }), 11.5);
});

test('normalizes source bridge outlines, support locations, railings and cables', () => {
  const data = api.normalizeOverpass({ elements: [
    { type: 'way', id: 1, tags: { man_made: 'bridge', height: '8' }, geometry: ring },
    { type: 'node', id: 2, lon: -71.0005, lat: 42.0005, tags: { 'bridge:support': 'pier' } },
    { type: 'way', id: 3, tags: { barrier: 'guard_rail', height: '1.1', width: '0.08', spacing: '2' }, geometry: [ring[0], ring[1]] },
    { type: 'way', id: 4, tags: { man_made: 'cable', ele: '50', diameter: '0.08' }, geometry: [ring[1], ring[2]] }
  ] });
  assert.equal(data.decks.length, 1);
  assert.equal(data.supports.length, 1);
  assert.equal(data.barriers.length, 1);
  assert.equal(data.cables.length, 1);
});

test('does not create an unmeasured bridge deck', () => {
  const data = api.normalizeOverpass({ elements: [
    { type: 'way', id: 9, tags: { highway: 'primary', bridge: 'yes', layer: '1' }, geometry: ring }
  ] });
  assert.equal(data.decks.length, 0);
});

test('preserves bridge multipolygon holes and support footprints', () => {
  const relation = { type: 'relation', id: 10, tags: { man_made: 'bridge', 'bridge:height': '9' }, members: [
    { type: 'way', role: 'outer', geometry: ring },
    { type: 'way', role: 'inner', geometry: [
      { lon: -71.0008, lat: 42.0002 }, { lon: -71.0002, lat: 42.0002 },
      { lon: -71.0002, lat: 42.0008 }, { lon: -71.0008, lat: 42.0008 },
      { lon: -71.0008, lat: 42.0002 }
    ] }
  ] };
  const polygon = api.relationPolygon(relation);
  assert.equal(polygon.type, 'Polygon');
  assert.equal(polygon.coordinates.length, 2);
  const support = api.normalizeOverpass({ elements: [
    { type: 'way', id: 11, tags: { 'bridge:support': 'pier' }, geometry: ring }
  ] });
  assert.equal(support.supports[0].geometry.type, 'Polygon');
});

test('viewport query is bounded and asks for source-specific bridge parts', () => {
  const query = api.overpassQuery({ west: -71.1, south: 41.9, east: -71, north: 42 });
  assert.match(query, /man_made.*bridge/);
  assert.match(query, /bridge:support/);
  assert.match(query, /guard_rail/);
  assert.match(query, /man_made.*cable/);
});
