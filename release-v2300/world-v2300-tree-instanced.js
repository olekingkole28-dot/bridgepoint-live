import { normalizeTreeFeature } from './world-v2300-tree-catalog.js';

const VERSION = 1;
const LAYER_ID = 'bp-v2300-instanced-trees-v1';
const MANIFEST_URL = '/assets/trees/manifest.json';
const VARIANTS_URL = '/assets/trees/procedural-variants.json';
const TAXONOMY_INDEX_URL = '/assets/trees/taxonomy-index.json';
const THREE_URL = 'https://esm.sh/three@0.169.0';
const GLTF_URL = 'https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';
const LEGACY_LAYER_IDS = [
  'gta-bp-tree3d-trunk',
  'gta-bp-tree3d-canopy',
  'gta-bp-tree-trunks',
  'gta-bp-tree-crowns'
];
const FALLBACK_BROADLEAF_MODEL = 'tree_small_02';
const FALLBACK_CONIFER_MODEL = 'fir_sapling_medium';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = value => Number.isFinite(Number(value));
const asArray = value => Array.isArray(value) ? value : [];
const CONIFER_FAMILIES = new Set([
  'pinaceae', 'cupressaceae', 'taxaceae', 'araucariaceae',
  'podocarpaceae', 'cephalotaxaceae', 'sciadopityaceae'
]);
const PALM_FAMILIES = new Set(['arecaceae']);
const normalizeTaxonName = value => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/×/g, ' ')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

function morphologyFromTaxonomy(functionalType, family) {
  const type = String(functionalType || '').toLowerCase();
  const familyKey = String(family || '').toLowerCase();
  if (PALM_FAMILIES.has(familyKey)) return 'palm';
  if (CONIFER_FAMILIES.has(familyKey) || type.includes('needleleaf') || type.includes('needle leaf')) {
    return 'conifer';
  }
  if (type.includes('deciduous') && type.includes('broadleaf')) return 'broadleaf_deciduous';
  if (type.includes('evergreen') && type.includes('broadleaf')) return 'broadleaf_evergreen';
  return null;
}

export function enrichTreeWithTaxonomy(tree, taxonomyIndex) {
  if (!tree || !taxonomyIndex) return tree;
  const key = normalizeTaxonName(tree.identity?.scientificName);
  if (!key) return tree;
  const taxon = taxonomyIndex[key];
  if (!taxon) return tree;
  const form = morphologyFromTaxonomy(taxon.functionalType, taxon.family);
  return {
    ...tree,
    identity: {
      ...tree.identity,
      genus: taxon.genus || tree.identity?.genus || null,
      family: taxon.family || tree.identity?.family || null,
      taxonomyCatalogMatch: true,
      taxonomyCatalogKey: taxon.key || null
    },
    morphology: {
      ...tree.morphology,
      form: form || tree.morphology?.form || 'unclassified_tree',
      taxonomyFunctionalType: taxon.functionalType || null
    }
  };
}

export function chooseTreeLod(zoom, visibleTreeCount = null, mobile = false) {
  const z = Number(zoom);
  if (!Number.isFinite(z)) return 'lod2';
  const count = visibleTreeCount == null ? null : Math.max(0, Number(visibleTreeCount) || 0);
  const closeDetailBudget = mobile ? 250 : 750;
  const mediumDetailBudget = mobile ? 1800 : 4500;
  if (z >= 17.15 && (count === null || count <= closeDetailBudget)) return 'lod0';
  if (z >= 14.25 && (count === null || count <= mediumDetailBudget)) return 'lod1';
  return 'lod2';
}

export function treeInstanceBudget({ mobile = false, lowMemory = false, highTier = false } = {}) {
  if (lowMemory) return 1600;
  if (mobile) return 4200;
  return highTier ? 16000 : 10000;
}

export function treeDisplayHeightMeters(tree) {
  const source = Number(tree?.height?.meters);
  if (Number.isFinite(source) && source > 0) return clamp(source, 2, 80);
  return 8;
}

