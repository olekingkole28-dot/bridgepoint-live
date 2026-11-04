import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [sensor, map, app, workflow] = await Promise.all([
  read('../release-v2300/world-v2300-sensor-layers.js'),
  read('../release-v2300/world-v2300-map.js'),
  read('../rebuild-v5000/app.js'),
  read('../.github/workflows/deploy-intelligence-rebuild-v5000.yml')
]);
assert.ok(sensor.includes("function waitForBathymetry(point,timeout=6500)"), 'dive must wait for a source-backed bathymetry sample');
assert.ok(sensor.includes("function waitForDepthSource(timeout=10000)"), 'dive must wait for the GEBCO raster and terrain sources to attach after a projection change');
assert.ok(sensor.includes("calculateCameraOptionsFromCameraLngLatAltRotation?.(point,targetAltitude,saved.bearing,58)"), 'dive must calculate a MapLibre view from a real below-sea-level camera location');
assert.ok(sensor.includes("map.easeTo(targetView)"), 'dive must apply the calculated camera position through supported map view options');
assert.ok(sensor.includes("const targetView={center:[Number(cameraOptions.center.lng),Number(cameraOptions.center.lat)]"), 'calculated center coordinates must be normalized into MapLibre LngLatLike arrays');
assert.ok(sensor.includes("cameraAltitudeMeters:targetAltitude") && sensor.includes("verifiedBed:true"), 'dive diagnostics must report the requested camera altitude and verified GEBCO seabed');
assert.ok(sensor.includes("actualBed>-4"), 'dive must verify that the settled view remains over source-backed underwater terrain');
assert.ok(!sensor.includes("getFreeCameraOptions") && !sensor.includes("setFreeCameraOptions"), 'dive must not call unavailable free-camera methods on the deployed map wrapper');
assert.ok(sensor.includes("bp-underwater-fx-v6224") && sensor.includes("function drawDiveParticles"), 'underwater caustics, surface window and marine-snow effects must mount only for dive mode');
assert.ok(sensor.includes("void setDive(false).then(()=>setSurface(false))"), 'depth must remain loaded until the surface camera has been restored');
assert.ok(sensor.includes("Previous camera position and map projection restored."), 'surface return must restore the saved camera and projection');
assert.ok(workflow.includes("world-v2300-sensor-layers.js?v=6224-underwater-dive-camera"), 'both deployed entrypoints must load the new dive module cache version');
assert.ok(workflow.includes("node tests/underwater-dive-camera.test.mjs"), 'the production build must run the underwater regression test');
assert.ok(!sensor.includes("zoom:Math.max(3.5,Math.min(8.5"), 'the old fallback zoom-out behavior must stay removed');
assert.ok(map.includes("const underwaterDiveActive=window.__BP_UNDERWATER_DIVE_ACTIVE__===true||window.__BP_UNDERWATER_DIVE_TRANSITION__===true"), 'the always-on satellite raster guard must recognize the underwater interval');
assert.ok(map.includes("(blenderWorldEnabled||underwaterDiveActive)?'none':'visible'"), 'base satellite imagery must be suppressed only during the underwater interval');
assert.ok(map.includes("bp-spectral-imagery-raster-v5931") && map.includes("BP_UNDERWATER_SPECTRAL_LAYER_VISIBILITY__"), 'a user-loaded Landsat overlay must be hidden temporarily and restored to its prior visibility');
assert.ok(app.includes("const underwaterDiveActive=window.__BP_UNDERWATER_DIVE_ACTIVE__===true||window.__BP_UNDERWATER_DIVE_TRANSITION__===true"), 'the app startup globe callback must respect the underwater interval');
assert.ok(app.includes("if(!underwaterDiveActive&&projection!=='globe'&&appMap.getZoom()<7.5)"), 'the app startup callback must not switch Mercator back to globe while diving');
console.log('BRIDGEPOINT_UNDERWATER_DIVE_CAMERA_TEST_PASS');
