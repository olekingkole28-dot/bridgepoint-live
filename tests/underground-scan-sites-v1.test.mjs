import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {UNDERGROUND_SCAN_SITES,UNDERGROUND_SCAN_RIGHTS_HOLDS,buildUndergroundSiteFeatures,undergroundSitePopupHtml} from '../rebuild-v5000/bridgepoint-underground-scan-sites-v1.js';

const features=buildUndergroundSiteFeatures();
assert.equal(features.length,6,'six reviewed site anchors are mapped');
assert.equal(UNDERGROUND_SCAN_SITES.reduce((n,s)=>n+s.models.length,0),8,'eight real creator-hosted scans are cataloged');
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
const palhares=UNDERGROUND_SCAN_SITES.find(s=>s.id==='gruta-dos-palhares');
assert.ok(palhares&&palhares.type==='cave','new Palhares entry must be a real natural cave');
assert.deepEqual(palhares.coordinates,[-47.466659,-19.931757]);
assert.equal(palhares.models.length,1);
assert.equal(palhares.models[0].uid,'378b82695f934eafa01b397ba4d0ff83');
assert.equal(palhares.models[0].license,'CC Attribution');
assert.match(palhares.models[0].method,/photogrammetry/i);
assert.ok(undergroundSitePopupHtml(palhares).includes('sketchfab.com/models/378b82695f934eafa01b397ba4d0ff83/embed'));
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
assert.ok(moduleSource.includes("const CAVE_ICON_SIZE=['interpolate',['linear'],['zoom'],0,1.6,3,1.8,7,2.0,12,2.2,18,2.4,23,3.0]"),'Caves & Sites icons are large at all zoom levels');
assert.ok(moduleSource.includes("'icon-size':CAVE_ICON_SIZE"),'Cave symbol uses the persistent size');
assert.ok(moduleSource.includes("state.map.on(event,state.handlePersistence)"),'Cave markers reassert on style/zoom changes');
assert.ok(moduleSource.includes("map.off(event,state.handlePersistence)"),'Cave listeners are cleaned up');
assert.ok(moduleSource.includes("map.getLayoutProperty(MARKER_ID,'icon-size')"),'Cave marker size is repaired if another renderer overrides it');
assert.ok(moduleSource.includes("state.map.getLayoutProperty(id,'visibility')!==wanted"),'Cave visibility writes are idempotent to avoid styledata loops');
assert.ok(moduleSource.includes('bpv-dock-actions'),'control must live in the existing globe card');
assert.ok(moduleSource.includes('window.__BP_UNDERGROUND_SCAN_SITES_V1__'));
assert.ok(landing.includes("import('./bridgepoint-underground-scan-sites-v1.js?v=2-big-persistent-cave-icons')"));
assert.ok(app.includes("import('./bridgepoint-underground-scan-sites-v1.js?v=2-big-persistent-cave-icons')"));
assert.ok(landing.includes("./bridgepoint-underground-scan-sites-v1.js?v=2-mobile-big-persistent-cave-icons"));
assert.ok(deploy.includes('cp rebuild-v5000/bridgepoint-underground-scan-sites-v1.js site/bridgepoint-underground-scan-sites-v1.js'));
assert.ok(deploy.includes('cp rebuild-v5000/bridgepoint-underground-scan-sites-v1.js site/app/bridgepoint-underground-scan-sites-v1.js'));
assert.ok(deploy.includes('node tests/underground-scan-sites-v1.test.mjs'));
console.log('BRIDGEPOINT_UNDERGROUND_SCAN_SITES_V1_PASS');
