/**
 * Detect estimated single-crown centres from a canopy-height raster.
 * The returned points are crown-apex estimates, not surveyed trunk locations.
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function hash32(value) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function detectCanopyPeaks(
  values,
  width,
  height,
  {
    spacingMetersX = 1,
    spacingMetersY = 1,
    minHeightMeters = 2.5,
    maxInstances = 3000,
    seed = "bridgepoint-canopy"
  } = {}
) {
  const w = Math.trunc(Number(width));
  const h = Math.trunc(Number(height));
  if (!values || !Number.isInteger(w) || !Number.isInteger(h) ||
      w < 3 || h < 3 || values.length < w * h) {
    throw new TypeError("CANOPY_RASTER_DIMENSIONS_INVALID");
  }

  const sx = clamp(Number(spacingMetersX) || 1, 0.25, 1000);
  const sy = clamp(Number(spacingMetersY) || 1, 0.25, 1000);
  const minimum = clamp(Number(minHeightMeters) || 2.5, 1, 80);
  const cap = Math.trunc(clamp(Number(maxInstances) || 3000, 1, 6000));
  const tileSeed = String(seed || "bridgepoint-canopy");
  const candidates = [];
  const candidateCap = Math.min(w * h, Math.max(cap * 48, 24000));
  let candidateSeen = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const index = y * w + x;
      const value = Number(values[index]);
      if (!Number.isFinite(value) || value < minimum || value > 100) continue;

      // Use a compact 8-neighbour peak pass here; the metre-based NMS below
      // handles the wider crown spacing without a quadratic wide-window scan.
      const rx = 1;
      const ry = 1;
      let isPeak = true;

      for (let dy = -ry; dy <= ry && isPeak; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -rx; dx <= rx; dx++) {
          if (dx === 0 && dy === 0) continue;
          if ((dx * sx) ** 2 + (dy * sy) ** 2 > radiusMeters ** 2) continue;
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const neighborIndex = yy * w + xx;
          const neighbor = Number(values[neighborIndex]);
          if (!Number.isFinite(neighbor)) continue;
          // Stable tie-breaking turns a flat raster plateau into one peak.
          if (neighbor > value + 1e-4 ||
              (Math.abs(neighbor - value) <= 1e-4 && neighborIndex < index)) {
            isPeak = false;
            break;
          }
        }
      }

      if (!isPeak) continue;
      const candidate = {
        x,
        y,
        index,
        height: value,
        rank: hash32(tileSeed + "|" + index)
      };
      candidateSeen++;
      if (candidates.length < candidateCap) {
        candidates.push(candidate);
      } else {
        // Deterministic reservoir sampling avoids bias toward the upper-left
        // of a dense raster when the candidate safety cap is reached.
        const slot = hash32(tileSeed + "|reservoir|" + candidateSeen) % candidateSeen;
        if (slot < candidateCap) candidates[slot] = candidate;
      }
    }
  }

  // A second, height-prioritised spacing pass prevents neighboring raster bumps
  // from turning one broad canopy into several overlapping tree models.
  candidates.sort((a, b) => b.height - a.height || a.index - b.index);
  const bucketSize = 6;
  const buckets = new Map();
  const accepted = [];

  for (const candidate of candidates) {
    const px = candidate.x * sx;
    const py = candidate.y * sy;
    const bx = Math.floor(px / bucketSize);
    const by = Math.floor(py / bucketSize);
    const radius = clamp(1.8 + candidate.height * 0.12, 2.5, 4.6);
    let blocked = false;

    for (let oy = -1; oy <= 1 && !blocked; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        for (const other of buckets.get((bx + ox) + ":" + (by + oy)) || []) {
          const dx = px - other.px;
          const dy = py - other.py;
          const separation = Math.max(radius, other.radius);
          if (dx * dx + dy * dy < separation * separation) {
            blocked = true;
            break;
          }
        }
        if (blocked) break;
      }
    }
    if (blocked) continue;

    const item = { ...candidate, px, py, radius };
    const key = bx + ":" + by;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
    accepted.push(item);
  }

  accepted.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return accepted.slice(0, cap).map(({ x, y, index, height }) => ({
    x,
    y,
    index,
    height
  }));
}

export function treeCandidateSourceTruth() {
  return {
    positionTruth: "CHMV2_LOCAL_CANOPY_PEAK_ESTIMATE_V1109",
    heightTruth: "MODELED_CANOPY_HEIGHT_META_WRI_DINOV3_V2",
    individualTreeTruth: false,
    positionNote: "Estimated crown centre from a canopy-height raster local maximum; not a field-surveyed trunk coordinate."
  };
}
