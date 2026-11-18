export const MAX_PAGES_ARTIFACT_BYTES = 2 * 1024 * 1024 * 1024;

export function validatePagesArtifactSize(value) {
  const bytes = Number(value);
  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    throw new RangeError('Pages artifact size must be a positive safe integer');
  }
  if (bytes > MAX_PAGES_ARTIFACT_BYTES) {
    throw new RangeError(
      'Pages artifact exceeds the 2 GiB supported size limit (' +
      MAX_PAGES_ARTIFACT_BYTES + ' bytes)'
    );
  }
  return bytes;
}
