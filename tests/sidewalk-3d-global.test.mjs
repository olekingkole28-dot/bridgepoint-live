import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSidewalk3DFeatures, installSidewalk3DTextures } from '../release-v2300/world-v2300-sidewalks-3d.js';

const latitude = 41.55;
const lonScale = 111320 * Math.cos(latitude * Math.PI / 180);
const roadLat = latitude;
const walkLat = latitude + 4.5 / 110540;
const startLon = -72.65;
const endLon = startLon + 30 / lonScale;
const road = {
  type: 'Feature',
  id: 'road-1',
  properties: { class: 'residential', width: '5.2' },
  geometry: { type: 'LineString', coordinates: [[startLon, roadLat], [endLon, roadLat]] }
};
const sidewalk = {
  type: 'Feature',
  id: 'walk-1',
  properties: {
    class: 'footway',
    footway: 'sidewalk',
    width: '1.8',
    surface: 'concrete',
    source_record_id: 'osm-sidewalk-1',
    tags: { footway: 'sidewalk', width: '1.8', surface: 'concrete' }
  },
  geometry: { type: 'LineString', coordinates: [[startLon, walkLat], [endLon, walkLat]] }
};
const built = buildSidewalk3DFeatures({
  features: [sidewalk],
  roadFeatures: [road],
  zoom: 17,
  mobile: false,
  elevationAt: () => 150.25
});
const parts = name => built.features.filter(feature => feature.properties.part === name);
assert.ok(parts('sidewalk_slab').length >= 15, 'a 30 m source sidewalk should become separate concrete slab polygons');
assert.ok(parts('curb').length > 0, 'a nearby parallel road should produce a distinct curb at the road edge');
assert.ok(parts('grass_verge').length > 0, 'a mapped gap between sidewalk and road should become a grass verge');
assert.ok(parts('grass_blade').length > 0, 'grass verges should include individual raised blade polygons');
assert.ok(parts('panel_joint').length > 0, 'individual slabs should expose cross-slab expansion joints');
assert.ok(parts('hairline_crack').length > 0, 'some slabs should include subtle visible hairline surface detail');
assert.ok(parts('sidewalk_slab').every(f => f.properties.base_m === 0 && f.properties.top_m === 0.145 &&
  f.properties.terrain_elevation_m === 150.25 && f.properties.terrain_sampled === true),
  'MapLibre terrain draping must carry the slab while absolute elevation remains diagnostic-only');
assert.ok(parts('curb').every(f => f.properties.base_m === 0 && f.properties.top_m === 0.20),
  'curbs must use a local 20 cm extrusion, not absolute sea-level elevation');
assert.ok(parts('grass_verge').every(f => f.properties.base_m === 0 && f.properties.top_m === 0.045),
  'grass verges must use local ground-relative extrusion heights');
assert.ok(parts('grass_blade').every(f => f.properties.base_m === 0 && f.properties.top_m >= 0.10 && f.properties.top_m <= 0.15),
  'individual grass blades must remain small local extrusions');
assert.ok(parts('sidewalk_slab').every(f => f.properties.width_truth === 'SOURCE_TAGGED_WIDTH'),
  'tagged sidewalk widths should retain their source-truth label');
assert.ok(parts('curb').every(f => f.properties.top_m - f.properties.base_m >= 0.19),
  'curb geometry should have a visible raised face');
assert.equal(built.stats.sourceTaggedWidths, 1, 'source width should be reported');
assert.equal(buildSidewalk3DFeatures({features:[sidewalk],zoom:14.1}).features.length, 0,
  '3D sidewalk geometry should stay off before its LOD threshold');
const noElevation = buildSidewalk3DFeatures({features:[sidewalk],zoom:17,elevationAt:() => null});
function partsNoElevation(collection) { return collection.features.filter(f => f.properties.part === 'sidewalk_slab'); }
assert.ok(partsNoElevation(noElevation).every(f => f.properties.base_m === 0 && f.properties.top_m === 0.145 &&
  f.properties.terrain_sampled === false && f.properties.terrain_elevation_m === null),
  'missing terrain samples must not suppress or vertically displace sidewalk slabs');

const noRoad = buildSidewalk3DFeatures({
  features:[sidewalk], roadFeatures:[], zoom:17, elevationAt:() => 5
});
assert.ok(noRoad.features.some(f => f.properties.part === 'sidewalk_slab'),
  'mapped sidewalk surfaces should remain available without a road-side pairing');
