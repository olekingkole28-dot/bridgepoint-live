import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  chooseTreeLod,
  chooseTreeModel,
  normalizeViewportTrees,
  treeDisplayHeightMeters,
  treeInstanceBudget
} from '../release-v2300/world-v2300-tree-instanced.js';

const models = [
  {
    id: 'fir_sapling_medium',
    modelFamily: 'conifer',
    botanicalMatch: { level: 'genus', scientificName: 'Abies', confidence: 'genus-proxy' }
  },
  {
    id: 'jacaranda_tree',
    modelFamily: 'broadleaf',
    botanicalMatch: { level: 'genus', scientificName: 'Jacaranda', confidence: 'genus-proxy' }
  },
  {
    id: 'tree_small_02',
    modelFamily: 'broadleaf',
    botanicalMatch: { level: 'species-tag', scientificName: 'Burkea africana', confidence: 'asset-tag-proxy' }
  }
];

const sourceTree = (id, coordinates, properties = {}) => ({
  type: 'Feature',
  id,
  geometry: { type: 'Point', coordinates },
  properties: { source_key: 'tree-test', source_record_id: id, ...properties }
});

const pine = sourceTree('pine-1', [-72.65012345, 41.56098765], {
  species: 'Picea abies',
  leaf_cycle: 'evergreen',
  height_m: 18.75,
  render_height_m: 8
});
const oak = sourceTree('oak-2', [-72.65022345, 41.56108765], {
  species: 'Quercus robur',
  leaf_cycle: 'deciduous',
  height_m: 14
});
const jacaranda = sourceTree('jacaranda-3', [151.2, -33.8], {
  species: 'Jacaranda mimosifolia',
  leaf_cycle: 'deciduous',
  height_m: 9.4
});
const palm = sourceTree('palm-4', [151.21, -33.81], {
  species: 'Cocos nucifera',
  leaf_cycle: 'evergreen',
  height_m: 12
});
const unknownHeight = sourceTree('unknown-5', [10, 20], {
  common_name: 'Unknown street tree',
  render_height_m: 11
});

assert.equal(chooseTreeLod(18), 'lod0');
assert.equal(chooseTreeLod(15), 'lod1');
assert.equal(chooseTreeLod(11.9), 'lod2');
assert.equal(chooseTreeLod(Number.NaN), 'lod2');

assert.equal(chooseTreeModel(
  { morphology: { form: 'conifer' }, identity: { genus: 'Picea', scientificName: 'Picea abies' } },
  models
), 'fir_sapling_medium', 'conifer family fallback should select a conifer asset');
assert.equal(chooseTreeModel(
  { morphology: { form: 'broadleaf_deciduous' }, identity: { genus: 'Jacaranda', scientificName: 'Jacaranda mimosifolia' } },
  models
), 'jacaranda_tree', 'a matching genus asset should take precedence over generic broadleaf fallback');
assert.equal(chooseTreeModel(
  { morphology: { form: 'palm' }, identity: { genus: 'Cocos', scientificName: 'Cocos nucifera' } },
  models
), null, 'unsupported palms must keep the old fallback rather than use a false broadleaf model');

const normalizedPine = normalizeViewportTrees([pine], models, 10).trees[0];
assert.deepEqual(normalizedPine.coordinates, [-72.65012345, 41.56098765],
  'the renderer must not change source coordinates');
assert.equal(normalizedPine.height.meters, 18.75,
  'source height must take precedence over renderer fallback height');
assert.equal(normalizedPine.height.hasSourceHeight, true);
assert.equal(normalizedPine.modelId, 'fir_sapling_medium');

const renderedHeight = treeDisplayHeightMeters(normalizedPine);
assert.equal(renderedHeight, 18.75);
const missingHeight = normalizeViewportTrees([unknownHeight], models, 10).trees[0];
assert.equal(missingHeight.height.hasSourceHeight, false);
assert.equal(missingHeight.height.truth, 'DERIVED_RENDER_HEIGHT');
assert.equal(treeDisplayHeightMeters(missingHeight), 11,
  'a render-only height can size the display but must retain derived truth');

const deduped = normalizeViewportTrees([pine, pine, oak, jacaranda], models, 10);
assert.equal(deduped.sourceCount, 3, 'duplicate source records must not create duplicate tree instances');
assert.equal(deduped.trees.length, 3);
assert.equal(deduped.unsupported, 0);
assert.equal(deduped.truncated, 0);

const withUnsupported = normalizeViewportTrees([pine, palm], models, 10);
assert.equal(withUnsupported.sourceCount, 2);
assert.equal(withUnsupported.trees.length, 1);
assert.equal(withUnsupported.unsupported, 1);

const truncated = normalizeViewportTrees([pine, oak, jacaranda], models, 1);
assert.equal(truncated.trees.length, 1);
assert.equal(truncated.sourceCount, 3);
assert.equal(truncated.truncated, 2,
  'the old renderer must remain available whenever the new renderer hit its safety cap');

assert.equal(treeInstanceBudget({ mobile: true, lowMemory: true }), 1600);
assert.equal(treeInstanceBudget({ mobile: true, lowMemory: false }), 4200);
assert.equal(treeInstanceBudget({ mobile: false, highTier: true }), 16000);
assert.equal(treeInstanceBudget({ mobile: false, highTier: false }), 10000);

const source = await readFile(
  new URL('../release-v2300/world-v2300-tree-instanced.js', import.meta.url),
  'utf8'
);
assert.ok(source.includes('THREE.InstancedMesh'), 'the detailed renderer must use GPU instancing');
assert.ok(source.includes('bpWindWeight'), 'the renderer must consume per-vertex wind weights');
assert.ok(source.includes('map.queryTerrainElevation'), 'instances must anchor to terrain elevation');
assert.ok(source.includes('getMatrixForModel'), 'instances must use the existing MapLibre geographic transform');
assert.ok(source.includes('bpTreeLod'), 'the renderer must reuse the existing source-backed tree point cache');
assert.ok(source.includes("state.truncated === 0"), 'the legacy fallback must not be hidden after an instance-budget truncation');
assert.ok(source.includes('restoreLegacyVisibility()'), 'the original fallback visibility must be restored on an asset failure');
assert.ok(source.includes("renderer: 'THREE_INSTANCEDMESH_SHARED_MAPLIBRE_GL_CONTEXT'"),
  'the new renderer must share the existing map WebGL canvas/context');
assert.ok(!source.includes('Math.random'), 'tree model placement and yaw must remain deterministic');
console.log('BRIDGEPOINT_TREE_INSTANCED_RENDERER_CONTRACT_PASS');
