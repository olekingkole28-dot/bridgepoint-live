import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const edgeSource = await readFile(
  new URL('../supabase/functions/bridgepoint-global-tree-viewport-v1101/index.ts', import.meta.url),
  'utf8'
);
const peakSource = await readFile(
  new URL('../supabase/functions/bridgepoint-global-tree-viewport-v1101/tree-canopy-peaks.mjs', import.meta.url),
  'utf8'
);
const migrationSource = await readFile(
  new URL('../supabase/migrations/20261102000000_tree_canopy_local_maxima_v1109.sql', import.meta.url),
  'utf8'
);
const mapSource = await readFile(
  new URL('../release-v2300/world-v2300-map.js', import.meta.url),
  'utf8'
);
const rendererSource = await readFile(
  new URL('../release-v2300/world-v2300-tree-instanced.js', import.meta.url),
  'utf8'
);

assert.match(edgeSource, /const VERSION=1109;/,
  'the tree viewport endpoint should identify the revised placement release');
assert.match(edgeSource, /Math\.min\(Math\.max\(Number\(b\.limit\|\|1200\),80\),3000\)/,
  'the viewport edge function should keep the database 3,000-row safety cap');
assert.match(edgeSource, /bridgepoint_global_tree_cache_viewport_v1102/,
  'the new edge function must query only the new placement-truth cache');
assert.match(edgeSource, /bridgepoint_global_tree_cache_upsert_v1104/,
  'generated trees must enter the building-filtered cache function');
assert.match(edgeSource, /const tile=activeMetaTile\(w,s,e,n\)/,
  'each viewport request must load only the canopy source tile containing its centre');
assert.match(edgeSource, /if\(e-w>\.75\|\|n-s>\.75\)/,
  'the zoom guard must accept the larger early detail viewport');
