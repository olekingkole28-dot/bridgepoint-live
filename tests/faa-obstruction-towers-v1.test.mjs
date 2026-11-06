import assert from 'node:assert/strict';
import {
  normalizeFAAObstructionRow,
  faaObstructionRenderModeForZoom,
  faaObstructionPopupHtml
} from '../rebuild-v5000/bridgepoint-faa-obstruction-towers-v1.js';

const lattice = normalizeFAAObstructionRow([
  '01-123456','US','CT','Middletown',41.55,-72.65,'TOWER',1,600,650,'O','R','5D','M','2026NEA00001OE','C','2026308'
]);
assert.ok(lattice);
assert.equal(lattice.id,'faa:01-123456');
assert.equal(lattice.properties.category,'lattice');
assert.equal(lattice.properties.aglFt,600);
assert.equal(lattice.properties.aglM,182.88);
assert.equal(lattice.properties.amslM,198.12);
assert.equal(lattice.properties.verification,'O');
assert.equal(lattice.properties.accuracy,'5D');

const transmission = normalizeFAAObstructionRow([
  '01-123457','US','CT','Middletown',41.56,-72.66,'T-L TWR',1,900,950,'U','R','5D','M','STUDY','A','2026308'
]);
assert.equal(transmission.properties.category,'transmission');
assert.equal(transmission.properties.verification,'U');
assert.equal(transmission.properties.markerColor,'#f4c66e');

const antenna = normalizeFAAObstructionRow([
  '01-123458','US','CT','Town',41.57,-72.67,'ANTENNA',1,300,350,'O','','','','','C','2026308'
]);
assert.equal(antenna.properties.category,'antenna');

const crane = normalizeFAAObstructionRow([
  '01-123461','US','CT','Town',41.58,-72.68,'CRANE',1,240,290,'U','','','','','A','2026308'
]);
assert.equal(crane.properties.category,'crane');
assert.equal(crane.properties.typeLabel,'Construction crane');

const buildingTower = normalizeFAAObstructionRow([
  '01-123459','US','CT','Town',41.57,-72.67,'BLDG-TWR',1,250,300,'O','','','','','C','2026308'
]);
assert.equal(buildingTower.properties.category,'building-lattice');

const controlTower = normalizeFAAObstructionRow([
  '01-123460','US','CT','Town',41.57,-72.67,'CTRL TWR',1,180,230,'O','','','','','C','2026308'
]);
assert.equal(controlTower.properties.category,'control-tower');

assert.equal(normalizeFAAObstructionRow([
  '01-000000','US','CT','Town',91,-72,'TOWER',1,300,350,'O','','','','','C','2026308'
]),null);
assert.ok(normalizeFAAObstructionRow([
  '01-000000','US','CT','Town',41,-72,'CRANE',1,300,350,'O','','','','','C','2026308'
]));
assert.equal(normalizeFAAObstructionRow([
  '01-000000','US','CT','Town',41,-72,'UTILITY POLE',1,300,350,'O','','','','','C','2026308'
]),null);

assert.equal(faaObstructionRenderModeForZoom(0),'global-tower-clusters');
assert.equal(faaObstructionRenderModeForZoom(5),'global-tower-clusters');
assert.equal(faaObstructionRenderModeForZoom(8),'ground-positioned-faa-tower-icons');
assert.equal(faaObstructionRenderModeForZoom(11.3),'ground-positioned-faa-tower-icons');
assert.equal(faaObstructionRenderModeForZoom(11.4),'reported-height-3d-towers');

const popup=faaObstructionPopupHtml(lattice);
assert.match(popup,/600 ft/);
assert.match(popup,/182\.9 m/);
assert.match(popup,/Verified by FAA/);
assert.match(popup,/not every tower or obstruction/);
assert.match(popup,/illustrative/);
assert.match(popup,/FAA DOF source and coverage notes/);
console.log('BRIDGEPOINT_FAA_OBSTRUCTION_TOWERS_V1_PASS');
