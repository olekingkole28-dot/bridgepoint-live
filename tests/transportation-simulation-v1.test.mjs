import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [moduleSource, loaderSource, landingHtml, appHtml, fullDeploy, rollbackWorkflow] = await Promise.all([
  read('../rebuild-v5000/bridgepoint-transportation-v1.js'),
  read('../rebuild-v5000/bridgepoint-transportation-loader-v1.js'),
  read('../rebuild-v5000/index.html'),
  read('../rebuild-v5000/app-index.html'),
  read('../.github/workflows/deploy-intelligence-rebuild-v5000.yml'),
  read('../.github/workflows/deploy-transportation-hotfix-v1.yml')
]);

const context = {
  window: { addEventListener() {} },
  document: { readyState: 'loading', addEventListener() {}, querySelector() { return null; } },
  console: { warn() {}, log() {}, error() {} },
  matchMedia: () => ({ matches: false }),
  MutationObserver: class { observe() {} disconnect() {} },
  setInterval() { return 1; },
  clearInterval() {},
  setTimeout() { return 1; },
  clearTimeout() {},
  requestAnimationFrame() { return 1; },
  cancelAnimationFrame() {},
  performance: { now: () => 1000 }
};
const window = context.window;
const document = context.document;
const bootModule = await import('node:vm');
bootModule.runInNewContext(moduleSource, context, { filename: 'bridgepoint-transportation-v1.js' });
const api = window.__BP_TRANSPORTATION_V1__;

class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.className = '';
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.parentElement = null;
    this.textContent = '';
    this.disabled = false;
    this.style = {};
    this.hidden = false;
    this.classList = { toggle() {} };
  }
  append(...nodes) { for (const node of nodes) this.appendChild(node); }
  prepend(node) { node.parentElement = this; this.children.unshift(node); }
  appendChild(node) { node.parentElement = this; this.children.push(node); return node; }
  querySelectorAll() { return []; }
  insertBefore(node, reference) {
    node.parentElement = this;
    const index = reference ? this.children.indexOf(reference) : -1;
    if (index < 0) this.children.push(node);
    else this.children.splice(index, 0, node);
    return node;
  }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  remove() {
    if (!this.parentElement) return;
    const siblings = this.parentElement.children;
    const index = siblings.indexOf(this);
    if (index >= 0) siblings.splice(index, 1);
    this.parentElement = null;
  }
  matches(selector) {
    if (selector.startsWith('.')) return this.className.split(/\s+/).includes(selector.slice(1));
    if (selector === '[data-bpv-command-section="map"]') return this.dataset.bpvCommandSection === 'map';
    return false;
  }
  querySelector(selector) {
    for (const child of this.children) {
      if (child.matches(selector)) return child;
      const nested = child.querySelector(selector);
      if (nested) return nested;
    }
    return null;
  }
}
const fakeDock = new FakeElement('div');
const requestedScripts = [];
const loaderContext = {
  window: {},
  document: {
    querySelector(selector) { return selector === '#bpv-dock-actions' ? fakeDock : fakeDock.querySelector(selector); },
    createElement(tag) { return new FakeElement(tag); },
    head: { appendChild(script) { requestedScripts.push(script); script.parentElement = this; } }
  }
};
bootModule.runInNewContext(loaderSource, loaderContext, { filename: 'bridgepoint-transportation-loader-v1.js' });
assert.equal(requestedScripts.length, 0, 'page startup does not request the 3D transportation module');
const launcher = fakeDock.querySelector('.bp-transportation-v1-launcher');
assert.ok(launcher, 'the lightweight Transportation button appears in the BridgePoint card');
const launchButton = launcher.querySelector('.bp-transportation-v1-toggle');
assert.ok(launchButton, 'Transportation is presented as a card button');
launchButton.listeners.click[0]();
assert.equal(requestedScripts.length, 1, 'pressing Transportation dynamically requests the 3D module');
assert.equal(requestedScripts[0].src, '/bridgepoint-transportation-v1.js?v=4-global-pmtiles-stable-models');
assert.equal(requestedScripts[0].async, true, 'the simulation bundle loads asynchronously after the click');
let enabledAfterLoad = false;
loaderContext.window.__BP_TRANSPORTATION_V1__ = { enable() { enabledAfterLoad = true; return true; } };
requestedScripts[0].onload();
assert.equal(enabledAfterLoad, true, 'the first button press starts the simulation after the module loads');
assert.equal(fakeDock.querySelector('.bp-transportation-v1-launcher'), null, 'the loader placeholder is replaced by the simulation controls');
assert.equal(loaderContext.window.__BP_TRANSPORTATION_LOADER_V1__.loaded, true);

