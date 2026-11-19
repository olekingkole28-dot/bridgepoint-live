import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {UNDERGROUND_SCAN_SITES,UNDERGROUND_SCAN_RIGHTS_HOLDS,buildUndergroundSiteFeatures,undergroundSitePopupHtml} from '../rebuild-v5000/bridgepoint-underground-scan-sites-v1.js';

const features=buildUndergroundSiteFeatures();
assert.equal(features.length,5,'five reviewed site anchors are mapped');
assert.equal(UNDERGROUND_SCAN_SITES.reduce((n,s)=>n+s.models.length,0),7,'seven real creator-hosted scans are cataloged');
assert.equal(UNDERGROUND_SCAN_RIGHTS_HOLDS.length,3,'rights/source holds are exposed');
assert.ok(features.every(f=>f.geometry.type==='Point'&&f.properties.iconImage));
assert.ok(UNDERGROUND_SCAN_SITES.every(s=>s.models.every(m=>m.uid&&m.creator&&m.license==='CC Attribution'&&m.modelUrl.startsWith('https://sketchfab.com/3d-models/'))));
assert.equal(UNDERGROUND_SCAN_SITES.find(s=>s.id==='paris-catacombs').models.length,3);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='vrlovka-cave').models[0].method,/LiDAR/i);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='om-jaettestue').locationNote,/not a natural cave/i);
const treak=UNDERGROUND_SCAN_SITES.find(s=>s.id==='treak-cliff-cavern');
assert.ok(treak&&treak.type==='cave','add only Treak Cliff Cavern as a real natural cave');
assert.deepEqual(treak.coordinates,[-1.7972,53.3451]);
assert.equal(treak.models.length,1);
assert.equal(treak.models[0].uid,'a6183b4fd7364ed59518a276ad8ef8ec');
assert.match(treak.models[0].method,/photogrammetry/i);
assert.match(treak.locationPrecision,/Approximate/i);
assert.match(undergroundSitePopupHtml(treak),/sketchfab\.com\/models\/a6183b4fd7364ed59518a276ad8ef8ec\/embed/);
assert.match(UNDERGROUND_SCAN_SITES.find(s=>s.id==='paris-catacombs').locationPrecision,/Approximate/i);
assert.match(undergroundSitePopupHtml(UNDERGROUND_SCAN_SITES[0]),/sketchfab\.com\/models\/39e7050d272f4aac8493497621b86f39\/embed/);
assert.match(undergroundSitePopupHtml(UNDERGROUND_SCAN_SITES[0]),/CC Attribution/);
assert.match(undergroundSitePopupHtml(UNDERGROUND_SCAN_SITES[0]),/Creator:/);
assert.match(undergroundSitePopupHtml(UNDERGROUND_SCAN_SITES[0]),/Approximate district anchor/);
assert.match(undergroundSitePopupHtml(UNDERGROUND_SCAN_SITES[1]),/Center for Geospatial Technologies/);
assert.equal(buildUndergroundSiteFeatures([{id:'bad',coordinates:[999,0],models:[{}]}]).length,0);

const [moduleSource,landing,app,deploy]=await Promise.all([
 readFile(new URL('../rebuild-v5000/bridgepoint-underground-scan-sites-v1.js',import.meta.url),'utf8'),
 readFile(new URL('../rebuild-v5000/landing.js',import.meta.url),'utf8'),
 readFile(new URL('../rebuild-v5000/app.js',import.meta.url),'utf8'),
 readFile(new URL('../.github/workflows/deploy-intelligence-rebuild-v5000.yml',import.meta.url),'utf8')
]);
assert.ok(moduleSource.includes('minzoom:0,maxzoom:24'),'icons must persist at every zoom');
assert.ok(moduleSource.includes("'icon-size':['interpolate',['linear'],['zoom'],0,0.80,3,1.00,7,1.25,12,1.52,18,1.75,23,1.92]"),'Caves & Sites icons are much larger across zoom levels');
assert.ok(moduleSource.includes('bpv-dock-actions'),'control must live in the existing globe card');
assert.ok(moduleSource.includes('window.__BP_UNDERGROUND_SCAN_SITES_V1__'));
assert.ok(landing.includes("import('./bridgepoint-underground-scan-sites-v1.js?v=1-curated-sketchfab-caves')"));
assert.ok(app.includes("import('./bridgepoint-underground-scan-sites-v1.js?v=1-curated-sketchfab-caves')"));
assert.ok(deploy.includes('cp rebuild-v5000/bridgepoint-underground-scan-sites-v1.js site/bridgepoint-underground-scan-sites-v1.js'));
assert.ok(deploy.includes('cp rebuild-v5000/bridgepoint-underground-scan-sites-v1.js site/app/bridgepoint-underground-scan-sites-v1.js'));
assert.ok(deploy.includes('node tests/underground-scan-sites-v1.test.mjs'));
console.log('BRIDGEPOINT_UNDERGROUND_SCAN_SITES_V1_PASS');
