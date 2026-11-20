import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../rebuild-v5000/bridgepoint-spacecraft-ten-pads-v2.js',import.meta.url),'utf8');
const module=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(src));
const sites=module.SPACECRAFT_TEN_LAUNCH_PADS;
assert.equal(sites.length,10,'exactly 10 additive launch pads');
const names=new Set(),ids=new Set(),coords=new Set();
const existing=[[-80.620869,28.627306],[-80.6041,28.6082],[-77.019,38.887],[-77.444,38.910]];
for(const s of sites){
 assert.ok(s.name&&s.pad&&s.location&&s.rocket,'complete card facts');
 assert.ok(typeof s.id==='string'&&s.id.length>8);
 assert.ok(!ids.has(s.id),'no duplicate ids: '+s.id); ids.add(s.id);
 assert.ok(!names.has(s.name),'no duplicate scenes: '+s.name);names.add(s.name);
 assert.equal(s.coordinates.length,2);
 const [lon,lat]=s.coordinates;
 assert.ok(Number.isFinite(lon)&&Math.abs(lon)<=180);
 assert.ok(Number.isFinite(lat)&&Math.abs(lat)<=90);
 const key=lon.toFixed(5)+','+lat.toFixed(5);
 assert.ok(!coords.has(key),'no duplicate coordinates');coords.add(key);
 assert.ok(existing.every(([x,y])=>Math.hypot(x-lon,y-lat)>0.005),'must not duplicate existing spacecraft');
 assert.ok(s.rocketHeightM>=18&&s.rocketHeightM<=125,'published true-metre scale');
 assert.ok(s.padWidthM>2*s.rocketRadiusM,'platform contains rocket');
 assert.ok(s.towerHeightM>s.rocketHeightM,'upright service structure');
 assert.ok([0,2,4].includes(s.boosters),'explicit booster configurations');
 assert.match(s.source,/^https:\/\//);
 assert.match(s.vehicleSource,/^https:\/\//);
}
assert.equal(sites.filter(s=>s.rocket==='SpaceX Falcon 9').length,2);
assert.equal(sites.filter(s=>s.tower==='catch').length,1);
for(const needle of ['initSpacecraftTenPadsRenderer','new Marker','data-spacecraft-ten-viewer','getMatrixForModel','queryTerrainElevation','bp-spacecraft-toggle-v1','mountViewer','buildSpacecraftLaunchPadScene','not a scan','style.load']){
 assert.ok(src.includes(needle),'required integration: '+needle);
}
const landing=readFileSync(new URL('../rebuild-v5000/landing.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../rebuild-v5000/app.js',import.meta.url),'utf8');
assert.ok(landing.includes('initSpacecraftTenPadsRenderer'), 'mobile and desktop entry imports');
assert.ok(app.includes('initSpacecraftTenPadsRenderer'), 'app entry import');
for(const rel of ['bridgepoint-spacecraft-v1.js','bridgepoint-spacecraft-columbia-v1.js','bridgepoint-spacecraft-discovery-v1.js','bridgepoint-spacecraft-saturn-v1.js']){
 assert.ok(landing.includes(rel)&&app.includes(rel),'existing spacecraft preserved: '+rel);
}
console.log('SPACECRAFT_TEN_PADS_V2_PASS: 10 unique pads, scales, controls, local viewer, native map integration and four previous spacecraft preserved');
