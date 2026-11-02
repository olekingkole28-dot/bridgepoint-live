import assert from 'node:assert/strict';
import { detectCanopyPeaks, treeCandidateSourceTruth } from '../supabase/functions/bridgepoint-global-tree-viewport-v1101/tree-canopy-peaks.mjs';

const values = new Float32Array(17 * 17);
values[2 * 17 + 2] = 10;
values[3 * 17 + 3] = 8;
values[12 * 17 + 12] = 16;
values[12 * 17 + 13] = 12;
values[4 * 17 + 12] = 1.4;

const peaks = detectCanopyPeaks(values, 17, 17, {
  spacingMetersX: 1,
  spacingMetersY: 1,
  minHeightMeters: 2.5,
  maxInstances: 20,
  seed: 'tile-1023'
});
assert.equal(peaks.length, 2, 'one crown should produce one local-maximum centre');
assert.deepEqual(peaks.map(p => p.height).sort((a, b) => a - b), [10, 16]);
assert.deepEqual(
  detectCanopyPeaks(values, 17, 17, { seed: 'tile-1023' }),
  peaks,
  'crown-peak selection must be deterministic for the same source tile'
);

const plateau = new Float32Array(9 * 9);
plateau[4 * 9 + 4] = 12;
plateau[4 * 9 + 5] = 12;
plateau[5 * 9 + 4] = 12;
const plateauPeaks = detectCanopyPeaks(plateau, 9, 9, { maxInstances: 10 });
assert.equal(plateauPeaks.length, 1,
  'a flat CHM plateau should not produce several adjacent tree models');

const sparse = detectCanopyPeaks(new Float32Array(11 * 11).fill(0), 11, 11);
assert.equal(sparse.length, 0, 'bare ground must not generate synthetic trees');

const truth = treeCandidateSourceTruth();
assert.equal(truth.positionTruth, 'CHMV2_LOCAL_CANOPY_PEAK_ESTIMATE_V1109');
assert.equal(truth.individualTreeTruth, false,
  'raster-derived peak positions must never be labelled surveyed trunk coordinates');
assert.match(truth.positionNote, /not a field-surveyed trunk coordinate/);

console.log('BRIDGEPOINT_TREE_CANOPY_PEAKS_PASS');
