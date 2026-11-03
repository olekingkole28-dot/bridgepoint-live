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

assert.ok(moduleSource.includes('bp-drone-awareness-live-dots-v4'), 'the live UAV point layer is present');
assert.ok(moduleSource.includes("category==='B6'"), 'UAV filter uses the explicit ADS-B emitter category');
assert.ok(moduleSource.includes('function updateTrackedUavs(records)'), 'public reports are tracked across successive refreshes');
assert.ok(moduleSource.includes('const MAX_TRAIL_POINTS=24'), 'observed flight paths retain a bounded history');
assert.ok(moduleSource.includes('bp-drone-awareness-trail-lines-v4'), 'sampled positions are rendered as map trails');
assert.ok(moduleSource.includes("type:'custom',renderingMode:'3d'"), 'drone models render through a 3D custom layer');
assert.ok(moduleSource.includes('function makeDroneModel(THREE)'), 'the 3D quadcopter model is built from actual mesh geometry');
assert.ok(moduleSource.includes("const THREE=await loadDroneThree()"), '3D rendering is initialized on activation');
assert.ok(moduleSource.includes('modelSpanMeters(lat,zoom)'), '3D models are screen-enlarged for visibility at global zoom');
assert.ok(moduleSource.includes('setDroneModels(accepted)'), 'source-reported UAV positions place the 3D models');
assert.ok(moduleSource.includes('MAX_TRACKED_DRONES=1200'), 'the live renderer caps aircraft for globe performance');
assert.ok(moduleSource.includes('simulatedFleet:false'), 'runtime diagnostics explicitly state no simulated aircraft are displayed');
assert.ok(!moduleSource.includes('SIM_FLEET_COUNT'), 'the fabricated demonstration fleet has been removed');
assert.ok(!moduleSource.includes('simulatedFleetFeatureCollection'), 'no invented global fleet coordinates remain');
assert.ok(moduleSource.includes('ADSB.lol public community ADS-B'), 'the live-source coverage limitations are surfaced');
assert.ok(moduleSource.includes('const TRACK_RETENTION_MS=45*60*1000'), 'stale history is bounded');
assert.ok(moduleSource.includes('pilotOrControlStationLocations:false'), 'pilot/control-station locations are not exposed');
assert.ok(moduleSource.includes('rawRfScanning:false'), 'no raw RF scanner is represented');
assert.ok(moduleSource.includes('drone3DRendererReady:!!droneRenderer&&!!droneScene'), 'runtime diagnostics expose real 3D renderer readiness');
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
assert.ok(landingHtml.includes('bridgepoint-drone-awareness-v1.js?v=4-geometric-adsb-clusters'), 'homepage uses the live 3D drone runtime cache key');
assert.ok(appHtml.includes('bridgepoint-drone-awareness-v1.js?v=4-geometric-adsb-clusters'), 'app uses the same live 3D drone runtime cache key');
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
assert.ok(workflow.includes('Whole-Earth drone 3D layer and map responsiveness smoke'), 'deployment runs a global 3D drone responsiveness smoke test');
assert.ok(workflow.includes('GLOBAL_DRONE_3D_LAYER_NOT_READY'), 'deployment fails if the real 3D drone layer is not ready on the globe');
assert.ok(workflow.includes('|\\brf\\b|drone|bridge3d'), 'startup overlay smoke uses word-boundary RF matching and recognizes bridge geometry');
assert.ok(mapKey.includes('DRONE AWARENESS') || mapKey.includes('DRONE FLEET + PUBLIC AIRSPACE'), 'map key documents the opt-in drone layer');
assert.ok(workflow.includes('cp rebuild-v5000/bridgepoint-drone-awareness-v1.js site/bridgepoint-drone-awareness-v1.js'), 'deployment copies the public runtime');
assert.ok(workflow.includes('drone3DRendererReady'), 'whole-Earth smoke verifies the active 3D renderer rather than a fake demo fleet');
assert.ok(workflow.includes('node --check rebuild-v5000/bridgepoint-drone-awareness-v1.js'), 'deployment syntax-checks the module');
assert.ok(moduleSource.includes('GLOBAL_SAMPLES=['), 'the public source is sampled across the global coverage hubs');
assert.ok(moduleSource.includes("const REFRESH_MS=180000"), 'global positions refresh on a bounded three-minute cycle');
assert.ok(moduleSource.includes('function modelSpanMeters(lat,zoom)'), '3D symbols remain visible from globe zoom');
assert.ok(moduleSource.includes("model.rotation.set(0,0,(Number.isFinite(point.heading)?point.heading:0)*Math.PI/180-Math.PI/2)"), 'model orientation follows source heading');
assert.ok(moduleSource.includes('function animateDroneModels(now)'), '3D propellers animate while aircraft are visible');
assert.ok(moduleSource.includes('TRACK_RETENTION_MS'), 'track history retention is bounded');
assert.ok(moduleSource.includes('Each observation preserves track key, source longitude/latitude, reported altitude'), 'trail history is described as sampled, not continuous');
assert.ok(/no simulated drones are substituted/i.test(moduleSource), 'missing live data is not replaced with invented aircraft');
assert.ok(moduleSource.includes('data-bp-water-flow-button'), 'water control is created inside the bottom card');
assert.ok(!moduleSource.includes('data-bp-cloud-toggle-button'), 'always-on cloud volumes do not expose a toggle button');
assert.ok(moduleSource.includes("const allowedCategories=new Set(['clouds'])"), 'cloud volumes are exempt from clean-start overlay hiding');
assert.ok(!moduleSource.includes('cloudToggle:toggleClouds'), 'cloud volumes are not exposed as a toggle action');
assert.ok(moduleSource.includes("'gta-parcel','gta-parcel-glow','gta-parcel-halo'"), 'parcel boundaries have explicit visibility gating');
assert.ok(landingHtml.includes('offline-world-ui.js'), 'homepage contains the offline dock UI loader');
assert.ok(appHtml.includes('offline-world-ui.js'), 'app contains the offline dock UI loader');
assert.ok(view.includes('bpv-mapkey-rail'), 'the map key is available from the side rail');
console.log('Drone awareness module checks passed.');


