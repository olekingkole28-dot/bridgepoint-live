import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
 TITANIC_SHIPWRECK_PARTS,TITANIC_3D_MODELS,TITANIC_OFFICIAL_SCAN_SOURCES,ROBERT_GASKIN_WRECK,
 buildTitanicShipwreckFeatures,buildAllShipwreckFeatures,titanicShipwreckPopupHtml,syncTitanicShipwreckCategory
} from '../rebuild-v5000/bridgepoint-shipwrecks-v1.js';

const features=buildTitanicShipwreckFeatures();
assert.equal(TITANIC_SHIPWRECK_PARTS.length,3,'only Titanic bow, stern and debris-field waypoints are mapped');
assert.equal(features.length,3);
const allFeatures=buildAllShipwreckFeatures();
assert.equal(allFeatures.length,4,'all Titanic sections and the Robert Gaskin marker are always included in one source');
assert.equal(allFeatures.filter(f=>f.properties.wreckId==='robert-gaskin').length,1);
assert.deepEqual(allFeatures[3].geometry.coordinates,[-75.677083,44.589317]);
assert.equal(ROBERT_GASKIN_WRECK.depthM,19.8);
assert.deepEqual(ROBERT_GASKIN_WRECK.depthRangeM,[18.3,21.3]);
assert.equal(ROBERT_GASKIN_WRECK.license,'CC BY 4.0');
assert.equal(ROBERT_GASKIN_WRECK.sourcePhotos,48977);
assert.equal(ROBERT_GASKIN_WRECK.triangles,598600);
assert.match(ROBERT_GASKIN_WRECK.datasetUrl,/zenodo\\.10288556/);

assert.deepEqual(features.map(f=>f.properties.part),['bow','stern','debris']);
assert.deepEqual(features[0].geometry.coordinates,[-49.946944444444,41.7325]);
assert.deepEqual(features[1].geometry.coordinates,[-49.948333333333,41.726388888889]);
assert.deepEqual(features[2].geometry.coordinates,[-49.946944444444,41.725555555556]);
assert.ok(features.every(f=>f.geometry.type==='Point'&&f.properties.iconImage));
assert.ok(TITANIC_SHIPWRECK_PARTS.every(p=>p.depthM===3800&&/NOAA 2004 Titanic Expedition waypoint/.test(p.locationPrecision)));
assert.equal(TITANIC_3D_MODELS.length,3,'two independently hosted wreck-section models and one full-size historical reference');
assert.equal(TITANIC_3D_MODELS.filter(m=>m.part==='bow'||m.part==='stern').length,2);
assert.match(TITANIC_3D_MODELS[0].embedUrl,/sketchfab\.com\/models\/292b9f523d4a4366bf6dfbbd5d959e43\/embed/);
assert.match(TITANIC_3D_MODELS[1].embedUrl,/sketchfab\.com\/models\/5baccbaf949f4882b4f73f1c0169392d\/embed/);
assert.match(TITANIC_3D_MODELS[0].description,/does not document a survey-grade scale/i);
assert.match(TITANIC_3D_MODELS[2].description,/not a photogrammetry scan/i);
assert.equal(TITANIC_OFFICIAL_SCAN_SOURCES.length,3);
assert.match(TITANIC_OFFICIAL_SCAN_SOURCES[0].url,/repository\.library\.noaa\.gov\/view\/noaa\/10519/);
assert.ok(buildTitanicShipwreckFeatures([{id:'invalid',coordinates:[181,0]}]).length===0);

const categoryCalls=[];
const overlayGuard={allowLayerCategory:(category,on)=>{categoryCalls.push([category,on]);return true}};
assert.equal(syncTitanicShipwreckCategory(true,overlayGuard),true,'enabled Shipwrecks explicitly opts into its own persistent category');
assert.equal(syncTitanicShipwreckCategory(false,overlayGuard),true,'disabled Shipwrecks releases only its own category');
assert.deepEqual(categoryCalls,[['shipwrecks',true],['shipwrecks',false]]);
assert.equal(syncTitanicShipwreckCategory(true,{}),false,'missing shared visibility guard is detected');

const bowPopup=titanicShipwreckPopupHtml(TITANIC_SHIPWRECK_PARTS[0],'titanic-bow-photogrammetry');
assert.match(bowPopup,/BRIDGEPOINT · SHIPWRECKS/);
assert.match(bowPopup,/RMS Titanic/);
assert.match(bowPopup,/41° 43′ 57″ N, 49° 56′ 49″ W/);
assert.match(bowPopup,/sketchfab\.com\/models\/292b9f523d4a4366bf6dfbbd5d959e43\/embed/);
assert.match(bowPopup,/Pramet\.Peet/);
assert.match(bowPopup,/Official survey references/);
assert.match(bowPopup,/Magellan’s official dataset/);
assert.match(bowPopup,/viewer models are references only/i);
assert.match(bowPopup,/titanic-full-size-reference/);
const debrisPopup=titanicShipwreckPopupHtml(TITANIC_SHIPWRECK_PARTS[2],null);
assert.match(debrisPopup,/No separate debris-field 3D mesh is included/i);
assert.match(debrisPopup,/41° 43′ 32″ N, 49° 56′ 49″ W/);