assert.ok(loaderSource.includes("document.readyState === 'loading'"), 'the first click waits for DOMContentLoaded when the page is still initializing');
const lateDock = new FakeElement('div');
const lateScripts = [];
let onDomReady = null;
const lateContext = {
  window: {},
  document: {
    readyState: 'loading',
    addEventListener(type, callback) { if (type === 'DOMContentLoaded') onDomReady = callback; },
    querySelector(selector) { return selector === '#bpv-dock-actions' ? lateDock : lateDock.querySelector(selector); },
    createElement(tag) { return new FakeElement(tag); },
    head: { appendChild(script) { lateScripts.push(script); script.parentElement = this; } }
  }
};
bootModule.runInNewContext(loaderSource, lateContext, { filename: 'bridgepoint-transportation-loader-ready-guard-v1.js' });
lateDock.querySelector('.bp-transportation-v1-toggle').listeners.click[0]();
let lateStarted = false;
lateContext.window.__BP_TRANSPORTATION_V1__ = { enable() { lateStarted = true; return true; } };
lateScripts[0].onload();
assert.equal(lateStarted, false, 'the simulation does not race the map card DOM during startup');
assert.equal(typeof onDomReady, 'function', 'activation is queued for DOMContentLoaded');
onDomReady();
assert.equal(lateStarted, true, 'the original button press activates transportation once the card is ready');



assert.ok(api, 'transportation simulation exposes diagnostics and helper methods');
assert.equal(api.version, 4);
assert.equal(api.enabledByDefault, false, 'transportation stays off until the user presses the new button');
assert.equal(api.simulationOnly, true, 'generated traffic must never be described as real vehicle GPS');

const helpers = api.helpers;
assert.equal(helpers.selectModelLod(0), 'dots', 'global and regional views use the lightweight dot renderer');
assert.equal(helpers.selectModelLod(10.49), 'dots', '3D model loading stays off below the model zoom threshold');
assert.equal(helpers.selectModelLod(10.5), 'low', 'medium zoom uses low-detail vehicle models');
assert.equal(helpers.selectModelLod(14.5), 'high', 'close zoom upgrades to full-detail vehicles');
const globalRoads = [{
  key: 'global-test-road',
  roadClass: 'primary',
  coordinates: [[-71.06, 42.36], [-71.05, 42.36], [-71.04, 42.36]]
}];
const globalPaths = helpers.buildFlatRoadPaths(globalRoads, [-71.06, 42.36], 1.2);
assert.equal(globalPaths.paths.length, 1, 'global dot paths are built from mapped road coordinates without a terrain query');
assert.equal(globalPaths.paths[0].points[0].local.y, 0, 'global dot paths do not need a terrain-elevation lookup');
assert.ok(globalPaths.paths[0].length > 1000, 'global vehicle positions preserve road-scale distances');
const curvedRoad = [
  [-71.0600, 42.3600], [-71.0595, 42.3600],
  [-71.0595, 42.3605], [-71.0590, 42.3605]
];
const curvedRoadKept = helpers.simplifyRoadCoordinates(curvedRoad, 5, 32);
assert.equal(curvedRoadKept.length, 4, 'road simplification retains meaningful turns instead of replacing them with straight chords');
const detailedRows = helpers.sampleRoadRows([{ key: 'curve', roadClass: 'residential', coordinates: curvedRoad }], 15);
assert.deepEqual(detailedRows[0].coordinates, curvedRoad, 'close-zoom vehicle paths preserve the full road centerline when under the detail cap');
const largeRoadPath = {
  roadClass: 'motorway',
  length: 2000000,
  points: [
    { coordinate: [-120, 35], local: { x: 0, y: 0, z: 0 }, distance: 0 },
    { coordinate: [-80, 35], local: { x: 2000000, y: 0, z: 0 }, distance: 2000000 }
  ]
};
const globalFleet = helpers.buildFleet([largeRoadPath], 0, 80);
assert.ok(globalFleet.length > 0 && globalFleet.length <= 80,
  'global zoom creates a visible moving fleet while honoring the requested upper cap');
