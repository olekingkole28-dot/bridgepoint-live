import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {UNDERGROUND_SCAN_SITES_V2,PARIS_CATACOMBS_SITE_V3,buildUndergroundSceneFeatures} from '../rebuild-v5000/bridgepoint-underground-scan-scenes-v2.js';

const features=buildUndergroundSceneFeatures();
const models=UNDERGROUND_SCAN_SITES_V2.flatMap(s=>s.models);
assert.equal(features.length,1,'only Paris Catacombs site marker is present');
assert.equal(models.length,1,'only one real Paris Catacombs LiDAR mesh is shipped in this inspection build');
assert.equal(PARIS_CATACOMBS_SITE_V3.id,'paris-catacombs');
assert.equal(models[0].uid,'39e7050d272f4aac8493497621b86f39');
assert.equal(models[0].license,'CC BY 4.0');
assert.match(PARIS_CATACOMBS_SITE_V3.locationPrecision,/Approximate/i);
assert.ok(features[0].geometry.type==='Point'&&features[0].properties.iconImage);
assert.equal(buildUndergroundSceneFeatures([{id:'not-paris',coordinates:[0,0],models:[{}]}]).length,0);
assert.equal(buildUndergroundSceneFeatures([{id:'paris-catacombs',coordinates:[999,0],models:[{}]}]).length,0);

const [moduleSource,deploy,downloader,view]=await Promise.all([
 readFile(new URL('../rebuild-v5000/bridgepoint-underground-scan-scenes-v2.js',import.meta.url),'utf8'),
 readFile(new URL('../.github/workflows/publish-underground-scan-scenes-v2.yml',import.meta.url),'utf8'),
 readFile(new URL('../tools/underground/fetch_sketchfab_scans.py',import.meta.url),'utf8'),
 readFile(new URL('../rebuild-v5000/bridgepoint-view-v5917.js',import.meta.url),'utf8')
]);
assert.ok(moduleSource.includes("type:'custom',renderingMode:'3d'"));
assert.ok(moduleSource.includes("minzoom:0,maxzoom:24"));
assert.ok(moduleSource.includes('data-catacomb-action="viewer"'));
assert.ok(moduleSource.includes('Drag to orbit · Scroll or pinch to zoom'));
assert.ok(moduleSource.includes('new THREE.WebGLRenderer({canvas,antialias:true'));
assert.ok(moduleSource.includes('data-catacomb-action="terrain"'));
assert.ok(!moduleSource.includes('<iframe'));
assert.ok(moduleSource.includes('Approximate Paris Catacombs district anchor'));
assert.ok(downloader.includes('zenodo.org/api/records/'));
assert.ok(downloader.includes('cc-by-4.0')&&downloader.includes('glTF'));
assert.ok(!downloader.includes('SKETCHFAB_API_TOKEN'));
assert.ok(deploy.includes('github-pages-usgs-seismic-layer-v1'));
assert.ok(deploy.includes('bp-paris-catacombs-toggle-v3'));
assert.ok(deploy.includes('three@0.169.0')&&deploy.includes('esbuild@0.24.2'),'publisher builds local GLTFLoader against BridgePoint Three.js');
assert.ok(deploy.includes('vendor/GLTFLoader.bundle.js'),'local GLTFLoader is included in the narrow Pages overlay');
assert.ok(deploy.includes('GLTFLoader has an unresolved external Three.js import'),'bundle has no bare external runtime dependency');
assert.ok(deploy.includes("indent=data[begin:].split('void import(',1)[0]"),'replacement preserves whitespace instead of repeating void import syntax');
assert.ok(view.includes('id="bpv-dock-actions"'));
console.log('BRIDGEPOINT_PARIS_CATACOMBS_NATIVE_3D_VIEWER_PASS');