const [moduleSource,landing,app,workflow]=await Promise.all([
 readFile(new URL('../rebuild-v5000/bridgepoint-shipwrecks-v1.js',import.meta.url),'utf8'),
 readFile(new URL('../rebuild-v5000/landing.js',import.meta.url),'utf8'),
 readFile(new URL('../rebuild-v5000/app.js',import.meta.url),'utf8'),
 readFile(new URL('../.github/workflows/publish-shipwrecks-titanic-v1.yml',import.meta.url),'utf8')
]);
assert.ok(moduleSource.includes('minzoom:0,maxzoom:24'),'markers remain visible across all globe zoom levels');
assert.ok(moduleSource.includes("'icon-allow-overlap':true"),'wreck markers do not disappear because of symbol collisions');
assert.ok(moduleSource.includes('buildAllShipwreckFeatures()'),'Titanic and Robert Gaskin markers share one source and remain visible together');
assert.ok(moduleSource.includes('ROBERT_GASKIN_ASSET'),'Robert Gaskin has a local GLB asset path');
assert.ok(moduleSource.includes("NATIVE_MODEL_LAYER_ID='bp-shipwrecks-native-model-v2'"),'Robert Gaskin uses a native MapLibre 3D custom layer');
assert.ok(moduleSource.includes("import(GLTF_URL)"),'native scan is parsed through the local GLTFLoader');
assert.ok(moduleSource.includes("new DecompressionStream('gzip')"),'the native GLB uses a compressed local asset');
assert.ok(moduleSource.includes('showRobertGaskinOnRiverbed(state)'),'the card exposes the materialize-on-riverbed action');
assert.ok(moduleSource.includes('ROBERT_GASKIN_LENGTH_M/longAxis'),'the scanned mesh is length-calibrated to the historical vessel dimensions');
assert.ok(moduleSource.includes("for(const event of ['style.load','load','idle','moveend','zoomend','rotateend','pitchend'])"),'all wreck icons restore after style reload and settled camera events');
assert.ok(moduleSource.includes('state.map.on(event,state.handlePersistentVisibility)'),'persistent visibility listeners are attached to the shared map');

assert.ok(moduleSource.includes('data-bpv-action="shipwrecks"'),'Shipwrecks participates in the shared visibility allowlist as its own category');
assert.ok(moduleSource.includes("allowLayerCategory('shipwrecks',!!enabled)"),'Shipwrecks explicitly registers and releases its own category');
assert.ok(moduleSource.includes("for(const event of ['style.load','load','idle','moveend','zoomend','rotateend','pitchend'])"),'the renderer reasserts marker visibility after settled zoom, camera-angle and style events');
assert.ok(moduleSource.includes("if(current!==next)state.map.setLayoutProperty(id,'visibility',next)"),'visibility restoration avoids redundant MapLibre style writes');
assert.ok(moduleSource.includes("map.off(event,state.handlePersistentVisibility)"),'all persistent visibility listeners are cleaned up on destroy');
assert.ok(moduleSource.includes('bpv-dock-actions'),'Shipwrecks control is attached to the existing globe dock');
assert.ok(moduleSource.includes('setVisibility(state,state.enabled)'));
assert.ok(landing.includes("import('./bridgepoint-shipwrecks-v1.js?v=2-titanic-gaskin-native')"));
assert.ok(app.includes("import('./bridgepoint-shipwrecks-v1.js?v=2-titanic-gaskin-native')"));
assert.ok(workflow.includes('actions/runs?branch=main&per_page=100'),'publisher discovers the latest successful Pages baseline dynamically');
assert.ok(workflow.includes('bridgepoint-palatine-cryptoporticus-v1.js'),'publisher refuses an older incomplete baseline');
assert.ok(workflow.includes('bridgepoint-shipwrecks-v1.js'));
assert.ok(workflow.includes('expected_changed={"landing.js","app.js","index.html","app/index.html","bridgepoint-drone-awareness-v1.js"}'));
assert.ok(workflow.includes('overlay_files={'));
assert.ok(workflow.includes('"assets/shipwrecks/robert-gaskin-photogrammetry.glb.gz"'));
assert.ok(workflow.includes('"vendor/GLTFLoader.bundle.js"'));
assert.ok(workflow.includes('required={"bridgepoint-shipwrecks-v1.js"'));
assert.ok(workflow.includes('robert-gaskin-photogrammetry.glb.gz'),'the publisher overlays the licensed Robert Gaskin native mesh');
assert.ok(workflow.includes('GLTFLoader.bundle.js'),'the publisher serves a local GLTFLoader instead of a remote CDN dependency');
assert.ok(workflow.includes('v11-shipwrecks-v2-persistent-icons'),'the publisher repairs the shared visibility-guard cache bust on both entry points');
assert.ok(workflow.includes('BRIDGEPOINT_SHIPWRECKS_V2_LIVE_VERIFY_PASS'),'the publisher verifies the live shipwreck v2 asset and entry points');

assert.ok(!/SUPA|supabase/i.test(moduleSource),'the isolated shipwreck layer does not call any account/data backend');
assert.ok(!/SUPA|supabase/i.test(moduleSource),'the native shipwreck renderer has no Supabase dependency');

console.log('BRIDGEPOINT_SHIPWRECKS_TITANIC_V1_PASS');
