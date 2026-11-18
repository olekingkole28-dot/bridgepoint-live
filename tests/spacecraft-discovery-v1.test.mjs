import assert from 'node:assert/strict';
import {
 SPACECRAFT_DISCOVERY,SPACECRAFT_DISCOVERY_ASSETS,
 resolveDiscoveryScanTransform,computeDiscoveryPrincipalFrame
} from '../rebuild-v5000/bridgepoint-spacecraft-discovery-v1.js';
import { readFile } from 'node:fs/promises';

const model=SPACECRAFT_DISCOVERY;
assert.equal(model.id,'space-shuttle-orbiter-ov103-discovery-smithsonian');
assert.deepEqual(model.coordinates,[-77.44441,38.91084]);
assert.equal(model.inventoryNumber,'A20120325000');
assert.equal(model.manufacturer,'Rockwell International Corporation');
assert.equal(model.scanHeightM,17.768);
assert.equal(model.massKg,73176.5);
assert.equal(model.flightDays,365);
assert.equal(model.totalDistanceKm,240000000);
assert.match(model.sourceLicense,/CC0/);
assert.match(model.sourceLicense,/copied, modified, and distributed/i);
assert.match(model.sourceMethod,/150,000-face/);
assert.match(model.sourceMethod,/4096-pixel texture/);
assert.match(model.sourceMethod,/model units as metres/);
assert.match(model.placementPrecision,/not an indoor survey-controlled placement/i);

const transform=resolveDiscoveryScanTransform({x:31.867,y:28.018,z:16.952});
assert.equal(transform.units,'m');
assert.equal(transform.scale,1);
assert.deepEqual(transform.dimensionsM,[31.867,28.018,16.952]);
assert.throws(()=>resolveDiscoveryScanTransform({x:3,y:28,z:17}),/implausible after its documented metre-unit conversion/);

// A rotated shuttle envelope must recover the Smithsonian catalogue dimensions from its principal axes.
const dimensions=[38.03,24.314,17.768];
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
const frame=computeDiscoveryPrincipalFrame(corners,1);
const recovered=frame.extentsM.map(v=>Number(v.toFixed(3))).sort((a,b)=>a-b);
assert.deepEqual(recovered,[17.768,24.314,38.03]);
assert.equal(Number(frame.extentsM[frame.upIndex].toFixed(3)),17.768,
 'the fitted vertical axis must agree with the Smithsonian overall height');

assert.equal(SPACECRAFT_DISCOVERY_ASSETS.length,1);
assert.ok(SPACECRAFT_DISCOVERY_ASSETS[0].startsWith('/assets/spacecraft/'));
assert.ok(SPACECRAFT_DISCOVERY_ASSETS[0].endsWith('.glb'));
assert.match(SPACECRAFT_DISCOVERY_ASSETS[0],/smithsonian-space-shuttle-discovery/);

const source=await readFile(new URL('../rebuild-v5000/bridgepoint-spacecraft-discovery-v1.js',import.meta.url),'utf8');
assert.match(source,/bp-spacecraft-toggle-v1/,'Discovery must share the existing Spacecraft toggle');
assert.match(source,/bp-spacecraft-discovery-marker-v1/,'Discovery needs a persistent independent marker');
assert.match(source,/new Marker\(\{element,anchor:'center',offset:\[0,0\]\}\)/);
assert.match(source,/data-bp-local-spacecraft-viewer/,'the model must use a BridgePoint-local viewer');
assert.match(source,/new THREE\.WebGLRenderer/);
assert.match(source,/parseAsync\(buffer,''\)/);
assert.match(source,/computeDiscoveryPrincipalFrame\(vertices,transform\.scale\)/);
assert.match(source,/root\.scale\.setScalar\(transform\.scale\)/,'the Smithsonian source metre units must be preserved');
assert.match(source,/bp-spacecraft-discovery-native-v1/,'the native globe mesh needs its own map layer');
assert.match(source,/Show 3D scan on the globe/);
assert.match(source,/Open Access.*CC0/);
assert.doesNotMatch(source,/<iframe|viewerUrl/i,'do not embed a third-party viewer');
assert.doesNotMatch(source,/centimetre|Apollo 11 Command Module/i);
console.log('BRIDGEPOINT_SPACECRAFT_DISCOVERY_V1_PASS');
