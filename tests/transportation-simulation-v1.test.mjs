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
  }
  append(...nodes) { for (const node of nodes) this.appendChild(node); }
  appendChild(node) { node.parentElement = this; this.children.push(node); return node; }
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
assert.equal(requestedScripts[0].src, '/bridgepoint-transportation-v1.js?v=2-dots-first-adaptive-lod');
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
assert.equal(api.version, 2);
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
const globalPaths = helpers.buildFlatRoadPaths(globalRoads, [-71.06, 42.36]);
assert.equal(globalPaths.paths.length, 1, 'global dot paths are built from mapped road coordinates without a terrain query');
assert.equal(globalPaths.paths[0].points[0].local.y, 0, 'global dot paths do not need a terrain-elevation lookup');
assert.ok(globalPaths.paths[0].length > 1000, 'global vehicle positions preserve road-scale distances');
const largeRoadPath = {
  roadClass: 'motorway',
  length: 2000000,
  points: [
    { coordinate: [-120, 35], local: { x: 0, y: 0, z: 0 }, distance: 0 },
    { coordinate: [-80, 35], local: { x: 2000000, y: 0, z: 0 }, distance: 2000000 }
  ]
};
assert.equal(helpers.buildFleet([largeRoadPath], 0, 80).length, 80,
  'global zoom maintains a visible capped fleet of moving dots instead of hiding all vehicles');
assert.equal(helpers.isRoadFeature({ properties: { class: 'primary', subclass: 'road' } }), true);
assert.equal(helpers.isRoadFeature({ properties: { class: 'minor', subclass: 'residential' } }), true);
assert.equal(helpers.isRoadFeature({ properties: { class: 'motorway' } }), true);
assert.equal(helpers.isRoadFeature({ properties: { class: 'rail', subclass: 'rail' } }), false);
assert.equal(helpers.isRoadFeature({ properties: { class: 'transit' } }), false);
assert.equal(helpers.isRoadFeature({ properties: { class: 'path', subclass: 'footway' } }), false);
assert.equal(helpers.isRoadFeature({ properties: { class: 'pedestrian', subclass: 'pedestrian' } }), false);

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
  'queryTerrainElevation', 'sourceLayer: ROAD_SOURCE_LAYER',
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
assert.ok(moduleSource.includes('makeVehicle(T, item) : makeVehicleLowLod(T, item)'), 'close zoom upgrades the low-detail model kit to detailed vehicle geometry');
assert.ok(moduleSource.includes('MAX_DOT_VEHICLES = MOBILE ? 64 : 120'), 'global mode shows a bounded set of moving dots on desktop and phone');

const expectedScript = 'bridgepoint-transportation-v1.js?v=2-dots-first-adaptive-lod';
const expectedLoader = '<script defer src="/bridgepoint-transportation-loader-v1.js?v=2-dots-first-adaptive-lod"></script>';
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

console.log('BridgePoint Transportation Simulation v2 dot-first adaptive-LOD contract checks passed.');