export function chooseTreeModel(tree, models) {
  const form = tree?.morphology?.form || 'unclassified_tree';
  const genus = String(tree?.identity?.genus || '').trim().toLowerCase();
  const leafCycle = String(tree?.morphology?.leafCycle || 'unknown').toLowerCase();
  const procedural = asArray(models).filter(model =>
    model?.modelType === 'PROCEDURAL_ARCHETYPE'
  );

  if (procedural.length) {
    const genusMatches = procedural.filter(model =>
      asArray(model.knownGenera).some(value => String(value).toLowerCase() === genus)
    );
    if (genusMatches.length) {
      // When the same genus has deciduous and evergreen archetypes, source
      // phenology selects the appropriate silhouette without asserting species.
      const phenologyMatches = genusMatches.filter(model =>
        !leafCycle || leafCycle === 'unknown' ||
        String(model.leafCycle || '').toLowerCase() === leafCycle
      );
      const candidates = phenologyMatches.length ? phenologyMatches : genusMatches;
      const chosen = candidates[Math.floor(stableNumber(tree.id + '|genus-archetype') * candidates.length)];
      return chosen.id;
    }

    let family = form;
    if (family === 'unclassified_tree') {
      family = leafCycle === 'evergreen' || leafCycle === 'semi_evergreen'
        ? 'broadleaf_evergreen' : 'broadleaf_deciduous';
    }
    let candidates = procedural.filter(model => model.modelFamily === family);
    if (!candidates.length && family === 'broadleaf_deciduous') {
      candidates = procedural.filter(model => model.modelFamily === 'broadleaf_evergreen');
    }
    if (!candidates.length && family === 'broadleaf_evergreen') {
      candidates = procedural.filter(model => model.modelFamily === 'broadleaf_deciduous');
    }
    if (!candidates.length) candidates = procedural.filter(model =>
      model.modelFamily === 'broadleaf_deciduous' || model.modelFamily === 'broadleaf_evergreen'
    );
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.id.localeCompare(b.id));
    return candidates[Math.floor(stableNumber(tree.id + '|morphotype') * candidates.length)].id;
  }

  // Backward-compatible starter-model path used only when the procedural bank is
  // not present. Poly Haven's three CC0 files remain non-exact proxies by default.
  const exact = asArray(models).find(model => {
    const match = model?.botanicalMatch;
    return match?.level === 'genus' &&
      String(match.scientificName || '').toLowerCase() === genus;
  });
  if (exact) return exact.id;
  if (form === 'palm') return null;
  if (form === 'conifer') {
    return asArray(models).some(model => model.id === FALLBACK_CONIFER_MODEL)
      ? FALLBACK_CONIFER_MODEL : null;
  }
  if (form === 'broadleaf_deciduous' || form === 'broadleaf_evergreen' ||
      form === 'unclassified_tree') {
    return asArray(models).some(model => model.id === FALLBACK_BROADLEAF_MODEL)
      ? FALLBACK_BROADLEAF_MODEL : null;
  }
  return null;
}

function variantForTree(tree, modelId, variantsByArchetype) {
  if (!String(modelId).startsWith('proc_')) return null;
  const archetypeId = String(modelId).slice(5);
  const candidates = variantsByArchetype?.get(archetypeId) || [];
  if (!candidates.length) return null;
  const index = Math.floor(stableNumber(tree.id + '|' + modelId + '|variant') * candidates.length);
  return candidates[index] || null;
}

export function normalizeViewportTrees(
  features,
  models,
  maxInstances,
  variantsByArchetype = null,
  taxonomyIndex = null
) {
  const output = [];
  const seen = new Set();
  const supported = new Set(asArray(models).map(model => model.id));
  let unsupported = 0;
  let truncated = 0;
  let sourceCount = 0;
  const modelById = new Map(asArray(models).map(model => [model.id, model]));

  for (const feature of asArray(features)) {
    const rawTree = normalizeTreeFeature(feature);
    if (!rawTree || seen.has(rawTree.id)) continue;
    seen.add(rawTree.id);
    sourceCount++;
    const tree = enrichTreeWithTaxonomy(rawTree, taxonomyIndex);
    const modelId = chooseTreeModel(tree, models);
    if (!modelId || !supported.has(modelId)) {
      unsupported++;
      continue;
    }
    if (output.length >= maxInstances) {
      truncated++;
      continue;
    }
    const variant = variantForTree(tree, modelId, variantsByArchetype);
    output.push({
      ...tree,
      modelId,
      modelType: modelById.get(modelId)?.modelType || 'CC0_SOURCE_MODEL',
      variantId: variant?.id || null,
      variantSeed: variant?.seed ?? Math.floor(stableNumber(tree.id + '|seed') * 4294967295),
      variantParameters: variant?.parameters || null
    });
  }

  return { trees: output, unsupported, sourceCount, truncated };
}

function stableNumber(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash / 4294967296;
}

function pickManifestModel(manifest, id) {
  return asArray(manifest?.models).find(model => model?.id === id) || null;
}

function pickLod(model, lod) {
  return asArray(model?.lods).find(entry => entry?.level === lod && typeof entry?.url === 'string') ||
    asArray(model?.lods).find(entry => entry?.level === 'lod2' && typeof entry?.url === 'string') ||
    null;
}

