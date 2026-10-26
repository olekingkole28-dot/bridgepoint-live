import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
if (typeof globalThis.location === 'undefined') globalThis.location = { href: 'https://bridgepointintelligence.online/', origin: 'https://bridgepointintelligence.online' };
const offline = require('../rebuild-v5000/offline-world-v1.js');

test('accepts a valid same-origin style manifest in a browser-like environment', () => {
  const originalLocation = globalThis.location;
  globalThis.location = { href: 'https://bridgepointintelligence.online/' , origin: 'https://bridgepointintelligence.online' };
  try {
    assert.equal(offline.assertManifest({schemaVersion:1,id:'world-base-v1',title:'World base',resources:[{url:'https://bridgepointintelligence.online/offline/world.pmtiles',bytes:100}]}).id, 'world-base-v1');
  } finally { if (originalLocation === undefined) delete globalThis.location; else globalThis.location = originalLocation; }
});

test('rejects unsupported schema, invalid IDs, empty resources, duplicate URLs, and cross-origin resources', () => {
  const base = {schemaVersion:1,id:'world-base-v1',title:'World base',resources:[{url:'https://bridgepointintelligence.online/offline/world.pmtiles'}]};
  assert.throws(() => offline.assertManifest({...base,schemaVersion:2}), /schemaVersion/);
  assert.throws(() => offline.assertManifest({...base,id:'x'}), /id/);
  assert.throws(() => offline.assertManifest({...base,resources:[]}), /non-empty/);
  assert.throws(() => offline.assertManifest({...base,resources:[{url:'https://bridgepointintelligence.online/a'},{url:'https://bridgepointintelligence.online/a'}]}), /Duplicate/);
  assert.throws(() => offline.assertManifest({...base,resources:[{url:'https://example.com/world.pmtiles'}]}), /same-origin/);
});

test('rejects non-http protocols and invalid byte estimates', () => {
  const base = {schemaVersion:1,id:'world-base-v1',title:'World base',resources:[{url:'https://bridgepointintelligence.online/offline/world.pmtiles'}]};
  assert.throws(() => offline.assertManifest({...base,resources:[{url:'file:///tmp/world.pmtiles'}]}), /HTTP/);
  assert.throws(() => offline.assertManifest({...base,resources:[{url:'https://bridgepointintelligence.online/a',bytes:-1}]}), /byte estimate/);
});
