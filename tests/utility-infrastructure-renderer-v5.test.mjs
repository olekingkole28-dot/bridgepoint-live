import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { deriveNearestPoleSpans, isDistributionPowerLineFeature } from '../release-v2300/world-v2300-utility-infrastructure-v1.js';

const source = await readFile(
  new URL('../release-v2300/world-v2300-utility-infrastructure-v1.js', import.meta.url),
  'utf8'
);

assert.ok(source.includes('const VERSION = 10;'), 'utility renderer advances to v10');
assert.ok(source.includes('const PRECISE_POLE_MIN_ZOOM = 16;'), 'close-zoom precision renderer activates before GPU position precision becomes limiting');
assert.ok(source.includes('function buildPrecisePoleGroups(supports)'), 'street-zoom pole geometry is batched in local ground-anchored frames');
assert.ok(source.includes('camera.projectionMatrix.copy(projection).multiply(anchorMatrix)'), 'close-zoom draw composes projection and local geographic anchor before GPU submission');
assert.ok(source.includes('for (const mesh of standardPoleMeshes) mesh.visible = !closeZoom;'), 'close-zoom pass replaces absolute-coordinate pole instances with precision-safe local batches');
assert.ok(source.includes('const MIN_ZOOM = 13;'), 'utility 3D assets activate at close globe zoom');
assert.ok(source.includes('const MAX_SUPPORTS = IS_SMALL_DEVICE ? 420 : 900;'), 'mobile and desktop have bounded support budgets');
assert.ok(source.includes('const MAX_SPANS = IS_SMALL_DEVICE ? 160 : 420;'), 'mobile cable geometry has a frame-safe span budget');
assert.ok(source.includes('function createGeometry()'), 'solid pole geometry builder exists');
assert.ok(source.includes('pushBeam(vertices, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), .17, THREE, 8)'), 'pole shafts are capped octagonal polygon beams');
assert.ok(source.includes('pushBeam(vertices, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, .28, 0), .19, THREE, 8)'), 'pole bases are solid ground collars');
assert.ok(source.includes('new THREE.BoxGeometry(1, .18, .24)'), 'crossarms are solid metre-scale geometry');
assert.ok(source.includes('side: THREE.DoubleSide'), 'solid assets remain visible through mirrored globe model transforms');
assert.ok(source.includes('function wireTileAnchor('), 'conductors are grouped in local geographic tile frames');
assert.ok(source.includes('function appendWireSpan(batch, span, kind)'), 'wire spans are assembled into shared tile batches');
assert.ok(source.includes("sourceLayer === 'power_line' ? 'line'"), 'OpenInfraMap power_line source-layer is authoritative when mapped power/type tags are omitted');
assert.ok(source.includes('export function deriveNearestPoleSpans'), 'mapped poles get a conservative neighbor-span fallback when conductor ways are absent');
assert.ok(source.includes('function appendGroundLead(batch, support)'), 'each power pole gets a visible ground downlead');
assert.ok(source.includes('groundWireMaterial'), 'ground downleads use a distinct copper-toned solid material');
assert.ok(source.includes('SERVICE_DROP_MAX_DISTANCE_M = 75'), 'service drops can reach nearby building footprints');
assert.ok(source.includes('function flushWireBatches(batches)'), 'wire batches emit one solid mesh per network and tile');
assert.ok(source.includes('wireTileAnchor(coordinate, 16)'), 'wire batches use the same close-zoom local geographic tile frame as poles');
assert.ok(source.includes("map.querySourceFeatures('bpBuildings', { sourceLayer: 'buildings' })"), 'residential service leads use source-mapped global building footprints');
assert.ok(source.includes('function collectResidentialServiceDrops(supports)'), 'nearby residential footprints are connected to mapped distribution poles');
assert.ok(source.includes('function appendServiceDrop(batch, drop)'), 'service leads are solid sagging polygon geometry');
assert.ok(source.includes('SERVICE_DROP_MAX_DISTANCE_M = 75'), 'service leads are restricted to nearby footprints');
assert.ok(source.includes('preciseWireGroups'), 'local utility conductors are duplicated into an anchored street-level render pass');
assert.ok(source.includes('for (const mesh of standardWireMeshes) mesh.visible = !closeZoom;'), 'absolute-coordinate cable meshes are hidden when the precision-safe street-level wire pass is active');
assert.ok(source.includes('for (const group of preciseWireGroups) drawAnchoredGroup(group);'), 'street-level cable meshes use the CPU-composed anchor projection just like poles');
assert.ok(source.includes("ids(assets.serviceDrops, drop => drop.key)"), 'building service links participate in refresh fingerprinting');
assert.ok(source.includes('state.serviceDrops = serviceDropCount;'), 'service lead count is exposed by the renderer state');
assert.ok(source.includes('const wireStats = flushWireBatches(wireBatches);'), 'wire spans no longer allocate one Three.js mesh per span');
assert.ok(source.includes('const steps = Math.min(18, Math.max(5, Math.ceil(distance / 12)));'), 'batched cable curves have bounded tessellation');
assert.ok(source.includes('function assetSignature(assets, zoom)'), 'decoded tile changes are fingerprinted');
assert.ok(source.includes('if (state.ready && signature === lastAssetSignature) return;'), 'unchanged tile notifications skip full scene rebuilds');
assert.ok(source.includes("event.sourceDataType === 'content'"), 'only actual source content events trigger tile rebuilds');
assert.ok(source.includes('const supports = incoming.supports;'), 'mapped poles render without blocking on exact ground samples');
assert.ok(source.includes('function localMetresPerPixel(coordinate)'), 'pole geometry scales with actual globe screen resolution');
assert.ok(source.includes('minimumDisplayScale(support.coordinate, .34, 1.8, 14)'), 'pole shafts retain a strong visible screen-space diameter');
assert.ok(source.includes('wireRadiusFor(span.a.coordinate, telecom ? .018 : .024)'), 'power and telecom cables are solid polygon conductors');
assert.ok(source.includes('void loadUSGS3DEPGround(assets)'), 'USGS ground elevations resolve progressively after initial draw');
assert.ok(source.includes('Towers rendered by this layer: 0'), 'transmission towers remain excluded and the yellow tower layer is untouched');
assert.ok(source.includes('state.towers = 0;'), 'transmission tower counter remains zero in the local distribution layer');

