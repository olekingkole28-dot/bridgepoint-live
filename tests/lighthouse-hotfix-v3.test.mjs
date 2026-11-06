import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lighthouseRenderModeForZoom, parseLengthMetres, normalizeLighthouseElement } from '../patches/lighthouse-v3/bridgepoint-lighthouses-v1.js';

const sourcePath = fileURLToPath(new URL('../patches/lighthouse-v3/bridgepoint-lighthouses-v1.js', import.meta.url));
const source = fs.readFileSync(sourcePath, 'utf8');

// MapLibre's addImage accepts ImageData, not an HTMLCanvasElement.
assert.match(source, /function createBeaconImageData\(\)\s*\{/);
assert.match(source, /return ctx\.getImageData\(0, 0, 96, 96\);/);
assert.match(source, /map\.addImage\(BEACON_IMAGE_ID, imageData, \{ pixelRatio: 2 \}\);/);
assert.doesNotMatch(source, /map\.addImage\(BEACON_IMAGE_ID, canvas,/);
assert.match(source, /const VERSION = 3;/);

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
