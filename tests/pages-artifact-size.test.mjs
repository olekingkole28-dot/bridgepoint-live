import assert from 'node:assert/strict';
import {
  MAX_PAGES_ARTIFACT_BYTES,
  validatePagesArtifactSize
} from '../scripts/pages-artifact-size.mjs';

// This was the size of the last successfully deployed spacecraft Pages artifact.
assert.equal(validatePagesArtifactSize(1_205_917_950), 1_205_917_950);
assert.equal(validatePagesArtifactSize(1_165_044_886), 1_165_044_886);
assert.equal(validatePagesArtifactSize(MAX_PAGES_ARTIFACT_BYTES), MAX_PAGES_ARTIFACT_BYTES);
assert.throws(() => validatePagesArtifactSize(MAX_PAGES_ARTIFACT_BYTES + 1), /2 GiB/);
assert.throws(() => validatePagesArtifactSize(0), /positive safe integer/);
assert.throws(() => validatePagesArtifactSize('not-a-size'), /positive safe integer/);

console.log('BRIDGEPOINT_PAGES_ARTIFACT_SIZE_LIMIT_PASS', MAX_PAGES_ARTIFACT_BYTES);
