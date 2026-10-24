import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const engineSource = await readFile(new URL('../release-v2300/world-v2300-water.js', import.meta.url), 'utf8');
const engineModuleUrl = 'data:text/javascript;base64,' + Buffer.from(engineSource).toString('base64');
const { resolveWaveFrequencyCyclesPerWorld, resolvePitchDisplacementPolicy } = await import(engineModuleUrl);

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

const topDownStreet = resolvePitchDisplacementPolicy(16, 18);
assert.equal(topDownStreet.scale, 1, 'top-down close view preserves geometric waves');
assert.equal(topDownStreet.maxOffsetM, 1000, 'top-down close view keeps the existing wave-height envelope');

const moderatePitchStreet = resolvePitchDisplacementPolicy(16, 52);
assert.ok(moderatePitchStreet.guarded, 'close, pitched camera must activate the perspective safety guard');
assert.ok(moderatePitchStreet.scale > 0 && moderatePitchStreet.scale < 0.25,
  'street-level pitch must greatly reduce only vertical displacement');
assert.ok(moderatePitchStreet.maxOffsetM > 0 && moderatePitchStreet.maxOffsetM < 0.12,
  'moderate horizon pitch must cap total dynamic height displacement below 12 cm');

const horizonStreet = resolvePitchDisplacementPolicy(16, 72);
assert.equal(horizonStreet.scale, 0, 'near-horizontal street view must remove geometric wave-height motion');
assert.equal(horizonStreet.maxOffsetM, 0, 'near-horizontal street view must not project dynamic water height into sky spikes');

const globalHorizon = resolvePitchDisplacementPolicy(5, 72);
assert.equal(globalHorizon.scale, 1, 'global water keeps its existing displacement policy');
assert.equal(globalHorizon.guarded, false, 'global zoom does not trigger the close-view guard');

const invalidPitch = resolvePitchDisplacementPolicy(16, Number.NaN);
assert.equal(invalidPitch.scale, 0, 'unknown camera pitch fails safe');
assert.ok(engineSource.includes('uniform float u_pitchWaveScale;'), 'shader must receive the pitch-aware scale');
assert.ok(engineSource.includes('uniform float u_waveOffsetLimit;'), 'shader must receive a maximum dynamic height offset');
assert.ok(engineSource.includes('api.animationTimeSeconds = waterAnimationTimeSeconds;'), 'animation clock must advance in the render loop');
assert.ok(engineSource.includes('v_wave = clamp(0.5 + wave * 0.34, 0.0, 1.0);'),
  'animated optical wave field must remain active when geometric displacement is pitch-limited');
assert.ok(engineSource.includes('float dynamicOffsetM = (wave * amplitude + stormSurge * marineSurgeMask) * u_pitchWaveScale;'),
  'vertex displacement must be scaled by the pitch-aware policy');
assert.ok(engineSource.includes('float offsetM = clamp(dynamicOffsetM, -u_waveOffsetLimit, u_waveOffsetLimit) + a_flood;'),
  'source-backed flood depth must remain separate from the capped animated offset');
console.log('BRIDGEPOINT_WATER_MESH_FREQUENCY_TEST_PASS');
console.log('BRIDGEPOINT_WATER_HORIZON_DISPLACEMENT_TEST_PASS');
