import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  featureCoordinate,
  hasLoadedStyle,
  isDarkAt,
  solarAltitude,
  streetlightHeight,
  uniqueStreetlightFeatures
} from '../streetlights-v1/world-v2300-streetlights-3d-v1.js';

const source = await readFile(
  new URL('../streetlights-v1/world-v2300-streetlights-3d-v1.js', import.meta.url),
  'utf8'
);

const pendingOptionalSourcesMap = {
  style: { _loaded: true },
  isStyleLoaded: () => false,
  getStyle: () => ({ version: 8, sources: {}, layers: [{ id: 'background', type: 'background' }] })
};
assert.equal(hasLoadedStyle(pendingOptionalSourcesMap), true,
  'streetlight layers must attach once the style JSON is ready even when unrelated optional tiles keep isStyleLoaded false');
assert.equal(hasLoadedStyle({
  style: { _loaded: false },
  isStyleLoaded: () => false,
  getStyle: () => ({ version: 8, sources: {}, layers: [{ id: 'background', type: 'background' }] })
}), false, 'a style still being parsed must not accept source/layer changes');
assert.equal(hasLoadedStyle({ getStyle: () => null }), false,
  'missing style JSON must defer streetlight installation');

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
  { height: 8.0, measured: false, field: 'visual-fallback' },
  'missing source height must use a clearly labelled, conservative 8 m visual estimate');

assert.equal(uniqueStreetlightFeatures([point, point]).length, 1,
  'duplicate vector-tile records must not create duplicate physical fixtures');
assert.ok(source.includes("const MIN_ZOOM = 13;"),
  'streetlights must start rendering at the telephone-pole zoom threshold');
assert.ok(source.includes("const PRECISE_MIN_ZOOM = 16;"),
  'streetlights must switch to close-zoom precision batches at the telephone-pole threshold');
assert.ok(source.includes("map.transform.getMatrixForModel"),
  'models must anchor through BridgePoint’s globe-aware geographic transform');
assert.ok(source.includes("map.querySourceFeatures(SOURCE_ID, { sourceLayer: 'infrastructure' })"),
  'streetlights must use Overture source-mapped vector-tile locations rather than generated placements');
assert.ok(source.includes("sourceLayer: 'infrastructure'") &&
  source.includes("String(properties.class || '').toLowerCase() === 'street_lamp'"),
  'the renderer must filter real street_lamp features from Overture infrastructure tiles');
assert.ok(source.includes("const PMTILES_LIBRARY_URL = '/vendor/pmtiles.js'") &&
  source.includes('new pmtiles.Protocol()') &&
  source.includes('maplibre.addProtocol(PMTILES_SCHEME, protocol.tile)') &&
  source.includes('window.__BP_TRANSPORTATION_PMTILES_PROTOCOL__') &&
  source.includes('window.__BP_UTILITY_PMTILES_PROTOCOL__'),
  'the renderer must reuse BridgePoint’s shared, same-origin PMTiles runtime before adding the global vector source');
assert.ok(!source.includes('esm.sh/pmtiles'), 'streetlights must not depend on a separate PMTiles CDN request');
assert.ok(source.includes('2026-10-21.0/base.pmtiles') && source.includes('url: OVERTURE_BASE_PMTILES'),
  'the source must use Overture global Base Infrastructure data');
assert.ok(source.includes("['==', ['get', 'class'], 'street_lamp']"),
  'only street-lamp assets may trigger the 3D layer');
assert.ok(source.includes('isDarkAt(date, entry.coordinate)'),
  'illumination must be evaluated at each fixture coordinate');
assert.ok(source.includes('customLayer.camera.projectionMatrix.copy(projection).multiply(anchorMatrix)'),
  'close-zoom models must render inside a local geographic anchor frame');
assert.ok(source.includes("customLayer.camera = new THREE.Camera();"),
  'custom layer must have a camera before rendering');
assert.ok(source.includes("setInterval(() => updateNightAll(new Date()), 60000)"),
  'local day/night state must refresh automatically once per minute');
assert.ok(source.includes('hasLoadedStyle(map)'), 'style readiness must not wait for unrelated optional source tiles');
assert.ok(source.includes('await ensurePmtilesProtocol()'), 'PMTiles protocol must be registered before source installation');
assert.ok(!source.includes("map.isStyleLoaded?.()"), 'the streetlight initializer must not block on unrelated tile loading');
assert.ok(!source.includes("map.on('idle', onMapChange)"),
  'renderer must not create an idle-triggered repaint loop');

assert.ok(source.includes("if (part === 'shaft') scale = [1, height, 1];"),
  'streetlight poles must use metre-scaled pole dimensions rather than a compressed 9% width');
assert.ok(source.includes('opacity: 0,') && source.includes('blending: THREE.NormalBlending'),
  'the nighttime beam must not obscure the pole and lamp head');
assert.ok(source.includes('height * 0.06') && source.includes('[1.25, 1, 1.25]'),
  'local night illumination must stay close to the fixture and ground');
assert.ok(source.includes('return angle === null ? 90 : normalizeDegrees(angle)'),
  'unoriented fixtures must use a clear default cantilever direction in north-up views');
assert.ok(source.includes('new THREE.BoxGeometry(0.86, 0.045, 0.28)'),
  'the lamp head lens must be clearly modelled at close zoom');
assert.ok(source.includes('new THREE.Vector3(1.86, 0.095, 0)') &&
  source.includes('TubeGeometry(armCurve, 22, 0.045'),
  'the curved lamp arm must extend far enough to distinguish the fixture silhouette');

console.log('BRIDGEPOINT_GLOBAL_STREETLIGHTS_3D_V1_TEST_PASS');