assert.equal(noRoad.features.some(f => f.properties.part === 'curb' || f.properties.part === 'grass_verge'), false,
  'curbs and grass must not be fabricated without adjacent road geometry');
const unclassifiedPath = {...sidewalk, properties:{class:'footway',tags:{footway:'crossing'} }};
assert.equal(buildSidewalk3DFeatures({features:[unclassifiedPath],zoom:17}).features.length, 0,
  'non-sidewalk footways and crossings should not be mislabeled as sidewalks');

const vectorTileSidewalk = {
  ...sidewalk,
  id: 'vector-tile-sidewalk-1',
  properties: { class: 'sidewalk', subclass: 'footway', surface: 'concrete' }
};
const vectorTileResult = buildSidewalk3DFeatures({
  features: [vectorTileSidewalk], zoom: 17, roadFeatures: [], elevationAt: () => 42
});
assert.ok(vectorTileResult.features.some(f => f.properties.part === 'sidewalk_slab'),
  'global sidewalk vector-tile features must produce 3D slabs without backend viewport records or optional OSM tags');

const vectorFootway = {
  ...sidewalk,
  id: 'vector-tile-footway-1',
  properties: { class: 'footway', surface: 'paving_stones' }
};
assert.ok(buildSidewalk3DFeatures({features:[vectorFootway],zoom:17}).features.some(f => f.properties.part === 'sidewalk_slab'),
  'mapped footway geometry must remain available when vector tiles omit nested tag metadata');

const fineSurface = {
  ...sidewalk,
  id: 'surface-fine-1',
  properties: { layer_key: 'SURFACE_MATERIAL_FINE', surface: 'concrete' }
};
assert.ok(buildSidewalk3DFeatures({features:[fineSurface],zoom:17}).features.some(f => f.properties.part === 'sidewalk_slab'),
  'the original source-backed fine-surface sidewalk layer must remain included');

const estimatedRoadside = buildSidewalk3DFeatures({
  features: [], roadFeatures: [road], roadsideWalkFeatures: [road],
  generateRoadsideWalks: true, zoom: 17, mobile: false
});
assert.ok(partsFor(estimatedRoadside, 'sidewalk_slab').length > 0,
  'visible road centerlines must create 3D sidewalk slab geometry when no mapped sidewalk feature exists');
assert.ok(partsFor(estimatedRoadside, 'curb').length > 0,
  'road-edge fallback sidewalks must create raised curb geometry');
assert.ok(partsFor(estimatedRoadside, 'grass_verge').length > 0,
  'road-edge fallback sidewalks must create a green verge between sidewalk and curb');
assert.ok(estimatedRoadside.stats.estimatedRoadsidePaths > 0,
  'road-derived fallback geometry must be identified as a display estimate');
const nearRoadSegment = {...road,id:'road-segment-near',properties:{class:'residential',bridgepoint_line_key:'road-segment-near'},geometry:{type:'LineString',coordinates:[[startLon,roadLat],[endLon,roadLat]]}};
const farRoadSegment = {...road,id:'road-segment-far',properties:{class:'residential',bridgepoint_line_key:'road-segment-far'},geometry:{type:'LineString',coordinates:[[startLon,roadLat+.0005],[endLon,roadLat+.0005]]}};
const segmentPriority = buildSidewalk3DFeatures({features:[],roadFeatures:[nearRoadSegment,farRoadSegment],roadsideWalkFeatures:[nearRoadSegment,farRoadSegment],generateRoadsideWalks:true,zoom:17,mobile:false});
assert.ok(segmentPriority.features.some(f => String(f.properties.source_record_id).includes('road-segment-near')),
  'a split vector-tile line segment must retain its independent identity for road-side sidewalk generation');

function partsFor(collection, name) { return collection.features.filter(feature => feature.properties.part === name); }

const mapSource = await readFile(new URL('../release-v2300/world-v2300-map.js', import.meta.url), 'utf8');
assert.ok(mapSource.includes("const lineKey=baseKey+'|'+JSON.stringify(coordinates)"),
  'multi-line source features must be split into independently keyed visible line segments before mesh generation');
assert.ok(mapSource.includes("out.push({...clipped,id:lineKey,properties:{...p,bridgepoint_line_key:lineKey},geometry:{type:'LineString',coordinates}})"),
  'each clipped sidewalk and road segment must retain a unique stable line identity');
assert.ok(mapSource.includes("map.queryRenderedFeatures({layers:['gta-global-sidewalk-approach-v1']})"),
  'the 3D builder must consume the same visible 2D sidewalk/footway features already rendered in the viewport');
