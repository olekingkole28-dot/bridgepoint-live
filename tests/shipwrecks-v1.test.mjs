import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
 TITANIC_SHIPWRECK_PARTS,TITANIC_3D_MODELS,TITANIC_OFFICIAL_SCAN_SOURCES,
 buildTitanicShipwreckFeatures,titanicShipwreckPopupHtml
} from '../rebuild-v5000/bridgepoint-shipwrecks-v1.js';

const features=buildTitanicShipwreckFeatures();
assert.equal(TITANIC_SHIPWRECK_PARTS.length,3,'only Titanic bow, stern and debris-field waypoints are mapped');
assert.equal(features.length,3);
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
assert.equal(TITANIC_OFFICIAL_SCAN_SOURCES.length,2);
assert.ok(buildTitanicShipwreckFeatures([{id:'invalid',coordinates:[181,0]}]).length===0);

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
assert.ok(moduleSource.includes("map.on('style.load',state.handleStyleLoad)"),'markers are restored after map-style reloads');
assert.ok(moduleSource.includes('bpv-dock-actions'),'Shipwrecks control is attached to the existing globe dock');
assert.ok(moduleSource.includes('setVisibility(state,state.enabled)'));
assert.ok(landing.includes("import('./bridgepoint-shipwrecks-v1.js?v=1-titanic-noaa-waypoints')"));
assert.ok(app.includes("import('./bridgepoint-shipwrecks-v1.js?v=1-titanic-noaa-waypoints')"));
assert.ok(workflow.includes('github-pages-palatine-cryptoporticus-v1'));
assert.ok(workflow.includes('bridgepoint-shipwrecks-v1.js'));
assert.ok(workflow.includes('expected_changed={"landing.js","app.js","index.html","app/index.html"}'));
assert.ok(workflow.includes('expected_added={"bridgepoint-shipwrecks-v1.js","app/bridgepoint-shipwrecks-v1.js"}'));
assert.ok(!/SUPA|supabase/i.test(moduleSource),'the isolated shipwreck layer does not call any account/data backend');
console.log('BRIDGEPOINT_SHIPWRECKS_TITANIC_V1_PASS');
