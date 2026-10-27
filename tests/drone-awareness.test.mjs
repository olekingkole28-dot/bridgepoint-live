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
assert.ok(moduleSource.includes('MIN_GROUP=1'), 'every qualifying coarse cell can be shown');
assert.ok(moduleSource.includes('gridKey(lat,lon)'), 'coordinates are reduced to coarse cells before display');
assert.ok(moduleSource.includes("aggregation:'13 global sample regions; 2-degree grid; min 1 classified UAV-class report per cell'"), 'global sampling and aggregation are explicit');
assert.ok(moduleSource.includes("setLayoutProperty(LAYER,on?'visible':'none')"), 'layer visibility is explicitly toggled');
assert.ok(moduleSource.includes('setInterval(()=>{if(enabled&&!document.hidden)void refresh(false)},REFRESH_MS)'), 'polling is opt-in and timed');
assert.ok(moduleSource.includes('AbortController'), 'requests can time out without blocking the map');
assert.ok(moduleSource.includes('rawRfScanning:false'), 'no raw RF scanner is represented');
assert.ok(moduleSource.includes('pilotOrControlStationLocations:false'), 'no operator/control-station location is exposed');
assert.ok(moduleSource.includes("https://api.adsb.lol/docs/open-data/api/"), 'upstream source is attributed');
assert.ok(moduleSource.includes('hideDefaultOverlays'), 'startup enters a clean globe state');
assert.ok(moduleSource.includes('function setLabelTextIfChanged(node,value)'), 'startup label updates do not rewrite unchanged text nodes');
assert.ok(moduleSource.includes('if(node.textContent!==next)node.textContent=next;'), 'unchanged UI labels do not retrigger the subtree mutation observer');
assert.ok(moduleSource.includes('if(button&&pane){try{observer.disconnect()}catch(_){}}'), 'the broad DOM observer disconnects after dock controls exist while map readiness polling continues');
assert.ok(moduleSource.includes('function isManagedOptionalOverlay(id)'), 'only recognized optional overlays are managed by the clean-start guard');
assert.ok(moduleSource.includes('if(!isManagedOptionalOverlay(layer.id)||layerAllowed(layer.id))continue;'), 'unknown/core basemap layers are never blanket-hidden');
assert.ok(moduleSource.includes('let parcelLayerEnabled=false;'), 'parcel outlines are off at startup until the parcel control is pressed');
assert.ok(moduleSource.includes('/landmark|poi|tree|streetlight|transit|infra-points|fire/i'), 'optional landmark, vegetation, transit, infrastructure, and fire overlays are off at startup');
assert.ok(moduleSource.includes("for(const event of ['style.load','idle','moveend','zoomend','rotateend','pitchend'])m.on(event,hideDefaultOverlays)"), 'clean-start guard runs on settled styles/camera events');
assert.ok(!moduleSource.includes("m.on('styledata',hideDefaultOverlays)"), 'avoid styledata feedback loops while hiding optional layers');
assert.ok(landingHtml.includes('bridgepoint-drone-awareness-v1.js'), 'homepage loads the module');
assert.ok(appHtml.includes('bridgepoint-drone-awareness-v1.js'), 'app loads the module');
assert.ok(view.includes('data-bpv-command-grid="environment"'), 'environment command group exists');
assert.ok(mapKey.includes('DRONE AWARENESS') || mapKey.includes('DRONE FLEET + PUBLIC AIRSPACE'), 'map key documents the opt-in drone layer');
assert.ok(workflow.includes('cp rebuild-v5000/bridgepoint-drone-awareness-v1.js site/bridgepoint-drone-awareness-v1.js'), 'deployment copies the public runtime');
assert.ok(workflow.includes('node --check rebuild-v5000/bridgepoint-drone-awareness-v1.js'), 'deployment syntax-checks the module');
assert.ok(moduleSource.includes('GLOBAL_SAMPLES=['), 'drone view samples multiple regions globally');
assert.ok(moduleSource.includes('const SIM_FLEET_COUNT=156'), 'drone button provides a sizable simulated demo fleet');
assert.ok(moduleSource.includes("const offsets=[[-9,-5],[-3,-5],[3,-5],[9,-5],[-9,0],[-3,0],[3,0],[9,0],[-9,5],[-3,5],[3,5],[9,5]];"), 'simulated drone icons are spread far enough apart to read on the whole-Earth globe');
assert.ok(moduleSource.includes("0,.34,1,.42,2,.52,5,.72,10,.82,16,.92"), 'global drone icon sizes remain lightweight and visible at whole-Earth zoom');
assert.ok(moduleSource.includes('fleetFeatureCount:SIM_FLEET_COUNT'), 'runtime diagnostics expose the expected fleet size for smoke tests');
assert.ok(moduleSource.includes('fleetLayerVisible:!!map?.getLayer?.(SIM_LAYER)'), 'runtime diagnostics expose actual simulated layer visibility');
assert.ok(moduleSource.includes("if(!fleetReady){enabled=false;updateButton();setLayerVisibility(false);"), 'a failed drone-layer setup fails closed without launching background requests');
assert.ok(moduleSource.includes('bridge(?:3d|-)'), '3D bridge geometry is recognized as a transport overlay controlled by Transport');
assert.ok(moduleSource.includes('|bridge3d/i'), 'startup overlay guard can hide 3D bridge geometry without touching the basemap');
assert.ok(moduleSource.includes("label:'SIMULATED FLEET PREVIEW · NOT A LIVE FLIGHT'"), 'simulated positions are marked so they cannot be mistaken for live aircraft');
assert.ok(moduleSource.includes("layout:{visibility:'none','icon-image':SIM_ICON"), 'simulated drone icons remain hidden at startup');
assert.ok(moduleSource.includes('setSimFleetVisibility(true)'), 'drone button enables the simulated fleet preview');
assert.ok(moduleSource.includes("String(id).startsWith('bp-drone-sim-fleet')"), 'the clean-start guard preserves the explicitly enabled simulated fleet layer');
assert.ok(mapKey.includes('Simulated drone fleet preview · 156 icons'), 'map key labels simulated and source-backed drone layers separately');
assert.ok(moduleSource.includes('GRID_DEGREES=2'), 'drone display uses coarse 2-degree cells');
assert.ok(moduleSource.includes('data-bp-water-flow-button'), 'water control is created inside the bottom card');
assert.ok(moduleSource.includes('data-bp-cloud-toggle-button'), 'cloud control is created inside the bottom card');
assert.ok(moduleSource.includes("'gta-parcel','gta-parcel-glow','gta-parcel-halo'"), 'parcel boundaries have explicit visibility gating');
assert.ok(landingHtml.includes('offline-world-ui.js'), 'homepage contains the offline dock UI loader');
assert.ok(appHtml.includes('offline-world-ui.js'), 'app contains the offline dock UI loader');
assert.ok(view.includes('bpv-mapkey-rail'), 'the map key is available from the side rail');
console.log('Drone awareness module checks passed.');
