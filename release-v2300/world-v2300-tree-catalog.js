/**
 * BridgePoint Tree Asset Contract — V1
 *
 * Pure source-to-model metadata adapter. This module intentionally does not
 * create positions, heights, or species labels. It only normalizes facts that
 * already exist on a source-backed tree feature so future LOD renderers can
 * select a model without changing the source geometry.
 *
 * No renderer imports this module yet; the current production trees remain
 * untouched until the asset/instancing path passes its own tests.
 */

const firstText = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
};

const positiveNumber = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return null;
};

const normalize = value => String(value || '')
  .normalize('NFKD')
  .toLowerCase()
  .replace(/[\\u0300-\\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const CONIFER_GENERA = new Set([
  'abies', 'araucaria', 'cedrus', 'chamaecyparis', 'cryptomeria',
  'cupressus', 'juniperus', 'larix', 'picea', 'pinus', 'podocarpus',
  'sequoia', 'taxodium', 'taxus', 'thuja', 'tsuga'
]);

const PALM_GENERA = new Set([
  'areca', 'cocos', 'phoenix', 'sabal', 'syagrus', 'trachycarpus',
  'washingtonia'
]);

const parseGenus = scientificName => {
  if (!scientificName) return null;
  const parts = scientificName.replace(/^×\\s*/, '').trim().split(/\\s+/);
  return parts.length ? parts[0].replace(/[^A-Za-zÀ-ÿ-]/g, '') || null : null;
};

const stableHash = value => {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const classifyForm = ({ scientificName, genus, family, leafType, leafCycle, tags, raw }) => {
  const text = normalize([
    scientificName, genus, family, leafType, leafCycle,
    tags?.natural, tags?.leaf_type, tags?.leaf_cycle,
    raw?.subtype, raw?.class, raw?.asset_kind
  ].filter(Boolean).join(' '));

  const genusKey = normalize(genus || '').split(' ')[0];
  if (PALM_GENERA.has(genusKey) || /\\b(palm|palmate frond)\\b/.test(text)) return 'palm';
  if (CONIFER_GENERA.has(genusKey) || /\\b(conifer|needle|needleleaved|pine|spruce|fir|cedar|cypress|juniper|hemlock|yew)\\b/.test(text)) return 'conifer';
  if (/\\b(broadleaf|broad leaved|deciduous)\\b/.test(text) || leafCycle === 'deciduous') return 'broadleaf_deciduous';
  if (/\\b(evergreen|laurel|holly|magnolia|olive)\\b/.test(text) || leafCycle === 'evergreen') return 'broadleaf_evergreen';
  return 'unclassified_tree';
};

const normalizeLeafCycle = value => {
  const text = normalize(value);
  if (/\\b(evergreen|perennial)\\b/.test(text)) return 'evergreen';
  if (/\\b(deciduous|broadleaf deciduous)\\b/.test(text)) return 'deciduous';
  if (/\\b(semi evergreen|semi evergreen)\\b/.test(text)) return 'semi_evergreen';
  if (/\\b(mixed)\\b/.test(text)) return 'mixed';
  return 'unknown';
};

/**
 * Convert one source tree Point feature into a stable rendering descriptor.
 * Returns null for non-Point or invalid coordinates. Coordinates are copied
 * exactly; height truth is never upgraded from a derived render height.
 */
export function normalizeTreeFeature(feature) {
  const geometry = feature?.geometry;
  const coordinates = geometry?.type === 'Point' ? geometry.coordinates : null;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) ||
      longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return null;

  const raw = feature?.properties || {};
  const tags = raw.properties?.tags || raw.tags || {};
  const scientificName = firstText(raw.species, tags.species, raw.scientific_name, raw.taxon);
  const commonName = firstText(raw.common_name, tags['species:en'], tags.name, raw.name);
  const genus = firstText(raw.genus, tags.genus) || parseGenus(scientificName);
  const family = firstText(raw.family, tags.family);
  const leafType = firstText(raw.leaf_type, tags.leaf_type);
  const leafCycle = normalizeLeafCycle(firstText(raw.leaf_cycle, tags.leaf_cycle, raw.phenology));
  const form = classifyForm({ scientificName, genus, family, leafType, leafCycle, tags, raw });

  const sourceHeight = positiveNumber(raw.height_m, tags.height_m, tags.height);
  const renderHeight = positiveNumber(raw.render_height_m);
  const heightMeters = sourceHeight ?? renderHeight;
  const heightTruth = firstText(
    raw.height_truth,
    sourceHeight !== null ? 'SOURCE_MEASURED_OR_DECLARED' :
      renderHeight !== null ? 'DERIVED_RENDER_HEIGHT' : 'HEIGHT_UNAVAILABLE'
  ).toUpperCase();

  const sourceKey = firstText(raw.source_key, raw.source, 'tree');
  const sourceRecordId = firstText(raw.source_record_id, raw.tree_id, raw.id, feature?.id);
  const stableSeed = sourceRecordId
    ? sourceKey + '|' + sourceRecordId
    : sourceKey + '|' + longitude.toFixed(8) + '|' + latitude.toFixed(8);
  const id = 'tree-' + stableHash(stableSeed);

  const positionTruth = firstText(raw.position_truth, 'SOURCE_POSITION').toUpperCase();
  const speciesIdentity = scientificName ? 'species' : genus ? 'genus' : family ? 'family' : 'unknown';

  return Object.freeze({
    id,
    coordinates: Object.freeze([longitude, latitude]),
    source: Object.freeze({ key: sourceKey, recordId: sourceRecordId }),
    placement: Object.freeze({ truth: positionTruth }),
    identity: Object.freeze({
      scientificName,
      commonName,
      genus,
      family,
      level: speciesIdentity
    }),
    morphology: Object.freeze({
      form,
      leafCycle,
      leafType: leafType || 'unknown',
      crownDiameterMeters: positiveNumber(raw.crown_diameter_m, tags.crown_diameter_m),
      trunkDiameterMeters: positiveNumber(raw.trunk_diameter_m, tags.trunk_diameter_m),
      trunkHeightMeters: positiveNumber(raw.trunk_height_m, tags.trunk_height_m)
    }),
    height: Object.freeze({
      meters: heightMeters,
      truth: heightTruth,
      hasSourceHeight: sourceHeight !== null
    }),
    asset: Object.freeze({
      familyKey: form,
      lookupKey: scientificName ? normalize(scientificName).replace(/ /g, '_') : form,
      status: 'MODEL_CATALOG_NOT_ATTACHED',
      speciesModelVerified: false
    })
  });
}

export { classifyForm, normalizeLeafCycle };
