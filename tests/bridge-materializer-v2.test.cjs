const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const world = fs.readFileSync(path.join(root, 'release-v2300/world-v2300-map.js'), 'utf8');
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'rebuild-v5000/bridgepoint-ct-nbi-2026.json'), 'utf8'));
const landing = fs.readFileSync(path.join(root, 'rebuild-v5000/index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'rebuild-v5000/app-index.html'), 'utf8');

function sourceSlice(start, end) {
  const a = world.indexOf(start);
  assert.notEqual(a, -1, 'missing source function: ' + start);
  const b = world.indexOf(end, a);
  assert.notEqual(b, -1, 'missing source boundary: ' + end);
  return world.slice(a, b);
}

test('bridge refresh reads the vector source, not a 2D layer that the renderer hides', () => {
  const fn = sourceSlice('function bridgeSourceFeatures()', 'function setBridge2DVisible');
  assert.match(fn, /querySourceFeatures\?\.\('ofm'/);
  assert.match(fn, /sourceLayer:'transportation'/);
  assert.doesNotMatch(fn, /queryRenderedFeatures/);
});

test('source Polygon and MultiPolygon bridge outlines are materialized as native 3D deck and surface features', () => {
  assert.match(world, /g\.type!=='Polygon'&&g\.type!=='MultiPolygon'/);
  assert.match(world, /bridgePolygonAxis\(polygon\)/);
  assert.match(world, /geometry:\{type:'Polygon',coordinates:polygon\}/);
  assert.match(world, /part:'bridge_deck'/);
  assert.match(world, /part:'bridge_surface'/);
});

test('bridge centerlines covered by a source polygon do not create a second overlapping deck', () => {
  assert.match(world, /bridgeLineCoveredByPolygons\(line,polygonRecords\.map\(r=>r\.polygon\)\)/);
  assert.match(world, /coveredCenterlines/);
});

test('source-backed FHWA measurements are loaded only for Connecticut viewports and converted from feet to metres', () => {
  assert.equal(inventory.length, 4352);
  assert.ok(inventory.every(r => Array.isArray(r) && r.length === 8));
  assert.ok(inventory.every(r => Number.isFinite(r[1]) && r[1] >= 40.8 && r[1] <= 42.1));
  assert.ok(inventory.every(r => Number.isFinite(r[2]) && r[2] >= -74 && r[2] <= -71.7));
  assert.match(world, /\/bridgepoint-ct-nbi-2026\.json\?v=2026/);
  assert.match(world, /feetToM=v=>/);
  assert.match(world, /FHWA_NBI_2026_CT/);
  assert.match(world, /measured_max_span_m/);
  assert.match(world, /measured_max_height_m/);
});

test('standard railing display geometry is present but truth-labelled as an estimate', () => {
  assert.match(world, /function addRailPair/);
  assert.match(world, /ESTIMATED_STANDARD_PROFILE/);
  assert.match(world, /STANDARD_PROFILE_ESTIMATE_NOT_ENGINEERING_SURVEY/);
  assert.match(world, /\['no','none','false','0'\]\.includes\(state\)/);
});

test('piers are generated from mapped polygon axes or bridge centerlines and are labelled as display geometry', () => {
  assert.match(world, /function addPiers/);
  assert.match(world, /bridgePolygonAxis\(polygon\)/);
  assert.match(world, /CENTERLINE_DERIVED_VISUAL_SUPPORT_NOT_ENGINEERING_SURVEY/);
  assert.match(world, /FHWA_MAX_SPAN_SPACING_DISPLAY_ESTIMATE/);
});

test('a not-yet-loaded transportation source preserves the last good bridge mesh instead of caching an empty viewport', () => {
  assert.match(world, /waiting-for-transportation-source/);
  assert.match(world, /preservedLastGood:true/);
  assert.match(world, /source-loaded-no-bridge-records/);
  assert.doesNotMatch(world, /CACHE_TTL_MS\s*=\s*6\s*\*\s*60\s*\*\s*60/);
});

test('the obsolete competing Three.js bridge script is no longer loaded by either product entry', () => {
  assert.doesNotMatch(landing, /bridgepoint-global-bridges-v1\.js/);
  assert.doesNotMatch(app, /bridgepoint-global-bridges-v1\.js/);
});

test('the production polygon-axis helper measures a rectangular source outline in metres', () => {
  const axisCode = sourceSlice('function bridgePolygonAxis(', 'function bridgePointInRing');
  const context = { Math, Number, Array, metersLon: lat => 111320 * Math.max(.12, Math.cos(lat * Math.PI / 180)) };
  vm.runInNewContext(axisCode + '\nthis.axis = bridgePolygonAxis;', context);
  const ring = [
    [-71.0004, 41.9999], [-70.9996, 41.9999],
    [-70.9996, 42.0001], [-71.0004, 42.0001],
    [-71.0004, 41.9999]
  ];
  const result = context.axis([ring]);
  assert.ok(result, 'axis should resolve for a valid polygon');
  assert.ok(result.lengthM > 60 && result.lengthM < 75, 'expected about 66 m length, got ' + result.lengthM);
  assert.ok(result.widthM > 20 && result.widthM < 24, 'expected about 22 m width, got ' + result.widthM);
  assert.ok(Math.abs(result.center[0] + 71) < 1e-6);
  assert.ok(Math.abs(result.center[1] - 42) < 1e-6);
});

test('production polygon containment helper distinguishes interior and exterior coordinates', () => {
  const pointCode = sourceSlice('function bridgePointInRing(', 'function bridgePointInPolygon');
  const context = { Math, Number, Array };
  vm.runInNewContext(pointCode + '\nthis.contains = bridgePointInRing;', context);
  const ring = [[-71,42],[-70.999,42],[-70.999,42.001],[-71,42.001],[-71,42]];
  assert.equal(context.contains([-70.9995,42.0005], ring), true);
  assert.equal(context.contains([-70.998,42.0005], ring), false);
});
