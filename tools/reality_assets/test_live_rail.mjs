import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(here, '../../rebuild-v5000/bridgepoint-live-rail-v5969.js');
const source = readFileSync(sourcePath, 'utf8');

const window = { addEventListener() {} };
const document = {
  readyState: 'complete',
  documentElement: null,
  getElementById() { return null; },
  addEventListener() {}
};
const context = {
  window,
  document,
  console: { warn() {}, log() {}, error() {} },
  URL,
  URLSearchParams,
  setTimeout() { return 1; },
  clearTimeout() {}
};
vm.runInNewContext(source, context, { filename: sourcePath });

const api = window.__BP_LIVE_RAIL_V5969__;
assert.ok(api, 'module exposes its testable API');
assert.equal(api.version, 5969);
assert.equal(api.enabledByDefault, false, 'live requests must be opt-in');
assert.equal(api.refreshIntervalMs, 60000, 'public, keyless source is polled no more than once per minute');
assert.equal(api.freshnessLimitMs, 180000, 'positions older than three minutes are rejected');

const now = Date.parse('2026-10-19T21:00:00Z');
const recent = new Date(now - 30000).toISOString();
const stale = new Date(now - 240000).toISOString();
const payload = {
  data: [
    {
      type: 'vehicle',
      id: 'B-test-123',
      attributes: {
        label: '0702',
        latitude: 42.36115,
        longitude: -71.06208,
        bearing: 105,
        speed: null,
        current_status: 'STOPPED_AT',
        updated_at: recent
      },
      relationships: {
        route: { data: { type: 'route', id: 'Blue' } },
        trip: { data: { type: 'trip', id: 'trip-1' } }
      }
    },
    {
      type: 'vehicle',
      id: 'B-test-stale',
      attributes: {
        label: 'stale',
        latitude: 42.36,
        longitude: -71.06,
        current_status: 'IN_TRANSIT_TO',
        updated_at: stale
      },
      relationships: {
        route: { data: { type: 'route', id: 'Blue' } },
        trip: { data: { type: 'trip', id: 'trip-1' } }
      }
    },
    {
      type: 'vehicle',
      id: 'B-test-no-coordinates',
      attributes: { label: 'invalid', latitude: null, longitude: null, updated_at: recent },
      relationships: { route: { data: { type: 'route', id: 'Blue' } } }
    }
  ],
  included: [
    {
      type: 'route',
      id: 'Blue',
      attributes: { long_name: 'Blue Line', short_name: '', color: '003DA5', type: 1 }
    },
    {
      type: 'trip',
      id: 'trip-1',
      attributes: { headsign: 'Wonderland', direction_id: 1 }
    }
  ]
};

const snapshot = api.parseSnapshot(payload, now);
assert.equal(snapshot.sourceCount, 3);
assert.equal(snapshot.features.length, 1, 'stale and invalid coordinates must not render');
assert.equal(snapshot.ignoredStale, 1);
assert.equal(snapshot.features[0].properties.routeName, 'Blue Line');
assert.equal(snapshot.features[0].properties.headsign, 'Wonderland');
assert.equal(snapshot.features[0].properties.routeColor, '#003DA5');
assert.equal(snapshot.features[0].properties.source, 'MBTA_V3_API');

const empty = api.parseSnapshot({ data: [], included: [] }, now);
assert.equal(empty.features.length, 0, 'empty source result stays empty; no placeholders are created');

// Motion is derived only across distinct, timestamped source reports; no simulated speed.
const motionState = { motionHistory: new Map() };
const t1 = Date.parse('2026-10-19T20:59:00Z');
const t2 = Date.parse('2026-10-19T20:59:30Z');
const makeFeature = (longitude, updatedAt) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [longitude, 42.36] },
  properties: {
    vehicleId: 'B-motion-1',
    updatedAt: new Date(updatedAt).toISOString(),
    speedMps: null,
    bearing: null
  }
});
const firstMotion = { features: [makeFeature(-71.060, t1)] };
api.enrichVehicleMotion(firstMotion, motionState);
assert.equal(firstMotion.features[0].properties.speedMph, null, 'no prior report means no inferred speed');
const secondMotion = { features: [makeFeature(-71.059, t2)] };
api.enrichVehicleMotion(secondMotion, motionState);
assert.ok(secondMotion.features[0].properties.speedMph > 4 &&
  secondMotion.features[0].properties.speedMph < 10, 'timestamped displacement should yield a plausible measured mph value');
assert.equal(secondMotion.features[0].properties.speedSource, 'OBSERVED_BETWEEN_SOURCE_REPORTS');
assert.ok(Math.abs(secondMotion.features[0].properties.effectiveBearingDegrees - 90) < 3,
  'observed eastbound movement should yield eastbound heading');
assert.equal(api.getFeatures('no-such-map').length, 0);
assert.equal(api.setDisplayMode('no-such-map', 'mesh'), false, 'mesh mode only applies to an attached map');

assert.throws(
  () => api.parseSnapshot({ included: [] }, now),
  /expected JSON:API vehicle format/
);

console.log('Live rail data and motion tests passed.');
