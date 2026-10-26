import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
if (typeof globalThis.location === 'undefined') globalThis.location = { href: 'https://bridgepointintelligence.online/', origin: 'https://bridgepointintelligence.online' };
const offline = require('../rebuild-v5000/offline-world-v1.js');

test('accepts same-origin resources and an exact allowlisted HTTPS origin', () => {
  const manifest = {schemaVersion:1,id:'global-max-v1',title:'Global Max',allowedOrigins:['https://cdn.jsdelivr.net'],resources:[{url:'/assets/offline/world.pmtiles',bytes:100},{url:'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-10m.json',bytes:100}]};
  assert.equal(offline.assertManifest(manifest).id, 'global-max-v1');
});

test('rejects unsupported schema, invalid IDs, empty resources, duplicates and unapproved origins', () => {
  const base = {schemaVersion:1,id:'world-base-v1',title:'World base',resources:[{url:'https://bridgepointintelligence.online/offline/world.pmtiles'}]};
  assert.throws(() => offline.assertManifest({...base,schemaVersion:2}), /schemaVersion/);
  assert.throws(() => offline.assertManifest({...base,id:'x'}), /id/);
  assert.throws(() => offline.assertManifest({...base,resources:[]}), /non-empty/);
  assert.throws(() => offline.assertManifest({...base,resources:[{url:'https://bridgepointintelligence.online/a'},{url:'https://bridgepointintelligence.online/a'}]}), /Duplicate/);
  assert.throws(() => offline.assertManifest({...base,resources:[{url:'https://example.com/world.pmtiles'}]}), /allowlisted/);
});

test('rejects malformed origin allowlists, non-http protocols and invalid sizes', () => {
  const base = {schemaVersion:1,id:'world-base-v1',title:'World base',resources:[{url:'https://bridgepointintelligence.online/offline/world.pmtiles'}]};
  assert.throws(() => offline.assertManifest({...base,allowedOrigins:['https://example.com/path']}), /exact HTTPS origins/);
  assert.throws(() => offline.assertManifest({...base,resources:[{url:'file:///tmp/world.pmtiles'}]}), /HTTP/);
  assert.throws(() => offline.assertManifest({...base,resources:[{url:'https://bridgepointintelligence.online/a',bytes:-1}]}), /byte estimate/);
});

test('decodes the country object from TopoJSON correctly', () => {
  const topology = {
    type:'Topology',
    arcs:[[[0,0],[10,0],[0,10],[-10,0],[0,-10]]],
    transform:{scale:[1,1],translate:[-5,-5]},
    objects:{countries:{type:'GeometryCollection',geometries:[{type:'Polygon',id:1,properties:{name:'Test'},arcs:[[0]]}]}}
  };
  const fc = offline.topologyToFeatureCollection(topology,'countries');
  assert.equal(fc.type,'FeatureCollection');
  assert.equal(fc.features.length,1);
  assert.equal(fc.features[0].properties.name,'Test');
  assert.deepEqual(fc.features[0].geometry.coordinates[0][0],[-5,-5]);
  assert.throws(() => offline.topologyToFeatureCollection({type:'Topology',arcs:[],objects:{}},'countries'), /object not found/);
});

test('catalog exposes three truthful packages and separates global vs regional-only layers', async () => {
  const catalog = JSON.parse(await readFile(new URL('../rebuild-v5000/offline-packs/catalog.json', import.meta.url), 'utf8'));
  assert.deepEqual(catalog.packages.map(p=>p.id), ['global-boundaries-v1','global-basemap-z6-v1','global-max-v1']);
  for (const pack of catalog.packages) {
    assert.ok(pack.estimatedBytes > 0);
    assert.match(pack.sizeLabel, /MB/);
    assert.ok(pack.includes.length > 0);
  }
  assert.ok(catalog.packages.find(p=>p.id==='global-max-v1').estimatedBytes < 250000000);
  assert.match(catalog.packages.find(p=>p.id==='global-max-v1').manifestUrl,/global-max-v1/);
  assert.ok(catalog.layerAvailability.some(p=>p.id==='parcels'&&p.status==='regional'));
  assert.ok(catalog.layerAvailability.some(p=>p.id==='mesh'&&p.status==='planned'));
});