function validateManifest(raw) {
  if (!raw || raw.schemaVersion !== 1 ||
      !['CC0-1.0', 'MIXED_PER_ASSET'].includes(raw.license) ||
      !Array.isArray(raw.models) || raw.models.length < 1) {
    throw new Error('TREE_ASSET_MANIFEST_INVALID');
  }
  const seen = new Set();
  for (const model of raw.models) {
    if (!/^[a-z0-9][a-z0-9_]{0,63}$/.test(String(model?.id || '')) ||
        seen.has(model.id) || !Array.isArray(model.lods) ||
        !['CC0-1.0', 'Apache-2.0'].includes(model.license)) {
      throw new Error('TREE_ASSET_MODEL_ENTRY_INVALID');
    }
    seen.add(model.id);
    for (const lod of model.lods) {
      const url = String(lod?.url || '');
      if (!url.startsWith('/assets/trees/') || !url.endsWith('.glb') || url.includes('..')) {
        throw new Error('TREE_ASSET_MODEL_URL_INVALID');
      }
    }
  }
  return raw;
}

async function importModules() {
  const [THREE, loaderModule] = await Promise.all([import(THREE_URL), import(GLTF_URL)]);
  if (!THREE?.WebGLRenderer || !loaderModule?.GLTFLoader) {
    throw new Error('TREE_THREE_OR_GLTFLOADER_UNAVAILABLE');
  }
  return { THREE, GLTFLoader: loaderModule.GLTFLoader };
}

function deriveWind(observations, center) {
  let best = null;
  let bestDistance = Infinity;
  for (const observation of asArray(observations)) {
    const lng = Number(observation?.lng ?? observation?.longitude);
    const lat = Number(observation?.lat ?? observation?.latitude);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    const dx = (lng - center.lng) * Math.cos(center.lat * Math.PI / 180);
    const dy = lat - center.lat;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      best = observation;
      bestDistance = distance;
    }
  }

  const speedMph = Number(best?.wind_speed_mph ??
    (finite(best?.wind_speed_kt) ? Number(best.wind_speed_kt) * 1.15078 : 0));
  const fromDegrees = Number(best?.wind_dir_deg ?? best?.wind_direction_deg ?? 0);
  const travelRadians = (fromDegrees + 180) * Math.PI / 180;
  const strength = clamp(0.08 + (Number.isFinite(speedMph) ? speedMph : 0) / 95, 0.08, 0.6);
  return {
    x: Math.sin(travelRadians),
    z: Math.cos(travelRadians),
    strength,
    source: best ? 'NEAREST_AVAILABLE_WEATHER_OBSERVATION' : 'SUBTLE_VISUAL_BREEZE'
  };
}

