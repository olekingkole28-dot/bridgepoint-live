import assert from 'node:assert/strict';
import { SPACECRAFT_COLUMBIA, SPACECRAFT_COLUMBIA_ASSETS, resolveColumbiaScanTransform, computeColumbiaPrincipalFrame } from '../rebuild-v5000/bridgepoint-spacecraft-columbia-v1.js';

const model=SPACECRAFT_COLUMBIA;
assert.equal(model.id,'apollo-11-command-module-columbia-smithsonian');
assert.deepEqual(model.coordinates,[-77.0199,38.8882]);
assert.equal(model.inventoryNumber,'A19700102000');
assert.equal(model.manufacturer,'North American Rockwell');
assert.equal(model.scanHeightM,2.718);
const scan=resolveColumbiaScanTransform({x:471.017,y:416.148,z:423.069});
assert.equal(scan.units,'cm');
assert.equal(scan.scale,0.01);
assert.deepEqual(scan.dimensionsM.map(v=>Number(v.toFixed(3))),[4.710,4.161,4.231]);
assert.throws(()=>resolveColumbiaScanTransform({x:12,y:416,z:423}),/implausible after its documented/);

// A rotated rectangular scan must recover the principal 2.718 / 3.276 / 3.912 m axes,
// even when its raw axis-aligned bounds make all three dimensions look approximately 4 m.
const dimensions=[391.2,327.6,271.8];
const ax=0.63,ay=0.47,az=-0.31;
const cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay),cz=Math.cos(az),sz=Math.sin(az);
const rotate=p=>{
 const x1=p[0],y1=cx*p[1]-sx*p[2],z1=sx*p[1]+cx*p[2];
 const x2=cy*x1+sy*z1,y2=y1,z2=-sy*x1+cy*z1;
 return [cz*x2-sz*y2,sz*x2+cz*y2,z2];
};
const corners=[];
for(const x of [-dimensions[0]/2,dimensions[0]/2])
 for(const y of [-dimensions[1]/2,dimensions[1]/2])
  for(const z of [-dimensions[2]/2,dimensions[2]/2])corners.push(rotate([x,y,z]));
const frame=computeColumbiaPrincipalFrame(corners,0.01);
const recovered=frame.extentsM.map(v=>Number(v.toFixed(3))).sort((a,b)=>a-b);
assert.deepEqual(recovered,[2.718,3.276,3.912]);
assert.equal(Number(frame.extentsM[frame.upIndex].toFixed(3)),3.276,
 'prefer the catalogue overall capsule-on-stand height when available');
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
assert.match(source,/resolveColumbiaScanTransform\(sourceDimensions/,'GLB units and vertical source axis must be detected from its bounds');
assert.match(source,/setFromUnitVectors\(sourceUp/,'the measured source height axis must be aligned to vertical');
assert.match(source,/root\.scale\.setScalar\(transform\.scale\)/,'the source units must be normalized to metres');
assert.doesNotMatch(source,/dimensions\.y<2\.4/,'do not assume the imported scan is already Y-up');
assert.match(source,/bp-spacecraft-columbia-native-v1/,'globe scan needs its own map layer');
assert.match(source,/Show 3D scan on the globe/);
assert.match(source,/Open Access.*CC0/);
assert.doesNotMatch(source,/<iframe|viewerUrl/i,'do not embed a third-party viewer');
console.log('BRIDGEPOINT_SPACECRAFT_COLUMBIA_V1_PASS');
