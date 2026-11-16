import assert from 'node:assert/strict';
import {
  JENOLAN_CAVES_SITE_V1,
  buildJenolanCavesFeature,
  decodeJenolanPointCloud
} from '../rebuild-v5000/bridgepoint-jenolan-caves-v1.js';

const feature=buildJenolanCavesFeature();
assert.equal(feature.type,'Feature');
assert.equal(feature.properties.siteId,JENOLAN_CAVES_SITE_V1.id);
assert.deepEqual(feature.geometry.coordinates,JENOLAN_CAVES_SITE_V1.coordinates);
assert.equal(JENOLAN_CAVES_SITE_V1.caveTraverseKm,17.1);
assert.equal(JENOLAN_CAVES_SITE_V1.license,'CC BY-SA 3.0');
assert.match(JENOLAN_CAVES_SITE_V1.locationPrecision,/not point-by-point GNSS/i);

const count=2,sourceCount=1234;
const header=Buffer.alloc(16);
header.write('BPC1',0,'ascii');
header.writeUInt32LE(count,4);
header.writeUInt32LE(sourceCount,8);
header.writeUInt32LE(1,12);
const positions=Buffer.from(new Float32Array([1,2,3,4,5,6]).buffer);
const colors=Buffer.from([12,24,36,48,60,72]);
const bytes=Buffer.concat([header,positions,colors]);
const decoded=decodeJenolanPointCloud(bytes);
assert.equal(decoded.count,count);
assert.equal(decoded.sourceCount,sourceCount);
assert.deepEqual(Array.from(decoded.positions),[1,2,3,4,5,6]);
assert.deepEqual(Array.from(decoded.colors),Array.from(colors));
const badHeader=Buffer.alloc(16);badHeader.write('NOPE',0,'ascii');
assert.throws(()=>decodeJenolanPointCloud(badHeader),/header is invalid/i);
assert.throws(()=>decodeJenolanPointCloud(Buffer.from('BPC1')),/truncated/i);
console.log('BRIDGEPOINT_JENOLAN_CAVES_V1_PASS',feature.geometry.coordinates);
