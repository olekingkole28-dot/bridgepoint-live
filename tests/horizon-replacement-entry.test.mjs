import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const dock = read('rebuild-v5000/bridgepoint-view-v5917.js');
const dockCss = read('rebuild-v5000/bridgepoint-view-v5917.css');
const appEntry = read('app/horizon/index.html');
const nativePage = read('app/horizon/native/index.html');
const worker = read('app/horizon/sw.js');
const manifest = JSON.parse(read('app/horizon/manifest.webmanifest'));

const gateMatch = dock.match(/<button[^>]*data-bp-horizon-gate="1"[^>]*>[\s\S]*?<\/button>/);
assert.ok(gateMatch, 'BridgePoint card must contain the Horizon gate button');
assert.match(gateMatch[0], /\bdisabled\b/, 'Horizon gate must remain physically disabled');
assert.match(gateMatch[0], /aria-disabled="true"/, 'Horizon gate must expose disabled state');
assert.doesNotMatch(gateMatch[0], /data-bpv-action=/, 'Horizon gate must not be wired to a click action');
assert.match(dock, /data-bpv-command-section="horizon"/, 'Horizon gate must be its own final card section');
assert.match(dockCss, /\.bpv-horizon-launch-btn:disabled/, 'disabled styling must exist');

assert.match(appEntry, /location\.replace\('\/app\/horizon\/native\//, 'existing PWA entry must route to the replacement');
assert.match(worker, /bridgepoint-horizon-ue5-v6250/, 'PWA cache must be versioned for the replacement');
assert.match(worker, /\/app\/horizon-playable\//, 'old direct playable route must be retired in the service worker');
assert.match(nativePage, /Native build not online yet/i, 'public page must accurately disclose that play is not live yet');
assert.doesNotMatch(nativePage, /app\/horizon-playable|app\/horizon-world|app\/horizon-next/, 'new page must not send users to legacy browser worlds');

assert.equal(manifest.id, '/app/horizon/', 'installed PWA identity must be preserved');
assert.equal(manifest.scope, '/app/horizon/', 'installed PWA scope must be preserved');
assert.equal(manifest.start_url, '/app/horizon/?source=pwa', 'installed PWA launch must continue through the new root redirect');
assert.equal(manifest.shortcuts, undefined, 'retired game-mode shortcuts must be removed');

for (const path of [
  'app/horizon-playable/index.html',
  'app/horizon-playable/v2-entry.html',
  'app/horizon-world/index.html',
  'app/horizon-next/index.html'
]) {
  assert.match(read(path), /\/app\/horizon\/native\//, path + ' must redirect to the replacement');
}

console.log('HORIZON_REPLACEMENT_ENTRY_PASS', JSON.stringify({
  cardGateDisabled: true,
  pwaIdentityPreserved: true,
  pwaRoutesToReplacement: true,
  legacyWebGameEntrypointsRetired: 4,
  nativeBuildOnline: false
}));
