import assert from 'node:assert/strict';
import { SPACECRAFT_COLUMBIA, SPACECRAFT_COLUMBIA_ASSETS, resolveColumbiaScanTransform } from '../rebuild-v5000/bridgepoint-spacecraft-columbia-v1.js';

const model=SPACECRAFT_COLUMBIA;
assert.equal(model.id,'apollo-11-command-module-columbia-smithsonian');
assert.deepEqual(model.coordinates,[-77.0199,38.8882]);
assert.equal(model.inventoryNumber,'A19700102000');
assert.equal(model.manufacturer,'North American Rockwell');
assert.equal(model.scanHeightM,2.718);
const cmScan=resolveColumbiaScanTransform({x:391.2,y:250,z:271.8});
assert.equal(cmScan.axis,'z','the measured height may be on Z in the source GLB');
assert.equal(cmScan.units,'cm');
assert.equal(cmScan.scale,0.01);
assert.equal(cmScan.heightM,2.718);
const metreScan=resolveColumbiaScanTransform({x:3.912,y:2.718,z:2.5});
assert.equal(metreScan.axis,'y');
assert.equal(metreScan.units,'m');
assert.equal(metreScan.scale,1);
assert.equal(metreScan.heightM,2.718);
assert.throws(()=>resolveColumbiaScanTransform({x:1,y:5,z:8}),/do not match its published/);
assert.match(model.sourceLicense,/CC0/);
assert.match(model.sourceMethod,/Smithsonian/i);
assert.match(model.placementPrecision,/not a survey-controlled indoor position/i);
assert.equal(SPACECRAFT_COLUMBIA_ASSETS.length,1);
assert.ok(SPACECRAFT_COLUMBIA_ASSETS.every(path=>path.startsWith('/assets/spacecraft/')));
assert.ok(SPACECRAFT_COLUMBIA_ASSETS.every(path=>path.endsWith('.glb')));
assert.ok(SPACECRAFT_COLUMBIA_ASSETS[0].includes('exterior-combined'));

const source=await (await import('node:fs/promises')).readFile(
 new URL('../rebuild-v5000/bridgepoint-spacecraft-columbia-v1.js',import.meta.url),'utf8'
);
assert.match(source,/bp-spacecraft-toggle-v1/,'Columbia must share the existing Spacecraft toggle');
assert.match(source,/bp-spacecraft-columbia-marker-v1/,'Columbia needs its own persistent marker');
assert.match(source,/new Marker\(\{element,anchor:'center',offset:\[0,0\]\}\)/);
assert.match(source,/data-bp-local-spacecraft-viewer/,'card must use a BridgePoint-local viewer');
assert.match(source,/new THREE\.WebGLRenderer/);
assert.match(source,/parseAsync\(buffer,''\)/);
assert.match(source,/resolveColumbiaScanTransform\\(sourceDimensions/,'GLB units and vertical source axis must be detected from its bounds');
assert.match(source,/setFromUnitVectors\\(sourceUp/,'the measured source height axis must be aligned to vertical');
assert.match(source,/root\\.scale\\.setScalar\\(transform\\.scale\\)/,'the source units must be normalized to metres');
assert.doesNotMatch(source,/dimensions\\.y<2\\.4/,'do not assume the imported scan is already Y-up');
assert.match(source,/bp-spacecraft-columbia-native-v1/,'globe scan needs its own map layer');
assert.match(source,/Show 3D scan on the globe/);
assert.match(source,/Open Access.*CC0/);
assert.doesNotMatch(source,/<iframe|viewerUrl/i,'do not embed a third-party viewer');
console.log('BRIDGEPOINT_SPACECRAFT_COLUMBIA_V1_PASS');
