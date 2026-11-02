import assert from 'node:assert/strict';
import { normalizeTreeFeature } from '../release-v2300/world-v2300-tree-catalog.js';

const fir = {
  type: 'Feature',
  id: 'tree-record-101',
  geometry: { type: 'Point', coordinates: [-72.65012345, 41.56098765] },
  properties: {
    source_key: 'bridgepoint-public-tree-source',
    source_record_id: '101',
    species: 'Picea abies',
    common_name: 'Norway spruce',
    leaf_cycle: 'evergreen',
    leaf_type: 'needleleaved',
    height_m: 18.75,
    render_height_m: 9,
    crown_diameter_m: 5.2,
    trunk_diameter_m: 0.42,
    trunk_height_m: 6.1,
    height_truth: 'SOURCE_MEASURED',
    position_truth: 'SOURCE_POSITION'
  }
};

const firModel = normalizeTreeFeature(fir);
assert.ok(firModel, 'valid source tree point should normalize');
assert.deepEqual(firModel.coordinates, [-72.65012345, 41.56098765],
  'source coordinates must be passed through without offset or rounding');
assert.equal(firModel.identity.scientificName, 'Picea abies');
assert.equal(firModel.identity.commonName, 'Norway spruce');
assert.equal(firModel.identity.genus, 'Picea');
assert.equal(firModel.identity.level, 'species');
assert.equal(firModel.morphology.form, 'conifer');
assert.equal(firModel.morphology.leafCycle, 'evergreen');
assert.equal(firModel.height.meters, 18.75,
  'source height must win over a render-only fallback');
assert.equal(firModel.height.truth, 'SOURCE_MEASURED');
assert.equal(firModel.height.hasSourceHeight, true);
assert.equal(firModel.placement.truth, 'SOURCE_POSITION');
assert.equal(firModel.asset.speciesModelVerified, false,
  'a species label must not imply that a matching 3D asset is already available');
assert.equal(firModel.asset.status, 'MODEL_CATALOG_NOT_ATTACHED');
assert.equal(firModel.id, normalizeTreeFeature(fir).id,
  'instance identity must be deterministic across rebuilds');
assert.ok(Object.isFrozen(firModel) && Object.isFrozen(firModel.coordinates));

const oak = normalizeTreeFeature({
  type: 'Feature',
  id: 'tree-record-202',
  geometry: { type: 'Point', coordinates: [-71.9, 42.1] },
  properties: {
    scientific_name: 'Quercus robur',
    common_name: 'English oak',
    leaf_cycle: 'deciduous',
    height_m: 14
  }
});
assert.equal(oak.identity.genus, 'Quercus');
assert.equal(oak.morphology.form, 'broadleaf_deciduous');
assert.equal(oak.height.meters, 14);
assert.equal(oak.height.hasSourceHeight, true);

const palm = normalizeTreeFeature({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [151.2, -33.8] },
  properties: { species: 'Cocos nucifera', height_m: 12 }
});
assert.equal(palm.morphology.form, 'palm');

const derived = normalizeTreeFeature({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [0, 0] },
  properties: { render_height_m: 11 }
});
assert.equal(derived.height.meters, 11);
assert.equal(derived.height.hasSourceHeight, false);
assert.equal(derived.height.truth, 'DERIVED_RENDER_HEIGHT',
  'display fallback height must never be represented as measured source truth');

const unknown = normalizeTreeFeature({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [10, 20] },
  properties: { common_name: 'Unknown street tree' }
});
assert.equal(unknown.identity.level, 'unknown');
assert.equal(unknown.morphology.form, 'unclassified_tree');
assert.equal(unknown.identity.scientificName, null,
  'the adapter must not invent a species for an unidentified tree');

assert.equal(normalizeTreeFeature({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [181, 20] },
  properties: {}
}), null, 'out-of-range coordinates must be rejected');
assert.equal(normalizeTreeFeature({
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [] },
  properties: {}
}), null, 'non-point geometry must not be treated as an individual tree');

console.log('BRIDGEPOINT_TREE_ASSET_CONTRACT_V1_PASS');
