import assert from 'node:assert/strict';
import fs from 'node:fs';

const PC_API = 'https://louise-willing-cases-strategies.trycloudflare.com';
const RETIRED_API = 'https://xdfsjztwgsbmabshzsjw.supabase.co';

const runtimeFiles = [
  'acquisition_tracker.js',
  'language-selector-v5200.js',
  'release-v2300/world-v2300-config.js',
  'rebuild-v5000/global-property-v957.js',
  'rebuild-v5000/bridgepoint-map-key-v5920.js',
  'rebuild-v5000/bridgepoint-map-state-counts-v5923.js',
  'rebuild-v5000/bridgepoint-map-physical-assets-v5924.js',
  'rebuild-v5000/bridgepoint-global-motion-v5926.js',
  'rebuild-v5000/intelligence-global-v5507.js',
  'rebuild-v5000/intelligence-tools-v5507.js',
  'rebuild-v5000/bridgepoint-view-v5917.js',
  'rebuild-v5000/zoning-coverage-v1.js',
];

for (const path of runtimeFiles) {
  const source = fs.readFileSync(path, 'utf8');
  assert.ok(source.includes(PC_API), path + ' must use the PC-backed runtime');
  assert.ok(!source.includes(RETIRED_API), path + ' still references the retired Supabase project');
}

for (const path of ['rebuild-v5000/landing.js', 'rebuild-v5000/app.js']) {
  const source = fs.readFileSync(path, 'utf8');
  assert.ok(source.includes('world-v2300-map.js?v=6238-pc-runtime'), path + ' must import the refreshed globe map module');
  assert.ok(source.includes('world-v2300-weather.js?v=6318-storm-icons-clickable'), path + ' must import the refreshed weather module');
  assert.ok(!source.includes(RETIRED_API), path + ' must not reference the retired Supabase project');
}

const config = fs.readFileSync('release-v2300/world-v2300-config.js', 'utf8');
assert.ok(config.includes("AUTH_KEYS=['bp_auth_v5045'"), 'the globe config must read the shared PC-runtime session');

for (const path of [
  'release-v2300/world-v2300-bootstrap.js',
  'release-v2300/world-v2300-flythrough.js',
  'release-v2300/world-v2300-details.js',
  'release-v2300/world-v2300-locked-countries.js',
]) {
  const source = fs.readFileSync(path, 'utf8');
  assert.ok(source.includes('./world-v2300-config.js?v=6238-pc-runtime'), path + ' must load the cache-busted PC-runtime config');
}

const htmlFiles = ['rebuild-v5000/index.html', 'rebuild-v5000/app-index.html'];
const requiredAssets = [
  'acquisition_tracker.js?v=6238-pc-runtime',
  'language-selector-v5200.js?v=6238-pc-runtime',
  'global-property-v957.js?v=6238-pc-runtime',
  'bridgepoint-view-v5917.js?v=6238-pc-runtime',
  'zoning-coverage-v1.js?v=6238-pc-runtime',
  'bridgepoint-map-key-v5920.js?v=6238-pc-runtime',
  'bridgepoint-map-state-counts-v5923.js?v=6238-pc-runtime',
  'bridgepoint-map-physical-assets-v5924.js?v=6238-pc-runtime',
  'bridgepoint-global-motion-v5926.js?v=6238-pc-runtime',
  'intelligence-tools-v5507.js?v=6238-pc-runtime',
  'intelligence-global-v5507.js?v=6238-pc-runtime',
  'world-v2300-map.js?v=6238-pc-runtime',
  'world-v2300-weather.js?v=6318-storm-icons-clickable',
];
for (const path of htmlFiles) {
  const html = fs.readFileSync(path, 'utf8');
  for (const asset of requiredAssets) {
    assert.ok(html.includes(asset), path + ' is missing cache-busted asset ' + asset);
  }
}

const tools = fs.readFileSync('rebuild-v5000/intelligence-tools-v5507.js', 'utf8');
assert.ok(tools.includes('/intelligence-global-v5507.js?v=6238-pc-runtime'), 'intelligence tools must import the cache-busted global feed');

console.log('BRIDGEPOINT_PC_RUNTIME_CUTOVER_V6238_PASS');
console.log('Homepage and app RPCs use the PC-backed runtime; no active bootstrap module targets the retired Supabase origin.');
