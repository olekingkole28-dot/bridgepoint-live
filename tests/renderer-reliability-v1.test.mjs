import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = path => fs.readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const streetlights = read('../streetlights-v1/world-v2300-streetlights-3d-v1.js');
const world = read('../release-v2300/world-v2300-map.js');
const trees = read('../release-v2300/world-v2300-tree-instanced.js');
const lighthouses = read('../patches/lighthouse-v3/bridgepoint-lighthouses-v1.js');

// Streetlights must use the existing same-origin PMTiles runtime and shared
// protocol instead of depending on an extra public ESM CDN request.
assert.match(streetlights, /const VERSION = 4;/);
assert.match(streetlights, /PMTILES_LIBRARY_URL = '\/vendor\/pmtiles\.js'/);
assert.match(streetlights, /window\.__BP_TRANSPORTATION_PMTILES_PROTOCOL__/);
assert.match(streetlights, /window\.__BP_UTILITY_PMTILES_PROTOCOL__/);
assert.doesNotMatch(streetlights, /esm\.sh\/pmtiles/);
assert.match(streetlights, /PRECISION_ANCHOR_DEGREES = 0\.005/);
assert.match(streetlights, /buildScene\(records, precisionMode\)/);
assert.match(streetlights, /signature !== lastSignature \|\| precisionMode !== lastPrecisionMode/);
assert.match(streetlights, /renderedEntries = buildEntries(records)/);
assert.match(streetlights, /if \(!precisionMode\)/);

// The bridge geometry must be rebuilt when the OpenFreeMap vector tile content
// finishes loading, not only at the end of the camera gesture.
assert.match(world, /scheduleBridgeSourceRefresh/);
assert.match(world, /bpBridgeSourcePending/);
assert.match(world, /e\?\.sourceId==='ofm'/);
assert.match(world, /e\?\.sourceDataType==='content'\|\|e\?\.isSourceLoaded===true\|\|e\?\.tile/);
assert.match(world, /rebuildBridge3D\(MOBILE\?140:90\)/);

// Buildings get a coalesced post-tile LOD reconciliation while stationary.
assert.match(world, /bpContextBuildingSyncTimer/);
assert.match(world, /syncBuildingShellsWhenSafe\('ofm-viewport-tiles-ready'\)/);

// Tree renderer is first-party/local, its optional catalogs are non-blocking,
// and a failed tree model group can no longer reject all other successful groups.
assert.match(trees, /const VERSION = 3;/);
assert.match(trees, /THREE_URL = '\/vendor\/three\.module\.js\?v=169-local'/);
assert.match(trees, /GLTF_URL = '\/vendor\/GLTFLoader\.bundle\.js\?v=169-local'/);
assert.match(trees, /Promise\.allSettled\(\[/);
assert.match(trees, /Promise\.allSettled\(\[\.\.\.groups\.entries\(\)\]/);
assert.match(trees, /partial-render-ready/);
assert.match(trees, /failedModelGroups/);
assert.match(trees, /variantCatalogStatus = 'unavailable-using-base-archetypes'/);
assert.match(trees, /taxonomyStatus = 'unavailable-base-tree-classification'/);
assert.match(trees, /scheduleEventRefresh/);
assert.match(trees, /optionalCatalogsDeferred: true/);
assert.match(trees, /void loadOptionalTreeCatalogs\(\)/);
assert.match(trees, /refreshInstances\(\);\s*void loadOptionalTreeCatalogs\(\);/);
assert.doesNotMatch(trees, /https:\/\/esm\.sh\/three@0\.169\.0/);

// Lighthouse towers are transformed once per settled view and rendered in one
// Three.js scene pass rather than one WebGL render call per fixture.
const lighthouseRenderStart = lighthouses.indexOf('    render(gl, args) {');
const lighthouseRenderEnd = lighthouses.indexOf('    onRemove() {', lighthouseRenderStart);
assert.ok(lighthouseRenderStart >= 0 && lighthouseRenderEnd > lighthouseRenderStart);
const lighthouseRender = lighthouses.slice(lighthouseRenderStart, lighthouseRenderEnd);
assert.equal((lighthouseRender.match(/state\.renderer\.render\(/g) || []).length, 1);
assert.match(lighthouses, /function updateModelTransforms\(state\)/);
assert.match(lighthouses, /item\.root\.matrix\.copy\(matrix\)/);
assert.match(lighthouses, /if \(Number\(state\.map\.getZoom\(\)\) >= MIN_BEACON_ZOOM\) void loadViewportData\(state\)/);
assert.match(lighthouses, /setTimeout\(tick, 160\)/);

// All existing user-facing feature controls and visibility toggles stay outside
// these targeted renderer changes. This publisher only overlays the files it
// explicitly fingerprints in its production-scope comparison.
console.log('BRIDGEPOINT_RENDERER_RELIABILITY_V1_TEST_PASS');
