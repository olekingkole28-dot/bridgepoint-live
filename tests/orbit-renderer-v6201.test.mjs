import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [renderer, motion] = await Promise.all([
  readFile(new URL('../rebuild-v5000/bridgepoint-orbit-renderer-v6201.js', import.meta.url), 'utf8'),
  readFile(new URL('../rebuild-v5000/bridgepoint-global-motion-v5926.js', import.meta.url), 'utf8'),
]);

assert.match(renderer, /export async function createOrbitRenderer\(map\)/);
assert.match(renderer, /type:'custom',renderingMode:'3d'/);
assert.match(renderer, /defaultProjectionData\?\.mainMatrix/);
assert.match(renderer, /new T\.InstancedMesh/);
assert.match(renderer, /new T\.LineSegments/);
assert.match(renderer, /map\.transform\?\.getMatrixForModel/);
assert.match(renderer, /function modelMatrixFor\(lon,lat,altMeters\)/);
assert.match(renderer, /new T\.Vector3\(0,0,0\)\.applyMatrix4\(anchor\)/);
assert.match(renderer, /const anchor=modelMatrixFor\(lon,lat,alt\*1000\)/);
assert.match(renderer, /const current=globePosition\(point\)/);
assert.doesNotMatch(renderer, /MercatorCoordinate|fromLngLat/);
assert.match(renderer, /map\.on\('zoomend',onZoom\)/);
assert.match(renderer, /map\.on\('style\.load',onStyle\)/);
assert.match(renderer, /metersPerPixel\*meta\.minPixels/);
assert.match(renderer, /PATH_SAMPLES=96/);
assert.match(renderer, /MAX_ORBIT_AGE_MS=45\*86400000/);
for (const kind of ['station','crew','rocket','debris','cubesat','probe','navigation','earth','communications','satellite']) {
  assert.ok(renderer.includes(kind), '3D object class missing: '+kind);
}

assert.match(motion, /bridgepoint-orbit-renderer-v6201\.js\?v=6202-globe-anchored-orbits/);
assert.match(motion, /async function loadAllSatellitePages/);
assert.match(motion, /await loadAllSatellitePages\(true\)/);
assert.match(motion, /api\.buildPaths\(state\.catalog,state\.satApi\)/);
assert.match(motion, /orbit_heading:g\.heading/);
assert.match(motion, /state\.orbitAutoEnabledOnce=true/);
assert.match(motion, /setInterval\(\(\)=>\{if\(!state\.satelliteEnabled\|\|document\.hidden\)return;try\{propagateCatalog\(\)\}/);

console.log('BridgePoint Orbit & Motion v6202 globe-anchored source checks passed.');
