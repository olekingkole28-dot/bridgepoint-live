import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const edgeSource = await readFile(
  new URL('../supabase/functions/bridgepoint-global-tree-viewport-v1101/index.ts', import.meta.url),
  'utf8'
);
const mapSource = await readFile(
  new URL('../release-v2300/world-v2300-map.js', import.meta.url),
  'utf8'
);

assert.match(edgeSource, /const VERSION=1108;/,
  'tree viewport edge source should identify the new reviewed version');
assert.match(edgeSource, /Math\.min\(Math\.max\(Number\(b\.limit\|\|1200\),80\),3000\)/,
  'the viewport edge function should match the database 3,000-row cache function cap');
assert.match(edgeSource, /p_limit:limit/,
  'cache queries must use the request limit');
assert.match(edgeSource, /p_limit:5000/,
  'the source canopy-height sample lookup should keep its separately bounded 5,000-row cap');
assert.match(edgeSource, /META_WRI_CHMV2_CANOPY_SAMPLE_DERIVED_TREE_DISPLAY/,
  'raster-derived canopy sample positions must keep their derived truth label');
assert.match(edgeSource, /individual_tree_truth:false/,
  'canopy raster samples must never be represented as verified individual trunk locations');
assert.match(edgeSource, /ESA_WORLDCOVER_10M_TREE_COVER_DERIVED_POINT/,
  'WorldCover-derived sample positions must retain their derived placement label');

assert.match(mapSource, /Math\.min\(MOBILE\?1800:3000,normalTreeLimit\)/,
  'desktop and mobile requests should use the new bounded response caps');
assert.match(mapSource, /treeCap=MOBILE\?\(lod\.tier==='GOLD'\?4000/,
  'the mobile retained cache must fit inside the 4,200-instance renderer budget');
assert.match(mapSource, /lod\.tier==='GOLD'\?14000/,
  'the desktop retained tree cache should remain higher than the viewport response batch');

console.log('BRIDGEPOINT_TREE_VIEWPORT_CAPACITY_CONTRACT_PASS desktop=3000 mobile=1800');
