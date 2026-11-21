import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const modulePath = new URL('../release-v2300/world-v2300-seismic-layer-v1.js', import.meta.url);
const source = await readFile(modulePath, 'utf8');
const encoded = Buffer.from(source, 'utf8').toString('base64');
const { normalizeUSGSEarthquakeFeed, estimateEarthquakeImpactRadiusKm, extractShakeMapImpactBoundary, SEISMIC_FEED_URL, SEISMIC_REFRESH_MS, SEISMIC_MAX_FEATURES } =
  await import('data:text/javascript;base64,' + encoded);

const valid = {
  type: 'Feature',
  id: 'us7000-test01',
  properties: {
    mag: 4.3,
    place: '12 km NNW of Test City',
    time: 1_800_000_000_000,
    type: 'earthquake',
    url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us7000-test01',
    status: 'reviewed',
    tsunami: 0
  },
  geometry: { type: 'Point', coordinates: [-72.65, 41.56, 8.4] }
};

const payload = {
  type: 'FeatureCollection',
  metadata: { generated: 1_800_000_060_000, count: 6, title: 'USGS test feed' },
  features: [
    valid,
    { ...valid, id: 'us7000-test01' , properties: { ...valid.properties, mag: 3.1 } },
    { ...valid, properties: { ...valid.properties, mag: 2.4 } },
    { ...valid, id: 'quarry-blast', properties: { ...valid.properties, type: 'quarry blast' } },
    { ...valid, id: 'invalid-coordinate', geometry: { type: 'Point', coordinates: [181, 91, 3] } },
    { ...valid, id: 'missing-time', properties: { ...valid.properties, time: null } },
    { ...valid, id: 'missing-id', properties: { ...valid.properties }, id: '' }
  ]
};

const normalized = normalizeUSGSEarthquakeFeed(payload);
assert.equal(normalized.type, 'FeatureCollection');
assert.equal(normalized.metadata.source, 'USGS ComCat');
assert.equal(normalized.metadata.generated, payload.metadata.generated);
assert.equal(normalized.metadata.feedCount, payload.metadata.count);
assert.equal(normalized.features.length, 1, 'duplicate events, non-earthquakes, invalid records and sub-M2.5 points should be removed');

const first = normalized.features[0];
assert.equal(first.id, valid.id);
assert.deepEqual(first.geometry.coordinates, valid.geometry.coordinates, 'source coordinates and depth must be retained exactly');
assert.equal(first.properties.mag, 4.3);
assert.equal(first.properties.time, valid.properties.time);
assert.equal(first.properties.place, valid.properties.place);
assert.equal(first.properties.bp_depth_km, 8.4);
assert.equal(first.properties.url, valid.properties.url);
assert.ok(first.properties.bp_impact_radius_km > 0, 'every event gets an impact radius');
assert.equal(first.properties.bp_impact_estimated, true);
assert.equal(first.properties.bp_impact_method, 'Magnitude/depth estimate');
assert.ok(estimateEarthquakeImpactRadiusKm(6, 10) > estimateEarthquakeImpactRadiusKm(3, 10));
assert.ok(estimateEarthquakeImpactRadiusKm(4, 100) > estimateEarthquakeImpactRadiusKm(4, 0));
const contour = extractShakeMapImpactBoundary({features:[
  {type:'Feature',properties:{value:'2'},geometry:{type:'LineString',coordinates:[[-73,41],[-72.8,41.2],[-72.6,41],[-73,41]]}},
  {type:'Feature',properties:{value:'4'},geometry:{type:'LineString',coordinates:[[-72.95,41],[-72.8,41.1],[-72.7,41]]}}
]},[-73,41]);
assert.ok(contour && contour.radiusKm > 0, 'ShakeMap boundary extraction returns a measured radius');
assert.equal(contour.contourLevel, 2);

const noDepth = normalizeUSGSEarthquakeFeed({
  features: [{
    type: 'Feature', id: 'no-depth',
    properties: { mag: 2.5, type: 'earthquake', time: 1_800_000_000_000 },
    geometry: { type: 'Point', coordinates: [0, 0] }
  }]
});
assert.equal(noDepth.features.length, 1);
assert.deepEqual(noDepth.features[0].geometry.coordinates, [0, 0]);
assert.equal(noDepth.features[0].properties.bp_depth_km, undefined, 'missing depth must not be invented');

const capped = normalizeUSGSEarthquakeFeed({
  features: Array.from({ length: 20 }, (_, index) => ({
    type: 'Feature', id: 'event-' + index,
    properties: { mag: 3, type: 'earthquake', time: 1_800_000_000_000 },
    geometry: { type: 'Point', coordinates: [index, 0, 1] }
  }))
}, 5);
assert.equal(capped.features.length, 5, 'caller cap must be honored');
assert.equal(SEISMIC_MAX_FEATURES, 1500, 'hard feature cap remains bounded');

assert.equal(SEISMIC_FEED_URL,
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson');
assert.equal(SEISMIC_REFRESH_MS, 60_000, 'feed refresh cadence is one minute');

for (const token of [
  'bp-usgs-seismic-source-v1',
  'bp-usgs-seismic-impact-v1',
  'bp-usgs-seismic-boundary-source-v1',
  'bp-usgs-seismic-ripples-v1',
  'bp-usgs-seismic-impact-boundary-v1',
  'bp-usgs-seismic-ripple-lines-v1',
  'bp-usgs-seismic-global-pulse-v1',
  'bp-usgs-seismic-glow-v1',
  'bp-usgs-seismic-points-v1',
  'Named earthquakes · OFF',
  'data-bp-seismic-toggle',
  'state.enabled = next',
  'AbortController',
  'M2.5+ · PAST 7 DAYS · SOURCE OFF',
  'bpv-underground-slot',
  'https://earthquake.usgs.gov/earthquakes/eventpage/'
]) {
  assert.ok(source.includes(token), 'missing required source contract: ' + token);
}
assert.match(source, /enabled:\s*false/, 'layer must start switched off');
assert.doesNotMatch(source, /new\s+THREE\.|WebGLRenderer/, 'seismic overlay must reuse MapLibre and not create a second renderer');
assert.ok(source.indexOf("const addMapLayers = () => {") < source.indexOf("map.on?.('click', POINT_LAYER_ID, showPopup)"),
  'layer-scoped MapLibre interactions must only be bound after the source/layers are installed');
assert.match(source, /window\.setInterval\(\(\) => \{ void refresh\(\); \}, SEISMIC_REFRESH_MS\)/,
  'polling should begin only inside the explicit enable path');
assert.match(source, /if \(!state\.enabled \|\| state\.disposed \|\| state\.inFlight \|\| document\.hidden\) return false/,
  'disabled/hidden tabs must not poll');

const app = await readFile(new URL('../rebuild-v5000/app.js', import.meta.url), 'utf8');
const landing = await readFile(new URL('../rebuild-v5000/landing.js', import.meta.url), 'utf8');
assert.equal(app.split("world-v2300-seismic-layer-v1.js?v=1-usgs-comcat-m25-week").length - 1, 1,
  'app must load the new layer exactly once');
assert.equal(landing.split("world-v2300-seismic-layer-v1.js?v=1-usgs-comcat-m25-week").length - 1, 1,
  'homepage module bootstrap and desktop loader use the new cache key');

console.log('BRIDGEPOINT_USGS_SEISMIC_LAYER_V1_PASS', JSON.stringify({
  normalizedEvents: normalized.features.length,
  maxFeatures: SEISMIC_MAX_FEATURES,
  refreshMs: SEISMIC_REFRESH_MS,
  source: 'USGS ComCat M2.5+ past week'
}));
