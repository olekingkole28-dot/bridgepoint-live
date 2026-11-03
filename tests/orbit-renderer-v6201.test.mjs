import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [renderer, motion, index, appIndex] = await Promise.all([
  readFile(new URL('../rebuild-v5000/bridgepoint-orbit-renderer-v6201.js', import.meta.url), 'utf8'),
  readFile(new URL('../rebuild-v5000/bridgepoint-global-motion-v5926.js', import.meta.url), 'utf8'),
  readFile(new URL('../rebuild-v5000/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../rebuild-v5000/app-index.html', import.meta.url), 'utf8'),
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
assert.match(renderer, /function ensureDotMeshes\(capacity\)/);
assert.match(renderer, /new T\.SphereGeometry\(1,12,8\)/);
assert.match(renderer, /new T\.InstancedMesh\(dotGeometry,dotHaloMaterial/);
assert.match(renderer, /new T\.InstancedMesh\(dotGeometry,dotCoreMaterial/);
assert.match(renderer, /function pickAtPoint\(point,maxPixels=16\)/);
assert.match(renderer, /MAX_ORBIT_AGE_MS=45\*86400000/);
for (const kind of ['station','crew','rocket','debris','cubesat','probe','navigation','earth','communications','satellite']) {
  assert.ok(renderer.includes(kind), '3D object class missing: '+kind);
}

assert.match(motion, /bridgepoint-orbit-renderer-v6201\.js\?v=6203-3d-orbit-markers-popup-global-zoom/);
assert.match(motion, /function setOrbitZoomRange\(enabled\)/);
assert.match(motion, /map\.setMinZoom\(0\)/);
assert.match(motion, /orbitRendererApi\.pickAtPoint\(event\.point,18\)/);
assert.match(motion, /function showSatelliteInfoCard\(hit,event\)/);
assert.match(motion, /new window\.maplibregl\.Popup/);
assert.match(motion, /version:6203/);
assert.doesNotMatch(motion, /bp-v5926-satellite-points/);
assert.match(index, /bridgepoint-global-motion-v5926\.js\?v=6203-3d-orbit-markers-popup-global-zoom/);
assert.match(appIndex, /bridgepoint-global-motion-v5926\.js\?v=6203-3d-orbit-markers-popup-global-zoom/);
assert.match(motion, /async function loadAllSatellitePages/);
assert.match(motion, /await loadAllSatellitePages\(true\)/);
assert.match(motion, /api\.buildPaths\(state\.catalog,state\.satApi\)/);
assert.match(motion, /orbit_heading:g\.heading/);
assert.match(motion, /state\.orbitAutoEnabledOnce=true/);
assert.match(motion, /setInterval\(\(\)=>\{if\(!state\.satelliteEnabled\|\|document\.hidden\)return;try\{propagateCatalog\(\)\}/);

console.log('BridgePoint Orbit & Motion v6203 3D markers, picking, and globe-zoom source checks passed.');
