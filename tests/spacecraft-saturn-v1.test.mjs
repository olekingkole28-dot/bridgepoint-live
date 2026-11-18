import assert from 'node:assert/strict';
import {
 SPACECRAFT_SATURN,SPACECRAFT_SATURN_ASSETS,resolveSaturnSourceFit
} from '../rebuild-v5000/bridgepoint-spacecraft-saturn-v1.js';
import { readFile } from 'node:fs/promises';

assert.equal(SPACECRAFT_SATURN.id,'nasa-saturn-v-launch-complex-39a');
assert.deepEqual(SPACECRAFT_SATURN.coordinates,[-80.6041,28.6082]);
assert.equal(SPACECRAFT_SATURN.heightM,111);
assert.equal(SPACECRAFT_SATURN.heightFt,363);
assert.equal(SPACECRAFT_SATURN.stages,3);
assert.equal(SPACECRAFT_SATURN.apollo11LaunchDate,'July 16, 1969');
assert.match(SPACECRAFT_SATURN.sourceMethod,/NASA 3D Resources/);
assert.match(SPACECRAFT_SATURN.sourceMethod,/not photogrammetry scans/);
assert.match(SPACECRAFT_SATURN.placementPrecision,/survey-grade reconstruction/);
assert.equal(SPACECRAFT_SATURN_ASSETS.length,2);
assert.ok(SPACECRAFT_SATURN_ASSETS.every(path=>path.startsWith('/assets/spacecraft/')&&path.endsWith('.glb')));
assert.match(SPACECRAFT_SATURN_ASSETS[0],/nasa-saturn-v\.glb/);
assert.match(SPACECRAFT_SATURN_ASSETS[1],/nasa-gantry\.glb/);

const fit=resolveSaturnSourceFit({x:2.4,y:111,z:2.4},111);
assert.equal(fit.upAxis,1);
assert.equal(fit.scale,1);
assert.equal(resolveSaturnSourceFit({x:111,y:2.4,z:2.4},111).upAxis,0);
assert.equal(Number(resolveSaturnSourceFit({x:20,y:25,z:100},111).scale.toFixed(3)),1.11);
assert.throws(()=>resolveSaturnSourceFit({x:0,y:2,z:3},111),/invalid source bounds/);

const source=await readFile(new URL('../rebuild-v5000/bridgepoint-spacecraft-saturn-v1.js',import.meta.url),'utf8');
assert.match(source,/bp-spacecraft-toggle-v1/,'Saturn V must share the Spacecraft toggle');
assert.match(source,/bp-spacecraft-saturn-marker-v1/,'Saturn V needs a persistent independent marker');
assert.match(source,/new Marker\(\{element,anchor:'center',offset:\[0,0\]\}\)/);
assert.match(source,/data-bp-local-spacecraft-viewer/,'the model must use a BridgePoint-local viewer');
assert.match(source,/new THREE\.WebGLRenderer/);
assert.match(source,/parseAsync\(buffer,''\)/);
assert.match(source,/bp-spacecraft-saturn-native-v1/,'the launch scene uses its own native globe layer');
assert.match(source,/Show launch scene on the globe/);
assert.match(source,/NASA 3D-resource models, not photogrammetry scans/);
assert.match(source,/nasa-saturn-v\.glb/);
assert.match(source,/nasa-gantry\.glb/);
assert.doesNotMatch(source,/<iframe|viewerUrl/i,'do not embed a third-party viewer');
console.log('BRIDGEPOINT_SPACECRAFT_SATURN_V1_PASS');