assert.equal(helpers.isRoadFeature({ properties: { class: 'primary', subclass: 'road' } }), true);
assert.equal(helpers.isRoadFeature({ properties: { class: 'minor', subclass: 'residential' } }), true);
assert.equal(helpers.isRoadFeature({ properties: { class: 'motorway' } }), true);
assert.equal(helpers.isRoadFeature({ properties: { class: 'rail', subclass: 'rail' } }), false);
assert.equal(helpers.isRoadFeature({ properties: { class: 'transit' } }), false);
assert.equal(helpers.isRoadFeature({ properties: { class: 'path', subclass: 'footway' } }), false);
assert.equal(helpers.isRoadFeature({ properties: { class: 'pedestrian', subclass: 'pedestrian' } }), false);

/* Exercise the real first-click globe path against the whole-planet roads archive.
 * The test specifically prevents a false pass caused by injecting close-zoom OSM tiles at zoom 1.2.
 */
const activeDock = new FakeElement('div');
const activeHead = new FakeElement('head');
const activeSources = { ofm: {} };
const activeLayers = {};
const activeEvents = {};
const activeRoads = [];
const activeGlobalRoads = [];
let protocolAdds = 0, archiveAdds = 0;
class FakePmtilesArchive { constructor(url) { this.url = url; } }
class FakePmtilesProtocol {
  constructor() { this.tile = () => {}; }
  add(archive) { archiveAdds++; this.archive = archive; }
}
const activeMap = {
  on(name, ...args) { (activeEvents[name] ||= []).push(args); },
  getStyle() { return { layers: [{ source: 'ofm', 'source-layer': 'transportation' }] }; },
  getSource(id) { return activeSources[id] || null; },
  addSource(id, config) { activeSources[id] = { config, data: config.data, setData(value) { this.data = value; } }; },
  getLayer(id) { return activeLayers[id] || null; },
  addLayer(layer) { activeLayers[layer.id] = layer; },
  getCenter() { return { lng: -119, lat: 35 }; },
  getZoom() { return 1.2; },
  querySourceFeatures(sourceId, options) {
    if (sourceId === 'bp-transportation-global-road-source' && options?.sourceLayer === 'roads') return activeGlobalRoads;
    if (sourceId === 'ofm' && options?.sourceLayer === 'transportation') return activeRoads;
    return [];
  }
};
const activeContext = {
  window: {
    __BP_LANDING_WORLD__: { map: activeMap },
    pmtiles: { Protocol: FakePmtilesProtocol, PMTiles: FakePmtilesArchive },
    maplibregl: { addProtocol(name, handler) { assert.equal(name, 'pmtiles'); assert.equal(typeof handler, 'function'); protocolAdds++; } }
  },
  document: {
    readyState: 'complete', visibilityState: 'visible', head: activeHead,
    addEventListener() {},
    querySelector(selector) {
      if (selector === '#bpv-dock-actions') return activeDock;
      return activeDock.querySelector(selector);
    },
    createElement(tag) { return new FakeElement(tag); }
  },
  console: { warn() {}, log() {}, error() {} },
  matchMedia: () => ({ matches: false }),
  MutationObserver: class { observe() {} disconnect() {} },
  setTimeout() { return 1; }, clearTimeout() {},
  requestAnimationFrame() { throw new Error('global dot mode must not start a 3D animation frame loop'); },
  cancelAnimationFrame() {}, performance: { now: () => 1000 }
};
bootModule.runInNewContext(moduleSource, activeContext, { filename: 'bridgepoint-transportation-global-pmtiles-smoke.js' });
const activeApi = activeContext.window.__BP_TRANSPORTATION_V1__;
assert.ok(activeDock.querySelector('.bp-transportation-v1-toggle'), 'the module creates a real Transportation toggle inside the card');
assert.equal(activeApi.enable(), true, 'the first press turns the simulation on directly');
assert.equal(activeApi.diagnostics().enabled, true);
assert.equal(activeApi.diagnostics().vehicles, 0, 'vehicles are not fabricated before global tile features are available');
for (let i = 0; i < 36; i++) {
  const lon = -160 + i * 1.7;
  activeGlobalRoads.push({
    id: 'global-' + i,
    geometry: { type: 'LineString', coordinates: [[lon, 12], [lon + .18, 12.04], [lon + .36, 12.09]] },
    properties: { kind: 'highway', kind_detail: i % 3 === 0 ? 'motorway' : 'primary' }
  });
}
await new Promise(resolve => setTimeout(resolve, 0));
const activeState = activeApi.diagnostics();
assert.equal(protocolAdds, 1, 'the global PMTiles protocol is registered exactly once');
assert.equal(archiveAdds, 1, 'the world road archive is attached to the PMTiles protocol exactly once');
assert.equal(activeSources['bp-transportation-global-road-source']?.config?.url,
  'pmtiles://https://bridgepointintelligence.online/assets/offline/protomaps-world-z6.pmtiles',
  'globe-scale routes use the published whole-planet vector archive');
