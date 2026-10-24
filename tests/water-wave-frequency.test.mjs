import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const engineSource = await readFile(new URL('../release-v2300/world-v2300-water.js', import.meta.url), 'utf8');
const engineModuleUrl = 'data:text/javascript;base64,' + Buffer.from(engineSource).toString('base64');
const { resolveWaveFrequencyCyclesPerWorld } = await import(engineModuleUrl);

const requestedStreetWave = 8.53 * (2 ** 15);
const closeStreet = resolveWaveFrequencyCyclesPerWorld(requestedStreetWave, 0.76, 0.000004);
assert.ok(closeStreet.cyclesPerWorld < requestedStreetWave, 'coarse street-level grid must cap the requested displacement frequency');
assert.ok(closeStreet.samplesPerPeriod >= 8 - 1e-8, 'highest geometric harmonic must have at least eight mesh samples per period');
assert.ok(closeStreet.cyclesPerWorld <= closeStreet.safetyCapCyclesPerWorld, 'resolved frequency must not exceed the mesh-safe cap');

const denseGrid = resolveWaveFrequencyCyclesPerWorld(1200, 0.8, 0.00000001);
assert.equal(denseGrid.cyclesPerWorld, 1200, 'a sufficiently fine grid should preserve the requested frequency');
assert.ok(denseGrid.samplesPerPeriod >= 8, 'fine-grid frequency must remain sample-safe');

const noGrid = resolveWaveFrequencyCyclesPerWorld(requestedStreetWave, 0.76, null);
assert.ok(noGrid.cyclesPerWorld < requestedStreetWave, 'uninitialized mesh must use conservative fallback cap');
assert.equal(noGrid.samplesPerPeriod, null, 'unknown spacing must not report a made-up sample ratio');

const invalid = resolveWaveFrequencyCyclesPerWorld(Number.NaN, 0.76, 0.000004);
assert.equal(invalid.cyclesPerWorld, 0, 'invalid requested frequency must fail closed');
console.log('BRIDGEPOINT_WATER_MESH_FREQUENCY_TEST_PASS');
