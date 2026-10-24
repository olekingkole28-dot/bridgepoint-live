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

const topDownStreet = resolvePitchDisplacementPolicy(16, 0);
assert.equal(topDownStreet.scale, 0, 'close top-down view disables dynamic vertex-height motion');
assert.equal(topDownStreet.maxOffsetM, 0, 'top-down close view cannot project animated vertex heights into vertical spikes');
assert.equal(topDownStreet.guarded, true, 'top-down close view must activate the close-zoom geometry guard');

const topDownAtStreetPitch = resolvePitchDisplacementPolicy(16, 18);
assert.equal(topDownAtStreetPitch.scale, 0, 'the entire close-zoom top-down camera range must be guarded');
assert.equal(topDownAtStreetPitch.maxOffsetM, 0, 'close zoom stays geometry-safe across low camera pitches');

const belowCloseZoom = resolvePitchDisplacementPolicy(11.5, 18);
assert.equal(belowCloseZoom.scale, 1, 'the hard zero-displacement rule is restricted to close zoom');

const moderatePitchStreet = resolvePitchDisplacementPolicy(11, 52);
assert.ok(moderatePitchStreet.guarded, 'close, pitched camera must activate the perspective safety guard');
assert.ok(moderatePitchStreet.scale > 0 && moderatePitchStreet.scale < 0.25,
  'mid-close pitched camera must reduce vertical displacement');
assert.ok(moderatePitchStreet.maxOffsetM > 0 && moderatePitchStreet.maxOffsetM < 0.12,
  'mid-close horizon pitch must cap dynamic height displacement below 12 cm');

const closeTilt = resolvePitchDisplacementPolicy(16, 52);
assert.equal(closeTilt.scale, 0, 'all close-zoom views must disable dynamic vertex displacement');
assert.equal(closeTilt.maxOffsetM, 0, 'no close-zoom wave/surge vertex offset may produce a line into the sky');

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
assert.ok(engineSource.includes('if (z >= 12) {\n    return { scale: 0, maxOffsetM: 0, guarded: true };'),
  'close zoom must disable dynamic water vertex displacement even in a top-down view');
assert.ok(engineSource.includes('v_wave = clamp(0.5 + wave * 0.34, 0.0, 1.0);'),
  'optical wave motion remains independent from geometric displacement');
console.log('BRIDGEPOINT_WATER_MESH_FREQUENCY_TEST_PASS');
console.log('BRIDGEPOINT_WATER_CLOSE_ZOOM_VERTEX_DISPLACEMENT_TEST_PASS');