assert.equal(activeLayers['bp-transportation-global-road-query-layer']?.['source-layer'], 'roads',
  'a transparent source-layer requests whole-planet road tiles at zoom zero');
assert.equal(activeState.enabled, true);
assert.equal(activeState.modelLod, 'dots', 'globe zoom remains in lightweight dot mode');
assert.ok(activeState.vehicles > 0, 'globe zoom creates moving vehicles from global road centerlines');
assert.equal(activeState.dots, activeState.vehicles, 'every global vehicle has an active visible dot');
assert.ok(activeSources['bp-transportation-v1-dot-source']?.data?.features?.length > 0,
  'the global GeoJSON dot layer receives the generated fleet');
assert.ok(activeApi.helpers.sourceRoadFeatures(activeMap, 1.2).length > 0,
  'the global source query reads the PMTiles roads layer');
assert.equal(activeApi.helpers.sourceRoadFeatures(activeMap, 1.2).some(row => row.key.startsWith('ofm:')), false,
  'globe-scale dot availability does not depend on zoom-gated OpenFreeMap road tiles');
activeMap.getZoom = () => 6;
for (let i = 0; i < 24; i++) {
  const lon = -71.06 + i * .001;
  activeRoads.push({
    id: 'local-' + i,
    geometry: { type: 'LineString', coordinates: [[lon, 42.36], [lon + .001, 42.3605], [lon + .002, 42.361]] },
    properties: { class: 'primary', subclass: 'road' }
  });
}
const localRows = activeApi.helpers.sourceRoadFeatures(activeMap, 6);
assert.ok(localRows.length > 0 && localRows.every(row => row.key.startsWith('ofm:')),
  'street zoom switches to detailed OpenFreeMap centerlines');

const stablePathA = {
  key: 'stable-road-a', roadClass: 'primary', length: 18000,
  points: [
    { coordinate: [-71.06, 42.36], local: { x: 0, y: 0, z: 0 }, distance: 0 },
    { coordinate: [-71.04, 42.36], local: { x: 1600, y: 0, z: 0 }, distance: 18000 }
  ]
};
const stablePathB = {
  key: 'stable-road-b', roadClass: 'residential', length: 12000,
  points: [
    { coordinate: [-71.03, 42.36], local: { x: 0, y: 0, z: 0 }, distance: 0 },
    { coordinate: [-71.02, 42.36], local: { x: 820, y: 0, z: 0 }, distance: 12000 }
  ]
};
const stableFleetOne = helpers.buildFleet([stablePathA, stablePathB], 1.2)
  .map(v => ({ id: v.id, kind: v.kind, distance: v.distance })).sort((a,b) => a.id.localeCompare(b.id));
