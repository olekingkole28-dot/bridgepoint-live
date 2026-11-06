import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lighthouseRenderModeForZoom, parseLengthMetres, normalizeLighthouseElement, lighthouseSnapshotRowToElement } from '../patches/lighthouse-v3/bridgepoint-lighthouses-v1.js';

const sourcePath = fileURLToPath(new URL('../patches/lighthouse-v3/bridgepoint-lighthouses-v1.js', import.meta.url));
const source = fs.readFileSync(sourcePath, 'utf8');

// MapLibre's addImage accepts ImageData, not an HTMLCanvasElement.
assert.match(source, /function createBeaconImageData\(\)\s*\{/);
assert.match(source, /return ctx\.getImageData\(0, 0, 96, 96\);/);
assert.match(source, /map\.addImage\(BEACON_IMAGE_ID, imageData, \{ pixelRatio: 2 \}\);/);
assert.doesNotMatch(source, /map\.addImage\(BEACON_IMAGE_ID, canvas,/);
assert.match(source, /const VERSION = 4;/);
assert.match(source, /LIGHTHOUSE_SNAPSHOT_URL = '\/data\/bridgepoint-lighthouses-global-v1\.json'/);
assert.match(source, /fetch\(LIGHTHOUSE_SNAPSHOT_URL/);


// Verify the global static snapshot normalizes OSM-derived coordinates,
// mapped heights and light characters into the same renderer feature format.
const snapshotElement = lighthouseSnapshotRowToElement({
  name: 'Saybrook Breakwater Light',
  country: 'United States',
  region: 'Connecticut',
  kind: 'light_major',
  height: '28',
  char: 'Fl white 6s 8M',
  lat: 41.2633,
  lon: -72.3428,
  osm_id: 'way/987654'
}, 0);
assert.ok(snapshotElement);
assert.equal(snapshotElement.type, 'way');
assert.equal(snapshotElement.id, '987654');
assert.equal(snapshotElement.tags['seamark:type'], 'light_major');
assert.equal(snapshotElement.tags['seamark:light:period'], '6');
assert.equal(snapshotElement.tags['seamark:light:colour'], 'white');
const snapshotFeature = normalizeLighthouseElement(snapshotElement);
assert.equal(snapshotFeature.properties.heightM, 28);
assert.equal(snapshotFeature.properties.measuredHeight, true);
assert.equal(snapshotFeature.properties.country, 'United States');
assert.equal(snapshotFeature.properties.region, 'Connecticut');
assert.equal(snapshotFeature.geometry.coordinates[0], -72.3428);
assert.equal(snapshotFeature.geometry.coordinates[1], 41.2633);
assert.equal(lighthouseSnapshotRowToElement({ lat: 91, lon: 0, kind: 'lighthouse' }), null);

// Preserve the requested zoom handoff: rotating beacons at regional scale,
// full 3D lighthouse towers from close zoom onward.
assert.equal(lighthouseRenderModeForZoom(3.7), 'hidden');
assert.equal(lighthouseRenderModeForZoom(3.8), 'rotating-beacon');
assert.equal(lighthouseRenderModeForZoom(13.9), 'rotating-beacon');
assert.equal(lighthouseRenderModeForZoom(14.2), '3d-tower');

// Keep accurate source dimensions when OSM tags exist and a complete tower
// geometry (solid body, glass chamber, gallery railings, roof) as fallback.
const feature = normalizeLighthouseElement({
  type: 'way', id: 987654, center: { lat: 41.26, lon: -72.34 },
  tags: { man_made: 'lighthouse', height: '31 m', colour: 'white;red' }
});
assert.equal(feature.properties.heightM, 31);
assert.equal(feature.properties.measuredHeight, true);
assert.match(source, /new THREE\.CylinderGeometry\(bodyTop, bodyBottom, bodyHeight, 24, steps, false\)/);
assert.match(source, /new THREE\.InstancedMesh/);
assert.match(source, /depthWrite: false/);
assert.match(source, /map\.queryTerrainElevation\(coordinate/);

assert.equal(parseLengthMetres('30 m'), 30);
console.log('BRIDGEPOINT_LIGHTHOUSE_HOTFIX_V3_TEST_PASS');
