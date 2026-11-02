import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  chooseTreeLod,
  chooseTreeModel,
  enrichTreeWithTaxonomy,
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

const proceduralModels = [
  {
    id: 'proc_fir_tiered',
    modelType: 'PROCEDURAL_ARCHETYPE',
    modelFamily: 'conifer',
    leafCycle: 'evergreen',
    knownGenera: ['Abies', 'Picea']
  },
  {
    id: 'proc_oak_spreading',
    modelType: 'PROCEDURAL_ARCHETYPE',
    modelFamily: 'broadleaf_deciduous',
    leafCycle: 'deciduous',
    knownGenera: ['Quercus']
  },
  {
    id: 'proc_cherry_flowering',
    modelType: 'PROCEDURAL_ARCHETYPE',
    modelFamily: 'broadleaf_deciduous',
    leafCycle: 'deciduous',
    knownGenera: ['Prunus']
  },
  {
    id: 'proc_coconut_palm',
    modelType: 'PROCEDURAL_ARCHETYPE',
    modelFamily: 'palm',
    leafCycle: 'evergreen',
    knownGenera: ['Cocos']
  }
];
const taxonomyIndex = {
  'quercus robur': {
    key: 'oak-taxonomy-key',
    scientificName: 'Quercus robur',
    genus: 'Quercus',
    family: 'Fagaceae',
    functionalType: 'Deciduous Broadleaf'
  },
  'abies alba': {
    key: 'fir-taxonomy-key',
    scientificName: 'Abies alba',
    genus: 'Abies',
    family: 'Pinaceae',
    functionalType: 'Evergreen Needleleaf'
  }
};
const variantsByArchetype = new Map([
  ['oak_spreading', Array.from({ length: 64 }, (_, index) => ({
    id: 'oak_spreading-v' + String(index).padStart(3, '0'),
    archetypeId: 'oak_spreading',
    variantIndex: index,
    seed: index + 1,
    parameters: {
      crownSpread: 0.82 + index * 0.006,
      crownDepth: 1,
      crownOffset: 0,
      trunkLeanX: 0,
      trunkLeanZ: 0,
      branchAsymmetry: 0,
      leafScale: 1,
      foliageDensity: 1,
      windPhase: index / 10
    }
  }))],
  ['fir_tiered', Array.from({ length: 64 }, (_, index) => ({
    id: 'fir_tiered-v' + String(index).padStart(3, '0'),
    archetypeId: 'fir_tiered',
    variantIndex: index,
    seed: index + 101,
    parameters: {
      crownSpread: 1,
      crownDepth: 1,
      crownOffset: 0,
      trunkLeanX: 0,
      trunkLeanZ: 0,
      branchAsymmetry: 0,
      leafScale: 1,
      foliageDensity: 1,
      windPhase: index / 10
    }
  }))]
]);

const unknownHeight = sourceTree('unknown-5', [10, 20], {
  common_name: 'Unknown street tree',
  render_height_m: 11
});

assert.equal(chooseTreeLod(18), 'lod0');
assert.equal(chooseTreeLod(15), 'lod1');
assert.equal(chooseTreeLod(11.9), 'lod2');
assert.equal(chooseTreeLod(Number.NaN), 'lod2');
assert.equal(chooseTreeLod(18, 500, false), 'lod0',
  'street-level detail should be used when the viewport has a manageable tree count');
assert.equal(chooseTreeLod(18, 500, true), 'lod1',
  'mobile devices should use the medium mesh with hundreds of close trees');
assert.equal(chooseTreeLod(18, 5000, false), 'lod2',
  'regional geometry should keep dense thousands-tree scenes inside the triangle budget');
assert.equal(chooseTreeLod(15, 5000, false), 'lod2',
  'the visible tree count must override a zoom-only high-detail choice');

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