assert.ok(mapSource.includes('renderedApproachFeatures:sidewalkRenderedRaw.length'),
  'live sidewalk diagnostics must report the rendered 2D fallback feature count separately');
assert.ok(mapSource.includes('function refreshSidewalk3DFromTiles(extraFeatures=[])'),
  'sidewalk generation must have its own lightweight map-tile refresh path');
assert.ok(mapSource.includes("map.on('style.load',ensureSidewalk3DLayerOrder)"),
  'the 3D sidewalk surfaces must be restored after every map style reload');
assert.ok(mapSource.includes("ensureSidewalk3DLayerOrder();if(!moving&&map.getZoom()>=14.2)refreshSidewalk3DFromTiles()"),
  'the 3D sidewalk stack must be reasserted after later viewport and dynamic-layer updates');
assert.ok(mapSource.includes("for(const id of order)map.moveLayer(id)"),
  'sidewalk slabs, curbs, grass, blades and joints must be moved above later 3D extrusion layers');
assert.ok(mapSource.includes("window.__BP_SIDEWALK_LAYER_ORDER_V1__"),
  'live diagnostics must report the final sidewalk layer-stack status');
assert.ok(mapSource.includes('features:sidewalkFeatureInputs') && mapSource.includes('sidewalkFeatureInputs.sort((a,b)=>sidewalkScreenDistance(a)-sidewalkScreenDistance(b))'),
  'visible sidewalk source segments must be prioritized by screen position before 3D geometry generation');
assert.ok(mapSource.includes('globalVectorTileFeatures:sidewalkSourceRaw.length'),
  'the active sidewalk renderer must expose its vector-tile source count for live diagnosis');

assert.ok(mapSource.includes("map.querySourceFeatures('ofm',{sourceLayer:'transportation'})"),
  'curbs and grass must use loaded OpenFreeMap road geometry even when road display layers are hidden');
assert.ok(mapSource.includes("const sidewalkRoadClasses=new Set"),
  'road source features must be filtered to actual road classes before sidewalk pairing');
assert.ok(mapSource.includes("['bridge','tunnel'].includes(String(p.brunnel||'').toLowerCase())"),
  'bridge and tunnel deck geometry must not be used to fabricate sidewalk curbs or grass verges');
assert.ok(mapSource.includes('roadVectorTileFeatures:sidewalkRoadTileFeatures.length'),
  'the live sidewalk diagnostics must report loaded transportation road tiles used for curb placement');


const sidewalkRefreshIndex = mapSource.indexOf('function refreshSidewalk3DFromTiles(extraFeatures=[])');
const sidewalkBuildIndex = mapSource.indexOf('const sidewalk3D=buildSidewalk3DFeatures', sidewalkRefreshIndex);
const livingFeatureGateIndex = mapSource.indexOf('if(features.length){', sidewalkBuildIndex);
assert.ok(sidewalkRefreshIndex >= 0 && sidewalkBuildIndex > sidewalkRefreshIndex && livingFeatureGateIndex > sidewalkBuildIndex,
  'the source-tile sidewalk builder must remain outside and before the optional buildings/trees nonempty-scene gate');
assert.ok(!mapSource.includes("map.getSource('bpSidewalk3D')?.setData(EMPTY)"),
  'an empty buildings/trees response must not clear mapped sidewalk 3D geometry');

const mobile = buildSidewalk3DFeatures({features:[sidewalk],roadFeatures:[road],zoom:17,mobile:true,elevationAt:()=>10});
assert.ok(mobile.features.length <= 180 * 6, 'mobile geometry should stay inside its bounded feature budget');

const images = new Map();
const fakeMap = {
  hasImage: name => images.has(name),
  addImage: (name, image) => images.set(name, image)
};
assert.equal(installSidewalk3DTextures(fakeMap), true, 'the sidewalk material textures should register');
assert.equal(images.size, 4, 'concrete, paver, brick and grass surface textures should be registered');
for (const image of images.values()) {
  assert.equal(image.width, 64);
  assert.equal(image.height, 64);
  assert.equal(image.data.length, 64 * 64 * 4);
}
assert.equal(installSidewalk3DTextures(fakeMap), false, 'texture registration should be idempotent');

console.log('BRIDGEPOINT_GLOBAL_SIDEWALK_3D_TEST_PASS');

[executed on device: MollieOllie (898525b9-c32e-4ce4-b683-4efb3b88b364)]