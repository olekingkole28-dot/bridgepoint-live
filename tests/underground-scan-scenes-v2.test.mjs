import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {UNDERGROUND_SCAN_SITES_V2,UNDERGROUND_SCAN_RIGHTS_HOLDS_V2,buildUndergroundSceneFeatures} from '../rebuild-v5000/bridgepoint-underground-scan-scenes-v2.js';

const features=buildUndergroundSceneFeatures();
const models=UNDERGROUND_SCAN_SITES_V2.flatMap(s=>s.models);
assert.equal(features.length,3,'only three reviewed underground site anchors are mapped');
assert.equal(models.length,9,'nine real scanned meshes are cataloged');
assert.equal(UNDERGROUND_SCAN_RIGHTS_HOLDS_V2.length,3,'rights/source holds are exposed');
assert.ok(models.every(m=>m.uid&&m.sourceUrl.startsWith('https://sketchfab.com/3d-models/')&&m.license==='CC Attribution'));
assert.ok(models.every(m=>m.captureMethod),'every mesh includes a documented capture method');
assert.equal(UNDERGROUND_SCAN_SITES_V2.find(s=>s.id==='paris-catacombs').models.length,7);
assert.match(UNDERGROUND_SCAN_SITES_V2.find(s=>s.id==='vrlovka-cave').models[0].captureMethod,/LiDAR/i);
assert.match(UNDERGROUND_SCAN_SITES_V2.find(s=>s.id==='om-jaettestue').locationNote,/not a natural cave/i);
assert.match(UNDERGROUND_SCAN_SITES_V2.find(s=>s.id==='paris-catacombs').locationPrecision,/Approximate/i);
assert.ok(features.every(f=>f.geometry.type==='Point'&&f.properties.iconImage));
assert.equal(buildUndergroundSceneFeatures([{id:'bad',coordinates:[999,0],models:[{}]}]).length,0);

const [moduleSource,deploy,downloader,view]=await Promise.all([
 readFile(new URL('../rebuild-v5000/bridgepoint-underground-scan-scenes-v2.js',import.meta.url),'utf8'),
 readFile(new URL('../.github/workflows/publish-underground-scan-scenes-v2.yml',import.meta.url),'utf8'),
 readFile(new URL('../tools/underground/fetch_sketchfab_scans.py',import.meta.url),'utf8'),
 readFile(new URL('../rebuild-v5000/bridgepoint-view-v5917.js',import.meta.url),'utf8')
]);
assert.ok(moduleSource.includes("GLTF_URL='/vendor/GLTFLoader.bundle.js?v=169-local'"));
assert.ok(moduleSource.includes('new pair.GLTFLoader()')&&moduleSource.includes('parseAsync(buffer'));
assert.ok(moduleSource.includes("minzoom:0,maxzoom:24"));
assert.ok(moduleSource.includes("type:'custom',renderingMode:'3d'"));
assert.ok(!moduleSource.includes('<iframe'));
assert.ok(moduleSource.includes('Source platform: <strong>Sketchfab</strong>'),'creator source platform and attribution are visible in BridgePoint');
assert.ok(moduleSource.includes('Underground 3D layer reattach failed'),'3D mesh layer can reattach after a map style reload');
assert.ok(deploy.includes('SKETCHFAB_API_TOKEN'));
assert.ok(deploy.includes('github-pages-usgs-seismic-layer-v1'));
assert.ok(deploy.includes('bp-underground-scan-scenes-toggle-v2'));
assert.ok(view.includes('id="bpv-dock-actions"'),'button will be inserted directly into the existing card dock');
assert.ok(downloader.includes('isDownloadable')&&downloader.includes('ALLOWED_LICENSES')&&downloader.includes('Authorization'));
assert.ok(deploy.includes('bp-underground-scan-scenes-control-v2')&&deploy.includes('bpv-dock-actions'),'publisher inserts the static button directly into the existing bottom card');
console.log('BRIDGEPOINT_UNDERGROUND_SCENE_MESHES_V2_PASS');