const stableFleetTwo = helpers.buildFleet([stablePathB, stablePathA], 1.2)
  .map(v => ({ id: v.id, kind: v.kind, distance: v.distance })).sort((a,b) => a.id.localeCompare(b.id));
assert.equal(JSON.stringify(stableFleetTwo), JSON.stringify(stableFleetOne),
  'vehicle identities, model types and positions stay stable when vector-tile feature order changes');

const elevationSamples = [
  [-71.060, 42.360], [-71.055, 42.3605], [-71.050, 42.361],
  [-71.045, 42.3615], [-71.040, 42.362]
];
const terrainPath = helpers.buildRoadPaths({
  queryTerrainElevation(point) {
    if (Math.abs(point.lng - elevationSamples[1][0]) < 0.000001 ||
        Math.abs(point.lng - elevationSamples[3][0]) < 0.000001) return null;
    return 12 + (point.lng - elevationSamples[0][0]) * 100;
  }
}, elevationSamples[0], 12, [{
  key: 'terrain-gap-road', roadClass: 'residential', coordinates: elevationSamples
}]);
assert.equal(terrainPath.paths.length, 1, 'missing terrain samples do not split a road into disconnected chunks');
assert.equal(terrainPath.paths[0].points.length, elevationSamples.length, 'every centerline vertex is retained through terrain tile gaps');
assert.ok(terrainPath.paths[0].points.every(p => Number.isFinite(p.local.y)), 'road-relative model height stays finite when terrain tiles have gaps');
assert.equal(helpers.isRoadFeature({ properties: { kind: 'highway', kind_detail: 'primary' } }), true);
assert.equal(helpers.isRoadFeature({ properties: { kind: 'rail', kind_detail: 'rail' } }), false);
assert.equal(helpers.roadClassForFeature({ properties: { kind: 'major_road', kind_detail: 'trunk' } }), 'trunk');

const validKinds = new Set([
  'sedan', 'suv', 'pickup', 'sports-car', 'electric-sedan', 'jeep',
  'delivery-van', 'box-truck', 'tractor-truck', 'semi-trailer', 'city-bus'
]);
for (let seed = 0; seed < 100; seed++) {
  assert.ok(validKinds.has(helpers.vehicleKindForRoad('residential', seed)), 'civilian models come from the supported 3D catalog');
  assert.ok(validKinds.has(helpers.vehicleKindForRoad('motorway', seed)), 'motorway traffic uses supported civilian vehicle families');
}

const local = helpers.localPoint([-71.0579, 42.36], [-71.0589, 42.36], 27, 7);
assert.ok(local.x > 70 && local.x < 90, 'local coordinates use metre-scale east-west offsets');
assert.ok(Math.abs(local.z) < 1e-5, 'same-latitude points have no north/south offset');
assert.equal(local.y, 20, 'vehicle elevation is relative to the sampled terrain anchor');

const path = {
  roadClass: 'residential',
  length: 100,
  points: [
    { coordinate: [-71.06, 42.36], local: { x: 0, y: 0, z: 0 }, distance: 0 },
    { coordinate: [-71.059, 42.36], local: { x: 82, y: 2, z: 0 }, distance: 100 }
  ]
};
const midpoint = helpers.interpolatePath(path, 50);
assert.ok(midpoint);
assert.ok(Math.abs(midpoint.local.x - 41) < .001);
assert.ok(Math.abs(midpoint.local.y - 1) < .001);
assert.ok(Math.abs(midpoint.coordinate[0] - -71.0595) < .00001);

