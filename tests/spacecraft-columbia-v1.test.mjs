import assert from 'node:assert/strict';
import { SPACECRAFT_COLUMBIA, SPACECRAFT_COLUMBIA_ASSETS } from '../rebuild-v5000/bridgepoint-spacecraft-columbia-v1.js';

const model=SPACECRAFT_COLUMBIA;
assert.equal(model.id,'apollo-11-command-module-columbia-smithsonian');
assert.deepEqual(model.coordinates,[-77.0199,38.8882]);
assert.equal(model.inventoryNumber,'A19700102000');
assert.equal(model.manufacturer,'North American Rockwell');
assert.equal(model.scanHeightM,2.718);
assert.match(model.sourceLicense,/CC0/);
assert.match(model.sourceMethod,/Smithsonian/i);
assert.match(model.placementPrecision,/not a survey-controlled indoor position/i);
assert.equal(SPACECRAFT_COLUMBIA_ASSETS.length,3);
assert.ok(SPACECRAFT_COLUMBIA_ASSETS.every(path=>path.startsWith('/assets/spacecraft/')));
assert.ok(SPACECRAFT_COLUMBIA_ASSETS.every(path=>path.endsWith('.glb')));
assert.ok(SPACECRAFT_COLUMBIA_ASSETS[0].includes('exterior-shell'));
assert.ok(SPACECRAFT_COLUMBIA_ASSETS[1].includes('exterior-top'));
assert.ok(SPACECRAFT_COLUMBIA_ASSETS[2].includes('exterior-filler'));

const source=await (await import('node:fs/promises')).readFile(
 new URL('../rebuild-v5000/bridgepoint-spacecraft-columbia-v1.js',import.meta.url),'utf8'
);
assert.match(source,/bp-spacecraft-toggle-v1/,'Columbia must share the existing Spacecraft toggle');
assert.match(source,/bp-spacecraft-columbia-marker-v1/,'Columbia needs its own persistent marker');
assert.match(source,/new Marker\(\{element,anchor:'center',offset:\[0,0\]\}\)/);
assert.match(source,/data-bp-local-spacecraft-viewer/,'card must use a BridgePoint-local viewer');
assert.match(source,/new THREE\.WebGLRenderer/);
assert.match(source,/parseAsync\(buffer,''\)/);
assert.match(source,/root\.scale\.setScalar\(0\.01\)/,'Smithsonian package coordinates are centimeters');
assert.match(source,/bp-spacecraft-columbia-native-v1/,'globe scan needs its own map layer');
assert.match(source,/Show 3D scan on the globe/);
assert.match(source,/Open Access CC0/);
assert.doesNotMatch(source,/<iframe|viewerUrl/i,'do not embed a third-party viewer');
console.log('BRIDGEPOINT_SPACECRAFT_COLUMBIA_V1_PASS');
