import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [sensor, map, app, workflow, water, key] = await Promise.all([
  read('../release-v2300/world-v2300-sensor-layers.js'),
  read('../release-v2300/world-v2300-map.js'),
  read('../rebuild-v5000/app.js'),
  read('../.github/workflows/deploy-intelligence-rebuild-v5000.yml'),
  read('../release-v2300/world-v2300-water.js'),
  read('../rebuild-v5000/bridgepoint-map-key-v5920.js')
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
assert.ok(sensor.includes("async function toggleLiquid()") && sensor.includes("bLiquid.addEventListener('click',()=>void toggleLiquid())"), 'one liquid-ocean button must own the on / dive / return / off cycle');
assert.ok(sensor.includes('data-liquid') && !sensor.includes('data-d aria-pressed') && !sensor.includes('data-v aria-pressed'), 'the two separate legacy ocean controls must be removed from the UI');
assert.ok(sensor.includes("await window.__BP_TOGGLE_WATER__()") && sensor.includes("liquidWaterOwned"), 'the new control must activate the existing GPU water engine without double-owning an already active layer');
assert.ok(sensor.includes("map.setCenterClampedToGround?.(false)") && sensor.includes("map.setMaxPitch?.(110)"), 'liquid mode must unlock the underwater camera path');
assert.ok(sensor.includes("var(--bp-dive-depth") && sensor.includes("function drawDiveParticles"), 'underwater mode must apply depth-dependent blue-green fog and rising bubbles');
assert.ok(sensor.includes("Previous camera position and map projection restored."), 'surface return must restore the saved camera and projection');
assert.ok(workflow.includes("world-v2300-sensor-layers.js?v=6256-gerstner-liquid-ocean"), 'the production build must publish the unified liquid-ocean sensor module');
assert.ok(app.includes("world-v2300-sensor-layers.js?v=6256-gerstner-liquid-ocean"), 'the app shell must load the current liquid-ocean and Gerstner sensor module');
assert.ok(workflow.includes("node tests/underwater-dive-camera.test.mjs"), 'the production build must run the underwater regression test');
assert.ok(!sensor.includes("zoom:Math.max(3.5,Math.min(8.5"), 'the old fallback zoom-out behavior must stay removed');
assert.ok(map.includes("function isUnderwaterDiveActive(){return window.__BP_UNDERWATER_DIVE_ACTIVE__===true||window.__BP_UNDERWATER_DIVE_TRANSITION__===true}"), 'satellite recovery must share the underwater-state check');
assert.ok(map.includes("function setBase(next){if(isUnderwaterDiveActive()){keepSatelliteRasterLayersVisible('setBase-underwater-lock');return}base='satellite';"), 'base-map recovery must not turn satellite rasters back on during a dive');
assert.ok(map.includes("if(isUnderwaterDiveActive()){keepSatelliteRasterLayersVisible('style.load-underwater-lock');return}"), 'style reload recovery must keep the same satellite underlay while the underwater state is active');
assert.ok(map.includes("const underwaterDiveActive=isUnderwaterDiveActive();"), 'the persistent raster guard must use the same underwater-state check');
assert.ok(map.includes("const targetVisibility=blenderWorldEnabled?'none':'visible'") && map.includes("const effectiveVisibility=targetVisibility"), 'satellite imagery must remain visible and draped over bathymetric terrain during underwater exploration');
assert.ok(map.includes("BP_SATELLITE_RASTER_VISIBILITY_GUARD_V6217__") && map.includes("underwaterDiveActive"), 'existing satellite visibility diagnostics must remain API-compatible and expose underwater state');
assert.ok(map.includes("bp-spectral-imagery-raster-v5931") && map.includes("BP_UNDERWATER_SPECTRAL_LAYER_VISIBILITY__"), 'a user-loaded Landsat overlay must be hidden temporarily and restored to its prior visibility');
assert.ok(app.includes("const underwaterDiveActive=window.__BP_UNDERWATER_DIVE_ACTIVE__===true||window.__BP_UNDERWATER_DIVE_TRANSITION__===true"), 'the app startup globe callback must respect the underwater interval');
assert.ok(app.includes("if(!underwaterDiveActive&&projection!=='globe'&&appMap.getZoom()<7.5)"), 'the app startup callback must not switch Mercator back to globe while diving');
console.log('BRIDGEPOINT_UNDERWATER_DIVE_CAMERA_TEST_PASS');

assert.ok(water.includes("float globalSwell =") && water.includes("gl_Position = projectTileFor3D(displacedPosition, a_height + offsetM)"), 'the GPU water renderer must combine continuous wave animation with horizontal Gerstner vertex displacement');
assert.ok(water.includes("function marineFeature(feature)") && water.includes("\\b(ocean|sea|bay|gulf|strait|sound|estuary|open water)\\b"), 'open-ocean polygons must be eligible for the global liquid surface');
assert.ok(water.includes("waveModel: 'three-component-gerstner-vertex-displacement'"), 'the renderer diagnostic must identify the Gerstner surface model');
assert.ok(key.includes("Subsurface + Ocean-Depth X-Ray") && key.includes("Liquid ocean + underwater exploration"), 'the map key must preserve the Subsurface X-Ray entry alongside Liquid Ocean');
console.log('BRIDGEPOINT_LIQUID_OCEAN_MODE_PASS');
