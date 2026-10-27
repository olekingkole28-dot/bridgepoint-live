import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [moduleSource, landingHtml, appHtml, mapKey, view, workflow] = await Promise.all([
  read('../rebuild-v5000/bridgepoint-drone-awareness-v1.js'),
  read('../rebuild-v5000/index.html'),
  read('../rebuild-v5000/app-index.html'),
  read('../rebuild-v5000/bridgepoint-map-key-v5920.js'),
  read('../rebuild-v5000/bridgepoint-view-v5917.js'),
  read('../.github/workflows/deploy-intelligence-rebuild-v5000.yml')
]);

assert.ok(moduleSource.includes('bp-drone-awareness-cells-v1'), 'aggregated drone layer id is present');
assert.ok(moduleSource.includes("category==='B6'"), 'UAV filter uses the explicit ADS-B emitter category');
assert.ok(moduleSource.includes('MIN_GROUP=3'), 'display requires a minimum aggregation count');
assert.ok(moduleSource.includes('gridKey(lat,lon)'), 'coordinates are reduced to coarse cells before display');
assert.ok(moduleSource.includes("'1-degree grid; minimum 3 UAV-class reports per displayed cell'"), 'privacy boundary is visible in feature metadata');
assert.ok(moduleSource.includes("setLayoutProperty(LAYER,on?'visible':'none')"), 'layer visibility is explicitly toggled');
assert.ok(moduleSource.includes('setInterval(()=>{if(enabled&&!document.hidden)void refresh(false)},REFRESH_MS)'), 'polling is opt-in and timed');
assert.ok(moduleSource.includes('AbortController'), 'requests can time out without blocking the map');
assert.ok(moduleSource.includes('rawRfScanning:false'), 'no raw RF scanner is represented');
assert.ok(moduleSource.includes('pilotOrControlStationLocations:false'), 'no operator/control-station location is exposed');
assert.ok(moduleSource.includes("https://api.adsb.lol/docs/open-data/api/"), 'upstream source is attributed');
assert.ok(moduleSource.includes('hideDefaultOverlays'), 'startup enters a clean globe state');
assert.ok(landingHtml.includes('bridgepoint-drone-awareness-v1.js'), 'homepage loads the module');
assert.ok(appHtml.includes('bridgepoint-drone-awareness-v1.js'), 'app loads the module');
assert.ok(view.includes('data-bpv-command-grid="environment"'), 'environment command group exists');
assert.ok(mapKey.includes('DRONE AWARENESS'), 'map key documents the opt-in layer');
assert.ok(workflow.includes('cp rebuild-v5000/bridgepoint-drone-awareness-v1.js site/bridgepoint-drone-awareness-v1.js'), 'deployment copies the public runtime');
assert.ok(workflow.includes('node --check rebuild-v5000/bridgepoint-drone-awareness-v1.js'), 'deployment syntax-checks the module');
console.log('Drone awareness module checks passed.');
