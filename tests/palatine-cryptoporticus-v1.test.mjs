import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PALATINE_CRYPTO_SCAN_V1 } from '../rebuild-v5000/bridgepoint-palatine-cryptoporticus-v1.js';

const scan=PALATINE_CRYPTO_SCAN_V1;
assert.equal(scan.uid,'palatine-neronian-cryptoporticus');
assert.deepEqual(scan.coordinates,[12.48718,41.89005]);
assert.equal(scan.coordinateOrder,'longitude, latitude');
assert.equal(scan.creator,'artfletch');
assert.equal(scan.license,'CC BY 4.0');
assert.match(scan.captureMethod,/568.*photographs.*RealityScan/);
assert.equal(scan.publishedTriangles,1845375);
assert.equal(scan.publishedVertices,936915);
assert.equal(scan.splatCountApprox,5000000);
assert.equal(scan.splatPackageSize,'68.5 MB');
assert.ok(scan.viewerUrl.startsWith('https://superspl.at/scene/'));
assert.ok(scan.sourceUrl.includes('827278527982425799ddbc0ec6bcc81d'));
assert.ok(scan.locationPrecision.includes('Approximate site/entrance reference'));
assert.match(scan.locationPrecision,/not published/);
assert.match(scan.detail,/one separate section/);

const moduleSource=await readFile(new URL('../rebuild-v5000/bridgepoint-palatine-cryptoporticus-v1.js',import.meta.url),'utf8');
assert.ok(moduleSource.includes("const BUTTON_ID='bp-paris-catacombs-toggle-v3'"),'use the existing 3D Underground card toggle');
assert.ok(moduleSource.includes("type:'geojson'"),'use a dedicated real map point');
assert.ok(moduleSource.includes('minzoom:0,maxzoom:24'),'keep the marker available at global and close zoom');
assert.ok(moduleSource.includes("map.on('style.load',state.handleStyle)"),'restore the marker after style replacement');
assert.ok(moduleSource.includes("map.on('click',state.handleClick)"),'clicking the marker opens the model');
assert.ok(moduleSource.includes("state.buttonObserver.observe(button,{attributes:true,attributeFilter:['aria-pressed']})"),'sync the Rome marker with the existing toggle state');
assert.ok(moduleSource.includes('https://superspl.at/scene/096380c2'),'open the photo-derived Gaussian-splat scene');
assert.ok(moduleSource.includes('568 Sony a7R V photographs processed with RealityScan'));
assert.ok(moduleSource.includes('approximate site reference'));
assert.ok(!moduleSource.includes('depthBelowSurfaceM'),'do not invent a tunnel depth');
assert.ok(!moduleSource.includes("renderingMode:'3d'"),'do not pretend a creator-hosted iframe is a terrain-registered mesh');

const view=await readFile(new URL('../rebuild-v5000/bridgepoint-view-v5917.js',import.meta.url),'utf8');
assert.ok(view.includes('bpv-dock-actions'),'the existing bottom-card dock remains the host control');
console.log('BRIDGEPOINT_PALATINE_CRYPTOPORTICUS_PHOTOGRAMMETRY_MARKER_TESTS_PASS');
