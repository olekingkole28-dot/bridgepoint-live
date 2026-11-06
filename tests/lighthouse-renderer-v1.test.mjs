import assert from 'node:assert/strict';
import {
  normalizeLighthouseElement,
  parseLengthMetres,
  lighthouseProfile,
  solarElevationDegrees,
  isDarkAt
} from '../rebuild-v5000/bridgepoint-lighthouses-v1.js';

assert.equal(parseLengthMetres('24 m'), 24);
assert.equal(parseLengthMetres('40 ft'), 12.192);
assert.equal(parseLengthMetres('bad'), null);
assert.equal(parseLengthMetres('0'), null);

assert.equal(normalizeLighthouseElement({
  type:'node',id:1,lat:0,lon:0,tags:{amenity:'fuel'}
}), null);

const measured = normalizeLighthouseElement({
  type:'way', id:123, center:{lat:41.5,lon:-72.6},
  tags:{man_made:'lighthouse',name:'Harbor Light',height:'30 m',
    diameter:'7 m',colour:'white;red','seamark:light:period':'6',
    'seamark:light:colour':'yellow',ele:'4 m'}
});
assert.ok(measured);
assert.equal(measured.geometry.coordinates[0], -72.6);
assert.equal(measured.properties.heightM, 30);
assert.equal(measured.properties.measuredHeight, true);
assert.equal(measured.properties.diameterM, 7);
assert.equal(measured.properties.measuredDiameter, true);
assert.equal(measured.properties.periodSec, 6);
assert.equal(measured.properties.groundElevationM, 4);
assert.equal(measured.properties.palette[0], '#f1ead9');
assert.equal(measured.properties.palette[1], '#b64436');

const fallback = normalizeLighthouseElement({
  type:'node',id:456,lat:10,lon:20,tags:{'seamark:type':'light_major'}
});
assert.ok(fallback);
assert.equal(fallback.properties.heightM, 22);
assert.equal(fallback.properties.measuredHeight, false);
assert.ok(Math.abs(fallback.properties.diameterM - 5.28) < 0.001);
assert.equal(fallback.properties.measuredDiameter, false);
assert.equal(fallback.properties.source, 'OpenStreetMap contributors');

const profile = lighthouseProfile({});
assert.equal(profile.heightM, 22);
assert.equal(profile.measuredHeight, false);
assert.deepEqual(profile.palette, ['#f1ead9', '#b64436']);

const midday = new Date(Date.UTC(2026, 2, 20, 12, 0, 0));
const midnight = new Date(Date.UTC(2026, 2, 20, 0, 0, 0));
assert.ok(solarElevationDegrees(0, 0, midday) > 80);
assert.ok(solarElevationDegrees(0, 0, midnight) < -80);
assert.equal(isDarkAt(0, 0, midday), false);
assert.equal(isDarkAt(0, 0, midnight), true);

console.log('BRIDGEPOINT_LIGHTHOUSE_RENDERER_V1_PASS');
