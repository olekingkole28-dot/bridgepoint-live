import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {UNDERGROUND_SCAN_SITES_V2,PARIS_CATACOMBS_SITE_V3,PARIS_CATACOMBS_MODELS_V4,buildUndergroundSceneFeatures} from '../rebuild-v5000/bridgepoint-underground-scan-scenes-v2.js';

const features=buildUndergroundSceneFeatures();
const models=UNDERGROUND_SCAN_SITES_V2.flatMap(s=>s.models);
const native=models.filter(m=>m.assetUrl);
const hosted=models.filter(m=>!m.assetUrl);
assert.equal(features.length,11,'one independent globe marker is generated for every Catacombs scan');
assert.equal(models.length,11,'two original native scans plus nine additional creator scans');
assert.equal(PARIS_CATACOMBS_MODELS_V4.length,11);
assert.equal(native.length,2,'preserve both current BridgePoint-hosted GLBs');
assert.equal(hosted.length,9,'additional scans remain on their creator-hosted interactive viewers');
assert.equal(PARIS_CATACOMBS_SITE_V3.id,'paris-catacombs');
assert.equal(native[0].uid,'39e7050d272f4aac8493497621b86f39');
assert.equal(native[0].license,'CC BY 4.0');
assert.equal(native[1].uid,'f4232f8f91e54b0a8aa92365d6ea7b7a');
assert.equal(native[1].license,'CC BY 4.0');
assert.equal(native[1].geometryType,'Dense LiDAR point cloud');
assert.match(native[1].captureMethod,/Scaniverse/i);
assert.ok(native[1].publishedVertices>=9000000);
assert.equal(native[1].publishedTriangles,0);
assert.equal(hosted.every(m=>m.license==='CC BY 4.0'&&m.sketchfabUid&&m.sourceUrl.startsWith('https://sketchfab.com/3d-models/')),true);
assert.equal(hosted.find(m=>m.sketchfabUid==='96cc3e6942a7455382c49241c1a80915').publishedVertices,1000000);
assert.equal(hosted.find(m=>m.sketchfabUid==='96cc3e6942a7455382c49241c1a80915').publishedTriangles,2000000);
assert.equal(hosted.find(m=>m.sketchfabUid==='d407fb1ba0414482a99ccd6567b29512').publishedTriangles,1300000);
assert.equal(hosted.find(m=>m.sketchfabUid==='27ae0d6041c54e2eab6638d197985842').publishedTriangles,1100000);
assert.ok(features.every(f=>f.geometry.type==='Point'&&f.properties.iconImage&&f.properties.modelUid));
assert.equal(new Set(features.map(f=>f.properties.modelUid)).size,11,'each globe icon selects a unique scan');
assert.ok(features.some(f=>f.properties.modelUid==='39e7050d272f4aac8493497621b86f39'));
assert.ok(features.some(f=>f.properties.modelUid==='f4232f8f91e54b0a8aa92365d6ea7b7a'));
assert.equal(buildUndergroundSceneFeatures([{id:'not-paris',coordinates:[0,0],models:[{}]}]).length,0);
assert.equal(buildUndergroundSceneFeatures([{id:'paris-catacombs',coordinates:[999,0],models:[{}]}]).length,0);

const [moduleSource,deploy,downloader,view,docs]=await Promise.all([
 readFile(new URL('../rebuild-v5000/bridgepoint-underground-scan-scenes-v2.js',import.meta.url),'utf8'),
 readFile(new URL('../.github/workflows/publish-underground-scan-scenes-v2.yml',import.meta.url),'utf8'),
 readFile(new URL('../tools/underground/fetch_sketchfab_scans.py',import.meta.url),'utf8'),
 readFile(new URL('../rebuild-v5000/bridgepoint-view-v5917.js',import.meta.url),'utf8'),
 readFile(new URL('../docs/bridgepoint-underground-scan-scenes-v2.md',import.meta.url),'utf8')
]);
assert.ok(moduleSource.includes("selectedModelUid:'f4232f8f91e54b0a8aa92365d6ea7b7a'"),'keep the large Bar des Rats point cloud as the default selection');
assert.ok(moduleSource.includes("type:'custom',renderingMode:'3d'"));
assert.ok(moduleSource.includes("minzoom:0,maxzoom:24"));
assert.ok(moduleSource.includes('data-catacomb-action="viewer"'));
assert.ok(moduleSource.includes('Drag to orbit · Scroll or pinch to zoom'));
assert.ok(moduleSource.includes('new THREE.WebGLRenderer({canvas,antialias:true'));
assert.ok(moduleSource.includes('data-catacomb-action="terrain"'));
assert.ok(moduleSource.includes('bpv3-hosted-model-frame'));
assert.ok(moduleSource.includes('sketchfab.com/models/'));
assert.ok(moduleSource.includes("icon-offset':['get','iconOffset']"));
assert.ok(moduleSource.includes("properties:{siteId:s.id,modelUid:model.uid"));
assert.ok(moduleSource.includes("map.on(event,state.handleVisibility)"));
assert.ok(moduleSource.includes("map.off(event,state.handleVisibility)"));
assert.ok(moduleSource.includes("allowLayerCategory?.('subsurface',true)"));
assert.ok(moduleSource.includes('scheduleVisibilityReassertion(state)'));
assert.ok(moduleSource.includes("getLayoutProperty(id,'visibility')==='none'"));
assert.ok(moduleSource.includes("map.isStyleLoaded()"));
assert.ok(moduleSource.includes('Only the two BridgePoint-hosted GLB scans can be rendered below terrain'));
assert.ok(moduleSource.includes('fan-out spacing between regional icons is only visual separation'));
assert.ok(moduleSource.includes('Model-space bounds:'));
assert.ok(moduleSource.includes('o.isPoints'));
assert.ok(moduleSource.includes('11 selectable scans'));
assert.ok(downloader.includes('zenodo.org/api/records/'));
assert.ok(downloader.includes('10232541')&&downloader.includes('10287234'));
assert.ok(downloader.includes('room_coordinates')&&downloader.includes('depth_below_surface_m'));
assert.ok(downloader.includes('cc-by-4.0')&&downloader.includes('glTF'));
assert.ok(!downloader.includes('SKETCHFAB_API_TOKEN'));
assert.ok(deploy.includes('github-pages-usgs-seismic-layer-v1'));
assert.ok(deploy.includes('bp-paris-catacombs-toggle-v3'));
assert.ok(deploy.includes('f4232f8f91e54b0a8aa92365d6ea7b7a'));
assert.ok(/\\d+-paris-catacombs-multi-scan-icons/.test(deploy));
assert.ok(deploy.includes('underground-scenes=paris-v7'));
assert.ok(deploy.includes('sketchfab.com/models/'));
assert.ok(deploy.includes('three@0.169.0')&&deploy.includes('esbuild@0.24.2'));
assert.ok(deploy.includes('vendor/GLTFLoader.bundle.js'));
assert.ok(deploy.includes('GLTFLoader has an unresolved external Three.js import'));
assert.ok(deploy.includes('UNDERGROUND_ONLY_OVERLAY_SCOPE_PASS'));
assert.ok(deploy.includes('bpv3-hosted-model-frame'));
assert.ok(view.includes('id="bpv-dock-actions"'));
assert.ok(docs.includes('11 selectable scans'));
console.log('BRIDGEPOINT_3D_UNDERGROUND_ELEVEN_SCAN_SELECTABLE_MARKERS_PERSISTENCE_PASS');