// Regressions for the live ADS-B request, B6 filter, altitude preservation and 3D trail projection.
// The saved JSON is a test fixture only; it is never imported by the production browser bundle.
{
  const { readFileSync: bpReadDroneFile } = await import('node:fs');
  const bpDroneSourceText = bpReadDroneFile(new URL('../rebuild-v5000/bridgepoint-drone-awareness-v1.js', import.meta.url), 'utf8');
  const bpDroneFixture = JSON.parse(bpReadDroneFile(new URL('./fixtures/adsb-lol-response-b6.json', import.meta.url), 'utf8'));
  const bpDroneHelperStart = bpDroneSourceText.indexOf('const DroneCore=(()=>{');
  const bpDroneHelperEnd = bpDroneSourceText.indexOf('})();', bpDroneHelperStart) + 4;
  assert.ok(bpDroneHelperStart >= 0 && bpDroneHelperEnd > bpDroneHelperStart, 'runtime exposes the pure DroneCore functions for tests');
  const bpDroneHelperSource = bpDroneSourceText.slice(bpDroneHelperStart, bpDroneHelperEnd);
  const bpDroneCore = new Function(
    "const SUPPORTED_SOURCE='https://api.adsb.lol/v2/'; const REGION_RADIUS_NM=250;\n" +
    bpDroneHelperSource + "\nreturn DroneCore;"
  )();

  assert.equal(bpDroneCore.radiusNm, 250, 'supported request radius is explicitly defined at 250 NM');
  assert.equal(
    bpDroneCore.buildRequestUrl({lat:40.7, lon:-74}),
    'https://api.adsb.lol/v2/lat/40.7000/lon/-74.0000/dist/250',
    'request URL follows the supported ADSB.lol v2 lat/lon/dist endpoint'
  );

  const bpParsed = bpDroneCore.parseResponse(bpDroneFixture);
  assert.equal(bpParsed.records.length, 4, 'parser consumes the actual ac array');
  assert.equal(bpDroneCore.isUavRecord(bpParsed.records[0]), true, 'B6 is explicitly accepted as UAV');
  assert.equal(bpDroneCore.isUavRecord(bpParsed.records[1]), false, 'ordinary A3 aircraft is not called a drone');
  assert.throws(() => bpDroneCore.parseResponse({total: 1}), /ac aircraft array/, 'missing ac is a visible schema error');

  const bpGeomAltitude = bpDroneCore.altitudeForRecord(bpParsed.records[0]);
  assert.equal(bpGeomAltitude.known, true);
  assert.equal(bpGeomAltitude.datum, 'geometric');
  assert.equal(bpGeomAltitude.sourceField, 'alt_geom');
  assert.equal(bpGeomAltitude.sourceUnits, 'ft');
  assert.ok(Math.abs(bpGeomAltitude.meters - 365.76) < 1e-8, 'geometric feet convert to metres exactly');

  const bpBaroAltitude = bpDroneCore.altitudeForRecord({alt_baro: 900});
  assert.equal(bpBaroAltitude.known, true);
  assert.equal(bpBaroAltitude.datum, 'barometric');
  assert.equal(bpBaroAltitude.sourceField, 'alt_baro');
  assert.ok(Math.abs(bpBaroAltitude.meters - 274.32) < 1e-8, 'barometric feet retain their distinct datum');
  assert.equal(bpDroneCore.altitudeForRecord({}).known, false, 'missing altitude stays unknown');
  assert.equal(bpDroneCore.altitudeForRecord({alt_geom:'ground'}).known, false, 'ground is not converted into a fabricated height');

  const bpRejectedStale = bpDroneCore.invalidPositionReason(bpParsed.records[2]);
  const bpRejectedCoordinates = bpDroneCore.invalidPositionReason(bpParsed.records[3]);
  assert.match(bpRejectedStale, /stale position/);
  assert.match(bpRejectedCoordinates, /invalid coordinates/);

  const bpSampledAt = 1700000000000;
  const bpTrailPoint = bpDroneCore.createTrailPoint(bpParsed.records[0], bpSampledAt, 'ADSB.lol');
  assert.equal(bpTrailPoint.trackKey, 'abc123');
  assert.equal(bpTrailPoint.longitude, -74.006);
  assert.equal(bpTrailPoint.latitude, 40.713);
  assert.equal(bpTrailPoint.altitudeField, 'alt_geom');
  assert.equal(bpTrailPoint.altitudeDatum, 'geometric');
  assert.equal(bpTrailPoint.heading, 92);
  assert.equal(bpTrailPoint.sourceName, 'ADSB.lol');
  assert.equal(bpTrailPoint.observationTimestamp, bpSampledAt - 1000, 'seen_pos age becomes a timestamp');

  let bpProjectedArguments = null;
  const bpMercatorStub = {fromLngLat: (lngLat, altitude) => { bpProjectedArguments = {lngLat, altitude}; return {x:1,y:2,z:3}; }};
  const bpProjected = bpDroneCore.project3DPoint(bpTrailPoint, bpMercatorStub);
  assert.deepEqual(bpProjected, {x:1,y:2,z:3});
  assert.deepEqual(bpProjectedArguments, {lngLat:{lng:-74.006,lat:40.713},altitude:365.76}, '3D coordinates receive the source altitude converted to metres');
  const bpUnknownPoint = bpDroneCore.createTrailPoint({hex:'abc999',lat:1,lon:2}, bpSampledAt, 'ADSB.lol');
  assert.equal(bpUnknownPoint.altitudeKnown, false);
  assert.equal(bpDroneCore.project3DPoint(bpUnknownPoint, bpMercatorStub), null, 'unknown altitude cannot be projected as an invented 3D height');

  assert.match(bpDroneSourceText, /REGION_RADIUS_NM=250/);
  assert.match(bpDroneSourceText, /Request timed out after/);
  assert.match(bpDroneSourceText, /HTTP '\+response\.status/);
  assert.match(bpDroneSourceText, /Invalid JSON response/);
  assert.match(bpDroneSourceText, /activationQueued/);
  assert.match(bpDroneSourceText, /function activateWhenStyleReady/);
  assert.match(bpDroneSourceText, /style\.load/);
  assert.doesNotMatch(bpDroneSourceText, /Press Drone Awareness again/);
  assert.match(bpDroneSourceText, /new droneThree\.LineBasicMaterial/);
  assert.doesNotMatch(bpDroneSourceText, /meters:24,known:false/);
  assert.doesNotMatch(bpDroneSourceText, /Math\.max\(altitude\.meters/);
  assert.doesNotMatch(bpDroneSourceText, /coordinates:points\.map\(p=>p\.coord\)/);
  assert.doesNotMatch(bpDroneSourceText, /adsb-lol-response-b6/);
}


// Live request, MapLibre retry, source-status, clustering and datum-specific 3D regressions.
{
  const {readFileSync:readDroneV4}=await import('node:fs');
  const sourceV4=readDroneV4(new URL('../rebuild-v5000/bridgepoint-drone-awareness-v1.js',import.meta.url),'utf8');
  const fixtureV4=JSON.parse(readDroneV4(new URL('./fixtures/adsb-lol-response-b6.json',import.meta.url),'utf8'));
  const helperStartV4=sourceV4.indexOf('const DroneCore=(()=>{');
  const helperEndV4=sourceV4.indexOf('})();',helperStartV4)+4;
  const helperV4=sourceV4.slice(helperStartV4,helperEndV4);
  const coreV4=new Function("const SUPPORTED_SOURCE='https://api.adsb.lol/v2/';const REGION_RADIUS_NM=250;\n"+helperV4+"\nreturn DroneCore;")();

  let requestedUrlV4=null,requestOptionsV4=null;
  const responseV4=await coreV4.requestSample({id:'Fixture hub',lat:40.7,lon:-74},async(url,options)=>{
    requestedUrlV4=url;requestOptionsV4=options;
    return{ok:true,status:200,statusText:'OK',text:async()=>JSON.stringify(fixtureV4)};
  },undefined);
  assert.equal(requestedUrlV4,'https://api.adsb.lol/v2/lat/40.7000/lon/-74.0000/dist/250','live request helper sends the exact documented URL');
  assert.equal(requestOptionsV4.method,'GET');
  assert.equal(requestOptionsV4.headers.Accept,'application/json');
  assert.equal(responseV4.records.length,4,'HTTP response body is parsed from the real ac fixture');
  assert.equal(responseV4.records[0].category,'B6');
  await assert.rejects(
    coreV4.requestSample({lat:40.7,lon:-74},async()=>({ok:false,status:429,statusText:'Too Many Requests',text:async()=>'slow down'})),
    /HTTP 429 Too Many Requests/,
    'HTTP failures are surfaced and not converted to an empty aircraft array'
  );
  await assert.rejects(
    coreV4.requestSample({lat:40.7,lon:-74},async()=>({ok:true,status:200,statusText:'OK',text:async()=>'not-json'})),
    /Invalid JSON response/,
    'malformed JSON remains an explicit parser error'
  );

  const geometricV4=coreV4.altitudeForRecord({alt_geom:1200,alt_baro:1100});
  assert.equal(geometricV4.projectable,true);
  assert.equal(geometricV4.datum,'geometric');
  const barometricV4=coreV4.altitudeForRecord({alt_baro:900});
  assert.equal(barometricV4.known,true,'a reported barometric altitude remains available as source data');
  assert.equal(barometricV4.projectable,false,'barometric feet are not misrepresented as geometric height');
  assert.equal(barometricV4.datum,'barometric');
  assert.equal(barometricV4.sourceField,'alt_baro');
  assert.equal(coreV4.project3DPoint(coreV4.createTrailPoint({hex:'baro1',lat:1,lon:2,alt_baro:900}),{fromLngLat:()=>({x:0,y:0,z:1})}),null);
  assert.equal(coreV4.project3DPoint(coreV4.createTrailPoint({hex:'ground1',lat:1,lon:2,alt_geom:'ground',alt_baro:800}),{fromLngLat:()=>({x:0,y:0,z:1})}),null,'ground/unknown geometric height is not raised to an invented 3D altitude');

  const usableMapStartV4=sourceV4.indexOf('function isMapStyleUsable(');
  const usableMapEndV4=sourceV4.indexOf('\nfunction mapStyleReady()',usableMapStartV4);
  assert.ok(usableMapStartV4>=0&&usableMapEndV4>usableMapStartV4,'stable MapLibre readiness predicate exists');
  const isMapStyleUsableV4=new Function(sourceV4.slice(usableMapStartV4,usableMapEndV4)+'\nreturn isMapStyleUsable;')();
  const canvasReadyV4={width:640};
  const mapReadyDespitePendingSourcesV4={getStyle:()=>({layers:[{id:'background'}]}),getCanvas:()=>canvasReadyV4,addSource(){},addLayer(){},isStyleLoaded:()=>false};
  assert.equal(isMapStyleUsableV4(mapReadyDespitePendingSourcesV4),true,'a live canvas and real loaded style layers permit activation even while isStyleLoaded is held false by pending sources');
  assert.equal(isMapStyleUsableV4({getStyle:()=>({layers:[]}),getCanvas:()=>canvasReadyV4,addSource(){},addLayer(){}}),false,'an empty style does not trigger early activation');
  assert.equal(isMapStyleUsableV4({getStyle:()=>({layers:[{id:'background'}]}),getCanvas:()=>({width:0}),addSource(){},addLayer(){}}),false,'a zero-size canvas remains queued until the globe is actually visible');
  const retryStartV4=sourceV4.indexOf('function bindMapStyleRetry(');
  const retryEndV4=sourceV4.indexOf('\nfunction installLayer()',retryStartV4);
  assert.ok(retryStartV4>=0&&retryEndV4>retryStartV4,'MapLibre readiness retry helper exists');
  const retryHelperV4=sourceV4.slice(retryStartV4,retryEndV4);
  const bindRetryV4=new Function(retryHelperV4+'\nreturn bindMapStyleRetry;')();
  const listenersV4=new Map();let readyV4=false,activationsV4=0;
  const fakeMapV4={on:(name,fn)=>{const bucket=listenersV4.get(name)||[];bucket.push(fn);listenersV4.set(name,bucket)},off:(name,fn)=>listenersV4.set(name,(listenersV4.get(name)||[]).filter(x=>x!==fn))};
  const disposeRetryV4=bindRetryV4(fakeMapV4,()=>readyV4,()=>{activationsV4++});
  for(const fn of listenersV4.get('load')||[])fn();
  assert.equal(activationsV4,0,'first button/map event before style readiness does not try to install layers');
  readyV4=true;
  for(const fn of listenersV4.get('style.load')||[])fn();
  assert.equal(activationsV4,1,'style.load automatically retries the queued activation');
  for(const fn of listenersV4.get('idle')||[])fn();
  assert.equal(activationsV4,2,'later idle checks are safe; activation itself is idempotent');
  disposeRetryV4();
  assert.ok([...(listenersV4.values())].every(list=>list.length===0),'style readiness listeners can be removed');

  assert.match(sourceV4,/sourceStatus:'idle'/);
  assert.match(sourceV4,/liveReady\?diagnosticState\.currentPositionsAccepted:'—'/);
  assert.match(sourceV4,/No UAV count is available; 0 would be misleading/);
  assert.match(sourceV4,/cluster:true/);
  assert.match(sourceV4,/point_count_abbreviated/);
  assert.match(sourceV4,/MAX_TRACKED_DRONES=1200/);
  assert.match(sourceV4,/MAX_CLOSE_ZOOM_MODELS=120/);
  assert.match(sourceV4,/scheduleViewportRefresh\(\)/);
  assert.match(sourceV4,/trailLayerReady:!!droneTrailGroup/);
  assert.match(sourceV4,/drone3DRendererReady:!!droneRenderer&&!!droneScene/);
  assert.match(sourceV4,/diagnosticState\.invalidOrStaleRecords=rejected/);
  assert.match(sourceV4,/altitudeProjectable/);
  assert.doesNotMatch(sourceV4,/Press Drone Awareness again/);
  assert.doesNotMatch(sourceV4,/meters:24,known:false/);
  assert.doesNotMatch(sourceV4,/Math\.max\(altitude\.meters/);
  assert.doesNotMatch(sourceV4,/return\{meters:3,known:true\}/);
  assert.doesNotMatch(sourceV4,/SIM_FLEET_COUNT|simulatedFleetFeatureCollection/);
  assert.match(sourceV4,/Remote ID: NOT CONNECTED/);
}