for (const phrase of [
  'Police cars', 'Ambulances', 'Fire trucks', 'Civilian vehicles',
  'SIMULATED police', 'SIMULATED ambulance', 'SIMULATED fire engines', 'Simulated fire truck',
  'No actual vehicle GPS', 'No vehicle GPS, dispatch, patient, officer, home or private-property data',
  'queryTerrainElevation', 'ROAD_SOURCE_LAYER', 'sourceRoadFeatures', 'GLOBAL_ROAD_ARCHIVE',
  'new THREE.WebGLRenderer', 'map.transform.getMatrixForModel',
  'wheelPivots', 'wheel.rotation.x', 'emissiveIntensity'
]) {
  assert.ok(moduleSource.includes(phrase), 'transportation source includes required safeguard or feature: ' + phrase);
}
assert.ok(!/tomtom|here\.com|911|cad feed|avl endpoint/i.test(moduleSource), 'this preview does not claim or query unconfigured traffic/dispatch services');
assert.ok(!/fetch\s*\(/.test(moduleSource), 'no unconfigured remote vehicle telemetry endpoint is queried');
assert.ok(!moduleSource.includes('state.button?.click()'), 'the first button press calls the public start method directly');
assert.ok(!moduleSource.includes('setInterval('), 'Transportation does not keep a page-startup polling loop alive');
assert.ok(moduleSource.includes('function buildFlatRoadPaths'), 'global dot routes are built without waiting for terrain samples');
assert.ok(moduleSource.includes('function makeVehicleLowLod'), 'medium zoom has a lightweight 3D vehicle model kit');
assert.ok(moduleSource.includes('makeVehicle(T,item):makeVehicleLowLod(T,item)'), 'close zoom upgrades the low-detail model kit to detailed vehicle geometry');
assert.ok(moduleSource.includes('Attach every replacement before retiring old meshes'), 'LOD upgrades stage replacement vehicles before retiring old models');
assert.ok(!moduleSource.includes('setTimeout(addBatch, 12)'), '3D vehicles are not added in flashing one-by-one batches');
assert.ok(moduleSource.includes('hasVehiclesInViewport'), 'ordinary pans keep the existing road-following fleet instead of regenerating it');
assert.ok(moduleSource.includes('MAX_DOT_VEHICLES = MOBILE ? 64 : 120'), 'global mode shows a bounded set of moving dots on desktop and phone');

const expectedScript = 'bridgepoint-transportation-v1.js?v=4-global-pmtiles-stable-models';
const expectedLoader = '<script defer src="/bridgepoint-transportation-loader-v1.js?v=4-global-pmtiles-stable-models"></script>';
assert.ok(!landingHtml.includes(expectedScript), 'homepage never downloads the 3D transportation module during startup');
assert.ok(!appHtml.includes(expectedScript), 'app never downloads the 3D transportation module during startup');
assert.ok(landingHtml.includes(expectedLoader), 'homepage loads only the lightweight card-button launcher');
assert.ok(appHtml.includes(expectedLoader), 'app loads only the lightweight card-button launcher');
assert.ok(loaderSource.includes("button.addEventListener('click'"), 'the simulation loader is attached to a user button press');
assert.ok(loaderSource.includes('script.async = true'), 'the simulation bundle loads asynchronously');
assert.ok(loaderSource.includes('script.src = MODULE_SRC'), 'the heavy simulation module is requested dynamically');
assert.ok(fullDeploy.includes('node --check rebuild-v5000/bridgepoint-transportation-v1.js'), 'full deploy syntax-checks the transportation module');
assert.ok(fullDeploy.includes('node --check rebuild-v5000/bridgepoint-transportation-loader-v1.js'), 'full deploy syntax-checks the lightweight launcher');
assert.ok(fullDeploy.includes('node tests/transportation-simulation-v1.test.mjs'), 'full deploy runs the transportation regression tests');
assert.ok(fullDeploy.includes('cp rebuild-v5000/bridgepoint-transportation-v1.js site/bridgepoint-transportation-v1.js'), 'full deploy publishes the transportation module for on-demand loading');
assert.ok(fullDeploy.includes('cp rebuild-v5000/bridgepoint-transportation-loader-v1.js site/bridgepoint-transportation-loader-v1.js'), 'full deploy publishes the lightweight launcher');
assert.ok(!/^\s*push:/m.test(rollbackWorkflow), 'the old experimental rollback deployment can no longer auto-publish over this release');

console.log('BridgePoint Transportation Simulation v4 global-PMTiles/stable-model contract checks passed.');
