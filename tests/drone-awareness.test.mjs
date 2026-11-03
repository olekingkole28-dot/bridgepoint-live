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

assert.ok(moduleSource.includes('bp-drone-awareness-live-dots-v2'), 'the live UAV point layer is present');
assert.ok(moduleSource.includes("category==='B6'"), 'UAV filter uses the explicit ADS-B emitter category');
assert.ok(moduleSource.includes('function updateTrackedUavs(records)'), 'public reports are tracked across successive refreshes');
assert.ok(moduleSource.includes('const MAX_TRAIL_POINTS=24'), 'observed flight paths retain a bounded history');
assert.ok(moduleSource.includes('bp-drone-awareness-trail-lines-v2'), 'sampled positions are rendered as map trails');
assert.ok(moduleSource.includes("type:'custom',renderingMode:'3d'"), 'drone models render through a 3D custom layer');
assert.ok(moduleSource.includes('function makeDroneModel(THREE)'), 'the 3D quadcopter model is built from actual mesh geometry');
assert.ok(moduleSource.includes("const THREE=await loadDroneThree()"), '3D rendering is initialized on activation');
assert.ok(moduleSource.includes('modelSpanMeters(lat,zoom)'), '3D models are screen-enlarged for visibility at global zoom');
assert.ok(moduleSource.includes('setDroneModels(allCurrent)'), 'source-reported UAV positions place the 3D models');
assert.ok(moduleSource.includes('MAX_TRACKED_DRONES=180'), 'the live renderer caps aircraft for globe performance');
assert.ok(moduleSource.includes('simulatedFleet:false'), 'runtime diagnostics explicitly state no simulated aircraft are displayed');
assert.ok(!moduleSource.includes('SIM_FLEET_COUNT'), 'the fabricated demonstration fleet has been removed');
assert.ok(!moduleSource.includes('simulatedFleetFeatureCollection'), 'no invented global fleet coordinates remain');
assert.ok(moduleSource.includes('Public ADS-B source sample'), 'the live-source coverage limitations are surfaced');
assert.ok(moduleSource.includes('const TRACK_RETENTION_MS=45*60*1000'), 'stale history is bounded');
assert.ok(moduleSource.includes('pilotOrControlStationLocations:false'), 'pilot/control-station locations are not exposed');
assert.ok(moduleSource.includes('rawRfScanning:false'), 'no raw RF scanner is represented');
assert.ok(moduleSource.includes("https://api.adsb.lol/docs/open-data/api/"), 'upstream source is attributed');
assert.ok(moduleSource.includes('hideDefaultOverlays'), 'startup enters a clean globe state');
assert.ok(moduleSource.includes('function setLabelTextIfChanged(node,value)'), 'startup label updates do not rewrite unchanged text nodes');
assert.ok(moduleSource.includes('if(node.textContent!==next)node.textContent=next;'), 'unchanged UI labels do not retrigger the subtree mutation observer');
assert.ok(moduleSource.includes('if(button&&pane){try{observer.disconnect()}catch(_){}}'), 'the broad DOM observer disconnects after dock controls exist while map readiness polling continues');
assert.ok(moduleSource.includes('function isManagedOptionalOverlay(id)'), 'only recognized optional overlays are managed by the clean-start guard');
assert.ok(moduleSource.includes('if(!isManagedOptionalOverlay(layer.id)||layerAllowed(layer.id))continue;'), 'unknown/core basemap layers are never blanket-hidden');
assert.ok(moduleSource.includes('let parcelLayerEnabled=false;'), 'parcel outlines are off at startup until the parcel control is pressed');
assert.ok(moduleSource.includes('/landmark|poi|tree|streetlight|transit|infra-points|fire|bridge3d/i'), 'optional landmark, vegetation, transit, infrastructure, and fire overlays are off at startup');
assert.ok(moduleSource.includes("for(const event of ['style.load','idle','moveend','zoomend','rotateend','pitchend'])m.on(event,hideDefaultOverlays)"), 'clean-start guard runs on settled styles/camera events');
assert.ok(!moduleSource.includes("m.on('styledata',hideDefaultOverlays)"), 'avoid styledata feedback loops while hiding optional layers');
assert.ok(landingHtml.includes('bridgepoint-drone-awareness-v1.js'), 'homepage loads the module');
assert.ok(appHtml.includes('bridgepoint-drone-awareness-v1.js'), 'app loads the module');
assert.ok(landingHtml.includes('bridgepoint-drone-awareness-v1.js?v=2-live-3d-trails'), 'homepage uses the live 3D drone runtime cache key');
assert.ok(appHtml.includes('bridgepoint-drone-awareness-v1.js?v=2-live-3d-trails'), 'app uses the same live 3D drone runtime cache key');
assert.ok(view.includes('data-bpv-command-grid="environment"'), 'environment command group exists');
for (const action of ['weatherfx','windfx','volumetric','ai','listings','opportunities','metrics','property','explore','parcels','boundaryviewer','worldchanges','controls','motion','whole']) {
  assert.ok(view.includes('data-bpv-action="'+action+'"'), 'the dock exposes the '+action+' action');
}
assert.ok(view.includes("if(a==='boundaryviewer')"), 'parcel viewer action has an explicit handler');
assert.ok(view.includes("if(a==='opportunities')"), 'opportunity action has an explicit handler');
assert.ok(view.includes("if(a==='weatherfx')"), 'weather action has an explicit handler');
const weatherActionStart = view.indexOf("  if(a==='weatherfx'){");
const weatherActionEnd = view.indexOf("  if(a==='windfx'){", weatherActionStart);
assert.ok(weatherActionStart >= 0 && weatherActionEnd > weatherActionStart, 'Weather FX click handler is independently discoverable');
const weatherAction = view.slice(weatherActionStart, weatherActionEnd);
assert.ok(weatherAction.includes('openRealWorldEffects(false)'), 'Weather FX opens its real effects control panel directly');
assert.ok(!weatherAction.includes('setDockMaximized(true)'), 'opening Weather FX does not only maximize/scroll the bottom dock');
assert.ok(!weatherAction.includes('__BP_LANDING_TOGGLE_WEATHER__') && !weatherAction.includes('__BP_TOGGLE_LIVE_WEATHER__'), 'opening Weather FX is not gated by a separate weather on/off toggle');
assert.ok(landingHtml.includes('bridgepoint-view-v5917.js?v=6215-satellite-persistent-render-guard'), 'homepage uses the Weather FX panel cache-buster');
assert.ok(appHtml.includes('bridgepoint-view-v5917.js?v=6215-satellite-persistent-render-guard'), 'app uses the Weather FX panel cache-buster');
assert.ok(view.includes("if(a==='windfx')"), 'wind action has an explicit handler');
assert.ok(view.includes("if(a==='motion')"), 'motion action has an explicit handler');
assert.ok(workflow.includes('Whole-Earth drone fleet and map responsiveness smoke'), 'deployment runs a global drone responsiveness smoke test');
assert.ok(workflow.includes('GLOBAL_DRONE_FLEET_NOT_RENDERED'), 'deployment fails if the drone fleet does not render on the globe');
assert.ok(workflow.includes('|\\brf\\b|drone|bridge3d'), 'startup overlay smoke uses word-boundary RF matching and recognizes bridge geometry');
assert.ok(mapKey.includes('DRONE AWARENESS') || mapKey.includes('DRONE FLEET + PUBLIC AIRSPACE'), 'map key documents the opt-in drone layer');
assert.ok(workflow.includes('cp rebuild-v5000/bridgepoint-drone-awareness-v1.js site/bridgepoint-drone-awareness-v1.js'), 'deployment copies the public runtime');
assert.ok(workflow.includes('node --check rebuild-v5000/bridgepoint-drone-awareness-v1.js'), 'deployment syntax-checks the module');
assert.ok(moduleSource.includes('GLOBAL_SAMPLES=['), 'the public source is sampled across the global coverage hubs');
assert.ok(moduleSource.includes("const REFRESH_MS=180000"), 'global positions refresh on a bounded three-minute cycle');
assert.ok(moduleSource.includes('function modelSpanMeters(lat,zoom)'), '3D symbols remain visible from globe zoom');
assert.ok(moduleSource.includes("model.rotation.set(0,0,(Number.isFinite(heading)?heading:0)*Math.PI/180-Math.PI/2)"), 'model orientation follows source heading');
assert.ok(moduleSource.includes('function animateDroneModels(now)'), '3D propellers animate while aircraft are visible');
assert.ok(moduleSource.includes('TRACK_RETENTION_MS'), 'track history retention is bounded');
assert.ok(moduleSource.includes('Trails connect positions BridgePoint has sampled while this button is on'), 'trail history is described as sampled, not continuous');
assert.ok(moduleSource.includes('No simulated drones are substituted'), 'missing live data is not replaced with invented aircraft');
assert.ok(moduleSource.includes('data-bp-water-flow-button'), 'water control is created inside the bottom card');
assert.ok(!moduleSource.includes('data-bp-cloud-toggle-button'), 'always-on cloud volumes do not expose a toggle button');
assert.ok(moduleSource.includes("const allowedCategories=new Set(['clouds'])"), 'cloud volumes are exempt from clean-start overlay hiding');
assert.ok(!moduleSource.includes('cloudToggle:toggleClouds'), 'cloud volumes are not exposed as a toggle action');
assert.ok(moduleSource.includes("'gta-parcel','gta-parcel-glow','gta-parcel-halo'"), 'parcel boundaries have explicit visibility gating');
assert.ok(landingHtml.includes('offline-world-ui.js'), 'homepage contains the offline dock UI loader');
assert.ok(appHtml.includes('offline-world-ui.js'), 'app contains the offline dock UI loader');
assert.ok(view.includes('bpv-mapkey-rail'), 'the map key is available from the side rail');
console.log('Drone awareness module checks passed.');