assert.match(edgeSource, /detectCanopyPeaks\(rr,outW,outH/,
  'the edge function must derive tree centres from local canopy-height peaks');
assert.match(edgeSource, /sampleStride=Math\.max\(1,Math\.ceil\(Math\.max\(W,H\)\/4096\)\)/,
  'the source raster sampling stride must remain fixed for every zoom into the same raster tile');
assert.match(edgeSource, /Math\.floor\(Math\.max\(0,x0-pad\)\/sampleStride\)\*sampleStride/,
  'raster windows must align to the same global pixel lattice so canopy peak IDs do not shift while zooming');
assert.match(edgeSource, /rid=\u0060\$\{t\.quadkey\}:\$\{px\}:\$\{py\}\u0060/,
  'source identity must be derived from stable native raster pixels');
assert.match(edgeSource, /META_WRI_CHMV2_LOCAL_MAXIMA_V1109/,
  'new generated features must use the new cache source identity');
assert.match(edgeSource, /CHMV2_LOCAL_CANOPY_PEAK_ESTIMATE_V1109/,
  'raster-derived placement must retain its estimated crown-centre truth');
assert.match(edgeSource, /individual_tree_truth:false/,
  'canopy-height-derived locations must never be called field-surveyed trunk locations');
assert.doesNotMatch(edgeSource, /heightSamples\(|nearestHeight\(/,
  'the new endpoint must not borrow a remote canopy height from another location');
assert.doesNotMatch(edgeSource, /ESA_WORLDCOVER_TREE_COVER_V1101|ESA_WORLDCOVER_10M_TREE_COVER_DERIVED_POINT/,
  'the old WorldCover pixel-to-tree fallback must be removed');
assert.doesNotMatch(edgeSource, /META_WRI_CHMV2_CANOPY_SAMPLE_DERIVED_TREE_DISPLAY/,
  'the new endpoint must not reuse the old one-sample-equals-one-tree logic');

assert.match(peakSource, /function detectCanopyPeaks/,
  'the canopy raster peak detector should be a separately testable helper');
assert.match(peakSource, /neighbor > value/,
  'a tree candidate must be a local height maximum');
assert.match(peakSource, /accepted\.sort/,
  'the spacing pass should produce deterministic, repeatable candidates');
assert.match(peakSource, /positionNote/,
  'the helper must publish a clear placement-truth explanation');
assert.doesNotMatch(peakSource, /Math\.random/,
  'tree candidate placement must be deterministic');

assert.match(migrationSource, /analytics\.universal_building_geometry_v918/,
  'tree insertion and retrieval must check authoritative building footprints');
assert.match(migrationSource, /ST_Covers\(b\.geometry, i\.geom\)/,
  'the insert path must reject positions covered by a building footprint');
assert.match(migrationSource, /ST_Covers\(b\.geometry, t\.geometry\)/,
  'the viewport read path must also exclude trees inside mapped building footprints');
assert.match(migrationSource, /META_WRI_CHMV2_LOCAL_MAXIMA_V1109/,
  'the new cache must contain only the reviewed placement source');
assert.match(migrationSource, /REVOKE ALL ON FUNCTION/,
  'service-only cache mutation RPCs must not be publicly executable');

assert.match(mapSource, /const treeStartZoom=activeWorldLodProfile\(\)\.treeMin/,
  'instanced rendering must attach at the active map profile tree zoom');
assert.match(mapSource, /tb=bbox\(map,\.10\)/,
  'tree requests must stay tightly scoped to the current map tile');
assert.match(mapSource, /META_WRI_CHMV2_LOCAL_MAXIMA_V1109/,
  'the client cache must ignore older synthetic tree positions');
assert.match(mapSource, /Math\.min\(MOBILE\?1800:3000,normalTreeLimit\)/,
  'tree requests must keep explicit mobile and desktop response caps');
assert.match(mapSource, /map\.getSource\('bpTreeLod'\)\?\.setData\(\{type:'FeatureCollection',features:\[\.\.\.retainedTrees\]\}\)/,
  'the active tree source must clear stale features when the current tile is empty');

const treeSourceUpdateIndex = mapSource.indexOf(
  "map.getSource('bpTreeLod')?.setData({type:'FeatureCollection',features:[...retainedTrees]})"
);
const treeRendererRefreshIndex = mapSource.indexOf(
  'const treeRendererApi=window.__BP_TREE_INSTANCE_RENDERER_API_V1__'
);
assert.ok(treeSourceUpdateIndex >= 0 && treeRendererRefreshIndex > treeSourceUpdateIndex,
  'the active renderer must be refreshed only after the completed viewport tile is committed');
assert.match(mapSource, /bpAttachTreeRendererFromViewport\(\);const treeRendererApi=window\.__BP_TREE_INSTANCE_RENDERER_API_V1__/,
  'the completed viewport fetch must attach the 3D renderer as soon as active tile data exists');
assert.match(mapSource, /world-v2300-tree-instanced\.js\?v=20261102-tree-viewport-refresh-v4/,
  'the updated renderer module must use a fresh URL so the browser cannot reuse its old module cache');
assert.match(mapSource, /if\(treeRendererApi\?\.map===map\)treeRendererApi\.refreshInstances\?\.\(\)/,
  'an already-attached 3D renderer must receive new tile data without requiring a camera event');
assert.match(mapSource, /properties\\?\.tile_key\\|\\|''\)===String\(trees\.active_tile/,
  'only points from the currently active source tile may stay in the tree retention cache');
assert.match(mapSource, /retainedTrees=mergeLodFeatureCache/,
  'tree records from the current tile should stay cached across zoom-only changes');
assert.match(mapSource, /else\{[\s\S]*?map\.getSource\('bpLivingWorld3D'\)\?\.setData\(EMPTY\);[\s\S]*?vis\(map,'gta-bp-tree3d-trunk',false\)/,
  'an empty active tile must clear stale extruded trees as well as cached tree points');

assert.match(rendererSource, /if \(z >= 16\.0/,
  'the full-resolution 3D tree LOD should begin earlier on close zoom');
assert.match(rendererSource, /if \(z >= 13\.3/,
  'medium 3D tree detail should appear at neighborhood zoom');
assert.match(rendererSource, /TREE_GROUND_ELEVATION_UNAVAILABLE/,
  'the instanced renderer must never place solid tree meshes at sea level when terrain elevation is missing');
assert.match(rendererSource, /partialInstanceBudget/,
  'tree caps should keep the renderable instances instead of dropping the whole scene');
assert.match(rendererSource, /window\.__BP_TREE_INSTANCE_RENDERER_API_V1__ = \{\s*map,\s*refreshInstances\s*\}/,
  'the installed 3D renderer must expose a map-scoped refresh hook for asynchronous tile results');
assert.match(rendererSource, /const cached = cache\?\.trees;[\s\S]*?if \(Array\.isArray\(cached\)\) return cached;/,
  'an initialized empty active-tile cache must not fall back to stale source features');

console.log('BRIDGEPOINT_TREE_VIEWPORT_PLACEMENT_CONTRACT_PASS single_tile=true building_filter=true');
