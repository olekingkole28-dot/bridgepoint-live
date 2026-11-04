import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [sensor, map, workflow] = await Promise.all([
  read('../release-v2300/world-v2300-sensor-layers.js'),
  read('../release-v2300/world-v2300-map.js'),
  read('../.github/workflows/deploy-intelligence-rebuild-v5000.yml')
]);
assert.ok(sensor.includes("function waitForBathymetry(point,timeout=6500)"), 'dive must wait for a source-backed bathymetry sample');
assert.ok(sensor.includes("calculateCameraOptionsFromCameraLngLatAltRotation"), 'dive must set the camera using a real below-sea-level altitude');
assert.ok(sensor.includes("if(!Number.isFinite(altitude)||altitude>=-.5)throw new Error"), 'dive must verify the actual camera altitude is below sea level');
assert.ok(sensor.includes("verifiedBed:true"), 'the active dive diagnostic must record a verified GEBCO bed sample');
assert.ok(sensor.includes("bp-underwater-fx-v6224") && sensor.includes("function drawDiveParticles"), 'underwater caustics, surface window and marine-snow effects must mount only for dive mode');
assert.ok(sensor.includes("if(saved&&!saved.surfaceWasOn)setSurface(false)"), 'depth layers must be removed only after returning to the surface');
assert.ok(sensor.includes("Previous camera position and map projection restored."), 'surface return must restore the saved camera and projection');
assert.ok(map.includes("window.__BP_UNDERWATER_DIVE_TRANSITION__===true"), 'terrain ground guard must yield only during the camera transition');
assert.ok(workflow.includes("world-v2300-sensor-layers.js?v=6224-underwater-dive-camera"), 'both deployed entrypoints must load the new dive module cache version');
assert.ok(workflow.includes("node tests/underwater-dive-camera.test.mjs"), 'the production build must run the underwater regression test');
assert.ok(!sensor.includes("zoom:Math.max(3.5,Math.min(8.5"), 'the old fallback zoom-out behavior must stay removed');
console.log('BRIDGEPOINT_UNDERWATER_DIVE_CAMERA_TEST_PASS');