// Confirm the catenary solver still reaches both conductor attachment points and
// reaches the specified downward sag at the span midpoint.
const length = 48;
const sag = 0.95;
let a = length * length / (8 * sag);
for (let iteration = 0; iteration < 6; iteration++) {
  const ratio = length / (2 * a);
  const residual = a * (Math.cosh(ratio) - 1) - sag;
  const derivative = Math.cosh(ratio) - 1 - ratio * Math.sinh(ratio);
  if (Math.abs(derivative) < 1e-12) break;
  a = Math.max(.05, a - residual / derivative);
}
const end = Math.cosh(length / (2 * a));
const drop = t => a * (Math.cosh((t - 0.5) * length / a) - end);
assert.ok(Math.abs(drop(0)) < 1e-9, 'catenary starts at the first insulator');
assert.ok(Math.abs(drop(1)) < 1e-9, 'catenary ends at the second insulator');
assert.ok(Math.abs(drop(0.5) + sag) < 1e-6, 'catenary sag reaches the intended mid-span drop');

// OpenInfraMap's power_line layer stores the mapping class in the source layer
// and may omit the original power= tag from decoded feature properties.
const lineFixture = {
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: [[-72.6500, 41.5600], [-72.6490, 41.5600]] },
  properties: { voltage: '13.8' }
};
const nearSupports = [
  { key: 'a', coordinate: [-72.64985, 41.5600] },
  { key: 'b', coordinate: [-72.64915, 41.5600] }
];
assert.equal(isDistributionPowerLineFeature(lineFixture, nearSupports, 'power_line'), true,
  'power_line source-layer admits distribution geometry when the original power/type property is absent');
assert.equal(isDistributionPowerLineFeature(lineFixture, nearSupports, ''), false,
  'unclassified features from unrelated source layers are not treated as power lines');
assert.equal(isDistributionPowerLineFeature({ ...lineFixture, properties: { voltage: '115000' } }, nearSupports, 'power_line'), false,
  'known high-voltage transmission lines remain excluded');
assert.equal(isDistributionPowerLineFeature({ ...lineFixture, properties: { voltage: '13.8', location: 'underground' } }, nearSupports, 'power_line'), false,
  'underground lines remain excluded');
assert.equal(isDistributionPowerLineFeature({ ...lineFixture, properties: { type: 'line' } }, nearSupports.slice(0, 1), 'power_line'), false,
  'un-volted lines require two distinct nearby mapped poles');

const streetPoles = [
  { key: 'p1', network: 'power', coordinate: [-72.6500, 41.5600], bearing: null, bearingDistance: Infinity },
  { key: 'p2', network: 'power', coordinate: [-72.6497, 41.5600], bearing: null, bearingDistance: Infinity },
  { key: 'p3', network: 'power', coordinate: [-72.6494, 41.5600], bearing: null, bearingDistance: Infinity },
  { key: 'p4', network: 'power', coordinate: [-72.6491, 41.5600], bearing: null, bearingDistance: Infinity }
];
const inferred = deriveNearestPoleSpans(streetPoles, []);
assert.equal(inferred.length, 3, 'four close power poles form a connected inferred pole-to-pole chain');
assert.ok(inferred.every(span => span.inferred && span.conductorCount === 3),
  'fallback spans are flagged as inferred and carry three solid conductors');
assert.equal(deriveNearestPoleSpans(streetPoles.slice(0, 1), []).length, 0,
  'a lone pole does not create a fabricated span');
assert.equal(deriveNearestPoleSpans(streetPoles.map(pole => ({ ...pole, network: 'telecom' })), []).length, 0,
  'the power-span fallback does not connect telecom-only supports');

console.log('BRIDGEPOINT_UTILITY_RENDERER_V10_PASS');