function addWindAttribute(THREE, geometry) {
  const position = geometry.getAttribute('position');
  if (!position) throw new Error('TREE_MODEL_POSITION_ATTRIBUTE_MISSING');

  const uv1 = geometry.getAttribute('uv1') || geometry.getAttribute('uv2');
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const range = Math.max(0.001, maxY - minY);
  const weights = new Float32Array(position.count);
  for (let i = 0; i < position.count; i++) {
    const normalizedHeight = clamp((position.getY(i) - minY) / range, 0, 1);
    const sourceWeight = uv1 ? clamp(uv1.getX(i), 0, 1) : Math.pow(normalizedHeight, 1.65);
    weights[i] = sourceWeight;
  }
  geometry.setAttribute('bpWindWeight', new THREE.BufferAttribute(weights, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function installWindShader(material, uniforms) {
  material.onBeforeCompile = shader => {
    shader.uniforms.bpWindTime = uniforms.time;
    shader.uniforms.bpWindStrength = uniforms.strength;
    shader.uniforms.bpWindDirection = uniforms.direction;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nattribute float bpWindWeight;\nattribute vec4 bpTreeMorph;\nattribute vec3 bpTreeFoliage;\nuniform float bpWindTime;\nuniform float bpWindStrength;\nuniform vec2 bpWindDirection;'
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float bpTreeHeight = clamp(position.y, 0.0, 1.0);
      float bpCrownMask = smoothstep(0.24, 0.82, bpTreeHeight);
      float bpCrownRadial = 1.0 + bpTreeMorph.x * bpCrownMask;
      float bpLeafMask = smoothstep(0.58, 0.92, bpWindWeight);
      float bpLeafScale = 1.0 + bpTreeFoliage.x * bpLeafMask;
      transformed.x *= bpCrownRadial * bpLeafScale;
      transformed.z *= (1.0 + bpTreeMorph.z * bpCrownMask) * bpLeafScale;
      transformed.x += bpTreeMorph.y * bpCrownMask;
      transformed.z += bpTreeMorph.w * bpCrownMask * (0.22 + bpTreeHeight * 0.35);
      float bpDensity = clamp(1.0 + bpTreeFoliage.y * 1.1, 0.75, 1.25);
      float bpGustA = sin(bpWindTime * 1.15 + position.y * 7.0 + position.x * 2.3 + bpTreeFoliage.z * 6.28318);
      float bpGustB = sin(bpWindTime * 0.57 + position.y * 3.2 + position.z * 4.1 + bpTreeMorph.y * 8.0);
      float bpFlex = bpWindWeight * bpWindStrength * bpDensity * (0.72 * bpGustA + 0.28 * bpGustB) * 0.075;
      vec3 bpWindLocal = normalize(vec3(bpWindDirection.x, 0.0, bpWindDirection.y));
      #ifdef USE_INSTANCING
        bpWindLocal = normalize(transpose(mat3(instanceMatrix)) * bpWindLocal);
      #endif
      transformed.x += bpWindLocal.x * bpFlex;
      transformed.z += bpWindLocal.z * bpFlex;
      transformed.y += abs(bpFlex) * 0.08;
      `
    );
  };
  material.customProgramCacheKey = () => 'bp-tree-wind-weight-v1';
  material.needsUpdate = true;
}

function disposeTreeGroup(group) {
  if (!group) return;
  group.traverse(object => {
    if (object.geometry) object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : (object.material ? [object.material] : []);
    for (const material of materials) {
      for (const value of Object.values(material || {})) {
        if (value?.isTexture) value.dispose();
      }
      material?.dispose?.();
    }
  });
}

function pointInsideBounds(map, tree) {
  try {
    const bounds = map.getBounds();
    return bounds.contains([tree.coordinates[0], tree.coordinates[1]]);
  } catch (_) {
    return true;
  }
}

function getSourceTrees(map) {
  const cache = map.__BP_LIVING_TILE_CACHE_V6017__;
  const cached = asArray(cache?.trees);
  if (cached.length) return cached;

  try {
    const sourceFeatures = map.querySourceFeatures?.('bpTreeLod') || [];
    if (sourceFeatures.length) return sourceFeatures;
  } catch (_) {}

  try {
    return map.queryRenderedFeatures?.({ layers: ['gta-bp-tree-crowns'] }) || [];
  } catch (_) {
    return [];
  }
}

function discoverWindObservations() {
  try {
    return window.BridgePointWorldEffects?.getState?.()?.data?.observations || [];
  } catch (_) {
    return [];
  }
}

function captureLegacyVisibility(map) {
  const result = {};
  for (const id of LEGACY_LAYER_IDS) {
    if (!map.getLayer?.(id)) continue;
    try {
      result[id] = map.getLayoutProperty(id, 'visibility') || 'visible';
    } catch (_) {
      result[id] = 'visible';
    }
  }
  return result;
}

function setLegacyVisibility(map, visibility) {
  for (const id of LEGACY_LAYER_IDS) {
    if (!map.getLayer?.(id)) continue;
    try {
      map.setLayoutProperty(id, 'visibility', visibility);
    } catch (_) {}
  }
}

export async function attachTreeInstancedRenderer(map, options = {}) {
  if (!map || typeof map.addLayer !== 'function') {
    throw new TypeError('A live MapLibre map is required.');
  }
  if (map.getLayer?.(LAYER_ID)) return window.__BP_TREE_INSTANCE_RENDERER_V1__ || null;

  const mobile = options.mobile ?? (innerWidth <= 900);
  const memory = Number(navigator.deviceMemory || 4);
  const lowMemory = options.lowMemory ?? (memory <= 3);
  const highTier = options.highTier ?? (memory >= 8 && Number(navigator.hardwareConcurrency || 4) >= 8);
  const maxInstances = options.maxInstances ?? treeInstanceBudget({ mobile, lowMemory, highTier });

  const state = {
    version: VERSION,
    status: 'loading-manifest',
    manifestUrl: MANIFEST_URL,
    modelCount: 0,
    proceduralModelCount: 0,
    proceduralVariantCount: 0,
    taxonomySpeciesCount: 0,
    taxonomyMatches: 0,
    variantCountUsed: 0,
    instanceCount: 0,
    gpuDrawCalls: 0,
    gpuTriangles: 0,
    firstFrameAt: null,
    sourceCount: 0,
    unsupported: 0,
    lod: null,
    legacyRetained: true,
    legacyLayersHidden: false,
    windSource: 'SUBTLE_VISUAL_BREEZE',
    updatedAt: Date.now()
  };
  window.__BP_TREE_INSTANCE_RENDERER_V1__ = state;

  let manifest = null;
  let variantsByArchetype = new Map();
  let taxonomyIndex = null;
  let THREE = null;
  let loader = null;
  let layer = null;
  let renderer = null;
  let camera = null;
  let scene = null;
  let uniforms = null;
  let activeMeshes = [];
  let activeTrees = [];
  let currentLod = null;
  let activeSignature = '';
  let loadSequence = 0;
  let repaintTimer = 0;
  let windUpdatedAt = 0;
  let legacyVisibility = null;
  let destroyed = false;

  const publish = (status, extra = {}) => {
    Object.assign(state, { status, ...extra, updatedAt: Date.now() });
  };

  function restoreLegacyVisibility() {
    if (legacyVisibility) {
      for (const [id, visibility] of Object.entries(legacyVisibility)) {
        if (!map.getLayer?.(id)) continue;
        try { map.setLayoutProperty(id, 'visibility', visibility); } catch (_) {}
      }
    } else {
      setLegacyVisibility(map, 'visible');
    }
  }

  async function loadManifest() {
    const response = await fetch(options.manifestUrl || MANIFEST_URL, {
      cache: 'no-cache',
      credentials: 'omit',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('TREE_ASSET_MANIFEST_HTTP_' + response.status);
    manifest = validateManifest(await response.json());
    const proceduralModels = manifest.models.filter(model =>
      model.modelType === 'PROCEDURAL_ARCHETYPE'
    );
    const variantResponse = await fetch(options.variantsUrl || VARIANTS_URL, {
      cache: 'no-cache',
      credentials: 'omit',
      headers: { Accept: 'application/json' }
    });
    if (proceduralModels.length && !variantResponse.ok) {
      throw new Error('TREE_PROCEDURAL_VARIANT_CATALOG_HTTP_' + variantResponse.status);
    }
    if (variantResponse.ok) {
      const variantCatalog = await variantResponse.json();
      if (variantCatalog.schemaVersion !== 1 ||
          !Array.isArray(variantCatalog.variants) ||
          Number(variantCatalog.variantCount) !== variantCatalog.variants.length ||
          variantCatalog.variantCount < 2000) {
        throw new Error('TREE_PROCEDURAL_VARIANT_CATALOG_INVALID');
      }
      variantsByArchetype = new Map();
      for (const variant of variantCatalog.variants) {
        if (!variant?.archetypeId || !variant?.id || !variant?.parameters) continue;
        if (!variantsByArchetype.has(variant.archetypeId)) {
          variantsByArchetype.set(variant.archetypeId, []);
        }
        variantsByArchetype.get(variant.archetypeId).push(variant);
      }
      for (const [key, list] of variantsByArchetype) {
        list.sort((a, b) => a.variantIndex - b.variantIndex);
        if (list.length !== 64) throw new Error('TREE_VARIANT_ARCHEtype_COUNT_INVALID_' + key);
      }
      state.proceduralVariantCount = variantCatalog.variantCount;
    }

    if (proceduralModels.length) {
      const taxonomyResponse = await fetch(options.taxonomyIndexUrl || TAXONOMY_INDEX_URL, {
        cache: 'force-cache',
        credentials: 'omit',
        headers: { Accept: 'application/json' }
      });
      if (!taxonomyResponse.ok) {
        throw new Error('TREE_TAXONOMY_INDEX_HTTP_' + taxonomyResponse.status);
      }
      const taxonomyCatalog = await taxonomyResponse.json();
      if (taxonomyCatalog.schemaVersion !== 1 ||
          taxonomyCatalog.license !== 'CC-BY-4.0' ||
          !taxonomyCatalog.species ||
          Object.keys(taxonomyCatalog.species).length < 20000) {
        throw new Error('TREE_TAXONOMY_INDEX_INVALID');
      }
      taxonomyIndex = taxonomyCatalog.species;
      state.taxonomySpeciesCount = Object.keys(taxonomyIndex).length;
    }
    publish('manifest-ready', {
      modelCount: manifest.models.length,
      proceduralModelCount: proceduralModels.length,
      proceduralVariantCount: state.proceduralVariantCount,
      taxonomySpeciesCount: state.taxonomySpeciesCount
    });
  }

  async function loadModel(modelId, lodKey) {
    const model = pickManifestModel(manifest, modelId);
    const file = pickLod(model, lodKey);
    if (!file) throw new Error('TREE_MODEL_LOD_MISSING_' + modelId + '_' + lodKey);
    const cacheKey = modelId + '|' + file.level + '|' + file.url;
    if (loadModel.cache.has(cacheKey)) return loadModel.cache.get(cacheKey);

    const promise = loader.loadAsync(file.url).then(gltf => {
      const root = gltf.scene || gltf.scenes?.[0];
      if (!root) throw new Error('TREE_MODEL_SCENE_MISSING_' + modelId);
      root.updateMatrixWorld(true);
      const meshes = [];
      root.traverse(object => {
        if (!object.isMesh || !object.geometry) return;
        const geometry = object.geometry.clone();
        geometry.applyMatrix4(object.matrixWorld);
        addWindAttribute(THREE, geometry);
        const rawMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const materials = rawMaterials.filter(Boolean).map(raw => {
          const material = raw.clone();
          installWindShader(material, uniforms);
          return material;
        });
        if (!materials.length) return;
        meshes.push({ geometry, material: materials.length === 1 ? materials[0] : materials });
      });
      if (!meshes.length) throw new Error('TREE_MODEL_HAS_NO_MESHES_' + modelId);
      return { id: modelId, lod: file.level, meshes, file, model };
    }).catch(error => {
      loadModel.cache.delete(cacheKey);
      throw error;
    });
    loadModel.cache.set(cacheKey, promise);
    return promise;
  }
  loadModel.cache = new Map();

  function rebuildMeshInstances() {
    if (!THREE || !scene || !manifest || destroyed) return;
    const lodKey = chooseTreeLod(map.getZoom(), activeTrees.length, mobile);
    currentLod = lodKey;
    const groups = new Map();
    for (const tree of activeTrees) {
      if (!groups.has(tree.modelId)) groups.set(tree.modelId, []);
      groups.get(tree.modelId).push(tree);
    }
    const sequence = ++loadSequence;
    const everyTreeHasModel = activeTrees.length > 0 &&
      state.unsupported === 0 &&
      state.truncated === 0 &&
      activeTrees.length === state.sourceCount;
    if (!everyTreeHasModel) {
      for (const old of activeMeshes) scene.remove(old);
      activeMeshes = [];
      state.instanceCount = 0;
      restoreLegacyVisibility();
      state.legacyLayersHidden = false;
      state.legacyRetained = true;
      publish('fallback-incomplete-viewport-coverage', {
        lod: lodKey,
        instanceCount: 0,
        unsupported: state.unsupported,
        truncated: state.truncated,
        legacyRetained: true,
        legacyLayersHidden: false
      });
      return;
    }
    publish('loading-model-lod', { lod: lodKey, instanceCount: activeTrees.length });

    Promise.all([...groups.entries()].map(([modelId, trees]) =>
      loadModel(modelId, lodKey).then(loaded => ({ loaded, trees }))
    )).then(results => {
      if (destroyed || sequence !== loadSequence) return;
      const nextMeshes = [];
      const usedVariants = new Set();
      for (const result of results) {
        const treeModels = result.trees;
        const loaded = result.loaded;
        for (const part of loaded.meshes) {
          const instanceGeometry = part.geometry.clone();
          const morphData = new Float32Array(treeModels.length * 4);
          const foliageData = new Float32Array(treeModels.length * 3);
          const foliageColors = new Float32Array(treeModels.length * 3);
          for (let i = 0; i < treeModels.length; i++) {
            const params = treeModels[i].variantParameters || {};
            morphData[i * 4 + 0] = clamp(Number(params.crownSpread ?? 1) - 1, -0.25, 0.25);
            morphData[i * 4 + 1] = clamp(Number(params.crownOffset || 0), -0.08, 0.08);
            morphData[i * 4 + 2] = clamp(Number(params.crownDepth ?? 1) - 1, -0.25, 0.25);
            morphData[i * 4 + 3] = clamp(Number(params.branchAsymmetry || 0), -0.25, 0.25);
            foliageData[i * 3 + 0] = clamp(Number(params.leafScale ?? 1) - 1, -0.2, 0.2);
            foliageData[i * 3 + 1] = clamp(Number(params.foliageDensity ?? 1) - 1, -0.2, 0.2);
            foliageData[i * 3 + 2] = clamp(Number(params.windPhase || 0) / (Math.PI * 2), 0, 1);
            const density = clamp(Number(params.foliageDensity ?? 1), 0.82, 1.18);
            const hue = 0.285 + (stableNumber(treeModels[i].id + '|hue') - 0.5) * 0.035;
            const saturation = clamp(0.30 + (density - 1) * 0.55, 0.18, 0.42);
            const lightness = clamp(0.55 - (density - 1) * 0.24, 0.48, 0.62);
            const color = new THREE.Color().setHSL(hue, saturation, lightness);
            foliageColors[i * 3 + 0] = color.r;
            foliageColors[i * 3 + 1] = color.g;
            foliageColors[i * 3 + 2] = color.b;
            if (treeModels[i].variantId) usedVariants.add(treeModels[i].variantId);
          }
          instanceGeometry.setAttribute(
            'bpTreeMorph',
            new THREE.InstancedBufferAttribute(morphData, 4)
          );
          instanceGeometry.setAttribute(
            'bpTreeFoliage',
            new THREE.InstancedBufferAttribute(foliageData, 3)
          );
          const mesh = new THREE.InstancedMesh(instanceGeometry, part.material, treeModels.length);
          mesh.count = treeModels.length;
          mesh.frustumCulled = false;
          mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
          const matrix = new THREE.Matrix4();
          const yaw = new THREE.Matrix4();
          const scale = new THREE.Matrix4();
          const rotation = new THREE.Matrix4();
          for (let i = 0; i < treeModels.length; i++) {
            const tree = treeModels[i];
            const lng = tree.coordinates[0], lat = tree.coordinates[1];
                const altitude = map.queryTerrainElevation?.([lng, lat], { exaggerated: false });
            const ground = altitude === null || altitude === undefined || !Number.isFinite(Number(altitude))
              ? 0 : Number(altitude);
            const modelArray = map.transform?.getMatrixForModel?.([lng, lat], ground);
            if (!modelArray) throw new Error('TREE_GEOGRAPHIC_MODEL_MATRIX_UNAVAILABLE');
            matrix.fromArray(modelArray);
            yaw.makeRotationY(stableNumber(tree.id) * Math.PI * 2);
            const height = treeDisplayHeightMeters(tree);
            scale.makeScale(height, height, height);
            rotation.copy(yaw).multiply(scale);
            const params = tree.variantParameters || {};
            const lean = new THREE.Matrix4().makeRotationZ(clamp(Number(params.trunkLeanX || 0), -0.06, 0.06));
            rotation.multiply(lean);
            matrix.multiply(rotation);
            mesh.setMatrixAt(i, matrix);
            if (mesh.setColorAt) {
              const tint = new THREE.Color(
                foliageColors[i * 3 + 0],
                foliageColors[i * 3 + 1],
                foliageColors[i * 3 + 2]
              );
              mesh.setColorAt(i, tint);
            }
          }
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          mesh.geometry.getAttribute('bpTreeMorph').needsUpdate = true;
          mesh.geometry.getAttribute('bpTreeFoliage').needsUpdate = true;
          mesh.computeBoundingSphere?.();
          nextMeshes.push(mesh);
        }
      }

      for (const old of activeMeshes) {
        scene.remove(old);
        old.dispose?.();
      }
      activeMeshes = nextMeshes;
      for (const mesh of activeMeshes) scene.add(mesh);

      setLegacyVisibility(map, 'none');
      state.legacyLayersHidden = true;
      state.legacyRetained = false;
      publish('render-ready', {
        lod: lodKey,
        instanceCount: activeTrees.length,
        batches: activeMeshes.length,
        variantCountUsed: usedVariants.size,
        proceduralInstanceCount: activeTrees.filter(tree => tree.modelType === 'PROCEDURAL_ARCHETYPE').length,
        unsupported: state.unsupported,
        truncated: state.truncated,
        legacyRetained: state.legacyRetained,
        legacyLayersHidden: state.legacyLayersHidden
      });
      map.triggerRepaint?.();
    }).catch(error => {
      publish('model-load-fallback', {
        error: String(error?.message || error),
        legacyRetained: true,
        legacyLayersHidden: false
      });
      restoreLegacyVisibility();
    });
  }

  function refreshInstances() {
    if (destroyed || !manifest || !THREE || !scene) return;
    const all = getSourceTrees(map).filter(feature => {
      const coordinate = feature?.geometry?.coordinates;
      if (feature?.geometry?.type !== 'Point' || !Array.isArray(coordinate)) return false;
      const provisional = { coordinates: coordinate };
      return pointInsideBounds(map, provisional);
    });
    const normalized = normalizeViewportTrees(
      all, manifest.models, maxInstances, variantsByArchetype, taxonomyIndex
    );
    state.taxonomyMatches = normalized.trees.filter(tree =>
      tree.identity?.taxonomyCatalogMatch === true
    ).length;
    const nextTrees = normalized.trees;
    const nextLod = chooseTreeLod(map.getZoom(), nextTrees.length, mobile);
    const signature = nextTrees.map(tree =>
      tree.id + ':' + tree.modelId + ':' + tree.variantId + ':' + tree.height.meters
    ).join('|') + ':' + normalized.unsupported + ':' + normalized.truncated + ':' + nextLod;

    state.sourceCount = normalized.sourceCount;
    state.unsupported = normalized.unsupported;
    state.truncated = normalized.truncated;
    if (!nextTrees.length) {
      activeTrees = [];
      activeSignature = '';
      for (const old of activeMeshes) scene.remove(old);
      activeMeshes = [];
      restoreLegacyVisibility();
      publish('waiting-for-source-trees', {
        instanceCount: 0, legacyRetained: true, legacyLayersHidden: false
      });
      return;
    }
    if (signature === activeSignature) return;
    activeTrees = nextTrees;
    activeSignature = signature;
    rebuildMeshInstances();
  }

  function updateWind() {
    const now = performance.now();
    if (now - windUpdatedAt < 4500) return;
    windUpdatedAt = now;
    const center = map.getCenter();
    const wind = deriveWind(discoverWindObservations(), center);
    uniforms.direction.value.set(wind.x, wind.z);
    uniforms.strength.value = wind.strength;
    publish(state.status, { windSource: wind.source, windStrength: wind.strength });
  }

  function scheduleAnimation() {
    if (repaintTimer || destroyed || document.hidden || !state.instanceCount) return;
    repaintTimer = setTimeout(() => {
      repaintTimer = 0;
      if (!destroyed && !document.hidden) map.triggerRepaint?.();
    }, mobile ? 70 : 45);
  }

  function installLayer() {
    layer = {
      id: LAYER_ID,
      type: 'custom',
      renderingMode: '3d',
      onAdd(mapRef, gl) {
        this.map = mapRef;
        renderer = new THREE.WebGLRenderer({
          canvas: mapRef.getCanvas(),
          context: gl,
          antialias: false,
          alpha: true,
          powerPreference: lowMemory ? 'low-power' : 'high-performance'
        });
        renderer.autoClear = false;
        renderer.setPixelRatio?.(1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.NoToneMapping;
        camera = new THREE.Camera();
        scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xe4f4ff, 0x263720, 1.3));
        const sun = new THREE.DirectionalLight(0xfff4dc, 1.65);
        sun.position.set(-35, 65, 55);
        scene.add(sun);
        uniforms = {
          time: { value: 0 },
          strength: { value: 0.2 },
          direction: { value: new THREE.Vector2(0, 1) }
        };
        loadModel.cache.clear();
        publish('renderer-attached', { renderer: 'THREE_INSTANCEDMESH_SHARED_MAPLIBRE_GL_CONTEXT' });
        refreshInstances();
      },
      render(gl, args) {
        if (!renderer || !camera || !scene || destroyed) return;
        if (document.hidden) return;
        camera.projectionMatrix.fromArray(args.defaultProjectionData.mainMatrix);
        uniforms.time.value = performance.now() / 1000;
        updateWind();
        renderer.resetState();
        renderer.render(scene, camera);
        if (!state.firstFrameAt && state.instanceCount > 0) {
          state.firstFrameAt = Date.now();
          state.gpuDrawCalls = Number(renderer.info?.render?.calls || 0);
          state.gpuTriangles = Number(renderer.info?.render?.triangles || 0);
          state.updatedAt = state.firstFrameAt;
        }
        if (state.instanceCount > 0) scheduleAnimation();
        if (state.legacyLayersHidden) setLegacyVisibility(map, 'none');
      },
      onRemove() {
        destroyed = true;
        clearTimeout(repaintTimer);
        for (const mesh of activeMeshes) scene?.remove(mesh);
        activeMeshes = [];
        for (const cached of loadModel.cache.values()) {
          // Cache promises may settle after the map is destroyed; no dispose is
          // attempted here because a promise can still be in flight.
          void cached.catch(() => {});
        }
        try { renderer?.dispose?.(); } catch (_) {}
        renderer = null;
        restoreLegacyVisibility();
        publish('removed', { legacyLayersHidden: false, legacyRetained: true });
      }
    };
    if (!map.getLayer?.(LAYER_ID)) map.addLayer(layer);
  }

  try {
    await loadManifest();
    const modules = await importModules();
    THREE = modules.THREE;
    loader = new modules.GLTFLoader();
    legacyVisibility = captureLegacyVisibility(map);
    installLayer();
    map.on('moveend', refreshInstances);
    map.on('zoomend', refreshInstances);
    map.on('idle', refreshInstances);
    map.on('remove', () => {
      try { if (map.getLayer?.(LAYER_ID)) map.removeLayer(LAYER_ID); } catch (_) {}
    });
    publish('active', { maxInstances, legacyRetained: true });
    refreshInstances();
    return state;
  } catch (error) {
    publish('unavailable-fallback', {
      error: String(error?.message || error),
      legacyRetained: true,
      legacyLayersHidden: false
    });
    return state;
  }
}

