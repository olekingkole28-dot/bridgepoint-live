import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  featureCoordinate,
  isDarkAt,
  solarAltitude,
  streetlightHeight,
  uniqueStreetlightFeatures
} from '../streetlights-v1/world-v2300-streetlights-3d-v1.js';

const source = await readFile(
  new URL('../streetlights-v1/world-v2300-streetlights-3d-v1.js', import.meta.url),
  'utf8'
);

const solsticeNoon = new Date('2026-06-21T12:00:00.000Z');
const solsticeMidnight = new Date('2026-06-21T00:00:00.000Z');
assert.ok(solarAltitude(solsticeNoon, 0, 0) > 60,
  'solar altitude at Greenwich on solstice noon must be daytime');
assert.ok(solarAltitude(solsticeMidnight, 0, 0) < -60,
  'solar altitude at Greenwich on solstice midnight must be night');
assert.equal(isDarkAt(solsticeMidnight, [0, 0]), true,
  'local night must turn on streetlight illumination');
assert.equal(isDarkAt(solsticeMidnight, [180, 0]), false,
  'local daylight must remain unlit at the same UTC instant');
assert.ok(solarAltitude(solsticeNoon, 0, 0) > solarAltitude(solsticeNoon, 0, -60),
  'solar altitude must vary with geographic latitude');

const point = {
  id: 42, type: 'Feature', geometry: { type: 'Point', coordinates: [-72.65, 41.56] },
  properties: { osm_id: 42 }
};
assert.deepEqual(featureCoordinate(point), [-72.65, 41.56],
  'point coordinates must be preserved exactly');
const footprint = {
  type: 'Feature', geometry: { type: 'Polygon', coordinates: [[
    [-72.6501, 41.5599], [-72.6499, 41.5599], [-72.6499, 41.5601],
    [-72.6501, 41.5601], [-72.6501, 41.5599]
  ]] }, properties: {}
};
const center = featureCoordinate(footprint);
assert.ok(Math.abs(center[0] + 72.65) < 1e-7 && Math.abs(center[1] - 41.56) < 1e-7,
  'polygon footprint must resolve to its geographic center without random offsets');

assert.deepEqual(streetlightHeight({ render_height_m: '9.4' }),
  { height: 9.4, measured: true, field: 'render_height_m' });
assert.equal(streetlightHeight({ height: '30 ft' }).height, 9.144,
  'feet-tagged mast height must be converted to metres');
assert.deepEqual(streetlightHeight({}),
  { height: 6.5, measured: false, field: 'visual-fallback' },
  'missing source height must use the same conservative 6.5 m fallback as the existing mapped streetlight layer');

assert.equal(uniqueStreetlightFeatures([point, point]).length, 1,
  'duplicate vector-tile records must not create duplicate physical fixtures');
assert.ok(source.includes("const MIN_ZOOM = 13;"),
  'streetlights must start rendering at the telephone-pole zoom threshold');
assert.ok(source.includes("const PRECISE_MIN_ZOOM = 16;"),
  'streetlights must switch to close-zoom precision batches at the telephone-pole threshold');
assert.ok(source.includes("map.transform.getMatrixForModel"),
  'models must anchor through BridgePoint’s globe-aware geographic transform');
assert.ok(source.includes("map.querySourceFeatures(SOURCE_ID, { sourceLayer: layer })"),
  'streetlights must use source-mapped vector-tile locations rather than generated placements');
assert.ok(source.includes("sourceLayer: 'streetlight_poles'") &&
  source.includes("sourceLayer: 'streetlight_lamps'"),
  'the renderer must consume both mapped base and luminaire layers');
assert.ok(source.includes('isDarkAt(date, entry.coordinate)'),
  'illumination must be evaluated at each fixture coordinate');
assert.ok(source.includes('customLayer.camera.projectionMatrix.copy(projection).multiply(anchorMatrix)'),
  'close-zoom models must render inside a local geographic anchor frame');
assert.ok(source.includes("customLayer.camera = new THREE.Camera();"),
  'custom layer must have a camera before rendering');
assert.ok(source.includes("setInterval(() => updateNightAll(new Date()), 60000)"),
  'local day/night state must refresh automatically once per minute');
assert.ok(!source.includes("map.on('idle', onMapChange)"),
  'renderer must not create an idle-triggered repaint loop');

console.log('BRIDGEPOINT_GLOBAL_STREETLIGHTS_3D_V1_TEST_PASS');
