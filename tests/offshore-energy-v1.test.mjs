import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  parseMetres,
  offshoreIconFor,
  offshoreRenderModeForZoom,
  normalizeNoaaPlatform,
  normalizeOffshoreOsmElement
} from '../rebuild-v5000/bridgepoint-offshore-energy-v1.js';

assert.equal(parseMetres('30 m'), 30);
assert.equal(parseMetres('100 ft'), 30.48);
assert.equal(parseMetres('bad'), null);
assert.equal(parseMetres('-4 m'), null);
assert.equal(offshoreIconFor('gas'), 'gas');
assert.equal(offshoreIconFor('oil'), 'oil');
assert.equal(offshoreIconFor('water'), 'water');
assert.equal(offshoreIconFor('platform'), 'platform');

assert.equal(offshoreRenderModeForZoom(0), 'global-icons');
assert.equal(offshoreRenderModeForZoom(8.1), 'global-icons');
assert.equal(offshoreRenderModeForZoom(8.2), 'polygon-footprint');
assert.equal(offshoreRenderModeForZoom(12.2), '3d-platform');

const noaa = normalizeNoaaPlatform({
  type: 'Feature',
  id: 7,
  geometry: { type: 'Point', coordinates: [-90.1, 28.2] },
  properties: {
    objectid: 7, platformid: 'A-101', platformname: 'Example Platform',
    platformtype: 'Fixed Platform', operator: 'Example Operator',
    jurisdiction: 'Federal Waters', sourcerecord: 'NOAA/HIFLD'
  }
});
assert.ok(noaa);
assert.equal(noaa.properties.modelType, 'platform');
assert.equal(noaa.properties.name, 'Example Platform');
assert.equal(noaa.properties.platformId, 'A-101');
assert.equal(noaa.properties.measuredLength, false);
assert.equal(noaa.properties.measuredDepth, false);
assert.equal(noaa.properties.dimensionsNote.includes('estimates'), true);

assert.equal(normalizeNoaaPlatform({
  type: 'Feature', geometry: {type:'Point',coordinates:[0,0]}, properties: {}
}), null);

assert.equal(normalizeOffshoreOsmElement({
  type:'node',id:1,lat:30,lon:-90,tags:{man_made:'oil_well'}
}), null, 'an onshore/unspecified well must not be invented as offshore');

const gasWell = normalizeOffshoreOsmElement({
  type:'node',id:2,lat:28.4,lon:-90.4,
  tags:{man_made:'gas_well',offshore:'yes',name:'Subsea Gas Well',operator:'Example Energy','water_depth':'90 m'}
});
assert.ok(gasWell);
assert.equal(gasWell.properties.kind,'gas');
assert.equal(gasWell.properties.modelType,'well');
assert.equal(gasWell.properties.assetIcon,'gas');
assert.equal(gasWell.properties.measuredDepth,true);
assert.equal(gasWell.properties.waterDepthM,90);

const waterWell = normalizeOffshoreOsmElement({
  type:'node',id:3,lat:28.5,lon:-90.5,tags:{man_made:'well',location:'seabed'}
});
assert.ok(waterWell);
assert.equal(waterWell.properties.kind,'water');
assert.equal(waterWell.properties.assetIcon,'water');

const platformWay = normalizeOffshoreOsmElement({
  type:'way',id:4,center:{lat:57.2,lon:2.1},
  tags:{man_made:'offshore_platform',name:'North Sea Platform'}
});
assert.ok(platformWay);
assert.equal(platformWay.properties.modelType,'platform');

console.log('BRIDGEPOINT_OFFSHORE_ENERGY_V1_PASS');

const [landing, app, deploy] = await Promise.all([
  readFile(new URL('../rebuild-v5000/landing.js', import.meta.url), 'utf8'),
  readFile(new URL('../rebuild-v5000/app.js', import.meta.url), 'utf8'),
  readFile(new URL('../.github/workflows/deploy-intelligence-rebuild-v5000.yml', import.meta.url), 'utf8')
]);
assert.ok(landing.includes("import('./bridgepoint-offshore-energy-v1.js?v=1-noaa-hifld-global-osm')"));
assert.ok(app.includes("import('./bridgepoint-offshore-energy-v1.js?v=1-noaa-hifld-global-osm')"));
assert.ok(deploy.includes("cp rebuild-v5000/bridgepoint-offshore-energy-v1.js site/bridgepoint-offshore-energy-v1.js"));
assert.ok(deploy.includes("cp rebuild-v5000/bridgepoint-offshore-energy-v1.js site/app/bridgepoint-offshore-energy-v1.js"));
assert.ok(deploy.includes("node tests/offshore-energy-v1.test.mjs"));
assert.ok(deploy.includes("'tests/offshore-energy-v1.test.mjs'"));
console.log('BRIDGEPOINT_OFFSHORE_ENERGY_ROOT_APP_DEPLOY_PASS');