assert.equal(chooseTreeModel(
  { morphology: { form: 'conifer', leafCycle: 'evergreen' }, identity: { genus: 'Abies' } },
  proceduralModels
), 'proc_fir_tiered', 'procedural library must pick a matching conifer genus');
assert.equal(chooseTreeModel(
  { morphology: { form: 'broadleaf_deciduous', leafCycle: 'deciduous' }, identity: { genus: 'Quercus' } },
  proceduralModels
), 'proc_oak_spreading', 'procedural library must select the matching broadleaf genus');
assert.equal(chooseTreeModel(
  { morphology: { form: 'palm', leafCycle: 'evergreen' }, identity: { genus: 'Cocos' } },
  proceduralModels
), 'proc_coconut_palm', 'procedural library must render a supported palm archetype');

const enrichedOak = enrichTreeWithTaxonomy(
  normalizeViewportTrees([oak], models, 10).trees[0],
  taxonomyIndex
);
assert.equal(enrichedOak.identity.genus, 'Quercus');
assert.equal(enrichedOak.identity.family, 'Fagaceae');
assert.equal(enrichedOak.identity.taxonomyCatalogMatch, true);
assert.equal(enrichedOak.morphology.form, 'broadleaf_deciduous');
assert.equal(enrichedOak.placement.truth, 'SOURCE_POSITION',
  'taxonomy enrichment must not alter source placement truth');
const catalogMatch = normalizeViewportTrees(
  [oak], proceduralModels, 10, variantsByArchetype, taxonomyIndex
).trees[0];
assert.equal(catalogMatch.modelId, 'proc_oak_spreading');
assert.equal(catalogMatch.variantId.startsWith('oak_spreading-v'), true);
assert.equal(catalogMatch.variantParameters.crownSpread !== 1, true);
assert.deepEqual(catalogMatch.coordinates, [-72.65022345, 41.56108765]);
const repeatedCatalogMatch = normalizeViewportTrees(
  [oak], proceduralModels, 10, variantsByArchetype, taxonomyIndex
).trees[0];
assert.equal(repeatedCatalogMatch.variantId, catalogMatch.variantId,
  'the same source tree must always receive the same model variant');
const pineMatch = normalizeViewportTrees(
  [pine], proceduralModels, 10, variantsByArchetype, taxonomyIndex
).trees[0];
assert.equal(pineMatch.modelId, 'proc_fir_tiered');
assert.equal(pineMatch.identity.taxonomyCatalogMatch, true);


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
assert.ok(source.includes('bpTreeMorph'), 'the renderer must apply per-instance canopy morphology');
assert.ok(source.includes('bpTreeFoliage'), 'the renderer must apply per-instance foliage variations');
assert.ok(source.includes('TAXONOMY_INDEX_URL'), 'the renderer must load the GlobalGeoTree species lookup');
assert.ok(source.includes('taxonomyCatalogMatch'), 'taxonomy matches must be visibly distinguished from source truth');
assert.ok(source.includes('procedural-variants.json'), 'the renderer must load the thousands-variant catalog');
assert.ok(source.includes('map.queryTerrainElevation'), 'instances must anchor to terrain elevation');
assert.ok(source.includes('getMatrixForModel'), 'instances must use the existing MapLibre geographic transform');
assert.ok(source.includes('bpTreeLod'), 'the renderer must reuse the existing source-backed tree point cache');
assert.ok(source.includes("state.truncated === 0"), 'the legacy fallback must not be hidden after an instance-budget truncation');
assert.ok(source.includes('restoreLegacyVisibility()'), 'the original fallback visibility must be restored on an asset failure');
assert.ok(source.includes("renderer: 'THREE_INSTANCEDMESH_SHARED_MAPLIBRE_GL_CONTEXT'"),
  'the new renderer must share the existing map WebGL canvas/context');
assert.ok(!source.includes('Math.random'), 'tree model placement and yaw must remain deterministic');
console.log('BRIDGEPOINT_TREE_INSTANCED_RENDERER_CONTRACT_PASS');
