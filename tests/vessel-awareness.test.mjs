import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [moduleSource, landingHtml, appHtml, droneSource, deployWorkflow, optInWorkflow] = await Promise.all([
  read('../rebuild-v5000/bridgepoint-vessel-awareness-v1.js'),
  read('../rebuild-v5000/index.html'),
  read('../rebuild-v5000/app-index.html'),
  read('../rebuild-v5000/bridgepoint-drone-awareness-v1.js'),
  read('../.github/workflows/deploy-intelligence-rebuild-v5000.yml'),
  read('../.github/workflows/drone-awareness-checks.yml')
]);

assert.ok(moduleSource.includes('https://ais.openwaters.io/v1/vessels/tiles.json'), 'live vessel vector tiles use the public Open Waters endpoint');
assert.ok(moduleSource.includes('https://ais.openwaters.io/v1/coverage/tiles.json'), 'the receiver footprint uses the separate public coverage endpoint');
assert.ok(moduleSource.includes("type:'vector',url:TILEJSON_URL"), 'vessels load from source-backed global vector tiles');
assert.ok(moduleSource.includes("type:'vector',url:COVERAGE_TILEJSON_URL"), 'coverage loads from source-backed coverage vector tiles');
assert.ok(moduleSource.includes("sourceLayer:'vessels'"), '3D models are made from actual loaded vessel tile features');
assert.ok(moduleSource.includes("String(p.kind||'vessel')!=='vessel'"), 'aids, bases, SAR beacons and fishing gear are not mislabeled as ships');
assert.ok(moduleSource.includes('function vesselClass(type)'), 'AIS type codes are separated into ship model families');
for (const kind of ['cargo','tanker','passenger','fishing','sail','tug','highspeed','other']) {
  assert.ok(moduleSource.includes("kind==='"+kind+"'"), 'the 3D ship builder supports the '+kind+' model family');
}
assert.ok(moduleSource.includes('new THREE.InstancedMesh'), 'many source-backed ship models are rendered with instanced geometry');
assert.ok(moduleSource.includes("renderingMode:'3d'"), 'vessel models use a real MapLibre 3D custom layer');
assert.ok(moduleSource.includes('MercatorCoordinate'), 'ship placement uses the map projection at sea level');
assert.ok(moduleSource.includes('const WATERLINE_METERS=0;') && moduleSource.includes('},WATERLINE_METERS)'), 'the vessel mesh origin is anchored at the water surface');
assert.ok(moduleSource.includes('new T.ExtrudeGeometry(hullShape'), 'ship families use a tapered three-dimensional hull rather than a flat marker body');
assert.ok(moduleSource.includes('vertexColors:true') && moduleSource.includes("new T.Float32BufferAttribute(vertexColors,3)"), 'ship geometry has material-specific detail colors and shaded surfaces');
assert.ok(moduleSource.includes('targetPixels=Math.max(0,9-zoom*.9)'), 'ships remain visibly enlarged at global zoom and smoothly return to source length as the camera closes in');
assert.ok(moduleSource.includes("else if(kind==='other')"), 'the utility vessel family has its own explicit 3D model');
assert.ok(moduleSource.includes("'circle-radius':['interpolate',['linear'],['zoom'],0,3.2,4,4.4,9,5.6,14,7.2]"), 'stationary AIS dots are legible at global zoom');
assert.ok(moduleSource.includes("'icon-halo-color':'#061421','icon-halo-width':1.8"), 'moving AIS arrows have a dark contrast halo for bright global-view colors');
assert.ok(moduleSource.includes('function updateTracks(records)'), 'successive observed AIS positions form retained vessel trails');
assert.ok(moduleSource.includes('TRACK_RETENTION_MS=45*60*1000'), 'observed trail retention is bounded');
assert.ok(moduleSource.includes('age_s'), 'reported AIS age drives freshness and fading');
assert.ok(moduleSource.includes("'source-layer':'coverage'"), 'receiver coverage is drawn from the provider coverage tiles');
assert.ok(moduleSource.includes("get','days'"), 'coverage styling uses observed days in the seven-day coverage window');
assert.ok(moduleSource.includes('noApiKey:true'), 'the selected anonymous tile route needs no browser API key');
assert.ok(moduleSource.includes('noAccessToken:true'), 'the selected anonymous tile route needs no access token');
assert.ok(moduleSource.includes("const THREE_URL='/vendor/three.module.js?v=169-local'"), 'both homepage and /app/ resolve the shared root Three.js runtime');
assert.ok(!moduleSource.includes("const THREE_URL='./vendor/three.module.js?v=169-local'"), 'the vessel renderer must not request a missing /app/vendor Three.js file');
assert.ok(moduleSource.includes('commercialUseApproved:false'), 'the UI does not claim commercial use has been approved');
assert.ok(moduleSource.includes('NOT FOR NAVIGATION'), 'the vessel overlay carries a not-for-navigation safety notice');
assert.ok(!/SIMULATED|syntheticFleet|fakeVessel/i.test(moduleSource), 'no synthetic or fabricated vessel fleet is included');
assert.ok(!moduleSource.includes('apiKey') && !moduleSource.includes('API_KEY') && !moduleSource.includes('Authorization'), 'no private feed credential is embedded');
assert.ok(moduleSource.includes('map.refreshTiles') && moduleSource.includes('refreshExpiredTiles=true'), 'tile refresh uses the provider tile cadence and normal MapLibre tile expiry');
assert.ok(moduleSource.includes('window.__BP_VESSEL_AWARENESS_V1__'), 'the opt-in vessel diagnostics are exposed for visual QA');

const expectedTag = 'bridgepoint-vessel-awareness-v1.js?v=20261103-global-vessel-visibility-3d';
assert.ok(landingHtml.includes(expectedTag), 'the main globe loads the vessel module');
assert.ok(appHtml.includes(expectedTag), 'the app globe loads the vessel module');
assert.ok(landingHtml.includes('bridgepoint-drone-awareness-v1.js?v=7-aircraft-models-tracks'), 'the existing drone module remains on the main globe');
assert.ok(appHtml.includes('bridgepoint-drone-awareness-v1.js?v=7-aircraft-models-tracks'), 'the existing drone module remains in the app');
assert.ok(droneSource.includes('bp-drone-awareness-live-dots-v4'), 'existing drone runtime is still present');
assert.ok(droneSource.includes('bp-aircraft-awareness-live-dots-v1'), 'existing aircraft runtime is still present');
assert.ok(!droneSource.includes('bp-vessel-live-source-v1'), 'vessel work did not modify the existing aircraft/drone runtime');

assert.ok(deployWorkflow.includes('node --check rebuild-v5000/bridgepoint-vessel-awareness-v1.js'), 'production deployment syntax-checks the vessel runtime');
assert.ok(deployWorkflow.includes('node tests/vessel-awareness.test.mjs'), 'production deployment runs vessel contract tests');
assert.ok(deployWorkflow.includes('cp rebuild-v5000/bridgepoint-vessel-awareness-v1.js site/bridgepoint-vessel-awareness-v1.js'), 'production artifact publishes the vessel runtime');
assert.ok(optInWorkflow.includes('node --check rebuild-v5000/bridgepoint-vessel-awareness-v1.js'), 'opt-in workflow syntax-checks the vessel runtime');
assert.ok(optInWorkflow.includes('node tests/vessel-awareness.test.mjs'), 'opt-in workflow runs the vessel contract tests');
console.log('BridgePoint Vessel Awareness contract checks passed.');
